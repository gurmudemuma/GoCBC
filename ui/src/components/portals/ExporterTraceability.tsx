// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Complete Exporter Traceability Dashboard
// Shows full lifecycle: Application → ECTA Review → Blockchain Registration → Active Trading

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Error as ErrorIcon,
  LocalShipping as ShipIcon,
  Description as ContractIcon,
  Assessment as StatsIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import api from '@/utils/api';

interface TraceabilityStage {
  stage: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
  performer?: string;
  organization?: string;
  blockchainTxId?: string;
  details: any;
  auditLogs: any[];
}

interface ContractTrace {
  contractId: string;
  status: string;
  buyer: string;
  buyerCountry: string;
  quantity: number;
  value: number;
  currency: string;
  createdAt: string;
  blockchainVerified: boolean;
}

interface TraceabilityData {
  exporterId: string;
  exporterName: string;
  status: string;
  currentStage: string;
  progress: number;
  stages: TraceabilityStage[];
  contracts: ContractTrace[];
  overallMetrics: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    totalValue: number;
    currency: string;
  };
}

interface ExporterTraceabilityProps {
  exporterId: string;
}

const ExporterTraceability: React.FC<ExporterTraceabilityProps> = ({ exporterId }) => {
  const [traceability, setTraceability] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTraceability();
  }, [exporterId]);

  const fetchTraceability = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/traceability/exporter/${exporterId}`);

      if (response.data.success) {
        setTraceability(response.data.data);
      } else {
        setError('Failed to load traceability data');
      }
    } catch (err: any) {
      console.error('Error fetching traceability:', err);
      setError(err.response?.data?.error || 'Failed to load traceability data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'IN_PROGRESS':
        return <HourglassIcon sx={{ color: 'warning.main' }} />;
      case 'FAILED':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <HourglassIcon sx={{ color: 'grey.400' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatStageName = (stage: string): string => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!traceability) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No traceability data available
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          Complete Exporter Traceability
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
          {traceability.exporterName} ({traceability.exporterId})
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            label={`Status: ${traceability.status.toUpperCase()}`}
            color={traceability.status === 'approved' ? 'success' : 'warning'}
            sx={{ color: 'white', fontWeight: 'bold' }}
          />
          <Chip
            label={`Current Stage: ${formatStageName(traceability.currentStage)}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
          />
        </Stack>
      </Paper>

      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overall Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 2 }}>
              <LinearProgress
                variant="determinate"
                value={traceability.progress}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
              {traceability.progress}%
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {traceability.stages.filter((s) => s.status === 'COMPLETED').length} of{' '}
            {traceability.stages.length} stages completed
          </Typography>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <ContractIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {traceability.overallMetrics.totalContracts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Contracts
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <ShipIcon sx={{ fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {traceability.overallMetrics.activeContracts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Contracts
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'info.main' }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {traceability.overallMetrics.completedContracts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <StatsIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    ${traceability.overallMetrics.totalValue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Value ({traceability.overallMetrics.currency})
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lifecycle Stages Timeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <VerifiedIcon sx={{ mr: 1 }} />
            Lifecycle Stages
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stepper orientation="vertical">
            {traceability.stages.map((stage, index) => (
              <Step key={index} active={true} completed={stage.status === 'COMPLETED'}>
                <StepLabel
                  StepIconComponent={() => getStatusIcon(stage.status)}
                  error={stage.status === 'FAILED'}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {formatStageName(stage.stage)}
                    </Typography>
                    <Chip
                      label={stage.status}
                      size="small"
                      color={getStatusColor(stage.status) as any}
                    />
                    {stage.blockchainTxId && (
                      <Chip
                        icon={<VerifiedIcon />}
                        label="Blockchain Verified"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ pl: 2, pb: 2 }}>
                    {stage.completedAt && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Completed:</strong> {formatDate(stage.completedAt)}
                      </Typography>
                    )}
                    {stage.performer && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Performer:</strong> {stage.performer} ({stage.organization})
                      </Typography>
                    )}
                    {stage.blockchainTxId && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        <strong>Blockchain TX:</strong> {stage.blockchainTxId.substring(0, 20)}...
                      </Typography>
                    )}
                    {stage.details && Object.keys(stage.details).length > 0 && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Details:</strong>
                        </Typography>
                        <pre style={{ fontSize: '11px', margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(stage.details, null, 2)}
                        </pre>
                      </Box>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      {traceability.contracts.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contracts ({traceability.contracts.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contract ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell align="right">Quantity (kg)</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Verification</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traceability.contracts.map((contract) => (
                    <TableRow key={contract.contractId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {contract.contractId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={contract.status} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>{contract.buyer}</TableCell>
                      <TableCell>{contract.buyerCountry}</TableCell>
                      <TableCell align="right">{contract.quantity.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {contract.value.toLocaleString()} {contract.currency}
                      </TableCell>
                      <TableCell>{formatDate(contract.createdAt)}</TableCell>
                      <TableCell>
                        {contract.blockchainVerified ? (
                          <Chip
                            icon={<VerifiedIcon />}
                            label="Verified"
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Chip label="Pending" size="small" color="default" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {traceability.contracts.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No contracts found for this exporter yet.
        </Alert>
      )}
    </Box>
  );
};

export default ExporterTraceability;
