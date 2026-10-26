// Forex Details Dialog - Enhanced View with Retention Breakdown
// NBE Forex Allocation Details

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Divider,
  Chip,
  Alert,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  CurrencyExchange,
  AccountBalance,
  TrendingUp,
  CheckCircle,
  Warning,
  AccessTime,
} from '@mui/icons-material';

interface ForexDetailsDialogProps {
  open: boolean;
  forex: any;
  lc?: any;
  onClose: () => void;
  onReject?: (forexId: string, reason: string) => void;
}

export const ForexDetailsDialog: React.FC<ForexDetailsDialogProps> = ({
  open,
  forex,
  lc,
  onClose,
  onReject,
}) => {
  if (!forex) return null;

  // Calculate retention breakdown (NBE mandates 50% USD retention for coffee exports)
  const retentionRate = forex.retentionRate || 50; // Default 50% for coffee
  const usdRetained = forex.allocatedAmount * (retentionRate / 100);
  const usdToConvert = forex.allocatedAmount * ((100 - retentionRate) / 100);
  const etbConverted = usdToConvert * forex.exchangeRate;

  // Calculate expiry status
  const daysToExpiry = forex.expiryDate 
    ? Math.ceil((new Date(forex.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const expiryStatus = daysToExpiry > 30 ? 'success' : daysToExpiry > 7 ? 'warning' : 'error';

  // Calculate utilization percentage
  const utilization = forex.requestedAmount > 0 
    ? (forex.allocatedAmount / forex.requestedAmount) * 100 
    : 100;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CurrencyExchange sx={{ color: '#9b30b7', fontSize: 32 }} />
            <Typography variant="h6" fontWeight={600}>
              Forex Allocation Details
            </Typography>
          </Box>
          <Chip 
            label={forex.status} 
            color={
              forex.status === 'ALLOCATED' ? 'success' : 
              forex.status === 'PENDING' ? 'warning' : 
              'default'
            }
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Allocation Summary */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0f7ff', border: '1px solid #2196f3' }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Forex ID</Typography>
              <Typography variant="body1" fontWeight={600}>{forex.forexId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">LC Reference</Typography>
              <Typography variant="body1" fontWeight={600}>{forex.lcId || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Exporter</Typography>
              <Typography variant="body1" fontWeight={600}>{forex.exporterId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Contract ID</Typography>
              <Typography variant="body1" fontWeight={600}>{forex.contractId || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Divider sx={{ my: 2 }} />

        {/* Allocation Amounts */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          <AccountBalance sx={{ verticalAlign: 'middle', mr: 1 }} />
          Allocation Summary
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
              <Typography variant="caption" color="textSecondary">Requested Amount</Typography>
              <Typography variant="h5" fontWeight={700} color="primary">
                ${forex.requestedAmount?.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">{forex.currency}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #4caf50' }}>
              <Typography variant="caption" color="textSecondary">Allocated Amount</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                ${forex.allocatedAmount?.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">{forex.currency}</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Utilization Bar */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">Allocation Utilization</Typography>
            <Typography variant="body2" fontWeight={600}>{utilization.toFixed(1)}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(utilization, 100)} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                bgcolor: utilization >= 100 ? '#4caf50' : utilization >= 80 ? '#ff9800' : '#2196f3'
              }
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* NBE Retention Breakdown */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
          NBE Retention Policy - {retentionRate}% USD Retention
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>National Bank of Ethiopia Policy:</strong> Coffee exporters must retain {retentionRate}% of forex earnings 
          in USD. The remaining {100 - retentionRate}% is converted to ETB at the official rate.
        </Alert>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd', border: '1px solid #2196f3' }}>
              <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                Total Allocation
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                ${forex.allocatedAmount?.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">USD</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5', border: '1px solid #9b30b7' }}>
              <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                USD Retained ({retentionRate}%)
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#9b30b7' }}>
                ${usdRetained.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="textSecondary">Exporter USD Account</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
              <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                Converted to ETB ({100 - retentionRate}%)
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ff9800' }}>
                {etbConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </Typography>
              <Typography variant="caption" color="textSecondary">@ {forex.exchangeRate} ETB/USD</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Exchange Rate Details */}
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Exchange Rate Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Official Rate (NBE)</Typography>
              <Typography variant="body2" fontWeight={600}>
                1 USD = {forex.exchangeRate} ETB
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Total ETB Equivalent</Typography>
              <Typography variant="body2" fontWeight={600}>
                {(forex.allocatedAmount * forex.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Validity & Status */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          <AccessTime sx={{ verticalAlign: 'middle', mr: 1 }} />
          Validity & Expiration
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: expiryStatus === 'success' ? '#e8f5e9' : expiryStatus === 'warning' ? '#fff3e0' : '#ffebee', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">Expiry Date</Typography>
              <Typography variant="body1" fontWeight={600}>
                {forex.expiryDate ? new Date(forex.expiryDate).toLocaleDateString() : 'N/A'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                {expiryStatus === 'success' && <CheckCircle fontSize="small" color="success" />}
                {expiryStatus === 'warning' && <Warning fontSize="small" color="warning" />}
                {expiryStatus === 'error' && <Warning fontSize="small" color="error" />}
                <Typography variant="caption" color={expiryStatus === 'success' ? 'success.main' : expiryStatus === 'warning' ? 'warning.main' : 'error.main'}>
                  {daysToExpiry > 0 ? `${daysToExpiry} days remaining` : daysToExpiry === 0 ? 'Expires today' : 'Expired'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">Current Status</Typography>
              <Typography variant="body1" fontWeight={600}>
                {forex.status}
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                {forex.status === 'ALLOCATED' ? 'Forex allocated and available for use' :
                 forex.status === 'PENDING' ? 'Awaiting NBE approval' :
                 forex.status === 'UTILIZED' ? 'Forex has been fully utilized' :
                 'Status pending update'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Related LC Info */}
        {lc && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Related Letter of Credit
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">LC Number</Typography>
                  <Typography variant="body2" fontWeight={600}>{lc.lcNumber || lc.lcId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">LC Amount</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {lc.currency} {lc.amount?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Issuing Bank</Typography>
                  <Typography variant="body2" fontWeight={600}>{lc.issuingBank || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">Beneficiary</Typography>
                  <Typography variant="body2" fontWeight={600}>{lc.exporterId || lc.beneficiary}</Typography>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {forex.status === 'PENDING' && onReject && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              const reason = prompt('Enter rejection reason:');
              if (reason) {
                onReject(forex.forexId, reason);
                onClose();
              }
            }}
          >
            Reject Allocation
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
