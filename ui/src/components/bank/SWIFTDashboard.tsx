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
  messagestoday: number;
  pendingApproval: number;
  settledToday: number;
  totalValue: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface SWIFTDashboardProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

const SWIFTDashboard: React.FC<SWIFTDashboardProps> = ({ 
  primaryColor = '#9b30b7',
  secondaryColor = '#FFD700',
  accentColor = '#000000'
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
  }, [messages, messageTypeFilter, statusFilter, directionFilter, searchText]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/swift/messages');
      const result = await response.json();
      
      if (result.success) {
        setMessages(result.data || []);
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
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
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
    const colors: Record<string, string> = {
      'DRAFT': 'default',
      'PENDING_APPROVAL': 'warning',
      'APPROVED': 'processing',
      'SENT': 'success',
      'IN_TRANSIT': 'processing',
      'RECEIVED': 'success',
      'PROCESSING': 'processing',
      'SETTLED': 'success',
      'REJECTED': 'error',
      'FAILED': 'error',
      'CANCELLED': 'default',
    };
    return colors[status] || 'default';
  };

  const getMessageTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'MT700': 'blue',
      'MT710': 'cyan',
      'MT707': 'purple',
      'MT730': 'green',
      'MT750': 'red',
      'MT752': 'orange',
      'MT754': 'gold',
      'MT103': 'magenta',
      'MT910': 'lime',
    };
    return colors[type] || 'default';
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
        <Tag color={getMessageTypeColor(type)}>{type}</Tag>
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
        return (
          <Tag color={isSent ? 'blue' : 'green'}>
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
          return <span style={{ color: '#ccc' }}>—</span>;
        }
        return (
          <>
            {record.linkedLcId && (
              <div><Tag color="blue">{record.linkedLcId}</Tag></div>
            )}
            {record.linkedPaymentId && (
              <div><Tag color="purple">{record.linkedPaymentId}</Tag></div>
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
        <Tag color={getStatusColor(status)}>{status}</Tag>
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

      {/* Statistics Section (Collapsible) */}
      {showStatistics && (
        <div style={{ marginBottom: '24px' }}>
          <SWIFTStatistics />
        </div>
      )}

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Messages Today"
              value={stats?.messagestoday || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: primaryColor }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={stats?.pendingApproval || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: secondaryColor }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Settled Today"
              value={stats?.settledToday || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: primaryColor }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={stats?.totalValue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: primaryColor }}
            />
          </Card>
        </Col>
      </Row>

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
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} messages`,
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
