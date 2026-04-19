export default function StatCard({ title, value, unit, hint, tone = "slate" }) {
  const tones = {
    slate:   "text-slate-700",
    brand:   "text-brand-700",
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
    rose:    "text-rose-600",
  };
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className={`mt-2 text-3xl font-semibold ${tones[tone] || tones.slate}`}>
        {value ?? "-"}
        {unit && <span className="ml-1 text-base text-slate-500">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
