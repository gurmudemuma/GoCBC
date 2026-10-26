/**
 * Multi-Party Approval Progress Indicator
 * Shows approval workflow status with visual progress
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ApprovalRequirement {
  minApprovers: number;
  requiredRoles: string[];
  approvalOrder: 'parallel' | 'sequential';
  description: string;
}

interface WorkflowState {
  requiredApprovals: number;
  currentApprovals: number;
  approvalStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
  approvedBy: string[];
  isComplete: boolean;
  completedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

interface Signature {
  signedBy: string;
  signedByRole: string;
  signedByOrg: string;
  approvalLevel: number;
  createdAt: string;
  blockchainTxId: string;
}

interface ApprovalStatus {
  documentId: string;
  documentType: string;
  documentStatus: string;
  requiresMultiPartyApproval: boolean;
  requirements: ApprovalRequirement | null;
  workflowState: WorkflowState | null;
  userValidation: {
    canApprove: boolean;
    reason?: string;
    nextRequiredRole?: string;
  };
  signatures: Signature[];
}

interface ApprovalProgressIndicatorProps {
  documentId: string;
  onApprovalComplete?: () => void;
  showApproveButton?: boolean;
}

export const ApprovalProgressIndicator: React.FC<ApprovalProgressIndicatorProps> = ({
  documentId,
  onApprovalComplete,
  showApproveButton = true
}) => {
  const [status, setStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const fetchApprovalStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1'}/documents/${documentId}/approval-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setStatus(response.data.data);
        
        // Notify parent if approval is complete
        if (response.data.data.workflowState?.isComplete && onApprovalComplete) {
          onApprovalComplete();
        }
      } else {
        setError(response.data.error?.message || 'Failed to fetch approval status');
      }
    } catch (err: any) {
      console.error('Error fetching approval status:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch approval status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchApprovalStatus();
    }
  }, [documentId]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1'}/documents/${documentId}/sign`,
        {
          signatureType: 'APPROVE',
          remarks: 'Document approved'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Refresh approval status
        await fetchApprovalStatus();
      } else {
        setError(response.data.error?.message || 'Failed to approve document');
      }
    } catch (err: any) {
      console.error('Error approving document:', err);
      setError(err.response?.data?.error?.message || 'Failed to approve document');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="approval-progress-loading">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2 text-muted">Loading approval status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning mb-0">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // If document doesn't require multi-party approval
  if (!status.requiresMultiPartyApproval) {
    return (
      <div className="approval-progress-simple">
        <span className="badge bg-secondary">
          <i className="bi bi-check-circle me-1"></i>
          Single Approval Required
        </span>
      </div>
    );
  }

  const { requirements, workflowState, userValidation, signatures } = status;

  if (!requirements || !workflowState) {
    return null;
  }

  const progressPercentage = (workflowState.currentApprovals / workflowState.requiredApprovals) * 100;

  // Status badge color
  const statusBadgeClass = 
    workflowState.approvalStatus === 'approved' ? 'bg-success' :
    workflowState.approvalStatus === 'rejected' ? 'bg-danger' :
    workflowState.approvalStatus === 'in_progress' ? 'bg-info' :
    'bg-warning';

  return (
    <div className="approval-progress-indicator card">
      <div className="card-body">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-shield-check me-2"></i>
            Multi-Party Approval
          </h6>
          <span className={`badge ${statusBadgeClass}`}>
            {workflowState.approvalStatus.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        {/* Requirements Info */}
        <div className="approval-requirements mb-3">
          <small className="text-muted d-block mb-1">
            <strong>Requires:</strong> {requirements.minApprovers} approvals ({requirements.approvalOrder})
          </small>
          <small className="text-muted d-block">
            <strong>Roles:</strong> {requirements.requiredRoles.join(' → ')}
          </small>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <small className="text-muted">Progress</small>
            <small className="text-muted">
              <strong>{workflowState.currentApprovals}</strong> of <strong>{workflowState.requiredApprovals}</strong> approvals
            </small>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div
              className={`progress-bar ${workflowState.isComplete ? 'bg-success' : 'bg-info'}`}
              role="progressbar"
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={workflowState.currentApprovals}
              aria-valuemin={0}
              aria-valuemax={workflowState.requiredApprovals}
            ></div>
          </div>
        </div>

        {/* Signatures List */}
        {signatures.length > 0 && (
          <div className="signatures-list mb-3">
            <small className="text-muted d-block mb-2">
              <strong>Approvals:</strong>
            </small>
            <div className="list-group list-group-flush">
              {signatures.map((sig, idx) => (
                <div key={idx} className="list-group-item px-0 py-2">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <small className="fw-bold">{sig.signedBy}</small>
                        <small className="text-muted">Level {sig.approvalLevel}</small>
                      </div>
                      <small className="text-muted">
                        {sig.signedByRole} • {sig.signedByOrg}
                      </small>
                    </div>
                  </div>
                  {sig.blockchainTxId && (
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                      <i className="bi bi-shield-check me-1"></i>
                      Blockchain: {sig.blockchainTxId.substring(0, 20)}...
                    </small>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Action */}
        {showApproveButton && (
          <div className="user-action">
            {userValidation.canApprove ? (
              <button
                className="btn btn-success btn-sm w-100"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Approving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Approve Document
                  </>
                )}
              </button>
            ) : userValidation.reason ? (
              <div className="alert alert-info mb-0 py-2">
                <small>
                  <i className="bi bi-info-circle me-2"></i>
                  {userValidation.reason}
                </small>
                {userValidation.nextRequiredRole && (
                  <div className="mt-1">
                    <small className="text-muted">
                      <strong>Next:</strong> Waiting for {userValidation.nextRequiredRole}
                    </small>
                  </div>
                )}
              </div>
            ) : workflowState.isComplete ? (
              <div className="alert alert-success mb-0 py-2">
                <small>
                  <i className="bi bi-check-circle-fill me-2"></i>
                  All required approvals completed
                </small>
                {workflowState.completedAt && (
                  <div className="mt-1">
                    <small className="text-muted">
                      Completed: {new Date(workflowState.completedAt).toLocaleString()}
                    </small>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Rejection Info */}
        {workflowState.approvalStatus === 'rejected' && workflowState.rejectedBy && (
          <div className="alert alert-danger mb-0 mt-3 py-2">
            <small>
              <i className="bi bi-x-circle-fill me-2"></i>
              <strong>Rejected by:</strong> {workflowState.rejectedBy}
            </small>
            {workflowState.rejectionReason && (
              <div className="mt-1">
                <small><strong>Reason:</strong> {workflowState.rejectionReason}</small>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalProgressIndicator;
