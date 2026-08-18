// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Reusable Audit Trail Table Component - Shows all transactions in any portal

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh,
  Info,
  CheckCircle,
  Cancel,
  Edit,
  Add,
  Delete,
  Visibility,
  Download,
  Upload,
  Lock,
  LockOpen,
  Assessment,
  GetApp,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Storage,
  AccountTree,
  Link as LinkIcon,
  VerifiedUser,
  Person,
  Schedule,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import BlockchainAuditTrail from './BlockchainAuditTrail';

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

interface AuditTrailTableProps {
  title?: string;
  entityTypeFilter?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  showStats?: boolean;
  maxHeight?: number | string;
  entityId?: string; // For blockchain audit trail
  showBlockchainToggle?: boolean; // Show toggle to switch between cache and blockchain
}

const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  title = 'Audit Trail - Recent Transactions',
  entityTypeFilter,
  autoRefresh = false,
  refreshInterval = 30000,
  showStats = true,
  maxHeight = 600,
  entityId,
  showBlockchainToggle = false,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState<any>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [error, setError] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'cache' | 'blockchain'>('cache');

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      params.append('limit', '500');
      if (entityTypeFilter) {
        params.append('entityType', entityTypeFilter);
      }
      if (actionFilter !== 'ALL') {
        params.append('action', actionFilter);
      }

      const response = await apiFetch(`/audit/portal/recent?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs || []);
        setStats(result.data.statistics || null);
      } else {
        setError(result.error || 'Failed to fetch audit logs');
      }
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit trail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [entityTypeFilter, actionFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAuditLogs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, entityTypeFilter, actionFilter]);

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
      case 'DOWNLOAD':
        return <Download fontSize="small" />;
      case 'UPLOAD':
        return <Upload fontSize="small" />;
      case 'LOCK':
      case 'SUSPEND':
        return <Lock fontSize="small" />;
      case 'UNLOCK':
      case 'ACTIVATE':
        return <LockOpen fontSize="small" />;
      default:
        return <Info fontSize="small" />;
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get unique actions for filter
  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map(log => log.action)))];

  // Handle row expansion
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

  // Download log as JSON
  const handleDownloadLog = (log: AuditLog) => {
    const dataStr = JSON.stringify(log, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${log.entity_type}-${log.entity_id}-${log.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download all filtered logs as JSON
  const handleDownloadAll = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download as CSV
  const handleDownloadCSV = () => {
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Performed By', 'Organization', 'Old Value', 'New Value', 'Reason', 'IP Address'];
    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        `"${formatDate(log.created_at)}"`,
        `"${log.action}"`,
        `"${log.entity_type}"`,
        `"${log.entity_id}"`,
        `"${log.performed_by}"`,
        `"${log.performed_by_org}"`,
        `"${log.old_value}"`,
        `"${log.new_value}"`,
        `"${(log.reason || '').replace(/"/g, '""')}"`,
        `"${log.ip_address}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Header with Stats */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {showBlockchainToggle && entityId && entityTypeFilter && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => {
                  if (newMode !== null) {
                    setViewMode(newMode);
                  }
                }}
                size="small"
              >
                <ToggleButton value="cache">
                  <Tooltip title="PostgreSQL Cache (Fast Queries)">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Storage fontSize="small" />
                      <Typography variant="caption">Cache</Typography>
                    </Box>
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="blockchain">
                  <Tooltip title="TRUE Blockchain (Immutable Ledger)">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Lock fontSize="small" />
                      <Typography variant="caption">Blockchain</Typography>
                    </Box>
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            )}
            <Tooltip title="Download as CSV">
              <IconButton onClick={handleDownloadCSV} disabled={loading || logs.length === 0} color="primary">
                <Download />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download as JSON">
              <IconButton onClick={handleDownloadAll} disabled={loading || logs.length === 0} color="primary">
                <GetApp />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchAuditLogs} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Show blockchain view if selected */}
        {viewMode === 'blockchain' && entityId && entityTypeFilter ? (
          <BlockchainAuditTrail
            entityType={entityTypeFilter}
            entityId={entityId}
            title="TRUE Blockchain Audit Trail - Immutable Cryptographic Chain"
          />
        ) : (
          <>
            {showStats && stats && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Transactions
                      </Typography>
                      <Typography variant="h4">{stats.total || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Entity Types
                      </Typography>
                      <Typography variant="h4">
                        {stats.byEntityType ? Object.keys(stats.byEntityType).length : 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Action Types
                      </Typography>
                      <Typography variant="h4">
                        {stats.byAction ? Object.keys(stats.byAction).length : 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                select
                label="Action Filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              >
                {uniqueActions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Audit Trail Table */}
            <TableContainer component={Paper} sx={{ maxHeight }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Entity ID</TableCell>
              <TableCell>Performed By</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Changes</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No audit logs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow hover sx={{ cursor: 'pointer' }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            icon={getActionIcon(log.action)}
                            label={log.action}
                            size="small"
                            color={getActionColor(log.action)}
                            variant="outlined"
                          />
                          {log.metadata?.blockchainVerified && (
                            <Tooltip title="Blockchain Verified - Immutable Record">
                              <Lock fontSize="small" color="success" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.entity_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {log.entity_id}
                      </TableCell>
                      <TableCell>{log.performed_by}</TableCell>
                      <TableCell>
                        <Chip label={log.performed_by_org} size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={`From: ${log.old_value} → To: ${log.new_value}`}>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip label={log.old_value?.substring(0, 10) || 'N/A'} size="small" variant="outlined" />
                            →
                            <Chip label={log.new_value?.substring(0, 10) || 'N/A'} size="small" color="primary" />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={log.reason || 'No reason provided'}>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.reason || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {log.ip_address}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={expandedRows.has(log.id) ? "Hide Details" : "Show Details"}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleRow(log.id)} 
                              color="primary"
                            >
                              {expandedRows.has(log.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton size="small" onClick={() => handleDownloadLog(log)} color="secondary">
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expandable Detail Row */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                        <Collapse in={expandedRows.has(log.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2, p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                              <Info color="primary" />
                              Audit Log Details
                            </Typography>
                            
                            <Grid container spacing={3}>
                              {/* Left Column */}
                              <Grid item xs={12} md={6}>
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    LOG ID
                                  </Typography>
                                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                    #{log.id}
                                  </Typography>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    TIMESTAMP
                                  </Typography>
                                  <Typography variant="body1">
                                    {formatDate(log.created_at)}
                                  </Typography>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    ACTION
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip
                                      icon={getActionIcon(log.action)}
                                      label={log.action}
                                      color={getActionColor(log.action)}
                                    />
                                  </Box>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    ENTITY TYPE
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip label={log.entity_type} color="primary" variant="outlined" />
                                  </Box>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    ENTITY ID
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {log.entity_id}
                                  </Typography>
                                </Box>
                              </Grid>
                              
                              {/* Right Column */}
                              <Grid item xs={12} md={6}>
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    PERFORMED BY
                                  </Typography>
                                  <Typography variant="body1">
                                    {log.performed_by}
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    <Chip label={log.performed_by_org} size="small" />
                                  </Box>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    STATE CHANGE
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                    <Chip label={log.old_value || 'N/A'} variant="outlined" />
                                    <Typography>→</Typography>
                                    <Chip label={log.new_value || 'N/A'} color="primary" />
                                  </Box>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    IP ADDRESS
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {log.ip_address}
                                  </Typography>
                                </Box>
                              </Grid>
                              
                              {/* Full Width Section */}
                              
                              {/* Digital Signature & Verification Section */}
                              <Grid item xs={12}>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <VerifiedUser fontSize="small" />
                                  DIGITAL SIGNATURE & VERIFICATION
                                </Typography>
                                <Paper 
                                  variant="outlined" 
                                  sx={{ 
                                    p: 2, 
                                    mt: 1, 
                                    bgcolor: log.metadata?.blockchainVerified ? '#f0f9ff' : 'white',
                                    borderColor: log.metadata?.blockchainVerified ? '#2196f3' : undefined
                                  }}
                                >
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Signed By
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Person fontSize="small" color="primary" />
                                        <Box>
                                          <Typography variant="body2" fontWeight={600}>
                                            {log.performed_by}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {log.performed_by_org}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={4}>
                                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Timestamp
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Schedule fontSize="small" color="action" />
                                        <Box>
                                          <Typography variant="body2">
                                            {new Date(log.created_at).toLocaleString('en-US', {
                                              dateStyle: 'medium',
                                              timeStyle: 'long'
                                            })}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={4}>
                                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Verification Status
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        {log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC' ? (
                                          <>
                                            <CheckCircle fontSize="small" sx={{ color: '#4caf50' }} />
                                            <Box>
                                              <Typography variant="body2" color="success.main" fontWeight={600}>
                                                Blockchain Verified
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                Immutable Record
                                              </Typography>
                                            </Box>
                                          </>
                                        ) : (
                                          <>
                                            <Storage fontSize="small" color="action" />
                                            <Box>
                                              <Typography variant="body2">
                                                Database Record
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                Not on blockchain
                                              </Typography>
                                            </Box>
                                          </>
                                        )}
                                      </Box>
                                    </Grid>
                                    
                                    <Grid item xs={12}>
                                      <Divider sx={{ my: 1 }} />
                                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        <Box>
                                          <Typography variant="caption" color="text.secondary">
                                            Source IP
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                            {log.ip_address}
                                          </Typography>
                                        </Box>
                                        
                                        {log.metadata?.transactionId && (
                                          <Box>
                                            <Typography variant="caption" color="text.secondary">
                                              Transaction ID
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                              {log.metadata.transactionId.substring(0, 16)}...
                                            </Typography>
                                          </Box>
                                        )}
                                        
                                        {log.metadata?.blockNumber && (
                                          <Box>
                                            <Typography variant="caption" color="text.secondary">
                                              Block Number
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                              #{log.metadata.blockNumber}
                                            </Typography>
                                          </Box>
                                        )}
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Paper>
                              </Grid>
                              
                              {log.reason && (
                                <Grid item xs={12}>
                                  <Divider sx={{ mb: 2 }} />
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      REASON / NOTES
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'white' }}>
                                      <Typography variant="body2">{log.reason}</Typography>
                                    </Paper>
                                  </Box>
                                </Grid>
                              )}
                              
                              {/* Metadata */}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <Grid item xs={12}>
                                  <Divider sx={{ mb: 2 }} />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      {log.metadata.source === 'HYPERLEDGER_FABRIC' ? 
                                        '🔐 BLOCKCHAIN CRYPTOGRAPHIC DETAILS' : 
                                        'ADDITIONAL METADATA'}
                                    </Typography>
                                    
                                    {/* Show blockchain details in structured format if from blockchain */}
                                    {log.metadata.blockchainVerified && log.metadata.blockchainTxId ? (
                                      <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'success.50' }}>
                                        <Grid container spacing={2}>
                                          <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                              <CheckCircle color="success" />
                                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                BLOCKCHAIN VERIFIED TRANSACTION
                                              </Typography>
                                            </Box>
                                          </Grid>
                                          
                                          <Grid item xs={12}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                              Transaction ID (Blockchain)
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.85rem' }}>
                                              {log.metadata.blockchainTxId}
                                            </Typography>
                                          </Grid>
                                          
                                          {log.metadata.signature && (
                                            <>
                                              <Grid item xs={12}>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                  CRYPTOGRAPHIC HASH CHAIN
                                                </Typography>
                                              </Grid>
                                              
                                              {log.metadata.signature.previousStateHash && (
                                                <Grid item xs={12}>
                                                  <Typography variant="caption" color="text.secondary">
                                                    Previous State Hash (SHA-256)
                                                  </Typography>
                                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'primary.main' }}>
                                                    {log.metadata.signature.previousStateHash}
                                                  </Typography>
                                                </Grid>
                                              )}
                                              
                                              {log.metadata.signature.dataHash && (
                                                <Grid item xs={12}>
                                                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                                                    <LinkIcon color="primary" />
                                                  </Box>
                                                  <Typography variant="caption" color="text.secondary">
                                                    Data Hash (SHA-256)
                                                  </Typography>
                                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'info.main' }}>
                                                    {log.metadata.signature.dataHash}
                                                  </Typography>
                                                </Grid>
                                              )}
                                              
                                              {log.metadata.signature.newStateHash && (
                                                <Grid item xs={12}>
                                                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                                                    <LinkIcon color="primary" />
                                                  </Box>
                                                  <Typography variant="caption" color="text.secondary">
                                                    New State Hash (SHA-256)
                                                  </Typography>
                                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', color: 'success.main' }}>
                                                    {log.metadata.signature.newStateHash}
                                                  </Typography>
                                                </Grid>
                                              )}
                                              
                                              {log.metadata.signature.caller && (
                                                <>
                                                  <Grid item xs={12}>
                                                    <Divider sx={{ my: 1 }} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                      IDENTITY VERIFICATION
                                                    </Typography>
                                                  </Grid>
                                                  
                                                  <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Organization (MSP)
                                                    </Typography>
                                                    <Typography variant="body2">{log.metadata.signature.caller.mspId || 'N/A'}</Typography>
                                                  </Grid>
                                                  
                                                  <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                      Common Name
                                                    </Typography>
                                                    <Typography variant="body2">{log.metadata.signature.caller.commonName || 'N/A'}</Typography>
                                                  </Grid>
                                                  
                                                  {log.metadata.signature.caller.certificateHash && (
                                                    <Grid item xs={12}>
                                                      <Typography variant="caption" color="text.secondary">
                                                        Certificate Hash (SHA-256)
                                                      </Typography>
                                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                                        {log.metadata.signature.caller.certificateHash}
                                                      </Typography>
                                                    </Grid>
                                                  )}
                                                </>
                                              )}
                                              
                                              {log.metadata.signature.endorsingPeers && log.metadata.signature.endorsingPeers.length > 0 && (
                                                <>
                                                  <Grid item xs={12}>
                                                    <Divider sx={{ my: 1 }} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                      MULTI-ORG ENDORSEMENTS
                                                    </Typography>
                                                  </Grid>
                                                  <Grid item xs={12}>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                      {log.metadata.signature.endorsingPeers.map((peer: string, idx: number) => (
                                                        <Chip
                                                          key={idx}
                                                          label={peer}
                                                          icon={<CheckCircle />}
                                                          color="success"
                                                          size="small"
                                                        />
                                                      ))}
                                                    </Box>
                                                  </Grid>
                                                </>
                                              )}
                                            </>
                                          )}
                                          
                                          <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <Lock fontSize="small" color="primary" />
                                              <Typography variant="caption" color="text.secondary">
                                                Source: {log.metadata.source}
                                              </Typography>
                                              <Chip label="IMMUTABLE" size="small" color="primary" />
                                              <Chip label="VERIFIED" size="small" color="success" icon={<VerifiedUser />} />
                                            </Box>
                                          </Grid>
                                        </Grid>
                                      </Paper>
                                    ) : (
                                      <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'white', maxHeight: 300, overflow: 'auto' }}>
                                        <pre style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                          {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                      </Paper>
                                    )}
                                  </Box>
                                </Grid>
                              )}
                              
                              {/* Actions */}
                              <Grid item xs={12}>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Button
                                    startIcon={<Download />}
                                    onClick={() => handleDownloadLog(log)}
                                    variant="outlined"
                                    size="small"
                                  >
                                    Download JSON
                                  </Button>
                                  <Button
                                    onClick={() => handleToggleRow(log.id)}
                                    variant="contained"
                                    size="small"
                                  >
                                    Close
                                  </Button>
                                </Box>
                              </Grid>
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

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            component="div"
            count={logs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          </>
        )}
      </Box>
    </Box>
  );
};

export default AuditTrailTable;
