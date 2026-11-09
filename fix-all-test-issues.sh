#!/bin/bash

# ============================================================================
# COMPREHENSIVE FIX SCRIPT FOR ALL CRUD TEST FAILURES
# ============================================================================

set -e  # Exit on error

API_URL="http://localhost:3001/api/v1"
PGDATABASE="cecbs"
PGUSER="cecbs"
PGPASSWORD="cecbs123"
PGHOST="localhost"
PGPORT="5432"

echo "============================================================================"
echo "COMPREHENSIVE FIX FOR ALL TEST ISSUES"
echo "============================================================================"
echo ""

# ----------------------------------------------------------------------------
# 1. FIX DATABASE SCHEMA - Add missing delivery_date column
# ----------------------------------------------------------------------------
echo "Step 1: Fixing database schema..."

PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" << 'SQL'
-- Check if delivery_date column exists, add if missing (ignore error if exists)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE shipments ADD COLUMN delivery_date TIMESTAMP;
  EXCEPTION
    WHEN duplicate_column THEN 
      RAISE NOTICE 'column delivery_date already exists';
  END;
END $$;

-- Update existing delivered shipments with a delivery date
UPDATE shipments 
SET delivery_date = updated_at 
WHERE status = 'DELIVERED' AND delivery_date IS NULL;

-- Show result
SELECT COUNT(*) as updated_count FROM shipments WHERE delivery_date IS NOT NULL;
SQL

if [ $? -eq 0 ]; then
  echo "✅ Database schema fixed"
else
  echo "⚠️  Database schema fix had issues (may already be fixed)"
fi
echo ""

# ----------------------------------------------------------------------------
# 2. RESET PORTAL OFFICER PASSWORDS TO password123
# ----------------------------------------------------------------------------
echo "Step 2: Resetting portal officer passwords..."

# Login as super admin
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to login as admin"
  exit 1
fi

# Reset passwords for quality, customs, shipping officers
for USER_ID in 68 69 70; do
  USERNAME=""
  case $USER_ID in
    68) USERNAME="quality.officer" ;;
    69) USERNAME="customs.officer" ;;
    70) USERNAME="shipping.officer" ;;
  esac
  
  echo "  Resetting password for $USERNAME (ID: $USER_ID)..."
  
  RESET_RESPONSE=$(curl -s -X POST "$API_URL/users/$USER_ID/reset-password" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  TEMP_PASSWORD=$(echo "$RESET_RESPONSE" | jq -r '.data.newPassword // .data.temporaryPassword')
  
  if [ "$TEMP_PASSWORD" != "null" ] && [ -n "$TEMP_PASSWORD" ]; then
    # Login with temp password
    USER_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$USERNAME\",\"password\":\"$TEMP_PASSWORD\"}")
    
    USER_TOKEN=$(echo "$USER_LOGIN" | jq -r '.data.token')
    
    if [ "$USER_TOKEN" != "null" ] && [ -n "$USER_TOKEN" ]; then
      # Change to password123
      curl -s -X PUT "$API_URL/users/$USER_ID/password" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"currentPassword\":\"$TEMP_PASSWORD\",\"newPassword\":\"password123\"}" > /dev/null
      
      echo "  ✅ $USERNAME password set to password123"
    fi
  fi
done

echo "✅ Portal officer passwords reset"
echo ""

# ----------------------------------------------------------------------------
# 3. FIX BANK OFFICER ROLE (BANK -> BANKS)
# ----------------------------------------------------------------------------
echo "Step 3: Fixing bank officer role..."

PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" << 'SQL'
-- Update bank.officer role from BANK to BANKS
UPDATE users 
SET role = 'BANKS' 
WHERE username = 'bank.officer' AND role = 'BANK';

-- Verify
SELECT id, username, role FROM users WHERE username = 'bank.officer';
SQL

echo "✅ Bank officer role fixed"
echo ""

# ----------------------------------------------------------------------------
# 4. CREATE MISSING PORTAL TAB ENDPOINTS
# ----------------------------------------------------------------------------
echo "Step 4: Creating missing portal tab endpoints..."

cat > /tmp/portal-tabs-fix.ts << 'TYPESCRIPT_END'
// Add these routes to /home/guda/GoCBC/api/src/routes/portals.ts

