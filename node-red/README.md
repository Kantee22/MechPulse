# Node-RED flow

This folder contains the Node-RED flow that powers MechPulse's data pipeline.

## What's inside

`flow.json` has four sub-flows, all on a single tab named **MechPulse**:

1. **Sensor ingest** - `MQTT Subscribe` (topic `b6710545440/mechpulse/data`)
   -> `Build SQL` function (derives `temperature`, `health_score`, `status`)
   -> `MySQL` insert into `sensor_data`.
2. **Weather poll** - `inject` (every 10 min) -> `http request` to WeatherAPI
   -> `Parse Weather` function -> `MySQL` insert into `weather_data`.
3. **HTTP `/api/sensor`** - `http in` -> SQL builder -> `MySQL` -> `http response`.
   Accepts `?limit=` (default 2000, max 20000) and `?phase=` query params.
4. **HTTP `/api/weather`** - `http in` -> SQL builder -> `MySQL` -> `http response`.
   Accepts `?limit=` (default 2000, max 20000).

The two HTTP endpoints are what the FastAPI backend reads from; port 3306 on
the KU server is firewalled, but 443 (the Node-RED HTTPS proxy) is open.

## Import

1. Open Node-RED: `https://iot.cpe.ku.ac.th/red/<your-student-id>/`.
2. Top-right menu -> **Import** -> paste the contents of `flow.json` (or upload).
3. Before deploying, open the two **MySQL config nodes** and set your DB
   password. The two configs (`c51d90895c612884` and `mysql_config`) both point
   at `iot.cpe.ku.ac.th:3306` / db `b6710545440`. Use your own student ID +
   password if you are re-running this on a different account.
4. Open the **MQTT broker config** (`e05d636e71e17888`) if you want to change
   the broker; default is `iot.cpe.ku.ac.th:1883`, anonymous.
5. Open **WeatherAPI Bangkok** (the `http request` node) and replace
   `YOUR_WEATHERAPI_KEY` in the URL with a real key from
   <https://www.weatherapi.com/>. Without a key the weather flow will log an
   error but sensor ingest will still work.
6. Click **Deploy**.

## Verify

After deploying, the two HTTP endpoints should respond:

```
curl "https://iot.cpe.ku.ac.th/red/b6710545440/api/sensor?limit=1"
curl "https://iot.cpe.ku.ac.th/red/b6710545440/api/weather?limit=1"
```

Both should return `{"data": [ ... ]}` with a timestamp and the usual sensor /
weather columns. If you get HTML instead of JSON, the flow was not deployed.

## MySQL schema (for reference)

```sql
CREATE TABLE sensor_data (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
  phase         VARCHAR(16),
  cycle         INT,
  vib_count     INT,
  knock_count   INT,
  sound_avg     FLOAT,
  sound_var     FLOAT,
  temperature   FLOAT,
  health_score  INT,
  status        VARCHAR(16)
);

CREATE TABLE weather_data (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP,
  city         VARCHAR(64),
  temp_outside FLOAT,
  humidity     FLOAT,
  pressure     INT,
  weather_desc VARCHAR(64),
  wind_speed   FLOAT
);
```

## Security note

The `flow.json` shipped in this repo has the WeatherAPI key redacted to the
placeholder `YOUR_WEATHERAPI_KEY`. Do not commit a version with a real key -
the file ends up in the git history even if you remove it later. Treat the
MySQL password in the config nodes the same way (Node-RED stores it encrypted
in `flows_cred.json`, which is `.gitignore`d).
