# 🎨 UI Integration Guide - User Management

**Status**: Backend 100% Complete | Frontend Needs Integration  
**Priority**: Medium (System works via API, UI enhancement needed)

---

## Current Status

### ✅ What Works Now (via API)
- Admins can manage all users via REST API
- All cryptographic features functional
- Digital signatures working
- Certificate management operational

### ⚠️ What Needs UI Updates
- Display blockchain identity information
- Show certificate status & expiry
- Manage permissions visually
- View activity logs
- Certificate renewal UI
- Identity revocation UI

---

## Quick Integration Steps

### Step 1: Add Blockchain Identity Tab to User Details Dialog

Update `ui/src/components/admin/UserManagement.tsx`:

```typescript
import BlockchainIdentityPanel from './BlockchainIdentityPanel';

// In the User Details Dialog, add a new tab:
<Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="lg">
  <DialogTitle>User Details</DialogTitle>
  <DialogContent>
    <Tabs>
      <Tab label="Profile" />
      <Tab label="Blockchain Identity" />  {/* NEW */}
      <Tab label="Activity Log" />  {/* NEW */}
    </Tabs>
    
    <TabPanel value={0}>
      {/* Existing user profile info */}
    </TabPanel>
    
    <TabPanel value={1}>
      {/* NEW: Blockchain Identity */}
      {selectedUser && (
        <BlockchainIdentityPanel
          userId={selectedUser.id}
          username={selectedUser.username}
          role={selectedUser.role}
          organization={selectedUser.organization}
        />
      )}
    </TabPanel>
    
    <TabPanel value={2}>
      {/* NEW: Activity Log */}
      <ActivityLogPanel userId={selectedUser?.id} />
    </TabPanel>
  </DialogContent>
</Dialog>
```

### Step 2: Add Certificate Status Indicator to User List

Add a column in the DataGrid:

```typescript
{
  field: 'blockchain_status',
  headerName: 'Identity',
  width: 120,
  renderCell: (params) => (
    <BlockchainStatusChip userId={params.row.id} />
  ),
}
```

### Step 3: Add Permission Management Dialog

Create `PermissionManagementDialog.tsx`:

```typescript
const availablePermissions = {
  user: ['user.create', 'user.read', 'user.update', 'user.delete'],
  contract: ['contract.create', 'contract.view', 'contract.update'],
  shipment: ['shipment.create', 'shipment.view', 'shipment.update'],
  payment: ['payment.view', 'payment.process'],
  document: ['document.upload', 'document.view'],
  audit: ['audit.view'],
  // ... more permissions
};

// Display checkboxes grouped by category
<FormGroup>
  <FormControlLabel
    control={<Checkbox checked={hasPermission('user.create')} />}
    label="Create Users"
  />
  {/* ... more checkboxes */}
</FormGroup>
```

---

## Files Created

### ✅ New Components

1. **`BlockchainIdentityPanel.tsx`** - Display & manage blockchain identity
   - Shows MSP ID, enrollment ID, certificate hash
   - Certificate expiry warning
   - Enroll button (if not enrolled)
   - Renew certificate button
   - Revoke identity button
   - Status indicator (active/suspended/revoked)

### 📋 Components Needed (Not Yet Created)

2. **`ActivityLogPanel.tsx`** - View user activity history
3. **`PermissionManagementDialog.tsx`** - Manage user permissions
4. **`BlockchainStatusChip.tsx`** - Small status indicator for grid
5. **`ExpiringCertificatesWidget.tsx`** - Dashboard widget for expiring certs

---

## Minimal Integration (Quick Win)

If you want to get something working quickly, just add this to the existing User Details dialog:

```typescript
// In UserManagement.tsx, inside User Details Dialog:

<Box mt={3}>
  <Typography variant="h6" gutterBottom>Blockchain Identity</Typography>
  <BlockchainIdentityPanel
    userId={selectedUser.id}
    username={selectedUser.username}
    role={selectedUser.role}
    organization={selectedUser.organization}
  />
</Box>
```

That's it! Now admins can:
- See if a user has a blockchain identity
- Enroll users who don't have one
- View certificate details
- Renew certificates
- Revoke identities

---

## Full Integration (Complete)

For a complete admin experience, you'll need:

### 1. Enhanced User Details Dialog

```typescript
<Dialog maxWidth="lg" fullWidth>
  <Tabs>
    <Tab label="Profile" />
    <Tab label="Blockchain Identity" />
    <Tab label="Permissions" />
    <Tab label="Activity Log" />
  </Tabs>
  
  {/* Profile Tab */}
  <TabPanel value={0}>
    <UserProfileView user={selectedUser} />
  </TabPanel>
  
  {/* Blockchain Identity Tab */}
  <TabPanel value={1}>
    <BlockchainIdentityPanel {...selectedUser} />
  </TabPanel>
  
  {/* Permissions Tab */}
  <TabPanel value={2}>
    <PermissionManagementDialog user={selectedUser} />
  </TabPanel>
  
  {/* Activity Log Tab */}
  <TabPanel value={3}>
    <ActivityLogPanel userId={selectedUser.id} />
  </TabPanel>
</Dialog>
```

