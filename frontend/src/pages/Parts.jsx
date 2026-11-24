import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync, useDebouncedValue } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui/Page.jsx';
import { Badge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, Select, TextInput, SearchInput } from '../components/ui/Forms.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { money, number } from '../lib/format.js';

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  category: '',
  unitOfMeasure: 'pcs',
  quantityOnHand: 0,
  reorderThreshold: 0,
  unitPrice: '',
};

export default function Parts() {
  const { canEdit } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const page = Number(params.get('page') || 0);
  const lowStock = params.get('lowStock') === '1';
  const [query, setQuery] = useState(params.get('q') || '');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [category, setCategory] = useState('');
  const [size, setSize] = useState(10);
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
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
      api.get('/parts', {
        q: debouncedQuery || undefined,
        category: category || undefined,
        lowStock: lowStock || undefined,
        page,
        size,
        sort: 'name,asc',
      }),
    [debouncedQuery, category, lowStock, page, size],
  );

  const { data: categories } = useAsync(() => api.get('/parts/categories'), []);

  const totalStockValue = useMemo(
    () => (data?.content ?? []).reduce((sum, part) => sum + Number(part.stockValue || 0), 0),
    [data],
  );

  const toggleLowStock = () => {
    const next = new URLSearchParams(params);
    if (lowStock) next.delete('lowStock');
    else next.set('lowStock', '1');
    next.delete('page');
    setParams(next);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Spare parts"
        subtitle="Search by SKU, filter by category, and keep every reorder threshold honest."
        actions={
          canEdit && (
            <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
              <Icon name="plus" className="h-4 w-4" /> Add part
            </button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Parts stocked" value={number(data?.totalElements ?? 0)} />
        <SummaryTile
          label="Below threshold"
          value={String(data?.content?.filter((part) => part.lowStock).length ?? 0)}
          tone="ember"
        />
        <SummaryTile label="Value on this page" value={money(totalStockValue, { compact: true })} tone="mint" />
        <SummaryTile label="Categories" value={String(categories?.length ?? 0)} tone="azure" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search SKU or part name…"
          className="w-full lg:w-80"
        />
        <div className="relative w-full lg:w-56">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="field appearance-none pr-9"
          >
            <option value="">All categories</option>
            {(categories ?? []).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        </div>
        <button
          type="button"
          onClick={toggleLowStock}
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
            lowStock
              ? 'border-ember-500/50 bg-ember-500/10 text-ember-300'
              : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600',
          )}
        >
          <Icon name="alert" className="h-4 w-4" /> Low stock only
        </button>
        <div className="ml-auto flex items-center gap-2 text-[11.5px] text-ink-500">
          <span>Rows</span>
          <select
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="field h-8 w-20 py-1 text-xs"
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
          <EmptyState title="Could not load parts" message={error.message} />
        ) : loading ? (
          <LoadingBlock rows={8} />
        ) : data?.content?.length === 0 ? (
          <EmptyState
            icon={<Icon name="box" className="h-6 w-6" />}
            title="No parts found"
            message={
              lowStock
                ? 'Nothing is at or below its reorder threshold. Nice.'
                : 'Try a different search term, or add the first part to inventory.'
            }
            action={
              canEdit && !lowStock ? (
                <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
                  <Icon name="plus" className="h-4 w-4" /> Add part
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse">
                <thead className="bg-ink-900/80">
                  <tr>
                    <th className="table-th pl-4">Part</th>
                    <th className="table-th">Category</th>
                    <th className="table-th text-right">On hand</th>
                    <th className="table-th text-right">Threshold</th>
                    <th className="table-th text-right">Unit price</th>
                    <th className="table-th text-right">Stock value</th>
                    <th className="table-th">Status</th>
                    <th className="table-th w-24 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((part) => (
                    <tr key={part.id} className="table-row">
                      <td className="table-td pl-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                              part.lowStock
                                ? 'border-ember-500/30 bg-ember-900/30 text-ember-300'
                                : 'border-ink-700 bg-ink-900 text-ink-400',
                            )}
                          >
                            <Icon name="box" className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-medium text-ink-50">{part.name}</p>
                            <p className="num text-[11px] text-ink-500">{part.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-ink-400">{part.category || '—'}</td>
                      <td className="table-td num text-right">
                        <span className={clsx('font-medium', part.lowStock ? 'text-ember-300' : 'text-ink-100')}>
                          {part.quantityOnHand}
                        </span>
                        <span className="ml-1 text-[11px] text-ink-600">{part.unitOfMeasure}</span>
                      </td>
                      <td className="table-td num text-right text-ink-400">{part.reorderThreshold}</td>
                      <td className="table-td num text-right text-ink-300">{money(part.unitPrice)}</td>
                      <td className="table-td num text-right text-ink-200">{money(part.stockValue)}</td>
                      <td className="table-td">
                        {part.lowStock ? (
                          <Badge tone={part.quantityOnHand === 0 ? 'rust' : 'ember'} dot pulse>
                            {part.quantityOnHand === 0 ? 'Out of stock' : 'Low stock'}
                          </Badge>
                        ) : (
                          <Badge tone="mint" dot>
                            Healthy
                          </Badge>
                        )}
                      </td>
                      <td className="table-td pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <IconAction
                                icon="plus"
                                label="Adjust stock"
                                onClick={() => setAdjusting(part)}
                              />
                              <IconAction
                                icon="settings"
                                label="Edit part"
                                onClick={() => setEditing(part)}
                              />
                              <IconAction
                                icon="x"
                                label="Delete part"
                                danger
                                onClick={() => setDeleting(part)}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data} onChange={(next) => setParams({ ...Object.fromEntries(params), page: next })} />
          </>
        )}
      </div>

      <PartModal
        open={!!editing}
        part={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />

      <AdjustModal
        open={!!adjusting}
        part={adjusting}
        onClose={() => setAdjusting(null)}
        onSaved={() => {
          setAdjusting(null);
          reload();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api.delete(`/parts/${deleting.id}`);
            toast.success(`Part ${deleting.sku} deleted.`);
            setDeleting(null);
            reload();
          } catch (err) {
            toast.error(err.message);
            setDeleting(null);
          } finally {
            setBusy(false);
          }
        }}
        title={`Delete ${deleting?.sku ?? ''}?`}
        message="Parts with any consumption history cannot be deleted — the ledger has to stay intact. Lower the reorder threshold to zero to retire one instead."
        confirmLabel="Delete part"
        danger
        busy={busy}
      />
    </div>
  );
}

