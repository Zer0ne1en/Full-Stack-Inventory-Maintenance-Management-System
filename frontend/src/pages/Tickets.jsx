import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync, useDebouncedValue } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Tabs } from '../components/ui/Page.jsx';
import { Badge, StatusBadge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, Select, TextInput, SearchInput } from '../components/ui/Forms.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { date, relative, titleCase } from '../lib/format.js';

const EMPTY_FORM = {
  title: '',
  description: '',
  machineId: '',
  technicianId: '',
  priority: 'MEDIUM',
};

export default function Tickets() {
  const { user, isAdmin, canEdit } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const page = Number(params.get('page') || 0);
  const status = params.get('status') || '';
  const priority = params.get('priority') || '';
  const machineId = params.get('machineId') || '';
  const [query, setQuery] = useState(params.get('q') || '');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [size, setSize] = useState(10);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (debouncedQuery !== (params.get('q') || '')) {
      const next = new URLSearchParams(params);
      if (debouncedQuery) next.set('q', debouncedQuery);
      else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    if (params.get('new')) {
      setCreating(true);
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const { data, loading, error, reload } = useAsync(
    () =>
      api.get('/tickets', {
        q: debouncedQuery || undefined,
        status: status || undefined,
        priority: priority || undefined,
        machineId: machineId || undefined,
        page,
        size,
        sort: 'openedAt,desc',
      }),
    [debouncedQuery, status, priority, machineId, page, size],
  );

  const { data: counts } = useAsync(
    () =>
      Promise.all([
        api.get('/tickets', { status: 'OPEN', size: 1 }),
        api.get('/tickets', { status: 'IN_PROGRESS', size: 1 }),
        api.get('/tickets', { status: 'CLOSED', size: 1 }),
      ]),
    [],
  );

  const { data: machines } = useAsync(() => api.get('/machines', { size: 100, sort: 'name,asc' }), []);
  const { data: technicians } = useAsync(
    () => (isAdmin ? api.get('/users/technicians') : Promise.resolve([])),
    [isAdmin],
  );

  const tabCounts = useMemo(() => {
    if (!counts) return { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 };
    return {
      OPEN: counts[0]?.totalElements ?? 0,
      IN_PROGRESS: counts[1]?.totalElements ?? 0,
      CLOSED: counts[2]?.totalElements ?? 0,
    };
  }, [counts]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const resetFilters = () => {
    setParams({}, { replace: true });
    setQuery('');
    setSize(10);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Maintenance tickets"
        subtitle="Every filter and page change is resolved by the API — no client-side slicing."
        actions={
          isAdmin && (
            <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
              <Icon name="plus" className="h-4 w-4" /> Raise ticket
            </button>
          )
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <Tabs
          value={status}
          onChange={(value) => updateParam('status', value)}
          items={[
            { value: '', label: 'All' },
            { value: 'OPEN', label: 'Open', count: tabCounts.OPEN },
            { value: 'IN_PROGRESS', label: 'In progress', count: tabCounts.IN_PROGRESS },
            { value: 'CLOSED', label: 'Closed', count: tabCounts.CLOSED },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search ticket, title, machine…"
          className="w-full xl:ml-auto xl:w-72"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={priority}
          onChange={(event) => updateParam('priority', event.target.value)}
          className="field h-9 w-40 py-1 text-xs"
        >
          <option value="">Any priority</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </select>

        <select
          value={machineId}
          onChange={(event) => updateParam('machineId', event.target.value)}
          className="field h-9 w-52 py-1 text-xs"
        >
          <option value="">Any machine</option>
          {(machines?.content ?? []).map((machine) => (
            <option key={machine.id} value={machine.id}>
              {machine.code} — {machine.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {(query || priority || machineId || status) && (
            <button type="button" onClick={resetFilters} className="btn-ghost h-9 px-2.5 text-xs">
              <Icon name="x" className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
          <select
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="field h-9 w-20 py-1 text-xs"
          >
            {[10, 25, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-flush overflow-hidden">
        {error ? (
          <EmptyState title="Could not load tickets" message={error.message} />
        ) : loading ? (
          <LoadingBlock rows={8} />
        ) : data?.content?.length === 0 ? (
          <EmptyState
            icon={<Icon name="ticket" className="h-6 w-6" />}
            title="No tickets match"
            message="Try clearing a filter, or raise a new ticket to put work on the board."
            action={
              isAdmin ? (
                <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
                  <Icon name="plus" className="h-4 w-4" /> Raise ticket
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead className="bg-ink-900/80">
                  <tr>
                    <th className="table-th pl-4">Ticket</th>
                    <th className="table-th">Machine</th>
                    <th className="table-th">Priority</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Technician</th>
                    <th className="table-th">Opened</th>
                    <th className="table-th w-12" />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      className="table-row cursor-pointer"
                    >
                      <td className="table-td pl-4">
                        <p className="num text-[11px] text-ink-500">{ticket.ticketCode}</p>
                        <p className="max-w-[320px] truncate text-[13px] font-medium text-ink-50">
                          {ticket.title}
                        </p>
                        {ticket.parts?.length > 0 && (
                          <p className="mt-0.5 text-[11px] text-ink-500">
                            {ticket.parts.length} part line{ticket.parts.length === 1 ? '' : 's'} logged
                          </p>
                        )}
                      </td>
                      <td className="table-td">
                        <p className="max-w-[200px] truncate text-ink-200">{ticket.machine?.name}</p>
                        <p className="num text-[11px] text-ink-500">{ticket.machine?.code}</p>
                      </td>
                      <td className="table-td">
                        <Badge
                          tone={
                            ticket.priority === 'CRITICAL'
                              ? 'rust'
                              : ticket.priority === 'HIGH'
                                ? 'ember'
                                : ticket.priority === 'MEDIUM'
                                  ? 'azure'
                                  : 'neutral'
                          }
                        >
                          {titleCase(ticket.priority)}
                        </Badge>
                      </td>
                      <td className="table-td">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="table-td text-ink-300">
                        {ticket.assignedTechnician?.name ?? (
                          <span className="text-ink-600">Unassigned</span>
                        )}
                      </td>
                      <td className="table-td">
                        <p className="text-ink-300">{relative(ticket.openedAt)}</p>
                        <p className="text-[11px] text-ink-600">{date(ticket.openedAt)}</p>
                      </td>
                      <td className="table-td pr-4 text-right">
                        <Icon name="chevronRight" className="ml-auto h-4 w-4 text-ink-600" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data} onChange={(next) => updateParam('page', String(next))} />
          </>
        )}
      </div>

      <CreateTicketModal
        open={creating}
        machines={machines?.content ?? []}
        technicians={technicians ?? []}
        defaultMachineId={params.get('machineId')}
        onClose={() => setCreating(false)}
        onCreated={(ticket) => {
          setCreating(false);
          reload();
          navigate(`/tickets/${ticket.id}`);
        }}
      />
    </div>
  );
}

function CreateTicketModal({ open, machines, technicians, defaultMachineId, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({ ...EMPTY_FORM, machineId: defaultMachineId || '' });
  }, [open, defaultMachineId]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const ticket = await api.post('/tickets', {
        title: form.title,
        description: form.description,
        machineId: Number(form.machineId),
        technicianId: form.technicianId ? Number(form.technicianId) : null,
        priority: form.priority,
      });
      toast.success(`Ticket ${ticket.ticketCode} raised.`);
      onCreated(ticket);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Raise a maintenance ticket"
      subtitle="Assigning a technician is optional — you can claim it later."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="ticket-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null} Raise ticket
          </button>
        </>
      }
    >
      <form id="ticket-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title} className="sm:col-span-2">
          <TextInput
            value={form.title}
            onChange={set('title')}
            placeholder="Replace spindle bearing on CNC-0042"
            autoFocus
          />
        </Field>
        <Field label="Machine" required error={errors.machineId} className="sm:col-span-2">
          <Select value={form.machineId} onChange={set('machineId')}>
            <option value="">Select a machine…</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.code} — {machine.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Technician" error={errors.technicianId}>
          <Select value={form.technicianId} onChange={set('technicianId')}>
            <option value="">Leave unassigned</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" error={errors.priority}>
          <Select value={form.priority} onChange={set('priority')}>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" error={errors.description} className="sm:col-span-2">
          <textarea
            rows={4}
            className="field resize-none"
            value={form.description}
            onChange={set('description')}
            placeholder="What is wrong, what was observed, and what the machine is doing now…"
          />
        </Field>
      </form>
    </Modal>
  );
}
