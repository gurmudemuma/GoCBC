// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Banks Portal - Export Permit Issuance & Multi-Bank Authorization

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  AccountBalance,
  CurrencyExchange,
  Assignment,
  Visibility,
  Download,
  Warning,
  Security,
  TrendingUp,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor, getChartColors } from '@/utils/api';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';

interface ExportPermit {
  permitId: string;
  contractId: string;
  exporterId: string;
  bankName: string;
  permitType: 'STANDARD' | 'FRANCO_VALUTA' | 'DIASPORA';
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'ISSUED' | 'UTILIZED' | 'EXPIRED';
  requestDate: string;
  approvalDate?: string;
  expiryDate: string;
  authorizingBanks: string[];
}

interface LetterOfCredit {
  lcId: string;
  contractId: string;
  exporterId: string;
  bankName: string;
  issuingBank: string;
  beneficiaryBank: string;
  beneficiary: string;
  amount: number;
  currency: string;
  status: 'REQUESTED' | 'APPROVED' | 'ISSUED' | 'UTILIZED' | 'EXPIRED';
  expiryDate: string;
  requestDate: string;
  approvalDate?: string;
  issueDate?: string;
  terms?: string;
}

interface Payment {
  paymentId: string;
  contractId: string;
  exporterId: string;
  lcId: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  retainedAmount: number;
  convertedAmount: number;
  amountBirr: number;
  status: 'PENDING' | 'DOCUMENTS_SUBMITTED' | 'VERIFIED' | 'SWIFT_INITIATED' | 'SWIFT_RECEIVED' | 'SETTLED';
  paymentMethod: 'SWIFT_MT103' | 'SWIFT_MT700' | 'TT';
  receivingBank: string;
  receivingBankBIC: string;
  payingBank?: string;
  payingBankBIC?: string;
  swiftReference?: string;
  swiftStatus?: 'SENT' | 'IN_TRANSIT' | 'RECEIVED' | 'SETTLED';
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

const BanksPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [permits, setPermits] = useState<ExportPermit[]>([]);
  const [lcs, setLcs] = useState<LetterOfCredit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<ExportPermit | null>(null);
  const [selectedLC, setSelectedLC] = useState<LetterOfCredit | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [lcDialogOpen, setLcDialogOpen] = useState(false);
  const [swiftDialogOpen, setSwiftDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  // Mock export permits data
  const mockPermits: ExportPermit[] = [
    {
      permitId: 'EP2026001',
      contractId: 'CONTRACT2026001',
      exporterId: 'EXP2026001',
      bankName: 'Commercial Bank of Ethiopia',
      permitType: 'STANDARD',
      amount: 18500,
      currency: 'USD',
      status: 'APPROVED',
      requestDate: '2026-05-31T10:00:00Z',
      approvalDate: '2026-05-31T14:30:00Z',
      expiryDate: '2026-08-31T23:59:59Z',
      authorizingBanks: ['CBE', 'DBE', 'AIB'],
    },
    {
      permitId: 'EP2026002',
      contractId: 'CONTRACT2026002',
      exporterId: 'EXP2026002',
      bankName: 'Development Bank of Ethiopia',
      permitType: 'FRANCO_VALUTA',
      amount: 25000,
      currency: 'EUR',
      status: 'PENDING',
      requestDate: '2026-05-31T09:15:00Z',
      expiryDate: '2026-09-30T23:59:59Z',
      authorizingBanks: ['DBE', 'CBE'],
    },
  ];

  const mockLCs: LetterOfCredit[] = [
    {
      lcId: 'LC20260603001',
      contractId: 'CONTRACT2026001',
      exporterId: 'EXP2026001',
      bankName: 'Commercial Bank of Ethiopia',
      issuingBank: 'Commercial Bank of Ethiopia',
      beneficiaryBank: 'Deutsche Bank AG',
      beneficiary: 'Ethiopian Coffee Exporter Ltd',
      amount: 50000,
      currency: 'USD',
      status: 'ISSUED',
      expiryDate: '2026-12-31',
      requestDate: '2026-06-01T10:00:00Z',
      approvalDate: '2026-06-01T14:00:00Z',
      issueDate: '2026-06-02T09:00:00Z',
      terms: 'Documentary credit payable at sight',
    },
    {
      lcId: 'LC20260603002',
      contractId: 'CONTRACT2026002',
      exporterId: 'EXP2026002',
      bankName: 'Development Bank of Ethiopia',
      issuingBank: 'Development Bank of Ethiopia',
      beneficiaryBank: 'HSBC Bank',
      beneficiary: 'Coffee Export Company',
      amount: 75000,
      currency: 'USD',
      status: 'REQUESTED',
      expiryDate: '2026-11-30',
      requestDate: '2026-06-03T08:00:00Z',
    },
  ];

  const mockPayments: Payment[] = [
    {
      paymentId: 'PAY20260603001',
      contractId: 'CONTRACT2026001',
      exporterId: 'EXP2026001',
      lcId: 'LC20260603001',
      amount: 50000,
      currency: 'USD',
      exchangeRate: 115.5,
      retentionRate: 40,
      retainedAmount: 20000,
      convertedAmount: 30000,
      amountBirr: 3465000,
      status: 'SWIFT_RECEIVED',
      paymentMethod: 'SWIFT_MT103',
      receivingBank: 'Commercial Bank of Ethiopia',
      receivingBankBIC: 'CBETETAA',
      payingBank: 'Deutsche Bank AG',
      payingBankBIC: 'DEUTDEFF',
      swiftReference: 'SWIFT2026060300123456',
      swiftStatus: 'RECEIVED',
    },
  ];

  const permitTrendsData = [
    { month: 'Jan', standard: 45, francoValuta: 12, diaspora: 8 },
    { month: 'Feb', standard: 52, francoValuta: 15, diaspora: 10 },
    { month: 'Mar', standard: 48, francoValuta: 18, diaspora: 12 },
    { month: 'Apr', standard: 55, francoValuta: 22, diaspora: 14 },
    { month: 'May', standard: 58, francoValuta: 25, diaspora: 16 },
  ];

  const bankPerformanceData = [
    { bank: 'CBE', permits: 145, value: 2500000, avgProcessing: 2.1 },
    { bank: 'DBE', permits: 98, value: 1800000, avgProcessing: 1.8 },
    { bank: 'AIB', permits: 76, value: 1200000, avgProcessing: 2.3 },
    { bank: 'BOA', permits: 65, value: 950000, avgProcessing: 2.0 },
    { bank: 'UB', permits: 54, value: 780000, avgProcessing: 2.5 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // In real implementation, load from API
      setPermits(mockPermits);
      setLcs(mockLCs);
      setPayments(mockPayments);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePermit = async (permitId: string) => {
    try {
      // In real implementation, call API
      console.log('Approving permit:', permitId);
      setApprovalDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to approve permit:', error);
    }
  };

  const handleApproveLC = async (lcId: string) => {
    try {
      // Call API: POST /api/v1/banking/lc/approve
      console.log('Approving LC:', lcId);
      setLcDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to approve LC:', error);
    }
  };

  const handleInitiateSWIFT = async (paymentId: string, swiftData: any) => {
    try {
      // Call API: POST /api/v1/banking/payment/:paymentId/swift/initiate
      console.log('Initiating SWIFT:', paymentId, swiftData);
      setSwiftDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to initiate SWIFT:', error);
    }
  };

  const handleSettlePayment = async (paymentId: string, settlementData: any) => {
    try {
      // Call API: POST /api/v1/banking/payment/:paymentId/settle
      console.log('Settling payment:', paymentId, settlementData);
      setSettlementDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to settle payment:', error);
    }
  };
  const permitColumns: GridColDef[] = [
    { field: 'permitId', headerName: 'Permit ID', width: 130 },
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    { field: 'bankName', headerName: 'Issuing Bank', width: 180 },
    {
      field: 'permitType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'STANDARD' ? 'primary' :
            params.value === 'FRANCO_VALUTA' ? 'secondary' : 'success'
          }
        />
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      renderCell: (params) => formatCurrency(params.value, params.row.currency),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip
          status={params.value === 'PENDING' ? 'PENDING' : params.value === 'APPROVED' ? 'APPROVED' : 'ACTIVE'}
        />
      ),
    },
    { field: 'requestDate', headerName: 'Request Date', width: 130, renderCell: (params) => formatDate(params.value) },
    { field: 'expiryDate', headerName: 'Expiry Date', width: 130, renderCell: (params) => formatDate(params.value) },
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
                setSelectedPermit(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.status === 'PENDING' && (
            <Tooltip title="Approve Permit">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPermit(params.row);
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
  const getPermitStats = () => {
    const total = permits.length;
    const approved = permits.filter(p => p.status === 'APPROVED').length;
    const pending = permits.filter(p => p.status === 'PENDING').length;
    const totalValue = permits.reduce((sum, permit) => sum + permit.amount, 0);

    return { total, approved, pending, totalValue };
  };

  const stats = getPermitStats();

  // Brand colors for Banks Portal
  const brandPrimary = '#9b30b7'; // Purple
  const brandSecondary = '#FFD700'; // Golden

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🏦 Banks Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Multi-Bank Export Permit System & Franco Valuta Management
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <AnimatedButton
            variant="outlined"
            startIcon={<Download />}
            brandColor={brandPrimary}
          >
            Export Report
          </AnimatedButton>
          <AnimatedButton
            variant="contained"
            startIcon={<Add />}
            brandColor={brandPrimary}
          >
            New Permit
          </AnimatedButton>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Permits"
            value={stats.total}
            icon={<Assignment />}
            trend="up"
            trendValue="+12%"
            brandColor={brandPrimary}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle />}
            trend="up"
            trendValue="+8%"
            brandColor={brandSecondary}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Pending Review"
            value={stats.pending}
            icon={<Warning />}
            trend="down"
            trendValue="-3%"
            brandColor={brandPrimary}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Value"
            value={`$${(stats.totalValue / 1000).toFixed(1)}K`}
            icon={<AccountBalance />}
            trend="up"
            trendValue="+15%"
            brandColor={brandSecondary}
          />
        </Grid>
      </Grid>

      {/* 2026 Franco Valuta Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Franco Valuta Directive (FVD/01/2026):</strong> Multi-bank authorization system active. 
          Enhanced forex channels for diaspora remittances and investor transactions now available.
          <br />
          <strong>Participating Banks:</strong> CBE, DBE, AIB, BOA, UB • <strong>Processing Time:</strong> 2.1 days average
        </Typography>
      </Alert>

      {/* Tabs */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Letters of Credit" />
            <Tab label="SWIFT Payments" />
            <Tab label="Export Permits" />
            <Tab label="Multi-Bank Authorization" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {/* Tab 0: Letters of Credit */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Letter of Credit Management</Typography>
            <AnimatedButton
              variant="contained"
              startIcon={<Add />}
              brandColor={brandPrimary}
            >
              Request New LC
            </AnimatedButton>
          </Box>

          <Grid container spacing={2} mb={3}>
            {lcs.map((lc) => (
              <Grid item xs={12} md={6} key={lc.lcId}>
                <ModernCard>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6">{lc.lcId}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Contract: {lc.contractId}
                        </Typography>
                      </Box>
                      <StatusChip status={lc.status} />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Amount</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(lc.amount, lc.currency)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Issuing Bank</Typography>
                        <Typography variant="body2">{lc.issuingBank}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Beneficiary Bank</Typography>
                        <Typography variant="body2">{lc.beneficiaryBank}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Expiry Date</Typography>
                        <Typography variant="body2">{formatDate(lc.expiryDate)}</Typography>
                      </Grid>
                    </Grid>

                    <Box display="flex" gap={1} mt={2}>
                      {lc.status === 'REQUESTED' && (
                        <AnimatedButton
                          size="small"
                          variant="contained"
                          brandColor="#4caf50"
                          onClick={() => {
                            setSelectedLC(lc);
                            setLcDialogOpen(true);
                          }}
                        >
                          Approve
                        </AnimatedButton>
                      )}
                      {lc.status === 'APPROVED' && (
                        <AnimatedButton
                          size="small"
                          variant="contained"
                          brandColor={brandPrimary}
                        >
                          Issue LC
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
        </TabPanel>

        {/* Tab 1: SWIFT Payments */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">SWIFT Payment Management</Typography>
            <AnimatedButton
              variant="contained"
              startIcon={<CurrencyExchange />}
              brandColor={brandPrimary}
            >
              Initiate Payment
            </AnimatedButton>
          </Box>

          <Grid container spacing={2}>
            {payments.map((payment) => (
              <Grid item xs={12} key={payment.paymentId}>
                <ModernCard>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6">{payment.paymentId}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          LC: {payment.lcId} • Method: {payment.paymentMethod}
                        </Typography>
                        {payment.swiftReference && (
                          <Typography variant="caption" color="primary">
                            SWIFT: {payment.swiftReference}
                          </Typography>
                        )}
                      </Box>
                      <Box textAlign="right">
                        <StatusChip status={payment.status} />
                        {payment.swiftStatus && (
                          <Box mt={1}>
                            <StatusChip status={payment.swiftStatus} size="small" />
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="textSecondary">Amount</Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(payment.amount, payment.currency)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="textSecondary">Exchange Rate</Typography>
                        <Typography variant="body1">1 {payment.currency} = {payment.exchangeRate} ETB</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="textSecondary">Retention (NBE)</Typography>
                        <Typography variant="body1">{payment.retentionRate}% (${payment.retainedAmount.toLocaleString()})</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="textSecondary">Amount in Birr</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {payment.amountBirr.toLocaleString()} ETB
                        </Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="textSecondary">Receiving Bank</Typography>
                        <Typography variant="body2">{payment.receivingBank}</Typography>
                        <Typography variant="caption" color="textSecondary">BIC: {payment.receivingBankBIC}</Typography>
                      </Grid>
                      {payment.payingBank && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="textSecondary">Paying Bank</Typography>
                          <Typography variant="body2">{payment.payingBank}</Typography>
                          <Typography variant="caption" color="textSecondary">BIC: {payment.payingBankBIC}</Typography>
                        </Grid>
                      )}
                    </Grid>

                    <Box display="flex" gap={1} mt={2}>
                      {payment.status === 'VERIFIED' && (
                        <AnimatedButton
                          size="small"
                          variant="contained"
                          brandColor={brandPrimary}
                          startIcon={<CurrencyExchange />}
                          onClick={() => {
                            setSelectedPayment(payment);
                            setSwiftDialogOpen(true);
                          }}
                        >
                          Initiate SWIFT
                        </AnimatedButton>
                      )}
                      {payment.status === 'SWIFT_RECEIVED' && (
                        <AnimatedButton
                          size="small"
                          variant="contained"
                          brandColor="#4caf50"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setSettlementDialogOpen(true);
                          }}
                        >
                          Settle Payment
                        </AnimatedButton>
                      )}
                      <AnimatedButton size="small" variant="outlined">
                        View Documents
                      </AnimatedButton>
                      <AnimatedButton size="small" variant="outlined">
                        Track SWIFT
                      </AnimatedButton>
                    </Box>
                  </CardContent>
                </ModernCard>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Tab 2: Export Permits */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={permits}
              columns={permitColumns}
              getRowId={(row) => row.permitId}
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

        {/* Tab 3: Multi-Bank Authorization */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Multi-Bank Authorization System
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Authorization Network Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Active Banks: 5/5
                    </Typography>
                    <LinearProgress variant="determinate" value={100} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Network Uptime: 99.8%
                    </Typography>
                    <LinearProgress variant="determinate" value={99.8} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Cross-Bank Validation: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={95} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bank Performance Metrics
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Bank</TableCell>
                        <TableCell>Permits</TableCell>
                        <TableCell>Avg Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bankPerformanceData.map((bank) => (
                        <TableRow key={bank.bank}>
                          <TableCell>{bank.bank}</TableCell>
                          <TableCell>{bank.permits}</TableCell>
                          <TableCell>{bank.avgProcessing}d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Authorization Workflow
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip label="1. Contract Registration" color="success" />
                <Typography>→</Typography>
                <Chip label="2. Multi-Bank Validation" color="primary" />
                <Typography>→</Typography>
                <Chip label="3. Forex Allocation" color="secondary" />
                <Typography>→</Typography>
                <Chip label="4. Permit Issuance" color="success" />
              </Box>
              <Typography variant="body2" color="textSecondary">
                The 2026 multi-bank authorization system requires validation from at least 2 participating banks 
                for permits above $10,000 USD. Franco Valuta permits require additional diaspora/investor verification.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 4: Analytics */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Franco Valuta Management (FVD/01/2026)
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Diaspora Permits
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    16
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    This month
                  </Typography>
                  <LinearProgress variant="determinate" value={75} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Investor Permits
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    9
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    This month
                  </Typography>
                  <LinearProgress variant="determinate" value={60} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    FV Utilization
                  </Typography>
                  <Typography variant="h4" color="secondary.main">
                    92.3%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Allocation rate
                  </Typography>
                  <LinearProgress variant="determinate" value={92.3} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Franco Valuta Guidelines (2026)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Eligible Transactions:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Diaspora remittance-funded exports
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Foreign direct investment proceeds
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Alternative forex channel transactions
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Enhanced capital requirement compliance
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Processing Requirements:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Multi-bank verification (minimum 2 banks)
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Source of funds documentation
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • EUDR compliance for EU destinations
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Enhanced due diligence checks
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Banking Analytics & Trends
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Permit Type Trends
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={permitTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="standard" stroke="#9b30b7" strokeWidth={3} name="Standard" />
                        <Line type="monotone" dataKey="francoValuta" stroke="#FFD700" strokeWidth={3} name="Franco Valuta" />
                        <Line type="monotone" dataKey="diaspora" stroke="#000000" strokeWidth={3} name="Diaspora" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bank Performance Comparison
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bankPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bank" />
                        <YAxis />
                        <RechartsTooltip formatter={(value, name) => [
                          name === 'permits' ? value : formatCurrency(value as number),
                          name === 'permits' ? 'Permits' : 'Value (USD)'
                        ]} />
                        <Bar dataKey="permits" fill="#9b30b7" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Performance Indicators
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary.main">
                      2.1
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Processing Days
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      96.8%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Approval Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary.main">
                      $6.2M
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Monthly Volume
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      99.8%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      System Uptime
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
      </ModernCard>

      {/* LC Approval Dialog */}
      <Dialog open={lcDialogOpen} onClose={() => setLcDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Letter of Credit</DialogTitle>
        <DialogContent>
          {selectedLC && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>LC ID:</strong> {selectedLC.lcId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Exporter:</strong> {selectedLC.exporterId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Amount:</strong> {formatCurrency(selectedLC.amount, selectedLC.currency)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Beneficiary:</strong> {selectedLC.beneficiary}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Beneficiary Bank:</strong> {selectedLC.beneficiaryBank}
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Approving this LC will enable issuance and payment processing.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setLcDialogOpen(false)}>Cancel</AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#4caf50"
            onClick={() => {
              if (!selectedLC) return;
              handleApproveLC(selectedLC.lcId);
            }}
          >
            Approve LC
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* SWIFT Initiation Dialog */}
      <Dialog open={swiftDialogOpen} onClose={() => setSwiftDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Initiate SWIFT Transfer</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Payment:</strong> {selectedPayment.paymentId} | <strong>Amount:</strong> {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>SWIFT Reference Number</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                    SWIFT{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}00123456
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Message Type</Typography>
                  <Chip label={selectedPayment.paymentMethod} color="primary" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Sender BIC</Typography>
                  <Typography variant="body2">{selectedPayment.receivingBankBIC}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Receiver BIC</Typography>
                  <Typography variant="body2">{selectedPayment.payingBankBIC || 'DEUTDEFF'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Value Date</Typography>
                  <Typography variant="body2">{new Date().toISOString().split('T')[0]}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Charges</Typography>
                  <Chip label="SHA (Shared)" size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Remittance Information</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Payment for coffee export - Contract {selectedPayment.contractId}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSwiftDialogOpen(false)}>Cancel</AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor={brandPrimary}
            startIcon={<CurrencyExchange />}
            onClick={() => {
              if (!selectedPayment) return;
              handleInitiateSWIFT(selectedPayment.paymentId, {});
            }}
          >
            Send SWIFT Message
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Payment Settlement Dialog */}
      <Dialog open={settlementDialogOpen} onClose={() => setSettlementDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Settle Payment with NBE Retention</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>SWIFT Received:</strong> {selectedPayment.swiftReference}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>Payment Breakdown</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Total Amount:</Typography>
                        <Typography variant="h6">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Exchange Rate:</Typography>
                        <Typography variant="h6">1 {selectedPayment.currency} = {selectedPayment.exchangeRate} ETB</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">NBE Retention ({selectedPayment.retentionRate}%):</Typography>
                        <Typography variant="body1" color="warning.main">
                          {formatCurrency(selectedPayment.retainedAmount, selectedPayment.currency)}
                        </Typography>
                        <Typography variant="caption">(Kept in foreign currency)</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Converted Amount ({100-selectedPayment.retentionRate}%):</Typography>
                        <Typography variant="body1" color="success.main">
                          {formatCurrency(selectedPayment.convertedAmount, selectedPayment.currency)}
                        </Typography>
                        <Typography variant="caption">= {selectedPayment.amountBirr.toLocaleString()} ETB</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Settlement Details</Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Paying Bank: {selectedPayment.payingBank}<br />
                    • Receiving Bank: {selectedPayment.receivingBank}<br />
                    • NBE Approval: Required for settlement<br />
                    • Exporter will receive: <strong>{selectedPayment.amountBirr.toLocaleString()} ETB</strong>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSettlementDialogOpen(false)}>Cancel</AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#4caf50"
            onClick={() => {
              if (!selectedPayment) return;
              handleSettlePayment(selectedPayment.paymentId, {});
            }}
          >
            Confirm Settlement
          </AnimatedButton>
        </DialogActions>
      </Dialog>
      
      {/* Permit Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Export Permit</DialogTitle>
        <DialogContent>
          {selectedPermit && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Permit ID:</strong> {selectedPermit.permitId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Contract ID:</strong> {selectedPermit.contractId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Exporter:</strong> {selectedPermit.exporterId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Issuing Bank:</strong> {selectedPermit.bankName}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Permit Type:</strong> {selectedPermit.permitType}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Amount:</strong> {formatCurrency(selectedPermit.amount, selectedPermit.currency)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Authorizing Banks:</strong> {selectedPermit.authorizingBanks.join(', ')}
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Approving this permit will enable forex allocation and export processing. 
                Multi-bank authorization is {selectedPermit.authorizingBanks.length >= 2 ? 'satisfied' : 'required'}.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setApprovalDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#4caf50"
            onClick={() => {
              if (!selectedPermit) return;
              handleApprovePermit(selectedPermit.permitId);
            }}
          >
            Approve Permit
          </AnimatedButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BanksPortal;