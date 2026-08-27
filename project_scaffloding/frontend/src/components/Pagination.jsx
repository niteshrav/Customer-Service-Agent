export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <div className="pagination-meta">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </div>
      <div className="pagination-controls">
        <label className="pagination-size">
          <span className="sr-only">Page size</span>
          <select
            aria-label="Page size"
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn secondary btn-compact" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          Previous
        </button>
        <span className="pagination-page" aria-current="page">
          Page {safePage} / {totalPages}
        </span>
        <button
          type="button"
          className="btn secondary btn-compact"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
