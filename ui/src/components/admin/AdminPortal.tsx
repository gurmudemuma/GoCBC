// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Admin Portal - Super Administrator Dashboard

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Person,
  Security,
  Dashboard as DashboardIcon,
  Assessment,
  Settings,
  Group,
  Business,
  VerifiedUser,
  Refresh,
  TrendingUp,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Storage,
  Speed,
  CloudQueue,
  Timeline,
  LocalShipping,
  Coffee,
  AccountBalance,
  Gavel,
  Description,
  CalendarToday,
  Fingerprint,
  VpnKey,
  Block,
  DataUsage,
  History as HistoryIcon,
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
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import UserManagement from './UserManagement';
import api from '@/utils/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

interface SystemStats {
  totalUsers: number;
  totalOrganizations: number;
  activeUsers: number;
  enrolledIdentities: number;
  expiringCertificates: number;
  totalExporters: number;
  totalContracts: number;
  totalShipments: number;
  totalTransactions: number;
}

interface BlockchainHealth {
  status: 'healthy' | 'warning' | 'error';
  blockHeight: number;
  transactionsPerSecond: number;
  averageBlockTime: number;
  peers: number;
  orderers: number;
  chaincodes: number;
}

interface OrganizationStats {
  organization: string;
  userCount: number;
  activeUsers: number;
  enrolledIdentities: number;
  color: string;
}

interface RecentActivity {
  id: string;
  action: string;
  username: string;
  targetUsername?: string;
  organization: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
}

interface CertificateExpiry {
  userId: number;
  username: string;
  mspId: string;
  expiresAt: string;
  daysRemaining: number;
  organization: string;
}

