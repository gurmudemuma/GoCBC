/**
 * Multi-Party Approval Rules Service
 * Manages approval requirements and workflow validation
 */

import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';

const dbService = DatabaseService.getInstance();

export interface ApprovalRequirement {
  id: number;
  documentType: string;
  entityType: string;
  minApprovers: number;
  requiredRoles: string[];
  approvalOrder: 'parallel' | 'sequential';
  description: string;
  active: boolean;
}

export interface ApprovalWorkflowState {
  id?: number;
  documentId: string;
  entityType: string;
  documentType: string;
  requiredApprovals: number;
  currentApprovals: number;
  approvalStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
  approvedBy: string[];
  rejectedBy?: string;
  rejectionReason?: string;
  completedAt?: Date;
}

export interface ApprovalValidation {
  canApprove: boolean;
  reason?: string;
  isComplete: boolean;
  requiresApproval: boolean;
  currentApprovals: number;
  requiredApprovals: number;
  approvedBy: string[];
  nextRequiredRole?: string;
}

class ApprovalRulesService {
  /**
   * Get approval requirements for a document type
   */
  async getRequirements(documentType: string, entityType: string): Promise<ApprovalRequirement | null> {
    try {
      const result = await dbService.get(
        `SELECT id, document_type as "documentType", entity_type as "entityType",
                min_approvers as "minApprovers", required_roles as "requiredRoles",
                approval_order as "approvalOrder", description, active
         FROM approval_requirements
         WHERE document_type = $1 AND entity_type = $2 AND active = true`,
        [documentType, entityType]
      );

      return result || null;
    } catch (error) {
      logger.error('[ApprovalRules] Error fetching requirements:', error);
      return null;
    }
  }

  /**
   * Check if a document type requires multi-party approval
   */
  async requiresMultiPartyApproval(documentType: string, entityType: string): Promise<boolean> {
    const requirements = await this.getRequirements(documentType, entityType);
    return requirements !== null && requirements.minApprovers > 1;
  }

  /**
   * Get or create workflow state for a document
   */
  async getOrCreateWorkflowState(
    documentId: string,
    documentType: string,
    entityType: string
  ): Promise<ApprovalWorkflowState | null> {
    try {
      // Check if workflow exists
      let workflow = await dbService.get(
        `SELECT id, document_id as "documentId", entity_type as "entityType",
                document_type as "documentType", required_approvals as "requiredApprovals",
                current_approvals as "currentApprovals", approval_status as "approvalStatus",
                approved_by as "approvedBy", rejected_by as "rejectedBy",
                rejection_reason as "rejectionReason", completed_at as "completedAt"
         FROM approval_workflow_state
         WHERE document_id = $1`,
        [documentId]
      );

      if (workflow) {
        return workflow;
      }

      // Check if document requires approval
      const requirements = await this.getRequirements(documentType, entityType);
      if (!requirements) {
        return null; // No approval requirements
      }

      // Create new workflow state
      workflow = await dbService.get(
        `INSERT INTO approval_workflow_state 
         (document_id, entity_type, document_type, required_approvals, current_approvals, approval_status, approved_by)
         VALUES ($1, $2, $3, $4, 0, 'pending', ARRAY[]::TEXT[])
         RETURNING id, document_id as "documentId", entity_type as "entityType",
                   document_type as "documentType", required_approvals as "requiredApprovals",
                   current_approvals as "currentApprovals", approval_status as "approvalStatus",
                   approved_by as "approvedBy"`,
        [documentId, entityType, documentType, requirements.minApprovers]
      );

      logger.info(`[ApprovalRules] Created workflow state for document ${documentId}: requires ${requirements.minApprovers} approvals`);
      return workflow;
    } catch (error) {
      logger.error('[ApprovalRules] Error managing workflow state:', error);
      return null;
    }
  }

