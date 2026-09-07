// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Webhook Service - External System Integration

import { logger } from '../utils/logger';
import axios from 'axios';
import crypto from 'crypto';
import { DatabaseService } from './databaseService';

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  retryAttempts?: number;
  timeout?: number;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
}

export class WebhookService {
  private static instance: WebhookService;
  private db: DatabaseService;
  private webhooks: Map<string, WebhookConfig> = new Map();

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.loadWebhooks();
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  // Load webhook configurations from database
  private async loadWebhooks() {
    try {
      const webhooks = await this.db.all(`
        SELECT * FROM webhooks WHERE active = true
      `);

      webhooks.forEach((wh: any) => {
        this.webhooks.set(wh.id, {
          url: wh.url,
          secret: wh.secret,
          events: typeof wh.events === 'string' ? JSON.parse(wh.events) : wh.events || [],
          active: wh.active,
          retryAttempts: wh.retry_attempts || 3,
          timeout: wh.timeout || 10000
        });
      });

      logger.info(`Loaded ${webhooks.length} active webhooks`);
    } catch (error) {
      logger.error('Error loading webhooks:', error);
    }
  }

  // Register new webhook
  async register(config: WebhookConfig & { name: string; organization: string }): Promise<string> {
    const webhookId = `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await this.db.run(`
        INSERT INTO webhooks (id, name, organization, url, secret, events, active, retry_attempts, timeout)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        webhookId,
        config.name,
        config.organization,
        config.url,
        config.secret,
        JSON.stringify(config.events),
        config.active,
        config.retryAttempts || 3,
        config.timeout || 10000
      ]);

      this.webhooks.set(webhookId, config);
      logger.info(`Webhook registered: ${webhookId} for ${config.organization}`);
      
      return webhookId;
    } catch (error) {
      logger.error('Error registering webhook:', error);
      throw error;
    }
  }

  // Trigger webhook
  async trigger(event: string, data: any) {
    const relevantWebhooks = Array.from(this.webhooks.entries())
      .filter(([_, config]) => config.active && config.events.includes(event));

    if (relevantWebhooks.length === 0) {
      logger.debug(`No webhooks configured for event: ${event}`);
      return;
    }

    logger.info(`Triggering ${relevantWebhooks.length} webhooks for event: ${event}`);

    for (const [webhookId, config] of relevantWebhooks) {
      await this.send(webhookId, config, event, data);
    }
  }

  // Send webhook with retries
  private async send(webhookId: string, config: WebhookConfig, event: string, data: any, attempt: number = 1) {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Generate HMAC signature
    payload.signature = this.generateSignature(payload, config.secret);

    try {
      const response = await axios.post(config.url, payload, {
        timeout: config.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': payload.signature,
          'X-Webhook-Event': event,
          'X-Webhook-ID': webhookId
        }
      });

      // Log successful delivery
      await this.logWebhookDelivery(webhookId, event, 'success', response.status);
      
      logger.info(`Webhook delivered: ${webhookId} for event ${event} (attempt ${attempt})`);
    } catch (error: any) {
      logger.error(`Webhook delivery failed: ${webhookId} for event ${event} (attempt ${attempt})`, error.message);

      // Retry logic
      if (attempt < (config.retryAttempts || 3)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
        logger.info(`Retrying webhook ${webhookId} in ${delay}ms...`);
        
        setTimeout(() => {
          this.send(webhookId, config, event, data, attempt + 1);
        }, delay);
      } else {
        // Log failed delivery after all retries
        await this.logWebhookDelivery(webhookId, event, 'failed', 0, error.message);
      }
    }
  }

  // Generate HMAC signature for webhook verification
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify({
      event: payload.event,
      timestamp: payload.timestamp,
      data: payload.data
    });
    
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  // Verify webhook signature (for incoming webhooks)
  verifySignature(payload: WebhookPayload, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Log webhook delivery
  private async logWebhookDelivery(webhookId: string, event: string, status: string, statusCode: number, error?: string) {
    try {
      await this.db.run(`
        INSERT INTO webhook_logs (webhook_id, event, status, status_code, error, delivered_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [webhookId, event, status, statusCode, error || null, new Date().toISOString()]);
    } catch (err) {
      logger.error('Error logging webhook delivery:', err);
    }
  }

  // Pre-defined event triggers
  async onApplicationApproved(applicationId: string, exporterId: string, licenseNumber: string) {
    await this.trigger('application.approved', {
      applicationId,
      exporterId,
      licenseNumber,
      approvedAt: new Date().toISOString()
    });
  }

  async onContractApproved(contractId: string, exporterId: string, totalValue: number) {
    await this.trigger('contract.approved', {
      contractId,
      exporterId,
      totalValue,
      approvedAt: new Date().toISOString()
    });
  }

  async onLCIssued(lcId: string, contractId: string, amount: number, currency: string) {
    await this.trigger('lc.issued', {
      lcId,
      contractId,
      amount,
      currency,
      issuedAt: new Date().toISOString()
    });
  }

  async onForexAllocated(forexId: string, lcId: string, amount: number, retentionRate: number) {
    await this.trigger('forex.allocated', {
      forexId,
      lcId,
      amount,
      retentionRate,
      allocatedAt: new Date().toISOString()
    });
  }

  async onCustomsCleared(declarationId: string, shipmentId: string) {
    await this.trigger('customs.cleared', {
      declarationId,
      shipmentId,
      clearedAt: new Date().toISOString()
    });
  }

  async onPaymentReleased(paymentId: string, lcId: string, amount: number) {
    await this.trigger('payment.released', {
      paymentId,
      lcId,
      amount,
      releasedAt: new Date().toISOString()
    });
  }

  async onShipmentCreated(shipmentId: string, contractId: string, quantity: number) {
    await this.trigger('shipment.created', {
      shipmentId,
      contractId,
      quantity,
      createdAt: new Date().toISOString()
    });
  }

  async onQualityInspectionCompleted(inspectionId: string, shipmentId: string, passed: boolean, score: number) {
    await this.trigger('inspection.completed', {
      inspectionId,
      shipmentId,
      passed,
      score,
      completedAt: new Date().toISOString()
    });
  }
}

export default WebhookService.getInstance();
