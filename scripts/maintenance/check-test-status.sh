#!/bin/bash

echo "=== E2E TEST STATUS SUMMARY ==="
echo ""

check_file() {
  local file=$1
  local stage=$2
  if [ -f "$file" ]; then
    local success=$(jq -r '.success // "unknown"' "$file" 2>/dev/null)
    if [ "$success" = "true" ]; then
      echo "✓ $stage: SUCCESS"
    elif [ "$success" = "false" ]; then
      echo "✗ $stage: FAILED"
      jq -r '.error.message // .error // "Unknown error"' "$file" 2>/dev/null | head -2
    else
      echo "? $stage: Unknown status"
    fi
  else
    echo "- $stage: Not run"
  fi
}

check_file "/tmp/create_app.json" "Stage 1: Exporter Application"
check_file "/tmp/approve_exporter.json" "Stage 1: Exporter Approval"
check_file "/tmp/create_contract.json" "Stage 2: Contract Creation"
check_file "/tmp/approve_contract.json" "Stage 2: Contract Approval"
check_file "/tmp/request_lc.json" "Stage 3: LC Request"
check_file "/tmp/approve_lc.json" "Stage 3: LC Approval"
check_file "/tmp/issue_lc.json" "Stage 3: LC Issuance"
check_file "/tmp/request_forex.json" "Stage 4: Forex Request"
check_file "/tmp/allocate_forex.json" "Stage 4: Forex Allocation"
check_file "/tmp/create_shipment.json" "Stage 5: Shipment Creation"
check_file "/tmp/request_inspection.json" "Stage 6: Quality Inspection Request"
check_file "/tmp/perform_inspection.json" "Stage 6: Quality Inspection Performance"

echo ""
echo "=== Latest Response Files ===" 
ls -lt /tmp/*.json | head -10 | awk '{print $9, $6, $7, $8}'
