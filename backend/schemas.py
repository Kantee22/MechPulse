"""Pydantic response models for the MechPulse API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthStatus(BaseModel):
    ok: bool
    db_connected: bool  # True if Node-RED HTTP API is reachable
    tables: dict[str, int]  # table name -> row count
    last_sensor_timestamp: datetime | None = None
    last_weather_timestamp: datetime | None = None
    using_snapshot: bool = False
    snapshot: dict[str, Any] = Field(default_factory=dict)
    api_base: str | None = None
    last_error: str | None = None


class SensorRow(BaseModel):
    id: int
    timestamp: datetime
    phase: str | None = None
    cycle: int | None = None
    vib_count: float | None = None
    knock_count: float | None = None
    sound_avg: float | None = None
    sound_var: float | None = None
    temperature: float | None = None
    health_score: float | None = None
    status: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class WeatherRow(BaseModel):
    id: int
    timestamp: datetime
    city: str | None = None
    temp_outside: float | None = None
    humidity: float | None = None
    pressure: float | None = None
    weather_desc: str | None = None
    wind_speed: float | None = None


class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float | None


class TimeSeries(BaseModel):
    source: str  # "sensor" or "weather"
    metric: str
    points: list[TimeSeriesPoint]


class CorrelationMatrix(BaseModel):
    method: str
    columns: list[str]
    matrix: list[list[float]]
    n_samples: int
    tolerance: str | None = None


class HealthScore(BaseModel):
    score: float
    grade: str
    components: dict[str, float]
    computed_at: datetime


class Anomaly(BaseModel):
    timestamp: datetime
    metric: str
    value: float
    z_score: float
    severity: str
    message: str


class DailySummary(BaseModel):
    day: str
    rows: int
    peak_vib: float | None
    peak_knock: float | None
    avg_sound_avg: float | None
    max_sound_var: float | None
    avg_temperature: float | None
    avg_health_score: float | None
    phases: dict[str, int]


class OverlayPoint(BaseModel):
    timestamp: datetime
    sensor_temperature: float | None = None
    sound_avg: float | None = None
    vib_count: float | None = None
    health_score: float | None = None
    ambient_temp_c: float | None = None
    ambient_humidity: float | None = None
