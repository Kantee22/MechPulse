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
    <header className="navbar-glass sticky top-0 z-20 max-md:pr-14">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-md shadow-sky-900/35 flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight text-slate-100">MechPulse</div>
            <div className="text-sm text-slate-400 leading-tight">Machine Health Monitor</div>
          </div>
        </div>
        <nav className="nav-pill-glass flex items-center gap-1 ml-2 rounded-xl p-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-base font-medium transition ${
                  isActive
                    ? "bg-sky-300 text-slate-900 shadow-sm ring-1 ring-sky-200/50"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-pill-glass ml-auto hidden xl:flex items-center gap-2 text-sm rounded-full px-3 py-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-slate-300">{label}</span>
        </div>
      </div>
    </header>
  );
}
