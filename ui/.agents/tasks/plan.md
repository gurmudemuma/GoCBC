# Implementation Plan
## GoCBC UI – 6-Task Fix & Enhancement Pass

**Project**: `c:\Users\HannaShiferaw\Desktop\CBE_CE\GoCBC\ui`  
**Build**: `npm run build` / `npm run type-check`  
**Dev lint**: `npm run lint`  
**Test**: `npm test`  
**Palette**: purple `#9b30b7`, gold `#FFD700`  

---

- [ ] 1. **login.tsx — Remove feature cards and stats banner**

  **What to do:**  
  Remove the `features` array (lines 91–111), the `<Grid container>` that renders the three feature cards (lines 262–304), and the purple gradient `<Paper>` stats banner (lines 306–358). Also remove the now-unused imports: `Shield`, `Verified`, `TrendingUp`, `Zoom`. Keep everything else: logo block, headline typography, description paragraph, and the entire right-hand login form.

  **Exact removal ranges in `login.tsx`:**  
  - Lines 91–111: `const features = [...]` array declaration  
  - Lines 29–31: `Zoom` import from `@mui/material` (only if unused after removal — check first), and icon imports `Shield`, `Verified`, `TrendingUp` from `@mui/icons-material` (lines 26–31)  
  - Lines 262–304: The `<Grid container spacing=...> {features.map(...)} </Grid>` block  
  - Lines 306–358: The `<Paper elevation={0} sx={{ background: 'linear-gradient(135deg, #9b30b7...'>` stats block  

  **Files**: `src/pages/login.tsx`  
  **Verify**: `npm run type-check` — no TypeScript errors. Visually: left panel shows only logo, headline, and description.

---

- [ ] 2. **ECTAPortal.tsx — Redesign the Application Details Dialog**

  **Context**: Details dialog is at lines 3152–3301. It currently uses a flat `<Grid container>` with raw Typography labels, `DocumentManagementPanel`, and `BlockchainSignatureVerification`. Replace the entire `<DialogContent>` interior while keeping the `<Dialog open={...}>` wrapper and `<DialogActions>` with the existing three buttons (Close, Reject, Approve).

  **What to do:**  
  Replace the `<DialogContent>` body (lines 3158–3289) with a two-column card layout using four colored `<Paper>` section cards. Each card has a bold colored section header bar and a `<Grid container>` of label/value pairs inside.

  **Section cards:**

  1. **Company Info** (color `#9b30b7`): Application ID, Company Name, TIN Number, Business License, Registration Date, Exporter Type, Capital (formatted as ETB), Region, City, Address  
  2. **Requirements** (color `#2e7d32`): Professional Taster, Taster Certificate, Laboratory Facility, Lab Certificate Number  
  3. **Contact** (color `#1565c0`): Contact Person, Email, Phone, Bank Name, Branch, Account Number  
  4. **Documents** (color `#00838f`): Fetch docs from `/documents/entity/EXPORTER_APPLICATION/{application_id}` (same logic already in `handleViewApplicationDetails`). Map `document_type` to a human-friendly label:
     - `TINDOC` / `tinDoc` / file name containing "tin" → "TIN Certificate"
     - `BUSINESSLICENSEDOC` / "license" → "Business License"
     - `BANKSTATEMENTDOC` / "bank" → "Bank Statement"
     - `TASTERCERTDOC` / "taster" → "Taster Proficiency Certificate"
     - `LABCERTDOC` / "lab" → "Lab Certificate"
     - `HISTORYDOC` / "history" → "Company History/References"
     - fallback: use the raw filename

     Each doc row: colored `<InsertDriveFile>` icon, label (bold), filename, size chip, and a blue "VIEW" `<Button>` that calls `window.open('http://localhost:3001' + doc.url, '_blank')`. If a doc is missing (not in fetched list), show a grey `<Chip label="Not uploaded" />`.

  **State needed**: The `validationData.documents` array is already populated by `handleViewApplicationDetails` (lines ~760–870). Re-use `validationData.documents` inside the dialog — no new state needed.

  **Remove** the `<DocumentManagementPanel>` and `<BlockchainSignatureVerification>` blocks from this dialog (they cause the 500 errors in the console). They live at lines ~3247–3280.

  **Keep `<DialogActions>` unchanged** (Close / Reject / Approve buttons at lines 3283–3301).

  **Files**: `src/components/portals/ECTAPortal.tsx`  
  **Imports to add**: `InsertDriveFile` from `@mui/icons-material` (may already be imported — verify first).  
  **Verify**: `npm run type-check` — no errors. In the browser, opening an application's details shows the four-section card layout with VIEW buttons.

