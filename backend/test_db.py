"""Quick DB connection test - prints exact error if any.

Run:
    cd C:\\Users\\user\\Downloads\\MechPulse\\backend
    python test_db.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("DB_HOST", "iot.cpe.ku.ac.th")
port = int(os.getenv("DB_PORT", "3306"))
user = os.getenv("DB_USER", "")
pw   = os.getenv("DB_PASSWORD", "")
name = os.getenv("DB_NAME", "")
sensor_table  = os.getenv("SENSOR_TABLE", "sensor_data")
weather_table = os.getenv("WEATHER_TABLE", "weather_data")

print(f"Host   : {host}:{port}")
print(f"User   : {user!r}")
print(f"DB     : {name!r}")
print(f"Pw set : {bool(pw)} (length {len(pw)})")
print(f"Tables : {sensor_table}, {weather_table}")
print("-" * 50)

try:
    import pymysql
except ImportError:
    print("pymysql not installed. pip install pymysql --break-system-packages")
    sys.exit(1)

try:
    conn = pymysql.connect(
        host=host, port=port, user=user, password=pw,
        database=name, connect_timeout=8, charset="utf8mb4",
    )
except Exception as e:
    print(f"CONNECTION FAILED:\n  {type(e).__name__}: {e}")
    sys.exit(2)

print("CONNECTED OK!\n")

with conn.cursor() as cur:
    for t in (sensor_table, weather_table):
        try:
            cur.execute(f"SELECT COUNT(*) FROM `{t}`")
            n = cur.fetchone()[0]
            print(f"  `{t}`  : {n} rows")
        except Exception as e:
            print(f"  `{t}`  : ERROR - {e}")

    # List all tables in the DB so we can see actual names
    cur.execute("SHOW TABLES")
    tables = [row[0] for row in cur.fetchall()]
    print(f"\nAll tables in `{name}`: {tables}")

conn.close()
