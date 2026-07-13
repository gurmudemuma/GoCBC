// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unified Payment Method Workflow Component - CBE Colors Only
// Purple (#9b30b7), Golden (#FFD700), Black (#000000), White (#ffffff)

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  MenuItem,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Description,
  AttachMoney,
  Assignment,
  Payment,
  Visibility,
  CheckCircle,
  LocalShipping,
  AccessTime,
  AccountBalance,
  SwapHoriz,
} from '@mui/icons-material';

// CBE Color Palette
const CBE_COLORS = {
  purple: '#9b30b7',
  golden: '#FFD700',
  black: '#000000',
  white: '#ffffff',
  purpleDark: '#7a2592',
  purpleLight: '#b366cc',
  goldenLight: '#FFE44D',
  gray: '#666666',
};

// Payment Method Configuration
const PAYMENT_METHODS = [
  {
    id: 'LC',
    name: 'Letter of Credit',
    icon: <Description />,
    description: 'Bank-guaranteed payment (UCP 600)',
    riskLevel: 'LOW',
    steps: ['Request LC', 'Approve LC', 'Issue LC', 'Ship Goods', 'Examine Documents', 'Release Payment'],
    color: CBE_COLORS.purple,
    recommended: true,
  },
  {
    id: 'CAD',
    name: 'Documentary Collection',
    icon: <LocalShipping />,
    description: 'Cash Against Documents (D/P or D/A)',
    riskLevel: 'MEDIUM',
    steps: ['Ship Goods', 'Submit to Bank', 'Forward Documents', 'Notify Buyer', 'Receive Payment', 'Release Documents'],
    color: CBE_COLORS.golden,
  },
  {
    id: 'ADVANCE',
    name: 'Advance Payment',
    icon: <AttachMoney />,
    description: 'Payment before shipment (TT Advance)',
    riskLevel: 'LOW',
    steps: ['Issue Proforma', 'Receive Advance', 'Register Contract', 'Source Coffee', 'Quality Check', 'Ship Goods', 'Receive Balance'],
    color: CBE_COLORS.black,
  },
  {
    id: 'CONSIGNMENT',
    name: 'Consignment',
    icon: <Assignment />,
    description: 'Restricted: Fruits, Flowers, Meat only',
    riskLevel: 'HIGH',
    steps: ['Issue Permit', 'Ship Goods', 'Sell Goods', 'Receive Payment', 'Settle Account'],
    color: CBE_COLORS.gray,
  },
];

interface UnifiedPaymentWorkflowProps {
  contracts: any[];
  letterOfCredits: any[];
  documentaryCollections: any[];
  advancePayments: any[];
  consignments: any[];
  pendingDocuments: any[];
  selectedPaymentMethod: string;
  onCreatePayment: (method: string, data: any) => void;
  onProcessStep: (paymentId: string, step: string) => void;
  onViewDetails: (payment: any) => void;
}

