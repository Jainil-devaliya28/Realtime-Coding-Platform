// ============================================================
// PROMETHEUS METRICS - Application monitoring
// ============================================================

import promClient from 'prom-client';

// Enable default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ prefix: 'codeplatform_' });

// HTTP request metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'codeplatform_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'codeplatform_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// WebSocket metrics
export const wsConnectionsActive = new promClient.Gauge({
  name: 'codeplatform_ws_connections_active',
  help: 'Number of active WebSocket connections',
});

export const wsConnectionsTotal = new promClient.Counter({
  name: 'codeplatform_ws_connections_total',
  help: 'Total WebSocket connections',
});

// Execution metrics
export const executionDuration = new promClient.Histogram({
  name: 'codeplatform_execution_duration_seconds',
  help: 'Code execution duration in seconds',
  labelNames: ['language', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const executionTotal = new promClient.Counter({
  name: 'codeplatform_executions_total',
  help: 'Total code executions',
  labelNames: ['language', 'status'],
});

export const executionQueueSize = new promClient.Gauge({
  name: 'codeplatform_execution_queue_size',
  help: 'Current size of execution queue',
});

export const executionQueueLatency = new promClient.Histogram({
  name: 'codeplatform_execution_queue_latency_seconds',
  help: 'Time spent in execution queue',
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

// Room metrics
export const activeRooms = new promClient.Gauge({
  name: 'codeplatform_active_rooms',
  help: 'Number of active rooms',
});

export const activeUsers = new promClient.Gauge({
  name: 'codeplatform_active_users',
  help: 'Number of active users',
});

// AI metrics
export const aiRequestDuration = new promClient.Histogram({
  name: 'codeplatform_ai_request_duration_seconds',
  help: 'AI API request duration in seconds',
  labelNames: ['type'],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

export const aiRequestTotal = new promClient.Counter({
  name: 'codeplatform_ai_requests_total',
  help: 'Total AI API requests',
  labelNames: ['type', 'status'],
});

export const register = promClient.register;
