// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Central API configuration for the frontend.
//
// This module was missing from the repository (never committed), even
// though 47 files import from it — including all 7 portals — so the
// frontend could not compile at all. It is reconstructed from how
// those files use it:
//
//   - `API_BASE_URL` is the full API root including `/api/v1`
//     (see also `src/services/swiftApi.ts` and
//     `src/components/portals/DocumentValidationDialog.tsx`, which
//     default to `http://localhost:3001/api/v1`).
//   - `apiFetch(path, options?)` behaves like `fetch` but resolves
//     `path` against `API_BASE_URL` and attaches the stored JWT
//     (`localStorage 'authToken'`). Callers do `response.json()` and
//     check `result.success`, so it returns the raw Response.
//     Paths that already start with `/api/v1` are used as-is, so the
//     few callers that pass a full `/api/v1/...` path are not
//     double-prefixed.
//   - `publicApiFetch` is the same without an Authorization header,
//     for the public registration endpoints.
//   - `getAuthHeaders()` returns the Authorization (and JSON
//     content-type) headers for callers that build their own fetch.
//   - `API_ENDPOINTS` collects the endpoint paths the portals use.

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    validate: '/auth/validate',
    refresh: '/auth/refresh',
    applicantLogin: '/auth/applicant/login',
    applicantStatus: '/auth/applicant/status',
  },
  exporters: {
    applications: '/exporters/exporter-applications',
    checkByEmail: (email: string) =>
      `/exporters/exporter-applications/check/${encodeURIComponent(email)}`,
    approve: (applicationId: string) =>
      `/exporters/exporter-applications/${applicationId}/approve`,
    reject: (applicationId: string) =>
      `/exporters/exporter-applications/${applicationId}/reject`,
    resubmit: (applicationId: string) =>
      `/exporters/exporter-applications/${applicationId}/resubmit`,
    list: '/exporters',
  },
  contracts: '/contracts',
  forex: '/forex',
  banking: '/banking',
  quality: '/quality',
  permits: '/permits',
  phytosanitary: '/phytosanitary',
  shipments: '/shipments',
  shipping: '/shipping',
  customs: '/customs',
  payments: '/payments',
  swift: '/swift',
  documents: '/documents',
  analytics: '/analytics',
  portals: '/portals',
  users: '/users',
  audit: '/audit',
  traceability: '/traceability',
  blockchain: '/blockchain',
  repatriation: '/repatriation',
  retention: '/retention',
  inspection: '/inspection',
  bordercrossing: '/bordercrossing',
  status: '/status',
  nbe: '/nbe',
  ecx: '/ecx',
  stats: '/stats',
} as const;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Resolve a portal path against the API root. Absolute URLs and
 *  paths that already start with `/api/v1` pass through unchanged. */
export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/api/v1')) {
    const root = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${root}${path}`;
  }
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function handleUnauthorized(response: Response): void {
  if (response.status !== 401 || typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?error=session_expired';
  }
}

async function doFetch(
  path: string,
  options: RequestInit = {},
  withAuth: boolean
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (withAuth && !headers.has('Authorization')) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = (options.method || 'GET').toUpperCase();
  const url = buildApiUrl(path);
  const key = mutationDedupeKey(method, url, options.body);
  if (key) {
    const inFlight = inFlightMutations.get(key);
    if (inFlight) {
      // Identical mutation already in flight (e.g. a double-clicked submit
      // button): share it instead of firing a second request. Each caller
      // gets its own clone — a fetch Response body can only be read once.
      return inFlight.then((r) => r.clone());
    }
    const p = fetch(url, { ...options, headers });
    inFlightMutations.set(key, p);
    p.then(
      () => inFlightMutations.delete(key),
      () => inFlightMutations.delete(key)
    );
    const response = await p;
    if (withAuth) handleUnauthorized(response);
    return response.clone();
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (withAuth) handleUnauthorized(response);
  return response;
}

// In-flight deduplication for mutations (round 3, Area 2): a double-clicked
// submit fires the same POST/PUT/PATCH/DELETE twice, and almost no portal
// handler disables its button while the request is in flight. The shared
// client is the one place that can stop the duplicate for all 120+ submit
// paths at once. Only identical (method, URL, body) requests still in
// flight are shared; nothing is cached after the request settles, so a
// retry after failure or a later identical submit still goes through.
// FormData bodies (file uploads) are never deduped — they cannot be
// compared by value.
const inFlightMutations = new Map<string, Promise<Response>>();

function mutationDedupeKey(
  method: string,
  url: string,
  body: unknown
): string | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;
  if (body === undefined || body === null) return `${method} ${url} `;
  if (typeof body !== 'string') return null;
  return `${method} ${url} ${body}`;
}

/** Authenticated fetch. Returns the raw Response — callers do
 *  `response.json()` and check `result.success`. */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return doFetch(path, options, true);
}

/** Unauthenticated fetch, for the public registration endpoints. */
export function publicApiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return doFetch(path, options, false);
}

export default apiFetch;
