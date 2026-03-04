import psycopg2

try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        dbname='postgres',
        user='postgres',
        password='1234',
        connect_timeout=5
    )
    cur = conn.cursor()
    cur.execute('SELECT version();')
    ver = cur.fetchone()[0]
    print('Connected OK:', ver[:80])

    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    tables = [r[0] for r in cur.fetchall()]
    print('Tables found:', tables if tables else '(none - database may need seeding)')
    conn.close()
except psycopg2.OperationalError as e:
    print('Connection FAILED:', e)
except Exception as e:
    print('ERROR:', e)
