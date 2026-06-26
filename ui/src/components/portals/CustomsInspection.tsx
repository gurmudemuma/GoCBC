// Customs Physical Inspection Component
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
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Typography,
} from '@mui/material';
import { Assignment, CheckCircle } from '@mui/icons-material';
import { AnimatedButton, StatusChip } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import api from '@/utils/api';

interface Declaration {
  declarationId: string;
  exporterId: string;
  status: string;
  quantity: number;
  value: number;
  currency: string;
  destination: string;
  inspectionNotes?: string;
}

export const CustomsInspection: React.FC = () => {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<Declaration | null>(null);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionOfficer, setInspectionOfficer] = useState('');
  const [inspectionResult, setInspectionResult] = useState('');
  const { notification, showSuccess, showError, closeNotification } = useNotification();

  useEffect(() => {
    loadDeclarations();
  }, []);

  const loadDeclarations = async () => {
    try {
      const response = await api.get('/customs/declaration/status/SUBMITTED');
      if (response.data.success) {
        setDeclarations(response.data.declarations || []);
      }

      const underInspection = await api.get('/customs/declaration/status/UNDER_INSPECTION');
      if (underInspection.data.success) {
        setDeclarations(prev => [...prev, ...(underInspection.data.declarations || [])]);
      }
    } catch (error) {
      console.error('Failed to load declarations:', error);
    }
  };

  const handleStartInspection = async () => {
    if (!selectedDeclaration || !inspectionOfficer) return;

    try {
      const response = await api.post(
        `/customs/declaration/${selectedDeclaration.declarationId}/review`,
        {
          customsOfficer: inspectionOfficer,
          inspectionNotes: inspectionNotes || 'Physical inspection initiated',
        }
      );

      if (response.data.success) {
        showSuccess(
          'Inspection Started',
          'Physical inspection has been initiated',
          `Declaration: ${selectedDeclaration.declarationId} | Officer: ${inspectionOfficer}`
        );
        setInspectionDialogOpen(false);
        setInspectionNotes('');
        setInspectionOfficer('');
        loadDeclarations();
      } else {
        showError(
          'Failed to Start Inspection',
          response.data.error || 'Unable to start physical inspection',
          'Please verify the declaration status'
        );
      }
    } catch (error: any) {
      showError(
        'Error Starting Inspection',
        error.response?.data?.error || 'An unexpected error occurred',
        error.message
      );
    }
  };

  const handleCompleteInspection = async () => {
    if (!selectedDeclaration || !inspectionResult) return;

    try {
      const response = await api.post(
        `/customs/declaration/${selectedDeclaration.declarationId}/complete-inspection`,
        {
          inspectionNotes: `${inspectionResult}: ${inspectionNotes || 'Physical inspection completed successfully'}`,
        }
      );

      if (response.data.success) {
        showSuccess(
          'Inspection Completed',
          'Physical inspection has been successfully completed',
          `Result: ${inspectionResult} | Declaration moved to UNDER_REVIEW`
        );
        setCompleteDialogOpen(false);
        setInspectionNotes('');
        setInspectionResult('');
        loadDeclarations();
      } else {
        showError(
          'Failed to Complete Inspection',
          response.data.error || 'Unable to complete inspection',
          'Please try again'
        );
      }
    } catch (error: any) {
      showError(
        'Error Completing Inspection',
        error.response?.data?.error || 'An unexpected error occurred',
        error.message
      );
    }
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Declaration ID</TableCell>
              <TableCell>Exporter</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {declarations.map((declaration) => (
              <TableRow key={declaration.declarationId}>
                <TableCell>{declaration.declarationId}</TableCell>
                <TableCell>{declaration.exporterId}</TableCell>
                <TableCell>{declaration.quantity} kg</TableCell>
                <TableCell>${declaration.value.toLocaleString()}</TableCell>
                <TableCell>
                  <StatusChip status={declaration.status as any} label={declaration.status} />
                </TableCell>
                <TableCell>
                  {declaration.status === 'SUBMITTED' && (
                    <AnimatedButton
                      size="small"
                      startIcon={<Assignment />}
                      onClick={() => {
                        setSelectedDeclaration(declaration);
                        setInspectionDialogOpen(true);
                      }}
                    >
                      Start Inspection
                    </AnimatedButton>
                  )}
                  {declaration.status === 'UNDER_INSPECTION' && (
                    <AnimatedButton
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() => {
                        setSelectedDeclaration(declaration);
                        setCompleteDialogOpen(true);
                      }}
                    >
                      Complete Inspection
                    </AnimatedButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Start Inspection Dialog */}
      <Dialog open={inspectionDialogOpen} onClose={() => setInspectionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Start Physical Inspection</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Begin physical inspection of goods. This will change status to UNDER_INSPECTION.
          </Alert>
          
          {selectedDeclaration && (
            <Alert severity="success" variant="outlined" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600}>Declaration Details:</Typography>
              <Typography variant="body2">ID: {selectedDeclaration.declarationId}</Typography>
              <Typography variant="body2">Quantity: {selectedDeclaration.quantity} kg</Typography>
              <Typography variant="body2">Value: {selectedDeclaration.currency} {selectedDeclaration.value.toLocaleString()}</Typography>
              <Typography variant="body2">Destination: {selectedDeclaration.destination}</Typography>
            </Alert>
          )}
          
          <FormControl fullWidth sx={{ mt: 0, mb: 2 }}>
            <InputLabel>Customs Officer</InputLabel>
            <Select
              value={inspectionOfficer}
              onChange={(e) => setInspectionOfficer(e.target.value)}
              label="Customs Officer"
            >
              <MenuItem value="Senior Customs Officer">Senior Customs Officer</MenuItem>
              <MenuItem value="Customs Inspector">Customs Inspector</MenuItem>
              <MenuItem value="Customs Supervisor">Customs Supervisor</MenuItem>
              <MenuItem value="Port Customs Officer">Port Customs Officer</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Inspection Notes"
            multiline
            rows={4}
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            variant="outlined"
            placeholder="Document any initial observations or concerns..."
            sx={{ mt: 0 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInspectionDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button 
            variant="contained" 
            startIcon={<Assignment />} 
            onClick={handleStartInspection}
            disabled={!inspectionOfficer}
          >
            Start Inspection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Inspection Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Complete Physical Inspection</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Mark physical inspection as complete. Declaration will move to UNDER_REVIEW for clearance.
          </Alert>
          
          <FormControl fullWidth sx={{ mt: 0, mb: 2 }}>
            <InputLabel>Inspection Result</InputLabel>
            <Select
              value={inspectionResult}
              onChange={(e) => setInspectionResult(e.target.value)}
              label="Inspection Result"
            >
              <MenuItem value="PASSED">✓ Passed - All Clear</MenuItem>
              <MenuItem value="PASSED_WITH_NOTES">✓ Passed - Minor Notes</MenuItem>
              <MenuItem value="REQUIRES_DOCUMENTATION">⚠ Requires Additional Documentation</MenuItem>
              <MenuItem value="DISCREPANCY_FOUND">⚠ Discrepancy Found</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Inspection Results"
            multiline
            rows={4}
            value={inspectionNotes}
            onChange={(e) => setInspectionNotes(e.target.value)}
            variant="outlined"
            placeholder="Summarize inspection findings and compliance status..."
            sx={{ mt: 0 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCompleteDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<CheckCircle />} 
            onClick={handleCompleteInspection}
            disabled={!inspectionResult}
          >
            Complete Inspection
          </Button>
        </DialogActions>
      </Dialog>

      <NotificationDialog
        open={notification.open}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </Box>
  );
};
