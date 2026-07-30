// LC Amendment Dialog for Banks
// UCP 600 Article 10 - Amendments

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  Edit,
  Warning,
} from '@mui/icons-material';

interface LCAmendmentDialogProps {
  open: boolean;
  lc: any;
  onClose: () => void;
  onSubmit: (lcId: string, amendmentData: any) => void;
}

export const LCAmendmentDialog: React.FC<LCAmendmentDialogProps> = ({
  open,
  lc,
  onClose,
  onSubmit,
}) => {
  const [amendmentReason, setAmendmentReason] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newShipmentDate, setNewShipmentDate] = useState('');
  const [newTerms, setNewTerms] = useState('');

  const handleSubmit = () => {
    if (!amendmentReason.trim()) {
      alert('Amendment reason is required.');
      return;
    }

    const amendmentData = {
      amendmentReason: amendmentReason.trim(),
      newAmount: newAmount ? parseFloat(newAmount) : undefined,
      newExpiryDate: newExpiryDate || undefined,
      newShipmentDate: newShipmentDate || undefined,
      newTerms: newTerms.trim() || undefined,
      amendmentDate: new Date().toISOString(),
    };

    onSubmit(lc.lcId, amendmentData);
    resetForm();
  };

  const resetForm = () => {
    setAmendmentReason('');
    setNewAmount('');
    setNewExpiryDate('');
    setNewShipmentDate('');
    setNewTerms('');
  };

  const hasChanges = amendmentReason.trim() || newAmount || newExpiryDate || newShipmentDate || newTerms.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Edit sx={{ color: '#9b30b7' }} />
            <Typography variant="h6" fontWeight={600}>
              Amend Letter of Credit
            </Typography>
          </Box>
          <Chip label="UCP 600 Article 10" size="small" color="primary" sx={{ bgcolor: '#9b30b7' }} />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>UCP 600 Article 10:</strong> An LC is irrevocable and can only be amended with agreement of the issuing bank, 
          confirming bank (if any), and beneficiary.
        </Alert>

        {/* Current LC Details */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Current LC Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">LC Number</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.lcNumber || lc?.lcId}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Current Amount</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.currency} {lc?.amount?.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Current Expiry Date</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Latest Shipment Date</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.latestShipmentDate ? new Date(lc.latestShipmentDate).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">Beneficiary</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.exporterId || lc?.beneficiary}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Amendment Form */}
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Amendment Details
        </Typography>

        <TextField
          fullWidth
          required
          label="Amendment Reason"
          placeholder="e.g., Extend shipment date due to ECX delay, Increase amount for additional quantity"
          value={amendmentReason}
          onChange={(e) => setAmendmentReason(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
          helperText="Clearly state the reason for amendment (required)"
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="New LC Amount (Optional)"
              placeholder={lc?.amount?.toString()}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'textSecondary' }}>{lc?.currency}</Typography>,
              }}
              helperText={`Current: ${lc?.currency} ${lc?.amount?.toLocaleString()}`}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="New Expiry Date (Optional)"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={`Current: ${lc?.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : 'N/A'}`}
              inputProps={{
                min: new Date().toISOString().split('T')[0],
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="New Latest Shipment Date (Optional)"
              value={newShipmentDate}
              onChange={(e) => setNewShipmentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={`Current: ${lc?.latestShipmentDate ? new Date(lc.latestShipmentDate).toLocaleDateString() : 'N/A'}`}
              inputProps={{
                min: new Date().toISOString().split('T')[0],
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="New Terms & Conditions (Optional)"
              placeholder="Updated terms and conditions..."
              value={newTerms}
              onChange={(e) => setNewTerms(e.target.value)}
              multiline
              rows={3}
              helperText={`Current: ${lc?.paymentTerms || 'At Sight'}`}
            />
          </Grid>
        </Grid>

        {/* Warning about amendment */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          <strong>Important:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>All parties must agree to the amendment</li>
            <li>The beneficiary (exporter) will be notified and must accept</li>
            <li>Amendment will be recorded on the blockchain</li>
            <li>Original LC terms remain valid until amendment is accepted</li>
          </ul>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={handleSubmit}
          disabled={!hasChanges || !amendmentReason.trim()}
          sx={{
            bgcolor: '#9b30b7',
            '&:hover': { bgcolor: '#7a2592' },
          }}
        >
          Submit Amendment
        </Button>
      </DialogActions>
    </Dialog>
  );
};
