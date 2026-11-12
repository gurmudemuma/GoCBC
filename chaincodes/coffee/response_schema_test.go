package main

// Regression tests for the response-schema validation failures reported
// 2026-11-12 (LEDGER-PROOF-REPORT.md §3): typed chaincode reads 500'd with
// "Error handling success response. Value did not match schema" on freshly
// written docs and legacy pre-v2.3 docs, even though the writes succeeded.
//
// Root cause: fabric-contract-api-go v1.2.1 generates the response schema
// with EVERY struct field required unless tagged `metadata:",optional"` —
// `json:",omitempty"` is ignored for requiredness (see its
// metadata/schema_test.go: Prop9). encoding/json then omits empty
// omitempty fields (and emits null for nil slices), so the marshalled
// response fails its own schema. The tests below invoke the real read
// functions through the real contractapi chaincode on a MockStub, so the
// real JSONSerializer.ToString response validation runs — a 500 here is
// the exact live failure, a 200 is the fix.
//
// These tests seed ledger state directly (no write-function calls), using
// the shapes actually stored on-chain: a legacy LC with no rejection
// fields, a pre-allocation forex doc, a SWIFT message with no attached
// documents, and a requested phytosanitary certificate with no
// pestsFreeFrom list.

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func newTestStub(t *testing.T) *shimtest.MockStub {
	t.Helper()
	cc, err := contractapi.NewChaincode(&CoffeeContract{})
	if err != nil {
		t.Fatalf("NewChaincode failed: %v", err)
	}
	return shimtest.NewMockStub("coffee", cc)
}

func seedState(t *testing.T, stub *shimtest.MockStub, key, value string) {
	t.Helper()
	stub.MockTransactionStart("seed-" + key)
	if err := stub.PutState(key, []byte(value)); err != nil {
		t.Fatalf("PutState %s failed: %v", key, err)
	}
	stub.MockTransactionEnd("seed-" + key)
}

func invoke(t *testing.T, stub *shimtest.MockStub, fn string, args ...string) (int32, string) {
	t.Helper()
	argv := [][]byte{[]byte(fn)}
	for _, a := range args {
		argv = append(argv, []byte(a))
	}
	res := stub.MockInvoke("tx-"+fn, argv)
	return res.Status, string(res.Payload)
}

// legacyLCJSON mirrors a stored LC written before the v2.3 rejection
// fields existed: no rejection*/documentRejection* keys at all, and no
// amendments/discrepancies/documents arrays.
const legacyLCJSON = `{
	"lcId": "LC-TEST-1", "contractId": "CNT-TEST-1", "exporterId": "EXP-TEST-1",
	"issuingBank": "CBE", "advisingBank": "CBE", "beneficiary": "Exporter Co",
	"amount": 10000, "currency": "USD", "status": "ISSUED",
	"expiryDate": "2027-01-01", "requestDate": "2026-11-12T00:00:00Z",
	"approvalDate": "2026-11-12", "issueDate": "2026-11-12",
	"utilizationDate": "", "terms": "UCP600",
	"amendmentCount": 0, "discrepancyResolved": true,
	"negotiationStatus": "NOT_STARTED", "negotiationDate": "",
	"negotiatingBank": "", "approvedBy": "x", "approvedByMsp": "BanksMSP",
	"issuedBy": "x", "issuedByMsp": "BanksMSP",
	"lastUpdatedBy": "x", "lastUpdatedByMsp": "BanksMSP",
	"createdAt": "2026-11-12T00:00:00Z", "updatedAt": "2026-11-12T00:00:00Z"
}`

// freshLCJSON is a freshly written LC whose rejection fields are all
// empty and which carries one discrepancy whose optional fields are empty.
const freshLCJSON = `{
	"lcId": "LC-TEST-2", "contractId": "CNT-TEST-1", "exporterId": "EXP-TEST-1",
	"issuingBank": "CBE", "advisingBank": "CBE", "beneficiary": "Exporter Co",
	"amount": 10000, "currency": "USD", "status": "REQUESTED",
	"expiryDate": "2027-01-01", "requestDate": "2026-11-12T00:00:00Z",
	"approvalDate": "", "issueDate": "", "utilizationDate": "", "terms": "UCP600",
	"amendments": [], "amendmentCount": 0,
	"discrepancies": [{"discrepancyId": "D1", "document": "Invoice", "issue": "Typo",
		"reportedDate": "2026-11-12T00:00:00Z", "resolvedDate": "",
		"resolution": "", "status": "OPEN"}],
	"discrepancyResolved": false,
	"negotiationStatus": "NOT_STARTED", "negotiationDate": "",
	"negotiatingBank": "", "approvedBy": "", "approvedByMsp": "",
	"issuedBy": "", "issuedByMsp": "",
	"lastUpdatedBy": "x", "lastUpdatedByMsp": "BanksMSP",
	"createdAt": "2026-11-12T00:00:00Z", "updatedAt": "2026-11-12T00:00:00Z"
}`

