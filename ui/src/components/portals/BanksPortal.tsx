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
} from '@mui/material';
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
} from '@mui/icons-material';

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
  amount: number;
  currency: string;
  status: string;
  expiryDate: string;
  requestDate: string;
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

const BanksPortal: React.FC = () => {
  const { notification, showSuccess, showError, showWarning, showInfo, closeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [letterOfCredits, setLetterOfCredits] = useState<LetterOfCredit[]>([]);
  const [forexAllocations, setForexAllocations] = useState<ForexAllocation[]>([]);
  const [exportPermits, setExportPermits] = useState<any[]>([]);
  const [documentaryCollections, setDocumentaryCollections] = useState<any[]>([]);
  const [advancePayments, setAdvancePayments] = useState<any[]>([]);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<SalesContract | null>(null);
  const [selectedLC, setSelectedLC] = useState<LetterOfCredit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'lc' | 'forex' | 'permit' | 'lcDetails' | 'cad' | 'advance' | 'consignment' | null>(null);
  
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

  useEffect(() => {
    loadBankingData();
  }, []);

  const loadBankingData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Load all NBE-approved contracts
      const contractsResponse = await fetch('http://localhost:3001/api/v1/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contractsResult = await contractsResponse.json();
      
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
        const lcResponse = await fetch('http://localhost:3001/api/v1/banking/lc', {
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
        const forexResponse = await fetch('http://localhost:3001/api/v1/forex', {
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
        const permitsResponse = await fetch('http://localhost:3001/api/v1/permits', {
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
        const collectionsResponse = await fetch('http://localhost:3001/api/v1/collections', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const collectionsResult = await collectionsResponse.json();
        if (collectionsResult.success) {
          setDocumentaryCollections(Array.isArray(collectionsResult.data) ? collectionsResult.data : []);
        }
      } catch (err) {
        console.warn('Could not load documentary collections:', err);
      }

      // Load Advance Payments
      try {
        const advanceResponse = await fetch('http://localhost:3001/api/v1/advance', {
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
        const consignmentsResponse = await fetch('http://localhost:3001/api/v1/consignment', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const consignmentsResult = await consignmentsResponse.json();
        if (consignmentsResult.success) {
          setConsignments(Array.isArray(consignmentsResult.data) ? consignmentsResult.data : []);
        }
      } catch (err) {
        console.warn('Could not load consignments:', err);
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
      
    } catch (error) {
      console.error('Failed to load banking data:', error);
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

  const handleViewLCDetails = (lc: LetterOfCredit) => {
    setSelectedLC(lc);
    setDialogType('lcDetails');
    setDialogOpen(true);
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
      const requestResponse = await fetch('http://localhost:3001/api/v1/banking/lc/request', {
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
        await fetch(`http://localhost:3001/api/v1/banking/lc/${lcId}/approve`, {
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

        await fetch(`http://localhost:3001/api/v1/banking/lc/${lcId}/issue`, {
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
      const response = await fetch(`http://localhost:3001/api/v1/banking/lc/${lcId}/approve`, {
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

  const handlePaymentMethodSubmit = async (type: string, data: any) => {
    const token = localStorage.getItem('authToken');
    if (!token || !selectedContract) return;

    try {
      if (type === 'cad') {
        const collectionId = `CAD${Date.now()}`;
        const permitId = `PERMIT${Date.now()}`;
        
        const response = await fetch('http://localhost:3001/api/v1/collections/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionId,
            contractId: selectedContract.contractId,
            exporterId: selectedContract.exporterId,
            permitId,
            ...data,
            amount: selectedContract.totalValue,
            currency: selectedContract.currency,
            documents: ['Bill of Lading', 'Commercial Invoice', 'Packing List'],
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
        
        const response = await fetch('http://localhost:3001/api/v1/advance/record', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            contractId: selectedContract.contractId,
            exporterId: selectedContract.exporterId,
            amount: data.amount,
            currency: selectedContract.currency,
            receivingBank: selectedContract.exporterBank || 'Commercial Bank of Ethiopia',
            receivingBankBIC: 'CBETETAA',
            beneficiaryName: selectedContract.exporterId,
            ...data,
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
        const permitId = `PERMIT${Date.now()}`;
        
        const response = await fetch('http://localhost:3001/api/v1/consignment/issue-permit', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consignmentId,
            permitId,
            permitNumber: `CP-${Date.now()}`,
            exporterId: selectedContract.exporterId,
            currency: selectedContract.currency,
            bankBranch: selectedContract.exporterBank || 'CBE Main Branch',
            destination: selectedContract.buyerCountry,
            ...data,
          }),
        });

        const result = await response.json();
        if (result.success) {
          showSuccess('Consignment Permit Issued', `Permit ${permitId} issued for ${data.commodityType}`);
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
          Commercial Banks Portal
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Letter of Credit Issuance, Forex Management & Export Finance
        </Typography>
      </Box>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Pending Contracts"
            value={contracts.length}
            icon={<Assignment />}
            brandColor="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Active LCs"
            value={letterOfCredits.filter(lc => lc.status === 'ISSUED').length}
            icon={<Description />}
            brandColor="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Forex Allocated"
            value={`$${(forexAllocations.reduce((sum, f) => sum + f.allocatedAmount, 0) / 1000).toFixed(0)}K`}
            icon={<CurrencyExchange />}
            brandColor="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKPI
            title="Payments Pending"
            value="3"
            icon={<Payment />}
            brandColor="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="NBE-Approved Contracts" icon={<Assignment />} iconPosition="start" />
          <Tab label="Letters of Credit" icon={<Description />} iconPosition="start" />
          <Tab label="Forex Allocations" icon={<CurrencyExchange />} iconPosition="start" />
          <Tab label="Payment Processing" icon={<Payment />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: NBE-Approved Contracts */}
      {activeTab === 0 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Contracts Awaiting Letter of Credit Issuance
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Banking Workflow:</strong> Issue Letter of Credit (LC) for NBE-approved contracts. 
            LC confirms payment guarantee from buyer's bank and enables forex allocation.
          </Alert>

          {contracts.length === 0 ? (
            <Alert severity="info">
              No NBE-approved contracts pending LC issuance.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Contract ID</strong></TableCell>
                    <TableCell><strong>Exporter</strong></TableCell>
                    <TableCell><strong>Buyer/Country</strong></TableCell>
                    <TableCell><strong>Coffee Type</strong></TableCell>
                    <TableCell><strong>Quantity (kg)</strong></TableCell>
                    <TableCell><strong>Total Value</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.contractId}>
                      <TableCell>{contract.contractId}</TableCell>
                      <TableCell>{contract.exporterId}</TableCell>
                      <TableCell>
                        {contract.buyerName}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {contract.buyerCountry}
                        </Typography>
                      </TableCell>
                      <TableCell>{contract.coffeeType}</TableCell>
                      <TableCell>{contract.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <strong>${contract.totalValue.toLocaleString()}</strong>
                        <Typography variant="caption" display="block" color="text.secondary">
                          @ ${contract.pricePerKg}/kg
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip label="NBE Approved" status="approved" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Issue Letter of Credit">
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Description />}
                            onClick={() => handleOpenDialog('lc', contract)}
                          >
                            Issue LC
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </ModernCard>
      )}

      {/* Tab 1: Letters of Credit */}
      {activeTab === 1 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Letter of Credit Management
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>LC Status Workflow:</strong> REQUESTED → APPROVED → ISSUED → UTILIZED<br />
            Each issued LC enables NBE forex allocation and export permit issuance.
          </Alert>

          {letterOfCredits.length === 0 ? (
            <Alert severity="info">
              No Letters of Credit on record. Issue LCs from NBE-Approved Contracts tab.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
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
                  {letterOfCredits.map((lc) => (
                    <TableRow key={lc.lcId}>
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
                        {lc.status === 'REQUESTED' ? (
                          <Tooltip title="Approve LC">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleApproveLC(lc.lcId, lc.exporterId)}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewLCDetails(lc)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </ModernCard>
      )}

      {/* Tab 2: Forex Allocations */}
      {activeTab === 2 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Foreign Exchange Allocations
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>NBE Forex Retention Policy:</strong> 40% retained in USD, 60% converted to ETB<br />
            Forex allocated after LC confirmation, valid for 180 days
          </Alert>

          {forexAllocations.length === 0 ? (
            <Alert severity="warning">
              No forex allocations yet. Allocations are triggered by NBE after LC issuance.
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {forexAllocations.map((forex) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              <CurrencyExchange sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
              Forex Allocation Summary
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Total Allocated</Typography>
                <Typography variant="h6">
                  ${forexAllocations.reduce((sum, f) => sum + f.allocatedAmount, 0).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">USD Retained (40%)</Typography>
                <Typography variant="h6">
                  ${(forexAllocations.reduce((sum, f) => sum + f.allocatedAmount, 0) * 0.4).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Active Allocations</Typography>
                <Typography variant="h6">
                  {forexAllocations.filter(f => f.status === 'ALLOCATED').length}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </ModernCard>
      )}

      {/* Tab 3: Payment Processing */}
      {activeTab === 3 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            CBE Payment Methods Management
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>CBE Approved Payment Methods (Section 3.2):</strong><br />
            i. Letter of Credit (LC) - Primary method, bank guarantee<br />
            ii. Documentary Collection (CAD) - Cash Against Documents<br />
            iii. Advance Payment - Payment before shipment<br />
            iv. Consignment - Limited to Fruits, Flowers, Meat only
          </Alert>

          {/* Action Buttons */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Description />}
              onClick={() => {
                const contract = contracts[0];
                if (contract) {
                  setSelectedContract(contract);
                  setDialogType('cad');
                  setDialogOpen(true);
                }
              }}
              disabled={contracts.length === 0}
            >
              Documentary Collection (CAD)
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AttachMoney />}
              onClick={() => {
                const contract = contracts[0];
                if (contract) {
                  setSelectedContract(contract);
                  setDialogType('advance');
                  setDialogOpen(true);
                }
              }}
              disabled={contracts.length === 0}
            >
              Record Advance Payment
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<Assignment />}
              onClick={() => {
                const contract = contracts[0];
                if (contract) {
                  setSelectedContract(contract);
                  setDialogType('consignment');
                  setDialogOpen(true);
                }
              }}
              disabled={contracts.length === 0}
            >
              Consignment Permit
            </Button>
          </Box>

          {contracts.length === 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No NBE-approved contracts available. Please wait for contracts to be approved before processing payments.
            </Alert>
          )}

          {/* Documentary Collections Table */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
              Documentary Collections (CAD)
            </Typography>
            {documentaryCollections.length === 0 ? (
              <Alert severity="info">No documentary collections registered</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Collection ID</strong></TableCell>
                      <TableCell><strong>Exporter</strong></TableCell>
                      <TableCell><strong>Drawee</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Payment Term</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documentaryCollections.map((collection: any) => (
                      <TableRow key={collection.collectionId}>
                        <TableCell>{collection.collectionId}</TableCell>
                        <TableCell>{collection.exporterId}</TableCell>
                        <TableCell>{collection.draweeName}</TableCell>
                        <TableCell>${collection.amount?.toLocaleString()} {collection.currency}</TableCell>
                        <TableCell>
                          <Chip 
                            label={collection.paymentTerm} 
                            size="small" 
                            color={collection.paymentTerm === 'SIGHT' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusChip label={collection.status} status={collection.status === 'PAID' ? 'approved' : 'pending'} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
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
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Advance Payments Table */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
              Advance Payments
            </Typography>
            {advancePayments.length === 0 ? (
              <Alert severity="info">No advance payments recorded</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Payment ID</strong></TableCell>
                      <TableCell><strong>Exporter</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>SWIFT Ref</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Received Date</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {advancePayments.map((payment: any) => (
                      <TableRow key={payment.paymentId}>
                        <TableCell>{payment.paymentId}</TableCell>
                        <TableCell>{payment.exporterId}</TableCell>
                        <TableCell>${payment.amount?.toLocaleString()} {payment.currency}</TableCell>
                        <TableCell>{payment.swiftReference}</TableCell>
                        <TableCell>
                          <StatusChip 
                            label={payment.status} 
                            status={payment.status === 'SETTLED' ? 'approved' : 'pending'} 
                          />
                        </TableCell>
                        <TableCell>{new Date(payment.receivedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
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
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Consignments Table */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Consignment Sales (Fruits, Flowers, Meat)
            </Typography>
            {consignments.length === 0 ? (
              <Alert severity="info">No consignment permits issued</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Consignment ID</strong></TableCell>
                      <TableCell><strong>Exporter</strong></TableCell>
                      <TableCell><strong>Commodity</strong></TableCell>
                      <TableCell><strong>Permit Amount</strong></TableCell>
                      <TableCell><strong>Settled</strong></TableCell>
                      <TableCell><strong>Outstanding</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consignments.map((consignment: any) => (
                      <TableRow key={consignment.consignmentId}>
                        <TableCell>{consignment.consignmentId}</TableCell>
                        <TableCell>{consignment.exporterId}</TableCell>
                        <TableCell>
                          <Chip label={consignment.commodityType} size="small" color="info" />
                        </TableCell>
                        <TableCell>${consignment.permitAmount?.toLocaleString()}</TableCell>
                        <TableCell>${consignment.settledAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography 
                            color={consignment.outstandingAmount > 0 ? 'error' : 'success'}
                            fontWeight={600}
                          >
                            ${consignment.outstandingAmount?.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip 
                            label={consignment.status} 
                            status={consignment.status === 'SETTLED' ? 'approved' : 'pending'} 
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
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
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Export Permits Table */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Export Permits (All Payment Methods)
            </Typography>
            {exportPermits.length === 0 ? (
              <Alert severity="info">No export permits issued yet</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Permit ID</strong></TableCell>
                      <TableCell><strong>Permit Number</strong></TableCell>
                      <TableCell><strong>Exporter</strong></TableCell>
                      <TableCell><strong>Payment Method</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Destination</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Outstanding</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exportPermits.map((permit: any) => (
                      <TableRow key={permit.permitId}>
                        <TableCell>{permit.permitId}</TableCell>
                        <TableCell>{permit.permitNumber}</TableCell>
                        <TableCell>{permit.exporterId}</TableCell>
                        <TableCell>
                          <Chip 
                            label={permit.paymentMethod} 
                            size="small" 
                            color={
                              permit.paymentMethod === 'LC' ? 'primary' :
                              permit.paymentMethod === 'CAD' ? 'secondary' :
                              permit.paymentMethod === 'ADVANCE' ? 'success' : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell>${permit.amount?.toLocaleString()} {permit.currency}</TableCell>
                        <TableCell>{permit.destination}</TableCell>
                        <TableCell>
                          <StatusChip 
                            label={permit.status} 
                            status={permit.status === 'SETTLED' ? 'approved' : 'pending'} 
                          />
                        </TableCell>
                        <TableCell>
                          {permit.outstanding ? (
                            <Chip label="Outstanding" size="small" color="error" />
                          ) : (
                            <Chip label="Settled" size="small" color="success" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
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
          </Box>

          {/* Summary Box */}
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" gutterBottom>
              <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Payment Methods Summary
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">Documentary Collections</Typography>
                <Typography variant="h6">{documentaryCollections.length}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">Advance Payments</Typography>
                <Typography variant="h6">{advancePayments.length}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">Consignments</Typography>
                <Typography variant="h6">{consignments.length}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">Total Permits</Typography>
                <Typography variant="h6">{exportPermits.length}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </ModernCard>
      )}

      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedContract && dialogType === null} onClose={() => setSelectedContract(null)} maxWidth="md" fullWidth>
        <DialogTitle>Contract Details</DialogTitle>
        <DialogContent>
          {selectedContract && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Contract ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedContract.contractId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">NBE Reference</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedContract.nbeReferenceNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Exporter</Typography>
                  <Typography variant="body1">{selectedContract.exporterId}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Buyer / Country</Typography>
                  <Typography variant="body1">{selectedContract.buyerName}</Typography>
                  <Typography variant="caption" color="textSecondary">{selectedContract.buyerCountry}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Coffee Type</Typography>
                  <Typography variant="body1">{selectedContract.coffeeType}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Quantity</Typography>
                  <Typography variant="body1">{selectedContract.quantity.toLocaleString()} kg</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Price per Kg</Typography>
                  <Typography variant="body1">${selectedContract.pricePerKg.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Total Value</Typography>
                  <Typography variant="body1" color="primary" fontWeight={600}>
                    ${selectedContract.totalValue.toLocaleString()} {selectedContract.currency}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <StatusChip label={selectedContract.status} status="approved" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">Registration Date</Typography>
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
            color="primary"
            startIcon={<Description />}
            onClick={() => handleOpenDialog('lc', selectedContract!)}
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
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    LC Information
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">LC ID</Typography>
                        <Typography variant="body1" fontWeight={600}>{selectedLC.lcId}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Status</Typography>
                        <StatusChip 
                          label={selectedLC.status} 
                          status={selectedLC.status === 'ISSUED' ? 'APPROVED' : selectedLC.status === 'REQUESTED' ? 'PENDING' : 'ACTIVE'} 
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Contract Reference</Typography>
                        <Typography variant="body1">{selectedLC.contractId}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Exporter ID</Typography>
                        <Typography variant="body1">{selectedLC.exporterId}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Banking Details */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Banking Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Issuing Bank (Buyer's Bank)</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedLC.issuingBank || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Advising Bank (Exporter's Bank)</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedLC.advisingBank || selectedLC.bankName || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Financial Details */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Financial Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">LC Amount</Typography>
                        <Typography variant="h6" color="primary" fontWeight={600}>
                          ${selectedLC.amount.toLocaleString()} {selectedLC.currency}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Currency</Typography>
                        <Typography variant="body1">{selectedLC.currency}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Timeline */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Timeline
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Request Date</Typography>
                        <Typography variant="body1">
                          {new Date(selectedLC.requestDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="textSecondary">Expiry Date</Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {new Date(selectedLC.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">Days Remaining</Typography>
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
                  <Typography variant="subtitle2" color="text.secondary">
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
            color="primary"
            onClick={handleIssueLc}
            startIcon={<CheckCircle />}
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

      <NotificationDialog
        open={notification.open}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />
    </Box>
  );
};

export default BanksPortal;
