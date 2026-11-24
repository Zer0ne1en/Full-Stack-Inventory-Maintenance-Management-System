/**
 * Thin fetch wrapper around the REST contract.
 *
 * Everything is relative to the current origin so the app runs unchanged behind
 * the Vite proxy, nginx, or any other reverse proxy.
 */

const TOKEN_KEY = 'mainspring.token';
const USER_KEY = 'mainspring.user';

export class ApiError extends Error {
  constructor({ status, code, message, fieldErrors, path }) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors || null;
    this.path = path;
  }
}

export const session = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set token(value) {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  set user(value) {
    if (value) localStorage.setItem(USER_KEY, JSON.stringify(value));
    else localStorage.removeItem(USER_KEY);
  },
  clear() {
    this.token = null;
    this.user = null;
  },
};

function buildUrl(path, params) {
  const url = new URL(`/api/v1${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = session.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), { method, headers, body: payload, signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the API. Check that the backend is running.',
    });
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && session.token) {
      // Token expired or revoked — drop the local session so the app routes to login.
      session.clear();
    }
    throw new ApiError({
      status: response.status,
      code: data?.code,
      message: data?.message || data?.detail || response.statusText,
      fieldErrors: data?.fieldErrors,
      path: data?.path,
    });
  }
  return data;
}

export const api = {
  get: (path, params, options) => request(path, { ...options, params }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
