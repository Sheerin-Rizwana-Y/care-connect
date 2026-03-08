from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List

from database import get_db
from utils.auth_utils import get_current_user, get_current_admin
from services.notification_service import notify_listing_status

router = APIRouter()

@router.get("/analytics")
async def get_analytics(current_user = Depends(get_current_admin)):
    db = await get_db()
    
    total_users = await db.users.count_documents({"is_verified": True})
    total_lost = await db.lost_items.count_documents({})
    total_found = await db.found_items.count_documents({})
    total_listings = await db.marketplace_listings.count_documents({})
    successful_recoveries = await db.found_items.count_documents({"status": "claimed"})
    
    recovery_rate = (successful_recoveries / total_found * 100) if total_found > 0 else 0
    
    # Top categories for lost items
    pipeline_cats = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_categories_raw = await db.lost_items.aggregate(pipeline_cats).to_list(length=5)
    top_categories = [{"category": c["_id"], "count": c["count"]} for c in top_categories_raw]
    
    # Hotspot locations
    pipeline_locs = [
        {"$group": {"_id": "$last_seen_location", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    hotspots_raw = await db.lost_items.aggregate(pipeline_locs).to_list(length=5)
    hotspot_locations = [{"location": h["_id"], "count": h["count"]} for h in hotspots_raw]
    
    # Recent activity
    recent_lost = await db.lost_items.find({}).sort("created_at", -1).limit(5).to_list(5)
    recent_found = await db.found_items.find({}).sort("created_at", -1).limit(5).to_list(5)
    recent_listings = await db.marketplace_listings.find({}).sort("created_at", -1).limit(5).to_list(5)
    
    recent_activity = []
    for item in recent_lost:
        recent_activity.append({"type": "lost_reported", "name": item["item_name"], "time": item["created_at"]})
    for item in recent_found:
        recent_activity.append({"type": "found_reported", "name": item["item_name"], "time": item["created_at"]})
    
    recent_activity.sort(key=lambda x: x["time"], reverse=True)
    
    # Monthly stats (last 6 months)
    monthly_stats = []
    for i in range(5, -1, -1):
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)
        
        lost_count = await db.lost_items.count_documents({
            "created_at": {"$gte": month_start, "$lt": month_end}
        })
        found_count = await db.found_items.count_documents({
            "created_at": {"$gte": month_start, "$lt": month_end}
        })
        
        monthly_stats.append({
            "month": month_start.strftime("%b %Y"),
            "lost": lost_count,
            "found": found_count
        })
    
    # Pending items
    pending_listings = await db.marketplace_listings.count_documents({"status": "pending"})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_lost_items": total_lost,
        "total_found_items": total_found,
        "total_marketplace_listings": total_listings,
        "successful_recoveries": successful_recoveries,
        "recovery_rate": round(recovery_rate, 1),
        "top_categories": top_categories,
        "hotspot_locations": hotspot_locations,
        "recent_activity": recent_activity[:10],
        "monthly_stats": monthly_stats,
        "pending_listings": pending_listings,
        "pending_reports": pending_reports
    }

@router.get("/pending-listings")
async def get_pending_listings(current_user = Depends(get_current_admin)):
    db = await get_db()
    listings = await db.marketplace_listings.find({"status": "pending"}).sort("created_at", 1).to_list(length=50)
    
    result = []
    for listing in listings:
        seller = await db.users.find_one({"_id": ObjectId(listing["seller_id"])})
        result.append({
            "id": str(listing["_id"]),
            "title": listing["title"],
            "category": listing["category"],
            "description": listing["description"],
            "price": listing.get("price"),
            "is_free": listing.get("is_free", False),
            "condition": listing["condition"],
            "images": listing.get("images", []),
            "seller_name": seller["name"] if seller else "Unknown",
            "seller_email": seller["email"] if seller else "Unknown",
            "created_at": listing["created_at"]
        })
    
    return result

@router.patch("/listings/{listing_id}/approve")
async def approve_listing(listing_id: str, current_user = Depends(get_current_admin)):
    db = await get_db()
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {"status": "active", "approved_by": str(current_user["_id"]), "approved_at": datetime.utcnow()}}
    )
    
    await notify_listing_status(listing["seller_id"], listing["title"], True)
    
    await db.admin_logs.insert_one({
        "action": "listing_approved",
        "item_id": listing_id,
        "admin_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Listing approved"}

@router.patch("/listings/{listing_id}/reject")
async def reject_listing(listing_id: str, reason: str, current_user = Depends(get_current_admin)):
    db = await get_db()
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    await db.marketplace_listings.update_one(
        {"_id": ObjectId(listing_id)},
        {"$set": {"status": "rejected", "rejection_reason": reason, "rejected_at": datetime.utcnow()}}
    )
    
    await notify_listing_status(listing["seller_id"], listing["title"], False, reason)
    
    await db.admin_logs.insert_one({
        "action": "listing_rejected",
        "item_id": listing_id,
        "reason": reason,
        "admin_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Listing rejected"}

@router.get("/users")
async def get_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_admin)
):
    db = await get_db()
    
    query = {"is_verified": True}
    if role:
        query["role"] = role
    if status:
        query["account_status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "users": [{
            "id": str(u["_id"]),
            "name": u["name"],
            "email": u["email"],
            "department": u["department"],
            "role": u["role"],
            "account_status": u["account_status"],
            "points": u.get("points", 0),
            "created_at": u["created_at"]
        } for u in users],
        "total": total
    }

