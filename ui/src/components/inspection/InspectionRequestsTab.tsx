// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Inspection Requests Tab - ECTA Portal
// Manages pre-shipment quality inspection requests and workflow

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  InputAdornment,
  Paper,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Visibility,
  Schedule,
  Assignment,
  CheckCircle,
  Cancel,
  Person,
  TrendingUp,
  Assessment,
  FilterList,
  Refresh,
  Science,
  VerifiedUser,
  Warning,
} from '@mui/icons-material';
import { apiFetch, API_ENDPOINTS, getAuthHeaders } from '@/config/api.config';
import { DashboardKPI } from '@/components/modern';
import { BlockchainStatusIcon, BlockchainTxChip } from '@/components/blockchain';
import { useNotification } from '@/hooks/useNotification';
import InspectionSchedulingDialog from './InspectionSchedulingDialog';
import InspectionConductDialog from './InspectionConductDialog';
import InspectionReportDialog from './InspectionReportDialog';

// ECTA Green Theme
const ECTA_COLORS = {
  green: '#2e7d32',
  lightGreen: '#66bb6a',
  success: '#4caf50',
  warning: '#f57c00',
  error: '#d32f2f',
};

interface Inspection {
  inspectionId: string;
  shipmentId: string;
  contractId: string;
  exporterId: string;
  exporterName?: string;
  coffeeType: string;
  quantity: number;
  status: 'REQUESTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PASSED' | 'FAILED';
  requestDate: string;
  scheduledDate?: string;
  completedDate?: string;
  inspectorId?: string;
  inspectorName?: string;
  location?: string;
  qualityGrade?: string;
  moistureContent?: number;
  defectPercentage?: number;
  certificateNumber?: string;
  failureReason?: string;
  txId?: string;
  timestamp?: string;
}

interface InspectionStats {
  total: number;
  pending: number;
  completedToday: number;
  passRate: number;
  avgDuration: number;
}