  /**
   * Validate if a user can approve a document
   */
  async validateApproval(
    documentId: string,
    userId: string,
    userRole: string
  ): Promise<ApprovalValidation> {
    try {
      // Get document info
      const document = await dbService.get(
        `SELECT document_type, entity_type FROM documents WHERE document_id = $1`,
        [documentId]
      );

      if (!document) {
        return {
          canApprove: false,
          reason: 'Document not found',
          isComplete: false,
          requiresApproval: false,
          currentApprovals: 0,
          requiredApprovals: 0,
          approvedBy: []
        };
      }

      // Get approval requirements
      const requirements = await this.getRequirements(document.document_type, document.entity_type);
      
      if (!requirements) {
        // No approval requirements - single approval sufficient
        return {
          canApprove: true,
          isComplete: false,
          requiresApproval: false,
          currentApprovals: 0,
          requiredApprovals: 1,
          approvedBy: []
        };
      }

      // Get workflow state
      const workflow = await this.getOrCreateWorkflowState(
        documentId,
        document.document_type,
        document.entity_type
      );

      if (!workflow) {
        return {
          canApprove: false,
          reason: 'Failed to create workflow state',
          isComplete: false,
          requiresApproval: true,
          currentApprovals: 0,
          requiredApprovals: requirements.minApprovers,
          approvedBy: []
        };
      }

      // Check if already approved by this user
      if (workflow.approvedBy && workflow.approvedBy.includes(userId)) {
        return {
          canApprove: false,
          reason: 'You have already approved this document',
          isComplete: workflow.currentApprovals >= workflow.requiredApprovals,
          requiresApproval: true,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals,
          approvedBy: workflow.approvedBy
        };
      }

      // Check if workflow is already complete
      if (workflow.approvalStatus === 'approved') {
        return {
          canApprove: false,
          reason: 'Document is already fully approved',
          isComplete: true,
          requiresApproval: true,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals,
          approvedBy: workflow.approvedBy
        };
      }

      // Check if workflow was rejected
      if (workflow.approvalStatus === 'rejected') {
        return {
          canApprove: false,
          reason: 'Document was rejected',
          isComplete: false,
          requiresApproval: true,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals,
          approvedBy: workflow.approvedBy
        };
      }

      // Check role requirements
      if (!requirements.requiredRoles.includes(userRole)) {
        return {
          canApprove: false,
          reason: `Your role (${userRole}) is not authorized to approve this document type. Required roles: ${requirements.requiredRoles.join(', ')}`,
          isComplete: false,
          requiresApproval: true,
          currentApprovals: workflow.currentApprovals,
          requiredApprovals: workflow.requiredApprovals,
          approvedBy: workflow.approvedBy
        };
      }

      // For sequential approval, check if it's this role's turn
      if (requirements.approvalOrder === 'sequential') {
        const currentApprovalLevel = workflow.currentApprovals;
        const expectedRole = requirements.requiredRoles[currentApprovalLevel];
        
        if (expectedRole && expectedRole !== userRole) {
          return {
            canApprove: false,
            reason: `Sequential approval required. Waiting for ${expectedRole} approval first.`,
            isComplete: false,
            requiresApproval: true,
            currentApprovals: workflow.currentApprovals,
            requiredApprovals: workflow.requiredApprovals,
            approvedBy: workflow.approvedBy,
            nextRequiredRole: expectedRole
          };
        }
      }

      // All checks passed
      return {
        canApprove: true,
        isComplete: (workflow.currentApprovals + 1) >= workflow.requiredApprovals,
        requiresApproval: true,
        currentApprovals: workflow.currentApprovals,
        requiredApprovals: workflow.requiredApprovals,
        approvedBy: workflow.approvedBy
      };

    } catch (error) {
      logger.error('[ApprovalRules] Error validating approval:', error);
      return {
        canApprove: false,
        reason: 'System error during validation',
        isComplete: false,
        requiresApproval: false,
        currentApprovals: 0,
        requiredApprovals: 0,
        approvedBy: []
      };
    }
  }

  /**
   * Record an approval
   */
  async recordApproval(
    documentId: string,
    userId: string,
    userRole: string,
    blockchainTxId?: string
  ): Promise<{ success: boolean; message: string; workflowComplete: boolean }> {
    try {
      // Validate approval
      const validation = await this.validateApproval(documentId, userId, userRole);
      
      if (!validation.canApprove) {
        return {
          success: false,
          message: validation.reason || 'Cannot approve',
          workflowComplete: false
        };
      }

      // Record signature in document_signatures table
      await dbService.run(
        `INSERT INTO document_signatures 
         (document_id, signature_type, signed_by, signed_by_role, signed_by_org, 
          approval_status, blockchain_tx_id, approval_level, approval_order)
         VALUES ($1, 'approve', $2, $3, 
                 (SELECT organization FROM users WHERE user_id = $2 LIMIT 1),
                 'approved', $4, $5, $6)`,
        [
          documentId,
          userId,
          userRole,
          blockchainTxId || null,
          validation.currentApprovals + 1,
          validation.currentApprovals + 1
        ]
      );

      // The trigger will automatically update approval_workflow_state
      // But let's verify the final state
      const workflow = await dbService.get(
        `SELECT approval_status as "approvalStatus", current_approvals as "currentApprovals",
                required_approvals as "requiredApprovals"
         FROM approval_workflow_state
         WHERE document_id = $1`,
        [documentId]
      );

      const isComplete = workflow && workflow.currentApprovals >= workflow.requiredApprovals;

      logger.info(`[ApprovalRules] Approval recorded: document=${documentId}, user=${userId}, role=${userRole}, complete=${isComplete}`);

      return {
        success: true,
        message: isComplete 
          ? 'Document fully approved'
          : `Approval recorded (${workflow?.currentApprovals}/${workflow?.requiredApprovals})`,
        workflowComplete: isComplete
      };

    } catch (error) {
      logger.error('[ApprovalRules] Error recording approval:', error);
      return {
        success: false,
        message: 'Failed to record approval',
        workflowComplete: false
      };
    }
  }

  /**
   * Get approval status for a document
   */
  async getApprovalStatus(documentId: string): Promise<ApprovalWorkflowState | null> {
    try {
      const workflow = await dbService.get(
        `SELECT id, document_id as "documentId", entity_type as "entityType",
                document_type as "documentType", required_approvals as "requiredApprovals",
                current_approvals as "currentApprovals", approval_status as "approvalStatus",
                approved_by as "approvedBy", rejected_by as "rejectedBy",
                rejection_reason as "rejectionReason", completed_at as "completedAt"
         FROM approval_workflow_state
         WHERE document_id = $1`,
        [documentId]
      );

      return workflow || null;
    } catch (error) {
      logger.error('[ApprovalRules] Error fetching approval status:', error);
      return null;
    }
  }

  /**
   * Get all approval requirements (admin function)
   */
  async getAllRequirements(): Promise<ApprovalRequirement[]> {
    try {
      const results = await dbService.all(
        `SELECT id, document_type as "documentType", entity_type as "entityType",
                min_approvers as "minApprovers", required_roles as "requiredRoles",
                approval_order as "approvalOrder", description, active
         FROM approval_requirements
         WHERE active = true
         ORDER BY entity_type, document_type`
      );

      return results || [];
    } catch (error) {
      logger.error('[ApprovalRules] Error fetching all requirements:', error);
      return [];
    }
  }
}

export const approvalRulesService = new ApprovalRulesService();
