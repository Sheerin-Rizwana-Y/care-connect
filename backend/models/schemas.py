from pydantic import BaseModel, EmailStr, Field, field_validator, GetCoreSchemaHandler
from pydantic_core import core_schema
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: GetCoreSchemaHandler):
        return core_schema.no_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

# Enums
class UserRole(str, Enum):
    student = "student"
    staff = "staff"
    admin = "admin"

class AccountStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    blocked = "blocked"

class ItemCondition(str, Enum):
    new = "New"
    like_new = "Like New"
    used = "Used"
    damaged = "Damaged but usable"

class ListingStatus(str, Enum):
    pending = "pending"
    active = "active"
    reserved = "reserved"
    sold = "sold"
    expired = "expired"
    rejected = "rejected"

class LostItemStatus(str, Enum):
    open = "open"
    potential_match = "potential_match"
    claimed = "claimed"
    closed = "closed"

class FoundItemStatus(str, Enum):
    unclaimed = "unclaimed"
    potential_match = "potential_match"
    claimed = "claimed"
    handed_to_security = "handed_to_security"

class ItemCategory(str, Enum):
    textbook = "Textbook"
    electronics = "Electronics"
    clothing = "Clothing"
    stationery = "Stationery"
    lab_equipment = "Lab Equipment"
    hostel_items = "Hostel Items"
    id_documents = "ID/Documents"
    accessories = "Accessories"
    sports = "Sports"
    other = "Other"

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    department: str
    year_of_study: Optional[str] = None
    staff_designation: Optional[str] = None
    register_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    department: str
    role: UserRole
    year_of_study: Optional[str]
    staff_designation: Optional[str]
    profile_picture: Optional[str]
    account_status: AccountStatus
    points: int = 0
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

# Marketplace Models
class ListingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    category: ItemCategory
    description: str = Field(..., min_length=10, max_length=2000)
    price: Optional[float] = None
    is_free: bool = False
    condition: ItemCondition
    pickup_location: Optional[str] = None

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[ItemCondition] = None
    pickup_location: Optional[str] = None

class ListingResponse(BaseModel):
    id: str
    title: str
    category: str
    description: str
    price: Optional[float]
    is_free: bool
    condition: str
    images: List[str]
    pickup_location: Optional[str]
    status: str
    seller_id: str
    seller_name: str
    created_at: datetime
    expires_at: datetime

# Lost Item Models
class LostItemCreate(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=100)
    category: ItemCategory
    description: str = Field(..., min_length=10, max_length=2000)
    last_seen_location: str
    date_lost: datetime
    time_lost: Optional[str] = None
    is_urgent: bool = False

class LostItemResponse(BaseModel):
    id: str
    item_name: str
    category: str
    description: str
    last_seen_location: str
    date_lost: datetime
    time_lost: Optional[str]
    is_urgent: bool
    images: List[str]
    status: str
    reported_by: str
    reporter_name: str
    created_at: datetime

# Found Item Models
class FoundItemCreate(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=100)
    category: ItemCategory
    description: str = Field(..., min_length=10, max_length=2000)
    found_location: str
    date_found: datetime

class FoundItemResponse(BaseModel):
    id: str
    item_name: str
    category: str
    description: str
    found_location: str
    date_found: datetime
    images: List[str]
    status: str
    reported_by: str
    reporter_name: str
    created_at: datetime

# Matching Models
class MatchResult(BaseModel):
    id: str
    lost_item_id: str
    found_item_id: str
    text_score: float
    image_score: float
    location_score: float
    time_score: float
    total_score: float
    status: str
    created_at: datetime

# Message Models
class MessageCreate(BaseModel):
    receiver_id: str
    content: str = Field(..., min_length=1, max_length=2000)
    related_item_id: Optional[str] = None
    related_item_type: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    receiver_id: str
    content: str
    is_read: bool
    created_at: datetime

class ConversationResponse(BaseModel):
    conversation_id: str
    other_user_id: str
    other_user_name: str
    other_user_picture: Optional[str]
    last_message: str
    last_message_time: datetime
    unread_count: int

# Claim Models
class ClaimCreate(BaseModel):
    found_item_id: str
    proof_description: str = Field(..., min_length=20)

class ClaimResponse(BaseModel):
    id: str
    found_item_id: str
    claimant_id: str
    claimant_name: str
    proof_description: str
    status: str
    created_at: datetime

# QR Code Models
class QRItemCreate(BaseModel):
    item_name: str
    description: str
    category: ItemCategory
    contact_preference: str = "platform"

class QRItemResponse(BaseModel):
    id: str
    item_name: str
    description: str
    category: str
    qr_code_url: str
    owner_id: str
    created_at: datetime

# Notification Models
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    related_id: Optional[str]
    is_read: bool
    created_at: datetime

# Admin Models
class AdminAction(BaseModel):
    action: str
    reason: Optional[str] = None

class AnalyticsResponse(BaseModel):
    total_users: int
    total_lost_items: int
    total_found_items: int
    total_marketplace_listings: int
    successful_recoveries: int
    recovery_rate: float
    top_categories: List[dict]
    hotspot_locations: List[dict]
    recent_activity: List[dict]

# Report Models
class ReportCreate(BaseModel):
    reported_user_id: Optional[str] = None
    reported_item_id: Optional[str] = None
    report_type: str
    reason: str = Field(..., min_length=10)

class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    reported_user_id: Optional[str]
    reported_item_id: Optional[str]
    report_type: str
    reason: str
    status: str
    created_at: datetime
