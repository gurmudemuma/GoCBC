// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal - Exporter Registration & Quality Control

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { viewDocument, downloadDocument } from '@/utils/documentHelpers';
import SignatureStatusBadge from '@/components/documents/SignatureStatusBadge';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Snackbar,
  Button,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add,
  Edit,
  Visibility,
  CheckCircle,
  CheckCircleOutline,
  Warning,
  Science,
  Assignment,
  Coffee,
  Download,
  Upload,
  Cancel,
  Description,
  DirectionsBoat,
  FlightTakeoff,
  AccountBalance,
  TrendingUp,
  HourglassTop,
  HourglassEmpty,
  Person,
  Block,
  ErrorOutline,
  Pending,
  Assessment,
  People,
  InsertDriveFile,
  WarningAmber,
} from '@mui/icons-material';
import AuditTrailViewer from './AuditTrailViewer';
import AuditTrailTable from './AuditTrailTable';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import PostDeliveryWorkflowPanel from '../shared/PostDeliveryWorkflowPanel';

import { useForm, Controller } from 'react-hook-form';
import { InspectionManagement } from './InspectionManagement';
import { QualityInspectionWorkflow } from './QualityInspectionWorkflow';
import { PhytosanitaryCertificates } from './PhytosanitaryCertificates';

// NEW: Pre-shipment Inspection Tab
import { InspectionRequestsTab } from '@/components/inspection';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { Exporter, CoffeeShipment, ExporterFormData } from '@/types';
import BankSelect from '@/components/common/BankSelect';
import BankBranchSelect from '@/components/common/BankBranchSelect';
import { BankBranch } from '@/utils/bankBranches';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import { useAuth } from '@/contexts/AuthContext';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  ModernDataTable,
  StatusChip,
  LoadingSkeleton,
  EmptyState,
  ThemeToggle,
} from '@/components/modern';
import UserManagement from '@/components/admin/UserManagement';
import {
  PortalShell,
  PortalTabBar,
  PortalTabPanel,
  PortalKpiCard,
  PortalCard,
  PrimaryButton,
  DangerButton,
  GhostButton,
  PortalDialog,
  PortalDialogActions,
  PortalField,
  getPortalBrand,
} from '@/components/shared/portal';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import { useTabFromQuery } from '@/hooks/useTabFromQuery';
import { DocumentManagementPanel } from '@/components/documents';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';
import { BlockchainStatusIcon, BlockchainTxChip, BlockchainBadge } from '@/components/blockchain';


const contractRejectionFields = [
  'Buyer name or company',
  'Buyer country or bank',
  'Coffee type or grade',
  'Quantity',
  'Price, value, or currency',
  'Payment method',
  'Delivery terms, port, or date',
  'EUDR or other compliance',
  'Required documents',
  'Other contract detail',
];

// Minimum capital (ETB) by exporter type — the SINGLE source for every
// capital minimum shown in this portal. It mirrors the registration
// schema, ui/src/pages/register-exporter.tsx:58 MIN_CAPITAL_BY_EXPORTER_TYPE
// (private 15M / company 20M / individual 10M); the API itself enforces no
// numeric minimum (exporters.ts only requires the field to be numeric), so
// this map is the requirement. Do not hardcode another minimum anywhere in
// this file — use getMinCapital().
const MIN_CAPITAL_BY_EXPORTER_TYPE: Record<string, number> = {
  private: 15_000_000,
  company: 20_000_000,
  individual: 10_000_000,
};
const getMinCapital = (exporterType?: string): number =>
  MIN_CAPITAL_BY_EXPORTER_TYPE[String(exporterType || 'company').toLowerCase()] ?? 20_000_000;

const exporterSchema = yup.object({
  exporterId: yup.string().matches(/^EXP\d{7}$/, 'Invalid exporter ID format').required(),
  companyName: yup.string().min(3).max(100).required(),
  ectaLicenseNumber: yup.string().matches(/^ECTA-LIC-\d{4}-\d{3}$/, 'Invalid license format').required(),
  // Floor of the per-type minima above (individual: 10M); the per-type
  // minimum is enforced by getMinCapital() wherever the type is known.
  capitalRequirement: yup.number().min(MIN_CAPITAL_BY_EXPORTER_TYPE.individual).required('Minimum capital: 10M ETB for individual exporters (15M private, 20M company)'),
  professionalTaster: yup.string().min(3).max(50).required(),
  tasterCertificate: yup.string().required(),
  licenseExpiryDate: yup.string().required(),
});

interface ExporterApplication {
  id?: number;
  application_id: string;
  company_name: string;
  tin_number: string;
  business_license_number: string;
  registration_date?: string;
  exporter_type?: string;
  capital_requirement: string;
  professional_taster: string;
  taster_certificate: string;
  laboratory_facility: string;
  laboratory_certificate_number?: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch_name?: string;
  bank_branch_code?: string;
  comments?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  exporter_id?: string;
  ecta_license_number?: string;
  license_expiry_date?: string;
  documents?: string | any[];  // JSON string or parsed array of document metadata
}

