// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Repatriation Compliance Panel - NBE Portal
// Tracks and manages overdue repatriations and compliance violations

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Divider,
  Alert,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Warning,
  Send,
  Download,
  CheckCircle,
  Error,
  Schedule,
} from '@mui/icons-material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

const NBE_COLORS = {
  bronze: '#8B6F47',
  error: '#d32f2f',
  warning: '#f57c00',
  success: '#2e7d32',
};

interface Repatriation {
  repatriationId: string;
  exporterId: string;
  exporterName?: string;
  exportAmount: number;
  currency: string;
  status: string;
  repatriationDeadline: string;
  daysOverdue: number;
  shipmentDate: string;
}

interface RepatriationCompliancePanelProps {
  open: boolean;
  onClose: () => void;
  overdueRepatriations: Repatriation[];
  onRefresh: () => void;
}

const RepatriationCompliancePanel: React.FC<RepatriationCompliancePanelProps> = ({
  open,
  onClose,
  overdueRepatriations,
  onRefresh,
}) => {
  const { showSuccess, showError } = useNotification();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Handle select all
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(overdueRepatriations.map(r => r.repatriationId));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual select
  const handleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Send compliance notice
  const handleSendNotice = async () => {
    if (selectedIds.length === 0) {
      showError('Please select at least one repatriation');
      return;
    }

    try {
      setSending(true);
      
      // Send compliance notices for selected repatriations
      const promises = selectedIds.map(id =>
        apiFetch('/api/v1/notifications/compliance-notice', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            repatriationId: id,
            noticeType: 'OVERDUE_REPATRIATION',
            severity: 'HIGH',
          }),
        })
      );

      await Promise.all(promises);
      
      showSuccess(`Compliance notice sent to ${selectedIds.length} exporter(s)`);
      setSelectedIds([]);
      onRefresh();
    } catch (error) {
      console.error('[COMPLIANCE] Error sending notices:', error);
      showError('Failed to send compliance notices');
    } finally {
      setSending(false);
    }
  };

  // Export compliance report
  const handleExportReport = () => {
    const csv = [
      ['Repatriation ID', 'Exporter', 'Amount', 'Currency', 'Deadline', 'Days Overdue', 'Status'].join(','),
      ...overdueRepatriations.map(r => [
        r.repatriationId,
        r.exporterName || r.exporterId,
        r.exportAmount,
        r.currency,
        r.repatriationDeadline,
        r.daysOverdue,
        r.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overdue_repatriations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showSuccess('Report downloaded');
  };

  // Categorize by severity
  const critical = overdueRepatriations.filter(r => r.daysOverdue > 30);
  const high = overdueRepatriations.filter(r => r.daysOverdue > 15 && r.daysOverdue <= 30);
  const moderate = overdueRepatriations.filter(r => r.daysOverdue <= 15);

  const getSeverityColor = (daysOverdue: number) => {
    if (daysOverdue > 30) return NBE_COLORS.error;
    if (daysOverdue > 15) return NBE_COLORS.warning;
    return '#ff9800';
  };

  const getSeverityLabel = (daysOverdue: number) => {
    if (daysOverdue > 30) return 'CRITICAL';
    if (daysOverdue > 15) return 'HIGH';
    return 'MODERATE';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: `4px solid ${NBE_COLORS.error}`,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning sx={{ color: NBE_COLORS.error }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Repatriation Compliance Panel
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Overdue repatriations requiring NBE action
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Error sx={{ color: NBE_COLORS.error }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700} color={NBE_COLORS.error}>
                      {critical.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Critical (30+ days overdue)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning sx={{ color: NBE_COLORS.warning }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700} color={NBE_COLORS.warning}>
                      {high.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      High (16-30 days overdue)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: '#fff8e1' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule sx={{ color: '#ff9800' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="#ff9800">
                      {moderate.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Moderate (1-15 days overdue)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alert */}
        {overdueRepatriations.length === 0 ? (
          <Alert severity="success" icon={<CheckCircle />}>
            No overdue repatriations. All exporters are in compliance.
          </Alert>
        ) : (
          <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
            {overdueRepatriations.length} repatriation(s) are overdue. Immediate action required to enforce compliance.
          </Alert>
        )}

        {/* Overdue Repatriations Table */}
        {overdueRepatriations.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.length === overdueRepatriations.length}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < overdueRepatriations.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Repatriation ID</strong></TableCell>
                  <TableCell><strong>Exporter</strong></TableCell>
                  <TableCell><strong>Amount</strong></TableCell>
                  <TableCell><strong>Deadline</strong></TableCell>
                  <TableCell><strong>Days Overdue</strong></TableCell>
                  <TableCell><strong>Severity</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overdueRepatriations
                  .sort((a, b) => b.daysOverdue - a.daysOverdue) // Sort by most overdue
                  .map((repatriation) => (
                    <TableRow
                      key={repatriation.repatriationId}
                      hover
                      sx={{
                        bgcolor: selectedIds.includes(repatriation.repatriationId) ? '#f5f5f5' : 'inherit',
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(repatriation.repatriationId)}
                          onChange={() => handleSelect(repatriation.repatriationId)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {repatriation.repatriationId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {repatriation.exporterName || repatriation.exporterId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {repatriation.exporterId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {repatriation.currency} {repatriation.exportAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(repatriation.repatriationDeadline).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${repatriation.daysOverdue} days`}
                          size="small"
                          sx={{
                            bgcolor: getSeverityColor(repatriation.daysOverdue),
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSeverityLabel(repatriation.daysOverdue)}
                          size="small"
                          icon={
                            repatriation.daysOverdue > 30 ? <Error /> :
                            repatriation.daysOverdue > 15 ? <Warning /> :
                            <Schedule />
                          }
                          sx={{
                            bgcolor: getSeverityColor(repatriation.daysOverdue),
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Selected Count */}
        {selectedIds.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {selectedIds.length} repatriation(s) selected
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compliance notices will be sent to the exporters
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <Tooltip title="Download compliance report">
            <Button
              startIcon={<Download />}
              onClick={handleExportReport}
              disabled={overdueRepatriations.length === 0}
            >
              Export Report
            </Button>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSendNotice}
            disabled={selectedIds.length === 0 || sending}
            sx={{ bgcolor: NBE_COLORS.error }}
          >
            {sending ? 'Sending...' : `Send Notice (${selectedIds.length})`}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default RepatriationCompliancePanel;
