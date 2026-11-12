// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// WebSocket Service for Real-time Updates
//
// CHANNEL MODEL (defined here, single source of truth — the UI subscribes
// to exactly these names; see also notificationService.createInAppNotification)
// ---------------------------------------------------------------------------
//   notifications:<ROLE>            role broadcast, e.g. notifications:ECTA,
//                                   notifications:BANKS. Only users whose
//                                   normalised base role matches may subscribe.
//   notifications:user:<userId>     one numeric users.id.
//   notifications:exporter:<id>     one exporter (exporter_id / username).
//   shipments | contracts | exporters
//                                   legacy broadcast channels kept for the
//                                   notify* helpers below (no subscribers =
//                                   no delivery).
//
// AUTH: a socket must present the same JWT the REST API uses, as
// ?token=<jwt> in the WebSocket URL (browsers cannot set an Authorization
// header on a WebSocket upgrade) or as an Authorization: Bearer header.
// The token is verified with the same secret authMiddleware uses
// (getJwtSecret) and the same revocation list (isTokenRevoked); a bad or
// missing token closes the socket (4401) and it receives nothing.
// Authenticated clients may only subscribe to notification channels that
// match their own identity — a BANKS user cannot subscribe to
// notifications:ECTA or to another exporter's channel.
//
// An in-app notification row is broadcast ONLY to its own audience:
//   - a role row (exporter_id NULL) -> notifications:<ROLE> only
//   - an exporter row (exporter_id set) -> notifications:user:<id> and
//     notifications:exporter:<exporterId> only — never the EXPORTER role
//     channel, which would leak it to every exporter.

import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { getJwtSecret } from '../config/env.validation';
import { isTokenRevoked } from '../middleware/auth';
import { normalizeNotificationRole } from '../utils/notificationRoles';
import type { InAppNotificationRow } from './notificationService';

/** Channel-name builders — the UI worker subscribes to these. */
export const NOTIFICATION_CHANNELS = {
  forRole: (role: string): string => `notifications:${normalizeNotificationRole(role) || role}`,
  forUser: (userId: number | string): string => `notifications:user:${userId}`,
  forExporter: (exporterId: string): string => `notifications:exporter:${exporterId}`,
} as const;

