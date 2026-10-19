import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageWindow(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push('…');
    result.push(value);
  });
  return result;
}

export function Pagination({ page, totalPages, total, onPageChange, itemLabel = 'results' }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination-summary">
        Page {page} of {totalPages} · {total} {itemLabel}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="page-button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((value, index) =>
          value === '…' ? (
            <span key={`gap-${index}`} className="page-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={value}
              type="button"
              className={`page-button ${value === page ? 'is-current' : ''}`}
              onClick={() => onPageChange(value)}
              aria-label={`Page ${value}`}
              aria-current={value === page ? 'page' : undefined}
            >
              {value}
            </button>
          ),
        )}
        <button
          type="button"
          className="page-button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
