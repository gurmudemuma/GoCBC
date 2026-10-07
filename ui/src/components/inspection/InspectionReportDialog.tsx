// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Inspection Report Dialog - ECTA Portal
// View inspection report and certificate

import React from 'react';
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
  IconButton,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Close,
  Assessment,
  CheckCircle,
  Cancel,
  Download,
  Print,
} from '@mui/icons-material';
import { BlockchainStatusIcon, BlockchainTxChip } from '@/components/blockchain';

const ECTA_COLORS = { green: '#2e7d32', error: '#d32f2f' };

interface InspectionReportDialogProps {
  open: boolean;
  onClose: () => void;
  inspection: any;
}

const InspectionReportDialog: React.FC<InspectionReportDialogProps> = ({
  open,
  onClose,
  inspection,
}) => {
  const passed = inspection.status === 'PASSED';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ color: ECTA_COLORS.green }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>Inspection Report</Typography>
            <Typography variant="caption" color="text.secondary">{inspection.inspectionId}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {inspection.txId && <BlockchainTxChip txId={inspection.txId} />}
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <Box sx={{ p: 2, bgcolor: passed ? '#e8f5e9' : '#ffebee', borderRadius: 1, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {passed ? <CheckCircle sx={{ fontSize: 48, color: ECTA_COLORS.green }} /> : <Cancel sx={{ fontSize: 48, color: ECTA_COLORS.error }} />}
            <Box>
              <Typography variant="h5" fontWeight={700} color={passed ? ECTA_COLORS.green : ECTA_COLORS.error}>
                {passed ? 'INSPECTION PASSED' : 'INSPECTION FAILED'}
              </Typography>
              {inspection.certificateNumber && (
                <Typography variant="body2">Certificate: {inspection.certificateNumber}</Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Quality Grade</Typography>
                <Typography variant="h6" fontWeight={600}>{inspection.qualityGrade || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Moisture Content</Typography>
                <Typography variant="h6" fontWeight={600}>{inspection.moistureContent}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Defect Percentage</Typography>
                <Typography variant="h6" fontWeight={600}>{inspection.defectPercentage}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Inspector</Typography>
                <Typography variant="body1" fontWeight={600}>{inspection.inspectorName || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {inspection.failureReason && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} color="error">Failure Reason:</Typography>
            <Typography variant="body2">{inspection.failureReason}</Typography>
          </Box>
        )}

        {inspection.txId && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BlockchainStatusIcon verified={true} />
              <Typography variant="caption" fontWeight={600}>Blockchain Verified</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">TX: {inspection.txId}</Typography>
          </Box>
        )}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2 }}>
        <Button startIcon={<Download />}>Download Certificate</Button>
        <Button startIcon={<Print />}>Print Report</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InspectionReportDialog;
