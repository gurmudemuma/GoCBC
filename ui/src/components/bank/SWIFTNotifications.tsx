// SWIFT Notifications Component
// Real-time notification bell with SWIFT message alerts

import React, { useState, useEffect } from 'react';
import {
  Badge,
  Dropdown,
  List,
  Button,
  Space,
  Tag,
  Empty,
  Divider,
  notification as antNotification,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  MessageOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { apiFetch } from '@/config/api.config';

dayjs.extend(relativeTime);

interface SWIFTNotification {
  id: string;
  type: 'MESSAGE_RECEIVED' | 'PAYMENT_RECEIVED' | 'DISCREPANCY' | 'AUTHORIZATION' | 'LC_ISSUED';
  messageId: string;
  messageType: string;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  lcId?: string;
  read: boolean;
  createdAt: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface SWIFTNotificationsProps {
  onMessageClick?: (messageId: string) => void;
}

const SWIFTNotifications: React.FC<SWIFTNotificationsProps> = ({ onMessageClick }) => {
  const [notifications, setNotifications] = useState<SWIFTNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update unread count
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll simulate by checking recent messages
      const response = await apiFetch('/swift/messages?status=RECEIVED,PENDING_APPROVAL&limit=20');
      const result = await response.json();
      
      if (result.success) {
        const messages = result.data || [];
        const notifs: SWIFTNotification[] = messages.map((msg: any) => ({
          id: msg.messageId,
          type: getNotificationType(msg.messageType, msg.status),
          messageId: msg.messageId,
          messageType: msg.messageType,
          title: getNotificationTitle(msg.messageType, msg.status),
          description: getNotificationDescription(msg),
          amount: msg.amount,
          currency: msg.currency,
          lcId: msg.linkedLcId,
          read: false, // In real app, track read status
          createdAt: msg.receivedDate || msg.createdAt,
          priority: getNotificationPriority(msg.messageType, msg.amount),
        }));
        
        setNotifications(notifs);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const getNotificationType = (messageType: string, status: string): SWIFTNotification['type'] => {
    if (messageType === 'MT700') return 'LC_ISSUED';
    if (messageType === 'MT103') return 'PAYMENT_RECEIVED';
    if (messageType === 'MT750') return 'DISCREPANCY';
    if (messageType === 'MT752') return 'AUTHORIZATION';
    return 'MESSAGE_RECEIVED';
  };

  const getNotificationTitle = (messageType: string, status: string): string => {
    const titles: Record<string, string> = {
      'MT700': 'New LC Received',
      'MT710': 'LC Advice Required',
      'MT707': 'LC Amendment',
      'MT730': 'Acknowledgment Received',
      'MT750': '⚠️ Document Discrepancy',
      'MT752': 'Payment Authorization',
      'MT754': 'Document Negotiation',
      'MT103': '💰 Payment Received',
      'MT910': 'Credit Confirmation',
    };
    return titles[messageType] || 'New SWIFT Message';
  };

  const getNotificationDescription = (msg: any): string => {
    const { messageType, amount, currency, linkedLcId, senderBic } = msg;
    
    if (messageType === 'MT700') {
      return `LC ${linkedLcId || 'New'} from ${senderBic} - ${currency} ${amount?.toLocaleString()}`;
    }
    if (messageType === 'MT103') {
      return `Payment of ${currency} ${amount?.toLocaleString()} from ${senderBic}`;
    }
    if (messageType === 'MT750') {
      return `Discrepancies found for LC ${linkedLcId}`;
    }
    if (messageType === 'MT752') {
      return `Payment authorized for LC ${linkedLcId} - ${currency} ${amount?.toLocaleString()}`;
    }
    
    return `${messageType} from ${senderBic}`;
  };

  const getNotificationPriority = (messageType: string, amount?: number): 'HIGH' | 'MEDIUM' | 'LOW' => {
    if (messageType === 'MT750' || messageType === 'MT103') return 'HIGH';
    if (amount && amount > 100000) return 'HIGH';
    if (messageType === 'MT700' || messageType === 'MT752') return 'MEDIUM';
    return 'LOW';
  };

  const getNotificationIcon = (type: SWIFTNotification['type']) => {
    const icons = {
      'MESSAGE_RECEIVED': <MessageOutlined style={{ color: '#1890ff' }} />,
      'PAYMENT_RECEIVED': <DollarOutlined style={{ color: '#52c41a' }} />,
      'DISCREPANCY': <WarningOutlined style={{ color: '#ff4d4f' }} />,
      'AUTHORIZATION': <CheckOutlined style={{ color: '#52c41a' }} />,
      'LC_ISSUED': <MessageOutlined style={{ color: '#722ed1' }} />,
    };
    return icons[type] || <MessageOutlined />;
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: SWIFTNotification) => {
    markAsRead(notification.id);
    setVisible(false);
    onMessageClick?.(notification.messageId);
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const menuItems = (
    <div style={{ width: 400, maxHeight: 600, overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
            SWIFT Notifications
          </span>
          <Space size="small">
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
            <Button
              type="link"
              size="small"
              danger
              onClick={clearAll}
            >
              Clear all
            </Button>
          </Space>
        </Space>
      </div>

      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No notifications"
          style={{ padding: '40px 0' }}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: item.read ? '#fff' : '#f0f7ff',
                borderBottom: '1px solid #f0f0f0',
              }}
              onClick={() => handleNotificationClick(item)}
            >
              <List.Item.Meta
                avatar={getNotificationIcon(item.type)}
                title={
                  <Space>
                    <span style={{ fontWeight: item.read ? 'normal' : 'bold' }}>
                      {item.title}
                    </span>
                    {item.priority === 'HIGH' && (
                      <Tag color="red">URGENT</Tag>
                    )}
                    {!item.read && (
                      <Badge status="processing" />
                    )}
                  </Space>
                }
                description={
                  <>
                    <div>{item.description}</div>
                    <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                      {dayjs(item.createdAt).fromNow()}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      {notifications.length > 0 && (
        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
          <Button type="link" onClick={() => setVisible(false)}>
            View All Messages
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      menu={{ items: [] }}
      dropdownRender={() => menuItems}
      trigger={['click']}
      open={visible}
      onOpenChange={setVisible}
      placement="bottomRight"
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          style={{ border: 'none' }}
        />
      </Badge>
    </Dropdown>
  );
};

export default SWIFTNotifications;
