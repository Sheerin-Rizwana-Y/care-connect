from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    MONGODB_URL: str
    DB_NAME: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    COLLEGE_EMAIL_DOMAIN: str
    COLLEGE_EMAIL_DOMAINS: List[str] = ["care.ac.in"]

    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB

    LISTING_EXPIRY_DAYS: int = 30
    FOUND_ITEM_ESCALATION_DAYS: int = 14

    MATCH_THRESHOLD: float = 0.5
    TEXT_WEIGHT: float = 0.4
    IMAGE_WEIGHT: float = 0.3
    LOCATION_WEIGHT: float = 0.2
    TIME_WEIGHT: float = 0.1

    #OTP_EXPIRE_MINUTES: int = 10
    RATE_LIMIT_REQUESTS: int = 100
    #RATE_LIMIT_WINDOW: int = 60

    class Config:
        env_file = ".env"

settings = Settings()