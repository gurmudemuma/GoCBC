// Border Crossing Initiation Dialog
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid, Typography, TextField, Divider, IconButton, CircularProgress, MenuItem } from '@mui/material';
import { Close, LocalShipping, Send } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';
import { getPortalBrand } from '@/components/shared/portal';

const CUSTOMS_COLORS = { navy: getPortalBrand('CUSTOMS').primary };

interface BorderCrossingInitiationDialogProps { open: boolean; onClose: () => void; onSuccess: () => void; }

// Payload is exactly the set POST /bordercrossing/initiate reads
// (api/src/routes/bordercrossing.ts): crossingId, shipmentId, contractId,
// exporterId, borderPost, borderCountry, crossingType, transitCountry,
// finalDestination, exitPermitNumber, customsDeclaration, transportMode,
// vehicleNumber, driverName, sealNumber, cargoWeight, numberOfBags.
// The old dialog sent `borderCrossingId` (route reads `crossingId`) plus
// driverLicense/arrivalTime/notes (read by nobody, stored nowhere — the
// chaincode does not even set DriverLicense), and left every other field
// `undefined`, so the chaincode failed ValidateID on the empty crossing id
// and parseFloat/parseInt on the string "undefined" for weight/bags.
const BorderCrossingInitiationDialog: React.FC<BorderCrossingInitiationDialogProps> = ({ open, onClose, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    crossingId: `BC${Date.now()}`,
    shipmentId: '',
    contractId: '',
    exporterId: '',
    borderPost: 'Galafi',
    borderCountry: 'Djibouti',
    crossingType: 'LAND',
    transitCountry: '',
    finalDestination: '',
    exitPermitNumber: '',
    customsDeclaration: '',
    transportMode: 'TRUCK',
    vehicleNumber: '',
    driverName: '',
    sealNumber: '',
    cargoWeight: '',
    numberOfBags: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    // Chaincode ValidateID: non-empty, <= 100 chars, ^[a-zA-Z0-9_-]+$
    if (!form.crossingId || !/^[a-zA-Z0-9_-]+$/.test(form.crossingId)) e.crossingId = 'Crossing ID required (letters, digits, - and _ only)';
    if (!form.shipmentId) e.shipmentId = 'Shipment ID required';
    if (!form.vehicleNumber) e.vehicleNumber = 'Vehicle number required';
    if (!form.driverName) e.driverName = 'Driver name required';
    if (!form.borderPost) e.borderPost = 'Border post required';
    // Chaincode parseFloat/parseInt on these two — "undefined" or "" fails.
    const weight = parseFloat(form.cargoWeight);
    if (!Number.isFinite(weight) || weight <= 0) e.cargoWeight = 'Cargo weight must be a number > 0 (kg)';
    const bags = Number(form.numberOfBags);
    if (!Number.isInteger(bags) || bags < 0) e.numberOfBags = 'Number of bags must be a whole number (0 or more)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload = {
        crossingId: form.crossingId,
        shipmentId: form.shipmentId,
        contractId: form.contractId,
        exporterId: form.exporterId,
        borderPost: form.borderPost,
        borderCountry: form.borderCountry,
        crossingType: form.crossingType,
        transitCountry: form.transitCountry,
        finalDestination: form.finalDestination,
        exitPermitNumber: form.exitPermitNumber,
        customsDeclaration: form.customsDeclaration,
        transportMode: form.transportMode,
        vehicleNumber: form.vehicleNumber,
        driverName: form.driverName,
        sealNumber: form.sealNumber,
        // Route does String(...) on these; send real numbers, never undefined.
        cargoWeight: parseFloat(form.cargoWeight),
        numberOfBags: parseInt(form.numberOfBags, 10),
      };
      const response = await apiFetch('/bordercrossing/initiate', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.success) { showSuccess('Success', 'Border crossing initiated'); onSuccess(); onClose(); setForm({ ...form, crossingId: `BC${Date.now()}`, cargoWeight: '', numberOfBags: '' }); }
      else showError('Error', result.error || 'Failed');
    } catch (error) { showError('Error', 'Failed to initiate'); } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocalShipping sx={{ color: CUSTOMS_COLORS.navy }} />
          <Box><Typography variant="h6" fontWeight={600}>Initiate Border Crossing</Typography></Box>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Crossing ID *" value={form.crossingId} onChange={(e) => setForm({...form, crossingId: e.target.value})} error={!!errors.crossingId} helperText={errors.crossingId || 'Ledger key for this crossing'} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Shipment ID *" value={form.shipmentId} onChange={(e) => setForm({...form, shipmentId: e.target.value})} error={!!errors.shipmentId} helperText={errors.shipmentId} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Contract ID" value={form.contractId} onChange={(e) => setForm({...form, contractId: e.target.value})} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Exporter ID" value={form.exporterId} onChange={(e) => setForm({...form, exporterId: e.target.value})} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Border Post *" value={form.borderPost} onChange={(e) => setForm({...form, borderPost: e.target.value})} error={!!errors.borderPost}>
            <MenuItem value="Galafi">Galafi (Djibouti)</MenuItem>
            <MenuItem value="Moyale">Moyale (Kenya)</MenuItem>
            <MenuItem value="Metema">Metema (Sudan)</MenuItem>
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Border Country" value={form.borderCountry} onChange={(e) => setForm({...form, borderCountry: e.target.value})}>
            <MenuItem value="Djibouti">Djibouti</MenuItem>
            <MenuItem value="Kenya">Kenya</MenuItem>
            <MenuItem value="Sudan">Sudan</MenuItem>
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Crossing Type" value={form.crossingType} onChange={(e) => setForm({...form, crossingType: e.target.value})}>
            <MenuItem value="LAND">LAND</MenuItem>
            <MenuItem value="SEA_PORT">SEA_PORT</MenuItem>
            <MenuItem value="AIR">AIR</MenuItem>
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth select label="Transport Mode" value={form.transportMode} onChange={(e) => setForm({...form, transportMode: e.target.value})}>
            <MenuItem value="TRUCK">TRUCK</MenuItem>
            <MenuItem value="CONTAINER">CONTAINER</MenuItem>
            <MenuItem value="RAIL">RAIL</MenuItem>
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Transit Country" value={form.transitCountry} onChange={(e) => setForm({...form, transitCountry: e.target.value})} placeholder="If transiting through another country" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Final Destination" value={form.finalDestination} onChange={(e) => setForm({...form, finalDestination: e.target.value})} placeholder="Ultimate destination country" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Exit Permit Number" value={form.exitPermitNumber} onChange={(e) => setForm({...form, exitPermitNumber: e.target.value})} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Customs Declaration (SAD) No." value={form.customsDeclaration} onChange={(e) => setForm({...form, customsDeclaration: e.target.value})} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Vehicle Number *" value={form.vehicleNumber} onChange={(e) => setForm({...form, vehicleNumber: e.target.value})} error={!!errors.vehicleNumber} helperText={errors.vehicleNumber} placeholder="e.g., ET-3-12345" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Driver Name *" value={form.driverName} onChange={(e) => setForm({...form, driverName: e.target.value})} error={!!errors.driverName} helperText={errors.driverName} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Seal Number" value={form.sealNumber} onChange={(e) => setForm({...form, sealNumber: e.target.value})} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Cargo Weight (kg) *" value={form.cargoWeight} onChange={(e) => setForm({...form, cargoWeight: e.target.value})} error={!!errors.cargoWeight} helperText={errors.cargoWeight} inputProps={{ min: 0, step: 'any' }} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Number of Bags *" value={form.numberOfBags} onChange={(e) => setForm({...form, numberOfBags: e.target.value})} error={!!errors.numberOfBags} helperText={errors.numberOfBags} inputProps={{ min: 0, step: 1 }} /></Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Send />} sx={{ bgcolor: CUSTOMS_COLORS.navy }}>
          {submitting ? 'Submitting...' : 'Initiate Crossing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BorderCrossingInitiationDialog;
