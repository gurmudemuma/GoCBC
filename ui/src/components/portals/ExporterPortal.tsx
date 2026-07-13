// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exporter Portal - Complete Export Journey Management

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
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  TextField,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  ThemeProvider,
} from '@mui/material';
import { createOrganizationTheme } from '@/theme/organizationThemes';
import BankSelect from '@/components/common/BankSelect';
import { DocumentUploadDialog } from '@/components/portals/DocumentUploadDialog';
// Commented out until @mui/lab is installed
// import {
//   Timeline,
//   TimelineItem,
//   TimelineSeparator,
//   TimelineConnector,
//   TimelineContent,
//   TimelineDot,
//   TimelineOppositeContent,
// } from '@mui/lab';
import {
  Add,
  CheckCircle,
  LocalShipping,
  AccountBalance,
  Assessment,
  Visibility,
  Download,
  Upload,
  Edit,
  Warning,
  TrendingUp,
  AttachMoney,
  Description,
  Notifications,
  Assignment,
  Science,
  DirectionsBoat,
  FlightTakeoff,
  Payment,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useForm, Controller } from 'react-hook-form';
import { apiFetch, getAuthHeaders } from '@/config/api.config';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import AuditTrailViewer from './AuditTrailViewer';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import SWIFTMessagesViewWrapper from '@/components/exporter/SWIFTMessagesViewWrapper';

interface ExporterProfile {
  exporterId: string;
  companyName: string;
  ectaLicenseNumber: string;
  licenseStatus: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  licenseExpiryDate: string;
  bankName?: string;
  bankBranch?: string;
  bankBranchCode?: string;
  capitalRequirement: number;
  laboratoryCertified: boolean;
}

interface ExportContract {
  contractId: string;
  nbeReferenceNumber: string;
  buyerName: string;
  buyerCountry: string;
  origin?: string;
  buyerBank?: string;        // Issuing bank (buyer's bank)
  exporterBank?: string;     // Advising bank (exporter's bank)
  coffeeType: string;
  quantity: number;
  pricePerKg: number;
  totalValue: number;
  currency: string;
  status: 'DRAFT' | 'REGISTERED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'NBE_APPROVED';
  registrationDate?: string;
  approvalDate?: string;
}

interface ForexStatus {
  forexId: string;
  contractId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  status: 'REQUESTED' | 'ALLOCATED' | 'UTILIZED';
  expiryDate: string;
  allocationDate?: string;
  requestDate?: Date;
}

interface LCStatus {
  lcId: string;
  contractId: string;
  amount: number;
  currency: string;
  issuingBank: string;
  advisingBank: string;
  status: 'REQUESTED' | 'APPROVED' | 'ISSUED' | 'UTILIZED';
  expiryDate: string;
}

// Transport Mode Type
type TransportMode = 'SEA' | 'AIR';

interface ShipmentStatus {
  shipmentId: string;
  contractId: string;
  quantity: number;
  status: 'CREATED' | 'BOOKED' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'SHIPPED';
  transportMode?: TransportMode;
  billOfLading?: string;
  vesselName?: string;
  currentLocation?: string;
  estimatedArrival?: string;
}

