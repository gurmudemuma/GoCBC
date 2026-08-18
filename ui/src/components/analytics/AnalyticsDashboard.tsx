// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Analytics Dashboard - Business Intelligence & Reporting

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Download,
  DateRange,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch, getAuthHeaders } from '@/config/api.config';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, color = '#1976d2' }) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color }}>
            {value}
          </Typography>
          {change && (
            <Typography variant="caption" color={parseFloat(change) >= 0 ? 'success.main' : 'error.main'}>
              {change}% vs last period
            </Typography>
          )}
        </Box>
        <Box sx={{ color, opacity: 0.6 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const COLORS = ['#1976d2', '#dc004e', '#ff9800', '#4caf50', '#9c27b0', '#00bcd4'];

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('contracts');
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  useEffect(() => {
    loadTimeSeriesData();
  }, [selectedMetric, timePeriod, dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dateFrom = getDateFrom(dateRange);
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);

      const response = await apiFetch(`/analytics/dashboard?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      if (data.success) {
        setKpis(data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSeriesData = async () => {
    try {
      const dateFrom = getDateFrom(dateRange);
      const params = new URLSearchParams();
      params.append('period', timePeriod);
      if (dateFrom) params.append('dateFrom', dateFrom);

      const response = await apiFetch(`/analytics/timeseries/${selectedMetric}?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      if (data.success) {
        setTimeSeriesData(data.data);
      }
    } catch (error) {
      console.error('Error loading time series data:', error);
    }
  };

  const getDateFrom = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '7days':
        now.setDate(now.getDate() - 7);
        break;
      case '30days':
        now.setDate(now.getDate() - 30);
        break;
      case '90days':
        now.setDate(now.getDate() - 90);
        break;
      case '1year':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return '';
    }
    return now.toISOString().split('T')[0];
  };

  const exportReport = async (format: 'json' | 'csv') => {
    try {
      const dateFrom = getDateFrom(dateRange);
      const params = new URLSearchParams();
      params.append('format', format);
      if (dateFrom) params.append('dateFrom', dateFrom);

      const response = await fetch(`http://localhost:3001/api/v1/analytics/export-report?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading && !kpis) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
              <MenuItem value="1year">Last Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportReport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => exportReport('json')}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Trends" />
        <Tab label="Breakdown" />
      </Tabs>

      {/* Tab 0: Overview - KPI Cards */}
      {activeTab === 0 && kpis && (
        <Box>
          {/* ECTA KPIs */}
          {kpis.applications && (
            <>
              <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>ECTA - Applications & Approvals</Typography>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Total Applications"
                    value={kpis.applications.total}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#1976d2"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Pending Review"
                    value={kpis.applications.pending}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#ff9800"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Approved"
                    value={kpis.applications.approved}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#4caf50"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Avg Processing Days"
                    value={kpis.applications.avgProcessingDays}
                    icon={<DateRange sx={{ fontSize: 40 }} />}
                    color="#9c27b0"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* Banks KPIs */}
          {kpis.lcs && (
            <>
              <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Banks - LC & Forex</Typography>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Letters of Credit"
                    value={kpis.lcs.total}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#1976d2"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="LC Amount (USD)"
                    value={`$${(kpis.lcs.totalAmount / 1000000).toFixed(1)}M`}
                    icon={<TrendingUp sx={{ fontSize: 40 }} />}
                    color="#4caf50"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Forex Allocated"
                    value={kpis.forex.total}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#ff9800"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Avg Retention"
                    value={`${kpis.forex.avgRetention}%`}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#9c27b0"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* NBE KPIs */}
          {kpis.forexCompliance && (
            <>
              <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>NBE - Forex Compliance</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Total Forex (USD)"
                    value={`$${(kpis.forexCompliance.totalForex / 1000000).toFixed(1)}M`}
                    icon={<TrendingUp sx={{ fontSize: 40 }} />}
                    color="#1976d2"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Retention Rate"
                    value={`${kpis.forexCompliance.avgRetentionRate}%`}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#9c27b0"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Retained (USD)"
                    value={`$${(kpis.forexCompliance.totalRetained / 1000000).toFixed(1)}M`}
                    icon={<TrendingUp sx={{ fontSize: 40 }} />}
                    color="#ff9800"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KPICard
                    title="Compliance Rate"
                    value={`${kpis.forexCompliance.complianceRate}%`}
                    icon={<Assessment sx={{ fontSize: 40 }} />}
                    color="#4caf50"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      )}

      {/* Tab 1: Trends - Time Series Charts */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <MenuItem value="contracts">Contracts</MenuItem>
                <MenuItem value="shipments">Shipments</MenuItem>
                <MenuItem value="payments">Payments</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Group By</InputLabel>
              <Select
                value={timePeriod}
                label="Group By"
                onChange={(e) => setTimePeriod(e.target.value as any)}
              >
                <MenuItem value="day">Daily</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} name="Count" />
                  <Line type="monotone" dataKey="totalValue" stroke="#4caf50" strokeWidth={2} name="Total Value" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 2: Breakdown - Pie Charts */}
      {activeTab === 2 && kpis && kpis.paymentMethods && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Methods Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={kpis.paymentMethods}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {kpis.paymentMethods.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Methods by Value (USD)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpis.paymentMethods}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalValue" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
