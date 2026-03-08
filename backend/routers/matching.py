from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from database import get_db
from utils.auth_utils import get_current_user
from services.matching_service import run_matching_for_lost_item

router = APIRouter()

@router.get("/my-matches")
async def get_my_matches(current_user = Depends(get_current_user)):
    db = await get_db()
    user_id = str(current_user["_id"])
    
    # Get user's lost items
    lost_items = await db.lost_items.find({"reported_by": user_id}).to_list(length=100)
    lost_item_ids = [str(item["_id"]) for item in lost_items]
    
    # Get user's found items
    found_items = await db.found_items.find({"reported_by": user_id}).to_list(length=100)
    found_item_ids = [str(item["_id"]) for item in found_items]
    
    matches = await db.match_results.find({
        "$or": [
            {"lost_item_id": {"$in": lost_item_ids}},
            {"found_item_id": {"$in": found_item_ids}}
        ]
    }).sort("total_score", -1).to_list(length=50)
    
    result = []
    for m in matches:
        lost_item = await db.lost_items.find_one({"_id": ObjectId(m["lost_item_id"])})
        found_item = await db.found_items.find_one({"_id": ObjectId(m["found_item_id"])})
        result.append({
            "match_id": str(m["_id"]),
            "lost_item": {
                "id": m["lost_item_id"],
                "name": lost_item["item_name"] if lost_item else m.get("lost_item_name"),
                "images": lost_item.get("images", []) if lost_item else []
            },
            "found_item": {
                "id": m["found_item_id"],
                "name": found_item["item_name"] if found_item else m.get("found_item_name"),
                "images": found_item.get("images", []) if found_item else []
            },
            "scores": {
                "total": m["total_score"],
                "text": m["text_score"],
                "image": m["image_score"],
                "location": m["location_score"],
                "time": m["time_score"]
            },
            "status": m["status"],
            "created_at": m["created_at"]
        })
    
    return result

@router.post("/trigger/{lost_item_id}")
async def trigger_matching(lost_item_id: str, current_user = Depends(get_current_user)):
    matches = await run_matching_for_lost_item(lost_item_id)
    return {"message": "Matching completed", "matches_found": len(matches) if matches else 0}

@router.patch("/{match_id}/confirm")
async def confirm_match(match_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    await db.match_results.update_one(
        {"_id": ObjectId(match_id)},
        {"$set": {"status": "confirmed"}}
    )
    return {"message": "Match confirmed"}

@router.patch("/{match_id}/reject")
async def reject_match(match_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    await db.match_results.update_one(
        {"_id": ObjectId(match_id)},
        {"$set": {"status": "rejected"}}
    )
    return {"message": "Match rejected"}
