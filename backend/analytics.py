"""Analytics helpers used by the MechPulse FastAPI endpoints.

Everything operates on a pandas DataFrame so we can swap the data source later
(live MySQL, CSV export, SQLite) without touching the business logic.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Iterable

import numpy as np
import pandas as pd

# Columns that we treat as numeric sensor channels (primary data source).
# Matches the actual MySQL schema: sensor_data(id, timestamp, phase, cycle,
# vib_count, knock_count, sound_avg, sound_var, temperature, health_score,
# status).
SENSOR_NUMERIC: list[str] = [
    "vib_count",
    "knock_count",
    "sound_avg",
    "sound_var",
    "temperature",
    "health_score",
]

# Numeric columns in the weather table (secondary data source from WeatherAPI).
# Actual schema: weather_data(id, timestamp, city, temp_outside, humidity, pressure, weather_desc, wind_speed).
WEATHER_NUMERIC: list[str] = [
    "temp_outside",
    "humidity",
    "pressure",
    "wind_speed",
]

# Backward-compatible alias used by older code paths.
NUMERIC_COLUMNS = SENSOR_NUMERIC


def _numeric_cols_present(df: pd.DataFrame, candidates: list[str] | None = None) -> list[str]:
    cols = candidates or SENSOR_NUMERIC
    return [c for c in cols if c in df.columns]


# ---------------------------------------------------------------------------
# Correlation
# ---------------------------------------------------------------------------

def correlation_matrix(
    df: pd.DataFrame,
    method: str = "pearson",
    candidates: list[str] | None = None,
) -> dict:
    """Compute a correlation matrix over the numeric sensor columns."""
    cols = _numeric_cols_present(df, candidates)
    if not cols:
        return {"method": method, "columns": [], "matrix": [], "n_samples": 0}

    numeric = df[cols].apply(pd.to_numeric, errors="coerce").dropna(how="all")
    # Drop columns that are constant - correlation is undefined (NaN).
    numeric = numeric.loc[:, numeric.nunique(dropna=True) > 1]

    if numeric.empty or numeric.shape[1] < 2:
        return {
            "method": method,
            "columns": list(numeric.columns),
            "matrix": [[1.0]] * len(numeric.columns),
            "n_samples": int(len(numeric)),
        }

    corr = numeric.corr(method=method).round(4).fillna(0.0)
    return {
        "method": method,
        "columns": list(corr.columns),
        "matrix": corr.values.tolist(),
        "n_samples": int(len(numeric)),
    }


def cross_correlation(
    sensor_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    method: str = "pearson",
    tolerance: str = "10min",
) -> dict:
    """Join sensor_data with weather on nearest timestamp and correlate.

    Columns are renamed to `sensor_*` / `weather_*` so they do not clash.
    """
    if sensor_df.empty or weather_df.empty:
        return {"method": method, "columns": [], "matrix": [], "n_samples": 0, "tolerance": tolerance}

    s = sensor_df.copy()
    w = weather_df.copy()
    s["timestamp"] = pd.to_datetime(s["timestamp"], errors="coerce")
    w["timestamp"] = pd.to_datetime(w["timestamp"], errors="coerce")
    s = s.dropna(subset=["timestamp"]).sort_values("timestamp")
    w = w.dropna(subset=["timestamp"]).sort_values("timestamp")

    # Rename numeric columns to avoid collisions (both tables have temp_c / humidity).
    s_cols = [c for c in SENSOR_NUMERIC if c in s.columns]
    w_cols = [c for c in WEATHER_NUMERIC if c in w.columns]
    s_renamed = s[["timestamp", *s_cols]].rename(columns={c: f"sensor_{c}" for c in s_cols})
    w_renamed = w[["timestamp", *w_cols]].rename(columns={c: f"weather_{c}" for c in w_cols})

    # merge_asof requires both sides sorted by the key.
    merged = pd.merge_asof(
        s_renamed.sort_values("timestamp"),
        w_renamed.sort_values("timestamp"),
        on="timestamp",
        direction="nearest",
        tolerance=pd.Timedelta(tolerance),
    ).dropna()

    if merged.empty:
        return {"method": method, "columns": [], "matrix": [], "n_samples": 0, "tolerance": tolerance}

    drop = ["timestamp"]
    numeric = merged.drop(columns=drop).apply(pd.to_numeric, errors="coerce")
    numeric = numeric.loc[:, numeric.nunique(dropna=True) > 1]
    if numeric.shape[1] < 2:
        return {
            "method": method,
            "columns": list(numeric.columns),
            "matrix": [[1.0]] * len(numeric.columns),
            "n_samples": int(len(numeric)),
            "tolerance": tolerance,
        }

    corr = numeric.corr(method=method).round(4).fillna(0.0)
    return {
        "method": method,
        "columns": list(corr.columns),
        "matrix": corr.values.tolist(),
        "n_samples": int(len(numeric)),
        "tolerance": tolerance,
    }


# ---------------------------------------------------------------------------
# Health score (0-100 composite index)
# ---------------------------------------------------------------------------

def _ref(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _penalty(value: float | None, baseline: float, tolerance: float) -> float:
    """Return a 0..1 penalty based on how far `value` drifts from baseline.

    0 = on target, 1 = fully degraded. Uses a smooth ramp over `tolerance`.
    """
    if value is None or np.isnan(value):
        return 0.0
    delta = abs(float(value) - baseline)
    if tolerance <= 0:
        return 1.0 if delta > 0 else 0.0
    return float(min(delta / tolerance, 1.0))


def health_score(df: pd.DataFrame, window: int = 120) -> dict:
    """Compute a composite 0-100 health score from the most recent rows.

    Uses vibration (KY-002), impacts (KY-031), sound (KY-037), and
    temperature (KY-028) to derive a weighted penalty.
    """
    if df.empty:
        return {
            "score": 100.0,
            "grade": "A",
            "components": {},
            "computed_at": datetime.utcnow(),
        }

    recent = df.tail(window)

    vib = pd.to_numeric(recent.get("vib_count"), errors="coerce").mean() if "vib_count" in recent else 0.0
    knock = pd.to_numeric(recent.get("knock_count"), errors="coerce").sum() if "knock_count" in recent else 0.0
    s_avg = pd.to_numeric(recent.get("sound_avg"), errors="coerce").mean() if "sound_avg" in recent else None
    s_var = pd.to_numeric(recent.get("sound_var"), errors="coerce").mean() if "sound_var" in recent else None
    temp = pd.to_numeric(recent.get("temperature"), errors="coerce").mean() if "temperature" in recent else None
    hscore = pd.to_numeric(recent.get("health_score"), errors="coerce").mean() if "health_score" in recent else None

    ref_vib = _ref("REF_VIB_COUNT", 5.0)
    ref_s_avg = _ref("REF_SOUND_AVG", 870.0)
    ref_s_var = _ref("REF_SOUND_VAR", 60.0)
    ref_temp = _ref("REF_TEMP_C", 45.0)

    p_vib = _penalty(vib, 0.0, ref_vib * 4)
    p_knock = min(float(knock) / max(window * 0.05, 1), 1.0)
    p_sound_avg = _penalty(s_avg, ref_s_avg, 40.0) if s_avg is not None else 0.0
    p_sound_var = _penalty(s_var, ref_s_var, 80.0) if s_var is not None else 0.0
    p_temp = _penalty(temp, ref_temp, 15.0) if temp is not None else 0.0

    # Optional: humidity is informational only, does not feed penalty directly,
    # but surfaced in `components` for the dashboard.
    weights = {
        "vibration": 0.30,
        "impact": 0.25,
        "sound_level": 0.15,
        "sound_variance": 0.15,
        "temperature": 0.15,
    }

    penalty = (
        weights["vibration"] * p_vib
        + weights["impact"] * p_knock
        + weights["sound_level"] * p_sound_avg
        + weights["sound_variance"] * p_sound_var
        + weights["temperature"] * p_temp
    )
    score = round(max(0.0, min(100.0, 100.0 * (1.0 - penalty))), 1)

    grade = (
        "A" if score >= 90 else
        "B" if score >= 75 else
        "C" if score >= 60 else
        "D" if score >= 40 else
        "F"
    )

    return {
        "score": score,
        "grade": grade,
        "components": {
            "vibration_penalty": round(p_vib, 3),
            "impact_penalty": round(p_knock, 3),
            "sound_level_penalty": round(p_sound_avg, 3),
            "sound_variance_penalty": round(p_sound_var, 3),
            "temperature_penalty": round(p_temp, 3),
            "health_score_avg": round(float(hscore), 2) if hscore is not None and not np.isnan(hscore) else 0.0,
            "window_rows": int(len(recent)),
        },
        "computed_at": datetime.utcnow(),
    }


# ---------------------------------------------------------------------------
# Anomaly detection (simple z-score vs baseline phase)
# ---------------------------------------------------------------------------

def anomalies(df: pd.DataFrame, z_threshold: float = 3.0, limit: int = 50) -> list[dict]:
    """Flag points whose z-score vs the 'baseline' phase exceeds `z_threshold`.

    Cross-validates across sensors: a point is only 'critical' if at least two
    metrics are anomalous at the same timestamp.
    """
    if df.empty or "timestamp" not in df.columns:
        return []

    work = df.copy()
    work["timestamp"] = pd.to_datetime(work["timestamp"], errors="coerce")
    work = work.dropna(subset=["timestamp"]).sort_values("timestamp")

    base = work[work.get("phase", "") == "baseline"] if "phase" in work else work.head(60)
    if base.empty:
        base = work.head(60)

    cols = [c for c in _numeric_cols_present(work) if c in base.columns]
    if not cols:
        return []

    stats: dict[str, tuple[float, float]] = {}
    for c in cols:
        s = pd.to_numeric(base[c], errors="coerce").dropna()
        if s.std() and not np.isnan(s.std()):
            stats[c] = (float(s.mean()), float(s.std()))

    flagged: list[dict] = []
    per_ts: dict[pd.Timestamp, int] = {}

    for _, row in work.tail(5000).iterrows():
        for c, (mu, sd) in stats.items():
            raw = row.get(c)
            try:
                v = float(raw)
            except (TypeError, ValueError):
                continue
            if sd <= 0:
                continue
            z = (v - mu) / sd
            if abs(z) >= z_threshold:
                per_ts[row["timestamp"]] = per_ts.get(row["timestamp"], 0) + 1
                severity = "warning" if abs(z) < z_threshold * 1.5 else "critical"
                flagged.append({
                    "timestamp": row["timestamp"],
                    "metric": c,
                    "value": v,
                    "z_score": round(z, 2),
                    "severity": severity,
                    "message": f"{c} deviated {z:+.1f}\u03c3 from baseline (\u03bc={mu:.2f}, \u03c3={sd:.2f})",
                })

    for item in flagged:
        if per_ts.get(item["timestamp"], 0) >= 2:
            item["severity"] = "critical"

    flagged.sort(key=lambda x: x["timestamp"], reverse=True)
    return flagged[:limit]


# ---------------------------------------------------------------------------
# Daily / phase summary
# ---------------------------------------------------------------------------

def daily_summary(df: pd.DataFrame) -> list[dict]:
    if df.empty or "timestamp" not in df.columns:
        return []

    work = df.copy()
    work["timestamp"] = pd.to_datetime(work["timestamp"], errors="coerce")
    work = work.dropna(subset=["timestamp"])
    work["day"] = work["timestamp"].dt.strftime("%Y-%m-%d")

    out: list[dict] = []
    for day, group in work.groupby("day"):
        phases = group["phase"].value_counts().to_dict() if "phase" in group else {}
        out.append({
            "day": day,
            "rows": int(len(group)),
            "peak_vib": _safe_max(group, "vib_count"),
            "peak_knock": _safe_max(group, "knock_count"),
            "avg_sound_avg": _safe_mean(group, "sound_avg"),
            "max_sound_var": _safe_max(group, "sound_var"),
            "avg_temperature": _safe_mean(group, "temperature"),
            "avg_health_score": _safe_mean(group, "health_score"),
            "phases": {str(k): int(v) for k, v in phases.items()},
        })
    out.sort(key=lambda x: x["day"])
    return out


def _safe_max(df: pd.DataFrame, col: str) -> float | None:
    if col not in df:
        return None
    s = pd.to_numeric(df[col], errors="coerce").dropna()
    return float(s.max()) if len(s) else None


def _safe_mean(df: pd.DataFrame, col: str) -> float | None:
    if col not in df:
        return None
    s = pd.to_numeric(df[col], errors="coerce").dropna()
    return round(float(s.mean()), 2) if len(s) else None


# ---------------------------------------------------------------------------
# Stats helpers
# ---------------------------------------------------------------------------

def basic_stats(df: pd.DataFrame, columns: Iterable[str] | None = None) -> dict:
    cols = list(columns) if columns else _numeric_cols_present(df)
    out: dict[str, dict[str, float]] = {}
    for c in cols:
        if c not in df:
            continue
        s = pd.to_numeric(df[c], errors="coerce").dropna()
        if s.empty:
            continue
        out[c] = {
            "count": int(s.count()),
            "mean": round(float(s.mean()), 3),
            "std": round(float(s.std()), 3),
            "min": float(s.min()),
            "p25": float(s.quantile(0.25)),
            "p50": float(s.quantile(0.50)),
            "p75": float(s.quantile(0.75)),
            "max": float(s.max()),
        }
    return out


# ---------------------------------------------------------------------------
# Sensor vs weather overlay (aligned time-series for charting)
# ---------------------------------------------------------------------------

def sensor_weather_overlay(
    sensor_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    tolerance: str = "10min",
) -> list[dict]:
    """Return rows aligned by nearest timestamp: sensor temperature +
    health_score + ambient temp + ambient humidity, one record per sensor row.
    """
    if sensor_df.empty or weather_df.empty:
        return []

    s = sensor_df.copy()
    w = weather_df.copy()
    s["timestamp"] = pd.to_datetime(s["timestamp"], errors="coerce")
    w["timestamp"] = pd.to_datetime(w["timestamp"], errors="coerce")
    s = s.dropna(subset=["timestamp"]).sort_values("timestamp")
    w = w.dropna(subset=["timestamp"]).sort_values("timestamp")

    s_cols = ["timestamp"] + [c for c in ("temperature", "health_score", "sound_avg", "vib_count") if c in s.columns]
    w_cols = ["timestamp"] + [c for c in ("temp_outside", "humidity") if c in w.columns]

    s = s[s_cols].rename(columns={
        "temperature": "sensor_temperature",
    })
    w = w[w_cols].rename(columns={
        "temp_outside": "ambient_temp_c",
        "humidity": "ambient_humidity",
    })

    merged = pd.merge_asof(
        s.sort_values("timestamp"),
        w.sort_values("timestamp"),
        on="timestamp",
        direction="nearest",
        tolerance=pd.Timedelta(tolerance),
    )

    out = []
    for _, r in merged.iterrows():
        rec = {"timestamp": r["timestamp"].isoformat()}
        for col in ("sensor_temperature", "health_score", "sound_avg", "vib_count",
                    "ambient_temp_c", "ambient_humidity"):
            if col in merged.columns:
                v = r[col]
                rec[col] = None if pd.isna(v) else float(v)
        out.append(rec)
    return out
