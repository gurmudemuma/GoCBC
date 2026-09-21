# Real Blockchain Integration Flow - Banks Portal

## 🔄 Complete Workflow with REAL Blockchain Calls

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BANKS PORTAL WORKFLOW                            │
│                   Every Step = Real Blockchain Call                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TAB 0: LC APPROVAL & ISSUANCE                                           │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣ LC APPROVAL (REQUESTED → APPROVED)
   
   [User clicks "Approve"] 
         ↓
   POST /banking/lc/:lcID/approve
         ↓
   fabricService.connectAsOrg('BanksMSP')  ← Connect with bank identity
         ↓
   fabricService.approveLC(lcID, issuingBank, advisingBank, beneficiary)
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: ApproveLC()                       │
   │  File: chaincodes/coffee/banking.go:270      │
   │                                              │
   │  ✅ Validates LC exists                      │
   │  ✅ Validates caller is BanksMSP             │
   │  ✅ Updates LC status to APPROVED            │
   │  ✅ Records approval timestamp                │
   │  ✅ Stores approver identity                 │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Transaction ID: <txId>  ← Blockchain transaction receipt
         ↓
   Endorsements: [BanksMSP:peer0, BanksMSP:peer1]  ← Peer signatures
         ↓
   Store txId + endorsers in PostgreSQL (for quick queries)
         ↓
   [Frontend shows "✅ LC Approved"]


2️⃣ LC ISSUANCE (APPROVED → ISSUED)
   
   [User clicks "Issue LC"]
         ↓
   POST /banking/lc/:lcID/issue
         ↓
   fabricService.connectAsOrg('BanksMSP')
         ↓
   fabricService.issueLC(lcID, terms)
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: IssueLC()                         │
   │  File: chaincodes/coffee/banking.go:386      │
   │                                              │
   │  ✅ Validates LC status is APPROVED          │
   │  ✅ Validates caller is BanksMSP             │
   │  ✅ Updates LC status to ISSUED              │
   │  ✅ Stores LC terms on blockchain            │
   │  ✅ Records issue timestamp                  │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Transaction ID: <txId>
         ↓
   AUTO-TRIGGER: fabricService.invokeChaincode('RequestForex', [...])
         ↓         Creates forex allocation request automatically
   [Frontend shows "✅ LC Issued"]


┌─────────────────────────────────────────────────────────────────────────┐
│ TAB 1: FOREX ALLOCATION                                                 │
└─────────────────────────────────────────────────────────────────────────┘

3️⃣ FOREX ALLOCATION (ISSUED → FOREX_ALLOCATED)
   
   [User clicks "Allocate Forex"]
         ↓
   POST /forex/allocate
         ↓
   fabricService.connectAsOrg('BanksMSP')
         ↓
   fabricService.invokeChaincode('AllocateForex', [
     forexId, lcId, amount, exchangeRate, retentionRate, 
     officer, approvalRef, expiryDate
   ])
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: AllocateForex()                   │
   │  File: chaincodes/coffee/forex.go:281        │
   │                                              │
   │  ✅ Validates forex request exists           │
   │  ✅ Validates LC status is ISSUED            │
   │  ✅ Validates caller is BanksMSP             │
   │  ✅ Enforces NBE retention policy (50%)      │
   │  ✅ Records exchange rate                    │
   │  ✅ Updates forex status to ALLOCATED        │
   │  ✅ Links forex to LC                        │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Transaction ID: <txId>
         ↓
   Record signature via signatureService.recordSignature()
         ↓
   [Frontend shows "✅ Forex Allocated"]


┌─────────────────────────────────────────────────────────────────────────┐
│ TAB 2: DOCUMENT EXAMINATION                                             │
└─────────────────────────────────────────────────────────────────────────┘

4️⃣ INDIVIDUAL DOCUMENT VERIFICATION (for each of 12 documents)
   
   [User clicks "Verify" on document]
         ↓
   POST /documents/:documentId/verify
         ↓
   fabricService.signDocument(documentId, hash, 'VERIFY', signer, org, metadata)
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: SignDocument()                    │
   │  File: chaincodes/coffee/signature.go:1775   │
   │                                              │
   │  ✅ Validates document exists                │
   │  ✅ Validates caller identity                │
   │  ✅ Creates signature record                 │
   │  ✅ Stores document hash                     │
   │  ✅ Records signer MSP + username            │
   │  ✅ Stores verification timestamp            │
   │  ✅ Returns signatureId (SIG_DOC123_MSP)     │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Signature ID: SIG_DOC_LC123_BILL_OF_LADING_BanksMSP_1789731234567
         ↓
   [Repeat 12 times for all documents]
         ↓
   [Frontend shows "✅ 12/12 documents verified"]


