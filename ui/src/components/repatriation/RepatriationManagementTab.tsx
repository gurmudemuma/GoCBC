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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Gavel,
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
  status: 'PENDING' | 'PARTIAL' | 'READY_FOR_VERIFICATION' | 'COMPLIED' | 'WAIVED' | 'NON_COMPLIANT' | 'OVERDUE';
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
  waiverRequested?: boolean;
  penaltyAmount?: number;
  penaltyCurrency?: string;
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

  // Penalty dialog state — chaincode ApplyNonCompliancePenalty only accepts
  // NON_COMPLIANT / OVERDUE records, with a positive amount, currency and reason.
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
  const [penaltyForm, setPenaltyForm] = useState({ repatriationId: '', penaltyAmount: '', penaltyCurrency: 'ETB', reason: '' });
  // Waiver dialog state — chaincode ApproveWaiver only applies when a waiver
  // was requested (WaiverRequested); `approved` must be exactly true/false.
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const [waiverForm, setWaiverForm] = useState({ repatriationId: '', approved: true, reason: '' });
  const [actionBusy, setActionBusy] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all repatriations
  const fetchRepatriations = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/repatriation', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.success) {
        const data = (result.data || []).map((item: any) => {
          const daysRemaining = Number(item.daysRemaining ?? item.DaysRemaining ?? 0);
          const rawStatus = String(item.status ?? item.Status ?? 'PENDING').toUpperCase();
          return {
            ...item,
            repatriationId: item.repatriationId || item.RepatriationID || '',
            paymentId: item.paymentId || item.PaymentID || '',
            contractId: item.contractId || item.ContractID || '',
            shipmentId: item.shipmentId || item.ShipmentID || '',
            exporterId: item.exporterId || item.ExporterID || '',
            exportAmount: Number(item.exportAmount ?? item.ExportAmount ?? 0),
            currency: item.currency || item.Currency || 'USD',
            status: rawStatus,
            initiatedDate: item.createdAt || item.CreatedAt || item.initiatedDate || '',
            repatriationDeadline: item.complianceDeadline || item.ComplianceDeadline || item.repatriationDeadline || '',
            daysRemaining,
            daysOverdue: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
            verifiedDate: item.verificationDate || item.VerificationDate,
            complianceDate: item.complianceDate || item.ComplianceDate,
            waiverRequested: Boolean(item.waiverRequested ?? item.WaiverRequested ?? false),
            penaltyAmount: item.penaltyAmount ?? item.PenaltyAmount,
            penaltyCurrency: item.penaltyCurrency ?? item.PenaltyCurrency,
          };
        });
        setRepatriations(data);
        setFilteredRepatriations(data);
        calculateStats(data);
        showSuccess('Success', `Loaded ${data.length} repatriation records`);
      } else {
        showError('Error', result.error || 'Failed to fetch repatriations');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error fetching data:', error);
      showError('Error', 'Failed to load repatriation data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: Repatriation[]) => {
    const total = data.length;
    const pending = data.filter(r => ['PENDING', 'PARTIAL', 'READY_FOR_VERIFICATION'].includes(r.status)).length;
    const compliant = data.filter(r => r.status === 'COMPLIED').length;
    const overdue = data.filter(r => r.status === 'OVERDUE' || r.status === 'NON_COMPLIANT').length;
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
      const verificationRef = window.prompt('Enter the NBE verification reference');
      if (!verificationRef?.trim()) return;
      const verificationNotes = window.prompt('Verification notes (optional)') || '';
      const response = await apiFetch(`/repatriation/${repatriationId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verificationRef: verificationRef.trim(),
          verificationNotes,
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Success', 'Repatriation verified successfully');
        fetchRepatriations(); // Refresh data
      } else {
        showError('Error', result.error || 'Failed to verify repatriation');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error verifying:', error);
      showError('Error', 'Failed to verify repatriation');
    }
  };

  // Apply non-compliance penalty — POST /repatriation/:id/penalty (NBE).
  const handleApplyPenalty = async () => {
    const amount = Number(penaltyForm.penaltyAmount);
    if (!penaltyForm.repatriationId || !Number.isFinite(amount) || amount <= 0) {
      showError('Error', 'Enter a penalty amount greater than 0');
      return;
    }
    if (!penaltyForm.penaltyCurrency.trim() || !penaltyForm.reason.trim()) {
      showError('Error', 'Penalty currency and reason are required');
      return;
    }
    try {
      setActionBusy(true);
      const response = await apiFetch(`/repatriation/${penaltyForm.repatriationId}/penalty`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          penaltyAmount: amount,
          penaltyCurrency: penaltyForm.penaltyCurrency.trim(),
          reason: penaltyForm.reason.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        showSuccess('Success', 'Penalty applied successfully');
        setPenaltyDialogOpen(false);
        setPenaltyForm({ repatriationId: '', penaltyAmount: '', penaltyCurrency: 'ETB', reason: '' });
        fetchRepatriations();
      } else {
        showError('Error', result.error?.message || result.error || 'Failed to apply penalty');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error applying penalty:', error);
      showError('Error', 'Failed to apply penalty');
    } finally {
      setActionBusy(false);
    }
  };

  // Approve / reject a requested waiver — POST /repatriation/:id/waiver/approve (NBE).
  const handleApproveWaiver = async () => {
    if (!waiverForm.repatriationId) return;
    try {
      setActionBusy(true);
      const response = await apiFetch(`/repatriation/${waiverForm.repatriationId}/waiver/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          approved: waiverForm.approved,
          reason: waiverForm.reason.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        showSuccess('Success', `Waiver ${waiverForm.approved ? 'approved' : 'rejected'} successfully`);
        setWaiverDialogOpen(false);
        setWaiverForm({ repatriationId: '', approved: true, reason: '' });
        fetchRepatriations();
      } else {
        showError('Error', result.error?.message || result.error || 'Failed to decide waiver');
      }
    } catch (error: any) {
      console.error('[REPATRIATION] Error deciding waiver:', error);
      showError('Error', 'Failed to decide waiver');
    } finally {
      setActionBusy(false);
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
    showSuccess('Success', 'Export downloaded');
  };

  // Status chip renderer
  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
      PENDING: { color: '#1976d2', label: 'Pending', icon: <Schedule /> },
      PARTIAL: { color: '#0288d1', label: 'Partial', icon: <AttachMoney /> },
      READY_FOR_VERIFICATION: { color: '#0097a7', label: 'Ready for NBE review', icon: <VerifiedUser /> },
      COMPLIED: { color: NBE_COLORS.success, label: 'Compliant', icon: <CheckCircle /> },
      WAIVED: { color: '#607d8b', label: 'Waived by NBE', icon: <VerifiedUser /> },
      NON_COMPLIANT: { color: NBE_COLORS.error, label: 'Non-compliant', icon: <Warning /> },
      OVERDUE: { color: NBE_COLORS.warning, label: 'Overdue', icon: <Warning /> },
    };
    
    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <Chip
        label={config.label}
        size="small"
        icon={config.icon as React.ReactElement}
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
          {params.row.txId && <BlockchainStatusIcon status="RECORDED" txId={params.row.txId} size="small" />}
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
        const isOverdue = params.row.status === 'OVERDUE' || params.row.status === 'NON_COMPLIANT';
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
      width: 280,
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

          {(params.row.status === 'READY_FOR_VERIFICATION' || params.row.status === 'OVERDUE') && (
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

          {/* Penalty — chaincode ApplyNonCompliancePenalty accepts only
              NON_COMPLIANT / OVERDUE records. */}
          {(params.row.status === 'NON_COMPLIANT' || params.row.status === 'OVERDUE') && (
            <Tooltip title="Apply Penalty">
              <IconButton
                size="small"
                onClick={() => {
                  setPenaltyForm({ repatriationId: params.row.repatriationId, penaltyAmount: '', penaltyCurrency: 'ETB', reason: '' });
                  setPenaltyDialogOpen(true);
                }}
                sx={{ color: NBE_COLORS.error }}
              >
                <Gavel fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Waiver decision — chaincode ApproveWaiver only applies when a
              waiver was requested (WaiverRequested). */}
          {params.row.waiverRequested && params.row.status !== 'WAIVED' && params.row.status !== 'COMPLIED' && (
            <Tooltip title="Approve / Reject Waiver">
              <IconButton
                size="small"
                onClick={() => {
                  setWaiverForm({ repatriationId: params.row.repatriationId, approved: true, reason: '' });
                  setWaiverDialogOpen(true);
                }}
                sx={{ color: NBE_COLORS.warning }}
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
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="PARTIAL">Partial</MenuItem>
                <MenuItem value="READY_FOR_VERIFICATION">Ready for NBE review</MenuItem>
                <MenuItem value="COMPLIED">Compliant</MenuItem>
                <MenuItem value="WAIVED">Waived by NBE</MenuItem>
                <MenuItem value="OVERDUE">Overdue</MenuItem>
                <MenuItem value="NON_COMPLIANT">Non-compliant</MenuItem>
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
        </CardContent>
      </Card>

      {/* Compliance Panel opener — the panel was rendered but
          compliancePanelOpen was never set to true anywhere, so sending
          compliance notices to overdue exporters was unreachable. */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Warning />}
          onClick={() => setCompliancePanelOpen(true)}
          disabled={repatriations.filter(r => r.status === 'OVERDUE' || r.status === 'NON_COMPLIANT').length === 0}
          sx={{ backgroundColor: NBE_COLORS.bronze, '&:hover': { backgroundColor: NBE_COLORS.lightBronze } }}
        >
          Compliance Notices ({repatriations.filter(r => r.status === 'OVERDUE' || r.status === 'NON_COMPLIANT').length} overdue)
        </Button>
      </Box>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredRepatriations}
          columns={columns}
          getRowId={(row) => row.repatriationId}
          loading={loading}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
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
        />
      )}

      {/* Compliance Panel */}
      <RepatriationCompliancePanel
        open={compliancePanelOpen}
        onClose={() => setCompliancePanelOpen(false)}
        overdueRepatriations={repatriations.filter(r =>
          (r.status === 'OVERDUE' || r.status === 'NON_COMPLIANT') && r.daysOverdue !== undefined
        ) as any}
        onRefresh={fetchRepatriations}
      />

      {/* Apply Penalty Dialog */}
      <Dialog open={penaltyDialogOpen} onClose={() => setPenaltyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Non-Compliance Penalty {penaltyForm.repatriationId ? `— ${penaltyForm.repatriationId}` : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Penalty Amount *"
                  type="number"
                  value={penaltyForm.penaltyAmount}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, penaltyAmount: e.target.value })}
                  fullWidth
                  required
                  inputProps={{ min: 0, step: '0.01' }}
                  helperText="Must be greater than 0"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Currency *"
                  value={penaltyForm.penaltyCurrency}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, penaltyCurrency: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Reason *"
                  value={penaltyForm.reason}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, reason: e.target.value })}
                  fullWidth
                  required
                  multiline
                  rows={2}
                  placeholder="Why the penalty is applied"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPenaltyDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            disabled={actionBusy || !penaltyForm.penaltyAmount || !penaltyForm.penaltyCurrency.trim() || !penaltyForm.reason.trim()}
            sx={{ backgroundColor: NBE_COLORS.error, '&:hover': { backgroundColor: '#b71c1c' } }}
            onClick={handleApplyPenalty}
          >
            {actionBusy ? 'Applying…' : 'Apply Penalty'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Waiver Decision Dialog */}
      <Dialog open={waiverDialogOpen} onClose={() => setWaiverDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Decide Waiver Request {waiverForm.repatriationId ? `— ${waiverForm.repatriationId}` : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Decision"
                  value={waiverForm.approved ? 'approve' : 'reject'}
                  onChange={(e) => setWaiverForm({ ...waiverForm, approved: e.target.value === 'approve' })}
                >
                  <MenuItem value="approve">Approve waiver (status becomes WAIVED)</MenuItem>
                  <MenuItem value="reject">Reject waiver</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Reason"
                  value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Reason for the decision (optional)"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaiverDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            disabled={actionBusy}
            sx={{ backgroundColor: NBE_COLORS.bronze, '&:hover': { backgroundColor: NBE_COLORS.lightBronze } }}
            onClick={handleApproveWaiver}
          >
            {actionBusy ? 'Submitting…' : waiverForm.approved ? 'Approve Waiver' : 'Reject Waiver'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RepatriationManagementTab;
