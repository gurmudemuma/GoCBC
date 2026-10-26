// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// SMS Notification Service - Twilio/Africa's Talking Integration

import { logger } from '../utils/logger';
import axios from 'axios';

interface SMSConfig {
  provider: 'twilio' | 'africastalking' | 'mock';
  apiKey?: string;
  apiSecret?: string;
  senderId?: string;
}

interface SMSMessage {
  to: string;
  message: string;
  priority?: 'high' | 'normal' | 'low';
}

export class SMSService {
  private static instance: SMSService;
  private config: SMSConfig;

  private constructor() {
    this.config = {
      provider: (process.env.SMS_PROVIDER as any) || 'mock',
      apiKey: process.env.SMS_API_KEY,
      apiSecret: process.env.SMS_API_SECRET,
      senderId: process.env.SMS_SENDER_ID || 'CECBS',
    };
  }

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  // Send SMS notification
  async send(message: SMSMessage): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'africastalking':
          return await this.sendViaAfricasTalking(message);
        case 'twilio':
          return await this.sendViaTwilio(message);
        case 'mock':
        default:
          return await this.sendViaMock(message);
      }
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return false;
    }
  }

  // Send bulk SMS
  async sendBulk(messages: SMSMessage[]): Promise<{ sent: number; failed: number }> {
    const results = await Promise.all(messages.map(msg => this.send(msg)));
    return {
      sent: results.filter(r => r).length,
      failed: results.filter(r => !r).length
    };
  }

  // Africa's Talking implementation
  private async sendViaAfricasTalking(message: SMSMessage): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        {
          username: 'cecbs',
          to: message.to,
          message: message.message,
          from: this.config.senderId
        },
        {
          headers: {
            'apiKey': this.config.apiKey || '',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info(`SMS sent via Africa's Talking to ${message.to}`);
      return response.data.SMSMessageData.Recipients[0].status === 'Success';
    } catch (error) {
      logger.error('Africa\'s Talking SMS error:', error);
      return false;
    }
  }

  // Twilio implementation
  private async sendViaTwilio(message: SMSMessage): Promise<boolean> {
    try {
      const accountSid = this.config.apiKey;
      const authToken = this.config.apiSecret;
      
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          To: message.to,
          From: this.config.senderId || '',
          Body: message.message
        }),
        {
          auth: {
            username: accountSid || '',
            password: authToken || ''
          }
        }
      );

      logger.info(`SMS sent via Twilio to ${message.to}`);
      return response.data.status === 'queued' || response.data.status === 'sent';
    } catch (error) {
      logger.error('Twilio SMS error:', error);
      return false;
    }
  }

  // Mock implementation for development
  private async sendViaMock(message: SMSMessage): Promise<boolean> {
    logger.info(`[MOCK SMS] To: ${message.to}, Message: ${message.message}`);
    return true;
  }

  // Pre-defined notification templates
  async sendApplicationApproved(phone: string, exporterName: string, licenseNumber: string): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Congratulations ${exporterName}! Your exporter application has been approved. License: ${licenseNumber}. Login to access your portal.`,
      priority: 'high'
    });
  }

  async sendContractApproved(phone: string, contractId: string): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Contract ${contractId} has been approved by ECTA. You can now request Letter of Credit.`,
      priority: 'high'
    });
  }

  async sendLCIssued(phone: string, lcId: string, amount: number): Promise<boolean> {
    return this.send({
      to: phone,
      message: `LC ${lcId} has been issued for USD ${amount.toLocaleString()}. You can now create shipment.`,
      priority: 'high'
    });
  }

  async sendForexAllocated(phone: string, amount: number, retentionRate: number): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Forex allocated: USD ${amount.toLocaleString()} with ${retentionRate}% retention as per NBE policy.`,
      priority: 'normal'
    });
  }

  async sendCustomsCleared(phone: string, declarationId: string): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Customs declaration ${declarationId} has been cleared. Export authorized.`,
      priority: 'high'
    });
  }

  async sendPaymentReleased(phone: string, amount: number): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Payment of USD ${amount.toLocaleString()} has been released to your account.`,
      priority: 'high'
    });
  }

  async sendQualityInspectionScheduled(phone: string, shipmentId: string, date: string): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Quality inspection for shipment ${shipmentId} scheduled on ${date}. Please prepare samples.`,
      priority: 'normal'
    });
  }

  async sendDocumentDiscrepancy(phone: string, lcId: string, reason: string): Promise<boolean> {
    return this.send({
      to: phone,
      message: `Document discrepancy found for LC ${lcId}: ${reason}. Please review and resubmit.`,
      priority: 'high'
    });
  }
}

export default SMSService.getInstance();
