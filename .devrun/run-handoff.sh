#!/bin/bash
# CECBS dev-mode E2E run (run 2, after VM replacement) — API http://localhost:3005
# (dev, no Fabric, no Docker). Read-only against repo source; writes test data
# to a fresh Postgres DB. Results under ~/workspace/GoCBC/.devrun (persistent).
set -u
BASE="http://localhost:3001/api/v1"
OUT="$HOME/workspace/GoCBC/.devrun"
RES="$OUT/out3"
mkdir -p "$RES"
NS="HANDOFF$(date +%H%M)"
TS=$(date +%s)
echo "NAMESPACE=$NS" | tee "$OUT/handoff.env"
PASS=$(awk -F': ' '/[Pp]assword/ {print $2; exit}' /tmp/cecbs-test-users.txt | tr -d ' \r')
DBURL=$(grep -oP '^DATABASE_URL=\K.*' /tmp/cecbs-api.env | head -1)

jqget() { if [ -n "${2:-}" ]; then jq -r "$1 // empty" "$2" 2>/dev/null; else jq -r "$1 // empty" 2>/dev/null; fi; }

# call <label> <METHOD> <path> <token-or-empty> [body-json-or-@file] [multipart-flag]
call() {
  local label="$1" method="$2" path="$3" token="$4" body="${5:-}" multi="${6:-}"
  local f="$RES/$label.json" code resp
  for attempt in 1 2 3; do
    if [ "$multi" = "multi" ]; then
      resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "Authorization: Bearer $token" $body 2>/dev/null)
    elif [ -n "$body" ]; then
      resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body" 2>/dev/null)
    elif [ -n "$token" ]; then
      resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "Authorization: Bearer $token" 2>/dev/null)
    else
      resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" 2>/dev/null)
    fi
    code=$(echo "$resp" | tail -n1)
    echo "$resp" | sed '$d' > "$f"
    if [ "$code" != "000" ] && [ -n "$code" ]; then break; fi
    sleep 4
  done
  local summary
  summary=$(head -c 220 "$f" | tr -d '\n' | sed 's/  */ /g')
  printf '%-38s %s  %s\n' "$label" "$code" "$summary"
  echo "$code" > "$RES/$label.code"
}

login() { # login <role-user> -> sets TOKEN_<ROLE>
  local user="$1" role="$2"
  local r
  r=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$user\",\"password\":\"$PASS\"}")
  local t
  t=$(echo "$r" | jqget '.data.token')
  if [ -z "$t" ]; then echo "LOGIN FAIL $role: $(echo "$r" | head -c 200)"; else echo "LOGIN OK $role"; fi
  eval "TOKEN_$role='$t'"
}

echo "== Phase A: logins =="
login "test_admin_TMW977G36" ADMIN
login "test_ecta_TMW977G36" ECTA
login "test_ecx_TMW977G36" ECX
login "test_nbe_TMW977G36" NBE
login "test_banks_TMW977G36" BANKS
login "test_customs_TMW977G36" CUSTOMS
login "test_shipping_TMW977G36" SHIPPING
login "test_exporter_TMW977G36" EXPORTER

echo "== Phase 1: licence application =="
APP_BODY=$(cat <<EOF
{"companyName":"Dev Coffee Exporters $NS","tinNumber":"TIN$TS","businessType":"company","registrationNumber":"REG$TS","establishmentDate":"2020-01-15","address":"Addis Ababa, Bole Road","city":"Addis Ababa","region":"Addis Ababa","country":"Ethiopia","postalCode":"1000","primaryPhone":"+251911234567","email":"dev$TS@devmode.et","website":"https://dev$TS.et","capitalRequirement":"20000000","numberOfEmployees":50,"productionCapacityKg":500000,"warehouseCapacityKg":100000,"contactPersonName":"Dev Tester","contactPersonTitle":"General Manager","contactPersonPhone":"+251911234567","contactPersonEmail":"dev$TS@devmode.et","businessLicenseNumber":"BL$TS","professionalTaster":"yes","tasterCertificate":"TC$TS","contactPerson":"Dev Tester","phone":"+251911234567"}
EOF
)
call "01-app-submit" POST "/exporters/exporter-applications" "" "$APP_BODY"
APP_ID=$(jqget '.data.applicationId' "$RES/01-app-submit.json")
APP_EMAIL="dev$TS@devmode.et"
APP_USER=$(jqget '.data.credentials.username' "$RES/01-app-submit.json")
echo "APP_ID=$APP_ID APP_USER=$APP_USER" | tee -a "$OUT/handoff.env"

