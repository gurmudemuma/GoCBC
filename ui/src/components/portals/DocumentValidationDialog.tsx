/**
 * Document Validation Dialog
 * Professional dialog for viewing and validating documents before approval/rejection
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Description,
  Warning,
  Download,
  Visibility,
  AttachFile,
  Close,
} from '@mui/icons-material';

interface Document {
  id: string;
  name: string;
  type: string;
  status: 'AVAILABLE' | 'MISSING' | 'INCOMPLETE';
  url?: string;
  uploadedDate?: string;
  size?: string;
}

interface PrerequisiteCheck {
  label: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
}

interface ValidationData {
  entityId: string;
  entityType: string;
  title: string;
  summary: {
    label: string;
    value: string;
  }[];
  prerequisites: PrerequisiteCheck[];
  documents: Document[];
  complianceChecks?: {
    label: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED';
    details: string;
  }[];
  additionalInfo?: string;
}

interface DocumentValidationDialogProps {
  open: boolean;
  onClose: () => void;
  data: ValidationData | null;
  onApprove?: (notes: string) => void;
  onReject?: (reason: string) => void;
  approveLabel?: string;
  rejectLabel?: string;
  showRejectOption?: boolean;
  readOnly?: boolean; // Add read-only mode for view-only
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`validation-tabpanel-${index}`}
      aria-labelledby={`validation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export const DocumentValidationDialog: React.FC<DocumentValidationDialogProps> = ({
  open,
  onClose,
  data,
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  showRejectOption = true,
  readOnly = false,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [acknowledgeChecks, setAcknowledgeChecks] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!data) return null;

  const handleApprove = () => {
    if (!acknowledgeChecks) {
      alert('Please acknowledge that you have reviewed all prerequisites and documents.');
      return;
    }
    if (onApprove) {
      onApprove(approvalNotes);
    }
    handleClose();
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    if (onReject) {
      onReject(rejectionReason);
    }
    handleClose();
  };

  const handleClose = () => {
    setTabValue(0);
    setApprovalNotes('');
    setRejectionReason('');
    setAcknowledgeChecks(false);
    setShowRejectForm(false);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
      case 'COMPLIANT':
      case 'AVAILABLE':
        return 'success';
      case 'FAILED':
      case 'NON_COMPLIANT':
      case 'MISSING':
        return 'error';
      case 'WARNING':
      case 'REVIEW_REQUIRED':
      case 'INCOMPLETE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const allPrerequisitesPassed = data.prerequisites.every(p => p.status === 'PASSED');
  const allDocumentsAvailable = data.documents.every(d => d.status === 'AVAILABLE');
  const allComplianceChecks = data.complianceChecks?.every(c => c.status === 'COMPLIANT') ?? true;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description color="primary" />
          <Typography variant="h6" component="div">
            {data.title}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {/* Summary Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
            {data.entityType} SUMMARY
          </Typography>
          <Grid container spacing={2}>
            {data.summary.map((item, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {item.value}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Tabs for Different Sections */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Prerequisites" />
            <Tab label={`Documents (${data.documents.length})`} />
            {data.complianceChecks && <Tab label="Compliance" />}
          </Tabs>
        </Box>

        {/* Prerequisites Tab */}
        <TabPanel value={tabValue} index={0}>
          <List>
            {data.prerequisites.map((prereq, idx) => (
              <ListItem key={idx} sx={{ px: 0 }}>
                <ListItemIcon>
                  {prereq.status === 'PASSED' ? (
                    <CheckCircle color="success" />
                  ) : prereq.status === 'FAILED' ? (
                    <Cancel color="error" />
                  ) : (
                    <Warning color="warning" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={prereq.label}
                  secondary={prereq.details}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <Chip
                  label={prereq.status}
                  color={getStatusColor(prereq.status)}
                  size="small"
                />
              </ListItem>
            ))}
          </List>

          {!allPrerequisitesPassed && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Some prerequisites have not been met. Review carefully before proceeding.
            </Alert>
          )}
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={1}>
          {data.documents.length === 0 ? (
            <Alert severity="info">No documents uploaded yet.</Alert>
          ) : (
            <>
              <List>
                {data.documents.map((doc, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <AttachFile 
                        sx={{ 
                          fontSize: 40, 
                          color: doc.status === 'AVAILABLE' ? 'primary.main' : 'text.disabled' 
                        }} 
                      />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {doc.name}
                          </Typography>
                          <Chip
                            label={doc.status}
                            color={getStatusColor(doc.status)}
                            size="small"
                          />
                        </Box>
                        
                        {doc.status === 'AVAILABLE' && (
                          <>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Type
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                  {doc.type}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Size
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                  {doc.size}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Uploaded
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                  {doc.uploadedDate}
                                </Typography>
                              </Grid>
                              <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Document ID
                                </Typography>
                                <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                                  {doc.id}
                                </Typography>
                              </Grid>
                            </Grid>

                            {/* Document Preview/Actions - Only show if doc has valid ID starting with DOC_ */}
                            {doc.id && doc.id.startsWith('DOC_') ? (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Visibility />}
                                  onClick={async () => {
                                    try {
                                      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
                                      
                                      // Construct document URL - only use doc.url if it's a full URL, otherwise use doc.id
                                      let docUrl: string;
                                      if (doc.url && doc.url.startsWith('http')) {
                                        docUrl = doc.url;
                                      } else if (doc.url && doc.url.startsWith('/api/v1/')) {
                                        // Remove /api/v1/ prefix if present to avoid duplication
                                        docUrl = `${apiUrl}${doc.url.replace('/api/v1', '')}`;
                                      } else if (doc.id) {
                                        docUrl = `${apiUrl}/documents/${doc.id}`;
                                      } else {
                                        throw new Error('Document ID is missing');
                                      }
                                      
                                      console.log('[DOCUMENT] Viewing document:', { 
                                        docId: doc.id, 
                                        docUrl, 
                                        docUrlRaw: doc.url,
                                        docStatus: doc.status,
                                        docName: doc.name,
                                        apiUrl
                                      });
                                      
                                      // Get auth token from localStorage
                                      const token = localStorage.getItem('authToken');
                                      if (!token) {
                                        alert('Authentication required. Please log in again.');
                                        return;
                                      }
                                      
                                      // Fetch document with auth headers
                                      const response = await fetch(docUrl, {
                                        headers: {
                                          'Authorization': `Bearer ${token}`
                                        }
                                      });
                                      
                                      if (!response.ok) {
                                        console.error('[DOCUMENT] Fetch failed:', {
                                          status: response.status,
                                          statusText: response.statusText
                                        });
                                        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
                                      }
                                      
                                      // Create blob URL and open in new tab
                                      const blob = await response.blob();
                                      const blobUrl = URL.createObjectURL(blob);
                                      window.open(blobUrl, '_blank');
                                      
                                      // Clean up blob URL after a delay
                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                    } catch (error) {
                                      console.error('[DOCUMENT] Error viewing document:', error);
                                      alert(`Failed to view document: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    }
                                  }}
                                >
                                  View Document
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  startIcon={<Download />}
                                  onClick={async () => {
                                    try {
                                      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
                                      
                                      // Construct document URL - only use doc.url if it's a full URL, otherwise use doc.id
                                      let docUrl: string;
                                      if (doc.url && doc.url.startsWith('http')) {
                                        docUrl = doc.url;
                                      } else if (doc.url && doc.url.startsWith('/api/v1/')) {
                                        // Remove /api/v1/ prefix if present to avoid duplication
                                        docUrl = `${apiUrl}${doc.url.replace('/api/v1', '')}`;
                                      } else if (doc.id) {
                                        docUrl = `${apiUrl}/documents/${doc.id}`;
                                      } else {
                                        throw new Error('Document ID is missing');
                                      }
                                      
                                      console.log('[DOCUMENT] Downloading document:', { 
                                        docId: doc.id, 
                                        docUrl, 
                                        docName: doc.name,
                                        docStatus: doc.status,
                                        docUrlRaw: doc.url,
                                        apiUrl
                                      });
                                      
                                      // Get auth token from localStorage
                                      const token = localStorage.getItem('authToken');
                                      if (!token) {
                                        alert('Authentication required. Please log in again.');
                                        return;
                                      }
                                      
                                      // Fetch document with auth headers
                                      const response = await fetch(docUrl, {
                                        headers: {
                                          'Authorization': `Bearer ${token}`
                                        }
                                      });
                                      
                                      if (!response.ok) {
                                        console.error('[DOCUMENT] Fetch failed:', {
                                          status: response.status,
                                          statusText: response.statusText
                                        });
                                        throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
                                      }
                                      
                                      // Create blob and download
                                      const blob = await response.blob();
                                      const blobUrl = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = blobUrl;
                                      link.download = doc.name;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      
                                      // Clean up
                                      URL.revokeObjectURL(blobUrl);
                                      console.log('[DOCUMENT] Download completed');
                                    } catch (error) {
                                      console.error('[DOCUMENT] Error downloading document:', error);
                                      alert(`Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    }
                                  }}
                                >
                                  Download
                                </Button>
                              </Box>
                            ) : (
                              <Alert severity="info" sx={{ mt: 1 }}>
                                This document has not been uploaded yet. Document actions are not available for placeholder documents.
                              </Alert>
                            )}

                            {/* Document Preview Section */}
                            <Paper 
                              variant="outlined" 
                              sx={{ 
                                mt: 2, 
                                p: 2, 
                                bgcolor: 'grey.50',
                                borderStyle: 'dashed'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {doc.type} Document Preview
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Click "View Document" to open full viewer
                                  </Typography>
                                </Box>
                              </Box>
                            </Paper>
                          </>
                        )}

                        {doc.status === 'MISSING' && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            This required document has not been uploaded. Approval cannot proceed without this document.
                          </Alert>
                        )}

                        {doc.status === 'INCOMPLETE' && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            This document is incomplete or corrupted. Request re-upload before approval.
                          </Alert>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </List>

              {!allDocumentsAvailable && (
                <Alert severity="warning" icon={<Warning />}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Missing or Incomplete Documents
                  </Typography>
                  <Typography variant="body2">
                    {data.documents.filter(d => d.status !== 'AVAILABLE').length} document(s) need attention. 
                    Verify all documents are available before proceeding with approval.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </TabPanel>

        {/* Compliance Tab */}
        {data.complianceChecks && (
          <TabPanel value={tabValue} index={2}>
            <List>
              {data.complianceChecks.map((check, idx) => (
                <ListItem key={idx} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {check.status === 'COMPLIANT' ? (
                      <CheckCircle color="success" />
                    ) : check.status === 'NON_COMPLIANT' ? (
                      <Cancel color="error" />
                    ) : (
                      <Warning color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={check.label}
                    secondary={check.details}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                  <Chip
                    label={check.status.replace('_', ' ')}
                    color={getStatusColor(check.status)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>

            {!allComplianceChecks && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Compliance checks have not all passed. Review requirements before approval.
              </Alert>
            )}
          </TabPanel>
        )}

        {/* Additional Information */}
        {data.additionalInfo && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {data.additionalInfo}
          </Alert>
        )}

        {/* Approval/Rejection Form */}
        {!readOnly && (
          <>
            {!showRejectForm ? (
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Approval Notes (Optional)"
                  multiline
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes or comments about this approval..."
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acknowledgeChecks}
                      onChange={(e) => setAcknowledgeChecks(e.target.checked)}
                    />
                  }
                  label="I have reviewed all prerequisites, documents, and compliance checks"
                  sx={{ mt: 2 }}
                />
              </Box>
            ) : (
              <Box sx={{ mt: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Please provide a detailed reason for rejection. This will be communicated to the applicant.
                </Alert>
                <TextField
                  fullWidth
                  required
                  label="Rejection Reason"
                  multiline
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify the reason for rejection (e.g., missing documents, incorrect information, compliance issues)..."
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && !showRejectForm && (
          <>
            {showRejectOption && (
              <Button
                onClick={() => setShowRejectForm(true)}
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
              >
                {rejectLabel}
              </Button>
            )}
            <Button
              onClick={handleApprove}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              disabled={!acknowledgeChecks}
            >
              {approveLabel}
            </Button>
          </>
        )}
        {!readOnly && showRejectForm && (
          <>
            <Button onClick={() => setShowRejectForm(false)} variant="outlined">
              Back
            </Button>
            <Button
              onClick={handleReject}
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              disabled={!rejectionReason.trim()}
            >
              Confirm {rejectLabel}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
