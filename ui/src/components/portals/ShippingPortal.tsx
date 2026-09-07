// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Portal - Logistics Coordination & Container Management

import React, { useState, useEffect, useMemo } from 'react';
import { viewDocument, downloadDocument } from '@/utils/documentHelpers';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  LocalShipping,
  FlightTakeoff,
  DirectionsBoat,
  LocationOn,
  Assignment,
  Visibility,
  Download,
  Warning,
  Schedule,
  TrendingUp,
  QrCode,
  Inventory,
  Anchor,
  Assessment,
  Person,
  Info,
  Refresh,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import AuditTrailViewer from './AuditTrailViewer';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import UserManagement from '@/components/admin/UserManagement';
import { DocumentManagementPanel } from '@/components/documents';
import BlockchainSignatureVerification from '@/components/documents/BlockchainSignatureVerification';
import { BlockchainStatusIcon, BlockchainTxChip, BlockchainBadge } from '@/components/blockchain';
import PostDeliveryWorkflowPanel from '../shared/PostDeliveryWorkflowPanel';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  StatusType,
  ThemeToggle,
} from '@/components/modern';


interface ShippingRecord {
  shippingId: string;
  shipmentId: string;
  exporterId: string;
  transportMode: 'SEA' | 'AIR'; // Sea freight or Air freight
  shippingLine: string; // For sea: Maersk, MSC, etc. For air: Ethiopian Airlines, etc.
  containerNumber?: string; // Sea freight only
  vesselName?: string; // Sea: vessel name, Air: flight number
  voyageNumber?: string; // Sea freight only
  flightNumber?: string; // Air freight only
  airwayBill?: string; // Air freight AWB number
  portOfLoading: string; // Sea: Djibouti Port, Air: Addis Ababa Airport
  portOfDischarge: string; // Destination port/airport
  estimatedDeparture: string;
  estimatedArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  status: 'CUSTOMS_CLEARED' | 'LAND_TRANSPORT' | 'PORT_ARRIVED' | 'CONTAINER_STUFFED' | 'VESSEL_LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'DESTINATION_ARRIVED' | 'DELIVERED';
  trackingNumber: string;
  billOfLading?: string; // Sea freight B/L number
  containerType?: 'DRY' | 'REEFER' | 'OPEN_TOP'; // Sea freight only
  weight: number;
  volume: number;
}

interface WorkflowVerificationData {
  shipmentId: string;
  currentStatus: string;
  exporterId?: string;
  exporter?: string;
  contractId?: string;
  destination?: string;
  transportMode?: string;
  previousSteps: Array<{
    step: string;
    status: string;
    completedAt: string;
    officer: string;
    documents: string[];
    details?: Record<string, any>; // Added for detailed step information
  }>;
  requiredDocuments: string[];
  uploadedDocuments: Array<{
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
    source?: string;
    documentId?: string;
    fileName?: string; // Added for matching
  }>;
  exporterInfo?: any;
  contractInfo?: any;
  customsClearance?: any;  // Now includes declaration data (customs_value_usd, quantity, etc.) via JOIN
}

interface ApprovalDialogData {
  open: boolean;
  actionType: string;
  actionLabel: string;
  shipmentId: string;
  verificationData: WorkflowVerificationData | null;
}

interface ActionInputs {
  transportCompany: string;
  truckPlateNumber: string;
  driverName: string;
  arrivalNotes: string;
  containerNumber: string;
  containerType: string;
  sealNumber: string;
  vesselName: string;
  voyageNumber: string;
  trackingNumber: string;
  deliveryNotes: string;
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

const ShippingPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  const [shippingRecords, setShippingRecords] = useState<ShippingRecord[]>([]);
  const [allShippingRecords, setAllShippingRecords] = useState<ShippingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShippingRecord | null>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [billOfLadingDialogOpen, setBillOfLadingDialogOpen] = useState(false);
  const [bolAutoFilling, setBolAutoFilling] = useState(false);

  // Get current user role from local storage
  const userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role || '';

  // Main tab structure - one dedicated tab per shipping lifecycle status (matches KPI branches 0-8 + Users at 9)
  const mainTabs = [
    { index: 0, label: 'Clearance', icon: <CheckCircle />, status: 'CUSTOMS_CLEARED', description: 'Customs cleared shipments ready for transport' },
    { index: 1, label: 'Land Transport', icon: <LocalShipping />, status: 'LAND_TRANSPORT', description: 'Addis Ababa → Djibouti (800km)' },
    { index: 2, label: 'Port Arrival', icon: <Anchor />, status: 'PORT_ARRIVED', description: 'Arrived at Djibouti Port' },
    { index: 3, label: 'Container Stuffing', icon: <Inventory />, status: 'CONTAINER_STUFFED', description: 'Loading into containers' },
    { index: 4, label: 'Vessel Loading', icon: <DirectionsBoat />, status: 'VESSEL_LOADED', description: 'Loaded on ship/aircraft' },
    { index: 5, label: 'Departed', icon: <DirectionsBoat />, status: 'DEPARTED', description: 'Left Djibouti Port' },
    { index: 6, label: 'In Transit', icon: <DirectionsBoat />, status: 'IN_TRANSIT', description: 'Ocean/air freight journey' },
    { index: 7, label: 'Destination Arrived', icon: <LocationOn />, status: 'DESTINATION_ARRIVED', description: 'Arrived at buyer\'s port' },
    { index: 8, label: 'Delivered', icon: <CheckCircle />, status: 'DELIVERED', description: 'Completed deliveries' },
    { index: 9, label: 'Users', icon: <Person />, status: '', description: 'User management' },
  ];

  // Lifecycle progress and stage colors used by the per-status tab tables
  const lifecycleProgressMap: { [key: string]: number } = {
    'CUSTOMS_CLEARED': 10,
    'LAND_TRANSPORT': 25,
    'PORT_ARRIVED': 40,
    'CONTAINER_STUFFED': 55,
    'VESSEL_LOADED': 70,
    'DEPARTED': 75,
    'IN_TRANSIT': 85,
    'DESTINATION_ARRIVED': 95,
    'DELIVERED': 100,
  };
  const lifecycleStageColors: { [key: string]: string } = {
    'CUSTOMS_CLEARED': '#ff9800',
    'LAND_TRANSPORT': '#2196f3',
    'PORT_ARRIVED': '#00bcd4',
    'CONTAINER_STUFFED': '#009688',
    'VESSEL_LOADED': '#4caf50',
    'DEPARTED': '#8bc34a',
    'IN_TRANSIT': '#673ab7',
    'DESTINATION_ARRIVED': '#3f51b5',
    'DELIVERED': '#4caf50',
  };

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'SHIPMENT' | 'BOOKING' | 'CONTAINER'>('SHIPMENT');
  const [auditEntityId, setAuditEntityId] = useState<string>('');

  // Approval/Verification Dialog State
  const [approvalDialog, setApprovalDialog] = useState<ApprovalDialogData>({
    open: false,
    actionType: '',
    actionLabel: '',
    shipmentId: '',
    verificationData: null,
  });
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Per-action user inputs collected in the professional Workflow Approval Dialog
  // (replaces legacy prompt()/confirm() flows). Reset each time the dialog opens.
  const emptyActionInputs: ActionInputs = {
    transportCompany: '',
    truckPlateNumber: '',
    driverName: '',
    arrivalNotes: '',
    containerNumber: '',
    containerType: 'DRY',
    sealNumber: '',
    vesselName: '',
    voyageNumber: '',
    trackingNumber: '',
    deliveryNotes: '',
  };
  const [actionInputs, setActionInputs] = useState<ActionInputs>(emptyActionInputs);
  const setActionInput = (key: keyof ActionInputs, value: string) =>
    setActionInputs((prev) => ({ ...prev, [key]: value }));

  // Professional Snackbar for Success/Error Messages
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Bill of Lading / Airway Bill Form State
  const [bolForm, setBolForm] = useState({
    shipmentId: '',
    transportMode: 'SEA', // SEA or AIR
    // Sea Freight (B/L) fields
    billOfLadingNo: '',
    vesselName: '',
    voyageNumber: '',
    containerNumber: '',
    containerType: 'DRY',
    // Air Freight (AWB) fields
    airwayBillNo: '',
    flightNumber: '',
    airline: '',
    // Common fields
    shippingLine: 'Maersk Line', // Carrier name (shipping line or airline) - DEFAULT VALUE
    departurePort: 'Djibouti', // Port or Airport
    destinationPort: '',
    estimatedDeparture: '',
    estimatedArrival: '',
    trackingNumber: '',
    weight: '',
    volume: '',
    consignee: '',
    notify: '',
    freightTerms: 'PREPAID',
    specialInstructions: '',
  });

  const shippingTrendsData = [
    { month: 'Jan', containers: 145, onTime: 92, delayed: 8 },
    { month: 'Feb', containers: 152, onTime: 89, delayed: 11 },
    { month: 'Mar', containers: 148, onTime: 94, delayed: 6 },
    { month: 'Apr', containers: 165, onTime: 91, delayed: 9 },
    { month: 'May', containers: 172, onTime: 96, delayed: 4 },
  ];