func TestReadLCLegacyAndFreshDocs(t *testing.T) {
	stub := newTestStub(t)
	seedState(t, stub, "LC_LC-TEST-1", legacyLCJSON)
	seedState(t, stub, "LC_LC-TEST-2", freshLCJSON)

	for _, id := range []string{"LC-TEST-1", "LC-TEST-2"} {
		status, payload := invoke(t, stub, "ReadLC", id)
		if status != 200 {
			t.Fatalf("ReadLC %s: status %d, payload %q (want 200)", id, status, payload)
		}
		var lc LetterOfCredit
		if err := json.Unmarshal([]byte(payload), &lc); err != nil {
			t.Fatalf("ReadLC %s: payload is not valid LC JSON: %v", id, err)
		}
		if lc.LCID != id {
			t.Fatalf("ReadLC %s: returned lcId %q", id, lc.LCID)
		}
	}

	// QueryAllLCs exercises the same return type as a list (rich query is
	// unsupported on MockStub, so the GetStateByRange fallback runs).
	status, payload := invoke(t, stub, "QueryAllLCs")
	if status != 200 {
		t.Fatalf("QueryAllLCs: status %d, payload %q (want 200)", status, payload)
	}
	var lcs []*LetterOfCredit
	if err := json.Unmarshal([]byte(payload), &lcs); err != nil {
		t.Fatalf("QueryAllLCs: payload is not valid LC JSON: %v", err)
	}
	if len(lcs) != 2 {
		t.Fatalf("QueryAllLCs: got %d LCs, want 2", len(lcs))
	}
}

// preAllocateForexJSON mirrors a forex doc as stored after RequestForex:
// no allocatedBy/allocatedByMsp (set only by AllocateForex) and no
// screenedAgainst list.
const preAllocateForexJSON = `{
	"forexId": "FX-TEST-1", "contractId": "CNT-TEST-1", "exporterId": "EXP-TEST-1",
	"lcId": "LC-TEST-1", "requestedAmount": 10000, "allocatedAmount": 0,
	"currency": "USD", "exchangeRate": 0, "officialRate": 57.25, "marketRate": 0,
	"retentionRate": 40, "retentionPercentage": 0, "retentionAmountUsd": 0,
	"fcyAccountNumber": "", "retentionStatus": "PENDING", "retentionDate": "",
	"sanctionScreeningStatus": "PENDING", "screeningDate": "",
	"screeningOfficer": "", "screeningNotes": "", "status": "REQUESTED",
	"requestDate": "2026-11-12T00:00:00Z", "approvalDate": "",
	"allocationDate": "", "utilizationDate": "", "expiryDate": "",
	"utilizedAmount": 0, "utilizedBy": "", "utilizedByMsp": "",
	"verifiedBy": "", "verifiedByMsp": "", "nbeOfficer": "", "nbeApprovalRef": "",
	"rejectionReason": "", "rejectedBy": "", "rejectedByMsp": "",
	"rejectedByOrg": "", "rejectionDate": "", "comments": "",
	"createdAt": "2026-11-12T00:00:00Z", "updatedAt": "2026-11-12T00:00:00Z"
}`

func TestReadForexPreAllocate(t *testing.T) {
	stub := newTestStub(t)
	seedState(t, stub, "FOREX_FX-TEST-1", preAllocateForexJSON)

	status, payload := invoke(t, stub, "ReadForex", "FX-TEST-1")
	if status != 200 {
		t.Fatalf("ReadForex pre-allocate: status %d, payload %q (want 200)", status, payload)
	}
	var fx ForexAllocation
	if err := json.Unmarshal([]byte(payload), &fx); err != nil {
		t.Fatalf("ReadForex: payload is not valid forex JSON: %v", err)
	}
	if fx.Status != "REQUESTED" || fx.AllocatedBy != "" {
		t.Fatalf("ReadForex: unexpected payload %+v", fx)
	}
}

