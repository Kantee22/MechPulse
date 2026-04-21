import WeatherCard from "../components/WeatherCard.jsx";
import TimeSeriesChart from "../components/TimeSeriesChart.jsx";
import OverlayChart from "../components/OverlayChart.jsx";
import CorrelationHeatmap from "../components/CorrelationHeatmap.jsx";
import { LiquidDivider, LiquidHero, LiquidSection } from "../components/LiquidScroll.jsx";

export default function Weather() {
  return (
    <div className="liquid-page-flow">
      <LiquidHero kicker="Secondary source · WeatherAPI · Bangkok" title="Ambient weather">
        <p className="liquid-hero__lead">
          Polled every 10 minutes by Node-RED and stored in <code>weather_data</code>.
          Use it to contextualise the fan&apos;s own temperature and humidity readings.
        </p>
      </LiquidHero>

      <LiquidDivider />

      <LiquidSection kicker="Now" title="Snapshot & overlay" subtitle="Live">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <WeatherCard />
          <div className="lg:col-span-2">
            <OverlayChart />
          </div>
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Charts" title="Outdoor conditions" subtitle="Time series">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimeSeriesChart source="weather" defaultMetric="temp_outside" />
          <TimeSeriesChart source="weather" defaultMetric="humidity" />
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Pressure & wind" title="More metrics" subtitle="Time series">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimeSeriesChart source="weather" defaultMetric="pressure" />
          <TimeSeriesChart source="weather" defaultMetric="wind_speed" />
        </div>
      </LiquidSection>

      <LiquidDivider />

      <LiquidSection kicker="Cross-sensor" title="Sensor vs weather" subtitle="Correlation">
        <CorrelationHeatmap mode="cross" />
      </LiquidSection>
    </div>
  );
}
