// Consignment Management Panel
// Track consignment sales and outstanding balances

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
  Payment,
  LocalShipping,
} from '@mui/icons-material';

interface ConsignmentPanelProps {
  consignments: any[];
  onViewDetails: (consignment: any) => void;
  onUpdateStatus: (consignmentId: string, status: string) => void;
  onRecordPayment: (consignmentId: string, amount: number) => void;
}

export const ConsignmentPanel: React.FC<ConsignmentPanelProps> = ({
  consignments,
  onViewDetails,
  onUpdateStatus,
  onRecordPayment,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED': return 'info';
      case 'GOODS_SHIPPED': return 'warning';
      case 'GOODS_SOLD': return 'primary';
      case 'PAYMENT_RECEIVED': return 'success';
      case 'SETTLED': return 'success';
      default: return 'default';
    }
  };

  const calculateOutstanding = (consignment: any) => {
    const sold = consignment.soldAmount || 0;
    const received = consignment.receivedAmount || 0;
    return sold - received;
  };

  const calculateProgress = (consignment: any) => {
    const permit = consignment.permitAmount || 1;
    const sold = consignment.soldAmount || 0;
    return (sold / permit) * 100;
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={3}>
        Consignment Management
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Consignment Sale:</strong> Goods shipped to buyer's country without upfront payment. 
        Buyer sells goods, remits payment to exporter. Common for fruits/vegetables. High risk but good for market testing.
      </Alert>

      {consignments.length === 0 ? (
        <Alert severity="info">No consignments on record.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Consignment ID</strong></TableCell>
                <TableCell><strong>Exporter</strong></TableCell>
                <TableCell><strong>Commodity</strong></TableCell>
                <TableCell><strong>Buyer</strong></TableCell>
                <TableCell><strong>Permit Amount</strong></TableCell>
                <TableCell><strong>Sold</strong></TableCell>
                <TableCell><strong>Received</strong></TableCell>
                <TableCell><strong>Outstanding</strong></TableCell>
                <TableCell><strong>Progress</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {consignments.map((consignment) => {
                const outstanding = calculateOutstanding(consignment);
                const progress = calculateProgress(consignment);
                const permitAmount = consignment.permitAmount || 0;
                const soldAmount = consignment.soldAmount || 0;
                const receivedAmount = consignment.receivedAmount || 0;

                return (
                  <TableRow key={consignment.consignmentID}>
                    <TableCell>{consignment.consignmentID}</TableCell>
                    <TableCell>{consignment.exporterID}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {consignment.commodityType}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {consignment.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{consignment.buyerName}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {consignment.buyerCountry}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <strong>${permitAmount.toLocaleString()}</strong>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={soldAmount > 0 ? 'primary.main' : 'textSecondary'}>
                        ${soldAmount.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {progress.toFixed(0)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={receivedAmount > 0 ? 'success.main' : 'textSecondary'}>
                        ${receivedAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={outstanding > 0 ? 'error.main' : 'success.main'}
                      >
                        ${outstanding.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(progress, 100)} 
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
                          {progress.toFixed(0)}% sold
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={consignment.status} 
                        size="small"
                        color={getStatusColor(consignment.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => onViewDetails(consignment)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {consignment.status === 'REGISTERED' && (
                          <Tooltip title="Mark as Shipped">
                            <IconButton 
                              size="small"
                              color="info"
                              onClick={() => onUpdateStatus(consignment.consignmentID, 'GOODS_SHIPPED')}
                            >
                              <LocalShipping />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(consignment.status === 'GOODS_SHIPPED' || consignment.status === 'GOODS_SOLD') && outstanding > 0 && (
                          <Tooltip title="Record Payment">
                            <IconButton 
                              size="small"
                              color="success"
                              onClick={() => {
                                const amount = prompt(`Enter payment amount received (Outstanding: $${outstanding.toLocaleString()}):`);
                                if (amount && parseFloat(amount) > 0) {
                                  onRecordPayment(consignment.consignmentID, parseFloat(amount));
                                }
                              }}
                            >
                              <Payment />
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

      {/* Outstanding Balance Summary */}
      {consignments.length > 0 && (
        <Paper sx={{ p: 2, mt: 3, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Outstanding Balance Summary
          </Typography>
          <Typography variant="body2">
            Total Outstanding: <strong>${consignments.reduce((sum, c) => sum + calculateOutstanding(c), 0).toLocaleString()}</strong>
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {consignments.filter(c => calculateOutstanding(c) > 0).length} consignments with pending payments
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
