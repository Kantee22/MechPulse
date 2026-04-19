"""Quick diagnostic: why can't Python talk to Node-RED API?

Run:
    cd C:\\Users\\user\\Downloads\\MechPulse\\backend
    .venv\\Scripts\\activate
    python test_api.py
"""
from __future__ import annotations

import os
import sys
import traceback

from dotenv import load_dotenv

load_dotenv()

API_BASE         = os.getenv("API_BASE", "").rstrip("/")
API_SENSOR_PATH  = os.getenv("API_SENSOR_PATH",  "/api/sensor")
API_WEATHER_PATH = os.getenv("API_WEATHER_PATH", "/api/weather")

print("=" * 60)
print("  MechPulse Node-RED API diagnostic")
print("=" * 60)
print(f"Python:    {sys.version.split()[0]}")
print(f"API_BASE:  {API_BASE or '(missing!)'}")
print(f"Sensor:    {API_BASE}{API_SENSOR_PATH}?limit=1")
print(f"Weather:   {API_BASE}{API_WEATHER_PATH}?limit=1")
print()

# -- Step 1: can we even import requests? --
try:
    import requests
    print(f"[OK]  requests {requests.__version__} imported")
except ImportError:
    print("[FAIL] `requests` not installed in this venv.")
    print("       Run: pip install -r requirements.txt")
    sys.exit(1)

# -- Step 2: try with normal SSL verification --
def try_get(url: str, *, verify: bool) -> bool:
    try:
        r = requests.get(url, timeout=15, verify=verify)
        print(f"[OK]  HTTP {r.status_code}  verify={verify}  len={len(r.text)} bytes")
        if r.status_code == 200:
            preview = r.text[:200].replace("\n", " ")
            print(f"      preview: {preview}...")
        return True
    except requests.exceptions.SSLError as e:
        print(f"[SSL] verify={verify} -> {type(e).__name__}: {e}")
        return False
    except Exception as e:
        print(f"[ERR] verify={verify} -> {type(e).__name__}: {e}")
        return False


print()
print("-- Sensor endpoint --")
url = f"{API_BASE}{API_SENSOR_PATH}?limit=1"
ok_ssl  = try_get(url, verify=True)
if not ok_ssl:
    print()
    print(">> SSL verification failed. Re-trying without verification")
    print("   (this confirms cert issue, not network issue)")
    try_get(url, verify=False)

print()
print("-- Weather endpoint --")
url = f"{API_BASE}{API_WEATHER_PATH}?limit=1"
try_get(url, verify=True)

print()
print("=" * 60)
print("If [SSL] errors appeared: the KU cert chain isn't in Python's")
print("trust store. Quick fix options:")
print("  1. pip install certifi --upgrade")
print("  2. Set API_VERIFY_SSL=false in .env (insecure, dev only)")
print("If [ERR] 'NameResolutionError': DNS / network problem")
print("If [ERR] 'ConnectionError': firewall or VPN interference")
print("If [OK] 200: API works -> bug is somewhere else, run uvicorn again")
print("=" * 60)
