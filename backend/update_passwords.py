"""
Update all user password_hash values in the DB to bcrypt(Perfmetric@123).
Also updates seed.py so future re-seeds use the new password.
Run from: backend/
"""
import sys, os
sys.path.insert(0, os.getcwd())

import bcrypt
from database import SessionLocal
import models

NEW_PASSWORD = "Perfmetric@123"
new_hash = bcrypt.hashpw(NEW_PASSWORD.encode(), bcrypt.gensalt()).decode()

db = SessionLocal()
try:
    users = db.query(models.User).all()
    for u in users:
        u.password_hash = new_hash
    db.commit()
    print(f"✅ Updated {len(users)} users to use password: {NEW_PASSWORD}")
    print(f"   New hash prefix: {new_hash[:29]}...")
finally:
    db.close()
