interface WsEventMap {
  connected: (data: { userId: number }) => void;
  new_message: (data: { conversationId: number; senderId: number; senderName: string; content: string }) => void;
  new_notification: (data: { userId: number; type: string; message: string; relatedPostId?: number; relatedCommentId?: number; fromUserId?: number; relatedTeamId?: number }) => void;
  pong: () => void;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isConnected = false;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startPing();
    };

    this.socket.onmessage = (event) => {
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
      if (this.socket?.readyState === WebSocket.OPEN) {
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

export const wsService = new WebSocketService();
