import ArchitectureDiagram from "../components/ArchitectureDiagram.jsx";

export default function Architecture() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Overall Architecture</h1>
        <p className="text-sm text-slate-500">
          End-to-end view of the MechPulse data pipeline. Two independent Node-RED flows
          feed two MySQL tables; the FastAPI layer joins them on nearest timestamp when
          the dashboard needs a correlated view.
        </p>
      </div>

      <ArchitectureDiagram />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-title">Primary data source - sensor_data</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><b>KY-002</b> - Vibration sensor - <code>vib_count</code></li>
            <li><b>KY-028</b> - Fan temperature - <code>temperature</code></li>
            <li><b>KY-037</b> - Sound level - <code>sound_avg</code>, <code>sound_var</code></li>
            <li><b>KY-031</b> - Tap / knock - <code>knock_count</code></li>
            <li>Each row carries <code>phase</code> (baseline / warmup / running / cooldown), <code>cycle</code>, a derived <code>health_score</code> (0-100), and a <code>status</code> label.</li>
          </ul>
        </div>

        <div className="card">
          <div className="card-title">Secondary data source - weather_data</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><b>WeatherAPI</b> (Bangkok) polled every 10 minutes by a Node-RED inject node.</li>
            <li>Parsed into: <code>temp_outside</code>, <code>humidity</code>, <code>pressure</code>, <code>weather_desc</code>, <code>wind_speed</code>, <code>city</code>.</li>
            <li>Used to contextualise the fan's own thermistor so we can tell whether heating is internal (bearing wear) or ambient.</li>
          </ul>
        </div>

        <div className="card">
          <div className="card-title">Transport - Node-RED</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><b>Sensor flow:</b> MQTT Subscribe &rarr; Build SQL (function) &rarr; MySQL insert.</li>
            <li><b>Weather flow:</b> Inject (every 10 min) &rarr; HTTP request (WeatherAPI) &rarr; Parse function &rarr; MySQL insert.</li>
            <li>Both flows share the same DB connection (<code>b6710545440</code>) but write to separate tables.</li>
          </ul>
        </div>

        <div className="card">
          <div className="card-title">FastAPI + React</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><b>FastAPI</b> exposes <code>/api/sensors/*</code>, <code>/api/weather/*</code>, and <code>/api/analytics/*</code>. Docs at <code>/docs</code>.</li>
            <li><b>Cross-correlation</b> is implemented with <code>pandas.merge_asof</code> on the nearest timestamp (10 min tolerance).</li>
            <li><b>React + Recharts</b> renders time-series, overlay charts, and correlation heatmaps.</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-title">What the API provides</div>
        <ul className="mt-3 space-y-2 text-sm list-disc pl-5">
          <li><b>Machine Health Score</b> - composite index (0-100) from vibration, sound, and fan temperature.</li>
          <li><b>Anomaly Detection</b> - cross-sensor z-score alerts using the baseline phase for calibration.</li>
          <li><b>Sensor vs Weather correlation</b> - joined on nearest timestamp; reveals whether ambient conditions drive fan-temp drift.</li>
          <li><b>Daily Machine Report</b> - per-day peaks, averages, and phase counts for both data sources.</li>
        </ul>
      </div>
    </div>
  );
}
