// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Organisation + role configuration for the admin console.
//
// This module was missing from the repository (never committed), even
// though `src/components/admin/UserManagement.tsx` imports
// `getRolesByOrganization` and `ADMIN_CONFIG` from it — so the
// frontend could not compile. It is reconstructed from how that file
// uses it and from the API's 8 RBAC roles (see
// `api/src/middleware/auth.ts` ROLE_PERMISSIONS):
//
//   - `ADMIN_CONFIG.organizations`: the 7 consortium organisations,
//     each with the `value` stored in the database, a display `label`
//     and a `color` for the UI dots.
//   - `ADMIN_CONFIG.allRoles`: every assignable role as
//     `{ value, label }` — the 8 portal roles plus the per-organisation
//     job titles the admin console lists.
//   - `getRolesByOrganization(org)`: the roles that may be created
//     inside one organisation (its portal-admin role + its job
//     titles). Organisation keys are normalised (case-insensitive,
//     `MSP` suffix stripped) so `ECTA`, `ECTAMSP` and `ecta` all work.

export interface OrganizationOption {
  value: string;
  label: string;
  color: string;
}

export interface RoleOption {
  value: string;
  label: string;
}

export const ORGANIZATIONS: OrganizationOption[] = [
  { value: 'ECTA', label: 'Ethiopian Coffee & Tea Authority', color: '#1976d2' },
  { value: 'ECX', label: 'Ethiopian Commodity Exchange', color: '#2e7d32' },
  { value: 'NBE', label: 'National Bank of Ethiopia', color: '#ed6c02' },
  { value: 'BANKS', label: 'Commercial Banks', color: '#9c27b0' },
  { value: 'CUSTOMS', label: 'Ethiopian Customs Commission', color: '#d32f2f' },
  { value: 'SHIPPING', label: 'Shipping Lines', color: '#0288d1' },
  { value: 'EXPORTER', label: 'Coffee Exporters', color: '#5d4037' },
];

const ROLES_BY_ORGANIZATION: Record<string, RoleOption[]> = {
  ECTA: [
    { value: 'ECTA', label: 'ECTA Portal Administrator' },
    { value: 'Quality Inspector', label: 'Quality Inspector (ECTA)' },
    { value: 'Lab Analyst', label: 'Lab Analyst (ECTA)' },
    { value: 'Phytosanitary Officer', label: 'Phytosanitary Officer (ECTA)' },
    { value: 'License Officer', label: 'License Officer (ECTA)' },
    { value: 'Permit Officer', label: 'Permit Officer (ECTA)' },
    { value: 'ECTA Officer', label: 'ECTA Officer' },
  ],
  ECX: [
    { value: 'ECX', label: 'ECX Portal Administrator' },
    { value: 'Grading Officer', label: 'Grading Officer (ECX)' },
    { value: 'Warehouse Officer', label: 'Warehouse Officer (ECX)' },
    { value: 'Registration Officer', label: 'Registration Officer (ECX)' },
    { value: 'Release Officer', label: 'Release Officer (ECX)' },
    { value: 'ECX Officer', label: 'ECX Officer' },
  ],
  NBE: [
    { value: 'NBE', label: 'NBE Portal Administrator' },
    { value: 'NBE Officer', label: 'NBE Officer' },
    { value: 'Forex Officer', label: 'Forex Officer (NBE)' },
    { value: 'Screening Officer', label: 'Screening Officer (NBE)' },
    { value: 'Compliance Officer', label: 'Compliance Officer (NBE)' },
    { value: 'Exchange Rate Officer', label: 'Exchange Rate Officer (NBE)' },
    { value: 'Settlement Officer', label: 'Settlement Officer (NBE)' },
  ],
  BANKS: [
    { value: 'BANKS', label: 'Banks Portal Administrator' },
    { value: 'Bank Officer', label: 'Bank Officer' },
    { value: 'Branch Manager', label: 'Branch Manager (Banks)' },
    { value: 'Trade Finance Officer', label: 'Trade Finance Officer (Banks)' },
    { value: 'Credit Analyst', label: 'Credit Analyst (Banks)' },
    { value: 'LC Officer', label: 'LC Officer (Banks)' },
  ],
  CUSTOMS: [
    { value: 'CUSTOMS', label: 'Customs Portal Administrator' },
    { value: 'Customs Officer', label: 'Customs Officer' },
    { value: 'Inspection Officer', label: 'Inspection Officer (Customs)' },
    { value: 'Clearance Officer', label: 'Clearance Officer (Customs)' },
    { value: 'Risk Analyst', label: 'Risk Analyst (Customs)' },
    { value: 'ASYCUDA Officer', label: 'ASYCUDA Officer (Customs)' },
    { value: 'Duty Assessment Officer', label: 'Duty Assessment Officer (Customs)' },
  ],
  SHIPPING: [
    { value: 'SHIPPING', label: 'Shipping Portal Administrator' },
    { value: 'Logistics Officer', label: 'Logistics Officer (Shipping)' },
    { value: 'Documentation Officer', label: 'Documentation Officer (Shipping)' },
    { value: 'Operations Manager', label: 'Operations Manager (Shipping)' },
    { value: 'Shipping Coordinator', label: 'Shipping Coordinator (Shipping)' },
    { value: 'Freight Forwarder', label: 'Freight Forwarder (Shipping)' },
  ],
  EXPORTER: [{ value: 'EXPORTER', label: 'Exporter' }],
};

export const ALL_ROLES: RoleOption[] = [
  { value: 'ADMIN', label: 'Super Administrator' },
  ...Object.values(ROLES_BY_ORGANIZATION).flat(),
];

export const ADMIN_CONFIG = {
  organizations: ORGANIZATIONS,
  allRoles: ALL_ROLES,
};

export function normalizeOrganizationKey(org: string | undefined | null): string {
  if (!org) return '';
  return org.toUpperCase().replace(/MSP$/, '');
}

export function getRolesByOrganization(org: string | undefined | null): RoleOption[] {
  return ROLES_BY_ORGANIZATION[normalizeOrganizationKey(org)] ?? [];
}

export function getOrganizationLabel(org: string | undefined | null): string {
  const found = ORGANIZATIONS.find(
    (o) => o.value === normalizeOrganizationKey(org)
  );
  return found?.label ?? org ?? '';
}

export default ADMIN_CONFIG;