function SummaryTile({ label, value, tone = 'neutral' }) {
  const tones = {
    ember: 'text-ember-300',
    mint: 'text-mint-300',
    azure: 'text-azure-300',
    neutral: 'text-ink-50',
  };
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <p className={clsx('num mt-1 truncate text-xl font-semibold', tones[tone])}>{value}</p>
    </div>
  );
}

function IconAction({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx(
        'rounded-lg p-1.5 transition-colors',
        danger
          ? 'text-ink-500 hover:bg-rust-500/15 hover:text-rust-300'
          : 'text-ink-500 hover:bg-ink-800 hover:text-ink-100',
      )}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

function PartModal({ open, part, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!part;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      part
        ? {
            sku: part.sku,
            name: part.name,
            description: part.description || '',
            category: part.category || '',
            unitOfMeasure: part.unitOfMeasure || 'pcs',
            quantityOnHand: part.quantityOnHand,
            reorderThreshold: part.reorderThreshold,
            unitPrice: part.unitPrice ?? '',
          }
        : EMPTY_FORM,
    );
  }, [open, part]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        quantityOnHand: Number(form.quantityOnHand) || 0,
        reorderThreshold: Number(form.reorderThreshold) || 0,
        unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice),
      };
      if (isEdit) {
        await api.put(`/parts/${part.id}`, payload);
        toast.success(`Part ${form.sku} updated.`);
      } else {
        await api.post('/parts', payload);
        toast.success(`Part ${form.sku} added to inventory.`);
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
      title={isEdit ? `Edit ${part.sku}` : 'Add a spare part'}
      subtitle="The reorder threshold is what the low-stock alert watches."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="part-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null}
            {isEdit ? 'Save changes' : 'Add part'}
          </button>
        </>
      }
    >
      <form id="part-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU" required error={errors.sku}>
          <TextInput value={form.sku} onChange={set('sku')} placeholder="BRG-6205" autoFocus />
        </Field>
        <Field label="Name" required error={errors.name}>
          <TextInput value={form.name} onChange={set('name')} placeholder="Deep Groove Ball Bearing 6205-2RS" />
        </Field>
        <Field label="Category" error={errors.category}>
          <TextInput value={form.category} onChange={set('category')} placeholder="Bearings" />
        </Field>
        <Field label="Unit of measure" error={errors.unitOfMeasure}>
          <TextInput value={form.unitOfMeasure} onChange={set('unitOfMeasure')} placeholder="pcs" />
        </Field>
        <Field label="Quantity on hand" required error={errors.quantityOnHand}>
          <TextInput type="number" min="0" value={form.quantityOnHand} onChange={set('quantityOnHand')} />
        </Field>
        <Field label="Reorder threshold" required error={errors.reorderThreshold}>
          <TextInput type="number" min="0" value={form.reorderThreshold} onChange={set('reorderThreshold')} />
        </Field>
        <Field label="Unit price (₹)" error={errors.unitPrice}>
          <TextInput type="number" min="0" step="0.01" value={form.unitPrice} onChange={set('unitPrice')} />
        </Field>
        <Field label="Description" error={errors.description} className="sm:col-span-2">
          <textarea
            rows={3}
            className="field resize-none"
            value={form.description}
            onChange={set('description')}
            placeholder="Specifications, compatibility notes…"
          />
        </Field>
      </form>
    </Modal>
  );
}

