import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api.js";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/analytics", label: "Analytics" },
  { to: "/weather", label: "Weather" },
  { to: "/architecture", label: "Architecture" },
  { to: "/reports", label: "Reports" },
];

export default function Navbar() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      api.health()
        .then((s) => alive && setStatus(s))
        .catch(() => alive && setStatus({ ok: false, db_connected: false, tables: {} }));
    tick();
    const id = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const sensorRows  = status?.tables?.sensor_data  ?? 0;
  const weatherRows = status?.tables?.weather_data ?? status?.tables?.weather ?? 0;
  const usingSnap   = status?.using_snapshot;
  const rowsLabel   = `sensor ${sensorRows.toLocaleString()} / weather ${weatherRows.toLocaleString()}`;

  let dot, label;
  if (status?.db_connected) {
    dot = "bg-emerald-500";
    label = `Live (Node-RED) - ${rowsLabel}`;
  } else if (usingSnap) {
    dot = "bg-amber-500";
    const mod = status?.snapshot?.modified?.slice(0, 16).replace("T", " ") || "?";
    label = `Snapshot (${mod}) - ${rowsLabel}`;
  } else {
    dot = "bg-rose-500";
    const errHint = status?.last_error ? ` - ${status.last_error.slice(0, 80)}` : " - no snapshot";
    label = `Node-RED API unreachable${errHint}`;
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">M</div>
          <div>
            <div className="font-semibold leading-tight">MechPulse</div>
            <div className="text-xs text-slate-500 leading-tight">Machine Health Monitor</div>
          </div>
        </div>
        <nav className="flex items-center gap-1 ml-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-slate-600">{label}</span>
        </div>
      </div>
    </header>
  );
}
