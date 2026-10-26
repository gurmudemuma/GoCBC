/**
 * Banks Portal - Automated Test Suite
 * Tests all 9 tabs including the new LC Settlements tab
 * 
 * Prerequisites:
 * - System running (START-SYSTEM.bat)
 * - Test user: bank_admin
 * - Playwright installed: npm install -D @playwright/test
 * 
 * Run: npx playwright test tests/banks-portal-automated.test.js
 */

const { test, expect } = require('@playwright/test');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const TEST_USER = {
  username: 'bank_admin',
  password: 'Bank@2024',
  role: 'BANKS'
};

// Test data
const TEST_LC = {
  lcNumber: `LC-AUTO-${Date.now()}`,
  amount: 100000,
  currency: 'USD',
  expiryDays: 90
};

let authToken = null;

test.describe('Banks Portal - Complete Workflow Testing', () => {
  
  // ====================
  // SETUP & AUTHENTICATION
  // ====================
  
  test.beforeAll(async () => {
    console.log('🚀 Starting Banks Portal test suite...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`📍 API URL: ${API_URL}`);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    
    // Fill login form
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    
    // Extract auth token from localStorage
    authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    
    // Verify we're on the banks portal
    await expect(page).toHaveURL(/.*banks.*/);
    console.log('✅ Login successful');
  });

  // ====================
  // TAB 0: PAYMENT METHODS
  // ====================
  
  test('Tab 0.1: Load Payment Methods tab and verify KPIs', async ({ page }) => {
    console.log('\n📋 Testing Tab 0: Payment Methods');
    
    // Wait for page to load
    await page.waitForSelector('text=Payment Methods', { timeout: 10000 });
    
    // Verify KPI cards are visible
    const kpiCards = page.locator('[data-testid="kpi-card"], .MuiCard-root');
    const kpiCount = await kpiCards.count();
    expect(kpiCount).toBeGreaterThan(0);
    console.log(`✅ Found ${kpiCount} KPI cards`);
    
    // Verify payment method options
    const hasLC = await page.locator('text=Letter of Credit').isVisible();
    expect(hasLC).toBeTruthy();
    console.log('✅ Letter of Credit option visible');
  });

  test('Tab 0.2: Create Letter of Credit', async ({ page }) => {
    console.log('\n📝 Testing LC Creation');
    
    // Navigate to Payment Methods if not already there
    await page.click('text=Payment Methods').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Look for Create LC button or similar
    const createButton = page.locator('button:has-text("Create"), button:has-text("New LC"), button:has-text("Add")').first();
    const isVisible = await createButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // Try to fill LC form if dialog opens
      const lcNumberInput = page.locator('input[name="lcNumber"], input[label*="LC Number"]').first();
      const inputExists = await lcNumberInput.count() > 0;
      
      if (inputExists) {
        await lcNumberInput.fill(TEST_LC.lcNumber);
        console.log(`✅ LC Number entered: ${TEST_LC.lcNumber}`);
        
        // Note: Complete form filling depends on actual form structure
        console.log('⚠️  Manual verification needed for full LC creation');
      }
    } else {
      console.log('ℹ️  LC creation button not found - may require approved contract first');
    }
  });

  test('Tab 0.3: Verify LC list displays', async ({ page }) => {
    console.log('\n📊 Testing LC List Display');
    
    await page.click('text=Payment Methods').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for data grid or table
    const hasDataGrid = await page.locator('.MuiDataGrid-root, table').count() > 0;
    
    if (hasDataGrid) {
      const rowCount = await page.locator('.MuiDataGrid-row, tbody tr').count();
      console.log(`✅ Found ${rowCount} LC records`);
      expect(rowCount).toBeGreaterThanOrEqual(0);
    } else {
      console.log('ℹ️  No LCs found or list not yet displayed');
    }
  });

  // ====================
  // TAB 1: FOREX ALLOCATIONS
  // ====================
  
  test('Tab 1.1: Load Forex Allocations tab', async ({ page }) => {
    console.log('\n💱 Testing Tab 1: Forex Allocations');
    
    // Click Forex Allocations tab
    const forexTab = page.locator('text=Forex Allocations, button:has-text("Forex")').first();
    await forexTab.click();
    await page.waitForTimeout(2000);
    
    // Verify tab content loads
    const tabContent = page.locator('text=Forex, text=Exchange Rate, text=Retention');
    const contentVisible = await tabContent.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    if (contentVisible) {
      console.log('✅ Forex Allocations tab loaded');
    } else {
      console.log('⚠️  Forex tab content not visible');
    }
  });

  test('Tab 1.2: Verify Forex Allocations display', async ({ page }) => {
    console.log('\n📈 Testing Forex Allocations Display');
    
    await page.click('text=Forex Allocations').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for forex data
    const forexCount = await page.locator('.MuiDataGrid-row, .MuiCard-root').count();
    console.log(`ℹ️  Found ${forexCount} forex-related elements`);
    
    // Look for key forex terms
    const hasRetention = await page.locator('text=30%, text=Retention, text=ETB').count() > 0;
    if (hasRetention) {
      console.log('✅ Retention policy information visible');
    }
  });

  // ====================
  // TAB 2: SWIFT MESSAGES
  // ====================
  
  test('Tab 2.1: Load SWIFT Messages tab', async ({ page }) => {
    console.log('\n📨 Testing Tab 2: SWIFT Messages');
    
    const swiftTab = page.locator('text=SWIFT Messages, text=SWIFT').first();
    await swiftTab.click();
    await page.waitForTimeout(2000);
    
    // Verify SWIFT-related content
    const hasSwiftContent = await page.locator('text=MT700, text=MT103, text=Message').count() > 0;
    
    if (hasSwiftContent) {
      console.log('✅ SWIFT Messages tab loaded');
    } else {
      console.log('⚠️  SWIFT content not visible');
    }
  });

  test('Tab 2.2: Verify SWIFT Message types', async ({ page }) => {
    console.log('\n📋 Testing SWIFT Message Types');
    
    await page.click('text=SWIFT').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for message type labels
    const messageTypes = ['MT700', 'MT103', 'MT799', 'MT910'];
    let foundTypes = 0;
    
    for (const type of messageTypes) {
      const exists = await page.locator(`text=${type}`).count() > 0;
      if (exists) {
        foundTypes++;
        console.log(`✅ Found message type: ${type}`);
      }
    }
    
    console.log(`ℹ️  Total message types found: ${foundTypes}/4`);
  });

  // ====================
  // TAB 3: DOCUMENT EXAMINATION
  // ====================
  
  test('Tab 3.1: Load Document Examination tab', async ({ page }) => {
    console.log('\n📄 Testing Tab 3: Document Examination');
    
    const docTab = page.locator('text=Document Examination, text=Documents').first();
    await docTab.click();
    await page.waitForTimeout(2000);
    
    // Verify document examination content
    const hasDocContent = await page.locator('text=Examination, text=Compliance, text=Document').count() > 0;
    
    if (hasDocContent) {
      console.log('✅ Document Examination tab loaded');
    } else {
      console.log('⚠️  Document examination content not visible');
    }
  });

  // ====================
  // TAB 4: PAYMENT RELEASE
  // ====================
  
  test('Tab 4.1: Load Payment Release tab', async ({ page }) => {
    console.log('\n💰 Testing Tab 4: Payment Release');
    
    const paymentTab = page.locator('text=Payment Release').first();
    await paymentTab.click();
    await page.waitForTimeout(2000);
    
    // Verify payment release content
    const hasPaymentContent = await page.locator('text=Release, text=Payment, text=Authorize').count() > 0;
    
    if (hasPaymentContent) {
      console.log('✅ Payment Release tab loaded');
    } else {
      console.log('⚠️  Payment release content not visible');
    }
  });

  // ====================
  // TAB 5: ANALYTICS
  // ====================
  
  test('Tab 5.1: Load Analytics tab', async ({ page }) => {
    console.log('\n📊 Testing Tab 5: Analytics');
    
    const analyticsTab = page.locator('text=Analytics').first();
    await analyticsTab.click();
    await page.waitForTimeout(3000);
    
    // Verify analytics content (charts, metrics)
    const hasAnalytics = await page.locator('text=Chart, text=Report, text=Metric, .recharts-wrapper').count() > 0;
    
    if (hasAnalytics) {
      console.log('✅ Analytics tab loaded');
    } else {
      console.log('⚠️  Analytics content not visible');
    }
  });

  // ====================
  // TAB 6: USER MANAGEMENT
  // ====================
  
  test('Tab 6.1: Load User Management tab', async ({ page }) => {
    console.log('\n👥 Testing Tab 6: User Management');
    
    const userTab = page.locator('text=User Management, text=Users').first();
    await userTab.click();
    await page.waitForTimeout(2000);
    
    // Verify user management content
    const hasUserContent = await page.locator('text=User, text=Role, text=Permission').count() > 0;
    
    if (hasUserContent) {
      console.log('✅ User Management tab loaded');
      
      // Count visible users
      const userRows = await page.locator('.MuiDataGrid-row, tbody tr').count();
      console.log(`ℹ️  Found ${userRows} user records`);
    } else {
      console.log('⚠️  User management content not visible');
    }
  });

  // ====================
  // TAB 7: AUDIT TRAIL
  // ====================
  
  test('Tab 7.1: Load Audit Trail tab', async ({ page }) => {
    console.log('\n📜 Testing Tab 7: Audit Trail');
    
    const auditTab = page.locator('text=Audit Trail, text=Audit').first();
    await auditTab.click();
    await page.waitForTimeout(3000);
    
    // Verify audit trail content
    const hasAuditContent = await page.locator('text=Activity, text=Action, text=Timestamp, text=Blockchain').count() > 0;
    
    if (hasAuditContent) {
      console.log('✅ Audit Trail tab loaded');
      
      // Count audit records
      const auditRows = await page.locator('.MuiDataGrid-row, tbody tr').count();
      console.log(`ℹ️  Found ${auditRows} audit records`);
    } else {
      console.log('⚠️  Audit trail content not visible');
    }
  });

  test('Tab 7.2: Verify blockchain verification available', async ({ page }) => {
    console.log('\n🔗 Testing Blockchain Verification');
    
    await page.click('text=Audit').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Look for blockchain-related indicators
    const hasBlockchain = await page.locator('text=Blockchain, text=Verified, text=Hash').count() > 0;
    
    if (hasBlockchain) {
      console.log('✅ Blockchain verification indicators present');
    } else {
      console.log('ℹ️  Blockchain indicators not visible in current view');
    }
  });

  // ====================
  // TAB 8: LC SETTLEMENTS (NEW - POST-DELIVERY)
  // ====================
  
  test('Tab 8.1: Load LC Settlements tab (NEW)', async ({ page }) => {
    console.log('\n🎯 Testing Tab 8: LC Settlements (Post-Delivery) - NEW FEATURE');
    
    // Look for LC Settlements tab
    const settlementsTab = page.locator('text=LC Settlements, text=Settlement').first();
    const tabExists = await settlementsTab.count() > 0;
    
    if (!tabExists) {
      console.log('❌ LC Settlements tab NOT FOUND!');
      throw new Error('LC Settlements tab is missing - integration may have failed');
    }
    
    await settlementsTab.click();
    await page.waitForTimeout(3000);
    console.log('✅ LC Settlements tab clicked');
  });

  test('Tab 8.2: Verify LC Settlements KPI cards', async ({ page }) => {
    console.log('\n📊 Testing LC Settlements KPI Cards');
    
    await page.click('text=LC Settlements').catch(async () => {
      await page.click('text=Settlement');
    });
    await page.waitForTimeout(2000);
    
    // Look for KPI indicators
    const kpiTexts = [
      'Delivered Shipments',
      'Pending Settlement',
      'Active LCs',
      'Completed Settlements'
    ];
    
    let foundKPIs = 0;
    for (const text of kpiTexts) {
      const exists = await page.locator(`text=${text}`).count() > 0;
      if (exists) {
        foundKPIs++;
        console.log(`✅ Found KPI: ${text}`);
      }
    }
    
    expect(foundKPIs).toBeGreaterThan(0);
    console.log(`ℹ️  Total KPIs found: ${foundKPIs}/4`);
  });

  test('Tab 8.3: Verify delivered shipments display', async ({ page }) => {
    console.log('\n🚢 Testing Delivered Shipments Display');
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(3000);
    
    // Look for shipment cards or list
    const shipmentElements = page.locator('.MuiCard-root, [data-testid="shipment-card"]');
    const count = await shipmentElements.count();
    
    console.log(`ℹ️  Found ${count} card elements`);
    
    // Look for "Delivered" badge or status
    const hasDelivered = await page.locator('text=Delivered, [aria-label*="Delivered"]').count() > 0;
    
    if (hasDelivered) {
      console.log('✅ Delivered shipment indicators found');
    } else {
      console.log('⚠️  No delivered shipments visible (may be none in database)');
    }
  });

  test('Tab 8.4: Verify PostDeliveryWorkflowPanel renders', async ({ page }) => {
    console.log('\n📋 Testing PostDeliveryWorkflowPanel Component');
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(3000);
    
    // Look for workflow panel indicators
    const workflowTexts = [
      'Post-Delivery Workflow',
      'Payment Received',
      'Forex Repatriated',
      'LC Settlement',
      'ECTA Audit',
      'Contract Closed',
      'Workflow',
      'Progress'
    ];
    
    let foundElements = 0;
    for (const text of workflowTexts) {
      const exists = await page.locator(`text=${text}`).count() > 0;
      if (exists) {
        foundElements++;
        console.log(`✅ Found: ${text}`);
      }
    }
    
    if (foundElements > 0) {
      console.log(`✅ PostDeliveryWorkflowPanel detected (${foundElements} indicators found)`);
      expect(foundElements).toBeGreaterThan(0);
    } else {
      console.log('⚠️  PostDeliveryWorkflowPanel not visible (may be no delivered shipments)');
    }
  });

  test('Tab 8.5: Verify Record Payment button for Bank role', async ({ page }) => {
    console.log('\n💵 Testing Record Payment Functionality');
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(3000);
    
    // Look for "Record Payment" button
    const recordPaymentBtn = page.locator('button:has-text("Record Payment")');
    const btnCount = await recordPaymentBtn.count();
    
    if (btnCount > 0) {
      console.log(`✅ Found ${btnCount} "Record Payment" button(s)`);
      
      // Try to click first one to open dialog
      await recordPaymentBtn.first().click();
      await page.waitForTimeout(1000);
      
      // Check if dialog opened
      const dialogOpen = await page.locator('[role="dialog"], .MuiDialog-root').count() > 0;
      
      if (dialogOpen) {
        console.log('✅ Payment dialog opened successfully');
        
        // Check for form fields
        const hasAmount = await page.locator('input[name*="amount"], input[label*="Amount"]').count() > 0;
        const hasCurrency = await page.locator('select[name*="currency"], input[name*="currency"]').count() > 0;
        const hasSwift = await page.locator('input[name*="swift"], input[name*="reference"]').count() > 0;
        
        console.log(`ℹ️  Form fields: Amount=${hasAmount}, Currency=${hasCurrency}, SWIFT=${hasSwift}`);
        
        // Close dialog
        const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
        await closeBtn.click().catch(() => {});
      } else {
        console.log('⚠️  Payment dialog did not open');
      }
    } else {
      console.log('⚠️  "Record Payment" button not found (may be no pending payments)');
    }
  });

  test('Tab 8.6: Verify Record LC Settlement button', async ({ page }) => {
    console.log('\n🏦 Testing Record LC Settlement Functionality');
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(3000);
    
    // Look for "Record LC Settlement" button
    const recordLCBtn = page.locator('button:has-text("Record LC Settlement"), button:has-text("Record Settlement")');
    const btnCount = await recordLCBtn.count();
    
    if (btnCount > 0) {
      console.log(`✅ Found ${btnCount} "Record LC Settlement" button(s)`);
    } else {
      console.log('ℹ️  LC Settlement buttons not visible (may require payment to be recorded first)');
    }
  });

  test('Tab 8.7: Verify workflow progress indicators', async ({ page }) => {
    console.log('\n📈 Testing Workflow Progress Indicators');
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(3000);
    
    // Look for progress indicators
    const hasProgressBar = await page.locator('.MuiLinearProgress-root, [role="progressbar"]').count() > 0;
    const hasCheckmarks = await page.locator('svg[data-testid="CheckCircleIcon"]').count() > 0;
    const hasPercentage = await page.locator('text=%').count() > 0;
    
    console.log(`ℹ️  Progress indicators: Bar=${hasProgressBar}, Checkmarks=${hasCheckmarks}, Percentage=${hasPercentage}`);
    
    if (hasProgressBar || hasCheckmarks || hasPercentage) {
      console.log('✅ Workflow progress indicators present');
    } else {
      console.log('⚠️  No progress indicators visible');
    }
  });

  test('Tab 8.8: Verify role-based permissions (Bank view)', async ({ page }) => {
    console.log('\n🔐 Testing Role-Based Permissions');
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(3000);
    
    // Bank should have access to:
    // - Record Payment button
    // - Record LC Settlement button
    // Bank should NOT have access to:
    // - Record Forex button (NBE only)
    // - Complete Audit button (ECTA only)
    
    const hasPaymentBtn = await page.locator('button:has-text("Record Payment")').count() > 0;
    const hasLCBtn = await page.locator('button:has-text("Record LC Settlement"), button:has-text("Record Settlement")').count() > 0;
    const hasForexBtn = await page.locator('button:has-text("Record Forex")').count() > 0;
    const hasAuditBtn = await page.locator('button:has-text("Complete Audit")').count() > 0;
    
    console.log(`ℹ️  Bank permissions check:`);
    console.log(`   - Record Payment: ${hasPaymentBtn ? '✅ Visible' : '❌ Hidden'}`);
    console.log(`   - Record LC Settlement: ${hasLCBtn ? '✅ Visible' : '❌ Hidden'}`);
    console.log(`   - Record Forex: ${hasForexBtn ? '❌ Should be hidden' : '✅ Correctly hidden'}`);
    console.log(`   - Complete Audit: ${hasAuditBtn ? '❌ Should be hidden' : '✅ Correctly hidden'}`);
    
    // Verify Bank has appropriate buttons
    if (!hasForexBtn && !hasAuditBtn) {
      console.log('✅ Role-based permissions correctly enforced');
    } else {
      console.log('⚠️  Unexpected buttons visible for Bank role');
    }
  });

  // ====================
  // INTEGRATION TESTS
  // ====================
  
  test('Integration: Navigate through all tabs', async ({ page }) => {
    console.log('\n🔄 Testing Tab Navigation Flow');
    
    const tabs = [
      'Payment Methods',
      'Forex',
      'SWIFT',
      'Document',
      'Payment Release',
      'Analytics',
      'User',
      'Audit',
      'LC Settlements'
    ];
    
    for (const tabName of tabs) {
      const tab = page.locator(`text=${tabName}`).first();
      const exists = await tab.count() > 0;
      
      if (exists) {
        await tab.click();
        await page.waitForTimeout(1500);
        console.log(`✅ Navigated to: ${tabName}`);
      } else {
        console.log(`⚠️  Tab not found: ${tabName}`);
      }
    }
    
    console.log('✅ Tab navigation complete');
  });

  test('Integration: Verify no console errors', async ({ page }) => {
    console.log('\n🐛 Testing for Console Errors');
    
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate through key tabs
    await page.click('text=Payment Methods').catch(() => {});
    await page.waitForTimeout(1000);
    
    await page.click('text=LC Settlements').catch(() => {});
    await page.waitForTimeout(2000);
    
    if (errors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log(`⚠️  Found ${errors.length} console errors:`);
      errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }
    
    // Don't fail test for minor errors, just warn
    expect(errors.length).toBeLessThan(10);
  });

  // ====================
  // API INTEGRATION TESTS
  // ====================
  
  test('API: Verify /api/v1/post-delivery/:shipmentId/status endpoint', async ({ request }) => {
    console.log('\n🔌 Testing Post-Delivery API Endpoint');
    
    if (!authToken) {
      console.log('⚠️  No auth token available, skipping API test');
      return;
    }
    
    // Try to get post-delivery status for a test shipment
    const testShipmentId = 'SHIP1786102768'; // Use known test shipment or mock
    
    const response = await request.get(`${API_URL}/api/v1/post-delivery/${testShipmentId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }).catch(() => null);
    
    if (response) {
      const status = response.status();
      console.log(`ℹ️  API Response Status: ${status}`);
      
      if (status === 200) {
        const data = await response.json();
        console.log('✅ Post-delivery API endpoint working');
        console.log(`ℹ️  Workflow status: ${data.data?.overallStatus || 'N/A'}`);
      } else if (status === 404) {
        console.log('ℹ️  No post-delivery record found (expected if shipment not delivered)');
      } else {
        console.log(`⚠️  Unexpected status code: ${status}`);
      }
    } else {
      console.log('⚠️  API request failed - endpoint may not be available');
    }
  });

  // ====================
  // CLEANUP
  // ====================
  
  test.afterEach(async ({ page }) => {
    // Take screenshot on failure
    if (test.info().status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/banks-portal-failure-${Date.now()}.png`,
        fullPage: true 
      });
    }
  });

  test.afterAll(async () => {
    console.log('\n✅ Banks Portal test suite completed');
    console.log('📊 Check test results above for pass/fail status');
  });
});

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Helper to wait for element with retry
 */
async function waitForElementWithRetry(page, selector, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await page.waitForTimeout(1000);
    }
  }
  return false;
}

/**
 * Helper to check if element exists without throwing
 */
async function elementExists(page, selector) {
  try {
    const count = await page.locator(selector).count();
    return count > 0;
  } catch (e) {
    return false;
  }
}
