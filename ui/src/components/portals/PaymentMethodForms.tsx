import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Alert,
} from '@mui/material';

interface PaymentMethodFormsProps {
  open: boolean;
  type: 'cad' | 'advance' | 'consignment' | null;
  selectedContract: any;
  onClose: () => void;
  onSubmit: (type: string, data: any) => Promise<void>;
}

export const PaymentMethodForms: React.FC<PaymentMethodFormsProps> = ({
  open,
  type,
  selectedContract,
  onClose,
  onSubmit,
}) => {
  const [cadForm, setCadForm] = React.useState({
    drawerName: '',
    draweeName: '',
    draweeAddress: '',
    paymentTerm: 'SIGHT',
    acceptanceDays: '',
    collectingBank: '',
    collectingBankBIC: '',
    remittingBank: 'Commercial Bank of Ethiopia',
    remittingBankBIC: 'CBETETAA',
    instructions: 'Present documents directly to drawee. Protest if unpaid.',
  });

  const [advanceForm, setAdvanceForm] = React.useState({
    creditAdviceNumber: '',
    payingBank: '',
    payingBankBIC: '',
    swiftReference: '',
    beneficiaryAccount: '',
    amount: '',
  });

  const [consignmentForm, setConsignmentForm] = React.useState({
    commodityType: 'FRUITS',
    description: '',
    buyerName: '',
    buyerAddress: '',
    permitAmount: '',
  });

  React.useEffect(() => {
    if (selectedContract && type) {
      if (type === 'cad') {
        setCadForm(prev => ({
          ...prev,
          drawerName: selectedContract.exporterId,
          draweeName: selectedContract.buyerName,
          draweeAddress: selectedContract.buyerCountry,
          remittingBank: selectedContract.exporterBank || 'Commercial Bank of Ethiopia',
        }));
      } else if (type === 'advance') {
        setAdvanceForm(prev => ({
          ...prev,
          amount: selectedContract.totalValue?.toString() || '',
        }));
      }
    }
  }, [selectedContract, type]);

  const handleSubmit = async () => {
    if (type === 'cad') {
      // Prepare CAD data for API
      const cadData = {
        ...cadForm,
        contractID: selectedContract?.contractId || '',
        exporterID: selectedContract?.exporterId || '',
        amount: selectedContract?.totalValue || 0,
        currency: selectedContract?.currency || 'USD',
        documents: ['B/L', 'Invoice', 'Packing List', 'Certificate of Origin'], // Default required documents
      };
      await onSubmit('cad', cadData);
    } else if (type === 'advance') {
      // Prepare advance payment data
      const advanceData = {
        ...advanceForm,
        contractID: selectedContract?.contractId || '',
        exporterID: selectedContract?.exporterId || '',
      };
      await onSubmit('advance', advanceData);
    } else if (type === 'consignment') {
      // Prepare consignment data
      const consignmentData = {
        ...consignmentForm,
        exporterID: selectedContract?.exporterId || '',
      };
      await onSubmit('consignment', consignmentData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* Documentary Collection Form */}
      {type === 'cad' && (
        <>
          <DialogTitle>Send Documentary Collection (CAD)</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              CBE Section 3.2.ii: Cash Against Documents - Documents sent through bank for payment on presentation
            </Alert>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Drawer (Exporter)"
                  value={cadForm.drawerName}
                  onChange={(e) => setCadForm({ ...cadForm, drawerName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Drawee (Importer)"
                  value={cadForm.draweeName}
                  onChange={(e) => setCadForm({ ...cadForm, draweeName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Drawee Address"
                  value={cadForm.draweeAddress}
                  onChange={(e) => setCadForm({ ...cadForm, draweeAddress: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Payment Term"
                  value={cadForm.paymentTerm}
                  onChange={(e) => setCadForm({ ...cadForm, paymentTerm: e.target.value })}
                >
                  <MenuItem value="SIGHT">Sight (Payment on Presentation)</MenuItem>
                  <MenuItem value="ACCEPTANCE">Acceptance (Deferred Payment)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Acceptance Days (if applicable)"
                  type="number"
                  value={cadForm.acceptanceDays}
                  onChange={(e) => setCadForm({ ...cadForm, acceptanceDays: e.target.value })}
                  disabled={cadForm.paymentTerm === 'SIGHT'}
                  helperText="Days for acceptance (e.g., 60, 90)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Collecting Bank (Foreign)"
                  value={cadForm.collectingBank}
                  onChange={(e) => setCadForm({ ...cadForm, collectingBank: e.target.value })}
                  required
                  helperText="Foreign bank collecting payment"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Collecting Bank BIC/SWIFT"
                  value={cadForm.collectingBankBIC}
                  onChange={(e) => setCadForm({ ...cadForm, collectingBankBIC: e.target.value })}
                  required
                  helperText="e.g., DEUTDEFF (Deutsche Bank)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Remitting Bank (Ethiopian)"
                  value={cadForm.remittingBank}
                  onChange={(e) => setCadForm({ ...cadForm, remittingBank: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Remitting Bank BIC/SWIFT"
                  value={cadForm.remittingBankBIC}
                  onChange={(e) => setCadForm({ ...cadForm, remittingBankBIC: e.target.value })}
                  required
                  helperText="Default: CBETETAA (CBE)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Collection Instructions"
                  value={cadForm.instructions}
                  onChange={(e) => setCadForm({ ...cadForm, instructions: e.target.value })}
                  multiline
                  rows={3}
                  helperText="Instructions for collecting bank"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={!cadForm.collectingBank || !cadForm.collectingBankBIC || !cadForm.remittingBankBIC}
            >
              Send Collection
            </Button>
          </DialogActions>
        </>
      )}

      {/* Advance Payment Form */}
      {type === 'advance' && (
        <>
          <DialogTitle>Record Advance Payment Receipt</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              CBE Section 3.2.iii: Advance Payment - Payment received before shipment. Export permit issued after receipt.
            </Alert>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount Received"
                  type="number"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  helperText="Amount received in USD"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Credit Advice Number"
                  value={advanceForm.creditAdviceNumber}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, creditAdviceNumber: e.target.value })}
                  helperText="Bank credit advice reference"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Paying Bank (Foreign)"
                  value={advanceForm.payingBank}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, payingBank: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Paying Bank BIC/SWIFT"
                  value={advanceForm.payingBankBIC}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, payingBankBIC: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SWIFT Reference"
                  value={advanceForm.swiftReference}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, swiftReference: e.target.value })}
                  helperText="SWIFT MT103 reference"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Beneficiary Account"
                  value={advanceForm.beneficiaryAccount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, beneficiaryAccount: e.target.value })}
                  helperText="Exporter's account number"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              Record Payment & Issue Permit
            </Button>
          </DialogActions>
        </>
      )}

      {/* Consignment Form */}
      {type === 'consignment' && (
        <>
          <DialogTitle>Issue Consignment Export Permit</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              CBE Section 3.2.iv: Consignment sales - LIMITED to Fruits, Flowers, and Meat only. Payment received after sale abroad.
            </Alert>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Commodity Type"
                  value={consignmentForm.commodityType}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, commodityType: e.target.value })}
                >
                  <MenuItem value="FRUITS">Fruits</MenuItem>
                  <MenuItem value="FLOWERS">Flowers</MenuItem>
                  <MenuItem value="MEAT">Meat</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Estimated Value (USD)"
                  type="number"
                  value={consignmentForm.permitAmount}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, permitAmount: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Commodity Description"
                  value={consignmentForm.description}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, description: e.target.value })}
                  multiline
                  rows={2}
                  helperText="Detailed description of goods"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buyer/Agent Name"
                  value={consignmentForm.buyerName}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, buyerName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Buyer Address"
                  value={consignmentForm.buyerAddress}
                  onChange={(e) => setConsignmentForm({ ...consignmentForm, buyerAddress: e.target.value })}
                  multiline
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              Issue Consignment Permit
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
