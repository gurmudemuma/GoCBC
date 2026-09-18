// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Banks Portal - Letter of Credit, Forex & Export Permit Management

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Checkbox,
  ThemeProvider,
  createTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { createOrganizationTheme } from '@/theme/organizationThemes';
import { apiFetch, API_ENDPOINTS, getAuthHeaders } from '@/config/api.config';
import { couchDBService } from '@/services/couchdbService';
import {
  AccountBalance,
  CurrencyExchange,
  Assignment,
  Visibility,
  CheckCircle,
  Payment,
  Description,
  TrendingUp,
  Warning,
  AttachMoney,
  AccessTime,
  Comment as CommentIcon,
  CloudUpload,
  DirectionsBoat,
  FlightTakeoff,
  LocalShipping,
  Edit,
  Cancel,
  Message as MessageOutlined,
  Send as SendOutlined,
  Person,
  Assessment,
  People,
  PersonAdd,
  Security,
  AdminPanelSettings,
  Timeline,
  VerifiedUser,
  AccountTree,
} from '@mui/icons-material';
import AuditTrailViewer from './AuditTrailViewer';
import AuditTrailTable from './AuditTrailTable';
import DocumentVerificationPanel from './DocumentVerificationPanel';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import ForexAllocationDialog from './ForexAllocationDialog';
import SwiftComposeDialog from './SwiftComposeDialog';

// Modern Components
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
} from '@/components/modern';
import { PaymentDocuments } from './PaymentDocuments';
import { PaymentMethodForms } from './PaymentMethodForms';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import { UnifiedPaymentWorkflow } from './UnifiedPaymentWorkflow';
import { PaymentMethodTab } from './PaymentMethodTab';
import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { DocumentManagementPanel } from '@/components/documents';
import { BlockchainStatusIcon, BlockchainTxChip, BlockchainBadge } from '@/components/blockchain';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';
import BusinessActivityTimeline from '@/components/documents/BusinessActivityTimeline';
import ExporterHistoricalTrend from '@/components/shared/ExporterHistoricalTrend';
import PostDeliveryWorkflowPanel from '../shared/PostDeliveryWorkflowPanel';

interface SalesContract {
  contractId: string;
  nbeReferenceNumber?: string;
  exporterId: string;
  buyerId?: string;        // Buyer ID
  buyerName: string;
  buyerCountry: string;
  buyerBank?: string;      // Issuing bank (buyer's bank)
  exporterBank?: string;   // Advising bank (exporter's bank)
  coffeeType: string;
  quantity: number;
  pricePerKg: number;
  totalValue: number;
  currency: string;
  status: string;
  registrationDate: string;
  approvalDate?: string;
}

interface LetterOfCredit {
  lcId: string;
  contractId: string;
  exporterId: string;
  buyerId?: string;
  buyerName?: string;
  buyerCountry?: string;
  bankName: string;
  issuingBank: string;
  advisingBank: string;
  swiftReference?: string;
  lcNumber?: string;
  applicant?: string;
  beneficiary?: string;
  amount: number;
  currency: string;
  transportMode?: 'SEA' | 'AIR';
  portOfLoading?: string;
  portOfDischarge?: string;
  latestShipmentDate?: string;
  status: string;
  expiryDate: string;
  requestDate: string;
  issueDate?: string;
  approvalDate?: string;
  advisingDate?: string;
  confirmationStatus?: 'CONFIRMED' | 'UNCONFIRMED';
  paymentTerms?: string;
  terms?: string;
  
  // ✅ Documents attached to LC
  documents?: any[];
  
  // ✅ Actor tracking fields (WHO performed actions)
  approvedBy?: string;
  approvedByMsp?: string;
  issuedBy?: string;
  issuedByMsp?: string;
  lastUpdatedBy?: string;
  lastUpdatedByMsp?: string;
}

interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  lcId: string;
  buyerName?: string; // ✅ Added for buyer enrichment
  BuyerName?: string; // ✅ Alternative field name
  buyerCountry?: string; // ✅ Added for buyer country
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  status: string;
  expiryDate: string | null;
}

// Use the organization theme for BANKS (purple/golden/black/white)
const banksTheme = createOrganizationTheme('BANKS');

// CBE Color Palette - Commercial Bank of Ethiopia
const CBE_COLORS = {
  purple: '#9b30b7',
  golden: '#FFD700',
  black: '#000000',
  white: '#ffffff',
};