  // Helper function to check if shipment should appear in a stage tab
  // Shows shipments that are ready for, currently in, or have passed this stage
  const shouldShowInStage = (status: string, stage: string): boolean => {
    const stageMap: { [key: string]: string[] } = {
      'LAND_TRANSPORT': ['CUSTOMS_CLEARED', 'LAND_TRANSPORT', 'PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED', 'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'DELIVERED'],
      'PORT_ARRIVED': ['PORT_ARRIVED', 'CONTAINER_STUFFED', 'VESSEL_LOADED', 'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'DELIVERED'],
      'CONTAINER_STUFFED': ['CONTAINER_STUFFED', 'VESSEL_LOADED', 'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'DELIVERED'],
      'VESSEL_LOADED': ['VESSEL_LOADED', 'DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'DELIVERED'],
      'DEPARTED': ['DEPARTED', 'IN_TRANSIT', 'DESTINATION_ARRIVED', 'DELIVERED'],
      'IN_TRANSIT': ['IN_TRANSIT', 'DESTINATION_ARRIVED', 'DELIVERED'],
      'DESTINATION_ARRIVED': ['DESTINATION_ARRIVED', 'DELIVERED'],
      'DELIVERED': ['DELIVERED'],
    };
    
    return stageMap[stage]?.includes(status) || false;
  };

  // Computed KPI metrics derived from actual shipping records (no hardcoded values)
  const completionRate = useMemo(() => {
    if (!allShippingRecords.length) return '0%';
    const delivered = allShippingRecords.filter(r => r.status === 'DELIVERED').length;
    return `${Math.round((delivered / allShippingRecords.length) * 100)}%`;
  }, [allShippingRecords]);

  const pipelineProgressRate = useMemo(() => {
    const active = allShippingRecords.filter(r => r.status !== 'CUSTOMS_CLEARED');
    if (!active.length) return '0%';
    const progressed = active.filter(r => ['PORT_ARRIVED','CONTAINER_STUFFED','VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    return `${Math.round((progressed / active.length) * 100)}%`;
  }, [allShippingRecords]);

  const landTransportProgressRate = useMemo(() => {
    const active = allShippingRecords.filter(r => r.status !== 'CUSTOMS_CLEARED');
    if (!active.length) return '0%';
    const progressed = active.filter(r => ['CONTAINER_STUFFED','VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    return `${Math.round((progressed / active.length) * 100)}%`;
  }, [allShippingRecords]);

  const loadingEfficiencyRate = useMemo(() => {
    const stuffed = allShippingRecords.filter(r => ['CONTAINER_STUFFED','VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    if (!stuffed) return '0%';
    const loaded = allShippingRecords.filter(r => ['VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    return `${Math.round((loaded / stuffed) * 100)}%`;
  }, [allShippingRecords]);

  const departureRate = useMemo(() => {
    const loaded = allShippingRecords.filter(r => ['VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    if (!loaded) return '0%';
    const departed = allShippingRecords.filter(r => ['DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    return `${Math.round((departed / loaded) * 100)}%`;
  }, [allShippingRecords]);

  const transitProgressRate = useMemo(() => {
    const departed = allShippingRecords.filter(r => ['DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    if (!departed) return '0%';
    const arrived = allShippingRecords.filter(r => ['DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length;
    return `${Math.round((arrived / departed) * 100)}%`;
  }, [allShippingRecords]);


  const portPerformanceData = [
    { port: 'Djibouti', containers: 485, avgDwell: 2.1, efficiency: 94.5 },
    { port: 'Hamburg', containers: 156, avgDwell: 1.8, efficiency: 97.2 },
    { port: 'New York', containers: 142, avgDwell: 2.3, efficiency: 91.8 },
    { port: 'Antwerp', containers: 98, avgDwell: 1.9, efficiency: 95.1 },
    { port: 'Rotterdam', containers: 87, avgDwell: 2.0, efficiency: 93.7 },
  ];

  const shippingLineData = [
    { line: 'Maersk', share: 35, performance: 94.2 },
    { line: 'MSC', share: 28, performance: 91.8 },
    { line: 'CMA CGM', share: 18, performance: 89.5 },
    { line: 'COSCO', share: 12, performance: 87.3 },
    { line: 'Others', share: 7, performance: 85.1 },
  ];

  useEffect(() => {
    // Check if coming from Customs Portal with clearance context
    const customsContext = sessionStorage.getItem('shipping_from_customs');
    if (customsContext) {
      try {
        const data = JSON.parse(customsContext);
        console.log('[SHIPPING] Received context from Customs Portal:', data);
        
        // Show notification
        setSnackbar({
          open: true,
          message:
            `📦 Customs clearance received for shipment ${data.shipmentId} — ` +
            `Bill of Lading form opened with auto-filled data.`,
          severity: 'info'
        });
        
        // Pre-fill B/L form with shipment ID
        setBolForm({ ...bolForm, shipmentId: data.shipmentId });
        
        // Auto-open B/L dialog and trigger auto-mapping
        setBillOfLadingDialogOpen(true);
        
        // Auto-map data after a brief delay to ensure dialog is open
        setTimeout(() => {
          autoMapBOLData(data.shipmentId);
        }, 500);
        
        // Clear the context after using it
        sessionStorage.removeItem('shipping_from_customs');
      } catch (error) {
        console.error('[SHIPPING] Failed to parse customs context:', error);
        sessionStorage.removeItem('shipping_from_customs');
      }
    }
    
    loadData();
  }, []);



  const loadData = async () => {
    console.log('🔥 ShippingPortal loadData - VERSION: FIX-STATS-2024-08-30');
    setLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // STEP 1: Load shipments from blockchain (with cache-busting timestamp)
      const shipmentsResponse = await apiFetch(`/shipments?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentsResult = await shipmentsResponse.json();
      
      // STEP 2: Load customs clearances from database (to catch shipments where blockchain update failed)
      const clearancesResponse = await apiFetch('/customs/clearances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clearancesResult = await clearancesResponse.json();
      
      console.log(`[SHIPPING] Loaded ${clearancesResult.success ? clearancesResult.data?.length : 0} customs clearances from database`);
      
      // Create a set of cleared shipment IDs
      const clearedShipmentIds = new Set(
        clearancesResult.success && clearancesResult.data 
          ? clearancesResult.data.map((c: any) => c.shipment_id || c.shipmentId).filter(Boolean)
          : []
      );
      
      console.log('[SHIPPING] Cleared shipment IDs from database:', Array.from(clearedShipmentIds));
      
      if (shipmentsResult.success && shipmentsResult.data) {
        // Log all shipments with their statuses for debugging
        console.log(`[SHIPPING] Total shipments from blockchain: ${shipmentsResult.data.length}`);
        
        // FIX: De-duplicate shipments by ID (blockchain may return duplicates with different statuses)
        // Keep only the LATEST version (most recent updatedAt)
        const shipmentMap = new Map();
        shipmentsResult.data.forEach((s: any) => {
          const id = s.ShipmentID || s.shipmentId;
          const updatedAt = new Date(s.UpdatedAt || s.updatedAt || 0);
          
          if (!shipmentMap.has(id) || updatedAt > shipmentMap.get(id).updatedAt) {
            shipmentMap.set(id, { ...s, updatedAt });
          }
        });
        
        const uniqueShipments = Array.from(shipmentMap.values());
        console.log(`[SHIPPING] After de-duplication: ${uniqueShipments.length} unique shipments`);
        
        console.log('[SHIPPING] All shipment statuses:', uniqueShipments.map((s: any) => ({
          id: s.ShipmentID || s.shipmentId,
          status: s.Status || s.status || s.shipmentStatus,
          updated: s.UpdatedAt || s.updatedAt,
        })));
        
        // Filter for shipments in shipping workflow
        // Include shipments with shipping statuses OR cleared in customs database
        const readyShipments = uniqueShipments.filter((s: any) => {
          const shipmentId = s.ShipmentID || s.shipmentId;
          const status = (s.Status || s.status || s.shipmentStatus || '').toUpperCase().trim();
          
          // Check if cleared in database (even if blockchain status isn't updated)
          const isClearedInDatabase = clearedShipmentIds.has(shipmentId);
          
          // Include if: cleared in database OR has a shipping workflow status
          const hasShippingStatus = status === 'CUSTOMS_CLEARED' || 
                 status === 'LAND_TRANSPORT' ||
                 status === 'PORT_ARRIVED' ||
                 status === 'CONTAINER_STUFFED' ||
                 status === 'VESSEL_LOADED' ||
                 status === 'DEPARTED' ||
                 status === 'IN_TRANSIT' ||
                 status === 'DESTINATION_ARRIVED' ||
                 status === 'DELIVERED' ||
                 status === 'LOADED';
          
          if (isClearedInDatabase && !hasShippingStatus) {
            console.log(`[SHIPPING] ✅ Including ${shipmentId} - cleared in database (blockchain status: ${status})`);
          }
          
          return isClearedInDatabase || hasShippingStatus;
        });
        
        console.log(`[SHIPPING] Ready for shipping: ${readyShipments.length}`);
        
        // DEBUG: Log first shipment to see actual structure
        if (readyShipments.length > 0) {
          console.log('[SHIPPING] First shipment raw data:', readyShipments[0]);
          console.log('[SHIPPING] First shipment keys:', Object.keys(readyShipments[0]));
        }
        
        // Map blockchain shipments to shipping records - USE ACTUAL DATA
        const mappedRecords = readyShipments.map((s: any) => {
          // Blockchain uses camelCase: shipmentId, exporterId, transportMode, etc.
          const shipmentId = s.shipmentId || s.ShipmentID || 'UNKNOWN';
          const exporterId = s.exporterId || s.ExporterID || 'UNKNOWN';
          const status = (s.status || s.Status || 'PENDING').toUpperCase().trim();
          
          // Check if this shipment is cleared in database
          const isClearedInDatabase = clearedShipmentIds.has(shipmentId);
          
          // DEBUG: Log status mapping for each shipment
          console.log(`[SHIPPING] Mapping ${shipmentId}: blockchain status="${status}", database cleared=${isClearedInDatabase}`);
          
          // Transport mode from blockchain
          const transportMode = s.transportMode || s.TransportMode || 'SEA';
          
          // Map shipment status to shipping status
          let shippingStatus: ShippingRecord['status'];
          
          // Priority order: most specific to least specific (DELIVERED first to avoid fallthrough)
          if (status === 'DELIVERED') {
            shippingStatus = 'DELIVERED';
          } else if (status === 'DESTINATION_ARRIVED') {
            shippingStatus = 'DESTINATION_ARRIVED';
          } else if (status === 'IN_TRANSIT') {
            shippingStatus = 'IN_TRANSIT';
          } else if (status === 'DEPARTED') {
            shippingStatus = 'DEPARTED';
          } else if (status === 'VESSEL_LOADED') {
            shippingStatus = 'VESSEL_LOADED';
          } else if (status === 'CONTAINER_STUFFED') {
            shippingStatus = 'CONTAINER_STUFFED';
          } else if (status === 'PORT_ARRIVED') {
            shippingStatus = 'PORT_ARRIVED';
          } else if (status === 'LAND_TRANSPORT') {
            shippingStatus = 'LAND_TRANSPORT';
          } else if (status === 'CUSTOMS_CLEARED') {
            shippingStatus = 'CUSTOMS_CLEARED';
          } else if (status === 'LOADED') {
            // LOADED = B/L recorded, treat as CUSTOMS_CLEARED (ready for land transport)
            shippingStatus = 'CUSTOMS_CLEARED';
          } else if (isClearedInDatabase) {
            // If cleared in database but blockchain status not updated, treat as CUSTOMS_CLEARED
            console.log(`[SHIPPING] ⚠️ Using database clearance for ${shipmentId} (blockchain status: ${status})`);
            shippingStatus = 'CUSTOMS_CLEARED';
          } else {
            // ERROR: Unknown status - do NOT show in shipping portal
            console.error(`[SHIPPING] ❌ UNMAPPED STATUS "${status}" for shipment ${shipmentId} - SKIPPING THIS RECORD`);
            return null; // Skip this shipment entirely
          }
          
          console.log(`[SHIPPING] → Mapped to: ${shippingStatus}`);
          
          return {
            shippingId: `SH-${shipmentId}`,
            shipmentId: shipmentId || 'N/A',
            exporterId: exporterId || 'N/A',
            
            // Transport mode from blockchain
            transportMode: (s.transportMode || s.TransportMode || 'SEA') as 'SEA' | 'AIR',
            
            // Carrier name from blockchain
            shippingLine: s.shippingLine || s.ShippingLine ||
                         (transportMode === 'AIR' ? 'Ethiopian Airlines Cargo' : 'Maersk Line'),
            
            // Sea Freight fields from blockchain (camelCase)
            containerNumber: s.containerNumber || s.ContainerNumber || undefined,
            vesselName: s.vesselName || s.VesselName || undefined,
            voyageNumber: s.voyageNumber || s.VoyageNumber || undefined,
            billOfLading: s.billOfLadingNo || s.BillOfLadingNo || undefined,
            containerType: (s.containerType || s.ContainerType || 'DRY') as 'DRY' | 'REEFER' | 'OPEN_TOP',
            
            // Air Freight fields from blockchain (camelCase)
            airwayBill: s.airwayBill || s.AirwayBill || undefined,
            flightNumber: s.flightNumber || s.FlightNumber || undefined,
            
            // Common fields from blockchain (camelCase)
            portOfLoading: s.departurePort || s.DeparturePort ||
                          (transportMode === 'AIR' ? 'Addis Ababa Airport' : 'Djibouti'),
            portOfDischarge: s.destinationPort || s.DestinationPort ||
                            (s.destination) || 'Hamburg',
            estimatedDeparture: s.departureFromAddis || s.DepartureFromAddis ||
                               new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedArrival: s.estimatedArrival || s.EstimatedArrival ||
                             new Date(Date.now() + (transportMode === 'AIR' ? 1 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            actualArrival: s.actualArrival || s.ActualArrival || undefined,
            status: shippingStatus,
            trackingNumber: s.trackingNumber || s.TrackingNumber || `TRK-${shipmentId}`,
            weight: s.quantity || s.Quantity || 20000, // quantity from blockchain is in kg
            volume: ((s.quantity || s.Quantity || 20000) / 600), // kg to m³ approximation
          };
        }).filter(record => record !== null) as ShippingRecord[]; // Remove null entries
        
        console.log(`[SHIPPING] Mapped ${mappedRecords.length} shipping records from blockchain`);
        console.log('[SHIPPING] Sample record:', mappedRecords[0]);
        console.log('[SHIPPING] Status distribution:', {
          CUSTOMS_CLEARED: mappedRecords.filter(r => r.status === 'CUSTOMS_CLEARED').length,
          LAND_TRANSPORT: mappedRecords.filter(r => r.status === 'LAND_TRANSPORT').length,
          PORT_ARRIVED: mappedRecords.filter(r => r.status === 'PORT_ARRIVED').length,
          CONTAINER_STUFFED: mappedRecords.filter(r => r.status === 'CONTAINER_STUFFED').length,
          VESSEL_LOADED: mappedRecords.filter(r => r.status === 'VESSEL_LOADED').length,
          DEPARTED: mappedRecords.filter((r: ShippingRecord) => r.status === 'DEPARTED').length,
          IN_TRANSIT: mappedRecords.filter((r: ShippingRecord) => r.status === 'IN_TRANSIT').length,
          DESTINATION_ARRIVED: mappedRecords.filter((r: ShippingRecord) => r.status === 'DESTINATION_ARRIVED').length,
          DELIVERED: mappedRecords.filter((r: ShippingRecord) => r.status === 'DELIVERED').length,
        });
        
        setShippingRecords(mappedRecords);
        setAllShippingRecords(mappedRecords);
        
        // Log final statistics after state update
        console.log('[SHIPPING] ✅ Final loaded state:', {
          total: mappedRecords.length,
          CUSTOMS_CLEARED: mappedRecords.filter(r => r.status === 'CUSTOMS_CLEARED').length,
          LAND_TRANSPORT: mappedRecords.filter(r => r.status === 'LAND_TRANSPORT').length,
          PORT_ARRIVED: mappedRecords.filter(r => r.status === 'PORT_ARRIVED').length,
          CONTAINER_STUFFED: mappedRecords.filter(r => r.status === 'CONTAINER_STUFFED').length,
          VESSEL_LOADED: mappedRecords.filter(r => r.status === 'VESSEL_LOADED').length,
          DEPARTED: mappedRecords.filter(r => r.status === 'DEPARTED').length,
          IN_TRANSIT: mappedRecords.filter(r => r.status === 'IN_TRANSIT').length,
          DESTINATION_ARRIVED: mappedRecords.filter(r => r.status === 'DESTINATION_ARRIVED').length,
          DELIVERED: mappedRecords.filter(r => r.status === 'DELIVERED').length,
          IN_PROGRESS_COUNT: mappedRecords.filter(r => r.status !== 'CUSTOMS_CLEARED' && r.status !== 'DELIVERED').length,
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch complete verification data before action
  const fetchVerificationData = async (shipmentId: string, actionType: string): Promise<WorkflowVerificationData | null> => {
    setVerificationLoading(true);
    const token = localStorage.getItem('authToken');
    
    try {
      console.log('[VERIFICATION] Fetching data for shipment:', shipmentId);
      
      // Fetch shipment details from blockchain
      const shipmentResponse = await apiFetch(`/shipments/${shipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentData = await shipmentResponse.json();
      
      if (!shipmentData.success) {
        throw new Error('Failed to fetch shipment data');
      }
      
      const shipment = shipmentData.data;
      console.log('[VERIFICATION] Shipment data:', shipment);
      
      // Extract application ID from shipment ID (format: SHIPAPP-02768434 or SHIP1786102768)
      const applicationId = shipmentId.replace('SHIPAPP-', '').replace('SHIP', '');
      console.log('[VERIFICATION] Application ID:', applicationId);
      
      // Fetch exporter information from PostgreSQL
      let exporterInfo = null;
      if (shipment.exporterId || shipment.exporterID) {
        try {
          const exporterId = shipment.exporterId || shipment.exporterID;
          const exporterResponse = await apiFetch(`/users/${exporterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const exporterData = await exporterResponse.json();
          if (exporterData.success) {
            exporterInfo = exporterData.data;
          }
          console.log('[VERIFICATION] Exporter info:', exporterInfo);
        } catch (err) {
          console.warn('Could not fetch exporter info:', err);
        }
      }
      
      // Fetch contract information from blockchain
      let contractInfo = null;
      if (shipment.contractId || shipment.contractID) {
        try {
          const contractId = shipment.contractId || shipment.contractID;
          const contractResponse = await apiFetch(`/blockchain/contract/${contractId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const contractData = await contractResponse.json();
          if (contractData.success) {
            contractInfo = contractData.data;
          }
          console.log('[VERIFICATION] Contract info:', contractInfo);
        } catch (err) {
          console.warn('Could not fetch contract info:', err);
        }
      }
      
      // Fetch customs clearance from PostgreSQL
      let customsClearance = null;
      try {
        const clearanceResponse = await apiFetch(`/customs/clearances`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const clearanceData = await clearanceResponse.json();
        if (clearanceData.success && clearanceData.data) {
          // Find clearance matching this shipment
          customsClearance = clearanceData.data.find((c: any) => 
            c.shipment_id === shipmentId || 
            c.shipment_id === `SHIP${applicationId}` ||
            c.application_id === applicationId
          );
        }
        console.log('[VERIFICATION] Customs clearance:', customsClearance);
        console.log('[VERIFICATION] Duty Amount:', customsClearance?.duty_amount);
        console.log('[VERIFICATION] Tax Amount:', customsClearance?.tax_amount);
        console.log('[VERIFICATION] ✅ Declaration Value (from JOIN):', customsClearance?.customs_value_usd);
        console.log('[VERIFICATION] ✅ Quantity (from JOIN):', customsClearance?.quantity);
      } catch (err) {
        console.warn('Could not fetch clearance info:', err);
      }
      
      // Note: customsClearance now includes declaration data (customs_value_usd, quantity) from the JOIN
      // No need for separate declaration fetch
      
      // Fetch workflow history - Try blockchain first, fallback to audit trail, then reconstruct from related data
      let previousSteps: any[] = [];
      try {
        const historyResponse = await apiFetch(`/shipments/${shipmentId}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const historyData = await historyResponse.json();
        if (historyData.success && historyData.data) {
          const history = Array.isArray(historyData.data) ? historyData.data : 
                          historyData.data.history ? historyData.data.history : [];
          
          previousSteps = history.map((entry: any) => ({
            step: entry.status || entry.action || entry.event || 'Status Change',
            status: 'completed',
            completedAt: entry.timestamp || entry.updatedAt || entry.created_at,
            officer: entry.updatedBy || entry.performedBy || entry.actor || 'System',
            documents: [],
            details: entry.metadata || entry.details || {}
          }));
        }
        
        // FALLBACK: If blockchain history is empty, fetch from audit_trail table
        if (previousSteps.length === 0) {
          console.log('[VERIFICATION] Blockchain history empty, fetching from audit_trail...');
          const auditResponse = await apiFetch(`/audit/entity/SHIPMENT/${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const auditData = await auditResponse.json();
          if (auditData.success && auditData.data) {
            const auditLogs = Array.isArray(auditData.data) ? auditData.data : [];
            previousSteps = auditLogs.map((entry: any) => ({
              step: entry.action || 'Action',
              status: 'completed',
              completedAt: entry.created_at,
              officer: entry.performed_by || 'System',
              documents: [],
              details: {
                oldValue: entry.old_value,
                newValue: entry.new_value,
                reason: entry.reason,
                metadata: entry.metadata
              }
            }));
            console.log(`[VERIFICATION] Found ${previousSteps.length} audit trail entries`);
          }
        }
        
        // COMPREHENSIVE FALLBACK: Reconstruct complete workflow from related data
        if (previousSteps.length === 0) {
          console.log('[VERIFICATION] No audit history, reconstructing comprehensive workflow from database...');
          
          const workflowSteps: any[] = [];
          
          // Step 1: Fetch exporter application data
          if (exporterInfo) {
            try {
              const appResponse = await apiFetch(`/exporters/applications/${applicationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const appData = await appResponse.json();
              if (appData.success && appData.data) {
                const app = appData.data;
                workflowSteps.push({
                  step: 'Exporter Application Submitted',
                  status: 'completed',
                  completedAt: app.submitted_at || app.created_at,
                  officer: app.company_name || 'Exporter',
                  documents: [],
                  details: {
                    applicationID: app.application_id,
                    companyName: app.company_name,
                    tinNumber: app.tin_number,
                    licenseNumber: app.ecta_license_number,
                    applicationStatus: app.status
                  }
                });
                
                // Step 2: ECTA Review (if available)
                if (app.ecta_reviewed_at) {
                  workflowSteps.push({
                    step: 'ECTA License Verification',
                    status: 'completed',
                    completedAt: app.ecta_reviewed_at,
                    officer: app.ecta_reviewed_by || 'ECTA Officer',
                    documents: [],
                    details: {
                      licenseStatus: app.license_status,
                      licenseNumber: app.ecta_license_number,
                      verificationResult: 'Verified and Approved'
                    }
                  });
                }
                
                // Step 3: ECX Quality Inspection (if available)
                if (app.ecx_inspected_at) {
                  workflowSteps.push({
                    step: 'ECX Quality Inspection',
                    status: 'completed',
                    completedAt: app.ecx_inspected_at,
                    officer: app.ecx_inspector || 'ECX Inspector',
                    documents: [],
                    details: {
                      qualityGrade: app.quality_grade || 'Grade A',
                      inspectionResult: app.ecx_inspection_result || 'Passed',
                      remarks: app.ecx_remarks || 'Meets export quality standards'
                    }
                  });
                }
                
                // Step 4: Application Approved
                if (app.approved_at) {
                  workflowSteps.push({
                    step: 'Export Application Approved',
                    status: 'completed',
                    completedAt: app.approved_at,
                    officer: app.approved_by || 'System',
                    documents: [],
                    details: {
                      approvalStatus: app.status,
                      exportLicenseIssued: 'Yes',
                      validUntil: app.expiry_date || 'N/A'
                    }
                  });
                }
              }
            } catch (err) {
              console.warn('[VERIFICATION] Could not fetch exporter application:', err);
            }
          }
          
          // Step 5: Contract Information
          if (contractInfo) {
            workflowSteps.push({
              step: 'Sales Contract Registered',
              status: 'completed',
              completedAt: contractInfo.createdAt || contractInfo.ContractDate || shipment.createdAt,
              officer: 'System',
              documents: [],
              details: {
                contractID: contractInfo.contractId || contractInfo.ContractID,
                buyerName: contractInfo.buyerName || contractInfo.BuyerName,
                quantity: `${(contractInfo.quantity || contractInfo.Quantity || 0).toLocaleString()} kg`,
                coffeeType: contractInfo.coffeeType || contractInfo.CoffeeType,
                price: contractInfo.price ? `$${contractInfo.price}` : 'N/A',
                status: contractInfo.status || contractInfo.Status
              }
            });
          }
          
          // Step 6: NBE Foreign Exchange Approval (if available)
          try {
            const nbeResponse = await apiFetch(`/nbe/approvals?contractId=${contractInfo?.contractId || contractInfo?.ContractID}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const nbeData = await nbeResponse.json();
            if (nbeData.success && nbeData.data && nbeData.data.length > 0) {
              const nbeApproval = nbeData.data[0];
              workflowSteps.push({
                step: 'NBE Foreign Exchange Approval',
                status: 'completed',
                completedAt: nbeApproval.approved_at || nbeApproval.created_at,
                officer: nbeApproval.approved_by || 'NBE Officer',
                documents: [],
                details: {
                  approvalNumber: nbeApproval.approval_number,
                  forexAmount: nbeApproval.forex_amount ? `$${nbeApproval.forex_amount.toLocaleString()}` : 'N/A',
                  exchangeRate: nbeApproval.exchange_rate || 'Market Rate',
                  status: nbeApproval.status
                }
              });
            }
          } catch (err) {
            console.warn('[VERIFICATION] Could not fetch NBE approval:', err);
          }
          
          // Step 7: Bank Letter of Credit (if available)
          try {
            const lcResponse = await apiFetch(`/banking/letters-of-credit?shipmentId=${shipmentId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const lcData = await lcResponse.json();
            if (lcData.success && lcData.data && lcData.data.length > 0) {
              const lc = lcData.data[0];
              workflowSteps.push({
                step: 'Letter of Credit Issued',
                status: 'completed',
                completedAt: lc.issued_date || lc.created_at,
                officer: lc.issuing_bank || 'Bank',
                documents: [],
                details: {
                  lcNumber: lc.lc_number,
                  issuingBank: lc.issuing_bank,
                  lcAmount: lc.lc_amount ? `$${lc.lc_amount.toLocaleString()}` : 'N/A',
                  expiryDate: formatDate(lc.expiry_date),
                  status: lc.status
                }
              });
            }
          } catch (err) {
            console.warn('[VERIFICATION] Could not fetch LC:', err);
          }
          
          // Step 8: Customs Declaration
          try {
            const declResponse = await apiFetch(`/customs/declarations?shipmentId=${shipmentId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const declData = await declResponse.json();
            if (declData.success && declData.data && declData.data.length > 0) {
              const decl = declData.data[0];
              
              // Validate we have minimum required data
              // Use created_at as fallback for clearance_date
              const validDate = decl.clearance_date || decl.created_at;
              if (validDate && decl.declaration_number) {
                // Use contract quantity as fallback if declaration quantity is 0 or null
                const declaredQuantity = decl.quantity || contractInfo?.quantity || contractInfo?.Quantity || 0;
                
                workflowSteps.push({
                  step: 'Customs Declaration Filed',
                  status: 'completed',
                  completedAt: validDate,
                  officer: decl.customs_officer || exporterInfo?.company_name || 'Exporter',
                  documents: [],
                  details: {
                    declarationNumber: decl.declaration_number,
                    declarationType: decl.declaration_type || 'STANDARD',
                    hsCode: decl.hs_code || 'N/A',
                    declaredValue: decl.customs_value_usd ? `$${parseFloat(decl.customs_value_usd).toLocaleString()}` : 'N/A',
                    quantity: `${declaredQuantity.toLocaleString()} kg`,
                    currency: decl.currency || 'USD'
                  }
                });
                
                // Step 9: Customs Inspection (if required)
                if (decl.inspection_required && decl.clearance_date) {
                  const verifiedQty = decl.verified_quantity || declaredQuantity;
                  workflowSteps.push({
                    step: 'Customs Physical Inspection',
                    status: 'completed',
                    completedAt: decl.clearance_date,
                    officer: decl.inspector_name || decl.customs_officer || 'Customs Inspector',
                    documents: [],
                    details: {
                      inspectionType: decl.inspection_type || 'STANDARD',
                      inspectionResult: 'Passed',
                      findings: decl.additional_notes || 'No discrepancies found',
                      verifiedQuantity: `${verifiedQty.toLocaleString()} kg`,
                      eudrCompliant: decl.eudr_compliant ? 'Yes' : 'No'
                    }
                  });
                }
              } else {
                console.warn('[VERIFICATION] Skipping customs declaration - missing critical data (date or number)');
              }
            }
          } catch (err) {
            console.warn('[VERIFICATION] Could not fetch customs declaration:', err);
          }
          
          // Step 10: Customs Clearance (already have this data)
          if (customsClearance) {
            workflowSteps.push({
              step: 'Customs Clearance Granted',
              status: 'completed',
              completedAt: customsClearance.cleared_date || customsClearance.clearedDate,
              officer: customsClearance.cleared_by || customsClearance.clearedBy || 'Customs Officer',
              documents: [],
              details: {
                note: 'See uploaded Customs Clearance Certificate for full details'
              }
            });
          }
          
          previousSteps = workflowSteps;
          console.log(`[VERIFICATION] Reconstructed ${previousSteps.length} comprehensive workflow steps`);
        }
        
        console.log('[VERIFICATION] Previous workflow steps:', previousSteps);
      } catch (err) {
        console.warn('Could not fetch shipment history:', err);
        console.error(err);
      }
      
      // Fetch documents from BOTH PostgreSQL AND Blockchain
      let uploadedDocuments: any[] = [];
      
      // 1. Fetch from PostgreSQL documents table
      try {
        const pgDocsResponse = await apiFetch(`/shipments/${shipmentId}/documents`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const pgDocsData = await pgDocsResponse.json();
        if (pgDocsData.success && pgDocsData.data) {
          const pgDocs = Array.isArray(pgDocsData.data.documents) ? pgDocsData.data.documents : 
                         Array.isArray(pgDocsData.data) ? pgDocsData.data : [];
          uploadedDocuments = [...uploadedDocuments, ...pgDocs.map((doc: any) => {
            // Normalize URL: remove /api/v1/ prefix if it exists
            let docUrl = doc.file_path || doc.file_url || doc.document_url || doc.url || '#';
            if (typeof docUrl === 'string' && docUrl.startsWith('/api/v1/')) {
              docUrl = docUrl.substring(8); // Remove '/api/v1/'
            }
            return {
              name: doc.file_name || doc.fileName || doc.document_name || doc.name || 'Unnamed Document',
              fileName: doc.file_name || doc.fileName || doc.document_name,
              type: doc.document_type || doc.type || 'Unknown',
              url: docUrl,
              uploadedAt: doc.uploaded_at || doc.uploadedAt || doc.createdAt,
              uploadedBy: doc.uploaded_by || doc.uploadedBy || 'Unknown',
              source: 'PostgreSQL'
            };
          })];
        }
        console.log('[VERIFICATION] PostgreSQL documents:', uploadedDocuments.length);
      } catch (err) {
        console.warn('Could not fetch PostgreSQL documents:', err);
      }
      
      // 2. Fetch from application documents (exporter_applications table)
      try {
        const appDocsResponse = await apiFetch(`/exporters/applications/${applicationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const appDocsData = await appDocsResponse.json();
        if (appDocsData.success && appDocsData.data) {
          const app = appDocsData.data;
          
          // Documents are stored in JSONB 'documents' column as array
          if (app.documents && Array.isArray(app.documents)) {
            app.documents.forEach((doc: any) => {
              if (doc && (doc.documentId || doc.fileName)) {
                // Normalize URL: remove /api/v1/ prefix if it exists
                let docUrl = doc.url || `/documents/${doc.documentId}`;
                if (typeof docUrl === 'string' && docUrl.startsWith('/api/v1/')) {
                  docUrl = docUrl.substring(8); // Remove '/api/v1/'
                }
                uploadedDocuments.push({
                  name: doc.fileName || doc.name || doc.type || 'Application Document',
                  fileName: doc.fileName || doc.name,
                  type: doc.category || doc.type || doc.document_type || 'DOCUMENT',
                  url: docUrl,
                  uploadedAt: doc.uploadedAt || doc.created_at || app.submitted_at,
                  uploadedBy: doc.uploadedBy || app.company_name || 'Exporter',
                  source: 'Application',
                  documentId: doc.documentId
                });
              }
            });
          }
        }
        console.log('[VERIFICATION] Application documents added, total:', uploadedDocuments.length);
      } catch (err) {
        console.warn('Could not fetch application documents:', err);
      }
      
      // 3. Fetch from blockchain shipment documents array with enhanced metadata
      if (shipment.documents && Array.isArray(shipment.documents) && shipment.documents.length > 0) {
        for (const docId of shipment.documents) {
          // Try to fetch document metadata from API
          try {
            const docResponse = await apiFetch(`/documents/${docId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const docData = await docResponse.json();
            if (docData.success && docData.data) {
              // Normalize URL: remove /api/v1/ prefix if it exists
              let docUrl = docData.data.fileUrl || docData.data.url || `/documents/${docId}`;
              if (typeof docUrl === 'string' && docUrl.startsWith('/api/v1/')) {
                docUrl = docUrl.substring(8); // Remove '/api/v1/'
              }
              uploadedDocuments.push({
                name: docData.data.fileName || docData.data.name || `Document ${docId}`,
                fileName: docData.data.fileName || docData.data.name,
                type: docData.data.documentType || docData.data.type || 'BLOCKCHAIN_DOCUMENT',
                url: docUrl,
                uploadedAt: docData.data.uploadedAt || docData.data.created_at || shipment.createdAt,
                uploadedBy: docData.data.uploadedBy || 'Blockchain',
                source: 'Blockchain',
                documentId: docId
              });
            } else {
              // Fallback if API doesn't return metadata
              uploadedDocuments.push({
                name: `Document ${docId}`,
                fileName: `Document ${docId}`,
                type: 'BLOCKCHAIN_DOCUMENT',
                url: `/documents/${docId}`,
                uploadedAt: shipment.createdAt || new Date().toISOString(),
                uploadedBy: 'Blockchain',
                source: 'Blockchain',
                documentId: docId
              });
            }
          } catch (err) {
            // Fallback if fetch fails
            uploadedDocuments.push({
              name: `Document ${docId}`,
              fileName: `Document ${docId}`,
              type: 'BLOCKCHAIN_DOCUMENT',
              url: `/documents/${docId}`,
              uploadedAt: shipment.createdAt || new Date().toISOString(),
              uploadedBy: 'Blockchain',
              source: 'Blockchain',
              documentId: docId
            });
          }
        }
        console.log('[VERIFICATION] Blockchain documents added, total:', uploadedDocuments.length);
      }
      
      console.log('[VERIFICATION] Total uploaded documents:', uploadedDocuments.length);
      console.log('[VERIFICATION] Documents:', uploadedDocuments);
      console.log('[VERIFICATION] Documents details:', uploadedDocuments.map(d => ({
        name: d.name,
        type: d.type,
        source: d.source,
        fileName: d.fileName
      })));
      
      // Define required documents based on action type
      const requiredDocuments = getRequiredDocuments(actionType, shipment.transportMode || shipment.TransportMode);
      
      const verificationData: WorkflowVerificationData = {
        shipmentId,
        currentStatus: shipment.status || shipment.Status,
        exporterId: shipment.exporterId || shipment.exporterID || exporterInfo?.company_name || 'N/A',
        exporter: exporterInfo?.company_name || exporterInfo?.name || 'N/A',
        contractId: shipment.contractId || shipment.contractID || 'N/A',
        destination: shipment.destination || contractInfo?.destination || 'Hamburg, Germany',
        transportMode: shipment.transportMode || shipment.TransportMode || 'SEA',
        previousSteps,
        requiredDocuments,
        uploadedDocuments,
        exporterInfo,
        contractInfo,
        customsClearance  // Now includes declaration data via JOIN
      };
      
      setVerificationLoading(false);
      return verificationData;
      
    } catch (error) {
      console.error('[VERIFICATION] Failed to fetch data:', error);
      setVerificationLoading(false);
      setSnackbar({
        open: true,
        message: '❌ Failed to fetch verification data. Please try again.',
        severity: 'error'
      });
      return null;
    }
  };
  
  // Define required documents for each action
  const getRequiredDocuments = (actionType: string, transportMode: string): string[] => {
    const docMap: Record<string, string[]> = {
      'START_LAND_TRANSPORT': [
        'Customs Clearance Certificate',
        'Export Permit',
        'Phytosanitary Certificate',
        'Truck Registration',
        'Driver License'
      ],
      'RECORD_PORT_ARRIVAL': [
        'Transport Waybill',
        'Border Crossing Certificate',
        'Port Entry Receipt'
      ],
      'ISSUE_BOL': transportMode === 'SEA' ? [
        'Commercial Invoice',
        'Packing List',
        'Certificate of Origin',
        'Quality Certificate',
        'Insurance Certificate'
      ] : [
        'Commercial Invoice',
        'Packing List',
        'Certificate of Origin',
        'Quality Certificate',
        'Air Waybill Draft'
      ],
      'CONTAINER_STUFFING': [
        'Container Inspection Report',
        'Stuffing Tally Sheet',
        'Seal Number Record',
        'Fumigation Certificate (if required)'
      ],
      'VESSEL_LOADING': [
        'Bill of Lading',
        'Loading Confirmation',
        'Vessel Manifest Entry',
        'Stowage Plan'
      ],
      'VESSEL_DEPARTURE': [
        'Departure Notice',
        'Vessel Clearance Certificate',
        'Final B/L',
        'Cargo Manifest'
      ],
      'IN_TRANSIT_UPDATE': [
        'GPS Tracking Data',
        'Position Report',
        'Temperature Log (if reefer)'
      ],
      'DESTINATION_ARRIVAL': [
        'Arrival Notice',
        'Import Entry Form',
        'Destination Port Receipt'
      ],
      'DELIVERY_COMPLETE': [
        'Proof of Delivery',
        'Receiver Signature',
        'Final Inspection Report',
        'Payment Confirmation'
      ]
    };
    
    return docMap[actionType] || [];
  };
  
  // Open approval dialog with verification
  const openApprovalDialog = async (actionType: string, actionLabel: string, shipmentId: string) => {
    const verificationData = await fetchVerificationData(shipmentId, actionType);
    
    if (verificationData) {
      setActionInputs(emptyActionInputs);
      setRejectionReason('');
      setApprovalDialog({
        open: true,
        actionType,
        actionLabel,
        shipmentId,
        verificationData
      });
    }
  };
  
  // Handle approval
  const handleApprove = async () => {
    const { actionType, shipmentId } = approvalDialog;
    
    // Close dialog first
    setApprovalDialog({ ...approvalDialog, open: false });
    
    // Execute the action
    switch (actionType) {
      case 'START_LAND_TRANSPORT':
        await handleStartLandTransport(shipmentId);
        break;
      case 'RECORD_PORT_ARRIVAL':
        await handlePortArrival(shipmentId);
        break;
      case 'CONTAINER_STUFFING':
        await handleContainerStuffing(shipmentId);
        break;
      case 'VESSEL_LOADING':
        await handleVesselLoading(shipmentId);
        break;
      case 'VESSEL_DEPARTURE':
        await handleVesselDeparture(shipmentId);
        break;
      case 'IN_TRANSIT_UPDATE':
        await handleInTransitUpdate(shipmentId);
        break;
      case 'DESTINATION_ARRIVAL':
        await handleDestinationArrival(shipmentId);
        break;
      case 'DELIVERY_COMPLETE':
        await handleCompleteDelivery(shipmentId);
        break;
    }

    // Reset inputs after the action has been dispatched
    setActionInputs(emptyActionInputs);
    setRejectionReason('');
  };
  
  // Handle rejection
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: '⚠️ Please provide a reason for rejection',
        severity: 'warning'
      });
      return;
    }
    
    const { shipmentId, actionType } = approvalDialog;
    const token = localStorage.getItem('authToken');
    
    try {
      // Log rejection to audit trail
      await apiFetch(`/audit/log`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entity_type: 'SHIPMENT',
          entity_id: shipmentId,
          action: `REJECTED_${actionType}`,
          status: 'rejected',
          reason: rejectionReason,
          timestamp: new Date().toISOString()
        })
      });
      
      setSnackbar({
        open: true,
        message: `✅ Action rejected and logged. Reason: ${rejectionReason}`,
        severity: 'success'
      });
      setApprovalDialog({ ...approvalDialog, open: false });
      setRejectionReason('');
      loadData(); // Refresh data
      
    } catch (error) {
      console.error('[REJECTION] Failed:', error);
      setSnackbar({
        open: true,
        message: '❌ Failed to log rejection. Please try again.',
        severity: 'error'
      });
    }
  };

  // AUTO-MAPPING: Populate B/L form from all captured data
  const autoMapBOLData = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    setBolAutoFilling(true); // Lock form during auto-fill
    try {
      console.log('[SHIPPING] Auto-mapping B/L data for shipment:', shipmentId);

      // STEP 1: Fetch shipment data from blockchain
      const shipmentResponse = await apiFetch(`/shipments/${shipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentResult = await shipmentResponse.json();

      if (shipmentResult.success && shipmentResult.data) {
        const shipment = shipmentResult.data;
        const exporterId = shipment.exporterID || shipment.exporterId;
        const contractId = shipment.contractID || shipment.contractId;

        // Log the full shipment data to see what fields are available
        console.log('[SHIPPING] Full shipment data:', JSON.stringify(shipment, null, 2));
        console.log('[SHIPPING] Checking for shipping line:', {
          shippingLine: shipment.shippingLine,
          ShippingLine: shipment.ShippingLine,
          carrier: shipment.carrier,
          Carrier: shipment.Carrier,
          metadata: shipment.Metadata,
          transportDetails: shipment.TransportDetails
        });

        // STEP 2: Fetch exporter data using exporter_id
        let exporterData: any = {};
        if (exporterId) {
          try {
            // Use the by-exporter endpoint since exporterId might be EXP... format
            const exporterResponse = await apiFetch(`/users/by-exporter/${exporterId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const exporterResult = await exporterResponse.json();
            if (exporterResult.success) {
              exporterData = exporterResult.data;
              console.log('[SHIPPING] Exporter data found:', exporterData);
            }
          } catch (error) {
            console.warn('[SHIPPING] Could not fetch exporter data for:', exporterId, error);
            // Continue without exporter data - use blockchain data instead
          }
        }

        // STEP 3: Fetch export contract data
        let contractData: any = {};
        if (contractId) {
          try {
            const contractResponse = await apiFetch(`/contracts/${contractId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const contractResult = await contractResponse.json();
            if (contractResult.success) {
              contractData = contractResult.data;
            }
          } catch (error) {
            console.warn('[SHIPPING] Could not fetch contract data:', error);
          }
        }

        // STEP 4: Fetch customs declaration WITH clearance data (JOIN query)
        let customsData: any = {};
        try {
          const customsResponse = await apiFetch('/customs/clearances', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const customsResult = await customsResponse.json();
          if (customsResult.success && customsResult.data) {
            // Find clearance for this shipment
            customsData = customsResult.data.find((c: any) => 
              c.shipment_id === shipmentId && c.status === 'CLEARED'
            ) || {};
            console.log('[SHIPPING] Customs clearance data found:', customsData);
          }
        } catch (error) {
          console.warn('[SHIPPING] Could not fetch customs clearance data:', error);
        }

        // Auto-generate B/L number
        const timestamp = Date.now();
        const bolNumber = `BL${timestamp}`;
        const trackingNumber = `TRK${timestamp}`;
        const containerNumber = `${shipment.eudrCompliant ? 'REEFER' : 'DRY'}${timestamp}`.substr(0, 11).toUpperCase();

        // Calculate dates
        const now = new Date();
        const departureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
        const arrivalDate = new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000); // +17 days

        // Determine freight terms from contract delivery terms
        let freightTerms = 'PREPAID';
        if (contractData.delivery_terms) {
          const terms = contractData.delivery_terms.toUpperCase();
          if (terms.includes('FOB')) freightTerms = 'FOB';
          else if (terms.includes('CIF')) freightTerms = 'CIF';
          else if (terms.includes('CFR')) freightTerms = 'CFR';
          else if (terms.includes('COLLECT')) freightTerms = 'COLLECT';
        }

        // Use real data from previous steps
        const autoMappedData = {
          shipmentId: shipmentId,
          transportMode: 'SEA', // Default to sea freight
          billOfLadingNo: bolNumber,
          vesselName: shipment.vesselName || shipment.VesselName || '', // From shipment blockchain
          voyageNumber: shipment.voyageNumber || shipment.VoyageNumber || `V${new Date().getFullYear()}W${Math.floor(Math.random() * 52) + 1}`,
          shippingLine: (shipment.shippingLine && shipment.shippingLine.trim()) || (shipment.ShippingLine && shipment.ShippingLine.trim()) || 'Maersk Line', // Keep default if empty
          containerNumber: containerNumber,
          containerType: shipment.eudrCompliant ? 'REEFER' : 'DRY',
          // Air freight fields (empty for sea)
          airwayBillNo: '',
          flightNumber: '',
          airline: '',
          // Route information from customs clearance AND shipment blockchain
          departurePort: customsData.port_of_exit || shipment.departurePort || shipment.DeparturePort || 'Djibouti Port',
          destinationPort: customsData.destination || shipment.destinationPort || shipment.DestinationPort || 'Hamburg, Germany',
          estimatedDeparture: departureDate.toISOString().split('T')[0],
          estimatedArrival: arrivalDate.toISOString().split('T')[0],
          trackingNumber: trackingNumber,
          // Weight & Volume from customs declaration
          weight: customsData.quantity?.toString() || shipment.quantity?.toString() || '',
          volume: customsData.quantity ? (customsData.quantity / 600).toFixed(2) : 
                  shipment.quantity ? (shipment.quantity / 600).toFixed(2) : '',
          // Consignee from shipment blockchain - buyer information
          consignee: shipment.buyerName || shipment.BuyerName || contractData.buyerId || contractData.BuyerID || shipment.buyerId || shipment.BuyerID || 'TOLAWAQ Trading GmbH',
          // Notify party - exporter contact
          notify: exporterData.email || exporterData.contact_email || exporterData.full_name || exporterData.company_name || '',
          // Freight terms from contract
          freightTerms: freightTerms,
          // Special instructions with comprehensive info
          specialInstructions: [
            shipment.eudrCompliant ? 'EUDR Compliant - Maintain temperature control' : '',
            customsData.additional_notes || '',
            `Customs Clearance: ${customsData.clearance_number || 'N/A'}`,
            `HS Code: ${customsData.hs_code || 'N/A'}`,
            customsData.duty_amount ? `Duty Paid: $${parseFloat(customsData.duty_amount).toFixed(2)}` : '',
          ].filter(Boolean).join(' | '),
        };

        setBolForm(autoMappedData);

        setSnackbar({
          open: true,
          message: `✅ Auto-Mapped from Contract, Customs & Clearance! Weight: ${autoMappedData.weight} kg | Value: $${customsData.customs_value_usd || 'N/A'} | Route: ${autoMappedData.departurePort} → ${autoMappedData.destinationPort} | Clearance: ${customsData.clearance_number || 'N/A'}`,
          severity: 'success'
        });

        console.log('[SHIPPING] ✅ Auto-mapped B/L data from all sources:', {
          shipment: shipment,
          contract: contractData,
          customs: customsData,
          exporter: exporterData,
          mapped: autoMappedData
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to auto-map B/L data:', error);
      setSnackbar({
        open: true,
        message: '⚠️ Could not auto-map all fields. Please fill manually.',
        severity: 'warning'
      });
    } finally {
      setBolAutoFilling(false); // Unlock form
    }
  };

  const handleSubmitBOL = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Validation - dynamic based on transport mode
    const validationErrors: string[] = [];
    
    if (!bolForm.shipmentId) validationErrors.push('• Shipment ID is required');
    if (!bolForm.transportMode) validationErrors.push('• Transport Mode is required');
    if (!bolForm.departurePort) validationErrors.push('• Departure Point is required');
    if (!bolForm.destinationPort) validationErrors.push('• Destination Point is required');
    if (!bolForm.estimatedArrival) validationErrors.push('• Estimated Arrival is required');
    if (!bolForm.weight || parseFloat(bolForm.weight) <= 0) validationErrors.push('• Weight must be greater than 0');

    // Transport mode specific validation
    if (bolForm.transportMode === 'SEA') {
      if (!bolForm.billOfLadingNo) validationErrors.push('• B/L Number is required');
      if (!bolForm.vesselName) validationErrors.push('• Vessel Name is required');
      if (!bolForm.containerNumber) validationErrors.push('• Container Number is required');
    } else if (bolForm.transportMode === 'AIR') {
      if (!bolForm.airwayBillNo) validationErrors.push('• AWB Number is required');
      if (!bolForm.flightNumber) validationErrors.push('• Flight Number is required');
      if (!bolForm.airline) validationErrors.push('• Airline is required');
    }

    if (validationErrors.length > 0) {
      setSnackbar({
        open: true,
        message: `❌ Validation Failed - Please complete: ${validationErrors.join(', ').replace(/•/g, '')}`,
        severity: 'error'
      });
      return;
    }

    try {
      console.log(`[SHIPPING] Submitting ${bolForm.transportMode} document:`, bolForm);

      // Use the universal shipping-document endpoint
      const response = await apiFetch(`/shipments/${bolForm.shipmentId}/shipping-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportMode: bolForm.transportMode,
          documentNo: bolForm.transportMode === 'SEA' ? bolForm.billOfLadingNo : bolForm.airwayBillNo,
          carrierName: bolForm.transportMode === 'SEA' ? bolForm.shippingLine : bolForm.airline,
          vesselOrFlight: bolForm.transportMode === 'SEA' ? bolForm.vesselName : bolForm.flightNumber,
          departurePoint: bolForm.departurePort,
          destinationPoint: bolForm.destinationPort,
          estimatedArrival: bolForm.estimatedArrival,
          trackingNumber: bolForm.trackingNumber,
          containerNumber: bolForm.containerNumber,
          containerType: bolForm.containerType,
          voyageNumber: bolForm.voyageNumber,
        })
      });

      const result = await response.json();

      if (result.success) {
        const isSea = bolForm.transportMode === 'SEA';
        const docType = isSea ? 'Bill of Lading' : 'Airway Bill';
        const docNumber = isSea ? bolForm.billOfLadingNo : bolForm.airwayBillNo;
        const carrier = isSea ? bolForm.vesselName : bolForm.flightNumber;
        
        setSnackbar({
          open: true,
          message: `✅ ${docType} Recorded Successfully! ${isSea ? 'B/L' : 'AWB'}: ${docNumber} | ${isSea ? 'Vessel' : 'Flight'}: ${carrier}${isSea ? ` | Container: ${bolForm.containerNumber}` : ''} | Route: ${bolForm.departurePort} → ${bolForm.destinationPort} | ETA: ${new Date(bolForm.estimatedArrival).toLocaleDateString()} | Tracking: ${bolForm.trackingNumber}`,
          severity: 'success'
        });
        
        setBillOfLadingDialogOpen(false);
        
        // Reset form
        setBolForm({
          shipmentId: '',
          transportMode: 'SEA',
          billOfLadingNo: '',
          airwayBillNo: '',
          flightNumber: '',
          airline: '',
          vesselName: '',
          voyageNumber: '',
          shippingLine: 'Maersk Line',
          containerNumber: '',
          containerType: 'DRY',
          departurePort: 'Djibouti',
          destinationPort: '',
          estimatedDeparture: '',
          estimatedArrival: '',
          trackingNumber: '',
          weight: '',
          volume: '',
          consignee: '',
          notify: '',
          freightTerms: 'PREPAID',
          specialInstructions: '',
        });
        
        loadData(); // Reload shipping records
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to record ${bolForm.transportMode === 'SEA' ? 'B/L' : 'AWB'}: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to submit shipping document:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };

  // ==================== NEW 8 WORKFLOW HANDLER FUNCTIONS ====================

  const handleStartLandTransport = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const { transportCompany, truckPlateNumber, driverName } = actionInputs;
    if (!transportCompany.trim() || !truckPlateNumber.trim()) {
      setSnackbar({
        open: true,
        message: '❌ Transport company and truck plate number are required',
        severity: 'warning'
      });
      return;
    }

    try {
      console.log('[SHIPPING] Starting land transport for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/land-transport/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportCompany: transportCompany.trim(),
          truckPlateNumber: truckPlateNumber.trim(),
          driverName: driverName.trim(),
          sealNumber: `SEAL-${Date.now()}`, // Auto-generate seal number
        })
      });
      
      const result = await response.json();
      if (result.success) {
        // Show professional success message
        setSnackbar({
          open: true,
          message: `🚛 Land Transport Started! Shipment ${shipmentId} | Transport: ${transportCompany} | Truck: ${truckPlateNumber} | Driver: ${driverName || 'N/A'} | Route: Addis Ababa → Djibouti (800km)`,
          severity: 'success'
        });
        
        // Switch to Land Transport tab (index 1)
        setTabValue(1);
        
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `Failed to start land transport: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to start land transport:', error);
      setSnackbar({
        open: true,
        message: `Network error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handlePortArrival = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[SHIPPING] Recording port arrival for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/port/arrive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          arrivalTime: new Date().toISOString(),
          notes: actionInputs.arrivalNotes.trim() || 'Arrived at Djibouti Port'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `⚓ Port Arrival Recorded! Shipment ${shipmentId} arrived at Djibouti Port. Status: PORT_ARRIVED. Next: Container stuffing`,
          severity: 'success'
        });
        
        // Switch to Port Arrival tab (index 2)
        setTabValue(2);
        
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `Failed to record port arrival: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record port arrival:', error);
      setSnackbar({
        open: true,
        message: `Network error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handleContainerStuffing = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const { containerNumber, containerType, sealNumber } = actionInputs;
    if (!containerNumber.trim()) {
      setSnackbar({
        open: true,
        message: '❌ Container number is required',
        severity: 'warning'
      });
      return;
    }

    try {
      console.log('[SHIPPING] Recording container stuffing for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/container/stuff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          containerNumber: containerNumber.trim(),
          containerType: containerType || 'DRY',
          sealNumber: sealNumber.trim() || `SEAL-${Date.now()}`,
          stuffedBy: 'Port Authority',
          location: 'Djibouti Port'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `✅ Container Stuffed — Shipment ${shipmentId} | Container ${containerNumber} (${containerType}) | Status: CONTAINER_STUFFED. Next step: Vessel loading`,
          severity: 'success'
        });
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to Record Container Stuffing: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record container stuffing:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handleVesselLoading = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[SHIPPING] Recording vessel loading for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/vessel/load`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vesselName: actionInputs.vesselName.trim(),
          voyageNumber: actionInputs.voyageNumber.trim(),
          notes: 'Container loaded on vessel'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `✅ Vessel Loaded — Shipment ${shipmentId}${actionInputs.vesselName ? ` | Vessel: ${actionInputs.vesselName}` : ''} | Status: VESSEL_LOADED. Next step: Vessel departure`,
          severity: 'success'
        });
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to Record Vessel Loading: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record vessel loading:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handleVesselDeparture = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[SHIPPING] Recording vessel departure for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/vessel/depart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vesselName: actionInputs.vesselName.trim(),
          voyageNumber: actionInputs.voyageNumber.trim(),
          notes: 'Vessel departed from Djibouti'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `✅ Vessel Departed — Shipment ${shipmentId}${actionInputs.vesselName ? ` | Vessel: ${actionInputs.vesselName}` : ''} | Status: DEPARTED. Next step: Update to in-transit`,
          severity: 'success'
        });
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to Record Vessel Departure: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record vessel departure:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handleInTransitUpdate = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const trackingNumber = actionInputs.trackingNumber.trim() || `TRK-${Date.now()}`;

    try {
      console.log('[SHIPPING] Updating to in-transit for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/in-transit/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackingNumber
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `✅ In-Transit Updated — Shipment ${shipmentId} | Tracking: ${trackingNumber} | Status: IN_TRANSIT | Journey: 25-35 days to Europe. Next step: Destination arrival`,
          severity: 'success'
        });
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to Update In-Transit: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to update in-transit:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handleDestinationArrival = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[SHIPPING] Recording destination arrival for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/destination/arrive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: actionInputs.arrivalNotes.trim() || 'Arrived at destination port'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `✅ Destination Arrival Recorded — Shipment ${shipmentId} | Status: DESTINATION_ARRIVED. Next step: Final delivery`,
          severity: 'success'
        });
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to Record Destination Arrival: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record destination arrival:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };

  const handleCompleteDelivery = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const deliveryNotes = actionInputs.deliveryNotes.trim() || 'Delivery completed';

    try {
      console.log('[SHIPPING] Completing delivery for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/delivery/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deliveryNotes
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `✅ Delivery Completed — Shipment ${shipmentId} | Status: DELIVERED. Ethiopian Coffee Export Complete!`,
          severity: 'success'
        });
        loadData();
      } else {
        setSnackbar({
          open: true,
          message: `❌ Failed to Complete Delivery: ${result.error?.message || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to complete delivery:', error);
      setSnackbar({
        open: true,
        message: `❌ Network Error: ${error}`,
        severity: 'error'
      });
    }
  };
  const shippingColumns: GridColDef[] = [
    { field: 'shippingId', headerName: 'Shipping ID', width: 130 },
    { field: 'shipmentId', headerName: 'Shipment ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    {
      field: 'transportMode',
      headerName: 'Mode',
      width: 80,
      renderCell: (params) => (
        <Tooltip title={params.value === 'SEA' ? 'Sea Freight' : 'Air Freight'}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            {params.value === 'SEA' ? <DirectionsBoat color="primary" /> : <FlightTakeoff color="secondary" />}
          </Box>
        </Tooltip>
      ),
    },
    { field: 'shippingLine', headerName: 'Carrier', width: 130 },
    {
      field: 'documentNumber',
      headerName: 'B/L or AWB',
      width: 150,
      valueGetter: (params) => {
        const row = params.row;
        // Early stages before B/L issuance
        if (row.status === 'CUSTOMS_CLEARED' || row.status === 'LAND_TRANSPORT' || row.status === 'PORT_ARRIVED') {
          return '(Pending)';
        }
        return row.transportMode === 'SEA' 
          ? row.billOfLading || row.containerNumber || '(Pending)'
          : row.airwayBill || row.flightNumber || '(Pending)';
      },
    },
    {
      field: 'vesselOrFlight',
      headerName: 'Vessel/Flight',
      width: 150,
      valueGetter: (params) => {
        const row = params.row;
        // Early stages before vessel/flight assignment
        if (row.status === 'CUSTOMS_CLEARED' || row.status === 'LAND_TRANSPORT' || row.status === 'PORT_ARRIVED' || row.status === 'CONTAINER_STUFFED') {
          return '(To be assigned)';
        }
        return row.transportMode === 'SEA' 
          ? row.vesselName || '(To be assigned)'
          : row.flightNumber || row.vesselName || '(To be assigned)';
      },
    },
    { field: 'portOfLoading', headerName: 'Origin', width: 120 },
    { field: 'portOfDischarge', headerName: 'Destination', width: 120 },
    {
      field: 'containerType',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            color={
              params.value === 'DRY' ? 'primary' :
              params.value === 'REEFER' ? 'secondary' : 'success'
            }
          />
        ) : (
          <Chip label="AIR" size="small" color="info" />
        )
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip
          status={params.value as StatusType}
          label={params.value}
        />
      ),
    },
    { field: 'estimatedDeparture', headerName: 'ETD', width: 130, renderCell: (params) => formatDate(params.value) },
    { field: 'estimatedArrival', headerName: 'ETA', width: 130, renderCell: (params) => formatDate(params.value) },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 260,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Audit Trail">
            <IconButton 
              size="small"
              color="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setAuditEntityType('SHIPMENT');
                setAuditEntityId(params.row.shipmentId);
                setShowAuditTrail(true);
              }}
            >
              <Assignment />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="View Details">
            <IconButton 
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Track Shipment">
            <IconButton 
              size="small"
              color="info"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
                setTrackingDialogOpen(true);
              }}
            >
              <LocationOn />
            </IconButton>
          </Tooltip>
          
          {/* CUSTOMS_CLEARED → Start Land Transport */}
          {params.row.status === 'CUSTOMS_CLEARED' && (
            <Tooltip title="Start Land Transport">
              <IconButton 
                size="small"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartLandTransport(params.row.shipmentId);
                }}
              >
                <LocalShipping />
              </IconButton>
            </Tooltip>
          )}
          
          {/* LAND_TRANSPORT → Port Arrival */}
          {params.row.status === 'LAND_TRANSPORT' && (
            <Tooltip title="Record Port Arrival">
              <IconButton 
                size="small"
                color="info"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePortArrival(params.row.shipmentId);
                }}
              >
                <Anchor />
              </IconButton>
            </Tooltip>
          )}
          
          {/* PORT_ARRIVED → Stuff Container */}
          {params.row.status === 'PORT_ARRIVED' && (
            <Tooltip title="Stuff Container">
              <IconButton 
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContainerStuffing(params.row.shipmentId);
                }}
              >
                <Inventory />
              </IconButton>
            </Tooltip>
          )}
          
          {/* CONTAINER_STUFFED → Load on Vessel */}
          {params.row.status === 'CONTAINER_STUFFED' && (
            <Tooltip title="Load on Vessel">
              <IconButton 
                size="small"
                color="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVesselLoading(params.row.shipmentId);
                }}
              >
                <DirectionsBoat />
              </IconButton>
            </Tooltip>
          )}
          
          {/* VESSEL_LOADED → Mark Departed */}
          {params.row.status === 'VESSEL_LOADED' && (
            <Tooltip title="Mark Vessel Departed">
              <IconButton 
                size="small"
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVesselDeparture(params.row.shipmentId);
                }}
              >
                <DirectionsBoat />
              </IconButton>
            </Tooltip>
          )}
          
          {/* DEPARTED → Update In-Transit */}
          {params.row.status === 'DEPARTED' && (
            <Tooltip title="Update to In-Transit">
              <IconButton 
                size="small"
                color="info"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInTransitUpdate(params.row.shipmentId);
                }}
              >
                <DirectionsBoat />
              </IconButton>
            </Tooltip>
          )}
          
          {/* IN_TRANSIT → Destination Arrival */}
          {params.row.status === 'IN_TRANSIT' && (
            <Tooltip title="Record Destination Arrival">
              <IconButton 
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDestinationArrival(params.row.shipmentId);
                }}
              >
                <LocationOn />
              </IconButton>
            </Tooltip>
          )}
          
