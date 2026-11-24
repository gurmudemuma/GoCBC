// SWIFT Statistics Widget Component
// Summary cards and charts for SWIFT message analytics

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
  WarningOutlined,
  SendOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiFetch } from '@/config/api.config';

interface SWIFTStats {
  totalMessages: number;
  messagesToday: number;
  pendingApproval: number;
  settledToday: number;
  totalValue: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  sent: number;
  received: number;
  avgSettlementTime: number;
}

interface MessageTypeStats {
  type: string;
  count: number;
  value: number;
  percentage: number;
}

const SWIFTStatistics: React.FC = () => {
  const [stats, setStats] = useState<SWIFTStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatistics();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadStatistics, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/swift/statistics');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageTypeData = (): MessageTypeStats[] => {
    if (!stats || !stats.byType) return [];
    
    const total = Object.values(stats.byType).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(stats.byType).map(([type, count]) => ({
      type,
      count,
      value: 0, // In real app, would have value data
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  };

  const getStatusData = () => {
    if (!stats || !stats.byStatus) return [];
    
    return Object.entries(stats.byStatus).map(([status, count]) => ({
      status,
      count,
    }));
  };

  const messageTypeColumns: ColumnsType<MessageTypeStats> = [
    {
      title: 'Message Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <strong>{type}</strong>
      ),
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right',
      render: (percentage: number) => (
        <Progress
          percent={percentage}
          size="small"
          format={(percent) => `${percent?.toFixed(1)}%`}
        />
      ),
    },
  ];

  if (loading && !stats) {
    return (
      <Card>
        <Spin tip="Loading statistics..." />
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <Empty description="No statistics available" />
      </Card>
    );
  }

  return (
    <div>
      {/* Main Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Messages Today"
              value={stats.messagesToday}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                <Tooltip title="Total messages sent and received today">
                  <span style={{ fontSize: '14px', color: '#999' }}>
                    / {stats.totalMessages} total
                  </span>
                </Tooltip>
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={stats.pendingApproval}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={
                stats.pendingApproval > 0 && (
                  <WarningOutlined style={{ fontSize: '14px', color: '#faad14' }} />
                )
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Settled Today"
              value={stats.settledToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={stats.totalValue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="USD"
            />
          </Card>
        </Col>
      </Row>

      {/* Direction Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Messages Sent"
              value={stats.sent || 0}
              prefix={<SendOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                <span style={{ fontSize: '14px', color: '#999' }}>
                  ({stats.sent && stats.totalMessages 
                    ? ((stats.sent / stats.totalMessages) * 100).toFixed(0)
                    : 0}%)
                </span>
              }
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Messages Received"
              value={stats.received || 0}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <span style={{ fontSize: '14px', color: '#999' }}>
                  ({stats.received && stats.totalMessages 
                    ? ((stats.received / stats.totalMessages) * 100).toFixed(0)
                    : 0}%)
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Average Settlement Time */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Statistic
              title="Average Settlement Time"
              value={stats.avgSettlementTime || 0}
              precision={1}
              prefix={<ClockCircleOutlined />}
              suffix="days"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
              Target: 3-5 days for air freight, 35-40 days for sea freight
            </div>
          </Card>
        </Col>
      </Row>

      {/* Message Type Distribution */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title="Messages by Type"
            size="small"
            extra={
              <Tooltip title="Distribution of SWIFT message types">
                <MessageOutlined />
              </Tooltip>
            }
          >
            <Table
              columns={messageTypeColumns}
              dataSource={getMessageTypeData()}
              rowKey="type"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Status Distribution */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title="Messages by Status"
            size="small"
          >
            <Row gutter={[16, 16]}>
              {getStatusData().map(({ status, count }) => (
                <Col xs={12} sm={8} md={6} key={status}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: getStatusColor(status) }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                      {status}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'DRAFT': '#d9d9d9',
    'PENDING_APPROVAL': '#faad14',
    'APPROVED': '#1890ff',
    'SENT': '#52c41a',
    'IN_TRANSIT': '#1890ff',
    'RECEIVED': '#52c41a',
    'PROCESSING': '#faad14',
    'SETTLED': '#722ed1',
    'REJECTED': '#ff4d4f',
    'FAILED': '#ff4d4f',
  };
  return colors[status] || '#d9d9d9';
};

export default SWIFTStatistics;
