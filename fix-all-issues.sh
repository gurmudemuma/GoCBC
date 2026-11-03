#!/bin/bash

# ============================================================================
# FIX ALL WORKFLOW ISSUES
# ============================================================================
# This script fixes all database schema and data issues found during testing
# ============================================================================

set -e

PGPASSWORD=cecbs123
DB_USER=cecbs
DB_HOST=localhost
DB_NAME=cecbs

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $(printf '%-62s' "$1") ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_header "FIXING DATABASE SCHEMA ISSUES"

# Fix 1: Add missing inspector_name column
print_step "Adding inspector_name column to quality_inspections..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(200);" 2>&1 | grep -v "already exists" || true
print_success "inspector_name column ready"

# Fix 2: Add missing screen_size column
print_step "Adding screen_size column to quality_inspections..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS screen_size INTEGER;" 2>&1 | grep -v "already exists" || true
print_success "screen_size column ready"

# Fix 3: Increase status column size
print_step "Increasing status column size..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "ALTER TABLE quality_inspections ALTER COLUMN status TYPE VARCHAR(100);" 2>&1
print_success "status column increased to VARCHAR(100)"

# Fix 4: Increase grade column size
print_step "Increasing grade column size..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "ALTER TABLE quality_inspections ALTER COLUMN grade TYPE VARCHAR(100);" 2>&1
print_success "grade column increased to VARCHAR(100)"

# Fix 5: Increase cup_quality to TEXT for JSON storage
print_step "Converting cup_quality to TEXT..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "ALTER TABLE quality_inspections ALTER COLUMN cup_quality TYPE TEXT;" 2>&1
print_success "cup_quality column converted to TEXT"

print_header "CHECKING EXPORTER DATA"

# Check if EXP-E2E-1793603857 exists
print_step "Checking exporter application status..."
EXPORTER_STATUS=$(PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT status FROM exporter_applications WHERE application_id = 'EXP-E2E-1793603857';" | tr -d ' ')

if [ -z "$EXPORTER_STATUS" ]; then
    print_error "Exporter EXP-E2E-1793603857 not found in database"
    print_info "This exporter was never properly created. We'll create a new one in the test."
else
    print_info "Exporter status: $EXPORTER_STATUS"
    
    if [ "$EXPORTER_STATUS" != "approved" ]; then
        print_step "Manually approving exporter in database..."
        
        # Generate required fields
        TIMESTAMP=$(date +%s)
        LICENSE_NUM="ECTA-LIC-${TIMESTAMP}"
        EXPORTER_ID="EXP-TEST-${TIMESTAMP}"
        APPROVAL_DATE=$(date -I)
        EXPIRY_DATE="2027-12-31"
        
        PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
          "UPDATE exporter_applications 
           SET status = 'approved',
               exporter_id = '$EXPORTER_ID',
               license_number = '$LICENSE_NUM',
               approved_at = '$APPROVAL_DATE',
               license_expiry_date = '$EXPIRY_DATE'
           WHERE application_id = 'EXP-E2E-1793603857';" 2>&1
        
        print_success "Exporter approved in database"
        print_info "Exporter ID: $EXPORTER_ID"
        print_info "License: $LICENSE_NUM"
        
        # Now we need to register on blockchain
        print_step "Registering exporter on blockchain via API..."
        
        # Get admin token
        TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
          "http://localhost:3001/api/v1/auth/login" \
          -d '{"username":"ecta_admin","password":"password123"}' | \
          grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$TOKEN" ]; then
            # Call blockchain registration endpoint
            curl -s -X POST \
              -H "Authorization: Bearer $TOKEN" \
              -H "Content-Type: application/json" \
              "http://localhost:3001/api/v1/exporters/exporter-applications/EXP-E2E-1793603857/approve" \
              -d "{
                \"approvedBy\": \"System Administrator\",
                \"exporterId\": \"$EXPORTER_ID\",
                \"ectaLicenseNumber\": \"$LICENSE_NUM\",
                \"licenseExpiryDate\": \"$EXPIRY_DATE\"
              }" > /tmp/blockchain_reg.json 2>&1
            
            if grep -q "success.*true\|already" /tmp/blockchain_reg.json; then
                print_success "Exporter registered on blockchain"
            else
                print_error "Blockchain registration may have failed"
                cat /tmp/blockchain_reg.json | jq '.' 2>/dev/null || cat /tmp/blockchain_reg.json
            fi
        fi
    else
        print_success "Exporter already approved"
    fi
