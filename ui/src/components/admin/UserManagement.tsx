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
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useForm, Controller } from 'react-hook-form';
import api from '@/utils/api';

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
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Form
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<UserFormData>();
  const watchRole = watch('role');

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
        setTotalUsers(response.data.pagination.total);
        
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

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'username',
      headerName: 'Username',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person fontSize="small" color="action" />
          <Typography variant="body2" fontWeight="bold">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'full_name',
      headerName: 'Full Name',
      width: 200,
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'ADMIN' ? 'error' :
            params.value === 'ECTA' ? 'primary' :
            params.value === 'EXPORTER' ? 'success' : 'default'
          }
        />
      ),
    },
    {
      field: 'organization',
      headerName: 'Organization',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business fontSize="small" color="action" />
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value.toUpperCase()}
          size="small"
          color={params.value === 'active' ? 'success' : params.value === 'suspended' ? 'warning' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton size="small" color="primary" onClick={() => handleDetailsClick(params.row)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit User">
            <IconButton size="small" color="info" onClick={() => handleEditClick(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Password">
            <IconButton size="small" color="secondary" onClick={() => handleResetPasswordClick(params.row)}>
              <Lock fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === 'active' ? 'Suspend User' : 'Activate User'}>
            <IconButton 
              size="small" 
              color={params.row.status === 'active' ? 'warning' : 'success'}
              onClick={() => handleChangeStatus(params.row.id, params.row.status === 'active' ? 'suspended' : 'active')}
            >
              {params.row.status === 'active' ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete User">
            <IconButton size="small" color="error" onClick={() => handleDeleteClick(params.row)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Filter users by search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler functions
  const handleCreateUser = async (data: UserFormData) => {
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

      const response = await api.post('/users', payload);
      
      if (response.data.success) {
        showSnackbar('User created successfully', 'success');
        setCreateDialogOpen(false);
        reset();
        loadUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create user';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleUpdateUser = async (data: Partial<UserFormData>) => {
    if (!selectedUser) return;

    try {
      const payload = {
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
      };

      const response = await api.put(`/users/${selectedUser.id}`, payload);
      
      if (response.data.success) {
        showSnackbar('User updated successfully', 'success');
        setEditDialogOpen(false);
        setSelectedUser(null);
        reset();
        loadUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update user';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await api.delete(`/users/${selectedUser.id}`);
      
      if (response.data.success) {
        showSnackbar('User deleted successfully', 'success');
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        loadUsers();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete user';
      showSnackbar(errorMessage, 'error');
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
    setDetailsDialogOpen(true);
  };

  const handleCreateClick = () => {
    reset();
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
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="ECTA">ECTA</MenuItem>
                  <MenuItem value="ECX">ECX</MenuItem>
                  <MenuItem value="NBE">NBE</MenuItem>
                  <MenuItem value="BANKS">Banks</MenuItem>
                  <MenuItem value="CUSTOMS">Customs</MenuItem>
                  <MenuItem value="SHIPPING">Shipping</MenuItem>
                  <MenuItem value="EXPORTER">Exporter</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
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
                Total: <strong>{totalUsers}</strong> users
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users DataGrid */}
      <Card>
        <CardContent>
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
              rowCount={totalUsers}
              paginationMode="server"
              autoHeight
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-row:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={10000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ minWidth: 400, fontSize: '1rem' }}
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
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            <Typography variant="h6">Create New User</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit(handleCreateUser)}>
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
                      <Select {...field} label="Role">
                        <MenuItem value="ECTA">ECTA</MenuItem>
                        <MenuItem value="ECX">ECX</MenuItem>
                        <MenuItem value="NBE">NBE</MenuItem>
                        <MenuItem value="BANKS">Banks</MenuItem>
                        <MenuItem value="CUSTOMS">Customs</MenuItem>
                        <MenuItem value="SHIPPING">Shipping</MenuItem>
                        <MenuItem value="EXPORTER">Exporter</MenuItem>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                      </Select>
                      {errors.role && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {errors.role.message}
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
                  defaultValue=""
                  rules={{ required: 'Organization is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Organization"
                      error={!!errors.organization}
                      helperText={errors.organization?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business />
                          </InputAdornment>
                        ),
                      }}
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

      {/* User Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
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
            <Box sx={{ mt: 2 }}>
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDetailsDialogOpen(false);
              setSelectedUser(null);
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
