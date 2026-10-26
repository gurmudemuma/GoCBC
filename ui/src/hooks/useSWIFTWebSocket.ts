// React Hook for SWIFT WebSocket Integration
// Easy-to-use hook for components to receive real-time SWIFT updates

import { useEffect, useRef } from 'react';
import { notification } from 'antd';
import swiftWebSocketService, { SWIFTEvent, SWIFTEventType } from '../services/swiftWebSocket';

interface UseSWIFTWebSocketOptions {
  onMessageCreated?: (event: SWIFTEvent) => void;
  onMessageSent?: (event: SWIFTEvent) => void;
  onMessageReceived?: (event: SWIFTEvent) => void;
  onMessageSettled?: (event: SWIFTEvent) => void;
  onDiscrepancyReported?: (event: SWIFTEvent) => void;
  onPaymentAuthorized?: (event: SWIFTEvent) => void;
  onAnyEvent?: (event: SWIFTEvent) => void;
  showNotifications?: boolean;
}

const useSWIFTWebSocket = (options: UseSWIFTWebSocketOptions = {}) => {
  const {
    onMessageCreated,
    onMessageSent,
    onMessageReceived,
    onMessageSettled,
    onDiscrepancyReported,
    onPaymentAuthorized,
    onAnyEvent,
    showNotifications = true,
  } = options;

  // Use refs to avoid recreating listeners on every render
  const handlersRef = useRef(options);
  handlersRef.current = options;

  useEffect(() => {
    const handlers: Array<{ type: SWIFTEventType | '*'; handler: (event: SWIFTEvent) => void }> = [];

    // Message Created
    if (onMessageCreated) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onMessageCreated?.(event);
        if (showNotifications) {
          notification.info({
            message: 'New SWIFT Message',
            description: `${event.messageType} message created`,
            duration: 4,
          });
        }
      };
      swiftWebSocketService.on('MESSAGE_CREATED', handler);
      handlers.push({ type: 'MESSAGE_CREATED', handler });
    }

    // Message Sent
    if (onMessageSent) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onMessageSent?.(event);
        if (showNotifications) {
          notification.success({
            message: 'Message Sent',
            description: `${event.messageType} sent successfully`,
            duration: 3,
          });
        }
      };
      swiftWebSocketService.on('MESSAGE_SENT', handler);
      handlers.push({ type: 'MESSAGE_SENT', handler });
    }

    // Message Received
    if (onMessageReceived) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onMessageReceived?.(event);
        if (showNotifications) {
          notification.info({
            message: 'Message Received',
            description: `${event.messageType} received from ${event.data.senderBic}`,
            duration: 5,
          });
        }
      };
      swiftWebSocketService.on('MESSAGE_RECEIVED', handler);
      handlers.push({ type: 'MESSAGE_RECEIVED', handler });
    }

    // Message Settled
    if (onMessageSettled) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onMessageSettled?.(event);
        if (showNotifications) {
          notification.success({
            message: 'Transaction Settled',
            description: `${event.messageType} settled successfully`,
            duration: 5,
            placement: 'topRight',
          });
        }
      };
      swiftWebSocketService.on('MESSAGE_SETTLED', handler);
      handlers.push({ type: 'MESSAGE_SETTLED', handler });
    }

    // Discrepancy Reported
    if (onDiscrepancyReported) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onDiscrepancyReported?.(event);
        if (showNotifications) {
          notification.warning({
            message: 'Document Discrepancy',
            description: `Discrepancies found in LC ${event.data.lcId}`,
            duration: 0, // Don't auto-close
            placement: 'topRight',
          });
        }
      };
      swiftWebSocketService.on('DISCREPANCY_REPORTED', handler);
      handlers.push({ type: 'DISCREPANCY_REPORTED', handler });
    }

    // Payment Authorized
    if (onPaymentAuthorized) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onPaymentAuthorized?.(event);
        if (showNotifications) {
          notification.success({
            message: 'Payment Authorized',
            description: `Payment authorized for LC ${event.data.lcId}`,
            duration: 5,
            placement: 'topRight',
          });
        }
      };
      swiftWebSocketService.on('PAYMENT_AUTHORIZED', handler);
      handlers.push({ type: 'PAYMENT_AUTHORIZED', handler });
    }

    // Wildcard handler for all events
    if (onAnyEvent) {
      const handler = (event: SWIFTEvent) => {
        handlersRef.current.onAnyEvent?.(event);
      };
      swiftWebSocketService.on('*', handler);
      handlers.push({ type: '*', handler });
    }

    // Cleanup
    return () => {
      handlers.forEach(({ type, handler }) => {
        swiftWebSocketService.off(type, handler);
      });
    };
  }, [
    onMessageCreated,
    onMessageSent,
    onMessageReceived,
    onMessageSettled,
    onDiscrepancyReported,
    onPaymentAuthorized,
    onAnyEvent,
    showNotifications,
  ]);

  return {
    isConnected: swiftWebSocketService.isConnected(),
  };
};

export default useSWIFTWebSocket;
