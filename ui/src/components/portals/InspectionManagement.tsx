// Inspection Management Component for ECTAPortal
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
  Snackbar,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
} from '@mui/material';
import { CheckCircle, Assignment } from '@mui/icons-material';
import { AnimatedButton, StatusChip } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import api from '@/utils/api';

interface Inspection {
  inspectionId: string;
  shipmentId: string;
  status: string;
  exportPermitNo?: string;
  shipment?: {
    exporterId: string;
    quantity: number;
    origin: string;
  };
}

export const InspectionManagement: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [permitNumber, setPermitNumber] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [notificationDialog, setNotificationDialog] = useState({
    open: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    details: '',
  });

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const response = await api.get('/quality/inspections');
      if (response.data.success) {
        setInspections(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    }
  };

  const handleIssuePermit = async () => {
    if (!selectedInspection || !permitNumber || !issuedBy) return;

    try {
      const response = await api.post(
        `/quality/inspections/${selectedInspection.inspectionId}/issue-permit`,
        {
          exportPermitNo: permitNumber,
          issuedBy: issuedBy,
        }
      );

      if (response.data.success) {
        setNotificationDialog({
          open: true,
          type: 'success',
          title: 'Export Permit Issued',
          message: 'Export permit has been successfully issued',
          details: `Permit Number: ${permitNumber} | Issued by: ${issuedBy}`,
        });
        setPermitDialogOpen(false);
        setPermitNumber('');
        setIssuedBy('');
        loadInspections();
      } else {
        setNotificationDialog({
          open: true,
          type: 'error',
          title: 'Failed to Issue Permit',
          message: response.data.error?.message || 'Unable to issue export permit',
          details: 'Please verify the inspection status and try again',
        });
      }
    } catch (error: any) {
      setNotificationDialog({
        open: true,
        type: 'error',
        title: 'Error Issuing Permit',
        message: error.response?.data?.error?.message || 'An unexpected error occurred',
        details: error.message,
      });
    }
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Inspection ID</TableCell>
              <TableCell>Shipment ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Export Permit</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.map((inspection) => (
              <TableRow key={inspection.inspectionId}>
                <TableCell>{inspection.inspectionId}</TableCell>
                <TableCell>{inspection.shipmentId}</TableCell>
                <TableCell>
                  <StatusChip status={inspection.status as any} label={inspection.status} />
                </TableCell>
                <TableCell>{inspection.exportPermitNo || 'Not Issued'}</TableCell>
                <TableCell>
                  {inspection.status === 'APPROVED' && !inspection.exportPermitNo && (
                    <AnimatedButton
                      size="small"
                      startIcon={<Assignment />}
                      onClick={() => {
                        setSelectedInspection(inspection);
                        // Auto-generate permit number
                        const today = new Date();
                        const permitNo = `EP-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
                        setPermitNumber(permitNo);
                        setPermitDialogOpen(true);
                      }}
                    >
                      Issue Export Permit
                    </AnimatedButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Issue Export Permit Dialog */}
      <Dialog open={permitDialogOpen} onClose={() => setPermitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Issue Export Permit</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Quality inspection has been approved. Issue export permit to allow customs clearance.
          </Alert>
          
          {selectedInspection?.shipment && (
            <Alert severity="success" variant="outlined" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600}>Inspection Details:</Typography>
              <Typography variant="body2">Shipment: {selectedInspection.shipmentId}</Typography>
              <Typography variant="body2">Origin: {selectedInspection.shipment.origin}</Typography>
              <Typography variant="body2">Quantity: {selectedInspection.shipment.quantity} kg</Typography>
            </Alert>
          )}

          <TextField
            fullWidth
            label="Export Permit Number"
            value={permitNumber}
            onChange={(e) => setPermitNumber(e.target.value)}
            variant="outlined"
            sx={{ mt: 0, mb: 2 }}
            helperText="Auto-generated format: EP-YYYYMMDD-XXX"
          />

          <FormControl fullWidth sx={{ mt: 0 }}>
            <InputLabel>Issued By</InputLabel>
            <Select
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              label="Issued By"
            >
              <MenuItem value="ECTA Director">ECTA Director</MenuItem>
              <MenuItem value="ECTA Quality Officer">ECTA Quality Officer</MenuItem>
              <MenuItem value="ECTA Senior Inspector">ECTA Senior Inspector</MenuItem>
              <MenuItem value="ECTA Compliance Officer">ECTA Compliance Officer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPermitDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button 
            variant="contained" 
            startIcon={<CheckCircle />} 
            onClick={handleIssuePermit}
            disabled={!permitNumber || !issuedBy}
          >
            Issue Permit
          </Button>
        </DialogActions>
      </Dialog>

      <NotificationDialog
        open={notificationDialog.open}
        onClose={() => setNotificationDialog({ ...notificationDialog, open: false })}
        type={notificationDialog.type}
        title={notificationDialog.title}
        message={notificationDialog.message}
        details={notificationDialog.details}
      />
    </Box>
  );
};
