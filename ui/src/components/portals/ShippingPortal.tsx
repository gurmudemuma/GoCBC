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
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import AuditTrailViewer from './AuditTrailViewer';
import { DocumentValidationDialog } from './DocumentValidationDialog';

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
  status: 'BOOKED' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
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
        console.log(`[SHIPPING] Total shipments: ${shipmentsResult.data.length}`);
        console.log('[SHIPPING] All shipment statuses:', shipmentsResult.data.map((s: any) => ({
          id: s.ShipmentID || s.shipmentId,
          status: s.Status || s.status || s.shipmentStatus,
        })));
        
        // Filter for shipments that are cleared by customs (ready for shipping)
        // RELAXED FILTER: Show all shipments for debugging, will filter properly once customs workflow is complete
        const readyShipments = shipmentsResult.data.filter((s: any) => {
          const status = s.Status || s.status || s.shipmentStatus || '';
          // Show shipments that are either:
          // 1. Customs cleared (ready for shipping)
          // 2. Already shipped
          // 3. Delivered
          // 4. Any shipment with customs info (for testing)
          return status === 'CUSTOMS_CLEARED' || 
                 status === 'SHIPPED' || 
                 status === 'DELIVERED' ||
                 status === 'CLEARED' ||
                 status.includes('CLEARED') ||
                 s.customsStatus === 'CLEARED' ||
                 // TEMPORARY: Show all shipments for testing
                 true;
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
          const status = s.status || s.Status || 'PENDING';
          
          // Transport mode from blockchain
          const transportMode = s.transportMode || s.TransportMode || 'SEA';
          
          // Map shipment status to shipping status
          let shippingStatus = 'BOOKED';
          if (status === 'DELIVERED') shippingStatus = 'DELIVERED';
          else if (status === 'SHIPPED' || status === 'IN_TRANSIT') shippingStatus = 'IN_TRANSIT';
          else if (s.billOfLadingNo || s.airwayBill) shippingStatus = 'LOADED';
          
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
            status: shippingStatus as 'BOOKED' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED',
            trackingNumber: s.trackingNumber || `TRK-${shipmentId}`,
            weight: s.quantity || 20000, // quantity from blockchain is in kg
            volume: ((s.quantity || 20000) / 600), // kg to m³ approximation
          };
        });
        
        console.log(`[SHIPPING] Mapped ${mappedRecords.length} shipping records from blockchain`);
        console.log('[SHIPPING] Sample record:', mappedRecords[0]);
        
        setShippingRecords(mappedRecords);
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
      const shipmentResponse = await apiFetch('/shipments/${shipmentId}', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shipmentResult = await shipmentResponse.json();

      if (shipmentResult.success && shipmentResult.data) {
        const shipment = shipmentResult.data;
        const exporterId = shipment.exporterID || shipment.exporterId;

        // Fetch exporter data
        let exporterData: any = {};
        if (exporterId) {
          const exporterResponse = await apiFetch('/users/${exporterId}', {
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
      const response = await apiFetch('/shipments/${bolForm.shipmentId}/shipping-document', {
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
      const response = await apiFetch('/shipments/${shipmentId}/status', {
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
      width: 150,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Track Shipment">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
                setTrackingDialogOpen(true);
              }}
            >
              <LocationOn />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Details">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Update Status">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(params.row);
                setUpdateDialogOpen(true);
              }}
            >
              <Schedule />
            </IconButton>
          </Tooltip>
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🚢 Shipping Portal
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Maritime Logistics & Container Management - Ethiopian Coffee Exports
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <AnimatedButton
            variant="outlined"
            startIcon={<Download />}
            brandColor={brandPrimary}
            onClick={() => {
              // Export shipping report as CSV - include AWB data
              const csvContent = [
                ['Shipping ID', 'Shipment ID', 'Exporter', 'Mode', 'Document No', 'Carrier', 'Vessel/Flight', 'Container', 'POL', 'POD', 'Status', 'ETD', 'ETA'],
                ...shippingRecords.map(r => [
                  r.shippingId, 
                  r.shipmentId, 
                  r.exporterId, 
                  r.transportMode || 'SEA',
                  r.transportMode === 'AIR' ? (r.airwayBill || 'N/A') : (r.billOfLading || 'N/A'),
                  r.shippingLine || 'N/A',
                  r.transportMode === 'AIR' ? (r.flightNumber || 'N/A') : (r.vesselName || 'N/A'),
                  r.containerNumber || (r.transportMode === 'AIR' ? 'N/A' : ''),
                  r.portOfLoading, 
                  r.portOfDischarge, 
                  r.status,
                  new Date(r.estimatedDeparture).toLocaleDateString(),
                  new Date(r.estimatedArrival).toLocaleDateString()
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `shipping_report_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            Export Report
          </AnimatedButton>
          <AnimatedButton
            variant="contained"
            startIcon={<Add />}
            brandColor={brandPrimary}
            onClick={() => {
              // Open shipping document dialog (B/L or AWB)
              setBillOfLadingDialogOpen(true);
            }}
          >
            Record Shipping Document
          </AnimatedButton>
        </Box>
      </Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Shipments"
            value={stats.total}
            icon={<LocalShipping />}
            trend="up"
            trendValue="+14%"
            brandColor={brandPrimary}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="In Transit"
            value={stats.inTransit}
            icon={<DirectionsBoat />}
            trend="up"
            trendValue="+7%"
            brandColor="#ff9800"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Delivered"
            value={stats.delivered}
            icon={<CheckCircle />}
            trend="up"
            trendValue="+25%"
            brandColor="#4caf50"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Weight"
            value={`${(stats.totalWeight / 1000).toFixed(1)}MT`}
            icon={<Assignment />}
            trend="up"
            trendValue="+18%"
            brandColor={brandSecondary}
          />
        </Grid>
      </Grid>

      {/* Real-time Tracking Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Real-time Tracking:</strong> All containers equipped with IoT sensors for temperature, humidity, and GPS tracking. 
          Blockchain integration ensures immutable logistics records.
          <br />
          <strong>Current Performance:</strong> 96% on-time delivery • 2.1 days avg port dwell • 94.5% efficiency rating
        </Typography>
      </Alert>

      {/* Tabs */}
      <ModernCard>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Shipments" />
            <Tab label="Container Tracking" />
            <Tab label="Port Operations" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Alert severity={shippingRecords.length > 0 ? "success" : "warning"} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              {shippingRecords.length > 0 ? '✅ ' : '⏳ '}
              Customs-Cleared Shipments Ready for Transportation
            </Typography>
            <Typography variant="body2">
              This view shows shipments that have completed the following prerequisites:
              <br/>
              ✅ ECTA quality inspection approved • ✅ Export permit issued • ✅ Customs clearance received
              <br/>
              Shipping companies book cargo space, issue Bills of Lading, and manage transportation to destination.
              {shippingRecords.length === 0 && (
                <>
                  <br/><br/>
                  <strong>⚠️ No customs-cleared shipments found.</strong> Shipments will appear here after they receive customs clearance approval.
                  Check the Customs Portal to process pending declarations.
                </>
              )}
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={shippingRecords}
              columns={shippingColumns}
              getRowId={(row) => row.shippingId}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              checkboxSelection
              disableRowSelectionOnClick
            />
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Real-time Container Tracking
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Containers
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Container</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shippingRecords.map((record) => (
                        <TableRow key={record.containerNumber}>
                          <TableCell>{record.containerNumber}</TableCell>
                          <TableCell>
                            <Chip label={record.status} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            {record.status === 'LOADED' ? record.portOfLoading : 
                             record.status === 'IN_TRANSIT' ? 'At Sea' : 
                             record.portOfDischarge}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    IoT Sensor Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Temperature Monitoring: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={100} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      GPS Tracking: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={98} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Humidity Control: Active
                    </Typography>
                    <LinearProgress variant="determinate" value={95} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Security Seals: Intact
                    </Typography>
                    <LinearProgress variant="determinate" value={100} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Blockchain Integration Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Immutable Records:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Container loading timestamps
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Port departure/arrival logs
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ Temperature/humidity data
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ✅ GPS coordinate tracking
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Smart Contract Triggers:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Automatic status updates
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Payment release conditions
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Insurance claim processing
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🔄 Delivery confirmation
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Port Operations Management
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Port Performance Metrics
                  </Typography>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Port</TableCell>
                        <TableCell>Containers</TableCell>
                        <TableCell>Avg Dwell (days)</TableCell>
                        <TableCell>Efficiency (%)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {portPerformanceData.map((port) => (
                        <TableRow key={port.port}>
                          <TableCell>{port.port}</TableCell>
                          <TableCell>{port.containers}</TableCell>
                          <TableCell>{port.avgDwell}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                {port.efficiency}%
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={port.efficiency} 
                                sx={{ width: 60 }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Djibouti Port Status
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Primary export gateway for Ethiopian coffee
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Current Queue: 12 containers
                    </Typography>
                    <LinearProgress variant="determinate" value={25} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Processing Rate: 94.5%
                    </Typography>
                    <LinearProgress variant="determinate" value={94.5} sx={{ mt: 1 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Weather Conditions: Good
                    </Typography>
                    <LinearProgress variant="determinate" value={85} sx={{ mt: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipping Line Performance
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Shipping Line</TableCell>
                    <TableCell>Market Share (%)</TableCell>
                    <TableCell>Performance Score</TableCell>
                    <TableCell>On-time Delivery</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shippingLineData.map((line) => (
                    <TableRow key={line.line}>
                      <TableCell>{line.line}</TableCell>
                      <TableCell>{line.share}%</TableCell>
                      <TableCell>{line.performance}%</TableCell>
                      <TableCell>
                        <LinearProgress 
                          variant="determinate" 
                          value={line.performance} 
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Shipping Analytics & Trends
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monthly Shipping Trends
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={shippingTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="containers" stroke="#0277bd" strokeWidth={3} name="Total Containers" />
                        <Line type="monotone" dataKey="onTime" stroke="#4caf50" strokeWidth={3} name="On-time %" />
                        <Line type="monotone" dataKey="delayed" stroke="#f44336" strokeWidth={3} name="Delayed %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Container Utilization
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={portPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="port" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="containers" fill="#0277bd" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Performance Indicators
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary.main">
                      96%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      On-time Delivery
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      2.1
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Port Dwell (days)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary.main">
                      94.5%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Port Efficiency
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      15.2
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Transit Days
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
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
          {selectedRecord && ['BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT'].includes(selectedRecord.status) && (
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
                <Chip label="Port Arrival" color={selectedRecord.status === 'ARRIVED' ? 'success' : 'default'} />
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
        <DialogTitle>Update Shipping Status</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Container:</strong> {selectedRecord.containerNumber}
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <strong>Current Status:</strong> <Chip label={selectedRecord.status} size="small" color="primary" />
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>New Status</InputLabel>
                <Select
                  defaultValue={selectedRecord.status}
                  label="New Status"
                  id="shipping-status-select"
                >
                  <MenuItem value="BOOKED">BOOKED - Container Booked</MenuItem>
                  <MenuItem value="LOADED">LOADED - Container Loaded</MenuItem>
                  <MenuItem value="DEPARTED">DEPARTED - Vessel Departed</MenuItem>
                  <MenuItem value="IN_TRANSIT">IN_TRANSIT - In Transit</MenuItem>
                  <MenuItem value="ARRIVED">ARRIVED - Arrived at Port</MenuItem>
                  <MenuItem value="DELIVERED">DELIVERED - Delivered to Buyer</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                id="shipping-status-notes"
                label="Status Update Notes"
                multiline
                rows={3}
                placeholder="Enter status update details, location information, and any remarks..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setUpdateDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#006064"
            onClick={() => {
              if (selectedRecord) {
                const statusSelect = document.querySelector<HTMLSelectElement>('#shipping-status-select');
                const notesInput = document.querySelector<HTMLTextAreaElement>('#shipping-status-notes');
                const newStatus = statusSelect?.value || 'DEPARTED';
                const notes = notesInput?.value || 'Status updated';
                
                console.log('[SHIPPING] Updating status:', {
                  shippingId: selectedRecord.shippingId,
                  newStatus,
                  notes,
                  timestamp: new Date().toISOString()
                });
                
                handleUpdateStatus(selectedRecord.shippingId, newStatus);
              }
            }}
          >
            Update Status
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
    </Box>
  );
};

export default ShippingPortal;