const ECTAPortal: React.FC = () => {
  // Get user context for role-based access
  const { user } = useAuth();
  
  // ECTA Brand Colors (from the shared portal brand tokens)
  const BRAND_COLOR = getPortalBrand('ECTA').primary;  // ECTA Green
  const SECONDARY_COLOR = getPortalBrand('ECTA').secondary;  // Coffee Brown
  
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  
  // Sub-tab state for KPI filtering
  const [subTabValue, setSubTabValue] = useState(0);
  
  // Inspection filter state (for Quality Control tab). The values are the
  // states this tab actually renders (PENDING → Inspect, INSPECTED →
  // Approve/Reject, APPROVED → Issue Permit, REJECTED and PERMIT_ISSUED →
  // status chip). SCHEDULED belongs to the separate PreShipmentInspection
  // entity (inspection.go) and UNDER_REVIEW is a customs state — neither
  // ever occurs on a QualityInspection row, so they were dead filter values
  // (TEST-STATUS-MATRIX §17 #15). 'ALL' shows every row; REQUESTED is kept
  // because quality_inspections rows can carry it (quality.ts perform
  // guard accepts PENDING or REQUESTED).
  const [inspectionFilterTab, setInspectionFilterTab] = useState<'ALL' | 'PENDING' | 'REQUESTED' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'PERMIT_ISSUED'>('ALL');

  // Applications status filter (W4 #2) — the tab 0 table used to render the
  // pending page only, so a rejected application vanished from the UI once
  // decided (it still exists in allApplications, merged from the
  // pending/approved/rejected queries in loadData). Same contained/outlined
  // button pattern as inspectionFilterTab in the Quality Control tab.
  // Default 'pending' preserves the previous view.
  const [applicationFilterTab, setApplicationFilterTab] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');
  
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [allExporters, setAllExporters] = useState<Exporter[]>([]);
  const [shipments, setShipments] = useState<CoffeeShipment[]>([]);
  const [allShipments, setAllShipments] = useState<CoffeeShipment[]>([]);
  const [deliveredShipments, setDeliveredShipments] = useState<CoffeeShipment[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<any[]>([]);
  const [allInspectionRecords, setAllInspectionRecords] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [allContracts, setAllContracts] = useState<any[]>([]);
  const [applications, setApplications] = useState<ExporterApplication[]>([]);
  const [allApplications, setAllApplications] = useState<ExporterApplication[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<ExporterApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [inspectionQuery, setInspectionQuery] = useState<{ shipmentId?: string; exporterId?: string } | null>(null);
  const [queryHandled, setQueryHandled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExporter, setSelectedExporter] = useState<Exporter | null>(null);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [selectedShipmentForInspection, setSelectedShipmentForInspection] = useState<any>(null);

  // 0.9 — Quality "Inspect" form. The old handler POSTed hardcoded values
  // (inspector ECTA-01, moisture 11.2, defect 3, cupping 8/10, overall 87,
  // all lab tests PASSED) with no user input — a fabricated passing result.
  // This form collects the real values and sends exactly what the inspector
  // entered to POST /quality/inspections/:id/perform. Nothing is pre-filled
  // with a passing outcome: numeric defaults are 0 / blank and validation
  // forces the inspector to enter moisture, sample size and cupping scores.
  const CUPPING_FIELDS = [
    { key: 'fragrance', label: 'Fragrance / Aroma' },
    { key: 'flavor', label: 'Flavor' },
    { key: 'aftertaste', label: 'Aftertaste' },
    { key: 'acidity', label: 'Acidity' },
    { key: 'body', label: 'Body' },
    { key: 'balance', label: 'Balance' },
    { key: 'uniformity', label: 'Uniformity' },
    { key: 'cleanCup', label: 'Clean Cup' },
    { key: 'sweetness', label: 'Sweetness' },
    { key: 'overall', label: 'Overall' },
  ] as const;
  type CuppingKey = (typeof CUPPING_FIELDS)[number]['key'];
  const emptyInspectForm = {
    inspectorName: '',
    sampleSize: 0,
    moistureContent: 0,
    defectCount: 0,
    remarks: '',
    fragrance: 0, flavor: 0, aftertaste: 0, acidity: 0, body: 0,
    balance: 0, uniformity: 0, cleanCup: 0, sweetness: 0, overall: 0,
  };
  const [inspectDialogOpen, setInspectDialogOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<any>(null);
  const [inspectForm, setInspectForm] = useState(emptyInspectForm);
  const [inspectSubmitting, setInspectSubmitting] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ExporterApplication | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [approvalData, setApprovalData] = useState({
    exporterId: '',
    ectaLicenseNumber: '',
    licenseExpiryDate: '',
    bankName: '',
    bankAccountNumber: '',
    bankBranch: '',
    bankBranchCode: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');

  // In-flight flags for the chaincode-backed rejections (W4 #6): the
  // round-trip takes ~10–35 s, so the submit buttons show a spinner and
  // disable while the request runs. Dialog closing is unchanged — the
  // handlers still close the dialogs on success with a confirmation.
  const [rejectingApplication, setRejectingApplication] = useState(false);
  const [rejectingContract, setRejectingContract] = useState(false);
  // In-flight flag for the contract resubmission (F-1), same round-trip.
  const [resubmittingContract, setResubmittingContract] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ title: '', message: '', type: 'success' as 'success' | 'error' });
  // NOTE: no local search input here on purpose — global search lives in
  // the shared NavigationBar (GET /api/v1/search) and covers this
  // portal's contracts / shipments / applications. The old SearchBar
  // import and searchTerm state were dead (imported, never rendered;
  // state set, never read) and were removed rather than wired to a
  // second, portal-local filter.
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'EXPORTER' | 'SHIPMENT' | 'QUALITY' | 'PERMIT'>('EXPORTER');
  const [auditEntityId, setAuditEntityId] = useState<string>('');
  const [auditStats, setAuditStats] = useState({
    totalActivities: 0,
    todaysActions: 0,
    blockchainVerified: 0,
    organizationsInvolved: 0,
  });
  
  // Document Validation Dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  
  // Contract Approval State
  const [contractApprovalDialogOpen, setContractApprovalDialogOpen] = useState(false);
  const [contractDetailsDialogOpen, setContractDetailsDialogOpen] = useState(false);
  const [contractRejectDialogOpen, setContractRejectDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractRejectionField, setContractRejectionField] = useState('');
  const [contractRejectionReason, setContractRejectionReason] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<string>(''); // '' = all, 'PENDING', 'REGISTERED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED' — DRAFT is not a contract status: nothing writes it (create writes REGISTERED; the old 'draft' column default was removed by migration 058 and chk_contracts_status excludes it)
  
  // Contract Documents State
  const [contractDocs, setContractDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ExporterFormData>({
    resolver: yupResolver(exporterSchema),
  });

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const shipmentId = params.get('shipmentId') || undefined;
    const exporterId = params.get('exporterId') || undefined;

    if (action === 'quality' && (shipmentId || exporterId)) {
      setInspectionQuery({ shipmentId, exporterId });
    }
  }, []);

  // Audit Trail is tab 8 (not 6 — 6 is Pre-shipment Inspection); the KPI
  // cards below are rendered under tabValue === 8 as well.
  useEffect(() => {
    if (tabValue === 8) {
      loadAuditStats();
    }
  }, [tabValue]);

  useEffect(() => {
    if (!queryHandled && inspectionQuery && shipments.length > 0) {
      setQueryHandled(true);
      setTabValue(4);

      if (inspectionQuery.shipmentId) {
        const targetShipment = shipments.find((shipment) => shipment.shipmentId === inspectionQuery.shipmentId);
        if (targetShipment) {
          setSelectedShipmentForInspection(targetShipment);
          setInspectionDialogOpen(true);
        }
      }
    }
  }, [inspectionQuery, queryHandled, shipments]);

  // Fetch contract documents when details or approval dialog opens
  useEffect(() => {
    const fetchContractDocuments = async () => {
      if ((contractDetailsDialogOpen || contractApprovalDialogOpen) && selectedContract) {
        setDocsLoading(true);
        try {
          const contractId = selectedContract.contractID || selectedContract.contractId;
          
          // Fetch documents using the correct endpoint
          const response = await apiFetch(`/documents/entity/CONTRACT/${contractId}`, {
            headers: getAuthHeaders()
          });
          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            // Map the documents to the expected format
            let docs = result.data.map((doc: any) => ({
              document_id: doc.document_id,
              documentId: doc.document_id,
              id: doc.document_id,
              file_name: doc.file_name,
              filename: doc.file_name,
              name: doc.file_name,
              document_type: doc.document_type,
              type: doc.document_type,
              mime_type: doc.mime_type,
              mimeType: doc.mime_type,
              file_size: doc.file_size,
              size: doc.file_size,
              uploaded_at: doc.uploaded_at,
              uploadedAt: doc.uploaded_at,
              uploadedDate: doc.uploaded_at,
              uploaded_by: doc.uploaded_by,
              uploadedBy: doc.uploaded_by,
              status: doc.status || 'active'
            }));
            
            // 🎯 ROLE-BASED DOCUMENT FILTERING
            const userRole = user?.role || '';
            const username = user?.username || '';
            
            // ECTA_SUPERVISOR: Only show ECTA quality documents (not CONTRACT_SIGNED)
            // They sign AFTER inspector, so they only need to see the 3 ECTA docs
            if (username === 'ecta_supervisor') {
              docs = docs.filter((doc: any) => 
                doc.document_type === 'QUALITY_CERTIFICATE' ||
                doc.document_type === 'CERTIFICATE_OF_ORIGIN' ||
                doc.document_type === 'EXPORT_PERMIT'
              );
              console.log(`[ECTA] 👔 Supervisor filtered to ${docs.length} ECTA quality documents (removed CONTRACT_SIGNED)`);
            }
            // ECTA_INSPECTOR: Show all documents for initial inspection/signature
            else if (username === 'ecta_inspector') {
              console.log(`[ECTA] 🔍 Inspector sees all ${docs.length} documents for initial inspection`);
            }
            // ADMIN or other ECTA users: Show all documents
            else {
              console.log(`[ECTA] 👤 ${username} (${userRole}) sees all ${docs.length} documents`);
            }
            
            setContractDocs(docs);
            console.log('[ECTA] Fetched', docs.length, 'documents for contract', contractId);
          } else {
            console.error('[ECTA] Failed to fetch documents:', result.error);
            setContractDocs([]);
          }
        } catch (err) {
          console.error('[ECTA] Error fetching contract documents:', err);
          setContractDocs([]);
        } finally {
          setDocsLoading(false);
        }
      } else if (!contractDetailsDialogOpen && !contractApprovalDialogOpen) {
        setContractDocs([]);
        setDocsLoading(false);
      }
    };
    
    fetchContractDocuments();
  }, [contractDetailsDialogOpen, contractApprovalDialogOpen, selectedContract]);

  // Helper function to view document with proper authentication
  const handleViewDocument = (documentId: string) => {
    try {
      viewDocument(documentId);
    } catch (error: any) {
      console.error('[ECTA] Error viewing document:', error);
      showError('View Failed', 'Failed to view document', error.message);
    }
  };

  // Pagination Helper Functions
  const getPaginatedData = (data: any[]) => {
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const handleChangePage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
  };

  const resetPagination = () => {
    setCurrentPage(0);
  };

  // Define role-based tab access
  // Super Admin sees everything, specific roles see only their tabs
  const getRoleBasedTabs = () => {
    const userRole = user?.role || '';
    const isSuperAdmin = userRole === 'ADMIN';
    
    // Define all available tabs
    const allTabs = [
      { index: 0, label: `Pending Applications`, icon: <Assignment sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer'] },
      { index: 1, label: `Approved Exporters`, icon: <Coffee sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer'] },
      { index: 2, label: `Sales Contracts`, icon: <Description sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Permit Officer', 'ECTA_SUPERVISOR', 'ECTA_INSPECTOR'] },
      { index: 3, label: `Quality Control`, icon: <Science sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'Quality Inspector', 'Lab Analyst', 'ECTA Officer', 'ECTA_SUPERVISOR', 'ECTA_INSPECTOR'] },
      { index: 4, label: `License Renewals`, icon: <Warning sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer'] },
      { index: 5, label: 'Analytics', icon: <Assessment sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer'] },
      { index: 6, label: 'Pre-shipment Inspection', icon: <Science sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'Quality Inspector', 'Lab Analyst', 'ECTA Officer', 'ECTA_SUPERVISOR', 'ECTA_INSPECTOR'] },
      { index: 7, label: 'User Management', icon: <Person sx={{ fontSize: 20 }} />, roles: ['ADMIN', 'ECTA', 'ECTA Portal Administrator'] },
      { index: 8, label: 'Audit Trail', icon: <Assessment sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer', 'Quality Inspector', 'Lab Analyst', 'Permit Officer', 'ECTA_SUPERVISOR', 'ECTA_INSPECTOR'] },
      { index: 9, label: 'Post-Delivery Audits', icon: <CheckCircle sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer'] },
      { index: 10, label: 'Phytosanitary Certificates', icon: <Science sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'Quality Inspector', 'Lab Analyst', 'ECTA Officer', 'ECTA_SUPERVISOR', 'ECTA_INSPECTOR'] },
    ];
    
    // Super Admin sees all tabs
    if (isSuperAdmin) {
      return allTabs;
    }
    
    // Filter tabs based on user role
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

  // 🎯 ROLE-BASED FILTERING: Show only items that need user's action
  const filterContractsForRole = (contracts: any[]) => {
    const userRole = user?.role || '';
    const username = user?.username || '';
    
    console.log(`[ECTA] 🎯 Filtering contracts for role: ${userRole}, user: ${username}`);
    console.log(`[ECTA] 📊 Input contracts:`, contracts.map(c => ({
      id: c.contractId || c.contractID,
      status: c.status,
      contractStatus: c.contractStatus
    })));
    
    // ECTA_SUPERVISOR: Only show contracts with inspector-signed documents (waiting for supervisor)
    if (userRole === 'ECTA_SUPERVISOR' || username.includes('supervisor')) {
      // For now, show REGISTERED contracts (those needing signatures)
      const supervisorContracts = contracts.filter(c => 
        c.contractStatus === 'REGISTERED' || c.status === 'REGISTERED'
      );
      console.log(`[ECTA] 👔 Supervisor sees ${supervisorContracts.length} contracts needing signature`);
      return supervisorContracts;
    }
    
    // ECTA_INSPECTOR: Only show contracts needing initial inspection/signature
    if (userRole === 'ECTA_INSPECTOR' || username.includes('inspector')) {
      const inspectorContracts = contracts.filter(c => 
        c.contractStatus === 'REGISTERED' || c.status === 'REGISTERED'
      );
      console.log(`[ECTA] 🔍 Inspector sees ${inspectorContracts.length} contracts needing inspection`);
      return inspectorContracts;
    }
    
    // ADMIN/ECTA: See all contracts
    console.log(`[ECTA] 👤 ${userRole} sees all ${contracts.length} contracts`);
    return contracts;
  };

  // Merge one status page of applications into allApplications, deduped by
  // application_id. loadData fires the pending/approved/rejected queries in
  // parallel, so a plain setAllApplications(rows) from whichever resolves
  // last would drop the other statuses — which is why the Approved/Rejected
  // KPI cards were always 0 (only the pending page was ever loaded).
  const mergeApplications = (rows: ExporterApplication[]) => {
    if (!Array.isArray(rows)) return;
    setAllApplications((prev) => {
      const seen = new Set(prev.map((a) => a.application_id));
      const fresh = rows.filter((a) => a.application_id && !seen.has(a.application_id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  const loadData = async () => {
    console.log('[ECTA] ⚡ Starting PARALLEL data loading (zero waits)...');
    console.time('[ECTA] Total load time');
    
    // ⚡ PARALLEL LOADING - NO WAITS!
    // All requests fire simultaneously, data appears as each completes
    // UI never blocks, shows data progressively
    
    // Immediately hide initial loading spinner
    setTimeout(() => setLoading(false), 100);
    
    // 1️⃣ Pending Applications - Load independently
    api.get('/exporters/exporter-applications?status=pending')
      .then(applicationsRes => {
        const appsData = applicationsRes.data?.data?.applications || applicationsRes.data?.data;
        if (appsData && Array.isArray(appsData)) {
          console.log(`[ECTA] ✅ Pending applications loaded: ${appsData.length} items (${performance.now().toFixed(0)}ms)`);
          setApplications(appsData);
          mergeApplications(appsData);
        } else {
          console.warn('[ECTA] ⚠️ Pending applications response has no valid data');
          setApplications([]);
        }
      })
      .catch(err => {
        console.error('[ECTA] ❌ Failed to load pending applications:', err.message);
        setApplications([]);
      });

    // 1b️⃣ Rejected Applications — needed for the Rejected KPI card and the
    // Total count (allApplications must cover every status, not pending only)
    api.get('/exporters/exporter-applications?status=rejected')
      .then(rejectedApplicationsRes => {
        const rejectedAppsData = rejectedApplicationsRes.data?.data?.applications || rejectedApplicationsRes.data?.data;
        if (rejectedAppsData && Array.isArray(rejectedAppsData)) {
          mergeApplications(rejectedAppsData);
        }
      })
      .catch(err => {
        console.error('[ECTA] ❌ Failed to load rejected applications:', err.message);
      });
    
    // 2️⃣ Approved Applications - Load independently
    api.get('/exporters/exporter-applications?status=approved')
      .then(approvedApplicationsRes => {
        const approvedAppsData = approvedApplicationsRes.data?.data?.applications || approvedApplicationsRes.data?.data;
        if (approvedAppsData && Array.isArray(approvedAppsData)) {
          console.log(`[ECTA] ✅ Approved applications loaded: ${approvedAppsData.length} items (${performance.now().toFixed(0)}ms)`);
          setApprovedApplications(approvedAppsData);
          mergeApplications(approvedAppsData);
        } else {
          setApprovedApplications([]);
        }
      })
      .catch(err => {
        console.error('[ECTA] ❌ Failed to load approved applications:', err.message);
        setApprovedApplications([]);
      });
    
    // 3️⃣ Contracts - Load independently with role-based filtering
    api.getContracts()
      .then(contractsRes => {
        if (contractsRes.success && contractsRes.data) {
          console.log(`[ECTA] ✅ Contracts loaded: ${contractsRes.data.length} items (${performance.now().toFixed(0)}ms)`);
          
          // 🎯 Filter contracts based on user role
          const filteredContracts = filterContractsForRole(contractsRes.data);
          
          setAllContracts(contractsRes.data); // Keep all for reference
          setContracts(filteredContracts); // Show only relevant ones
          
          console.log(`[ECTA] 🎯 Displaying ${filteredContracts.length} contracts after role filtering`);
          console.log(`[ECTA] 📊 Contract status breakdown:`, {
            all: contractsRes.data.length,
            filtered: filteredContracts.length,
            pending: contractsRes.data.filter((c: any) => c.contractStatus === 'PENDING' || c.status === 'PENDING').length,
            approved: contractsRes.data.filter((c: any) => c.contractStatus === 'APPROVED' || c.status === 'APPROVED').length,
            rejected: contractsRes.data.filter((c: any) => c.contractStatus === 'REJECTED' || c.status === 'REJECTED').length,
            registered: contractsRes.data.filter((c: any) => c.contractStatus === 'REGISTERED' || c.status === 'REGISTERED').length
          });
        } else {
          console.warn('[ECTA] ⚠️ Contracts response has no data');
          setContracts([]);
          setAllContracts([]);
        }
      })
      .catch(err => {
        console.warn('[ECTA] ⚠️ Failed to load contracts:', err.message);
        setContracts([]);
        setAllContracts([]);
      });
    
    // 4️⃣ Blockchain Exporters - Load independently
    api.getExporters()
      .then(exportersRes => {
        if (exportersRes.success) {
          console.log(`[ECTA] ✅ Blockchain exporters loaded: ${exportersRes.data?.length || 0} items (${performance.now().toFixed(0)}ms)`);
          setExporters(exportersRes.data || []);
          setAllExporters(exportersRes.data || []);
        }
      })
      .catch(err => {
        console.warn('[ECTA] ⚠️ Failed to load blockchain exporters:', err.message);
      });
    
    // 5️⃣ Shipments - Load independently
    api.getShipments()
      .then(shipmentsRes => {
        if (shipmentsRes.success && shipmentsRes.data) {
          const ectaRelevantShipments = shipmentsRes.data.filter((s: any) => {
            const status = s.Status || s.status || s.shipmentStatus || '';
            return status === 'CREATED' ||
                   status === 'INSPECTION_PENDING' ||
                   status === 'INSPECTED';
          });
          
          const delivered = shipmentsRes.data.filter((s: any) => {
            const status = s.Status || s.status || s.shipmentStatus || '';
            // COMPLETED is never a shipments.status — delivered is DELIVERED only.
            return status === 'DELIVERED';
          });
          
          console.log(`[ECTA] ✅ Shipments loaded: ${ectaRelevantShipments.length} ECTA-relevant, ${delivered.length} delivered (${performance.now().toFixed(0)}ms)`);
          setShipments(ectaRelevantShipments);
          setAllShipments(ectaRelevantShipments);
          setDeliveredShipments(delivered);
        }
      })
      .catch(err => {
        console.warn('[ECTA] ⚠️ Failed to load shipments:', err.message);
      });
    
    // 6️⃣ Quality Inspections - Load independently
    api.get('/quality/inspections?limit=500')
      .then(inspectionsRes => {
        // API returns { success: true, data: inspections[], count: number }
        const inspectionData = inspectionsRes.data?.data;
        if (inspectionData && Array.isArray(inspectionData)) {
          console.log(`[ECTA] ✅ Inspections loaded: ${inspectionData.length} items (${performance.now().toFixed(0)}ms)`);
          setInspectionRecords(inspectionData);
          setAllInspectionRecords(inspectionData);
        } else {
          setInspectionRecords([]);
          setAllInspectionRecords([]);
        }
      })
      .catch(err => {
        console.warn('[ECTA] ⚠️ Failed to load inspections:', err.message);
        setInspectionRecords([]);
        setAllInspectionRecords([]);
      });
    
    console.log('[ECTA] ⚡ All 6 parallel requests fired! Data will appear as each completes.');
    console.timeEnd('[ECTA] Total load time');
  };

  const loadAuditStats = async () => {
    try {
      const response = await apiFetch('/audit/portal/recent?limit=1000', {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const logs = data.data.logs || [];
        
        const totalActivities = logs.length;
        const todaysActions = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return logDate >= oneDayAgo;
        }).length;
        const blockchainVerified = logs.filter((log: any) => log.metadata?.blockchainVerified === true).length;
        const organizationsInvolved = new Set(
          logs.map((log: any) => log.performed_by_org).filter(Boolean)
        ).size;
        
        setAuditStats({
          totalActivities,
          todaysActions,
          blockchainVerified,
          organizationsInvolved,
        });
      }
    } catch (error) {
      console.error('[ECTA] Failed to load audit stats:', error);
    }
  };

  // View a document URL (e.g. `/api/v1/documents/:id/download`) through the
  // API with the JWT attached (apiFetch resolves against API_BASE_URL and
  // sends the Authorization header). The old code did
  // window.open('http://localhost:3001' + url) — no token (the download
  // route requires auth) and a hardcoded host that breaks on any
  // non-localhost deployment. (The existing handleViewDocument below covers
  // bare document IDs via the viewDocument helper; this one covers full
  // API paths, which that helper does not handle.)
  const handleViewDocumentUrl = async (url?: string) => {
    if (!url) return;
    try {
      const response = await apiFetch(url);
      if (!response.ok) {
        showError('View Failed', `Could not open document (HTTP ${response.status})`);
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      // Revoke after the new tab has had a chance to load it.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error: any) {
      showError('View Failed', error?.message || 'Could not open document');
    }
  };

  const handleCreateExporter = async (data: ExporterFormData) => {
    try {
      const response = await api.createExporter(data);
      if (response.success) {
        setDialogOpen(false);
        reset();
        loadData();
      }
    } catch (error) {
      console.error('Failed to create exporter:', error);
    }
  };

  const handleUpdateLaboratory = async (exporterId: string, certified: boolean) => {
    try {
      const response = await api.updateExporterLaboratory(exporterId, certified);
      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to update laboratory status:', error);
    }
  };

  const handleSuspendLicense = async (exporterId: string, currentStatus: string) => {
    const action = currentStatus === 'SUSPENDED' ? 'activate' : 'suspend';
    const confirmMessage = action === 'suspend' 
      ? 'Are you sure you want to suspend this exporter\'s license? They will not be able to create contracts or shipments.'
      : 'Are you sure you want to activate this exporter\'s license?';
    
    if (!confirm(confirmMessage)) return;

    const reason = action === 'suspend' ? prompt(`Enter a reason for suspending license ${exporterId}:`) : undefined;
    if (action === 'suspend' && !reason?.trim()) return;

    try {
      const newStatus = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
      const response = await api.put(`/exporters/${exporterId}/status`, { status: newStatus, reason });
      
      if (response.data?.success) {
        setNotificationContent({
          title: action === 'suspend' ? '⚠️ License Suspended' : '✅ License Activated',
          message: `Exporter ${exporterId} license has been ${action === 'suspend' ? 'suspended' : 'activated'}.
          
${action === 'suspend' ? 
  'The exporter can no longer:\n• Create new sales contracts\n• Register shipments\n• Export coffee\n\nThey must contact ECTA to resolve any compliance issues.' :
  'The exporter can now:\n• Create sales contracts\n• Register shipments\n• Resume coffee exports'
}`,
          type: 'success'
        });
        setNotificationDialogOpen(true);
        loadData();
      }
    } catch (error) {
      console.error('Failed to update license status:', error);
      showError('Update Failed', 'Failed to update license status', 'Please try again or contact support');
    }
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication) return;
    
    try {
      // ✅ Blockchain operations need more time - increase timeout to 120 seconds
      const response = await api.post(
        `/exporters/exporter-applications/${selectedApplication.application_id}/approve`,
        {
          ...approvalData,
          bankName: approvalData.bankName,
          bankAccountNumber: approvalData.bankAccountNumber,
          bankBranch: approvalData.bankBranch,
          bankBranchCode: approvalData.bankBranchCode,
        },
        {
          timeout: 120000, // 120 seconds for blockchain registration
        }
      );
      
      if (response.data?.success) {
        setApproveDialogOpen(false);
        
        // Show detailed notification
        setNotificationContent({
          title: '✅ Application Approved Successfully!',
          message: `Exporter: ${selectedApplication.company_name}
Exporter ID: ${approvalData.exporterId}
License Number: ${approvalData.ectaLicenseNumber}
Email: ${selectedApplication.email}

🏦 Banking Details:
• Bank: ${approvalData.bankName}
• Branch: ${approvalData.bankBranch}
• Branch Code: ${approvalData.bankBranchCode}
• LC Processing: This branch will approve Letters of Credit

📧 Email Notification Sent

Next Steps for Exporter:
1. Check email for approval notification with login credentials
2. Login at: http://localhost:3000/login
   • Username: ${approvalData.exporterId}
   • Initial Password: (sent via email)
3. Access Exporter Portal to:
   • View license details and expiry date
   • Create sales contracts with buyers
   • Manage coffee shipments
   • Track exports and compliance
   • Generate export documentation

4. For LC Processing:
   • Contact ${approvalData.bankBranch}
   • All Letters of Credit will be processed through this branch
   • Branch Code: ${approvalData.bankBranchCode}

The exporter account is now active and can start using the system.`,
          type: 'success'
        });
        setNotificationDialogOpen(true);
        
        setSelectedApplication(null);
        setApprovalData({
          exporterId: '',
          ectaLicenseNumber: '',
          licenseExpiryDate: '',
          bankName: '',
          bankAccountNumber: '',
          bankBranch: '',
          bankBranchCode: '',
        });
        loadData();
      }
    } catch (error: any) {
      console.error('Failed to approve application:', error);
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
      
      setNotificationContent({
        title: '❌ Approval Failed',
        message: `Failed to approve the application.

Error: ${errorMessage}

This may be due to:
• Blockchain endorsement policy requirements
• Network connectivity issues
• Chaincode configuration

Please check:
1. All required Fabric peers are running
2. Chaincode container is healthy
3. Network configuration is correct

Contact system administrator if the issue persists.`,
        type: 'error'
      });
      setNotificationDialogOpen(true);
    }
  };

  const handleViewApplicationDetails = async (application: ExporterApplication) => {
    setSelectedApplication(application);
    
    // Fetch real documents for this exporter application
    const token = localStorage.getItem('authToken');
    let applicationDocuments: any[] = [];

    // Helper function to format date safely
    const formatUploadDate = (dateString: string | undefined): string => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        // Format as DD/MM/YYYY
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        return 'N/A';
      }
    };

    const dedupeDocuments = (docs: any[]) => {
      const seen = new Map<string, any>();

      docs.forEach((doc: any) => {
        const id = doc.id || doc.documentId || doc.fileName || doc.filename || doc.name || 'unknown-document';
        const key = `${id}-${doc.name || doc.filename || doc.fileName || ''}`;

        if (!seen.has(key)) {
          const documentId = doc.id || doc.documentId;
          seen.set(key, {
            id: documentId,
            name: doc.name || doc.filename || doc.fileName,
            type: doc.type || (doc.mimeType || 'application/pdf').split('/')[1]?.toUpperCase() || 'PDF',
            status: 'AVAILABLE',
            url: documentId ? `/api/v1/documents/${documentId}/download` : undefined,
            uploadedDate: formatUploadDate(doc.uploadedDate || doc.uploadedAt),
            size: doc.size && !isNaN(doc.size) ? `${(doc.size / 1024).toFixed(0)} KB` : (doc.file_size && !isNaN(doc.file_size) ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'N/A'),
            category: doc.category || 'APPLICATION_DOCUMENT',
          });
        }
      });

      return Array.from(seen.values());
    };
    
    if (token) {
      try {
        const response = await apiFetch(`/documents/entity/EXPORTER_APPLICATION/${application.application_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success && result.data) {
          applicationDocuments = dedupeDocuments(result.data.map((doc: any) => ({
            id: doc.document_id || doc.documentId || doc.id,
            name: doc.file_name || doc.filename || doc.name || 'Document',
            type: (doc.mime_type || doc.mimeType || 'application/pdf').split('/')[1]?.toUpperCase() || 'PDF',
            status: 'AVAILABLE',
            url: (doc.document_id || doc.documentId || doc.id) ? `/api/v1/documents/${doc.document_id || doc.documentId || doc.id}/download` : undefined,
            uploadedDate: doc.uploaded_at || doc.uploadedAt,
            size: doc.file_size || doc.size,
            file_size: doc.file_size || doc.size,
            category: doc.document_type || doc.category || 'APPLICATION_DOCUMENT',
          })));
        }
      } catch (error) {
        console.error('Error fetching application documents:', error);
      }
    }
    
    // Parse documents from application if available
    if ((!applicationDocuments || applicationDocuments.length === 0) && application.documents) {
      try {
        const parsedDocs = typeof application.documents === 'string' 
          ? JSON.parse(application.documents) 
          : application.documents;
        
        if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
          applicationDocuments = dedupeDocuments(parsedDocs.map((doc: any) => {
            // Handle both string IDs and document objects
            const isString = typeof doc === 'string';
            const docId = isString ? doc : (doc.id || doc.documentId);
            
            return {
              id: docId,
              name: isString ? 'Document' : (doc.name || doc.filename || doc.fileName),
              type: isString ? 'PDF' : (doc.type || 'PDF'),
              status: 'AVAILABLE',
              url: docId ? `/api/v1/documents/${docId}/download` : undefined,
              uploadedDate: isString ? new Date().toLocaleDateString() : (doc.uploadedDate || new Date().toLocaleDateString()),
              size: isString ? 'N/A' : (doc.size || 'N/A'),
              category: isString ? 'APPLICATION_DOCUMENT' : (doc.category || 'APPLICATION_DOCUMENT'),
            };
          }));
        }
      } catch (error) {
        console.error('Error parsing application documents:', error);
      }
    }
    
    // If no documents found AND application is still pending, show required documents list
    if (applicationDocuments.length === 0 && application.status === 'pending') {
      applicationDocuments = [
        { id: '1', name: 'Business License', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '2', name: 'TIN Certificate', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '3', name: 'Professional Taster Certificate', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '4', name: 'Laboratory Facility Certificate', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '5', name: 'Bank Account Statement', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '6', name: 'Trade License', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
      ];
    }
    
    // Set validation data for view/approval mode
    setValidationData({
      entityId: application.application_id,
      entityType: 'EXPORTER APPLICATION',
      title: `Exporter Application - ${application.company_name}`,
      summary: [
        { label: 'Application ID', value: application.application_id },
        { label: 'Company Name', value: application.company_name },
        { label: 'TIN Number', value: application.tin_number },
        { label: 'Business License', value: application.business_license_number },
        { label: 'Exporter Type', value: application.exporter_type || 'PRIVATE_LIMITED' },
        { label: 'Capital Requirement', value: `${parseFloat(application.capital_requirement).toLocaleString()} ETB` },
        { label: 'Professional Taster', value: application.professional_taster },
        { label: 'Taster Certificate', value: application.taster_certificate },
        { label: 'Laboratory Facility', value: application.laboratory_facility },
        { label: 'Lab Certificate', value: application.laboratory_certificate_number || 'N/A' },
        { label: 'Contact Person', value: application.contact_person },
        { label: 'Email', value: application.email },
        { label: 'Phone', value: application.phone },
        { label: 'Address', value: `${application.address}, ${application.city}` },
        { label: 'Region', value: application.region || 'Addis Ababa' },
        { label: 'Submitted Date', value: new Date(application.submitted_at).toLocaleDateString() },
        { label: 'Status', value: application.status.toUpperCase() },
      ],
      prerequisites: [
        {
          label: 'Minimum Capital Requirement',
          status: (() => {
            const capital = parseFloat(application.capital_requirement);
            const exporterType = application.exporter_type || 'company';
            const minCapital = getMinCapital(exporterType);
            return capital >= minCapital ? 'PASSED' : 'FAILED';
          })(),
          details: (() => {
            const capital = parseFloat(application.capital_requirement);
            const exporterType = application.exporter_type || 'company';
            const minCapital = getMinCapital(exporterType);
            const minCapitalStr = (minCapital / 1000000).toFixed(0) + 'M';
            return capital >= minCapital 
              ? `Capital ${capital.toLocaleString()} ETB meets ${minCapitalStr} ETB requirement for ${exporterType} exporter` 
              : `Capital ${capital.toLocaleString()} ETB is below ${minCapitalStr} ETB requirement for ${exporterType} exporter`;
          })()
        },
        {
          label: 'Professional Taster Certification',
          status: application.taster_certificate ? 'PASSED' : 'FAILED',
          details: application.taster_certificate 
            ? `Certified taster: ${application.professional_taster} (${application.taster_certificate})` 
            : 'No taster certification provided'
        },
        {
          label: 'Laboratory Facility',
          status: application.laboratory_facility ? 'PASSED' : 'WARNING',
          details: application.laboratory_facility || 'No laboratory facility information'
        },
        {
          label: 'Business Registration',
          status: application.business_license_number && application.tin_number ? 'PASSED' : 'FAILED',
          details: application.business_license_number && application.tin_number 
            ? `Business License: ${application.business_license_number}, TIN: ${application.tin_number}` 
            : 'Incomplete business registration'
        },
        {
          label: 'Contact Information',
          status: application.email && application.phone ? 'PASSED' : 'WARNING',
          details: `Email: ${application.email}, Phone: ${application.phone}`
        },
        {
          label: 'Documents Submitted',
          status: applicationDocuments.some(d => d.status === 'AVAILABLE') ? 'PASSED' : 'WARNING',
          details: `${applicationDocuments.filter(d => d.status === 'AVAILABLE').length} of ${applicationDocuments.length} documents available`
        },
      ],
      documents: applicationDocuments,
      complianceChecks: [
        {
          label: 'ECTA Export License Requirements',
          status: 'COMPLIANT',
          details: 'Meets Ethiopian Coffee and Tea Authority licensing requirements'
        },
        {
          label: 'Capital Adequacy',
          status: (() => {
            const capital = parseFloat(application.capital_requirement);
            const exporterType = application.exporter_type || 'company';
            const minCapital = getMinCapital(exporterType);
            return capital >= minCapital ? 'COMPLIANT' : 'NON_COMPLIANT';
          })(),
          details: (() => {
            const capital = parseFloat(application.capital_requirement);
            const exporterType = application.exporter_type || 'company';
            const minCapital = getMinCapital(exporterType);
            const minCapitalStr = (minCapital / 1000000).toFixed(0) + ' million';
            return capital >= minCapital 
              ? `Meets minimum capital requirement of ${minCapitalStr} ETB for ${exporterType} exporter (ECTA Directive 1106/2025)` 
              : `Does not meet minimum capital requirement of ${minCapitalStr} ETB for ${exporterType} exporter`;
          })()
        },
        {
          label: 'Quality Standards Compliance',
          status: 'COMPLIANT',
          details: 'Professional taster and laboratory facility certified for coffee quality assessment'
        },
        {
          label: 'Business Legitimacy',
          status: 'COMPLIANT',
          details: 'Valid business license and TIN registration verified'
        },
      ],
      additionalInfo: application.status === 'pending' 
        ? 'This application is pending ECTA approval. Please review all submitted documents carefully to verify their originality and completeness before approving.' 
        : application.status === 'approved' 
        ? 'This application has been approved. The exporter is registered and can start export operations.' 
        : 'This application has been rejected. Review rejection reason and exporter can reapply after addressing issues.'
    });
    setValidationDialogOpen(true);
  };

  const handleRejectApplication = async () => {
    if (!selectedApplication || !rejectionReason) return;

    setRejectingApplication(true);
    try {
      const response = await api.post(
        `/exporters/exporter-applications/${selectedApplication.application_id}/reject`,
        { reason: rejectionReason }
      );
      
      if (response.data?.success) {
        setRejectDialogOpen(false);
        setRejectConfirmOpen(false);
        
        // Show detailed notification
        setNotificationContent({
          title: '❌ Application Rejected',
          message: `Exporter: ${selectedApplication.company_name}
Email: ${selectedApplication.email}

📧 Rejection Notification Sent

Rejection Reason:
"${rejectionReason}"

What the Exporter Can Do Next:
1. Review the rejection reason (sent via email)
2. Address all issues mentioned in the rejection
3. Prepare required documents and certifications
4. Submit a new application at: http://localhost:3000/register-exporter

Requirements to Meet:
• Minimum capital: ${(getMinCapital(selectedApplication?.exporter_type) / 1000000).toFixed(0)},000,000 ETB for ${selectedApplication?.exporter_type || 'company'} exporters (registration requirement)
• Valid TIN (Tax Identification Number)
• Current business license
• Professional coffee taster with certification
• Laboratory facility (recommended)
• Bank account with commercial bank

The exporter can reapply once all requirements are met.`,
          type: 'error'
        });
        setNotificationDialogOpen(true);
        
        setSelectedApplication(null);
        setRejectionReason('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to reject application:', error);
      setNotificationContent({
        title: '❌ Rejection Failed',
        message: 'Failed to reject the application. Please try again or contact system administrator.',
        type: 'error'
      });
      setNotificationDialogOpen(true);
    } finally {
      setRejectingApplication(false);
    }
  };

  // Contract Approval Handler
  const handleApproveContract = async () => {
    if (!selectedContract) return;
    
    const contractId = selectedContract.contractID || selectedContract.contractId || selectedContract.contract_id;
    
    if (!contractId) {
      console.error('Contract ID missing:', selectedContract);
      showError('Approval Failed', 'Contract ID is missing. Please try again.');
      return;
    }
    
    console.log('[APPROVE] Approving contract:', contractId);
    
    try {
      const response = await api.approveContract(contractId);
      
      if (response.success) {
        setContractApprovalDialogOpen(false);
        showSuccess(
          'Contract Approved',
          `Contract ${contractId} has been approved for export compliance. Banks can now issue LC and allocate forex.`
        );
        
        // Update the contract status immediately in the UI
        setContracts(prevContracts => 
          prevContracts.map(c => 
            (c.contractId === contractId || c.contractID === contractId || c.contract_id === contractId)
              ? { ...c, contractStatus: 'APPROVED', status: 'APPROVED', Status: 'APPROVED' }
              : c
          )
        );
        
        setAllContracts(prevContracts => 
          prevContracts.map(c => 
            (c.contractId === contractId || c.contractID === contractId || c.contract_id === contractId)
              ? { ...c, contractStatus: 'APPROVED', status: 'APPROVED', Status: 'APPROVED' }
              : c
          )
        );
        
        // Refresh contracts from server (with slight delay to allow backend to complete)
        setTimeout(() => loadData(), 1500);
        setSelectedContract(null);
      } else {
        showError('Approval Failed', response.error?.message || 'Failed to approve contract');
      }
    } catch (error: any) {
      console.error('Failed to approve contract:', error);
      showError('Approval Failed', error.response?.data?.error?.message || 'Failed to approve contract');
    }
  };

  // Contract Rejection Handler
  const handleRejectContract = async () => {
    const correctionDetails = contractRejectionReason.trim();
    if (!selectedContract || !contractRejectionField || correctionDetails.length < 20) {
      showError('Rejection Failed', 'Select the affected field and describe the required correction in at least 20 characters.');
      return;
    }

    const detailedFeedback = `Field to correct: ${contractRejectionField}\nRequired change: ${correctionDetails}`;
    
    const contractId = selectedContract.contractID || selectedContract.contractId || selectedContract.contract_id;
    
    if (!contractId) {
      console.error('Contract ID missing:', selectedContract);
      showError('Rejection Failed', 'Contract ID is missing. Please try again.');
      return;
    }
    
    console.log('[REJECT] Rejecting contract:', contractId, 'Reason:', detailedFeedback);

    setRejectingContract(true);
    try {
      const response = await api.rejectContract(
        contractId,
        detailedFeedback,
        'ECTA Officer'
      );
      
      if (response.success) {
        setContractRejectDialogOpen(false);
        showSuccess(
          'Contract Rejected',
          `Contract ${selectedContract.contractID || selectedContract.contractId} has been rejected. The exporter will be notified.`
        );
        
        // Refresh contracts
        loadData();
        setSelectedContract(null);
        setContractRejectionField('');
        setContractRejectionReason('');
      } else {
        showError('Rejection Failed', response.error?.message || 'Failed to reject contract');
      }
    } catch (error: any) {
      console.error('Failed to reject contract:', error);
      showError('Rejection Failed', error.response?.data?.error?.message || 'Failed to reject contract');
    } finally {
      setRejectingContract(false);
    }
  };

  // Contract Resubmission Handler (F-1): sends a REJECTED contract back for
  // review via POST /api/v1/contracts/:contractId/resubmit. The route is
  // owned by the API; this control only calls it, shows the outcome and
  // reloads. No body is sent — the route takes the contract from the URL.
  const handleResubmitContract = async () => {
    if (!selectedContract) return;

    const contractId = selectedContract.contractID || selectedContract.contractId || selectedContract.contract_id;

    if (!contractId) {
      console.error('Contract ID missing:', selectedContract);
      showError('Resubmission Failed', 'Contract ID is missing. Please try again.');
      return;
    }

    console.log('[RESUBMIT] Resubmitting contract:', contractId);

    setResubmittingContract(true);
    try {
      const response = await api.post(`/contracts/${contractId}/resubmit`);

      if (response.data?.success) {
        showSuccess(
          'Contract Resubmitted',
          `Contract ${contractId} has been resubmitted for review.`
        );
        setContractDetailsDialogOpen(false);
        setSelectedContract(null);
        loadData();
      } else {
        showError('Resubmission Failed', response.data?.error?.message || 'Failed to resubmit contract');
      }
    } catch (error: any) {
      console.error('Failed to resubmit contract:', error);
      showError('Resubmission Failed', error.response?.data?.error?.message || error.message || 'Failed to resubmit contract');
    } finally {
      setResubmittingContract(false);
    }
  };

  // ==================== QUALITY INSPECTION WORKFLOW (5 STAGES) ====================
  
  // STAGE 1: Request/Schedule Inspection (CREATED → REQUESTED)
  const handleRequestInspection = async (shipment: any) => {
    try {
      const inspectionID = `INSP${Date.now()}`;
      const response = await api.post('/quality/inspections', {
        inspectionID,
        shipmentID: shipment.shipmentId,
        contractID: shipment.contractId,
        exporterID: shipment.exporterId,
        coffeeType: shipment.grade || shipment.coffeeType || 'Arabica',
        quantity: shipment.quantity || 0,
        sampleSize: 100,
        // Route reads `requestedDate` (quality.ts) — `scheduledDate` was
        // silently dropped, so the requested date always fell back to today.
        requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      if (response.data.success) {
        showSuccess(
          'Inspection Scheduled',
          `Inspection ${inspectionID} scheduled for shipment ${shipment.shipmentId}`,
          'ECTA inspector will perform physical inspection within 2 working days'
        );
        loadData();
      } else {
        showError('Inspection Request Failed', response.data.error?.message || 'Failed to schedule inspection');
      }
    } catch (error: any) {
      showError('Inspection Request Failed', error.response?.data?.error?.message || error.message);
    }
  };

  // STAGE 2: Perform Inspection (PENDING/REQUESTED → INSPECTED) — opens the
  // real Inspect form (0.9). The submit handler below sends the entered
  // values; nothing here fabricates a result.
  const handlePerformInspection = (inspection: any) => {
    setInspectTarget(inspection);
    setInspectForm(emptyInspectForm);
    setInspectDialogOpen(true);
  };

  const handleSubmitInspectForm = async () => {
    if (!inspectTarget) return;
    const inspectionId = inspectTarget.inspection_id || inspectTarget.inspectionID || inspectTarget.InspectionID;
    const moisture = Number(inspectForm.moistureContent);
    const defects = Number(inspectForm.defectCount);
    const sampleSize = Number(inspectForm.sampleSize);
    if (!inspectForm.inspectorName.trim()) {
      showError('Validation Failed', 'Inspector name is required');
      return;
    }
    if (!(sampleSize > 0)) {
      showError('Validation Failed', 'Sample size must be greater than 0');
      return;
    }
    if (!(moisture >= 8 && moisture <= 13)) {
      showError('Validation Failed', 'Moisture content must be between 8% and 13% (chaincode ValidateMoistureContent)');
      return;
    }
    if (!(defects >= 0 && defects <= 100)) {
      showError('Validation Failed', 'Defect count must be between 0 and 100');
      return;
    }
    for (const { key, label } of CUPPING_FIELDS) {
      const v = Number(inspectForm[key]);
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        showError('Validation Failed', `${label} score must be between 0 and 100`);
        return;
      }
    }
    try {
      setInspectSubmitting(true);
      const cupping: Record<string, number> = {};
      for (const { key } of CUPPING_FIELDS) cupping[key] = Number(inspectForm[key]);
      const response = await api.post(`/quality/inspections/${inspectionId}/perform`, {
        inspectorName: inspectForm.inspectorName.trim(),
        sampleSize,
        moistureContent: moisture,
        defectCount: defects,
        ...cupping,
        remarks: inspectForm.remarks,
      });

      if (response.data.success) {
        showSuccess(
          'Inspection Completed',
          `Inspection ${inspectionId} has been performed`,
          'Quality results recorded as entered. Awaiting ECTA approval for export permit'
        );
        setInspectDialogOpen(false);
        setInspectTarget(null);
        loadData();
      } else {
        showError('Inspection Failed', response.data.error?.message || 'Failed to perform inspection');
      }
    } catch (error: any) {
      showError('Inspection Failed', error.response?.data?.error?.message || error.message);
    } finally {
      setInspectSubmitting(false);
    }
  };

  // STAGE 3: Approve Inspection (INSPECTED → APPROVED)
  const handleApproveInspection = async (inspection: any) => {
    try {
      const inspectionId = inspection.inspection_id || inspection.inspectionID || inspection.InspectionID;
      const certificateNo = `CERT${Date.now()}`;
      const response = await api.post(`/quality/inspections/${inspectionId}/approve`, {
        approvedBy: 'ECTA Quality Director',
        certificateNo,
      });
      
      if (response.data.success) {
        showSuccess(
          'Inspection Approved',
          `Quality certificate ${certificateNo} issued`,
          'Inspection approved. Ready to issue export permit'
        );
        loadData();
      } else {
        showError('Approval Failed', response.data.error?.message || 'Failed to approve inspection');
      }
    } catch (error: any) {
      showError('Approval Failed', error.response?.data?.error?.message || error.message);
    }
  };

  // STAGE 4: Issue Export Permit (APPROVED → PERMIT_ISSUED)
  const handleIssueExportPermit = async (inspection: any) => {
    try {
      const inspectionId = inspection.inspection_id || inspection.inspectionID || inspection.InspectionID;
      const shipmentId = inspection.shipment_id || inspection.shipmentID || inspection.ShipmentID;
      const exportPermitNo = `PERMIT${Date.now()}`;
      const response = await api.post(`/quality/inspections/${inspectionId}/issue-permit`, {
        exportPermitNo,
        issuedBy: 'ECTA Export Permit Office',
        autoCreateCustomsDeclaration: true, // Auto-trigger customs workflow
      });
      
      if (response.data.success) {
        // The API returns the issued permit number as data.permitNumber;
        // fall back to the pre-existing data.exportPermitNo and finally to
        // the number generated for this request.
        const issuedPermitNo = response.data?.data?.permitNumber || response.data?.data?.exportPermitNo || exportPermitNo;
        showSuccess(
          'Export Permit Issued',
          `Export Permit ${issuedPermitNo} issued for ${shipmentId}`,
          'The customs declaration is a separate next step — no customs declaration was created automatically.'
        );
        loadData();
      } else {
        showError('Permit Issuance Failed', response.data.error?.message || 'Failed to issue export permit');
      }
    } catch (error: any) {
      showError('Permit Issuance Failed', error.response?.data?.error?.message || error.message);
    }
  };

  // STAGE 5: Reject Inspection (ANY → REJECTED)
  const handleRejectInspection = async (inspection: any, rejectionReason: string) => {
    if (!rejectionReason) {
      showError('Rejection Failed', 'Please provide a reason for rejection');
      return;
    }
    
    try {
      const inspectionId = inspection.inspection_id || inspection.inspectionID || inspection.InspectionID;
      const response = await api.post(`/quality/inspections/${inspectionId}/reject`, {
        rejectedBy: 'ECTA Quality Director',
        rejectionReason,
      });
      
      if (response.data.success) {
        showSuccess(
          'Inspection Rejected',
          `Inspection ${inspectionId} has been rejected`,
          `Reason: ${rejectionReason}. Exporter must address quality issues before re-submitting`
        );
        loadData();
      } else {
        showError('Rejection Failed', response.data.error?.message || 'Failed to reject inspection');
      }
    } catch (error: any) {
      showError('Rejection Failed', error.response?.data?.error?.message || error.message);
    }
  };

  // Auto-generate exporter ID, license number, and expiry date
  const generateApprovalData = () => {
    const currentYear = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 9000000) + 1000000; // 7-digit random number
    const licenseNum = Math.floor(Math.random() * 900) + 100; // 3-digit random number
    
    // Generate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const formattedExpiry = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    setApprovalData({
      exporterId: `EXP${randomNum}`,
      ectaLicenseNumber: `ECTA-LIC-${currentYear}-${String(licenseNum).padStart(3, '0')}`,
      licenseExpiryDate: formattedExpiry,
      // Pre-populate banking info from the exporter's application
      bankName: selectedApplication?.bank_name || '',
      bankAccountNumber: selectedApplication?.bank_account_number || '',
      bankBranch: selectedApplication?.bank_branch_name || '',
      bankBranchCode: selectedApplication?.bank_branch_code || '',
    });
  };

  const getExporterStats = () => {
    // Use approved applications as the source of truth for total exporters
    // since approval creates both database record AND blockchain registration
    const total = approvedApplications.length;
    
    // Calculate lab-certified exporters from approved applications
    const active = approvedApplications.filter(app => 
      app.laboratory_facility === 'yes' || app.laboratory_facility === 'contracted'
    ).length;
    
    // Calculate expiring licenses from approved applications
    const expiringSoon = approvedApplications.filter(app => {
      if (!app.license_expiry_date) return false;
      const expiryDate = new Date(app.license_expiry_date);
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      return expiryDate <= threeMonthsFromNow;
    }).length;
    
    const pendingApplications = applications.filter(a => a.status === 'pending').length;
    const approvedCount = approvedApplications.length;

    return { total, active, expiringSoon, pendingApplications, approvedCount };
  };

  // Real licence status for an approved-exporter row (F1): the chain
  // exporter record carries licenseStatus (PENDING/ACTIVE/SUSPENDED/
  // EXPIRED/REVOKED, TEST-STATUS-MATRIX §2); the application row itself
  // has no licence-status field. Fall back to the licence expiry date.
  const getLicenseStatus = (application: ExporterApplication): 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED' => {
    const chainExporter = allExporters.find((e) => e.exporterId === application.exporter_id);
    const chainStatus = String(chainExporter?.licenseStatus || '').toUpperCase();
    if (['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'].includes(chainStatus)) {
      return chainStatus as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
    }
    if (application.license_expiry_date && new Date(application.license_expiry_date).getTime() < Date.now()) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  };

  // StatusChip rendering for a licence status: ACTIVE renders as the
  // approved (green) chip, SUSPENDED as rejected (red); EXPIRED, REVOKED
  // and PENDING render as their own chips.
  const licenseStatusChip: Record<'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED', 'approved' | 'rejected' | 'pending' | 'EXPIRED' | 'REVOKED'> = {
    ACTIVE: 'approved',
    SUSPENDED: 'rejected',
    EXPIRED: 'EXPIRED',
    REVOKED: 'REVOKED',
    PENDING: 'pending',
  };

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

  const stats = getExporterStats();

  // Tab 0 table rows for the selected application status filter (W4 #2).
  // allApplications is the merged pending+approved+rejected set (see
  // mergeApplications/loadData); the pending-only `applications` page is
  // what the table used to render, which hid decided applications.
  const filteredApplications = applicationFilterTab === 'ALL'
    ? allApplications
    : allApplications.filter((a) => a.status === applicationFilterTab);

  return (
    <PortalShell brand="ECTA" title="ECTA Portal" subtitle={'Ethiopian Coffee & Tea Authority'}>
      {/* Dynamic KPI Cards - Change based on active tab */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Tab 0: Pending Applications */}
        {tabValue === 0 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Warning />}
                label="Pending Review"
                value={allApplications.filter(a => a.status === 'pending').length}
                color="#ff9800"
                onClick={() => { setApplicationFilterTab('pending'); setCurrentPage(0); }}
                selected={applicationFilterTab === 'pending'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<CheckCircle />}
                label="Approved"
                value={allApplications.filter(a => a.status === 'approved').length}
                color="#4caf50"
                onClick={() => { setApplicationFilterTab('approved'); setCurrentPage(0); }}
                selected={applicationFilterTab === 'approved'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Cancel />}
                label="Rejected"
                value={allApplications.filter(a => a.status === 'rejected').length}
                color="#f44336"
                onClick={() => { setApplicationFilterTab('rejected'); setCurrentPage(0); }}
                selected={applicationFilterTab === 'rejected'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Assignment />}
                label="Total Applications"
                value={allApplications.length}
                color="#2196f3"
                onClick={() => { setApplicationFilterTab('ALL'); setCurrentPage(0); }}
                selected={applicationFilterTab === 'ALL'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Coffee />}
                label="Active Exporters"
                value={approvedApplications.filter(a => a.status === 'approved').length}
                color={BRAND_COLOR}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Warning />}
                label="Expiring Soon"
                value={approvedApplications.filter(a => {
                      if (!a.license_expiry_date) return false;
                      const expiryDate = new Date(a.license_expiry_date);
                      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
                }).length}
                color="#ff9800"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<ErrorOutline />}
                label="Expired Licenses"
                value={approvedApplications.filter(a => {
                      if (!a.license_expiry_date) return false;
                      const expiryDate = new Date(a.license_expiry_date);
                      return expiryDate.getTime() < Date.now();
                }).length}
                color="#f44336"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Science />}
                label="Lab Certified"
                value={approvedApplications.filter(a => a.laboratory_facility && a.laboratory_facility.toLowerCase() === 'yes').length}
                color="#9c27b0"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<HourglassEmpty />}
                label="Pending Approval"
                value={allContracts.filter(c => c.contractStatus === 'REGISTERED' || c.status === 'REGISTERED').length}
                color="#ff9800"
                onClick={() => setContractStatusFilter('REGISTERED')}
                selected={contractStatusFilter === 'REGISTERED'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<CheckCircle />}
                label="Approved"
                value={allContracts.filter(c => c.contractStatus === 'APPROVED' || c.status === 'APPROVED').length}
                color="#4caf50"
                onClick={() => setContractStatusFilter('APPROVED')}
                selected={contractStatusFilter === 'APPROVED'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Cancel />}
                label="Rejected"
                value={allContracts.filter(c => c.contractStatus === 'REJECTED' || c.status === 'REJECTED').length}
                color="#f44336"
                onClick={() => setContractStatusFilter('REJECTED')}
                selected={contractStatusFilter === 'REJECTED'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Pending />}
                label="Pending"
                value={allContracts.filter(c => c.contractStatus === 'PENDING' || c.status === 'PENDING').length}
                color="#ef6c00"
                onClick={() => setContractStatusFilter('PENDING')}
                selected={contractStatusFilter === 'PENDING'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Block />}
                label="Cancelled"
                value={allContracts.filter(c => c.contractStatus === 'CANCELLED' || c.status === 'CANCELLED').length}
                color="#616161"
                onClick={() => setContractStatusFilter('CANCELLED')}
                selected={contractStatusFilter === 'CANCELLED'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<CheckCircleOutline />}
                label="Completed"
                value={allContracts.filter(c => c.contractStatus === 'COMPLETED' || c.status === 'COMPLETED').length}
                color="#00897b"
                onClick={() => setContractStatusFilter('COMPLETED')}
                selected={contractStatusFilter === 'COMPLETED'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Description />}
                label="All Contracts"
                value={allContracts.length}
                color="#2196f3"
                onClick={() => setContractStatusFilter('')}
                selected={contractStatusFilter === ''}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Pending />}
                label="Pending Inspection"
                value={allShipments.filter(s => {
                      const status = (s.status || (s as any).Status || '').toUpperCase();
                      return status === 'CREATED' &&
                             !allInspectionRecords.some(i => (i.shipmentID || i.ShipmentID) === s.shipmentId);
                }).length}
                color="#ff9800"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Science />}
                label="In Progress"
                value={allInspectionRecords.filter(i => {
                      const status = (i.status || (i as any).Status || '').toUpperCase();
                      return status === 'INSPECTED';
                }).length}
                color="#2196f3"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<CheckCircle />}
                label="Completed"
                value={allInspectionRecords.filter(i => {
                      // COMPLETED is not a QualityInspection status
                      // (quality.go: PENDING, INSPECTED, APPROVED, REJECTED).
                      // A completed inspection is one that reached a terminal
                      // decision: APPROVED or REJECTED. INSPECTED is still
                      // in progress (see the "In Progress" card above).
                      const status = (i.status || (i as any).Status || '').toUpperCase();
                      return status === 'APPROVED' || status === 'REJECTED';
                }).length}
                color="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Assessment />}
                label="Total Inspections"
                value={allInspectionRecords.length}
                color="#9c27b0"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<Assessment />}
                label="Total Activities"
                value={auditStats.totalActivities}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<TrendingUp />}
                label="Today's Actions"
                value={auditStats.todaysActions}
                color="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<CheckCircle />}
                label="Blockchain Verified"
                value={auditStats.blockchainVerified}
                color="#9c27b0"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <PortalKpiCard
                brand="ECTA"
                icon={<People />}
                label="Organizations"
                value={auditStats.organizationsInvolved}
                color="#ff9800"
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* Main Tabs */}
      <PortalCard brand="ECTA" noPadding>
        <PortalTabBar
          brand="ECTA"
          value={tabValue}
          onChange={(e, newValue) => {
            setTabValue(newValue);
            setSubTabValue(0);
          }}
          fullWidth
          tabs={visibleTabs.map((tab) => ({
            value: tab.index,
            icon: tab.icon,
            label: 
                tab.index === 0 ? `${tab.label} (${allApplications.filter(a => a.status === 'pending').length})` :
                tab.index === 1 ? `${tab.label} (${approvedApplications.length})` :
                tab.index === 2 ? `${tab.label} (${contracts.length})` :
                tab.index === 3 ? `${tab.label} (${(() => {
                  const pendingShipments = allShipments.filter(s => {
                    const status = (s.status || (s as any).Status || '').toUpperCase();
                    return status === 'CREATED' && 
                           !allInspectionRecords.some(i => (i.shipment_id || i.shipmentID || i.ShipmentID) === s.shipmentId);
                  });
                  return pendingShipments.length + allInspectionRecords.length;
                })()})` :
                tab.index === 4 ? `${tab.label} (${approvedApplications.filter(a => {
                  if (!a.license_expiry_date) return false;
                  const expiryDate = new Date(a.license_expiry_date);
                  const threeMonthsFromNow = new Date();
                  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                  return expiryDate <= threeMonthsFromNow;
                }).length})` :
                tab.index === 5 ? tab.label :
                tab.index === 6 ? `${tab.label} (${allShipments.length})` :
                tab.index === 7 ? tab.label :
                tab.index === 8 ? `${tab.label} (${deliveredShipments.length})` :
                tab.index === 9 ? `${tab.label} (${deliveredShipments.length})` :
                tab.label
              ,
          }))}
        />
      </PortalCard>



      {/* Content Panels */}
      <Box>
        <PortalTabPanel value={tabValue} index={0}>
          {/* 🎯 ROLE-BASED DASHBOARD ALERT */}
          {(user?.role === 'ECTA_SUPERVISOR' || user?.username?.includes('supervisor')) && (
            <Alert severity="info" icon={<Assignment />} sx={{ mb: 3 }}>
              <strong>👔 Supervisor Dashboard:</strong> You see only items that need YOUR action. Contracts and documents already signed by inspectors will appear here for your approval.
            </Alert>
          )}
          
          {(user?.role === 'ECTA_INSPECTOR' || user?.username?.includes('inspector')) && (
            <Alert severity="info" icon={<Science />} sx={{ mb: 3 }}>
              <strong>🔍 Inspector Dashboard:</strong> You see only items that need YOUR initial inspection and signature. Sign documents first, then they go to supervisor.
            </Alert>
          )}
          
          <Typography variant="h6" gutterBottom>
            Exporter Applications
          </Typography>
          {/* Application status filter (W4 #2) — same contained/outlined
              button pattern as the inspection filter in Quality Control.
              Rejected applications used to vanish once decided because the
              table only ever showed the pending page. */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {([
              { value: 'ALL', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ] as const).map(({ value, label }) => (
              <Button
                key={value}
                size="small"
                variant={applicationFilterTab === value ? 'contained' : 'outlined'}
                onClick={() => { setApplicationFilterTab(value); setCurrentPage(0); }}
              >
                {label} ({value === 'ALL' ? allApplications.length : allApplications.filter((a) => a.status === value).length})
              </Button>
            ))}
          </Box>
          {filteredApplications.length === 0 ? (
            <Alert severity="info">{applicationFilterTab === 'ALL' ? 'No applications at this time.' : `No ${applicationFilterTab} applications at this time.`}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="15%">Application ID</TableCell>
                    <TableCell width="20%">Company Name</TableCell>
                    <TableCell width="15%">Contact Person</TableCell>
                    <TableCell width="18%">Email</TableCell>
                    <TableCell width="12%">Capital (ETB)</TableCell>
                    <TableCell width="10%">Submitted</TableCell>
                    <TableCell width="10%" align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(filteredApplications).map((application) => (
                    <TableRow key={application.application_id}>
                      <TableCell>{application.application_id}</TableCell>
                      <TableCell>{application.company_name}</TableCell>
                      <TableCell>{application.contact_person}</TableCell>
                      <TableCell>{application.email}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(application.capital_requirement), 'ETB')}</TableCell>
                      <TableCell>{formatDate(application.submitted_at)}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewApplicationDetails(application)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {/* Approve/Reject only render for pending rows
                            (TEST-STATUS-MATRIX §17 #16): the API rejects
                            non-pending applications, so showing the buttons
                            on every row was a dead click. The table is
                            normally fed by the ?status=pending query, but
                            the gate holds for any row that arrives here. */}
                        {application.status === 'pending' ? (
                          <>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedApplication(application);
                              generateApprovalData();
                              setApproveDialogOpen(true);
                            }}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedApplication(application);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <Warning />
                          </IconButton>
                        </Tooltip>
                          </>
                        ) : (
                          <Chip
                            label={application.status === 'approved' ? 'Approved' : 'Rejected'}
                            size="small"
                            color={application.status === 'approved' ? 'success' : 'error'}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination Controls */}
          {filteredApplications.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="black">Rows per page:</Typography>
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
                  sx={{ width: 80 }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="black">
                  Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, filteredApplications.length)} of {filteredApplications.length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage === 0}
                    onClick={() => handleChangePage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage >= Math.ceil(filteredApplications.length / rowsPerPage) - 1}
                    onClick={() => handleChangePage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Approved Coffee Exporters
          </Typography>
          {approvedApplications.length === 0 ? (
            <Alert severity="info">No approved exporters yet.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="10%">Exporter ID</TableCell>
                    <TableCell width="16%">Company Name</TableCell>
                    <TableCell width="13%">License Number</TableCell>
                    <TableCell width="10%">Exporter Type</TableCell>
                    <TableCell width="10%">Capital (ETB)</TableCell>
                    <TableCell width="9%">Lab Certified</TableCell>
                    <TableCell width="9%">Approved Date</TableCell>
                    <TableCell width="8%">Expires</TableCell>
                    <TableCell width="7%">Status</TableCell>
                    <TableCell width="8%">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(approvedApplications).map((application) => (
                    <TableRow key={application.application_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {application.exporter_id || 'Not Set'}
                        </Typography>
                      </TableCell>
                      <TableCell>{application.company_name}</TableCell>
                      <TableCell>
                        {application.ecta_license_number ? (
                          <Chip
                            label={application.ecta_license_number}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="Not Generated"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            application.exporter_type === 'private' ? 'Private' :
                            application.exporter_type === 'company' ? 'Company' :
                            application.exporter_type === 'individual' ? 'Individual' :
                            'Not Specified'
                          }
                          size="small"
                          color={application.exporter_type ? 'default' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(parseFloat(application.capital_requirement), 'ETB')}</TableCell>
                      <TableCell>
                        {application.laboratory_facility === 'yes' || application.laboratory_facility === 'contracted' ? (
                          <Chip icon={<Science />} label="Certified" size="small" color="success" />
                        ) : application.laboratory_facility === 'farmer' ? (
                          <Chip label="Exempt" size="small" color="default" />
                        ) : application.laboratory_facility === 'no' || !application.laboratory_facility ? (
                          <Chip label="Required" size="small" color="warning" />
                        ) : (
                          <Chip label="Unknown" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>{application.approved_at ? formatDate(application.approved_at) : 'N/A'}</TableCell>
                      <TableCell>{application.license_expiry_date ? formatDate(application.license_expiry_date) : 'Not Set'}</TableCell>
                      <TableCell>
                        <StatusChip
                          status={licenseStatusChip[getLicenseStatus(application)]}
                          label={getLicenseStatus(application)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={async () => {
                                // For approved exporters, show simplified read-only view
                                try {
                                  // Fetch documents for this exporter
                                  const docsResponse = await api.get(`/documents/entity/EXPORTER_APPLICATION/${application.application_id}`);
                                  const docsData = docsResponse.data?.data || [];
                                  
                                  // Helper function to format date safely
                                  const formatUploadDate = (dateString: string | undefined): string => {
                                    if (!dateString) return 'N/A';
                                    try {
                                      const date = new Date(dateString);
                                      if (isNaN(date.getTime())) return 'N/A';
                                      // Format as DD/MM/YYYY
                                      const day = String(date.getDate()).padStart(2, '0');
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const year = date.getFullYear();
                                      return `${day}/${month}/${year}`;
                                    } catch (error) {
                                      return 'N/A';
                                    }
                                  };
                                  
                                  const applicationDocuments = docsData.map((doc: any) => ({
                                    id: doc.document_id,
                                    name: doc.file_name,
                                    type: doc.mime_type?.split('/')[1]?.toUpperCase() || 'PDF',
                                    status: 'AVAILABLE',
                                    uploadedDate: formatUploadDate(doc.uploaded_at),
                                    size: doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'N/A'
                                  }));
                                  
                                  // Set simplified validation data for approved exporters (read-only)
                                  setValidationData({
                                    entityId: application.application_id,
                                    entityType: 'APPROVED EXPORTER',
                                    title: `Approved Exporter - ${application.company_name}`,
                                    summary: [
                                      { label: 'Exporter ID', value: application.exporter_id || 'Not Set' },
                                      { label: 'Company Name', value: application.company_name },
                                      { label: 'License Number', value: application.ecta_license_number || 'Not Generated' },
                                      { label: 'Email', value: application.email },
                                      { label: 'Phone', value: application.phone },
                                      { label: 'Contact Person', value: application.contact_person },
                                      { label: 'Address', value: `${application.address}, ${application.city}` },
                                      { label: 'Capital', value: `${parseFloat(application.capital_requirement).toLocaleString()} ETB` },
                                      { label: 'Approved Date', value: application.approved_at ? formatDate(application.approved_at) : 'N/A' },
                                      { label: 'License Expires', value: application.license_expiry_date ? formatDate(application.license_expiry_date) : 'Not Set' },
                                      // Real status from the on-chain exporter
                                      // record (getLicenseStatus), never a
                                      // hardcoded 'ACTIVE'.
                                      { label: 'Status', value: getLicenseStatus(application) },
                                    ],
                                    prerequisites: [],
                                    documents: applicationDocuments,
                                    complianceChecks: [],
                                    additionalInfo: 'This exporter has been approved and is actively licensed for coffee export operations.'
                                  });
                                  setValidationDialogOpen(true);
                                } catch (error) {
                                  console.error('Error fetching exporter details:', error);
                                  showError('Error', 'Failed to load exporter details');
                                }
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reset Password">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={async () => {
                                const confirmed = confirm(
                                  `🔐 RESET PASSWORD\n\n` +
                                  `Company: ${application.company_name}\n` +
                                  `Email: ${application.email}\n` +
                                  `Exporter ID: ${application.exporter_id || 'Not Set'}\n\n` +
                                  `────────────────────────────\n\n` +
                                  `A unique temporary password will be generated and shown once after the reset.\n\n` +
                                  `⚠️ IMPORTANT:\n` +
                                  `Ask the user to change the temporary password after signing in.\n\n` +
                                  `Continue with password reset?`
                                );
                                if (confirmed) {
                                  try {
                                    const exporterId = application.exporter_id;
                                    
                                    if (!exporterId) {
                                      showError('Cannot Reset Password', 'This application does not have an exporter ID assigned yet.');
                                      return;
                                    }
                                    
                                    // Use the new direct endpoint that doesn't require fetching all users
                                    const response = await api.post('/users/reset-password-by-identifier', {
                                      exporterId: exporterId,
                                      email: application.email
                                    });
                                    
                                    if (response.data?.success) {
                                      const userData = response.data.data;
                                      showSuccess(
                                        'Password Reset Successful', 
                                        `Password has been reset for ${application.company_name}.\n\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                        `📧 Email: ${userData.email}\n` +
                                        `👤 Username: ${userData.username}\n` +
                                        `🔑 Temporary Password: ${userData.temporaryPassword}\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                        `⚠️ NEXT STEPS:\n` +
                                        `1. Inform the user about the password reset\n` +
                                        `2. User logs in with username "${userData.username}"\n` +
                                        `3. Ask the user to change the temporary password after signing in\n\n` +
                                        `✅ Password reset completed successfully.`
                                      );
                                    }
                                  } catch (error: any) {
                                    const errorMsg = error?.response?.data?.error?.message || error?.message || 'Failed to reset password';
                                    showError('Password Reset Failed', errorMsg);
                                  }
                                }
                              }}
                            >
                              <Person fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Suspend License">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={async () => {
                                const reason = prompt(`Enter reason for suspending ${application.company_name}:`);
                                if (reason) {
                                  try {
                                    const response = await api.put(`/exporters/${application.exporter_id}/status`, {
                                      status: 'SUSPENDED',
                                      reason,
                                    });
                                    if (response.data?.success) {
                                      showSuccess('License Suspended', `${application.company_name} license has been suspended. They cannot access the system until reactivated.`);
                                      loadData();
                                    }
                                  } catch (error: any) {
                                    showError('Suspension Failed', error?.response?.data?.error?.message || 'Failed to suspend license');
                                  }
                                }
                              }}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Revoke License">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                const confirmed = confirm(`⚠️ PERMANENT ACTION\n\nRevoke license for ${application.company_name}?\n\nThis will:\n- Permanently disable their account\n- Prevent all system access\n- Cannot be undone\n\nAre you absolutely sure?`);
                                if (confirmed) {
                                  const reason = prompt(`Enter reason for revoking ${application.company_name} license:`);
                                  if (reason) {
                                    try {
                                      const response = await api.post(`/exporters/${application.exporter_id}/revoke`, { reason });
                                      if (response.data?.success) {
                                        if (response.data?.data?.accountDisabled) {
                                          showSuccess('License Revoked', `${application.company_name} license has been permanently revoked and the account has been disabled.`);
                                        } else {
                                          showError('License Revoked with Account Warning', response.data?.warning || 'The license was revoked on the ledger, but the local account could not be disabled.');
                                        }
                                        loadData();
                                      }
                                    } catch (error: any) {
                                      showError('Revocation Failed', error?.response?.data?.error?.message || 'Failed to revoke license');
                                    }
                                  }
                                }
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination Controls */}
          {approvedApplications.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="black">Rows per page:</Typography>
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
                  sx={{ width: 80 }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="black">
                  Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, approvedApplications.length)} of {approvedApplications.length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage === 0}
                    onClick={() => handleChangePage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage >= Math.ceil(approvedApplications.length / rowsPerPage) - 1}
                    onClick={() => handleChangePage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Sales Contracts - Export Compliance Approval
          </Typography>
          
          {allContracts.filter(c => {
            if (!contractStatusFilter) return true; // Show all when no filter
            // Check both status and contractStatus fields
            return c.contractStatus === contractStatusFilter || c.status === contractStatusFilter;
          }).length === 0 ? (
            <Alert severity="info">
              {contractStatusFilter 
                ? `No contracts with status "${contractStatusFilter}".` 
                : 'No contracts registered yet.'}
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="12%">Contract ID</TableCell>
                    <TableCell width="15%">Exporter</TableCell>
                    <TableCell width="15%">Buyer</TableCell>
                    <TableCell width="12%">Coffee Type</TableCell>
                    <TableCell width="10%">Quantity (kg)</TableCell>
                    <TableCell width="12%">Value</TableCell>
                    <TableCell width="8%">Status</TableCell>
                    <TableCell width="8%">EUDR</TableCell>
                    <TableCell width="8%" align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(allContracts
                    .filter(c => {
                      if (!contractStatusFilter) return true; // Show all when no filter
                      // Check both status and contractStatus fields
                      return c.contractStatus === contractStatusFilter || c.status === contractStatusFilter;
                    }))
                    .map((contract) => (
                    <TableRow key={contract.contractId || contract.contractID}>
                      <TableCell>{contract.contractId || contract.contractID}</TableCell>
                      <TableCell>{contract.exporterId || contract.exporterID}</TableCell>
                      <TableCell>{contract.buyerId || contract.buyerID}</TableCell>
                      <TableCell>{contract.coffeeType}</TableCell>
                      <TableCell>{contract.quantity.toLocaleString()}</TableCell>
                      <TableCell>{contract.currency} {(contract.quantity * contract.pricePerKg).toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusChip
                          status={(contract.contractStatus || contract.status || 'REGISTERED') as any}
                          label={contract.contractStatus || contract.status}
                          brandColor={BRAND_COLOR}
                        />
                      </TableCell>
                      <TableCell>
                        {contract.eudrRequired ? (
                          <Chip icon={<CheckCircle />} label="Required" size="small" color="success" />
                        ) : (
                          <Chip label="Not Required" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.contractStatus === 'REGISTERED' ? (
                          <Box display="flex" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractDetailsDialogOpen(true);
                              }}
                            >
                              Details
                            </Button>
                            <PrimaryButton
                              brand="ECTA"
                              size="small"
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractApprovalDialogOpen(true);
                              }}
                            >
                              Approve
                            </PrimaryButton>
                            <DangerButton
                              brand="ECTA"
                              size="small"
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractRejectionField('');
                                setContractRejectionReason('');
                                setContractRejectDialogOpen(true);
                              }}
                            >
                              Reject
                            </DangerButton>
                          </Box>
                        ) : contract.contractStatus === 'APPROVED' ? (
                          <Box display="flex" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractDetailsDialogOpen(true);
                              }}
                            >
                              Details
                            </Button>
                            <Chip icon={<CheckCircle />} label="Approved" size="small" color="success" />
                          </Box>
                        ) : contract.contractStatus === 'REJECTED' ? (
                          <Box display="flex" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractDetailsDialogOpen(true);
                              }}
                            >
                              Details
                            </Button>
                            <Chip icon={<Cancel />} label="Rejected" size="small" color="error" />
                          </Box>
                        ) : (
                          <Box display="flex" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractDetailsDialogOpen(true);
                              }}
                            >
                              Details
                            </Button>
                            <Chip label={contract.contractStatus} size="small" color="default" />
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination Controls */}
          {allContracts.filter(c => {
            if (!contractStatusFilter) return true;
            return c.contractStatus === contractStatusFilter || c.status === contractStatusFilter;
          }).length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="black">Rows per page:</Typography>
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
                  sx={{ width: 80 }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="black">
                  Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, contracts.filter(c => {
                    if (!contractStatusFilter) return true;
                    return c.contractStatus === contractStatusFilter || c.status === contractStatusFilter;
                  }).length)} of {contracts.filter(c => {
                    if (!contractStatusFilter) return true;
                    return c.contractStatus === contractStatusFilter || c.status === contractStatusFilter;
                  }).length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage === 0}
                    onClick={() => handleChangePage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage >= Math.ceil(allContracts.filter(c => {
                      if (!contractStatusFilter) return true;
                      return c.contractStatus === contractStatusFilter || c.status === contractStatusFilter;
                    }).length / rowsPerPage) - 1}
                    onClick={() => handleChangePage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={3}>
          {/* Quality Control Tab - Clean Table View */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science /> Quality Inspection Records
          </Typography>

          {/* Inspection status filter (F8) — filters the table below by the
              displayed inspection status. */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {(['ALL', 'PENDING', 'REQUESTED', 'INSPECTED', 'APPROVED', 'REJECTED', 'PERMIT_ISSUED'] as const).map((filter) => (
              <Button
                key={filter}
                size="small"
                variant={inspectionFilterTab === filter ? 'contained' : 'outlined'}
                onClick={() => setInspectionFilterTab(filter)}
              >
                {filter === 'ALL' ? 'All' : filter.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
              </Button>
            ))}
          </Box>

          {/* Unified Table for All Inspection Data */}
          {(() => {
            // Show all inspection data: pending shipments + all inspection records
            const getPendingShipments = () => allShipments.filter(s => {
              const status = (s.status || (s as any).Status || '').toUpperCase();
              return status === 'CREATED' &&
                     !allInspectionRecords.some(i => (i.shipment_id || i.shipmentID || i.ShipmentID) === s.shipmentId);
            });

            const dataToShow = [...getPendingShipments(), ...allInspectionRecords];
            const isPendingShipment = (item: any) => item.shipmentId && !item.inspection_id && !item.inspectionID && !item.InspectionID;

            // Displayed status of a row, using the same mapping the rows
            // render below (COMPLETED → APPROVED/REJECTED by `passed`).
            const displayedStatus = (item: any) => {
              if (isPendingShipment(item)) return 'PENDING';
              const raw = String(item.status || item.Status || 'UNKNOWN').toUpperCase();
              if (raw === 'COMPLETED') return item.passed ? 'APPROVED' : 'REJECTED';
              return raw;
            };
            const filteredData = inspectionFilterTab === 'ALL'
              ? dataToShow
              : dataToShow.filter((item) => displayedStatus(item) === inspectionFilterTab);

            return filteredData.length === 0 ? (
              <Alert severity="info">{inspectionFilterTab === 'ALL' ? 'No inspection records to display' : `No inspection records with status "${inspectionFilterTab}".`}</Alert>
            ) : (
              <>
                <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="15%">ID</TableCell>
                      <TableCell width="15%">Shipment ID</TableCell>
                      <TableCell width="12%">Exporter</TableCell>
                      <TableCell width="10%">Status</TableCell>
                      <TableCell width="10%">
                        <Tooltip title="Shows Scheduled Date for pending inspections, Inspection Date for completed">
                          <Box component="span" sx={{ borderBottom: '1px dotted', cursor: 'help' }}>
                            Date
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell width="10%">Quality Score</TableCell>
                      <TableCell width="10%">Certificate</TableCell>
                      <TableCell width="18%" align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getPaginatedData(filteredData).map((item: any, index) => {
                      const isShipment = isPendingShipment(item);
                      const itemId = isShipment ? item.shipmentId : (item.inspection_id || item.inspectionID || item.InspectionID);
                      const shipmentId = isShipment ? item.shipmentId : (item.shipment_id || item.shipmentID || item.ShipmentID);
                      const exporterId = isShipment ? item.exporterId : (item.exporter_id || item.exporterID || item.ExporterID);
                      
                      const rawStatus = isShipment ? 'PENDING' : (item.status || item.Status || 'UNKNOWN');
                      const status = (() => {
                        const normalized = String(rawStatus).toUpperCase();
                        // PENDING is a real QualityInspection state — show it
                        // as PENDING, never relabelled REQUESTED (REQUESTED
                        // belongs to the separate PreShipmentInspection
                        // entity, TEST-STATUS-MATRIX §17 #18).
                        // Map 'completed' to 'APPROVED' or 'REJECTED' based on passed field
                        if (normalized === 'COMPLETED') {
                          return item.passed ? 'APPROVED' : 'REJECTED';
                        }
                        return normalized;
                      })();
                      
                      // Professional date display based on inspection status
                      const date = (() => {
                        if (isShipment) {
                          // For pending shipments, show when created
                          return item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : 'N/A';
                        }
                        
                        // For inspections, show appropriate date based on status
                        const currentStatus = (item.status || '').toUpperCase();
                        
                        if (currentStatus === 'PENDING' || currentStatus === 'REQUESTED') {
                          // Show scheduled/requested date for pending inspections
                          const schedDate = item.requested_date || item.requestedDate || item.scheduled_date || item.scheduledDate || item.created_at || item.createdAt;
                          return schedDate ? new Date(schedDate).toLocaleDateString() : 'Not Scheduled';
                        } else if (currentStatus === 'INSPECTED') {
                          // Show inspection date for inspected (awaiting approval)
                          const inspDate = item.inspection_date || item.inspectionDate || item.created_at || item.createdAt;
                          return inspDate ? new Date(inspDate).toLocaleDateString() : 'N/A';
                        } else if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED' || currentStatus === 'COMPLETED') {
                          // Show inspection date, fall back to requested date or created date
                          const compDate = item.inspection_date || item.inspectionDate || item.approval_date || item.approvalDate || item.requested_date || item.requestedDate || item.created_at || item.createdAt;
                          return compDate ? new Date(compDate).toLocaleDateString() : 'N/A';
                        }
                        
                        // Fallback
                        const anyDate = item.inspection_date || item.inspectionDate || item.requested_date || item.requestedDate || item.created_at || item.createdAt;
                        return anyDate ? new Date(anyDate).toLocaleDateString() : 'N/A';
                      })();
                      
                      // Extract overall score from cup_quality JSON or direct field
                      const qualityScore = (() => {
                        if (isShipment) return 'Pending';
                        
                        // Try direct field first
                        if (item.overall || item.overallScore || item.overall_score) {
                          return item.overall || item.overallScore || item.overall_score;
                        }
                        
                        // Try extracting from cup_quality JSON
                        if (item.cup_quality) {
                          try {
                            const cupQuality = typeof item.cup_quality === 'string' 
                              ? JSON.parse(item.cup_quality) 
                              : item.cup_quality;
                            if (cupQuality.overall) return cupQuality.overall;
                          } catch (e) {
                            // JSON parse failed, ignore
                          }
                        }
                        
                        // If inspection is completed but no score, show grade instead
                        if (item.status === 'INSPECTED' || item.status === 'APPROVED' || item.status === 'PERMIT_ISSUED') {
                          return item.grade || 'N/A';
                        }
                        
                        return 'Pending';
                      })();
                      
                      const certificate = isShipment ? 'Pending' : (item.certification_number || item.certificateNo || item.certificate_no || 'Pending');

                      return (
                        <TableRow key={`${itemId}-${index}`}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                              {itemId}
                            </Typography>
                          </TableCell>
                          <TableCell>{shipmentId}</TableCell>
                          <TableCell>{exporterId}</TableCell>
                          <TableCell>
                            <StatusChip
                              status={
                                status === 'PENDING' ? 'pending' :
                                status === 'REQUESTED' ? 'pending' :
                                status === 'INSPECTED' ? 'warning' :
                                status === 'APPROVED' ? 'approved' :
                                status === 'REJECTED' ? 'rejected' :
                                'default'
                              }
                              label={status}
                              brandColor={BRAND_COLOR}
                            />
                          </TableCell>
                          <TableCell>{date}</TableCell>
                          <TableCell>{qualityScore}</TableCell>
                          <TableCell>{certificate}</TableCell>
                          <TableCell align="right">
                            {isShipment ? (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Assignment />}
                                sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
                                onClick={() => handleRequestInspection(item)}
                              >
                                Schedule
                              </Button>
                            ) : status === 'PENDING' || status === 'REQUESTED' ? (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Science />}
                                sx={{ bgcolor: '#2196f3', '&:hover': { bgcolor: '#1976d2' } }}
                                onClick={() => handlePerformInspection(item)}
                              >
                                Inspect
                              </Button>
                            ) : status === 'INSPECTED' ? (
                              <Box display="flex" gap={1} justifyContent="flex-end">
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<CheckCircle />}
                                  sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                                  onClick={() => handleApproveInspection(item)}
                                >
                                  Approve
                                </Button>
                                <DangerButton
                                  brand="ECTA"
                                  size="small"
                                  startIcon={<Cancel />}
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason:');
                                    if (reason) handleRejectInspection(item, reason);
                                  }}
                                >
                                  Reject
                                </DangerButton>
                              </Box>
                            ) : status === 'APPROVED' ? (
                              <PrimaryButton
                                brand="ECTA"
                                size="small"
                                startIcon={<Description />}
                                onClick={() => handleIssueExportPermit(item)}
                              >
                                Issue Permit
                              </PrimaryButton>
                            ) : status === 'REJECTED' ? (
                              <Chip label="Rejected" size="small" color="error" />
                            ) : status === 'PERMIT_ISSUED' ? (
                              <Chip label="Permit Issued" size="small" color="success" />
                            ) : (
                              <Chip label={status} size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination Controls */}
              {filteredData.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="black">Rows per page:</Typography>
                    <TextField
                      select
                      size="small"
                      value={rowsPerPage}
                      onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
                      sx={{ width: 80 }}
                    >
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </TextField>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="black">
                      Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, filteredData.length)} of {filteredData.length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={currentPage === 0}
                        onClick={() => handleChangePage(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={currentPage >= Math.ceil(filteredData.length / rowsPerPage) - 1}
                        onClick={() => handleChangePage(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </>
            );
          })()}
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={4}>
          {/* License Renewals Tab */}
          <Typography variant="h6" gutterBottom>
            License Renewals
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {stats.expiringSoon} exporters have licenses expiring within 3 months
          </Alert>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company Name</TableCell>
                  <TableCell>License Number</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Days Remaining</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getPaginatedData(exporters
                  .filter(e => {
                    const expiryDate = new Date(e.licenseExpiryDate);
                    const threeMonthsFromNow = new Date();
                    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                    return expiryDate <= threeMonthsFromNow;
                  }))
                  .map((exporter) => {
                    const daysRemaining = Math.ceil(
                      (new Date(exporter.licenseExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <TableRow key={exporter.exporterId}>
                        <TableCell>{exporter.companyName}</TableCell>
                        <TableCell>{exporter.ectaLicenseNumber}</TableCell>
                        <TableCell>{formatDate(exporter.licenseExpiryDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${daysRemaining} days`}
                            size="small"
                            color={daysRemaining < 30 ? 'error' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <AnimatedButton 
                            size="small" 
                            variant="outlined"
                            brandColor={BRAND_COLOR}
                            onClick={() => {
                              const currentExpiryDate = new Date(exporter.licenseExpiryDate);
                              const renewalBaseDate = new Date(Math.max(currentExpiryDate.getTime(), Date.now()));
                              const newExpiryDate = new Date(renewalBaseDate);
                              newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                              
                              if (window.confirm(`Process License Renewal?\n\nExporter: ${exporter.companyName}\nLicense: ${exporter.ectaLicenseNumber}\nCurrent Expiry: ${formatDate(exporter.licenseExpiryDate)}\nNew Expiry: ${formatDate(newExpiryDate.toISOString())}\n\nThis will extend the license for 1 year.`)) {
                                const reason = window.prompt(`Enter the reason for renewing ${exporter.companyName}'s license:`);
                                if (!reason?.trim()) return;
                                apiFetch(`/exporters/${exporter.exporterId}/renew-license`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    newExpiryDate: newExpiryDate.toISOString(),
                                    reason: reason.trim(),
                                  })
                                })
                                .then(res => res.json())
                                .then(result => {
                                  if (result.success) {
                                    const mirrorNotice = result.warning ? `\n\nWarning: ${result.warning}` : '';
                                    alert(`✅ License Renewed Successfully\n\nExporter: ${exporter.companyName}\nNew Expiry: ${formatDate(newExpiryDate.toISOString())}\n\nLicense extended for 1 year${mirrorNotice}`);
                                    loadData();
                                  } else {
                                    alert(`❌ Renewal Failed\n\n${result.error?.message || result.error || 'Unknown error'}`);
                                  }
                                })
                                .catch(error => {
                                  alert(`❌ Network Error\n\n${error}`);
                                });
                              }
                            }}
                          >
                            Process Renewal
                          </AnimatedButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          {(() => {
            const expiringExporters = exporters.filter(e => {
              const expiryDate = new Date(e.licenseExpiryDate);
              const threeMonthsFromNow = new Date();
              threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
              return expiryDate <= threeMonthsFromNow;
            });
            
            return expiringExporters.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="black">Rows per page:</Typography>
                  <TextField
                    select
                    size="small"
                    value={rowsPerPage}
                    onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
                    sx={{ width: 80 }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="black">
                    Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, expiringExporters.length)} of {expiringExporters.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={currentPage === 0}
                      onClick={() => handleChangePage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={currentPage >= Math.ceil(expiringExporters.length / rowsPerPage) - 1}
                      onClick={() => handleChangePage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={5}>
          {/* Analytics Tab */}
          <AnalyticsDashboard />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={6}>
          {/* Pre-shipment Inspection Tab */}
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: BRAND_COLOR, fontWeight: 700, mb: 3 }}>
              🔍 Pre-shipment Inspection Management
            </Typography>
            <InspectionRequestsTab />
          </Box>
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={7}>
          {/* User Management Tab */}
          <UserManagement />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={8}>
          {/* Audit Trail Tab */}
          <AuditTrailTable
            title="ECTA Portal - Complete Transaction History"
            autoRefresh={true}
            refreshInterval={60000}
            showStats={false}
            maxHeight={700}
          />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={9}>
          {/* Post-Delivery Audits Tab */}
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: BRAND_COLOR, fontWeight: 700 }}>
              📋 Post-Delivery Final Audits
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review and complete final audits for delivered shipments requiring ECTA sign-off.
            </Typography>
            
            {deliveredShipments.length === 0 ? (
              <Alert severity="info">
                No delivered shipments pending audit at this time.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {deliveredShipments.map((shipment: any) => {
                  const shipmentId = shipment.shipmentId || shipment.shipmentID;
                  const contractId = shipment.contractId || shipment.contractID;
                  const contract = allContracts.find(c => c.contractId === contractId || c.contractID === contractId);
                  return (
                    <Grid item xs={12} key={shipmentId}>
                      <Card sx={{ boxShadow: 3 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {shipmentId}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Contract: {contractId} | Exporter: {contract?.exporterId || 'N/A'}
                              </Typography>
                            </Box>
                            <Chip 
                              label="Delivered" 
                              color="success" 
                              icon={<CheckCircle />}
                            />
                          </Box>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <PostDeliveryWorkflowPanel
                            shipmentId={shipmentId}
                            userRole="ECTA"
                            onRefresh={() => {
                              loadData();
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </PortalTabPanel>
        <PortalTabPanel value={tabValue} index={10}>
          {/* Phytosanitary Certificates Tab — slice-6 fix: the component
              existed but was never mounted in any portal, so the phyto
              step (request → inspect → issue) had no UI path. */}
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: BRAND_COLOR, fontWeight: 700 }}>
              🌿 Phytosanitary Certificates
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Request, inspect and issue phytosanitary certificates for shipments.
            </Typography>
            <PhytosanitaryCertificates />
          </Box>
        </PortalTabPanel>
      </Box>

      {/* Register Exporter Dialog */}
      <PortalDialog brand="ECTA" title="Register New Coffee Exporter" open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md">
        <form onSubmit={handleSubmit(handleCreateExporter)}>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="exporterId"
                  control={control}
                  render={({ field }) => (
                    <PortalField
                      {...field}
                      label="Exporter ID"
                      placeholder="EXP2026001"
                      fullWidth
                      error={!!errors.exporterId}
                      helperText={errors.exporterId?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <PortalField
                      {...field}
                      label="Company Name"
                      fullWidth
                      error={!!errors.companyName}
                      helperText={errors.companyName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="ectaLicenseNumber"
                  control={control}
                  render={({ field }) => (
                    <PortalField
                      {...field}
                      label="ECTA License Number"
                      placeholder="ECTA-LIC-2026-001"
                      fullWidth
                      error={!!errors.ectaLicenseNumber}
                      helperText={errors.ectaLicenseNumber?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="capitalRequirement"
                  control={control}
                  render={({ field }) => (
                    <PortalField
                      {...field}
                      label="Capital Requirement (ETB)"
                      type="number"
                      fullWidth
                      error={!!errors.capitalRequirement}
                      helperText={errors.capitalRequirement?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="professionalTaster"
                  control={control}
                  render={({ field }) => (
                    <PortalField
                      {...field}
                      label="Professional Taster"
                      fullWidth
                      error={!!errors.professionalTaster}
                      helperText={errors.professionalTaster?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="tasterCertificate"
                  control={control}
                  render={({ field }) => (
                    <PortalField
                      {...field}
                      label="Taster Certificate"
                      fullWidth
                      error={!!errors.tasterCertificate}
                      helperText={errors.tasterCertificate?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          
          <PortalDialogActions>

            <AnimatedButton onClick={() => setDialogOpen(false)} variant="outlined">
              Cancel
            </AnimatedButton>
            <AnimatedButton 
              type="submit" 
              variant="contained"
              brandColor={BRAND_COLOR}
              secondaryColor={SECONDARY_COLOR}
            >
              Register Exporter
            </AnimatedButton>
          
          </PortalDialogActions>
        </form>
      </PortalDialog>

      {/* Application Details Dialog */}
      <PortalDialog brand="ECTA" title="Application Details" subtitle={selectedApplication ? `${selectedApplication.application_id} — ${selectedApplication.company_name}` : undefined} open={!!selectedApplication && !approveDialogOpen && !rejectDialogOpen && !approveConfirmOpen && !rejectConfirmOpen} onClose={() => setSelectedApplication(null)} maxWidth="md" contentSx={{ bgcolor: '#f8f9fa' }} actions={<>

          <GhostButton brand="ECTA" onClick={() => setSelectedApplication(null)}>
            Close
          </GhostButton>
          <DangerButton brand="ECTA" onClick={() => setRejectDialogOpen(true)}>
            Reject
          </DangerButton>
          <PrimaryButton brand="ECTA" onClick={() => setApproveConfirmOpen(true)}>
            Approve
          </PrimaryButton>
        
      </>}>

          {selectedApplication && (
            <Stack spacing={2.5}>

              {/* Company Information */}
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Box sx={{ px: 2.5, py: 1.5, borderLeft: '4px solid #9b30b7', bgcolor: alpha('#9b30b7', 0.05), display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={700} color="#9b30b7">Company Information</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Application ID</Typography><Typography variant="body2" fontWeight={600}>{selectedApplication.application_id}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Company Name</Typography><Typography variant="body2" fontWeight={600}>{selectedApplication.company_name}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">TIN Number</Typography><Typography variant="body2">{selectedApplication.tin_number}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Business License</Typography><Typography variant="body2">{selectedApplication.business_license_number}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Registration Date</Typography><Typography variant="body2">{selectedApplication.registration_date ? new Date(selectedApplication.registration_date).toLocaleDateString() : 'N/A'}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Exporter Type</Typography><Typography variant="body2">{selectedApplication.exporter_type || 'N/A'}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Capital</Typography><Typography variant="body2">{formatCurrency(parseFloat(selectedApplication.capital_requirement), 'ETB')}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Region</Typography><Typography variant="body2">{selectedApplication.region || 'N/A'}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">City</Typography><Typography variant="body2">{selectedApplication.city}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Address</Typography><Typography variant="body2">{selectedApplication.address}</Typography></Grid>
                  </Grid>
                </Box>
              </Paper>

              {/* Requirements & Certification */}
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Box sx={{ px: 2.5, py: 1.5, borderLeft: '4px solid #2e7d32', bgcolor: alpha('#2e7d32', 0.05), display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={700} color="#2e7d32">Requirements &amp; Certification</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Professional Taster</Typography><Typography variant="body2">{selectedApplication.professional_taster}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Taster Certificate</Typography><Typography variant="body2">{selectedApplication.taster_certificate}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Laboratory Facility</Typography><Typography variant="body2">{selectedApplication.laboratory_facility}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Lab Certificate Number</Typography><Typography variant="body2">{selectedApplication.laboratory_certificate_number || 'N/A'}</Typography></Grid>
                  </Grid>
                </Box>
              </Paper>

              {/* Contact Details */}
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Box sx={{ px: 2.5, py: 1.5, borderLeft: '4px solid #1565c0', bgcolor: alpha('#1565c0', 0.05), display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={700} color="#1565c0">Contact Details</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Contact Person</Typography><Typography variant="body2">{selectedApplication.contact_person}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Email</Typography><Typography variant="body2">{selectedApplication.email}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Phone</Typography><Typography variant="body2">{selectedApplication.phone}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Bank Name</Typography><Typography variant="body2">{selectedApplication.bank_name || 'N/A'}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Branch</Typography><Typography variant="body2">{selectedApplication.bank_branch_name || 'N/A'}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Account Number</Typography><Typography variant="body2">{selectedApplication.bank_account_number || 'N/A'}</Typography></Grid>
                  </Grid>
                </Box>
              </Paper>

              {/* Documents */}
              <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Box sx={{ px: 2.5, py: 1.5, borderLeft: '4px solid #00838f', bgcolor: alpha('#00838f', 0.05), display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography fontWeight={700} color="#00838f">Documents</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  {(() => {
                    const DOC_LABELS: Record<string, string> = {
                      tinDoc: 'TIN Certificate',
                      TINDOC: 'TIN Certificate',
                      businessLicenseDoc: 'Business License',
                      BUSINESSLICENSEDOC: 'Business License',
                      bankStatementDoc: 'Bank Statement',
                      BANKSTATEMENTDOC: 'Bank Statement',
                      tasterCertDoc: 'Taster Proficiency Certificate',
                      TASTERCERTDOC: 'Taster Proficiency Certificate',
                      labCertDoc: 'Lab Certificate',
                      LABCERTDOC: 'Lab Certificate',
                      historyDoc: 'Company History/References',
                      HISTORYDOC: 'Company History/References',
                    };
                    const DOC_ORDER = [
                      { key: 'TIN Certificate', color: '#9b30b7' },
                      { key: 'Business License', color: '#2e7d32' },
                      { key: 'Bank Statement', color: '#1565c0' },
                      { key: 'Taster Proficiency Certificate', color: '#e65100' },
                      { key: 'Lab Certificate', color: '#00838f' },
                      { key: 'Company History/References', color: '#6d4c41' },
                    ];

                    const docs: any[] = validationData?.documents || [];

                    const getLabelForDoc = (doc: any): string => {
                      // Try document_type / category
                      const rawType = (doc.category || doc.type || '').toUpperCase();
                      const rawName = (doc.name || '').toLowerCase();
                      if (rawType.includes('TIN') || rawName.includes('tin')) return 'TIN Certificate';
                      if (rawType.includes('LICENSE') || rawName.includes('license') || rawName.includes('business')) return 'Business License';
                      if (rawType.includes('BANK') || rawName.includes('bank') || rawName.includes('statement')) return 'Bank Statement';
                      if (rawType.includes('TASTER') || rawName.includes('taster')) return 'Taster Proficiency Certificate';
                      if (rawType.includes('LAB') || rawName.includes('lab')) return 'Lab Certificate';
                      if (rawType.includes('HISTORY') || rawName.includes('history')) return 'Company History/References';
                      return DOC_LABELS[rawType] || DOC_LABELS[doc.category] || doc.name || rawType;
                    };

                    const labeledDocs = docs.map(d => ({ ...d, friendlyLabel: getLabelForDoc(d) }));

                    return (
                      <Stack spacing={1.5}>
                        {DOC_ORDER.map(({ key: label, color }) => {
                          const match = labeledDocs.find(d => d.friendlyLabel === label);
                          return (
                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#fafafa', border: '1px solid #f0f0f0' }}>
                              <InsertDriveFile sx={{ color, fontSize: 28, flexShrink: 0 }} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700}>{label}</Typography>
                                {match && match.status === 'AVAILABLE' ? (
                                  <Typography variant="caption" color="text.secondary" noWrap>{match.name}</Typography>
                                ) : null}
                              </Box>
                              {match && match.status === 'AVAILABLE' && match.url ? (
                                <Button size="small" variant="outlined" sx={{ color, borderColor: color, fontWeight: 700, minWidth: 70 }}
                                  onClick={() => handleViewDocumentUrl(match.url)}>
                                  VIEW
                                </Button>
                              ) : (
                                <Chip label="Not uploaded" size="small" sx={{ bgcolor: '#e0e0e0', color: '#757575', fontWeight: 600 }} />
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    );
                  })()}
                </Box>
              </Paper>

            </Stack>
          )}
        
      </PortalDialog>

      {/* Approve Confirmation Dialog */}
      <PortalDialog brand="ECTA" title="Confirm Approval" open={approveConfirmOpen} onClose={() => setApproveConfirmOpen(false)} maxWidth="sm" actions={<>

          <GhostButton brand="ECTA" onClick={() => setApproveConfirmOpen(false)}>
            Cancel
          </GhostButton>
          <PrimaryButton brand="ECTA" onClick={() => { setApproveConfirmOpen(false); generateApprovalData(); setApproveDialogOpen(true); }}>
            Yes, Approve
          </PrimaryButton>
        
      </>}>

          <Typography variant="body1">
            Are you sure you want to approve <strong>{selectedApplication?.company_name}</strong>? This will register them as a licensed exporter and send login credentials to their email.
          </Typography>
        
      </PortalDialog>

      {/* Reject Confirmation Dialog */}
      <PortalDialog brand="ECTA" title="⚠️ This Cannot Be Undone" open={rejectConfirmOpen} onClose={() => setRejectConfirmOpen(false)} maxWidth="sm" actions={<>

          <GhostButton brand="ECTA" onClick={() => setRejectConfirmOpen(false)}>
            Go Back
          </GhostButton>
          <DangerButton brand="ECTA" startIcon={rejectingApplication ? <CircularProgress size={18} color="inherit" /> : <WarningAmber />} disabled={rejectingApplication} onClick={() => { setRejectConfirmOpen(false); handleRejectApplication(); }}>
            {rejectingApplication ? 'Rejecting…' : 'Yes, Reject Permanently'}
          </DangerButton>
        
      </>}>

          <Alert severity="error" sx={{ mb: 2 }}>Once rejected, this decision is final.</Alert>
          <Typography variant="body1" paragraph>
            You are about to permanently reject <strong>{selectedApplication?.company_name}</strong>'s application. This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The exporter will be notified with the rejection reason and may reapply.
          </Typography>
        
      </PortalDialog>

      {/* Approve Application Dialog */}
      <PortalDialog brand="ECTA" title="Approve Exporter Application" open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="md" actions={<>

          <AnimatedButton onClick={() => {
            setApproveDialogOpen(false);
            setApprovalData({ 
              exporterId: '', 
              ectaLicenseNumber: '', 
              licenseExpiryDate: '',
              bankName: '',
              bankAccountNumber: '',
              bankBranch: '',
              bankBranchCode: '',
            });
          }} variant="outlined">
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor="#4caf50"
            onClick={handleApproveApplication}
            disabled={
              !approvalData.exporterId || 
              !approvalData.ectaLicenseNumber || 
              !approvalData.licenseExpiryDate ||
              !approvalData.bankName ||
              !approvalData.bankBranch
            }
          >
            Approve & Register
          </AnimatedButton>
        
      </>}>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Approval Process
            </Typography>
            <Typography variant="caption" component="div">
              1. Assign Exporter ID and License Number<br />
              2. Select Primary Bank for LC Processing<br />
              3. Select Bank Branch (LC Approval Authority)
            </Typography>
          </Alert>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Exporter ID */}
            <Grid item xs={12} md={6}>
              <PortalField
                fullWidth
                required
                label="Exporter ID"
                placeholder="EXP2026001"
                value={approvalData.exporterId}
                onChange={(e) => setApprovalData({ ...approvalData, exporterId: e.target.value })}
                helperText="Format: EXP followed by 7 digits"
              />
            </Grid>
            
            {/* License Number */}
            <Grid item xs={12} md={6}>
              <PortalField
                fullWidth
                required
                label="ECTA License Number"
                placeholder="ECTA-LIC-2026-001"
                value={approvalData.ectaLicenseNumber}
                onChange={(e) => setApprovalData({ ...approvalData, ectaLicenseNumber: e.target.value })}
                helperText="Format: ECTA-LIC-YYYY-XXX"
              />
            </Grid>
            
            {/* License Expiry */}
            <Grid item xs={12} md={6}>
              <PortalField
                fullWidth
                required
                type="date"
                label="License Expiry Date"
                value={approvalData.licenseExpiryDate}
                onChange={(e) => setApprovalData({ ...approvalData, licenseExpiryDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Typically 1 year from approval date"
              />
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Banking Information for LC Processing
                </Typography>
              </Divider>
            </Grid>

            {/* Bank Name — pre-filled from exporter's application */}
            <Grid item xs={12} md={8}>
              <PortalField
                fullWidth
                required
                label="Primary Bank"
                value={approvalData.bankName}
                onChange={(e) => setApprovalData({
                  ...approvalData,
                  bankName: e.target.value,
                  bankBranch: '',
                  bankBranchCode: '',
                })}
                helperText="As submitted by the exporter — edit if needed"
                InputProps={{
                  endAdornment: selectedApplication?.bank_name && approvalData.bankName === selectedApplication.bank_name
                    ? <InputAdornment position="end"><CheckCircleOutline sx={{ color: 'success.main', fontSize: 18 }} /></InputAdornment>
                    : undefined,
                }}
              />
            </Grid>

            {/* Account Number — pre-filled from exporter's application */}
            <Grid item xs={12} md={4}>
              <PortalField
                fullWidth
                label="Account Number"
                value={approvalData.bankAccountNumber}
                onChange={(e) => setApprovalData({ ...approvalData, bankAccountNumber: e.target.value })}
                helperText="As submitted by the exporter"
              />
            </Grid>
            
            {/* Branch Selection - Cascades from Bank */}
            <Grid item xs={12}>
              <BankBranchSelect
                bankName={approvalData.bankName}
                value={approvalData.bankBranch}
                onChange={(branchName, branch) => {
                  setApprovalData({
                    ...approvalData,
                    bankBranch: branchName,
                    bankBranchCode: branch?.branchCode || '',
                  });
                }}
                label="LC Processing Branch *"
                helperText="Select the branch that will approve Letters of Credit for this exporter"
                required
                showDetails
              />
            </Grid>
          </Grid>
        
      </PortalDialog>

      {/* Reject Application Dialog */}
      <PortalDialog brand="ECTA" title="Reject Exporter Application" open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" actions={<>

          <AnimatedButton onClick={() => {
            setRejectDialogOpen(false);
            setRejectionReason('');
          }} variant="outlined" disabled={rejectingApplication}>
            Cancel
          </AnimatedButton>
          <AnimatedButton
            variant="contained"
            brandColor="#f44336"
            onClick={() => setRejectConfirmOpen(true)}
            disabled={!rejectionReason}
            loading={rejectingApplication}
          >
            Reject Application
          </AnimatedButton>
        
      </>}>

          {/* Progress feedback (W4 #6): this dialog stays open while the
              rejection writes to the blockchain (~10–35 s) — the confirm
              dialog closes on click and the success notification only
              arrives when the round-trip completes. Closing behaviour is
              unchanged: the handler still closes this dialog on success. */}
          {rejectingApplication && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Rejecting application… this writes to the blockchain and can take 10–35 seconds. Please wait — this dialog closes when the rejection is confirmed.
            </Alert>
          )}
          <Typography variant="body2" color="textSecondary" paragraph>
            Please provide a reason for rejecting this application.
          </Typography>
          <PortalField
            fullWidth
            required
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this application is being rejected..."
            sx={{ mt: 2 }}
          />
        
      </PortalDialog>

      {/* Exporter Detail Dialog */}
      <PortalDialog brand="ECTA" title="Exporter Details" open={!!selectedExporter && !qualityDialogOpen} onClose={() => setSelectedExporter(null)} maxWidth="md" actions={<>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Assignment />}
            onClick={() => {
              setAuditEntityType('EXPORTER');
              setAuditEntityId(selectedExporter?.exporterId || '');
              setShowAuditTrail(true);
            }}
            sx={{ textTransform: 'none', mr: 'auto' }}
          >
            Audit Trail
          </Button>
          <AnimatedButton onClick={() => setSelectedExporter(null)} variant="outlined">
            Close
          </AnimatedButton>
          {selectedExporter?.licenseStatus === 'ACTIVE' && (
            <AnimatedButton 
              variant="outlined"
              brandColor="#f57c00"
              onClick={async () => {
                if (!selectedExporter) return;
                
                const token = localStorage.getItem('authToken');
                if (!token) return;
                
                try {
                  console.log('[ECTA] Suspending license for:', selectedExporter.exporterId);
                  
                  const reason = prompt('Enter suspension reason:');
                  if (!reason) return;
                  
                  const response = await apiFetch(`/exporters/${selectedExporter.exporterId}/status`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      status: 'SUSPENDED',
                      reason,
                      suspendedBy: 'ECTA Officer',
                      suspensionDate: new Date().toISOString(),
                    })
                  });
                  
                  const result = await response.json();
                  if (result.success) {
                    alert(`✅ License Suspended\n\nExporter: ${selectedExporter.exporterId}\nReason: ${reason}\n\nThe exporter's license has been suspended and they cannot conduct export activities until reinstated.`);
                    setSelectedExporter(null);
                    loadData();
                  } else {
                    alert(`❌ Failed to suspend license\n\n${result.error || 'Unknown error'}`);
                  }
                } catch (error) {
                  console.error('[ECTA] Error suspending license:', error);
                  alert(`❌ Network Error\n\nFailed to suspend license: ${error}`);
                }
              }}
            >
              Suspend License
            </AnimatedButton>
          )}
        
      </>}>

          {selectedExporter && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedExporter.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Company Name</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedExporter.companyName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">License Number</Typography>
                  <Typography variant="body1">{selectedExporter.ectaLicenseNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">License Status</Typography>
                  <StatusChip status={selectedExporter.licenseStatus} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Capital Requirement</Typography>
                  <Typography variant="body1">${selectedExporter.capitalRequirement.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Laboratory Certified</Typography>
                  <Box>
                    {selectedExporter.laboratoryCertified ? (
                      <Chip label="Yes" color="success" size="small" icon={<CheckCircle />} />
                    ) : (
                      <Chip label="No" color="error" size="small" icon={<Cancel />} />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Registration Date</Typography>
                  <Typography variant="body1">{new Date(selectedExporter.createdAt).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">License Expiry</Typography>
                  <Typography variant="body1">{new Date(selectedExporter.licenseExpiryDate).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>

              {selectedExporter.licenseStatus === 'ACTIVE' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  This exporter has an active license and is authorized to export coffee.
                </Alert>
              )}
              {selectedExporter.licenseStatus === 'SUSPENDED' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This exporter's license is currently suspended. Export activities are not allowed.
                </Alert>
              )}
              {selectedExporter.licenseStatus === 'EXPIRED' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This exporter's license has expired. Please renew the license to continue export activities.
                </Alert>
              )}
            </Box>
          )}
        
      </PortalDialog>

      {/* Notification Dialog for Approval/Rejection Results */}
      <Dialog 
        open={notificationDialogOpen} 
        onClose={() => setNotificationDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: notificationContent.type === 'success' ? '#4caf50' : '#f44336', color: 'white' }}>
          {notificationContent.title}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography 
            variant="body1" 
            component="pre" 
            sx={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'inherit',
              lineHeight: 1.8 
            }}
          >
            {notificationContent.message}
          </Typography>
        </DialogContent>
        <PortalDialogActions>
          <AnimatedButton 
            variant="contained"
            brandColor={BRAND_COLOR}
            secondaryColor={SECONDARY_COLOR} 
            onClick={() => setNotificationDialogOpen(false)}
            sx={{ 
              bgcolor: notificationContent.type === 'success' ? '#4caf50' : '#f44336',
              '&:hover': {
                bgcolor: notificationContent.type === 'success' ? '#45a049' : '#da190b'
              }
            }}
          >
            Close
          </AnimatedButton>
        </PortalDialogActions>
      </Dialog>

      {/* Quality Inspect form (0.9) — real values, sent as entered. The
          grade is derived server-side from the entered scores; the UI never
          hardcodes a passing outcome. */}
      <PortalDialog brand="ECTA" title="Perform Quality Inspection" subtitle={inspectTarget ? `${inspectTarget.inspection_id || inspectTarget.inspectionID || inspectTarget.InspectionID} • Shipment ${inspectTarget.shipment_id || inspectTarget.shipmentID || inspectTarget.ShipmentID}` : undefined} open={inspectDialogOpen} onClose={() => { if (!inspectSubmitting) { setInspectDialogOpen(false); setInspectTarget(null); } }} maxWidth="md" actions={<>

          <GhostButton brand="ECTA" onClick={() => { setInspectDialogOpen(false); setInspectTarget(null); }} disabled={inspectSubmitting}>Cancel</GhostButton>
          <PrimaryButton brand="ECTA" onClick={handleSubmitInspectForm} disabled={inspectSubmitting}>
            {inspectSubmitting ? 'Submitting…' : 'Submit Inspection Results'}
          </PrimaryButton>
        
      </>}>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <PortalField fullWidth required label="Inspector Name" value={inspectForm.inspectorName}
                onChange={(e) => setInspectForm({ ...inspectForm, inspectorName: e.target.value })}
                placeholder="e.g. Alemayehu Bekele" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PortalField fullWidth required type="number" label="Sample Size (g) — must be > 0"
                value={inspectForm.sampleSize || ''}
                onChange={(e) => setInspectForm({ ...inspectForm, sampleSize: Number(e.target.value) })}
                inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PortalField fullWidth required type="number" label="Moisture Content % (8–13)"
                value={inspectForm.moistureContent || ''}
                onChange={(e) => setInspectForm({ ...inspectForm, moistureContent: Number(e.target.value) })}
                inputProps={{ min: 8, max: 13, step: 0.1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PortalField fullWidth required type="number" label="Defect Count (0–100)"
                value={inspectForm.defectCount || ''}
                onChange={(e) => setInspectForm({ ...inspectForm, defectCount: Number(e.target.value) })}
                inputProps={{ min: 0, max: 100 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Cupping Scores (0–100 each)</Typography>
            </Grid>
            {CUPPING_FIELDS.map(({ key, label }) => (
              <Grid item xs={6} sm={4} key={key}>
                <PortalField fullWidth required type="number" label={`${label} (0–100)`}
                  value={inspectForm[key] || ''}
                  onChange={(e) => setInspectForm({ ...inspectForm, [key]: Number(e.target.value) })}
                  inputProps={{ min: 0, max: 100 }} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <PortalField fullWidth multiline rows={2} label="Remarks" value={inspectForm.remarks}
                onChange={(e) => setInspectForm({ ...inspectForm, remarks: e.target.value })}
                placeholder="Inspector remarks (optional)" />
            </Grid>
          </Grid>
        
      </PortalDialog>

      {/* Quality Inspection Workflow Dialog */}
      {inspectionDialogOpen && selectedShipmentForInspection && (
        <QualityInspectionWorkflow
          shipment={selectedShipmentForInspection}
          onClose={() => {
            setInspectionDialogOpen(false);
            setSelectedShipmentForInspection(null);
          }}
          onSuccess={() => {
            // Refresh shipments list
            api.getShipments().then(res => {
              if (res.success && res.data) {
                setShipments(res.data);
              }
            });
          }}
        />
      )}

      <NotificationDialog
        open={notification.open}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />

      {/* Document Validation Dialog */}
      <DocumentValidationDialog
        open={validationDialogOpen}
        onClose={() => {
          setValidationDialogOpen(false);
          setValidationData(null);
        }}
        data={validationData}
        onApprove={(notes) => {
          // After viewing details and documents, open approve dialog
          if (selectedApplication) {
            generateApprovalData();
            setApproveDialogOpen(true);
          }
          setValidationDialogOpen(false);
        }}
        onReject={(reason) => {
          // After viewing details, open reject dialog
          if (selectedApplication) {
            setRejectionReason(reason);
            setRejectDialogOpen(true);
          }
          setValidationDialogOpen(false);
        }}
        approveLabel="Approve Application"
        rejectLabel="Reject Application"
        showRejectOption={true}
        readOnly={validationData?.entityType === 'APPROVED EXPORTER'}
      />

      {/* Audit Trail Viewer */}
      {showAuditTrail && auditEntityType && (
        <AuditTrailViewer
          open={showAuditTrail}
          entityType={auditEntityType as 'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT'}
          entityId={auditEntityId}
          onClose={() => setShowAuditTrail(false)}
        />
      )}

      {/* Contract Details Dialog */}
      <PortalDialog brand="ECTA" title="Contract Details" icon={<Description />} open={contractDetailsDialogOpen} onClose={() => setContractDetailsDialogOpen(false)} maxWidth="lg" actions={<>

          <GhostButton brand="ECTA" onClick={() => setContractDetailsDialogOpen(false)}>
            Close
          </GhostButton>
          {selectedContract?.contractStatus === 'REGISTERED' && (
            <>
              <DangerButton brand="ECTA" onClick={() => { setContractDetailsDialogOpen(false); setContractRejectionField(''); setContractRejectionReason(''); setContractRejectDialogOpen(true); }}>
                Reject Contract
              </DangerButton>
              <PrimaryButton brand="ECTA" onClick={() => { setContractDetailsDialogOpen(false); setContractApprovalDialogOpen(true); }}>
                Approve Contract
              </PrimaryButton>
            </>
          )}
          {/* Resubmit (F-1): only a REJECTED contract can be resubmitted.
              Calls POST /api/v1/contracts/:contractId/resubmit. */}
          {(selectedContract?.contractStatus === 'REJECTED' || selectedContract?.status === 'REJECTED') && (
            <PrimaryButton brand="ECTA" startIcon={resubmittingContract ? <CircularProgress size={18} color="inherit" /> : undefined} disabled={resubmittingContract} onClick={handleResubmitContract}>
              {resubmittingContract ? 'Resubmitting…' : 'Resubmit Contract'}
            </PrimaryButton>
          )}

      </>}>

          {selectedContract && (
            <Box>
              {/* Contract Information */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Contract Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Contract ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedContract.contractID || selectedContract.contractId}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip 
                        status={selectedContract.contractStatus === 'REGISTERED' ? 'pending' : selectedContract.contractStatus === 'APPROVED' ? 'approved' : 'rejected'}
                        label={selectedContract.contractStatus}
                        brandColor={BRAND_COLOR}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                    <Typography variant="body2">{new Date(selectedContract.registrationDate).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">EUDR Required</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {selectedContract.eudrRequired ? (
                        <Chip icon={<CheckCircle />} label="Yes" size="small" color="success" />
                      ) : (
                        <Chip label="No" size="small" color="default" />
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Rejection reason (W4 #1) — shown on a REJECTED contract so
                  the feedback ECTA gave is visible in Details, not only in
                  the rejection dialog. Field names come from
                  api/src/routes/contracts.ts getContracts (rejectionReason /
                  rejectionDate / rejectedBy, with chaincode/PG variants). */}
              {(selectedContract.contractStatus === 'REJECTED' || selectedContract.status === 'REJECTED') && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: '#ef9a9a', bgcolor: '#fff5f5' }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 1, color: '#c62828' }}>
                    Rejection Reason
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedContract.rejectionReason || selectedContract.RejectionReason || selectedContract.rejection_reason || 'No rejection reason was recorded for this contract.'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {`Rejected${(selectedContract.rejectedBy || selectedContract.RejectedBy || selectedContract.rejected_by) ? ` by ${selectedContract.rejectedBy || selectedContract.RejectedBy || selectedContract.rejected_by}` : ''}${(selectedContract.rejectionDate || selectedContract.RejectionDate || selectedContract.rejection_date) ? ` on ${new Date(selectedContract.rejectionDate || selectedContract.RejectionDate || selectedContract.rejection_date).toLocaleDateString()}` : ''}`}
                  </Typography>
                </Paper>
              )}

              {/* Parties Information */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Parties
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>Exporter (Seller)</Typography>
                    <Typography variant="body2"><strong>ID:</strong> {selectedContract.exporterId || selectedContract.exporterID}</Typography>
                    {(selectedContract.exporterBank || selectedContract.ExporterBank) && (
                      <Typography variant="body2"><strong>Bank:</strong> {selectedContract.exporterBank || selectedContract.ExporterBank}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>Buyer</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {selectedContract.buyerId || selectedContract.buyerID}</Typography>
                    <Typography variant="body2"><strong>Country:</strong> {selectedContract.buyerCountry}</Typography>
                    {(selectedContract.buyerBank || selectedContract.BuyerBank) && (
                      <Typography variant="body2"><strong>Bank:</strong> {selectedContract.buyerBank || selectedContract.BuyerBank}</Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              {/* Product & Pricing */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Product & Pricing
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Coffee Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedContract.coffeeType}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Quantity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedContract.quantity?.toLocaleString()} kg</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Price per Kg</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedContract.currency} {selectedContract.pricePerKg?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Total Value</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {selectedContract.currency} {(selectedContract.quantity * selectedContract.pricePerKg)?.toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Documents */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description fontSize="small" />
                  Contract Documents
                </Typography>
                {docsLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading documents...</Typography>
                ) : contractDocs.length === 0 ? (
                  <Alert severity="info">
                    No documents have been uploaded for this contract yet.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Document Type</TableCell>
                          <TableCell>Filename</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Uploaded</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contractDocs.map((doc: any) => (
                          <TableRow key={doc.document_id}>
                            <TableCell>
                              <Chip 
                                label={doc.document_type?.replace(/_/g, ' ')} 
                                size="small" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{doc.file_name || doc.filename}</TableCell>
                            <TableCell>{doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : (doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'N/A')}</TableCell>
                            <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={doc.verification_status || 'Pending'} 
                                color={doc.verification_status === 'verified' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={() => handleViewDocument(doc.document_id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>

              {/* ECTA Document Signing Panel */}
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>📋 Document Workflow:</strong> Exporters upload commercial documents (contracts, invoices, certificates). 
                    ECTA staff must create and upload official ECTA documents below after completing inspections.
                  </Typography>
                </Alert>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>ECTA Responsibility:</strong> ECTA Inspector and Supervisor must sign QUALITY_CERTIFICATE, 
                    CERTIFICATE_OF_ORIGIN, and EXPORT_PERMIT documents (Sequential: Inspector first, then Supervisor). 
                    These signatures are required before LC document examination by banks.
                  </Typography>
                </Alert>
                <DocumentManagementPanel
                  entityType="CONTRACT"
                  entityId={selectedContract.contractID || selectedContract.contractId}
                  title="ECTA Quality & Origin Documents (Must Sign)"
                  allowUpload={true}
                  allowSign={true}
                  allowedSignatureTypes={['APPROVE']}
                  defaultSignatureType="APPROVE"
                  showSignatureTracker={true}
                  requiredDocuments={[
                    'QUALITY_CERTIFICATE',
                    'CERTIFICATE_OF_ORIGIN',
                    'EXPORT_PERMIT'
                  ]}
                  onDocumentSigned={(docId, data) => {
                    console.log('ECTA document signed:', docId, data);
                    // Reload contract documents
                    loadData();
                  }}
                  onDocumentUploaded={(doc) => {
                    console.log('ECTA document uploaded:', doc);
                    loadData();
                  }}
                />
              </Paper>

              {/* Blockchain Verification Section */}
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🔐 Blockchain Verification
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Hyperledger Fabric proof:</strong> The panel below checks committed transaction status, creator and endorser signatures, and certificate trust against configured MSP CA roots. A record is labeled verified only when those checks pass.
                  </Typography>
                </Alert>
                <BlockchainSignatureVerification
                  entityType="CONTRACT"
                  entityId={selectedContract.contractID || selectedContract.contractId}
                />
              </Paper>
            </Box>
          )}
        
      </PortalDialog>

      {/* Contract Approval Dialog */}
      <PortalDialog brand="ECTA" title="Approve Contract for Export" open={contractApprovalDialogOpen} onClose={() => setContractApprovalDialogOpen(false)} maxWidth="md" actions={<>

          <GhostButton brand="ECTA" onClick={() => setContractApprovalDialogOpen(false)}>
            Cancel
          </GhostButton>
          <PrimaryButton brand="ECTA" onClick={handleApproveContract}>
            Approve Contract
          </PrimaryButton>
        
      </>}>

          {selectedContract && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>ECTA Export Compliance Approval</strong>
                <br />
                This will approve the contract for export and allow banks to issue LC. Forex is allocated separately.
              </Alert>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Contract ID:</strong> {selectedContract.contractID || selectedContract.contractId}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Exporter:</strong> {selectedContract.exporterID || selectedContract.exporterId}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Buyer:</strong> {selectedContract.buyerID || selectedContract.buyerId}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Buyer Country:</strong> {selectedContract.buyerCountry}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Coffee Type:</strong> {selectedContract.coffeeType}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Quantity:</strong> {selectedContract.quantity?.toLocaleString()} kg
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Price:</strong> {selectedContract.currency} {selectedContract.pricePerKg}/kg
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Total Value:</strong> {selectedContract.currency} {(selectedContract.quantity * selectedContract.pricePerKg).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Contract Documents Section */}
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Description fontSize="small" />
                Required Documents
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                {docsLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading documents...</Typography>
                ) : contractDocs.length === 0 ? (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    No documents uploaded for this contract. Consider requesting documents before approval.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Document Type</TableCell>
                          <TableCell>Filename</TableCell>
                          <TableCell>Uploaded</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Signature</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contractDocs.map((doc: any) => (
                          <TableRow key={doc.document_id}>
                            <TableCell>{doc.document_type?.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{doc.filename}</TableCell>
                            <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip 
                                size="small" 
                                label={doc.verification_status || 'Pending'} 
                                color={doc.verification_status === 'verified' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <SignatureStatusBadge 
                                documentId={doc.document_id}
                                size="small"
                                showDetails={true}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => handleViewDocument(doc.document_id)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Alert severity="warning">
                <Typography variant="body2">
                  By approving this contract, you confirm that:
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                  <Typography component="li" variant="body2">Export compliance requirements are met</Typography>
                  <Typography component="li" variant="body2">Quality standards are verified</Typography>
                  <Typography component="li" variant="body2">Exporter has valid license</Typography>
                  <Typography component="li" variant="body2">Minimum FOB price requirements are met</Typography>
                  <Typography component="li" variant="body2">All required documents have been reviewed</Typography>
                </Box>
              </Alert>
            </>
          )}
        
      </PortalDialog>

      {/* Contract Rejection Dialog */}
      <PortalDialog brand="ECTA" title="Reject Contract" open={contractRejectDialogOpen} onClose={() => { setContractRejectDialogOpen(false); setContractRejectionField(''); setContractRejectionReason(''); }} maxWidth="sm" actions={<>

          <GhostButton brand="ECTA" disabled={rejectingContract} onClick={() => { setContractRejectDialogOpen(false); setContractRejectionField(''); setContractRejectionReason(''); }}>
            Cancel
          </GhostButton>
          <DangerButton brand="ECTA" onClick={handleRejectContract} disabled={rejectingContract || !contractRejectionField || contractRejectionReason.trim().length < 20} startIcon={rejectingContract ? <CircularProgress size={18} color="inherit" /> : undefined}>
            {rejectingContract ? 'Rejecting…' : 'Reject Contract'}
          </DangerButton>
        
      </>}>

          {selectedContract && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Give the exporter a precise correction.</strong>
                <br />
                The exporter sees this feedback on the rejected contract. Name the field and state the exact change required.
              </Alert>
              {/* Progress feedback (W4 #6): this dialog stays open while the
                  rejection writes to the blockchain (~10–35 s). Closing
                  behaviour is unchanged: the handler still closes this
                  dialog on success with a confirmation. */}
              {rejectingContract && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Rejecting contract… this writes to the blockchain and can take 10–35 seconds. Please wait — this dialog closes when the rejection is confirmed.
                </Alert>
              )}
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Contract ID:</strong> {selectedContract.contractID || selectedContract.contractId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Exporter:</strong> {selectedContract.exporterID || selectedContract.exporterId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Buyer:</strong> {selectedContract.buyerID || selectedContract.buyerId}
              </Typography>
              
              <PortalField
                select
                fullWidth
                required
                label="Field to correct *"
                value={contractRejectionField}
                onChange={(e) => setContractRejectionField(e.target.value)}
                helperText="Choose the contract detail that must change."
                sx={{ mb: 2 }}
              >
                {contractRejectionFields.map((field) => (
                  <MenuItem key={field} value={field}>{field}</MenuItem>
                ))}
              </PortalField>
              <PortalField
                fullWidth
                multiline
                rows={4}
                label="Required correction *"
                value={contractRejectionReason}
                onChange={(e) => setContractRejectionReason(e.target.value)}
                placeholder="Name what is wrong and what value or document the exporter must provide."
                error={contractRejectionReason.length > 0 && contractRejectionReason.trim().length < 20}
                helperText={`${contractRejectionReason.trim().length}/20 characters minimum. This text is shown to the exporter.`}
                required
              />
            </>
          )}
        
      </PortalDialog>
    </PortalShell>
  );
};

export default ECTAPortal;
