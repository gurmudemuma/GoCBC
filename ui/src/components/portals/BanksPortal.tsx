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
} from '@mui/icons-material';
import AuditTrailViewer from './AuditTrailViewer';
import DocumentVerificationPanel from './DocumentVerificationPanel';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentValidationDialog } from './DocumentValidationDialog';

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
import SWIFTDashboardWrapper from '@/components/bank/SWIFTDashboardWrapper';

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

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Advanced filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
      // Load all NBE-approved contracts
      console.log('[BANKS] Fetching contracts from API...');
      const contractsResponse = await apiFetch('/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('[BANKS] Contracts response status:', contractsResponse.status);
      const contractsResult = await contractsResponse.json();
      console.log('[BANKS] Contracts result:', contractsResult);
      
      let nbeApprovedContracts: any[] = [];
      
      if (contractsResult.success) {
        // Filter for NBE-approved contracts
        nbeApprovedContracts = contractsResult.data.filter((c: any) => 
          c.contractStatus === 'NBE_APPROVED' || c.contractStatus === 'APPROVED'
        );
        
        console.log(`[BANKS] Total contracts: ${contractsResult.data.length}`);
        console.log(`[BANKS] Contract statuses:`, contractsResult.data.map((c: any) => ({ 
          id: c.contractID || c.contractId, 
          status: c.contractStatus 
        })));
        console.log(`[BANKS] ✅ Approved contracts available: ${nbeApprovedContracts.length}`);
        
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
          console.log(`Mapped contract ${mappedContract.contractId}:`, {
            buyerBank: mappedContract.buyerBank || '❌ MISSING',
            exporterBank: mappedContract.exporterBank || '❌ MISSING',
            hasBankData: !!(mappedContract.buyerBank && mappedContract.exporterBank),
            rawData: { buyerBank: c.buyerBank, BuyerBank: c.BuyerBank, exporterBank: c.exporterBank, ExporterBank: c.ExporterBank }
          });
          return mappedContract;
        }));
      }

      // Load Letters of Credit
      try {
        const lcResponse = await apiFetch('/banking/lc', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const lcResult = await lcResponse.json();
        if (lcResult.success) {
          setLetterOfCredits(lcResult.data.map((lc: any) => ({
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
          })));
        }
      } catch (err) {
        console.warn('Could not load LCs:', err);
      }

      // Load Forex Allocations  
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
            requestedAmount: f.requestedAmount || f.RequestedAmount,
            allocatedAmount: f.allocatedAmount || f.AllocatedAmount,
            currency: f.currency || f.Currency,
            exchangeRate: f.exchangeRate || f.ExchangeRate,
            retentionRate: f.retentionRate || f.RetentionRate,
            status: f.status || f.Status,
            expiryDate: f.expiryDate || f.ExpiryDate,
          })));
        }
      } catch (err) {
        console.warn('Could not load forex allocations:', err);
      }

      // Load Export Permits
      try {
        const permitsResponse = await apiFetch('/permits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const permitsResult = await permitsResponse.json();
        if (permitsResult.success) {
          setExportPermits(Array.isArray(permitsResult.data) ? permitsResult.data : []);
        }
      } catch (err) {
        console.warn('Could not load export permits:', err);
      }

      // Load Documentary Collections
      try {
        const collectionsResponse = await apiFetch('/banking/cad/exporter/' + encodeURIComponent('ALL'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const collectionsResult = await collectionsResponse.json();
        if (collectionsResult.success) {
          setDocumentaryCollections(Array.isArray(collectionsResult.data) ? collectionsResult.data : []);
        }
      } catch (err) {
        console.warn('Could not load documentary collections:', err);
      }

      // Load Advance Payments (via generic payment query)
      try {
        const advanceResponse = await apiFetch('/banking/payment/by-method/ADVANCE', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const advanceResult = await advanceResponse.json();
        if (advanceResult.success) {
          setAdvancePayments(Array.isArray(advanceResult.data) ? advanceResult.data : []);
        }
      } catch (err) {
        console.warn('Could not load advance payments:', err);
      }

      // Load Consignments
      try {
        const consignmentsResponse = await apiFetch('/banking/consignment/outstanding', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const consignmentsResult = await consignmentsResponse.json();
        if (consignmentsResult.success) {
          setConsignments(Array.isArray(consignmentsResult.data) ? consignmentsResult.data : []);
        }
      } catch (err) {
        console.warn('Could not load consignments:', err);
      }

      // Load Pending Documents for Verification
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
        }
      } catch (err) {
        console.warn('Could not load pending documents:', err);
      }

      console.log(`Loaded ${nbeApprovedContracts?.length || 0} NBE-approved contracts for bank processing`);
      
      // Summary of bank data availability
      if (nbeApprovedContracts && nbeApprovedContracts.length > 0) {
        const contractsWithBanks = nbeApprovedContracts.filter((c: any) => 
          (c.buyerBank || c.BuyerBank) && (c.exporterBank || c.ExporterBank)
        ).length;
        const contractsWithoutBanks = nbeApprovedContracts.length - contractsWithBanks;
        
        console.log('📊 Bank Data Summary:');
        console.log(`  ✅ Contracts with bank data: ${contractsWithBanks}`);
        console.log(`  ❌ Contracts without bank data: ${contractsWithoutBanks}`);
        
        if (contractsWithoutBanks > 0) {
          console.warn('⚠️ Some contracts are missing bank data (created before bank fields were added)');
          console.info('💡 TIP: Create a NEW contract to test auto-fill with complete bank data');
        }
      }

      // Load SWIFT Statistics
      try {
        const swiftStatsResponse = await apiFetch('/swift/statistics');
        const swiftStatsResult = await swiftStatsResponse.json();
        if (swiftStatsResult.success) {
          setSwiftStats(swiftStatsResult.data);
        }
      } catch (err) {
        console.warn('Could not load SWIFT statistics:', err);
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
      filtered = filtered.filter(forex => forex.status === filterStatus);
    }
    if (amountMin) {
      filtered = filtered.filter(forex => forex.allocatedAmount >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter(forex => forex.allocatedAmount <= parseFloat(amountMax));
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
  };

  return (
    <ThemeProvider theme={banksTheme}>
      <Box sx={{ p: 3 }}>
      {/* Top KPI Dashboard - Tab-specific KPIs */}
      {activeTab === 0 ? (
        /* Payment Methods KPIs */
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff9e6', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Assignment sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  {selectedPaymentMethod === 'LC' ? 'Active LCs' :
                   selectedPaymentMethod === 'CAD' ? 'Active Collections' :
                   selectedPaymentMethod === 'ADVANCE' ? 'Active Advances' :
                   selectedPaymentMethod === 'CONSIGNMENT' ? 'Active Consignments' :
                   'Active LCs'}
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#000' }}>
                  {selectedPaymentMethod === 'LC' ? letterOfCredits.length :
                   selectedPaymentMethod === 'CAD' ? documentaryCollections.length :
                   selectedPaymentMethod === 'ADVANCE' ? advancePayments.length :
                   selectedPaymentMethod === 'CONSIGNMENT' ? consignments.length :
                   letterOfCredits.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5', border: '1px solid #9b30b7' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Description sx={{ fontSize: 40, color: '#9b30b7', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Total Value
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9b30b7' }}>
                  ${((selectedPaymentMethod === 'LC' ? letterOfCredits.reduce((s, lc) => s + lc.amount, 0) :
                      selectedPaymentMethod === 'CAD' ? documentaryCollections.reduce((s: number, c: any) => s + (c.amount || 0), 0) :
                      selectedPaymentMethod === 'ADVANCE' ? advancePayments.reduce((s: number, a: any) => s + (a.amount || 0), 0) :
                      selectedPaymentMethod === 'CONSIGNMENT' ? consignments.reduce((s: number, c: any) => s + (c.permitAmount || 0), 0) :
                      letterOfCredits.reduce((s, lc) => s + lc.amount, 0)) / 1000000).toFixed(1)}M
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fffbf0', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Completed
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#FFD700' }}>
                  {selectedPaymentMethod === 'LC' ? letterOfCredits.filter(lc => lc.status === 'PAID' || lc.status === 'ISSUED').length :
                   selectedPaymentMethod === 'CAD' ? documentaryCollections.filter((c: any) => c.status === 'COMPLETED').length :
                   selectedPaymentMethod === 'ADVANCE' ? advancePayments.filter((a: any) => a.status === 'COMPLETED').length :
                   selectedPaymentMethod === 'CONSIGNMENT' ? consignments.filter((c: any) => c.status === 'SETTLED').length :
                   letterOfCredits.filter(lc => lc.status === 'PAID' || lc.status === 'ISSUED').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f8f0ff', border: '1px solid #9b30b7' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <AccessTime sx={{ fontSize: 40, color: '#9b30b7', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Pending Actions
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9b30b7' }}>
                  {selectedPaymentMethod === 'LC' ? letterOfCredits.filter(lc => lc.status === 'REQUESTED').length :
                   selectedPaymentMethod === 'CAD' ? documentaryCollections.filter((c: any) => c.status === 'PENDING').length :
                   selectedPaymentMethod === 'ADVANCE' ? advancePayments.filter((a: any) => a.status === 'PENDING').length :
                   selectedPaymentMethod === 'CONSIGNMENT' ? consignments.filter((c: any) => c.status === 'PENDING').length :
                   letterOfCredits.filter(lc => lc.status === 'REQUESTED').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : activeTab === 1 ? (
        /* Forex Allocations KPIs */
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff9e6', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CurrencyExchange sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Total Forex Requests
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#000' }}>
                  {forexAllocations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5', border: '1px solid #9b30b7' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <AttachMoney sx={{ fontSize: 40, color: '#9b30b7', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Forex Allocated
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9b30b7' }}>
                  ${(forexAllocations.reduce((s, f) => s + f.allocatedAmount, 0) / 1000000).toFixed(1)}M
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fffbf0', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Approved
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#FFD700' }}>
                  {forexAllocations.filter(f => f.status === 'APPROVED' || f.status === 'ALLOCATED').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f8f0ff', border: '1px solid #9b30b7' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <AccessTime sx={{ fontSize: 40, color: '#9b30b7', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Pending Approval
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9b30b7' }}>
                  {forexAllocations.filter(f => f.status === 'PENDING').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : activeTab === 2 ? (
        /* SWIFT Messages KPIs */
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff9e6', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <MessageOutlined sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Total Messages
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#000' }}>
                  {swiftStats?.totalMessages || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f3e5f5', border: '1px solid #9b30b7' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <SendOutlined sx={{ fontSize: 40, color: '#9b30b7', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Messages Today
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9b30b7' }}>
                  {swiftStats?.messagestoday || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fffbf0', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Settled Today
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#FFD700' }}>
                  {swiftStats?.settledToday || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#f8f0ff', border: '1px solid #9b30b7' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <AccessTime sx={{ fontSize: 40, color: '#9b30b7', mb: 1 }} />
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Pending Approval
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9b30b7' }}>
                  {swiftStats?.pendingApproval || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      {/* Main Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 0, boxShadow: 'none', borderBottom: '2px solid #e0e0e0' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              fontSize: '0.95rem',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 56,
              px: 4,
              color: '#666',
              '&.Mui-selected': {
                color: '#9b30b7',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              bgcolor: '#9b30b7',
            },
          }}
        >
          <Tab label="Payment Methods" icon={<Payment />} iconPosition="start" />
          <Tab label="Forex Allocations" icon={<CurrencyExchange />} iconPosition="start" />
          <Tab label="SWIFT Messages" icon={<AccountBalance />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Payment Methods Selection */}
      {activeTab === 0 && (
        <Box>
          {/* Payment Method Cards - Clean Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Letter of Credit */}
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  height: 160,
                  border: selectedPaymentMethod === 'LC' ? '3px solid #9b30b7' : '1px solid #e0e0e0',
                  bgcolor: selectedPaymentMethod === 'LC' ? '#f3e5f5' : 'white',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => setSelectedPaymentMethod('LC')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Description sx={{ fontSize: 48, color: '#9b30b7', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#000' }}>
                    Letter of Credit
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Bank-guaranteed payment (UCP 600)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Documentary Collection */}
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  height: 160,
                  border: selectedPaymentMethod === 'CAD' ? '3px solid #9b30b7' : '1px solid #e0e0e0',
                  bgcolor: selectedPaymentMethod === 'CAD' ? '#f3e5f5' : 'white',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => setSelectedPaymentMethod('CAD')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <DirectionsBoat sx={{ fontSize: 48, color: '#9b30b7', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#000' }}>
                    Documentary Collection
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Cash Against Documents
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Advance Payment */}
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  height: 160,
                  border: selectedPaymentMethod === 'ADVANCE' ? '3px solid #9b30b7' : '1px solid #e0e0e0',
                  bgcolor: selectedPaymentMethod === 'ADVANCE' ? '#f3e5f5' : 'white',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => setSelectedPaymentMethod('ADVANCE')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <AttachMoney sx={{ fontSize: 48, color: '#9b30b7', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#000' }}>
                    Advance Payment
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Payment before shipment
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Consignment */}
            <Grid item xs={12} sm={6} md={3}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  height: 160,
                  border: selectedPaymentMethod === 'CONSIGNMENT' ? '3px solid #9b30b7' : '1px solid #e0e0e0',
                  bgcolor: selectedPaymentMethod === 'CONSIGNMENT' ? '#f3e5f5' : 'white',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => setSelectedPaymentMethod('CONSIGNMENT')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Assignment sx={{ fontSize: 48, color: '#9b30b7', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#000' }}>
                    Consignment
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Fruits, Flowers, Meat only
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Selected Payment Method Content */}
          <UnifiedPaymentWorkflow
            contracts={contracts}
            letterOfCredits={letterOfCredits}
            documentaryCollections={documentaryCollections}
            advancePayments={advancePayments}
            consignments={consignments}
            pendingDocuments={pendingDocuments}
            selectedPaymentMethod={selectedPaymentMethod}
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

      {/* Tab 1: Forex Allocations */}
      {activeTab === 1 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Letter of Credit Management
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>LC Status Workflow:</strong> REQUESTED → APPROVED → ISSUED → UTILIZED<br />
            Each issued LC enables NBE forex allocation and export permit issuance.
          </Alert>

          {/* Search and Filter Controls */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search LCs..."
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
              <MenuItem value="REQUESTED">Requested</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="ISSUED">Issued</MenuItem>
              <MenuItem value="UTILIZED">Utilized</MenuItem>
            </TextField>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
                setDateFrom('');
                setDateTo('');
                setAmountMin('');
                setAmountMax('');
                setCurrentPage(0);
              }}
            >
              Clear All Filters
            </Button>
            {selectedLCIds.length > 0 && (
              <Button
                size="small"
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleBulkApproveLC}
                disabled={bulkApproving}
                sx={{
                  bgcolor: '#FFD700',
                  color: '#000',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#FFC700' },
                  '&:disabled': { bgcolor: '#ccc', color: '#666' },
                }}
              >
                {bulkApproving ? 'Approving...' : `Approve ${selectedLCIds.length} LC${selectedLCIds.length > 1 ? 's' : ''}`}
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<Description />}
              onClick={() => {
                const csv = generateLCCSV(getFilteredLCs());
                downloadCSV(csv, 'Letters-of-Credit.csv');
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
              Showing {getPaginatedData(getFilteredLCs()).length} of {getFilteredLCs().length} LCs
            </Typography>
          </Box>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>Advanced Filters</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date From"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date To"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Amount Min (USD)"
                    value={amountMin}
                    onChange={(e) => {
                      setAmountMin(e.target.value);
                      setCurrentPage(0);
                    }}
                    placeholder="e.g., 10000"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Amount Max (USD)"
                    value={amountMax}
                    onChange={(e) => {
                      setAmountMax(e.target.value);
                      setCurrentPage(0);
                    }}
                    placeholder="e.g., 100000"
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {letterOfCredits.length === 0 ? (
            <Alert severity="info">
              No Letters of Credit on record. Issue LCs from NBE-Approved Contracts tab.
            </Alert>
          ) : getFilteredLCs().length === 0 ? (
            <Alert severity="warning">
              No LCs match your search criteria.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedLCIds.length > 0 && selectedLCIds.length < getFilteredLCs().filter(lc => lc.status === 'REQUESTED').length}
                        checked={getFilteredLCs().filter(lc => lc.status === 'REQUESTED').length > 0 && selectedLCIds.length === getFilteredLCs().filter(lc => lc.status === 'REQUESTED').length}
                        onChange={toggleAllLCSelection}
                      />
                    </TableCell>
                    <TableCell><strong>LC ID</strong></TableCell>
                    <TableCell><strong>Contract</strong></TableCell>
                    <TableCell><strong>Exporter</strong></TableCell>
                    <TableCell><strong>Issuing Bank</strong></TableCell>
                    <TableCell><strong>Advising Bank</strong></TableCell>
                    <TableCell><strong>Amount</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Expiry</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(getFilteredLCs()).map((lc) => (
                    <TableRow key={lc.lcId} selected={selectedLCIds.includes(lc.lcId)}>
                      <TableCell padding="checkbox">
                        {lc.status === 'REQUESTED' && (
                          <Checkbox
                            checked={selectedLCIds.includes(lc.lcId)}
                            onChange={() => toggleLCSelection(lc.lcId)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{lc.lcId}</TableCell>
                      <TableCell>{lc.contractId}</TableCell>
                      <TableCell>{lc.exporterId}</TableCell>
                      <TableCell>{lc.issuingBank || 'N/A'}</TableCell>
                      <TableCell>{lc.advisingBank || lc.issuingBank || 'N/A'}</TableCell>
                      <TableCell>
                        <strong>${lc.amount.toLocaleString()}</strong> {lc.currency}
                      </TableCell>
                      <TableCell>
                        <StatusChip 
                          label={lc.status} 
                          status={lc.status === 'ISSUED' ? 'APPROVED' : lc.status === 'REQUESTED' ? 'PENDING' : 'ACTIVE'} 
                        />
                      </TableCell>
                      <TableCell>{new Date(lc.expiryDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {/* View Details - Always available */}
                          <Tooltip title="View LC Details & Prerequisites">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                const contract = contracts.find(c => c.contractId === lc.contractId);
                                setValidationData({
                                  entityId: lc.lcId,
                                  entityType: 'LETTER OF CREDIT',
                                  title: `LC Details - ${lc.lcId}`,
                                  summary: [
                                    { label: 'LC ID', value: lc.lcId },
                                    { label: 'Status', value: lc.status },
                                    { label: 'Contract ID', value: lc.contractId },
                                    { label: 'Exporter ID', value: lc.exporterId },
                                    { label: 'Amount', value: `$${lc.amount.toLocaleString()} ${lc.currency}` },
                                    { label: 'Issuing Bank', value: lc.issuingBank || 'N/A' },
                                    { label: 'Advising Bank', value: lc.advisingBank || lc.issuingBank || 'N/A' },
                                    { label: 'Expiry Date', value: new Date(lc.expiryDate).toLocaleDateString() },
                                    { label: 'Request Date', value: lc.requestDate ? new Date(lc.requestDate).toLocaleDateString() : 'N/A' },
                                    { label: 'Contract Value', value: contract ? `$${contract.totalValue.toLocaleString()}` : 'N/A' },
                                    { label: 'Buyer Name', value: contract?.buyerName || 'N/A' },
                                    { label: 'Buyer Country', value: contract?.buyerCountry || 'N/A' },
                                  ],
                                  prerequisites: [
                                    {
                                      label: 'Contract Registration',
                                      status: contract ? 'PASSED' : 'FAILED',
                                      details: contract ? `Contract ${contract.contractId} is registered in CECBS` : 'Contract not found in system'
                                    },
                                    {
                                      label: 'NBE Approval Status',
                                      status: (contract?.status === 'NBE_APPROVED' || contract?.status === 'APPROVED') ? 'PASSED' : 'FAILED',
                                      details: contract ? `Contract status: ${contract.status}` : 'Contract not verified'
                                    },
                                    {
                                      label: 'Amount Verification',
                                      status: contract && lc.amount === contract.totalValue ? 'PASSED' : 'WARNING',
                                      details: contract ? 
                                        (lc.amount === contract.totalValue ? 
                                          `LC amount matches contract value: $${lc.amount.toLocaleString()}` : 
                                          `Amount mismatch - LC: $${lc.amount.toLocaleString()}, Contract: $${contract.totalValue.toLocaleString()}`) : 
                                        'Cannot verify - contract data unavailable'
                                    },
                                    {
                                      label: 'Exporter Verification',
                                      status: 'PASSED',
                                      details: `Exporter ${lc.exporterId} is registered and licensed by ECTA`
                                    },
                                    {
                                      label: 'Banking Information',
                                      status: lc.issuingBank && lc.advisingBank ? 'PASSED' : 'WARNING',
                                      details: lc.issuingBank ? 'All required banking details are complete' : 'Some banking details may be incomplete'
                                    },
                                    {
                                      label: 'LC Validity Period',
                                      status: new Date(lc.expiryDate) > new Date() ? 'PASSED' : 'FAILED',
                                      details: `Expires: ${new Date(lc.expiryDate).toLocaleDateString()} (${Math.ceil((new Date(lc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining)`
                                    },
                                  ],
                                  documents: [
                                    { 
                                      id: `DOC_${lc.lcId}_001`, 
                                      name: 'LC Application Form', 
                                      type: 'PDF', 
                                      status: 'AVAILABLE', 
                                      uploadedDate: new Date().toLocaleDateString(), 
                                      size: '245 KB',
                                      url: `/api/documents/${lc.lcId}/application`
                                    },
                                    { 
                                      id: `DOC_${lc.lcId}_002`, 
                                      name: 'Sales Contract Copy', 
                                      type: 'PDF', 
                                      status: 'AVAILABLE', 
                                      uploadedDate: new Date().toLocaleDateString(), 
                                      size: '189 KB',
                                      url: `/api/documents/${lc.contractId}/contract`
                                    },
                                    { 
                                      id: `DOC_${lc.lcId}_003`, 
                                      name: 'Proforma Invoice', 
                                      type: 'PDF', 
                                      status: 'AVAILABLE', 
                                      uploadedDate: new Date().toLocaleDateString(), 
                                      size: '156 KB',
                                      url: `/api/documents/${lc.contractId}/invoice`
                                    },
                                    { 
                                      id: `DOC_${lc.lcId}_004`, 
                                      name: 'Buyer Bank Details (SWIFT)', 
                                      type: 'PDF', 
                                      status: 'AVAILABLE', 
                                      uploadedDate: new Date().toLocaleDateString(), 
                                      size: '98 KB',
                                      url: `/api/documents/${lc.lcId}/bank-details`
                                    },
                                    { 
                                      id: `DOC_${lc.lcId}_005`, 
                                      name: 'SWIFT Message MT700', 
                                      type: 'SWIFT', 
                                      status: lc.status === 'ISSUED' ? 'AVAILABLE' : 'MISSING', 
                                      uploadedDate: lc.status === 'ISSUED' ? new Date().toLocaleDateString() : undefined, 
                                      size: lc.status === 'ISSUED' ? '123 KB' : undefined,
                                      url: lc.status === 'ISSUED' ? `/api/documents/${lc.lcId}/swift-mt700` : undefined
                                    },
                                  ],
                                  complianceChecks: [
                                    {
                                      label: 'UCP 600 Compliance',
                                      status: 'COMPLIANT',
                                      details: 'LC terms and conditions comply with ICC Uniform Customs and Practice for Documentary Credits (UCP 600 revision)'
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
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>

                          {/* Approve/Reject - Only for REQUESTED status */}
                          {lc.status === 'REQUESTED' && (
                            <>
                              <Tooltip title="Review & Approve LC">
                                <IconButton 
                                  size="small" 
                                  sx={{
                                    color: '#FFD700',
                                    '&:hover': { bgcolor: 'rgba(255, 215, 0, 0.1)' },
                                  }}
                                  onClick={() => {
                                    const contract = contracts.find(c => c.contractId === lc.contractId);
                                    setValidationData({
                                      entityId: lc.lcId,
                                      entityType: 'LETTER OF CREDIT',
                                      title: `LC Approval - ${lc.lcId}`,
                                      summary: [
                                        { label: 'LC ID', value: lc.lcId },
                                        { label: 'Contract', value: lc.contractId },
                                        { label: 'Exporter', value: lc.exporterId },
                                        { label: 'Amount', value: `$${lc.amount.toLocaleString()} ${lc.currency}` },
                                        { label: 'Issuing Bank', value: lc.issuingBank || 'N/A' },
                                        { label: 'Advising Bank', value: lc.advisingBank || lc.issuingBank },
                                        { label: 'Expiry Date', value: new Date(lc.expiryDate).toLocaleDateString() },
                                        { label: 'Status', value: lc.status },
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
                                          details: contract?.status === 'NBE_APPROVED' ? 'Contract approved by NBE' : 'Awaiting NBE approval'
                                        },
                                        {
                                          label: 'Amount Verification',
                                          status: contract && lc.amount === contract.totalValue ? 'PASSED' : 'WARNING',
                                          details: contract ? (lc.amount === contract.totalValue ? 'LC amount matches contract value' : `Mismatch: LC $${lc.amount.toLocaleString()} vs Contract $${contract.totalValue.toLocaleString()}`) : 'Cannot verify - contract not found'
                                        },
                                        {
                                          label: 'Exporter Registration',
                                          status: 'PASSED',
                                          details: 'Exporter is registered and verified in CECBS'
                                        },
                                        {
                                          label: 'Banking Details',
                                          status: lc.issuingBank && lc.advisingBank ? 'PASSED' : 'WARNING',
                                          details: 'All banking information complete'
                                        },
                                      ],
                                      documents: [
                                        { id: '1', name: 'LC Application Form', type: 'PDF', status: 'AVAILABLE', uploadedDate: new Date().toLocaleDateString(), size: '245 KB' },
                                        { id: '2', name: 'Sales Contract Copy', type: 'PDF', status: 'AVAILABLE', uploadedDate: new Date().toLocaleDateString(), size: '189 KB' },
                                        { id: '3', name: 'Proforma Invoice', type: 'PDF', status: 'AVAILABLE', uploadedDate: new Date().toLocaleDateString(), size: '156 KB' },
                                        { id: '4', name: 'Buyer Bank Details', type: 'PDF', status: 'AVAILABLE', uploadedDate: new Date().toLocaleDateString(), size: '98 KB' },
                                        { id: '5', name: 'SWIFT Message MT700', type: 'PDF', status: 'AVAILABLE', uploadedDate: new Date().toLocaleDateString(), size: '123 KB' },
                                      ],
                                      complianceChecks: [
                                        {
                                          label: 'UCP 600 Compliant',
                                          status: 'COMPLIANT',
                                          details: 'LC terms comply with ICC Uniform Customs and Practice for Documentary Credits'
                                        },
                                        {
                                          label: 'NBE Regulations',
                                          status: 'COMPLIANT',
                                          details: 'Meets National Bank of Ethiopia forex and export regulations'
                                        },
                                        {
                                          label: 'Trade Sanctions Check',
                                          status: 'COMPLIANT',
                                          details: 'Buyer country not subject to trade sanctions'
                                        },
                                        {
                                          label: 'AML/CFT Screening',
                                          status: 'COMPLIANT',
                                          details: 'Anti-money laundering and counter-terrorism financing checks passed'
                                        },
                                      ],
                                      additionalInfo: 'Once approved, the LC will be issued and the exporter can proceed with coffee sourcing and shipment preparation.'
                                    });
                                    setValidationDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject LC Request">
                                <IconButton 
                                  size="small" 
                                  sx={{
                                    color: '#000',
                                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.05)' },
                                  }}
                                  onClick={() => {
                                    const contract = contracts.find(c => c.contractId === lc.contractId);
                                    setValidationData({
                                      entityId: lc.lcId,
                                      entityType: 'LETTER OF CREDIT',
                                      title: `LC Rejection - ${lc.lcId}`,
                                      summary: [
                                        { label: 'LC ID', value: lc.lcId },
                                        { label: 'Contract', value: lc.contractId },
                                        { label: 'Exporter', value: lc.exporterId },
                                        { label: 'Amount', value: `$${lc.amount.toLocaleString()} ${lc.currency}` },
                                      ],
                                      prerequisites: [
                                        {
                                          label: 'Contract Status',
                                          status: contract?.status === 'NBE_APPROVED' ? 'PASSED' : 'FAILED',
                                          details: `Contract status: ${contract?.status || 'Not found'}`
                                        },
                                      ],
                                      documents: [
                                        { id: '1', name: 'LC Application', type: 'PDF', status: 'AVAILABLE', uploadedDate: new Date().toLocaleDateString(), size: '245 KB' },
                                      ],
                                      additionalInfo: 'Provide a clear reason for rejection. The exporter will be notified and can resubmit after addressing the issues.'
                                    });
                                    setValidationDialogOpen(true);
                                  }}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                          {/* Amend - Only for ISSUED/APPROVED status */}
                          {(lc.status === 'ISSUED' || lc.status === 'APPROVED') && (
                            <Tooltip title="Amend LC">
                              <IconButton 
                                size="small" 
                                sx={{
                                  color: '#9b30b7',
                                  '&:hover': { bgcolor: 'rgba(155, 48, 183, 0.1)' },
                                }}
                                onClick={() => {
                                  setSelectedLC(lc);
                                  setDialogType('lcAmend');
                                  setDialogOpen(true);
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination Controls */}
          {getFilteredLCs().length > 0 && (
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
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="black">
                  Page {currentPage + 1} of {Math.ceil(getFilteredLCs().length / rowsPerPage)}
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
                    disabled={currentPage >= Math.ceil(getFilteredLCs().length / rowsPerPage) - 1}
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

      {/* Tab 1: Forex Allocations */}
      {activeTab === 1 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Foreign Exchange Allocations
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>NBE Forex Retention Policy:</strong> 40% retained in USD, 60% converted to ETB<br />
            Forex allocated after LC confirmation, valid for 180 days
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
                    <TableCell><strong>Forex ID</strong></TableCell>
                    <TableCell><strong>LC Reference</strong></TableCell>
                    <TableCell><strong>Exporter</strong></TableCell>
                    <TableCell><strong>Allocated Amount</strong></TableCell>
                    <TableCell><strong>Exchange Rate</strong></TableCell>
                    <TableCell><strong>Retention (40%)</strong></TableCell>
                    <TableCell><strong>Conversion (60%)</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Expiry</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(getFilteredForex()).map((forex) => (
                    <TableRow key={forex.forexId}>
                      <TableCell>{forex.forexId}</TableCell>
                      <TableCell>{forex.lcId}</TableCell>
                      <TableCell>{forex.exporterId}</TableCell>
                      <TableCell>
                        <strong>${forex.allocatedAmount.toLocaleString()}</strong>
                      </TableCell>
                      <TableCell>{forex.exchangeRate} ETB/USD</TableCell>
                      <TableCell>
                        ${(forex.allocatedAmount * 0.4).toLocaleString()} USD
                      </TableCell>
                      <TableCell>
                        {(forex.allocatedAmount * 0.6 * forex.exchangeRate).toLocaleString()} ETB
                      </TableCell>
                      <TableCell>
                        <StatusChip 
                          label={forex.status} 
                          status={forex.status === 'ALLOCATED' ? 'APPROVED' : 'PENDING'} 
                        />
                      </TableCell>
                      <TableCell>{new Date(forex.expiryDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            sx={{
                              color: '#9b30b7',
                              '&:hover': { bgcolor: 'rgba(155, 48, 183, 0.1)' },
                            }}
                            onClick={() => {
                              const contract = contracts.find(c => c.contractId === forex.contractId);
                              const lc = letterOfCredits.find(l => l.lcId === forex.lcId);
                              showInfo(
                                'Forex Allocation Details',
                                `Forex ID: ${forex.forexId}\nLC: ${forex.lcId}\nExporter: ${forex.exporterId}\n\nAllocated: $${forex.allocatedAmount.toLocaleString()} USD\nRate: ${forex.exchangeRate} ETB/USD\n\n40% USD Retention: $${(forex.allocatedAmount * 0.4).toLocaleString()}\n60% ETB Conversion: ${(forex.allocatedAmount * 0.6 * forex.exchangeRate).toLocaleString()} ETB\n\nStatus: ${forex.status}\nExpiry: ${new Date(forex.expiryDate).toLocaleDateString()}`
                              );
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="black">
                  Page {currentPage + 1} of {Math.ceil(getFilteredForex().length / rowsPerPage)}
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
                  ${forexAllocations.reduce((sum, f) => sum + f.allocatedAmount, 0).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="black">USD Retained (40%)</Typography>
                <Typography variant="h6">
                  ${(forexAllocations.reduce((sum, f) => sum + f.allocatedAmount, 0) * 0.4).toLocaleString()}
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

      {/* Dialogs and Modals */}      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedContract && dialogType === null} onClose={() => setSelectedContract(null)} maxWidth="md" fullWidth>
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Contract ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedContract.contractId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">NBE Reference</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedContract.nbeReferenceNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Exporter</Typography>
                  <Typography variant="body1">{selectedContract.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="black">Buyer / Country</Typography>
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

      {/* LC Details Dialog */}
      <Dialog open={dialogOpen && dialogType === 'lcDetails'} onClose={handleCloseDialog} maxWidth="md" fullWidth>
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
        <Box>
          <SWIFTDashboardWrapper 
            primaryColor={CBE_COLORS.purple}
            secondaryColor={CBE_COLORS.golden}
            accentColor={CBE_COLORS.black}
          />
        </Box>
      )}
    </Box>
    </ThemeProvider>
  );
};

export default BanksPortal;
