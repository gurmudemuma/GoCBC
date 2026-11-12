// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// NBE Portal - Sales Contract Management & Forex

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  TrendingUp,
  AccountBalance,
  CurrencyExchange,
  Assignment,
  Visibility,
  Download,
  Warning,
  DirectionsBoat,
  FlightTakeoff,
  Assessment,
  Gavel,
  Person,
  Timeline,
  VerifiedUser,
  AccountTree,
  AttachMoney,
  Category,
  AccessTime,
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import api, { formatDate, formatCurrency } from '@/utils/api';
import { couchDBService } from '@/services/couchdbService';
import { TestBlockchainButton } from '@/components/TestBlockchainButton';
import { PortalShell, PortalTabBar, PortalTabPanel, PortalKpiCard, PortalCard, PrimaryButton, SecondaryButton, GhostButton, PortalDialog, PortalField, PortalDataGrid, StatusChip, getPortalBrand } from '@/components/shared/portal';
import { SalesContract } from '@/types';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import { apiFetch } from '@/config/api.config';
import SWIFTMonitoringWrapper from '@/components/nbe/SWIFTMonitoringWrapper';
import { useTabFromQuery } from '@/hooks/useTabFromQuery';
import AuditTrailViewer from './AuditTrailViewer';
import AuditTrailTable from './AuditTrailTable';
import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { DocumentManagementPanel } from '@/components/documents';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';
import { BlockchainStatusIcon, BlockchainTxChip, BlockchainBadge } from '@/components/blockchain';
import PostDeliveryWorkflowPanel from '../shared/PostDeliveryWorkflowPanel';

// NEW: Export Proceeds Repatriation Tab
import { RepatriationManagementTab } from '@/components/repatriation';

// Transport Mode Type
type TransportMode = 'SEA' | 'AIR';

// Extended SalesContract with transport mode
interface ContractWithTransport extends SalesContract {
  transportMode?: TransportMode;
}

interface LetterOfCredit {
  id: number;
  lc_number: string;
  lc_id: string;
  contract_id: string;
  exporter_id: string;
  issuing_bank: string;
  advising_bank: string;
  beneficiary: string;
  applicant: string;
  amount: string;
  currency: string;
  status: string;
  issue_date: string | null;
  expiry_date: string;
  latest_shipment_date: string;
  port_of_loading: string;
  port_of_discharge: string;
  payment_terms: string;
  partial_shipment: boolean;
  transhipment: boolean;
  created_at: string;
  updated_at: string;
}

interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  lcId?: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  officialRate: number;
  retentionRate: number;
  retentionStatus?: string;
  transportMode?: TransportMode;
  status: 'REQUESTED' | 'CONFIRMED' | 'APPROVED' | 'ALLOCATED' | 'UTILIZED' | 'REJECTED'; // APPROVED is the legacy value the pre-fix NBE approve route wrote (042b8b7); allocateForex treats it as CONFIRMED; REJECTED is assigned by chaincode RejectForex (forex.go)
  requestDate: string;
  approvalDate?: string | null;
  allocationDate?: string | null;
  expiryDate?: string | null;
  nbeOfficer?: string | null;
  nbeApprovalRef?: string | null;
  verifiedBy?: string | null;
  verifiedByMsp?: string | null;
  comments?: string | null;
}

interface ExchangeRate {
  rateId: string;
  currency: string;
  buyingRate: number;
  sellingRate: number;
  midRate: number;
  effectiveDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUPERSEDED';
}