@router.patch("/users/{user_id}/suspend")
async def suspend_user(user_id: str, reason: str, current_user = Depends(get_current_admin)):
    db = await get_db()
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"account_status": "suspended"}}
    )
    
    await db.admin_logs.insert_one({
        "action": "user_suspended",
        "user_id": user_id,
        "reason": reason,
        "admin_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "User suspended"}


@router.patch("/users/{user_id}/block")
async def block_user(user_id: str, reason: str, current_user = Depends(get_current_admin)):
    db = await get_db()

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"account_status": "blocked"}}
    )

    await db.admin_logs.insert_one({
        "action": "user_blocked",
        "user_id": user_id,
        "reason": reason,
        "admin_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })

    return {"message": "User blocked"}

@router.patch("/users/{user_id}/activate")
async def activate_user(user_id: str, current_user = Depends(get_current_admin)):
    db = await get_db()
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"account_status": "active"}}
    )
    
    return {"message": "User activated"}

@router.patch("/users/{user_id}/make-admin")
async def make_admin(user_id: str, current_user = Depends(get_current_admin)):
    db = await get_db()
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": "admin"}}
    )
    
    return {"message": "User promoted to admin"}

@router.get("/reports")
async def get_reports(current_user = Depends(get_current_admin)):
    db = await get_db()
    reports = await db.reports.find({"status": "pending"}).sort("created_at", -1).to_list(length=50)
    
    result = []
    for report in reports:
        reporter = await db.users.find_one({"_id": ObjectId(report["reporter_id"])})
        result.append({
            "id": str(report["_id"]),
            "reporter_name": reporter["name"] if reporter else "Unknown",
            "report_type": report["report_type"],
            "reason": report["reason"],
            "reported_item_id": report.get("reported_item_id"),
            "reported_user_id": report.get("reported_user_id"),
            "status": report["status"],
            "created_at": report["created_at"]
        })
    
    return result

@router.patch("/reports/{report_id}/resolve")
async def resolve_report(report_id: str, resolution: str, current_user = Depends(get_current_admin)):
    db = await get_db()
    
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": "resolved", "resolution": resolution, "resolved_by": str(current_user["_id"]), "resolved_at": datetime.utcnow()}}
    )
    
    return {"message": "Report resolved"}