call "02-app-check-email" GET "/exporters/exporter-applications/check/$APP_EMAIL" ""
call "04-app-approve-ecta" POST "/exporters/exporter-applications/$APP_ID/approve" "$TOKEN_ECTA" "{\"exporterId\":\"EXP-$NS\",\"ectaLicenseNumber\":\"LIC$TS\",\"licenseExpiryDate\":\"2025-12-31T00:00:00.000Z\"}"
EXPORTER_ID=$(jqget '.data.exporterId' "$RES/04-app-approve-ecta.json")
[ -z "$EXPORTER_ID" ] && EXPORTER_ID="EXP-$NS"

# Second application: reject (fix regression) + applicant login + resubmit.
# The reject temp password is emailed only (SMTP unconfigured), so the harness
# sets it directly in PG (bcrypt) as test setup, then exercises login+resubmit.
APP2_BODY=$(echo "$APP_BODY" | sed "s/dev$TS/dev2$TS/g; s/TIN$TS/TIN2$TS/g; s/REG$TS/REG2$TS/g; s/BL$TS/BL2$TS/g; s/TC$TS/TC2$TS/g")
call "05-app2-submit" POST "/exporters/exporter-applications" "" "$APP2_BODY"
APP2_ID=$(jqget '.data.applicationId' "$RES/05-app2-submit.json")
APP2_USER=$(jqget '.data.credentials.username' "$RES/05-app2-submit.json")
call "06-app2-reject-ecta" POST "/exporters/exporter-applications/$APP2_ID/reject" "$TOKEN_ECTA" '{"reason":"Capital requirement below minimum threshold"}'
call "07-app2-reject-as-exporter" POST "/exporters/exporter-applications/$APP2_ID/reject" "$TOKEN_EXPORTER" '{"reason":"x"}'
APPL_PW="ApplicantDev1!"
HASH=$(node -e "const b=require('$HOME/workspace/GoCBC/api/node_modules/bcryptjs'); b.hash(process.argv[1],10).then(h=>console.log(h))" "$APPL_PW")
psql "$DBURL" -c "UPDATE exporter_applications SET temp_password='$HASH' WHERE application_id='$APP2_ID';" >/dev/null 2>&1
APPL2_R=$(curl -s -X POST "$BASE/auth/applicant/login" -H 'Content-Type: application/json' -d "{\"username\":\"$APP2_USER\",\"password\":\"$APPL_PW\"}")
TOKEN_APPLICANT2=$(echo "$APPL2_R" | jqget '.data.token')
echo "$APPL2_R" > "$RES/08-applicant2-login.json"
printf '%-38s %s  %s\n' "08-applicant2-login" "$(echo "$APPL2_R" | jqget '.success')" "$(echo "$APPL2_R" | head -c 180)"
APP2_NUMID=$(psql "$DBURL" -t -A -c "SELECT id FROM exporter_applications WHERE application_id='$APP2_ID';" 2>/dev/null | tr -d ' \r')
APP1_NUMID=$(psql "$DBURL" -t -A -c "SELECT id FROM exporter_applications WHERE application_id='$APP_ID';" 2>/dev/null | tr -d ' \r')
echo "APP2_NUMID=$APP2_NUMID APP1_NUMID=$APP1_NUMID" | tee -a "$OUT/handoff.env"
# Resubmit contract: numeric id in the path + the application's own email in
# the body (the handler queries WHERE id=$1 AND status='rejected' and
# requires a matching valid email; the APP-... string id 403s, '{}' 400s).
call "09-app2-resubmit-applicant" POST "/exporters/exporter-applications/$APP2_NUMID/resubmit" "$TOKEN_APPLICANT2" "{\"email\":\"dev2$TS@devmode.et\"}"
call "09b-app2-resubmit-wrong-app" POST "/exporters/exporter-applications/$APP1_NUMID/resubmit" "$TOKEN_APPLICANT2" "{\"email\":\"dev2$TS@devmode.et\"}"
call "10-app-resubmit-no-token" POST "/exporters/exporter-applications/$APP2_NUMID/resubmit" "" "{\"email\":\"dev2$TS@devmode.et\"}"

echo "== Phase 2: contract + ECX lot =="
CONTRACT_ID="CTR-$NS"
call "11-contract-create" POST "/contracts" "$TOKEN_ECTA" "{\"contractID\":\"$CONTRACT_ID\",\"exporterID\":\"$EXPORTER_ID\",\"buyerID\":\"BUY-$NS\",\"buyerName\":\"Global Coffee Importers\",\"buyerCountry\":\"United States\",\"buyerBank\":\"Chase Bank\",\"exporterBank\":\"Commercial Bank of Ethiopia\",\"coffeeType\":\"Arabica\",\"quantity\":20000,\"pricePerKg\":8.5,\"totalValue\":170000,\"currency\":\"USD\",\"contractDate\":\"2024-01-15\",\"deliveryDate\":\"2024-06-30\",\"incoterm\":\"FOB\",\"portOfLoading\":\"Djibouti\",\"portOfDischarge\":\"New York\",\"eudrRequired\":true}"
call "12-contract-approve" POST "/contracts/$CONTRACT_ID/approve" "$TOKEN_ECTA" '{"reviewNotes":"Contract terms verified and approved"}'
call "13-ecx-lot-intake" POST "/ecx/lots" "$TOKEN_ECX" "{\"exporterId\":\"$EXPORTER_ID\",\"origin\":\"Sidama\",\"quantity\":20000,\"processingMethod\":\"Washed\",\"ecxLotNumber\":\"ECX-LOT-$NS\",\"contractId\":\"$CONTRACT_ID\",\"warehouseId\":\"WH-ADDIS-01\",\"harvestSeason\":\"2025/2026\",\"grade\":\"Grade 1\"}"
psql "$DBURL" -t -A -c "SELECT count(*) FROM ecx_lots WHERE lot_number='ECX-LOT-$NS' OR lot_id='ECX-LOT-$NS';" 2>/dev/null | xargs -I{} echo "ecx_lots rows for ECX-LOT-$NS: {}"
call "14-portals-ecx" GET "/portals/ecx" "$TOKEN_ECX"

echo "== Phase 3: shipment + quality =="
SHIP_ID="SHP-$NS"
call "15-shipment-create" POST "/shipments" "$TOKEN_ECTA" "{\"shipmentID\":\"$SHIP_ID\",\"contractID\":\"$CONTRACT_ID\",\"exporterID\":\"$EXPORTER_ID\",\"buyerID\":\"BUY-$NS\",\"coffeeType\":\"Arabica\",\"grade\":\"Grade 1\",\"quantity\":20000,\"icoNumber\":\"ICO$TS\",\"origin\":\"Sidama\",\"channel\":\"ECX\",\"ecxLotNumber\":\"ECX$TS\",\"forexRate\":55.5,\"valueUSD\":170000,\"eudrCompliant\":true,\"destination\":\"United States\",\"expectedShipmentDate\":\"2024-06-15\"}"
QI_ID="QI-$NS"
call "16-quality-create" POST "/quality/inspections" "$TOKEN_ECTA" "{\"inspectionID\":\"$QI_ID\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"contractID\":\"$CONTRACT_ID\",\"coffeeType\":\"Arabica Grade 1\",\"quantity\":20000,\"sampleSize\":1000,\"requestedDate\":\"$(date -I)\"}"
call "17-quality-approve-nonexistent" PUT "/quality/inspections/QI-NOPE-$NS/approve" "$TOKEN_ECTA" "{\"certificateNumber\":\"QC$TS\",\"grade\":\"Grade 1\",\"remarks\":\"x\"}"
call "18-quality-approve-real" PUT "/quality/inspections/$QI_ID/approve" "$TOKEN_ECTA" "{\"certificateNumber\":\"QC$TS\",\"grade\":\"Grade 1\",\"remarks\":\"Meets all quality standards\"}"

echo "== Phase 4: LC + forex =="
LC_ID="LC-$NS"
call "19-lc-issue" POST "/banking/lc/issue" "$TOKEN_BANKS" "{\"lcID\":\"$LC_ID\",\"contractID\":\"$CONTRACT_ID\",\"exporterID\":\"$EXPORTER_ID\",\"amount\":170000,\"currency\":\"USD\",\"issuingBank\":\"Commercial Bank of Ethiopia\",\"advisingBank\":\"Chase Bank\",\"beneficiary\":\"Dev Coffee Exporters $NS\",\"applicant\":\"Global Coffee Importers\",\"expiryDate\":\"2024-06-30\",\"latestShipmentDate\":\"2024-06-15\",\"portOfLoading\":\"Djibouti\",\"portOfDischarge\":\"New York\"}"
call "20-lc-examine" POST "/banking/lc/$LC_ID/examine" "$TOKEN_BANKS" '{"documentType":"Bill of Lading","documentNumber":"BL'"$TS"'","examinationResult":"COMPLIANT","examinedBy":"Bank Document Officer","examinationNotes":"All documents in order"}'
call "21-lc-release-payment" POST "/banking/lc/$LC_ID/release-payment" "$TOKEN_BANKS" '{"amount":170000,"currency":"USD","releaseDate":"2024-06-20","releaseNotes":"All conditions met, payment released"}'
call "22-forex-request" POST "/forex/request" "$TOKEN_BANKS" "{\"forexId\":\"FOREX-$NS\",\"contractId\":\"$CONTRACT_ID\",\"exporterId\":\"$EXPORTER_ID\",\"amount\":170000,\"currency\":\"USD\"}"
call "23-nbe-forex-approve-nonexistent" POST "/nbe/forex/FOREX-NOPE-$NS/approve" "$TOKEN_NBE" '{"approvalNotes":"x"}'
# Seed a forex row in PG (test setup: mirrors what a successful forex request
# would create). forex_id is NOT NULL, so it must be set (run-1 seed omitted it).
FOREX_ID="FOREX-$NS"
psql "$DBURL" -v ON_ERROR_STOP=1 -c "INSERT INTO forex_allocations (allocation_id, forex_id, shipment_id, lc_number, amount_usd, exchange_rate, amount_local, allocation_date, status) VALUES ('$FOREX_ID','$FOREX_ID','$SHIP_ID','$LC_ID',170000,55.5,9435000,CURRENT_DATE,'REQUESTED') ON CONFLICT (allocation_id) DO UPDATE SET status='REQUESTED', forex_id=EXCLUDED.forex_id;" 2>&1 | tail -1
call "23b-nbe-portal-pending-check" GET "/portals/nbe" "$TOKEN_NBE"
call "24-nbe-forex-approve-real" POST "/nbe/forex/$FOREX_ID/approve" "$TOKEN_NBE" '{"approvalNotes":"Forex allocation approved based on contract value"}'
call "25-nbe-forex-repatriation" POST "/nbe/forex/$FOREX_ID/repatriation" "$TOKEN_NBE" '{"repatriationAmount":55000,"repatriationDate":"2024-06-20","bankReference":"BR'"$TS"'","repatriationMethod":"Wire Transfer"}'

echo "== Phase 5: permit + phyto + inspection =="
call "26-permit-issue" POST "/permits" "$TOKEN_ECTA" "{\"permitID\":\"PERMIT-$NS\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"quantity\":20000,\"certificateID\":\"QC$TS\",\"status\":\"ISSUED\"}"
call "27-phyto-request" POST "/phytosanitary/request" "$TOKEN_ECTA" "{\"certificateID\":\"PHYTO-$NS\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"destinationCountry\":\"United States\"}"
call "28-inspection-request" POST "/inspection/request" "$TOKEN_ECTA" "{\"inspectionID\":\"INSP-$NS\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"contractID\":\"$CONTRACT_ID\"}"

echo "== Phase 6: shipping booking =="
call "29-booking-create" POST "/shipping/bookings" "$TOKEN_ECTA" "{\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"shippingLine\":\"Maersk Line\",\"vesselName\":\"Maersk Explorer\",\"voyageNumber\":\"VOY$TS\",\"containerType\":\"20ft\",\"numberOfContainers\":2,\"portOfLoading\":\"Djibouti\",\"portOfDischarge\":\"New York\",\"estimatedDepartureDate\":\"2024-06-15\",\"estimatedArrivalDate\":\"2024-07-20\"}"
BOOK_ID=$(jqget '.data.booking.bookingID // .data.bookingID' "$RES/29-booking-create.json")
echo "BOOK_ID=$BOOK_ID" | tee -a "$OUT/handoff.env"
call "30-portals-shipping" GET "/portals/shipping" "$TOKEN_SHIPPING"
if [ -n "$BOOK_ID" ]; then
  call "31-booking-load" POST "/shipping/bookings/$BOOK_ID/load" "$TOKEN_SHIPPING" '{}'
  call "32-booking-depart" POST "/shipping/bookings/$BOOK_ID/depart" "$TOKEN_SHIPPING" '{}'
  call "33-booking-arrive" POST "/shipping/bookings/$BOOK_ID/arrive" "$TOKEN_SHIPPING" '{}'
  call "34-booking-deliver" POST "/shipping/bookings/$BOOK_ID/deliver" "$TOKEN_SHIPPING" '{}'
fi
call "35-book-freight" POST "/shipments/$SHIP_ID/book-freight" "$TOKEN_SHIPPING" '{"freightForwarder":"Maersk Line","transportMode":"SEA","vesselName":"Maersk Explorer","containerNumber":"MSKU1234567","estimatedDepartureDate":"2024-06-15","estimatedArrivalDate":"2024-07-20","portOfLoading":"Djibouti","portOfDischarge":"New York"}'
call "36-shipment-land-transport" POST "/shipments/$SHIP_ID/land-transport/start" "$TOKEN_SHIPPING" '{"transportCompany":"Dev Logistics","truckPlateNumber":"AA-12345"}'

echo "== Phase 7: customs =="
DECL_ID="DECL-$NS"
call "37-customs-submit" POST "/customs/declaration/submit" "$TOKEN_ECTA" "{\"declarationID\":\"$DECL_ID\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"hsCode\":\"0901.11\",\"declarationType\":\"STANDARD\",\"quantity\":20000,\"value\":170000,\"currency\":\"USD\",\"destination\":\"United States\",\"portOfExit\":\"Djibouti\",\"eudrCompliant\":true,\"additionalNotes\":\"Standard coffee export declaration\"}"
call "38-portals-customs" GET "/portals/customs" "$TOKEN_CUSTOMS"
call "39-customs-review" POST "/customs/declaration/$DECL_ID/review" "$TOKEN_CUSTOMS" '{"reviewNotes":"Documents in order"}'
call "40-customs-inspect" POST "/customs/declarations/$DECL_ID/inspect" "$TOKEN_CUSTOMS" '{}'
call "41-customs-complete-inspection" POST "/customs/declaration/$DECL_ID/complete-inspection" "$TOKEN_CUSTOMS" '{"inspectionResult":"PASSED","inspectionNotes":"Passed"}'
call "42-customs-clear" POST "/customs/declarations/$DECL_ID/clear" "$TOKEN_CUSTOMS" '{"clearanceNotes":"All requirements met","customsDuty":0,"otherCharges":500}'
call "43-border-initiate" POST "/bordercrossing/initiate" "$TOKEN_CUSTOMS" "{\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"borderPost\":\"Moyale\",\"destinationCountry\":\"United States\"}"

echo "== Phase 8: payments + SWIFT + settlement =="
call "44-payment-initiate" POST "/payments/initiate" "$TOKEN_BANKS" "{\"paymentID\":\"PAY-$NS\",\"contractID\":\"$CONTRACT_ID\",\"exporterID\":\"$EXPORTER_ID\",\"lcID\":\"$LC_ID\",\"amount\":170000,\"currency\":\"USD\",\"receivingBank\":\"Commercial Bank of Ethiopia\",\"receivingBankBIC\":\"CBETETAA\",\"beneficiaryName\":\"Dev Coffee Exporters $NS\",\"beneficiaryAccount\":\"1000123456789\",\"paymentMethod\":\"SWIFT\"}"
call "45-payment-record" POST "/payments/record" "$TOKEN_BANKS" "{\"paymentID\":\"PAY-$NS\",\"contractID\":\"$CONTRACT_ID\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"amountUSD\":170000,\"currency\":\"USD\",\"paymentDate\":\"2024-06-20\",\"payerName\":\"Global Coffee Importers\"}"
call "46-swift-create" POST "/swift/messages" "$TOKEN_BANKS" "{\"messageID\":\"SWIFT-$NS\",\"messageType\":\"MT700\",\"swiftReference\":\"SWREF$TS\",\"senderBIC\":\"CBETETAA\",\"receiverBIC\":\"CHASUS33\",\"amount\":170000,\"currency\":\"USD\",\"valueDate\":\"2024-06-20\",\"beneficiary\":\"Dev Coffee Exporters $NS\",\"remittanceInfo\":\"Coffee export payment\",\"linkedLcId\":\"$LC_ID\"}"
call "47-payment-settle" POST "/payments/PAY-$NS/settle" "$TOKEN_BANKS" '{"exchangeRate":55.5,"retentionRate":40,"payingBank":"Commercial Bank of Ethiopia","payingBankBIC":"CBETETAA","swiftReference":"SWIFT-SETTLE-'"$TS"'","nbeApprovalRef":"NBE-SETTLE-'"$TS"'"}'
call "48-payment-release-nbe" POST "/payments/PAY-$NS/release" "$TOKEN_NBE" "{\"exporterID\":\"$EXPORTER_ID\",\"amount\":170000}"
call "49-retention-policy-get" GET "/retention/policy/COFFEE" "$TOKEN_NBE"
call "50-retention-record" POST "/retention/$FOREX_ID/retention" "$TOKEN_NBE" '{"fcyAccountNumber":"FCY-1000123456789","retentionPercentage":40}'

echo "== Phase 9: post-delivery — phantom-fix verification FIRST (no tracking row must 404) =="
call "51a-postdelivery-payment-no-row" POST "/post-delivery/$SHIP_ID/payment" "$TOKEN_BANKS" '{"paymentAmount":170000,"paymentCurrency":"USD","swiftReference":"SWREF'"$TS"'"}'
call "52a-postdelivery-forex-no-row" POST "/post-delivery/$SHIP_ID/forex" "$TOKEN_NBE" '{"forexAmount":55000,"forexRate":55.5}'
call "53a-postdelivery-lc-no-row" POST "/post-delivery/$SHIP_ID/lc-settlement" "$TOKEN_BANKS" '{"lcReference":"LC-'"$NS"'"}'
call "54a-postdelivery-audit-no-row" POST "/post-delivery/$SHIP_ID/ecta-audit" "$TOKEN_ECTA" '{"auditResult":"PASSED","auditNotes":"Post-delivery audit passed"}'
# Seed the tracking row (test setup: in the app the row is only created by the
# delivery-complete handler after a chaincode ReadShipment, so it can never
# be created through the API without Fabric).
psql "$DBURL" -v ON_ERROR_STOP=1 -c "INSERT INTO post_delivery_tracking (shipment_id, contract_id, exporter_id, delivery_date, lc_used, overall_status, completion_percentage, expected_completion_date, created_by, created_at) VALUES ('$SHIP_ID','$CONTRACT_ID','$EXPORTER_ID',CURRENT_TIMESTAMP,false,'PENDING',0,CURRENT_TIMESTAMP + INTERVAL '30 days','1',NOW()) ON CONFLICT (shipment_id) DO NOTHING;" 2>&1 | tail -1
psql "$DBURL" -t -A -c "SELECT count(*) FROM post_delivery_tracking WHERE shipment_id='$SHIP_ID';" 2>/dev/null | xargs -I{} echo "post_delivery_tracking rows for $SHIP_ID after seed: {}"
echo "== Phase 9b: post-delivery retests with seeded row =="
call "51b-postdelivery-payment" POST "/post-delivery/$SHIP_ID/payment" "$TOKEN_BANKS" '{"paymentAmount":170000,"paymentCurrency":"USD","swiftReference":"SWREF'"$TS"'"}'
call "52b-postdelivery-forex" POST "/post-delivery/$SHIP_ID/forex" "$TOKEN_NBE" '{"forexAmount":55000,"forexRate":55.5}'
call "53b-postdelivery-lc" POST "/post-delivery/$SHIP_ID/lc-settlement" "$TOKEN_BANKS" '{"lcReference":"LC-'"$NS"'"}'
call "54b-postdelivery-audit" POST "/post-delivery/$SHIP_ID/ecta-audit" "$TOKEN_ECTA" '{"auditResult":"PASSED","auditNotes":"Post-delivery audit passed"}'
call "55-postdelivery-close" POST "/post-delivery/$SHIP_ID/close-contract" "$TOKEN_ECTA" '{"closureNotes":"Contract closed after delivery"}'
call "56-postdelivery-status" GET "/post-delivery/$SHIP_ID/status" "$TOKEN_ECTA"
call "57-postdelivery-dashboard" GET "/post-delivery/dashboard" "$TOKEN_ECTA"
psql "$DBURL" -t -A -c "SELECT overall_status || ' / ' || completion_percentage || '% / payment=' || COALESCE(payment_received,false) || ' forex=' || COALESCE(forex_repatriated,false) || ' lc=' || COALESCE(lc_settled,false) || ' audit=' || COALESCE(ecta_audit_completed,false) FROM post_delivery_tracking WHERE shipment_id='$SHIP_ID';" 2>/dev/null | xargs -I{} echo "final post-delivery row: {}"

