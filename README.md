# MechPulse - Multi-Sensor Machine Health Monitor

**Team 22 : GK Fastfood**
Kawin KAEWPARADAI, Kantee LAIBUDDEE
DAQ 2025s Project - Year-2 project submission (due April 21, 2026).

MechPulse monitors the health of rotating machinery (motors / fans) by combining
vibration, temperature, sound, and impact signals from four KY-series sensors.
Raw readings arrive over MQTT, are routed by Node-RED into a MySQL database
hosted at <https://iot.cpe.ku.ac.th/pma/>, and are exposed to a React
dashboard through a FastAPI service that computes machine-health scores,
anomaly alerts, correlation matrices, and daily summaries.

---

## Data flow

```
  KY-002 Vibration ┐
  KY-028 Temp      │
  KY-037 Sound     ├─► ESP32 ──► MQTTX (broker) ──► Node-RED ──► MySQL (sensor_data)
  KY-031 Knock     ┘                                                       │
                                                                           ▼
                                                          FastAPI  ◄──  SQL queries
                                                                           │
                                                                           ▼
                                                         React + Recharts dashboard
```

The React UI has four pages:

- **Dashboard** - live stats, health score, recent time-series and anomalies.
- **Analytics** - correlation heatmap (Pearson / Spearman / Kendall) and descriptive statistics.
- **Architecture** - interactive SVG diagram + narrative of each layer.
- **Reports** - daily summary table and anomaly log.

---

## Quick start

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # then edit credentials
uvicorn main:app --reload --port 8000
```

Check:

- `http://localhost:8000/docs` - OpenAPI docs.
- `http://localhost:8000/api/health` - returns `{ "db_connected": true, ... }` when the DB is reachable.

### 2. Frontend (React + Vite + Tailwind + Recharts)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the FastAPI server,
so no CORS config is needed in development.

---

## Environment variables (`backend/.env`)

| Var              | Example                   | Purpose                                      |
| ---------------- | ------------------------- | -------------------------------------------- |
| `DB_HOST`        | `iot.cpe.ku.ac.th`        | MySQL host exposed by the pma portal         |
| `DB_PORT`        | `3306`                    | MySQL port                                   |
| `DB_USER`        | `b6710545440`             | DB username                                  |
| `DB_PASSWORD`    | `changeme`                | DB password                                  |
| `DB_NAME`        | `b6710545440`             | Schema name                                  |
| `SENSOR_TABLE`   | `sensor_data`             | Table name Node-RED writes into              |
| `CORS_ORIGINS`   | `http://localhost:5173`   | Comma list of allowed origins                |
| `REF_TEMP_C`     | `45`                      | Reference running temperature (spec)         |
| `REF_VIB_COUNT`  | `5`                       | Reference vibration count                    |
| `REF_SOUND_AVG`  | `870`                     | Reference average sound reading              |
| `REF_SOUND_VAR`  | `60`                      | Reference sound variance                     |

Reference values are used by the health-score and anomaly-detection endpoints.

---

## API endpoints

| Method | Path                               | Description                                           |
| ------ | ---------------------------------- | ----------------------------------------------------- |
| GET    | `/api/health`                      | Liveness + DB connection + row count                  |
| GET    | `/api/schema`                      | Columns currently in the `sensor_data` table          |
| GET    | `/api/sensors/latest`              | Most recent N rows                                    |
| GET    | `/api/sensors/timeseries`          | Single-metric time-series (with optional phase filter)|
| POST   | `/api/sensors/ingest`              | Insert a new row (for MQTT-HTTP bridges or tests)     |
| GET    | `/api/analytics/stats`             | count / mean / std / quantiles per numeric column     |
| GET    | `/api/analytics/correlation`       | Pearson / Spearman / Kendall correlation matrix       |
| GET    | `/api/analytics/health-score`      | Composite 0-100 machine health score + components     |
| GET    | `/api/analytics/anomalies`         | Cross-sensor z-score anomalies (info/warning/critical)|
| GET    | `/api/analytics/daily-summary`     | Per-day peak vibration, avg sound, impact count, etc. |

---

## Project layout

```
mechpulse/
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── database.py          # MySQL connection pool (SQLAlchemy + PyMySQL)
│   ├── analytics.py         # correlation, health score, anomaly, daily summary
│   ├── schemas.py           # Pydantic response models
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── vite.config.js       # proxies /api -> :8000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js           # fetch helper
│       ├── index.css        # Tailwind entrypoint
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── StatCard.jsx
│       │   ├── TimeSeriesChart.jsx
│       │   ├── CorrelationHeatmap.jsx
│       │   ├── HealthScoreCard.jsx
│       │   ├── AnomalyAlerts.jsx
│       │   ├── DailySummary.jsx
│       │   └── ArchitectureDiagram.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Analytics.jsx
│           ├── Architecture.jsx
│           └── Reports.jsx
├── ARCHITECTURE.md
└── README.md
```

---

## Extending the schema

When you add more columns to `sensor_data` (e.g. `temperature_c`, `fan_rpm`,
`fan_health`), they will be picked up automatically:

- `analytics.NUMERIC_COLUMNS` already lists them, so correlation / stats /
  health-score update themselves.
- Add the new column name to the `metric` enum in `main.timeseries(...)` and to
  `METRIC_OPTIONS` in `frontend/src/components/TimeSeriesChart.jsx` so users can
  select it from the chart dropdown.

---

## Submission checklist (DAQ 2025s)

- [x] Primary data source - documented in `/architecture` page + ARCHITECTURE.md
- [x] Secondary data source - manufacturer spec + baseline-phase data
- [x] Data sharing API - FastAPI with OpenAPI docs at `/docs`
- [x] Data visualization - React dashboard (time-series, correlation heatmap, health score)
- [x] DB hosted at `iot.cpe.ku.ac.th/pma` (via env vars)
- [ ] Tag source as **Version 1.0** on GitHub once committed
- [ ] Submit to the Project Archive entry on ecourse.cpe.ku.ac.th
