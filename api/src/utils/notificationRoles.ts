// Canonical notification audience roles (shared — no imports).
//
// Kept in its own module so notificationService, websocketService and the
// feed route can all normalise roles without an import cycle. See
// migration 072_add_notification_fields.sql for the addressing model:
// users.role carries variants (ECTA_ADMIN, BANK_ADMIN, BANK, 'NBE
// OFFICER', ...) but notifications are addressed to one canonical base
// role (ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING, EXPORTER, ADMIN).

/**
 * Normalise a users.role value to the canonical base role used as the
 * notifications audience. ECTA_ADMIN -> ECTA, BANK_ADMIN / BANK /
 * BANK OFFICER / FOREX OFFICER -> BANKS, NBE_ADMIN / 'NBE OFFICER' ->
 * NBE, CUSTOMS_ADMIN -> CUSTOMS, SHIPPING_ADMIN -> SHIPPING,
 * SUPER_ADMIN -> ADMIN. Unknown values pass through upper-cased so a
 * future role is addressed, not silently dropped.
 */
export function normalizeNotificationRole(role: string | undefined | null): string | null {
  if (!role) return null;
  const r = String(role).trim().toUpperCase();
  if (r === 'BANK' || r === 'BANK_ADMIN' || r === 'BANK OFFICER' || r === 'FOREX OFFICER') return 'BANKS';
  if (r === 'ECTA_ADMIN') return 'ECTA';
  if (r === 'ECX_ADMIN') return 'ECX';
  if (r === 'NBE_ADMIN' || r === 'NBE OFFICER') return 'NBE';
  if (r === 'CUSTOMS_ADMIN') return 'CUSTOMS';
  if (r === 'SHIPPING_ADMIN') return 'SHIPPING';
  if (r === 'SUPER_ADMIN') return 'ADMIN';
  if (r.endsWith('_ADMIN') || r.endsWith('_OFFICER')) return r.replace(/_(ADMIN|OFFICER)$/, '');
  return r;
}
