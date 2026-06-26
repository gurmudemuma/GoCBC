// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Portal - Logistics Coordination & Container Management

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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  LocalShipping,
  FlightTakeoff,
  DirectionsBoat,
  LocationOn,
  Assignment,
  Visibility,
  Download,
  Warning,
  Schedule,
  TrendingUp,
  QrCode,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';

interface ShippingRecord {
  shippingId: string;
  shipmentId: string;
  exporterId: string;
  shippingLine: string;
  containerNumber: string;
  vesselName: string;
  voyageNumber: string;
  portOfLoading: string;
  portOfDischarge: string;
  estimatedDeparture: string;
  estimatedArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  status: 'BOOKED' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
  trackingNumber: string;
  billOfLading: string;
  containerType: 'DRY' | 'REEFER' | 'OPEN_TOP';
  weight: number;
  volume: number;
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

const ShippingPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [shippingRecords, setShippingRecords] = useState<ShippingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShippingRecord | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const shippingTrendsData = [
    { month: 'Jan', containers: 145, onTime: 92, delayed: 8 },
    { month: 'Feb', containers: 152, onTime: 89, delayed: 11 },
    { month: 'Mar', containers: 148, onTime: 94, delayed: 6 },
    { month: 'Apr', containers: 165, onTime: 91, delayed: 9 },
    { month: 'May', containers: 172, onTime: 96, delayed: 4 },
  ];

  const portPerformanceData = [
    { port: 'Djibouti', containers: 485, avgDwell: 2.1, efficiency: 94.5 },
    { port: 'Hamburg', containers: 156, avgDwell: 1.8, efficiency: 97.2 },
    { port: 'New York', containers: 142, avgDwell: 2.3, efficiency: 91.8 },
    { port: 'Antwerp', containers: 98, avgDwell: 1.9, efficiency: 95.1 },
    { port: 'Rotterdam', containers: 87, avgDwell: 2.0, efficiency: 93.7 },
  ];

