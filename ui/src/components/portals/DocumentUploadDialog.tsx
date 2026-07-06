/**
 * Document Upload Dialog
 * Professional document upload with encryption and blockchain hash registration
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Divider,
  Stack,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  CheckCircle,
  Error as ErrorIcon,
  Delete,
  Lock,
  Language,
  InsertDriveFile,
  PictureAsPdf,
  Image as ImageIcon,
  TableChart,
  Close,
  Info,
  DeleteSweep,
} from '@mui/icons-material';

interface DocumentUploadDialogProps {
  open: boolean;
  entityId?: string;
  entityType?: string; // 'LC', 'PAYMENT', 'SHIPMENT', etc.
  onClose: () => void;
  onUploadComplete?: (documents: any[]) => void;
}

const DOCUMENT_CATEGORIES = [
  { value: 'BILL_OF_LADING', label: 'Bill of Lading (B/L)' },
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin' },
  { value: 'INSURANCE_CERTIFICATE', label: 'Insurance Certificate' },
  { value: 'PHYTOSANITARY_CERTIFICATE', label: 'Phytosanitary Certificate' },
  { value: 'INSPECTION_CERTIFICATE', label: 'Inspection Certificate' },
  { value: 'ICO_CERTIFICATE', label: 'ICO Certificate' },
  { value: 'EXPORT_PERMIT', label: 'Export Permit (ECTA)' },
  { value: 'QUALITY_CERTIFICATE', label: 'Quality/Sample Certificate' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'SALES_CONTRACT', label: 'Sales Contract/Agreement' },
  { value: 'TIN_CERTIFICATE', label: 'Tax Certificate (TIN)' },
  { value: 'BUSINESS_LICENSE', label: 'Business License/Trade License' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
  { value: 'TASTER_CERTIFICATE', label: 'Professional Taster Certificate' },
  { value: 'LABORATORY_CERTIFICATE', label: 'Laboratory Certification' },
  { value: 'ORGANIC_CERTIFICATE', label: 'Organic Certification' },
  { value: 'FAIR_TRADE_CERTIFICATE', label: 'Fair Trade Certification' },
  { value: 'EUDR_STATEMENT', label: 'EUDR Due Diligence Statement' },
  { value: 'COMPANY_PROFILE', label: 'Company Profile/References' },
  { value: 'OTHER', label: 'Other Document' },
];

// Document categories filtered by entity type
const getDocumentCategoriesForEntity = (entityType?: string) => {
  switch (entityType) {
    case 'EXPORTER_APPLICATION':
      return DOCUMENT_CATEGORIES.filter(cat => 
        ['TIN_CERTIFICATE', 'BUSINESS_LICENSE', 'BANK_STATEMENT', 'TASTER_CERTIFICATE', 
         'LABORATORY_CERTIFICATE', 'COMPANY_PROFILE', 'OTHER'].includes(cat.value)
      );
    
    case 'CONTRACT':
      return DOCUMENT_CATEGORIES.filter(cat => 
        ['QUALITY_CERTIFICATE', 'PROFORMA_INVOICE', 'SALES_CONTRACT', 'PURCHASE_ORDER',
         'ORGANIC_CERTIFICATE', 'FAIR_TRADE_CERTIFICATE', 'EUDR_STATEMENT', 'OTHER'].includes(cat.value)
      );
    
    case 'SHIPMENT':
      return DOCUMENT_CATEGORIES.filter(cat => 
        ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'QUALITY_CERTIFICATE',
         'PHYTOSANITARY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN', 'INSURANCE_CERTIFICATE',
         'ICO_CERTIFICATE', 'OTHER'].includes(cat.value)
      );
    
    case 'LC':
      return DOCUMENT_CATEGORIES.filter(cat => 
        ['PROFORMA_INVOICE', 'PURCHASE_ORDER', 'SALES_CONTRACT', 'OTHER'].includes(cat.value)
      );
    
    case 'CUSTOMS_DECLARATION':
      return DOCUMENT_CATEGORIES.filter(cat => 
        ['EXPORT_PERMIT', 'PHYTOSANITARY_CERTIFICATE', 'CERTIFICATE_OF_ORIGIN',
         'COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'INSURANCE_CERTIFICATE',
         'EUDR_STATEMENT', 'OTHER'].includes(cat.value)
      );
    
    default:
      return DOCUMENT_CATEGORIES; // Show all if no specific type
  }
};

interface UploadedFile {
  file: File;
  category: string;
  description: string;
  encrypt: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
  hash?: string;
  ipfsCID?: string;
}

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

// Get icon for file type
const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return <PictureAsPdf sx={{ fontSize: 40, color: '#d32f2f' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <ImageIcon sx={{ fontSize: 40, color: '#1976d2' }} />;
    case 'xls':
    case 'xlsx':
      return <TableChart sx={{ fontSize: 40, color: '#388e3c' }} />;
    case 'doc':
    case 'docx':
      return <InsertDriveFile sx={{ fontSize: 40, color: '#1976d2' }} />;
    default:
      return <Description sx={{ fontSize: 40, color: 'text.secondary' }} />;
  }
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Validate file
const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds 10MB limit (${formatFileSize(file.size)})`;
  }
  
  const ext = '.' + file.name.toLowerCase().split('.').pop();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  
  return null;
};

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  open,
  entityId,
  entityType,
  onClose,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get filtered categories based on entity type
  const availableCategories = getDocumentCategoriesForEntity(entityType);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    addFiles(Array.from(selectedFiles));
  };

  const addFiles = (filesToAdd: File[]) => {
    const errors: string[] = [];
    const validFiles: UploadedFile[] = [];

    filesToAdd.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push({
          file,
          category: availableCategories[0]?.value || 'OTHER',
          description: '',
          encrypt: true,
          status: 'pending',
          progress: 0,
        });
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    
    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles) return;

    addFiles(Array.from(droppedFiles));
  }, [availableCategories]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setValidationErrors([]);
  };

  const removeAllFiles = () => {
    setFiles([]);
    setValidationErrors([]);
  };

  const updateFile = (index: number, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const toggleEncryptAll = () => {
    const allEncrypted = files.every(f => f.encrypt);
    setFiles(prev => prev.map(f => ({ ...f, encrypt: !allEncrypted })));
  };

  const uploadFiles = async () => {
    setUploading(true);
    const token = localStorage.getItem('authToken');

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      if (fileData.status === 'success') continue;

      updateFile(i, { status: 'uploading', progress: 0 });

      try {
        const formData = new FormData();
        formData.append('document', fileData.file);
        formData.append('category', fileData.category);
        formData.append('encrypt', fileData.encrypt.toString());
        if (fileData.description) {
          formData.append('description', fileData.description);
        }
        if (entityId) {
          formData.append('entityId', entityId);
        }
        if (entityType) {
          formData.append('entityType', entityType);
        }

        const response = await fetch('http://localhost:3001/api/v1/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          updateFile(i, {
            status: 'success',
            progress: 100,
            documentId: result.data.documentId,
            hash: result.data.hash,
            ipfsCID: result.data.ipfsCID,
          });
        } else {
          updateFile(i, {
            status: 'error',
            progress: 0,
            error: result.error?.message || 'Upload failed',
          });
        }
      } catch (error: any) {
        updateFile(i, {
          status: 'error',
          progress: 0,
          error: error.message || 'Network error',
        });
      }
    }

    setUploading(false);

    // Notify parent of successful uploads
    const successfulUploads = files.filter(f => f.status === 'success');
    if (successfulUploads.length > 0 && onUploadComplete) {
      onUploadComplete(successfulUploads);
    }
  };

  const allUploaded = files.length > 0 && files.every(f => f.status === 'success');
  const hasErrors = files.some(f => f.status === 'error');
  const pendingFiles = files.filter(f => f.status === 'pending');
  const successfulFiles = files.filter(f => f.status === 'success');
  const errorFiles = files.filter(f => f.status === 'error');

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setValidationErrors([]);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(155, 48, 183, 0.2)',
          overflow: 'hidden',
        }
      }}
    >
      <Box sx={{ height: 3, bgcolor: '#FFD700' }} />
      <DialogTitle sx={{ 
        pb: 2,
        pt: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: '#FFFFFF',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '50%',
              bgcolor: 'rgba(155, 48, 183, 0.1)',
              display: 'flex',
            }}
          >
            <CloudUpload sx={{ color: '#9b30b7', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
              Upload Documents
            </Typography>
            {entityType && (
              <Typography variant="caption" sx={{ color: '#666666' }}>
                {entityType.replace('_', ' ')} Documents
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={handleClose} disabled={uploading} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3 }}>
        {/* Info Alert */}
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            bgcolor: 'rgba(155, 48, 183, 0.08)',
            border: '1px solid rgba(155, 48, 183, 0.2)',
            '& .MuiAlert-message': { width: '100%' },
            '& .MuiAlert-icon': { color: '#9b30b7' },
          }}
          icon={<Info />}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: '#000000' }}>
            Secure Off-Chain Storage with Blockchain Verification
          </Typography>
          <Typography variant="caption" sx={{ color: '#666666' }}>
            Documents are encrypted and stored securely. Document hashes are registered on the blockchain for integrity verification.
          </Typography>
        </Alert>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              The following files were rejected:
            </Typography>
            {validationErrors.map((error, idx) => (
              <Typography key={idx} variant="caption" display="block">
                • {error}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Drop Zone */}
        <Card
          sx={{
            mb: 3,
            border: '2px dashed',
            borderColor: dragActive ? '#9b30b7' : '#cccccc',
            borderRadius: 3,
            bgcolor: dragActive ? 'rgba(155, 48, 183, 0.05)' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(155, 48, 183, 0.03)',
              borderColor: '#9b30b7',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 16px rgba(155, 48, 183, 0.15)',
            },
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
                borderRadius: '50%',
                bgcolor: dragActive ? 'rgba(255, 215, 0, 0.2)' : 'rgba(155, 48, 183, 0.1)',
                mb: 2,
                transition: 'all 0.2s ease',
              }}
            >
              <CloudUpload sx={{ 
                fontSize: 48, 
                color: dragActive ? '#FFD700' : '#9b30b7',
                transition: 'all 0.2s ease',
              }} />
            </Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#000000' }}>
              {dragActive ? 'Drop files here' : 'Drop files here or click to browse'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666', mb: 1 }}>
              Supported formats: PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX
            </Typography>
            <Typography variant="caption" sx={{ color: '#999999' }}>
              Maximum file size: 10MB per file
            </Typography>
            <input
              id="file-input"
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(',')}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>

        {/* Upload Summary */}
        {files.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Selected Files ({files.length})
              </Typography>
              <Stack direction="row" spacing={1}>
                {pendingFiles.length > 0 && (
                  <Tooltip title="Toggle encryption for all files">
                    <Button 
                      size="small" 
                      startIcon={<Lock />}
                      onClick={toggleEncryptAll}
                      variant="outlined"
                    >
                      Encrypt All
                    </Button>
                  </Tooltip>
                )}
                {pendingFiles.length > 0 && (
                  <Tooltip title="Remove all files">
                    <Button 
                      size="small" 
                      color="error"
                      startIcon={<DeleteSweep />}
                      onClick={removeAllFiles}
                      variant="outlined"
                    >
                      Clear All
                    </Button>
                  </Tooltip>
                )}
              </Stack>
            </Stack>

            {/* Summary Stats */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: 'grey.50', boxShadow: 'none' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Pending</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{pendingFiles.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: 'success.50', boxShadow: 'none' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="success.dark">Uploaded</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {successfulFiles.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: 'error.50', boxShadow: 'none' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="error.dark">Failed</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {errorFiles.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* File List */}
        {files.length > 0 && (
          <Box sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
            {files.map((fileData, index) => (
              <Card
                key={index}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: fileData.status === 'success' ? 'success.light' : 
                              fileData.status === 'error' ? 'error.light' : 'divider',
                  bgcolor: fileData.status === 'success' ? 'success.50' : 
                          fileData.status === 'error' ? 'error.50' : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {/* File Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      minWidth: 56,
                      height: 56,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}>
                      {getFileIcon(fileData.file.name)}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }} noWrap>
                        {fileData.file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {formatFileSize(fileData.file.size)}
                      </Typography>
                      
                      {/* Status Badges */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {fileData.encrypt && (
                          <Chip 
                            icon={<Lock />} 
                            label="Encrypted" 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              height: 24,
                              borderColor: '#9b30b7',
                              color: '#9b30b7',
                            }}
                          />
                        )}
                        {fileData.ipfsCID && (
                          <Chip 
                            icon={<Language />} 
                            label="IPFS" 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              height: 24,
                              borderColor: '#9b30b7',
                              color: '#9b30b7',
                            }}
                          />
                        )}
                        {fileData.status === 'success' && (
                          <Chip 
                            icon={<CheckCircle />} 
                            label="Success" 
                            size="small" 
                            sx={{ 
                              height: 24,
                              bgcolor: 'rgba(255, 215, 0, 0.15)',
                              color: '#000000',
                              border: '1px solid #FFD700',
                              '& .MuiChip-icon': {
                                color: '#FFD700',
                              },
                            }}
                          />
                        )}
                        {fileData.status === 'error' && (
                          <Chip 
                            icon={<ErrorIcon />} 
                            label="Failed" 
                            size="small" 
                            sx={{ 
                              height: 24,
                              bgcolor: 'rgba(155, 48, 183, 0.15)',
                              color: '#9b30b7',
                              border: '1px solid #9b30b7',
                              '& .MuiChip-icon': {
                                color: '#9b30b7',
                              },
                            }}
                          />
                        )}
                      </Stack>
                    </Box>

                    {fileData.status === 'pending' && (
                      <Tooltip title="Remove file">
                        <IconButton 
                          size="small" 
                          onClick={() => removeFile(index)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {/* File Configuration (Pending) */}
                  {fileData.status === 'pending' && (
                    <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Document Category *"
                            value={fileData.category}
                            onChange={(e) => updateFile(index, { category: e.target.value })}
                          >
                            {availableCategories.map(cat => (
                              <MenuItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={fileData.encrypt}
                                onChange={(e) => updateFile(index, { encrypt: e.target.checked })}
                                color="primary"
                              />
                            }
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Lock fontSize="small" />
                                <Typography variant="body2">Encrypt this file</Typography>
                              </Box>
                            }
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Description (optional)"
                            value={fileData.description}
                            onChange={(e) => updateFile(index, { description: e.target.value })}
                            multiline
                            rows={2}
                            placeholder="Add a description for this document..."
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Uploading Progress */}
                  {fileData.status === 'uploading' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Uploading to blockchain network...
                      </Typography>
                      <LinearProgress variant="indeterminate" sx={{ borderRadius: 1 }} />
                    </Box>
                  )}

                  {/* Success Details */}
                  {fileData.status === 'success' && (
                    <Alert severity="success" sx={{ mt: 1, borderRadius: 1 }}>
                      <Typography variant="caption" component="div">
                        <strong>✓ Upload successful</strong>
                      </Typography>
                      <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid', borderColor: 'success.light' }}>
                        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                          <strong>Document ID:</strong> {fileData.documentId}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                          <strong>Hash:</strong> {fileData.hash?.slice(0, 32)}...
                        </Typography>
                        {fileData.ipfsCID && (
                          <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                            <strong>IPFS CID:</strong> {fileData.ipfsCID.slice(0, 32)}...
                          </Typography>
                        )}
                      </Box>
                    </Alert>
                  )}

                  {/* Error Details */}
                  {fileData.status === 'error' && (
                    <Alert severity="error" sx={{ mt: 1, borderRadius: 1 }}>
                      <Typography variant="caption">
                        <strong>Upload failed:</strong> {fileData.error || 'Unknown error occurred'}
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Description sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No files selected
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Upload documents to attach them to this {entityType?.toLowerCase() || 'entity'}
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ px: 3, py: 2.5, bgcolor: '#fafafa' }}>
        <Button 
          onClick={handleClose} 
          disabled={uploading}
          variant="outlined"
          size="large"
          sx={{
            borderColor: '#9b30b7',
            color: '#9b30b7',
            textTransform: 'none',
            px: 3,
            '&:hover': {
              borderColor: '#7b1fa2',
              bgcolor: 'rgba(155, 48, 183, 0.05)',
            },
          }}
        >
          {allUploaded ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={uploadFiles}
          disabled={pendingFiles.length === 0 || uploading}
          startIcon={uploading ? null : <CloudUpload />}
          size="large"
          sx={{ 
            minWidth: 160,
            bgcolor: '#9b30b7',
            textTransform: 'none',
            px: 4,
            '&:hover': {
              bgcolor: '#7b1fa2',
            },
            '&:disabled': {
              bgcolor: '#cccccc',
              color: '#999999',
            },
          }}
        >
          {uploading 
            ? 'Uploading...' 
            : `Upload ${pendingFiles.length} File${pendingFiles.length !== 1 ? 's' : ''}`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};
