// Payment Document Submission Component for BanksPortal
import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  FormControlLabel,
  Checkbox,
  Typography,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Upload, CheckCircle, Visibility, Delete, Warning, Info, AccessTime } from '@mui/icons-material';
import { AnimatedButton, StatusChip } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import api from '@/utils/api';
import {
  canSubmitPaymentDocuments,
  getRequiredDocuments,
  getDeadlineInfo,
  getWorkflowStageMessage,
} from '@/utils/workflowEnforcement';

interface Payment {
  paymentId: string;
  contractId: string;
  exporterId: string;
  amount: number;
  currency: string;
  status: string;
  documents?: string[];
  lcDetails?: {
    lcId: string;
    issuingBank: string;
    beneficiary: string;
  };
}

export const PaymentDocuments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [newDocument, setNewDocument] = useState('');
  const [verificationComments, setVerificationComments] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [lcCompliant, setLcCompliant] = useState(true);
  const { notification, showSuccess, showError, showWarning, closeNotification } = useNotification();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      // Load payments that need document submission or verification
      const pendingResponse = await api.get('/banking/payments?status=PENDING');
      const submittedResponse = await api.get('/banking/payments?status=DOCUMENTS_SUBMITTED');
      
      const allPayments = [
        ...(pendingResponse.data?.data || []),
        ...(submittedResponse.data?.data || []),
      ];
      
      setPayments(allPayments);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  };

  const handleAddDocument = () => {
    if (newDocument.trim()) {
      setDocuments([...documents, newDocument.trim()]);
      setNewDocument('');
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmitDocuments = async () => {
    if (!selectedPayment || documents.length === 0) return;

    try {
      const response = await api.post(
        `/banking/payment/${selectedPayment.paymentId}/submit-documents`,
        { documents }
      );

      if (response.data.success) {
        showSuccess(
          'Documents Submitted',
          'Payment documents have been successfully submitted',
          `${documents.length} documents submitted for payment ${selectedPayment.paymentId}`
        );
        setSubmitDialogOpen(false);
        setDocuments([]);
        loadPayments();
      } else {
        showError(
          'Submission Failed',
          response.data.error?.message || 'Failed to submit documents',
          'Please verify the payment status'
        );
      }
    } catch (error: any) {
      showError(
        'Error Submitting Documents',
        error.response?.data?.error?.message || 'An unexpected error occurred',
        error.message
      );
    }
  };

  const handleVerifyDocuments = async () => {
    if (!selectedPayment || !verifiedBy) return;

    if (!lcCompliant) {
      showWarning(
        'LC Compliance Required',
        'Documents must comply with LC terms',
        'Please verify all documents meet UCP 600 requirements before approving'
      );
      return;
    }

    try {
      const response = await api.post(
        `/banking/payment/${selectedPayment.paymentId}/verify-documents`,
        {
          verifiedBy: verifiedBy,
          comments: verificationComments || 'Documents verified against LC terms',
        }
      );

      if (response.data.success) {
        showSuccess(
          'Documents Verified',
          'Payment documents have been verified and approved',
          `Verified by: ${verifiedBy} | Payment can proceed to SWIFT`
        );
        setVerifyDialogOpen(false);
        setVerificationComments('');
        setVerifiedBy('');
        setLcCompliant(true);
        loadPayments();
      } else {
        showError(
          'Verification Failed',
          response.data.error?.message || 'Failed to verify documents',
          'Please review the documents again'
        );
      }
    } catch (error: any) {
      showError(
        'Error Verifying Documents',
        error.response?.data?.error?.message || 'An unexpected error occurred',
        error.message
      );
    }
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Payment ID</TableCell>
              <TableCell>Contract</TableCell>
              <TableCell>Exporter</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.paymentId}>
                <TableCell>{payment.paymentId}</TableCell>
                <TableCell>{payment.contractId}</TableCell>
                <TableCell>{payment.exporterId}</TableCell>
                <TableCell>
                  {payment.currency} {payment.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusChip status={payment.status as any} label={payment.status} />
                </TableCell>
                <TableCell>
                  {payment.documents?.length || 0} docs
                </TableCell>
                <TableCell>
                  {payment.status === 'PENDING' && (
                    <AnimatedButton
                      size="small"
                      startIcon={<Upload />}
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDocuments([
                          'Commercial Invoice',
                          'Packing List',
                          'Bill of Lading',
                          'Certificate of Origin',
                          'Quality Certificate',
                        ]);
                        setSubmitDialogOpen(true);
                      }}
                    >
                      Submit Documents
                    </AnimatedButton>
                  )}
                  {payment.status === 'DOCUMENTS_SUBMITTED' && (
                    <AnimatedButton
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() => {
                        setSelectedPayment(payment);
                        setVerifyDialogOpen(true);
                      }}
                    >
                      Verify Documents
                    </AnimatedButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submit Documents Dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Submit Payment Documents</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Submit required shipping documents for LC compliance verification.
          </Alert>
          
          {selectedPayment?.lcDetails && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Letter of Credit Details:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                LC Number: <strong>{selectedPayment.lcDetails.lcId}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Issuing Bank: <strong>{selectedPayment.lcDetails.issuingBank}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Beneficiary: <strong>{selectedPayment.lcDetails.beneficiary}</strong>
              </Typography>
            </Box>
          )}
          
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Required Documents:
          </Typography>

          <List sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
            {documents.map((doc, index) => (
              <ListItem
                key={index}
                sx={{ borderBottom: index < documents.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveDocument(index)} color="error">
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText 
                  primary={doc}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItem>
            ))}
          </List>

          <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
            <TextField
              fullWidth
              label="Add Document"
              value={newDocument}
              onChange={(e) => setNewDocument(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDocument()}
              variant="outlined"
              placeholder="e.g., Phytosanitary Certificate"
            />
            <Button onClick={handleAddDocument} variant="outlined" sx={{ minWidth: 100 }}>Add</Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSubmitDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={handleSubmitDocuments}
            disabled={documents.length === 0}
          >
            Submit {documents.length} Document{documents.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verify Documents Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Verify Payment Documents</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Review and verify documents against LC terms before approving payment.
          </Alert>
          
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Submitted Documents:
          </Typography>

          <List sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
            {selectedPayment?.documents?.map((doc, index) => (
              <ListItem 
                key={index}
                sx={{ borderBottom: index < (selectedPayment?.documents?.length || 0) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}
              >
                <ListItemText 
                  primary={doc}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <Chip label="Submitted" size="small" color="success" variant="outlined" />
              </ListItem>
            ))}
          </List>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Verified By</InputLabel>
                <Select
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  label="Verified By"
                >
                  <MenuItem value="Bank Trade Finance Officer">Bank Trade Finance Officer</MenuItem>
                  <MenuItem value="Senior LC Specialist">Senior LC Specialist</MenuItem>
                  <MenuItem value="Documentary Credit Manager">Documentary Credit Manager</MenuItem>
                  <MenuItem value="Compliance Officer">Compliance Officer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={lcCompliant} 
                    onChange={(e) => setLcCompliant(e.target.checked)}
                    color="success"
                  />
                }
                label="All documents comply with LC terms (UCP 600)"
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Verification Comments"
            multiline
            rows={4}
            value={verificationComments}
            onChange={(e) => setVerificationComments(e.target.value)}
            variant="outlined"
            placeholder="Document verification notes and compliance confirmation..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVerifyDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<CheckCircle />} 
            onClick={handleVerifyDocuments}
            disabled={!verifiedBy || !lcCompliant}
          >
            Verify & Approve
          </Button>
        </DialogActions>
      </Dialog>

      <NotificationDialog
        open={notification.open}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </Box>
  );
};
