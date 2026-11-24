/**
 * Payment Initiation Dialog
 * Comprehensive dialog for initiating payments with method selection
 * Added: June 26, 2026 - Payment Method Differentiation
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import PaymentMethodSelector, { PaymentMethodType } from '../common/PaymentMethodSelector';
import { apiFetch } from '@/config/api.config';

interface Contract {
  contractId: string;
  exporterId: string;
  buyerName: string;
  buyerCountry: string;
  totalValue: number;
  currency: string;
  buyerBank?: string;
  exporterBank?: string;
}

interface PaymentInitiationDialogProps {
  open: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSuccess: () => void;
}

const PaymentInitiationDialog: React.FC<PaymentInitiationDialogProps> = ({
  open,
  onClose,
  contract,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('LC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    paymentID: '',
    lcID: '',
    receivingBank: '',
    receivingBankBIC: '',
    beneficiaryName: '',
    beneficiaryAccount: '',
    advancePercentage: 30,
    proformaInvoice: '',
  });

  const steps = ['Select Payment Method', 'Enter Payment Details', 'Confirm & Submit'];

  useEffect(() => {
    if (open && contract) {
      // Auto-generate payment ID
      setFormData(prev => ({
        ...prev,
        paymentID: `PAY${Date.now()}`,
        receivingBank: contract.exporterBank || '',
        beneficiaryName: contract.exporterId || '',
      }));
    }
  }, [open, contract]);

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate payment method selection
      if (!paymentMethod) {
        setError('Please select a payment method');
        return;
      }
      setError(null);
    }
    
    if (activeStep === 1) {
      // Validate form data
      const errors = validateFormData();
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }
      setError(null);
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const validateFormData = (): string[] => {
    const errors: string[] = [];
    
    // Method-specific validation
    if (paymentMethod === 'LC' && !formData.lcID) {
      errors.push('LC ID is required for LC payment');
    }
    
    if (!formData.receivingBank) {
      errors.push('Receiving bank is required');
    }
    
    if (!formData.receivingBankBIC) {
      errors.push('Receiving bank BIC is required');
    }
    
    if (!formData.beneficiaryAccount) {
      errors.push('Beneficiary account is required');
    }
    
    if ((paymentMethod === 'TT_ADVANCE' || paymentMethod === 'ADVANCE') && 
        (formData.advancePercentage <= 0 || formData.advancePercentage > 100)) {
      errors.push('Advance percentage must be between 1 and 100');
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    if (!contract) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated');
      
      const response = await apiFetch('/banking/payment/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentID: formData.paymentID,
          contractID: contract.contractId,
          exporterID: contract.exporterId,
          lcID: formData.lcID || '',
          amount: contract.totalValue,
          currency: contract.currency,
          receivingBank: formData.receivingBank,
          receivingBankBIC: formData.receivingBankBIC,
          beneficiaryName: formData.beneficiaryName,
          beneficiaryAccount: formData.beneficiaryAccount,
          paymentMethod: paymentMethod,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to initiate payment');
      }
      
      // Success - now handle method-specific follow-ups
      if (paymentMethod === 'TT_ADVANCE' || paymentMethod === 'ADVANCE') {
        // Auto-request advance if specified
        if (formData.advancePercentage > 0) {
          await requestAdvancePayment(formData.paymentID, formData.advancePercentage);
        }
      }
      
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const requestAdvancePayment = async (paymentID: string, percentage: number) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token || !contract) return;
      
      await apiFetch('/banking/payment/${paymentID}/status', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ADVANCE_REQUESTED',
        }),
      });
    } catch (err) {
      console.error('Failed to update status to ADVANCE_REQUESTED:', err);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    setFormData({
      paymentID: '',
      lcID: '',
      receivingBank: '',
      receivingBankBIC: '',
      beneficiaryName: '',
      beneficiaryAccount: '',
      advancePercentage: 30,
      proformaInvoice: '',
    });
    onClose();
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Initiate Payment</Typography>
          <Button onClick={handleClose} color="inherit" size="small">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {/* Contract Info */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>Contract:</strong> {contract.contractId}
          </Typography>
          <Typography variant="body2">
            Buyer: {contract.buyerName} ({contract.buyerCountry}) | 
            Amount: ${contract.totalValue.toLocaleString()} {contract.currency}
          </Typography>
        </Alert>
        
        {/* Step 1: Select Payment Method */}
        {activeStep === 0 && (
          <PaymentMethodSelector
            value={paymentMethod}
            onChange={setPaymentMethod}
            showDetails={true}
          />
        )}
        
        {/* Step 2: Enter Payment Details */}
        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment ID"
                value={formData.paymentID}
                disabled
                helperText="Auto-generated payment identifier"
              />
            </Grid>
            
            {paymentMethod === 'LC' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Letter of Credit ID"
                  value={formData.lcID}
                  onChange={(e) => setFormData({ ...formData, lcID: e.target.value })}
                  required
                  helperText="LC must be ISSUED before payment can be initiated"
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Receiving Bank"
                value={formData.receivingBank}
                onChange={(e) => setFormData({ ...formData, receivingBank: e.target.value })}
                required
                helperText="Ethiopian bank (advising bank)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Receiving Bank BIC"
                value={formData.receivingBankBIC}
                onChange={(e) => setFormData({ ...formData, receivingBankBIC: e.target.value })}
                required
                placeholder="CBETETAA"
                helperText="SWIFT BIC code"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Beneficiary Name"
                value={formData.beneficiaryName}
                onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                required
                helperText="Exporter name"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Beneficiary Account"
                value={formData.beneficiaryAccount}
                onChange={(e) => setFormData({ ...formData, beneficiaryAccount: e.target.value })}
                required
                helperText="Exporter account number"
              />
            </Grid>
            
            {(paymentMethod === 'TT_ADVANCE' || paymentMethod === 'ADVANCE') && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Advance Percentage"
                  value={formData.advancePercentage}
                  onChange={(e) => setFormData({ ...formData, advancePercentage: parseInt(e.target.value) })}
                  InputProps={{ inputProps: { min: 1, max: 100 } }}
                  helperText={`Request ${formData.advancePercentage}% advance payment ($${((contract.totalValue * formData.advancePercentage) / 100).toLocaleString()})`}
                />
              </Grid>
            )}
            
            {paymentMethod === 'ADVANCE' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Proforma Invoice"
                  value={formData.proformaInvoice}
                  onChange={(e) => setFormData({ ...formData, proformaInvoice: e.target.value })}
                  multiline
                  rows={3}
                  helperText="Proforma invoice details or reference number"
                />
              </Grid>
            )}
          </Grid>
        )}
        
        {/* Step 3: Confirm & Submit */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Payment Details
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Payment Method:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" fontWeight="bold">{paymentMethod}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Payment ID:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1">{formData.paymentID}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Amount:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1">
                  ${contract.totalValue.toLocaleString()} {contract.currency}
                </Typography>
              </Grid>
              
              {paymentMethod === 'LC' && formData.lcID && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">LC ID:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">{formData.lcID}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Receiving Bank:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1">{formData.receivingBank}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Beneficiary:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1">{formData.beneficiaryName}</Typography>
              </Grid>
              
              {(paymentMethod === 'TT_ADVANCE' || paymentMethod === 'ADVANCE') && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Advance Percentage:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      {formData.advancePercentage}% 
                      (${((contract.totalValue * formData.advancePercentage) / 100).toLocaleString()})
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Please confirm all details are correct before submitting. 
                This will initiate the {paymentMethod} payment workflow.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={loading}>
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Initiating...' : 'Initiate Payment'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaymentInitiationDialog;
