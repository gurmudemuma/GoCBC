// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Repatriation Management Tab - NBE Portal
// Manages export proceeds repatriation compliance and monitoring

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
  CheckCircle,
  Warning,
  AttachMoney,
  TrendingUp,
  Assessment,
  FileDownload,
  FilterList,
  Refresh,
  Schedule,
  VerifiedUser,
} from '@mui/icons-material';
import { apiFetch, API_ENDPOINTS, getAuthHeaders } from '@/config/api.config';
import { DashboardKPI } from '@/components/modern';
import { BlockchainStatusIcon, BlockchainTxChip } from '@/components/blockchain';
import { useNotification } from '@/hooks/useNotification';
import RepatriationDetailsDialog from './RepatriationDetailsDialog';
import RepatriationCompliancePanel from './RepatriationCompliancePanel';

// NBE Bronze Theme
const NBE_COLORS = {
  bronze: '#8B6F47',
  lightBronze: '#C4A574',
  success: '#2e7d32',
  warning: '#f57c00',
  error: '#d32f2f',
};

interface Repatriation {
  repatriationId: string;
  paymentId: string;
  contractId: string;
  shipmentId: string;
  exporterId: string;
  exporterName?: string;
  exportAmount: number;
  currency: string;
  fcyAccountNumber: string;
  fcyBank: string;
  fcyBankBIC: string;
  shipmentDate: string;
  repatriationDeadline: string;
  status: 'INITIATED' | 'RECEIVED' | 'VERIFIED' | 'COMPLIANT' | 'OVERDUE' | 'VIOLATION';
  initiatedDate: string;
  receivedDate?: string;
  verifiedDate?: string;
  verifiedBy?: string;
  verifiedByMsp?: string;
  daysRemaining?: number;
  daysOverdue?: number;
  complianceRate?: number;
  swiftReference?: string;
  bankStatementHash?: string;
  txId?: string;
  timestamp?: string;
}

interface RepatriationStats {
  total: number;
  pending: number;
  compliant: number;
  overdue: number;
  complianceRate: number;
  totalValue: number;
}