### 2. Dashboard Widgets

```typescript
<Grid container spacing={3}>
  <Grid item xs={12} md={4}>
    <ExpiringCertificatesWidget />
  </Grid>
  
  <Grid item xs={12} md={4}>
    <RecentActivityWidget />
  </Grid>
  
  <Grid item xs={12} md={4}>
    <UserStatisticsWidget />
  </Grid>
</Grid>
```

### 3. Enhanced User List Columns

```typescript
columns: [
  { field: 'username', headerName: 'Username' },
  { field: 'role', headerName: 'Role' },
  { field: 'organization', headerName: 'Organization' },
  { field: 'status', headerName: 'Status' },
  { 
    field: 'blockchain_status', 
    headerName: 'Identity',
    renderCell: (params) => <BlockchainStatusChip userId={params.row.id} />
  },
  { 
    field: 'certificate_expiry', 
    headerName: 'Cert Expiry',
    renderCell: (params) => <CertExpiryChip userId={params.row.id} />
  },
  { field: 'actions', headerName: 'Actions', renderCell: (params) => <ActionsMenu /> }
]
```

---

## API Calls Reference

All these API endpoints are already implemented and working:

```typescript
// Get blockchain identity
GET /api/v1/crypto-users/:userId/identity

// Enroll user
POST /api/v1/crypto-users/enroll
Body: { userId, username, role, organization }

// Revoke identity
POST /api/v1/crypto-users/:userId/revoke
Body: { reason }

// Renew certificate
POST /api/v1/crypto-users/:userId/renew-certificate
Body: { validityDays: 365 }

// Get expiring certificates
GET /api/v1/crypto-users/expiring-certificates

// Get activity log
GET /api/v1/users/activity-log?userId=123&limit=10

// Update permissions
PUT /api/v1/users/:userId/permissions
Body: { permissions: [...], action: 'set'|'grant'|'revoke' }
```

---

## Testing the UI Integration

### Step 1: Import the Component

```bash
# Copy BlockchainIdentityPanel.tsx to your UI project
cp BlockchainIdentityPanel.tsx ui/src/components/admin/
```

### Step 2: Update UserManagement.tsx

Just add one import and one component:

```typescript
import BlockchainIdentityPanel from './BlockchainIdentityPanel';

// Inside User Details Dialog, add:
<BlockchainIdentityPanel
  userId={selectedUser.id}
  username={selectedUser.username}
  role={selectedUser.role}
  organization={selectedUser.organization}
/>
```

### Step 3: Test

1. Open admin portal
2. Navigate to User Management
3. Click on a user's "View Details" button
4. You should see the blockchain identity panel
5. If user not enrolled, click "Enroll Blockchain Identity"
6. View certificate details, expiry date, MSP ID

---

## Current Workaround (Until UI Updated)

Admins can manage everything via:

### 1. Swagger API Docs
```
http://localhost:3001/api-docs
```
- Interactive API testing
- All endpoints documented
- Try it out directly

### 2. Manual API Calls (cURL/Postman)
```bash
# Get admin token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | jq -r '.data.token')

# List users
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $TOKEN"

# Enroll user
curl -X POST http://localhost:3001/api/v1/crypto-users/enroll \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 7, "username": "EXP1087072", "role": "EXPORTER", "organization": "Test Coffee"}'
```

### 3. Database Direct Access
```bash
# Connect to database
docker exec -it cecbs-postgres psql -U cecbs -d cecbs

# View users
SELECT id, username, role, status FROM users;

# View blockchain identities
SELECT user_id, username, msp_id, status, expires_at FROM blockchain_identities;

# View activity log
SELECT action, username, target_username, created_at FROM user_activity_log ORDER BY created_at DESC LIMIT 10;
```

---

## Priority Recommendation

### High Priority (Do Now)
✅ System works via API - Admins can use Swagger UI or cURL

### Medium Priority (This Week)
⚠️ Add BlockchainIdentityPanel to User Details dialog  
⚠️ Add certificate expiry indicators to user list

### Low Priority (Nice to Have)
⏳ Full permission management UI  
⏳ Activity log viewer with filters  
⏳ Dashboard widgets for monitoring

---

## Summary

**YES** - Admins can manage all users, BUT currently via:
- ✅ API endpoints (Swagger UI at `/api-docs`)
- ✅ cURL/Postman
- ✅ Database access

**For full UI experience**, integrate the `BlockchainIdentityPanel` component into the existing User Management dialog.

**Estimated integration time**: 2-4 hours for minimal, 1-2 days for complete.

---

## Next Steps

1. **Test via API first** (works now):
   ```bash
   node tests/test-user-management.js
   ```

2. **Then integrate UI** (copy `BlockchainIdentityPanel.tsx` to UI project)

3. **Test UI integration** (admins can manage users via browser)

The backend is 100% complete and production-ready. UI integration is enhancement, not blocker! 🚀
