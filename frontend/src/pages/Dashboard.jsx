import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, PanelHeader } from '../components/ui/Page.jsx';
import { Badge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { date, money, number, relative, titleCase } from '../lib/format.js';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/dashboard'));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const trend = useMemo(
    () => (data?.ticketTrend ?? []).map((point) => ({ ...point, closed: point.closed })),
    [data],
  );

  const statusSlices = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Open', value: data.ticketsOpen, color: '#5B9DFF' },
      { name: 'In progress', value: data.ticketsInProgress, color: '#F5A524' },
      { name: 'Closed', value: data.ticketsClosed, color: '#2FBF8F' },
    ].filter((slice) => slice.value > 0);
  }, [data]);

  const runScan = async () => {
    try {
      const result = await api.post('/alerts/scan');
      const total = result.lowStockAlerts + result.serviceDueAlerts + result.overdueTicketAlerts;
      toast.success(
        total === 0
          ? 'Scan complete — the plant is clean.'
          : `Scan raised ${total} new alert${total === 1 ? '' : 's'}.`,
      );
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-72" />
        <div className="skeleton h-40 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-rust-300">{error.message}</p>
        <button type="button" className="btn-ghost mt-4" onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  const availability = data.fleetAvailability ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle={
          <>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · {data.machinesTotal} assets on the floor, {data.ticketsOverdue} ticket
            {data.ticketsOverdue === 1 ? '' : 's'} needing attention.
          </>
        }
        actions={
          <>
            {isAdmin && (
              <button type="button" className="btn-ghost" onClick={runScan}>
                <Icon name="refresh" className="h-4 w-4" /> Run alert scan
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => navigate('/tickets')}>
              <Icon name="ticket" className="h-4 w-4" /> Open work queue
            </button>
          </>
        }
      />

      {/* --------------------------------------------------------------- */}
      {/* Pulse band                                                      */}
      {/* --------------------------------------------------------------- */}
      <section className="panel relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember-400/40 to-transparent" />
        <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_1fr] lg:p-6">
          <div className="flex items-center gap-6">
            <Gauge value={availability} />
            <div className="min-w-0">
              <p className="eyebrow">Fleet availability</p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-50">
                {availability.toFixed(1)}
                <span className="ml-1 text-lg text-ink-400">%</span>
              </p>
              <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-400">
                {data.machinesOperational} of {data.machinesTotal} machines are operational.
                {data.machinesUnderMaintenance > 0 && (
                  <>
                    {' '}
                    <span className="text-ember-300">{data.machinesUnderMaintenance} in maintenance</span>
                  </>
                )}
                {data.machinesOutOfService > 0 && (
                  <>
                    , <span className="text-rust-300">{data.machinesOutOfService} out of service</span>
                  </>
                )}
                .
              </p>
              <div className="mt-4 flex items-center gap-4">
                <LegendDot color="bg-mint-400" label={`Up ${data.machinesOperational}`} />
                <LegendDot color="bg-ember-400" label={`Maint ${data.machinesUnderMaintenance}`} />
                <LegendDot color="bg-rust-400" label={`Down ${data.machinesOutOfService}`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <MiniStat label="Open tickets" value={number(data.ticketsOpen)} tone="azure" />
            <MiniStat label="In progress" value={number(data.ticketsInProgress)} tone="ember" />
            <MiniStat label="Parts low" value={number(data.partsLowStock)} tone="rust" />
            <MiniStat label="Inventory value" value={money(data.inventoryValue, { compact: true })} tone="mint" />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* Trend + attention                                               */}
      {/* --------------------------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <PanelHeader
            title="Ticket flow"
            subtitle="Opened vs. closed, last 14 days"
            action={<LegendDot color="bg-azure-400" label="Opened" />}
          />
          <div className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={236}>
              <AreaChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="openedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5B9DFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5B9DFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="closedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2FBF8F" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2FBF8F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E2530" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6B7787', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: '#6B7787', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2A3342', strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="opened"
                  stroke="#5B9DFF"
                  strokeWidth={2}
                  fill="url(#openedFill)"
                  activeDot={{ r: 3, fill: '#5B9DFF' }}
                />
                <Area
                  type="monotone"
                  dataKey="closed"
                  stroke="#2FBF8F"
                  strokeWidth={2}
                  fill="url(#closedFill)"
                  activeDot={{ r: 3, fill: '#2FBF8F' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 border-t border-ink-700/70 px-4 py-3">
            <LegendDot color="bg-azure-400" label="Opened" />
            <LegendDot color="bg-mint-400" label="Closed" />
            <span className="ml-auto text-[11.5px] text-ink-500">
              {data.ticketsClosed} closed all time · {data.ticketsOverdue} overdue
            </span>
          </div>
        </div>

        <div className="panel flex flex-col">
          <PanelHeader
            title="Attention required"
            subtitle={`${data.unreadAlerts} unread alert${data.unreadAlerts === 1 ? '' : 's'}`}
            action={
              <Link to="/alerts" className="flex items-center gap-1 text-[11.5px] font-medium text-ember-400 hover:text-ember-300">
                View all <Icon name="arrowRight" className="h-3 w-3" />
              </Link>
            }
          />
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {data.recentAlerts.length === 0 ? (
              <EmptyState compact title="All clear" message="No unread alerts. Run a scan to check the floor." />
            ) : (
              <ul className="space-y-1">
                {data.recentAlerts.map((alert) => (
                  <li key={alert.id}>
                    <Link
                      to="/alerts"
                      className="group flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-ink-800/70"
                    >
                      <span
                        className={clsx(
                          'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                          alert.severity === 'CRITICAL' && 'bg-rust-400',
                          alert.severity === 'WARNING' && 'bg-ember-400',
                          alert.severity === 'INFO' && 'bg-azure-400',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink-200 transition-colors group-hover:text-ink-50">
                          {alert.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-500">
                          {alert.message}
                        </p>
                        <p className="mt-1 text-[10.5px] uppercase tracking-wider text-ink-600">
                          {titleCase(alert.type)} · {relative(alert.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* Bottom row                                                      */}
      {/* --------------------------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel">
          <PanelHeader
            title="Low stock"
            subtitle={`${data.partsLowStock} part${data.partsLowStock === 1 ? '' : 's'} at or below threshold`}
            action={
              <Link to="/parts?lowStock=1" className="flex items-center gap-1 text-[11.5px] font-medium text-ember-400 hover:text-ember-300">
                All <Icon name="arrowRight" className="h-3 w-3" />
              </Link>
            }
          />
          <ul className="px-2 pb-3">
            {data.lowStockParts.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-ink-500">Every part is above its threshold.</li>
            )}
            {data.lowStockParts.map((part) => (
              <li key={part.id}>
                <Link
                  to={`/parts?q=${encodeURIComponent(part.sku)}`}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-ink-800/70"
                >
                  <span className="w-14 shrink-0">
                    <span className="num block text-[13px] font-medium text-ink-100">
                      {part.quantityOnHand}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-ink-600">on hand</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink-200">{part.name}</span>
                    <span className="num block text-[11px] text-ink-500">{part.sku}</span>
                  </span>
                  <span className="w-24 shrink-0">
                    <StockBar current={part.quantityOnHand} threshold={part.reorderThreshold} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <PanelHeader
            title="Service due"
            subtitle="Next 30 days"
            action={
              <Link to="/machines" className="flex items-center gap-1 text-[11.5px] font-medium text-ember-400 hover:text-ember-300">
                Machines <Icon name="arrowRight" className="h-3 w-3" />
              </Link>
            }
          />
          <ul className="px-2 pb-3">
            {data.upcomingServices.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-ink-500">Nothing due in the next 30 days.</li>
            )}
            {data.upcomingServices.map((service) => {
              const overdue = service.daysUntilDue < 0;
              return (
                <li key={service.machineId}>
                  <Link
                    to={`/machines/${service.machineId}`}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-ink-800/70"
                  >
                    <div
                      className={clsx(
                        'flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border',
                        overdue
                          ? 'border-rust-500/40 bg-rust-900/40 text-rust-300'
                          : 'border-ink-600 bg-ink-900 text-ink-300',
                      )}
                    >
                      <span className="num text-[13px] font-semibold leading-none">
                        {overdue ? Math.abs(service.daysUntilDue) : service.daysUntilDue}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider opacity-70">d</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-ink-200">{service.machineName}</p>
                      <p className="num text-[11px] text-ink-500">
                        {service.machineCode} · {date(service.nextServiceAt)}
                      </p>
                    </div>
                    {overdue ? (
                      <Badge tone="rust">Overdue</Badge>
                    ) : (
                      <span className="text-[11px] text-ink-500">{service.openTickets} open</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel">
          <PanelHeader
            title="Recent activity"
            subtitle="Audit trail"
            action={
              <Link to="/audit" className="flex items-center gap-1 text-[11.5px] font-medium text-ember-400 hover:text-ember-300">
                Full log <Icon name="arrowRight" className="h-3 w-3" />
              </Link>
            }
          />
          <ol className="relative px-2 pb-3">
            {data.recentActivity.map((entry, index) => (
              <li key={entry.id} className="relative flex gap-3 px-2.5 py-2">
                <div className="relative flex flex-col items-center">
                  <span
                    className={clsx(
                      'mt-1 h-2 w-2 shrink-0 rounded-full ring-4 ring-ink-850',
                      entry.action === 'DELETE' && 'bg-rust-400',
                      entry.action === 'LOGIN' && 'bg-ink-500',
                      entry.action === 'CREATE' && 'bg-mint-400',
                      entry.action === 'CLOSE' && 'bg-azure-400',
                      !['DELETE', 'LOGIN', 'CREATE', 'CLOSE'].includes(entry.action) && 'bg-ember-400',
                    )}
                  />
                  {index < data.recentActivity.length - 1 && (
                    <span className="absolute top-4 h-full w-px bg-ink-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[12.5px] leading-snug text-ink-300">
                    <span className="font-medium text-ink-100">{entry.actorName}</span>{' '}
                    <span className="text-ink-400">{describeAction(entry.action)}</span>{' '}
                    <span className="text-ink-500">{titleCase(entry.entity)}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-600">{relative(entry.createdAt)}</p>
                </div>
              </li>
            ))}
            {data.recentActivity.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-ink-500">No activity recorded yet.</li>
            )}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* Status donut                                                    */}
      {/* --------------------------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel">
          <PanelHeader title="Ticket distribution" subtitle="Current pipeline" />
          <div className="flex items-center gap-2 pb-4">
            <PieChart width={132} height={132}>
                <Pie
                  data={statusSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={44}
                  outerRadius={60}
                  paddingAngle={3}
                  stroke="none"
                >
                  {statusSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            <div className="flex-1 space-y-2 pr-4">
              {statusSlices.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs text-ink-300">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: slice.color }} />
                    {slice.name}
                  </span>
                  <span className="num text-xs font-medium text-ink-100">{slice.value}</span>
                </div>
              ))}
              <div className="border-t border-ink-700 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-500">Total</span>
                  <span className="num text-xs font-medium text-ink-100">
                    {data.ticketsOpen + data.ticketsInProgress + data.ticketsClosed}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel lg:col-span-2">
          <PanelHeader
            title="Assets needing a decision"
            subtitle="Machines out of service or under maintenance"
            action={
              <Link to="/machines?status=UNDER_MAINTENANCE" className="flex items-center gap-1 text-[11.5px] font-medium text-ember-400 hover:text-ember-300">
                Filter <Icon name="arrowRight" className="h-3 w-3" />
              </Link>
            }
          />
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            {data.machinesUnderMaintenance + data.machinesOutOfService === 0 ? (
              <p className="col-span-full py-6 text-center text-xs text-ink-500">
                Every machine is operational.
              </p>
            ) : (
              <>
                {data.machinesUnderMaintenance > 0 && (
                  <Link
                    to="/machines?status=UNDER_MAINTENANCE"
                    className="group flex items-center gap-3 rounded-xl border border-ember-500/20 bg-ember-900/20 p-3.5 transition-colors hover:border-ember-500/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember-400/15 text-ember-300">
                      <Icon name="wrench" className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="num block text-lg font-semibold leading-tight text-ink-50">
                        {data.machinesUnderMaintenance}
                      </span>
                      <span className="text-[11.5px] text-ink-400">Under maintenance</span>
                    </span>
                  </Link>
                )}
                {data.machinesOutOfService > 0 && (
                  <Link
                    to="/machines?status=OUT_OF_SERVICE"
                    className="group flex items-center gap-3 rounded-xl border border-rust-500/20 bg-rust-900/20 p-3.5 transition-colors hover:border-rust-500/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rust-400/15 text-rust-300">
                      <Icon name="alert" className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="num block text-lg font-semibold leading-tight text-ink-50">
                        {data.machinesOutOfService}
                      </span>
                      <span className="text-[11.5px] text-ink-400">Out of service</span>
                    </span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual helpers                                                      */
/* ------------------------------------------------------------------ */

function Gauge({ value }) {
  const radius = 46;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative h-[74px] w-[128px] shrink-0">
      <svg viewBox="0 0 120 68" className="h-full w-full">
        <path
          d="M14 60 A46 46 0 0 1 106 60"
          fill="none"
          stroke="#1E2530"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M14 60 A46 46 0 0 1 106 60"
          fill="none"
          stroke="url(#gaugeFill)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <defs>
          <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2FBF8F" />
            <stop offset="70%" stopColor="#F5A524" />
            <stop offset="100%" stopColor="#E85D5D" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
      <span className={clsx('h-2 w-2 rounded-sm', color)} />
      {label}
    </span>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = {
    azure: 'text-azure-300',
    ember: 'text-ember-300',
    rust: 'text-rust-300',
    mint: 'text-mint-300',
  };
  return (
    <div className="rounded-xl border border-ink-700/80 bg-ink-900/70 px-3.5 py-3">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <p className={clsx('num mt-1 truncate text-lg font-semibold', tones[tone] || 'text-ink-100')}>{value}</p>
    </div>
  );
}

function StockBar({ current, threshold }) {
  const total = Math.max(threshold, current, 1);
  const ratio = Math.max(0.06, Math.min(1, current / total));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
      <div
        className={clsx('h-full rounded-full', current === 0 ? 'bg-rust-400' : 'bg-ember-400')}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 shadow-pop">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-xs text-ink-200">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="capitalize">{entry.dataKey}</span>
          <span className="num ml-auto pl-3 font-medium text-ink-50">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function describeAction(action) {
  switch (action) {
    case 'CREATE':
      return 'created';
    case 'UPDATE':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    case 'LOGIN':
      return 'signed in';
    case 'CLOSE':
      return 'closed';
    case 'REOPEN':
      return 'reopened';
    case 'ASSIGN':
      return 'assigned';
    case 'ADJUST_STOCK':
      return 'adjusted stock on';
    case 'LOG_PARTS':
      return 'logged parts on';
    case 'CHANGE_PASSWORD':
      return 'changed password on';
    case 'START':
      return 'started work on';
    default:
      return action.toLowerCase();
  }
}
