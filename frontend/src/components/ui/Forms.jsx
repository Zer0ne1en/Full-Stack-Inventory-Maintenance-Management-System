import clsx from 'clsx';
import { useId } from 'react';

export function Field({ label, hint, error, required, children, className }) {
  return (
    <div className={clsx('flex flex-col', className)}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="ml-0.5 text-ember-400">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-rust-300">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-4a1 1 0 100-2 1 1 0 000 2zm0-7a1 1 0 00-1 1v3a1 1 0 102 0V5a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ icon, className, ...props }) {
  return (
    <div className="relative">
      {icon && <span className="input-icon">{icon}</span>}
      <input className={clsx('field', icon && 'pl-9', className)} {...props} />
    </div>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select className={clsx('field appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
      >
        <path
          fillRule="evenodd"
          d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 transition-colors',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span>
        <span className="block text-sm font-medium text-ink-100">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-ember-400' : 'bg-ink-600',
        )}
      >
        <span
          className={clsx(
            'inline-block h-3.5 w-3.5 transform rounded-full bg-ink-950 transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={clsx('relative', className)}>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.4l3.07 3.08a1 1 0 01-1.41 1.41l-3.08-3.07A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-500 hover:text-ink-200"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.3 6.3a1 1 0 000 1.4L8.6 10l-2.3 2.3a1 1 0 101.4 1.4L10 11.4l2.3 2.3a1 1 0 001.4-1.4L11.4 10l2.3-2.3a1 1 0 00-1.4-1.4L10 8.6 7.7 6.3a1 1 0 00-1.4 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}
