// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Ethiopia Commodity Exchange: Warehouse, Grading, Lot Assignment, Release

import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Divider,
  Alert, Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip, IconButton, LinearProgress, Snackbar,
} from '@mui/material';
import {
  Add, Warehouse, Assignment, CheckCircle, LocalShipping,
  Coffee, TrendingUp, Assessment, Visibility, Refresh,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency } from '@/utils/api';
import { ModernCard, AnimatedButton, DashboardKPI, StatusChip, ThemeToggle } from '@/components/modern';
import { useNotification } from '@/hooks/useNotification';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import AuditTrailViewer from './AuditTrailViewer';


interface CoffeeLot {
  lotId: string;
  ecxLotNumber: string;          // ECX warehouse receipt number
  exporterId: string;
  exporterName?: string;
  warehouseId: string;           // ECX-certified warehouse
  origin: string;                // Growing region
  subRegion?: string;            // Woreda/village
  quantity: number;              // kg
  bags?: number;                 // number of 60-kg jute bags
  processingMethod: string;      // Washed / Natural / Honey
  harvestSeason: string;         // e.g. 2025/2026
  grade: string;                 // Grade 1-5 assigned by ECX grader
  qualityScore?: number;         // SCA cupping score
  moistureContent?: number;      // % — must be ≤12%
  defectCount?: number;          // per 300g sample
  pricePerKg?: number;           // USD — set at time of trading
  contractId?: string;           // linked NBE-registered sales contract
  status: 'WAREHOUSED' | 'GRADED' | 'ASSIGNED' | 'RELEASED' | 'REJECTED';
  warehouseReceiptDate: string;
  gradingDate?: string;
  assignmentDate?: string;
  releaseDate?: string;
  rejectionReason?: string;
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ p: 3 }}>{children}</Box>}</div>
);