export const UnifiedPaymentWorkflow: React.FC<UnifiedPaymentWorkflowProps> = ({
  contracts,
  letterOfCredits,
  documentaryCollections,
  advancePayments,
  consignments,
  pendingDocuments,
  selectedPaymentMethod,
  onCreatePayment,
  onProcessStep,
  onViewDetails,
}) => {
  const [showWorkflow, setShowWorkflow] = useState(false);

  // Get method configuration
  const selectedMethodConfig = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);

  // Get payments for selected method
  const getPaymentsForMethod = () => {
    switch (selectedPaymentMethod) {
      case 'LC':
        return letterOfCredits.map(lc => ({
          ...lc,
          id: lc.lcId,
          amount: lc.amount,
          currency: lc.currency,
          exporter: lc.exporterId,
          status: lc.status,
          currentStep: getCurrentStep(lc.status, 'LC'),
        }));
      case 'CAD':
        return documentaryCollections.map(cad => ({
          ...cad,
          id: cad.collectionId,
          amount: cad.amount,
          currency: cad.currency,
          exporter: cad.exporterId,
          status: cad.status,
          currentStep: getCurrentStep(cad.status, 'CAD'),
        }));
      case 'ADVANCE':
        return advancePayments.map(adv => ({
          ...adv,
          id: adv.paymentId,
          amount: adv.amount,
          currency: adv.currency,
          exporter: adv.exporterId,
          status: adv.status,
          currentStep: getCurrentStep(adv.status, 'ADVANCE'),
        }));
      case 'CONSIGNMENT':
        return consignments.map(con => ({
          ...con,
          id: con.consignmentId,
          amount: con.permitAmount,
          currency: 'USD',
          exporter: con.exporterId,
          status: con.status,
          currentStep: getCurrentStep(con.status, 'CONSIGNMENT'),
        }));
      default:
        return [];
    }
  };

  // Map status to workflow step
  const getCurrentStep = (status: string, method: string): number => {
    const stepMappings: Record<string, Record<string, number>> = {
      LC: {
        'REQUESTED': 0,
        'APPROVED': 1,
        'ISSUED': 2,
        'DOCUMENTS_VERIFIED': 4,
        'PAID': 5,
      },
      CAD: {
        'PENDING': 0,
        'GOODS_SHIPPED': 0,
        'DOCUMENTS_SENT_TO_BANK': 1,
        'DOCUMENTS_FORWARDED': 2,
        'BUYER_NOTIFIED': 3,
        'PAYMENT_RECEIVED': 4,
        'DOCUMENTS_RELEASED': 5,
      },
      ADVANCE: {
        'PROFORMA_ISSUED': 0,
        'ADVANCE_RECEIVED': 1,
        'CONTRACT_REGISTERED': 2,
        'COFFEE_SOURCING': 3,
        'QUALITY_INSPECTION': 4,
        'GOODS_SHIPPED': 5,
        'BALANCE_RECEIVED': 6,
      },
      CONSIGNMENT: {
        'PERMIT_ISSUED': 0,
        'GOODS_SHIPPED': 1,
        'GOODS_SOLD': 2,
        'PAYMENT_RECEIVED': 3,
        'SETTLED': 4,
      },
    };
    
    return stepMappings[method]?.[status] ?? 0;
  };

  const payments = getPaymentsForMethod();

  return (
    <Box>
      {/* Quick Actions Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: CBE_COLORS.black }}>
          {selectedMethodConfig?.name} Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {contracts.length > 0 && (
            <Button
              variant="contained"
              startIcon={<Payment />}
              onClick={() => onCreatePayment(selectedPaymentMethod, {})}
              sx={{
                bgcolor: CBE_COLORS.purple,
                color: CBE_COLORS.white,
                fontWeight: 600,
                '&:hover': {
                  bgcolor: CBE_COLORS.purpleDark,
                },
              }}
            >
              Create New {selectedMethodConfig?.name}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Description />}
            onClick={() => {
              // Export to CSV functionality
              const csvData = payments.map(p => `${p.id},${p.exporter},${p.amount},${p.currency},${p.status}`).join('\n');
              const blob = new Blob([`ID,Exporter,Amount,Currency,Status\n${csvData}`], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${selectedMethodConfig?.name}-transactions.csv`;
              link.click();
            }}
            sx={{
              borderColor: CBE_COLORS.purple,
              color: CBE_COLORS.purple,
              fontWeight: 600,
              '&:hover': {
                borderColor: CBE_COLORS.purpleDark,
                bgcolor: 'rgba(155, 48, 183, 0.05)',
              },
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Payments Table */}
      <Paper sx={{ border: `2px solid ${CBE_COLORS.black}` }}>
        <Box sx={{ 
          bgcolor: CBE_COLORS.black, 
          color: CBE_COLORS.golden, 
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedMethodConfig?.name} Transactions
          </Typography>
          <Chip 
            label={`${payments.length} Active`}
            sx={{ 
              bgcolor: CBE_COLORS.golden, 
              color: CBE_COLORS.black,
              fontWeight: 700,
            }}
          />
        </Box>

        {payments.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%',
              bgcolor: 'rgba(155, 48, 183, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              {selectedMethodConfig?.icon && React.cloneElement(selectedMethodConfig.icon, { 
                sx: { fontSize: 40, color: CBE_COLORS.purple } 
              })}
            </Box>
            <Typography variant="h6" sx={{ color: CBE_COLORS.black, mb: 1, fontWeight: 600 }}>
              No {selectedMethodConfig?.name} Transactions Yet
            </Typography>
            <Typography variant="body2" sx={{ color: CBE_COLORS.gray, mb: 3, maxWidth: 400, mx: 'auto' }}>
              {contracts.length > 0 
                ? `You have ${contracts.length} NBE-approved contracts ready for ${selectedMethodConfig?.name} processing. Create your first transaction to get started.`
                : `No approved contracts available. Contracts must be NBE-approved before ${selectedMethodConfig?.name} can be issued.`}
            </Typography>
            {contracts.length > 0 && (
              <Button
                variant="contained"
                size="large"
                startIcon={<Payment />}
                onClick={() => onCreatePayment(selectedPaymentMethod, {})}
                sx={{
                  bgcolor: CBE_COLORS.purple,
                  color: CBE_COLORS.white,
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    bgcolor: CBE_COLORS.purpleDark,
                  },
                }}
              >
                Create First {selectedMethodConfig?.name}
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: CBE_COLORS.black }}>
                  <TableCell sx={{ color: CBE_COLORS.golden, fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ color: CBE_COLORS.golden, fontWeight: 700 }}>Exporter</TableCell>
                  <TableCell sx={{ color: CBE_COLORS.golden, fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ color: CBE_COLORS.golden, fontWeight: 700 }}>Workflow Progress</TableCell>
                  <TableCell sx={{ color: CBE_COLORS.golden, fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ color: CBE_COLORS.golden, fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => {
                  const progress = (payment.currentStep / (selectedMethodConfig?.steps.length || 1)) * 100;
                  
                  return (
                    <TableRow 
                      key={payment.id}
                      sx={{
                        '&:hover': {
                          bgcolor: 'rgba(155, 48, 183, 0.05)',
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: CBE_COLORS.black }}>
                          {payment.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: CBE_COLORS.black }}>
                          {payment.exporter}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: CBE_COLORS.purple }}>
                          ${payment.amount?.toLocaleString()} {payment.currency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{
                                flexGrow: 1,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'rgba(0,0,0,0.1)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: progress === 100 ? CBE_COLORS.golden : CBE_COLORS.purple,
                                },
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: CBE_COLORS.black }}>
                              {Math.round(progress)}%
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: CBE_COLORS.gray }}>
                            {selectedMethodConfig?.steps[payment.currentStep] || 'Starting'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status}
                          size="small"
                          sx={{
                            bgcolor: payment.status.includes('PAID') || payment.status.includes('SETTLED') ? 
                              CBE_COLORS.golden : CBE_COLORS.purple,
                            color: payment.status.includes('PAID') || payment.status.includes('SETTLED') ? 
                              CBE_COLORS.black : CBE_COLORS.white,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Full Details">
                            <IconButton
                              size="small"
                              onClick={() => onViewDetails(payment)}
                              sx={{
                                color: CBE_COLORS.purple,
                                '&:hover': {
                                  bgcolor: 'rgba(155, 48, 183, 0.1)',
                                },
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {payment.currentStep < (selectedMethodConfig?.steps.length || 0) - 1 && payment.status !== 'PAID' && payment.status !== 'SETTLED' && (
                            <Tooltip title={`Process: ${selectedMethodConfig?.steps[payment.currentStep + 1] || 'Next Step'}`}>
                              <IconButton
                                size="small"
                                onClick={() => onProcessStep(payment.id, selectedMethodConfig?.steps[payment.currentStep + 1] || '')}
                                sx={{
                                  color: CBE_COLORS.golden,
                                  border: `1px solid ${CBE_COLORS.golden}`,
                                  '&:hover': {
                                    bgcolor: CBE_COLORS.golden,
                                    color: CBE_COLORS.black,
                                  },
                                }}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(payment.status === 'PAID' || payment.status === 'SETTLED') && (
                            <Chip 
                              label="✓ Complete" 
                              size="small" 
                              sx={{ 
                                bgcolor: CBE_COLORS.golden, 
                                color: CBE_COLORS.black, 
                                fontWeight: 700,
                                ml: 1,
                              }} 
                            />
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
      </Paper>

      {/* Available Contracts Alert */}
      {contracts.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 3,
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            color: CBE_COLORS.black,
            border: `1px solid ${CBE_COLORS.black}`,
            '& .MuiAlert-icon': {
              color: CBE_COLORS.purple,
            },
          }}
        >
          <strong>{contracts.length} NBE-approved contracts</strong> are available for payment processing via {selectedMethodConfig?.name}
        </Alert>
      )}
    </Box>
  );
};