echo "== Phase 10: documents + signatures =="
printf '%%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%%%EOF\n' > "$RES/test-doc.pdf"
call "58-doc-upload" POST "/documents/upload" "$TOKEN_EXPORTER" "-F file=@$RES/test-doc.pdf -F fileName=test-doc-$NS.pdf -F entityType=CONTRACT -F entityId=$CONTRACT_ID -F documentType=COMMERCIAL_INVOICE -F description=Dev-mode-test-document" "multi"
DOC_ID=$(jqget '.data.documentID // .data.documentId // .data.id' "$RES/58-doc-upload.json")
echo "DOC_ID=$DOC_ID" | tee -a "$OUT/handoff.env"
call "59-doc-list" GET "/documents?entityType=CONTRACT&entityId=$CONTRACT_ID" "$TOKEN_EXPORTER"
if [ -n "$DOC_ID" ]; then
  call "60-doc-sign" POST "/documents/$DOC_ID/sign" "$TOKEN_ECTA" '{"signatureType":"APPROVE","remarks":"Approved in dev-mode test"}'
  call "61-doc-signatures" GET "/documents/$DOC_ID/signatures" "$TOKEN_ECTA"
  call "62-doc-download" GET "/documents/$DOC_ID/download" "$TOKEN_EXPORTER"
  call "63-bc-signatures" GET "/blockchain-signatures/entity/DOCUMENT/$DOC_ID" "$TOKEN_ECTA"
else
  echo "60-63 SKIPPED (no DOC_ID)"
fi

echo "== Phase 11: portals + status =="
call "64-portals-ecta" GET "/portals/ecta" "$TOKEN_ECTA"
call "65-portals-banks" GET "/portals/banks" "$TOKEN_BANKS"
call "66-portals-nbe" GET "/portals/nbe" "$TOKEN_NBE"
call "67-portals-exporters" GET "/portals/exporters" "$TOKEN_EXPORTER"
call "68-status-contract" GET "/status/transitions/CONTRACT" "$TOKEN_ECTA"
call "69-status-shipment" GET "/status/transitions/SHIPMENT" "$TOKEN_ECTA"
call "70-status-payment" GET "/status/transitions/PAYMENT" "$TOKEN_ECTA"
call "71-workflow-status" GET "/status/workflow/$CONTRACT_ID?type=CONTRACT" "$TOKEN_ECTA"
echo "DONE NS=$NS"

