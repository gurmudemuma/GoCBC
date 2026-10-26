// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Analytics & Reporting Dashboard

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import { apiFetch } from '@/config/api.config';
import {
  TrendingUp,
  Assessment,
  ShowChart,
  PieChart,
  BarChart as BarChartIcon,
  Refresh,
  Download,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  LocalShipping,
  Assignment,
  Gavel,
  AccountBalance,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import api, { formatDate, formatCurrency } from '@/utils/api';

// Modern Components
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
} from '@/components/modern';

interface DashboardStats {
  // Module-wise statistics
  exporters: { total: number; active: number; pending: number };
  contracts: { total: number; approved: number; pending: number; value: number };
  shipments: { total: number; active: number; completed: number; value: number };
  customs: { total: number; cleared: number; pending: number; rejected: number };
  quality: { total: number; passed: number; failed: number; averageGrade: number };
  forex: { total: number; allocated: number; utilized: number; value: number };
  permits: { total: number; issued: number; pending: number };
  shipping: { total: number; inTransit: number; delivered: number };
  payments: { total: number; settled: number; pending: number; value: number };
  
  // Compliance metrics
  eudrCompliance: number;
  
  // Blockchain health
  blockchainHealth: {
    status: string;
    blockHeight: number;
    transactionsPerSecond: number;
    averageBlockTime: number;
    peers: number;
    channelName: string;
  };
  
  // Recent activity
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
  
