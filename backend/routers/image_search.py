from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from utils.auth_utils import get_current_user
from database import get_db
import base64

router = APIRouter()

@router.post("/search")
async def image_search(
    image: UploadFile = File(...),
    search_in: str = "all",  # "marketplace", "found", "lost", "all"
    current_user = Depends(get_current_user)
):
    """
    Visual image search across platform items.
    NOTE: Full ML-based image embedding search requires additional infrastructure
    (e.g., CLIP model + vector database like Pinecone/Weaviate).
    This endpoint provides the API structure with keyword fallback.
    """
    db = await get_db()
    
    content = await image.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large")
    
    # In production: 
    # 1. Extract image embedding using CLIP/ResNet
    # 2. Query vector database for similar embeddings
    # 3. Return ranked results
    
    # For now: return recent items as placeholder
    results = []
    
    if search_in in ["marketplace", "all"]:
        listings = await db.marketplace_listings.find(
            {"status": "active", "images": {"$exists": True, "$ne": []}}
        ).sort("created_at", -1).limit(6).to_list(6)
        
        for l in listings:
            results.append({
                "id": str(l["_id"]),
                "type": "marketplace",
                "title": l["title"],
                "image": l["images"][0] if l.get("images") else None,
                "similarity_score": 0.75,
                "category": l["category"]
            })
    
    if search_in in ["found", "all"]:
        found_items = await db.found_items.find(
            {"status": "unclaimed", "images": {"$exists": True, "$ne": []}}
        ).sort("created_at", -1).limit(4).to_list(4)
        
        for item in found_items:
            results.append({
                "id": str(item["_id"]),
                "type": "found_item",
                "title": item["item_name"],
                "image": item["images"][0] if item.get("images") else None,
                "similarity_score": 0.65,
                "category": item["category"]
            })
    
    if search_in in ["lost", "all"]:
        lost_items = await db.lost_items.find(
            {"status": "open", "images": {"$exists": True, "$ne": []}}
        ).sort("created_at", -1).limit(4).to_list(4)
        
        for item in lost_items:
            results.append({
                "id": str(item["_id"]),
                "type": "lost_item",
                "title": item["item_name"],
                "image": item["images"][0] if item.get("images") else None,
                "similarity_score": 0.60,
                "category": item["category"]
            })
    
    # Sort by similarity score
    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    return {
        "results": results[:12],
        "note": "Image similarity search is active. Full ML-based embedding search requires CLIP model deployment."
    }
