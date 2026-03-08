from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
import os
import time

from routers import auth, marketplace, lost_items, found_items, matching, messaging, claims, qr_codes, admin, notifications, image_search
from database import connect_db, close_db, get_db
from services.scheduler import start_scheduler, stop_scheduler
from config import settings

app = FastAPI(
    title="CARE Connect+",
    description="Smart Campus Marketplace and AI Lost & Found Platform",
    version="1.0.0"
)

# CORS must be added BEFORE mounting static files so /uploads responses carry CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files — mounted after CORS middleware
_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(_upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_dir), name="uploads")

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.on_event("startup")
async def startup():
    await connect_db()
    start_scheduler(interval_hours=6)

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()
    await close_db()

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(lost_items.router, prefix="/api/lost-items", tags=["Lost Items"])
app.include_router(found_items.router, prefix="/api/found-items", tags=["Found Items"])
app.include_router(matching.router, prefix="/api/matching", tags=["AI Matching"])
app.include_router(messaging.router, prefix="/api/messages", tags=["Messaging"])
app.include_router(claims.router, prefix="/api/claims", tags=["Claims"])
app.include_router(qr_codes.router, prefix="/api/qr", tags=["QR Codes"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(image_search.router, prefix="/api/image-search", tags=["Image Search"])

@app.get("/")
async def root():
    return {"message": "CARE Connect+ API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/debug/collections")
async def debug_collections():
    """
    Diagnostic endpoint — shows raw collection names, document counts,
    and a sample of actual status values stored in lost_items & found_items.
    Remove this endpoint once the issue is resolved.
    """
    db = await get_db()

    # List all collection names in the DB
    collection_names = await db.list_collection_names()

    # Count docs in each expected collection (no filters at all)
    lost_count = await db.lost_items.count_documents({})
    found_count = await db.found_items.count_documents({})

    # Grab up to 5 raw docs from each — show only _id, status, reported_by, item_name
    raw_lost = []
    async for doc in db.lost_items.find({}).limit(5):
        raw_lost.append({
            "id": str(doc["_id"]),
            "item_name": doc.get("item_name"),
            "status": doc.get("status"),
            "reported_by": doc.get("reported_by"),
        })

    raw_found = []
    async for doc in db.found_items.find({}).limit(5):
        raw_found.append({
            "id": str(doc["_id"]),
            "item_name": doc.get("item_name"),
            "status": doc.get("status"),
            "reported_by": doc.get("reported_by"),
        })

    # Get distinct status values actually present
    lost_statuses = await db.lost_items.distinct("status")
    found_statuses = await db.found_items.distinct("status")

    return {
        "db_name": db.name,
        "all_collections_in_db": collection_names,
        "lost_items_total": lost_count,
        "found_items_total": found_count,
        "lost_items_distinct_statuses": lost_statuses,
        "found_items_distinct_statuses": found_statuses,
        "lost_items_sample": raw_lost,
        "found_items_sample": raw_found,
    }
