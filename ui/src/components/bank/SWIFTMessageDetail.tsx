// SWIFT Message Detail View Component
// Comprehensive view of a single SWIFT message with all details

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Descriptions,
  Timeline,
  Button,
  Space,
  Tag,
  Alert,
  List,
  Divider,
  Card,
  Row,
  Col,
  Spin,
  notification,
  Popconfirm,
} from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';

dayjs.extend(relativeTime);

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
  linkedPaymentId?: string;
  sentDate?: string;
  receivedDate?: string;
  processedDate?: string;
  settledDate?: string;
  beneficiary?: string;
  orderingCustomer?: string;
  beneficiaryAccount?: string;
  remittanceInfo?: string;
  valueDate?: string;
  chargeCode?: string;
  
  // LC specific
  lcNumber?: string;
  applicant?: string;
  lcExpiryDate?: string;
  loadingPort?: string;
  dischargePort?: string;
  latestShipDate?: string;
  documents?: string[];
  
  // Discrepancy specific
  discrepancyDetails?: string;
  discrepancyList?: string[];
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approvedBy?: string;
  sentBy?: string;
  
  messageHash?: string;
}

interface SWIFTMessageDetailProps {
  messageId: string | null;
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const SWIFTMessageDetail: React.FC<SWIFTMessageDetailProps> = ({
  messageId,
  visible,
  onClose,
  onRefresh,
}) => {
  const [message, setMessage] = useState<SWIFTMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (messageId && visible) {
      loadMessageDetails();
    }
  }, [messageId, visible]);

  const loadMessageDetails = async () => {
    if (!messageId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/swift/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (response.data.success) {
        setMessage(response.data.data);
      }
    } catch (error: any) {
      notification.error({
        message: 'Failed to load message details',
        description: error.response?.data?.error?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!messageId) return;
    
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/swift/messages/${messageId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      
      notification.success({
        message: 'Message Approved',
        description: 'SWIFT message has been approved successfully.'
      });
      
      loadMessageDetails();
      onRefresh?.();
    } catch (error: any) {
      notification.error({
        message: 'Approval Failed',
        description: error.response?.data?.error?.message || error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageId) return;
    
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/swift/messages/${messageId}/send`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      
      notification.success({
        message: 'Message Sent',
        description: 'SWIFT message has been sent successfully.'
      });
      
      loadMessageDetails();
      onRefresh?.();
    } catch (error: any) {
      notification.error({
        message: 'Send Failed',
        description: error.response?.data?.error?.message || error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!messageId) return;
    
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/swift/messages/${messageId}/receive`,
        { receivedBy: localStorage.getItem('userId') || 'bank_officer' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      
      notification.success({
        message: 'Message Received',
        description: 'SWIFT message has been marked as received.'
      });
      
      loadMessageDetails();
      onRefresh?.();
    } catch (error: any) {
      notification.error({
        message: 'Receive Failed',
        description: error.response?.data?.error?.message || error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!messageId) return;
    
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/swift/messages/${messageId}/process`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      
      notification.success({
        message: 'Processing Started',
        description: 'SWIFT message is now being processed.'
      });
      
      loadMessageDetails();
      onRefresh?.();
    } catch (error: any) {
      notification.error({
        message: 'Processing Failed',
        description: error.response?.data?.error?.message || error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!messageId) return;
    
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/swift/messages/${messageId}/settle`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      
      notification.success({
        message: 'Message Settled',
        description: 'SWIFT message has been settled successfully.'
      });
      
      loadMessageDetails();
      onRefresh?.();
    } catch (error: any) {
      notification.error({
        message: 'Settlement Failed',
        description: error.response?.data?.error?.message || error.message
      });
    } finally {
      setActionLoading(false);
    }
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

  const exportPDF = () => {
    notification.info({
      message: 'Export PDF',
      description: 'PDF export functionality will be implemented.'
    });
  };

  const printMessage = () => {
    window.print();
  };

  if (!message && !loading) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <span>SWIFT Message Details</span>
          {message && (
            <>
              <Tag color={getMessageTypeColor(message.messageType)}>
                {message.messageType}
              </Tag>
              <Tag color={getStatusColor(message.status)}>
                {message.status}
              </Tag>
            </>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="print" icon={<PrinterOutlined />} onClick={printMessage}>
          Print
        </Button>,
        <Button key="export" icon={<DownloadOutlined />} onClick={exportPDF}>
          Export PDF
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadMessageDetails}>
          Refresh
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {message && (
          <>
            {/* Action Buttons */}
            {message.status === 'DRAFT' && (
              <Alert
                message="Draft Message"
                description="This message is in draft status. Approve and send to complete."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleApprove}
                      loading={actionLoading}
                    >
                      Approve
                    </Button>
                  </Space>
                }
              />
            )}
            
            {message.status === 'APPROVED' && (
              <Alert
                message="Ready to Send"
                description="This message is approved and ready to be sent."
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Button
                    size="small"
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    loading={actionLoading}
                  >
                    Send Now
                  </Button>
                }
              />
            )}
            
            {message.status === 'RECEIVED' && message.messageType === 'MT103' && (
              <Alert
                message="Payment Received"
                description="Process this payment to credit the beneficiary."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleProcess}
                      loading={actionLoading}
                    >
                      Process Payment
                    </Button>
                  </Space>
                }
              />
            )}
            
            {message.status === 'PROCESSING' && (
              <Alert
                message="Processing"
                description="Complete the settlement to finalize this transaction."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                action={
                  <Popconfirm
                    title="Settle this transaction?"
                    description="This will mark the transaction as complete."
                    onConfirm={handleSettle}
                    okText="Yes, Settle"
                    cancelText="Cancel"
                  >
                    <Button
                      size="small"
                      type="primary"
                      loading={actionLoading}
                    >
                      Settle
                    </Button>
                  </Popconfirm>
                }
              />
            )}

            <Tabs defaultActiveKey="basic">
              {/* Basic Information */}
              <TabPane tab="Basic Info" key="basic">
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Message ID" span={2}>
                    <code style={{ fontSize: '12px' }}>{message.messageId}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Message Type">
                    <Tag color={getMessageTypeColor(message.messageType)}>
                      {message.messageType}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="SWIFT Reference">
                    <code>{message.swiftReference}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={getStatusColor(message.status)}>
                      {message.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Amount">
                    {message.amount 
                      ? `${message.currency} ${message.amount.toLocaleString()}`
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sender BIC">
                    <code>{message.senderBic}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Receiver BIC">
                    <code>{message.receiverBic}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="LC ID">
                    {message.linkedLcId ? (
                      <Tag color="blue">{message.linkedLcId}</Tag>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Payment ID">
                    {message.linkedPaymentId ? (
                      <Tag color="purple">{message.linkedPaymentId}</Tag>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created">
                    {dayjs(message.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    <br />
                    <small style={{ color: '#999' }}>
                      ({dayjs(message.createdAt).fromNow()})
                    </small>
                  </Descriptions.Item>
                  <Descriptions.Item label="Updated">
                    {dayjs(message.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                    <br />
                    <small style={{ color: '#999' }}>
                      ({dayjs(message.updatedAt).fromNow()})
                    </small>
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              {/* Transaction Details */}
              <TabPane tab="Transaction Details" key="transaction">
                <Descriptions bordered column={1}>
                  {message.beneficiary && (
                    <Descriptions.Item label="Beneficiary">
                      {message.beneficiary}
                    </Descriptions.Item>
                  )}
                  {message.orderingCustomer && (
                    <Descriptions.Item label="Ordering Customer">
                      {message.orderingCustomer}
                    </Descriptions.Item>
                  )}
                  {message.beneficiaryAccount && (
                    <Descriptions.Item label="Beneficiary Account">
                      <code>{message.beneficiaryAccount}</code>
                    </Descriptions.Item>
                  )}
                  {message.remittanceInfo && (
                    <Descriptions.Item label="Remittance Information">
                      {message.remittanceInfo}
                    </Descriptions.Item>
                  )}
                  {message.valueDate && (
                    <Descriptions.Item label="Value Date">
                      {message.valueDate}
                    </Descriptions.Item>
                  )}
                  {message.chargeCode && (
                    <Descriptions.Item label="Charge Code">
                      <Tag>{message.chargeCode}</Tag>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Sent Date">
                    {message.sentDate 
                      ? dayjs(message.sentDate).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Received Date">
                    {message.receivedDate 
                      ? dayjs(message.receivedDate).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Processed Date">
                    {message.processedDate 
                      ? dayjs(message.processedDate).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Settled Date">
                    {message.settledDate 
                      ? dayjs(message.settledDate).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              {/* LC Details (if applicable) */}
              {(message.messageType.startsWith('MT7') && message.lcNumber) && (
                <TabPane tab="LC Details" key="lc">
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="LC Number">
                      <Tag color="blue">{message.lcNumber}</Tag>
                    </Descriptions.Item>
                    {message.applicant && (
                      <Descriptions.Item label="Applicant (Buyer)">
                        {message.applicant}
                      </Descriptions.Item>
                    )}
                    {message.beneficiary && (
                      <Descriptions.Item label="Beneficiary (Exporter)">
                        {message.beneficiary}
                      </Descriptions.Item>
                    )}
                    {message.lcExpiryDate && (
                      <Descriptions.Item label="LC Expiry Date">
                        {message.lcExpiryDate}
                      </Descriptions.Item>
                    )}
                    {message.loadingPort && (
                      <Descriptions.Item label="Port of Loading">
                        {message.loadingPort}
                      </Descriptions.Item>
                    )}
                    {message.dischargePort && (
                      <Descriptions.Item label="Port of Discharge">
                        {message.dischargePort}
                      </Descriptions.Item>
                    )}
                    {message.latestShipDate && (
                      <Descriptions.Item label="Latest Shipment Date">
                        {message.latestShipDate}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                  
                  {message.documents && message.documents.length > 0 && (
                    <>
                      <Divider>Required Documents</Divider>
                      <List
                        size="small"
                        bordered
                        dataSource={message.documents}
                        renderItem={(doc) => (
                          <List.Item>
                            <FileTextOutlined style={{ marginRight: 8 }} />
                            {doc}
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                </TabPane>
              )}

              {/* Discrepancy Details (if MT750) */}
              {message.messageType === 'MT750' && (
                <TabPane tab="Discrepancies" key="discrepancies">
                  <Alert
                    message="Document Discrepancies Found"
                    description={message.discrepancyDetails}
                    type="error"
                    showIcon
                    icon={<CloseCircleOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                  
                  {message.discrepancyList && message.discrepancyList.length > 0 && (
                    <>
                      <Divider>Discrepancy List</Divider>
                      <List
                        size="small"
                        bordered
                        dataSource={message.discrepancyList}
                        renderItem={(item, index) => (
                          <List.Item>
                            <Space>
                              <Tag color="red">{index + 1}</Tag>
                              {item}
                            </Space>
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                </TabPane>
              )}

              {/* Timeline */}
              <TabPane tab="Timeline" key="timeline">
                <Timeline mode="left">
                  <Timeline.Item
                    color="green"
                    dot={<CheckCircleOutlined />}
                    label={dayjs(message.createdAt).format('YYYY-MM-DD HH:mm')}
                  >
                    <strong>Message Created</strong>
                    {message.createdBy && <div>By: {message.createdBy}</div>}
                  </Timeline.Item>
                  
                  {message.approvedBy && (
                    <Timeline.Item
                      color="blue"
                      dot={<CheckCircleOutlined />}
                      label={dayjs(message.updatedAt).format('YYYY-MM-DD HH:mm')}
                    >
                      <strong>Approved</strong>
                      <div>By: {message.approvedBy}</div>
                    </Timeline.Item>
                  )}
                  
                  {message.sentDate && (
                    <Timeline.Item
                      color="blue"
                      dot={<SendOutlined />}
                      label={dayjs(message.sentDate).format('YYYY-MM-DD HH:mm')}
                    >
                      <strong>Message Sent</strong>
                      {message.sentBy && <div>By: {message.sentBy}</div>}
                      <div>To: {message.receiverBic}</div>
                    </Timeline.Item>
                  )}
                  
                  {message.receivedDate && (
                    <Timeline.Item
                      color="green"
                      dot={<CheckCircleOutlined />}
                      label={dayjs(message.receivedDate).format('YYYY-MM-DD HH:mm')}
                    >
                      <strong>Message Received</strong>
                      <div>From: {message.senderBic}</div>
                    </Timeline.Item>
                  )}
                  
                  {message.processedDate && (
                    <Timeline.Item
                      color="orange"
                      dot={<ClockCircleOutlined />}
                      label={dayjs(message.processedDate).format('YYYY-MM-DD HH:mm')}
                    >
                      <strong>Processing Started</strong>
                    </Timeline.Item>
                  )}
                  
                  {message.settledDate && (
                    <Timeline.Item
                      color="purple"
                      dot={<CheckCircleOutlined />}
                      label={dayjs(message.settledDate).format('YYYY-MM-DD HH:mm')}
                    >
                      <strong>Settled</strong>
                      <div>Transaction Complete</div>
                    </Timeline.Item>
                  )}
                  
                  {message.status === 'REJECTED' && (
                    <Timeline.Item
                      color="red"
                      dot={<CloseCircleOutlined />}
                      label={dayjs(message.updatedAt).format('YYYY-MM-DD HH:mm')}
                    >
                      <strong>Rejected</strong>
                    </Timeline.Item>
                  )}
                </Timeline>
              </TabPane>

              {/* Technical Info */}
              <TabPane tab="Technical" key="technical">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Message ID">
                    <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                      {message.messageId}
                    </code>
                  </Descriptions.Item>
                  <Descriptions.Item label="SWIFT Reference">
                    <code>{message.swiftReference}</code>
                  </Descriptions.Item>
                  {message.messageHash && (
                    <Descriptions.Item label="Message Hash">
                      <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                        {message.messageHash}
                      </code>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Created At">
                    {dayjs(message.createdAt).format('YYYY-MM-DD HH:mm:ss.SSS')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Updated At">
                    {dayjs(message.updatedAt).format('YYYY-MM-DD HH:mm:ss.SSS')}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>
            </Tabs>
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default SWIFTMessageDetail;
