// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Customs Portal - Export Declaration & Clearance Management

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
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  LocalShipping,
  Security,
  Assignment,
  Visibility,
  Download,
  Warning,
  Gavel,
  TrendingUp,
  QrCode,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';
import { CustomsInspection } from './CustomsInspection';

interface CustomsDeclaration {
  declarationId: string;
  shipmentId: string;
  exporterId: string;
  declarationType: 'STANDARD' | 'SIMPLIFIED' | 'EUDR_ENHANCED';
  hsCode: string;
  quantity: number;
  value: number;
  currency: string;
  destination: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'CLEARED' | 'HELD' | 'REJECTED';
  submissionDate: string;
  clearanceDate?: string;
  customsOfficer: string;
  inspectionRequired: boolean;
  eudrCompliant: boolean;
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

const CustomsPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<CustomsDeclaration | null>(null);
  const [clearanceDialogOpen, setClearanceDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);

  const clearanceData = [
    { month: 'Jan', standard: 145, simplified: 89, eudr: 23 },
    { month: 'Feb', standard: 152, simplified: 95, eudr: 28 },
    { month: 'Mar', standard: 148, simplified: 102, eudr: 35 },
    { month: 'Apr', standard: 165, simplified: 108, eudr: 42 },
    { month: 'May', standard: 172, simplified: 115, eudr: 48 },
  ];

  const statusDistribution = [
    { name: 'Cleared', value: 78, color: '#4caf50' },
    { name: 'Under Review', value: 15, color: '#ff9800' },
    { name: 'Held', value: 5, color: '#f44336' },
    { name: 'Submitted', value: 2, color: '#2196f3' },
  ];

  const inspectionData = [
    { type: 'Physical', count: 45, avgTime: 4.2 },
    { type: 'Documentary', count: 123, avgTime: 1.8 },
    { type: 'EUDR Enhanced', count: 28, avgTime: 6.5 },
    { type: 'Risk-based', count: 67, avgTime: 3.1 },
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
      // Load shipments with PERMIT_ISSUED status (ready for customs)
      const shipmentsResponse = await fetch('http://localhost:3001/api/v1/shipments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentsResult = await shipmentsResponse.json();
      
      if (shipmentsResult.success && shipmentsResult.data) {
        // Filter for shipments with export permit (ready for customs declaration)
        const readyShipments = shipmentsResult.data.filter((s: any) => 
          s.shipmentStatus === 'PERMIT_ISSUED' || s.shipmentStatus === 'CUSTOMS_CLEARED'
        );
        
        console.log(`[CUSTOMS] Total shipments: ${shipmentsResult.data.length}`);
        console.log(`[CUSTOMS] Ready for customs: ${readyShipments.length}`);
        
        // Map shipments to declarations (in real system, these would be separate)
        const mappedDeclarations = readyShipments.map((s: any) => ({
          declarationId: `CD-${s.shipmentID || s.shipmentId}`,
          shipmentId: s.shipmentID || s.shipmentId,
          exporterId: s.exporterID || s.exporterId,
          declarationType: s.eudrCompliant ? 'EUDR_ENHANCED' : 'STANDARD',
          hsCode: '090111', // Coffee HS code
          quantity: s.quantity,
          value: s.quantity * 9.25, // Approximate value
          currency: 'USD',
          destination: s.destination || 'Unknown',
          status: s.shipmentStatus === 'CUSTOMS_CLEARED' ? 'CLEARED' : 'SUBMITTED',
          submissionDate: s.shipmentDate || s.registrationDate || new Date().toISOString(),
          customsOfficer: 'Officer Alemayehu T.',
          inspectionRequired: true,
          eudrCompliant: s.eudrCompliant || false,
          clearanceDate: s.shipmentStatus === 'CUSTOMS_CLEARED' ? new Date().toISOString() : undefined,
        }));
        
        setDeclarations(mappedDeclarations);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInspection = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Scheduling inspection for:', declarationId);
      
      // Get inspector notes from the form
      const notesInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="inspection requirements"]');
      const inspectorNotes = notesInput?.value || 'Standard inspection scheduled';
      
      // Call customs review API to schedule inspection
      const response = await fetch(`http://localhost:3001/api/v1/customs/declaration/${declarationId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inspectorNotes,
          inspectionType: selectedDeclaration?.eudrCompliant ? 'EUDR_ENHANCED' : 'STANDARD',
          scheduledDate: new Date().toISOString(),
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Inspection scheduled successfully');
        alert(`✅ Inspection Scheduled\n\nDeclaration: ${declarationId}\nType: ${selectedDeclaration?.eudrCompliant ? 'EUDR Enhanced' : 'Standard Physical'}\nNotes: ${inspectorNotes}\n\nStatus updated to UNDER_INSPECTION`);
        setInspectionDialogOpen(false);
        loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to schedule inspection:', result);
        alert(`❌ Failed to schedule inspection\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to schedule inspection:', error);
      alert(`❌ Network Error\n\nFailed to schedule inspection: ${error}`);
    }
  };

  const handleCompleteInspection = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Completing inspection for:', declarationId);
      
      const response = await fetch(`http://localhost:3001/api/v1/customs/declaration/${declarationId}/complete-inspection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inspectionResult: 'PASSED',
          inspectorComments: 'All requirements met',
          completedDate: new Date().toISOString(),
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Inspection completed successfully');
        alert(`✅ Inspection Completed\n\nDeclaration: ${declarationId}\nResult: PASSED\n\nStatus updated to UNDER_REVIEW for final clearance`);
        loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to complete inspection:', result);
        alert(`❌ Failed to complete inspection\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to complete inspection:', error);
      alert(`❌ Network Error\n\nFailed to complete inspection: ${error}`);
    }
  };

