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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

// NOTE (0.8): the old InspectionSchedulingDialog / InspectionConductDialog /
// InspectionReportDialog components are NOT used here any more — they called
// the wrong endpoints (PUT /inspection/:id/schedule with {scheduledDate,
// inspectorId, ...}; POST /quality/inspections/:id/perform for a
// pre-shipment entity; report `passed = status === 'PASSED'`, a status no
// PreShipmentInspection ever carries). The corrected Schedule / Conduct /
// Report dialogs live inline below so this tab calls the real pre-shipment
// routes. Those three dialog files are now dead code and can be deleted.

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
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  // Inspection outcome recorded by RecordInspectionResults
  // (chaincodes/coffee/inspection.go): PASS, FAIL or CONDITIONAL_PASS.
  // Pass/fail is derived from this field, never from status — no
  // PreShipmentInspection row ever carries PASSED/FAILED as a status.
  overallResult?: string;
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

  // 0.8 — Schedule form. These are exactly the fields the route reads
  // (api/src/routes/inspection.ts:291 POST /inspection/:id/schedule):
  // { inspectorName, inspectorLicense, inspectionDate }. The old dialog
  // sent { scheduledDate, inspectorId, location, notes } via PUT — the
  // route ignores all of them, so scheduling silently did nothing.
  const [scheduleForm, setScheduleForm] = useState({ inspectorName: '', inspectorLicense: '', inspectionDate: '' });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // 0.8 — Conduct form. Fields are exactly what POST /inspection/:id/results
  // reads (inspection.ts:335): inspectedQuantity, actualGrade, cuppingScore,
  // defectsCount, moistureContent, beanSize, bagsInspected,
  // packagingCondition, overallResult, inspectionNotes. This is the
  // pre-shipment entity — NOT POST /quality/inspections/:id/perform, which
  // 404s because the id is not in quality_inspections.
  // Leg2 #6: cuppingScore and overallResult start BLANK — the old form
  // prefilled a passing outcome (cuppingScore 80, overallResult PASS),
  // so an inspector could record a pass without entering anything.
  // Submit requires both to be entered explicitly.
  const [conductForm, setConductForm] = useState<{
    inspectedQuantity: number;
    actualGrade: string;
    cuppingScore: number | '';
    defectsCount: number;
    moistureContent: number;
    beanSize: string;
    bagsInspected: number;
    packagingCondition: string;
    overallResult: '' | 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
    inspectionNotes: string;
  }>({
    inspectedQuantity: 0,
    actualGrade: 'Grade 1',
    cuppingScore: '',
    defectsCount: 0,
    moistureContent: 11,
    beanSize: '',
    bagsInspected: 0,
    packagingCondition: 'GOOD',
    overallResult: '',
    inspectionNotes: '',
  });
  const [conductSubmitting, setConductSubmitting] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all inspections
  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/inspection', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.success) {
        const data = result.data || [];
        setInspections(data);
        setFilteredInspections(data);
        calculateStats(data);
        showSuccess('Success', `Loaded ${data.length} inspection records`);
      } else {
        showError('Error', result.error || 'Failed to fetch inspections');
      }
    } catch (error: any) {
      console.error('[INSPECTION] Error fetching data:', error);
      showError('Error', 'Failed to load inspection data');
    } finally {
      setLoading(false);
    }
  };

  // Overall inspection outcome (PASS / FAIL / CONDITIONAL_PASS), from the
  // chaincode `overallResult` field (RecordInspectionResults sets COMPLETED
  // for PASS, CONDITIONAL_PASS and FAIL alike, so status alone cannot tell
  // a pass from a fail).
  const getOverallResult = (i: Inspection): string =>
    String((i as any).overallResult || (i as any).result || (i as any).outcome || '').toUpperCase();

  // Calculate statistics
  const calculateStats = (data: Inspection[]) => {
    const total = data.length;
    const pending = data.filter(i => i.status === 'REQUESTED' || i.status === 'SCHEDULED').length;
    
    const today = new Date().toISOString().split('T')[0];
    const completedToday = data.filter(i => 
      i.completedDate && i.completedDate.startsWith(today)
    ).length;
    
    // Pass/fail comes from the result field, not status: a completed
    // inspection has overallResult PASS, CONDITIONAL_PASS or FAIL.
    const withResult = data.filter(i => ['PASS', 'FAIL', 'CONDITIONAL_PASS'].includes(getOverallResult(i)));
    const passed = withResult.filter(i => getOverallResult(i) !== 'FAIL').length;
    const passRate = withResult.length > 0 ? (passed / withResult.length) * 100 : 0;
    
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
    
    // Search filter — every field may be undefined on rows the chaincode
    // returns (e.g. coffeeType is absent on all rows), so guard all of them.
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        (i.inspectionId || '').toLowerCase().includes(search) ||
        (i.shipmentId || '').toLowerCase().includes(search) ||
        (i.exporterId || '').toLowerCase().includes(search) ||
        i.exporterName?.toLowerCase().includes(search) ||
        (i.coffeeType || '').toLowerCase().includes(search)
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
    setScheduleForm({ inspectorName: '', inspectorLicense: '', inspectionDate: '' });
    setSchedulingDialogOpen(true);
  };

  // 0.8 — Schedule: POST /inspection/:id/schedule with the route's fields.
  const handleScheduleSubmit = async () => {
    if (!selectedInspection) return;
    if (!scheduleForm.inspectorName.trim() || !scheduleForm.inspectorLicense.trim() || !scheduleForm.inspectionDate) {
      showError('Validation Error', 'Inspector name, licence and inspection date are all required');
      return;
    }
    try {
      setScheduleSubmitting(true);
      const response = await apiFetch(`/inspection/${selectedInspection.inspectionId}/schedule`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          inspectorName: scheduleForm.inspectorName.trim(),
          inspectorLicense: scheduleForm.inspectorLicense.trim(),
          inspectionDate: scheduleForm.inspectionDate,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        showSuccess('Success', 'Inspection scheduled successfully');
        setSchedulingDialogOpen(false);
        setSelectedInspection(null);
        fetchInspections();
      } else {
        showError('Error', result.error?.message || result.error || 'Failed to schedule inspection');
      }
    } catch (error: any) {
      showError('Error', error?.message || 'Failed to schedule inspection');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Handle conduct inspection
  const handleConduct = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setConductForm({
      inspectedQuantity: inspection.quantity || 0,
      actualGrade: 'Grade 1',
      cuppingScore: '',
      defectsCount: 0,
      moistureContent: 11,
      beanSize: '',
      bagsInspected: 0,
      packagingCondition: 'GOOD',
      overallResult: '',
      inspectionNotes: '',
    });
    setConductDialogOpen(true);
  };

  // 0.8 — Conduct: POST /inspection/:id/results (pre-shipment entity).
  // Chaincode RecordInspectionResults has no from-state guard and can
  // re-open APPROVED/REJECTED inspections, so this button is only offered
  // on SCHEDULED rows (see the actions column) — never re-record results
  // on a decided inspection.
  const handleConductSubmit = async () => {
    if (!selectedInspection) return;
    const moisture = Number(conductForm.moistureContent);
    const cupping = Number(conductForm.cuppingScore);
    const defects = Number(conductForm.defectsCount);
    if (!(Number(conductForm.inspectedQuantity) > 0)) {
      showError('Validation Error', 'Inspected quantity must be greater than 0');
      return;
    }
    // Leg2 #19: one moisture rule everywhere — 8–12% for export.
    if (!(moisture >= 8 && moisture <= 12)) {
      showError('Validation Error', 'Moisture content must be between 8% and 12%');
      return;
    }
    // Leg2 #6: a cupping score must be entered — the form no longer
    // prefills 80, and a blank score must not record as 0 or pass.
    if (conductForm.cuppingScore === '' || conductForm.cuppingScore == null) {
      showError('Validation Error', 'Cupping score is required — enter the measured score (0–100)');
      return;
    }
    if (!(cupping >= 0 && cupping <= 100)) {
      showError('Validation Error', 'Cupping score must be between 0 and 100');
      return;
    }
    if (!(defects >= 0 && defects <= 100)) {
      showError('Validation Error', 'Defect count must be between 0 and 100');
      return;
    }
    if (!['PASS', 'CONDITIONAL_PASS', 'FAIL'].includes(conductForm.overallResult)) {
      showError('Validation Error', 'Overall result must be PASS, CONDITIONAL_PASS or FAIL');
      return;
    }
    try {
      setConductSubmitting(true);
      const response = await apiFetch(`/inspection/${selectedInspection.inspectionId}/results`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          inspectedQuantity: Number(conductForm.inspectedQuantity),
          actualGrade: conductForm.actualGrade,
          cuppingScore: cupping,
          defectsCount: defects,
          moistureContent: moisture,
          beanSize: conductForm.beanSize,
          bagsInspected: Number(conductForm.bagsInspected),
          packagingCondition: conductForm.packagingCondition,
          overallResult: conductForm.overallResult,
          inspectionNotes: conductForm.inspectionNotes,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        showSuccess('Success', `Inspection results recorded (${conductForm.overallResult})`);
        setConductDialogOpen(false);
        setSelectedInspection(null);
        fetchInspections();
      } else {
        showError('Error', result.error?.message || result.error || 'Failed to record inspection results');
      }
    } catch (error: any) {
      showError('Error', error?.message || 'Failed to record inspection results');
    } finally {
      setConductSubmitting(false);
    }
  };

  // 0.8 — COMPLETED → APPROVED / REJECTED (chaincode ApproveInspection /
  // RejectInspection, routes inspection.ts:432/469). Only offered on
  // COMPLETED rows; APPROVED/REJECTED are terminal for this UI.
  const handleApproveInspection = async (inspection: Inspection) => {
    try {
      setDecisionSubmitting(true);
      const response = await apiFetch(`/inspection/${inspection.inspectionId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ comments: '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        showSuccess('Success', 'Inspection approved');
        fetchInspections();
      } else {
        showError('Error', result.error?.message || result.error || 'Failed to approve inspection');
      }
    } catch (error: any) {
      showError('Error', error?.message || 'Failed to approve inspection');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleRejectInspection = async (inspection: Inspection) => {
    const rejectionReason = window.prompt('Enter rejection reason:');
    if (!rejectionReason?.trim()) return;
    try {
      setDecisionSubmitting(true);
      const response = await apiFetch(`/inspection/${inspection.inspectionId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.success) {
        showSuccess('Success', 'Inspection rejected');
        fetchInspections();
      } else {
        showError('Error', result.error?.message || result.error || 'Failed to reject inspection');
      }
    } catch (error: any) {
      showError('Error', error?.message || 'Failed to reject inspection');
    } finally {
      setDecisionSubmitting(false);
    }
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
      COMPLETED: { color: '#0097a7', label: 'Completed', icon: <CheckCircle /> },
      APPROVED: { color: ECTA_COLORS.success, label: 'Approved', icon: <CheckCircle /> },
      REJECTED: { color: ECTA_COLORS.error, label: 'Rejected', icon: <Cancel /> },
    };
    // Unknown/lowercase statuses (e.g. 'pending' from POST /inspection)
    // fall through to the REQUESTED chip.
    
    const config = statusConfig[status] || statusConfig.REQUESTED;
    
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.color,
          color: 'white',
          fontWeight: 600
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
          {params.row.txId && <BlockchainStatusIcon status="RECORDED" txId={params.row.txId} size="small" />}
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
          {params.value != null ? Number(params.value).toLocaleString() : '—'} kg
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
      width: 260,
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

          {params.row.status === 'COMPLETED' && (
            <>
              <Tooltip title="View Report">
                <IconButton
                  size="small"
                  onClick={() => handleViewReport(params.row)}
                  sx={{ color: ECTA_COLORS.green }}
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Approve Inspection">
                <IconButton
                  size="small"
                  disabled={decisionSubmitting}
                  onClick={() => handleApproveInspection(params.row)}
                  sx={{ color: ECTA_COLORS.success }}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Inspection">
                <IconButton
                  size="small"
                  disabled={decisionSubmitting}
                  onClick={() => handleRejectInspection(params.row)}
                  sx={{ color: ECTA_COLORS.error }}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
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
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
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
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: ECTA_COLORS.lightGreen,
              color: 'white',
              fontWeight: 600,
            },
          }}
        />
      </Paper>

      {/* Scheduling Dialog — POST /inspection/:id/schedule
          {inspectorName, inspectorLicense, inspectionDate} */}
      {selectedInspection && (
        <Dialog
          open={schedulingDialogOpen}
          onClose={() => { if (!scheduleSubmitting) { setSchedulingDialogOpen(false); setSelectedInspection(null); } }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Schedule Inspection — {selectedInspection.inspectionId}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField fullWidth required label="Inspector Name" value={scheduleForm.inspectorName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, inspectorName: e.target.value })}
                  placeholder="e.g. Alemayehu Bekele" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth required label="Inspector Licence" value={scheduleForm.inspectorLicense}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, inspectorLicense: e.target.value })}
                  placeholder="e.g. ECTA-INS-001" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth required type="date" label="Inspection Date" value={scheduleForm.inspectionDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, inspectionDate: e.target.value })}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Shipment {selectedInspection.shipmentId} • {selectedInspection.coffeeType} • {selectedInspection.quantity?.toLocaleString()} kg
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setSchedulingDialogOpen(false); setSelectedInspection(null); }} disabled={scheduleSubmitting}>Cancel</Button>
            <Button variant="contained" onClick={handleScheduleSubmit} disabled={scheduleSubmitting}
              sx={{ bgcolor: ECTA_COLORS.green }}>
              {scheduleSubmitting ? 'Scheduling…' : 'Schedule Inspection'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Conduct Inspection Dialog — POST /inspection/:id/results
          (pre-shipment entity, not /quality/inspections/:id/perform) */}
      {selectedInspection && (
        <Dialog
          open={conductDialogOpen}
          onClose={() => { if (!conductSubmitting) { setConductDialogOpen(false); setSelectedInspection(null); } }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Conduct Inspection — {selectedInspection.inspectionId}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="number" label="Inspected Quantity (kg)"
                  value={conductForm.inspectedQuantity}
                  onChange={(e) => setConductForm({ ...conductForm, inspectedQuantity: Number(e.target.value) })}
                  inputProps={{ min: 1 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select required label="Actual Grade" value={conductForm.actualGrade}
                  onChange={(e) => setConductForm({ ...conductForm, actualGrade: e.target.value })}>
                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'].map((g) => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="number" label="Cupping Score (0–100)"
                  value={conductForm.cuppingScore}
                  onChange={(e) => setConductForm({ ...conductForm, cuppingScore: e.target.value === '' ? '' : Number(e.target.value) })}
                  inputProps={{ min: 0, max: 100, step: 0.1 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="number" label="Defect Count (0–100)"
                  value={conductForm.defectsCount}
                  onChange={(e) => setConductForm({ ...conductForm, defectsCount: Number(e.target.value) })}
                  inputProps={{ min: 0, max: 100 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="number" label="Moisture Content % (8–12)"
                  value={conductForm.moistureContent}
                  onChange={(e) => setConductForm({ ...conductForm, moistureContent: Number(e.target.value) })}
                  inputProps={{ min: 8, max: 13, step: 0.1 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Bean Size" value={conductForm.beanSize}
                  onChange={(e) => setConductForm({ ...conductForm, beanSize: e.target.value })}
                  placeholder="e.g. 15+" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number" label="Bags Inspected"
                  value={conductForm.bagsInspected}
                  onChange={(e) => setConductForm({ ...conductForm, bagsInspected: Number(e.target.value) })}
                  inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Packaging Condition" value={conductForm.packagingCondition}
                  onChange={(e) => setConductForm({ ...conductForm, packagingCondition: e.target.value })}>
                  {['NEW', 'GOOD', 'ACCEPTABLE', 'POOR'].map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select required label="Overall Result" value={conductForm.overallResult}
                  onChange={(e) => setConductForm({ ...conductForm, overallResult: e.target.value as 'PASS' | 'CONDITIONAL_PASS' | 'FAIL' })}>
                  <MenuItem value="PASS">PASS</MenuItem>
                  <MenuItem value="CONDITIONAL_PASS">CONDITIONAL_PASS</MenuItem>
                  <MenuItem value="FAIL">FAIL</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Inspection Notes" value={conductForm.inspectionNotes}
                  onChange={(e) => setConductForm({ ...conductForm, inspectionNotes: e.target.value })}
                  placeholder="Record inspection findings..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConductDialogOpen(false); setSelectedInspection(null); }} disabled={conductSubmitting}>Cancel</Button>
            <Button variant="contained" onClick={handleConductSubmit} disabled={conductSubmitting}
              sx={{ bgcolor: ECTA_COLORS.green }}>
              {conductSubmitting ? 'Saving…' : 'Complete Inspection'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Report Dialog — pass/fail derives from the recorded overallResult
          (PASS / CONDITIONAL_PASS / FAIL), never from status: no
          PreShipmentInspection ever carries status PASSED/FAILED. There is
          no certificate-download endpoint, so no fake Download button. */}
      {selectedInspection && (() => {
        const result = getOverallResult(selectedInspection);
        const passed = result === 'PASS' || result === 'CONDITIONAL_PASS';
        const hasResult = ['PASS', 'FAIL', 'CONDITIONAL_PASS'].includes(result);
        return (
          <Dialog
            open={reportDialogOpen}
            onClose={() => { setReportDialogOpen(false); setSelectedInspection(null); }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Inspection Report — {selectedInspection.inspectionId}
              {selectedInspection.txId && (
                <Box sx={{ mt: 1 }}><BlockchainTxChip txId={selectedInspection.txId} /></Box>
              )}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ p: 2, bgcolor: hasResult ? (passed ? '#e8f5e9' : '#ffebee') : '#f5f5f5', borderRadius: 1, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {hasResult ? (passed
                    ? <CheckCircle sx={{ fontSize: 48, color: ECTA_COLORS.green }} />
                    : <Cancel sx={{ fontSize: 48, color: ECTA_COLORS.error }} />)
                    : <Assessment sx={{ fontSize: 48, color: '#757575' }} />}
                  <Box>
                    <Typography variant="h5" fontWeight={700}
                      color={hasResult ? (passed ? ECTA_COLORS.green : ECTA_COLORS.error) : 'text.secondary'}>
                      {hasResult ? (passed ? 'INSPECTION PASSED' : 'INSPECTION FAILED') : 'NO RESULT RECORDED'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {selectedInspection.status}
                      {hasResult ? ` • Overall result: ${result}` : ' • Results have not been recorded yet'}
                    </Typography>
                    {selectedInspection.certificateNumber && (
                      <Typography variant="body2">Certificate: {selectedInspection.certificateNumber}</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Quality Grade</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedInspection.qualityGrade || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Moisture Content</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedInspection.moistureContent != null ? `${selectedInspection.moistureContent}%` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Defect Percentage</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedInspection.defectPercentage != null ? `${selectedInspection.defectPercentage}%` : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Inspector</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedInspection.inspectorName || 'N/A'}</Typography>
                </Grid>
              </Grid>
              {selectedInspection.failureReason && (
                <Box sx={{ mt: 3, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="error">Failure Reason:</Typography>
                  <Typography variant="body2">{selectedInspection.failureReason}</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => window.print()}>Print Report</Button>
              <Button onClick={() => { setReportDialogOpen(false); setSelectedInspection(null); }}>Close</Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </Box>
  );
};

export default InspectionRequestsTab;
