// Cleared Shipments - Historical record of completed customs clearances
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
  Alert,
  Typography,
  Chip,
  Button,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import { CheckCircle, Visibility, FileDownload, LocalShipping, Close } from '@mui/icons-material';
import { AnimatedButton, StatusChip } from '@/components/modern';
import { apiFetch } from '@/config/api.config';

interface ClearedShipment {
  declarationId: string;
  shipmentId: string;
  exporterId: string;
  clearanceNumber: string;
  clearanceDate: string;
  destination: string;
  value: number;
  currency: string;
  quantity: number;
  customsOfficer: string;
}

export const CustomsClearedShipments: React.FC = () => {
  const [clearedShipments, setClearedShipments] = useState<ClearedShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ClearedShipment | null>(null);

  useEffect(() => {
    loadClearedShipments();
  }, []);

  const loadClearedShipments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Load declarations with status CLEARED
      const response = await apiFetch('/customs/declarations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const cleared = result.data
          .filter((d: any) => (d.status || d.Status) === 'CLEARED')
          .map((d: any) => ({
            declarationId: d.declarationId || d.DeclarationID || '',
            shipmentId: d.shipmentId || d.ShipmentID || '',
            exporterId: d.exporterId || d.ExporterID || '',
            clearanceNumber: d.clearanceNumber || d.ClearanceNumber || 'N/A',
            clearanceDate: d.clearanceDate || d.ClearanceDate || '',
            destination: d.destination || d.Destination || 'Unknown',
            value: parseFloat(d.totalValue || d.TotalValue || d.value || '0'),
            currency: d.currency || d.Currency || 'USD',
            quantity: parseFloat(d.quantity || d.Quantity || '0'),
            customsOfficer: d.clearedBy || d.ClearedBy || d.customsOfficer || 'Unknown',
          }));
        
        setClearedShipments(cleared);
        console.log(`[CUSTOMS-CLEARED] Loaded ${cleared.length} cleared shipments`);
      }
    } catch (error) {
      console.error('[CUSTOMS-CLEARED] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleOpenBookingDialog = (shipment: ClearedShipment) => {
    // Navigate to Shipping Portal with shipment ID pre-selected
    const shipmentId = shipment.shipmentId;
    
    // Store shipment context for Shipping Portal
    sessionStorage.setItem('shipping_from_customs', JSON.stringify({
      shipmentId: shipmentId,
      declarationId: shipment.declarationId,
      clearanceNumber: shipment.clearanceNumber,
      destination: shipment.destination,
      quantity: shipment.quantity,
      value: shipment.value,
      currency: shipment.currency,
    }));
    
    // Navigate to Shipping Portal
    window.location.href = `/portals/shipping?shipment=${shipmentId}&from=customs`;
  };

  const handleOpenViewDialog = (shipment: ClearedShipment) => {
    setSelectedShipment(shipment);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedShipment(null);
  };

  return (
    <Box>
      <Alert severity="success" sx={{ mb: 2 }}>
        <Typography variant="body2" fontWeight={600}>Cleared Shipments - Export History</Typography>
        <Typography variant="body2">
          Complete record of all shipments that have received customs clearance and been authorized for export.
        </Typography>
      </Alert>

      {loading && <Alert severity="info" sx={{ mb: 2 }}>Loading cleared shipments...</Alert>}

      {!loading && clearedShipments.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>No Cleared Shipments Yet</Typography>
          <Typography variant="body2">
            Cleared shipments will appear here after customs officers issue clearance.
          </Typography>
        </Alert>
      )}

      {!loading && clearedShipments.length > 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              <CheckCircle sx={{ color: 'success.main', verticalAlign: 'middle', mr: 1 }} />
              {clearedShipments.length} Cleared Shipments
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<FileDownload />}
              onClick={() => alert('Export functionality - generates Excel report of cleared shipments')}
            >
              Export Report
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Clearance Number</TableCell>
                  <TableCell>Declaration ID</TableCell>
                  <TableCell>Shipment ID</TableCell>
                  <TableCell>Exporter</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell align="right">Quantity (kg)</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell>Clearance Date</TableCell>
                  <TableCell>Officer</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clearedShipments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((shipment) => (
                  <TableRow key={shipment.declarationId}>
                    <TableCell>
                      <Chip 
                        label={shipment.clearanceNumber} 
                        size="small" 
                        color="success" 
                        icon={<CheckCircle />}
                      />
                    </TableCell>
                    <TableCell>{shipment.declarationId}</TableCell>
                    <TableCell>{shipment.shipmentId}</TableCell>
                    <TableCell>{shipment.exporterId}</TableCell>
                    <TableCell>{shipment.destination}</TableCell>
                    <TableCell align="right">{shipment.quantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{formatCurrency(shipment.value, shipment.currency)}</TableCell>
                    <TableCell>{formatDate(shipment.clearanceDate)}</TableCell>
                    <TableCell>{shipment.customsOfficer}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenViewDialog(shipment)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Navigate to Shipping Portal">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenBookingDialog(shipment)}
                          >
                            <LocalShipping />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={clearedShipments.length}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </>
      )}

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleCloseViewDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Clearance Details</Typography>
            <IconButton size="small" onClick={handleCloseViewDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <>
              <Alert severity="success" sx={{ mb: 3, mt: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  ✅ Customs Cleared - Export Authorized
                </Typography>
                <Typography variant="body2">
                  Clearance Number: {selectedShipment.clearanceNumber}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Declaration Information
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Declaration ID"
                    value={selectedShipment.declarationId}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Shipment ID"
                    value={selectedShipment.shipmentId}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Clearance Number"
                    value={selectedShipment.clearanceNumber}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Clearance Date"
                    value={formatDate(selectedShipment.clearanceDate)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                    Shipment Details
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Exporter ID"
                    value={selectedShipment.exporterId}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Destination Country"
                    value={selectedShipment.destination}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    value={`${selectedShipment.quantity.toLocaleString()} kg`}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customs Value"
                    value={formatCurrency(selectedShipment.value, selectedShipment.currency)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                    Clearance Information
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customs Officer"
                    value={selectedShipment.customsOfficer}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Status"
                    value="CLEARED ✓"
                    InputProps={{ 
                      readOnly: true,
                      style: { color: '#2e7d32', fontWeight: 600 }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Next Steps - Shipping
                    </Typography>
                    <Typography variant="body2">
                      • This shipment is authorized for export<br/>
                      • Navigate to Shipping Portal to book freight<br/>
                      • Generate Bill of Lading and transport documents<br/>
                      • Arrange transport to Djibouti Port
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseViewDialog}>
            Close
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={() => {
              if (selectedShipment) {
                alert(`Download functionality:\nGenerating clearance certificate for ${selectedShipment.clearanceNumber}\n\nWould include:\n• Clearance number and date\n• Declaration details\n• Shipment information\n• Customs officer signature\n• QR code for verification`);
              }
            }}
          >
            Download Certificate
          </Button>
          {selectedShipment && (
            <Button
              variant="contained"
              color="success"
              startIcon={<LocalShipping />}
              onClick={() => {
                handleCloseViewDialog();
                handleOpenBookingDialog(selectedShipment);
              }}
            >
              Go to Shipping Portal
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
