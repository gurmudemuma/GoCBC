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
} from '@mui/material';
import { CheckCircle, Visibility, FileDownload } from '@mui/icons-material';
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
                {clearedShipments.map((shipment) => (
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
                      <AnimatedButton
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => alert(`View details for ${shipment.declarationId}`)}
                      >
                        View
                      </AnimatedButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};
