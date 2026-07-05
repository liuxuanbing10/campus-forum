import { EventBus } from './types.js';

export class SimpleEventBus implements EventBus {
  private handlers = new Map<string, Set<Function>>();

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      }
    }
  }

  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    this.handlers.get(event)?.delete(handler);
  }
}
