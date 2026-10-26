/**
 * Business Activity Timeline Component
 * Shows timeline reconstructed from entity data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  CheckCircle,
  Send,
  VerifiedUser,
  AccountBalance,
} from '@mui/icons-material';
import axios from 'axios';
import { couchDBService } from '../../services/couchdbService';

interface BusinessActivity {
  action: string;
  actionLabel: string;
  actor: string;
  actorOrganization: string;
  actorRole: string;
  expectedOrganization: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  statusBefore: string;
  statusAfter: string;
  icon: React.ReactElement;
  color: 'success' | 'primary' | 'secondary' | 'warning' | 'error' | 'info';
  warning: boolean;
  // Expert: Add rich audit trail details
  changes?: Array<{ fieldName: string; oldValue: string; newValue: string; dataType: string }>;
  complianceNote?: string;
  transactionId?: string;
}

interface Props {
  entityType: string;
  entityId: string;
}

const BusinessActivityTimeline: React.FC<Props> = ({ entityType, entityId }) => {
  const [activities, setActivities] = useState<BusinessActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // EXPERT FIX: Non-blocking async fetch - component renders immediately, data loads in background
    if (entityId && entityType) {
      fetchActivities();
    }
  }, [entityType, entityId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Add timeout to prevent hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeline fetch timeout')), 5000)
      );
      
      const fetchPromise = fetchActivitiesInternal();
      
      await Promise.race([fetchPromise, timeout]);
      
    } catch (err) {
      console.error('[Timeline] Failed to load:', err);
      setError('Timeline temporarily unavailable');
      setLoading(false);
    }
  };

  const fetchActivitiesInternal = async () => {
    try {
      console.log(`[Timeline] 🔗 Fetching ${entityType} ${entityId} from BLOCKCHAIN...`);
      const reconstructedActivities: BusinessActivity[] = [];

      if (entityType === 'LC') {
        // EXPERT FIX: Fetch audit trail DIRECTLY from blockchain CouchDB
        try {
          const auditRecords = await couchDBService.getAuditTrail('LC', entityId);
          
          console.log(`[Timeline] ✅ Found ${auditRecords.length} audit records on blockchain`);
          
          if (auditRecords.length > 0) {
            auditRecords.forEach((record: any) => {
              // Extract actor info from signature
              const actor = record.signature?.caller?.commonName || record.actor || 'System';
              const actorOrg = record.signature?.caller?.mspId || record.actorMsp || 'Unknown';
              const actorRole = record.signature?.caller?.organizationUnit || 'user';
              
              // Map action type to icon
              let icon = <CheckCircle />;
              let color: 'success' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' = 'primary';
              
              switch (record.actionType) {
                case 'CREATE':
                  icon = <Send />;
                  color = 'info';
                  break;
                case 'APPROVE':
                  icon = <CheckCircle />;
                  color = 'success';
                  break;
                case 'ISSUE':
                  icon = <VerifiedUser />;
                  color = 'success';
                  break;
                case 'UPDATE':
                  icon = <CheckCircle />;
                  color = 'primary';
                  break;
                case 'REJECT':
                  icon = <CheckCircle />;
                  color = 'error';
                  break;
                default:
                  icon = <CheckCircle />;
                  color = 'primary';
              }
              
              reconstructedActivities.push({
                action: record.actionType || 'UPDATE',
                actionLabel: `${record.actionType || 'Updated'} - ${record.reason || 'No details'}`,
                actor: actor,
                actorOrganization: actorOrg,
                actorRole: actorRole,
                expectedOrganization: actorOrg,
                entityType: 'LC',
                entityId: entityId,
                timestamp: record.timestamp || record.createdAt,
                statusBefore: record.statusBefore || '',
                statusAfter: record.statusAfter || '',
                icon: icon,
                color: color,
                warning: false,
                // Expert: Include all audit trail details
                changes: record.changes || [],
                complianceNote: record.complianceData?.complianceNote || '',
                transactionId: record.signature?.transactionId || record.logId || '',
              });
            });
            
            setActivities(reconstructedActivities);
            setLoading(false);
            return; // Success - exit early
          }
        } catch (blockchainErr) {
          console.log('[Timeline] ⚠️ Blockchain audit unavailable, trying fallback...');
        }
        
        // Fallback: Try to get LC from blockchain and reconstruct timeline
        try {
          const allLCs = await couchDBService.getAllLCs();
          const lc = allLCs.find(l => l.lcId === entityId || l.lcId === `LC_${entityId}`);
          
          if (lc) {
            console.log('[Timeline] ✅ Found LC on blockchain, reconstructing timeline...');
            
            // LC Request
            if (lc.createdAt) {
              reconstructedActivities.push({
                action: 'REQUEST',
                actionLabel: 'Requested',
                actor: 'ECTA Officer',
                actorOrganization: 'ECTAMSP',
                actorRole: 'admin',
                expectedOrganization: 'ECTAMSP',
                entityType: 'LC',
                entityId: lc.lcId,
                timestamp: lc.createdAt,
                statusBefore: '',
                statusAfter: 'REQUESTED',
                icon: <Send />,
                color: 'primary',
                warning: false,
              });
            }

            // LC Approval
            if (lc.approvedBy) {
              let actorName = lc.approvedBy || lc.issuingBank || 'Bank Officer';
              try {
                if (actorName && /^[A-Za-z0-9+/=]+$/.test(actorName) && actorName.length > 50) {
                  const decoded = atob(actorName);
                  const cnMatch = decoded.match(/CN=([^,]+)/);
                  if (cnMatch) actorName = cnMatch[1];
                }
              } catch (e) {}
              
              if (actorName.includes('ecta.cecbs.et')) {
                actorName = `${lc.issuingBank || 'Bank'} Officer`;
              }
              
              reconstructedActivities.push({
                action: 'APPROVE',
                actionLabel: 'Approved',
                actor: actorName,
                actorOrganization: 'BanksMSP',
                actorRole: 'banker',
                expectedOrganization: 'BanksMSP',
                entityType: 'LC',
                entityId: lc.lcId,
                timestamp: lc.updatedAt || lc.createdAt,
                statusBefore: 'REQUESTED',
                statusAfter: 'APPROVED',
                icon: <CheckCircle />,
                color: 'success',
                warning: false,
              });
            }

            // LC Issue
            if (lc.issueDate && lc.issuedBy) {
              reconstructedActivities.push({
                action: 'ISSUE',
                actionLabel: 'Issued',
                actor: lc.issuedBy || lc.issuingBank || 'Bank Officer',
                actorOrganization: 'BanksMSP',
                actorRole: 'banker',
                expectedOrganization: 'BanksMSP',
                entityType: 'LC',
                entityId: lc.lcId,
                timestamp: lc.issueDate,
                statusBefore: 'APPROVED',
                statusAfter: 'ISSUED',
                icon: <VerifiedUser />,
                color: 'success',
                warning: false,
              });
            }
            
            setActivities(reconstructedActivities);
            setLoading(false);
            return; // Success - exit early
          }
        } catch (lcErr) {
          console.log('[Timeline] ⚠️ Could not fetch LC from blockchain');
        }
        
      } else if (entityType === 'FOREX') {
        // EXPERT FIX: Fetch FOREX audit trail from blockchain
        try {
          const auditRecords = await couchDBService.getAuditTrail('FOREX', entityId);
          
          console.log(`[Timeline] ✅ Found ${auditRecords.length} forex audit records on blockchain`);
          
          if (auditRecords.length > 0) {
            auditRecords.forEach((record: any) => {
              // Extract actor info from signature
              const actor = record.signature?.caller?.commonName || record.actor || 'System';
              const actorOrg = record.signature?.caller?.mspId || record.actorMsp || 'Unknown';
              const actorRole = record.signature?.caller?.organizationUnit || 'user';
              
              // Map action type to icon
              let icon = <AccountBalance />;
              let color: 'success' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' = 'primary';
              
              switch (record.actionType) {
                case 'CREATE':
                case 'REQUEST':
                  icon = <Send />;
                  color = 'info';
                  break;
                case 'CONFIRM':
                  icon = <CheckCircle />;
                  color = 'primary';
                  break;
                case 'ALLOCATE':
                  icon = <AccountBalance />;
                  color = 'success';
                  break;
                case 'UPDATE':
                  icon = <CheckCircle />;
                  color = 'primary';
                  break;
                case 'REJECT':
                  icon = <CheckCircle />;
                  color = 'error';
                  break;
                default:
                  icon = <AccountBalance />;
                  color = 'primary';
              }
              
              reconstructedActivities.push({
                action: record.actionType || 'UPDATE',
                actionLabel: `${record.actionType || 'Updated'} - ${record.reason || 'No details'}`,
                actor: actor,
                actorOrganization: actorOrg,
                actorRole: actorRole,
                expectedOrganization: actorOrg,
                entityType: 'FOREX',
                entityId: entityId,
                timestamp: record.timestamp || record.createdAt,
                statusBefore: record.statusBefore || '',
                statusAfter: record.statusAfter || '',
                icon: icon,
                color: color,
                warning: false,
                // Expert: Include all audit trail details
                changes: record.changes || [],
                complianceNote: record.complianceData?.complianceNote || '',
                transactionId: record.signature?.transactionId || record.logId || '',
              });
            });
            
            setActivities(reconstructedActivities);
            setLoading(false);
            return; // Success - exit early
          }
        } catch (blockchainErr) {
          console.log('[Timeline] ⚠️ Blockchain forex audit unavailable, trying fallback...');
        }
        
        // Fallback: Get forex from blockchain and reconstruct
        try {
          const allForex = await couchDBService.getAllForex();
          const forex = allForex.find(f => f.forexId === entityId || f.forexId === `FOREX_${entityId}` || entityId.includes(f.forexId));

          if (forex) {
            console.log('[Timeline] ✅ Found forex on blockchain, reconstructing DETAILED timeline...');
            
            // Forex Request
            if (forex.requestDate) {
              const requestChanges = [
                { fieldName: 'forexId', oldValue: '', newValue: forex.forexId, dataType: 'string' },
                { fieldName: 'contractId', oldValue: '', newValue: forex.contractId, dataType: 'string' },
                { fieldName: 'requestedAmount', oldValue: '', newValue: `$${forex.requestedAmount.toLocaleString()}`, dataType: 'number' },
                { fieldName: 'currency', oldValue: '', newValue: forex.currency, dataType: 'string' },
                { fieldName: 'status', oldValue: '', newValue: 'REQUESTED', dataType: 'string' },
              ];
              
              reconstructedActivities.push({
                action: 'REQUEST',
                actionLabel: 'REQUEST - Forex allocation requested by bank for LC payment',
                actor: 'Bank Officer',
                actorOrganization: 'BanksMSP',
                actorRole: 'banker',
                expectedOrganization: 'BanksMSP',
                entityType: 'FOREX',
                entityId: forex.forexId,
                timestamp: forex.requestDate,
                statusBefore: '',
                statusAfter: 'REQUESTED',
                icon: <Send />,
                color: 'info',
                warning: false,
                changes: requestChanges,
                complianceNote: `Forex allocation requested for ${forex.currency} ${forex.requestedAmount.toLocaleString()}. Pending NBE approval per NBE policy (${forex.retentionRate || 40}% retention).`,
                transactionId: '',
              });
            }

            // Forex Allocation
            if (forex.allocationDate) {
              const allocationChanges = [
                { fieldName: 'status', oldValue: 'REQUESTED', newValue: 'ALLOCATED', dataType: 'string' },
                { fieldName: 'allocatedAmount', oldValue: '0', newValue: `$${forex.allocatedAmount.toLocaleString()}`, dataType: 'number' },
                { fieldName: 'exchangeRate', oldValue: '0', newValue: forex.exchangeRate.toString(), dataType: 'number' },
                { fieldName: 'retentionRate', oldValue: '0', newValue: `${forex.retentionRate}%`, dataType: 'number' },
                { fieldName: 'nbeOfficer', oldValue: '', newValue: forex.nbeOfficer || 'NBE Officer', dataType: 'string' },
                { fieldName: 'nbeApprovalRef', oldValue: '', newValue: forex.nbeApprovalRef || 'N/A', dataType: 'string' },
              ];
              
              if (forex.expiryDate) {
                allocationChanges.push({
                  fieldName: 'expiryDate',
                  oldValue: '',
                  newValue: new Date(forex.expiryDate).toLocaleDateString(),
                  dataType: 'date'
                });
              }
              
              reconstructedActivities.push({
                action: 'ALLOCATE',
                actionLabel: 'ALLOCATE - Forex allocation approved and assigned by NBE',
                actor: forex.nbeOfficer || 'NBE Officer',
                actorOrganization: 'NBEMSP',
                actorRole: 'nbe-officer',
                expectedOrganization: 'NBEMSP',
                entityType: 'FOREX',
                entityId: forex.forexId,
                timestamp: forex.allocationDate,
                statusBefore: 'REQUESTED',
                statusAfter: 'ALLOCATED',
                icon: <AccountBalance />,
                color: 'success',
                warning: false,
                changes: allocationChanges,
                complianceNote: `Forex allocated: ${forex.currency} ${forex.allocatedAmount.toLocaleString()} at rate ${forex.exchangeRate}. Retention: ${forex.retentionRate}%. Reference: ${forex.nbeApprovalRef || 'N/A'}. ${forex.expiryDate ? `Expires: ${new Date(forex.expiryDate).toLocaleDateString()}` : ''}`,
                transactionId: '',
              });
            }
            
            setActivities(reconstructedActivities);
            setLoading(false);
            return; // Success - exit early
          }
        } catch (forexErr) {
          console.log('[Timeline] ⚠️ Could not fetch forex from blockchain');
        }
      }

      // If we reach here, no data was found
      console.log('[Timeline] ℹ️ No timeline data available from blockchain');
      setActivities([]);
      setLoading(false);
      
    } catch (err: any) {
      console.error('[Timeline] ❌ Error fetching timeline:', err);
      setError('Timeline temporarily unavailable');
      setLoading(false);
    }
  };

  // EXPERT FIX: Optimistic UI - show loading state immediately without blocking parent
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Loading activity timeline...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (activities.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          No timeline data available
        </Typography>
        <Typography variant="caption">
          {entityType} {entityId} does not have recorded activity dates.
        </Typography>
      </Alert>
    );
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📋 Business Workflow Timeline
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Complete journey showing all recorded activities
        </Typography>

        <Timeline position="right" sx={{ mt: 2 }}>
          {activities.map((activity, index) => (
            <TimelineItem key={index}>
              <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                <Typography variant="caption">
                  {new Date(activity.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={activity.color}>
                  {activity.icon}
                </TimelineDot>
                {index < activities.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="body2" fontWeight={600}>
                  {activity.actionLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activity.entityType}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={`by ${activity.actor}`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={activity.actorOrganization}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                {activity.statusBefore && activity.statusAfter && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Status: {activity.statusBefore} → {activity.statusAfter}
                  </Typography>
                )}
                
                {/* EXPERT: Show field changes */}
                {activity.changes && activity.changes.length > 0 && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                      📝 Changes Made:
                    </Typography>
                    {activity.changes.map((change, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        • <strong>{change.fieldName}</strong>: {change.oldValue ? `"${change.oldValue}"` : '(empty)'} → "{change.newValue}"
                      </Typography>
                    ))}
                  </Box>
                )}
                
                {/* EXPERT: Show compliance note */}
                {activity.complianceNote && (
                  <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                    <Typography variant="caption">
                      {activity.complianceNote}
                    </Typography>
                  </Alert>
                )}
                
                {/* EXPERT: Show transaction ID */}
                {activity.transactionId && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace', fontSize: '0.65rem' }}>
                    🔗 TxID: {activity.transactionId.substring(0, 16)}...
                  </Typography>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};

export default BusinessActivityTimeline;