const NBEPortal: React.FC = () => {
  const { user } = useAuth();
  
  // NBE Brand Colors (from the shared portal brand tokens)
  const BRAND_COLOR = getPortalBrand('NBE').primary;
  const SECONDARY_COLOR = getPortalBrand('NBE').secondary;
  
  // CBE Colors (for banking/forex context)
  const CBE_PURPLE = '#9b30b7';
  const CBE_GOLDEN = '#FFD700';
  const CBE_BLACK = '#000000';
  const CBE_WHITE = '#ffffff';
  
  const [tabValue, setTabValue] = useState(0);
  
  // Sub-tab state for Analytics and other tabs with sub-tabs
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0); // 0: Overview, 1: Trends, 2: Breakdown
  const [forexSubTab, setForexSubTab] = useState(0); // 0: All, 1: Allocated, 2: Requested (no Expired sub-tab: forex EXPIRED is never assigned)
  const [swiftSubTab, setSwiftSubTab] = useState(0); // 0: All Messages, 1: Analytics & Charts, 2: Compliance Alerts
  const [activeKPIFilter, setActiveKPIFilter] = useState<string | null>(null);
  
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [allContracts, setAllContracts] = useState<SalesContract[]>([]);
  const [forexAllocations, setForexAllocations] = useState<ForexAllocation[]>([]);
  const [lettersOfCredit, setLettersOfCredit] = useState<LetterOfCredit[]>([]);
  const [deliveredShipments, setDeliveredShipments] = useState<any[]>([]);
  const [allForexAllocations, setAllForexAllocations] = useState<ForexAllocation[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [coffeeRetentionPolicy, setCoffeeRetentionPolicy] = useState<{ retentionRate: number; surrenderRate: number } | null>(null);
  const [swiftMessages, setSwiftMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithTransport | null>(null);

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'CONTRACT' | 'FOREX' | 'LC'>('CONTRACT');
  const [auditEntityId, setAuditEntityId] = useState<string>('');
  const [auditStats, setAuditStats] = useState({
    totalActivities: 0,
    todaysActions: 0,
    blockchainVerified: 0,
    organizationsInvolved: 0,
  });
  const [selectedForex, setSelectedForex] = useState<ForexAllocation | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [forexDialogOpen, setForexDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  // Document Validation Dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);

  const [approvalNotification, setApprovalNotification] = useState<{open: boolean, success: boolean, message: string}>({
    open: false, success: false, message: ''
  });

  const [forexForm, setForexForm] = useState({
    allocatedAmount: '',
    exchangeRate: '',
    retentionRate: '',
    nbeOfficer: '',
    nbeApprovalRef: '',
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Record Retention dialog state (slice-6 fix: POST
  // /retention/:forexId/retention had no UI caller anywhere; ALLOCATED /
  // UTILIZED allocations showed a retention status but it could never be
  // recorded from the portal)
  const [retentionDialogOpen, setRetentionDialogOpen] = useState(false);
  const [recordingRetention, setRecordingRetention] = useState(false);
  const [retentionForm, setRetentionForm] = useState({
    forexId: '',
    fcyAccountNumber: '',
    retentionPercentage: '',
  });

  // Exchange-rate dialog state — every input is controlled; "Set Rate" calls
  // POST /forex/rates via handleSetExchangeRate (mid-rate is computed
  // server-side as (buying + selling) / 2). Validation mirrors chaincode
  // SetExchangeRate: buying > 0, selling > 0, selling >= buying.
  const [rateForm, setRateForm] = useState({
    currency: 'USD',
    buyingRate: '',
    sellingRate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    justification: '',
  });
  const [settingRate, setSettingRate] = useState(false);

  // Retention-policy form state (Policy & Compliance tab). The rate is
  // always read from the active ledger policy (coffeeRetentionPolicy);
  // it is never hardcoded — when no policy exists the field prefills empty.
  const [retentionPolicyForm, setRetentionPolicyForm] = useState({
    retentionRate: '',
    justification: '',
  });
  const [settingPolicy, setSettingPolicy] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tabValue === 8) {
      loadAuditStats();
    }
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load real contracts data from API
      const contractsRes = await api.getContracts();
      if (contractsRes.success) {
        const allContracts = contractsRes.data || [];
        setContracts(allContracts);
        setAllContracts(allContracts);
        console.log(`Loaded ${allContracts.length} contracts from API`);
      }

      // 🔗 Load forex allocations from API (which fetches from blockchain)
      console.log('[NBE] 🔗 Loading forex from API...');
      try {
        const response = await apiFetch('/forex', {
          method: 'GET',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch forex: ${response.statusText}`);
        }
        
        const result = await response.json();
        const blockchainForex = result.data || [];
        console.log(`[NBE] ✅ Loaded ${blockchainForex.length} forex from API (blockchain source)`);
        
        const forexData = blockchainForex.map((forex: any) => {
          const status = forex.status || 'REQUESTED';
          const isAllocated = status === 'ALLOCATED';
          
          return {
            forexId: forex.forexId || '',
            contractId: forex.contractId || '',
            exporterId: forex.exporterId || '',
            lcId: forex.lcId || '',
            requestedAmount: Number(forex.requestedAmount || 0),
            allocatedAmount: Number(forex.allocatedAmount || 0),
            currency: forex.currency || 'USD',
            exchangeRate: isAllocated ? Number(forex.exchangeRate || 0) : 0,
            officialRate: Number(forex.exchangeRate || 0),
            retentionRate: isAllocated ? Number(forex.retentionRate || 0) : 0,
            retentionStatus: forex.retentionStatus || '',
            status: status,
            requestDate: forex.requestDate || forex.createdAt || new Date().toISOString(),
            approvalDate: forex.allocationDate || null,
            allocationDate: forex.allocationDate || null,
            expiryDate: isAllocated ? (forex.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()) : null,
            nbeOfficer: forex.nbeOfficer || null,
            nbeApprovalRef: forex.nbeApprovalRef || null,
            verifiedBy: forex.verifiedBy || null,
            verifiedByMsp: forex.verifiedByMsp || null,
            comments: forex.comments || null,
          };
        });
        
        setForexAllocations(forexData);
        setAllForexAllocations(forexData);
        console.log(`[NBE] 📊 Forex by status:`, {
          REQUESTED: forexData.filter((f: any) => f.status === 'REQUESTED').length,
          CONFIRMED: forexData.filter((f: any) => f.status === 'CONFIRMED' || f.status === 'APPROVED').length, // APPROVED is legacy CONFIRMED (pre-fix approve route)
          ALLOCATED: forexData.filter((f: any) => f.status === 'ALLOCATED').length,
        });
      } catch (error) {
        console.error('[NBE] ❌ Failed to load forex from API:', error);
        setForexAllocations([]);
      }

      // 🔗 Load Letters of Credit for monitoring
      console.log('[NBE] 🔗 Loading LCs from API...');
      try {
        const lcResponse = await apiFetch('/nbe/lc-monitoring', {
          method: 'GET',
        });
        
        if (!lcResponse.ok) {
          throw new Error(`Failed to fetch LCs: ${lcResponse.statusText}`);
        }
        
        const lcResult = await lcResponse.json();
        const lcs = lcResult.data || [];
        console.log(`[NBE] ✅ Loaded ${lcs.length} LCs for monitoring`);
        setLettersOfCredit(lcs);
      } catch (error) {
        console.error('[NBE] ❌ Failed to load LCs:', error);
        setLettersOfCredit([]);
      }

      // Load exchange rates from blockchain/API
      try {
        const ratesRes = await api.getExchangeRates();
        if (ratesRes.success && ratesRes.data && Array.isArray(ratesRes.data)) {
          setExchangeRates(ratesRes.data.map((r: any) => ({
            ...r,
            buyingRate: Number(r.buyingRate || 0),
            sellingRate: Number(r.sellingRate || 0),
            midRate: Number(r.midRate || 0),
            status: (r.status === 'ACTIVE' || r.status === 'INACTIVE' || r.status === 'SUPERSEDED')
              ? r.status
              : 'INACTIVE'
          })));
          console.log(`Loaded ${ratesRes.data.length} exchange rates from API`);
        } else {
          console.warn('No exchange rates found, using empty array');
          setExchangeRates([]);
        }
      } catch (error) {
        console.warn('Could not load exchange rates:', error);
        setExchangeRates([]);
      }

      try {
        const policyResponse = await apiFetch('/forex/retention-policy/COFFEE', { method: 'GET' });
        const policyResult = await policyResponse.json();
        const retentionRate = Number(policyResult.data?.retentionRate ?? policyResult.data?.RetentionRate);
        const surrenderRate = Number(policyResult.data?.surrenderRate ?? policyResult.data?.SurrenderRate);
        setCoffeeRetentionPolicy(
          policyResult.success && Number.isFinite(retentionRate) && Number.isFinite(surrenderRate)
            ? { retentionRate, surrenderRate }
            : null
        );
      } catch (error) {
        console.warn('Could not load active COFFEE retention policy:', error);
        setCoffeeRetentionPolicy(null);
      }

      // Load SWIFT messages from API
      try {
        const swiftRes = await api.get('/swift/messages');
        if (swiftRes.data.success) {
          const swiftData = swiftRes.data.data || [];
          setSwiftMessages(swiftData);
          console.log(`Loaded ${swiftData.length} SWIFT messages from API`);
        }
      } catch (error) {
        console.warn('Could not load SWIFT messages:', error);
        setSwiftMessages([]);
      }

      // Load delivered shipments for forex repatriation tracking
      try {
        const shipmentsResult = await api.getShipments({ status: 'DELIVERED' });
        if (shipmentsResult.success && shipmentsResult.data) {
          const delivered = shipmentsResult.data.filter((s: any) => {
            const status = s.Status || s.status || s.shipmentStatus || '';
            return status === 'DELIVERED' || status === 'COMPLETED';
          });
          setDeliveredShipments(delivered);
          console.log(`[NBE] ✅ Delivered shipments for forex repatriation: ${delivered.length}`);
        }
      } catch (err) {
        console.warn('[NBE] Could not load delivered shipments:', err);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pagination Helper Functions
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

  const loadAuditStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await apiFetch('/audit/portal/recent?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const logs = data.data.logs || [];
        
        const totalActivities = logs.length;
        
        const todaysActions = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return logDate >= oneDayAgo;
        }).length;
        
        const blockchainVerified = logs.filter((log: any) => log.metadata?.blockchainVerified === true).length;
        
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
      console.error('[NBE] Failed to load audit stats:', error);
    }
  };

  const getContractStats = () => {
    const total = contracts.length;
    const approved = contracts.filter(c => c.contractStatus === 'APPROVED').length;
    const pending = contracts.filter(c => c.contractStatus === 'REGISTERED').length;
    const totalValue = contracts.reduce((sum, contract) => sum + contract.totalValue, 0);
    return { total, approved, pending, totalValue };
  };

  // Handle KPI filter for sub-tabs
  const handleKPIFilter = (filterKey: string, kpiTitle: string) => {
    setActiveKPIFilter(filterKey);
    
    // Apply filter based on active tab and filter key
    switch (tabValue) {
      case 0: // Forex Monitoring
        if (filterKey === 'ALL_FOREX') setForexAllocations(allForexAllocations);
        else if (filterKey === 'BANK_ALLOCATED') setForexAllocations(allForexAllocations.filter(f => f.status === 'ALLOCATED'));
        else if (filterKey === 'CONTRACTS_APPROVED') setContracts(allContracts.filter(c => c.contractStatus === 'APPROVED'));
        else if (filterKey === 'PENDING_REVIEW') setContracts(allContracts.filter(c => c.contractStatus === 'REGISTERED'));
        else {
          setContracts(allContracts);
          setForexAllocations(allForexAllocations);
        }
        break;
        
      case 1: // LC Monitoring
        // No filters for LC monitoring yet
        break;

      case 2: // Exchange Rates
        if (filterKey === 'ALL_CONTRACTS') setContracts(allContracts);
        else if (filterKey === 'APPROVED') setContracts(allContracts.filter(c => c.contractStatus === 'APPROVED'));
        else if (filterKey === 'PENDING') setContracts(allContracts.filter(c => c.contractStatus === 'REGISTERED'));
        else setContracts(allContracts);
        break;
        
      default:
        setContracts(allContracts);
        setForexAllocations(allForexAllocations);
    }
  };

  const handleApproveContract = async (contract: ContractWithTransport) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const nbeOfficer = user.username || 'NBE Officer';

      const result = await api.approveContractForForex(contract.contractId, nbeOfficer);
      
      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Contract ${contract.contractId} approved for forex allocation. Banks can now issue the LC and allocate forex under the active NBE ledger policy.`
        });
        await loadData();
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to approve contract'
        });
      }
    } catch (error: any) {
      console.error('Error approving contract:', error);
      setApprovalNotification({
        open: true,
        success: false,
        message: error.response?.data?.error?.message || 'Failed to approve contract'
      });
    } finally {
      setLoading(false);
      setApprovalDialogOpen(false);
      setSelectedContract(null);
    }
  };

  // ==================== NBE CONTRACT APPROVAL WORKFLOW ====================
  
  // Reject Contract (REGISTERED → REJECTED)
  const handleRejectContract = async (contract: ContractWithTransport, rejectionReason: string) => {
    if (!rejectionReason) {
      setApprovalNotification({
        open: true,
        success: false,
        message: 'Please provide a reason for rejection'
      });
      return;
    }
    
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const nbeOfficer = user.username || 'NBE Officer';

      const result = await api.rejectContract(contract.contractId, rejectionReason, nbeOfficer);
      
      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Contract ${contract.contractId} rejected. Exporter will be notified. Reason: ${rejectionReason}`
        });
        await loadData();
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to reject contract'
        });
      }
    } catch (error: any) {
      console.error('Error rejecting contract:', error);
      setApprovalNotification({
        open: true,
        success: false,
        message: error.response?.data?.error?.message || 'Failed to reject contract'
      });
    } finally {
      setLoading(false);
      setSelectedContract(null);
    }
  };

  // ==================== NBE FOREX MONITORING (READ-ONLY) ====================
  // Note: Banks allocate forex per NBE policy, NBE monitors compliance
  
  // Set Exchange Rate (NBE Authority)
  const handleSetExchangeRate = async (currency: string, buyingRate: number, sellingRate: number) => {
    try {
      setLoading(true);
      setSettingRate(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const response = await api.post('/forex/rates', {
        currency,
        buyingRate,
        sellingRate,
      });

      if (response.data.success) {
        const midRate = (buyingRate + sellingRate) / 2;
        setApprovalNotification({
          open: true,
          success: true,
          message: `Exchange rate set: 1 ${currency} = ${midRate.toFixed(2)} ETB (Buy: ${buyingRate}, Sell: ${sellingRate})`
        });
        setRateForm(prev => ({ ...prev, buyingRate: '', sellingRate: '' }));
        await loadData();
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: response.data.error?.message || 'Failed to set exchange rate'
        });
      }
    } catch (error: any) {
      console.error('Error setting exchange rate:', error);
      setApprovalNotification({
        open: true,
        success: false,
        message: error.response?.data?.error?.message || 'Failed to set exchange rate'
      });
    } finally {
      setLoading(false);
      setSettingRate(false);
      setRateDialogOpen(false);
    }
  };

  // Validate the exchange-rate dialog form (chaincode SetExchangeRate:
  // buying > 0, selling > 0, selling >= buying; mid is computed server-side)
  // and submit it. Effective date / justification are collected for the
  // record but POST /forex/rates only accepts currency/buyingRate/sellingRate.
  const handleSubmitExchangeRate = async () => {
    const buying = Number(rateForm.buyingRate);
    const selling = Number(rateForm.sellingRate);
    if (!rateForm.currency) {
      setApprovalNotification({ open: true, success: false, message: 'Select a currency' });
      return;
    }
    if (!Number.isFinite(buying) || buying <= 0) {
      setApprovalNotification({ open: true, success: false, message: 'Buying rate must be greater than 0' });
      return;
    }
    if (!Number.isFinite(selling) || selling <= 0) {
      setApprovalNotification({ open: true, success: false, message: 'Selling rate must be greater than 0' });
      return;
    }
    if (selling < buying) {
      setApprovalNotification({ open: true, success: false, message: 'Selling rate must be greater than or equal to the buying rate' });
      return;
    }
    await handleSetExchangeRate(rateForm.currency, buying, selling);
  };

  // Set Retention Policy (NBE Authority) — POST /forex/retention-policy.
  // The route requires policyID, commodityType and retentionRate (0–100);
  // commodity is always COFFEE here. The new policy supersedes the active
  // one on-chain; the portal always reads the rate back from the ledger
  // (GET /forex/retention-policy/coffee) instead of trusting this input.
  const handleSetRetentionPolicy = async () => {
    const rate = Number(retentionPolicyForm.retentionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setApprovalNotification({ open: true, success: false, message: 'Retention rate must be between 0 and 100' });
      return;
    }
    try {
      setSettingPolicy(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await apiFetch('/forex/retention-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyID: `POL-${Date.now()}`,
          commodityType: 'COFFEE',
          retentionRate: rate,
          setBy: user.username || 'NBE',
          justification: retentionPolicyForm.justification || 'NBE retention policy directive',
        }),
      });
      const result = await response.json();
      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `COFFEE retention policy set to ${rate}% (policy ${result.data?.policyID || ''})`
        });
        setRetentionPolicyForm({ retentionRate: '', justification: '' });
        await loadData();
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to set retention policy'
        });
      }
    } catch (error: any) {
      setApprovalNotification({
        open: true,
        success: false,
        message: error.message || 'Failed to set retention policy'
      });
    } finally {
      setSettingPolicy(false);
    }
  };

  // Monitor Forex Compliance (NBE oversight)
  const handleReviewForexCompliance = async (forex: ForexAllocation) => {
    try {
      // NBE reviews forex allocation for policy compliance
      const retentionCompliant = forex.retentionStatus === 'COMPLIED';
      const amountCompliant = forex.allocatedAmount <= forex.requestedAmount;
      const rateCompliant = forex.exchangeRate > 0 && forex.exchangeRate === forex.officialRate;
      
      const complianceIssues = [];
      if (!retentionCompliant) complianceIssues.push(`Retention status is ${forex.retentionStatus || 'unrecorded'}; ledger policy compliance is not confirmed`);
      if (!amountCompliant) complianceIssues.push(`Allocated amount exceeds requested amount`);
      if (!rateCompliant) complianceIssues.push(`Recorded exchange rate does not match the official rate captured with this allocation`);
      
      if (complianceIssues.length > 0) {
        setApprovalNotification({
          open: true,
          success: false,
          message: `Forex ${forex.forexId} has compliance issues: ${complianceIssues.join('; ')}`
        });
      } else {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Forex ${forex.forexId} is compliant with NBE policy (${forex.retentionRate}% retention, rate: ${forex.exchangeRate} ETB/${forex.currency})`
        });
      }
    } catch (error: any) {
      console.error('Error reviewing forex compliance:', error);
    }
  };

  // Record Retention — POST /retention/:forexId/retention (slice-6 fix).
  // The route reads the allocation on-chain first (ReadForex), so without
  // a Fabric peer it returns 404 and the error is shown honestly.
  const handleRecordRetention = async () => {
    try {
      setRecordingRetention(true);
      const response = await apiFetch(`/retention/${retentionForm.forexId}/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcyAccountNumber: retentionForm.fcyAccountNumber,
          retentionPercentage: Number(retentionForm.retentionPercentage),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Retention recorded for ${retentionForm.forexId}: ${retentionForm.retentionPercentage}% (status ${result.data?.status || 'PENDING'})`
        });
        setRetentionDialogOpen(false);
        await loadData();
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to record retention'
        });
      }
    } catch (error: any) {
      setApprovalNotification({
        open: true,
        success: false,
        message: error.message || 'Failed to record retention'
      });
    } finally {
      setRecordingRetention(false);
    }
  };

  const handleAllocateForex = async () => {
    if (!selectedForex) return;

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Find the LC associated with this contract
      let lcId = '';
      try {
        const lcResponse = await api.get('/banking/lc');
        if (lcResponse.data.success && lcResponse.data.data) {
          const matchingLC = lcResponse.data.data.find((lc: any) => 
            (lc.ContractID || lc.contractId) === selectedForex.contractId
          );
          if (matchingLC) {
            lcId = matchingLC.LCID || matchingLC.lcId || '';
          }
        }
      } catch (error) {
        console.warn('Could not fetch LC for contract:', error);
      }

      if (!lcId) {
        setApprovalNotification({
          open: true,
          success: false,
          message: 'No Letter of Credit found for this contract. Banks must issue LC and allocate forex before monitoring.'
        });
        setLoading(false);
        return;
      }
      
      // The /forex/allocate route destructures `officer` / `approvalRef`
      // (forex.ts) — sending nbeOfficer/nbeApprovalRef silently drops the
      // approval reference to ''. Call api.post directly with the exact keys
      // the route reads (api.allocateForex posts the wrong keys; api.ts is
      // owned by another worker).
      const allocationData = {
        forexId: selectedForex.forexId,
        lcId: lcId,
        amount: parseFloat(forexForm.allocatedAmount),
        exchangeRate: parseFloat(forexForm.exchangeRate),
        retentionRate: parseFloat(forexForm.retentionRate),
        officer: forexForm.nbeOfficer || user.username || 'NBE Officer',
        approvalRef: forexForm.nbeApprovalRef,
        expiryDate: forexForm.expiryDate,
      };

      const response = await api.post('/forex/allocate', allocationData);
      const result = response.data;

      if (result.success) {
        setApprovalNotification({
          open: true,
          success: true,
          message: `Forex allocation completed: ${formatCurrency(allocationData.amount, selectedForex.currency)}`
        });
        await loadData();
        setForexForm({
          allocatedAmount: '',
          exchangeRate: '',
          retentionRate: '',
          nbeOfficer: '',
          nbeApprovalRef: '',
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      } else {
        setApprovalNotification({
          open: true,
          success: false,
          message: result.error?.message || 'Failed to allocate forex'
        });
      }
    } catch (error: any) {
      console.error('Error allocating forex:', error);
      setApprovalNotification({
        open: true,
        success: false,
        message: error.response?.data?.error?.message || 'Failed to allocate forex'
        });
    } finally {
      setLoading(false);
      setForexDialogOpen(false);
      setSelectedForex(null);
    }
  };

  const stats = getContractStats();

  // Define role-based tab access for NBE
  const getRoleBasedTabs = () => {
    const userRole = user?.role || '';
    const isSuperAdmin = userRole === 'ADMIN';
    
    const allTabs = [
      // Operational Tabs (like Banks Portal)
      { index: 0, label: `Forex Monitoring`, icon: <CurrencyExchange sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer', 'Exchange Rate Officer'] },
      { index: 1, label: `LC Monitoring`, icon: <AccountBalance sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer'] },
      { index: 2, label: `Exchange Rates`, icon: <TrendingUp sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Exchange Rate Officer'] },
      { index: 3, label: 'SWIFT Monitoring', icon: <FlightTakeoff sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Settlement Officer'] },
      { index: 4, label: 'Forex Repatriation', icon: <CheckCircle sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer', 'Settlement Officer'] },
      { index: 5, label: 'Policy & Compliance', icon: <Gavel sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Compliance Officer', 'Screening Officer'] },
      // Analytics & Admin Tabs
      { index: 6, label: 'Analytics', icon: <Assessment sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer'] },
      { index: 7, label: 'User Management', icon: <Person sx={{ fontSize: 20 }} />, roles: ['ADMIN', 'NBE', 'NBE Portal Administrator'] },
      { index: 8, label: 'Audit Trail', icon: <Assessment sx={{ fontSize: 20 }} />, roles: ['NBE', 'ADMIN', 'NBE Officer', 'Forex Officer', 'Exchange Rate Officer', 'Settlement Officer', 'Compliance Officer'] },
    ];
    
    if (isSuperAdmin) return allTabs;
    return allTabs.filter(tab => tab.roles.includes(userRole));
  };
  
  const visibleTabs = getRoleBasedTabs();

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.index === tabValue)) {
      setTabValue(visibleTabs[0].index);
    }
  }, [tabValue, visibleTabs]);

  // ?tab=<index> deep-link from global search results.
  useTabFromQuery(setTabValue, visibleTabs.map((tab) => tab.index));

  const contractColumns: GridColDef[] = [
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'nbeReferenceNumber', headerName: 'NBE Reference', width: 180 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    { field: 'buyerCountry', headerName: 'Destination', width: 120 },
    { field: 'coffeeType', headerName: 'Coffee Type', width: 150 },
    { field: 'quantity', headerName: 'Quantity (kg)', width: 120 },
    {
      field: 'totalValue',
      headerName: 'Value (USD)',
      width: 130,
      renderCell: (params) => formatCurrency(params.value),
    },
    {
      field: 'minimumPriceCompliant',
      headerName: 'Min Price',
      width: 100,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value ? 'Yes' : 'No'}
          color={params.value ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'contractStatus',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Contract Details">
            <IconButton 
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedContract(params.row);
                setDetailsDialogOpen(true);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.contractStatus === 'REGISTERED' && (
            <>
              <Tooltip title="Approve for Forex Allocation">
                <IconButton 
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContract(params.row);
                    setApprovalDialogOpen(true);
                  }}
                >
                  <CheckCircle />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Contract">
                <IconButton 
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    const reason = prompt(
                      `Reject Contract ${params.row.contractId}?\n\n` +
                      `Reasons:\n` +
                      `- Insufficient documentation\n` +
                      `- Value exceeds exporter capacity\n` +
                      `- Buyer country restrictions\n` +
                      `- Regulatory non-compliance\n` +
                      `- Incorrect contract terms\n\n` +
                      `Enter rejection reason:`
                    );
                    if (reason) {
                      alert(
                        `Contract ${params.row.contractId} rejected.\n\n` +
                        `Reason: ${reason}\n\n` +
                        `Exporter and bank will be notified.`
                      );
                    }
                  }}
                >
                  <Cancel />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  const forexColumns: GridColDef[] = [
    { field: 'forexId', headerName: 'Forex ID', width: 150 },
    { 
      field: 'lcId', 
      headerName: 'LC Reference', 
      width: 180,
      renderCell: (params) => {
        if (!params.value || params.value === '') {
          if (params.row.status === 'REQUESTED') {
            return <Typography variant="body2" sx={{ color: 'warning.main', fontStyle: 'italic' }}>Pending Allocation</Typography>;
          }
          return <Typography variant="body2" color="text.secondary">-</Typography>;
        }
        return params.value;
      }
    },
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    {
      field: 'requestedAmount',
      headerName: 'Requested',
      width: 120,
      renderCell: (params) => formatCurrency(params.value, params.row.currency),
    },
    {
      field: 'allocatedAmount',
      headerName: 'Allocated',
      width: 120,
      renderCell: (params) => {
        if (params.value > 0) {
          return formatCurrency(params.value, params.row.currency);
        }
        return '-';
      },
    },
    { 
      field: 'exchangeRate', 
      headerName: 'Rate (ETB)', 
      width: 110,
      renderCell: (params) => {
        if (params.row.status === 'REQUESTED' || params.value === 0) {
          return <Typography variant="body2" color="text.secondary">Pending</Typography>;
        }
        const n = Number(params.value);
        return Number.isFinite(n) ? n.toFixed(2) : <Typography variant="body2" color="text.secondary">Pending</Typography>;
      },
    },
    {
      field: 'retentionRate',
      headerName: 'Retention',
      width: 100,
      renderCell: (params) => {
        if (params.row.status === 'REQUESTED' || params.value === 0) {
          return <Typography variant="body2" color="text.secondary">-</Typography>;
        }
        return `${params.value}%`;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip status={params.value} />
      ),
    },
    { 
      field: 'requestDate', 
      headerName: 'Request Date', 
      width: 130, 
      renderCell: (params) => formatDate(params.value) 
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Forex Details">
            <IconButton 
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedForex(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.status === 'REQUESTED' && (
            <Tooltip title="Confirm Forex Request">
              <IconButton 
                size="small"
                sx={{ 
                  color: '#1976d2',
                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' }
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    // Confirm the forex request (REQUESTED → CONFIRMED)
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`/api/v1/forex/${params.row.forexId}/confirm`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        confirmedBy: JSON.parse(localStorage.getItem('user') || '{}').username || 'NBE Officer'
                      })
                    });
                    const result = await response.json();
                    if (result.success) {
                      setApprovalNotification({
                        open: true,
                        success: true,
                        message: `Forex request ${params.row.forexId} confirmed. Allocate button is now active.`
                      });
                      await loadData();
                    } else {
                      setApprovalNotification({
                        open: true,
                        success: false,
                        message: result.error?.message || 'Failed to confirm forex request'
                      });
                    }
                  } catch (error: any) {
                    setApprovalNotification({
                      open: true,
                      success: false,
                      message: error.message || 'Failed to confirm forex request'
                    });
                  }
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          {/* Allocate: CONFIRMED, or legacy APPROVED (pre-fix NBE approve wrote APPROVED; allocateForex accepts it as CONFIRMED). APPROVED rows otherwise have no next action in the portal. */}
          {['CONFIRMED', 'APPROVED'].includes(params.row.status) && (
            <Tooltip title="Allocate Forex">
              <IconButton 
                size="small"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  const activeRate = exchangeRates.find(rate => rate.currency === params.row.currency && rate.status === 'ACTIVE');
                  setForexForm(prev => ({
                    ...prev,
                    allocatedAmount: String(params.row.requestedAmount || ''),
                    exchangeRate: activeRate?.midRate ? String(activeRate.midRate) : '',
                    retentionRate: coffeeRetentionPolicy ? String(coffeeRetentionPolicy.retentionRate) : '',
                  }));
                  setSelectedForex(params.row);
                  setForexDialogOpen(true);
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          {/* Record Retention — slice-6 fix: ALLOCATED/UTILIZED rows had no
              way to record retention (POST /retention/:forexId/retention). */}
          {['ALLOCATED', 'UTILIZED'].includes(params.row.status) && (
            <Tooltip title="Record Retention">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setRetentionForm({
                    forexId: params.row.forexId,
                    fcyAccountNumber: '',
                    // Never hardcode a retention rate: prefill from the active
                    // ledger policy only; empty when no policy exists.
                    retentionPercentage: coffeeRetentionPolicy ? String(coffeeRetentionPolicy.retentionRate) : '',
                  });
                  setRetentionDialogOpen(true);
                }}
              >
                <Assignment />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
  return (
    <PortalShell
      brand="NBE"
      title="NBE Portal"
      subtitle="National Bank of Ethiopia"
      actions={<TestBlockchainButton />}
    >

      {/* Compact KPI Cards - Clean design like ECX Portal */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(() => {
          const currentRate = exchangeRates
            .filter(rate => rate.currency === 'USD' && rate.status === 'ACTIVE')
            .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]?.midRate;
          const destinationCounts = allContracts.reduce((counts: Record<string, number>, contract: any) => {
            const country = contract.buyerCountry || 'Unknown';
            counts[country] = (counts[country] || 0) + 1;
            return counts;
          }, {});
          const topDestination = Object.entries(destinationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unavailable';
          const kpis = tabValue === 0 ? (
            // Forex Monitoring - KPIs change based on filter/sub-tab
            forexSubTab === 0 ? [
              // All Forex
              { icon: <Assignment />, label: 'Total Forex Requests', value: forexAllocations.length, color: BRAND_COLOR, onClick: () => setForexSubTab(0) },
              { icon: <CheckCircle />, label: 'Allocated', value: forexAllocations.filter(f => f.status === 'ALLOCATED').length, color: '#4caf50', onClick: () => setForexSubTab(1) },
              { icon: <Warning />, label: 'Requested', value: forexAllocations.filter(f => f.status === 'REQUESTED').length, color: '#ff9800', onClick: () => setForexSubTab(2) },
              { icon: <TrendingUp />, label: 'Total Value (M USD)', value: `$${(forexAllocations.reduce((sum, f) => sum + (f.allocatedAmount || f.requestedAmount || 0), 0) / 1000000).toFixed(1)}M`, color: '#2196f3' },
            ] : forexSubTab === 1 ? [
              // Allocated Forex
              { icon: <CheckCircle />, label: 'Allocated', value: forexAllocations.filter(f => f.status === 'ALLOCATED').length, color: '#4caf50', onClick: () => setForexSubTab(1) },
              { icon: <AttachMoney />, label: 'Allocated Amount', value: `$${(forexAllocations.filter(f => f.status === 'ALLOCATED').reduce((sum, f) => sum + (f.allocatedAmount || 0), 0) / 1000000).toFixed(1)}M`, color: '#4caf50' },
              { icon: <TrendingUp />, label: 'Avg Retention', value: forexAllocations.filter(f => f.status === 'ALLOCATED' && f.retentionRate > 0).length > 0 ? `${Math.round(forexAllocations.filter(f => f.status === 'ALLOCATED' && f.retentionRate > 0).reduce((sum, f) => sum + f.retentionRate, 0) / forexAllocations.filter(f => f.status === 'ALLOCATED' && f.retentionRate > 0).length)}%` : 'Unavailable', color: '#2196f3' },
              { icon: <Assignment />, label: 'Back to All', value: forexAllocations.length, color: BRAND_COLOR, onClick: () => setForexSubTab(0) },
            ] : [
              // Requested Forex
              { icon: <Warning />, label: 'Pending Requests', value: forexAllocations.filter(f => f.status === 'REQUESTED').length, color: '#ff9800', onClick: () => setForexSubTab(2) },
              { icon: <AttachMoney />, label: 'Requested Amount', value: `$${(forexAllocations.filter(f => f.status === 'REQUESTED').reduce((sum, f) => sum + (f.requestedAmount || 0), 0) / 1000000).toFixed(1)}M`, color: '#ff9800' },
              { icon: <CheckCircle />, label: 'Ready for Approval', value: forexAllocations.filter(f => f.status === 'REQUESTED').length, color: '#4caf50' },
              { icon: <Assignment />, label: 'Back to All', value: forexAllocations.length, color: BRAND_COLOR, onClick: () => setForexSubTab(0) },
            ]
          ) : tabValue === 1 ? [
            // LC Monitoring KPIs
            { icon: <AccountBalance />, label: 'Total LCs', value: lettersOfCredit.length, color: BRAND_COLOR },
            { icon: <CheckCircle />, label: 'Active LCs', value: lettersOfCredit.filter(lc => ['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED', 'AMENDED'].includes(lc.status)).length, color: '#4caf50' },
            { icon: <AttachMoney />, label: 'Total Value (M USD)', value: `$${(lettersOfCredit.reduce((sum, lc) => sum + parseFloat(lc.amount), 0) / 1000000).toFixed(1)}M`, color: '#2196f3' },
            { icon: <Warning />, label: 'Expiring Soon', value: lettersOfCredit.filter(lc => new Date(lc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length, color: '#ff9800' },
          ] : tabValue === 2 ? [
            { icon: <CurrencyExchange />, label: 'Current Rate (ETB/USD)', value: currentRate ? currentRate.toFixed(2) : 'Unavailable', color: BRAND_COLOR },
            { icon: <TrendingUp />, label: 'Active Currencies', value: new Set(exchangeRates.filter(rate => rate.status === 'ACTIVE').map(rate => rate.currency)).size, color: '#4caf50' },
            { icon: <Assessment />, label: 'Rate Updates', value: exchangeRates.length, color: '#2196f3' },
            { icon: <CheckCircle />, label: 'Active Rates', value: exchangeRates.filter(rate => rate.status === 'ACTIVE').length, color: '#4caf50' },
          ] : tabValue === 3 ? (
            // SWIFT Monitoring - KPIs change dynamically based on active sub-tab
            swiftSubTab === 0 ? [
              // Sub-tab 0: All Messages - Show message overview metrics
              { icon: <FlightTakeoff />, label: 'Total Messages', value: swiftMessages.length, color: BRAND_COLOR },
              { icon: <AttachMoney />, label: 'Total Value', value: `$${(swiftMessages.reduce((sum, m) => sum + (m.amount || 0), 0) / 1000000).toFixed(1)}M`, color: '#4caf50' },
              { icon: <TrendingUp />, label: 'Forex Inflow', value: `$${(swiftMessages.filter(m => m.messageType === 'MT103' && m.status === 'SETTLED').reduce((sum, m) => sum + (m.amount || 0), 0) / 1000000).toFixed(1)}M`, color: '#2196f3' },
              { icon: <Warning />, label: 'High Value Txns', value: swiftMessages.filter(m => m.amount > 1000000).length, color: '#ff9800' },
            ] : swiftSubTab === 1 ? [
              // Sub-tab 1: Analytics & Charts - Show analytical metrics
              { icon: <Assessment />, label: 'Avg Message Value', value: `$${swiftMessages.length > 0 ? ((swiftMessages.reduce((sum, m) => sum + (m.amount || 0), 0) / swiftMessages.length) / 1000).toFixed(1) : 0}K`, color: BRAND_COLOR },
              { icon: <TrendingUp />, label: 'Success Rate', value: `${swiftMessages.length > 0 ? Math.round((swiftMessages.filter(m => m.status === 'SETTLED').length / swiftMessages.length) * 100) : 0}%`, color: '#4caf50' },
              { icon: <CheckCircle />, label: 'Settled Messages', value: swiftMessages.filter(m => m.status === 'SETTLED').length, color: '#2196f3' },
              { icon: <Category />, label: 'Message Types', value: new Set(swiftMessages.map(m => m.messageType)).size, color: '#ff9800' },
            ] : [
              // Sub-tab 2: Compliance Alerts - Show compliance metrics
              { icon: <VerifiedUser />, label: 'Compliant', value: swiftMessages.filter(m => m.status === 'SETTLED').length, color: '#4caf50' },
              { icon: <Warning />, label: 'High Value Alerts', value: swiftMessages.filter(m => m.amount > 1000000).length, color: '#ff9800' },
              { icon: <Assessment />, label: 'Under Review', value: swiftMessages.filter(m => m.status === 'DRAFT' || m.status === 'NBE_APPROVED').length, color: '#2196f3' },
              { icon: <CheckCircle />, label: 'Compliance Rate', value: `${swiftMessages.length > 0 ? Math.round((swiftMessages.filter(m => m.status === 'SETTLED').length / swiftMessages.length) * 100) : 0}%`, color: BRAND_COLOR },
            ]
          ) : tabValue === 5 ? [
            // Policy & Compliance — retention-policy KPIs (were attached to
            // tab 4 Repatriation by an off-by-one). Retention status is only
            // meaningful once forex is ALLOCATED/UTILIZED: REQUESTED/CONFIRMED
            // rows normalise to PENDING and must not inflate Review Required.
            { icon: <Gavel />, label: 'Active Coffee Policy', value: coffeeRetentionPolicy ? 1 : 0, color: BRAND_COLOR },
            { icon: <TrendingUp />, label: 'Current Retention Rate', value: coffeeRetentionPolicy ? `${coffeeRetentionPolicy.retentionRate}%` : 'Unavailable', color: '#2196f3' },
            { icon: <CheckCircle />, label: 'Retention Compliant', value: forexAllocations.filter(f => ['ALLOCATED', 'UTILIZED'].includes(f.status) && f.retentionStatus === 'COMPLIED').length, color: '#4caf50' },
            { icon: <Warning />, label: 'Review Required', value: forexAllocations.filter(f => ['ALLOCATED', 'UTILIZED'].includes(f.status) && ['PENDING', 'NON_COMPLIANT'].includes(f.retentionStatus || '')).length, color: '#ff9800' },
          ] : tabValue === 6 ? (
            // Analytics Tab - KPIs change based on sub-tab (Overview, Trends, Breakdown)
            analyticsSubTab === 0 ? [
              // Overview - Show summary of all entities
              { icon: <Assessment />, label: 'Total Contracts', value: allContracts.length, color: '#1976d2' },
              { icon: <AttachMoney />, label: 'Total Export Value (M)', value: `$${(allContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0) / 1000000).toFixed(1)}M`, color: '#4caf50' },
              { icon: <CurrencyExchange />, label: 'Forex Allocated', value: forexAllocations.filter(f => f.status === 'ALLOCATED').length, color: '#ff9800' },
              { icon: <FlightTakeoff />, label: 'SWIFT Messages', value: swiftMessages.length, color: '#9c27b0' },
            ] : analyticsSubTab === 1 ? [
              // Trends - Show growth/trend metrics
              { icon: <TrendingUp />, label: 'Monthly Growth', value: 'Unavailable', color: '#4caf50' },
              { icon: <Assessment />, label: 'Avg Contract Value', value: `$${(allContracts.length > 0 ? allContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0) / allContracts.length / 1000 : 0).toFixed(0)}K`, color: '#2196f3' },
              { icon: <CurrencyExchange />, label: 'Forex Utilization', value: `${forexAllocations.length > 0 ? Math.round((forexAllocations.filter(f => f.status === 'ALLOCATED').length / forexAllocations.length) * 100) : 0}%`, color: '#ff9800' },
              { icon: <CheckCircle />, label: 'Approved Contract Rate', value: allContracts.length ? `${Math.round((allContracts.filter(c => c.contractStatus === 'APPROVED').length / allContracts.length) * 100)}%` : 'Unavailable', color: '#9c27b0' },
            ] : [
              // Breakdown - Show by category/type
              { icon: <Category />, label: 'By Status', value: `${Math.round((allContracts.filter(c => c.contractStatus === 'APPROVED').length / (allContracts.length || 1)) * 100)}% Approved`, color: '#4caf50' },
              { icon: <AttachMoney />, label: 'Avg LC Amount', value: `$${(forexAllocations.length > 0 ? forexAllocations.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0) / forexAllocations.length / 1000 : 0).toFixed(0)}K`, color: '#2196f3' },
              { icon: <Assessment />, label: 'By Transport', value: `${Math.round((allContracts.filter(c => (c as any).transportMode === 'AIR').length / (allContracts.length || 1)) * 100)}% Air`, color: '#ff9800' },
              { icon: <TrendingUp />, label: 'Top Destination', value: topDestination, color: '#1976d2' },
            ]
          ) : tabValue === 8 ? [
            { icon: <Timeline />, label: 'Total Activities', value: auditStats.totalActivities, color: '#1976d2' },
            { icon: <Assessment />, label: 'Today\'s Actions', value: auditStats.todaysActions, color: '#4caf50' },
            { icon: <VerifiedUser />, label: 'Blockchain Verified', value: auditStats.blockchainVerified, color: '#9c27b0' },
            { icon: <AccountTree />, label: 'Organizations', value: auditStats.organizationsInvolved, color: '#ff9800' },
          ] : [
            { icon: <Assessment />, label: 'Total Forex (M)', value: Math.round(stats.totalValue / 1000000), color: BRAND_COLOR },
            { icon: <TrendingUp />, label: 'Allocations', value: forexAllocations.length, color: '#4caf50' },
            { icon: <CurrencyExchange />, label: 'Rate (ETB/USD)', value: currentRate ? currentRate.toFixed(2) : 'Unavailable', color: '#2196f3' },
            { icon: <FlightTakeoff />, label: 'SWIFT Messages', value: swiftMessages.length, color: '#9c27b0' },
          ];

          return kpis.map((kpi, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <PortalKpiCard
                brand="NBE"
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                color={kpi.color}
                onClick={kpi.onClick}
              />
            </Grid>
          ));
        })()}
      </Grid>

      {/* Remove duplicate secondary KPI section */}
      <Grid container spacing={2} mb={3} sx={{ display: 'none' }}>
        {/* Forex Monitoring Tab KPIs */}
        {tabValue === 0 && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                }
              }}
              onClick={() => setTabValue(0)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Assignment sx={{ fontSize: 20, color: '#666' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Bank Allocations
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {forexAllocations.filter(f => f.status === 'ALLOCATED').length}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      By commercial banks
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                }
              }}
              onClick={() => setTabValue(0)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Approved
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Ready for forex
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {stats.approved}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +10%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                }
              }}
              onClick={() => setTabValue(0)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Warning sx={{ fontSize: 20, color: '#ff9800' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Pending Review
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Awaiting review
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {stats.pending}
                  </Typography>
                  <Box mt={1}>
                    <Typography variant="caption" sx={{ color: stats.pending > 0 ? '#ff9800' : '#4caf50', fontWeight: 600 }}>
                      {stats.pending > 0 ? '⚠ Needs approval' : '✓ All clear'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)',
                }
              }}
              onClick={() => setTabValue(0)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance sx={{ fontSize: 20, color: BRAND_COLOR }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Total Value (USD)
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Contract value
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {formatCurrency(stats.totalValue)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +15%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
        {/* Exchange Rates Tab KPIs */}
        {tabValue === 2 && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: `2px solid ${CBE_PURPLE}`,
                boxShadow: '0 4px 8px rgba(155,48,183,0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 6px 12px rgba(155,48,183,0.25)',
                  transform: 'translateY(-2px)',
                }
              }}
              onClick={() => setTabValue(1)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Warning sx={{ fontSize: 20, color: CBE_PURPLE }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Pending Requests
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Awaiting allocation
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: CBE_PURPLE }}>
                    {forexAllocations.filter(f => f.status === 'REQUESTED').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: `2px solid ${CBE_GOLDEN}`,
                boxShadow: '0 4px 8px rgba(255,215,0,0.15)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: CBE_GOLDEN }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Total Allocated
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    USD amount
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: CBE_GOLDEN, textShadow: '0 0 1px rgba(0,0,0,0.3)' }}>
                    {formatCurrency(forexAllocations
                      .filter(f => f.status === 'ALLOCATED')
                      .reduce((sum, f) => sum + f.allocatedAmount, 0))}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      +18%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: CBE_BLACK,
                border: `2px solid ${CBE_GOLDEN}`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TrendingUp sx={{ fontSize: 20, color: CBE_GOLDEN }} />
                    <Typography variant="caption" sx={{ color: CBE_WHITE }} textTransform="uppercase" fontWeight={600}>
                      Utilization Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: CBE_WHITE }} display="block">
                    Efficiency metric
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: CBE_GOLDEN }}>
                      —
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: `2px solid ${CBE_PURPLE}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance sx={{ fontSize: 20, color: BRAND_COLOR }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Retention Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    NBE policy
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {coffeeRetentionPolicy ? `${coffeeRetentionPolicy.retentionRate}%` : 'Unavailable'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* SWIFT Monitoring Tab KPIs */}
        {tabValue === 3 && (
          <>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: '#1976d2' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      USD Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current mid-rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {exchangeRates.find(r => r.currency === 'USD' && r.status === 'ACTIVE')?.midRate.toFixed(2) || 'Unavailable'} ETB
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      —
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: '#673ab7' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      EUR Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current mid-rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {exchangeRates.find(r => r.currency === 'EUR' && r.status === 'ACTIVE')?.midRate.toFixed(2) || 'Unavailable'} ETB
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      —
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CurrencyExchange sx={{ fontSize: 20, color: '#ff5722' }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      GBP Rate
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current mid-rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#333' }}>
                    {exchangeRates.find(r => r.currency === 'GBP' && r.status === 'ACTIVE')?.midRate.toFixed(2) || 'Unavailable'} ETB
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} />
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      —
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <AccountBalance sx={{ fontSize: 20, color: BRAND_COLOR }} />
                    <Typography variant="caption" color="textSecondary" textTransform="uppercase" fontWeight={600}>
                      Last Updated
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Rate effective date
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#333' }}>
                    Today
                  </Typography>
                  <Typography variant="caption" sx={{ color: BRAND_COLOR, fontWeight: 600 }}>
                    {formatDate(new Date().toISOString())}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Professional Tabs Container */}
      <PortalCard brand="NBE" noPadding>
        <PortalTabBar
          brand="NBE"
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          tabs={visibleTabs.map((tab) => ({
            value: tab.index,
            label:
              tab.index === 0 ? `${tab.label} (${forexAllocations.length})` :
              tab.index === 1 ? `${tab.label} (${lettersOfCredit.length})` :
              tab.label,
            icon: tab.icon,
          }))}
        />

        <PortalTabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3} px={3} pt={3}>
            <Box display="flex" gap={2}>
              <SecondaryButton brand="NBE" startIcon={<Download />}>
                Export Report
              </SecondaryButton>
            </Box>
          </Box>

          <Box sx={{ bgcolor: 'white', px: 3, pb: 3 }}>
            <PortalDataGrid
              brand="NBE"
              rows={forexSubTab === 1 ? forexAllocations.filter(f => f.status === 'ALLOCATED') : forexSubTab === 2 ? forexAllocations.filter(f => f.status === 'REQUESTED') : forexAllocations}
              columns={forexColumns}
              getRowId={(row) => row.forexId}
              loading={loading}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
            />
          </Box>
        </PortalTabPanel>

        {/* LC Monitoring Tab - NEW */}
        <PortalTabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={600}>
              Letters of Credit Monitoring
            </Typography>
            <SecondaryButton brand="NBE" startIcon={<Download />}>
              Export Report
            </SecondaryButton>
          </Box>

          <PortalDataGrid brand="NBE"
            rows={lettersOfCredit.map(lc => ({ ...lc, id: lc.id }))}
            columns={[
              { 
                field: 'lc_number', 
                headerName: 'LC Number', 
                width: 180,
                renderCell: (params) => (
                  <Typography variant="body2" fontWeight={600}>
                    {params.value}
                  </Typography>
                )
              },
              { 
                field: 'contract_id', 
                headerName: 'Contract ID', 
                width: 180
              },
              { 
                field: 'exporter_id', 
                headerName: 'Exporter', 
                width: 150
              },
              { 
                field: 'amount', 
                headerName: 'Amount', 
                width: 130,
                renderCell: (params) => (
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {formatCurrency(parseFloat(params.row.amount), params.row.currency)}
                  </Typography>
                )
              },
              { 
                field: 'issuing_bank', 
                headerName: 'Issuing Bank', 
                width: 200
              },
              { 
                field: 'advising_bank', 
                headerName: 'Advising Bank', 
                width: 200
              },
              { 
                field: 'status', 
                headerName: 'Status', 
                width: 120,
                renderCell: (params) => (
                  <StatusChip status={params.value} />
                )
              },
              { 
                field: 'expiry_date', 
                headerName: 'Expiry Date', 
                width: 150,
                renderCell: (params) => formatDate(params.value)
              },
              { 
                field: 'created_at', 
                headerName: 'Issued Date', 
                width: 150,
                renderCell: (params) => formatDate(params.value)
              },
            ]}
            autoHeight
            disableRowSelectionOnClick
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3}>
            <Box display="flex" gap={2}>
              <SecondaryButton brand="NBE" startIcon={<Download />}>
                Export Rates
              </SecondaryButton>
              <PrimaryButton brand="NBE" startIcon={<Add />} onClick={() => setRateDialogOpen(true)}>
                Update Rates
              </PrimaryButton>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {exchangeRates.map((rate) => (
              <Grid item xs={12} md={4} key={rate.rateId}>
                <Card sx={{ 
                  border: '2px solid',
                  borderColor: rate.status === 'ACTIVE' ? 'success.main' : 'grey.300',
                  bgcolor: rate.status === 'ACTIVE' ? '#f1f8e9' : 'grey.100'
                }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h4" fontWeight={700}>{rate.currency}</Typography>
                      <Chip label={rate.status} color={rate.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
                    </Box>
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      {rate.midRate.toFixed(2)} ETB
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Effective: {formatDate(rate.effectiveDate)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={3}>
          {/* SWIFT Monitoring Tab - Uses NBE colors (Bronze) not CBE colors */}
          <SWIFTMonitoringWrapper 
            primaryColor={BRAND_COLOR}
            secondaryColor={SECONDARY_COLOR}
            accentColor="#333333"
            activeSubTab={swiftSubTab}
            onSubTabChange={setSwiftSubTab}
          />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={4}>
          {/* Forex Repatriation Tab */}
          <RepatriationManagementTab />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Compliance Metrics</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Minimum Price Compliance: {allContracts.length > 0 ? `${Math.round((allContracts.filter(c => (c as any).minimumPriceCompliant).length / allContracts.length) * 100)}%` : 'Unavailable'} ({allContracts.filter(c => (c as any).minimumPriceCompliant).length}/{allContracts.length} contracts at or above the $5.00/kg minimum)
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">EUDR Documentation: Unavailable</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Set Retention Policy — COFFEE</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Active policy: {coffeeRetentionPolicy ? `${coffeeRetentionPolicy.retentionRate}% retained / ${coffeeRetentionPolicy.surrenderRate}% surrendered` : 'none — allocate and retention recording are blocked until a policy is set'}. Setting a new policy supersedes the active one on-chain.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Retention Rate (%)"
                        type="number"
                        value={retentionPolicyForm.retentionRate}
                        onChange={(e) => setRetentionPolicyForm(prev => ({ ...prev, retentionRate: e.target.value }))}
                        placeholder={coffeeRetentionPolicy ? String(coffeeRetentionPolicy.retentionRate) : 'Enter a rate from 0 to 100'}
                        helperText="0–100. Always read from the active ledger policy — never assumed."
                        inputProps={{ min: 0, max: 100, step: '0.1' }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Justification"
                        value={retentionPolicyForm.justification}
                        onChange={(e) => setRetentionPolicyForm(prev => ({ ...prev, justification: e.target.value }))}
                        placeholder="NBE directive reference"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <PrimaryButton
                        brand="NBE"
                        disabled={settingPolicy || retentionPolicyForm.retentionRate === ''}
                        onClick={handleSetRetentionPolicy}
                      >
                        {settingPolicy ? 'Setting…' : 'Set Retention Policy'}
                      </PrimaryButton>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Regulatory Updates 2026</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    • Enhanced capital requirements implemented
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    • Multi-bank export authorization active
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • EUDR compliance mandatory for EU exports
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={6}>
          {/* Analytics Tab */}
          <AnalyticsDashboard 
            activeSubTab={analyticsSubTab}
            onSubTabChange={setAnalyticsSubTab}
          />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={7}>
          {/* User Management Tab */}
          <UserManagement />
        </PortalTabPanel>

        <PortalTabPanel value={tabValue} index={8}>
          {/* Audit Trail Tab */}
          <AuditTrailTable
            title="NBE Portal - Complete Transaction History"
            autoRefresh={true}
            refreshInterval={60000}
            showStats={false}
            maxHeight={700}
          />
        </PortalTabPanel>
      </PortalCard>

      {/* Approval result notification */}
      <Snackbar
        open={approvalNotification.open}
        autoHideDuration={5000}
        onClose={() => setApprovalNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={approvalNotification.success ? 'success' : 'error'}
          onClose={() => setApprovalNotification(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%', minWidth: 360 }}
          variant="filled"
        >
          {approvalNotification.message}
        </Alert>
      </Snackbar>
      {/* Contract Approval Dialog */}
      <PortalDialog
        brand="NBE"
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="sm"
        title="Approve Contract for Forex Allocation"
        actions={
          <>
            <SecondaryButton brand="NBE" onClick={() => setApprovalDialogOpen(false)}>
            Cancel
            </SecondaryButton>
            <PrimaryButton
            brand="NBE"
            disabled={!selectedContract?.minimumPriceCompliant}
            onClick={() => handleApproveContract(selectedContract!)}
            >
            Approve for Forex
            </PrimaryButton>
          </>
        }
      >
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>NBE Approval:</strong> This will approve the contract for foreign exchange allocation eligibility.
                  Only contracts meeting minimum price requirements should be approved.
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Contract ID"
                    value={selectedContract.contractId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Exporter ID"
                    value={selectedContract.exporterId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Contract Value"
                    value={formatCurrency(selectedContract.totalValue)}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Min Price Compliant"
                    value={selectedContract.minimumPriceCompliant ? 'Yes' : 'No'}
                    disabled
                    sx={{
                      '& .MuiInputBase-input': {
                        color: selectedContract.minimumPriceCompliant ? '#4caf50' : '#f44336'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <PortalField
                    fullWidth
                    label="Coffee Type & Quality"
                    value={`${selectedContract.coffeeType} - ${selectedContract.quantity} kg`}
                    disabled
                  />
                </Grid>
                
                {/* Transport Mode Display */}
                {selectedContract?.transportMode && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Transport Method & Timeline
                    </Typography>
                    <Box>
                      <Chip 
                        icon={selectedContract.transportMode === 'AIR' ? 
                          <FlightTakeoff /> : <DirectionsBoat />}
                        label={selectedContract.transportMode === 'AIR' ? 
                          'Air Freight' : 'Sea Freight'}
                        size="small"
                        color={selectedContract.transportMode === 'AIR' ? 
                          'secondary' : 'primary'}
                        sx={{ fontWeight: 600 }}
                      />
                      <Typography variant="caption" sx={{ 
                        display: 'block', 
                        mt: 0.5,
                        color: 'text.secondary'
                      }}>
                        Expected export completion: {
                          selectedContract.transportMode === 'AIR' ? 
                          '5-10 days' : '35-45 days'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                )}
                
                {/* Air Freight Forex Realization Alert */}
                {selectedContract?.transportMode === 'AIR' && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Faster Forex Realization:</strong> Air freight enables rapid export completion and payment 
                        receipt, improving forex retention timeline and exporter liquidity (typically 12-15 days vs 40-45 days for sea freight).
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <PortalField
                    fullWidth
                    label="Approval Comments"
                    multiline
                    rows={3}
                    placeholder="NBE approval comments and justification"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
      </PortalDialog>

      {/* Contract Details Dialog */}
      <PortalDialog
        brand="NBE"
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        title="Contract Details"
        actions={
          <>
            <GhostButton brand="NBE" onClick={() => setDetailsDialogOpen(false)}>Close</GhostButton>
          </>
        }
      >
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              {/* BLOCKCHAIN PROOF BADGE */}
              <BlockchainBadge
                entityId={selectedContract.contractId}
                entityType="CONTRACT"
                chaincode="coffee"
                channel="coffeechannel"
                compact
              />

              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Contract ID</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedContract.contractId}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Exporter ID</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedContract.exporterId}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={selectedContract.contractStatus || 'REGISTERED'} 
                    color={selectedContract.contractStatus === 'APPROVED' ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Registration Date</Typography>
                  <Typography variant="body1">
                    {selectedContract.registrationDate ? 
                      new Date(selectedContract.registrationDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>

                {/* Coffee Details */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Coffee Details</Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Coffee Type</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedContract.coffeeType}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedContract.quantity} kg</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Price per Kg</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    ${selectedContract.pricePerKg?.toFixed(2) || 'N/A'} {selectedContract.currency || 'USD'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Total Value</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    ${selectedContract.totalValue?.toLocaleString()} {selectedContract.currency || 'USD'}
                  </Typography>
                </Grid>

                {/* Buyer Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Buyer Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Buyer ID</Typography>
                  <Typography variant="body1">{selectedContract.buyerId || 'N/A'}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Buyer Country</Typography>
                  <Typography variant="body1">{selectedContract.buyerCountry || 'N/A'}</Typography>
                </Grid>

                {/* Banking Details */}
                {(selectedContract.buyerBank || selectedContract.exporterBank) && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Banking Details</Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    
                    {selectedContract.buyerBank && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Buyer Bank</Typography>
                        <Typography variant="body1">{selectedContract.buyerBank}</Typography>
                      </Grid>
                    )}
                    
                    {selectedContract.exporterBank && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Exporter Bank</Typography>
                        <Typography variant="body1">{selectedContract.exporterBank}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Transport Information */}
                {selectedContract.transportMode && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Transport Information</Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">Transport Mode</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                          icon={selectedContract.transportMode === 'AIR' ? 
                            <FlightTakeoff /> : <DirectionsBoat />}
                          label={selectedContract.transportMode === 'AIR' ? 
                            'Air Freight' : 'Sea Freight'}
                          size="small"
                          color={selectedContract.transportMode === 'AIR' ? 
                            'secondary' : 'primary'}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">Expected Timeline</Typography>
                      <Typography variant="body1">
                        {selectedContract.transportMode === 'AIR' ? '5-10 days' : '35-45 days'}
                      </Typography>
                    </Grid>
                  </>
                )}

                {/* Compliance */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Compliance</Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Minimum Price Compliant</Typography>
                  <Chip 
                    label={selectedContract.minimumPriceCompliant ? 'Yes' : 'No'} 
                    color={selectedContract.minimumPriceCompliant ? 'success' : 'error'}
                    size="small"
                  />
                </Grid>
                
                {selectedContract.eudrRequired !== undefined && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">EUDR Required</Typography>
                    <Chip 
                      label={selectedContract.eudrRequired ? 'Yes' : 'No'} 
                      color={selectedContract.eudrRequired ? 'warning' : 'default'}
                      size="small"
                    />
                  </Grid>
                )}
              </Grid>

              {/* Blockchain Verification Section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>🔐 Blockchain Verification</Typography>
                <Divider sx={{ mb: 2 }} />
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Hyperledger Fabric proof:</strong> The panel below checks committed transaction status, creator and endorser signatures, and certificate trust against configured MSP CA roots. A record is labeled verified only when those checks pass.
                  </Typography>
                </Alert>
                <BlockchainSignatureVerification
                  entityType="CONTRACT"
                  entityId={selectedContract.contractId}
                />
              </Box>
            </Box>
          )}
      </PortalDialog>

      {/* Forex Allocation Dialog */}
      <PortalDialog
        brand="NBE"
        open={forexDialogOpen}
        onClose={() => setForexDialogOpen(false)}
        maxWidth="md"
        title="Allocate Foreign Exchange"
        actions={
          <>
            <SecondaryButton brand="NBE" onClick={() => setForexDialogOpen(false)}>
            Cancel
            </SecondaryButton>
            <PrimaryButton
            brand="NBE"
            disabled={!forexForm.allocatedAmount || !forexForm.exchangeRate || !forexForm.retentionRate || !forexForm.nbeOfficer || !forexForm.nbeApprovalRef}
            onClick={handleAllocateForex}
            >
            Allocate Forex
            </PrimaryButton>
          </>
        }
      >
          {selectedForex && (
            <Box sx={{ pt: 2 }}>
              {(!forexForm.exchangeRate || !forexForm.retentionRate) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  An active NBE exchange rate and COFFEE retention policy are required before this allocation can be submitted.
                </Alert>
              )}
              <Alert severity="warning" sx={{ mb: 3, borderLeft: `4px solid ${BRAND_COLOR}` }}>
                <Typography variant="body2">
                  <strong>NBE Forex Allocation:</strong> This will allocate foreign exchange for the approved export contract.
                  Ensure all details are correct as this cannot be easily reversed.
                </Typography>
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Forex Request ID"
                    value={selectedForex.forexId}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Requested Amount"
                    value={formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Allocated Amount"
                    type="number"
                    value={forexForm.allocatedAmount}
                    onChange={(e) => setForexForm(prev => ({ ...prev, allocatedAmount: e.target.value }))}
                    placeholder="Enter allocated amount"
                    helperText={`Max: ${formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}`}
                    inputProps={{ 
                      step: "0.01",
                      max: selectedForex.requestedAmount
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Exchange Rate (ETB)"
                    type="number"
                    value={forexForm.exchangeRate}
                    InputProps={{ readOnly: true }}
                    helperText="Active NBE official rate from the ledger"
                    inputProps={{ step: "0.01" }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Retention Rate (%)"
                    type="number"
                    value={forexForm.retentionRate}
                    InputProps={{ readOnly: true }}
                    helperText={coffeeRetentionPolicy ? 'Active COFFEE policy from the ledger' : 'No active COFFEE policy found'}
                    inputProps={{ step: "0.1", min: "0", max: "100" }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="NBE Officer"
                    value={forexForm.nbeOfficer}
                    onChange={(e) => setForexForm(prev => ({ ...prev, nbeOfficer: e.target.value }))}
                    placeholder="NBE approving officer"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="NBE Approval Reference"
                    value={forexForm.nbeApprovalRef}
                    onChange={(e) => setForexForm(prev => ({ ...prev, nbeApprovalRef: e.target.value }))}
                    placeholder="NBE-FX-2026-XXXX"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <PortalField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    value={forexForm.expiryDate}
                    onChange={(e) => setForexForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    helperText="Forex allocation validity"
                  />
                </Grid>
                
                {/* Transport Mode Display in Forex Dialog */}
                {selectedForex.transportMode && (
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: selectedForex.transportMode === 'AIR' ? '#fff3e0' : '#e3f2fd',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: selectedForex.transportMode === 'AIR' ? '#ffb74d' : '#90caf9'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {selectedForex.transportMode === 'AIR' ? (
                          <FlightTakeoff color="secondary" />
                        ) : (
                          <DirectionsBoat color="primary" />
                        )}
                        <Typography variant="subtitle2" fontWeight={600}>
                          {selectedForex.transportMode === 'AIR' ? 'Air Freight Export' : 'Sea Freight Export'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>Expected Timeline:</strong> {
                          selectedForex.transportMode === 'AIR' ? 
                          '12-15 days total (1-3 days transit + 3-7 days document processing + 5 days settlement)' :
                          '40-45 days total (25-35 days transit + 30-40 days document processing)'
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        <strong>Forex Realization:</strong> {
                          selectedForex.transportMode === 'AIR' ? 
                          'Faster payment settlement enables quicker forex retention compliance' :
                          'Standard timeline for document presentation and payment'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                )}
                
                {/* Forex Documents Management */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <DocumentManagementPanel
                    entityType="FOREX"
                    entityId={selectedForex.forexId}
                    title="Forex Application Documents"
                    allowUpload={false}
                    allowSign={true}
                    allowedSignatureTypes={['VERIFY', 'APPROVE', 'REJECT']}
                    defaultSignatureType="VERIFY"
                    showSignatureTracker={true}
                    requiredDocuments={[
                      'CONTRACT_COPY',
                      'BANK_GUARANTEE',
                      'FOREX_APPLICATION_FORM',
                      'LC_COPY'
                    ]}
                    onDocumentSigned={(docId, data) => {
                      console.log('Forex document signed:', docId, data);
                      if (data.signatureType === 'APPROVE') {
                        // Auto-refresh forex data
                        loadData();
                      }
                    }}
                  />
                </Grid>

                {/* Blockchain Verification */}
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <BlockchainSignatureVerification
                      entityType="FOREX_ALLOCATION"
                      entityId={selectedForex.forexId}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
      </PortalDialog>
      {/* Record Retention Dialog — slice-6 fix: the retention step had no UI */}
      <PortalDialog
        brand="NBE"
        open={retentionDialogOpen}
        onClose={() => setRetentionDialogOpen(false)}
        maxWidth="sm"
        title={<>Record Forex Retention {retentionForm.forexId ? `— ${retentionForm.forexId}` : ''}</>}
        actions={
          <>
            <SecondaryButton brand="NBE" onClick={() => setRetentionDialogOpen(false)}>
            Cancel
            </SecondaryButton>
            <PrimaryButton
            brand="NBE"
            disabled={recordingRetention || !retentionForm.fcyAccountNumber || !retentionForm.retentionPercentage}
            onClick={handleRecordRetention}
            >
            {recordingRetention ? 'Recording...' : 'Record Retention'}
            </PrimaryButton>
          </>
        }
      >          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <PortalField
                  label="FCY Account Number *"
                  value={retentionForm.fcyAccountNumber}
                  onChange={(e) => setRetentionForm({ ...retentionForm, fcyAccountNumber: e.target.value })}
                  fullWidth
                  required
                  placeholder="e.g. 1000123456789"
                />
              </Grid>
              <Grid item xs={12}>
                <PortalField
                  label="Retention Percentage (%) *"
                  type="number"
                  value={retentionForm.retentionPercentage}
                  onChange={(e) => setRetentionForm({ ...retentionForm, retentionPercentage: e.target.value })}
                  fullWidth
                  required
                  inputProps={{ min: 0, max: 100, step: '0.1' }}
                  helperText={coffeeRetentionPolicy ? `Active NBE policy rate: ${coffeeRetentionPolicy.retentionRate}%` : 'NBE retention policy rate'}
                />
              </Grid>
            </Grid>
          </Box>
      </PortalDialog>
      {/* Exchange Rate Update Dialog */}
      <PortalDialog
        brand="NBE"
        open={rateDialogOpen}
        onClose={() => setRateDialogOpen(false)}
        maxWidth="sm"
        title="Update Exchange Rate"
        actions={
          <>
            <SecondaryButton brand="NBE" onClick={() => setRateDialogOpen(false)}>
            Cancel
            </SecondaryButton>
            <PrimaryButton
            brand="NBE"
            disabled={settingRate}
            onClick={handleSubmitExchangeRate}
            >
            {settingRate ? 'Setting…' : 'Set Rate'}
            </PrimaryButton>
          </>
        }
      >          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Setting a new exchange rate will supersede the current active rate for the selected currency.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={rateForm.currency}
                    label="Currency"
                    onChange={(e) => setRateForm(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <MenuItem value="USD">USD - United States Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <PortalField
                  fullWidth
                  label="Buying Rate (ETB)"
                  type="number"
                  value={rateForm.buyingRate}
                  onChange={(e) => setRateForm(prev => ({ ...prev, buyingRate: e.target.value }))}
                  placeholder="115.00"
                  helperText="NBE buying rate (must be > 0)"
                  inputProps={{ step: "0.01", min: "0" }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PortalField
                  fullWidth
                  label="Selling Rate (ETB)"
                  type="number"
                  value={rateForm.sellingRate}
                  onChange={(e) => setRateForm(prev => ({ ...prev, sellingRate: e.target.value }))}
                  placeholder="116.00"
                  helperText="NBE selling rate (must be >= buying rate)"
                  inputProps={{ step: "0.01", min: "0" }}
                />
              </Grid>
              <Grid item xs={12}>
                <PortalField
                  fullWidth
                  label="Effective Date"
                  type="date"
                  value={rateForm.effectiveDate}
                  onChange={(e) => setRateForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  helperText="Recorded with the rate; POST /forex/rates applies it from submission"
                />
              </Grid>
              <Grid item xs={12}>
                <PortalField
                  fullWidth
                  label="Justification"
                  multiline
                  rows={3}
                  value={rateForm.justification}
                  onChange={(e) => setRateForm(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Economic justification for rate change"
                />
              </Grid>
            </Grid>
          </Box>
      </PortalDialog>

      {/* Document Validation Dialog */}
      <DocumentValidationDialog
        open={validationDialogOpen}
        onClose={() => {
          setValidationDialogOpen(false);
          setValidationData(null);
        }}
        data={validationData}
        readOnly={true}
      />

      {/* Audit Trail Viewer */}
      <AuditTrailViewer
        entityType={auditEntityType}
        entityId={auditEntityId}
        open={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
      />
    </PortalShell>
  );
};

export default NBEPortal;
