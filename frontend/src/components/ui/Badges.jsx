import clsx from 'clsx';
import { titleCase } from '../../lib/format.js';

const NEUTRAL = 'border-ink-600 bg-ink-800 text-ink-200';

const TONES = {
  mint: 'border-mint-500/30 bg-mint-900/50 text-mint-300',
  ember: 'border-ember-500/30 bg-ember-900/50 text-ember-300',
  rust: 'border-rust-500/30 bg-rust-900/50 text-rust-300',
  azure: 'border-azure-500/30 bg-azure-900/60 text-azure-300',
  violet: 'border-[#7c6cf6]/30 bg-[#7c6cf6]/10 text-[#b3a9ff]',
  neutral: NEUTRAL,
};

const DOT = {
  mint: 'bg-mint-400',
  ember: 'bg-ember-400',
  rust: 'bg-rust-400',
  azure: 'bg-azure-400',
  violet: 'bg-[#8b7cff]',
  neutral: 'bg-ink-400',
};

export function Badge({ tone = 'neutral', dot = false, pulse = false, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        TONES[tone] || NEUTRAL,
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={clsx(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                DOT[tone] || DOT.neutral,
              )}
            />
          )}
          <span className={clsx('relative inline-flex h-1.5 w-1.5 rounded-full', DOT[tone] || DOT.neutral)} />
        </span>
      )}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  OPERATIONAL: 'mint',
  UNDER_MAINTENANCE: 'ember',
  OUT_OF_SERVICE: 'rust',
  OPEN: 'azure',
  IN_PROGRESS: 'ember',
  CLOSED: 'neutral',
  LOW: 'neutral',
  MEDIUM: 'azure',
  HIGH: 'ember',
  CRITICAL: 'rust',
  INFO: 'azure',
  WARNING: 'ember',
  ADMIN: 'violet',
  TECHNICIAN: 'ember',
  VIEWER: 'azure',
  LOW_STOCK: 'ember',
  SERVICE_DUE: 'azure',
  TICKET_OVERDUE: 'rust',
};

const PULSING = new Set(['IN_PROGRESS', 'CRITICAL', 'OUT_OF_SERVICE', 'TICKET_OVERDUE']);

export function StatusBadge({ status, pulse, className }) {
  if (!status) return <span className="text-ink-500">—</span>;
  const tone = STATUS_TONE[status] || 'neutral';
  return (
    <Badge tone={tone} dot pulse={pulse ?? PULSING.has(status)} className={className}>
      {titleCase(status)}
    </Badge>
  );
}

export function RoleBadge({ role, className }) {
  if (!role) return <span className="text-ink-500">—</span>;
  return (
    <Badge tone={STATUS_TONE[role] || 'neutral'} className={className}>
      {titleCase(role)}
    </Badge>
  );
}

export function CountPill({ children, tone = 'neutral' }) {
  return (
    <span
      className={clsx(
        'num inline-flex min-w-[20px] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        tone === 'ember' && 'bg-ember-500/15 text-ember-300',
        tone === 'mint' && 'bg-mint-500/15 text-mint-300',
        tone === 'rust' && 'bg-rust-500/15 text-rust-300',
        tone === 'azure' && 'bg-azure-500/15 text-azure-300',
        tone === 'neutral' && 'bg-ink-700 text-ink-300',
      )}
    >
      {children}
    </span>
  );
}
