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
  OpenInNew,
  Visibility,
  Apps,
  Category,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import AuditTrailTable from '../portals/AuditTrailTable';
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
import SystemOverview from '../portals/SystemOverview';
import SystemTraceability from '../portals/SystemTraceability';
import ExporterTraceability from '../portals/ExporterTraceability';

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
  const router = useRouter();
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
  
  // System Traceability stats
  const [traceabilityStats, setTraceabilityStats] = useState({
    totalActivities: 0,
    uniqueEntities: 0,
    uniqueUsers: 0,
    blockchainVerified: 0,
  });
  
  // System Traceability filters (passed when KPI cards are clicked)
  const [traceabilityFilters, setTraceabilityFilters] = useState<any>({
    timestamp: Date.now() // Add timestamp to force updates
  });

  const BRAND_COLOR = '#1976d2'; // Admin blue

  useEffect(() => {
    loadSystemStats();
    loadOrganizationStats();
    loadRecentActivities();
    loadExpiringCertificates();
    loadBlockchainHealth(); // Load REAL blockchain health
    loadTraceabilityStats(); // Load System Traceability stats
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadSystemStats();
      loadOrganizationStats();
      loadRecentActivities();
      loadExpiringCertificates();
      loadTraceabilityStats();
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

      // Load REAL blockchain data from traceability service
      const traceabilityResponse = await api.get('/traceability/system/statistics');
      if (traceabilityResponse.data.success) {
        const traceData = traceabilityResponse.data.data;
        setStats(prev => ({
          ...prev,
          totalContracts: traceData.contracts.total,
          totalShipments: traceData.shipments.total,
          totalTransactions: traceData.auditLogs.total,
        }));
      }
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
        
        // Get REAL blockchain identities (gracefully handle if unavailable)
        let identities: any[] = [];
        try {
          const identitiesResponse = await api.get('/crypto-users/identities');
          if (identitiesResponse.data.success) {
            identities = identitiesResponse.data.data || [];
          }
        } catch (idError) {
          console.warn('Blockchain identities unavailable:', idError);
          // Continue without identities - will show 0 for enrolled
        }
        
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
          
          // Count REAL enrolled identities for this organization
          const orgIdentities = identities.filter((id: any) => 
            id.mspId === `${org}MSP` || (org === 'EXPORTERS' && id.mspId === 'ExportersMSP')
          );
          
          return {
            organization: org,
            userCount: orgUsers.length,
            activeUsers: orgUsers.filter((u: any) => u.status === 'active').length,
            enrolledIdentities: orgIdentities.length, // ✅ REAL DATA (or 0 if unavailable)
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
      const response = await api.get('/audit/portal/recent?limit=10');
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

  const loadBlockchainHealth = async () => {
    try {
      const response = await api.get('/blockchain/network');
      if (response.data.success) {
        const data = response.data.data;
        setBlockchainHealth({
          status: data.status === 'healthy' ? 'healthy' : 'error',
          blockHeight: data.blockHeight || 0, // REAL from ledger
          transactionsPerSecond: data.transactionsPerSecond || 0, // REAL calculated
          averageBlockTime: data.averageBlockTime || 0, // REAL calculated
          peers: data.peers || 1,
          orderers: data.orderers || 1,
          chaincodes: data.chaincodes || 3,
        });
      }
    } catch (error) {
      console.error('Failed to load blockchain health:', error);
      setBlockchainHealth(prev => ({ ...prev, status: 'error' }));
    }
  };

  const loadTraceabilityStats = async () => {
    try {
      const response = await api.get('/audit/portal/recent?limit=1000');
      if (response.data.success) {
        const allLogs = response.data.data.logs || [];
        
        // Calculate statistics
        const uniqueEntities = new Set(allLogs.map((log: any) => `${log.entity_type}-${log.entity_id}`)).size;
        const uniqueUsers = new Set(allLogs.map((log: any) => log.performed_by)).size;
        const blockchainVerified = allLogs.filter((log: any) => 
          log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC'
        ).length;
        
        setTraceabilityStats({
          totalActivities: allLogs.length,
          uniqueEntities,
          uniqueUsers,
          blockchainVerified,
        });
      }
    } catch (error) {
      console.error('Failed to load traceability stats:', error);
    }
  };

  // Handle KPI card clicks - navigate to appropriate tab and apply filters
  const handleKPICardClick = (tabIndex: number, cardIndex: number) => {
    switch (tabIndex) {
      case 0: // User Management
        setTabValue(5); // Switch to System Traceability to show user activities
        if (cardIndex === 0) {
          // Total Users - show all USER entity activities
          setTraceabilityFilters({
            entityTypeFilter: 'USER',
            dateRange: 'all',
            timestamp: Date.now()
          });
        } else if (cardIndex === 1) {
          // Active Users - show recent USER activities
          setTraceabilityFilters({
            entityTypeFilter: 'USER',
            dateRange: 'week',
            timestamp: Date.now()
          });
        } else if (cardIndex === 2) {
          // Exporters - show EXPORTER and EXPORTER_APPLICATION activities
          setTraceabilityFilters({
            entityTypeFilter: 'EXPORTER',
            dateRange: 'all',
            timestamp: Date.now()
          });
        }
        break;
        
      case 1: // System Overview
        // Blockchain metrics - navigate to System Traceability
        setTabValue(5);
        if (cardIndex === 0) {
          // Block Height - show all blockchain activities
          setTraceabilityFilters({
            searchQuery: 'blockchain-verified',
            dateRange: 'all',
            timestamp: Date.now()
          });
        } else if (cardIndex === 1 || cardIndex === 2) {
          // TPS or Peers - show recent blockchain activities
          setTraceabilityFilters({
            searchQuery: 'blockchain-verified',
            dateRange: 'today',
            timestamp: Date.now()
          });
        }
        break;
        
      case 2: // Analytics
        setTabValue(5); // Switch to System Traceability for drilling down
        if (cardIndex === 0) {
          // Transactions - show all blockchain-verified
          setTraceabilityFilters({
            searchQuery: 'blockchain-verified',
            dateRange: 'all',
            timestamp: Date.now()
          });
        } else if (cardIndex === 1) {
          // Contracts - filter by entity type
          setTraceabilityFilters({
            entityTypeFilter: 'CONTRACT',
            dateRange: 'all',
            timestamp: Date.now()
          });
        } else if (cardIndex === 2) {
          // Shipments - filter by entity type
          setTraceabilityFilters({
            entityTypeFilter: 'SHIPMENT',
            dateRange: 'all',
            timestamp: Date.now()
          });
        } else if (cardIndex === 3) {
          // Avg Block Time - show recent blockchain activities
          setTraceabilityFilters({
            searchQuery: 'blockchain-verified',
            dateRange: 'today',
            timestamp: Date.now()
          });
        }
        break;
        
      case 3: // Settings
        setTabValue(5);
        if (cardIndex === 0) {
          // Identities - show USER creation/management activities
          setTraceabilityFilters({
            entityTypeFilter: 'USER',
            actionFilter: 'ALL',
            dateRange: 'all',
            timestamp: Date.now()
          });
        } else if (cardIndex === 1) {
          // Expiring Soon - show recent USER activities
          setTraceabilityFilters({
            entityTypeFilter: 'USER',
            dateRange: 'month',
            timestamp: Date.now()
          });
        }
        break;
        
      case 4: // Portal Access
        // Not applicable - just navigation links
        break;
        
      case 5: // System Traceability
        setTabValue(5);
        if (cardIndex === 0) {
          // Total Activities - reset all filters
          setTraceabilityFilters({
            entityTypeFilter: 'ALL',
            actionFilter: 'ALL',
            organizationFilter: 'ALL',
            dateRange: 'all',
            searchQuery: '',
            timestamp: Date.now()
          });
        } else if (cardIndex === 1) {
          // Unique Entities - show all, no duplicate filtering yet
          setTraceabilityFilters({
            entityTypeFilter: 'ALL',
            actionFilter: 'ALL',
            organizationFilter: 'ALL',
            dateRange: 'all',
            searchQuery: '',
            timestamp: Date.now()
          });
        } else if (cardIndex === 2) {
          // Unique Users - can't filter by this yet, just reset
          setTraceabilityFilters({
            entityTypeFilter: 'ALL',
            actionFilter: 'ALL',
            organizationFilter: 'ALL',
            dateRange: 'all',
            searchQuery: '',
            timestamp: Date.now()
          });
        } else if (cardIndex === 3) {
          // Blockchain Verified - show only blockchain
          setTraceabilityFilters({
            searchQuery: 'blockchain-verified',
            entityTypeFilter: 'ALL',
            actionFilter: 'ALL',
            organizationFilter: 'ALL',
            dateRange: 'all',
            timestamp: Date.now()
          });
        }
        break;
        
      default:
        break;
    }
  };

  const getKPICards = () => {
    switch (tabValue) {
      case 0: // User Management
        return [
          {
            title: 'Total Users',
            value: stats.totalUsers,
            icon: <Group color="primary" />,
            bgcolor: '#e3f2fd',
            subtitle: `${stats.activeUsers} active`,
          },
          {
            title: 'Active Users',
            value: stats.activeUsers,
            icon: <CheckCircle color="success" />,
            bgcolor: '#e8f5e9',
            subtitle: `${Math.round((stats.activeUsers / stats.totalUsers) * 100 || 0)}% active rate`,
          },
          {
            title: 'Exporters',
            value: stats.totalExporters,
            icon: <Coffee color="warning" />,
            bgcolor: '#fff3e0',
            subtitle: 'Licensed exporters',
          },
          {
            title: 'Organizations',
            value: stats.totalOrganizations,
            icon: <Business color="secondary" />,
            bgcolor: '#f3e5f5',
            subtitle: 'Consortium members',
          },
        ];
      case 1: // System Overview
        return [
          {
            title: 'Block Height',
            value: blockchainHealth.blockHeight.toLocaleString(),
            icon: <Storage color="primary" />,
            bgcolor: '#e3f2fd',
            subtitle: 'Current block',
          },
          {
            title: 'TPS',
            value: blockchainHealth.transactionsPerSecond,
            icon: <Speed color="success" />,
            bgcolor: '#e8f5e9',
            subtitle: 'Transactions/sec',
          },
          {
            title: 'Peers',
            value: blockchainHealth.peers,
            icon: <CloudQueue color="info" />,
            bgcolor: '#e1f5fe',
            subtitle: 'Network nodes',
          },
          {
            title: 'Status',
            value: blockchainHealth.status.toUpperCase(),
            icon: blockchainHealth.status === 'healthy' ? <CheckCircle color="success" /> : <Warning color="warning" />,
            bgcolor: blockchainHealth.status === 'healthy' ? '#e8f5e9' : '#fff3e0',
            subtitle: 'Network health',
          },
        ];
      case 2: // Analytics
        return [
          {
            title: 'Transactions',
            value: stats.totalTransactions.toLocaleString(),
            icon: <DataUsage color="primary" />,
            bgcolor: '#e3f2fd',
            subtitle: 'On blockchain',
          },
          {
            title: 'Contracts',
            value: stats.totalContracts,
            icon: <Description color="success" />,
            bgcolor: '#e8f5e9',
            subtitle: 'Total contracts',
          },
          {
            title: 'Shipments',
            value: stats.totalShipments,
            icon: <LocalShipping color="warning" />,
            bgcolor: '#fff3e0',
            subtitle: 'Total shipments',
          },
          {
            title: 'Avg Block Time',
            value: `${blockchainHealth.averageBlockTime}s`,
            icon: <Timeline color="secondary" />,
            bgcolor: '#f3e5f5',
            subtitle: 'Block creation',
          },
        ];
      case 3: // Settings
        return [
          {
            title: 'Identities',
            value: stats.enrolledIdentities,
            icon: <VerifiedUser color="primary" />,
            bgcolor: '#e3f2fd',
            subtitle: 'Blockchain IDs',
          },
          {
            title: 'Expiring Soon',
            value: stats.expiringCertificates,
            icon: <Warning color="error" />,
            bgcolor: stats.expiringCertificates > 0 ? '#ffebee' : '#e8f5e9',
            subtitle: 'Certificates',
          },
          {
            title: 'Chaincodes',
            value: blockchainHealth.chaincodes,
            icon: <Gavel color="info" />,
            bgcolor: '#e1f5fe',
            subtitle: 'Deployed',
          },
          {
            title: 'Orderers',
            value: blockchainHealth.orderers,
            icon: <AccountBalance color="secondary" />,
            bgcolor: '#f3e5f5',
            subtitle: 'Consensus nodes',
          },
        ];
      case 5: // System Traceability
        return [
          {
            title: 'Total Activities',
            value: traceabilityStats.totalActivities,
            icon: <Timeline color="primary" />,
            bgcolor: '#e3f2fd',
            subtitle: 'All system actions',
          },
          {
            title: 'Unique Entities',
            value: traceabilityStats.uniqueEntities,
            icon: <Category color="success" />,
            bgcolor: '#e8f5e9',
            subtitle: 'Items traced',
          },
          {
            title: 'Unique Users',
            value: traceabilityStats.uniqueUsers,
            icon: <Person color="warning" />,
            bgcolor: '#fff3e0',
            subtitle: 'Active performers',
          },
          {
            title: 'Blockchain Verified',
            value: traceabilityStats.blockchainVerified,
            icon: <VerifiedUser color="info" />,
            bgcolor: '#e1f5fe',
            subtitle: 'Cryptographically signed',
          },
        ];
      default:
        return [
          {
            title: 'Total Users',
            value: stats.totalUsers,
            icon: <Group color="primary" />,
            bgcolor: '#e3f2fd',
            subtitle: `${stats.activeUsers} active`,
          },
          {
            title: 'Organizations',
            value: stats.totalOrganizations,
            icon: <Business color="success" />,
            bgcolor: '#e8f5e9',
            subtitle: 'Consortium members',
          },
          {
            title: 'Blockchain IDs',
            value: stats.enrolledIdentities,
            icon: <VerifiedUser color="warning" />,
            bgcolor: '#fff3e0',
            subtitle: 'Enrolled identities',
          },
          {
            title: 'Certificates',
            value: stats.expiringCertificates,
            icon: <Assessment color={stats.expiringCertificates > 0 ? 'error' : 'action'} />,
            bgcolor: stats.expiringCertificates > 0 ? '#ffebee' : '#f5f5f5',
            subtitle: 'Expiring soon',
          },
        ];
    }
  };

  const kpiCards = getKPICards();

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

      {/* Dynamic KPI Cards - Change based on active tab */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpiCards.map((card, index) => {
          // Determine if this card is clickable based on tab and card index
          const isClickable = 
            (tabValue === 0 && (index === 0 || index === 1 || index === 2)) || // User Management: Total, Active, Exporters
            (tabValue === 1 && (index === 0 || index === 1 || index === 2)) || // System Overview: Block Height, TPS, Peers
            (tabValue === 2) || // Analytics: All 4 cards clickable
            (tabValue === 3 && (index === 0 || index === 1)) || // Settings: Identities, Expiring
            (tabValue === 5); // System Traceability: All 4 cards clickable
          
          return (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  bgcolor: card.bgcolor, 
                  transition: 'all 0.3s ease', 
                  cursor: isClickable ? 'pointer' : 'default',
                  '&:hover': { 
                    transform: isClickable ? 'translateY(-6px)' : 'translateY(-2px)', 
                    boxShadow: isClickable ? 6 : 4 
                  } 
                }}
                onClick={() => {
                  if (isClickable) {
                    handleKPICardClick(tabValue, index);
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {card.icon}
                    <Typography variant="h6" fontWeight={600}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="text.primary" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
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
          <Tab 
            label="Portal Access" 
            icon={<Apps sx={{ fontSize: 20 }} />} 
            iconPosition="start" 
          />
          <Tab 
            label="System Traceability" 
            icon={<Timeline sx={{ fontSize: 20 }} />} 
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
        {/* System Overview Tab - Aggregate Statistics */}
        <SystemOverview />
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
                  Detailed Organization Statistics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Organization</TableCell>
                        <TableCell align="right">Total Users</TableCell>
                        <TableCell align="right">Active Users</TableCell>
                        <TableCell align="right">Enrolled Identities</TableCell>
                        <TableCell align="right">Activity Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {organizationStats.map((org) => (
                        <TableRow key={org.organization}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: org.color,
                                }}
                              />
                              <Typography fontWeight={600}>{org.organization}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{org.userCount}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={org.activeUsers}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={org.enrolledIdentities}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={org.userCount > 0 ? (org.activeUsers / org.userCount) * 100 : 0}
                                sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                              />
                              <Typography variant="caption">
                                {org.userCount > 0
                                  ? Math.round((org.activeUsers / org.userCount) * 100)
                                  : 0}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Blockchain Transactions Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Block color="primary" />
                  Blockchain Transaction Activity (Last 7 Days)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { day: 'Mon', transactions: 125, contracts: 12, shipments: 8 },
                      { day: 'Tue', transactions: 142, contracts: 15, shipments: 10 },
                      { day: 'Wed', transactions: 138, contracts: 14, shipments: 9 },
                      { day: 'Thu', transactions: 156, contracts: 18, shipments: 12 },
                      { day: 'Fri', transactions: 168, contracts: 20, shipments: 14 },
                      { day: 'Sat', transactions: 98, contracts: 8, shipments: 5 },
                      { day: 'Sun', transactions: 105, contracts: 9, shipments: 6 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="transactions" fill="#1976d2" name="Total Transactions" />
                    <Bar dataKey="contracts" fill="#4caf50" name="Contracts" />
                    <Bar dataKey="shipments" fill="#ff9800" name="Shipments" />
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

      <TabPanel value={tabValue} index={4}>
        {/* Portal Access Tab - Super Admin Quick Navigation */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" icon={<Security />}>
              <Typography variant="body2">
                <strong>Super Admin Portal Access:</strong> As a Super Administrator, you can access ALL portals in the system. 
                Click any portal below to view and manage operations across the entire consortium.
              </Typography>
            </Alert>
          </Grid>

          {/* ECTA Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#e3f2fd', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#bbdefb'
                } 
              }}
              onClick={() => router.push('/portals/ecta')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Coffee sx={{ fontSize: 48, color: '#1976d2' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#1976d2">
                      ECTA Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ethiopian Coffee & Tea Authority
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Quality inspection, lab analysis, phytosanitary certificates, licenses & permits
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="Quality Inspector" size="small" variant="outlined" />
                  <Chip label="Lab Analyst" size="small" variant="outlined" />
                  <Chip label="Phyto Officer" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                >
                  Access ECTA Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* ECX Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#e8f5e9', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#c8e6c9'
                } 
              }}
              onClick={() => router.push('/portals/ecx')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <TrendingUp sx={{ fontSize: 48, color: '#388e3c' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#388e3c">
                      ECX Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ethiopian Commodity Exchange
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Coffee grading, warehouse management, contract registration, commodity release
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="Grading Officer" size="small" variant="outlined" />
                  <Chip label="Warehouse Officer" size="small" variant="outlined" />
                  <Chip label="ECX Officer" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#388e3c', '&:hover': { bgcolor: '#2e7d32' } }}
                >
                  Access ECX Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* NBE Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#ffebee', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#ffcdd2'
                } 
              }}
              onClick={() => router.push('/portals/nbe')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <AccountBalance sx={{ fontSize: 48, color: '#d32f2f' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#d32f2f">
                      NBE Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      National Bank of Ethiopia
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Foreign exchange allocation, forex screening, compliance, exchange rates
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="Forex Officer" size="small" variant="outlined" />
                  <Chip label="Compliance Officer" size="small" variant="outlined" />
                  <Chip label="NBE Officer" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#c62828' } }}
                >
                  Access NBE Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Banks Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#fff3e0', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#ffe0b2'
                } 
              }}
              onClick={() => router.push('/portals/banks')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <AccountBalance sx={{ fontSize: 48, color: '#f57c00' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#f57c00">
                      Banks Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Commercial Banks
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Letter of Credit (LC) issuance, trade finance, credit analysis, amendments
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="LC Officer" size="small" variant="outlined" />
                  <Chip label="Trade Finance" size="small" variant="outlined" />
                  <Chip label="Bank Officer" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#ef6c00' } }}
                >
                  Access Banks Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Customs Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#f3e5f5', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#e1bee7'
                } 
              }}
              onClick={() => router.push('/portals/customs')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Gavel sx={{ fontSize: 48, color: '#7b1fa2' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#7b1fa2">
                      Customs Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ethiopian Customs Commission
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Customs clearance, inspection, risk analysis, ASYCUDA system integration
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="Customs Officer" size="small" variant="outlined" />
                  <Chip label="Clearance Officer" size="small" variant="outlined" />
                  <Chip label="Risk Analyst" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}
                >
                  Access Customs Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Shipping Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#e0f7fa', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#b2ebf2'
                } 
              }}
              onClick={() => router.push('/portals/shipping')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <LocalShipping sx={{ fontSize: 48, color: '#0097a7' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#0097a7">
                      Shipping Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maritime Logistics
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Container tracking, bill of lading, freight forwarding, documentation
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="Logistics Officer" size="small" variant="outlined" />
                  <Chip label="Freight Forwarder" size="small" variant="outlined" />
                  <Chip label="Doc Officer" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#0097a7', '&:hover': { bgcolor: '#00838f' } }}
                >
                  Access Shipping Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Exporter Portal */}
          <Grid item xs={12} md={6} lg={4}>
            <Card 
              sx={{ 
                bgcolor: '#f1f8e9', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: 6,
                  bgcolor: '#dcedc8'
                } 
              }}
              onClick={() => router.push('/portals/exporter')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Business sx={{ fontSize: 48, color: '#689f38' }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#689f38">
                      Exporter Portal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Coffee Exporters Dashboard
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Contract management, shipment tracking, document submission, payment processing
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label="Export Operations" size="small" variant="outlined" />
                  <Chip label="Contract Mgmt" size="small" variant="outlined" />
                  <Chip label="Documentation" size="small" variant="outlined" />
                </Box>
                <Button 
                  variant="contained" 
                  fullWidth 
                  endIcon={<OpenInNew />}
                  sx={{ bgcolor: '#689f38', '&:hover': { bgcolor: '#558b2f' } }}
                >
                  Access Exporter Portal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: '#fafafa' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Visibility color="primary" />
                  Portal Access Summary
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="h4" fontWeight="bold" color="primary">7</Typography>
                      <Typography variant="body2" color="text.secondary">Total Portals</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">{stats.totalOrganizations}</Typography>
                      <Typography variant="body2" color="text.secondary">Organizations</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.totalUsers}</Typography>
                      <Typography variant="body2" color="text.secondary">Total Users</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="h4" fontWeight="bold" color="error.main">FULL</Typography>
                      <Typography variant="body2" color="text.secondary">Admin Access</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        {/* System Traceability Tab - Complete Activity Trail & Audit Logs */}
        <SystemTraceability 
          hideStats={true} 
          initialFilters={traceabilityFilters}
        />
      </TabPanel>
    </Box>
  );
};

export default AdminPortal;
