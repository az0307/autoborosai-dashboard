export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
export const API_TIMEOUT = 30000

export const API_ENDPOINTS = {
  // Agent endpoints
  AGENTS: '/api/agents',
  AGENT: (id: string) => `/api/agents/${id}`,
  AGENT_STATUS: (id: string) => `/api/agents/${id}/status`,
  AGENT_PERFORMANCE: (id: string) => `/api/agents/${id}/performance`,
  AGENT_CONFIG: (id: string) => `/api/agents/${id}/config`,
  
  // Task endpoints
  TASKS: '/api/tasks',
  TASK: (id: string) => `/api/tasks/${id}`,
  TASK_ASSIGN: (id: string) => `/api/tasks/${id}/assign`,
  TASK_COMPLETE: (id: string) => `/api/tasks/${id}/complete`,
  
  // Orchestration endpoints
  ORCHESTRATION: '/api/orchestration',
  PATTERNS: '/api/orchestration/patterns',
  COMMUNICATION: '/api/orchestration/communication',
  CONFLICTS: '/api/orchestration/conflicts',
  
  // Governance endpoints
  POLICIES: '/api/governance/policies',
  AUDIT: '/api/governance/audit',
  COMPLIANCE: '/api/governance/compliance',
  
  // Analytics endpoints
  ANALYTICS: '/api/analytics',
  METRICS: '/api/analytics/metrics',
  HEALTH: '/api/analytics/health',
  ALERTS: '/api/analytics/alerts',
  
  // Authentication endpoints
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',
  
  // WebSocket endpoints
  WEBSOCKET: '/ws',
  AGENT_EVENTS: '/ws/agents',
  TASK_EVENTS: '/ws/tasks',
  SYSTEM_EVENTS: '/ws/system',
}

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
}

export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Agent events
  AGENT_CONNECTED: 'agent_connected',
  AGENT_DISCONNECTED: 'agent_disconnected',
  AGENT_STATUS_UPDATE: 'agent_status_update',
  AGENT_PERFORMANCE_UPDATE: 'agent_performance_update',
  
  // Task events
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  
  // Orchestration events
  PATTERN_ACTIVATED: 'pattern_activated',
  CONFLICT_DETECTED: 'conflict_detected',
  CONFLICT_RESOLVED: 'conflict_resolved',
  RESOURCE_ALLOCATED: 'resource_allocated',
  RESOURCE_RELEASED: 'resource_released',
  
  // System events
  SYSTEM_ALERT: 'system_alert',
  HEALTH_UPDATE: 'health_update',
  PERFORMANCE_DEGRADED: 'performance_degraded',
  
  // Governance events
  POLICY_VIOLATION: 'policy_violation',
  AUDIT_EVENT: 'audit_event',
  COMPLIANCE_CHECK: 'compliance_check',
}