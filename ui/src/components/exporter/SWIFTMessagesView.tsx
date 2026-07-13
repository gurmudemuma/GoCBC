// Exporter SWIFT Messages View Component
// Read-only view for exporters to track LC and payment status

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Timeline,
  Descriptions,
  Alert,
  Space,
  Button,
  Input,
  Select,
  Modal,
  Tabs,
  Empty,
  Tooltip,
  Progress,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';

dayjs.extend(relativeTime);

const { Option } = Select;
const { TabPane } = Tabs;

interface SWIFTMessage {
  messageId: string;
  messageType: string;
  swiftReference: string;
  linkedLcId?: string;
  linkedPaymentId?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  sentDate?: string;
  receivedDate?: string;
  beneficiary?: string;
}

interface LCStatus {
  lcId: string;
  lcNumber: string;
  amount: number;
  currency: string;
  status: string;
  issuedDate?: string;
  expiryDate?: string;
  messages: SWIFTMessage[];
}

const SWIFTMessagesView: React.FC = () => {
  const [lcStatuses, setLcStatuses] = useState<LCStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLC, setSelectedLC] = useState<LCStatus | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const exporterId = localStorage.getItem('userId');

  useEffect(() => {
    loadLCStatuses();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadLCStatuses, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadLCStatuses = async () => {
    setLoading(true);
    try {
      // Get exporter's LCs
      const lcsResponse = await axios.get(`${API_BASE_URL}/banking/lc`, {
        params: { exporterId },
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (lcsResponse.data.success) {
        const lcs = lcsResponse.data.data || [];
        
        // For each LC, get related SWIFT messages
        const lcStatusesPromises = lcs.map(async (lc: any) => {
          try {
            const messagesResponse = await axios.get(`${API_BASE_URL}/swift/messages`, {
              params: { lcId: lc.lcId },
              headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            return {
              lcId: lc.lcId,
              lcNumber: lc.lcNumber || lc.lcId,
              amount: lc.amount,
              currency: lc.currency || 'USD',
              status: lc.status,
              issuedDate: lc.issuedDate,
              expiryDate: lc.expiryDate,
              messages: messagesResponse.data.success ? messagesResponse.data.data : [],
            };
          } catch (error) {
            console.error(`Failed to load messages for LC ${lc.lcId}:`, error);
            return {
              lcId: lc.lcId,
              lcNumber: lc.lcNumber || lc.lcId,
              amount: lc.amount,
              currency: lc.currency || 'USD',
              status: lc.status,
              issuedDate: lc.issuedDate,
              expiryDate: lc.expiryDate,
              messages: [],
            };
          }
        });

        const lcStatuses = await Promise.all(lcStatusesPromises);
        setLcStatuses(lcStatuses);
      }
    } catch (error) {
      console.error('Failed to load LC statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'REQUESTED': 'blue',
      'APPROVED': 'cyan',
      'ISSUED': 'green',
      'DOCUMENTS_SUBMITTED': 'orange',
      'UNDER_REVIEW': 'gold',
      'PAID': 'purple',
      'CLOSED': 'default',
    };
    return colors[status] || 'default';
  };

  const getMessageTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'MT700': 'blue',
      'MT710': 'cyan',
      'MT750': 'red',
      'MT752': 'orange',
      'MT754': 'gold',
      'MT103': 'magenta',
      'MT910': 'lime',
    };
    return colors[type] || 'default';
  };

  const getPaymentProgress = (messages: SWIFTMessage[]): number => {
    const stages = ['MT700', 'MT710', 'MT754', 'MT752', 'MT103', 'MT910'];
    const completedStages = messages
      .filter(m => stages.includes(m.messageType))
      .map(m => m.messageType);
    
    const uniqueStages = new Set(completedStages);
    return (uniqueStages.size / stages.length) * 100;
  };

  const viewLCDetails = (lc: LCStatus) => {
    setSelectedLC(lc);
    setDetailModalVisible(true);
  };

  const filteredLCs = lcStatuses.filter(lc => {
    if (statusFilter !== 'all' && lc.status !== statusFilter) return false;
    if (searchText && !lc.lcNumber.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const columns: ColumnsType<LCStatus> = [
    {
      title: 'LC Number',
      dataIndex: 'lcNumber',
      key: 'lcNumber',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: LCStatus) => (
        <span style={{ fontWeight: 'bold' }}>
          {record.currency} {record.amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'LC Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Payment Progress',
      key: 'progress',
      render: (_: any, record: LCStatus) => {
        const progress = getPaymentProgress(record.messages);
        return (
          <Progress
            percent={progress}
            size="small"
            status={progress === 100 ? 'success' : 'active'}
          />
        );
      },
    },
    {
      title: 'Messages',
      key: 'messages',
      render: (_: any, record: LCStatus) => (
        <Space>
          <Tag color="blue">{record.messages.length} messages</Tag>
          {record.messages.some(m => m.messageType === 'MT750') && (
            <Tag color="red">Has Discrepancy</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Issued',
      dataIndex: 'issuedDate',
      key: 'issuedDate',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: 'Expires',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: string) => {
        if (!date) return '-';
        const daysLeft = dayjs(date).diff(dayjs(), 'days');
        return (
          <Tooltip title={`${daysLeft} days remaining`}>
            <span style={{ color: daysLeft < 30 ? '#ff4d4f' : '#000' }}>
              {dayjs(date).format('YYYY-MM-DD')}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: LCStatus) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => viewLCDetails(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <BankOutlined />
            <span>My Letter of Credits & SWIFT Messages</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadLCStatuses}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Alert
          message="Read-Only View"
          description="You can track the status of your LCs and related SWIFT messages. For any questions, contact your bank."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total LCs"
                value={lcStatuses.length}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Active LCs"
                value={lcStatuses.filter(lc => lc.status === 'ISSUED').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Under Review"
                value={lcStatuses.filter(lc => lc.status === 'UNDER_REVIEW').length}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Paid"
                value={lcStatuses.filter(lc => lc.status === 'PAID').length}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search LC Number"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Option value="all">All Status</Option>
            <Option value="ISSUED">Issued</Option>
            <Option value="DOCUMENTS_SUBMITTED">Under Review</Option>
            <Option value="PAID">Paid</Option>
          </Select>
        </Space>

        {/* LC Table */}
        <Table
          columns={columns}
          dataSource={filteredLCs}
          rowKey="lcId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} LCs`,
          }}
        />
      </Card>

      {/* LC Detail Modal */}
      <Modal
        title={`LC Details: ${selectedLC?.lcNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedLC && (
          <Tabs defaultActiveKey="overview">
            <TabPane tab="Overview" key="overview">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="LC Number" span={2}>
                  <strong>{selectedLC.lcNumber}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                  {selectedLC.currency} {selectedLC.amount.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(selectedLC.status)}>
                    {selectedLC.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Issued Date">
                  {selectedLC.issuedDate 
                    ? dayjs(selectedLC.issuedDate).format('YYYY-MM-DD')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Expiry Date">
                  {selectedLC.expiryDate 
                    ? dayjs(selectedLC.expiryDate).format('YYYY-MM-DD')
                    : '-'}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 16 }}>
                <strong>Payment Progress:</strong>
                <Progress
                  percent={getPaymentProgress(selectedLC.messages)}
                  status={getPaymentProgress(selectedLC.messages) === 100 ? 'success' : 'active'}
                  style={{ marginTop: 8 }}
                />
              </div>
            </TabPane>

            <TabPane tab={`SWIFT Messages (${selectedLC.messages.length})`} key="messages">
              {selectedLC.messages.length === 0 ? (
                <Empty description="No SWIFT messages yet" />
              ) : (
                <Table
                  dataSource={selectedLC.messages}
                  rowKey="messageId"
                  pagination={false}
                  columns={[
                    {
                      title: 'Type',
                      dataIndex: 'messageType',
                      key: 'messageType',
                      render: (type: string) => (
                        <Tag color={getMessageTypeColor(type)}>{type}</Tag>
                      ),
                    },
                    {
                      title: 'Reference',
                      dataIndex: 'swiftReference',
                      key: 'swiftReference',
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => <Tag>{status}</Tag>,
                    },
                    {
                      title: 'Date',
                      key: 'date',
                      render: (_: any, record: SWIFTMessage) => {
                        const date = record.sentDate || record.receivedDate || record.createdAt;
                        return dayjs(date).format('YYYY-MM-DD HH:mm');
                      },
                    },
                  ]}
                />
              )}
            </TabPane>

            <TabPane tab="Timeline" key="timeline">
              <Timeline>
                {selectedLC.messages
                  .sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  )
                  .map((msg) => (
                    <Timeline.Item
                      key={msg.messageId}
                      color={msg.messageType === 'MT750' ? 'red' : 'green'}
                      dot={
                        msg.messageType === 'MT750' ? undefined : <CheckCircleOutlined />
                      }
                    >
                      <strong>{msg.messageType}</strong> - {msg.swiftReference}
                      <br />
                      <small style={{ color: '#999' }}>
                        {dayjs(msg.createdAt).format('YYYY-MM-DD HH:mm')}
                        {' '}({dayjs(msg.createdAt).fromNow()})
                      </small>
                    </Timeline.Item>
                  ))}
              </Timeline>
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
};

export default SWIFTMessagesView;
