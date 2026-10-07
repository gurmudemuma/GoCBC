// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Border Crossing Tab - Customs Portal
// Manages border checkpoint verification and clearance

import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Chip, IconButton, Tooltip, Alert, Paper, InputAdornment } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility, CheckCircle, Cancel, LocalShipping, Warning, Assessment, FilterList, Refresh, VerifiedUser, LocationOn } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { DashboardKPI } from '@/components/modern';
import { BlockchainStatusIcon } from '@/components/blockchain';
import { useNotification } from '@/hooks/useNotification';
import BorderCrossingInitiationDialog from './BorderCrossingInitiationDialog';
import PhysicalInspectionDialog from './PhysicalInspectionDialog';
import ClearanceDecisionDialog from './ClearanceDecisionDialog';

const CUSTOMS_COLORS = { navy: '#1565c0', lightBlue: '#42a5f5', success: '#4caf50', warning: '#f57c00', error: '#d32f2f' };

interface BorderCrossing {
  borderCrossingId: string;
  shipmentId: string;
  exporterId: string;
  vehicleNumber: string;
  driverName: string;
  borderPost: string;
  status: 'INITIATED' | 'DOCUMENTS_VERIFIED' | 'PHYSICAL_INSPECTION' | 'CLEARED' | 'DETAINED';
  arrivalTime: string;
  clearanceTime?: string;
  customsOfficer?: string;
  txId?: string;
}

