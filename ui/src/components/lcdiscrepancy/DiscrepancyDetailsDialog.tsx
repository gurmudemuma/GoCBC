// Discrepancy Details Dialog
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, Divider, IconButton, Card, CardContent, Chip, Alert } from '@mui/material';
import { Close, Warning, Person, AccessTime, Description } from '@mui/icons-material';
import { BlockchainStatusIcon, BlockchainTxChip } from '@/components/blockchain';

const CBE_COLORS = { purple: '#9b30b7', warning: '#f57c00', success: '#4caf50' };

interface DiscrepancyDetailsDialogProps { open: boolean; onClose: () => void; discrepancy: any; }

const DiscrepancyDetailsDialog: React.FC<DiscrepancyDetailsDialogProps> = ({ open, onClose, discrepancy }) => {
  const getSeverityColor = (severity: string) => {
    if (severity === 'CRITICAL') return '#d32f2f';
    if (severity === 'MAJOR') return CBE_COLORS.warning;
    return '#ff9800';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning sx={{ color: CBE_COLORS.warning }} />
          <Box><Typography variant="h6" fontWeight={600}>Discrepancy Details</Typography><Typography variant="caption">{discrepancy.discrepancyId}</Typography></Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {discrepancy.txId && <BlockchainTxChip txId={discrepancy.txId} />}
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Warning sx={{ fontSize: 48, color: getSeverityColor(discrepancy.severity) }} />
            <Box>
              <Typography variant="h6" fontWeight={700} color={getSeverityColor(discrepancy.severity)}>{discrepancy.severity} DISCREPANCY</Typography>
              <Typography variant="body2">{discrepancy.discrepancyType}</Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined"><CardContent>
              <Typography variant="caption" color="text.secondary">LC Number</Typography>
              <Typography variant="h6" fontWeight={600}>{discrepancy.lcNumber || discrepancy.lcId}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined"><CardContent>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Chip label={discrepancy.status} sx={{ mt: 1, bgcolor: CBE_COLORS.purple, color: 'white' }} />
            </CardContent></Card>
          </Grid>
        </Grid>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description /> Discrepancy Description
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">{discrepancy.description}</Typography>
            {discrepancy.affectedDocument && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Affected Document:</Typography>
                <Typography variant="body2" fontWeight={600}>{discrepancy.affectedDocument}</Typography>
              </Box>
            )}
            {discrepancy.affectedClauses && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Affected Clauses:</Typography>
                <Typography variant="body2" fontWeight={600}>{discrepancy.affectedClauses}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person sx={{ fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary">Reported By</Typography>
              </Box>
              <Typography variant="body2" fontWeight={600}>{discrepancy.reportedBy || 'Bank Officer'}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime sx={{ fontSize: 18 }} />
                <Typography variant="caption" color="text.secondary">Reported Date</Typography>
              </Box>
              <Typography variant="body2" fontWeight={600}>{new Date(discrepancy.reportedDate).toLocaleString()}</Typography>
            </Box>
          </Grid>
        </Grid>

        {discrepancy.txId && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockchainStatusIcon verified={true} />
              <Typography variant="caption" fontWeight={600}>Blockchain Verified</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">TX: {discrepancy.txId}</Typography>
          </Box>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscrepancyDetailsDialog;
