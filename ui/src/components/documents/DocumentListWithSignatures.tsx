/**
 * DocumentListWithSignatures Component
 * Enhanced document list showing signature status for each document
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  VerifiedUser as SignedIcon,
  Block as UnsignedIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import axios from 'axios';
import SignatureStatusBadge from './SignatureStatusBadge';

interface Document {
  document_id: string;
  file_name: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  status: string;
  verification_status?: string;
}

interface DocumentListWithSignaturesProps {
  entityType: string;
  entityId: string;
  title?: string;
  showSignatureColumn?: boolean;
}

const DocumentListWithSignatures: React.FC<DocumentListWithSignaturesProps> = ({
  entityType,
  entityId,
  title = 'Documents',
  showSignatureColumn = true,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/entity/${entityType}/${entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data?.success) {
        setDocuments(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const token = localStorage.getItem('authToken');
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
      alert('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📎';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load documents: {error}
      </Alert>
    );
  }

  if (documents.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No documents found for this {entityType.toLowerCase()}
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <DocumentIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
          <Chip label={`${documents.length} document${documents.length > 1 ? 's' : ''}`} size="small" />
        </Stack>
      </Box>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={50}>Type</TableCell>
              <TableCell>File Name</TableCell>
              <TableCell>Document Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Status</TableCell>
              {showSignatureColumn && <TableCell align="center">Signature</TableCell>}
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.document_id} hover>
                <TableCell>
                  <Typography variant="h6">
                    {getDocumentIcon(doc.mime_type)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {doc.file_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.document_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={doc.document_type}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(doc.file_size)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(doc.uploaded_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {doc.uploaded_by}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Chip
                      label={doc.status}
                      size="small"
                      color={doc.status === 'active' ? 'success' : 'default'}
                      variant="outlined"
                    />
                    {doc.verification_status && (
                      <Chip
                        label={doc.verification_status}
                        size="small"
                        color={
                          doc.verification_status === 'verified'
                            ? 'success'
                            : doc.verification_status === 'pending'
                            ? 'warning'
                            : 'error'
                        }
                        variant="filled"
                      />
                    )}
                  </Stack>
                </TableCell>
                {showSignatureColumn && (
                  <TableCell align="center">
                    <SignatureStatusBadge
                      documentId={doc.document_id}
                      size="small"
                      showDetails={true}
                    />
                  </TableCell>
                )}
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(doc)}
                        color="primary"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="info">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <SignedIcon fontSize="small" color="success" />
            <Typography variant="caption">
              = Digitally Signed (hover for details)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <UnsignedIcon fontSize="small" color="warning" />
            <Typography variant="caption">= Not Signed</Typography>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
};

export default DocumentListWithSignatures;
