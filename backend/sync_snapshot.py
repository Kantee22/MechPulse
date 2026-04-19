"""Cache sensor_data + weather_data into a local SQLite `snapshot.db`.

Two modes (tries in this order):

  1. HTTP API (Node-RED)  - works from anywhere the API is reachable.
  2. Direct MySQL         - works only when on KU network (or VPN).

The resulting `snapshot.db` is used by the backend when the live API goes
down, so you can still demo / develop offline.

Usage:
    cd C:\\Users\\user\\Downloads\\MechPulse\\backend
    python sync_snapshot.py
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

SNAPSHOT = Path(__file__).with_name("snapshot.db")

API_BASE         = os.getenv("API_BASE", "").rstrip("/")
API_SENSOR_PATH  = os.getenv("API_SENSOR_PATH",  "/api/sensor")
API_WEATHER_PATH = os.getenv("API_WEATHER_PATH", "/api/weather")
SENSOR_TABLE  = os.getenv("SENSOR_TABLE",  "sensor_data")
WEATHER_TABLE = os.getenv("WEATHER_TABLE", "weather_data")

# MySQL fallback
HOST = os.getenv("DB_HOST", "iot.cpe.ku.ac.th")
PORT = int(os.getenv("DB_PORT", "3306"))
USER = os.getenv("DB_USER", "")
PW   = os.getenv("DB_PASSWORD", "")
NAME = os.getenv("DB_NAME", "")


def _unwrap(payload):
    if isinstance(payload, dict):
        for k in ("data", "rows", "result"):
            if k in payload and isinstance(payload[k], list):
                return payload[k]
    return payload if isinstance(payload, list) else []


def pull_http() -> dict[str, pd.DataFrame] | None:
    if not API_BASE:
        return None
    print(f"[mode] HTTP API at {API_BASE}")
    try:
        sensor  = requests.get(f"{API_BASE}{API_SENSOR_PATH}",  timeout=30).json()
        weather = requests.get(f"{API_BASE}{API_WEATHER_PATH}", timeout=30).json()
        return {
            SENSOR_TABLE:  pd.DataFrame(_unwrap(sensor)),
            WEATHER_TABLE: pd.DataFrame(_unwrap(weather)),
        }
    except Exception as e:
        print(f"  HTTP pull failed: {e}")
        return None


def pull_mysql() -> dict[str, pd.DataFrame] | None:
    print(f"[mode] Direct MySQL at {USER}@{HOST}:{PORT}/{NAME}")
    try:
        import pymysql
        conn = pymysql.connect(host=HOST, port=PORT, user=USER, password=PW,
                               database=NAME, connect_timeout=10, charset="utf8mb4")
    except Exception as e:
        print(f"  MySQL connect failed: {e}")
        return None
    out = {}
    try:
        for t in (SENSOR_TABLE, WEATHER_TABLE):
            df = pd.read_sql(f"SELECT * FROM `{t}`", conn)
            out[t] = df
    except Exception as e:
        print(f"  MySQL read failed: {e}")
        out = None
    finally:
        conn.close()
    return out


def main() -> int:
    dfs = pull_http() or pull_mysql()
    if not dfs:
        print("\n[FAIL] No data source worked. "
              "Check API_BASE / DB credentials, or ensure you're on KU network.")
        return 1

    if SNAPSHOT.exists():
        SNAPSHOT.unlink()

    with sqlite3.connect(SNAPSHOT) as conn:
        for name, df in dfs.items():
            df.to_sql(name, conn, if_exists="replace", index=False)
            print(f"  [OK] {name}: {len(df):>6} rows -> snapshot.db")

    kb = SNAPSHOT.stat().st_size / 1024
    print(f"\nSnapshot saved: {SNAPSHOT}  ({kb:,.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