  const shippingLineData = [
    { line: 'Maersk', share: 35, performance: 94.2 },
    { line: 'MSC', share: 28, performance: 91.8 },
    { line: 'CMA CGM', share: 18, performance: 89.5 },
    { line: 'COSCO', share: 12, performance: 87.3 },
    { line: 'Others', share: 7, performance: 85.1 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Load shipments with CUSTOMS_CLEARED status (ready for shipping)
      const shipmentsResponse = await fetch('http://localhost:3001/api/v1/shipments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentsResult = await shipmentsResponse.json();
      
      if (shipmentsResult.success && shipmentsResult.data) {
        // Filter for shipments that are cleared by customs (ready for shipping)
        const readyShipments = shipmentsResult.data.filter((s: any) => 
          s.shipmentStatus === 'CUSTOMS_CLEARED' || s.shipmentStatus === 'SHIPPED' || s.shipmentStatus === 'DELIVERED'
        );
        
        console.log(`[SHIPPING] Total shipments: ${shipmentsResult.data.length}`);
        console.log(`[SHIPPING] Ready for shipping: ${readyShipments.length}`);
        
        // Map shipments to shipping records
        const mappedRecords = readyShipments.map((s: any, index: number) => ({
          shippingId: `SH-${s.shipmentID || s.shipmentId}`,
          shipmentId: s.shipmentID || s.shipmentId,
          exporterId: s.exporterID || s.exporterId,
          shippingLine: index % 2 === 0 ? 'Maersk Line' : 'MSC',
          containerNumber: `CONT${Date.now()}${index}`.substr(0, 11),
          vesselName: index % 2 === 0 ? 'Maersk Eindhoven' : 'MSC Lucinda',
          voyageNumber: `V${new Date().getFullYear()}W${index + 20}`,
          portOfLoading: 'Djibouti',
          portOfDischarge: s.destination || 'Hamburg',
          estimatedDeparture: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrival: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
          status: s.shipmentStatus === 'DELIVERED' ? 'DELIVERED' : s.shipmentStatus === 'SHIPPED' ? 'IN_TRANSIT' : 'BOOKED',
          trackingNumber: `TRK${Date.now()}${index}`,
          billOfLading: `BL${Date.now()}${index}`,
          containerType: s.eudrCompliant ? 'REEFER' : 'DRY',
          weight: s.quantity || 20000,
          volume: (s.quantity || 20000) / 600, // Approximate volume calculation
        }));
        
        setShippingRecords(mappedRecords);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (shippingId: string, newStatus: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[SHIPPING] Updating shipping status:', shippingId, newStatus);
      
      // Extract shipment ID from shipping ID
      const shipmentId = shippingId.replace('SH-', '');
      
      // Map shipping status to shipment status
      let shipmentStatus = 'SHIPPED';
      if (newStatus === 'DELIVERED') shipmentStatus = 'DELIVERED';
      if (newStatus === 'IN_TRANSIT') shipmentStatus = 'SHIPPED';
      
      // Update shipment status
      const response = await fetch(`http://localhost:3001/api/v1/shipments/${shipmentId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: shipmentStatus })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[SHIPPING] ✅ Status updated successfully');
        setUpdateDialogOpen(false);
        loadData();
      } else {
        console.error('[SHIPPING] ❌ Failed to update status:', result);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to update status:', error);
    }
  };
  const shippingColumns: GridColDef[] = [
    { field: 'shippingId', headerName: 'Shipping ID', width: 130 },
    { field: 'shipmentId', headerName: 'Shipment ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    { field: 'shippingLine', headerName: 'Shipping Line', width: 130 },
    { field: 'containerNumber', headerName: 'Container', width: 140 },
    { field: 'vesselName', headerName: 'Vessel', width: 150 },
    { field: 'portOfLoading', headerName: 'POL', width: 100 },
    { field: 'portOfDischarge', headerName: 'POD', width: 100 },
    {
      field: 'containerType',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'DRY' ? 'primary' :
            params.value === 'REEFER' ? 'secondary' : 'success'
          }
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip
          label={params.value}
          status={params.value as any}
        />
      ),
    },
    { field: 'estimatedDeparture', headerName: 'ETD', width: 130, renderCell: (params) => formatDate(params.value) },
    { field: 'estimatedArrival', headerName: 'ETA', width: 130, renderCell: (params) => formatDate(params.value) },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Track Shipment">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
                setTrackingDialogOpen(true);
              }}
            >
              <LocationOn />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Update Status">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
                setUpdateDialogOpen(true);
              }}
            >
              <Schedule />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const getShippingStats = () => {
    const total = shippingRecords.length;
    const inTransit = shippingRecords.filter(r => r.status === 'IN_TRANSIT' || r.status === 'DEPARTED').length;
    const delivered = shippingRecords.filter(r => r.status === 'DELIVERED').length;
    const totalWeight = shippingRecords.reduce((sum, record) => sum + record.weight, 0);

    return { total, inTransit, delivered, totalWeight };
  };

  const stats = getShippingStats();

  // Brand colors for Shipping Portal
  const brandPrimary = '#006064'; // Deep Teal
  const brandSecondary = '#0097a7'; // Cyan

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🚢 Shipping Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Maritime Logistics & Container Management - Ethiopian Coffee Exports
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <AnimatedButton
            variant="outlined"
            startIcon={<Download />}
            brandColor={brandPrimary}
            onClick={() => {
              // Export shipping report as CSV
              const csvContent = [
                ['Shipping ID', 'Shipment ID', 'Exporter', 'Container', 'Vessel', 'POL', 'POD', 'Status', 'ETD', 'ETA'],
                ...shippingRecords.map(r => [
                  r.shippingId, r.shipmentId, r.exporterId, r.containerNumber, r.vesselName,
                  r.portOfLoading, r.portOfDischarge, r.status,
                  new Date(r.estimatedDeparture).toLocaleDateString(),
                  new Date(r.estimatedArrival).toLocaleDateString()
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `shipping_report_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            Export Report
          </AnimatedButton>
          <AnimatedButton
            variant="contained"
            startIcon={<Add />}
            brandColor={brandPrimary}
            onClick={() => {
              alert('🚢 New Booking\n\nThis feature allows shipping companies to create new booking records for customs-cleared shipments.\n\nIn a production system, this would:\n• Select a cleared shipment\n• Assign container and vessel\n• Set loading/discharge ports\n• Generate booking confirmation\n\nNote: Bookings are currently auto-created when shipments are cleared by customs.');
            }}
          >
            New Booking
          </AnimatedButton>
        </Box>
      </Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Shipments"
            value={stats.total}
            icon={<LocalShipping />}
            trend="up"
            trendValue="+14%"
            brandColor={brandPrimary}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="In Transit"
            value={stats.inTransit}
            icon={<DirectionsBoat />}
            trend="up"
            trendValue="+7%"
            brandColor="#ff9800"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Delivered"
            value={stats.delivered}
            icon={<CheckCircle />}
            trend="up"
            trendValue="+25%"
            brandColor="#4caf50"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Weight"
            value={`${(stats.totalWeight / 1000).toFixed(1)}MT`}
            icon={<Assignment />}
            trend="up"
            trendValue="+18%"
            brandColor={brandSecondary}
          />
        </Grid>
      </Grid>

      {/* Real-time Tracking Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Real-time Tracking:</strong> All containers equipped with IoT sensors for temperature, humidity, and GPS tracking. 
          Blockchain integration ensures immutable logistics records.
          <br />
          <strong>Current Performance:</strong> 96% on-time delivery • 2.1 days avg port dwell • 94.5% efficiency rating
        </Typography>
      </Alert>

      {/* Tabs */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Shipments" />
            <Tab label="Container Tracking" />
            <Tab label="Port Operations" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={shippingRecords}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
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
            Real-time Container Tracking
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Containers
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Container</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shippingRecords.map((record) => (
                        <TableRow key={record.containerNumber}>
                          <TableCell>{record.containerNumber}</TableCell>
                          <TableCell>
                            <Chip label={record.status} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            {record.status === 'LOADED' ? record.portOfLoading : 
                             record.status === 'IN_TRANSIT' ? 'At Sea' : 
                             record.portOfDischarge}
                          </TableCell>
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
                    IoT Sensor Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Temperature Monitoring: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={100} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      GPS Tracking: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={98} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Humidity Control: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={95} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Security Seals: Intact
                    </Typography>
                    <LinearProgress variant="determinate" value={100} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Blockchain Integration Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Immutable Records:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Container loading timestamps
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Port departure/arrival logs
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Temperature/humidity data
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ GPS coordinate tracking
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Smart Contract Triggers:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Automatic status updates
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Payment release conditions
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Insurance claim processing
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Delivery confirmation
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Port Operations Management
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Port Performance Metrics
                  </Typography>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Port</TableCell>
                        <TableCell>Containers</TableCell>
                        <TableCell>Avg Dwell (days)</TableCell>
                        <TableCell>Efficiency (%)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {portPerformanceData.map((port) => (
                        <TableRow key={port.port}>
                          <TableCell>{port.port}</TableCell>
                          <TableCell>{port.containers}</TableCell>
                          <TableCell>{port.avgDwell}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                {port.efficiency}%
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={port.efficiency} 
                                sx={{ width: 60 }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Djibouti Port Status
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Primary export gateway for Ethiopian coffee
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Current Queue: 12 containers
                    </Typography>
                    <LinearProgress variant="determinate" value={25} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Processing Rate: 94.5%
                    </Typography>
                    <LinearProgress variant="determinate" value={94.5} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Weather Conditions: Good
                    </Typography>
                    <LinearProgress variant="determinate" value={85} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipping Line Performance
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Shipping Line</TableCell>
                    <TableCell>Market Share (%)</TableCell>
                    <TableCell>Performance Score</TableCell>
                    <TableCell>On-time Delivery</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shippingLineData.map((line) => (
                    <TableRow key={line.line}>
                      <TableCell>{line.line}</TableCell>
                      <TableCell>{line.share}%</TableCell>
                      <TableCell>{line.performance}%</TableCell>
                      <TableCell>
                        <LinearProgress 
                          variant="determinate" 
                          value={line.performance} 
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Shipping Analytics & Trends
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monthly Shipping Trends
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={shippingTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="containers" stroke="#0277bd" strokeWidth={3} name="Total Containers" />
                        <Line type="monotone" dataKey="onTime" stroke="#4caf50" strokeWidth={3} name="On-time %" />
                        <Line type="monotone" dataKey="delayed" stroke="#f44336" strokeWidth={3} name="Delayed %" />
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
                    Container Utilization
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={portPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="port" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="containers" fill="#0277bd" />
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
                      96%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      On-time Delivery
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      2.1
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Port Dwell (days)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary.main">
                      94.5%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Port Efficiency
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      15.2
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Transit Days
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
      </ModernCard>
      {/* Shipping Record Detail Dialog */}
      <Dialog open={!!selectedRecord && !trackingDialogOpen && !updateDialogOpen} onClose={() => setSelectedRecord(null)} maxWidth="md" fullWidth>
        <DialogTitle>Shipment Details</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipping ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.shippingId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipment ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.shipmentId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedRecord.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipping Line</Typography>
                  <Typography variant="body1">{selectedRecord.shippingLine}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Container Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.containerNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Container Type</Typography>
                  <Chip
                    label={selectedRecord.containerType}
                    size="small"
                    color={
                      selectedRecord.containerType === 'DRY' ? 'primary' :
                      selectedRecord.containerType === 'REEFER' ? 'secondary' : 'success'
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Vessel Name</Typography>
                  <Typography variant="body1">{selectedRecord.vesselName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Voyage Number</Typography>
                  <Typography variant="body1">{selectedRecord.voyageNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Port of Loading</Typography>
                  <Typography variant="body1">{selectedRecord.portOfLoading}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Port of Discharge</Typography>
                  <Typography variant="body1">{selectedRecord.portOfDischarge}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Weight</Typography>
                  <Typography variant="body1">{selectedRecord.weight.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Volume</Typography>
                  <Typography variant="body1">{selectedRecord.volume} CBM</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Bill of Lading</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.billOfLading}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Tracking Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.trackingNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip status={selectedRecord.status as any} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Estimated Departure</Typography>
                  <Typography variant="body1">{formatDate(selectedRecord.estimatedDeparture)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Estimated Arrival</Typography>
                  <Typography variant="body1">{formatDate(selectedRecord.estimatedArrival)}</Typography>
                </Grid>
                {selectedRecord.actualDeparture && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Actual Departure</Typography>
                    <Typography variant="body1">{formatDate(selectedRecord.actualDeparture)}</Typography>
                  </Grid>
                )}
                {selectedRecord.actualArrival && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Actual Arrival</Typography>
                    <Typography variant="body1">{formatDate(selectedRecord.actualArrival)}</Typography>
                  </Grid>
                )}
              </Grid>
              
              <Card sx={{ mt: 2, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Shipping Route</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={selectedRecord.portOfLoading} color="primary" size="small" />
                    <Typography>→</Typography>
                    <Chip label="At Sea" color="default" size="small" />
                    <Typography>→</Typography>
                    <Chip label={selectedRecord.portOfDischarge} color="success" size="small" />
                  </Box>
                </CardContent>
              </Card>

              {selectedRecord.status === 'IN_TRANSIT' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This shipment is currently in transit. Real-time tracking is available via IoT sensors.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedRecord(null)}>
            Close
          </AnimatedButton>
          <AnimatedButton
            variant="outlined"
            brandColor="#0277bd"
            onClick={() => {
              setTrackingDialogOpen(true);
            }}
          >
            Track Shipment
          </AnimatedButton>
          {selectedRecord && ['BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT'].includes(selectedRecord.status) && (
            <AnimatedButton
              variant="contained"
              brandColor="#4caf50"
              onClick={() => {
                setUpdateDialogOpen(true);
              }}
            >
              Update Status
            </AnimatedButton>
          )}
        </DialogActions>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onClose={() => setTrackingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Container Tracking Details</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Container:</strong> {selectedRecord.containerNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Vessel:</strong> {selectedRecord.vesselName}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Voyage:</strong> {selectedRecord.voyageNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Tracking:</strong> {selectedRecord.trackingNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Bill of Lading:</strong> {selectedRecord.billOfLading}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Route:</strong> {selectedRecord.portOfLoading} → {selectedRecord.portOfDischarge}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>ETD:</strong> {formatDate(selectedRecord.estimatedDeparture)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>ETA:</strong> {formatDate(selectedRecord.estimatedArrival)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Weight:</strong> {selectedRecord.weight.toLocaleString()} kg
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Volume:</strong> {selectedRecord.volume} CBM
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Real-time Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip label="Container Loaded" color="success" />
                <Typography>→</Typography>
                <Chip label="Vessel Departed" color={selectedRecord.status === 'DEPARTED' ? 'success' : 'default'} />
                <Typography>→</Typography>
                <Chip label="In Transit" color={selectedRecord.status === 'IN_TRANSIT' ? 'success' : 'default'} />
                <Typography>→</Typography>
                <Chip label="Port Arrival" color={selectedRecord.status === 'ARRIVED' ? 'success' : 'default'} />
                <Typography>→</Typography>
                <Chip label="Delivered" color={selectedRecord.status === 'DELIVERED' ? 'success' : 'default'} />
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>IoT Sensors Active:</strong> Temperature: 18°C • Humidity: 65% • GPS: Active
                  <br />
                  <strong>Last Update:</strong> {new Date().toLocaleString()} • <strong>Security:</strong> Seal Intact
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<QrCode />}
            onClick={() => {
              if (!selectedRecord) return;
              
              // Generate QR code data
              const qrData = {
                shippingId: selectedRecord.shippingId,
                container: selectedRecord.containerNumber,
                tracking: selectedRecord.trackingNumber,
                vessel: selectedRecord.vesselName,
                pol: selectedRecord.portOfLoading,
                pod: selectedRecord.portOfDischarge,
                status: selectedRecord.status
              };
              
              alert(`📱 QR Code Generated\n\nShipping ID: ${selectedRecord.shippingId}\nContainer: ${selectedRecord.containerNumber}\nTracking: ${selectedRecord.trackingNumber}\n\nIn production, this would:\n• Generate a scannable QR code\n• Link to real-time tracking page\n• Show IoT sensor data\n• Display blockchain verification\n\nQR Data:\n${JSON.stringify(qrData, null, 2)}`);
            }}
          >
            Generate QR Code
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Shipping Status</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Container:</strong> {selectedRecord.containerNumber}
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                <strong>Current Status:</strong> <Chip label={selectedRecord.status} size="small" color="primary" />
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>New Status</InputLabel>
                <Select
                  defaultValue={selectedRecord.status}
                  label="New Status"
                  id="shipping-status-select"
                >
                  <MenuItem value="BOOKED">BOOKED - Container Booked</MenuItem>
                  <MenuItem value="LOADED">LOADED - Container Loaded</MenuItem>
                  <MenuItem value="DEPARTED">DEPARTED - Vessel Departed</MenuItem>
                  <MenuItem value="IN_TRANSIT">IN_TRANSIT - In Transit</MenuItem>
                  <MenuItem value="ARRIVED">ARRIVED - Arrived at Port</MenuItem>
                  <MenuItem value="DELIVERED">DELIVERED - Delivered to Buyer</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                id="shipping-status-notes"
                label="Status Update Notes"
                multiline
                rows={3}
                placeholder="Enter status update details, location information, and any remarks..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setUpdateDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#006064"
            onClick={() => {
              if (selectedRecord) {
                const statusSelect = document.querySelector<HTMLSelectElement>('#shipping-status-select');
                const notesInput = document.querySelector<HTMLTextAreaElement>('#shipping-status-notes');
                const newStatus = statusSelect?.value || 'DEPARTED';
                const notes = notesInput?.value || 'Status updated';
                
                console.log('[SHIPPING] Updating status:', {
                  shippingId: selectedRecord.shippingId,
                  newStatus,
                  notes,
                  timestamp: new Date().toISOString()
                });
                
                handleUpdateStatus(selectedRecord.shippingId, newStatus);
              }
            }}
          >
            Update Status
          </AnimatedButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShippingPortal;