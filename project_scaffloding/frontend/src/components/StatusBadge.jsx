export function StatusBadge({ tone = "neutral", children }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function FlagPill({ on, label }) {
  return (
    <span className={`flag-pill ${on ? "is-on" : "is-off"}`} title={label}>
      {label}
    </span>
  );
}
