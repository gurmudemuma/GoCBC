// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Real-Time Notification Center — real feed + live WebSocket.
//
// This component renders ONLY persisted in-app notification rows from
// GET /api/v1/notifications (W1 backend, migration 072). The old
// synthesised derivation (fetching LCs / shipments / payments /
// contracts and building fake items on the fly) is gone: an empty feed
// is an honest empty state, never synthesised rows.
//
// Live updates: a native WebSocket to ws://<api-host>/?token=<JWT>
// (browsers cannot set headers on a WS upgrade). On `notification`
// arrival the item is prepended and the badge increments WITHOUT the
// panel being open; a react-toastify toast (the ToastContainer already
// mounted in _app.tsx) offers the detail view. Reconnect uses
// backoff; while the socket is down, the 30 s poll while the panel is
// open is the fallback only, not the primary path.
//
// Two old data bugs are fixed here, not worked around:
//  - Epoch dates: a missing/null/invalid timestamp renders NO date
//    line at all (never new Date(null) = Jan 1, 1970).
//  - "undefined": the feed row's own title/message are rendered as-is
//    and no absent field is ever interpolated into a description.
//
// Action Required = unread rows whose underlying entity is STILL in
// its actionable state. The entity is re-checked live (single-entity
// GET per entity type); a row whose entity has moved on (approved,
// inspected, cleared, ...) drops out of Action Required while staying
// in Recent. A failed/unknown check fails OPEN (stays actionable) —
// the feed is the source of truth for read state, the entity is the
// source of truth for actionability.
//
// WS message shape (websocketService.notifyNotificationCreated):
//   { type: 'notification', data: <row>, channel, timestamp }
// (`notification:` is also accepted defensively.) Broadcast channels
// (websocketService.NOTIFICATION_CHANNELS): notifications:<ROLE>,
// notifications:user:<id>, notifications:exporter:<id>. Never
// subscribe to notifications:EXPORTER — that would leak every
// exporter's rows. ADMIN may subscribe to any role channel.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  ListItemText,
  Badge,
  IconButton,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  Button,
  CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Notifications,
  CheckCircle,
  Warning,
  Info,
  LocalShipping,
  AccountBalance,
  Science,
  Visibility,
  Close,
  Description,
  MarkEmailRead,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import { API_BASE_URL } from '@/config/api.config';
import { PortalDialog } from '@/components/shared/portal/PortalDialog';
import { PortalOrgKey } from '@/components/shared/portal/PortalBrand';

interface NotificationCenterProps {
  userRole: string;
}

/** One row of the persisted feed — GET /api/v1/notifications. */
export interface FeedNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  severity: string;
  role: string | null;
  exporterId: string | null;
  userId: number | null;
  read: boolean;
  createdAt: string;
}

interface JwtIdentity {
  userId: string;
  exporterId: string;
  role: string;
}

/**
 * Normalise a users.role value to the canonical base role used as the
 * notifications audience — UI mirror of api/src/utils/notificationRoles.ts.
 * ECTA_ADMIN→ECTA, BANK/BANK_ADMIN→BANKS, NBE_ADMIN→NBE,
 * CUSTOMS_ADMIN→CUSTOMS, SHIPPING_ADMIN→SHIPPING, SUPER_ADMIN→ADMIN.
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

function decodeJwtIdentity(): JwtIdentity | null {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: String(payload.userId ?? payload.sub ?? ''),
      exporterId: String(payload.exporterId ?? payload.username ?? payload.sub ?? ''),
      role: String(payload.role ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * Parse a feed timestamp. Returns null for missing / null / invalid
 * values — including the epoch itself (getTime() === 0), which can
 * only come from new Date(null) on a missing value, never from a real
 * row. Callers render NO date line for null, never Jan 1, 1970.
 */
