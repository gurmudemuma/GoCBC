/**
 * ExporterHistoricalTrend - Shows exporter's historical performance before LC approval
 * Displays past contracts, shipments, payments, compliance records
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  Warning,
  LocalShipping,
  AccountBalance,
  Assessment,
} from '@mui/icons-material';
import axios from 'axios';

interface HistoricalData {
  exporterId: string;
  exporterName: string;
  totalContracts: number;
  completedContracts: number;
  totalShipments: number;
  onTimeShipments: number;
  totalPayments: number;
  successfulPayments: number;
  totalValueExported: number;
  averageContractValue: number;
  complianceScore: number;
  lastShipmentDate: string;
  recentContracts: Array<{
    contractId: string;
    buyerCountry: string;
    totalValue: number;
    status: string;
    completedDate: string;
  }>;
  recentShipments: Array<{
    shipmentId: string;
    destination: string;
    status: string;
    deliveryDate: string;
  }>;
}

interface Props {
  exporterId: string;
  contractId?: string;
}

const ExporterHistoricalTrend: React.FC<Props> = ({ exporterId, contractId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoricalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');

        // Fetch historical performance data
        const response = await axios.get(
          `http://localhost:3001/api/v1/exporters/${exporterId}/historical-performance`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError('Failed to load historical data');
        }
      } catch (err: any) {
        console.error('Error loading historical data:', err);
        setError(err.response?.data?.error?.message || 'Failed to load historical data');
      } finally {
        setLoading(false);
      }
    };

    if (exporterId) {
      loadHistoricalData();
    }
  }, [exporterId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading historical trend...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No historical data available for this exporter.
      </Alert>
    );
  }

  const successRate = data.totalContracts > 0 
    ? (data.completedContracts / data.totalContracts) * 100 
    : 0;

  const onTimeRate = data.totalShipments > 0
    ? (data.onTimeShipments / data.totalShipments) * 100
    : 0;

  const paymentSuccessRate = data.totalPayments > 0
    ? (data.successfulPayments / data.totalPayments) * 100
    : 0;

  const getRiskLevel = () => {
    if (data.complianceScore >= 90 && successRate >= 90) return { level: 'LOW', color: 'success' };
    if (data.complianceScore >= 70 && successRate >= 70) return { level: 'MEDIUM', color: 'warning' };
    return { level: 'HIGH', color: 'error' };
  };

  const risk = getRiskLevel();

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TrendingUp /> Exporter Historical Performance
      </Typography>

      {/* Risk Assessment Banner */}
      <Alert severity={risk.color as any} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          Risk Assessment: {risk.level} RISK
        </Typography>
        <Typography variant="body2">
          Based on {data.totalContracts} completed contracts, {data.totalShipments} shipments, 
          and {data.complianceScore}% compliance score.
        </Typography>
      </Alert>

      {/* Key Performance Indicators */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Contract Success Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {successRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.completedContracts} of {data.totalContracts} contracts
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={successRate} 
                sx={{ mt: 1 }}
                color={successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                On-Time Delivery Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {onTimeRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.onTimeShipments} of {data.totalShipments} shipments
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={onTimeRate} 
                sx={{ mt: 1 }}
                color={onTimeRate >= 90 ? 'success' : onTimeRate >= 70 ? 'warning' : 'error'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Payment Success Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {paymentSuccessRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.successfulPayments} of {data.totalPayments} payments
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={paymentSuccessRate} 
                sx={{ mt: 1 }}
                color={paymentSuccessRate >= 90 ? 'success' : paymentSuccessRate >= 70 ? 'warning' : 'error'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Compliance Score
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {data.complianceScore}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                NBE & ECTA compliance
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={data.complianceScore} 
                sx={{ mt: 1 }}
                color={data.complianceScore >= 90 ? 'success' : data.complianceScore >= 70 ? 'warning' : 'error'}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Summary */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
            Financial Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Total Value Exported</TableCell>
                <TableCell align="right">
                  <Typography variant="h6" color="primary">
                    ${data.totalValueExported.toLocaleString()} USD
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Average Contract Value</TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    ${data.averageContractValue.toLocaleString()} USD
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Last Shipment Date</TableCell>
                <TableCell align="right">
                  {data.lastShipmentDate 
                    ? new Date(data.lastShipmentDate).toLocaleDateString()
                    : 'N/A'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Contracts */}
      {data.recentContracts && data.recentContracts.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Contracts (Last 5)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Table size="small">
              <TableBody>
                {data.recentContracts.map((contract) => (
                  <TableRow key={contract.contractId}>
                    <TableCell>{contract.contractId}</TableCell>
                    <TableCell>{contract.buyerCountry}</TableCell>
                    <TableCell>${contract.totalValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={contract.status} 
                        size="small" 
                        color={contract.status === 'COMPLETED' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {contract.completedDate 
                        ? new Date(contract.completedDate).toLocaleDateString()
                        : 'In Progress'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Shipments */}
      {data.recentShipments && data.recentShipments.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Shipments (Last 5)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Table size="small">
              <TableBody>
                {data.recentShipments.map((shipment) => (
                  <TableRow key={shipment.shipmentId}>
                    <TableCell>{shipment.shipmentId}</TableCell>
                    <TableCell>{shipment.destination}</TableCell>
                    <TableCell>
                      <Chip 
                        label={shipment.status} 
                        size="small" 
                        color={shipment.status === 'DELIVERED' ? 'success' : 'info'}
                      />
                    </TableCell>
                    <TableCell>
                      {shipment.deliveryDate 
                        ? new Date(shipment.deliveryDate).toLocaleDateString()
                        : 'In Transit'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ExporterHistoricalTrend;
