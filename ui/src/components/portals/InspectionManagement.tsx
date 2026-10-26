// Inspection Management Component for ECTAPortal
// Professional quality control dashboard with full inspection workflow
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Collapse,
  Grid,
  Divider,
  Slider,
  LinearProgress,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Assignment,
  Refresh,
  Science,
  ExpandMore,
  ExpandLess,
  Search,
  FilterList,
  Visibility,
  LocalShipping,
  GppGood,
  Block,
  HourglassTop,
  FactCheck,
  Description,
} from '@mui/icons-material';
import { AnimatedButton, StatusChip } from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import api from '@/utils/api';

interface Inspection {
  inspectionId: string;
  shipmentId: string;
  exporterId: string;
  contractId: string;
  status: string;
  qualityGrade?: string;
  cuppingGrade?: string;
  totalScore?: number;
  inspectorName?: string;
  approvedBy?: string;
  certificateNo?: string;
  exportPermitNo?: string;
  rejectionReason?: string;
  createdAt?: string;
  moistureContent?: number;
  defectCount?: number;
  beanSize?: string;
  classification?: string;
}

type FilterTab = 'ALL' | 'PENDING' | 'INSPECTED' | 'APPROVED' | 'REJECTED';

interface InspectionManagementProps {
  filterTab?: FilterTab;
}

const INSPECTORS = [
  { id: 'INS-001', name: 'Dr. Getachew Amare', title: 'Quality Director' },
  { id: 'INS-002', name: 'Ato Mekonnen Solomon', title: 'Senior Manager' },
  { id: 'INS-003', name: 'W/ro Hana Tesfaye', title: 'Quality Manager' },
  { id: 'INS-004', name: 'Dr. Yohannes Assefa', title: 'Chief Q-Grader' },
  { id: 'INS-005', name: 'Ato Dawit Hailu', title: 'Senior Inspector' },
  { id: 'INS-006', name: 'W/ro Meron Worku', title: 'Trade Facilitator' },
];

const CLASSIFICATIONS = [
  'Specialty Grade (Grade 1)',
  'Premium Grade (Grade 2)',
  'Exchange Grade (Grade 3)',
  'Below Standard (Grade 4)',
  'Off Grade (Grade 5)',
];

const BEAN_SIZES = ['Screen 18+', 'Screen 17', 'Screen 16', 'Screen 15', 'Screen 14', 'Screen 13', 'Mixed'];

const COLORS = ['Bluish-Green', 'Green', 'Greenish', 'Yellowish-Green', 'Pale Yellow', 'Brownish'];

const ODORS = ['Clean', 'Neutral', 'Fruity', 'Fermented', 'Musty', 'Chemical'];

const normalizeInspectionStatus = (status?: string): string => {
  const normalized = String(status || '').trim().toUpperCase();

  if (['PENDING', 'INSPECTION_PENDING', 'UNDER_INSPECTION', 'REQUESTED'].includes(normalized)) {
    return 'PENDING';
  }
  if (['INSPECTED', 'PERFORMED', 'COMPLETED'].includes(normalized)) {
    return 'INSPECTED';
  }
  if (['APPROVED', 'QUALITY_APPROVED', 'CERTIFIED'].includes(normalized)) {
    return 'APPROVED';
  }
  if (['REJECTED', 'FAILED'].includes(normalized)) {
    return 'REJECTED';
  }

  return normalized;
};

const isCompleteInspectionRecord = (inspection: Inspection): boolean => {
  return Boolean(
    inspection?.inspectionId &&
    inspection?.shipmentId &&
    inspection?.exporterId &&
    inspection?.status &&
    inspection?.contractId
  );
};

