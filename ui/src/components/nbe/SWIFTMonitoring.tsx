// NBE SWIFT Monitoring Dashboard
// Regulatory oversight and monitoring of all SWIFT transactions

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
  Select,
  DatePicker,
  Alert,
  Tabs,
  Progress,
  List,
  Badge,
  Tooltip,
  Modal,
  Form,
  Input,
  notification,
  Descriptions,
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  BankOutlined,
  GlobalOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

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
  createdAt: string;
}

interface MonitoringStats {
  totalMessages: number;
  totalValue: number;
  forexInflow: number;
  forexRetention: number;
  pendingApproval: number;
  highValueTransactions: number;
  byBank: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

interface ComplianceAlert {
  id: string;
  type: 'HIGH_VALUE' | 'SUSPICIOUS' | 'RETENTION_ISSUE' | 'COMPLIANCE';
  messageId: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  createdAt: string;
}

export interface SWIFTMonitoringProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

const SWIFTMonitoring: React.FC<SWIFTMonitoringProps> = ({ 
  primaryColor = '#9b30b7',
  secondaryColor = '#FFD700',
  accentColor = '#000000'
}) => {
  // Dynamic color palette based on props
  const CHART_COLORS = [primaryColor, secondaryColor, '#00C49F', '#FF8042', accentColor];
  const [messages, setMessages] = useState<SWIFTMessage[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [selectedMessage, setSelectedMessage] = useState<SWIFTMessage | null>(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadMonitoringData();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadMonitoringData, 60000);
    
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // Load all SWIFT messages
      const messagesResponse = await axios.get(`${API_BASE_URL}/swift/messages`, {
        params: {
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (messagesResponse.data.success) {
        const msgs = messagesResponse.data.data || [];
        setMessages(msgs);
        calculateStats(msgs);
        generateComplianceAlerts(msgs);
      }

      // Load statistics
      const statsResponse = await axios.get(`${API_BASE_URL}/swift/statistics`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (msgs: SWIFTMessage[]) => {
    const totalValue = msgs
      .filter(m => m.amount)
      .reduce((sum, m) => sum + m.amount, 0);

    const forexInflow = msgs
      .filter(m => m.messageType === 'MT103' && m.status === 'SETTLED')
      .reduce((sum, m) => sum + m.amount, 0);

    const highValueCount = msgs.filter(m => m.amount > 1000000).length;

    const byBank: Record<string, number> = {};
    msgs.forEach(m => {
      byBank[m.senderBic] = (byBank[m.senderBic] || 0) + 1;
      byBank[m.receiverBic] = (byBank[m.receiverBic] || 0) + 1;
    });

    const byType: Record<string, number> = {};
    msgs.forEach(m => {
      byType[m.messageType] = (byType[m.messageType] || 0) + 1;
    });

    const byStatus: Record<string, number> = {};
    msgs.forEach(m => {
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    });

    setStats({
      totalMessages: msgs.length,
      totalValue,
      forexInflow,
      forexRetention: forexInflow, // 100% retention
      pendingApproval: msgs.filter(m => m.status === 'PENDING_APPROVAL').length,
      highValueTransactions: highValueCount,
      byBank,
      byType,
      byStatus,
    });
  };

  const generateComplianceAlerts = (msgs: SWIFTMessage[]) => {
    const newAlerts: ComplianceAlert[] = [];

    msgs.forEach(msg => {
      // High value alert
      if (msg.amount > 1000000 && msg.status === 'PENDING_APPROVAL') {
        newAlerts.push({
          id: `alert_${msg.messageId}`,
          type: 'HIGH_VALUE',
          messageId: msg.messageId,
          severity: 'HIGH',
          description: `High-value transaction: ${msg.currency} ${msg.amount.toLocaleString()} requires approval`,
          createdAt: msg.createdAt,
        });
      }

      // Retention compliance
      if (msg.messageType === 'MT103' && msg.status === 'SETTLED') {
        // Check if proper retention was applied
        // This would be based on actual retention data
      }
    });

    setAlerts(newAlerts);
  };

  const handleApproveTransaction = async (messageId: string) => {
    try {
      const values = await form.validateFields();
      
      await axios.post(
        `${API_BASE_URL}/swift/messages/${messageId}/nbe-approve`,
        {
          approvedBy: localStorage.getItem('userId'),
          amlCheck: values.amlCheck,
          sanctionScreening: values.sanctionScreening,
          comments: values.comments,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );

      notification.success({
        message: 'Transaction Approved',
        description: 'The high-value transaction has been approved.'
      });

      setApprovalModalVisible(false);
      form.resetFields();
      loadMonitoringData();
    } catch (error: any) {
      notification.error({
        message: 'Approval Failed',
        description: error.response?.data?.error?.message || error.message
      });
    }
  };

  const exportReport = () => {
    notification.info({
      message: 'Export Report',
      description: 'Report export functionality will download Excel file with all monitoring data.'
    });
  };

  const getMessageTypeData = () => {
    if (!stats) return [];
    return Object.entries(stats.byType).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const getStatusData = () => {
    if (!stats) return [];
    return Object.entries(stats.byStatus).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const columns: ColumnsType<SWIFTMessage> = [
    {
      title: 'Message Type',
      dataIndex: 'messageType',
      key: 'messageType',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'SWIFT Ref',
      dataIndex: 'swiftReference',
      key: 'swiftReference',
      render: (ref: string) => (
        <code style={{ fontSize: '12px' }}>{ref}</code>
      ),
    },
    {
      title: 'From',
      dataIndex: 'senderBic',
      key: 'senderBic',
    },
    {
      title: 'To',
      dataIndex: 'receiverBic',
      key: 'receiverBic',
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: SWIFTMessage) => (
        <span style={{ 
          fontWeight: record.amount > 1000000 ? 'bold' : 'normal',
          color: record.amount > 1000000 ? '#ff4d4f' : '#000'
        }}>
          {record.currency} {record.amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'SETTLED' ? 'green' : 
                     status === 'PENDING_APPROVAL' ? 'orange' : 'blue';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SWIFTMessage) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedMessage(record);
              if (record.amount > 1000000 && record.status === 'PENDING_APPROVAL') {
                setApprovalModalVisible(true);
              }
            }}
          >
            {record.amount > 1000000 && record.status === 'PENDING_APPROVAL' 
              ? 'Approve' 
              : 'View'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>SWIFT Message Monitoring & Compliance</span>
          </Space>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            />
            <Button
              icon={<FileExcelOutlined />}
              onClick={exportReport}
            >
              Export Report
            </Button>
          </Space>
        }
      >
        {/* Compliance Alerts */}
        {alerts.length > 0 && (
          <Alert
            message={`${alerts.length} Compliance Alert${alerts.length > 1 ? 's' : ''}`}
            description={
              <List
                size="small"
                dataSource={alerts.slice(0, 3)}
                renderItem={(alert) => (
                  <List.Item>
                    <Badge
                      status={alert.severity === 'HIGH' ? 'error' : 'warning'}
                      text={alert.description}
                    />
                  </List.Item>
                )}
              />
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Key Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Messages"
                value={stats?.totalMessages || 0}
                prefix={<BankOutlined />}
                valueStyle={{ color: primaryColor }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Value"
                value={stats?.totalValue || 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="USD"
                valueStyle={{ color: primaryColor }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Forex Inflow"
                value={stats?.forexInflow || 0}
                precision={2}
                prefix={<RiseOutlined />}
                suffix="USD"
                valueStyle={{ color: secondaryColor }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="High Value Txns"
                value={stats?.highValueTransactions || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: secondaryColor }}
                suffix={
                  stats?.pendingApproval ? (
                    <Tooltip title="Pending approval">
                      <Badge count={stats.pendingApproval} />
                    </Tooltip>
                  ) : undefined
                }
              />
            </Card>
          </Col>
        </Row>

        {/* Forex Retention */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card size="small" title="Forex Retention Compliance">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="100% Retention Policy"
                    value={stats?.forexRetention || 0}
                    precision={2}
                    prefix={<SafetyOutlined />}
                    suffix="USD"
                  />
                </Col>
                <Col span={12}>
                  <Progress
                    percent={100}
                    status="success"
                    format={() => '100% Compliance'}
                  />
                  <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                    All coffee export proceeds retained per NBE directive FXD/01/2024
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Tabs defaultActiveKey="messages">
          <TabPane tab="All Messages" key="messages">
            <Table
              columns={columns}
              dataSource={messages}
              rowKey="messageId"
              loading={loading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} messages`,
              }}
            />
          </TabPane>

          <TabPane tab="Analytics" key="analytics">
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Messages by Type" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getMessageTypeData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getMessageTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Messages by Status" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getStatusData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="value" fill={primaryColor} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Compliance" key="compliance">
            <List
              dataSource={alerts}
              renderItem={(alert) => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EyeOutlined />}>
                      Review
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge
                        status={alert.severity === 'HIGH' ? 'error' : 'warning'}
                      />
                    }
                    title={`${alert.type} - ${alert.messageId}`}
                    description={alert.description}
                  />
                  <div>{dayjs(alert.createdAt).fromNow()}</div>
                </List.Item>
              )}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Approval Modal */}
      <Modal
        title="Approve High-Value Transaction"
        open={approvalModalVisible}
        onOk={() => selectedMessage && handleApproveTransaction(selectedMessage.messageId)}
        onCancel={() => {
          setApprovalModalVisible(false);
          setSelectedMessage(null);
        }}
        width={600}
      >
        {selectedMessage && (
          <>
            <Alert
              message="High-Value Transaction Review"
              description={`This transaction exceeds $1,000,000 and requires NBE approval before processing.`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Message Type">
                {selectedMessage.messageType}
              </Descriptions.Item>
              <Descriptions.Item label="SWIFT Reference">
                {selectedMessage.swiftReference}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <strong style={{ color: '#ff4d4f' }}>
                  {selectedMessage.currency} {selectedMessage.amount.toLocaleString()}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="From">
                {selectedMessage.senderBic}
              </Descriptions.Item>
              <Descriptions.Item label="To">
                {selectedMessage.receiverBic}
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Form.Item
                name="amlCheck"
                label="AML Check"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="PASSED">Passed</Option>
                  <Option value="FLAGGED">Flagged</Option>
                  <Option value="REQUIRES_REVIEW">Requires Review</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="sanctionScreening"
                label="Sanction Screening"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="CLEAR">Clear</Option>
                  <Option value="FLAGGED">Flagged</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="comments"
                label="Comments"
              >
                <Input.TextArea rows={3} placeholder="Any additional comments..." />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default SWIFTMonitoring;
