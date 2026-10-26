// Advance Payment Management Panel
// TT_ADVANCE and ADVANCE payment tracking

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Payment,
} from '@mui/icons-material';

interface AdvancePaymentPanelProps {
  advancePayments: any[];
  onViewDetails: (payment: any) => void;
  onReceiveAdvance: (paymentId: string, amount: number) => void;
  onReceiveBalance: (paymentId: string, amount: number) => void;
}

export const AdvancePaymentPanel: React.FC<AdvancePaymentPanelProps> = ({
  advancePayments,
  onViewDetails,
  onReceiveAdvance,
  onReceiveBalance,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ADVANCE_RECEIVED': return 'success';
      case 'GOODS_SHIPPED': return 'info';
      case 'BALANCE_PENDING': return 'warning';
      case 'COMPLETED': return 'success';
      default: return 'default';
    }
  };

  const calculateProgress = (payment: any) => {
    const advance = payment.advanceAmount || 0;
    const balance = payment.balanceAmount || 0;
    const total = payment.amount || 1;
    return ((advance + balance) / total) * 100;
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={3}>
        Advance Payment Tracking
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Advance Payment Method:</strong> Buyer pays 20-40% advance before shipment. Exporter sources coffee, 
        processes quality checks, and ships goods. Balance (60-80%) paid after shipment or document verification.
      </Alert>

      {advancePayments.length === 0 ? (
        <Alert severity="info">No advance payments on record.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Payment ID</strong></TableCell>
                <TableCell><strong>Exporter</strong></TableCell>
                <TableCell><strong>Contract</strong></TableCell>
                <TableCell><strong>Total Amount</strong></TableCell>
                <TableCell><strong>Advance</strong></TableCell>
                <TableCell><strong>Balance</strong></TableCell>
                <TableCell><strong>Progress</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {advancePayments.map((payment) => {
                const progress = calculateProgress(payment);
                const advanceAmount = payment.advanceAmount || 0;
                const balanceAmount = payment.balanceAmount || 0;
                const totalAmount = payment.amount || 0;

                return (
                  <TableRow key={payment.paymentID}>
                    <TableCell>{payment.paymentID}</TableCell>
                    <TableCell>{payment.exporterID}</TableCell>
                    <TableCell>{payment.contractID || 'N/A'}</TableCell>
                    <TableCell>
                      <strong>${totalAmount.toLocaleString()}</strong> {payment.currency}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={advanceAmount > 0 ? 'success.main' : 'textSecondary'}>
                        ${advanceAmount.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {totalAmount > 0 ? `${((advanceAmount / totalAmount) * 100).toFixed(0)}%` : '0%'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={balanceAmount > 0 ? 'success.main' : 'textSecondary'}>
                        ${balanceAmount.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {totalAmount > 0 ? `${((balanceAmount / totalAmount) * 100).toFixed(0)}%` : '0%'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: progress >= 100 ? '#4caf50' : progress >= 50 ? '#ff9800' : '#2196f3'
                            }
                          }}
                        />
                        <Typography variant="caption" color="textSecondary">
                          {progress.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.status} 
                        size="small"
                        color={getStatusColor(payment.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => onViewDetails(payment)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {payment.status === 'PENDING' && advanceAmount === 0 && (
                          <Tooltip title="Record Advance Received">
                            <IconButton 
                              size="small"
                              color="success"
                              onClick={() => {
                                const amount = prompt(`Enter advance amount received (up to $${totalAmount}):`);
                                if (amount && parseFloat(amount) > 0) {
                                  onReceiveAdvance(payment.paymentID, parseFloat(amount));
                                }
                              }}
                            >
                              <Payment />
                            </IconButton>
                          </Tooltip>
                        )}
                        {payment.status === 'GOODS_SHIPPED' && balanceAmount === 0 && (
                          <Tooltip title="Record Balance Received">
                            <IconButton 
                              size="small"
                              color="primary"
                              onClick={() => {
                                const remaining = totalAmount - advanceAmount;
                                const amount = prompt(`Enter balance amount received ($${remaining.toLocaleString()} expected):`);
                                if (amount && parseFloat(amount) > 0) {
                                  onReceiveBalance(payment.paymentID, parseFloat(amount));
                                }
                              }}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};
