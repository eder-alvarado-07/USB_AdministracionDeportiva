export default function StatCard({ label, value, icon, color = 'var(--accent)', bg }) {
  return (
    <div className="stat-card" style={{ '--card-color': color }}>
      <div
        className="stat-card-icon"
        style={{ background: bg || `${color}22` }}
      >
        {icon}
      </div>
      <div className="stat-card-value">{value ?? '–'}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}
