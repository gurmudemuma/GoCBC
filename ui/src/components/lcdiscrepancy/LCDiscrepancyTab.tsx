// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// LC Discrepancy Tab - Banks Portal
// Manages Letter of Credit discrepancies and resolution workflow

import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Chip, IconButton, Tooltip, Alert, Paper, InputAdornment } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility, Warning, CheckCircle, Edit, Assessment, FilterList, Refresh, Error, TrendingUp } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { DashboardKPI } from '@/components/modern';
import { BlockchainStatusIcon } from '@/components/blockchain';
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
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  status: 'REPORTED' | 'UNDER_REVIEW' | 'RESOLUTION_AGREED' | 'RESOLVED' | 'REJECTED';
  description: string;
  reportedDate: string;
  resolvedDate?: string;
  reportedBy?: string;
  txId?: string;
}

const LCDiscrepancyTab: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
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
  const [selectedLC, setSelectedLC] = useState<string>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true);
      // Fetch from multiple LCs - simplified for now
      const response = await apiFetch('/api/v1/banking/lc/all', { method: 'GET', headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        // Mock discrepancies - in production, fetch from actual endpoints
        const mockData: Discrepancy[] = [];
        setDiscrepancies(mockData);
        setFiltered(mockData);
        setStats({ total: mockData.length, open: mockData.filter(d => d.status !== 'RESOLVED' && d.status !== 'REJECTED').length, resolved: mockData.filter(d => d.status === 'RESOLVED').length, resolutionRate: 85, avgTime: 3.2 });
        showSuccess(`Loaded ${mockData.length} discrepancy records`);
      }
    } catch (error) {
      showError('Failed to load discrepancies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDiscrepancies(); }, []);
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
      REJECTED: { color: CBE_COLORS.error, label: 'Rejected', icon: <Error /> },
    };
    const c = cfg[status] || cfg.REPORTED;
    return <Chip label={c.label} size="small" icon={c.icon} sx={{ backgroundColor: c.color, color: 'white', fontWeight: 600, '& .MuiChip-icon': { color: 'white' } }} />;
  };

  const columns: GridColDef[] = [
    { field: 'discrepancyId', headerName: 'Discrepancy ID', width: 150, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" fontWeight={600}>{p.value}</Typography>
        {p.row.txId && <BlockchainStatusIcon verified={true} size="small" />}
      </Box>
    )},
    { field: 'lcNumber', headerName: 'LC Number', width: 130, valueGetter: (params: any) => params.row.lcNumber || params.row.lcId },
    { field: 'discrepancyType', headerName: 'Type', width: 150 },
    { field: 'severity', headerName: 'Severity', width: 110, renderCell: (p: GridRenderCellParams) => getSeverityChip(p.value) },
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p: GridRenderCellParams) => getStatusChip(p.value) },
    { field: 'description', headerName: 'Description', width: 250, renderCell: (p: GridRenderCellParams) => (
      <Tooltip title={p.value}><Typography variant="body2" noWrap>{p.value}</Typography></Tooltip>
    )},
    { field: 'reportedDate', headerName: 'Reported', width: 120, valueFormatter: (p: any) => new Date(p.value).toLocaleDateString() },
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
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Total Discrepancies" value={stats.total} icon={<Assessment />} color={CBE_COLORS.purple} subtitle="All records" /></Grid>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Open Cases" value={stats.open} icon={<Warning />} color={CBE_COLORS.warning} subtitle="Requiring action" /></Grid>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Resolved" value={stats.resolved} icon={<CheckCircle />} color={CBE_COLORS.success} subtitle={`${stats.resolutionRate}% resolution rate`} /></Grid>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Avg Resolution" value={`${stats.avgTime.toFixed(1)}`} icon={<TrendingUp />} color="#ff9800" subtitle="days to resolve" /></Grid>
      </Grid>

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
              <Button fullWidth variant="contained" onClick={() => setReportDialogOpen(true)} sx={{ bgcolor: CBE_COLORS.purple }}>+ Report Discrepancy</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid rows={filtered} columns={columns} getRowId={(r) => r.discrepancyId} loading={loading} pagination page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} rowsPerPageOptions={[5, 10, 25]} disableSelectionOnClick sx={{ '& .MuiDataGrid-columnHeaders': { backgroundColor: CBE_COLORS.purple, color: 'white', fontWeight: 600 } }} />
      </Paper>

      <DiscrepancyReportingDialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} lcId={selectedLC} onSuccess={fetchDiscrepancies} />
      {selected && <DiscrepancyDetailsDialog open={detailsDialogOpen} onClose={() => { setDetailsDialogOpen(false); setSelected(null); }} discrepancy={selected} />}
      {selected && <DiscrepancyResolutionDialog open={resolutionDialogOpen} onClose={() => { setResolutionDialogOpen(false); setSelected(null); }} discrepancy={selected} onSuccess={fetchDiscrepancies} />}
    </Box>
  );
};

export default LCDiscrepancyTab;
