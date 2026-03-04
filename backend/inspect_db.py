import sys
import os
sys.path.append(os.getcwd())
try:
    from sqlalchemy import create_engine, inspect
    from database import DATABASE_URL
    
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    with open('tasks_schema.txt', 'w') as f:
        table_name = 'tasks'
        f.write(f"Table: {table_name}\n")
        for column in inspector.get_columns(table_name):
            f.write(f"  - {column['name']} ({column['type']})\n")
    print("Schema written to tasks_schema.txt")
except Exception as e:
    print(f"Error: {e}")