@router.get("/escalations")
async def get_escalations(current_user = Depends(get_current_admin)):
    db = await get_db()
    items = await db.found_items.find({"status": "handed_to_security"}).to_list(length=50)
    
    return [{
        "id": str(item["_id"]),
        "item_name": item["item_name"],
        "description": item["description"],
        "found_location": item["found_location"],
        "escalated_at": item.get("escalated_at"),
        "reporter_name": item.get("reporter_name")
    } for item in items]

@router.get("/lost-items")
async def admin_get_lost_items(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_admin)
):
    """Admin: list all lost item reports with optional status filter."""
    db = await get_db()
    query = {}
    if status:
        query["status"] = status
    total = await db.lost_items.count_documents(query)
    items = await db.lost_items.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    result = []
    for item in items:
        reporter = await db.users.find_one({"_id": ObjectId(item["reported_by"])})
        result.append({
            "id": str(item["_id"]),
            "item_name": item["item_name"],
            "category": item["category"],
            "description": item["description"],
            "last_seen_location": item["last_seen_location"],
            "is_urgent": item.get("is_urgent", False),
            "status": item["status"],
            "reporter_name": reporter["name"] if reporter else "Unknown",
            "reporter_email": reporter["email"] if reporter else "Unknown",
            "created_at": item["created_at"]
        })
    return {"items": result, "total": total}


@router.delete("/lost-items/{item_id}")
async def admin_remove_lost_item(item_id: str, reason: str, current_user = Depends(get_current_admin)):
    """Admin: remove an inappropriate or duplicate lost item report."""
    db = await get_db()
    item = await db.lost_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
    await db.lost_items.delete_one({"_id": ObjectId(item_id)})
    await db.admin_logs.insert_one({
        "action": "lost_item_removed",
        "item_id": item_id,
        "reason": reason,
        "admin_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })
    return {"message": "Lost item report removed"}


@router.get("/found-items")
async def admin_get_found_items(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_admin)
):
    """Admin: list all found item reports with optional status filter."""
    db = await get_db()
    query = {}
    if status:
        query["status"] = status
    total = await db.found_items.count_documents(query)
    items = await db.found_items.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    result = []
    for item in items:
        reporter = await db.users.find_one({"_id": ObjectId(item["reported_by"])})
        result.append({
            "id": str(item["_id"]),
            "item_name": item["item_name"],
            "category": item["category"],
            "description": item["description"],
            "found_location": item["found_location"],
            "status": item["status"],
            "reporter_name": reporter["name"] if reporter else "Unknown",
            "reporter_email": reporter["email"] if reporter else "Unknown",
            "created_at": item["created_at"]
        })
    return {"items": result, "total": total}


@router.delete("/found-items/{item_id}")
async def admin_remove_found_item(item_id: str, reason: str, current_user = Depends(get_current_admin)):
    """Admin: remove an inappropriate or duplicate found item report."""
    db = await get_db()
    item = await db.found_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found")
    await db.found_items.delete_one({"_id": ObjectId(item_id)})
    await db.admin_logs.insert_one({
        "action": "found_item_removed",
        "item_id": item_id,
        "reason": reason,
        "admin_id": str(current_user["_id"]),
        "timestamp": datetime.utcnow()
    })
    return {"message": "Found item report removed"}

@router.get("/logs")
async def get_admin_logs(skip: int = 0, limit: int = 50, current_user = Depends(get_current_admin)):
    db = await get_db()
    logs = await db.admin_logs.find({}).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    
    result = []
    for log in logs:
        admin = await db.users.find_one({"_id": ObjectId(log.get("admin_id", ""))}) if log.get("admin_id") else None
        result.append({
            "id": str(log["_id"]),
            "action": log["action"],
            "admin_name": admin["name"] if admin else "System",
            "item_id": log.get("item_id"),
            "user_id": log.get("user_id"),
            "reason": log.get("reason"),
            "timestamp": log["timestamp"]
        })
    
    return result
