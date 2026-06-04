// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// WebSocket Service for Real-time Updates

import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      logger.info(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to CECBS real-time updates',
        clientId,
        timestamp: new Date().toISOString(),
      }));

      // Handle client messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
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
    });
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

  private handleSubscription(clientId: string, channels: string[]): void {
    // Implementation for channel subscription
    logger.info(`Client ${clientId} subscribing to channels:`, channels);
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      channels,
      timestamp: new Date().toISOString(),
    });
  }

  private handleUnsubscription(clientId: string, channels: string[]): void {
    // Implementation for channel unsubscription
    logger.info(`Client ${clientId} unsubscribing from channels:`, channels);
    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      channels,
      timestamp: new Date().toISOString(),
    });
  }

  public sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  public broadcast(data: any, channel?: string): void {
    const message = JSON.stringify({
      ...data,
      channel,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      } else {
        // Clean up closed connections
        this.clients.delete(clientId);
      }
    });

    logger.info(`Broadcasted message to ${this.clients.size} clients`, { channel, type: data.type });
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