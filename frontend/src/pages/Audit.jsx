import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync, useDebouncedValue } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/ui/Page.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { SearchInput } from '../components/ui/Forms.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState, LoadingBlock } from '../components/ui/EmptyState.jsx';
import { date, relative } from '../lib/format.js';

export default function Audit() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, loading, error } = useAsync(
    () => api.get('/audit', { page, size: 20 }),
    [page],
  );

  const filtered = (data?.content ?? []).filter((entry) => {
    if (!debouncedQuery) return true;
    const haystack = `${entry.actorName} ${entry.action} ${entry.entity} ${entry.details ?? ''}`.toLowerCase();
    return haystack.includes(debouncedQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit trail"
        subtitle="An append-only record of every write the API performs. Auditors can read it; nobody can edit it."
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Filter this page…" className="w-full sm:w-72" />}
      />

      {!isAdmin && (
        <div className="flex items-center gap-2.5 rounded-xl border border-azure-500/20 bg-azure-900/20 px-4 py-3 text-[12.5px] text-azure-200">
          <Icon name="lock" className="h-4 w-4 shrink-0" />
          You are signed in as a viewer. This view is read-only.
        </div>
      )}

      <div className="panel-flush overflow-hidden">
        {error ? (
          <EmptyState title="Could not load the audit trail" message={error.message} />
        ) : loading ? (
          <LoadingBlock rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="history" className="h-6 w-6" />}
            title="Nothing recorded"
            message="Actions appear here as soon as someone signs in or changes something."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead className="bg-ink-900/80">
                  <tr>
                    <th className="table-th pl-4">When</th>
                    <th className="table-th">Actor</th>
                    <th className="table-th">Action</th>
                    <th className="table-th">Entity</th>
                    <th className="table-th">Details</th>
                    <th className="table-th pr-4">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="table-row">
                      <td className="table-td pl-4">
                        <p className="text-ink-300">{relative(entry.createdAt)}</p>
                        <p className="text-[11px] text-ink-600">{date(entry.createdAt, { withTime: true })}</p>
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-ink-100">{entry.actorName || 'System'}</p>
                        {entry.actorRole && (
                          <p className="text-[11px] uppercase tracking-wider text-ink-600">{entry.actorRole}</p>
                        )}
                      </td>
                      <td className="table-td">
                        <span
                          className={clsx(
                            'inline-flex rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium',
                            entry.action === 'DELETE' && 'border-rust-500/30 bg-rust-900/40 text-rust-300',
                            entry.action === 'CREATE' && 'border-mint-500/30 bg-mint-900/40 text-mint-300',
                            entry.action === 'LOGIN' && 'border-ink-600 bg-ink-800 text-ink-400',
                            !['DELETE', 'CREATE', 'LOGIN'].includes(entry.action) &&
                              'border-ember-500/25 bg-ember-900/30 text-ember-300',
                          )}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="table-td">
                        <p className="text-ink-200">{entry.entity}</p>
                        {entry.entityId && <p className="num text-[11px] text-ink-600">#{entry.entityId}</p>}
                      </td>
                      <td className="table-td max-w-[320px]">
                        <p className="truncate text-ink-400" title={entry.details || ''}>
                          {entry.details || '—'}
                        </p>
                      </td>
                      <td className="table-td num pr-4 text-[11.5px] text-ink-600">{entry.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
