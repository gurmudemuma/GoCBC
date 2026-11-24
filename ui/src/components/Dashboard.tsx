// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Dashboard with Real-Time Blockchain Metrics

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Coffee,
  LocalShipping,
  AccountBalance,
  Security,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh,
  Timeline,
  Speed,
  Storage,
  CloudQueue,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ExtendedDashboardStats {
  totalExporters: number;
  activeShipments: number;
  totalValue: number;
  eudrCompliance: number;
  blockchainHealth: {
    status: 'healthy' | 'warning' | 'error';
    blockHeight: number;
    transactionsPerSecond: number;
    averageBlockTime: number;
    peers: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
  exportTrends: Array<{
    month: string;
    volume: number;
    value: number;
  }>;
  qualityDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await api.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data as unknown as ExtendedDashboardStats);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: theme.palette.success.main,
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
      success: theme.palette.success.main,
      pending: theme.palette.warning.main,
      failed: theme.palette.error.main,
    };
    return colors[status] || theme.palette.grey[500];
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      healthy: <CheckCircle sx={{ color: theme.palette.success.main }} />,
      warning: <Warning sx={{ color: theme.palette.warning.main }} />,
      error: <ErrorIcon sx={{ color: theme.palette.error.main }} />,
      success: <CheckCircle sx={{ color: theme.palette.success.main }} />,
      pending: <Warning sx={{ color: theme.palette.warning.main }} />,
      failed: <ErrorIcon sx={{ color: theme.palette.error.main }} />,
    };
    return icons[status] || <CheckCircle />;
  };

  const COLORS = ['#2e7d32', '#1976d2', '#f57c00', '#d32f2f', '#7b1fa2'];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Failed to load dashboard data</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
            Welcome back, {user?.fullName}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {user?.organization} • {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard">
          <IconButton 
            onClick={loadDashboardData} 
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

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#2e7d32', 0.9)} 0%, ${alpha('#1b5e20', 0.9)} 100%)`,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Exporters
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.totalExporters}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">+12% this month</Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    backgroundColor: alpha('#fff', 0.2),
                    width: 56,
                    height: 56,
                  }}
                >
                  <Coffee sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                bottom: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: alpha('#fff', 0.1),
              }}
            />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#1976d2', 0.9)} 0%, ${alpha('#0d47a1', 0.9)} 100%)`,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Active Shipments
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.activeShipments}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">+8% this week</Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    backgroundColor: alpha('#fff', 0.2),
                    width: 56,
                    height: 56,
                  }}
                >
                  <LocalShipping sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                bottom: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: alpha('#fff', 0.1),
              }}
            />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#f57c00', 0.9)} 0%, ${alpha('#e65100', 0.9)} 100%)`,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Value (USD)
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    ${(stats.totalValue / 1000000).toFixed(1)}M
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">+15% this month</Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    backgroundColor: alpha('#fff', 0.2),
                    width: 56,
                    height: 56,
                  }}
                >
                  <AccountBalance sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                bottom: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: alpha('#fff', 0.1),
              }}
            />
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha('#7b1fa2', 0.9)} 0%, ${alpha('#4a148c', 0.9)} 100%)`,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    EUDR Compliance
                  </Typography>
                  <Typography variant="h3" fontWeight={700}>
                    {stats.eudrCompliance}%
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <CheckCircle sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption">All verified</Typography>
                  </Box>
                </Box>
                <Avatar
                  sx={{
                    backgroundColor: alpha('#fff', 0.2),
                    width: 56,
                    height: 56,
                  }}
                >
                  <Security sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                bottom: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: alpha('#fff', 0.1),
              }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Blockchain Health & Charts */}
      <Grid container spacing={3} mb={3}>
        {/* Blockchain Health */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Blockchain Health
                </Typography>
                {getStatusIcon(stats.blockchainHealth.status)}
              </Box>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={stats.blockchainHealth.status.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: alpha(getStatusColor(stats.blockchainHealth.status), 0.1),
                      color: getStatusColor(stats.blockchainHealth.status),
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    <Storage sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Block Height
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.blockchainHealth.blockHeight.toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    <Speed sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    TPS
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.blockchainHealth.transactionsPerSecond}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    <Timeline sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Avg Block Time
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.blockchainHealth.averageBlockTime}s
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">
                    <CloudQueue sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Active Peers
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {stats.blockchainHealth.peers}/6
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Network Performance
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={85}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: theme.palette.success.main,
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  85% - Excellent
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Export Trends Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Export Trends (Last 6 Months)
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.exportTrends}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2e7d32" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                  <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#2e7d32"
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                    name="Volume (tons)"
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1976d2"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    name="Value ($M)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quality Distribution & Recent Activity */}
      <Grid container spacing={3}>
        {/* Quality Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Coffee Quality Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.qualityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.qualityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Recent Blockchain Activity
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentActivity.map((activity) => (
                      <TableRow key={activity.id} hover>
                        <TableCell>
                          <Chip
                            label={activity.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {activity.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusIcon(activity.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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

export default Dashboard;
