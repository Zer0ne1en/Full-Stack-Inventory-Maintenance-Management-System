import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../lib/api.js';
import { useAsync, useDebouncedValue } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui/Page.jsx';
import { Badge, RoleBadge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, Select, TextInput, SearchInput, Toggle } from '../components/ui/Forms.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState, LoadingBlock, Spinner } from '../components/ui/EmptyState.jsx';
import { date, initials, titleCase } from '../lib/format.js';

const ROLE_OPTIONS = ['ADMIN', 'TECHNICIAN', 'VIEWER'];

export default function Users() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, loading, error, reload } = useAsync(
    () =>
      api.get('/users', {
        q: debouncedQuery || undefined,
        role: role || undefined,
        page,
        size: 12,
        sort: 'name,asc',
      }),
    [debouncedQuery, role, page],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        subtitle="Admins manage the catalogue and assignments. Technicians work tickets. Viewers are read-only auditors."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" className="h-4 w-4" /> Add user
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
          placeholder="Search name or email…"
          className="w-full sm:w-80"
        />
        <div className="relative w-full sm:w-56">
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(0);
            }}
            className="field appearance-none pr-9"
          >
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        </div>
      </div>

      <div className="panel-flush overflow-hidden">
        {error ? (
          <EmptyState title="Could not load users" message={error.message} />
        ) : loading ? (
          <LoadingBlock rows={8} />
        ) : data?.content?.length === 0 ? (
          <EmptyState
            icon={<Icon name="users" className="h-6 w-6" />}
            title="No users found"
            message="Try a different search term or role filter."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-ink-900/80">
                  <tr>
                    <th className="table-th pl-4">User</th>
                    <th className="table-th">Role</th>
                    <th className="table-th text-right">Open tickets</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Created</th>
                    <th className="table-th w-12 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-td pl-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={clsx(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[11px] font-semibold',
                              user.role === 'ADMIN' && 'bg-[#7c6cf6]/15 text-[#b3a9ff]',
                              user.role === 'TECHNICIAN' && 'bg-ember-400/15 text-ember-300',
                              user.role === 'VIEWER' && 'bg-azure-400/15 text-azure-300',
                            )}
                          >
                            {initials(user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-50">{user.name}</p>
                            <p className="truncate text-[11.5px] text-ink-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="table-td num text-right text-ink-200">{user.openTickets}</td>
                      <td className="table-td">
                        {user.enabled ? (
                          <Badge tone="mint" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="neutral" dot>
                            Disabled
                          </Badge>
                        )}
                      </td>
                      <td className="table-td text-ink-400">{date(user.createdAt)}</td>
                      <td className="table-td pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => setEditing(user)}
                          className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
                          aria-label={`Edit ${user.name}`}
                        >
                          <Icon name="settings" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </div>

      <CreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          reload();
        }}
      />

      <EditUserModal
        open={!!editing}
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

function CreateUserModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TECHNICIAN' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({ name: '', email: '', password: '', role: 'TECHNICIAN' });
  }, [open]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.post('/users', form);
      toast.success(`Account created for ${form.email}.`);
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
      title="Add a user"
      subtitle="Passwords are hashed with BCrypt before they are stored."
      size="md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null} Create account
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <Field label="Full name" required error={errors.name}>
          <TextInput value={form.name} onChange={set('name')} placeholder="Ananya Das" autoFocus />
        </Field>
        <Field label="Email" required error={errors.email}>
          <TextInput type="email" value={form.email} onChange={set('email')} placeholder="ananya@plant.example" />
        </Field>
        <Field label="Temporary password" required error={errors.password} hint="At least 8 characters.">
          <TextInput type="password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Role" required error={errors.role}>
          <Select value={form.role} onChange={set('role')}>
            {ROLE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)} — {describeRole(value)}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

function EditUserModal({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', role: 'VIEWER', enabled: true, password: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setForm({ name: user.name, role: user.role, enabled: user.enabled, password: '' });
  }, [open, user]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { name: form.name, role: form.role, enabled: form.enabled };
      if (form.password) payload.password = form.password;
      await api.patch(`/users/${user.id}`, payload);
      toast.success(`${user.name} updated.`);
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
      title={`Edit ${user?.name ?? ''}`}
      subtitle={user?.email}
      size="md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="user-edit-form" className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : null} Save changes
          </button>
        </>
      }
    >
      <form id="user-edit-form" onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <TextInput
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label="Role">
          <Select
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            {ROLE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </Field>
        <Toggle
          checked={form.enabled}
          onChange={(value) => setForm((current) => ({ ...current, enabled: value }))}
          label="Account enabled"
          description="Disabled users cannot sign in and are removed from assignment lists."
        />
        <Field label="Reset password" hint="Leave blank to keep the current password.">
          <TextInput
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="New password (optional)"
          />
        </Field>
      </form>
    </Modal>
  );
}

function describeRole(role) {
  if (role === 'ADMIN') return 'full control';
  if (role === 'TECHNICIAN') return 'works tickets';
  return 'read-only auditor';
}
