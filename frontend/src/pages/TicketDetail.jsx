import { useEffect, useMemo, useState } from 'react';
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
import { Modal } from '../components/ui/Modal.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { date, money, relative, titleCase } from '../lib/format.js';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAdmin, canEdit } = useAuth();

  const { data: ticket, loading, error, reload } = useAsync(() => api.get(`/tickets/${id}`), [id]);
  const { data: parts } = useAsync(() => api.get('/parts', { size: 100, sort: 'name,asc' }), []);
  const { data: technicians } = useAsync(
    () => (isAdmin ? api.get('/users/technicians') : Promise.resolve([])),
    [isAdmin],
  );

  const [logging, setLogging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [busy, setBusy] = useState(false);

  const canWork = useMemo(() => {
    if (!ticket || !user) return false;
    if (isAdmin) return true;
    if (user.role !== 'TECHNICIAN') return false;
    return ticket.assignedTechnician?.id === user.id;
  }, [ticket, user, isAdmin]);

  const totalCost = useMemo(
    () => (ticket?.parts ?? []).reduce((sum, part) => sum + Number(part.lineCost || 0), 0),
    [ticket],
  );

  if (loading) return <LoadingBlock rows={10} />;
  if (error) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-sm text-rust-300">{error.message}</p>
        <Link to="/tickets" className="btn-ghost mt-4 inline-flex">
          Back to tickets
        </Link>
      </div>
    );
  }

  const isOpen = ticket.status !== 'CLOSED';

  return (
    <div className="space-y-4">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-100"
      >
        <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-180" /> All tickets
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="num text-[12px] font-medium text-ink-400">{ticket.ticketCode}</span>
            <StatusBadge status={ticket.status} />
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
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-50">
            {ticket.title}
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-500">
            Opened {relative(ticket.openedAt)} ·{' '}
            {ticket.createdBy ? `by ${ticket.createdBy.name}` : 'system'}
            {ticket.closedAt && <> · closed {relative(ticket.closedAt)}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canWork && isOpen && ticket.status === 'OPEN' && (
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await api.post(`/tickets/${ticket.id}/start`);
                  toast.success('Work started — ticket is now in progress.');
                  reload();
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              <Icon name="arrowRight" className="h-4 w-4" /> Start work
            </button>
          )}
          {canWork && isOpen && (
            <button type="button" className="btn-ghost" onClick={() => setLogging(true)}>
              <Icon name="box" className="h-4 w-4" /> Log parts
            </button>
          )}
          {canWork && isOpen && (
            <button type="button" className="btn-primary" onClick={() => setClosing(true)}>
              <Icon name="check" className="h-4 w-4" /> Close ticket
            </button>
          )}
          {isAdmin && !isOpen && (
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await api.post(`/tickets/${ticket.id}/reopen`);
                  toast.success('Ticket reopened.');
                  reload();
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              <Icon name="refresh" className="h-4 w-4" /> Reopen
            </button>
          )}
          {isAdmin && isOpen && (
            <button type="button" className="btn-subtle" onClick={() => setAssigning(true)}>
              <Icon name="users" className="h-4 w-4" /> Assign
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="panel">
            <PanelHeader title="Description" />
            <p className="whitespace-pre-wrap px-4 pb-4 text-[13.5px] leading-relaxed text-ink-300">
              {ticket.description || <span className="text-ink-600">No description provided.</span>}
            </p>
          </div>

          <div className="panel">
            <PanelHeader
              title="Parts consumed"
              subtitle="Deducted from inventory inside the ticket's transaction"
              action={
                <span className="num text-[13px] font-medium text-ink-200">{money(totalCost)}</span>
              }
            />
            {ticket.parts.length === 0 ? (
              <EmptyState
                compact
                icon={<Icon name="box" className="h-6 w-6" />}
                title="No parts logged yet"
                message={
                  canWork && isOpen
                    ? 'Log the parts you used — stock is deducted immediately and atomically.'
                    : 'Nothing was consumed on this ticket.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-y border-ink-700 bg-ink-900/60">
                      <th className="table-th pl-4">SKU</th>
                      <th className="table-th">Part</th>
                      <th className="table-th text-right">Qty</th>
                      <th className="table-th text-right">Unit cost</th>
                      <th className="table-th text-right">Line total</th>
                      <th className="table-th pr-4">Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticket.parts.map((part) => (
                      <tr key={part.id} className="border-t border-ink-700/60">
                        <td className="table-td pl-4">
                          <span className="num text-[12px] text-ink-400">{part.sku}</span>
                        </td>
                        <td className="table-td text-ink-200">{part.partName}</td>
                        <td className="table-td num text-right font-medium text-ink-50">
                          {part.quantityUsed}
                        </td>
                        <td className="table-td num text-right text-ink-400">{money(part.unitCost)}</td>
                        <td className="table-td num text-right text-ink-200">{money(part.lineCost)}</td>
                        <td className="table-td pr-4 text-[11.5px] text-ink-500">
                          {part.loggedByName ?? 'system'}
                          <span className="block">{relative(part.loggedAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-ink-700 bg-ink-900/40">
                      <td colSpan={4} className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-ink-500">
                        Total parts cost
                      </td>
                      <td className="num px-4 py-2.5 text-right text-sm font-semibold text-ink-50">
                        {money(totalCost)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {ticket.resolution && (
            <div className="panel">
              <PanelHeader title="Resolution" />
              <p className="whitespace-pre-wrap border-t border-ink-700/60 px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-300">
                {ticket.resolution}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel">
            <PanelHeader title="Details" />
            <dl className="space-y-3 px-4 pb-4">
              <Detail label="Machine">
                <Link
                  to={`/machines/${ticket.machine.id}`}
                  className="text-ink-100 underline decoration-ink-600 underline-offset-4 transition-colors hover:decoration-ember-400"
                >
                  {ticket.machine.name}
                </Link>
                <span className="num block text-[11px] text-ink-500">{ticket.machine.code}</span>
              </Detail>
              <Detail label="Location">{ticket.machine.location || '—'}</Detail>
              <Detail label="Technician">
                {ticket.assignedTechnician?.name ?? (
                  <span className="text-ink-600">Unassigned</span>
                )}
              </Detail>
              <Detail label="Opened">
                {date(ticket.openedAt, { withTime: true })}
                <span className="block text-[11px] text-ink-600">{relative(ticket.openedAt)}</span>
              </Detail>
              {ticket.closedAt && (
                <Detail label="Closed">
                  {date(ticket.closedAt, { withTime: true })}
                  <span className="block text-[11px] text-ink-600">{relative(ticket.closedAt)}</span>
                </Detail>
              )}
              <Detail label="Machine status">
                <StatusBadge status={ticket.machine.status} />
              </Detail>
            </dl>
          </div>

          <div className="panel">
            <PanelHeader title="Next service" subtitle="Rescheduled when this ticket closes" />
            <div className="px-4 pb-4">
              <p className="num text-lg font-semibold text-ink-50">
                {date(ticket.machine.nextServiceAt)}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-500">
                Interval {ticket.machine.serviceIntervalDays || 90} days
              </p>
            </div>
          </div>
        </div>
      </section>

      <PartsModal
        open={logging}
        mode="log"
        ticket={ticket}
        parts={parts?.content ?? []}
        onClose={() => setLogging(false)}
        onDone={() => {
          setLogging(false);
          reload();
        }}
      />

      <PartsModal
        open={closing}
        mode="close"
        ticket={ticket}
        parts={parts?.content ?? []}
        onClose={() => setClosing(false)}
        onDone={() => {
          setClosing(false);
          reload();
        }}
      />

      <AssignModal
        open={assigning}
        ticket={ticket}
        technicians={technicians ?? []}
        onClose={() => setAssigning(false)}
        onDone={() => {
          setAssigning(false);
          reload();
        }}
      />
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="border-b border-ink-700/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-500">{label}</dt>
      <dd className="mt-1 text-[13px] text-ink-200">{children}</dd>
    </div>
  );
}

/**
 * One modal, two modes: "log" deducts parts on an open ticket, "close" deducts
 * them and closes the ticket in a single request.
 */
function PartsModal({ open, mode, ticket, parts, onClose, onDone }) {
  const toast = useToast();
  const [lines, setLines] = useState([]);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLines(parts.length ? [{ partId: '', quantity: 1 }] : []);
    setResolution('');
  }, [open, parts]);

  const availableFor = (partId) => parts.find((part) => part.id === Number(partId));

  const addLine = () => setLines((current) => [...current, { partId: '', quantity: 1 }]);

  const removeLine = (index) =>
    setLines((current) => (current.length === 1 ? [{ partId: '', quantity: 1 }] : current.filter((_, i) => i !== index)));

  const valid = lines.some((line) => line.partId && Number(line.quantity) > 0);
  const overDrawn = lines.some((line) => {
    const part = availableFor(line.partId);
    return part && Number(line.quantity) > part.quantityOnHand;
  });

  const submit = async () => {
    setBusy(true);
    try {
      const items = lines
        .filter((line) => line.partId && Number(line.quantity) > 0)
        .map((line) => ({ partId: Number(line.partId), quantity: Number(line.quantity) }));

      if (mode === 'close') {
        await api.post(`/tickets/${ticket.id}/close`, { resolution, items });
        toast.success(
          items.length
            ? `Ticket closed — ${items.reduce((sum, item) => sum + item.quantity, 0)} unit(s) deducted from inventory.`
            : 'Ticket closed.',
        );
      } else {
        await api.post(`/tickets/${ticket.id}/parts`, { items });
        toast.success('Parts logged and stock deducted.');
      }
      onDone();
    } catch (err) {
      toast.error(err.message, { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={mode === 'close' ? 'Close ticket' : 'Log consumed parts'}
      subtitle={
        mode === 'close'
          ? 'Everything below is written in one transaction. If any part is short, nothing changes.'
          : 'Stock is deducted immediately and recorded against this ticket.'
      }
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={busy || !valid || overDrawn}
          >
            {busy ? <Spinner /> : <Icon name={mode === 'close' ? 'check' : 'box'} className="h-4 w-4" />}
            {mode === 'close' ? 'Deduct & close' : 'Deduct stock'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {lines.map((line, index) => {
          const part = availableFor(line.partId);
          const exceeds = part && Number(line.quantity) > part.quantityOnHand;
          return (
            <div key={index} className="rounded-xl border border-ink-700 bg-ink-900/70 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_110px_36px]">
                <Field label={index === 0 ? 'Part' : undefined}>
                  <Select
                    value={line.partId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLines((current) =>
                        current.map((item, i) => (i === index ? { ...item, partId: value } : item)),
                      );
                    }}
                  >
                    <option value="">Select a part…</option>
                    {parts.map((option) => (
                      <option key={option.id} value={option.id} disabled={option.quantityOnHand === 0}>
                        {option.sku} — {option.name} ({option.quantityOnHand} on hand)
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={index === 0 ? 'Quantity' : undefined}>
                  <TextInput
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLines((current) =>
                        current.map((item, i) => (i === index ? { ...item, quantity: value } : item)),
                      );
                    }}
                    className={clsx(exceeds && 'border-rust-500/60')}
                  />
                </Field>
                <div className={clsx('flex items-end', index === 0 ? 'pb-[2px]' : 'pb-[2px]')}>
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-ink-500 transition-colors hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
                    aria-label="Remove line"
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                {part ? (
                  <p className="text-[11.5px] text-ink-500">
                    <span className="num text-ink-300">{part.quantityOnHand}</span> on hand ·{' '}
                    <span className="num">{money(part.unitPrice)}</span> each ·{' '}
                    <span
                      className={clsx(
                        'num',
                        part.lowStock ? 'text-ember-300' : 'text-ink-500',
                      )}
                    >
                      threshold {part.reorderThreshold}
                    </span>
                  </p>
                ) : (
                  <span />
                )}
                {exceeds && (
                  <Badge tone="rust" dot>
                    Exceeds available stock
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addLine}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-600 py-2 text-[12.5px] font-medium text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-200"
        >
          <Icon name="plus" className="h-3.5 w-3.5" /> Add another part
        </button>

        {mode === 'close' && (
          <Field
            label="Resolution notes"
            hint="What was wrong, what you did, and anything the next technician should watch."
          >
            <textarea
              rows={3}
              className="field resize-none"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Replaced both spindle bearings and re-torqued the locknut. Vibration back within tolerance."
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function AssignModal({ open, ticket, technicians, onClose, onDone }) {
  const toast = useToast();
  const [technicianId, setTechnicianId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTechnicianId(ticket.assignedTechnician?.id ? String(ticket.assignedTechnician.id) : '');
  }, [open, ticket]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/tickets/${ticket.id}/assign`, { technicianId: Number(technicianId) });
      toast.success('Ticket assigned.');
      onDone();
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
      title="Assign technician"
      subtitle={`${ticket.ticketCode} · ${ticket.title}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy || !technicianId}>
            {busy ? <Spinner /> : null} Assign
          </button>
        </>
      }
    >
      <Select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
        <option value="">Select a technician…</option>
        {technicians.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.name} — {titleCase(tech.role)}
          </option>
        ))}
      </Select>
    </Modal>
  );
}
