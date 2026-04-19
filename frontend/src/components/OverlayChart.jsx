import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "../api.js";

// Shows fan temp vs ambient temp on the same timeline.
export default function OverlayChart() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api.overlay(500, "10min")
      .then((r) => {
        if (!alive) return;
        setRows(r.map((p) => ({
          t: new Date(p.timestamp).toLocaleString(),
          fan: p.sensor_temperature,
          ambient: p.ambient_temp_c,
          ambientHumi: p.ambient_humidity,
        })));
        setError(null);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  return (
    <div className="card">
      <div className="card-title">Fan vs ambient environment</div>
      <div className="text-lg font-semibold">Temperature overlay (sensor_data + weather)</div>
      {error && <div className="text-rose-600 text-sm mt-2">Failed to load: {error}</div>}
      <div className="h-80 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="t" fontSize={10} interval="preserveStartEnd" />
            <YAxis fontSize={11} unit="°C" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="fan"     name="Fan temp (°C)"     stroke="#e11d48" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="ambient" name="Ambient temp (°C)" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Rows are aligned on nearest timestamp (tolerance: 10 min). Gaps mean no weather sample within window.
      </div>
    </div>
  );
}
