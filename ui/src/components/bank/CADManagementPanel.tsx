// Documentary Collection (CAD) Management Panel
// Cash Against Documents workflow

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Description,
  Visibility,
  Payment,
  CheckCircle,
  LocalShipping,
} from '@mui/icons-material';

interface CADManagementPanelProps {
  collections: any[];
  onRegister: (data: any) => void;
  onUpdateStatus: (collectionId: string, status: string) => void;
  onRecordPayment: (collectionId: string, amount: number) => void;
}

export const CADManagementPanel: React.FC<CADManagementPanelProps> = ({
  collections,
  onRegister,
  onUpdateStatus,
  onRecordPayment,
}) => {
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const [formData, setFormData] = useState({
    exporterID: '',
    contractID: '',
    drawerName: '',
    draweeName: '',
    draweeAddress: '',
    paymentTerm: 'D/P', // Documents against Payment or D/A (Documents against Acceptance)
    acceptanceDays: '',
    amount: '',
    currency: 'USD',
    remittingBank: 'Commercial Bank of Ethiopia',
    remittingBankBIC: 'CBETETAA',
    collectingBank: '',
    collectingBankBIC: '',
    instructions: 'Present documents to drawee for payment',
  });

  const handleRegister = () => {
    if (!formData.exporterID || !formData.drawerName || !formData.draweeName || !formData.amount) {
      alert('Please fill all required fields');
      return;
    }

    onRegister(formData);
    setRegisterDialogOpen(false);
    resetForm();
  };

  const handleRecordPayment = () => {
    if (!selectedCollection || !paymentAmount) {
      alert('Please enter payment amount');
      return;
    }

    onRecordPayment(selectedCollection.collectionID, parseFloat(paymentAmount));
    setPaymentDialogOpen(false);
    setSelectedCollection(null);
    setPaymentAmount('');
  };

  const resetForm = () => {
    setFormData({
      exporterID: '',
      contractID: '',
      drawerName: '',
      draweeName: '',
      draweeAddress: '',
      paymentTerm: 'D/P',
      acceptanceDays: '',
      amount: '',
      currency: 'USD',
      remittingBank: 'Commercial Bank of Ethiopia',
      remittingBankBIC: 'CBETETAA',
      collectingBank: '',
      collectingBankBIC: '',
      instructions: 'Present documents to drawee for payment',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED': return 'info';
      case 'DOCUMENTS_SENT': return 'warning';
      case 'PAYMENT_RECEIVED': return 'success';
      case 'DOCUMENTS_RELEASED': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={600}>
          Documentary Collection (CAD) Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Description />}
          onClick={() => setRegisterDialogOpen(true)}
          sx={{ bgcolor: '#9b30b7', '&:hover': { bgcolor: '#7a2592' } }}
        >
          Register New Collection
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Documentary Collection:</strong> Bank acts as intermediary - forwards documents to collecting bank, 
        which releases them to buyer upon payment (D/P) or acceptance (D/A). Lower cost alternative to LC.
      </Alert>

      {collections.length === 0 ? (
        <Alert severity="info">No documentary collections on record.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Collection ID</strong></TableCell>
                <TableCell><strong>Exporter</strong></TableCell>
                <TableCell><strong>Drawee (Buyer)</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Payment Term</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection.collectionID}>
                  <TableCell>{collection.collectionID}</TableCell>
                  <TableCell>{collection.exporterID}</TableCell>
                  <TableCell>{collection.draweeName}</TableCell>
                  <TableCell>
                    <strong>${collection.amount?.toLocaleString()}</strong> {collection.currency}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={collection.paymentTerm} 
                      size="small"
                      color={collection.paymentTerm === 'D/P' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={collection.status} 
                      size="small"
                      color={getStatusColor(collection.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {collection.status === 'REGISTERED' && (
                        <Tooltip title="Send Documents">
                          <IconButton 
                            size="small"
                            onClick={() => onUpdateStatus(collection.collectionID, 'DOCUMENTS_SENT')}
                          >
                            <LocalShipping />
                          </IconButton>
                        </Tooltip>
                      )}
                      {collection.status === 'DOCUMENTS_SENT' && (
                        <Tooltip title="Record Payment">
                          <IconButton 
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedCollection(collection);
                              setPaymentAmount(collection.amount?.toString() || '');
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <Payment />
                          </IconButton>
                        </Tooltip>
                      )}
                      {collection.status === 'PAYMENT_RECEIVED' && (
                        <Tooltip title="Release Documents">
                          <IconButton 
                            size="small"
                            color="primary"
                            onClick={() => onUpdateStatus(collection.collectionID, 'DOCUMENTS_RELEASED')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Register Collection Dialog */}
      <Dialog open={registerDialogOpen} onClose={() => setRegisterDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Register Documentary Collection</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Exporter ID"
                value={formData.exporterID}
                onChange={(e) => setFormData({...formData, exporterID: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contract ID"
                value={formData.contractID}
                onChange={(e) => setFormData({...formData, contractID: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Drawer Name (Exporter)"
                value={formData.drawerName}
                onChange={(e) => setFormData({...formData, drawerName: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Drawee Name (Buyer)"
                value={formData.draweeName}
                onChange={(e) => setFormData({...formData, draweeName: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Drawee Address"
                value={formData.draweeAddress}
                onChange={(e) => setFormData({...formData, draweeAddress: e.target.value})}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                select
                label="Payment Term"
                value={formData.paymentTerm}
                onChange={(e) => setFormData({...formData, paymentTerm: e.target.value})}
              >
                <MenuItem value="D/P">D/P (Documents against Payment)</MenuItem>
                <MenuItem value="D/A">D/A (Documents against Acceptance)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Currency"
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </TextField>
            </Grid>
            {formData.paymentTerm === 'D/A' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Acceptance Days"
                  value={formData.acceptanceDays}
                  onChange={(e) => setFormData({...formData, acceptanceDays: e.target.value})}
                  helperText="Days after sight for acceptance"
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Collecting Bank"
                value={formData.collectingBank}
                onChange={(e) => setFormData({...formData, collectingBank: e.target.value})}
                helperText="Buyer's bank"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Collecting Bank BIC"
                value={formData.collectingBankBIC}
                onChange={(e) => setFormData({...formData, collectingBankBIC: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Collection Instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRegisterDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegister}>Register Collection</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Record Payment Received</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Collection ID: <strong>{selectedCollection?.collectionID}</strong>
          </Typography>
          <Typography variant="body2" gutterBottom mb={2}>
            Expected Amount: <strong>${selectedCollection?.amount?.toLocaleString()}</strong>
          </Typography>
          <TextField
            fullWidth
            required
            type="number"
            label="Payment Amount"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleRecordPayment}>
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
