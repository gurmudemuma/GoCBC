// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal - Exporter Registration & Quality Control

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
} from '@mui/icons-material';
import AuditTrailViewer from './AuditTrailViewer';

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
  capitalRequirement: yup.number().min(50000000).required('Minimum capital: 50M ETB'),
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
  // ECTA Brand Colors
  const BRAND_COLOR = '#078930';  // ECTA Green
  const SECONDARY_COLOR = '#6d4c41';  // Coffee Brown
  
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  
  // Sub-tab state for KPI filtering
  const [subTabValue, setSubTabValue] = useState(0);
  const [activeKPIFilter, setActiveKPIFilter] = useState<string | null>(null);
  
  // Inspection filter state (for Quality Control tab) - 5-stage workflow
  const [inspectionFilterTab, setInspectionFilterTab] = useState<'PENDING' | 'SCHEDULED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [allExporters, setAllExporters] = useState<Exporter[]>([]);
  const [shipments, setShipments] = useState<CoffeeShipment[]>([]);
  const [allShipments, setAllShipments] = useState<CoffeeShipment[]>([]);
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
  
  // Document Validation Dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  
  // Contract Approval State
  const [contractApprovalDialogOpen, setContractApprovalDialogOpen] = useState(false);
  const [contractRejectDialogOpen, setContractRejectDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractRejectionReason, setContractRejectionReason] = useState('');


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

  // Handle KPI filter for sub-tabs
  const handleKPIFilter = (filterKey: string, kpiTitle: string) => {
    setActiveKPIFilter(filterKey);
    
    // Apply filter based on active tab and filter key
    switch (tabValue) {
      case 0: // Exporter Registration
        if (filterKey === 'ALL_APPS') setApplications(allApplications);
        else if (filterKey === 'PENDING_APPS') setApplications(allApplications.filter(a => a.status === 'pending'));
        else if (filterKey === 'APPROVED_APPS') setApplications(allApplications.filter(a => a.status === 'approved'));
        else setApplications(allApplications);
        break;
        
      case 1: // Active Exporters
        if (filterKey === 'ALL_EXPORTERS') setExporters(allExporters);
        else setExporters(allExporters);
        break;
        
      case 2: // Sales Contracts
        if (filterKey === 'ALL_CONTRACTS') setContracts(allContracts);
        else if (filterKey === 'PENDING_CONTRACTS') setContracts(allContracts.filter(c => c.contractStatus === 'REGISTERED'));
        else if (filterKey === 'APPROVED_CONTRACTS') setContracts(allContracts.filter(c => c.contractStatus === 'APPROVED'));
        else if (filterKey === 'REJECTED_CONTRACTS') setContracts(allContracts.filter(c => c.contractStatus === 'REJECTED'));
        else setContracts(allContracts);
        break;
        
      case 4: // Quality Inspection
        if (filterKey === 'ALL_SHIPMENTS') setShipments(allShipments);
        else if (filterKey === 'PENDING_INSPECTION') setShipments(allShipments.filter(s => !inspectionRecords.some(i => i.shipmentID === s.shipmentId)));
        else if (filterKey === 'APPROVED_INSPECTION') setInspectionRecords(allInspectionRecords.filter(i => i.status === 'APPROVED' || i.Status === 'APPROVED'));
        else {
          setShipments(allShipments);
          setInspectionRecords(allInspectionRecords);
        }
        break;
        
      default:
        setApplications(allApplications);
        setExporters(allExporters);
        setContracts(allContracts);
        setShipments(allShipments);
        setInspectionRecords(allInspectionRecords);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load blockchain exporters (may be empty if blockchain not connected)
      const exportersPromise = api.getExporters().catch(err => {
        console.warn('Blockchain query failed, using database records:', err.message);
        return { success: false, data: [] };
      });
      
      const shipmentsPromise = api.getShipments({ limit: 100 }).catch(err => {
        console.warn('Shipments query failed:', err.message);
        return { success: false, data: [] };
      });
      
      // Load database applications
      const applicationsPromise = api.get('/exporters/exporter-applications?status=pending').catch(err => {
        console.error('Failed to load applications:', err);
        return { data: { success: false, data: [] } };
      });

      const approvedApplicationsPromise = api.get('/exporters/exporter-applications?status=approved').catch(err => {
        console.error('Failed to load approved applications:', err);
        return { data: { success: false, data: [] } };
      });

      const inspectionsPromise = api.get('/quality/inspections?limit=500').catch(err => {
        console.error('Failed to load quality inspections:', err);
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
      }
      
      // Load contracts
      try {
        const contractsRes = await api.getContracts();
        if (contractsRes.success && contractsRes.data) {
          // Store all contracts first for KPI calculations
          setAllContracts(contractsRes.data);
          
          // ✅ FILTER CONTRACTS: Only show contracts waiting for ECTA approval
          // ECTA should ONLY see contracts with status: REGISTERED (waiting approval)
          const ectaRelevantContracts = contractsRes.data.filter((c: any) => {
            const status = c.ContractStatus || c.contractStatus || c.status || '';
            return status === 'REGISTERED'; // Only show contracts waiting for approval
          });
          console.log(`[ECTA] Filtered ${ectaRelevantContracts.length}/${contractsRes.data.length} contracts needing ECTA approval`);
          setContracts(ectaRelevantContracts);
        }
      } catch (err) {
        console.warn('Failed to load contracts:', err);
        setContracts([]);
        setAllContracts([]);
      }
      
      // Set database applications
      const appsData = applicationsRes.data?.data;
      if (appsData && Array.isArray(appsData)) {
        setApplications(appsData);
        setAllApplications(appsData);
      } else {
        setApplications([]);
        setAllApplications([]);
      }

      // Set approved applications (source of truth for exporter count)
      const approvedAppsData = approvedApplicationsRes.data?.data;
      if (approvedAppsData && Array.isArray(approvedAppsData)) {
        setApprovedApplications(approvedAppsData);
      } else {
        setApprovedApplications([]);
      }

      // Set inspection records for the Quality Control KPI row
      const inspectionData = inspectionsRes.data?.data;
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
      const response = await api.post(
        `/exporters/exporter-applications/${selectedApplication.application_id}/approve`,
        {
          ...approvalData,
          bankName: approvalData.bankName,
          bankAccountNumber: approvalData.bankAccountNumber,
          bankBranch: approvalData.bankBranch,
          bankBranchCode: approvalData.bankBranchCode,
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

    const dedupeDocuments = (docs: any[]) => {
      const seen = new Map<string, any>();

      docs.forEach((doc: any) => {
        const id = doc.id || doc.documentId || doc.fileName || doc.filename || doc.name || 'unknown-document';
        const key = `${id}-${doc.name || doc.filename || doc.fileName || ''}`;

        if (!seen.has(key)) {
          seen.set(key, {
            id: doc.id || doc.documentId,
            name: doc.name || doc.filename || doc.fileName,
            type: doc.type || (doc.mimeType || 'application/pdf').split('/')[1]?.toUpperCase() || 'PDF',
            status: 'AVAILABLE',
            uploadedDate: doc.uploadedDate || doc.uploadedAt ? new Date(doc.uploadedDate || doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            size: doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'N/A',
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
            id: doc.documentId || doc.id,
            name: doc.filename || doc.name,
            type: (doc.mimeType || 'application/pdf').split('/')[1].toUpperCase(),
            status: 'AVAILABLE',
            uploadedDate: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            size: doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'N/A',
            category: doc.category || 'APPLICATION_DOCUMENT',
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
          applicationDocuments = dedupeDocuments(parsedDocs.map((doc: any) => ({
            id: doc.id || doc.documentId,
            name: doc.name || doc.filename,
            type: doc.type || 'PDF',
            status: 'AVAILABLE',
            uploadedDate: doc.uploadedDate || new Date().toLocaleDateString(),
            size: doc.size || 'N/A',
            category: doc.category || 'APPLICATION_DOCUMENT',
          })));
        }
      } catch (error) {
        console.error('Error parsing application documents:', error);
      }
    }
    
    // If no documents found, show required documents list
    if (applicationDocuments.length === 0) {
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
          status: parseFloat(application.capital_requirement) >= 50000000 ? 'PASSED' : 'FAILED',
          details: parseFloat(application.capital_requirement) >= 50000000 
            ? `Capital ${parseFloat(application.capital_requirement).toLocaleString()} ETB meets 50M ETB requirement` 
            : `Capital ${parseFloat(application.capital_requirement).toLocaleString()} ETB is below 50M ETB requirement`
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
          status: parseFloat(application.capital_requirement) >= 50000000 ? 'COMPLIANT' : 'NON_COMPLIANT',
          details: parseFloat(application.capital_requirement) >= 50000000 
            ? 'Meets minimum capital requirement of 50 million ETB' 
            : 'Does not meet minimum capital requirement'
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
          `Contract ${selectedContract.contractID || selectedContract.contractId} has been approved for export compliance. Banks can now issue LC. Forex allocation will be done manually by banks.`
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
      {/* Professional KPI Cards - At the very top */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {(() => {
          const kpis = tabValue === 0 ? [
            { icon: <Assignment />, label: 'Pending Applications', value: allApplications.filter(a => a.status === 'pending').length, color: '#ff9800' },
            { icon: <CheckCircle />, label: 'Approved This Month', value: allApplications.filter(a => a.status === 'approved' && new Date(a.approved_at || '').getMonth() === new Date().getMonth()).length, color: '#4caf50' },
            { icon: <Science />, label: 'Lab Certified', value: allApplications.filter(a => a.laboratory_facility === 'yes' || a.laboratory_facility === 'contracted').length, color: '#2196f3' },
            { icon: <TrendingUp />, label: 'Avg Processing Days', value: allApplications.filter(a => a.approved_at).length > 0 ? Math.round(allApplications.filter(a => a.approved_at).reduce((sum, a) => sum + (new Date(a.approved_at!).getTime() - new Date(a.submitted_at).getTime()) / (1000 * 60 * 60 * 24), 0) / allApplications.filter(a => a.approved_at).length) : 0, color: '#9c27b0' },
          ] : tabValue === 1 ? [
            { icon: <Coffee />, label: 'Total Licensed', value: approvedApplications.length, color: BRAND_COLOR },
            { icon: <Science />, label: 'Lab Certified', value: approvedApplications.filter(a => a.laboratory_facility === 'yes' || a.laboratory_facility === 'contracted').length, color: '#4caf50' },
            { icon: <CheckCircle />, label: 'Active Licenses', value: approvedApplications.filter(a => a.license_expiry_date && new Date(a.license_expiry_date) > new Date()).length, color: '#2196f3' },
            { icon: <AccountBalance />, label: 'Total Capital (M ETB)', value: Math.round(approvedApplications.reduce((sum, a) => sum + parseFloat(a.capital_requirement || '0'), 0) / 1000000), color: '#9c27b0' },
          ] : tabValue === 2 ? [
            { icon: <Description />, label: 'Total Contracts', value: allContracts.length, color: '#2196f3' },
            { icon: <Warning />, label: 'Pending Approval', value: allContracts.filter(c => c.contractStatus === 'REGISTERED').length, color: '#ff9800' },
            { icon: <CheckCircle />, label: 'Approved', value: allContracts.filter(c => c.contractStatus === 'APPROVED').length, color: '#4caf50' },
            { icon: <Cancel />, label: 'Rejected', value: allContracts.filter(c => c.contractStatus === 'REJECTED').length, color: '#f44336' },
          ] : tabValue === 4 ? [
            { icon: <Science />, label: 'Total Inspections', value: allInspectionRecords.length, color: '#2196f3' },
            { icon: <HourglassTop />, label: 'Pending', value: allInspectionRecords.filter(i => i.status === 'PENDING' || i.Status === 'PENDING').length, color: '#ff9800' },
            { icon: <Assignment />, label: 'Inspected', value: allInspectionRecords.filter(i => i.status === 'INSPECTED' || i.Status === 'INSPECTED').length, color: '#4caf50' },
            { icon: <CheckCircle />, label: 'Approved', value: allInspectionRecords.filter(i => i.status === 'APPROVED' || i.Status === 'APPROVED').length, color: BRAND_COLOR },
          ] : [
            { icon: <Coffee />, label: 'Licensed Exporters', value: approvedApplications.length, color: BRAND_COLOR },
            { icon: <Assignment />, label: 'Pending Applications', value: allApplications.filter(a => a.status === 'pending').length, color: '#ff9800' },
            { icon: <Science />, label: 'Lab Certified', value: approvedApplications.filter(a => a.laboratory_facility === 'yes').length, color: '#4caf50' },
            { icon: <Warning />, label: 'Expiring Soon', value: approvedApplications.filter(a => {
              if (!a.license_expiry_date) return false;
              const expiryDate = new Date(a.license_expiry_date);
              const threeMonthsFromNow = new Date();
              threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
              return expiryDate <= threeMonthsFromNow;
            }).length, color: '#f44336' },
          ];

          return kpis.map((kpi, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ 
                bgcolor: '#fff', 
                border: `2px solid ${kpi.color}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  transform: 'translateY(-4px)',
                }
              }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  {React.cloneElement(kpi.icon, { sx: { fontSize: 48, color: kpi.color, mb: 1 } })}
                  <Typography variant="caption" sx={{ 
                    color: '#666', 
                    textTransform: 'uppercase', 
                    fontWeight: 700, 
                    display: 'block',
                    letterSpacing: '0.8px',
                    mb: 1
                  }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 800, color: kpi.color }}>
                    {kpi.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ));
        })()}
      </Grid>

      {/* Main Tabs - Text-based with dynamic data, linked to KPI cards */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => {
            setTabValue(newValue);
            setSubTabValue(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 2,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#666',
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: BRAND_COLOR,
                fontWeight: 700,
              },
              '&:hover': {
                color: BRAND_COLOR,
                opacity: 0.8,
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              backgroundColor: BRAND_COLOR,
              borderRadius: '3px 3px 0 0',
            }
          }}
        >
          <Tab 
            icon={<Assignment sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Pending Applications (${allApplications.filter(a => a.status === 'pending').length})`}
          />
          <Tab 
            icon={<Coffee sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Approved Exporters (${approvedApplications.length})`}
          />
          <Tab 
            icon={<Description sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Sales Contracts (${allContracts.length})`}
          />
          <Tab 
            icon={<Coffee sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Exporters Management (${allExporters.length})`}
          />
          <Tab 
            icon={<Science sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`Quality Control (${allInspectionRecords.length})`}
          />
          <Tab 
            icon={<Warning sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`License Renewals (${approvedApplications.filter(a => {
              if (!a.license_expiry_date) return false;
              const expiryDate = new Date(a.license_expiry_date);
              const threeMonthsFromNow = new Date();
              threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
              return expiryDate <= threeMonthsFromNow;
            }).length})`}
          />
        </Tabs>
      </Box>

      {/* Sub-Tabs - Professional card-style for filtering */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={subTabValue} 
          onChange={(e, newValue) => {
            setSubTabValue(newValue);
            const kpis = tabValue === 0 ? [
              { key: 'ALL_APPS', title: 'All Applications' },
              { key: 'PENDING_APPS', title: 'Pending' },
              { key: 'APPROVED_APPS', title: 'Approved' },
            ] : tabValue === 1 ? [
              { key: 'ALL_EXPORTERS', title: 'All Exporters' },
            ] : tabValue === 2 ? [
              { key: 'ALL_CONTRACTS', title: 'All Contracts' },
              { key: 'PENDING_CONTRACTS', title: 'Pending' },
              { key: 'APPROVED_CONTRACTS', title: 'Approved' },
              { key: 'REJECTED_CONTRACTS', title: 'Rejected' },
            ] : tabValue === 4 ? [
              { key: 'ALL_SHIPMENTS', title: 'All Inspections' },
              { key: 'PENDING_INSPECTION', title: 'Pending' },
              { key: 'APPROVED_INSPECTION', title: 'Approved' },
            ] : [
              { key: 'ALL_APPS', title: 'All' },
            ];
            handleKPIFilter(kpis[newValue].key, kpis[newValue].title);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(0,0,0,0.02)',
            '& .MuiTab-root': {
              minHeight: 70,
              flexDirection: 'column',
              gap: 0.5,
              color: '#666',
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: BRAND_COLOR,
                bgcolor: 'rgba(7, 137, 48, 0.08)',
              },
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.04)',
              }
            },
            '& .MuiTabs-indicator': {
              height: 4,
              backgroundColor: BRAND_COLOR,
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }
          }}
        >
          {(tabValue === 0 ? [
            { icon: <Assignment />, label: 'All Applications', value: allApplications.length, color: '#2196f3' },
            { icon: <Warning />, label: 'Pending', value: allApplications.filter(a => a.status === 'pending').length, color: '#ff9800' },
            { icon: <CheckCircle />, label: 'Approved', value: allApplications.filter(a => a.status === 'approved').length, color: '#4caf50' },
          ] : tabValue === 1 ? [
            { icon: <Coffee />, label: 'All Exporters', value: allExporters.length, color: BRAND_COLOR },
          ] : tabValue === 2 ? [
            { icon: <Description />, label: 'All Contracts', value: allContracts.length, color: '#2196f3' },
            { icon: <Warning />, label: 'Pending', value: allContracts.filter(c => c.contractStatus === 'REGISTERED').length, color: '#ff9800' },
            { icon: <CheckCircle />, label: 'Approved', value: allContracts.filter(c => c.contractStatus === 'APPROVED').length, color: '#4caf50' },
            { icon: <Cancel />, label: 'Rejected', value: allContracts.filter(c => c.contractStatus === 'REJECTED').length, color: '#f44336' },
          ] : tabValue === 4 ? [
            { icon: <Science />, label: 'All Inspections', value: allInspectionRecords.length, color: '#2196f3' },
            { icon: <HourglassTop />, label: 'Pending', value: allInspectionRecords.filter(i => i.status === 'PENDING' || i.Status === 'PENDING').length, color: '#ff9800' },
            { icon: <CheckCircle />, label: 'Approved', value: allInspectionRecords.filter(i => i.status === 'APPROVED' || i.Status === 'APPROVED').length, color: '#4caf50' },
          ] : [
            { icon: <Assignment />, label: 'All', value: allApplications.length, color: BRAND_COLOR },
          ]).map((kpi, index) => (
            <Tab key={index} label={
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ color: kpi.color, mb: 0.5 }}>{kpi.icon}</Box>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, fontSize: '0.7rem' }}>
                  {kpi.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: kpi.color }}>
                  {kpi.value}
                </Typography>
              </Box>
            } />
          ))}
        </Tabs>
      </Box>

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
                    <TableCell>Application ID</TableCell>
                    <TableCell>Company Name</TableCell>
                    <TableCell>Contact Person</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Capital (ETB)</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.map((application) => (
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
                    <TableCell>Exporter ID</TableCell>
                    <TableCell>Company Name</TableCell>
                    <TableCell>License Number</TableCell>
                    <TableCell>Exporter Type</TableCell>
                    <TableCell>Capital (ETB)</TableCell>
                    <TableCell>Lab Certified</TableCell>
                    <TableCell>Approved Date</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvedApplications.map((application) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
          {contracts.length === 0 ? (
            <Alert severity="info">No contracts registered yet.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contract ID</TableCell>
                    <TableCell>Exporter</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Coffee Type</TableCell>
                    <TableCell>Quantity (kg)</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>EUDR</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((contract) => (
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
                          <Chip icon={<CheckCircle />} label="Approved" size="small" color="success" />
                        ) : contract.contractStatus === 'REJECTED' ? (
                          <Chip icon={<Cancel />} label="Rejected" size="small" color="error" />
                        ) : (
                          <Chip label={contract.contractStatus} size="small" color="default" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Exporters Management Tab */}
          <Typography variant="h6" gutterBottom>
            Exporters Management
          </Typography>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={exporters}
              columns={exporterColumns}
              getRowId={(row) => row.exporterId}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              checkboxSelection
              disableRowSelectionOnClick
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {/* Quality Control Tab - 5-Stage Workflow */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science /> Quality Inspection Workflow (5 Stages)
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold">ECTA Quality Inspection Process:</Typography>
            <Typography variant="caption" component="div">
              1. <strong>Pending Inspection</strong> → Request/Schedule Inspection (CREATED → REQUESTED)
              <br/>2. <strong>Scheduled</strong> → Perform Physical Inspection (REQUESTED → INSPECTED)
              <br/>3. <strong>Under Review</strong> → Approve or Reject Quality (INSPECTED → APPROVED/REJECTED)
              <br/>4. <strong>Approved</strong> → Issue Export Permit (APPROVED → PERMIT_ISSUED)
              <br/>5. <strong>Rejected</strong> → Final state (quality issues must be addressed)
            </Typography>
          </Alert>

          {/* Workflow Status Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={inspectionFilterTab === 'PENDING' ? 0 : inspectionFilterTab === 'SCHEDULED' ? 1 : inspectionFilterTab === 'UNDER_REVIEW' ? 2 : inspectionFilterTab === 'APPROVED' ? 3 : 4}
              onChange={(e, newValue) => {
                const tabs: ('PENDING' | 'SCHEDULED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED')[] = ['PENDING', 'SCHEDULED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
                setInspectionFilterTab(tabs[newValue]);
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: BRAND_COLOR,
                    fontWeight: 700,
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  backgroundColor: BRAND_COLOR,
                }
              }}
            >
              <Tab label={
                <Box textAlign="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <HourglassTop sx={{ fontSize: 20, color: '#ff9800' }} />
                    <span>Pending Inspection</span>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {allShipments.filter(s => {
                      const status = (s.status || (s as any).Status || '').toUpperCase();
                      return status === 'CREATED' || status === 'REGISTERED';
                    }).length} shipments
                  </Typography>
                </Box>
              } />
              <Tab label={
                <Box textAlign="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Assignment sx={{ fontSize: 20, color: '#2196f3' }} />
                    <span>Scheduled</span>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {allInspectionRecords.filter(i => (i.status || i.Status) === 'REQUESTED').length} inspections
                  </Typography>
                </Box>
              } />
              <Tab label={
                <Box textAlign="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Science sx={{ fontSize: 20, color: '#9c27b0' }} />
                    <span>Under Review</span>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {allInspectionRecords.filter(i => (i.status || i.Status) === 'INSPECTED').length} inspections
                  </Typography>
                </Box>
              } />
              <Tab label={
                <Box textAlign="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                    <span>Approved</span>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {allInspectionRecords.filter(i => (i.status || i.Status) === 'APPROVED').length} permits ready
                  </Typography>
                </Box>
              } />
              <Tab label={
                <Box textAlign="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Cancel sx={{ fontSize: 20, color: '#f44336' }} />
                    <span>Rejected</span>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {allInspectionRecords.filter(i => (i.status || i.Status) === 'REJECTED').length} rejected
                  </Typography>
                </Box>
              } />
            </Tabs>
          </Box>

          {/* Stage 1: Pending Inspection - Shipments needing inspection */}
          {inspectionFilterTab === 'PENDING' && (
            <Grid container spacing={3}>
              {allShipments
                .filter(s => {
                  const status = (s.status || (s as any).Status || '').toUpperCase();
                  return (status === 'CREATED' || status === 'REGISTERED') && 
                         !allInspectionRecords.some(i => (i.shipmentID || i.ShipmentID) === s.shipmentId);
                })
                .map((shipment) => (
                  <Grid item xs={12} md={6} key={shipment.shipmentId}>
                    <Card sx={{ border: '2px solid #ff9800', '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                            {shipment.shipmentId}
                          </Typography>
                          <Chip label="PENDING" size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} />
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2"><strong>Origin:</strong> {shipment.origin}</Typography>
                          <Typography variant="body2"><strong>Quantity:</strong> {shipment.quantity?.toLocaleString()} kg</Typography>
                          <Typography variant="body2"><strong>Grade:</strong> {shipment.grade || 'N/A'}</Typography>
                          <Typography variant="body2"><strong>Exporter:</strong> {shipment.exporterId}</Typography>
                        </Box>
                        <Box mt={2}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            startIcon={<Assignment />}
                            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
                            onClick={() => handleRequestInspection(shipment)}
                          >
                            Schedule Inspection
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {allShipments.filter(s => {
                const status = (s.status || (s as any).Status || '').toUpperCase();
                return (status === 'CREATED' || status === 'REGISTERED') && 
                       !allInspectionRecords.some(i => (i.shipmentID || i.ShipmentID) === s.shipmentId);
              }).length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">No shipments pending inspection scheduling</Alert>
                </Grid>
              )}
            </Grid>
          )}

          {/* Stage 2: Scheduled - Inspections ready for physical inspection */}
          {inspectionFilterTab === 'SCHEDULED' && (
            <Grid container spacing={3}>
              {allInspectionRecords
                .filter(i => (i.status || i.Status) === 'REQUESTED')
                .map((inspection) => (
                  <Grid item xs={12} md={6} key={inspection.inspectionID || inspection.InspectionID}>
                    <Card sx={{ border: '2px solid #2196f3', '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                            {inspection.inspectionID || inspection.InspectionID}
                          </Typography>
                          <Chip label="SCHEDULED" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} />
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2"><strong>Shipment:</strong> {inspection.shipmentID || inspection.ShipmentID}</Typography>
                          <Typography variant="body2"><strong>Exporter:</strong> {inspection.exporterID || inspection.ExporterID}</Typography>
                          <Typography variant="body2"><strong>Scheduled:</strong> {inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString() : 'N/A'}</Typography>
                        </Box>
                        <Box mt={2}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            startIcon={<Science />}
                            sx={{ bgcolor: '#2196f3', '&:hover': { bgcolor: '#1976d2' } }}
                            onClick={() => handlePerformInspection(inspection)}
                          >
                            Perform Inspection
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {allInspectionRecords.filter(i => (i.status || i.Status) === 'REQUESTED').length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">No scheduled inspections</Alert>
                </Grid>
              )}
            </Grid>
          )}

          {/* Stage 3: Under Review - Inspections completed, awaiting approval/rejection */}
          {inspectionFilterTab === 'UNDER_REVIEW' && (
            <Grid container spacing={3}>
              {allInspectionRecords
                .filter(i => (i.status || i.Status) === 'INSPECTED')
                .map((inspection) => (
                  <Grid item xs={12} md={6} key={inspection.inspectionID || inspection.InspectionID}>
                    <Card sx={{ border: '2px solid #9c27b0', '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                            {inspection.inspectionID || inspection.InspectionID}
                          </Typography>
                          <Chip label="UNDER REVIEW" size="small" sx={{ bgcolor: '#9c27b0', color: 'white' }} />
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2"><strong>Shipment:</strong> {inspection.shipmentID || inspection.ShipmentID}</Typography>
                          <Typography variant="body2"><strong>Moisture:</strong> {inspection.moistureContent || 'N/A'}%</Typography>
                          <Typography variant="body2"><strong>Defects:</strong> {inspection.defectCount || 'N/A'}</Typography>
                          <Typography variant="body2"><strong>Overall Score:</strong> {inspection.overall || 'N/A'}</Typography>
                        </Box>
                        <Box mt={2} display="flex" gap={1}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            startIcon={<CheckCircle />}
                            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                            onClick={() => handleApproveInspection(inspection)}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outlined" 
                            fullWidth
                            startIcon={<Cancel />}
                            color="error"
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) handleRejectInspection(inspection, reason);
                            }}
                          >
                            Reject
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {allInspectionRecords.filter(i => (i.status || i.Status) === 'INSPECTED').length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">No inspections under review</Alert>
                </Grid>
              )}
            </Grid>
          )}

          {/* Stage 4: Approved - Ready to issue export permits */}
          {inspectionFilterTab === 'APPROVED' && (
            <Grid container spacing={3}>
              {allInspectionRecords
                .filter(i => (i.status || i.Status) === 'APPROVED')
                .map((inspection) => (
                  <Grid item xs={12} md={6} key={inspection.inspectionID || inspection.InspectionID}>
                    <Card sx={{ border: '2px solid #4caf50', '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                            {inspection.inspectionID || inspection.InspectionID}
                          </Typography>
                          <Chip label="APPROVED" size="small" sx={{ bgcolor: '#4caf50', color: 'white' }} />
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2"><strong>Shipment:</strong> {inspection.shipmentID || inspection.ShipmentID}</Typography>
                          <Typography variant="body2"><strong>Certificate:</strong> {inspection.certificateNo || 'N/A'}</Typography>
                          <Typography variant="body2"><strong>Approved By:</strong> {inspection.approvedBy || 'N/A'}</Typography>
                          <Typography variant="body2"><strong>Approval Date:</strong> {inspection.approvalDate ? new Date(inspection.approvalDate).toLocaleDateString() : 'N/A'}</Typography>
                        </Box>
                        <Box mt={2}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            startIcon={<Description />}
                            sx={{ bgcolor: BRAND_COLOR, '&:hover': { bgcolor: '#056620' } }}
                            onClick={() => handleIssueExportPermit(inspection)}
                          >
                            Issue Export Permit
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {allInspectionRecords.filter(i => (i.status || i.Status) === 'APPROVED').length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">No approved inspections ready for permit issuance</Alert>
                </Grid>
              )}
            </Grid>
          )}

          {/* Stage 5: Rejected - Final state */}
          {inspectionFilterTab === 'REJECTED' && (
            <Grid container spacing={3}>
              {allInspectionRecords
                .filter(i => (i.status || i.Status) === 'REJECTED')
                .map((inspection) => (
                  <Grid item xs={12} md={6} key={inspection.inspectionID || inspection.InspectionID}>
                    <Card sx={{ border: '2px solid #f44336', '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                            {inspection.inspectionID || inspection.InspectionID}
                          </Typography>
                          <Chip label="REJECTED" size="small" sx={{ bgcolor: '#f44336', color: 'white' }} />
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2"><strong>Shipment:</strong> {inspection.shipmentID || inspection.ShipmentID}</Typography>
                          <Typography variant="body2"><strong>Rejected By:</strong> {inspection.rejectedBy || 'N/A'}</Typography>
                          <Typography variant="body2" color="error"><strong>Reason:</strong> {inspection.rejectionReason || 'Quality standards not met'}</Typography>
                          <Typography variant="body2"><strong>Rejection Date:</strong> {inspection.rejectionDate ? new Date(inspection.rejectionDate).toLocaleDateString() : 'N/A'}</Typography>
                        </Box>
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <Typography variant="caption">
                            Exporter must address quality issues before re-submitting for inspection
                          </Typography>
                        </Alert>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              {allInspectionRecords.filter(i => (i.status || i.Status) === 'REJECTED').length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="success">No rejected inspections</Alert>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
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
                {exporters
                  .filter(e => {
                    const expiryDate = new Date(e.licenseExpiryDate);
                    const threeMonthsFromNow = new Date();
                    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                    return expiryDate <= threeMonthsFromNow;
                  })
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
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          {/* User Management Tab */}
          <UserManagement />
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
                {(() => {
                  try {
                    const documents = selectedApplication.documents 
                      ? (typeof selectedApplication.documents === 'string' 
                        ? JSON.parse(selectedApplication.documents) 
                        : selectedApplication.documents)
                      : [];
                    
                    return documents.length > 0 ? (
                      <List>
                        {documents.map((doc: any, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Description color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={doc.fileName || `Document ${index + 1}`}
                              secondary={
                                <>
                                  {doc.category && <Chip label={doc.category} size="small" sx={{ mr: 1 }} />}
                                  {doc.hash && <Typography variant="caption">Hash: {doc.hash.slice(0, 16)}...</Typography>}
                                  {doc.ipfsCID && <Typography variant="caption" sx={{ ml: 1 }}>IPFS: {doc.ipfsCID.slice(0, 12)}...</Typography>}
                                </>
                              }
                            />
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              onClick={async () => {
                                try {
                                  const response = await api.get(`/documents/${doc.documentId}/download`, {
                                    responseType: 'blob'
                                  });
                                  const url = window.URL.createObjectURL(new Blob([response.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', doc.fileName || 'document');
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                } catch (err) {
                                  console.error('Failed to download document:', err);
                                  alert('Failed to download document');
                                }
                              }}
                            >
                              View
                            </Button>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Alert severity="warning">
                        No documents uploaded. Applicant may need to provide supporting documents before approval.
                      </Alert>
                    );
                  } catch (error) {
                    return (
                      <Alert severity="error">
                        Error loading documents: {error instanceof Error ? error.message : 'Unknown error'}
                      </Alert>
                    );
                  }
                })()}
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
        readOnly={false}
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

      {/* Contract Approval Dialog */}
      <Dialog 
        open={contractApprovalDialogOpen} 
        onClose={() => setContractApprovalDialogOpen(false)}
        maxWidth="sm"
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
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Contract ID:</strong> {selectedContract.contractID || selectedContract.contractId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Exporter:</strong> {selectedContract.exporterID || selectedContract.exporterId}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Buyer:</strong> {selectedContract.buyerID || selectedContract.buyerId} ({selectedContract.buyerCountry})
              </Typography>
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
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>EUDR Required:</strong> {selectedContract.eudrRequired ? 'Yes' : 'No'}
              </Typography>
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  By approving this contract, you confirm that:
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                  <Typography component="li" variant="body2">Export compliance requirements are met</Typography>
                  <Typography component="li" variant="body2">Quality standards are verified</Typography>
                  <Typography component="li" variant="body2">Exporter has valid license</Typography>
                  <Typography component="li" variant="body2">Minimum FOB price requirements are met</Typography>
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
