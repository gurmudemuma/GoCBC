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
  Snackbar,
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
  DirectionsBoat,
  FlightTakeoff,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { SalesContract } from '@/types';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import { apiFetch } from '@/config/api.config';
import SWIFTMonitoringWrapper from '@/components/nbe/SWIFTMonitoringWrapper';

// Transport Mode Type
type TransportMode = 'SEA' | 'AIR';

// Extended SalesContract with transport mode
interface ContractWithTransport extends SalesContract {
  transportMode?: TransportMode;
}

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
  transportMode?: TransportMode;
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

interface BankingMetrics {
  totalExports: number;
  forexVolume: number;
  complianceRate: number;
  avgProcessingTime: number;
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

const StatusChip: React.FC<{ status: string }> = ({ status }) => (
  <Chip
    label={status}
    size="small"
    sx={{
      backgroundColor: getStatusColor(status, 'NBE'),
      color: 'white',
    }}
  />
);

const NBEPortal: React.FC = () => {
  // NBE Brand Colors
  const BRAND_COLOR = '#8B6F47';  // Bronze
  const SECONDARY_COLOR = '#C4A574';  // Light Bronze
  
  // CBE Colors (for banking/forex context)
  const CBE_PURPLE = '#9b30b7';
  const CBE_GOLDEN = '#FFD700';
  const CBE_BLACK = '#000000';
  const CBE_WHITE = '#ffffff';
  
  const [tabValue, setTabValue] = useState(0);
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [forexAllocations, setForexAllocations] = useState<ForexAllocation[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [bankingMetrics, setBankingMetrics] = useState<BankingMetrics>({
    totalExports: 0,
    forexVolume: 0,
    complianceRate: 0,
    avgProcessingTime: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithTransport | null>(null);
  const [selectedForex, setSelectedForex] = useState<ForexAllocation | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [forexDialogOpen, setForexDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  // Document Validation Dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);

  const [approvalNotification, setApprovalNotification] = useState<{open: boolean, success: boolean, message: string}>({
    open: false, success: false, message: ''
  });

  const [forexForm, setForexForm] = useState({
    allocatedAmount: '',
    exchangeRate: '115.50',
    retentionRate: '40',
    nbeOfficer: '',
    nbeApprovalRef: '',
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load real contracts data from API
      const contractsRes = await api.getContracts();
      if (contractsRes.success) {
        const allContracts = contractsRes.data || [];
        setContracts(allContracts);
        console.log(`Loaded ${allContracts.length} contracts from API`);
      }

      // Load real forex allocations from API
      try {
        const forexRes = await api.get('/forex');
        if (forexRes.data.success) {
          const forexData = (forexRes.data.data || []).map((forex: any) => ({
            forexId: forex.ForexID || forex.forexId || '',
            contractId: forex.ContractID || forex.contractId || '',
            exporterId: forex.ExporterID || forex.exporterId || '',
            requestedAmount: parseFloat(forex.RequestedAmount || forex.requestedAmount || '0'),
            allocatedAmount: parseFloat(forex.AllocatedAmount || forex.allocatedAmount || '0'),
            currency: forex.Currency || forex.currency || 'USD',
            exchangeRate: parseFloat(forex.ExchangeRate || forex.exchangeRate || '0'),
            officialRate: parseFloat(forex.OfficialRate || forex.officialRate || '115.50'),
            retentionRate: parseFloat(forex.RetentionRate || forex.retentionRate || '40'),
            status: forex.Status || forex.status || 'REQUESTED',
            requestDate: forex.RequestDate || forex.requestDate || new Date().toISOString(),
            approvalDate: forex.ApprovalDate || forex.approvalDate,
            allocationDate: forex.AllocationDate || forex.allocationDate,
            expiryDate: forex.ExpiryDate || forex.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            nbeOfficer: forex.NBEOfficer || forex.nbeOfficer,
            nbeApprovalRef: forex.NBEApprovalRef || forex.nbeApprovalRef,
          }));
          setForexAllocations(forexData);
          console.log(`Loaded ${forexData.length} forex allocations from API`);
        }
      } catch (error) {
        console.warn('Could not load forex data, using empty array:', error);
        setForexAllocations([]);
      }

      // Load mock data for exchange rates
      const mockRates: ExchangeRate[] = [
        {
          rateId: 'RATE20260704001',
          currency: 'USD',
          buyingRate: 115.0,
          sellingRate: 116.0,
          midRate: 115.5,
          effectiveDate: '2026-07-04',
          status: 'ACTIVE',
        },
        {
          rateId: 'RATE20260704002',
          currency: 'EUR',
          buyingRate: 125.0,
          sellingRate: 126.5,
          midRate: 125.75,
          effectiveDate: '2026-07-04',
          status: 'ACTIVE',
        },
        {
          rateId: 'RATE20260704003',
          currency: 'GBP',
          buyingRate: 145.0,
          sellingRate: 147.0,
          midRate: 146.0,
          effectiveDate: '2026-07-04',
          status: 'ACTIVE',
        }
      ];
      setExchangeRates(mockRates);

      // Calculate banking metrics
      try {
        const metricsRes = await api.getBankingMetrics();
        if (metricsRes.success && metricsRes.data) {
          setBankingMetrics(metricsRes.data);
          console.log('Loaded banking metrics from analytics API:', metricsRes.data);
        } else {
          // Fallback metrics
          const fallbackMetrics: BankingMetrics = {
            totalExports: 1250000000,
            forexVolume: 500000000,
            complianceRate: 96.8,
            avgProcessingTime: 2.3
          };
          setBankingMetrics(fallbackMetrics);
        }
      } catch (error) {
        console.warn('Could not load banking metrics from API, using fallback:', error);
        const fallbackMetrics: BankingMetrics = {
          totalExports: 1250000000,
          forexVolume: 500000000,
          complianceRate: 96.8,
          avgProcessingTime: 2.3
        };
        setBankingMetrics(fallbackMetrics);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContractStats = () => {
    const total = contracts.length;
    const approved = contracts.filter(c => c.contractStatus === 'APPROVED').length;
    const pending = contracts.filter(c => c.contractStatus === 'REGISTERED').length;
    const totalValue = contracts.reduce((sum, contract) => sum + contract.totalValue, 0);
    return { total, approved, pending, totalValue };
  };

  const handleApproveContract = async (contract: ContractWithTransport) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const nbeOfficer = user.username || 'NBE Officer';

      const result = await api.approveContractForForex(contract.contractId, nbeOfficer);
      
      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Contract ${contract.contractId} approved for forex allocation`
        });
        await loadData();
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to approve contract'
        });
      }
    } catch (error: any) {
      console.error('Error approving contract:', error);
      setApprovalNotification({
        open: true,
        success: false,
        message: error.response?.data?.error?.message || 'Failed to approve contract'
      });
    } finally {
      setLoading(false);
      setApprovalDialogOpen(false);
      setSelectedContract(null);
    }
  };

  const handleAllocateForex = async () => {
    if (!selectedForex) return;

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Find the LC associated with this contract
      let lcId = '';
      try {
        const lcResponse = await api.get('/banking/lc');
        if (lcResponse.data.success && lcResponse.data.data) {
          const matchingLC = lcResponse.data.data.find((lc: any) => 
            (lc.ContractID || lc.contractId) === selectedForex.contractId
          );
          if (matchingLC) {
            lcId = matchingLC.LCID || matchingLC.lcId || '';
          }
        }
      } catch (error) {
        console.warn('Could not fetch LC for contract:', error);
      }

      if (!lcId) {
        setApprovalNotification({
          open: true,
          success: false,
          message: 'No Letter of Credit found for this contract. Please ensure an LC is issued first.'
        });
        setLoading(false);
        return;
      }
      
      const allocationData = {
        forexId: selectedForex.forexId,
        lcId: lcId,
        amount: parseFloat(forexForm.allocatedAmount),
        exchangeRate: parseFloat(forexForm.exchangeRate),
        retentionRate: parseFloat(forexForm.retentionRate),
        nbeOfficer: forexForm.nbeOfficer || user.username || 'NBE Officer',
        nbeApprovalRef: forexForm.nbeApprovalRef,
        expiryDate: forexForm.expiryDate,
      };

      const result = await api.allocateForex(allocationData);
      
      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Forex allocation completed: ${formatCurrency(allocationData.amount, selectedForex.currency)}`
        });
        await loadData();
        setForexForm({
          allocatedAmount: '',
          exchangeRate: '115.50',
          retentionRate: '40',
          nbeOfficer: '',
          nbeApprovalRef: '',
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to allocate forex'
        });
      }
    } catch (error: any) {
      console.error('Error allocating forex:', error);
      setApprovalNotification({
        open: true,
        success: false,
        message: error.response?.data?.error?.message || 'Failed to allocate forex'
        });
    } finally {
      setLoading(false);
      setForexDialogOpen(false);
      setSelectedForex(null);
    }
  };

  const stats = getContractStats();

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
      field: 'contractStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Contract Details">
            <IconButton 
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedContract(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.contractStatus === 'REGISTERED' && (
            <>
              <Tooltip title="Approve for Forex Allocation">
                <IconButton 
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContract(params.row);
                    setApprovalDialogOpen(true);
                  }}
                >
                  <CheckCircle />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Contract">
                <IconButton 
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    const reason = prompt(
                      `Reject Contract ${params.row.contractId}?\n\n` +
                      `Reasons:\n` +
                      `- Insufficient documentation\n` +
                      `- Value exceeds exporter capacity\n` +
                      `- Buyer country restrictions\n` +
                      `- Regulatory non-compliance\n` +
                      `- Incorrect contract terms\n\n` +
                      `Enter rejection reason:`
                    );
                    if (reason) {
                      alert(
                        `Contract ${params.row.contractId} rejected.\n\n` +
                        `Reason: ${reason}\n\n` +
                        `Exporter and bank will be notified.`
                      );
                    }
                  }}
                >
                  <Cancel />
                </IconButton>
              </Tooltip>
            </>
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
      width: 200,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Forex Details">
            <IconButton 
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedForex(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.status === 'REQUESTED' && (
            <>
              <Tooltip title="Allocate Forex">
                <IconButton 
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedForex(params.row);
                    setForexDialogOpen(true);
                  }}
                >
                  <CheckCircle />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Forex Request">
                <IconButton 
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    const reason = prompt(
                      `Reject Forex Request ${params.row.forexId}?\n\n` +
                      `Reasons:\n` +
                      `- Insufficient reserves\n` +
                      `- Amount exceeds limits\n` +
                      `- Contract not approved\n` +
                      `- Missing LC documentation\n` +
                      `- Policy restrictions\n\n` +
                      `Enter rejection reason:`
                    );
                    if (reason) {
                      alert(
                        `Forex Request ${params.row.forexId} rejected.\n\n` +
                        `Reason: ${reason}\n\n` +
                        `Bank and exporter will be notified.`
                      );
                    }
                  }}
                >
                  <Cancel />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];
  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Professional Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <AccountBalance sx={{ fontSize: 32, color: BRAND_COLOR }} />
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: '#333' }}>
              NBE Portal
            </Typography>
            <Typography variant="body2" color="textSecondary">
              National Bank of Ethiopia - Contract Approval & Forex Allocation Management
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<Download />}
            sx={{ 
              textTransform: 'none',
              borderColor: BRAND_COLOR,
              color: BRAND_COLOR,
            }}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Dynamic KPI Cards - Changes based on active tab */}
      <Grid container spacing={2} mb={3}>
        {/* Contract Approvals Tab KPIs */}
        {tabValue === 0 && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Assignment sx={{ fontSize: 20, color: '#666' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Total Contracts
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {stats.total}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +7.9%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Approved
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Ready for forex
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {stats.approved}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +10%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Warning sx={{ fontSize: 20, color: '#ff9800' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Pending Review
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Awaiting review
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {stats.pending}
                  </Typography>
                  <Box mt={1}>
                    <Typography variant="caption" sx={{ color: stats.pending > 0 ? '#ff9800' : '#4caf50', fontWeight: 600 }}>
                      {stats.pending > 0 ? '⚠ Needs approval' : '✓ All clear'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance sx={{ fontSize: 20, color: BRAND_COLOR }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Total Value (USD)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Contract value
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {formatCurrency(stats.totalValue)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +15%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
        {/* Forex Allocations Tab KPIs */}
        {tabValue === 1 && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: `2px solid ${CBE_PURPLE}`,
                boxShadow: '0 4px 8px rgba(155,48,183,0.15)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Warning sx={{ fontSize: 20, color: CBE_PURPLE }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Pending Requests
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Awaiting allocation
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: CBE_PURPLE }}>
                    {forexAllocations.filter(f => f.status === 'REQUESTED').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: `2px solid ${CBE_GOLDEN}`,
                boxShadow: '0 4px 8px rgba(255,215,0,0.15)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: CBE_GOLDEN }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Total Allocated
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    USD amount
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: CBE_GOLDEN, textShadow: '0 0 1px rgba(0,0,0,0.3)' }}>
                    {formatCurrency(forexAllocations
                      .filter(f => f.status === 'ALLOCATED')
                      .reduce((sum, f) => sum + f.allocatedAmount, 0))}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +18%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: CBE_BLACK,
                border: `2px solid ${CBE_GOLDEN}`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TrendingUp sx={{ fontSize: 20, color: CBE_GOLDEN }} />
                    <Typography variant="caption" sx={{ color: CBE_WHITE }} textTransform="uppercase" fontWeight={600}>
                      Utilization Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: CBE_WHITE }} display="block">
                    Efficiency metric
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: CBE_GOLDEN }}>
                    87.5%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: `2px solid ${CBE_PURPLE}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance sx={{ fontSize: 20, color: BRAND_COLOR }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Retention Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    NBE policy
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    40%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Exchange Rates Tab KPIs */}
        {tabValue === 2 && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: '#1976d2' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      USD Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current mid-rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {exchangeRates.find(r => r.currency === 'USD')?.midRate.toFixed(2) || '115.50'} ETB
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +0.5%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: '#673ab7' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      EUR Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current mid-rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {exchangeRates.find(r => r.currency === 'EUR')?.midRate.toFixed(2) || '125.75'} ETB
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +1.2%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: '#ff5722' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      GBP Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current mid-rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {exchangeRates.find(r => r.currency === 'GBP')?.midRate.toFixed(2) || '146.00'} ETB
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +0.8%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance sx={{ fontSize: 20, color: BRAND_COLOR }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Last Updated
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Rate effective date
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#333' }}>
                    Today
                  </Typography>
                  <Typography variant="caption" sx={{ color: BRAND_COLOR, fontWeight: 600 }}>
                    {formatDate(new Date().toISOString())}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Professional Tabs Container */}
      <Card sx={{ 
        bgcolor: 'white',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
                minHeight: '56px',
              },
              '& .Mui-selected': {
                color: BRAND_COLOR,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: BRAND_COLOR,
                height: 3,
              }
            }}
          >
            <Tab label="Contract Approvals" />
            <Tab label="Forex Allocations" />
            <Tab label="Exchange Rates" />
            <Tab label="SWIFT Monitoring" />
            <Tab label="Compliance" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <Box px={3} pt={3}>
            <Alert severity="info" sx={{ mb: 3, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
              <Typography variant="body2" sx={{ color: '#e65100' }}>
                <strong>NBE Role:</strong> Contracts shown here have been registered by ECTA after validating export compliance.
                NBE approves contracts to authorize foreign exchange allocation. Only APPROVED contracts can proceed to forex allocation and LC issuance.
              </Typography>
            </Alert>
          </Box>
          
          <Box sx={{ bgcolor: 'white', px: 3, pb: 3 }}>
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
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#fafafa',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#666',
                  borderBottom: '2px solid #e0e0e0',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f5f5f5',
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: '#f9f9f9',
                },
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={3} pt={3}>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#333', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CurrencyExchange sx={{ fontSize: 24, color: BRAND_COLOR }} />
                Forex Allocation Management
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manage foreign exchange allocations for approved export contracts
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                sx={{ 
                  textTransform: 'none',
                  borderColor: '#ccc',
                  color: '#666'
                }}
              >
                Export Report
              </Button>
            </Box>
          </Box>

          <Box sx={{ bgcolor: 'white', px: 3, pb: 3 }}>
            <DataGrid
              rows={forexAllocations}
              columns={forexColumns}
              getRowId={(row) => row.forexId}
              loading={loading}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              sx={{
                border: `2px solid ${CBE_PURPLE}`,
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: CBE_BLACK,
                  fontWeight: 700,
                  fontSize: '13px',
                  color: CBE_GOLDEN,
                  borderBottom: `2px solid ${CBE_PURPLE}`,
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #f5f5f5',
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: 'rgba(155, 48, 183, 0.05)',
                },
              }}
            />
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CurrencyExchange sx={{ fontSize: 24, color: BRAND_COLOR }} />
                Exchange Rate Management
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Official NBE exchange rates • Last updated: {formatDate(new Date().toISOString())}
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button variant="outlined" startIcon={<Download />} sx={{ textTransform: 'none' }}>
                Export Rates
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                sx={{ textTransform: 'none', bgcolor: BRAND_COLOR }}
                onClick={() => setRateDialogOpen(true)}
              >
                Update Rates
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {exchangeRates.map((rate) => (
              <Grid item xs={12} md={4} key={rate.rateId}>
                <Card sx={{ 
                  border: '2px solid',
                  borderColor: rate.status === 'ACTIVE' ? 'success.main' : 'grey.300',
                  bgcolor: rate.status === 'ACTIVE' ? '#f1f8e9' : 'grey.100'
                }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h4" fontWeight={700}>{rate.currency}</Typography>
                      <Chip label={rate.status} color={rate.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
                    </Box>
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      {rate.midRate.toFixed(2)} ETB
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Effective: {formatDate(rate.effectiveDate)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* SWIFT Monitoring Tab - Uses NBE colors (Bronze) not CBE colors */}
          <SWIFTMonitoringWrapper 
            primaryColor={BRAND_COLOR}
            secondaryColor={SECONDARY_COLOR}
            accentColor="#333333"
          />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ fontSize: 24, color: BRAND_COLOR }} />
            Regulatory Compliance Dashboard
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Compliance Metrics</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Minimum Price Compliance: {bankingMetrics.complianceRate}%
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">EUDR Documentation: 98.2%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Regulatory Updates 2026</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    • Enhanced capital requirements implemented
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
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
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ fontSize: 24, color: BRAND_COLOR }} />
            Banking Analytics & Insights
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={700} color="primary">{formatCurrency(bankingMetrics.totalExports)}</Typography>
                  <Typography variant="body2" color="textSecondary">Total Export Value</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#f3e5f5' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={700} color="secondary">{formatCurrency(bankingMetrics.forexVolume)}</Typography>
                  <Typography variant="body2" color="textSecondary">Forex Allocated</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#e8f5e8' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={700} color="success.main">{bankingMetrics.complianceRate}%</Typography>
                  <Typography variant="body2" color="textSecondary">Compliance Rate</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: '#fff3e0' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{bankingMetrics.avgProcessingTime}d</Typography>
                  <Typography variant="body2" color="textSecondary">Avg Processing Time</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Approval result notification */}
      <Snackbar
        open={approvalNotification.open}
        autoHideDuration={5000}
        onClose={() => setApprovalNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={approvalNotification.success ? 'success' : 'error'}
          onClose={() => setApprovalNotification(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%', minWidth: 360 }}
          variant="filled"
        >
          {approvalNotification.message}
        </Alert>
      </Snackbar>
      {/* Contract Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Contract for Forex Allocation</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>NBE Approval:</strong> This will approve the contract for foreign exchange allocation eligibility.
                  Only contracts meeting minimum price requirements should be approved.
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contract ID"
                    value={selectedContract.contractId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Exporter ID"
                    value={selectedContract.exporterId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contract Value"
                    value={formatCurrency(selectedContract.totalValue)}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Min Price Compliant"
                    value={selectedContract.minimumPriceCompliant ? 'Yes' : 'No'}
                    disabled
                    sx={{
                      '& .MuiInputBase-input': {
                        color: selectedContract.minimumPriceCompliant ? '#4caf50' : '#f44336'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Coffee Type & Quality"
                    value={`${selectedContract.coffeeType} - ${selectedContract.quantity} kg`}
                    disabled
                  />
                </Grid>
                
                {/* Transport Mode Display */}
                {selectedContract?.transportMode && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Transport Method & Timeline
                    </Typography>
                    <Box>
                      <Chip 
                        icon={selectedContract.transportMode === 'AIR' ? 
                          <FlightTakeoff /> : <DirectionsBoat />}
                        label={selectedContract.transportMode === 'AIR' ? 
                          'Air Freight' : 'Sea Freight'}
                        size="small"
                        color={selectedContract.transportMode === 'AIR' ? 
                          'secondary' : 'primary'}
                        sx={{ fontWeight: 600 }}
                      />
                      <Typography variant="caption" sx={{ 
                        display: 'block', 
                        mt: 0.5,
                        color: 'text.secondary'
                      }}>
                        Expected export completion: {
                          selectedContract.transportMode === 'AIR' ? 
                          '5-10 days' : '35-45 days'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                )}
                
                {/* Air Freight Forex Realization Alert */}
                {selectedContract?.transportMode === 'AIR' && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Faster Forex Realization:</strong> Air freight enables rapid export completion and payment 
                        receipt, improving forex retention timeline and exporter liquidity (typically 12-15 days vs 40-45 days for sea freight).
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Approval Comments"
                    multiline
                    rows={3}
                    placeholder="NBE approval comments and justification"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            variant="contained"
            disabled={!selectedContract?.minimumPriceCompliant}
            sx={{ 
              bgcolor: BRAND_COLOR, 
              '&:hover': { bgcolor: SECONDARY_COLOR },
              '&:disabled': { bgcolor: '#ccc' }
            }}
            onClick={() => handleApproveContract(selectedContract!)}
          >
            Approve for Forex
          </Button>
        </DialogActions>
      </Dialog>
      {/* Forex Allocation Dialog */}
      <Dialog open={forexDialogOpen} onClose={() => setForexDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: CBE_BLACK, color: CBE_GOLDEN, fontWeight: 700 }}>
          Allocate Foreign Exchange
        </DialogTitle>
        <DialogContent>
          {selectedForex && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3, bgcolor: 'rgba(155, 48, 183, 0.1)', borderLeft: `4px solid ${CBE_PURPLE}` }}>
                <Typography variant="body2">
                  <strong>NBE Forex Allocation:</strong> This will allocate foreign exchange for the approved export contract.
                  Ensure all details are correct as this cannot be easily reversed.
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Forex Request ID"
                    value={selectedForex.forexId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Requested Amount"
                    value={formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Allocated Amount"
                    type="number"
                    value={forexForm.allocatedAmount}
                    onChange={(e) => setForexForm(prev => ({ ...prev, allocatedAmount: e.target.value }))}
                    placeholder="Enter allocated amount"
                    helperText={`Max: ${formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}`}
                    inputProps={{ 
                      step: "0.01",
                      max: selectedForex.requestedAmount
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Exchange Rate (ETB)"
                    type="number"
                    value={forexForm.exchangeRate}
                    onChange={(e) => setForexForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                    helperText="Current NBE official rate"
                    inputProps={{ step: "0.01" }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Retention Rate (%)"
                    type="number"
                    value={forexForm.retentionRate}
                    onChange={(e) => setForexForm(prev => ({ ...prev, retentionRate: e.target.value }))}
                    helperText="NBE retention policy rate"
                    inputProps={{ step: "0.1", min: "0", max: "100" }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="NBE Officer"
                    value={forexForm.nbeOfficer}
                    onChange={(e) => setForexForm(prev => ({ ...prev, nbeOfficer: e.target.value }))}
                    placeholder="NBE approving officer"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="NBE Approval Reference"
                    value={forexForm.nbeApprovalRef}
                    onChange={(e) => setForexForm(prev => ({ ...prev, nbeApprovalRef: e.target.value }))}
                    placeholder="NBE-FX-2026-XXXX"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    value={forexForm.expiryDate}
                    onChange={(e) => setForexForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    helperText="Forex allocation validity"
                  />
                </Grid>
                
                {/* Transport Mode Display in Forex Dialog */}
                {selectedForex.transportMode && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: selectedForex.transportMode === 'AIR' ? '#fff3e0' : '#e3f2fd',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: selectedForex.transportMode === 'AIR' ? '#ffb74d' : '#90caf9'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {selectedForex.transportMode === 'AIR' ? (
                          <FlightTakeoff color="secondary" />
                        ) : (
                          <DirectionsBoat color="primary" />
                        )}
                        <Typography variant="subtitle2" fontWeight={600}>
                          {selectedForex.transportMode === 'AIR' ? 'Air Freight Export' : 'Sea Freight Export'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>Expected Timeline:</strong> {
                          selectedForex.transportMode === 'AIR' ? 
                          '12-15 days total (1-3 days transit + 3-7 days document processing + 5 days settlement)' :
                          '40-45 days total (25-35 days transit + 30-40 days document processing)'
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        <strong>Forex Realization:</strong> {
                          selectedForex.transportMode === 'AIR' ? 
                          'Faster payment settlement enables quicker forex retention compliance' :
                          'Standard timeline for document presentation and payment'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForexDialogOpen(false)} variant="outlined" sx={{ borderColor: CBE_PURPLE, color: CBE_PURPLE }}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            disabled={!forexForm.allocatedAmount || !forexForm.nbeOfficer || !forexForm.nbeApprovalRef}
            sx={{ 
              bgcolor: CBE_PURPLE, 
              color: CBE_WHITE,
              fontWeight: 600,
              '&:hover': { bgcolor: '#7a2692' },
              '&:disabled': { bgcolor: '#cccccc' }
            }}
            onClick={handleAllocateForex}
          >
            Allocate Forex
          </Button>
        </DialogActions>
      </Dialog>
      {/* Exchange Rate Update Dialog */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Exchange Rate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Setting a new exchange rate will supersede the current active rate for the selected currency.
            </Alert>
            <Grid container spacing={2}>
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
          <Button onClick={() => setRateDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            variant="contained"
            sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: SECONDARY_COLOR } }}
            onClick={() => setRateDialogOpen(false)}
          >
            Set Rate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Validation Dialog */}
      <DocumentValidationDialog
        open={validationDialogOpen}
        onClose={() => {
          setValidationDialogOpen(false);
          setValidationData(null);
        }}
        data={validationData}
        readOnly={true}
      />
    </Box>
  );
};

export default NBEPortal;