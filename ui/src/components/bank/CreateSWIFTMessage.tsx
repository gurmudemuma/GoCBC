// Create SWIFT Message Component
// Handles MT700, MT103, MT750, MT752, etc.

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Divider,
  Alert,
  Steps,
  notification,
  Tag,
} from 'antd';
import {
  SendOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface CreateSWIFTMessageProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  messageType?: string;
  lcId?: string;
  paymentId?: string;
}

const CreateSWIFTMessage: React.FC<CreateSWIFTMessageProps> = ({
  visible,
  onClose,
  onSuccess,
  messageType: initialMessageType,
  lcId,
  paymentId,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState(initialMessageType || 'MT700');
  const [createdMessageId, setCreatedMessageId] = useState<string | null>(null);

  const userOrg = localStorage.getItem('userOrg') || 'CBETETAA';

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const messageId = `SWIFT_${messageType}_${Date.now()}`;
      const swiftReference = values.swiftReference || `REF${Date.now()}`;

      let endpoint = '';
      let payload: any = {
        messageID: messageId,
        swiftReference,
        senderBIC: values.senderBIC,
        receiverBIC: values.receiverBIC,
      };

      // Build payload based on message type
      switch (messageType) {
        case 'MT700': // Issue LC
          endpoint = `${API_BASE_URL}/swift/messages/mt700`;
          payload = {
            ...payload,
            lcID: values.lcID || lcId,
            applicant: values.applicant,
            beneficiary: values.beneficiary,
            amount: values.amount.toString(),
            currency: values.currency,
            expiryDate: values.expiryDate?.format('YYYY-MM-DD'),
            loadingPort: values.loadingPort,
            dischargePort: values.dischargePort,
            latestShipDate: values.latestShipDate?.format('YYYY-MM-DD'),
          };
          break;

        case 'MT103': // Payment
          endpoint = `${API_BASE_URL}/swift/messages/mt103`;
          payload = {
            ...payload,
            paymentID: values.paymentID || paymentId,
            orderingCustomer: values.orderingCustomer,
            beneficiary: values.beneficiary,
            beneficiaryAccount: values.beneficiaryAccount,
            amount: values.amount.toString(),
            currency: values.currency,
            valueDate: dayjs().format('YYMMDD'),
            remittanceInfo: values.remittanceInfo,
            chargeCode: values.chargeCode || 'SHA',
          };
          break;

        case 'MT750': // Discrepancy
          endpoint = `${API_BASE_URL}/swift/messages/mt750`;
          payload = {
            ...payload,
            lcID: values.lcID || lcId,
            discrepancyDetails: values.discrepancyDetails,
            discrepancyList: values.discrepancyList?.split('\n') || [],
          };
          break;

        case 'MT752': // Authorization
          endpoint = `${API_BASE_URL}/swift/messages/mt752`;
          payload = {
            ...payload,
            lcID: values.lcID || lcId,
            amount: values.amount.toString(),
            currency: values.currency,
          };
          break;

        default:
          endpoint = `${API_BASE_URL}/swift/messages`;
          payload = {
            ...payload,
            messageType,
            amount: values.amount?.toString() || '0',
            currency: values.currency || 'USD',
          };
      }

      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (response.data.success) {
        setCreatedMessageId(messageId);
        setCurrentStep(1);
        notification.success({
          message: 'SWIFT Message Created',
          description: `${messageType} message created successfully. Message ID: ${messageId}`,
        });
      }
    } catch (error: any) {
      notification.error({
        message: 'Failed to create message',
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!createdMessageId) return;

    try {
      setLoading(true);

      // Step 1: Approve
      await axios.post(
        `${API_BASE_URL}/swift/messages/${createdMessageId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );

      // Step 2: Send
      await axios.post(
        `${API_BASE_URL}/swift/messages/${createdMessageId}/send`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );

      setCurrentStep(2);
      notification.success({
        message: 'Message Sent',
        description: `${messageType} message has been approved and sent successfully.`,
      });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error: any) {
      notification.error({
        message: 'Failed to send message',
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setCurrentStep(0);
    setCreatedMessageId(null);
    onClose();
  };

  const renderFormFields = () => {
    switch (messageType) {
      case 'MT700': // Issue LC
        return (
          <>
            <Form.Item
              name="lcID"
              label="LC Number"
              rules={[{ required: true, message: 'Please enter LC number' }]}
              initialValue={lcId}
            >
              <Input placeholder="LC_2026_001" />
            </Form.Item>

            <Form.Item
              name="applicant"
              label="Applicant (Buyer)"
              rules={[{ required: true }]}
            >
              <TextArea rows={2} placeholder="Buyer company name and address" />
            </Form.Item>

            <Form.Item
              name="beneficiary"
              label="Beneficiary (Exporter)"
              rules={[{ required: true }]}
            >
              <TextArea rows={2} placeholder="Exporter company name and address" />
            </Form.Item>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  style={{ width: 200 }}
                  min={0}
                  precision={2}
                  placeholder="250000.00"
                />
              </Form.Item>

              <Form.Item
                name="currency"
                label="Currency"
                rules={[{ required: true }]}
                initialValue="USD"
                style={{ marginBottom: 0 }}
              >
                <Select style={{ width: 100 }}>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                  <Option value="GBP">GBP</Option>
                </Select>
              </Form.Item>
            </Space>

            <Form.Item
              name="expiryDate"
              label="Expiry Date"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                name="loadingPort"
                label="Port of Loading"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Djibouti" />
              </Form.Item>

              <Form.Item
                name="dischargePort"
                label="Port of Discharge"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Hamburg" />
              </Form.Item>
            </Space>

            <Form.Item
              name="latestShipDate"
              label="Latest Shipment Date"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </>
        );

      case 'MT103': // Payment
        return (
          <>
            <Form.Item
              name="paymentID"
              label="Payment ID"
              initialValue={paymentId}
            >
              <Input placeholder="PAY_2026_001" />
            </Form.Item>

            <Form.Item
              name="orderingCustomer"
              label="Ordering Customer"
              rules={[{ required: true }]}
            >
              <TextArea rows={2} placeholder="Buyer name and account" />
            </Form.Item>

            <Form.Item
              name="beneficiary"
              label="Beneficiary"
              rules={[{ required: true }]}
            >
              <Input placeholder="Exporter name" />
            </Form.Item>

            <Form.Item
              name="beneficiaryAccount"
              label="Beneficiary Account"
              rules={[{ required: true }]}
            >
              <Input placeholder="Account number" />
            </Form.Item>

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  style={{ width: 200 }}
                  min={0}
                  precision={2}
                />
              </Form.Item>

              <Form.Item
                name="currency"
                label="Currency"
                rules={[{ required: true }]}
                initialValue="USD"
                style={{ marginBottom: 0 }}
              >
                <Select style={{ width: 100 }}>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="chargeCode"
                label="Charges"
                initialValue="SHA"
                style={{ marginBottom: 0 }}
              >
                <Select style={{ width: 100 }}>
                  <Option value="OUR">OUR</Option>
                  <Option value="SHA">SHA</Option>
                  <Option value="BEN">BEN</Option>
                </Select>
              </Form.Item>
            </Space>

            <Form.Item
              name="remittanceInfo"
              label="Remittance Information"
              rules={[{ required: true }]}
            >
              <TextArea rows={2} placeholder="Payment for LC_2026_001" />
            </Form.Item>
          </>
        );

      case 'MT750': // Discrepancy
        return (
          <>
            <Form.Item
              name="lcID"
              label="LC Number"
              rules={[{ required: true }]}
              initialValue={lcId}
            >
              <Input placeholder="LC_2026_001" />
            </Form.Item>

            <Alert
              message="Document Discrepancy Report"
              description="Report discrepancies found in the documents presented under this LC."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="discrepancyDetails"
              label="Discrepancy Details"
              rules={[{ required: true }]}
            >
              <TextArea
                rows={3}
                placeholder="Describe the discrepancies found..."
              />
            </Form.Item>

            <Form.Item
              name="discrepancyList"
              label="Discrepancy List"
              help="Enter each discrepancy on a new line"
            >
              <TextArea
                rows={4}
                placeholder={'Bill of Lading dated after expiry\nInvoice amount exceeds LC amount\nCertificate missing stamp'}
              />
            </Form.Item>
          </>
        );

      case 'MT752': // Authorization
        return (
          <>
            <Form.Item
              name="lcID"
              label="LC Number"
              rules={[{ required: true }]}
              initialValue={lcId}
            >
              <Input placeholder="LC_2026_001" />
            </Form.Item>

            <Alert
              message="Payment Authorization"
              description="Authorize payment to the beneficiary despite discrepancies or after document verification."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Space style={{ width: '100%' }} size="large">
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  style={{ width: 200 }}
                  min={0}
                  precision={2}
                />
              </Form.Item>

              <Form.Item
                name="currency"
                label="Currency"
                rules={[{ required: true }]}
                initialValue="USD"
                style={{ marginBottom: 0 }}
              >
                <Select style={{ width: 100 }}>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                </Select>
              </Form.Item>
            </Space>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={`Create SWIFT Message: ${messageType}`}
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
    >
      <Steps 
        current={currentStep} 
        style={{ marginBottom: 24 }}
        items={[
          { title: 'Create', icon: <SendOutlined /> },
          { title: 'Approve & Send', icon: <CheckCircleOutlined /> },
          { title: 'Sent', icon: <CheckCircleOutlined /> },
        ]}
      />

      {currentStep === 0 && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Divider>Message Details</Divider>

          <Form.Item
            name="messageType"
            label="Message Type"
            initialValue={messageType}
          >
            <Select onChange={setMessageType} disabled={!!initialMessageType}>
              <Option value="MT700">MT700 - Issue LC</Option>
              <Option value="MT103">MT103 - Customer Payment</Option>
              <Option value="MT750">MT750 - Discrepancy Report</Option>
              <Option value="MT752">MT752 - Authorization to Pay</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="swiftReference"
            label="SWIFT Reference"
            help="Leave empty to auto-generate"
          >
            <Input placeholder="REF2026001" maxLength={16} />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="senderBIC"
              label="Sender BIC"
              rules={[{ required: true }]}
              initialValue={userOrg}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="CBETETAA" maxLength={11} />
            </Form.Item>

            <Form.Item
              name="receiverBIC"
              label="Receiver BIC"
              rules={[{ required: true }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="DEUTDEFF" maxLength={11} />
            </Form.Item>
          </Space>

          <Divider>{messageType} Details</Divider>

          {renderFormFields()}

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space>
              <Button onClick={handleClose}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Message
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}

      {currentStep === 1 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <h2 style={{ marginTop: 24 }}>Message Created Successfully!</h2>
          <p style={{ color: '#666', marginBottom: 32 }}>
            Message ID: <Tag>{createdMessageId}</Tag>
          </p>
          <Alert
            message="Ready to Send"
            description="Click below to approve and send this message to the recipient bank."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Space>
            <Button onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleApproveAndSend}
              loading={loading}
            >
              Approve & Send
            </Button>
          </Space>
        </div>
      )}

      {currentStep === 2 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <h2 style={{ marginTop: 24 }}>Message Sent Successfully!</h2>
          <p style={{ color: '#666' }}>
            {messageType} message has been sent to {form.getFieldValue('receiverBIC')}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default CreateSWIFTMessage;
