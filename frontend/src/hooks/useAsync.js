import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal data-fetching hook: tracks loading / error / data, ignores stale
 * responses, and exposes `reload` for mutations that should refetch.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    Promise.resolve()
      .then(() => loaderRef.current())
      .then(
        (data) => {
          if (!cancelled) setState({ data, loading: false, error: null });
        },
        (error) => {
          if (!cancelled) setState({ data: null, loading: false, error });
        },
      );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}

/** Keeps a debounced copy of a value, for search-as-you-type. */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
