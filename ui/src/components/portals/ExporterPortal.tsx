// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exporter Portal - Complete Export Journey Management

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
  TextField,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
// Commented out until @mui/lab is installed
// import {
//   Timeline,
//   TimelineItem,
//   TimelineSeparator,
//   TimelineConnector,
//   TimelineContent,
//   TimelineDot,
//   TimelineOppositeContent,
// } from '@mui/lab';
import {
  Add,
  CheckCircle,
  LocalShipping,
  AccountBalance,
  Assessment,
  Visibility,
  Download,
  Upload,
  Warning,
  TrendingUp,
  AttachMoney,
  Description,
  Notifications,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';

interface ExporterProfile {
  exporterId: string;
  companyName: string;
  ectaLicenseNumber: string;
  licenseStatus: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  licenseExpiryDate: string;
  capitalRequirement: number;
  laboratoryCertified: boolean;
}

interface ExportContract {
  contractId: string;
  nbeReferenceNumber: string;
  buyerName: string;
  buyerCountry: string;
  coffeeType: string;
  quantity: number;
  pricePerKg: number;
  totalValue: number;
  currency: string;
  status: 'DRAFT' | 'REGISTERED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED';
  registrationDate?: string;
  approvalDate?: string;
}

interface ForexStatus {
  forexId: string;
  contractId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  status: 'REQUESTED' | 'ALLOCATED' | 'UTILIZED';
  expiryDate: string;
}

interface LCStatus {
  lcId: string;
  contractId: string;
  amount: number;
  currency: string;
  issuingBank: string;
  beneficiaryBank: string;
  status: 'REQUESTED' | 'APPROVED' | 'ISSUED' | 'UTILIZED';
  expiryDate: string;
}

interface ShipmentStatus {
  shipmentId: string;
  contractId: string;
  quantity: number;
  status: 'CREATED' | 'BOOKED' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
  billOfLading?: string;
  vesselName?: string;
  currentLocation?: string;
  estimatedArrival?: string;
}

interface PaymentStatus {
  paymentId: string;
  contractId: string;
  amount: number;
  currency: string;
  retainedAmount: number;
  convertedAmount: number;
  amountBirr: number;
  status: 'PENDING' | 'DOCUMENTS_SUBMITTED' | 'VERIFIED' | 'SWIFT_INITIATED' | 'SWIFT_RECEIVED' | 'SETTLED';
  swiftReference?: string;
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

const ExporterPortal: React.FC = () => {
  // Brand colors for Exporter Portal
  const brandPrimary = '#2E7D32'; // Green (coffee/growth)
  const brandSecondary = '#FFA726'; // Orange (Ethiopian warmth)
  
  const [tabValue, setTabValue] = useState(0);
  
  // State Management
  const [profile, setProfile] = useState<ExporterProfile | null>(null);
  const [contracts, setContracts] = useState<ExportContract[]>([]);
  const [forexStatuses, setForexStatuses] = useState<ForexStatus[]>([]);
  const [lcStatuses, setLCStatuses] = useState<LCStatus[]>([]);
  const [shipments, setShipments] = useState<ShipmentStatus[]>([]);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog States
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ExportContract | null>(null);
  
  // Mock Data for Testing
  useEffect(() => {
    loadMockData();
  }, []);
  
  const loadMockData = () => {
    // Mock Exporter Profile
    setProfile({
      exporterId: 'EXP2026001',
      companyName: 'Ethiopian Premium Coffee Exporters PLC',
      ectaLicenseNumber: 'ECTA-LIC-2026-001',
      licenseStatus: 'ACTIVE',
      licenseExpiryDate: '2026-12-31',
      capitalRequirement: 15000000,
      laboratoryCertified: true,
    });
    
    // Mock Contracts
    setContracts([
      {
        contractId: 'CONTRACT2026001',
        nbeReferenceNumber: 'NBE-REF-2026-001',
        buyerName: 'German Coffee Importers GmbH',
        buyerCountry: 'Germany',
        coffeeType: 'Yirgacheffe Grade 1',
        quantity: 20000,
        pricePerKg: 6.5,
        totalValue: 130000,
        currency: 'USD',
        status: 'APPROVED',
        registrationDate: '2026-05-15T10:00:00Z',
        approvalDate: '2026-05-20T14:30:00Z',
      },
      {
        contractId: 'CONTRACT2026002',
        nbeReferenceNumber: 'NBE-REF-2026-002',
        buyerName: 'Seattle Coffee Roasters Inc',
        buyerCountry: 'USA',
        coffeeType: 'Sidamo Grade 2',
        quantity: 15000,
        pricePerKg: 5.8,
        totalValue: 87000,
        currency: 'USD',
        status: 'ACTIVE',
        registrationDate: '2026-05-25T10:00:00Z',
        approvalDate: '2026-05-28T16:00:00Z',
      },
      {
        contractId: 'CONTRACT2026003',
        nbeReferenceNumber: '',
        buyerName: 'Tokyo Premium Coffee Co',
        buyerCountry: 'Japan',
        coffeeType: 'Harrar Grade 1',
        quantity: 10000,
        pricePerKg: 7.2,
        totalValue: 72000,
        currency: 'USD',
        status: 'REGISTERED',
        registrationDate: '2026-06-01T09:00:00Z',
      },
    ]);
    
    // Mock Forex Allocations
    setForexStatuses([
      {
        forexId: 'FOREX2026001',
        contractId: 'CONTRACT2026001',
        requestedAmount: 130000,
        allocatedAmount: 130000,
        currency: 'USD',
        exchangeRate: 115.5,
        retentionRate: 40,
        status: 'ALLOCATED',
        expiryDate: '2026-08-15',
      },
      {
        forexId: 'FOREX2026002',
        contractId: 'CONTRACT2026002',
        requestedAmount: 87000,
        allocatedAmount: 87000,
        currency: 'USD',
        exchangeRate: 115.5,
        retentionRate: 40,
        status: 'UTILIZED',
        expiryDate: '2026-08-25',
      },
    ]);
    
    // Mock LC Status
    setLCStatuses([
      {
        lcId: 'LC2026001',
        contractId: 'CONTRACT2026001',
        amount: 130000,
        currency: 'USD',
        issuingBank: 'Deutsche Bank AG',
        beneficiaryBank: 'Commercial Bank of Ethiopia',
        status: 'ISSUED',
        expiryDate: '2026-09-15',
      },
      {
        lcId: 'LC2026002',
        contractId: 'CONTRACT2026002',
        amount: 87000,
        currency: 'USD',
        issuingBank: 'Bank of America',
        beneficiaryBank: 'Awash International Bank',
        status: 'UTILIZED',
        expiryDate: '2026-08-25',
      },
    ]);
    
    // Mock Shipments
    setShipments([
      {
        shipmentId: 'SHIP2026001',
        contractId: 'CONTRACT2026001',
        quantity: 20000,
        status: 'IN_TRANSIT',
        billOfLading: 'BOL-2026-001',
        vesselName: 'MV Ethiopian Star',
        currentLocation: 'Red Sea',
        estimatedArrival: '2026-06-15',
      },
      {
        shipmentId: 'SHIP2026002',
        contractId: 'CONTRACT2026002',
        quantity: 15000,
        status: 'DELIVERED',
        billOfLading: 'BOL-2026-002',
        vesselName: 'MV Coffee Express',
        currentLocation: 'Seattle Port',
        estimatedArrival: '2026-05-30',
      },
    ]);
    
    // Mock Payments
    setPayments([
      {
        paymentId: 'PAY2026001',
        contractId: 'CONTRACT2026001',
        amount: 65000,
        currency: 'USD',
        retainedAmount: 26000,
        convertedAmount: 39000,
        amountBirr: 4504500,
        status: 'SWIFT_RECEIVED',
        swiftReference: 'SWIFT-MT103-2026-001',
      },
      {
        paymentId: 'PAY2026002',
        contractId: 'CONTRACT2026002',
        amount: 87000,
        currency: 'USD',
        retainedAmount: 34800,
        convertedAmount: 52200,
        amountBirr: 6029100,
        status: 'SETTLED',
        swiftReference: 'SWIFT-MT103-2026-002',
      },
    ]);
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleContractView = (contract: ExportContract) => {
    setSelectedContract(contract);
    setContractDialogOpen(true);
  };
  
  const handleContractDialogClose = () => {
    setContractDialogOpen(false);
    setSelectedContract(null);
  };
  
  // Calculate Dashboard KPIs
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'APPROVED').length;
  const pendingApprovals = contracts.filter(c => c.status === 'REGISTERED').length;
  const inTransitShipments = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'DEPARTED').length;
  const totalExportValue = contracts.reduce((sum, c) => sum + c.totalValue, 0);
  
  const contractColumns: GridColDef[] = [
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'buyerName', headerName: 'Buyer', width: 200 },
    { field: 'buyerCountry', headerName: 'Country', width: 120 },
    { field: 'coffeeType', headerName: 'Coffee Type', width: 150 },
    { 
      field: 'quantity', 
      headerName: 'Quantity (kg)', 
      width: 130,
      valueFormatter: (params) => params.value.toLocaleString(),
    },
    { 
      field: 'totalValue', 
      headerName: 'Value', 
      width: 120,
      valueFormatter: (params) => `$${params.value.toLocaleString()}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={() => handleContractView(params.row)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Exporter Portal
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome, {profile?.companyName || 'Loading...'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            {profile && (
              <Card sx={{ display: 'inline-block', px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  ECTA License
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusChip status={profile.licenseStatus} />
                  <Typography variant="body2" fontWeight="bold">
                    {profile.ectaLicenseNumber}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Expires: {new Date(profile.licenseExpiryDate).toLocaleDateString()}
                </Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Dashboard" icon={<Assessment />} iconPosition="start" />
          <Tab label="My Contracts" icon={<Description />} iconPosition="start" />
          <Tab label="Forex & Banking" icon={<AccountBalance />} iconPosition="start" />
          <Tab label="Shipments" icon={<LocalShipping />} iconPosition="start" />
          <Tab label="Documents" icon={<Description />} iconPosition="start" />
          <Tab label="Reports" icon={<TrendingUp />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        {/* Dashboard Tab */}
        <Grid container spacing={3}>
          {/* KPI Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="Active Contracts"
              value={activeContracts}
              icon={<CheckCircle />}
              trend="up"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="Pending Approvals"
              value={pendingApprovals}
              icon={<Warning />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="In Transit"
              value={inTransitShipments}
              icon={<LocalShipping />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="Total Export Value"
              value={`$${totalExportValue.toLocaleString()}`}
              icon={<AttachMoney />}
              trend="up"
            />
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                {/* Temporary: Using List until @mui/lab is installed */}
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Contract #CONTRACT2026001 approved by NBE"
                      secondary="2 hours ago"
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Forex allocated: $130,000"
                      secondary="5 hours ago"
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Shipment #SHIP2026001 departed Port of Djibouti"
                      secondary="1 day ago"
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Payment settled: $87,000"
                      secondary="2 days ago"
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </ModernCard>
          </Grid>

          {/* Action Required Alerts */}
          <Grid item xs={12} md={6}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Action Required
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert severity="warning" icon={<Warning />}>
                    <Typography variant="body2" fontWeight="bold">
                      Contract #CONTRACT2026003 needs NBE approval
                    </Typography>
                    <Typography variant="caption">
                      Waiting for forex allocation approval
                    </Typography>
                  </Alert>
                  <Alert severity="info">
                    <Typography variant="body2" fontWeight="bold">
                      LC #LC2026001 expires in 15 days
                    </Typography>
                    <Typography variant="caption">
                      Consider extending or utilizing
                    </Typography>
                  </Alert>
                  <Alert severity="success" icon={<CheckCircle />}>
                    <Typography variant="body2" fontWeight="bold">
                      No critical actions required
                    </Typography>
                    <Typography variant="caption">
                      All active contracts are on track
                    </Typography>
                  </Alert>
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* My Contracts Tab */}
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">My Sales Contracts</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{ bgcolor: brandPrimary }}
              onClick={() => setContractDialogOpen(true)}
            >
              Register New Contract
            </Button>
          </Box>

          <DataGrid
            rows={contracts}
            columns={contractColumns}
            getRowId={(row) => row.contractId}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            sx={{
              '& .MuiDataGrid-row:hover': {
                bgcolor: 'action.hover',
              },
            }}
          />
        </Box>

        {/* Contract Details Dialog */}
        <Dialog 
          open={contractDialogOpen} 
          onClose={handleContractDialogClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Contract Details
            {selectedContract && (
              <Typography variant="body2" color="text.secondary">
                {selectedContract.contractId}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {selectedContract && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Status:</strong> <StatusChip status={selectedContract.status} />
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Buyer Name</Typography>
                  <Typography variant="body1">{selectedContract.buyerName}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Buyer Country</Typography>
                  <Typography variant="body1">{selectedContract.buyerCountry}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Coffee Type</Typography>
                  <Typography variant="body1">{selectedContract.coffeeType}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Quantity</Typography>
                  <Typography variant="body1">{selectedContract.quantity.toLocaleString()} kg</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Price per kg</Typography>
                  <Typography variant="body1">${selectedContract.pricePerKg.toFixed(2)}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Total Value</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    ${selectedContract.totalValue.toLocaleString()} {selectedContract.currency}
                  </Typography>
                </Grid>
                
                {selectedContract.registrationDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                    <Typography variant="body1">
                      {new Date(selectedContract.registrationDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
                
                {selectedContract.approvalDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">NBE Approval Date</Typography>
                    <Typography variant="body1">
                      {new Date(selectedContract.approvalDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
                
                {selectedContract.nbeReferenceNumber && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">NBE Reference Number</Typography>
                    <Typography variant="body1">{selectedContract.nbeReferenceNumber}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleContractDialogClose}>Close</Button>
            <Button variant="contained" startIcon={<Download />}>
              Download PDF
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Forex & Banking Tab */}
        <Grid container spacing={3}>
          {/* Financial Summary KPIs */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Financial Overview</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: brandPrimary, color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Forex Allocated</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${forexStatuses.reduce((sum, f) => sum + f.allocatedAmount, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: brandSecondary, color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Retained (40%)</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${payments.reduce((sum, p) => sum + p.retainedAmount, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#1976d2', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Converted (60%)</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${payments.reduce((sum, p) => sum + p.convertedAmount, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#388e3c', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Received in Birr</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {payments.reduce((sum, p) => sum + p.amountBirr, 0).toLocaleString()} ETB
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Forex Allocations */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Forex Allocations</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {forexStatuses.map((forex) => (
                    <Card key={forex.forexId} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Forex ID</Typography>
                            <Typography variant="body2" fontWeight="bold">{forex.forexId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <StatusChip status={forex.status} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Contract ID</Typography>
                            <Typography variant="body2">{forex.contractId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Allocated Amount</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ${forex.allocatedAmount.toLocaleString()} {forex.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Exchange Rate</Typography>
                            <Typography variant="body2">{forex.exchangeRate} ETB/USD</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Retention Rate</Typography>
                            <Typography variant="body2">
                              {forex.retentionRate}% retained, {100 - forex.retentionRate}% converted
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Expires</Typography>
                            <Typography variant="body2">{new Date(forex.expiryDate).toLocaleDateString()}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>

          {/* Letters of Credit */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Letters of Credit</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {lcStatuses.map((lc) => (
                    <Card key={lc.lcId} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">LC Number</Typography>
                            <Typography variant="body2" fontWeight="bold">{lc.lcId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <StatusChip status={lc.status} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Amount</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ${lc.amount.toLocaleString()} {lc.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Issuing Bank</Typography>
                            <Typography variant="body2">{lc.issuingBank}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Beneficiary Bank</Typography>
                            <Typography variant="body2">{lc.beneficiaryBank}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Expiry Date</Typography>
                            <Typography variant="body2">{new Date(lc.expiryDate).toLocaleDateString()}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>

          {/* Payments */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Payment Status</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {payments.map((payment) => (
                    <Card key={payment.paymentId} variant="outlined" sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption">Payment ID</Typography>
                            <Typography variant="body2" fontWeight="bold">{payment.paymentId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <StatusChip status={payment.status} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption">Total Amount</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              ${payment.amount.toLocaleString()} {payment.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption">SWIFT Reference</Typography>
                            <Typography variant="body2">{payment.swiftReference}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" fontWeight="bold">Breakdown:</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption">Retained (40%)</Typography>
                            <Typography variant="body2" fontWeight="bold" color="warning.main">
                              ${payment.retainedAmount.toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption">Converted (60%)</Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              ${payment.convertedAmount.toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption">Received in Birr</Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                              {payment.amountBirr.toLocaleString()} ETB
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Shipments Tab */}
        <Box>
          <Typography variant="h6" gutterBottom>Shipment Tracking</Typography>
          
          <Grid container spacing={3}>
            {shipments.map((shipment) => (
              <Grid item xs={12} key={shipment.shipmentId}>
                <ModernCard>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <LocalShipping fontSize="large" color="primary" />
                          <Box>
                            <Typography variant="h6">{shipment.shipmentId}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Contract: {shipment.contractId}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                        <StatusChip status={shipment.status} />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Quantity</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {shipment.quantity.toLocaleString()} kg
                        </Typography>
                      </Grid>
                      
                      {shipment.billOfLading && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Bill of Lading</Typography>
                          <Typography variant="body1">{shipment.billOfLading}</Typography>
                        </Grid>
                      )}
                      
                      {shipment.vesselName && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Vessel</Typography>
                          <Typography variant="body1">{shipment.vesselName}</Typography>
                        </Grid>
                      )}
                      
                      {shipment.currentLocation && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Current Location</Typography>
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            {shipment.currentLocation}
                          </Typography>
                        </Grid>
                      )}
                      
                      {shipment.estimatedArrival && (
                        <Grid item xs={12}>
                          <Alert severity="info">
                            <Typography variant="body2">
                              <strong>Estimated Arrival:</strong> {new Date(shipment.estimatedArrival).toLocaleDateString()}
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                      
                      {/* Shipment Progress */}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Shipment Progress
                        </Typography>
                        <Stepper activeStep={getShipmentStep(shipment.status)} alternativeLabel>
                          <Step>
                            <StepLabel>Booked</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Loaded</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Departed</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>In Transit</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Arrived</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Delivered</StepLabel>
                          </Step>
                        </Stepper>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button size="small" startIcon={<Visibility />}>
                            Track on Map
                          </Button>
                          <Button size="small" startIcon={<Download />}>
                            Download B/L
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </ModernCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {/* Documents Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Document Management</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload and manage all your export-related documents. All documents are securely stored on the blockchain.
            </Alert>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upload Documents</Typography>
                <Box sx={{ 
                  border: '2px dashed', 
                  borderColor: 'primary.main', 
                  borderRadius: 2, 
                  p: 4, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <Upload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>Drop files here or click to browse</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supported: PDF, JPG, PNG, DOC, XLSX (Max 10MB)
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Select Files
                  </Button>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Document Types:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label="Sales Contract" size="small" />
                    <Chip label="EUDR Certificate" size="small" />
                    <Chip label="Lab Quality Report" size="small" />
                    <Chip label="Phytosanitary Certificate" size="small" />
                    <Chip label="Origin Certificate" size="small" />
                    <Chip label="ICO Certificate" size="small" />
                  </Box>
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Documents</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { name: 'Sales_Contract_2026001.pdf', type: 'Contract', date: '2026-06-01', status: 'VERIFIED' },
                    { name: 'EUDR_Certificate_Yirgacheffe.pdf', type: 'Compliance', date: '2026-05-28', status: 'VERIFIED' },
                    { name: 'Lab_Quality_Report_001.pdf', type: 'Quality', date: '2026-05-25', status: 'VERIFIED' },
                    { name: 'Bill_of_Lading_BOL2026001.pdf', type: 'Shipping', date: '2026-06-02', status: 'VERIFIED' },
                  ].map((doc, idx) => (
                    <Card key={idx} variant="outlined">
                      <CardContent sx={{ py: 1 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Description color="primary" />
                              <Box>
                                <Typography variant="body2" fontWeight="bold">{doc.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{doc.type}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">{doc.date}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                            <IconButton size="small" color="primary">
                              <Download />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        {/* Reports Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Export Reports & Analytics</Typography>
          </Grid>
          
          {/* Summary Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Contracts</Typography>
                <Typography variant="h4" fontWeight="bold">{contracts.length}</Typography>
                <Typography variant="body2">This year</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Approval Rate</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {Math.round((contracts.filter(c => c.status !== 'DRAFT').length / contracts.length) * 100)}%
                </Typography>
                <Typography variant="body2">Success rate</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Avg. Approval Time</Typography>
                <Typography variant="h4" fontWeight="bold">2.5</Typography>
                <Typography variant="body2">Days</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Volume</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {(contracts.reduce((sum, c) => sum + c.quantity, 0) / 1000).toFixed(1)}
                </Typography>
                <Typography variant="body2">Metric tons</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Generate Report Section */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generate Custom Report</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      defaultValue="2026-01-01"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      defaultValue="2026-12-31"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Report Type</InputLabel>
                      <Select defaultValue="all">
                        <MenuItem value="all">All Activities</MenuItem>
                        <MenuItem value="contracts">Contracts Only</MenuItem>
                        <MenuItem value="financial">Financial Summary</MenuItem>
                        <MenuItem value="shipments">Shipments</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      sx={{ height: '100%', bgcolor: brandPrimary }}
                      startIcon={<Download />}
                    >
                      Generate Report
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </ModernCard>
          </Grid>
          
          {/* Compliance Dashboard */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Compliance Dashboard</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
                      <Typography variant="h4" fontWeight="bold">100%</Typography>
                      <Typography variant="body2" color="text.secondary">EUDR Compliance</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
                      <Typography variant="h4" fontWeight="bold">0</Typography>
                      <Typography variant="body2" color="text.secondary">Customs Rejections</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
                      <Typography variant="h4" fontWeight="bold">98%</Typography>
                      <Typography variant="body2" color="text.secondary">On-Time Delivery</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'primary.main' }} />
                      <Typography variant="h4" fontWeight="bold">A+</Typography>
                      <Typography variant="body2" color="text.secondary">Quality Rating</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

// Helper function to get shipment step
const getShipmentStep = (status: string): number => {
  const steps: Record<string, number> = {
    'BOOKED': 0,
    'LOADED': 1,
    'DEPARTED': 2,
    'IN_TRANSIT': 3,
    'ARRIVED': 4,
    'DELIVERED': 5,
  };
  return steps[status] || 0;
};

export default ExporterPortal;
