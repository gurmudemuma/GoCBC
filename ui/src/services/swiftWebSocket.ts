// WebSocket Service for Real-time SWIFT Message Updates
// Provides real-time notifications when SWIFT messages are created, updated, or settled

type SWIFTEventType = 
  | 'MESSAGE_CREATED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_SETTLED'
  | 'DISCREPANCY_REPORTED'
  | 'PAYMENT_AUTHORIZED';

interface SWIFTEvent {
  type: SWIFTEventType;
  messageId: string;
  messageType: string;
  data: any;
  timestamp: string;
}

type EventCallback = (event: SWIFTEvent) => void;

class SWIFTWebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: Map<SWIFTEventType, EventCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isClient = typeof window !== 'undefined';

  constructor() {
    // Only connect if we're in the browser
    if (this.isClient) {
      this.connect();
    }
  }

  private connect() {
    // Guard against SSR
    if (!this.isClient) {
      console.warn('WebSocket not available during SSR');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Use environment variable if available, otherwise construct from hostname
    const wsUrl = process.env.NEXT_PUBLIC_SWIFT_WS_URL || 
                  `${protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_SWIFT_WS_PORT || '3001'}/ws/swift`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('SWIFT WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // Authenticate
        const token = localStorage.getItem('token');
        if (token && this.ws) {
          this.ws.send(JSON.stringify({
            type: 'AUTH',
            token,
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'PONG') {
            // Heartbeat response
            return;
          }

          if (message.type === 'SWIFT_EVENT') {
            const swiftEvent: SWIFTEvent = message.data;
            this.notifyListeners(swiftEvent);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('SWIFT WebSocket disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (!this.isClient || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  private startHeartbeat() {
    if (!this.isClient) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private notifyListeners(event: SWIFTEvent) {
    const listeners = this.callbacks.get(event.type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });

    // Also notify wildcard listeners
    const wildcardListeners = this.callbacks.get('*' as SWIFTEventType) || [];
    wildcardListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in wildcard listener:', error);
      }
    });
  }

  public on(eventType: SWIFTEventType | '*', callback: EventCallback) {
    if (!this.callbacks.has(eventType as SWIFTEventType)) {
      this.callbacks.set(eventType as SWIFTEventType, []);
    }
    this.callbacks.get(eventType as SWIFTEventType)?.push(callback);
  }

  public off(eventType: SWIFTEventType | '*', callback: EventCallback) {
    const listeners = this.callbacks.get(eventType as SWIFTEventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance - will only connect on client side
let swiftWebSocketServiceInstance: SWIFTWebSocketService | null = null;

function getSWIFTWebSocketService(): SWIFTWebSocketService {
  if (typeof window !== 'undefined' && !swiftWebSocketServiceInstance) {
    swiftWebSocketServiceInstance = new SWIFTWebSocketService();
  }
  // Return a dummy service on server side
  return swiftWebSocketServiceInstance || ({
    on: () => {},
    off: () => {},
    disconnect: () => {},
    isConnected: () => false,
  } as unknown as SWIFTWebSocketService);
}

export default getSWIFTWebSocketService();
export { getSWIFTWebSocketService };
export type { SWIFTEvent, SWIFTEventType };