---

- [ ] 3. **ECTAPortal.tsx — Add two confirmation dialogs**

  **Depends on**: Item 2 (dialog redesign must be done first so button onClick wiring is clear)

  **What to do (two sub-tasks):**

  ### 3a — Approve confirmation
  
  Add state at line ~215:
  ```tsx
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  ```

  In the details dialog's Approve `<AnimatedButton>` `onClick` (currently at line ~3293–3297), change it to:
  ```tsx
  onClick={() => setApproveConfirmOpen(true)}
  ```
  (Remove the `generateApprovalData()` call from here — it moves to confirm handler.)

  Add new `<Dialog>` before the existing `{/* Approve Application Dialog */}` block (before line 3304):
  - `open={approveConfirmOpen}`
  - Title: "Confirm Approval"
  - Body: `"Are you sure you want to approve {selectedApplication?.company_name}? This will register them as a licensed exporter and send login credentials to their email."`
  - Actions: "Cancel" (outlined grey, closes `approveConfirmOpen`) + "Yes, Approve" (contained green `#4caf50`)
  - "Yes, Approve" onClick: `() => { setApproveConfirmOpen(false); generateApprovalData(); setApproveDialogOpen(true); }`

  ### 3b — Reject confirmation (second confirm after reason entry)

  Add state:
  ```tsx
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  ```

  In the existing reject dialog's "Reject Application" `<AnimatedButton>` onClick (line ~3479), replace `onClick={handleRejectApplication}` with:
  ```tsx
  onClick={() => setRejectConfirmOpen(true)}
  ```

  Add new `<Dialog>` immediately after the closing `</Dialog>` of the reject dialog (after line ~3487):
  - `open={rejectConfirmOpen}`
  - Title: "⚠️ This Cannot Be Undone"
  - Body styled with orange/red warning background:  
    `"You are about to permanently reject {selectedApplication?.company_name}'s application. This action cannot be undone. The exporter will be notified with the rejection reason and may reapply."`
  - A red `<Alert severity="error">` inside: "Once rejected, this decision is final."
  - Actions: "Go Back" (outlined, `() => setRejectConfirmOpen(false)`) + "Yes, Reject Permanently" (red contained `#f44336`, startIcon `<WarningAmber />`), calls `handleRejectApplication` on click after closing `rejectConfirmOpen`
  - In `handleRejectApplication`, after the API call succeeds, also call `setRejectConfirmOpen(false)`.

  **New import needed**: `WarningAmber` from `@mui/icons-material`

  **Files**: `src/components/portals/ECTAPortal.tsx`  
  **Verify**: `npm run type-check` — no errors. Clicking Approve shows confirm → then opens approval form. Clicking Reject Application after typing reason shows irreversibility warning.

---

