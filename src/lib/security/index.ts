/**
 * WebSocket Security Module - Main Export
 * Provides comprehensive WebSocket security hardening
 */

// Core types
export type {
  WebSocketMessageType,
  RateLimitConfig,
  MessageRateLimits,
  ConnectionRateLimitConfig,
  WebSocketSecurityConfig,
  AuthenticatedUser,
  WebSocketConnectionContext,
  RateLimitState,
  SecurityAuditLog,
  ValidationResult,
  AuthenticationResult,
  RateLimitResult,
  ParsedToken,
  WebSocketUpgradeRequest,
  SecurityMiddleware,
} from './websocket-security-types'

export {
  SecurityEventType,
  DEFAULT_MESSAGE_RATE_LIMITS,
  DEFAULT_CONNECTION_RATE_LIMIT,
  DEFAULT_RATE_LIMIT,
  ALLOWED_ORIGINS,
  CSWSH_PROTECTION_ERROR,
  AUTHENTICATION_ERROR,
  RATE_LIMIT_ERROR,
  UNAUTHORIZED_ORIGIN_ERROR,
} from './websocket-security-types'

// Authentication
export {
  WebSocketAuthHandler,
  createWebSocketAuthHandler,
  isAuthRequired,
} from './websocket-auth'

export type { JWTConfig } from './websocket-auth'

// Rate Limiting
export {
  WebSocketRateLimiter,
  createWebSocketRateLimiter,
} from './websocket-rate-limiter'

export type { RedisClient, MemoryStorage } from './websocket-rate-limiter'

// Security Middleware
export {
  WebSocketSecurityMiddleware,
  createWebSocketSecurityMiddleware,
  ConsoleSecurityLogger,
  createWebSocketSecurityExpressMiddleware,
} from './websocket-security'

export type { SecurityLogger } from './websocket-security'
