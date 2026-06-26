// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Real-Time Notification Center

import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Badge,
  IconButton,
  Chip,
  Tooltip,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Notifications,
  CheckCircle,
  Warning,
  Info,
  Assignment,
  LocalShipping,
  AccountBalance,
  Science,
  Visibility,
  Close,
  Description,
} from '@mui/icons-material';
import api, { formatDate } from '@/utils/api';

interface NotificationCenterProps {
  userRole: string;
}

interface Activity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'success' | 'warning' | 'info' | 'error';
  icon: React.ReactNode;
}

interface ActionItem {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  actionUrl?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userRole }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tabValue, setTabValue] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  // Auto-refresh every 30 seconds when open
  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const newActivities: Activity[] = [];
      const newActionItems: ActionItem[] = [];

      // Load LCs
      try {
        const lcsRes = await api.get('/banking/lcs');
        if (lcsRes.data?.success && lcsRes.data.data) {
          lcsRes.data.data.slice(0, 5).forEach((lc: any) => {
            if (lc.status === 'ISSUED') {
              newActivities.push({
                type: 'lc_issued',
                title: 'Letter of Credit Issued',
                description: `${lc.lcId} • ${lc.issuingBank} • ${lc.currency} ${lc.amount?.toLocaleString()}`,
                timestamp: lc.issueDate || lc.createdAt,
                severity: 'success',
                icon: <AccountBalance sx={{ color: '#4caf50' }} />,
              });
            }
            if (lc.status === 'UTILIZED') {
              newActivities.push({
                type: 'lc_utilized',
                title: 'Letter of Credit Utilized',
                description: `${lc.lcId} • ${lc.currency} ${lc.amount?.toLocaleString()}`,
                timestamp: lc.updatedAt || lc.createdAt,
                severity: 'info',
                icon: <AccountBalance sx={{ color: '#2196f3' }} />,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to load LCs for notifications:', err);
      }

      // Load shipments
      try {
        const shipmentsRes = await api.getShipments({ limit: 10 });
        if (shipmentsRes.success && shipmentsRes.data) {
          shipmentsRes.data.forEach((shipment: any) => {
            if (shipment.status === 'IN_TRANSIT') {
              newActivities.push({
                type: 'shipment_transit',
                title: 'Shipment In Transit',
                description: `${shipment.shipmentId} • ${shipment.currentLocation || 'In route'}`,
                timestamp: shipment.updatedAt || shipment.createdAt,
                severity: 'info',
                icon: <LocalShipping sx={{ color: '#2196f3' }} />,
              });
            } else if (shipment.status === 'DELIVERED') {
              newActivities.push({
                type: 'shipment_delivered',
                title: 'Shipment Delivered',
                description: `${shipment.shipmentId} • ${shipment.destination}`,
                timestamp: shipment.updatedAt,
                severity: 'success',
                icon: <CheckCircle sx={{ color: '#4caf50' }} />,
              });
            } else if (shipment.status === 'CREATED' || shipment.status === 'PENDING_INSPECTION') {
              newActionItems.push({
                type: 'inspection_required',
                title: 'Quality Inspection Required',
                description: `${shipment.shipmentId} • ${shipment.quantity}kg ${shipment.coffeeType}`,
                timestamp: shipment.createdAt,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to load shipments for notifications:', err);
      }

      // Load payments
      try {
        const paymentsRes = await api.get('/banking/payments');
        if (paymentsRes.data?.success && paymentsRes.data.data) {
          paymentsRes.data.data.slice(0, 3).forEach((payment: any) => {
            if (payment.status === 'SWIFT_RECEIVED') {
              newActivities.push({
                type: 'payment_received',
                title: 'Payment Received (SWIFT)',
                description: `${payment.currency} ${payment.amount?.toLocaleString()} • ${payment.swiftDetails?.swiftReference || 'SWIFT'}`,
                timestamp: payment.swiftDetails?.receivedDate || payment.updatedAt,
                severity: 'success',
                icon: <CheckCircle sx={{ color: '#4caf50' }} />,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to load payments for notifications:', err);
      }

      // Load contracts for action items
      try {
        const contractsRes = await api.getContracts();
        if (contractsRes.success && contractsRes.data) {
          // Get current user info
          const token = localStorage.getItem('authToken');
          let currentUserId = '';
          let currentUserRole = userRole;
          
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              currentUserId = payload.exporterId || payload.username;
              currentUserRole = payload.role || userRole;
            } catch (e) {
              console.warn('Could not decode token');
            }
          }

          contractsRes.data.forEach((contract: any) => {
            const contractId = contract.contractID || contract.contractId;
            const exporterId = contract.exporterID || contract.exporterId;
            const status = contract.contractStatus || contract.ContractStatus;
            const regDate = contract.registrationDate || contract.RegistrationDate;
            
            // For exporters, show their own contracts
            if (currentUserRole === 'EXPORTER' && exporterId === currentUserId) {
              if (status === 'REGISTERED' || status === 'PENDING_NBE') {
                const daysWaiting = Math.ceil(
                  (new Date().getTime() - new Date(regDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
                );
                
                newActivities.push({
                  type: 'contract_registered',
                  title: 'Contract Registered',
                  description: `${contractId} • ${contract.quantity?.toLocaleString() || 0} kg ${contract.coffeeType || 'Coffee'} to ${contract.buyerCountry || 'Unknown'} • Awaiting ECTA & NBE approval`,
                  timestamp: regDate || new Date().toISOString(),
                  severity: 'info',
                  icon: <Description sx={{ color: '#2196f3' }} />,
                });
                
                newActionItems.push({
                  type: 'contract_approval',
                  title: `Contract ${contractId} awaiting NBE approval`,
                  description: `${contract.quantity?.toLocaleString() || 0} kg ${contract.coffeeType || 'Coffee'} to ${contract.buyerCountry || 'Unknown'} • Registered ${daysWaiting} day${daysWaiting !== 1 ? 's' : ''} ago • Forex allocation pending`,
                  timestamp: regDate || new Date().toISOString(),
                  actionUrl: `/portals/exporter?tab=contracts`,
                });
              } else if (status === 'APPROVED' || status === 'NBE_APPROVED') {
                newActivities.push({
                  type: 'contract_approved',
                  title: 'Contract Approved by NBE',
                  description: `${contractId} • Ready for LC issuance • Value: $${contract.totalValue?.toLocaleString() || 0}`,
                  timestamp: contract.approvalDate || new Date().toISOString(),
                  severity: 'success',
                  icon: <CheckCircle sx={{ color: '#4caf50' }} />,
                });
              }
            }
            // For NBE/ECTA/BANKS, show pending approvals
            else if (['NBE', 'ECTA', 'BANKS'].includes(currentUserRole)) {
              if (status === 'PENDING_NBE' || status === 'REGISTERED') {
                newActionItems.push({
                  type: 'contract_approval',
                  title: 'Contract Requires Approval',
                  description: `${contractId} • ${exporterId}`,
                  timestamp: contract.updatedAt || contract.createdAt,
                  actionUrl: `/portals/${currentUserRole.toLowerCase()}?tab=contracts`,
                });
              }
            }
          });
        }
      } catch (err) {
        console.warn('Failed to load contracts for notifications:', err);
      }

      // Sort by timestamp
      newActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      newActionItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setActivities(newActivities.slice(0, 10));
      setActionItems(newActionItems.slice(0, 10));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const totalNotifications = activities.length + actionItems.length;
  const unreadCount = actionItems.length; // Action items are always "unread"

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'warning':
        return <Warning fontSize="small" />;
      case 'error':
        return <Warning fontSize="small" />;
      case 'info':
      default:
        return <Info fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      case 'info':
      default:
        return '#2196f3';
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          size="small"
          onClick={handleOpen}
          sx={{
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Notifications fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 420,
            maxWidth: 480,
            maxHeight: 600,
            borderRadius: 2,
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
                Notifications
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {unreadCount > 0 ? `${unreadCount} action${unreadCount > 1 ? 's' : ''} required` : 'All caught up!'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleClose}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontSize: '0.85rem',
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Recent
                  <Chip label={activities.length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Action Required
                  <Chip
                    label={actionItems.length}
                    size="small"
                    color={actionItems.length > 0 ? 'error' : 'default'}
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Content */}
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {/* Recent Activity Tab */}
          {tabValue === 0 && (
            <>
              {activities.length === 0 ? (
                <Box sx={{ py: 4, px: 3, textAlign: 'center' }}>
                  <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    No recent activity
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Blockchain transactions will appear here
                  </Typography>
                </Box>
              ) : (
                activities.map((activity, index) => (
                  <React.Fragment key={index}>
                    <MenuItem
                      onClick={handleClose}
                      sx={{
                        py: 2,
                        px: 2.5,
                        alignItems: 'flex-start',
                        '&:hover': {
                          backgroundColor: alpha(getSeverityColor(activity.severity), 0.05),
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: alpha(getSeverityColor(activity.severity), 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        {activity.icon}
                      </Box>
                      <ListItemText
                        primary={activity.title}
                        secondary={activity.description}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          mb: 0.5,
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.8rem',
                          sx: { mb: 0.5 },
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ ml: 1, whiteSpace: 'nowrap', fontSize: '0.7rem' }}
                      >
                        {formatDate(activity.timestamp)}
                      </Typography>
                    </MenuItem>
                    {index < activities.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </>
          )}

          {/* Action Required Tab */}
          {tabValue === 1 && (
            <>
              {actionItems.length === 0 ? (
                <Box sx={{ py: 4, px: 3, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" color="textSecondary" fontWeight={600}>
                    No pending actions
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    All tasks are up to date
                  </Typography>
                </Box>
              ) : (
                actionItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <MenuItem
                      onClick={handleClose}
                      sx={{
                        py: 2,
                        px: 2.5,
                        alignItems: 'flex-start',
                        '&:hover': {
                          backgroundColor: alpha('#ff6b35', 0.05),
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: alpha('#ff6b35', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        {item.type === 'inspection_required' ? (
                          <Science sx={{ color: '#ff6b35', fontSize: 20 }} />
                        ) : (
                          <Assignment sx={{ color: '#ff6b35', fontSize: 20 }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
                            {item.title}
                          </Typography>
                          <Chip
                            label="Pending"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: alpha('#ff6b35', 0.1),
                              color: '#ff6b35',
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                          {item.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          Submitted {formatDate(item.timestamp)}
                        </Typography>
                      </Box>
                      <IconButton size="small" sx={{ color: '#ff6b35', ml: 1 }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </MenuItem>
                    {index < actionItems.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </>
          )}
        </Box>

        {/* Footer */}
        {(activities.length > 0 || actionItems.length > 0) && (
          <>
            <Divider />
            <MenuItem
              onClick={handleClose}
              sx={{
                justifyContent: 'center',
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'primary.lighter',
                },
              }}
            >
              <Typography variant="body2" color="primary" fontWeight={600}>
                View All Notifications
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationCenter;
