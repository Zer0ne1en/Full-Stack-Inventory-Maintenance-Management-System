import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PanelHeader } from '../components/ui/Page.jsx';
import { Badge, StatusBadge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, Select, TextInput } from '../components/ui/Forms.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { date, daysUntil, relative, titleCase } from '../lib/format.js';

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { canEdit } = useAuth();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: machine, loading, error, reload } = useAsync(() => api.get(`/machines/${id}`), [id]);
  const { data: tickets, reload: reloadTickets } = useAsync(
    () => api.get(`/machines/${id}/tickets`, { page, size: 8, sort: 'openedAt,desc' }),
    [id, page],
  );

  if (loading) return <LoadingBlock rows={8} />;
  if (error) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-sm text-rust-300">{error.message}</p>
        <Link to="/machines" className="btn-ghost mt-4 inline-flex">
          Back to machines
        </Link>
      </div>
    );
  }

  const days = daysUntil(machine.nextServiceAt);
  const overdue = days !== null && days < 0;
  const closedTickets = tickets?.content?.filter((ticket) => ticket.status === 'CLOSED') ?? [];

  return (
    <div className="space-y-4">
      <Link
        to="/machines"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-100"
      >
        <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-180" /> All machines
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-700 bg-ink-900 text-ember-400">
            <Icon name="machine" className="h-7 w-7" strokeWidth={1.4} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
                {machine.name}
              </h2>
              <StatusBadge status={machine.status} />
            </div>
            <p className="num mt-1 text-[12.5px] text-ink-500">
              {machine.code}
              {machine.manufacturer ? ` · ${machine.manufacturer}` : ''}
              {machine.model ? ` · ${machine.model}` : ''}
            </p>
            {machine.location && (
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-400">
                <Icon name="pin" className="h-3.5 w-3.5" /> {machine.location}
              </p>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>
              <Icon name="settings" className="h-4 w-4" /> Edit
            </button>
            <button type="button" className="btn-danger" onClick={() => setDeleting(true)}>
              <Icon name="x" className="h-4 w-4" /> Delete
            </button>
          </div>
        )}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel lg:col-span-2">
          <PanelHeader title="Service schedule" subtitle="Drives the automated service-due alert" />
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3">
            <Fact label="Last service" value={date(machine.lastServiceAt)} sub={relative(machine.lastServiceAt)} />
            <Fact
              label="Next service"
              value={date(machine.nextServiceAt)}
              sub={
                overdue ? (
                  <span className="text-rust-300">{Math.abs(days)} days overdue</span>
                ) : days !== null ? (
                  <span className={clsx(days <= 14 ? 'text-ember-300' : 'text-ink-500')}>
                    in {days} days
                  </span>
                ) : (
                  'Not scheduled'
                )
              }
            />
            <Fact label="Interval" value={`${machine.serviceIntervalDays} days`} sub="service cadence" />
          </div>
          <ScheduleBar machine={machine} days={days} />
        </div>

        <div className="panel">
          <PanelHeader title="At a glance" />
          <dl className="space-y-3 px-4 pb-4">
            <Row label="Installed" value={date(machine.installedOn)} />
            <Row label="Open tickets" value={String(machine.openTickets)} />
            <Row
              label="Service status"
              value={
                machine.serviceDue ? (
                  <Badge tone={overdue ? 'rust' : 'ember'}>Due now</Badge>
                ) : (
                  <Badge tone="mint">On schedule</Badge>
                )
              }
            />
            <Row label="Notes" value={machine.notes || '—'} />
          </dl>
        </div>
      </section>

      <section className="panel-flush overflow-hidden">
        <PanelHeader
          title="Maintenance history"
          subtitle="Every ticket raised against this machine"
          className="border-b border-ink-700/70"
          action={
            canEdit ? (
              <Link to={`/tickets?new=1&machineId=${machine.id}`} className="btn-subtle h-8 px-2.5 text-xs">
                <Icon name="plus" className="h-3.5 w-3.5" /> New ticket
              </Link>
            ) : null
          }
        />
        {tickets?.content?.length === 0 ? (
          <EmptyState
            compact
            icon={<Icon name="ticket" className="h-6 w-6" />}
            title="No maintenance history"
            message="Tickets raised against this machine will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-ink-900/80">
                <tr>
                  <th className="table-th pl-4">Ticket</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Priority</th>
                  <th className="table-th">Technician</th>
                  <th className="table-th">Opened</th>
                </tr>
              </thead>
              <tbody>
                {tickets?.content?.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="table-row cursor-pointer"
                  >
                    <td className="table-td pl-4">
                      <p className="num text-[11px] text-ink-500">{ticket.ticketCode}</p>
                      <p className="max-w-[340px] truncate text-[13px] font-medium text-ink-100">
                        {ticket.title}
                      </p>
                    </td>
                    <td className="table-td">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="table-td">
                      <Badge
                        tone={
                          ticket.priority === 'CRITICAL'
                            ? 'rust'
                            : ticket.priority === 'HIGH'
                              ? 'ember'
                              : 'neutral'
                        }
                      >
                        {titleCase(ticket.priority)}
                      </Badge>
                    </td>
                    <td className="table-td text-ink-300">
                      {ticket.assignedTechnician?.name ?? <span className="text-ink-600">Unassigned</span>}
                    </td>
                    <td className="table-td text-ink-400">{relative(ticket.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tickets?.totalPages > 1 && (
          <Pagination page={tickets} onChange={setPage} />
        )}
      </section>

      <EditModal
        open={editing}
        machine={machine}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reload();
        }}
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api.delete(`/machines/${machine.id}`);
            toast.success(`Machine ${machine.code} deleted.`);
            navigate('/machines');
          } catch (err) {
            toast.error(err.message);
            setDeleting(false);
          } finally {
            setBusy(false);
          }
        }}
        title={`Delete ${machine.code}?`}
        message="Blocked while the machine has open tickets or any maintenance history."
        confirmLabel="Delete machine"
        danger
        busy={busy}
      />
    </div>
  );
}

