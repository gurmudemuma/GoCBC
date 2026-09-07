# Forex UI Display Fix Required

## Issue
The Forex Allocation details dialog is showing **incorrect/default values** instead of actual blockchain data for REQUESTED forex allocations.

## Current Incorrect Display
```
Exchange Rate: 115.50 ETB/USD (Default NBE rate)
40% USD Retention: $1,967,983.20 USD
60% ETB Conversion: 340,953,089.40 ETB
LC Reference: N/A
Expiry Date: N/A
Status: "Pending Blockchain Registration" + "No Blockchain Signatures Found"
```

## Actual Data from Blockchain
```json
{
  "forexId": "FOREX_LC-CONTRACT1788435011592-1788509695626_1788592090021",
  "status": "REQUESTED",
  "exchangeRate": 0,
  "retentionRate": 0,
  "lcId": "",
  "allocatedAmount": 0,
  "requestedAmount": 4919958,
  "expiryDate": null
}
```

## Expected Correct Display

For forex with **status === "REQUESTED"**:

```
✅ Blockchain Status: RECORDED (forex exists in blockchain - ID: FOREX_LC-...)

Forex ID: FOREX_LC-CONTRACT1788435011592-1788509695626_1788592090021
LC Reference: Pending Allocation
Exporter ID: EXP8958382
Status: REQUESTED

Requested Allocation:
  Requested Amount: $4,919,958 USD

Allocation Details: Pending
  This forex request has been submitted but not yet allocated by a bank.
  The following will be determined during allocation:
  - LC Reference Number
  - Exchange Rate (ETB/USD)
  - Retention Amount (40-50% per NBE policy)
  - Conversion Amount to ETB
  - Expiry Date

Currency: USD
Request Date: September 5, 2026

⚠️ Action Required: Bank must allocate this forex with LC details
```

For forex with **status === "ALLOCATED"**:

```
✅ Blockchain Status: VERIFIED (blockchain signatures found)

Forex ID: [forexId]
LC Reference: [lcId]
Exchange Rate: [exchangeRate] ETB/USD
Retention ([retentionRate]%): $[calculated] USD
Conversion ([100-retentionRate]%): [calculated] ETB
Allocated Amount: $[allocatedAmount] USD
Expiry Date: [expiryDate]
```

## Fix Location

**File:** `ui/src/components/portals/NBEPortal.tsx`

**Component:** Forex Details Dialog (around line 2150-2300)

**Fix Logic:**

```typescript
// In the forex details rendering section:

{selectedForex && (
  <>
    {/* Blockchain Status - Check if forex exists in blockchain */}
    {selectedForex.forexId && selectedForex.forexId.startsWith('FOREX_') ? (
      <Alert severity="success" icon={<VerifiedUser />}>
        ✅ Recorded on Blockchain - ID: {selectedForex.forexId}
      </Alert>
    ) : (
      <Alert severity="warning">
        ⏳ Pending blockchain registration
      </Alert>
    )}

    {/* Show different content based on status */}
    {selectedForex.status === 'REQUESTED' ? (
      <>
        {/* REQUESTED forex - show pending allocation message */}
        <Typography variant="h6">Requested Allocation</Typography>
        <Typography>
          Requested Amount: {formatCurrency(selectedForex.requestedAmount, selectedForex.currency)}
        </Typography>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Pending Bank Allocation</strong>
          </Typography>
          <Typography variant="body2">
            This forex request has been submitted but not yet allocated. 
            The bank will set the exchange rate, retention percentage, LC reference, and expiry date during allocation.
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography color="text.secondary">LC Reference:</Typography>
            <Typography color="warning.main">Pending Allocation</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Exchange Rate:</Typography>
            <Typography color="warning.main">To be set by bank</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Retention:</Typography>
            <Typography color="warning.main">To be calculated</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Expiry Date:</Typography>
            <Typography color="warning.main">To be set by bank</Typography>
          </Grid>
        </Grid>
      </>
    ) : (
      <>
        {/* ALLOCATED forex - show actual values */}
        <Typography variant="h6">Allocated Forex</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography color="text.secondary">LC Reference:</Typography>
            <Typography>{selectedForex.lcId || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Exchange Rate:</Typography>
            <Typography>{selectedForex.exchangeRate} ETB/USD</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Retention ({selectedForex.retentionRate}%):</Typography>
            <Typography>
              {formatCurrency(selectedForex.allocatedAmount * selectedForex.retentionRate / 100, selectedForex.currency)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Conversion:</Typography>
            <Typography>
              {(selectedForex.allocatedAmount * (100 - selectedForex.retentionRate) / 100 * selectedForex.exchangeRate).toFixed(2)} ETB
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary">Expiry Date:</Typography>
            <Typography>{formatDate(selectedForex.expiryDate)}</Typography>
          </Grid>
        </Grid>
      </>
    )}
  </>
)}
```

## Root Cause

The NBEPortal is using **fallback/default values** in the UI rendering logic:
- Line ~241: Sets default retentionRate = 40 (FIXED in loadData)
- Line ~196: Form defaults to 115.50 rate and 40% retention
- UI calculates retention/conversion amounts even for REQUESTED status

## Status

- ✅ API returns correct data (exchangeRate: 0, retentionRate: 0)
- ✅ Backend data loading fixed (no more default values)
- ❌ UI display logic needs update (conditional rendering based on status)
- ❌ UI build currently has syntax errors (unrelated Box closing tag issue)

## Next Steps

1. Fix UI build syntax error at line 5524 (unclosed Box tag)
2. Update forex details dialog to conditionally render based on status
3. Remove hardcoded default values from display logic
4. Show "Pending" or "To be allocated" for REQUESTED forex instead of calculated values