  const handleClearDeclaration = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Clearing declaration:', declarationId);
      
      // Call customs clearance API
      const response = await fetch(`http://localhost:3001/api/v1/customs/declaration/${declarationId}/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clearanceNumber: `CLR-${Date.now()}`,
          dutiesAmount: '0', // Can be calculated based on value
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Declaration cleared successfully');
        setClearanceDialogOpen(false);
        loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to clear declaration:', result);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to clear declaration:', error);
    }
  };
  const declarationColumns: GridColDef[] = [
    { field: 'declarationId', headerName: 'Declaration ID', width: 140 },
    { field: 'shipmentId', headerName: 'Shipment ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    {
      field: 'declarationType',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'STANDARD' ? 'primary' :
            params.value === 'SIMPLIFIED' ? 'secondary' : 'success'
          }
        />
      ),
    },
    { field: 'hsCode', headerName: 'HS Code', width: 100 },
    { field: 'quantity', headerName: 'Quantity (kg)', width: 120 },
    {
      field: 'value',
      headerName: 'Value',
      width: 120,
      renderCell: (params) => formatCurrency(params.value, params.row.currency),
    },
    { field: 'destination', headerName: 'Destination', width: 120 },
    {
      field: 'eudrCompliant',
      headerName: 'EUDR',
      width: 80,
      renderCell: (params) => (
        params.value ? <CheckCircle color="success" /> : <Cancel color="disabled" />
      ),
    },
    {
      field: 'inspectionRequired',
      headerName: 'Inspection',
      width: 100,
      renderCell: (params) => (
        params.value ? <Security color="warning" /> : <CheckCircle color="success" />
      ),
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
                setSelectedDeclaration(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.status === 'UNDER_REVIEW' && (
            <Tooltip title="Clear Declaration">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDeclaration(params.row);
                  setClearanceDialogOpen(true);
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          {params.row.inspectionRequired && params.row.status === 'SUBMITTED' && (
            <Tooltip title="Schedule Inspection">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDeclaration(params.row);
                  setInspectionDialogOpen(true);
                }}
              >
                <Security />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === 'UNDER_INSPECTION' && (
            <Tooltip title="Complete Inspection">
              <IconButton 
                size="small" 
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteInspection(params.row.declarationId);
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

  const getDeclarationStats = () => {
    const total = declarations.length;
    const cleared = declarations.filter(d => d.status === 'CLEARED').length;
    const pending = declarations.filter(d => d.status === 'UNDER_REVIEW').length;
    const totalValue = declarations.reduce((sum, declaration) => sum + declaration.value, 0);

    return { total, cleared, pending, totalValue };
  };

  const stats = getDeclarationStats();

  // Brand colors for Customs Portal
  const brandPrimary = '#0F47AF'; // Government Blue
  const brandSecondary = '#FCDD09'; // Ethiopian Gold

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🛃 Customs Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Ethiopian Customs Commission - Export Declaration & Clearance Management
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
            New Declaration
          </AnimatedButton>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Declarations"
            value={stats.total}
            icon={<Assignment />}
            trend="up"
            trendValue="+18%"
            brandColor={brandPrimary}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Cleared"
            value={stats.cleared}
            icon={<CheckCircle />}
            trend="up"
            trendValue="+12%"
            brandColor="#4caf50"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Under Review"
            value={stats.pending}
            icon={<Warning />}
            trend="down"
            trendValue="-5%"
            brandColor="#ff9800"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Value"
            value={`$${(stats.totalValue / 1000).toFixed(1)}K`}
            icon={<LocalShipping />}
            trend="up"
            trendValue="+22%"
            brandColor={brandSecondary}
          />
        </Grid>
      </Grid>
      {/* 2026 EUDR Compliance Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>EUDR Compliance (2026):</strong> Enhanced documentation required for EU destinations. 
          Deforestation-free verification mandatory for all coffee exports to European Union.
          <br />
          <strong>Processing Time:</strong> Standard: 1.8 days • EUDR Enhanced: 6.5 days • Risk-based: 3.1 days
        </Typography>
      </Alert>

      {/* Tabs */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Export Declarations" />
            <Tab label="Inspections" />
            <Tab label="EUDR Compliance" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={declarations}
              columns={declarationColumns}
              getRowId={(row) => row.declarationId}
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
            Inspection Management
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <CustomsInspection />
          </Box>

          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Inspection Queue
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Count</TableCell>
                        <TableCell>Avg Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inspectionData.map((inspection) => (
                        <TableRow key={inspection.type}>
                          <TableCell>{inspection.type}</TableCell>
                          <TableCell>{inspection.count}</TableCell>
                          <TableCell>{inspection.avgTime}h</TableCell>
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
                    Inspection Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Physical Inspections: 45 pending
                    </Typography>
                    <LinearProgress variant="determinate" value={75} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Documentary Reviews: 123 pending
                    </Typography>
                    <LinearProgress variant="determinate" value={60} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      EUDR Enhanced: 28 pending
                    </Typography>
                    <LinearProgress variant="determinate" value={40} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inspection Workflow (2026)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip label="1. Declaration Review" color="primary" />
                <Typography>→</Typography>
                <Chip label="2. Risk Assessment" color="secondary" />
                <Typography>→</Typography>
                <Chip label="3. Physical/Documentary" color="warning" />
                <Typography>→</Typography>
                <Chip label="4. EUDR Verification" color="success" />
                <Typography>→</Typography>
                <Chip label="5. Clearance" color="success" />
              </Box>
              <Typography variant="body2" color="textSecondary">
                Enhanced inspection protocols for 2026 include mandatory EUDR compliance checks for EU destinations,
                GPS-based origin verification, and blockchain-integrated traceability validation.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            EUDR Compliance Management (2026)
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    EUDR Declarations
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    48
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    This month
                  </Typography>
                  <LinearProgress variant="determinate" value={85} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Rate
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    98.2%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Deforestation-free
                  </Typography>
                  <LinearProgress variant="determinate" value={98.2} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    GPS Verification
                  </Typography>
                  <Typography variant="h4" color="secondary.main">
                    100%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Origin verified
                  </Typography>
                  <LinearProgress variant="determinate" value={100} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                EUDR Requirements Checklist
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Mandatory Documentation:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ GPS coordinates of coffee farms
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Deforestation-free certification
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Supply chain traceability data
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Due diligence statements
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Verification Process:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔍 Satellite imagery analysis
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔍 Third-party certification review
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔍 Blockchain traceability validation
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔍 Risk assessment scoring
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Customs Analytics & Performance
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Clearance Trends by Type
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={clearanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="standard" stroke="#2196f3" strokeWidth={3} name="Standard" />
                        <Line type="monotone" dataKey="simplified" stroke="#4caf50" strokeWidth={3} name="Simplified" />
                        <Line type="monotone" dataKey="eudr" stroke="#ff9800" strokeWidth={3} name="EUDR Enhanced" />
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
                    Declaration Status Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {statusDistribution.map((entry, index) => (
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
                      3.2
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Clearance Days
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      94.5%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      First-time Clearance
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary.main">
                      98.2%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      EUDR Compliance
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      2.1%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Rejection Rate
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
      </ModernCard>
      {/* Declaration Detail Dialog */}
      <Dialog open={!!selectedDeclaration && !clearanceDialogOpen && !inspectionDialogOpen} onClose={() => setSelectedDeclaration(null)} maxWidth="md" fullWidth>
        <DialogTitle>Customs Declaration Details</DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Declaration ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedDeclaration.declarationId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipment ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedDeclaration.shipmentId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedDeclaration.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Destination</Typography>
                  <Typography variant="body1">{selectedDeclaration.destination}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Declaration Type</Typography>
                  <Chip
                    label={selectedDeclaration.declarationType}
                    size="small"
                    color={
                      selectedDeclaration.declarationType === 'STANDARD' ? 'primary' :
                      selectedDeclaration.declarationType === 'SIMPLIFIED' ? 'secondary' : 'success'
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">HS Code</Typography>
                  <Typography variant="body1">{selectedDeclaration.hsCode}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1">{selectedDeclaration.quantity.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Value</Typography>
                  <Typography variant="body1" color="primary" fontWeight={600}>
                    {formatCurrency(selectedDeclaration.value, selectedDeclaration.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">EUDR Compliant</Typography>
                  <Box>
                    {selectedDeclaration.eudrCompliant ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="disabled" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Inspection Required</Typography>
                  <Box>
                    {selectedDeclaration.inspectionRequired ? (
                      <Security color="warning" />
                    ) : (
                      <CheckCircle color="success" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip status={selectedDeclaration.status} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Submission Date</Typography>
                  <Typography variant="body1">{formatDate(selectedDeclaration.submissionDate)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Customs Officer</Typography>
                  <Typography variant="body1">{selectedDeclaration.customsOfficer}</Typography>
                </Grid>
                {selectedDeclaration.clearanceDate && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Clearance Date</Typography>
                    <Typography variant="body1">{formatDate(selectedDeclaration.clearanceDate)}</Typography>
                  </Grid>
                )}
              </Grid>
              
              {selectedDeclaration.status === 'UNDER_REVIEW' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This declaration is under review. {selectedDeclaration.inspectionRequired ? 'Inspection is required before clearance.' : 'Review and clear to proceed with export.'}
                </Alert>
              )}
              
              {selectedDeclaration.status === 'CLEARED' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  This declaration has been cleared. The shipment is authorized for export.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedDeclaration(null)}>
            Close
          </AnimatedButton>
          {selectedDeclaration?.status === 'UNDER_REVIEW' && (
            <>
              {selectedDeclaration.inspectionRequired && (
                <AnimatedButton
                  variant="outlined"
                  brandColor="#ff9800"
                  onClick={() => {
                    setInspectionDialogOpen(true);
                  }}
                >
                  Schedule Inspection
                </AnimatedButton>
              )}
              <AnimatedButton
                variant="contained"
                brandColor="#4caf50"
                onClick={() => {
                  setClearanceDialogOpen(true);
                }}
              >
                Clear Declaration
              </AnimatedButton>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Clearance Dialog */}
      <Dialog open={clearanceDialogOpen} onClose={() => setClearanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Clear Export Declaration</DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Declaration ID:</strong> {selectedDeclaration.declarationId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Shipment ID:</strong> {selectedDeclaration.shipmentId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Exporter:</strong> {selectedDeclaration.exporterId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Declaration Type:</strong> {selectedDeclaration.declarationType}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>HS Code:</strong> {selectedDeclaration.hsCode}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Destination:</strong> {selectedDeclaration.destination}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Value:</strong> {formatCurrency(selectedDeclaration.value, selectedDeclaration.currency)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>EUDR Compliant:</strong> {selectedDeclaration.eudrCompliant ? 'Yes' : 'No'}
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Clearing this declaration will authorize export and update blockchain records. 
                {selectedDeclaration.eudrCompliant && selectedDeclaration.destination === 'Germany' && 
                  ' EUDR compliance verified for EU destination.'}
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setClearanceDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#4caf50"
            onClick={() => {
              if (!selectedDeclaration) return;
              handleClearDeclaration(selectedDeclaration.declarationId);
            }}
          >
            Clear Declaration
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={inspectionDialogOpen} onClose={() => setInspectionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Inspection</DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Declaration ID:</strong> {selectedDeclaration.declarationId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Inspection Type:</strong> {selectedDeclaration.eudrCompliant ? 'EUDR Enhanced' : 'Standard Physical'}
              </Typography>
              
              <TextField
                fullWidth
                label="Inspector Notes"
                multiline
                rows={3}
                sx={{ mt: 2 }}
                placeholder="Enter inspection requirements and special instructions..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setInspectionDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#0F47AF"
            onClick={() => {
              if (selectedDeclaration) {
                handleScheduleInspection(selectedDeclaration.declarationId);
              }
            }}
          >
            Schedule Inspection
          </AnimatedButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomsPortal;