// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unified Notification Service - Email, SMS, Webhook Orchestration

import { logger } from '../utils/logger';
import { DatabaseService } from './databaseService';
import EmailService from './emailService';
import smsService from './smsService';
import webhookService from './webhookService';
import { WebSocketService } from './websocketService';
import { normalizeNotificationRole } from '../utils/notificationRoles';

export { normalizeNotificationRole } from '../utils/notificationRoles';

export type InAppNotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface InAppNotificationInput {
  title: string;
  message: string;
  /** Event type, e.g. 'contract_approved' — also the feed's ?type= filter. */
  type: string;
  entityType?: string;
  entityId?: string;
  /** Portal deep link, e.g. '/portals/ecta?tab=contracts' (navigation hint). */
  actionUrl?: string;
  /** Per-role override of actionUrl, keyed by canonical base role. */
  actionUrls?: Record<string, string>;
  severity?: InAppNotificationSeverity;
  /** Canonical base roles to notify (ECTA, ECX, NBE, BANKS, CUSTOMS,
   *  SHIPPING, EXPORTER, ADMIN). Variants are normalised on write. */
  roles?: string[];
  /** Exporter-scoped audience (exporter_id / username). Always set for
   *  exporter notifications — see migration 072. */
  exporterId?: string;
  /** One specific numeric users.id. Rare; resolved best-effort from
   *  exporterId when omitted. */
  userId?: number | string;
  /** LC id to resolve the exporter through when exporterId is unknown
   *  (letters_of_credit -> shipment -> exporter). */
  lcId?: string;
}

export interface InAppNotificationRow {
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

/** Map one notifications DB row to the feed API shape (camelCase). */
export function toInAppNotificationApiRow(row: any): InAppNotificationRow {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    actionUrl: row.action_url ?? null,
    severity: row.severity ?? 'info',
    role: row.role ?? null,
    exporterId: row.exporter_id ?? null,
    userId: row.user_id ?? null,
    read: !!row.read,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
  };
}

