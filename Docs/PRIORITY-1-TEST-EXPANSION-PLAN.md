# Priority 1 Test Expansion Plan

**Date:** 2026-11-10  
**Current Tests:** 44 (100% pass rate)  
**Target:** Add 70 Priority 1 tests → Total 114 tests  
**Timeline:** 2 weeks

---

## 🎯 Objective

Expand test coverage to include critical business workflows that are currently untested but essential for production readiness.

---

## 📋 Priority 1 Test Categories (70 tests)

### 1. Banking Extended Workflows (14 tests)

**File:** `tests/banking-extended-workflow-test.sh`

#### LC Amendments & Modifications
- [ ] **Test 45:** Request LC amendment (amount increase)
- [ ] **Test 46:** Request LC amendment (expiry extension)
- [ ] **Test 47:** Request LC amendment (document changes)
- [ ] **Test 48:** Approve LC amendment
- [ ] **Test 49:** Reject LC amendment

#### LC Discrepancies
- [ ] **Test 50:** Report LC document discrepancy
- [ ] **Test 51:** Accept discrepancy with waiver
- [ ] **Test 52:** Reject documents due to discrepancy

#### Advanced LC Operations
- [ ] **Test 53:** Transfer LC to second beneficiary
- [ ] **Test 54:** Issue standby LC
- [ ] **Test 55:** Process deferred payment
- [ ] **Test 56:** Handle acceptance financing

#### Payment Operations
- [ ] **Test 57:** Process payment at sight
- [ ] **Test 58:** Apply forex rate at payment

---

### 2. NBE Extended Workflows (13 tests)

**File:** `tests/nbe-extended-workflow-test.sh`

#### Forex Management
- [ ] **Test 59:** Reject forex allocation request
- [ ] **Test 60:** Adjust forex allocation amount
- [ ] **Test 61:** Monitor LC vs forex allocation
- [ ] **Test 62:** Track multiple LC forex linkage

#### Export Proceeds Retention
- [ ] **Test 63:** Calculate retention percentage (30%)
- [ ] **Test 64:** Create retention account
- [ ] **Test 65:** Track retained vs surrendered amounts
- [ ] **Test 66:** Apply retention policy

#### Repatriation Compliance
- [ ] **Test 67:** Monitor repatriation deadline (180 days)
- [ ] **Test 68:** Flag overdue repatriation
- [ ] **Test 69:** Calculate repatriation penalties
- [ ] **Test 70:** Process repatriation waiver request
- [ ] **Test 71:** Verify full repatriation compliance

---

### 3. Shipping Complete Workflows (20 tests)

**File:** `tests/shipping-complete-workflow-test.sh`

#### Bill of Lading Operations
- [ ] **Test 72:** Issue negotiable Bill of Lading
- [ ] **Test 73:** Issue non-negotiable Bill of Lading
- [ ] **Test 74:** Issue Sea Waybill
- [ ] **Test 75:** Issue Master B/L for consolidation
- [ ] **Test 76:** Issue House B/L for freight forwarder

#### Booking Management
- [ ] **Test 77:** Amend shipping booking
- [ ] **Test 78:** Cancel shipping booking
- [ ] **Test 79:** Allocate containers (20ft, 40ft)
- [ ] **Test 80:** Record container stuffing

#### Cargo Operations
- [ ] **Test 81:** Handle FCL (Full Container Load)
- [ ] **Test 82:** Handle LCL (Less than Container Load)
- [ ] **Test 83:** Handle reefer container (temperature controlled)
- [ ] **Test 84:** Handle dangerous goods (IMDG)

#### Port Operations
- [ ] **Test 85:** Record vessel arrival at POL
- [ ] **Test 86:** Record cargo loading
- [ ] **Test 87:** Record vessel departure
- [ ] **Test 88:** Handle transhipment
- [ ] **Test 89:** Record arrival at POD
- [ ] **Test 90:** Process cargo discharge

#### Charges
- [ ] **Test 91:** Calculate freight charges

---

### 4. Customs Extended Workflows (12 tests)

**File:** `tests/customs-extended-workflow-test.sh`

#### Declaration Management
- [ ] **Test 92:** Amend customs declaration
- [ ] **Test 93:** Cancel customs declaration
- [ ] **Test 94:** Re-submit rejected declaration

#### Duty & Valuation
- [ ] **Test 95:** Calculate customs duty
- [ ] **Test 96:** Apply tariff classification (HS Code)
- [ ] **Test 97:** Perform customs valuation
- [ ] **Test 98:** Record duty payment

#### Inspection & Clearance
- [ ] **Test 99:** Fail customs inspection with reasons
- [ ] **Test 100:** Request re-inspection
- [ ] **Test 101:** Reject clearance with appeal option
- [ ] **Test 102:** Process customs warehouse storage
- [ ] **Test 103:** Verify origin documentation

---

### 5. User & Access Management (11 tests)

**File:** `tests/user-management-workflow-test.sh`

