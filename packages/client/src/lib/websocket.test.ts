import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';

interface WsEventMap {
  connected: (data: { userId: number }) => void;
  new_message: (data: { conversationId: number; senderId: number; senderName: string; content: string }) => void;
  new_notification: (data: { userId: number; type: string; message: string; relatedPostId?: number; relatedCommentId?: number; fromUserId?: number; relatedTeamId?: number }) => void;
  pong: () => void;
}

class TestWebSocketService {
  private socket: any = null;
  eventListeners = new Map<string, Set<(data: any) => void>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  isConnected = false;

  connect() {
    if (this.socket?.readyState === 1) return;

    const protocol = 'ws:';
    const host = 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startPing();
    };

    this.socket.onmessage = (event: { data: string }) => {
      try {
        const { event: eventName, data } = JSON.parse(event.data);
        this.emit(eventName, data);
      } catch {
        // ignore invalid messages
      }
    };

    this.socket.onerror = () => {
      this.isConnected = false;
      this.scheduleReconnect();
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      this.stopPing();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState === 1) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  disconnect() {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  on<K extends keyof WsEventMap>(event: K, callback: WsEventMap[K]) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off<K extends keyof WsEventMap>(event: K, callback: WsEventMap[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch {
          // ignore errors in listeners
        }
      });
    }
  }

  isConnectedState() {
    return this.isConnected;
  }
}

describe('WebSocketService', () => {
  let mockSend: Mock;
  let mockClose: Mock;
  let mockOnopen: ((event: Event) => void) | null;
  let mockOnclose: ((event: { code: number }) => void) | null;
  let mockOnmessage: ((event: { data: string }) => void) | null;
  let service: TestWebSocketService;
  let MockWebSocket: any;
  
  beforeEach(() => {
    mockSend = vi.fn();
    mockClose = vi.fn();
    mockOnopen = null;
    mockOnclose = null;
    mockOnmessage = null;
    
    MockWebSocket = vi.fn(function(this: any, url: string) {
      this.readyState = 0;
      this.send = mockSend;
      this.close = mockClose;
      Object.defineProperty(this, 'onopen', {
        get: () => mockOnopen,
        set: (fn) => { mockOnopen = fn; },
      });
      Object.defineProperty(this, 'onclose', {
        get: () => mockOnclose,
        set: (fn) => { mockOnclose = fn; },
      });
      Object.defineProperty(this, 'onmessage', {
        get: () => mockOnmessage,
        set: (fn) => { mockOnmessage = fn; },
      });
    });
    
    (global as any).WebSocket = MockWebSocket;
    
    vi.useFakeTimers();
    service = new TestWebSocketService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('connects to WebSocket server', () => {
    service.connect();
    
    expect(MockWebSocket).toHaveBeenCalled();
  });

  it('does not reconnect if already connected', () => {
    const connectedSocket = { readyState: 1, send: mockSend, close: mockClose } as any;
    const ConnectedMockWebSocket = vi.fn(function(this: any) {
      Object.assign(this, connectedSocket);
    });
    (global as any).WebSocket = ConnectedMockWebSocket;
    
    service.connect();
    service.connect();
    
    expect(ConnectedMockWebSocket).toHaveBeenCalledTimes(1);
  });

  it('subscribes to events', () => {
    const handler = vi.fn();
    service.on('new_message', handler);
    
    expect(service.eventListeners.get('new_message')).toContain(handler);
  });

  it('unsubscribes from events', () => {
    const handler = vi.fn();
    service.on('new_message', handler);
    service.off('new_message', handler);
    
    expect(service.eventListeners.get('new_message')).not.toContain(handler);
  });

  it('disconnects from WebSocket', () => {
    service.connect();
    service.disconnect();
    
    expect(mockClose).toHaveBeenCalled();
  });

  it('reconnects on close', () => {
    service.connect();
    
    mockOnclose?.({ code: 1000 });
    
    vi.advanceTimersByTime(1000);
    
    expect(MockWebSocket).toHaveBeenCalledTimes(2);
  });

  it('handles incoming messages', () => {
    const handler = vi.fn();
    service.on('new_message', handler);
    service.connect();
    
    mockOnmessage?.({ data: JSON.stringify({ event: 'new_message', data: { content: 'hello' } }) });
    
    expect(handler).toHaveBeenCalledWith({ content: 'hello' });
  });

  it('returns connected state', () => {
    expect(service.isConnectedState()).toBe(false);
    
    service.connect();
    mockOnopen?.({} as Event);
    
    expect(service.isConnectedState()).toBe(true);
    
    mockOnclose?.({ code: 1000 });
    
    expect(service.isConnectedState()).toBe(false);
  });
});