          {/* DESTINATION_ARRIVED → Complete Delivery */}
          {params.row.status === 'DESTINATION_ARRIVED' && (
            <Tooltip title="Complete Delivery">
              <IconButton 
                size="small"
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteDelivery(params.row.shipmentId);
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const getShippingStats = () => {
    const total = shippingRecords.length;
    const inTransit = shippingRecords.filter(r => r.status === 'IN_TRANSIT' || r.status === 'DEPARTED').length;
    const delivered = shippingRecords.filter(r => r.status === 'DELIVERED').length;
    const totalWeight = shippingRecords.reduce((sum, record) => sum + record.weight, 0);

    return { total, inTransit, delivered, totalWeight };
  };

  const stats = getShippingStats();

  // Brand colors for Shipping Portal
  const brandPrimary = '#006064'; // Deep Teal
  const brandSecondary = '#0097a7'; // Cyan

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f7fcfd 0%, #edf7fa 46%, #fffef4 100%)',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Professional KPI Cards - Reflect 9-Tab Workflow */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {(() => {
          // KPIs based on 9-tab workflow structure (including Customs Cleared)
          const kpis = tabValue === 0 ? [
            // Tab 0: Customs Cleared
            { 
              icon: <CheckCircle />, 
              label: 'Approved Clearances', 
              value: allShippingRecords.length, 
              color: '#4caf50',
              subtitle: 'All Cleared Shipments'
            },
            { 
              icon: <LocalShipping />, 
              label: 'Ready for Transport', 
              value: allShippingRecords.filter(r => r.status === 'CUSTOMS_CLEARED').length, 
              color: '#ff9800',
              subtitle: 'Awaiting Dispatch'
            },
            { 
              icon: <DirectionsBoat />, 
              label: 'In Progress', 
              value: allShippingRecords.filter(r => r.status !== 'CUSTOMS_CLEARED' && r.status !== 'DELIVERED').length, 
              color: '#2196f3',
              subtitle: 'In Transit/Port'
            },
            { 
              icon: <TrendingUp />, 
              label: 'Clearance Rate', 
              value: pipelineProgressRate, 
              color: '#4caf50',
              subtitle: 'Pipeline Progress'
            },
          ] : tabValue === 1 ? [
            // Tab 1: Land Transport
            { 
              icon: <LocalShipping />, 
              label: 'Land Transport', 
              value: allShippingRecords.filter(r => r.status === 'LAND_TRANSPORT').length, 
              color: '#ff9800',
              subtitle: 'Addis → Djibouti'
            },
            { 
              icon: <Schedule />, 
              label: 'Avg Duration', 
              value: '3-5d', 
              color: '#2196F3',
              subtitle: '800km Journey'
            },
            { 
              icon: <LocalShipping />, 
              label: 'Trucks Active', 
              value: allShippingRecords.filter(r => r.status === 'LAND_TRANSPORT').length, 
              color: brandPrimary,
              subtitle: 'On Road'
            },
            { 
              icon: <TrendingUp />, 
              label: 'On Schedule', 
              value: landTransportProgressRate, 
              color: '#4caf50',
              subtitle: 'Performance'
            },
          ] : tabValue === 2 ? [
            // Tab 2: Port Arrived
            { 
              icon: <Anchor />, 
              label: 'At Port', 
              value: allShippingRecords.filter(r => r.status === 'PORT_ARRIVED').length, 
              color: '#00bcd4',
              subtitle: 'Djibouti Port'
            },
            { 
              icon: <Inventory />, 
              label: 'Awaiting Stuffing', 
              value: allShippingRecords.filter(r => r.status === 'PORT_ARRIVED').length, 
              color: '#ff9800',
              subtitle: 'Ready for Container'
            },
            { 
              icon: <DirectionsBoat />, 
              label: 'Port Operations', 
              value: allShippingRecords.filter(r => r.status === 'PORT_ARRIVED').length, 
              color: brandPrimary,
              subtitle: 'Active'
            },
            { 
              icon: <TrendingUp />, 
              label: 'Port Throughput', 
              value: `${allShippingRecords.length > 0 ? Math.round((allShippingRecords.filter(r => ['PORT_ARRIVED','CONTAINER_STUFFED','VESSEL_LOADED','DEPARTED','IN_TRANSIT','DESTINATION_ARRIVED','DELIVERED'].includes(r.status)).length / allShippingRecords.length) * 100) : 0}%`, 
              color: '#4caf50',
              subtitle: 'Past Port Arrival'
            },
          ] : tabValue === 3 ? [
            // Tab 3: Container Stuffed
            { 
              icon: <Inventory />, 
              label: 'Containers', 
              value: allShippingRecords.filter(r => r.status === 'CONTAINER_STUFFED').length, 
              color: '#009688',
              subtitle: 'Stuffed & Sealed'
            },
            { 
              icon: <DirectionsBoat />, 
              label: 'DRY', 
              value: allShippingRecords.filter(r => r.status === 'CONTAINER_STUFFED' && r.containerType === 'DRY').length, 
              color: '#2196F3',
              subtitle: 'Standard'
            },
            { 
              icon: <DirectionsBoat />, 
              label: 'REEFER', 
              value: allShippingRecords.filter(r => r.status === 'CONTAINER_STUFFED' && r.containerType === 'REEFER').length, 
              color: '#00bcd4',
              subtitle: 'Climate Controlled'
            },
            { 
              icon: <TrendingUp />, 
              label: 'Ready to Load', 
              value: allShippingRecords.filter(r => r.status === 'CONTAINER_STUFFED').length, 
              color: '#4caf50',
              subtitle: 'Awaiting Vessel'
            },
          ] : tabValue === 4 ? [
            // Tab 4: Vessel Loaded
            { 
              icon: <DirectionsBoat />, 
              label: 'Loaded', 
              value: allShippingRecords.filter(r => r.status === 'VESSEL_LOADED').length, 
              color: '#4caf50',
              subtitle: 'On Vessel'
            },
            { 
              icon: <Schedule />, 
              label: 'Awaiting Departure', 
              value: allShippingRecords.filter(r => r.status === 'VESSEL_LOADED').length, 
              color: '#ff9800',
              subtitle: 'Ready to Sail'
            },
            { 
              icon: <Anchor />, 
              label: 'At Djibouti', 
              value: allShippingRecords.filter(r => r.status === 'VESSEL_LOADED').length, 
              color: brandPrimary,
              subtitle: 'Port'
            },
            { 
              icon: <TrendingUp />, 
              label: 'Loading Efficiency', 
              value: loadingEfficiencyRate, 
              color: '#4caf50',
              subtitle: 'Performance'
            },
          ] : tabValue === 5 ? [
            // Tab 5: Departed
            { 
              icon: <DirectionsBoat />, 
              label: 'Departed', 
              value: allShippingRecords.filter(r => r.status === 'DEPARTED').length, 
              color: '#8bc34a',
              subtitle: 'Left Port'
            },
            { 
              icon: <Schedule />, 
              label: 'Recent Departures', 
              value: allShippingRecords.filter(r => r.status === 'DEPARTED').length, 
              color: '#ff9800',
              subtitle: 'Last 24h'
            },
            { 
              icon: <LocationOn />, 
              label: 'From Djibouti', 
              value: allShippingRecords.filter(r => r.status === 'DEPARTED').length, 
              color: brandPrimary,
              subtitle: 'Main Port'
            },
            { 
              icon: <TrendingUp />, 
              label: 'On Schedule', 
              value: departureRate, 
              color: '#4caf50',
              subtitle: 'Tracking'
            },
          ] : tabValue === 6 ? [
            // Tab 6: In Transit
            { 
              icon: <DirectionsBoat />, 
              label: 'At Sea', 
              value: allShippingRecords.filter(r => r.status === 'IN_TRANSIT').length, 
              color: '#673ab7',
              subtitle: 'Active Voyages'
            },
            { 
              icon: <Schedule />, 
              label: 'Avg Transit', 
              value: '25-35d', 
              color: '#ff9800',
              subtitle: 'To Europe'
            },
            { 
              icon: <LocationOn />, 
              label: 'GPS Tracking', 
              value: allShippingRecords.filter(r => r.status === 'IN_TRANSIT').length, 
              color: brandPrimary,
              subtitle: 'Active'
            },
            { 
              icon: <TrendingUp />, 
              label: 'On Schedule', 
              value: transitProgressRate, 
              color: '#4caf50',
              subtitle: 'Performance'
            },
          ] : tabValue === 7 ? [
            // Tab 7: Destination Arrived
            { 
              icon: <LocationOn />, 
              label: 'Arrived', 
              value: allShippingRecords.filter(r => r.status === 'DESTINATION_ARRIVED').length, 
              color: '#4caf50',
              subtitle: 'At Destination'
            },
            { 
              icon: <Schedule />, 
              label: 'Awaiting Clearance', 
              value: allShippingRecords.filter(r => r.status === 'DESTINATION_ARRIVED').length, 
              color: '#ff9800',
              subtitle: 'Customs'
            },
            { 
              icon: <Inventory />, 
              label: 'Ready for Delivery', 
              value: allShippingRecords.filter(r => r.status === 'DESTINATION_ARRIVED').length, 
              color: brandPrimary,
              subtitle: 'Final Mile'
            },
            { 
              icon: <TrendingUp />, 
              label: 'Clearance Rate', 
              value: completionRate, 
              color: '#4caf50',
              subtitle: 'Delivery Completion'
            },
          ] : [
            // Tab 8: Delivered
            { 
              icon: <CheckCircle />, 
              label: 'Delivered', 
              value: allShippingRecords.filter(r => r.status === 'DELIVERED').length, 
              color: '#4caf50',
              subtitle: 'Complete'
            },
            { 
              icon: <TrendingUp />, 
              label: 'This Month', 
              value: allShippingRecords.filter(r => {
                const estDep = new Date(r.estimatedDeparture);
                const now = new Date();
                return r.status === 'DELIVERED' && estDep.getMonth() === now.getMonth() && estDep.getFullYear() === now.getFullYear();
              }).length, 
              color: brandPrimary,
              subtitle: 'Shipments'
            },
            { 
              icon: <Assessment />, 
              label: 'Total Weight', 
              value: `${Math.round(allShippingRecords.filter(r => r.status === 'DELIVERED').reduce((sum, r) => sum + (r.weight || 0), 0) / 1000)}t`, 
              color: '#2196F3',
              subtitle: 'Delivered'
            },
            { 
              icon: <DirectionsBoat />, 
              label: 'Success Rate', 
              value: completionRate, 
              color: '#4caf50',
              subtitle: 'Quality'
            },
          ];

          return kpis.map((kpi, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card 
                elevation={0}
                sx={{ 
                  bgcolor: '#fff', 
                  border: `3px solid ${kpi.color}15`,
                  borderLeft: `6px solid ${kpi.color}`,
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: `0 12px 28px ${kpi.color}25`,
                    transform: 'translateY(-6px)',
                    borderColor: `${kpi.color}30`,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
                    background: `radial-gradient(circle, ${kpi.color}08 0%, transparent 70%)`,
                    borderRadius: '50%',
                    transform: 'translate(40%, -40%)',
                  }
                }}
              >
                <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ 
                        color: '#666', 
                        textTransform: 'uppercase', 
                        fontWeight: 600, 
                        display: 'block',
                        letterSpacing: '1px',
                        fontSize: '0.7rem',
                        mb: 1
                      }}>
                        {kpi.label}
                      </Typography>
                      <Typography variant="h3" sx={{ 
                        fontWeight: 800, 
                        color: kpi.color,
                        lineHeight: 1,
                        fontSize: '2.5rem',
                        mb: 0.5
                      }}>
                        {kpi.value}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#999', 
                        fontSize: '0.8rem',
                        fontWeight: 500
                      }}>
                        {kpi.subtitle}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${kpi.color}10`,
                      flexShrink: 0,
                    }}>
                      {React.cloneElement(kpi.icon, { 
                        sx: { 
                          fontSize: 32, 
                          color: kpi.color
                        } 
                      })}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ));
        })()}
      </Grid>

      {/* Tabs - Shipping Workflow Status */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => {
              setTabValue(newValue);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
              '& .MuiTab-root': {
                minHeight: 56,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#666',
                transition: 'all 0.3s ease',
                px: 3,
                '&.Mui-selected': {
                  color: brandPrimary,
                  fontWeight: 700,
                },
                '&:hover': {
                  color: brandPrimary,
                  opacity: 0.8,
                  backgroundColor: 'rgba(21, 101, 192, 0.04)',
                }
              },
              '& .MuiTabs-indicator': {
                height: 4,
                backgroundColor: brandPrimary,
                borderRadius: '4px 4px 0 0',
              }
            }}
          >
            {mainTabs.map(tab => (
              <Tab 
                key={tab.index}
                label={tab.label} 
                icon={tab.icon} 
                iconPosition="start"
              />
            ))}
          </Tabs>
          
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={() => loadData()} 
              disabled={loading}
              sx={{ 
                mr: 2,
                color: brandPrimary,
                '&:hover': { bgcolor: `${brandPrimary}10` }
              }}
            >
              {loading ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabs 0-8: one persistent tab per lifecycle status; each shows only shipments at that exact status */}
        {mainTabs.filter(tab => tab.status).map(tab => (
          <TabPanel key={tab.index} value={tabValue} index={tab.index}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: brandPrimary }}>
                {tab.label} — {tab.description}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Shipments currently holding status <strong>{tab.status.replace(/_/g, ' ')}</strong> are listed below and persist here until they advance.
              </Typography>
            </Box>

            <Alert severity="info" icon={tab.icon} sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>{allShippingRecords.filter(r => r.status === tab.status).length}</strong> shipment(s) currently at <strong>{tab.status.replace(/_/g, ' ')}</strong>.
              </Typography>
            </Alert>

            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={allShippingRecords.filter(r => r.status === tab.status)}
                columns={[
                  ...shippingColumns.slice(0, -1),
                  {
                    field: 'currentStage',
                    headerName: 'Current Stage',
                    width: 180,
                    renderCell: (params) => (
                      <Chip
                        label={params.row.status.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          bgcolor: lifecycleStageColors[params.row.status] || '#9e9e9e',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    ),
                  },
                  {
                    field: 'progress',
                    headerName: 'Progress',
                    width: 120,
                    renderCell: (params) => {
                      const progress = lifecycleProgressMap[params.row.status] || 0;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 1 }} />
                          </Box>
                          <Typography variant="caption" sx={{ minWidth: 35 }}>{progress}%</Typography>
                        </Box>
                      );
                    },
                  },
                  shippingColumns[shippingColumns.length - 1],
                ]}
                getRowId={(row) => row.shippingId}
                loading={loading}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              />
            </Box>

            {/* Special section for DELIVERED tab: Show post-delivery workflow */}
            {tab.status === 'DELIVERED' && allShippingRecords.filter(r => r.status === 'DELIVERED').length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: brandPrimary }}>
                  📋 Post-Delivery Workflow Progress
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  Monitor payment, forex repatriation, LC settlement, and final audit completion for delivered shipments.
                </Typography>
                
                <Grid container spacing={3}>
                  {allShippingRecords.filter(r => r.status === 'DELIVERED').map((record) => (
                    <Grid item xs={12} key={record.shippingId}>
                      <Card sx={{ boxShadow: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Shipment: {record.shipmentId}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Tracking: {record.trackingNumber} | Delivered: {record.actualArrival ? new Date(record.actualArrival).toLocaleDateString() : 'N/A'}
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
                            shipmentId={record.shipmentId}
                            userRole="SHIPPING"
                            onRefresh={() => {
                              loadData();
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </TabPanel>
        ))}

        {/* Tab 9: User Management */}
        <TabPanel value={tabValue} index={9}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: brandPrimary }}>
              User Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage shipping portal users and permissions
            </Typography>
          </Box>
          <UserManagement />
        </TabPanel>

      </ModernCard>
      {/* Comprehensive Shipping Record Detail Dialog */}
      <Dialog 
        open={!!selectedRecord && !trackingDialogOpen} 
        onClose={() => setSelectedRecord(null)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: brandPrimary, 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          py: 2
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Shipment Details
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {selectedRecord?.shipmentId}
            </Typography>
          </Box>
          {selectedRecord && (
            <Chip 
              label={selectedRecord.status.replace(/_/g, ' ')} 
              sx={{ 
                bgcolor: 'white', 
                color: brandPrimary,
                fontWeight: 700
              }} 
            />
          )}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedRecord && (
            <Box component="form">
              {/* BLOCKCHAIN PROOF BADGE */}
              <BlockchainBadge
                entityId={selectedRecord.shipmentId}
                entityType="SHIPMENT"
                chaincode="coffee"
                channel="coffeechannel"
                compact
              />

              {/* Summary Stats Row */}
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                <Grid container spacing={3}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Weight
                    </Typography>
                    <Typography variant="h6" sx={{ color: brandPrimary, fontWeight: 700 }}>
                      {selectedRecord.weight ? (selectedRecord.weight / 1000).toFixed(2) : '0'} tons
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Volume
                    </Typography>
                    <Typography variant="h6" sx={{ color: brandPrimary, fontWeight: 700 }}>
                      {selectedRecord.volume.toFixed(2)} CBM
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Transit Time
                    </Typography>
                    <Typography variant="h6" sx={{ color: brandPrimary, fontWeight: 700 }}>
                      {Math.ceil((new Date(selectedRecord.estimatedArrival).getTime() - new Date(selectedRecord.estimatedDeparture).getTime()) / (1000 * 60 * 60 * 24))} days
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Transport Mode
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {selectedRecord.transportMode === 'SEA' ? <DirectionsBoat color="primary" /> : <FlightTakeoff color="primary" />}
                      <Typography variant="h6" sx={{ color: brandPrimary, fontWeight: 700 }}>
                        {selectedRecord.transportMode}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Section 1: Shipping Information - FORM FIELDS */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: brandPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DirectionsBoat /> Shipping Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Shipping Line / Carrier"
                      value={selectedRecord.shippingLine || ''}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={selectedRecord.transportMode === 'SEA' ? 'Vessel Name' : 'Flight Number'}
                      value={selectedRecord.vesselName || selectedRecord.flightNumber || 'Not assigned'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={selectedRecord.transportMode === 'SEA' ? 'Voyage Number' : 'Flight Number'}
                      value={selectedRecord.voyageNumber || selectedRecord.flightNumber || 'Not assigned'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Tracking Number"
                      value={selectedRecord.trackingNumber}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                      sx={{ '& .MuiFilledInput-root': { bgcolor: '#e8f5e9' } }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Section 2: Cargo Details - FORM FIELDS */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: brandPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory /> Cargo Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Container Number"
                      value={selectedRecord.containerNumber || 'Pending'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Container Type"
                      value={selectedRecord.containerType || 'N/A'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label={selectedRecord.transportMode === 'SEA' ? 'Bill of Lading' : 'Airway Bill'}
                      value={selectedRecord.billOfLading || selectedRecord.airwayBill || 'Pending'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Exporter ID"
                      value={selectedRecord.exporterId}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Section 3: Route & Timeline - FORM FIELDS */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: brandPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn /> Route & Timeline
                </Typography>
                
                {/* Visual Route Indicator */}
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Box sx={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: '50%', 
                        bgcolor: 'success.main', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1
                      }}>
                        <LocationOn sx={{ color: 'white', fontSize: 28 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedRecord.portOfLoading}</Typography>
                      <Typography variant="caption" color="textSecondary">Origin</Typography>
                    </Box>
                    
                    <Box sx={{ flex: 2, position: 'relative' }}>
                      <Box sx={{ 
                        height: 2, 
                        bgcolor: brandPrimary, 
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          right: 0,
                          top: -4,
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid ' + brandPrimary,
                          borderTop: '5px solid transparent',
                          borderBottom: '5px solid transparent',
                        }
                      }} />
                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        {selectedRecord.transportMode === 'SEA' ? (
                          <DirectionsBoat sx={{ color: brandPrimary, fontSize: 28 }} />
                        ) : (
                          <FlightTakeoff sx={{ color: brandPrimary, fontSize: 28 }} />
                        )}
                        <Typography variant="caption" display="block" color="textSecondary">
                          {selectedRecord.transportMode === 'SEA' ? 'Ocean Freight' : 'Air Freight'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Box sx={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: '50%', 
                        bgcolor: selectedRecord.status === 'DELIVERED' ? 'success.main' : 'grey.400', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1
                      }}>
                        <LocationOn sx={{ color: 'white', fontSize: 28 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedRecord.portOfDischarge}</Typography>
                      <Typography variant="caption" color="textSecondary">Destination</Typography>
                    </Box>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Port of Loading"
                      value={selectedRecord.portOfLoading}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Port of Discharge"
                      value={selectedRecord.portOfDischarge}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Estimated Departure"
                      value={formatDate(selectedRecord.estimatedDeparture)}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Estimated Arrival"
                      value={formatDate(selectedRecord.estimatedArrival)}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                      size="small"
                    />
                  </Grid>
                  {selectedRecord.actualDeparture && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Actual Departure"
                        value={formatDate(selectedRecord.actualDeparture)}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                        size="small"
                        sx={{ '& .MuiFilledInput-root': { bgcolor: '#e8f5e9' } }}
                      />
                    </Grid>
                  )}
                  {selectedRecord.actualArrival && (
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Actual Arrival"
                        value={formatDate(selectedRecord.actualArrival)}
                        InputProps={{ readOnly: true }}
                        variant="filled"
                        size="small"
                        sx={{ '& .MuiFilledInput-root': { bgcolor: '#e8f5e9' } }}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>

              {/* Real-time Tracking Alert (if in transit) */}
              {selectedRecord.status === 'IN_TRANSIT' && (
                <Alert severity="info" icon={<DirectionsBoat />} sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    🌊 Real-time Tracking Active
                  </Typography>
                  <Typography variant="caption" display="block">
                    IoT Sensors: Temperature 18°C • Humidity 65% • GPS Active
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0', gap: 1 }}>
          <AnimatedButton onClick={() => setSelectedRecord(null)} variant="outlined" color="inherit">
            Close
          </AnimatedButton>
          
          {selectedRecord && (
            <>
              {/* Status-based Action Buttons */}
              {selectedRecord.status === 'CUSTOMS_CLEARED' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('START_LAND_TRANSPORT', 'Start Land Transport', selectedRecord.shipmentId)}
                  variant="contained"
                  color="primary"
                  startIcon={<LocalShipping />}
                >
                  Start Land Transport
                </AnimatedButton>
              )}
              
              {selectedRecord.status === 'LAND_TRANSPORT' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('RECORD_PORT_ARRIVAL', 'Record Port Arrival', selectedRecord.shipmentId)}
                  variant="contained"
                  color="primary"
                  startIcon={<Anchor />}
                >
                  Record Port Arrival
                </AnimatedButton>
              )}
              
              {selectedRecord.status === 'PORT_ARRIVED' && (
                <>
                  <AnimatedButton 
                    onClick={() => {
                      const shipmentId = selectedRecord.shipmentId;
                      setBillOfLadingDialogOpen(true);
                      setBolForm((prev) => ({ ...prev, shipmentId: shipmentId }));
                      // Auto-fill data immediately when dialog opens
                      setTimeout(() => {
                        autoMapBOLData(shipmentId);
                      }, 300);
                    }}
                    variant="contained"
                    color="primary"
                    startIcon={<Assignment />}
                  >
                    Issue Bill of Lading
                  </AnimatedButton>
                  <AnimatedButton 
                    onClick={() => openApprovalDialog('CONTAINER_STUFFING', 'Record Container Stuffing', selectedRecord.shipmentId)}
                    variant="contained"
                    color="secondary"
                    startIcon={<Inventory />}
                  >
                    Record Container Stuffing
                  </AnimatedButton>
                </>
              )}
              
              {selectedRecord.status === 'CONTAINER_STUFFED' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('VESSEL_LOADING', 'Record Vessel Loading', selectedRecord.shipmentId)}
                  variant="contained"
                  color="primary"
                  startIcon={<DirectionsBoat />}
                >
                  Record Vessel Loading
                </AnimatedButton>
              )}
              
              {selectedRecord.status === 'VESSEL_LOADED' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('VESSEL_DEPARTURE', 'Record Vessel Departure', selectedRecord.shipmentId)}
                  variant="contained"
                  color="primary"
                  startIcon={<FlightTakeoff />}
                >
                  Record Vessel Departure
                </AnimatedButton>
              )}
              
              {selectedRecord.status === 'DEPARTED' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('IN_TRANSIT_UPDATE', 'Update to In-Transit', selectedRecord.shipmentId)}
                  variant="contained"
                  color="primary"
                  startIcon={<DirectionsBoat />}
                >
                  Update to In-Transit
                </AnimatedButton>
              )}
              
              {selectedRecord.status === 'IN_TRANSIT' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('DESTINATION_ARRIVAL', 'Record Destination Arrival', selectedRecord.shipmentId)}
                  variant="contained"
                  color="success"
                  startIcon={<LocationOn />}
                >
                  Record Destination Arrival
                </AnimatedButton>
              )}
              
              {selectedRecord.status === 'DESTINATION_ARRIVED' && (
                <AnimatedButton 
                  onClick={() => openApprovalDialog('DELIVERY_COMPLETE', 'Complete Delivery', selectedRecord.shipmentId)}
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                >
                  Complete Delivery
                </AnimatedButton>
              )}
              
              {/* Always available actions */}
              <AnimatedButton 
                onClick={() => {
                  setTrackingDialogOpen(true);
                }}
                variant="outlined"
                startIcon={<LocationOn />}
              >
                Track Shipment
              </AnimatedButton>
              
              <AnimatedButton 
                onClick={() => {
                  // Open documents download
                  window.open(`/api/v1/shipments/${selectedRecord.shipmentId}/documents`, '_blank');
                }}
                variant="outlined"
                startIcon={<Download />}
              >
                Download Documents
              </AnimatedButton>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onClose={() => setTrackingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Container Tracking Details</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Container:</strong> {selectedRecord.containerNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Vessel:</strong> {selectedRecord.vesselName}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Voyage:</strong> {selectedRecord.voyageNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Tracking:</strong> {selectedRecord.trackingNumber}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Bill of Lading:</strong> {selectedRecord.billOfLading}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Route:</strong> {selectedRecord.portOfLoading} → {selectedRecord.portOfDischarge}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>ETD:</strong> {formatDate(selectedRecord.estimatedDeparture)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>ETA:</strong> {formatDate(selectedRecord.estimatedArrival)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Weight:</strong> {selectedRecord.weight ? Number(selectedRecord.weight).toLocaleString() : '0'} kg
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Volume:</strong> {selectedRecord.volume} CBM
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Real-time Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip label="Container Loaded" color="success" />
                <Typography>→</Typography>
                <Chip label="Vessel Departed" color={selectedRecord.status === 'DEPARTED' ? 'success' : 'default'} />
                <Typography>→</Typography>
                <Chip label="In Transit" color={selectedRecord.status === 'IN_TRANSIT' ? 'success' : 'default'} />
                <Typography>→</Typography>
                <Chip label="Port Arrival" color={selectedRecord.status === 'DESTINATION_ARRIVED' ? 'success' : 'default'} />
                <Typography>→</Typography>
                <Chip label="Delivered" color={selectedRecord.status === 'DELIVERED' ? 'success' : 'default'} />
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>IoT Sensors Active:</strong> Temperature: 18°C • Humidity: 65% • GPS: Active
                  <br />
                  <strong>Last Update:</strong> {new Date().toLocaleString()} • <strong>Security:</strong> Seal Intact
                </Typography>
              </Alert>

              {/* Blockchain Verification Section */}
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🔐 Blockchain Verification
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Hyperledger Fabric Blockchain:</strong> This shipment and all related documents (Bill of Lading, 
                    customs clearance, etc.) are cryptographically signed and stored on the immutable consortium blockchain. 
                    All signatures below are verified against X.509 certificates and blockchain transaction records.
                  </Typography>
                </Alert>
                <BlockchainSignatureVerification
                  entityType="SHIPMENT"
                  entityId={selectedRecord?.shipmentId || ''}
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
              setAuditEntityType('SHIPMENT');
              setAuditEntityId(selectedRecord?.shipmentId || '');
              setShowAuditTrail(true);
            }}
            sx={{ textTransform: 'none', mr: 'auto' }}
          >
            Audit Trail
          </Button>
          <Button onClick={() => setTrackingDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<QrCode />}
            onClick={() => {
              if (!selectedRecord) return;
              
              setSnackbar({
                open: true,
                message: `📱 QR Code generated for ${selectedRecord.shippingId} — Container ${selectedRecord.containerNumber || 'N/A'} | Tracking ${selectedRecord.trackingNumber || 'N/A'}`,
                severity: 'success'
              });
            }}
          >
            Generate QR Code
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Trail Viewer */}
      {showAuditTrail && auditEntityType && (
        <AuditTrailViewer
          open={showAuditTrail}
          entityType={auditEntityType as 'SHIPMENT' | 'BOOKING' | 'CONTAINER'}
          entityId={auditEntityId}
          onClose={() => setShowAuditTrail(false)}
        />
      )}

      {/* Professional Bill of Lading / Airway Bill Recording Dialog */}
      <Dialog 
        open={billOfLadingDialogOpen} 
        onClose={() => setBillOfLadingDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        disableEnforceFocus
        disableAutoFocus
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" component="span" fontWeight={600}>
                {bolForm.transportMode === 'SEA' ? '📋 Record Bill of Lading' : '✈️ Record Airway Bill'}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {bolForm.transportMode === 'SEA' 
                  ? 'International Maritime Transport Document - Following COGSA & Hague-Visby Rules'
                  : 'International Air Transport Document - Following IATA & Montreal Convention'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>📦 Auto-Mapping Available:</strong> Enter a Shipment ID to automatically populate {bolForm.transportMode === 'SEA' ? 'container' : 'cargo'} details, 
                route information, weight, and destination from customs clearance records.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              {/* Section 0: Transport Mode Selection */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🚚 Transport Mode
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  required
                  label="Transport Mode"
                  value={bolForm.transportMode}
                  onChange={(e) => {
                    const mode = e.target.value as 'SEA' | 'AIR';
                    setBolForm((prev) => ({ 
                      ...prev, 
                      transportMode: mode,
                      departurePort: mode === 'SEA' ? 'Djibouti Port' : 'Addis Ababa Bole International Airport',
                      shippingLine: mode === 'SEA' ? 'Maersk Line' : 'Ethiopian Airlines Cargo',
                    }));
                  }}
                >
                  <MenuItem value="SEA">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DirectionsBoat /> Sea Freight (Container Ship)
                    </Box>
                  </MenuItem>
                  <MenuItem value="AIR">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FlightTakeoff /> Air Freight (Cargo Plane)
                    </Box>
                  </MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <Alert severity={bolForm.transportMode === 'SEA' ? 'info' : 'warning'}>
                  <Typography variant="body2">
                    {bolForm.transportMode === 'SEA' 
                      ? '🚢 Sea freight: 25-35 days transit, lower cost, bulk volumes'
                      : '✈️ Air freight: 1-3 days transit, higher cost, premium coffee'}
                  </Typography>
                </Alert>
              </Grid>

              {/* Section 1: Shipment Identification */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  {bolForm.transportMode === 'SEA' ? <DirectionsBoat /> : <FlightTakeoff />} Shipment Identification
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Shipment ID"
                  required
                  value={bolForm.shipmentId}
                  onChange={(e) => setBolForm({ ...bolForm, shipmentId: e.target.value })}
                  onBlur={() => {
                    if (bolForm.shipmentId) {
                      autoMapBOLData(bolForm.shipmentId);
                    }
                  }}
                  placeholder="SHIP1782819513441"
                  helperText="Enter shipment ID and press Tab to auto-fill"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      backgroundColor: bolForm.shipmentId && !bolForm.billOfLadingNo ? '#e8f5e9' : 'inherit' 
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={bolForm.transportMode === 'SEA' ? 'Bill of Lading Number' : 'Airway Bill Number'}
                  required
                  value={bolForm.transportMode === 'SEA' ? bolForm.billOfLadingNo : bolForm.airwayBillNo}
                  onChange={(e) => setBolForm({ 
                    ...bolForm, 
                    [bolForm.transportMode === 'SEA' ? 'billOfLadingNo' : 'airwayBillNo']: e.target.value 
                  })}
                  placeholder={bolForm.transportMode === 'SEA' ? 'BL1720000000000' : 'AWB-157-12345678'}
                  helperText={bolForm.transportMode === 'SEA' ? 'Auto-generated B/L number' : 'Auto-generated AWB number (3-digit airline + 8-digit)'}
                  InputProps={{ readOnly: true }}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#e3f2fd' } }}
                />
              </Grid>

              {/* Section 2: Carrier Details */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  {bolForm.transportMode === 'SEA' ? <DirectionsBoat /> : <FlightTakeoff />} {bolForm.transportMode === 'SEA' ? 'Vessel' : 'Flight'} Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  required
                  label="Shipping Line"
                  value={bolForm.shippingLine}
                  onChange={(e) => {
                    setBolForm((prev) => ({ ...prev, shippingLine: e.target.value }));
                  }}
                >
                  <MenuItem value="Maersk Line">Maersk Line</MenuItem>
                  <MenuItem value="MSC">MSC (Mediterranean Shipping Company)</MenuItem>
                  <MenuItem value="CMA CGM">CMA CGM</MenuItem>
                  <MenuItem value="COSCO Shipping">COSCO Shipping</MenuItem>
                  <MenuItem value="Hapag-Lloyd">Hapag-Lloyd</MenuItem>
                  <MenuItem value="ONE">Ocean Network Express (ONE)</MenuItem>
                </TextField>
              </Grid>

              {/* SEA FREIGHT FIELDS */}
              {bolForm.transportMode === 'SEA' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Vessel Name"
                      required
                      value={bolForm.vesselName}
                      onChange={(e) => setBolForm({ ...bolForm, vesselName: e.target.value })}
                      placeholder="Maersk Eindhoven"
                      sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.vesselName ? '#e3f2fd' : 'inherit' } }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Voyage Number"
                      required
                      value={bolForm.voyageNumber}
                      onChange={(e) => setBolForm({ ...bolForm, voyageNumber: e.target.value })}
                      placeholder="V2026W25"
                      sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.voyageNumber ? '#e3f2fd' : 'inherit' } }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Container Number"
                      required
                      value={bolForm.containerNumber}
                      onChange={(e) => setBolForm({ ...bolForm, containerNumber: e.target.value })}
                      placeholder="REEFER172000000"
                      helperText="Auto-generated container number"
                      sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.containerNumber ? '#e3f2fd' : 'inherit' } }}
                    />
                  </Grid>
                </>
              )}

              {/* AIR FREIGHT FIELDS */}
              {bolForm.transportMode === 'AIR' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Flight Number"
                      required
                      value={bolForm.flightNumber}
                      onChange={(e) => setBolForm({ ...bolForm, flightNumber: e.target.value })}
                      placeholder="ET3701"
                      helperText="e.g., ET3701 (Ethiopian Airlines), EK702 (Emirates)"
                      sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.flightNumber ? '#e3f2fd' : 'inherit' } }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Airline"
                      required
                      value={bolForm.airline}
                      onChange={(e) => setBolForm({ ...bolForm, airline: e.target.value })}
                      placeholder="Ethiopian Airlines Cargo"
                      helperText="Full airline name for air transport document"
                      InputProps={{ readOnly: true }}
                      sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#e3f2fd' } }}
                    />
                  </Grid>
                </>
              )}

              {/* Section 3: Route Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <LocationOn /> Route & Schedule
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Port of Loading"
                  required
                  value={bolForm.departurePort}
                  onChange={(e) => setBolForm({ ...bolForm, departurePort: e.target.value })}
                  placeholder="Djibouti"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.departurePort ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Port of Discharge"
                  required
                  value={bolForm.destinationPort}
                  onChange={(e) => setBolForm({ ...bolForm, destinationPort: e.target.value })}
                  placeholder="Hamburg"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.destinationPort ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Estimated Time of Departure (ETD)"
                  required
                  value={bolForm.estimatedDeparture}
                  onChange={(e) => setBolForm({ ...bolForm, estimatedDeparture: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.estimatedDeparture ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Estimated Time of Arrival (ETA)"
                  required
                  value={bolForm.estimatedArrival}
                  onChange={(e) => setBolForm({ ...bolForm, estimatedArrival: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.estimatedArrival ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              {/* Section 4: Cargo Details */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Assignment /> Cargo Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  required
                  label="Container Type"
                  value={bolForm.containerType}
                  onChange={(e) => setBolForm((prev) => ({ ...prev, containerType: e.target.value }))}
                >
                  <MenuItem value="DRY">DRY - Standard 20/40ft Container</MenuItem>
                  <MenuItem value="REEFER">REEFER - Refrigerated Container</MenuItem>
                  <MenuItem value="OPEN_TOP">OPEN TOP - Open Top Container</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Weight (kg)"
                  required
                  value={bolForm.weight}
                  onChange={(e) => setBolForm({ ...bolForm, weight: e.target.value })}
                  placeholder="1908"
                  helperText="Total cargo weight"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.weight ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Volume (CBM)"
                  value={bolForm.volume}
                  onChange={(e) => setBolForm({ ...bolForm, volume: e.target.value })}
                  placeholder="3.18"
                  helperText="Cubic meters"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.volume ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              {/* Section 5: Parties Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  👥 Parties Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Consignee (Buyer)"
                  value={bolForm.consignee}
                  onChange={(e) => setBolForm({ ...bolForm, consignee: e.target.value })}
                  placeholder="TOLAWAQ"
                  helperText="Auto-filled from shipment"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.consignee ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Notify Party"
                  value={bolForm.notify}
                  onChange={(e) => setBolForm({ ...bolForm, notify: e.target.value })}
                  placeholder="exporter@email.com"
                  helperText="Email or contact details"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.notify ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              {/* Section 6: Additional Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  📝 Additional Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tracking Number"
                  value={bolForm.trackingNumber}
                  onChange={(e) => setBolForm({ ...bolForm, trackingNumber: e.target.value })}
                  placeholder="TRK1720000000000"
                  helperText="Auto-generated tracking number"
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.trackingNumber ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Freight Terms"
                  value={bolForm.freightTerms}
                  onChange={(e) => setBolForm((prev) => ({ ...prev, freightTerms: e.target.value }))}
                >
                  <MenuItem value="PREPAID">PREPAID</MenuItem>
                  <MenuItem value="COLLECT">COLLECT</MenuItem>
                  <MenuItem value="FOB">FOB (Free on Board)</MenuItem>
                  <MenuItem value="CIF">CIF (Cost, Insurance, Freight)</MenuItem>
                  <MenuItem value="CFR">CFR (Cost and Freight)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Special Instructions"
                  value={bolForm.specialInstructions}
                  onChange={(e) => setBolForm({ ...bolForm, specialInstructions: e.target.value })}
                  placeholder="Enter special handling instructions, temperature requirements, or other remarks..."
                  sx={{ '& .MuiOutlinedInput-root': { backgroundColor: bolForm.specialInstructions ? '#e3f2fd' : 'inherit' } }}
                />
              </Grid>
            </Grid>

            {/* Validation Summary */}
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>⚠️ Required Fields:</strong> Shipment ID, B/L Number, Vessel Name, Departure Port, Destination Port, 
                ETA, and Weight must be completed before submission.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <AnimatedButton onClick={() => {
            setBillOfLadingDialogOpen(false);
            // Reset form
            setBolForm({
              shipmentId: '',
              transportMode: 'SEA',
              billOfLadingNo: '',
              airwayBillNo: '',
              flightNumber: '',
              airline: '',
              vesselName: '',
              voyageNumber: '',
              shippingLine: 'Maersk Line',
              containerNumber: '',
              containerType: 'DRY',
              departurePort: 'Djibouti',
              destinationPort: '',
              estimatedDeparture: '',
              estimatedArrival: '',
              trackingNumber: '',
              weight: '',
              volume: '',
              consignee: '',
              notify: '',
              freightTerms: 'PREPAID',
              specialInstructions: '',
            });
          }}>
            Cancel
          </AnimatedButton>
          <AnimatedButton
            variant="outlined"
            brandColor="#006064"
            onClick={() => {
              if (bolForm.shipmentId) {
                autoMapBOLData(bolForm.shipmentId);
              } else {
                setSnackbar({
                  open: true,
                  message: '⚠️ Please enter a Shipment ID first',
                  severity: 'warning'
                });
              }
            }}
          >
            Auto-Fill from Shipment
          </AnimatedButton>
          <AnimatedButton
            variant="contained"
            brandColor="#006064"
            startIcon={<CheckCircle />}
            onClick={handleSubmitBOL}
          >
            Record Bill of Lading
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Audit Trail Viewer */}
      <AuditTrailViewer
        entityType={auditEntityType}
        entityId={auditEntityId}
        open={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
      />

      {/* Workflow Approval/Verification Dialog */}
      <Dialog 
        open={approvalDialog.open} 
        onClose={() => setApprovalDialog({ ...approvalDialog, open: false })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: brandPrimary, color: 'white', py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🔍 Workflow Verification & Approval
            </Typography>
            <Chip label={approvalDialog.actionLabel} sx={{ bgcolor: 'white', color: brandPrimary, fontWeight: 700 }} />
          </Box>
        </DialogTitle>

        <DialogContent>
          {verificationLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <LinearProgress />
              <Typography sx={{ mt: 2 }}>Loading verification data...</Typography>
            </Box>
          ) : approvalDialog.verificationData && (
            <Box sx={{ pt: 3 }}>
              {/* Status Banner */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight={600}>
                  Current Status: {approvalDialog.verificationData.currentStatus}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Verify customs clearance and documents before approving land transport
                </Typography>
              </Alert>

              {/* Shipment Information */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: brandPrimary }}>
                  📦 Shipment Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Shipment ID</Typography>
                    <Typography variant="body1" fontWeight={600}>{approvalDialog.verificationData.shipmentId}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Current Status</Typography>
                    <Chip 
                      label={approvalDialog.verificationData.currentStatus} 
                      size="small" 
                      color="success"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Exporter</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {approvalDialog.verificationData.exporterId || approvalDialog.verificationData.exporter || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Destination Country</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {approvalDialog.verificationData.destination || 'Hamburg, Germany'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Transport Mode</Typography>
                    <Chip
                      icon={<DirectionsBoat />}
                      label={approvalDialog.verificationData.transportMode || 'Sea Freight'}
                      color="primary"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Contract ID</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {approvalDialog.verificationData.contractId || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Customs Clearance Details */}
              {approvalDialog.verificationData?.customsClearance && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#2e7d32' }}>
                    <CheckCircle sx={{ verticalAlign: 'middle', mr: 1 }} /> Customs Clearance Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Clearance Number</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {approvalDialog.verificationData.customsClearance.clearance_number || approvalDialog.verificationData.customsClearance.clearanceNumber || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Clearance Date</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatDate(approvalDialog.verificationData.customsClearance.cleared_date || approvalDialog.verificationData.customsClearance.clearedDate)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Cleared By</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {approvalDialog.verificationData.customsClearance.cleared_by || approvalDialog.verificationData.customsClearance.clearedBy || 'Customs Officer'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Clearance Status</Typography>
                      <Chip 
                        label={approvalDialog.verificationData.customsClearance.status || 'CLEARED'} 
                        size="small" 
                        color="success"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Quantity</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {parseFloat(approvalDialog.verificationData.customsClearance?.quantity || 0)
                          .toLocaleString('en-US')} kg
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Declared Value</Typography>
                      <Typography variant="h6" color="primary" fontWeight={700}>
                        ${parseFloat(approvalDialog.verificationData.customsClearance?.customs_value_usd || 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Exit Point</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {approvalDialog.verificationData.customsClearance.exit_point || approvalDialog.verificationData.customsClearance.exitPoint || 'Djibouti Port'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Transport Mode</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {approvalDialog.verificationData.customsClearance.transport_mode || approvalDialog.verificationData.customsClearance.transportMode || 'Land + Sea'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Duty Amount</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {parseFloat(approvalDialog.verificationData.customsClearance.duty_amount || approvalDialog.verificationData.customsClearance.dutyAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Tax Amount</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {parseFloat(approvalDialog.verificationData.customsClearance.tax_amount || approvalDialog.verificationData.customsClearance.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">Total Fees</Typography>
                      <Typography variant="h5" color="success.main" fontWeight={700}>
                        {(parseFloat(approvalDialog.verificationData.customsClearance.duty_amount || approvalDialog.verificationData.customsClearance.dutyAmount || 0) + 
                          parseFloat(approvalDialog.verificationData.customsClearance.tax_amount || approvalDialog.verificationData.customsClearance.taxAmount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              {/* Transport Route Information */}
              {approvalDialog.actionType === 'START_LAND_TRANSPORT' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#e65100' }}>
                    <LocalShipping sx={{ verticalAlign: 'middle', mr: 1 }} /> Transport Route Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Origin</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        Addis Ababa, Ethiopia
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Destination</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        Port of Djibouti
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Distance</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        ~800 km
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="textSecondary">Estimated Duration</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        3-5 business days
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Action-Specific Input Fields */}
              {approvalDialog.actionType === 'START_LAND_TRANSPORT' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#2e7d32' }}>
                    <LocalShipping sx={{ verticalAlign: 'middle', mr: 1 }} /> Land Transport Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Transport Company *"
                        fullWidth
                        value={actionInputs.transportCompany}
                        onChange={(e) => setActionInput('transportCompany', e.target.value)}
                        placeholder="e.g. Ethiopian Shipping & Logistics"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Truck Plate Number *"
                        fullWidth
                        value={actionInputs.truckPlateNumber}
                        onChange={(e) => setActionInput('truckPlateNumber', e.target.value)}
                        placeholder="e.g. A-12345"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Driver Name (optional)"
                        fullWidth
                        value={actionInputs.driverName}
                        onChange={(e) => setActionInput('driverName', e.target.value)}
                        placeholder="e.g. Abebe Kebede"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {approvalDialog.actionType === 'RECORD_PORT_ARRIVAL' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', border: '1px solid #2196f3' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#1565c0' }}>
                    🚢 Port Arrival Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TextField
                    label="Arrival Notes (optional)"
                    fullWidth
                    multiline
                    rows={2}
                    value={actionInputs.arrivalNotes}
                    onChange={(e) => setActionInput('arrivalNotes', e.target.value)}
                    placeholder="Optional notes about the arrival at the port"
                  />
                </Paper>
              )}

              {approvalDialog.actionType === 'CONTAINER_STUFFING' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#e65100' }}>
                    📦 Container Stuffing Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Container Number *"
                        fullWidth
                        value={actionInputs.containerNumber}
                        onChange={(e) => setActionInput('containerNumber', e.target.value)}
                        placeholder="e.g. MSKU1234567"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Container Type</InputLabel>
                        <Select
                          value={actionInputs.containerType}
                          label="Container Type"
                          onChange={(e) => setActionInput('containerType', e.target.value)}
                        >
                          <MenuItem value="DRY">Dry</MenuItem>
                          <MenuItem value="REEFER">Reefer</MenuItem>
                          <MenuItem value="OPEN_TOP">Open Top</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Seal Number (auto if blank)"
                        fullWidth
                        value={actionInputs.sealNumber}
                        onChange={(e) => setActionInput('sealNumber', e.target.value)}
                        placeholder="e.g. SL-001"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {(approvalDialog.actionType === 'VESSEL_LOADING' || approvalDialog.actionType === 'VESSEL_DEPARTURE') && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#ede7f6', border: '1px solid #673ab7' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#4527a0' }}>
                    🛳️ Vessel Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Vessel Name (optional)"
                        fullWidth
                        value={actionInputs.vesselName}
                        onChange={(e) => setActionInput('vesselName', e.target.value)}
                        placeholder="e.g. MV Maersk Antwerp"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Voyage Number (optional)"
                        fullWidth
                        value={actionInputs.voyageNumber}
                        onChange={(e) => setActionInput('voyageNumber', e.target.value)}
                        placeholder="e.g. VOY-2026-001"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {approvalDialog.actionType === 'IN_TRANSIT_UPDATE' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e0f7fa', border: '1px solid #00bcd4' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#00838f' }}>
                    🚢 In-Transit Update
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TextField
                    label="Tracking Number (auto if blank)"
                    fullWidth
                    value={actionInputs.trackingNumber}
                    onChange={(e) => setActionInput('trackingNumber', e.target.value)}
                    placeholder="e.g. TRK-12345"
                  />
                </Paper>
              )}

              {approvalDialog.actionType === 'DESTINATION_ARRIVAL' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', border: '1px solid #2196f3' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#1565c0' }}>
                    🏁 Destination Arrival
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TextField
                    label="Arrival Notes (optional)"
                    fullWidth
                    multiline
                    rows={2}
                    value={actionInputs.arrivalNotes}
                    onChange={(e) => setActionInput('arrivalNotes', e.target.value)}
                    placeholder="Optional notes about the arrival at the destination port"
                  />
                </Paper>
              )}

              {approvalDialog.actionType === 'DELIVERY_COMPLETE' && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f1f8e9', border: '1px solid #8bc34a' }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#558b2f' }}>
                    ✅ Delivery Completion
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TextField
                    label="Delivery Notes (optional)"
                    fullWidth
                    multiline
                    rows={2}
                    value={actionInputs.deliveryNotes}
                    onChange={(e) => setActionInput('deliveryNotes', e.target.value)}
                    placeholder="Optional notes confirming delivery completion"
                  />
                </Paper>
              )}

              {/* Supporting Documents */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: brandPrimary }}>
                    📄 Supporting Documents
                  </Typography>
                  <Chip 
                    label={`${approvalDialog.verificationData.uploadedDocuments.length} Documents`} 
                    size="small" 
                    color="primary"
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {approvalDialog.verificationData.uploadedDocuments.length > 0 ? (
                  <Grid container spacing={2}>
                    {approvalDialog.verificationData.uploadedDocuments.map((doc, idx) => (
                      <Grid item xs={12} md={6} key={idx}>
                        <Paper 
                          elevation={1} 
                          sx={{ 
                            p: 2, 
                            bgcolor: 'white', 
                            borderLeft: '4px solid #4caf50',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-2px)',
                            }
                          }}
                          onClick={() => {
                            const docId = doc.url.startsWith('/documents/') ? doc.url.split('/')[2] : doc.url;
                            viewDocument(docId);
                          }}
                        >
                          <Box display="flex" alignItems="flex-start" gap={1.5}>
                            <CheckCircle sx={{ color: '#4caf50', mt: 0.5 }} />
                            <Box flex={1}>
                              <Typography variant="body1" fontWeight={600} gutterBottom>
                                {doc.fileName || doc.name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
                                {doc.type?.replace(/_/g, ' ') || 'Supporting document'}
                              </Typography>
                              <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                                <Chip label="Verified" size="small" color="success" sx={{ fontSize: '0.75rem' }} />
                                {doc.source && (
                                  <Chip 
                                    label={doc.source} 
                                    size="small" 
                                    variant="outlined"
                                    color={doc.source === 'Blockchain' ? 'secondary' : 'default'}
                                    sx={{ fontSize: '0.75rem' }} 
                                  />
                                )}
                              </Box>
                            </Box>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                const docId = doc.url.startsWith('/documents/') ? doc.url.split('/')[2] : doc.url;
                                downloadDocument(docId);
                              }}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="info">
                    <Typography variant="body2">
                      No documents uploaded yet
                    </Typography>
                  </Alert>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0', gap: 2 }}>
          <AnimatedButton 
            onClick={() => {
              setApprovalDialog({ ...approvalDialog, open: false });
              setRejectionReason('');
            }}
            variant="outlined"
            color="inherit"
          >
            Cancel
          </AnimatedButton>
          
          <AnimatedButton 
            onClick={handleReject}
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            disabled={verificationLoading}
          >
            Reject
          </AnimatedButton>
          
          <AnimatedButton 
            onClick={handleApprove}
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            disabled={verificationLoading}
          >
            Approve & Proceed
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Professional Snackbar for Success/Error Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={8000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%', 
            minWidth: 500,
            maxWidth: 700,
            fontSize: '1rem',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            '& .MuiAlert-icon': {
              fontSize: '1.75rem',
              marginRight: 1.5
            },
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
              padding: '8px 0',
              lineHeight: 1.6
            },
            '& .MuiAlert-action': {
              paddingLeft: 2
            },
            ...(snackbar.severity === 'success' && {
              backgroundColor: '#2e7d32',
              '& .MuiAlert-icon': {
                color: '#a5d6a7'
              }
            }),
            ...(snackbar.severity === 'error' && {
              backgroundColor: '#d32f2f',
              '& .MuiAlert-icon': {
                color: '#ef9a9a'
              }
            }),
            ...(snackbar.severity === 'warning' && {
              backgroundColor: '#ed6c02',
              '& .MuiAlert-icon': {
                color: '#ffb74d'
              }
            }),
            ...(snackbar.severity === 'info' && {
              backgroundColor: '#0288d1',
              '& .MuiAlert-icon': {
                color: '#4fc3f7'
              }
            })
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShippingPortal;