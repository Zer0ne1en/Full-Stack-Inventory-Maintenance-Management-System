import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Logo, LogoMark } from '../brand/Logo.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Badge, CountPill } from '../ui/Badges.jsx';
import { initials, titleCase } from '../../lib/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.jsx';

const NAV = [
  {
    label: 'Operations',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/machines', label: 'Machines', icon: 'machine' },
      { to: '/tickets', label: 'Tickets', icon: 'ticket', badge: 'tickets' },
      { to: '/parts', label: 'Spare Parts', icon: 'box', badge: 'lowStock' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/alerts', label: 'Alerts', icon: 'bell', badge: 'unread' },
      { to: '/users', label: 'Users', icon: 'users', adminOnly: true },
      { to: '/audit', label: 'Audit trail', icon: 'history' },
    ],
  },
];

const TITLES = {
  '/': ['Dashboard', 'Plant-wide health at a glance'],
  '/machines': ['Machines', 'Asset register and service schedules'],
  '/tickets': ['Maintenance tickets', 'Work queue, filtered and paginated server-side'],
  '/parts': ['Spare parts', 'Inventory levels and reorder thresholds'],
  '/alerts': ['Alerts', 'Low stock, service due and stale-ticket notifications'],
  '/users': ['Users', 'Accounts, roles and the technician roster'],
  '/audit': ['Audit trail', 'An immutable record of every change'],
  '/profile': ['Your account', 'Profile and password'],
};

/** Cheap polling so sidebar badges stay honest without refetching whole pages. */
function useBadgeStats() {
  const [stats, setStats] = useState({ unread: 0, lowStock: 0, tickets: 0 });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const [unread, lowStock, open] = await Promise.all([
          api.get('/alerts/unread-count').catch(() => ({ count: 0 })),
          api.get('/parts', { lowStock: true, size: 1, page: 0 }).catch(() => ({ totalElements: 0 })),
          api.get('/tickets', { status: 'OPEN', size: 1, page: 0 }).catch(() => ({ totalElements: 0 })),
        ]);
        if (cancelled) return;
        setStats({
          unread: unread?.count ?? 0,
          lowStock: lowStock?.totalElements ?? 0,
          tickets: open?.totalElements ?? 0,
        });
      } catch {
        /* badges are decorative — never block the shell */
      }
    };

    load();
    const timer = setInterval(load, 45000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  return stats;
}

