import clsx from 'clsx';

/** The Mainspring mark: a dial with a needle resting just past the top. */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={clsx('h-8 w-8', className)} aria-hidden="true">
      <circle cx="16" cy="16" r="12.5" stroke="#2A3342" strokeWidth="2" />
      <path
        d="M16 3.5a12.5 12.5 0 0 1 12.5 12.5"
        stroke="#F5A524"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M16 16 22.6 9.4" stroke="#F5A524" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.6" fill="#F5A524" />
    </svg>
  );
}

export function Logo({ compact = false, className }) {
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight text-ink-50">Mainspring</p>
          <p className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-ink-500">CMMS</p>
        </div>
      )}
    </div>
  );
}
