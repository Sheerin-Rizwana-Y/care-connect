from datetime import datetime
from typing import List
import math
import re
import logging

from config import settings
from database import get_db
from services.notification_service import notify_match_found

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Text / scoring helpers
# ─────────────────────────────────────────────

def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def compute_text_similarity(text1: str, text2: str) -> float:
    t1 = set(preprocess_text(text1).split())
    t2 = set(preprocess_text(text2).split())
    if not t1 or not t2:
        return 0.0
    intersection = len(t1 & t2)
    union = len(t1 | t2)
    jaccard = intersection / union if union > 0 else 0
    overlap = intersection / min(len(t1), len(t2)) if min(len(t1), len(t2)) > 0 else 0
    return 0.5 * jaccard + 0.5 * overlap


def compute_category_match(cat1: str, cat2: str) -> float:
    return 1.0 if cat1.lower() == cat2.lower() else 0.0


def compute_location_similarity(loc1: str, loc2: str) -> float:
    if not loc1 or not loc2:
        return 0.0
    l1 = set(preprocess_text(loc1).split())
    l2 = set(preprocess_text(loc2).split())
    if not l1 or not l2:
        return 0.0
    common = len(l1 & l2)
    return common / max(len(l1), len(l2)) if common > 0 else 0.0


def compute_time_similarity(lost_time: datetime, found_time: datetime) -> float:
    if not lost_time or not found_time:
        return 0.5
    diff = abs((found_time - lost_time).total_seconds())
    hours = diff / 3600
    if hours <= 6:
        return 1.0
    elif hours <= 24:
        return 0.8
    elif hours <= 72:
        return 0.6
    elif hours <= 168:
        return 0.4
    elif hours <= 720:
        return 0.2
    else:
        return 0.0


def compute_image_similarity(lost_images: List[str], found_images: List[str]) -> float:
    if lost_images and found_images:
        return 0.5
    return 0.0


def compute_match_score(lost_item: dict, found_item: dict) -> dict:
    lost_text = f"{lost_item.get('item_name', '')} {lost_item.get('description', '')}"
    found_text = f"{found_item.get('item_name', '')} {found_item.get('description', '')}"
    text_score = compute_text_similarity(lost_text, found_text)

    cat_match = compute_category_match(
        lost_item.get('category', ''),
        found_item.get('category', '')
    )
    text_score = min(1.0, text_score + (cat_match * 0.3))

    image_score = compute_image_similarity(
        lost_item.get('images', []),
        found_item.get('images', [])
    )
    location_score = compute_location_similarity(
        lost_item.get('last_seen_location', ''),
        found_item.get('found_location', '')
    )
    time_score = compute_time_similarity(
        lost_item.get('date_lost'),
        found_item.get('date_found')
    )

    total_score = (
        text_score * settings.TEXT_WEIGHT +
        image_score * settings.IMAGE_WEIGHT +
        location_score * settings.LOCATION_WEIGHT +
        time_score * settings.TIME_WEIGHT
    )

    return {
        "text_score": round(text_score, 4),
        "image_score": round(image_score, 4),
        "location_score": round(location_score, 4),
        "time_score": round(time_score, 4),
        "total_score": round(total_score, 4),
    }


# ─────────────────────────────────────────────
# Matching runners
# ─────────────────────────────────────────────