- [ ] 4. **NEW FILE — ExporterProfilePage**

  **What to do:**  
  Create a new page at `src/pages/portals/exporter-profile.tsx`. This is a Next.js page — follow the same pattern as `src/pages/portals/exporter.tsx` (which wraps a portal component in `ProtectedRoute`).

  **Page structure** (all in one file, no separate component file needed):

  ```
  ProtectedRoute allowedRoles={['EXPORTER']}
    └── ExporterProfilePage
          ├── Hero card: company name, exporter ID, license number, license status chip
          ├── Section: Company Information
          ├── Section: ECTA Certification
          ├── Section: Contact Details
          ├── Section: License Info
          └── Section: Application History timeline
  ```

  **Data fetching:**
  - `useEffect` on mount: `GET /api/v1/exporters/:exporterId` where `exporterId = user?.id` (the user object from `useAuth()` has `id` = exporterId after approval)
  - `GET /api/v1/exporters/exporter-applications?email=${user?.email}` for application history
  - Handle loading and error states with `CircularProgress` and `Alert`

  **Hero card** (purple gradient background `linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)`):
  - Company name as `h4` white
  - Exporter ID as caption
  - License number
  - Status chip: ACTIVE=`#4caf50`, EXPIRED=`#f44336`, SUSPENDED=`#ff9800`

  **Section layout** (follow `register-exporter.tsx` `SectionHeader` pattern — inline that component or copy its JSX):
  - Each section: colored border-left Paper with colored header row showing an icon + section title
  - Colors: Company Info=`#9b30b7`, ECTA Cert=`#2e7d32`, Contact=`#1565c0`, License=`#00838f`, History=`#e65100`

  **Application History** — render as vertical timeline using MUI `<Stepper orientation="vertical">` or a simple list of `<Paper>` cards per application, each showing:
  - Date (`submitted_at` formatted)
  - Status chip (pending=grey, approved=green, rejected=red)
  - Rejection reason `<Alert severity="error">` if status is rejected

  **Imports**: `useAuth` from `@/contexts/AuthContext`, `api` from `@/utils/api`, standard MUI components. Use `alpha` from `@mui/material/styles`.

  **Navigation**: Add a "← Back to Portal" button that calls `router.push('/portals/exporter')`.

  **Files**: `src/pages/portals/exporter-profile.tsx` (create new)  
  **Verify**: `npm run type-check` — no errors. `npm run build` succeeds including the new page.

---

- [ ] 5. **resubmit-application.tsx — Full redesign and improvements**

  **What to do** (5 sub-items, all in this one task):

  ### 5a — Rejection reason banner
  The current page fetches via `/exporters/exporter-applications/check/${user?.email}` and already sets `application.rejection_reason`. The banner already exists as an `<Alert severity="warning">` at around line 250. **Improve** it: replace the plain Alert with a prominent styled `<Paper>` banner matching the register-exporter purple/gold palette:
  ```
  background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%)
  color: white, padding: 3, borderRadius: 2
  ```
  Show `<ErrorOutline fontSize="large">`, bold "Application Rejected" heading, and the rejection reason text. If `rejection_reason` is null/empty, show "No specific reason was provided — please contact ECTA."

  ### 5b — Document upload fields
  The current form has no document upload. Add file upload adornments (use the same `UploadAdornment` component pattern from `register-exporter.tsx`) to these fields:
  - TIN Number field — `tinDoc`
  - Business License Number field — `businessLicenseDoc`
  - Capital Requirement field — `bankStatementDoc`
  - Taster Certificate field — `tasterCertDoc`
  - Laboratory Facility field — `labCertDoc`
  - Add a standalone optional history upload below the Professional Requirements section (same `HistoryUpload` dashed-box pattern)

  Add `docFiles` state: `useState<Record<string, File | null>>({tinDoc: null, businessLicenseDoc: null, bankStatementDoc: null, tasterCertDoc: null, labCertDoc: null, historyDoc: null})`

  ### 5c — Design overhaul
  Replace the current `background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'` with the register-exporter palette: `'linear-gradient(135deg, #f5f5f5 0%, #ede7f6 100%)'`. Use the same `SectionHeader` component pattern (copy the JSX inline or import if extracted). Replace the plain blue section header colors (`#667eea`) with the project palette colors. Add the `BgBlobs` decorative elements. Make the overall card/Paper styling match `register-exporter.tsx` (white background, borderRadius 2.5, `boxShadow: '0 20px 60px rgba(0,0,0,0.12)'`).

  ### 5d — Submit endpoint
  The current form POSTs to `/exporters/exporter-applications/${application.application_id}/resubmit`. Per the task brief, change it to POST `/exporters/exporter-applications`. Before the POST, upload documents via `fetch('http://localhost:3001/api/v1/documents/upload-registration', ...)` for each non-null file in `docFiles` (same pattern as `register-exporter.tsx` lines 293–302). Pass `entityType: 'EXPORTER_APPLICATION'` and the returned `applicationId`.

  ### 5e — Success screen and redirect
  The current success screen redirects by calling `logout()` after 3 seconds. Per the task brief: show a confirmation card (same white paper + purple/gold success screen as register-exporter) then redirect to `/login` (not logout — just `router.push('/login')`). Remove the auto-logout timer. Show a checkmark, "Application Resubmitted Successfully!" heading, and a note that the user will receive email confirmation.

  **Files**: `src/pages/resubmit-application.tsx`  
  **Verify**: `npm run type-check` — no errors.

