// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Global Search API — GET /api/v1/search?q=
//
// One grouped, role-scoped search over the PostgreSQL mirrors (the same
// rows the per-portal list endpoints already serve). It deliberately does
// NOT query the ledger / CouchDB: the mirrors are what the portals show,
// and searching them keeps every hit clickable to a portal tab that
// actually lists the entity.
//
// Scoping mirrors the existing list endpoints, which return the full set
// to organisation roles and are filtered client-side by exporterId:
//   - EXPORTER: only rows they own (exporter_id matches one of the
//     identities on their token — exporterId, username or subject — the
//     same identity ExporterPortal uses: payload.exporterId || username).
//     LCs, payments and forex carry their own exporter_id column
//     (populated on every live row: 101/101 LCs, 7/7 payments, 91/91
//     forex), so they are scoped on it first; the contract link, then
//     the shipment / LC links, cover legacy rows with a NULL
//     exporter_id. Scoping through the shipment alone used to hide
//     every LC / payment / forex row from exporters (0/101 LCs, 0/91
//     forex and 6/7 payments have a shipment_id — LCs and forex are
//     created before any shipment exists).
//   - APPLICANT / EXPORTER without an applicationId: applications are
//     restricted to the application id on the token (or none).
//   - Every other role (ADMIN, ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING):
//     the full set, exactly as the list endpoints already return.
// No new visibility is invented: a role only ever sees rows its portal
// list endpoints would already have returned.
//
// Matching is ILIKE on plain id / name / status columns only (no JSONB,
// no full-table scans on blobs). Ranking per group: exact id match,
// then id starts-with, then contains, then newest first.
// Caps: 8 per group, 30 total. Short queries (< 2 chars) return an
// honest empty groups array instead of a near-full-table match.
//
// Mounted by the coordinator in server.ts (this file must NOT edit
// server.ts): apiV1.use('/search', searchRoutes) — auth is enforced
// per-route here so the mount style cannot accidentally leave it open.

import express, { Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';

const router = express.Router();

const PER_GROUP_LIMIT = 8;
const TOTAL_LIMIT = 30;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  href: string;
}

interface SearchGroup {
  type: string;
  label: string;
  items: SearchItem[];
}

/** Escape the LIKE wildcards so a query can only match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Shipping-portal tab for a shipment status (ShippingPortal mainTabs). */
function shippingTabForStatus(status: string): number {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'CUSTOMS_CLEARED':
    case 'FREIGHT_BOOKED':
      return 0;
    case 'LAND_TRANSPORT':
      return 1;
    case 'PORT_ARRIVED':
      return 2;
    case 'CONTAINER_STUFFED':
      return 3;
    case 'VESSEL_LOADED':
    case 'LOADED':
      return 4;
    case 'DEPARTED':
      return 5;
    case 'IN_TRANSIT':
      return 6;
    case 'DESTINATION_ARRIVED':
    case 'ARRIVED':
      return 7;
    case 'DELIVERED':
      return 8;
    default:
      return 9; // Pre-Shipping: CREATED / PERMIT_ISSUED / CUSTOMS_* / INSPECTION_* / CANCELLED
  }
}

function hrefFor(
  type: string,
  role: string,
  status: string,
): string {
  switch (type) {
    case 'shipment':
      if (role === 'EXPORTER') return '/portals/exporter?tab=3';
      if (role === 'CUSTOMS') return '/portals/customs?tab=0';
      if (role === 'ECTA') return '/portals/ecta?tab=3';
      return `/portals/shipping?tab=${shippingTabForStatus(status)}`;
    case 'contract':
      if (role === 'EXPORTER') return '/portals/exporter?tab=1';
      return '/portals/ecta?tab=2';
    case 'lc':
      if (role === 'EXPORTER') return '/portals/exporter?tab=5';
      if (role === 'NBE') return '/portals/nbe?tab=1';
      return '/portals/banks?tab=10';
    case 'ecx_lot':
      return '/portals/ecx?tab=0';
    case 'payment':
      if (role === 'EXPORTER') return '/portals/exporter?tab=5';
      return '/portals/banks?tab=3';
    case 'application':
      return '/portals/ecta?tab=0';
    case 'forex':
      if (role === 'EXPORTER') return '/portals/exporter?tab=2';
      if (role === 'NBE') return '/portals/nbe?tab=0';
      return '/portals/banks?tab=1';
    default:
      return '/';
  }
}

