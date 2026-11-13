package main

// Leg-2 E2E fix tests (2026-11-13, chaincode coffee v2.3 seq 11):
// F3  B/L + shipping-details + airway-bill refuse a shipment that is
//     not CUSTOMS_CLEARED / FREIGHT_BOOKED / LOADED.
// F6  the prescribed border order initiate -> inspect -> clear ->
//     departure -> crossing -> arrival runs to ARRIVED (clear from
//     INSPECTED lands CLEARED_EXIT, not terminal CLEARED).
// F9  inspection functions refuse a shipment that does not exist.
// F15a RequestPhytosanitaryCertificate requires plantDescription.
// F15b IssuePhytosanitaryCertificate honours a supplied certificate
//     number and still generates one when none is supplied.
//
// These run the real chaincode functions through the real contractapi
// chaincode on a MockStub (same harness as response_schema_test.go), so
// a 200 here is the real guard logic executing. Live seq-11 proof still
// needs the coordinator's deploy; these tests are the pre-deploy proof
// the logic is right.

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"strings"
	"testing"
	"time"

	"github.com/gogo/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	"github.com/hyperledger/fabric-protos-go/msp"
)

// setTestCreator installs a SerializedIdentity creator so GetID /
// GetMSPID work on the MockStub. IdBytes must be a real PEM X.509
// certificate: cid.init() parses it (a bare string takes the Idemix
// path, fails, and leaves a nil ClientIdentity that panics in GetID).
func setTestCreator(t *testing.T, stub *shimtest.MockStub, mspID string) {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "Admin@" + strings.ToLower(mspID) + ".cecbs.et"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &priv.PublicKey, priv)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}
	pemCert := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	creator, err := proto.Marshal(&msp.SerializedIdentity{
		Mspid:   mspID,
		IdBytes: pemCert,
	})
	if err != nil {
		t.Fatalf("marshal creator: %v", err)
	}
	stub.Creator = creator
}

// invokeFull is invoke plus the error Message: on a failed MockInvoke
// the error text is in res.Message and the payload is empty, so an
// error assertion must read the message.
func invokeFull(t *testing.T, stub *shimtest.MockStub, fn string, args ...string) (int32, string) {
	t.Helper()
	argv := [][]byte{[]byte(fn)}
	for _, a := range args {
		argv = append(argv, []byte(a))
	}
	res := stub.MockInvoke("tx-"+fn+"-full", argv)
	msg := string(res.Payload)
	if msg == "" {
		msg = res.Message
	}
	return res.Status, msg
}

func readJSON(t *testing.T, payload string, v interface{}) {
	t.Helper()
	if err := json.Unmarshal([]byte(payload), v); err != nil {
		t.Fatalf("unmarshal %q: %v", payload, err)
	}
}

// readStatus invokes a Read* function and returns the doc's status field.
func readStatus(t *testing.T, stub *shimtest.MockStub, fn, id string) string {
	t.Helper()
	code, payload := invoke(t, stub, fn, id)
	if code != 200 {
		t.Fatalf("%s(%s) failed: %d %s", fn, id, code, payload)
	}
	var doc struct {
		Status string `json:"status"`
	}
	readJSON(t, payload, &doc)
	return doc.Status
}

