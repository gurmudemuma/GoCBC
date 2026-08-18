// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// System Traceability - Complete Activity Trail & Timeline
// Shows all system activities with filters, search, and drill-down capabilities

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Button,
  Stack,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Cancel,
  Edit,
  Add,
  Delete,
  Visibility,
  Lock,
  LockOpen,
  VerifiedUser,
  DateRange,
  Person,
  Business,
  Category,
} from '@mui/icons-material';
import api from '@/utils/api';

interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_by_org: string;
  old_value: string;
  new_value: string;
  reason: string;
  metadata: any;
  ip_address: string;
  created_at: string;
}

interface TraceabilityStats {
  totalActivities: number;
  uniqueEntities: number;
  uniqueUsers: number;
  blockchainVerified: number;
}

interface SystemTraceabilityProps {
  hideStats?: boolean; // Hide the internal stats cards if parent is providing them
  initialFilters?: {
    searchQuery?: string;
    entityTypeFilter?: string;
    actionFilter?: string;
    organizationFilter?: string;
    dateRange?: 'today' | 'week' | 'month' | 'all';
  };
}

const SystemTraceability: React.FC<SystemTraceabilityProps> = ({ 
  hideStats = false,
  initialFilters = {}
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TraceabilityStats | null>(null);
  
  // Filters - Initialize with props
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>(initialFilters.entityTypeFilter || 'ALL');
  const [actionFilter, setActionFilter] = useState<string>(initialFilters.actionFilter || 'ALL');
  const [organizationFilter, setOrganizationFilter] = useState<string>(initialFilters.organizationFilter || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.searchQuery || '');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>(initialFilters.dateRange || 'all');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchActivities();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update filters when initialFilters prop changes (when KPI card is clicked)
  useEffect(() => {
    // Always update filters when initialFilters changes, even if empty (for reset)
    setEntityTypeFilter(initialFilters.entityTypeFilter || 'ALL');
    setActionFilter(initialFilters.actionFilter || 'ALL');
    setOrganizationFilter(initialFilters.organizationFilter || 'ALL');
    setSearchQuery(initialFilters.searchQuery || '');
    setDateRange(initialFilters.dateRange || 'all');
    
    // Reset page to 0 when filters change
    setPage(0);
  }, [initialFilters]); // Watch all filters to detect any change

  useEffect(() => {
    applyFilters();
  }, [logs, entityTypeFilter, actionFilter, organizationFilter, searchQuery, dateRange]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/audit/portal/recent?limit=1000');

      if (response.data.success) {
        const allLogs = response.data.data.logs || [];
        setLogs(allLogs);
        
        // Calculate statistics
        const uniqueEntities = new Set(allLogs.map((log: AuditLog) => `${log.entity_type}-${log.entity_id}`)).size;
        const uniqueUsers = new Set(allLogs.map((log: AuditLog) => log.performed_by)).size;
        const blockchainVerified = allLogs.filter((log: AuditLog) => 
          log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC'
        ).length;
        
        setStats({
          totalActivities: allLogs.length,
          uniqueEntities,
          uniqueUsers,
          blockchainVerified,
        });
      } else {
        setError('Failed to load activity trail');
      }
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setError(err.response?.data?.error || 'Failed to load activity trail');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Entity Type filter
    if (entityTypeFilter !== 'ALL') {
      // Support multiple related entity types
      if (entityTypeFilter === 'EXPORTER') {
        // Show both EXPORTER and EXPORTER_APPLICATION
        filtered = filtered.filter(log => 
          log.entity_type === 'EXPORTER' || 
          log.entity_type === 'EXPORTER_APPLICATION'
        );
      } else if (entityTypeFilter === 'LC') {
        // Show both LC and LETTER_OF_CREDIT
        filtered = filtered.filter(log => 
          log.entity_type === 'LC' || 
          log.entity_type === 'LETTER_OF_CREDIT'
        );
      } else {
        filtered = filtered.filter(log => log.entity_type === entityTypeFilter);
      }
    }

    // Action filter
    if (actionFilter !== 'ALL') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Organization filter
    if (organizationFilter !== 'ALL') {
      filtered = filtered.filter(log => log.performed_by_org === organizationFilter);
    }

    // Search filter (entity ID, performed by, reason)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Check if searching for "blockchain" to show only verified activities
      if (query === 'blockchain' || query === 'verified' || query === 'blockchain-verified') {
        filtered = filtered.filter(log =>
          log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC'
        );
      } else {
        filtered = filtered.filter(log =>
          log.entity_id.toLowerCase().includes(query) ||
          log.performed_by.toLowerCase().includes(query) ||
          (log.reason && log.reason.toLowerCase().includes(query))
        );
      }
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.created_at) >= cutoff);
    }

    setFilteredLogs(filtered);
    setPage(0); // Reset to first page
  };

  const getUniqueValues = (field: 'entity_type' | 'action' | 'performed_by_org'): string[] => {
    return Array.from(new Set(logs.map(log => log[field]))).sort();
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'REGISTER':
        return <Add fontSize="small" />;
      case 'UPDATE':
      case 'EDIT':
        return <Edit fontSize="small" />;
      case 'DELETE':
      case 'REMOVE':
        return <Delete fontSize="small" />;
      case 'APPROVE':
        return <CheckCircle fontSize="small" />;
      case 'REJECT':
        return <Cancel fontSize="small" />;
      case 'VIEW':
        return <Visibility fontSize="small" />;
      case 'LOCK':
      case 'SUSPEND':
        return <Lock fontSize="small" />;
      case 'UNLOCK':
      case 'ACTIVATE':
        return <LockOpen fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getActionColor = (action: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'REGISTER':
      case 'APPROVE':
      case 'ACTIVATE':
        return 'success';
      case 'DELETE':
      case 'REJECT':
      case 'SUSPEND':
        return 'error';
      case 'UPDATE':
      case 'EDIT':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleToggleRow = (logId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Performed By', 'Organization', 'Old Value', 'New Value', 'Reason', 'IP Address', 'Blockchain Verified'];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${formatDate(log.created_at)}"`,
        `"${log.action}"`,
        `"${log.entity_type}"`,
        `"${log.entity_id}"`,
        `"${log.performed_by}"`,
        `"${log.performed_by_org}"`,
        `"${log.old_value}"`,
        `"${log.new_value}"`,
        `"${(log.reason || '').replace(/"/g, '""')}"`,
        `"${log.ip_address}"`,
        `"${log.metadata?.blockchainVerified ? 'Yes' : 'No'}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-traceability-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setEntityTypeFilter('ALL');
    setActionFilter('ALL');
    setOrganizationFilter('ALL');
    setSearchQuery('');
    setDateRange('all');
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Show alert when filters are applied from KPI card */}
      {(entityTypeFilter !== 'ALL' || actionFilter !== 'ALL' || organizationFilter !== 'ALL' || searchQuery || dateRange !== 'all') && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<FilterIcon />}>
          <Typography variant="body2">
            <strong>Filtered View:</strong> Showing results based on KPI card selection. Use the filters below to adjust or click "Clear Filters" to reset.
          </Typography>
        </Alert>
      )}

      {/* Statistics Cards - Hidden if parent provides top-level KPIs */}
      {!hideStats && stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <TimelineIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {stats.totalActivities}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Activities
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Category sx={{ fontSize: 40, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {stats.uniqueEntities}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique Entities
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Person sx={{ fontSize: 40, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {stats.uniqueUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique Users
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <VerifiedUser sx={{ fontSize: 40, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {stats.blockchainVerified}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Blockchain Verified
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            Filters & Search
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchActivities}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Search */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder="Entity ID, User, Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Entity Type */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={entityTypeFilter}
                label="Entity Type"
                onChange={(e) => setEntityTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                {getUniqueValues('entity_type').map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Action */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={actionFilter}
                label="Action"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Actions</MenuItem>
                {getUniqueValues('action').map(action => (
                  <MenuItem key={action} value={action}>{action}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Organization */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Organization</InputLabel>
              <Select
                value={organizationFilter}
                label="Organization"
                onChange={(e) => setOrganizationFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Organizations</MenuItem>
                {getUniqueValues('performed_by_org').map(org => (
                  <MenuItem key={org} value={org}>{org}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Active Filters Display */}
        {(entityTypeFilter !== 'ALL' || actionFilter !== 'ALL' || organizationFilter !== 'ALL' || searchQuery || dateRange !== 'all') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Active Filters:
            </Typography>
            {entityTypeFilter !== 'ALL' && (
              <Chip label={`Type: ${entityTypeFilter}`} size="small" onDelete={() => setEntityTypeFilter('ALL')} sx={{ mr: 0.5 }} />
            )}
            {actionFilter !== 'ALL' && (
              <Chip label={`Action: ${actionFilter}`} size="small" onDelete={() => setActionFilter('ALL')} sx={{ mr: 0.5 }} />
            )}
            {organizationFilter !== 'ALL' && (
              <Chip label={`Org: ${organizationFilter}`} size="small" onDelete={() => setOrganizationFilter('ALL')} sx={{ mr: 0.5 }} />
            )}
            {searchQuery && (
              <Chip label={`Search: ${searchQuery}`} size="small" onDelete={() => setSearchQuery('')} sx={{ mr: 0.5 }} />
            )}
            {dateRange !== 'all' && (
              <Chip label={`Date: ${dateRange}`} size="small" onDelete={() => setDateRange('all')} sx={{ mr: 0.5 }} />
            )}
            <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
              Showing {filteredLogs.length} of {logs.length} activities
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Activity Trail Table */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Entity ID</TableCell>
                <TableCell>Performed By</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell>Blockchain</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No activities found. Try adjusting your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleRow(log.id)}
                          >
                            {expandedRows.has(log.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getActionIcon(log.action)}
                            label={log.action}
                            size="small"
                            color={getActionColor(log.action)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.entity_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {log.entity_id.substring(0, 20)}{log.entity_id.length > 20 && '...'}
                        </TableCell>
                        <TableCell>{log.performed_by}</TableCell>
                        <TableCell>
                          <Chip label={log.performed_by_org} size="small" />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={`${log.old_value} → ${log.new_value}`}>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {log.old_value?.substring(0, 8) || 'N/A'}
                              </Typography>
                              <Typography variant="caption">→</Typography>
                              <Typography variant="caption" color="primary">
                                {log.new_value?.substring(0, 8) || 'N/A'}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          {log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC' ? (
                            <Tooltip title="Blockchain Verified">
                              <VerifiedUser fontSize="small" color="success" />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Database Only">
                              <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                          <Collapse in={expandedRows.has(log.id)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="h6" gutterBottom>
                                Activity Details
                              </Typography>
                              
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    LOG ID
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    #{log.id}
                                  </Typography>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    IP ADDRESS
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {log.ip_address}
                                  </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    STATE CHANGE
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                                    <Chip label={log.old_value || 'N/A'} variant="outlined" />
                                    <Typography>→</Typography>
                                    <Chip label={log.new_value || 'N/A'} color="primary" />
                                  </Box>
                                </Grid>

                                {log.reason && (
                                  <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      REASON / NOTES
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'white' }}>
                                      <Typography variant="body2">{log.reason}</Typography>
                                    </Paper>
                                  </Grid>
                                )}

                                {log.metadata && (
                                  <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      METADATA
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'white' }}>
                                      <pre style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </Paper>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredLogs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Info Banner */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>TRUE TRACEABILITY:</strong> This view shows every single activity in the system, including database operations and blockchain-verified transactions. 
          Use filters to trace specific entities, users, or actions through their complete lifecycle.
        </Typography>
      </Alert>
    </Box>
  );
};

export default SystemTraceability;
