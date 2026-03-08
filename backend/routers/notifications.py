from fastapi import APIRouter, Depends
from bson import ObjectId
from database import get_db
from utils.auth_utils import get_current_user

router = APIRouter()

@router.get("")
async def get_notifications(current_user = Depends(get_current_user)):
    db = await get_db()
    notifications = await db.notifications.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).limit(50).to_list(length=50)
    
    return [{
        "id": str(n["_id"]),
        "title": n["title"],
        "message": n["message"],
        "type": n["type"],
        "related_id": n.get("related_id"),
        "link": n.get("link"),
        "is_read": n["is_read"],
        "created_at": n["created_at"]
    } for n in notifications]

@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user["_id"])},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

@router.patch("/mark-all-read")
async def mark_all_read(current_user = Depends(get_current_user)):
    db = await get_db()
    await db.notifications.update_many(
        {"user_id": str(current_user["_id"]), "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

@router.get("/unread-count")
async def get_unread_count(current_user = Depends(get_current_user)):
    db = await get_db()
    count = await db.notifications.count_documents({
        "user_id": str(current_user["_id"]),
        "is_read": False
    })
    return {"count": count}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    await db.notifications.delete_one({
        "_id": ObjectId(notification_id),
        "user_id": str(current_user["_id"])
    })
    return {"message": "Notification deleted"}
