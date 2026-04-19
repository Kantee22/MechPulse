import WeatherCard from "../components/WeatherCard.jsx";
import TimeSeriesChart from "../components/TimeSeriesChart.jsx";
import OverlayChart from "../components/OverlayChart.jsx";
import CorrelationHeatmap from "../components/CorrelationHeatmap.jsx";

export default function Weather() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Weather (Secondary Data Source)</h1>
        <p className="text-sm text-slate-500">
          Ambient conditions pulled from WeatherAPI every 10 minutes by the Node-RED
          scheduler and stored in the <code>weather_data</code> table. Used to contextualise
          the fan's own temperature / humidity readings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WeatherCard />
        <div className="lg:col-span-2">
          <OverlayChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeSeriesChart source="weather" defaultMetric="temp_outside" />
        <TimeSeriesChart source="weather" defaultMetric="humidity" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeSeriesChart source="weather" defaultMetric="pressure" />
        <TimeSeriesChart source="weather" defaultMetric="wind_speed" />
      </div>

      <CorrelationHeatmap mode="cross" />
    </div>
  );
}
