import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "mechpulse-theme";

function readTheme() {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      id="theme-toggle"
      aria-label="Toggle colour scheme"
      title="Toggle light / dark mode"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
    >
      <span className="icon-dark" aria-hidden="true">
        ☀️
      </span>
      <span className="icon-light" aria-hidden="true">
        🌙
      </span>
    </button>
  );
}
