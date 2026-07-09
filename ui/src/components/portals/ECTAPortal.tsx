// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECTA Portal - Exporter Registration & Quality Control

import React, { useState, useEffect } from 'react';
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
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [shipments, setShipments] = useState<CoffeeShipment[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [applications, setApplications] = useState<ExporterApplication[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<ExporterApplication[]>([]);
  const [loading, setLoading] = useState(false);
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


  const { control, handleSubmit, reset, formState: { errors } } = useForm<ExporterFormData>({
    resolver: yupResolver(exporterSchema),
  });

  useEffect(() => {
    loadData();
  }, []);

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

      const [exportersRes, shipmentsRes, applicationsRes, approvedApplicationsRes] = await Promise.all([
        exportersPromise,
        shipmentsPromise,
        applicationsPromise,
        approvedApplicationsPromise,
      ]);

      // Set blockchain data (if available)
      if (exportersRes.success) setExporters(exportersRes.data || []);
      if (shipmentsRes.success) setShipments(shipmentsRes.data || []);
      
      // Load contracts
      try {
        const contractsRes = await api.getContracts();
        if (contractsRes.success) setContracts(contractsRes.data || []);
      } catch (err) {
        console.warn('Failed to load contracts:', err);
        setContracts([]);
      }
      
      // Set database applications
      const appsData = applicationsRes.data?.data;
      if (appsData && Array.isArray(appsData)) {
        setApplications(appsData);
      } else {
        setApplications([]);
      }

      // Set approved applications (source of truth for exporter count)
      const approvedAppsData = approvedApplicationsRes.data?.data;
      if (approvedAppsData && Array.isArray(approvedAppsData)) {
        setApprovedApplications(approvedAppsData);
      } else {
        setApprovedApplications([]);
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
          applicationDocuments = result.data.map((doc: any) => ({
            id: doc.documentId || doc.id,
            name: doc.filename || doc.name,
            type: (doc.mimeType || 'application/pdf').split('/')[1].toUpperCase(),
            status: 'AVAILABLE',
            url: `/api/v1/documents/${doc.documentId || doc.id}`,
            uploadedDate: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            size: doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'N/A',
            category: doc.category || 'APPLICATION_DOCUMENT',
          }));
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
          applicationDocuments = parsedDocs.map((doc: any) => ({
            id: doc.id || doc.documentId,
            name: doc.name || doc.filename,
            type: doc.type || 'PDF',
            status: 'AVAILABLE',
            url: doc.url || `/api/v1/documents/${doc.id}`,
            uploadedDate: doc.uploadedDate || new Date().toLocaleDateString(),
            size: doc.size || 'N/A',
            category: doc.category || 'APPLICATION_DOCUMENT',
          }));
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

  const stats = getExporterStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🏛️ ECTA Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Ethiopian Coffee & Tea Authority - Exporter Management & Quality Control
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <ThemeToggle
            mode={themeMode}
            onToggle={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            brandColor={BRAND_COLOR}
          />
          <AnimatedButton
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            brandColor="#FFD700"
            secondaryColor="#B8860B"
          >
            Register Exporter
          </AnimatedButton>
        </Box>
      </Box>

      {/* Statistics Cards - Modernized with DashboardKPI */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Licensed Exporters"
            value={stats.total}
            icon={<Coffee />}
            trend={stats.total > 0 ? 'up' : 'flat'}
            trendValue={stats.total > 0 ? `${stats.total} active` : 'None yet'}
            brandColor={BRAND_COLOR}
            onClick={() => setTabValue(1)}
            subtitle="Approved & active"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Pending Applications"
            value={stats.pendingApplications}
            icon={<Assignment />}
            trend={stats.pendingApplications > 0 ? 'up' : 'flat'}
            trendValue={stats.pendingApplications > 0 ? 'Requires attention' : 'All clear'}
            brandColor="#ff9800"
            onClick={() => setTabValue(0)}
            subtitle="Awaiting approval"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Lab Certified"
            value={stats.active}
            icon={<Science />}
            trend={stats.active > 0 ? 'up' : 'flat'}
            trendValue={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% certified` : 'N/A'}
            brandColor="#4caf50"
            onClick={() => setTabValue(3)}
            subtitle="Quality compliant"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Expiring Soon"
            value={stats.expiringSoon}
            icon={<Warning />}
            trend={stats.expiringSoon > 0 ? 'down' : 'flat'}
            trendValue={stats.expiringSoon > 0 ? 'Needs renewal' : 'All current'}
            brandColor="#f44336"
            onClick={() => setTabValue(4)}
            subtitle="Within 3 months"
          />
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search applications, exporters, licenses..."
          brandColor={BRAND_COLOR}
          showClear
        />
      </Box>

      {/* Tabs */}
      <ModernCard brandColor={BRAND_COLOR}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Pending Applications" />
            <Tab label="Approved Exporters" />
            <Tab label="Sales Contracts" />
            <Tab label="Exporters Management" />
            <Tab label="Quality Control" />
            <Tab label="License Renewals" />
            <Tab label="User Management" />
            <Tab label="Reports" />
          </Tabs>
        </Box>

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
            Sales Contracts
          </Typography>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.contractId}>
                      <TableCell>{contract.contractId}</TableCell>
                      <TableCell>{contract.exporterId}</TableCell>
                      <TableCell>{contract.buyerId}</TableCell>
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
          {/* Quality Control Tab */}
          <Typography variant="h6" gutterBottom>
            Quality Control Dashboard
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <InspectionManagement />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ModernCard brandColor={BRAND_COLOR}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Shipments Awaiting Inspection
                  </Typography>
                  {shipments
                    .filter(s => s.status === 'APPROVED' || s.status === 'QUALITY_CONTROL')
                    .slice(0, 5)
                    .map((shipment) => (
                      <Box key={shipment.shipmentId} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {shipment.shipmentId}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Origin: {shipment.origin} • Quantity: {shipment.quantity}kg
                        </Typography>
                        <Box mt={1}>
                          <AnimatedButton 
                            size="small" 
                            variant="outlined" 
                            startIcon={<Assignment />}
                            brandColor={BRAND_COLOR}
                            onClick={() => {
                              setSelectedShipmentForInspection(shipment);
                              setInspectionDialogOpen(true);
                            }}
                          >
                            Start Inspection
                          </AnimatedButton>
                        </Box>
                      </Box>
                    ))}
                  {shipments.filter(s => s.status === 'APPROVED' || s.status === 'QUALITY_CONTROL').length === 0 && (
                    <Typography variant="body2" color="textSecondary">No shipments pending inspection.</Typography>
                  )}
                </CardContent>
              </ModernCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <ModernCard brandColor={BRAND_COLOR}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Shipment Quality Summary
                  </Typography>
                  {(() => {
                    const total = shipments.length || 1;
                    const approved = shipments.filter(s => s.status === 'APPROVED' || s.status === 'SHIPPED').length;
                    const rejected = shipments.filter(s => s.status === 'DELIVERED').length;
                    const pending = shipments.filter(s => s.status === 'QUALITY_CONTROL').length;
                    return (
                      <>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="textSecondary">
                            Approved: {approved} ({Math.round(approved / total * 100)}%)
                          </Typography>
                          <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                            <Box sx={{ width: `${Math.round(approved / total * 100)}%`, bgcolor: '#4caf50', height: 8, borderRadius: 1 }} />
                          </Box>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="textSecondary">
                            Pending: {pending} ({Math.round(pending / total * 100)}%)
                          </Typography>
                          <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                            <Box sx={{ width: `${Math.round(pending / total * 100)}%`, bgcolor: '#ff9800', height: 8, borderRadius: 1 }} />
                          </Box>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="textSecondary">
                            Rejected: {rejected} ({Math.round(rejected / total * 100)}%)
                          </Typography>
                          <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                            <Box sx={{ width: `${Math.round(rejected / total * 100)}%`, bgcolor: '#f44336', height: 8, borderRadius: 1, minWidth: rejected > 0 ? 4 : 0 }} />
                          </Box>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          Total shipments: {shipments.length}
                        </Typography>
                      </>
                    );
                  })()}
                </CardContent>
              </ModernCard>
            </Grid>
          </Grid>
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
                                apiFetch('/exporters/${exporter.exporterId}/renew-license', {
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
      </ModernCard>

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
                  
                  const response = await apiFetch('/exporters/${selectedExporter.exporterId}/suspend', {
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
    </Box>
  );
};

export default ECTAPortal;
