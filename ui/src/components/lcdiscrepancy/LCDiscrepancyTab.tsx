// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// LC Discrepancy Tab - Banks Portal
// Manages Letter of Credit discrepancies and resolution workflow

import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Chip, IconButton, Tooltip, Alert, Paper, InputAdornment } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility, Warning, CheckCircle, Assessment, FilterList, Refresh, Error as ErrorIcon } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';
import DiscrepancyReportingDialog from './DiscrepancyReportingDialog';
import DiscrepancyDetailsDialog from './DiscrepancyDetailsDialog';
import DiscrepancyResolutionDialog from './DiscrepancyResolutionDialog';

const CBE_COLORS = { purple: '#9b30b7', golden: '#FFD700', success: '#4caf50', warning: '#f57c00', error: '#d32f2f' };

interface Discrepancy {
  discrepancyId: string;
  lcId: string;
  lcNumber?: string;
  exporterId: string;
  discrepancyType: string;
  severity: string;
  status: string;
  description: string;
  reportedDate: string;
  resolvedDate?: string;
  reportedBy?: string;
  txId?: string;
}

interface LCDiscrepancyTabProps {
  onStatsUpdate?: (stats: { total: number; open: number; resolved: number; resolutionRate: number; avgTime: number }) => void;
}

const LCDiscrepancyTab: React.FC<LCDiscrepancyTabProps> = ({ onStatsUpdate }) => {
  const { showError } = useNotification();
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [lcOptions, setLcOptions] = useState<Array<{ lcId: string; status?: string; exporterId?: string }>>([]);
  const [filtered, setFiltered] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, resolutionRate: 0, avgTime: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Discrepancy | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/banking/lc', { method: 'GET', headers: getAuthHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error((result.error as any)?.message || result.error || 'Failed to load letters of credit');
      }
      const lcs = result.data.filter((lc: any) => typeof (lc.lcId || lc.LCID) === 'string');
      const examinableLCs = lcs.filter((lc: any) => ['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED', 'AMENDED'].includes(String(lc.status || lc.Status || '').toUpperCase()));
      setLcOptions(examinableLCs.map((lc: any) => ({
        lcId: lc.lcId || lc.LCID,
        status: lc.status || lc.Status,
        exporterId: lc.exporterId || lc.ExporterID,
      })));
      const rows: Discrepancy[] = lcs.flatMap((lc: any) => {
        const lcId = lc.lcId || lc.LCID;
        const discrepancies = Array.isArray(lc.discrepancies || lc.Discrepancies)
          ? (lc.discrepancies || lc.Discrepancies)
          : [];
        return discrepancies.map((item: any) => {
          const rawStatus = String(item.status || item.Status || 'OPEN').toUpperCase();
          const status = rawStatus === 'OPEN' ? 'REPORTED' : rawStatus === 'WAIVED' ? 'WAIVED' : rawStatus;
          return {
            discrepancyId: item.discrepancyId || item.DiscrepancyID,
            lcId,
            lcNumber: lc.lcNumber || lc.LCNumber || lcId,
            exporterId: lc.exporterId || lc.ExporterID || '',
            discrepancyType: item.discrepancyType || item.DiscrepancyType || item.document || item.Document || 'Document issue',
            severity: String(item.severity || item.Severity || 'MAJOR').toUpperCase(),
            status,
            description: item.issue || item.Issue || item.description || item.Description || '',
            reportedDate: item.reportedDate || item.ReportedDate || '',
            resolvedDate: item.resolvedDate || item.ResolvedDate || undefined,
            reportedBy: item.reportedBy || item.reportedByMsp || item.ReportedBy || undefined,
            affectedDocument: item.document || item.Document || '',
            affectedClauses: item.affectedClauses || item.AffectedClauses || '',
            recommendedAction: item.recommendedAction || item.RecommendedAction || '',
            resolution: item.resolution || item.Resolution || '',
          };
        }).filter((item: Discrepancy) => Boolean(item.discrepancyId));
      });
      setDiscrepancies(rows);
      const open = rows.filter((item) => item.status === 'REPORTED' || item.status === 'UNDER_REVIEW').length;
      const resolved = rows.filter((item) => item.status === 'RESOLVED' || item.status === 'WAIVED').length;
      const closed = rows.filter((item) => ['RESOLVED', 'WAIVED', 'REJECTED'].includes(item.status)).length;
      const durations = rows.filter((item) => item.resolvedDate && item.reportedDate).map((item) =>
        Math.max(0, (new Date(item.resolvedDate as string).getTime() - new Date(item.reportedDate).getTime()) / 86400000)
      );
      setStats({
        total: rows.length,
        open,
        resolved,
        resolutionRate: rows.length ? Math.round((closed / rows.length) * 100) : 0,
        avgTime: durations.length ? Number((durations.reduce((sum, days) => sum + days, 0) / durations.length).toFixed(1)) : 0,
      });
    } catch (error) {
      showError('Error', error instanceof Error ? error.message : 'Failed to load discrepancies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDiscrepancies(); }, []);
  
  // Pass stats to parent component for top-level KPIs
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats);
    }
  }, [stats, onStatsUpdate]);
  
  useEffect(() => {
    let f = [...discrepancies];
    if (statusFilter !== 'ALL') f = f.filter(d => d.status === statusFilter);
    if (severityFilter !== 'ALL') f = f.filter(d => d.severity === severityFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(d => d.discrepancyId.toLowerCase().includes(s) || d.lcId.toLowerCase().includes(s) || d.lcNumber?.toLowerCase().includes(s) || d.description.toLowerCase().includes(s));
    }
    setFiltered(f);
  }, [statusFilter, severityFilter, searchTerm, discrepancies]);

  const getSeverityChip = (severity: string) => {
    const cfg: Record<string, any> = {
      MINOR: { color: '#ff9800', label: 'Minor' },
      MAJOR: { color: CBE_COLORS.warning, label: 'Major' },
      CRITICAL: { color: CBE_COLORS.error, label: 'Critical' },
    };
    const c = cfg[severity] || cfg.MINOR;
    return <Chip label={c.label} size="small" sx={{ backgroundColor: c.color, color: 'white', fontWeight: 600 }} />;
  };

  const getStatusChip = (status: string) => {
    const cfg: Record<string, any> = {
      REPORTED: { color: '#1976d2', label: 'Reported', icon: <Warning /> },
      UNDER_REVIEW: { color: '#0288d1', label: 'Under Review', icon: <Assessment /> },
      RESOLUTION_AGREED: { color: '#0097a7', label: 'Resolution Agreed', icon: <CheckCircle /> },
      RESOLVED: { color: CBE_COLORS.success, label: 'Resolved', icon: <CheckCircle /> },
      WAIVED: { color: CBE_COLORS.success, label: 'Waived', icon: <CheckCircle /> },
      REJECTED: { color: CBE_COLORS.error, label: 'Rejected', icon: <ErrorIcon /> },
    };
    const c = cfg[status] || cfg.REPORTED;
    return <Chip label={c.label} size="small" icon={c.icon} sx={{ backgroundColor: c.color, color: 'white', fontWeight: 600, '& .MuiChip-icon': { color: 'white' } }} />;
  };

  const columns: GridColDef[] = [
    { field: 'discrepancyId', headerName: 'Discrepancy ID', width: 150, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" fontWeight={600}>{p.value}</Typography>
      </Box>
    )},
    { field: 'lcNumber', headerName: 'LC Number', width: 130, valueGetter: (params: any) => params.row.lcNumber || params.row.lcId },
    { field: 'discrepancyType', headerName: 'Type', width: 150 },
    { field: 'severity', headerName: 'Severity', width: 110, renderCell: (p: GridRenderCellParams) => getSeverityChip(p.value) },
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p: GridRenderCellParams) => getStatusChip(p.value) },
    { field: 'description', headerName: 'Description', width: 250, renderCell: (p: GridRenderCellParams) => (
      <Tooltip title={p.value}><Typography variant="body2" noWrap>{p.value}</Typography></Tooltip>
    )},
    { field: 'reportedDate', headerName: 'Reported', width: 120, valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : 'N/A' },
    { field: 'actions', headerName: 'Actions', width: 150, sortable: false, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="View Details"><IconButton size="small" onClick={() => { setSelected(p.row); setDetailsDialogOpen(true); }} sx={{ color: CBE_COLORS.purple }}><Visibility fontSize="small" /></IconButton></Tooltip>
        {(p.row.status === 'REPORTED' || p.row.status === 'UNDER_REVIEW') && (
          <Tooltip title="Resolve"><IconButton size="small" onClick={() => { setSelected(p.row); setResolutionDialogOpen(true); }} sx={{ color: CBE_COLORS.success }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
        )}
      </Box>
    )},
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* KPI cards removed - data now shown in top-level portal KPIs above tabs */}
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ID, LC, Description..." InputProps={{ startAdornment: <InputAdornment position="start"><FilterList /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="REPORTED">Reported</MenuItem>
                <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                <MenuItem value="RESOLUTION_AGREED">Resolution Agreed</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
                <MenuItem value="WAIVED">Waived</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth select size="small" label="Severity" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <MenuItem value="ALL">All Severities</MenuItem>
                <MenuItem value="MINOR">Minor</MenuItem>
                <MenuItem value="MAJOR">Major</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchDiscrepancies} sx={{ borderColor: CBE_COLORS.purple, color: CBE_COLORS.purple }}>Refresh</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button fullWidth variant="contained" disabled={lcOptions.length === 0} onClick={() => setReportDialogOpen(true)} sx={{ bgcolor: CBE_COLORS.purple }}>+ Report Discrepancy</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid 
          rows={filtered} 
          columns={columns} 
          getRowId={(r) => r.discrepancyId} 
          loading={loading} 
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[5, 10, 25]} 
          disableRowSelectionOnClick 
          sx={{ '& .MuiDataGrid-columnHeaders': { backgroundColor: CBE_COLORS.purple, color: 'white', fontWeight: 600 } }} 
        />
      </Paper>

      <DiscrepancyReportingDialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} lcId="" lcOptions={lcOptions} onSuccess={fetchDiscrepancies} />
      {selected && <DiscrepancyDetailsDialog open={detailsDialogOpen} onClose={() => { setDetailsDialogOpen(false); setSelected(null); }} discrepancy={selected} />}
      {selected && <DiscrepancyResolutionDialog open={resolutionDialogOpen} onClose={() => { setResolutionDialogOpen(false); setSelected(null); }} discrepancy={selected} onSuccess={fetchDiscrepancies} />}
    </Box>
  );
};

export default LCDiscrepancyTab;
