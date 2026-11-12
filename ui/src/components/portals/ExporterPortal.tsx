// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exporter Portal - Complete Export Journey Management

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
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
  Paper,
  Stack,
} from '@mui/material';
import { createOrganizationTheme } from '@/theme/organizationThemes';
import BankSelect from '@/components/common/BankSelect';
// DocumentUploadDialog removed - using simple file input instead
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
  Delete,
  Timeline,
  Category,
  History,
  VerifiedUser,
  Business,
  Refresh,
  AttachFile,
  HourglassEmpty,
  Info,
} from '@mui/icons-material';

import { alpha } from '@mui/material/styles';
import { GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useForm, Controller } from 'react-hook-form';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import api from '@/utils/api';
import { couchDBService } from '@/services/couchdbService';
import AuditTrailTable from './AuditTrailTable';
import PostDeliveryWorkflowPanel from '../shared/PostDeliveryWorkflowPanel';

// Modern Components - 2026 Design
import {
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';
import {
  PortalShell,
  PortalTabBar,
  PortalTabPanel,
  PortalKpiCard,
  PortalCard,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  GhostButton,
  PortalDialog,
  PortalField,
  PortalDataGrid,
  getPortalBrand,
} from '@/components/shared/portal';
import { NotificationDialog } from '@/components/common/NotificationDialog';
import { useNotification } from '@/hooks/useNotification';
import { useTabFromQuery } from '@/hooks/useTabFromQuery';
import AuditTrailViewer from './AuditTrailViewer';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import SWIFTMessagesViewWrapper from '@/components/exporter/SWIFTMessagesViewWrapper';
import { DocumentManagementPanel } from '@/components/documents';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';
import { BlockchainStatusIcon, BlockchainTxChip, BlockchainBadge } from '@/components/blockchain';

interface ExporterProfile {
  exporterId: string;
  companyName: string;
  ectaLicenseNumber: string;
  licenseStatus: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED' | 'PENDING';
  licenseExpiryDate: string;
  bankName?: string;
  bankBranch?: string;
  bankBranchCode?: string;
  capitalRequirement: number;
  laboratoryCertified: boolean;
}

interface ExportContract {
  contractId: string;
  buyerId?: string;
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
  status: 'DRAFT' | 'REGISTERED' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  rejectionReason?: string;
  rejectionDate?: string | null;
  rejectedBy?: string;
  paymentMethod?: string;
  eudrRequired?: boolean;
  supersedesContractId?: string;
  registrationDate?: string;
  approvalDate?: string;
}

const COFFEE_TYPE_OPTIONS = [
  { value: 'Yirgacheffe Grade 1', label: 'Yirgacheffe Grade 1 - Washed' },
  { value: 'Yirgacheffe Grade 2', label: 'Yirgacheffe Grade 2 - Washed' },
  { value: 'Sidamo Grade 2', label: 'Sidamo Grade 2 - Washed' },
  { value: 'Sidamo Grade 3', label: 'Sidamo Grade 3 - Washed' },
  { value: 'Guji Grade 1', label: 'Guji Grade 1 - Natural' },
  { value: 'Guji Grade 2', label: 'Guji Grade 2 - Natural' },
  { value: 'Limu Grade 2', label: 'Limu Grade 2 - Washed' },
  { value: 'Limu Grade 3', label: 'Limu Grade 3 - Washed' },
  { value: 'Harrar Grade 4', label: 'Harrar Grade 4 - Natural' },
  { value: 'Jimma Grade 5', label: 'Jimma Grade 5 - Washed' },
] as const;

const normalizeCoffeeType = (coffeeType?: string) => {
  const storedValue = String(coffeeType || '').trim();
  if (!storedValue || storedValue === 'Unknown') return '';

  // Older records may include the species prefix, while the form stores the
  // grade as the Select value. Convert known legacy values to the canonical
  // option and preserve any unknown value so it remains visible/editable.
  const withoutLegacyPrefix = storedValue.replace(/^(?:Arabica|Coffee)\s*[-:]\s*/i, '').trim();
  return COFFEE_TYPE_OPTIONS.find(
    (option) => option.value.toLowerCase() === withoutLegacyPrefix.toLowerCase()
  )?.value || storedValue;
};

const isSupportedCoffeeType = (coffeeType: string) =>
  COFFEE_TYPE_OPTIONS.some((option) => option.value === coffeeType);

const hasActionableRejectionFeedback = (reason?: string) => {
  const feedback = String(reason || '').trim();
  if (feedback.length < 20) return false;
  return !/^(fill|fix|correct|update|incomplete|missing|wrong|invalid|rejected?)[.!\s]*$/i.test(feedback);
};

// Helper: Get user-friendly shipment status label.
// Chaincode `coffee` v2.3 closed set (main.go validShipmentStatuses) —
// exactly these 19 values, no others. Anything else renders raw so an
// unexpected value is visible, never silently relabelled.
const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  FREIGHT_BOOKED: 'Freight Booked',
  PERMIT_ISSUED: 'Export Permit Issued',
  CUSTOMS_DECLARED: 'Customs Declared',
  CUSTOMS_CLEARED: 'Customs Cleared',
  CUSTOMS_REJECTED: 'Customs Rejected',
  INSPECTION_PENDING: 'Inspection Pending',
  INSPECTION_COMPLETE: 'Inspection Complete',
  LAND_TRANSPORT: 'Land Transport',
  PORT_ARRIVED: 'Arrived at Port',
  CONTAINER_STUFFED: 'Container Stuffed',
  VESSEL_LOADED: 'Loaded on Vessel',
  DEPARTED: 'Departed',
  IN_TRANSIT: 'In Transit',
  DESTINATION_ARRIVED: 'Arrived at Destination',
  DELIVERED: 'Delivered',
  LOADED: 'Loaded',
  CANCELLED: 'Cancelled',
  ARRIVED: 'Arrived',
};

const getShipmentStatusLabel = (status: string, logisticsStatus?: string): string => {
  // Shipment status and the legacy logistics status share one namespace;
  // the more specific logistics value wins only when it is a real
  // chaincode status, otherwise the workflow status is shown.
  if (logisticsStatus && SHIPMENT_STATUS_LABELS[logisticsStatus]) {
    return SHIPMENT_STATUS_LABELS[logisticsStatus];
  }
  return SHIPMENT_STATUS_LABELS[status] || status;
};

// Helper: Get user-friendly payment status label.
// Chaincode `coffee` v2.3 LC payment machine (payment.go): PENDING →
// DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED → SWIFT_RECEIVED →
// SETTLED → CONFIRMED. REJECTED is also reachable (DOCUMENTS_SUBMITTED /
// SWIFT_INITIATED → REJECTED) so it gets a label, but it is not part of
// the forward path.
const getPaymentStatusLabel = (status: string, trackingStatus?: string): string => {
  const statusLabels: Record<string, string> = {
    PENDING: 'Pending Payment',
    DOCUMENTS_SUBMITTED: 'Documents Submitted',
    VERIFIED: 'Documents Verified',
    SWIFT_INITIATED: 'SWIFT Payment Initiated',
    SWIFT_RECEIVED: 'SWIFT Payment Received',
    SETTLED: 'Payment Settled',
    CONFIRMED: 'Settlement Confirmed',
    REJECTED: 'Payment Rejected',
  };

  if (trackingStatus) {
    return statusLabels[trackingStatus] || trackingStatus;
  }
  return statusLabels[status] || status;
};

// Helper: Get status color
const getStatusColor = (status: string): string => {
  const successStatuses = ['APPROVED', 'ISSUED', 'ALLOCATED', 'CLEARED', 'RELEASED', 'DELIVERED', 'CONFIRMED', 'SETTLED', 'VERIFIED'];
  const warningStatuses = ['PENDING', 'REQUESTED', 'REGISTERED', 'IN_TRANSIT', 'FREIGHT_BOOKED', 'DOCUMENTS_SUBMITTED', 'SWIFT_INITIATED', 'SWIFT_RECEIVED'];
  const errorStatuses = ['REJECTED', 'FAILED', 'CANCELLED', 'CUSTOMS_REJECTED'];

  if (successStatuses.includes(status)) return 'success';
  if (errorStatuses.includes(status)) return 'error';
  if (warningStatuses.includes(status)) return 'warning';
  return 'default';
};


interface ForexStatus {
  forexId: string;
  contractId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  status: 'REQUESTED' | 'CONFIRMED' | 'ALLOCATED' | 'UTILIZED' | 'REJECTED';
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
  status: 'REQUESTED' | 'APPROVED' | 'ISSUED' | 'AMENDED' | 'FOREX_ALLOCATED' | 'UTILIZED' | 'PAYMENT_RELEASED' | 'SETTLED' | 'REJECTED' | 'EXPIRED';
  expiryDate: string;
  messages?: any[]; // Optional: SWIFT messages related to this LC
}

// Transport Mode Type
type TransportMode = 'SEA' | 'AIR';

interface ShipmentStatus {
  shipmentId: string;
  contractId: string;
  buyerId?: string;
  quantity: number;
  grade?: string;
  // Shipment status — chaincode `coffee` v2.3 closed set
  // (main.go validShipmentStatuses): exactly these 19 values. The old
  // union listed DRAFT / REGISTERED / QUALITY_PENDING / QUALITY_APPROVED /
  // QUALITY_REJECTED / BOOKED / COMPLETED / CONFIRMED, none of which any
  // shipment machine ever assigns (quality is an *inspection* state;
  // quality.go sets a shipment to INSPECTION_PENDING on request and to
  // INSPECTION_COMPLETE on approval).
  status: 'CREATED' | 'FREIGHT_BOOKED' | 'PERMIT_ISSUED' | 'CUSTOMS_DECLARED' | 'CUSTOMS_CLEARED' | 'CUSTOMS_REJECTED' | 'INSPECTION_PENDING' | 'INSPECTION_COMPLETE' | 'LAND_TRANSPORT' | 'PORT_ARRIVED' | 'CONTAINER_STUFFED' | 'VESSEL_LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'DESTINATION_ARRIVED' | 'DELIVERED' | 'LOADED' | 'CANCELLED' | 'ARRIVED';
  // Logistics tracking status: same chaincode namespace as `status`
  // (there is no separate logistics field on-chain).
  logisticsStatus?: 'CREATED' | 'FREIGHT_BOOKED' | 'PERMIT_ISSUED' | 'CUSTOMS_DECLARED' | 'CUSTOMS_CLEARED' | 'CUSTOMS_REJECTED' | 'INSPECTION_PENDING' | 'INSPECTION_COMPLETE' | 'LAND_TRANSPORT' | 'PORT_ARRIVED' | 'CONTAINER_STUFFED' | 'VESSEL_LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'DESTINATION_ARRIVED' | 'DELIVERED' | 'LOADED' | 'CANCELLED' | 'ARRIVED';
  transportMode?: TransportMode;
  billOfLading?: string;
  vesselName?: string;
  currentLocation?: string;
  estimatedArrival?: string;
}

interface PaymentStatus {
  paymentId: string;
  contractId: string;
  shipmentId?: string;
  amount: number;
  currency: string;
  retainedAmount: number;
  convertedAmount: number;
  amountBirr: number;
  // Chaincode `coffee` v2.3 LC payment machine (payment.go):
  // PENDING → DOCUMENTS_SUBMITTED → VERIFIED → SWIFT_INITIATED →
  // SWIFT_RECEIVED → SETTLED → CONFIRMED. The old union (RECEIVED /
  // SPLIT / RETENTION_CONVERTED / RELEASED / COMPLETED) was a phantom
  // machine — no payment ever has those statuses.
  status: 'PENDING' | 'DOCUMENTS_SUBMITTED' | 'VERIFIED' | 'SWIFT_INITIATED' | 'SWIFT_RECEIVED' | 'SETTLED' | 'CONFIRMED';
  // The chaincode payment's `status` IS the tracking machine, so this
  // mirrors it (populated from `status` in the loader).
  paymentTrackingStatus?: 'PENDING' | 'DOCUMENTS_SUBMITTED' | 'VERIFIED' | 'SWIFT_INITIATED' | 'SWIFT_RECEIVED' | 'SETTLED' | 'CONFIRMED';
  swiftReference?: string;
}

