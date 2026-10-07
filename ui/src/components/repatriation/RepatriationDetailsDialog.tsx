// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Repatriation Details Dialog
// Displays complete repatriation information with timeline and documents

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
  Divider,
  Chip,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  AttachMoney,
  AccountBalance,
  Schedule,
  CheckCircle,
  Warning,
  Receipt,
  SwapHoriz,
  Person,
  AccessTime,
  VerifiedUser,
} from '@mui/icons-material';
import { BlockchainStatusIcon, BlockchainTxChip } from '@/components/blockchain';
import { apiFetch, getAuthHeaders } from '@/config/api.config';

const NBE_COLORS = {
  bronze: '#8B6F47',
  lightBronze: '#C4A574',
  success: '#2e7d32',
  warning: '#f57c00',
  error: '#d32f2f',
};

interface Repatriation {
  repatriationId: string;
  paymentId: string;
  contractId: string;
  shipmentId: string;
  exporterId: string;
  exporterName?: string;
  exportAmount: number;
  currency: string;
  fcyAccountNumber: string;
  fcyBank: string;
  fcyBankBIC: string;
  shipmentDate: string;
  repatriationDeadline: string;
  status: string;
  initiatedDate: string;
  receivedDate?: string;
  verifiedDate?: string;
  completedDate?: string;
  verifiedBy?: string;
  verifiedByMsp?: string;
  initiatedBy?: string;
  initiatedByMsp?: string;
  daysRemaining?: number;
  daysOverdue?: number;
  swiftReference?: string;
  bankStatementHash?: string;
  verificationNotes?: string;
  fcyRetentionAmount?: number;
  etbConversionAmount?: number;
  exchangeRate?: number;
  txId?: string;
  timestamp?: string;
}

interface RepatriationDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  repatriation: Repatriation;
  onRefresh: () => void;
}

