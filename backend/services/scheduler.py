"""
Background scheduler for periodic tasks:
  - Mark expired marketplace listings
  - Send expiry-warning notifications (3 days before expiry)
  - Escalate overdue found items to security
"""
import asyncio
import logging
from datetime import datetime, timedelta

from database import get_db
from services.notification_service import notify_listing_expiring

logger = logging.getLogger(__name__)

_scheduler_task: asyncio.Task = None


async def _run_expiry_jobs():
    """Core job: runs once, marks expired listings and sends warnings."""
    try:
        db = await get_db()
        now = datetime.utcnow()

        # 1. Mark overdue active/reserved listings as expired
        expired_result = await db.marketplace_listings.update_many(
            {
                "status": {"$in": ["active", "reserved"]},
                "expires_at": {"$lt": now}
            },
            {"$set": {"status": "expired", "expired_at": now}}
        )
        if expired_result.modified_count:
            logger.info(f"Scheduler: marked {expired_result.modified_count} listing(s) as expired")

        # 2. Send warning notifications for listings expiring in the next 3 days
        warn_window = now + timedelta(days=3)
        warn_listings = await db.marketplace_listings.find(
            {
                "status": "active",
                "expires_at": {"$gte": now, "$lte": warn_window},
                "expiry_warned": {"$ne": True}
            }
        ).to_list(length=100)

        for listing in warn_listings:
            await notify_listing_expiring(listing["seller_id"], listing["title"])
            await db.marketplace_listings.update_one(
                {"_id": listing["_id"]},
                {"$set": {"expiry_warned": True}}
            )

        if warn_listings:
            logger.info(f"Scheduler: sent expiry warnings for {len(warn_listings)} listing(s)")

        # 3. Auto-escalate unclaimed found items past their escalation date
        overdue_found = await db.found_items.find(
            {
                "status": "unclaimed",
                "escalation_date": {"$lt": now}
            }
        ).to_list(length=100)

        for item in overdue_found:
            await db.found_items.update_one(
                {"_id": item["_id"]},
                {"$set": {"status": "handed_to_security", "escalated_at": now, "auto_escalated": True}}
            )
            await db.admin_logs.insert_one({
                "action": "item_auto_escalated_to_security",
                "item_id": str(item["_id"]),
                "timestamp": now
            })

        if overdue_found:
            logger.info(f"Scheduler: auto-escalated {len(overdue_found)} found item(s) to security")

    except Exception as e:
        logger.error(f"Scheduler job error: {e}")


async def _scheduler_loop(interval_hours: int = 6):
    """Loop that runs expiry jobs every `interval_hours` hours."""
    logger.info(f"Scheduler started — running every {interval_hours}h")
    while True:
        await _run_expiry_jobs()
        await asyncio.sleep(interval_hours * 3600)


def start_scheduler(interval_hours: int = 6):
    """Schedule the background task. Call from FastAPI startup event."""
    global _scheduler_task
    loop = asyncio.get_event_loop()
    _scheduler_task = loop.create_task(_scheduler_loop(interval_hours))
    logger.info("Background scheduler task created")


def stop_scheduler():
    """Cancel the scheduler task. Call from FastAPI shutdown event."""
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("Background scheduler stopped")
