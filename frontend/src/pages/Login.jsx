import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { LogoMark } from '../components/brand/Logo.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Field, TextInput } from '../components/ui/Forms.jsx';
import { Spinner } from '../components/ui/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import hero from '../assets/plant-hero.jpg';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@mainspring.dev', password: 'Admin@123', tone: 'text-[#b3a9ff]' },
  { label: 'Technician', email: 'tech@mainspring.dev', password: 'Tech@123', tone: 'text-ember-300' },
  { label: 'Auditor', email: 'viewer@mainspring.dev', password: 'Viewer@123', tone: 'text-azure-300' },
];

export default function Login() {
  const { login, sessionLost } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@mainspring.dev');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from || '/';

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ----------------------------------------------------------------- */}
      {/* Brand panel                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative hidden overflow-hidden border-r border-ink-800 lg:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-transparent to-ink-950/40" />
        <div className="absolute inset-0 bg-grid opacity-40 mask-fade-b" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-ink-50">Mainspring</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-ink-400">
                Maintenance Systems
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-ember-500/30 bg-ember-900/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ember-300 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ember-400" />
              Plant operations console
            </span>
            <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-tight text-ink-50">
              Keep the line
              <br />
              <span className="text-ember-300">running.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-300">
              One console for every machine, every spare part and every repair — with stock that
              reconciles itself and alerts that arrive before the line stops.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                ['3', 'access roles'],
                ['24/7', 'alert engine'],
                ['0', 'stock drift'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="num text-2xl font-medium text-ink-50">{value}</dt>
                  <dd className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-ink-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-xs text-ink-500">
            Spring Boot · Spring Security · PostgreSQL · React
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Form panel                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-center bg-ink-950 px-5 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark className="h-9 w-9" />
            <p className="font-display text-lg font-semibold text-ink-50">Mainspring</p>
          </div>

          <p className="eyebrow mb-2">Sign in</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
            Access your workspace
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-400">
            Use the credentials issued by your administrator. Demo accounts are listed below.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email address" required>
              <TextInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@plant.example"
                autoComplete="email"
                autoFocus
                required
              />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition-colors hover:text-ink-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name="lock" className="h-4 w-4" />
                </button>
              </div>
            </Field>

            {sessionLost && !error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-ember-500/30 bg-ember-900/30 px-3.5 py-2.5">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-ember-300" />
                <p className="text-[13px] leading-snug text-ember-200">
                  Your session ended. Sign in again to pick up where you left off.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rust-500/30 bg-rust-900/40 px-3.5 py-2.5">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-rust-300" />
                <p className="text-[13px] leading-snug text-rust-200">{error}</p>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary h-11 w-full text-[14px]">
              {busy ? (
                <>
                  <Spinner className="h-4 w-4" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <Icon name="arrowRight" className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-800" />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">
                Demo accounts
              </span>
              <span className="h-px flex-1 bg-ink-800" />
            </div>
            <div className="mt-3 grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError('');
                  }}
                  className={clsx(
                    'group flex items-center justify-between rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-left transition-all hover:border-ink-500 hover:bg-ink-850',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={clsx('h-1.5 w-1.5 rounded-full bg-current opacity-70', account.tone)} />
                    <span className="text-[13px] font-medium text-ink-200">{account.label}</span>
                  </span>
                  <span className="num text-[11.5px] text-ink-500 transition-colors group-hover:text-ink-300">
                    {account.email.split('@')[0]}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-600">
              Click an account to pre-fill. Viewer is read-only; Technician can work tickets; Admin has
              full control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
