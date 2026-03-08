from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

from database import get_db
from utils.auth_utils import get_current_user
from utils.file_utils import save_multiple_files
from services.matching_service import run_matching_for_found_item
from config import settings

router = APIRouter()


def format_found_item(item: dict, reporter: dict = None) -> dict:
    return {
        "id": str(item["_id"]),
        "item_name": item.get("item_name", ""),
        "category": item.get("category", ""),
        "description": item.get("description", ""),
        "found_location": item.get("found_location", ""),
        "date_found": item.get("date_found"),
        "images": item.get("images", []),
        "status": item.get("status", "unclaimed"),
        "reported_by": item.get("reported_by", ""),
        "reporter_name": reporter["name"] if reporter else item.get("reporter_name", "Unknown"),
        "reporter_department": reporter["department"] if reporter else None,
        "created_at": item.get("created_at"),
        "escalation_date": item.get("escalation_date"),
    }


@router.post("")
async def report_found_item(
    background_tasks: BackgroundTasks,
    item_name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    found_location: str = Form(...),
    date_found: str = Form(...),
    images: List[UploadFile] = File(default=[]),
    current_user = Depends(get_current_user)
):
    db = await get_db()

    image_urls = []
    if images:
        image_urls = await save_multiple_files(images, "found_items", max_files=5)

    try:
        date_found_parsed = datetime.fromisoformat(date_found.replace('Z', '+00:00'))
    except Exception:
        date_found_parsed = datetime.utcnow()

    escalation_days = getattr(settings, 'FOUND_ITEM_ESCALATION_DAYS', 14)
    escalation_date = datetime.utcnow() + timedelta(days=escalation_days)

    item_doc = {
        "item_name": item_name,
        "category": category,
        "description": description,
        "found_location": found_location,
        "date_found": date_found_parsed,
        "images": image_urls,
        "status": "unclaimed",
        "reported_by": str(current_user["_id"]),
        "reporter_name": current_user["name"],
        "escalation_date": escalation_date,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.found_items.insert_one(item_doc)
    item_id = str(result.inserted_id)

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"points": 5}}
    )

    background_tasks.add_task(run_matching_for_found_item, item_id)

    return {"message": "Found item reported successfully. Thank you!", "id": item_id}


@router.get("")
async def get_found_items(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_user)
):
    db = await get_db()

    query = {}
    if status:
        query["status"] = status
    # No default status filter — return ALL documents
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"item_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"found_location": {"$regex": search, "$options": "i"}},
        ]

    try:
        total = await db.found_items.count_documents(query)
        cursor = db.found_items.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = await cursor.to_list(length=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

    formatted = []
    for item in items:
        reporter = None
        reported_by = item.get("reported_by")
        if reported_by:
            try:
                reporter = await db.users.find_one({"_id": ObjectId(reported_by)})
            except Exception:
                pass
        formatted.append(format_found_item(item, reporter))

    return {"items": formatted, "total": total}


@router.get("/my")
async def get_my_found_items(current_user = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = db.found_items.find(
            {"reported_by": str(current_user["_id"])}
        ).sort("created_at", -1)
        items = await cursor.to_list(length=100)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

    return [format_found_item(i) for i in items]


@router.get("/{item_id}")
async def get_found_item(item_id: str, current_user = Depends(get_current_user)):
    db = await get_db()

    try:
        item = await db.found_items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found")

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    reporter = None
    reported_by = item.get("reported_by")
    if reported_by:
        try:
            reporter = await db.users.find_one({"_id": ObjectId(reported_by)})
        except Exception:
            pass

    matches = await db.match_results.find({"found_item_id": item_id}).to_list(length=10)

    result = format_found_item(item, reporter)
    result["matches"] = [{
        "match_id": str(m["_id"]),
        "lost_item_id": m.get("lost_item_id"),
        "lost_item_name": m.get("lost_item_name"),
        "total_score": m.get("total_score"),
        "status": m.get("status"),
    } for m in matches]

    return result


@router.patch("/{item_id}/escalate")
async def escalate_to_security(item_id: str, current_user = Depends(get_current_user)):
    db = await get_db()

    item = await db.found_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.get("reported_by") != str(current_user["_id"]) and current_user.get("role") not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.found_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {
            "status": "handed_to_security",
            "escalated_by": str(current_user["_id"]),
            "escalated_at": datetime.utcnow(),
        }}
    )

    return {"message": "Item escalated to campus security"}
