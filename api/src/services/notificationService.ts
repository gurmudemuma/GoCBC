// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unified Notification Service - Email, SMS, Webhook Orchestration

import { logger } from '../utils/logger';
import { DatabaseService } from './databaseService';
import emailService from './emailService';
import smsService from './smsService';
import webhookService from './webhookService';

interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
}

interface NotificationOptions {
  channels?: ('email' | 'sms' | 'webhook')[];
  priority?: 'high' | 'normal' | 'low';
  metadata?: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send multi-channel notification
  async send(
    recipient: NotificationRecipient,
    subject: string,
    message: string,
    options: NotificationOptions = {}
  ): Promise<{ email: boolean; sms: boolean; webhook: boolean }> {
    const { channels = ['email'], priority = 'normal', metadata } = options;
    
    // Get user preferences
    const prefs = await this.getUserPreferences(recipient.userId);
    
    const results = {
      email: false,
      sms: false,
      webhook: false
    };

    // Send via enabled channels
    if (channels.includes('email') && prefs.email_enabled && recipient.email) {
      try {
        await emailService.sendEmail(recipient.email, subject, message, message);
        results.email = true;
      } catch (error) {
        logger.error('Email notification failed:', error);
      }
    }

    if (channels.includes('sms') && prefs.sms_enabled && (recipient.phone || prefs.phone)) {
      try {
        const phone = recipient.phone || prefs.phone;
        if (phone) {
          await smsService.send({ to: phone, message, priority });
          results.sms = true;
        }
      } catch (error) {
        logger.error('SMS notification failed:', error);
      }
    }

    if (channels.includes('webhook') && prefs.webhook_enabled) {
      try {
        await webhookService.trigger('notification.sent', {
          recipient: recipient.userId,
          subject,
          message,
          metadata,
          timestamp: new Date().toISOString()
        });
        results.webhook = true;
      } catch (error) {
        logger.error('Webhook notification failed:', error);
      }
    }

    return results;
  }