// freshSWIFTJSON mirrors a message as stored by CreateSWIFTMessage, which
// never initialises AttachedDocuments: the key is absent (nil on read).
const freshSWIFTJSON = `{
	"messageId": "SW-TEST-1", "messageType": "MT103",
	"swiftReference": "SWTEST1", "relatedReference": "",
	"senderBic": "CBETETAA", "receiverBic": "DEUTDEFF",
	"intermediaryBic1": "", "intermediaryBic2": "",
	"valueDate": "261112", "currency": "USD", "amount": 10000, "exchangeRate": 57.25,
	"sentDate": "2026-11-12T00:00:00Z", "receivedDate": "", "processedDate": "",
	"orderingCustomer": "Buyer", "orderingInstitution": "Buyer Bank",
	"beneficiary": "Exporter Co", "beneficiaryBank": "CBE",
	"beneficiaryAccount": "123", "charges": "SHA", "remittanceInfo": "Coffee",
	"purposeCode": "", "instructionCode": "", "lcNumber": "", "lcIssueDate": "",
	"lcExpiryDate": "", "lcExpiryPlace": "", "lcApplicant": "", "lcAmount": 0,
	"lcCurrency": "", "partialShipment": "", "transhipment": "",
	"loadingPort": "", "dischargePort": "", "latestShipDate": "",
	"documents": [], "additionalInfo": "",
	"amendmentNumber": 0, "amendmentDate": "", "amendmentReason": "",
	"discrepancyDetails": "", "discrepancyList": [], "action": "",
	"status": "DRAFT", "processingStatus": "", "rejectionReason": "",
	"errorCode": "", "retryCount": 0, "maxRetries": 3,
	"authenticated": false, "validationFlags": [], "securityHash": "",
	"digitalSign": "", "encrypted": false,
	"createdBy": "x", "approvedBy": "", "sentBy": "", "processedBy": "",
	"receivedBy": "", "nbeApprovedBy": "", "nbeApprovalDate": "",
	"nbeAmlCheck": "", "nbeSanctionScreening": "", "nbeApprovalComments": "",
	"rawMessage": "", "messageHash": "", "networkInfo": "", "priorityCode": "",
	"deliveryMonitor": "", "linkedPaymentId": "", "linkedLcId": "",
	"linkedContractId": "",
	"createdAt": "2026-11-12T00:00:00Z", "updatedAt": "2026-11-12T00:00:00Z"
}`

func TestReadSWIFTMessageNoAttachments(t *testing.T) {
	stub := newTestStub(t)
	seedState(t, stub, "SWIFT_SW-TEST-1", freshSWIFTJSON)

	status, payload := invoke(t, stub, "ReadSWIFTMessage", "SW-TEST-1")
	if status != 200 {
		t.Fatalf("ReadSWIFTMessage: status %d, payload %q (want 200)", status, payload)
	}
	if !strings.Contains(payload, `"attachedDocuments":[]`) {
		t.Fatalf("ReadSWIFTMessage: payload lacks empty attachedDocuments array: %s", payload)
	}
}

// freshPhytoJSON mirrors a certificate as stored by
// RequestPhytosanitaryCertificate, which never sets PestsFreeFrom.
const freshPhytoJSON = `{
	"certificateId": "PHYTO-TEST-1", "shipmentId": "SHP-TEST-1",
	"exporterId": "EXP-TEST-1", "inspectorName": "",
	"inspectionDate": "0001-01-01T00:00:00Z",
	"botanicalName": "Coffee beans (Coffea arabica)", "commonName": "Coffee",
	"treatmentApplied": "Fumigation", "treatmentDate": "",
	"treatmentDuration": "", "placeOfOrigin": "", "pointOfEntry": "",
	"quantity": 1000, "packagingType": "", "numberOfPackages": 0,
	"distinguishMarks": "", "meansOfConveyance": "", "certificateNumber": "",
	"validUntil": "", "status": "PENDING", "issuedBy": "",
	"inspectionResult": "", "pestsDetected": false, "diseaseDetected": false,
	"inspectionNotes": "", "additionalInfo": "",
	"createdAt": "2026-11-12T00:00:00Z", "updatedAt": "2026-11-12T00:00:00Z"
}`

func TestReadPhytosanitaryCertificateFresh(t *testing.T) {
	stub := newTestStub(t)
	seedState(t, stub, "PHYTO_PHYTO-TEST-1", freshPhytoJSON)

	status, payload := invoke(t, stub, "ReadPhytosanitaryCertificate", "PHYTO-TEST-1")
	if status != 200 {
		t.Fatalf("ReadPhytosanitaryCertificate: status %d, payload %q (want 200)", status, payload)
	}
	if !strings.Contains(payload, `"pestsFreeFrom":[]`) {
		t.Fatalf("ReadPhytosanitaryCertificate: payload lacks empty pestsFreeFrom array: %s", payload)
	}
}
