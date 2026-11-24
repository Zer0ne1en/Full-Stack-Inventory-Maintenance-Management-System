import clsx from 'clsx';

export function EmptyState({ icon, title, message, action, className, compact = false }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-10' : 'py-20', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-700 bg-ink-900 text-ink-500">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4l-2 2h-4l-2-2H4"
            />
          </svg>
        )}
      </div>
      <h3 className="font-display text-sm font-semibold text-ink-200">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <svg className={clsx('h-4 w-4 animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ rows = 6, className }) {
  return (
    <div className={clsx('space-y-2.5 p-4', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-10 w-full" />
      ))}
    </div>
  );
}