async def run_matching_for_lost_item(lost_item_id: str):
    """Run AI matching for a newly reported lost item against all unclaimed found items."""
    try:
        from bson import ObjectId
        db = await get_db()

        lost_item = await db.lost_items.find_one({"_id": ObjectId(lost_item_id)})
        if not lost_item:
            logger.warning(f"[matching] lost item {lost_item_id} not found")
            return []

        found_items = await db.found_items.find(
            {"status": {"$in": ["unclaimed", "potential_match"]}}
        ).to_list(length=100)

        best_matches = []
        for found_item in found_items:
            found_item_id = str(found_item["_id"])

            # Skip if already matched
            existing = await db.match_results.find_one({
                "lost_item_id": lost_item_id,
                "found_item_id": found_item_id,
            })
            if existing:
                continue

            scores = compute_match_score(lost_item, found_item)
            if scores["total_score"] < settings.MATCH_THRESHOLD:
                continue

            match_doc = {
                "lost_item_id": lost_item_id,
                "found_item_id": found_item_id,
                "lost_item_name": lost_item.get("item_name"),
                "found_item_name": found_item.get("item_name"),
                "text_score": scores["text_score"],
                "image_score": scores["image_score"],
                "location_score": scores["location_score"],
                "time_score": scores["time_score"],
                "total_score": scores["total_score"],
                "status": "pending",
                "created_at": datetime.utcnow(),
            }
            result = await db.match_results.insert_one(match_doc)
            match_id = str(result.inserted_id)

            # Update item statuses
            await db.lost_items.update_one(
                {"_id": ObjectId(lost_item_id)},
                {"$set": {"status": "potential_match"}}
            )
            await db.found_items.update_one(
                {"_id": found_item["_id"]},
                {"$set": {"status": "potential_match"}}
            )

            # Notify both users
            await notify_match_found(
                lost_item_owner_id=lost_item.get("reported_by"),
                found_item_owner_id=found_item.get("reported_by"),
                lost_item_name=lost_item.get("item_name"),
                found_item_name=found_item.get("item_name"),
                match_id=match_id,
            )

            best_matches.append(match_doc)

        return best_matches

    except Exception as e:
        logger.error(f"[matching] run_matching_for_lost_item({lost_item_id}) failed: {e}", exc_info=True)
        return []


async def run_matching_for_found_item(found_item_id: str):
    """Run AI matching for a newly reported found item against all open lost items."""
    try:
        from bson import ObjectId
        db = await get_db()

        found_item = await db.found_items.find_one({"_id": ObjectId(found_item_id)})
        if not found_item:
            logger.warning(f"[matching] found item {found_item_id} not found")
            return []

        lost_items = await db.lost_items.find(
            {"status": {"$in": ["open", "potential_match"]}}
        ).to_list(length=100)

        matches = []
        for lost_item in lost_items:
            lost_item_id = str(lost_item["_id"])

            existing = await db.match_results.find_one({
                "lost_item_id": lost_item_id,
                "found_item_id": found_item_id,
            })
            if existing:
                continue

            scores = compute_match_score(lost_item, found_item)
            if scores["total_score"] < settings.MATCH_THRESHOLD:
                continue

            match_doc = {
                "lost_item_id": lost_item_id,
                "found_item_id": found_item_id,
                "lost_item_name": lost_item.get("item_name"),
                "found_item_name": found_item.get("item_name"),
                "text_score": scores["text_score"],
                "image_score": scores["image_score"],
                "location_score": scores["location_score"],
                "time_score": scores["time_score"],
                "total_score": scores["total_score"],
                "status": "pending",
                "created_at": datetime.utcnow(),
            }
            result = await db.match_results.insert_one(match_doc)
            match_id = str(result.inserted_id)

            # Update both item statuses
            await db.lost_items.update_one(
                {"_id": lost_item["_id"]},
                {"$set": {"status": "potential_match"}}
            )
            await db.found_items.update_one(
                {"_id": ObjectId(found_item_id)},
                {"$set": {"status": "potential_match"}}
            )

            # Notify both users
            await notify_match_found(
                lost_item_owner_id=lost_item.get("reported_by"),
                found_item_owner_id=found_item.get("reported_by"),
                lost_item_name=lost_item.get("item_name"),
                found_item_name=found_item.get("item_name"),
                match_id=match_id,
            )

            matches.append(match_doc)

        return matches

    except Exception as e:
        logger.error(f"[matching] run_matching_for_found_item({found_item_id}) failed: {e}", exc_info=True)
        return []