echo "== Phase 12: new-fix verifications (handoff audit) =="
# Seed an INSPECTED quality row (create is CouchDB-blocked, so the row can
# only exist via seed — same as the status-matrix audit did).
psql "$DBURL" -v ON_ERROR_STOP=1 -c "INSERT INTO quality_inspections (inspection_id, shipment_id, exporter_id, contract_id, status, created_at) VALUES ('QI-HANDOFF-$NS', '$SHIP_ID', '$EXPORTER_ID', '$CONTRACT_ID', 'INSPECTED', NOW()) ON CONFLICT DO NOTHING;" 2>&1 | tail -1
call "72-quality-approve-seeded" PUT "/quality/inspections/QI-HANDOFF-$NS/approve" "$TOKEN_ECTA" "{\"certificateNumber\":\"QC$TS\",\"grade\":\"Grade 1\",\"remarks\":\"Meets all quality standards\"}"
call "73-quality-approve-again" PUT "/quality/inspections/QI-HANDOFF-$NS/approve" "$TOKEN_ECTA" "{\"certificateNumber\":\"QC$TS\",\"grade\":\"Grade 1\",\"remarks\":\"re-approve must fail\"}"
# Permits auth: unauthenticated -> 401, wrong role (ECTA) -> 403 (BANKS-only).
call "74-permits-issue-noauth" POST "/permits/issue" "" "{\"permitID\":\"PERMIT-NOAUTH-$NS\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\"}"
call "75-permits-issue-ecta-403" POST "/permits/issue" "$TOKEN_ECTA" "{\"permitID\":\"PERMIT-ECTA-$NS\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\"}"
call "76-permits-list-noauth" GET "/permits" ""
# Contract cancel role check + arg order (chain down: expect PG cancel + warning, not an arity error).
call "77-cancel-as-exporter-403" POST "/contracts/CTR-$NS/cancel" "$TOKEN_EXPORTER" "{\"cancellationReason\":\"test\"}"
call "78-cancel-as-ecta" POST "/contracts/$CONTRACT_ID/cancel" "$TOKEN_ECTA" "{\"cancellationReason\":\"Handoff test cancel\"}"
# Phyto issue arity: nonexistent cert must fail with the read-first message, not an arity error.
call "79-phyto-issue-no-cert" POST "/phytosanitary/PHYTO-NOPE-$NS/issue" "$TOKEN_ECTA" "{\"certificateNumber\":\"PHYTO$TS\",\"issuingAuthority\":\"ECTA\",\"validUntil\":\"2025-12-31\"}"
# Land-transport border crossing: no Fabric, so the crossing lookup must fail with the new message.
call "80-land-border-crossing" POST "/land-transport/$SHIP_ID/border-crossing" "$TOKEN_CUSTOMS" "{\"crossingTime\":\"2024-06-15T10:00:00Z\",\"customsOfficer\":\"Officer Test\",\"notes\":\"handoff test\"}"
# Stuff route must call StuffContainer (no RecordContainerStuffing on-chain).
call "81-stuff-container" POST "/shipments/$SHIP_ID/container/stuff" "$TOKEN_SHIPPING" "{\"containerNumber\":\"MSKU9999999\",\"containerType\":\"20ft\",\"stuffingDate\":\"2024-06-15\",\"stuffingLocation\":\"Djibouti Port\",\"stuffedBy\":\"Port Authority\",\"containerCondition\":\"GOOD\",\"sealNumber\":\"SEAL-$TS\"}"
# Forex reject guard: allocation is CONFIRMED (allowed from-state) so the guard must pass and the failure must be the missing Fabric, not a guard/arity error.
call "82-forex-reject-confirmed" POST "/banking/forex/$FOREX_ID/reject" "$TOKEN_BANKS" "{\"rejectionReason\":\"Handoff test rejection\"}"
# Status tables for the new states.
call "83-status-forex" GET "/status/transitions/FOREX" "$TOKEN_ECTA"
call "84-status-swift" GET "/status/transitions/SWIFT" "$TOKEN_ECTA"
call "85-status-phyto" GET "/status/transitions/PHYTOSANITARY" "$TOKEN_ECTA"
echo "DONE NS=$NS"
