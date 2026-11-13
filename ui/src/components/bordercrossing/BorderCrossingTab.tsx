// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Border Crossing Tab - Customs Portal
// Manages border checkpoint verification and clearance

import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Chip, IconButton, Tooltip, Alert, Paper, InputAdornment } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PortalDataGrid, getPortalBrand } from '@/components/shared/portal';
import { Visibility, CheckCircle, Cancel, LocalShipping, Warning, Assessment, FilterList, Refresh, VerifiedUser, LocationOn } from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { DashboardKPI } from '@/components/modern';
import { BlockchainStatusIcon } from '@/components/blockchain';
import { useNotification } from '@/hooks/useNotification';
import BorderCrossingInitiationDialog from './BorderCrossingInitiationDialog';
import PhysicalInspectionDialog from './PhysicalInspectionDialog';
import ClearanceDecisionDialog from './ClearanceDecisionDialog';

const CUSTOMS_COLORS = { navy: getPortalBrand('CUSTOMS').primary, success: '#4caf50', warning: '#f57c00', error: '#d32f2f' };

interface BorderCrossing {
  // Chaincode field is `crossingId` (bordercrossing.go:18, json:"crossingId");
  // GET /bordercrossing returns raw chaincode rows, so there is no
  // `borderCrossingId` key. The old name made every row id `undefined`
  // and every write hit POST /bordercrossing/undefined/... .
  crossingId: string;
  shipmentId: string;
  exporterId: string;
  vehicleNumber: string;
  driverName: string;
  borderPost: string;
  status: 'PENDING' | 'INSPECTED' | 'INSPECTION_FAILED' | 'CLEARED' | 'DETAINED' | 'CLEARED_EXIT' | 'IN_TRANSIT' | 'CROSSED' | 'ARRIVED';
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
  // Leg2 #17: the shipment whose cleared declaration prefills the
  // initiation dialog (shipment / contract / exporter / declaration /
  // exit permit are loaded from it, not free-texted).
  const [prefillShipmentId, setPrefillShipmentId] = useState('');
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [clearanceDialogOpen, setClearanceDialogOpen] = useState(false);
  const [selected, setSelected] = useState<BorderCrossing | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const fetchCrossings = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/bordercrossing', { method: 'GET', headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        setCrossings(data);
        setFiltered(data);
        setStats({
          total: data.length,
          // "Active" = not yet terminal. CLEARED / CROSSED / ARRIVED are
          // terminal (no outgoing transition, rules §14); DETAINED has no exit.
          active: data.filter((c: BorderCrossing) => ['PENDING', 'INSPECTED', 'INSPECTION_FAILED', 'CLEARED_EXIT', 'IN_TRANSIT'].includes(c.status)).length,
          cleared: data.filter((c: BorderCrossing) => c.status === 'CLEARED' || c.status === 'CLEARED_EXIT').length,
          avgTime: 4.5
        });
        showSuccess('Success', `Loaded ${data.length} border crossing records`);
      }
    } catch (error) {
      showError('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Advance a crossing one step along the chaincode flow (matrix §14,
  // leg2 F6): initiate -> inspect -> clear -> departure -> crossing ->
  // arrival. Clear from INSPECTED lands CLEARED_EXIT (exit clearance),
  // which departs to IN_TRANSIT; IN_TRANSIT -> crossing (CROSSED),
  // CROSSED -> arrival (ARRIVED); clear from CROSSED / ARRIVED lands
  // terminal CLEARED (destination clearance). The API routes mirror
  // the chaincode guards, so a wrong-state call is rejected server-side.
  const handleAdvance = async (crossing: BorderCrossing, endpoint: string, body: Record<string, string>) => {
    try {
      const response = await apiFetch(`/bordercrossing/${crossing.crossingId}/${endpoint}`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
      const result = await response.json();
      if (result.success) {
        showSuccess('Success', result.message || 'Crossing updated');
        fetchCrossings();
      } else {
        showError('Error', result.error || 'Failed to update crossing');
      }
    } catch (error) {
      showError('Error', 'Failed to update crossing');
    }
  };

  useEffect(() => { fetchCrossings(); }, []);
  useEffect(() => {
    let f = [...crossings];
    if (statusFilter !== 'ALL') f = f.filter(c => c.status === statusFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      f = f.filter(c => (c.crossingId || '').toLowerCase().includes(s) || (c.vehicleNumber || '').toLowerCase().includes(s) || (c.shipmentId || '').toLowerCase().includes(s));
    }
    setFiltered(f);
  }, [statusFilter, searchTerm, crossings]);

  const getStatusChip = (status: string) => {
    const cfg: Record<string, any> = {
      PENDING: { color: '#1976d2', label: 'Pending', icon: <LocalShipping /> },
      INSPECTED: { color: '#0288d1', label: 'Inspected', icon: <VerifiedUser /> },
      INSPECTION_FAILED: { color: '#ff9800', label: 'Inspection Failed', icon: <Assessment /> },
      CLEARED: { color: CUSTOMS_COLORS.success, label: 'Cleared', icon: <CheckCircle /> },
      DETAINED: { color: CUSTOMS_COLORS.error, label: 'Detained', icon: <Cancel /> },
      CLEARED_EXIT: { color: '#2e7d32', label: 'Cleared for Exit', icon: <CheckCircle /> },
      IN_TRANSIT: { color: '#673ab7', label: 'In Transit', icon: <LocalShipping /> },
      CROSSED: { color: '#0288d1', label: 'Border Crossed', icon: <LocalShipping /> },
      ARRIVED: { color: CUSTOMS_COLORS.success, label: 'Arrived', icon: <LocationOn /> },
    };
    const c = cfg[status] || cfg.PENDING;
    return <Chip label={c.label} size="small" icon={c.icon} sx={{ backgroundColor: c.color, color: 'white', fontWeight: 600, '& .MuiChip-icon': { color: 'white' } }} />;
  };

  const columns: GridColDef[] = [
    { field: 'crossingId', headerName: 'Crossing ID', width: 150, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" fontWeight={600}>{p.value}</Typography>
        {p.row.txId && <BlockchainStatusIcon status="RECORDED" txId={p.row.txId} size="small" />}
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
    { field: 'arrivalTime', headerName: 'Arrival', width: 140, valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—') },
    { field: 'actions', headerName: 'Actions', width: 150, sortable: false, renderCell: (p: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {p.row.status === 'PENDING' && (
          <>
            <Tooltip title="Physical Inspection"><IconButton size="small" onClick={() => { setSelected(p.row); setInspectionDialogOpen(true); }} sx={{ color: CUSTOMS_COLORS.navy }}><Assessment fontSize="small" /></IconButton></Tooltip>
            {/* PENDING → CLEARED_EXIT (chaincode ClearForExit, CustomsMSP only).
                Previously unreachable: no UI ever called POST /bordercrossing/:id/clear-exit,
                so the tab's own CLEARED_EXIT → departure path could never start.
                The route takes customsOfficer/clearanceRef; the tab collects
                neither, so both are sent blank rather than invented. */}
            <Tooltip title="Clear for Exit"><IconButton size="small" onClick={() => handleAdvance(p.row, 'clear-exit', { customsOfficer: '', clearanceRef: '' })} sx={{ color: CUSTOMS_COLORS.success }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
          </>
        )}
        {(p.row.status === 'INSPECTED' || p.row.status === 'INSPECTION_FAILED') && (
          <Tooltip title="Clear/Detain"><IconButton size="small" onClick={() => { setSelected(p.row); setClearanceDialogOpen(true); }} sx={{ color: CUSTOMS_COLORS.success }}><CheckCircle fontSize="small" /></IconButton></Tooltip>
        )}
        {p.row.status === 'CLEARED_EXIT' && (
          <Tooltip title="Record Departure"><IconButton size="small" onClick={() => handleAdvance(p.row, 'departure', { departureDate: new Date().toISOString() })} sx={{ color: CUSTOMS_COLORS.navy }}><LocalShipping fontSize="small" /></IconButton></Tooltip>
        )}
        {p.row.status === 'IN_TRANSIT' && (
          <Tooltip title="Record Border Crossing"><IconButton size="small" onClick={() => handleAdvance(p.row, 'crossing', { crossingDate: new Date().toISOString() })} sx={{ color: CUSTOMS_COLORS.navy }}><LocalShipping fontSize="small" /></IconButton></Tooltip>
        )}
        {p.row.status === 'CROSSED' && (
          <Tooltip title="Record Arrival"><IconButton size="small" onClick={() => handleAdvance(p.row, 'arrival', { arrivalDate: new Date().toISOString(), arrivalLocation: p.row.borderPost })} sx={{ color: CUSTOMS_COLORS.success }}><LocationOn fontSize="small" /></IconButton></Tooltip>
        )}
        <Tooltip title="View Details"><IconButton size="small" onClick={() => setSelected(p.row)} sx={{ color: CUSTOMS_COLORS.navy }}><Visibility fontSize="small" /></IconButton></Tooltip>
      </Box>
    )},
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* KPIs now shown at portal level, not duplicated here */}
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth size="small" label="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ID, Vehicle, Shipment..." InputProps={{ startAdornment: <InputAdornment position="start"><FilterList /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="INSPECTED">Inspected</MenuItem>
                <MenuItem value="INSPECTION_FAILED">Inspection Failed</MenuItem>
                <MenuItem value="CLEARED">Cleared</MenuItem>
                <MenuItem value="DETAINED">Detained</MenuItem>
                <MenuItem value="CLEARED_EXIT">Cleared for Exit</MenuItem>
                <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
                <MenuItem value="CROSSED">Border Crossed</MenuItem>
                <MenuItem value="ARRIVED">Arrived</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchCrossings} sx={{ borderColor: CUSTOMS_COLORS.navy, color: CUSTOMS_COLORS.navy }}>Refresh</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="Shipment ID (prefills crossing)" value={prefillShipmentId} onChange={(e) => setPrefillShipmentId(e.target.value)} placeholder="SHIP-… — loads cleared declaration" />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button fullWidth variant="contained" onClick={() => setInitiateDialogOpen(true)} sx={{ bgcolor: CUSTOMS_COLORS.navy }}>+ New Crossing</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ height: 600, width: '100%' }}>
        <PortalDataGrid
          brand="CUSTOMS"
          rows={filtered}
          columns={columns}
          getRowId={(r) => r.crossingId}
          loading={loading}
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
        />
      </Paper>

      <BorderCrossingInitiationDialog open={initiateDialogOpen} onClose={() => setInitiateDialogOpen(false)} onSuccess={fetchCrossings} prefill={prefillShipmentId.trim() ? { shipmentId: prefillShipmentId.trim() } : undefined} />
      {selected && <PhysicalInspectionDialog open={inspectionDialogOpen} onClose={() => { setInspectionDialogOpen(false); setSelected(null); }} crossing={selected} onSuccess={fetchCrossings} />}
      {selected && <ClearanceDecisionDialog open={clearanceDialogOpen} onClose={() => { setClearanceDialogOpen(false); setSelected(null); }} crossing={selected} onSuccess={fetchCrossings} />}
    </Box>
  );
};

export default BorderCrossingTab;