const BorderCrossingTab: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [crossings, setCrossings] = useState<BorderCrossing[]>([]);
  const [filtered, setFiltered] = useState<BorderCrossing[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, cleared: 0, avgTime: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [initiateDialogOpen, setInitiateDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [clearanceDialogOpen, setClearanceDialogOpen] = useState(false);
  const [selected, setSelected] = useState<BorderCrossing | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchCrossings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/v1/bordercrossing', { method: 'GET', headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        setCrossings(data);
        setFiltered(data);
        setStats({
          total: data.length,
          active: data.filter((c: BorderCrossing) => c.status !== 'CLEARED' && c.status !== 'DETAINED').length,
          cleared: data.filter((c: BorderCrossing) => c.status === 'CLEARED').length,
          avgTime: 4.5
        });
        showSuccess(`Loaded ${data.length} border crossing records`);
      }
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCrossings(); }, []);
  useEffect(() => {
    let f = [...crossings];
    if (statusFilter !== 'ALL') f = f.filter(c => c.status === statusFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(c => c.borderCrossingId.toLowerCase().includes(s) || c.vehicleNumber.toLowerCase().includes(s) || c.shipmentId.toLowerCase().includes(s));
    }
    setFiltered(f);
  }, [statusFilter, searchTerm, crossings]);

  const getStatusChip = (status: string) => {
    const cfg: Record<string, any> = {
      INITIATED: { color: '#1976d2', label: 'Initiated', icon: <LocalShipping /> },
      DOCUMENTS_VERIFIED: { color: '#0288d1', label: 'Docs Verified', icon: <VerifiedUser /> },
      PHYSICAL_INSPECTION: { color: '#ff9800', label: 'Inspecting', icon: <Assessment /> },
      CLEARED: { color: CUSTOMS_COLORS.success, label: 'Cleared', icon: <CheckCircle /> },
      DETAINED: { color: CUSTOMS_COLORS.error, label: 'Detained', icon: <Cancel /> },
    };
    const c = cfg[status] || cfg.INITIATED;
    return <Chip label={c.label} size="small" icon={c.icon} sx={{ backgroundColor: c.color, color: 'white', fontWeight: 600, '& .MuiChip-icon': { color: 'white' } }} />;
  };

  const columns: GridColDef[] = [
    { field: 'borderCrossingId', headerName: 'Crossing ID', width: 150, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" fontWeight={600}>{p.value}</Typography>
        {p.row.txId && <BlockchainStatusIcon verified={true} size="small" />}
      </Box>
    )},
    { field: 'shipmentId', headerName: 'Shipment', width: 130 },
    { field: 'vehicleNumber', headerName: 'Vehicle', width: 120 },
    { field: 'borderPost', headerName: 'Border Post', width: 150, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LocationOn sx={{ fontSize: 16 }} />
        <Typography variant="body2">{p.value}</Typography>
      </Box>
    )},
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p: GridRenderCellParams) => getStatusChip(p.value) },
    { field: 'arrivalTime', headerName: 'Arrival', width: 140, valueFormatter: (p: any) => new Date(p.value).toLocaleString() },
    { field: 'actions', headerName: 'Actions', width: 150, sortable: false, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {p.row.status === 'DOCUMENTS_VERIFIED' && (
          <Tooltip title="Physical Inspection"><IconButton size="small" onClick={() => { setSelected(p.row); setInspectionDialogOpen(true); }} sx={{ color: CUSTOMS_COLORS.navy }}><Assessment fontSize="small" /></IconButton></Tooltip>
        )}
        {p.row.status === 'PHYSICAL_INSPECTION' && (
          <Tooltip title="Clear/Detain"><IconButton size="small" onClick={() => { setSelected(p.row); setClearanceDialogOpen(true); }} sx={{ color: CUSTOMS_COLORS.success }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
        )}
        <Tooltip title="View Details"><IconButton size="small" onClick={() => setSelected(p.row)} sx={{ color: CUSTOMS_COLORS.navy }}><Visibility fontSize="small" /></IconButton></Tooltip>
      </Box>
    )},
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Total Crossings" value={stats.total} icon={<Assessment />} color={CUSTOMS_COLORS.navy} subtitle="All records" /></Grid>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Active Crossings" value={stats.active} icon={<LocalShipping />} color="#ff9800" subtitle="In progress" /></Grid>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Cleared Today" value={stats.cleared} icon={<CheckCircle />} color={CUSTOMS_COLORS.success} subtitle="Successful clearances" /></Grid>
        <Grid item xs={12} sm={6} md={3}><DashboardKPI title="Avg Processing" value={`${stats.avgTime.toFixed(1)}h`} icon={<Warning />} color="#f57c00" subtitle="hours per crossing" /></Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth size="small" label="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ID, Vehicle, Shipment..." InputProps={{ startAdornment: <InputAdornment position="start"><FilterList /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="INITIATED">Initiated</MenuItem>
                <MenuItem value="DOCUMENTS_VERIFIED">Docs Verified</MenuItem>
                <MenuItem value="PHYSICAL_INSPECTION">Inspecting</MenuItem>
                <MenuItem value="CLEARED">Cleared</MenuItem>
                <MenuItem value="DETAINED">Detained</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchCrossings} sx={{ borderColor: CUSTOMS_COLORS.navy, color: CUSTOMS_COLORS.navy }}>Refresh</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button fullWidth variant="contained" onClick={() => setInitiateDialogOpen(true)} sx={{ bgcolor: CUSTOMS_COLORS.navy }}>+ New Crossing</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid rows={filtered} columns={columns} getRowId={(r) => r.borderCrossingId} loading={loading} pagination page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} rowsPerPageOptions={[5, 10, 25]} disableSelectionOnClick sx={{ '& .MuiDataGrid-columnHeaders': { backgroundColor: CUSTOMS_COLORS.lightBlue, color: 'white', fontWeight: 600 } }} />
      </Paper>

      <BorderCrossingInitiationDialog open={initiateDialogOpen} onClose={() => setInitiateDialogOpen(false)} onSuccess={fetchCrossings} />
      {selected && <PhysicalInspectionDialog open={inspectionDialogOpen} onClose={() => { setInspectionDialogOpen(false); setSelected(null); }} crossing={selected} onSuccess={fetchCrossings} />}
      {selected && <ClearanceDecisionDialog open={clearanceDialogOpen} onClose={() => { setClearanceDialogOpen(false); setSelected(null); }} crossing={selected} onSuccess={fetchCrossings} />}
    </Box>
  );
};

export default BorderCrossingTab;
