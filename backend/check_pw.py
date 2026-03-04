"""Check what password hash is stored for CFO001 and test against Perfmetric@123"""
import sys, os
sys.path.insert(0, os.getcwd())

from database import SessionLocal
import models
import bcrypt

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.id == "CFO001").first()
    print(f"User found: {user.id}")
    print(f"password_hash stored: {user.password_hash}")
    print()

    test_passwords = ["Perfmetric@123", "password123", "1234", "admin", "Admin@123"]
    for pw in test_passwords:
        try:
            match = bcrypt.checkpw(pw.encode(), user.password_hash.encode())
            print(f"  '{pw}' -> {'✅ MATCH' if match else '❌ no match'}")
        except Exception as e:
            print(f"  '{pw}' -> ERROR: {e}")
finally:
    db.close()