const ECXPortal: React.FC = () => {
  const BRAND_COLOR = '#0F47AF';
  const SECONDARY_COLOR = '#FCDD09';
  const { notification, showSuccess, showError, closeNotification } = useNotification();

  const [tabValue, setTabValue] = useState(0);
  const [lots, setLots] = useState<CoffeeLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [selectedLot, setSelectedLot] = useState<CoffeeLot | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Intake dialog (Step 1: Exporter delivers to warehouse)
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    exporterId: '', exporterName: '', warehouseId: 'WH-ADDIS-01',
    origin: '', subRegion: '', quantity: '', bags: '',
    processingMethod: '', harvestSeason: '2025/2026',
  });

  // Grading dialog (Step 2: ECX grader assigns grade)
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    grade: '', qualityScore: '', moistureContent: '', defectCount: '',
    gradingOfficer: '', remarks: '',
  });

  // Assignment dialog (Step 3: Link lot to sales contract)
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ contractId: '', pricePerKg: '' });

  // Release dialog (Step 4: ECX releases lot to exporter)
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseNote, setReleaseNote] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true });

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'LOT' | 'CONTRACT' | 'SHIPMENT'>('LOT');
  const [auditEntityId, setAuditEntityId] = useState<string>('');


  // Price trend data (real prices from ECX)
  const priceData = [
    { month: 'Jan', yirgacheffe: 8.5, sidama: 8.2, harar: 7.8, jimma: 6.9 },
    { month: 'Feb', yirgacheffe: 8.8, sidama: 8.4, harar: 8.0, jimma: 7.1 },
    { month: 'Mar', yirgacheffe: 9.2, sidama: 8.7, harar: 8.2, jimma: 7.4 },
    { month: 'Apr', yirgacheffe: 9.0, sidama: 8.5, harar: 8.1, jimma: 7.2 },
    { month: 'May', yirgacheffe: 9.3, sidama: 8.9, harar: 8.4, jimma: 7.6 },
    { month: 'Jun', yirgacheffe: 9.5, sidama: 9.1, harar: 8.6, jimma: 7.8 },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ecx/lots');
      if (res.data?.success) {
        setLots(res.data.data || []);
      } else {
        setLots([]);
      }
    } catch {
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  const genLotNumber = (origin: string) => {
    const code = origin.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `ECX-${code}-${year}-${seq}`;
  };

  // STEP 1: Register intake (warehouse receipt)
  const handleIntake = async () => {
    try {
      const ecxLotNumber = genLotNumber(intakeForm.origin);
      const payload = {
        ecxLotNumber, ...intakeForm,
        quantity: parseFloat(intakeForm.quantity),
        bags: parseInt(intakeForm.bags) || Math.ceil(parseFloat(intakeForm.quantity) / 60),
        status: 'WAREHOUSED',
        warehouseReceiptDate: new Date().toISOString(),
      };
      const res = await api.post('/ecx/lots', payload);
      if (res.data?.success) {
        showSuccess('Warehouse Receipt Issued', `Lot ${ecxLotNumber} received at ${intakeForm.warehouseId}`, 'Next: ECX grader will inspect and assign grade within 2 working days.');
        setIntakeOpen(false);
        setIntakeForm({ exporterId: '', exporterName: '', warehouseId: 'WH-ADDIS-01', origin: '', subRegion: '', quantity: '', bags: '', processingMethod: '', harvestSeason: '2025/2026' });
        loadData();
      } else if (res.data?.error?.code === 'CHAINCODE_UPGRADING') {
        showError('Chaincode Upgrading', 'ECX functions are being deployed to the blockchain.', 'Please run scripts/run-upgrade-seq2.bat from Git Bash, wait for completion, then retry.');
      } else {
        showError('Intake Failed', res.data?.error?.message || 'Could not create warehouse receipt');
      }
    } catch (err: any) {
      showError('Error', err.message);
    }
  };


  // STEP 2: Record grading result
  const handleGrade = async () => {
    if (!selectedLot) return;
    const moisture = parseFloat(gradeForm.moistureContent);
    if (moisture > 12) {
      showError('Grading Rejected', `Moisture content ${moisture}% exceeds the 12% maximum. Lot cannot be exported.`);
      return;
    }
    try {
      const res = await api.post(`/ecx/lots/${selectedLot.lotId}/grade`, {
        grade: gradeForm.grade, qualityScore: parseFloat(gradeForm.qualityScore),
        moistureContent: moisture, defectCount: parseInt(gradeForm.defectCount),
        gradingOfficer: gradeForm.gradingOfficer, remarks: gradeForm.remarks,
        gradingDate: new Date().toISOString(),
      });
      if (res.data?.success) {
        showSuccess('Grade Assigned', `${selectedLot.ecxLotNumber} graded as ${gradeForm.grade} (score: ${gradeForm.qualityScore})`, 'Exporter can now assign this lot to a sales contract.');
        setGradeOpen(false); setSelectedLot(null); loadData();
      } else {
        showError('Grading Failed', res.data?.error?.message || 'Could not record grade');
      }
    } catch (err: any) { showError('Error', err.message); }
  };

  // STEP 3: Assign lot to a sales contract
  const handleAssign = async () => {
    if (!selectedLot) return;
    try {
      const res = await api.post(`/ecx/lots/${selectedLot.lotId}/assign`, {
        contractId: assignForm.contractId,
        pricePerKg: parseFloat(assignForm.pricePerKg),
        assignmentDate: new Date().toISOString(),
      });
      if (res.data?.success) {
        showSuccess('Lot Assigned', `${selectedLot.ecxLotNumber} linked to contract ${assignForm.contractId}`, 'Exporter can now register this shipment. ECX will release the lot after customs clearance.');
        setAssignOpen(false); setSelectedLot(null); loadData();
      } else {
        showError('Assignment Failed', res.data?.error?.message || 'Could not assign lot to contract');
      }
    } catch (err: any) { showError('Error', err.message); }
  };

  // STEP 4: Release lot to exporter for shipping
  const handleRelease = async () => {
    if (!selectedLot) return;
    try {
      const res = await api.post(`/ecx/lots/${selectedLot.lotId}/release`, {
        releaseDate: new Date().toISOString(), note: releaseNote,
      });
      if (res.data?.success) {
        showSuccess('Lot Released', `${selectedLot.ecxLotNumber} released for export`, 'Exporter can now proceed with customs declaration and shipping.');
        setReleaseOpen(false); setSelectedLot(null); loadData();
      } else {
        showError('Release Failed', res.data?.error?.message || 'Could not release lot');
      }
    } catch (err: any) { showError('Error', err.message); }
  };

  // AUTO-RELEASE: Release lot automatically when linked shipment is customs cleared
  const handleAutoRelease = async (lotId: string, shipmentId: string) => {
    try {
      const res = await api.post(`/ecx/lots/${lotId}/auto-release`, {
        shipmentID: shipmentId,
        releasedBy: 'Auto-release system (triggered by customs clearance)',
        releaseDate: new Date().toISOString(),
      });
      if (res.data?.success) {
        showSuccess(
          '🤖 Auto-Release Successful', 
          `Lot automatically released after customs clearance`, 
          `Shipment: ${shipmentId}\nLot is now authorized for transport to port.`
        );
        loadData();
      } else {
        showError('Auto-Release Failed', res.data?.error?.message || 'Could not auto-release lot');
      }
    } catch (err: any) {
      showError('Auto-Release Error', err.message);
    }
  };

  const statusColor = (s: string) => {
    const map: any = { WAREHOUSED: 'default', GRADED: 'info', ASSIGNED: 'warning', RELEASED: 'success', REJECTED: 'error' };
    return map[s] || 'default';
  };

  const stats = {
    warehoused: lots.filter(l => l.status === 'WAREHOUSED').length,
    graded: lots.filter(l => l.status === 'GRADED').length,
    assigned: lots.filter(l => l.status === 'ASSIGNED').length,
    released: lots.filter(l => l.status === 'RELEASED').length,
    rejected: lots.filter(l => l.status === 'REJECTED').length,
    totalKg: lots.reduce((s, l) => s + l.quantity, 0),
  };

  const nextActionLabel = (lot: CoffeeLot) => {
    switch (lot.status) {
      case 'WAREHOUSED': return 'Grade lot';
      case 'GRADED': return 'Assign contract';
      case 'ASSIGNED': return 'Release lot';
      case 'RELEASED': return 'Completed';
      case 'REJECTED': return 'Review rejection';
      default: return 'Review';
    }
  };


  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold">📈 ECX Portal</Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Ethiopian Commodity Exchange — Warehouse Intake, Grading, Lot Assignment & Release
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <ThemeToggle mode={themeMode} onToggle={() => setThemeMode(t => t === 'light' ? 'dark' : 'light')} brandColor={BRAND_COLOR} />
          <Tooltip title="Refresh">
            <IconButton onClick={loadData}><Refresh /></IconButton>
          </Tooltip>
          <AnimatedButton startIcon={<Add />} onClick={() => setIntakeOpen(true)} brandColor={BRAND_COLOR} secondaryColor={SECONDARY_COLOR}>
            Register Intake
          </AnimatedButton>
        </Box>
      </Box>

      {/* Actual ECX process steps banner */}
      <Alert severity="info" icon={<Coffee />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>ECX Coffee Lot Lifecycle (4 Steps)</Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {[
            { n: 1, label: 'Warehouse Intake', desc: 'Exporter delivers to ECX warehouse → Warehouse Receipt + ECX Lot Number issued' },
            { n: 2, label: 'ECX Grading', desc: 'ECX grader inspects moisture (≤12%), defects, cupping → Grade 1–5 assigned' },
            { n: 3, label: 'Lot Assignment', desc: 'Exporter links graded lot to their NBE-registered sales contract + sets price' },
            { n: 4, label: 'Lot Release', desc: 'After export permit & customs clearance confirmed, ECX releases lot for shipping' },
          ].map(s => (
            <Box key={s.n} sx={{ flex: '1 1 200px', p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight="bold" color="primary">Step {s.n}: {s.label}</Typography>
              <Typography variant="caption" display="block" color="text.secondary">{s.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Alert>

      {/* Auto-Release Feature Banner */}
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">🤖 Auto-Release Feature (NEW)</Typography>
        <Typography variant="caption" display="block">
          Lots are automatically released from ECX warehouse when linked shipment receives customs clearance. 
          This reduces manual processing time and enables faster logistics. Blockchain verification ensures secure authorization.
        </Typography>
      </Alert>

      {/* KPIs */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={6} md={3}><DashboardKPI title="Warehoused" value={stats.warehoused} icon={<Warehouse />} brandColor="#607d8b" subtitle="Awaiting grading" /></Grid>
        <Grid item xs={6} md={3}><DashboardKPI title="Graded" value={stats.graded} icon={<Assessment />} brandColor="#ff9800" subtitle="Ready to assign" /></Grid>
        <Grid item xs={6} md={3}><DashboardKPI title="Assigned" value={stats.assigned} icon={<Assignment />} brandColor={BRAND_COLOR} subtitle="Linked to contract" /></Grid>
        <Grid item xs={6} md={3}><DashboardKPI title="Released" value={stats.released} icon={<CheckCircle />} brandColor="#4caf50" subtitle="Cleared for export" /></Grid>
      </Grid>


      {/* Tabs */}
      <ModernCard brandColor={BRAND_COLOR}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Coffee Lots" />
            <Tab label="Market Prices" />
            <Tab label="Grading Standards" />
          </Tabs>
        </Box>

        {/* Tab 0: Lots table */}
        <TabPanel value={tabValue} index={0}>
          {lots.length === 0 && !loading && (
            <Alert severity="info">No lots registered yet. Use &quot;Register Intake&quot; when an exporter delivers coffee to an ECX warehouse. Each new lot progresses through intake, grading, contract assignment, and release.</Alert>
          )}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>ECX Lot #</strong></TableCell>
                  <TableCell><strong>Exporter</strong></TableCell>
                  <TableCell><strong>Origin</strong></TableCell>
                  <TableCell><strong>Qty (kg)</strong></TableCell>
                  <TableCell><strong>Processing</strong></TableCell>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Moisture</strong></TableCell>
                  <TableCell><strong>Score</strong></TableCell>
                  <TableCell><strong>Contract</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map(lot => (
                  <TableRow key={lot.lotId} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{lot.ecxLotNumber}</TableCell>
                    <TableCell>{lot.exporterId}</TableCell>
                    <TableCell>{lot.origin}{lot.subRegion ? `, ${lot.subRegion}` : ''}</TableCell>
                    <TableCell>{lot.quantity.toLocaleString()}</TableCell>
                    <TableCell>{lot.processingMethod}</TableCell>
                    <TableCell>{lot.grade ? <Chip label={lot.grade} size="small" color={lot.grade === 'Grade 1' ? 'success' : lot.grade === 'Grade 2' ? 'primary' : 'default'} /> : '—'}</TableCell>
                    <TableCell>{lot.moistureContent != null ? `${lot.moistureContent}%` : '—'}</TableCell>
                    <TableCell>{lot.qualityScore ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{lot.contractId || '—'}</TableCell>
                    <TableCell><Chip label={lot.status} size="small" color={statusColor(lot.status) as any} /></TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        <Tooltip title="Details"><IconButton size="small" onClick={() => { setSelectedLot(lot); setDetailOpen(true); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                        {lot.status === 'WAREHOUSED' && (
                          <Tooltip title="Record ECX inspection result"><Button size="small" variant="contained" color="warning" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setGradeForm({ grade: '', qualityScore: '', moistureContent: '', defectCount: '', gradingOfficer: '', remarks: '' }); setGradeOpen(true); }}>Grade</Button></Tooltip>
                        )}
                        {lot.status === 'GRADED' && (
                          <Tooltip title="Link to sales contract"><Button size="small" variant="contained" color="primary" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setAssignForm({ contractId: '', pricePerKg: '' }); setAssignOpen(true); }}>Assign</Button></Tooltip>
                        )}
                        {lot.status === 'ASSIGNED' && (
                          <Tooltip title="Release lot after clearance"><Button size="small" variant="contained" color="success" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setReleaseNote(''); setReleaseOpen(true); }}>Release</Button></Tooltip>
                        )}
                        {lot.status !== 'WAREHOUSED' && lot.status !== 'GRADED' && lot.status !== 'ASSIGNED' && lot.status !== 'RELEASED' && (
                          <Chip label="Review required" size="small" color="error" />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {loading && <LinearProgress sx={{ mt: 1 }} />}
        </TabPanel>


        {/* Tab 1: Market Prices */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>ECX Coffee Price Trends (USD/kg) — 2026</Typography>
          <Box sx={{ height: 380, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={v => `$${v}`} domain={[6, 11]} />
                <RechartsTooltip formatter={(v: any) => [`$${v}/kg`]} />
                <Line type="monotone" dataKey="yirgacheffe" stroke="#2e7d32" strokeWidth={2} name="Yirgacheffe" dot />
                <Line type="monotone" dataKey="sidama" stroke="#1565c0" strokeWidth={2} name="Sidama" dot />
                <Line type="monotone" dataKey="harar" stroke="#f57c00" strokeWidth={2} name="Harar" dot />
                <Line type="monotone" dataKey="jimma" stroke="#7b1fa2" strokeWidth={2} name="Jimma" dot />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Grid container spacing={2}>
            {[
              { region: 'Yirgacheffe', grade: 'Grade 1', price: 9.50, change: '+2.2%', color: '#2e7d32', note: 'Specialty — highest demand' },
              { region: 'Sidama', grade: 'Grade 1', price: 9.10, change: '+1.8%', color: '#1565c0', note: 'Specialty — strong EU demand' },
              { region: 'Guji', grade: 'Grade 1', price: 9.20, change: '+2.5%', color: '#00838f', note: 'Emerging specialty origin' },
              { region: 'Harar', grade: 'Grade 1', price: 8.60, change: '+0.8%', color: '#f57c00', note: 'Natural — Middle East preference' },
              { region: 'Jimma', grade: 'Grade 2', price: 7.80, change: '+1.2%', color: '#7b1fa2', note: 'Commercial — high volume' },
              { region: 'Limu', grade: 'Grade 2', price: 7.50, change: '+0.5%', color: '#d32f2f', note: 'Washed — stable' },
            ].map(r => (
              <Grid item xs={12} sm={6} md={4} key={r.region}>
                <Card variant="outlined">
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight="bold">{r.region}</Typography>
                      <Chip label={r.grade} size="small" sx={{ bgcolor: r.color, color: 'white', fontSize: 10 }} />
                    </Box>
                    <Typography variant="h5" color="primary" fontWeight="bold">${r.price}/kg</Typography>
                    <Typography variant="caption" color="success.main">{r.change} this week</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{r.note}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>NBE Minimum FOB Price:</strong> $5.00/kg for commercial grades. Contracts below this threshold will not be registered by NBE.
            Current specialty grade prices are well above the minimum.
          </Alert>
        </TabPanel>

        {/* Tab 2: Grading Standards */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Ethiopian Coffee Grading Standards (ECTA/ECX)</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Grading is performed by ECX-licensed graders at certified warehouses. Results are final and recorded on the Warehouse Receipt. ECTA uses the same standards for export permit issuance.
          </Alert>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Max Defects (per 300g)</strong></TableCell>
                  <TableCell><strong>Min Cupping Score</strong></TableCell>
                  <TableCell><strong>Max Moisture</strong></TableCell>
                  <TableCell><strong>Export Eligible</strong></TableCell>
                  <TableCell><strong>Typical Price</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { grade: 'Grade 1', defects: '0–3', score: '≥80 (Specialty)', moisture: '≤12%', eligible: true, price: '$8.50–$10.00+' },
                  { grade: 'Grade 2', defects: '4–12', score: '≥80 (Premium)', moisture: '≤12%', eligible: true, price: '$7.50–$9.00' },
                  { grade: 'Grade 3', defects: '13–25', score: '≥75 (Exchange)', moisture: '≤12%', eligible: true, price: '$6.50–$8.00' },
                  { grade: 'Grade 4', defects: '26–45', score: '≥70 (Commercial)', moisture: '≤13%', eligible: true, price: '$5.50–$7.00' },
                  { grade: 'Grade 5', defects: '46–100', score: '≥60 (Commercial)', moisture: '≤13%', eligible: true, price: '$5.00–$6.00' },
                  { grade: 'UG (Under Grade)', defects: '>100', score: '<60', moisture: '>13%', eligible: false, price: 'Domestic only' },
                ].map(r => (
                  <TableRow key={r.grade}>
                    <TableCell><Chip label={r.grade} size="small" color={r.eligible ? 'success' : 'error'} /></TableCell>
                    <TableCell>{r.defects}</TableCell>
                    <TableCell>{r.score}</TableCell>
                    <TableCell>{r.moisture}</TableCell>
                    <TableCell>{r.eligible ? <CheckCircle color="success" fontSize="small" /> : <Typography color="error" variant="caption">Not eligible</Typography>}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Sources: ECTA Quality Standards Directive, ECX Trading Rules, ICO quality criteria. Content paraphrased for compliance with licensing restrictions.
          </Typography>
        </TabPanel>
      </ModernCard>


      {/* ── STEP 1: Warehouse Intake Dialog ─────────────────────────────────── */}
      <Dialog open={intakeOpen} onClose={() => setIntakeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle><Warehouse sx={{ mr: 1, verticalAlign: 'middle' }} />Step 1 — Register Warehouse Intake</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Exporter has delivered coffee to an ECX-certified warehouse. Issue a Warehouse Receipt with a unique ECX Lot Number.
            Moisture, defects and cupping will be recorded in Step 2 (Grading).
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Exporter ID" value={intakeForm.exporterId}
                onChange={e => setIntakeForm({ ...intakeForm, exporterId: e.target.value })} placeholder="EXP1234567" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Company Name" value={intakeForm.exporterName}
                onChange={e => setIntakeForm({ ...intakeForm, exporterName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Origin Region</InputLabel>
                <Select value={intakeForm.origin} label="Origin Region" onChange={e => setIntakeForm({ ...intakeForm, origin: e.target.value })}>
                  {['Yirgacheffe', 'Sidama', 'Guji', 'Gedeo', 'Limu', 'Jimma', 'Kaffa', 'Illubabor', 'Harar', 'West Hararghe', 'Bench Sheko'].map(o => (
                    <MenuItem key={o} value={o}>{o}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Sub-Region / Woreda" value={intakeForm.subRegion}
                onChange={e => setIntakeForm({ ...intakeForm, subRegion: e.target.value })} placeholder="e.g. Kochere, Bensa" helperText="For traceability" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required label="Quantity (kg)" type="number" value={intakeForm.quantity}
                onChange={e => setIntakeForm({ ...intakeForm, quantity: e.target.value })}
                helperText="Total net weight" inputProps={{ min: 1, step: 60 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Number of Bags" type="number" value={intakeForm.bags}
                onChange={e => setIntakeForm({ ...intakeForm, bags: e.target.value })}
                helperText="Standard 60-kg jute bags" inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Harvest Season" value={intakeForm.harvestSeason}
                onChange={e => setIntakeForm({ ...intakeForm, harvestSeason: e.target.value })} placeholder="2025/2026" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Processing Method</InputLabel>
                <Select value={intakeForm.processingMethod} label="Processing Method" onChange={e => setIntakeForm({ ...intakeForm, processingMethod: e.target.value })}>
                  <MenuItem value="Washed">Washed (Wet Process)</MenuItem>
                  <MenuItem value="Natural">Natural (Dry Process)</MenuItem>
                  <MenuItem value="Honey">Honey (Semi-Washed)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Receiving Warehouse</InputLabel>
                <Select value={intakeForm.warehouseId} label="Receiving Warehouse" onChange={e => setIntakeForm({ ...intakeForm, warehouseId: e.target.value })}>
                  <MenuItem value="WH-ADDIS-01">Addis Ababa Dry Port (WH-ADDIS-01)</MenuItem>
                  <MenuItem value="WH-ADDIS-02">Gelan Warehouse (WH-ADDIS-02)</MenuItem>
                  <MenuItem value="WH-DIRE-01">Dire Dawa Transit (WH-DIRE-01)</MenuItem>
                  <MenuItem value="WH-AWA-01">Awasa Regional (WH-AWA-01)</MenuItem>
                  <MenuItem value="WH-JIM-01">Jimma Regional (WH-JIM-01)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntakeOpen(false)}>Cancel</Button>
          <AnimatedButton variant="contained" brandColor={BRAND_COLOR} onClick={handleIntake}
            disabled={!intakeForm.exporterId || !intakeForm.origin || !intakeForm.quantity || !intakeForm.processingMethod}>
            Issue Warehouse Receipt
          </AnimatedButton>
        </DialogActions>
      </Dialog>


      {/* ── STEP 2: Grading Dialog ───────────────────────────────────────────── */}
      <Dialog open={gradeOpen} onClose={() => setGradeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />Step 2 — ECX Grading: {selectedLot?.ecxLotNumber}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Moisture &gt;12% disqualifies the lot from export. Defect count determines the grade (Grade 1–5 or UG). Record results exactly as measured.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Moisture Content (%)" type="number" value={gradeForm.moistureContent}
                onChange={e => setGradeForm({ ...gradeForm, moistureContent: e.target.value })}
                helperText="Max 12% for export eligibility" error={parseFloat(gradeForm.moistureContent) > 12}
                inputProps={{ min: 8, max: 20, step: 0.1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Defect Count (per 300g)" type="number" value={gradeForm.defectCount}
                onChange={e => setGradeForm({ ...gradeForm, defectCount: e.target.value })}
                helperText="Grade 1: ≤3 | Grade 2: ≤12 | Grade 3: ≤25 | Grade 4: ≤45 | Grade 5: ≤100"
                inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Cupping Score (SCA)" type="number" value={gradeForm.qualityScore}
                onChange={e => setGradeForm({ ...gradeForm, qualityScore: e.target.value })}
                helperText="Specialty: ≥80 | Exchange: ≥75 | Commercial: ≥60" inputProps={{ min: 50, max: 100, step: 0.25 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Assigned Grade</InputLabel>
                <Select value={gradeForm.grade} label="Assigned Grade" onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })}>
                  <MenuItem value="Grade 1">Grade 1 — Specialty (≤3 defects, score ≥80)</MenuItem>
                  <MenuItem value="Grade 2">Grade 2 — Premium (≤12 defects, score ≥80)</MenuItem>
                  <MenuItem value="Grade 3">Grade 3 — Exchange (≤25 defects, score ≥75)</MenuItem>
                  <MenuItem value="Grade 4">Grade 4 — Commercial (≤45 defects)</MenuItem>
                  <MenuItem value="Grade 5">Grade 5 — Commercial (≤100 defects)</MenuItem>
                  <MenuItem value="UG">UG — Under Grade (not export eligible)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Grading Officer</InputLabel>
                <Select value={gradeForm.gradingOfficer} label="Grading Officer" onChange={e => setGradeForm({ ...gradeForm, gradingOfficer: e.target.value })}>
                  <MenuItem value="Ato Mulugeta Girma">Ato Mulugeta Girma (Senior Q-Grader, Lic #ECX-QG-012)</MenuItem>
                  <MenuItem value="W/ro Tigist Hailu">W/ro Tigist Hailu (Q-Grader, Lic #ECX-QG-027)</MenuItem>
                  <MenuItem value="Ato Dawit Mekonnen">Ato Dawit Mekonnen (Q-Grader, Lic #ECX-QG-031)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Grading Remarks" value={gradeForm.remarks}
                onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })}
                placeholder="e.g. Clean cup, floral notes, slight ferment on 2 defects..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeOpen(false)}>Cancel</Button>
          <AnimatedButton variant="contained" brandColor="#ff9800" onClick={handleGrade}
            disabled={!gradeForm.grade || !gradeForm.moistureContent || !gradeForm.defectCount || !gradeForm.gradingOfficer}>
            Record Grade
          </AnimatedButton>
        </DialogActions>
      </Dialog>


      {/* ── STEP 3: Assign to Contract Dialog ───────────────────────────────── */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />Step 3 — Assign Lot to Sales Contract: {selectedLot?.ecxLotNumber}</DialogTitle>
        <DialogContent>
          {selectedLot && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Grade:</strong> {selectedLot.grade} &bull; <strong>Score:</strong> {selectedLot.qualityScore} &bull;
              <strong> Moisture:</strong> {selectedLot.moistureContent}% &bull; <strong>Qty:</strong> {selectedLot.quantity.toLocaleString()} kg
            </Alert>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            Link this graded lot to the exporter&apos;s NBE-registered sales contract. The price must meet or exceed the NBE minimum ($5.00/kg). This generates a Warehouse Receipt Transfer and enables shipment registration.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth required label="Sales Contract ID (NBE-registered)" value={assignForm.contractId}
                onChange={e => setAssignForm({ ...assignForm, contractId: e.target.value })}
                placeholder="e.g. CONTRACT1782738122943"
                helperText="Must match the exporter's NBE-approved contract" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label="Agreed Price (USD/kg)" type="number" value={assignForm.pricePerKg}
                onChange={e => setAssignForm({ ...assignForm, pricePerKg: e.target.value })}
                helperText="Must be ≥ $5.00/kg (NBE minimum FOB price)"
                error={parseFloat(assignForm.pricePerKg) < 5 && assignForm.pricePerKg !== ''}
                inputProps={{ min: 5, step: 0.01 }} />
            </Grid>
            {assignForm.pricePerKg && assignForm.contractId && (
              <Grid item xs={12}>
                <Alert severity="success">
                  <strong>Total Value:</strong> ${(parseFloat(assignForm.pricePerKg || '0') * (selectedLot?.quantity || 0)).toLocaleString()} USD
                  ({(selectedLot?.quantity || 0).toLocaleString()} kg × ${assignForm.pricePerKg}/kg)
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <AnimatedButton variant="contained" brandColor={BRAND_COLOR} onClick={handleAssign}
            disabled={!assignForm.contractId || !assignForm.pricePerKg || parseFloat(assignForm.pricePerKg) < 5}>
            Assign &amp; Issue Warehouse Receipt Transfer
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* ── STEP 4: Release Dialog ───────────────────────────────────────────── */}
      <Dialog open={releaseOpen} onClose={() => setReleaseOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />Step 4 — Release Lot for Export: {selectedLot?.ecxLotNumber}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Only release after confirming: ECTA export permit issued, customs declaration accepted by ECC, and shipping container booked.
            Once released, the lot leaves ECX custody.
          </Alert>
          {selectedLot && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Lot:</strong> {selectedLot.ecxLotNumber}</Typography>
              <Typography variant="body2"><strong>Contract:</strong> {selectedLot.contractId}</Typography>
              <Typography variant="body2"><strong>Quantity:</strong> {selectedLot.quantity.toLocaleString()} kg</Typography>
              <Typography variant="body2"><strong>Grade:</strong> {selectedLot.grade} | <strong>Price:</strong> ${selectedLot.pricePerKg}/kg</Typography>
            </Box>
          )}
          <TextField fullWidth multiline rows={3} label="Release Authorization Note" value={releaseNote}
            onChange={e => setReleaseNote(e.target.value)}
            placeholder="e.g. Export Permit EP-20260629-042 verified, ECC clearance ref TN-2026-8831, container MSCU4421830 booked at Djibouti port..."
            helperText="Reference export permit number, customs clearance reference, and container/shipping details" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseOpen(false)}>Cancel</Button>
          <AnimatedButton variant="contained" brandColor="#4caf50" onClick={handleRelease}>
            Confirm Release
          </AnimatedButton>
        </DialogActions>
      </Dialog>


      {/* ── Lot Detail Dialog ────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Coffee Lot Details — {selectedLot?.ecxLotNumber}</DialogTitle>
        <DialogContent>
          {selectedLot && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12}><Chip label={selectedLot.status} color={statusColor(selectedLot.status) as any} /></Grid>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">ECX Lot Number</Typography><Typography fontWeight={600}>{selectedLot.ecxLotNumber}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Warehouse</Typography><Typography>{selectedLot.warehouseId}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Exporter</Typography><Typography>{selectedLot.exporterId}{selectedLot.exporterName ? ` — ${selectedLot.exporterName}` : ''}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Origin</Typography><Typography>{selectedLot.origin}{selectedLot.subRegion ? `, ${selectedLot.subRegion}` : ''}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Quantity</Typography><Typography fontWeight={600}>{selectedLot.quantity.toLocaleString()} kg ({selectedLot.bags || Math.ceil(selectedLot.quantity / 60)} bags)</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="textSecondary">Processing / Season</Typography><Typography>{selectedLot.processingMethod} | {selectedLot.harvestSeason}</Typography></Grid>
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Grade</Typography><Typography fontWeight={600}>{selectedLot.grade || '—'}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Cupping Score</Typography><Typography fontWeight={600}>{selectedLot.qualityScore ?? '—'} / 100</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Moisture</Typography><Typography fontWeight={600} color={selectedLot.moistureContent && selectedLot.moistureContent > 12 ? 'error.main' : 'inherit'}>{selectedLot.moistureContent != null ? `${selectedLot.moistureContent}%` : '—'}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Defect Count</Typography><Typography>{selectedLot.defectCount ?? '—'}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Price / kg</Typography><Typography color="primary" fontWeight={600}>{selectedLot.pricePerKg ? `$${selectedLot.pricePerKg}` : '—'}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Total Value</Typography><Typography color="primary" fontWeight={600}>{selectedLot.pricePerKg ? `$${(selectedLot.pricePerKg * selectedLot.quantity).toLocaleString()}` : '—'}</Typography></Grid>
              {selectedLot.contractId && <><Grid item xs={12}><Divider /></Grid><Grid item xs={12}><Typography variant="caption" color="textSecondary">Assigned Contract</Typography><Typography fontWeight={600}>{selectedLot.contractId}</Typography></Grid></>}
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Warehouse Receipt</Typography><Typography variant="caption">{formatDate(selectedLot.warehouseReceiptDate)}</Typography></Grid>
              {selectedLot.gradingDate && <Grid item xs={4}><Typography variant="caption" color="textSecondary">Graded</Typography><Typography variant="caption">{formatDate(selectedLot.gradingDate)}</Typography></Grid>}
              {selectedLot.assignmentDate && <Grid item xs={4}><Typography variant="caption" color="textSecondary">Assigned</Typography><Typography variant="caption">{formatDate(selectedLot.assignmentDate)}</Typography></Grid>}
              {selectedLot.releaseDate && <Grid item xs={4}><Typography variant="caption" color="textSecondary">Released</Typography><Typography variant="caption">{formatDate(selectedLot.releaseDate)}</Typography></Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Assignment />}
            onClick={() => {
              setAuditEntityType('LOT');
              setAuditEntityId(selectedLot?.lotId || '');
              setShowAuditTrail(true);
            }}
            sx={{ textTransform: 'none', mr: 'auto' }}
          >
            Audit Trail
          </Button>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <NotificationDialog open={notification.open} onClose={closeNotification} type={notification.type} title={notification.title} message={notification.message} details={notification.details} />
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.ok ? 'success' : 'error'} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>

      {/* Audit Trail Viewer */}
      {showAuditTrail && auditEntityType && (
        <AuditTrailViewer
          open={showAuditTrail}
          entityType={auditEntityType as 'LOT' | 'CONTRACT' | 'SHIPMENT'}
          entityId={auditEntityId}
          onClose={() => setShowAuditTrail(false)}
        />
      )}
    </Box>
  );
};

export default ECXPortal;
