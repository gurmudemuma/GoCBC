/**
 * DocumentManagementPanel - Reusable component for document management with signatures
 * Can be embedded in any portal (Exporter, ECTA, Banks, NBE, Customs, Shipping)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PendingActions as PendingIcon,
  Description as DescriptionIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import axios from 'axios';
import SignDocumentButton from './SignDocumentButton';
import DocumentSignatureTracker from './DocumentSignatureTracker';
import SignatureStatusBadge from './SignatureStatusBadge';
import ApprovalProgressIndicator from './ApprovalProgressIndicator';
import SignatureOverlay from './SignatureOverlay';
import PDFViewer from './PDFViewer';

interface Document {
  document_id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  file_name: string;
  file_hash: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  status: string;
  uploaded_at: string;
  signature_count?: number;
  last_signed_by?: string;
  last_signed_at?: string;
  is_signed?: boolean;
}

interface DocumentManagementPanelProps {
  entityType: string; // 'CONTRACT', 'EXPORTER_APPLICATION', 'LC', 'SHIPMENT', etc.
  entityId: string;
  title?: string;
  allowUpload?: boolean;
  allowSign?: boolean;
  allowedSignatureTypes?: Array<'UPLOAD' | 'VERIFY' | 'APPROVE' | 'REJECT'>;
  defaultSignatureType?: 'UPLOAD' | 'VERIFY' | 'APPROVE' | 'REJECT';
  showSignatureTracker?: boolean;
  onDocumentSigned?: (documentId: string, signatureData: any) => void;
  onDocumentUploaded?: (document: Document) => void;
  requiredDocuments?: string[]; // List of required document types
}

export const DocumentManagementPanel: React.FC<DocumentManagementPanelProps> = ({
  entityType,
  entityId,
  title = 'Documents',
  allowUpload = true,
  allowSign = true,
  allowedSignatureTypes = ['UPLOAD', 'VERIFY', 'APPROVE', 'REJECT'],
  defaultSignatureType = 'UPLOAD',
  showSignatureTracker = true,
  onDocumentSigned,
  onDocumentUploaded,
  requiredDocuments = [],
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [viewingSignatures, setViewingSignatures] = useState<any[]>([]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window === 'undefined') return; // Skip on server-side
      
      const token = localStorage.getItem('authToken'); // Fixed: was 'token', should be 'authToken'
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/entity/${entityType}/${entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const docs = Array.isArray(response.data.data) ? response.data.data : [];
        setDocuments(docs);
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      const errorMessage = err.response?.status === 401 
        ? 'Authentication required. Please log in again.' 
        : err.response?.data?.error?.message || 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize auth token on client-side only
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      setAuthToken(token);
    }
    
    if (entityId) {
      fetchDocuments();
    }
  }, [entityType, entityId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      if (typeof window === 'undefined') return; // Skip on server-side

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('documentType', documentType || 'OTHER');
      formData.append('fileName', selectedFile.name);

      const token = localStorage.getItem('authToken'); // Fixed: was 'token', should be 'authToken'
      const response = await axios.post(
        'http://localhost:3001/api/v1/documents/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setDocumentType('');
        await fetchDocuments();
        
        if (onDocumentUploaded && response.data.data) {
          onDocumentUploaded(response.data.data);
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      if (typeof window === 'undefined') return; // Skip on server-side
      
      const token = localStorage.getItem('authToken'); // Fixed: was 'token', should be 'authToken'
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/${doc.document_id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  };

  const handleView = async (document: Document) => {
    setViewingDocument(document);
    setViewerOpen(true);
    
    // Fetch signatures for this document
    try {
      if (typeof window === 'undefined') return; // Skip on server-side
      
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/${document.document_id}/signatures`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log('Signatures response:', response.data); // DEBUG
      
      if (response.data.success && response.data.data?.signatures) {
        console.log('Setting signatures:', response.data.data.signatures); // DEBUG
        setViewingSignatures(response.data.data.signatures);
      } else {
        console.log('No signatures found in response'); // DEBUG
        setViewingSignatures([]);
      }
    } catch (err) {
      console.error('Error fetching signatures:', err);
      setViewingSignatures([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'signed':
        return 'info';
      case 'active':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSignatureStatusBadge = (doc: Document) => {
    // Use the SignatureStatusBadge component for real-time signature status
    return (
      <SignatureStatusBadge
        documentId={doc.document_id}
        size="small"
        showDetails={true}
      />
    );
  };

  const getMissingDocuments = () => {
    if (requiredDocuments.length === 0) return [];
    
    // Normalize document types for comparison (convert to uppercase with underscores)
    const normalizeDocType = (type: string) => type.toUpperCase().replace(/\s+/g, '_');
    const uploadedTypes = documents.map(d => normalizeDocType(d.document_type));
    const requiredNormalized = requiredDocuments.map(type => normalizeDocType(type));
    return requiredDocuments.filter((type, index) => !uploadedTypes.includes(requiredNormalized[index]));
  };

  const missingDocs = getMissingDocuments();

  // Filter documents based on requiredDocuments if specified
  const normalizeDocType = (type: string) => type.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const filteredDocuments = requiredDocuments.length > 0
    ? documents.filter(doc => {
        const normalizedDocType = normalizeDocType(doc.document_type);
        return requiredDocuments.some(required => normalizeDocType(required) === normalizedDocType);
      })
    : documents;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          {allowUpload && (
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              component="label"
            >
              Upload Document
              <input
                type="file"
                hidden
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
            </Button>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {missingDocs.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Missing Required Documents:
            </Typography>
            <Typography variant="caption">
              {missingDocs.join(', ')}
            </Typography>
          </Alert>
        )}

        {filteredDocuments.length === 0 ? (
          <Alert severity="info">
            No documents uploaded yet. {allowUpload && 'Click "Upload Document" to add files.'}
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Uploaded By</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approval</TableCell>
                  <TableCell>Signatures</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.document_id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <DescriptionIcon fontSize="small" color="action" />
                        <Typography variant="body2">{doc.file_name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.document_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{doc.uploaded_by}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={doc.status}
                        size="small"
                        color={getStatusColor(doc.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      {/* Compact Approval Badge - will fetch on hover/expand */}
                      <Chip 
                        label="Multi-party" 
                        size="small" 
                        variant="outlined" 
                        color="info"
                        icon={<VerifiedIcon />}
                        style={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>{getSignatureStatusBadge(doc)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => handleView(doc)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton size="small" onClick={() => handleDownload(doc)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {allowSign && (
                          <SignDocumentButton
                            documentId={doc.document_id}
                            documentName={doc.file_name}
                            allowedTypes={allowedSignatureTypes}
                            defaultType={defaultSignatureType}
                            variant="outlined"
                            size="small"
                            onSignSuccess={(data) => {
                              fetchDocuments();
                              if (onDocumentSigned) {
                                onDocumentSigned(doc.document_id, data);
                              }
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)}>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ minWidth: 400, mt: 1 }}>
              <Typography variant="body2">
                File: <strong>{selectedFile?.name}</strong>
              </Typography>
              <Typography variant="body2">
                Size: {selectedFile ? (selectedFile.size / 1024).toFixed(2) : 0} KB
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Document Type (optional)
                </Typography>
                <input
                  type="text"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g., SALES_CONTRACT, INVOICE, etc."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              variant="contained"
              disabled={uploading || !selectedFile}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{viewingDocument?.file_name}</Typography>
              <Button onClick={() => setViewerOpen(false)}>Close</Button>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            {viewingDocument && (
              <Stack spacing={3}>
                {/* Document Preview with Signature Overlay */}
                <Box sx={{ position: 'relative', height: '500px', bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden' }}>
                  {viewingDocument.mime_type === 'application/pdf' ? (
                    authToken ? (
                      <>
                        {/* PDF Viewer with PDF.js */}
                        <PDFViewer
                          documentId={viewingDocument.document_id}
                          token={authToken}
                          height={500}
                        />
                        
                        {/* Always show watermark overlay on top of PDF */}
                        {viewingSignatures && viewingSignatures.length > 0 && (
                          <>
                            {/* Diagonal "SIGNED" Watermark */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%) rotate(-45deg)',
                                zIndex: 1000,
                                pointerEvents: 'none',
                                userSelect: 'none',
                              }}
                            >
                              <Typography
                                variant="h1"
                                sx={{
                                  fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
                                  fontWeight: 900,
                                  color: 'rgba(76, 175, 80, 0.25)',
                                  textTransform: 'uppercase',
                                  letterSpacing: 8,
                                  textShadow: '0 0 30px rgba(76, 175, 80, 0.5)',
                                  WebkitTextStroke: '3px rgba(76, 175, 80, 0.4)',
                                }}
                              >
                                SIGNED
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  position: 'absolute',
                                  bottom: -30,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  color: 'rgba(76, 175, 80, 0.6)',
                                  fontSize: '1.5rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  textShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
                                }}
                              >
                                ⛓️ Blockchain Verified
                              </Typography>
                            </Box>
                          </>
                        )}
                        
                        {/* Signature badges in corner */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            pointerEvents: 'none',
                            zIndex: 1001,
                          }}
                        >
                          {typeof window !== 'undefined' && authToken && (
                            <SignatureOverlay
                              signatures={viewingSignatures}
                              documentName={viewingDocument.file_name}
                            />
                          )}
                        </Box>
                      </>
                    ) : (
                      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                        <CircularProgress />
                      </Box>
                    )
                  ) : viewingDocument.mime_type?.startsWith('image/') ? (
                    authToken ? (
                      <>
                        <img
                          src={`http://localhost:3001/api/v1/documents/${viewingDocument.document_id}/download?token=${authToken}`}
                          alt={viewingDocument.file_name}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                        {/* Signature Overlay for images */}
                        {viewingSignatures && viewingSignatures.length > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%) rotate(-45deg)',
                              zIndex: 1000,
                              pointerEvents: 'none',
                            }}
                          >
                            <Typography
                              variant="h1"
                              sx={{
                                fontSize: '8rem',
                                fontWeight: 900,
                                color: 'rgba(76, 175, 80, 0.3)',
                                textTransform: 'uppercase',
                                letterSpacing: 8,
                              }}
                            >
                              SIGNED
                            </Typography>
                          </Box>
                        )}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            pointerEvents: 'none',
                            zIndex: 1001,
                          }}
                        >
                          {typeof window !== 'undefined' && authToken && (
                            <SignatureOverlay
                              signatures={viewingSignatures}
                              documentName={viewingDocument.file_name}
                            />
                          )}
                        </Box>
                      </>
                    ) : (
                      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                        <CircularProgress />
                      </Box>
                    )
                  ) : (
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                    >
                      <Typography color="text.secondary">
                        Preview not available. Click download to view file.
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Approval Progress (if multi-party approval required) */}
                <ApprovalProgressIndicator
                  documentId={viewingDocument.document_id}
                  showApproveButton={allowSign}
                  onApprovalComplete={async () => {
                    await fetchDocuments();
                    // Refetch signatures for overlay
                    try {
                      if (typeof window === 'undefined') return;
                      
                      const token = localStorage.getItem('authToken');
                      const response = await axios.get(
                        `http://localhost:3001/api/v1/documents/${viewingDocument.document_id}/signatures`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      if (response.data.success && response.data.data?.signatures) {
                        setViewingSignatures(response.data.data.signatures);
                      }
                    } catch (err) {
                      console.error('Error refetching signatures:', err);
                    }
                    
                    if (onDocumentSigned) {
                      onDocumentSigned(viewingDocument.document_id, { workflowComplete: true });
                    }
                  }}
                />

                {/* Signature Tracker */}
                {showSignatureTracker && (
                  <DocumentSignatureTracker
                    documentId={viewingDocument.document_id}
                    showHeader={true}
                    compact={false}
                    autoRefresh={true}
                  />
                )}
              </Stack>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DocumentManagementPanel;
