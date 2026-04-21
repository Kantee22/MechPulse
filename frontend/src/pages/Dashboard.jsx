import { useEffect, useState } from "react";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import HealthScoreCard from "../components/HealthScoreCard.jsx";
import WeatherCard from "../components/WeatherCard.jsx";
import TimeSeriesChart from "../components/TimeSeriesChart.jsx";
import AnomalyAlerts from "../components/AnomalyAlerts.jsx";
import OverlayChart from "../components/OverlayChart.jsx";
import { LiquidDivider, LiquidHero, LiquidSection } from "../components/LiquidScroll.jsx";

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
    <div className="liquid-page-flow">
      <LiquidHero
        kicker="MechPulse · Glass dashboard · Live data"
        title="Machine Health"
      >
        <p className="liquid-hero__lead">
          Real-time overview of the MechPulse sensor stack. Primary data: MQTT &rarr;
          Node-RED &rarr; <code>sensor_data</code>. Secondary: WeatherAPI &rarr;
          Node-RED &rarr; <code>weather_data</code>.
        </p>
      </LiquidHero>

      <LiquidDivider />

      <LiquidSection
        kicker="Sensors"
        title="Key metrics"
        subtitle="Rolling window"
      >
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
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection
        kicker="Overview"
        title="Health, weather & trend"
        subtitle="Live cards"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <HealthScoreCard />
          <WeatherCard />
          <div>
            <TimeSeriesChart source="sensor" defaultMetric="temperature" />
          </div>
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection
        kicker="Correlation"
        title="Fan vs ambient"
        subtitle="Overlay"
      >
        <OverlayChart />
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection
        kicker="Signals"
        title="Sound & anomalies"
        subtitle="Charts"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimeSeriesChart source="sensor" defaultMetric="sound_avg" />
          <AnomalyAlerts />
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Telemetry" title="Latest row" subtitle="Raw snapshot">
        <div className="card text-xs text-slate-300 bg-slate-950/35">
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
      </LiquidSection>
    </div>
  );
}