  // Get user notification preferences
  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const prefs = await this.db.get(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (!prefs) {
        // Create default preferences
        await this.db.run(`
          INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, webhook_enabled)
          VALUES ($1, true, false, false)
        `, [userId]);

        return { email_enabled: true, sms_enabled: false, webhook_enabled: false };
      }

      return prefs;
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return { email_enabled: true, sms_enabled: false, webhook_enabled: false };
    }
  }

  // Update user preferences
  async updatePreferences(userId: string, preferences: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    webhook_enabled?: boolean;
    phone?: string;
    events?: any;
  }): Promise<boolean> {
    try {
      const fields = [];
      const values = [];
      let idx = 1;

      if (preferences.email_enabled !== undefined) {
        fields.push(`email_enabled = $${idx++}`);
        values.push(preferences.email_enabled);
      }
      if (preferences.sms_enabled !== undefined) {
        fields.push(`sms_enabled = $${idx++}`);
        values.push(preferences.sms_enabled);
      }
      if (preferences.webhook_enabled !== undefined) {
        fields.push(`webhook_enabled = $${idx++}`);
        values.push(preferences.webhook_enabled);
      }
      if (preferences.phone) {
        fields.push(`phone = $${idx++}`);
        values.push(preferences.phone);
      }
      if (preferences.events) {
        fields.push(`events = $${idx++}`);
        values.push(JSON.stringify(preferences.events));
      }

      fields.push(`updated_at = $${idx++}`);
      values.push(new Date().toISOString());

      values.push(userId);

      await this.db.run(`
        UPDATE notification_preferences
        SET ${fields.join(', ')}
        WHERE user_id = $${idx}
      `, values);

      return true;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      return false;
    }
  }

  // ==================== BUSINESS EVENT NOTIFICATIONS ====================

  async notifyApplicationApproved(userId: string, email: string, phone: string, exporterName: string, licenseNumber: string) {
    const subject = 'Exporter Application Approved';
    const message = `Congratulations ${exporterName}! Your exporter application has been approved.\n\nLicense Number: ${licenseNumber}\n\nYou can now login to access your exporter portal and start creating export contracts.`;

    await this.send(
      { userId, email, phone, name: exporterName },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );

    await webhookService.onApplicationApproved(userId, userId, licenseNumber);
  }

  async notifyContractApproved(userId: string, email: string, phone: string, contractId: string, totalValue: number) {
    const subject = 'Export Contract Approved';
    const message = `Your export contract ${contractId} has been approved by ECTA.\n\nContract Value: USD ${totalValue.toLocaleString()}\n\nYou can now proceed to request a Letter of Credit from your bank.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );

    await webhookService.onContractApproved(contractId, userId, totalValue);
  }

  async notifyLCIssued(userId: string, email: string, phone: string, lcId: string, amount: number, currency: string) {
    const subject = 'Letter of Credit Issued';
    const message = `Your Letter of Credit ${lcId} has been issued.\n\nAmount: ${currency} ${amount.toLocaleString()}\n\nYou can now create a shipment and proceed with quality inspection.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );

    await webhookService.onLCIssued(lcId, '', amount, currency);
  }

  async notifyForexAllocated(userId: string, email: string, phone: string, forexId: string, amount: number, retentionRate: number) {
    const subject = 'Forex Allocation Approved';
    const message = `Forex has been allocated for your export.\n\nAmount: USD ${amount.toLocaleString()}\nRetention Rate: ${retentionRate}% (NBE Policy)\n\nThe allocated forex will be utilized upon payment settlement.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email'], priority: 'normal' }
    );

    await webhookService.onForexAllocated(forexId, '', amount, retentionRate);
  }

  async notifyQualityInspectionScheduled(userId: string, email: string, phone: string, shipmentId: string, inspectionDate: string) {
    const subject = 'Quality Inspection Scheduled';
    const message = `Quality inspection has been scheduled for your shipment ${shipmentId}.\n\nInspection Date: ${inspectionDate}\n\nPlease prepare coffee samples for the ECTA quality lab.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'normal' }
    );
  }

  async notifyQualityInspectionPassed(userId: string, email: string, phone: string, shipmentId: string, score: number, certificateNo: string) {
    const subject = 'Quality Inspection Passed';
    const message = `Your shipment ${shipmentId} has passed quality inspection.\n\nCupping Score: ${score}/100\nCertificate: ${certificateNo}\n\nExport permit has been issued. You can now proceed with customs clearance.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );
  }

  async notifyCustomsCleared(userId: string, email: string, phone: string, declarationId: string, clearanceNumber: string) {
    const subject = 'Customs Clearance Approved';
    const message = `Your customs declaration ${declarationId} has been cleared.\n\nClearance Number: ${clearanceNumber}\n\nYour coffee is authorized for export. You can now arrange shipment.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );

    await webhookService.onCustomsCleared(declarationId, '');
  }

  async notifyDocumentDiscrepancy(userId: string, email: string, phone: string, lcId: string, discrepancies: string[]) {
    const subject = 'Document Discrepancy Notice';
    const message = `Discrepancies found in documents for LC ${lcId}:\n\n${discrepancies.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nPlease review and resubmit corrected documents.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );
  }

  async notifyPaymentReleased(userId: string, email: string, phone: string, paymentId: string, amount: number, currency: string) {
    const subject = 'Payment Released';
    const message = `Payment has been released to your account.\n\nPayment ID: ${paymentId}\nAmount: ${currency} ${amount.toLocaleString()}\n\nThe funds should reflect in your account within 1-3 business days.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email', 'sms'], priority: 'high' }
    );

    await webhookService.onPaymentReleased(paymentId, '', amount);
  }

  async notifyShipmentDeparted(userId: string, email: string, phone: string, shipmentId: string, vesselName: string, eta: string) {
    const subject = 'Shipment Departed';
    const message = `Your shipment ${shipmentId} has departed.\n\nVessel: ${vesselName}\nEstimated Arrival: ${eta}\n\nYou can track your shipment in the exporter portal.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email'], priority: 'normal' }
    );
  }

  async notifyApplicationRejected(userId: string, email: string, phone: string, reason: string) {
    const subject = 'Exporter Application Not Approved';
    const message = `We regret to inform you that your exporter application was not approved.\n\nReason: ${reason}\n\nYou may resubmit your application after addressing the issues mentioned above.`;

    await this.send(
      { userId, email, phone },
      subject,
      message,
      { channels: ['email'], priority: 'high' }
    );
  }

  // ==================== SYSTEM ALERTS ====================

  async createSystemAlert(alertType: string, severity: 'critical' | 'warning' | 'info', title: string, message: string, metadata?: any) {
    try {
      await this.db.run(`
        INSERT INTO system_alerts (alert_type, severity, title, message, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [alertType, severity, title, message, JSON.stringify(metadata || {})]);

      // Notify system admins for critical alerts
      if (severity === 'critical') {
        await webhookService.trigger('system.alert', {
          alertType,
          severity,
          title,
          message,
          metadata,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`System alert created: ${title} (${severity})`);
    } catch (error) {
      logger.error('Error creating system alert:', error);
    }
  }

  async resolveSystemAlert(alertId: number, resolvedBy: string) {
    try {
      await this.db.run(`
        UPDATE system_alerts
        SET resolved = true, resolved_at = $1, resolved_by = $2
        WHERE id = $3
      `, [new Date().toISOString(), resolvedBy, alertId]);

      logger.info(`System alert resolved: ${alertId} by ${resolvedBy}`);
    } catch (error) {
      logger.error('Error resolving system alert:', error);
    }
  }
}

export default NotificationService.getInstance();
