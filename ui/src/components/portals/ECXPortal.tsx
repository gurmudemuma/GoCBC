// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Coffee Lot Registration & Trading

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
  Rating,
  Divider,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  Assessment,
  LocalShipping,
  Coffee,
  Star,
  Visibility,
  Edit,
  Download,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useForm, Controller } from 'react-hook-form';
import api, { formatDate, formatCurrency } from '@/utils/api';
import { CoffeeShipment } from '@/types';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';

interface CoffeeLot {
  lotId: string;
  ecxLotNumber: string;
  exporterId: string;
  origin: string;
  quantity: number;
  grade: string;
  processingMethod: string;
  harvestSeason: string;
  qualityScore: number;
  pricePerKg: number;
  status: 'REGISTERED' | 'TRADING' | 'SOLD' | 'SHIPPED';
  createdAt: string;
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

const ECXPortal: React.FC = () => {
  // ECX Brand Colors
  const BRAND_COLOR = '#0F47AF';  // Cobalt Blue
  const SECONDARY_COLOR = '#FCDD09';  // Golden
  
  const [tabValue, setTabValue] = useState(0);
  const [coffeeLots, setCoffeeLots] = useState<CoffeeLot[]>([]);
  const [shipments, setShipments] = useState<CoffeeShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<CoffeeLot | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const { control, handleSubmit, reset } = useForm();

  // Mock data for coffee lots (in real implementation, this would come from API)
  const mockCoffeeLots: CoffeeLot[] = [
    {
      lotId: 'LOT2026001',
      ecxLotNumber: 'ECX-YRG-2026-001',
      exporterId: 'EXP2026001',
      origin: 'Yirgacheffe, Gedeo Zone',
      quantity: 2000,
      grade: 'Grade 1',
      processingMethod: 'Washed',
      harvestSeason: '2025/2026',
      qualityScore: 87.5,
      pricePerKg: 9.25,
      status: 'TRADING',
      createdAt: '2026-05-31T10:00:00Z',
    },
    {
      lotId: 'LOT2026002',
      ecxLotNumber: 'ECX-SID-2026-002',
      exporterId: 'EXP2026002',
      origin: 'Sidama, SNNPR',
      quantity: 1500,
      grade: 'Grade 1',
      processingMethod: 'Natural',
      harvestSeason: '2025/2026',
      qualityScore: 85.2,
      pricePerKg: 8.75,
      status: 'REGISTERED',
      createdAt: '2026-05-31T09:30:00Z',
    },
    {
      lotId: 'LOT2026003',
      ecxLotNumber: 'ECX-HAR-2026-003',
      exporterId: 'EXP2026003',
      origin: 'Harar, Oromia',
      quantity: 1800,
      grade: 'Grade 2',
      processingMethod: 'Natural',
      harvestSeason: '2025/2026',
      qualityScore: 82.8,
      pricePerKg: 7.50,
      status: 'SOLD',
      createdAt: '2026-05-30T14:20:00Z',
    },
  ];

  const priceData = [
    { month: 'Jan', yirgacheffe: 8.5, sidama: 8.2, harar: 7.8 },
    { month: 'Feb', yirgacheffe: 8.8, sidama: 8.4, harar: 8.0 },
    { month: 'Mar', yirgacheffe: 9.2, sidama: 8.7, harar: 8.2 },
    { month: 'Apr', yirgacheffe: 9.0, sidama: 8.5, harar: 8.1 },
    { month: 'May', yirgacheffe: 9.3, sidama: 8.9, harar: 8.4 },
  ];

  const volumeData = [
    { origin: 'Yirgacheffe', volume: 15000, value: 138750 },
    { origin: 'Sidama', volume: 12000, value: 102000 },
    { origin: 'Harar', volume: 8500, value: 68000 },
    { origin: 'Jimma', volume: 6000, value: 42000 },
    { origin: 'Limu', volume: 4500, value: 31500 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // In real implementation, load from API
      setCoffeeLots(mockCoffeeLots);
      
      const shipmentsRes = await api.getShipments({ limit: 50 });
      if (shipmentsRes.success) {
        setShipments(shipmentsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterLot = async (data: any) => {
    try {
      // In real implementation, call API to register lot
      console.log('Registering lot:', data);
      setDialogOpen(false);
      reset();
      loadData();
    } catch (error) {
      console.error('Failed to register lot:', error);
    }
  };

  const lotColumns: GridColDef[] = [
    { field: 'ecxLotNumber', headerName: 'ECX Lot Number', width: 150 },
    { field: 'origin', headerName: 'Origin', width: 180 },
    { field: 'quantity', headerName: 'Quantity (kg)', width: 120 },
    { field: 'grade', headerName: 'Grade', width: 100 },
    { field: 'processingMethod', headerName: 'Processing', width: 120 },
    {
      field: 'qualityScore',
      headerName: 'Quality Score',
      width: 120,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <Rating value={params.value / 20} readOnly size="small" />
          <Typography variant="body2" sx={{ ml: 1 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'pricePerKg',
      headerName: 'Price/kg (USD)',
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'SOLD' ? 'success' :
            params.value === 'TRADING' ? 'primary' :
            params.value === 'SHIPPED' ? 'secondary' : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
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
                setSelectedLot(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton 
              size="small"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const getMarketStats = () => {
    const totalLots = coffeeLots.length;
    const tradingLots = coffeeLots.filter(l => l.status === 'TRADING').length;
    const avgPrice = coffeeLots.reduce((sum, lot) => sum + lot.pricePerKg, 0) / totalLots;
    const totalVolume = coffeeLots.reduce((sum, lot) => sum + lot.quantity, 0);

    return { totalLots, tradingLots, avgPrice, totalVolume };
  };

  const stats = getMarketStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            📈 ECX Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Ethiopia Commodity Exchange - Coffee Lot Registration & Trading
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <ThemeToggle
            mode={themeMode}
            onToggle={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            brandColor={BRAND_COLOR}
          />
          <AnimatedButton
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            brandColor={BRAND_COLOR}
            secondaryColor={SECONDARY_COLOR}
          >
            Register Coffee Lot
          </AnimatedButton>
        </Box>
      </Box>

      {/* Market Statistics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Lots"
            value={stats.totalLots}
            icon={<Coffee />}
            trend="up"
            trendValue="+8.5%"
            brandColor={BRAND_COLOR}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Active Trading"
            value={stats.tradingLots}
            icon={<TrendingUp />}
            trend="up"
            trendValue="+5 lots"
            brandColor="#4caf50"
            subtitle="Currently trading"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Avg Price (USD/kg)"
            value={formatCurrency(stats.avgPrice)}
            icon={<Assessment />}
            trend="up"
            trendValue="+2.5%"
            brandColor="#ff9800"
            subtitle="Market average"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Volume (kg)"
            value={stats.totalVolume.toLocaleString()}
            icon={<LocalShipping />}
            trend="up"
            trendValue="+12%"
            brandColor="#9c27b0"
            subtitle="This month"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <ModernCard brandColor={BRAND_COLOR}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Coffee Lots" />
            <Tab label="Market Prices" />
            <Tab label="Trading Activity" />
            <Tab label="Quality Analysis" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={coffeeLots}
              columns={lotColumns}
              getRowId={(row) => row.lotId}
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
          <Typography variant="h6" gutterBottom>
            Coffee Price Trends by Origin
          </Typography>
          <Box sx={{ height: 400, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <RechartsTooltip formatter={(value) => [`$${value}`, 'Price/kg']} />
                <Line type="monotone" dataKey="yirgacheffe" stroke="#2e7d32" strokeWidth={3} name="Yirgacheffe" />
                <Line type="monotone" dataKey="sidama" stroke="#1565c0" strokeWidth={3} name="Sidama" />
                <Line type="monotone" dataKey="harar" stroke="#f57c00" strokeWidth={3} name="Harar" />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Market Prices
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Yirgacheffe Grade 1</Typography>
                      <Typography fontWeight="bold" color="success.main">$9.30/kg</Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">+2.5% from last week</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Sidama Grade 1</Typography>
                      <Typography fontWeight="bold" color="success.main">$8.90/kg</Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">+1.8% from last week</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Harar Grade 1</Typography>
                      <Typography fontWeight="bold" color="warning.main">$8.40/kg</Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">-0.5% from last week</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Price Alerts
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Yirgacheffe prices reached 6-month high
                  </Alert>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Harar supply shortage expected next month
                  </Alert>
                  <Alert severity="success">
                    New harvest season starting in Sidama region
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Trading Volume by Origin
          </Typography>
          <Box sx={{ height: 400, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="origin" />
                <YAxis />
                <RechartsTooltip formatter={(value, name) => [
                  name === 'volume' ? `${value} kg` : formatCurrency(Number(value)),
                  name === 'volume' ? 'Volume' : 'Value'
                ]} />
                <Bar dataKey="volume" fill="#1565c0" name="volume" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Transactions
                  </Typography>
                  {coffeeLots.slice(0, 5).map((lot) => (
                    <Box key={lot.lotId} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="bold">
                          {lot.ecxLotNumber}
                        </Typography>
                        <Chip size="small" label={lot.status} />
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {lot.origin} • {lot.quantity}kg • {formatCurrency(lot.pricePerKg)}/kg
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(lot.createdAt)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Trading Statistics
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Daily Volume: 45,000 kg
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Daily Value: $382,500
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Traders: 28
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Completed Transactions: 156
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Quality Analysis Dashboard
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quality Score Distribution
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Specialty Grade (85+): 65%
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      <Box sx={{ width: '65%', bgcolor: '#4caf50', height: 8, borderRadius: 1 }} />
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Premium Grade (80-84): 28%
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      <Box sx={{ width: '28%', bgcolor: '#2196f3', height: 8, borderRadius: 1 }} />
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Commercial Grade (75-79): 7%
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      <Box sx={{ width: '7%', bgcolor: '#ff9800', height: 8, borderRadius: 1 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Quality Lots
                  </Typography>
                  {[...coffeeLots]
                    .sort((a, b) => b.qualityScore - a.qualityScore)
                    .slice(0, 3)
                    .map((lot, index) => (
                      <Box key={lot.lotId} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                        <Box display="flex" alignItems="center" justifyContent="between">
                          <Star sx={{ color: '#ffd700', mr: 1 }} />
                          <Typography variant="body2" fontWeight="bold">
                            #{index + 1} - {lot.ecxLotNumber}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          Score: {lot.qualityScore} • {lot.origin}
                        </Typography>
                      </Box>
                    ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </ModernCard>

      {/* Coffee Lot Detail Dialog */}
      <Dialog open={!!selectedLot && !dialogOpen} onClose={() => setSelectedLot(null)} maxWidth="md" fullWidth>
        <DialogTitle>Coffee Lot Details</DialogTitle>
        <DialogContent>
          {selectedLot && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">ECX Lot Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedLot.ecxLotNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Lot ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedLot.lotId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedLot.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Origin</Typography>
                  <Typography variant="body1">{selectedLot.origin}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1">{selectedLot.quantity.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Grade</Typography>
                  <Chip label={selectedLot.grade} color="primary" size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Processing Method</Typography>
                  <Typography variant="body1">{selectedLot.processingMethod}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Harvest Season</Typography>
                  <Typography variant="body1">{selectedLot.harvestSeason}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Quality Score</Typography>
                  <Box display="flex" alignItems="center">
                    <Rating value={selectedLot.qualityScore / 20} readOnly size="small" />
                    <Typography variant="body1" sx={{ ml: 1 }} fontWeight={600}>
                      {selectedLot.qualityScore}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Price per Kg</Typography>
                  <Typography variant="body1" color="primary" fontWeight={600}>
                    {formatCurrency(selectedLot.pricePerKg)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Total Value</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(selectedLot.pricePerKg * selectedLot.quantity)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip
                    label={selectedLot.status}
                    size="small"
                    color={
                      selectedLot.status === 'SOLD' ? 'success' :
                      selectedLot.status === 'TRADING' ? 'primary' :
                      selectedLot.status === 'SHIPPED' ? 'secondary' : 'default'
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Created At</Typography>
                  <Typography variant="body1">{formatDate(selectedLot.createdAt)}</Typography>
                </Grid>
              </Grid>
              
              <Card sx={{ mt: 2, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Market Information</Typography>
                  <Typography variant="body2" color="textSecondary">
                    This lot is registered in the Ethiopia Commodity Exchange for transparent coffee trading.
                    {selectedLot.status === 'TRADING' && ' Currently available for trading on ECX platform.'}
                    {selectedLot.status === 'SOLD' && ' This lot has been sold and awaits shipment.'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedLot(null)}>
            Close
          </AnimatedButton>
          {selectedLot?.status === 'REGISTERED' && (
            <AnimatedButton
              variant="contained"
              brandColor={BRAND_COLOR}
              onClick={() => {
                // TODO: Implement list for trading
                console.log('List lot for trading:', selectedLot.lotId);
                setSelectedLot(null);
              }}
            >
              List for Trading
            </AnimatedButton>
          )}
        </DialogActions>
      </Dialog>

      {/* Register Coffee Lot Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Register New Coffee Lot</DialogTitle>
        <form onSubmit={handleSubmit(handleRegisterLot)}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="ecxLotNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="ECX Lot Number"
                      placeholder="ECX-YRG-2026-001"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="exporterId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Exporter ID"
                      placeholder="EXP2026001"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="origin"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Origin</InputLabel>
                      <Select {...field} label="Origin">
                        <MenuItem value="Yirgacheffe, Gedeo Zone">Yirgacheffe, Gedeo Zone</MenuItem>
                        <MenuItem value="Sidama, SNNPR">Sidama, SNNPR</MenuItem>
                        <MenuItem value="Harar, Oromia">Harar, Oromia</MenuItem>
                        <MenuItem value="Jimma, Oromia">Jimma, Oromia</MenuItem>
                        <MenuItem value="Limu, Oromia">Limu, Oromia</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Quantity (kg)"
                      type="number"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="grade"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Grade</InputLabel>
                      <Select {...field} label="Grade">
                        <MenuItem value="Grade 1">Grade 1</MenuItem>
                        <MenuItem value="Grade 2">Grade 2</MenuItem>
                        <MenuItem value="Grade 3">Grade 3</MenuItem>
                        <MenuItem value="UG (Under Grade)">UG (Under Grade)</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="processingMethod"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Processing Method</InputLabel>
                      <Select {...field} label="Processing Method">
                        <MenuItem value="Washed">Washed</MenuItem>
                        <MenuItem value="Natural">Natural</MenuItem>
                        <MenuItem value="Honey">Honey</MenuItem>
                        <MenuItem value="Semi-Washed">Semi-Washed</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <AnimatedButton onClick={() => setDialogOpen(false)} variant="outlined">
              Cancel
            </AnimatedButton>
            <AnimatedButton 
              type="submit" 
              variant="contained"
              brandColor={BRAND_COLOR}
              secondaryColor={SECONDARY_COLOR}
            >
              Register Lot
            </AnimatedButton>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ECXPortal;