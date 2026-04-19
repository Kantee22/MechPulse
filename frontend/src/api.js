// Thin fetch wrapper for the MechPulse FastAPI backend.
// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.js).
// In prod, set VITE_API_BASE to your deployed backend URL.

const BASE = import.meta.env.VITE_API_BASE ?? "";
const MAX_ATTEMPTS = 3;       // 1 initial + 2 retries
const RETRY_DELAY_MS = 600;   // backoff base

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  // Retry 5xx / network errors a couple of times - Node-RED's MySQL node
  // occasionally times out when the dashboard fires many requests at once.
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (res.ok) return res.json();
      // Retry server errors; bail on 4xx (client bugs won't get better).
      if (res.status < 500 || res.status === 501) {
        const body = await res.text();
        throw new Error(`${res.status} ${res.statusText} - ${body}`);
      }
      lastErr = new Error(`${res.status} ${res.statusText} - ${await res.text()}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastErr;
}

export const api = {
  // Meta
  health: () => get("/api/health"),
  schema: () => get("/api/schema"),

  // Sensor (primary)
  sensorLatest: (limit = 100) => get("/api/sensors/latest", { limit }),
  sensorTimeseries: (metric, limit = 500, phase) =>
    get("/api/sensors/timeseries", { metric, limit, phase }),

  // Weather (secondary)
  weatherLatest: (limit = 50) => get("/api/weather/latest", { limit }),
  weatherTimeseries: (metric, limit = 500) =>
    get("/api/weather/timeseries", { metric, limit }),

  // Analytics
  stats: (limit = 2000) => get("/api/analytics/stats", { limit }),
  correlation: (method = "pearson", limit = 2000) =>
    get("/api/analytics/correlation", { method, limit }),
  weatherCorrelation: (method = "pearson", limit = 3000, tolerance = "10min") =>
    get("/api/analytics/weather-correlation", { method, limit, tolerance }),
  overlay: (limit = 500, tolerance = "10min") =>
    get("/api/analytics/overlay", { limit, tolerance }),
  healthScore: (window = 120) => get("/api/analytics/health-score", { window }),
  anomalies: (z = 3.0, limit = 50) => get("/api/analytics/anomalies", { z, limit }),
  dailySummary: () => get("/api/analytics/daily-summary"),
};
