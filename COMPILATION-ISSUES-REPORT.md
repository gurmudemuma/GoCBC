# Compilation Issues Report

## Status: Partially Fixed ✅❌

### ✅ Fixed Issues

1. **JSX in TypeScript File** - RESOLVED
   - **File:** `ui/src/styles/exporterPortalStyles.ts`
   - **Problem:** JSX syntax (`<defs>`, `<linearGradient>`) was used in a `.ts` file
   - **Solution:** Converted JSX to configuration object with gradient parameters
   - **Status:** ✅ FIXED

### ❌ Remaining Issues (61 TypeScript Errors)

#### 1. Import Statement Errors (12 errors)
**Files affected:**
- `src/components/portals/banks/utils/dataLoader.ts`
- `src/components/portals/customs/utils/dataLoader.ts`
- `src/components/portals/exporter/utils/dataLoader.ts`
- `src/components/portals/nbe/utils/dataLoader.ts`
- `src/components/portals/shipping/utils/dataLoader.ts`
- All corresponding `tabConfig.tsx` files

**Problem:**
```typescript
import { apiFetch } from '../../../../utils/api';  // Wrong - named import
import { TabConfig } from '../../shared/StandardPortalLayout';  // Wrong - named import
```

**Solution needed:**
```typescript
import apiFetch from '../../../../utils/api';  // Default import
import TabConfig from '../../shared/StandardPortalLayout';  // Default import
```

#### 2. MUI DataGrid Deprecated Props (5 errors)
**Files affected:**
- `src/components/exporter/ModernDataGrid.tsx`
- `src/components/inspection/InspectionRequestsTab.tsx`
- `src/components/lcdiscrepancy/LCDiscrepancyTab.tsx`
- `src/components/repatriation/RepatriationManagementTab.tsx`

**Problem:** Using deprecated pagination props
```typescript
<DataGrid
  page={page}                    // ❌ Deprecated
  pageSize={pageSize}            // ❌ Deprecated
  onPageChange={setPage}         // ❌ Deprecated
  onPageSizeChange={setPageSize} // ❌ Deprecated
/>
```

**Solution needed:** Use pagination model
```typescript
<DataGrid
  paginationModel={{ page, pageSize }}
  onPaginationModelChange={(model) => {
    setPage(model.page);
    setPageSize(model.pageSize);
  }}
/>
```

#### 3. Function Argument Mismatch (23 errors)
**Files affected:**
- `src/components/inspection/InspectionSchedulingDialog.tsx`
- `src/components/lcdiscrepancy/DiscrepancyReportingDialog.tsx`
- `src/components/lcdiscrepancy/DiscrepancyResolutionDialog.tsx`
- `src/components/lcdiscrepancy/LCDiscrepancyTab.tsx`
- `src/components/repatriation/RepatriationCompliancePanel.tsx`
- `src/components/repatriation/RepatriationInitiationDialog.tsx`
- `src/components/repatriation/RepatriationManagementTab.tsx`

**Problem:** Functions expecting 2-3 arguments but receiving only 1

**Investigation needed:** Check the function signatures to understand what parameters are missing

#### 4. BlockchainStatusIcon Props Error (6 errors)
**Files affected:**
- `src/components/lcdiscrepancy/DiscrepancyDetailsDialog.tsx`
- `src/components/lcdiscrepancy/LCDiscrepancyTab.tsx`
- `src/components/portals/shared/StandardPortalLayout.tsx`
- `src/components/repatriation/RepatriationDetailsDialog.tsx`
- `src/components/repatriation/RepatriationManagementTab.tsx`

**Problem:**
```typescript
<BlockchainStatusIcon verified={true} />  // ❌ Wrong prop name
```

**Solution needed:** Check the actual prop interface for `BlockchainStatusIcon`

#### 5. Antd Alert Component Error (1 error)
**File:** `src/components/nbe/SWIFTMonitoring.tsx:495`

**Problem:**
```typescript
<Alert message="..." description="..." type="..." showIcon />
```

**Solution needed:** Check if this is using Antd Alert (which uses `message`) vs MUI Alert (which uses `severity`)

#### 6. Missing Properties/Functions (3 errors)
- `BanksPortal.tsx:973,6089` - Property 'message' does not exist
- `BanksPortal.tsx:6077` - 'new' expression without construct signature
- `BanksPortal.tsx:6868` - Cannot find name 'fetchForexAllocations'

#### 7. Type Definition Mismatches (3 errors)
- `NBEPortal.tsx:1104` - Missing 'transportMode' property on SalesContract
- `RepatriationManagementTab.tsx:559` - Repatriation type mismatch with 'daysOverdue'
- `StandardPortalLayout.tsx:253,286` - Tab component icon prop type issues

## Recommendations

### Priority 1: Quick Fixes (Can be automated)
1. Fix all import statements (12 errors)
2. Update MUI DataGrid pagination props (5 errors)

### Priority 2: Requires Investigation
1. Function signature mismatches - need to check API changes
2. BlockchainStatusIcon interface - need to check component definition
3. Type definition issues - need to update interfaces

### Priority 3: Major Refactoring
1. BanksPortal.tsx issues - requires code review
2. Tab component icon type issues - may need MUI version check

## Next Steps

1. **Run type check regularly:**
   ```bash
   cd /home/guda/GoCBC/ui && npx tsc --noEmit
   ```

2. **Fix imports first** (easiest wins)
3. **Update DataGrid usage** (API breaking changes)
4. **Review component interfaces** for BlockchainStatusIcon and other custom components
5. **Consider updating dependencies** if MUI version is outdated

## Notes

- Next.js build may still succeed despite TypeScript errors if type checking is skipped
- For production deployment, all TypeScript errors should be resolved
- The API (Express/TypeScript) compiles successfully with no errors ✅
