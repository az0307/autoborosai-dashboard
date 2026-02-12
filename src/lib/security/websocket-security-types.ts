/**
 * WebSocket Security Types
 * Type definitions for WebSocket security hardening
 */

export type WebSocketMessageType = 
  | 'AGENT_STATUS_UPDATE'
  | 'CHAT_MESSAGE'
  | 'METRICS_REQUEST'
  | string

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface MessageRateLimits {
  [messageType: string]: RateLimitConfig
}

export interface ConnectionRateLimitConfig {
  maxConnectionsPerUser: number
  maxConnectionsPerIp: number
  windowMs: number
}

export interface WebSocketSecurityConfig {
  allowedOrigins: string[]
  jwtSecret: string
  jwtAlgorithm?: string
  connectionRateLimit: ConnectionRateLimitConfig
  messageRateLimits: MessageRateLimits
  defaultRateLimit: RateLimitConfig
  enableLogging: boolean
}

export interface AuthenticatedUser {
  id: string
  email: string
  roles: string[]
  permissions: string[]
  sessionId: string
}

export interface WebSocketConnectionContext {
  user?: AuthenticatedUser
  ip: string
  origin: string
  userAgent: string
  connectionTime: Date
  lastActivity: Date
  messageCount: number
  connectionId: string
}

export interface RateLimitState {
  count: number
  resetTime: number
}

export interface SecurityAuditLog {
  timestamp: Date
  event: SecurityEventType
  connectionId: string
  ip: string
  origin?: string
  userId?: string
  details: Record<string, unknown>
  blocked: boolean
}

export enum SecurityEventType {
  ORIGIN_VALIDATION_FAILED = 'origin_validation_failed',
  ORIGIN_VALIDATION_PASSED = 'origin_validation_passed',
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHENTICATION_SUCCESS = 'authentication_success',
  CONNECTION_RATE_LIMIT_EXCEEDED = 'connection_rate_limit_exceeded',
  MESSAGE_RATE_LIMIT_EXCEEDED = 'message_rate_limit_exceeded',
  CONNECTION_ACCEPTED = 'connection_accepted',
  CONNECTION_REJECTED = 'connection_rejected',
  CONNECTION_CLOSED = 'connection_closed',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export interface ValidationResult {
  valid: boolean
  error?: string
  code?: number
}

export interface AuthenticationResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  code?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

export interface ParsedToken {
  token: string
  userId?: string
}

export type WebSocketUpgradeRequest = {
  headers: {
    origin?: string
    'user-agent'?: string
    [key: string]: string | string[] | undefined
  }
  socket: {
    remoteAddress?: string
  }
  url?: string
}

export interface SecurityMiddleware {
  validateOrigin(request: WebSocketUpgradeRequest): ValidationResult
  authenticate(request: WebSocketUpgradeRequest): Promise<AuthenticationResult>
  checkConnectionRateLimit(userId: string, ip: string): Promise<RateLimitResult>
  checkMessageRateLimit(
    connectionId: string,
    messageType: WebSocketMessageType
  ): Promise<RateLimitResult>
  logSecurityEvent(event: SecurityAuditLog): void
}

export const DEFAULT_MESSAGE_RATE_LIMITS: MessageRateLimits = {
  AGENT_STATUS_UPDATE: { windowMs: 60000, maxRequests: 100 },
  CHAT_MESSAGE: { windowMs: 60000, maxRequests: 50 },
  METRICS_REQUEST: { windowMs: 60000, maxRequests: 200 },
}

export const DEFAULT_CONNECTION_RATE_LIMIT: ConnectionRateLimitConfig = {
  maxConnectionsPerUser: 5,
  maxConnectionsPerIp: 10,
  windowMs: 60000,
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
}

export const ALLOWED_ORIGINS = [
  'https://app.antigravity.dev',
  'https://staging.antigravity.dev',
  'http://localhost:3000',
]

export const CSWSH_PROTECTION_ERROR = 'Cross-Site WebSocket Hijacking attempt detected'
export const AUTHENTICATION_ERROR = 'Authentication failed'
export const RATE_LIMIT_ERROR = 'Rate limit exceeded'
export const UNAUTHORIZED_ORIGIN_ERROR = 'Origin not allowed'
