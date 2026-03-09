# CARE Connect+ 
### Smart Campus Marketplace & AI Lost and Found Platform

A secure, full-featured internal campus platform for CARE College of Engineering students and staff.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6+ (running locally or via Docker)

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Architecture

```
care-connect/
├── backend/               # FastAPI Python Backend
│   ├── main.py            # App entry point
│   ├── database.py        # MongoDB connection
│   ├── config.py          # Settings & config
│   ├── models/            # Pydantic schemas
│   ├── routers/           # API route handlers
│   │   ├── auth.py        # Authentication
│   │   ├── marketplace.py # Marketplace CRUD
│   │   ├── lost_items.py  # Lost item reporting
│   │   ├── found_items.py # Found item reporting
│   │   ├── matching.py    # AI match results
│   │   ├── messaging.py   # In-app chat
│   │   ├── claims.py      # Ownership claims
│   │   ├── qr_codes.py    # QR generation
│   │   ├── admin.py       # Admin panel APIs
│   │   ├── notifications.py
│   │   └── image_search.py
│   ├── services/          # Business logic
│   │   ├── matching_service.py  # AI matching engine
│   │   └── notification_service.py
│   └── utils/
│       ├── auth_utils.py  # JWT, password hashing
│       ├── email_service.py
│       └── file_utils.py
│
└── frontend/              # React + Vite Frontend
    └── src/
        ├── pages/         # All page components
        │   ├── admin/     # Admin-only pages
        │   └── ...
        ├── components/    # Reusable components
        ├── services/      # API service layer
        └── context/       # React context (Auth)
```

---

## Features Implemented

### Authentication
- [x] College email domain validation
- [x] JWT secure sessions
- [x] Password hashing (bcrypt)
- [x] Role auto-detection (student/staff/admin)
- [x] Rate limiting support

### Campus Marketplace (Module 1)
- [x] Create listings with multi-image upload (max 5)
- [x] Admin approval workflow
- [x] Search + filter (category, price, condition, free)
- [x] Item lifecycle management (active → reserved → sold → expired)
- [x] Seller profile display
- [x] Report listings
- [x] View counter

### Lost Item Reporting (Module 2)
- [x] Full form with location, date/time, urgency flag
- [x] Image upload support
- [x] AI matching triggered automatically on submission
- [x] Status tracking (open → potential_match → claimed → closed)

### Found Item Reporting (Module 3)
- [x] Complete found item form
- [x] Auto-escalation date calculation
- [x] Escalate to security feature
- [x] Points awarded on reporting (5 pts)

### AI Matching Engine (Module 4)
- [x] Text similarity (TF-IDF + Jaccard + Overlap)
- [x] Location similarity (keyword matching)
- [x] Time proximity scoring
- [x] Category match bonus
- [x] Weighted scoring: Text(40%) + Image(30%) + Location(20%) + Time(10%)
- [x] Configurable threshold (default 0.5)
- [x] Automatic match notifications

### Image Search (Module 5)
- [x] Upload interface for visual search
- [x] Search across marketplace/lost/found
- [x] Result display with similarity scores
- [x] Full ML embeddings require CLIP/ResNet deployment (see note)

### Secure Messaging (Module 6)
- [x] One-to-one encrypted chat
- [x] Conversation list with unread count
- [x] Phone numbers never exposed
- [x] Report messages to admins
- [x] Real-time-like with polling

### Claim & Verification (Module 7)
- [x] Submit ownership claim with proof description
- [x] Finder reviews and approves/rejects claims
- [x] Points awarded on successful return (20 pts)
- [x] Staff/admin can also verify

### QR Code Protection (Module 8)
- [x] Register items and generate QR codes
- [x] QR contains encrypted owner reference
- [x] Public scan page (no login needed to scan)
- [x] Owner contact via platform only (hidden identity)
- [x] Download QR as PNG
- [x] Scan count tracking
- [x] Deactivate QR codes

### Admin Control Panel (Module 9)
- [x] Analytics dashboard with charts
- [x] Approve/reject marketplace listings
- [x] User management (suspend/activate/make admin)
- [x] Report management
- [x] Security escalation review
- [x] Complete audit logs

### Notification System (Module 10)
- [x] In-app notifications
- [x] Email notifications (OTP, match, listing status)
- [x] Unread count badges
- [x] Mark as read / mark all read
- [x] Notification types: match, message, listing, claim, expiry

### Data Management (Module 11)
- [x] MongoDB collections: users, marketplace_listings, lost_items, found_items, match_results, messages, conversations, claims, qr_items, notifications, reports, admin_logs
- [x] Timestamps on all documents
- [x] Full-text search indexes

### Security (Module 12)
- [x] Auth-gated all endpoints
- [x] Input validation via Pydantic
- [x] File type/size validation
- [x] Admin audit logs
- [x] Encrypted QR data
- [x] Role-based access control

---

##  What Requires Additional Infrastructure

| Feature | Status | What's Needed |
|---------|--------|---------------|
| ML Image Embeddings | API structure ready | Deploy CLIP/ResNet model + vector DB (Pinecone/Weaviate) |
| Real-time Chat | Polling-based | Add WebSocket support via FastAPI WebSockets |
| Push Notifications | Email only | Add FCM for mobile push |
| SMTP Emails | Configured | Set SMTP credentials in .env |
| Profile Picture Upload | UI ready | Add file upload endpoint for avatars |

---

## Configuration (.env)

```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=care_connect
SECRET_KEY=your-super-secret-key
COLLEGE_EMAIL_DOMAINS=["care.edu.in","carece.edu.in"]
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@care.edu.in
SMTP_PASSWORD=your-app-password
LISTING_EXPIRY_DAYS=30
FOUND_ITEM_ESCALATION_DAYS=14
MATCH_THRESHOLD=0.5
```

---

## Default Admin Setup

To create an admin user, register normally then run:
```python
# In MongoDB shell or Python:
db.users.update_one({"email": "admin@care.edu.in"}, {"$set": {"role": "admin"}})
```

---

##  API Documentation

After starting the backend, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB + Motor (async) |
| Auth | JWT + bcrypt |
| Charts | Recharts |
| Icons | Lucide React |
| Forms | React Hook Form |
| Routing | React Router v6 |

---

*Built for CARE College of Engineering*
