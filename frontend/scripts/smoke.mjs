/**
 * Route smoke test.
 *
 * There is no headless browser in this sandbox, so this mounts the real React
 * app in jsdom against the running mock API, drives every route, and fails on
 * any uncaught render error or React error-boundary log.
 *
 *   node tools/mock-api/server.mjs &   # API on :8080
 *   node frontend/scripts/smoke.mjs
 */

import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React from 'react';

const dom = new JSDOM(
  '<!doctype html><html><body><div id="root"></div></body></html>',
  { url: process.env.SMOKE_ORIGIN || 'http://127.0.0.1:8080/', pretendToBeVisual: true },
);

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.scrollTo = () => {};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;
dom.window.ResizeObserver = ResizeObserverStub;
globalThis.IntersectionObserver = ResizeObserverStub;
dom.window.matchMedia = dom.window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
globalThis.matchMedia = dom.window.matchMedia;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const errors = [];
const originalError = console.error;
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' ');
  if (/Warning: /.test(text)) return; // React dev warnings are noise here
  errors.push(text);
};
process.on('unhandledRejection', (reason) => errors.push(`unhandledRejection: ${reason}`));

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

const { MemoryRouter } = await import('react-router-dom');
const { createRoot } = await import('react-dom/client');
const { act } = React;

const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
const { AuthProvider } = await vite.ssrLoadModule('/src/context/AuthContext.jsx');
const { ToastProvider } = await vite.ssrLoadModule('/src/context/ToastContext.jsx');

// Seed a session so the protected routes render instead of redirecting.
const login = await fetch('http://127.0.0.1:8080/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@mainspring.dev', password: 'Admin@123' }),
}).then((r) => r.json());

localStorage.setItem('mainspring.token', login.token);
localStorage.setItem('mainspring.user', JSON.stringify(login.user));

const ROUTES = [
  ['/', ['Fleet availability', 'Ticket flow', 'Attention required']],
  ['/machines', ['Machines', 'CNC-0042']],
  ['/machines/1', ['CNC Milling Center VX-900', 'Service schedule']],
  ['/parts', ['Spare parts', 'BRG-6205']],
  ['/tickets', ['Maintenance tickets', 'TKT-2026-0001']],
  ['/tickets/1000', ['TKT-2026-0001', 'Parts consumed']],
  ['/alerts', ['Alerts', 'Run scan now']],
  ['/users', ['Users', 'Aarav Mehta']],
  ['/audit', ['Audit trail', 'LOGIN']],
  ['/profile', ['Your account', 'Change password']],
  ['/does-not-exist', ['404']],
];

let failures = 0;

for (const [path, expectations] of ROUTES) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(ToastProvider, null, React.createElement(App)),
          ),
        ),
      );
    });
    // Let the data fetches settle.
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
      });
    }

    const text = container.textContent || '';
    const missing = expectations.filter((needle) => !text.includes(needle));
    const body = text.replace(/\s+/g, ' ').trim();

    if (missing.length) {
      failures += 1;
      console.log(`✗ ${path}`);
      console.log(`    missing: ${missing.join(' | ')}`);
      console.log(`    rendered: ${body.slice(0, 300)}`);
    } else {
      console.log(`✓ ${path}  (${body.length} chars)`);
    }
  } catch (error) {
    failures += 1;
    console.log(`✗ ${path} threw`);
    console.log(`    ${error.stack?.split('\n').slice(0, 4).join('\n    ')}`);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

await vite.close();

if (errors.length) {
  failures += 1;
  console.log('\nConsole errors:');
  [...new Set(errors)].slice(0, 12).forEach((error) => console.log(`  ${error.slice(0, 400)}`));
}

console.log(`\n${failures === 0 ? 'ALL ROUTES OK' : `${failures} ROUTE(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