#### User Lifecycle
- [ ] **Test 104:** Register new user (self-registration)
- [ ] **Test 105:** Admin creates user account
- [ ] **Test 106:** Update user profile
- [ ] **Test 107:** Change password
- [ ] **Test 108:** Reset forgotten password
- [ ] **Test 109:** Suspend user account
- [ ] **Test 110:** Reactivate suspended user

#### Security & Access
- [ ] **Test 111:** Enable two-factor authentication
- [ ] **Test 112:** Verify RBAC permissions (ECTA role)
- [ ] **Test 113:** Verify RBAC permissions (Bank role)
- [ ] **Test 114:** Test unauthorized access attempt

---

## 🔧 Implementation Details

### Test File Structure

```bash
tests/
├── complete-end-to-end-workflow-test.sh (existing - 44 tests)
├── banking-extended-workflow-test.sh (new - 14 tests)
├── nbe-extended-workflow-test.sh (new - 13 tests)
├── shipping-complete-workflow-test.sh (new - 20 tests)
├── customs-extended-workflow-test.sh (new - 12 tests)
└── user-management-workflow-test.sh (new - 11 tests)
```

### Shared Test Utilities

Create `/tests/lib/test-helpers.sh`:
```bash
# Common functions
- login_user()
- api_call()
- assert_success()
- assert_failure()
- assert_status_code()
- assert_field_value()
- log_test()
- log_pass()
- log_fail()
```

### Test Data Management

Create `/tests/data/`:
```bash
tests/data/
├── users.json
├── contracts.json
├── shipments.json
├── lc_templates.json
└── forex_scenarios.json
```

---

## 📊 Expected Outcomes

### Coverage Improvement
| Category | Before | After | Improvement |
|----------|--------|-------|-------------|
| Banking | 15% | 85% | +70% |
| NBE | 20% | 90% | +70% |
| Shipping | 10% | 95% | +85% |
| Customs | 30% | 80% | +50% |
| User Mgmt | 5% | 75% | +70% |
| **Overall** | **17.7%** | **45.9%** | **+28.2%** |

### Quality Metrics
- **Total Tests:** 44 → 114 (+70)
- **Portal Coverage:** 5/10 → 9/10 portals
- **Workflow Coverage:** 40% → 75%
- **Critical Paths:** 60% → 95%

---

## 🎯 Success Criteria

### Functional Requirements
- [ ] All 70 new tests pass on first run
- [ ] No regression in existing 44 tests
- [ ] All tests complete in < 15 minutes
- [ ] Tests are idempotent (can run multiple times)

### Quality Requirements
- [ ] Each test has clear pass/fail criteria
- [ ] Each test logs detailed output
- [ ] Failed tests provide actionable error messages
- [ ] Tests clean up their data

### Documentation Requirements
- [ ] Each test file has header documentation
- [ ] Test README explains how to run tests
- [ ] Known limitations are documented
- [ ] Test data requirements are documented

---

## 📅 Implementation Timeline

### Week 1: Banking & NBE (27 tests)
**Days 1-2:** Banking Extended (14 tests)
- LC amendments, discrepancies, transfers
- Standby LC, deferred payment
- Payment processing

**Days 3-4:** NBE Extended (13 tests)
- Forex management and rejection
- Retention calculation and accounts
- Repatriation compliance and penalties

**Day 5:** Integration testing and bug fixes

### Week 2: Shipping, Customs, Users (43 tests)
**Days 1-3:** Shipping Complete (20 tests)
- Bill of Lading variations
- Booking management
- Cargo and port operations
- Freight calculations

**Day 4:** Customs Extended (12 tests)
- Declaration amendments
- Duty calculation and valuation
- Inspection failures and appeals

**Day 5:** User Management (11 tests)
- User lifecycle
- Security and RBAC

---

## 🚀 Getting Started

### Step 1: Set Up Test Infrastructure
```bash
# Create test directory structure
mkdir -p tests/lib tests/data tests/results

# Create helper library
vim tests/lib/test-helpers.sh

# Create test data files
vim tests/data/users.json
```

### Step 2: Create First Test File
```bash
# Start with banking extended
vim tests/banking-extended-workflow-test.sh

# Make it executable
chmod +x tests/banking-extended-workflow-test.sh

# Run test
./tests/banking-extended-workflow-test.sh
```

### Step 3: Iterate and Expand
- Write 2-3 tests per day
- Test each scenario thoroughly
- Document any issues found
- Fix bugs as you go

---

## 📝 Next Steps

1. **Review & Prioritize:** Confirm these are the right tests for your business
2. **Allocate Resources:** Assign developers/testers
3. **Create Branch:** `feature/priority-1-test-expansion`
4. **Implement Tests:** Follow timeline above
5. **Review Results:** Analyze coverage and quality
6. **Plan Priority 2:** Move to next 42 tests

---

## 🔗 Related Documents

- **Gap Analysis:** `TEST-COVERAGE-GAP-ANALYSIS.md`
- **Current Tests:** `tests/complete-end-to-end-workflow-test.sh`
- **API Documentation:** `API-DOCUMENTATION.md`

---

**Status:** Ready for Implementation  
**Priority:** High  
**Estimated Effort:** 80 developer-hours (2 weeks)  
**Expected ROI:** Prevent 60-70% of production bugs
