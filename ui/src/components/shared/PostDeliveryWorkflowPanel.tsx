/**
 * Post-Delivery Workflow Panel
 * 
 * Reusable component for displaying and managing post-delivery workflow
 * Can be embedded in Shipping, Banks, NBE, and ECTA portals
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Paper,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Warning,
  Error as ErrorIcon,
  Info,
  Payment,
  AccountBalance,
  Description,
  Gavel,
  Close as CloseIcon,
  Refresh,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';

interface PostDeliveryStatus {
  shipmentId: string;
  contractId: string;
  exporterId: string;
  deliveryDate: string;
  
  paymentReceived: boolean;
  paymentReceivedDate?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  
  forexRepatriated: boolean;
  forexRepatriationDate?: string;
  forexAmount?: number;
  forexRate?: number;
  
  lcUsed: boolean;
  lcSettled?: boolean;
  lcSettlementDate?: string;
  
  ectaAuditCompleted: boolean;
  ectaAuditDate?: string;
  ectaAuditResult?: 'PASSED' | 'FAILED' | 'PENDING';
  
  contractClosed: boolean;
  contractClosureDate?: string;
  
  overallStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ISSUE';
  completionPercentage: number;
  daysElapsed: number;
  expectedCompletionDate: string;
  
  issues: Array<{
    type: string;
    severity: string;
    message: string;
    createdAt: string;
  }>;
}

interface Props {
  shipmentId: string;
  userRole: string; // 'BANK', 'NBE', 'ECTA', 'SHIPPING', 'ADMIN'
  onRefresh?: () => void;
}

const PostDeliveryWorkflowPanel: React.FC<Props> = ({ shipmentId, userRole, onRefresh }) => {
  const [status, setStatus] = useState<PostDeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [forexDialog, setForexDialog] = useState(false);
  const [lcDialog, setLcDialog] = useState(false);
  const [auditDialog, setAuditDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    paymentAmount: '',
    paymentCurrency: 'USD',
    swiftReference: ''
  });
  
  const [forexForm, setForexForm] = useState({
    forexAmount: '',
    forexRate: ''
  });
  
  const [lcForm, setLcForm] = useState({
    lcReference: ''
  });
  
  const [auditForm, setAuditForm] = useState({
    auditResult: 'PASSED' as 'PASSED' | 'FAILED',
    auditNotes: ''
  });

  useEffect(() => {
    fetchStatus();
  }, [shipmentId]);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch(`/post-delivery/${shipmentId}/status`, {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else if (response.status === 404) {
        // No post-delivery record yet - this is OK for shipments not yet delivered
        setStatus(null);
      } else {
        setError(data.error?.message || 'Failed to load status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      const response = await apiFetch(`/post-delivery/${shipmentId}/payment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          paymentAmount: parseFloat(paymentForm.paymentAmount),
          paymentCurrency: paymentForm.paymentCurrency,
          swiftReference: paymentForm.swiftReference
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPaymentDialog(false);
        fetchStatus();
        if (onRefresh) onRefresh();
      } else {
        alert(data.error?.message || 'Failed to record payment');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordForex = async () => {
    try {
      const response = await apiFetch(`/post-delivery/${shipmentId}/forex`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          forexAmount: parseFloat(forexForm.forexAmount),
          forexRate: parseFloat(forexForm.forexRate)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setForexDialog(false);
        fetchStatus();
        if (onRefresh) onRefresh();
      } else {
        alert(data.error?.message || 'Failed to record forex');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordLC = async () => {
    try {
      const response = await apiFetch(`/post-delivery/${shipmentId}/lc-settlement`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lcReference: lcForm.lcReference
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLcDialog(false);
        fetchStatus();
        if (onRefresh) onRefresh();
      } else {
        alert(data.error?.message || 'Failed to record LC settlement');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordAudit = async () => {
    try {
      const response = await apiFetch(`/post-delivery/${shipmentId}/ecta-audit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          auditResult: auditForm.auditResult,
          auditNotes: auditForm.auditNotes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAuditDialog(false);
        fetchStatus();
        if (onRefresh) onRefresh();
      } else {
        alert(data.error?.message || 'Failed to record audit');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseContract = async () => {
    try {
      const response = await apiFetch(`/post-delivery/${shipmentId}/close-contract`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCloseDialog(false);
        fetchStatus();
        if (onRefresh) onRefresh();
      } else {
        alert(data.error?.message || 'Failed to close contract');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'primary';
      case 'DELAYED': return 'warning';
      case 'ISSUE': return 'error';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            Post-delivery workflow will be available once the shipment is delivered.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Overview Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Post-Delivery Workflow</Typography>
            <Box>
              <Chip 
                label={status.overallStatus.replace('_', ' ')}
                color={getStatusColor(status.overallStatus)}
                size="small"
                sx={{ mr: 1 }}
              />
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchStatus}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Contract ID</Typography>
              <Typography variant="body1">{status.contractId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">Days Since Delivery</Typography>
              <Typography variant="body1">{status.daysElapsed} days</Typography>
            </Grid>
          </Grid>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Completion Progress
          </Typography>
          <Box display="flex" alignItems="center">
            <Box width="100%" mr={1}>
              <LinearProgress 
                variant="determinate" 
                value={status.completionPercentage} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {status.completionPercentage}%
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Issues/Alerts */}
      {status.issues.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Active Issues:</Typography>
          {status.issues.map((issue, idx) => (
            <Typography key={idx} variant="body2">
              • {issue.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Checklist */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Workflow Checklist</Typography>
          
          <List>
            {/* Payment */}
            <ListItem>
              <ListItemIcon>
                {status.paymentReceived ? (
                  <CheckCircle color="success" />
                ) : (
                  <RadioButtonUnchecked color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Payment Received"
                secondary={status.paymentReceived && status.paymentReceivedDate
                  ? `${status.paymentAmount} ${status.paymentCurrency} on ${new Date(status.paymentReceivedDate).toLocaleDateString()}`
                  : 'Awaiting payment from buyer'}
              />
              {!status.paymentReceived && ['BANK', 'ADMIN'].includes(userRole) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setPaymentDialog(true)}
                >
                  Record Payment
                </Button>
              )}
            </ListItem>

            <Divider variant="inset" component="li" />

            {/* Forex */}
            <ListItem>
              <ListItemIcon>
                {status.forexRepatriated ? (
                  <CheckCircle color="success" />
                ) : (
                  <RadioButtonUnchecked color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Forex Repatriated"
                secondary={status.forexRepatriated && status.forexRepatriationDate
                  ? `${status.forexAmount?.toLocaleString()} ETB on ${new Date(status.forexRepatriationDate).toLocaleDateString()}`
                  : 'Awaiting forex repatriation to Ethiopia'}
              />
              {!status.forexRepatriated && status.paymentReceived && ['NBE', 'ADMIN'].includes(userRole) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setForexDialog(true)}
                >
                  Record Forex
                </Button>
              )}
            </ListItem>

            <Divider variant="inset" component="li" />

            {/* LC (if applicable) */}
            {status.lcUsed && (
              <>
                <ListItem>
                  <ListItemIcon>
                    {status.lcSettled ? (
                      <CheckCircle color="success" />
                    ) : (
                      <RadioButtonUnchecked color="disabled" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="LC Settlement"
                    secondary={status.lcSettled && status.lcSettlementDate
                      ? `Settled on ${new Date(status.lcSettlementDate).toLocaleDateString()}`
                      : 'Awaiting LC settlement'}
                  />
                  {!status.lcSettled && ['BANK', 'ADMIN'].includes(userRole) && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setLcDialog(true)}
                    >
                      Record LC Settlement
                    </Button>
                  )}
                </ListItem>
                <Divider variant="inset" component="li" />
              </>
            )}

            {/* ECTA Audit */}
            <ListItem>
              <ListItemIcon>
                {status.ectaAuditCompleted ? (
                  <CheckCircle color="success" />
                ) : (
                  <RadioButtonUnchecked color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="ECTA Final Audit"
                secondary={status.ectaAuditCompleted && status.ectaAuditDate
                  ? `${status.ectaAuditResult} on ${new Date(status.ectaAuditDate).toLocaleDateString()}`
                  : 'Awaiting final audit'}
              />
              {!status.ectaAuditCompleted && status.forexRepatriated && ['ECTA', 'ADMIN'].includes(userRole) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setAuditDialog(true)}
                >
                  Complete Audit
                </Button>
              )}
            </ListItem>

            <Divider variant="inset" component="li" />

            {/* Contract Closure */}
            <ListItem>
              <ListItemIcon>
                {status.contractClosed ? (
                  <CheckCircle color="success" />
                ) : (
                  <RadioButtonUnchecked color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary="Contract Closed"
                secondary={status.contractClosed && status.contractClosureDate
                  ? `Closed on ${new Date(status.contractClosureDate).toLocaleDateString()}`
                  : 'Ready for closure when all steps complete'}
              />
              {!status.contractClosed && 
               status.paymentReceived && 
               status.forexRepatriated &&
               (!status.lcUsed || status.lcSettled) &&
               status.ectaAuditCompleted &&
               ['ECTA', 'ADMIN'].includes(userRole) && (
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  onClick={() => setCloseDialog(true)}
                >
                  Close Contract
                </Button>
              )}
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record Payment Received
          <IconButton
            onClick={() => setPaymentDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Payment Amount"
            type="number"
            value={paymentForm.paymentAmount}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Currency"
            value={paymentForm.paymentCurrency}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentCurrency: e.target.value })}
            margin="normal"
            select
            SelectProps={{ native: true }}
            required
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </TextField>
          <TextField
            fullWidth
            label="SWIFT Reference"
            value={paymentForm.swiftReference}
            onChange={(e) => setPaymentForm({ ...paymentForm, swiftReference: e.target.value })}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
          <Button onClick={handleRecordPayment} variant="contained" color="primary">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forex Dialog */}
      <Dialog open={forexDialog} onClose={() => setForexDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record Forex Repatriation
          <IconButton
            onClick={() => setForexDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Forex Amount (USD)"
            type="number"
            value={forexForm.forexAmount}
            onChange={(e) => setForexForm({ ...forexForm, forexAmount: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Exchange Rate (ETB/USD)"
            type="number"
            value={forexForm.forexRate}
            onChange={(e) => setForexForm({ ...forexForm, forexRate: e.target.value })}
            margin="normal"
            required
          />
          {forexForm.forexAmount && forexForm.forexRate && (
            <Alert severity="info" sx={{ mt: 2 }}>
              ETB Value: {(parseFloat(forexForm.forexAmount) * parseFloat(forexForm.forexRate)).toLocaleString()} ETB
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForexDialog(false)}>Cancel</Button>
          <Button onClick={handleRecordForex} variant="contained" color="primary">
            Record Forex
          </Button>
        </DialogActions>
      </Dialog>

      {/* LC Dialog */}
      <Dialog open={lcDialog} onClose={() => setLcDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record LC Settlement
          <IconButton
            onClick={() => setLcDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="LC Reference Number"
            value={lcForm.lcReference}
            onChange={(e) => setLcForm({ ...lcForm, lcReference: e.target.value })}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLcDialog(false)}>Cancel</Button>
          <Button onClick={handleRecordLC} variant="contained" color="primary">
            Record Settlement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Dialog */}
      <Dialog open={auditDialog} onClose={() => setAuditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Complete ECTA Audit
          <IconButton
            onClick={() => setAuditDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Audit Result"
            value={auditForm.auditResult}
            onChange={(e) => setAuditForm({ ...auditForm, auditResult: e.target.value as 'PASSED' | 'FAILED' })}
            margin="normal"
            select
            SelectProps={{ native: true }}
            required
          >
            <option value="PASSED">PASSED</option>
            <option value="FAILED">FAILED</option>
          </TextField>
          <TextField
            fullWidth
            label="Audit Notes"
            value={auditForm.auditNotes}
            onChange={(e) => setAuditForm({ ...auditForm, auditNotes: e.target.value })}
            margin="normal"
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDialog(false)}>Cancel</Button>
          <Button onClick={handleRecordAudit} variant="contained" color="primary">
            Complete Audit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Contract Dialog */}
      <Dialog open={closeDialog} onClose={() => setCloseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Close Export Contract</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            All post-delivery requirements have been completed. Closing the contract will mark this export transaction as fully complete and update the blockchain.
          </Alert>
          <Typography variant="body2">
            Contract ID: {status.contractId}
          </Typography>
          <Typography variant="body2">
            Shipment ID: {status.shipmentId}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialog(false)}>Cancel</Button>
          <Button onClick={handleCloseContract} variant="contained" color="primary">
            Close Contract
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PostDeliveryWorkflowPanel;
