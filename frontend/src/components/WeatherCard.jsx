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

/** Fan tip from ambient (secondary) temperature: WeatherAPI → weather_data.temp_outside */
function fanAdviceFromOutsideTemp(celsius) {
  if (celsius == null || Number.isNaN(Number(celsius))) return null;
  const t = Number(celsius);
  if (t > 30) {
    return {
      shouldRun: true,
      title: "Turn the fan on",
      detail: `Outside temperature is ${t.toFixed(1)}°C (above 30°C). Consider running the fan for ventilation / cooling (secondary weather feed).`,
    };
  }
  return {
    shouldRun: false,
    title: "Fan not required for ambient heat",
    detail: `Outside temperature is ${t.toFixed(1)}°C (30°C or below, secondary weather feed).`,
  };
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

  const fanAdvice = data ? fanAdviceFromOutsideTemp(data.temp_outside) : null;

  return (
    <div className="card">
      <div className="card-title">Weather (secondary data source)</div>
      {error && <div className="text-rose-600 text-sm mt-2">{error}</div>}
      {data ? (
        <>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-5xl leading-none">{iconFor(data.weather_desc)}</div>
            <div>
              <div className="text-4xl font-bold tracking-tight">
                {data.temp_outside?.toFixed(1)}
                <span className="text-base text-slate-400 ml-1">°C</span>
              </div>
              <div className="text-sm text-slate-400 capitalize">
                {data.weather_desc} - {data.city}
              </div>
            </div>
          </div>
          {fanAdvice && (
            <div
              className={`mt-3 rounded-xl border px-3 py-2.5 text-sm ${
                fanAdvice.shouldRun
                  ? "border-sky-400/45 bg-sky-500/15 text-sky-50"
                  : "border-slate-600/80 bg-slate-900/60 text-slate-300"
              }`}
            >
              <div className="font-semibold">{fanAdvice.title}</div>
              <div className="mt-0.5 text-xs opacity-90 leading-snug">{fanAdvice.detail}</div>
            </div>
          )}
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
        !error && <div className="text-slate-400 text-sm mt-2">Waiting for weather data...</div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg p-2 border border-slate-700/70 bg-slate-900/45">
      <div className="text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-slate-200 mt-0.5">{value}</div>
    </div>
  );
}