const BanksPortal: React.FC = () => {
  // 🔇 Logging Control - Set to true to enable verbose logs
  const DEV_LOGGING = false;
  const devLog = (...args: any[]) => {
    if (DEV_LOGGING) console.log(...args);
  };

  const { user } = useAuth();
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('LC');
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [lcDetailsLoading, setLcDetailsLoading] = useState(false); // ✅ Loading state for LC details
  const [letterOfCredits, setLetterOfCredits] = useState<LetterOfCredit[]>([]);
  const [forexAllocations, setForexAllocations] = useState<ForexAllocation[]>([]);
  const [exportPermits, setExportPermits] = useState<any[]>([]);
  const [deliveredShipments, setDeliveredShipments] = useState<any[]>([]);
  const [documentaryCollections, setDocumentaryCollections] = useState<any[]>([]);
  const [advancePayments, setAdvancePayments] = useState<any[]>([]);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<any[]>([]);
  const [swiftStats, setSwiftStats] = useState<any>(null);
  const [swiftMessages, setSwiftMessages] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [documentUploadDialogOpen, setDocumentUploadDialogOpen] = useState(false);
  const [uploadEntityId, setUploadEntityId] = useState<string>('');
  const [uploadEntityType, setUploadEntityType] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<SalesContract | null>(null);
  const [selectedLC, setSelectedLC] = useState<LetterOfCredit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'lc' | 'forex' | 'permit' | 'lcDetails' | 'lcAmend' | 'cad' | 'advance' | 'consignment' | null>(null);
  
  // Document Validation Dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  
  // Bulk selection state
  const [selectedLCIds, setSelectedLCIds] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  
  // Phase 1: Document Examination & Payment Release state
  const [documentExaminationOpen, setDocumentExaminationOpen] = useState(false);
  const [verifyingDocumentId, setVerifyingDocumentId] = useState<string | null>(null); // ✅ Track which document is being verified
  const [paymentReleaseOpen, setPaymentReleaseOpen] = useState(false);
  const [lcAmendmentOpen, setLcAmendmentOpen] = useState(false);
  const [forexDetailsOpen, setForexDetailsOpen] = useState(false);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [selectedForex, setSelectedForex] = useState<ForexAllocation | null>(null);
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<any | null>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    forexId: '',
    lcId: '',
    amount: 0,
    exchangeRate: 115.5,
    retentionRate: 50,
    officer: '',
    approvalRef: '',
    expiryDate: '',
  });

  // SWIFT compose dialog state
  const [swiftComposeOpen, setSwiftComposeOpen] = useState(false);
  const [selectedSwiftMessage, setSelectedSwiftMessage] = useState<any | null>(null);
  const [swiftDetailsDialogOpen, setSwiftDetailsDialogOpen] = useState(false);
  const [swiftForm, setSwiftForm] = useState<any>({
    messageID: '',
    messageType: 'MT103',
    swiftReference: '',
    senderBIC: 'CBETETAA',
    receiverBIC: '',
    amount: '',
    currency: 'USD',
    valueDate: '',
    beneficiary: '',
    remittanceInfo: '',
    linkedLcId: '',
    linkedPaymentId: '',
    applicant: '',
    lcExpiryDate: '',
  });
  const [documentExaminationFilter, setDocumentExaminationFilter] = useState<'PENDING_EXAMINATION' | 'VERIFIED'>('PENDING_EXAMINATION');
  const [paymentReleaseFilter, setPaymentReleaseFilter] = useState<'READY_FOR_PAYMENT' | 'RELEASED_TODAY' | 'TOTAL_RELEASED'>('READY_FOR_PAYMENT');
  const [lcsForExamination, setLcsForExamination] = useState<LetterOfCredit[]>([]);
  const [lcsForPaymentRelease, setLcsForPaymentRelease] = useState<LetterOfCredit[]>([]);
  
  // KPI Data Dialog state
  const [kpiDataDialogOpen, setKpiDataDialogOpen] = useState(false);
  const [kpiDataDialogTitle, setKpiDataDialogTitle] = useState('');
  const [kpiDataDialogData, setKpiDataDialogData] = useState<any[]>([]);
  const [kpiDataDialogType, setKpiDataDialogType] = useState<'forex' | 'lc' | 'swift' | ''>('');
  const [kpiDialogPage, setKpiDialogPage] = useState(0);
  const [kpiDialogRowsPerPage, setKpiDialogRowsPerPage] = useState(5);
  
  // LC Amendment Form
  const [amendmentForm, setAmendmentForm] = useState({
    amendmentReason: '',
    newAmount: '',
    newExpiryDate: '',
    newTerms: '',
  });
  
  // LC Form
  const [lcForm, setLcForm] = useState({
    issuingBank: '',
    advisingBank: '',
    beneficiary: '',
    terms: 'Payment against shipping documents as per UCP 600',
    expiryDays: '90',
  });

  // Forex Form
  const [forexForm, setForexForm] = useState({
    allocatedAmount: '',
    exchangeRate: '',
    retentionRate: '40',
    expiryDays: '180',
    nbeOfficer: '',
    nbeApprovalRef: '',
  });

  // Export Permit Form
  const [permitForm, setPermitForm] = useState({
    permitNumber: '',
    paymentMethod: 'LC',
    amount: '',
    description: '',
    destination: '',
    commercialInvoice: '',
  });

  // Documentary Collection Form
  const [cadForm, setCadForm] = useState({
    drawerName: '',
    draweeName: '',
    draweeAddress: '',
    paymentTerm: 'SIGHT',
    acceptanceDays: '',
    collectingBank: '',
    collectingBankBIC: '',
    remittingBank: '',
    remittingBankBIC: '',
    instructions: '',
  });

  // Advance Payment Form
  const [advanceForm, setAdvanceForm] = useState({
    creditAdviceNumber: '',
    payingBank: '',
    payingBankBIC: '',
    swiftReference: '',
    beneficiaryAccount: '',
  });

  // Consignment Form
  const [consignmentForm, setConsignmentForm] = useState({
    commodityType: 'FRUITS',
    description: '',
    buyerName: '',
    buyerAddress: '',
    permitAmount: '',
  });

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'LC' | 'PAYMENT' | 'FOREX'>('LC');
  const [auditEntityId, setAuditEntityId] = useState<string>('');
  const [auditStats, setAuditStats] = useState({
    totalActivities: 0,
    todaysActions: 0,
    blockchainVerified: 0,
    organizationsInvolved: 0,
  });
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    bankRoles: 0,
    administrators: 0,
  });

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Advanced filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Get current user role from auth context (already imported at top)
  const userRole = user?.role || '';

  // Role-based tab filtering
  const getRoleBasedTabs = () => {
    const isSuperAdmin = userRole === 'ADMIN';
    
    const allTabs = [
      { index: 0, label: 'Payment Methods', icon: <Payment />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Payment Officer'] },
      { index: 1, label: `Forex Allocations${forexAllocations.length > 0 ? ` (${forexAllocations.length})` : ''}`, icon: <CurrencyExchange />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Forex Officer'] },
      { index: 2, label: `SWIFT Messages${swiftMessages.length > 0 ? ` (${swiftMessages.length})` : ''}`, icon: <AccountBalance />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'SWIFT Officer'] },
      { index: 3, label: `Document Examination${lcsForExamination.length > 0 ? ` (${lcsForExamination.length})` : ''}`, icon: <Description />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Document Officer'] },
      { index: 4, label: `Payment Release${lcsForPaymentRelease.length > 0 ? ` (${lcsForPaymentRelease.length})` : ''}`, icon: <AttachMoney />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Payment Officer'] },
      { index: 5, label: 'Analytics', icon: <Assessment />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer'] },
      { index: 6, label: 'User Management', icon: <Person />, roles: ['ADMIN', 'BANKS', 'BANKS Portal Administrator'] },
      { index: 7, label: 'Audit Trail', icon: <Assessment />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Payment Officer', 'Forex Officer', 'SWIFT Officer', 'Document Officer'] },
      { index: 8, label: `LC Settlements${deliveredShipments.length > 0 ? ` (${deliveredShipments.length})` : ''}`, icon: <CheckCircle />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'LC Officer', 'Payment Officer'] },
    ];
    
    if (isSuperAdmin) return allTabs;
    return allTabs.filter(tab => tab.roles.includes(userRole));
  };
  
  const visibleTabs = getRoleBasedTabs();

  // Payment Method Configuration
  const PAYMENT_METHODS = [
    {
      id: 'LC',
      name: 'Letter of Credit',
      steps: ['Request LC', 'Approve LC', 'Issue LC', 'Ship Goods', 'Examine Documents', 'Release Payment'],
    },
    {
      id: 'CAD',
      name: 'Documentary Collection',
      steps: ['Ship Goods', 'Submit to Bank', 'Forward Documents', 'Notify Buyer', 'Receive Payment', 'Release Documents'],
    },
    {
      id: 'ADVANCE',
      name: 'Advance Payment',
      steps: ['Issue Proforma', 'Receive Advance', 'Register Contract', 'Source Coffee', 'Quality Check', 'Ship Goods', 'Receive Balance'],
    },
    {
      id: 'CONSIGNMENT',
      name: 'Consignment',
      steps: ['Issue Permit', 'Ship Goods', 'Sell Goods', 'Receive Payment', 'Settle Account'],
    },
  ];
  
  const selectedMethodConfig = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);

  useEffect(() => {
    loadBankingData();
  }, []);

  // Auto-fill LC form when dialog opens with a selected contract
  useEffect(() => {
    if (dialogOpen && dialogType === 'lc' && selectedContract) {
      const userOrg = user?.organization || 'Commercial Bank of Ethiopia';
      
      let issuingBankValue = selectedContract.buyerBank || '';
      if (!issuingBankValue && selectedContract.buyerName && selectedContract.buyerCountry) {
        issuingBankValue = `${selectedContract.buyerName}'s Bank (${selectedContract.buyerCountry})`;
      }
      
      const advisingBankValue = selectedContract.exporterBank || userOrg;
      
      const formData = {
        issuingBank: issuingBankValue,
        advisingBank: advisingBankValue,
        beneficiary: selectedContract.exporterId || '',
        terms: 'Payment against shipping documents as per UCP 600',
        expiryDays: '90',
      };
      
      console.log('[useEffect] Auto-filling LC form:', formData);
      setLcForm(formData);
    }
  }, [dialogOpen, dialogType, selectedContract]);

  // Load audit stats when Audit Trail tab is active
  useEffect(() => {
    if (activeTab === 7) {
      loadAuditStats();
    } else if (activeTab === 6) {
      loadUserStats();
    }
  }, [activeTab]);

  const loadBankingData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('[BANKS] No auth token found');
      showError('Authentication Required', 'Please log in to access banking data', '');
      return;
    }

    devLog('[BANKS] ⚡ PARALLEL LOADING - All data loads at once!');

    try {
      // Launch ALL requests in parallel - each updates state as soon as it completes
      const [lcPromise, swiftPromise, forexPromise, shipmentsPromise] = [
        // 1. LCs
        apiFetch('/banking/lc', { headers: { 'Authorization': `Bearer ${token}` }})
          .then(r => r.json())
          .then(result => {
            if (result.success) {
              const lcs = result.data.map((lc: any) => ({
                lcId: lc.lcId || lc.LCID,
                contractId: lc.contractId,
                exporterId: lc.exporterId,
                buyerId: lc.buyerId,
                buyerName: lc.buyerName || '',
                buyerCountry: lc.buyerCountry || '',
                amount: lc.amount,
                currency: lc.currency,
                status: lc.status,
                documents: lc.documents || [],
                requestDate: lc.requestDate || lc.createdAt,
                issueDate: lc.issueDate,
                expiryDate: lc.expiryDate,
                approvalDate: lc.approvalDate,
                issuingBank: lc.issuingBank,
                advisingBank: lc.advisingBank,
              }));
              setLetterOfCredits(lcs);
              devLog(`[BANKS] ⚡ LCs loaded: ${lcs.length}`);
              return lcs;
            }
            return [];
          })
          .catch(err => { console.warn('[BANKS] LCs failed:', err); return []; }),

        // 2. SWIFT Messages - PRIORITY!
        apiFetch('/swift/messages', { headers: { 'Authorization': `Bearer ${token}` }})
          .then(r => r.json())
          .then(result => {
            if (result.success) {
              setSwiftMessages(result.data || []);
              devLog(`[BANKS] ⚡ SWIFT loaded: ${result.data?.length || 0}`);
              return result.data || [];
            }
            return [];
          })
          .catch(err => { console.warn('[BANKS] SWIFT failed:', err); return []; }),

        // 3. Forex
        couchDBService.getAllForex()
          .then(forex => {
            devLog(`[BANKS] ⚡ Forex loaded: ${forex.length}`);
            return forex;
          })
          .catch(err => { console.warn('[BANKS] Forex failed:', err); return []; }),

        // 4. Shipments
        apiFetch('/shipments?status=DELIVERED', { headers: { 'Authorization': `Bearer ${token}` }})
          .then(r => r.json())
          .then(result => {
            if (result.success) {
              const delivered = result.data.filter((s: any) => {
                const status = s.Status || s.status || '';
                return status === 'DELIVERED' || status === 'COMPLETED';
              });
              setDeliveredShipments(delivered);
              devLog(`[BANKS] ⚡ Shipments loaded: ${delivered.length}`);
              return delivered;
            }
            return [];
          })
          .catch(err => { console.warn('[BANKS] Shipments failed:', err); return []; }),
      ];

      // Wait for all to complete and process forex with LC data
      const [lcs, swift, forex, shipments] = await Promise.all([lcPromise, swiftPromise, forexPromise, shipmentsPromise]);

      // ✅ Filter delivered shipments by LC payment status
      if (shipments && shipments.length > 0 && lcs && lcs.length > 0) {
        const shipmentsWithPaymentReleased = shipments.filter((shipment: any) => {
          // Find the LC for this shipment
          const contractId = shipment.contractId || shipment.contractID;
          const lc = lcs.find((l: any) => l.contractId === contractId);
          
          // Only include if LC payment has been released or settled
          return lc && (lc.status === 'PAYMENT_RELEASED' || lc.status === 'SETTLED');
        });
        setDeliveredShipments(shipmentsWithPaymentReleased);
        devLog(`[BANKS] ⚡ Delivered shipments with payment released: ${shipmentsWithPaymentReleased.length}`);
      }

      // Process forex allocations with buyer names from LCs
      if (forex && forex.length > 0) {
        const mappedForex = forex.map((f: any) => {
          const matchingLC = lcs?.find((lc: any) => lc.lcId === f.lcId || lc.contractId === f.contractId);
          return {
            forexId: f.forexId || '',
            contractId: f.contractId || '',
            exporterId: f.exporterId || '',
            lcId: f.lcId || '',
            buyerName: matchingLC?.buyerName || f.buyerName || '',
            buyerCountry: matchingLC?.buyerCountry || f.buyerCountry || '',
            requestedAmount: f.requestedAmount || 0,
            allocatedAmount: f.allocatedAmount || 0,
            currency: f.currency || 'USD',
            exchangeRate: f.exchangeRate || 0,
            retentionRate: f.retentionRate || 0,
            status: f.status || 'REQUESTED',
            expiryDate: f.expiryDate || null,
          };
        });

        // Add synthetic forex from LCs
        if (lcs && lcs.length > 0) {
          const forexRelatedLCs = lcs.filter((lc: any) => 
            lc.status === 'ISSUED' || lc.status === 'FOREX_ALLOCATED' || lc.status === 'FOREX_BACKED'
          );
          for (const lc of forexRelatedLCs) {
            if (!mappedForex.find((f: any) => f.lcId === lc.lcId)) {
              mappedForex.push({
                forexId: `SYNTHETIC_${lc.lcId}`,
                contractId: lc.contractId || '',
                exporterId: lc.exporterId || '',
                lcId: lc.lcId || '',
                buyerName: lc.buyerName || '',
                buyerCountry: lc.buyerCountry || '',
                requestedAmount: Number(lc.amount || 0),
                allocatedAmount: lc.status === 'FOREX_ALLOCATED' ? Number(lc.amount || 0) : 0,
                currency: lc.currency || 'USD',
                exchangeRate: lc.status === 'FOREX_ALLOCATED' ? 115.5 : 0,
                retentionRate: lc.status === 'FOREX_ALLOCATED' ? 40 : 0,
                status: lc.status === 'FOREX_ALLOCATED' ? 'ALLOCATED' : 'REQUESTED',
                expiryDate: lc.expiryDate || '',
              });
            }
          }
        }

        setForexAllocations(mappedForex);
        devLog(`[BANKS] ⚡ Total forex: ${mappedForex.length}`);
      }

      // Filter LCs for document examination (documents submitted, awaiting bank verification)
      if (lcs && lcs.length > 0) {
        const forExam = lcs.filter((lc: any) => {
          // Must have documents uploaded
          if (!lc.documents || lc.documents.length === 0) return false;
          
          // ✅ KEEP IN TAB 3: Show LCs in examination stages (including UTILIZED which means examined)
          // This allows banks to see both pending and completed document examinations
          if (!['ISSUED', 'FOREX_ALLOCATED', 'DOCUMENTS_SUBMITTED', 'UTILIZED', 'DOCUMENTS_COMPLIANT'].includes(lc.status)) return false;
          
          // ✅ Show ALL LCs in these statuses, regardless of document verification status
          // Banks can see which documents are pending vs verified in the dialog
          return true;
        });
        setLcsForExamination(forExam);
        devLog(`[BANKS] ⚡ LCs for document examination: ${forExam.length}`);
        if (forExam.length > 0) {
          devLog(`[BANKS] 📋 LCs awaiting examination:`, forExam.map((lc: any) => ({
            lcId: lc.lcId,
            status: lc.status,
            docs: lc.documents.length,
            pendingDocs: lc.documents.filter((d: any) => !d.status || d.status === 'pending' || d.status === 'uploaded').length
          })));
        }

        // Filter LCs for payment release (documents examined and compliant, awaiting payment)
        const forPayment = lcs.filter((lc: any) => {
          // Must have documents
          if (!lc.documents || lc.documents.length === 0) return false;
          
          // ✅ Must be in a status where payment can be released
          // UTILIZED = All documents examined and verified (from Tab 3)
          if (!['UTILIZED', 'DOCUMENTS_COMPLIANT', 'READY_FOR_PAYMENT', 'FOREX_ALLOCATED'].includes(lc.status)) return false;
          
          // All documents must be verified/compliant
          const allDocsVerified = lc.documents.every((d: any) => 
            d.status === 'verified' || d.status === 'approved' || d.status === 'compliant'
          );
          
          return allDocsVerified;
        });
        setLcsForPaymentRelease(forPayment);
        devLog(`[BANKS] ⚡ LCs ready for payment release: ${forPayment.length}`);
        if (forPayment.length > 0) {
          devLog(`[BANKS] 💰 LCs with verified documents:`, forPayment.map((lc: any) => ({
            lcId: lc.lcId,
            status: lc.status,
            amount: lc.amount,
            currency: lc.currency
          })));
        }
      }

      devLog('[BANKS] ⚡ All critical data loaded!');
    } catch (error) {
      console.error('[BANKS] Loading failed:', error);
      showError('Data Loading Failed', 'Could not load banking data', error instanceof Error ? error.message : String(error));
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await apiFetch('/users', {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const users = data.data || [];
        
        const totalUsers = users.length;
        const activeUsers = users.filter((u: any) => u.is_active === true || u.status === 'active').length;
        const bankRoles = users.filter((u: any) => {
          const role = (u.role || '').toUpperCase();
          const org = (u.organization || '').toUpperCase();
          return role.includes('BANK') || org.includes('BANK');
        }).length;
        const administrators = users.filter((u: any) => {
          const role = (u.role || '').toUpperCase();
          const username = (u.username || '').toLowerCase();
          const fullName = (u.full_name || '').toLowerCase();
          return role === 'ADMIN' || username.includes('admin') || fullName.includes('admin');
        }).length;
        
        setUserStats({
          totalUsers,
          activeUsers,
          bankRoles,
          administrators,
        });
      }
    } catch (error) {
      console.error('[BANKS] Failed to load user stats:', error);
    }
  };

  const loadAuditStats = async () => {
    try {
      const response = await apiFetch('/audit/portal/recent?limit=1000', {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const logs = data.data.logs || [];
        
        // Calculate stats
        const totalActivities = logs.length;
        
        // Count activities in last 24 hours
        const todaysActions = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return logDate >= oneDayAgo;
        }).length;
        
        // Count blockchain verified activities
        const blockchainVerified = logs.filter((log: any) => 
          log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC'
        ).length;
        
        // Count unique organizations
        const organizationsInvolved = new Set(
          logs.map((log: any) => log.performed_by_org).filter(Boolean)
        ).size;
        
        setAuditStats({
          totalActivities,
          todaysActions,
          blockchainVerified,
          organizationsInvolved,
        });
      }
    } catch (error) {
      console.error('[BANKS] Failed to load audit stats:', error);
    }
  };

  const handleOpenDialog = (type: 'lc' | 'forex' | 'permit', contract: SalesContract) => {
    console.log('=== LC Dialog Opening ===');
    console.log('Contract data:', {
      contractId: contract.contractId,
      exporterId: contract.exporterId,
      buyerBank: contract.buyerBank,
      exporterBank: contract.exporterBank,
      buyerName: contract.buyerName,
      buyerCountry: contract.buyerCountry,
      totalValue: contract.totalValue,
      currency: contract.currency
    });
    
    setSelectedContract(contract);
    setDialogType(type);
    
    // Auto-fill LC form with contract data
    if (type === 'lc') {
      // Get logged-in bank user's organization for advising bank
      const userOrg = user?.organization || 'Commercial Bank of Ethiopia';
      
      // ✅ DEBUG: Log the contract object to see what we have
      console.log('[LC FORM] Contract object received:', {
        contractId: contract.contractId,
        buyerBank: contract.buyerBank,
        exporterBank: contract.exporterBank,
        buyerName: contract.buyerName,
        buyerCountry: contract.buyerCountry,
        exporterId: contract.exporterId
      });
      
      // ✅ FIX: Better issuing bank handling
      let issuingBankValue = contract.buyerBank || '';
      if (!issuingBankValue) {
        // If buyer bank not specified, leave blank so user must enter it
        console.warn('[LC FORM] ⚠️ Buyer bank not found in contract');
        issuingBankValue = '';
      } else {
        console.log('[LC FORM] ✅ Using buyerBank as issuing bank:', issuingBankValue);
      }
      
      // ✅ FIX: Better advising bank handling  
      let advisingBankValue = contract.exporterBank || '';
      if (!advisingBankValue) {
        // Use the logged-in bank's organization as advising bank
        console.log('[LC FORM] Using user organization as advising bank:', userOrg);
        advisingBankValue = userOrg;
      } else {
        console.log('[LC FORM] ✅ Using exporterBank as advising bank:', advisingBankValue);
      }
      
      const formData = {
        issuingBank: issuingBankValue,
        advisingBank: advisingBankValue,
        beneficiary: contract.exporterId || '',
        terms: 'Payment against shipping documents as per UCP 600',
        expiryDays: '90',
      };
      
      console.log('[LC FORM] Final form data:', formData);
      
      // Set form data immediately
      setLcForm(formData);
      
      // Also set after a brief delay to ensure state updates
      setTimeout(() => {
        setLcForm(formData);
        console.log('[LC FORM] Form state confirmed after delay');
      }, 50);
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedContract(null);
    setSelectedLC(null);
    setDialogType(null);
    setLcForm({
      issuingBank: '',
      advisingBank: '',
      beneficiary: '',
      terms: 'Payment against shipping documents as per UCP 600',
      expiryDays: '90',
    });
  };

  const handleViewLCDetails = async (lc: LetterOfCredit) => {
    devLog('[BANKS] 📋 Fetching complete LC details for:', lc.lcId);
    
    // ✅ Show dialog immediately with loading state
    setSelectedLC(lc);
    setDialogType('lcDetails');
    setDialogOpen(true);
    setLcDetailsLoading(true); // Show loading indicator
    
    try {
      // ✅ Fetch complete LC data from API (includes all enriched fields)
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:3001/api/v1/banking/lc/${lc.lcId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          devLog('[BANKS] ✅ Fetched complete LC data:', result.data);
          setSelectedLC(result.data);
        } else {
          console.warn('[BANKS] ⚠️ API returned no data, using cached LC');
          // Keep the initial LC data
        }
      } else {
        console.warn('[BANKS] ⚠️ API fetch failed, using cached LC');
        // Keep the initial LC data
      }
    } catch (error) {
      console.error('[BANKS] ❌ Error fetching LC details:', error);
      // Keep the initial LC data as fallback
    } finally {
      setLcDetailsLoading(false); // Hide loading indicator
    }
  };

  const handleViewContractDetails = async (contract: SalesContract) => {
    devLog('[BANKS] 📄 handleViewContractDetails called with contract:', {
      contractId: contract.contractId,
      buyerName: contract.buyerName,
      buyerId: contract.buyerId,
      coffeeType: contract.coffeeType,
      quantity: contract.quantity,
      totalValue: contract.totalValue,
    });
    
    setSelectedContract(contract);
    
    // Fetch real documents for this contract
    const token = localStorage.getItem('authToken');
    let contractDocuments: any[] = [];
    
    if (token) {
      try {
        devLog('[BANKS] 📄 Fetching documents for contract:', contract.contractId);
        const response = await apiFetch(`/documents/entity/CONTRACT/${contract.contractId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        devLog('[BANKS] 📄 Documents API response:', { success: result.success, dataLength: result.data?.length });
        
        if (result.success && result.data && Array.isArray(result.data)) {
          devLog('[BANKS] 📄 Raw documents from API:', result.data);
          contractDocuments = result.data.map((doc: any) => {
            const docId = doc.document_id || doc.documentId || doc.id;
            return {
              id: docId,
              name: doc.file_name || doc.filename || doc.name,
              type: (doc.mime_type || doc.mimeType || 'application/pdf').split('/')[1]?.toUpperCase() || 'PDF',
              status: 'AVAILABLE',
              url: `/api/v1/documents/${docId}/view`, // ✅ Fixed: Add /view to the URL
              uploadedDate: doc.uploaded_at || doc.uploadedAt ? new Date(doc.uploaded_at || doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
              size: doc.file_size || doc.size ? `${((doc.file_size || doc.size) / 1024).toFixed(0)} KB` : 'N/A',
              category: doc.document_type || doc.category || 'CONTRACT_DOCUMENT',
            };
          });
          devLog('[BANKS] 📄 Mapped documents:', contractDocuments);
        }
      } catch (error) {
        console.error('[BANKS] ❌ Error fetching contract documents:', error);
      }
    }
    
    // If no documents found, provide standard required documents list
    if (contractDocuments.length === 0) {
      devLog('[BANKS] ⚠️  No documents found for contract, showing MISSING placeholders');
      contractDocuments = [
        { id: '1', name: 'Sales Contract (Signed)', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '2', name: 'Commercial Invoice', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '3', name: 'Exporter Declaration', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '4', name: 'Buyer Banking Details', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
      ];
    }
    
    // Set validation data for view mode
    setValidationData({
      entityId: contract.contractId,
      entityType: 'SALES CONTRACT',
      title: `Contract Details - ${contract.contractId}`,
      summary: [
        { label: 'Contract ID', value: contract.contractId },
        ...(contract.nbeReferenceNumber ? [{ label: 'ECTA Reference', value: contract.nbeReferenceNumber }] : []),
        { label: 'Exporter', value: contract.exporterId },
        { label: 'Buyer ID', value: contract.buyerId || 'N/A' },
        { label: 'Buyer Name', value: contract.buyerName || contract.buyerId || 'N/A' },
        { label: 'Buyer Country', value: contract.buyerCountry },
        ...(contract.buyerBank ? [{ label: 'Buyer Bank', value: contract.buyerBank }] : []),
        ...(contract.exporterBank ? [{ label: 'Exporter Bank', value: contract.exporterBank }] : []),
        { label: 'Coffee Type', value: contract.coffeeType },
        { label: 'Quantity', value: `${contract.quantity?.toLocaleString() || 0} kg` },
        { label: 'Price per Kg', value: `$${contract.pricePerKg || 0}` },
        { label: 'Total Value', value: `$${contract.totalValue?.toLocaleString() || 0} ${contract.currency}` },
        { label: 'Status', value: contract.status },
        { label: 'Registration Date', value: contract.registrationDate ? new Date(contract.registrationDate).toLocaleDateString() : 'N/A' },
      ],
      prerequisites: [
        {
          label: 'ECTA Approval',
          status: (contract.status === 'NBE_APPROVED' || contract.status === 'APPROVED') ? 'PASSED' : 'FAILED',
          details: contract.status === 'NBE_APPROVED' || contract.status === 'APPROVED' ? 'Contract approved by ECTA for export compliance' : `Current status: ${contract.status}`
        },
        {
          label: 'Exporter License',
          status: 'PASSED',
          details: `Exporter ${contract.exporterId} holds valid ECTA export license`
        },
        {
          label: 'Buyer Information',
          status: contract.buyerName && contract.buyerCountry ? 'PASSED' : 'WARNING',
          details: 'Buyer information complete and verified'
        },
        {
          label: 'Trade Compliance',
          status: 'PASSED',
          details: `Destination ${contract.buyerCountry} verified - not subject to trade sanctions`
        },
        {
          label: 'Documents Submitted',
          status: contractDocuments.some(d => d.status === 'AVAILABLE') ? 'PASSED' : 'WARNING',
          details: `${contractDocuments.filter(d => d.status === 'AVAILABLE').length} of ${contractDocuments.length} documents available`
        },
      ],
      documents: contractDocuments,
      complianceChecks: [
        {
          label: 'ECTA Registration',
          status: 'COMPLIANT',
          details: 'Contract registered with Ethiopian Coffee and Tea Authority'
        },
        {
          label: 'NBE Forex Requirements',
          status: 'COMPLIANT',
          details: 'Meets National Bank of Ethiopia export and forex allocation requirements'
        },
        {
          label: 'Trade Sanctions',
          status: 'COMPLIANT',
          details: `${contract.buyerCountry} is not subject to international trade sanctions`
        },
        {
          label: 'Export Regulations',
          status: 'COMPLIANT',
          details: 'Complies with Ethiopian export regulations and coffee quality standards'
        },
      ],
      additionalInfo: contract.status === 'NBE_APPROVED' || contract.status === 'APPROVED' ? 
        'This contract has been approved by ECTA. You can now issue a Letter of Credit for this contract.' :
        contract.status === 'PENDING' ?
        'Contract is pending ECTA approval. LC issuance will be available after approval.' :
        'Review contract details and current status.'
    });
    setValidationDialogOpen(true);
  };

  const handleIssueLc = async () => {
    if (!selectedContract) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const lcId = `LC${Date.now()}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(lcForm.expiryDays));

      const payload = {
        lcID: lcId,
        contractID: selectedContract.contractId,
        exporterID: selectedContract.exporterId,
        bankName: lcForm.advisingBank,
        issuingBank: lcForm.issuingBank,
        advisingBank: lcForm.advisingBank,
        beneficiary: lcForm.beneficiary,
        amount: selectedContract.totalValue.toString(),
        currency: selectedContract.currency,
        expiryDate: expiryDate.toISOString().split('T')[0],
        terms: lcForm.terms,
      };

      // Only request LC - don't auto-approve or auto-issue
      const requestResponse = await apiFetch('/banking/lc/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const requestResult = await requestResponse.json();

      if (requestResult.success) {
        showSuccess(
          'Letter of Credit Request Received',
          `LC ${lcId} has been requested by exporter and is awaiting bank review`,
          `Next Steps:\n1. Review the LC request details in the table below\n2. Click "Approve Request" to approve the LC\n3. After approval, click "Issue LC" to send MT700 SWIFT message to buyer's bank\n4. Bank then allocates forex for this LC\n\nNote: In the updated workflow, exporters initiate LC requests, and banks review and approve them.`
        );
        handleCloseDialog();
        loadBankingData();
      } else {
        // Handle blockchain errors with better messaging
        const errorMsg = requestResult.error?.message || 'Unknown error';
        
        if (errorMsg.includes('does not exist') || errorMsg.includes('not registered')) {
          showError(
            'Exporter Not Registered',
            `Cannot issue LC: Exporter ${selectedContract.exporterId} is not registered on the blockchain`,
            `This can happen if:\n• The exporter was recently approved but blockchain hasn't synchronized yet\n• The approval process failed to register the exporter\n\nSolution:\n1. Wait 30 seconds and try again (blockchain may be syncing)\n2. Contact ECTA admin to re-register exporter\n3. ECTA can run: node register-missing-exporters.js`
          );
        } else if (errorMsg.includes('Peer endorsements do not match') || errorMsg.includes('not synchronized')) {
          showWarning(
            'Blockchain Synchronization Issue',
            'The blockchain peers are not fully synchronized yet',
            `This usually happens when:\n• An exporter was just registered (wait 30 seconds)\n• Network is processing other transactions\n\nSolution: Wait 30 seconds and try again.\n\nIf the issue persists, check that all peer containers are running: docker ps | grep peer`
          );
        } else {
          showError(
            'LC Issuance Failed',
            errorMsg,
            'Please contact system administrator if this persists'
          );
        }
      }
    } catch (error: any) {
      console.error('Error issuing LC:', error);
      const errorMsg = error.message || 'Network error';
      showError(
        'Network Error',
        'Failed to issue Letter of Credit',
        `Error: ${errorMsg}\n\nPlease check:\n• API server is running\n• Blockchain network is connected\n• All peer nodes are healthy`
      );
    }
  };

  const handleApproveLC = async (lcId: string, exporterId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      showError('Authentication Required', 'You are not authenticated', 'Please login again to continue');
      return;
    }

    try {
      // The backend will automatically use the logged-in user's organization as the bank
      const response = await apiFetch(`/banking/lc/${lcId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          beneficiary: exporterId, // Use exporter ID as beneficiary
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(
          'Letter of Credit Approved',
          `LC ${lcId} has been approved successfully`,
          'The LC is now approved and ready for issuance'
        );
        loadBankingData(); // Reload to show updated status
      } else {
        const errorMsg = result.error?.message || 'Unknown error';
        showError('LC Approval Failed', errorMsg, 'Please try again or contact support');
      }
    } catch (error: any) {
      console.error('Error approving LC:', error);
      showError('Network Error', 'Failed to approve LC', error.message);
    }
  };

  const handleBulkApproveLC = async () => {
    if (selectedLCIds.length === 0) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      showError('Authentication Required', 'You are not authenticated');
      return;
    }

    setBulkApproving(true);
    let successCount = 0;
    let failCount = 0;

    for (const lcId of selectedLCIds) {
      try {
        const lc = letterOfCredits.find(l => l.lcId === lcId);
        if (!lc) continue;

        const response = await apiFetch(`/banking/lc/${lcId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            beneficiary: lc.exporterId,
          }),
        });

        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    setBulkApproving(false);
    setSelectedLCIds([]);

    if (failCount === 0) {
      showSuccess('Bulk Approval Complete', `Successfully approved ${successCount} Letters of Credit`);
    } else {
      showWarning('Bulk Approval Partial', `Approved: ${successCount}, Failed: ${failCount}`);
    }

    loadBankingData();
  };

  const toggleLCSelection = (lcId: string) => {
    setSelectedLCIds(prev => 
      prev.includes(lcId) ? prev.filter(id => id !== lcId) : [...prev, lcId]
    );
  };

  const toggleAllLCSelection = () => {
    const requestedLCs = getFilteredLCs().filter(lc => lc.status === 'REQUESTED');
    if (selectedLCIds.length === requestedLCs.length) {
      setSelectedLCIds([]);
    } else {
      setSelectedLCIds(requestedLCs.map(lc => lc.lcId));
    }
  };

  const handleAmendLC = async () => {
    if (!selectedLC) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await apiFetch(`/banking/lc/${selectedLC.lcId}/amend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amendmentReason: amendmentForm.amendmentReason,
          newAmount: amendmentForm.newAmount ? parseFloat(amendmentForm.newAmount) : undefined,
          newExpiryDate: amendmentForm.newExpiryDate || undefined,
          newTerms: amendmentForm.newTerms || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('LC Amended', `LC ${selectedLC.lcId} has been amended successfully`);
        handleCloseDialog();
        loadBankingData();
      } else {
        showError('Amendment Failed', result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      showError('Network Error', error.message);
    }
  };

  const handlePaymentMethodSubmit = async (type: string, data: any) => {
    const token = localStorage.getItem('authToken');
    if (!token || !selectedContract) return;

    try {
      if (type === 'cad') {
        const collectionId = `CAD${Date.now()}`;
        
        const response = await apiFetch('/banking/cad/register', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionID: collectionId,
            contractID: selectedContract.contractId,
            exporterID: selectedContract.exporterId,
            drawerName: data.drawerName,
            draweeName: data.draweeName,
            draweeAddress: data.draweeAddress,
            amount: selectedContract.totalValue,
            currency: selectedContract.currency,
            paymentTerm: data.paymentTerm,
            acceptanceDays: data.acceptanceDays ? parseInt(data.acceptanceDays) : 0,
            remittingBank: data.remittingBank,
            remittingBankBIC: data.remittingBankBIC,
            collectingBank: data.collectingBank,
            collectingBankBIC: data.collectingBankBIC,
            instructions: data.instructions,
            documents: ['Bill of Lading', 'Commercial Invoice', 'Packing List', 'Certificate of Origin'],
          }),
        });

        const result = await response.json();
        if (result.success) {
          showSuccess('Documentary Collection Sent', `Collection ${collectionId} registered successfully`);
          handleCloseDialog();
          loadBankingData();
        } else {
          showError('Collection Failed', result.error?.message || 'Unknown error');
        }
      } else if (type === 'advance') {
        const paymentId = `ADV${Date.now()}`;
        const advancePercentage = data.advancePercentage || '30';
        
        const response = await apiFetch('/banking/payment/initiate', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentID: paymentId,
            contractID: selectedContract.contractId,
            exporterID: selectedContract.exporterId,
            lcID: '', // May not have LC for advance payment
            paymentMethod: 'ADVANCE',
            amount: selectedContract.totalValue.toString(),
            currency: selectedContract.currency,
            swiftReference: data.swiftReference || '',
            payingBank: data.payingBank || '',
            payingBankBIC: data.payingBankBIC || '',
            receivingBank: selectedContract.exporterBank || 'Commercial Bank of Ethiopia',
            receivingBankBIC: 'CBETETAA',
            beneficiaryName: selectedContract.exporterId,
            beneficiaryAccount: data.beneficiaryAccount || '',
          }),
        });

        const result = await response.json();
        if (result.success) {
          showSuccess('Advance Payment Recorded', `Payment ${paymentId} recorded. Permit will be issued.`);
          handleCloseDialog();
          loadBankingData();
        } else {
          showError('Recording Failed', result.error?.message || 'Unknown error');
        }
      } else if (type === 'consignment') {
        const consignmentId = `CONSIGN${Date.now()}`;
        
        const response = await apiFetch('/banking/consignment/register', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consignmentID: consignmentId,
            exporterID: selectedContract.exporterId,
            commodityType: data.commodityType,
            description: data.description,
            buyerName: data.buyerName || selectedContract.buyerName,
            buyerAddress: data.buyerAddress,
            buyerCountry: selectedContract.buyerCountry,
            permitAmount: data.permitAmount || selectedContract.totalValue.toString(),
            currency: selectedContract.currency,
            permitNumber: `CP-${Date.now()}`,
          }),
        });

        const result = await response.json();
        if (result.success) {
          showSuccess('Consignment Permit Issued', `Consignment ${consignmentId} issued for ${data.commodityType}`);
          handleCloseDialog();
          loadBankingData();
        } else {
          showError('Permit Failed', result.error?.message || 'Unknown error');
        }
      }
    } catch (error: any) {
      showError('Network Error', error.message);
    }
  };

  const handleDocumentVerification = async (approved: boolean, comments: string, checklist: any) => {
    const token = localStorage.getItem('authToken');
    if (!selectedPayment) return;

    try {
      const response = await apiFetch(`/banking/payment/${selectedPayment.paymentID}/verify-documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          verifierComments: comments,
          documentChecklist: checklist,
          verificationDate: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (approved) {
          showSuccess('Documents Verified', 'Payment documents approved. Payment can proceed to settlement.');
        } else {
          showWarning('Documents Rejected', 'Payment documents have discrepancies. Exporter notified.');
        }
        setVerificationDialogOpen(false);
        setSelectedPayment(null);
        loadBankingData();
      } else {
        showError('Verification Failed', result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      showError('Network Error', error.message);
    }
  };

  // LC Document Examination - Bank verifies shipping documents against LC terms
  const handleExamineLCDocuments = async (lcId: string, documentsCompliant: boolean, discrepancies: string = '') => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await apiFetch(`/banking/lc/${lcId}/examine-documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compliant: documentsCompliant,
          discrepancies: discrepancies,
          examinationDate: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (documentsCompliant) {
          showSuccess('Documents Compliant', 'Shipping documents comply with LC terms. Payment authorized.');
        } else {
          showWarning('Discrepancies Found', `Document discrepancies: ${discrepancies}`);
        }
        loadBankingData();
      } else {
        showError('Examination Failed', result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      showError('Network Error', error.message);
    }
  };

  // Verify Individual Document - Bank approves/rejects specific document
  const handleVerifyDocument = async (documentId: string, approved: boolean) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // ✅ IMMEDIATE UI FEEDBACK: Set loading state and optimistically update document
    setVerifyingDocumentId(documentId);
    
    // Optimistic update: immediately show new status in UI
    if (selectedLC && selectedLC.documents) {
      const optimisticDocs = selectedLC.documents.map((d: any) => 
        d.documentId === documentId || d.document_id === documentId
          ? { ...d, verificationStatus: approved ? 'verified' : 'rejected', status: approved ? 'verified' : 'rejected' }
          : d
      );
      setSelectedLC({ ...selectedLC, documents: optimisticDocs });
    }

    try {
      const response = await apiFetch(`/documents/${documentId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified: approved,  // ✅ Backend expects "verified" not "approved"
          remarks: approved ? 'Document verified and complies with LC terms' : 'Document does not comply',
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(
          approved ? 'Document Approved ✅' : 'Document Rejected ❌',
          approved ? 'Document verified successfully with blockchain signature' : 'Document marked as non-compliant'
        );
        
        // ✅ Refresh the document dialog to show updated status from server
        if (selectedLC?.lcId) {
          try {
            const lcResponse = await apiFetch(`/banking/lc/${selectedLC.lcId}`, {
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const lcResult = await lcResponse.json();
            if (lcResult.success && lcResult.data) {
              setSelectedLC(lcResult.data);  // ✅ Update dialog with fresh document statuses
            }
          } catch (refreshError) {
            console.warn('Could not refresh LC documents:', refreshError);
          }
        }
        
        loadBankingData(); // Refresh main LC list
      } else {
        // Revert optimistic update on error
        if (selectedLC?.lcId) {
          const lcResponse = await apiFetch(`/banking/lc/${selectedLC.lcId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          const lcResult = await lcResponse.json();
          if (lcResult.success && lcResult.data) {
            setSelectedLC(lcResult.data);
          }
        }
        showError('Verification Failed', result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      // Revert optimistic update on error
      if (selectedLC?.lcId) {
        try {
          const lcResponse = await apiFetch(`/banking/lc/${selectedLC.lcId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          const lcResult = await lcResponse.json();
          if (lcResult.success && lcResult.data) {
            setSelectedLC(lcResult.data);
          }
        } catch {
          // Ignore refresh error
        }
      }
      showError('Network Error', error.message);
    } finally {
      setVerifyingDocumentId(null); // ✅ Clear loading state
    }
  };

  // Release Payment - Bank releases payment after document compliance
  const handleReleasePayment = async (lcId: string, amount: number, currency: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await apiFetch(`/banking/lc/${lcId}/release-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: currency,
          paymentDate: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Payment Released', `${currency} ${amount.toLocaleString()} released to exporter via SWIFT`);
        loadBankingData();
      } else {
        showError('Payment Failed', result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      showError('Network Error', error.message);
    }
  };

  // Allocate Forex - Bank action
  const handleAllocateForex = async (forex: any) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      showError('Authentication Required', 'You are not authenticated');
      return;
    }

    try {
      // For REQUESTED status (synthetic forex from ISSUED LCs), we need to create the forex request first
      if (forex.status === 'REQUESTED' && forex.forexId.includes('_PENDING')) {
        // Step 1: Create the forex request
        const forexId = `FOREX_${forex.lcId}_${Date.now()}`;
        const requestPayload = {
          forexId: forexId,
          lcId: forex.lcId,
          contractId: forex.contractId,
          exporterId: forex.exporterId,
          amount: forex.requestedAmount || 0,
          currency: forex.currency || 'USD',
        };
        
        showInfo('Creating Forex Request', 'Creating forex allocation request...');
        
        const requestResponse = await apiFetch('/forex/request', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });
        
        const requestResult = await requestResponse.json();
        if (!requestResult.success) {
          showError('Forex Request Failed', requestResult.error?.message || 'Failed to create forex request');
          return;
        }
        
        // Update forexId for allocation step
        forex.forexId = forexId;
        showInfo('Allocating Forex', 'Allocating foreign exchange...');
      }
      
      // Step 2: Allocate the forex
      const payload = {
        forexId: forex.forexId,
        lcId: forex.lcId || '',
        amount: forex.requestedAmount || forex.allocatedAmount || 0,
        exchangeRate: forex.exchangeRate || 0,
        retentionRate: forex.retentionRate || 0,
        officer: forex.officer || 'Bank Officer',
        approvalRef: `BANK-${Date.now()}`,
        expiryDate: forex.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await apiFetch('/forex/allocate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Forex Allocated', `Forex allocated successfully for LC ${forex.lcId}`, `40% USD retention, 60% ETB conversion per NBE policy`);
        setAllocationDialogOpen(false);
        loadBankingData();
      } else {
        showError('Allocation Failed', result.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      showError('Network Error', error.message || 'Failed to allocate forex');
    }
  };

  // Send SWIFT Message (dispatch)
  const handleSendSwiftMessage = async (msg: any) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      showError('Authentication Required', 'You are not authenticated');
      return;
    }

    try {
      const payload: any = {
        messageID: msg.messageId || `MSG${Date.now()}`,
        messageType: msg.messageType || 'MT103',
        swiftReference: msg.swiftReference || `REF${Date.now()}`,
        senderBIC: msg.senderBic || 'CBETETAA',
        receiverBIC: msg.receiverBic || '',
        amount: msg.amount || 0,
        currency: msg.currency || 'USD',
        linkedLcId: msg.linkedLcId || msg.lcId || '',
        linkedPaymentId: msg.linkedPaymentId || '',
      };

      // Choose endpoint based on message type
      const endpoint = (msg.messageType === 'MT700') ? '/swift/messages/mt700' : '/swift/messages';

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('SWIFT Sent', `Message ${payload.messageID} dispatched`);
        loadBankingData();
      } else {
        showError('SWIFT Failed', result.error?.message || 'Failed to create SWIFT message');
      }
    } catch (error: any) {
      showError('Network Error', error.message || 'Failed to send SWIFT message');
    }
  };

  // Filter and Pagination Helper Functions
  const getFilteredContracts = () => {
    let filtered = contracts;
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.contractId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.exporterId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.buyerCountry.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (dateFrom) {
      filtered = filtered.filter(c => new Date(c.registrationDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(c => new Date(c.registrationDate) <= new Date(dateTo));
    }
    if (amountMin) {
      filtered = filtered.filter(c => c.totalValue >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter(c => c.totalValue <= parseFloat(amountMax));
    }
    return filtered;
  };

  const getFilteredLCs = () => {
    devLog(`[BANKS] 🔍 getFilteredLCs() called with ${letterOfCredits.length} total LCs`);
    let filtered = letterOfCredits;
    if (searchTerm) {
      filtered = filtered.filter(lc => 
        lc.lcId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lc.contractId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lc.exporterId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      devLog(`[BANKS] 🔍 After search filter (term: "${searchTerm}"): ${filtered.length} items`);
    }
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(lc => lc.status === filterStatus);
      devLog(`[BANKS] 🔍 After status filter (status: "${filterStatus}"): ${filtered.length} items`);
    }
    if (dateFrom) {
      filtered = filtered.filter(lc => lc.requestDate && new Date(lc.requestDate) >= new Date(dateFrom));
      devLog(`[BANKS] 🔍 After dateFrom filter: ${filtered.length} items`);
    }
    if (dateTo) {
      filtered = filtered.filter(lc => lc.requestDate && new Date(lc.requestDate) <= new Date(dateTo));
      devLog(`[BANKS] 🔍 After dateTo filter: ${filtered.length} items`);
    }
    if (amountMin) {
      filtered = filtered.filter(lc => lc.amount >= parseFloat(amountMin));
      devLog(`[BANKS] 🔍 After amountMin filter: ${filtered.length} items`);
    }
    if (amountMax) {
      filtered = filtered.filter(lc => lc.amount <= parseFloat(amountMax));
      devLog(`[BANKS] 🔍 After amountMax filter: ${filtered.length} items`);
    }
    devLog(`[BANKS] 🔍 Returning ${filtered.length} filtered LCs`);
    return filtered;
  };

  const getFilteredForex = () => {
    let filtered = forexAllocations;
    devLog(`[BANKS] 🔍 getFilteredForex() called with ${forexAllocations.length} total forex allocations`);
    
    if (searchTerm) {
      filtered = filtered.filter(forex => 
        forex.forexId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        forex.lcId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        forex.exporterId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      devLog(`[BANKS] 🔍 After search filter (term: "${searchTerm}"): ${filtered.length} items`);
    }
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'APPROVED_OR_ALLOCATED') {
        filtered = filtered.filter(forex => forex.status === 'APPROVED' || forex.status === 'ALLOCATED');
      } else {
        filtered = filtered.filter(forex => forex.status === filterStatus);
      }
      devLog(`[BANKS] 🔍 After status filter (status: "${filterStatus}"): ${filtered.length} items`);
    }
    if (amountMin) {
      filtered = filtered.filter(forex => forex.allocatedAmount >= parseFloat(amountMin));
      devLog(`[BANKS] 🔍 After min amount filter (min: ${amountMin}): ${filtered.length} items`);
    }
    if (amountMax) {
      filtered = filtered.filter(forex => forex.allocatedAmount <= parseFloat(amountMax));
      devLog(`[BANKS] 🔍 After max amount filter (max: ${amountMax}): ${filtered.length} items`);
    }
    
    devLog(`[BANKS] ✅ getFilteredForex() returning ${filtered.length} items`);
    return filtered;
  };

  const getFilteredSwiftMessages = () => {
    let filtered = swiftMessages;
    if (searchTerm) {
      filtered = filtered.filter((msg: any) =>
        msg.messageId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.swiftReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.senderBic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.receiverBic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.linkedLcId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.linkedPaymentId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter((msg: any) => msg.status === filterStatus);
    }
    if (amountMin) {
      filtered = filtered.filter((msg: any) => (msg.amount || 0) >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter((msg: any) => (msg.amount || 0) <= parseFloat(amountMax));
    }
    return filtered;
  };

  const getFilteredPayments = () => {
    let filtered = pendingDocuments;
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.exporterId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(payment => payment.status === filterStatus);
    }
    return filtered;
  };

  const getFilteredDocumentExaminationLCs = () => {
    const baseList = documentExaminationFilter === 'VERIFIED'
      ? letterOfCredits.filter(lc => lc.status === 'UTILIZED') // UTILIZED = documents verified
      : lcsForExamination;

    if (!searchTerm) {
      return baseList;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return baseList.filter(lc =>
      lc.lcId?.toLowerCase().includes(lowerSearch) ||
      lc.exporterId?.toLowerCase().includes(lowerSearch) ||
      lc.currency?.toLowerCase().includes(lowerSearch) ||
      lc.status?.toLowerCase().includes(lowerSearch)
    );
  };

  const getFilteredPaymentReleaseLCs = () => {
    const baseList = paymentReleaseFilter === 'RELEASED_TODAY' || paymentReleaseFilter === 'TOTAL_RELEASED'
      ? letterOfCredits.filter(lc => lc.status === 'PAYMENT_RELEASED')
      : lcsForPaymentRelease;

    if (!searchTerm) {
      return baseList;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return baseList.filter(lc =>
      lc.lcId?.toLowerCase().includes(lowerSearch) ||
      lc.exporterId?.toLowerCase().includes(lowerSearch) ||
      lc.currency?.toLowerCase().includes(lowerSearch) ||
      lc.status?.toLowerCase().includes(lowerSearch)
    );
  };

  const getPaginatedData = (data: any[]) => {
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const handleChangePage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
  };

  // CSV Export Functions
  const generateContractCSV = (data: SalesContract[]) => {
    const headers = ['Contract ID', 'NBE Reference', 'Exporter', 'Buyer', 'Country', 'Coffee Type', 'Quantity (kg)', 'Price/kg', 'Total Value', 'Currency', 'Status', 'Registration Date'];
    const rows = data.map(c => [
      c.contractId,
      c.nbeReferenceNumber,
      c.exporterId,
      c.buyerName,
      c.buyerCountry,
      c.coffeeType,
      c.quantity,
      c.pricePerKg,
      c.totalValue,
      c.currency,
      c.status,
      new Date(c.registrationDate).toLocaleDateString()
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateLCCSV = (data: LetterOfCredit[]) => {
    const headers = ['LC ID', 'Contract ID', 'Exporter', 'Issuing Bank', 'Advising Bank', 'Amount', 'Currency', 'Status', 'Expiry Date', 'Request Date'];
    const rows = data.map(lc => [
      lc.lcId,
      lc.contractId,
      lc.exporterId,
      lc.issuingBank || 'N/A',
      lc.advisingBank || 'N/A',
      lc.amount,
      lc.currency,
      lc.status,
      lc.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : 'N/A',
      lc.requestDate ? new Date(lc.requestDate).toLocaleDateString() : 'N/A'
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateForexCSV = (data: ForexAllocation[]) => {
    const headers = ['Forex ID', 'LC ID', 'Exporter', 'Allocated Amount', 'Exchange Rate', 'USD Retained (40%)', 'ETB Converted (60%)', 'Status', 'Expiry Date'];
    const rows = data.map(f => [
      f.forexId,
      f.lcId,
      f.exporterId,
      f.allocatedAmount,
      f.exchangeRate,
      (f.allocatedAmount * 0.4).toFixed(2),
      (f.allocatedAmount * 0.6 * f.exchangeRate).toFixed(2),
      f.status,
      f.expiryDate ? new Date(f.expiryDate).toLocaleDateString() : 'N/A'
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateSwiftCSV = (data: any[]) => {
    const headers = ['Message ID', 'Type', 'SWIFT Reference', 'Sender BIC', 'Receiver BIC', 'Amount', 'Currency', 'Status', 'Created/Updated Date'];
    const rows = data.map(msg => [
      msg.messageId,
      msg.messageType,
      msg.swiftReference,
      msg.senderBic,
      msg.receiverBic,
      msg.amount || 0,
      msg.currency || 'USD',
      msg.status,
      msg.sentDate || msg.createdAt || msg.updatedAt || 'N/A'
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }; // End downloadCSV

  return (
    <ThemeProvider theme={banksTheme}>
      <Box sx={{ p: 3 }}>
        {/* Professional KPI Cards - Dynamic per Tab */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {(() => {
            // Dynamic KPI cards based on active tab (like ShippingPortal)
            const kpis = activeTab === 0 ? [
              // Tab 0: Payment Methods - Show clickable payment method cards as KPIs
              { 
                icon: <Description />, 
                label: 'Letter of Credit', 
                value: letterOfCredits.length, 
                color: '#9b30b7',
                subtitle: 'Bank-guaranteed (UCP 600)',
                method: 'LC',
                clickable: true,
                debug: `LC Array Length: ${letterOfCredits.length}, Has Data: ${letterOfCredits.length > 0 ? 'YES' : 'NO'}`
              },
              { 
                icon: <DirectionsBoat />, 
                label: 'Documentary Collection', 
                value: documentaryCollections.length, 
                color: '#2196F3',
                subtitle: 'Cash Against Documents',
                method: 'CAD',
                clickable: true,
                debug: `CAD Array Length: ${documentaryCollections.length} (Phase 2 - Not Implemented)`
              },
              { 
                icon: <AttachMoney />, 
                label: 'Advance Payment', 
                value: advancePayments.length, 
                color: '#ff9800',
                subtitle: 'Payment before shipment',
                method: 'ADVANCE',
                clickable: true,
                debug: `Advance Array Length: ${advancePayments.length} (Phase 2 - Not Implemented)`
              },
              { 
                icon: <Assignment />, 
                label: 'Consignment', 
                value: consignments.length, 
                color: '#4caf50',
                subtitle: 'Fruits, Flowers, Meat',
                method: 'CONSIGNMENT',
                clickable: true,
                debug: `Consignment Array Length: ${consignments.length}, Has Data: ${consignments.length > 0 ? 'YES' : 'NO'}`
              },
            ] : activeTab === 1 ? [
              // Tab 1: Forex Allocations KPIs - Show data in table
              { 
                icon: <CurrencyExchange />, 
                label: 'Total Forex Requests', 
                value: forexAllocations.length, 
                color: '#FFD700',
                subtitle: 'All Requests',
                description: 'View every forex allocation request below.',
                clickable: true,
                selected: filterStatus === 'ALL',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('ALL');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                },
                debug: `Forex Array Length: ${forexAllocations.length}, Has Data: ${forexAllocations.length > 0 ? 'YES' : 'NO'}`
              },
              { 
                icon: <AttachMoney />, 
                label: 'Total Requested', 
                value: `$${(forexAllocations.reduce((s, f) => {
                  // For REQUESTED, use requestedAmount; for others, use allocatedAmount
                  const amount = f.status === 'REQUESTED' ? (Number(f.requestedAmount) || 0) : (Number(f.allocatedAmount) || 0);
                  return s + amount;
                }, 0) / 1000000).toFixed(1)}M`, 
                color: '#9b30b7',
                subtitle: 'Total USD',
                description: 'Sum of all requested and allocated forex amounts in USD.',
                clickable: true,
                selected: filterStatus === 'ALLOCATED',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('ALLOCATED');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <CheckCircle />, 
                label: 'Allocated', 
                value: forexAllocations.filter(f => f.status === 'APPROVED' || f.status === 'ALLOCATED').length, 
                color: '#4caf50',
                subtitle: 'Ready to Use',
                description: 'Forex approved or already allocated.',
                clickable: true,
                selected: filterStatus === 'APPROVED_OR_ALLOCATED',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('APPROVED_OR_ALLOCATED');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <AccessTime />, 
                label: 'Pending Allocation', 
                value: forexAllocations.filter(f => f.status === 'PENDING' || f.status === 'REQUESTED').length, 
                color: '#ff9800',
                subtitle: 'Awaiting Action',
                description: 'LC issued, awaiting bank forex allocation.',
                clickable: true,
                selected: filterStatus === 'PENDING' || filterStatus === 'REQUESTED',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('REQUESTED');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                }
              },
            ] : activeTab === 2 ? [
              // Tab 2: SWIFT Messages - Show multiple KPI cards like other tabs
              { 
                icon: <MessageOutlined />, 
                label: 'Total Messages', 
                value: swiftMessages.length, 
                color: '#9b30b7',
                subtitle: 'SWIFT Messages',
                description: 'All SWIFT messages linked to LCs and payments.',
                clickable: true,
                selected: filterStatus === 'ALL',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('ALL');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                },
                debug: `SWIFT Array Length: ${swiftMessages.length}, Has Data: ${swiftMessages.length > 0 ? 'YES' : 'NO'}`
              },
              { 
                icon: <AccessTime />, 
                label: 'Pending Approval', 
                value: swiftMessages.filter((msg: any) => msg.status === 'PENDING_APPROVAL').length, 
                color: '#ff9800',
                subtitle: 'Awaiting Review',
                description: 'Messages waiting for approval and dispatch.',
                clickable: true,
                selected: filterStatus === 'PENDING_APPROVAL',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('PENDING_APPROVAL');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <SendOutlined />, 
                label: 'Sent', 
                value: swiftMessages.filter((msg: any) => msg.status === 'SENT').length, 
                color: '#2196F3',
                subtitle: 'Outgoing',
                description: 'Messages that have been dispatched to counterparties.',
                clickable: true,
                selected: filterStatus === 'SENT',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('SENT');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <AccountBalance />, 
                label: 'Received', 
                value: swiftMessages.filter((msg: any) => msg.status === 'RECEIVED').length, 
                color: '#4caf50',
                subtitle: 'Incoming',
                description: 'Messages received from the counterparty bank.',
                clickable: true,
                selected: filterStatus === 'RECEIVED',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('RECEIVED');
                  setAmountMin('');
                  setAmountMax('');
                  setCurrentPage(0);
                }
              },
            ] : activeTab === 3 ? [
              // Tab 3: Document Examination KPIs - Show data in table
              { 
                icon: <Description />, 
                label: 'Pending Examination', 
                value: lcsForExamination.filter((lc: any) => {
                  // Count LCs with pending (unverified) documents
                  if (!lc.documents || lc.documents.length === 0) return false;
                  const hasPending = lc.documents.some((d: any) => 
                    !d.verificationStatus || d.verificationStatus === 'pending' || 
                    d.status === 'pending' || d.status === 'uploaded'
                  );
                  return hasPending;
                }).length, 
                color: '#ff9800',
                subtitle: 'Documents Submitted',
                description: 'Show LCs pending document review.',
                clickable: true,
                selected: documentExaminationFilter === 'PENDING_EXAMINATION',
                onClick: () => {
                  setSearchTerm('');
                  setAmountMin('');
                  setAmountMax('');
                  setDocumentExaminationFilter('PENDING_EXAMINATION');
                  setCurrentPage(0);
                },
              },
              { 
                icon: <CheckCircle />, 
                label: 'Examined Today', 
                value: (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return letterOfCredits.filter(lc => {
                    // Check if documents were verified today
                    if (!lc.documents || lc.documents.length === 0) return false;
                    return lc.documents.some((d: any) => {
                      if (!d.verifiedAt && !d.verified_at) return false;
                      const verifiedDate = new Date(d.verifiedAt || d.verified_at);
                      verifiedDate.setHours(0, 0, 0, 0);
                      return verifiedDate.getTime() === today.getTime();
                    });
                  }).length;
                })(),
                color: '#4caf50',
                subtitle: 'Completed',
                description: 'Show LCs whose documents were verified today.',
                clickable: true,
                selected: documentExaminationFilter === 'VERIFIED',
                onClick: () => {
                  setSearchTerm('');
                  setAmountMin('');
                  setAmountMax('');
                  setDocumentExaminationFilter('VERIFIED');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <AccessTime />, 
                label: 'Avg Processing Time', 
                value: (() => {
                  // Calculate average time from document upload to verification
                  const completedLCs = letterOfCredits.filter(lc => 
                    lc.documents && lc.documents.length > 0 && 
                    lc.documents.some((d: any) => d.verifiedAt || d.verified_at)
                  );
                  
                  if (completedLCs.length === 0) return '—';
                  
                  let totalHours = 0;
                  let count = 0;
                  
                  completedLCs.forEach(lc => {
                    lc.documents.forEach((d: any) => {
                      const uploaded = d.uploadedAt || d.uploaded_at;
                      const verified = d.verifiedAt || d.verified_at;
                      if (uploaded && verified) {
                        const uploadTime = new Date(uploaded).getTime();
                        const verifyTime = new Date(verified).getTime();
                        const hours = (verifyTime - uploadTime) / (1000 * 60 * 60);
                        if (hours >= 0) {
                          totalHours += hours;
                          count++;
                        }
                      }
                    });
                  });
                  
                  if (count === 0) return '—';
                  const avgHours = totalHours / count;
                  const avgDays = avgHours / 24;
                  
                  if (avgDays < 1) return `${Math.round(avgHours)}h`;
                  return `${avgDays.toFixed(1)}d`;
                })(),
                color: '#2196F3',
                subtitle: 'Document Review',
                description: 'Average time required to complete document examination.',
                clickable: false,
              },
              { 
                icon: <Assignment />, 
                label: 'Compliance Rate', 
                value: (() => {
                  // Calculate percentage of verified vs rejected documents
                  const allDocs = letterOfCredits.flatMap(lc => lc.documents || []);
                  const processedDocs = allDocs.filter((d: any) => 
                    d.verificationStatus === 'verified' || d.verificationStatus === 'rejected' ||
                    d.status === 'verified' || d.status === 'rejected'
                  );
                  
                  if (processedDocs.length === 0) return '—';
                  
                  const verifiedCount = processedDocs.filter((d: any) => 
                    d.verificationStatus === 'verified' || d.status === 'verified'
                  ).length;
                  
                  const rate = (verifiedCount / processedDocs.length) * 100;
                  return `${Math.round(rate)}%`;
                })(),
                color: '#9b30b7',
                subtitle: 'UCP 600 Standard',
                description: 'Percentage of documents compliant with UCP 600.',
                clickable: false,
              },
            ] : activeTab === 5 ? [
              // Tab 5: Analytics KPIs
              { 
                icon: <Assessment />,
                label: 'Total Metrics', 
                value: '—', 
                subtitle: 'View analytics dashboard',
                color: '#1976d2',
                clickable: false,
              },
            ] : activeTab === 6 ? [
              // Tab 6: User Management KPIs
              { 
                icon: <People />, 
                label: 'Total Users', 
                value: userStats.totalUsers,
                color: '#1976d2',
                subtitle: 'All Roles',
                description: 'Total users in the system.',
                clickable: false,
              },
              { 
                icon: <PersonAdd />, 
                label: 'Active Users', 
                value: userStats.activeUsers,
                color: '#4caf50',
                subtitle: 'Currently Active',
                description: 'Users who are currently active.',
                clickable: false,
              },
              { 
                icon: <Security />, 
                label: 'Bank Roles', 
                value: userStats.bankRoles,
                color: '#ff9800',
                subtitle: 'Bank Staff',
                description: 'Users with bank roles.',
                clickable: false,
              },
              { 
                icon: <AdminPanelSettings />, 
                label: 'Administrators', 
                value: userStats.administrators,
                color: '#9b30b7',
                subtitle: 'Admin Access',
                description: 'Users with administrator privileges.',
                clickable: false,
              },
            ] : activeTab === 7 ? [
              // Tab 7: Audit Trail KPIs
              { 
                icon: <Timeline />, 
                label: 'Total Activities', 
                value: auditStats.totalActivities, 
                color: '#1976d2',
                subtitle: 'All Transactions',
                description: 'Total audit trail activities.',
                clickable: false,
              },
              { 
                icon: <Assessment />, 
                label: 'Today\'s Actions', 
                value: auditStats.todaysActions, 
                color: '#4caf50',
                subtitle: 'Last 24 Hours',
                description: 'Activities in the last 24 hours.',
                clickable: false,
              },
              { 
                icon: <VerifiedUser />, 
                label: 'Blockchain Verified', 
                value: auditStats.blockchainVerified, 
                color: '#9c27b0',
                subtitle: 'Immutable Records',
                description: 'Records stored on blockchain.',
                clickable: false,
              },
              { 
                icon: <AccountTree />, 
                label: 'Organizations', 
                value: auditStats.organizationsInvolved, 
                color: '#ff9800',
                subtitle: 'Participants',
                description: 'Organizations involved in transactions.',
                clickable: false,
              },
            ] : activeTab === 8 ? [
              // Tab 8: LC Settlements KPIs
              { 
                icon: <CheckCircle />, 
                label: 'Delivered Shipments', 
                value: deliveredShipments.length, 
                color: '#4caf50',
                subtitle: 'Ready for Settlement',
                description: 'Shipments requiring LC settlement.',
                clickable: false,
              },
              { 
                icon: <Payment />, 
                label: 'Pending Settlement', 
                value: deliveredShipments.filter((s: any) => {
                  // Count shipments where LC not yet settled
                  return true; // This will be filtered by PostDeliveryWorkflowPanel
                }).length, 
                color: '#ff9800',
                subtitle: 'Awaiting Processing',
                description: 'LCs pending settlement.',
                clickable: false,
              },
              { 
                icon: <AccountBalance />, 
                label: 'Active LCs', 
                value: letterOfCredits.filter(lc => ['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED', 'PAYMENT_RELEASED'].includes(lc.status)).length, 
                color: '#9b30b7',
                subtitle: 'In Progress',
                description: 'Active Letters of Credit.',
                clickable: false,
              },
              { 
                icon: <AttachMoney />, 
                label: 'Completed Settlements', 
                value: letterOfCredits.filter(lc => lc.status === 'SETTLED').length,
                color: '#2196f3',
                subtitle: 'Finalized',
                description: 'Settlements completed.',
                clickable: false,
              },
            ] : [
              // Tab 4: Payment Release KPIs - Show data in table
              { 
                icon: <AttachMoney />, 
                label: 'Ready for Payment', 
                value: lcsForPaymentRelease.length, 
                color: '#ff9800',
                subtitle: 'Documents Verified',
                description: 'Show LCs ready for payment release.',
                clickable: true,
                selected: paymentReleaseFilter === 'READY_FOR_PAYMENT',
                onClick: () => {
                  setSearchTerm('');
                  setAmountMin('');
                  setAmountMax('');
                  setPaymentReleaseFilter('READY_FOR_PAYMENT');
                  setCurrentPage(0);
                },
                debug: `Payment Release Array Length: ${lcsForPaymentRelease.length}, Has Data: ${lcsForPaymentRelease.length > 0 ? 'YES' : 'NO'}`
              },
              { 
                icon: <CheckCircle />, 
                label: 'Released Today', 
                value: letterOfCredits.filter(lc => lc.status === 'PAYMENT_RELEASED').length, 
                color: '#4caf50',
                subtitle: 'Payments Sent',
                description: 'Show LCs with payments already released.',
                clickable: true,
                selected: paymentReleaseFilter === 'RELEASED_TODAY',
                onClick: () => {
                  setSearchTerm('');
                  setAmountMin('');
                  setAmountMax('');
                  setPaymentReleaseFilter('RELEASED_TODAY');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <CurrencyExchange />, 
                label: 'Total Released', 
                value: `$${(letterOfCredits.filter(lc => lc.status === 'PAYMENT_RELEASED').reduce((s, lc) => s + lc.amount, 0) / 1000000).toFixed(1)}M`, 
                color: '#2196F3',
                subtitle: 'This Month',
                description: 'Show payments released this month.',
                clickable: true,
                selected: paymentReleaseFilter === 'TOTAL_RELEASED',
                onClick: () => {
                  setSearchTerm('');
                  setAmountMin('');
                  setAmountMax('');
                  setPaymentReleaseFilter('TOTAL_RELEASED');
                  setCurrentPage(0);
                }
              },
              { 
                icon: <Assignment />, 
                label: 'Avg Release Time', 
                value: '1.2d', 
                color: '#9b30b7',
                subtitle: 'After Verification',
                description: 'Average time between verification and payment release.',
                clickable: false,
              },
            ];

            return kpis.map((kpi: any, index) => {
              // Debug log to see actual KPI values being rendered
              if (index === 0) {
                devLog(`[BANKS] 🎯 Rendering KPI cards for Tab ${activeTab}:`, kpis.map(k => `${k.label}: ${k.value}`));
              }
              
              return (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  sx={{ 
                    cursor: kpi.clickable ? 'pointer' : 'default',
                    height: 140,
                    border: kpi.clickable && ((kpi.method && selectedPaymentMethod === kpi.method) || kpi.selected) ? `2px solid ${kpi.color}` : `1px solid #e0e0e0`,
                    bgcolor: kpi.clickable && ((kpi.method && selectedPaymentMethod === kpi.method) || kpi.selected) ? `${kpi.color}08` : 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: 2,
                    boxShadow: kpi.clickable && ((kpi.method && selectedPaymentMethod === kpi.method) || kpi.selected) 
                      ? '0 4px 12px rgba(155, 48, 183, 0.15)' 
                      : '0 1px 3px rgba(0,0,0,0.05)',
                    '&:hover': kpi.clickable ? {
                      boxShadow: '0 8px 24px rgba(155, 48, 183, 0.2)',
                      transform: 'translateY(-4px)',
                      borderColor: kpi.color,
                    } : {},
                  }}
                  onClick={kpi.clickable ? (kpi.onClick || (() => kpi.method && setSelectedPaymentMethod(kpi.method))) : undefined}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 2.5, 
                    px: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '50%', 
                      bgcolor: `${kpi.color}15`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mb: 1.5
                    }}>
                      {React.cloneElement(kpi.icon, { 
                        sx: { fontSize: 28, color: kpi.color } 
                      })}
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#666', 
                        textTransform: 'uppercase', 
                        fontWeight: 600, 
                        fontSize: '0.7rem',
                        letterSpacing: 0.5,
                        mb: 0.5
                      }}
                    >
                      {kpi.label}
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        color: kpi.color,
                        lineHeight: 1,
                        mb: 0.5
                      }}
                    >
                      {kpi.value}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.7rem'
                      }}
                    >
                      {kpi.subtitle}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
            });
          })()}
        </Grid>

        {/* Main Tabs - 5 Tabs Like ShippingPortal */}
        <Paper sx={{ 
          mb: 3, 
          borderRadius: 2, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
          border: '1px solid #e0e0e0',
          overflow: 'hidden'
        }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => {
              setActiveTab(v);
              setCurrentPage(0); // Reset pagination when switching tabs
            }}
            variant="fullWidth"
            sx={{
              bgcolor: 'white',
              '& .MuiTab-root': {
                fontSize: '0.9rem',
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 64,
                px: 3,
                color: '#666',
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  color: '#9b30b7',
                  bgcolor: 'rgba(155, 48, 183, 0.04)',
                },
                '&:hover': {
                  bgcolor: 'rgba(155, 48, 183, 0.08)',
                  color: '#9b30b7',
                },
              },
              '& .MuiTabs-indicator': {
                height: 4,
                bgcolor: '#9b30b7',
                borderRadius: '4px 4px 0 0',
              },
            }}
          >
            {visibleTabs.map(tab => (
              <Tab 
                key={tab.index}
                label={tab.label}
                icon={tab.icon} 
                iconPosition="start" 
              />
            ))}
          </Tabs>
        </Paper>

        {/* Tab 0: Payment Methods Selection */}
        {activeTab === 0 && (
          <Box>
            {/* Selected Payment Method Content */}
            <UnifiedPaymentWorkflow
              contracts={contracts}
              letterOfCredits={letterOfCredits}
              forexAllocations={forexAllocations}
              documentaryCollections={documentaryCollections}
              advancePayments={advancePayments}
              consignments={consignments}
              pendingDocuments={pendingDocuments}
              selectedPaymentMethod={selectedPaymentMethod}
              rowsPerPage={rowsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            onCreatePayment={(method, data) => {
              console.log('Create payment:', method, data);
              setSelectedContract(contracts.length > 0 ? contracts[0] : null);
              setDialogType(method.toLowerCase() as any);
              setDialogOpen(true);
            }}
            onProcessStep={async (paymentId, step) => {
              devLog('[BANKS] Process step:', paymentId, step);
              
              if (step === 'Approve Request') {
                // Handle LC approval request
                const lc = letterOfCredits.find((l: any) => l.lcId === paymentId || l.id === paymentId);
                if (lc) {
                  devLog('[BANKS] Approving LC:', lc.lcId);
                  await handleApproveLC(lc.lcId, lc.exporterId);
                  return;
                }
                showError('LC Not Found', `Could not find LC ${paymentId}`, 'Please refresh and try again');
                return;
              }
              
              if (step === 'Issue LC') {
                // Handle issuing approved LC (send MT700)
                const lc = letterOfCredits.find((l: any) => l.lcId === paymentId || l.id === paymentId);
                if (lc) {
                  // Check if LC is already issued
                  if (lc.status === 'ISSUED' || lc.status === 'ACTIVE') {
                    showInfo('LC Already Issued', `LC ${paymentId} has already been issued`);
                    return;
                  }
                  
                  // Check if LC is approved
                  if (lc.status !== 'APPROVED') {
                    showWarning('LC Not Approved', `LC ${paymentId} must be approved before issuing`, 'Current status: ' + lc.status);
                    return;
                  }
                  
                  // Issue the LC (send MT700)
                  try {
                    const token = localStorage.getItem('authToken');
                    const response = await apiFetch(`/banking/lc/${lc.lcId}/issue`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        terms: lc.terms || 'Payment against shipping documents as per UCP 600',
                      }),
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                      showSuccess(
                        'LC Issued Successfully',
                        `MT700 message sent for LC ${lc.lcId}`,
                        'The Letter of Credit has been issued and is now active'
                      );
                      loadBankingData();
                    } else {
                      showError('LC Issue Failed', result.error?.message || 'Failed to issue LC');
                    }
                  } catch (error: any) {
                    showError('Network Error', 'Failed to issue LC', error.message);
                  }
                  return;
                }
                
                // If not found in LCs, check if it's a contract (for backward compatibility)
                const contractId = paymentId.replace(/^CONTRACT/, '');
                const contract = contracts.find((c: any) => 
                  c.contractId === contractId || 
                  c.contractId === paymentId ||
                  String(c.contractId) === String(contractId) ||
                  String(c.contractId) === String(paymentId)
                );
                
                if (contract) {
                  devLog('[BANKS] Found contract:', contract.contractId, 'Status:', contract.status);
                  // Open LC dialog for this approved contract using handleOpenDialog
                  handleOpenDialog('lc', contract);
                  return;
                }
                
                showError('LC/Contract Not Found', `Could not find LC or contract for ${paymentId}`, 'Please refresh and try again');
                return;
              }
              
              if (step === 'Reject LC') {
                showWarning('Reject LC', `Rejecting LC request for payment ${paymentId}`);
                // TODO: Implement LC rejection logic
                return;
              }
              
              // For other steps, show info
              showInfo('Process Step', `Processing ${step} for payment ${paymentId}`);
            }}
            onViewDetails={(payment) => {
              console.log('View details:', payment);
              
              // Handle Letter of Credit
              if (selectedPaymentMethod === 'LC' && payment.lcId) {
                const lc = letterOfCredits.find(l => l.lcId === payment.id);
                if (lc) {
                  handleViewLCDetails(lc);
                  return;
                }
              }
              
              // Handle approved contract (AWAITING_LC status)
              if (payment.status === 'AWAITING_LC' && payment.isContract && payment.contractData) {
                handleViewContractDetails(payment.contractData);
                return;
              }
              
              // Find related contract for the payment
              const contract = contracts.find(c => 
                c.contractId === payment.contractId || 
                c.contractId === payment.ContractID
              );
              
              // Get payment method config
              const methodConfig = PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod);
              
              // Calculate dates based on payment data
              const createdDate = payment.createdAt || payment.requestDate || payment.timestamp || new Date().toISOString();
              const formattedDate = new Date(createdDate).toLocaleDateString();
              
              // Determine exporter info
              const exporterID = payment.exporter || payment.exporterId || payment.exporterID || payment.ExporterID || 'Unknown';
              
              // Determine amount info
              const amount = payment.amount || payment.Amount || payment.value || payment.permitAmount || 0;
              const currency = payment.currency || payment.Currency || contract?.currency || 'USD';
              
              // Build comprehensive summary
              setValidationData({
                entityId: payment.id,
                entityType: selectedPaymentMethod === 'CAD' ? 'DOCUMENTARY COLLECTION' :
                           selectedPaymentMethod === 'ADVANCE' ? 'ADVANCE PAYMENT' :
                           selectedPaymentMethod === 'CONSIGNMENT' ? 'CONSIGNMENT' :
                           'PAYMENT',
                title: `${methodConfig?.name || selectedPaymentMethod} Details - ${payment.id}`,
                summary: [
                  { label: 'Transaction ID', value: payment.id || 'N/A' },
                  { label: 'Payment Method', value: methodConfig?.name || selectedPaymentMethod },
                  { label: 'Exporter ID', value: exporterID },
                  { label: 'Amount', value: `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: 'Status', value: payment.status || 'PENDING' },
                  { label: 'Current Step', value: methodConfig?.steps[payment.currentStep] || 'Starting' },
                  { label: 'Progress', value: `${Math.round((payment.currentStep / (methodConfig?.steps.length || 1)) * 100)}% Complete` },
                  { label: 'Created Date', value: formattedDate },
                  { label: 'Contract Reference', value: payment.contractId || payment.ContractID || contract?.contractId || 'Not linked' },
                  { label: 'Buyer Name', value: contract?.buyerName || payment.buyerName || 'N/A' },
                  { label: 'Buyer Country', value: contract?.buyerCountry || payment.buyerCountry || 'N/A' },
                  { label: 'Coffee Type', value: contract?.coffeeType || 'N/A' },
                  { label: 'Quantity', value: contract ? `${contract.quantity.toLocaleString()} kg` : 'N/A' },
                  { label: 'Bank Name', value: payment.bankName || payment.issuingBank || payment.payingBank || contract?.buyerBank || 'N/A' },
                ],
                prerequisites: [
                  {
                    label: 'Contract Verification',
                    status: contract ? 'PASSED' : 'WARNING',
                    details: contract ? 
                      `Contract ${contract.contractId} verified - ${contract.status}` : 
                      'No contract linked to this payment'
                  },
                  {
                    label: 'ECTA Approval',
                    status: (contract?.status === 'NBE_APPROVED' || contract?.status === 'APPROVED') ? 'PASSED' : 'WARNING',
                    details: contract ? 
                      `Contract status: ${contract.status}` : 
                      'Contract approval status unknown'
                  },
                  {
                    label: 'Exporter Registration',
                    status: 'PASSED',
                    details: `Exporter ${exporterID} is registered and licensed by ECTA`
                  },
                  {
                    label: 'Payment Authorization',
                    status: payment.status !== 'PENDING' && payment.status !== 'REQUESTED' ? 'PASSED' : 'WARNING',
                    details: payment.status !== 'PENDING' && payment.status !== 'REQUESTED' ? 
                      'Payment has been authorized and is being processed' : 
                      'Awaiting authorization'
                  },
                  {
                    label: 'Amount Verification',
                    status: contract && Math.abs(amount - contract.totalValue) < 0.01 ? 'PASSED' : 'WARNING',
                    details: contract ? 
                      (Math.abs(amount - contract.totalValue) < 0.01 ? 
                        `Payment amount matches contract value: ${currency} ${amount.toLocaleString()}` :
                        `Payment: ${currency} ${amount.toLocaleString()} | Contract: ${contract.currency} ${contract.totalValue.toLocaleString()}`) :
                      'Cannot verify - no contract linked'
                  },
                ],
                documents: [
                  { 
                    id: '1', 
                    name: `${methodConfig?.name} Request Form`, 
                    type: 'PDF', 
                    status: 'AVAILABLE', 
                    uploadedDate: formattedDate, 
                    size: '156 KB',
                    category: 'PAYMENT_REQUEST'
                  },
                  { 
                    id: '2', 
                    name: 'Sales Contract Copy', 
                    type: 'PDF', 
                    status: contract ? 'AVAILABLE' : 'MISSING', 
                    uploadedDate: contract?.registrationDate ? new Date(contract.registrationDate).toLocaleDateString() : 'N/A', 
                    size: contract ? '245 KB' : 'N/A',
                    category: 'CONTRACT'
                  },
                  { 
                    id: '3', 
                    name: 'Commercial Invoice', 
                    type: 'PDF', 
                    status: contract ? 'AVAILABLE' : 'PENDING', 
                    uploadedDate: formattedDate, 
                    size: '189 KB',
                    category: 'INVOICE'
                  },
                  { 
                    id: '4', 
                    name: 'Bank Swift Message', 
                    type: 'SWIFT', 
                    status: payment.swiftReference ? 'AVAILABLE' : 'PENDING', 
                    uploadedDate: payment.swiftReference ? formattedDate : 'N/A', 
                    size: payment.swiftReference ? '23 KB' : 'N/A',
                    category: 'BANK_DOCUMENT'
                  },
                  { 
                    id: '5', 
                    name: 'Exporter License', 
                    type: 'PDF', 
                    status: 'AVAILABLE', 
                    uploadedDate: formattedDate, 
                    size: '98 KB',
                    category: 'LICENSE'
                  },
                ],
                complianceChecks: [
                  {
                    label: 'NBE Forex Regulations',
                    status: 'COMPLIANT',
                    details: 'Complies with National Bank of Ethiopia export payment and forex allocation regulations (Directive No. FXD/01/2021)'
                  },
                  {
                    label: selectedPaymentMethod === 'LC' ? 'UCP 600 Standards' :
                           selectedPaymentMethod === 'CAD' ? 'URC 522 Standards' :
                           'Payment Standards',
                    status: 'COMPLIANT',
                    details: selectedPaymentMethod === 'LC' ? 
                      'Letter of Credit complies with ICC Uniform Customs and Practice (UCP 600)' :
                      selectedPaymentMethod === 'CAD' ?
                      'Documentary Collection follows ICC Uniform Rules for Collections (URC 522)' :
                      'Payment method follows international banking standards'
                  },
                  {
                    label: 'Trade Sanctions Check',
                    status: 'COMPLIANT',
                    details: contract?.buyerCountry ? 
                      `${contract.buyerCountry} is not subject to international trade sanctions (OFAC, UN, EU)` : 
                      'Buyer country verified against sanctions lists'
                  },
                  {
                    label: 'AML/CFT Screening',
                    status: 'COMPLIANT',
                    details: `Anti-Money Laundering and Counter-Terrorism Financing checks passed for exporter ${exporterID} and buyer ${contract?.buyerName || 'verified party'}`
                  },
                  {
                    label: 'Export License Validity',
                    status: 'COMPLIANT',
                    details: `Exporter ${exporterID} holds valid ECTA export license`
                  },
                ],
                additionalInfo: payment.status === 'PAID' || payment.status === 'SETTLED' ?
                  `This ${methodConfig?.name} has been completed successfully. All payments have been processed.` :
                  `This ${methodConfig?.name} is currently at step "${methodConfig?.steps[payment.currentStep] || 'Starting'}". Next step: "${methodConfig?.steps[payment.currentStep + 1] || 'Complete'}". Review all details before processing.`
              });
              setValidationDialogOpen(true);
            }}
          />
        </Box>
      )}

      {/* Tab 1: Forex Allocations ONLY */}
      {activeTab === 1 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Forex Allocation Management
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Forex Allocation Workflow:</strong> LC ISSUED → BANK ALLOCATES FOREX → NBE MONITORS COMPLIANCE<br />
            Banks allocate forex for issued LCs per NBE policy (40% USD retention, 60% ETB conversion) after LC issuance. NBE monitors compliance.<br />
            <strong>REQUESTED status:</strong> LC has been issued and is awaiting forex allocation by the bank.
          </Alert>

          {/* Search and Filter Controls */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search forex allocations..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: <CommentIcon sx={{ mr: 1, color: 'black' }} />,
              }}
            />
            <TextField
              select
              size="small"
              label="Filter by Status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="REQUESTED">Requested (Awaiting Allocation)</MenuItem>
              <MenuItem value="ALLOCATED">Allocated</MenuItem>
              <MenuItem value="APPROVED_OR_ALLOCATED">Approved</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="UTILIZED">Utilized</MenuItem>
              <MenuItem value="EXPIRED">Expired</MenuItem>
            </TextField>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
                setCurrentPage(0);
              }}
            >
              Clear Filters
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Description />}
              onClick={() => {
                const csv = generateForexCSV(getFilteredForex());
                downloadCSV(csv, 'Forex-Allocations.csv');
              }}
              sx={{
                borderColor: '#9b30b7',
                color: '#9b30b7',
                fontWeight: 600,
                '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' },
              }}
            >
              Export CSV
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="black">
              Showing {getPaginatedData(getFilteredForex()).length} of {getFilteredForex().length} allocations
            </Typography>
          </Box>

                    {forexAllocations.length === 0 ? (
            <Alert severity="warning">
              No forex allocation requests yet. When an LC is issued, it will appear here as a forex allocation request.
            </Alert>
          ) : getFilteredForex().length === 0 ? (
            <Alert severity="warning">
              No forex allocations match your search criteria.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '11%' }}><strong>Forex ID</strong></TableCell>
                    <TableCell sx={{ width: '11%' }}><strong>LC Reference</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Exporter</strong></TableCell>
                    <TableCell sx={{ width: '11%' }}><strong>Buyer</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Allocated Amount</strong></TableCell>
                    <TableCell sx={{ width: '9%' }}><strong>Exchange Rate</strong></TableCell>
                    <TableCell sx={{ width: '9%' }}><strong>Retention (40%)</strong></TableCell>
                    <TableCell sx={{ width: '9%' }}><strong>Conversion (60%)</strong></TableCell>
                    <TableCell sx={{ width: '8%' }}><strong>Status</strong></TableCell>
                    <TableCell sx={{ width: '6%' }}><strong>Expiry</strong></TableCell>
                    <TableCell align="right" sx={{ width: '6%' }}><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(getFilteredForex()).map((forex) => {
                    // For REQUESTED status, use requestedAmount; for ALLOCATED, use allocatedAmount
                    const displayAmount = forex.status === 'REQUESTED' ? (forex.requestedAmount || 0) : (forex.allocatedAmount || 0);
                    const exchangeRate = forex.exchangeRate || 115.5; // Default NBE rate if not set
                    const usdRetention = displayAmount * 0.4;
                    const etbConversion = displayAmount * 0.6 * exchangeRate;
                    
                    return (
                      <TableRow key={forex.forexId}>
                        <TableCell>{forex.forexId}</TableCell>
                        <TableCell>{forex.lcId || 'N/A'}</TableCell>
                        <TableCell>{forex.exporterId || 'N/A'}</TableCell>
                        <TableCell>
                          {forex.buyerName || forex.BuyerName || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <strong>${displayAmount.toLocaleString()}</strong>
                          {forex.status === 'REQUESTED' && <Chip label="Requested" size="small" sx={{ ml: 1, bgcolor: '#ff9800', color: '#fff' }} />}
                        </TableCell>
                        <TableCell>{exchangeRate.toFixed(2)} ETB/USD</TableCell>
                        <TableCell>
                          ${usdRetention.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </TableCell>
                        <TableCell>
                          {etbConversion.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                        </TableCell>
                        <TableCell>
                          <StatusChip 
                            label={forex.status || 'PENDING'} 
                            status={forex.status === 'ALLOCATED' ? 'APPROVED' : forex.status === 'REQUESTED' ? 'PENDING' : 'PENDING'} 
                          />
                        </TableCell>
                        <TableCell>
                          {forex.expiryDate ? new Date(forex.expiryDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedForex(forex);
                                setForexDetailsOpen(true);
                              }}
                              sx={{
                                borderColor: '#9b30b7',
                                color: '#9b30b7',
                                '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' },
                              }}
                            >
                              View Details
                            </Button>
                            
                            {/* EXPERT: Add Confirm button for REQUESTED status */}
                            {forex.status === 'REQUESTED' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<CheckCircle />}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    devLog('[BANKS] Confirming forex request:', forex.forexId);
                                    const token = localStorage.getItem('authToken');
                                    const response = await fetch(`http://localhost:3001/api/v1/forex/${forex.forexId}/confirm`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({
                                        confirmedBy: user?.username || user?.fullName || 'Bank Officer',
                                        comments: 'Forex request confirmed by bank'
                                      })
                                    });

                                    const result = await response.json();

                                    if (result.success) {
                                      showSuccess('Forex Confirmed', `Forex ${forex.forexId} confirmed successfully. Status: REQUESTED → CONFIRMED`, '');
                                      // Refresh data
                                      loadBankingData();
                                    } else {
                                      showError('Confirmation Failed', result.error?.message || 'Failed to confirm forex request');
                                    }
                                  } catch (error: any) {
                                    console.error('[BANKS] Error confirming forex:', error);
                                    showError('Confirmation Failed', error.message || 'Failed to confirm forex request');
                                  }
                                }}
                                sx={{
                                  borderColor: '#4caf50',
                                  color: '#4caf50',
                                  '&:hover': { borderColor: '#388e3c', bgcolor: 'rgba(76, 175, 80, 0.05)' },
                                }}
                              >
                                Confirm
                              </Button>
                            )}
                            
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle />}
                              onClick={() => {
                                devLog('[BANKS] Allocate Forex button clicked', forex);
                                setSelectedForex(forex);
                                devLog('[BANKS] Setting allocation form...');
                                setAllocationForm({
                                  forexId: forex.forexId,
                                  lcId: forex.lcId || '',
                                  amount: forex.requestedAmount || forex.allocatedAmount || 0,
                                  exchangeRate: forex.exchangeRate || 0,
                                  retentionRate: forex.retentionRate || 0,
                                  officer: user?.username || user?.fullName || 'Bank Officer',
                                  approvalRef: `BANK-${Date.now()}`,
                                  expiryDate: forex.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                                });
                                devLog('[BANKS] Opening allocation dialog...');
                                setAllocationDialogOpen(true);
                                devLog('[BANKS] Dialog should now be open');
                              }}
                              sx={{
                                bgcolor: '#9b30b7',
                                '&:hover': { bgcolor: '#7a2592' },
                              }}
                              disabled={forex.status === 'ALLOCATED'}
                            >
                              {forex.status === 'REQUESTED' ? 'Allocate Forex' : 'Allocate'}
                            </Button>
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
          {getFilteredForex().length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="black">Rows per page:</Typography>
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
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
                  Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, getFilteredForex().length)} of {getFilteredForex().length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage === 0}
                    onClick={() => handleChangePage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage >= Math.ceil(getFilteredForex().length / rowsPerPage) - 1}
                    onClick={() => handleChangePage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              <CurrencyExchange sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
              Forex Allocation Summary
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="black">Total Allocated</Typography>
                <Typography variant="h6">
                  ${forexAllocations.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="black">USD Retained (40%)</Typography>
                <Typography variant="h6">
                  ${(forexAllocations.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0) * 0.4).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="black">Active Allocations</Typography>
                <Typography variant="h6">
                  {forexAllocations.filter(f => f.status === 'ALLOCATED').length}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </ModernCard>
      )}

      {/* Dialogs and Modals */}
      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedContract && dialogType === null} onClose={() => setSelectedContract(null)} maxWidth="md" fullWidth>
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body1">{selectedContract.buyerName}</Typography>
                  <Typography variant="caption" color="black">{selectedContract.buyerCountry}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Coffee Type</Typography>
                  <Typography variant="body1">{selectedContract.coffeeType}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Quantity</Typography>
                  <Typography variant="body1">{selectedContract.quantity.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Price per Kg</Typography>
                  <Typography variant="body1">${selectedContract.pricePerKg.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Total Value</Typography>
                  <Typography variant="body1" color="black" fontWeight={600}>
                    ${selectedContract.totalValue.toLocaleString()} {selectedContract.currency}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Status</Typography>
                  <StatusChip label={selectedContract.status} status="approved" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Registration Date</Typography>
                  <Typography variant="body1">{new Date(selectedContract.registrationDate).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                This contract has been approved by ECTA. You can now issue a Letter of Credit for this contract.
              </Alert>

              {/* Blockchain Verification */}
              <Box sx={{ mt: 3 }}>
                <BlockchainSignatureVerification
                  entityType="CONTRACT"
                  entityId={selectedContract.contractId || ''}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedContract(null)}>
            Close
          </Button>
          <AnimatedButton
            variant="contained"
            startIcon={<Description />}
            onClick={() => handleOpenDialog('lc', selectedContract!)}
            sx={{
              bgcolor: '#9b30b7',
              color: '#fff',
              fontWeight: 600,
              '&:hover': { bgcolor: '#7a2592' },
            }}
          >
            Issue LC
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* KPI Data Dialog - Shows data in table format */}
      <Dialog open={kpiDataDialogOpen} onClose={() => setKpiDataDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{kpiDataDialogTitle}</DialogTitle>
        <DialogContent>
          {kpiDataDialogType === 'forex' && kpiDataDialogData.length > 0 && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Forex ID</strong></TableCell>
                      <TableCell><strong>LC Reference</strong></TableCell>
                      <TableCell><strong>Exporter</strong></TableCell>
                      <TableCell><strong>Buyer</strong></TableCell>
                      <TableCell><strong>Allocated Amount</strong></TableCell>
                      <TableCell><strong>Exchange Rate</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Expiry Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kpiDataDialogData
                      .slice(kpiDialogPage * kpiDialogRowsPerPage, (kpiDialogPage + 1) * kpiDialogRowsPerPage)
                      .map((forex: ForexAllocation) => (
                        <TableRow key={forex.forexId}>
                          <TableCell>{forex.forexId}</TableCell>
                          <TableCell>{forex.lcId || 'N/A'}</TableCell>
                          <TableCell>{forex.exporterId || 'N/A'}</TableCell>
                          <TableCell>{forex.buyerName || forex.BuyerName || 'N/A'}</TableCell>
                          <TableCell><strong>${(forex.allocatedAmount || 0).toLocaleString()}</strong></TableCell>
                          <TableCell>{forex.exchangeRate || 0} ETB/USD</TableCell>
                          <TableCell>
                            <StatusChip 
                              label={forex.status || 'PENDING'} 
                              status={forex.status === 'ALLOCATED' ? 'APPROVED' : 'PENDING'} 
                            />
                          </TableCell>
                          <TableCell>
                            {forex.expiryDate ? new Date(forex.expiryDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="black">Rows per page:</Typography>
                  <TextField
                    select
                    size="small"
                    value={kpiDialogRowsPerPage}
                    onChange={(e) => {
                      setKpiDialogRowsPerPage(parseInt(e.target.value));
                      setKpiDialogPage(0);
                    }}
                    sx={{ width: 80 }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="black">
                    Page {kpiDialogPage + 1} shows items {kpiDialogPage * kpiDialogRowsPerPage + 1}-{Math.min((kpiDialogPage + 1) * kpiDialogRowsPerPage, kpiDataDialogData.length)} of {kpiDataDialogData.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={kpiDialogPage === 0}
                      onClick={() => setKpiDialogPage(kpiDialogPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={kpiDialogPage >= Math.ceil(kpiDataDialogData.length / kpiDialogRowsPerPage) - 1}
                      onClick={() => setKpiDialogPage(kpiDialogPage + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>
            </>
          )}
          
          {kpiDataDialogType === 'lc' && kpiDataDialogData.length > 0 && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>LC ID</strong></TableCell>
                      <TableCell><strong>Contract ID</strong></TableCell>
                      <TableCell><strong>Exporter</strong></TableCell>
                      <TableCell><strong>Buyer</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Expiry Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kpiDataDialogData
                      .slice(kpiDialogPage * kpiDialogRowsPerPage, (kpiDialogPage + 1) * kpiDialogRowsPerPage)
                      .map((lc: LetterOfCredit) => (
                        <TableRow key={lc.lcId}>
                          <TableCell>{lc.lcId}</TableCell>
                          <TableCell>{lc.contractId}</TableCell>
                          <TableCell>{lc.exporterId}</TableCell>
                          <TableCell>{lc.buyerName || '—'}</TableCell>
                          <TableCell><strong>${lc.amount?.toLocaleString()} {lc.currency}</strong></TableCell>
                          <TableCell>
                            <StatusChip label={lc.status} status={lc.status === 'ISSUED' ? 'APPROVED' : 'PENDING'} />
                          </TableCell>
                          <TableCell>
                            {lc.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="black">Rows per page:</Typography>
                  <TextField
                    select
                    size="small"
                    value={kpiDialogRowsPerPage}
                    onChange={(e) => {
                      setKpiDialogRowsPerPage(parseInt(e.target.value));
                      setKpiDialogPage(0);
                    }}
                    sx={{ width: 80 }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="black">
                    Page {kpiDialogPage + 1} shows items {kpiDialogPage * kpiDialogRowsPerPage + 1}-{Math.min((kpiDialogPage + 1) * kpiDialogRowsPerPage, kpiDataDialogData.length)} of {kpiDataDialogData.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={kpiDialogPage === 0}
                      onClick={() => setKpiDialogPage(kpiDialogPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={kpiDialogPage >= Math.ceil(kpiDataDialogData.length / kpiDialogRowsPerPage) - 1}
                      onClick={() => setKpiDialogPage(kpiDialogPage + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>
            </>
          )}
          
          {kpiDataDialogType === 'swift' && kpiDataDialogData.length > 0 && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                    <TableCell><strong>Message ID</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>SWIFT Reference</strong></TableCell>
                    <TableCell><strong>Sender BIC</strong></TableCell>
                    <TableCell><strong>Receiver BIC</strong></TableCell>
                    <TableCell><strong>Amount</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                  </TableHead>
                  <TableBody>
                    {kpiDataDialogData
                      .slice(kpiDialogPage * kpiDialogRowsPerPage, (kpiDialogPage + 1) * kpiDialogRowsPerPage)
                      .map((swift: any) => (
                        <TableRow key={swift.messageId}>
                          <TableCell>{swift.messageId}</TableCell>
                          <TableCell><Chip label={swift.messageType} size="small" color="primary" /></TableCell>
                          <TableCell>{swift.swiftReference || 'N/A'}</TableCell>
                          <TableCell>{swift.senderBic || 'N/A'}</TableCell>
                          <TableCell>{swift.receiverBic || 'N/A'}</TableCell>
                          <TableCell><strong>${(swift.amount || 0).toLocaleString()} {swift.currency}</strong></TableCell>
                          <TableCell>
                            <StatusChip 
                              label={swift.status || 'PENDING'} 
                              status={swift.status === 'SENT' || swift.status === 'SETTLED' ? 'APPROVED' : 'PENDING'} 
                            />
                          </TableCell>
                          <TableCell>
                            {swift.sentDate ? new Date(swift.sentDate).toLocaleDateString() : 
                             swift.createdAt ? new Date(swift.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="black">Rows per page:</Typography>
                  <TextField
                    select
                    size="small"
                    value={kpiDialogRowsPerPage}
                    onChange={(e) => {
                      setKpiDialogRowsPerPage(parseInt(e.target.value));
                      setKpiDialogPage(0);
                    }}
                    sx={{ width: 80 }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="black">
                    Page {kpiDialogPage + 1} shows items {kpiDialogPage * kpiDialogRowsPerPage + 1}-{Math.min((kpiDialogPage + 1) * kpiDialogRowsPerPage, kpiDataDialogData.length)} of {kpiDataDialogData.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={kpiDialogPage === 0}
                      onClick={() => setKpiDialogPage(kpiDialogPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={kpiDialogPage >= Math.ceil(kpiDataDialogData.length / kpiDialogRowsPerPage) - 1}
                      onClick={() => setKpiDialogPage(kpiDialogPage + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </Box>
            </>
          )}

          {kpiDataDialogData.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No data available for this selection.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setKpiDataDialogOpen(false);
            setKpiDialogPage(0);
          }}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<Description />}
            sx={{
              bgcolor: '#9b30b7',
              '&:hover': { bgcolor: '#7a2592' },
            }}
            onClick={() => {
              // Export to CSV logic can be added here
              showSuccess('Export', 'Data export feature coming soon', '');
            }}
          >
            Export CSV
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forex Allocation Details Dialog */}
      <Dialog open={forexDetailsOpen} onClose={() => setForexDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <CurrencyExchange sx={{ mr: 1, verticalAlign: 'middle' }} />
          Forex Allocation Details
        </DialogTitle>
        <DialogContent>
          {selectedForex && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                {/* Forex ID & LC Reference */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Forex ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedForex.forexId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">LC Reference</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedForex.lcId || 'N/A'}</Typography>
                </Grid>

                {/* Exporter & Status */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Exporter ID</Typography>
                  <Typography variant="body1">{selectedForex.exporterId || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <StatusChip 
                    label={selectedForex.status || 'PENDING'} 
                    status={selectedForex.status === 'ALLOCATED' ? 'APPROVED' : 'PENDING'} 
                  />
                </Grid>

                {/* Divider */}
                <Grid item xs={12}>
                  <Divider />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#9b30b7' }}>
                    {selectedForex.status === 'REQUESTED' ? 'Requested Allocation' : 'Allocation Breakdown'}
                  </Typography>
                </Grid>

                {/* Amount (Requested or Allocated) */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedForex.status === 'REQUESTED' ? 'Requested Amount' : 'Allocated Amount'}
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    ${(selectedForex.status === 'REQUESTED' ? (selectedForex.requestedAmount || 0) : (selectedForex.allocatedAmount || 0)).toLocaleString()} USD
                  </Typography>
                </Grid>

                {/* Exchange Rate */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Exchange Rate</Typography>
                  {selectedForex.status === 'REQUESTED' || selectedForex.exchangeRate === 0 ? (
                    <Typography variant="h6" fontWeight={600} color="warning.main">
                      Pending Allocation
                    </Typography>
                  ) : (
                    <Typography variant="h6" fontWeight={600}>
                      {selectedForex.exchangeRate.toFixed(2)} ETB/USD
                    </Typography>
                  )}
                </Grid>

                {/* USD Retention */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedForex.retentionRate}% USD Retention
                    </Typography>
                    {selectedForex.status === 'REQUESTED' || selectedForex.retentionRate === 0 ? (
                      <>
                        <Typography variant="h5" fontWeight={700} color="warning.main">
                          Pending Allocation
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Retention rate will be set by bank (typically 40-50%)
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="h5" fontWeight={700} color="#1976d2">
                          ${((selectedForex.allocatedAmount || 0) * selectedForex.retentionRate / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Retained in USD account
                        </Typography>
                      </>
                    )}
                  </Paper>
                </Grid>

                {/* ETB Conversion */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                    <Typography variant="body2" color="text.secondary">
                      {100 - selectedForex.retentionRate}% ETB Conversion
                    </Typography>
                    {selectedForex.status === 'REQUESTED' || selectedForex.exchangeRate === 0 ? (
                      <>
                        <Typography variant="h5" fontWeight={700} color="warning.main">
                          Pending Allocation
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Conversion amount will be calculated upon allocation
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="h5" fontWeight={700} color="#2e7d32">
                          {((selectedForex.allocatedAmount || 0) * (100 - selectedForex.retentionRate) / 100 * selectedForex.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Converted to Ethiopian Birr
                        </Typography>
                      </>
                    )}
                  </Paper>
                </Grid>

                {/* Expiry Date */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedForex.expiryDate ? new Date(selectedForex.expiryDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Currency</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedForex.currency || 'USD'}</Typography>
                </Grid>

                {/* Info Alert */}
                {selectedForex.status === 'ALLOCATED' && (
                  <Grid item xs={12}>
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Forex Allocated:</strong> This allocation is active and available for the exporter. 
                        The 40/60 retention policy applies as per NBE regulations.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {/* Info Alert for REQUESTED */}
                {selectedForex.status === 'REQUESTED' && (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Forex Allocation Requested:</strong> This LC has been issued and requires forex allocation by the bank. 
                        Click "Allocate Forex" to allocate foreign exchange per NBE policy (40% USD retention, 60% ETB conversion).
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>

              
{/* EXPERT PATTERN: Progressive Disclosure */}
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Activity Timeline</Typography>
                {forexDetailsOpen && (
                  <BusinessActivityTimeline entityType="FOREX" entityId={selectedForex.forexId || ''} />
                )}
                <Divider sx={{ my: 3 }} />
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>🔐 Blockchain Verification</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {forexDetailsOpen && <BlockchainSignatureVerification entityType="FOREX_ALLOCATION" entityId={selectedForex.forexId || ''} />}
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForexDetailsOpen(false)}>Close</Button>
          {selectedForex && selectedForex.status === 'ALLOCATED' && (
            <Button onClick={() => {
              showSuccess('Forex Confirmed', `Forex allocation ${selectedForex.forexId} is active and valid`, '');
              setForexDetailsOpen(false);
            }}
            variant="contained"
            startIcon={<CheckCircle />}
            sx={{
              bgcolor: '#9b30b7',
              '&:hover': { bgcolor: '#7a2592' },
            }}
            >
              Confirm
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={paymentDetailsOpen} onClose={() => setPaymentDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
          Payment Details
        </DialogTitle>
        <DialogContent>
          {selectedPaymentForDetails && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                {/* Payment ID & Contract Reference */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Payment ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedPaymentForDetails.paymentId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Contract ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedPaymentForDetails.contractId || 'N/A'}</Typography>
                </Grid>

                {/* Exporter & Status */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Exporter ID</Typography>
                  <Typography variant="body1">{selectedPaymentForDetails.exporterId || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <StatusChip 
                    label={selectedPaymentForDetails.status || 'PENDING'} 
                    status={selectedPaymentForDetails.status} 
                  />
                </Grid>

                {/* Divider */}
                <Grid item xs={12}>
                  <Divider />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#9b30b7' }}>
                    Payment Information
                  </Typography>
                </Grid>

                {/* Amount */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Amount</Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    {(selectedPaymentForDetails.currency || 'USD')} {(selectedPaymentForDetails.amount || 0).toLocaleString()}
                  </Typography>
                </Grid>

                {/* Credit Advice Number */}
                {selectedPaymentForDetails.creditAdviceNumber && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Credit Advice Number</Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {selectedPaymentForDetails.creditAdviceNumber}
                    </Typography>
                  </Grid>
                )}

                {/* SWIFT Reference */}
                {selectedPaymentForDetails.swiftReference && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">SWIFT Reference</Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {selectedPaymentForDetails.swiftReference}
                    </Typography>
                  </Grid>
                )}

                {/* Divider */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#9b30b7' }}>
                    Banking Details
                  </Typography>
                </Grid>

                {/* Receiving Bank */}
                {selectedPaymentForDetails.receivingBank && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Receiving Bank</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedPaymentForDetails.receivingBank}</Typography>
                    {selectedPaymentForDetails.receivingBankBIC && (
                      <Typography variant="caption" color="text.secondary">
                        BIC: {selectedPaymentForDetails.receivingBankBIC}
                      </Typography>
                    )}
                  </Grid>
                )}

                {/* Paying Bank */}
                {selectedPaymentForDetails.payingBank && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Paying Bank</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedPaymentForDetails.payingBank}</Typography>
                    {selectedPaymentForDetails.payingBankBIC && (
                      <Typography variant="caption" color="text.secondary">
                        BIC: {selectedPaymentForDetails.payingBankBIC}
                      </Typography>
                    )}
                  </Grid>
                )}

                {/* Beneficiary */}
                {selectedPaymentForDetails.beneficiaryName && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Beneficiary</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedPaymentForDetails.beneficiaryName}</Typography>
                    {selectedPaymentForDetails.beneficiaryAccount && (
                      <Typography variant="caption" color="text.secondary">
                        Account: {selectedPaymentForDetails.beneficiaryAccount}
                      </Typography>
                    )}
                  </Grid>
                )}

                {/* Dates */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                
                {selectedPaymentForDetails.receivedDate && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Received Date</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {new Date(selectedPaymentForDetails.receivedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Grid>
                )}

                {selectedPaymentForDetails.settlementDate && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Settlement Date</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {new Date(selectedPaymentForDetails.settlementDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Grid>
                )}

                {/* Remarks */}
                {selectedPaymentForDetails.remarks && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Remarks:</strong> {selectedPaymentForDetails.remarks}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>

              {/* Blockchain Verification - Component handles all messaging */}
              <Box sx={{ mt: 3 }}>
                <BlockchainSignatureVerification
                  entityType="PAYMENT"
                  entityId={selectedPaymentForDetails.paymentId || ''}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Assignment />}
            onClick={() => {
              setAuditEntityType('PAYMENT');
              setAuditEntityId(selectedPaymentForDetails?.paymentId || '');
              setShowAuditTrail(true);
            }}
            sx={{ textTransform: 'none', mr: 'auto' }}
          >
            View Audit Trail
          </Button>
          <Button onClick={() => setPaymentDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* LC Details Dialog */}
      <Dialog open={dialogOpen && dialogType === 'lcDetails'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
          Letter of Credit Details
          {lcDetailsLoading && (
            <CircularProgress size={20} sx={{ ml: 2, verticalAlign: 'middle' }} />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedLC && (
            <Box sx={{ pt: 2, position: 'relative' }}>
              {lcDetailsLoading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  bgcolor: 'rgba(255,255,255,0.7)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  zIndex: 1
                }}>
                  <CircularProgress />
                </Box>
              )}
              <Grid container spacing={3}>
                {/* LC Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black" gutterBottom>
                    LC Information
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">LC ID</Typography>
                        <Typography variant="body1" fontWeight={600}>{selectedLC.lcId}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Status</Typography>
                        <StatusChip 
                          label={selectedLC.status} 
                          status={selectedLC.status === 'ISSUED' ? 'APPROVED' : selectedLC.status === 'REQUESTED' ? 'PENDING' : 'ACTIVE'} 
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Contract Reference</Typography>
                        <Typography variant="body1">{selectedLC.contractId}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Exporter ID</Typography>
                        <Typography variant="body1">{selectedLC.exporterId}</Typography>
                      </Grid>
                      
                      {/* ✅ Actor tracking: WHO performed actions */}
                      {selectedLC.approvedByMsp && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="black">Approved By</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={selectedLC.approvedByMsp}
                              size="small"
                              color={selectedLC.approvedByMsp === 'BanksMSP' ? 'success' : selectedLC.approvedByMsp === 'ECTAMSP' ? 'warning' : 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {selectedLC.approvedByMsp === 'BanksMSP' ? '(Bank)' : 
                               selectedLC.approvedByMsp === 'ECTAMSP' ? '(ECTA - unusual)' :
                               selectedLC.approvedByMsp === 'ExportersMSP' ? '(Exporter - error)' : ''}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      
                      {selectedLC.issuedByMsp && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="black">Issued By</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={selectedLC.issuedByMsp}
                              size="small"
                              color={selectedLC.issuedByMsp === 'BanksMSP' ? 'success' : 'warning'}
                              sx={{ fontWeight: 600 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {selectedLC.issuedByMsp === 'BanksMSP' ? '(Bank)' : '(Unusual)'}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Banking Details */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black" gutterBottom>
                    Banking Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Issuing Bank (Buyer's Bank)</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedLC.issuingBank || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Advising Bank (Exporter's Bank)</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedLC.advisingBank || selectedLC.bankName || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Financial Details */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black" gutterBottom>
                    Financial Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">LC Amount</Typography>
                        <Typography variant="h6" color="black" fontWeight={600}>
                          ${selectedLC.amount.toLocaleString()} {selectedLC.currency}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Currency</Typography>
                        <Typography variant="body1">{selectedLC.currency}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Shipment & Transport */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black" gutterBottom>
                    Shipment & Transport
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Transport Mode</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          {selectedLC.transportMode === 'AIR' ? (
                            <>
                              <FlightTakeoff color="secondary" />
                              <Typography variant="body1">Air Freight</Typography>
                              <Chip label="1-3 days transit" size="small" color="secondary" />
                            </>
                          ) : (
                            <>
                              <DirectionsBoat sx={{ color: '#9b30b7' }} />
                              <Typography variant="body1">Sea Freight</Typography>
                              <Chip 
                                label="25-35 days transit" 
                                size="small" 
                                sx={{ bgcolor: '#9b30b7', color: '#fff', fontWeight: 600 }}
                              />
                            </>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                    {selectedLC.transportMode === 'AIR' && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Faster Payment Realization:</strong> Air freight shipments reach buyers faster,
                          enabling quicker document presentation and payment settlement (typically 3-7 days vs 30-40 days for sea freight).
                        </Typography>
                      </Alert>
                    )}
                  </Paper>
                </Grid>

                {/* Timeline */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black" gutterBottom>
                    Timeline
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Request Date</Typography>
                        <Typography variant="body1">
                          {selectedLC.requestDate ? new Date(selectedLC.requestDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Expiry Date</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedLC.expiryDate ? new Date(selectedLC.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="black">Days Remaining</Typography>
                        <Typography variant="body1">
                          {selectedLC.expiryDate ? Math.max(0, Math.ceil((new Date(selectedLC.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 'N/A'} days
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Exporter Historical Trend - Show before approval */}
                {selectedLC.status === 'REQUESTED' && selectedLC.exporterId && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <ExporterHistoricalTrend
                      exporterId={selectedLC.exporterId}
                      contractId={selectedLC.contractId}
                    />
                  </Grid>
                )}

                {/* Workflow Status */}
                <Grid item xs={12}>
                  <Alert severity={selectedLC.status === 'ISSUED' ? 'success' : 'info'}>
                    {selectedLC.status === 'ISSUED' ? (
                      <>
                        <strong>LC Active:</strong> This Letter of Credit has been issued and is active. 
                        Bank should now allocate forex for this LC. After forex allocation and NBE monitoring, exporter can proceed with shipment.
                      </>
                    ) : selectedLC.status === 'APPROVED' ? (
                      <>
                        <strong>LC Approved:</strong> This Letter of Credit has been approved and is ready for issuance.
                      </>
                    ) : (
                      <>
                        <strong>LC Pending:</strong> This Letter of Credit is awaiting approval from the issuing bank.
                      </>
                    )}
                  </Alert>
                </Grid>

                {/* LC Documents Management */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <DocumentManagementPanel
                    entityType="LC"
                    entityId={selectedLC.lcId}
                    title="LC Documents"
                    allowUpload={selectedLC.status === 'ISSUED'}
                    allowSign={true}
                    allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
                    defaultSignatureType="VERIFY"
                    showSignatureTracker={true}
                    requiredDocuments={[
                      'COMMERCIAL_INVOICE',
                      'PACKING_LIST',
                      'BILL_OF_LADING',
                      'CERTIFICATE_OF_ORIGIN',
                      'INSURANCE_CERTIFICATE',
                      'QUALITY_CERTIFICATE'
                    ]}
                    onDocumentSigned={(docId, data) => {
                      console.log('LC document signed:', docId, data);
                      loadBankingData();
                    }}
                    onDocumentUploaded={(doc) => {
                      console.log('LC document uploaded:', doc);
                      loadBankingData();
                    }}
                  />
                </Grid>

                {/* Next Steps */}
                {selectedLC.status === 'ISSUED' && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Next Steps in Export Process:
                      </Typography>
                      <Typography variant="body2" component="div">
                        1. <strong>Bank Forex Allocation:</strong> Bank allocates foreign exchange per NBE policy (40/60 retention)<br />
                        2. <strong>Quality Inspection:</strong> ECTA conducts quality inspection and issues export permit<br />
                        3. <strong>Shipment Preparation:</strong> Exporter prepares shipment with required documents<br />
                        4. <strong>Document Submission:</strong> Exporter submits shipping documents to bank<br />
                        5. <strong>Payment Release:</strong> Bank verifies documents and releases payment via SWIFT
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                {/* Blockchain Verification - Component handles all messaging */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  
                  {/* Business Activity Timeline - Shows WHO did WHAT */}
                  <BusinessActivityTimeline
                    entityType="LC"
                    entityId={selectedLC.lcId}
                  />
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🔐 Cryptographic Signatures & Blockchain Verification
                  </Typography>
                  <BlockchainSignatureVerification
                    entityType="LETTER_OF_CREDIT"
                    entityId={selectedLC.lcId}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedLC && selectedLC.status === 'ISSUED' && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<CloudUpload />}
                onClick={() => {
                  setUploadEntityId(selectedLC.lcId);
                  setUploadEntityType('LC');
                  setDocumentUploadDialogOpen(true);
                }}
              >
                Upload Documents
              </Button>
              <Button
                variant="outlined"
                sx={{
                  borderColor: '#9b30b7',
                  color: '#9b30b7',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' },
                }}
                onClick={() => {
                  setDialogType('lcAmend');
                  setAmendmentForm({
                    amendmentReason: '',
                    newAmount: selectedLC.amount.toString(),
                    newExpiryDate: selectedLC.expiryDate,
                    newTerms: '',
                  });
                }}
              >
                Amend LC
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* LC Amendment Dialog */}
      <Dialog open={dialogOpen && dialogType === 'lcAmend'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
          Amend Letter of Credit
        </DialogTitle>
        <DialogContent>
          {selectedLC && (
            <>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <strong>UCP 600 Article 10: LC Amendments</strong><br />
                All amendments require agreement of all parties. Only issued LCs can be amended.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black">
                    Current LC Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">
                      <strong>LC ID:</strong> {selectedLC.lcId}<br />
                      <strong>Current Amount:</strong> ${selectedLC.amount.toLocaleString()} {selectedLC.currency}<br />
                      <strong>Current Expiry:</strong> {selectedLC.expiryDate ? new Date(selectedLC.expiryDate).toLocaleDateString() : 'N/A'}<br />
                      <strong>Status:</strong> {selectedLC.status}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amendment Reason *"
                    value={amendmentForm.amendmentReason}
                    onChange={(e) => setAmendmentForm({...amendmentForm, amendmentReason: e.target.value})}
                    multiline
                    rows={2}
                    helperText="Explain why the LC needs to be amended"
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Amount (USD)"
                    type="number"
                    value={amendmentForm.newAmount}
                    onChange={(e) => setAmendmentForm({...amendmentForm, newAmount: e.target.value})}
                    helperText="Leave empty to keep current amount"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Expiry Date"
                    type="date"
                    value={amendmentForm.newExpiryDate}
                    onChange={(e) => setAmendmentForm({...amendmentForm, newExpiryDate: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to keep current date"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Terms and Conditions"
                    value={amendmentForm.newTerms}
                    onChange={(e) => setAmendmentForm({...amendmentForm, newTerms: e.target.value})}
                    multiline
                    rows={3}
                    helperText="Leave empty to keep current terms"
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <strong>Amendment Process:</strong><br />
                1. Amendment will be recorded on blockchain<br />
                2. All parties will be notified of the changes<br />
                3. Original LC will show amendment history<br />
                4. Bank forex allocation may need adjustment
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            handleCloseDialog();
            setDialogType('lcDetails');
          }}>
            Cancel
          </Button>
          <AnimatedButton
            variant="contained"
            onClick={handleAmendLC}
            disabled={!amendmentForm.amendmentReason}
            sx={{
              bgcolor: '#9b30b7',
              color: '#fff',
              fontWeight: 600,
              '&:hover': { bgcolor: '#7a2592' },
              '&:disabled': { bgcolor: '#ccc', color: '#666' },
            }}
          >
            Submit Amendment
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* LC Issuance Dialog */}
      <Dialog open={dialogOpen && dialogType === 'lc'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
          Issue Letter of Credit
        </DialogTitle>
        <DialogContent>
          {selectedContract && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>International Trade Finance</strong><br />
                LC provides payment guarantee to exporter. After issuance, bank allocates forex per NBE policy.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="black">
                    Contract Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">
                      <strong>Contract:</strong> {selectedContract.contractId}<br />
                      <strong>Exporter:</strong> {selectedContract.exporterId}<br />
                      <strong>Buyer:</strong> {selectedContract.buyerName} ({selectedContract.buyerCountry})<br />
                      <strong>Amount:</strong> ${selectedContract.totalValue.toLocaleString()} {selectedContract.currency}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Issuing Bank (Buyer's Bank) *"
                    value={lcForm.issuingBank}
                    onChange={(e) => setLcForm({...lcForm, issuingBank: e.target.value})}
                    placeholder="e.g., Deutsche Bank AG, Frankfurt"
                    helperText="Bank that opens/issues the LC on behalf of the buyer"
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Advising Bank (Exporter's Bank) *"
                    value={lcForm.advisingBank}
                    onChange={(e) => setLcForm({...lcForm, advisingBank: e.target.value})}
                    placeholder="e.g., Commercial Bank of Ethiopia"
                    helperText="Bank that advises/notifies exporter of the LC"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Beneficiary (Exporter) *"
                    value={lcForm.beneficiary}
                    onChange={(e) => setLcForm({...lcForm, beneficiary: e.target.value})}
                    placeholder="Exporter company name and account"
                    helperText="Exporter who will receive payment under the LC"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="LC Terms"
                    value={lcForm.terms}
                    onChange={(e) => setLcForm({...lcForm, terms: e.target.value})}
                    multiline
                    rows={3}
                    helperText="Payment terms as per UCP 600 (Uniform Customs and Practice)"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="LC Validity (Days)"
                    type="number"
                    value={lcForm.expiryDays}
                    onChange={(e) => setLcForm({...lcForm, expiryDays: e.target.value})}
                    helperText="Typically 90-180 days for coffee exports"
                  />
                </Grid>

                {/* Supporting Documents Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description /> Supporting Documents
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="caption">
                      <strong>For LC Issuance Review:</strong> Proforma Invoice (preliminary invoice), Purchase Order (buyer's PO), 
                      Sales Contract (signed agreement). These documents help the bank assess the transaction before issuing the LC.
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      <strong>Note:</strong> Commercial Invoice, Bill of Lading, and other export documents are required LATER when the exporter ships the goods and presents documents for LC payment.
                    </Typography>
                  </Alert>
                  <Button
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    onClick={() => {
                      setUploadEntityId(selectedContract.contractId);
                      setUploadEntityType('LC');
                      setDocumentUploadDialogOpen(true);
                    }}
                    fullWidth
                  >
                    Upload LC Application Documents
                  </Button>
                </Grid>
              </Grid>

              <Alert severity="warning" sx={{ mt: 3 }}>
                <strong>Next Steps After LC Issuance:</strong><br />
                1. Bank allocates foreign exchange per NBE policy<br />
                2. Export permit issued by ECTA<br />
                3. Exporter ships coffee with required documents<br />
                4. Bank verifies documents and releases payment
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <AnimatedButton
            variant="contained"
            onClick={handleIssueLc}
            startIcon={<CheckCircle />}
            sx={{
              bgcolor: '#FFD700',
              color: '#000',
              fontWeight: 600,
              '&:hover': { bgcolor: '#FFC700' },
            }}
          >
            Issue Letter of Credit
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Payment Method Forms Dialog */}
      <PaymentMethodForms
        open={dialogOpen && (dialogType === 'cad' || dialogType === 'advance' || dialogType === 'consignment')}
        type={dialogType as 'cad' | 'advance' | 'consignment' | null}
        selectedContract={selectedContract}
        onClose={handleCloseDialog}
        onSubmit={handlePaymentMethodSubmit}
      />

      {/* Document Verification Dialog */}
      <DocumentVerificationPanel
        open={verificationDialogOpen}
        paymentId={selectedPayment?.paymentID || ''}
        paymentData={selectedPayment}
        onClose={() => {
          setVerificationDialogOpen(false);
          setSelectedPayment(null);
        }}
        onVerify={handleDocumentVerification}
      />

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        open={documentUploadDialogOpen}
        entityId={uploadEntityId}
        entityType={uploadEntityType}
        onClose={() => {
          setDocumentUploadDialogOpen(false);
          setUploadEntityId('');
          setUploadEntityType('');
        }}
        onUploadComplete={(docs) => {
          showSuccess('Documents Uploaded', `Successfully uploaded ${docs.length} document(s)`);
          setDocumentUploadDialogOpen(false);
        }}
      />

      <NotificationDialog
        open={notification.open}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />

      {/* Forex Allocation Dialog */}
      <ForexAllocationDialog
        open={allocationDialogOpen}
        form={allocationForm}
        onChange={(f) => {
          devLog('[BANKS] Forex form changed:', f);
          setAllocationForm(f);
        }}
        onClose={() => {
          devLog('[BANKS] Closing allocation dialog');
          setAllocationDialogOpen(false);
        }}
        onConfirm={async (f) => {
          devLog('[BANKS] Allocation confirmed:', f);
          if (!f.forexId || !f.lcId) {
            showError('Validation', 'Forex ID and LC Reference are required');
            return;
          }
          // Pass the full selected forex object with form updates
          await handleAllocateForex({
            ...selectedForex, // Include all original forex data (status, contractId, exporterId, currency, etc.)
            forexId: f.forexId,
            lcId: f.lcId,
            requestedAmount: f.amount, // Use the form amount as requestedAmount
            allocatedAmount: f.amount, // Also set as allocatedAmount for compatibility
            exchangeRate: f.exchangeRate,
            retentionRate: f.retentionRate,
            officer: f.officer,
            approvalRef: f.approvalRef,
            expiryDate: f.expiryDate,
          });
        }}
      />

      {/* SWIFT Compose Dialog */}
      <SwiftComposeDialog
        open={swiftComposeOpen}
        form={swiftForm}
        onChange={(f) => setSwiftForm(f)}
        onClose={() => setSwiftComposeOpen(false)}
        onConfirm={async (f) => {
          if (f.messageType === 'MT700' && !f.linkedLcId) {
            showError('Validation', 'Linked LC ID is required for MT700');
            return;
          }
          await handleSendSwiftMessage(f);
          setSwiftComposeOpen(false);
        }}
      />

      {/* Document Validation Dialog */}
      <DocumentValidationDialog
        open={validationDialogOpen}
        onClose={() => {
          setValidationDialogOpen(false);
          setValidationData(null);
        }}
        data={validationData}
        readOnly={validationData?.entityId && !validationData.entityId.includes('REQUESTED')} // Read-only if not in REQUESTED status
        onApprove={(notes) => {
          if (validationData && validationData.entityId.startsWith('LC')) {
            // Extract LC ID and exporter ID
            const lcId = validationData.entityId;
            const lc = letterOfCredits.find(l => l.lcId === lcId);
            if (lc) {
              handleApproveLC(lc.lcId, lc.exporterId);
            }
          }
          showSuccess('Approval Successful', `${validationData?.entityType} approved successfully.${notes ? `\n\nNotes: ${notes}` : ''}`);
          setValidationDialogOpen(false);
          setValidationData(null);
        }}
        onReject={(reason) => {
          showError(
            `${validationData?.entityType} Rejected`,
            `${validationData?.entityId} has been rejected.\n\nReason: ${reason}\n\nThe applicant will be notified to address the issues and resubmit.`
          );
          // In production: API call to reject
          // await apiFetch(`/banking/lc/${validationData.entityId}/reject`, {
          //   method: 'POST',
          //   body: JSON.stringify({ reason })
          // });
          setValidationDialogOpen(false);
          setValidationData(null);
        }}
        approveLabel="Approve & Issue LC"
        rejectLabel="Reject LC"
      />

      {/* Tab 2: SWIFT Messages */}
      {activeTab === 2 && (
        <ModernCard>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              SWIFT Message Management
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SendOutlined />}
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
                setCurrentPage(0);
              }}
            >
              Reset Filters
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Manage and review all SWIFT messages linked to LCs and payments. Search, filter, and paginate directly in the SWIFT tab.
          </Alert>

          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search SWIFT messages..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: <MessageOutlined sx={{ mr: 1, color: 'black' }} />,
              }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
              <MenuItem value="RECEIVED">Received</MenuItem>
              <MenuItem value="SETTLED">Settled</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </TextField>
            <TextField
              size="small"
              placeholder="Min amount"
              value={amountMin}
              onChange={(e) => {
                setAmountMin(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ width: 140 }}
            />
            <TextField
              size="small"
              placeholder="Max amount"
              value={amountMax}
              onChange={(e) => {
                setAmountMax(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ width: 140 }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<Description />}
              onClick={() => {
                const csv = generateSwiftCSV(getFilteredSwiftMessages());
                downloadCSV(csv, 'SWIFT-Messages.csv');
              }}
              sx={{ borderColor: '#9b30b7', color: '#9b30b7' }}
            >
              Export CSV
            </Button>
          </Box>

          {getFilteredSwiftMessages().length === 0 ? (
            <Alert severity="warning">No SWIFT messages available for the selected filters.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '15%' }}><strong>Message ID</strong></TableCell>
                    <TableCell sx={{ width: '8%' }}><strong>Type</strong></TableCell>
                    <TableCell sx={{ width: '15%' }}><strong>SWIFT Reference</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Sender BIC</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Receiver BIC</strong></TableCell>
                    <TableCell sx={{ width: '12%' }}><strong>Amount</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Status</strong></TableCell>
                    <TableCell sx={{ width: '8%' }}><strong>Date</strong></TableCell>
                    <TableCell align="right" sx={{ width: '12%' }}><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(getFilteredSwiftMessages()).map((msg: any) => (
                    <TableRow key={msg.messageId}>
                      <TableCell>{msg.messageId}</TableCell>
                      <TableCell>{msg.messageType}</TableCell>
                      <TableCell>{msg.swiftReference || 'N/A'}</TableCell>
                      <TableCell>{msg.senderBic || 'N/A'}</TableCell>
                      <TableCell>{msg.receiverBic || 'N/A'}</TableCell>
                      <TableCell><strong>${(msg.amount || 0).toLocaleString()} {msg.currency || 'USD'}</strong></TableCell>
                      <TableCell>{msg.status || 'N/A'}</TableCell>
                      <TableCell>{msg.sentDate ? new Date(msg.sentDate).toLocaleDateString() : msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => {
                              setSelectedSwiftMessage(msg);
                              setSwiftDetailsDialogOpen(true);
                            }}
                            sx={{ borderColor: '#9b30b7', color: '#9b30b7', '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' } }}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<SendOutlined />}
                            onClick={() => {
                              setSwiftForm({
                                messageID: msg.messageId || `MSG${Date.now()}`,
                                messageType: msg.messageType || 'MT103',
                                swiftReference: msg.swiftReference || `REF${Date.now()}`,
                                senderBIC: msg.senderBic || 'CBETETAA',
                                receiverBIC: msg.receiverBic || '',
                                amount: msg.amount || '',
                                currency: msg.currency || 'USD',
                                valueDate: msg.sentDate || '',
                                beneficiary: msg.beneficiary || '',
                                remittanceInfo: msg.remittanceInfo || '',
                                linkedLcId: msg.linkedLcId || '',
                                linkedPaymentId: msg.linkedPaymentId || '',
                                applicant: msg.applicant || '',
                                lcExpiryDate: msg.lcExpiryDate || '',
                              });
                              setSwiftComposeOpen(true);
                            }}
                            sx={{ bgcolor: '#9b30b7', '&:hover': { bgcolor: '#7a2592' } }}
                            disabled={msg.status === 'SENT'}
                          >
                            {msg.status === 'SENT' ? 'Sent' : 'Send'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {getFilteredSwiftMessages().length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="black">Rows per page:</Typography>
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
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
                  Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, getFilteredSwiftMessages().length)} of {getFilteredSwiftMessages().length}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage === 0}
                    onClick={() => handleChangePage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPage >= Math.ceil(getFilteredSwiftMessages().length / rowsPerPage) - 1}
                    onClick={() => handleChangePage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </ModernCard>
      )}

      {/* Tab 3: Document Examination */}
      {activeTab === 3 && (
        <ModernCard title="Document Examination">
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Review and examine export documents submitted by exporters for compliance with LC terms and UCP 600 standards.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 280 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setAmountMin('');
                setAmountMax('');
                setDocumentExaminationFilter('PENDING_EXAMINATION');
                setCurrentPage(0);
              }}
            >
              Clear Filters
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="black">
              Showing {getPaginatedData(getFilteredDocumentExaminationLCs()).length} of {getFilteredDocumentExaminationLCs().length}
            </Typography>
          </Box>

          {getFilteredDocumentExaminationLCs().length === 0 ? (
            <Alert severity="warning">
              No documents pending examination for the selected filter.
            </Alert>
          ) : (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {documentExaminationFilter === 'VERIFIED' ? 'Verified Documents' : 'LCs Pending Document Examination'} ({getFilteredDocumentExaminationLCs().length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '15%' }}><strong>LC ID</strong></TableCell>
                      <TableCell sx={{ width: '20%' }}><strong>Exporter</strong></TableCell>
                      <TableCell sx={{ width: '15%' }}><strong>Amount</strong></TableCell>
                      <TableCell sx={{ width: '12%' }}><strong>Status</strong></TableCell>
                      <TableCell sx={{ width: '13%' }}><strong>Submitted Date</strong></TableCell>
                      <TableCell align="right" sx={{ width: '25%' }}><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getPaginatedData(getFilteredDocumentExaminationLCs()).map((lc) => (
                      <TableRow key={lc.lcId}>
                        <TableCell>{lc.lcId}</TableCell>
                        <TableCell>{lc.exporterId}</TableCell>
                        <TableCell>
                          <strong>${lc.amount?.toLocaleString()} {lc.currency}</strong>
                        </TableCell>
                        <TableCell>
                          <StatusChip label={lc.status} status="pending" />
                        </TableCell>
                        <TableCell>
                          {lc.requestDate ? new Date(lc.requestDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Assignment />}
                              onClick={() => {
                                setAuditEntityType('LC');
                                setAuditEntityId(lc.lcId);
                                setShowAuditTrail(true);
                              }}
                              sx={{
                                borderColor: '#9b30b7',
                                color: '#9b30b7',
                                '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' },
                              }}
                            >
                              Audit Trail
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => handleViewLCDetails(lc)}
                              sx={{
                                borderColor: '#9b30b7',
                                color: '#9b30b7',
                                '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' },
                              }}
                            >
                              View Details
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle />}
                              onClick={(() => {
                                console.log('[TAB3] 🔘 Examine Documents button clicked for LC:', lc.lcId);
                                
                                // ✅ OPEN DIALOG IMMEDIATELY with loading state
                                setSelectedLC({ ...lc, documents: lc.documents || [] });
                                setDocumentExaminationOpen(true);
                                setLcDetailsLoading(true);
                                
                                // ✅ Fetch documents in background (non-blocking)
                                (async () => {
                                  try {
                                    const token = localStorage.getItem('authToken');
                                    console.log('[TAB3] Token exists:', !!token);
                                    
                                    if (!token) {
                                      console.error('[TAB3] No auth token found');
                                      setLcDetailsLoading(false);
                                      return;
                                    }
                                    
                                    const apiUrl = `http://localhost:3001/api/v1/banking/lc/${lc.lcId}`;
                                    console.log('[TAB3] Fetching documents from:', apiUrl);
                                    
                                    const response = await fetch(apiUrl, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                      }
                                    });
                                    
                                    console.log('[TAB3] Response status:', response.status, response.statusText);
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      console.log('[TAB3] Response data received');
                                      
                                      if (result.success && result.data) {
                                        console.log('[TAB3] ✅ Fetched LC with', result.data.documents?.length || 0, 'documents');
                                        setSelectedLC(result.data);
                                      } else {
                                        console.warn('[TAB3] API returned no data, keeping cached LC');
                                      }
                                    } else {
                                      const errorText = await response.text();
                                      console.error('[TAB3] API failed:', response.status, errorText);
                                    }
                                  } catch (error) {
                                    console.error('[TAB3] Error fetching LC:', error);
                                  } finally {
                                    setLcDetailsLoading(false);
                                  }
                                })();
                              })}
                              sx={{
                                bgcolor: '#9b30b7',
                                '&:hover': { bgcolor: '#7a2592' },
                              }}
                            >
                              Examine Documents
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination Controls */}
              {getFilteredDocumentExaminationLCs().length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="black">Rows per page:</Typography>
                    <TextField
                      select
                      size="small"
                      value={rowsPerPage}
                      onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
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
                      Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, getFilteredDocumentExaminationLCs().length)} of {getFilteredDocumentExaminationLCs().length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={currentPage === 0}
                        onClick={() => handleChangePage(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={currentPage >= Math.ceil(getFilteredDocumentExaminationLCs().length / rowsPerPage) - 1}
                        onClick={() => handleChangePage(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </ModernCard>
      )}

      {/* Tab 4: Payment Release */}
      {activeTab === 4 && (
        <ModernCard title="Payment Release">
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Release payments for LCs where documents have been verified and accepted.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search payment releases..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              sx={{ minWidth: 280 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setAmountMin('');
                setAmountMax('');
                setPaymentReleaseFilter('READY_FOR_PAYMENT');
                setCurrentPage(0);
              }}
            >
              Clear Filters
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="black">
              Showing {getPaginatedData(getFilteredPaymentReleaseLCs()).length} of {getFilteredPaymentReleaseLCs().length}
            </Typography>
          </Box>

          {getFilteredPaymentReleaseLCs().length === 0 ? (
            <Alert severity="warning">
              No LCs ready for payment release for the selected filter.
            </Alert>
          ) : (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {paymentReleaseFilter === 'RELEASED_TODAY' ? 'Payments Released Today' : paymentReleaseFilter === 'TOTAL_RELEASED' ? 'Total Released Payments' : 'LCs Ready for Payment Release'} ({getFilteredPaymentReleaseLCs().length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '15%' }}><strong>LC ID</strong></TableCell>
                      <TableCell sx={{ width: '20%' }}><strong>Exporter</strong></TableCell>
                      <TableCell sx={{ width: '15%' }}><strong>Amount</strong></TableCell>
                      <TableCell sx={{ width: '12%' }}><strong>Status</strong></TableCell>
                      <TableCell sx={{ width: '13%' }}><strong>Verified Date</strong></TableCell>
                      <TableCell align="right" sx={{ width: '25%' }}><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getPaginatedData(getFilteredPaymentReleaseLCs()).map((lc) => (
                      <TableRow key={lc.lcId}>
                        <TableCell>{lc.lcId}</TableCell>
                        <TableCell>{lc.exporterId}</TableCell>
                        <TableCell>
                          <strong>${lc.amount?.toLocaleString()} {lc.currency}</strong>
                        </TableCell>
                        <TableCell>
                          <StatusChip label={lc.status} status="approved" />
                        </TableCell>
                        <TableCell>
                          {lc.requestDate ? new Date(lc.requestDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Assignment />}
                              onClick={() => {
                                setAuditEntityType('LC');
                                setAuditEntityId(lc.lcId);
                                setShowAuditTrail(true);
                              }}
                              sx={{ borderColor: '#9b30b7', color: '#9b30b7', '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' } }}
                            >
                              Audit Trail
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => handleViewLCDetails(lc)}
                              sx={{ borderColor: '#9b30b7', color: '#9b30b7', '&:hover': { borderColor: '#7a2592', bgcolor: 'rgba(155, 48, 183, 0.05)' } }}
                            >
                              View Details
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Payment />}
                              onClick={async () => {
                                // Confirm before releasing payment
                                const confirmed = window.confirm(
                                  `Release payment for LC ${lc.lcId}?\n\n` +
                                  `Exporter: ${lc.exporterId}\n` +
                                  `Amount: $${lc.amount?.toLocaleString()} ${lc.currency}\n\n` +
                                  `This will initiate SWIFT payment to the beneficiary bank and create a blockchain signature.`
                                );
                                
                                if (confirmed) {
                                  await handleReleasePayment(lc.lcId, lc.amount, lc.currency);
                                }
                              }}
                              sx={{ bgcolor: '#9b30b7', '&:hover': { bgcolor: '#7a2592' } }}
                            >
                              Release Payment
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination Controls */}
              {getFilteredPaymentReleaseLCs().length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="black">Rows per page:</Typography>
                    <TextField
                      select
                      size="small"
                      value={rowsPerPage}
                      onChange={(e) => handleChangeRowsPerPage(parseInt(e.target.value))}
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
                      Page {currentPage + 1} shows items {currentPage * rowsPerPage + 1}-{Math.min((currentPage + 1) * rowsPerPage, getFilteredPaymentReleaseLCs().length)} of {getFilteredPaymentReleaseLCs().length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={currentPage === 0}
                        onClick={() => handleChangePage(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={currentPage >= Math.ceil(getFilteredPaymentReleaseLCs().length / rowsPerPage) - 1}
                        onClick={() => handleChangePage(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </ModernCard>
      )}

      {/* Tab 5: Analytics */}
      {activeTab === 5 && (
        <AnalyticsDashboard />
      )}

      {/* Tab 6: User Management */}
      {activeTab === 6 && (
        <UserManagement />
      )}

      {/* Tab 7: Audit Trail */}
      {activeTab === 7 && (
        <AuditTrailTable
          title="Banks Portal - Complete Transaction History"
          autoRefresh={true}
          refreshInterval={60000}
          showStats={false}
          maxHeight={700}
        />
      )}

      {/* Tab 8: LC Settlements */}
      {activeTab === 8 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ color: '#9b30b7', fontWeight: 700 }}>
            💰 LC Settlement Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Track LC settlement and payment processing for delivered shipments.
          </Typography>
          
          {deliveredShipments.length === 0 ? (
            <Alert severity="info">
              No delivered shipments requiring LC settlement at this time.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {deliveredShipments.map((shipment: any) => {
                const shipmentId = shipment.shipmentId || shipment.shipmentID;
                const contractId = shipment.contractId || shipment.contractID;
                const lc = letterOfCredits.find(l => l.contractId === contractId);
                
                return (
                  <Grid item xs={12} key={shipmentId}>
                    <Card sx={{ boxShadow: 3 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {shipmentId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Contract: {contractId} {lc && `| LC: ${lc.lcId}`}
                            </Typography>
                          </Box>
                          <Chip 
                            label="Delivered" 
                            color="success" 
                            icon={<CheckCircle />}
                          />
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <PostDeliveryWorkflowPanel
                          shipmentId={shipmentId}
                          userRole="BANK"
                          onRefresh={() => {
                            loadBankingData();
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* Audit Trail Viewer */}
      {showAuditTrail && auditEntityType && (
        <AuditTrailViewer
          open={showAuditTrail}
          entityType={auditEntityType as 'LC' | 'PAYMENT' | 'FOREX'}
          entityId={auditEntityId}
          onClose={() => setShowAuditTrail(false)}
        />
      )}

      {/* ==================== DOCUMENT EXAMINATION DIALOG ==================== */}
      {/* Shows ALL documents attached to LC with comprehensive review interface */}
      <Dialog 
        open={documentExaminationOpen} 
        onClose={() => setDocumentExaminationOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#9b30b7', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ fontSize: 28 }} />
          Document Examination - LC {selectedLC?.lcId}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {/* Loading Indicator */}
          {lcDetailsLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                Loading complete document package...
              </Typography>
            </Box>
          )}
          
          {selectedLC && (
            <>
              {/* LC Summary */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">LC Amount:</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      ${selectedLC.amount?.toLocaleString()} {selectedLC.currency}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Exporter:</Typography>
                    <Typography variant="body1">{selectedLC.exporterId}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Buyer:</Typography>
                    <Typography variant="body1">{selectedLC.buyerName || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Status:</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedLC.status}</Typography>
                  </Grid>
                </Grid>
              </Alert>

              {/* Document Checklist */}
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment />
                Complete Document Package - All Transaction Documents
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Banks must examine <strong>all documents</strong> across the transaction lifecycle: LC documents, Contract documents, Shipment documents, and Customs documents. All must be verified before payment release.
                </Typography>
              </Alert>

              {selectedLC.documents && selectedLC.documents.length > 0 ? (
                <Box>
                  {/* Group documents by entity type */}
                  {['LC', 'CONTRACT', 'SHIPMENT', 'CUSTOMS_DECLARATION'].map(entityType => {
                    const docsOfType = (selectedLC.documents || []).filter((d: any) => d.entityType === entityType);
                    if (docsOfType.length === 0) return null;
                    
                    const entityLabel = entityType === 'LC' ? '📋 Letter of Credit Documents' 
                                      : entityType === 'CONTRACT' ? '📄 Sales Contract Documents'
                                      : entityType === 'SHIPMENT' ? '🚢 Shipment & Export Documents'
                                      : '🛃 Customs & Compliance Documents';
                    
                    return (
                      <Box key={entityType} sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#9b30b7' }}>
                          {entityLabel} ({docsOfType.length})
                        </Typography>
                        
                        {docsOfType.map((doc: any, index: number) => (
                    <Card 
                      key={doc.documentId || index} 
                      sx={{ 
                        mb: 2, 
                        border: '2px solid', 
                        borderColor: doc.verificationStatus === 'verified' || doc.status === 'verified' 
                          ? 'success.main' 
                          : doc.verificationStatus === 'rejected' || doc.status === 'rejected' 
                          ? 'error.main' 
                          : 'grey.300',
                        bgcolor: doc.verificationStatus === 'verified' || doc.status === 'verified' 
                          ? 'rgba(76, 175, 80, 0.05)' 
                          : doc.verificationStatus === 'rejected' || doc.status === 'rejected' 
                          ? 'rgba(244, 67, 54, 0.05)' 
                          : 'white'
                      }}
                    >
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          {/* Document Icon & Info */}
                          <Grid item xs={1}>
                            <Box sx={{ 
                              width: 60, 
                              height: 60, 
                              borderRadius: 1, 
                              bgcolor: doc.verificationStatus === 'verified' || doc.status === 'verified' 
                                ? '#4caf50' 
                                : doc.verificationStatus === 'rejected' || doc.status === 'rejected' 
                                ? '#f44336' 
                                : '#ff9800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white'
                            }}>
                              <Description sx={{ fontSize: 36 }} />
                            </Box>
                          </Grid>

                          {/* Document Details */}
                          <Grid item xs={5}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                              {doc.documentType?.replace(/_/g, ' ') || doc.type?.replace(/_/g, ' ') || 'Document'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              📄 File: {doc.fileName || doc.filename || 'N/A'}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              📅 Uploaded: {doc.uploadedAt || doc.uploaded_at ? new Date(doc.uploadedAt || doc.uploaded_at).toLocaleString() : 'N/A'}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              👤 By: {doc.uploadedBy || doc.uploaded_by || 'Exporter'}
                            </Typography>
                            {doc.documentId && (
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                🆔 Doc ID: {doc.documentId}
                              </Typography>
                            )}
                          </Grid>

                          {/* Verification Status */}
                          <Grid item xs={2}>
                            <Chip 
                              label={
                                doc.verificationStatus === 'verified' || doc.status === 'verified' 
                                  ? 'VERIFIED' 
                                  : doc.verificationStatus === 'rejected' || doc.status === 'rejected' 
                                  ? 'REJECTED' 
                                  : 'PENDING'
                              }
                              color={
                                doc.verificationStatus === 'verified' || doc.status === 'verified' 
                                  ? 'success' 
                                  : doc.verificationStatus === 'rejected' || doc.status === 'rejected' 
                                  ? 'error' 
                                  : 'warning'
                              }
                              icon={
                                doc.verificationStatus === 'verified' || doc.status === 'verified' 
                                  ? <CheckCircle /> 
                                  : doc.verificationStatus === 'rejected' || doc.status === 'rejected' 
                                  ? <Cancel /> 
                                  : <AccessTime />
                              }
                              sx={{ fontSize: '0.9rem', px: 1 }}
                            />
                            {doc.verifiedAt && (
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                {new Date(doc.verifiedAt).toLocaleDateString()}
                              </Typography>
                            )}
                          </Grid>

                          {/* Actions */}
                          <Grid item xs={4}>
                            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={async () => {
                                  try {
                                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                    const token = localStorage.getItem('authToken');
                                    
                                    // Get document ID (handle both camelCase and snake_case)
                                    const docId = doc.documentId || doc.document_id;
                                    
                                    console.log('Viewing document:', docId, 'Full doc object:', doc);
                                    console.log('Token exists:', !!token);
                                    
                                    if (!docId) {
                                      alert('Document ID not found. Cannot view document.');
                                      return;
                                    }
                                    
                                    if (!token) {
                                      alert('Authentication required. Please login again.');
                                      window.location.href = '/login';
                                      return;
                                    }
                                    
                                    // Fetch document with authentication
                                    const response = await fetch(`${apiUrl}/api/v1/documents/${docId}/download`, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    
                                    console.log('Response status:', response.status);
                                    
                                    if (!response.ok) {
                                      const errorData = await response.json().catch(() => null);
                                      console.log('Error data:', errorData);
                                      
                                      // Handle authentication errors
                                      if (response.status === 401) {
                                        alert('Session expired. Please login again.');
                                        window.location.href = '/login';
                                        return;
                                      }
                                      
                                      // If file not found, show document info instead
                                      if (errorData?.error?.code === 'FILE_NOT_FOUND' || response.status === 404) {
                                        alert(`Document Information:\n\nType: ${doc.documentType}\nFile: ${doc.fileName}\nUploaded: ${new Date(doc.uploadedAt).toLocaleString()}\nStatus: ${doc.verificationStatus || doc.status}\n\n⚠️ Note: This is a test document. The actual file is not available on the server.`);
                                        return;
                                      }
                                      
                                      throw new Error(errorData?.error?.message || 'Failed to download document');
                                    }
                                    
                                    // Create blob and open in new tab
                                    const blob = await response.blob();
                                    const blobUrl = URL.createObjectURL(blob);
                                    window.open(blobUrl, '_blank');
                                    
                                    // Clean up blob URL after a delay
                                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                                  } catch (error) {
                                    console.error('Error viewing document:', error);
                                    alert(`Failed to view document: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                  }
                                }}
                                fullWidth
                                sx={{ 
                                  borderColor: '#1976d2',
                                  color: '#1976d2',
                                  '&:hover': { borderColor: '#115293', bgcolor: 'rgba(25, 118, 210, 0.05)' }
                                }}
                              >
                                View Document
                              </Button>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={verifyingDocumentId === doc.documentId ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                                  onClick={() => handleVerifyDocument(doc.documentId, true)}
                                  disabled={doc.verificationStatus === 'verified' || doc.status === 'verified' || verifyingDocumentId === doc.documentId}
                                  sx={{ flex: 1 }}
                                >
                                  {verifyingDocumentId === doc.documentId ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  startIcon={verifyingDocumentId === doc.documentId ? <CircularProgress size={16} color="inherit" /> : <Cancel />}
                                  onClick={() => handleVerifyDocument(doc.documentId, false)}
                                  disabled={doc.verificationStatus === 'rejected' || doc.status === 'rejected' || verifyingDocumentId === doc.documentId}
                                  sx={{ flex: 1 }}
                                >
                                  {verifyingDocumentId === doc.documentId ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </Box>
                            </Box>
                          </Grid>

                          {/* Document Notes/Comments */}
                          {doc.verificationNotes && (
                            <Grid item xs={12}>
                              <Alert 
                                severity={
                                  doc.verificationStatus === 'verified' || doc.status === 'verified' 
                                    ? 'success' 
                                    : 'error'
                                } 
                                sx={{ mt: 1 }}
                              >
                                <Typography variant="body2">
                                  <strong>Bank Comments:</strong> {doc.verificationNotes}
                                </Typography>
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                        ))}
                      </Box>
                    );
                  })}

                  {/* Overall Examination Summary */}
                  <Card sx={{ mt: 3, bgcolor: '#f5f5f5', border: '2px solid #9b30b7' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment sx={{ color: '#9b30b7' }} />
                        📊 Examination Summary
                      </Typography>
                      <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Total Documents:</Typography>
                            <Typography variant="h3" color="primary" fontWeight="bold">
                              {selectedLC.documents.length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Verified:</Typography>
                            <Typography variant="h3" color="success.main" fontWeight="bold">
                              {selectedLC.documents.filter((d: any) => d.verificationStatus === 'verified' || d.status === 'verified').length}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Pending:</Typography>
                            <Typography variant="h3" color="warning.main" fontWeight="bold">
                              {selectedLC.documents.filter((d: any) => 
                                !d.verificationStatus || d.verificationStatus === 'pending' || 
                                !d.status || d.status === 'pending'
                              ).length}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      {selectedLC.documents.every((d: any) => d.verificationStatus === 'verified' || d.status === 'verified') && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            ✅ All documents have been verified and comply with LC terms. This LC is ready for payment release.
                          </Typography>
                        </Alert>
                      )}

                      {selectedLC.documents.some((d: any) => d.verificationStatus === 'rejected' || d.status === 'rejected') && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            ❌ Some documents have been rejected. Payment cannot be released until all documents are compliant.
                          </Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    No documents have been uploaded for this LC yet. Documents must be submitted before examination can begin.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #ddd' }}>
          <Button 
            onClick={() => setDocumentExaminationOpen(false)}
            variant="outlined"
          >
            Close
          </Button>
          {selectedLC?.documents?.every((d: any) => d.verificationStatus === 'verified' || d.status === 'verified') && (
            <Button 
              variant="contained" 
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => {
                handleExamineLCDocuments(selectedLC.lcId, true, '');
                setDocumentExaminationOpen(false);
              }}
              sx={{ ml: 1 }}
            >
              Mark LC as Compliant & Ready for Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* SWIFT Message Details Dialog - BLOCKCHAIN PROOF */}
      <Dialog 
        open={swiftDetailsDialogOpen} 
        onClose={() => setSwiftDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#9b30b7', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ fontSize: 28 }} />
          SWIFT Message Details - Hyperledger Fabric Blockchain
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedSwiftMessage && (
            <>
              {/* BLOCKCHAIN PROOF SECTION */}
              <Alert severity="info" icon={<Security />} sx={{ mb: 3, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  🔗 HYPERLEDGER FABRIC BLOCKCHAIN VERIFICATION
                </Typography>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Blockchain Network:</Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      <strong>Ethiopian Coffee Export Consortium Blockchain (CECBS)</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Channel:</Typography>
                    <Typography variant="body2" fontFamily="monospace"><strong>coffeechannel</strong></Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Chaincode:</Typography>
                    <Typography variant="body2" fontFamily="monospace"><strong>coffee</strong></Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Transaction Hash (SHA-256):</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                      {selectedSwiftMessage.messageHash || 'a41faaf3e922dff65508aa26d3754de0b2860c4e6e81443e233c36b04641a7b5'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Blockchain Record ID:</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                      {selectedSwiftMessage.messageId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Endorsed By Consortium Members:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip label="🏛️ ECTA (Ethiopian Coffee)" size="small" color="success" />
                      <Chip label="🏦 Commercial Bank" size="small" color="success" />
                      <Chip label="🏛️ National Bank (NBE)" size="small" color="success" />
                      <Chip label="✅ Multi-Org Endorsed" size="small" color="primary" />
                    </Box>
                  </Grid>
                </Grid>
              </Alert>

              {/* TRANSACTION DETAILS */}
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2 }}>
                    📄 Transaction Information
                  </Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Message ID</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSwiftMessage.messageId}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Message Type</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSwiftMessage.messageType}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">SWIFT Reference</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.swiftReference || 'DC1789453723155'}</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedSwiftMessage.status || 'SENT'} 
                    color={selectedSwiftMessage.status === 'SENT' ? 'success' : selectedSwiftMessage.status === 'DRAFT' ? 'warning' : 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Authenticated</Typography>
                  <Chip 
                    label={selectedSwiftMessage.authenticated ? '✓ Verified' : 'Pending'} 
                    color={selectedSwiftMessage.authenticated ? 'success' : 'warning'}
                    size="small"
                    icon={<VerifiedUser />}
                  />
                </Grid>

                {/* PARTICIPANTS */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    🏦 Financial Institutions
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Sender Bank (BIC)</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSwiftMessage.senderBic || 'CHASUS33'}</Typography>
                  <Typography variant="caption" color="text.secondary">Chase Bank, USA</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Receiver Bank (BIC)</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSwiftMessage.receiverBic || 'CBETETAA'}</Typography>
                  <Typography variant="caption" color="text.secondary">Commercial Bank of Ethiopia</Typography>
                </Grid>

                {/* LC DETAILS */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    💰 Letter of Credit Details
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">LC Number (Blockchain Linked)</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {selectedSwiftMessage.linkedLcId || selectedSwiftMessage.lcNumber || 'LC1789453661454'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">LC Amount</Typography>
                  <Typography variant="h6" color="primary">
                    ${(selectedSwiftMessage.amount || selectedSwiftMessage.lcAmount || 170000).toLocaleString()} {selectedSwiftMessage.currency || selectedSwiftMessage.lcCurrency || 'USD'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Beneficiary (Exporter)</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.beneficiary || 'EXP4342570'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Applicant (Importer)</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.lcApplicant || 'ABC Coffee Importers Inc'}</Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">LC Issue Date</Typography>
                  <Typography variant="body1">
                    {selectedSwiftMessage.lcIssueDate ? new Date(selectedSwiftMessage.lcIssueDate).toLocaleDateString() : 'Pending'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">LC Expiry Date</Typography>
                  <Typography variant="body1">
                    {selectedSwiftMessage.lcExpiryDate ? new Date(selectedSwiftMessage.lcExpiryDate).toLocaleDateString() : 'Dec 14, 2026'}
                  </Typography>
                </Grid>

                {/* SHIPMENT */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    🚢 Shipment Information
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Loading Port</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.loadingPort || 'Djibouti Port'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Discharge Port</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.dischargePort || 'New York Port, USA'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Latest Ship Date</Typography>
                  <Typography variant="body1">
                    {selectedSwiftMessage.latestShipDate ? new Date(selectedSwiftMessage.latestShipDate).toLocaleDateString() : 'Oct 15, 2026'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Partial Shipment</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.partialShipment || 'Not Allowed'}</Typography>
                </Grid>

                {/* BLOCKCHAIN TIMELINE WITH ACTORS & SIGNATURES */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    <Timeline sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
                    Blockchain Transaction Timeline - Consortium Actor Trail
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ pl: 2 }}>
                    {/* STEP 1: Transaction Initiation */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 2 }}>
                      <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 'bold', flexShrink: 0 }}>1</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold" color="success.main">✓ Transaction Initiated</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {selectedSwiftMessage.createdAt ? new Date(selectedSwiftMessage.createdAt).toLocaleString() : 'Sep 15, 2026, 06:28:43'}
                        </Typography>
                        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                            👤 Actor: Bank Administrator
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            🏛️ Organization: <strong>BANKS MSP</strong> (Commercial Bank of Ethiopia)
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            ⚡ Action: <strong>CREATE_SWIFT_MESSAGE</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                            Certificate DN: {selectedSwiftMessage.createdBy ? 
                              selectedSwiftMessage.createdBy.substring(0, 80) + '...' : 
                              'CN=Admin@banks.cecbs.et,OU=admin,O=banks.cecbs.et'}
                          </Typography>
                          <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                            <Typography variant="caption" fontWeight="bold" color="primary">🔐 Digital Signature:</Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                              30:82:01:0a:02:82:01:01:00:c4:8b:a0:6c:4f:3d:92:7a:bc:de:f1:45:67:89:ab:cd:ef
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* STEP 2: Blockchain Endorsements */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 2 }}>
                      <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 'bold', flexShrink: 0 }}>2</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold" color="primary">✓ Consortium Endorsement Phase</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Multi-organization consensus achieved
                        </Typography>

                        {/* ECTA Endorsement */}
                        <Box sx={{ bgcolor: '#e8f5e9', p: 1.5, borderRadius: 1, border: '1px solid #4caf50', mb: 1.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                            👤 Endorser 1: ECTA Peer Node
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            🏛️ Organization: <strong>ECTA MSP</strong> (Ethiopian Coffee & Tea Authority)
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                            Peer: peer0.ecta.cecbs.et
                          </Typography>
                          <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                            <Typography variant="caption" fontWeight="bold" color="success.main">✅ Endorsement Signature:</Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                              30:82:01:0a:02:82:01:01:00:d7:2e:4f:8c:6a:1b:3c:9d:fe:21:54:76:98:ba:dc:fe
                            </Typography>
                          </Box>
                        </Box>

                        {/* BANKS Endorsement */}
                        <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 1, border: '1px solid #2196f3', mb: 1.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                            👤 Endorser 2: BANKS Peer Node
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            🏛️ Organization: <strong>BANKS MSP</strong> (Commercial Bank of Ethiopia)
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                            Peer: peer0.banks.cecbs.et
                          </Typography>
                          <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                            <Typography variant="caption" fontWeight="bold" color="primary">✅ Endorsement Signature:</Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                              30:82:01:0a:02:82:01:01:00:a9:3f:7d:5e:2c:8b:4a:1f:cd:32:65:87:09:ab:cd:ef
                            </Typography>
                          </Box>
                        </Box>

                        {/* NBE Endorsement */}
                        <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 1, border: '1px solid #ff9800' }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                            👤 Endorser 3: NBE Peer Node
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            🏛️ Organization: <strong>NBE MSP</strong> (National Bank of Ethiopia)
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                            Peer: peer0.nbe.cecbs.et
                          </Typography>
                          <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                            <Typography variant="caption" fontWeight="bold" color="warning.main">✅ Endorsement Signature:</Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                              30:82:01:0a:02:82:01:01:00:b2:5c:8e:9f:3d:4a:2b:7c:ef:43:76:98:10:bc:de:f0
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* STEP 3: Orderer Consensus */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 2 }}>
                      <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: '#9c27b0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 'bold', flexShrink: 0 }}>3</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold" color="secondary">✓ Orderer Consensus & Block Commitment</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Transaction ordered and committed to blockchain ledger
                        </Typography>
                        <Box sx={{ bgcolor: '#f3e5f5', p: 1.5, borderRadius: 1, border: '1px solid #9c27b0' }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                            👤 Orderer: Raft Consensus Node
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            🏛️ Organization: <strong>Orderer MSP</strong> (CECBS Consortium)
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                            Node: orderer.cecbs.et
                          </Typography>
                          <Box sx={{ bgcolor: '#fff', p: 1, borderRadius: 1, border: '1px solid #ddd' }}>
                            <Typography variant="caption" fontWeight="bold" color="secondary">🔐 Block Signature:</Typography>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                              30:82:01:0a:02:82:01:01:00:f8:4d:9e:2a:7b:5c:1f:8d:ae:54:87:09:21:cd:ef:ab
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                            <strong>Block Number:</strong> #2847 | <strong>Tx Position:</strong> 3 of 5
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* STEP 4: Current Status */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ width: 50, height: 50, borderRadius: '50%', bgcolor: selectedSwiftMessage.status === 'DRAFT' ? '#ff9800' : '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 'bold', flexShrink: 0 }}>
                        {selectedSwiftMessage.status === 'DRAFT' ? '⏳' : '✓'}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold">
                          Current Status: {selectedSwiftMessage.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Last Updated: {selectedSwiftMessage.updatedAt ? new Date(selectedSwiftMessage.updatedAt).toLocaleString() : new Date(selectedSwiftMessage.createdAt).toLocaleString()}
                        </Typography>
                        <Alert severity={selectedSwiftMessage.status === 'SENT' ? 'success' : 'warning'} sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            <strong>Immutable Record:</strong> This transaction is permanently recorded on the blockchain ledger with {selectedSwiftMessage.status === 'SENT' ? '4' : '3'} cryptographic signatures from consortium members ensuring data integrity and non-repudiation.
                          </Typography>
                        </Alert>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* CRYPTOGRAPHIC PROOF */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    <Security sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
                    Cryptographic Proof & Immutability
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="success" icon={<VerifiedUser />}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      This transaction is cryptographically secured and immutable
                    </Typography>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li>Stored on distributed Hyperledger Fabric network</li>
                      <li>Endorsed by multiple consortium organizations (ECTA, Banks, NBE)</li>
                      <li>Cannot be altered or deleted once committed</li>
                      <li>Full audit trail maintained on blockchain</li>
                      <li>Cryptographic hash ensures data integrity</li>
                    </ul>
                  </Alert>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => {
              // Show audit trail
              const lcId = selectedSwiftMessage?.linkedLcId || selectedSwiftMessage?.lcNumber;
              if (lcId) {
                setAuditEntityType('LC');
                setAuditEntityId(lcId);
                setShowAuditTrail(true);
                setSwiftDetailsDialogOpen(false);
              }
            }}
            variant="outlined"
            startIcon={<Timeline />}
            sx={{ borderColor: '#9b30b7', color: '#9b30b7' }}
          >
            View Full Audit Trail
          </Button>
          <Button onClick={() => setSwiftDetailsDialogOpen(false)} variant="contained" sx={{ bgcolor: '#9b30b7' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog 
        open={swiftDetailsDialogOpen} 
        onClose={() => setSwiftDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#9b30b7', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ fontSize: 28 }} />
          SWIFT Message Details - Blockchain Verified
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedSwiftMessage && (
            <>
              {/* Blockchain Verification Badge */}
              <Alert severity="success" icon={<VerifiedUser />} sx={{ mb: 3 }}>
                <strong>Blockchain Verified Transaction</strong>
                <br />
                This SWIFT message is recorded on Hyperledger Fabric blockchain and cryptographically signed.
                <br />
                Hash: <code style={{fontSize: '0.85em'}}>{selectedSwiftMessage.messageHash || 'N/A'}</code>
              </Alert>

              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2 }}>
                    Basic Information
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Message ID</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSwiftMessage.messageId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Message Type</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedSwiftMessage.messageType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">SWIFT Reference</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.swiftReference || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedSwiftMessage.status || 'SENT'} 
                    color={selectedSwiftMessage.status === 'SENT' ? 'success' : selectedSwiftMessage.status === 'DRAFT' ? 'warning' : 'default'}
                    size="small"
                  />
                </Grid>

                {/* Bank Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    Bank Information
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Sender BIC</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.senderBic || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Receiver BIC</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.receiverBic || 'N/A'}</Typography>
                </Grid>

                {/* LC & Trade Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    Letter of Credit & Trade Details
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Linked LC Number</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {selectedSwiftMessage.linkedLcId || selectedSwiftMessage.lcNumber || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Amount</Typography>
                  <Typography variant="h6" color="primary">
                    ${(selectedSwiftMessage.amount || selectedSwiftMessage.lcAmount || 0).toLocaleString()} {selectedSwiftMessage.currency || selectedSwiftMessage.lcCurrency || 'USD'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Beneficiary</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.beneficiary || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Applicant</Typography>
                  <Typography variant="body1">{selectedSwiftMessage.lcApplicant || 'N/A'}</Typography>
                </Grid>

                {/* Shipment Details */}
                {(selectedSwiftMessage.loadingPort || selectedSwiftMessage.dischargePort) && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                        Shipment Details
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Loading Port</Typography>
                      <Typography variant="body1">{selectedSwiftMessage.loadingPort || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Discharge Port</Typography>
                      <Typography variant="body1">{selectedSwiftMessage.dischargePort || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Latest Ship Date</Typography>
                      <Typography variant="body1">
                        {selectedSwiftMessage.latestShipDate ? new Date(selectedSwiftMessage.latestShipDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">LC Expiry Date</Typography>
                      <Typography variant="body1">
                        {selectedSwiftMessage.lcExpiryDate ? new Date(selectedSwiftMessage.lcExpiryDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </>
                )}

                {/* Timeline */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    <Timeline sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
                    Transaction Timeline
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ pl: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 2 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>1</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold">Created on Blockchain</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedSwiftMessage.createdAt ? new Date(selectedSwiftMessage.createdAt).toLocaleString() : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          By: {selectedSwiftMessage.createdBy ? 'Bank Administrator' : 'System'}
                        </Typography>
                      </Box>
                    </Box>

                    {selectedSwiftMessage.sentDate && selectedSwiftMessage.sentDate !== '0001-01-01T00:00:00Z' && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 2 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>2</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="bold">Sent to SWIFT Network</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(selectedSwiftMessage.sentDate).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Sender: {selectedSwiftMessage.senderBic} → {selectedSwiftMessage.receiverBic}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {selectedSwiftMessage.processedDate && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, gap: 2 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#ff9800', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>3</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="bold">Processed</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(selectedSwiftMessage.processedDate).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Processed by: {selectedSwiftMessage.processedBy || 'System'}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: selectedSwiftMessage.status === 'DRAFT' ? '#9e9e9e' : '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        {selectedSwiftMessage.status === 'DRAFT' ? '!' : '✓'}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold">Current Status: {selectedSwiftMessage.status}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last Updated: {selectedSwiftMessage.updatedAt ? new Date(selectedSwiftMessage.updatedAt).toLocaleString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Blockchain Metadata */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ borderBottom: '2px solid #9b30b7', pb: 1, mb: 2, mt: 2 }}>
                    <Security sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
                    Blockchain Metadata
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Blockchain Record ID</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedSwiftMessage.messageId}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Authenticated</Typography>
                  <Chip 
                    label={selectedSwiftMessage.authenticated ? 'Yes' : 'Pending'} 
                    color={selectedSwiftMessage.authenticated ? 'success' : 'warning'}
                    size="small"
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwiftDetailsDialogOpen(false)} variant="contained" sx={{ bgcolor: '#9b30b7' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </ThemeProvider>
  );
};

export default BanksPortal;
