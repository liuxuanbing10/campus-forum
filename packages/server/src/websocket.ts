import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
import { verifyJwt } from '@campus-forum/core';

// ponytail: per-socket metadata stored in a Map instead of monkey-patching ws objects
const wsMeta = new Map<WebSocket, { userId: number; alive: boolean }>();

export class WsManager {
  private wss: WebSocketServer;
  private connections = new Map<number, Set<WebSocket>>();
  private heartbeatInterval: ReturnType<typeof setInterval>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // ponytail: prefer Sec-WebSocket-Protocol header (not in URL logs/referer), fallback to query for compat
      let token: string | null = null;
      const proto = req.headers['sec-websocket-protocol'];
      if (typeof proto === 'string' && proto.startsWith('token.')) {
        token = proto.slice(6); // strip "token." prefix
      } else {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        token = url.searchParams.get('token');
      }
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
      wsMeta.set(ws, { userId, alive: true });

      // 心跳
      ws.on('pong', () => { const m = wsMeta.get(ws); if (m) m.alive = true; });

      ws.on('close', () => {
        wsMeta.delete(ws);
        const set = this.connections.get(userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) this.connections.delete(userId);
        }
      });

      ws.on('error', () => {
        wsMeta.delete(ws);
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
          const m = wsMeta.get(ws);
          if (!m?.alive) {
            wsMeta.delete(ws);
            set.delete(ws);
            ws.terminate();
            continue;
          }
          m.alive = false;
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
