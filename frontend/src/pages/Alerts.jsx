import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Tabs } from '../components/ui/Page.jsx';
import { Badge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { date, relative, titleCase } from '../lib/format.js';

const TYPE_META = {
  LOW_STOCK: { icon: 'box', tone: 'ember' },
  SERVICE_DUE: { icon: 'calendar', tone: 'azure' },
  TICKET_OVERDUE: { icon: 'alert', tone: 'rust' },
};

export default function Alerts() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [type, setType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [scanning, setScanning] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => api.get('/alerts', { type: type || undefined, unreadOnly, page, size: 15 }),
    [type, unreadOnly, page],
  );

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await api.post('/alerts/scan');
      const total = result.lowStockAlerts + result.serviceDueAlerts + result.overdueTicketAlerts;
      toast.success(
        total === 0
          ? 'Scan complete — nothing new.'
          : `Scan raised ${total} new alert${total === 1 ? '' : 's'}${
              result.emailsSent ? ` and sent ${result.emailsSent} e-mail(s)` : ''
            }.`,
      );
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setScanning(false);
    }
  };

  const markAll = async () => {
    try {
      const result = await api.post('/alerts/read-all');
      toast.success(`${result.updated} alert(s) marked as read.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const markOne = async (alert) => {
    try {
      await api.patch(`/alerts/${alert.id}/read`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts"
        subtitle="Low stock, service intervals and stale tickets. E-mail digests are sent when a scan raises something new."
        actions={
          <>
            {isAdmin && (
              <button type="button" className="btn-primary" onClick={runScan} disabled={scanning}>
                {scanning ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />}
                Run scan now
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={markAll}>
              <Icon name="check" className="h-4 w-4" /> Mark all read
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={type}
          onChange={(value) => {
            setType(value);
            setPage(0);
          }}
          items={[
            { value: '', label: 'All types' },
            { value: 'LOW_STOCK', label: 'Low stock' },
            { value: 'SERVICE_DUE', label: 'Service due' },
            { value: 'TICKET_OVERDUE', label: 'Stale tickets' },
          ]}
        />
        <label className="sm:ml-auto">
          <button
            type="button"
            onClick={() => {
              setUnreadOnly((value) => !value);
              setPage(0);
            }}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
              unreadOnly
                ? 'border-ember-500/50 bg-ember-500/10 text-ember-300'
                : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600',
            )}
          >
            <Icon name="bell" className="h-4 w-4" /> Unread only
          </button>
        </label>
      </div>

      <div className="panel-flush overflow-hidden">
        {error ? (
          <EmptyState title="Could not load alerts" message={error.message} />
        ) : loading ? (
          <LoadingBlock rows={8} />
        ) : data?.content?.length === 0 ? (
          <EmptyState
            icon={<Icon name="bell" className="h-6 w-6" />}
            title={unreadOnly ? 'Inbox zero' : 'No alerts of this type'}
            message={
              unreadOnly
                ? 'Everything has been acknowledged. Run a scan to check the floor again.'
                : 'Run a scan to check stock levels and service intervals.'
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-ink-700/60">
              {data.content.map((alert) => {
                const meta = TYPE_META[alert.type] || { icon: 'bell', tone: 'neutral' };
                return (
                  <li
                    key={alert.id}
                    className={clsx(
                      'group flex gap-4 px-4 py-4 transition-colors hover:bg-ink-800/50',
                      !alert.unread && 'opacity-55',
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                        meta.tone === 'rust' && 'border-rust-500/30 bg-rust-900/30 text-rust-300',
                        meta.tone === 'ember' && 'border-ember-500/30 bg-ember-900/30 text-ember-300',
                        meta.tone === 'azure' && 'border-azure-500/30 bg-azure-900/40 text-azure-300',
                        meta.tone === 'neutral' && 'border-ink-600 bg-ink-900 text-ink-400',
                      )}
                    >
                      <Icon name={meta.icon} className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-medium text-ink-50">{alert.title}</p>
                        <Badge
                          tone={
                            alert.severity === 'CRITICAL'
                              ? 'rust'
                              : alert.severity === 'WARNING'
                                ? 'ember'
                                : 'azure'
                          }
                        >
                          {titleCase(alert.severity)}
                        </Badge>
                        <Badge tone="neutral">{titleCase(alert.type)}</Badge>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{alert.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-600">
                        <span className="flex items-center gap-1">
                          <Icon name="calendar" className="h-3 w-3" /> {date(alert.createdAt, { withTime: true })}
                        </span>
                        <span>{relative(alert.createdAt)}</span>
                        {alert.emailedAt && (
                          <span className="flex items-center gap-1 text-mint-500">
                            <Icon name="check" className="h-3 w-3" /> e-mail sent
                          </span>
                        )}
                        {alert.referenceType === 'Machine' && (
                          <Link
                            to={`/machines/${alert.referenceId}`}
                            className="font-medium text-ember-400 hover:text-ember-300"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open machine
                          </Link>
                        )}
                        {alert.referenceType === 'MaintenanceTicket' && (
                          <Link
                            to={`/tickets/${alert.referenceId}`}
                            className="font-medium text-ember-400 hover:text-ember-300"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open ticket
                          </Link>
                        )}
                        {alert.referenceType === 'SparePart' && (
                          <Link
                            to={`/parts?q=${encodeURIComponent(alert.title)}`}
                            className="font-medium text-ember-400 hover:text-ember-300"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View parts
                          </Link>
                        )}
                      </div>
                    </div>

                    {alert.unread && (
                      <button
                        type="button"
                        onClick={() => markOne(alert)}
                        className="btn-subtle h-8 shrink-0 self-center px-2.5 text-[11.5px] opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Mark read
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination page={data} onChange={setPage} compact={false} />
          </>
        )}
      </div>
    </div>
  );
}
