// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Inspection Scheduling Dialog - ECTA Portal
// Schedule inspection with date, time, inspector assignment, and location

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
  TextField,
  MenuItem,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  Autocomplete,
} from '@mui/material';
import {
  Close,
  Schedule,
  Person,
  LocationOn,
  Assignment,
  Send,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const ECTA_COLORS = {
  green: '#2e7d32',
  lightGreen: '#66bb6a',
};

interface Inspection {
  inspectionId: string;
  shipmentId: string;
  exporterId: string;
  exporterName?: string;
  coffeeType: string;
  quantity: number;
  location?: string;
}

interface Inspector {
  inspectorId: string;
  name: string;
  certification: string;
  availability: string;
}

interface InspectionSchedulingDialogProps {
  open: boolean;
  onClose: () => void;
  inspection: Inspection;
  onSuccess: () => void;
}

const InspectionSchedulingDialog: React.FC<InspectionSchedulingDialogProps> = ({
  open,
  onClose,
  inspection,
  onSuccess,
}) => {
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    inspectorId: '',
    location: inspection.location || '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load inspectors
  useEffect(() => {
    if (open) {
      fetchInspectors();
    }
  }, [open]);

  const fetchInspectors = async () => {
    try {
      setLoading(true);
      // Mock inspectors data - replace with actual API call
      const mockInspectors: Inspector[] = [
        { inspectorId: 'INS001', name: 'Alemayehu Bekele', certification: 'ECTA Senior Inspector', availability: 'Available' },
        { inspectorId: 'INS002', name: 'Tigist Worku', certification: 'ECTA Inspector Grade A', availability: 'Available' },
        { inspectorId: 'INS003', name: 'Dawit Haile', certification: 'ECTA Quality Specialist', availability: 'Busy' },
      ];
      setInspectors(mockInspectors);
    } catch (error) {
      console.error('[INSPECTION] Error fetching inspectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheduledDate) newErrors.scheduledDate = 'Inspection date is required';
    if (!formData.scheduledTime) newErrors.scheduledTime = 'Inspection time is required';
    if (!formData.inspectorId) newErrors.inspectorId = 'Inspector must be assigned';
    if (!formData.location) newErrors.location = 'Inspection location is required';

    // Validate date is not in the past
    const selectedDate = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    if (selectedDate < new Date()) {
      newErrors.scheduledDate = 'Date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await apiFetch(`/api/v1/inspection/${inspection.inspectionId}/schedule`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          scheduledDate: `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
          inspectorId: formData.inspectorId,
          location: formData.location,
          notes: formData.notes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Inspection scheduled successfully');
        onSuccess();
        onClose();
        resetForm();
      } else {
        showError(result.error || 'Failed to schedule inspection');
      }
    } catch (error: any) {
      console.error('[INSPECTION] Error scheduling:', error);
      showError('Failed to schedule inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      scheduledDate: '',
      scheduledTime: '',
      inspectorId: '',
      location: inspection.location || '',
      notes: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const selectedInspector = inspectors.find(i => i.inspectorId === formData.inspectorId);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: `4px solid ${ECTA_COLORS.green}`,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Schedule sx={{ color: ECTA_COLORS.green }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Schedule Inspection
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {inspection.inspectionId}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={submitting}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Box>
          {/* Shipment Information */}
          <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment /> Shipment Details
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Shipment ID
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {inspection.shipmentId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Exporter
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {inspection.exporterName || inspection.exporterId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Coffee Type
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {inspection.coffeeType}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Quantity
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {inspection.quantity.toLocaleString()} kg
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Scheduling Form */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
            Schedule Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Inspection Date *"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                error={!!errors.scheduledDate}
                helperText={errors.scheduledDate}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: new Date().toISOString().split('T')[0]
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="Inspection Time *"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                error={!!errors.scheduledTime}
                helperText={errors.scheduledTime}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Inspector Assignment */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <Person sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
            Inspector Assignment
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={inspectors}
                getOptionLabel={(option) => `${option.name} - ${option.certification}`}
                value={inspectors.find(i => i.inspectorId === formData.inspectorId) || null}
                onChange={(e, value) => handleInputChange('inspectorId', value?.inspectorId || '')}
                loading={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Inspector *"
                    error={!!errors.inspectorId}
                    helperText={errors.inspectorId}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.certification} • {option.availability}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>
            
            {selectedInspector && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<Person />}>
                  <strong>{selectedInspector.name}</strong> has been selected. 
                  Status: {selectedInspector.availability}
                </Alert>
              </Grid>
            )}
          </Grid>

          {/* Location */}
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <LocationOn sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
            Inspection Location
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <TextField
            fullWidth
            label="Location *"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            error={!!errors.location}
            helperText={errors.location || 'Warehouse or processing facility address'}
            placeholder="e.g., ECTA Warehouse, Addis Ababa"
            sx={{ mb: 3 }}
          />

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Notes (Optional)"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any special instructions or requirements..."
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
          sx={{ bgcolor: ECTA_COLORS.green }}
        >
          {submitting ? 'Scheduling...' : 'Schedule Inspection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InspectionSchedulingDialog;
