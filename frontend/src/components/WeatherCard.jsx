import { useEffect, useState } from "react";
import { api } from "../api.js";

function iconFor(condition = "") {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "⛈";
  if (c.includes("rain") || c.includes("drizzle")) return "🌧";
  if (c.includes("snow")) return "❄";
  if (c.includes("cloud")) return "☁";
  if (c.includes("clear")) return "☀";
  if (c.includes("mist") || c.includes("fog")) return "🌫";
  return "🌡";
}

export default function WeatherCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      api.weatherLatest(1)
        .then((r) => alive && (setData(r[0] || null), setError(null)))
        .catch((e) => alive && setError(e.message));
    tick();
    const id = setInterval(tick, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="card">
      <div className="card-title">Weather (secondary data source)</div>
      {error && <div className="text-rose-600 text-sm mt-2">{error}</div>}
      {data ? (
        <>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-5xl leading-none">{iconFor(data.weather_desc)}</div>
            <div>
              <div className="text-3xl font-semibold">
                {data.temp_outside?.toFixed(1)}<span className="text-base text-slate-500 ml-1">°C</span>
              </div>
              <div className="text-sm text-slate-500 capitalize">
                {data.weather_desc} - {data.city}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <Stat label="Humidity" value={`${data.humidity ?? "-"}%`} />
            <Stat label="Pressure" value={`${data.pressure ?? "-"} hPa`} />
            <Stat label="Wind" value={`${data.wind_speed ?? "-"} m/s`} />
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Latest at {new Date(data.timestamp).toLocaleString()}
          </div>
        </>
      ) : (
        !error && <div className="text-slate-500 text-sm mt-2">Waiting for weather data...</div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <div className="text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-slate-700 mt-0.5">{value}</div>
    </div>
  );
}