export function parseNotificationDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return null;
  return d;
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Tab resolution: entity type -> portal + tab index for the viewer's role.
// Verified against the actual portal tab lists (ECTA 0-10, ECX 0-3,
// Exporter 0-7, Banks hierarchy incl. tabIndex 10 = All LCs, NBE 0-8,
// Customs 0-7, Shipping 0-10) and api/src/routes/search.ts hrefFor.
// A backend actionUrl is honoured only when it already carries a
// NUMERIC ?tab= (named ?tab=contracts etc. are ignored by
// useTabFromQuery and therefore unusable as-is); otherwise this table
// decides. Unknown entity/role combinations fall back to the viewer's
// portal root (never a tab that does not exist for that role).
// ---------------------------------------------------------------------------

const PORTAL_PATH: Record<string, string> = {
  ECTA: 'ecta',
  ECX: 'ecx',
  NBE: 'nbe',
  BANKS: 'banks',
  CUSTOMS: 'customs',
  SHIPPING: 'shipping',
  EXPORTER: 'exporter',
  ADMIN: 'ecta',
};

function shippingTabForStatus(status: string): number {
  switch ((status || '').toUpperCase()) {
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

export function resolveNotificationDestination(
  row: Pick<FeedNotification, 'entityType' | 'entityId' | 'actionUrl'>,
  baseRole: string,
  entityStatus?: string | null,
): string {
  const portal = PORTAL_PATH[baseRole] || 'ecta';
  const portalRoot = `/portals/${portal}`;
  const tab = (index: number) => `/portals/${portal}?tab=${index}`;

  // A backend actionUrl with a NUMERIC ?tab= is already a valid
  // deep-link (useTabFromQuery honours it); use it verbatim.
  if (row.actionUrl) {
    try {
      const url = new URL(row.actionUrl, 'http://localhost');
      const tabParam = url.searchParams.get('tab');
      if (url.pathname.startsWith('/portals/') && tabParam !== null && /^\d+$/.test(tabParam)) {
        return row.actionUrl;
      }
    } catch {
      // Not a parseable URL — fall through to the table below.
    }
  }

  const type = (row.entityType || '').toLowerCase();
  const role = baseRole === 'ADMIN' ? 'ADMIN' : baseRole;
  switch (type) {
    case 'contract':
      if (role === 'EXPORTER') return '/portals/exporter?tab=1';
      if (role === 'ECTA' || role === 'ADMIN') return '/portals/ecta?tab=2';
      return tab(0);
    case 'shipment':
      if (role === 'EXPORTER') return '/portals/exporter?tab=3';
      if (role === 'CUSTOMS') return '/portals/customs?tab=0';
      if (role === 'ECTA' || role === 'ADMIN') return '/portals/ecta?tab=3';
      if (role === 'SHIPPING') return `/portals/shipping?tab=${shippingTabForStatus(entityStatus || '')}`;
      return portalRoot;
    case 'inspection':
      if (role === 'EXPORTER') return '/portals/exporter?tab=3';
      if (role === 'ECTA' || role === 'ADMIN') return '/portals/ecta?tab=3';
      if (role === 'ECX') return '/portals/ecx?tab=0';
      return portalRoot;
    case 'permit':
      if (role === 'EXPORTER') return '/portals/exporter?tab=3';
      if (role === 'ECTA' || role === 'ADMIN') return '/portals/ecta?tab=6';
      return portalRoot;
    case 'lc':
      if (role === 'EXPORTER') return '/portals/exporter?tab=5';
      if (role === 'NBE') return '/portals/nbe?tab=1';
      if (role === 'BANKS' || role === 'ADMIN') return '/portals/banks?tab=10';
      if (role === 'ECTA') return '/portals/ecta?tab=2';
      return portalRoot;
    case 'forex':
      if (role === 'EXPORTER') return '/portals/exporter?tab=2';
      if (role === 'NBE') return '/portals/nbe?tab=0';
      if (role === 'BANKS' || role === 'ADMIN') return '/portals/banks?tab=1';
      return portalRoot;
    case 'payment':
      if (role === 'EXPORTER') return '/portals/exporter?tab=5';
      if (role === 'BANKS' || role === 'ADMIN') return '/portals/banks?tab=3';
      if (role === 'NBE') return '/portals/nbe?tab=4';
      return portalRoot;
    case 'customs_declaration':
      if (role === 'CUSTOMS') return '/portals/customs?tab=0';
      if (role === 'EXPORTER') return '/portals/exporter?tab=4';
      if (role === 'SHIPPING') return '/portals/shipping?tab=0';
      if (role === 'ADMIN') return '/portals/customs?tab=0';
      return portalRoot;
    case 'application':
      if (role === 'ECTA' || role === 'ADMIN') return '/portals/ecta?tab=0';
      return portalRoot;
    case 'ecx_lot':
      if (role === 'ECX' || role === 'ADMIN') return '/portals/ecx?tab=0';
      return portalRoot;
    case 'swift':
      if (role === 'BANKS' || role === 'ADMIN') return '/portals/banks?tab=4';
      if (role === 'NBE') return '/portals/nbe?tab=3';
      return portalRoot;
    default:
      return portalRoot;
  }
}

// ---------------------------------------------------------------------------
// Actionability: which event types can still need an action, and which
// entity statuses still count as "pending" for that type. Everything
// else is informational (Recent only). The entity status is re-checked
// live per row; a failed or unavailable check fails OPEN (the row
// stays actionable) so a backend hiccup never silently hides work.
// ---------------------------------------------------------------------------

const ACTIONABLE_TYPES: Record<string, string[]> = {
  contract_registered: ['REQUESTED', 'REGISTERED', 'PENDING_NBE', 'PENDING_ECTA', 'PENDING_APPROVAL', 'SUBMITTED'],
  contract_rejected: ['REJECTED'],
  application_rejected: ['REJECTED'],
  inspection_required: ['CREATED', 'PENDING_INSPECTION', 'INSPECTION_PENDING', 'INSPECTION_REQUIRED'],
  customs_submitted: ['SUBMITTED', 'UNDER_REVIEW', 'UNDER_INSPECTION', 'INSPECTING', 'PENDING'],
  customs_inspection_started: ['UNDER_INSPECTION', 'INSPECTING', 'UNDER_REVIEW', 'SUBMITTED'],
  document_discrepancy: [], // no entity status tracks resolution — actionable while unread
};

/** Single-entity GET per entity type; returns the live status or null. */
async function fetchEntityStatus(row: FeedNotification): Promise<string | null> {
  const id = row.entityId;
  if (!id) return null;
  const type = (row.entityType || '').toLowerCase();
  const path =
    type === 'contract' ? `/contracts/${encodeURIComponent(id)}` :
    type === 'shipment' ? `/shipments/${encodeURIComponent(id)}` :
    type === 'inspection' ? `/quality/inspections/${encodeURIComponent(id)}` :
    type === 'lc' ? `/banking/lc/${encodeURIComponent(id)}` :
    type === 'forex' ? `/forex/${encodeURIComponent(id)}` :
    type === 'payment' ? `/payments/${encodeURIComponent(id)}` :
    type === 'customs_declaration' ? `/customs/declarations/${encodeURIComponent(id)}` :
    type === 'permit' ? `/permits/${encodeURIComponent(id)}` :
    type === 'application' ? `/exporters/applications/${encodeURIComponent(id)}` :
    null;
  if (!path) return null;
  try {
    const res = await api.get(path);
    const data = res.data?.data ?? res.data;
    const status =
      data?.status ?? data?.contractStatus ?? data?.ContractStatus ??
      data?.shipmentStatus ?? data?.declarationStatus ?? data?.applicationStatus ??
      data?.inspectionStatus ?? data?.lcStatus ?? null;
    return typeof status === 'string' && status ? status.toUpperCase() : null;
  } catch {
    return null;
  }
}

const FEED_PAGE_SIZE = 20;
const POLL_FALLBACK_MS = 30000;
const WS_BASE = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userRole }) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tabValue, setTabValue] = useState(0);
  const [items, setItems] = useState<FeedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [detail, setDetail] = useState<FeedNotification | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [allItems, setAllItems] = useState<FeedNotification[]>([]);
  const [allPage, setAllPage] = useState(1);
  const [allTotalPages, setAllTotalPages] = useState(1);
  const [allLoading, setAllLoading] = useState(false);
  /** Per-row actionability override: id -> false once the entity check proves it moved on. */
  const [notActionable, setNotActionable] = useState<Record<number, boolean>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const itemsRef = useRef<FeedNotification[]>([]);
  itemsRef.current = items;
  const openRef = useRef(false);

  const open = Boolean(anchorEl);
  openRef.current = open;

  const baseRole = normalizeNotificationRole(userRole) || 'ECTA';
  const brand: PortalOrgKey = (['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'EXPORTER'] as const).includes(baseRole as PortalOrgKey)
    ? (baseRole as PortalOrgKey)
    : 'ECTA';

  // --- Feed ---------------------------------------------------------------

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: FEED_PAGE_SIZE, page: 1 } });
      const body = res.data;
      if (body?.success && Array.isArray(body.data)) {
        const rows: FeedNotification[] = body.data;
        // Newest first (the API already orders created_at DESC; sort
        // defensively so a bad timestamp can never reorder the list).
        rows.sort((a, b) => {
          const da = parseNotificationDate(a.createdAt)?.getTime() ?? 0;
          const db = parseNotificationDate(b.createdAt)?.getTime() ?? 0;
          return db - da || b.id - a.id;
        });
        setItems(rows);
        setUnreadCount(typeof body.unreadCount === 'number' ? body.unreadCount : rows.filter((r) => !r.read).length);
      }
    } catch (err) {
      console.warn('Failed to load notifications feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Re-check actionability for unread actionable-type rows. */
  const refreshActionability = useCallback(async (rows: FeedNotification[]) => {
    const candidates = rows.filter((r) => !r.read && r.type in ACTIONABLE_TYPES && r.entityId);
    if (candidates.length === 0) return;
    const results = await Promise.all(
      candidates.map(async (row) => {
        const pending = ACTIONABLE_TYPES[row.type];
        if (pending.length === 0) return { id: row.id, actionable: true };
        const status = await fetchEntityStatus(row);
        // Unknown status (no endpoint / fetch failed) fails OPEN.
        if (!status) return { id: row.id, actionable: true };
        return { id: row.id, actionable: pending.includes(status) };
      }),
    );
    if (!mountedRef.current) return;
    setNotActionable((prev) => {
      const next = { ...prev };
      for (const { id, actionable } of results) {
        if (actionable) delete next[id];
        else next[id] = true;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refreshActionability(items);
  }, [items, refreshActionability]);

  const markRead = useCallback(async (id: number) => {
    const row = itemsRef.current.find((r) => r.id === id) ?? allItems.find((r) => r.id === id);
    const wasUnread = row ? !row.read : true;
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.warn(`Failed to mark notification ${id} read:`, err);
      return;
    }
    const apply = (list: FeedNotification[]) => list.map((r) => (r.id === id ? { ...r, read: true } : r));
    setItems(apply);
    setAllItems(apply);
    setDetail((d) => (d && d.id === id ? { ...d, read: true } : d));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
  }, [allItems]);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
      return;
    }
    const apply = (list: FeedNotification[]) => list.map((r) => ({ ...r, read: true }));
    setItems(apply);
    setAllItems(apply);
    setUnreadCount(0);
  }, []);

  // --- WebSocket ------------------------------------------------------------

  const connectSocket = useCallback(() => {
    if (typeof window === 'undefined') return;
    const identity = decodeJwtIdentity();
    const token = localStorage.getItem('authToken');
    if (!token || !identity || !identity.userId) return;

    const role = normalizeNotificationRole(identity.role || userRole) || 'ECTA';
    const channels: string[] = [];
    if (role === 'ADMIN') {
      // ADMIN may subscribe to any role channel; the feed shows it
      // every row, so subscribe to every role broadcast except the
      // EXPORTER channel (never — it would leak all exporter rows).
      for (const r of ['ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING']) {
        channels.push(`notifications:${r}`);
      }
    } else if (role !== 'EXPORTER') {
      channels.push(`notifications:${role}`);
    }
    // Exporter rows are addressed to the exporter's own channels only.
    channels.push(`notifications:user:${identity.userId}`);
    if (identity.exporterId) channels.push(`notifications:exporter:${identity.exporterId}`);

    const ws = new WebSocket(`${WS_BASE}/?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      ws.send(JSON.stringify({ type: 'subscribe', channels }));
    };
    ws.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === 'subscription_confirmed') {
        setSocketConnected(true);
        return;
      }
      if (msg.type === 'connection') {
        // Welcome message; connected once the subscription confirms.
        return;
      }
      if (msg.type === 'notification') {
        // Live shape: { type:'notification', data: <row> }; accept
        // `notification:` defensively.
        const row: FeedNotification | undefined = msg.data ?? msg.notification;
        if (!row || typeof row.id !== 'number') return;
        setItems((prev) => {
          if (prev.some((r) => r.id === row.id)) {
            return prev.map((r) => (r.id === row.id ? { ...row } : r));
          }
          return [{ ...row }, ...prev];
        });
        if (!row.read) setUnreadCount((c) => c + 1);
        toast.info(
          <Box onClick={() => setDetail({ ...row })} sx={{ cursor: 'pointer' }}>
            <Typography variant="body2" fontWeight={700}>{row.title || 'New notification'}</Typography>
            {row.message ? (
              <Typography variant="body2" color="text.secondary">{row.message}</Typography>
            ) : null}
          </Box>,
          { toastId: `notif-${row.id}`, autoClose: 6000 },
        );
      }
    };
    ws.onclose = (event) => {
      setSocketConnected(false);
      if (wsRef.current === ws) wsRef.current = null;
      // 4401 = unauthenticated (bad/expired token): do not retry.
      if (!mountedRef.current || event.code === 4401) return;
      const delay = Math.min(30000, 1000 * 2 ** reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connectSocket, delay);
    };
    ws.onerror = () => {
      // onclose follows and schedules the reconnect.
    };
  }, [userRole]);

  // Mount-time: initial feed (badge) + live socket. The component
  // mounts with NavigationBar in _app.tsx, so this covers all portals.
  useEffect(() => {
    mountedRef.current = true;
    loadFeed();
    connectSocket();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Already closed.
        }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when the panel opens.
  useEffect(() => {
    if (open) loadFeed();
  }, [open, loadFeed]);

  // Fallback only: 30 s poll while the panel is open AND the socket is down.
  useEffect(() => {
    if (!open || socketConnected) return;
    const interval = setInterval(loadFeed, POLL_FALLBACK_MS);
    return () => clearInterval(interval);
  }, [open, socketConnected, loadFeed]);

  // --- Full list ("View All") ------------------------------------------------

  const loadAllPage = useCallback(async (page: number) => {
    setAllLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: FEED_PAGE_SIZE, page } });
      const body = res.data;
      if (body?.success && Array.isArray(body.data)) {
        const rows: FeedNotification[] = body.data;
        setAllItems((prev) => (page === 1 ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]));
        setAllPage(page);
        setAllTotalPages(body.pagination?.totalPages ?? 1);
        if (typeof body.unreadCount === 'number') setUnreadCount(body.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to load full notification list:', err);
    } finally {
      setAllLoading(false);
    }
  }, []);

  const openAll = () => {
    setAnchorEl(null);
    setAllOpen(true);
    loadAllPage(1);
  };

  // --- Handlers ---------------------------------------------------------------

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openDetail = (row: FeedNotification) => {
    setDetail(row);
    setAnchorEl(null);
    if (!row.read) void markRead(row.id);
  };

  const goToEntity = (row: FeedNotification) => {
    const href = resolveNotificationDestination(row, baseRole);
    setDetail(null);
    setAllOpen(false);
    router.push(href);
  };

  // --- Derived lists -----------------------------------------------------------

  const recent = items;
  const actionItems = items.filter(
    (r) => !r.read && r.type in ACTIONABLE_TYPES && !notActionable[r.id],
  );

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'warning':
      case 'critical':
        return <Warning fontSize="small" />;
      case 'error':
        return <Warning fontSize="small" />;
      case 'info':
      default:
        return <Info fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'critical':
      case 'error':
        return '#f44336';
      case 'info':
      default:
        return '#2196f3';
    }
  };

  const renderRow = (row: FeedNotification) => {
    const created = parseNotificationDate(row.createdAt);
    const isAction = !row.read && row.type in ACTIONABLE_TYPES && !notActionable[row.id];
    return (
      <React.Fragment key={row.id}>
        <MenuItem
          onClick={() => openDetail(row)}
          sx={{
            py: 2,
            px: 2.5,
            alignItems: 'flex-start',
            backgroundColor: row.read ? 'transparent' : alpha('#2196f3', 0.05),
            '&:hover': {
              backgroundColor: alpha(getSeverityColor(row.severity), 0.08),
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: alpha(getSeverityColor(row.severity), 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5,
              flexShrink: 0,
            }}
          >
            {row.entityType === 'shipment' ? (
              <LocalShipping sx={{ color: getSeverityColor(row.severity), fontSize: 20 }} />
            ) : row.entityType === 'lc' || row.entityType === 'payment' || row.entityType === 'forex' ? (
              <AccountBalance sx={{ color: getSeverityColor(row.severity), fontSize: 20 }} />
            ) : row.entityType === 'inspection' ? (
              <Science sx={{ color: getSeverityColor(row.severity), fontSize: 20 }} />
            ) : row.entityType === 'contract' || row.entityType === 'application' ? (
              <Description sx={{ color: getSeverityColor(row.severity), fontSize: 20 }} />
            ) : (
              <Box sx={{ color: getSeverityColor(row.severity), display: 'flex' }}>{getSeverityIcon(row.severity)}</Box>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" fontWeight={row.read ? 600 : 700} sx={{ fontSize: '0.9rem' }}>
                {row.title}
              </Typography>
              {isAction ? (
                <Chip
                  label="Action required"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha('#ff6b35', 0.1),
                    color: '#ff6b35',
                  }}
                />
              ) : null}
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              {row.message}
            </Typography>
            {/* No date line at all when the row carries no real timestamp. */}
            {created ? (
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                {formatRelativeTime(created)}
              </Typography>
            ) : null}
          </Box>
          <IconButton size="small" sx={{ color: '#1976d2', ml: 1 }} aria-label="View notification detail">
            <Visibility fontSize="small" />
          </IconButton>
        </MenuItem>
        <Divider />
      </React.Fragment>
    );
  };

  const detailDate = detail ? parseNotificationDate(detail.createdAt) : null;

  return (
    <>
      <Tooltip title={socketConnected ? 'Notifications (live)' : 'Notifications (polling — live updates unavailable)'}>
        <IconButton
          color="inherit"
          size="small"
          onClick={handleOpen}
          sx={{
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
            ...(userRole === 'BANKS' && {
              color: '#FFD700', // Golden for Banks
            }),
          }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Notifications
              fontSize="small"
              sx={userRole === 'BANKS' ? { color: '#FFD700' } : undefined}
            />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 420,
            maxWidth: 480,
            maxHeight: 600,
            borderRadius: 2,
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
                Notifications
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                {!socketConnected ? ' · live updates off (polling)' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {unreadCount > 0 ? (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={() => void markAllRead()} aria-label="Mark all as read">
                    <MarkEmailRead fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <IconButton size="small" onClick={handleClose}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontSize: '0.85rem',
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Recent
                  <Chip label={recent.length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Action Required
                  <Chip
                    label={actionItems.length}
                    size="small"
                    color={actionItems.length > 0 ? 'error' : 'default'}
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Content */}
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {tabValue === 0 && (
            <>
              {loading && recent.length === 0 ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : recent.length === 0 ? (
                <Box sx={{ py: 4, px: 3, textAlign: 'center' }}>
                  <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    No notifications yet
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Workflow events for your role will appear here
                  </Typography>
                </Box>
              ) : (
                recent.map(renderRow)
              )}
            </>
          )}

          {tabValue === 1 && (
            <>
              {actionItems.length === 0 ? (
                <Box sx={{ py: 4, px: 3, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary" fontWeight={600}>
                    No pending actions
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    All tasks are up to date
                  </Typography>
                </Box>
              ) : (
                actionItems.map(renderRow)
              )}
            </>
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <MenuItem
          onClick={openAll}
          sx={{
            justifyContent: 'center',
            py: 1.5,
            '&:hover': {
              backgroundColor: 'primary.lighter',
            },
          }}
        >
          <Typography variant="body2" color="primary" fontWeight={600}>
            View All Notifications
          </Typography>
        </MenuItem>
      </Menu>

      {/* Detail dialog — opens on click, marks the row read, offers View. */}
      {detail ? (
        <PortalDialog
          brand={brand}
          title={detail.title}
          subtitle={detail.read ? 'Read' : 'Unread'}
          icon={<Box sx={{ color: getSeverityColor(detail.severity), display: 'flex' }}>{getSeverityIcon(detail.severity)}</Box>}
          open={Boolean(detail)}
          onClose={() => setDetail(null)}
          maxWidth="sm"
          titleAccessory={
            <Chip
              label={detail.severity}
              size="small"
              sx={{
                bgcolor: alpha(getSeverityColor(detail.severity), 0.12),
                color: getSeverityColor(detail.severity),
                textTransform: 'capitalize',
              }}
            />
          }
          actions={
            <>
              <Button onClick={() => setDetail(null)} color="inherit">
                Close
              </Button>
              <Button variant="contained" onClick={() => goToEntity(detail)}>
                View
              </Button>
            </>
          }
        >
          <Typography variant="body1" sx={{ mb: 2 }}>
            {detail.message}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Type:</strong> {detail.type}
            </Typography>
            {detail.entityType && detail.entityId ? (
              <Typography variant="body2" color="text.secondary">
                <strong>Entity:</strong> {detail.entityType} · {detail.entityId}
              </Typography>
            ) : null}
            {detailDate ? (
              <Typography variant="body2" color="text.secondary">
                <strong>Received:</strong> {formatRelativeTime(detailDate)} · {formatAbsoluteTime(detailDate)}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {detail.read ? 'Read' : 'Unread'}
            </Typography>
          </Box>
        </PortalDialog>
      ) : null}

      {/* Full list — real paginated feed, not a menu close. */}
      <PortalDialog
        brand={brand}
        title="All Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        icon={<Notifications />}
        open={allOpen}
        onClose={() => setAllOpen(false)}
        maxWidth="md"
        actions={
          <>
            <Button onClick={() => setAllOpen(false)} color="inherit">
              Close
            </Button>
            {unreadCount > 0 ? (
              <Button onClick={() => void markAllRead()} color="inherit">
                Mark all as read
              </Button>
            ) : null}
          </>
        }
      >
        {allLoading && allItems.length === 0 ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : allItems.length === 0 ? (
          <Box sx={{ py: 4, px: 3, textAlign: 'center' }}>
            <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <>
            {allItems.map((row) => {
              const created = parseNotificationDate(row.createdAt);
              return (
                <Box
                  key={row.id}
                  onClick={() => openDetail(row)}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    py: 1.5,
                    px: 1,
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    backgroundColor: row.read ? 'transparent' : alpha('#2196f3', 0.04),
                    '&:hover': { backgroundColor: alpha('#2196f3', 0.08) },
                  }}
                >
                  <Box sx={{ color: getSeverityColor(row.severity), display: 'flex', pt: 0.25 }}>
                    {getSeverityIcon(row.severity)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={row.read ? 600 : 700}>
                      {row.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {row.message}
                    </Typography>
                    {created ? (
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeTime(created)} · {formatAbsoluteTime(created)}
                      </Typography>
                    ) : null}
                  </Box>
                  {!row.read ? <Chip label="Unread" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} /> : null}
                </Box>
              );
            })}
            {allPage < allTotalPages ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                <Button onClick={() => void loadAllPage(allPage + 1)} disabled={allLoading}>
                  Load more
                </Button>
              </Box>
            ) : null}
          </>
        )}
      </PortalDialog>
    </>
  );
};

export default NotificationCenter;