function fmtAmount(amount: unknown, currency?: string | null): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = Number(amount);
  const text = Number.isNaN(n) ? String(amount) : n.toLocaleString('en-US');
  return currency ? `${currency} ${text}` : text;
}

function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p !== null && p !== undefined && p !== '').join(' · ');
}

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Global search across shipments, contracts, LCs, ECX lots, payments, applications and forex
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Case-insensitive partial match on IDs, counterparty names and status (min 2 chars)
 *     responses:
 *       200:
 *         description: Grouped results, empty groups array when nothing matches
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Not authenticated
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQ) {
      return res.status(400).json({
        success: false,
        error: { code: 'SEARCH_QUERY_REQUIRED', message: 'Query parameter "q" is required' },
        timestamp: new Date().toISOString(),
      });
    }
    const q = rawQ.slice(0, MAX_QUERY_LENGTH);

    // A 1-char query would match most of a table; answer honestly empty.
    if (q.length < MIN_QUERY_LENGTH) {
      return res.json({
        success: true,
        data: { query: q, groups: [] },
        timestamp: new Date().toISOString(),
      });
    }

    const role = req.user?.role || 'EXPORTER';
    const isExporter = role === 'EXPORTER';
    const identities = Array.from(
      new Set(
        [req.user?.exporterId, req.user?.username, req.user?.userId, req.user?.sub]
          .filter((v): v is string => typeof v === 'string' && v.length > 0),
      ),
    );
    const applicationId = req.user?.applicationId;
    const applicationIdNum =
      applicationId !== undefined && applicationId !== null && String(applicationId).match(/^\d+$/)
        ? Number(applicationId)
        : -1; // no application on the token: matches nothing, never everything

    const db = DatabaseService.getInstance();
    const escaped = escapeLike(q);
    const contains = `%${escaped}%`;
    const prefix = `${escaped}%`;

    // $1 = exact query, $2 = contains pattern, $3 = starts-with pattern.
    // Scoping params are appended per group (see below).
    const rankOrder = (idCol: string) =>
      `ORDER BY CASE WHEN ${idCol} = $1 THEN 0 WHEN ${idCol} ILIKE $3 THEN 1 ELSE 2 END, created_at DESC NULLS LAST LIMIT ${PER_GROUP_LIMIT}`;

    // Exporter ownership: the row's own exporter_id first, then the
    // contract link, then the shipment link (legacy NULL exporter_id).
    const exporterShipments = `SELECT shipment_id FROM shipments WHERE exporter_id = ANY($4::text[])`;
    const exporterContracts = `SELECT contract_id FROM contracts WHERE exporter_id = ANY($4::text[])`;
    const exporterScope = isExporter
      ? { clause: `exporter_id = ANY($4::text[])`, params: [identities] }
      : { clause: '', params: [] as unknown[] };

    const groups: SearchGroup[] = [];

    // ---- Shipments -------------------------------------------------
    {
      const where = `(shipment_id ILIKE $2 OR contract_id ILIKE $2 OR exporter_id ILIKE $2 OR buyer_id ILIKE $2 OR status ILIKE $2 OR origin ILIKE $2 OR destination ILIKE $2)`;
      const scope = exporterScope.clause ? ` AND ${exporterScope.clause}` : '';
      const rows = await db.all(
        `SELECT shipment_id, contract_id, exporter_id, buyer_id, origin, destination, quantity, status, created_at
         FROM shipments WHERE ${where}${scope} ${rankOrder('shipment_id')}`,
        [q, contains, prefix, ...exporterScope.params],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'shipment',
          label: 'Shipments',
          items: rows.map((r: any) => ({
            id: String(r.shipment_id),
            title: String(r.shipment_id),
            subtitle: joinParts([
              r.quantity !== null && r.quantity !== undefined ? `${Number(r.quantity).toLocaleString('en-US')} kg` : null,
              joinParts([r.origin, r.destination].map((x) => (x ? String(x) : ''))) || null,
              r.contract_id ? `Contract ${r.contract_id}` : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('shipment', role, String(r.status || '')),
          })),
        });
      }
    }

    // ---- Contracts --------------------------------------------------
    {
      const where = `(contract_id ILIKE $2 OR exporter_id ILIKE $2 OR buyer_id ILIKE $2 OR status ILIKE $2)`;
      const scope = exporterScope.clause ? ` AND ${exporterScope.clause}` : '';
      const rows = await db.all(
        `SELECT contract_id, exporter_id, buyer_id, quantity, price_per_kg, status, created_at
         FROM contracts WHERE ${where}${scope} ${rankOrder('contract_id')}`,
        [q, contains, prefix, ...exporterScope.params],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'contract',
          label: 'Contracts',
          items: rows.map((r: any) => ({
            id: String(r.contract_id),
            title: String(r.contract_id),
            subtitle: joinParts([
              r.exporter_id ? `Exporter ${r.exporter_id}` : null,
              r.buyer_id ? `Buyer ${r.buyer_id}` : null,
              r.quantity !== null && r.quantity !== undefined
                ? `${Number(r.quantity).toLocaleString('en-US')} kg${r.price_per_kg ? ` @ $${r.price_per_kg}/kg` : ''}`
                : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('contract', role, String(r.status || '')),
          })),
        });
      }
    }

    // ---- Letters of credit ------------------------------------------
    {
      const where = `(lc_number ILIKE $2 OR shipment_id ILIKE $2 OR issuing_bank ILIKE $2 OR advising_bank ILIKE $2 OR beneficiary ILIKE $2 OR applicant ILIKE $2 OR status ILIKE $2)`;
      const scope = isExporter ? ` AND (exporter_id = ANY($4::text[]) OR contract_id IN (${exporterContracts}) OR shipment_id IN (${exporterShipments}))` : '';
      const rows = await db.all(
        `SELECT lc_number, shipment_id, issuing_bank, beneficiary, applicant, amount, currency, status, created_at
         FROM letters_of_credit WHERE ${where}${scope} ${rankOrder('lc_number')}`,
        [q, contains, prefix, ...(isExporter ? [identities] : [])],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'lc',
          label: 'Letters of Credit',
          items: rows.map((r: any) => ({
            id: String(r.lc_number),
            title: String(r.lc_number),
            subtitle: joinParts([
              r.beneficiary ? String(r.beneficiary) : r.applicant ? String(r.applicant) : null,
              fmtAmount(r.amount, r.currency) || null,
              r.shipment_id ? `Shipment ${r.shipment_id}` : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('lc', role, String(r.status || '')),
          })),
        });
      }
    }

    // ---- ECX lots ----------------------------------------------------
    {
      const where = `(lot_id ILIKE $2 OR lot_number ILIKE $2 OR exporter_id ILIKE $2 OR exporter_name ILIKE $2 OR grade ILIKE $2 OR status ILIKE $2)`;
      const scope = exporterScope.clause ? ` AND ${exporterScope.clause}` : '';
      const rows = await db.all(
        `SELECT lot_id, lot_number, exporter_id, exporter_name, grade, quantity, status, created_at
         FROM ecx_lots WHERE ${where}${scope} ${rankOrder('lot_number')}`,
        [q, contains, prefix, ...exporterScope.params],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'ecx_lot',
          label: 'ECX Lots',
          items: rows.map((r: any) => ({
            id: String(r.lot_id),
            title: String(r.lot_number || r.lot_id),
            subtitle: joinParts([
              r.exporter_name ? String(r.exporter_name) : r.exporter_id ? String(r.exporter_id) : null,
              r.grade ? String(r.grade) : null,
              r.quantity !== null && r.quantity !== undefined ? `${Number(r.quantity).toLocaleString('en-US')} kg` : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('ecx_lot', role, String(r.status || '')),
          })),
        });
      }
    }

    // ---- Payments ----------------------------------------------------
    {
      const where = `(payment_id ILIKE $2 OR lc_number ILIKE $2 OR shipment_id ILIKE $2 OR status ILIKE $2)`;
      const scope = isExporter
        ? ` AND (exporter_id = ANY($4::text[]) OR contract_id IN (${exporterContracts}) OR shipment_id IN (${exporterShipments}) OR lc_number IN (SELECT lc_number FROM letters_of_credit WHERE exporter_id = ANY($4::text[]) OR contract_id IN (${exporterContracts})))`
        : '';
      // The scope above reuses $4 in several IN-subqueries; pg binds
      // the same parameter position, so only one extra param is needed.
      const rows = await db.all(
        `SELECT payment_id, lc_number, shipment_id, amount, currency, status, created_at
         FROM payments WHERE ${where}${scope} ${rankOrder('payment_id')}`,
        [q, contains, prefix, ...(isExporter ? [identities] : [])],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'payment',
          label: 'Payments',
          items: rows.map((r: any) => ({
            id: String(r.payment_id),
            title: String(r.payment_id),
            subtitle: joinParts([
              fmtAmount(r.amount, r.currency) || null,
              r.lc_number ? `LC ${r.lc_number}` : null,
              r.shipment_id ? `Shipment ${r.shipment_id}` : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('payment', role, String(r.status || '')),
          })),
        });
      }
    }

    // ---- Exporter applications ---------------------------------------
    {
      const where = `(company_name ILIKE $2 OR license_number ILIKE $2 OR contact_person ILIKE $2 OR email ILIKE $2 OR status ILIKE $2 OR CAST(id AS TEXT) ILIKE $2)`;
      // Organisation roles see all applications (ECTA reviews them);
      // exporters / applicants see only the application on their token.
      const scope = isExporter || role === 'APPLICANT' ? ` AND id = $4` : '';
      const rows = await db.all(
        `SELECT id, company_name, license_number, contact_person, email, status, created_at
         FROM exporter_applications WHERE ${where}${scope} ORDER BY CASE WHEN CAST(id AS TEXT) = $1 THEN 0 WHEN company_name ILIKE $3 THEN 1 ELSE 2 END, created_at DESC NULLS LAST LIMIT ${PER_GROUP_LIMIT}`,
        [q, contains, prefix, ...(isExporter || role === 'APPLICANT' ? [applicationIdNum] : [])],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'application',
          label: 'Exporter Applications',
          items: rows.map((r: any) => ({
            id: String(r.id),
            title: String(r.company_name || `Application ${r.id}`),
            subtitle: joinParts([
              r.license_number ? `Licence ${r.license_number}` : null,
              r.contact_person ? String(r.contact_person) : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('application', role, String(r.status || '')),
          })),
        });
      }
    }

    // ---- Forex allocations -------------------------------------------
    {
      const where = `(allocation_id ILIKE $2 OR shipment_id ILIKE $2 OR lc_number ILIKE $2 OR status ILIKE $2)`;
      const scope = isExporter ? ` AND (exporter_id = ANY($4::text[]) OR contract_id IN (${exporterContracts}) OR lc_id IN (SELECT lc_number FROM letters_of_credit WHERE exporter_id = ANY($4::text[]) OR contract_id IN (${exporterContracts})) OR shipment_id IN (${exporterShipments}))` : '';
      const rows = await db.all(
        `SELECT allocation_id, shipment_id, lc_number, amount_usd, status, created_at
         FROM forex_allocations WHERE ${where}${scope} ${rankOrder('allocation_id')}`,
        [q, contains, prefix, ...(isExporter ? [identities] : [])],
      );
      if (rows.length > 0) {
        groups.push({
          type: 'forex',
          label: 'Forex Allocations',
          items: rows.map((r: any) => ({
            id: String(r.allocation_id),
            title: String(r.allocation_id),
            subtitle: joinParts([
              fmtAmount(r.amount_usd, 'USD') || null,
              r.lc_number ? `LC ${r.lc_number}` : null,
              r.shipment_id ? `Shipment ${r.shipment_id}` : null,
            ]),
            status: String(r.status || ''),
            href: hrefFor('forex', role, String(r.status || '')),
          })),
        });
      }
    }

    // Total cap (30) applied in group order; a group that ends up empty
    // is dropped so the response never carries an empty section.
    let remaining = TOTAL_LIMIT;
    const cappedGroups: SearchGroup[] = [];
    for (const group of groups) {
      if (remaining <= 0) break;
      const items = group.items.slice(0, remaining);
      remaining -= items.length;
      if (items.length > 0) cappedGroups.push({ ...group, items });
    }

    logger.info(`[SEARCH] role=${role} q="${q}" groups=${cappedGroups.length} results=${TOTAL_LIMIT - remaining}`);
    return res.json({
      success: true,
      data: { query: q, groups: cappedGroups },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[SEARCH] failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SEARCH_FAILED', message: 'Search failed. Please try again.' },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
