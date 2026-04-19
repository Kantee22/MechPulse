# MechPulse - Overall Architecture

This document is the textual companion to the in-app `/architecture` page.
It is also suitable as slide content for the presentation video (topic 2.2
and 2.3 of the DAQ 2025s submission brief).

## 1. Pipeline overview

```
+-----------+     +-------+     +-------+     +----------+     +--------+     +---------+     +----------+
|  Sensors  | --> |  MCU  | --> | MQTTX | --> | Node-RED | --> | MySQL  | --> | FastAPI | --> |  React   |
|  KY-00x   |     | ESP32 |     |broker |     |  flows   |     |  pma   |     |  API    |     |dashboard |
+-----------+     +-------+     +-------+     +----------+     +--------+     +---------+     +----------+
   physical         edge          pub/sub       parse &          storage        analytics        UI
    world          device                        insert
```

Every layer has a single, narrow responsibility so we can swap any component
(e.g. replace MQTTX with HiveMQ) without touching the rest of the stack.

## 2. Sensors (primary data source)

| Module  | Signal                      | Purpose                                                   |
| ------- | --------------------------- | --------------------------------------------------------- |
| KY-002  | Analog vibration amplitude  | Detects vibration intensity and frequency patterns        |
| KY-028  | Digital temperature         | Monitors surface temperature for overheating              |
| KY-037  | Analog sound level          | Captures abnormal sound (grinding, rattling)              |
| KY-031  | Digital tap / knock         | Detects sudden impacts or irregular mechanical shocks     |

The MCU reads each sensor on a fixed cadence (~5 s) and assembles a JSON
payload of the form:

```json
{
  "phase": "warmup",
  "cycle": 7,
  "vib_count": 0,
  "knock_count": 0,
  "sound_avg": 861,
  "sound_var": 92,
  "temperature_c": 34.2
}
```

`phase` is one of `baseline`, `warmup`, `running`, `cooldown` and is used by
the anomaly detector to establish a calibration window. `cycle` is a
monotonically increasing counter inside a phase.

## 3. Secondary data sources

- **Manufacturer specifications** - reference values for normal operating
  temperature, vibration range, and noise level. Surfaced via the `REF_*`
  environment variables and consumed by the health-score endpoint.
- **Historical baseline** - the first N rows of `phase = "baseline"` define
  the mean and standard deviation used by `/api/analytics/anomalies` to
  compute z-scores.

## 4. Transport

- **MQTTX** - used as the desktop MQTT client for publishing test messages and
  inspecting topics.
- The MCU publishes to `mechpulse/<machine_id>/reading`.
- **Node-RED** subscribes to that topic with an MQTT-in node, validates the
  payload with a function node, and inserts with a MySQL node. The workflow
  file is submitted under requirement 1.3 of the brief.

## 5. Storage - MySQL

Hosted by the course at <https://iot.cpe.ku.ac.th/pma/>.
Schema for `sensor_data`:

```sql
CREATE TABLE sensor_data (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    timestamp      DATETIME NOT NULL,
    phase          VARCHAR(20),
    cycle          INT,
    vib_count      INT,
    knock_count    INT,
    sound_avg      INT,
    sound_var      INT,
    -- upcoming columns:
    temperature_c  FLOAT NULL,
    fan_rpm        INT NULL,
    fan_health     FLOAT NULL
);
CREATE INDEX idx_sensor_ts ON sensor_data(timestamp);
```

The extra columns at the bottom are the ones the team will add for the fan
temperature and fan-health channels. `analytics.NUMERIC_COLUMNS` already
recognises them so the correlation matrix, stats, and health score light up
automatically once the columns exist.

## 6. FastAPI service

- Entrypoint: `backend/main.py` (see OpenAPI docs at `/docs`).
- Connection pool is created lazily in `backend/database.py`.
- All analytics logic lives in `backend/analytics.py`:
  - **correlation_matrix** - Pearson / Spearman / Kendall, ignores constant cols.
  - **health_score** - weighted penalty from vibration / impact / sound / temp.
  - **anomalies** - per-column z-score vs baseline, severity promoted when >=2
    sensors fire at the same timestamp (cross-validation).
  - **daily_summary** - peak vib, peak knock, avg sound, max variance, phase counts.

## 7. React dashboard

- Built with Vite, Tailwind, Recharts, and React Router.
- Communicates with FastAPI through the `src/api.js` fetch wrapper.
- Pages: Dashboard, Analytics (correlation heatmap + stats), Architecture
  (this diagram), Reports (daily + anomaly log).

## 8. Deployment notes

- Backend and frontend can be shipped independently. In production, set
  `VITE_API_BASE` at build time to point at the deployed FastAPI URL.
- Tag the GitHub repository as `v1.0` before submitting (requirement 1.3 of
  the brief).

## 9. Future work

- Switch the simple z-score detector for an STL-residual model once we have
  enough running-phase data.
- Serve the React build behind FastAPI with `StaticFiles` so the whole thing
  ships as one container.
- Add a websocket endpoint so the dashboard updates in real time instead of
  polling every 10 s.
