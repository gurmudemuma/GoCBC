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
    steps: [
      'LC Requested',           // Step 0 - Exporter submits LC request
      'Approve Request',        // Step 1 - BANK ACTION: Review and approve
      'Issue LC',               // Step 2 - BANK ACTION: Issue LC (MT700)
      'Awaiting Shipment',      // Step 3 - Exporter ships goods
      'Verify Documents',       // Step 4 - BANK ACTION: Examine shipping docs
      'Release Payment'         // Step 5 - BANK ACTION: SWIFT MT103 payment
    ],
    bankActions: [1, 2, 4, 5], // Steps where bank takes action (forex allocation is separate)
    color: CBE_COLORS.purple,
    recommended: true,
  },
  {
    id: 'CAD',
    name: 'Documentary Collection',
    icon: <LocalShipping />,
    description: 'Cash Against Documents (D/P or D/A)',
    riskLevel: 'MEDIUM',
    steps: ['Goods Shipped', 'Receive Documents', 'Forward to Buyer', 'Buyer Notified', 'Payment Received', 'Release Documents'],
    bankActions: [1, 2, 5], // Bank receives, forwards, releases
    color: CBE_COLORS.golden,
  },
  {
    id: 'ADVANCE',
    name: 'Advance Payment',
    icon: <AttachMoney />,
    description: 'Payment before shipment (TT Advance)',
    riskLevel: 'LOW',
    steps: ['Proforma Invoice', 'Receive Advance', 'Contract Registered', 'Coffee Sourced', 'Quality Check', 'Goods Shipped', 'Receive Balance'],
    bankActions: [1, 6], // Bank processes advance and balance payments
    color: CBE_COLORS.black,
  },
  {
    id: 'CONSIGNMENT',
    name: 'Consignment',
    icon: <Assignment />,
    description: 'Restricted: Fruits, Flowers, Meat only',
    riskLevel: 'HIGH',
    steps: ['Issue Permit', 'Goods Shipped', 'Goods Sold', 'Payment Received', 'Account Settled'],
    bankActions: [0, 3, 4], // Bank issues permit and processes payments
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
  forexAllocations: any[]; // Add forex data to cross-reference
  onCreatePayment: (method: string, data: any) => void;
  onProcessStep: (paymentId: string, step: string) => void;
  onViewDetails: (payment: any) => void;
  rowsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

export const UnifiedPaymentWorkflow: React.FC<UnifiedPaymentWorkflowProps> = ({
  contracts,
  letterOfCredits,
  documentaryCollections,
  advancePayments,
  consignments,
  pendingDocuments,
  selectedPaymentMethod,
  forexAllocations,
  onCreatePayment,
  onProcessStep,
  onViewDetails,
  rowsPerPage: propRowsPerPage,
  currentPage: propCurrentPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const [showWorkflow, setShowWorkflow] = useState(false);
  
  // Local pagination state (fallback if props not provided)
  const [localPage, setLocalPage] = useState(0);
  const [localRowsPerPage, setLocalRowsPerPage] = useState(5);
  
  // Use props if provided, otherwise use local state
  const currentPage = propCurrentPage !== undefined ? propCurrentPage : localPage;
  const rowsPerPage = propRowsPerPage !== undefined ? propRowsPerPage : localRowsPerPage;
  
  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  };
  
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRowsPerPage);
    } else {
      setLocalRowsPerPage(newRowsPerPage);
    }
    handlePageChange(0);
  };

  // Get method configuration
  const selectedMethodConfig = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);

  // Get payments for selected method - FILTER TO ONLY SHOW ITEMS AWAITING BANK ACTION
  const getPaymentsForMethod = () => {
    let allPayments: any[] = [];
    
    switch (selectedPaymentMethod) {
      case 'LC':
        allPayments = letterOfCredits.map(lc => {
          // Check if this LC has a pending forex request
          const forexRequest = forexAllocations.find(f => f.lcId === lc.lcId);
          let effectiveStatus = lc.status;
          
          // If LC is ISSUED but has a pending forex request, treat it as FOREX_REQUESTED
          if (lc.status === 'ISSUED' && forexRequest && forexRequest.status === 'REQUESTED') {
            effectiveStatus = 'FOREX_REQUESTED';
          } else if (lc.status === 'ISSUED' && forexRequest && forexRequest.status === 'ALLOCATED') {
            effectiveStatus = 'FOREX_ALLOCATED';
          }
          
          return {
            ...lc,
            id: lc.lcId,
            amount: lc.amount,
            currency: lc.currency,
            exporter: lc.exporterId,
            status: effectiveStatus,
            currentStep: getCurrentStep(effectiveStatus, 'LC'),
            forexRequest, // Include forex data for reference
          };
        });
        break;
      case 'CAD':
        allPayments = documentaryCollections.map(cad => ({
          ...cad,
          id: cad.collectionId,
          amount: cad.amount,
          currency: cad.currency,
          exporter: cad.exporterId,
          status: cad.status,
          currentStep: getCurrentStep(cad.status, 'CAD'),
        }));
        break;
      case 'ADVANCE':
        allPayments = advancePayments.map(adv => ({
          ...adv,
          id: adv.paymentId,
          amount: adv.amount,
          currency: adv.currency,
          exporter: adv.exporterId,
          status: adv.status,
          currentStep: getCurrentStep(adv.status, 'ADVANCE'),
        }));
        break;
      case 'CONSIGNMENT':
        allPayments = consignments.map(con => ({
          ...con,
          id: con.consignmentId,
          amount: con.permitAmount,
          currency: 'USD',
          exporter: con.exporterId,
          status: con.status,
          currentStep: getCurrentStep(con.status, 'CONSIGNMENT'),
        }));
        break;
      default:
        return [];
    }
    
    // CRITICAL FILTER: Only show payments where bank needs to take action IN THIS TAB
    // Forex allocation happens in Banking Operations tab, so hide those LCs here
    const methodConfig = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
    if (!methodConfig) return [];
    
    return allPayments.filter(payment => {
      // For LC: Hide if status is ISSUED (waiting for forex/shipment - handled elsewhere)
      if (selectedPaymentMethod === 'LC') {
        if (payment.status === 'ISSUED') {
          return false; // Don't show - LC is issued, forex allocation happens in Banking Operations → Forex Allocation tab
        }
        // Hide if waiting for shipment (exporter action, not bank)
        if (payment.status === 'SHIPPED' && payment.currentStep === 3) {
          return false; // Don't show - exporter must ship goods
        }
      }
      
      // Show if completed (for history/reference)
      if (payment.status === 'PAID' || payment.status === 'SETTLED') {
        return true;
      }
      
      // Show only if current step OR next step requires bank action IN THIS TAB
      const currentStepIsBank = methodConfig.bankActions?.includes(payment.currentStep);
      const nextStepIsBank = methodConfig.bankActions?.includes(payment.currentStep + 1);
      
      // Show if we're at a bank step or about to reach one
      return currentStepIsBank || nextStepIsBank;
    });
  };

  // Map status to workflow step
  const getCurrentStep = (status: string, method: string): number => {
    const stepMappings: Record<string, Record<string, number>> = {
      LC: {
        'REQUESTED': 0,           // LC Requested
        'APPROVED': 1,            // Approve Request (ready for issuance)
        'ISSUED': 2,              // Issue LC (MT700 sent)
        'SHIPPED': 3,             // Awaiting Shipment (goods in transit)
        'DOCUMENTS_SUBMITTED': 4, // Verify Documents (bank examines)
        'DOCUMENTS_VERIFIED': 4,  // Verify Documents (bank approved docs)
        'PAID': 5,                // Release Payment (MT103 sent)
        'SETTLED': 5,             // Release Payment (complete)
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

      {/* Info Alert for LC Payment Method */}
      {selectedPaymentMethod === 'LC' && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(155, 48, 183, 0.05)',
            borderLeft: `4px solid ${CBE_COLORS.purple}`,
          }}
        >
          <strong>Note:</strong> LCs with ISSUED status have moved to <strong>Banking Operations → Forex Allocation</strong> tab. 
          Forex allocation is handled separately per NBE policy guidelines.
        </Alert>
      )}

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
                {payments
                  .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
                  .map((payment) => {
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
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility fontSize="small" />}
                            onClick={() => onViewDetails(payment)}
                            sx={{
                              borderColor: CBE_COLORS.purple,
                              color: CBE_COLORS.purple,
                              fontWeight: 600,
                              textTransform: 'none',
                              '&:hover': {
                                borderColor: CBE_COLORS.purpleDark,
                                bgcolor: 'rgba(155, 48, 183, 0.05)',
                              },
                            }}
                          >
                            View Details
                          </Button>
                          {/* Only show action button if current step is a bank action */}
                          {payment.currentStep < (selectedMethodConfig?.steps.length || 0) - 1 && 
                           payment.status !== 'PAID' && 
                           payment.status !== 'SETTLED' &&
                           selectedMethodConfig?.bankActions?.includes(payment.currentStep + 1) && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle fontSize="small" />}
                              onClick={() => onProcessStep(payment.id, selectedMethodConfig?.steps[payment.currentStep + 1] || '')}
                              sx={{
                                bgcolor: CBE_COLORS.golden,
                                color: CBE_COLORS.black,
                                fontWeight: 600,
                                textTransform: 'none',
                                '&:hover': {
                                  bgcolor: CBE_COLORS.goldenLight,
                                },
                              }}
                            >
                              {selectedMethodConfig?.steps[payment.currentStep + 1] || 'Next Action'}
                            </Button>
                          )}
                          {/* Show info if next step is not a bank action */}
                          {payment.currentStep < (selectedMethodConfig?.steps.length || 0) - 1 && 
                           payment.status !== 'PAID' && 
                           payment.status !== 'SETTLED' &&
                           !selectedMethodConfig?.bankActions?.includes(payment.currentStep + 1) && (
                            <Chip 
                              label={`⏳ Awaiting: ${selectedMethodConfig?.steps[payment.currentStep + 1]}`}
                              size="small" 
                              sx={{ 
                                bgcolor: '#f5f5f5',
                                color: CBE_COLORS.gray,
                                fontWeight: 600,
                              }} 
                            />
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
        
        {/* Pagination Controls */}
        {payments.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="black">Rows per page:</Typography>
              <TextField
                select
                size="small"
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
                sx={{ width: 80 }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="black">
                Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, payments.length)} of {payments.length}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={currentPage === 0}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={currentPage >= Math.ceil(payments.length / rowsPerPage) - 1}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </Box>
            </Box>
          </Box>
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
