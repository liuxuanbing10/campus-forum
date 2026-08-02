// Domain-split API modules — see api/ subdirectory for individual modules.
// This barrel preserves backward compatibility for all `import ... from './api'` consumers.
export * from './api/index';
export { default } from './api/client';
