import { useEffect, useState } from "react";
import { api } from "../api.js";

function severityBadge(s) {
  return {
    info:     "bg-slate-100 text-slate-700",
    warning:  "bg-amber-100 text-amber-800",
    critical: "bg-rose-100 text-rose-800",
  }[s] || "bg-slate-100 text-slate-700";
}

export default function AnomalyAlerts() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [z, setZ] = useState(3.0);

  useEffect(() => {
    let alive = true;
    api.anomalies(z, 25)
      .then((r) => alive && (setItems(r), setError(null)))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [z]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="card-title">Anomaly alerts</div>
          <div className="text-lg font-semibold">Cross-sensor deviation</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500">z &ge;</label>
          <select
            value={z}
            onChange={(e) => setZ(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1"
          >
            {[2.0, 2.5, 3.0, 4.0].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="text-rose-600 text-sm">{error}</div>}

      {items.length === 0 && !error && (
        <div className="text-slate-500 text-sm">No anomalies detected above the selected threshold.</div>
      )}

      <ul className="divide-y divide-slate-100">
        {items.map((a, i) => (
          <li key={i} className="py-2 flex items-center gap-3">
            <span className={`badge ${severityBadge(a.severity)}`}>{a.severity}</span>
            <div className="text-sm flex-1">
              <div className="font-medium">{a.metric}</div>
              <div className="text-xs text-slate-500">{a.message}</div>
            </div>
            <div className="text-xs text-slate-400 font-mono whitespace-nowrap">
              {new Date(a.timestamp).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
