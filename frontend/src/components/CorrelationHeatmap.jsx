import { useEffect, useState } from "react";
import { api } from "../api.js";

// Map a correlation value (-1..1) to a diverging color.
function colorFor(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "#f1f5f9";
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    const a = Math.round(255 - t * 175);
    return `rgb(${a}, ${a + 20}, 255)`;
  }
  const a = Math.round(255 + t * 175);
  return `rgb(255, ${a}, ${a})`;
}

export default function CorrelationHeatmap({ mode = "sensor", title }) {
  const [method, setMethod] = useState("pearson");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const call = mode === "cross"
      ? api.weatherCorrelation(method, 3000, "10min")
      : api.correlation(method, 3000);
    call.then((r) => alive && (setData(r), setError(null)))
        .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [method, mode]);

  const heading = title ?? (mode === "cross"
    ? "Sensor vs Weather correlation"
    : "Sensor correlation");

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="card-title">{heading}</div>
          <div className="text-lg font-semibold">
            {method[0].toUpperCase() + method.slice(1)} correlation matrix
          </div>
        </div>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="pearson">Pearson</option>
          <option value="spearman">Spearman</option>
          <option value="kendall">Kendall</option>
        </select>
      </div>

      {error && <div className="text-rose-600 text-sm">Failed to load: {error}</div>}

      {data && data.columns.length > 0 ? (
        <div className="overflow-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-2"></th>
                {data.columns.map((c) => (
                  <th key={c} className="p-2 text-slate-600 font-medium whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row, i) => (
                <tr key={i}>
                  <th className="p-2 text-slate-600 font-medium text-right whitespace-nowrap">
                    {data.columns[i]}
                  </th>
                  {row.map((v, j) => (
                    <td
                      key={j}
                      className="w-20 h-12 text-center border border-white font-medium"
                      style={{ background: colorFor(v), color: Math.abs(v) > 0.6 ? "white" : "#0f172a" }}
                      title={`${data.columns[i]} vs ${data.columns[j]}: ${v.toFixed(3)}`}
                    >
                      {v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-xs text-slate-500">
            Computed from {data.n_samples.toLocaleString()} samples
            {data.tolerance ? ` (join tolerance: ${data.tolerance})` : ""}.
            Blue = positive correlation, red = negative.
          </div>
        </div>
      ) : (
        !error && <div className="text-slate-500 text-sm">
          {mode === "cross"
            ? "Not enough overlapping sensor + weather samples yet."
            : "Not enough numeric variation to compute correlation yet."}
        </div>
      )}
    </div>
  );
}