function AdjustModal({ open, part, onClose, onSaved }) {
  const toast = useToast();
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDelta('');
    setReason('');
  }, [open]);

  const numeric = Number(delta) || 0;
  const projected = (part?.quantityOnHand ?? 0) + numeric;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/parts/${part.id}/adjust`, { delta: numeric, reason });
      toast.success(
        `Stock ${numeric > 0 ? 'increased' : 'decreased'} by ${Math.abs(numeric)} for ${part.sku}.`,
      );
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
      title={`Adjust stock · ${part?.sku ?? ''}`}
      subtitle={`${part?.name ?? ''} — currently ${part?.quantityOnHand ?? 0} ${part?.unitOfMeasure ?? ''} on hand`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            form="adjust-form"
            className="btn-primary"
            disabled={busy || numeric === 0 || projected < 0}
          >
            {busy ? <Spinner /> : null} Apply adjustment
          </button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4">
        <Field
          label="Delta"
          hint="Use a positive number for a receipt or cycle-count correction, negative for a write-off."
        >
          <TextInput
            type="number"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            placeholder="+20"
            autoFocus
          />
        </Field>

        <div
          className={clsx(
            'rounded-xl border px-4 py-3',
            projected < 0
              ? 'border-rust-500/40 bg-rust-900/30'
              : 'border-ink-700 bg-ink-900/70',
          )}
        >
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500">Projected balance</p>
          <p
            className={clsx(
              'num mt-1 text-2xl font-semibold',
              projected < 0 ? 'text-rust-300' : 'text-ink-50',
            )}
          >
            {projected}
          </p>
          {projected < 0 && (
            <p className="mt-1 text-[11.5px] text-rust-300">Stock cannot go negative.</p>
          )}
        </div>

        <Field label="Reason">
          <TextInput
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. goods received note GRN-2291"
          />
        </Field>
      </form>
    </Modal>
  );
}
