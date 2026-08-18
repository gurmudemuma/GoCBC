// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Complete End-to-End Traceability Service
// Tracks entire lifecycle: Application → Registration → Contract → LC → Quality → Shipment → Payment → Customs → Delivery

import { DatabaseService } from './databaseService';
import { FabricService } from './fabricService';
import { AuditService } from './auditService';
import { logger } from '../utils/logger';

export interface TraceabilityTimeline {
  exporterId: string;
  exporterName: string;
  status: string;
  currentStage: string;
  progress: number; // 0-100%
  stages: TraceabilityStage[];
  contracts: ContractTrace[];
  overallMetrics: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    totalValue: number;
    currency: string;
  };
}

export interface TraceabilityStage {
  stage: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
  performer?: string;
  organization?: string;
  blockchainTxId?: string;
  details: any;
  auditLogs: any[];
}

export interface ContractTrace {
  contractId: string;
  status: string;
  buyer: string;
  buyerCountry: string;
  quantity: number;
  value: number;
  currency: string;
  createdAt: string;
  stages: {
    registration: StageInfo;
    ectaApproval: StageInfo;
    lcRequest: StageInfo;
    lcIssuance: StageInfo;
    qualityInspection: StageInfo;
    ectaPermit: StageInfo;
    shipment: StageInfo;
    customsClearance: StageInfo;
    payment: StageInfo;
    delivery: StageInfo;
  };
  timeline: TimelineEvent[];
  blockchainVerified: boolean;
}

export interface StageInfo {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'NOT_APPLICABLE';
  completedAt?: string;
  performer?: string;
  organization?: string;
  blockchainTxId?: string;
  details?: any;
}

export interface TimelineEvent {
  timestamp: string;
  stage: string;
  action: string;
  performer: string;
  organization: string;
  details: string;
  blockchainTxId?: string;
  blockchainVerified: boolean;
}

