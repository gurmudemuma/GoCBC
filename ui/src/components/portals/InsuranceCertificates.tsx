// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Marine Insurance Certificates Management Portal

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
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import api from '../../utils/api';

interface InsuranceCertificate {
  insuranceID: string;
  certificateNumber: string;
  shipmentID: string;
  contractID: string;
  policyNumber: string;
  insuranceCompany: string;
  insuredValue: number;
  currency: string;
  coverageType: string;
  vesselName: string;
  voyageNumber: string;
  containerNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  goodsDescription: string;
  quantity: string;
  incoterm: string;
  claimsPayable: string;
  validityPeriod: string;
  issuedBy: string;
  status: string;
  claimAmount?: number;
  claimReason?: string;
}

export const InsuranceCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<InsuranceCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<InsuranceCertificate | null>(null);
  const [searchShipmentId, setSearchShipmentId] = useState('');
  const [notification, setNotification] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ open: false, type: 'info', message: '' });

  const [claimData, setClaimData] = useState({
    claimReason: '',
    claimAmount: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    shipmentID: '',
    contractID: '',
    policyNumber: '',
    insuranceCompany: 'Ethiopian Insurance Corporation',
    insuredValue: 0,
    currency: 'USD',
    coverageType: 'ICC(A)',
    vesselName: '',
    voyageNumber: '',
    containerNumber: '',
    portOfLoading: 'Djibouti Port',
    portOfDischarge: '',
    goodsDescription: 'Ethiopian Arabica Coffee',
    quantity: '',
    incoterm: 'CIF',
    claimsPayable: 'Addis Ababa, Ethiopia'
  });

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/insurance');
      if (response.data.success) {
        setCertificates(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    try {
      setLoading(true);
      const insuranceID = `INS-${Date.now()}`;
      
      const response = await api.post('/api/v1/insurance/issue', {
        insuranceID,
        ...formData,
        issuedBy: 'Insurance Agent' // Should come from auth
      });

      if (response.data.success) {
        setNotification({
          open: true,
          type: 'success',
          message: `Insurance certificate issued successfully!`
        });
        setIssueDialogOpen(false);
        loadCertificates();
      }
    } catch (error: any) {
      setNotification({
        open: true,
        type: 'error',
        message: error.response?.data?.error?.message || 'Failed to issue certificate'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordClaim = async () => {
    if (!selectedCertificate) return;

    try {
      const response = await api.post(
        `/api/v1/insurance/${selectedCertificate.insuranceID}/claim`,
        claimData
      );

      if (response.data.success) {
        setNotification({
          open: true,
          type: 'success',
          message: 'Insurance claim recorded successfully'
        });
        setClaimDialogOpen(false);
        loadCertificates();
      }
    } catch (error) {
      setNotification({
        open: true,
        type: 'error',
        message: 'Failed to record claim'
      });
    }
  };

  const getCoverageDescription = (type: string) => {
    const descriptions: any = {
      'ICC(A)': 'All Risks - Covers theft, contamination, breakage, water damage',
      'ICC(B)': 'Named Perils - Covers fire, explosion, vessel stranding',
      'ICC(C)': 'Minimum Coverage - Covers fire and explosion only'
    };
    return descriptions[type] || type;
  };

  const getStatusChip = (status: string) => {
    const config: any = {
      ISSUED: { color: 'success', icon: <CheckCircleIcon /> },
      CLAIMED: { color: 'warning', icon: <WarningIcon /> },
      EXPIRED: { color: 'default', icon: null }
    };
    const c = config[status] || { color: 'default', icon: null };
    return <Chip label={status} color={c.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} icon={c.icon} size="small" />;
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
              🛡️ Marine Insurance Certificates (ICC)
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
            <strong>ICC Compliant:</strong> Marine cargo insurance required for CIF incoterm shipments (~30% of exports).
            Coverage: ICC(A) All Risks, ICC(B) Named Perils, ICC(C) Minimum
          </Alert>

          {/* Certificates Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Certificate No.</TableCell>
                  <TableCell>Shipment ID</TableCell>
                  <TableCell>Policy Number</TableCell>
                  <TableCell>Insured Value</TableCell>
                  <TableCell>Coverage Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">No insurance certificates found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  certificates.map((cert) => (
                    <TableRow key={cert.insuranceID}>
                      <TableCell>{cert.certificateNumber}</TableCell>
                      <TableCell>{cert.shipmentID}</TableCell>
                      <TableCell>{cert.policyNumber}</TableCell>
                      <TableCell>{cert.currency} {cert.insuredValue.toLocaleString()}</TableCell>
                      <TableCell>
                        <Tooltip title={getCoverageDescription(cert.coverageType)}>
                          <Chip label={cert.coverageType} size="small" />
                        </Tooltip>
                      </TableCell>
                      <TableCell>{getStatusChip(cert.status)}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton onClick={() => { setSelectedCertificate(cert); setViewDialogOpen(true); }}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {cert.status === 'ISSUED' && (
                          <Tooltip title="Record Claim">
                            <IconButton color="warning" onClick={() => { setSelectedCertificate(cert); setClaimDialogOpen(true); }}>
                              <WarningIcon />
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

      {/* Issue Dialog - Simplified for brevity */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Issue Marine Insurance Certificate</DialogTitle>
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
                label="Contract ID *"
                value={formData.contractID}
                onChange={(e) => setFormData({ ...formData, contractID: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Policy Number"
                value={formData.policyNumber}
                onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                fullWidth
                placeholder="EIC-2024-12345"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Insurance Company"
                value={formData.insuranceCompany}
                onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Insured Value *"
                type="number"
                value={formData.insuredValue}
                onChange={(e) => setFormData({ ...formData, insuredValue: Number(e.target.value) })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  label="Currency"
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Coverage Type</InputLabel>
                <Select
                  value={formData.coverageType}
                  onChange={(e) => setFormData({ ...formData, coverageType: e.target.value })}
                  label="Coverage Type"
                >
                  <MenuItem value="ICC(A)">ICC(A) - All Risks</MenuItem>
                  <MenuItem value="ICC(B)">ICC(B) - Named Perils</MenuItem>
                  <MenuItem value="ICC(C)">ICC(C) - Minimum</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Vessel Name"
                value={formData.vesselName}
                onChange={(e) => setFormData({ ...formData, vesselName: e.target.value })}
                fullWidth
                placeholder="MSC MARIA"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Container Number"
                value={formData.containerNumber}
                onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value })}
                fullWidth
                placeholder="MSCU1234567"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Port of Loading"
                value={formData.portOfLoading}
                onChange={(e) => setFormData({ ...formData, portOfLoading: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Port of Discharge *"
                value={formData.portOfDischarge}
                onChange={(e) => setFormData({ ...formData, portOfDischarge: e.target.value })}
                fullWidth
                required
                placeholder="Hamburg Port, Germany"
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

      {/* Claim Dialog */}
      <Dialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Insurance Claim</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Claim Reason *"
                value={claimData.claimReason}
                onChange={(e) => setClaimData({ ...claimData, claimReason: e.target.value })}
                fullWidth
                required
                multiline
                rows={3}
                placeholder="Container water damage during transit"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Claim Amount (USD) *"
                type="number"
                value={claimData.claimAmount}
                onChange={(e) => setClaimData({ ...claimData, claimAmount: Number(e.target.value) })}
                fullWidth
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRecordClaim} variant="contained" color="warning">
            Record Claim
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsuranceCertificates;
