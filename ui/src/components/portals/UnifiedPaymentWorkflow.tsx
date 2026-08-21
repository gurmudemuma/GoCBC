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
        // FOR LC: Show approved contracts awaiting LC issuance + existing LCs
        // First, add approved contracts as "pending LC requests" - but only if no LC exists yet
        const pendingLCRequests = contracts
          .filter(contract => {
            // Only show contract if NO LC exists for it yet
            const lcExists = letterOfCredits.some(lc => lc.contractId === contract.contractId);
            return !lcExists;
          })
          .map(contract => ({
            ...contract,
            id: contract.contractId,
            amount: contract.totalValue,
            currency: contract.currency,
            exporter: contract.exporterId,
            status: 'AWAITING_LC', // Custom status for contracts pending LC
            currentStep: -1, // Not in workflow yet
            isContract: true, // Flag to identify this as a contract, not an LC
            contractData: contract, // Keep full contract data
          }));
        
        // Then, add existing LCs - but exclude LCs that belong in Forex tab
        // LCs with forex allocations (any status) stay in Forex Allocations tab
        console.log('[PAYMENT METHODS] Available forex allocations:', forexAllocations.map(f => ({ forexId: f.forexId, lcId: f.lcId, status: f.status })));
        
        const existingLCs = letterOfCredits
          .filter(lc => {
            console.log(`[PAYMENT METHODS] Checking LC ${lc.lcId}, status: ${lc.status}`);
            
            // ✅ CRITICAL: Exclude LCs with forex-related statuses
            // These statuses indicate the LC is in the forex allocation workflow
            const forexRelatedStatuses = ['ISSUED', 'FOREX_ALLOCATED', 'FOREX_BACKED', 'FOREX_REQUESTED'];
            if (forexRelatedStatuses.includes(lc.status)) {
              console.log(`[PAYMENT METHODS] ❌ Excluding ${lc.lcId} - status is ${lc.status} (forex-related)`);
              return false;
            }
            
            // Exclude any LC that has a forex allocation record (REQUESTED, ALLOCATED, UTILIZED, EXPIRED)
            // Match by:
            // 1. Exact lcId match
            // 2. forexId pattern match (e.g., FOREX_LC1787055024941_timestamp)
            // 3. contractId + exporterId match (for forex without lcId populated yet)
            const hasForex = forexAllocations.some(f => {
              // Exact lcId match
              const lcIdMatch = f.lcId && lc.lcId && (
                f.lcId === lc.lcId || 
                f.lcId?.toLowerCase() === lc.lcId?.toLowerCase() ||
                f.lcId.replace(/\s/g, '') === lc.lcId.replace(/\s/g, '')
              );
              
              // forexId pattern match (forexId contains LC ID, e.g., FOREX_LC1787055024941_12345)
              const forexIdMatch = f.forexId && lc.lcId && f.forexId.includes(lc.lcId);
              
              // contractId + exporterId match (for forex records without lcId yet)
              const metadataMatch = f.contractId && f.exporterId && lc.contractId && lc.exporterId && 
                f.contractId === lc.contractId && f.exporterId === lc.exporterId;
              
              const match = lcIdMatch || forexIdMatch || metadataMatch;
              
              if (match) {
                console.log(`[PAYMENT METHODS] Found matching forex for ${lc.lcId}:`, {
                  forexId: f.forexId,
                  lcId: f.lcId || '(not set)',
                  status: f.status,
                  matchType: lcIdMatch ? 'lcId' : forexIdMatch ? 'forexId' : 'metadata'
                });
              }
              return match;
            });
            
            if (hasForex) {
              console.log(`[PAYMENT METHODS] ❌ Excluding ${lc.lcId} - has forex allocation record`);
              return false;
            }
            
            console.log(`[PAYMENT METHODS] ✅ Including ${lc.lcId} in Payment Methods`);
            // Include all other LCs in Payment Methods workflow
            return true;
          })
          .map(lc => {
          return {
            ...lc,
            id: lc.lcId,
            amount: lc.amount,
            currency: lc.currency,
            exporter: lc.exporterId,
            status: lc.status,
            currentStep: getCurrentStep(lc.status, 'LC'),
            isContract: false, // This is an LC, not a contract
          };
        });
        
        // Combine: pending contracts first, then existing LCs
        allPayments = [...pendingLCRequests, ...existingLCs];
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
    // Show all LC statuses in the table for complete visibility
    const methodConfig = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
    if (!methodConfig) return [];
    
    return allPayments.filter(payment => {
      // For LC: Show ALL valid statuses (REQUESTED, APPROVED, ISSUED, UTILIZED, EXPIRED)
      // Note: SHIPPED, DOCUMENTS_SUBMITTED, DOCUMENTS_VERIFIED are NOT valid LC statuses
      if (selectedPaymentMethod === 'LC') {
        // Show everything - bank needs to see complete LC lifecycle
        return true;
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
        'AWAITING_LC': -1,        // Approved contract awaiting LC creation (not in workflow yet)
        'REQUESTED': 0,           // LC Requested - shows "Approve Request" button (step 1)
        'APPROVED': 1,            // LC Approved - shows "Issue LC" button (step 2)
        'ISSUED': 2,              // LC Issued (MT700 sent) - forex allocated, awaiting documents
        'UTILIZED': 4,            // Documents verified, LC can be used for payment
        'EXPIRED': 5,             // LC expired
        'PAID': 5,                // Payment released (MT103 sent)
        'SETTLED': 5,             // Payment complete
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
      {selectedPaymentMethod === 'LC' && payments.filter(p => p.isContract).length > 0 && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(155, 48, 183, 0.05)',
            borderLeft: `4px solid ${CBE_COLORS.purple}`,
          }}
        >
          <strong>Pending LC Requests:</strong> {payments.filter(p => p.isContract).length} approved {payments.filter(p => p.isContract).length === 1 ? 'contract is' : 'contracts are'} ready for Letter of Credit issuance. Review contract details and issue LCs below.
        </Alert>
      )}
      
      {selectedPaymentMethod === 'LC' && payments.filter(p => !p.isContract && (p.status === 'ISSUED' || p.status === 'FOREX_REQUESTED' || p.status === 'FOREX_ALLOCATED')).length > 0 && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(33, 150, 243, 0.05)',
            borderLeft: `4px solid #2196f3`,
          }}
        >
          <strong>Active LCs:</strong> {payments.filter(p => !p.isContract && (p.status === 'ISSUED' || p.status === 'FOREX_REQUESTED' || p.status === 'FOREX_ALLOCATED')).length} issued {payments.filter(p => !p.isContract && (p.status === 'ISSUED' || p.status === 'FOREX_REQUESTED' || p.status === 'FOREX_ALLOCATED')).length === 1 ? 'Letter of Credit' : 'Letters of Credit'} in progress. View details below to track status and forex allocation.
        </Alert>
      )}

      {/* Payments Table */}
      <Paper sx={{ border: `1px solid #e0e0e0`, borderRadius: 2, overflow: 'hidden' }}>
        {/* Removed the large black header box - table has its own headers */}

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
                <TableRow>
                  <TableCell sx={{ 
                    bgcolor: CBE_COLORS.black,
                    color: CBE_COLORS.golden,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    px: 2,
                    borderBottom: 'none'
                  }}>
                    {selectedPaymentMethod === 'LC' ? 'Contract/LC ID' : 'ID'}
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: CBE_COLORS.black,
                    color: CBE_COLORS.golden,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    px: 2,
                    borderBottom: 'none'
                  }}>
                    Exporter
                  </TableCell>
                  {selectedPaymentMethod === 'LC' && (
                    <TableCell sx={{ 
                      bgcolor: CBE_COLORS.black,
                      color: CBE_COLORS.golden,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      py: 1,
                      px: 2,
                      borderBottom: 'none'
                    }}>
                      Buyer
                    </TableCell>
                  )}
                  <TableCell sx={{ 
                    bgcolor: CBE_COLORS.black,
                    color: CBE_COLORS.golden,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    px: 2,
                    borderBottom: 'none'
                  }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: CBE_COLORS.black,
                    color: CBE_COLORS.golden,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    px: 2,
                    borderBottom: 'none'
                  }}>
                    Workflow Progress
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: CBE_COLORS.black,
                    color: CBE_COLORS.golden,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    px: 2,
                    borderBottom: 'none'
                  }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ 
                    bgcolor: CBE_COLORS.black,
                    color: CBE_COLORS.golden,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    px: 2,
                    borderBottom: 'none'
                  }}>
                    Actions
                  </TableCell>
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
                      {selectedPaymentMethod === 'LC' && payment.isContract && (
                        <TableCell>
                          <Typography variant="body2" sx={{ color: CBE_COLORS.black }}>
                            {payment.contractData?.buyerName || 'N/A'}
                          </Typography>
                        </TableCell>
                      )}
                      {selectedPaymentMethod === 'LC' && !payment.isContract && (
                        <TableCell>
                          <Typography variant="body2" sx={{ color: CBE_COLORS.gray, fontStyle: 'italic' }}>
                            —
                          </Typography>
                        </TableCell>
                      )}
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
                          
                          {/* Special handling for AWAITING_LC status (approved contracts) */}
                          {payment.status === 'AWAITING_LC' && payment.isContract && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CheckCircle fontSize="small" />}
                                onClick={() => onProcessStep(payment.id, 'Issue LC')}
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
                                Issue LC
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => onProcessStep(payment.id, 'Reject LC')}
                                sx={{
                                  borderColor: '#d32f2f',
                                  color: '#d32f2f',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  '&:hover': {
                                    borderColor: '#b71c1c',
                                    bgcolor: 'rgba(211, 47, 47, 0.05)',
                                  },
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {/* Regular action buttons for existing LCs */}
                          {payment.status !== 'AWAITING_LC' && 
                           payment.currentStep < (selectedMethodConfig?.steps.length || 0) - 1 && 
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
                          {payment.status !== 'AWAITING_LC' &&
                           payment.currentStep < (selectedMethodConfig?.steps.length || 0) - 1 && 
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
    </Box>
  );
};
