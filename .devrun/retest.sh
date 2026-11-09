#!/bin/bash
# Focused re-test after the handoff-audit fixes (migration 060, forex
# reject PG mirror, quality-create CouchDB best-effort, post-delivery
# UNIQUE). Verifies the HANDOFF1447 run's FAILs and harness-seed gaps.
# Run: bash .devrun/retest.sh ; results in .devrun/out4/
set -u
BASE="http://localhost:3001/api/v1"
OUT="$HOME/workspace/GoCBC/.devrun"
RES="$OUT/out4"
mkdir -p "$RES"
NS="RETEST$(date +%H%M)"
TS=$(date +%s)
echo "NAMESPACE=$NS"
PASS=$(awk -F': ' '/[Pp]assword/ {print $2; exit}' /tmp/cecbs-test-users.txt | tr -d ' \r')
DBURL=$(grep -oP '^DATABASE_URL=\K.*' /tmp/cecbs-api.env | head -1)
SHIP_ID="SHP-$NS"; CONTRACT_ID="CTR-$NS"; EXPORTER_ID="EXP-$NS"; QI_ID="QI-$NS"
FOREX_ID="FOREX-$NS"; LC_ID="LC-$NS"

jqget() { if [ -n "${2:-}" ]; then jq -r "$1 // empty" "$2" 2>/dev/null; else jq -r "$1 // empty" 2>/dev/null; fi; }

call() {
  local label="$1" method="$2" path="$3" token="$4" body="${5:-}"
  local f="$RES/$label.json" code resp
  for attempt in 1 2 3; do
    if [ -n "$body" ]; then
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
}

login() {
  local user="$1" role="$2"
  local r
  r=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$user\",\"password\":\"$PASS\"}")
  local t
  t=$(echo "$r" | jqget '.data.token')
  if [ -z "$t" ]; then echo "LOGIN FAIL $role: $(echo "$r" | head -c 200)"; else echo "LOGIN OK $role"; fi
  eval "TOKEN_$role='$t'"
}

login "test_ecta_TMW977G36" ECTA
login "test_banks_TMW977G36" BANKS
login "test_nbe_TMW977G36" NBE
login "test_shipping_TMW977G36" SHIPPING

echo "== R1: booking lifecycle incl. arrive (migration 060 ARRIVED) =="
call "R1-shipment-create" POST "/shipments" "$TOKEN_ECTA" "{\"shipmentID\":\"$SHIP_ID\",\"contractID\":\"$CONTRACT_ID\",\"exporterID\":\"$EXPORTER_ID\",\"buyerID\":\"BUY-$NS\",\"coffeeType\":\"Arabica\",\"grade\":\"Grade 1\",\"quantity\":20000,\"icoNumber\":\"ICO$TS\",\"origin\":\"Sidama\",\"channel\":\"ECX\",\"ecxLotNumber\":\"ECX$TS\",\"forexRate\":55.5,\"valueUSD\":170000,\"eudrCompliant\":true,\"destination\":\"United States\",\"expectedShipmentDate\":\"2024-06-15\"}"
call "R1-booking-create" POST "/shipping/bookings" "$TOKEN_ECTA" "{\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"shippingLine\":\"Maersk Line\",\"vesselName\":\"Maersk Explorer\",\"voyageNumber\":\"VOY$TS\",\"containerType\":\"20ft\",\"numberOfContainers\":2,\"portOfLoading\":\"Djibouti\",\"portOfDischarge\":\"New York\",\"estimatedDepartureDate\":\"2024-06-15\",\"estimatedArrivalDate\":\"2024-07-20\"}"
BOOK_ID=$(jqget '.data.booking.bookingID // .data.bookingID' "$RES/R1-booking-create.json")
echo "BOOK_ID=$BOOK_ID"
call "R1-booking-load" POST "/shipping/bookings/$BOOK_ID/load" "$TOKEN_SHIPPING" '{}'
call "R1-booking-depart" POST "/shipping/bookings/$BOOK_ID/depart" "$TOKEN_SHIPPING" '{}'
call "R1-booking-arrive" POST "/shipping/bookings/$BOOK_ID/arrive" "$TOKEN_SHIPPING" '{}'
psql "$DBURL" -t -A -c "SELECT status FROM shipments WHERE shipment_id='$SHIP_ID';" | xargs -I{} echo "shipments.status after arrive: {}"
call "R1-booking-deliver" POST "/shipping/bookings/$BOOK_ID/deliver" "$TOKEN_SHIPPING" '{}'

