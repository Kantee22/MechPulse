export default function StatCard({ title, value, unit, hint, tone = "slate" }) {
  const tones = {
    slate:   "text-slate-100",
    brand:   "text-cyan-300",
    emerald: "text-emerald-300",
    amber:   "text-amber-300",
    rose:    "text-rose-300",
  };
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className={`mt-2 text-4xl font-bold tracking-tight ${tones[tone] || tones.slate}`}>
        {value ?? "-"}
        {unit && <span className="ml-1 text-base text-slate-400">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-sm text-slate-400">{hint}</div>}
    </div>
  );
}
