"""FastAPI entrypoint for MechPulse.

Run locally:
    uvicorn main:app --reload --port 8000

Data flows:
  MQTT sensors    ->  Node-RED  ->  MySQL sensor_data  --+
  WeatherAPI      ->  Node-RED  ->  MySQL weather_data  -+--> Node-RED HTTP API
                                                          |    /api/sensor
                                                          |    /api/weather
                                                          v
                                                    this FastAPI app

Why HTTP instead of direct MySQL? Port 3306 is blocked for off-campus IPs
at iot.cpe.ku.ac.th, but HTTPS/443 is open, and Node-RED can talk to MySQL
on localhost. So we proxy the reads through Node-RED.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Literal

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import analytics
import database
from schemas import (
    Anomaly,
    CorrelationMatrix,
    DailySummary,
    HealthScore,
    HealthStatus,
    OverlayPoint,
    SensorRow,
    TimeSeries,
    TimeSeriesPoint,
    WeatherRow,
)

load_dotenv()

app = FastAPI(
    title="MechPulse API",
    description=(
        "Predictive-maintenance API for the MechPulse multi-sensor machine "
        "health monitor. Primary: MQTTX -> Node-RED -> sensor_data. "
        "Secondary: WeatherAPI Bangkok -> Node-RED -> weather_data. Stored on "
        "iot.cpe.ku.ac.th/pma, served by FastAPI to a React dashboard."
    ),
    version="1.1.0",
)

cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SENSOR_TABLE = os.getenv("SENSOR_TABLE", "sensor_data")
WEATHER_TABLE = os.getenv("WEATHER_TABLE", "weather_data")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_sensor(limit: int | None = 5000, phase: str | None = None) -> pd.DataFrame:
    try:
        return database.fetch_sensor(limit=limit, phase=phase)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Sensor data unavailable: {e}")


def _load_weather(limit: int | None = 3000) -> pd.DataFrame:
    try:
        return database.fetch_weather(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Weather data unavailable: {e}")


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------

@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": "MechPulse API",
        "version": "1.1.0",
        "docs": "/docs",
        "healthcheck": "/api/health",
    }


@app.get("/api/health", response_model=HealthStatus, tags=["meta"])
def health() -> HealthStatus:
    ok_api = database.ping()
    tables = {SENSOR_TABLE: 0, WEATHER_TABLE: 0}
    last_sensor: datetime | None = None
    last_weather: datetime | None = None
    # fetch tiny slices to compute row count and latest timestamp
    for t, fetcher in ((SENSOR_TABLE, database.fetch_sensor),
                       (WEATHER_TABLE, database.fetch_weather)):
        try:
            df = fetcher(limit=5000)
            tables[t] = int(len(df))
            if "timestamp" in df.columns and not df.empty:
                ts = pd.to_datetime(df["timestamp"].max(), errors="coerce")
                ts = ts.to_pydatetime() if pd.notna(ts) else None
                if t == SENSOR_TABLE:
                    last_sensor = ts
                else:
                    last_weather = ts
        except Exception:
            pass
    return HealthStatus(
        ok=True,
        db_connected=ok_api,
        tables=tables,
        last_sensor_timestamp=last_sensor,
        last_weather_timestamp=last_weather,
        using_snapshot=database.using_snapshot(),
        snapshot=database.snapshot_info(),
        api_base=database.api_base(),
        last_error=database.last_error(),
    )


@app.get("/api/schema", tags=["meta"])
def schema() -> dict:
    out: dict = {}
    for t, fetcher in ((SENSOR_TABLE, database.fetch_sensor),
                       (WEATHER_TABLE, database.fetch_weather)):
        try:
            df = fetcher(limit=1)
            out[t] = list(df.columns)
        except Exception as e:
            out[t] = {"error": str(e)}
    return out


# ---------------------------------------------------------------------------
# Sensor data
# ---------------------------------------------------------------------------

@app.get("/api/sensors/latest", response_model=list[SensorRow], tags=["sensor"])
def sensor_latest(limit: int = Query(100, ge=1, le=5000)) -> list[SensorRow]:
    df = _load_sensor(limit=limit)
    if df.empty:
        return []
    known = {"id", "timestamp", "phase", "cycle", "vib_count", "knock_count",
             "sound_avg", "sound_var", "temperature", "health_score", "status"}
    rows: list[SensorRow] = []
    for _, r in df.tail(limit).iterrows():
        extra = {k: _jsonable(v) for k, v in r.items() if k not in known}
        rows.append(SensorRow(
            id=int(r.get("id") or 0),
            timestamp=r["timestamp"].to_pydatetime() if pd.notna(r.get("timestamp")) else datetime.utcnow(),
            phase=_str_or_none(r.get("phase")),
            cycle=_int_or_none(r.get("cycle")),
            vib_count=_float_or_none(r.get("vib_count")),
            knock_count=_float_or_none(r.get("knock_count")),
            sound_avg=_float_or_none(r.get("sound_avg")),
            sound_var=_float_or_none(r.get("sound_var")),
            temperature=_float_or_none(r.get("temperature")),
            health_score=_float_or_none(r.get("health_score")),
            status=_str_or_none(r.get("status")),
            extra=extra,
        ))
    return rows


SensorMetric = Literal[
    "vib_count", "knock_count", "sound_avg", "sound_var",
    "temperature", "health_score",
]

WeatherMetric = Literal["temp_outside", "humidity", "pressure", "wind_speed"]


@app.get("/api/sensors/timeseries", response_model=TimeSeries, tags=["sensor"])
def sensor_timeseries(
    metric: SensorMetric = "temperature",
    limit: int = Query(500, ge=10, le=10000),
    phase: str | None = None,
) -> TimeSeries:
    df = _load_sensor(limit=limit, phase=phase)
    if metric not in df.columns:
        raise HTTPException(status_code=404, detail=f"Column '{metric}' not in {SENSOR_TABLE}.")
    points = [
        TimeSeriesPoint(timestamp=r["timestamp"].to_pydatetime(),
                        value=_float_or_none(r[metric]))
        for _, r in df.iterrows() if pd.notna(r.get("timestamp"))
    ]
    return TimeSeries(source="sensor", metric=metric, points=points)


# ---------------------------------------------------------------------------
# Weather data (secondary source)
# ---------------------------------------------------------------------------

@app.get("/api/weather/latest", response_model=list[WeatherRow], tags=["weather"])
def weather_latest(limit: int = Query(100, ge=1, le=3000)) -> list[WeatherRow]:
    df = _load_weather(limit=limit)
    rows: list[WeatherRow] = []
    for _, r in df.tail(limit).iterrows():
        rows.append(WeatherRow(
            id=int(r.get("id") or 0),
            timestamp=r["timestamp"].to_pydatetime() if pd.notna(r.get("timestamp")) else datetime.utcnow(),
            city=_str_or_none(r.get("city")),
            temp_outside=_float_or_none(r.get("temp_outside")),
            humidity=_float_or_none(r.get("humidity")),
            pressure=_float_or_none(r.get("pressure")),
            weather_desc=_str_or_none(r.get("weather_desc")),
            wind_speed=_float_or_none(r.get("wind_speed")),
        ))
    return rows


@app.get("/api/weather/timeseries", response_model=TimeSeries, tags=["weather"])
def weather_timeseries(
    metric: WeatherMetric = "temp_outside",
    limit: int = Query(500, ge=10, le=5000),
) -> TimeSeries:
    df = _load_weather(limit=limit)
    if metric not in df.columns:
        raise HTTPException(status_code=404, detail=f"Column '{metric}' not in {WEATHER_TABLE}.")
    points = [
        TimeSeriesPoint(timestamp=r["timestamp"].to_pydatetime(),
                        value=_float_or_none(r[metric]))
        for _, r in df.iterrows() if pd.notna(r.get("timestamp"))
    ]
    return TimeSeries(source="weather", metric=metric, points=points)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@app.get("/api/analytics/stats", tags=["analytics"])
def stats(limit: int = Query(2000, ge=50, le=50000)) -> dict:
    df = _load_sensor(limit=limit)
    return analytics.basic_stats(df)


@app.get("/api/analytics/correlation", response_model=CorrelationMatrix, tags=["analytics"])
def correlation(
    method: Literal["pearson", "spearman", "kendall"] = "pearson",
    limit: int = Query(2000, ge=50, le=50000),
) -> CorrelationMatrix:
    df = _load_sensor(limit=limit)
    return CorrelationMatrix(**analytics.correlation_matrix(df, method=method))


@app.get("/api/analytics/weather-correlation", response_model=CorrelationMatrix, tags=["analytics"])
def weather_correlation(
    method: Literal["pearson", "spearman", "kendall"] = "pearson",
    limit: int = Query(3000, ge=50, le=50000),
    tolerance: str = "10min",
) -> CorrelationMatrix:
    """Cross-correlate sensor_data columns with weather columns.

    Sensor and weather rows are joined on nearest timestamp (within `tolerance`).
    Columns are renamed `sensor_*` / `weather_*` so heatmap axes stay readable.
    """
    sensor = _load_sensor(limit=limit)
    weather = _load_weather(limit=limit)
    return CorrelationMatrix(**analytics.cross_correlation(
        sensor, weather, method=method, tolerance=tolerance
    ))


@app.get("/api/analytics/overlay", response_model=list[OverlayPoint], tags=["analytics"])
def sensor_weather_overlay(
    limit: int = Query(500, ge=10, le=10000),
    tolerance: str = "10min",
) -> list[OverlayPoint]:
    """Aligned sensor + weather points, handy for overlay charts."""
    sensor = _load_sensor(limit=limit)
    weather = _load_weather(limit=limit)
    rows = analytics.sensor_weather_overlay(sensor, weather, tolerance=tolerance)
    return [OverlayPoint(**r) for r in rows]


@app.get("/api/analytics/health-score", response_model=HealthScore, tags=["analytics"])
def health_score_endpoint(window: int = Query(120, ge=10, le=5000)) -> HealthScore:
    df = _load_sensor(limit=max(window * 2, 500))
    return HealthScore(**analytics.health_score(df, window=window))


@app.get("/api/analytics/anomalies", response_model=list[Anomaly], tags=["analytics"])
def anomaly_list(
    z: float = Query(3.0, ge=1.5, le=10.0),
    limit: int = Query(50, ge=1, le=500),
) -> list[Anomaly]:
    df = _load_sensor(limit=5000)
    return [Anomaly(**a) for a in analytics.anomalies(df, z_threshold=z, limit=limit)]


@app.get("/api/analytics/daily-summary", response_model=list[DailySummary], tags=["analytics"])
def daily() -> list[DailySummary]:
    df = _load_sensor(limit=20000)
    return [DailySummary(**d) for d in analytics.daily_summary(df)]


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def _float_or_none(v) -> float | None:
    try:
        f = float(v)
        if pd.isna(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _int_or_none(v) -> int | None:
    f = _float_or_none(v)
    return int(f) if f is not None else None


def _str_or_none(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _jsonable(v):
    f = _float_or_none(v)
    if f is not None:
        return f
    if isinstance(v, (pd.Timestamp, datetime)):
        return v.isoformat()
    return _str_or_none(v)
