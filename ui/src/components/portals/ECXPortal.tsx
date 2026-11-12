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
  AttachMoney, Warning, Science, Person, Cancel,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency } from '@/utils/api';
import { ModernCard, AnimatedButton, DashboardKPI, ThemeToggle } from '@/components/modern';
import {
  PortalShell, PortalTabBar, PortalTabPanel, PortalKpiCard, PortalCard,
  PrimaryButton, GhostButton, PortalDialog, PortalField, StatusChip, getPortalBrand,
} from '@/components/shared/portal';
import { useNotification } from '@/hooks/useNotification';
import { useTabFromQuery } from '@/hooks/useTabFromQuery';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import AuditTrailViewer from './AuditTrailViewer';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import { apiFetch } from '@/config/api.config';
import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { BlockchainBadge } from '@/components/blockchain';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';


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

const ECXPortal: React.FC = () => {
  const { user } = useAuth();
  const BRAND_COLOR = getPortalBrand('ECX').primary;
  const SECONDARY_COLOR = getPortalBrand('ECX').secondary;
  const { notification, showSuccess, showError, closeNotification } = useNotification();

  const [tabValue, setTabValue] = useState(0);
  
  // Sub-tab state for KPI filtering
  const [subTabValue, setSubTabValue] = useState(0);
  const [activeKPIFilter, setActiveKPIFilter] = useState<string | null>(null);
  
  const [lots, setLots] = useState<CoffeeLot[]>([]);
  const [allLots, setAllLots] = useState<CoffeeLot[]>([]);
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

  // Reject dialog — explicit rejection for a cause other than moisture
  // (defects/UG, contamination, failed cupping). Moisture rejections go
  // through the grading dialog: recording >12% now rejects the lot
  // on-chain instead of being blocked client-side and in the API.
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectForm, setRejectForm] = useState({ rejectionReason: '', rejectedBy: '' });

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


  interface MarketPrice { grade: string; pricePerKg: number; currency?: string; description?: string; }
  interface GradingStandard { grade: string; category?: string; defectCount: string; cupscore: string; moistureContent: string; description?: string; }
  interface ActiveContract { contractId: string; buyerName?: string; status?: string; totalValue?: number; pricePerKg?: number; }
  const contractIdOf = (c: any): string => String(c?.contractId || c?.ContractID || c?.contract_id || '');
  const contractLabelOf = (c: any): string => {
    const id = contractIdOf(c);
    const buyer = c?.buyerName || c?.BuyerName || c?.buyerId || c?.buyer_id || '';
    const status = c?.status || c?.ContractStatus || '';
    return buyer ? `${id} — ${buyer}${status ? ` (${status})` : ''}` : id;
  };

  // Market prices + grading standards — fetched from the API, never
  // hardcoded (0.11). GET /ecx/market returns grade prices +
  // marketStatus; GET /market/trends returns weekly contract-derived
  // trend points; GET /ecx/grading-standards returns the standards
  // table (Grade 1 cupping 85–100, moisture 10–12% for every grade).
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [marketStatus, setMarketStatus] = useState<string>('');
  const [marketUpdated, setMarketUpdated] = useState<string>('');
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketTrends, setMarketTrends] = useState<{ week: string; avgPrice: number }[]>([]);
  const [gradingStandards, setGradingStandards] = useState<GradingStandard[]>([]);
  const [gradingSampleSize, setGradingSampleSize] = useState<string>('');
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  const loadMarketData = async () => {
    setMarketLoading(true); setMarketError(null);
    try {
      const res = await api.get('/ecx/market');
      const data = res.data?.data;
      if (res.data?.success && data) {
        setMarketPrices(Array.isArray(data.prices) ? data.prices : []);
        setMarketStatus(data.marketStatus || '');
        setMarketUpdated(data.lastUpdated || '');
      } else { setMarketError('Market prices could not be loaded.'); }
    } catch (err: any) {
      setMarketError(err?.response?.data?.error?.message || err?.message || 'Market prices could not be loaded.');
    }
    try {
      const res = await api.get('/market/trends');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      // One point per week: mean avgPrice across coffee types that week.
      const byWeek = new Map<string, { sum: number; n: number }>();
      rows.forEach((r: any) => {
        const week = String(r.week || '').slice(0, 10);
        const price = Number(r.avgPrice);
        if (!week || !Number.isFinite(price) || price <= 0) return;
        const cur = byWeek.get(week) || { sum: 0, n: 0 };
        byWeek.set(week, { sum: cur.sum + price, n: cur.n + 1 });
      });
      setMarketTrends([...byWeek.entries()]
        .map(([week, v]) => ({ week, avgPrice: Math.round((v.sum / v.n) * 100) / 100 }))
        .sort((a, b) => a.week.localeCompare(b.week)));
    } catch { /* trends are supplementary; /ecx/market prices are the tab's source */ }
    setMarketLoading(false);
  };

  const loadGradingStandards = async () => {
    setGradingLoading(true); setGradingError(null);
    try {
      const res = await api.get('/ecx/grading-standards');
      const data = res.data?.data;
      if (res.data?.success && data) {
        setGradingStandards(Array.isArray(data.standards) ? data.standards : []);
        setGradingSampleSize(data.sampleSize || '');
      } else { setGradingError('Grading standards could not be loaded.'); }
    } catch (err: any) {
      setGradingError(err?.response?.data?.error?.message || err?.message || 'Grading standards could not be loaded.');
    } finally { setGradingLoading(false); }
  };

  // Active contracts for the Assign dialog (Tier 1): GET
  // /portals/ecx/active-contracts is the plan's source. NOTE: that route
  // filters PG contracts by status IN ('ACTIVE','SIGNED'), which no
  // contract ever carries (chaincode/PG statuses are REGISTERED /
  // APPROVED / REJECTED / CANCELLED / COMPLETED), so it normally returns
  // []. When it does, fall back to GET /contracts filtered to APPROVED —
  // the only status AssignECXLot can use (contract must exist on-chain).
  const [activeContracts, setActiveContracts] = useState<ActiveContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsSource, setContractsSource] = useState<string>('');
  const loadActiveContracts = async () => {
    setContractsLoading(true);
    try {
      const res = await api.get('/portals/ecx/active-contracts');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped = rows.map((c: any) => ({ contractId: contractIdOf(c), buyerName: c?.buyerName || c?.BuyerName || c?.buyerId || c?.buyer_id || '', status: c?.status || c?.ContractStatus || '', totalValue: Number(c?.total_value ?? c?.totalValue) || undefined, pricePerKg: Number(c?.price_per_kg ?? c?.pricePerKg) || undefined })).filter((c: ActiveContract) => c.contractId);
      if (mapped.length > 0) { setActiveContracts(mapped); setContractsSource('active-contracts'); return; }
    } catch { /* fall through to the APPROVED-contracts fallback below */ }
    try {
      const res = await api.get('/contracts');
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setActiveContracts(rows.filter((c: any) => String(c?.status || c?.ContractStatus || '').toUpperCase() === 'APPROVED').map((c: any) => ({ contractId: contractIdOf(c), buyerName: c?.buyerName || c?.BuyerName || c?.buyerId || c?.buyer_id || '', status: c?.status || c?.ContractStatus || '', totalValue: Number(c?.totalValue) || undefined, pricePerKg: Number(c?.pricePerKg) || undefined })).filter((c: ActiveContract) => c.contractId));
      setContractsSource('approved-contracts');
    } catch { setActiveContracts([]); setContractsSource(''); }
    finally { setContractsLoading(false); }
  };

  // Auto-release dialog (Tier 1): POST /ecx/lots/:lotId/auto-release
  // requires a shipmentID in the body and the chaincode releases only
  // when that shipment is CUSTOMS_CLEARED, so the officer must name it.
  const [autoReleaseOpen, setAutoReleaseOpen] = useState(false);
  const [autoReleaseShipmentId, setAutoReleaseShipmentId] = useState('');

  // Surface the server's error body: axios rejects on non-2xx, so the
  // old `res.data?.error` branches were unreachable and users only saw
  // "Request failed with status code 503". Every mutating handler's
  // catch now goes through this.
  const getApiErrorMessage = (err: any): string =>
    err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Request failed';
  const getApiErrorCode = (err: any): string | undefined => err?.response?.data?.error?.code;

  useEffect(() => { if (tabValue === 1) loadMarketData(); if (tabValue === 2) loadGradingStandards(); }, [tabValue]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ecx/lots');
      if (res.data?.success) {
        setLots(res.data.data || []);
        setAllLots(res.data.data || []);
      } else {
        setLots([]);
        setAllLots([]);
      }
    } catch {
      setLots([]);
      setAllLots([]);
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

  // Handle KPI filter for sub-tabs
  const handleKPIFilter = (filterKey: string, kpiTitle: string) => {
    setActiveKPIFilter(filterKey);
    
    // Apply filter based on filter key
    if (filterKey === 'ALL_LOTS') setLots(allLots);
    else if (filterKey === 'WAREHOUSED') setLots(allLots.filter(l => l.status === 'WAREHOUSED'));
    else if (filterKey === 'GRADED') setLots(allLots.filter(l => l.status === 'GRADED'));
    else if (filterKey === 'ASSIGNED') setLots(allLots.filter(l => l.status === 'ASSIGNED'));
    else if (filterKey === 'RELEASED') setLots(allLots.filter(l => l.status === 'RELEASED'));
    else if (filterKey === 'REJECTED') setLots(allLots.filter(l => l.status === 'REJECTED'));
    else setLots(allLots);
  };

  // STEP 1: Register intake (warehouse receipt)
  const handleIntake = async () => {
    try {
      const ecxLotNumber = genLotNumber(intakeForm.origin);
      const payload = {
        ecxLotNumber, ...intakeForm,
        quantity: parseFloat(intakeForm.quantity),
        bags: parseInt(intakeForm.bags) || Math.ceil(parseFloat(intakeForm.quantity) / 60),
        // Leg2 #13: the old payload also sent status + warehouseReceiptDate,
        // which POST /ecx/lots never reads — dropped instead of silently
        // discarded. Status is set server-side (WAREHOUSED) and the
        // receipt date is NOW().
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
      if (getApiErrorCode(err) === 'CHAINCODE_UPGRADING') {
        showError('Chaincode Upgrading', 'ECX functions are being deployed to the blockchain.', 'Please run scripts/run-upgrade-seq2.bat from Git Bash, wait for completion, then retry.');
      } else {
        showError('Intake Failed', getApiErrorMessage(err));
      }
    }
  };


  // STEP 2: Record grading result
  const handleGrade = async () => {
    if (!selectedLot) return;
    // Cupping score is required: an empty score parsed to NaN and the
    // route coerced it to 0, so a 0-score lot was GRADED and assignable.
    const score = parseFloat(gradeForm.qualityScore);
    if (gradeForm.qualityScore === '' || !Number.isFinite(score)) {
      showError('Cupping Score Required', 'Enter the SCA cupping score (0–100) before recording the grade.');
      return;
    }
    const moisture = parseFloat(gradeForm.moistureContent);
    // Leg2 #13: defectCount needs the same client-side guard as
    // qualityScore — parseInt('') is NaN, which JSON turns into null
    // and the API 400s. Require a value instead of sending null.
    const defects = parseInt(gradeForm.defectCount);
    if (gradeForm.defectCount === '' || !Number.isFinite(defects)) {
      showError('Defect Count Required', 'Enter the defect count (0–100) before recording the grade.');
      return;
    }
    // No client-side moisture block: recording >12% is a rejection, not
    // an input error — the API lets GradeECXLot set REJECTED and the
    // response carries status REJECTED with the reason.
    try {
      const res = await api.post(`/ecx/lots/${selectedLot.lotId}/grade`, {
        grade: gradeForm.grade, qualityScore: score,
        moistureContent: moisture, defectCount: defects,
        gradingOfficer: gradeForm.gradingOfficer, remarks: gradeForm.remarks,
        gradingDate: new Date().toISOString(),
      });
      if (res.data?.success) {
        if (res.data?.data?.status === 'REJECTED') {
          showSuccess('Lot Rejected', `${selectedLot.ecxLotNumber} rejected — ${res.data.data.rejectionReason}`, 'The lot is recorded as REJECTED and shows under the Rejected filter. It cannot be graded again.');
        } else {
          showSuccess('Grade Assigned', `${selectedLot.ecxLotNumber} graded as ${gradeForm.grade} (score: ${gradeForm.qualityScore})`, 'Exporter can now assign this lot to a sales contract.');
        }
        setGradeOpen(false); setSelectedLot(null); loadData();
      } else {
        showError('Grading Failed', res.data?.error?.message || 'Could not record grade');
      }
    } catch (err: any) { showError('Grading Failed', getApiErrorMessage(err)); }
  };

  // Reject a warehoused lot for a non-moisture cause (defects/UG,
  // contamination, failed cupping). Calls POST /ecx/lots/:lotId/reject,
  // which invokes the RejectECXLot chaincode function (v2.3 — until the
  // redeploy on the Fabric host this reports the chaincode as upgrading).
  const handleReject = async () => {
    if (!selectedLot) return;
    try {
      const res = await api.post(`/ecx/lots/${selectedLot.lotId}/reject`, {
        rejectionReason: rejectForm.rejectionReason,
        rejectedBy: rejectForm.rejectedBy || undefined,
        rejectionDate: new Date().toISOString(),
      });
      if (res.data?.success) {
        showSuccess('Lot Rejected', `${selectedLot.ecxLotNumber} rejected — ${rejectForm.rejectionReason}`, 'The lot is recorded as REJECTED and shows under the Rejected filter. It cannot be graded again.');
        setRejectOpen(false); setSelectedLot(null); loadData();
      } else {
        showError('Rejection Failed', res.data?.error?.message || 'Could not reject lot');
      }
    } catch (err: any) { showError('Rejection Failed', getApiErrorMessage(err)); }
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
    } catch (err: any) { showError('Assignment Failed', getApiErrorMessage(err)); }
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
    } catch (err: any) { showError('Release Failed', getApiErrorMessage(err)); }
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
        setAutoReleaseOpen(false); setAutoReleaseShipmentId(''); setSelectedLot(null);
        loadData();
      } else {
        showError('Auto-Release Failed', res.data?.error?.message || 'Could not auto-release lot');
      }
    } catch (err: any) {
      showError('Auto-Release Failed', getApiErrorMessage(err));
    }
  };

  const statusColor = (s: string) => {
    const map: any = { WAREHOUSED: 'default', GRADED: 'info', ASSIGNED: 'warning', RELEASED: 'success', REJECTED: 'error' };
    return map[s] || 'default';
  };

  // Define role-based tab access for ECX
  const getRoleBasedTabs = () => {
    const userRole = user?.role || '';
    const isSuperAdmin = userRole === 'ADMIN';
    
    const allTabs = [
      { index: 0, label: `Coffee Lots`, icon: <Coffee sx={{ fontSize: 20 }} />, roles: ['ECX', 'ADMIN', 'ECX Officer', 'Grading Officer', 'Warehouse Officer', 'Registration Officer', 'Release Officer'] },
      { index: 1, label: 'Market Prices', icon: <TrendingUp sx={{ fontSize: 20 }} />, roles: ['ECX', 'ADMIN', 'ECX Officer'] },
      { index: 2, label: 'Grading Standards', icon: <Science sx={{ fontSize: 20 }} />, roles: ['ECX', 'ADMIN', 'ECX Officer', 'Grading Officer'] },
      { index: 3, label: 'User Management', icon: <Person sx={{ fontSize: 20 }} />, roles: ['ADMIN', 'ECX', 'ECX Portal Administrator'] },
    ];
    
    if (isSuperAdmin) return allTabs;
    return allTabs.filter(tab => tab.roles.includes(userRole));
  };
  
  const visibleTabs = getRoleBasedTabs();

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.index === tabValue)) {
      setTabValue(visibleTabs[0].index);
    }
  }, [tabValue, visibleTabs]);

  // ?tab=<index> deep-link from global search results.
  useTabFromQuery(setTabValue, visibleTabs.map((tab) => tab.index));

  const stats = {
    warehoused: lots.filter(l => l.status === 'WAREHOUSED').length,
    graded: lots.filter(l => l.status === 'GRADED').length,
    assigned: lots.filter(l => l.status === 'ASSIGNED').length,
    released: lots.filter(l => l.status === 'RELEASED').length,
    rejected: lots.filter(l => l.status === 'REJECTED').length,
    totalKg: lots.reduce((s, l) => s + l.quantity, 0),
  };

  // NOTE: lot actions are status-gated in the table below (Grade and
  // Reject only on WAREHOUSED, Assign only on GRADED, Release only on
  // ASSIGNED), so a REJECTED lot is terminal in the UI with no re-entry
  // action — the "Review required" chip is display-only. Rejection
  // reaches REJECTED two ways: grading with moisture > 12% (the API lets
  // GradeECXLot set it), or the Reject button (RejectECXLot, v2.3).


  return (
    <PortalShell brand="ECX" title="ECX Portal" subtitle="Ethiopian Commodity Exchange">
      {/* Dynamic KPI Cards - Compact design like Shipping Portal */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(() => {
          const kpis: { icon: React.ReactElement; label: string; value: string | number; color: string; filterKey?: string }[] = tabValue === 0 ? [
            // Tab 0: Lot Management - Show lot status breakdown
            { icon: <Coffee />, label: 'Total Lots', value: allLots.length, color: BRAND_COLOR, filterKey: 'ALL_LOTS' },
            { icon: <Warehouse />, label: 'Warehoused', value: allLots.filter(l => l.status === 'WAREHOUSED').length, color: '#ff9800', filterKey: 'WAREHOUSED' },
            { icon: <CheckCircle />, label: 'Graded', value: allLots.filter(l => l.status === 'GRADED').length, color: '#4caf50', filterKey: 'GRADED' },
            { icon: <Assignment />, label: 'Assigned', value: allLots.filter(l => l.status === 'ASSIGNED').length, color: '#7b1fa2', filterKey: 'ASSIGNED' },
            { icon: <LocalShipping />, label: 'Released', value: allLots.filter(l => l.status === 'RELEASED').length, color: '#2196f3', filterKey: 'RELEASED' },
            { icon: <Cancel />, label: 'Rejected', value: allLots.filter(l => l.status === 'REJECTED').length, color: '#f44336', filterKey: 'REJECTED' },
          ] : tabValue === 1 ? [
            // Tab 1: Market Prices — derived from GET /ecx/market, never
            // hardcoded. No endpoint supplies traded-today volume, so
            // those fictitious KPIs are replaced by real derived values.
            { icon: <TrendingUp />, label: 'Market Status', value: marketStatus || '—', color: '#4caf50' },
            { icon: <AttachMoney />, label: 'Avg Price (USD/kg)', value: marketPrices.length ? `$${(marketPrices.reduce((s, p) => s + (Number(p.pricePerKg) || 0), 0) / marketPrices.length).toFixed(2)}` : '—', color: BRAND_COLOR },
            { icon: <Coffee />, label: 'Grades Priced', value: marketPrices.length || '—', color: '#2196f3' },
            { icon: <Assessment />, label: 'Price Range (USD/kg)', value: marketPrices.length ? `$${Math.min(...marketPrices.map(p => Number(p.pricePerKg) || 0)).toFixed(2)} – $${Math.max(...marketPrices.map(p => Number(p.pricePerKg) || 0)).toFixed(2)}` : '—', color: SECONDARY_COLOR },
          ] : tabValue === 2 ? [
            // Tab 2: Grading Standards - Show quality metrics
            { icon: <Science />, label: 'Grade 1 (Premium)', value: allLots.filter(l => l.grade === 'Grade 1').length, color: '#4caf50' },
            { icon: <Coffee />, label: 'Grade 2 (High)', value: allLots.filter(l => l.grade === 'Grade 2').length, color: BRAND_COLOR },
            { icon: <Assignment />, label: 'Grade 3-4 (Good)', value: allLots.filter(l => ['Grade 3', 'Grade 4'].includes(l.grade || '')).length, color: '#ff9800' },
            { icon: <Warning />, label: 'Grade 5 (Fair)', value: allLots.filter(l => l.grade === 'Grade 5').length, color: '#f44336' },
          ] : [
            // Tab 3: User Management - Show user stats
            { icon: <Person />, label: 'Total Users', value: '0', color: BRAND_COLOR },
            { icon: <CheckCircle />, label: 'Active Users', value: '0', color: '#4caf50' },
            { icon: <Assessment />, label: 'Admins', value: '0', color: '#ff9800' },
            { icon: <Person />, label: 'Inactive', value: '0', color: '#9e9e9e' },
          ];

          return kpis.map((kpi, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <PortalKpiCard
                brand="ECX"
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                color={kpi.color}
                onClick={kpi.filterKey ? () => handleKPIFilter(kpi.filterKey as string, kpi.label) : undefined}
                selected={kpi.filterKey ? activeKPIFilter === kpi.filterKey : false}
              />
            </Grid>
          ));
        })()}
      </Grid>

      {/* Tabs */}
      <PortalCard brand="ECX" noPadding>
        <PortalTabBar
          brand="ECX"
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          tabs={visibleTabs.map((tab) => ({
            value: tab.index,
            label: tab.index === 0 ? `${tab.label} (${allLots.length})` : tab.label,
            icon: tab.icon,
          }))}
        />

        {/* Tab 0: Lots table */}
        <PortalTabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="flex-end" gap={1} sx={{ mb: 2 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadData}>Refresh</Button>
            <PrimaryButton brand="ECX" startIcon={<Add />} onClick={() => setIntakeOpen(true)}>Register Intake</PrimaryButton>
          </Box>
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
                    <TableCell><StatusChip status={lot.status} size="small" /></TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        <Tooltip title="Details"><IconButton size="small" onClick={() => { setSelectedLot(lot); setDetailOpen(true); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                        {lot.status === 'WAREHOUSED' && (
                          <Tooltip title="Record ECX inspection result"><Button size="small" variant="contained" color="warning" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setGradeForm({ grade: '', qualityScore: '', moistureContent: '', defectCount: '', gradingOfficer: '', remarks: '' }); setGradeOpen(true); }}>Grade</Button></Tooltip>
                        )}
                        {lot.status === 'WAREHOUSED' && (
                          <Tooltip title="Reject lot (defects, contamination, failed cupping)"><Button size="small" variant="outlined" color="error" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setRejectForm({ rejectionReason: '', rejectedBy: '' }); setRejectOpen(true); }}>Reject</Button></Tooltip>
                        )}
                        {lot.status === 'GRADED' && (
                          <Tooltip title="Link to sales contract"><Button size="small" variant="contained" color="primary" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setAssignForm({ contractId: '', pricePerKg: '' }); loadActiveContracts(); setAssignOpen(true); }}>Assign</Button></Tooltip>
                        )}
                        {lot.status === 'ASSIGNED' && (
                          <Tooltip title="Release lot after clearance"><Button size="small" variant="contained" color="success" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setReleaseNote(''); setReleaseOpen(true); }}>Release</Button></Tooltip>
                        )}
                        {lot.status === 'ASSIGNED' && (
                          <Tooltip title="Auto-release once the linked shipment is CUSTOMS_CLEARED (asks for the shipment ID)"><Button size="small" variant="outlined" color="success" sx={{ fontSize: 10, px: 1 }} onClick={() => { setSelectedLot(lot); setAutoReleaseShipmentId(''); setAutoReleaseOpen(true); }}>Auto-Release</Button></Tooltip>
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
        </PortalTabPanel>


        {/* Tab 1: Market Prices — live from GET /ecx/market (+ trends) */}
        <PortalTabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>ECX Coffee Prices (USD/kg){marketStatus ? ` — Market ${marketStatus}` : ''}</Typography>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadMarketData}>Refresh</Button>
          </Box>
          {marketUpdated && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>Source: GET /ecx/market · Last updated {formatDate(marketUpdated)}</Typography>}
          {marketLoading && <LinearProgress sx={{ mb: 2 }} />}
          {marketError && <Alert severity="error" sx={{ mb: 2 }}>{marketError}</Alert>}
          {!marketLoading && !marketError && marketPrices.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>No market prices returned by the API.</Alert>
          )}
          {marketTrends.length > 0 && (
            <Box sx={{ height: 300, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Average contract price by week — GET /market/trends</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis tickFormatter={v => `$${v}`} />
                  <RechartsTooltip formatter={(v: any) => [`$${v}/kg`, 'Avg price']} />
                  <Line type="monotone" dataKey="avgPrice" stroke="#2e7d32" strokeWidth={2} name="Avg price" dot />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
          <Grid container spacing={2}>
            {marketPrices.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.grade}>
                <Card variant="outlined">
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight="bold">{p.grade}</Typography>
                      <Chip label={p.currency || 'USD'} size="small" sx={{ bgcolor: '#1565c0', color: 'white', fontSize: 10 }} />
                    </Box>
                    <Typography variant="h5" color="primary" fontWeight="bold">${Number(p.pricePerKg).toFixed(2)}/kg</Typography>
                    {p.description && <Typography variant="caption" display="block" color="text.secondary">{p.description}</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>NBE Minimum FOB Price:</strong> $5.00/kg for commercial grades. Contracts below this threshold will not be registered by NBE.
            The grade prices above are the ECX market prices returned by the API, not a fixed schedule.
          </Alert>
        </PortalTabPanel>

        {/* Tab 2: Grading Standards — live from GET /ecx/grading-standards.
            Chaincode rule (UI-CHAINCODE-RULES §6/§8): moisture > 12% rejects
            the lot for EVERY grade, so no grade may show a ≤13% limit. */}
        <PortalTabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Ethiopian Coffee Grading Standards (ECTA/ECX)</Typography>
            <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadGradingStandards}>Refresh</Button>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Grading is performed by ECX-licensed graders at certified warehouses. Results are final and recorded on the Warehouse Receipt. ECTA uses the same standards for export permit issuance.
            {gradingSampleSize ? ` Sample size: ${gradingSampleSize}.` : ''}
          </Alert>
          {gradingLoading && <LinearProgress sx={{ mb: 2 }} />}
          {gradingError && <Alert severity="error" sx={{ mb: 2 }}>{gradingError}</Alert>}
          {!gradingLoading && !gradingError && gradingStandards.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>No grading standards returned by the API.</Alert>
          )}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>Grade</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Max Defects (per 300g)</strong></TableCell>
                  <TableCell><strong>Cupping Score</strong></TableCell>
                  <TableCell><strong>Moisture</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gradingStandards.map(r => (
                  <TableRow key={r.grade}>
                    <TableCell><Chip label={r.grade} size="small" color="success" /></TableCell>
                    <TableCell>{r.category || '—'}</TableCell>
                    <TableCell>{r.defectCount}</TableCell>
                    <TableCell>{r.cupscore}</TableCell>
                    <TableCell>{r.moistureContent}</TableCell>
                    <TableCell>{r.description || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Source: GET /ecx/grading-standards (ECX Grading Manual 2024). Chaincode: moisture above 12% rejects the lot for every grade — there is no grade with a 13% limit.
          </Typography>
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={3}>
          {/* User Management Tab */}
          <UserManagement />
        </PortalTabPanel>
      </PortalCard>


      {/* ── STEP 1: Warehouse Intake Dialog ─────────────────────────────────── */}
      <PortalDialog
        brand="ECX"
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        maxWidth="md"
        title="Step 1 — Register Warehouse Intake"
        icon={<Warehouse />}
        actions={
          <>
            <GhostButton brand="ECX" onClick={() => setIntakeOpen(false)}>Cancel</GhostButton>
            <AnimatedButton variant="contained" brandColor={BRAND_COLOR} onClick={handleIntake}
              disabled={!intakeForm.exporterId || !intakeForm.origin || !intakeForm.quantity || !intakeForm.processingMethod}>
              Issue Warehouse Receipt
            </AnimatedButton>
          </>
        }
      >
          <Alert severity="info" sx={{ mb: 2 }}>
            Exporter has delivered coffee to an ECX-certified warehouse. Issue a Warehouse Receipt with a unique ECX Lot Number.
            Moisture, defects and cupping will be recorded in Step 2 (Grading).
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <PortalField required label="Exporter ID" value={intakeForm.exporterId}
                onChange={e => setIntakeForm({ ...intakeForm, exporterId: e.target.value })} placeholder="EXP1234567" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PortalField label="Company Name" value={intakeForm.exporterName}
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
              <PortalField label="Sub-Region / Woreda" value={intakeForm.subRegion}
                onChange={e => setIntakeForm({ ...intakeForm, subRegion: e.target.value })} placeholder="e.g. Kochere, Bensa" helperText="For traceability" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <PortalField required label="Quantity (kg)" type="number" value={intakeForm.quantity}
                onChange={e => setIntakeForm({ ...intakeForm, quantity: e.target.value })}
                helperText="Total net weight" inputProps={{ min: 1, step: 60 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <PortalField label="Number of Bags" type="number" value={intakeForm.bags}
                onChange={e => setIntakeForm({ ...intakeForm, bags: e.target.value })}
                helperText="Standard 60-kg jute bags" inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <PortalField label="Harvest Season" value={intakeForm.harvestSeason}
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
      </PortalDialog>


      {/* ── STEP 2: Grading Dialog ───────────────────────────────────────────── */}
      <PortalDialog
        brand="ECX"
        open={gradeOpen}
        onClose={() => setGradeOpen(false)}
        maxWidth="sm"
        title={`Step 2 — ECX Grading: ${selectedLot?.ecxLotNumber}`}
        icon={<Assessment />}
        actions={
          <>
            <GhostButton brand="ECX" onClick={() => setGradeOpen(false)}>Cancel</GhostButton>
            <AnimatedButton variant="contained" brandColor="#ff9800" onClick={handleGrade}
              disabled={!gradeForm.grade || !gradeForm.qualityScore || !gradeForm.moistureContent || !gradeForm.defectCount || !gradeForm.gradingOfficer}>
              Record Grade
            </AnimatedButton>
          </>
        }
      >
          <Alert severity="warning" sx={{ mb: 2 }}>
            Moisture &gt;12% disqualifies the lot from export. Defect count determines the grade (Grade 1–5 or UG). Record results exactly as measured — recording moisture above 12% rejects the lot and records it as REJECTED.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <PortalField required label="Moisture Content (%)" type="number" value={gradeForm.moistureContent}
                onChange={e => setGradeForm({ ...gradeForm, moistureContent: e.target.value })}
                helperText="Max 12% for export eligibility" error={parseFloat(gradeForm.moistureContent) > 12}
                inputProps={{ min: 8, max: 20, step: 0.1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PortalField required label="Defect Count (per 300g)" type="number" value={gradeForm.defectCount}
                onChange={e => setGradeForm({ ...gradeForm, defectCount: e.target.value })}
                helperText="Grade 1: ≤3 | Grade 2: ≤12 | Grade 3: ≤25 | Grade 4: ≤45 | Grade 5: ≤100"
                inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PortalField required label="Cupping Score (SCA)" type="number" value={gradeForm.qualityScore}
                onChange={e => setGradeForm({ ...gradeForm, qualityScore: e.target.value })}
                helperText="Required — Specialty 85–100 (Grade 1) · Premium 80–84.9 (Grade 2) · Exchange 75–79.9 (Grade 3) · Standard 70–74.9 (Grade 4) · Below 70 (Grade 5)" inputProps={{ min: 0, max: 100, step: 0.25 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Assigned Grade</InputLabel>
                <Select value={gradeForm.grade} label="Assigned Grade" onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })}>
                  <MenuItem value="Grade 1">Grade 1 — Specialty (0–3 defects, score 85–100)</MenuItem>
                  <MenuItem value="Grade 2">Grade 2 — Premium (4–12 defects, score 80–84.9)</MenuItem>
                  <MenuItem value="Grade 3">Grade 3 — Exchange (13–25 defects, score 75–79.9)</MenuItem>
                  <MenuItem value="Grade 4">Grade 4 — Standard (26–45 defects, score 70–74.9)</MenuItem>
                  <MenuItem value="Grade 5">Grade 5 — Off-Grade (46+ defects, score Below 70)</MenuItem>
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
              <PortalField multiline rows={2} label="Grading Remarks" value={gradeForm.remarks}
                onChange={e => setGradeForm({ ...gradeForm, remarks: e.target.value })}
                placeholder="e.g. Clean cup, floral notes, slight ferment on 2 defects..." />
            </Grid>
          </Grid>
      </PortalDialog>

      {/* ── Reject Lot Dialog (non-moisture cause) ─────────────────────────── */}
      <PortalDialog
        brand="ECX"
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        maxWidth="sm"
        title={`Reject Lot: ${selectedLot?.ecxLotNumber}`}
        icon={<Cancel />}
        actions={
          <>
            <GhostButton brand="ECX" onClick={() => setRejectOpen(false)}>Cancel</GhostButton>
            <AnimatedButton variant="contained" brandColor="#f44336" onClick={handleReject}
              disabled={!rejectForm.rejectionReason.trim()}>
              Reject Lot
            </AnimatedButton>
          </>
        }
      >
          <Alert severity="error" sx={{ mb: 2 }}>
            Rejection is final — a REJECTED lot cannot be graded, assigned or released. Use this for defects, contamination or a failed cupping. For moisture above 12%, record the grading result instead; it rejects the lot automatically.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <PortalField required multiline rows={2} label="Rejection Reason" value={rejectForm.rejectionReason}
                onChange={e => setRejectForm({ ...rejectForm, rejectionReason: e.target.value })}
                placeholder="e.g. Defect count 120 per 300g — Under Grade, not export eligible" />
            </Grid>
            <Grid item xs={12}>
              <PortalField label="Rejected By" value={rejectForm.rejectedBy}
                onChange={e => setRejectForm({ ...rejectForm, rejectedBy: e.target.value })}
                placeholder="Grading officer name" />
            </Grid>
          </Grid>
      </PortalDialog>


      {/* ── STEP 3: Assign to Contract Dialog ───────────────────────────────── */}
      <PortalDialog
        brand="ECX"
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        maxWidth="sm"
        title={`Step 3 — Assign Lot to Sales Contract: ${selectedLot?.ecxLotNumber}`}
        icon={<Assignment />}
        actions={
          <>
            <GhostButton brand="ECX" onClick={() => setAssignOpen(false)}>Cancel</GhostButton>
            <AnimatedButton variant="contained" brandColor={BRAND_COLOR} onClick={handleAssign}
              disabled={!assignForm.contractId || !assignForm.pricePerKg || parseFloat(assignForm.pricePerKg) < 5}>
              Assign &amp; Issue Warehouse Receipt Transfer
            </AnimatedButton>
          </>
        }
      >
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
              <FormControl fullWidth required>
                <InputLabel>Sales Contract (NBE-registered)</InputLabel>
                <Select value={assignForm.contractId} label="Sales Contract (NBE-registered)"
                  onChange={e => setAssignForm({ ...assignForm, contractId: e.target.value })}>
                  {contractsLoading && <MenuItem value="" disabled>Loading contracts…</MenuItem>}
                  {!contractsLoading && activeContracts.length === 0 && <MenuItem value="" disabled>No assignable contracts found</MenuItem>}
                  {activeContracts.map(c => (
                    <MenuItem key={c.contractId} value={c.contractId}>{contractLabelOf(c)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                {contractsSource === 'active-contracts'
                  ? 'Contracts from GET /portals/ecx/active-contracts.'
                  : contractsSource === 'approved-contracts'
                    ? 'No contracts from GET /portals/ecx/active-contracts — showing APPROVED contracts from GET /contracts instead (that endpoint filters on ACTIVE/SIGNED, a status no contract ever carries).'
                    : 'Pick the exporter\u2019s NBE-approved contract — a typo fails only inside the chaincode.'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <PortalField required label="Agreed Price (USD/kg)" type="number" value={assignForm.pricePerKg}
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
      </PortalDialog>

      {/* ── STEP 4: Release Dialog ───────────────────────────────────────────── */}
      <PortalDialog
        brand="ECX"
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        maxWidth="sm"
        title={`Step 4 — Release Lot for Export: ${selectedLot?.ecxLotNumber}`}
        icon={<LocalShipping />}
        actions={
          <>
            <GhostButton brand="ECX" onClick={() => setReleaseOpen(false)}>Cancel</GhostButton>
            <AnimatedButton variant="contained" brandColor="#4caf50" onClick={handleRelease}>
              Confirm Release
            </AnimatedButton>
          </>
        }
      >
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
          <PortalField multiline rows={3} label="Release Authorization Note" value={releaseNote}
            onChange={e => setReleaseNote(e.target.value)}
            placeholder="e.g. Export Permit EP-20260629-042 verified, ECC clearance ref TN-2026-8831, container MSCU4421830 booked at Djibouti port..."
            helperText="Reference export permit number, customs clearance reference, and container/shipping details" />
      </PortalDialog>


      {/* ── Auto-Release Dialog (ASSIGNED lots, shipment CUSTOMS_CLEARED) ── */}
      <PortalDialog
        brand="ECX"
        open={autoReleaseOpen}
        onClose={() => setAutoReleaseOpen(false)}
        maxWidth="sm"
        title={`Auto-Release Lot: ${selectedLot?.ecxLotNumber}`}
        icon={<LocalShipping />}
        actions={
          <>
            <GhostButton brand="ECX" onClick={() => setAutoReleaseOpen(false)}>Cancel</GhostButton>
            <AnimatedButton variant="contained" brandColor="#4caf50"
              onClick={() => { if (selectedLot) void handleAutoRelease(selectedLot.lotId, autoReleaseShipmentId.trim()); }}
              disabled={!autoReleaseShipmentId.trim()}>
              Auto-Release
            </AnimatedButton>
          </>
        }
      >
          <Alert severity="info" sx={{ mb: 2 }}>
            Auto-release calls POST /ecx/lots/:lotId/auto-release, which invokes ReleaseECXLotForShipment — it succeeds only when the linked shipment is CUSTOMS_CLEARED. Enter that shipment&apos;s ID.
          </Alert>
          <PortalField required label="Shipment ID (CUSTOMS_CLEARED)" value={autoReleaseShipmentId}
            onChange={e => setAutoReleaseShipmentId(e.target.value)}
            placeholder="e.g. SHIP-…" helperText="The shipment the lot is travelling on, after customs clearance" />
      </PortalDialog>


      {/* ── Lot Detail Dialog ────────────────────────────────────────────────── */}
      <PortalDialog
        brand="ECX"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        title={`Coffee Lot Details — ${selectedLot?.ecxLotNumber}`}
        actions={
          <>
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
            <GhostButton brand="ECX" onClick={() => setDetailOpen(false)}>Close</GhostButton>
          </>
        }
      >
          {selectedLot && (
            <>
              {/* BLOCKCHAIN PROOF BADGE */}
              {/* NOTE: entity type must be ECXLOT, the entity type the
                  chaincode writes in its audit logs (ecx.go
                  CreateAuditLog(..., "ECXLOT", lotID, ...)) and the state
                  key prefix (ECXLOT_<lotId>). "COFFEE_LOT" matches nothing
                  on-chain, so the signature lookup below returned zero
                  transactions and showed "No Blockchain Signatures Found"
                  even for lots whose grade/reject tx is committed. */}
              <BlockchainBadge
                entityId={selectedLot.lotId || selectedLot.ecxLotNumber}
                entityType="ECXLOT"
                chaincode="coffee"
                channel="coffeechannel"
                compact
              />

              {/* Blockchain Verification - Component handles all messaging */}
              <Box sx={{ mt: 3 }}>
                <BlockchainSignatureVerification
                  entityType="ECXLOT"
                  entityId={selectedLot.lotId || selectedLot.ecxLotNumber}
                />
              </Box>

            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12}><StatusChip status={selectedLot.status} /></Grid>
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
              {selectedLot.status === 'REJECTED' && selectedLot.rejectionReason && <><Grid item xs={12}><Divider /></Grid><Grid item xs={12}><Typography variant="caption" color="textSecondary">Rejection Reason</Typography><Typography fontWeight={600} color="error.main">{selectedLot.rejectionReason}</Typography></Grid></>}
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={4}><Typography variant="caption" color="textSecondary">Warehouse Receipt</Typography><Typography variant="caption">{formatDate(selectedLot.warehouseReceiptDate)}</Typography></Grid>
              {selectedLot.gradingDate && <Grid item xs={4}><Typography variant="caption" color="textSecondary">Graded</Typography><Typography variant="caption">{formatDate(selectedLot.gradingDate)}</Typography></Grid>}
              {selectedLot.assignmentDate && <Grid item xs={4}><Typography variant="caption" color="textSecondary">Assigned</Typography><Typography variant="caption">{formatDate(selectedLot.assignmentDate)}</Typography></Grid>}
              {selectedLot.releaseDate && <Grid item xs={4}><Typography variant="caption" color="textSecondary">Released</Typography><Typography variant="caption">{formatDate(selectedLot.releaseDate)}</Typography></Grid>}
            </Grid>
            </>
          )}
      </PortalDialog>

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
    </PortalShell>
  );
};

export default ECXPortal;
