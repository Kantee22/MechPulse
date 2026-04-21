import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import SceneParallax from "./components/SceneParallax.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Analytics from "./pages/Analytics.jsx";
import Weather from "./pages/Weather.jsx";
import Architecture from "./pages/Architecture.jsx";
import Reports from "./pages/Reports.jsx";

export default function App() {
  return (
    <>
      <SceneParallax>
        <div className="scene__blob scene__blob--1" />
        <div className="scene__blob scene__blob--2" />
        <div className="scene__blob scene__blob--3" />
      </SceneParallax>

      <ThemeToggle />

      <div
        className="glass-toast-region"
        id="toast-region"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      />

      <div className="min-h-screen flex flex-col relative liquid-app">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-400/25 via-cyan-400/12 to-transparent" />
        <Navbar />
        <main className="liquid-page relative flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-10 max-md:pr-14">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="footer-glass text-center text-xs py-5">
          MechPulse - Team 22 (GK Fastfood) - DAQ 2025s Project
        </footer>
      </div>
    </>
  );
}
