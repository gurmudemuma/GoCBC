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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

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

  const handleView = (document: Document) => {
    setViewingDocument(document);
    setViewerOpen(true);
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
    
    const uploadedTypes = documents.map(d => d.document_type);
    return requiredDocuments.filter(type => !uploadedTypes.includes(type));
  };

  const missingDocs = getMissingDocuments();

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

        {documents.length === 0 ? (
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
                  <TableCell>Signatures</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
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
                {/* Document Preview */}
                <Box sx={{ height: '500px', bgcolor: 'grey.100', borderRadius: 1 }}>
                  {viewingDocument.mime_type === 'application/pdf' ? (
                    <iframe
                      src={`http://localhost:3001/api/v1/documents/${viewingDocument.document_id}/view?token=${localStorage.getItem('authToken')}`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title={viewingDocument.file_name}
                    />
                  ) : viewingDocument.mime_type.startsWith('image/') ? (
                    <img
                      src={`http://localhost:3001/api/v1/documents/${viewingDocument.document_id}/download?token=${localStorage.getItem('authToken')}`}
                      alt={viewingDocument.file_name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
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
