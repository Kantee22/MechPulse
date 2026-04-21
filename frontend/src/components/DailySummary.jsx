import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function DailySummary() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api.dailySummary()
      .then((r) => alive && (setRows(r), setError(null)))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  return (
    <div className="card overflow-auto">
      <div className="card-title mb-2">Daily machine report</div>
      {error && <div className="text-rose-600 text-sm">{error}</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="table-head-row">
            <th className="py-2 pr-4">Day</th>
            <th className="py-2 pr-4">Rows</th>
            <th className="py-2 pr-4">Peak vib</th>
            <th className="py-2 pr-4">Peak knock</th>
            <th className="py-2 pr-4">Avg sound</th>
            <th className="py-2 pr-4">Max sound var</th>
            <th className="py-2 pr-4">Avg temp</th>
            <th className="py-2 pr-4">Avg health</th>
            <th className="py-2 pr-4">Phases</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.day}>
              <td className="py-2 pr-4 font-medium">{r.day}</td>
              <td className="py-2 pr-4">{r.rows.toLocaleString()}</td>
              <td className="py-2 pr-4">{fmt(r.peak_vib)}</td>
              <td className="py-2 pr-4">{fmt(r.peak_knock)}</td>
              <td className="py-2 pr-4">{fmt(r.avg_sound_avg)}</td>
              <td className="py-2 pr-4">{fmt(r.max_sound_var)}</td>
              <td className="py-2 pr-4">{fmt(r.avg_temperature)}</td>
              <td className="py-2 pr-4">{fmt(r.avg_health_score)}</td>
              <td className="py-2 pr-4 text-xs text-slate-500">
                {Object.entries(r.phases || {}).map(([k, v]) => `${k}:${v}`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && !error && <div className="text-slate-500 text-sm py-4">No data yet.</div>}
    </div>
  );
}

function fmt(v) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
}
