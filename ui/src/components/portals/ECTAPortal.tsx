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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add,
  Edit,
  Visibility,
  CheckCircle,
  Warning,
  Science,
  Assignment,
  Coffee,
  Download,
  Upload,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { Exporter, CoffeeShipment, ExporterFormData } from '@/types';

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
  comments?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  exporter_id?: string;
  ecta_license_number?: string;
  license_expiry_date?: string;
}

const ECTAPortal: React.FC = () => {
  // ECTA Brand Colors
  const BRAND_COLOR = '#078930';  // ECTA Green
  const SECONDARY_COLOR = '#6d4c41';  // Coffee Brown
  
  const [tabValue, setTabValue] = useState(0);
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [shipments, setShipments] = useState<CoffeeShipment[]>([]);
  const [applications, setApplications] = useState<ExporterApplication[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<ExporterApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExporter, setSelectedExporter] = useState<Exporter | null>(null);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ExporterApplication | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalData, setApprovalData] = useState({
    exporterId: '',
    ectaLicenseNumber: '',
    licenseExpiryDate: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ title: '', message: '', type: 'success' as 'success' | 'error' });
  const [searchTerm, setSearchTerm] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ExporterFormData>({
    resolver: yupResolver(exporterSchema),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load each data source independently so one failure doesn't affect others
      const exportersPromise = api.getExporters().catch(err => {
        console.error('Failed to load exporters:', err);
        return { success: false, data: [] };
      });
      
      const shipmentsPromise = api.getShipments({ limit: 100 }).catch(err => {
        console.error('Failed to load shipments:', err);
        return { success: false, data: [] };
      });
      
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

      console.log('Applications Response:', applicationsRes);
      console.log('Applications Data:', applicationsRes.data);
      console.log('Applications Array:', applicationsRes.data?.data);

      if (exportersRes.success) setExporters(exportersRes.data || []);
      if (shipmentsRes.success) setShipments(shipmentsRes.data || []);
      
      // Handle applications response - applicationsRes is AxiosResponse
      const appsData = applicationsRes.data?.data;
      if (appsData && Array.isArray(appsData)) {
        console.log('Setting applications:', appsData);
        setApplications(appsData);
      } else {
        console.log('Applications condition failed:', {
          hasResponseData: !!applicationsRes.data,
          hasDataArray: !!appsData,
          isArray: Array.isArray(appsData),
          appsData: appsData,
        });
        setApplications([]);
      }

      // Handle approved applications
      const approvedAppsData = approvedApplicationsRes.data?.data;
      if (approvedAppsData && Array.isArray(approvedAppsData)) {
        console.log('Setting approved applications:', approvedAppsData);
        setApprovedApplications(approvedAppsData);
      } else {
        setApprovedApplications([]);
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
      alert('Failed to update license status. Please try again.');
    }
  };

  const handleApproveApplication = async () => {
    if (!selectedApplication) return;
    
    try {
      const response = await api.post(
        `/exporters/exporter-applications/${selectedApplication.application_id}/approve`,
        approvalData
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

The exporter account is now active and can start using the system.`,
          type: 'success'
        });
        setNotificationDialogOpen(true);
        
        setSelectedApplication(null);
        setApprovalData({
          exporterId: '',
          ectaLicenseNumber: '',
          licenseExpiryDate: '',
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
    const total = exporters.length;
    const active = exporters.filter(e => e.laboratoryCertified).length;
    const expiringSoon = exporters.filter(e => {
      const expiryDate = new Date(e.licenseExpiryDate);
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
            brandColor={BRAND_COLOR}
            secondaryColor={SECONDARY_COLOR}
          >
            Register Exporter
          </AnimatedButton>
        </Box>
      </Box>

      {/* Statistics Cards - Modernized with DashboardKPI */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Exporters"
            value={stats.total}
            icon={<Coffee />}
            trend="up"
            trendValue="+5.2%"
            brandColor={BRAND_COLOR}
            onClick={() => setTabValue(2)}
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
            title="Approved Exporters"
            value={stats.approvedCount}
            icon={<CheckCircle />}
            trend="up"
            trendValue="+12%"
            brandColor="#4caf50"
            onClick={() => setTabValue(1)}
            subtitle="Active licenses"
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
                            onClick={() => setSelectedApplication(application)}
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

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Quality Control Dashboard
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ModernCard brandColor={BRAND_COLOR}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pending Quality Inspections
                  </Typography>
                  {shipments
                    .filter(s => s.status === 'CREATED')
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
                          >
                            Start Inspection
                          </AnimatedButton>
                        </Box>
                      </Box>
                    ))}
                </CardContent>
              </ModernCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <ModernCard brandColor={BRAND_COLOR}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quality Statistics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Grade 1 Coffee: 85%
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      <Box sx={{ width: '85%', bgcolor: '#4caf50', height: 8, borderRadius: 1 }} />
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Grade 2 Coffee: 12%
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      <Box sx={{ width: '12%', bgcolor: '#ff9800', height: 8, borderRadius: 1 }} />
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Rejected: 3%
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      <Box sx={{ width: '3%', bgcolor: '#f44336', height: 8, borderRadius: 1 }} />
                    </Box>
                  </Box>
                </CardContent>
              </ModernCard>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
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

        <TabPanel value={tabValue} index={5}>
          {/* User Management Tab */}
          <UserManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
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
        <form onSubmit={handleSubmit(handleCreateExporter as any)}>
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
              brandColor={BRAND_COLOR}
              secondaryColor={SECONDARY_COLOR}
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
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Exporter Application</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Assign exporter ID and license number to approve this application.
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
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
            <Grid item xs={12}>
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
            <Grid item xs={12}>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => {
            setApproveDialogOpen(false);
            setApprovalData({ exporterId: '', ectaLicenseNumber: '', licenseExpiryDate: '' });
          }} variant="outlined">
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained"
            brandColor="#4caf50"
            onClick={handleApproveApplication}
            disabled={!approvalData.exporterId || !approvalData.ectaLicenseNumber || !approvalData.licenseExpiryDate}
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
    </Box>
  );
};

export default ECTAPortal;