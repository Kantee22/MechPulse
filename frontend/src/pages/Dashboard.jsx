import { useEffect, useState } from "react";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import HealthScoreCard from "../components/HealthScoreCard.jsx";
import WeatherCard from "../components/WeatherCard.jsx";
import TimeSeriesChart from "../components/TimeSeriesChart.jsx";
import AnomalyAlerts from "../components/AnomalyAlerts.jsx";
import OverlayChart from "../components/OverlayChart.jsx";

export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [s, l] = await Promise.all([api.stats(1000), api.sensorLatest(1)]);
        if (!alive) return;
        setStats(s);
        setLatest(l);
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const last = latest[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Machine Health Dashboard</h1>
        <p className="text-sm text-slate-500">
          Real-time overview of the MechPulse sensor stack. Primary data: MQTT &rarr;
          Node-RED &rarr; <code>sensor_data</code>. Secondary data: WeatherAPI &rarr;
          Node-RED &rarr; <code>weather_data</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fan temperature"
          tone="rose"
          value={stats?.temperature ? `${stats.temperature.mean}°C` : "-"}
          hint="KY-028 rolling mean"
        />
        <StatCard
          title="Sound level"
          tone="brand"
          value={stats?.sound_avg ? stats.sound_avg.mean : "-"}
          hint="KY-037 avg reading"
        />
        <StatCard
          title="Vibration events"
          tone="amber"
          value={stats?.vib_count ? Math.round(stats.vib_count.mean * 100) / 100 : "-"}
          hint="KY-002 avg per cycle"
        />
        <StatCard
          title="Impacts detected"
          tone="rose"
          value={stats?.knock_count ? Math.round(stats.knock_count.count) : "-"}
          hint="KY-031 total events"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HealthScoreCard />
        <WeatherCard />
        <div>
          <TimeSeriesChart source="sensor" defaultMetric="temperature" />
        </div>
      </div>

      <OverlayChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeSeriesChart source="sensor" defaultMetric="sound_avg" />
        <AnomalyAlerts />
      </div>

      <div className="card text-xs text-slate-500">
        Latest row:&nbsp;
        {last ? (
          <span className="font-mono">
            #{last.id} - {new Date(last.timestamp).toLocaleString()} - phase={last.phase} - cycle={last.cycle}
            {" - "}vib={last.vib_count} knock={last.knock_count} sound={last.sound_avg} var={last.sound_var}
            {" - "}temp={last.temperature}°C health={last.health_score} status={last.status}
          </span>
        ) : (
          "Waiting for data..."
        )}
      </div>
    </div>
  );
}