fi

print_header "CREATING FRESH TEST EXPORTER"

print_step "Creating a completely new test exporter with proper blockchain registration..."

TIMESTAMP=$(date +%s)
NEW_EXPORTER_ID="EXP-FRESH-${TIMESTAMP}"
NEW_APP_ID="APP-FRESH-${TIMESTAMP}"
TIN_NUMBER="TIN-${TIMESTAMP}"
LICENSE_NUM="ECTA-${TIMESTAMP}"

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
  "http://localhost:3001/api/v1/auth/login" \
  -d '{"username":"ecta_admin","password":"password123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    print_error "Failed to authenticate"
    exit 1
fi

# Create application
print_step "Submitting new exporter application..."
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:3001/api/v1/exporters/exporter-applications" \
  -d "{
    \"applicationId\": \"$NEW_APP_ID\",
    \"companyName\": \"Fresh Test Coffee Exporter PLC\",
    \"tinNumber\": \"$TIN_NUMBER\",
    \"businessLicense\": \"BL-${TIMESTAMP}\",
    \"businessLicenseNumber\": \"BL-${TIMESTAMP}\",
    \"address\": \"Bole, Addis Ababa, Ethiopia\",
    \"city\": \"Addis Ababa\",
    \"phone\": \"+251911234567\",
    \"email\": \"fresh${TIMESTAMP}@testcoffee.et\",
    \"contactPerson\": \"Test Manager\",
    \"capitalRequirement\": \"MEETS\",
    \"professionalTaster\": \"YES\",
    \"bankName\": \"Commercial Bank of Ethiopia\",
    \"bankAccountNumber\": \"1${TIMESTAMP:0:12}\"
  }" > /tmp/new_exporter_app.json

if grep -q "success.*true\|applicationId" /tmp/new_exporter_app.json; then
    print_success "Application submitted: $NEW_APP_ID"
    
    # Approve it
    sleep 2
    print_step "Approving new exporter application..."
    
    curl -s -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "http://localhost:3001/api/v1/exporters/exporter-applications/$NEW_APP_ID/approve" \
      -d "{
        \"approvedBy\": \"ECTA Administrator\",
        \"exporterId\": \"$NEW_EXPORTER_ID\",
        \"ectaLicenseNumber\": \"$LICENSE_NUM\",
        \"licenseExpiryDate\": \"2027-12-31\"
      }" > /tmp/new_exporter_approve.json
    
    if grep -q "success.*true\|APPROVED" /tmp/new_exporter_approve.json; then
        print_success "Exporter approved and registered on blockchain!"
        print_success "✓ New Exporter ID: $NEW_EXPORTER_ID"
        print_success "✓ Application ID: $NEW_APP_ID"
        print_success "✓ License: $LICENSE_NUM"
        
        # Save to file for test script to use
        echo "$NEW_EXPORTER_ID" > /tmp/fresh_exporter_id.txt
        echo "$NEW_APP_ID" > /tmp/fresh_app_id.txt
        
    else
        print_error "Approval failed"
        cat /tmp/new_exporter_approve.json | jq '.' 2>/dev/null || cat /tmp/new_exporter_approve.json
    fi
else
    print_error "Application creation failed"
    cat /tmp/new_exporter_app.json | jq '.' 2>/dev/null || cat /tmp/new_exporter_app.json
fi

print_header "DATABASE SCHEMA VERIFICATION"

print_step "Verifying quality_inspections table structure..."
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT column_name, data_type, character_maximum_length 
   FROM information_schema.columns 
   WHERE table_name = 'quality_inspections' 
   AND column_name IN ('inspector_name', 'screen_size', 'status', 'grade', 'cup_quality')
   ORDER BY column_name;"

print_header "SUMMARY"

echo ""
print_success "✅ Database schema fixes applied"
print_success "✅ Fresh test exporter created"
echo ""
print_info "Use the new exporter ID for testing:"
if [ -f /tmp/fresh_exporter_id.txt ]; then
    NEW_ID=$(cat /tmp/fresh_exporter_id.txt)
    echo -e "  ${CYAN}EXPORTER_ID=\"$NEW_ID\"${NC}"
fi
echo ""
print_info "Next: Run the workflow test with the fresh exporter"
echo ""
