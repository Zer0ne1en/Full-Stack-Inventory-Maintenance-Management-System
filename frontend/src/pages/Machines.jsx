import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync, useDebouncedValue } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Tabs } from '../components/ui/Page.jsx';
import { Badge, StatusBadge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, Select, TextInput, SearchInput } from '../components/ui/Forms.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { date, daysUntil, number } from '../lib/format.js';

const EMPTY_FORM = {
  name: '',
  code: '',
  manufacturer: '',
  model: '',
  location: '',
  status: 'OPERATIONAL',
  installedOn: '',
  lastServiceAt: '',
  nextServiceAt: '',
  serviceIntervalDays: 90,
  notes: '',
};

export default function Machines() {
  const { canEdit } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const page = Number(params.get('page') || 0);
  const status = params.get('status') || '';
  const [query, setQuery] = useState(params.get('q') || '');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [size, setSize] = useState(10);
  const [editing, setEditing] = useState(null); // null | 'new' | machine object
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

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
      setEditing('new');
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const { data, loading, error, reload } = useAsync(
    () =>
      api.get('/machines', {
        q: debouncedQuery || undefined,
        status: status || undefined,
        page,
        size,
        sort: 'name,asc',
      }),
    [debouncedQuery, status, page, size],
  );

  const counts = useMemo(() => {
    const total = data?.totalElements ?? 0;
    return { all: total };
  }, [data]);

  const setStatusFilter = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('status', value);
    else next.delete('status');
    next.delete('page');
    setParams(next);
  };

  const openNew = () => setEditing('new');
  const openEdit = (machine) => setEditing(machine);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Machines"
        subtitle="Every asset on the floor, its service interval and the work open against it."
        actions={
          canEdit && (
            <button type="button" className="btn-primary" onClick={openNew}>
              <Icon name="plus" className="h-4 w-4" /> Register machine
            </button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          className="w-fit"
          value={status}
          onChange={setStatusFilter}
          items={[
            { value: '', label: 'All machines' },
            { value: 'OPERATIONAL', label: 'Operational' },
            { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' },
            { value: 'OUT_OF_SERVICE', label: 'Out of service' },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, code, location…"
          className="w-full sm:ml-auto sm:w-72"
        />
      </div>

      <div className="panel-flush overflow-hidden">
        {error ? (
          <EmptyState title="Could not load machines" message={error.message} />
        ) : loading ? (
          <LoadingBlock rows={8} />
        ) : data?.content?.length === 0 ? (
          <EmptyState
            icon={<Icon name="machine" className="h-6 w-6" />}
            title={query || status ? 'No machines match those filters' : 'No machines registered yet'}
            message={
              query || status
                ? 'Try a different search term or clear the status filter.'
                : 'Register the first asset to start tracking its service schedule.'
            }
            action={
              canEdit && !query && !status ? (
                <button type="button" className="btn-primary" onClick={openNew}>
                  <Icon name="plus" className="h-4 w-4" /> Register machine
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead className="bg-ink-900/80">
                  <tr>
                    <th className="table-th pl-4">Machine</th>
                    <th className="table-th">Location</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Last service</th>
                    <th className="table-th">Next service</th>
                    <th className="table-th text-right">Open tickets</th>
                    <th className="table-th w-12" />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((machine) => {
                    const days = daysUntil(machine.nextServiceAt);
                    const overdue = days !== null && days < 0;
                    return (
                      <tr
                        key={machine.id}
                        onClick={() => navigate(`/machines/${machine.id}`)}
                        className="table-row cursor-pointer"
                      >
                        <td className="table-td pl-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-700 bg-ink-900 text-ink-400">
                              <Icon name="machine" className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-50">{machine.name}</p>
                              <p className="num text-[11px] text-ink-500">
                                {machine.code}
                                {machine.manufacturer ? ` · ${machine.manufacturer}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="table-td text-ink-300">{machine.location || '—'}</td>
                        <td className="table-td">
                          <StatusBadge status={machine.status} />
                        </td>
                        <td className="table-td">
                          <span className="text-ink-300">{date(machine.lastServiceAt)}</span>
                        </td>
                        <td className="table-td">
                          {machine.nextServiceAt ? (
                            <div className="flex items-center gap-2">
                              <span className={clsx('text-ink-300', overdue && 'text-rust-300')}>
                                {date(machine.nextServiceAt)}
                              </span>
                              {days !== null && days <= 14 && (
                                <Badge tone={overdue ? 'rust' : 'ember'}>
                                  {overdue ? `${Math.abs(days)}d overdue` : `${days}d`}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink-600">Not scheduled</span>
                          )}
                        </td>
                        <td className="table-td num text-right">{machine.openTickets}</td>
                        <td className="table-td pr-4 text-right">
                          <Icon name="chevronRight" className="ml-auto h-4 w-4 text-ink-600" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data} onChange={(next) => setParams({ ...Object.fromEntries(params), page: next })} />
          </>
        )}
      </div>

      <MachineModal
        open={!!editing}
        machine={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api.delete(`/machines/${deleting.id}`);
            toast.success(`Machine ${deleting.code} deleted.`);
            setDeleting(null);
            reload();
          } catch (err) {
            toast.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
        title={`Delete ${deleting?.code ?? ''}?`}
        message="This permanently removes the machine. It is blocked while the machine has open tickets or any maintenance history."
        confirmLabel="Delete machine"
        danger
        busy={busy}
      />
    </div>
  );
}

function MachineModal({ open, machine, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!machine;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (machine) {
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
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, machine]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        serviceIntervalDays: Number(form.serviceIntervalDays) || 0,
        installedOn: form.installedOn || null,
        lastServiceAt: form.lastServiceAt || null,
        nextServiceAt: form.nextServiceAt || null,
      };
      if (isEdit) {
        await api.put(`/machines/${machine.id}`, payload);
        toast.success(`Machine ${form.code} updated.`);
      } else {
        await api.post('/machines', payload);
        toast.success(`Machine ${form.code} registered.`);
      }
      onSaved();
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
      title={isEdit ? `Edit ${machine.code}` : 'Register a machine'}
      subtitle="The service interval drives the automatic service-due alerts."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="machine-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null}
            {isEdit ? 'Save changes' : 'Register machine'}
          </button>
        </>
      }
    >
      <form id="machine-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Machine name" required error={errors.name} className="sm:col-span-2">
          <TextInput value={form.name} onChange={set('name')} placeholder="CNC Milling Center VX-900" autoFocus />
        </Field>
        <Field label="Asset code" required error={errors.code} hint="Unique, e.g. CNC-0042">
          <TextInput value={form.code} onChange={set('code')} placeholder="CNC-0042" />
        </Field>
        <Field label="Status" error={errors.status}>
          <Select value={form.status} onChange={set('status')}>
            <option value="OPERATIONAL">Operational</option>
            <option value="UNDER_MAINTENANCE">Under maintenance</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </Select>
        </Field>
        <Field label="Manufacturer" error={errors.manufacturer}>
          <TextInput value={form.manufacturer} onChange={set('manufacturer')} placeholder="Haas" />
        </Field>
        <Field label="Model" error={errors.model}>
          <TextInput value={form.model} onChange={set('model')} placeholder="VF-2SS" />
        </Field>
        <Field label="Location" error={errors.location} className="sm:col-span-2">
          <TextInput value={form.location} onChange={set('location')} placeholder="Bay A · Cell 1" />
        </Field>
        <Field label="Installed on">
          <TextInput type="date" value={form.installedOn} onChange={set('installedOn')} />
        </Field>
        <Field label="Last service">
          <TextInput type="date" value={form.lastServiceAt} onChange={set('lastServiceAt')} />
        </Field>
        <Field label="Next service" error={errors.nextServiceAt}>
          <TextInput type="date" value={form.nextServiceAt} onChange={set('nextServiceAt')} />
        </Field>
        <Field label="Service interval (days)" error={errors.serviceIntervalDays}>
          <TextInput
            type="number"
            min="0"
            value={form.serviceIntervalDays}
            onChange={set('serviceIntervalDays')}
          />
        </Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2">
          <textarea
            rows={3}
            className="field resize-none"
            value={form.notes}
            onChange={set('notes')}
            placeholder="Anything the next technician should know…"
          />
        </Field>
      </form>
    </Modal>
  );
}
