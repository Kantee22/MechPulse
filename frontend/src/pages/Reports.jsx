import DailySummary from "../components/DailySummary.jsx";
import AnomalyAlerts from "../components/AnomalyAlerts.jsx";

export default function Reports() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-slate-500">
          Daily machine reports and recent anomaly log. Perfect for the
          presentation demo or for exporting a JSON summary.
        </p>
      </div>

      <DailySummary />
      <AnomalyAlerts />
    </div>
  );
}
