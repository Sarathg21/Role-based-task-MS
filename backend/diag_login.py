"""Diagnose the 500 by calling the route logic directly."""
import sys, os
sys.path.insert(0, os.getcwd())

# Load dotenv-like setup
from database import SessionLocal
import models
import bcrypt

db = SessionLocal()

try:
    emp_id = "CFO001"
    password = "Perfmetric@123"

    user = db.query(models.User).filter(models.User.id.ilike(emp_id.strip())).first()
    if not user:
        print("ERROR: User not found in DB")
        sys.exit(1)

    print(f"Found user: {user.id} | role={user.role} | active={user.active}")
    print(f"Password hash stored: {user.password[:30]}...")

    # Check if bcrypt can verify it
    match = bcrypt.checkpw(password.encode(), user.password.encode())
    print(f"Password match: {match}")

    if match:
        # Try creating the JWT
        from auth import create_access_token
        token = create_access_token({"sub": user.id})
        parts = token.split(".")
        print(f"Token generated OK, parts={len(parts)}, preview={token[:60]}...")
    else:
        print("Password mismatch – the stored hash doesn't match Perfmetric@123")

finally:
    db.close()
