// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Customs Portal - Export Declaration & Clearance Management

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
  MenuItem,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Snackbar,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  LocalShipping,
  Security,
  Assignment,
  Visibility,
  Download,
  Warning,
  Gavel,
  TrendingUp,
  QrCode,
  Upload,
  DirectionsBoat,
  FlightTakeoff,
  Person,
  Assessment,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api, { formatDate, formatCurrency, getStatusColor } from '@/utils/api';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import AuditTrailTable from './AuditTrailTable';
import AuditTrailViewer from './AuditTrailViewer';

// Modern Components - 2026 Design
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  StatusChip,
  ThemeToggle,
} from '@/components/modern';
import { CustomsInspection } from './CustomsInspection';
import { CustomsClearedShipments } from './CustomsClearedShipments';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentValidationDialog } from './DocumentValidationDialog';
import UserManagement from '@/components/admin/UserManagement';


// Status types for chips
type StatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLEARED' | 'HELD' | 'SUBMITTED' | 'UNDER_INSPECTION' | 'UNDER_REVIEW' | string;

interface CustomsDeclaration {
  declarationId: string;
  shipmentId: string;
  exporterId: string;
  declarationType: 'STANDARD' | 'SIMPLIFIED' | 'EUDR_ENHANCED';
  hsCode: string;
  quantity: number;
  value: number;
  currency: string;
  destination: string;
  transportMode?: 'SEA' | 'AIR';
  status: 'SUBMITTED' | 'UNDER_INSPECTION' | 'UNDER_REVIEW' | 'CLEARED' | 'HELD' | 'REJECTED';
  submissionDate: string;
  clearanceDate?: string;
  customsOfficer: string;
  inspectionRequired: boolean;
  eudrCompliant: boolean;
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

// ✅ FIX: Normalize shipment IDs for fuzzy matching (handles different formats)
const normalizeShipmentId = (id: string): string => {
  if (!id) return '';
  return id.replace(/[_\s-]/g, '').toUpperCase().trim();
};

const CustomsPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [declarations, setDeclarations] = useState<CustomsDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<CustomsDeclaration | null>(null);
  const [clearanceDialogOpen, setClearanceDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [newDeclarationDialogOpen, setNewDeclarationDialogOpen] = useState(false);
  const [customsDocUploadOpen, setCustomsDocUploadOpen] = useState(false);
  const [customsDocuments, setCustomsDocuments] = useState<any[]>([]);

  // Get current user role from local storage (matching other portals)
  const userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role || '';

  // Role-based tab filtering
  const getRoleBasedTabs = () => {
    const isSuperAdmin = userRole === 'ADMIN';
    
    const allTabs = [
      { index: 0, label: 'Permit Ready', icon: <Assignment />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Inspection Officer'] },
      { index: 1, label: 'Submitted', icon: <LocalShipping />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer'] },
      { index: 2, label: 'Inspecting', icon: <Security />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Inspection Officer'] },
      { index: 3, label: 'Under Review', icon: <Warning />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Clearance Officer'] },
      { index: 4, label: 'Cleared', icon: <CheckCircle />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Clearance Officer'] },
      { index: 5, label: 'Rejected', icon: <Cancel />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer'] },
      { index: 6, label: 'User Management', icon: <Person />, roles: ['ADMIN', 'CUSTOMS', 'CUSTOMS Portal Administrator'] },
      { index: 7, label: 'Audit Trail', icon: <Assessment />, roles: ['CUSTOMS', 'ADMIN', 'CUSTOMS Portal Administrator', 'Customs Officer', 'Inspection Officer', 'Clearance Officer'] },
    ];
    
    if (isSuperAdmin) return allTabs;
    return allTabs.filter(tab => tab.roles.includes(userRole));
  };
  
  const visibleTabs = getRoleBasedTabs();
  
  // Workflow filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [permitReadyShipments, setPermitReadyShipments] = useState<any[]>([]);
  
  // Auto-mapped data for inspection scheduling
  const [inspectionAutoData, setInspectionAutoData] = useState<any>({
    contactPerson: '',
    contactPhone: '',
    companyName: '',
    shipmentLocation: '',
  });
  
  // Auto-mapped data for clearance
  const [clearanceAutoData, setClearanceAutoData] = useState<any>({
    inspectorName: '',
    clearanceNumber: '',
    companyName: '',
  });

  // Inspection Dialog Form State
  const [inspectionForm, setInspectionForm] = useState({
    inspectionType: 'STANDARD',
    priorityLevel: 'NORMAL',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    location: 'PORT',
    assignedInspector: 'OFFICER_ALEMAYEHU',
    contactPerson: '',
    contactPhone: '',
    specialInstructions: '',
    internalNotes: '',
  });

  // Clearance Dialog Form State
  const [clearanceForm, setClearanceForm] = useState({
    clearanceNumber: '',
    clearanceDate: new Date().toISOString().split('T')[0],
    clearedBy: 'OFFICER_ALEMAYEHU',
    clearanceType: 'FULL',
    customsDuties: '0',
    vatAmount: '0',
    exitPoint: 'DJIBOUTI',
    validityPeriod: '30',
    clearanceRemarks: '',
    officerNotes: '',
  });

  // Rejection Dialog Form State
  const [rejectionForm, setRejectionForm] = useState({
    rejectionCategory: 'DOCUMENTATION',
    severityLevel: 'CORRECTABLE',
    rejectedBy: 'OFFICER_ALEMAYEHU',
    rejectionDate: new Date().toISOString().split('T')[0],
    detailedReason: '',
    requiredActions: '',
    legalReference: '',
    appealDeadline: '14',
    officerNotes: '',
  });
  
  // Auto-populate inspection form when dialog opens
  useEffect(() => {
    if (inspectionDialogOpen && selectedDeclaration) {
      // Set inspection type based on EUDR compliance
      const defaultType = selectedDeclaration.eudrCompliant ? 'EUDR_ENHANCED' : 'STANDARD';
      
      // Set location based on auto-detected shipment location
      const defaultLocation = inspectionAutoData.shipmentLocation === 'ECX Warehouse' ? 'ECX' : 'PORT';
      
      setInspectionForm({
        ...inspectionForm,
        inspectionType: defaultType,
        location: defaultLocation,
        contactPerson: inspectionAutoData.contactPerson || '',
        contactPhone: inspectionAutoData.contactPhone || '',
      });
    }
  }, [inspectionDialogOpen, selectedDeclaration, inspectionAutoData]);

  // Auto-populate clearance form when dialog opens
  useEffect(() => {
    if (clearanceDialogOpen && selectedDeclaration) {
      const clearanceNum = clearanceAutoData.clearanceNumber || `CLR-${Date.now()}`;
      
      setClearanceForm({
        ...clearanceForm,
        clearanceNumber: clearanceNum,
      });
    }
  }, [clearanceDialogOpen, selectedDeclaration, clearanceAutoData]);

  // New Declaration Form State
  const [newDeclarationForm, setNewDeclarationForm] = useState({
    shipmentId: '',
    exporterId: '',
    declarationType: 'STANDARD' as 'STANDARD' | 'SIMPLIFIED' | 'EUDR_ENHANCED',
    hsCode: '090111',
    quantity: '',
    value: '',
    currency: 'USD',
    destination: '',
    portOfExit: 'Djibouti Port',
    eudrCompliant: false,
    additionalNotes: '',
  });
  const [isLoadingShipmentData, setIsLoadingShipmentData] = useState(false);

  // Auto-map shipment data when Shipment ID is entered
  const handleShipmentIdChange = async (shipmentId: string, skipValidation: boolean = false) => {
    setNewDeclarationForm({ ...newDeclarationForm, shipmentId });
    
    if (shipmentId.length > 10) { // Only fetch if ID looks valid
      setIsLoadingShipmentData(true);
      const token = localStorage.getItem('authToken');
      
      try {
        console.log('[CUSTOMS] ═══════════════════════════════════════');
        console.log('[CUSTOMS] 🔍 Starting validation for shipment:', shipmentId);
        console.log('[CUSTOMS] Skip validation:', skipValidation);
        console.log('[CUSTOMS] ═══════════════════════════════════════');
        
        // STEP 1: Fetch shipment data
        console.log('[CUSTOMS] 📦 Step 1: Fetching shipment data...');
        const response = await apiFetch(`/shipments/${shipmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
          if (!skipValidation) {
            alert('❌ Shipment Not Found\n\nThis shipment does not exist in the blockchain.');
          }
          setIsLoadingShipmentData(false);
          return;
        }
        
        const shipment = result.data;
        console.log('[CUSTOMS] ✅ Shipment fetched:', shipment);
        console.log('[CUSTOMS] 📋 Available fields:', Object.keys(shipment));
        
        // Extract all possible field variations
        const shipmentData = {
          exporterId: shipment.exporterId || shipment.ExporterID || shipment.exporterID || shipment.exporter_id || '',
          quantity: shipment.quantity || shipment.Quantity || shipment.qty || shipment.weight || '',
          valueUSD: shipment.valueUSD || shipment.ValueUSD || shipment.valueUsd || shipment.value_usd || shipment.totalValue || shipment.TotalValue || '',
          contractId: shipment.contractId || shipment.ContractID || shipment.contractID || shipment.contract_id || '',
          eudrCompliant: shipment.eudrCompliant || shipment.EUDRCompliant || shipment.eudrCompliance || shipment.eudr_compliant || false,
          channel: shipment.channel || shipment.Channel || '',
          status: shipment.status || shipment.Status || '',
        };
        
        console.log('[CUSTOMS] 📊 Extracted shipment data:', shipmentData);
        console.log('[CUSTOMS] 🔍 Validation:', {
          hasExporterId: !!shipmentData.exporterId,
          hasQuantity: !!shipmentData.quantity,
          hasValue: !!shipmentData.valueUSD,
          hasContractId: !!shipmentData.contractId
        });
        
        // STEP 2: Verify quality inspection exists and is approved (skip if from permit-ready list)
        if (!skipValidation) {
        console.log('[CUSTOMS] 🔬 Step 2: Verifying quality inspection...');
        try {
          // ✅ FIX: Use new shipment-specific endpoint instead of fetching all inspections
          const inspectionResponse = await apiFetch(`/quality/inspections/by-shipment/${shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const inspectionResult = await inspectionResponse.json();
          
          if (!inspectionResult.success || !inspectionResult.data || inspectionResult.data.length === 0) {
            console.error(`[CUSTOMS] ❌ No inspection found for shipment ${shipmentId}`);
            
            // ✅ FIX: Try fuzzy matching with normalized IDs as fallback
            console.log('[CUSTOMS] 🔄 Attempting fuzzy match with all inspections...');
            const allInspectionsResponse = await apiFetch(`/quality/inspections?limit=1000`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const allInspectionsResult = await allInspectionsResponse.json();
            
            if (allInspectionsResult.success && allInspectionsResult.data) {
              const normalizedShipmentId = normalizeShipmentId(shipmentId);
              const fuzzyMatch = allInspectionsResult.data.find((insp: any) => {
                const inspShipmentId = insp.shipmentId || insp.ShipmentID || insp.shipmentID || '';
                return normalizeShipmentId(inspShipmentId) === normalizedShipmentId;
              });
              
              if (fuzzyMatch) {
                console.log(`[CUSTOMS] ✅ Fuzzy match found! Inspection: ${fuzzyMatch.inspectionId || fuzzyMatch.InspectionID}`);
                inspectionResult.data = [fuzzyMatch]; // Use fuzzy match
              } else {
                alert('❌ No Quality Inspection Found\n\nNo inspection exists for this shipment.\n\nRequired Steps:\n1. ECTA must perform quality inspection\n2. ECTA must approve inspection\n3. ECTA must issue export permit\n\nThen customs declaration can be submitted.');
                setIsLoadingShipmentData(false);
                return;
              }
            } else {
              alert('❌ No Quality Inspections Found\n\nNo inspections exist in the system.');
              setIsLoadingShipmentData(false);
              return;
            }
          }
          
          // Get the first (should be only) inspection for this shipment
          const inspection = inspectionResult.data[0];
          console.log(`[CUSTOMS] 📝 Found inspection for shipment ${shipmentId}`);
          console.log('[CUSTOMS] 📝 Inspection data:', inspection);
          
          // ✅ FIX: Fields are already normalized by the API endpoint
          const inspStatus = inspection.status || '';
          const exportPermitNo = inspection.exportPermitNo || '';
          const certificateNo = inspection.certificateNo || '';
          
          console.log('[CUSTOMS] 🔍 Extracted inspection details:');
          console.log('  - Status:', inspStatus || '(empty)');
          console.log('  - Certificate:', certificateNo || '(empty)');
          console.log('  - Export Permit:', exportPermitNo || '(empty)');
          
          // Check if inspection is approved
          const statusApproved = inspStatus.toUpperCase().includes('APPROVED');
          const hasCertificate = certificateNo.trim().length > 0 && !['N/A', 'NA', 'NONE', 'NULL'].includes(certificateNo.toUpperCase());
          const hasPermit = exportPermitNo.trim().length > 0 && !['NOT ISSUED', 'N/A', 'NA', 'NONE', 'NULL'].includes(exportPermitNo.toUpperCase());
          
          // CRITICAL: If both certificate AND permit exist, inspection IS approved
          const isApprovedByDocuments = hasCertificate && hasPermit;
          const isApproved = statusApproved || isApprovedByDocuments;
          
          console.log('[CUSTOMS] ✓ Approval checks:');
          console.log('  - Status contains APPROVED:', statusApproved);
          console.log('  - Has valid certificate:', hasCertificate);
          console.log('  - Has valid permit:', hasPermit);
          console.log('  - Approved by documents:', isApprovedByDocuments);
          console.log('  - FINAL APPROVAL:', isApproved);
          
          if (!isApproved) {
            let reason = 'Unknown issue';
            let solution = '';
            
            if (!hasCertificate && !hasPermit) {
              reason = 'Certificate and Export Permit fields are EMPTY in blockchain';
              solution = `
🔧 TO FIX THIS ISSUE:

The ECTA Portal shows certificate (CERT-20260723-408) and permit (EP-20260723-529), 
but these values are NOT saved in the blockchain!

STEPS TO FIX IN ECTA PORTAL:
1. Go to ECTA Portal
2. Find inspection: ${inspection.inspectionId || 'INSPECTION_SHIP1784792899407'}
3. RE-APPROVE the inspection (click Approve button again)
4. Make sure Certificate Number and Export Permit Number fields are filled
5. Submit/Save the approval to blockchain

The issue is that when ECTA approved this inspection, the certificate and 
permit numbers were not properly written to the blockchain. They need to 
re-submit the approval with the document numbers included.

Once fixed, refresh this page and try creating the declaration again.`;
            } else if (!hasCertificate) {
              reason = 'Certificate field is EMPTY (found permit: ' + exportPermitNo + ')';
              solution = 'ECTA needs to add Certificate Number in the inspection approval.';
            } else if (!hasPermit) {
              reason = 'Export Permit field is EMPTY (found certificate: ' + certificateNo + ')';
              solution = 'ECTA needs to issue Export Permit and save it to blockchain.';
            }
            
            console.error('[CUSTOMS] ❌ Approval check FAILED:', reason);
            console.error('[CUSTOMS] 💡 Solution:', solution);
            
            alert(`❌ Quality Inspection Not Approved

Inspection Status: ${inspStatus}
Certificate in blockchain: ${certificateNo || 'EMPTY ❌'}
Permit in blockchain: ${exportPermitNo || 'EMPTY ❌'}

PROBLEM: ${reason}

${solution}`);
            setIsLoadingShipmentData(false);
            return;
          }
          
          console.log('[CUSTOMS] ✅ Inspection APPROVED - Certificate:', certificateNo, 'Permit:', exportPermitNo);
          
          // Verify export permit exists
          let hasExportPermit = hasPermit;
          if (hasExportPermit) {
            console.log('[CUSTOMS] ✅ Export permit found on inspection:', exportPermitNo);
          } else {
            // Fallback: check uploaded documents for this shipment for an EXPORT_PERMIT
            console.log('[CUSTOMS] 🔍 Checking uploaded documents for export permit...');
            try {
              const docsResponse = await apiFetch(`/documents/entity/SHIPMENT/${shipmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const docsResult = await docsResponse.json();
              if (docsResult.success && Array.isArray(docsResult.data) && docsResult.data.length > 0) {
                const permitDoc = docsResult.data.find((d: any) => (
                  (d.category && d.category === 'EXPORT_PERMIT') ||
                  (d.documentCategory && d.documentCategory === 'EXPORT_PERMIT') ||
                  (d.type && d.type === 'EXPORT_PERMIT')
                ));

                if (permitDoc) {
                  hasExportPermit = true;
                  console.log('[CUSTOMS] ✅ Export permit found as uploaded document:', permitDoc);
                }
              }
            } catch (docErr) {
              console.warn('[CUSTOMS] Could not fetch shipment documents to verify export permit:', docErr);
            }
          }

          if (!hasExportPermit) {
            alert('❌ No Export Permit Issued\n\nQuality is approved but export permit has not been issued or attached yet.\n\nRequired:\n• ECTA must issue export permit for this inspection OR upload the Export Permit document to the shipment.\n\nThen customs declaration can be submitted.');
            setIsLoadingShipmentData(false);
            return;
          }
          
        } catch (error) {
          console.error('[CUSTOMS] Error verifying inspection:', error);
          alert('❌ Error Verifying Prerequisites\n\nCould not verify quality inspection and export permit.\n\nPlease ensure:\n1. Quality inspection completed\n2. Inspection approved by ECTA\n3. Export permit issued');
          setIsLoadingShipmentData(false);
          return;
        }
        
        } // End of !skipValidation validation block
        
        // ═══════════════════════════════════════════════════════════════
        // ALWAYS FETCH CONTRACT AND UPDATE FORM (regardless of skipValidation)
        // ═══════════════════════════════════════════════════════════════
        
        // Fetch contract data for destination and currency
        console.log('[CUSTOMS] 📄 Fetching contract data...');
        let destination = '';
        let currency = 'USD';
        const contractId = shipmentData.contractId;
        
        if (contractId && contractId.trim() !== '') {
          try {
            console.log('[CUSTOMS] 🔍 Fetching contract:', contractId);
            const contractResponse = await apiFetch(`/contracts/${contractId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const contractResult = await contractResponse.json();
            
            if (!contractResult.success || !contractResult.data) {
              console.warn('[CUSTOMS] ⚠️ Contract not found:', contractId);
            } else {
              const contract = contractResult.data;
              console.log('[CUSTOMS] ✅ Contract fetched:', contract);
              console.log('[CUSTOMS] 📋 Available fields:', Object.keys(contract));
              
              // Extract destination with all possible field variations
              destination = contract.buyerCountry || contract.BuyerCountry || contract.buyer_country ||
                           contract.destination || contract.Destination || 
                           contract.destinationCountry || contract.DestinationCountry || '';
              
              // Extract currency with all possible field variations
              currency = contract.currency || contract.Currency || contract.paymentCurrency || contract.PaymentCurrency || 'USD';
              
              console.log('[CUSTOMS] ✅ Contract data extracted:');
              console.log('  - Destination:', destination);
              console.log('  - Currency:', currency);
            }
          } catch (err) {
            console.error('[CUSTOMS] ⚠️ Error fetching contract:', err);
          }
        } else {
          console.warn('[CUSTOMS] ⚠️ No contract ID found on shipment');
        }
        
        // Check if declaration already exists (only if NOT skipping validation)
        if (!skipValidation) {
        console.log('[CUSTOMS] 🔍 Checking for existing declarations...');
        try {
          const existingDeclResponse = await apiFetch('/customs/declarations', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const existingDeclResult = await existingDeclResponse.json();
          
          if (existingDeclResult.success && existingDeclResult.data) {
            const existingDecl = existingDeclResult.data.find((d: any) => {
              const declShipmentId = d.ShipmentID || d.shipmentId || d.shipmentID || d.shipment_id || '';
              return declShipmentId === shipmentId;
            });
            
            if (existingDecl) {
              const declId = existingDecl.DeclarationID || existingDecl.declarationId || existingDecl.declarationID || existingDecl.declaration_id || '';
              const declStatus = existingDecl.DeclarationStatus || existingDecl.status || existingDecl.Status || '';
              console.log('[CUSTOMS] ⚠️ Declaration already exists:', declId, 'Status:', declStatus);
              alert(`⚠️ Declaration Already Exists\n\nDeclaration ID: ${declId}\nStatus: ${declStatus}\n\nThis shipment already has a customs declaration.\n\nYou can view or modify the existing declaration instead of creating a new one.`);
              setIsLoadingShipmentData(false);
              return;
            }
          }
          console.log('[CUSTOMS] ✅ No existing declaration found');
        } catch (err) {
          console.warn('[CUSTOMS] Could not check for existing declarations:', err);
        }
        } // End check for existing declarations
        
        // Calculate or extract customs value
        console.log('[CUSTOMS] 💰 Step 5: Calculating customs value...');
        let customsValue = shipmentData.valueUSD;
        
        if (!customsValue || customsValue === '' || parseFloat(customsValue) === 0) {
          // Fallback: calculate from quantity if available
          const qty = parseFloat(shipmentData.quantity || '0');
          if (qty > 0) {
            customsValue = (qty * 9.25).toString(); // Average price per kg
            console.log('[CUSTOMS] ⚠️ Value not found, calculated from quantity:', customsValue);
          }
        }
        
        console.log('[CUSTOMS] 💰 Customs value:', customsValue);
        
        // STEP 6: Prepare final form data
        console.log('[CUSTOMS] 📋 Step 6: Preparing form data...');
        const extractedData = {
          shipmentId,
          exporterId: shipmentData.exporterId,
          quantity: shipmentData.quantity.toString(),
          value: customsValue.toString(),
          currency: currency,
          destination: destination,
          eudrCompliant: Boolean(shipmentData.eudrCompliant),
          declarationType: Boolean(shipmentData.eudrCompliant) ? 'EUDR_ENHANCED' as const : 'STANDARD' as const,
          hsCode: newDeclarationForm.hsCode,
          portOfExit: newDeclarationForm.portOfExit,
          additionalNotes: newDeclarationForm.additionalNotes,
        };
        
        console.log('[CUSTOMS] 📋 Final extracted data:', extractedData);
        
        // STEP 7: Validate all required fields
        const missingFields = [];
        if (!extractedData.exporterId) missingFields.push('Exporter ID');
        if (!extractedData.quantity || extractedData.quantity === '0' || extractedData.quantity === '') missingFields.push('Quantity');
        if (!extractedData.value || extractedData.value === '0' || extractedData.value === '') missingFields.push('Customs Value');
        if (!extractedData.destination) missingFields.push('Destination');
        
        console.log('[CUSTOMS] ═══════════════════════════════════════');
        if (missingFields.length > 0) {
          console.warn('[CUSTOMS] ⚠️ Missing fields:', missingFields);
          console.log('[CUSTOMS] ═══════════════════════════════════════');
        } else {
          console.log('[CUSTOMS] ✅ All fields populated successfully');
          console.log('[CUSTOMS] ═══════════════════════════════════════');
        }
        
        // Update form state
        setNewDeclarationForm(extractedData);
        
        // Show appropriate alert only if not skipping validation
        if (!skipValidation) {
          if (missingFields.length > 0) {
            alert(`⚠️ Partial Auto-Fill\n\nShipment: ${shipmentId}\n✓ Quality inspection approved\n✓ Export permit issued\n\n⚠️ Missing fields (must enter manually):\n${missingFields.map(f => '• ' + f).join('\n')}\n\nPlease fill in the missing information before submitting.`);
          } else {
            alert(`✅ All Prerequisites Verified!\n\nShipment: ${shipmentId}\n✓ Quality inspection approved\n✓ Export permit issued\n✓ Contract validated\n✓ All fields auto-populated\n\n📋 Form Data:\n• Exporter: ${extractedData.exporterId}\n• Quantity: ${extractedData.quantity} kg\n• Value: $${extractedData.value}\n• Destination: ${extractedData.destination}\n• Currency: ${extractedData.currency}\n\nForm ready for declaration submission.`);
          }
        }
        
      } catch (error) {
        console.error('[CUSTOMS] ❌ Error during data fetching:', error);
        console.log('[CUSTOMS] ═══════════════════════════════════════');
        if (!skipValidation) {
          alert('❌ System Error\n\nFailed to validate shipment prerequisites.\n\n' + error);
        } else {
          // Even if we skip validation, we should still update the form with whatever data we got
          console.warn('[CUSTOMS] ⚠️ Auto-fill partially failed, but continuing because skipValidation=true');
        }
      } finally {
        setIsLoadingShipmentData(false);
      }
    }
  };

  // Audit Trail State
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [auditEntityType, setAuditEntityType] = useState<'DECLARATION' | 'SHIPMENT' | 'INSPECTION'>('DECLARATION');
  const [auditEntityId, setAuditEntityId] = useState<string>('');
  const [auditStats, setAuditStats] = useState({
    totalActivities: 0,
    todaysActions: 0,
    blockchainVerified: 0,
    organizationsInvolved: 0,
  });
  const [rejectionDetailsDialogOpen, setRejectionDetailsDialogOpen] = useState(false);
  
  // Snackbar state for professional success/error messages
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Auto-map exporter and shipment data for inspection scheduling
  const autoMapInspectionData = async (declaration: CustomsDeclaration) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[CUSTOMS] Auto-mapping inspection data for:', declaration.exporterId);
      
      // Fetch exporter data from API (users table has contact info)
      const exporterResponse = await apiFetch(`/users/${declaration.exporterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (exporterResponse) {
        const exporterResult = await exporterResponse.json();
        if (exporterResult.success && exporterResult.data) {
          const exporter = exporterResult.data;
          setInspectionAutoData({
            contactPerson: exporter.full_name || exporter.fullName || '',
            contactPhone: exporter.phone || '',
            companyName: exporter.organization || exporter.companyName || '',
            shipmentLocation: 'Djibouti Port', // Default, can be enhanced
          });
          console.log('[CUSTOMS] ✅ Auto-mapped exporter data:', {
            contactPerson: exporter.full_name,
            contactPhone: exporter.phone,
            companyName: exporter.organization,
          });
        }
      }
      
      // Fetch shipment data to get location/warehouse info
      if (declaration.shipmentId && declaration.shipmentId.trim() !== '') {
        const shipmentResponse = await apiFetch(`/shipments/${declaration.shipmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (shipmentResponse) {
          const shipmentResult = await shipmentResponse.json();
          if (shipmentResult.success && shipmentResult.data) {
            const shipment = shipmentResult.data;
            // Update location based on shipment status or channel
            const location = shipment.channel === 'ECX' ? 'ECX Warehouse' : 'Djibouti Port';
            setInspectionAutoData((prev: any) => ({
              ...prev,
              shipmentLocation: location,
            }));
          }
        }
      }
    } catch (error) {
      console.warn('[CUSTOMS] Could not auto-map inspection data:', error);
    }
  };

  // Auto-map data for clearance
  const autoMapClearanceData = async (declaration: CustomsDeclaration) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      console.log('[CUSTOMS] Auto-mapping clearance data for:', declaration.declarationId);
      
      // Generate clearance number
      const clearanceNumber = `CLR-${Date.now()}-${declaration.exporterId.substring(3, 8)}`;
      
      // Get inspector name from declaration if available
      const inspectorName = declaration.customsOfficer || 'Officer Alemayehu T.';
      
      // Fetch exporter company name
      const exporterResponse = await apiFetch(`/users/${declaration.exporterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let companyName = '';
      if (exporterResponse) {
        const exporterResult = await exporterResponse.json();
        if (exporterResult.success && exporterResult.data) {
          companyName = exporterResult.data.organization || exporterResult.data.companyName || '';
        }
      }
      
      setClearanceAutoData({
        inspectorName,
        clearanceNumber,
        companyName,
      });
      
      console.log('[CUSTOMS] ✅ Auto-mapped clearance data:', {
        clearanceNumber,
        inspectorName,
        companyName,
      });
    } catch (error) {
      console.warn('[CUSTOMS] Could not auto-map clearance data:', error);
    }
  };

  const clearanceData = [
    { month: 'Jan', standard: 145, simplified: 89, eudr: 23 },
    { month: 'Feb', standard: 152, simplified: 95, eudr: 28 },
    { month: 'Mar', standard: 148, simplified: 102, eudr: 35 },
    { month: 'Apr', standard: 165, simplified: 108, eudr: 42 },
    { month: 'May', standard: 172, simplified: 115, eudr: 48 },
  ];

  const statusDistribution = [
    { name: 'Cleared', value: 78, color: '#4caf50' },
    { name: 'Under Review', value: 15, color: '#ff9800' },
    { name: 'Held', value: 5, color: '#f44336' },
    { name: 'Submitted', value: 2, color: '#2196f3' },
  ];

  const inspectionData = [
    { type: 'Physical', count: 45, avgTime: 4.2 },
    { type: 'Documentary', count: 123, avgTime: 1.8 },
    { type: 'EUDR Enhanced', count: 28, avgTime: 6.5 },
    { type: 'Risk-based', count: 67, avgTime: 3.1 },
  ];

  useEffect(() => {
    loadData();
    loadPermitReadyShipments();
  }, []);

  useEffect(() => {
    if (tabValue === 7) {
      loadAuditStats();
    }
  }, [tabValue]);

  const loadPermitReadyShipments = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await apiFetch('/customs/permit-ready', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        setPermitReadyShipments(result.data);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to load permit-ready shipments:', error);
    }
  };

  // Handler for creating declaration from ECTA permit
  const handleCreateDeclarationFromPermit = async (shipmentId: string, inspectionId: string) => {
    console.log('[CUSTOMS] Creating declaration from permit:', { shipmentId, inspectionId });
    
    // Since this shipment is coming from the permit-ready list, we KNOW it has:
    // 1. Quality inspection completed
    // 2. Inspection approved by ECTA
    // 3. Export permit issued
    // So we can skip the validation checks and directly open the form
    
    // Open the new declaration dialog first
    setNewDeclarationDialogOpen(true);
    
    // Auto-populate form with shipment ID
    setNewDeclarationForm({
      ...newDeclarationForm,
      shipmentId,
    });
    
    // Small delay to ensure dialog is fully rendered before auto-filling
    setTimeout(() => {
      // Trigger auto-mapping WITHOUT showing validation alerts
      // Pass a flag to skip validation since we already know this is permit-ready
      handleShipmentIdChange(shipmentId, true);
    }, 100);
  };

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Load ALL customs declarations from blockchain
      const response = await apiFetch('/customs/declarations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`[CUSTOMS] Loaded ${result.data.length} declarations from blockchain`);
        
        // Map blockchain data to UI format and enrich with shipment data
        const enrichmentPromises = result.data.map(async (d: any) => {
          const baseDeclaration = {
            declarationId: d.declarationId || d.DeclarationID || d.declarationID || '',
            shipmentId: d.shipmentId || d.ShipmentID || d.shipmentID || '',
            exporterId: d.exporterId || d.ExporterID || d.exporterID || '',
            declarationType: d.declarationType || d.DeclarationType || 'STANDARD',
            hsCode: d.hsCode || d.HSCode || '090111',
            quantity: parseFloat(d.quantity || d.Quantity || '0'),
            value: parseFloat(d.totalValue || d.TotalValue || d.value || d.Value || '0'),
            currency: d.currency || d.Currency || 'USD',
            destination: d.destination || d.Destination || 'Unknown',
            status: d.status || d.DeclarationStatus || d.declarationStatus || 'SUBMITTED',
            submissionDate: d.submissionDate || d.SubmissionDate || d.createdAt || new Date().toISOString(),
            clearanceDate: d.clearanceDate || d.ClearanceDate || '',
            customsOfficer: d.customsOfficer || d.CustomsOfficer || d.clearedBy || d.reviewedBy || 'Officer Alemayehu T.',
            inspectionRequired: d.inspectionRequired !== undefined ? d.inspectionRequired : (d.InspectionRequired !== undefined ? d.InspectionRequired : true),
            eudrCompliant: d.eudrCompliant || d.EUDRCompliant || false,
          };

          // ENRICHMENT: Try to fetch shipment data if shipmentId exists
          if (baseDeclaration.shipmentId && baseDeclaration.shipmentId.trim() !== '') {
            try {
              const shipmentResponse = await apiFetch(`/shipments/${baseDeclaration.shipmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(() => null); // Silently catch 404 and network errors
              
              // Skip if fetch failed or returned null
              if (!shipmentResponse) {
                return baseDeclaration;
              }
              
              const shipmentResult = await shipmentResponse.json();
              
              if (shipmentResult.success && shipmentResult.data) {
                const shipment = shipmentResult.data;
                console.log(`[CUSTOMS] ✅ Enriching declaration ${baseDeclaration.declarationId} with shipment ${baseDeclaration.shipmentId}`);
                
                // Override with actual shipment data (shipment is source of truth)
                baseDeclaration.quantity = parseFloat(shipment.quantity || shipment.Quantity || baseDeclaration.quantity);
                baseDeclaration.value = parseFloat(shipment.valueUsd || shipment.ValueUSD || baseDeclaration.value);
                baseDeclaration.exporterId = shipment.exporterId || shipment.ExporterID || baseDeclaration.exporterId;
                baseDeclaration.eudrCompliant = shipment.eudrCompliant || shipment.EUDRCompliant || baseDeclaration.eudrCompliant;
                
                // Get destination from contract if available
                const contractID = shipment.contractId || shipment.ContractID;
                if (contractID && contractID.trim() !== '') {
                  try {
                    const contractResponse = await apiFetch(`/contracts/${contractID}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(() => null);
                    
                    if (contractResponse) {
                      const contractResult = await contractResponse.json();
                      if (contractResult.success && contractResult.data) {
                        const contract = contractResult.data;
                        baseDeclaration.destination = contract.buyerCountry || contract.BuyerCountry || baseDeclaration.destination;
                        baseDeclaration.currency = contract.currency || contract.Currency || baseDeclaration.currency;
                      }
                    }
                  } catch {
                    // Silently skip contract errors
                  }
                }
              }
            } catch {
              // Silently skip enrichment errors
            }
          }

          return baseDeclaration;
        });

        const enrichedDeclarations = await Promise.all(enrichmentPromises);
        setDeclarations(enrichedDeclarations);
        console.log(`[CUSTOMS] ${enrichedDeclarations.length} declarations enriched and ready for display`);
      } else {
        console.log('[CUSTOMS] No declarations found or query failed');
        setDeclarations([]);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to load declarations:', error);
      setDeclarations([]);
    } finally {
      setLoading(false);
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
        
        const totalActivities = logs.length;
        const todaysActions = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return logDate >= oneDayAgo;
        }).length;
        const blockchainVerified = logs.filter((log: any) => 
          log.metadata?.blockchainVerified || log.metadata?.source === 'HYPERLEDGER_FABRIC'
        ).length;
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
      console.error('[CUSTOMS] Failed to load audit stats:', error);
    }
  };

  const handleScheduleInspection = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Scheduling inspection for:', declarationId);
      console.log('[CUSTOMS] Inspection form data:', inspectionForm);
      
      // Map officer codes to readable names
      const officerNames: Record<string, string> = {
        'OFFICER_ALEMAYEHU': 'Officer Alemayehu T. (Senior Inspector)',
        'OFFICER_TIGIST': 'Officer Tigist M. (EUDR Specialist)',
        'OFFICER_DAWIT': 'Officer Dawit K. (Physical Inspection)',
        'OFFICER_SARA': 'Officer Sara H. (Documentary Review)',
        'AUTO_ASSIGN': 'Auto-Assign (System will assign)',
      };
      
      const locationNames: Record<string, string> = {
        'PORT': 'Djibouti Port - Customs Area',
        'WAREHOUSE': 'Bonded Warehouse',
        'FACTORY': 'Exporter\'s Facility',
        'CUSTOMS_OFFICE': 'Customs Office',
        'ECX': 'ECX Warehouse',
      };
      
      const assignedInspector = officerNames[inspectionForm.assignedInspector] || 'Officer Alemayehu T.';
      const location = locationNames[inspectionForm.location] || 'Port';
      
      // Combine notes for blockchain recording
      const inspectorNotes = `
📅 Scheduled: ${inspectionForm.scheduledDate} at ${inspectionForm.scheduledTime}
📍 Location: ${location}
👤 Inspector: ${assignedInspector}
🎯 Priority: ${inspectionForm.priorityLevel}
👤 Contact: ${inspectionForm.contactPerson} (${inspectionForm.contactPhone})

${inspectionForm.specialInstructions ? '📝 Special Instructions:\n' + inspectionForm.specialInstructions : ''}
${inspectionForm.internalNotes ? '\n🔒 Internal Notes:\n' + inspectionForm.internalNotes : ''}
      `.trim();
      
      // Call customs review API to schedule inspection
      const response = await apiFetch(`/customs/declaration/${declarationId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inspectorNotes,
          inspectionType: selectedDeclaration?.eudrCompliant ? 'EUDR_ENHANCED' : inspectionForm.inspectionType,
          scheduledDate: `${inspectionForm.scheduledDate}T${inspectionForm.scheduledTime}:00.000Z`,
          priorityLevel: inspectionForm.priorityLevel,
          location: inspectionForm.location,
          assignedInspector: inspectionForm.assignedInspector,
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Inspection scheduled successfully');
        
        // Show professional confirmation
        setSnackbar({
          open: true,
          message: `Inspection scheduled for ${inspectionForm.scheduledDate} at ${inspectionForm.scheduledTime}. Status updated to UNDER_INSPECTION.`,
          severity: 'success',
        });
        
        setInspectionDialogOpen(false);
        
        // Reset form
        setInspectionForm({
          inspectionType: 'STANDARD',
          priorityLevel: 'NORMAL',
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledTime: '09:00',
          location: 'PORT',
          assignedInspector: 'OFFICER_ALEMAYEHU',
          contactPerson: '',
          contactPhone: '',
          specialInstructions: '',
          internalNotes: '',
        });
        
        await loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to schedule inspection:', result);
        setSnackbar({
          open: true,
          message: `Failed to schedule inspection: ${result.error || 'Unknown error'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to schedule inspection:', error);
      setSnackbar({
        open: true,
        message: `Network error: ${error}`,
        severity: 'error',
      });
    }
  };

  const handleCompleteInspection = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Completing inspection for:', declarationId);
      
      const response = await apiFetch(`/customs/declaration/${declarationId}/complete-inspection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inspectionResult: 'PASSED',
          inspectorComments: 'All requirements met',
          completedDate: new Date().toISOString(),
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Inspection completed successfully');
        alert(`✅ Inspection Completed\n\nDeclaration: ${declarationId}\nResult: PASSED\n\nStatus updated to UNDER_REVIEW for final clearance`);
        loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to complete inspection:', result);
        alert(`❌ Failed to complete inspection\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to complete inspection:', error);
      alert(`❌ Network Error\n\nFailed to complete inspection: ${error}`);
    }
  };

  const handleClearDeclaration = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Clearing declaration:', declarationId);
      console.log('[CUSTOMS] Clearance form data:', clearanceForm);
      
      // STEP 1: Verify certificates exist before clearance
      const declaration = declarations.find(d => d.declarationId === declarationId);
      if (declaration) {
        console.log('[CUSTOMS] Verifying certificates for shipment:', declaration.shipmentId);
        
        // Check Phytosanitary Certificate
        try {
          const phytoResponse = await apiFetch(`/phytosanitary/shipment/${declaration.shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const phytoResult = await phytoResponse.json();
          
          if (!phytoResult.success || !phytoResult.data || phytoResult.data.length === 0) {
            const proceed = window.confirm(
              '⚠️ WARNING: No phytosanitary certificate found!\n\n' +
              'Phytosanitary certificate is required for all agricultural exports (IPPC standards).\n\n' +
              'Proceed with clearance anyway?'
            );
            if (!proceed) {
              console.log('[CUSTOMS] Clearance cancelled - missing phytosanitary certificate');
              return;
            }
          } else {
            const validCert = phytoResult.data.find((c: any) => c.status === 'ISSUED');
            if (!validCert) {
              setSnackbar({
                open: true,
                message: 'Phytosanitary certificate exists but is not valid (expired or revoked)',
                severity: 'warning',
              });
              return;
            }
            console.log('[CUSTOMS] ✅ Valid phytosanitary certificate found:', validCert.certificateNumber);
          }
        } catch (error) {
          console.warn('[CUSTOMS] Could not verify phytosanitary certificate:', error);
        }
        
        // Check Insurance Certificate (for CIF incoterms)
        try {
          const insuranceResponse = await apiFetch(`/insurance/shipment/${declaration.shipmentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const insuranceResult = await insuranceResponse.json();
          
          if (insuranceResult.success && insuranceResult.data && insuranceResult.data.length > 0) {
            console.log('[CUSTOMS] ✅ Insurance certificate found');
          } else {
            console.log('[CUSTOMS] ℹ️ No insurance certificate (may not be required for FOB)');
          }
        } catch (error) {
          console.warn('[CUSTOMS] Could not verify insurance certificate:', error);
        }
      }
      
      // STEP 2: Proceed with customs clearance
      const response = await apiFetch(`/customs/declaration/${declarationId}/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clearanceNumber: clearanceForm.clearanceNumber || `CLR-${Date.now()}`,
          dutiesAmount: clearanceForm.customsDuties,
          vatAmount: clearanceForm.vatAmount,
          clearanceType: clearanceForm.clearanceType,
          clearedBy: clearanceForm.clearedBy,
          exitPoint: clearanceForm.exitPoint,
          validityPeriod: clearanceForm.validityPeriod,
          clearanceRemarks: clearanceForm.clearanceRemarks,
          officerNotes: clearanceForm.officerNotes,
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Declaration cleared successfully');
        
        // STEP 3: Trigger ECX auto-release if applicable
        if (declaration?.shipmentId) {
          console.log('[CUSTOMS] ℹ️ Customs cleared - ECX auto-release will be triggered for linked lots');
        }

        // STEP 4: AUTO-TRIGGER SHIPPING WORKFLOW
        const shipmentId = result.shipmentID || declaration?.shipmentId;
        if (shipmentId) {
          try {
            console.log('[CUSTOMS] 🚢 Auto-triggering shipping workflow for:', shipmentId);
            
            // Update shipment status to ready for shipping
            const shipmentResponse = await apiFetch(`/shipments/${shipmentId}/status`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: 'READY_FOR_SHIPPING',
                notes: 'Customs cleared - ready for freight booking and shipping'
              })
            });
            
            const shipmentResult = await shipmentResponse.json();
            if (shipmentResult.success) {
              console.log('[CUSTOMS] ✅ Shipment status updated to READY_FOR_SHIPPING');
              
              // Show clearance success with shipping info
              setSnackbar({
                open: true,
                message: `Declaration cleared! Clearance #${result.clearanceNumber}. Shipment ready for shipping - navigate to Shipping Portal to book freight.`,
                severity: 'success',
              });
            } else {
              console.warn('[CUSTOMS] ⚠️ Could not update shipment status:', shipmentResult.error);
              setSnackbar({
                open: true,
                message: `Declaration cleared! Clearance #${result.clearanceNumber}. Please manually trigger shipping workflow.`,
                severity: 'success',
              });
            }
          } catch (shippingError) {
            console.error('[CUSTOMS] ⚠️ Shipping workflow trigger failed:', shippingError);
            // Still show clearance success even if shipping trigger fails
            setSnackbar({
              open: true,
              message: `Declaration cleared! Clearance #${result.clearanceNumber}. Please navigate to Shipping Portal to continue.`,
              severity: 'success',
            });
          }
        } else {
          // Fallback: no shipment ID
          setSnackbar({
            open: true,
            message: `Declaration cleared! Clearance #${result.clearanceNumber}. Export authorized.`,
            severity: 'success',
          });
        }
        
        setClearanceDialogOpen(false);
        
        // Reset form
        setClearanceForm({
          clearanceNumber: '',
          clearanceDate: new Date().toISOString().split('T')[0],
          clearedBy: 'OFFICER_ALEMAYEHU',
          clearanceType: 'FULL',
          customsDuties: '0',
          vatAmount: '0',
          exitPoint: 'DJIBOUTI',
          validityPeriod: '30',
          clearanceRemarks: '',
          officerNotes: '',
        });
        
        await loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to clear declaration:', result);
        setSnackbar({
          open: true,
          message: `Failed to clear declaration: ${result.error?.message || 'Unknown error'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to clear declaration:', error);
      setSnackbar({
        open: true,
        message: `Error clearing declaration: ${error}`,
        severity: 'error',
      });
    }
  };

  const handleRejectDeclaration = async (declarationId: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      console.log('[CUSTOMS] Rejecting declaration:', declarationId);
      console.log('[CUSTOMS] Rejection form data:', rejectionForm);
      
      // Validate required fields
      if (!rejectionForm.detailedReason || rejectionForm.detailedReason.trim() === '') {
        setSnackbar({
          open: true,
          message: 'Detailed rejection reason is required',
          severity: 'error',
        });
        return;
      }
      
      const officerNames: Record<string, string> = {
        'OFFICER_ALEMAYEHU': 'Officer Alemayehu T.',
        'OFFICER_TIGIST': 'Officer Tigist M.',
        'OFFICER_DAWIT': 'Officer Dawit K.',
        'OFFICER_SARA': 'Officer Sara H.',
      };
      
      const rejectedBy = officerNames[rejectionForm.rejectedBy] || 'Officer Alemayehu T.';
      
      // Build comprehensive rejection reason
      const fullRejectionReason = `
Category: ${rejectionForm.rejectionCategory}
Severity: ${rejectionForm.severityLevel}
Rejected By: ${rejectedBy}
Date: ${rejectionForm.rejectionDate}

REASON:
${rejectionForm.detailedReason}

${rejectionForm.requiredActions ? 'REQUIRED ACTIONS FOR RESUBMISSION:\n' + rejectionForm.requiredActions : ''}

${rejectionForm.legalReference ? 'LEGAL REFERENCE: ' + rejectionForm.legalReference : ''}

Appeal Deadline: ${rejectionForm.appealDeadline} days from rejection date

${rejectionForm.officerNotes ? '\n[INTERNAL NOTES - NOT VISIBLE TO EXPORTER]:\n' + rejectionForm.officerNotes : ''}
      `.trim();
      
      const response = await apiFetch(`/customs/declaration/${declarationId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejectedBy,
          rejectionReason: fullRejectionReason,
          rejectionCategory: rejectionForm.rejectionCategory,
          severityLevel: rejectionForm.severityLevel,
          appealDeadline: rejectionForm.appealDeadline,
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[CUSTOMS] ✅ Declaration rejected successfully');
        
        setSnackbar({
          open: true,
          message: `Declaration rejected. Exporter notified with rejection details and appeal rights (${rejectionForm.appealDeadline} days).`,
          severity: 'warning',
        });
        
        setRejectionDialogOpen(false);
        
        // Reset form
        setRejectionForm({
          rejectionCategory: 'DOCUMENTATION',
          severityLevel: 'CORRECTABLE',
          rejectedBy: 'OFFICER_ALEMAYEHU',
          rejectionDate: new Date().toISOString().split('T')[0],
          detailedReason: '',
          requiredActions: '',
          legalReference: '',
          appealDeadline: '14',
          officerNotes: '',
        });
        
        await loadData();
      } else {
        console.error('[CUSTOMS] ❌ Failed to reject declaration:', result);
        setSnackbar({
          open: true,
          message: `Failed to reject declaration: ${result.error?.message || 'Unknown error'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to reject declaration:', error);
      setSnackbar({
        open: true,
        message: `Network error: ${error}`,
        severity: 'error',
      });
    }
  };

  const handleSubmitNewDeclaration = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('❌ Authentication Required\n\nPlease log in to submit a customs declaration.');
      return;
    }

    // COMPREHENSIVE VALIDATION - Ensure all critical fields are populated
    const validationErrors: string[] = [];
    
    if (!newDeclarationForm.shipmentId || newDeclarationForm.shipmentId.trim() === '') {
      validationErrors.push('• Shipment ID is required');
    }
    
    if (!newDeclarationForm.exporterId || newDeclarationForm.exporterId.trim() === '') {
      validationErrors.push('• Exporter ID is required');
    }
    
    if (!newDeclarationForm.quantity || parseFloat(newDeclarationForm.quantity) <= 0) {
      validationErrors.push('• Quantity must be greater than 0');
    }
    
    if (!newDeclarationForm.value || parseFloat(newDeclarationForm.value) <= 0) {
      validationErrors.push('• Value must be greater than 0');
    }
    
    if (!newDeclarationForm.destination || newDeclarationForm.destination.trim() === '') {
      validationErrors.push('• Destination country is required');
    }
    
    if (!newDeclarationForm.currency || newDeclarationForm.currency.trim() === '') {
      validationErrors.push('• Currency is required');
    }
    
    if (!newDeclarationForm.hsCode || newDeclarationForm.hsCode.trim() === '') {
      validationErrors.push('• HS Code is required');
    }
    
    if (!newDeclarationForm.portOfExit || newDeclarationForm.portOfExit.trim() === '') {
      validationErrors.push('• Port of Exit is required');
    }
    
    // Display validation errors if any
    if (validationErrors.length > 0) {
      alert(
        '❌ Validation Failed\n\n' +
        'Please complete the following required fields:\n\n' +
        validationErrors.join('\n') +
        '\n\nTip: Enter a Shipment ID first to auto-populate these fields.'
      );
      return;
    }

    try {
      const declarationId = `CD-${newDeclarationForm.shipmentId}`;
      
      console.log('[CUSTOMS] Submitting declaration with complete data:', {
        declarationId,
        shipmentId: newDeclarationForm.shipmentId,
        exporterId: newDeclarationForm.exporterId,
        quantity: newDeclarationForm.quantity,
        value: newDeclarationForm.value,
        destination: newDeclarationForm.destination,
      });
      
      const response = await apiFetch('/customs/declaration/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          declarationID: declarationId,
          shipmentID: newDeclarationForm.shipmentId,
          exporterID: newDeclarationForm.exporterId,
          declarationType: newDeclarationForm.declarationType,
          hsCode: newDeclarationForm.hsCode,
          quantity: parseFloat(newDeclarationForm.quantity),
          value: parseFloat(newDeclarationForm.value),
          currency: newDeclarationForm.currency,
          destination: newDeclarationForm.destination,
          portOfExit: newDeclarationForm.portOfExit,
          eudrCompliant: newDeclarationForm.eudrCompliant,
          additionalNotes: newDeclarationForm.additionalNotes,
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Close the dialog immediately
        setNewDeclarationDialogOpen(false);
        
        // Show professional success message
        setSnackbar({
          open: true,
          message: `Declaration ${declarationId} submitted successfully. Status: SUBMITTED - Ready for inspection.`,
          severity: 'success',
        });
        
        // Reset form
        setNewDeclarationForm({
          shipmentId: '',
          exporterId: '',
          declarationType: 'STANDARD',
          hsCode: '090111',
          quantity: '',
          value: '',
          currency: 'USD',
          destination: '',
          portOfExit: 'Djibouti Port',
          eudrCompliant: false,
          additionalNotes: '',
        });
        
        // Reload declarations to show the new one
        await loadData();
        
        // Reload permit-ready shipments (remove the one we just submitted)
        await loadPermitReadyShipments();
        
        // Switch to Tab 1 (Submitted) to show the new declaration
        setTabValue(1);
        
        console.log('[CUSTOMS] ✅ Declaration submitted, switched to Submitted tab');
      } else {
        setSnackbar({
          open: true,
          message: `Failed to submit declaration: ${result.error?.message || 'Unknown error'}`,
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('[CUSTOMS] Failed to submit declaration:', error);
      setSnackbar({
        open: true,
        message: `Network error: ${error}`,
        severity: 'error',
      });
    }
  };
  const declarationColumns: GridColDef[] = [
    { field: 'declarationId', headerName: 'Declaration ID', width: 140 },
    { field: 'shipmentId', headerName: 'Shipment ID', width: 150 },
    { field: 'exporterId', headerName: 'Exporter', width: 130 },
    {
      field: 'declarationType',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'STANDARD' ? 'primary' :
            params.value === 'SIMPLIFIED' ? 'secondary' : 'success'
          }
        />
      ),
    },
    { field: 'hsCode', headerName: 'HS Code', width: 100 },
    { field: 'quantity', headerName: 'Quantity (kg)', width: 120 },
    {
      field: 'value',
      headerName: 'Value',
      width: 120,
      renderCell: (params) => formatCurrency(params.value, params.row.currency),
    },
    { field: 'destination', headerName: 'Destination', width: 120 },
    {
      field: 'eudrCompliant',
      headerName: 'EUDR',
      width: 80,
      renderCell: (params) => (
        params.value ? <CheckCircle color="success" /> : <Cancel color="disabled" />
      ),
    },
    {
      field: 'inspectionRequired',
      headerName: 'Inspection',
      width: 100,
      renderCell: (params) => (
        params.value ? <Security color="warning" /> : <CheckCircle color="success" />
      ),
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
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View Declaration Details">
            <IconButton 
              size="small" 
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDeclaration(params.row);
              }}
            >
              <Visibility />
            </IconButton>
          </Tooltip>
          
          {/* SUBMITTED → Schedule Inspection */}
          {params.row.status === 'SUBMITTED' && (
            <Tooltip title="Schedule Physical Inspection">
              <IconButton 
                size="small" 
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDeclaration(params.row);
                  autoMapInspectionData(params.row);
                  setInspectionDialogOpen(true);
                }}
              >
                <Security />
              </IconButton>
            </Tooltip>
          )}
          
          {/* UNDER_INSPECTION → Complete Inspection */}
          {params.row.status === 'UNDER_INSPECTION' && (
            <Tooltip title="Complete Physical Inspection">
              <IconButton 
                size="small" 
                color="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteInspection(params.row.declarationId);
                }}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          
          {/* UNDER_REVIEW → Clear or Reject */}
          {params.row.status === 'UNDER_REVIEW' && (
            <>
              <Tooltip title="Approve & Clear Declaration">
                <IconButton 
                  size="small" 
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDeclaration(params.row);
                    autoMapClearanceData(params.row);
                    setClearanceDialogOpen(true);
                  }}
                >
                  <CheckCircle />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Declaration">
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDeclaration(params.row);
                    setRejectionDialogOpen(true);
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

  const getDeclarationStats = () => {
    const permitReady = permitReadyShipments.length;
    const submitted = declarations.filter(d => d.status === 'SUBMITTED').length;
    const underInspection = declarations.filter(d => d.status === 'UNDER_INSPECTION').length;
    const underReview = declarations.filter(d => d.status === 'UNDER_REVIEW').length;
    const cleared = declarations.filter(d => d.status === 'CLEARED').length;
    const rejected = declarations.filter(d => d.status === 'REJECTED').length;
    const totalValue = declarations.reduce((sum, declaration) => sum + declaration.value, 0);

    return { permitReady, submitted, underInspection, underReview, cleared, rejected, totalValue };
  };

  const stats = getDeclarationStats();

  // Filter declarations based on selected status
  const getFilteredDeclarations = () => {
    if (statusFilter === 'ALL') return declarations;
    return declarations.filter(d => d.status === statusFilter);
  };

  // Brand colors for Customs Portal
  const brandPrimary = '#0F47AF'; // Government Blue
  const brandSecondary = '#FCDD09'; // Ethiopian Gold

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef5ff 48%, #fffaf0 100%)',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Workflow Status Cards - Clickable KPI Cards (Banks/ECTA Portal Style) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { icon: <Assignment />, label: 'Permit Ready', value: stats.permitReady, color: '#9c27b0', index: 0 },
          { icon: <LocalShipping />, label: 'Submitted', value: stats.submitted, color: '#2196f3', index: 1 },
          { icon: <Security />, label: 'Inspecting', value: stats.underInspection, color: '#ff9800', index: 2 },
          { icon: <Warning />, label: 'Under Review', value: stats.underReview, color: '#ffc107', index: 3 },
          { icon: <CheckCircle />, label: 'Cleared', value: stats.cleared, color: '#4caf50', index: 4 },
          { icon: <Cancel />, label: 'Rejected', value: stats.rejected, color: '#f44336', index: 5 },
        ].map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={2} key={idx}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                height: 140,
                border: tabValue === kpi.index ? `2px solid ${kpi.color}` : `1px solid #e0e0e0`,
                bgcolor: tabValue === kpi.index ? `${kpi.color}08` : 'white',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: 2,
                boxShadow: tabValue === kpi.index 
                  ? `0 4px 12px ${kpi.color}40` 
                  : '0 1px 3px rgba(0,0,0,0.05)',
                '&:hover': {
                  boxShadow: `0 8px 24px ${kpi.color}40`,
                  transform: 'translateY(-4px)',
                  borderColor: kpi.color,
                },
              }}
              onClick={() => setTabValue(kpi.index)}
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
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {/* Workflow Progress Alert */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2">
            <strong>Customs Workflow:</strong> Click KPI cards above or tabs below to navigate through workflow stages
          </Typography>
        </Box>
      </Alert>

      {/* 2026 EUDR Compliance Alert */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>EUDR Compliance (2026):</strong> Enhanced documentation required for EU destinations. 
          Deforestation-free verification mandatory for all coffee exports to European Union.
          <br />
          <strong>Processing Time:</strong> Standard: 1.8 days • EUDR Enhanced: 6.5 days • Risk-based: 3.1 days
        </Typography>
      </Alert>

      {/* Certificate Verification Alert (NEW) */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          🌿 Certificate Verification (NEW)
        </Typography>
        <Typography variant="body2">
          Before clearance approval, the system automatically verifies:
          • <strong>Phytosanitary Certificate</strong> (IPPC required for all agricultural exports)
          • <strong>Insurance Certificate</strong> (ICC required for CIF incoterm shipments)
          <br />
          Missing certificates will trigger warnings during clearance process.
        </Typography>
      </Alert>

      {/* Tabs - Customs Workflow (Banks/ECTA Portal Style) */}
      <Paper sx={{ 
        mb: 3, 
        borderRadius: 2, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
        border: '1px solid #e0e0e0',
        overflow: 'hidden'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)} 
          variant="fullWidth"
          sx={{ 
            borderBottom: 2,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#666',
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: '#0F47AF',
                fontWeight: 700,
                bgcolor: 'rgba(15, 71, 175, 0.05)',
              },
              '&:hover': {
                color: '#0F47AF',
                bgcolor: 'rgba(15, 71, 175, 0.03)',
              }
            },
            '& .MuiTabs-indicator': {
              height: 4,
              backgroundColor: '#0F47AF',
              borderRadius: '4px 4px 0 0',
            }
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

      <Box>

        {/* Tab 0: Permit Ready (Shipments with ECTA Export Permits) */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            📋 Permit-Ready Shipments (ECTA Export Permits Issued)
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600}>
              Ready for Customs Declaration
            </Typography>
            <Typography variant="body2">
              These shipments have passed ECTA quality inspection and received export permits. 
              Click "Create Declaration" to begin customs clearance process.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            {permitReadyShipments.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ width: '15%', fontWeight: 600 }}>Inspection ID</TableCell>
                      <TableCell sx={{ width: '15%', fontWeight: 600 }}>Shipment ID</TableCell>
                      <TableCell sx={{ width: '12%', fontWeight: 600 }}>Exporter</TableCell>
                      <TableCell sx={{ width: '12%', fontWeight: 600 }}>Quality Grade</TableCell>
                      <TableCell sx={{ width: '10%', fontWeight: 600 }}>Score</TableCell>
                      <TableCell sx={{ width: '15%', fontWeight: 600 }}>Certificate No</TableCell>
                      <TableCell sx={{ width: '15%', fontWeight: 600 }}>Export Permit</TableCell>
                      <TableCell align="right" sx={{ width: '6%', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permitReadyShipments.map((shipment: any) => (
                      <TableRow key={shipment.inspectionId} hover>
                        <TableCell>{shipment.inspectionId}</TableCell>
                        <TableCell>{shipment.shipmentId}</TableCell>
                        <TableCell>{shipment.exporterId}</TableCell>
                        <TableCell>{shipment.qualityGrade || shipment.classification || 'N/A'}</TableCell>
                        <TableCell>{shipment.totalScore ? `${shipment.totalScore}/10` : 'N/A'}</TableCell>
                        <TableCell>{shipment.certificateNo || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={shipment.exportPermitNo || 'N/A'} 
                            color="success" 
                            size="small"
                            icon={<CheckCircle />}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Assignment />}
                            onClick={() => handleCreateDeclarationFromPermit(shipment.shipmentId, shipment.inspectionId)}
                            sx={{
                              backgroundColor: '#9c27b0',
                              '&:hover': { backgroundColor: '#7b1fa2' }
                            }}
                          >
                            Create Declaration
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="warning">
                <Typography variant="body2">
                  No permit-ready shipments found. Inspections must be completed by ECTA before customs declarations can be processed.
                </Typography>
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* Tab 1: Submitted Declarations */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            📤 Submitted Declarations (Awaiting Inspection)
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Actions Required:</strong> Schedule physical inspection for these declarations
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={declarations.filter(d => d.status === 'SUBMITTED')}
              columns={declarationColumns}
              getRowId={(row) => row.declarationId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </TabPanel>

        {/* Tab 2: Under Inspection */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            🔍 Under Inspection (Physical Verification In Progress)
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Actions Required:</strong> Complete physical inspection and mark as passed/failed
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={declarations.filter(d => d.status === 'UNDER_INSPECTION')}
              columns={declarationColumns}
              getRowId={(row) => row.declarationId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </TabPanel>

        {/* Tab 3: Under Review */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            ⚖️ Under Review (Ready for Clearance Decision)
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Actions Required:</strong> Review documents and either CLEAR or REJECT declaration
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={declarations.filter(d => d.status === 'UNDER_REVIEW')}
              columns={declarationColumns}
              getRowId={(row) => row.declarationId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </TabPanel>

        {/* Tab 4: Cleared */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            ✅ Cleared Declarations (Authorized for Export)
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> Export authorized. Shipments ready for freight booking and shipping.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <CustomsClearedShipments />
          </Box>
        </TabPanel>

        {/* Tab 5: Rejected */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            ❌ Rejected Declarations (Require Corrections)
          </Typography>
          
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Status:</strong> These declarations have been rejected. Exporters must correct issues and resubmit.
            </Typography>
          </Alert>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={declarations.filter(d => d.status === 'REJECTED')}
              columns={declarationColumns}
              getRowId={(row) => row.declarationId}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          {/* User Management Tab */}
          <UserManagement />
        </TabPanel>

        <TabPanel value={tabValue} index={7}>
          {/* Audit Trail Tab */}
          <AuditTrailTable
            title="Customs Portal - Complete Transaction History"
            autoRefresh={true}
            refreshInterval={60000}
            showStats={false}
            maxHeight={700}
          />
        </TabPanel>
      </Box>

      {/* Declaration Detail Dialog */}
      <Dialog open={!!selectedDeclaration && !clearanceDialogOpen && !inspectionDialogOpen && !rejectionDialogOpen} onClose={() => setSelectedDeclaration(null)} maxWidth="md" fullWidth>
        <DialogTitle>Customs Declaration Details</DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Declaration ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedDeclaration.declarationId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Shipment ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedDeclaration.shipmentId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedDeclaration.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Destination</Typography>
                  <Typography variant="body1">{selectedDeclaration.destination}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Intended Transport</Typography>
                  <Chip
                    icon={selectedDeclaration.transportMode === 'AIR' ? <FlightTakeoff /> : <DirectionsBoat />}
                    label={selectedDeclaration.transportMode === 'AIR' ? 'Air Freight' : 'Sea Freight'}
                    color={selectedDeclaration.transportMode === 'AIR' ? 'secondary' : 'primary'}
                    size="small"
                  />
                </Grid>
                {selectedDeclaration.transportMode === 'AIR' && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Priority Processing:</strong> Air freight shipment requires expedited customs clearance.
                        Target clearance time: 24 hours.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Declaration Type</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedDeclaration.declarationType}
                      size="small"
                      color={
                        selectedDeclaration.declarationType === 'STANDARD' ? 'primary' :
                        selectedDeclaration.declarationType === 'SIMPLIFIED' ? 'secondary' : 'success'
                      }
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">HS Code</Typography>
                  <Typography variant="body1">{selectedDeclaration.hsCode}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1">{selectedDeclaration.quantity.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Value</Typography>
                  <Typography variant="body1" color="primary" fontWeight={600}>
                    {formatCurrency(selectedDeclaration.value, selectedDeclaration.currency)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">EUDR Compliant</Typography>
                  <Box>
                    {selectedDeclaration.eudrCompliant ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="disabled" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Inspection Required</Typography>
                  <Box>
                    {selectedDeclaration.inspectionRequired ? (
                      <Security color="warning" />
                    ) : (
                      <CheckCircle color="success" />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip status={selectedDeclaration.status} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Submission Date</Typography>
                  <Typography variant="body1">{formatDate(selectedDeclaration.submissionDate)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Customs Officer</Typography>
                  <Typography variant="body1">{selectedDeclaration.customsOfficer}</Typography>
                </Grid>
                {selectedDeclaration.clearanceDate && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">Clearance Date</Typography>
                    <Typography variant="body1">{formatDate(selectedDeclaration.clearanceDate)}</Typography>
                  </Grid>
                )}
              </Grid>
              
              {selectedDeclaration.status === 'UNDER_REVIEW' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This declaration is under review. {selectedDeclaration.inspectionRequired ? 'Inspection is required before clearance.' : 'Review and clear to proceed with export.'}
                </Alert>
              )}
              
              {selectedDeclaration.status === 'CLEARED' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  This declaration has been cleared. The shipment is authorized for export.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Assignment />}
            onClick={() => {
              setAuditEntityType('DECLARATION');
              setAuditEntityId(selectedDeclaration?.declarationId || '');
              setShowAuditTrail(true);
            }}
            sx={{ textTransform: 'none', mr: 'auto' }}
          >
            Audit Trail
          </Button>
          <AnimatedButton onClick={() => setSelectedDeclaration(null)}>
            Close
          </AnimatedButton>
          {selectedDeclaration?.status === 'UNDER_REVIEW' && (
            <>
              {selectedDeclaration.inspectionRequired && (
                <AnimatedButton
                  variant="outlined"
                  brandColor="#ff9800"
                  onClick={() => {
                    if (selectedDeclaration) {
                      autoMapInspectionData(selectedDeclaration);
                    }
                    setInspectionDialogOpen(true);
                  }}
                >
                  Schedule Inspection
                </AnimatedButton>
              )}
              <AnimatedButton
                variant="outlined"
                brandColor="#f44336"
                onClick={() => {
                  setRejectionDialogOpen(true);
                }}
              >
                Reject Declaration
              </AnimatedButton>
              <AnimatedButton
                variant="contained"
                brandColor="#4caf50"
                onClick={() => {
                  if (selectedDeclaration) {
                    autoMapClearanceData(selectedDeclaration);
                  }
                  setClearanceDialogOpen(true);
                }}
              >
                Clear Declaration
              </AnimatedButton>
            </>
          )}
          {selectedDeclaration?.status === 'SUBMITTED' && (
            <>
              <AnimatedButton
                variant="outlined"
                brandColor="#ff9800"
                onClick={() => {
                  if (selectedDeclaration) {
                    autoMapInspectionData(selectedDeclaration);
                  }
                  setInspectionDialogOpen(true);
                }}
              >
                Schedule Inspection
              </AnimatedButton>
              <AnimatedButton
                variant="outlined"
                brandColor="#f44336"
                onClick={() => {
                  setRejectionDialogOpen(true);
                }}
              >
                Reject Declaration
              </AnimatedButton>
            </>
          )}
          {selectedDeclaration?.status === 'REJECTED' && (
            <>
              <AnimatedButton
                variant="outlined"
                brandColor="#ff9800"
                onClick={() => {
                  setRejectionDetailsDialogOpen(true);
                }}
              >
                View Rejection Details
              </AnimatedButton>
            </>
          )}
          {selectedDeclaration?.status === 'UNDER_INSPECTION' && (
            <>
              <AnimatedButton
                variant="contained"
                brandColor="#4caf50"
                onClick={() => {
                  if (selectedDeclaration) {
                    handleCompleteInspection(selectedDeclaration.declarationId);
                  }
                }}
              >
                Complete Inspection
              </AnimatedButton>
              <AnimatedButton
                variant="outlined"
                brandColor="#f44336"
                onClick={() => {
                  setRejectionDialogOpen(true);
                }}
              >
                Reject After Inspection
              </AnimatedButton>
            </>
          )}
          {selectedDeclaration?.status === 'CLEARED' && (
            <>
              <AnimatedButton
                variant="outlined"
                brandColor="#2196f3"
                onClick={() => {
                  alert(`Declaration Cleared\n\nClearance Number: CLR-${Date.now()}\nExport Authorized: Yes\nShipment Status: CUSTOMS_CLEARED\n\nThe shipment is authorized for export.`);
                }}
              >
                View Clearance Certificate
              </AnimatedButton>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Cancel color="error" />
            <Typography variant="h6">Reject Customs Declaration</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box sx={{ pt: 2 }}>
              {/* Declaration Summary */}
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>⚠️ Declaration Rejection</strong><br />
                  <strong>Declaration:</strong> {selectedDeclaration.declarationId}<br />
                  <strong>Exporter:</strong> {selectedDeclaration.exporterId}<br />
                  <strong>Value:</strong> {formatCurrency(selectedDeclaration.value, selectedDeclaration.currency)}<br />
                  <strong>Destination:</strong> {selectedDeclaration.destination}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                {/* Rejection Category */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Rejection Category"
                    defaultValue="DOCUMENTATION"
                    helperText="Primary reason for rejection"
                  >
                    <MenuItem value="DOCUMENTATION">Documentation Incomplete/Invalid</MenuItem>
                    <MenuItem value="QUALITY">Quality Standards Not Met</MenuItem>
                    <MenuItem value="VALUATION">Valuation Discrepancy</MenuItem>
                    <MenuItem value="CLASSIFICATION">Incorrect HS Code Classification</MenuItem>
                    <MenuItem value="EUDR">EUDR Compliance Failure</MenuItem>
                    <MenuItem value="PERMIT">Missing/Invalid Export Permit</MenuItem>
                    <MenuItem value="CERTIFICATE">Certificate Issues (Phyto/Quality)</MenuItem>
                    <MenuItem value="FRAUD">Suspected Fraud/Misrepresentation</MenuItem>
                    <MenuItem value="SANCTIONS">Trade Sanctions/Restrictions</MenuItem>
                    <MenuItem value="OTHER">Other (Specify in notes)</MenuItem>
                  </TextField>
                </Grid>

                {/* Severity Level */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Severity Level"
                    defaultValue="CORRECTABLE"
                    helperText="Can this be corrected?"
                  >
                    <MenuItem value="CORRECTABLE">🟡 Correctable (Can resubmit after fix)</MenuItem>
                    <MenuItem value="MAJOR">🟠 Major Issue (Requires significant correction)</MenuItem>
                    <MenuItem value="CRITICAL">🔴 Critical (Permanent rejection)</MenuItem>
                  </TextField>
                </Grid>

                {/* Rejected By (Officer) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Rejected By (Officer)"
                    defaultValue="OFFICER_ALEMAYEHU"
                    helperText="Customs officer rejecting declaration"
                  >
                    <MenuItem value="OFFICER_ALEMAYEHU">Officer Alemayehu T. (Senior Inspector)</MenuItem>
                    <MenuItem value="OFFICER_TIGIST">Officer Tigist M. (EUDR Specialist)</MenuItem>
                    <MenuItem value="OFFICER_DAWIT">Officer Dawit K. (Physical Inspection)</MenuItem>
                    <MenuItem value="OFFICER_SARA">Officer Sara H. (Documentary Review)</MenuItem>
                  </TextField>
                </Grid>

                {/* Rejection Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Rejection Date"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={new Date().toISOString().split('T')[0]}
                    helperText="Date of rejection decision"
                  />
                </Grid>

                {/* Missing/Invalid Documents */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                    Missing or Invalid Documents:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Export Permit (Missing or Expired)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Quality Inspection Certificate (Invalid)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Phytosanitary Certificate (Missing)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Commercial Invoice (Discrepancies)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">EUDR Due Diligence Statement (Incomplete)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Packing List (Missing/Incomplete)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Certificate of Origin (Invalid)</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Detailed Rejection Reason */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Detailed Rejection Reason"
                    multiline
                    rows={4}
                    placeholder="Provide specific details about why this declaration is being rejected. Be clear and factual..."
                    helperText="This will be visible to the exporter - be professional and specific"
                  />
                </Grid>

                {/* Required Actions for Resubmission */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Required Actions for Resubmission"
                    multiline
                    rows={3}
                    placeholder="List specific actions the exporter must take to correct this declaration..."
                    helperText="e.g., 'Obtain new phytosanitary certificate', 'Correct valuation to match invoice', etc."
                  />
                </Grid>

                {/* Legal Reference */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Legal Reference (Optional)"
                    placeholder="Article/Section reference"
                    helperText="Cite relevant regulation or law"
                  />
                </Grid>

                {/* Appeal Rights Deadline */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Appeal Deadline"
                    defaultValue="14"
                    helperText="Exporter's right to appeal"
                  >
                    <MenuItem value="7">7 Days</MenuItem>
                    <MenuItem value="14">14 Days (Standard)</MenuItem>
                    <MenuItem value="30">30 Days (Extended)</MenuItem>
                  </TextField>
                </Grid>

                {/* Officer Notes (Internal) */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Officer Notes (Internal)"
                    multiline
                    rows={2}
                    placeholder="Internal customs notes (not visible to exporter)..."
                    helperText="Risk assessment, investigation notes, escalation required, etc."
                  />
                </Grid>
              </Grid>

              {/* Final Warning */}
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>⚠️ Rejection Consequences</strong><br />
                  By rejecting this declaration:
                  • Export will be blocked until corrected<br />
                  • Exporter will be notified immediately<br />
                  • Shipment status will be marked as REJECTED<br />
                  • Rejection will be recorded on blockchain (permanent record)<br />
                  • Exporter has the right to appeal within the specified deadline
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setRejectionDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#f44336"
            onClick={() => {
              if (!selectedDeclaration) return;
              handleRejectDeclaration(selectedDeclaration.declarationId);
            }}
          >
            Confirm Rejection
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Clearance Dialog */}
      <Dialog open={clearanceDialogOpen} onClose={() => setClearanceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            <Typography variant="h6">Clear Export Declaration</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box sx={{ pt: 2 }}>
              {/* Declaration Summary */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Declaration:</strong> {selectedDeclaration.declarationId}<br />
                  <strong>Shipment:</strong> {selectedDeclaration.shipmentId}<br />
                  <strong>Exporter:</strong> {selectedDeclaration.exporterId}
                  {clearanceAutoData.companyName && ` (${clearanceAutoData.companyName})`}<br />
                  <strong>Quantity:</strong> {selectedDeclaration.quantity.toLocaleString()} kg<br />
                  <strong>Value:</strong> {formatCurrency(selectedDeclaration.value, selectedDeclaration.currency)}<br />
                  <strong>Destination:</strong> {selectedDeclaration.destination}<br />
                  <strong>HS Code:</strong> {selectedDeclaration.hsCode}
                </Typography>
              </Alert>

              {clearanceAutoData.clearanceNumber && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ✅ <strong>Auto-Generated Clearance Data:</strong><br />
                    Clearance Number: {clearanceAutoData.clearanceNumber}<br />
                    Reviewing Officer: {clearanceAutoData.inspectorName}
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={2}>
                {/* Clearance Number */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Clearance Number"
                    defaultValue={clearanceAutoData.clearanceNumber || `CLR-${Date.now()}`}
                    helperText="Auto-generated official clearance reference"
                    InputProps={{
                      sx: clearanceAutoData.clearanceNumber ? { bgcolor: 'success.50' } : {}
                    }}
                  />
                </Grid>

                {/* Clearance Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Clearance Date"
                    InputLabelProps={{ shrink: true }}
                    defaultValue={new Date().toISOString().split('T')[0]}
                    helperText="Date of customs clearance"
                  />
                </Grid>

                {/* Cleared By (Officer) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Cleared By (Officer)"
                    defaultValue="OFFICER_ALEMAYEHU"
                    helperText="Customs officer authorizing clearance"
                  >
                    <MenuItem value="OFFICER_ALEMAYEHU">Officer Alemayehu T. (Senior Inspector)</MenuItem>
                    <MenuItem value="OFFICER_TIGIST">Officer Tigist M. (EUDR Specialist)</MenuItem>
                    <MenuItem value="OFFICER_DAWIT">Officer Dawit K. (Physical Inspection)</MenuItem>
                    <MenuItem value="OFFICER_SARA">Officer Sara H. (Documentary Review)</MenuItem>
                  </TextField>
                </Grid>

                {/* Clearance Type */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Clearance Type"
                    defaultValue="FULL"
                    helperText="Type of customs clearance granted"
                  >
                    <MenuItem value="FULL">Full Clearance (Unrestricted Export)</MenuItem>
                    <MenuItem value="CONDITIONAL">Conditional (With restrictions)</MenuItem>
                    <MenuItem value="PARTIAL">Partial Clearance (Specific lots only)</MenuItem>
                    <MenuItem value="EXPEDITED">Expedited (Fast-track)</MenuItem>
                  </TextField>
                </Grid>

                {/* Customs Duties */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Customs Duties (ETB)"
                    defaultValue="0"
                    helperText="Total duties and taxes payable"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>ETB</Typography>
                    }}
                  />
                </Grid>

                {/* VAT Amount */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="VAT Amount (ETB)"
                    defaultValue="0"
                    helperText="Value Added Tax (if applicable)"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>ETB</Typography>
                    }}
                  />
                </Grid>

                {/* Port of Exit */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Exit Point"
                    defaultValue="DJIBOUTI"
                    helperText="Authorized exit point for export"
                  >
                    <MenuItem value="DJIBOUTI">Djibouti Port (Main Route)</MenuItem>
                    <MenuItem value="MOYALE">Moyale Border (Kenya)</MenuItem>
                    <MenuItem value="GALAFI">Galafi Border (Djibouti)</MenuItem>
                    <MenuItem value="BOLE_AIRPORT">Addis Ababa Bole Airport</MenuItem>
                  </TextField>
                </Grid>

                {/* Validity Period */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Clearance Validity"
                    defaultValue="30"
                    helperText="How long clearance remains valid"
                  >
                    <MenuItem value="7">7 Days (Standard)</MenuItem>
                    <MenuItem value="14">14 Days (Extended)</MenuItem>
                    <MenuItem value="30">30 Days (Maximum)</MenuItem>
                    <MenuItem value="CUSTOM">Custom Period</MenuItem>
                  </TextField>
                </Grid>

                {/* Certificate Verification */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                    Certificate & Document Verification:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Export Permit Verified</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Quality Inspection Certificate Verified</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Phytosanitary Certificate Verified</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Commercial Invoice Verified</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked={selectedDeclaration.eudrCompliant} />
                      <Typography variant="body2">EUDR Due Diligence Statement Verified</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Insurance Certificate Verified (if CIF)</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Clearance Remarks */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Clearance Remarks"
                    multiline
                    rows={3}
                    placeholder="Enter any special conditions, restrictions, or notes for this clearance..."
                    helperText="e.g., 'Export approved pending payment confirmation', 'Route via Djibouti only', etc."
                  />
                </Grid>

                {/* Officer Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Officer Notes (Internal)"
                    multiline
                    rows={2}
                    placeholder="Internal customs notes (not visible to exporter)..."
                    helperText="Risk assessment, verification details, follow-up required, etc."
                  />
                </Grid>
              </Grid>

              {/* EUDR Compliance Confirmation */}
              {selectedDeclaration.eudrCompliant && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>✅ EUDR Compliance Verified</strong><br />
                    This shipment meets EU Deforestation Regulation requirements:
                    • Geolocation data verified<br />
                    • Deforestation-free certification confirmed<br />
                    • Complete supply chain traceability documented<br />
                    • Due diligence statement compliant
                  </Typography>
                </Alert>
              )}

              {/* Final Authorization Warning */}
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>⚠️ Final Authorization</strong><br />
                  By clearing this declaration, you authorize the export of goods and confirm:
                  • All documents have been verified<br />
                  • Duties and taxes (if any) have been assessed<br />
                  • Goods comply with export regulations<br />
                  • Clearance will be recorded on blockchain (immutable)
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setClearanceDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#4caf50"
            onClick={() => {
              if (!selectedDeclaration) return;
              handleClearDeclaration(selectedDeclaration.declarationId);
            }}
          >
            Authorize Clearance
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={inspectionDialogOpen} onClose={() => setInspectionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Security color="primary" />
            <Typography variant="h6">Schedule Customs Inspection</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box sx={{ pt: 2 }}>
              {/* Declaration Summary */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Declaration:</strong> {selectedDeclaration.declarationId}<br />
                  <strong>Exporter:</strong> {selectedDeclaration.exporterId} 
                  {inspectionAutoData.companyName && ` (${inspectionAutoData.companyName})`}<br />
                  <strong>Quantity:</strong> {selectedDeclaration.quantity.toLocaleString()} kg<br />
                  <strong>Value:</strong> {formatCurrency(selectedDeclaration.value, selectedDeclaration.currency)}<br />
                  <strong>Destination:</strong> {selectedDeclaration.destination}
                </Typography>
              </Alert>

              {inspectionAutoData.contactPerson && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ✅ <strong>Auto-Mapped from Exporter Registration:</strong><br />
                    Contact: {inspectionAutoData.contactPerson} ({inspectionAutoData.contactPhone})<br />
                    Company: {inspectionAutoData.companyName}<br />
                    Location: {inspectionAutoData.shipmentLocation}
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={2}>
                {/* Inspection Type */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Inspection Type"
                    value={inspectionForm.inspectionType}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionType: e.target.value })}
                    helperText="Select the type of inspection required"
                  >
                    <MenuItem value="DOCUMENTARY">Documentary Review (Desk-based)</MenuItem>
                    <MenuItem value="STANDARD">Standard Physical Inspection</MenuItem>
                    <MenuItem value="EUDR_ENHANCED">EUDR Enhanced (EU Deforestation)</MenuItem>
                    <MenuItem value="RISK_BASED">Risk-Based Targeted Inspection</MenuItem>
                    <MenuItem value="XRAY">X-Ray Scanning</MenuItem>
                    <MenuItem value="FULL">Full Container Inspection</MenuItem>
                  </TextField>
                </Grid>

                {/* Priority Level */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Priority Level"
                    value={inspectionForm.priorityLevel}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, priorityLevel: e.target.value })}
                    helperText="Urgency of inspection"
                  >
                    <MenuItem value="URGENT">🔴 Urgent (Within 24 hours)</MenuItem>
                    <MenuItem value="HIGH">🟠 High (Within 48 hours)</MenuItem>
                    <MenuItem value="NORMAL">🟢 Normal (3-5 business days)</MenuItem>
                    <MenuItem value="LOW">⚪ Low (Routine schedule)</MenuItem>
                  </TextField>
                </Grid>

                {/* Scheduled Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Inspection Date"
                    value={inspectionForm.scheduledDate}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, scheduledDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: new Date().toISOString().split('T')[0]
                    }}
                    helperText="Proposed date for inspection"
                  />
                </Grid>

                {/* Scheduled Time */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="time"
                    label="Inspection Time"
                    value={inspectionForm.scheduledTime}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, scheduledTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Start time (working hours 08:00-17:00)"
                  />
                </Grid>

                {/* Inspection Location */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Inspection Location"
                    value={inspectionForm.location}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, location: e.target.value })}
                    helperText="Auto-detected from shipment channel"
                  >
                    <MenuItem value="PORT">Djibouti Port - Customs Area</MenuItem>
                    <MenuItem value="WAREHOUSE">Bonded Warehouse</MenuItem>
                    <MenuItem value="FACTORY">Exporter's Facility</MenuItem>
                    <MenuItem value="CUSTOMS_OFFICE">Customs Office</MenuItem>
                    <MenuItem value="ECX">ECX Warehouse</MenuItem>
                  </TextField>
                </Grid>

                {/* Inspector Assignment */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Assigned Inspector"
                    value={inspectionForm.assignedInspector}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, assignedInspector: e.target.value })}
                    helperText="Customs officer responsible"
                  >
                    <MenuItem value="OFFICER_ALEMAYEHU">Officer Alemayehu T. (Senior Inspector)</MenuItem>
                    <MenuItem value="OFFICER_TIGIST">Officer Tigist M. (EUDR Specialist)</MenuItem>
                    <MenuItem value="OFFICER_DAWIT">Officer Dawit K. (Physical Inspection)</MenuItem>
                    <MenuItem value="OFFICER_SARA">Officer Sara H. (Documentary Review)</MenuItem>
                    <MenuItem value="AUTO_ASSIGN">Auto-Assign (System will assign)</MenuItem>
                  </TextField>
                </Grid>

                {/* Contact Person */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Exporter Contact Person"
                    value={inspectionForm.contactPerson}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, contactPerson: e.target.value })}
                    placeholder="Name of person to contact"
                    helperText="Auto-filled from exporter registration"
                    InputProps={{
                      sx: inspectionAutoData.contactPerson ? { bgcolor: 'success.50' } : {}
                    }}
                  />
                </Grid>

                {/* Contact Phone */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Contact Phone"
                    value={inspectionForm.contactPhone}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, contactPhone: e.target.value })}
                    placeholder="+251-XX-XXX-XXXX"
                    helperText="Auto-filled from exporter registration"
                    InputProps={{
                      sx: inspectionAutoData.contactPhone ? { bgcolor: 'success.50' } : {}
                    }}
                  />
                </Grid>

                {/* Required Documents */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                    Required Documents (Exporter must provide):
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked disabled />
                      <Typography variant="body2">Export Permit</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked disabled />
                      <Typography variant="body2">Quality Inspection Certificate</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Commercial Invoice</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked />
                      <Typography variant="body2">Packing List</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox defaultChecked={selectedDeclaration.eudrCompliant} />
                      <Typography variant="body2">EUDR Due Diligence Statement (if applicable)</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Checkbox />
                      <Typography variant="body2">Certificate of Origin</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Special Instructions */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Special Instructions"
                    multiline
                    rows={3}
                    value={inspectionForm.specialInstructions}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, specialInstructions: e.target.value })}
                    placeholder="Enter any special requirements, specific samples needed, or additional instructions for the inspection..."
                    helperText="e.g., 'Sample from lot ECX-2026-22943-31578', 'Verify traceability documentation', 'Check moisture content'"
                  />
                </Grid>

                {/* Internal Notes (Officer Only) */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Internal Notes (Officer Only)"
                    multiline
                    rows={2}
                    value={inspectionForm.internalNotes}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, internalNotes: e.target.value })}
                    placeholder="Internal customs notes (not visible to exporter)..."
                    helperText="Risk assessment notes, previous inspection history, etc."
                  />
                </Grid>
              </Grid>

              {/* Risk Assessment Auto-Info */}
              {selectedDeclaration.eudrCompliant && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>🇪🇺 EUDR Enhanced Inspection Required</strong><br />
                    This shipment is destined for the EU and requires enhanced verification of:
                    • Geolocation data of production areas<br />
                    • Deforestation-free certification<br />
                    • Complete supply chain traceability<br />
                    • Due diligence statement compliance
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setInspectionDialogOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="contained" 
            brandColor="#0F47AF"
            onClick={() => {
              if (selectedDeclaration) {
                handleScheduleInspection(selectedDeclaration.declarationId);
              }
            }}
          >
            Schedule Inspection
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Audit Trail Viewer */}
      {showAuditTrail && auditEntityType && (
        <AuditTrailViewer
          open={showAuditTrail}
          entityType={auditEntityType as 'DECLARATION' | 'SHIPMENT' | 'INSPECTION'}
          entityId={auditEntityId}
          onClose={() => setShowAuditTrail(false)}
        />
      )}

      {/* New Declaration Dialog */}
      <Dialog 
        open={newDeclarationDialogOpen} 
        onClose={() => setNewDeclarationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Add />
            <Typography variant="h6">Submit New Customs Declaration</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
            <Typography variant="body2">
              <strong>Manual Declaration Entry with Auto-Mapping</strong>
              <br />
              Enter a <strong>Shipment ID</strong> and the system will automatically fetch and populate:
              • Exporter ID • Quantity • Destination • Currency • EUDR Status
              <br />
              <em>Exporters normally submit declarations through their portal. Use this for special cases or corrections.</em>
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Shipment ID"
                value={newDeclarationForm.shipmentId}
                onChange={(e) => handleShipmentIdChange(e.target.value)}
                placeholder="SHIP1782819513441"
                helperText={isLoadingShipmentData ? "🔄 Loading shipment data..." : "Blockchain shipment identifier - auto-fills other fields"}
                disabled={isLoadingShipmentData}
                error={!newDeclarationForm.shipmentId}
                InputProps={{
                  sx: { 
                    bgcolor: newDeclarationForm.shipmentId ? 'success.50' : 'error.50',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: newDeclarationForm.shipmentId ? 'success.main' : 'error.main',
                      borderWidth: 2
                    }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Exporter ID"
                value={newDeclarationForm.exporterId}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, exporterId: e.target.value })}
                placeholder="EXP6896621"
                helperText="Registered exporter number (auto-filled)"
                InputProps={{
                  sx: newDeclarationForm.exporterId ? { bgcolor: 'success.50' } : {}
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Declaration Type"
                value={newDeclarationForm.declarationType}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, declarationType: e.target.value as 'STANDARD' | 'SIMPLIFIED' | 'EUDR_ENHANCED' })}
              >
                <MenuItem value="STANDARD">Standard Declaration</MenuItem>
                <MenuItem value="SIMPLIFIED">Simplified (Authorized Traders)</MenuItem>
                <MenuItem value="EUDR_ENHANCED">EUDR Enhanced (EU Destinations)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HS Code"
                value={newDeclarationForm.hsCode}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, hsCode: e.target.value })}
                helperText="Coffee, not roasted, not decaffeinated"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Quantity (kg)"
                value={newDeclarationForm.quantity}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, quantity: e.target.value })}
                helperText="Auto-filled from shipment"
                error={!newDeclarationForm.quantity || parseFloat(newDeclarationForm.quantity) <= 0}
                InputProps={{
                  sx: newDeclarationForm.quantity && parseFloat(newDeclarationForm.quantity) > 0 ? { bgcolor: 'success.50' } : {}
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Customs Value"
                value={newDeclarationForm.value}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, value: e.target.value })}
                helperText="FOB value in USD"
                error={!newDeclarationForm.value || parseFloat(newDeclarationForm.value) <= 0}
                InputProps={{
                  sx: newDeclarationForm.value && parseFloat(newDeclarationForm.value) > 0 ? { bgcolor: 'success.50' } : {}
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Destination Country"
                value={newDeclarationForm.destination}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, destination: e.target.value })}
                placeholder="France, Germany, USA..."
                helperText="Auto-filled from contract"
                error={!newDeclarationForm.destination}
                InputProps={{
                  sx: newDeclarationForm.destination ? { bgcolor: 'success.50' } : {}
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Port of Exit"
                value={newDeclarationForm.portOfExit}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, portOfExit: e.target.value })}
                error={!newDeclarationForm.portOfExit}
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" alignItems="center">
                <Checkbox
                  checked={newDeclarationForm.eudrCompliant}
                  onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, eudrCompliant: e.target.checked })}
                />
                <Typography variant="body2">
                  🇪🇺 EUDR Compliant (Enhanced verification for EU destinations)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Additional Notes"
                value={newDeclarationForm.additionalNotes}
                onChange={(e) => setNewDeclarationForm({ ...newDeclarationForm, additionalNotes: e.target.value })}
                placeholder="Special instructions, corrections, or remarks..."
              />
            </Grid>

            {/* Customs Documents Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                📄 Required Export Documents (for Customs Clearance)
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  <strong>Mandatory for Export Clearance:</strong>
                </Typography>
                <List dense>
                  <ListItem><ListItemText primary="• Export Permit - Issued by ECTA after quality inspection" /></ListItem>
                  <ListItem><ListItemText primary="• Phytosanitary Certificate - From Ministry of Agriculture" /></ListItem>
                  <ListItem><ListItemText primary="• Certificate of Origin - Ethiopian Chamber of Commerce" /></ListItem>
                  <ListItem><ListItemText primary="• Commercial Invoice - Exporter's invoice to buyer" /></ListItem>
                  <ListItem><ListItemText primary="• Packing List - Details of packages" /></ListItem>
                  <ListItem><ListItemText primary="• Bill of Lading (B/L) - From shipping company/freight forwarder" /></ListItem>
                  <ListItem><ListItemText primary="• Insurance Certificate - If CIF/CIP terms" /></ListItem>
                  <ListItem><ListItemText primary="• EUDR Due Diligence Statement - If destination is EU" /></ListItem>
                </List>
                <Typography variant="caption" color="text.secondary">
                  All documents must be uploaded before customs can clear the shipment for export.
                </Typography>
              </Alert>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => setCustomsDocUploadOpen(true)}
                fullWidth
              >
                Upload Export Documents ({customsDocuments.length})
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDeclarationDialogOpen(false)}>
            Cancel
          </Button>
          <AnimatedButton
            variant="contained"
            brandColor={brandPrimary}
            onClick={handleSubmitNewDeclaration}
            disabled={
              !newDeclarationForm.shipmentId || 
              !newDeclarationForm.exporterId ||
              !newDeclarationForm.quantity ||
              parseFloat(newDeclarationForm.quantity) <= 0 ||
              !newDeclarationForm.value ||
              parseFloat(newDeclarationForm.value) <= 0 ||
              !newDeclarationForm.destination ||
              !newDeclarationForm.portOfExit ||
              isLoadingShipmentData
            }
          >
            Submit Declaration
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Rejection Details Dialog */}
      <Dialog open={rejectionDetailsDialogOpen} onClose={() => setRejectionDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Cancel color="error" />
            <Typography variant="h6">Rejection Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDeclaration && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Declaration Status:</strong> REJECTED<br />
                  <strong>Declaration ID:</strong> {selectedDeclaration.declarationId}<br />
                  <strong>Shipment ID:</strong> {selectedDeclaration.shipmentId}
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Exporter
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedDeclaration.exporterId}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Customs Officer
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedDeclaration.customsOfficer}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Rejection Reason
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff3e0' }}>
                    <Typography variant="body2">
                      {/* This would come from blockchain data */}
                      <strong>Category:</strong> Documentation Incomplete/Invalid<br /><br />
                      <strong>Details:</strong> The following issues were found:<br />
                      • Missing phytosanitary certificate<br />
                      • Packing list does not match declared quantity<br />
                      • Commercial invoice has discrepancies<br /><br />
                      <strong>Required Actions:</strong><br />
                      1. Obtain valid phytosanitary certificate from Ministry of Agriculture<br />
                      2. Correct packing list to match actual shipment quantity<br />
                      3. Verify commercial invoice matches contract terms<br />
                      4. Resubmit declaration with corrected documents
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Next Steps for Exporter
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="1. Review Rejection Reason"
                        secondary="Understand all issues that need to be corrected"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="2. Make Corrections"
                        secondary="Obtain missing documents and fix any discrepancies"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="3. Resubmit Declaration"
                        secondary="Submit corrected declaration through Exporter Portal"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="4. Appeal (if applicable)"
                        secondary="Exporter has 14 days to appeal this decision if they believe it was incorrect"
                      />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Appeal Rights:</strong> The exporter has 14 days from the rejection date to file an appeal if they believe this decision was incorrect. Appeals should be submitted to the Senior Customs Inspector with supporting evidence.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <AnimatedButton onClick={() => setRejectionDetailsDialogOpen(false)}>
            Close
          </AnimatedButton>
        </DialogActions>
      </Dialog>

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        open={customsDocUploadOpen}
        entityType="CUSTOMS_DECLARATION"
        entityId={selectedDeclaration?.shipmentId || newDeclarationForm.shipmentId || undefined}
        onClose={() => setCustomsDocUploadOpen(false)}
        onUploadComplete={(docs) => {
          setCustomsDocuments(prev => [...prev, ...docs]);
          setCustomsDocUploadOpen(false);
        }}
      />
      
      {/* Professional Snackbar for Success/Error Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', minWidth: 400 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomsPortal;