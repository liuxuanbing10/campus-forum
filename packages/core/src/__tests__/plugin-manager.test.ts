import { describe, it, expect } from 'vitest';
import { PluginManager } from '@campus-forum/core';
import type { Plugin, PluginContext } from '@campus-forum/core';

// 最小化的 PluginContext 桩，仅满足 PluginManager 的契约
function makeCtx(): PluginContext {
  return {
    app: {} as PluginContext['app'],
    db: {} as PluginContext['db'],
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    config: { get: (_k: string, d: unknown) => d as never, set() {} },
    getService: (() => {
      throw new Error('no service');
    }) as PluginContext['getService'],
    sendToUser() {},
    createNotification: async () => {},
    getSessionUserId: () => null,
    getSessionDeviceCode: () => undefined,
  } as unknown as PluginContext;
}

const okPlugin = (name: string, deps?: string[]): Plugin => ({
  manifest: { name, version: '0.1.0', description: '', author: 't', dependencies: deps },
  apply: async () => {},
});

describe('PluginManager', () => {
  it('registers a plugin and tracks its active state', async () => {
    const pm = new PluginManager(makeCtx());
    await pm.register(okPlugin('a'));
    expect(pm.getState('a')).toBe('active');
    expect(pm.listPlugins().map((p) => p.name)).toContain('a');
  });

  it('rejects duplicate registration of the same plugin', async () => {
    const pm = new PluginManager(makeCtx());
    await pm.register(okPlugin('a'));
    await expect(pm.register(okPlugin('a'))).rejects.toThrow(/already registered/);
  });

  it('requires declared dependencies to be active before loading', async () => {
    const pm = new PluginManager(makeCtx());
    await expect(pm.register(okPlugin('b', ['missing-dep']))).rejects.toThrow(/not registered/);
  });

  it('marks a plugin as failed when apply() throws and still propagates the error', async () => {
    const pm = new PluginManager(makeCtx());
    const bad: Plugin = {
      manifest: { name: 'bad', version: '0.1.0', description: '', author: 't' },
      apply: async () => {
        throw new Error('boom');
      },
    };
    await expect(pm.register(bad)).rejects.toThrow('boom');
    expect(pm.getState('bad')).toBe('failed');
  });

  it('unregister removes the plugin from the registry', async () => {
    const pm = new PluginManager(makeCtx());
    await pm.register(okPlugin('a'));
    await pm.unregister('a');
    expect(pm.getState('a')).toBeUndefined();
  });
});
