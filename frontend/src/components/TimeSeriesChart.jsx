import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "../api.js";

const SENSOR_OPTIONS = [
  { key: "temperature",  label: "Fan Temperature (KY-028)" },
  { key: "health_score", label: "Machine Health Score" },
  { key: "sound_avg",    label: "Sound Avg (KY-037)" },
  { key: "sound_var",    label: "Sound Variance (KY-037)" },
  { key: "vib_count",    label: "Vibration Count (KY-002)" },
  { key: "knock_count",  label: "Knock / Impact (KY-031)" },
];

const WEATHER_OPTIONS = [
  { key: "temp_outside", label: "Ambient Temperature (Bangkok)" },
  { key: "humidity",     label: "Ambient Humidity" },
  { key: "pressure",     label: "Atmospheric Pressure" },
  { key: "wind_speed",   label: "Wind Speed" },
];

export default function TimeSeriesChart({
  source = "sensor",       // "sensor" or "weather"
  defaultMetric = "temperature",
}) {
  const options = source === "weather" ? WEATHER_OPTIONS : SENSOR_OPTIONS;
  const [metric, setMetric] = useState(defaultMetric);
  const [limit, setLimit]   = useState(300);
  const [data, setData]     = useState([]);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const call = source === "weather"
      ? api.weatherTimeseries(metric, limit)
      : api.sensorTimeseries(metric, limit);
    call.then((r) => {
        if (!alive) return;
        setData(
          r.points.map((p) => ({
            t: new Date(p.timestamp).toLocaleTimeString(),
            v: p.value,
          }))
        );
        setError(null);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [metric, limit, source]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="card-title">
            {source === "weather" ? "Weather time series" : "Sensor time series"}
          </div>
          <div className="text-lg font-semibold">
            {options.find(m => m.key === metric)?.label}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1"
          >
            {options.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1"
          >
            {[100, 300, 600, 1200, 3000].map((n) => <option key={n} value={n}>Last {n}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="text-rose-600 text-sm">Failed to load: {error}</div>}
      {loading && <div className="text-slate-500 text-sm">Loading...</div>}

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="t" fontSize={11} interval="preserveStartEnd" />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="v"
              name={metric}
              stroke={source === "weather" ? "#0ea5e9" : "#1466e0"}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
