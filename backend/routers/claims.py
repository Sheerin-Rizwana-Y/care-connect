from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime
from bson import ObjectId
import qrcode
import io
import base64
from PIL import Image

from database import get_db
from utils.auth_utils import get_current_user
from utils.file_utils import save_upload_file
from services.notification_service import notify_item_claimed

router = APIRouter()

@router.post("/submit")
async def submit_claim(
    found_item_id: str,
    proof_description: str,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    
    found_item = await db.found_items.find_one({"_id": ObjectId(found_item_id)})
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")
    
    if found_item["status"] in ["claimed"]:
        raise HTTPException(status_code=400, detail="Item already claimed")
    
    if found_item["reported_by"] == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot claim your own reported item")
    
    existing_claim = await db.claims.find_one({
        "found_item_id": found_item_id,
        "claimant_id": str(current_user["_id"]),
        "status": "pending"
    })
    if existing_claim:
        raise HTTPException(status_code=400, detail="You already have a pending claim for this item")
    
    claim_doc = {
        "found_item_id": found_item_id,
        "claimant_id": str(current_user["_id"]),
        "claimant_name": current_user["name"],
        "proof_description": proof_description,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.claims.insert_one(claim_doc)
    
    # Notify finder
    await notify_item_claimed(
        finder_id=found_item["reported_by"],
        claimant_name=current_user["name"],
        item_name=found_item["item_name"]
    )
    
    return {"message": "Claim submitted successfully", "id": str(result.inserted_id)}

@router.get("/my-claims")
async def get_my_claims(current_user = Depends(get_current_user)):
    db = await get_db()
    claims = await db.claims.find(
        {"claimant_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(length=50)
    
    result = []
    for claim in claims:
        found_item = await db.found_items.find_one({"_id": ObjectId(claim["found_item_id"])})
        result.append({
            "id": str(claim["_id"]),
            "found_item_id": claim["found_item_id"],
            "found_item_name": found_item["item_name"] if found_item else "Unknown",
            "proof_description": claim["proof_description"],
            "status": claim["status"],
            "created_at": claim["created_at"]
        })
    
    return result

@router.get("/received-claims")
async def get_received_claims(current_user = Depends(get_current_user)):
    db = await get_db()
    
    my_found_items = await db.found_items.find(
        {"reported_by": str(current_user["_id"])}
    ).to_list(length=100)
    
    found_ids = [str(item["_id"]) for item in my_found_items]
    
    claims = await db.claims.find(
        {"found_item_id": {"$in": found_ids}}
    ).sort("created_at", -1).to_list(length=50)
    
    result = []
    for claim in claims:
        found_item = await db.found_items.find_one({"_id": ObjectId(claim["found_item_id"])})
        result.append({
            "id": str(claim["_id"]),
            "found_item_id": claim["found_item_id"],
            "found_item_name": found_item["item_name"] if found_item else "Unknown",
            "claimant_id": claim["claimant_id"],
            "claimant_name": claim["claimant_name"],
            "proof_description": claim["proof_description"],
            "status": claim["status"],
            "created_at": claim["created_at"]
        })
    
    return result

@router.patch("/{claim_id}/approve")
async def approve_claim(claim_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    claim = await db.claims.find_one({"_id": ObjectId(claim_id)})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    found_item = await db.found_items.find_one({"_id": ObjectId(claim["found_item_id"])})
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found")
    
    if found_item["reported_by"] != str(current_user["_id"]) and current_user.get("role") not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve this claim")
    
    # Approve claim
    await db.claims.update_one(
        {"_id": ObjectId(claim_id)},
        {"$set": {"status": "approved", "approved_at": datetime.utcnow()}}
    )
    
    # Update found item status
    await db.found_items.update_one(
        {"_id": ObjectId(claim["found_item_id"])},
        {"$set": {"status": "claimed", "claimed_at": datetime.utcnow()}}
    )
    
    # Find and close corresponding lost items
    lost_items = await db.lost_items.find({
        "reported_by": claim["claimant_id"],
        "status": {"$in": ["open", "potential_match"]}
    }).to_list(length=10)
    
    for lost_item in lost_items:
        await db.lost_items.update_one(
            {"_id": lost_item["_id"]},
            {"$set": {"status": "claimed", "claimed_at": datetime.utcnow()}}
        )
    
    # Award points to finder
    await db.users.update_one(
        {"_id": ObjectId(found_item["reported_by"])},
        {"$inc": {"points": 20}}
    )
    
    return {"message": "Claim approved. Item marked as returned!"}

@router.patch("/{claim_id}/reject")
async def reject_claim(claim_id: str, reason: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    claim = await db.claims.find_one({"_id": ObjectId(claim_id)})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    found_item = await db.found_items.find_one({"_id": ObjectId(claim["found_item_id"])})
    if found_item["reported_by"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.claims.update_one(
        {"_id": ObjectId(claim_id)},
        {"$set": {"status": "rejected", "rejection_reason": reason, "rejected_at": datetime.utcnow()}}
    )
    
    return {"message": "Claim rejected"}