function Fact({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-ink-700/80 bg-ink-900/70 px-3.5 py-3">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">{label}</dt>
      <dd className="num mt-1 text-[15px] font-semibold text-ink-50">{value}</dd>
      <dd className="mt-0.5 text-[11.5px] text-ink-500">{sub}</dd>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-700/60 pb-2.5 last:border-0 last:pb-0">
      <dt className="text-[12px] text-ink-500">{label}</dt>
      <dd className="max-w-[200px] text-right text-[12.5px] text-ink-200">{value}</dd>
    </div>
  );
}

function ScheduleBar({ machine, days }) {
  const interval = Math.max(1, machine.serviceIntervalDays || 90);
  const sinceLast = machine.lastServiceAt
    ? Math.max(0, Math.min(interval, -daysUntil(machine.lastServiceAt)))
    : interval;
  const progress = Math.min(100, (sinceLast / interval) * 100);
  return (
    <div className="px-4 pb-5">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-500">
        <span>{machine.lastServiceAt ? 'Consumed since last service' : 'No service recorded'}</span>
        <span className="num">
          {Math.round(progress)}% of {interval}d
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            progress > 100 ? 'bg-rust-400' : progress > 80 ? 'bg-ember-400' : 'bg-mint-400',
          )}
          style={{ width: `${Math.max(3, progress)}%` }}
        />
      </div>
    </div>
  );
}

function EditModal({ open, machine, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !machine) return;
    setForm({
      name: machine.name || '',
      code: machine.code || '',
      manufacturer: machine.manufacturer || '',
      model: machine.model || '',
      location: machine.location || '',
      status: machine.status || 'OPERATIONAL',
      installedOn: machine.installedOn || '',
      lastServiceAt: machine.lastServiceAt || '',
      nextServiceAt: machine.nextServiceAt || '',
      serviceIntervalDays: machine.serviceIntervalDays ?? 90,
      notes: machine.notes || '',
    });
  }, [open, machine]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.put(`/machines/${machine.id}`, {
        ...form,
        serviceIntervalDays: Number(form.serviceIntervalDays) || 0,
        installedOn: form.installedOn || null,
        lastServiceAt: form.lastServiceAt || null,
        nextServiceAt: form.nextServiceAt || null,
      });
      toast.success('Machine updated.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={`Edit ${machine?.code ?? ''}`}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="machine-edit-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null} Save changes
          </button>
        </>
      }
    >
      <form id="machine-edit-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          <TextInput value={form.name || ''} onChange={set('name')} />
        </Field>
        <Field label="Status">
          <Select value={form.status || 'OPERATIONAL'} onChange={set('status')}>
            <option value="OPERATIONAL">Operational</option>
            <option value="UNDER_MAINTENANCE">Under maintenance</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </Select>
        </Field>
        <Field label="Location">
          <TextInput value={form.location || ''} onChange={set('location')} />
        </Field>
        <Field label="Last service">
          <TextInput type="date" value={form.lastServiceAt || ''} onChange={set('lastServiceAt')} />
        </Field>
        <Field label="Next service">
          <TextInput type="date" value={form.nextServiceAt || ''} onChange={set('nextServiceAt')} />
        </Field>
        <Field label="Service interval (days)">
          <TextInput
            type="number"
            min="0"
            value={form.serviceIntervalDays ?? 90}
            onChange={set('serviceIntervalDays')}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea rows={3} className="field resize-none" value={form.notes || ''} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  );
}
