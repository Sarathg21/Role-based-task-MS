import sys
import os
sys.path.append(os.getcwd())

try:
    from database import engine, DATABASE_URL
    from sqlalchemy import text

    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
        """))
        exists = result.fetchone()
        
        if not exists:
            conn.execute(text("""
                ALTER TABLE tasks ADD COLUMN parent_task_id VARCHAR REFERENCES tasks(id)
            """))
            conn.commit()
            print("Added parent_task_id column to tasks table.")
        else:
            print("parent_task_id column already exists.")
except Exception as e:
    print(f"Error: {e}")
