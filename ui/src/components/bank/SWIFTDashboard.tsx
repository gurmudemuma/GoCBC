// SWIFT Message Management Dashboard
// For Banks - Ethiopian and Foreign

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Modal,
  Tabs,
  Descriptions,
  Alert,
  notification,
  Badge,
  Timeline,
  Tooltip,
} from 'antd';
import {
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  SendOutlined,
  DownloadOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiFetch } from '@/config/api.config';
import CreateSWIFTMessage from './CreateSWIFTMessage';
import SWIFTMessageDetail from './SWIFTMessageDetail';
import SWIFTNotifications from './SWIFTNotifications';
import SWIFTStatistics from './SWIFTStatistics';
import useSWIFTWebSocket from '../../hooks/useSWIFTWebSocket';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface SWIFTMessage {
  messageId: string;
  messageType: string;
  swiftReference: string;
  senderBic: string;
  receiverBic: string;
  amount: number;
  currency: string;
  status: string;
  linkedLcId?: string;
  linkedPaymentId?: string;
  sentDate?: string;
  receivedDate?: string;
  beneficiary?: string;
  remittanceInfo?: string;
  createdAt: string;
  updatedAt: string;
}

interface SWIFTStats {
  totalMessages: number;
  messagesToday: number;
  pendingApproval: number;
  settledToday: number;
  totalValue: number;
  sent: number;
  received: number;
  avgSettlementTime: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface SWIFTDashboardProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  rowsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

const SWIFTDashboard: React.FC<SWIFTDashboardProps> = ({ 
  primaryColor = '#9b30b7',
  secondaryColor = '#FFD700',
  accentColor = '#000000',
  rowsPerPage: propRowsPerPage,
  currentPage: propCurrentPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const [messages, setMessages] = useState<SWIFTMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SWIFTMessage[]>([]);
  const [stats, setStats] = useState<SWIFTStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  
  // Filters
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  const userOrg = localStorage.getItem('userOrg') || 'CBETETAA'; // Ethiopian bank BIC

  // WebSocket integration for real-time updates
  const { isConnected } = useSWIFTWebSocket({
    onMessageReceived: (event) => {
      // Reload messages when new message received
      loadMessages();
      loadStatistics();
    },
    onMessageSettled: (event) => {
      // Reload when message settled
      loadMessages();
      loadStatistics();
    },
    showNotifications: true,
  });

  useEffect(() => {
    loadMessages();
    loadStatistics();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadMessages();
      loadStatistics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
    // Also recalculate statistics from messages as fallback
    if (messages.length > 0 && !stats) {
      calculateStatsFromMessages();
    }
  }, [messages, messageTypeFilter, statusFilter, directionFilter, searchText]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/swift/messages');
      const result = await response.json();
      
      if (result.success) {
        // Step 1: Filter for complete SWIFT messages only
        const completeMessages = (result.data || []).filter((msg: SWIFTMessage) => {
          return !!(
            msg.messageId &&
            msg.messageType &&
            msg.swiftReference &&
            msg.senderBic && msg.senderBic.trim() !== '' &&
            msg.receiverBic && msg.receiverBic.trim() !== '' &&
            msg.amount && msg.amount > 0 &&
            msg.currency &&
            msg.status &&
            // Require linked LC or Payment ID
            (msg.linkedLcId || msg.linkedPaymentId)
          );
        });
        
        // Step 2: Remove duplicates based on messageId (keep most recent)
        const messageMap = completeMessages.reduce((map: Map<string, SWIFTMessage>, msg: SWIFTMessage) => {
          const existing = map.get(msg.messageId);
          if (!existing || new Date(msg.updatedAt) > new Date(existing.updatedAt)) {
            map.set(msg.messageId, msg);
          }
          return map;
        }, new Map<string, SWIFTMessage>());
        
        const uniqueMessages: SWIFTMessage[] = Array.from(messageMap.values());
        
        const filteredCount = (result.data || []).length - completeMessages.length;
        const duplicateCount = completeMessages.length - uniqueMessages.length;
        
        if (filteredCount > 0) {
          console.warn(`[SWIFT] Filtered out ${filteredCount} incomplete SWIFT messages (missing required fields or LC/Payment links)`);
        }
        if (duplicateCount > 0) {
          console.warn(`[SWIFT] Removed ${duplicateCount} duplicate SWIFT messages`);
        }
        
        console.log(`[SWIFT] Displaying ${uniqueMessages.length} unique, complete SWIFT messages`);
        setMessages(uniqueMessages);
      } else {
        notification.error({
          message: 'Failed to load SWIFT messages',
          description: result.error?.message || 'Unknown error'
        });
      }
    } catch (error: any) {
      notification.error({
        message: 'Failed to load SWIFT messages',
        description: error.message || 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiFetch('/swift/statistics');
      const result = await response.json();
      
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        // Fallback: Calculate statistics from loaded messages if API fails
        calculateStatsFromMessages();
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
      // Fallback: Calculate from loaded messages
      calculateStatsFromMessages();
    }
  };

  const calculateStatsFromMessages = () => {
    if (messages.length === 0) {
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const userOrg = localStorage.getItem('userOrg') || 'CBETETAA';
    
    let messagesToday = 0;
    let pendingApproval = 0;
    let settledToday = 0;
    let totalValue = 0;
    let sent = 0;
    let received = 0;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    messages.forEach(msg => {
      // Count by type
      byType[msg.messageType] = (byType[msg.messageType] || 0) + 1;
      
      // Count by status
      byStatus[msg.status] = (byStatus[msg.status] || 0) + 1;

      // Messages created today
      const msgDate = msg.createdAt ? msg.createdAt.split('T')[0] : '';
      if (msgDate === today) {
        messagesToday++;
      }

      // Pending approval
      if (msg.status === 'PENDING_APPROVAL') {
        pendingApproval++;
      }

      // Settled today
      if (msg.status === 'SETTLED') {
        const settledDate = msg.updatedAt ? msg.updatedAt.split('T')[0] : '';
        if (settledDate === today) {
          settledToday++;
        }
      }

      // Total value
      if (msg.amount) {
        totalValue += msg.amount;
      }

      // Sent vs received
      if (msg.senderBic === userOrg) {
        sent++;
      }
      if (msg.receiverBic === userOrg) {
        received++;
      }
    });

    setStats({
      totalMessages: messages.length,
      messagesToday,
      pendingApproval,
      settledToday,
      totalValue,
      sent,
      received,
      avgSettlementTime: 0, // Would need more data to calculate
      byType,
      byStatus,
    });
  };

  const applyFilters = () => {
    let filtered = [...messages];

    // Message type filter
    if (messageTypeFilter !== 'all') {
      filtered = filtered.filter(m => m.messageType === messageTypeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Direction filter
    if (directionFilter === 'SENT') {
      filtered = filtered.filter(m => m.senderBic === userOrg);
    } else if (directionFilter === 'RECEIVED') {
      filtered = filtered.filter(m => m.receiverBic === userOrg);
    }

    // Search filter
    if (searchText) {
      filtered = filtered.filter(m => 
        m.messageId.toLowerCase().includes(searchText.toLowerCase()) ||
        m.swiftReference.toLowerCase().includes(searchText.toLowerCase()) ||
        m.linkedLcId?.toLowerCase().includes(searchText.toLowerCase()) ||
        m.senderBic.toLowerCase().includes(searchText.toLowerCase()) ||
        m.receiverBic.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredMessages(filtered);
  };

  const getStatusColor = (status: string): string => {
    // CBE Color Scheme: Purple (#9b30b7), Golden (#FFD700), Black (#000000)
    const colors: Record<string, string> = {
      'DRAFT': '#000000',           // Black - inactive/draft state
      'PENDING_APPROVAL': '#9b30b7', // Purple - in progress
      'APPROVED': '#9b30b7',         // Purple - in progress
      'SENT': '#FFD700',             // Golden - active/success
      'IN_TRANSIT': '#9b30b7',       // Purple - in progress
      'RECEIVED': '#FFD700',         // Golden - active/success
      'PROCESSING': '#9b30b7',       // Purple - in progress
      'SETTLED': '#FFD700',          // Golden - active/success
      'REJECTED': '#000000',         // Black - failed/negative
      'FAILED': '#000000',           // Black - failed/negative
      'CANCELLED': '#000000',        // Black - failed/negative
    };
    return colors[status] || '#9b30b7';
  };

  const getMessageTypeColor = (type: string): string => {
    // Use CBE color rotation: Purple, Golden, Black
    const colors: Record<string, string> = {
      'MT700': '#9b30b7',  // Purple - LC issuance
      'MT710': '#FFD700',  // Golden - LC advice
      'MT707': '#9b30b7',  // Purple - LC amendment
      'MT730': '#FFD700',  // Golden - acknowledgement
      'MT750': '#000000',  // Black - discrepancy
      'MT752': '#9b30b7',  // Purple - authorization
      'MT754': '#FFD700',  // Golden - advice of refusal
      'MT103': '#9b30b7',  // Purple - payment
      'MT910': '#FFD700',  // Golden - confirmation
    };
    return colors[type] || '#9b30b7';
  };

  const viewMessageDetails = (messageId: string) => {
    setSelectedMessageId(messageId);
    setDetailModalVisible(true);
  };

  const handleMessageClick = (messageId: string) => {
    viewMessageDetails(messageId);
  };

  const handleDetailModalClose = () => {
    setDetailModalVisible(false);
    setSelectedMessageId(null);
  };

  const handleCreateSuccess = () => {
    setCreateModalVisible(false);
    loadMessages();
    loadStatistics();
  };

  const columns: ColumnsType<SWIFTMessage> = [
    {
      title: 'Message ID',
      dataIndex: 'messageId',
      key: 'messageId',
      width: 180,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {text.substring(0, 20)}...
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'messageType',
      key: 'messageType',
      width: 100,
      render: (type: string) => (
        <Tag style={{ backgroundColor: getMessageTypeColor(type), color: '#ffffff', border: 'none' }}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'SWIFT Ref',
      dataIndex: 'swiftReference',
      key: 'swiftReference',
      width: 130,
      render: (text: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Direction',
      key: 'direction',
      width: 100,
      render: (_: any, record: SWIFTMessage) => {
        const isSent = record.senderBic === userOrg;
        const color = isSent ? '#9b30b7' : '#FFD700'; // Purple for sent, Golden for received
        return (
          <Tag style={{ backgroundColor: color, color: '#ffffff', border: 'none' }}>
            {isSent ? '⬆️ SENT' : '⬇️ RECEIVED'}
          </Tag>
        );
      },
    },
    {
      title: 'From BIC',
      dataIndex: 'senderBic',
      key: 'senderBic',
      width: 110,
      render: (bic: string) => (
        <Tooltip title={bic}>
          <span style={{ fontFamily: 'monospace' }}>{bic}</span>
        </Tooltip>
      ),
    },
    {
      title: 'To BIC',
      dataIndex: 'receiverBic',
      key: 'receiverBic',
      width: 110,
      render: (bic: string) => (
        <Tooltip title={bic}>
          <span style={{ fontFamily: 'monospace' }}>{bic}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 130,
      render: (_: any, record: SWIFTMessage) => (
        record.amount ? (
          <span style={{ fontWeight: 'bold' }}>
            {record.currency} {record.amount.toLocaleString()}
          </span>
        ) : '-'
      ),
    },
    {
      title: 'LC/Payment',
      key: 'linked',
      width: 130,
      render: (_: any, record: SWIFTMessage) => {
        const hasLinked = record.linkedLcId || record.linkedPaymentId;
        if (!hasLinked) {
          return null; // Don't show anything if no linked data
        }
        return (
          <>
            {record.linkedLcId && (
              <div><Tag style={{ backgroundColor: '#9b30b7', color: '#ffffff', border: 'none' }}>{record.linkedLcId}</Tag></div>
            )}
            {record.linkedPaymentId && (
              <div><Tag style={{ backgroundColor: '#FFD700', color: '#000000', border: 'none' }}>{record.linkedPaymentId}</Tag></div>
            )}
          </>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag style={{ backgroundColor: getStatusColor(status), color: '#ffffff', border: 'none', fontWeight: 'bold' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Date',
      key: 'date',
      width: 150,
      render: (_: any, record: SWIFTMessage) => {
        const date = record.sentDate || record.receivedDate || record.createdAt;
        return dayjs(date).format('YYYY-MM-DD HH:mm');
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: any, record: SWIFTMessage) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewMessageDetails(record.messageId)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header with Notifications */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '16px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            SWIFT Message Center
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            Manage all SWIFT messages for international trade finance
          </p>
        </div>
        <Space>
          <SWIFTNotifications 
            key="notifications" 
            onMessageClick={handleMessageClick}
          />
          <Button
            key="statistics"
            icon={<BarChartOutlined />}
            onClick={() => setShowStatistics(!showStatistics)}
          >
            {showStatistics ? 'Hide' : 'Show'} Statistics
          </Button>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={loadMessages}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Message
          </Button>
        </Space>
      </div>

      {/* Main KPI Cards - Real-time statistics from blockchain */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Messages"
              value={stats?.totalMessages || messages.length}
              prefix={<MessageOutlined />}
              valueStyle={{ color: primaryColor }}
              suffix={
                <Tooltip title="All SWIFT messages in the system">
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    ({stats?.messagesToday || messages.filter(m => {
                      const today = new Date().toISOString().split('T')[0];
                      const msgDate = m.createdAt ? m.createdAt.split('T')[0] : '';
                      return msgDate === today;
                    }).length} today)
                  </span>
                </Tooltip>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Messages Today"
              value={stats?.messagesToday ?? messages.filter(m => {
                const today = new Date().toISOString().split('T')[0];
                const msgDate = m.createdAt ? m.createdAt.split('T')[0] : '';
                return msgDate === today;
              }).length}
              prefix={<SendOutlined />}
              valueStyle={{ color: secondaryColor }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Settled Today"
              value={stats?.settledToday ?? messages.filter(m => {
                const today = new Date().toISOString().split('T')[0];
                const msgDate = m.updatedAt ? m.updatedAt.split('T')[0] : '';
                return m.status === 'SETTLED' && msgDate === today;
              }).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={stats?.pendingApproval ?? messages.filter(m => m.status === 'PENDING_APPROVAL').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ 
                color: (stats?.pendingApproval ?? messages.filter(m => m.status === 'PENDING_APPROVAL').length) > 0 
                  ? '#faad14' 
                  : primaryColor 
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Statistics Section (Collapsible) */}
      {showStatistics && (
        <div style={{ marginBottom: '24px' }}>
          <SWIFTStatistics />
        </div>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Space size="middle" wrap>
          <Select
            style={{ width: 150 }}
            placeholder="Message Type"
            value={messageTypeFilter}
            onChange={setMessageTypeFilter}
          >
            <Option value="all">All Types</Option>
            <Option value="MT700">MT700 - LC</Option>
            <Option value="MT103">MT103 - Payment</Option>
            <Option value="MT750">MT750 - Discrepancy</Option>
            <Option value="MT752">MT752 - Authorization</Option>
            <Option value="MT754">MT754 - Negotiation</Option>
            <Option value="MT710">MT710 - Advice</Option>
            <Option value="MT730">MT730 - Acknowledgment</Option>
          </Select>

          <Select
            style={{ width: 150 }}
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All Status</Option>
            <Option value="DRAFT">Draft</Option>
            <Option value="SENT">Sent</Option>
            <Option value="RECEIVED">Received</Option>
            <Option value="PROCESSING">Processing</Option>
            <Option value="SETTLED">Settled</Option>
            <Option value="REJECTED">Rejected</Option>
          </Select>

          <Select
            style={{ width: 150 }}
            placeholder="Direction"
            value={directionFilter}
            onChange={setDirectionFilter}
          >
            <Option value="all">All</Option>
            <Option value="SENT">Sent ⬆️</Option>
            <Option value="RECEIVED">Received ⬇️</Option>
          </Select>

          <Input
            style={{ width: 250 }}
            placeholder="Search by ID, SWIFT Ref, LC ID, BIC..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={loadMessages}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Messages Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredMessages}
          rowKey="messageId"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            current: propCurrentPage !== undefined ? propCurrentPage + 1 : undefined,
            pageSize: propRowsPerPage || 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '25', '50', '100'],
            showTotal: (total, range) => `Page ${propCurrentPage !== undefined ? propCurrentPage + 1 : 1} shows items ${range[0]}-${range[1]} of ${total}`,
            onChange: (page, pageSize) => {
              if (onPageChange) onPageChange(page - 1);
              if (onRowsPerPageChange && pageSize !== propRowsPerPage) onRowsPerPageChange(pageSize);
            },
          }}
        />
      </Card>

      {/* Message Detail Modal */}
      <SWIFTMessageDetail
        messageId={selectedMessageId}
        visible={detailModalVisible}
        onClose={handleDetailModalClose}
        onRefresh={loadMessages}
      />

      {/* Create Message Modal */}
      <CreateSWIFTMessage
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default SWIFTDashboard;
