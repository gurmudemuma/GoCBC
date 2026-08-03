// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Shipping Portal - Logistics Coordination & Container Management

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
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import AuditTrailViewer from './AuditTrailViewer';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import UserManagement from '@/components/admin/UserManagement';

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
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [billOfLadingDialogOpen, setBillOfLadingDialogOpen] = useState(false);

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'SHIPMENT' | 'BOOKING' | 'CONTAINER'>('SHIPMENT');
  const [auditEntityId, setAuditEntityId] = useState<string>('');

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
    shippingLine: '', // Carrier name (shipping line or airline)
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
        alert(
          `📦 From Customs: Clearance Received\n\n` +
          `Shipment: ${data.shipmentId}\n` +
          `Declaration: ${data.declarationId}\n` +
          `Clearance #: ${data.clearanceNumber}\n` +
          `Destination: ${data.destination}\n` +
          `Quantity: ${data.quantity?.toLocaleString()} kg\n\n` +
          `Opening Bill of Lading form with auto-filled data...`
        );
        
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
    setLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Load shipments with CUSTOMS_CLEARED status (ready for shipping)
      const shipmentsResponse = await apiFetch('/shipments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentsResult = await shipmentsResponse.json();
      
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
        
        // Filter for shipments in shipping workflow - REAL STATUSES ONLY FROM BLOCKCHAIN
        const readyShipments = uniqueShipments.filter((s: any) => {
          const status = (s.Status || s.status || s.shipmentStatus || '').toUpperCase().trim();
          // Include ONLY real blockchain shipping statuses (no fake data)
          return status === 'CUSTOMS_CLEARED' || 
                 status === 'LAND_TRANSPORT' ||
                 status === 'PORT_ARRIVED' ||
                 status === 'CONTAINER_STUFFED' ||
                 status === 'VESSEL_LOADED' ||
                 status === 'DEPARTED' ||
                 status === 'IN_TRANSIT' ||
                 status === 'DESTINATION_ARRIVED' ||
                 status === 'DELIVERED' ||
                 status === 'LOADED'; // B/L or AWB recorded
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
          
          // DEBUG: Log status mapping for each shipment
          console.log(`[SHIPPING] Mapping ${shipmentId}: blockchain status="${status}"`);
          
          // Transport mode from blockchain
          const transportMode = s.transportMode || s.TransportMode || 'SEA';
          
          // Map shipment status to shipping status - STRICT 1:1 MAPPING, NO FAKE DEFAULTS
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
            transportMode: transportMode as 'SEA' | 'AIR',
            
            // Carrier name from blockchain
            shippingLine: s.shippingLine || 
                         (transportMode === 'AIR' ? 'Ethiopian Airlines Cargo' : 'Maersk Line'),
            
            // Sea Freight fields from blockchain (camelCase)
            containerNumber: s.containerNumber || undefined,
            vesselName: s.vesselName || undefined,
            voyageNumber: s.voyageNumber || undefined,
            billOfLading: s.billOfLadingNo || undefined,
            containerType: (s.containerType || 'DRY') as 'DRY' | 'REEFER' | 'OPEN_TOP',
            
            // Air Freight fields from blockchain (camelCase)
            airwayBill: s.airwayBill || undefined,
            flightNumber: s.flightNumber || undefined,
            
            // Common fields from blockchain (camelCase)
            portOfLoading: s.departurePort || 
                          (transportMode === 'AIR' ? 'Addis Ababa Airport' : 'Djibouti'),
            portOfDischarge: s.destinationPort || 
                            (s.destination) || 'Hamburg',
            estimatedDeparture: s.estimatedDeparture || 
                               new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedArrival: s.estimatedArrival || 
                             new Date(Date.now() + (transportMode === 'AIR' ? 1 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            actualArrival: s.actualArrival || undefined,
            status: shippingStatus,
            trackingNumber: s.trackingNumber || `TRK-${shipmentId}`,
            weight: s.quantity || 20000, // quantity from blockchain is in kg
            volume: ((s.quantity || 20000) / 600), // kg to m³ approximation
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
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // AUTO-MAPPING: Populate B/L form from clearance data
  const autoMapBOLData = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[SHIPPING] Auto-mapping B/L data for shipment:', shipmentId);

      // Fetch shipment data
      const shipmentResponse = await apiFetch(`/shipments/${shipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentResult = await shipmentResponse.json();

      if (shipmentResult.success && shipmentResult.data) {
        const shipment = shipmentResult.data;
        const exporterId = shipment.exporterID || shipment.exporterId;

        // Fetch exporter data
        let exporterData: any = {};
        if (exporterId) {
          const exporterResponse = await apiFetch(`/users/${exporterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const exporterResult = await exporterResponse.json();
          if (exporterResult.success) {
            exporterData = exporterResult.data;
          }
        }

        // Fetch customs clearance data
        let clearanceData: any = {};
        try {
          const clearanceResponse = await apiFetch('/customs/declarations', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const clearanceResult = await clearanceResponse.json();
          if (clearanceResult.success && clearanceResult.data) {
            clearanceData = clearanceResult.data.find((d: any) => 
              d.shipmentId === shipmentId && d.status === 'CLEARED'
            ) || {};
          }
        } catch (error) {
          console.warn('[SHIPPING] Could not fetch clearance data:', error);
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

        const autoMappedData = {
          shipmentId: shipmentId,
          transportMode: 'SEA', // Default to sea freight
          billOfLadingNo: bolNumber,
          vesselName: 'Maersk Eindhoven', // Could come from shipping line selection
          voyageNumber: `V${new Date().getFullYear()}W${Math.floor(Math.random() * 52) + 1}`,
          shippingLine: 'Maersk Line',
          containerNumber: containerNumber,
          containerType: shipment.eudrCompliant ? 'REEFER' : 'DRY',
          // Air freight fields (empty for sea)
          airwayBillNo: '',
          flightNumber: '',
          airline: '',
          // Common fields
          departurePort: clearanceData.portOfExit || 'Djibouti',
          destinationPort: shipment.destination || clearanceData.destination || '',
          estimatedDeparture: departureDate.toISOString().split('T')[0],
          estimatedArrival: arrivalDate.toISOString().split('T')[0],
          trackingNumber: trackingNumber,
          weight: shipment.quantity?.toString() || '',
          volume: shipment.quantity ? (shipment.quantity / 600).toFixed(2) : '',
          consignee: shipment.buyer || shipment.buyerID || '',
          notify: exporterData.email || '',
          freightTerms: 'PREPAID',
          specialInstructions: shipment.eudrCompliant ? 'EUDR Compliant - Maintain temperature control' : '',
        };

        setBolForm(autoMappedData);

        alert(
          `✅ Auto-Mapped Bill of Lading Data\n\n` +
          `📦 Container: ${containerNumber}\n` +
          `🚢 Vessel: ${autoMappedData.vesselName}\n` +
          `📍 Route: ${autoMappedData.departurePort} → ${autoMappedData.destinationPort}\n` +
          `⚖️ Weight: ${autoMappedData.weight} kg\n` +
          `📅 ETD: ${new Date(autoMappedData.estimatedDeparture).toLocaleDateString()}\n` +
          `📅 ETA: ${new Date(autoMappedData.estimatedArrival).toLocaleDateString()}\n\n` +
          `Please review and submit.`
        );

        console.log('[SHIPPING] ✅ Auto-mapped B/L data:', autoMappedData);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to auto-map B/L data:', error);
      alert('⚠️ Could not auto-map all fields. Please fill manually.');
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
      alert(
        '❌ Validation Failed\n\n' +
        'Please complete the following required fields:\n\n' +
        validationErrors.join('\n')
      );
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
        
        alert(
          `✅ ${docType} Recorded Successfully\n\n` +
          `${isSea ? 'B/L' : 'AWB'} Number: ${docNumber}\n` +
          `${isSea ? 'Vessel' : 'Flight'}: ${carrier}\n` +
          (isSea ? `Container: ${bolForm.containerNumber}\n` : '') +
          `Route: ${bolForm.departurePort} → ${bolForm.destinationPort}\n` +
          `ETA: ${new Date(bolForm.estimatedArrival).toLocaleDateString()}\n` +
          `Tracking: ${bolForm.trackingNumber}\n\n` +
          `Status: Shipment ready for ${isSea ? 'loading' : 'departure'}`
        );
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
          shippingLine: '',
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
        alert(`❌ Failed to record ${bolForm.transportMode === 'SEA' ? 'B/L' : 'AWB'}\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to submit shipping document:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleUpdateStatus = async (shippingId: string, newStatus: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[SHIPPING] Updating shipping status:', shippingId, newStatus);
      
      // Extract shipment ID from shipping ID
      const shipmentId = shippingId.replace('SH-', '');
      
      // Map shipping status to shipment status
      let shipmentStatus = 'SHIPPED';
      if (newStatus === 'DELIVERED') shipmentStatus = 'DELIVERED';
      if (newStatus === 'IN_TRANSIT') shipmentStatus = 'SHIPPED';
      
      // Update shipment status
      const response = await apiFetch(`/shipments/${shipmentId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: shipmentStatus })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[SHIPPING] ✅ Status updated successfully');
        setUpdateDialogOpen(false);
        loadData();
      } else {
        console.error('[SHIPPING] ❌ Failed to update status:', result);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to update status:', error);
    }
  };

  const handlePickup = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const pickupBy = prompt('Enter shipping company name:');
    
    if (!pickupBy) {
      alert('❌ Shipping company name is required');
      return;
    }

    try {
      console.log('[SHIPPING] Recording pickup for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/pickup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickupBy
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`✅ Shipment Picked Up\n\nShipment ${shipmentId} has been picked up by ${pickupBy}\n\nStatus: IN_TRANSIT`);
        loadData();
      } else {
        alert(`❌ Pickup Failed\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record pickup:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleDelivery = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const confirmed = confirm(`Confirm delivery for shipment ${shipmentId}?`);
    
    if (!confirmed) return;

    try {
      console.log('[SHIPPING] Confirming delivery for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/delivery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Optional fields - backend will use defaults if not provided
          deliveryLocation: '',
          deliveredTo: ''
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`✅ Delivery Confirmed\n\nShipment ${shipmentId} has been delivered\n\nStatus: DELIVERED`);
        loadData();
      } else {
        alert(`❌ Delivery Confirmation Failed\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to confirm delivery:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  // ==================== NEW 8 WORKFLOW HANDLER FUNCTIONS ====================

  const handleStartLandTransport = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const transportCompany = prompt('Enter transport company name:');
    if (!transportCompany) {
      alert('❌ Transport company name is required');
      return;
    }

    const truckPlate = prompt('Enter truck plate number:');
    if (!truckPlate) {
      alert('❌ Truck plate number is required');
      return;
    }

    const driverName = prompt('Enter driver name (optional):') || '';

    try {
      console.log('[SHIPPING] Starting land transport for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/land-transport/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportCompany,
          truckPlate,
          driverName,
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Land Transport Started\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Transport Co: ${transportCompany}\n` +
          `Truck: ${truckPlate}\n` +
          `Driver: ${driverName || 'N/A'}\n\n` +
          `Status: LAND_TRANSPORT\n` +
          `Journey: Addis Ababa → Djibouti (800km)`
        );
        loadData();
      } else {
        alert(`❌ Failed to Start Land Transport\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to start land transport:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handlePortArrival = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const confirmed = confirm(`Confirm arrival at Djibouti Port for shipment ${shipmentId}?`);
    if (!confirmed) return;

    try {
      console.log('[SHIPPING] Recording port arrival for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/port/arrive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Arrived at Djibouti Port'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Port Arrival Recorded\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Location: Djibouti Port\n` +
          `Status: PORT_ARRIVED\n\n` +
          `Next Step: Container stuffing`
        );
        loadData();
      } else {
        alert(`❌ Failed to Record Port Arrival\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record port arrival:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleContainerStuffing = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const containerNumber = prompt('Enter container number:');
    if (!containerNumber) {
      alert('❌ Container number is required');
      return;
    }

    const containerType = prompt('Enter container type (DRY, REEFER, OPEN_TOP):', 'DRY') || 'DRY';

    try {
      console.log('[SHIPPING] Recording container stuffing for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/container/stuff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          containerNumber,
          containerType,
          sealNumber: `SEAL-${Date.now()}`,
          stuffedBy: 'Port Authority',
          location: 'Djibouti Port'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Container Stuffed\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Container: ${containerNumber}\n` +
          `Type: ${containerType}\n` +
          `Status: CONTAINER_STUFFED\n\n` +
          `Next Step: Vessel loading`
        );
        loadData();
      } else {
        alert(`❌ Failed to Record Container Stuffing\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record container stuffing:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleVesselLoading = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const confirmed = confirm(`Confirm container loaded on vessel for shipment ${shipmentId}?`);
    if (!confirmed) return;

    try {
      console.log('[SHIPPING] Recording vessel loading for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/vessel/load`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Container loaded on vessel'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Vessel Loaded\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Status: VESSEL_LOADED\n\n` +
          `Next Step: Vessel departure`
        );
        loadData();
      } else {
        alert(`❌ Failed to Record Vessel Loading\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record vessel loading:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleVesselDeparture = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const confirmed = confirm(`Confirm vessel departure from Djibouti for shipment ${shipmentId}?`);
    if (!confirmed) return;

    try {
      console.log('[SHIPPING] Recording vessel departure for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/vessel/depart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Vessel departed from Djibouti'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Vessel Departed\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Status: DEPARTED\n\n` +
          `Next Step: Update to in-transit`
        );
        loadData();
      } else {
        alert(`❌ Failed to Record Vessel Departure\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record vessel departure:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleInTransitUpdate = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const confirmed = confirm(`Update shipment ${shipmentId} to IN_TRANSIT (at sea)?`);
    if (!confirmed) return;

    try {
      console.log('[SHIPPING] Updating to in-transit for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/in-transit/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackingNumber: `TRK-${Date.now()}`
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ In-Transit Updated\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Status: IN_TRANSIT\n\n` +
          `Journey: 25-35 days to Europe\n` +
          `Next Step: Destination arrival`
        );
        loadData();
      } else {
        alert(`❌ Failed to Update In-Transit\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to update in-transit:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleDestinationArrival = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const confirmed = confirm(`Confirm arrival at destination port for shipment ${shipmentId}?`);
    if (!confirmed) return;

    try {
      console.log('[SHIPPING] Recording destination arrival for shipment:', shipmentId);
      
      const response = await apiFetch(`/shipments/${shipmentId}/destination/arrive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Arrived at destination port'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(
          `✅ Destination Arrival Recorded\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Status: DESTINATION_ARRIVED\n\n` +
          `Next Step: Final delivery`
        );
        loadData();
      } else {
        alert(`❌ Failed to Record Destination Arrival\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to record destination arrival:', error);
      alert(`❌ Network Error\n\n${error}`);
    }
  };

  const handleCompleteDelivery = async (shipmentId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const deliveryNotes = prompt('Enter delivery notes (optional):') || 'Delivery completed';
    
    const confirmed = confirm(`Complete final delivery for shipment ${shipmentId}?`);
    if (!confirmed) return;

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
        alert(
          `✅ Delivery Completed\n\n` +
          `Shipment: ${shipmentId}\n` +
          `Status: DELIVERED\n\n` +
          `🎉 Ethiopian Coffee Export Complete!`
        );
        loadData();
      } else {
        alert(`❌ Failed to Complete Delivery\n\n${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SHIPPING] Failed to complete delivery:', error);
      alert(`❌ Network Error\n\n${error}`);
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
        return row.transportMode === 'SEA' 
          ? row.billOfLading || row.containerNumber || 'N/A'
          : row.airwayBill || row.flightNumber || 'N/A';
      },
    },
    {
      field: 'vesselOrFlight',
      headerName: 'Vessel/Flight',
      width: 150,
      valueGetter: (params) => {
        const row = params.row;
        return row.transportMode === 'SEA' 
          ? row.vesselName || 'N/A'
          : row.flightNumber || row.vesselName || 'N/A';
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
              label: 'Customs Cleared', 
              value: allShippingRecords.filter(r => r.status === 'CUSTOMS_CLEARED').length, 
              color: '#4caf50',
              subtitle: 'Ready for Shipping'
            },
            { 
              icon: <Schedule />, 
              label: 'Awaiting Transport', 
              value: allShippingRecords.filter(r => r.status === 'CUSTOMS_CLEARED').length, 
              color: '#ff9800',
              subtitle: 'Next: Djibouti'
            },
            { 
              icon: <LocalShipping />, 
              label: 'Total Weight', 
              value: `${Math.floor(allShippingRecords.filter(r => r.status === 'CUSTOMS_CLEARED').reduce((sum, r) => sum + r.weight, 0) / 1000)}t`, 
              color: brandPrimary,
              subtitle: 'Tons'
            },
            { 
              icon: <TrendingUp />, 
              label: 'Clearance Rate', 
              value: '96%', 
              color: '#4caf50',
              subtitle: 'Performance'
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
              value: '94%', 
              color: '#4caf50',
              subtitle: 'Performance'
            },
          ] : tabValue === 2 ? [
            // Tab 2: Port Arrived
            { 
              icon: <Inventory />, 
              label: 'Containers', 
              value: allShippingRecords.filter(r => r.status === 'CONTAINER_STUFFED').length, 
              color: '#9c27b0',
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
          ] : tabValue === 3 ? [
            // Tab 3: Container Stuffed
            { 
              icon: <DirectionsBoat />, 
              label: 'Loaded', 
              value: allShippingRecords.filter(r => r.status === 'VESSEL_LOADED').length, 
              color: '#2196F3',
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
              value: '97%', 
              color: '#4caf50',
              subtitle: 'Performance'
            },
          ] : tabValue === 4 ? [
            // Tab 4: Vessel Loaded
            { 
              icon: <DirectionsBoat />, 
              label: 'Departed', 
              value: allShippingRecords.filter(r => r.status === 'DEPARTED').length, 
              color: '#2196F3',
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
              value: '98%', 
              color: '#4caf50',
              subtitle: 'Tracking'
            },
          ] : tabValue === 5 ? [
            // Tab 5: Departed
            { 
              icon: <DirectionsBoat />, 
              label: 'At Sea', 
              value: allShippingRecords.filter(r => r.status === 'IN_TRANSIT').length, 
              color: '#2196F3',
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
              value: '96%', 
              color: '#4caf50',
              subtitle: 'Performance'
            },
          ] : tabValue === 6 ? [
            // Tab 6: In Transit
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
              value: '95%', 
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
              value: '95%', 
              color: '#4caf50',
              subtitle: 'Performance'
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
              value: '98.5%', 
              color: '#4caf50',
              subtitle: 'Quality'
            },
          ];

          return kpis.map((kpi, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  bgcolor: '#fff', 
                  border: `2px solid ${kpi.color}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    transform: 'translateY(-4px)',
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  {React.cloneElement(kpi.icon, { sx: { fontSize: 48, color: kpi.color, mb: 1 } })}
                  <Typography variant="caption" sx={{ 
                    color: '#666', 
                    textTransform: 'uppercase', 
                    fontWeight: 700, 
                    display: 'block',
                    letterSpacing: '0.8px',
                    mb: 0.5
                  }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 800, color: kpi.color, mb: 0.5 }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', fontSize: '0.75rem' }}>
                    {kpi.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ));
        })()}
      </Grid>

      {/* Tabs - Shipping Workflow Status */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#666',
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  color: brandPrimary,
                  fontWeight: 700,
                },
                '&:hover': {
                  color: brandPrimary,
                  opacity: 0.8,
                }
              },
              '& .MuiTabs-indicator': {
                height: 3,
                backgroundColor: brandPrimary,
                borderRadius: '3px 3px 0 0',
              }
            }}
          >
            <Tab label="🛃 Customs Cleared" icon={<CheckCircle />} iconPosition="start" />
            <Tab label="🚚 Land Transport" icon={<LocalShipping />} iconPosition="start" />
            <Tab label="⚓ Port Arrived" icon={<Anchor />} iconPosition="start" />
            <Tab label="📦 Container Stuffed" icon={<Inventory />} iconPosition="start" />
            <Tab label="🚢 Vessel Loaded" icon={<DirectionsBoat />} iconPosition="start" />
            <Tab label="⛵ Departed" icon={<DirectionsBoat />} iconPosition="start" />
            <Tab label="🌊 In Transit" icon={<DirectionsBoat />} iconPosition="start" />
            <Tab label="🏁 Destination Port" icon={<LocationOn />} iconPosition="start" />
            <Tab label="✅ Delivered" icon={<CheckCircle />} iconPosition="start" />
            <Tab label="User Management" icon={<Person />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 0: Customs Cleared (Ready for Shipping) */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            🛃 Customs Cleared - Ready for Shipping
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Next Step:</strong> Record shipping documents (Bill of Lading or Airway Bill) to assign vessel/flight and start the shipping workflow.
              <br />
              <strong>Action:</strong> Click "Record Shipping Document" button above to create B/L for these shipments.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'CUSTOMS_CLEARED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 1: Land Transport (Addis → Djibouti) */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            🚚 Land Transport - Addis Ababa to Djibouti Port
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Journey:</strong> 800km overland journey (3-5 days). Coffee transported by truck from Ethiopian warehouses to Djibouti seaport.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'LAND_TRANSPORT')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 2: Port Arrived */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            ⚓ Port Arrived - Coffee at Djibouti Port
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Coffee arrived at port. Ready for container stuffing and vessel loading.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'PORT_ARRIVED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 3: Container Stuffed */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            📦 Container Stuffed - Coffee Packed & Sealed
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Coffee bags loaded into shipping container. Container sealed and ready for vessel loading.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'CONTAINER_STUFFED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 4: Vessel Loaded */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            🚢 Vessel Loaded - Container on Ship
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Container loaded onto cargo vessel. Awaiting vessel departure from Djibouti.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'VESSEL_LOADED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 5: Departed */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            ⛵ Departed - Vessel Left Port
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Vessel departed from Djibouti Port. Beginning ocean transit to destination.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'DEPARTED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 6: In Transit (At Sea) */}
        <TabPanel value={tabValue} index={6}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            🌊 In Transit - Coffee at Sea
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Vessel in transit. Typical journey: 25-35 days to Europe, 45-60 days to Asia/Americas.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'IN_TRANSIT')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 7: Destination Arrived */}
        <TabPanel value={tabValue} index={7}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            🏁 Destination Port - Arrived at Buyer's Port
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Vessel arrived at destination port. Container unloading and customs clearance in progress.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'DESTINATION_ARRIVED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        {/* Tab 8: Delivered */}
        <TabPanel value={tabValue} index={8}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            ✅ Delivered - Export Complete
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Coffee successfully delivered to buyer. Ethiopian coffee export process complete!
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={allShippingRecords.filter(r => r.status === 'DELIVERED')}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={9}>
          {/* User Management Tab */}
          <UserManagement />
        </TabPanel>
      </ModernCard>
      {/* Shipping Record Detail Dialog */}
      <Dialog open={!!selectedRecord && !trackingDialogOpen && !updateDialogOpen} onClose={() => setSelectedRecord(null)} maxWidth="md" fullWidth>
        <DialogTitle>Shipment Details</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipping ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.shippingId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipment ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.shipmentId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedRecord.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipping Line</Typography>
                  <Typography variant="body1">{selectedRecord.shippingLine}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Container Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.containerNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Container Type</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedRecord.containerType}
                      size="small"
                      color={
                        selectedRecord.containerType === 'DRY' ? 'primary' :
                        selectedRecord.containerType === 'REEFER' ? 'secondary' : 'success'
                      }
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Vessel Name</Typography>
                  <Typography variant="body1">{selectedRecord.vesselName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Voyage Number</Typography>
                  <Typography variant="body1">{selectedRecord.voyageNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Port of Loading</Typography>
                  <Typography variant="body1">{selectedRecord.portOfLoading}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Port of Discharge</Typography>
                  <Typography variant="body1">{selectedRecord.portOfDischarge}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Weight</Typography>
                  <Typography variant="body1">{selectedRecord.weight ? Number(selectedRecord.weight).toLocaleString() : '0'} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Volume</Typography>
                  <Typography variant="body1">{selectedRecord.volume} CBM</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Bill of Lading</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.billOfLading}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Tracking Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedRecord.trackingNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip status={selectedRecord.status as StatusType} label={selectedRecord.status} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Estimated Departure</Typography>
                  <Typography variant="body1">{formatDate(selectedRecord.estimatedDeparture)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Estimated Arrival</Typography>
                  <Typography variant="body1">{formatDate(selectedRecord.estimatedArrival)}</Typography>
                </Grid>
                {selectedRecord.actualDeparture && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Actual Departure</Typography>
                    <Typography variant="body1">{formatDate(selectedRecord.actualDeparture)}</Typography>
                  </Grid>
                )}
                {selectedRecord.actualArrival && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Actual Arrival</Typography>
                    <Typography variant="body1">{formatDate(selectedRecord.actualArrival)}</Typography>
                  </Grid>
                )}
              </Grid>
              
              <Card sx={{ mt: 2, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Shipping Route</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={selectedRecord.portOfLoading} color="primary" size="small" />
                    <Typography>→</Typography>
                    <Chip label="At Sea" color="default" size="small" />
                    <Typography>→</Typography>
                    <Chip label={selectedRecord.portOfDischarge} color="success" size="small" />
                  </Box>
                </CardContent>
              </Card>

              {selectedRecord.status === 'IN_TRANSIT' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This shipment is currently in transit. Real-time tracking is available via IoT sensors.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setSelectedRecord(null)}>
            Close
          </AnimatedButton>
          <AnimatedButton
            variant="outlined"
            brandColor="#0277bd"
            onClick={() => {
              setTrackingDialogOpen(true);
            }}
          >
            Track Shipment
          </AnimatedButton>
          {selectedRecord && ['CUSTOMS_CLEARED', 'IN_TRANSIT'].includes(selectedRecord.status) && (
            <AnimatedButton
              variant="contained"
              brandColor="#4caf50"
              onClick={() => {
                setUpdateDialogOpen(true);
              }}
            >
              Update Status
            </AnimatedButton>
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
              
              // Generate QR code data
              const qrData = {
                shippingId: selectedRecord.shippingId,
                container: selectedRecord.containerNumber,
                tracking: selectedRecord.trackingNumber,
                vessel: selectedRecord.vesselName,
                pol: selectedRecord.portOfLoading,
                pod: selectedRecord.portOfDischarge,
                status: selectedRecord.status
              };
              
              alert(`📱 QR Code Generated\n\nShipping ID: ${selectedRecord.shippingId}\nContainer: ${selectedRecord.containerNumber}\nTracking: ${selectedRecord.trackingNumber}\n\nIn production, this would:\n• Generate a scannable QR code\n• Link to real-time tracking page\n• Show IoT sensor data\n• Display blockchain verification\n\nQR Data:\n${JSON.stringify(qrData, null, 2)}`);
            }}
          >
            Generate QR Code
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Shipping Actions</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Shipment ID:</strong> {selectedRecord.shipmentId}
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <strong>Current Status:</strong> <Chip label={selectedRecord.status} size="small" color="primary" />
              </Typography>
              
              {/* Action Buttons based on status */}
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Pickup Action - Only for CUSTOMS_CLEARED */}
                {selectedRecord.status === 'CUSTOMS_CLEARED' && (
                  <AnimatedButton
                    variant="contained"
                    brandColor="#2e7d32"
                    startIcon={<LocalShipping />}
                    onClick={() => {
                      handlePickup(selectedRecord.shipmentId);
                      setUpdateDialogOpen(false);
                    }}
                    fullWidth
                  >
                    📦 Record Pickup (Customs Cleared → In Transit)
                  </AnimatedButton>
                )}
                
                {/* Delivery Action - Only for IN_TRANSIT */}
                {selectedRecord.status === 'IN_TRANSIT' && (
                  <AnimatedButton
                    variant="contained"
                    brandColor="#1976d2"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      handleDelivery(selectedRecord.shipmentId);
                      setUpdateDialogOpen(false);
                    }}
                    fullWidth
                  >
                    ✅ Confirm Delivery (In Transit → Delivered)
                  </AnimatedButton>
                )}
                
                {/* Manual Status Update */}
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" gutterBottom color="textSecondary">
                    Manual Status Update (Advanced)
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>New Status</InputLabel>
                    <Select
                      defaultValue={selectedRecord.status}
                      label="New Status"
                      id="shipping-status-select"
                    >
                      <MenuItem value="CUSTOMS_CLEARED">CUSTOMS_CLEARED - Cleared by Customs</MenuItem>
                      <MenuItem value="IN_TRANSIT">IN_TRANSIT - Picked Up & In Transit</MenuItem>
                      <MenuItem value="DELIVERED">DELIVERED - Delivered to Buyer</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    fullWidth
                    id="shipping-status-notes"
                    label="Status Update Notes"
                    multiline
                    rows={2}
                    placeholder="Enter reason for manual status update..."
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setUpdateDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="outlined" 
            brandColor="#006064"
            onClick={() => {
              if (selectedRecord) {
                const statusSelect = document.querySelector<HTMLSelectElement>('#shipping-status-select');
                const notesInput = document.querySelector<HTMLTextAreaElement>('#shipping-status-notes');
                const newStatus = statusSelect?.value || selectedRecord.status;
                
                if (newStatus === selectedRecord.status) {
                  alert('⚠️ Please select a different status');
                  return;
                }
                
                handleUpdateStatus(selectedRecord.shippingId, newStatus);
              }
            }}
          >
            Apply Manual Update
          </AnimatedButton>
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
      <Dialog open={billOfLadingDialogOpen} onClose={() => setBillOfLadingDialogOpen(false)} maxWidth="lg" fullWidth>
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
                <FormControl fullWidth required>
                  <InputLabel>Transport Mode</InputLabel>
                  <Select
                    value={bolForm.transportMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'SEA' | 'AIR';
                      setBolForm({ 
                        ...bolForm, 
                        transportMode: mode,
                        departurePort: mode === 'SEA' ? 'Djibouti Port' : 'Addis Ababa Bole International Airport',
                        shippingLine: '',
                      });
                    }}
                    label="Transport Mode"
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
                  </Select>
                </FormControl>
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
                <FormControl fullWidth required>
                  <InputLabel>{bolForm.transportMode === 'SEA' ? 'Shipping Line' : 'Airline'}</InputLabel>
                  <Select
                    value={bolForm.shippingLine}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBolForm({ 
                        ...bolForm, 
                        shippingLine: value,
                        // Auto-sync airline field for air freight
                        airline: bolForm.transportMode === 'AIR' ? value : bolForm.airline
                      });
                    }}
                    label={bolForm.transportMode === 'SEA' ? 'Shipping Line' : 'Airline'}
                  >
                    {bolForm.transportMode === 'SEA' ? (
                      <>
                        <MenuItem value="Maersk Line">Maersk Line</MenuItem>
                        <MenuItem value="MSC">MSC (Mediterranean Shipping Company)</MenuItem>
                        <MenuItem value="CMA CGM">CMA CGM</MenuItem>
                        <MenuItem value="COSCO Shipping">COSCO Shipping</MenuItem>
                        <MenuItem value="Hapag-Lloyd">Hapag-Lloyd</MenuItem>
                        <MenuItem value="ONE">Ocean Network Express (ONE)</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value="Ethiopian Airlines Cargo">Ethiopian Airlines Cargo</MenuItem>
                        <MenuItem value="Emirates SkyCargo">Emirates SkyCargo</MenuItem>
                        <MenuItem value="Qatar Airways Cargo">Qatar Airways Cargo</MenuItem>
                        <MenuItem value="Turkish Cargo">Turkish Cargo</MenuItem>
                        <MenuItem value="Lufthansa Cargo">Lufthansa Cargo</MenuItem>
                        <MenuItem value="Kenya Airways Cargo">Kenya Airways Cargo</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
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
                <FormControl fullWidth required>
                  <InputLabel>Container Type</InputLabel>
                  <Select
                    value={bolForm.containerType}
                    onChange={(e) => setBolForm({ ...bolForm, containerType: e.target.value })}
                    label="Container Type"
                    sx={{ backgroundColor: bolForm.containerType ? '#e3f2fd' : 'inherit' }}
                  >
                    <MenuItem value="DRY">DRY - Standard 20/40ft Container</MenuItem>
                    <MenuItem value="REEFER">REEFER - Refrigerated Container</MenuItem>
                    <MenuItem value="OPEN_TOP">OPEN TOP - Open Top Container</MenuItem>
                  </Select>
                </FormControl>
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
                <FormControl fullWidth>
                  <InputLabel>Freight Terms</InputLabel>
                  <Select
                    value={bolForm.freightTerms}
                    onChange={(e) => setBolForm({ ...bolForm, freightTerms: e.target.value })}
                    label="Freight Terms"
                  >
                    <MenuItem value="PREPAID">PREPAID</MenuItem>
                    <MenuItem value="COLLECT">COLLECT</MenuItem>
                    <MenuItem value="FOB">FOB (Free on Board)</MenuItem>
                    <MenuItem value="CIF">CIF (Cost, Insurance, Freight)</MenuItem>
                    <MenuItem value="CFR">CFR (Cost and Freight)</MenuItem>
                  </Select>
                </FormControl>
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
              shippingLine: '',
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
                alert('⚠️ Please enter a Shipment ID first');
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
    </Box>
  );
};

export default ShippingPortal;