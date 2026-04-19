"""Data layer for the MechPulse FastAPI backend.

The primary data source is an **HTTP API exposed by Node-RED** running on
`iot.cpe.ku.ac.th`. Why: port 3306 (MySQL) is blocked for off-campus IPs,
but HTTPS (443) is wide open, and Node-RED runs on the same host as MySQL
so it has local access.

Node-RED exposes two endpoints:
  GET  {API_BASE}/api/sensor     -> JSON {"data": [ ...sensor_data rows... ]}
  GET  {API_BASE}/api/weather    -> JSON {"data": [ ...weather_data rows... ]}

If Node-RED is unreachable, we silently fall back to a local SQLite
snapshot (`snapshot.db`) created by `sync_snapshot.py`.
"""

from __future__ import annotations

import os
import sqlite3
import threading
import time
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

SNAPSHOT_PATH = Path(__file__).with_name("snapshot.db")

API_BASE          = os.getenv("API_BASE", "https://iot.cpe.ku.ac.th/red/b6710545440").rstrip("/")
API_SENSOR_PATH   = os.getenv("API_SENSOR_PATH",  "/api/sensor")
API_WEATHER_PATH  = os.getenv("API_WEATHER_PATH", "/api/weather")
API_TIMEOUT       = float(os.getenv("API_TIMEOUT", "20"))
API_RETRIES       = int(os.getenv("API_RETRIES", "3"))
API_CACHE_TTL     = float(os.getenv("API_CACHE_TTL", "8"))   # seconds
API_VERIFY_SSL    = os.getenv("API_VERIFY_SSL", "true").lower() not in ("false", "0", "no")
SENSOR_TABLE      = os.getenv("SENSOR_TABLE",  "sensor_data")
WEATHER_TABLE     = os.getenv("WEATHER_TABLE", "weather_data")

if not API_VERIFY_SSL:
    # KU internal certs sometimes aren't in Python's trust store.
    # Suppress the noisy InsecureRequestWarning when user opts out.
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_live_ok: bool | None = None          # last API probe result
_last_error: str | None = None         # last error for /api/health

# Tiny in-memory cache keyed by (path, frozenset(params.items())).
# Node-RED's MySQL node serialises queries, so hammering it from the dashboard
# (5-6 widgets loading at once) can time some requests out. Cache de-duplicates
# calls within API_CACHE_TTL seconds.
_cache: dict[tuple, tuple[float, list[dict]]] = {}
_cache_lock = threading.Lock()
_session = requests.Session()          # reuse TCP / TLS connection


def _api_url(path: str) -> str:
    return f"{API_BASE}{path}"


def _unwrap(payload) -> list[dict]:
    """Node-RED can return either `{data: [...]}` or a bare `[...]`."""
    if isinstance(payload, dict):
        for k in ("data", "rows", "result"):
            if k in payload and isinstance(payload[k], list):
                return payload[k]
        return []
    if isinstance(payload, list):
        return payload
    return []


def _cache_key(path: str, params: dict) -> tuple:
    return (path, tuple(sorted((k, v) for k, v in params.items())))


def _fetch_json(path: str, params: dict | None = None) -> list[dict]:
    """GET JSON from Node-RED with retry + short in-memory cache."""
    global _live_ok, _last_error
    params = params or {}
    key = _cache_key(path, params)
    now = time.monotonic()

    # Serve from cache if fresh.
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < API_CACHE_TTL:
            _live_ok = True
            _last_error = None
            return hit[1]

    last_exc: Exception | None = None
    for attempt in range(API_RETRIES):
        try:
            r = _session.get(
                _api_url(path),
                params=params,
                timeout=API_TIMEOUT,
                verify=API_VERIFY_SSL,
            )
            r.raise_for_status()
            rows = _unwrap(r.json())
            with _cache_lock:
                _cache[key] = (now, rows)
            _live_ok = True
            _last_error = None
            return rows
        except Exception as e:
            last_exc = e
            # Exponential backoff: 0.4s, 0.8s, 1.6s...
            if attempt < API_RETRIES - 1:
                time.sleep(0.4 * (2 ** attempt))

    _live_ok = False
    _last_error = f"{type(last_exc).__name__}: {last_exc}"
    raise last_exc if last_exc else RuntimeError("unknown fetch error")


def _snapshot_df(table: str) -> pd.DataFrame:
    if not SNAPSHOT_PATH.exists():
        raise RuntimeError(
            "Node-RED API unreachable and no snapshot.db. "
            "Either check your Node-RED endpoints or run `python sync_snapshot.py` "
            "while on campus to cache data locally."
        )
    with sqlite3.connect(SNAPSHOT_PATH) as c:
        try:
            return pd.read_sql_query(f'SELECT * FROM "{table}"', c)
        except Exception as e:
            raise RuntimeError(f"snapshot missing table `{table}`: {e}") from e


def fetch_sensor(limit: int | None = None, phase: str | None = None) -> pd.DataFrame:
    """Return sensor_data as a DataFrame. Tries Node-RED API, falls back to snapshot."""
    params: dict = {}
    if limit:
        params["limit"] = int(limit)
    if phase:
        params["phase"] = phase
    try:
        rows = _fetch_json(API_SENSOR_PATH, params)
        df = pd.DataFrame(rows)
    except Exception:
        df = _snapshot_df(SENSOR_TABLE)
        if phase and "phase" in df.columns:
            df = df[df["phase"] == phase]
        if limit:
            df = df.tail(int(limit))
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"]).sort_values("timestamp")
    return df


def fetch_weather(limit: int | None = None) -> pd.DataFrame:
    """Return weather_data as a DataFrame. Tries Node-RED API, falls back to snapshot."""
    params: dict = {"limit": int(limit)} if limit else {}
    try:
        rows = _fetch_json(API_WEATHER_PATH, params)
        df = pd.DataFrame(rows)
    except Exception:
        df = _snapshot_df(WEATHER_TABLE)
        if limit:
            df = df.tail(int(limit))
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"]).sort_values("timestamp")
    return df


def ping() -> bool:
    """True if the Node-RED API is reachable."""
    global _live_ok, _last_error
    try:
        r = _session.get(
            _api_url(API_SENSOR_PATH),
            params={"limit": 1},
            timeout=API_TIMEOUT,
            verify=API_VERIFY_SSL,
        )
        r.raise_for_status()
        _live_ok = True
        _last_error = None
        return True
    except Exception as e:
        _live_ok = False
        _last_error = f"{type(e).__name__}: {e}"
        return False


def using_snapshot() -> bool:
    return _live_ok is False and SNAPSHOT_PATH.exists()


def snapshot_info() -> dict:
    if not SNAPSHOT_PATH.exists():
        return {"exists": False}
    import datetime as _dt
    st = SNAPSHOT_PATH.stat()
    return {
        "exists": True,
        "path": str(SNAPSHOT_PATH),
        "size_kb": round(st.st_size / 1024, 1),
        "modified": _dt.datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
    }


def last_error() -> str | None:
    return _last_error


def api_base() -> str:
    return API_BASE


def table_name() -> str:
    return SENSOR_TABLE
