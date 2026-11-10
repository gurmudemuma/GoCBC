// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Phytosanitary Certificates Management Portal

import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Alert, IconButton, Tooltip, Select, MenuItem, FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import api from '../../utils/api';

interface PhytosanitaryCertificate {
  certificateID: string;
  certificateNumber: string;
  shipmentID: string;
  exporterID: string;
  inspectorName: string;
  inspectionDate: string;
  botanicalName: string;
  treatment: string;
  placeOfOrigin: string;
  pointOfEntry: string;
  quantity: number;
  packagingType: string;
  numberOfPackages: number;
  distinguishingMarks: string;
  meansOfConveyance: string;
  validityPeriod: string;
  issuedBy: string;
  status: string;
}

export const PhytosanitaryCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<PhytosanitaryCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<PhytosanitaryCertificate | null>(null);
  const [searchShipmentId, setSearchShipmentId] = useState('');
  const [notification, setNotification] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ open: false, type: 'info', message: '' });

  // Form state
  const [formData, setFormData] = useState({
    shipmentID: '',
    exporterID: '',
    inspectorName: '',
    botanicalName: 'Coffea arabica',
    treatment: 'Heat treatment at 56°C for 30 minutes',
    placeOfOrigin: '',
    pointOfEntry: '',
    quantity: 0,
    packagingType: 'Jute bags',
    numberOfPackages: 0,
    distinguishingMarks: '',
    meansOfConveyance: '',
    pestsDetected: false,
    diseaseDetected: false,
    inspectionNotes: 'No pests or disease detected'
  });

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/phytosanitary');
      if (response.data.success) {
        setCertificates(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error loading certificates:', error);
      setNotification({
        open: true,
        type: 'error',
        message: 'Failed to load phytosanitary certificates'
      });
    } finally {
      setLoading(false);
    }
  };

  // Issue runs the real three-step chain (TEST-WORKFLOW-MAP §5 + slice-6
  // re-check): request → inspect → issue. The old handler POSTed to
  // /api/v1/phytosanitary/issue, which does not exist — the issue route is
  // POST /api/v1/phytosanitary/:certificateID/issue and requires the
  // certificate to already be requested and inspected on-chain.
  const handleIssue = async () => {
    try {
      setLoading(true);

      // Generate certificate ID
      const certificateID = `PHYTO-${Date.now()}`;
      const certificateNumber = `CERT-${Date.now()}`;
      const inspectionDate = new Date().toISOString().split('T')[0];
      const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Step 1 — request the certificate on-chain (PENDING)
      const requestResponse = await api.post('/phytosanitary/request', {
        certificateID,
        shipmentID: formData.shipmentID,
        exporterID: formData.exporterID,
        plantDescription: formData.botanicalName,
        quantity: formData.quantity,
        treatmentApplied: formData.treatment,
      });
      if (!requestResponse.data?.success) {
        throw new Error(requestResponse.data?.error?.message || 'Failed to request phytosanitary certificate');
      }

      // Step 2 — inspect it (PENDING → INSPECTED). Pests/disease mark the
      // inspection FAILED on-chain, so a failed inspection cannot be issued.
      const inspectResponse = await api.post(`/phytosanitary/${certificateID}/inspect`, {
        inspectorName: formData.inspectorName,
        inspectionDate,
        pestsDetected: formData.pestsDetected,
        diseaseDetected: formData.diseaseDetected,
        inspectionNotes: formData.inspectionNotes,
      });
      if (!inspectResponse.data?.success) {
        throw new Error(inspectResponse.data?.error?.message || 'Phytosanitary inspection failed');
      }

      // Step 3 — issue the inspected certificate (INSPECTED → ISSUED)
      const response = await api.post(`/phytosanitary/${certificateID}/issue`, {
        certificateNumber,
        issuingAuthority: 'Ministry of Agriculture',
        validUntil,
      });

      if (response.data.success) {
        setNotification({
          open: true,
          type: 'success',
          message: `Phytosanitary certificate ${response.data.data?.certificateNumber || certificateNumber} issued successfully!`
        });
        setIssueDialogOpen(false);
        resetForm();
        loadCertificates();
      } else {
        throw new Error(response.data?.error?.message || 'Failed to issue certificate');
      }
    } catch (error: any) {
      setNotification({
        open: true,
        type: 'error',
        message: error.response?.data?.error?.message || error.message || 'Failed to issue certificate'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByShipment = async () => {
    if (!searchShipmentId) {
      loadCertificates();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/phytosanitary/shipment/${searchShipmentId}`);
      if (response.data.success) {
        setCertificates(response.data.data || []);
      }
    } catch (error) {
      setNotification({
        open: true,
        type: 'error',
        message: 'Failed to search certificates'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    if (!window.confirm('Are you sure you want to revoke this certificate?')) {
      return;
    }

    try {
      const reason = prompt('Please enter revocation reason:');
      if (!reason) return;

      // The revoke route requires { reason, revokedBy } (both notEmpty) —
      // the old { revocationReason } body failed validation with 400.
      const revokedBy = JSON.parse(localStorage.getItem('user') || '{}').username || 'ECTA Officer';
      const response = await api.post(`/phytosanitary/${certificateId}/revoke`, {
        reason,
        revokedBy
      });

      if (response.data.success) {
        setNotification({
          open: true,
          type: 'success',
          message: 'Certificate revoked successfully'
        });
        loadCertificates();
      }
    } catch (error) {
      setNotification({
        open: true,
        type: 'error',
        message: 'Failed to revoke certificate'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      shipmentID: '',
      exporterID: '',
      inspectorName: '',
      botanicalName: 'Coffea arabica',
      treatment: 'Heat treatment at 56°C for 30 minutes',
      placeOfOrigin: '',
      pointOfEntry: '',
      quantity: 0,
      packagingType: 'Jute bags',
      numberOfPackages: 0,
      distinguishingMarks: '',
      meansOfConveyance: '',
      pestsDetected: false,
      diseaseDetected: false,
      inspectionNotes: 'No pests or disease detected'
    });
  };

  const getStatusChip = (status: string) => {
    const statusConfig: any = {
      ISSUED: { color: 'success', icon: <CheckCircleIcon /> },
      EXPIRED: { color: 'error', icon: <CancelIcon /> },
      REVOKED: { color: 'warning', icon: <CancelIcon /> }
    };
    const config = statusConfig[status] || { color: 'default', icon: null };
    return <Chip label={status} color={config.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} icon={config.icon} size="small" />;
  };

  return (
    <Box>
      {notification.open && (
        <Alert severity={notification.type} onClose={() => setNotification({ ...notification, open: false })} sx={{ mb: 2 }}>
          {notification.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              🌿 Phytosanitary Certificates (IPPC)
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setIssueDialogOpen(true)}
            >
              Issue Certificate
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>IPPC Compliant:</strong> Plant health certification required for all agricultural exports.
            Validity: 14 days. Format: PHYTO-ET-YYYYMMDD-XXXXX
          </Alert>

          {/* Search */}
          <Box display="flex" gap={2} mb={3}>
            <TextField
              label="Search by Shipment ID"
              value={searchShipmentId}
              onChange={(e) => setSearchShipmentId(e.target.value)}
              size="small"
              fullWidth
            />
            <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearchByShipment}>
              Search
            </Button>
            <Button variant="outlined" onClick={() => { setSearchShipmentId(''); loadCertificates(); }}>
              Clear
            </Button>
          </Box>

          {/* Certificates Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Certificate Number</TableCell>
                  <TableCell>Shipment ID</TableCell>
                  <TableCell>Exporter</TableCell>
                  <TableCell>Place of Origin</TableCell>
                  <TableCell>Quantity (kg)</TableCell>
                  <TableCell>Issued Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="textSecondary">
                        No phytosanitary certificates found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  certificates.map((cert) => (
                    <TableRow key={cert.certificateID}>
                      <TableCell>{cert.certificateNumber}</TableCell>
                      <TableCell>{cert.shipmentID}</TableCell>
                      <TableCell>{cert.exporterID}</TableCell>
                      <TableCell>{cert.placeOfOrigin}</TableCell>
                      <TableCell>{cert.quantity.toLocaleString()}</TableCell>
                      <TableCell>{new Date(cert.inspectionDate).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusChip(cert.status)}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton onClick={() => { setSelectedCertificate(cert); setViewDialogOpen(true); }}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {cert.status === 'ISSUED' && (
                          <Tooltip title="Revoke">
                            <IconButton color="error" onClick={() => handleRevoke(cert.certificateID)}>
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Issue Dialog */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Issue Phytosanitary Certificate</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Shipment ID *"
                value={formData.shipmentID}
                onChange={(e) => setFormData({ ...formData, shipmentID: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Exporter ID *"
                value={formData.exporterID}
                onChange={(e) => setFormData({ ...formData, exporterID: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Inspector Name *"
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                fullWidth
                required
                placeholder="Dr. Abebe Tesfaye"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Botanical Name"
                value={formData.botanicalName}
                onChange={(e) => setFormData({ ...formData, botanicalName: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Treatment Applied *"
                value={formData.treatment}
                onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Heat treatment at 56°C for 30 minutes"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Place of Origin *"
                value={formData.placeOfOrigin}
                onChange={(e) => setFormData({ ...formData, placeOfOrigin: e.target.value })}
                fullWidth
                required
                placeholder="Yirgacheffe, Gedeo Zone, Ethiopia"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Point of Entry (Destination) *"
                value={formData.pointOfEntry}
                onChange={(e) => setFormData({ ...formData, pointOfEntry: e.target.value })}
                fullWidth
                required
                placeholder="Hamburg Port, Germany"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Quantity (kg) *"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Packaging Type</InputLabel>
                <Select
                  value={formData.packagingType}
                  onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                  label="Packaging Type"
                >
                  <MenuItem value="Jute bags">Jute bags</MenuItem>
                  <MenuItem value="GrainPro bags">GrainPro bags</MenuItem>
                  <MenuItem value="Vacuum-sealed bags">Vacuum-sealed bags</MenuItem>
                  <MenuItem value="Containers">Containers</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Number of Packages *"
                type="number"
                value={formData.numberOfPackages}
                onChange={(e) => setFormData({ ...formData, numberOfPackages: Number(e.target.value) })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Distinguishing Marks"
                value={formData.distinguishingMarks}
                onChange={(e) => setFormData({ ...formData, distinguishingMarks: e.target.value })}
                fullWidth
                placeholder="LOT-YRG-2024-Q1"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Means of Conveyance"
                value={formData.meansOfConveyance}
                onChange={(e) => setFormData({ ...formData, meansOfConveyance: e.target.value })}
                fullWidth
                placeholder="MSC MARIA - Container MSCU1234567"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Pests Detected</InputLabel>
                <Select
                  value={formData.pestsDetected ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, pestsDetected: e.target.value === 'yes' })}
                  label="Pests Detected"
                >
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Disease Detected</InputLabel>
                <Select
                  value={formData.diseaseDetected ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, diseaseDetected: e.target.value === 'yes' })}
                  label="Disease Detected"
                >
                  <MenuItem value="no">No</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Inspection Notes"
                value={formData.inspectionNotes}
                onChange={(e) => setFormData({ ...formData, inspectionNotes: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Inspection findings"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleIssue} variant="contained" color="primary" disabled={loading}>
            {loading ? 'Issuing...' : 'Issue Certificate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Phytosanitary Certificate Details</DialogTitle>
        <DialogContent>
          {selectedCertificate && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="success">
                  <strong>Certificate Number:</strong> {selectedCertificate.certificateNumber}
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Shipment ID</Typography>
                <Typography variant="body1">{selectedCertificate.shipmentID}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Exporter ID</Typography>
                <Typography variant="body1">{selectedCertificate.exporterID}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Inspector</Typography>
                <Typography variant="body1">{selectedCertificate.inspectorName}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Inspection Date</Typography>
                <Typography variant="body1">{new Date(selectedCertificate.inspectionDate).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Botanical Name</Typography>
                <Typography variant="body1"><em>{selectedCertificate.botanicalName}</em></Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Treatment Applied</Typography>
                <Typography variant="body1">{selectedCertificate.treatment}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Place of Origin</Typography>
                <Typography variant="body1">{selectedCertificate.placeOfOrigin}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Point of Entry</Typography>
                <Typography variant="body1">{selectedCertificate.pointOfEntry}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Quantity</Typography>
                <Typography variant="body1">{selectedCertificate.quantity.toLocaleString()} kg</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Packaging</Typography>
                <Typography variant="body1">{selectedCertificate.packagingType}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Number of Packages</Typography>
                <Typography variant="body1">{selectedCertificate.numberOfPackages}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Distinguishing Marks</Typography>
                <Typography variant="body1">{selectedCertificate.distinguishingMarks || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Means of Conveyance</Typography>
                <Typography variant="body1">{selectedCertificate.meansOfConveyance || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Validity Period</Typography>
                <Typography variant="body1">{selectedCertificate.validityPeriod} days</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Issued By</Typography>
                <Typography variant="body1">{selectedCertificate.issuedBy}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                {getStatusChip(selectedCertificate.status)}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhytosanitaryCertificates;