const ExporterPortal: React.FC = () => {
  // Professional Brand Colors - Matching Login Page Theme
  const brandPrimary = getPortalBrand('EXPORTER').primary; // Purple (matching login page)
  const brandSecondary = '#FFD700'; // Gold (matching login page)
  const brandSuccess = '#10B981'; // Emerald (positive actions)
  const brandWarning = '#F59E0B'; // Amber (alerts)
  const brandError = '#EF4444'; // Red (critical)
  const brandInfo = '#3B82F6'; // Blue (informational)
  const BRAND_COLOR = brandPrimary; // Primary brand color for components
  
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  
  // State Management
  const [profile, setProfile] = useState<ExporterProfile | null>(null);
  const [contracts, setContracts] = useState<ExportContract[]>([]);
  const [allContracts, setAllContracts] = useState<ExportContract[]>([]);
  const [forexStatuses, setForexStatuses] = useState<ForexStatus[]>([]);
  
  // Audit Trail Stats
  const [auditStats, setAuditStats] = useState({
    totalActivities: 0,
    uniqueEntities: 0,
    recentActions: 0,
    blockchainVerified: 0,
    organizationsInvolved: 0,
    journeyStages: 0,
    statusChanges: 0,
    actionCounts: {} as Record<string, number>,
    entityCounts: {} as Record<string, number>
  });
  const [allForexStatuses, setAllForexStatuses] = useState<ForexStatus[]>([]);
  const [lcStatuses, setLCStatuses] = useState<LCStatus[]>([]);
  const [allLCStatuses, setAllLCStatuses] = useState<LCStatus[]>([]);
  const [shipments, setShipments] = useState<ShipmentStatus[]>([]);
  const [allShipments, setAllShipments] = useState<ShipmentStatus[]>([]);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentStatus[]>([]);
  const [shipmentsWithPermits, setShipmentsWithPermits] = useState<Set<string>>(new Set());
  // Raw export permits for this exporter, from GET /permits/exporter/:exporterId
  // (chaincode QueryPermitsByExporter). A permit has no shipmentId — it
  // links to shipments through contractId (permit.go) — so
  // shipmentsWithPermits is derived from these + the shipment's own
  // PERMIT_ISSUED status in the effect below.
  const [exportPermits, setExportPermits] = useState<any[]>([]);
  const [shipmentsWithDeclarations, setShipmentsWithDeclarations] = useState<Set<string>>(new Set());
  // Latest customs declaration per shipment, joined by shipmentId
  // (GET /customs/declarations returns declaration.status alongside
  // shipmentId). Used for the real customs-cleared derivation (F18/F24).
  const [declarationsByShipment, setDeclarationsByShipment] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  
  // Dialog States
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [createContractDialogOpen, setCreateContractDialogOpen] = useState(false);
  const [createShipmentDialogOpen, setCreateShipmentDialogOpen] = useState(false);
  const [contractDetailDialogOpen, setContractDetailDialogOpen] = useState(false);
  const [shipmentDetailDialogOpen, setShipmentDetailDialogOpen] = useState(false);
  const [customsDeclarationDialogOpen, setCustomsDeclarationDialogOpen] = useState(false);
  const [bookShippingDialogOpen, setBookShippingDialogOpen] = useState(false);
  const [paymentSettlementDialogOpen, setPaymentSettlementDialogOpen] = useState(false);
  const [postDeliveryDialogOpen, setPostDeliveryDialogOpen] = useState(false);
  const [lcRequestDialogOpen, setLcRequestDialogOpen] = useState(false);
  const [selectedContractForLC, setSelectedContractForLC] = useState<ExportContract | null>(null);
  const [selectedContractForDetail, setSelectedContractForDetail] = useState<ExportContract | null>(null);
  const [correctingRejectedContractId, setCorrectingRejectedContractId] = useState<string | null>(null);
  const [selectedShipmentForDetail, setSelectedShipmentForDetail] = useState<any>(null);
  const [isRequestingLC, setIsRequestingLC] = useState(false);
  const [selectedShipmentForCustoms, setSelectedShipmentForCustoms] = useState<ShipmentStatus | null>(null);
  const [selectedShipmentForShipping, setSelectedShipmentForShipping] = useState<ShipmentStatus | null>(null);
  const [selectedShipmentForPayment, setSelectedShipmentForPayment] = useState<ShipmentStatus | null>(null);
  const [selectedShipmentForPostDelivery, setSelectedShipmentForPostDelivery] = useState<ShipmentStatus | null>(null);
  const [isSubmittingCustoms, setIsSubmittingCustoms] = useState(false);
  const [isBookingShipping, setIsBookingShipping] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isSubmittingLCDocuments, setIsSubmittingLCDocuments] = useState(false);
  // Reports tab (tab 6) — controlled inputs for the real export endpoint
  const [reportStartDate, setReportStartDate] = useState('2026-01-01');
  const [reportEndDate, setReportEndDate] = useState('2026-12-31');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
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
  const [lcRequestForm, setLcRequestForm] = useState({
    advisingBank: '',        // Exporter's bank (advising bank)
    beneficiaryName: '',     // Exporter company name
    expiryDays: '90',        // Default 90 days from today
    amount: '',              // Will be auto-filled from contract
    currency: 'USD',
    transportMode: 'SEA' as 'SEA' | 'AIR',
    portOfLoading: 'Djibouti Port',
    portOfDischarge: '',
    latestShipmentDays: '60', // Days from LC issuance
    partialShipment: false,
    transhipment: true,
    paymentTerms: 'Sight LC',
    specialInstructions: '',
  });
  const [selectedContract, setSelectedContract] = useState<ExportContract | null>(null);
  // LEG 1 (F5a): exporter forex request form. There was no exporter
  // forex form at all — the portal only GET-listed allocations, and
  // both creation routes 403'd EXPORTER.
  const [forexRequestDialogOpen, setForexRequestDialogOpen] = useState(false);
  const [isRequestingForex, setIsRequestingForex] = useState(false);
  const [forexRequestForm, setForexRequestForm] = useState({
    contractId: '',
    lcId: '',
    amount: '',
    currency: 'USD',
  });
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [shipmentJustCreated, setShipmentJustCreated] = useState(false); // Flag to hide workflow alert during reload
  
  // Document upload states - removed DocumentUploadDialog, using simple file input
  const [contractDocuments, setContractDocuments] = useState<any[]>([]);
  const [customsDocuments, setCustomsDocuments] = useState<any[]>([]);
  const [draftContractId, setDraftContractId] = useState('');
  // LEG 1 (F3): the buyerID captured when edit mode opened, so an edit
  // never re-derives (and changes) the buyer identity from the company
  // name field.
  const [editingBuyerId, setEditingBuyerId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); // Track if editing existing contract
  
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
    retentionRate?: number;
  } | null>(null);

  // Real forex rate for selected shipment contract
  const [selectedShipmentForexRate, setSelectedShipmentForexRate] = useState<number>(0);
  
  const generateICOReference = (contractId: string, exporterId?: string) => {
    const exporterSegment = exporterId ? exporterId.replace(/\W/g, '').slice(-4).padStart(4, '0').toUpperCase() : '0000';
    const contractSegment = contractId.replace(/\W/g, '').slice(-5).padStart(5, '0').toUpperCase();
    return `ET-${exporterSegment}-${contractSegment}`;
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
      // Leg2 #16: never auto-fill an ECX lot number — a generated
      // ECX-… number names a lot that does not exist, and the API now
      // rejects it (LOT_NOT_FOUND). The exporter must enter a real lot
      // (graded and assigned to this contract).
    }));
    setSelectedShipmentForexRate(Number(forexRate) || 0);
  };

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT'>('EXPORTER');
  const [auditEntityId, setAuditEntityId] = useState<string>('');
  
  // Mock Data for Testing
  useEffect(() => {
    loadExporterData();
  }, []);

  // Debug LC dialog state
  useEffect(() => {
    console.log('[LC DIALOG STATE] lcRequestDialogOpen:', lcRequestDialogOpen, 'selectedContractForLC:', selectedContractForLC?.contractId);
  }, [lcRequestDialogOpen, selectedContractForLC]);

  // Load audit trail stats when Audit Trail tab is active (tab 7, not 6 —
  // tab 6 is Reports)
  useEffect(() => {
    console.log('[Exporter Portal] Tab changed to:', tabValue);
    if (tabValue === 7) {
      console.log('[Exporter Portal] Loading audit stats for Audit Trail tab');
      loadAuditStats();
    }
  }, [tabValue]);

  // ?tab=<index> deep-link from global search results (all 8 tabs are
  // visible to every exporter, so the full 0–7 range is valid).
  useTabFromQuery(setTabValue, [0, 1, 2, 3, 4, 5, 6, 7]);

  const loadAuditStats = async () => {
    try {
      console.log('[Exporter Portal] === LOADING AUDIT STATS ===');
      console.log('[Exporter Portal] Calling audit API...');
      
      const response = await apiFetch('/audit/portal/recent?limit=1000', {
        headers: getAuthHeaders()
      });
      
      console.log('[Exporter Portal] Response status:', response.status);
      console.log('[Exporter Portal] Response ok?:', response.ok);
      
      if (!response.ok) {
        console.error('[Exporter Portal] API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('[Exporter Portal] Error response:', errorText);
        return;
      }
      
      const data = await response.json();
      console.log('[Exporter Portal] === AUDIT STATS RAW RESPONSE ===');
      console.log('[Exporter Portal] Full response:', JSON.stringify(data, null, 2));
      console.log('[Exporter Portal] data.success:', data.success);
      console.log('[Exporter Portal] data.data exists?:', !!data.data);
      
      if (data.success && data.data) {
        const logs = data.data.logs || [];
        console.log('[Exporter Portal] === AUDIT LOGS ===');
        console.log('[Exporter Portal] Logs array length:', logs.length);
        console.log('[Exporter Portal] First log:', logs[0]);
        console.log('[Exporter Portal] All logs:', logs);
        
        // Calculate comprehensive stats
        const totalActivities = logs.length;
        
        // Count unique entities (contracts, shipments, LCs, etc.)
        const uniqueEntities = new Set(logs.map((log: any) => `${log.entity_type}-${log.entity_id}`)).size;
        
        // Count activities in last 7 days
        const recentActions = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }).length;
        
        // Count blockchain verified activities
        const blockchainVerified = logs.filter((log: any) => log.metadata?.blockchainVerified === true).length;
        
        // Count unique organizations involved (tracking the journey path)
        const organizationsInvolved = new Set(
          logs.map((log: any) => log.performed_by_org).filter(Boolean)
        ).size;
        
        // Count by action types to show journey stages
        const actionCounts = logs.reduce((acc: any, log: any) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {});
        
        // Count by entity types to show what's being tracked
        const entityCounts = logs.reduce((acc: any, log: any) => {
          acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
          return acc;
        }, {});
        
        // Journey stages completed (different actions represent different stages)
        const journeyStages = Object.keys(actionCounts).length;
        
        // Status changes (tracks progress through the system)
        const statusChanges = logs.filter((log: any) => 
          log.action.includes('APPROVE') || 
          log.action.includes('REGISTER') || 
          log.action.includes('VERIFY') ||
          log.action.includes('ISSUE') ||
          log.action.includes('RELEASE')
        ).length;
        
        const statsData = {
          totalActivities,
          uniqueEntities,
          recentActions,
          blockchainVerified,
          organizationsInvolved,
          journeyStages,
          statusChanges,
          actionCounts,
          entityCounts
        };
        
        console.log('[Exporter Portal] === CALCULATED STATS ===');
        console.log('[Exporter Portal] Calculated audit stats:', statsData);
        console.log('[Exporter Portal] Setting audit stats state...');
        setAuditStats(statsData);
        console.log('[Exporter Portal] ✅ Audit stats state updated successfully!');
        
        // Show success message
        if (totalActivities > 0) {
          showInfo('Audit Trail Loaded', `Loaded ${totalActivities} audit trail activities`);
        } else {
          showWarning('No Activities', 'No audit trail activities found for this account yet. Activities will appear here as you perform actions.');
        }
      } else {
        console.error('[Exporter Portal] ❌ Audit stats API returned error or no data');
        console.error('[Exporter Portal] data.success:', data.success);
        console.error('[Exporter Portal] data.data:', data.data);
        console.error('[Exporter Portal] Full data object:', data);
        showError('Load Failed', 'Failed to load audit trail statistics');
      }
    } catch (error) {
      console.error('[Exporter Portal] ❌ Failed to load audit stats - EXCEPTION:', error);
      console.error('[Exporter Portal] Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      showError('Error Loading Audit Trail', `Error loading audit trail: ${(error as Error).message}`);
    }
  };
  
  // "Has export permit" comes from the permit endpoint, never from an
  // inspection row: GET /permits/exporter/:exporterId (permits.ts:334,
  // chaincode QueryPermitsByExporter). The old code inferred it from a
  // quality-inspection row whose status lowercased to 'permit_issued' —
  // that worked only by accident and treated an APPROVED-but-not-permitted
  // inspection as "no inspection". A permit carries contractId (no
  // shipmentId — permit.go), so the shipment join happens in the effect
  // below, via contractId, plus the shipment's own PERMIT_ISSUED status
  // (the IssueCBEExportPermit cascade sets CREATED shipments to it).
  const loadExportPermits = async (token: string | null, exporterId: string) => {
    if (!token || !exporterId) return;

    try {
      console.log('[EXPORTER] Fetching export permits...');
      const response = await apiFetch(`/permits/exporter/${encodeURIComponent(exporterId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.warn('[EXPORTER] Permits API returned status:', response.status);
        return;
      }

      const result = await response.json();
      // permits.ts returns the raw array (not {success, data})
      const permits = Array.isArray(result) ? result : (result.data || []);
      console.log('[EXPORTER] Export permits:', permits.length);
      setExportPermits(permits);
    } catch (error) {
      console.error('[EXPORTER] Failed to load export permits:', error);
    }
  };

  // Derive shipmentsWithPermits from the loaded permits + shipments.
  // A shipment has a permit when its own status is PERMIT_ISSUED, or
  // when an ISSUED/UTILIZED/SETTLED permit exists for its contract
  // (permits are usually issued before the shipment is created, so the
  // cascade may never have touched the shipment row).
  useEffect(() => {
    const permitted = new Set<string>();
    shipments.forEach((shipment) => {
      if (shipment.status === 'PERMIT_ISSUED') {
        permitted.add(shipment.shipmentId);
        return;
      }
      const hasPermitForContract = exportPermits.some((permit: any) => {
        const permitContractId = permit.contractId || permit.ContractID || permit.contract_id;
        const permitStatus = String(permit.status || permit.Status || '').toUpperCase();
        return permitContractId === shipment.contractId &&
          ['ISSUED', 'UTILIZED', 'SETTLED'].includes(permitStatus);
      });
      if (hasPermitForContract) permitted.add(shipment.shipmentId);
    });
    setShipmentsWithPermits(permitted);
  }, [shipments, exportPermits]);
  
  const loadCustomsDeclarations = async (token: string | null) => {
    if (!token) return;
    
    try {
      console.log('[EXPORTER] Loading customs declarations from backend...');
      const response = await apiFetch('/customs/declarations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Extract shipment IDs directly from declarations (backend returns camelCase)
          const declaredShipmentIds = result.data
            .map((decl: any) => decl.shipmentId)
            .filter(Boolean);
          
          console.log('[EXPORTER] Found declarations for shipments:', declaredShipmentIds);
          setShipmentsWithDeclarations(new Set(declaredShipmentIds));
          // Join declarations by shipmentId so the Customs tab and the
          // dashboard can show the real declaration.status (F18/F24).
          // Last declaration per shipment wins.
          const byShipment = new Map<string, any>();
          result.data.forEach((decl: any) => {
            if (decl.shipmentId) byShipment.set(decl.shipmentId, decl);
          });
          setDeclarationsByShipment(byShipment);
        }
      }
    } catch (error) {
      console.error('[EXPORTER] Failed to load customs declarations:', error);
    }
  };
  
  const loadExporterData = async () => {
    console.log('[EXPORTER] 🚀 ========== LOADING ALL DATA FROM BLOCKCHAIN ========== ');
    
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
    
    // SKIP slow API calls - load permits/customs in background
    loadExportPermits(token, currentExporterId).catch(e => console.warn('Export permits failed:', e));
    loadCustomsDeclarations(token).catch(e => console.warn('Customs declarations failed:', e));
    
    // SKIP profile API - load in background (don't block blockchain data!)
    if (token) {
      apiFetch('/exporters/me/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async (profileResponse) => {
        if (profileResponse.ok) {
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
          }
        }
      })
      .catch(e => console.warn('Profile API failed (non-blocking):', e));
      
      // Set default profile immediately (no waiting!)
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
    }
    
    console.log('[EXPORTER] ⚡ Profile section complete, starting blockchain data load...');
    
    // EXPERT FIX: Load contracts from API (which fetches from blockchain)
    try {
      console.log('[EXPORTER] 🔗 Loading all contract pages from API...');
      const result = await api.getContracts();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch contracts');
      }
      const allDocs = result.data || [];
      console.log(`[EXPORTER] ✅ Found ${allDocs.length} total contracts from API`);
      
      // Filter contracts for current exporter only  
      const myContracts = allDocs.filter((c: any) => {
        const contractExporterId = c.exporterID || c.exporterId || c.ExporterID;
        return String(contractExporterId || '').trim().toLowerCase() === String(currentExporterId || '').trim().toLowerCase();
      });
      
      console.log(`[EXPORTER] ✅ Found ${myContracts.length} contracts for exporter ${currentExporterId}`);
      console.log(`[EXPORTER] Contract statuses:`, myContracts.map((c: any) => ({ 
        id: c.contractID || c.contractId, 
        status: c.contractStatus 
      })));
      
      // Map blockchain contracts to UI format (removed validation filter - show ALL contracts)
      const mappedContracts = myContracts.map((c: any, index: number) => {
        const contractId = c.contractID || c.contractId || c.ContractID || 
                          `TEMP_${currentExporterId}_${index}_${Date.now()}`;
        
        const buyerBank = c.buyerBank || c.BuyerBank || '';
        const exporterBank = c.exporterBank || c.ExporterBank || '';
        
        const rawQuantity = c.quantity || c.Quantity || '0';
        const rawPricePerKg = c.pricePerKg || c.PricePerKg || '0';
        const rawTotalValue = c.totalValue || c.TotalValue || '0';
        
        const quantity = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) || 0 : Number(rawQuantity) || 0;
        const pricePerKg = typeof rawPricePerKg === 'string' ? parseFloat(rawPricePerKg) || 0 : Number(rawPricePerKg) || 0;
        const totalValue = typeof rawTotalValue === 'string' ? parseFloat(rawTotalValue) || 0 : Number(rawTotalValue) || 0;
        
        return {
          contractId: contractId,
          nbeReferenceNumber: c.nbeReferenceNumber || c.NBEReferenceNumber || 'Pending NBE Approval',
          buyerId: c.buyerId || c.buyerID || c.BuyerID || '',
          buyerName: c.buyerName || c.BuyerName || c.buyerId || c.buyerID || c.BuyerID || 'Unknown',
          buyerCountry: c.buyerCountry || c.BuyerCountry || 'Unknown',
          origin: c.origin || c.Origin || c.contractOrigin || c.contractOrigin || '',
          buyerBank: buyerBank,
          exporterBank: exporterBank,
          coffeeType: c.coffeeType || c.CoffeeType || 'Unknown',
          quantity,
          pricePerKg,
          totalValue,
          currency: c.currency || c.Currency || 'USD',
          status: String(c.contractStatus || c.ContractStatus || c.status || 'REGISTERED').toUpperCase() as ExportContract['status'],
          registrationDate: c.registrationDate || c.RegistrationDate || new Date().toISOString(),
          approvalDate: c.approvalDate || c.ApprovalDate || '',
          rejectionReason: c.rejectionReason || c.RejectionReason || '',
          rejectionDate: c.rejectionDate || c.RejectionDate || null,
          rejectedBy: c.rejectedBy || c.RejectedBy || '',
          paymentMethod: c.paymentMethod || c.PaymentMethod || 'LC',
          eudrRequired: c.eudrRequired ?? c.EUDRRequired ?? true,
          supersedesContractId: c.supersedesContractId || c.SupersedesContractId || '',
        };
      });
      setContracts(mappedContracts);
      setAllContracts(mappedContracts);
      console.log(`✅ Loaded ${mappedContracts.length} contracts for exporter ${currentExporterId}`);
    } catch (error) {
      console.error('[EXPORTER] ❌ Failed to load contracts from API:', error);
      console.error('[EXPORTER] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
    }

    // EXPERT FIX: Load LCs from API (which fetches from blockchain)
    try {
      console.log('[EXPORTER] 🔗 Loading LCs from API...');
      const response = await apiFetch('/banking/lc', { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch LCs: ${response.statusText}`);
      }
      
      const result = await response.json();
      const allLCs = result.data || [];
      
      const myLCs = allLCs.filter((lc: any) => 
        (lc.exporterId || lc.ExporterID) === currentExporterId
      );
      console.log(`[EXPORTER] ✅ Found ${myLCs.length} LCs for exporter ${currentExporterId}`);
          
          // Filter out incomplete LCs - only show LCs with complete data
          const validLCs = myLCs.filter((lc: any) => {
            const lcId = lc.lcId || lc.LCID || '';
            const amount = lc.amount || lc.Amount || 0;
            const contractId = lc.contractId || lc.ContractID || '';
            const status = lc.status || lc.Status || '';
            
            const hasValidData = lcId !== '' && amount > 0 && contractId !== '' && status !== '';
            
            if (!hasValidData) {
              console.log(`[EXPORTER] Filtering out incomplete LC ${lcId} (amount: ${amount}, contractId: "${contractId}", status: "${status}")`);
            }
            
            return hasValidData;
          });
          
          console.log(`[EXPORTER] Filtered from ${myLCs.length} to ${validLCs.length} valid LCs`);
          
          // Map LCs - only complete records with all required fields
          const mappedLCs = validLCs.map((lc: any) => ({
            lcId: lc.lcId || lc.LCID,
            contractId: lc.contractId || lc.ContractID,
            amount: lc.amount || lc.Amount,
            currency: lc.currency || lc.Currency,
            status: lc.status || lc.Status,
            issuingBank: lc.issuingBank || lc.IssuingBank || 'N/A',
            advisingBank: lc.advisingBank || lc.AdvisingBank || lc.beneficiaryBank || lc.BeneficiaryBank,
            issuedDate: lc.issueDate || lc.IssueDate || lc.issuedDate || lc.IssuedDate || null, // Note: API returns issueDate, map to issuedDate
            requestDate: lc.requestDate || lc.RequestDate || null,
            approvalDate: lc.approvalDate || lc.ApprovalDate || null,
            expiryDate: lc.expiryDate || lc.ExpiryDate,
            messages: lc.messages || [], // For SWIFT messages
          }));
          
          // Filter out incomplete LCs - only keep those with essential fields populated
          const completeLCs = mappedLCs.filter((lc: any) => 
            lc.lcId && 
            lc.amount && 
            lc.status && 
            lc.expiryDate
            // Don't require issueDate - REQUESTED and APPROVED LCs won't have it yet
          );
          
      console.log(`[EXPORTER] Loaded ${myLCs.length} LCs, ${completeLCs.length} complete LCs for exporter`);
      setLCStatuses(completeLCs);
      setAllLCStatuses(completeLCs);
      console.log(`Loaded ${myLCs.length} LCs for exporter`);

    } catch (error) {
      console.warn('Could not load LCs:', error);
    }

    // EXPERT FIX: Load Forex allocations from API (which fetches from blockchain)
    try {
      console.log('[EXPORTER] 🔗 Loading Forex from API...');
      const response = await apiFetch('/forex', { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch forex: ${response.statusText}`);
      }
      
      const result = await response.json();
      const allForex = result.data || [];
      
      const myForex = allForex.filter((f: any) => 
        (f.exporterId || f.ExporterID) === currentExporterId
      );
      
      console.log(`[EXPORTER] ✅ Found ${myForex.length} forex allocations for exporter ${currentExporterId}`);
      
      
      const mappedForex = myForex.map((f: any) => ({
        forexId: f.forexId || f.ForexID,
        contractId: f.contractId || f.ContractID,
        exporterId: f.exporterId || f.ExporterID,
        lcId: f.lcId || f.LCID,
        requestedAmount: f.requestedAmount || f.RequestedAmount || 0,
        allocatedAmount: f.allocatedAmount || f.AllocatedAmount || 0,
        currency: f.currency || f.Currency,
        exchangeRate: f.exchangeRate || f.ExchangeRate || 0,
        retentionRate: f.retentionRate ?? f.RetentionRate ?? 0,
        status: f.status || f.Status,
        expiryDate: f.expiryDate || f.ExpiryDate,
        allocationDate: f.allocationDate || f.AllocationDate,
        requestDate: f.requestDate ? new Date(f.requestDate) : (f.RequestDate ? new Date(f.RequestDate) : undefined),
      }));
      
      setForexStatuses(mappedForex);
      setAllForexStatuses(mappedForex);
      console.log(`[EXPORTER] Total ledger forex allocations: ${mappedForex.length}`);
    } catch (error) {
      console.warn('Could not load forex allocations:', error);
    }

    // EXPERT FIX: Load Shipments from API (which fetches from blockchain)
    try {
      console.log('[EXPORTER] 🔗 Loading all shipment pages from API...');
      const shipmentsResult = await api.getShipments();
      if (!shipmentsResult.success) {
        throw new Error(shipmentsResult.error?.message || 'Failed to fetch shipments');
      }
      const allShipmentDocs = shipmentsResult.data || [];
      console.log(`[EXPORTER] ✅ Found ${allShipmentDocs.length} total shipments from API`);
      
      const myShipments = allShipmentDocs.filter((s: any) => 
        String(s.exporterId || s.ExporterID || s.exporterID || '').trim().toLowerCase() === String(currentExporterId || '').trim().toLowerCase()
      );
      console.log(`[EXPORTER] ✅ Found ${myShipments.length} shipments for exporter ${currentExporterId}`);
        
        // Filter out shipments with empty/invalid data - show ALL shipments with shipmentId
        const validShipments = myShipments.filter((s: any) => {
          const shipmentId = s.shipmentID || s.shipmentId || '';
          
          // Only require valid shipmentId (removed quantity/grade requirements)
          const hasValidData = shipmentId !== '';
          
          if (!hasValidData) {
            console.log(`[EXPORTER] Filtering out shipment without ID`);
          }
          
          return hasValidData;
        });
        
        console.log(`[EXPORTER] Filtered from ${myShipments.length} to ${validShipments.length} valid shipments`);
        
        const mappedShipments = validShipments.map((s: any) => {
          const shipmentId = s.shipmentID || s.shipmentId;
          const status = s.status || s.Status || s.shipmentStatus || 'CREATED';
          
          // Ensure quantity is always a valid number - try all possible field names
          const rawQuantity = s.quantity || s.Quantity || s.shipmentQuantity || s.ShipmentQuantity || 0;
          const quantity = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) || 0 : Number(rawQuantity) || 0;
          
          // Debug log the raw shipment to see ALL available fields
          console.log(`[SHIPMENT MAPPING] Processing ${shipmentId}:`, {
            rawQuantity,
            parsedQuantity: quantity,
            rawGrade: s.grade || s.Grade,
            rawBuyerId: s.buyerId || s.buyerID || s.BuyerID,
            rawStatus: s.status || s.Status,
            allFields: Object.keys(s),
          });
          
          // Map ALL shipment fields from blockchain to UI format
          return {
            shipmentId,
            contractId: s.contractID || s.contractId,
            exporterId: s.exporterID || s.exporterId || s.ExporterID,
            buyerId: s.buyerID || s.buyerId || s.BuyerID,
            origin: s.origin || s.Origin,
            quantity, // Properly parsed quantity
            grade: s.grade || s.Grade || s.coffeeGrade || s.CoffeeGrade,
            icoNumber: s.icoNumber || s.ICONumber,
            ecxLotNumber: s.ecxLotNumber || s.ECXLotNumber,
            channel: s.channel || s.Channel,
            forexRate: s.forexRate || s.ForexRate || 0,
            valueUSD: s.valueUSD || s.valueUsd || s.ValueUSD || 0,
            eudrCompliant: s.eudrCompliant || s.EUDRCompliant || false,
            transportMode: s.transportMode || s.TransportMode || 'SEA',
            status,
            billOfLading: s.billOfLadingNo || s.billOfLading || s.BillOfLading,
            vesselName: s.vesselName || s.VesselName,
            currentLocation: s.currentLocation || s.CurrentLocation,
            estimatedArrival: s.estimatedArrival || s.EstimatedArrival,
            departurePort: s.departurePort || s.DeparturePort,
            destinationPort: s.destinationPort || s.DestinationPort,
            createdAt: s.createdAt || s.CreatedAt || s.timestamp || s.Timestamp,
          };
        });
        
        // ✅ SHIPMENTS TAB: ONLY SHOW ACTUAL SHIPMENTS
        // Approved contracts should be handled in "My Contracts" tab with LC request workflow
        // Correct workflow: Contract Approved → Request LC → Bank Issues LC + Allocates Forex → Create Shipment
        console.log('[EXPORTER] ========== SHIPMENTS TAB: ACTUAL SHIPMENTS ONLY ==========');
        console.log(`[EXPORTER] Loaded ${mappedShipments.length} actual shipments for exporter`);
        
        setShipments(mappedShipments);
        setAllShipments(mappedShipments);
        console.log(`[EXPORTER] Loaded ${myShipments.length} shipments for exporter`);
        console.log('[EXPORTER] Sample shipment data:', myShipments[0]);
        console.log('[EXPORTER] Shipment contract IDs:', myShipments.map((s: any) => ({
          shipmentId: s.shipmentID || s.shipmentId,
          contractId: s.contractID || s.contractId,
          quantity: s.quantity || s.Quantity
        })));
        
        // NOW check forex allocation alert AFTER shipments are loaded
        // Only show forex alert if there's allocated forex BUT no shipment created yet
        try {
          const forexResponse = await apiFetch('/forex', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const forexResult = await forexResponse.json();
          if (forexResult.success && forexResult.data) {
            const myForex = forexResult.data.filter((f: any) => 
              (f.exporterId || f.ExporterID) === currentExporterId
            );
            
            const allocated = myForex.find((f: any) => (f.status || f.Status) === 'ALLOCATED');
            if (allocated) {
              const allocatedContractId = allocated.contractId || allocated.ContractID;
              // Check if exporter has already created a shipment for this contract
              const existingShipment = myShipments.find((s: any) => 
                (s.contractID || s.contractId) === allocatedContractId
              );
              
              if (!existingShipment) {
                // Only show alert if no shipment exists yet for this allocated forex
                console.log(`[EXPORTER] Showing forex alert for contract ${allocatedContractId} - no shipment created yet`);
                setForexAllocatedAlert({
                  show: true,
                  forexId: allocated.forexId || allocated.ForexID,
                  contractId: allocatedContractId,
                  allocatedAmount: allocated.allocatedAmount || allocated.AllocatedAmount || 0,
                  currency: allocated.currency || allocated.Currency || 'USD',
                  exchangeRate: allocated.exchangeRate || allocated.ExchangeRate || 0,
                  retentionRate: Number(allocated.retentionRate ?? allocated.RetentionRate) || undefined,
                });
              } else {
                console.log(`[EXPORTER] Shipment already exists for allocated forex contract ${allocatedContractId}, not showing alert`);
                setForexAllocatedAlert(null); // Dismiss alert if shipment exists
              }
            }
          }
        } catch (forexError) {
          console.warn('[EXPORTER] Error checking forex for alert:', forexError);
        }
    } catch (error) {
      console.warn('Could not load shipments:', error);
    }

    // Load Payments for current exporter
    try {
      if (token) {
        console.log('[EXPORTER] Fetching payments from API...');
        const paymentsResponse = await apiFetch('/payments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const paymentsResult = await paymentsResponse.json();
        console.log('[EXPORTER] Payments API response:', paymentsResult);
        
        if (paymentsResult.success && paymentsResult.data) {
          const myPayments = paymentsResult.data.filter((p: any) => 
            (p.exporterId || p.ExporterID || p.exporterID) === currentExporterId
          );
          console.log(`[EXPORTER] Filtered ${myPayments.length} payments for exporter ${currentExporterId}`);
          
          // Filter out incomplete Payments - only show payments with complete data
          const validPayments = myPayments.filter((p: any) => {
            const paymentId = p.paymentID || p.paymentId || '';
            const amount = p.amount || p.Amount || 0;
            const contractId = p.contractID || p.contractId || '';
            const status = p.status || p.Status || '';
            
            const hasValidData = paymentId !== '' && amount > 0 && contractId !== '' && status !== '';
            
            if (!hasValidData) {
              console.log(`[EXPORTER] Filtering out incomplete Payment ${paymentId} (amount: ${amount}, contractId: "${contractId}", status: "${status}")`);
            }
            
            return hasValidData;
          });
          
          console.log(`[EXPORTER] Filtered from ${myPayments.length} to ${validPayments.length} valid payments`);
          
          const mappedPayments = validPayments.map((p: any) => {
            // The chaincode payment's `status` IS the document-tracking
            // machine (PENDING → DOCUMENTS_SUBMITTED → VERIFIED →
            // SWIFT_INITIATED → SWIFT_RECEIVED → SETTLED → CONFIRMED,
            // payment.go) — there is no separate tracking field on-chain,
            // so populate paymentTrackingStatus from it (or from a PG row's
            // payment_tracking_status). The dashboard KPIs read this
            // field; without it Processing/Received/Settled were always 0.
            const rawTracking = p.paymentTrackingStatus || p.payment_tracking_status || p.status || p.Status || 'PENDING';
            const trackingStatus = ['PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'SWIFT_INITIATED', 'SWIFT_RECEIVED', 'SETTLED', 'CONFIRMED'].includes(rawTracking) ? rawTracking : 'PENDING';
            return {
              paymentId: p.paymentID || p.paymentId,
              contractId: p.contractID || p.contractId,
              shipmentId: p.shipmentId || p.ShipmentID || p.shipment_id || '',
              amount: p.amount || p.Amount || 0,
              currency: p.currency || p.Currency || 'USD',
              retainedAmount: p.retainedAmount || p.RetainedAmount || 0,
              convertedAmount: p.convertedAmount || p.ConvertedAmount || 0,
              amountBirr: p.amountBirr || p.AmountBirr || 0,
              status: p.status || p.Status || 'PENDING',
              paymentTrackingStatus: trackingStatus,
              swiftReference: p.swiftReference || p.SWIFTReference || p.swiftRef,
            };
          });
          setPayments(mappedPayments);
          setAllPayments(mappedPayments);
          console.log(`[EXPORTER] Loaded ${validPayments.length} payments for exporter`);
        }
      }
    } catch (error) {
      console.warn('Could not load payments:', error);
    }
    
    console.log('[EXPORTER] ✅ ========== ALL DATA LOADED FROM BLOCKCHAIN ==========');
    console.log(`[EXPORTER] 📊 Summary:`);
    console.log(`  - Contracts: ${contracts.length} (blockchain verified)`);
    console.log(`  - LCs: ${lcStatuses.length} (blockchain verified)`);
    console.log(`  - Forex: ${forexStatuses.length} (blockchain verified)`);
    console.log(`  - Shipments: ${shipments.length} (blockchain verified)`);
    console.log(`  - Payments: ${payments.length} (blockchain verified)`);
    console.log('[EXPORTER] ================================================================');
    
    // Note: Forex, LC, Shipments, and Payments are loaded from blockchain above
    // If no data exists yet, these arrays remain empty (not using mock data)
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleContractView = (contract: ExportContract) => {
    setSelectedContractForDetail(contract);
    setContractDetailDialogOpen(true);
  };

  const handleCorrectRejectedContract = (contract: ExportContract) => {
    setCorrectingRejectedContractId(contract.contractId);
    setDraftContractId(''); // Empty - this is a NEW contract replacing rejected one, ID generated on submit
    setIsEditMode(false); // This is a new contract, not an edit
    setContractDocuments([]);
    setNewContract((current) => ({
      ...current,
      buyerName: contract.buyerName === 'Unknown' ? '' : contract.buyerName,
      buyerCompany: contract.buyerId || '',
      buyerCountry: contract.buyerCountry || '',
      buyerBank: contract.buyerBank || '',
      exporterBank: contract.exporterBank || profile?.bankName || '',
      coffeeType: normalizeCoffeeType(contract.coffeeType),
      quantity: contract.quantity ? String(contract.quantity) : '',
      pricePerKg: contract.pricePerKg ? String(contract.pricePerKg) : '',
      currency: contract.currency || 'USD',
      paymentMethod: contract.paymentMethod || 'LC',
      eudrRequired: contract.eudrRequired ?? true,
    }));
    setContractDetailDialogOpen(false);
    setCreateContractDialogOpen(true);
  };

  // LEG 1 (F4): resubmit a REJECTED contract in place, keeping its ID.
  // The route used to be ECTA-only, so the only exporter path was
  // "register a corrected copy" (supersedesContractID) — the button for
  // that is still next to this one for cases that need a new contract.
  const handleResubmitContract = async (contract: ExportContract) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }
      const response = await apiFetch(`/contracts/${contract.contractId}/resubmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          resubmissionNote: `Resubmitted by exporter after ECTA feedback: ${contract.rejectionReason || 'see ECTA feedback'}`,
        }),
      });
      const result = await response.json();
      if (result.success) {
        showSuccess(
          'Contract Resubmitted',
          `Contract ${contract.contractId} is back with ECTA for re-evaluation (status REGISTERED).`,
          'You will be notified once ECTA reviews it. The contract keeps its original ID.'
        );
        loadExporterData();
      } else {
        showError('Resubmit Failed', result.error?.message || 'Failed to resubmit contract');
      }
    } catch (error: any) {
      showError('Network Error', 'Failed to resubmit contract', error.message || 'Please check if the API server is running and try again');
    }
  };
  
  const handleContractDialogClose = () => {
    setContractDialogOpen(false);
    setSelectedContract(null);
  };

  const handleContractDocumentSelect = async (
    category: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    console.log('📎 [DOCUMENT UPLOAD] Starting upload...');
    console.log('📎 Current state:', { isEditMode, draftContractId });

    const contractId = draftContractId || `CONTRACT${Date.now()}`;
    
    // Only set draftContractId if we don't already have one
    if (!draftContractId) {
      console.log('📎 Setting draftContractId for document upload:', contractId);
      setDraftContractId(contractId);
    } else {
      console.log('📎 Using existing draftContractId:', contractId);
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      showError('Authentication Required', 'You are not authenticated', 'Please login again to upload contract documents');
      return;
    }

    const queuedDocuments = files.map((file, index) => ({
      localId: `${category}-${Date.now()}-${Math.random()}-${index}`,
      file,
      category,
      encrypt: true,
      status: 'uploading' as 'uploading' | 'success' | 'error',
      documentId: undefined as string | undefined,
      hash: undefined as string | undefined,
      error: undefined as string | undefined,
    }));
    setContractDocuments((current) => [...current, ...queuedDocuments]);

    await Promise.all(queuedDocuments.map(async (document) => {
      try {
        const formData = new FormData();
        formData.append('file', document.file);
        formData.append('fileName', document.file.name);
        formData.append('documentType', document.category);
        formData.append('encrypt', 'true');
        formData.append('entityType', 'CONTRACT');
        formData.append('entityId', contractId);

        const response = await apiFetch('/documents/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Upload failed');
        }

        setContractDocuments((current) => current.map((item) => item.localId === document.localId
          ? { ...item, status: 'success', documentId: result.data.documentId, hash: result.data.hash }
          : item));
      } catch (error: any) {
        setContractDocuments((current) => current.map((item) => item.localId === document.localId
          ? { ...item, status: 'error', error: error.message || 'Upload failed' }
          : item));
      }
    }));
  };

  const handleCustomsDocumentSelect = async (
    documentType: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0 || !selectedShipmentForCustoms) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      showError('Authentication Required', 'You are not authenticated', 'Please login again to upload customs documents');
      return;
    }

    const queuedDocuments = files.map((file, index) => ({
      localId: `${documentType}-${Date.now()}-${Math.random()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      documentType,
      status: 'uploading' as 'uploading' | 'success' | 'error',
      documentId: undefined as string | undefined,
      error: undefined as string | undefined,
    }));
    setCustomsDocuments((current) => [...current, ...queuedDocuments]);

    await Promise.all(queuedDocuments.map(async (document) => {
      try {
        const formData = new FormData();
        formData.append('file', document.file);
        formData.append('fileName', document.file.name);
        formData.append('documentType', document.documentType);
        formData.append('encrypt', 'true');
        // Customs documents are associated with the shipment so they are visible to ECC.
        formData.append('entityType', 'SHIPMENT');
        formData.append('entityId', selectedShipmentForCustoms.shipmentId);

        const response = await apiFetch('/documents/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Upload failed');
        }

        setCustomsDocuments((current) => current.map((item) => item.localId === document.localId
          ? { ...item, status: 'success', documentId: result.data.documentId }
          : item));
      } catch (error: any) {
        setCustomsDocuments((current) => current.map((item) => item.localId === document.localId
          ? { ...item, status: 'error', error: error.message || 'Upload failed' }
          : item));
      }
    }));
  };

  const handleCreateContract = async () => {
    setIsCreatingContract(true);
    try {
      console.log('📝 [CONTRACT SUBMIT] Starting submission...');
      console.log('📝 Current state:', { isEditMode, draftContractId, contractDocumentsCount: contractDocuments.length });
      console.log(isEditMode ? '📝 Updating contract...' : '📝 Creating contract...', { profile, newContract, draftContractId, isEditMode });
      
      if (!profile) {
        console.error('Profile not loaded');
        showError('Profile Not Loaded', 'Your exporter profile could not be loaded', 'Please refresh the page and try again');
        return;
      }
      
      const contractId = draftContractId || `CONTRACT${Date.now()}`;
      const quantity = parseFloat(newContract.quantity);
      const pricePerKg = parseFloat(newContract.pricePerKg);
      
      if (isNaN(quantity) || isNaN(pricePerKg)) {
        showWarning('Invalid Input', 'Please enter valid numbers for quantity and price', 'Quantity and price must be numeric values');
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again to continue');
        return;
      }
      
      if (contractDocuments.some((doc) => doc.status !== 'success')) {
        showWarning('Documents Still Uploading', 'Finish uploading the selected documents first', 'Wait for each document to show Uploaded, or remove failed uploads and try again');
        return;
      }
      const uploadedDocuments = contractDocuments.map((doc) => ({
        documentId: doc.documentId,
        fileName: doc.file.name,
        category: doc.category,
        hash: doc.hash,
        ipfsCID: null,
        encrypted: doc.encrypt,
      }));

      // If updating, use PATCH with only the fields that should be updated
      const isUpdate = isEditMode; // Use explicit edit mode flag instead of draftContractId
      
      const contractData = isUpdate ? {
        // Only send fields that can be updated
        // LEG 1 (F3): buyerID is the buyer's immutable key — it must
        // NOT be re-derived from the (possibly edited) company name,
        // or a renamed buyer becomes a different buyer. Use the ID
        // captured when edit mode opened.
        buyerID: editingBuyerId || newContract.buyerCompany.replace(/\s+/g, '_').toUpperCase(),
        buyerName: newContract.buyerName,
        buyerCountry: newContract.buyerCountry,
        buyerBank: newContract.buyerBank,
        exporterBank: newContract.exporterBank,
        coffeeType: newContract.coffeeType,
        quantity,
        pricePerKg,
        currency: newContract.currency,
        paymentMethod: newContract.paymentMethod,
        eudrRequired: newContract.eudrRequired,
        organicCertified: newContract.organicCertified,
        fairTradeCertified: newContract.fairTradeCertified,
        portOfLoading: newContract.portOfLoading,
        portOfDestination: newContract.portOfDestination,
        deliveryDate: newContract.deliveryDate,
        incoterm: newContract.incoterm,
        specialInstructions: newContract.specialInstructions,
        documents: uploadedDocuments,
      } : {
        // For new contracts, send all required fields
        contractID: contractId,
        exporterID: profile.exporterId,
        buyerID: newContract.buyerCompany.replace(/\s+/g, '_').toUpperCase(),
        buyerName: newContract.buyerName,
        buyerCountry: newContract.buyerCountry,
        buyerBank: newContract.buyerBank,
        exporterBank: newContract.exporterBank,
        coffeeType: newContract.coffeeType,
        quantity,
        pricePerKg,
        currency: newContract.currency,
        paymentMethod: newContract.paymentMethod,
        eudrRequired: newContract.eudrRequired,
        // LEG 1 (F3): the create payload used to drop the nine
        // trade/contact fields the form collects (the update branch
        // sent them). They are now stored on the ledger + PG.
        buyerEmail: newContract.buyerEmail,
        buyerPhone: newContract.buyerPhone,
        organicCertified: newContract.organicCertified,
        fairTradeCertified: newContract.fairTradeCertified,
        portOfLoading: newContract.portOfLoading,
        portOfDestination: newContract.portOfDestination,
        deliveryDate: newContract.deliveryDate,
        incoterm: newContract.incoterm,
        specialInstructions: newContract.specialInstructions,
        documents: uploadedDocuments,
        ...(correctingRejectedContractId ? { supersedesContractID: correctingRejectedContractId } : {}),
      };

      console.log('🔍 DEBUG INFO:');
      console.log('  - Is Update Mode?', isUpdate);
      console.log('  - Draft Contract ID:', draftContractId);
      console.log('  - Contract ID:', contractId);
      console.log(isUpdate ? '  - Sending update data:' : '  - Sending contract data:', contractData);
      console.log(`  - Document count: ${uploadedDocuments.length}`);

      // Call API - use PATCH for updates, POST for new contracts
      const url = isUpdate ? `/contracts/${contractId}` : '/contracts';
      const method = isUpdate ? 'PATCH' : 'POST';
      
      console.log(`📡 API Call: ${method} ${url}`);
      
      const response = await apiFetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contractData)
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);
      
      if (result.success) {
        showSuccess(
          isUpdate ? 'Contract Updated Successfully' : (correctingRejectedContractId ? 'Corrected Contract Registered' : 'Contract Registered Successfully'),
          isUpdate 
            ? 'Your contract information has been updated successfully'
            : (correctingRejectedContractId
                ? `A replacement for rejected contract ${correctingRejectedContractId} has been registered.`
                : 'Your export contract has been registered on the blockchain'),
          isUpdate
            ? `Contract ID: ${contractId}\nThe updated information has been saved and will be reflected in the system.`
            : `Contract ID: ${contractId}\n${correctingRejectedContractId ? `Replaces: ${correctingRejectedContractId}\n` : ''}\nNext Steps:\n1. ECTA will review compliance\n2. NBE will approve for forex allocation\n3. You can track progress in the "My Contracts" tab`
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
        setDraftContractId('');
        setEditingBuyerId('');
        setIsEditMode(false); // Reset edit mode
        setCorrectingRejectedContractId(null);
        // Reload contracts
        loadExporterData();
      } else {
        console.error(isUpdate ? 'Contract update failed:' : 'Contract registration failed:', result);
        showError(
          isUpdate ? 'Contract Update Failed' : 'Contract Registration Failed',
          result.error?.message || (isUpdate ? 'Failed to update contract' : 'Failed to register contract'),
          'Please verify all information and try again'
        );
      }
    } catch (error: any) {
      console.error(isEditMode ? 'Error updating contract:' : 'Error creating contract:', error);
      showError(
        isEditMode ? 'Update Failed' : 'Network Error',
        isEditMode ? 'Failed to update contract' : 'Failed to register contract',
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

      // DUPLICATE PREVENTION: Check if shipment already exists for this contract
      const existingShipment = shipments.find(s => s.contractId === newShipment.contractId);
      if (existingShipment) {
        showWarning(
          'Shipment Already Exists', 
          `A shipment (${existingShipment.shipmentId}) has already been registered for this contract.`,
          'Each contract can only have one shipment. Please check the Shipments tab to view your existing shipment.'
        );
        setIsCreatingShipment(false);
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

      if (!Number.isFinite(selectedShipmentForexRate) || selectedShipmentForexRate <= 0) {
        showWarning('Forex Allocation Required', 'This shipment has no ledger-backed NBE exchange rate yet', 'Complete the forex allocation before registering the shipment.');
        return;
      }

      const shipmentId = `SHIP${Date.now()}`;
      const forexRate = selectedShipmentForexRate;
      const pricePerKg = parseFloat(((selectedContract as any).pricePerKg || (selectedContract as any).PricePerKg || '0').toString());
      const valueUSD = quantity * pricePerKg;
      const icoNumber = newShipment.icoNumber || generateICOReference(newShipment.contractId, profile.exporterId);
      // Leg2 #16: the lot number is never auto-generated here — the old
      // code computed a generated number and then (correctly) refused to
      // submit without a real one, so the generate call was dead code
      // that could only confuse. A shipment may only reference a real
      // ECX lot, and the API validates it (exists, graded, assigned to
      // this contract) before creating the shipment.
      const ecxLotNumber = newShipment.ecxLotNumber;

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

      // Get contract documents - extract IDs only for blockchain
      const contractDocuments = (selectedContract as any)?.documents || [];
      const documentIDs = Array.isArray(contractDocuments) 
        ? contractDocuments.map((doc: any) => {
            // Handle both string IDs and document objects
            if (typeof doc === 'string') return doc;
            return doc.documentId || doc.id || doc.documentID;
          }).filter(Boolean)
        : [];
      
      console.log(`[SHIPMENT] Contract has ${documentIDs.length} document IDs that will be linked to blockchain:`, documentIDs);

      const shipmentData = {
        shipmentID: shipmentId,
        contractID: newShipment.contractId,
        exporterID: profile.exporterId,
        buyerID: (selectedContract as any).BuyerID || (selectedContract as any).buyerID || (selectedContract as any).buyerId || 'UNKNOWN_BUYER',
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
        documents: documentIDs.map(id => ({ documentId: id })) // Send as array of objects with documentId
      };

      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again to continue');
        setIsCreatingShipment(false);
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

      console.log('[SHIPMENT] API response status:', response.status);
      console.log('[SHIPMENT] API response OK:', response.ok);

      const result = await response.json();
      
      console.log('[SHIPMENT] Success:', result.success);
      
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
        setShipmentJustCreated(true); // Hide workflow alert during reload
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
        setSelectedShipmentForexRate(0);
        
        // Wait for blockchain transaction to propagate to all peers before reloading
        setTimeout(() => {
          console.log('[SHIPMENT] Reloading data after shipment creation...');
          loadExporterData(); // Reload to show new shipment
          setShipmentJustCreated(false); // Reset flag after reload
          // Switch to Shipments tab to show the new shipment
          setTabValue(2); // Tab 2 is Shipments tab
        }, 3000); // 3 second delay for blockchain sync
      } else {
        console.error('[SHIPMENT] ❌ Shipment creation FAILED');
        console.error('[SHIPMENT] Error details:', result.error);
        
        // Check if it's a duplicate shipment error
        if (result.error?.code === 'DUPLICATE_SHIPMENT') {
          showWarning(
            'Shipment Already Exists',
            `A shipment already exists for contract ${newShipment.contractId}`,
            `Existing Shipment ID: ${result.error?.existingShipmentId}\n\n` +
            `Each contract can only have ONE shipment. Please check the "Shipments" tab to view your existing shipment.\n\n` +
            `If you need to modify the shipment, please contact support.`
          );
          setCreateShipmentDialogOpen(false);
          // Switch to Shipments tab to show existing shipment
          setTabValue(2);
        } else {
          const detailStr = result.error?.details ? `\n\nDetails:\n- ${result.error.details.join('\n- ')}` : '';
          showError(
            'Shipment Creation Failed',
            result.error?.message || 'Failed to create shipment',
            `Error Code: ${result.error?.code || 'UNKNOWN'}${detailStr}\n\nPlease verify all information and try again`
          );
        }
      }
    } catch (error: any) {
      console.error('[SHIPMENT] ❌ NETWORK ERROR:', error);
      console.error('[SHIPMENT] Error stack:', error.stack);
      showError(
        'Network Error',
        'Failed to connect to API server',
        `Error: ${error.message}\n\nPlease check:\n1. API server is running on http://localhost:3001\n2. Blockchain network is started\n3. Check browser console for details`
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

    if (customsDocuments.some((document) => document.status !== 'success')) {
      showWarning('Documents Still Uploading', 'Finish uploading the selected documents first', 'Wait until each selected file shows Uploaded, or remove a failed upload and try again');
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
      // Leg2 #2: a resubmission of a REJECTED declaration gets a FRESH
      // ID — the ledger refuses a reused DECL_ key and the API 400s
      // DECLARATION_ID_REUSED, so reusing CD-<shipmentId> can never
      // succeed.
      const priorDeclaration = declarationsByShipment.get(selectedShipmentForCustoms.shipmentId);
      const isResubmission = String((priorDeclaration as any)?.status || '').toUpperCase() === 'REJECTED';
      const declarationId = isResubmission
        ? `CD-${selectedShipmentForCustoms.shipmentId}-R${Date.now()}`
        : `CD-${selectedShipmentForCustoms.shipmentId}`;

      // Leg2 #9: the customs value is the form value or the contract's
      // total value — never quantity × an invented $9.25/kg.
      const resolvedCustomsValue = customsForm.customsValue
        || (selectedContract as any)?.total_value
        || (selectedContract as any)?.totalValue;
      if (!resolvedCustomsValue || Number(resolvedCustomsValue) <= 0) {
        showError('Customs Value Required', 'Enter the customs value or select a shipment whose contract carries a total value — no value is invented.');
        return;
      }

      const declarationData = {
        declarationID: declarationId,
        shipmentID: selectedShipmentForCustoms.shipmentId,
        exporterID: profile.exporterId,
        declarationType: customsForm.eudrCompliant ? 'EUDR_ENHANCED' : 'STANDARD',
        hsCode: customsForm.hsCode,
        quantity: selectedShipmentForCustoms.quantity,
        value: Number(resolvedCustomsValue),
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
        // Add shipment to declarations set
        const updatedDeclarations = new Set([...shipmentsWithDeclarations, selectedShipmentForCustoms.shipmentId]);
        console.log('[EXPORTER] Updated declarations after submit:', Array.from(updatedDeclarations));
        setShipmentsWithDeclarations(updatedDeclarations);
        // Newly submitted declarations start SUBMITTED.
        const updatedByShipment = new Map(declarationsByShipment);
        updatedByShipment.set(selectedShipmentForCustoms.shipmentId, { shipmentId: selectedShipmentForCustoms.shipmentId, status: 'SUBMITTED' });
        setDeclarationsByShipment(updatedByShipment);
        
        // Close dialog and reset form BEFORE showing success message
        setCustomsDeclarationDialogOpen(false);
        setSelectedShipmentForCustoms(null);
        setCustomsDocuments([]);
        setCustomsForm({
          hsCode: '090111',
          portOfExit: 'Djibouti Port',
          customsValue: '',
          additionalNotes: '',
          eudrCompliant: true,
        });
        
        // Show success message
        showSuccess(
          'Customs Declaration Submitted Successfully',
          `Declaration ${declarationId} submitted to Ethiopian Customs Commission`,
          'What happens next:\n' +
          '• ECC customs officer will be assigned when they start reviewing your declaration\n' +
          '• Officer reviews declaration & documents (1-3 days)\n' +
          '• Physical inspection may be scheduled based on risk assessment\n' +
          '• EUDR compliance verified for EU destinations\n' +
          '• Customs clearance issued upon approval\n\n' +
          'You will be notified of any updates. Track status in Shipments tab.'
        );
        
        // Force re-render by updating shipments array reference
        setShipments([...shipments]);
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

      // Book freight through the shipping endpoint: POST /shipping/bookings
      // moves the real shipment row to FREIGHT_BOOKED (aa0947f fix). The
      // old PUT /shipments/:id/status {status:'SHIPPED'} wrote a status no
      // machine produces, so the PG CHECK silently dropped the mirror.
      const response = await apiFetch('/shipping/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shipmentID: selectedShipmentForShipping.shipmentId,
          exporterID: profile.exporterId,
          shippingLine: shippingForm.shippingLine,
          vesselName: shippingForm.vesselName || 'TBD - Assigned by shipping line',
          containerType: shippingForm.containerType,
          portOfLoading: shippingForm.portOfLoading,
          portOfDischarge: shippingForm.portOfDischarge,
          estimatedDepartureDate: shippingForm.estimatedDeparture,
          estimatedArrivalDate: new Date(new Date(shippingForm.estimatedDeparture).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Only the booking ID / status come back from the API — the
        // container number and bill of lading are assigned by the shipping
        // line, so they must not be invented client-side here.
        const bookingId = result.data?.bookingID || result.data?.bookingId || '';
        showSuccess(
          '🚢 Shipping Booked Successfully',
          `Container booking confirmed for ${selectedShipmentForShipping.shipmentId}`,
          (bookingId ? `Booking: ${bookingId}\n` : '') +
          `Shipping Line: ${shippingForm.shippingLine}\n` +
          `Port of Loading: ${shippingForm.portOfLoading}\n` +
          `Estimated Departure: ${new Date(shippingForm.estimatedDeparture).toLocaleDateString()}\n\n` +
          'What happens next:\n' +
          '• Container and bill of lading are issued by the shipping line\n' +
          '• This is a post-delivery booking: the shipment stays DELIVERED (booking no longer moves it to FREIGHT_BOOKED)\n' +
          '• Proceed to Payment Settlement'
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
        loadExporterData(); // Reload to update status
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

    // LEG3 M-8: the Submit button is already disabled without these, but
    // re-check here so a programmatic submit can never send a blank BIC
    // or account to the API (which requires both non-empty → 400).
    if (!paymentForm.beneficiaryBankBIC || !paymentForm.beneficiaryAccount) {
      showError('Missing Bank Details', 'Beneficiary bank BIC and beneficiary account are required before initiating payment.');
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
      const forexStatus = String(selectedForex?.status || '').toUpperCase();
      if (!selectedForex || !['ALLOCATED', 'UTILIZED'].includes(forexStatus) || Number(selectedForex.exchangeRate) <= 0 || !Number.isFinite(Number(selectedForex.retentionRate))) {
        showWarning('Forex Allocation Incomplete', 'A ledger-backed forex allocation and rates are required before payment settlement.', 'Complete the bank allocation and refresh this page.');
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
        // LEG3 M-8: a re-click on the same shipment no longer fails
        // on-chain — the API returns the existing payment with
        // alreadyExists instead of a duplicate-ID error.
        if ((result as any).alreadyExists) {
          showSuccess(
            'Payment Already Initiated',
            `Payment ${paymentId} was already initiated for ${selectedShipmentForPayment.shipmentId} — no duplicate was created.`
          );
          setPaymentSettlementDialogOpen(false);
          setSelectedShipmentForPayment(null);
          loadExporterData();
          return;
        }
        const amountUSD = selectedContract ? (selectedShipmentForPayment.quantity * selectedContract.pricePerKg) : 0;
        const exchangeRate = Number(selectedForex.exchangeRate);
        const retentionRate = Number(selectedForex.retentionRate);
        const amountETB = amountUSD * exchangeRate;
        const retainedETB = (amountETB * retentionRate) / 100;
        // Chaincode settle math (payment.go): the exporter receives the
        // CONVERTED amount — amountETB − retainedETB — not the retained
        // portion, which NBE holds in FCY.
        const receivedETB = amountETB - retainedETB;

        showSuccess(
          '💰 Payment Settlement Initiated',
          `Payment process started for ${selectedShipmentForPayment.shipmentId}`,
          `Payment ID: ${paymentId}\n` +
          `Amount: $${amountUSD.toLocaleString()} USD\n` +
          `Exchange Rate: ${exchangeRate} ETB/USD\n` +
          `Amount in ETB: ${amountETB.toLocaleString()} ETB\n` +
          `NBE Retention: ${retentionRate}% = ${retainedETB.toLocaleString()} ETB (held in FCY)\n` +
          `You will receive: ${receivedETB.toLocaleString()} ETB\n\n` +
          'What happens next:\n' +
          '• Bank reviews and verifies shipping documents\n' +
          '• SWIFT payment initiated by buyer\'s bank\n' +
          '• NBE processes forex conversion & retention\n' +
          '• Funds credited to your account (3-5 business days)\n' +
          '• Transaction complete - export cycle finished!'
        );

        setPaymentSettlementDialogOpen(false);
        setSelectedShipmentForPayment(null);
        loadExporterData();
      } else {
        showError('Payment Failed', result.error?.message || 'Failed to initiate payment', 'Please try again');
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

  const handleSubmitLCDocuments = async (shipmentId: string, lcId: string, documentIds: string[]) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }

      console.log('[EXPORTER] Submitting LC documents:', { shipmentId, lcId, documentIds });

      const response = await apiFetch(`/shipments/${shipmentId}/lc-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lcID: lcId,
          documentIDs: documentIds
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(
          '📄 Documents Submitted Successfully',
          `LC documents submitted for shipment ${shipmentId}`,
          `Submitted ${documentIds.length} documents to bank for LC ${lcId}\n\n` +
          'What happens next:\n' +
          '• Bank reviews submitted documents against LC terms\n' +
          '• Document verification (1-2 business days)\n' +
          '• Payment release upon approval\n' +
          '• Funds transfer to your account'
        );
        
        loadExporterData();
      } else {
        showError('Submission Failed', result.error?.message || 'Failed to submit documents', 'Please try again');
      }
    } catch (error: any) {
      console.error('Error submitting LC documents:', error);
      showError(
        'Network Error',
        'Failed to submit documents',
        error.message || 'Please check if the API server is running and try again'
      );
    }
  };

  // Real caller for POST /shipments/:shipmentId/lc-documents (0.2/Tier 1):
  // the document IDs come from the shipment's uploaded documents
  // (GET /documents/entity/SHIPMENT/:shipmentId) — never invented, and
  // never submitted empty. Gated on an LC in ISSUED / FOREX_ALLOCATED,
  // the only states chaincode SubmitLCDocuments accepts.
  const handleSubmitLCDocumentsForShipment = async (shipment: { shipmentId: string; contractId: string }) => {
    const lc = getLCForDocumentSubmission(shipment.contractId);
    if (!lc) {
      showError('LC Not Ready', 'LC documents can only be submitted while the LC is ISSUED or FOREX_ALLOCATED', 'Wait for the bank to issue the LC, then try again');
      return;
    }
    setIsSubmittingLCDocuments(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }
      const response = await apiFetch(`/documents/entity/SHIPMENT/${encodeURIComponent(shipment.shipmentId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        showError('Documents Unavailable', `Could not list documents for shipment ${shipment.shipmentId} (${response.status})`, 'Upload the LC documents first, then try again');
        return;
      }
      const result = await response.json();
      const docs = Array.isArray(result) ? result : (result.data || []);
      const documentIds = docs
        .map((doc: any) => doc.document_id || doc.documentId || doc.id)
        .filter(Boolean);
      if (documentIds.length === 0) {
        showError('No Documents To Submit', `No documents have been uploaded for shipment ${shipment.shipmentId} yet`, 'Upload the bill of lading, commercial invoice, packing list and other LC documents first, then submit them here');
        return;
      }
      await handleSubmitLCDocuments(shipment.shipmentId, lc.lcId, documentIds);
    } catch (error: any) {
      console.error('Error listing shipment documents:', error);
      showError('Network Error', 'Failed to list shipment documents', error.message || 'Please check if the API server is running and try again');
    } finally {
      setIsSubmittingLCDocuments(false);
    }
  };

  const handleRequestLC = async () => {
    if (!selectedContractForLC || !profile) {
      showError('Error', 'Contract or profile not loaded', 'Please try again');
      return;
    }

    setIsRequestingLC(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }

      // Generate LC ID
      const lcId = `LC-${selectedContractForLC.contractId}-${Date.now()}`;
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(lcRequestForm.expiryDays));

      const lcData = {
        lcID: lcId,
        contractID: selectedContractForLC.contractId,
        exporterID: profile.exporterId,
        // LEG 1 (F6a): send the two banks under their real names.
        // The old payload also sent bankName = advising bank, and the
        // API stored bankName as issuing_bank — the wrong bank.
        issuingBank: selectedContractForLC.buyerBank || 'Buyer Bank', // Buyer's bank
        advisingBank: lcRequestForm.advisingBank || profile.bankName || 'Commercial Bank of Ethiopia', // Exporter's bank
        beneficiary: lcRequestForm.beneficiaryName || profile.companyName,
        amount: lcRequestForm.amount || selectedContractForLC.totalValue.toString(),
        currency: lcRequestForm.currency || selectedContractForLC.currency,
        expiryDate: expiryDate.toISOString().split('T')[0],
        transportMode: lcRequestForm.transportMode,
        portOfLoading: lcRequestForm.portOfLoading,
        portOfDischarge: lcRequestForm.portOfDischarge || selectedContractForLC.buyerCountry,
        latestShipmentDate: new Date(Date.now() + parseInt(lcRequestForm.latestShipmentDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        partialShipment: lcRequestForm.partialShipment,
        transhipment: lcRequestForm.transhipment,
        paymentTerms: lcRequestForm.paymentTerms,
        terms: lcRequestForm.specialInstructions || `Letter of Credit for ${selectedContractForLC.coffeeType} coffee export`,
      };

      console.log('[EXPORTER] Requesting LC:', lcData);

      const response = await apiFetch('/banking/lc/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(lcData)
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(
          '🏦 LC Request Submitted Successfully',
          `Letter of Credit ${lcId} has been requested`,
          `Your LC request for contract ${selectedContractForLC.contractId} has been submitted to ${lcData.advisingBank}.\n\n` +
          `What happens next:\n` +
          `1. Your bank (${lcData.advisingBank}) reviews the LC request (1-2 business days)\n` +
          `2. Bank approves and issues LC (MT700 SWIFT message sent)\n` +
          `3. Buyer's bank (${lcData.issuingBank}) confirms the LC\n` +
          `4. Bank allocates forex for the transaction\n` +
          `5. You can then proceed with shipment preparation\n\n` +
          `Track status in the "Forex & Banking" tab.`
        );
        
        // Close dialog and reload data
        setLcRequestDialogOpen(false);
        setSelectedContractForLC(null);
        setLcRequestForm({
          advisingBank: '',
          beneficiaryName: '',
          expiryDays: '90',
          amount: '',
          currency: 'USD',
          transportMode: 'SEA',
          portOfLoading: 'Djibouti Port',
          portOfDischarge: '',
          latestShipmentDays: '60',
          partialShipment: false,
          transhipment: true,
          paymentTerms: 'Sight LC',
          specialInstructions: '',
        });
        
        // Reload data to show new LC
        setTimeout(() => {
          loadExporterData();
        }, 2000);
      } else {
        showError(
          'LC Request Failed',
          result.error?.message || 'Failed to request Letter of Credit',
          result.error?.code ? `Error Code: ${result.error.code}` : 'Please verify all information and try again'
        );
      }
    } catch (error: any) {
      console.error('[EXPORTER] ❌ LC request error:', error);
      showError(
        'Network Error',
        'Failed to submit LC request',
        `Error: ${error.message}\n\nPlease check:\n1. API server is running\n2. Blockchain network is active\n3. Check browser console for details`
      );
    } finally {
      setIsRequestingLC(false);
    }
  };
  
  // LEG 1 (F5a): file a forex allocation request for one of the
  // exporter's own contracts. The API route accepts EXPORTER callers
  // and signs the ledger call as ECTA; the forexId is generated here.
  const handleRequestForex = async () => {
    if (!profile || !forexRequestForm.contractId) {
      showError('Error', 'Select a contract for the forex request', 'Please try again');
      return;
    }
    const selectedContract = contracts.find((c) => c.contractId === forexRequestForm.contractId);
    setIsRequestingForex(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }
      const forexId = `FOREX_${forexRequestForm.contractId}_${Date.now()}`;
      const response = await apiFetch('/forex/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          forexId,
          contractId: forexRequestForm.contractId,
          exporterId: profile.exporterId,
          lcId: forexRequestForm.lcId || undefined,
          amount: Number(forexRequestForm.amount) || Number(selectedContract?.totalValue) || 0,
          currency: forexRequestForm.currency || selectedContract?.currency || 'USD',
        }),
      });
      const result = await response.json();
      if (result.success) {
        showSuccess(
          'Forex Request Submitted',
          `Forex request ${forexId} has been submitted for contract ${forexRequestForm.contractId}.`,
          'NBE will review and confirm it; the bank then allocates the forex. Track it in the "Forex Allocations" list below.'
        );
        setForexRequestDialogOpen(false);
        setForexRequestForm({ contractId: '', lcId: '', amount: '', currency: 'USD' });
        setTimeout(() => { loadExporterData(); }, 2000);
      } else {
        showError('Forex Request Failed', result.error?.message || 'Failed to submit forex request', result.error?.code ? `Error Code: ${result.error.code}` : undefined);
      }
    } catch (error: any) {
      showError('Network Error', 'Failed to submit forex request', `Error: ${error.message}`);
    } finally {
      setIsRequestingForex(false);
    }
  };

  // A contract is approved iff its status is APPROVED (TEST-STATUS-MATRIX
  // §1). NBE_APPROVED and ACTIVE are not contract statuses — no layer
  // produces them — so every former NBE_APPROVED/ACTIVE arm collapses here.
  const isContractApproved = (c: { status: string }) => c.status === 'APPROVED';

  // An LC counts as issued once it has reached ISSUED or any later forward
  // state of the LC machine (REQUESTED → APPROVED → ISSUED →
  // FOREX_ALLOCATED → AMENDED → UTILIZED → PAYMENT_RELEASED → SETTLED).
  const hasIssuedLC = (contractId: string) =>
    lcStatuses.some(lc => lc.contractId === contractId &&
      ['ISSUED', 'FOREX_ALLOCATED', 'AMENDED', 'UTILIZED', 'PAYMENT_RELEASED', 'SETTLED'].includes(lc.status));

  // Real customs-cleared state for a shipment (F18/F24): the shipment's own
  // CUSTOMS_CLEARED status, or a joined declaration in CLEARED status.
  // Never inferred from transit states (DEPARTED/IN_TRANSIT/SHIPPED) —
  // a shipment that has departed has not necessarily cleared customs.
  const isShipmentCustomsCleared = (shipment: { shipmentId: string; status: string }) =>
    shipment.status === 'CUSTOMS_CLEARED' ||
    declarationsByShipment.get(shipment.shipmentId)?.status === 'CLEARED';

  // Payment already initiated for a shipment, if any. GET /payments
  // returns shipmentId (payments.ts:1151); fall back to the deterministic
  // PAY-<shipmentId> id the initiate handler creates.
  const getPaymentForShipment = (shipmentId: string) =>
    payments.find((p) => p.shipmentId === shipmentId || p.paymentId === `PAY-${shipmentId}`);

  // LC that can receive documents: chaincode SubmitLCDocuments requires
  // the LC to be ISSUED or FOREX_ALLOCATED (banking.go:1512) and leaves
  // the status unchanged.
  const getLCForDocumentSubmission = (contractId: string) =>
    lcStatuses.find((lc) => lc.contractId === contractId &&
      ['ISSUED', 'FOREX_ALLOCATED'].includes(lc.status));

  // Freight booking (0.12): offer ONLY after delivery. Booking mirrors
  // FREIGHT_BOOKED only from CREATED and never regresses a DELIVERED
  // shipment, so it must never be offered mid-chain.
  const canBookFreight = (shipment: { shipmentId: string; status: string; _isPending?: boolean } | null | undefined) => {
    if (!shipment) return false;
    return !shipment._isPending && shipment.status === 'DELIVERED';
  };

  // Payment initiation (0.2): the chaincode gate for InitiatePayment
  // (payment.go) is an LC in ISSUED / FOREX_ALLOCATED / UTILIZED plus a
  // ledger-backed forex allocation (the handler also requires forex
  // ALLOCATED/UTILIZED with a real rate + retention). There is no
  // shipment-status gate on-chain, so delivery is NOT required here —
  // but a payment that already exists for the shipment must not be
  // re-initiated: the handler uses the deterministic id PAY-<shipmentId>,
  // so a second initiation would collide with the existing payment.
  // When a payment exists, its real status is shown instead (see the
  // grid/detail actions) and settlement continues in the bank flow.
  const canInitiatePayment = (shipment: { shipmentId: string; contractId: string; status: string; _isPending?: boolean } | null | undefined) => {
    if (!shipment) return false;
    if (shipment._isPending) return false;
    if (getPaymentForShipment(shipment.shipmentId)) return false;
    const lc = lcStatuses.find((item) => item.contractId === shipment.contractId);
    if (!lc || !['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status)) return false;
    const forex = forexStatuses.find((fx) => fx.contractId === shipment.contractId);
    return !!forex && ['ALLOCATED', 'UTILIZED'].includes(String(forex.status).toUpperCase()) &&
      Number(forex.exchangeRate) > 0 && Number.isFinite(Number(forex.retentionRate));
  };

  const canSubmitLCDocuments = (shipment: { shipmentId: string; contractId: string; _isPending?: boolean } | null | undefined) => {
    if (!shipment) return false;
    return !shipment._isPending && !!getLCForDocumentSubmission(shipment.contractId);
  };

  // Reports tab (tab 6): download the real export report as CSV.
  const handleGenerateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      showError('Missing Dates', 'Select a start and end date for the report', 'Both dates are required');
      return;
    }
    if (reportEndDate < reportStartDate) {
      showError('Invalid Date Range', 'End date must be on or after the start date', 'Adjust the dates and try again');
      return;
    }
    setIsGeneratingReport(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showError('Authentication Required', 'You are not authenticated', 'Please login again');
        return;
      }
      const response = await apiFetch(
        `/analytics/export-report?format=csv&dateFrom=${encodeURIComponent(reportStartDate)}&dateTo=${encodeURIComponent(reportEndDate)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) {
        const errorText = await response.text();
        showError('Report Failed', `The report endpoint returned ${response.status}`, errorText || 'Please try again');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-report-${reportStartDate}_to_${reportEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Report Generated', `Export report downloaded for ${reportStartDate} to ${reportEndDate}`, 'The CSV contains the KPIs for your organisation for the selected period.');
    } catch (error: any) {
      console.error('Error generating report:', error);
      showError('Network Error', 'Failed to generate report', error.message || 'Please check if the API server is running and try again');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Calculate Dashboard KPIs - Similar to CustomsPortal pattern
  const getExporterStats = () => {
    // Overall counts
    const totalContracts = contracts.length;
    const totalShipments = shipments.length;
    const totalForex = forexStatuses.length;
    const totalLCs = lcStatuses.length;
    const totalPayments = payments.length;
    
    // Contract statuses
    const contractsRegistered = contracts.filter(c => c.status === 'REGISTERED').length;
    const contractsApproved = contracts.filter(c => isContractApproved(c)).length;
    
    // Shipment statuses
    const shipmentsCreated = shipments.filter(s => s.status === 'CREATED').length;
    const shipmentsBooked = shipments.filter(s => s.status === 'FREIGHT_BOOKED').length;
    const shipmentsInTransit = shipments.filter(s => ['IN_TRANSIT', 'DEPARTED'].includes(s.status)).length;
    const shipmentsDelivered = shipments.filter(s => s.status === 'DELIVERED').length;
    
    // Forex statuses
    const forexRequested = forexStatuses.filter(f => f.status === 'REQUESTED').length;
    const forexAllocated = forexStatuses.filter(f => f.status === 'ALLOCATED').length;
    
    // Approved contracts pending LC request (should appear in Forex & Banking)
    const contractsPendingLC = contracts.filter(c => {
      const isApproved = isContractApproved(c);
      const hasLC = lcStatuses.some(lc => lc.contractId === c.contractId);
      return isApproved && !hasLC;
    }).length;
    
    // LC statuses
    const lcRequested = lcStatuses.filter(lc => lc.status === 'REQUESTED').length;
    const lcIssued = lcStatuses.filter(lc => ['ISSUED', 'FOREX_ALLOCATED'].includes(lc.status)).length;
    
    // Customs statuses
    // Customs KPI calculations based on customs status logic (matching the table display)
    const customsAwaitingPermit = shipments.filter(s => {
      const hasPermit = shipmentsWithPermits.has(s.shipmentId);
      const hasDeclared = shipmentsWithDeclarations.has(s.shipmentId);
      const isCleared = isShipmentCustomsCleared(s);
      // "Awaiting Permit" = not cleared, not declared, not has permit
      return !isCleared && !hasDeclared && !hasPermit;
    }).length;
    
    const customsPendingDeclaration = shipments.filter(s => {
      const hasPermit = shipmentsWithPermits.has(s.shipmentId);
      const hasDeclared = shipmentsWithDeclarations.has(s.shipmentId);
      const isCleared = isShipmentCustomsCleared(s);
      // "Pending Declaration" (Ready to Declare) = has permit, not declared, not cleared
      return hasPermit && !hasDeclared && !isCleared;
    }).length;
    
    const customsDeclared = shipments.filter(s => {
      const hasPermit = shipmentsWithPermits.has(s.shipmentId);
      const hasDeclared = shipmentsWithDeclarations.has(s.shipmentId);
      const isCleared = isShipmentCustomsCleared(s);
      // "Declared" = has declared, not cleared yet
      return hasDeclared && !isCleared;
    }).length;
    
    const customsCleared = shipments.filter(s => isShipmentCustomsCleared(s)).length;
    
    // Payment statuses
    const paymentsPending = payments.filter(p => p.status === 'PENDING').length;
    const paymentsProcessing = payments.filter(p => ['DOCUMENTS_SUBMITTED', 'VERIFIED', 'SWIFT_INITIATED'].includes(p.paymentTrackingStatus ?? '')).length;
    const paymentsReceived = payments.filter(p => p.paymentTrackingStatus === 'SWIFT_RECEIVED').length;
    const paymentsSettled = payments.filter(p => p.paymentTrackingStatus === 'SETTLED').length;
    
    // Reports/analytics
    const totalExportValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const totalQuantity = contracts.reduce((sum, c) => sum + c.quantity, 0);
    const avgContractValue = totalContracts > 0 ? totalExportValue / totalContracts : 0;
    const successRate = totalContracts > 0 
      ? Math.round((contracts.filter(c => isContractApproved(c)).length / totalContracts) * 100)
      : 0;
    
    return {
      // Dashboard (tab 0)
      totalContracts,
      totalShipments,
      totalForexAndLC: forexAllocated + lcIssued + contractsPendingLC, // Include pending LC contracts
      totalLCs,
      
      // My Contracts (tab 1)
      contractsRegistered,
      contractsApproved,
      
      // Forex & Banking (tab 2)
      contractsPendingLC, // New stat for pending LC contracts
      forexRequested,
      forexAllocated,
      lcRequested,
      lcIssued,
      
      // Shipments (tab 3)
      shipmentsCreated,
      shipmentsBooked,
      shipmentsInTransit,
      shipmentsDelivered,
      
      // Customs (tab 4)
      customsAwaitingPermit,
      customsPermitIssued: customsPendingDeclaration,
      customsDeclared: customsDeclared,
      customsCleared: customsCleared,
      customsTotal: totalShipments,
      
      // LC & Payments (tab 5)
      paymentsPending,
      paymentsProcessing,
      paymentsReceived,
      paymentsSettled,
      
      // Reports (tab 6)
      totalExportValue,
      totalQuantity,
      avgContractValue,
      successRate,
      
      // Audit Trail (tab 7) - uses auditStats state
    };
  };

  const stats = useMemo(() => getExporterStats(), [
    contracts,
    shipments,
    forexStatuses,
    lcStatuses,
    payments,
    shipmentsWithPermits,
    shipmentsWithDeclarations,
    declarationsByShipment
  ]);

  // Remove excessive debug logging
  /*
  console.log('[EXPORTER KPIs] Calculating dashboard metrics:', {
    tabValue,
    stats,
    auditStats,
  });
  */

  
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
      field: 'rejectionReason',
      headerName: 'ECTA Feedback',
      width: 260,
      sortable: false,
      renderCell: (params) => {
        if (params.row.status !== 'REJECTED') return <Typography color="text.secondary">—</Typography>;
        const reason = params.value || 'No rejection reason was recorded. Contact ECTA for details.';
        return (
          <Tooltip title={reason}>
            <Typography color="error.main" variant="body2" noWrap sx={{ maxWidth: '100%' }}>
              {reason}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      renderCell: (params) => {
        const contract = params.row;
        const hasExistingLC = lcStatuses.some(lc => lc.contractId === contract.contractId);
        const canRequestLC = isContractApproved(contract) && !hasExistingLC;
        
        return (
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
            {canRequestLC && (
              <Tooltip title="Request Letter of Credit">
                <IconButton
                  size="small"
                  sx={{ color: '#9b30b7' }}
                  onClick={() => {
                    setSelectedContractForLC(contract);
                    setLcRequestForm({
                      ...lcRequestForm,
                      advisingBank: profile?.bankName || '',
                      beneficiaryName: profile?.companyName || '',
                      amount: contract.totalValue.toString(),
                      currency: contract.currency,
                      portOfDischarge: contract.buyerCountry,
                    });
                    setLcRequestDialogOpen(true);
                  }}
                >
                  <AccountBalance />
                </IconButton>
              </Tooltip>
            )}
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
                    console.log('🔧 Edit icon clicked for contract:', params.row.contractId);
                    console.log('📋 Contract data:', params.row);
                    
                    // Open edit dialog with ALL contract data
                    setNewContract({
                      buyerName: params.row.buyerName || '',
                      buyerCompany: params.row.buyerId || params.row.buyerCompany || '',
                      buyerCountry: params.row.buyerCountry || '',
                      buyerBank: params.row.buyerBank || '',
                      exporterBank: params.row.exporterBank || '',
                      buyerEmail: params.row.buyerEmail || '',
                      buyerPhone: params.row.buyerPhone || '',
                      coffeeType: normalizeCoffeeType(params.row.coffeeType),
                      quantity: String(params.row.quantity || ''),
                      pricePerKg: String(params.row.pricePerKg || params.row.price_per_kg || ''),
                      currency: params.row.currency || 'USD',
                      paymentMethod: params.row.paymentMethod || params.row.payment_method || 'LC',
                      incoterm: params.row.incoterm || 'FOB',
                      portOfLoading: params.row.portOfLoading || params.row.port_of_loading || 'Djibouti',
                      portOfDestination: params.row.portOfDestination || params.row.port_of_destination || '',
                      deliveryDate: params.row.deliveryDate || params.row.delivery_date || '',
                      eudrRequired: params.row.eudrRequired !== undefined ? params.row.eudrRequired : (params.row.eudr_required !== undefined ? params.row.eudr_required : true),
                      organicCertified: params.row.organicCertified || params.row.organic_certified || false,
                      fairTradeCertified: params.row.fairTradeCertified || params.row.fair_trade_certified || false,
                      specialInstructions: params.row.specialInstructions || params.row.special_instructions || '',
                    });
                    setDraftContractId(params.row.contractId);
                    setEditingBuyerId(params.row.buyerId || '');
                    setIsEditMode(true); // Mark as edit mode
                    
                    console.log('✅ Form populated with contract data');
                    console.log('✅ Draft Contract ID set to:', params.row.contractId);
                    
                    setCreateContractDialogOpen(true);
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
            {/* LEG 1 (F4): resubmit a REJECTED contract in place, keeping
                its ID. The "correct" flow (register a replacement copy)
                is offered from the contract detail dialog. */}
            {params.row.status === 'REJECTED' && (
              <Tooltip title="Resubmit for Review (keeps this contract ID)">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleResubmitContract(params.row)}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  // Shipment DataGrid Columns
  const shipmentColumns: GridColDef[] = [
    { 
      field: 'shipmentId', 
      headerName: 'Shipment ID', 
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShipping fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600}>{params.value}</Typography>
        </Box>
      ),
    },
    { 
      field: 'contractId', 
      headerName: 'Contract ID', 
      width: 150,
    },
    { 
      field: 'buyerId', 
      headerName: 'Buyer', 
      width: 180,
      valueGetter: (params) => {
        // First try to find the contract to get buyer name
        const contract = contracts.find(c => c.contractId === params.row.contractId);
        if (contract?.buyerName) {
          return contract.buyerName;
        }
        // Fall back to buyerId from shipment
        return params.row.buyerId || '-';
      },
    },
    { 
      field: 'quantity', 
      headerName: 'Quantity (kg)', 
      width: 130,
      type: 'number',
      valueFormatter: (params) => {
        const num = Number(params.value) || 0;
        return num > 0 ? num.toLocaleString() : '0';
      },
    },
    { 
      field: 'grade', 
      headerName: 'Grade', 
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Grade 1-2'} 
          size="small" 
          variant="outlined"
          color="secondary"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      renderCell: (params) => {
        // For pending rows, show the actual LC/Forex status
        return <StatusChip status={params.value} />;
      },
    },
    {
      field: 'transportMode',
      headerName: 'Transport',
      width: 120,
      valueGetter: (params) => {
        return params.row?.transportMode || params.row?.TransportMode || 'SEA';
      },
      renderCell: (params) => {
        if (params.value === 'AIR') {
          return (
            <Tooltip title="Air Freight (1-3 days)">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FlightTakeoff fontSize="small" color="secondary" />
                <Typography variant="caption">Air</Typography>
              </Box>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Sea Freight (25-35 days)">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DirectionsBoat fontSize="small" color="primary" />
              <Typography variant="caption">Sea</Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'currentLocation',
      headerName: 'Current Location',
      width: 150,
      valueGetter: (params) => {
        return params.row?.currentLocation || params.row?.CurrentLocation || 'Warehouse';
      },
      renderCell: (params) => (
        <Typography variant="body2" color={params.value !== 'Warehouse' ? 'primary' : 'text.secondary'}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 440,
      sortable: false,
      renderCell: (params) => {
        const shipment = params.row;
        
        // Check if this is a pending contract (ready for shipment)
        if (shipment._isPending) {
          return (
            <PrimaryButton brand='EXPORTER'
              size="small"
              startIcon={<Add />}
              onClick={() => {
                // Pre-fill the dialog with contract data
                setCreateShipmentDialogOpen(true);
              }}
            >
              Register New Shipment
            </PrimaryButton>
          );
        }
        
        // Shipments tab only shows actual shipments (no pending contracts)
        const status = shipment.status || shipment.Status;
        const isDelivered = status === 'DELIVERED';
        const existingPayment = getPaymentForShipment(shipment.shipmentId);

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="View Shipment Details">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setSelectedShipmentForDetail(shipment);
                  setShipmentDetailDialogOpen(true);
                }}
              >
                <Visibility />
              </IconButton>
            </Tooltip>

            {/* 0.12: freight booking is offered ONLY after delivery.
                Booking mirrors FREIGHT_BOOKED, which breaks the
                CREATED-only permit cascade and the CUSTOMS_CLEARED gate
                of StartLandTransport — never offer it mid-chain. */}
            {canBookFreight(shipment) && (
              <Tooltip title="Book Freight (post-delivery only)">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    setSelectedShipmentForShipping(shipment);
                    setBookShippingDialogOpen(true);
                  }}
                >
                  <LocalShipping />
                </IconButton>
              </Tooltip>
            )}

            {/* 0.12: an existing FREIGHT_BOOKED row has no on-chain exit
                to land transport — show the real status with a note, and
                no onward button. Same for LOADED / ARRIVED: BoL/AWB
                recording sets LOADED unconditionally and DepartFromPort
                needs VESSEL_LOADED, so those rows have no onward step. */}
            {status === 'FREIGHT_BOOKED' && (
              <Tooltip title="Freight booked. This status has no on-chain exit to land transport — booking is post-delivery paperwork only.">
                <Chip label="No onward transport" size="small" sx={{ bgcolor: '#FF980015', color: '#FF9800', fontWeight: 600 }} />
              </Tooltip>
            )}
            {(status === 'LOADED' || status === 'ARRIVED') && (
              <Tooltip title="Recorded as post-delivery paperwork (bill of lading / airway bill sets LOADED). DepartFromPort requires VESSEL_LOADED, so this row has no onward chain step.">
                <Chip label="No onward step" size="small" sx={{ bgcolor: '#FF980015', color: '#FF9800', fontWeight: 600 }} />
              </Tooltip>
            )}

            {/* 0.2: payment initiation — only while no payment exists for
                this shipment and the LC/forex gates are met (see
                canInitiatePayment). A payment that already exists is shown
                with its real status instead of re-initiating it. */}
            {canInitiatePayment(shipment) && (
              <Tooltip title="Initiate Payment Settlement">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => {
                    setSelectedShipmentForPayment(shipment);
                    setPaymentSettlementDialogOpen(true);
                  }}
                >
                  <AttachMoney />
                </IconButton>
              </Tooltip>
            )}
            {existingPayment && (
              <Tooltip title={`Payment ${existingPayment.paymentId} is ${existingPayment.status} — settlement continues in the bank flow; it cannot be re-initiated`}>
                <Chip label={`Payment: ${existingPayment.status}`} size="small" color="info" sx={{ fontWeight: 600 }} />
              </Tooltip>
            )}

            {/* Tier 1: submit the shipment's uploaded documents to the
                bank for the LC (POST /shipments/:id/lc-documents). Only
                while the LC is ISSUED or FOREX_ALLOCATED. */}
            {canSubmitLCDocuments(shipment) && (
              <Tooltip title="Submit LC Documents to Bank">
                <IconButton
                  size="small"
                  color="secondary"
                  disabled={isSubmittingLCDocuments}
                  onClick={() => handleSubmitLCDocumentsForShipment(shipment)}
                >
                  <Description />
                </IconButton>
              </Tooltip>
            )}

            {isDelivered && (
              <Tooltip title="View Post-Delivery Workflow">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => {
                    setSelectedShipmentForPostDelivery(shipment);
                    setPostDeliveryDialogOpen(true);
                  }}
                >
                  <CheckCircle />
                </IconButton>
              </Tooltip>
            )}
            
            {shipmentsWithPermits.has(shipment.shipmentId) && !isDelivered && (
              <Tooltip title="Submit Customs Declaration (Export Permit Issued)">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => {
                    setSelectedShipmentForCustoms(shipment);
                    setCustomsDocuments([]);
                    const selectedContract = contracts.find(c => c.contractId === shipment.contractId);
                    setCustomsForm({
                      hsCode: '090111',
                      portOfExit: 'Djibouti Port',
                      // Leg2 #9: the customs value is the contract's total
                      // value, else quantity × the contract's pricePerKg
                      // (real contract data). The old `|| 9.25` invented
                      // a price when the contract had none — leave it
                      // blank instead; submit requires a value.
                      customsValue: (() => {
                        const total = (selectedContract as any)?.total_value ?? (selectedContract as any)?.totalValue;
                        if (total != null && Number(total) > 0) return String(total);
                        const ppk = Number((selectedContract as any)?.pricePerKg);
                        if (Number.isFinite(ppk) && ppk > 0) return ((shipment.quantity || 0) * ppk).toFixed(2);
                        return '';
                      })(),
                      additionalNotes: '',
                      eudrCompliant: true,
                    });
                    setCustomsDeclarationDialogOpen(true);
                  }}
                >
                  <Assignment />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Download Shipment Documents">
              <IconButton
                size="small"
                color="info"
                onClick={() => {
                  showSuccess(
                    'Document Download',
                    `Generating shipment documents for ${shipment.shipmentId}...\n\n` +
                    `Documents include:\n` +
                    `• Export permit\n` +
                    `• Quality certificate\n` +
                    `• Customs declaration\n` +
                    `• Bill of lading`
                  );
                }}
              >
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  // Create EXPORTER theme with purple and golden colors
  const exporterTheme = createOrganizationTheme('EXPORTER');

  return (
    <ThemeProvider theme={exporterTheme}>
      <PortalShell
        brand='EXPORTER'
        title={(profile?.companyName && profile.companyName !== 'CECBS') ? profile.companyName : 'Export Dashboard'}
        subtitle="Track your contracts, shipments, and payments"
      >
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
              🎉 Bank Forex Allocated — Proceed to Coffee Procurement & Shipment Registration
            </Typography>
            <Typography variant="body2">
              Your bank has allocated <strong>${forexAllocatedAlert.allocatedAmount.toLocaleString()} {forexAllocatedAlert.currency}</strong> for contract <strong>{forexAllocatedAlert.contractId}</strong>
              {' '}at <strong>{forexAllocatedAlert.exchangeRate || 'Unavailable'} ETB/{forexAllocatedAlert.currency}</strong>
              {forexAllocatedAlert.retentionRate == null
                ? ' with the retention split not yet recorded'
                : ` (${forexAllocatedAlert.retentionRate}% retained in FCY, ${100 - forexAllocatedAlert.retentionRate}% converted)`}.
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
        {/* Professional KPI Cards - Dynamic based on active tab (CustomsPortal pattern) */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Define KPI cards for each tab */}
          {(tabValue === 0 ? (
            // Dashboard - Overall Summary
            [
              { icon: <Description />, label: 'My Contracts', value: stats.totalContracts, color: brandPrimary, clickTab: 1 },
              { icon: <LocalShipping />, label: 'Shipments', value: stats.totalShipments, color: '#b366cc', clickTab: 3 },
              { icon: <AccountBalance />, label: 'Forex & Banking', value: stats.totalForexAndLC, color: '#FFD700', clickTab: 2 },
              { icon: <AttachMoney />, label: 'LC & Payments', value: stats.totalLCs, color: brandPrimary, clickTab: 5 },
            ]
          ) : tabValue === 1 ? (
            // My Contracts - Status Breakdown
            [
              { icon: <Description />, label: 'Total Contracts', value: stats.totalContracts, color: brandPrimary },
              { icon: <Assessment />, label: 'Registered', value: stats.contractsRegistered, color: '#FFD700' },
              { icon: <CheckCircle />, label: 'Approved', value: stats.contractsApproved, color: brandPrimary },
            ]
          ) : tabValue === 2 ? (
            // Forex & Banking - Forex/LC Status
            [
              { icon: <Assessment />, label: 'Pending LC Request', value: stats.contractsPendingLC, color: '#FFD700' },
              { icon: <CheckCircle />, label: 'Forex Allocated', value: stats.forexAllocated, color: brandPrimary },
              { icon: <Description />, label: 'LC Requested', value: stats.lcRequested, color: '#b366cc' },
              { icon: <AccountBalance />, label: 'LC Issued', value: stats.lcIssued, color: brandPrimary },
            ]
          ) : tabValue === 3 ? (
            // Shipments - Shipment Status
            [
              { icon: <Add />, label: 'Created', value: stats.shipmentsCreated, color: '#FFD700' },
              { icon: <Category />, label: 'Booked', value: stats.shipmentsBooked, color: '#b366cc' },
              { icon: <LocalShipping />, label: 'In Transit', value: stats.shipmentsInTransit, color: brandPrimary },
              { icon: <CheckCircle />, label: 'Delivered', value: stats.shipmentsDelivered, color: brandPrimary },
            ]
          ) : tabValue === 4 ? (
            // Customs - Customs Status
            [
              { icon: <Warning />, label: 'Awaiting Permit', value: stats.customsAwaitingPermit, color: '#FFD700' },
              { icon: <Assignment />, label: 'Ready to Declare', value: stats.customsPermitIssued, color: '#b366cc' },
              { icon: <CheckCircle />, label: 'Declared', value: stats.customsDeclared, color: brandPrimary },
              { icon: <LocalShipping />, label: 'Cleared', value: stats.customsCleared, color: brandPrimary },
            ]
          ) : tabValue === 5 ? (
            // LC & Payments - Payment Status
            [
              { icon: <Assessment />, label: 'Pending', value: stats.paymentsPending, color: '#FFD700' },
              { icon: <History />, label: 'In Progress', value: stats.paymentsProcessing, color: '#b366cc' },
              { icon: <AttachMoney />, label: 'Completed', value: stats.paymentsReceived, color: brandPrimary },
              { icon: <CheckCircle />, label: 'Settled', value: stats.paymentsSettled, color: brandPrimary },
            ]
          ) : tabValue === 6 ? (
            // Reports - Overall Statistics
            [
              { icon: <AttachMoney />, label: 'Total Value', value: `$${(stats.totalExportValue / 1000000).toFixed(1)}M`, color: '#FFD700' },
              { icon: <Category />, label: 'Total Quantity', value: `${(stats.totalQuantity / 1000).toFixed(1)}T`, color: '#b366cc' },
              { icon: <TrendingUp />, label: 'Avg Contract', value: `$${(stats.avgContractValue / 1000).toFixed(0)}K`, color: brandPrimary },
              { icon: <CheckCircle />, label: 'Success Rate', value: `${stats.successRate}%`, color: '#FFD700' },
            ]
          ) : tabValue === 7 ? (
            // Audit Trail - Audit Statistics
            [
              { icon: <Assessment />, label: 'Total Activities', value: auditStats.totalActivities, color: brandPrimary },
              { icon: <Business />, label: 'Organizations', value: auditStats.organizationsInvolved, color: '#FFD700' },
              { icon: <Timeline />, label: 'Status Changes', value: auditStats.statusChanges, color: '#b366cc' },
              { icon: <VerifiedUser />, label: 'Blockchain Verified', value: auditStats.blockchainVerified, color: brandPrimary },
            ]
          ) : []).map((kpi: any, idx: number) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <PortalKpiCard
                brand='EXPORTER'
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                color={kpi.color}
                onClick={kpi.clickTab !== undefined ? () => setTabValue(kpi.clickTab) : undefined}
                selected={kpi.clickTab !== undefined && kpi.clickTab === tabValue}
              />
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Box sx={{ mb: 3 }}>
          <PortalTabBar
            brand='EXPORTER'
            value={tabValue}
            onChange={handleTabChange}
            scrollable
            tabs={[
      { label: 'Dashboard', icon: <Assessment sx={{ fontSize: 20 }} /> },
      { label: `Contracts (${contracts.length})`, icon: <Description sx={{ fontSize: 20 }} /> },
      { label: `Forex & Banking (${(() => {
                const allocatedForex = forexStatuses.filter(f => f.status === 'ALLOCATED').length;
                const issuedLCs = lcStatuses.filter(lc => ['ISSUED', 'UTILIZED', 'FOREX_ALLOCATED'].includes(lc.status)).length;
                const pendingLCContracts = contracts.filter(c => {
                  const isApproved = isContractApproved(c);
                  const hasLC = lcStatuses.some(lc => lc.contractId === c.contractId);
                  return isApproved && !hasLC;
                }).length;
                return allocatedForex + issuedLCs + pendingLCContracts;
              })()})`, icon: <AccountBalance sx={{ fontSize: 20 }} /> },
      { label: `Shipments (${shipments.length})`, icon: <LocalShipping sx={{ fontSize: 20 }} /> },
      { label: `Customs (${shipments.length})`, icon: <Assignment sx={{ fontSize: 20 }} /> },
      { label: `LC & Payments (${lcStatuses.length})`, icon: <AttachMoney sx={{ fontSize: 20 }} /> },
      { label: 'Reports', icon: <TrendingUp sx={{ fontSize: 20 }} /> },
      { label: 'Audit Trail', icon: <Assessment sx={{ fontSize: 20 }} /> },
            ]}
          />
        </Box>

        {/* Tab Content */}
        <PortalTabPanel value={tabValue} index={0}>
          {/* Dashboard Tab */}
          <Grid container spacing={3}>

            {/* Export Activity Trends Chart */}
            <Grid item xs={12} md={8}>
            <PortalCard brand='EXPORTER' title="Export Activity Trends" subtitle="Contract value and volume over time" headerActions={<Box sx={{ display: 'flex', gap: 1 }}>
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
                  </Box>}>
                
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
                      ${stats.totalExportValue.toLocaleString()}
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
                      {contracts.length > 0 ? `$${(stats.totalExportValue / contracts.length).toLocaleString()}` : '$0'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Avg Contract Value
                    </Typography>
                  </Box>
                </Box>
              </PortalCard>
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
                            ? Math.round((contracts.filter(c => isContractApproved(c)).length / contracts.length) * 100)
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
                          {stats.shipmentsInTransit + stats.contractsRegistered}
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
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={1}>
        {/* My Contracts Tab */}
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">My Sales Contracts</Typography>
            <PrimaryButton brand='EXPORTER'
              startIcon={<Add />}
              onClick={() => {
                setCorrectingRejectedContractId(null);
                setDraftContractId(''); // Empty string for new contract - ID will be generated on submit
                setEditingBuyerId('');
                setIsEditMode(false); // Not editing, creating new
                setContractDocuments([]);
                // Pre-fill exporter's advising bank from their registered profile bank
                if (profile?.bankName) {
                  setNewContract(prev => ({ ...prev, exporterBank: profile.bankName! }));
                }
                setCreateContractDialogOpen(true);
              }}
            >
              Register New Contract
            </PrimaryButton>
          </Box>

          <PortalDataGrid brand='EXPORTER'
            rows={contracts}
            columns={contractColumns}
            getRowId={(row) => row.contractId}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
          />
        </Box>

        {/* Contract Details Dialog */}
        <PortalDialog brand='EXPORTER' 
          open={contractDialogOpen} 
          onClose={handleContractDialogClose}
          maxWidth="md"
        
  title="Contract Details"
  subtitle={selectedContract?.contractId}
  actions={<>
            <GhostButton brand='EXPORTER' onClick={handleContractDialogClose}>Close</GhostButton>
            <Button variant="contained" startIcon={<Download />}>
              Download PDF
            </Button>
          
  </>}
>
            {selectedContract && (
              <>
                {/* BLOCKCHAIN PROOF BADGE */}
                <BlockchainBadge
                  entityId={selectedContract.contractId}
                  entityType="CONTRACT"
                  chaincode="coffee"
                  channel="coffeechannel"
                  compact
                />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Status:</strong> <StatusChip status={selectedContract.status} />
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
                
                {/* Document Management Panel */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Exporter Responsibility:</strong> You must sign all contract documents (SALES_CONTRACT, PROFORMA_INVOICE, COMMERCIAL_INVOICE, PACKING_LIST) 
                      before submission to bank for LC processing. Your signature confirms document authenticity and accuracy.
                    </Typography>
                  </Alert>
                  <DocumentManagementPanel
                    entityType="CONTRACT"
                    entityId={selectedContract.contractId}
                    title="Contract Documents (Exporter Must Sign)"
                    allowUpload={true}
                    allowSign={true}
                    allowedSignatureTypes={['UPLOAD', 'APPROVE']}
                    defaultSignatureType="APPROVE"
                    showSignatureTracker={true}
                    requiredDocuments={[
                      'SALES_CONTRACT',
                      'PROFORMA_INVOICE',
                      'COMMERCIAL_INVOICE',
                      'PACKING_LIST'
                    ]}
                    onDocumentSigned={(docId, data) => {
                      console.log('Exporter document signed:', docId, data);
                      // Document signed successfully - signature recorded on blockchain
                    }}
                    onDocumentUploaded={(doc) => {
                      console.log('Exporter document uploaded:', doc);
                      // Document uploaded successfully
                    }}
                  />
                </Grid>
              </Grid>
              </>
            )}
          </PortalDialog>

        {/* Create Contract Dialog */}
        <PortalDialog brand='EXPORTER' 
          open={createContractDialogOpen} 
          onClose={() => setCreateContractDialogOpen(false)}
          maxWidth="lg"
        
  icon={<Description />}
  title={draftContractId && !correctingRejectedContractId ? 'Edit Contract' : correctingRejectedContractId ? 'Register Corrected Contract' : 'Register New Sales Contract'}
  subtitle={draftContractId && !correctingRejectedContractId
                    ? `Editing Contract ${draftContractId} - Update buyer details, shipping preferences, or additional notes`
                    : correctingRejectedContractId
                    ? `Correct the rejected details below. This creates a new contract linked to ${correctingRejectedContractId}.`
                    : 'Complete all required fields to register your export contract'}
  actions={<>
            <GhostButton brand='EXPORTER' onClick={() => setCreateContractDialogOpen(false)} size="large">
              Cancel
            </GhostButton>
            <PrimaryButton brand='EXPORTER' 
              onClick={handleCreateContract}
              disabled={isCreatingContract || !newContract.buyerCompany || !newContract.buyerCountry || 
                        !newContract.buyerBank || !newContract.exporterBank ||
                        !newContract.buyerEmail || !newContract.coffeeType || !newContract.quantity || 
                        !newContract.pricePerKg || !newContract.portOfDestination || !newContract.deliveryDate || 
                        (parseFloat(newContract.pricePerKg) < 5.0) || contractDocuments.some((doc) => doc.status !== 'success')}
              size="large"
              sx={{ minWidth: 150 }}
            >
              {isCreatingContract 
                ? (isEditMode ? 'Updating...' : 'Registering...') 
                : (isEditMode ? 'Update Contract' : 'Register Contract')}
            </PrimaryButton>
          
  </>}
>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info" icon={<Warning />}>
                  <Typography variant="body2">
                    {correctingRejectedContractId ? (
                      <>
                        <strong>Correction:</strong> The rejected contract remains in the audit history. Submitting this form registers a replacement and records which rejection it corrects. Minimum FOB price: $5.00/kg
                        <Box sx={{ mt: 1 }}>
                          Tip: if you only need ECTA to re-review the same contract (same ID), use the <strong>Resubmit</strong> button on the rejected row instead of registering a replacement.
                        </Box>
                        {selectedContractForDetail?.rejectionReason && (
                          <Box sx={{ mt: 1 }}>
                            <strong>ECTA feedback:</strong> {selectedContractForDetail.rejectionReason}
                          </Box>
                        )}
                        {!hasActionableRejectionFeedback(selectedContractForDetail?.rejectionReason) && (
                          <Box sx={{ mt: 1 }}>
                            This feedback does not identify the field and exact change required. Ask ECTA for clarification before submitting a replacement; the portal cannot infer the rejected field.
                          </Box>
                        )}
                      </>
                    ) : (
                      <><strong>Important:</strong> All contracts must comply with ECTA regulations and will be subject to NBE approval for forex allocation. Minimum FOB price: $5.00/kg</>
                    )}
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
                <PortalField
                  fullWidth
                  label="Contact Person Name"
                  value={newContract.buyerName}
                  onChange={(e) => setNewContract({...newContract, buyerName: e.target.value})}
                  required
                  helperText="Full name of buyer representative"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <PortalField
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
                <PortalField
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
                <PortalField
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
                    {newContract.coffeeType && !isSupportedCoffeeType(newContract.coffeeType) && (
                      <MenuItem value={newContract.coffeeType}>
                        Existing value: {newContract.coffeeType}
                      </MenuItem>
                    )}
                    {COFFEE_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                  {newContract.coffeeType && !isSupportedCoffeeType(newContract.coffeeType) && (
                    <FormHelperText>
                      This saved value is not in the current coffee list. Select the correct grade to replace it.
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <PortalField
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
                <PortalField
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
                <PortalField
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
                <PortalField
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
                <PortalField
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
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    📋 Required Documents for Export Approval
                  </Typography>
                  <Typography variant="caption" component="div">
                    Upload these documents before submitting your contract:
                  </Typography>
                  <Typography variant="caption" component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                    <li><strong>Quality Certificate</strong> - Coffee quality inspection report</li>
                    <li><strong>Certificate of Origin</strong> - Proof of Ethiopian origin</li>
                    <li><strong>Export Permit</strong> - ECTA export authorization</li>
                  </Typography>
                  <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed rgba(0,0,0,0.12)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      📥 Download Sample Templates:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <SecondaryButton brand="EXPORTER"
                        size="small"
                        startIcon={<Download />}
                        href="/samples/Quality_Certificate_Sample.md"
                        download
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        Quality Certificate
                      </SecondaryButton>
                      <SecondaryButton brand="EXPORTER"
                        size="small"
                        startIcon={<Download />}
                        href="/samples/Certificate_of_Origin_Sample.md"
                        download
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        Certificate of Origin
                      </SecondaryButton>
                      <SecondaryButton brand="EXPORTER"
                        size="small"
                        startIcon={<Download />}
                        href="/samples/Export_Permit_Sample.md"
                        download
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        Export Permit
                      </SecondaryButton>
                    </Stack>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    <strong>Note:</strong> Export documents (Bill of Lading, Commercial Invoice, etc.) are created LATER when you register the actual shipment, not now.
                  </Typography>
                </Alert>

                {[
                  { value: 'QUALITY_CERTIFICATE', label: 'Quality / Sample Certificate', required: true, note: 'Required by ECTA' },
                  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin', required: true, note: 'Required by ECTA' },
                  { value: 'EXPORT_PERMIT', label: 'Export Permit', required: true, note: 'Required by ECTA' },
                  { value: 'PROFORMA_INVOICE', label: 'Sales Agreement / Proforma Invoice' },
                  { value: 'SALES_CONTRACT', label: 'Signed Sales Contract' },
                  { value: 'PURCHASE_ORDER', label: 'Buyer Purchase Order' },
                  { value: 'ORGANIC_CERTIFICATE', label: 'Organic Certificate' },
                  { value: 'FAIR_TRADE_CERTIFICATE', label: 'Fair Trade Certificate' },
                  { value: 'EUDR_STATEMENT', label: 'EUDR Due Diligence Statement' },
                ].map((documentType) => {
                  const documentsForType = contractDocuments.filter((doc) => doc.category === documentType.value);
                  return (
                    <Paper key={documentType.value} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: documentType.required ? '#fff8e1' : 'grey.50', borderColor: documentType.required ? 'warning.light' : 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {documentType.label}
                            {documentType.required && <Chip label="REQUIRED" size="small" color="warning" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                          </Typography>
                          {documentsForType.length === 0 && (
                            <Typography variant="caption" color={documentType.required ? 'warning.dark' : 'text.secondary'}>
                              {documentType.required ? (documentType.note || 'Required for ECTA approval') : 'Optional supporting document'}
                            </Typography>
                          )}
                        </Box>
                        <SecondaryButton brand='EXPORTER' component="label" size="small" startIcon={<Upload />}>
                          Upload
                          <input
                            hidden
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(event) => handleContractDocumentSelect(documentType.value, event)}
                          />
                        </SecondaryButton>
                      </Box>
                      {documentsForType.map((doc) => (
                        <Box key={doc.localId} sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Description fontSize="small" sx={{ color: doc.status === 'success' ? 'success.main' : doc.status === 'error' ? 'error.main' : 'text.disabled' }} />
                          <Typography variant="caption" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.file.name} · {(doc.file.size / 1024).toFixed(1)} KB
                          </Typography>
                          <Chip
                            size="small"
                            label={doc.status === 'success' ? 'Uploaded' : doc.status === 'error' ? 'Upload failed' : 'Uploading…'}
                            color={doc.status === 'success' ? 'success' : doc.status === 'error' ? 'error' : 'default'}
                          />
                          {doc.status === 'error' && (
                            <Tooltip title={doc.error || 'Remove this failed upload and try again'}>
                              <IconButton size="small" color="error" onClick={() => setContractDocuments((current) => current.filter((item) => item.localId !== doc.localId))}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      ))}
                    </Paper>
                  );
                })}
              </Grid>
            </Grid>
          </PortalDialog>
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={2}>
        {/* Forex & Banking Tab */}
        <Grid container spacing={3}>
          {/* Info Alert: Show Approved Contracts Pending LC Request */}
          {(() => {
            const approvedContractsWithoutLC = contracts.filter(c => {
              const isApproved = isContractApproved(c);
              const hasLC = lcStatuses.some(lc => lc.contractId === c.contractId);
              return isApproved && !hasLC;
            });
            
            if (approvedContractsWithoutLC.length > 0) {
              return (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      ⏳ {approvedContractsWithoutLC.length} Approved Contract(s) Pending LC Request
                    </Typography>
                    <Typography variant="body2">
                      Your approved contracts appear below as <strong>PENDING</strong> status. Click the <strong>"Request LC"</strong> button for each contract to submit your Letter of Credit request to the bank.
                      <br /><br />
                      After the bank reviews and issues the LC with forex allocation, the contracts will appear in the <strong>"Forex Allocations"</strong> section below.
                    </Typography>
                  </Alert>
                </Grid>
              );
            }
            return null;
          })()}
          
          {/* Approved Contracts Without LC - Show as PENDING in Table */}
          {(() => {
            const approvedContractsWithoutLC = contracts.filter(c => {
              const isApproved = isContractApproved(c);
              const hasLC = lcStatuses.some(lc => lc.contractId === c.contractId);
              return isApproved && !hasLC;
            });
            
            if (approvedContractsWithoutLC.length > 0) {
              return (
                <Grid item xs={12}>
                  <PortalCard brand='EXPORTER' title="📋 Approved Contracts (Pending LC Request)">
                      <PortalDataGrid brand='EXPORTER'
                        rows={approvedContractsWithoutLC.map(contract => ({
                          id: contract.contractId,
                          contractId: contract.contractId,
                          buyer: contract.buyerName || 'N/A',
                          value: contract.totalValue || 0,
                          quantity: contract.quantity || 0,
                          approvalDate: contract.registrationDate || new Date().toISOString(),
                          status: contract.status,
                          // Pending-LC is a flag, not a status: the row
                          // keeps the contract's real status (APPROVED).
                          pendingLC: true,
                        }))}
                        columns={[
                          {
                            field: 'contractId',
                            headerName: 'Contract ID',
                            width: 180,
                            renderCell: (params) => (
                              <Typography variant="body2" fontWeight={600}>
                                {params.value}
                              </Typography>
                            ),
                          },
                          {
                            field: 'status',
                            headerName: 'Status',
                            width: 200,
                            renderCell: (params) => (
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <StatusChip status={params.row.status} />
                                {params.row.pendingLC && (
                                  <Chip
                                    label="Pending LC"
                                    size="small"
                                    sx={{
                                      bgcolor: '#FF9800',
                                      color: 'white',
                                      fontWeight: 600
                                    }}
                                  />
                                )}
                              </Box>
                            ),
                          },
                          {
                            field: 'buyer',
                            headerName: 'Buyer',
                            width: 200,
                          },
                          {
                            field: 'value',
                            headerName: 'Contract Value (USD)',
                            width: 180,
                            renderCell: (params) => (
                              <Typography variant="body2" fontWeight={600}>
                                ${params.value.toLocaleString()}
                              </Typography>
                            ),
                          },
                          {
                            field: 'quantity',
                            headerName: 'Quantity (kg)',
                            width: 150,
                            renderCell: (params) => (
                              <Typography variant="body2">
                                {params.value.toLocaleString()}
                              </Typography>
                            ),
                          },
                          {
                            field: 'approvalDate',
                            headerName: 'Approval Date',
                            width: 150,
                            renderCell: (params) => (
                              <Typography variant="body2">
                                {new Date(params.value).toLocaleDateString()}
                              </Typography>
                            ),
                          },
                          {
                            field: 'actions',
                            headerName: 'Actions',
                            width: 320,
                            sortable: false,
                            renderCell: (params) => {
                              const contract = contracts.find(c => c.contractId === params.row.contractId);
                              return (
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Tooltip title="Request Letter of Credit for this contract">
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<AccountBalance />}
                                      onClick={() => {
                                        console.log('[REQUEST LC] Button clicked', { contract, profile });
                                        if (contract) {
                                          console.log('[REQUEST LC] Opening dialog with contract:', contract.contractId);
                                          console.log('[REQUEST LC] Using exporterBank from contract:', contract.exporterBank);
                                          console.log('[REQUEST LC] Using companyName from profile:', profile?.companyName);
                                          
                                          // Directly open LC request dialog with pre-filled data
                                          setSelectedContractForLC(contract);
                                          setLcRequestForm({
                                            advisingBank: contract.exporterBank || profile?.bankName || 'Commercial Bank of Ethiopia',
                                            beneficiaryName: profile?.companyName || 'Your Company',
                                            expiryDays: '90',
                                            amount: (contract.totalValue || 0).toString(),
                                            currency: contract.currency || 'USD',
                                            transportMode: 'SEA' as 'SEA' | 'AIR',
                                            portOfLoading: 'Djibouti Port',
                                            portOfDischarge: contract.buyerCountry || '',
                                            latestShipmentDays: '60',
                                            partialShipment: false,
                                            transhipment: true,
                                            paymentTerms: 'Sight LC',
                                            specialInstructions: '',
                                          });
                                          setLcRequestDialogOpen(true);
                                        } else {
                                          console.error('[REQUEST LC] Contract not found!');
                                        }
                                      }}
                                      sx={{
                                        bgcolor: '#1976d2',
                                        '&:hover': { bgcolor: '#1565c0' },
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      Request LC
                                    </Button>
                                  </Tooltip>
                                  
                                  <Tooltip title="View contract details & blockchain-verified signatures">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        setSelectedContractForDetail(contract || null);
                                        setContractDetailDialogOpen(true);
                                      }}
                                    >
                                      <Visibility />
                                    </IconButton>
                                  </Tooltip>
                                  
                                </Box>
                              );
                            },
                          },
                        ]}
                        autoHeight
                        pageSizeOptions={[5, 10, 25]}
                        initialState={{
                          pagination: { paginationModel: { pageSize: 5 } },
                        }}
                      />
                    </PortalCard>
                </Grid>
              );
            }
            return null;
          })()}
          
          {/* LC Requested (Awaiting Bank Approval) */}
          {(() => {
            const contractsWithRequestedLC = contracts.filter(c => {
              const lc = lcStatuses.find(lc => lc.contractId === c.contractId);
              return lc && lc.status === 'REQUESTED';
            });
            
            if (contractsWithRequestedLC.length > 0) {
              return (
                <Grid item xs={12}>
                  <PortalCard brand='EXPORTER' title="📋 LC Requested (Awaiting Bank Approval)">
                      <PortalDataGrid brand='EXPORTER'
                        rows={contractsWithRequestedLC.map(contract => {
                          const lc = lcStatuses.find(lc => lc.contractId === contract.contractId);
                          return {
                            id: contract.contractId,
                            contractId: contract.contractId,
                            lcId: lc?.lcId || 'N/A',
                            buyer: contract.buyerName || 'N/A',
                            value: contract.totalValue || 0,
                            bank: lc?.advisingBank || contract.exporterBank || 'N/A',
                            requestDate: new Date().toISOString(),
                            status: 'REQUESTED',
                          };
                        })}
                        columns={[
                          {
                            field: 'contractId',
                            headerName: 'Contract ID',
                            width: 180,
                            renderCell: (params) => (
                              <Typography variant="body2" fontWeight={600}>
                                {params.value}
                              </Typography>
                            ),
                          },
                          {
                            field: 'lcId',
                            headerName: 'LC ID',
                            width: 200,
                            renderCell: (params) => (
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                {params.value}
                              </Typography>
                            ),
                          },
                          {
                            field: 'status',
                            headerName: 'Status',
                            width: 180,
                            renderCell: () => (
                              <Chip 
                                label="LC REQUESTED" 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#2196F3', 
                                  color: 'white',
                                  fontWeight: 600 
                                }} 
                              />
                            ),
                          },
                          {
                            field: 'buyer',
                            headerName: 'Buyer',
                            width: 180,
                          },
                          {
                            field: 'value',
                            headerName: 'LC Amount (USD)',
                            width: 150,
                            renderCell: (params) => (
                              <Typography variant="body2" fontWeight={600}>
                                ${params.value.toLocaleString()}
                              </Typography>
                            ),
                          },
                          {
                            field: 'bank',
                            headerName: 'Advising Bank',
                            width: 200,
                          },
                          {
                            field: 'requestDate',
                            headerName: 'Request Date',
                            width: 150,
                            renderCell: (params) => (
                              <Typography variant="body2">
                                {new Date(params.value).toLocaleDateString()}
                              </Typography>
                            ),
                          },
                        ]}
                        autoHeight
                        pageSizeOptions={[5, 10, 25]}
                        initialState={{
                          pagination: { paginationModel: { pageSize: 5 } },
                        }}
                      />
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Your bank is reviewing the LC request. This typically takes 1-2 business days. Once approved, the bank will issue the LC and allocate forex, which will appear in the "Forex Allocations" section below.
                        </Typography>
                      </Alert>
                    </PortalCard>
                </Grid>
              );
            }
            return null;
          })()}
          
          {/* Forex Allocations */}
          <Grid item xs={12}>
            <PortalCard brand='EXPORTER' title="Forex Allocations">
              {/* LEG 1 (F5a): exporters can now file their own forex
                  request — previously the portal only listed allocations
                  and the API 403'd exporters. */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <PrimaryButton brand='EXPORTER'
                  startIcon={<AttachMoney />}
                  disabled={contracts.length === 0}
                  onClick={() => {
                    const firstContract = contracts.find((c) => isContractApproved(c)) || contracts[0];
                    setForexRequestForm({
                      contractId: firstContract?.contractId || '',
                      lcId: '',
                      amount: firstContract?.totalValue ? String(firstContract.totalValue) : '',
                      currency: firstContract?.currency || 'USD',
                    });
                    setForexRequestDialogOpen(true);
                  }}
                >
                  Request Forex
                </PrimaryButton>
              </Box>
                <PortalDataGrid brand='EXPORTER'
                  rows={forexStatuses}
                  columns={[
                    { field: 'forexId', headerName: 'Forex ID', width: 200 },
                    { field: 'contractId', headerName: 'Contract ID', width: 200 },
                    { 
                      field: 'allocatedAmount', 
                      headerName: 'Allocated Amount', 
                      width: 150,
                      renderCell: (params) => `$${params.value.toLocaleString()} ${params.row.currency}`
                    },
                    { 
                      field: 'exchangeRate', 
                      headerName: 'Exchange Rate', 
                      width: 130,
                      renderCell: (params) => `${params.value} ETB/USD`
                    },
                    { 
                      field: 'retentionRate', 
                      headerName: 'Retention', 
                      width: 120,
                      renderCell: (params) => `${params.value}% / ${100 - params.value}%`
                    },
                    { 
                      field: 'expiryDate', 
                      headerName: 'Expiry Date', 
                      width: 130,
                      renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A'
                    },
                    {
                      field: 'status',
                      headerName: 'Status',
                      width: 130,
                      renderCell: (params) => <StatusChip status={params.value} />,
                    },
                  ]}
                  getRowId={(row) => row.forexId}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                />
              </PortalCard>
          </Grid>

          {/* Letters of Credit - Only show those with forex-related statuses */}
          <Grid item xs={12}>
            <PortalCard brand='EXPORTER' title="Letters of Credit">
                <PortalDataGrid brand='EXPORTER'
                  rows={lcStatuses}
                  columns={[
                    { field: 'lcId', headerName: 'LC Number', width: 220 },
                    { field: 'contractId', headerName: 'Contract ID', width: 200 },
                    { 
                      field: 'amount', 
                      headerName: 'Amount', 
                      width: 150,
                      renderCell: (params) => `$${params.value.toLocaleString()} ${params.row.currency}`
                    },
                    { field: 'issuingBank', headerName: 'Issuing Bank', width: 200 },
                    { field: 'advisingBank', headerName: 'Advising Bank', width: 200 },
                    { 
                      field: 'expiryDate', 
                      headerName: 'Expiry Date', 
                      width: 130,
                      renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A'
                    },
                    {
                      field: 'status',
                      headerName: 'Status',
                      width: 130,
                      renderCell: (params) => <StatusChip status={params.value} />,
                    },
                  ]}
                  getRowId={(row) => row.lcId}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                />
                {lcStatuses.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No Letters of Credit yet. Request LC from the "My Contracts" tab for approved contracts.
                  </Alert>
                )}
              </PortalCard>
          </Grid>

          {/* Payments */}
          <Grid item xs={12}>
            <PortalCard brand='EXPORTER' title="Payment Status">
                <PortalDataGrid brand='EXPORTER'
                  rows={payments}
                  columns={[
                    { field: 'paymentId', headerName: 'Payment ID', width: 220 },
                    { field: 'shipmentId', headerName: 'Shipment ID', width: 200 },
                    { 
                      field: 'amount', 
                      headerName: 'Total Amount', 
                      width: 150,
                      renderCell: (params) => `$${params.value.toLocaleString()} ${params.row.currency}`
                    },
                    { 
                      field: 'retainedAmount', 
                      headerName: 'FCY Retained',
                      width: 140,
                      renderCell: (params) => `$${params.value.toLocaleString()}`
                    },
                    { 
                      field: 'convertedAmount', 
                      headerName: 'Converted',
                      width: 150,
                      renderCell: (params) => `$${params.value.toLocaleString()}`
                    },
                    { field: 'swiftReference', headerName: 'SWIFT Reference', width: 180 },
                    {
                      field: 'status',
                      headerName: 'Status',
                      width: 150,
                      renderCell: (params) => <StatusChip status={params.value} />,
                    },
                  ]}
                  getRowId={(row) => row.paymentId}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                />
              </PortalCard>
          </Grid>
        </Grid>
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={3}>
        {/* Shipments Tab */}
        <Box>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Shipment Tracking & Management</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Register and track shipments through quality inspection, customs, and shipping
            </Typography>
          </Box>

          {/* Contracts Ready for Shipment Alert */}
          {(() => {
            const readyForexContracts = forexStatuses.filter(f => {
              const hasShipment = shipments.some(s => 
                (s.contractId || '').toLowerCase() === (f.contractId || '').toLowerCase()
              );
              return f.status === 'ALLOCATED' && !hasShipment;
            });
            
            if (readyForexContracts.length > 0) {
              return (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>✅ {readyForexContracts.length} Contract(s) Ready for Shipment</strong>
                    <br />
                    You have contracts with allocated forex. Click "Register New Shipment" above to proceed.
                  </Typography>
                </Alert>
              );
            }
            return null;
          })()}

          {/* Quality Inspection Pending Alert */}
          {shipments.filter(s => s.status === 'CREATED').length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>🔬 Quality Inspection Pending</strong>
                <br />
                You have {shipments.filter(s => s.status === 'CREATED').length} shipment(s) awaiting ECTA quality inspection.
                ECTA inspector will perform physical inspection and cupping test within 2-3 business days.
              </Typography>
            </Alert>
          )}

          {/* Shipments DataGrid Table */}
          {(() => {
            // ✅ SHIPMENTS TAB: Show actual shipments + contracts ready for shipment (forex allocated)
            
            // Get contracts with forex allocated but no shipment yet
            const contractsReadyForShipment = forexStatuses
              .filter(f => {
                const hasShipment = shipments.some(s => 
                  (s.contractId || '').toLowerCase() === (f.contractId || '').toLowerCase()
                );
                return f.status === 'ALLOCATED' && !hasShipment;
              })
              .map(forex => {
                const contract = contracts.find(c => c.contractId === forex.contractId);
                if (!contract) return null;
                
                return {
                  shipmentId: `PENDING_${contract.contractId}`,
                  contractId: contract.contractId,
                  buyerId: contract.buyerName,
                  quantity: contract.quantity,
                  grade: contract.coffeeType,
                  status: 'FOREX_ALLOCATED',
                  transportMode: 'SEA',
                  currentLocation: 'Ready to Ship',
                  forexRate: forex.exchangeRate,
                  _isPending: true, // Flag to identify pending rows
                };
              })
              .filter(Boolean);
            
            const allRows = [...shipments, ...contractsReadyForShipment];
            
            // console.log('[SHIPMENTS TAB] Displaying shipments:', shipments.length, 'pending:', contractsReadyForShipment.length);
            
            return (
              <Box>
                {allRows.length === 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>No shipments yet.</strong> Create your first shipment by going to <strong>Contracts</strong> tab, then request an LC for an approved contract.
                    </Typography>
                  </Alert>
                )}
                
                <PortalDataGrid brand='EXPORTER'
                  rows={allRows}
                  columns={shipmentColumns}
                  getRowId={(row) => row.shipmentId}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  getRowClassName={(params) => params.row.isPending ? 'pending-shipment-row' : ''}
                  sx={{
                    '& .pending-shipment-row': {
                      bgcolor: 'rgba(155, 48, 183, 0.08)',
                      '&:hover': {
                        bgcolor: 'rgba(155, 48, 183, 0.12)',
                      },
                    },
                  }}
                />
              </Box>
            );
          })()}
        </Box>
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={4}>
        {/* Customs Declaration Tab */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: BRAND_COLOR }}>
              🛃 Customs Declarations
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Track your shipments through the complete customs clearance workflow: Quality Inspection → Export Permit → Customs Declaration → Clearance
          </Typography>

          {/* DataGrid Table */}
          <Card sx={{ boxShadow: 3 }}>
            <PortalDataGrid brand='EXPORTER'
              key={`customs-grid-${shipmentsWithDeclarations.size}`}
              rows={shipments.map((shipment) => {
                const contract = contracts.find(c => c.contractId === shipment.contractId);
                const hasPermit = shipmentsWithPermits.has(shipment.shipmentId);
                const hasDeclared = shipmentsWithDeclarations.has(shipment.shipmentId);
                const declaration = declarationsByShipment.get(shipment.shipmentId);
                const isCleared = isShipmentCustomsCleared(shipment);
                const isPendingContract = (shipment as any)._isContract === true; // This is an approved contract, not a shipment yet
                
                // console.log(`[EXPORTER] Shipment ${shipment.shipmentId}: hasPermit=${hasPermit}, hasDeclared=${hasDeclared}, isCleared=${isCleared}, isPendingContract=${isPendingContract}`);
                
                // Determine quality inspection status
                let qualityStatus = isPendingContract ? 'Awaiting Shipment' : 'Pending';
                let qualityColor = isPendingContract ? '#9E9E9E' : '#FF9800';
                if (hasPermit || isCleared) {
                  qualityStatus = 'Approved';
                  qualityColor = '#4CAF50';
                }
                
                // Determine export permit status
                let permitStatus = isPendingContract ? 'N/A' : 'Not Issued';
                let permitColor = isPendingContract ? '#9E9E9E' : '#FF9800';
                if (hasPermit || isCleared) {
                  permitStatus = 'Issued';
                  permitColor = '#4CAF50';
                }
                
                // Determine customs declaration status from the real
                // declaration.status (SUBMITTED / UNDER_INSPECTION /
                // UNDER_REVIEW / CLEARED / REJECTED) — never derived from
                // the shipment's transit state. A REJECTED declaration
                // shows Rejected, a CLEARED one shows Cleared.
                let customsStatus = isPendingContract ? 'N/A' : 'Not Declared';
                let customsColor = isPendingContract ? '#9E9E9E' : '#FF9800';
                if (declaration?.status === 'REJECTED') {
                  customsStatus = 'Rejected';
                  customsColor = '#F44336';
                } else if (isCleared) {
                  customsStatus = 'Cleared';
                  customsColor = '#4CAF50';
                } else if (declaration?.status === 'UNDER_INSPECTION') {
                  customsStatus = 'Under Inspection';
                  customsColor = '#2196F3';
                } else if (declaration?.status === 'UNDER_REVIEW') {
                  customsStatus = 'Under Review';
                  customsColor = '#2196F3';
                } else if (hasDeclared) {
                  customsStatus = 'Submitted';
                  customsColor = '#2196F3';
                } else if (hasPermit) {
                  customsStatus = 'Ready to Declare';
                  customsColor = '#9c27b0';
                }
                
                return {
                  id: shipment.shipmentId,
                  shipmentId: shipment.shipmentId,
                  contractId: shipment.contractId,
                  buyer: contract?.buyerName || shipment.buyerId,
                  destination: contract?.buyerCountry || 'Unknown',
                  quantity: shipment.quantity || 0,
                  qualityStatus,
                  qualityColor,
                  permitStatus,
                  permitColor,
                  customsStatus,
                  customsColor,
                  hasPermit,
                  hasDeclared,
                  isCleared,
                  isPendingContract,
                  shipment,
                  contract,
                };
              })}
              columns={[
                {
                  field: 'shipmentId',
                  headerName: 'Shipment ID',
                  width: 180,
                  renderCell: (params) => {
                    const isPending = params.row.isPendingContract;
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isPending ? (
                          <HourglassEmpty fontSize="small" sx={{ color: '#9E9E9E' }} />
                        ) : (
                          <LocalShipping fontSize="small" sx={{ color: BRAND_COLOR }} />
                        )}
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          sx={{ 
                            color: isPending ? '#9E9E9E' : 'inherit',
                            fontStyle: isPending ? 'italic' : 'normal'
                          }}
                        >
                          {isPending ? 'PENDING' : params.value}
                        </Typography>
                      </Box>
                    );
                  },
                },
                {
                  field: 'contractId',
                  headerName: 'Contract',
                  width: 160,
                  renderCell: (params) => (
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{params.value}</Typography>
                  ),
                },
                {
                  field: 'buyer',
                  headerName: 'Buyer',
                  width: 160,
                },
                {
                  field: 'destination',
                  headerName: 'Destination',
                  width: 140,
                },
                {
                  field: 'quantity',
                  headerName: 'Quantity (kg)',
                  width: 120,
                  valueFormatter: (params) => params.value ? Number(params.value).toLocaleString() : '0',
                },
                {
                  field: 'qualityStatus',
                  headerName: 'Quality Inspection',
                  width: 150,
                  renderCell: (params) => (
                    <Chip
                      label={params.value}
                      sx={{
                        bgcolor: `${params.row.qualityColor}15`,
                        color: params.row.qualityColor,
                        border: `1px solid ${params.row.qualityColor}`,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                      size="small"
                    />
                  ),
                },
                {
                  field: 'permitStatus',
                  headerName: 'Export Permit',
                  width: 140,
                  renderCell: (params) => (
                    <Chip
                      label={params.value}
                      sx={{
                        bgcolor: `${params.row.permitColor}15`,
                        color: params.row.permitColor,
                        border: `1px solid ${params.row.permitColor}`,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                      size="small"
                    />
                  ),
                },
                {
                  field: 'customsStatus',
                  headerName: 'Customs Status',
                  width: 160,
                  renderCell: (params) => (
                    <Chip
                      label={params.value}
                      sx={{
                        bgcolor: `${params.row.customsColor}15`,
                        color: params.row.customsColor,
                        border: `1px solid ${params.row.customsColor}`,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                      size="small"
                    />
                  ),
                },
                {
                  field: 'actions',
                  headerName: 'Actions',
                  width: 200,
                  sortable: false,
                  renderCell: (params) => {
                    // Shipments tab only shows actual shipments (not pending contracts)
                    // Show customs declaration workflow
                    return (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {params.row.hasPermit && !params.row.hasDeclared && !params.row.isCleared ? (
                          <Tooltip title="Submit customs declaration with required documents">
                            <PrimaryButton brand='EXPORTER'
                              size="small"
                              startIcon={<Upload />}
                              onClick={() => {
                                setSelectedShipmentForCustoms(params.row.shipment);
                                setCustomsDocuments([]);
                                setCustomsForm({
                                  hsCode: '090111',
                                  portOfExit: 'Djibouti Port',
                                  // Leg2 #9: contract total value, else
                                  // quantity × contract pricePerKg; never
                                  // an invented $9.25/kg (blank when the
                                  // contract carries no price).
                                  customsValue: (() => {
                                    const total = (params.row.contract as any)?.total_value ?? (params.row.contract as any)?.totalValue;
                                    if (total != null && Number(total) > 0) return String(total);
                                    const ppk = Number((params.row.contract as any)?.pricePerKg);
                                    if (Number.isFinite(ppk) && ppk > 0) return ((params.row.quantity || 0) * ppk).toFixed(2);
                                    return '';
                                  })(),
                                  additionalNotes: '',
                                  eudrCompliant: true,
                                });
                                setCustomsDeclarationDialogOpen(true);
                              }}
                              sx={{ fontSize: '0.8rem' }}
                            >
                              Declare
                            </PrimaryButton>
                          </Tooltip>
                        ) : params.row.hasDeclared && !params.row.isCleared ? (
                          <Tooltip title="Declaration submitted, awaiting customs officer review">
                            <Chip
                              label="Declared"
                              size="small"
                              sx={{ bgcolor: '#2196F315', color: '#2196F3', fontWeight: 600, cursor: 'help' }}
                            />
                          </Tooltip>
                        ) : !params.row.hasPermit && !params.row.isCleared ? (
                          <Tooltip title="Waiting for quality inspection and export permit from ECTA">
                            <Chip
                              label="Waiting"
                              size="small"
                              sx={{ bgcolor: '#FF980015', color: '#FF9800', fontWeight: 600, cursor: 'help' }}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Customs cleared and in transit">
                            <Chip
                              label="Cleared"
                              size="small"
                              color="success"
                              icon={<CheckCircle />}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    );
                  },
                },
              ]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 },
                },
                sorting: {
                  sortModel: [{ field: 'customsStatus', sort: 'asc' }],
                },
              }}
              pageSizeOptions={[5, 10, 25]}
              autoHeight
              disableRowSelectionOnClick
            />
          </Card>

          {shipments.length === 0 && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>No shipments available.</strong> Create a shipment for your approved contract to start the customs clearance process.
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                <strong>Workflow:</strong> Create Shipment → Quality Inspection (ECTA) → Export Permit (ECTA) → Customs Declaration (You) → Clearance (Customs)
              </Typography>
            </Alert>
          )}
        </Box>
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={5}>
        {/* LC & Payments (SWIFT Messages) Tab */}
        <SWIFTMessagesViewWrapper 
          lcStatuses={lcStatuses}
          exporterId={profile?.exporterId}
        />
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={6}>
        {/* Reports Tab */}
        <Grid container spacing={3}>
          
          {/* Generate Report Section - Simplified */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generate Report</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Exports all activities for the selected period as CSV (contracts, shipments, forex, payments) via GET /analytics/export-report.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <PrimaryButton brand='EXPORTER'
                      fullWidth
                      startIcon={<Download />}
                      disabled={isGeneratingReport}
                      onClick={handleGenerateReport}
                    >
                      {isGeneratingReport ? 'Generating...' : 'Generate'}
                    </PrimaryButton>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Quick Stats */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Quick Stats</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">EUDR Compliance</Typography>
                    <Typography variant="h6" fontWeight="600">Unavailable</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Customs Rejections</Typography>
                    <Typography variant="h6" fontWeight="600">Unavailable</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">On-Time Delivery</Typography>
                    <Typography variant="h6" fontWeight="600">Unavailable</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Quality Rating</Typography>
                    <Typography variant="h6" fontWeight="600">Unavailable</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </PortalTabPanel>

      <PortalTabPanel value={tabValue} index={7}>
        {/* Audit Trail Tab */}
        <AuditTrailTable
          title="Exporter Portal - Complete Transaction History"
          autoRefresh={true}
          refreshInterval={60000}
          showStats={false}
          maxHeight={700}
        />
      </PortalTabPanel>
    </PortalShell>

    {/* LC Request Dialog - Global (Outside TabPanels) */}
    <PortalDialog brand='EXPORTER' 
      open={lcRequestDialogOpen} 
      onClose={() => {
        setLcRequestDialogOpen(false);
        setSelectedContractForLC(null);
      }}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
        }
      }}
    
  icon={<AccountBalance />}
  title="Request Letter of Credit"
  subtitle={selectedContractForLC ? `Contract: ${selectedContractForLC.contractId}` : undefined}
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => {
          setLcRequestDialogOpen(false);
          setSelectedContractForLC(null);
        }}>
          Cancel
        </GhostButton>
        <PrimaryButton brand='EXPORTER'
          onClick={handleRequestLC}
          disabled={isRequestingLC || !lcRequestForm.advisingBank || !lcRequestForm.beneficiaryName}
        >
          {isRequestingLC ? 'Submitting...' : 'Submit LC Request'}
        </PrimaryButton>
      
  </>}
>
        {selectedContractForLC ? (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" icon={<AccountBalance />}>
                <Typography variant="body2">
                  <strong>LC Request Process:</strong> Your bank will review this LC request, approve it, and issue the LC (MT700 SWIFT message) to the buyer's bank. Once issued, forex will be allocated for your export.
                </Typography>
              </Alert>
            </Grid>

            {/* Contract Summary */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#9b30b7' }}>
                Contract Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Buyer</Typography>
                  <Typography variant="body2">{selectedContractForLC.buyerName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Country</Typography>
                  <Typography variant="body2">{selectedContractForLC.buyerCountry}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Coffee Type</Typography>
                  <Typography variant="body2">{selectedContractForLC.coffeeType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Quantity</Typography>
                  <Typography variant="body2">{Number(selectedContractForLC.quantity).toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Value</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${Number(selectedContractForLC.totalValue).toLocaleString()} {selectedContractForLC.currency}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>

            {/* LC Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#9b30b7' }}>
                LC Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="Advising Bank (Your Bank)"
                value={lcRequestForm.advisingBank}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, advisingBank: e.target.value })}
                required
                helperText="Your Ethiopian bank that will advise the LC"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="Beneficiary Name"
                value={lcRequestForm.beneficiaryName}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, beneficiaryName: e.target.value })}
                required
                helperText="Your company name as beneficiary"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="LC Amount"
                type="number"
                value={lcRequestForm.amount}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, amount: e.target.value })}
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                select
                label="Currency"
                value={lcRequestForm.currency}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, currency: e.target.value })}
                required
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </PortalField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="LC Validity (Days)"
                type="number"
                value={lcRequestForm.expiryDays}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, expiryDays: e.target.value })}
                required
                helperText="Days from today"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="Latest Shipment (Days)"
                type="number"
                value={lcRequestForm.latestShipmentDays}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, latestShipmentDays: e.target.value })}
                required
                helperText="Days from LC issuance"
              />
            </Grid>

            {/* Shipping Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ color: '#9b30b7', mt: 2 }}>
                Shipping Terms
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                select
                label="Transport Mode"
                value={lcRequestForm.transportMode}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, transportMode: e.target.value as 'SEA' | 'AIR' })}
                required
              >
                <MenuItem value="SEA">Sea Freight</MenuItem>
                <MenuItem value="AIR">Air Freight</MenuItem>
              </PortalField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="Port of Loading"
                value={lcRequestForm.portOfLoading}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, portOfLoading: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                label="Port of Discharge"
                value={lcRequestForm.portOfDischarge}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, portOfDischarge: e.target.value })}
                required
                helperText="Destination port"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <PortalField
                fullWidth
                select
                label="Payment Terms"
                value={lcRequestForm.paymentTerms}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, paymentTerms: e.target.value })}
                required
              >
                <MenuItem value="Sight LC">Sight LC (Immediate Payment)</MenuItem>
                <MenuItem value="Usance LC 30 days">Usance LC - 30 days</MenuItem>
                <MenuItem value="Usance LC 60 days">Usance LC - 60 days</MenuItem>
                <MenuItem value="Usance LC 90 days">Usance LC - 90 days</MenuItem>
              </PortalField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lcRequestForm.partialShipment}
                    onChange={(e) => setLcRequestForm({ ...lcRequestForm, partialShipment: e.target.checked })}
                  />
                }
                label="Allow Partial Shipment"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lcRequestForm.transhipment}
                    onChange={(e) => setLcRequestForm({ ...lcRequestForm, transhipment: e.target.checked })}
                  />
                }
                label="Allow Transhipment"
              />
            </Grid>

            <Grid item xs={12}>
              <PortalField
                fullWidth
                multiline
                rows={3}
                label="Special Instructions"
                value={lcRequestForm.specialInstructions}
                onChange={(e) => setLcRequestForm({ ...lcRequestForm, specialInstructions: e.target.value })}
                placeholder="Enter any special terms or conditions for this LC..."
              />
            </Grid>
          </Grid>
        ) : (
          <Alert severity="warning">
            <Typography variant="body2">
              No contract selected. Please close this dialog and try again.
            </Typography>
          </Alert>
        )}
      </PortalDialog>

    {/* Forex Request Dialog — LEG 1 (F5a). Exporters file their own
        forex allocation request here; the bank/NBE flow continues from
        the REQUESTED state. */}
    <PortalDialog brand='EXPORTER'
      open={forexRequestDialogOpen}
      onClose={() => setForexRequestDialogOpen(false)}
      maxWidth="md"
      icon={<AttachMoney />}
      title="Request Forex Allocation"
      subtitle="File a foreign-exchange allocation request for one of your contracts"
      actions={<>
        <GhostButton brand='EXPORTER' onClick={() => setForexRequestDialogOpen(false)}>
          Cancel
        </GhostButton>
        <PrimaryButton brand='EXPORTER'
          onClick={handleRequestForex}
          disabled={isRequestingForex || !forexRequestForm.contractId || !forexRequestForm.amount}
        >
          {isRequestingForex ? 'Submitting...' : 'Submit Forex Request'}
        </PrimaryButton>
      </>}
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Forex Request Process:</strong> NBE reviews the request, confirms it, and the bank allocates the foreign exchange under the active NBE retention policy. Linking an issued LC is optional here — the bank links it at allocation time if you leave it blank.
            </Typography>
          </Alert>
        </Grid>
        <Grid item xs={12} sm={6}>
          <PortalField
            fullWidth
            select
            label="Contract"
            value={forexRequestForm.contractId}
            onChange={(e) => {
              const c = contracts.find((x) => x.contractId === e.target.value);
              setForexRequestForm({
                ...forexRequestForm,
                contractId: e.target.value,
                amount: c?.totalValue ? String(c.totalValue) : forexRequestForm.amount,
                currency: c?.currency || forexRequestForm.currency,
              });
            }}
            required
            helperText="The sales contract this forex is for"
          >
            {contracts.map((c) => (
              <MenuItem key={c.contractId} value={c.contractId}>
                {c.contractId} — {c.buyerName || c.buyerId} (${Number(c.totalValue || 0).toLocaleString()} {c.currency})
              </MenuItem>
            ))}
          </PortalField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <PortalField
            fullWidth
            select
            label="Letter of Credit (optional)"
            value={forexRequestForm.lcId}
            onChange={(e) => setForexRequestForm({ ...forexRequestForm, lcId: e.target.value })}
            helperText="Link an issued LC now, or leave blank"
          >
            <MenuItem value="">None yet</MenuItem>
            {lcStatuses.map((lc) => (
              <MenuItem key={lc.lcId} value={lc.lcId}>
                {lc.lcId} ({lc.status})
              </MenuItem>
            ))}
          </PortalField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <PortalField
            fullWidth
            label="Amount"
            type="number"
            value={forexRequestForm.amount}
            onChange={(e) => setForexRequestForm({ ...forexRequestForm, amount: e.target.value })}
            required
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            helperText="Defaults to the contract total value"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <PortalField
            fullWidth
            select
            label="Currency"
            value={forexRequestForm.currency}
            onChange={(e) => setForexRequestForm({ ...forexRequestForm, currency: e.target.value })}
            required
          >
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="EUR">EUR</MenuItem>
            <MenuItem value="GBP">GBP</MenuItem>
          </PortalField>
        </Grid>
      </Grid>
    </PortalDialog>

    {/* Contract Detail Dialog */}
    <PortalDialog brand='EXPORTER' open={contractDialogOpen} onClose={handleContractDialogClose} maxWidth="md"
  title="Contract Details"
  actions={<>
        <GhostButton brand='EXPORTER' onClick={handleContractDialogClose}>Close</GhostButton>
        {selectedContract && isContractApproved(selectedContract) && hasIssuedLC(selectedContract.contractId) && (
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
      
  </>}
>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <StatusChip status={selectedContract.status} />
                  <Typography variant="body1" fontWeight={600}>
                    {selectedContract.status === 'REGISTERED' && 'Awaiting ECTA Review'}
                    {selectedContract.status === 'APPROVED' && (hasIssuedLC(selectedContract.contractId) ? 'ECTA Approved - LC Issued' : 'ECTA Approved - Ready for LC')}
                    {selectedContract.status === 'COMPLETED' && 'Export Completed'}
                  </Typography>
                </Box>
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
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>Contract Progress Timeline</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  <Chip 
                    label="1. Registered" 
                    color={['REGISTERED', 'APPROVED', 'COMPLETED'].includes(selectedContract.status) ? 'success' : 'default'} 
                    icon={<CheckCircle />}
                    size="small" 
                  />
                  <Typography>→</Typography>
                  <Chip 
                    label="2. ECTA Approved" 
                    color={['APPROVED', 'COMPLETED'].includes(selectedContract.status) ? 'success' : 'default'} 
                    icon={['APPROVED', 'COMPLETED'].includes(selectedContract.status) ? <CheckCircle /> : undefined}
                    size="small" 
                  />
                  <Typography>→</Typography>
                  <Chip 
                    label="3. Bank LC Issued" 
                    color={hasIssuedLC(selectedContract.contractId) ? 'success' : 'default'} 
                    icon={hasIssuedLC(selectedContract.contractId) ? <CheckCircle /> : undefined}
                    size="small" 
                  />
                  <Typography>→</Typography>
                  <Chip 
                    label="4. Export Complete" 
                    color={selectedContract.status === 'COMPLETED' ? 'success' : 'default'} 
                    icon={selectedContract.status === 'COMPLETED' ? <CheckCircle /> : undefined}
                    size="small" 
                  />
                </Box>
              </CardContent>
            </Card>

            {selectedContract.status === 'REGISTERED' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Your contract is registered and awaiting ECTA review for export compliance approval.
              </Alert>
            )}
            {selectedContract.status === 'APPROVED' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Your contract has been approved by ECTA. The bank can now issue a Letter of Credit for payment.
              </Alert>
            )}
          </Box>
        )}
      </PortalDialog>

    {/* Professional Contract Detail Dialog - for Shipments Tab PENDING rows */}
    <PortalDialog brand='EXPORTER'
      open={contractDetailDialogOpen}
      onClose={() => {
        setContractDetailDialogOpen(false);
        setSelectedContractForDetail(null);
      }}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
        }
      }}
    
  icon={<Description />}
  title="Contract Details"
  subtitle={selectedContractForDetail?.contractId}
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => {
          setContractDetailDialogOpen(false);
          setSelectedContractForDetail(null);
        }}>
          Close
        </GhostButton>
        {(() => {
          // Only show "Create Shipment" button if contract has forex allocated
          if (selectedContractForDetail) {
            const hasForex = forexStatuses.some(f => 
              f.contractId === selectedContractForDetail.contractId && 
              f.status === 'ALLOCATED'
            );
            
            if (hasForex) {
              return (
                <PrimaryButton brand='EXPORTER'
                  startIcon={<Add />}
                  onClick={() => {
                    setContractDetailDialogOpen(false);
                    setCreateShipmentDialogOpen(true);
                    if (selectedContractForDetail) {
                      const forex = forexStatuses.find(f => f.contractId === selectedContractForDetail.contractId);
                      setNewShipment({
                        ...newShipment,
                        contractId: selectedContractForDetail.contractId,
                      });
                      if (forex) {
                        applyContractToShipment(selectedContractForDetail, forex.exchangeRate);
                      }
                    }
                  }}
                >
                  Create Shipment
                </PrimaryButton>
              );
            } else {
              // Show info button to request LC instead
              return (
                <SecondaryButton brand='EXPORTER'
                  startIcon={<AccountBalance />}
                  onClick={() => {
                    // Close contract details dialog
                    setContractDetailDialogOpen(false);
                    
                    // Directly open LC request dialog with pre-filled data
                    if (selectedContractForDetail) {
                      setSelectedContractForLC(selectedContractForDetail);
                      setLcRequestForm({
                        advisingBank: profile?.bankName || '',
                        beneficiaryName: profile?.companyName || '',
                        expiryDays: '90',
                        amount: (selectedContractForDetail.totalValue || 0).toString(),
                        currency: selectedContractForDetail.currency || 'USD',
                        transportMode: 'SEA' as 'SEA' | 'AIR',
                        portOfLoading: 'Djibouti Port',
                        portOfDischarge: selectedContractForDetail.buyerCountry || '',
                        latestShipmentDays: '60',
                        partialShipment: false,
                        transhipment: true,
                        paymentTerms: 'Sight LC',
                        specialInstructions: '',
                      });
                      setLcRequestDialogOpen(true);
                    }
                  }}
                >
                  Request LC
                </SecondaryButton>
              );
            }
          }
          return null;
        })()}
      
  </>}
>
        {selectedContractForDetail && (
          <Box>
            {/* Status Banner */}
            <Alert 
              severity={selectedContractForDetail.status === 'REJECTED'
                ? 'error'
                : isContractApproved(selectedContractForDetail)
                  ? 'success'
                  : 'info'}
              icon={selectedContractForDetail.status === 'REJECTED' ? <Warning /> : <CheckCircle />}
              sx={{ mb: 3 }}
            >
              <Typography variant="body2" fontWeight={600}>
                Contract Status: {selectedContractForDetail.status}
              </Typography>
              <Typography variant="caption">
                {selectedContractForDetail.status === 'APPROVED' && (hasIssuedLC(selectedContractForDetail.contractId) ? 'Approved by ECTA - LC issued, ready for export' : 'Approved by ECTA - Ready for shipment creation')}
              </Typography>
              {selectedContractForDetail.status === 'REJECTED' && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight={600}>ECTA feedback</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {selectedContractForDetail.rejectionReason || 'No rejection reason was recorded. Contact ECTA for details.'}
                    </Typography>
                    {!hasActionableRejectionFeedback(selectedContractForDetail.rejectionReason) && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        ECTA's note does not identify which field to change or what value is required. Ask ECTA for a specific correction before registering a replacement; do not guess.
                      </Alert>
                    )}
                    {(selectedContractForDetail.rejectedBy || selectedContractForDetail.rejectionDate) && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {selectedContractForDetail.rejectedBy ? `Rejected by ${selectedContractForDetail.rejectedBy}` : ''}
                        {selectedContractForDetail.rejectedBy && selectedContractForDetail.rejectionDate ? ' · ' : ''}
                        {selectedContractForDetail.rejectionDate
                          ? new Date(selectedContractForDetail.rejectionDate).toLocaleDateString()
                          : ''}
                      </Typography>
                    )}
                    <DangerButton brand='EXPORTER'
                      size="small"
                      sx={{ mt: 1.5 }}
                      onClick={() => handleCorrectRejectedContract(selectedContractForDetail)}
                    >
                      Correct details and register replacement
                    </DangerButton>
                </Box>
              )}
            </Alert>

            {/* Main Contract Information */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary" gutterBottom>
                  Buyer Information
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Business fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Buyer Name</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedContractForDetail.buyerName}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FlightTakeoff fontSize="small" color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Destination</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedContractForDetail.buyerCountry}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Coffee & Quantity Details */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary" gutterBottom>
                  Coffee Details
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Category fontSize="small" sx={{ color: '#8B4513' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Coffee Type</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedContractForDetail.coffeeType}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Assessment fontSize="small" color="secondary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Quantity</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {Number(selectedContractForDetail.quantity).toLocaleString()} kg
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocalShipping fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Number of Bags</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {Math.ceil(selectedContractForDetail.quantity / 60)} bags (60kg each)
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card variant="outlined" sx={{ mb: 2, bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary" gutterBottom>
                  Financial Information
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Price per kg</Typography>
                      <Typography variant="h6" color="success.main" fontWeight={700}>
                        ${selectedContractForDetail.pricePerKg.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Currency</Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {selectedContractForDetail.currency}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Contract Value</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={700}>
                        ${Number(selectedContractForDetail.totalValue).toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Timeline & Dates */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary" gutterBottom>
                  Timeline & References
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedContractForDetail.registrationDate 
                        ? new Date(selectedContractForDetail.registrationDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">NBE Reference Number</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedContractForDetail.nbeReferenceNumber || 'Pending'}
                    </Typography>
                  </Grid>
                  {selectedContractForDetail.supersedesContractId && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Replacement for rejected contract</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedContractForDetail.supersedesContractId}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Signed Documents Section - Real documents with signatures */}
            {isContractApproved(selectedContractForDetail) && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUser color="success" />
                      <Typography variant="overline" color="text.secondary">
                        Cryptographically Signed Documents
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Blockchain Verification - Component handles all messaging */}
                  <Typography variant="h6" gutterBottom sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedUser color="primary" />
                    Cryptographic Signatures & Blockchain Verification
                  </Typography>
                  
                  <BlockchainSignatureVerification
                    entityType="CONTRACT"
                    entityId={selectedContractForDetail.contractId}
                  />
                  
                  <Divider sx={{ my: 3 }} />
                  
                  {/* Document Management Panel for Downloads */}
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description />
                    Contract Documents
                  </Typography>
                  
                  <DocumentManagementPanel
                    entityType="CONTRACT"
                    entityId={selectedContractForDetail.contractId}
                    title=""
                    allowUpload={false}
                    allowSign={false}
                    showSignatureTracker={false}
                  />
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Alert severity="info" icon={<Description />}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      How to Verify Authenticity
                    </Typography>
                    <Typography variant="caption" component="div">
                      • Expand each signature accordion above to see X.509 certificate details<br/>
                      • Copy blockchain transaction ID for independent verification<br/>
                      • Download PDFs below to see visual signature stamps<br/>
                      • Verify certificate fingerprint matches signer's public key
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Next Steps - Dynamic based on forex status */}
            <Alert 
              severity={(() => {
                if (selectedContractForDetail) {
                  const hasForex = forexStatuses.some(f => 
                    f.contractId === selectedContractForDetail.contractId && 
                    f.status === 'ALLOCATED'
                  );
                  return hasForex ? 'success' : 'info';
                }
                return 'info';
              })()} 
              icon={<Assignment />} 
              sx={{ mt: 3 }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Next Steps
              </Typography>
              <Typography variant="caption">
                {(() => {
                  if (selectedContractForDetail) {
                    const hasForex = forexStatuses.some(f => 
                      f.contractId === selectedContractForDetail.contractId && 
                      f.status === 'ALLOCATED'
                    );
                    
                    if (hasForex) {
                      return (
                        <>
                          ✅ <strong>Ready to proceed!</strong> Click the <strong>"Create Shipment"</strong> button below to register shipment details and initiate the export workflow (quality inspection → export permit → customs clearance).
                        </>
                      );
                    } else {
                      return (
                        <>
                          ⏳ <strong>LC Required First:</strong> Go to <strong>"My Contracts"</strong> tab and click <strong>"Request LC"</strong> button. After the bank issues the LC and allocates forex, you can return to create a shipment.
                        </>
                      );
                    }
                  }
                  return 'Review contract details above and proceed to next steps.';
                })()}
              </Typography>
            </Alert>
          </Box>
        )}
      </PortalDialog>

    {/* Customs Declaration Dialog */}
    <PortalDialog brand='EXPORTER'
      open={customsDeclarationDialogOpen}
      onClose={() => {
        setCustomsDeclarationDialogOpen(false);
        setSelectedShipmentForCustoms(null);
        setCustomsDocuments([]);
      }}
      maxWidth="md"
    
  icon={<Description sx={{ color: '#2196F3' }} />}
  title="Submit Customs Declaration"
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => {
          setCustomsDeclarationDialogOpen(false);
          setSelectedShipmentForCustoms(null);
          setCustomsDocuments([]);
        }}>
          Cancel
        </GhostButton>
        <AnimatedButton
          variant="contained"
          brandColor={brandPrimary}
          disabled={isSubmittingCustoms || customsDocuments.some((document) => document.status !== 'success')}
          onClick={handleSubmitCustomsDeclaration}
        >
          {isSubmittingCustoms ? 'Submitting...' : 'Submit to ECC'}
        </AnimatedButton>
      
  </>}
>
        {selectedShipmentForCustoms && (
          <>
            {/* Previous Steps Summary - Professional Form View */}
            <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#f0f7ff', border: '2px solid #2196F3' }}>
              {(() => {
                const contract = contracts.find(c => c.contractId === selectedShipmentForCustoms.contractId);
                return (
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Contract ID"
                        value={contract?.contractId || 'N/A'}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Destination"
                        value={contract?.buyerCountry || 'N/A'}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Coffee Type"
                        value={contract?.coffeeType || selectedShipmentForCustoms.grade || 'N/A'}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Quantity (kg)"
                        value={contract?.quantity ? Number(contract.quantity).toLocaleString() : (selectedShipmentForCustoms.quantity ? Number(selectedShipmentForCustoms.quantity).toLocaleString() : '0')}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Price per Kg"
                        value={contract?.pricePerKg ? `$${contract.pricePerKg}/kg (${contract?.currency || 'USD'})` : '—'}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Payment Method"
                        value="LC"
                        disabled
                        size="small"
                        helperText="Letter of Credit"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Incoterm"
                        value="FOB"
                        disabled
                        size="small"
                        helperText="Free on Board"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Contract Status"
                        value="Approved"
                        disabled
                        size="small"
                        InputProps={{
                          startAdornment: <CheckCircle fontSize="small" sx={{ color: '#4CAF50', mr: 1 }} />
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Shipment ID"
                        value={selectedShipmentForCustoms.shipmentId}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Origin"
                        value="Yirgacheffe"
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Grade"
                        value={selectedShipmentForCustoms.grade || 'Grade 1'}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="ICO Number"
                        value="ET-2105-34593"
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        label="Channel"
                        value="Direct Export"
                        disabled
                        size="small"
                      />
                    </Grid>
                  </Grid>
                );
              })()}
            </Paper>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Required Documents Checklist
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">Commercial Invoice (showing FOB value, buyer details)</Typography>
                  <Typography variant="body2">Packing List (container/bag details, weight)</Typography>
                  <Typography variant="body2">ECTA Export Permit (issued after quality approval)</Typography>
                  <Typography variant="body2">ICO Certificate of Origin (for ICO-certified coffee)</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">Bill of Lading or Waybill (if already issued)</Typography>
                  <Typography variant="body2">Phytosanitary Certificate (plant health clearance)</Typography>
                  <Typography variant="body2">EUDR Due Diligence Statement (for EU destinations only)</Typography>
                </Grid>
              </Grid>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                All documents must be uploaded to the system before final submission
              </Typography>
            </Alert>

            {/* Upload each document from its checklist row. Files are linked to this shipment immediately. */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Upload />
                Supporting Documents
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose each document beside its name. It uploads to this shipment as soon as you select it.
              </Typography>
              {[
                { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
                { value: 'PACKING_LIST', label: 'Packing List' },
                { value: 'EXPORT_PERMIT', label: 'ECTA Export Permit' },
                { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin' },
                { value: 'BILL_OF_LADING', label: 'Bill of Lading / Waybill' },
                { value: 'PHYTOSANITARY_CERTIFICATE', label: 'Phytosanitary Certificate' },
                { value: 'EUDR_STATEMENT', label: 'EUDR Due Diligence Statement' },
              ].map((documentType) => {
                const documentsForType = customsDocuments.filter((doc) => doc.documentType === documentType.value);
                return (
                  <Box key={documentType.value} sx={{ p: 1.5, mb: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="body2" fontWeight={600}>{documentType.label}</Typography>
                      <SecondaryButton brand='EXPORTER' component="label" size="small" startIcon={<AttachFile />}>
                        Upload
                        <input
                          hidden
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => handleCustomsDocumentSelect(documentType.value, event)}
                        />
                      </SecondaryButton>
                    </Box>
                    {documentsForType.map((doc) => (
                      <Box key={doc.localId} sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Description fontSize="small" sx={{ color: doc.status === 'success' ? 'success.main' : doc.status === 'error' ? 'error.main' : 'text.disabled' }} />
                        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.name} · {(doc.size / 1024).toFixed(1)} KB
                        </Typography>
                        <Chip
                          size="small"
                          label={doc.status === 'success' ? 'Uploaded' : doc.status === 'error' ? 'Upload failed' : 'Uploading…'}
                          color={doc.status === 'success' ? 'success' : doc.status === 'error' ? 'error' : 'default'}
                        />
                        {doc.status === 'error' && (
                          <Tooltip title={doc.error || 'Remove this failed upload and try again'}>
                            <IconButton size="small" color="error" onClick={() => setCustomsDocuments((current) => current.filter((item) => item.localId !== doc.localId))}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Paper>
          </>
        )}
      </PortalDialog>

    {/* Book Shipping Dialog */}
    <PortalDialog brand='EXPORTER'
      open={bookShippingDialogOpen}
      onClose={() => {
        setBookShippingDialogOpen(false);
        setSelectedShipmentForShipping(null);
      }}
      maxWidth="md"
    
  icon={<LocalShipping />}
  title="🚢 Book Shipping & Container"
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => {
          setBookShippingDialogOpen(false);
          setSelectedShipmentForShipping(null);
        }}>
          Cancel
        </GhostButton>
        <AnimatedButton
          variant="contained"
          brandColor={brandPrimary}
          disabled={isBookingShipping || !shippingForm.portOfDischarge || !shippingForm.estimatedDeparture}
          onClick={handleBookShipping}
        >
          {isBookingShipping ? 'Booking...' : 'Confirm Booking'}
        </AnimatedButton>
      
  </>}
>
        {selectedShipmentForShipping && (
          <>
            <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Shipping & Logistics Booking — Step 10 of 11
              </Typography>
              <Typography variant="body2">
                Shipment: <strong>{selectedShipmentForShipping.shipmentId}</strong> • Quantity: <strong>{selectedShipmentForShipping.quantity ? Number(selectedShipmentForShipping.quantity).toLocaleString() : '0'} kg</strong>
                <br />
                Delivered — post-delivery freight booking. Booking sets the shipment to FREIGHT_BOOKED, which has no on-chain exit to land transport.
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
                <PortalField
                  fullWidth
                  label="Port of Loading"
                  value={shippingForm.portOfLoading}
                  onChange={(e) => setShippingForm({ ...shippingForm, portOfLoading: e.target.value })}
                  helperText="Ethiopian coffee typically ships from Djibouti"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PortalField
                  fullWidth
                  required
                  label="Port of Discharge"
                  value={shippingForm.portOfDischarge}
                  onChange={(e) => setShippingForm({ ...shippingForm, portOfDischarge: e.target.value })}
                  helperText="Destination port in buyer's country"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PortalField
                  fullWidth
                  label="Vessel Name (Optional)"
                  value={shippingForm.vesselName}
                  onChange={(e) => setShippingForm({ ...shippingForm, vesselName: e.target.value })}
                  helperText="Will be assigned by shipping line if not specified"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PortalField
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
                <PortalField
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
                1. Booking recorded against this delivered shipment
                <br />
                2. Bill of Lading (B/L) issued by the shipping line as post-delivery paperwork
                <br />
                3. Shipment status becomes FREIGHT_BOOKED — it cannot advance to land transport on-chain
                <br />
                4. Proceed to Payment Settlement
              </Typography>
            </Alert>
          </>
        )}
      </PortalDialog>

    {/* Payment Settlement Dialog */}
    <PortalDialog brand='EXPORTER'
      open={paymentSettlementDialogOpen}
      onClose={() => {
        setPaymentSettlementDialogOpen(false);
        setSelectedShipmentForPayment(null);
      }}
      maxWidth="md"
    
  icon={<AttachMoney />}
  title="💰 Initiate Payment Settlement"
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => {
          setPaymentSettlementDialogOpen(false);
          setSelectedShipmentForPayment(null);
        }}>
          Cancel
        </GhostButton>
        <AnimatedButton
          variant="contained"
          brandColor={brandPrimary}
          disabled={
            isInitiatingPayment || 
            !paymentForm.beneficiaryName || 
            !paymentForm.beneficiaryAccount ||
            !paymentForm.beneficiaryBank ||
            !paymentForm.beneficiaryBankBIC ||
            !forexStatuses.some((fx) => fx.contractId === selectedShipmentForPayment?.contractId && ['ALLOCATED', 'UTILIZED'].includes(String(fx.status).toUpperCase()) && Number(fx.exchangeRate) > 0 && Number.isFinite(Number(fx.retentionRate)))
          }
          onClick={handleInitiatePayment}
        >
          {isInitiatingPayment ? 'Processing...' : 'Submit to Bank'}
        </AnimatedButton>
      
  </>}
>
        {selectedShipmentForPayment && (
          <>
            <Alert severity="success" sx={{ mb: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Final Step — Payment Settlement (Step 11 of 11)
              </Typography>
              <Typography variant="body2">
                Shipment: <strong>{selectedShipmentForPayment.shipmentId}</strong> • Status: <strong>{selectedShipmentForPayment.status}</strong>
                <br />
                {selectedShipmentForPayment.status === 'DELIVERED'
                  ? 'Coffee successfully delivered — ready to receive payment'
                  : 'Payment settlement can be initiated once the LC is issued and forex is allocated (see the checks below)'}
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

              if (!selectedForex || Number(selectedForex.exchangeRate) <= 0 || !Number.isFinite(Number(selectedForex.retentionRate))) {
                return (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No ledger-backed forex rate and retention record is available for this contract. The bank must complete the forex allocation before payment can be submitted.
                  </Alert>
                );
              }

              const amountUSD = selectedContract ? (selectedShipmentForPayment.quantity * selectedContract.pricePerKg) : 0;
              const exchangeRate = Number(selectedForex.exchangeRate);
              const retentionRate = Number(selectedForex.retentionRate);
              const amountETB = amountUSD * exchangeRate;
              const retainedETB = (amountETB * retentionRate) / 100;
              // Chaincode settle math (payment.go): the exporter receives
              // the CONVERTED amount — amountETB − retainedETB — not the
              // retained portion, which NBE holds in FCY.
              const receivedETB = amountETB - retainedETB;

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
                      NBE Retention Rate: <strong>{retentionRate}%</strong> — retained in FCY: <strong>{retainedETB.toLocaleString()} ETB</strong>
                      <br />
                      <strong>You will receive: {receivedETB.toLocaleString()} ETB</strong>
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
                      <PortalField
                        fullWidth
                        label="LC Reference"
                        value={selectedLC?.lcId || ''}
                        disabled
                        helperText="Linked Letter of Credit"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        required
                        label="Beneficiary Name"
                        value={paymentForm.beneficiaryName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryName: e.target.value })}
                        helperText="Your company name (as registered)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        required
                        label="Beneficiary Account Number"
                        value={paymentForm.beneficiaryAccount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryAccount: e.target.value })}
                        helperText="Your bank account for receiving payment"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
                        fullWidth
                        required
                        label="Beneficiary Bank"
                        value={paymentForm.beneficiaryBank}
                        onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryBank: e.target.value })}
                        helperText="Your bank (advising bank)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <PortalField
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
                      <PortalField
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
      </PortalDialog>

    <NotificationDialog
      open={notification.open}
      onClose={closeNotification}
      type={notification.type}
      title={notification.title}
      message={notification.message}
      details={notification.details}
    />

    {/* Create Shipment Dialog */}
    <PortalDialog brand='EXPORTER' 
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
    
  icon={<LocalShipping />}
  title="Create New Shipment"
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => setCreateShipmentDialogOpen(false)}>
          Cancel
        </GhostButton>
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
            (shipmentFieldValidation.bondReferenceRequired && !newShipment.bondReference) ||
            // DUPLICATE PREVENTION: Disable if shipment already exists for this contract
            Boolean(newShipment.contractId && shipments.some(s => s.contractId === newShipment.contractId))
          }
          brandColor={brandPrimary}
        >
          {isCreatingShipment ? 'Creating...' : 'Create Shipment'}
        </AnimatedButton>
      
  </>}
>
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

        {/* Duplicate warning for contracts that already have shipments */}
        {newShipment.contractId && (() => {
          const existingShipment = shipments.find(s => s.contractId === newShipment.contractId);
          if (!existingShipment) return null;
          return (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>⚠️ Shipment Already Exists</strong>
              <br />
              This contract already has a registered shipment: <strong>{existingShipment.shipmentId}</strong>
              <br />
              Status: <strong>{existingShipment.status}</strong>
              <br />
              <em>Each contract can only have one shipment. Please select a different contract or view the existing shipment in the Shipments tab.</em>
            </Alert>
          );
        })()}

        {/* Warning when no contracts with forex available */}
        {(() => {
          const contractsWithForex = contracts
            .filter(c => isContractApproved(c))
            .filter(c => forexStatuses.some(f => f.contractId === c.contractId && f.status === 'ALLOCATED'));
          
          if (contractsWithForex.length > 0) return null;
          
          return (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                ⚠️ No Contracts with Forex Allocation Available
              </Typography>
              <Typography variant="body2">
                To create a shipment, you must first request a Letter of Credit (LC) for your approved contract. 
                The bank will issue the LC and allocate forex per NBE export regulations.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Next Steps:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                1. Go to <strong>"My Contracts"</strong> tab<br />
                2. Find your approved contract<br />
                3. Click <strong>"Request LC"</strong> button<br />
                4. After bank processes your LC, return here to create shipment
              </Typography>
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
                  .filter(c => isContractApproved(c))
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
            <PortalField
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
            <PortalField
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
            <PortalField
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
              <PortalField
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
              <PortalField
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
                    // Leg2 #16: no auto-generated lot number on ECX
                    // channel select (see applyContractToShipment).
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
            <PortalField
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
            {/* Show existing contract documents with DocumentManagementPanel */}
            {(() => {
              const selectedContract = contracts.find(c => c.contractId === newShipment.contractId);
              if (selectedContract && selectedContract.contractId) {
                return (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description /> Contract Documents (From Blockchain)
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                      <DocumentManagementPanel
                        entityType="CONTRACT"
                        entityId={selectedContract.contractId}
                        title=""
                        allowUpload={false}
                        allowSign={false}
                        showSignatureTracker={false}
                      />
                    </Paper>
                  </Box>
                );
              }
              return null;
            })()}
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>✓ Contract Documents Loaded from Blockchain</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                All contract documents are automatically attached to this shipment. Additional shipping documents 
                (B/L, Packing List, Certificates) will be added after shipment registration.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </PortalDialog>

    {/* Audit Trail Viewer */}
    {showAuditTrail && auditEntityType && (
      <AuditTrailViewer
        open={showAuditTrail}
        entityType={auditEntityType as 'EXPORTER' | 'CONTRACT' | 'SHIPMENT' | 'LC' | 'PAYMENT'}
        entityId={auditEntityId}
        onClose={() => setShowAuditTrail(false)}
      />
    )}

    {/* Post-Delivery Workflow Dialog */}
    <PortalDialog brand='EXPORTER'
      open={postDeliveryDialogOpen}
      onClose={() => setPostDeliveryDialogOpen(false)}
      maxWidth="md"
    
  title="Post-Delivery Workflow Status"
  subtitle={selectedShipmentForPostDelivery ? `Shipment: ${selectedShipmentForPostDelivery.shipmentId}` : undefined}
  actions={<>
        <GhostButton brand='EXPORTER' onClick={() => setPostDeliveryDialogOpen(false)}>Close</GhostButton>
      
  </>}
>
        {selectedShipmentForPostDelivery && (
          <PostDeliveryWorkflowPanel
            shipmentId={selectedShipmentForPostDelivery.shipmentId}
            userRole="EXPORTER"
            onRefresh={() => {
              loadExporterData();
            }}
          />
        )}
      </PortalDialog>

    {/* Shipment Detail Dialog */}
    <PortalDialog brand='EXPORTER'
      open={shipmentDetailDialogOpen}
      onClose={() => setShipmentDetailDialogOpen(false)}
      maxWidth="md"
    
  title="📦 Shipment Details"
  subtitle={selectedShipmentForDetail ? `Shipment ID: ${selectedShipmentForDetail.shipmentId}` : undefined}
  actions={<>
        {selectedShipmentForDetail?._isPending ? (
          // PENDING shipment - show "Register Shipment" button
          <>
            <GhostButton brand='EXPORTER' onClick={() => setShipmentDetailDialogOpen(false)}>Cancel</GhostButton>
            <PrimaryButton brand='EXPORTER'
              startIcon={<LocalShipping />}
              onClick={() => {
                setShipmentDetailDialogOpen(false);
                // Pre-fill the contract in shipment dialog
                const contract = contracts.find(c => c.contractId === selectedShipmentForDetail.contractId);
                if (contract) {
                  const forex = forexStatuses.find(f => f.contractId === contract.contractId);
                  applyContractToShipment(contract, forex?.exchangeRate || 0);
                }
                setCreateShipmentDialogOpen(true);
              }}
            >
              Register Shipment Now
            </PrimaryButton>
          </>
        ) : (
          // REAL shipment - show audit trail button
          <>
            <GhostButton brand='EXPORTER' onClick={() => setShipmentDetailDialogOpen(false)}>Close</GhostButton>
            {canBookFreight(selectedShipmentForDetail) && (
              <PrimaryButton brand='EXPORTER'
                size="small"
                startIcon={<LocalShipping />}
                onClick={() => {
                  setSelectedShipmentForShipping(selectedShipmentForDetail);
                  setShipmentDetailDialogOpen(false);
                  setBookShippingDialogOpen(true);
                }}
              >
                Book Freight
              </PrimaryButton>
            )}
            {canInitiatePayment(selectedShipmentForDetail) && (
              <PrimaryButton brand='EXPORTER'
                size="small"
                startIcon={<AttachMoney />}
                onClick={() => {
                  setSelectedShipmentForPayment(selectedShipmentForDetail);
                  setShipmentDetailDialogOpen(false);
                  setPaymentSettlementDialogOpen(true);
                }}
              >
                Initiate Payment
              </PrimaryButton>
            )}
            {canSubmitLCDocuments(selectedShipmentForDetail) && (
              <SecondaryButton brand='EXPORTER'
                size="small"
                startIcon={<Description />}
                disabled={isSubmittingLCDocuments}
                onClick={() => handleSubmitLCDocumentsForShipment(selectedShipmentForDetail)}
              >
                Submit LC Documents
              </SecondaryButton>
            )}
            <SecondaryButton brand='EXPORTER'
              size="small"
              startIcon={<Assignment />}
              onClick={() => {
                setAuditEntityType('SHIPMENT');
                setAuditEntityId(selectedShipmentForDetail?.shipmentId || '');
                setShowAuditTrail(true);
              }}
            >
              View Audit Trail
            </SecondaryButton>
          </>
        )}
      
  </>}
>
        {selectedShipmentForDetail && (() => {
          const contract = contracts.find(c => c.contractId === selectedShipmentForDetail.contractId);
          return (
            <Box>
              {/* Shipment Information - SHOW IMMEDIATELY */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Shipment Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Shipment ID</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedShipmentForDetail.shipmentId}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Contract ID</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedShipmentForDetail.contractId}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Buyer</Typography>
                    <Typography variant="body1" fontWeight={600}>{contract?.buyerName || selectedShipmentForDetail.buyerId}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Destination</Typography>
                    <Typography variant="body1" fontWeight={600}>{contract?.buyerCountry || 'Unknown'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Quantity</Typography>
                    <Typography variant="body1" fontWeight={600}>{Number(selectedShipmentForDetail.quantity || 0).toLocaleString()} kg</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Grade</Typography>
                    <Typography variant="body1" fontWeight={600}>{selectedShipmentForDetail.grade || 'Grade 1-2'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Transport Mode</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedShipmentForDetail.transportMode || selectedShipmentForDetail.TransportMode || 'SEA'} Freight
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <StatusChip status={selectedShipmentForDetail.status} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Current Location</Typography>
                    <Typography variant="body1" fontWeight={600} color="primary">
                      {selectedShipmentForDetail.currentLocation || selectedShipmentForDetail.CurrentLocation || 'Warehouse'}
                    </Typography>
                  </Grid>

                  {/* 0.12: terminal-ish freight states — real status, note, no fake onward button */}
                  {selectedShipmentForDetail.status === 'FREIGHT_BOOKED' && (
                    <Grid item xs={12}>
                      <Alert severity="warning">
                        Freight booked. This status has no on-chain exit to land transport — booking is post-delivery paperwork only.
                      </Alert>
                    </Grid>
                  )}
                  {(selectedShipmentForDetail.status === 'LOADED' || selectedShipmentForDetail.status === 'ARRIVED') && (
                    <Grid item xs={12}>
                      <Alert severity="warning">
                        Recorded as post-delivery paperwork (bill of lading / airway bill sets LOADED). DepartFromPort requires VESSEL_LOADED, so this row has no onward chain step.
                      </Alert>
                    </Grid>
                  )}
                  {getPaymentForShipment(selectedShipmentForDetail.shipmentId) && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        Payment {getPaymentForShipment(selectedShipmentForDetail.shipmentId)?.paymentId} is {getPaymentForShipment(selectedShipmentForDetail.shipmentId)?.status} — settlement continues in the bank flow.
                      </Alert>
                    </Grid>
                  )}

                  {/* Additional Details for REAL shipments */}
                  {!selectedShipmentForDetail._isPending && (
                    <>
                      {selectedShipmentForDetail.origin && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">Origin</Typography>
                          <Typography variant="body1">{selectedShipmentForDetail.origin}</Typography>
                        </Grid>
                      )}
                      {selectedShipmentForDetail.icoNumber && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">ICO Number</Typography>
                          <Typography variant="body1">{selectedShipmentForDetail.icoNumber}</Typography>
                        </Grid>
                      )}
                      {selectedShipmentForDetail.forexRate && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">Forex Rate</Typography>
                          <Typography variant="body1">{selectedShipmentForDetail.forexRate} ETB/USD</Typography>
                        </Grid>
                      )}
                      {selectedShipmentForDetail.valueUsd && (
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">Value (USD)</Typography>
                          <Typography variant="body1" fontWeight={600}>${Number(selectedShipmentForDetail.valueUsd).toLocaleString()}</Typography>
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </Paper>

              {/* Logistics Details - only for REAL shipments */}
              {!selectedShipmentForDetail._isPending && selectedShipmentForDetail.vesselName && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9fafb', mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Logistics & Shipping Details
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedShipmentForDetail.vesselName && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Vessel Name</Typography>
                        <Typography variant="body1" fontWeight={600}>{selectedShipmentForDetail.vesselName}</Typography>
                      </Grid>
                    )}
                    {selectedShipmentForDetail.voyageNumber && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Voyage Number</Typography>
                        <Typography variant="body1">{selectedShipmentForDetail.voyageNumber}</Typography>
                      </Grid>
                    )}
                    {selectedShipmentForDetail.containerNumber && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Container Number</Typography>
                        <Typography variant="body1">{selectedShipmentForDetail.containerNumber}</Typography>
                      </Grid>
                    )}
                    {selectedShipmentForDetail.billOfLadingNo && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Bill of Lading</Typography>
                        <Typography variant="body1">{selectedShipmentForDetail.billOfLadingNo}</Typography>
                      </Grid>
                    )}
                    {selectedShipmentForDetail.trackingNumber && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Tracking Number</Typography>
                        <Typography variant="body1">{selectedShipmentForDetail.trackingNumber}</Typography>
                      </Grid>
                    )}
                    {selectedShipmentForDetail.departurePort && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Departure Port</Typography>
                        <Typography variant="body1">{selectedShipmentForDetail.departurePort}</Typography>
                      </Grid>
                    )}
                    {selectedShipmentForDetail.destinationPort && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Destination Port</Typography>
                        <Typography variant="body1">{selectedShipmentForDetail.destinationPort}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Real blockchain verification with COMPLETE HISTORY */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0f9ff', border: '1px solid #0288d1', mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#0277bd' }}>
                  <CheckCircle sx={{ fontSize: 20 }} /> Complete Blockchain History
                </Typography>
                
                {selectedShipmentForDetail._isPending ? (
                  // This is a pending shipment (forex allocated but not created yet)
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Pending Shipment:</strong> This contract has forex allocated but the shipment hasn't been created on blockchain yet.
                      Once created, all transactions will be recorded here with complete immutable history.
                    </Typography>
                  </Alert>
                ) : (
                  // This is a REAL shipment - show complete blockchain audit trail
                  <Box>
                    {/* Current State */}
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="primary">Current State on Blockchain:</Typography>
                      <Grid container spacing={1} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Blockchain ID:</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {selectedShipmentForDetail._id || selectedShipmentForDetail.shipmentId}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Revisions:</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selectedShipmentForDetail._rev ? selectedShipmentForDetail._rev.split('-')[0] : '1'} transactions
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Status:</Typography>
                          <StatusChip status={selectedShipmentForDetail.status} size="small" />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Last Update:</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {selectedShipmentForDetail.updatedAt ? new Date(selectedShipmentForDetail.updatedAt).toLocaleString() : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Transaction History Timeline */}
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                      Transaction History (Immutable Blockchain Records):
                    </Typography>
                    
                    <Box sx={{ pl: 2, borderLeft: '2px solid #2196f3' }}>
                      {/* Creation Transaction */}
                      <Box sx={{ mb: 2, position: 'relative' }}>
                        <Box sx={{ position: 'absolute', left: -9, top: 0, width: 14, height: 14, borderRadius: '50%', bgcolor: '#4caf50', border: '2px solid white' }} />
                        <Typography variant="caption" fontWeight={700} color="success.main">
                          ✓ Shipment Created
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {selectedShipmentForDetail.createdAt ? new Date(selectedShipmentForDetail.createdAt).toLocaleString() : 'Unknown'}
                        </Typography>
                        <Box sx={{ mt: 0.5, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, fontSize: '0.7rem' }}>
                          <Typography variant="caption" display="block">Initial Values:</Typography>
                          <Typography variant="caption" display="block">• Quantity: {selectedShipmentForDetail.quantity} kg</Typography>
                          <Typography variant="caption" display="block">• Grade: {selectedShipmentForDetail.grade}</Typography>
                          <Typography variant="caption" display="block">• Contract: {selectedShipmentForDetail.contractId}</Typography>
                          {selectedShipmentForDetail.createdByMsp && (
                            <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                              • Organization: {selectedShipmentForDetail.createdByMsp}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Status Updates - derived from revision count */}
                      {selectedShipmentForDetail._rev && parseInt(selectedShipmentForDetail._rev.split('-')[0]) > 1 && (
                        <>
                          {Array.from({ length: parseInt(selectedShipmentForDetail._rev.split('-')[0]) - 1 }, (_, i) => i + 1).map((updateNum) => (
                            <Box key={updateNum} sx={{ mb: 2, position: 'relative' }}>
                              <Box sx={{ position: 'absolute', left: -9, top: 0, width: 14, height: 14, borderRadius: '50%', bgcolor: '#2196f3', border: '2px solid white' }} />
                              <Typography variant="caption" fontWeight={700} color="primary">
                                ✓ Update #{updateNum}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                Blockchain transaction recorded
                              </Typography>
                              <Box sx={{ mt: 0.5, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, fontSize: '0.7rem' }}>
                                <Typography variant="caption">Status or field updated on blockchain</Typography>
                              </Box>
                            </Box>
                          ))}
                        </>
                      )}

                      {/* Current Status */}
                      <Box sx={{ mb: 1, position: 'relative' }}>
                        <Box sx={{ position: 'absolute', left: -9, top: 0, width: 14, height: 14, borderRadius: '50%', bgcolor: '#ff9800', border: '2px solid white' }} />
                        <Typography variant="caption" fontWeight={700} color="warning.main">
                          ⚡ Current Status
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {selectedShipmentForDetail.updatedAt ? new Date(selectedShipmentForDetail.updatedAt).toLocaleString() : 'Now'}
                        </Typography>
                        <Box sx={{ mt: 0.5, p: 1, bgcolor: '#fff3e0', borderRadius: 1, fontSize: '0.7rem' }}>
                          <Typography variant="caption" display="block">Current State: {selectedShipmentForDetail.status}</Typography>
                          <Typography variant="caption" display="block">Location: {selectedShipmentForDetail.currentLocation || 'In Transit'}</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Blockchain Guarantees */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="success.main" display="block" gutterBottom>
                        🔒 Blockchain Guarantees:
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                        Ledger entries show their Fabric transaction ID, block, validation code, creator, and endorsements when available.
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                        “Verified” requires a valid block entry, valid transaction signatures, and certificates trusted by configured MSP roots.
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                        A transaction ID confirms a ledger reference; it does not alone prove signature or certificate validity.
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                        Ledger history and details are available subject to channel membership and application permissions.
                      </Typography>
                    </Box>

                    {/* Button to see DETAILED audit trail with all field changes */}
                    <Box sx={{ mt: 2 }}>
                      <PrimaryButton brand='EXPORTER'
                        size="small"
                        startIcon={<Assignment />}
                        onClick={() => {
                          setAuditEntityType('SHIPMENT');
                          setAuditEntityId(selectedShipmentForDetail.shipmentId);
                          setShowAuditTrail(true);
                        }}
                        fullWidth
                      >
                        View Detailed Audit Trail (Field-Level Changes)
                      </PrimaryButton>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Box>
          );
        })()}
      </PortalDialog>
    </ThemeProvider>
  );
};

export default ExporterPortal;