const InspectionRequestsTab: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<InspectionStats>({
    total: 0,
    pending: 0,
    completedToday: 0,
    passRate: 0,
    avgDuration: 0,
  });
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectorFilter, setInspectorFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Dialog states
  const [schedulingDialogOpen, setSchedulingDialogOpen] = useState(false);
  const [conductDialogOpen, setConductDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all inspections
  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/v1/inspection', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.success) {
        const data = result.data || [];
        setInspections(data);
        setFilteredInspections(data);
        calculateStats(data);
        showSuccess(`Loaded ${data.length} inspection records`);
      } else {
        showError(result.error || 'Failed to fetch inspections');
      }
    } catch (error: any) {
      console.error('[INSPECTION] Error fetching data:', error);
      showError('Failed to load inspection data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: Inspection[]) => {
    const total = data.length;
    const pending = data.filter(i => i.status === 'REQUESTED' || i.status === 'SCHEDULED').length;
    
    const today = new Date().toISOString().split('T')[0];
    const completedToday = data.filter(i => 
      i.completedDate && i.completedDate.startsWith(today)
    ).length;
    
    const completed = data.filter(i => i.status === 'PASSED' || i.status === 'FAILED');
    const passed = data.filter(i => i.status === 'PASSED').length;
    const passRate = completed.length > 0 ? (passed / completed.length) * 100 : 0;
    
    // Calculate average duration (simplified)
    const avgDuration = 2.5; // days (placeholder)
    
    setStats({
      total,
      pending,
      completedToday,
      passRate,
      avgDuration,
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...inspections];
    
    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.inspectionId.toLowerCase().includes(search) ||
        i.shipmentId.toLowerCase().includes(search) ||
        i.exporterId.toLowerCase().includes(search) ||
        i.exporterName?.toLowerCase().includes(search) ||
        i.coffeeType.toLowerCase().includes(search)
      );
    }
    
    // Inspector filter
    if (inspectorFilter !== 'ALL') {
      filtered = filtered.filter(i => i.inspectorName === inspectorFilter);
    }
    
    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(i => new Date(i.requestDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(i => new Date(i.requestDate) <= new Date(dateTo));
    }
    
    setFilteredInspections(filtered);
  }, [statusFilter, searchTerm, inspectorFilter, dateFrom, dateTo, inspections]);

  // Load data on mount
  useEffect(() => {
    fetchInspections();
  }, []);

  // Handle schedule inspection
  const handleSchedule = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setSchedulingDialogOpen(true);
  };

  // Handle conduct inspection
  const handleConduct = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setConductDialogOpen(true);
  };

  // Handle view report
  const handleViewReport = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setReportDialogOpen(true);
  };

  // Status chip renderer
  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      REQUESTED: { color: '#1976d2', label: 'Requested', icon: <Assignment /> },
      SCHEDULED: { color: '#0288d1', label: 'Scheduled', icon: <Schedule /> },
      IN_PROGRESS: { color: '#ff9800', label: 'In Progress', icon: <Science /> },
      COMPLETED: { color: '#0097a7', label: 'Completed', icon: <CheckCircle /> },
      PASSED: { color: ECTA_COLORS.success, label: 'Passed', icon: <CheckCircle /> },
      FAILED: { color: ECTA_COLORS.error, label: 'Failed', icon: <Cancel /> },
    };
    
    const config = statusConfig[status] || statusConfig.REQUESTED;
    
    return (
      <Chip
        label={config.label}
        size="small"
        icon={config.icon}
        sx={{
          backgroundColor: config.color,
          color: 'white',
          fontWeight: 600,
          '& .MuiChip-icon': { color: 'white' }
        }}
      />
    );
  };

  // Get unique inspectors for filter
  const uniqueInspectors = Array.from(new Set(inspections.map(i => i.inspectorName).filter(Boolean)));

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'inspectionId',
      headerName: 'Inspection ID',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
          {params.row.txId && <BlockchainStatusIcon verified={true} size="small" />}
        </Box>
      ),
    },
    {
      field: 'shipmentId',
      headerName: 'Shipment ID',
      width: 130,
    },
    {
      field: 'exporterName',
      headerName: 'Exporter',
      width: 160,
      valueGetter: (params: any) => params.row.exporterName || params.row.exporterId,
    },
    {
      field: 'coffeeType',
      headerName: 'Coffee Type',
      width: 140,
    },
    {
      field: 'quantity',
      headerName: 'Quantity (kg)',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {params.value.toLocaleString()} kg
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.value),
    },
    {
      field: 'inspectorName',
      headerName: 'Inspector',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Person sx={{ fontSize: 16 }} />
            <Typography variant="body2">{params.value}</Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">Not assigned</Typography>
        )
      ),
    },
    {
      field: 'qualityGrade',
      headerName: 'Grade',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            sx={{
              bgcolor: ECTA_COLORS.green,
              color: 'white',
              fontWeight: 600,
            }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">N/A</Typography>
        )
      ),
    },
    {
      field: 'requestDate',
      headerName: 'Requested',
      width: 120,
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {params.row.status === 'REQUESTED' && (
            <Tooltip title="Schedule Inspection">
              <IconButton
                size="small"
                onClick={() => handleSchedule(params.row)}
                sx={{ color: ECTA_COLORS.green }}
              >
                <Schedule fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {params.row.status === 'SCHEDULED' && (
            <Tooltip title="Conduct Inspection">
              <IconButton
                size="small"
                onClick={() => handleConduct(params.row)}
                sx={{ color: ECTA_COLORS.green }}
              >
                <Science fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {(params.row.status === 'PASSED' || params.row.status === 'FAILED') && (
            <Tooltip title="View Report">
              <IconButton
                size="small"
                onClick={() => handleViewReport(params.row)}
                sx={{ color: ECTA_COLORS.green }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Total Inspections"
            value={stats.total}
            icon={<Assessment />}
            color={ECTA_COLORS.green}
            subtitle="All records"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Pending Inspections"
            value={stats.pending}
            icon={<Schedule />}
            color="#1976d2"
            subtitle="Awaiting action"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Completed Today"
            value={stats.completedToday}
            icon={<CheckCircle />}
            color={ECTA_COLORS.success}
            subtitle={`${stats.passRate.toFixed(1)}% pass rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Avg Duration"
            value={`${stats.avgDuration.toFixed(1)}`}
            icon={<TrendingUp />}
            color="#ff9800"
            subtitle="days per inspection"
          />
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, Exporter, Coffee Type..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterList />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="REQUESTED">Requested</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="PASSED">Passed</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                size="small"
                label="Inspector"
                value={inspectorFilter}
                onChange={(e) => setInspectorFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Inspectors</MenuItem>
                {uniqueInspectors.map(inspector => (
                  <MenuItem key={inspector} value={inspector}>{inspector}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchInspections}
                sx={{ borderColor: ECTA_COLORS.green, color: ECTA_COLORS.green }}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
          
          {stats.pending > 0 && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                {stats.pending} inspection(s) pending. Assign inspectors and schedule visits.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredInspections}
          columns={columns}
          getRowId={(row) => row.inspectionId}
          loading={loading}
          pagination
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowsPerPageOptions={[5, 10, 25, 50]}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: ECTA_COLORS.lightGreen,
              color: 'white',
              fontWeight: 600,
            },
          }}
        />
      </Paper>

      {/* Scheduling Dialog */}
      {selectedInspection && (
        <InspectionSchedulingDialog
          open={schedulingDialogOpen}
          onClose={() => {
            setSchedulingDialogOpen(false);
            setSelectedInspection(null);
          }}
          inspection={selectedInspection}
          onSuccess={fetchInspections}
        />
      )}

      {/* Conduct Inspection Dialog */}
      {selectedInspection && (
        <InspectionConductDialog
          open={conductDialogOpen}
          onClose={() => {
            setConductDialogOpen(false);
            setSelectedInspection(null);
          }}
          inspection={selectedInspection}
          onSuccess={fetchInspections}
        />
      )}

      {/* Report Dialog */}
      {selectedInspection && (
        <InspectionReportDialog
          open={reportDialogOpen}
          onClose={() => {
            setReportDialogOpen(false);
            setSelectedInspection(null);
          }}
          inspection={selectedInspection}
        />
      )}
    </Box>
  );
};

export default InspectionRequestsTab;