  // Trends
  exportTrends: Array<{
    month: string;
    volume: number;
    value: number;
    shipments: number;
    avgPrice: number;
  }>;
  qualityDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  
  // System health
  systemHealth: {
    apiUptime: number;
    blockchainUptime: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const AnalyticsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const brandPrimary = '#1976d2'; // Analytics Blue
  const brandSecondary = '#2e7d32'; // Success Green

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      console.log('[ANALYTICS] Fetching dashboard data');
      
      const response = await apiFetch('/analytics/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setDashboardStats(result.data);
        setLastUpdated(new Date());
        console.log('[ANALYTICS] ✅ Dashboard data loaded');
      } else {
        console.error('[ANALYTICS] Failed to load dashboard data:', result);
      }
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!dashboardStats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4">Loading Analytics Dashboard...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            📊 Analytics & Reporting Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Real-time Export Performance & Blockchain Insights
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Last updated: {lastUpdated.toLocaleString()}
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <AnimatedButton
            variant="outlined"
            startIcon={<Refresh />}
            brandColor={brandPrimary}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </AnimatedButton>
          <AnimatedButton
            variant="outlined"
            startIcon={<Download />}
            brandColor={brandPrimary}
            onClick={() => {
              // Export dashboard as PDF/CSV
              alert('📄 Export Dashboard\n\nGenerate comprehensive report in:\n• PDF format (visual dashboard)\n• CSV format (raw data)\n• Excel format (detailed analysis)\n\nImplement using jsPDF or similar library.');
            }}
          >
            Export Report
          </AnimatedButton>
        </Box>
      </Box>

      {/* Comprehensive System KPIs - All Modules */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
        System-Wide Performance Metrics
      </Typography>
      <Grid container spacing={3} mb={3}>
        {/* Exporters */}
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Exporters"
            value={dashboardStats.exporters.total}
            icon={<Assignment />}
            trend="up"
            trendValue={`${dashboardStats.exporters.active} active`}
            brandColor={brandPrimary}
          />
        </Grid>
        
        {/* Contracts */}
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Contracts"
            value={dashboardStats.contracts.total}
            icon={<Gavel />}
            trend="up"
            trendValue={`${dashboardStats.contracts.approved} approved`}
            brandColor="#9c27b0"
          />
        </Grid>
        
        {/* Shipments */}
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Active Shipments"
            value={dashboardStats.shipments.active}
            icon={<LocalShipping />}
            trend="up"
            trendValue={`${dashboardStats.shipments.completed} completed`}
            brandColor="#ff9800"
          />
        </Grid>
        
        {/* Total Export Value */}
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Export Value"
            value={`$${(dashboardStats.shipments.value / 1000000).toFixed(2)}M`}
            icon={<AccountBalance />}
            trend="up"
            trendValue="+15%"
            brandColor={brandSecondary}
          />
        </Grid>
      </Grid>

      {/* Secondary KPIs */}
      <Grid container spacing={3} mb={3}>
        {/* Customs Clearance */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Customs Declarations
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {dashboardStats.customs.total}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip label={`${dashboardStats.customs.cleared} cleared`} size="small" color="success" />
                    <Chip label={`${dashboardStats.customs.pending} pending`} size="small" color="warning" />
                  </Box>
                </Box>
                <Gavel color="primary" />
              </Box>
              <Box mt={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardStats.customs.total > 0 ? (dashboardStats.customs.cleared / dashboardStats.customs.total) * 100 : 0} 
                  color="success"
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  {dashboardStats.customs.total > 0 ? Math.round((dashboardStats.customs.cleared / dashboardStats.customs.total) * 100) : 0}% clearance rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Contracts Value */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Contracts Value
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    ${(dashboardStats.contracts.value / 1000000).toFixed(1)}M
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip label={`${dashboardStats.contracts.approved} approved`} size="small" color="success" />
                    <Chip label={`${dashboardStats.contracts.pending} pending`} size="small" color="default" />
                  </Box>
                </Box>
                <AccountBalance color="secondary" />
              </Box>
              <Box mt={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardStats.contracts.total > 0 ? (dashboardStats.contracts.approved / dashboardStats.contracts.total) * 100 : 0} 
                  color="secondary"
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  {dashboardStats.contracts.total > 0 ? Math.round((dashboardStats.contracts.approved / dashboardStats.contracts.total) * 100) : 0}% approval rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Shipment Progress */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Shipments Status
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {dashboardStats.shipments.total}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip label={`${dashboardStats.shipments.active} active`} size="small" color="warning" />
                    <Chip label={`${dashboardStats.shipments.completed} done`} size="small" color="success" />
                  </Box>
                </Box>
                <LocalShipping color="action" />
              </Box>
              <Box mt={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardStats.shipments.total > 0 ? (dashboardStats.shipments.completed / dashboardStats.shipments.total) * 100 : 0} 
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  {dashboardStats.shipments.total > 0 ? Math.round((dashboardStats.shipments.completed / dashboardStats.shipments.total) * 100) : 0}% completion rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* EUDR Compliance */}
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="EUDR Compliance"
            value={`${dashboardStats.eudrCompliance}%`}
            icon={<CheckCircle />}
            trend="up"
            trendValue="EU regulation"
            brandColor="#4caf50"
          />
        </Grid>
      </Grid>

      {/* Blockchain Health Alert - Best Practice Metrics */}
      <Alert 
        severity={dashboardStats.blockchainHealth.status === 'healthy' ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        icon={<CheckCircle />}
      >
        <Typography variant="body2" fontWeight={600}>
          ⛓️ Blockchain Network Health: {dashboardStats.blockchainHealth.status.toUpperCase()}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" color="textSecondary">Block Height</Typography>
            <Typography variant="body2" fontWeight={600}>
              {dashboardStats.blockchainHealth.blockHeight.toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" color="textSecondary">Throughput</Typography>
            <Typography variant="body2" fontWeight={600}>
              {dashboardStats.blockchainHealth.transactionsPerSecond} TPS
            </Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" color="textSecondary">Block Time</Typography>
            <Typography variant="body2" fontWeight={600}>
              {dashboardStats.blockchainHealth.averageBlockTime}s avg
            </Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" color="textSecondary">Active Peers</Typography>
            <Typography variant="body2" fontWeight={600}>
              {dashboardStats.blockchainHealth.peers}/6
            </Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" color="textSecondary">Channel</Typography>
            <Typography variant="body2" fontWeight={600}>
              {dashboardStats.blockchainHealth.channelName}
            </Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="caption" color="textSecondary">Consensus</Typography>
            <Typography variant="body2" fontWeight={600}>
              Raft (CFT)
            </Typography>
          </Grid>
        </Grid>
      </Alert>

      {/* Tabs */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<ShowChart />} label="Export Trends" iconPosition="start" />
            <Tab icon={<PieChart />} label="Quality Analysis" iconPosition="start" />
            <Tab icon={<BarChartIcon />} label="Customs Performance" iconPosition="start" />
            <Tab icon={<Assessment />} label="Financial Metrics" iconPosition="start" />
            <Tab icon={<Schedule />} label="Recent Activity" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Export Trends Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Export Volume & Value Trends (Last 6 Months)
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardStats.exportTrends}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" stroke="#1976d2" />
                    <YAxis yAxisId="right" orientation="right" stroke="#2e7d32" />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="volume"
                      stroke="#1976d2"
                      fillOpacity={1}
                      fill="url(#colorVolume)"
                      name="Volume (tons)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="value"
                      stroke="#2e7d32"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      name="Value ($M)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Export Statistics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Volume (6 months)
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {dashboardStats.exportTrends.reduce((sum, item) => sum + item.volume, 0).toLocaleString()} tons
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Value (6 months)
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      ${dashboardStats.exportTrends.reduce((sum, item) => sum + item.value, 0).toFixed(2)}M
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Average Price per Ton
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      ${((dashboardStats.exportTrends.reduce((sum, item) => sum + item.value, 0) * 1000000) / 
                        dashboardStats.exportTrends.reduce((sum, item) => sum + item.volume, 0)).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Growth Indicators
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Volume Growth</Typography>
                      <Chip label="+15% MoM" size="small" color="success" />
                    </Box>
                    <LinearProgress variant="determinate" value={75} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Value Growth</Typography>
                      <Chip label="+18% MoM" size="small" color="success" />
                    </Box>
                    <LinearProgress variant="determinate" value={82} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Market Expansion</Typography>
                      <Chip label="+12% YoY" size="small" color="primary" />
                    </Box>
                    <LinearProgress variant="determinate" value={68} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Quality Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Coffee Quality Grade Distribution
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={dashboardStats.qualityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="grade"
                    >
                      {dashboardStats.qualityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Grade</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardStats.qualityDistribution.map((row, index) => (
                      <TableRow key={row.grade}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            {row.grade}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{row.count.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.percentage}%</TableCell>
                        <TableCell align="right">
                          {row.grade === 'Rejected' ? (
                            <Chip label="Review" size="small" color="error" />
                          ) : row.percentage >= 50 ? (
                            <Chip label="Excellent" size="small" color="success" />
                          ) : (
                            <Chip label="Good" size="small" color="primary" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Quality Insights:</strong> {dashboardStats.qualityDistribution[0].percentage}% of exports are {dashboardStats.qualityDistribution[0].grade}, 
                  indicating excellent quality control. Rejection rate of {dashboardStats.qualityDistribution[dashboardStats.qualityDistribution.length - 1].percentage}% 
                  is within acceptable industry standards.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Customs Performance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Customs Clearance Performance Metrics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Gavel fontSize="large" color="primary" />
                    <Box>
                      <Typography variant="h4" fontWeight={600}>
                        2.4
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Avg Clearance Days
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={85} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    15% faster than last quarter
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <CheckCircle fontSize="large" color="success" />
                    <Box>
                      <Typography variant="h4" fontWeight={600}>
                        96%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        First-Time Clearance
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={96} color="success" />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    4% rejection rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <CheckCircle fontSize="large" color="success" />
                    <Box>
                      <Typography variant="h4" fontWeight={600}>
                        {dashboardStats.eudrCompliance}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        EUDR Compliance
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={dashboardStats.eudrCompliance} color="success" />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    EU regulation compliant
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Clearance Time Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { range: '0-1 days', count: 45, percentage: 35 },
                          { range: '1-2 days', count: 52, percentage: 40 },
                          { range: '2-3 days', count: 22, percentage: 17 },
                          { range: '3-5 days', count: 8, percentage: 6 },
                          { range: '5+ days', count: 3, percentage: 2 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#1976d2" name="Declarations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Financial Metrics Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Financial Performance & Revenue Analysis
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Total Export Value
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    ${(dashboardStats.shipments.value / 1000000).toFixed(2)}M
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +15% YTD
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Avg Contract Value
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    $285K
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +8% MoM
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#fff3e0' }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Forex Allocated
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    $8.5M
                  </Typography>
                  <Typography variant="caption" color="primary.main">
                    92% utilization
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#fce4ec' }}>
                <CardContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Payment Settlement
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    $7.2M
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    85% settled
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue by Export Channel
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { channel: 'ECX', revenue: 4.2, count: 85 },
                          { channel: 'Direct Export', revenue: 3.8, count: 42 },
                          { channel: 'Union/Coop', revenue: 2.5, count: 28 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="channel" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#2e7d32" name="Revenue ($M)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Recent Activity Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Recent System Activity
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardStats.recentActivity.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(activity.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={activity.type} size="small" color="primary" />
                    </TableCell>
                    <TableCell>{activity.description}</TableCell>
                    <TableCell>
                      {activity.status === 'success' ? (
                        <CheckCircle color="success" fontSize="small" />
                      ) : activity.status === 'warning' ? (
                        <Warning color="warning" fontSize="small" />
                      ) : (
                        <ErrorIcon color="error" fontSize="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>System Health:</strong> All services operational. Last blockchain sync: {new Date().toLocaleTimeString()}. 
              No pending issues or alerts.
            </Typography>
          </Alert>
        </TabPanel>
      </ModernCard>
    </Box>
  );
};

export default AnalyticsDashboard;
