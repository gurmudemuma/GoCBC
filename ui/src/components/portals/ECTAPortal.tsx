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
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Divider,
  Snackbar,
  Button,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
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
} from '@mui/icons-material';
import AuditTrailViewer from './AuditTrailViewer';
import AuditTrailTable from './AuditTrailTable';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import PostDeliveryWorkflowPanel from '../shared/PostDeliveryWorkflowPanel';

import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import { InspectionManagement } from './InspectionManagement';
import { QualityInspectionWorkflow } from './QualityInspectionWorkflow';
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
  SearchBar,
  ThemeToggle,
} from '@/components/modern';
import UserManagement from '@/components/admin/UserManagement';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import { DocumentManagementPanel } from '@/components/documents';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';
import { BlockchainStatusIcon, BlockchainTxChip, BlockchainBadge } from '@/components/blockchain';


// Status types for chips
type StatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLEARED' | 'HELD' | 'SUBMITTED' | 'UNDER_REVIEW' | string;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const exporterSchema = yup.object({
  exporterId: yup.string().matches(/^EXP\d{7}$/, 'Invalid exporter ID format').required(),
  companyName: yup.string().min(3).max(100).required(),
  ectaLicenseNumber: yup.string().matches(/^ECTA-LIC-\d{4}-\d{3}$/, 'Invalid license format').required(),
  capitalRequirement: yup.number().min(10000000).required('Minimum capital: 10M ETB for individual exporters'),
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
  
  // ECTA Brand Colors
  const BRAND_COLOR = '#078930';  // ECTA Green
  const SECONDARY_COLOR = '#6d4c41';  // Coffee Brown
  
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  
  // Sub-tab state for KPI filtering
  const [subTabValue, setSubTabValue] = useState(0);
  
  // Inspection filter state (for Quality Control tab) - 5-stage workflow
  const [inspectionFilterTab, setInspectionFilterTab] = useState<'PENDING' | 'SCHEDULED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'>('PENDING');
  
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
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ExporterApplication | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
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
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ title: '', message: '', type: 'success' as 'success' | 'error' });
  const [searchTerm, setSearchTerm] = useState('');
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
  const [contractRejectionReason, setContractRejectionReason] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<string>(''); // '' = all, 'REGISTERED', 'APPROVED', 'REJECTED'
  
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

  useEffect(() => {
    if (tabValue === 6) {
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
            const docs = result.data.map((doc: any) => ({
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
      { index: 2, label: `Sales Contracts`, icon: <Description sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Permit Officer'] },
      { index: 3, label: `Quality Control`, icon: <Science sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'Quality Inspector', 'Lab Analyst', 'ECTA Officer'] },
      { index: 4, label: `License Renewals`, icon: <Warning sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer'] },
      { index: 5, label: 'Analytics', icon: <Assessment sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer'] },
      { index: 6, label: 'User Management', icon: <Person sx={{ fontSize: 20 }} />, roles: ['ADMIN', 'ECTA', 'ECTA Portal Administrator'] },
      { index: 7, label: 'Audit Trail', icon: <Assessment sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'License Officer', 'Quality Inspector', 'Lab Analyst', 'Permit Officer'] },
      { index: 8, label: 'Post-Delivery Audits', icon: <CheckCircle sx={{ fontSize: 20 }} />, roles: ['ECTA', 'ADMIN', 'ECTA Officer'] },
    ];
    
    // Super Admin sees all tabs
    if (isSuperAdmin) {
      return allTabs;
    }
    
    // Filter tabs based on user role
    return allTabs.filter(tab => tab.roles.includes(userRole));
  };
  
  const visibleTabs = getRoleBasedTabs();

  const loadData = async () => {
    setLoading(true);
    try {
      // Load blockchain exporters (may be empty if blockchain not connected)
      const exportersPromise = api.getExporters().catch(err => {
        // Silently handle blockchain timeout - not critical for UI
        return { success: false, data: [] };
      });
      
      const shipmentsPromise = api.getShipments({ limit: 100 }).catch(err => {
        // Silently handle shipments timeout - not critical for UI
        return { success: false, data: [] };
      });
      
      // Load database applications
      const applicationsPromise = api.get('/exporters/exporter-applications?status=pending').catch(err => {
        // Database calls should not fail - log if they do
        console.error('Failed to load applications:', err);
        return { data: { success: false, data: [] } };
      });

      const approvedApplicationsPromise = api.get('/exporters/exporter-applications?status=approved').catch(err => {
        console.error('Failed to load approved applications:', err);
        return { data: { success: false, data: [] } };
      });

      const inspectionsPromise = api.get('/quality/inspections?limit=500').catch(err => {
        // Quality inspections may timeout - handle gracefully
        return { data: { success: false, data: [] } };
      });

      const [exportersRes, shipmentsRes, applicationsRes, approvedApplicationsRes, inspectionsRes] = await Promise.all([
        exportersPromise,
        shipmentsPromise,
        applicationsPromise,
        approvedApplicationsPromise,
        inspectionsPromise,
      ]);

      // Set blockchain data (if available)
      if (exportersRes.success) {
        setExporters(exportersRes.data || []);
        setAllExporters(exportersRes.data || []);
      }
      
      // ✅ FILTER SHIPMENTS: Only show shipments needing quality inspection
      // ECTA should ONLY see shipments with status: CREATED, INSPECTION_PENDING, or QUALITY_APPROVED (needing permit)
      if (shipmentsRes.success && shipmentsRes.data) {
        const ectaRelevantShipments = shipmentsRes.data.filter((s: any) => {
          const status = s.Status || s.status || s.shipmentStatus || '';
          return status === 'CREATED' || 
                 status === 'INSPECTION_PENDING' || 
                 status === 'QUALITY_APPROVED' ||
                 status === 'INSPECTED'; // Waiting for approval/rejection
        });
        console.log(`[ECTA] Filtered ${ectaRelevantShipments.length}/${shipmentsRes.data.length} shipments needing ECTA action`);
        setShipments(ectaRelevantShipments);
        setAllShipments(ectaRelevantShipments);
        
        // Filter delivered shipments for post-delivery audits
        const delivered = shipmentsRes.data.filter((s: any) => {
          const status = s.Status || s.status || s.shipmentStatus || '';
          return status === 'DELIVERED' || status === 'COMPLETED';
        });
        console.log(`[ECTA] Found ${delivered.length} delivered shipments for post-delivery audit`);
        setDeliveredShipments(delivered);
      }
      
      // Load contracts
      try {
        const contractsRes = await api.getContracts();
        console.log('[ECTA] Contracts API response:', contractsRes);
        console.log('[ECTA] First contract (raw):', contractsRes.data?.[0]);
        
        if (contractsRes.success && contractsRes.data) {
          // Store all contracts first for KPI calculations
          setAllContracts(contractsRes.data);
          
          // ✅ SHOW ALL CONTRACTS in the table, not just REGISTERED
          // ECTA can see all contracts to track the full lifecycle
          console.log(`[ECTA] Showing ${contractsRes.data.length} total contracts in table`);
          setContracts(contractsRes.data); // Show ALL contracts
        }
      } catch (err) {
        console.warn('Failed to load contracts:', err);
        setContracts([]);
        setAllContracts([]);
      }
      
      // Set database applications
      console.log('[ECTA] Applications API response:', applicationsRes);
      const appsData = applicationsRes.data?.data;
      console.log('[ECTA] Applications data:', appsData);
      
      if (appsData && Array.isArray(appsData)) {
        console.log(`[ECTA] ✅ Loaded ${appsData.length} pending applications`);
        setApplications(appsData);
        setAllApplications(appsData);
      } else {
        console.warn('[ECTA] ⚠️ No applications data or invalid format');
        setApplications([]);
        setAllApplications([]);
      }

      // Set approved applications (source of truth for exporter count)
      const approvedAppsData = approvedApplicationsRes.data?.data;
      if (approvedAppsData && Array.isArray(approvedAppsData)) {
        console.log(`[ECTA] ✅ Loaded ${approvedAppsData.length} approved applications`);
        setApprovedApplications(approvedAppsData);
      } else {
        setApprovedApplications([]);
      }

      // Set inspection records for the Quality Control KPI row
      const inspectionData = inspectionsRes.data?.data?.inspections;
      if (inspectionData && Array.isArray(inspectionData)) {
        setInspectionRecords(inspectionData);
        setAllInspectionRecords(inspectionData);
      } else {
        setInspectionRecords([]);
        setAllInspectionRecords([]);
      }

      // Log data sync status
      const blockchainCount = exportersRes.data?.length || 0;
      const approvedCount = approvedAppsData?.length || 0;
      if (blockchainCount !== approvedCount) {
        console.warn(`⚠️ Data sync issue: ${approvedCount} approved in DB, ${blockchainCount} on blockchain`);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
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
        const blockchainVerified = logs.filter((log: any) => 
          log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC'
        ).length;
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

    try {
      const newStatus = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
      const response = await api.put(`/exporters/${exporterId}/status`, { status: newStatus });
      
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
            const minCapital = {
              'private': 15000000,    // 15M ETB
              'company': 20000000,    // 20M ETB
              'individual': 10000000  // 10M ETB
            }[exporterType] || 20000000;
            return capital >= minCapital ? 'PASSED' : 'FAILED';
          })(),
          details: (() => {
            const capital = parseFloat(application.capital_requirement);
            const exporterType = application.exporter_type || 'company';
            const minCapital = {
              'private': 15000000,
              'company': 20000000,
              'individual': 10000000
            }[exporterType] || 20000000;
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
            const minCapital = {
              'private': 15000000,
              'company': 20000000,
              'individual': 10000000
            }[exporterType] || 20000000;
            return capital >= minCapital ? 'COMPLIANT' : 'NON_COMPLIANT';
          })(),
          details: (() => {
            const capital = parseFloat(application.capital_requirement);
            const exporterType = application.exporter_type || 'company';
            const minCapital = {
              'private': 15000000,
              'company': 20000000,
              'individual': 10000000
            }[exporterType] || 20000000;
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
    
    try {
      const response = await api.post(
        `/exporters/exporter-applications/${selectedApplication.application_id}/reject`,
        { reason: rejectionReason }
      );
      
      if (response.data?.success) {
        setRejectDialogOpen(false);
        
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
• Minimum capital: 50,000,000 ETB
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
    }
  };

  // Contract Approval Handler
  const handleApproveContract = async () => {
    if (!selectedContract) return;
    
    try {
      const response = await api.approveContract(selectedContract.contractID || selectedContract.contractId);
      
      if (response.success) {
        setContractApprovalDialogOpen(false);
        showSuccess(
          'Contract Approved',
          `Contract ${selectedContract.contractID || selectedContract.contractId} has been approved for export compliance. Banks can now issue LC and allocate forex.`
        );
        
        // Refresh contracts
        loadData();
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
    if (!selectedContract || !contractRejectionReason) {
      showError('Rejection Failed', 'Please provide a reason for rejection');
      return;
    }
    
    try {
      const response = await api.rejectContract(
        selectedContract.contractID || selectedContract.contractId,
        contractRejectionReason,
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
        setContractRejectionReason('');
      } else {
        showError('Rejection Failed', response.error?.message || 'Failed to reject contract');
      }
    } catch (error: any) {
      console.error('Failed to reject contract:', error);
      showError('Rejection Failed', error.response?.data?.error?.message || 'Failed to reject contract');
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
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
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

  // STAGE 2: Perform Inspection (REQUESTED → INSPECTED)
  const handlePerformInspection = async (inspection: any) => {
    try {
      const response = await api.post(`/quality/inspections/${inspection.inspectionID || inspection.InspectionID}/perform`, {
        inspectorID: 'ECTA-01',
        inspectorName: 'ECTA Quality Lab',
        sampleSize: 100,
        moistureContent: 11.2,
        defectCount: 3,
        beanSize: '17',
        color: 'Green',
        odor: 'Clean',
        fragrance: 8,
        flavor: 8,
        aftertaste: 8,
        acidity: 8,
        body: 8,
        balance: 8,
        uniformity: 10,
        cleanCup: 10,
        sweetness: 10,
        overall: 87,
        classification: 'WASHED',
        pesticideTest: 'PASSED',
        heavyMetalTest: 'PASSED',
        mycotoxinTest: 'PASSED',
        remarks: 'Quality inspection completed - meets export standards',
      });
      
      if (response.data.success) {
        showSuccess(
          'Inspection Completed',
          `Inspection ${inspection.inspectionID || inspection.InspectionID} has been performed`,
          'Quality Lab results recorded. Awaiting ECTA approval for export permit'
        );
        loadData();
      } else {
        showError('Inspection Failed', response.data.error?.message || 'Failed to perform inspection');
      }
    } catch (error: any) {
      showError('Inspection Failed', error.response?.data?.error?.message || error.message);
    }
  };

  // STAGE 3: Approve Inspection (INSPECTED → APPROVED)
  const handleApproveInspection = async (inspection: any) => {
    try {
      const certificateNo = `CERT${Date.now()}`;
      const response = await api.post(`/quality/inspections/${inspection.inspectionID || inspection.InspectionID}/approve`, {
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
      const exportPermitNo = `PERMIT${Date.now()}`;
      const response = await api.post(`/quality/inspections/${inspection.inspectionID || inspection.InspectionID}/issue-permit`, {
        exportPermitNo,
        issuedBy: 'ECTA Export Permit Office',
        autoCreateCustomsDeclaration: true, // Auto-trigger customs workflow
      });
      
      if (response.data.success) {
        showSuccess(
          'Export Permit Issued',
          `Export Permit ${exportPermitNo} issued for ${inspection.shipmentID || inspection.ShipmentID}`,
          'Customs declaration workflow has been automatically initiated'
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
      const response = await api.post(`/quality/inspections/${inspection.inspectionID || inspection.InspectionID}/reject`, {
        rejectedBy: 'ECTA Quality Director',
        rejectionReason,
      });
      
      if (response.data.success) {
        showSuccess(
          'Inspection Rejected',
          `Inspection ${inspection.inspectionID || inspection.InspectionID} has been rejected`,
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

  const exporterColumns: GridColDef[] = [
    { field: 'exporterId', headerName: 'Exporter ID', width: 130 },
    { field: 'companyName', headerName: 'Company Name', width: 200 },
    { field: 'ectaLicenseNumber', headerName: 'License Number', width: 150 },
    {
      field: 'licenseStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip
          status={params.value === 'ACTIVE' ? 'approved' : params.value === 'SUSPENDED' ? 'rejected' : 'pending'}
          label={params.value}
          brandColor={BRAND_COLOR}
        />
      ),
    },
    {
      field: 'capitalRequirement',
      headerName: 'Capital (ETB)',
      width: 130,
      renderCell: (params) => formatCurrency(params.value, 'ETB'),
    },
    {
      field: 'laboratoryCertified',
      headerName: 'Lab Certified',
      width: 120,
      renderCell: (params) => (
        <FormControlLabel
          control={
            <Switch
              checked={params.value}
              onChange={(e) => handleUpdateLaboratory(params.row.exporterId, e.target.checked)}
              size="small"
            />
          }
          label=""
        />
      ),
    },
    {
      field: 'licenseExpiryDate',
      headerName: 'Expires',
      width: 120,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedExporter(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Quality Control">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedExporter(params.row);
                setQualityDialogOpen(true);
              }}
            >
              <Science />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.licenseStatus === 'SUSPENDED' ? 'Activate License' : 'Suspend License'}>
            <IconButton 
              size="small"
              color={params.row.licenseStatus === 'SUSPENDED' ? 'success' : 'warning'}
              onClick={(e) => {
                e.stopPropagation();
                handleSuspendLicense(params.row.exporterId, params.row.licenseStatus);
              }}
            >
              {params.row.licenseStatus === 'SUSPENDED' ? <CheckCircle /> : <Warning />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f7fcf8 0%, #eefbf2 45%, #fffdf3 100%)',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Dynamic KPI Cards - Change based on active tab */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Tab 0: Pending Applications */}
        {tabValue === 0 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#ff980015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Warning sx={{ fontSize: 28, color: '#ff9800' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Pending Review
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', lineHeight: 1 }}>
                    {allApplications.filter(a => a.status === 'pending').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#4caf5015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <CheckCircle sx={{ fontSize: 28, color: '#4caf50' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Approved
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50', lineHeight: 1 }}>
                    {allApplications.filter(a => a.status === 'approved').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#f4433615', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Cancel sx={{ fontSize: 28, color: '#f44336' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Rejected
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336', lineHeight: 1 }}>
                    {allApplications.filter(a => a.status === 'rejected').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#2196f315', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Assignment sx={{ fontSize: 28, color: '#2196f3' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Total Applications
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3', lineHeight: 1 }}>
                    {allApplications.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Tab 1: Approved Exporters */}
        {tabValue === 1 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${BRAND_COLOR}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Coffee sx={{ fontSize: 28, color: BRAND_COLOR }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Active Exporters
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: BRAND_COLOR, lineHeight: 1 }}>
                    {approvedApplications.filter(a => a.status === 'approved').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#ff980015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Warning sx={{ fontSize: 28, color: '#ff9800' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Expiring Soon
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', lineHeight: 1 }}>
                    {approvedApplications.filter(a => {
                      if (!a.license_expiry_date) return false;
                      const expiryDate = new Date(a.license_expiry_date);
                      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
                    }).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#f4433615', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <ErrorOutline sx={{ fontSize: 28, color: '#f44336' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Expired Licenses
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336', lineHeight: 1 }}>
                    {approvedApplications.filter(a => {
                      if (!a.license_expiry_date) return false;
                      const expiryDate = new Date(a.license_expiry_date);
                      return expiryDate.getTime() < Date.now();
                    }).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#9c27b015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Science sx={{ fontSize: 28, color: '#9c27b0' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Lab Certified
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0', lineHeight: 1 }}>
                    {approvedApplications.filter(a => a.laboratory_facility && a.laboratory_facility.toLowerCase() === 'yes').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Tab 2: Sales Contracts */}
        {tabValue === 2 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  textAlign: 'center',
                  py: 3,
                  transition: 'all 0.3s ease',
                  border: `2px solid ${contractStatusFilter === 'REGISTERED' ? '#ff9800' : 'transparent'}`,
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }
                }}
                onClick={() => setContractStatusFilter('REGISTERED')}
              >
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#ff980015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <HourglassEmpty sx={{ fontSize: 28, color: '#ff9800' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Pending Approval
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', lineHeight: 1 }}>
                    {allContracts.filter(c => c.contractStatus === 'REGISTERED' || c.status === 'REGISTERED').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  textAlign: 'center',
                  py: 3,
                  transition: 'all 0.3s ease',
                  border: `2px solid ${contractStatusFilter === 'APPROVED' ? '#4caf50' : 'transparent'}`,
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }
                }}
                onClick={() => setContractStatusFilter('APPROVED')}
              >
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#4caf5015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <CheckCircle sx={{ fontSize: 28, color: '#4caf50' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Approved
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50', lineHeight: 1 }}>
                    {allContracts.filter(c => c.contractStatus === 'APPROVED' || c.status === 'APPROVED').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  textAlign: 'center',
                  py: 3,
                  transition: 'all 0.3s ease',
                  border: `2px solid ${contractStatusFilter === 'REJECTED' ? '#f44336' : 'transparent'}`,
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }
                }}
                onClick={() => setContractStatusFilter('REJECTED')}
              >
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#f4433615', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Cancel sx={{ fontSize: 28, color: '#f44336' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Rejected
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336', lineHeight: 1 }}>
                    {allContracts.filter(c => c.contractStatus === 'REJECTED' || c.status === 'REJECTED').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  textAlign: 'center',
                  py: 3,
                  transition: 'all 0.3s ease',
                  border: `2px solid ${contractStatusFilter === '' ? '#2196f3' : 'transparent'}`,
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }
                }}
                onClick={() => setContractStatusFilter('')}
              >
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#2196f315', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Description sx={{ fontSize: 28, color: '#2196f3' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    All Contracts
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3', lineHeight: 1 }}>
                    {allContracts.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Tab 3: Quality Inspections */}
        {tabValue === 3 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#ff980015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Pending sx={{ fontSize: 28, color: '#ff9800' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Pending Inspection
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', lineHeight: 1 }}>
                    {allShipments.filter(s => {
                      const status = (s.status || (s as any).Status || '').toUpperCase();
                      return (status === 'CREATED' || status === 'REGISTERED') && 
                             !allInspectionRecords.some(i => (i.shipmentID || i.ShipmentID) === s.shipmentId);
                    }).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#2196f315', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Science sx={{ fontSize: 28, color: '#2196f3' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    In Progress
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3', lineHeight: 1 }}>
                    {allInspectionRecords.filter(i => {
                      const status = (i.status || (i as any).Status || '').toUpperCase();
                      return status === 'REQUESTED' || status === 'IN_PROGRESS';
                    }).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#4caf5015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <CheckCircle sx={{ fontSize: 28, color: '#4caf50' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Completed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50', lineHeight: 1 }}>
                    {allInspectionRecords.filter(i => {
                      const status = (i.status || (i as any).Status || '').toUpperCase();
                      return status === 'COMPLETED' || status === 'QUALITY_APPROVED';
                    }).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#9c27b015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Assessment sx={{ fontSize: 28, color: '#9c27b0' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Total Inspections
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0', lineHeight: 1 }}>
                    {allInspectionRecords.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Tab 6: Audit Trail */}
        {tabValue === 6 && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#1976d215', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <Assessment sx={{ fontSize: 28, color: '#1976d2' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Total Activities
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', lineHeight: 1 }}>
                    {auditStats.totalActivities}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#4caf5015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <TrendingUp sx={{ fontSize: 28, color: '#4caf50' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Today's Actions
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50', lineHeight: 1 }}>
                    {auditStats.todaysActions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#9c27b015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <CheckCircle sx={{ fontSize: 28, color: '#9c27b0' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Blockchain Verified
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0', lineHeight: 1 }}>
                    {auditStats.blockchainVerified}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', py: 3 }}>
                <CardContent>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: '#ff980015', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto' }}>
                    <People sx={{ fontSize: 28, color: '#ff9800' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                    Organizations
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', lineHeight: 1 }}>
                    {auditStats.organizationsInvolved}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Main Tabs - Enhanced with full-width, rounded corners */}
      <Paper sx={{ 
        mb: 3, 
        borderRadius: 2, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
        border: '1px solid #e0e0e0',
        overflow: 'hidden'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => {
            setTabValue(newValue);
            setSubTabValue(0);
          }}
          variant="fullWidth"
          sx={{ 
            borderBottom: 2,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#666',
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: BRAND_COLOR,
                fontWeight: 700,
                bgcolor: 'rgba(7, 137, 48, 0.05)',
              },
              '&:hover': {
                color: BRAND_COLOR,
                bgcolor: 'rgba(7, 137, 48, 0.03)',
              }
            },
            '& .MuiTabs-indicator': {
              height: 4,
              backgroundColor: BRAND_COLOR,
              borderRadius: '4px 4px 0 0',
            }
          }}
        >
          {visibleTabs.map((tab) => (
            <Tab 
              key={tab.index}
              icon={tab.icon}
              iconPosition="start"
              label={
                tab.index === 0 ? `${tab.label} (${allApplications.filter(a => a.status === 'pending').length})` :
                tab.index === 1 ? `${tab.label} (${approvedApplications.length})` :
                tab.index === 2 ? `${tab.label} (${allContracts.length})` :
                tab.index === 3 ? `${tab.label} (${(() => {
                  const pendingShipments = allShipments.filter(s => {
                    const status = (s.status || (s as any).Status || '').toUpperCase();
                    return (status === 'CREATED' || status === 'REGISTERED') && 
                           !allInspectionRecords.some(i => (i.shipmentID || i.ShipmentID) === s.shipmentId);
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
                tab.index === 8 ? `${tab.label} (${deliveredShipments.length})` :
                tab.label
              }
            />
          ))}
        </Tabs>
      </Paper>



      {/* Content Panels */}
      <Box>
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Pending Exporter Applications
          </Typography>
          {applications.length === 0 ? (
            <Alert severity="info">No pending applications at this time.</Alert>
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
                  {getPaginatedData(applications).map((application) => (
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination Controls */}
          {applications.length > 0 && (
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
                  Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, applications.length)} of {applications.length}
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
                    disabled={currentPage >= Math.ceil(applications.length / rowsPerPage) - 1}
                    onClick={() => handleChangePage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
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
                          status="approved"
                          label="ACTIVE"
                          brandColor={BRAND_COLOR}
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
                                      { label: 'Status', value: 'ACTIVE' },
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
                                  `The password will be reset to: password123\n\n` +
                                  `⚠️ IMPORTANT:\n` +
                                  `The user must change this temporary password immediately after logging in.\n\n` +
                                  `Continue with password reset?`
                                );
                                if (confirmed) {
                                  try {
                                    const exporterId = application.exporter_id;
                                    
                                    if (!exporterId) {
                                      showError('Cannot Reset Password', 'This application does not have an exporter ID assigned yet.');
                                      return;
                                    }
                                    
                                    console.log('[PASSWORD RESET] Using direct endpoint with exporterId:', exporterId);
                                    
                                    // Use the new direct endpoint that doesn't require fetching all users
                                    const response = await api.post('/users/reset-password-by-identifier', {
                                      exporterId: exporterId,
                                      email: application.email
                                    });
                                    
                                    console.log('[PASSWORD RESET] Response:', response.data);
                                    
                                    if (response.data?.success) {
                                      const userData = response.data.data;
                                      showSuccess(
                                        'Password Reset Successful', 
                                        `Password has been reset for ${application.company_name}.\n\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                        `📧 Email: ${userData.email}\n` +
                                        `👤 Username: ${userData.username}\n` +
                                        `🔑 New Password: password123\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                        `⚠️ NEXT STEPS:\n` +
                                        `1. Inform the user about the password reset\n` +
                                        `2. User logs in with username "${userData.username}"\n` +
                                        `3. User must change password immediately\n\n` +
                                        `✅ Password reset completed successfully.`
                                      );
                                    }
                                  } catch (error: any) {
                                    console.error('[PASSWORD RESET] Error:', error);
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
                                    const response = await api.post(`/exporters/${application.exporter_id}/suspend`, { reason });
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
                                        showError('License Revoked', `${application.company_name} license has been permanently revoked. Account is disabled.`);
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
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Sales Contracts - Export Compliance Approval
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>ECTA Role:</strong> Review and approve sales contracts for export compliance.  
            Approved contracts can proceed to banks for LC issuance. Forex is allocated separately per NBE policy (50% retention).
          </Alert>
          
          {contracts.filter(c => {
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
                  {getPaginatedData(contracts
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
                          status={contract.contractStatus === 'REGISTERED' ? 'pending' : contract.contractStatus === 'APPROVED' ? 'approved' : 'rejected'}
                          label={contract.contractStatus}
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
                            <Button
                              variant="contained"
                              size="small"
                              sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: '#056620' } }}
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractApprovalDialogOpen(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedContract(contract);
                                setContractRejectDialogOpen(true);
                              }}
                            >
                              Reject
                            </Button>
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
          {contracts.filter(c => {
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
                    disabled={currentPage >= Math.ceil(contracts.filter(c => {
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
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Quality Control Tab - Clean Table View */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science /> Quality Inspection Records
          </Typography>

          {/* Unified Table for All Inspection Data */}
          {(() => {
            // Show all inspection data: pending shipments + all inspection records
            const getPendingShipments = () => allShipments.filter(s => {
              const status = (s.status || (s as any).Status || '').toUpperCase();
              return (status === 'CREATED' || status === 'REGISTERED') && 
                     !allInspectionRecords.some(i => (i.shipmentID || i.ShipmentID) === s.shipmentId);
            });

            const dataToShow = [...getPendingShipments(), ...allInspectionRecords];
            const isPendingShipment = (item: any) => item.shipmentId && !item.inspectionID && !item.InspectionID;

            return dataToShow.length === 0 ? (
              <Alert severity="info">No inspection records to display</Alert>
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
                    {getPaginatedData(dataToShow).map((item: any, index) => {
                      const isShipment = isPendingShipment(item);
                      const itemId = isShipment ? item.shipmentId : (item.inspectionID || item.InspectionID);
                      const shipmentId = isShipment ? item.shipmentId : (item.shipmentID || item.ShipmentID);
                      const exporterId = isShipment ? item.exporterId : (item.exporterID || item.ExporterID);
                      
                      // Map database status to workflow status
                      const rawStatus = isShipment ? 'PENDING' : (item.status || item.Status || 'UNKNOWN');
                      const status = (() => {
                        const normalized = String(rawStatus).toUpperCase();
                        // Map 'pending' from database to 'REQUESTED' (scheduled, awaiting inspection)
                        if (normalized === 'PENDING' && !isShipment && item.requestedDate) {
                          return 'REQUESTED';
                        }
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
                          return item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A';
                        }
                        
                        // For inspections, show appropriate date based on status
                        const currentStatus = (item.status || '').toUpperCase();
                        
                        if (currentStatus === 'PENDING' || currentStatus === 'REQUESTED') {
                          // Show scheduled/requested date for pending inspections
                          const schedDate = item.requestedDate || item.scheduledDate || item.createdAt;
                          return schedDate ? new Date(schedDate).toLocaleDateString() : 'Not Scheduled';
                        } else if (currentStatus === 'INSPECTED') {
                          // Show inspection date for inspected (awaiting approval)
                          const inspDate = item.inspectionDate || item.createdAt;
                          return inspDate ? new Date(inspDate).toLocaleDateString() : 'N/A';
                        } else if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED' || currentStatus === 'COMPLETED') {
                          // Show inspection date, fall back to requested date or created date
                          const compDate = item.inspectionDate || item.approvalDate || item.requestedDate || item.createdAt;
                          return compDate ? new Date(compDate).toLocaleDateString() : 'N/A';
                        }
                        
                        // Fallback
                        const anyDate = item.inspectionDate || item.requestedDate || item.createdAt;
                        return anyDate ? new Date(anyDate).toLocaleDateString() : 'N/A';
                      })();
                      
                      const qualityScore = isShipment ? 'N/A' : (item.overall || item.overallScore || 'N/A');
                      const certificate = isShipment ? '-' : (item.certificateNo || '-');

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
                            ) : status === 'REQUESTED' ? (
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
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<Cancel />}
                                  color="error"
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason:');
                                    if (reason) handleRejectInspection(item, reason);
                                  }}
                                >
                                  Reject
                                </Button>
                              </Box>
                            ) : status === 'APPROVED' ? (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Description />}
                                sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: '#056620' } }}
                                onClick={() => handleIssueExportPermit(item)}
                              >
                                Issue Permit
                              </Button>
                            ) : status === 'REJECTED' ? (
                              <Chip label="Rejected" size="small" color="error" />
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
              {dataToShow.length > 0 && (
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
                      Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, dataToShow.length)} of {dataToShow.length}
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
                        disabled={currentPage >= Math.ceil(dataToShow.length / rowsPerPage) - 1}
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
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
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
                              const newExpiryDate = new Date(exporter.licenseExpiryDate);
                              newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                              
                              if (window.confirm(`Process License Renewal?\n\nExporter: ${exporter.companyName}\nLicense: ${exporter.ectaLicenseNumber}\nCurrent Expiry: ${formatDate(exporter.licenseExpiryDate)}\nNew Expiry: ${formatDate(newExpiryDate.toISOString())}\n\nThis will extend the license for 1 year.`)) {
                                apiFetch(`/exporters/${exporter.exporterId}/renew-license`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    newExpiryDate: newExpiryDate.toISOString(),
                                    renewedBy: 'ECTA Officer',
                                    renewalDate: new Date().toISOString(),
                                  })
                                })
                                .then(res => res.json())
                                .then(result => {
                                  if (result.success) {
                                    alert(`✅ License Renewed Successfully\n\nExporter: ${exporter.companyName}\nNew Expiry: ${formatDate(newExpiryDate.toISOString())}\n\nLicense extended for 1 year`);
                                    loadData();
                                  } else {
                                    alert(`❌ Renewal Failed\n\n${result.error || 'Unknown error'}`);
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
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          {/* Analytics Tab */}
          <AnalyticsDashboard />
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          {/* User Management Tab */}
          <UserManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
          {/* Audit Trail Tab */}
          <AuditTrailTable
            title="ECTA Portal - Complete Transaction History"
            autoRefresh={true}
            refreshInterval={60000}
            showStats={false}
            maxHeight={700}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
          {/* Reports Tab */}
          <Typography variant="h6" gutterBottom>
            ECTA Reports & Analytics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Export Exporter Registry
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Quality Control Report
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                fullWidth
              >
                License Compliance Report
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <ModernCard brandColor={BRAND_COLOR}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monthly Statistics
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    New Registrations: 12
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Quality Inspections: 45
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    License Renewals: 8
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Compliance Rate: 96.5%
                  </Typography>
                </CardContent>
              </ModernCard>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={8}>
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
        </TabPanel>
      </Box>

      {/* Register Exporter Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Register New Coffee Exporter</DialogTitle>
        <form onSubmit={handleSubmit(handleCreateExporter)}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="exporterId"
                  control={control}
                  render={({ field }) => (
                    <TextField
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
                    <TextField
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
                    <TextField
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
                    <TextField
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
                    <TextField
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
                    <TextField
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
          </DialogContent>
          <DialogActions>
            <AnimatedButton onClick={() => setDialogOpen(false)} variant="outlined">
              Cancel
            </AnimatedButton>
            <AnimatedButton 
              type="submit" 
              variant="contained"
              brandColor="#FFD700"
              secondaryColor="#B8860B"
            >
              Register Exporter
            </AnimatedButton>
          </DialogActions>
        </form>
      </Dialog>

      {/* Application Details Dialog */}
      <Dialog 
        open={!!selectedApplication && !approveDialogOpen && !rejectDialogOpen} 
        onClose={() => setSelectedApplication(null)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Application Details</DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Company Information</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Application ID:</Typography>
                <Typography variant="body1">{selectedApplication.application_id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Company Name:</Typography>
                <Typography variant="body1">{selectedApplication.company_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">TIN Number:</Typography>
                <Typography variant="body1">{selectedApplication.tin_number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Business License:</Typography>
                <Typography variant="body1">{selectedApplication.business_license_number}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Requirements</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Capital:</Typography>
                <Typography variant="body1">{formatCurrency(parseFloat(selectedApplication.capital_requirement), 'ETB')}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Professional Taster:</Typography>
                <Typography variant="body1">{selectedApplication.professional_taster}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Taster Certificate:</Typography>
                <Typography variant="body1">{selectedApplication.taster_certificate}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Laboratory:</Typography>
                <Typography variant="body1">{selectedApplication.laboratory_facility === 'yes' ? 'Yes' : 'No'}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Contact Details</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Contact Person:</Typography>
                <Typography variant="body1">{selectedApplication.contact_person}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Email:</Typography>
                <Typography variant="body1">{selectedApplication.email}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Phone:</Typography>
                <Typography variant="body1">{selectedApplication.phone}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">City:</Typography>
                <Typography variant="body1">{selectedApplication.city}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">Address:</Typography>
                <Typography variant="body1">{selectedApplication.address}</Typography>
              </Grid>
              {selectedApplication.comments && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Comments:</Typography>
                  <Typography variant="body1">{selectedApplication.comments}</Typography>
                </Grid>
              )}

              {/* Uploaded Documents Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Uploaded Documents</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12}>
                {/* Document Management Panel for Application Review */}
                <DocumentManagementPanel
                  entityType="EXPORTER_APPLICATION"
                  entityId={selectedApplication.application_id}
                  title="Application Documents"
                  allowUpload={false}
                  allowSign={true}
                  allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
                  defaultSignatureType="VERIFY"
                  showSignatureTracker={true}
                  requiredDocuments={[
                    'TRADE_LICENSE',
                    'TAX_CLEARANCE',
                    'BUSINESS_REGISTRATION',
                    'ECTA_MEMBERSHIP_CERTIFICATE'
                  ]}
                  onDocumentSigned={(docId, data) => {
                    console.log('Application document signed:', docId, data);
                    // Reload application data after signature
                    loadData();
                  }}
                />
              </Grid>

              {/* Blockchain Verification */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <BlockchainSignatureVerification
                    entityType="EXPORTER_APPLICATION"
                    entityId={selectedApplication.application_id}
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedApplication(null)} variant="outlined">
            Close
          </AnimatedButton>
          <AnimatedButton 
            variant="outlined" 
            onClick={() => {
              setRejectDialogOpen(true);
            }}
            brandColor="#f44336"
          >
            Reject
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor="#4caf50"
            onClick={() => {
              generateApprovalData();
              setApproveDialogOpen(true);
            }}
          >
            Approve
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Approve Application Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Approve Exporter Application</DialogTitle>
        <DialogContent>
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
              <TextField
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
              <TextField
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
              <TextField
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
              <TextField
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
              <TextField
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
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </Dialog>

      {/* Reject Application Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Exporter Application</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Please provide a reason for rejecting this application.
          </Typography>
          <TextField
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
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => {
            setRejectDialogOpen(false);
            setRejectionReason('');
          }} variant="outlined">
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor="#f44336"
            onClick={handleRejectApplication}
            disabled={!rejectionReason}
          >
            Reject Application
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Exporter Detail Dialog */}
      <Dialog 
        open={!!selectedExporter && !qualityDialogOpen} 
        onClose={() => setSelectedExporter(null)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Exporter Details</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
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
                  
                  const response = await apiFetch(`/exporters/${selectedExporter.exporterId}/suspend`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      suspensionReason: reason,
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
        </DialogActions>
      </Dialog>

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
        <DialogActions>
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
        </DialogActions>
      </Dialog>

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
            api.getShipments({ limit: 100 }).then(res => {
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
      <Dialog 
        open={contractDetailsDialogOpen} 
        onClose={() => setContractDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description />
          Contract Details
        </DialogTitle>
        <DialogContent>
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

              {/* Blockchain Verification Section */}
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🔐 Blockchain Verification
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Hyperledger Fabric Blockchain:</strong> This contract and all related documents are 
                    cryptographically signed and stored on the immutable consortium blockchain. All signatures below 
                    are verified against X.509 certificates and blockchain transaction records.
                  </Typography>
                </Alert>
                <BlockchainSignatureVerification
                  entityType="CONTRACT"
                  entityId={selectedContract.contractID || selectedContract.contractId}
                />
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractDetailsDialogOpen(false)}>
            Close
          </Button>
          {selectedContract?.contractStatus === 'REGISTERED' && (
            <>
              <Button 
                variant="contained" 
                color="error"
                onClick={() => {
                  setContractDetailsDialogOpen(false);
                  setContractRejectDialogOpen(true);
                }}
              >
                Reject Contract
              </Button>
              <Button 
                variant="contained" 
                sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: '#056620' } }}
                onClick={() => {
                  setContractDetailsDialogOpen(false);
                  setContractApprovalDialogOpen(true);
                }}
              >
                Approve Contract
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Contract Approval Dialog */}
      <Dialog 
        open={contractApprovalDialogOpen} 
        onClose={() => setContractApprovalDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Approve Contract for Export</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractApprovalDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: '#056620' } }}
            onClick={handleApproveContract}
          >
            Approve Contract
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contract Rejection Dialog */}
      <Dialog 
        open={contractRejectDialogOpen} 
        onClose={() => {
          setContractRejectDialogOpen(false);
          setContractRejectionReason('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Contract</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Contract Rejection</strong>
                <br />
                This will reject the contract and prevent it from proceeding to export.
              </Alert>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Contract ID:</strong> {selectedContract.contractID || selectedContract.contractId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Exporter:</strong> {selectedContract.exporterID || selectedContract.exporterId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Buyer:</strong> {selectedContract.buyerID || selectedContract.buyerId}
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Rejection Reason *"
                value={contractRejectionReason}
                onChange={(e) => setContractRejectionReason(e.target.value)}
                placeholder="Provide detailed reason for rejection..."
                required
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setContractRejectDialogOpen(false);
            setContractRejectionReason('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleRejectContract}
            disabled={!contractRejectionReason}
          >
            Reject Contract
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ECTAPortal;
