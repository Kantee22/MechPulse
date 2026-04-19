import { useEffect, useState } from "react";
import { api } from "../api.js";

function gradeTone(g) {
  return {
    A: "text-emerald-600",
    B: "text-lime-600",
    C: "text-amber-500",
    D: "text-orange-500",
    F: "text-rose-600",
  }[g] || "text-slate-600";
}

export default function HealthScoreCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      api.healthScore(120)
        .then((r) => alive && (setData(r), setError(null)))
        .catch((e) => alive && setError(e.message));
    tick();
    const id = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="card">
      <div className="card-title">Machine health score</div>
      {error && <div className="text-rose-600 text-sm mt-2">{error}</div>}
      {data && (
        <>
          <div className="mt-2 flex items-end gap-4">
            <div className={`text-6xl font-bold ${gradeTone(data.grade)}`}>{data.score}</div>
            <div className={`text-2xl font-semibold ${gradeTone(data.grade)} mb-2`}>Grade {data.grade}</div>
          </div>
          <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${data.score}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-y-1 text-xs">
            {Object.entries(data.components)
              .filter(([k]) => k !== "window_rows")
              .map(([k, v]) => (
                <div key={k} className="flex justify-between pr-3">
                  <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
                  <span className="font-medium">{(Number(v) * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Window: last {data.components?.window_rows ?? 0} rows.
          </div>
        </>
      )}
    </div>
  );
}
