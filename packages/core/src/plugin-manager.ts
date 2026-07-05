import { Plugin, PluginContext, PluginState } from './types.js';

interface PluginEntry {
  plugin: Plugin;
  state: PluginState;
  error?: Error;
}

export class PluginManager {
  private plugins = new Map<string, PluginEntry>();
  private ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }

  async register(plugin: Plugin): Promise<void> {
    const { name } = plugin.manifest;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already registered`);
    }

    // Check dependencies
    if (plugin.manifest.dependencies) {
      for (const dep of plugin.manifest.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${name}" depends on "${dep}" which is not registered`);
        }
        const depEntry = this.plugins.get(dep)!;
        if (depEntry.state !== 'active') {
          throw new Error(`Plugin "${name}" depends on "${dep}" which is not active`);
        }
      }
    }

    this.plugins.set(name, { plugin, state: 'pending' });

    try {
      this.plugins.get(name)!.state = 'loading';
      await plugin.apply(this.ctx);
      this.plugins.get(name)!.state = 'active';
      this.ctx.logger.info(`Plugin "${name}" loaded successfully`);
    } catch (error) {
      this.plugins.get(name)!.state = 'failed';
      this.plugins.get(name)!.error = error as Error;
      this.ctx.logger.error(`Plugin "${name}" failed to load:`, error);
      throw error;
    }
  }

  async unregister(name: string): Promise<void> {
    const entry = this.plugins.get(name);
    if (!entry) return;

    if (entry.state === 'active' && entry.plugin.destroy) {
      await entry.plugin.destroy();
    }

    this.plugins.delete(name);
    this.ctx.logger.info(`Plugin "${name}" unloaded`);
  }

  getState(name: string): PluginState | undefined {
    return this.plugins.get(name)?.state;
  }

  listPlugins(): Array<{ name: string; state: PluginState; version: string }> {
    return Array.from(this.plugins.entries()).map(([name, entry]) => ({
      name,
      state: entry.state,
      version: entry.plugin.manifest.version,
    }));
  }
}
