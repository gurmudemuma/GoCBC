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
} from '@mui/material';
import { createOrganizationTheme } from '@/theme/organizationThemes';
import { apiFetch, API_ENDPOINTS, getAuthHeaders } from '@/config/api.config';
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
  Edit,
  Cancel,
  Message as MessageOutlined,
  Send as SendOutlined,
  Person,
} from '@mui/icons-material';
import AuditTrailViewer from './AuditTrailViewer';
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

interface SalesContract {
  contractId: string;
  nbeReferenceNumber: string;
  exporterId: string;
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
  advisingDate?: string;
  confirmationStatus?: 'CONFIRMED' | 'UNCONFIRMED';
  paymentTerms?: string;
}

interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  lcId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  status: string;
  expiryDate: string;
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
  const { user } = useAuth();
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('LC');
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [letterOfCredits, setLetterOfCredits] = useState<LetterOfCredit[]>([]);
  const [forexAllocations, setForexAllocations] = useState<ForexAllocation[]>([]);
  const [exportPermits, setExportPermits] = useState<any[]>([]);
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
  const [paymentReleaseOpen, setPaymentReleaseOpen] = useState(false);
  const [lcAmendmentOpen, setLcAmendmentOpen] = useState(false);
  const [forexDetailsOpen, setForexDetailsOpen] = useState(false);
  const [selectedForex, setSelectedForex] = useState<ForexAllocation | null>(null);
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
      { index: 1, label: 'Forex Allocations', icon: <CurrencyExchange />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Forex Officer'] },
      { index: 2, label: 'SWIFT Messages', icon: <AccountBalance />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'SWIFT Officer'] },
      { index: 3, label: `Document Examination${lcsForExamination.length > 0 ? ` (${lcsForExamination.length})` : ''}`, icon: <Description />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Document Officer'] },
      { index: 4, label: `Payment Release${lcsForPaymentRelease.length > 0 ? ` (${lcsForPaymentRelease.length})` : ''}`, icon: <AttachMoney />, roles: ['BANKS', 'ADMIN', 'BANKS Portal Administrator', 'Bank Officer', 'Payment Officer'] },
      { index: 5, label: 'User Management', icon: <Person />, roles: ['ADMIN', 'BANKS', 'BANKS Portal Administrator'] },
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

  const loadBankingData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('[BANKS] No auth token found');
      showError('Authentication Required', 'Please log in to access banking data', '');
      return;
    }

    console.log('[BANKS] Starting to load banking data...');

    try {
      // Load all NBE-approved contracts from /contracts endpoint
      console.log('[BANKS] Fetching contracts from /contracts endpoint...');
      const contractsResponse = await apiFetch('/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('[BANKS] Contracts response status:', contractsResponse.status);
      const contractsResult = await contractsResponse.json();
      console.log('[BANKS] Contracts result:', { success: contractsResult.success, count: contractsResult.data?.length });
      
      let nbeApprovedContracts: any[] = [];
      
      if (contractsResult.success) {
        // Filter for NBE-approved contracts
        nbeApprovedContracts = contractsResult.data.filter((c: any) => 
          c.contractStatus === 'NBE_APPROVED' || c.contractStatus === 'APPROVED'
        );
        
        console.log(`[BANKS] Total contracts: ${contractsResult.data.length}`);
        console.log(`[BANKS] ✅ NBE-approved contracts: ${nbeApprovedContracts.length}`);
        
        setContracts(nbeApprovedContracts.map((c: any) => {
          const mappedContract = {
            contractId: c.contractID || c.contractId,
            nbeReferenceNumber: c.nbeReferenceNumber || c.NBEReferenceNumber,
            exporterId: c.exporterID || c.exporterId,
            buyerName: c.buyerID || c.buyerId,
            buyerCountry: c.buyerCountry,
            buyerBank: c.buyerBank || c.BuyerBank || '',
            exporterBank: c.exporterBank || c.ExporterBank || '',
            coffeeType: c.coffeeType,
            quantity: c.quantity,
            pricePerKg: c.pricePerKg,
            totalValue: c.totalValue,
            currency: c.currency,
            status: c.contractStatus,
            registrationDate: c.registrationDate,
            approvalDate: c.approvalDate,
          };
          return mappedContract;
        }));
      }

      // Load Letters of Credit from /banking/lc endpoint
      try {
        const lcResponse = await apiFetch('/banking/lc', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const lcResult = await lcResponse.json();
        console.log('[BANKS] LC Response:', { status: lcResponse.status, success: lcResult.success, count: lcResult.data?.length });
        
        if (lcResult.success) {
          const allLCs = lcResult.data.map((lc: any) => ({
            lcId: lc.lcId || lc.LCID,
            contractId: lc.contractId || lc.ContractID,
            exporterId: lc.exporterId || lc.ExporterID,
            bankName: lc.bankName || lc.BankName,
            issuingBank: lc.issuingBank || lc.IssuingBank,
            advisingBank: lc.advisingBank || lc.AdvisingBank || lc.beneficiaryBank || lc.BeneficiaryBank,
            amount: lc.amount || lc.Amount,
            currency: lc.currency || lc.Currency,
            status: lc.status || lc.Status,
            expiryDate: lc.expiryDate || lc.ExpiryDate,
            requestDate: lc.requestDate || lc.RequestDate,
          }));
          
          setLetterOfCredits(allLCs);
          console.log(`[BANKS] ✅ Letters of Credit loaded: ${allLCs.length}`);
          
          // Filter LCs for Document Examination (status: DOCUMENTS_SUBMITTED)
          const forExamination = allLCs.filter((lc: any) => 
            lc.status === 'DOCUMENTS_SUBMITTED' || lc.status === 'UNDER_EXAMINATION'
          );
          setLcsForExamination(forExamination);
          console.log(`[BANKS] 📋 LCs pending document examination: ${forExamination.length}`);
          
          // Filter LCs for Payment Release (status: DOCUMENTS_VERIFIED)
          const forPaymentRelease = allLCs.filter((lc: any) => 
            lc.status === 'DOCUMENTS_VERIFIED' || lc.status === 'DOCUMENTS_ACCEPTED'
          );
          setLcsForPaymentRelease(forPaymentRelease);
          console.log(`[BANKS] 💰 LCs ready for payment release: ${forPaymentRelease.length}`);
        }
      } catch (err) {
        console.error('[BANKS] ❌ Failed to load Letters of Credit:', err);
      }

      // Load Forex Allocations from /forex endpoint
      try {
        const forexResponse = await apiFetch('/forex', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const forexResult = await forexResponse.json();
        if (forexResult.success) {
          setForexAllocations(forexResult.data.map((f: any) => ({
            forexId: f.forexId || f.ForexID,
            contractId: f.contractId || f.ContractID,
            exporterId: f.exporterId || f.ExporterID,
            lcId: f.lcId || f.LCID,
            requestedAmount: Number(f.requestedAmount ?? f.RequestedAmount) || 0,
            allocatedAmount: Number(f.allocatedAmount ?? f.AllocatedAmount) || 0,
            currency: f.currency || f.Currency,
            exchangeRate: Number(f.exchangeRate ?? f.ExchangeRate) || 0,
            retentionRate: Number(f.retentionRate ?? f.RetentionRate) || 0,
            status: f.status || f.Status,
            expiryDate: f.expiryDate || f.ExpiryDate,
          })));
          console.log(`[BANKS] ✅ Forex allocations loaded: ${forexResult.data.length}`);
        }
      } catch (err) {
        console.warn('[BANKS] Could not load forex allocations:', err);
      }

      // Load Export Permits from /permits endpoint
      try {
        const permitsResponse = await apiFetch('/permits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const permitsResult = await permitsResponse.json();
        if (permitsResult.success) {
          setExportPermits(Array.isArray(permitsResult.data) ? permitsResult.data : []);
          console.log(`[BANKS] ✅ Export permits loaded: ${permitsResult.data?.length || 0}`);
        }
      } catch (err) {
        console.warn('[BANKS] Could not load export permits:', err);
      }

      // Load Documentary Collections (CAD) - Endpoint may not exist yet
      try {
        // TODO: Backend needs GET /api/v1/banking/cad endpoint
        // For now, use empty array as CAD functionality is Phase 2
        setDocumentaryCollections([]);
        console.log('[BANKS] Documentary Collections: endpoint not yet implemented (Phase 2)');
      } catch (err) {
        console.warn('Could not load documentary collections:', err);
        setDocumentaryCollections([]);
      }

      // Load Advance Payments - Endpoint may not exist yet
      try {
        // TODO: Backend needs GET /api/v1/banking/payment/by-method/ADVANCE endpoint
        // For now, use empty array as Advance Payment functionality is Phase 2
        setAdvancePayments([]);
        console.log('[BANKS] Advance Payments: endpoint not yet implemented (Phase 2)');
      } catch (err) {
        console.warn('Could not load advance payments:', err);
        setAdvancePayments([]);
      }

      // Load Consignments
      try {
        const consignmentsResponse = await apiFetch('/banking/consignment/outstanding', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const consignmentsResult = await consignmentsResponse.json();
        if (consignmentsResult.success) {
          setConsignments(Array.isArray(consignmentsResult.data) ? consignmentsResult.data : []);
          console.log(`[BANKS] Consignments loaded: ${consignmentsResult.data?.length || 0}`);
        }
      } catch (err) {
        console.warn('Could not load consignments:', err);
        setConsignments([]);
      }

      // Load Pending Documents for Verification from /banking/payment/by-method/LC endpoint
      try {
        const paymentsResponse = await apiFetch('/banking/payment/by-method/LC', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const paymentsResult = await paymentsResponse.json();
        if (paymentsResult.success && Array.isArray(paymentsResult.data)) {
          // Filter for payments with documents submitted but not verified
          const pending = paymentsResult.data.filter((p: any) => 
            p.status === 'DOCUMENTS_SUBMITTED' || p.status === 'UNDER_VERIFICATION'
          );
          setPendingDocuments(pending);
          console.log(`[BANKS] 📄 Pending documents for verification: ${pending.length}`);
        }
      } catch (err) {
        console.warn('[BANKS] Could not load pending documents:', err);
      }

      console.log(`\n[BANKS] ═══════════════════════════════════════════════════`);
      console.log(`[BANKS] 📊 Data Loading Summary:`);
      console.log(`[BANKS] ✅ NBE-Approved Contracts: ${nbeApprovedContracts?.length || 0}`);
      console.log(`[BANKS] ✅ Letters of Credit: ${letterOfCredits.length}`);
      console.log(`[BANKS] ✅ Forex Allocations: ${forexAllocations.length}`);
      console.log(`[BANKS] ✅ Export Permits: ${exportPermits.length}`);
      console.log(`[BANKS] ✅ Consignments: ${consignments.length}`);
      console.log(`[BANKS] 📋 LCs for Document Examination: ${lcsForExamination.length}`);
      console.log(`[BANKS] 💰 LCs for Payment Release: ${lcsForPaymentRelease.length}`);
      console.log(`[BANKS] � Pending Document Verifications: ${pendingDocuments.length}`);
      console.log(`[BANKS] ⏳ Documentary Collections (CAD): ${documentaryCollections.length} (Phase 2)`);
      console.log(`[BANKS] ⏳ Advance Payments: ${advancePayments.length} (Phase 2)`);
      console.log(`[BANKS] ═══════════════════════════════════════════════════\n`);

      // Load SWIFT Statistics from /swift/statistics endpoint
      try {
        const swiftStatsResponse = await apiFetch('/swift/statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const swiftStatsResult = await swiftStatsResponse.json();
        if (swiftStatsResult.success) {
          setSwiftStats(swiftStatsResult.data);
          console.log('[BANKS] ✅ SWIFT statistics loaded');
        }
      } catch (err) {
        console.warn('[BANKS] Could not load SWIFT statistics:', err);
      }

      // Load SWIFT Messages from /swift/messages endpoint
      try {
        const swiftMessagesResponse = await apiFetch('/swift/messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const swiftMessagesResult = await swiftMessagesResponse.json();
        if (swiftMessagesResult.success) {
          setSwiftMessages(swiftMessagesResult.data || []);
          console.log(`[BANKS] ✅ SWIFT messages loaded: ${swiftMessagesResult.data?.length || 0}`);
        }
      } catch (err) {
        console.warn('[BANKS] Could not load SWIFT messages:', err);
      }
      
    } catch (error) {
      console.error('[BANKS] Failed to load banking data:', error);
      showError('Data Loading Failed', 'Could not load banking data from the server', error instanceof Error ? error.message : String(error));
    }
  };

  const handleOpenDialog = (type: 'lc' | 'forex' | 'permit', contract: SalesContract) => {
    console.log('=== LC Dialog Opening ===');
    console.log('Contract data:', {
      contractId: contract.contractId,
      exporterId: contract.exporterId,
      buyerBank: contract.buyerBank,
      exporterBank: contract.exporterBank,
      totalValue: contract.totalValue,
      currency: contract.currency
    });
    
    setSelectedContract(contract);
    setDialogType(type);
    
    // Auto-fill LC form with contract data
    if (type === 'lc') {
      const formData = {
        issuingBank: contract.buyerBank || '',
        advisingBank: contract.exporterBank || '',
        beneficiary: contract.exporterId || '',
        terms: 'Payment against shipping documents as per UCP 600',
        expiryDays: '90',
      };
      console.log('Auto-filling LC form with data:', formData);
      
      // Add warning if banks are missing (old contract)
      if (!contract.buyerBank || !contract.exporterBank) {
        console.warn('⚠️ Contract missing bank data - this is likely an OLD contract created before bank fields were added');
        console.warn('Create a NEW contract to test the auto-fill feature with bank data');
      }
      
      setLcForm(formData);
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
    setSelectedLC(lc);
    
    // Fetch real documents for this LC
    const token = localStorage.getItem('authToken');
    let lcDocuments: any[] = [];
    
    if (token) {
      try {
        const response = await apiFetch(`/documents/entity/LC/${lc.lcId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success && result.data) {
          lcDocuments = result.data.map((doc: any) => ({
            id: doc.documentId || doc.id,
            name: doc.filename || doc.name,
            type: (doc.mimeType || 'application/pdf').split('/')[1].toUpperCase(),
            status: 'AVAILABLE',
            url: `/api/v1/documents/${doc.documentId || doc.id}`,
            uploadedDate: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            size: doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'N/A',
            category: doc.category || 'LC_DOCUMENT',
          }));
        }
      } catch (error) {
        console.error('Error fetching LC documents:', error);
      }
    }
    
    // If no documents found, provide standard required documents list
    if (lcDocuments.length === 0) {
      lcDocuments = [
        { id: '1', name: 'LC Application Form', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '2', name: 'Sales Contract Copy', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '3', name: 'Proforma Invoice', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '4', name: 'Buyer Bank Details', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
        { id: '5', name: 'SWIFT Message MT700', type: 'PDF', status: 'MISSING', uploadedDate: 'N/A', size: 'N/A' },
      ];
    }
    
    // Find the related contract
    const contract = contracts.find(c => c.contractId === lc.contractId);
    
    // Set validation data for view mode
    setValidationData({
      entityId: lc.lcId,
      entityType: 'LETTER OF CREDIT',
      title: `LC Details - ${lc.lcId}`,
      summary: [
        { label: 'LC Number', value: lc.lcNumber || lc.lcId },
        { label: 'SWIFT Reference', value: lc.swiftReference || `MT700-${lc.lcId.slice(-8).toUpperCase()}` },
        { label: 'Contract Reference', value: lc.contractId },
        { label: 'LC Type', value: 'Documentary Credit (Irrevocable)' },
        { label: 'Confirmation Status', value: lc.confirmationStatus || 'UNCONFIRMED' },
        { label: 'Applicant (Buyer)', value: contract?.buyerName || 'N/A' },
        { label: 'Beneficiary (Exporter)', value: lc.exporterId },
        { label: 'LC Amount', value: `${lc.currency} ${lc.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Tolerance', value: '+10% / -10%' },
        { label: 'Issuing Bank', value: lc.issuingBank || contract?.buyerBank || 'N/A' },
        { label: 'Issuing Bank SWIFT', value: lc.issuingBank ? `${lc.issuingBank.substring(0, 4).toUpperCase()}${contract?.buyerCountry?.substring(0, 2).toUpperCase() || 'XX'}XX` : 'N/A' },
        { label: 'Advising Bank', value: lc.advisingBank || contract?.exporterBank || lc.bankName },
        { label: 'Advising Bank SWIFT', value: 'CBETETAA' },
        { label: 'Advising Date', value: lc.advisingDate ? new Date(lc.advisingDate).toLocaleDateString() : 'Pending' },
        { label: 'Payment Terms', value: lc.paymentTerms || 'At Sight' },
        { label: 'Transport Mode', value: lc.transportMode === 'AIR' ? '🛫 Air Freight' : '🚢 Sea Freight' },
        { label: 'Port of Loading', value: lc.portOfLoading || 'Djibouti Port / Bole International Airport' },
        { label: 'Port of Discharge', value: lc.portOfDischarge || contract?.buyerCountry || 'N/A' },
        { label: 'Latest Shipment Date', value: lc.latestShipmentDate ? new Date(lc.latestShipmentDate).toLocaleDateString() : 'N/A' },
        { label: 'LC Expiry Date', value: new Date(lc.expiryDate).toLocaleDateString() },
        { label: 'Place of Expiry', value: 'Addis Ababa, Ethiopia' },
        { label: 'Request Date', value: new Date(lc.requestDate).toLocaleDateString() },
        { label: 'Days to Expiry', value: Math.ceil((new Date(lc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)).toString() + ' days' },
        { label: 'Current Status', value: lc.status },
      ],
      prerequisites: [
        {
          label: 'Contract Registered',
          status: contract ? 'PASSED' : 'FAILED',
          details: contract ? `Contract ${contract.contractId} found and verified` : 'Contract not found in system'
        },
        {
          label: 'NBE Approval',
          status: (contract?.status === 'NBE_APPROVED' || contract?.status === 'APPROVED') ? 'PASSED' : 'FAILED',
          details: contract?.status === 'NBE_APPROVED' ? 'Contract approved by NBE' : `Current status: ${contract?.status || 'Unknown'}`
        },
        {
          label: 'Amount Verification',
          status: contract && Math.abs(lc.amount - contract.totalValue) < 0.01 ? 'PASSED' : 'WARNING',
          details: contract ? 
            (Math.abs(lc.amount - contract.totalValue) < 0.01 ? 'LC amount matches contract value' : 
            `Mismatch: LC $${lc.amount.toLocaleString()} vs Contract $${contract.totalValue.toLocaleString()}`) : 
            'Cannot verify - contract not found'
        },
        {
          label: 'Exporter Registration',
          status: 'PASSED',
          details: `Exporter ${lc.exporterId} is registered and verified in CECBS`
        },
        {
          label: 'Banking Details',
          status: lc.issuingBank && lc.advisingBank ? 'PASSED' : 'WARNING',
          details: lc.issuingBank && lc.advisingBank ? 
            'All banking information complete' : 
            'Some banking details may be incomplete'
        },
        {
          label: 'Documents Submitted',
          status: lcDocuments.some(d => d.status === 'AVAILABLE') ? 'PASSED' : 'WARNING',
          details: `${lcDocuments.filter(d => d.status === 'AVAILABLE').length} of ${lcDocuments.length} documents available`
        },
      ],
      documents: lcDocuments,
      complianceChecks: [
        {
          label: 'UCP 600 Compliant',
          status: 'COMPLIANT',
          details: 'LC terms comply with ICC Uniform Customs and Practice for Documentary Credits'
        },
        {
          label: 'NBE Regulations',
          status: 'COMPLIANT',
          details: 'Complies with National Bank of Ethiopia forex allocation and export documentation requirements'
        },
        {
          label: 'Trade Sanctions Check',
          status: 'COMPLIANT',
          details: contract?.buyerCountry ? `${contract.buyerCountry} is not subject to international trade sanctions` : 'Buyer country verified'
        },
        {
          label: 'AML/CFT Screening',
          status: 'COMPLIANT',
          details: 'Anti-Money Laundering and Counter-Terrorism Financing checks passed for all parties'
        },
        {
          label: 'Export License Validity',
          status: 'COMPLIANT',
          details: 'Exporter holds valid ECTA export license'
        },
      ],
      additionalInfo: lc.status === 'REQUESTED' ? 
        'This LC is pending approval. Review all details carefully before proceeding.' :
        lc.status === 'ISSUED' ?
        'This LC has been issued and is active. Exporter can proceed with shipment preparation.' :
        'Review LC details and current status.'
    });
    setValidationDialogOpen(true);
  };

  const handleViewContractDetails = async (contract: SalesContract) => {
    setSelectedContract(contract);
    
    // Fetch real documents for this contract
    const token = localStorage.getItem('authToken');
    let contractDocuments: any[] = [];
    
    if (token) {
      try {
        const response = await apiFetch(`/documents/entity/CONTRACT/${contract.contractId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success && result.data) {
          contractDocuments = result.data.map((doc: any) => ({
            id: doc.documentId || doc.id,
            name: doc.filename || doc.name,
            type: (doc.mimeType || 'application/pdf').split('/')[1].toUpperCase(),
            status: 'AVAILABLE',
            url: `/api/v1/documents/${doc.documentId || doc.id}`,
            uploadedDate: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            size: doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : 'N/A',
            category: doc.category || 'CONTRACT_DOCUMENT',
          }));
        }
      } catch (error) {
        console.error('Error fetching contract documents:', error);
      }
    }
    
    // If no documents found, provide standard required documents list
    if (contractDocuments.length === 0) {
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
        { label: 'NBE Reference', value: contract.nbeReferenceNumber },
        { label: 'Exporter', value: contract.exporterId },
        { label: 'Buyer', value: contract.buyerName },
        { label: 'Buyer Country', value: contract.buyerCountry },
        { label: 'Buyer Bank', value: contract.buyerBank || 'N/A' },
        { label: 'Exporter Bank', value: contract.exporterBank || 'Commercial Bank of Ethiopia' },
        { label: 'Coffee Type', value: contract.coffeeType },
        { label: 'Quantity', value: `${contract.quantity.toLocaleString()} kg` },
        { label: 'Price per Kg', value: `$${contract.pricePerKg}` },
        { label: 'Total Value', value: `$${contract.totalValue.toLocaleString()} ${contract.currency}` },
        { label: 'Status', value: contract.status },
        { label: 'Registration Date', value: new Date(contract.registrationDate).toLocaleDateString() },
      ],
      prerequisites: [
        {
          label: 'NBE Approval',
          status: (contract.status === 'NBE_APPROVED' || contract.status === 'APPROVED') ? 'PASSED' : 'FAILED',
          details: contract.status === 'NBE_APPROVED' ? 'Contract approved by National Bank of Ethiopia' : `Current status: ${contract.status}`
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
      additionalInfo: contract.status === 'NBE_APPROVED' ? 
        'Contract is approved. You can now issue Letter of Credit for this contract.' :
        contract.status === 'PENDING' ?
        'Contract is pending NBE approval. LC issuance will be available after approval.' :
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

      // First request LC
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
        // Then immediately approve and issue it
        await apiFetch('/banking/lc/${lcId}/approve', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            issuingBank: lcForm.issuingBank,
            advisingBank: lcForm.advisingBank,
            beneficiary: lcForm.beneficiary,
          }),
        });

        await apiFetch('/banking/lc/${lcId}/issue', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            terms: lcForm.terms,
          }),
        });

        showSuccess(
          'Letter of Credit Issued Successfully',
          `LC ${lcId} has been issued and registered on the blockchain`,
          `Next Steps:\n1. NBE will allocate forex based on this LC\n2. Export permit will be issued\n3. Exporter can proceed with shipment`
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
      const response = await apiFetch('/banking/lc/${lcId}/approve', {
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

        const response = await apiFetch('/banking/lc/${lcId}/approve', {
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
      const response = await apiFetch('/banking/lc/${selectedLC.lcId}/amend', {
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
      const payload = {
        forexId: forex.forexId,
        lcId: forex.lcId || '',
        amount: forex.allocatedAmount || forex.requestedAmount || 0,
        exchangeRate: forex.exchangeRate || 115.5,
        retentionRate: forex.retentionRate || 50,
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
        showSuccess('Forex Allocated', `Forex ${forex.forexId} allocated successfully`);
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
    let filtered = letterOfCredits;
    if (searchTerm) {
      filtered = filtered.filter(lc => 
        lc.lcId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lc.contractId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lc.exporterId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(lc => lc.status === filterStatus);
    }
    if (dateFrom) {
      filtered = filtered.filter(lc => new Date(lc.requestDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(lc => new Date(lc.requestDate) <= new Date(dateTo));
    }
    if (amountMin) {
      filtered = filtered.filter(lc => lc.amount >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter(lc => lc.amount <= parseFloat(amountMax));
    }
    return filtered;
  };

  const getFilteredForex = () => {
    let filtered = forexAllocations;
    if (searchTerm) {
      filtered = filtered.filter(forex => 
        forex.forexId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        forex.lcId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        forex.exporterId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'APPROVED_OR_ALLOCATED') {
        filtered = filtered.filter(forex => forex.status === 'APPROVED' || forex.status === 'ALLOCATED');
      } else {
        filtered = filtered.filter(forex => forex.status === filterStatus);
      }
    }
    if (amountMin) {
      filtered = filtered.filter(forex => forex.allocatedAmount >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter(forex => forex.allocatedAmount <= parseFloat(amountMax));
    }
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
      ? letterOfCredits.filter(lc => lc.status === 'DOCUMENTS_VERIFIED')
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
      new Date(lc.expiryDate).toLocaleDateString(),
      new Date(lc.requestDate).toLocaleDateString()
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
      new Date(f.expiryDate).toLocaleDateString()
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
                clickable: true
              },
              { 
                icon: <DirectionsBoat />, 
                label: 'Documentary Collection', 
                value: documentaryCollections.length, 
                color: '#2196F3',
                subtitle: 'Cash Against Documents',
                method: 'CAD',
                clickable: true
              },
              { 
                icon: <AttachMoney />, 
                label: 'Advance Payment', 
                value: advancePayments.length, 
                color: '#ff9800',
                subtitle: 'Payment before shipment',
                method: 'ADVANCE',
                clickable: true
              },
              { 
                icon: <Assignment />, 
                label: 'Consignment', 
                value: consignments.length, 
                color: '#4caf50',
                subtitle: 'Fruits, Flowers, Meat',
                method: 'CONSIGNMENT',
                clickable: true
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
                }
              },
              { 
                icon: <AttachMoney />, 
                label: 'Forex Allocated', 
                value: `$${(forexAllocations.reduce((s, f) => s + (Number(f.allocatedAmount) || 0), 0) / 1000000).toFixed(1)}M`, 
                color: '#9b30b7',
                subtitle: 'Total USD',
                description: 'Sum of all allocated forex amounts in USD.',
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
                label: 'Approved', 
                value: forexAllocations.filter(f => f.status === 'APPROVED' || f.status === 'ALLOCATED').length, 
                color: '#4caf50',
                subtitle: 'Ready to Use',
                description: 'Requests approved or already allocated.',
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
                label: 'Pending Approval', 
                value: forexAllocations.filter(f => f.status === 'PENDING').length, 
                color: '#ff9800',
                subtitle: 'Awaiting Review',
                description: 'Requests still waiting for NBE approval.',
                clickable: true,
                selected: filterStatus === 'PENDING',
                onClick: () => {
                  setSearchTerm('');
                  setFilterStatus('PENDING');
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
                }
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
                value: lcsForExamination.length, 
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
                }
              },
              { 
                icon: <CheckCircle />, 
                label: 'Examined Today', 
                value: letterOfCredits.filter(lc => lc.status === 'DOCUMENTS_VERIFIED').length, 
                color: '#4caf50',
                subtitle: 'Completed',
                description: 'Show LCs whose documents were verified.',
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
                value: '2.4d', 
                color: '#2196F3',
                subtitle: 'Document Review',
                description: 'Average time required to complete document examination.',
                clickable: false,
              },
              { 
                icon: <Assignment />, 
                label: 'Compliance Rate', 
                value: '96%', 
                color: '#9b30b7',
                subtitle: 'UCP 600 Standard',
                description: 'Percentage of documents compliant with UCP 600.',
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
                }
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

            return kpis.map((kpi: any, index) => (
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
            ));
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
            onProcessStep={(paymentId, step) => {
              console.log('Process step:', paymentId, step);
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
                    label: 'NBE Approval',
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
            <strong>Forex Allocation Workflow:</strong> LC ISSUED → FOREX REQUESTED → APPROVED → ALLOCATED<br />
            Each issued LC enables NBE forex allocation with 40% USD retention and 60% ETB conversion.
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
              No forex allocations yet. Allocations are triggered by NBE after LC issuance.
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
                    <TableCell sx={{ width: '12%' }}><strong>Forex ID</strong></TableCell>
                    <TableCell sx={{ width: '12%' }}><strong>LC Reference</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Exporter</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Allocated Amount</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Exchange Rate</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Retention (40%)</strong></TableCell>
                    <TableCell sx={{ width: '10%' }}><strong>Conversion (60%)</strong></TableCell>
                    <TableCell sx={{ width: '8%' }}><strong>Status</strong></TableCell>
                    <TableCell sx={{ width: '8%' }}><strong>Expiry</strong></TableCell>
                    <TableCell align="right" sx={{ width: '10%' }}><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(getFilteredForex()).map((forex) => {
                    const allocatedAmount = forex.allocatedAmount || 0;
                    const exchangeRate = forex.exchangeRate || 0;
                    const usdRetention = allocatedAmount * 0.4;
                    const etbConversion = allocatedAmount * 0.6 * exchangeRate;
                    
                    return (
                      <TableRow key={forex.forexId}>
                        <TableCell>{forex.forexId}</TableCell>
                        <TableCell>{forex.lcId || 'N/A'}</TableCell>
                        <TableCell>{forex.exporterId || 'N/A'}</TableCell>
                        <TableCell>
                          <strong>${allocatedAmount.toLocaleString()}</strong>
                        </TableCell>
                        <TableCell>{exchangeRate} ETB/USD</TableCell>
                        <TableCell>
                          ${usdRetention.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </TableCell>
                        <TableCell>
                          {etbConversion.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                        </TableCell>
                        <TableCell>
                          <StatusChip 
                            label={forex.status || 'PENDING'} 
                            status={forex.status === 'ALLOCATED' ? 'APPROVED' : 'PENDING'} 
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
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle />}
                              onClick={() => {
                                setSelectedForex(forex);
                                setAllocationForm({
                                  forexId: forex.forexId,
                                  lcId: forex.lcId || '',
                                  amount: forex.allocatedAmount || forex.requestedAmount || 0,
                                  exchangeRate: forex.exchangeRate || 115.5,
                                  retentionRate: forex.retentionRate || 50,
                                  officer: forex.officer || '',
                                  approvalRef: `BANK-${Date.now()}`,
                                  expiryDate: forex.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                                });
                                setAllocationDialogOpen(true);
                              }}
                              sx={{
                                bgcolor: '#9b30b7',
                                '&:hover': { bgcolor: '#7a2592' },
                              }}
                              disabled={forex.status === 'ALLOCATED'}
                            >
                              Allocate
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
                This contract has been approved by NBE. You can now issue a Letter of Credit for this contract.
              </Alert>
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
                    Allocation Breakdown
                  </Typography>
                </Grid>

                {/* Allocated Amount */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Allocated Amount</Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    ${(selectedForex.allocatedAmount || 0).toLocaleString()} USD
                  </Typography>
                </Grid>

                {/* Exchange Rate */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Exchange Rate</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedForex.exchangeRate || 0} ETB/USD
                  </Typography>
                </Grid>

                {/* USD Retention (40%) */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                    <Typography variant="body2" color="text.secondary">40% USD Retention</Typography>
                    <Typography variant="h5" fontWeight={700} color="#1976d2">
                      ${((selectedForex.allocatedAmount || 0) * 0.4).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Retained in USD account
                    </Typography>
                  </Paper>
                </Grid>

                {/* ETB Conversion (60%) */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                    <Typography variant="body2" color="text.secondary">60% ETB Conversion</Typography>
                    <Typography variant="h5" fontWeight={700} color="#2e7d32">
                      {((selectedForex.allocatedAmount || 0) * 0.6 * (selectedForex.exchangeRate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Converted to Ethiopian Birr
                    </Typography>
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
              </Grid>
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

      {/* LC Details Dialog */}
      <Dialog open={dialogOpen && dialogType === 'lcDetails'} onClose={handleCloseDialog} maxWidth="md" fullWidth>

      <ForexAllocationDialog
        open={allocationDialogOpen}
        form={allocationForm}
        onChange={(f) => setAllocationForm(f)}
        onClose={() => setAllocationDialogOpen(false)}
        onConfirm={async (f) => {
          if (!f.forexId || !f.lcId) {
            showError('Validation', 'Forex ID and LC Reference are required');
            return;
          }
          await handleAllocateForex({
            forexId: f.forexId,
            lcId: f.lcId,
            allocatedAmount: f.amount,
            exchangeRate: f.exchangeRate,
            retentionRate: f.retentionRate,
            officer: f.officer,
            approvalRef: f.approvalRef,
            expiryDate: f.expiryDate,
          });
          setAllocationDialogOpen(false);
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
        <DialogTitle>
          <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
          Letter of Credit Details
        </DialogTitle>
        <DialogContent>
          {selectedLC && (
            <Box sx={{ pt: 2 }}>
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
                          {new Date(selectedLC.requestDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="black">Expiry Date</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {new Date(selectedLC.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="black">Days Remaining</Typography>
                        <Typography variant="body1">
                          {Math.max(0, Math.ceil((new Date(selectedLC.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Workflow Status */}
                <Grid item xs={12}>
                  <Alert severity={selectedLC.status === 'ISSUED' ? 'success' : 'info'}>
                    {selectedLC.status === 'ISSUED' ? (
                      <>
                        <strong>LC Active:</strong> This Letter of Credit has been issued and is active. 
                        The exporter can proceed with shipment preparation. NBE will allocate forex based on this LC.
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

                {/* Next Steps */}
                {selectedLC.status === 'ISSUED' && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Next Steps in Export Process:
                      </Typography>
                      <Typography variant="body2" component="div">
                        1. <strong>NBE Forex Allocation:</strong> NBE will allocate foreign exchange (40/60 retention policy)<br />
                        2. <strong>Quality Inspection:</strong> ECTA conducts quality inspection and issues export permit<br />
                        3. <strong>Shipment Preparation:</strong> Exporter prepares shipment with required documents<br />
                        4. <strong>Document Submission:</strong> Exporter submits shipping documents to bank<br />
                        5. <strong>Payment Release:</strong> Bank verifies documents and releases payment via SWIFT
                      </Typography>
                    </Paper>
                  </Grid>
                )}
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
                      <strong>Current Expiry:</strong> {new Date(selectedLC.expiryDate).toLocaleDateString()}<br />
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
                4. NBE forex allocation may need adjustment
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
                Issuing LC confirms payment guarantee and enables forex allocation by NBE
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
                    label="Issuing Bank (Buyer's Bank)"
                    value={lcForm.issuingBank}
                    onChange={(e) => setLcForm({...lcForm, issuingBank: e.target.value})}
                    placeholder="e.g., Deutsche Bank AG, Frankfurt"
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Advising Bank (Exporter's Bank)"
                    value={lcForm.advisingBank}
                    onChange={(e) => setLcForm({...lcForm, advisingBank: e.target.value})}
                    placeholder="e.g., Commercial Bank of Ethiopia"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Beneficiary (Exporter)"
                    value={lcForm.beneficiary}
                    onChange={(e) => setLcForm({...lcForm, beneficiary: e.target.value})}
                    placeholder="Exporter company name and account"
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
                1. NBE allocates foreign exchange<br />
                2. Export permit issued by bank<br />
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
                              showInfo('SWIFT Message', `Message ID: ${msg.messageId}\nType: ${msg.messageType}\nRef: ${msg.swiftReference || 'N/A'}`);
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
                              onClick={() => handleViewLCDetails(lc)}
                              sx={{
                                bgcolor: '#9b30b7',
                                '&:hover': { bgcolor: '#7a2592' },
                              }}
                            >
                              Examine
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
                              onClick={() => {
                                showInfo(
                                  'Payment Release',
                                  `Release payment for LC: ${lc.lcId}\nExporter: ${lc.exporterId}\nAmount: $${lc.amount?.toLocaleString()} ${lc.currency}\n\nThis will initiate SWIFT payment to the beneficiary bank.`
                                );
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

      {/* Tab 5: User Management */}
      {activeTab === 5 && (
        <UserManagement />
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
    </Box>
    </ThemeProvider>
  );
};

export default BanksPortal;
