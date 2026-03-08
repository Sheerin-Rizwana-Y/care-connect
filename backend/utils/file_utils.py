import os
import uuid
import aiofiles
import logging
from fastapi import HTTPException, UploadFile
from config import settings
from typing import List
from PIL import Image
import io

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

async def save_upload_file(file: UploadFile, subfolder: str = "general") -> str:
    """Save uploaded file and return the URL path"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only image files are allowed (JPEG, PNG, WebP, GIF)")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file extension")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Validate it's actually an image using Pillow
    try:
        Image.open(io.BytesIO(content)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    upload_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, filename)

    async with aiofiles.open(file_path, "wb") as out_file:
        await out_file.write(content)

    logger.info(f"Saved file: {file_path}")
    return f"/uploads/{subfolder}/{filename}"

async def save_multiple_files(files: List[UploadFile], subfolder: str, max_files: int = 5) -> List[str]:
    """Save multiple files and return list of URLs"""
    if len(files) > max_files:
        raise HTTPException(status_code=400, detail=f"Maximum {max_files} files allowed")

    urls = []
    for file in files:
        if file.filename:
            url = await save_upload_file(file, subfolder)
            urls.append(url)

    return urls

def delete_file(file_url: str):
    """Delete a file from the uploads directory"""
    try:
        file_path = file_url.replace("/uploads/", settings.UPLOAD_DIR + "/")
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to delete file {file_url}: {str(e)}")