---

- [ ] 6. **AuthContext.tsx — Tighten the rejected-user redirect**

  **Current state** (verified by reading the file):  
  Line ~105–109:
  ```tsx
  if (userData.status === 'rejected') {
    console.log('User has rejected status, redirecting to resubmission page');
    router.push('/resubmit-application');
    return;
  }
  ```
  This fires for **any role** with `status === 'rejected'`. The brief asks to make it role-specific so only `EXPORTER` users are redirected to resubmit.

  Also at lines ~89–96, the global `useEffect` guard:
  ```tsx
  if (!loading && user && user.status === 'rejected') {
    ...
    router.replace('/resubmit-application');
  }
  ```
  This is also role-agnostic.

  **What to do:**  
  1. In the `login` function (~line 105), change the condition to:
     ```tsx
     if (userData.role === 'EXPORTER' && userData.status === 'rejected') {
     ```
  2. In the global `useEffect` guard (~line 89), change:
     ```tsx
     if (!loading && user && user.status === 'rejected') {
     ```
     to:
     ```tsx
     if (!loading && user && user.role === 'EXPORTER' && user.status === 'rejected') {
     ```

  No other changes needed — the redirect target `/resubmit-application` is correct, placement is correct (after `setUser(userData)` and before the portal routing), and the inactive exporter guard is already role-specific.

  **Files**: `src/contexts/AuthContext.tsx`  
  **Verify**: `npm run type-check` — no errors. Existing tests: `npm test` — all pass.

---

## Execution Order

Tasks 1, 4, and 6 are fully independent and can be done in any order.  
Task 2 must come before Task 3 (the confirm dialogs depend on knowing the dialog button locations after redesign).  
Task 5 is independent of all others.

Recommended sequence: **6 → 1 → 2 → 3 → 4 → 5**  
Rationale: Start with the smallest, safest changes (auth fix, login cleanup), then do the ECTA portal in two passes (redesign then confirm dialogs), then the new file, then the biggest rewrite.

## Caveats

1. **ECTAPortal.tsx is 4196 lines.** The details dialog JSX lives at lines **3152–3302**. The approve dialog at **3304–3451**. The reject dialog at **3453–3487**. Be surgical — do not touch lines outside these ranges unless adding the new confirm dialogs.

2. **BlockchainSignatureVerification 500 errors**: These come from the existing `<BlockchainSignatureVerification>` inside the details dialog. Removing it in Task 2 resolves those console errors.

3. **Document URL construction**: The fetched docs have `url: '/api/v1/documents/{id}/download'`. The VIEW button must open `'http://localhost:3001' + doc.url` — do not use the `viewDocument` helper as it may strip the base URL.

4. **resubmit-application.tsx contact fields are currently `disabled`**: The task brief says to pre-fill ALL fields. Keep the read-only fields disabled (Contact, Email, Phone, City, Address, Region, Bank) but make the core fields (Company Name, TIN, Business License, Capital, Taster Certificate, Lab Facility) fully editable with upload adornments.

5. **ExporterProfilePage exporter ID**: After approval, `user.id` in `AuthContext` contains the exporter's system `id` (database row id), not the `exporterId` (e.g. `EXP2026001`). Fetch the exporter data from `/exporters/:id` and use the `exporter_id` field from the response for display.

6. **Unused imports after Task 1**: After removing `features.map`, the imports `Shield`, `Verified`, `TrendingUp` become unused. Remove them. `Zoom` is still used for the login form card so keep it.