function Sidebar({ open, onClose, stats }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-ink-800 bg-ink-900/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-800 px-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 lg:hidden"
            aria-label="Close navigation"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="eyebrow mb-2 px-3">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const badgeValue = item.badge ? stats[item.badge] : 0;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={onClose}
                          className={({ isActive }) =>
                            clsx(
                              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                              isActive
                                ? 'bg-ink-800 text-ink-50'
                                : 'text-ink-400 hover:bg-ink-800/60 hover:text-ink-100',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-ember-400" />
                              )}
                              <Icon
                                name={item.icon}
                                className={clsx(
                                  'h-[18px] w-[18px] shrink-0',
                                  isActive ? 'text-ember-400' : 'text-ink-500 group-hover:text-ink-300',
                                )}
                              />
                              <span className="flex-1">{item.label}</span>
                              {badgeValue > 0 && (
                                <CountPill
                                  tone={
                                    item.badge === 'unread'
                                      ? 'rust'
                                      : item.badge === 'lowStock'
                                        ? 'ember'
                                        : 'azure'
                                  }
                                >
                                  {badgeValue}
                                </CountPill>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink-800 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-ink-850 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ember-400/15 font-display text-xs font-semibold text-ember-300">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink-100">{user?.name}</p>
              <p className="truncate text-[11px] text-ink-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
              aria-label="Open profile"
            >
              <Icon name="settings" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

const QUICK_ACTIONS = [
  { label: 'New maintenance ticket', to: '/tickets?new=1', icon: 'ticket', adminOnly: true },
  { label: 'Add spare part', to: '/parts?new=1', icon: 'box', adminOnly: true },
  { label: 'Register machine', to: '/machines?new=1', icon: 'machine', adminOnly: true },
  { label: 'Run alert scan', to: '/alerts', icon: 'refresh' },
];

function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  const destinations = useMemo(
    () =>
      NAV.flatMap((group) => group.items)
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => ({ label: item.label, to: item.to, icon: item.icon, group: 'Go to' })),
    [isAdmin],
  );

  const actions = useMemo(
    () =>
      QUICK_ACTIONS.filter((item) => !item.adminOnly || isAdmin).map((item) => ({
        ...item,
        group: 'Action',
      })),
    [isAdmin],
  );

  const results = useMemo(() => {
    const all = [...destinations, ...actions];
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((item) => item.label.toLowerCase().includes(needle));
  }, [query, destinations, actions]);

  useEffect(() => setCursor(0), [query]);

  const go = (item) => {
    onClose();
    navigate(item.to);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} hideClose size="md">
      <div className="-mx-5 -my-4">
        <div className="flex items-center gap-2.5 border-b border-ink-700 px-4 py-3">
          <Icon name="search" className="h-4 w-4 text-ink-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((value) => Math.min(value + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((value) => Math.max(value - 1, 0));
              } else if (event.key === 'Enter' && results[cursor]) {
                event.preventDefault();
                go(results[cursor]);
              }
            }}
            placeholder="Search pages and actions…"
            className="w-full bg-transparent text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
          />
          <kbd className="rounded border border-ink-600 bg-ink-900 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-500">Nothing matches “{query}”.</p>
          ) : (
            ['Go to', 'Action'].map((group) => {
              const items = results.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-1">
                  <p className="eyebrow px-3 pb-1 pt-2">{group}</p>
                  {items.map((item) => {
                    const index = results.indexOf(item);
                    const active = index === cursor;
                    return (
                      <button
                        key={`${item.group}-${item.to}`}
                        type="button"
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => go(item)}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                          active ? 'bg-ink-800 text-ink-50' : 'text-ink-300',
                        )}
                      >
                        <Icon
                          name={item.icon}
                          className={clsx('h-4 w-4 shrink-0', active ? 'text-ember-400' : 'text-ink-500')}
                        />
                        <span className="flex-1">{item.label}</span>
                        <Icon name="arrowRight" className="h-3.5 w-3.5 text-ink-600" />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 py-1 pl-1 pr-2.5 transition-colors hover:border-ink-600"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ember-400/15 font-display text-[11px] font-semibold text-ember-300">
          {initials(user?.name)}
        </span>
        <span className="hidden text-[13px] font-medium text-ink-200 sm:block">{user?.name?.split(' ')[0]}</span>
        <Icon name="chevronDown" className="h-3.5 w-3.5 text-ink-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-60 animate-scale-in overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-pop"
        >
          <div className="border-b border-ink-700 px-3.5 py-3">
            <p className="truncate text-[13px] font-medium text-ink-100">{user?.name}</p>
            <p className="truncate text-[11.5px] text-ink-500">{user?.email}</p>
            <div className="mt-2">
              <Badge tone={user?.role === 'ADMIN' ? 'violet' : user?.role === 'TECHNICIAN' ? 'ember' : 'azure'}>
                {titleCase(user?.role || '')}
              </Badge>
            </div>
          </div>
          <div className="p-1.5">
            <MenuButton onClick={() => { setOpen(false); navigate('/profile'); }} icon="user" label="Your account" />
            <MenuButton onClick={() => { setOpen(false); navigate('/audit'); }} icon="history" label="Audit trail" />
            <div className="my-1 border-t border-ink-700" />
            <MenuButton
              onClick={async () => { setOpen(false); await logout(); navigate('/login'); }}
              icon="logout"
              label="Sign out"
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
        danger ? 'text-rust-300 hover:bg-rust-500/10' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-50',
      )}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const stats = useBadgeStats();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [title, subtitle] = useMemo(() => {
    if (location.pathname.startsWith('/machines/')) return ['Machine detail', 'Asset health and service history'];
    if (location.pathname.startsWith('/tickets/')) return ['Ticket detail', 'Work log and consumed parts'];
    return TITLES[location.pathname] || ['Mainspring', ''];
  }, [location.pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const runScan = async () => {
    try {
      const result = await api.post('/alerts/scan');
      const total = result.lowStockAlerts + result.serviceDueAlerts + result.overdueTicketAlerts;
      toast.success(
        total === 0
          ? 'Scan complete — nothing new to report.'
          : `Scan complete — ${total} new alert${total === 1 ? '' : 's'} raised.`,
      );
      navigate('/alerts');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen lg:pl-[248px]">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} stats={stats} />

      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-lg border border-ink-700 p-2 text-ink-300 lg:hidden"
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[17px] font-semibold tracking-tight text-ink-50 sm:text-lg">
              {title}
            </h1>
            {subtitle && <p className="hidden truncate text-xs text-ink-500 sm:block">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 text-left text-[13px] text-ink-500 transition-colors hover:border-ink-600 hover:text-ink-300 sm:flex"
          >
            <Icon name="search" className="h-4 w-4" />
            <span className="flex-1">Search…</span>
            <kbd className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={runScan}
              title="Run the alert scan now"
              className="btn-subtle h-9 px-2.5"
            >
              <Icon name="refresh" className="h-4 w-4" />
              <span className="hidden md:inline">Scan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-900 text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-100"
            aria-label="Notifications"
          >
            <Icon name="bell" className="h-[18px] w-[18px]" />
            {stats.unread > 0 && (
              <span className="num absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ember-400 px-1 text-[9.5px] font-semibold text-ink-950 shadow-[0_0_0_2px_rgba(8,9,12,0.9)]">
                {stats.unread > 9 ? '9+' : stats.unread}
              </span>
            )}
          </button>

          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export { LogoMark };