echo "== R2: forex reject (new route mirror + 060 REJECTED) =="
psql "$DBURL" -v ON_ERROR_STOP=1 -c "INSERT INTO forex_allocations (allocation_id, forex_id, shipment_id, lc_number, amount_usd, exchange_rate, amount_local, allocation_date, status) VALUES ('$FOREX_ID','$FOREX_ID','$SHIP_ID','$LC_ID',170000,55.5,9435000,CURRENT_DATE,'REQUESTED') ON CONFLICT (allocation_id) DO NOTHING;" 2>&1 | tail -1
call "R2-forex-reject" POST "/banking/forex/$FOREX_ID/reject" "$TOKEN_BANKS" "{\"rejectionReason\":\"Retest rejection\"}"
psql "$DBURL" -t -A -c "SELECT status FROM forex_allocations WHERE allocation_id='$FOREX_ID';" | xargs -I{} echo "forex_allocations.status after reject: {}"
call "R2-nbe-portal-pending" GET "/portals/nbe" "$TOKEN_NBE"
jqget '.data.pendingForexRequests[]?.allocation_id' "$RES/R2-nbe-portal-pending.json" | grep -c "$FOREX_ID" | xargs -I{} echo "rejected forex still in NBE pending list: {} (want 0)"

echo "== R3: post-delivery seeded path (060 UNIQUE shipment_id) =="
psql "$DBURL" -v ON_ERROR_STOP=1 -c "INSERT INTO post_delivery_tracking (shipment_id, contract_id, exporter_id, delivery_date, lc_used, overall_status, completion_percentage, expected_completion_date, created_by, created_at) VALUES ('$SHIP_ID','$CONTRACT_ID','$EXPORTER_ID',CURRENT_TIMESTAMP,false,'PENDING',0,CURRENT_TIMESTAMP + INTERVAL '30 days','1',NOW()) ON CONFLICT (shipment_id) DO NOTHING;" 2>&1 | tail -1
psql "$DBURL" -t -A -c "SELECT count(*) FROM post_delivery_tracking WHERE shipment_id='$SHIP_ID';" | xargs -I{} echo "post_delivery_tracking rows after seed: {}"
call "R3-pd-payment" POST "/post-delivery/$SHIP_ID/payment" "$TOKEN_BANKS" "{\"paymentAmount\":170000,\"paymentCurrency\":\"USD\",\"swiftReference\":\"SWREF$TS\"}"
call "R3-pd-forex" POST "/post-delivery/$SHIP_ID/forex" "$TOKEN_NBE" "{\"forexAmount\":55000,\"forexRate\":55.5}"
call "R3-pd-lc" POST "/post-delivery/$SHIP_ID/lc-settlement" "$TOKEN_BANKS" "{\"lcReference\":\"LC-$NS\"}"
call "R3-pd-audit" POST "/post-delivery/$SHIP_ID/ecta-audit" "$TOKEN_ECTA" "{\"auditResult\":\"PASSED\",\"auditNotes\":\"Post-delivery audit passed\"}"
call "R3-pd-close" POST "/post-delivery/$SHIP_ID/close-contract" "$TOKEN_ECTA" "{\"closureNotes\":\"Contract closed after delivery\"}"
call "R3-pd-status" GET "/post-delivery/$SHIP_ID/status" "$TOKEN_ECTA"

echo "== R4: quality create/perform/approve (CouchDB best-effort) =="
call "R4-quality-create" POST "/quality/inspections" "$TOKEN_ECTA" "{\"inspectionID\":\"$QI_ID\",\"shipmentID\":\"$SHIP_ID\",\"exporterID\":\"$EXPORTER_ID\",\"contractID\":\"$CONTRACT_ID\",\"coffeeType\":\"Arabica Grade 1\",\"quantity\":20000,\"sampleSize\":1000,\"requestedDate\":\"$(date -I)\"}"
call "R4-quality-perform" POST "/quality/inspections/$QI_ID/perform" "$TOKEN_ECTA" '{}'
call "R4-quality-approve" PUT "/quality/inspections/$QI_ID/approve" "$TOKEN_ECTA" "{\"certificateNumber\":\"QC$TS\",\"grade\":\"Grade 1\",\"remarks\":\"Meets all quality standards\"}"

echo "== R5: permits issue as BANKS (role gate must pass, then Fabric 400) =="
call "R5-permit-issue-banks" POST "/permits" "$TOKEN_BANKS" "{\"permitID\":\"PERMIT-$NS\",\"shipmentID\":\"$SHIP_ID\",\"exporterId\":\"$EXPORTER_ID\",\"contractId\":\"$CONTRACT_ID\",\"amount\":170000,\"currency\":\"USD\"}"
echo "DONE NS=$NS"
