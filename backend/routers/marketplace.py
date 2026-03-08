from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import json

from database import get_db
from models.schemas import ListingCreate, ItemCategory, ItemCondition
from utils.auth_utils import get_current_user, get_current_admin
from utils.file_utils import save_multiple_files
from services.notification_service import notify_listing_status
from config import settings

router = APIRouter()

def format_listing(listing: dict, seller: dict = None) -> dict:
    return {
        "id": str(listing["_id"]),
        "title": listing["title"],
        "category": listing["category"],
        "description": listing["description"],
        "price": listing.get("price"),
        "is_free": listing.get("is_free", False),
        "condition": listing["condition"],
        "images": listing.get("images", []),
        "pickup_location": listing.get("pickup_location"),
        "status": listing["status"],
        "seller_id": listing["seller_id"],
        "seller_name": seller["name"] if seller else listing.get("seller_name", "Unknown"),
        "seller_department": seller["department"] if seller else None,
        "created_at": listing["created_at"],
        "expires_at": listing.get("expires_at"),
        "views": listing.get("views", 0),
        "interested_count": len(listing.get("interested_users", [])),
    }

@router.post("/listings")
async def create_listing(
    title: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    price: Optional[float] = Form(None),
    is_free: bool = Form(False),
    condition: str = Form(...),
    pickup_location: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    current_user = Depends(get_current_user)
):
    if not is_free and price is None:
        raise HTTPException(status_code=400, detail="Price is required unless item is free")
    
    if len(images) == 0:
        raise HTTPException(status_code=400, detail="At least one image is required")
    
    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed")
    
    db = await get_db()
    
    # Save images
    image_urls = await save_multiple_files(images, "marketplace")
    
    listing_doc = {
        "title": title,
        "category": category,
        "description": description,
        "price": price,
        "is_free": is_free,
        "condition": condition,
        "pickup_location": pickup_location,
        "images": image_urls,
        "status": "active",
        "seller_id": str(current_user["_id"]),
        "seller_name": current_user["name"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=settings.LISTING_EXPIRY_DAYS),
        "views": 0
    }
    
    result = await db.marketplace_listings.insert_one(listing_doc)
    
    # Log admin action
    await db.admin_logs.insert_one({
        "action": "listing_created",
        "item_id": str(result.inserted_id),
        "user_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Listing submitted for review", "id": str(result.inserted_id)}

@router.get("/listings")
async def get_listings(
    category: Optional[str] = None,
    condition: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_free: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    
    query = {"status": "active"}
    
    if category:
        query["category"] = category
    if condition:
        query["condition"] = condition
    if is_free is not None:
        query["is_free"] = is_free
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    
    total = await db.marketplace_listings.count_documents(query)
    listings = await db.marketplace_listings.find(query).sort(sort_by, -1).skip(skip).limit(limit).to_list(length=limit)
    
    formatted = []
    for listing in listings:
        seller = await db.users.find_one({"_id": ObjectId(listing["seller_id"])})
        formatted.append(format_listing(listing, seller))
    
    return {"listings": formatted, "total": total, "skip": skip, "limit": limit}

@router.get("/listings/my")
async def get_my_listings(current_user = Depends(get_current_user)):
    db = await get_db()
    listings = await db.marketplace_listings.find(
        {"seller_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(length=100)
    
    return [format_listing(l) for l in listings]

@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    try:
        listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    except:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Increment views
    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$inc": {"views": 1}}
    )
    
    seller = await db.users.find_one({"_id": ObjectId(listing["seller_id"])})
    return format_listing(listing, seller)

@router.put("/listings/{listing_id}")
async def update_listing(
    listing_id: str,
    update_data: dict,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["seller_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    allowed = ["title", "description", "price", "condition", "pickup_location"]
    filtered = {k: v for k, v in update_data.items() if k in allowed}
    filtered["updated_at"] = datetime.utcnow()
    filtered["status"] = "active"  # Keep listing active after update
    
    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": filtered}
    )
    
    return {"message": "Listing updated successfully"}

@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["seller_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.marketplace_listings.delete_one({"_id": ObjectId(listing_id)})
    return {"message": "Listing deleted"}

@router.patch("/listings/{listing_id}/reserve")
async def reserve_listing(listing_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["seller_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only seller can reserve listing")
    
    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {"status": "reserved"}}
    )
    
    return {"message": "Listing marked as reserved"}

@router.patch("/listings/{listing_id}/mark-sold")
async def mark_sold(listing_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["seller_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only seller can mark as sold")
    
    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {"status": "sold", "sold_at": datetime.utcnow()}}
    )
    
    return {"message": "Listing marked as sold"}

@router.get("/categories")
async def get_categories():
    return {"categories": [c.value for c in ItemCategory]}

@router.post("/listings/{listing_id}/interest")
async def toggle_interest(listing_id: str, current_user = Depends(get_current_user)):
    """Toggle the current user's interest in a listing. Returns new count and state."""
    db = await get_db()
    user_id = str(current_user["_id"])

    try:
        listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    except:
        raise HTTPException(status_code=404, detail="Listing not found")
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["seller_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot mark interest in your own listing")

    interested_users = listing.get("interested_users", [])
    if user_id in interested_users:
        # Already interested — remove
        await db.marketplace_listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$pull": {"interested_users": user_id}}
        )
        return {"interested": False, "interested_count": len(interested_users) - 1}
    else:
        # Add interest
        await db.marketplace_listings.update_one(
            {"_id": ObjectId(listing_id)},
            {"$addToSet": {"interested_users": user_id}}
        )
        return {"interested": True, "interested_count": len(interested_users) + 1}


@router.get("/listings/{listing_id}/interest")
async def get_interest_status(listing_id: str, current_user = Depends(get_current_user)):
    """Get whether the current user is interested and the total interested count."""
    db = await get_db()
    user_id = str(current_user["_id"])
    try:
        listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    except:
        raise HTTPException(status_code=404, detail="Listing not found")
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    interested_users = listing.get("interested_users", [])
    return {
        "interested": user_id in interested_users,
        "interested_count": len(interested_users)
    }


@router.post("/listings/{listing_id}/report")
async def report_listing(
    listing_id: str,
    reason: str,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    
    await db.reports.insert_one({
        "reporter_id": str(current_user["_id"]),
        "reported_item_id": listing_id,
        "report_type": "marketplace_listing",
        "reason": reason,
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Report submitted successfully"}
