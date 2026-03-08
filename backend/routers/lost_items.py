from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from database import get_db
from utils.auth_utils import get_current_user
from utils.file_utils import save_multiple_files
from services.matching_service import run_matching_for_lost_item

router = APIRouter()


def format_lost_item(item: dict, reporter: dict = None) -> dict:
    return {
        "id": str(item["_id"]),
        "item_name": item.get("item_name", ""),
        "category": item.get("category", ""),
        "description": item.get("description", ""),
        "last_seen_location": item.get("last_seen_location", ""),
        "date_lost": item.get("date_lost"),
        "time_lost": item.get("time_lost"),
        "is_urgent": item.get("is_urgent", False),
        "images": item.get("images", []),
        "status": item.get("status", "open"),
        "reported_by": item.get("reported_by", ""),
        "reporter_name": reporter["name"] if reporter else item.get("reporter_name", "Unknown"),
        "reporter_department": reporter["department"] if reporter else None,
        "created_at": item.get("created_at"),
    }


@router.post("")
async def report_lost_item(
    background_tasks: BackgroundTasks,
    item_name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    last_seen_location: str = Form(...),
    date_lost: str = Form(...),
    time_lost: Optional[str] = Form(None),
    is_urgent: bool = Form(False),
    images: List[UploadFile] = File(default=[]),
    current_user = Depends(get_current_user)
):
    db = await get_db()

    image_urls = []
    if images:
        image_urls = await save_multiple_files(images, "lost_items", max_files=5)

    try:
        date_lost_parsed = datetime.fromisoformat(date_lost.replace('Z', '+00:00'))
    except Exception:
        date_lost_parsed = datetime.utcnow()

    item_doc = {
        "item_name": item_name,
        "category": category,
        "description": description,
        "last_seen_location": last_seen_location,
        "date_lost": date_lost_parsed,
        "time_lost": time_lost,
        "is_urgent": is_urgent,
        "images": image_urls,
        "status": "open",
        "reported_by": str(current_user["_id"]),
        "reporter_name": current_user["name"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.lost_items.insert_one(item_doc)
    item_id = str(result.inserted_id)

    background_tasks.add_task(run_matching_for_lost_item, item_id)

    return {"message": "Lost item reported successfully", "id": item_id}


@router.get("")
async def get_lost_items(
    category: Optional[str] = None,
    status: Optional[str] = None,
    is_urgent: Optional[bool] = None,
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
    if is_urgent is not None:
        query["is_urgent"] = is_urgent
    if search:
        query["$or"] = [
            {"item_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"last_seen_location": {"$regex": search, "$options": "i"}},
        ]

    try:
        total = await db.lost_items.count_documents(query)
        cursor = db.lost_items.find(query).sort("created_at", -1).skip(skip).limit(limit)
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
        formatted.append(format_lost_item(item, reporter))

    return {"items": formatted, "total": total}


@router.get("/my")
async def get_my_lost_items(current_user = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = db.lost_items.find(
            {"reported_by": str(current_user["_id"])}
        ).sort("created_at", -1)
        items = await cursor.to_list(length=100)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

    return [format_lost_item(i) for i in items]


@router.get("/{item_id}")
async def get_lost_item(item_id: str, current_user = Depends(get_current_user)):
    db = await get_db()

    try:
        item = await db.lost_items.find_one({"_id": ObjectId(item_id)})
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

    matches = await db.match_results.find({"lost_item_id": item_id}).to_list(length=10)

    result = format_lost_item(item, reporter)
    result["matches"] = []
    for match in matches:
        result["matches"].append({
            "match_id": str(match["_id"]),
            "found_item_id": match.get("found_item_id"),
            "found_item_name": match.get("found_item_name"),
            "total_score": match.get("total_score"),
            "text_score": match.get("text_score"),
            "location_score": match.get("location_score"),
            "status": match.get("status"),
        })

    return result


@router.put("/{item_id}")
async def update_lost_item(
    item_id: str,
    update_data: dict,
    current_user = Depends(get_current_user)
):
    db = await get_db()

    item = await db.lost_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.get("reported_by") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    allowed = ["description", "last_seen_location", "is_urgent"]
    filtered = {k: v for k, v in update_data.items() if k in allowed}
    filtered["updated_at"] = datetime.utcnow()

    await db.lost_items.update_one({"_id": ObjectId(item_id)}, {"$set": filtered})
    return {"message": "Lost item updated"}


@router.delete("/{item_id}")
async def delete_lost_item(item_id: str, current_user = Depends(get_current_user)):
    db = await get_db()

    item = await db.lost_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.get("reported_by") != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.lost_items.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Lost item report deleted"}


@router.patch("/{item_id}/close")
async def close_lost_item(item_id: str, current_user = Depends(get_current_user)):
    db = await get_db()

    item = await db.lost_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.get("reported_by") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.lost_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"status": "closed", "closed_at": datetime.utcnow()}}
    )

    return {"message": "Lost item report closed"}
