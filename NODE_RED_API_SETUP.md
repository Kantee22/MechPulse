# Node-RED HTTP API Setup

How to expose your MySQL tables (`sensor_data`, `weather_data`) as HTTP JSON
endpoints so the MechPulse backend can read them from anywhere — no VPN, no
direct MySQL connection needed.

## Why

Port 3306 (MySQL) on `iot.cpe.ku.ac.th` is blocked for off-campus IPs, but
HTTPS (443) is open. Node-RED runs on the same server as MySQL, so it can
query the database on `localhost` and hand the result out over HTTP to you.

```
your laptop  --HTTPS-->  Node-RED on KU server  --localhost MySQL-->  sensor_data
                                                                      weather_data
                             <--JSON--
```

## Endpoints we will create

| Method | URL path        | Returns                               |
|--------|-----------------|---------------------------------------|
| GET    | `/api/sensor`   | `{ "data": [ ...sensor_data rows... ] }`  |
| GET    | `/api/weather`  | `{ "data": [ ...weather_data rows... ] }` |

Both accept an optional `?limit=N` query parameter.

## Step 1 — Open Node-RED

Go to `https://iot.cpe.ku.ac.th/red/<your_student_id>` and log in with the
same credentials you use for phpMyAdmin.

## Step 2 — Add the sensor flow

Drag these 4 nodes onto the canvas and wire them **left to right**:

```
[ http in ]  ->  [ function ]  ->  [ MySQL ]  ->  [ http response ]
```

### Node config

**1. `http in` node**
- Method: `GET`
- URL: `/api/sensor`

**2. `function` node** (name it "build query"):

```javascript
// Read optional ?limit=N from the query string, default to 2000, cap at 20000.
const limit = Math.min(parseInt(msg.req.query.limit) || 2000, 20000);
const phase = msg.req.query.phase;

let sql = "SELECT * FROM `sensor_data`";
if (phase) {
    sql += ` WHERE phase = ${JSON.stringify(phase)}`;
}
sql += ` ORDER BY timestamp DESC LIMIT ${limit}`;

msg.topic = sql;
return msg;
```

**3. `MySQL` node**
- Connection: the same `b6710545440` config you already use for the INSERT flow.
- Leave the query field empty — it will use `msg.topic`.

**4. `http response` node**
- Status code: `200`
- Leave headers blank — Node-RED adds `content-type: application/json` automatically.

Before the response, add a small `function` node (or use a `change` node) to
wrap the result so the backend can unwrap it:

```javascript
msg.payload = { data: msg.payload };
return msg;
```

Final wiring:

```
http in  ->  build query  ->  MySQL  ->  wrap  ->  http response
```

## Step 3 — Add the weather flow

Identical to step 2 but:

- `http in` URL: `/api/weather`
- Query in the function:

```javascript
const limit = Math.min(parseInt(msg.req.query.limit) || 2000, 20000);
msg.topic = "SELECT * FROM `weather_data` ORDER BY timestamp DESC LIMIT " + limit;
return msg;
```

## Step 4 — Deploy

Click the red **Deploy** button (top right).

## Step 5 — Test from your browser

Open these URLs (replace the student ID with yours):

```
https://iot.cpe.ku.ac.th/red/b6710545440/api/sensor?limit=5
https://iot.cpe.ku.ac.th/red/b6710545440/api/weather?limit=5
```

You should see JSON:

```json
{
  "data": [
    { "id": 1215, "timestamp": "2026-04-11T04:00:00.000Z", "phase": "running", "vib_count": 3, ... },
    ...
  ]
}
```

If you get `404 Cannot GET /api/sensor`, the flow did not deploy — re-check
the URL and click Deploy.

If you get `Error: ER_ACCESS_DENIED` in the Node-RED debug pane, the MySQL
node's credentials are wrong (but this is different from the
off-campus-blocking issue — Node-RED connects to `localhost` so the credential
just needs to be your DB user/password).

## Step 6 — Point the MechPulse backend at it

In `backend/.env`, set:

```env
API_BASE=https://iot.cpe.ku.ac.th/red/b6710545440
API_SENSOR_PATH=/api/sensor
API_WEATHER_PATH=/api/weather
```

Restart `uvicorn main:app --reload`. The Navbar should flip to green
**"Live (Node-RED)"**.

## Troubleshooting

| Symptom                               | Cause / Fix                                       |
|---------------------------------------|---------------------------------------------------|
| `404 Cannot GET /api/sensor`          | Flow not deployed, or URL typo                    |
| `ER_NO_SUCH_TABLE: 'weather'`         | Table is `weather_data`, update SQL               |
| JSON is an array, not wrapped         | Skip the "wrap" node — backend handles both forms |
| `{"data": []}` with 0 rows            | Table actually empty, or wrong `ORDER BY` column  |
| CORS error in browser console         | Add `access-control-allow-origin: *` via a `change` node before `http response` |
| Slow requests                         | Lower the default `limit`, or add an index on `timestamp` |

## Security note

These endpoints are unauthenticated. Anyone who knows the URL can read your
data. That is fine for a class project where the data is sensor readings,
but never do this with private information. If you need auth, add a `function`
node that checks `msg.req.headers['x-api-key']` against a secret before
forwarding to MySQL.
