// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Real-Time Blockchain Network Monitor

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh,
  Storage,
  Speed,
  Timeline,
  CloudQueue,
  Router as RouterIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import api from '@/utils/api';

interface BlockchainStats {
  status: string;
  blockHeight: number;
  transactionsTotal: number;
  transactionsToday: number;
  averageBlockTime: number;
  peers: number;
  orderers: number;
  channelName: string;
  network: {
    channelName: string;
    peers: Array<{ name: string; url: string }>;
    orderers: Array<{ name: string; url: string }>;
  };
}

const BlockchainMonitor: React.FC = () => {
  const theme = useTheme();
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBlockchainStats();
    const interval = setInterval(loadBlockchainStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadBlockchainStats = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/analytics/blockchain');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load blockchain stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'warning':
        return <Warning sx={{ color: theme.palette.warning.main }} />;
      case 'error':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <CheckCircle />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Typography>Failed to load blockchain statistics</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" fontWeight={700}>
            Blockchain Network Monitor
          </Typography>
          <Chip
            icon={getStatusIcon(stats.status)}
            label={stats.status.toUpperCase()}
            sx={{
              backgroundColor: alpha(getStatusColor(stats.status), 0.1),
              color: getStatusColor(stats.status),
              fontWeight: 600,
            }}
          />
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={loadBlockchainStats}
            disabled={refreshing}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <Refresh className={refreshing ? 'rotating' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Network Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#2e7d32', 0.1)} 0%, ${alpha('#1b5e20', 0.05)} 100%)`,
              border: `1px solid ${alpha('#2e7d32', 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Block Height
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#2e7d32">
                    {stats.blockHeight.toLocaleString()}
                  </Typography>
                </Box>
                <Storage sx={{ fontSize: 40, color: '#2e7d32', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#1976d2', 0.1)} 0%, ${alpha('#0d47a1', 0.05)} 100%)`,
              border: `1px solid ${alpha('#1976d2', 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Total Transactions
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#1976d2">
                    {stats.transactionsTotal.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    +{stats.transactionsToday} today
                  </Typography>
                </Box>
                <Timeline sx={{ fontSize: 40, color: '#1976d2', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#f57c00', 0.1)} 0%, ${alpha('#e65100', 0.05)} 100%)`,
              border: `1px solid ${alpha('#f57c00', 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Avg Block Time
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#f57c00">
                    {stats.averageBlockTime}s
                  </Typography>
                </Box>
                <Speed sx={{ fontSize: 40, color: '#f57c00', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#7b1fa2', 0.1)} 0%, ${alpha('#4a148c', 0.05)} 100%)`,
              border: `1px solid ${alpha('#7b1fa2', 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Network Nodes
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#7b1fa2">
                    {stats.peers + stats.orderers}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.peers} peers, {stats.orderers} orderer
                  </Typography>
                </Box>
                <CloudQueue sx={{ fontSize: 40, color: '#7b1fa2', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Network Topology */}
      <Grid container spacing={3}>
        {/* Peer Nodes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <RouterIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Peer Nodes
                </Typography>
                <Chip
                  label={`${stats.peers} Active`}
                  size="small"
                  color="success"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.network.peers.map((peer, index) => {
                      const orgName = peer.name.split('.')[1].toUpperCase();
                      return (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinkIcon fontSize="small" color="action" />
                              <Typography variant="body2" fontWeight={600}>
                                {orgName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="textSecondary">
                              {peer.url}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <CheckCircle fontSize="small" color="success" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Orderer Nodes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Storage color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Orderer Nodes
                </Typography>
                <Chip
                  label={`${stats.orderers} Active`}
                  size="small"
                  color="success"
                  sx={{ ml: 'auto' }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Node</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.network.orderers.map((orderer, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinkIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={600}>
                              {orderer.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {orderer.url}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <CheckCircle fontSize="small" color="success" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Channel Info */}
              <Box mt={3} p={2} sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Channel Name
                </Typography>
                <Typography variant="h6" fontWeight={600} color="primary">
                  {stats.network.channelName}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <style jsx global>{`
        @keyframes rotating {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .rotating {
          animation: rotating 1s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default BlockchainMonitor;
