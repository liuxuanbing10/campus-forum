import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { verifyJwt } from '@campus-forum/core';

interface UserConnection {
  userId: number;
  ws: WebSocket;
  alive: boolean;
}

export class WsManager {
  private wss: WebSocketServer;
  private connections = new Map<number, Set<WebSocket>>();
  private heartbeatInterval: ReturnType<typeof setInterval>;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // 从 URL 参数解析 userId（token）
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4001, '未提供 token');
        return;
      }

      const payload = verifyJwt(token);
      if (!payload || typeof payload.userId !== 'number') {
        ws.close(4001, '无效 token');
        return;
      }

      const userId = payload.userId;
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId)!.add(ws);
      (ws as any)._userId = userId;
      (ws as any)._alive = true;

      // 心跳
      ws.on('pong', () => { (ws as any)._alive = true; });

      ws.on('close', () => {
        const set = this.connections.get(userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) this.connections.delete(userId);
        }
      });

      ws.on('error', () => {
        const set = this.connections.get(userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) this.connections.delete(userId);
        }
      });

      ws.send(JSON.stringify({ event: 'connected', data: { userId } }));
    });

    // 心跳：每 30 秒检测一次
    this.heartbeatInterval = setInterval(() => {
      for (const [, set] of this.connections) {
        for (const ws of set) {
          if (!(ws as any)._alive) {
            set.delete(ws);
            ws.terminate();
            continue;
          }
          (ws as any)._alive = false;
          ws.ping();
        }
      }
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(this.heartbeatInterval);
    });
  }

  /** 发送消息给指定用户 */
  sendToUser(userId: number, event: string, data: Record<string, unknown>): void {
    const set = this.connections.get(userId);
    if (!set || set.size === 0) return;

    const message = JSON.stringify({ event, data });
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /** 关闭所有连接 */
  close(): void {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}
