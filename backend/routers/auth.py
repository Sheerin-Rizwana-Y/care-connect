from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime
from bson import ObjectId
from database import get_db
from models.schemas import UserCreate, UserLogin
from utils.auth_utils import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, is_valid_college_email,
    get_current_user, format_user_response
)
from utils.file_utils import save_upload_file
from config import settings

router = APIRouter()

def detect_role(email: str, department: str, year_of_study: str = None) -> str:
    """Auto-detect role based on email pattern or designation"""
    email_lower = email.lower()
    if "staff" in email_lower or "faculty" in email_lower or "admin" in email_lower:
        return "staff"
    if year_of_study:
        return "student"
    return "student"

@router.post("/register")
async def register(user_data: UserCreate):
    db = await get_db()

    # Validate college email
    if not is_valid_college_email(user_data.email):
        raise HTTPException(
            status_code=400,
            detail=f"Please use your official college email (@{settings.COLLEGE_EMAIL_DOMAINS})"
        )

    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password strength
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Detect role
    role = detect_role(user_data.email, user_data.department, user_data.year_of_study)

    user_doc = {
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "department": user_data.department,
        "year_of_study": user_data.year_of_study,
        "staff_designation": user_data.staff_designation,
        "register_number": user_data.register_number,
        "role": role,
        "account_status": "active",
        "is_verified": True,  # ✅ Directly verified
        "points": 0,
        "profile_picture": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # Create tokens immediately
    access_token = create_access_token({"sub": str(user_doc["_id"])})
    refresh_token = create_refresh_token({"sub": str(user_doc["_id"])})

    return {
        "message": "Account created successfully!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": format_user_response(user_doc)
    }

@router.post("/login")
async def login(data: UserLogin):
    db = await get_db()

    # Accept email OR register number
    user = await db.users.find_one({"email": data.email})
    if not user:
        user = await db.users.find_one({"register_number": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/register number or password")

    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("account_status") in ["suspended", "blocked"]:
        raise HTTPException(status_code=403, detail=f"Account is {user['account_status']}")

    # Create tokens
    access_token = create_access_token({"sub": str(user["_id"])})
    refresh_token = create_refresh_token({"sub": str(user["_id"])})

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.get("/me")
async def get_profile(current_user = Depends(get_current_user)):
    return format_user_response(current_user)

@router.put("/me")
async def update_profile(update_data: dict, current_user = Depends(get_current_user)):
    db = await get_db()
    allowed_fields = ["name", "department", "year_of_study", "staff_designation"]
    filtered = {k: v for k, v in update_data.items() if k in allowed_fields}
    filtered["updated_at"] = datetime.utcnow()
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": filtered})
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return format_user_response(updated)

@router.post("/change-password")
async def change_password(data: dict, current_user = Depends(get_current_user)):
    db = await get_db()
    if not verify_password(data.get("current_password", ""), current_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    return {"message": "Password changed successfully"}

@router.post("/me/picture")
async def upload_profile_picture(picture: UploadFile = File(...), current_user = Depends(get_current_user)):
    db = await get_db()
    url = await save_upload_file(picture, "profiles")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_picture": url, "updated_at": datetime.utcnow()}}
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return format_user_response(updated)

@router.get("/me/activity")
async def get_account_activity(current_user = Depends(get_current_user)):
    """Return the current user's recent account activity from admin_logs."""
    db = await get_db()
    user_id = str(current_user["_id"])

    logs = await db.admin_logs.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(50).to_list(length=50)

    # Also pull listing/item actions by this user
    recent_listings = await db.marketplace_listings.find(
        {"seller_id": user_id}
    ).sort("created_at", -1).limit(10).to_list(length=10)

    recent_lost = await db.lost_items.find(
        {"reported_by": user_id}
    ).sort("created_at", -1).limit(10).to_list(length=10)

    recent_found = await db.found_items.find(
        {"reported_by": user_id}
    ).sort("created_at", -1).limit(10).to_list(length=10)

    activity = []

    for log in logs:
        activity.append({
            "type": log["action"],
            "description": log.get("reason", log["action"].replace("_", " ").title()),
            "timestamp": log["timestamp"]
        })

    for l in recent_listings:
        activity.append({
            "type": "listing_created",
            "description": f"Listed '{l['title']}' on marketplace",
            "item_id": str(l["_id"]),
            "timestamp": l["created_at"]
        })

    for item in recent_lost:
        activity.append({
            "type": "lost_item_reported",
            "description": f"Reported '{item['item_name']}' as lost",
            "item_id": str(item["_id"]),
            "timestamp": item["created_at"]
        })

    for item in recent_found:
        activity.append({
            "type": "found_item_reported",
            "description": f"Reported finding '{item['item_name']}'",
            "item_id": str(item["_id"]),
            "timestamp": item["created_at"]
        })

    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    return activity[:30]
