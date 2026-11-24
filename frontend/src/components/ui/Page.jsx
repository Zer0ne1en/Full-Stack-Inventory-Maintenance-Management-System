import clsx from 'clsx';

export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={clsx('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs({ items, value, onChange, className }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-1 overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 p-1',
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all',
              active
                ? 'bg-ink-700 text-ink-50 shadow-sm'
                : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count !== null && (
              <span
                className={clsx(
                  'num rounded px-1.5 py-0.5 text-[10.5px]',
                  active ? 'bg-ink-950/50 text-ink-300' : 'bg-ink-800 text-ink-500',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PanelHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 px-4 pb-3 pt-4', className)}>
      <div className="min-w-0">
        <h3 className="font-display text-[13.5px] font-semibold tracking-tight text-ink-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
