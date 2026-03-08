from datetime import datetime
from bson import ObjectId
from database import get_db

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    related_id: str = None
):
    """Create a notification for a user"""
    db = await get_db()
    notification = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "related_id": related_id,
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)

async def notify_match_found(lost_item_owner_id: str, found_item_owner_id: str, lost_item_name: str, found_item_name: str, match_id: str):
    await create_notification(
        user_id=lost_item_owner_id,
        title="🎉 Potential Match Found!",
        message=f"A potential match was found for your lost item: '{lost_item_name}'",
        notification_type="match",
        related_id=match_id
    )
    await create_notification(
        user_id=found_item_owner_id,
        title="🔍 Match Suggested for Your Found Item",
        message=f"Your found item '{found_item_name}' may match a lost item report",
        notification_type="match",
        related_id=match_id
    )

async def notify_listing_status(user_id: str, listing_title: str, approved: bool, reason: str = None):
    status = "approved" if approved else "rejected"
    await create_notification(
        user_id=user_id,
        title=f"Listing {'✅ Approved' if approved else '❌ Rejected'}",
        message=f"Your listing '{listing_title}' has been {status}" + (f". Reason: {reason}" if reason else ""),
        notification_type="listing",
    )

async def notify_new_message(user_id: str, sender_name: str, conversation_id: str):
    await create_notification(
        user_id=user_id,
        title="💬 New Message",
        message=f"You have a new message from {sender_name}",
        notification_type="message",
        related_id=conversation_id
    )

async def notify_item_claimed(finder_id: str, claimant_name: str, item_name: str):
    await create_notification(
        user_id=finder_id,
        title="🙌 Item Claimed",
        message=f"{claimant_name} has claimed '{item_name}'. Please verify their details.",
        notification_type="claim"
    )

async def notify_listing_expiring(user_id: str, listing_title: str):
    await create_notification(
        user_id=user_id,
        title="⏰ Listing Expiring Soon",
        message=f"Your listing '{listing_title}' will expire in 3 days",
        notification_type="expiry"
    )