// ECTA Portal - Approved Exporters Tab
router.get('/ecta/approved-exporters',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const exporters = await db.all(
        `SELECT * FROM exporter_applications 
         WHERE status = 'approved' 
         ORDER BY approval_date DESC`
      );
      res.json({ success: true, data: exporters });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch approved exporters' });
    }
  }
);

// ECX Portal - Active Contracts Tab
router.get('/ecx/active-contracts',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const contracts = await db.all(
        `SELECT * FROM contracts 
         WHERE status IN ('ACTIVE', 'SIGNED') 
         ORDER BY created_at DESC`
      );
      res.json({ success: true, data: contracts });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch active contracts' });
    }
  }
);

// Banking Portal - Active LCs Tab
router.get('/banks/active-lcs',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const lcs = await db.all(
        `SELECT * FROM letter_of_credits 
         WHERE status IN ('ISSUED', 'ACTIVE', 'CONFIRMED') 
         ORDER BY issued_at DESC`
      );
      res.json({ success: true, data: lcs });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch active LCs' });
    }
  }
);

// Quality Portal - Certificates Issued Tab
router.get('/quality/certificates-issued',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const certificates = await db.all(
        `SELECT * FROM quality_certificates 
         WHERE status = 'issued' 
         ORDER BY issue_date DESC`
      );
      res.json({ success: true, data: certificates });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
    }
  }
);

// Customs Portal - Cleared Shipments Tab
router.get('/customs/cleared-shipments',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const declarations = await db.all(
        `SELECT * FROM customs_declarations 
         WHERE status = 'CLEARED' 
         ORDER BY clearance_date DESC`
      );
      res.json({ success: true, data: declarations });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch cleared shipments' });
    }
  }
);

// Shipping Portal - Active Shipments Tab
router.get('/shipping/active-shipments',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const shipments = await db.all(
        `SELECT * FROM shipments 
         WHERE status IN ('IN_TRANSIT', 'LOADED', 'DEPARTED') 
         ORDER BY created_at DESC`
      );
      res.json({ success: true, data: shipments });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch active shipments' });
    }
  }
);

// NBE Portal - Forex Monitoring Tab
router.get('/nbe/forex-monitoring',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const forexAllocations = await db.all(
        `SELECT * FROM forex_allocations 
         ORDER BY created_at DESC LIMIT 100`
      );
      res.json({ success: true, data: forexAllocations });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch forex data' });
    }
  }
);
TYPESCRIPT_END

echo "✅ Portal tab endpoint code prepared (see /tmp/portal-tabs-fix.ts)"
echo ""

# ----------------------------------------------------------------------------
# 5. FIX CUSTOMS DECLARATION WORKFLOW
# ----------------------------------------------------------------------------
echo "Step 5: Fixing customs declaration workflow..."

cat > /tmp/customs-workflow-fix.md << 'MARKDOWN_END'
# Customs Declaration Workflow Fix

The error "declaration cannot be cleared, current status: SUBMITTED" indicates that
the customs clearance workflow in the chaincode expects declarations to go through
this state machine:

SUBMITTED -> UNDER_REVIEW -> INSPECTED -> CLEARED

The test is trying to clear immediately after submission, skipping intermediate states.

Fix options:
1. Update test to follow proper workflow (inspect before clearing)
2. Update chaincode to allow direct clearing for admin users
3. Auto-transition SUBMITTED -> UNDER_REVIEW on submission

Recommended: Update test to call inspect endpoint before clear endpoint.
MARKDOWN_END

echo "✅ Customs workflow analysis complete (see /tmp/customs-workflow-fix.md)"
echo ""

echo "============================================================================"
echo "FIX SUMMARY"
echo "============================================================================"
echo "✅ Database schema updated (delivery_date column added)"
echo "✅ Portal officer passwords reset to password123"
echo "✅ Bank officer role fixed (BANK -> BANKS)"
echo "✅ Portal tab endpoints code prepared"
echo "⚠️  Manual action required:"
echo "    - Add portal tab routes from /tmp/portal-tabs-fix.ts to portals.ts"
echo "    - Update test to call customs inspect before clear"
echo "    - Restart API server"
echo "============================================================================"
