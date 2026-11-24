/**
 * Thin fetch wrapper around the REST contract.
 *
 * Everything is relative to the current origin so the app runs unchanged behind
 * the Vite proxy, nginx, or any other reverse proxy.
 */

const TOKEN_KEY = 'mainspring.token';
const USER_KEY = 'mainspring.user';

/** Fired when the server rejects a token we thought was valid. */
export const SESSION_EXPIRED_EVENT = 'mainspring:session-expired';

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

/**
 * Sends the token in both `Authorization` and a custom header.
 *
 * Some reverse proxies and sandbox preview tunnels strip `Authorization` as a
 * security measure. The API accepts either, so the app keeps working behind
 * them without weakening the contract.
 */
function authHeaders(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}`, 'X-Auth-Token': token };
}

export async function request(path, { method = 'GET', body, params, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = session.token;
  Object.assign(headers, authHeaders(token));

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
    // A 401 while holding a token means the token is no longer accepted —
    // expired, revoked, or stripped in transit. Drop the local session so the
    // router sends the user back to login instead of dead-ending on an error.
    // The login endpoint itself is exempt: a wrong password is not a dead session.
    const isLoginCall = path.startsWith('/auth/login');
    if (response.status === 401 && token && !isLoginCall) {
      console.warn(
        `[api] 401 on ${method} ${path} — a token was attached (${token.length} chars) ` +
          'but the API did not accept it.',
      );
      session.clear();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { path } }));
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
