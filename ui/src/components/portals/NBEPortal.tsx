// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// NBE Portal - Sales Contract Management & Forex

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  TrendingUp,
  AccountBalance,
  CurrencyExchange,
  Assignment,
  Visibility,
  Download,
  Warning,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useForm, Controller } from 'react-hook-form';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { SalesContract, ContractFormData } from '@/types';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';

interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  officialRate: number;
  retentionRate: number;
  status: 'REQUESTED' | 'APPROVED' | 'ALLOCATED' | 'UTILIZED';
  requestDate: string;
  approvalDate?: string;
  allocationDate?: string;
  expiryDate: string;
  nbeOfficer?: string;
  nbeApprovalRef?: string;
}

interface ExchangeRate {
  rateId: string;
  currency: string;
  buyingRate: number;
  sellingRate: number;
  midRate: number;
  effectiveDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUPERSEDED';
}

interface RetentionPolicy {
  policyId: string;
  commodityType: string;
  retentionRate: number;
  surrenderRate: number;
  effectiveDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  setBy: string;
  justification: string;
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

const NBEPortal: React.FC = () => {
  // NBE Brand Colors
  const BRAND_COLOR = '#8B6F47';  // Bronze
  const SECONDARY_COLOR = '#C4A574';  // Light Bronze
  
  const [tabValue, setTabValue] = useState(0);
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [forexAllocations, setForexAllocations] = useState<ForexAllocation[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<SalesContract | null>(null);
  const [selectedForex, setSelectedForex] = useState<ForexAllocation | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [forexDialogOpen, setForexDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Mock Data
  const mockForex: ForexAllocation[] = [
    {
      forexId: 'FOREX20260603001',
      contractId: 'CONTRACT2026001',
      exporterId: 'EXP2026001',
      requestedAmount: 50000,
      allocatedAmount: 50000,
      currency: 'USD',
      exchangeRate: 115.5,
      officialRate: 115.5,
      retentionRate: 40,
      status: 'ALLOCATED',
      requestDate: '2026-06-01T10:00:00Z',
      approvalDate: '2026-06-01T14:00:00Z',
      allocationDate: '2026-06-02T09:00:00Z',
      expiryDate: '2026-09-30',
      nbeOfficer: 'NBE_OFFICER_001',
      nbeApprovalRef: 'NBE/FX/2026/001234',
    },
    {
      forexId: 'FOREX20260603002',
      contractId: 'CONTRACT2026002',
      exporterId: 'EXP2026002',
      requestedAmount: 75000,
      allocatedAmount: 0,
      currency: 'USD',
      exchangeRate: 0,
      officialRate: 115.5,
      retentionRate: 40,
      status: 'REQUESTED',
      requestDate: '2026-06-03T08:00:00Z',
      expiryDate: '2026-10-31',
    },
  ];

  const mockRates: ExchangeRate[] = [
    {
      rateId: 'RATE20260603001',
      currency: 'USD',
      buyingRate: 115.0,
      sellingRate: 116.0,
      midRate: 115.5,
      effectiveDate: '2026-06-03',
      status: 'ACTIVE',
    },
    {
      rateId: 'RATE20260603002',
      currency: 'EUR',
      buyingRate: 125.0,
      sellingRate: 126.5,
      midRate: 125.75,
      effectiveDate: '2026-06-03',
      status: 'ACTIVE',
    },
  ];

  const mockPolicies: RetentionPolicy[] = [
    {
      policyId: 'POLICY20260101',
      commodityType: 'COFFEE',
      retentionRate: 40,
      surrenderRate: 60,
      effectiveDate: '2026-01-01',
      status: 'ACTIVE',
      setBy: 'NBE Governor',
      justification: 'Balance forex reserves while supporting coffee exporters',
    },
  ];

  const { control, handleSubmit, reset } = useForm<ContractFormData>();

  // This is handled by mockForex above - removed duplicate

  const forexData = [
    { month: 'Jan', usd: 55.2, eur: 60.8, gbp: 68.5 },
    { month: 'Feb', usd: 56.1, eur: 61.2, gbp: 69.1 },
    { month: 'Mar', usd: 56.8, eur: 61.8, gbp: 70.2 },
    { month: 'Apr', usd: 57.0, eur: 62.0, gbp: 70.5 },
    { month: 'May', usd: 57.25, eur: 62.1, gbp: 70.8 },
  ];

  const contractStatusData = [
    { name: 'Registered', value: 45, color: '#2196f3' },
    { name: 'Approved', value: 32, color: '#4caf50' },
    { name: 'Rejected', value: 3, color: '#f44336' },
    { name: 'Under Review', value: 12, color: '#ff9800' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const contractsRes = await api.getContracts();
      if (contractsRes.success) {
        const allContracts = contractsRes.data || [];
        console.log(`[NBE] Loaded ${allContracts.length} total contracts`);
        console.log(`[NBE] Contract statuses:`, allContracts.map(c => ({ id: c.contractId, status: c.contractStatus })));
        setContracts(allContracts);
      }
      
      // Load forex allocations from blockchain
      try {
        const forexRes = await fetch('http://localhost:3001/api/v1/banking/forex', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const forexData = await forexRes.json();
        if (forexData.success && forexData.data) {
          setForexAllocations(forexData.data);
        } else {
          // Fallback to mock data if API fails
          setForexAllocations(mockForex);
        }
      } catch (err) {
        console.error('Failed to load forex allocations:', err);
        setForexAllocations(mockForex);
      }
      
      // Load mock data for other v1.4 features
      setExchangeRates(mockRates);
      setRetentionPolicies(mockPolicies);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveContract = async (contractId: string) => {
    try {
      console.log(`[NBE] Approving contract: ${contractId}`);
      const response = await api.approveContract(contractId);
      if (response.success) {
        console.log(`[NBE] ✅ Contract approved: ${contractId}, new status should be APPROVED`);
        setApprovalDialogOpen(false);
        loadData();
      } else {
        console.error(`[NBE] ❌ Failed to approve contract: ${contractId}`, response);
      }
    } catch (error) {
      console.error('[NBE] Failed to approve contract:', error);
    }
  };

  const contractColumns: GridColDef[] = [
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'nbeReferenceNumber', headerName: 'NBE Reference', width: 180 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    { field: 'buyerCountry', headerName: 'Destination', width: 120 },
    { field: 'coffeeType', headerName: 'Coffee Type', width: 150 },
    { field: 'quantity', headerName: 'Quantity (kg)', width: 120 },
    {
      field: 'totalValue',
      headerName: 'Value (USD)',
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'minimumPriceCompliant',
      headerName: 'Min Price',
      width: 100,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value ? 'Yes' : 'No'}
          color={params.value ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'eudrRequired',
      headerName: 'EUDR',
      width: 80,
      renderCell: (params) => (
        params.value ? <CheckCircle color="primary" /> : <Cancel color="disabled" />
      ),
    },
    {
      field: 'contractStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: getStatusColor(params.value),
            color: 'white',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedContract(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.contractStatus === 'REGISTERED' && (
            <Tooltip title="Approve for Forex Allocation">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedContract(params.row);
                  setApprovalDialogOpen(true);
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const forexColumns: GridColDef[] = [
    { field: 'forexId', headerName: 'Forex ID', width: 150 },
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    {
      field: 'requestedAmount',
      headerName: 'Requested',
      width: 120,
      renderCell: (params) => formatCurrency(params.value, params.row.currency),
    },
    {
      field: 'allocatedAmount',
      headerName: 'Allocated',
      width: 120,
      renderCell: (params) => {
        if (params.value > 0) {
          return formatCurrency(params.value, params.row.currency);
        }
        return '-';
      },
    },
    { 
      field: 'exchangeRate', 
      headerName: 'Rate (ETB)', 
      width: 110,
      renderCell: (params) => params.value > 0 ? params.value.toFixed(2) : '-',
    },
    {
      field: 'retentionRate',
      headerName: 'Retention',
      width: 100,
      renderCell: (params) => `${params.value}%`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    { 
      field: 'requestDate', 
      headerName: 'Request Date', 
      width: 130, 
      renderCell: (params) => formatDate(params.value) 
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedForex(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.status === 'REQUESTED' && (
            <Tooltip title="Allocate Forex">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedForex(params.row);
                  setForexDialogOpen(true);
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const getContractStats = () => {
    const total = contracts.length;
    const approved = contracts.filter(c => c.contractStatus === 'APPROVED').length;
    const pending = contracts.filter(c => c.contractStatus === 'REGISTERED').length;
    const totalValue = contracts.reduce((sum, contract) => sum + contract.totalValue, 0);

    return { total, approved, pending, totalValue };
  };

  const stats = getContractStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🏦 NBE Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            National Bank of Ethiopia - Contract Approval & Forex Allocation Management
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <ThemeToggle
            mode={themeMode}
            onToggle={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            brandColor={BRAND_COLOR}
          />
          <AnimatedButton
            variant="outlined"
            startIcon={<Download />}
            brandColor={BRAND_COLOR}
          >
            Export Report
          </AnimatedButton>
          <AnimatedButton
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            brandColor={BRAND_COLOR}
            secondaryColor={SECONDARY_COLOR}
          >
            New Contract
          </AnimatedButton>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Contracts"
            value={stats.total}
            icon={<Assignment />}
            trend="up"
            trendValue="+7.5%"
            brandColor={BRAND_COLOR}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle />}
            trend="up"
            trendValue="+10%"
            brandColor="#4caf50"
            subtitle="Ready for forex"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Pending Review"
            value={stats.pending}
            icon={<Warning />}
            trend={stats.pending > 0 ? 'up' : 'flat'}
            trendValue={stats.pending > 0 ? 'Needs approval' : 'All clear'}
            brandColor="#ff9800"
            subtitle="Awaiting review"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Value (USD)"
            value={formatCurrency(stats.totalValue).replace('$', '$')}
            icon={<AccountBalance />}
            trend="up"
            trendValue="+15%"
            brandColor="#1565c0"
            subtitle="Contract value"
          />
        </Grid>
      </Grid>

      {/* Current Exchange Rates */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Current Exchange Rates:</strong> USD: 57.25 ETB • EUR: 62.10 ETB • GBP: 70.80 ETB
          <br />
          <strong>Franco Valuta Directive (FVD/01/2026):</strong> Alternative FX channels available for diaspora and investor transactions
        </Typography>
      </Alert>

      {/* Tabs */}
      <ModernCard brandColor={BRAND_COLOR}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Contract Approvals" />
            <Tab label="Forex Allocations" />
            <Tab label="Exchange Rates" />
            <Tab label="Compliance" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>NBE's Role:</strong> Contracts shown here have been registered by ECTA after validating export compliance. 
              NBE approves contracts to authorize foreign exchange allocation. Only APPROVED contracts can proceed to forex allocation and LC issuance.
            </Typography>
          </Alert>
          
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={contracts}
              columns={contractColumns}
              getRowId={(row) => row.contractId}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              checkboxSelection
              disableRowSelectionOnClick
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Forex Allocation Management</Typography>
            <AnimatedButton
              variant="contained"
              startIcon={<Add />}
              brandColor={BRAND_COLOR}
            >
              Manual Allocation
            </AnimatedButton>
          </Box>

          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pending Requests
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {forexAllocations.filter(f => f.status === 'REQUESTED').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Requires allocation
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Allocated (USD)
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(forexAllocations
                      .filter(f => f.status === 'ALLOCATED')
                      .reduce((sum, f) => sum + f.allocatedAmount, 0))}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active allocations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Utilization Rate
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    87.5%
                  </Typography>
                  <LinearProgress variant="determinate" value={87.5} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Retention Rate
                  </Typography>
                  <Typography variant="h4" color={BRAND_COLOR}>
                    40%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Current policy
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Forex Allocation Cards */}
          <Grid container spacing={2} mb={3}>
            {forexAllocations.map((forex) => (
              <Grid item xs={12} key={forex.forexId}>
                <ModernCard brandColor={BRAND_COLOR}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6">{forex.forexId}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Contract: {forex.contractId} • Exporter: {forex.exporterId}
                        </Typography>
                      </Box>
                      <StatusChip status={forex.status} />
                    </Box>

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="textSecondary">Requested Amount</Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(forex.requestedAmount, forex.currency)}
                        </Typography>
                      </Grid>
                      {forex.allocatedAmount > 0 && (
                        <Grid item xs={12} md={2}>
                          <Typography variant="caption" color="textSecondary">Allocated Amount</Typography>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(forex.allocatedAmount, forex.currency)}
                          </Typography>
                        </Grid>
                      )}
                      {forex.exchangeRate > 0 && (
                        <Grid item xs={12} md={2}>
                          <Typography variant="caption" color="textSecondary">Exchange Rate</Typography>
                          <Typography variant="body1">
                            1 {forex.currency} = {forex.exchangeRate} ETB
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="textSecondary">Retention Rate</Typography>
                        <Typography variant="body1">{forex.retentionRate}%</Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="textSecondary">Request Date</Typography>
                        <Typography variant="body2">{formatDate(forex.requestDate)}</Typography>
                      </Grid>
                      {forex.expiryDate && (
                        <Grid item xs={12} md={2}>
                          <Typography variant="caption" color="textSecondary">Expiry Date</Typography>
                          <Typography variant="body2">{formatDate(forex.expiryDate)}</Typography>
                        </Grid>
                      )}
                    </Grid>

                    {forex.nbeApprovalRef && (
                      <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption" color="textSecondary">NBE Approval Reference</Typography>
                        <Typography variant="body2" fontWeight={600}>{forex.nbeApprovalRef}</Typography>
                        {forex.nbeOfficer && (
                          <Typography variant="caption" color="textSecondary">
                            Approved by: {forex.nbeOfficer}
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Box display="flex" gap={1}>
                      {forex.status === 'REQUESTED' && (
                        <AnimatedButton
                          size="small"
                          variant="contained"
                          brandColor="#4caf50"
                          onClick={() => {
                            setSelectedForex(forex);
                            setForexDialogOpen(true);
                          }}
                        >
                          Allocate Forex
                        </AnimatedButton>
                      )}
                      <AnimatedButton size="small" variant="outlined">
                        View Details
                      </AnimatedButton>
                    </Box>
                  </CardContent>
                </ModernCard>
              </Grid>
            ))}
          </Grid>

          {/* DataGrid for quick reference */}
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={forexAllocations}
              columns={forexColumns}
              getRowId={(row) => row.forexId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Exchange Rate Management</Typography>
            <AnimatedButton
              variant="contained"
              startIcon={<Add />}
              brandColor={BRAND_COLOR}
              onClick={() => setRateDialogOpen(true)}
            >
              Set New Rate
            </AnimatedButton>
          </Box>

          {/* Current Rates Cards */}
          <Grid container spacing={3} mb={3}>
            {exchangeRates.map((rate) => (
              <Grid item xs={12} md={4} key={rate.rateId}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h5" fontWeight={600}>{rate.currency}</Typography>
                      <StatusChip 
                        status={rate.status === 'ACTIVE' ? 'ACTIVE' : rate.status === 'SUPERSEDED' ? 'EXPIRED' : 'PENDING'} 
                        size="small" 
                      />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Buying Rate</Typography>
                        <Typography variant="h6" color="success.main">
                          {rate.buyingRate.toFixed(2)} ETB
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Selling Rate</Typography>
                        <Typography variant="h6" color="error.main">
                          {rate.sellingRate.toFixed(2)} ETB
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Mid Rate</Typography>
                        <Typography variant="h5" fontWeight={600}>
                          {rate.midRate.toFixed(2)} ETB
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">
                          Effective: {formatDate(rate.effectiveDate)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Exchange Rate Trends (2026)
          </Typography>
          <Box sx={{ height: 400, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forexData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value} ETB`} />
                <RechartsTooltip formatter={(value) => [`${value} ETB`, 'Exchange Rate']} />
                <Line type="monotone" dataKey="usd" stroke="#1565c0" strokeWidth={3} name="USD" />
                <Line type="monotone" dataKey="eur" stroke="#4caf50" strokeWidth={3} name="EUR" />
                <Line type="monotone" dataKey="gbp" stroke="#f57c00" strokeWidth={3} name="GBP" />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rate History (USD)
                  </Typography>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Buying</TableCell>
                        <TableCell>Selling</TableCell>
                        <TableCell>Mid</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {forexData.reverse().map((data, index) => (
                        <TableRow key={index}>
                          <TableCell>{data.month}</TableCell>
                          <TableCell>{(data.usd - 0.25).toFixed(2)}</TableCell>
                          <TableCell>{(data.usd + 0.25).toFixed(2)}</TableCell>
                          <TableCell>{data.usd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Franco Valuta Arrangements
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    New FVD/01/2026 directive allows alternative FX channels:
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">• Diaspora remittances</Typography>
                    <Typography variant="body2">• Foreign investor transactions</Typography>
                    <Typography variant="body2">• Enhanced forex allocation</Typography>
                    <Typography variant="body2">• Multi-bank export permits</Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="textSecondary">
                    <strong>Rate Setting Authority:</strong> NBE Governor's Office
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Update Frequency:</strong> Daily
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Last Updated:</strong> {formatDate(new Date().toISOString())}
                  </Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 2 }}>
                    View FVD Guidelines
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Regulatory Compliance Dashboard
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Contract Status Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contractStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {contractStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Minimum Price Compliance: 96.5%
                    </Typography>
                    <LinearProgress variant="determinate" value={96.5} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      EUDR Documentation: 98.2%
                    </Typography>
                    <LinearProgress variant="determinate" value={98.2} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Contract Processing Time: 2.3 days avg
                    </Typography>
                    <LinearProgress variant="determinate" value={85} sx={{ mt: 1 }} />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="textSecondary">
                    <strong>2026 Regulatory Updates:</strong>
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Enhanced capital requirements implemented
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Multi-bank export authorization active
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • EUDR compliance mandatory for EU exports
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </ModernCard>

      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedContract && !approvalDialogOpen} onClose={() => setSelectedContract(null)} maxWidth="md" fullWidth>
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Contract ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedContract.contractId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">NBE Reference</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedContract.nbeReferenceNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedContract.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Buyer Country</Typography>
                  <Typography variant="body1">{selectedContract.buyerCountry}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Coffee Type</Typography>
                  <Typography variant="body1">{selectedContract.coffeeType}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1">{selectedContract.quantity.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Price per Kg</Typography>
                  <Typography variant="body1">{formatCurrency(selectedContract.pricePerKg)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Total Value</Typography>
                  <Typography variant="body1" color="primary" fontWeight={600}>
                    {formatCurrency(selectedContract.totalValue)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Minimum Price Compliant</Typography>
                  <Box>
                    {selectedContract.minimumPriceCompliant ? (
                      <Chip label="Yes" color="success" size="small" />
                    ) : (
                      <Chip label="No" color="error" size="small" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">EUDR Required</Typography>
                  <Box>
                    {selectedContract.eudrRequired ? (
                      <CheckCircle color="primary" />
                    ) : (
                      <Cancel color="disabled" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip status={selectedContract.contractStatus} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Registration Date</Typography>
                  <Typography variant="body1">{formatDate(selectedContract.registrationDate)}</Typography>
                </Grid>
              </Grid>
              
              {selectedContract.contractStatus === 'REGISTERED' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This contract is awaiting NBE approval for forex allocation. Review and approve to enable LC issuance.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedContract(null)}>
            Close
          </AnimatedButton>
          {selectedContract?.contractStatus === 'REGISTERED' && (
            <AnimatedButton
              variant="contained"
              brandColor="#4caf50"
              onClick={() => {
                setApprovalDialogOpen(true);
              }}
            >
              Approve Contract
            </AnimatedButton>
          )}
        </DialogActions>
      </Dialog>

      {/* Forex Detail Dialog */}
      <Dialog open={!!selectedForex && !forexDialogOpen} onClose={() => setSelectedForex(null)} maxWidth="md" fullWidth>
        <DialogTitle>Forex Allocation Details</DialogTitle>
        <DialogContent>
          {selectedForex && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Forex ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedForex.forexId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Contract ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedForex.contractId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter ID</Typography>
                  <Typography variant="body1">{selectedForex.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip status={selectedForex.status} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Requested Amount</Typography>
                  <Typography variant="body1" color="primary" fontWeight={600}>
                    {formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}
                  </Typography>
                </Grid>
                {selectedForex.allocatedAmount > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Allocated Amount</Typography>
                    <Typography variant="body1" color="success.main" fontWeight={600}>
                      {formatCurrency(selectedForex.allocatedAmount, selectedForex.currency)}
                    </Typography>
                  </Grid>
                )}
                {selectedForex.exchangeRate > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Exchange Rate</Typography>
                    <Typography variant="body1">1 {selectedForex.currency} = {selectedForex.exchangeRate} ETB</Typography>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Retention Rate</Typography>
                  <Typography variant="body1">{selectedForex.retentionRate}%</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Request Date</Typography>
                  <Typography variant="body1">{formatDate(selectedForex.requestDate)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Expiry Date</Typography>
                  <Typography variant="body1">{formatDate(selectedForex.expiryDate)}</Typography>
                </Grid>
                {selectedForex.nbeApprovalRef && (
                  <>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">NBE Approval Reference</Typography>
                      <Typography variant="body1" fontWeight={600}>{selectedForex.nbeApprovalRef}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Approved By</Typography>
                      <Typography variant="body1">{selectedForex.nbeOfficer}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              {selectedForex.allocatedAmount > 0 && (
                <Card sx={{ mt: 2, bgcolor: 'action.hover' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Forex Breakdown</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="textSecondary">USD Retained ({selectedForex.retentionRate}%)</Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(selectedForex.allocatedAmount * (selectedForex.retentionRate / 100), selectedForex.currency)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="textSecondary">USD Converted ({100 - selectedForex.retentionRate}%)</Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(selectedForex.allocatedAmount * ((100 - selectedForex.retentionRate) / 100), selectedForex.currency)}
                        </Typography>
                      </Grid>
                      {selectedForex.exchangeRate > 0 && (
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="textSecondary">ETB Equivalent</Typography>
                          <Typography variant="h6">
                            {(selectedForex.allocatedAmount * ((100 - selectedForex.retentionRate) / 100) * selectedForex.exchangeRate).toLocaleString()} ETB
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {selectedForex.status === 'REQUESTED' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This forex allocation request is pending. Allocate forex to proceed with export financing.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedForex(null)}>
            Close
          </AnimatedButton>
          {selectedForex?.status === 'REQUESTED' && (
            <AnimatedButton
              variant="contained"
              brandColor="#4caf50"
              onClick={() => {
                setForexDialogOpen(true);
              }}
            >
              Allocate Forex
            </AnimatedButton>
          )}
        </DialogActions>
      </Dialog>

      {/* Contract Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Contract for Forex Allocation</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>NBE Role:</strong> Approving this contract authorizes foreign exchange allocation. 
                  ECTA has already validated the contract for export compliance.
                </Typography>
              </Alert>
              
              <Typography variant="body1" gutterBottom>
                <strong>Contract ID:</strong> {selectedContract.contractId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>NBE Reference:</strong> {selectedContract.nbeReferenceNumber}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Exporter:</strong> {selectedContract.exporterId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Buyer Country:</strong> {selectedContract.buyerCountry}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Total Value:</strong> {formatCurrency(selectedContract.totalValue)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Minimum Price Compliant:</strong> {selectedContract.minimumPriceCompliant ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>EUDR Required:</strong> {selectedContract.eudrRequired ? 'Yes' : 'No'}
              </Typography>
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                Approving this contract will:
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>Enable forex allocation of {formatCurrency(selectedContract.totalValue)}</li>
                  <li>Apply 40% retention policy (${(selectedContract.totalValue * 0.4).toLocaleString()} retained)</li>
                  <li>Allow banks to issue Letter of Credit</li>
                  <li>Authorize export permit processing</li>
                </ul>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setApprovalDialogOpen(false)} variant="outlined">
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor="#4caf50"
            onClick={() => {
              if (!selectedContract) return;
              handleApproveContract(selectedContract.contractId);
            }}
          >
            Approve for Forex Allocation
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Forex Allocation Dialog */}
      <Dialog open={forexDialogOpen} onClose={() => setForexDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Allocate Forex</DialogTitle>
        <DialogContent>
          {selectedForex && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Allocating forex for {selectedForex.forexId} • Contract: {selectedForex.contractId}
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Requested Amount:</strong> {formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Exporter:</strong> {selectedForex.exporterId}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Allocated Amount"
                    type="number"
                    defaultValue={selectedForex.requestedAmount}
                    helperText="Amount in USD to allocate"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Exchange Rate</InputLabel>
                    <Select defaultValue={exchangeRates.find(r => r.currency === selectedForex.currency)?.midRate || 115.5}>
                      {exchangeRates
                        .filter(r => r.currency === selectedForex.currency && r.status === 'ACTIVE')
                        .map((rate) => (
                          <MenuItem key={rate.rateId} value={rate.midRate}>
                            {rate.midRate.toFixed(2)} ETB (Mid Rate)
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Retention Rate</InputLabel>
                    <Select defaultValue={40}>
                      {retentionPolicies
                        .filter(p => p.status === 'ACTIVE')
                        .map((policy) => (
                          <MenuItem key={policy.policyId} value={policy.retentionRate}>
                            {policy.retentionRate}% - {policy.commodityType}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    defaultValue="2026-09-30"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="NBE Approval Reference"
                    placeholder="NBE/FX/2026/XXXXXX"
                    helperText="NBE internal approval reference number"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Comments"
                    multiline
                    rows={2}
                    placeholder="Additional notes or conditions"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setForexDialogOpen(false)} variant="outlined">
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor={BRAND_COLOR}
            onClick={handleForexAllocation}
          >
            Allocate Forex
          </AnimatedButton>
        </DialogActions>
      </Dialog>

  const handleForexAllocation = async () => {
    if (!selectedForex) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Get form values using more reliable selectors
      const allocatedAmountInput = document.querySelector<HTMLInputElement>('input[placeholder="e.g., 50000"]');
      const exchangeRateInputs = document.querySelectorAll<HTMLSelectElement>('select');
      const expiryDateInput = document.querySelector<HTMLInputElement>('input[type="date"]');
      const nbeApprovalRefInput = document.querySelector<HTMLInputElement>('input[placeholder="NBE/FX/2026/XXXXXX"]');
      const nbeOfficerInput = document.querySelector<HTMLInputElement>('input[placeholder="Officer name"]');

      const payload = {
        forexId: selectedForex.forexId,
        contractId: selectedForex.contractId,
        exporterId: selectedForex.exporterId,
        amount: parseFloat(allocatedAmountInput?.value || selectedForex.requestedAmount.toString()),
        currency: selectedForex.currency,
        exchangeRate: parseFloat(exchangeRateInputs[0]?.value || '115.5'),
        retentionRate: parseInt(exchangeRateInputs[1]?.value || '40'),
        nbeOfficer: nbeOfficerInput?.value || 'NBE Officer',
        nbeApprovalRef: nbeApprovalRefInput?.value || `NBE/FX/${new Date().getFullYear()}/${Date.now()}`,
        expiryDate: expiryDateInput?.value || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      console.log('[NBE] Allocating forex:', payload);

      const response = await fetch('http://localhost:3001/api/v1/forex/allocate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Forex Allocated Successfully!\n\nForex ID: ${selectedForex.forexId}\nAmount: ${payload.currency}${payload.amount.toLocaleString()}\nRate: ${payload.exchangeRate} ETB/${payload.currency}\nRetention: ${payload.retentionRate}%\n\nThe exporter can now proceed with export preparation.`);
        setForexDialogOpen(false);
        setSelectedForex(null);
        loadData();
      } else {
        alert(`❌ Forex Allocation Failed\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('[NBE] Error allocating forex:', error);
      alert(`❌ Network Error\n\nFailed to allocate forex: ${error.message}`);
    }
  };

  const handleSetExchangeRate = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Get form values
      const currencySelect = document.querySelector<HTMLSelectElement>('select');
      const textFields = document.querySelectorAll<HTMLInputElement>('input[type="number"]');
      const dateInput = document.querySelector<HTMLInputElement>('input[type="date"]');
      const justificationInput = document.querySelector<HTMLTextAreaElement>('textarea');

      const payload = {
        currency: currencySelect?.value || 'USD',
        buyingRate: parseFloat(textFields[0]?.value || '115.0'),
        sellingRate: parseFloat(textFields[1]?.value || '116.0'),
        effectiveDate: dateInput?.value || new Date().toISOString().split('T')[0],
        justification: justificationInput?.value || 'Exchange rate update per NBE policy',
        setBy: 'NBE Officer', // Could be from user context
      };

      console.log('[NBE] Setting exchange rate:', payload);

      const response = await fetch('http://localhost:3001/api/v1/forex/rate/set', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Exchange Rate Set Successfully!\n\nCurrency: ${payload.currency}\nBuying Rate: ${payload.buyingRate} ETB\nSelling Rate: ${payload.sellingRate} ETB\nEffective: ${payload.effectiveDate}\n\nPrevious rate has been superseded.`);
        setRateDialogOpen(false);
        loadData();
      } else {
        alert(`❌ Failed to Set Exchange Rate\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('[NBE] Error setting exchange rate:', error);
      alert(`❌ Network Error\n\nFailed to set exchange rate: ${error.message}`);
    }
  };

      {/* Exchange Rate Setting Dialog */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Exchange Rate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Setting a new exchange rate will supersede the current active rate for the selected currency.
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select defaultValue="USD">
                    <MenuItem value="USD">USD - United States Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buying Rate (ETB)"
                  type="number"
                  placeholder="115.00"
                  helperText="NBE buying rate"
                  inputProps={{ step: "0.01" }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Selling Rate (ETB)"
                  type="number"
                  placeholder="116.00"
                  helperText="NBE selling rate"
                  inputProps={{ step: "0.01" }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Effective Date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Justification"
                  multiline
                  rows={3}
                  placeholder="Economic justification for rate change"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setRateDialogOpen(false)} variant="outlined">
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor={BRAND_COLOR}
            onClick={handleSetExchangeRate}
          >
            Set Rate
          </AnimatedButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NBEPortal;