export const InspectionManagement: React.FC<InspectionManagementProps> = ({ filterTab: externalFilterTab }) => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  
  // Use external filter if provided (from parent KPI Sub-Tabs), otherwise use internal state
  const activeFilterTab = externalFilterTab || filterTab;
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Approve dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [approvedBy, setApprovedBy] = useState('');
  const [certificateNo, setCertificateNo] = useState('');

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectedBy, setRejectedBy] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Permit dialog
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [permitNumber, setPermitNumber] = useState('');
  const [issuedBy, setIssuedBy] = useState('');

  // Perform Inspection dialog
  const [performDialogOpen, setPerformDialogOpen] = useState(false);
  const [performStep, setPerformStep] = useState(0);
  const [performLoading, setPerformLoading] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    inspectorID: '',
    inspectorName: '',
    sampleSize: '300',
    moistureContent: '10.5',
    defectCount: '5',
    beanSize: 'Screen 15',
    color: 'Green',
    odor: 'Clean',
    fragrance: 8,
    flavor: 8,
    aftertaste: 7.5,
    acidity: 8,
    body: 8,
    balance: 8,
    uniformity: 10,
    cleanCup: 10,
    sweetness: 10,
    overall: 8,
    classification: 'Specialty Grade (Grade 1)',
    pesticideTest: 'PASS',
    heavyMetalTest: 'PASS',
    mycotoxinTest: 'PASS',
    remarks: '',
  });

  const [notification, setNotification] = useState({
    open: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    details: '',
  });

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quality/inspections');
      if (response.data.success) {
        const completeInspections = (response.data.data || []).filter((inspection: Inspection) =>
          isCompleteInspectionRecord(inspection)
        );
        setInspections(completeInspections);
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  // ----- Filtered & searched inspections -----
  const filteredInspections = useMemo(() => {
    let result = inspections.filter((inspection) => isCompleteInspectionRecord(inspection));
    if (activeFilterTab !== 'ALL') {
      result = result.filter((i) => normalizeInspectionStatus(i.status) === activeFilterTab);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.inspectionId.toLowerCase().includes(term) ||
          i.shipmentId.toLowerCase().includes(term) ||
          i.exporterId.toLowerCase().includes(term)
      );
    }
    return result;
  }, [inspections, activeFilterTab, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredInspections.length / pageSize));
  const paginatedInspections = useMemo(() => {
    const start = page * pageSize;
    return filteredInspections.slice(start, start + pageSize);
  }, [filteredInspections, page]);
  const rangeStart = filteredInspections.length === 0 ? 0 : page * pageSize;
  const rangeEnd = Math.min(filteredInspections.length, (page + 1) * pageSize) - 1;

  useEffect(() => {
    setPage(0);
    setExpandedRow(null);
  }, [activeFilterTab, searchTerm]);

  // ----- Summary stats -----
  const stats = useMemo(() => ({
    total: inspections.length,
    pending: inspections.filter((i) => normalizeInspectionStatus(i.status) === 'PENDING').length,
    inspected: inspections.filter((i) => normalizeInspectionStatus(i.status) === 'INSPECTED').length,
    approved: inspections.filter((i) => normalizeInspectionStatus(i.status) === 'APPROVED').length,
    rejected: inspections.filter((i) => normalizeInspectionStatus(i.status) === 'REJECTED').length,
  }), [inspections]);

  // ----- Auto-generate helpers -----
  const autoGenCert = () => {
    const d = new Date();
    const ds = d.toISOString().split('T')[0].replace(/-/g, '');
    setCertificateNo(`CERT-${ds}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  };

  const autoGenPermit = () => {
    const d = new Date();
    const ds = d.toISOString().split('T')[0].replace(/-/g, '');
    setPermitNumber(`EP-${ds}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
  };

  // ----- Total cupping score calculator -----
  const cuppingTotal = useMemo(() => {
    const d = inspectionData;
    return d.fragrance + d.flavor + d.aftertaste + d.acidity + d.body +
      d.balance + d.uniformity + d.cleanCup + d.sweetness + d.overall;
  }, [inspectionData]);

  const cuppingGradeLabel = (score: number): string => {
    if (score >= 90) return 'Outstanding (Specialty)';
    if (score >= 85) return 'Excellent (Specialty)';
    if (score >= 80) return 'Very Good (Specialty)';
    if (score >= 75) return 'Good (Premium)';
    if (score >= 70) return 'Fair (Exchange)';
    if (score >= 60) return 'Below Standard';
    return 'Off Grade';
  };

  // ----- Dialog openers -----
  const openPerformDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setPerformStep(0);
    setInspectionData({
      inspectorID: '',
      inspectorName: '',
      sampleSize: '300',
      moistureContent: '10.5',
      defectCount: '5',
      beanSize: 'Screen 15',
      color: 'Green',
      odor: 'Clean',
      fragrance: 8,
      flavor: 8,
      aftertaste: 7.5,
      acidity: 8,
      body: 8,
      balance: 8,
      uniformity: 10,
      cleanCup: 10,
      sweetness: 10,
      overall: 8,
      classification: 'Specialty Grade (Grade 1)',
      pesticideTest: 'PASS',
      heavyMetalTest: 'PASS',
      mycotoxinTest: 'PASS',
      remarks: '',
    });
    setPerformDialogOpen(true);
  };

  const openApproveDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setApprovedBy('');
    autoGenCert();
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setRejectedBy('');
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const openPermitDialog = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIssuedBy('');
    autoGenPermit();
    setPermitDialogOpen(true);
  };

  // ----- Handlers -----
  const handlePerformInspection = async () => {
    if (!selectedInspection || !inspectionData.inspectorID || !inspectionData.inspectorName) return;
    setPerformLoading(true);
    try {
      const payload = {
        inspectorID: inspectionData.inspectorID,
        inspectorName: inspectionData.inspectorName,
        sampleSize: parseFloat(inspectionData.sampleSize),
        moistureContent: parseFloat(inspectionData.moistureContent),
        defectCount: parseInt(inspectionData.defectCount),
        beanSize: inspectionData.beanSize,
        color: inspectionData.color,
        odor: inspectionData.odor,
        fragrance: inspectionData.fragrance,
        flavor: inspectionData.flavor,
        aftertaste: inspectionData.aftertaste,
        acidity: inspectionData.acidity,
        body: inspectionData.body,
        balance: inspectionData.balance,
        uniformity: inspectionData.uniformity,
        cleanCup: inspectionData.cleanCup,
        sweetness: inspectionData.sweetness,
        overall: inspectionData.overall,
        classification: inspectionData.classification,
        pesticideTest: inspectionData.pesticideTest,
        heavyMetalTest: inspectionData.heavyMetalTest,
        mycotoxinTest: inspectionData.mycotoxinTest,
        remarks: inspectionData.remarks,
      };

      const res = await api.post(
        `/quality/inspections/${selectedInspection.inspectionId}/perform`,
        payload
      );

      if (res.data.success) {
        setNotification({
          open: true,
          type: 'success',
          title: '✅ Inspection Completed',
          message: `Inspection for ${selectedInspection.shipmentId} has been performed successfully.`,
          details: `Cupping Score: ${cuppingTotal}/100 — ${cuppingGradeLabel(cuppingTotal)}\nClassification: ${inspectionData.classification}\n\n🎯 NEXT STEP: Review the results and click "Approve" or "Reject".`,
        });
        setPerformDialogOpen(false);
        loadInspections();
      } else {
        setNotification({
          open: true,
          type: 'error',
          title: 'Inspection Failed',
          message: res.data.error?.message || 'Failed to perform inspection',
          details: '',
        });
      }
    } catch (err: any) {
      setNotification({
        open: true,
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error?.message || err.message,
        details: '',
      });
    } finally {
      setPerformLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedInspection || !approvedBy || !certificateNo) return;
    try {
      const res = await api.post(`/quality/inspections/${selectedInspection.inspectionId}/approve`, {
        approvedBy,
        certificateNo,
      });
      if (res.data.success) {
        setNotification({
          open: true,
          type: 'success',
          title: '✅ Inspection Approved',
          message: `Certificate ${certificateNo} issued for ${selectedInspection.shipmentId}.`,
          details: '🎯 NEXT STEP: Click "Issue Permit" button to generate export permit. This will authorize customs clearance.',
        });
        setApproveDialogOpen(false);
        loadInspections();
      } else {
        setNotification({ open: true, type: 'error', title: 'Approval Failed', message: res.data.error?.message || 'Failed to approve', details: '' });
      }
    } catch (err: any) {
      setNotification({ open: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || err.message, details: '' });
    }
  };

  const handleReject = async () => {
    if (!selectedInspection || !rejectedBy || !rejectionReason) return;
    try {
      const res = await api.post(`/quality/inspections/${selectedInspection.inspectionId}/reject`, {
        rejectedBy,
        rejectionReason,
      });
      if (res.data.success) {
        setNotification({ open: true, type: 'warning', title: '⚠️ Inspection Rejected', message: `Shipment ${selectedInspection.shipmentId} did not pass quality standards.`, details: `Reason: ${rejectionReason}` });
        setRejectDialogOpen(false);
        loadInspections();
      } else {
        setNotification({ open: true, type: 'error', title: 'Rejection Failed', message: res.data.error?.message || 'Failed to reject', details: '' });
      }
    } catch (err: any) {
      setNotification({ open: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || err.message, details: '' });
    }
  };

  const handleIssuePermit = async () => {
    if (!selectedInspection || !permitNumber || !issuedBy) return;
    try {
      const res = await api.post(`/quality/inspections/${selectedInspection.inspectionId}/issue-permit`, {
        exportPermitNo: permitNumber,
        issuedBy,
      });
      if (res.data.success) {
        setNotification({
          open: true,
          type: 'success',
          title: '✅ Export Permit Issued',
          message: `Permit ${permitNumber} issued for ${selectedInspection.shipmentId}.`,
          details: '🎯 NEXT STEPS:\n1. Exporter proceeds to CUSTOMS for clearance\n2. Customs officer verifies permit & documents\n3. After clearance, shipment moves to SHIPPING',
        });
        setPermitDialogOpen(false);
        loadInspections();
      } else {
        setNotification({ open: true, type: 'error', title: 'Permit Failed', message: res.data.error?.message || 'Failed to issue permit', details: '' });
      }
    } catch (err: any) {
      setNotification({ open: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || err.message, details: '' });
    }
  };

  // ───────────────────────────── RENDER ─────────────────────────────
  return (
    <Box>
      {/* ===== Search + Refresh Bar (Filter tabs removed - controlled by parent KPI Sub-Tabs) ===== */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            bgcolor: 'grey.50',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
            Quality Control Dashboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search inspections…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 34, fontSize: 13 } }}
            />
            <Tooltip title="Refresh inspections">
              <span>
                <IconButton onClick={loadInspections} size="small" disabled={loading}>
                  <Refresh sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ height: 2 }} />}

        {/* ===== Data Table ===== */}
        <TableContainer>
          <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: '#fafafa',
                  '& th': {
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    py: 0.9,
                    px: 1,
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                  },
                }}
              >
                <TableCell sx={{ width: 30, px: 0.5 }} />
                <TableCell sx={{ px: 1 }}>Inspection ID</TableCell>
                <TableCell sx={{ px: 1 }}>Shipment</TableCell>
                <TableCell sx={{ px: 1 }}>Exporter</TableCell>
                <TableCell sx={{ px: 1 }}>Status</TableCell>
                <TableCell sx={{ px: 1 }}>Grade / Score</TableCell>
                <TableCell sx={{ px: 1 }}>Certificate / Permit</TableCell>
                <TableCell align="right" sx={{ px: 1 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInspections.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Box>
                      <Science sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm ? 'No inspections match your search.' : 'No inspections found for this filter.'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}

              {paginatedInspections.map((insp) => {
                const isExpanded = expandedRow === insp.inspectionId;
                return (
                  <React.Fragment key={insp.inspectionId}>
                    {/* Main row */}
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha('#1565c0', 0.03) },
                        transition: 'background-color 0.15s',
                        ...(isExpanded && { bgcolor: alpha('#1565c0', 0.04) }),
                      }}
                      onClick={() => setExpandedRow(isExpanded ? null : insp.inspectionId)}
                    >
                      {/* Expand toggle */}
                      <TableCell sx={{ width: 30, px: 0.5, py: 0.75 }}>
                        <IconButton size="small" sx={{ p: 0.3 }}>
                          {isExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </TableCell>

                      {/* Inspection ID */}
                      <TableCell sx={{ px: 1, py: 0.75 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: 11,
                            bgcolor: 'grey.100',
                            px: 1,
                            py: 0.3,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          {insp.inspectionId.replace('INSPECTION_', '').substring(0, 20)}…
                        </Typography>
                      </TableCell>

                      {/* Shipment */}
                      <TableCell sx={{ px: 1, py: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalShipping sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={500} fontSize={13}>
                            {insp.shipmentId}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Exporter */}
                      <TableCell sx={{ px: 1, py: 0.75 }}>
                        <Typography variant="body2" fontSize={13}>
                          {insp.exporterId}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ px: 1, py: 0.75 }}>
                        <StatusChip
                          status={insp.status as any}
                          size="small"
                          pulse={insp.status === 'PENDING'}
                        />
                      </TableCell>

                      {/* Grade / Score */}
                      <TableCell sx={{ px: 1, py: 0.75 }}>
                        {insp.qualityGrade ? (
                          <Box>
                            <Typography variant="caption" fontWeight={600} display="block">
                              {insp.qualityGrade}
                            </Typography>
                            {insp.totalScore != null && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={insp.totalScore}
                                  sx={{
                                    width: 50,
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 2,
                                      bgcolor:
                                        insp.totalScore >= 80
                                          ? '#2e7d32'
                                          : insp.totalScore >= 60
                                          ? '#e65100'
                                          : '#c62828',
                                    },
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary" fontSize={11}>
                                  {insp.totalScore.toFixed(1)}/100
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>

                      {/* Certificate / Permit */}
                      <TableCell sx={{ px: 1, py: 0.75 }}>
                        {insp.certificateNo && (
                          <Chip
                            icon={<Description sx={{ fontSize: 14 }} />}
                            label={insp.certificateNo}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: 11, height: 24, mb: 0.3 }}
                          />
                        )}
                        {insp.exportPermitNo && (
                          <Chip
                            icon={<GppGood sx={{ fontSize: 14 }} />}
                            label={insp.exportPermitNo}
                            size="small"
                            color="success"
                            sx={{ fontSize: 11, height: 24, ml: insp.certificateNo ? 0.5 : 0 }}
                          />
                        )}
                        {insp.rejectionReason && (
                          <Tooltip title={insp.rejectionReason}>
                            <Chip
                              icon={<Block sx={{ fontSize: 14 }} />}
                              label="Rejected"
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ fontSize: 11, height: 24 }}
                            />
                          </Tooltip>
                        )}
                        {!insp.certificateNo && !insp.exportPermitNo && !insp.rejectionReason && (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" sx={{ px: 1, py: 0.75 }} onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          {/* PENDING → Perform Inspection */}
                          {normalizeInspectionStatus(insp.status) === 'PENDING' && (
                            <AnimatedButton
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<Science sx={{ fontSize: 14 }} />}
                              onClick={() => openPerformDialog(insp)}
                              sx={{
                                fontSize: 11,
                                px: 1.5,
                                py: 0.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(230, 81, 0, 0.25)',
                              }}
                            >
                              Perform Inspection
                            </AnimatedButton>
                          )}

                          {/* INSPECTED → Approve or Reject */}
                          {normalizeInspectionStatus(insp.status) === 'INSPECTED' && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                                onClick={() => openApproveDialog(insp)}
                                sx={{
                                  fontSize: 11,
                                  px: 1.5,
                                  py: 0.5,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.25)',
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Cancel sx={{ fontSize: 14 }} />}
                                onClick={() => openRejectDialog(insp)}
                                sx={{
                                  fontSize: 11,
                                  px: 1.5,
                                  py: 0.5,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  borderRadius: '8px',
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {/* APPROVED → Issue Permit (if not issued yet) */}
                          {normalizeInspectionStatus(insp.status) === 'APPROVED' && !insp.exportPermitNo && (
                            <AnimatedButton
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<Assignment sx={{ fontSize: 14 }} />}
                              onClick={() => openPermitDialog(insp)}
                              sx={{
                                fontSize: 11,
                                px: 1.5,
                                py: 0.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(21, 101, 192, 0.25)',
                              }}
                            >
                              Issue Permit
                            </AnimatedButton>
                          )}

                          {/* APPROVED + Permit Issued → Complete */}
                          {normalizeInspectionStatus(insp.status) === 'APPROVED' && insp.exportPermitNo && (
                            <Chip
                              icon={<CheckCircle sx={{ fontSize: 14 }} />}
                              label="Permit Issued → Customs"
                              size="small"
                              color="success"
                              variant="filled"
                              sx={{ fontSize: 11, fontWeight: 600 }}
                            />
                          )}

                          {/* REJECTED */}
                          {normalizeInspectionStatus(insp.status) === 'REJECTED' && (
                            <Tooltip title={insp.rejectionReason || 'Rejected'}>
                              <Chip
                                icon={<Block sx={{ fontSize: 14 }} />}
                                label="Quality Failed"
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ fontSize: 11 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              py: 1.25,
                              px: 2,
                              bgcolor: alpha('#1565c0', 0.015),
                              borderTop: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Grid container spacing={1.25}>
                              <Grid item xs={12} md={6}>
                                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
                                  <Typography variant="overline" color="text.secondary" fontWeight={700} fontSize={9.5}>
                                    Inspection Overview
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <DetailRow label="Inspection ID" value={insp.inspectionId} mono />
                                    <DetailRow label="Shipment ID" value={insp.shipmentId} />
                                    <DetailRow label="Contract ID" value={insp.contractId || '—'} />
                                    <DetailRow label="Exporter ID" value={insp.exporterId} />
                                  </Box>
                                </Paper>
                              </Grid>

                              <Grid item xs={12} md={6}>
                                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
                                  <Typography variant="overline" color="text.secondary" fontWeight={700} fontSize={9.5}>
                                    Quality Assessment
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <DetailRow label="Grade" value={insp.qualityGrade || 'Not inspected'} />
                                    <DetailRow label="Total Score" value={insp.totalScore != null ? `${insp.totalScore.toFixed(1)}/100` : '—'} />
                                    <DetailRow label="Inspector" value={insp.inspectorName || '—'} />
                                    <DetailRow label="Classification" value={insp.classification || '—'} />
                                    <DetailRow label="Moisture" value={insp.moistureContent != null ? `${insp.moistureContent}%` : '—'} />
                                    <DetailRow label="Defects" value={insp.defectCount != null ? `${insp.defectCount}` : '—'} />
                                  </Box>
                                </Paper>
                              </Grid>

                              <Grid item xs={12}>
                                <Paper elevation={0} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
                                  <Typography variant="overline" color="text.secondary" fontWeight={700} fontSize={9.5}>
                                    Certification & Decision
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <DetailRow label="Certificate No" value={insp.certificateNo || '—'} />
                                    <DetailRow label="Export Permit" value={insp.exportPermitNo || '—'} />
                                    <DetailRow label="Approved By" value={insp.approvedBy || '—'} />
                                    {insp.rejectionReason ? (
                                      <DetailRow label="Rejection" value={insp.rejectionReason} error />
                                    ) : (
                                      <DetailRow label="Decision" value="Awaiting final quality decision" />
                                    )}
                                  </Box>
                                </Paper>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Table footer */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Showing {rangeStart}-{Math.max(rangeStart, rangeEnd)} of {filteredInspections.length} inspections
            {filterTab !== 'ALL' && ` · Filtered by: ${filterTab}`}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, textAlign: 'center' }}>
              Round {page + 1} / {pageCount}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* =============================== PERFORM INSPECTION DIALOG =============================== */}
      <Dialog
        open={performDialogOpen}
        onClose={() => !performLoading && setPerformDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #e65100 0%, #ff8f00 100%)',
            color: 'white',
            px: 3,
            py: 2,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            <Science sx={{ verticalAlign: 'middle', mr: 1, fontSize: 24 }} />
            Perform Quality Inspection
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
            Shipment: <strong>{selectedInspection?.shipmentId}</strong> · Exporter: <strong>{selectedInspection?.exporterId}</strong>
          </Typography>
        </Box>

        {/* Step indicator */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
          {['Inspector & Sample', 'Cupping Scores', 'Lab Tests & Submit'].map((label, i) => (
            <Box
              key={label}
              onClick={() => setPerformStep(i)}
              sx={{
                flex: 1,
                py: 1.5,
                px: 2,
                textAlign: 'center',
                cursor: 'pointer',
                fontWeight: performStep === i ? 700 : 500,
                fontSize: 13,
                color: performStep === i ? '#e65100' : 'text.secondary',
                borderBottom: performStep === i ? '3px solid #e65100' : '3px solid transparent',
                bgcolor: performStep === i ? alpha('#e65100', 0.05) : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: alpha('#e65100', 0.03) },
              }}
            >
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block', fontSize: 10, color: 'text.disabled' }}>
                STEP {i + 1}
              </Typography>
              {label}
            </Box>
          ))}
        </Box>

        <DialogContent sx={{ py: 3 }}>
          {/* STEP 0: Inspector & Sample */}
          {performStep === 0 && (
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Select the inspector and enter physical bean sample information.
                </Alert>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Inspector *</InputLabel>
                  <Select
                    value={inspectionData.inspectorID}
                    label="Inspector *"
                    onChange={(e) => {
                      const sel = INSPECTORS.find((i) => i.id === e.target.value);
                      setInspectionData((d) => ({
                        ...d,
                        inspectorID: e.target.value,
                        inspectorName: sel?.name || '',
                      }));
                    }}
                  >
                    {INSPECTORS.map((ins) => (
                      <MenuItem key={ins.id} value={ins.id}>
                        {ins.name} ({ins.title})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Inspector Name" value={inspectionData.inspectorName} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12}><Divider sx={{ my: 0.5 }}><Chip label="Physical Analysis" size="small" /></Divider></Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Sample Size (g)" type="number" value={inspectionData.sampleSize}
                  onChange={(e) => setInspectionData((d) => ({ ...d, sampleSize: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Moisture Content (%)" type="number" value={inspectionData.moistureContent}
                  onChange={(e) => setInspectionData((d) => ({ ...d, moistureContent: e.target.value }))}
                  helperText="Acceptable: 9.0 — 12.5%"
                  inputProps={{ step: 0.1 }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Defect Count" type="number" value={inspectionData.defectCount}
                  onChange={(e) => setInspectionData((d) => ({ ...d, defectCount: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Bean Size</InputLabel>
                  <Select value={inspectionData.beanSize} label="Bean Size"
                    onChange={(e) => setInspectionData((d) => ({ ...d, beanSize: e.target.value }))}>
                    {BEAN_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Color</InputLabel>
                  <Select value={inspectionData.color} label="Color"
                    onChange={(e) => setInspectionData((d) => ({ ...d, color: e.target.value }))}>
                    {COLORS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Odor</InputLabel>
                  <Select value={inspectionData.odor} label="Odor"
                    onChange={(e) => setInspectionData((d) => ({ ...d, odor: e.target.value }))}>
                    {ODORS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Classification *</InputLabel>
                  <Select value={inspectionData.classification} label="Classification *"
                    onChange={(e) => setInspectionData((d) => ({ ...d, classification: e.target.value }))}>
                    {CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {/* STEP 1: Cupping Scores */}
          {performStep === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Rate each cupping attribute on the SCA scale. Fragrance through Overall are scored 6–10; Uniformity, Clean Cup, Sweetness are scored 0–10.
              </Alert>

              {/* Score summary */}
              <Paper
                elevation={0}
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: cuppingTotal >= 80 ? '#2e7d32' : cuppingTotal >= 60 ? '#e65100' : '#c62828',
                  bgcolor: alpha(cuppingTotal >= 80 ? '#2e7d32' : cuppingTotal >= 60 ? '#e65100' : '#c62828', 0.05),
                  textAlign: 'center',
                }}
              >
                <Typography variant="h3" fontWeight={800} color={cuppingTotal >= 80 ? '#2e7d32' : cuppingTotal >= 60 ? '#e65100' : '#c62828'}>
                  {cuppingTotal.toFixed(1)}
                </Typography>
                <Typography variant="body2" fontWeight={600}>{cuppingGradeLabel(cuppingTotal)}</Typography>
              </Paper>

              <Grid container spacing={2}>
                {([
                  { key: 'fragrance', label: 'Fragrance / Aroma', min: 6, max: 10, step: 0.25 },
                  { key: 'flavor', label: 'Flavor', min: 6, max: 10, step: 0.25 },
                  { key: 'aftertaste', label: 'Aftertaste', min: 6, max: 10, step: 0.25 },
                  { key: 'acidity', label: 'Acidity', min: 6, max: 10, step: 0.25 },
                  { key: 'body', label: 'Body', min: 6, max: 10, step: 0.25 },
                  { key: 'balance', label: 'Balance', min: 6, max: 10, step: 0.25 },
                  { key: 'uniformity', label: 'Uniformity', min: 0, max: 10, step: 2 },
                  { key: 'cleanCup', label: 'Clean Cup', min: 0, max: 10, step: 2 },
                  { key: 'sweetness', label: 'Sweetness', min: 0, max: 10, step: 2 },
                  { key: 'overall', label: 'Overall', min: 6, max: 10, step: 0.25 },
                ] as const).map(({ key, label, min, max, step }) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <Box sx={{ px: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} fontSize={12}>{label}</Typography>
                        <Typography variant="caption" fontWeight={700} color="primary" fontSize={12}>
                          {(inspectionData[key] as number).toFixed(step < 1 ? 2 : 0)}
                        </Typography>
                      </Box>
                      <Slider
                        value={inspectionData[key] as number}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(_e, v) => setInspectionData((d) => ({ ...d, [key]: v as number }))}
                        size="small"
                        sx={{
                          color: '#e65100',
                          '& .MuiSlider-thumb': { width: 14, height: 14 },
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* STEP 2: Lab Tests & Submit */}
          {performStep === 2 && (
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Record laboratory safety test results and submit the inspection.
                </Alert>
              </Grid>
              {([
                { key: 'pesticideTest', label: 'Pesticide Residue Test' },
                { key: 'heavyMetalTest', label: 'Heavy Metal Test' },
                { key: 'mycotoxinTest', label: 'Mycotoxin (Ochratoxin A) Test' },
              ] as const).map(({ key, label }) => (
                <Grid item xs={12} sm={4} key={key}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{label}</InputLabel>
                    <Select
                      value={inspectionData[key]}
                      label={label}
                      onChange={(e) => setInspectionData((d) => ({ ...d, [key]: e.target.value }))}
                    >
                      <MenuItem value="PASS">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle sx={{ fontSize: 16, color: '#2e7d32' }} /> PASS
                        </Box>
                      </MenuItem>
                      <MenuItem value="FAIL">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Cancel sx={{ fontSize: 16, color: '#c62828' }} /> FAIL
                        </Box>
                      </MenuItem>
                      <MenuItem value="NOT_TESTED">NOT TESTED</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              ))}
              <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  label="Inspector Remarks (optional)"
                  value={inspectionData.remarks}
                  onChange={(e) => setInspectionData((d) => ({ ...d, remarks: e.target.value }))}
                  placeholder="e.g., Sample exhibited strong berry notes, clean processing, minor insect damage on 3 beans…"
                />
              </Grid>

              {/* Summary Card */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>📋 Inspection Summary</Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">Inspector</Typography>
                      <Typography variant="body2" fontWeight={600}>{inspectionData.inspectorName || '—'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">Classification</Typography>
                      <Typography variant="body2" fontWeight={600}>{inspectionData.classification.split('(')[0].trim()}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">Cupping Score</Typography>
                      <Typography variant="body2" fontWeight={700} color={cuppingTotal >= 80 ? '#2e7d32' : cuppingTotal >= 60 ? '#e65100' : '#c62828'}>
                        {cuppingTotal.toFixed(1)}/100
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">Lab Tests</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {[inspectionData.pesticideTest, inspectionData.heavyMetalTest, inspectionData.mycotoxinTest].filter(t => t === 'PASS').length}/3 Passed
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
          <Button onClick={() => setPerformDialogOpen(false)} disabled={performLoading}>
            Cancel
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {performStep > 0 && (
              <Button variant="outlined" onClick={() => setPerformStep((s) => s - 1)} disabled={performLoading}>
                Back
              </Button>
            )}
            {performStep < 2 ? (
              <Button
                variant="contained"
                onClick={() => setPerformStep((s) => s + 1)}
                disabled={performStep === 0 && !inspectionData.inspectorID}
                sx={{
                  bgcolor: '#e65100',
                  '&:hover': { bgcolor: '#bf360c' },
                }}
              >
                Next
              </Button>
            ) : (
              <AnimatedButton
                variant="contained"
                startIcon={<Science />}
                onClick={handlePerformInspection}
                disabled={performLoading || !inspectionData.inspectorID}
                sx={{
                  bgcolor: '#e65100',
                  '&:hover': { bgcolor: '#bf360c' },
                  fontWeight: 700,
                }}
              >
                {performLoading ? 'Submitting…' : 'Submit Inspection'}
              </AnimatedButton>
            )}
          </Box>
        </DialogActions>
        {performLoading && <LinearProgress sx={{ height: 3 }} color="warning" />}
      </Dialog>

      {/* =============================== APPROVE DIALOG =============================== */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)', color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            <CheckCircle sx={{ verticalAlign: 'middle', mr: 1 }} />
            Approve Quality Inspection
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Approving: <strong>{selectedInspection?.shipmentId}</strong>
            {selectedInspection?.qualityGrade && ` — ${selectedInspection.qualityGrade} (${selectedInspection.totalScore?.toFixed(1)}/100)`}
          </Alert>
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Approved By *</InputLabel>
            <Select value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} label="Approved By *">
              {INSPECTORS.slice(0, 4).map((ins) => (
                <MenuItem key={ins.id} value={ins.name}>{ins.name} ({ins.title})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="Certificate Number" value={certificateNo}
            onChange={(e) => setCertificateNo(e.target.value)} helperText="Auto-generated — edit if needed" />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircle />}
            onClick={handleApprove} disabled={!approvedBy || !certificateNo}
            sx={{ fontWeight: 700, borderRadius: '8px' }}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================== REJECT DIALOG =============================== */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ background: 'linear-gradient(135deg, #c62828 0%, #e53935 100%)', color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            <Cancel sx={{ verticalAlign: 'middle', mr: 1 }} />
            Reject Quality Inspection
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Rejecting: <strong>{selectedInspection?.shipmentId}</strong>. This cannot be undone.
          </Alert>
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Rejected By *</InputLabel>
            <Select value={rejectedBy} onChange={(e) => setRejectedBy(e.target.value)} label="Rejected By *">
              {INSPECTORS.slice(0, 4).map((ins) => (
                <MenuItem key={ins.id} value={ins.name}>{ins.name} ({ins.title})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={3} required size="small" label="Rejection Reason *"
            value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
            helperText="This will be visible to the exporter"
            placeholder="e.g., Moisture content exceeds 12%, defect count above Grade 5 threshold..." />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<Cancel />}
            onClick={handleReject} disabled={!rejectedBy || !rejectionReason}
            sx={{ fontWeight: 700, borderRadius: '8px' }}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================== ISSUE PERMIT DIALOG =============================== */}
      <Dialog open={permitDialogOpen} onClose={() => setPermitDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)', color: 'white', px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            <Assignment sx={{ verticalAlign: 'middle', mr: 1 }} />
            Issue Export Permit
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Quality approved for <strong>{selectedInspection?.shipmentId}</strong>. Issue export permit to allow customs clearance.
          </Alert>
          <TextField fullWidth size="small" label="Export Permit Number" value={permitNumber}
            onChange={(e) => setPermitNumber(e.target.value)} sx={{ mb: 2 }}
            helperText="Auto-generated format: EP-YYYYMMDD-XXX" />
          <FormControl fullWidth size="small">
            <InputLabel>Issued By *</InputLabel>
            <Select value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} label="Issued By *">
              {INSPECTORS.slice(4).map((ins) => (
                <MenuItem key={ins.id} value={ins.name}>{ins.name} ({ins.title})</MenuItem>
              ))}
              {INSPECTORS.slice(0, 2).map((ins) => (
                <MenuItem key={ins.id} value={ins.name}>{ins.name} ({ins.title})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPermitDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Assignment />}
            onClick={handleIssuePermit} disabled={!permitNumber || !issuedBy}
            sx={{ fontWeight: 700, borderRadius: '8px' }}>
            Issue Permit
          </Button>
        </DialogActions>
      </Dialog>

      {/* =============================== NOTIFICATION =============================== */}
      <NotificationDialog
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </Box>
  );
};

// ─── Helper: Detail row for expanded section ───
const DetailRow: React.FC<{ label: string; value: string; mono?: boolean; error?: boolean }> = ({ label, value, mono, error }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 38%) 1fr', gap: 0.75, py: 0.35, alignItems: 'start' }}>
    <Typography variant="caption" color="text.secondary" fontSize={10.5} fontWeight={700}>
      {label}
    </Typography>
    <Typography
      variant="caption"
      fontWeight={600}
      fontSize={10.5}
      sx={{
        ...(mono && { fontFamily: '"JetBrains Mono", monospace' }),
        ...(error && { color: 'error.main' }),
        textAlign: 'left',
        wordBreak: 'break-word',
      }}
    >
      {value}
    </Typography>
  </Box>
);