const RepatriationDetailsDialog: React.FC<RepatriationDetailsDialogProps> = ({
  open,
  onClose,
  repatriation,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [detailedData, setDetailedData] = useState<Repatriation | null>(null);

  // Fetch detailed data when dialog opens
  useEffect(() => {
    if (open && repatriation) {
      fetchDetailedData();
    }
  }, [open, repatriation]);

  const fetchDetailedData = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/v1/repatriation/${repatriation.repatriationId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.success) {
        setDetailedData(result.data);
      }
    } catch (error) {
      console.error('[REPATRIATION] Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const data = detailedData || repatriation;

  // Get active step based on status
  const getActiveStep = () => {
    const statusMap: Record<string, number> = {
      INITIATED: 0,
      RECEIVED: 1,
      VERIFIED: 2,
      COMPLIANT: 3,
    };
    return statusMap[data.status] || 0;
  };

  // Timeline steps
  const steps = [
    {
      label: 'Repatriation Initiated',
      description: 'Bank initiated repatriation process',
      date: data.initiatedDate,
      actor: data.initiatedBy || 'Bank Officer',
      msp: data.initiatedByMsp,
    },
    {
      label: 'Funds Received',
      description: 'Export proceeds received in FCY account',
      date: data.receivedDate,
      actor: data.fcyBank,
    },
    {
      label: 'NBE Verification',
      description: 'NBE verified repatriation compliance',
      date: data.verifiedDate,
      actor: data.verifiedBy,
      msp: data.verifiedByMsp,
    },
    {
      label: 'Compliant',
      description: 'Repatriation completed within deadline',
      date: data.completedDate,
    },
  ];

  // Financial breakdown
  const fcyRetention = data.fcyRetentionAmount || (data.exportAmount * 0.4); // 40% retention
  const etbConversion = data.etbConversionAmount || (data.exportAmount * 0.6); // 60% conversion
  const exchangeRate = data.exchangeRate || 115.5;
  const etbAmount = etbConversion * exchangeRate;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: `4px solid ${NBE_COLORS.bronze}`,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AttachMoney sx={{ color: NBE_COLORS.bronze }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Repatriation Details
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.repatriationId}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {data.txId && <BlockchainTxChip txId={data.txId} />}
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: NBE_COLORS.bronze }} />
          </Box>
        ) : (
          <Box>
            {/* Status Alert */}
            <Alert
              severity={
                data.status === 'COMPLIANT' ? 'success' :
                data.status === 'OVERDUE' || data.status === 'VIOLATION' ? 'error' :
                'info'
              }
              icon={
                data.status === 'COMPLIANT' ? <CheckCircle /> :
                data.status === 'OVERDUE' || data.status === 'VIOLATION' ? <Warning /> :
                <Schedule />
              }
              sx={{ mb: 3 }}
            >
              <Typography variant="body2" fontWeight={600}>
                Status: {data.status}
              </Typography>
              {data.daysRemaining !== undefined && data.daysRemaining > 0 && (
                <Typography variant="caption">
                  {data.daysRemaining} days remaining until deadline
                </Typography>
              )}
              {data.daysOverdue !== undefined && data.daysOverdue > 0 && (
                <Typography variant="caption">
                  {data.daysOverdue} days overdue - compliance action required
                </Typography>
              )}
            </Alert>

            {/* Key Information */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Exporter
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {data.exporterName || data.exporterId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {data.exporterId}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Export Amount
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color={NBE_COLORS.bronze}>
                      {data.currency} {data.exportAmount.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Payment ID: {data.paymentId}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Financial Breakdown */}
            <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SwapHoriz /> Financial Breakdown (60/40 NBE Split)
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        FCY Retention (40%)
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {data.currency} {fcyRetention.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        NBE Conversion (60%)
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {data.currency} {etbConversion.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ETB Equivalent @ {exchangeRate}
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color={NBE_COLORS.success}>
                        ETB {etbAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Banking Details */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalance /> Banking Details
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      FCY Bank
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {data.fcyBank}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      BIC: {data.fcyBankBIC}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      FCY Account Number
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {data.fcyAccountNumber}
                    </Typography>
                  </Grid>
                  {data.swiftReference && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        SWIFT Reference
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {data.swiftReference}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Timeline Stepper */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime /> Repatriation Timeline
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stepper activeStep={getActiveStep()} orientation="vertical">
                  {steps.map((step, index) => (
                    <Step key={index}>
                      <StepLabel>
                        <Typography variant="body2" fontWeight={600}>
                          {step.label}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="caption" color="text.secondary">
                          {step.description}
                        </Typography>
                        {step.date && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            📅 {new Date(step.date).toLocaleString()}
                          </Typography>
                        )}
                        {step.actor && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Person sx={{ fontSize: 14 }} />
                            <Typography variant="caption">
                              {step.actor}
                              {step.msp && ` (${step.msp})`}
                            </Typography>
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Verification Notes */}
            {data.verificationNotes && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Receipt /> Verification Notes
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    {data.verificationNotes}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Blockchain Verification */}
            {data.txId && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BlockchainStatusIcon verified={true} />
                  <Typography variant="caption" fontWeight={600}>
                    Blockchain Verified Transaction
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Transaction ID: {data.txId}
                </Typography>
                {data.timestamp && (
                  <Typography variant="caption" color="text.secondary">
                    Timestamp: {new Date(data.timestamp).toLocaleString()}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {data.status === 'RECEIVED' && (
          <Button
            variant="contained"
            startIcon={<VerifiedUser />}
            sx={{ bgcolor: NBE_COLORS.success }}
            onClick={() => {
              // Handle verify action
              onClose();
              onRefresh();
            }}
          >
            Verify Repatriation
          </Button>
        )}
        {data.status === 'VERIFIED' && (
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            sx={{ bgcolor: NBE_COLORS.success }}
            onClick={() => {
              // Handle mark compliant action
              onClose();
              onRefresh();
            }}
          >
            Mark Compliant
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RepatriationDetailsDialog;
