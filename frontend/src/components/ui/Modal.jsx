import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

/** Accessible dialog: ESC / backdrop to close, focus moved in, body scroll locked. */
export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer, hideClose }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'input, select, textarea, button:not([data-close])',
      );
      focusable?.focus?.();
    }, 40);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = original;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 animate-fade-in bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'relative my-8 w-full animate-scale-in overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-pop',
          sizes[size] || sizes.md,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">{subtitle}</p>}
          </div>
          {!hideClose && (
            <button
              type="button"
              data-close
              onClick={onClose}
              className="rounded-lg border border-transparent p-1.5 text-ink-400 transition-colors hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
              aria-label="Close dialog"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.3 6.3a1 1 0 000 1.4L8.6 10l-2.3 2.3a1 1 0 101.4 1.4L10 11.4l2.3 2.3a1 1 0 001.4-1.4L11.4 10l2.3-2.3a1 1 0 00-1.4-1.4L10 8.6 7.7 6.3a1 1 0 00-1.4 0z" />
              </svg>
            </button>
          )}
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-ink-700 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-300">{message}</p>
    </Modal>
  );
}
