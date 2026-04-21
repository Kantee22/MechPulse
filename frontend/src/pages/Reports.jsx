import DailySummary from "../components/DailySummary.jsx";
import AnomalyAlerts from "../components/AnomalyAlerts.jsx";
import { LiquidDivider, LiquidHero, LiquidSection } from "../components/LiquidScroll.jsx";

export default function Reports() {
  return (
    <div className="liquid-page-flow">
      <LiquidHero kicker="Reports · Daily rollups · Anomalies" title="Machine reports">
        <p className="liquid-hero__lead">
          Daily machine reports and recent anomaly log. Useful for demos or exporting a JSON summary.
        </p>
      </LiquidHero>

      <LiquidDivider />

      <LiquidSection kicker="History" title="Daily summary" subtitle="Table">
        <DailySummary />
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Alerts" title="Anomaly log" subtitle="Z-score">
        <AnomalyAlerts />
      </LiquidSection>
    </div>
  );
}
