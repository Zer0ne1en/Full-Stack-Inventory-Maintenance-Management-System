import { number } from '../../lib/format.js';

export function Pagination({ page, onChange, compact = false }) {
  if (!page || page.totalPages <= 1) {
    return page && page.totalElements > 0 ? (
      <p className="px-4 py-3 text-xs text-ink-500">
        Showing {number(page.totalElements)} {page.totalElements === 1 ? 'record' : 'records'}
      </p>
    ) : null;
  }

  const current = page.page + 1;
  const total = page.totalPages;

  const pages = [];
  const push = (value) => {
    if (value >= 1 && value <= total && !pages.includes(value)) pages.push(value);
  };
  push(1);
  for (let value = current - 1; value <= current + 1; value += 1) push(value);
  push(total);

  const sequence = [];
  pages
    .sort((a, b) => a - b)
    .forEach((value, index) => {
      if (index > 0 && value - pages[index - 1] > 1) sequence.push('…');
      sequence.push(value);
    });

  return (
    <div className="flex flex-col gap-3 border-t border-ink-700/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-ink-500">
        Showing <span className="num text-ink-300">{number(page.totalElements)}</span>{' '}
        {page.totalElements === 1 ? 'record' : 'records'}
        {page.totalPages > 1 && (
          <>
            {' · '}page <span className="num text-ink-300">{current}</span> of{' '}
            <span className="num text-ink-300">{total}</span>
          </>
        )}
      </p>

      {!compact && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <PageButton
            disabled={page.first}
            onClick={() => onChange(page.page - 1)}
            label="Previous page"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M12.7 15.7a1 1 0 01-1.4 0l-5-5a1 1 0 010-1.4l5-5a1 1 0 111.4 1.4L8.4 10l4.3 4.3a1 1 0 010 1.4z"
                clipRule="evenodd"
              />
            </svg>
          </PageButton>
          {sequence.map((item, index) =>
            item === '…' ? (
              <span key={`gap-${index}`} className="px-1.5 text-ink-600">
                …
              </span>
            ) : (
              <PageButton
                key={item}
                active={item === current}
                onClick={() => onChange(item - 1)}
                label={`Page ${item}`}
              >
                {item}
              </PageButton>
            ),
          )}
          <PageButton disabled={page.last} onClick={() => onChange(page.page + 1)} label="Next page">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M7.3 4.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4L11.6 10 7.3 5.7a1 1 0 010-1.4z"
                clipRule="evenodd"
              />
            </svg>
          </PageButton>
        </nav>
      )}
    </div>
  );
}

function PageButton({ active, disabled, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`num inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        active
          ? 'bg-ember-400 text-ink-950'
          : 'border border-ink-700 text-ink-300 hover:border-ink-500 hover:bg-ink-800 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}
