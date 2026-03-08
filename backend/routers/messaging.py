from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
from datetime import datetime
from bson import ObjectId

from database import get_db
from models.schemas import MessageCreate
from utils.auth_utils import get_current_user
from utils.file_utils import save_upload_file
from services.notification_service import notify_new_message

router = APIRouter()

def get_conversation_id(user1_id: str, user2_id: str) -> str:
    """Generate consistent conversation ID from two user IDs"""
    ids = sorted([user1_id, user2_id])
    return f"{ids[0]}_{ids[1]}"


async def _persist_message(db, sender_id, sender_name, receiver_id, content, image_url=None, related_item_id=None, related_item_type=None):
    """Shared helper: save message + update conversation + notify."""
    conversation_id = get_conversation_id(sender_id, receiver_id)

    message_doc = {
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "receiver_id": receiver_id,
        "content": content,
        "image_url": image_url,
        "related_item_id": related_item_id,
        "related_item_type": related_item_type,
        "is_read": False,
        "is_reported": False,
        "created_at": datetime.utcnow()
    }

    result = await db.messages.insert_one(message_doc)
    await notify_new_message(receiver_id, sender_name, conversation_id)
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {
            "conversation_id": conversation_id,
            "participants": [sender_id, receiver_id],
            "last_message": content or "📷 Image",
            "last_message_time": datetime.utcnow(),
            "last_sender": sender_id
        }},
        upsert=True
    )
    return str(result.inserted_id), conversation_id

@router.post("/send")
async def send_message(
    data: MessageCreate,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    sender_id = str(current_user["_id"])
    
    if sender_id == data.receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
    
    receiver = await db.users.find_one({"_id": ObjectId(data.receiver_id)})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    msg_id, conversation_id = await _persist_message(
        db, sender_id, current_user["name"], data.receiver_id,
        data.content, None, data.related_item_id, data.related_item_type
    )

    return {"id": msg_id, "conversation_id": conversation_id, "message": "Message sent"}


@router.post("/send-image")
async def send_image_message(
    receiver_id: str,
    image: UploadFile = File(...),
    caption: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Send an image in a conversation (optionally with a text caption)."""
    db = await get_db()
    sender_id = str(current_user["_id"])

    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    receiver = await db.users.find_one({"_id": ObjectId(receiver_id)})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    image_url = await save_upload_file(image, "chat_images")
    content = caption or "📷 Image"

    msg_id, conversation_id = await _persist_message(
        db, sender_id, current_user["name"], receiver_id,
        content, image_url
    )

    return {"id": msg_id, "conversation_id": conversation_id, "image_url": image_url, "message": "Image sent"}

@router.get("/conversations")
async def get_conversations(current_user = Depends(get_current_user)):
    db = await get_db()
    user_id = str(current_user["_id"])
    
    conversations = await db.conversations.find(
        {"participants": user_id}
    ).sort("last_message_time", -1).to_list(length=50)
    
    result = []
    for conv in conversations:
        other_id = [p for p in conv["participants"] if p != user_id][0]
        other_user = await db.users.find_one({"_id": ObjectId(other_id)})
        
        unread_count = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "receiver_id": user_id,
            "is_read": False
        })
        
        result.append({
            "conversation_id": conv["conversation_id"],
            "other_user_id": other_id,
            "other_user_name": other_user["name"] if other_user else "Unknown",
            "other_user_picture": other_user.get("profile_picture") if other_user else None,
            "last_message": conv.get("last_message", ""),
            "last_message_time": conv.get("last_message_time"),
            "unread_count": unread_count
        })
    
    return result

@router.get("/conversation/{other_user_id}")
async def get_conversation_messages(
    other_user_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    user_id = str(current_user["_id"])
    conversation_id = get_conversation_id(user_id, other_user_id)
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return [
        {
            "id": str(m["_id"]),
            "sender_id": m["sender_id"],
            "sender_name": m["sender_name"],
            "content": m["content"],
            "image_url": m.get("image_url"),
            "is_read": m["is_read"],
            "created_at": m["created_at"]
        }
        for m in reversed(messages)
    ]

@router.post("/messages/{message_id}/report")
async def report_message(
    message_id: str,
    reason: str,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    
    message = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_reported": True, "report_reason": reason}}
    )
    
    await db.reports.insert_one({
        "reporter_id": str(current_user["_id"]),
        "reported_item_id": message_id,
        "report_type": "message",
        "reason": reason,
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Message reported to administrators"}

@router.get("/unread-count")
async def get_unread_count(current_user = Depends(get_current_user)):
    db = await get_db()
    count = await db.messages.count_documents({
        "receiver_id": str(current_user["_id"]),
        "is_read": False
    })
    return {"count": count}
