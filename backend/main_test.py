import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


password = "Alice@123"
hashed_password = hash_password(password)

print("Hashed Password:", hashed_password)