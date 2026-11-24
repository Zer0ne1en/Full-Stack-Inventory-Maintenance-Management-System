import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui/Page.jsx';
import { Badge } from '../components/ui/Badges.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, TextInput } from '../components/ui/Forms.jsx';
import { Spinner } from '../components/ui/EmptyState.jsx';
import { date, initials, titleCase } from '../lib/format.js';

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Your account" subtitle="Profile details and password management." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="border-b border-ink-700 px-4 py-4">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-100">Profile</h3>
          </div>
          <div className="flex items-center gap-4 p-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ember-400/15 font-display text-xl font-semibold text-ember-300">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-ink-50">{user?.name}</p>
              <p className="truncate text-[13px] text-ink-400">{user?.email}</p>
              <div className="mt-2">
                <Badge tone={user?.role === 'ADMIN' ? 'violet' : user?.role === 'TECHNICIAN' ? 'ember' : 'azure'}>
                  {titleCase(user?.role || '')}
                </Badge>
              </div>
            </div>
          </div>
          <dl className="grid gap-3 border-t border-ink-700 px-5 py-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-500">Account created</dt>
              <dd className="mt-1 text-[13px] text-ink-200">{date(user?.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-500">Access level</dt>
              <dd className="mt-1 text-[13px] text-ink-200">{describeAccess(user?.role)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <div className="border-b border-ink-700 px-4 py-4">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-100">Change password</h3>
            <p className="mt-0.5 text-xs text-ink-500">Minimum 8 characters. You will stay signed in.</p>
          </div>
          <form onSubmit={submit} className="space-y-4 p-5">
            <Field label="Current password" required>
              <TextInput
                type="password"
                value={form.currentPassword}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password" required>
              <TextInput
                type="password"
                value={form.newPassword}
                onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" required error={error}>
              <TextInput
                type="password"
                value={form.confirm}
                onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))}
                autoComplete="new-password"
              />
            </Field>
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : <Icon name="lock" className="h-4 w-4" />} Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function describeAccess(role) {
  if (role === 'ADMIN') return 'Full control — catalogue, users, assignments and scans';
  if (role === 'TECHNICIAN') return 'Work assigned tickets, log parts, close jobs';
  return 'Read-only — dashboards, stock levels and audit history';
}
