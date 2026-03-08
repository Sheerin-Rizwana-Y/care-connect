from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from typing import Optional

client: Optional[AsyncIOMotorClient] = None  # type: ignore
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=30000,
        maxPoolSize=10,
        retryWrites=True,
        tls=True,
    )
    db = client[settings.DB_NAME]
    # Verify the connection is alive before proceeding
    await client.admin.command("ping")
    print(f"Connected to MongoDB: {settings.DB_NAME}")
    await create_indexes()


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


async def get_db():
    return db


async def create_indexes():
    global db
    # Users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("register_number", unique=True, sparse=True)

    # Marketplace
    await db.marketplace_listings.create_index("status")
    await db.marketplace_listings.create_index("seller_id")
    await db.marketplace_listings.create_index("created_at")

    # Lost Items
    await db.lost_items.create_index("status")
    await db.lost_items.create_index("reported_by")
    await db.lost_items.create_index("created_at")

    # Found Items
    await db.found_items.create_index("status")
    await db.found_items.create_index("reported_by")
    await db.found_items.create_index("created_at")

    # Match Results
    await db.match_results.create_index([("lost_item_id", 1), ("found_item_id", 1)])
    await db.match_results.create_index("status")

    # Claims
    await db.claims.create_index("found_item_id")
    await db.claims.create_index("claimant_id")

    # Conversations & Messages
    await db.conversations.create_index("participants")
    await db.conversations.create_index("last_message_time")
    await db.messages.create_index("conversation_id")
    await db.messages.create_index([("receiver_id", 1), ("is_read", 1)])

    # Notifications
    await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
    await db.notifications.create_index("created_at")

    # Admin Logs
    await db.admin_logs.create_index("action")
    await db.admin_logs.create_index("timestamp")

    # QR Items
    await db.qr_items.create_index("owner_id")

    print("Database indexes created")
