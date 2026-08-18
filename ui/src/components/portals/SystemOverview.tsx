// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// System Overview Dashboard - Aggregate Statistics
// Shows complete overview of exporters, contracts, shipments, payments, and audit logs

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Description as ContractIcon,
  LocalShipping as ShipIcon,
  Payment as PaymentIcon,
  Timeline as TimelineIcon,
  Verified as VerifiedIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import api from '@/utils/api';

interface SystemStats {
  exporters: {
    total: number;
    active: number;
    pending: number;
  };
  contracts: {
    total: number;
    active: number;
    completed: number;
  };
  shipments: {
    total: number;
    inTransit: number;
    delivered: number;
  };
  payments: {
    total: number;
    pending: number;
    completed: number;
  };
  auditLogs: {
    total: number;
    blockchainVerified: number;
  };
}

const SystemOverview: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/traceability/system/statistics');

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError('Failed to load system statistics');
      }
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.response?.data?.error || 'Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No statistics available
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          System Overview - Aggregate Statistics
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          Complete overview of CECBS operations and blockchain verification statistics
        </Typography>
      </Paper>

      {/* Main Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Exporters */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <BusinessIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h3" color="primary">
                    {stats.exporters.total}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Total Exporters
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {stats.exporters.active} ({calculatePercentage(stats.exporters.active, stats.exporters.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.exporters.active, stats.exporters.total)}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approval
                  </Typography>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    {stats.exporters.pending} ({calculatePercentage(stats.exporters.pending, stats.exporters.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.exporters.pending, stats.exporters.total)}
                  color="warning"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Contracts */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <ContractIcon sx={{ fontSize: 48, color: 'success.main' }} />
                <Box>
                  <Typography variant="h3" color="success.main">
                    {stats.contracts.total}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Total Contracts
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 'bold' }}>
                    {stats.contracts.active} ({calculatePercentage(stats.contracts.active, stats.contracts.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.contracts.active, stats.contracts.total)}
                  color="info"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {stats.contracts.completed} ({calculatePercentage(stats.contracts.completed, stats.contracts.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.contracts.completed, stats.contracts.total)}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Audit Logs & Blockchain */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <TimelineIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h3" color="warning.main">
                    {stats.auditLogs.total}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Audit Logs
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <VerifiedIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Blockchain Verified
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {stats.auditLogs.blockchainVerified} ({calculatePercentage(stats.auditLogs.blockchainVerified, stats.auditLogs.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.auditLogs.blockchainVerified, stats.auditLogs.total)}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Cryptographic Integrity:</strong> All blockchain-verified logs include complete cryptographic chain (previousStateHash → newStateHash)
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Shipments */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <ShipIcon sx={{ fontSize: 48, color: 'info.main' }} />
                <Box>
                  <Typography variant="h3" color="info.main">
                    {stats.shipments.total}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Total Shipments
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    In Transit
                  </Typography>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    {stats.shipments.inTransit} ({calculatePercentage(stats.shipments.inTransit, stats.shipments.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.shipments.inTransit, stats.shipments.total)}
                  color="warning"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Delivered
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {stats.shipments.delivered} ({calculatePercentage(stats.shipments.delivered, stats.shipments.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.shipments.delivered, stats.shipments.total)}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payments */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <PaymentIcon sx={{ fontSize: 48, color: 'error.main' }} />
                <Box>
                  <Typography variant="h3" color="error.main">
                    {stats.payments.total}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Total Payments
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    {stats.payments.pending} ({calculatePercentage(stats.payments.pending, stats.payments.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.payments.pending, stats.payments.total)}
                  color="warning"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {stats.payments.completed} ({calculatePercentage(stats.payments.completed, stats.payments.total)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={calculatePercentage(stats.payments.completed, stats.payments.total)}
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <TrendingIcon sx={{ fontSize: 48, color: 'white' }} />
                <Box>
                  <Typography variant="h3" sx={{ color: 'white' }}>
                    {calculatePercentage(stats.auditLogs.blockchainVerified, stats.auditLogs.total)}%
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    System Health
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
                <strong>Blockchain Verification Rate:</strong> {calculatePercentage(stats.auditLogs.blockchainVerified, stats.auditLogs.total)}% of all audit logs are cryptographically verified on Hyperledger Fabric
              </Typography>

              <Alert severity="success" sx={{ bgcolor: 'rgba(255,255,255,0.95)' }}>
                <Typography variant="caption">
                  ✅ All critical operations are blockchain-verified with complete audit trail
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Info Banner */}
      <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
        <Typography variant="body2" color="info.contrastText">
          <strong>🔐 TRUE BLOCKCHAIN IMPLEMENTATION:</strong> Every audit action is written to Hyperledger Fabric FIRST with cryptographic signatures (previousStateHash → newStateHash chain), then cached in PostgreSQL for fast queries. Complete traceability from application to delivery.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SystemOverview;
