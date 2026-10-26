/**
 * Document Helpers
 * Standardized document viewing and downloading functions for all portals
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

/**
 * View a document in a new browser tab
 * @param documentId - The document ID or full document URL
 * @param authToken - Optional auth token (defaults to localStorage)
 */
export function viewDocument(documentId: string, authToken?: string): void {
  const token = authToken || localStorage.getItem('authToken');
  
  if (!token) {
    console.error('[DOC-VIEW] No auth token available');
    alert('Authentication required. Please log in to view documents.');
    return;
  }

  // Handle both document IDs and full URLs
  let viewUrl: string;
  if (documentId.startsWith('http')) {
    // Full URL provided
    viewUrl = `${documentId}${documentId.includes('?') ? '&' : '?'}token=${token}`;
  } else if (documentId.startsWith('/documents/')) {
    // Relative URL with /documents/ prefix
    viewUrl = `${API_BASE_URL}${documentId}/view?token=${token}`;
  } else {
    // Just document ID
    viewUrl = `${API_BASE_URL}/documents/${documentId}/view?token=${token}`;
  }

  console.log('[DOC-VIEW] Opening document:', documentId);
  window.open(viewUrl, '_blank');
}

/**
 * Download a document
 * @param documentId - The document ID or full document URL
 * @param authToken - Optional auth token (defaults to localStorage)
 */
export function downloadDocument(documentId: string, authToken?: string): void {
  const token = authToken || localStorage.getItem('authToken');
  
  if (!token) {
    console.error('[DOC-DOWNLOAD] No auth token available');
    alert('Authentication required. Please log in to download documents.');
    return;
  }

  // Handle both document IDs and full URLs
  let downloadUrl: string;
  if (documentId.startsWith('http')) {
    // Full URL provided
    downloadUrl = `${documentId}${documentId.includes('?') ? '&' : '?'}token=${token}`;
  } else if (documentId.startsWith('/documents/')) {
    // Relative URL with /documents/ prefix
    downloadUrl = `${API_BASE_URL}${documentId}/download?token=${token}`;
  } else {
    // Just document ID
    downloadUrl = `${API_BASE_URL}/documents/${documentId}/download?token=${token}`;
  }

  console.log('[DOC-DOWNLOAD] Downloading document:', documentId);
  window.open(downloadUrl, '_blank');
}

/**
 * Get document metadata
 * @param documentId - The document ID
 * @param authToken - Optional auth token (defaults to localStorage)
 * @returns Promise with document metadata
 */
export async function getDocumentMetadata(documentId: string, authToken?: string): Promise<any> {
  const token = authToken || localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const metadataUrl = `${API_BASE_URL}/documents/${documentId}`;
  
  const response = await fetch(metadataUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch document metadata: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Normalize document URL by removing /api/v1/ prefix if it exists
 * @param url - The document URL
 * @returns Normalized URL
 */
export function normalizeDocumentUrl(url: string): string {
  if (typeof url === 'string' && url.startsWith('/api/v1/')) {
    return url.substring(8); // Remove '/api/v1/'
  }
  return url;
}

/**
 * Build document view URL for embedding
 * @param documentId - The document ID or URL
 * @param authToken - Optional auth token (defaults to localStorage)
 * @returns Full URL for viewing
 */
export function buildDocumentViewUrl(documentId: string, authToken?: string): string {
  const token = authToken || localStorage.getItem('authToken');
  
  if (!token) {
    return '';
  }

  if (documentId.startsWith('http')) {
    return `${documentId}${documentId.includes('?') ? '&' : '?'}token=${token}`;
  } else if (documentId.startsWith('/documents/')) {
    return `${API_BASE_URL}${documentId}/view?token=${token}`;
  } else {
    return `${API_BASE_URL}/documents/${documentId}/view?token=${token}`;
  }
}
