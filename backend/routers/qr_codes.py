from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime
from bson import ObjectId
import qrcode
import io
import base64
import json
import secrets
from cryptography.fernet import Fernet

from database import get_db
from utils.auth_utils import get_current_user
from config import settings

router = APIRouter()

# Simple encryption key (in production, store securely)
FERNET_KEY = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32)[:32])
try:
    fernet = Fernet(FERNET_KEY)
except:
    # Fallback - generate a valid key
    fernet = Fernet(Fernet.generate_key())

def generate_qr_code_image(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#6366f1", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

@router.post("/register-item")
async def register_qr_item(
    item_name: str,
    description: str,
    category: str,
    current_user = Depends(get_current_user)
):
    db = await get_db()
    
    # Create item record
    item_doc = {
        "item_name": item_name,
        "description": description,
        "category": category,
        "owner_id": str(current_user["_id"]),
        "owner_name": current_user["name"],
        "created_at": datetime.utcnow(),
        "scan_count": 0,
        "is_active": True
    }
    
    result = await db.qr_items.insert_one(item_doc)
    item_id = str(result.inserted_id)
    
    # Create encrypted QR data
    qr_data = json.dumps({
        "item_id": item_id,
        "owner_id": str(current_user["_id"])
    })
    
    try:
        encrypted = fernet.encrypt(qr_data.encode()).decode()
    except:
        encrypted = base64.b64encode(qr_data.encode()).decode()
    
    scan_url = f"http://localhost:3000/qr/scan/{encrypted}"
    
    # Generate QR code
    qr_base64 = generate_qr_code_image(scan_url)
    
    # Store QR code URL
    await db.qr_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"qr_code_data": encrypted, "scan_url": scan_url}}
    )
    
    return {
        "id": item_id,
        "item_name": item_name,
        "qr_code_base64": qr_base64,
        "scan_url": scan_url,
        "message": "QR code generated! Print and attach to your item."
    }

@router.get("/my-items")
async def get_my_qr_items(current_user = Depends(get_current_user)):
    db = await get_db()
    
    items = await db.qr_items.find(
        {"owner_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(length=50)
    
    result = []
    for item in items:
        # Regenerate QR
        qr_data = json.dumps({
            "item_id": str(item["_id"]),
            "owner_id": item["owner_id"]
        })
        try:
            encrypted = fernet.encrypt(qr_data.encode()).decode()
        except:
            encrypted = item.get("qr_code_data", "")
        
        scan_url = f"http://localhost:3000/qr/scan/{encrypted}"
        qr_base64 = generate_qr_code_image(scan_url)
        
        result.append({
            "id": str(item["_id"]),
            "item_name": item["item_name"],
            "description": item["description"],
            "category": item["category"],
            "qr_code_base64": qr_base64,
            "scan_count": item.get("scan_count", 0),
            "created_at": item["created_at"]
        })
    
    return result

@router.get("/scan/{encrypted_data}")
async def scan_qr_code(encrypted_data: str):
    """Public endpoint for scanning QR codes - shows item info"""
    db = await get_db()
    
    try:
        try:
            decrypted = fernet.decrypt(encrypted_data.encode()).decode()
        except:
            decrypted = base64.b64decode(encrypted_data.encode()).decode()
        
        data = json.loads(decrypted)
        item_id = data["item_id"]
        
        item = await db.qr_items.find_one({"_id": ObjectId(item_id), "is_active": True})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found or deactivated")
        
        # Increment scan count
        await db.qr_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$inc": {"scan_count": 1}, "$set": {"last_scanned": datetime.utcnow()}}
        )
        
        return {
            "item_name": item["item_name"],
            "description": item["description"],
            "category": item["category"],
            "owner_id": item["owner_id"],
            "message": "Please log in to contact the owner through CARE Connect+",
            "contact_url": f"http://localhost:3000/messages?to={item['owner_id']}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired QR code")

@router.delete("/{item_id}")
async def deactivate_qr_item(item_id: str, current_user = Depends(get_current_user)):
    db = await get_db()
    
    item = await db.qr_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.qr_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "QR item deactivated"}