export class TraceabilityService {
  private static instance: TraceabilityService;
  private db: DatabaseService;
  private fabric: FabricService;
  private audit: AuditService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.fabric = FabricService.getInstance();
    this.audit = AuditService.getInstance();
  }

  public static getInstance(): TraceabilityService {
    if (!TraceabilityService.instance) {
      TraceabilityService.instance = new TraceabilityService();
    }
    return TraceabilityService.instance;
  }

  /**
   * Get complete end-to-end traceability for an exporter
   * Shows full lifecycle from application to delivery
   */
  async getExporterTraceability(exporterId: string): Promise<TraceabilityTimeline> {
    try {
      // 1. Get exporter details
      const exporterResult = await this.db.query(
        `SELECT * FROM exporter_applications 
         WHERE exporter_id = $1
         LIMIT 1`,
        [exporterId]
      );

      if (exporterResult.rows.length === 0) {
        throw new Error(`Exporter ${exporterId} not found`);
      }

      const exporter = exporterResult.rows[0];

      // 2. Get all stages for this exporter
      const stages = await this.getExporterStages(exporterId);

      // 3. Get all contracts for this exporter
      const contracts = await this.getExporterContracts(exporterId);

      // 4. Calculate overall metrics
      const metrics = {
        totalContracts: contracts.length,
        activeContracts: contracts.filter(c => 
          !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(c.status)
        ).length,
        completedContracts: contracts.filter(c => c.status === 'COMPLETED').length,
        totalValue: contracts.reduce((sum, c) => sum + c.value, 0),
        currency: 'USD'
      };

      // 5. Calculate current stage and progress
      const { currentStage, progress } = this.calculateProgress(stages, contracts);

      return {
        exporterId,
        exporterName: exporter.company_name,
        status: exporter.status,
        currentStage,
        progress,
        stages,
        contracts,
        overallMetrics: metrics
      };
    } catch (error) {
      logger.error(`Failed to get exporter traceability:`, error);
      throw error;
    }
  }

  /**
   * Get complete traceability for a specific contract
   * Shows full journey from registration to delivery
   */
  async getContractTraceability(contractId: string): Promise<ContractTrace> {
    try {
      // 1. Get contract from blockchain
      const contractResult = await this.fabric.queryChaincode('ReadSalesContract', [contractId]);
      
      if (!contractResult.success || !contractResult.data) {
        throw new Error(`Contract ${contractId} not found on blockchain`);
      }

      const contract = contractResult.data;

      // 2. Build contract trace with all stages
      const trace: ContractTrace = {
        contractId,
        status: contract.Status || contract.status,
        buyer: contract.BuyerID || contract.buyerId,
        buyerCountry: contract.BuyerCountry || contract.buyerCountry,
        quantity: parseFloat(contract.Quantity || contract.quantity),
        value: parseFloat(contract.Quantity || contract.quantity) * parseFloat(contract.PricePerKg || contract.pricePerKg),
        currency: contract.Currency || contract.currency,
        createdAt: contract.CreatedAt || contract.createdAt,
        stages: {
          registration: await this.getStageInfo('CONTRACT', contractId, 'CREATE'),
          ectaApproval: await this.getStageInfo('CONTRACT', contractId, 'APPROVE'),
          lcRequest: await this.getStageInfo('LC', contractId, 'CREATE'),
          lcIssuance: await this.getStageInfo('LC', contractId, 'ISSUE'),
          qualityInspection: await this.getStageInfo('INSPECTION', contractId, 'INSPECT'),
          ectaPermit: await this.getStageInfo('INSPECTION', contractId, 'ISSUE'),
          shipment: await this.getStageInfo('SHIPMENT', contractId, 'CREATE'),
          customsClearance: await this.getStageInfo('DECLARATION', contractId, 'CLEAR'),
          payment: await this.getStageInfo('PAYMENT', contractId, 'SETTLE'),
          delivery: await this.getStageInfo('SHIPMENT', contractId, 'DELIVER')
        },
        timeline: [],
        blockchainVerified: true
      };

      // 3. Build timeline from audit logs
      trace.timeline = await this.buildTimeline(contractId);

      return trace;
    } catch (error) {
      logger.error(`Failed to get contract traceability:`, error);
      throw error;
    }
  }

  /**
   * Get all stages for an exporter's journey
   */
  private async getExporterStages(exporterId: string): Promise<TraceabilityStage[]> {
    const stages: TraceabilityStage[] = [];

    // Stage 1: Application Submission
    const application = await this.db.query(
      `SELECT * FROM exporter_applications WHERE exporter_id = $1`,
      [exporterId]
    );

    if (application.rows.length > 0) {
      const app = application.rows[0];
      const appAuditLogs = await this.audit.getEntityLogs('EXPORTER_APPLICATION', app.application_id);
      
      stages.push({
        stage: 'APPLICATION_SUBMISSION',
        status: 'COMPLETED',
        completedAt: app.submitted_at,
        performer: app.company_name,
        organization: 'EXPORTER',
        details: {
          applicationId: app.application_id,
          companyName: app.company_name,
          exporterType: app.exporter_type,
          submittedAt: app.submitted_at
        },
        auditLogs: appAuditLogs
      });
    }

    // Stage 2: ECTA Review & Approval
    if (application.rows.length > 0) {
      const app = application.rows[0];
      const isApproved = app.status === 'approved';
      const approvalAuditLogs = await this.audit.getEntityLogs('EXPORTER_APPLICATION', app.application_id);
      
      stages.push({
        stage: 'ECTA_REVIEW',
        status: isApproved ? 'COMPLETED' : app.status === 'rejected' ? 'FAILED' : 'IN_PROGRESS',
        completedAt: app.approved_at || app.rejected_at,
        performer: app.reviewed_by || 'ECTA Officer',
        organization: 'ECTA',
        details: {
          status: app.status,
          reviewedBy: app.reviewed_by,
          reviewedAt: app.approved_at || app.rejected_at,
          ectaLicenseNumber: app.ecta_license_number,
          rejectionReason: app.rejection_reason
        },
        auditLogs: approvalAuditLogs.filter(log => log.action !== 'CREATE')
      });
    }

    // Stage 3: Blockchain Registration
    if (this.fabric.isConnected()) {
      const exporterResult = await this.fabric.queryChaincode('ReadExporter', [exporterId]);
      if (exporterResult.success && exporterResult.data) {
        const bcAuditLogs = await this.audit.getEntityLogs('EXPORTER', exporterId);
        
        stages.push({
          stage: 'BLOCKCHAIN_REGISTRATION',
          status: 'COMPLETED',
          completedAt: exporterResult.data.CreatedAt || exporterResult.data.createdAt,
          performer: 'ECTA Admin',
          organization: 'ECTA',
          blockchainTxId: bcAuditLogs.find(log => log.action === 'CREATE')?.metadata?.blockchainTxId,
          details: {
            exporterId,
            status: exporterResult.data.Status || exporterResult.data.status,
            blockchainVerified: true
          },
          auditLogs: bcAuditLogs
        });
      }
    }

    // Stage 4: Contract Registration
    const contracts = await this.getExporterContracts(exporterId);
    if (contracts.length > 0) {
      stages.push({
        stage: 'CONTRACT_REGISTRATION',
        status: 'COMPLETED',
        completedAt: contracts[0].createdAt,
        performer: exporterId,
        organization: 'EXPORTER',
        details: {
          totalContracts: contracts.length,
          activeContracts: contracts.filter(c => !['COMPLETED', 'REJECTED'].includes(c.status)).length
        },
        auditLogs: []
      });
    }

    // Stage 5: Active Trading
    const activeContracts = contracts.filter(c => !['COMPLETED', 'REJECTED'].includes(c.status));
    if (activeContracts.length > 0) {
      stages.push({
        stage: 'ACTIVE_TRADING',
        status: 'IN_PROGRESS',
        details: {
          activeContracts: activeContracts.length,
          totalValue: activeContracts.reduce((sum, c) => sum + c.value, 0),
          countries: [...new Set(activeContracts.map(c => c.buyerCountry))]
        },
        auditLogs: []
      });
    }

    return stages;
  }

  /**
   * Get all contracts for an exporter with their current status
   */
  private async getExporterContracts(exporterId: string): Promise<ContractTrace[]> {
    const contracts: ContractTrace[] = [];

    try {
      if (!this.fabric.isConnected()) {
        return contracts;
      }

      // Get all contracts from blockchain
      const allContractsResult = await this.fabric.queryChaincode('QueryAllContracts', []);
      
      if (!allContractsResult.success || !allContractsResult.data) {
        return contracts;
      }

      const allContracts = Array.isArray(allContractsResult.data) ? 
        allContractsResult.data : [allContractsResult.data];

      // Filter by exporter
      const exporterContracts = allContracts.filter((c: any) => 
        (c.ExporterID || c.exporterId) === exporterId
      );

      // Build trace for each contract
      for (const contract of exporterContracts) {
        const contractId = contract.ContractID || contract.contractId;
        const trace = await this.getContractTraceability(contractId);
        contracts.push(trace);
      }
    } catch (error) {
      logger.error('Failed to get exporter contracts:', error);
    }

    return contracts;
  }

  /**
   * Get stage information from blockchain audit logs
   */
  private async getStageInfo(entityType: string, entityId: string, action: string): Promise<StageInfo> {
    try {
      // Query audit logs from database
      const logs = await this.db.query(
        `SELECT * FROM audit_trail 
         WHERE entity_type = $1 AND entity_id = $2 AND action = $3
         ORDER BY created_at DESC LIMIT 1`,
        [entityType, entityId, action]
      );

      if (logs.rows.length > 0) {
        const log = logs.rows[0];
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;

        return {
          status: 'COMPLETED',
          completedAt: log.created_at,
          performer: log.performed_by,
          organization: log.performed_by_org,
          blockchainTxId: metadata.blockchainTxId,
          details: metadata
        };
      }

      return {
        status: 'PENDING'
      };
    } catch (error) {
      logger.error(`Failed to get stage info for ${entityType} ${entityId}:`, error);
      return {
        status: 'NOT_APPLICABLE'
      };
    }
  }

  /**
   * Build timeline from audit logs
   */
  private async buildTimeline(contractId: string): Promise<TimelineEvent[]> {
    const timeline: TimelineEvent[] = [];

    try {
      // Get all audit logs related to this contract
      const logs = await this.db.query(
        `SELECT * FROM audit_trail 
         WHERE entity_id = $1 OR metadata->>'contractId' = $1
         ORDER BY created_at ASC`,
        [contractId]
      );

      for (const log of logs.rows) {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;

        timeline.push({
          timestamp: log.created_at,
          stage: this.mapEntityTypeToStage(log.entity_type),
          action: log.action,
          performer: log.performed_by,
          organization: log.performed_by_org,
          details: log.reason || `${log.action} on ${log.entity_type}`,
          blockchainTxId: metadata.blockchainTxId,
          blockchainVerified: metadata.blockchainVerified || false
        });
      }
    } catch (error) {
      logger.error('Failed to build timeline:', error);
    }

    return timeline;
  }

  /**
   * Map entity types to lifecycle stages
   */
  private mapEntityTypeToStage(entityType: string): string {
    const stageMap: { [key: string]: string } = {
      'CONTRACT': 'Contract Registration',
      'LC': 'Letter of Credit',
      'INSPECTION': 'Quality Inspection',
      'SHIPMENT': 'Shipping',
      'DECLARATION': 'Customs',
      'PAYMENT': 'Payment',
      'EXPORTER': 'Exporter Registration'
    };

    return stageMap[entityType] || entityType;
  }

  /**
   * Calculate current stage and overall progress
   */
  private calculateProgress(stages: TraceabilityStage[], contracts: ContractTrace[]): {
    currentStage: string;
    progress: number;
  } {
    // Find last completed stage
    const completedStages = stages.filter(s => s.status === 'COMPLETED');
    const inProgressStages = stages.filter(s => s.status === 'IN_PROGRESS');

    let currentStage = 'Not Started';
    if (inProgressStages.length > 0) {
      currentStage = inProgressStages[0].stage;
    } else if (completedStages.length > 0) {
      currentStage = completedStages[completedStages.length - 1].stage;
    }

    // Calculate progress percentage
    const totalStages = stages.length;
    const progress = totalStages > 0 ? 
      Math.round((completedStages.length / totalStages) * 100) : 0;

    return { currentStage, progress };
  }

  /**
   * Get system-wide traceability statistics
   */
  async getSystemStatistics(): Promise<any> {
    try {
      const stats = {
        exporters: {
          total: 0,
          active: 0,
          pending: 0
        },
        contracts: {
          total: 0,
          active: 0,
          completed: 0
        },
        shipments: {
          total: 0,
          inTransit: 0,
          delivered: 0
        },
        payments: {
          total: 0,
          pending: 0,
          completed: 0
        },
        auditLogs: {
          total: 0,
          blockchainVerified: 0
        }
      };

      // Get exporter stats
      const exporterStats = await this.db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as active,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM exporter_applications
      `);
      stats.exporters = exporterStats.rows[0];

      // Get audit log stats
      const auditStats = await this.db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE metadata->>'blockchainVerified' = 'true') as blockchain_verified
        FROM audit_trail
      `);
      stats.auditLogs = {
        total: parseInt(auditStats.rows[0].total),
        blockchainVerified: parseInt(auditStats.rows[0].blockchain_verified)
      };

      // Get blockchain stats if connected
      if (this.fabric.isConnected()) {
        const contractsResult = await this.fabric.queryChaincode('QueryAllContracts', []);
        if (contractsResult.success && contractsResult.data) {
          const contracts = Array.isArray(contractsResult.data) ? 
            contractsResult.data : [contractsResult.data];
          
          stats.contracts.total = contracts.length;
          stats.contracts.active = contracts.filter((c: any) => 
            (c.Status || c.status) === 'APPROVED').length;
          stats.contracts.completed = contracts.filter((c: any) => 
            (c.Status || c.status) === 'COMPLETED').length;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get system statistics:', error);
      throw error;
    }
  }
}

export default TraceabilityService.getInstance();
