// Inline SVG diagram of the MechPulse system architecture.
// Shows both the sensor pipeline (top) and the weather pipeline (bottom).

export default function ArchitectureDiagram() {
  return (
    <div className="card">
      <div className="card-title">System architecture</div>
      <div className="mt-3 overflow-auto">
        <svg viewBox="0 0 940 520" className="w-full min-w-[760px]">
          {/* ------- Primary: Sensor pipeline ------- */}
          <g>
            <Box x={20}  y={30}  w={150} h={60} title="KY-002" subtitle="Vibration" color="#e0f2fe" />
            <Box x={20}  y={110} w={150} h={60} title="KY-028" subtitle="Temperature" color="#e0f2fe" />
            <Box x={20}  y={190} w={150} h={60} title="KY-037" subtitle="Sound" color="#e0f2fe" />
            <Box x={20}  y={270} w={150} h={60} title="KY-031" subtitle="Tap / Knock" color="#e0f2fe" />
          </g>

          <Box x={210} y={150} w={150} h={70} title="ESP32 / MCU" subtitle="reads + publishes JSON" color="#fef9c3" />
          <Box x={400} y={150} w={120} h={70} title="MQTTX" subtitle="topic: mechpulse/#" color="#fde68a" />
          <Box x={555} y={150} w={140} h={70} title="Node-RED" subtitle="Build SQL + insert" color="#fecaca" />
          <Box x={735} y={120} w={170} h={60} title="MySQL: sensor_data" subtitle="iot.cpe.ku.ac.th/pma" color="#ddd6fe" />

          {/* ------- Secondary: Weather pipeline ------- */}
          <Box x={20}  y={400} w={150} h={60} title="WeatherAPI" subtitle="Bangkok" color="#ccfbf1" />
          <Box x={210} y={400} w={150} h={60} title="Every 10 min" subtitle="Node-RED inject" color="#fef9c3" />
          <Box x={400} y={400} w={160} h={60} title="Parse Weather" subtitle="Node-RED function" color="#fecaca" />
          <Box x={735} y={400} w={170} h={60} title="MySQL: weather_data" subtitle="iot.cpe.ku.ac.th/pma" color="#ddd6fe" />

          {/* ------- Downstream ------- */}
          <Box x={400} y={280} w={140} h={70} title="FastAPI" subtitle="/api/... endpoints" color="#bbf7d0" />
          <Box x={600} y={280} w={160} h={70} title="React + Recharts" subtitle="this dashboard" color="#bae6fd" />

          {/* Arrows - sensor side */}
          <Arrow x1={170} y1={60}  x2={210} y2={170} />
          <Arrow x1={170} y1={140} x2={210} y2={180} />
          <Arrow x1={170} y1={220} x2={210} y2={190} />
          <Arrow x1={170} y1={300} x2={210} y2={200} />
          <Arrow x1={360} y1={185} x2={400} y2={185} label="MQTT pub" />
          <Arrow x1={520} y1={185} x2={555} y2={185} label="subscribe" />
          <Arrow x1={695} y1={170} x2={735} y2={150} label="INSERT" />

          {/* Arrows - weather side */}
          <Arrow x1={170} y1={430} x2={210} y2={430} />
          <Arrow x1={360} y1={430} x2={400} y2={430} />
          <Arrow x1={560} y1={430} x2={735} y2={430} label="INSERT" />

          {/* Arrows - API */}
          <Arrow x1={820} y1={180} x2={470} y2={280} label="SELECT" />
          <Arrow x1={820} y1={400} x2={470} y2={340} label="SELECT" />
          <Arrow x1={540} y1={315} x2={600} y2={315} label="JSON" />

          {/* Title */}
          <text x={470} y={18} textAnchor="middle" fontSize="14" fontWeight="600" fill="#334155">
            Primary: sensors - MCU - MQTT - Node-RED - sensor_data
          </text>
          <text x={470} y={388} textAnchor="middle" fontSize="14" fontWeight="600" fill="#334155">
            Secondary: WeatherAPI (Bangkok) - Node-RED - weather_data
          </text>
        </svg>
      </div>
    </div>
  );
}

function Box({ x, y, w, h, title, subtitle, color }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={color} stroke="#94a3b8" />
      <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f172a">
        {title}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize="11" fill="#475569">
        {subtitle}
      </text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label }) {
  return (
    <g>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arr)" />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} fontSize="10" textAnchor="middle" fill="#475569">
          {label}
        </text>
      )}
    </g>
  );
}
