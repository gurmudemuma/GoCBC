// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Admin User Management Component - Modular Build

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Search,
  Refresh,
  Person,
  Business,
  Edit,
  Delete,
  Visibility,
  Block,
  CheckCircle,
  Lock,
  Email,
  Phone,
  Save,
  Cancel,
  History,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getRolesByOrganization, ADMIN_CONFIG } from '@/config/organizationConfig';
import { useForm, Controller } from 'react-hook-form';
import api from '@/utils/api';
import BlockchainIdentityPanel from './BlockchainIdentityPanel';

import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  organization: string;
  exporter_id?: string;
  ecta_license?: string;
  phone?: string;
  permissions: string[];
  status: string;
  created_at: string;
  last_login?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-details-tabpanel-${index}`}
      aria-labelledby={`user-details-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

interface UserFormData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
  organization: string;
  exporter_id?: string;
  ecta_license?: string;
  phone?: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  // Memoize role options for FILTER dropdown (table filtering) - based on current user
  const roleFilterOptions = React.useMemo(() => {
    if (currentUser?.role === 'ADMIN') {
      // Super Admin can filter by ALL roles (organizations + specific job titles)
      return [
        { value: 'ADMIN', label: 'Super Administrator' },
        { value: 'ECTA', label: 'ECTA Portal Administrator' },
        { value: 'ECX', label: 'ECX Portal Administrator' },
        { value: 'NBE', label: 'NBE Portal Administrator' },
        { value: 'BANKS', label: 'Banks Portal Administrator' },
        { value: 'CUSTOMS', label: 'Customs Portal Administrator' },
        { value: 'SHIPPING', label: 'Shipping Portal Administrator' },
        { value: 'EXPORTER', label: 'Exporter' },
        // ECTA roles
        { value: 'Quality Inspector', label: 'Quality Inspector (ECTA)' },
        { value: 'Lab Analyst', label: 'Lab Analyst (ECTA)' },
        { value: 'Phytosanitary Officer', label: 'Phytosanitary Officer (ECTA)' },
        { value: 'License Officer', label: 'License Officer (ECTA)' },
        { value: 'Permit Officer', label: 'Permit Officer (ECTA)' },
        { value: 'ECTA Officer', label: 'ECTA Officer' },
        // ECX roles
        { value: 'Grading Officer', label: 'Grading Officer (ECX)' },
        { value: 'Warehouse Officer', label: 'Warehouse Officer (ECX)' },
        { value: 'Registration Officer', label: 'Registration Officer (ECX)' },
        { value: 'Release Officer', label: 'Release Officer (ECX)' },
        { value: 'ECX Officer', label: 'ECX Officer' },
        // NBE roles
        { value: 'NBE Officer', label: 'NBE Officer' },
        { value: 'Forex Officer', label: 'Forex Officer (NBE)' },
        { value: 'Screening Officer', label: 'Screening Officer (NBE)' },
        { value: 'Compliance Officer', label: 'Compliance Officer (NBE)' },
        { value: 'Exchange Rate Officer', label: 'Exchange Rate Officer (NBE)' },
        { value: 'Settlement Officer', label: 'Settlement Officer (NBE)' },
        // Banks roles
        { value: 'Bank Officer', label: 'Bank Officer' },
        { value: 'Branch Manager', label: 'Branch Manager (Banks)' },
        { value: 'Trade Finance Officer', label: 'Trade Finance Officer (Banks)' },
        { value: 'Credit Analyst', label: 'Credit Analyst (Banks)' },
        { value: 'LC Officer', label: 'LC Officer (Banks)' },
        // Customs roles
        { value: 'Customs Officer', label: 'Customs Officer' },
        { value: 'Inspection Officer', label: 'Inspection Officer (Customs)' },
        { value: 'Clearance Officer', label: 'Clearance Officer (Customs)' },
        { value: 'Risk Analyst', label: 'Risk Analyst (Customs)' },
        { value: 'ASYCUDA Officer', label: 'ASYCUDA Officer (Customs)' },
        { value: 'Duty Assessment Officer', label: 'Duty Assessment Officer (Customs)' },
        // Shipping roles
        { value: 'Logistics Officer', label: 'Logistics Officer (Shipping)' },
        { value: 'Documentation Officer', label: 'Documentation Officer (Shipping)' },
        { value: 'Operations Manager', label: 'Operations Manager (Shipping)' },
        { value: 'Shipping Coordinator', label: 'Shipping Coordinator (Shipping)' },
        { value: 'Freight Forwarder', label: 'Freight Forwarder (Shipping)' },
      ];
    }
    return getRolesByOrganization(currentUser?.organization || '');
  }, [currentUser?.role, currentUser?.organization]);
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [detailsTab, setDetailsTab] = useState(0);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Form
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<UserFormData>();
  const watchRole = watch('role');
  const watchOrganization = watch('organization');
  
  // Dynamic role options for CREATE dialog - based on selected organization in form
  const createDialogRoleOptions = React.useMemo(() => {
    // Super admin can see ALL roles from ALL organizations
    if (currentUser?.role === 'ADMIN') {
      const allRoles = ADMIN_CONFIG.allRoles;
      console.log('🔵 Super Admin: Showing all roles from all organizations:', allRoles.length);
      return allRoles;
    }
    
    // Organization admins can only see roles from their organization
    const selectedOrg = watchOrganization || currentUser?.organization || '';
    
    if (!selectedOrg) {
      console.log('⚠️ No organization selected, returning empty role options');
      return [];
    }
    
    const roles = getRolesByOrganization(selectedOrg);
    console.log('🔵 Role options for organization', selectedOrg, ':', roles);
    return roles;
  }, [watchOrganization, currentUser?.organization, currentUser?.role]);
  // Load users
  useEffect(() => {
    loadUsers();
  }, [page, pageSize, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/users?${params.toString()}`);
      
      if (response.data.success) {
        const parsedUsers = response.data.data.map((user: any) => ({
          ...user,
          permissions: typeof user.permissions === 'string' 
            ? JSON.parse(user.permissions || '[]') 
            : (user.permissions || [])
        }));
        setUsers(parsedUsers);
        setTotalUsers(parseInt(response.data.pagination.total) || 0);
        
        console.log('Loaded users:', parsedUsers.length, 'Total:', response.data.pagination.total);
        console.log('User IDs:', parsedUsers.map((u: any) => ({ id: u.id, username: u.username })));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      showSnackbar('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Professional DataGrid columns with enhanced styling
  const columns: GridColDef[] = [
    {
      field: 'username',
      headerName: 'Username',
      width: 160,
      headerClassName: 'professional-header',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Person fontSize="small" />
          </Box>
          <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'full_name',
      headerName: 'Full Name',
      width: 200,
      headerClassName: 'professional-header',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'email',
      headerName: 'Email Address',
      width: 220,
      headerClassName: 'professional-header',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 140,
      headerClassName: 'professional-header',
      renderCell: (params) => {
        const roleColors: Record<string, string> = {
          ADMIN: '#d32f2f',
          ECTA: '#1976d2',
          ECX: '#388e3c',
          NBE: '#f57c00',
          BANKS: '#7b1fa2',
          CUSTOMS: '#0097a7',
          SHIPPING: '#5d4037',
          EXPORTER: '#689f38',
        };
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              bgcolor: roleColors[params.value] || '#666',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: '6px',
            }}
          />
        );
      },
    },
    {
      field: 'organization',
      headerName: 'Organization',
      width: 160,
      headerClassName: 'professional-header',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={500} noWrap sx={{ color: 'text.primary' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      headerClassName: 'professional-header',
      renderCell: (params) => {
        const isActive = params.value === 'active';
        return (
          <Chip
            icon={isActive ? <CheckCircle sx={{ fontSize: 16 }} /> : <Block sx={{ fontSize: 16 }} />}
            label={params.value.charAt(0).toUpperCase() + params.value.slice(1)}
            size="small"
            sx={{
              bgcolor: isActive ? '#e8f5e9' : '#fff3e0',
              color: isActive ? '#2e7d32' : '#f57c00',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: '6px',
              '& .MuiChip-icon': {
                color: isActive ? '#2e7d32' : '#f57c00',
              },
            }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 280,
      sortable: false,
      headerClassName: 'professional-header',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const isSuperAdmin = currentUser?.role === 'ADMIN';
        const isPortalAdmin = ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING'].includes(params.row.role);
        const canModify = isSuperAdmin || !isPortalAdmin; // Only super admin can modify portal admins

        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="View Details" arrow>
              <IconButton 
                size="small" 
                onClick={() => handleDetailsClick(params.row)}
                sx={{
                  bgcolor: 'primary.50',
                  '&:hover': { bgcolor: 'primary.100' },
                }}
              >
                <Visibility fontSize="small" color="primary" />
              </IconButton>
            </Tooltip>
            <Tooltip title={canModify ? "Edit User" : "Only Super Admin can edit portal administrators"} arrow>
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => handleEditClick(params.row)}
                  disabled={!canModify}
                  sx={{
                    bgcolor: canModify ? 'info.50' : 'grey.200',
                    '&:hover': { bgcolor: canModify ? 'info.100' : 'grey.200' },
                    cursor: canModify ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Edit fontSize="small" color={canModify ? "info" : "disabled"} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canModify ? "Reset Password" : "Only Super Admin can reset portal admin passwords"} arrow>
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => handleResetPasswordClick(params.row)}
                  disabled={!canModify}
                  sx={{
                    bgcolor: canModify ? 'secondary.50' : 'grey.200',
                    '&:hover': { bgcolor: canModify ? 'secondary.100' : 'grey.200' },
                    cursor: canModify ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Lock fontSize="small" color={canModify ? "secondary" : "disabled"} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canModify ? (params.row.status === 'active' ? 'Suspend User' : 'Activate User') : "Only Super Admin can suspend/activate portal administrators"} arrow>
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => handleChangeStatus(params.row.id, params.row.status === 'active' ? 'suspended' : 'active')}
                  disabled={!canModify}
                  sx={{
                    bgcolor: canModify ? (params.row.status === 'active' ? 'warning.50' : 'success.50') : 'grey.200',
                    '&:hover': { bgcolor: canModify ? (params.row.status === 'active' ? 'warning.100' : 'success.100') : 'grey.200' },
                    cursor: canModify ? 'pointer' : 'not-allowed',
                  }}
                >
                  {params.row.status === 'active' ? (
                    <Block fontSize="small" color={canModify ? "warning" : "disabled"} />
                  ) : (
                    <CheckCircle fontSize="small" color={canModify ? "success" : "disabled"} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canModify ? "Delete User" : "Only Super Admin can delete portal administrators"} arrow>
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => handleDeleteClick(params.row)}
                  disabled={!canModify}
                  sx={{
                    bgcolor: canModify ? 'error.50' : 'grey.200',
                    '&:hover': { bgcolor: canModify ? 'error.100' : 'grey.200' },
                    cursor: canModify ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Delete fontSize="small" color={canModify ? "error" : "disabled"} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  // Enhanced filter logic - search term + role + status
  const filteredUsers = users.filter(user => {
    // Search term filter
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handler functions
  const handleCreateUser = async (data: UserFormData) => {
    console.log('🔵 Create User Form Data:', data);
    console.log('🔵 Form Errors:', errors);
    console.log('🔵 Current User Context:', {
      role: currentUser?.role,
      organization: currentUser?.organization,
      userId: currentUser?.id,
    });
    
    setLoading(true);
    try {
      const payload = {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.full_name,
        role: data.role,
        organization: data.organization,
        phone: data.phone,
        exporterId: data.exporter_id,
        ectaLicense: data.ecta_license,
      };

      console.log('🟢 Sending payload to API:', payload);

      const response = await api.post('/users', payload);
      
      console.log('✅ API Response:', response.data);
      
      if (response.data.success) {
        showSnackbar(`✅ User "${data.username}" created successfully!`, 'success');
        setCreateDialogOpen(false);
        reset();
        await loadUsers(); // Reload users list
      }
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error details:', JSON.stringify(error.response?.data, null, 2));
      
      const errorData = error.response?.data?.error;
      let errorMessage = errorData?.message || 'Failed to create user';
      
      // Special handling for organization undefined error
      if (errorMessage.includes('undefined') && errorMessage.includes('organization')) {
        errorMessage = '⚠️ Session Error: Your login session has outdated organization data. Please LOG OUT and LOG IN again to refresh your session, then try creating the user.';
      }
      
      showSnackbar(`❌ ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add onError handler for form validation failures
  const handleCreateUserError = (errors: any) => {
    console.log('❌ Form Validation Errors:', errors);
    
    // Collect all error messages
    const errorMessages = Object.entries(errors).map(([field, error]: [string, any]) => {
      const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `${fieldName}: ${error.message}`;
    });
    
    if (errorMessages.length > 0) {
      showSnackbar(`❌ Validation Errors:\n${errorMessages.join('\n')}`, 'error');
    } else {
      showSnackbar('❌ Please fill in all required fields correctly', 'error');
    }
  };

  const handleUpdateUser = async (data: Partial<UserFormData>) => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const payload = {
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
      };

      const response = await api.put(`/users/${selectedUser.id}`, payload);
      
      if (response.data.success) {
        showSnackbar(`✅ User "${selectedUser.username}" updated successfully!`, 'success');
        setEditDialogOpen(false);
        setSelectedUser(null);
        reset();
        await loadUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update user';
      showSnackbar(`❌ ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await api.delete(`/users/${selectedUser.id}`);
      
      if (response.data.success) {
        showSnackbar(`✅ User "${selectedUser.username}" deleted successfully!`, 'success');
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        await loadUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete user';
      showSnackbar(`❌ ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (userId: number, newStatus: string) => {
    try {
      const response = await api.put(`/users/${userId}/status`, { status: newStatus });
      
      if (response.data.success) {
        showSnackbar(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`, 'success');
        loadUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to change status';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setValue('email', user.email);
    setValue('full_name', user.full_name);
    setValue('phone', user.phone || '');
    setEditDialogOpen(true);
  };

  const handleDetailsClick = (user: User) => {
    setSelectedUser(user);
    setDetailsTab(0); // Reset to first tab
    setDetailsDialogOpen(true);
  };

  const handleCreateClick = () => {
    // Normalize organization value to key (BANKS, NBE, etc.) instead of full name
    const normalizeOrgKey = (org: string | undefined): string => {
      if (!org) return '';
      
      // Check if it's already a valid key
      const validKeys = ADMIN_CONFIG.organizations.map(o => o.value);
      if (validKeys.includes(org)) return org;
      
      // Try to map full name to key
      const orgConfig = ADMIN_CONFIG.organizations.find(
        o => o.label.toLowerCase() === org.toLowerCase() || 
             o.value.toUpperCase() === org.toUpperCase().replace(/[^A-Z]/g, '')
      );
      
      return orgConfig?.value || '';
    };
    
    const orgValue = currentUser?.role === 'ADMIN' ? '' : normalizeOrgKey(currentUser?.organization);
    
    // Reset form with proper default values
    reset({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role: '',
      organization: orgValue,
      phone: '',
      exporter_id: '',
      ecta_license: '',
    });
    
    console.log('🔵 Opening Create User Dialog. Current User:', {
      role: currentUser?.role,
      organization: currentUser?.organization,
      normalizedOrg: orgValue,
    });
    console.log('🔵 Available organizations:', ADMIN_CONFIG.organizations);
    
    setCreateDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleResetPasswordClick = (user: User) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) {
      console.error('No user selected for password reset');
      return;
    }

    console.log('Resetting password for user:', selectedUser.id, selectedUser.username);
    setResettingPassword(true);

    try {
      const response = await api.post(`/users/${selectedUser.id}/reset-password`, {});
      
      console.log('Password reset response:', response.data);
      
      if (response.data.success) {
        const newPassword = response.data.data.newPassword;
        showSnackbar(`✅ Password reset to: ${newPassword} - User: ${selectedUser.username}`, 'success');
        setResetPasswordDialogOpen(false);
        setSelectedUser(null);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      console.error('Request URL:', error.config?.url);
      
      const errorData = error.response?.data;
      const errorMessage = errorData?.error?.message || 
                          errorData?.message ||
                          `Failed to reset password. Status: ${error.response?.status}. User may not exist.`;
      
      showSnackbar(`❌ ${errorMessage} (User ID: ${selectedUser.id} - ${selectedUser.username})`, 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system users across all organizations
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadUsers}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateClick}
          >
            Create User
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Role Filter</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role Filter"
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('🔵 Role Filter onChange:', value);
                    console.log('🔵 Event:', e);
                    console.log('🔵 Current roleFilter before:', roleFilter);
                    setRoleFilter(value);
                    console.log('🔵 Set roleFilter to:', value);
                  }}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  {roleFilterOptions.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                Showing: <strong>{filteredUsers.length}</strong> of <strong>{totalUsers}</strong> users
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Professional Users DataGrid */}
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredUsers}
              columns={columns}
              loading={loading}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model) => {
                setPage(model.page);
                setPageSize(model.pageSize);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              rowCount={filteredUsers.length}
              paginationMode="client"
              autoHeight
              disableRowSelectionOnClick
              getRowHeight={() => 60}
              sx={{
                border: 'none',
                '& .MuiDataGrid-root': {
                  border: 'none',
                },
                '& .professional-header': {
                  backgroundColor: '#f8f9fa',
                  color: '#1a1a1a',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #e0e0e0',
                  borderRadius: 0,
                },
                '& .MuiDataGrid-columnHeader': {
                  '&:focus, &:focus-within': {
                    outline: 'none',
                  },
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: '#1a1a1a',
                },
                '& .MuiDataGrid-row': {
                  borderBottom: '1px solid #f0f0f0',
                  '&:hover': {
                    backgroundColor: '#f8f9fa',
                    transition: 'all 0.2s ease',
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd !important',
                    '&:hover': {
                      backgroundColor: '#bbdefb !important',
                    },
                  },
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: 'none',
                  padding: '12px 16px',
                  '&:focus, &:focus-within': {
                    outline: 'none',
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '2px solid #e0e0e0',
                  backgroundColor: '#fafafa',
                  minHeight: 56,
                },
                '& .MuiTablePagination-root': {
                  color: '#666',
                },
                '& .MuiDataGrid-virtualScroller': {
                  minHeight: '400px',
                },
                '& .MuiDataGrid-overlayWrapper': {
                  minHeight: '400px',
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ 
            minWidth: 400, 
            fontSize: '1rem',
            boxShadow: 6,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Create User Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            <Typography variant="h6">Create New User</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(handleCreateUser, handleCreateUserError)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="username"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Username is required', minLength: { value: 3, message: 'Min 3 characters' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Username"
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  defaultValue=""
                  rules={{ 
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="password"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Password"
                      type="password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="full_name"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Full name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Full Name"
                      error={!!errors.full_name}
                      helperText={errors.full_name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="role"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Role is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>Role</InputLabel>
                      <Select 
                        {...field}
                        value={field.value || ''}
                        label="Role"
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log('🟢 Role Select onChange triggered:', value);
                          field.onChange(value);
                        }}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 400,
                            },
                          },
                        }}
                      >
                        {createDialogRoleOptions.length === 0 ? (
                          <MenuItem disabled>
                            <em>{currentUser?.role === 'ADMIN' ? 'Loading roles...' : 'Please select an organization first'}</em>
                          </MenuItem>
                        ) : (
                          // Simple flat list of all roles (works for both Super Admin and Org Admin)
                          createDialogRoleOptions.map((role: any) => (
                            <MenuItem key={role.value} value={role.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography>{role.label}</Typography>
                              </Box>
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {errors.role && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          <strong>{errors.role.message}</strong>
                        </Alert>
                      )}
                      {currentUser?.role !== 'ADMIN' && !watchOrganization && (
                        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, ml: 1.5, fontWeight: 600 }}>
                          ⚠️ Please select an organization first
                        </Typography>
                      )}
                      {createDialogRoleOptions.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                          {currentUser?.role === 'ADMIN' 
                            ? `All roles from all organizations available` 
                            : `Select a job title within ${currentUser?.organization}`}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="organization"
                  control={control}
                  rules={{ required: 'Organization is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.organization}>
                      <InputLabel>Organization</InputLabel>
                      <Select
                        {...field}
                        value={field.value || ''}
                        label="Organization"
                        disabled={currentUser?.role !== 'ADMIN'}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log('🟢 Organization Select onChange triggered:', value);
                          field.onChange(value);
                          // Reset role when organization changes
                          setValue('role', '', { shouldValidate: false });
                          console.log('🔵 Role reset due to organization change');
                        }}
                      >
                        {currentUser?.role === 'ADMIN' ? (
                          // Super admin can select any organization
                          ADMIN_CONFIG.organizations.map((org) => (
                            <MenuItem key={org.value} value={org.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: org.color,
                                  }}
                                />
                                <Typography>{org.label}</Typography>
                              </Box>
                            </MenuItem>
                          ))
                        ) : (
                          // Organization admins can only create users in their org
                          ADMIN_CONFIG.organizations
                            .filter(org => org.value === currentUser?.organization)
                            .map((org) => (
                              <MenuItem key={org.value} value={org.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: org.color,
                                    }}
                                  />
                                  <Typography>{org.label}</Typography>
                                </Box>
                              </MenuItem>
                            ))
                        )}
                      </Select>
                      {errors.organization && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          <strong>{errors.organization.message}</strong>
                        </Alert>
                      )}
                      {currentUser?.role !== 'ADMIN' && (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                            Fixed to your organization
                          </Typography>
                          {ADMIN_CONFIG.organizations.filter(org => org.value === currentUser?.organization).length === 0 && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              ⚠️ <strong>Session Error:</strong> Your organization data is not properly set. 
                              Please <strong>LOG OUT</strong> and <strong>LOG IN</strong> again to refresh your session.
                              Current organization value: "{currentUser?.organization}"
                            </Alert>
                          )}
                        </>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="phone"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Phone Number"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {watchRole === 'EXPORTER' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="exporter_id"
                      control={control}
                      defaultValue=""
                      rules={watchRole === 'EXPORTER' ? { required: 'Exporter ID is required' } : {}}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Exporter ID"
                          error={!!errors.exporter_id}
                          helperText={errors.exporter_id?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="ecta_license"
                      control={control}
                      defaultValue=""
                      rules={watchRole === 'EXPORTER' ? { required: 'ECTA License is required' } : {}}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="ECTA License Number"
                          error={!!errors.ecta_license}
                          helperText={errors.ecta_license?.message}
                        />
                      )}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setCreateDialogOpen(false);
                reset();
              }}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              startIcon={<Save />}
              onClick={(e) => {
                console.log('🔵 Create User button clicked');
                console.log('🔵 Current form values:', watch());
                console.log('🔵 Current form errors:', errors);
              }}
            >
              Create User
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit />
            <Typography variant="h6">Edit User</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(handleUpdateUser)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={selectedUser?.username || ''}
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Role"
                  value={selectedUser?.role || ''}
                  disabled
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={control}
                  defaultValue=""
                  rules={{ 
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="full_name"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Full name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Full Name"
                      error={!!errors.full_name}
                      helperText={errors.full_name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="phone"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Phone Number"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedUser(null);
                reset();
              }}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              startIcon={<Save />}
            >
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
            <Delete />
            <Typography variant="h6">Confirm Delete</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will deactivate the user account. The user will no longer be able to login.
          </Alert>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            User: {selectedUser?.full_name} ({selectedUser?.email})
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedUser(null);
            }}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            startIcon={<Delete />}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog with Tabs */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility />
            <Typography variant="h6">User Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={detailsTab} 
                  onChange={(e, newValue) => setDetailsTab(newValue)}
                  aria-label="user details tabs"
                >
                  <Tab label="Profile" icon={<Person />} iconPosition="start" />
                  <Tab label="Blockchain Identity" icon={<Lock />} iconPosition="start" />
                  <Tab label="Activity Log" icon={<History />} iconPosition="start" />
                </Tabs>
              </Box>

              {/* Profile Tab */}
              <TabPanel value={detailsTab} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Username
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedUser.username}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {selectedUser.email}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {selectedUser.full_name}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      {selectedUser.phone || <em style={{ color: '#999' }}>Not provided</em>}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Role
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={selectedUser.role}
                        size="small"
                        color={
                          selectedUser.role === 'ADMIN' ? 'error' :
                          selectedUser.role === 'ECTA' ? 'primary' :
                          selectedUser.role === 'EXPORTER' ? 'success' : 'default'
                        }
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={selectedUser.status.toUpperCase()}
                        size="small"
                        color={
                          selectedUser.status === 'active' ? 'success' :
                          selectedUser.status === 'suspended' ? 'warning' : 'default'
                        }
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Organization
                    </Typography>
                    <Typography variant="body1">
                      {selectedUser.organization}
                    </Typography>
                  </Grid>

                  {selectedUser.role === 'EXPORTER' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Exporter ID
                        </Typography>
                        <Typography variant="body1">
                          {selectedUser.exporter_id || <em style={{ color: '#999' }}>Not provided</em>}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          ECTA License
                        </Typography>
                        <Typography variant="body1">
                          {selectedUser.ecta_license || <em style={{ color: '#999' }}>Not provided</em>}
                        </Typography>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Created At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Last Login
                    </Typography>
                    <Typography variant="body1">
                      {selectedUser.last_login 
                        ? new Date(selectedUser.last_login).toLocaleString()
                        : <em style={{ color: '#999' }}>Never</em>
                      }
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Permissions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedUser.permissions && selectedUser.permissions.length > 0 ? (
                        selectedUser.permissions.map((permission) => (
                          <Chip key={permission} label={permission} size="small" variant="outlined" />
                        ))
                      ) : (
                        <em style={{ color: '#999' }}>No permissions assigned</em>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Blockchain Identity Tab */}
              <TabPanel value={detailsTab} index={1}>
                <BlockchainIdentityPanel
                  userId={selectedUser.id}
                  username={selectedUser.username}
                  role={selectedUser.role}
                  organization={selectedUser.organization}
                />
              </TabPanel>

              {/* Activity Log Tab */}
              <TabPanel value={detailsTab} index={2}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Activity log shows recent actions performed by or on this user.
                </Alert>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  Activity log feature coming soon...
                </Typography>
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDetailsDialogOpen(false);
              setSelectedUser(null);
              setDetailsTab(0);
            }}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetPasswordDialogOpen} 
        onClose={() => setResetPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock />
            <Typography variant="h6">Reset Password</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Reset password for user: <strong>{selectedUser.username}</strong>
              </Alert>
              
              <Alert severity="info">
                The password will be reset to the default: <strong>password123</strong>
                <br /><br />
                Please inform the user to change their password after logging in.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setResetPasswordDialogOpen(false);
              setSelectedUser(null);
            }}
            startIcon={<Cancel />}
            disabled={resettingPassword}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetPassword}
            variant="contained"
            color="secondary"
            startIcon={<Lock />}
            disabled={resettingPassword}
          >
            {resettingPassword ? <CircularProgress size={20} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
