export function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function MetricSkeleton() {
  return (
    <div className="card grid grid-auto-metrics" aria-busy="true" aria-label="Loading metrics">
      {[1, 2, 3, 4].map((i) => (
        <div className="metric" key={i}>
          <Skeleton style={{ width: "40%", height: 12, marginBottom: 10 }} />
          <Skeleton style={{ width: "55%", height: 28 }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="table-skeleton" aria-busy="true" aria-label="Loading inquiries">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} style={{ height: 40, marginBottom: 8, width: "100%" }} />
      ))}
    </div>
  );
}