5️⃣ COMPLETE DOCUMENT EXAMINATION (FOREX_ALLOCATED → UTILIZED)
   
   [User clicks "Complete Examination"]
         ↓
   POST /banking/lc/:lcID/examine-documents
         ↓
   fabricService.invokeChaincode('ExamineLCDocuments', [
     lcID, compliant, discrepancies, examinationDate, examiner
   ])
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: ExamineLCDocuments()              │
   │  File: chaincodes/coffee/banking.go:940      │
   │                                              │
   │  ✅ Validates LC exists                      │
   │  ✅ Validates caller is BanksMSP             │
   │  ✅ Validates status is FOREX_ALLOCATED      │
   │  ✅ Records UCP 600 compliance check         │
   │  ✅ Updates LC status to UTILIZED (if ok)    │
   │  ✅ Records discrepancies (if any)           │
   │  ✅ Stores examiner identity                 │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Transaction ID: <txId>
         ↓
   [Frontend shows "✅ Documents Compliant - LC UTILIZED"]


┌─────────────────────────────────────────────────────────────────────────┐
│ TAB 3: PAYMENT RELEASE                                                  │
└─────────────────────────────────────────────────────────────────────────┘

6️⃣ PAYMENT RELEASE (UTILIZED → PAYMENT_RELEASED)
   
   [User clicks "Release Payment"]
         ↓
   POST /banking/lc/:lcID/release-payment
         ↓
   Validate: All shipping documents verified ✅
         ↓
   fabricService.invokeChaincode('ReleaseLCPayment', [
     lcID, amount, currency, paymentDate, payingBank
   ])
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: ReleaseLCPayment()                │
   │  File: chaincodes/coffee/banking.go:1009     │
   │                                              │
   │  ✅ Validates LC status is UTILIZED          │
   │  ✅ Validates caller is BanksMSP             │
   │  ✅ Validates documents are compliant        │
   │  ✅ Records payment release                  │
   │  ✅ Updates LC status to PAYMENT_RELEASED    │
   │  ✅ Stores SWIFT payment details             │
   │  ✅ Records paying bank info                 │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Transaction ID: <txId>
         ↓
   [Frontend shows "✅ Payment Released - $170,000 USD"]


┌─────────────────────────────────────────────────────────────────────────┐
│ TAB 5: LC SETTLEMENT                                                    │
└─────────────────────────────────────────────────────────────────────────┘

7️⃣ PAYMENT SETTLEMENT (PAYMENT_RELEASED → SETTLED)
   
   [Bank confirms settlement]
         ↓
   POST /payment/:paymentID/settle
         ↓
   fabricService.settlePayment(
     paymentID, exchangeRate, retentionRate,
     payingBank, payingBankBIC, swiftReference, nbeApprovalRef
   )
         ↓
   ┌──────────────────────────────────────────────┐
   │  HYPERLEDGER FABRIC CHAINCODE                │
   │  Function: SettlePayment()                   │
   │  File: chaincodes/coffee/payment.go:639      │
   │                                              │
   │  ✅ Validates payment exists                 │
   │  ✅ Validates caller is BanksMSP             │
   │  ✅ Calculates NBE retention (50%)           │
   │  ✅ Records SWIFT MT103 reference            │
   │  ✅ Updates payment status to SETTLED        │
   │  ✅ Stores settlement details                │
   │  ✅ Updates LC status to SETTLED             │
   │  ✅ Commits to blockchain ledger             │
   └──────────────────────────────────────────────┘
         ↓
   Transaction ID: <txId>
         ↓
   [Frontend shows "✅ Payment Settled - LC Complete"]


═══════════════════════════════════════════════════════════════════════════
                           BLOCKCHAIN PROOF POINTS
═══════════════════════════════════════════════════════════════════════════

🔐 IDENTITY MANAGEMENT
   • Every call includes MSP identity (BanksMSP, ExporterMSP, etc.)
   • Chaincode validates caller via ctx.GetClientIdentity().GetMSPID()
   • Unauthorized calls are rejected at chaincode level

📝 AUDIT TRAIL
   • Every transaction has unique txId
   • Each block includes multiple transactions
   • Transactions are immutable (cannot be deleted or modified)
   • Full history queryable via GetHistoryForKey()

✍️ SIGNATURES
   • Peer endorsements captured on every transaction
   • Document signatures stored with SignDocument chaincode
   • MSP + username + timestamp recorded
   • Signature verification via blockchain queries

🔍 VERIFICATION
   • Query any transaction: GET /audit/blockchain/transaction/:txId
   • View blockchain stats: GET /blockchain/stats
   • Check document signatures: GET /documents/:documentId/signatures
   • Peer logs show chaincode invocations

💾 STATE DATABASE
   • CouchDB stores blockchain state (queryable)
   • PostgreSQL caches data for performance
   • Blockchain is source of truth
   • PostgreSQL updated after blockchain commit

═══════════════════════════════════════════════════════════════════════════
                              NOT SIMULATED!
═══════════════════════════════════════════════════════════════════════════

❌ What we DON'T do:
   • Fake blockchain signatures in code
   • Skip chaincode and update PostgreSQL directly
   • Generate fake transaction IDs
   • Simulate endorsements

✅ What we DO:
   • Connect to real Hyperledger Fabric network
   • Invoke actual Go chaincode functions
   • Get real transaction IDs from orderer
   • Capture real peer endorsements
   • Store immutable records on blockchain
   • Query blockchain state via CouchDB
   • Follow consortium blockchain best practices

═══════════════════════════════════════════════════════════════════════════

**This is REAL blockchain integration, not hype! Every workflow step writes to 
the Hyperledger Fabric ledger and creates immutable audit trails that can be 
independently verified.**
