// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Repatriation Initiation Dialog - Banks Portal
// Form to initiate export proceeds repatriation process

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
  InputAdornment,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Close,
  AttachMoney,
  Send,
  AccountBalance,
  Receipt,
  SwapHoriz,
  Warning,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const CBE_COLORS = {
  purple: '#9b30b7',
  golden: '#FFD700',
};

interface Payment {
  paymentId: string;
  contractId: string;
  shipmentId: string;
  exporterId: string;
  exporterName?: string;
  amount: number;
  currency: string;
}

interface RepatriationInitiationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPayment?: Payment | null;
}

const RepatriationInitiationDialog: React.FC<RepatriationInitiationDialogProps> = ({
  open,
  onClose,
  onSuccess,
  preselectedPayment,
}) => {
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [formData, setFormData] = useState({
    repatriationId: '',
    paymentId: '',
    contractId: '',
    shipmentId: '',
    exporterId: '',
    exportAmount: '',
    currency: 'USD',
    fcyAccountNumber: '',
    fcyBank: '',
    fcyBankBIC: '',
    shipmentDate: '',
    swiftReference: '',
    bankStatementRef: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load payments on mount
  useEffect(() => {
    if (open) {
      fetchPayments();
      generateRepatriationId();
    }
  }, [open]);

  // Preselect payment if provided
  useEffect(() => {
    if (preselectedPayment) {
      setFormData(prev => ({
        ...prev,
        paymentId: preselectedPayment.paymentId,
        contractId: preselectedPayment.contractId,
        shipmentId: preselectedPayment.shipmentId,
        exporterId: preselectedPayment.exporterId,
        exportAmount: preselectedPayment.amount.toString(),
        currency: preselectedPayment.currency,
      }));
    }
  }, [preselectedPayment]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/v1/payments', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.success) {
        // Filter payments that need repatriation
        const eligible = result.data.filter((p: Payment) => 
          p.amount > 0 && (p.currency === 'USD' || p.currency === 'EUR')
        );
        setPayments(eligible);
      }
    } catch (error) {
      console.error('[REPATRIATION] Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRepatriationId = () => {
    const id = `REP${Date.now()}`;
    setFormData(prev => ({ ...prev, repatriationId: id }));
  };

  const handlePaymentSelect = (payment: Payment | null) => {
    if (payment) {
      setFormData(prev => ({
        ...prev,
        paymentId: payment.paymentId,
        contractId: payment.contractId,
        shipmentId: payment.shipmentId,
        exporterId: payment.exporterId,
        exportAmount: payment.amount.toString(),
        currency: payment.currency,
      }));
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentId) newErrors.paymentId = 'Payment is required';
    if (!formData.exportAmount || parseFloat(formData.exportAmount) <= 0) {
      newErrors.exportAmount = 'Valid export amount required';
    }
    if (!formData.currency) newErrors.currency = 'Currency is required';
    if (!formData.fcyAccountNumber) newErrors.fcyAccountNumber = 'FCY account number is required';
    if (!formData.fcyBank) newErrors.fcyBank = 'FCY bank is required';
    if (!formData.fcyBankBIC) newErrors.fcyBankBIC = 'BIC/SWIFT code is required';
    if (!formData.shipmentDate) newErrors.shipmentDate = 'Shipment date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await apiFetch('/api/v1/repatriation/initiate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          repatriationId: formData.repatriationId,
          paymentId: formData.paymentId,
          contractId: formData.contractId,
          shipmentId: formData.shipmentId,
          exporterId: formData.exporterId,
          exportAmount: parseFloat(formData.exportAmount),
          currency: formData.currency,
          fcyAccountNumber: formData.fcyAccountNumber,
          fcyBank: formData.fcyBank,
          fcyBankBIC: formData.fcyBankBIC,
          shipmentDate: formData.shipmentDate,
          swiftReference: formData.swiftReference || undefined,
          bankStatementRef: formData.bankStatementRef || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Repatriation initiated successfully');
        onSuccess();
        onClose();
        resetForm();
      } else {
        showError(result.error || 'Failed to initiate repatriation');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error submitting:', error);
      showError('Failed to initiate repatriation');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      repatriationId: '',
      paymentId: '',
      contractId: '',
      shipmentId: '',
      exporterId: '',
      exportAmount: '',
      currency: 'USD',
      fcyAccountNumber: '',
      fcyBank: '',
      fcyBankBIC: '',
      shipmentDate: '',
      swiftReference: '',
      bankStatementRef: '',
      notes: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  // Calculate 60/40 split
  const exportAmount = parseFloat(formData.exportAmount) || 0;
  const fcyRetention = exportAmount * 0.4;
  const nbeConversion = exportAmount * 0.6;
  const exchangeRate = 115.5; // Current rate
  const etbAmount = nbeConversion * exchangeRate;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: `4px solid ${CBE_COLORS.purple}`,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AttachMoney sx={{ color: CBE_COLORS.purple }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Initiate Export Proceeds Repatriation
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Register repatriation of export proceeds to Ethiopia
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={submitting}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Box>
          {/* Info Alert */}
          <Alert severity="info" sx={{ mb: 3 }} icon={<Warning />}>
            Export proceeds must be repatriated within 60 days of shipment. NBE monitors compliance.
          </Alert>

          {/* Repatriation ID */}
          <TextField
            fullWidth
            label="Repatriation ID"
            value={formData.repatriationId}
            disabled
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Receipt />
                </InputAdornment>
              ),
            }}
          />

          {/* Payment Selection */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={payments}
                getOptionLabel={(option) => 
                  `${option.paymentId} - ${option.exporterName || option.exporterId} - ${option.currency} ${option.amount.toLocaleString()}`
                }
                value={payments.find(p => p.paymentId === formData.paymentId) || null}
                onChange={(e, value) => handlePaymentSelect(value)}
                loading={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Payment *"
                    error={!!errors.paymentId}
                    helperText={errors.paymentId}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Receipt />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                disabled={!!preselectedPayment}
              />
            </Grid>
          </Grid>

          {/* Export Details */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
            Export Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Export Amount *"
                type="number"
                value={formData.exportAmount}
                onChange={(e) => handleInputChange('exportAmount', e.target.value)}
                error={!!errors.exportAmount}
                helperText={errors.exportAmount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Currency *"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                error={!!errors.currency}
                helperText={errors.currency}
              >
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contract ID"
                value={formData.contractId}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Shipment ID"
                value={formData.shipmentId}
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Shipment Date *"
                value={formData.shipmentDate}
                onChange={(e) => handleInputChange('shipmentDate', e.target.value)}
                error={!!errors.shipmentDate}
                helperText={errors.shipmentDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Banking Details */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
            <AccountBalance sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
            FCY Banking Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="FCY Account Number *"
                value={formData.fcyAccountNumber}
                onChange={(e) => handleInputChange('fcyAccountNumber', e.target.value)}
                error={!!errors.fcyAccountNumber}
                helperText={errors.fcyAccountNumber}
                placeholder="e.g., 1000123456789"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="FCY Bank Name *"
                value={formData.fcyBank}
                onChange={(e) => handleInputChange('fcyBank', e.target.value)}
                error={!!errors.fcyBank}
                helperText={errors.fcyBank}
                placeholder="e.g., Commercial Bank of Ethiopia"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bank BIC/SWIFT Code *"
                value={formData.fcyBankBIC}
                onChange={(e) => handleInputChange('fcyBankBIC', e.target.value)}
                error={!!errors.fcyBankBIC}
                helperText={errors.fcyBankBIC}
                placeholder="e.g., CBETETAA"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SWIFT Reference (Optional)"
                value={formData.swiftReference}
                onChange={(e) => handleInputChange('swiftReference', e.target.value)}
                placeholder="e.g., MT103-202610030001"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bank Statement Reference (Optional)"
                value={formData.bankStatementRef}
                onChange={(e) => handleInputChange('bankStatementRef', e.target.value)}
                placeholder="e.g., Statement #12345"
              />
            </Grid>
          </Grid>

          {/* Financial Breakdown */}
          {exportAmount > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapHoriz /> NBE 60/40 Split Calculation
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      FCY Retention (40%)
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color={CBE_COLORS.purple}>
                      {formData.currency} {fcyRetention.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Retained in exporter's FCY account
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      NBE Conversion (60%)
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color={CBE_COLORS.purple}>
                      {formData.currency} {nbeConversion.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Converted to ETB via NBE
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ETB Amount @ {exchangeRate}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="#2e7d32">
                      ETB {etbAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Deposited to exporter's ETB account
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Notes (Optional)"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional information..."
            sx={{ mt: 3 }}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !formData.paymentId}
          startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
          sx={{ bgcolor: CBE_COLORS.purple }}
        >
          {submitting ? 'Submitting...' : 'Initiate Repatriation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepatriationInitiationDialog;