interface PaymentStatus {
  paymentId: string;
  contractId: string;
  amount: number;
  currency: string;
  retainedAmount: number;
  convertedAmount: number;
  amountBirr: number;
  status: 'PENDING' | 'DOCUMENTS_SUBMITTED' | 'VERIFIED' | 'SWIFT_INITIATED' | 'SWIFT_RECEIVED' | 'SETTLED';
  swiftReference?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const ExporterPortal: React.FC = () => {
  // Brand colors for Exporter Portal - Purple and Golden theme
  const brandPrimary = '#9b30b7'; // Purple (primary accent)
  const brandSecondary = '#FFD700'; // Golden (secondary accent)
  const BRAND_COLOR = brandPrimary; // Primary brand color for components
  
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  
  // State Management
  const [profile, setProfile] = useState<ExporterProfile | null>(null);
  const [contracts, setContracts] = useState<ExportContract[]>([]);
  const [forexStatuses, setForexStatuses] = useState<ForexStatus[]>([]);
  const [lcStatuses, setLCStatuses] = useState<LCStatus[]>([]);
  const [shipments, setShipments] = useState<ShipmentStatus[]>([]);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog States
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [createContractDialogOpen, setCreateContractDialogOpen] = useState(false);
  const [createShipmentDialogOpen, setCreateShipmentDialogOpen] = useState(false);
  const [customsDeclarationDialogOpen, setCustomsDeclarationDialogOpen] = useState(false);
  const [bookShippingDialogOpen, setBookShippingDialogOpen] = useState(false);
  const [paymentSettlementDialogOpen, setPaymentSettlementDialogOpen] = useState(false);
  const [selectedShipmentForCustoms, setSelectedShipmentForCustoms] = useState<ShipmentStatus | null>(null);
  const [selectedShipmentForShipping, setSelectedShipmentForShipping] = useState<ShipmentStatus | null>(null);
  const [selectedShipmentForPayment, setSelectedShipmentForPayment] = useState<ShipmentStatus | null>(null);
  const [isSubmittingCustoms, setIsSubmittingCustoms] = useState(false);
  const [isBookingShipping, setIsBookingShipping] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [customsForm, setCustomsForm] = useState({
    hsCode: '090111',
    portOfExit: 'Djibouti Port',
    customsValue: '',
    additionalNotes: '',
    eudrCompliant: true,
  });
  const [shippingForm, setShippingForm] = useState({
    shippingLine: 'Maersk Line',
    containerType: 'DRY',
    portOfLoading: 'Djibouti Port',
    portOfDischarge: '',
    vesselName: '',
    estimatedDeparture: '',
    specialInstructions: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'LC',
    beneficiaryName: '',
    beneficiaryAccount: '',
    beneficiaryBank: '',
    beneficiaryBankBIC: '',
    swiftInstructions: '',
  });
  const [selectedContract, setSelectedContract] = useState<ExportContract | null>(null);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  
  // Document upload states
  const [contractDocUploadOpen, setContractDocUploadOpen] = useState(false);
  const [contractDocuments, setContractDocuments] = useState<any[]>([]);
  const [shipmentDocUploadOpen, setShipmentDocUploadOpen] = useState(false);
  const [shipmentDocuments, setShipmentDocuments] = useState<any[]>([]);
  
  const [newContract, setNewContract] = useState({
    buyerName: '',
    buyerCompany: '',
    buyerCountry: '',
    buyerBank: '',           // Issuing bank (buyer's bank)
    exporterBank: '',        // Advising bank (exporter's bank)
    buyerEmail: '',
    buyerPhone: '',
    coffeeType: '',
    quantity: '',
    pricePerKg: '',
    currency: 'USD',
    paymentMethod: 'LC',     // Default to Letter of Credit
    incoterm: 'FOB',
    portOfLoading: 'Djibouti',
    portOfDestination: '',
    deliveryDate: '',
    eudrRequired: true,
    organicCertified: false,
    fairTradeCertified: false,
    specialInstructions: ''
  });

  const [newShipment, setNewShipment] = useState({
    contractId: '',
    quantity: '',
    origin: '',
    grade: '',
    icoNumber: '',
    ecxLotNumber: '',
    channel: 'Direct Export',
    destination: '',
    bondReference: '',
    unionApprovalReference: '',
    eudrCompliant: true,
  });

  const isECXShipment = newShipment.channel === 'ECX';
  const isUnionShipment = newShipment.channel === 'Union';
  const isDirectExport = newShipment.channel === 'Direct Export';

  const shipmentFieldValidation = {
    icoRequired: true,
    ecxLotRequired: isECXShipment,
    unionApprovalRequired: isUnionShipment,
    bondReferenceRequired: isDirectExport,
  };

  // Forex allocation notification — shown when NBE has allocated forex for the exporter
  const [forexAllocatedAlert, setForexAllocatedAlert] = useState<{
    show: boolean;
    forexId: string;
    contractId: string;
    allocatedAmount: number;
    currency: string;
    exchangeRate: number;
  } | null>(null);

  // Real forex rate for selected shipment contract
  const [selectedShipmentForexRate, setSelectedShipmentForexRate] = useState<number>(115.5);
  
  const generateICOReference = (contractId: string, exporterId?: string) => {
    const exporterSegment = exporterId ? exporterId.replace(/\W/g, '').slice(-4).padStart(4, '0').toUpperCase() : '0000';
    const contractSegment = contractId.replace(/\W/g, '').slice(-5).padStart(5, '0').toUpperCase();
    return `ET-${exporterSegment}-${contractSegment}`;
  };

  const generateECXLotNumber = (contractId: string) => {
    const year = new Date().getFullYear();
    const contractSegment = contractId.replace(/\W/g, '').slice(-5).padStart(5, '0').toUpperCase();
    const randomSegment = Math.floor(Math.random() * 90000 + 10000);
    return `ECX-${year}-${contractSegment}-${randomSegment}`;
  };

  const applyContractToShipment = (contract: ExportContract | undefined, forexRate?: number) => {
    if (!contract) return;
    setNewShipment(prev => ({
      ...prev,
      contractId: contract.contractId,
      quantity: contract.quantity.toString(),
      origin: prev.origin || contract.origin || contract.buyerCountry || '',
      destination: contract.buyerCountry,
      icoNumber: prev.icoNumber || generateICOReference(contract.contractId, profile?.exporterId),
      ecxLotNumber: prev.ecxLotNumber || generateECXLotNumber(contract.contractId),
    }));
    if (forexRate) {
      setSelectedShipmentForexRate(forexRate);
    }
  };

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT'>('EXPORTER');
  const [auditEntityId, setAuditEntityId] = useState<string>('');
  
  // Mock Data for Testing
  useEffect(() => {
    loadMockData();
  }, []);
  
  const loadMockData = async () => {
    // Get user info from token
    const token = localStorage.getItem('authToken');
    let currentExporterId = 'EXP2120784'; // Will be updated from token
    let userInfo: any = null;
    
    if (token) {
      try {
        // Decode JWT to get user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentExporterId = payload.exporterId || payload.username;
        userInfo = payload;
        console.log('Current user:', userInfo);
      } catch (e) {
        console.warn('Could not decode token:', e);
      }
    }
    
    // Load Exporter Profile from API
    try {
      if (token) {
        const profileResponse = await apiFetch('/exporters/me/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Handle 401/404 gracefully - endpoint may not exist yet
        if (!profileResponse.ok) {
          if (profileResponse.status === 401 || profileResponse.status === 404) {
            console.log('[EXPORTER] Profile endpoint not available, using default profile');
            // Set default profile from token data
            setProfile({
              exporterId: currentExporterId,
              companyName: userInfo?.org || userInfo?.organization || 'Your Coffee Company',
              ectaLicenseNumber: userInfo?.ectaLicense || 'ECTA-LIC-2026-XXX',
              licenseStatus: 'ACTIVE',
              licenseExpiryDate: '2027-12-31',
              bankName: userInfo?.bankName || 'Commercial Bank of Ethiopia',
              bankBranch: userInfo?.bankBranch || 'Main Branch',
              bankBranchCode: userInfo?.bankBranchCode || 'CBE-001',
              capitalRequirement: 50000000,
              laboratoryCertified: true,
            });
            return; // Skip the rest of profile loading
          }
          throw new Error(`Profile API returned ${profileResponse.status}`);
        }
        
        const profileResult = await profileResponse.json();
        
        if (profileResult.success && profileResult.data) {
          const exporterData = profileResult.data;
          setProfile({
            exporterId: exporterData.exporterId || currentExporterId,
            companyName: exporterData.companyName || userInfo?.organization || 'Your Coffee Company',
            ectaLicenseNumber: exporterData.ectaLicenseNumber || userInfo?.ectaLicense || 'ECTA-LIC-2026-XXX',
            licenseStatus: exporterData.licenseStatus || 'ACTIVE',
            licenseExpiryDate: exporterData.licenseExpiryDate || '2027-12-31',
            bankName: exporterData.bankName || userInfo?.bankName,
            bankBranch: exporterData.bankBranch || userInfo?.bankBranch,
            bankBranchCode: exporterData.bankBranchCode || userInfo?.bankBranchCode,
            capitalRequirement: exporterData.capitalRequirement || 50000000,
            laboratoryCertified: exporterData.laboratoryCertified || false,
          });
          console.log('Loaded exporter profile:', exporterData);
        } else {
          // Fallback to token data if API fails
          setProfile({
            exporterId: currentExporterId,
            companyName: userInfo?.organization || 'Your Coffee Company',
            ectaLicenseNumber: userInfo?.ectaLicense || 'ECTA-LIC-2026-XXX',
            licenseStatus: 'ACTIVE',
            licenseExpiryDate: '2027-12-31',
            bankName: userInfo?.bankName,
            bankBranch: userInfo?.bankBranch,
            bankBranchCode: userInfo?.bankBranchCode,
            capitalRequirement: 50000000,
            laboratoryCertified: true,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load exporter profile, using fallback data:', error);
      // Fallback to token data
      setProfile({
        exporterId: currentExporterId,
        companyName: userInfo?.organization || 'Your Coffee Company',
        ectaLicenseNumber: userInfo?.ectaLicense || 'ECTA-LIC-2026-XXX',
        licenseStatus: 'ACTIVE',
        licenseExpiryDate: '2027-12-31',
        bankName: userInfo?.bankName,
        bankBranch: userInfo?.bankBranch,
        bankBranchCode: userInfo?.bankBranchCode,
        capitalRequirement: 50000000,
        laboratoryCertified: true,
      });
    }
    
    // Load real contracts from blockchain
    try {
      if (token) {
        const response = await apiFetch('/contracts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        console.log('Contracts API response:', result);
        if (result.success && result.data) {
          console.log('Total contracts from API:', result.data.length);
          console.log('Sample contract (if any):', result.data[0]);
          
          // Filter contracts for current exporter only  
          // Handle both camelCase (exporterId) and PascalCase (ExporterID) from blockchain
          const myContracts = result.data.filter((c: any) => {
            const contractExporterId = c.exporterID || c.exporterId || c.ExporterID;
            return contractExporterId === currentExporterId;
          });
          
          console.log(`[EXPORTER] Total contracts: ${result.data.length}`);
          console.log(`[EXPORTER] My contracts: ${myContracts.length}`);
          console.log(`[EXPORTER] Contract statuses:`, myContracts.map((c: any) => ({ 
            id: c.contractID || c.contractId, 
            status: c.contractStatus 
          })));
          
          // Map blockchain contracts to UI format
          const mappedContracts = myContracts.map((c: any, index: number) => {
            // Ensure contractId exists, generate from timestamp if missing
            const contractId = c.contractID || c.contractId || c.ContractID || 
                              `TEMP_${currentExporterId}_${index}_${Date.now()}`;
            
            // Extract bank fields - check both camelCase and PascalCase
            const buyerBank = c.buyerBank || c.BuyerBank || '';
            const exporterBank = c.exporterBank || c.ExporterBank || '';
            
            console.log(`Mapping contract: originalId=${c.contractID || c.contractId}, mappedId=${contractId}`, {
              buyerBank: buyerBank,
              exporterBank: exporterBank,
              rawData: { buyerBank: c.buyerBank, BuyerBank: c.BuyerBank, exporterBank: c.exporterBank, ExporterBank: c.ExporterBank }
            });
            
            // Extract numeric fields and ensure they're valid numbers
            const rawQuantity = c.quantity || c.Quantity || '0';
            const rawPricePerKg = c.pricePerKg || c.PricePerKg || '0';
            const rawTotalValue = c.totalValue || c.TotalValue || '0';
            
            const quantity = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) || 0 : Number(rawQuantity) || 0;
            const pricePerKg = typeof rawPricePerKg === 'string' ? parseFloat(rawPricePerKg) || 0 : Number(rawPricePerKg) || 0;
            const totalValue = typeof rawTotalValue === 'string' ? parseFloat(rawTotalValue) || 0 : Number(rawTotalValue) || 0;
            
            return {
              contractId: contractId,
              nbeReferenceNumber: c.nbeReferenceNumber || c.NBEReferenceNumber || 'Pending NBE Approval',
              buyerName: c.buyerID || c.buyerId || c.BuyerID || 'Unknown',
              buyerCountry: c.buyerCountry || c.BuyerCountry || 'Unknown',
              origin: c.origin || c.Origin || c.contractOrigin || c.contractOrigin || '',
              buyerBank: buyerBank,
              exporterBank: exporterBank,
              coffeeType: c.coffeeType || c.CoffeeType || 'Unknown',
              quantity,
              pricePerKg,
              totalValue,
              currency: c.currency || c.Currency || 'USD',
              status: c.contractStatus || c.ContractStatus || 'REGISTERED',
              registrationDate: c.registrationDate || c.RegistrationDate || new Date().toISOString(),
              approvalDate: c.approvalDate || c.ApprovalDate || ''
            };
          });
          setContracts(mappedContracts);
          console.log(`Loaded ${mappedContracts.length} contracts for exporter ${currentExporterId}`);
        } else {
          console.log('No contracts data or query failed:', result);
        }
      }
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }

    // Load LCs for current exporter
    try {
      if (token) {
        const lcResponse = await apiFetch('/banking/lc', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const lcResult = await lcResponse.json();
        if (lcResult.success && lcResult.data) {
          const myLCs = lcResult.data.filter((lc: any) => 
            (lc.exporterId || lc.ExporterID) === currentExporterId
          );
          setLCStatuses(myLCs.map((lc: any) => ({
            lcId: lc.lcId || lc.LCID,
            contractId: lc.contractId || lc.ContractID,
            amount: lc.amount || lc.Amount,
            currency: lc.currency || lc.Currency,
            status: lc.status || lc.Status,
            issuingBank: lc.issuingBank || lc.IssuingBank || 'N/A',
            advisingBank: lc.advisingBank || lc.AdvisingBank || lc.beneficiaryBank || lc.BeneficiaryBank,
            expiryDate: lc.expiryDate || lc.ExpiryDate,
          })));
          console.log(`Loaded ${myLCs.length} LCs for exporter`);
        }
      }
    } catch (error) {
      console.warn('Could not load LCs:', error);
    }

    // Load Forex allocations for current exporter
    try {
      if (token) {
        const forexResponse = await apiFetch('/forex', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const forexResult = await forexResponse.json();
        if (forexResult.success && forexResult.data) {
          const myForex = forexResult.data.filter((f: any) => 
            (f.exporterId || f.ExporterID) === currentExporterId
          );
          setForexStatuses(myForex.map((f: any) => ({
            forexId: f.forexId || f.ForexID,
            contractId: f.contractId || f.ContractID,
            requestedAmount: f.requestedAmount || f.RequestedAmount,
            allocatedAmount: f.allocatedAmount || f.AllocatedAmount,
            currency: f.currency || f.Currency,
            exchangeRate: f.exchangeRate || f.ExchangeRate,
            retentionRate: f.retentionRate || f.RetentionRate,
            status: f.status || f.Status,
            expiryDate: f.expiryDate || f.ExpiryDate,
            allocationDate: f.allocationDate || f.AllocationDate,
            requestDate: f.requestDate ? new Date(f.requestDate) : (f.RequestDate ? new Date(f.RequestDate) : undefined),
          })));
          console.log(`Loaded ${myForex.length} forex allocations for exporter`);

          // Notify exporter if any forex has been ALLOCATED and they haven't seen it
          const allocated = myForex.find((f: any) => (f.status || f.Status) === 'ALLOCATED');
          if (allocated) {
            setForexAllocatedAlert({
              show: true,
              forexId: allocated.forexId || allocated.ForexID,
              contractId: allocated.contractId || allocated.ContractID,
              allocatedAmount: allocated.allocatedAmount || allocated.AllocatedAmount || 0,
              currency: allocated.currency || allocated.Currency || 'USD',
              exchangeRate: allocated.exchangeRate || allocated.ExchangeRate || 0,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not load forex allocations:', error);
    }

    // Load Shipments for current exporter
    try {
      if (token) {
        const shipmentsResponse = await apiFetch('/shipments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const shipmentsResult = await shipmentsResponse.json();
        if (shipmentsResult.success && shipmentsResult.data) {
          const myShipments = shipmentsResult.data.filter((s: any) => 
            (s.exporterId || s.ExporterID || s.exporterID) === currentExporterId
          );
          
          // Load quality inspections to check for approved shipments
          const inspectionsResponse = await apiFetch('/quality/inspections', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const inspectionsResult = await inspectionsResponse.json();
          
          let approvedShipmentIds: Set<string> = new Set();
          if (inspectionsResult.success && inspectionsResult.data) {
            console.log('[EXPORTER] Loaded quality inspections:', inspectionsResult.data.length);
            // Find all approved inspections
            const approvedInspections = inspectionsResult.data.filter((i: any) => 
              i.status === 'APPROVED' || i.status === 'SHIPPED'
            );
            approvedShipmentIds = new Set(approvedInspections.map((i: any) => i.shipmentId || i.shipmentID));
            console.log('[EXPORTER] Approved shipment IDs:', Array.from(approvedShipmentIds));
          }
          
          setShipments(myShipments.map((s: any) => {
            const shipmentId = s.shipmentID || s.shipmentId;
            let status = s.shipmentStatus || s.Status || 'CREATED';
            
            // Update status if quality inspection is approved
            if (status === 'CREATED' && approvedShipmentIds.has(shipmentId)) {
              status = 'SHIPPED';
              console.log(`[EXPORTER] Updated shipment ${shipmentId} status to SHIPPED (quality approved)`);
            }
            
            // Ensure quantity is always a valid number
            const rawQuantity = s.quantity || s.Quantity || '0';
            const quantity = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) || 0 : Number(rawQuantity) || 0;
            
            return {
              shipmentId,
              contractId: s.contractID || s.contractId,
              quantity,
              status,
              billOfLading: s.billOfLading || s.BillOfLading,
              vesselName: s.vesselName || s.VesselName,
              currentLocation: s.currentLocation || s.CurrentLocation,
              estimatedArrival: s.estimatedArrival || s.EstimatedArrival,
            };
          }));
          console.log(`[EXPORTER] Loaded ${myShipments.length} shipments for exporter`);
        }
      }
    } catch (error) {
      console.warn('Could not load shipments:', error);
    }
    
    // Note: Forex, LC, Shipments, and Payments are loaded from blockchain above
    // If no data exists yet, these arrays remain empty (not using mock data)
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleContractView = (contract: ExportContract) => {
    setSelectedContract(contract);
    setContractDialogOpen(true);
  };
  
  const handleContractDialogClose = () => {
    setContractDialogOpen(false);
    setSelectedContract(null);
  };

  const handleCreateContract = async () => {
    setIsCreatingContract(true);
    try {
      console.log('Creating contract...', { profile, newContract });
      
      if (!profile) {
        console.error('Profile not loaded');
        showError('Profile Not Loaded', 'Your exporter profile could not be loaded', 'Please refresh the page and try again');
        return;
      }
      
      const contractId = `CONTRACT${Date.now()}`;
      const quantity = parseFloat(newContract.quantity);
      const pricePerKg = parseFloat(newContract.pricePerKg);
      
      if (isNaN(quantity) || isNaN(pricePerKg)) {
        showWarning('Invalid Input', 'Please enter valid numbers for quantity and price', 'Quantity and price must be numeric values');
        return;
      }
      
      // Prepare documents metadata - extract only IDs for blockchain
      const documentIDs = contractDocuments.map(doc => doc.documentId);
      
      const contractData = {
        contractID: contractId,
        exporterID: profile.exporterId,
        buyerID: newContract.buyerCompany.replace(/\s+/g, '_').toUpperCase(),
        buyerCountry: newContract.buyerCountry,
        buyerBank: newContract.buyerBank,           // Issuing bank
        exporterBank: newContract.exporterBank,     // Advising bank
        coffeeType: newContract.coffeeType,
        quantity,
        pricePerKg,
        currency: newContract.currency,
        paymentMethod: newContract.paymentMethod,   // LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
        eudrRequired: newContract.eudrRequired,
        documents: contractDocuments.map(doc => ({
          documentId: doc.documentId,
          fileName: doc.file.name,
          category: doc.category,
          hash: doc.hash,
          ipfsCID: doc.ipfsCID,
          description: doc.description,
          encrypted: doc.encrypt,
        }))
      };

      console.log('Sending contract data:', contractData);
      console.log(`Contract will link ${documentIDs.length} documents to blockchain:`, documentIDs);

      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again to continue');
        return;
      }

      // Call API to register contract on blockchain
      const response = await apiFetch('/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contractData)
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        showSuccess(
          'Contract Registered Successfully',
          'Your export contract has been registered on the blockchain',
          `Contract ID: ${contractId}\n\nNext Steps:\n1. ECTA will review compliance\n2. NBE will approve for forex allocation\n3. You can track progress in the "My Contracts" tab`
        );
        setCreateContractDialogOpen(false);
        setNewContract({
          buyerName: '',
          buyerCompany: '',
          buyerCountry: '',
          buyerBank: '',
          exporterBank: '',
          buyerEmail: '',
          buyerPhone: '',
          coffeeType: '',
          quantity: '',
          pricePerKg: '',
          currency: 'USD',
          paymentMethod: 'LC',
          incoterm: 'FOB',
          portOfLoading: 'Djibouti',
          portOfDestination: '',
          deliveryDate: '',
          eudrRequired: true,
          organicCertified: false,
          fairTradeCertified: false,
          specialInstructions: ''
        });
        setContractDocuments([]); // Clear uploaded documents
        // Reload contracts
        loadMockData();
      } else {
        console.error('Contract registration failed:', result);
        showError(
          'Contract Registration Failed',
          result.error?.message || 'Failed to register contract',
          'Please verify all information and try again'
        );
      }
    } catch (error: any) {
      console.error('Error creating contract:', error);
      showError(
        'Network Error',
        'Failed to register contract',
        error.message || 'Please check if the API server is running and try again'
      );
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handleCreateShipment = async () => {
    setIsCreatingShipment(true);
    try {
      if (!profile) {
        showError('Profile Not Loaded', 'Your exporter profile could not be loaded', 'Please refresh the page and try again');
        return;
      }

      const selectedContract = contracts.find((c: any) => c.contractId === newShipment.contractId);
      if (!selectedContract) {
        showError('Contract Not Found', 'Selected contract could not be found', 'Please select a valid contract');
        return;
      }

      const quantity = parseFloat(newShipment.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        showWarning('Invalid Quantity', 'Please enter a valid quantity', 'Quantity must be a positive number');
        return;
      }

      if (quantity > selectedContract.quantity) {
        showWarning('Quantity Exceeds Contract', `Maximum quantity: ${selectedContract.quantity} kg`, 'Shipment quantity cannot exceed contract quantity');
        return;
      }

      const shipmentId = `SHIP${Date.now()}`;
      // Use real forex rate from the allocated forex for this contract, fallback to 115.5
      const forexRate = selectedShipmentForexRate || 115.5;
      const valueUSD = quantity * selectedContract.pricePerKg;
      const icoNumber = newShipment.icoNumber || generateICOReference(newShipment.contractId, profile.exporterId);
      const ecxLotNumber = shipmentFieldValidation.ecxLotRequired
        ? (newShipment.ecxLotNumber || generateECXLotNumber(newShipment.contractId))
        : newShipment.ecxLotNumber;

      if (shipmentFieldValidation.ecxLotRequired && !newShipment.ecxLotNumber) {
        showWarning('Missing ECX Lot Number', 'Please enter the ECX lot number for ECX channel shipments', 'ECX Lot Number is required when channel is ECX');
        return;
      }
      if (shipmentFieldValidation.unionApprovalRequired && !newShipment.unionApprovalReference) {
        showWarning('Missing Union Approval', 'Please enter the union approval reference for Union/Cooperative shipments', 'Union Approval Reference is required when channel is Union/Cooperative');
        return;
      }
      if (shipmentFieldValidation.bondReferenceRequired && !newShipment.bondReference) {
        showWarning('Missing Bond Reference', 'Please enter the bond reference for Direct Export shipments', 'Bond Reference is required when channel is Direct Export');
        return;
      }

      // Prepare documents metadata - extract only IDs for blockchain
      const documentIDs = shipmentDocuments.map(doc => doc.documentId);

      const shipmentData = {
        shipmentID: shipmentId,
        contractID: newShipment.contractId,
        exporterID: profile.exporterId,
        buyerID: selectedContract.buyerName,
        origin: newShipment.origin,
        quantity,
        grade: newShipment.grade,
        icoNumber,
        ecxLotNumber,
        channel: newShipment.channel,
        bondReference: newShipment.bondReference,
        unionApprovalReference: newShipment.unionApprovalReference,
        forexRate,
        valueUSD,
        eudrCompliant: newShipment.eudrCompliant,
        documents: shipmentDocuments.map(doc => ({
          documentId: doc.documentId,
          fileName: doc.file.name,
          category: doc.category,
          hash: doc.hash,
          ipfsCID: doc.ipfsCID,
          description: doc.description,
          encrypted: doc.encrypt,
        }))
      };

      console.log(`Shipment will link ${documentIDs.length} documents to blockchain:`, documentIDs);

      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again to continue');
        return;
      }

      const response = await apiFetch('/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(shipmentData)
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(
          '🎉 Shipment Registered & Quality Inspection Requested',
          `Shipment ${shipmentId} has been registered on the blockchain.`,
          `✅ Quality Inspection Request automatically sent to ECTA\n\n` +
          `What happens next:\n` +
          `1. ECTA Q-Grader will schedule physical & cupping inspection (2-3 business days)\n` +
          `2. Inspector evaluates: moisture content, defects, bean size, cupping score (SCA protocol)\n` +
          `3. If quality passes (Grade 1-5) → ECTA approves & issues Export Permit\n` +
          `4. You can then proceed to: Customs Declaration → Shipping → Payment Settlement\n\n` +
          `Track progress in the "Shipments" tab. You'll be notified when inspection is complete.`
        );
        setCreateShipmentDialogOpen(false);
        setNewShipment({
          contractId: '',
          quantity: '',
          origin: '',
          grade: '',
          icoNumber: '',
          ecxLotNumber: '',
          bondReference: '',
          unionApprovalReference: '',
          channel: 'Direct Export',
          destination: '',
          eudrCompliant: true,
        });
        setShipmentDocuments([]); // Clear uploaded documents
        setSelectedShipmentForexRate(115.5);
        loadMockData(); // Reload to show new shipment
      } else {
        showError(
          'Shipment Creation Failed',
          result.error?.message || 'Failed to create shipment',
          'Please verify all information and try again'
        );
      }
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      showError(
        'Network Error',
        'Failed to create shipment',
        error.message || 'Please check if the API server is running and try again'
      );
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleSubmitCustomsDeclaration = async () => {
    if (!selectedShipmentForCustoms || !profile) {
      showError('Error', 'Shipment or profile not loaded', 'Please try again');
      return;
    }

    setIsSubmittingCustoms(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }

      const selectedContract = contracts.find(c => c.contractId === selectedShipmentForCustoms.contractId);
      const declarationId = `CD-${selectedShipmentForCustoms.shipmentId}`;
      
      const declarationData = {
        declarationID: declarationId,
        shipmentID: selectedShipmentForCustoms.shipmentId,
        exporterID: profile.exporterId,
        declarationType: customsForm.eudrCompliant ? 'EUDR_ENHANCED' : 'STANDARD',
        hsCode: customsForm.hsCode,
        quantity: selectedShipmentForCustoms.quantity,
        value: customsForm.customsValue || (selectedShipmentForCustoms.quantity * 9.25),
        currency: selectedContract?.currency || 'USD',
        destination: selectedContract?.buyerCountry || 'Unknown',
        portOfExit: customsForm.portOfExit,
        eudrCompliant: customsForm.eudrCompliant,
        additionalNotes: customsForm.additionalNotes,
      };

      const response = await apiFetch('/customs/declaration/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(declarationData)
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(
          '🛃 Customs Declaration Submitted Successfully',
          `Declaration ${declarationId} submitted to Ethiopian Customs Commission`,
          'What happens next:\n' +
          '• ECC customs officer reviews declaration & documents (1-3 days)\n' +
          '• Physical inspection may be scheduled based on risk assessment\n' +
          '• EUDR compliance verified for EU destinations\n' +
          '• Customs clearance issued upon approval\n\n' +
          'You will be notified of any updates. Track status in Shipments tab.'
        );
        setCustomsDeclarationDialogOpen(false);
        setSelectedShipmentForCustoms(null);
        setCustomsForm({
          hsCode: '090111',
          portOfExit: 'Djibouti Port',
          customsValue: '',
          additionalNotes: '',
          eudrCompliant: true,
        });
        loadMockData(); // Reload to update status
      } else {
        showError(
          'Customs Declaration Failed',
          result.error?.message || 'Failed to submit declaration',
          'Please verify all information and try again. Ensure all required documents are uploaded.'
        );
      }
    } catch (error: any) {
      console.error('Error submitting customs declaration:', error);
      showError(
        'Network Error',
        'Failed to submit customs declaration',
        error.message || 'Please check if the API server is running and try again'
      );
    } finally {
      setIsSubmittingCustoms(false);
    }
  };

  const handleBookShipping = async () => {
    if (!selectedShipmentForShipping || !profile) {
      showError('Error', 'Shipment or profile not loaded', 'Please try again');
      return;
    }

    setIsBookingShipping(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }

      const selectedContract = contracts.find(c => c.contractId === selectedShipmentForShipping.contractId);
      const bookingId = `BOOK-${selectedShipmentForShipping.shipmentId}`;
      const containerNumber = `CONT${Date.now()}`;
      const billOfLading = `BL-${Date.now()}`;
      
      const bookingData = {
        bookingID: bookingId,
        shipmentID: selectedShipmentForShipping.shipmentId,
        exporterID: profile.exporterId,
        shippingLine: shippingForm.shippingLine,
        containerNumber,
        containerType: shippingForm.containerType,
        portOfLoading: shippingForm.portOfLoading,
        portOfDischarge: shippingForm.portOfDischarge,
        vesselName: shippingForm.vesselName || 'TBD - Assigned by shipping line',
        estimatedDeparture: shippingForm.estimatedDeparture,
        estimatedArrival: new Date(new Date(shippingForm.estimatedDeparture).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        billOfLading,
        weight: selectedShipmentForShipping.quantity,
        specialInstructions: shippingForm.specialInstructions,
      };

      // For now, just update shipment status to SHIPPED
      // In production, this would call a shipping/booking API
      const response = await apiFetch('/shipments/${selectedShipmentForShipping.shipmentId}/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'SHIPPED' })
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(
          '🚢 Shipping Booked Successfully',
          `Container booking confirmed for ${selectedShipmentForShipping.shipmentId}`,
          `Container: ${containerNumber}\n` +
          `Bill of Lading: ${billOfLading}\n` +
          `Shipping Line: ${shippingForm.shippingLine}\n` +
          `Port of Loading: ${shippingForm.portOfLoading}\n` +
          `Estimated Departure: ${new Date(shippingForm.estimatedDeparture).toLocaleDateString()}\n\n` +
          'What happens next:\n' +
          '• Container loading scheduled at port\n' +
          '• Vessel departure tracking activated\n' +
          '• You can track shipment in real-time\n' +
          '• After delivery, proceed to Payment Settlement'
        );
        setBookShippingDialogOpen(false);
        setSelectedShipmentForShipping(null);
        setShippingForm({
          shippingLine: 'Maersk Line',
          containerType: 'DRY',
          portOfLoading: 'Djibouti Port',
          portOfDischarge: '',
          vesselName: '',
          estimatedDeparture: '',
          specialInstructions: '',
        });
        loadMockData(); // Reload to update status
      } else {
        showError(
          'Shipping Booking Failed',
          result.error?.message || 'Failed to book shipping',
          'Please verify all information and try again.'
        );
      }
    } catch (error: any) {
      console.error('Error booking shipping:', error);
      showError(
        'Network Error',
        'Failed to book shipping',
        error.message || 'Please check if the API server is running and try again'
      );
    } finally {
      setIsBookingShipping(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedShipmentForPayment || !profile) {
      showError('Error', 'Shipment or profile not loaded', 'Please try again');
      return;
    }

    setIsInitiatingPayment(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }

      const selectedContract = contracts.find(c => c.contractId === selectedShipmentForPayment.contractId);
      const selectedLC = lcStatuses.find(lc => lc.contractId === selectedShipmentForPayment.contractId);
      const selectedForex = forexStatuses.find(fx => fx.contractId === selectedShipmentForPayment.contractId);
      
      if (!selectedLC) {
        showError('LC Not Found', 'No Letter of Credit found for this contract', 'Cannot initiate payment without LC');
        return;
      }

      const paymentId = `PAY-${selectedShipmentForPayment.shipmentId}`;
      
      const paymentData = {
        paymentID: paymentId,
        contractID: selectedShipmentForPayment.contractId,
        exporterID: profile.exporterId,
        lcID: selectedLC.lcId,
        amount: selectedContract ? (selectedShipmentForPayment.quantity * selectedContract.pricePerKg).toString() : '0',
        currency: selectedContract?.currency || 'USD',
        receivingBank: paymentForm.beneficiaryBank || profile.bankName || '',
        receivingBankBIC: paymentForm.beneficiaryBankBIC || '',
        beneficiaryName: paymentForm.beneficiaryName || profile.companyName || '',
        beneficiaryAccount: paymentForm.beneficiaryAccount || '',
        paymentMethod: paymentForm.paymentMethod,
      };

      const response = await apiFetch('/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      if (result.success) {
        const amountUSD = selectedContract ? (selectedShipmentForPayment.quantity * selectedContract.pricePerKg) : 0;
        const exchangeRate = selectedForex?.exchangeRate || 115.5;
        const retentionRate = selectedForex?.retentionRate || 100;
        const amountETB = amountUSD * exchangeRate;
        const retainedETB = (amountETB * retentionRate) / 100;
        
        showSuccess(
          '💰 Payment Settlement Initiated',
          `Payment process started for ${selectedShipmentForPayment.shipmentId}`,
          `Payment ID: ${paymentId}\n` +
          `Amount: $${amountUSD.toLocaleString()} USD\n` +
          `Exchange Rate: ${exchangeRate} ETB/USD\n` +
          `Amount in ETB: ${amountETB.toLocaleString()} ETB\n` +
          `NBE Retention: ${retentionRate}% = ${retainedETB.toLocaleString()} ETB\n\n` +
          'What happens next:\n' +
          '• Bank reviews and verifies shipping documents\n' +
          '• SWIFT payment initiated by buyer\'s bank\n' +
          '• NBE processes forex conversion & retention\n' +
          '• Funds credited to your account (3-5 business days)\n' +
          '• Transaction complete - export cycle finished!'
        );
        setPaymentSettlementDialogOpen(false);
        setSelectedShipmentForPayment(null);
        setPaymentForm({
          paymentMethod: 'LC',
          beneficiaryName: '',
          beneficiaryAccount: '',
          beneficiaryBank: '',
          beneficiaryBankBIC: '',
          swiftInstructions: '',
        });
        loadMockData();
      } else {
        showError(
          'Payment Initiation Failed',
          result.error?.message || 'Failed to initiate payment',
          'Please verify all information and try again.'
        );
      }
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      showError(
        'Network Error',
        'Failed to initiate payment',
        error.message || 'Please check if the API server is running and try again'
      );
    } finally {
      setIsInitiatingPayment(false);
    }
  };
  
  // Calculate Dashboard KPIs from real blockchain data
  const activeContracts = contracts.filter(c => 
    c.status === 'ACTIVE' || 
    c.status === 'APPROVED' || 
    c.status === 'NBE_APPROVED' ||
    c.status === 'REGISTERED'
  ).length;
  
  const pendingApprovals = contracts.filter(c => 
    c.status === 'REGISTERED' && !c.approvalDate
  ).length;
  
  const inTransitShipments = shipments.filter(s => 
    s.status === 'IN_TRANSIT' || 
    s.status === 'DEPARTED' ||
    s.status === 'SHIPPED'
  ).length;
  
  const totalExportValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);

  
  const contractColumns: GridColDef[] = [
    { field: 'contractId', headerName: 'Contract ID', width: 150 },
    { field: 'buyerName', headerName: 'Buyer', width: 200 },
    { field: 'buyerCountry', headerName: 'Country', width: 120 },
    { field: 'coffeeType', headerName: 'Coffee Type', width: 150 },
    { 
      field: 'quantity', 
      headerName: 'Quantity (kg)', 
      width: 130,
      valueFormatter: (params) => params.value ? Number(params.value).toLocaleString() : '0',
    },
    { 
      field: 'totalValue', 
      headerName: 'Value', 
      width: 120,
      valueFormatter: (params) => params.value ? `$${Number(params.value).toLocaleString()}` : '$0',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <StatusChip status={params.value === 'NBE_APPROVED' ? 'APPROVED' : params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Contract Details">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleContractView(params.row)}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download Contract PDF">
            <IconButton
              size="small"
              color="success"
              onClick={() => {
                showSuccess(
                  'Contract Download',
                  `Generating PDF for Contract ${params.row.contractId}...\n\n` +
                  `This will include:\n` +
                  `• Contract details\n` +
                  `• Buyer information\n` +
                  `• Coffee specifications\n` +
                  `• Payment terms\n` +
                  `• NBE approval stamp`
                );
              }}
            >
              <Download />
            </IconButton>
          </Tooltip>
          {(params.row.status === 'REGISTERED' || params.row.status === 'APPROVED') && (
            <Tooltip title="Edit Contract">
              <IconButton
                size="small"
                color="warning"
                onClick={() => {
                  showInfo(
                    'Edit Contract',
                    `Edit Contract ${params.row.contractId}\n\n` +
                    `You can modify:\n` +
                    `• Buyer contact details\n` +
                    `• Shipping preferences\n` +
                    `• Additional notes\n\n` +
                    `Core terms (price, quantity, quality) require amendment approval.`
                  );
                }}
              >
                <Edit />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // Create EXPORTER theme with purple and golden colors
  const exporterTheme = createOrganizationTheme('EXPORTER');

  return (
    <ThemeProvider theme={exporterTheme}>
      <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
        {/* Forex Allocation Notification Banner */}
        {forexAllocatedAlert?.show && (
          <Alert
            severity="success"
            sx={{ mb: 3, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
            onClose={() => setForexAllocatedAlert(null)}
            action={
              <AnimatedButton
                size="small"
                variant="contained"
                brandColor={brandPrimary}
                onClick={() => {
                  setForexAllocatedAlert(null);
                  setCreateShipmentDialogOpen(true);
                  // Pre-select the contract from this forex allocation
                  const forex = forexStatuses.find(f => f.forexId === forexAllocatedAlert.forexId);
                  if (forex) {
                    const contract = contracts.find(c => c.contractId === forex.contractId);
                    applyContractToShipment(contract, forex.exchangeRate);
                  }
                }}
              >
                Register Shipment
              </AnimatedButton>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              🎉 NBE Forex Allocated — Proceed to Coffee Procurement & Shipment Registration
            </Typography>
            <Typography variant="body2">
              NBE has allocated <strong>${forexAllocatedAlert.allocatedAmount.toLocaleString()} {forexAllocatedAlert.currency}</strong> for contract <strong>{forexAllocatedAlert.contractId}</strong>
              {' '}at <strong>{forexAllocatedAlert.exchangeRate} ETB/USD</strong> (40% retained in USD, 60% converted to ETB).
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <strong>Your next steps:</strong>
              {' '}① Purchase your coffee lot at ECX warehouse and obtain the <strong>ECX Lot Number</strong> and warehouse receipt
              → ② Return here and register the shipment with that lot number
              → ③ ECTA will inspect the physical coffee and issue an <strong>Export Permit</strong>
              → ④ Submit customs declaration to ECC
              → ⑤ Arrange shipping from Djibouti/dry port
            </Typography>
          </Alert>
        )}
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Exporter Portal
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Welcome, {profile?.companyName || 'Loading...'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              {profile && (
                <Card sx={{ display: 'inline-block', px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    ECTA License
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatusChip status={profile.licenseStatus} />
                    <Typography variant="body2" fontWeight="bold">
                      {profile.ectaLicenseNumber}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Expires: {new Date(profile.licenseExpiryDate).toLocaleDateString()}
                  </Typography>
                </Card>
              )}
            </Grid>
          </Grid>
        </Box>

        {/* KPI Cards - Always Visible */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="Active Contracts"
              value={activeContracts}
              icon={<CheckCircle />}
              trend="up"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="Pending Approvals"
              value={pendingApprovals}
              icon={<Warning />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="In Transit"
              value={inTransitShipments}
              icon={<LocalShipping />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardKPI
              title="Total Export Value"
              value={`$${totalExportValue.toLocaleString()}`}
              icon={<AttachMoney />}
              trend="up"
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Dashboard" icon={<Assessment />} iconPosition="start" />
            <Tab label="My Contracts" icon={<Description />} iconPosition="start" />
            <Tab label="Forex & Banking" icon={<AccountBalance />} iconPosition="start" />
            <Tab label="Shipments" icon={<LocalShipping />} iconPosition="start" />
            <Tab label="Documents" icon={<Description />} iconPosition="start" />
            <Tab label="LC & Payments" icon={<AttachMoney />} iconPosition="start" />
            <Tab label="Reports" icon={<TrendingUp />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          {/* Dashboard Tab */}
          <Grid container spacing={3}>

            {/* Exporter Profile & License Information */}
            {profile && (
              <Grid item xs={12}>
                <ModernCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          🏢 Exporter Profile & License Information
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Your company and licensing details
                        </Typography>
                      </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Assignment />}
                        onClick={() => {
                          setAuditEntityType('EXPORTER');
                          setAuditEntityId(profile.exporterId);
                          setShowAuditTrail(true);
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Audit Trail
                      </Button>
                      <StatusChip
                        status={profile.licenseStatus === 'ACTIVE' ? 'approved' : 'rejected'}
                        label={profile.licenseStatus}
                        brandColor={brandPrimary}
                      />
                    </Box>
                  </Box>

                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    {/* Company Information */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Company Information
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Company Name</Typography>
                            <Typography variant="body1" fontWeight={600}>{profile.companyName}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Exporter ID</Typography>
                            <Typography variant="body1" fontWeight={600} color="primary">{profile.exporterId}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Capital Requirement</Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(profile.capitalRequirement)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">Laboratory Status</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={profile.laboratoryCertified ? '✓ Certified' : '✗ Not Certified'}
                                size="small"
                                color={profile.laboratoryCertified ? 'success' : 'default'}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>

                    {/* License & Banking Information */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          License & Banking Information
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box>
                            <Typography variant="caption" color="textSecondary">ECTA License Number</Typography>
                            <Typography variant="body1" fontWeight={600}>{profile.ectaLicenseNumber}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="textSecondary">License Expiry Date</Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {new Date(profile.licenseExpiryDate).toLocaleDateString('en-US', { 
                                year: 'numeric', month: 'long', day: 'numeric' 
                              })}
                            </Typography>
                          </Box>
                          {profile.bankName && (
                            <>
                              <Box>
                                <Typography variant="caption" color="textSecondary">LC Processing Bank</Typography>
                                <Typography variant="body1" fontWeight={600}>{profile.bankName}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="textSecondary">LC Processing Branch</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1" fontWeight={600}>
                                    {profile.bankBranch}
                                  </Typography>
                                  {profile.bankBranchCode && (
                                    <Chip 
                                      label={profile.bankBranchCode} 
                                      size="small" 
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                                  ✓ All Letter of Credit requests will be processed through this branch
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </ModernCard>
            </Grid>
          )}

          {/* Export Activity Trends Chart */}
          <Grid item xs={12} md={8}>
            <ModernCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Export Activity Trends
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Contract value and volume over time
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label="Value" 
                      size="small" 
                      sx={{ bgcolor: brandPrimary, color: 'white' }}
                    />
                    <Chip 
                      label="Volume" 
                      size="small" 
                      sx={{ bgcolor: brandSecondary, color: '#000000' }}
                    />
                  </Box>
                </Box>
                
                {/* Line Chart */}
                <Box sx={{ height: 350, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(() => {
                        // Generate trend data from contracts
                        const monthlyData: Record<string, { month: string; value: number; volume: number; count: number }> = {};
                        
                        // Initialize last 6 months
                        for (let i = 5; i >= 0; i--) {
                          const date = new Date();
                          date.setMonth(date.getMonth() - i);
                          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
                          const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          monthlyData[monthKey] = { month: monthLabel, value: 0, volume: 0, count: 0 };
                        }
                        
                        // Aggregate contract data by month
                        contracts.forEach(contract => {
                          if (contract.registrationDate) {
                            const monthKey = contract.registrationDate.slice(0, 7);
                            if (monthlyData[monthKey]) {
                              monthlyData[monthKey].value += contract.totalValue || 0;
                              monthlyData[monthKey].volume += contract.quantity || 0;
                              monthlyData[monthKey].count += 1;
                            }
                          }
                        });
                        
                        return Object.values(monthlyData);
                      })()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke="#000000"
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        stroke={brandPrimary}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        stroke={brandSecondary}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}T`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid rgba(0, 0, 0, 0.2)',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'value') return [`$${value.toLocaleString()}`, 'Total Value'];
                          if (name === 'volume') return [`${value.toLocaleString()} kg`, 'Volume'];
                          return [value, name];
                        }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="value" 
                        stroke={brandPrimary} 
                        strokeWidth={3}
                        dot={{ fill: brandPrimary, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Contract Value"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="volume" 
                        stroke={brandSecondary} 
                        strokeWidth={3}
                        dot={{ fill: brandSecondary, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Volume (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                
                {/* Chart Summary Stats */}
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={700} color="primary">
                      ${totalExportValue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total Export Value
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      {(contracts.reduce((sum, c) => sum + c.quantity, 0) / 1000).toFixed(1)}T
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total Volume (tons)
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={700} color="secondary.main">
                      {contracts.length}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total Contracts
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: brandSecondary }}>
                      {contracts.length > 0 ? `$${(totalExportValue / contracts.length).toLocaleString()}` : '$0'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Avg Contract Value
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>

          {/* Quick Stats Cards */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          This Month
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {(() => {
                            const thisMonth = new Date().toISOString().slice(0, 7);
                            return contracts.filter(c => c.registrationDate?.startsWith(thisMonth)).length;
                          })()}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          New Contracts
                        </Typography>
                      </Box>
                      <Description sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          Success Rate
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {contracts.length > 0 
                            ? Math.round((contracts.filter(c => c.status === 'APPROVED' || c.status === 'NBE_APPROVED' || c.status === 'ACTIVE').length / contracts.length) * 100)
                            : 0}%
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Approval Rate
                        </Typography>
                      </Box>
                      <CheckCircle sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          In Progress
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {inTransitShipments + pendingApprovals}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Active Items
                        </Typography>
                      </Box>
                      <LocalShipping sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>


        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* My Contracts Tab */}
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">My Sales Contracts</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{ bgcolor: brandPrimary }}
              onClick={() => {
                // Pre-fill exporter's advising bank from their registered profile bank
                if (profile?.bankName) {
                  setNewContract(prev => ({ ...prev, exporterBank: profile.bankName! }));
                }
                setCreateContractDialogOpen(true);
              }}
            >
              Register New Contract
            </Button>
          </Box>

          <DataGrid
            rows={contracts}
            columns={contractColumns}
            getRowId={(row) => row.contractId}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            sx={{
              '& .MuiDataGrid-row:hover': {
                bgcolor: 'action.hover',
              },
            }}
          />
        </Box>

        {/* Contract Details Dialog */}
        <Dialog 
          open={contractDialogOpen} 
          onClose={handleContractDialogClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Contract Details
            {selectedContract && (
              <Typography variant="body2" color="text.secondary">
                {selectedContract.contractId}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {selectedContract && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Status:</strong> <StatusChip status={selectedContract.status === 'NBE_APPROVED' ? 'APPROVED' : selectedContract.status} />
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Buyer Name</Typography>
                  <Typography variant="body1">{selectedContract.buyerName}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Buyer Country</Typography>
                  <Typography variant="body1">{selectedContract.buyerCountry}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Coffee Type</Typography>
                  <Typography variant="body1">{selectedContract.coffeeType}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Quantity</Typography>
                  <Typography variant="body1">{selectedContract.quantity ? Number(selectedContract.quantity).toLocaleString() : '0'} kg</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Price per kg</Typography>
                  <Typography variant="body1">${selectedContract.pricePerKg.toFixed(2)}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Total Value</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    ${selectedContract.totalValue ? Number(selectedContract.totalValue).toLocaleString() : '0'} {selectedContract.currency}
                  </Typography>
                </Grid>
                
                {selectedContract.registrationDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                    <Typography variant="body1">
                      {new Date(selectedContract.registrationDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
                
                {selectedContract.approvalDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">NBE Approval Date</Typography>
                    <Typography variant="body1">
                      {new Date(selectedContract.approvalDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
                
                {selectedContract.nbeReferenceNumber && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">NBE Reference Number</Typography>
                    <Typography variant="body1">{selectedContract.nbeReferenceNumber}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleContractDialogClose}>Close</Button>
            <Button variant="contained" startIcon={<Download />}>
              Download PDF
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Contract Dialog */}
        <Dialog 
          open={createContractDialogOpen} 
          onClose={() => setCreateContractDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: brandPrimary, color: 'white' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Description />
              <Box>
                <Typography variant="h6">Register New Sales Contract</Typography>
                <Typography variant="caption">Complete all required fields to register your export contract</Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info" icon={<Warning />}>
                  <Typography variant="body2">
                    <strong>Important:</strong> All contracts must comply with ECTA regulations and will be subject to NBE approval for forex allocation. Minimum FOB price: $5.00/kg
                  </Typography>
                </Alert>
              </Grid>

              {/* Buyer Information Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brandPrimary }}>
                  <AccountBalance /> Buyer Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Person Name"
                  value={newContract.buyerName}
                  onChange={(e) => setNewContract({...newContract, buyerName: e.target.value})}
                  required
                  helperText="Full name of buyer representative"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={newContract.buyerCompany}
                  onChange={(e) => setNewContract({...newContract, buyerCompany: e.target.value})}
                  required
                  helperText="Registered company name"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Buyer Country</InputLabel>
                  <Select
                    value={newContract.buyerCountry}
                    label="Buyer Country"
                    onChange={(e) => setNewContract({...newContract, buyerCountry: e.target.value})}
                  >
                    <MenuItem value="Germany">Germany</MenuItem>
                    <MenuItem value="United States">United States</MenuItem>
                    <MenuItem value="Japan">Japan</MenuItem>
                    <MenuItem value="Saudi Arabia">Saudi Arabia</MenuItem>
                    <MenuItem value="Belgium">Belgium</MenuItem>
                    <MenuItem value="Italy">Italy</MenuItem>
                    <MenuItem value="South Korea">South Korea</MenuItem>
                    <MenuItem value="France">France</MenuItem>
                    <MenuItem value="United Kingdom">United Kingdom</MenuItem>
                    <MenuItem value="Netherlands">Netherlands</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <BankSelect
                  value={newContract.buyerBank}
                  onChange={(value) => setNewContract({...newContract, buyerBank: value})}
                  label="Buyer's Bank (Issuing Bank)"
                  helperText="Bank that will open the LC (must be different from exporter's bank)"
                  type="international"
                  excludeBank={newContract.exporterBank}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <BankSelect
                  value={newContract.exporterBank}
                  onChange={(value) => setNewContract({...newContract, exporterBank: value})}
                  label="Exporter's Bank (Advising Bank)"
                  helperText={
                    profile?.bankName && newContract.exporterBank === profile.bankName
                      ? `✅ Pre-filled from your registered bank`
                      : "Your Ethiopian bank that will receive the LC"
                  }
                  type="ethiopian"
                  excludeBank={newContract.buyerBank}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={newContract.buyerEmail}
                  onChange={(e) => setNewContract({...newContract, buyerEmail: e.target.value})}
                  required
                  helperText="Business email for communication"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={newContract.buyerPhone}
                  onChange={(e) => setNewContract({...newContract, buyerPhone: e.target.value})}
                  placeholder="+1-555-123-4567"
                  helperText="Include country code"
                />
              </Grid>

              {/* Coffee Specification Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brandPrimary, mt: 2 }}>
                  <LocalShipping /> Coffee Specification
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Coffee Type</InputLabel>
                  <Select
                    value={newContract.coffeeType}
                    label="Coffee Type"
                    onChange={(e) => setNewContract({...newContract, coffeeType: e.target.value})}
                  >
                    <MenuItem value="Yirgacheffe Grade 1">Yirgacheffe Grade 1 - Washed</MenuItem>
                    <MenuItem value="Yirgacheffe Grade 2">Yirgacheffe Grade 2 - Washed</MenuItem>
                    <MenuItem value="Sidamo Grade 2">Sidamo Grade 2 - Washed</MenuItem>
                    <MenuItem value="Sidamo Grade 3">Sidamo Grade 3 - Washed</MenuItem>
                    <MenuItem value="Guji Grade 1">Guji Grade 1 - Natural</MenuItem>
                    <MenuItem value="Guji Grade 2">Guji Grade 2 - Natural</MenuItem>
                    <MenuItem value="Limu Grade 2">Limu Grade 2 - Washed</MenuItem>
                    <MenuItem value="Limu Grade 3">Limu Grade 3 - Washed</MenuItem>
                    <MenuItem value="Harrar Grade 4">Harrar Grade 4 - Natural</MenuItem>
                    <MenuItem value="Jimma Grade 5">Jimma Grade 5 - Washed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quantity (kg)"
                  type="number"
                  value={newContract.quantity}
                  onChange={(e) => setNewContract({...newContract, quantity: e.target.value})}
                  required
                  InputProps={{ inputProps: { min: 1000, step: 100 } }}
                  helperText="Minimum: 1,000 kg"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Price per kg (USD)"
                  type="number"
                  value={newContract.pricePerKg}
                  onChange={(e) => setNewContract({...newContract, pricePerKg: e.target.value})}
                  required
                  InputProps={{ inputProps: { min: 5.0, step: 0.01 } }}
                  helperText="Minimum: $5.00/kg FOB"
                  error={!!(newContract.pricePerKg && parseFloat(newContract.pricePerKg) < 5.0)}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={newContract.currency}
                    label="Currency"
                    onChange={(e) => setNewContract({...newContract, currency: e.target.value})}
                  >
                    <MenuItem value="USD">USD - US Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Incoterm</InputLabel>
                  <Select
                    value={newContract.incoterm}
                    label="Incoterm"
                    onChange={(e) => setNewContract({...newContract, incoterm: e.target.value})}
                  >
                    <MenuItem value="FOB">FOB - Free On Board</MenuItem>
                    <MenuItem value="CIF">CIF - Cost, Insurance & Freight</MenuItem>
                    <MenuItem value="CFR">CFR - Cost and Freight</MenuItem>
                    <MenuItem value="EXW">EXW - Ex Works</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Payment Method Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brandPrimary, mt: 2 }}>
                  <Payment /> Payment Method
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={newContract.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => setNewContract({...newContract, paymentMethod: e.target.value})}
                  >
                    <MenuItem value="LC">
                      <Box>
                        <Typography variant="body1" fontWeight="bold">LC - Letter of Credit</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Bank guaranteed payment | Lowest risk | UCP 600 compliant
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="CAD">
                      <Box>
                        <Typography variant="body1" fontWeight="bold">CAD - Cash Against Documents</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Payment through banks, no guarantee | Medium risk | URC 522
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="TT_ADVANCE">
                      <Box>
                        <Typography variant="body1" fontWeight="bold">TT Advance - Telegraphic Transfer (Advance)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Partial payment before shipment | Low risk
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="TT_POST">
                      <Box>
                        <Typography variant="body1" fontWeight="bold">TT Post - Telegraphic Transfer (Post-shipment)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Payment after shipment | High risk | Direct transfer
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="ADVANCE">
                      <Box>
                        <Typography variant="body1" fontWeight="bold">ADVANCE - Advance Payment</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Full/partial payment before production | Lowest risk
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                  <FormHelperText>
                    {newContract.paymentMethod === 'LC' && '✓ Recommended: Bank guarantee ensures payment security'}
                    {newContract.paymentMethod === 'CAD' && '⚠️ Medium risk: Documents released only after payment'}
                    {newContract.paymentMethod === 'TT_ADVANCE' && '✓ Low risk: Advance payment reduces exporter risk'}
                    {newContract.paymentMethod === 'TT_POST' && '⚠️ High risk: Payment depends on buyer trust'}
                    {newContract.paymentMethod === 'ADVANCE' && '✓ Lowest risk: Payment received before work begins'}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Shipping Details Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brandPrimary, mt: 2 }}>
                  <LocalShipping /> Shipping Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Port of Loading</InputLabel>
                  <Select
                    value={newContract.portOfLoading}
                    label="Port of Loading"
                    onChange={(e) => setNewContract({...newContract, portOfLoading: e.target.value})}
                  >
                    <MenuItem value="Djibouti">Djibouti Port</MenuItem>
                    <MenuItem value="Berbera">Berbera Port (Somaliland)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Port of Destination"
                  value={newContract.portOfDestination}
                  onChange={(e) => setNewContract({...newContract, portOfDestination: e.target.value})}
                  required
                  placeholder="e.g., Hamburg, Rotterdam"
                  helperText="Final destination port"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Delivery Date"
                  type="date"
                  value={newContract.deliveryDate}
                  onChange={(e) => setNewContract({...newContract, deliveryDate: e.target.value})}
                  required
                  InputLabelProps={{ shrink: true }}
                  helperText="Estimated shipment date"
                />
              </Grid>

              {/* Certifications Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brandPrimary, mt: 2 }}>
                  <CheckCircle /> Certifications & Compliance
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>EUDR Required</InputLabel>
                  <Select
                    value={newContract.eudrRequired ? 'yes' : 'no'}
                    label="EUDR Required"
                    onChange={(e) => setNewContract({...newContract, eudrRequired: e.target.value === 'yes'})}
                  >
                    <MenuItem value="yes">Yes - EU Market (Required)</MenuItem>
                    <MenuItem value="no">No - Non-EU Market</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Organic Certified</InputLabel>
                  <Select
                    value={newContract.organicCertified ? 'yes' : 'no'}
                    label="Organic Certified"
                    onChange={(e) => setNewContract({...newContract, organicCertified: e.target.value === 'yes'})}
                  >
                    <MenuItem value="yes">Yes - Organic Certified</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Fair Trade Certified</InputLabel>
                  <Select
                    value={newContract.fairTradeCertified ? 'yes' : 'no'}
                    label="Fair Trade Certified"
                    onChange={(e) => setNewContract({...newContract, fairTradeCertified: e.target.value === 'yes'})}
                  >
                    <MenuItem value="yes">Yes - Fair Trade</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Special Instructions"
                  multiline
                  rows={3}
                  value={newContract.specialInstructions}
                  onChange={(e) => setNewContract({...newContract, specialInstructions: e.target.value})}
                  placeholder="Any special packaging, quality requirements, or shipping instructions..."
                  helperText="Optional - Additional contract terms or requirements"
                />
              </Grid>

              {/* Contract Summary */}
              {newContract.quantity && newContract.pricePerKg && (
                <Grid item xs={12}>
                  <Alert severity="success" icon={<AttachMoney />}>
                    <Typography variant="h6" gutterBottom>Contract Summary</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Quantity</Typography>
                        <Typography variant="body1" fontWeight="bold">{parseFloat(newContract.quantity).toLocaleString()} kg</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Price/kg</Typography>
                        <Typography variant="body1" fontWeight="bold">{newContract.currency} {parseFloat(newContract.pricePerKg).toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Total Value</Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {newContract.currency} {(parseFloat(newContract.quantity) * parseFloat(newContract.pricePerKg)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Incoterm</Typography>
                        <Typography variant="body1" fontWeight="bold">{newContract.incoterm}</Typography>
                      </Grid>
                    </Grid>
                  </Alert>
                </Grid>
              )}

              {/* Supporting Documents Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: brandPrimary, mt: 2 }}>
                  <Description /> Supporting Documents
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Recommended Documents (to support contract):</strong> Sample quality certificates, sales agreement/proforma invoice, 
                    organic/fair trade certificates (if applicable), EUDR due diligence statement (for EU buyers)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    <strong>Note:</strong> Export documents (Bill of Lading, Commercial Invoice, etc.) are created LATER when you register the actual shipment, not now.
                  </Typography>
                </Alert>
                
                <Box sx={{ 
                  border: '2px dashed', 
                  borderColor: contractDocuments.length > 0 ? 'success.main' : 'grey.400',
                  borderRadius: 1, 
                  p: 2, 
                  textAlign: 'center',
                  bgcolor: 'grey.50'
                }}>
                  {contractDocuments.length === 0 ? (
                    <>
                      <Upload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        No documents uploaded yet
                      </Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<Upload />}
                        onClick={() => setContractDocUploadOpen(true)}
                        sx={{ mt: 1 }}
                      >
                        Upload Documents
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        {contractDocuments.length} document{contractDocuments.length !== 1 ? 's' : ''} uploaded
                      </Typography>
                      <List dense>
                        {contractDocuments.map((doc, idx) => (
                          <ListItem key={idx}>
                            <ListItemText 
                              primary={doc.file.name}
                              secondary={`${doc.category} - ${(doc.file.size / 1024).toFixed(2)} KB`}
                            />
                          </ListItem>
                        ))}
                      </List>
                      <Button 
                        variant="outlined" 
                        startIcon={<Upload />}
                        onClick={() => setContractDocUploadOpen(true)}
                        size="small"
                      >
                        Add More Documents
                      </Button>
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setCreateContractDialogOpen(false)} size="large">
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleCreateContract}
              disabled={isCreatingContract || !newContract.buyerCompany || !newContract.buyerCountry || 
                        !newContract.buyerBank || !newContract.exporterBank ||
                        !newContract.buyerEmail || !newContract.coffeeType || !newContract.quantity || 
                        !newContract.pricePerKg || !newContract.portOfDestination || !newContract.deliveryDate || 
                        (parseFloat(newContract.pricePerKg) < 5.0)}
              size="large"
              sx={{ minWidth: 150 }}
            >
              {isCreatingContract ? 'Registering...' : 'Register Contract'}
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Forex & Banking Tab */}
        <Grid container spacing={3}>
          {/* Financial Summary KPIs */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Financial Overview</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: brandPrimary, color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Forex Allocated</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${forexStatuses.reduce((sum, f) => sum + f.allocatedAmount, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: brandSecondary, color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Retained (40%)</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${payments.reduce((sum, p) => sum + p.retainedAmount, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: brandPrimary, color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Converted (60%)</Typography>
                <Typography variant="h5" fontWeight="bold">
                  ${payments.reduce((sum, p) => sum + p.convertedAmount, 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: brandSecondary, color: '#000000' }}>
              <CardContent>
                <Typography variant="caption">Received in Birr</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {payments.reduce((sum, p) => sum + p.amountBirr, 0).toLocaleString()} ETB
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Forex Allocations */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Forex Allocations</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {forexStatuses.map((forex) => (
                    <Card key={forex.forexId} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Forex ID</Typography>
                            <Typography variant="body2" fontWeight="bold">{forex.forexId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <StatusChip status={forex.status} />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Contract ID</Typography>
                            <Typography variant="body2">{forex.contractId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Allocated Amount</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ${forex.allocatedAmount.toLocaleString()} {forex.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption" color="text.secondary">Exchange Rate</Typography>
                            <Typography variant="body2">{forex.exchangeRate} ETB/USD</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Retention Rate</Typography>
                            <Typography variant="body2">
                              {forex.retentionRate}% retained, {100 - forex.retentionRate}% converted
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Expires</Typography>
                            <Typography variant="body2">{forex.expiryDate ? new Date(forex.expiryDate).toLocaleDateString() : 'N/A'}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>

          {/* Letters of Credit */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Letters of Credit</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {lcStatuses.map((lc) => (
                    <Card key={lc.lcId} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">LC Number</Typography>
                            <Typography variant="body2" fontWeight="bold">{lc.lcId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <StatusChip status={lc.status} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Amount</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              ${lc.amount.toLocaleString()} {lc.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Issuing Bank</Typography>
                            <Typography variant="body2">{lc.issuingBank}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Advising Bank</Typography>
                            <Typography variant="body2">{lc.advisingBank}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Expiry Date</Typography>
                            <Typography variant="body2">{lc.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : 'N/A'}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>

          {/* Payments */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Payment Status</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {payments.map((payment) => (
                    <Card key={payment.paymentId} variant="outlined" sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption">Payment ID</Typography>
                            <Typography variant="body2" fontWeight="bold">{payment.paymentId}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <StatusChip status={payment.status} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption">Total Amount</Typography>
                            <Typography variant="body1" fontWeight="bold">
                              ${payment.amount.toLocaleString()} {payment.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption">SWIFT Reference</Typography>
                            <Typography variant="body2">{payment.swiftReference}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" fontWeight="bold">Breakdown:</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption">Retained (40%)</Typography>
                            <Typography variant="body2" fontWeight="bold" color="warning.main">
                              ${payment.retainedAmount.toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption">Converted (60%)</Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              ${payment.convertedAmount.toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Typography variant="caption">Received in Birr</Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                              {payment.amountBirr.toLocaleString()} ETB
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Shipments Tab */}
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Shipment Tracking & Management</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              sx={{ bgcolor: brandPrimary }}
              onClick={() => {
                // Only show contracts with issued LCs
                const eligibleContracts = contracts.filter(c => 
                  c.status === 'APPROVED' || c.status === 'NBE_APPROVED' || c.status === 'ACTIVE'
                );
                if (eligibleContracts.length === 0) {
                  showWarning(
                    'No Eligible Contracts',
                    'You need an approved contract to create a shipment',
                    'Please wait for:\n1. NBE to approve your contract\n2. Bank to issue Letter of Credit\n3. Then you can create shipments'
                  );
                } else {
                  setCreateShipmentDialogOpen(true);
                }
              }}
            >
              Create New Shipment
            </Button>
          </Box>

          {shipments.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>No shipments yet.</strong> Create a shipment for your approved contracts.
                <br /><br />
                <strong>Workflow:</strong>
                <br />1. Your contract must be approved by NBE
                <br />2. Bank issues Letter of Credit (LC)
                <br />3. Create shipment — this automatically requests ECTA quality inspection
                <br />4. ECTA inspector performs physical & cupping inspection
                <br />5. ECTA approves quality and issues Export Permit
                <br />6. After permit issued, proceed to customs clearance and shipping
              </Typography>
            </Alert>
          ) : null}

          {/* Quality Inspection Pending Alert */}
          {shipments.filter(s => s.status === 'CREATED').length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>🔬 Quality Inspection Pending</strong>
                <br />
                You have {shipments.filter(s => s.status === 'CREATED').length} shipment(s) awaiting ECTA quality inspection.
                ECTA inspector will perform physical inspection and cupping test within 2-3 business days.
                <br /><br />
                <strong>What happens next:</strong>
                <br />• ECTA Q-Grader performs SCA cupping protocol (physical + sensory evaluation)
                <br />• If Grade 1-5 quality passed → Export Permit issued
                <br />• If quality failed → Shipment rejected, you'll be notified with detailed reasons
              </Typography>
            </Alert>
          )}
          
          <Grid container spacing={3}>
            {shipments.map((shipment) => (
              <Grid item xs={12} key={shipment.shipmentId}>
                <ModernCard>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <LocalShipping fontSize="large" color="primary" />
                          <Box>
                            <Typography variant="h6">{shipment.shipmentId}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Contract: {shipment.contractId}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                        <StatusChip status={shipment.status} />
                        
                        {/* Quality Inspection Status Badge */}
                        {shipment.status === 'CREATED' && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              icon={<Science />}
                              label="⏳ Quality Inspection Pending"
                              color="warning"
                              size="small"
                              sx={{ fontWeight: 'bold', mb: 0.5 }}
                            />
                            <Typography variant="caption" display="block" color="warning.dark" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                              ⏱️ Waiting: ECTA inspector assignment
                            </Typography>
                          </Box>
                        )}
                        {(shipment.status === 'CREATED' || shipment.status === 'SHIPPED') && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              icon={<CheckCircle />}
                              label="✅ Export Permit Issued"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 'bold', mb: 0.5 }}
                            />
                            <Typography variant="caption" display="block" color="primary.main" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                              🎯 Next: Submit Customs Declaration →
                            </Typography>
                          </Box>
                        )}
                        {shipment.status === 'LOADED' && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              icon={<Assignment />}
                              label="📋 Customs Declaration Submitted"
                              color="info"
                              size="small"
                              sx={{ fontWeight: 'bold', mb: 0.5 }}
                            />
                            <Typography variant="caption" display="block" color="info.main" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                              🎯 Next: Awaiting Customs Clearance →
                            </Typography>
                          </Box>
                        )}
                        {shipment.status === 'DEPARTED' && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              icon={<CheckCircle />}
                              label="🛃 Customs Cleared"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 'bold', mb: 0.5 }}
                            />
                            <Typography variant="caption" display="block" color="success.main" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                              🎯 Next: Arrange Shipping & Payment →
                            </Typography>
                          </Box>
                        )}
                        {shipment.status === 'SHIPPED' && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              icon={<LocalShipping />}
                              label="🚢 In Transit"
                              color="info"
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>
                        )}
                        {shipment.status === 'DELIVERED' && (
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              icon={<CheckCircle />}
                              label="✅ Delivered"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </Box>
                        )}
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Quantity</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {shipment.quantity ? Number(shipment.quantity).toLocaleString() : '0'} kg
                        </Typography>
                      </Grid>
                      
                      {/* Transport Mode Display */}
                      {shipment.transportMode && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Transport Mode</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            {shipment.transportMode === 'AIR' ? (
                              <>
                                <FlightTakeoff color="secondary" fontSize="small" />
                                <Typography variant="body1" fontWeight="bold">Air Freight</Typography>
                              </>
                            ) : (
                              <>
                                <DirectionsBoat color="primary" fontSize="small" />
                                <Typography variant="body1" fontWeight="bold">Sea Freight</Typography>
                              </>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {shipment.transportMode === 'AIR' ? '1-3 days transit' : '25-35 days transit'}
                          </Typography>
                        </Grid>
                      )}
                      
                      {shipment.billOfLading && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Bill of Lading</Typography>
                          <Typography variant="body1">{shipment.billOfLading}</Typography>
                        </Grid>
                      )}
                      
                      {shipment.vesselName && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Vessel</Typography>
                          <Typography variant="body1">{shipment.vesselName}</Typography>
                        </Grid>
                      )}
                      
                      {shipment.currentLocation && (
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Current Location</Typography>
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            {shipment.currentLocation}
                          </Typography>
                        </Grid>
                      )}
                      
                      {shipment.estimatedArrival && (
                        <Grid item xs={12}>
                          <Alert severity="info">
                            <Typography variant="body2">
                              <strong>Estimated Arrival:</strong> {shipment.estimatedArrival ? new Date(shipment.estimatedArrival).toLocaleDateString() : 'TBD'}
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                      
                      {/* Shipment Progress */}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Shipment Progress
                        </Typography>
                        <Stepper activeStep={getShipmentStep(shipment.status)} alternativeLabel>
                          <Step>
                            <StepLabel>Booked</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Loaded</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Departed</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>In Transit</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Arrived</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Delivered</StepLabel>
                          </Step>
                        </Stepper>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {/* Submit Customs Declaration Button */}
                          {(shipment.status === 'CREATED' || shipment.status === 'BOOKED') && (
                            <AnimatedButton
                              size="small"
                              variant="contained"
                              startIcon={<Assignment />}
                              brandColor={brandPrimary}
                              onClick={() => {
                                setSelectedShipmentForCustoms(shipment);
                                // Reset form with shipment data
                                const selectedContract = contracts.find(c => c.contractId === shipment.contractId);
                                setCustomsForm({
                                  hsCode: '090111',
                                  portOfExit: 'Djibouti Port',
                                  customsValue: (shipment.quantity * (selectedContract?.pricePerKg || 9.25)).toFixed(2),
                                  additionalNotes: '',
                                  eudrCompliant: true,
                                });
                                setCustomsDeclarationDialogOpen(true);
                              }}
                            >
                              Submit Customs Declaration
                            </AnimatedButton>
                          )}

                          {/* Request Phytosanitary Certificate Button */}
                          {(shipment.status === 'CREATED' || shipment.status === 'DEPARTED') && (
                            <Tooltip title="Required for all agricultural exports (IPPC)">
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={<Science />}
                                onClick={() => {
                                  showInfo(
                                    '🌿 Phytosanitary Certificate',
                                    'Request plant health certification',
                                    `Shipment: ${shipment.shipmentId}\n\nPlease contact Ministry of Agriculture or ECTA to arrange phytosanitary inspection and certificate issuance.\n\nRequired: Plant health inspection, treatment verification, and IPPC compliance check.`
                                  );
                                }}
                              >
                                🌿 Phytosanitary
                              </Button>
                            </Tooltip>
                          )}

                          {/* Purchase Insurance Certificate Button (for CIF) */}
                          {shipment.status === 'IN_TRANSIT' && (
                            <Tooltip title="Required for CIF incoterm shipments">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<Description />}
                                onClick={() => {
                                  const selectedContract = contracts.find(c => c.contractId === shipment.contractId);
                                  showInfo(
                                    '🛡️ Marine Insurance Certificate',
                                    'Purchase cargo insurance coverage',
                                    `Shipment: ${shipment.shipmentId}\nIncoterm: FOB\n\nOptional for FOB shipments\n\nContact your insurance provider to purchase marine cargo insurance. Coverage types: ICC(A) All Risks, ICC(B) Named Perils, ICC(C) Minimum.`
                                  );
                                }}
                              >
                                🛡️ Insurance
                              </Button>
                            </Tooltip>
                          )}

                          {/* Book Shipping Button */}
                          {shipment.status === 'ARRIVED' && (
                            <AnimatedButton
                              size="small"
                              variant="contained"
                              startIcon={<LocalShipping />}
                              brandColor={brandPrimary}
                              onClick={() => {
                                setSelectedShipmentForShipping(shipment);
                                const selectedContract = contracts.find(c => c.contractId === shipment.contractId);
                                setShippingForm({
                                  shippingLine: 'Maersk Line',
                                  containerType: 'DRY',
                                  portOfLoading: 'Djibouti Port',
                                  portOfDischarge: selectedContract?.buyerCountry || '',
                                  vesselName: '',
                                  estimatedDeparture: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                  specialInstructions: '',
                                });
                                setBookShippingDialogOpen(true);
                              }}
                            >
                              Book Shipping
                            </AnimatedButton>
                          )}

                          {/* Initiate Payment Button */}
                          {shipment.status === 'DELIVERED' && (
                            <AnimatedButton
                              size="small"
                              variant="contained"
                              startIcon={<AttachMoney />}
                              brandColor={brandPrimary}
                              onClick={() => {
                                setSelectedShipmentForPayment(shipment);
                                setPaymentForm({
                                  paymentMethod: 'LC',
                                  beneficiaryName: profile?.companyName || '',
                                  beneficiaryAccount: '',
                                  beneficiaryBank: profile?.bankName || '',
                                  beneficiaryBankBIC: '',
                                  swiftInstructions: '',
                                });
                                setPaymentSettlementDialogOpen(true);
                              }}
                            >
                              Initiate Payment
                            </AnimatedButton>
                          )}
                          
                          <Button size="small" startIcon={<Visibility />}>
                            Track on Map
                          </Button>
                          <Button size="small" startIcon={<Download />}>
                            Download B/L
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </ModernCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {/* Documents Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Document Management</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload and manage all your export-related documents. All documents are securely stored on the blockchain.
            </Alert>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upload Documents</Typography>
                <Box sx={{ 
                  border: '2px dashed', 
                  borderColor: 'primary.main', 
                  borderRadius: 2, 
                  p: 4, 
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <Upload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>Drop files here or click to browse</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supported: PDF, JPG, PNG, DOC, XLSX (Max 10MB)
                  </Typography>
                  <Button variant="contained" sx={{ mt: 2 }}>
                    Select Files
                  </Button>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Document Types:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label="Sales Contract" size="small" />
                    <Chip label="EUDR Certificate" size="small" />
                    <Chip label="Lab Quality Report" size="small" />
                    <Chip label="Phytosanitary Certificate" size="small" />
                    <Chip label="Origin Certificate" size="small" />
                    <Chip label="ICO Certificate" size="small" />
                  </Box>
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Documents</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { name: 'Sales_Contract_2026001.pdf', type: 'Contract', date: '2026-06-01', status: 'VERIFIED' },
                    { name: 'EUDR_Certificate_Yirgacheffe.pdf', type: 'Compliance', date: '2026-05-28', status: 'VERIFIED' },
                    { name: 'Lab_Quality_Report_001.pdf', type: 'Quality', date: '2026-05-25', status: 'VERIFIED' },
                    { name: 'Bill_of_Lading_BOL2026001.pdf', type: 'Shipping', date: '2026-06-02', status: 'VERIFIED' },
                  ].map((doc, idx) => (
                    <Card key={idx} variant="outlined">
                      <CardContent sx={{ py: 1 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Description color="primary" />
                              <Box>
                                <Typography variant="body2" fontWeight="bold">{doc.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{doc.type}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">{doc.date}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                            <IconButton size="small" color="primary">
                              <Download />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        {/* LC & Payments (SWIFT Messages) Tab */}
        <SWIFTMessagesViewWrapper />
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        {/* Reports Tab */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Export Reports & Analytics</Typography>
          </Grid>
          
          {/* Summary Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Contracts</Typography>
                <Typography variant="h4" fontWeight="bold">{contracts.length}</Typography>
                <Typography variant="body2">This year</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Approval Rate</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {Math.round((contracts.filter(c => c.status !== 'DRAFT').length / contracts.length) * 100)}%
                </Typography>
                <Typography variant="body2">Success rate</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Avg. Approval Time</Typography>
                <Typography variant="h4" fontWeight="bold">2.5</Typography>
                <Typography variant="body2">Days</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Volume</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {(contracts.reduce((sum, c) => sum + c.quantity, 0) / 1000).toFixed(1)}
                </Typography>
                <Typography variant="body2">Metric tons</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Generate Report Section */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generate Custom Report</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      defaultValue="2026-01-01"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      defaultValue="2026-12-31"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Report Type</InputLabel>
                      <Select defaultValue="all">
                        <MenuItem value="all">All Activities</MenuItem>
                        <MenuItem value="contracts">Contracts Only</MenuItem>
                        <MenuItem value="financial">Financial Summary</MenuItem>
                        <MenuItem value="shipments">Shipments</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      sx={{ height: '100%', bgcolor: brandPrimary }}
                      startIcon={<Download />}
                    >
                      Generate Report
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </ModernCard>
          </Grid>
          
          {/* Compliance Dashboard */}
          <Grid item xs={12}>
            <ModernCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>Compliance Dashboard</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
                      <Typography variant="h4" fontWeight="bold">100%</Typography>
                      <Typography variant="body2" color="text.secondary">EUDR Compliance</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
                      <Typography variant="h4" fontWeight="bold">0</Typography>
                      <Typography variant="body2" color="text.secondary">Customs Rejections</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
                      <Typography variant="h4" fontWeight="bold">98%</Typography>
                      <Typography variant="body2" color="text.secondary">On-Time Delivery</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'primary.main' }} />
                      <Typography variant="h4" fontWeight="bold">A+</Typography>
                      <Typography variant="body2" color="text.secondary">Quality Rating</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </ModernCard>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>

    {/* Contract Detail Dialog */}
    <Dialog open={contractDialogOpen} onClose={handleContractDialogClose} maxWidth="md" fullWidth>
      <DialogTitle>Contract Details</DialogTitle>
      <DialogContent>
        {selectedContract && (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Contract ID</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedContract.contractId}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">NBE Reference</Typography>
                <Typography variant="body1" fontWeight={600}>{selectedContract.nbeReferenceNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Buyer</Typography>
                <Typography variant="body1">{selectedContract.buyerName}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Buyer Country</Typography>
                <Typography variant="body1">{selectedContract.buyerCountry}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Coffee Type</Typography>
                <Typography variant="body1">{selectedContract.coffeeType}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Quantity</Typography>
                <Typography variant="body1">{selectedContract.quantity ? Number(selectedContract.quantity).toLocaleString() : '0'} kg</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Price per Kg</Typography>
                <Typography variant="body1">${selectedContract.pricePerKg.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Total Value</Typography>
                <Typography variant="body1" color="primary" fontWeight={600}>
                  ${selectedContract.totalValue ? Number(selectedContract.totalValue).toLocaleString() : '0'} {selectedContract.currency}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <StatusChip status={selectedContract.status === 'NBE_APPROVED' ? 'APPROVED' : selectedContract.status} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Registration Date</Typography>
                <Typography variant="body1">
                  {selectedContract.registrationDate ? new Date(selectedContract.registrationDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
            
            {/* Contract Progress Tracker */}
            <Card sx={{ mt: 3, bgcolor: 'action.hover' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Contract Progress</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  <Chip 
                    label="Registered" 
                    color={['REGISTERED', 'APPROVED', 'NBE_APPROVED', 'ACTIVE'].includes(selectedContract.status) ? 'success' : 'default'} 
                    size="small" 
                  />
                  <Typography>→</Typography>
                  <Chip 
                    label="NBE Approved" 
                    color={['APPROVED', 'NBE_APPROVED', 'ACTIVE'].includes(selectedContract.status) ? 'success' : 'default'} 
                    size="small" 
                  />
                  <Typography>→</Typography>
                  <Chip 
                    label="LC Issued" 
                    color={selectedContract.status === 'ACTIVE' ? 'success' : 'default'} 
                    size="small" 
                  />
                  <Typography>→</Typography>
                  <Chip 
                    label="Export Complete" 
                    color={selectedContract.status === 'COMPLETED' ? 'success' : 'default'} 
                    size="small" 
                  />
                </Box>
              </CardContent>
            </Card>

            {selectedContract.status === 'REGISTERED' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Your contract is registered and awaiting ECTA review and NBE approval for forex allocation.
              </Alert>
            )}
            {selectedContract.status === 'APPROVED' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Your contract has been approved by NBE. The bank can now issue a Letter of Credit.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleContractDialogClose}>Close</Button>
        {selectedContract && selectedContract.status === 'ACTIVE' && (
          <AnimatedButton
            variant="contained"
            brandColor={brandPrimary}
            startIcon={<Download />}
            onClick={() => {
              if (!selectedContract) return;
              
              // Generate contract document package
              const docData = {
                contractId: selectedContract.contractId,
                buyer: selectedContract.buyerName || 'Buyer Company',
                buyerCountry: selectedContract.buyerCountry || 'Unknown',
                seller: 'Your Coffee Export Company',
                coffeeType: selectedContract.coffeeType,
                quantity: selectedContract.quantity,
                price: selectedContract.pricePerKg,
                totalValue: selectedContract.totalValue,
                currency: selectedContract.currency || 'USD',
                nbeRef: selectedContract.nbeReferenceNumber || 'N/A',
              };
              
              // In production, this would generate PDF with contract terms
              const textContent = `
SALES CONTRACT
Contract ID: ${docData.contractId}
Date: ${new Date().toLocaleDateString()}
NBE Reference: ${docData.nbeRef}

SELLER: ${docData.seller}
BUYER: ${docData.buyer}
DESTINATION: ${docData.buyerCountry}

COMMODITY: ${docData.coffeeType}
QUANTITY: ${docData.quantity} kg
UNIT PRICE: ${docData.currency} ${docData.price}/kg
TOTAL VALUE: ${docData.currency} ${docData.totalValue.toLocaleString()}

DELIVERY TERMS: FOB Djibouti
PAYMENT TERMS: Letter of Credit at sight

This contract is registered with ECTA and approved by NBE.
`;
              
              const blob = new Blob([textContent], { type: 'text/plain' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Contract_${selectedContract.contractId}.txt`;
              a.click();
              window.URL.revokeObjectURL(url);
              
              alert(`📄 Contract Documents Downloaded\n\nContract ID: ${selectedContract.contractId}\n\nIn production, this package would include:\n• Signed sales contract PDF\n• ECTA registration certificate\n• NBE approval letter\n• Quality inspection reports\n• Export permit documents\n• Insurance certificates`);
            }}
          >
            Download Documents
          </AnimatedButton>
        )}
      </DialogActions>
    </Dialog>

    {/* Customs Declaration Dialog */}
    <Dialog
      open={customsDeclarationDialogOpen}
      onClose={() => {
        setCustomsDeclarationDialogOpen(false);
        setSelectedShipmentForCustoms(null);
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Assignment />
          <Typography variant="h6">
            🛃 Submit Customs Declaration
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedShipmentForCustoms && (
          <>
            <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Ethiopian Customs Commission (ECC) — Export Declaration
              </Typography>
              <Typography variant="body2">
                You are now at <strong>Step 9 of 11</strong> in the export process.
                <br />
                Shipment: <strong>{selectedShipmentForCustoms.shipmentId}</strong> • Quantity: <strong>{selectedShipmentForCustoms.quantity ? Number(selectedShipmentForCustoms.quantity).toLocaleString() : '0'} kg</strong>
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                📋 Required Documents Checklist
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                <Typography component="li" variant="body2">✅ Commercial Invoice (showing FOB value, buyer details)</Typography>
                <Typography component="li" variant="body2">✅ Packing List (container/bag details, weight)</Typography>
                <Typography component="li" variant="body2">✅ ECTA Export Permit (issued after quality approval)</Typography>
                <Typography component="li" variant="body2">✅ ICO Certificate of Origin (for ICO-certified coffee)</Typography>
                <Typography component="li" variant="body2">✅ Bill of Lading or Waybill (if already issued)</Typography>
                <Typography component="li" variant="body2">✅ Phytosanitary Certificate (plant health clearance)</Typography>
                <Typography component="li" variant="body2">✅ EUDR Due Diligence Statement (for EU destinations only)</Typography>
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                ⚠️ All documents must be uploaded to the system before final submission
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Declaration Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="HS Code"
                  value={customsForm.hsCode}
                  onChange={(e) => setCustomsForm({ ...customsForm, hsCode: e.target.value })}
                  helperText="Coffee, not roasted, not decaffeinated"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customs Value (USD)"
                  type="number"
                  value={customsForm.customsValue || (selectedShipmentForCustoms.quantity * 9.25).toFixed(2)}
                  onChange={(e) => setCustomsForm({ ...customsForm, customsValue: e.target.value })}
                  helperText="FOB value from contract"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Port of Exit"
                  value={customsForm.portOfExit}
                  onChange={(e) => setCustomsForm({ ...customsForm, portOfExit: e.target.value })}
                  helperText="Primary exit point for Ethiopian coffee"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customs Officer (Auto-assigned)"
                  value="Officer Alemayehu T. (ECC)"
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={customsForm.eudrCompliant}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setCustomsForm({ ...customsForm, eudrCompliant: e.target.checked })
                      }
                    />
                  }
                  label="🇪🇺 EUDR Enhanced Verification Required (for EU destinations)"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Enhanced due diligence for deforestation-free coffee — GPS farm coordinates and traceability verified
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Notes"
                  value={customsForm.additionalNotes}
                  onChange={(e) => setCustomsForm({ ...customsForm, additionalNotes: e.target.value })}
                  placeholder="Any special instructions or remarks for customs..."
                  helperText="Optional information for customs officers"
                />
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>What happens after submission:</strong>
                <br />
                1. ECC customs officer reviews declaration & supporting documents
                <br />
                2. Physical inspection scheduled (if required based on risk assessment)
                <br />
                3. EUDR compliance verified (for EU destinations)
                <br />
                4. Customs clearance issued (typically 1-3 days)
                <br />
                5. You can then proceed to book shipping and arrange container loading
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setCustomsDeclarationDialogOpen(false);
          setSelectedShipmentForCustoms(null);
        }}>
          Cancel
        </Button>
        <AnimatedButton
          variant="contained"
          brandColor={brandPrimary}
          disabled={isSubmittingCustoms}
          onClick={handleSubmitCustomsDeclaration}
        >
          {isSubmittingCustoms ? 'Submitting...' : 'Submit to ECC'}
        </AnimatedButton>
      </DialogActions>
    </Dialog>

    {/* Book Shipping Dialog */}
    <Dialog
      open={bookShippingDialogOpen}
      onClose={() => {
        setBookShippingDialogOpen(false);
        setSelectedShipmentForShipping(null);
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LocalShipping />
          <Typography variant="h6">
            🚢 Book Shipping & Container
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedShipmentForShipping && (
          <>
            <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Shipping & Logistics Booking — Step 10 of 11
              </Typography>
              <Typography variant="body2">
                Shipment: <strong>{selectedShipmentForShipping.shipmentId}</strong> • Quantity: <strong>{selectedShipmentForShipping.quantity ? Number(selectedShipmentForShipping.quantity).toLocaleString() : '0'} kg</strong>
                <br />
                Customs cleared — ready for container booking and shipping
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Container & Shipping Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Shipping Line</InputLabel>
                  <Select
                    value={shippingForm.shippingLine}
                    label="Shipping Line"
                    onChange={(e) => setShippingForm({ ...shippingForm, shippingLine: e.target.value })}
                  >
                    <MenuItem value="Maersk Line">Maersk Line</MenuItem>
                    <MenuItem value="MSC">Mediterranean Shipping Company (MSC)</MenuItem>
                    <MenuItem value="CMA CGM">CMA CGM</MenuItem>
                    <MenuItem value="COSCO Shipping">COSCO Shipping</MenuItem>
                    <MenuItem value="Hapag-Lloyd">Hapag-Lloyd</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Container Type</InputLabel>
                  <Select
                    value={shippingForm.containerType}
                    label="Container Type"
                    onChange={(e) => setShippingForm({ ...shippingForm, containerType: e.target.value })}
                  >
                    <MenuItem value="DRY">Dry Container (20ft/40ft)</MenuItem>
                    <MenuItem value="REEFER">Refrigerated Container</MenuItem>
                    <MenuItem value="OPEN_TOP">Open Top Container</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2, mt: 0.5 }}>
                    Most coffee exports use dry containers with proper ventilation
                  </Typography>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Port of Loading"
                  value={shippingForm.portOfLoading}
                  onChange={(e) => setShippingForm({ ...shippingForm, portOfLoading: e.target.value })}
                  helperText="Ethiopian coffee typically ships from Djibouti"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Port of Discharge"
                  value={shippingForm.portOfDischarge}
                  onChange={(e) => setShippingForm({ ...shippingForm, portOfDischarge: e.target.value })}
                  helperText="Destination port in buyer's country"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vessel Name (Optional)"
                  value={shippingForm.vesselName}
                  onChange={(e) => setShippingForm({ ...shippingForm, vesselName: e.target.value })}
                  helperText="Will be assigned by shipping line if not specified"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Estimated Departure Date"
                  value={shippingForm.estimatedDeparture}
                  onChange={(e) => setShippingForm({ ...shippingForm, estimatedDeparture: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Coordinate with shipping line schedule"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Special Instructions"
                  value={shippingForm.specialInstructions}
                  onChange={(e) => setShippingForm({ ...shippingForm, specialInstructions: e.target.value })}
                  placeholder="e.g., Handle with care, temperature control requirements..."
                  helperText="Any special handling or shipping requirements"
                />
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>What happens after booking:</strong>
                <br />
                1. Container assigned and tracking number generated
                <br />
                2. Bill of Lading (B/L) issued by shipping line
                <br />
                3. Coffee loaded into container at port
                <br />
                4. Vessel departs on scheduled date
                <br />
                5. Real-time tracking available throughout journey (15-25 days)
                <br />
                6. After delivery confirmation → proceed to Payment Settlement
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setBookShippingDialogOpen(false);
          setSelectedShipmentForShipping(null);
        }}>
          Cancel
        </Button>
        <AnimatedButton
          variant="contained"
          brandColor={brandPrimary}
          disabled={isBookingShipping || !shippingForm.portOfDischarge || !shippingForm.estimatedDeparture}
          onClick={handleBookShipping}
        >
          {isBookingShipping ? 'Booking...' : 'Confirm Booking'}
        </AnimatedButton>
      </DialogActions>
    </Dialog>

    {/* Payment Settlement Dialog */}
    <Dialog
      open={paymentSettlementDialogOpen}
      onClose={() => {
        setPaymentSettlementDialogOpen(false);
        setSelectedShipmentForPayment(null);
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AttachMoney />
          <Typography variant="h6">
            💰 Initiate Payment Settlement
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedShipmentForPayment && (
          <>
            <Alert severity="success" sx={{ mb: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Final Step — Payment Settlement (Step 11 of 11)
              </Typography>
              <Typography variant="body2">
                Shipment: <strong>{selectedShipmentForPayment.shipmentId}</strong> • Status: <strong>Delivered</strong>
                <br />
                Coffee successfully delivered — ready to receive payment
              </Typography>
            </Alert>

            {(() => {
              const selectedContract = contracts.find(c => c.contractId === selectedShipmentForPayment.contractId);
              const selectedForex = forexStatuses.find(fx => fx.contractId === selectedShipmentForPayment.contractId);
              const selectedLC = lcStatuses.find(lc => lc.contractId === selectedShipmentForPayment.contractId);
              
              if (!selectedLC) {
                return (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <strong>No Letter of Credit Found</strong>
                    <br />
                    Cannot initiate payment without an active Letter of Credit for this contract.
                  </Alert>
                );
              }

              const amountUSD = selectedContract ? (selectedShipmentForPayment.quantity * selectedContract.pricePerKg) : 0;
              const exchangeRate = selectedForex?.exchangeRate || 115.5;
              const retentionRate = selectedForex?.retentionRate || 100;
              const amountETB = amountUSD * exchangeRate;
              const retainedETB = (amountETB * retentionRate) / 100;

              return (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Payment Calculation
                    </Typography>
                    <Typography variant="body2">
                      Contract Value: <strong>${amountUSD.toLocaleString()} {selectedContract?.currency || 'USD'}</strong>
                      <br />
                      NBE Exchange Rate: <strong>{exchangeRate} ETB/USD</strong>
                      <br />
                      Amount in ETB: <strong>{amountETB.toLocaleString()} ETB</strong>
                      <br />
                      NBE Retention Rate: <strong>{retentionRate}%</strong>
                      <br />
                      <strong>You will receive: {retainedETB.toLocaleString()} ETB</strong>
                    </Typography>
                  </Alert>

                  <Typography variant="h6" gutterBottom>
                    Payment & Beneficiary Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                          value={paymentForm.paymentMethod}
                          label="Payment Method"
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        >
                          <MenuItem value="LC">Letter of Credit (LC)</MenuItem>
                          <MenuItem value="TT_POST">Telegraphic Transfer - Post Shipment</MenuItem>
                          <MenuItem value="CAD">Cash Against Documents (CAD)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="LC Reference"
                        value={selectedLC?.lcId || ''}
                        disabled
                        helperText="Linked Letter of Credit"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Beneficiary Name"
                        value={paymentForm.beneficiaryName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryName: e.target.value })}
                        helperText="Your company name (as registered)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Beneficiary Account Number"
                        value={paymentForm.beneficiaryAccount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryAccount: e.target.value })}
                        helperText="Your bank account for receiving payment"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Beneficiary Bank"
                        value={paymentForm.beneficiaryBank}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryBank: e.target.value })}
                        helperText="Your bank (advising bank)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Bank SWIFT/BIC Code"
                        value={paymentForm.beneficiaryBankBIC}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryBankBIC: e.target.value })}
                        placeholder="e.g., CBETETAA"
                        helperText="SWIFT code for international transfer"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="SWIFT Payment Instructions"
                        value={paymentForm.swiftInstructions}
                        onChange={(e) => setPaymentForm({ ...paymentForm, swiftInstructions: e.target.value })}
                        placeholder="Any special instructions for the paying bank..."
                        helperText="Optional - additional payment instructions"
                      />
                    </Grid>
                  </Grid>

                  <Alert severity="warning" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>Required Documents (must be submitted to bank):</strong>
                      <br />
                      ✅ Bill of Lading (B/L)
                      <br />
                      ✅ Commercial Invoice
                      <br />
                      ✅ Packing List
                      <br />
                      ✅ ECTA Export Permit
                      <br />
                      ✅ ICO Certificate of Origin
                      <br />
                      ✅ Insurance Certificate
                      <br />
                      ✅ Customs Clearance Certificate
                    </Typography>
                  </Alert>

                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>After payment initiation:</strong>
                      <br />
                      1. Bank verifies all shipping documents
                      <br />
                      2. SWIFT MT700/MT760 sent to buyer's bank
                      <br />
                      3. Buyer's bank releases payment
                      <br />
                      4. NBE processes forex conversion (at official rate: {exchangeRate} ETB/USD)
                      <br />
                      5. Funds credited to your account (3-5 business days)
                      <br />
                      6. <strong>Export cycle complete! 🎉</strong>
                    </Typography>
                  </Alert>
                </>
              );
            })()}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setPaymentSettlementDialogOpen(false);
          setSelectedShipmentForPayment(null);
        }}>
          Cancel
        </Button>
        <AnimatedButton
          variant="contained"
          brandColor={brandPrimary}
          disabled={
            isInitiatingPayment || 
            !paymentForm.beneficiaryName || 
            !paymentForm.beneficiaryAccount ||
            !paymentForm.beneficiaryBank ||
            !paymentForm.beneficiaryBankBIC
          }
          onClick={handleInitiatePayment}
        >
          {isInitiatingPayment ? 'Processing...' : 'Submit to Bank'}
        </AnimatedButton>
      </DialogActions>
    </Dialog>

    <NotificationDialog
      open={notification.open}
      onClose={closeNotification}
      type={notification.type}
      title={notification.title}
      message={notification.message}
      details={notification.details}
    />

    {/* Create Shipment Dialog */}
    <Dialog 
      open={createShipmentDialogOpen} 
      onClose={() => {
        setCreateShipmentDialogOpen(false);
        setNewShipment({
          contractId: '',
          quantity: '',
          origin: '',
          grade: '',
          icoNumber: '',
          ecxLotNumber: '',
          bondReference: '',
          unionApprovalReference: '',
          channel: 'Direct Export',
          destination: '',
          eudrCompliant: true,
        });
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
        Create New Shipment
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Ethiopian Coffee Export — Shipment Registration
          </Typography>
          <Typography variant="body2">
            You are at <strong>Step 6 of 10</strong> in the export process. Before registering this shipment you must have:
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 2, mt: 0.5 }}>
            <Typography component="li" variant="body2">✅ ECTA export license (active)</Typography>
            <Typography component="li" variant="body2">✅ Sales contract registered and NBE-approved</Typography>
            <Typography component="li" variant="body2">✅ Letter of Credit issued by buyer&apos;s bank</Typography>
            <Typography component="li" variant="body2">✅ Forex allocation approved by NBE</Typography>
            <Typography component="li" variant="body2">✅ Coffee procured from ECX/origin warehouse (ECX Lot Number in hand)</Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            After this step: ECTA quality inspection → Export permit → Customs declaration → Shipping → Payment settlement
          </Typography>
        </Alert>

        {/* Show forex allocation info for the selected contract */}
        {newShipment.contractId && (() => {
          const forex = forexStatuses.find(f => f.contractId === newShipment.contractId && f.status === 'ALLOCATED');
          if (!forex) return null;
          return (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>✅ Forex Allocated for this Contract</strong>
              <br />
              Amount: <strong>${forex.allocatedAmount.toLocaleString()} {forex.currency}</strong> &bull;
              Rate: <strong>{forex.exchangeRate} ETB/USD</strong> &bull;
              Retention: <strong>{forex.retentionRate}%</strong>
              <br />
              <em>Exchange rate auto-applied to shipment value calculation.</em>
            </Alert>
          );
        })()}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Select Approved Contract</InputLabel>
              <Select
                value={newShipment.contractId}
                label="Select Approved Contract"
                onChange={(e) => {
                  const selectedContract = contracts.find(c => c.contractId === e.target.value);
                  // Get real forex rate from allocated forex for this contract
                  const matchedForex = forexStatuses.find(
                    f => f.contractId === e.target.value && f.status === 'ALLOCATED'
                  );
                  applyContractToShipment(selectedContract, matchedForex?.exchangeRate);
                }}
              >
                {contracts
                  .filter(c => c.status === 'APPROVED' || c.status === 'NBE_APPROVED' || c.status === 'ACTIVE')
                  .map((contract) => {
                    const forex = forexStatuses.find(f => f.contractId === contract.contractId && f.status === 'ALLOCATED');
                    const hasForex = !!forex;
                    return (
                      <MenuItem
                        key={contract.contractId}
                        value={contract.contractId}
                        disabled={!hasForex}
                        sx={{ opacity: hasForex ? 1 : 0.5 }}
                      >
                        {hasForex ? '✅' : '⏳'} {contract.contractId} — {contract.coffeeType} ({contract.quantity.toLocaleString()} kg) → {contract.buyerCountry}
                        {!hasForex && ' (awaiting forex allocation)'}
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantity (kg)"
              type="number"
              value={newShipment.quantity}
              onChange={(e) => setNewShipment({...newShipment, quantity: e.target.value})}
              required
              helperText={(() => {
                const q = parseFloat(newShipment.quantity);
                const contract = contracts.find(c => c.contractId === newShipment.contractId);
                if (contract && !isNaN(q) && q > 0) {
                  const valueUSD = (q * contract.pricePerKg).toLocaleString(undefined, { maximumFractionDigits: 2 });
                  const valueETB = (q * contract.pricePerKg * selectedShipmentForexRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
                  return `Value: $${valueUSD} USD = ${valueETB} ETB`;
                }
                return 'Must not exceed contract quantity';
              })()}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Origin Region</InputLabel>
              <Select
                value={newShipment.origin}
                label="Origin Region"
                onChange={(e) => setNewShipment({...newShipment, origin: e.target.value})}
              >
                <MenuItem value="Yirgacheffe">Yirgacheffe</MenuItem>
                <MenuItem value="Sidamo">Sidamo</MenuItem>
                <MenuItem value="Guji">Guji</MenuItem>
                <MenuItem value="Limu">Limu</MenuItem>
                <MenuItem value="Harrar">Harrar</MenuItem>
                <MenuItem value="Jimma">Jimma</MenuItem>
                <MenuItem value="Kaffa">Kaffa</MenuItem>
                <MenuItem value="Illubabor">Illubabor</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Coffee Grade (ECX Assigned)</InputLabel>
              <Select
                value={newShipment.grade}
                label="Coffee Grade (ECX Assigned)"
                onChange={(e) => setNewShipment({...newShipment, grade: e.target.value})}
              >
                <MenuItem value="Grade 1">Grade 1 — Specialty (≤3 defects, score ≥80)</MenuItem>
                <MenuItem value="Grade 2">Grade 2 — Premium (≤12 defects, score ≥80)</MenuItem>
                <MenuItem value="Grade 3">Grade 3 — Exchange (≤25 defects, score ≥75)</MenuItem>
                <MenuItem value="Grade 4">Grade 4 — Commercial (≤45 defects)</MenuItem>
                <MenuItem value="Grade 5">Grade 5 — Commercial (≤100 defects)</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                As assigned by ECX warehouse grader — must match your warehouse receipt
              </Typography>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ICO Number"
              value={newShipment.icoNumber}
              onChange={(e) => setNewShipment({...newShipment, icoNumber: e.target.value})}
              required={shipmentFieldValidation.icoRequired}
              placeholder="ET-XXXX-XXXXX"
              helperText={
                shipmentFieldValidation.icoRequired
                  ? 'Your ICO shipment mark — format: country code + exporter code + serial (e.g. ET-1234-00001)'
                  : 'Optional for non-ICO export channels'
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ECX Lot Number"
              value={newShipment.ecxLotNumber}
              onChange={(e) => setNewShipment({...newShipment, ecxLotNumber: e.target.value})}
              required={shipmentFieldValidation.ecxLotRequired}
              placeholder="ECX-2026-XXXXX"
              helperText={
                shipmentFieldValidation.ecxLotRequired
                  ? 'Warehouse receipt lot number from ECX — required for ECX channel shipments.'
                  : 'Only required when exporting through ECX.'
              }
              disabled={!shipmentFieldValidation.ecxLotRequired}
            />
          </Grid>

          {shipmentFieldValidation.unionApprovalRequired && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Union Approval Reference"
                value={newShipment.unionApprovalReference}
                onChange={(e) => setNewShipment({...newShipment, unionApprovalReference: e.target.value})}
                required
                placeholder="UNION-APPROVAL-12345"
                helperText="Required for Union/Cooperative channel shipments."
              />
            </Grid>
          )}

          {shipmentFieldValidation.bondReferenceRequired && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bond Reference"
                value={newShipment.bondReference}
                onChange={(e) => setNewShipment({...newShipment, bondReference: e.target.value})}
                required
                placeholder="BOND-REF-2026-001"
                helperText="Required for Direct Export channel shipments."
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Export Channel</InputLabel>
              <Select
                value={newShipment.channel}
                label="Export Channel"
                onChange={(e) => {
                  const selectedChannel = e.target.value;
                  setNewShipment({
                    ...newShipment,
                    channel: selectedChannel,
                    bondReference: selectedChannel === 'Direct Export' ? newShipment.bondReference : '',
                    unionApprovalReference: selectedChannel === 'Union' ? newShipment.unionApprovalReference : '',
                    ecxLotNumber: selectedChannel === 'ECX'
                      ? (newShipment.ecxLotNumber || generateECXLotNumber(newShipment.contractId))
                      : newShipment.ecxLotNumber,
                  });
                }}
              >
                <MenuItem value="Direct Export">Direct Export</MenuItem>
                <MenuItem value="ECX">ECX (Ethiopian Commodity Exchange)</MenuItem>
                <MenuItem value="Union">Union/Cooperative</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Destination"
              value={newShipment.destination}
              onChange={(e) => setNewShipment({...newShipment, destination: e.target.value})}
              required
              disabled
              helperText="Auto-filled from contract"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={newShipment.eudrCompliant}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewShipment({...newShipment, eudrCompliant: e.target.checked})}
                  color="primary"
                />
              }
              label="EUDR Compliant (Required for EU destinations)"
            />
          </Grid>

          {/* Shipment Documents Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description /> Shipping Documents
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Required Export Documents:</strong> These documents are created during the export process:
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="• Bill of Lading (B/L) - Issued by shipping company" /></ListItem>
                <ListItem><ListItemText primary="• Commercial Invoice - Your sales invoice to buyer" /></ListItem>
                <ListItem><ListItemText primary="• Packing List - Details of shipment packaging" /></ListItem>
                <ListItem><ListItemText primary="• Quality/ICO Certificate - From ECTA quality inspection" /></ListItem>
                <ListItem><ListItemText primary="• Phytosanitary Certificate - From Ministry of Agriculture" /></ListItem>
                <ListItem><ListItemText primary="• Certificate of Origin - Proves Ethiopian origin" /></ListItem>
                <ListItem><ListItemText primary="• Insurance Certificate - Cargo insurance (if CIF/CIP terms)" /></ListItem>
              </List>
              <Typography variant="caption" color="text.secondary">
                Upload these documents as you obtain them during the shipping process. They are required for customs clearance and LC negotiation.
              </Typography>
            </Alert>
            
            <Box sx={{ 
              border: '2px dashed', 
              borderColor: shipmentDocuments.length > 0 ? 'success.main' : 'grey.400',
              borderRadius: 1, 
              p: 2, 
              textAlign: 'center',
              bgcolor: 'grey.50'
            }}>
              {shipmentDocuments.length === 0 ? (
                <>
                  <Upload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    No documents uploaded yet
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<Upload />}
                    onClick={() => setShipmentDocUploadOpen(true)}
                    sx={{ mt: 1 }}
                  >
                    Upload Documents
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" gutterBottom>
                    {shipmentDocuments.length} document{shipmentDocuments.length !== 1 ? 's' : ''} uploaded
                  </Typography>
                  <List dense>
                    {shipmentDocuments.map((doc, idx) => (
                      <ListItem key={idx}>
                        <ListItemText 
                          primary={doc.file.name}
                          secondary={`${doc.category} - ${(doc.file.size / 1024).toFixed(2)} KB`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button 
                    variant="outlined" 
                    startIcon={<Upload />}
                    onClick={() => setShipmentDocUploadOpen(true)}
                    size="small"
                  >
                    Add More Documents
                  </Button>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateShipmentDialogOpen(false)}>
          Cancel
        </Button>
        <AnimatedButton
          variant="contained"
          onClick={handleCreateShipment}
          disabled={
            isCreatingShipment || 
            !newShipment.contractId || 
            !newShipment.quantity || 
            !newShipment.origin || 
            !newShipment.grade ||
            !newShipment.icoNumber ||
            (shipmentFieldValidation.ecxLotRequired && !newShipment.ecxLotNumber) ||
            (shipmentFieldValidation.unionApprovalRequired && !newShipment.unionApprovalReference) ||
            (shipmentFieldValidation.bondReferenceRequired && !newShipment.bondReference)
          }
          brandColor={brandPrimary}
        >
          {isCreatingShipment ? 'Creating...' : 'Create Shipment'}
        </AnimatedButton>
      </DialogActions>
    </Dialog>

    {/* Audit Trail Viewer */}
    {showAuditTrail && auditEntityType && (
      <AuditTrailViewer
        open={showAuditTrail}
        entityType={auditEntityType as 'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT'}
        entityId={auditEntityId}
        onClose={() => setShowAuditTrail(false)}
      />
    )}

    {/* Document Upload Dialogs */}
    <DocumentUploadDialog
      open={contractDocUploadOpen}
      entityType="CONTRACT"
      onClose={() => setContractDocUploadOpen(false)}
      onUploadComplete={(docs) => {
        setContractDocuments(prev => [...prev, ...docs]);
        setContractDocUploadOpen(false);
      }}
    />

    <DocumentUploadDialog
      open={shipmentDocUploadOpen}
      entityType="SHIPMENT"
      onClose={() => setShipmentDocUploadOpen(false)}
      onUploadComplete={(docs) => {
        setShipmentDocuments(prev => [...prev, ...docs]);
        setShipmentDocUploadOpen(false);
      }}
    />
    </ThemeProvider>
  );
};

// Helper function to get shipment step
const getShipmentStep = (status: string): number => {
  const steps: Record<string, number> = {
    'BOOKED': 0,
    'LOADED': 1,
    'DEPARTED': 2,
    'IN_TRANSIT': 3,
    'ARRIVED': 4,
    'DELIVERED': 5,
  };
  return steps[status] || 0;
};

export default ExporterPortal;