const NOTIFICATION_SEVERITIES = new Set(['info', 'success', 'warning', 'critical']);


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
        const emailService = EmailService.getInstance();
        results.email = await emailService.send(recipient.email, subject, message);
      } catch (error) {
        logger.error('Email notification failed:', error);
      }
    }

    if (channels.includes('sms') && prefs.sms_enabled && (recipient.phone || prefs.phone)) {
      try {
        const phone = recipient.phone || prefs.phone;
        if (phone) {
          results.sms = await smsService.send({ to: phone, message, priority });
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
      const fields: string[] = [];
      const values: any[] = [];
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

  // ==================== IN-APP NOTIFICATIONS (persisted feed) ====================
  //
  // The notifications table existed since migration 000 but nothing ever
  // wrote to it (zero INSERTs repo-wide). These methods persist one row per
  // audience (see migration 072 for the addressing model) and broadcast the
  // row over the authenticated WebSocket so the UI bell updates live.
  // They NEVER throw: a notification failure must not fail the workflow
  // operation that triggered it — callers await them directly.

  private async lookupNumericUserId(exporterId: string): Promise<number | null> {
    try {
      const row = await this.db.get(
        'SELECT id FROM users WHERE exporter_id = $1 OR username = $1 LIMIT 1',
        [exporterId]
      );
      return row?.id ?? null;
    } catch {
      return null;
    }
  }

  private async resolveExporterFromShipment(shipmentId: string | null | undefined): Promise<string | null> {
    if (!shipmentId) return null;
    try {
      const row = await this.db.get(
        'SELECT exporter_id FROM shipments WHERE shipment_id = $1',
        [shipmentId]
      );
      return row?.exporter_id || null;
    } catch {
      return null;
    }
  }

  private async resolveExporterFromLc(lcId: string | null | undefined): Promise<string | null> {
    if (!lcId) return null;
    try {
      const row = await this.db.get(
        'SELECT shipment_id FROM letters_of_credit WHERE lc_number = $1',
        [lcId]
      );
      return this.resolveExporterFromShipment(row?.shipment_id);
    } catch {
      return null;
    }
  }

  private async resolveExporterFromContract(contractId: string | null | undefined): Promise<string | null> {
    if (!contractId) return null;
    try {
      const row = await this.db.get(
        'SELECT exporter_id FROM contracts WHERE contract_id = $1',
        [contractId]
      );
      return row?.exporter_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve the exporter audience for an entity id from the Postgres
   * read model, following the entity's own linkage (payment/declaration/
   * forex -> shipment -> exporter, permit -> contract -> exporter,
   * LC -> shipment -> exporter). Returns null when the entity has no
   * exporter linkage (e.g. SWIFT messages are not mirrored in Postgres)
   * — the caller then emits role-only rows.
   */
  async resolveExporterIdForEntity(
    entityType: string | undefined,
    entityId: string | undefined,
    lcId?: string
  ): Promise<string | null> {
    try {
      const type = String(entityType || '').toLowerCase();
      switch (type) {
        case 'contract':
          return this.resolveExporterFromContract(entityId);
        case 'shipment':
          return this.resolveExporterFromShipment(entityId);
        case 'inspection': {
          if (!entityId) return null;
          const row = await this.db.get(
            'SELECT exporter_id FROM quality_inspections WHERE inspection_id = $1',
            [entityId]
          );
          return row?.exporter_id || null;
        }
        case 'lc':
          return this.resolveExporterFromLc(entityId);
        case 'forex': {
          if (!entityId && !lcId) return null;
          const row = entityId ? await this.db.get(
            'SELECT lc_id, shipment_id FROM forex_allocations WHERE forex_id = $1 OR allocation_id = $1',
            [entityId]
          ) : null;
          return (await this.resolveExporterFromShipment(row?.shipment_id))
            || (await this.resolveExporterFromLc(row?.lc_id || lcId));
        }
        case 'payment': {
          if (!entityId && !lcId) return null;
          const row = entityId ? await this.db.get(
            'SELECT shipment_id, lc_number FROM payments WHERE payment_id = $1',
            [entityId]
          ) : null;
          return (await this.resolveExporterFromShipment(row?.shipment_id))
            || (await this.resolveExporterFromLc(row?.lc_number || lcId));
        }
        case 'customs_declaration': {
          if (!entityId) return null;
          const row = await this.db.get(
            'SELECT shipment_id FROM customs_declarations WHERE declaration_id = $1 OR declaration_number = $1',
            [entityId]
          );
          return this.resolveExporterFromShipment(row?.shipment_id);
        }
        case 'permit': {
          if (!entityId) return null;
          const row = await this.db.get(
            'SELECT contract_id FROM export_permits WHERE permit_id = $1',
            [entityId]
          );
          return this.resolveExporterFromContract(row?.contract_id);
        }
        case 'application': {
          if (!entityId) return null;
          const row = await this.db.get(
            'SELECT exporter_id, temp_username FROM exporter_applications WHERE application_id = $1',
            [entityId]
          );
          // A rejected applicant logs in as the temp user (username =
          // temp_username), so that is the feed key until an exporter_id
          // is assigned on approval.
          return row?.exporter_id || row?.temp_username || null;
        }
        default:
          return this.resolveExporterFromLc(lcId);
      }
    } catch (error) {
      logger.warn('Failed to resolve notification exporter audience:', error);
      return null;
    }
  }

  /**
   * Persist one in-app notification row per audience and broadcast each
   * row on its WebSocket channel. Roles are normalised to base roles; an
   * 'EXPORTER' audience is ALWAYS written as the exporter-scoped row
   * (role=EXPORTER + exporter_id) — never as a role broadcast, which
   * would leak it to every exporter. Returns the created rows (empty on
   * any failure). Never throws.
   */
  async createInAppNotification(input: InAppNotificationInput): Promise<InAppNotificationRow[]> {
    const created: InAppNotificationRow[] = [];
    try {
      if (!input.title || !input.message || !input.type) {
        logger.warn('Skipping in-app notification with missing title/message/type');
        return created;
      }
      const severity: string = NOTIFICATION_SEVERITIES.has(input.severity || '')
        ? (input.severity as string)
        : 'info';
      const roles = Array.from(new Set(
        (input.roles || []).map(normalizeNotificationRole).filter((r): r is string => !!r)
      ));
      const exporterId = input.exporterId ? String(input.exporterId) : null;

      let numericUserId: number | null = null;
      if (input.userId !== undefined && input.userId !== null && String(input.userId) !== '') {
        const n = Number(input.userId);
        numericUserId = Number.isFinite(n) ? n : null;
      } else if (exporterId) {
        numericUserId = await this.lookupNumericUserId(exporterId);
      }

      // One target per audience. EXPORTER is deliberately excluded from
      // the role loop: its row is the exporter-scoped one below.
      const targets: Array<{ role: string | null; exporterId: string | null; userId: number | null }> = [];
      for (const role of roles) {
        if (role === 'EXPORTER') {
          if (!exporterId) {
            logger.warn(`In-app notification '${input.type}' asked for EXPORTER audience with no exporterId — exporter row skipped (a role broadcast would leak to all exporters)`);
          }
          continue;
        }
        targets.push({ role, exporterId: null, userId: null });
      }
      if (exporterId) {
        targets.push({ role: 'EXPORTER', exporterId, userId: numericUserId });
      } else if (numericUserId !== null) {
        targets.push({ role: null, exporterId: null, userId: numericUserId });
      }
      if (targets.length === 0) {
        logger.warn(`Skipping in-app notification '${input.type}': no audience (no roles, exporterId, or userId)`);
        return created;
      }

      // De-duplicate identical audiences (e.g. roles: ['BANKS','BANKS']).
      const seen = new Set<string>();
      const uniqueTargets = targets.filter((t) => {
        const key = JSON.stringify(t);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const target of uniqueTargets) {
        const actionUrl = target.role && input.actionUrls?.[target.role]
          ? input.actionUrls[target.role]
          : (input.actionUrl || null);
        const inserted = await this.db.get(
          `INSERT INTO notifications
             (user_id, title, message, type, read, entity_type, entity_id,
              action_url, severity, role, exporter_id)
           VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7, $8, $9, $10)
           RETURNING id, user_id, title, message, type, read, entity_type,
             entity_id, action_url, severity, role, exporter_id, created_at`,
          [
            target.userId, input.title, input.message, input.type,
            input.entityType || null, input.entityId || null, actionUrl,
            severity, target.role, target.exporterId,
          ]
        );
        if (!inserted) continue;
        const row = toInAppNotificationApiRow(inserted);
        created.push(row);
        try {
          WebSocketService.getInstance()?.notifyNotificationCreated(row);
        } catch (wsError) {
          logger.warn('WebSocket broadcast of in-app notification failed (row is persisted):', wsError);
        }
      }
    } catch (error) {
      logger.warn('Failed to create in-app notification (workflow unaffected):', error);
      return created;
    }
    return created;
  }

  /**
   * Workflow-event entry point used by route handlers: resolves the
   * exporter audience from the entity (and lcId) when the caller did not
   * supply one, then persists + broadcasts. Never throws.
   */
  async emitWorkflowEvent(input: InAppNotificationInput): Promise<InAppNotificationRow[]> {
    try {
      const exporterId = input.exporterId
        || await this.resolveExporterIdForEntity(input.entityType, input.entityId, input.lcId)
        || undefined;
      return this.createInAppNotification({ ...input, exporterId });
    } catch (error) {
      logger.warn('Failed to emit workflow notification (workflow unaffected):', error);
      return [];
    }
  }

  /** One-line helper for the email/SMS notify* methods below: the
   *  exporter-scoped in-app row that accompanies the external send. */
  private async inAppForExporter(
    opts: Omit<InAppNotificationInput, 'exporterId' | 'roles'> & { roles?: string[] },
    exporterId: string
  ): Promise<void> {
    await this.createInAppNotification({ roles: ['EXPORTER'], ...opts, exporterId });
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
    await this.inAppForExporter({ type: 'application_approved', title: 'Exporter application approved', message: `Your exporter application has been approved. Licence number: ${licenseNumber}.`, entityType: 'application', entityId: userId, severity: 'success', actionUrl: '/portals/exporter' }, userId);
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
    await this.inAppForExporter({ type: 'contract_approved', title: `Contract ${contractId} approved`, message: `Your export contract ${contractId} has been approved by ECTA (value USD ${totalValue.toLocaleString()}). You can now proceed to request a Letter of Credit.`, entityType: 'contract', entityId: contractId, severity: 'success', actionUrl: '/portals/exporter?tab=contracts' }, userId);
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
    await this.inAppForExporter({ type: 'lc_issued', title: `Letter of Credit ${lcId} issued`, message: `Your Letter of Credit ${lcId} has been issued (${currency} ${amount.toLocaleString()}). You can now create a shipment and proceed with quality inspection.`, entityType: 'lc', entityId: lcId, severity: 'success', roles: ['EXPORTER', 'BANKS'], actionUrl: '/portals/exporter?tab=contracts' }, userId);
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
    await this.inAppForExporter({ type: 'forex_allocated', title: 'Forex allocated', message: `Forex has been allocated for your export (USD ${amount.toLocaleString()}, retention ${retentionRate}%).`, entityType: 'forex', entityId: forexId, severity: 'success', roles: ['EXPORTER', 'NBE'], actionUrl: '/portals/exporter?tab=contracts' }, userId);
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
    await this.inAppForExporter({ type: 'inspection_required', title: `Quality inspection scheduled for shipment ${shipmentId}`, message: `Quality inspection has been scheduled for your shipment ${shipmentId} (inspection date: ${inspectionDate}). Please prepare coffee samples for the ECTA quality lab.`, entityType: 'shipment', entityId: shipmentId, severity: 'info', roles: ['EXPORTER', 'ECTA'], actionUrl: '/portals/exporter?tab=quality' }, userId);
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
    await this.inAppForExporter({ type: 'inspection_passed', title: `Shipment ${shipmentId} passed quality inspection`, message: `Your shipment ${shipmentId} has passed quality inspection (cupping score ${score}/100, certificate ${certificateNo}).`, entityType: 'shipment', entityId: shipmentId, severity: 'success', roles: ['EXPORTER', 'ECTA'], actionUrl: '/portals/exporter?tab=quality' }, userId);
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
    await this.inAppForExporter({ type: 'customs_cleared', title: `Customs declaration ${declarationId} cleared`, message: `Your customs declaration ${declarationId} has been cleared (clearance ${clearanceNumber}). Your coffee is authorised for export.`, entityType: 'customs_declaration', entityId: declarationId, severity: 'success', roles: ['EXPORTER', 'SHIPPING'], actionUrl: '/portals/exporter?tab=customs' }, userId);
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
    await this.inAppForExporter({ type: 'document_discrepancy', title: `Document discrepancy on LC ${lcId}`, message: `Discrepancies found in documents for LC ${lcId}: ${discrepancies.join('; ')}. Please review and resubmit corrected documents.`, entityType: 'lc', entityId: lcId, severity: 'warning', roles: ['EXPORTER', 'BANKS'], actionUrl: '/portals/exporter?tab=contracts' }, userId);
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
    await this.inAppForExporter({ type: 'payment_released', title: `Payment ${paymentId} released`, message: `Payment ${paymentId} has been released to your account (${currency} ${amount.toLocaleString()}).`, entityType: 'payment', entityId: paymentId, severity: 'success', roles: ['EXPORTER', 'BANKS'], actionUrl: '/portals/exporter?tab=payments' }, userId);
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
    await this.inAppForExporter({ type: 'shipment_departed', title: `Shipment ${shipmentId} departed`, message: `Your shipment ${shipmentId} has departed (vessel ${vesselName}, ETA ${eta}).`, entityType: 'shipment', entityId: shipmentId, severity: 'info', actionUrl: '/portals/exporter?tab=shipments' }, userId);
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
    await this.inAppForExporter({ type: 'application_rejected', title: 'Exporter application not approved', message: `Your exporter application was not approved. Reason: ${reason}. You may resubmit after addressing the issues.`, entityType: 'application', entityId: userId, severity: 'warning', actionUrl: '/portals/exporter' }, userId);
  }

  // ==================== SYSTEM ALERTS ====================

  async createSystemAlert(alertType: string, severity: 'critical' | 'warning' | 'info', title: string, message: string, metadata?: any) {
    try {
      await this.db.run(`
        INSERT INTO system_alerts (alert_type, severity, title, message, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [alertType, severity, title, message, JSON.stringify(metadata || {})]);

    } catch (error) {
      logger.error('Error creating system alert:', error);
      throw error;
    }

    // Alert persistence is the operation's success condition. A failed
    // secondary webhook must not hide a saved alert or report it as unsaved.
    if (severity === 'critical') {
      try {
        await webhookService.trigger('system.alert', {
          alertType,
          severity,
          title,
          message,
          metadata,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('System alert was saved, but its webhook notification failed:', error);
      }
    }

    logger.info(`System alert created: ${title} (${severity})`);
  }

  async resolveSystemAlert(alertId: number, resolvedBy: string) {
    try {
      const result = await this.db.run(`
        UPDATE system_alerts
        SET resolved = true, resolved_at = $1, resolved_by = $2
        WHERE id = $3 AND resolved = false
      `, [new Date().toISOString(), resolvedBy, alertId]);

      const resolved = result.rowCount === 1;
      if (resolved) {
      logger.info(`System alert resolved: ${alertId} by ${resolvedBy}`);
      }
      return resolved;
    } catch (error) {
      logger.error('Error resolving system alert:', error);
      throw error;
    }
  }
}

export default NotificationService.getInstance();