func TestLeg2BorderPrescribedOrder(t *testing.T) {
	stub := newTestStub(t)
	setTestCreator(t, stub, "CustomsMSP")

	crossing := "BC-LEG2-1"
	code, payload := invoke(t, stub, "InitiateBorderCrossing",
		crossing, "SHIP-LEG2-1", "CONT-LEG2-1", "EXP-LEG2-1",
		"Galafi", "Djibouti", "LAND", "Djibouti", "New York, USA",
		"CLR-LEG2-1", "CD-LEG2-1", "LAND_SEA", "TRK-LEG2-1",
		"Abebe Tesfaye", "SEAL-LEG2-1", "50000", "834")
	if code != 200 {
		t.Fatalf("InitiateBorderCrossing: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "PENDING" {
		t.Fatalf("after initiate: status %q, want PENDING", got)
	}

	code, payload = invoke(t, stub, "RecordBorderInspection",
		crossing, "customs_admin", "2026-11-13", "true", "GOOD", "true",
		"Seals intact", "true")
	if code != 200 {
		t.Fatalf("RecordBorderInspection: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "INSPECTED" {
		t.Fatalf("after inspect: status %q, want INSPECTED", got)
	}

	// F6: clear from INSPECTED must land CLEARED_EXIT (departure
	// eligible), NOT terminal CLEARED — the old behaviour stranded
	// the crossing here.
	code, payload = invoke(t, stub, "ClearBorderCrossing",
		crossing, "customs_admin", "CLR-LEG2-1", "2026-11-13")
	if code != 200 {
		t.Fatalf("ClearBorderCrossing: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "CLEARED_EXIT" {
		t.Fatalf("after clear from INSPECTED: status %q, want CLEARED_EXIT", got)
	}

	code, payload = invoke(t, stub, "RecordDeparture", crossing, "2026-11-13")
	if code != 200 {
		t.Fatalf("RecordDeparture after clear: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "IN_TRANSIT" {
		t.Fatalf("after departure: status %q, want IN_TRANSIT", got)
	}

	code, payload = invoke(t, stub, "RecordBorderCrossing",
		crossing, "2026-11-13", "customs_admin", "BCR-LEG2-1", "")
	if code != 200 {
		t.Fatalf("RecordBorderCrossing: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "CROSSED" {
		t.Fatalf("after crossing: status %q, want CROSSED", got)
	}

	code, payload = invoke(t, stub, "RecordArrival",
		crossing, "2026-11-13", "Djibouti Port")
	if code != 200 {
		t.Fatalf("RecordArrival: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "ARRIVED" {
		t.Fatalf("after arrival: status %q, want ARRIVED", got)
	}

	// Destination clearance still ends in terminal CLEARED.
	code, payload = invoke(t, stub, "ClearBorderCrossing",
		crossing, "customs_admin", "CLR-LEG2-1-FINAL", "2026-11-13")
	if code != 200 {
		t.Fatalf("ClearBorderCrossing after arrival: %d %s", code, payload)
	}
	if got := readStatus(t, stub, "ReadBorderCrossing", crossing); got != "CLEARED" {
		t.Fatalf("after clear from ARRIVED: status %q, want CLEARED", got)
	}
}

func TestLeg2InspectionRequiresShipment(t *testing.T) {
	stub := newTestStub(t)
	setTestCreator(t, stub, "ECTAMSP")

	// F9: request for a shipment that does not exist is refused.
	code, payload := invokeFull(t, stub, "RequestInspection",
		"INSP-LEG2-FAKE", "SHIP-FAKE-LEG2", "CONT-LEG2-1", "EXP-LEG2-1", "2026-11-13")
	if code == 200 {
		t.Fatalf("RequestInspection for fake shipment succeeded, want refusal")
	}
	if !strings.Contains(payload, "does not exist") {
		t.Fatalf("RequestInspection fake-shipment error %q does not say 'does not exist'", payload)
	}

	// Empty shipmentID is still allowed (legacy pre-shipment path).
	code, payload = invoke(t, stub, "RequestInspection",
		"INSP-LEG2-NOSHIP", "", "CONT-LEG2-1", "EXP-LEG2-1", "2026-11-13")
	if code != 200 {
		t.Fatalf("RequestInspection with empty shipmentID: %d %s", code, payload)
	}

	// A real shipment can be inspected end to end.
	seedState(t, stub, "SHIPMENT_SHIP-LEG2-REAL",
		`{"shipmentId":"SHIP-LEG2-REAL","status":"CREATED"}`)
	code, payload = invoke(t, stub, "RequestInspection",
		"INSP-LEG2-REAL", "SHIP-LEG2-REAL", "CONT-LEG2-1", "EXP-LEG2-1", "2026-11-13")
	if code != 200 {
		t.Fatalf("RequestInspection for real shipment: %d %s", code, payload)
	}

	// Perform / approve on a seeded inspection whose shipment does
	// not exist are refused (the INSP-FAKE-R2 shape).
	performArgs := []string{"INSP-LEG2-FAKE2", "ecta_admin", "ECTA Quality Lab",
		"5", "10", "2", "Screen 15+", "Green", "Fresh",
		"88", "87", "86", "88", "87", "86", "90", "90", "88", "88",
		"Grade 1", "PASS", "PASS", "PASS", "leg2 test"}
	seedState(t, stub, "INSPECTION_INSP-LEG2-FAKE2",
		`{"inspectionId":"INSP-LEG2-FAKE2","shipmentId":"SHIP-FAKE-LEG2","status":"PENDING"}`)
	code, payload = invokeFull(t, stub, "PerformInspection", performArgs...)
	if code == 200 {
		t.Fatalf("PerformInspection for fake shipment succeeded, want refusal")
	}
	if !strings.Contains(payload, "does not exist") {
		t.Fatalf("PerformInspection fake-shipment error %q does not say 'does not exist'", payload)
	}

	seedState(t, stub, "INSPECTION_INSP-LEG2-FAKE3",
		`{"inspectionId":"INSP-LEG2-FAKE3","shipmentId":"SHIP-FAKE-LEG2","status":"INSPECTED"}`)
	code, payload = invokeFull(t, stub, "ApproveQualityInspection", "INSP-LEG2-FAKE3", "ecta_admin")
	if code == 200 {
		t.Fatalf("ApproveQualityInspection for fake shipment succeeded, want refusal")
	}
	if !strings.Contains(payload, "does not exist") {
		t.Fatalf("ApproveQualityInspection fake-shipment error %q does not say 'does not exist'", payload)
	}

	// Positive control: perform on the real shipment's inspection works.
	performArgs[0] = "INSP-LEG2-REAL"
	code, payload = invokeFull(t, stub, "PerformInspection", performArgs...)
	if code != 200 {
		t.Fatalf("PerformInspection for real shipment: %d %s", code, payload)
	}
	// ReadInspection reads the PREINSPECTION_ entity, not the
	// QualityInspection under INSPECTION_ — read the state directly.
	raw, err := stub.GetState("INSPECTION_INSP-LEG2-REAL")
	if err != nil || raw == nil {
		t.Fatalf("GetState INSPECTION_INSP-LEG2-REAL: %v (nil=%v)", err, raw == nil)
	}
	var insp struct {
		MoistureContent float64 `json:"moistureContent"`
		Status          string  `json:"status"`
	}
	readJSON(t, string(raw), &insp)
	if insp.Status != "INSPECTED" || insp.MoistureContent != 10 {
		t.Fatalf("performed inspection: status %q moisture %v, want INSPECTED/10",
			insp.Status, insp.MoistureContent)
	}
}

func TestLeg2BillOfLadingGate(t *testing.T) {
	stub := newTestStub(t)
	setTestCreator(t, stub, "ShippingMSP")

	blArgs := func(id, no string) []string {
		return []string{id, no, "MV Leg2", "Djibouti Port", "New York Port", "2026-12-10", "TRK-LEG2-1"}
	}

	// F3: CREATED shipment refuses a B/L.
	seedState(t, stub, "SHIPMENT_SHIP-LEG2-CREATED",
		`{"shipmentId":"SHIP-LEG2-CREATED","status":"CREATED"}`)
	code, payload := invokeFull(t, stub, "RecordBillOfLading", blArgs("SHIP-LEG2-CREATED", "BL-LEG2-1")...)
	if code == 200 {
		t.Fatalf("RecordBillOfLading on CREATED shipment succeeded, want refusal")
	}
	if !strings.Contains(payload, "CUSTOMS_CLEARED") {
		t.Fatalf("RecordBillOfLading CREATED error %q does not name the allowed states", payload)
	}

	// CUSTOMS_CLEARED records the B/L and moves to LOADED.
	seedState(t, stub, "SHIPMENT_SHIP-LEG2-CLEARED",
		`{"shipmentId":"SHIP-LEG2-CLEARED","status":"CUSTOMS_CLEARED"}`)
	code, payload = invoke(t, stub, "RecordBillOfLading", blArgs("SHIP-LEG2-CLEARED", "BL-LEG2-2")...)
	if code != 200 {
		t.Fatalf("RecordBillOfLading on CUSTOMS_CLEARED: %d %s", code, payload)
	}
	// ReadShipment's typed response fails schema validation on a
	// minimal seed doc (response_schema_test.go) — read state directly.
	raw, err := stub.GetState("SHIPMENT_SHIP-LEG2-CLEARED")
	if err != nil || raw == nil {
		t.Fatalf("GetState SHIPMENT_SHIP-LEG2-CLEARED: %v (nil=%v)", err, raw == nil)
	}
	var ship struct {
		Status           string `json:"status"`
		BillOfLadingNo   string `json:"billOfLadingNo"`
		BillOfLadingDate string `json:"billOfLadingDate"`
	}
	readJSON(t, string(raw), &ship)
	if ship.Status != "LOADED" || ship.BillOfLadingNo != "BL-LEG2-2" || ship.BillOfLadingDate == "" {
		t.Fatalf("after B/L: %+v, want LOADED / BL-LEG2-2 / dated", ship)
	}

	// LOADED allows a re-issue (corrected B/L details).
	code, payload = invoke(t, stub, "RecordBillOfLading", blArgs("SHIP-LEG2-CLEARED", "BL-LEG2-2-CORR")...)
	if code != 200 {
		t.Fatalf("RecordBillOfLading re-issue on LOADED: %d %s", code, payload)
	}

	// RecordShippingDetails obeys the same gate.
	shipArgs := []string{"SHIP-LEG2-CREATED", "SEA", "BL-LEG2-3", "Maersk", "MV Leg2",
		"Djibouti Port", "New York Port", "2026-12-10", "", "MSKU1", "40FT", "VY-1"}
	code, payload = invokeFull(t, stub, "RecordShippingDetails", shipArgs...)
	if code == 200 {
		t.Fatalf("RecordShippingDetails on CREATED shipment succeeded, want refusal")
	}
	seedState(t, stub, "SHIPMENT_SHIP-LEG2-BOOKED",
		`{"shipmentId":"SHIP-LEG2-BOOKED","status":"FREIGHT_BOOKED"}`)
	shipArgs[0] = "SHIP-LEG2-BOOKED"
	code, payload = invokeFull(t, stub, "RecordShippingDetails", shipArgs...)
	if code != 200 {
		t.Fatalf("RecordShippingDetails on FREIGHT_BOOKED: %d %s", code, payload)
	}
}

func TestLeg2PhytoPlantDescriptionAndNumber(t *testing.T) {
	stub := newTestStub(t)
	setTestCreator(t, stub, "ECTAMSP")

	seedState(t, stub, "SHIPMENT_SHIP-LEG2-PHYTO",
		`{"shipmentId":"SHIP-LEG2-PHYTO","status":"CUSTOMS_CLEARED"}`)
	reqArgs := []string{"PHYTO-LEG2-1", "SHIP-LEG2-PHYTO", "EXP-LEG2-1",
		"", "50000", "Fumigation", "Yirgacheffe", "New York Port",
		"Jute bags 60kg", "834", "YIRG-G1", "Sea vessel MV Leg2", "90 days"}

	// F15a: missing plantDescription is refused, not defaulted.
	code, payload := invokeFull(t, stub, "RequestPhytosanitaryCertificate", reqArgs...)
	if code == 200 {
		t.Fatalf("RequestPhytosanitaryCertificate without plantDescription succeeded, want refusal")
	}
	if !strings.Contains(payload, "plantDescription") {
		t.Fatalf("RequestPhytosanitaryCertificate error %q does not name plantDescription", payload)
	}

	// With a description the request works.
	reqArgs[3] = "Coffee beans (Coffea arabica), green, Grade 1"
	code, payload = invoke(t, stub, "RequestPhytosanitaryCertificate", reqArgs...)
	if code != 200 {
		t.Fatalf("RequestPhytosanitaryCertificate with plantDescription: %d %s", code, payload)
	}

	// F15b: issue honours a supplied certificate number (bridge branch:
	// the certificate already exists as INSPECTED).
	seedState(t, stub, "PHYTO_PHYTO-LEG2-2",
		`{"certificateId":"PHYTO-LEG2-2","shipmentId":"SHIP-LEG2-PHYTO","exporterId":"EXP-LEG2-1","status":"INSPECTED","inspectionResult":"PASSED","quantity":50000,"numberOfPackages":834}`)
	issueArgs := []string{"PHYTO-LEG2-2", "SHIP-LEG2-PHYTO", "EXP-LEG2-1",
		"ecta_admin", "Coffea arabica", "Fumigation", "Yirgacheffe",
		"New York Port", "50000", "Jute bags 60kg", "834", "YIRG-G1",
		"Sea vessel MV Leg2", "Ministry of Agriculture", "PHYTO-CERT-LEG2-2"}
	code, payload = invoke(t, stub, "IssuePhytosanitaryCertificate", issueArgs...)
	if code != 200 {
		t.Fatalf("IssuePhytosanitaryCertificate with supplied number: %d %s", code, payload)
	}
	code, payload = invoke(t, stub, "ReadPhytosanitaryCertificate", "PHYTO-LEG2-2")
	if code != 200 {
		t.Fatalf("ReadPhytosanitaryCertificate: %d %s", code, payload)
	}
	var cert struct {
		CertificateNumber string `json:"certificateNumber"`
		Status            string `json:"status"`
	}
	readJSON(t, payload, &cert)
	if cert.Status != "ISSUED" || cert.CertificateNumber != "PHYTO-CERT-LEG2-2" {
		t.Fatalf("issued cert: %+v, want ISSUED / PHYTO-CERT-LEG2-2", cert)
	}

	// No supplied number still generates one.
	seedState(t, stub, "PHYTO_PHYTO-LEG2-3",
		`{"certificateId":"PHYTO-LEG2-3","shipmentId":"SHIP-LEG2-PHYTO","exporterId":"EXP-LEG2-1","status":"INSPECTED","inspectionResult":"PASSED","quantity":50000,"numberOfPackages":834}`)
	issueArgs[0] = "PHYTO-LEG2-3"
	issueArgs[14] = ""
	code, payload = invoke(t, stub, "IssuePhytosanitaryCertificate", issueArgs...)
	if code != 200 {
		t.Fatalf("IssuePhytosanitaryCertificate without number: %d %s", code, payload)
	}
	code, payload = invoke(t, stub, "ReadPhytosanitaryCertificate", "PHYTO-LEG2-3")
	if code != 200 {
		t.Fatalf("ReadPhytosanitaryCertificate: %d %s", code, payload)
	}
	readJSON(t, payload, &cert)
	if cert.Status != "ISSUED" || !strings.HasPrefix(cert.CertificateNumber, "PHYTO-ET-") {
		t.Fatalf("issued cert without supplied number: %+v, want ISSUED / PHYTO-ET-…", cert)
	}
}
