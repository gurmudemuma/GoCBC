// API Configuration
// Centralized API URL management for all environments

/**
 * Get the API base URL based on the current environment
 * Priority: 
 * 1. NEXT_PUBLIC_API_BASE_URL environment variable (Next.js)
 * 2. REACT_APP_API_URL environment variable (fallback for CRA)
 * 3. window.location for same-origin deployments
 * 4. Default localhost for development
 */
export const getApiBaseUrl = (): string => {
  // Check for Next.js environment variable first
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // Fallback to Create React App convention
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // For production builds, use relative URL or same origin
  if (process.env.NODE_ENV === 'production') {
    // If deployed on same domain, use relative path
    return '/api/v1';
  }

  // Development fallback
  return 'http://localhost:3001/api/v1';
};

// Export the configured API base URL
export const API_BASE_URL = getApiBaseUrl();

// API endpoints configuration
export const API_ENDPOINTS = {
  // Contracts
  CONTRACTS: `${API_BASE_URL}/contracts`,
  
  // Banking
  BANKING_LC: `${API_BASE_URL}/banking/lc`,
  BANKING_LC_REQUEST: `${API_BASE_URL}/banking/lc/request`,
  BANKING_CAD: `${API_BASE_URL}/banking/cad`,
  BANKING_PAYMENT: `${API_BASE_URL}/banking/payment`,
  BANKING_CONSIGNMENT: `${API_BASE_URL}/banking/consignment`,
  
  // Forex
  FOREX: `${API_BASE_URL}/forex`,
  
  // Exporters
  EXPORTERS: `${API_BASE_URL}/exporters`,
  EXPORTERS_PROFILE: `${API_BASE_URL}/exporters/me/profile`,
  EXPORTER_APPLICATIONS: `${API_BASE_URL}/exporters/exporter-applications`,
  
  // Shipments
  SHIPMENTS: `${API_BASE_URL}/shipments`,
  
  // Customs
  CUSTOMS_DECLARATION: `${API_BASE_URL}/customs/declaration`,
  
  // Quality
  QUALITY_INSPECTIONS: `${API_BASE_URL}/quality/inspections`,
  
  // Permits
  PERMITS: `${API_BASE_URL}/permits`,
  
  // Payments
  PAYMENTS: `${API_BASE_URL}/payments`,
  
  // Documents
  DOCUMENTS: `${API_BASE_URL}/documents`,
  
  // ECX
  ECX_LOTS: `${API_BASE_URL}/ecx/lots`,
  
  // Audit
  AUDIT: `${API_BASE_URL}/audit`,
} as const;

/**
 * Build a full URL for an API endpoint
 * @param endpoint - The endpoint path (e.g., '/contracts/123')
 * @returns Full URL
 */
export const buildApiUrl = (endpoint: string): string => {
  // If endpoint already starts with http, return as-is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Get authorization headers with token
 * @param includeContentType - Whether to include Content-Type header (default: true)
 * @returns Headers object with Authorization
 */
export const getAuthHeaders = (includeContentType: boolean = true): HeadersInit => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token || ''}`,
  };
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

/**
 * Fetch wrapper with automatic URL building and auth headers
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Fetch response
 */
export const apiFetch = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  
  // Don't add Content-Type for FormData (browser will set it with boundary)
  const isFormData = options.body instanceof FormData;
  
  // Check if headers explicitly exclude Authorization (for public endpoints)
  const optionsHeaders = options.headers as Record<string, string> || {};
  const skipAuth = optionsHeaders.Authorization === null || optionsHeaders.Authorization === undefined && Object.keys(optionsHeaders).length > 0 && !('Authorization' in optionsHeaders);
  
  // Only add auth headers if not explicitly excluded
  const headers = skipAuth 
    ? { ...options.headers }
    : {
        ...getAuthHeaders(!isFormData),
        ...options.headers,
      };
  
  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Fetch wrapper for public endpoints (no authentication)
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Fetch response
 */
export const publicApiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  
  return fetch(url, {
    ...options,
    headers: options.headers,
  });
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
  getAuthHeaders,
  apiFetch,
  publicApiFetch,
};