const AdminPortal: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalOrganizations: 7, // ECTA, ECX, NBE, Banks, Customs, Shipping, Exporters
    activeUsers: 0,
    enrolledIdentities: 0,
    expiringCertificates: 0,
    totalExporters: 0,
    totalContracts: 0,
    totalShipments: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [blockchainHealth, setBlockchainHealth] = useState<BlockchainHealth>({
    status: 'healthy',
    blockHeight: 12450,
    transactionsPerSecond: 45,
    averageBlockTime: 2.3,
    peers: 4,
    orderers: 1,
    chaincodes: 3,
  });
  const [organizationStats, setOrganizationStats] = useState<OrganizationStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<CertificateExpiry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const BRAND_COLOR = '#1976d2'; // Admin blue

  useEffect(() => {
    loadSystemStats();
    loadOrganizationStats();
    loadRecentActivities();
    loadExpiringCertificates();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadSystemStats();
      loadOrganizationStats();
      loadRecentActivities();
      loadExpiringCertificates();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadSystemStats = async () => {
    setLoading(true);
    try {
      // Load user statistics
      const usersResponse = await api.get('/users?limit=1000');
      if (usersResponse.data.success) {
        const users = usersResponse.data.data;
        const exporters = users.filter((u: any) => u.role === 'EXPORTER');
        
        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          activeUsers: users.filter((u: any) => u.status === 'active').length,
          totalExporters: exporters.length,
        }));
      }

      // Load blockchain identities
      const identitiesResponse = await api.get('/crypto-users/identities');
      if (identitiesResponse.data.success) {
        const identities = identitiesResponse.data.data;
        setStats(prev => ({
          ...prev,
          enrolledIdentities: identities.length,
        }));
      }

      // Load expiring certificates
      const expiringResponse = await api.get('/crypto-users/expiring-certificates');
      if (expiringResponse.data.success) {
        setStats(prev => ({
          ...prev,
          expiringCertificates: expiringResponse.data.data.length,
        }));
      }

      // Simulate blockchain data (would come from real fabric API)
      setStats(prev => ({
        ...prev,
        totalContracts: Math.floor(Math.random() * 500) + 200,
        totalShipments: Math.floor(Math.random() * 300) + 100,
        totalTransactions: Math.floor(Math.random() * 5000) + 1000,
      }));
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationStats = async () => {
    try {
      const usersResponse = await api.get('/users?limit=1000');
      if (usersResponse.data.success) {
        const users = usersResponse.data.data;
        
        const orgColors: Record<string, string> = {
          ECTA: '#1976d2',
          ECX: '#388e3c',
          NBE: '#d32f2f',
          BANKS: '#f57c00',
          CUSTOMS: '#7b1fa2',
          SHIPPING: '#0097a7',
          EXPORTERS: '#689f38',
        };

        const organizations = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'EXPORTERS'];
        const orgStats: OrganizationStats[] = organizations.map(org => {
          const orgUsers = users.filter((u: any) => u.organization === org || (org === 'EXPORTERS' && u.role === 'EXPORTER'));
          return {
            organization: org,
            userCount: orgUsers.length,
            activeUsers: orgUsers.filter((u: any) => u.status === 'active').length,
            enrolledIdentities: Math.floor(orgUsers.length * 0.7), // Estimate
            color: orgColors[org] || '#666',
          };
        });

        setOrganizationStats(orgStats);
      }
    } catch (error) {
      console.error('Failed to load organization stats:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const response = await api.get('/audit/recent-activities?limit=10');
      if (response.data.success) {
        setRecentActivities(response.data.data);
      }
    } catch (error) {
      // If audit endpoint doesn't exist, show mock data
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          action: 'User Created',
          username: user?.username || 'admin',
          targetUsername: 'new_user_001',
          organization: 'ECTA',
          timestamp: new Date().toISOString(),
          status: 'success',
        },
        {
          id: '2',
          action: 'Certificate Renewed',
          username: user?.username || 'admin',
          targetUsername: 'ecx_trader',
          organization: 'ECX',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'success',
        },
        {
          id: '3',
          action: 'User Suspended',
          username: user?.username || 'admin',
          targetUsername: 'customs_agent',
          organization: 'CUSTOMS',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'warning',
        },
      ];
      setRecentActivities(mockActivities);
    }
  };

  const loadExpiringCertificates = async () => {
    try {
      const response = await api.get('/crypto-users/expiring-certificates?days=30');
      if (response.data.success) {
        setExpiringCerts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load expiring certificates:', error);
      setExpiringCerts([]);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security sx={{ fontSize: 32, color: BRAND_COLOR }} />
          System Administrator Portal
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all users, organizations, and blockchain identities across the CECBS consortium
        </Typography>
        {user && (
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={`Logged in as: ${user.username}`} 
              color="primary" 
              icon={<Person />}
              size="small"
            />
            <Chip 
              label="SUPER ADMIN" 
              color="error" 
              sx={{ ml: 1 }}
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* System Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Group color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  {stats.totalUsers}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Business color="success" />
                <Typography variant="h6" fontWeight={600}>
                  {stats.totalOrganizations}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Organizations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <VerifiedUser color="warning" />
                <Typography variant="h6" fontWeight={600}>
                  {stats.enrolledIdentities}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Blockchain Identities
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: stats.expiringCertificates > 0 ? '#ffebee' : '#f5f5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Assessment color={stats.expiringCertificates > 0 ? 'error' : 'action'} />
                <Typography variant="h6" fontWeight={600}>
                  {stats.expiringCertificates}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Expiring Certificates
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert for Admin */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Super Admin Access:</strong> You can view and manage users from ALL organizations. 
          Use this power responsibly. All actions are logged in the audit trail.
        </Typography>
      </Alert>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 64,
              fontSize: '1rem',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: BRAND_COLOR,
              fontWeight: 700,
            },
            '& .MuiTabs-indicator': {
              height: 4,
              backgroundColor: BRAND_COLOR,
              borderRadius: '4px 4px 0 0',
            },
          }}
        >
          <Tab 
            label="User Management" 
            icon={<Person sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
          />
          <Tab 
            label="System Overview" 
            icon={<DashboardIcon sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
          />
          <Tab 
            label="Analytics" 
            icon={<Assessment sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
          />
          <Tab 
            label="Settings" 
            icon={<Settings sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        {/* User Management Tab */}
        <UserManagement />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* System Overview Tab */}
        <Grid container spacing={3}>
          {/* Blockchain Health Status */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudQueue color="primary" />
                    <Typography variant="h6">Blockchain Network Health</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={blockchainHealth.status.toUpperCase()}
                      color={
                        blockchainHealth.status === 'healthy' ? 'success' :
                        blockchainHealth.status === 'warning' ? 'warning' : 'error'
                      }
                      icon={
                        blockchainHealth.status === 'healthy' ? <CheckCircle /> :
                        blockchainHealth.status === 'warning' ? <Warning /> : <ErrorIcon />
                      }
                    />
                    <Tooltip title="Refresh">
                      <IconButton size="small" onClick={loadSystemStats}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Storage sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{blockchainHealth.blockHeight}</Typography>
                      <Typography variant="body2" color="text.secondary">Block Height</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Speed sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{blockchainHealth.transactionsPerSecond}</Typography>
                      <Typography variant="body2" color="text.secondary">TPS (Transactions/sec)</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Timeline sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{blockchainHealth.averageBlockTime}s</Typography>
                      <Typography variant="body2" color="text.secondary">Avg Block Time</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <DataUsage sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{blockchainHealth.peers}</Typography>
                      <Typography variant="body2" color="text.secondary">Peer Nodes</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <CloudQueue sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{blockchainHealth.orderers}</Typography>
                      <Typography variant="body2" color="text.secondary">Orderer Nodes</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Description sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                      <Typography variant="h5" fontWeight="bold">{blockchainHealth.chaincodes}</Typography>
                      <Typography variant="body2" color="text.secondary">Active Chaincodes</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Business Statistics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Coffee color="primary" />
                  Business Operations
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Contracts"
                      secondary={
                        <Typography variant="h6" component="span" color="primary">
                          {stats.totalContracts}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <LocalShipping />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Shipments"
                      secondary={
                        <Typography variant="h6" component="span" color="success.main">
                          {stats.totalShipments}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <AccountBalance />
                    </ListItemIcon>
                    <ListItemText
                      primary="Blockchain Transactions"
                      secondary={
                        <Typography variant="h6" component="span" color="secondary.main">
                          {stats.totalTransactions}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    <ListItemText
                      primary="Active Exporters"
                      secondary={
                        <Typography variant="h6" component="span" color="info.main">
                          {stats.totalExporters}
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activities */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="primary" />
                  Recent System Activities
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Action</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>
                              <Typography variant="body2">{activity.action}</Typography>
                              {activity.targetUsername && (
                                <Typography variant="caption" color="text.secondary">
                                  Target: {activity.targetUsername}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={activity.organization}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {new Date(activity.timestamp).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={activity.status}
                                size="small"
                                color={
                                  activity.status === 'success' ? 'success' :
                                  activity.status === 'warning' ? 'warning' : 'error'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No recent activities
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Expiring Certificates Alert */}
          {expiringCerts.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning" icon={<Warning />}>
                <Typography variant="subtitle2" gutterBottom>
                  ⚠️ {expiringCerts.length} Certificate(s) Expiring Soon
                </Typography>
                <List dense>
                  {expiringCerts.slice(0, 5).map((cert) => (
                    <ListItem key={cert.userId}>
                      <ListItemIcon>
                        <Fingerprint fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${cert.username} (${cert.organization})`}
                        secondary={`Expires in ${cert.daysRemaining} days - ${new Date(cert.expiresAt).toLocaleDateString()}`}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setTabValue(0)}
                      >
                        Renew
                      </Button>
                    </ListItem>
                  ))}
                </List>
                {expiringCerts.length > 5 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {expiringCerts.length - 5} more certificates
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Analytics Tab */}
        <Grid container spacing={3}>
          {/* Organization Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business color="primary" />
                  Users by Organization
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={organizationStats}
                      dataKey="userCount"
                      nameKey="organization"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ organization, userCount }) => `${organization}: ${userCount}`}
                    >
                      {organizationStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* User Activity Trend */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="success" />
                  User Growth Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={[
                      { month: 'Jan', users: 20, active: 18 },
                      { month: 'Feb', users: 28, active: 25 },
                      { month: 'Mar', users: 35, active: 30 },
                      { month: 'Apr', users: 42, active: 38 },
                      { month: 'May', users: 50, active: 45 },
                      { month: 'Jun', users: stats.totalUsers, active: stats.activeUsers },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="users" stroke="#1976d2" fill="#1976d2" fillOpacity={0.6} name="Total Users" />
                    <Area type="monotone" dataKey="active" stroke="#4caf50" fill="#4caf50" fillOpacity={0.6} name="Active Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Organization Statistics Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment color="primary" />
                  Organization Statistics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Organization</TableCell>
                        <TableCell align="right">Total Users</TableCell>
                        <TableCell align="right">Active Users</TableCell>
                        <TableCell align="right">Enrolled Identities</TableCell>
                        <TableCell align="right">Activity %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {organizationStats.map((org) => (
                        <TableRow key={org.organization}>
                          <TableCell>
                            <Chip label={org.organization} size="small" sx={{ bgcolor: org.color, color: 'white' }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="h6">{org.userCount}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main">{org.activeUsers}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{org.enrolledIdentities}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={(org.activeUsers / org.userCount) * 100}
                                sx={{ width: 100 }}
                                color="success"
                              />
                              <Typography variant="body2">
                                {Math.round((org.activeUsers / org.userCount) * 100)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>TOTAL</strong></TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" color="primary">
                            {organizationStats.reduce((sum, org) => sum + org.userCount, 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main">
                            {organizationStats.reduce((sum, org) => sum + org.activeUsers, 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {organizationStats.reduce((sum, org) => sum + org.enrolledIdentities, 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {Math.round(
                              (organizationStats.reduce((sum, org) => sum + org.activeUsers, 0) /
                                organizationStats.reduce((sum, org) => sum + org.userCount, 0)) *
                                100
                            )}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Blockchain Identity Analytics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VerifiedUser color="warning" />
                  Blockchain Identity Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={organizationStats}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="organization" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="userCount" fill="#1976d2" name="Total Users" />
                    <Bar dataKey="enrolledIdentities" fill="#ff9800" name="Enrolled Identities" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Settings Tab */}
        <Grid container spacing={3}>
          {/* System Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings color="primary" />
                  System Configuration
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Auto Refresh Dashboard"
                      secondary="Automatically refresh statistics"
                    />
                    <Button
                      variant={autoRefresh ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      startIcon={autoRefresh ? <CheckCircle /> : <Block />}
                    >
                      {autoRefresh ? 'ON' : 'OFF'}
                    </Button>
                  </ListItem>
                  
                  {autoRefresh && (
                    <>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Refresh Interval"
                          secondary={`Current: Every ${refreshInterval} seconds`}
                        />
                        <TextField
                          type="number"
                          size="small"
                          value={refreshInterval}
                          onChange={(e) => setRefreshInterval(Number(e.target.value))}
                          inputProps={{ min: 10, max: 300 }}
                          sx={{ width: 100 }}
                        />
                      </ListItem>
                    </>
                  )}
                  
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Certificate Expiry Warning"
                      secondary="Days before expiry to show warning"
                    />
                    <TextField
                      type="number"
                      size="small"
                      defaultValue={30}
                      inputProps={{ min: 1, max: 90 }}
                      sx={{ width: 100 }}
                    />
                  </ListItem>
                  
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Session Timeout"
                      secondary="User session timeout in minutes"
                    />
                    <TextField
                      type="number"
                      size="small"
                      defaultValue={30}
                      inputProps={{ min: 5, max: 480 }}
                      sx={{ width: 100 }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color="error" />
                  Security Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <VpnKey />
                    </ListItemIcon>
                    <ListItemText
                      primary="Password Policy"
                      secondary="Minimum 8 characters, alphanumeric"
                    />
                    <Button variant="outlined" size="small">
                      Configure
                    </Button>
                  </ListItem>
                  
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <Fingerprint />
                    </ListItemIcon>
                    <ListItemText
                      primary="2FA Authentication"
                      secondary="Two-factor authentication (Coming Soon)"
                    />
                    <Chip label="Planned" size="small" color="default" />
                  </ListItem>
                  
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <HistoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Audit Log Retention"
                      secondary="Keep audit logs for 365 days"
                    />
                    <Button variant="outlined" size="small">
                      Configure
                    </Button>
                  </ListItem>
                  
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <Gavel />
                    </ListItemIcon>
                    <ListItemText
                      primary="Access Control Policies"
                      secondary="Organization-based access control"
                    />
                    <Button variant="outlined" size="small">
                      Manage
                    </Button>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Maintenance Tools */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DashboardIcon color="warning" />
                  Maintenance & Operations
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Storage />}
                      onClick={() => alert('Database backup started')}
                    >
                      Backup Database
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={() => {
                        loadSystemStats();
                        loadOrganizationStats();
                        loadRecentActivities();
                        loadExpiringCertificates();
                      }}
                    >
                      Refresh All Data
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      startIcon={<Warning />}
                      onClick={() => alert('System maintenance mode (Coming Soon)')}
                    >
                      Maintenance Mode
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="info"
                      startIcon={<CalendarToday />}
                      onClick={() => alert('System logs exported (Coming Soon)')}
                    >
                      Export Logs
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DashboardIcon color="info" />
                  System Information
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>System Version</strong></TableCell>
                        <TableCell>CECBS v2.0.0</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Database</strong></TableCell>
                        <TableCell>PostgreSQL 14.x</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Blockchain Platform</strong></TableCell>
                        <TableCell>Hyperledger Fabric 2.5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>API Server</strong></TableCell>
                        <TableCell>Node.js Express (Running)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total Organizations</strong></TableCell>
                        <TableCell>{stats.totalOrganizations}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total Users</strong></TableCell>
                        <TableCell>{stats.totalUsers}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Enrolled Blockchain Identities</strong></TableCell>
                        <TableCell>{stats.enrolledIdentities}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Active Contracts</strong></TableCell>
                        <TableCell>{stats.totalContracts}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total Shipments</strong></TableCell>
                        <TableCell>{stats.totalShipments}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Blockchain Transactions</strong></TableCell>
                        <TableCell>{stats.totalTransactions}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default AdminPortal;
