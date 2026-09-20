export default function StatCard({ label, value, tone = 'info', hint }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}