interface AuthenticatedSocket {
  ws: WebSocket;
  clientId: string;
  userId: string;
  username: string;
  role: string;
  baseRole: string;
  exporterId: string;
  channels: Set<string>;
}

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedSocket> = new Map();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    WebSocketService.instance = this;
    this.setupWebSocketServer();
  }

  /** The retained instance (set by server.ts); null before startup. */
  public static getInstance(): WebSocketService | null {
    return WebSocketService.instance;
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      // Authenticate BEFORE the client is registered: unauthenticated
      // sockets get no notifications at all.
      this.authenticate(req).then((auth) => {
        if (!auth) {
          try {
            ws.close(4401, 'Unauthorized: a valid JWT is required (?token= or Authorization: Bearer)');
          } catch {
            // Socket already gone; nothing to close.
          }
          return;
        }

        const clientId = this.generateClientId();
        const client: AuthenticatedSocket = { ws, clientId, ...auth, channels: new Set() };
        this.clients.set(clientId, client);

        logger.info(`WebSocket client connected: ${clientId} (${auth.username}, ${auth.role})`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connection',
          message: 'Connected to CECBS real-time updates',
          clientId,
          role: auth.role,
          timestamp: new Date().toISOString(),
        }));

        // Handle client messages
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleClientMessage(clientId, data);
          } catch (error) {
            logger.error('Invalid WebSocket message:', error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.clients.delete(clientId);
          logger.info(`WebSocket client disconnected: ${clientId}`);
        });

        // Handle errors
        ws.on('error', (error) => {
          logger.error(`WebSocket error for client ${clientId}:`, error);
          this.clients.delete(clientId);
        });
      }).catch((error) => {
        logger.error('WebSocket authentication failed:', error);
        try {
          ws.close(4401, 'Unauthorized');
        } catch {
          // Socket already gone.
        }
      });
    });
  }

  /**
   * Verify the JWT exactly as authMiddleware does: same secret, same
   * revocation list. Accepts ?token= (the browser path) or an
   * Authorization: Bearer header. Returns the identity the socket is
   * bound to, or null when the socket must not be admitted.
   */
  private async authenticate(req: any): Promise<Omit<AuthenticatedSocket, 'ws' | 'clientId' | 'channels'> | null> {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const queryToken = url.searchParams.get('token');
      const header = req.headers?.authorization as string | undefined;
      const token = queryToken || (header?.startsWith('Bearer ') ? header.substring(7) : undefined);
      if (!token) {
        logger.warn('WebSocket connection rejected: no token');
        return null;
      }

      const decoded = jwt.verify(token, getJwtSecret()) as any;
      if (decoded.jti) {
        try {
          if (await isTokenRevoked(decoded.jti)) {
            logger.warn('WebSocket connection rejected: revoked token');
            return null;
          }
        } catch (error: any) {
          // Same posture as authMiddleware: a missing revoked_tokens
          // table (migrations not yet applied) warns once and continues.
          if (error?.message?.includes('revoked_tokens') && error.message.includes('does not exist')) {
            logger.warn('WebSocket auth: revoked_tokens table missing, revocation check skipped');
          } else {
            throw error;
          }
        }
      }

      const role = String(decoded.role || 'EXPORTER');
      const userId = String(decoded.userId || decoded.sub || '');
      if (!userId) return null;
      return {
        userId,
        username: String(decoded.username || userId),
        role,
        baseRole: normalizeNotificationRole(role) || role,
        exporterId: String(decoded.exporterId || decoded.username || decoded.sub || ''),
      };
    } catch (error) {
      logger.warn('WebSocket connection rejected: invalid or expired token');
      return null;
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleClientMessage(clientId: string, data: any): void {
    logger.info(`Message from client ${clientId}:`, data);

    switch (data.type) {
      case 'subscribe':
        this.handleSubscription(clientId, data.channels);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, data.channels);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        logger.warn(`Unknown message type from client ${clientId}:`, data.type);
    }
  }

  /**
   * A client may only subscribe to notification channels matching its own
   * identity. ADMIN may subscribe to any role channel (it sees every
   * row in the feed). Anything else is refused per channel, with the
   * refusal reported back — never silently subscribed.
   */
  private isChannelAllowed(client: AuthenticatedSocket, channel: string): boolean {
    if (channel === 'shipments' || channel === 'contracts' || channel === 'exporters') return true;
    const roleMatch = channel.match(/^notifications:([A-Za-z_ ]+)$/);
    if (roleMatch) {
      const wanted = normalizeNotificationRole(roleMatch[1]);
      return client.baseRole === 'ADMIN' || wanted === client.baseRole;
    }
    const userMatch = channel.match(/^notifications:user:(.+)$/);
    if (userMatch) return userMatch[1] === client.userId;
    const exporterMatch = channel.match(/^notifications:exporter:(.+)$/);
    if (exporterMatch) return exporterMatch[1] === client.exporterId;
    return false;
  }

  private handleSubscription(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    const requested = Array.isArray(channels) ? channels : [];
    const accepted: string[] = [];
    const rejected: string[] = [];
    for (const channel of requested) {
      if (typeof channel !== 'string' || !this.isChannelAllowed(client, channel)) {
        rejected.push(String(channel));
        continue;
      }
      client.channels.add(channel);
      accepted.push(channel);
    }
    logger.info(`Client ${clientId} subscribing to channels:`, accepted);
    if (rejected.length > 0) {
      logger.warn(`Client ${clientId} refused subscription to channels (not their audience):`, rejected);
    }
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      channels: accepted,
      rejected,
      timestamp: new Date().toISOString(),
    });
  }

  private handleUnsubscription(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    const requested = Array.isArray(channels) ? channels : [];
    for (const channel of requested) client.channels.delete(channel);
    logger.info(`Client ${clientId} unsubscribing from channels:`, requested);
    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      channels: requested,
      timestamp: new Date().toISOString(),
    });
  }

  public sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast. With a channel, delivery is limited to clients subscribed
   * to that channel (targeted). Without one, every connected client
   * receives it (legacy behaviour, kept for the notify* helpers below).
   */
  public broadcast(data: any, channel?: string): void {
    const message = JSON.stringify({
      ...data,
      channel,
      timestamp: new Date().toISOString(),
    });

    let delivered = 0;
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState !== WebSocket.OPEN) {
        this.clients.delete(clientId);
        return;
      }
      if (channel && !client.channels.has(channel)) return;
      client.ws.send(message);
      delivered++;
    });

    logger.info(`Broadcasted message to ${delivered} clients`, { channel, type: data.type });
  }

  /**
   * Broadcast one persisted in-app notification row to exactly its
   * audience. Role rows go to the role channel only; exporter rows go to
   * the exporter's user + exporter channels only (never the EXPORTER
   * role channel — that would leak the row to every exporter).
   */
  public notifyNotificationCreated(row: InAppNotificationRow): void {
    const channels: string[] = [];
    if (row.exporterId) {
      channels.push(NOTIFICATION_CHANNELS.forExporter(row.exporterId));
      if (row.userId !== null && row.userId !== undefined) {
        channels.push(NOTIFICATION_CHANNELS.forUser(row.userId));
      }
    } else if (row.role) {
      channels.push(NOTIFICATION_CHANNELS.forRole(row.role));
    } else if (row.userId !== null && row.userId !== undefined) {
      channels.push(NOTIFICATION_CHANNELS.forUser(row.userId));
    }
    if (channels.length === 0) {
      logger.warn(`In-app notification ${row.id} has no WebSocket audience; persisted only`);
      return;
    }
    for (const channel of channels) {
      this.broadcast({ type: 'notification', data: row }, channel);
    }
  }

  // Blockchain event handlers
  public notifyShipmentCreated(shipmentData: any): void {
    this.broadcast({
      type: 'shipment_created',
      data: shipmentData,
    }, 'shipments');
  }

  public notifyShipmentStatusUpdated(shipmentData: any): void {
    this.broadcast({
      type: 'shipment_status_updated',
      data: shipmentData,
    }, 'shipments');
  }

  public notifyContractApproved(contractData: any): void {
    this.broadcast({
      type: 'contract_approved',
      data: contractData,
    }, 'contracts');
  }

  public notifyExporterRegistered(exporterData: any): void {
    this.broadcast({
      type: 'exporter_registered',
      data: exporterData,
    }, 'exporters');
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export default WebSocketService;