const RepatriationManagementTab: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  
  const [repatriations, setRepatriations] = useState<Repatriation[]>([]);
  const [filteredRepatriations, setFilteredRepatriations] = useState<Repatriation[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RepatriationStats>({
    total: 0,
    pending: 0,
    compliant: 0,
    overdue: 0,
    complianceRate: 0,
    totalValue: 0,
  });
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [compliancePanelOpen, setCompliancePanelOpen] = useState(false);
  const [selectedRepatriation, setSelectedRepatriation] = useState<Repatriation | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all repatriations
  const fetchRepatriations = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/v1/repatriation', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.success) {
        const data = result.data || [];
        setRepatriations(data);
        setFilteredRepatriations(data);
        calculateStats(data);
        showSuccess(`Loaded ${data.length} repatriation records`);
      } else {
        showError(result.error || 'Failed to fetch repatriations');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error fetching data:', error);
      showError('Failed to load repatriation data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: Repatriation[]) => {
    const total = data.length;
    const pending = data.filter(r => r.status === 'INITIATED' || r.status === 'RECEIVED').length;
    const compliant = data.filter(r => r.status === 'COMPLIANT' || r.status === 'VERIFIED').length;
    const overdue = data.filter(r => r.status === 'OVERDUE' || r.status === 'VIOLATION').length;
    const complianceRate = total > 0 ? (compliant / total) * 100 : 0;
    const totalValue = data.reduce((sum, r) => sum + r.exportAmount, 0);
    
    setStats({
      total,
      pending,
      compliant,
      overdue,
      complianceRate,
      totalValue,
    });
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...repatriations];
    
    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.repatriationId.toLowerCase().includes(search) ||
        r.exporterId.toLowerCase().includes(search) ||
        r.exporterName?.toLowerCase().includes(search) ||
        r.paymentId.toLowerCase().includes(search)
      );
    }
    
    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.initiatedDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(r => new Date(r.initiatedDate) <= new Date(dateTo));
    }
    
    setFilteredRepatriations(filtered);
    calculateStats(filtered);
  }, [statusFilter, searchTerm, dateFrom, dateTo, repatriations]);

  // Load data on mount
  useEffect(() => {
    fetchRepatriations();
  }, []);

  // Handle view details
  const handleViewDetails = (repatriation: Repatriation) => {
    setSelectedRepatriation(repatriation);
    setDetailsDialogOpen(true);
  };

  // Handle verify repatriation
  const handleVerify = async (repatriationId: string) => {
    try {
      const response = await apiFetch(`/api/v1/repatriation/${repatriationId}/verify`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verifiedBy: 'NBE Officer', // From auth context
          verificationNotes: 'Verified by NBE',
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Repatriation verified successfully');
        fetchRepatriations(); // Refresh data
      } else {
        showError(result.error || 'Failed to verify repatriation');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error verifying:', error);
      showError('Failed to verify repatriation');
    }
  };

  // Handle mark compliant
  const handleMarkCompliant = async (repatriationId: string) => {
    try {
      const response = await apiFetch(`/api/v1/repatriation/${repatriationId}/complete`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          completedBy: 'NBE Officer',
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Repatriation marked as compliant');
        fetchRepatriations();
      } else {
        showError(result.error || 'Failed to mark compliant');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error marking compliant:', error);
      showError('Failed to mark compliant');
    }
  };

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Repatriation ID', 'Exporter', 'Amount', 'Currency', 'Status', 'Deadline', 'Days Remaining'].join(','),
      ...filteredRepatriations.map(r => [
        r.repatriationId,
        r.exporterName || r.exporterId,
        r.exportAmount,
        r.currency,
        r.status,
        r.repatriationDeadline,
        r.daysRemaining || 'N/A'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repatriations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showSuccess('Export downloaded');
  };

  // Status chip renderer
  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      INITIATED: { color: '#1976d2', label: 'Initiated', icon: <Schedule /> },
      RECEIVED: { color: '#0288d1', label: 'Received', icon: <AttachMoney /> },
      VERIFIED: { color: '#0097a7', label: 'Verified', icon: <VerifiedUser /> },
      COMPLIANT: { color: NBE_COLORS.success, label: 'Compliant', icon: <CheckCircle /> },
      OVERDUE: { color: NBE_COLORS.warning, label: 'Overdue', icon: <Warning /> },
      VIOLATION: { color: NBE_COLORS.error, label: 'Violation', icon: <Warning /> },
    };
    
    const config = statusConfig[status] || statusConfig.INITIATED;
    
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

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'repatriationId',
      headerName: 'Repatriation ID',
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
      field: 'exporterName',
      headerName: 'Exporter',
      width: 180,
      valueGetter: (params: any) => params.row.exporterName || params.row.exporterId,
    },
    {
      field: 'exportAmount',
      headerName: 'Export Amount',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={600} color={NBE_COLORS.bronze}>
          {params.row.currency} {params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.value),
    },
    {
      field: 'repatriationDeadline',
      headerName: 'Deadline',
      width: 120,
      valueFormatter: (params: any) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'daysRemaining',
      headerName: 'Days Remaining',
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const days = params.value;
        const isOverdue = params.row.status === 'OVERDUE' || params.row.status === 'VIOLATION';
        const color = isOverdue ? NBE_COLORS.error : days < 7 ? NBE_COLORS.warning : NBE_COLORS.success;
        
        return (
          <Chip
            label={isOverdue ? `${params.row.daysOverdue || 0} days overdue` : `${days || 'N/A'} days`}
            size="small"
            sx={{
              backgroundColor: color,
              color: 'white',
              fontWeight: 600,
            }}
          />
        );
      },
    },
    {
      field: 'initiatedDate',
      headerName: 'Initiated',
      width: 120,
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleViewDetails(params.row)}
              sx={{ color: NBE_COLORS.bronze }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {params.row.status === 'RECEIVED' && (
            <Tooltip title="Verify">
              <IconButton
                size="small"
                onClick={() => handleVerify(params.row.repatriationId)}
                sx={{ color: NBE_COLORS.success }}
              >
                <VerifiedUser fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {params.row.status === 'VERIFIED' && (
            <Tooltip title="Mark Compliant">
              <IconButton
                size="small"
                onClick={() => handleMarkCompliant(params.row.repatriationId)}
                sx={{ color: NBE_COLORS.success }}
              >
                <CheckCircle fontSize="small" />
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
            title="Total Repatriations"
            value={stats.total}
            icon={<Assessment />}
            color={NBE_COLORS.bronze}
            subtitle="All records"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Pending Verification"
            value={stats.pending}
            icon={<Schedule />}
            color="#1976d2"
            subtitle="Awaiting NBE action"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Compliant"
            value={stats.compliant}
            icon={<CheckCircle />}
            color={NBE_COLORS.success}
            subtitle={`${stats.complianceRate.toFixed(1)}% compliance rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Overdue"
            value={stats.overdue}
            icon={<Warning />}
            color={NBE_COLORS.error}
            subtitle="Requires attention"
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
                placeholder="ID, Exporter, Payment..."
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
                <MenuItem value="INITIATED">Initiated</MenuItem>
                <MenuItem value="RECEIVED">Received</MenuItem>
                <MenuItem value="VERIFIED">Verified</MenuItem>
                <MenuItem value="COMPLIANT">Compliant</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
                <MenuItem value="VIOLATION">Violation</MenuItem>
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
            <Grid item xs={12} sm={6} md={1.5}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchRepatriations}
                sx={{ borderColor: NBE_COLORS.bronze, color: NBE_COLORS.bronze }}
              >
                Refresh
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={1.5}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={handleExport}
                sx={{ borderColor: NBE_COLORS.bronze, color: NBE_COLORS.bronze }}
              >
                Export
              </Button>
            </Grid>
          </Grid>
          
          {stats.overdue > 0 && (
            <Box sx={{ mt: 2 }}>
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => setCompliancePanelOpen(true)}
                  >
                    View Details
                  </Button>
                }
              >
                {stats.overdue} repatriation(s) are overdue. Compliance action required.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredRepatriations}
          columns={columns}
          getRowId={(row) => row.repatriationId}
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
              backgroundColor: NBE_COLORS.lightBronze,
              color: 'white',
              fontWeight: 600,
            },
          }}
        />
      </Paper>

      {/* Details Dialog */}
      {selectedRepatriation && (
        <RepatriationDetailsDialog
          open={detailsDialogOpen}
          onClose={() => {
            setDetailsDialogOpen(false);
            setSelectedRepatriation(null);
          }}
          repatriation={selectedRepatriation}
          onRefresh={fetchRepatriations}
        />
      )}

      {/* Compliance Panel */}
      <RepatriationCompliancePanel
        open={compliancePanelOpen}
        onClose={() => setCompliancePanelOpen(false)}
        overdueRepatriations={repatriations.filter(r => r.status === 'OVERDUE' || r.status === 'VIOLATION')}
        onRefresh={fetchRepatriations}
      />
    </Box>
  );
};

export default RepatriationManagementTab;
