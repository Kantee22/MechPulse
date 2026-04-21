import { useEffect, useState } from "react";
import { api } from "../api.js";
import CorrelationHeatmap from "../components/CorrelationHeatmap.jsx";
import TimeSeriesChart from "../components/TimeSeriesChart.jsx";
import OverlayChart from "../components/OverlayChart.jsx";
import { LiquidDivider, LiquidHero, LiquidSection } from "../components/LiquidScroll.jsx";

export default function Analytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.stats(3000).then(setStats).catch(() => setStats({}));
  }, []);

  return (
    <div className="liquid-page-flow">
      <LiquidHero kicker="Analytics · Correlation · Statistics" title="Deep dive">
        <p className="liquid-hero__lead">
          Correlation analysis and descriptive statistics across sensor channels
          and the ambient weather feed.
        </p>
      </LiquidHero>

      <LiquidDivider />

      <LiquidSection kicker="Matrices" title="Correlation heatmaps" subtitle="Pearson / Spearman / Kendall">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CorrelationHeatmap mode="sensor" title="Sensor-only correlation" />
          <CorrelationHeatmap mode="cross" title="Sensor vs Weather correlation" />
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Environment" title="Temperature overlay" subtitle="Joined series">
        <OverlayChart />
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Time series" title="Sensor & weather" subtitle="Selectable metrics">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimeSeriesChart source="sensor" defaultMetric="temperature" />
          <TimeSeriesChart source="weather" defaultMetric="temp_outside" />
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="sensor_data" title="Descriptive statistics" subtitle="Table">
        <div className="card overflow-auto">
          <div className="card-title mb-2">Descriptive statistics (sensor_data)</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="py-2 pr-4">Metric</th>
                <th className="py-2 pr-4">Count</th>
                <th className="py-2 pr-4">Mean</th>
                <th className="py-2 pr-4">Std</th>
                <th className="py-2 pr-4">Min</th>
                <th className="py-2 pr-4">P25</th>
                <th className="py-2 pr-4">Median</th>
                <th className="py-2 pr-4">P75</th>
                <th className="py-2 pr-4">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats && Object.entries(stats).map(([k, v]) => (
                <tr key={k}>
                  <td className="py-2 pr-4 font-medium">{k}</td>
                  <td className="py-2 pr-4">{v.count}</td>
                  <td className="py-2 pr-4">{v.mean}</td>
                  <td className="py-2 pr-4">{v.std}</td>
                  <td className="py-2 pr-4">{v.min}</td>
                  <td className="py-2 pr-4">{v.p25}</td>
                  <td className="py-2 pr-4">{v.p50}</td>
                  <td className="py-2 pr-4">{v.p75}</td>
                  <td className="py-2 pr-4">{v.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats && Object.keys(stats).length === 0 && (
            <div className="text-slate-500 text-sm py-4">No numeric data available yet.</div>
          )}
        </div>
      </LiquidSection>
    </div>
  );
}
