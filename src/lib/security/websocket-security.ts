/**
 * WebSocket Security Middleware
 * Main security middleware combining CSWSH protection, authentication, and rate limiting
 */

import { WebSocketAuthHandler, createWebSocketAuthHandler } from './websocket-auth'
import {
  WebSocketRateLimiter,
  createWebSocketRateLimiter,
  type RedisClient,
} from './websocket-rate-limiter'
import {
  type WebSocketSecurityConfig,
  type WebSocketUpgradeRequest,
  type ValidationResult,
  type AuthenticationResult,
  type RateLimitResult,
  type SecurityAuditLog,
  type WebSocketConnectionContext,
  type SecurityMiddleware,
  SecurityEventType,
  ALLOWED_ORIGINS,
  CSWSH_PROTECTION_ERROR,
  UNAUTHORIZED_ORIGIN_ERROR,
  DEFAULT_MESSAGE_RATE_LIMITS,
  DEFAULT_CONNECTION_RATE_LIMIT,
  DEFAULT_RATE_LIMIT,
} from './websocket-security-types'

export interface SecurityLogger {
  log(event: SecurityAuditLog): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export class ConsoleSecurityLogger implements SecurityLogger {
  log(event: SecurityAuditLog): void {
    console.log('[SECURITY AUDIT]', JSON.stringify(event))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn('[SECURITY WARNING]', message, meta)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error('[SECURITY ERROR]', message, meta)
  }
}

export class WebSocketSecurityMiddleware implements SecurityMiddleware {
  private config: WebSocketSecurityConfig
  private authHandler: WebSocketAuthHandler
  private rateLimiter: WebSocketRateLimiter
  private logger: SecurityLogger
  private connectionContexts: Map<string, WebSocketConnectionContext> = new Map()

  constructor(
    config: Partial<WebSocketSecurityConfig> & { jwtSecret: string },
    redis?: RedisClient,
    logger?: SecurityLogger
  ) {
    this.config = {
      allowedOrigins: config.allowedOrigins || ALLOWED_ORIGINS,
      jwtSecret: config.jwtSecret,
      jwtAlgorithm: config.jwtAlgorithm || 'HS256',
      connectionRateLimit: { ...DEFAULT_CONNECTION_RATE_LIMIT, ...config.connectionRateLimit },
      messageRateLimits: { ...DEFAULT_MESSAGE_RATE_LIMITS, ...config.messageRateLimits },
      defaultRateLimit: { ...DEFAULT_RATE_LIMIT, ...config.defaultRateLimit },
      enableLogging: config.enableLogging !== false,
    }

    this.authHandler = createWebSocketAuthHandler(
      this.config.jwtSecret,
      this.config.jwtAlgorithm
    )

    this.rateLimiter = createWebSocketRateLimiter(
      this.config.connectionRateLimit,
      this.config.messageRateLimits,
      this.config.defaultRateLimit,
      redis
    )

    this.logger = logger || new ConsoleSecurityLogger()
  }

  /**
   * Validate Origin header against allowed origins list
   * CSWSH Protection: Reject connections from unauthorized domains
   */
  validateOrigin(request: WebSocketUpgradeRequest): ValidationResult {
    const origin = this.extractOrigin(request)
    const ip = this.extractIp(request)

    // If no origin header, check if it's a same-origin request (browser sends Origin for cross-origin)
    if (!origin) {
      // For same-origin requests, Origin header might not be present
      // But for WebSocket, browsers should always send it for cross-origin
      // We'll be permissive for missing origin but log it
      if (this.config.enableLogging) {
        this.logger.warn('Missing Origin header in WebSocket request', { ip })
      }
      
      // In production, you might want to be stricter
      // For now, we allow it but log for monitoring
      return { valid: true }
    }

    // Normalize origin for comparison
    const normalizedOrigin = origin.toLowerCase().trim()

    // Check against allowed origins
    const isAllowed = this.config.allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.toLowerCase().trim()
      return normalizedOrigin === normalizedAllowed ||
             normalizedOrigin.endsWith(`.${normalizedAllowed.replace(/^https?:\/\//, '')}`)
    })

    if (!isAllowed) {
      this.logSecurityEvent({
        timestamp: new Date(),
        event: SecurityEventType.ORIGIN_VALIDATION_FAILED,
        connectionId: this.generateConnectionId(),
        ip,
        origin,
        details: {
          reason: CSWSH_PROTECTION_ERROR,
          attemptedOrigin: origin,
          allowedOrigins: this.config.allowedOrigins,
        },
        blocked: true,
      })

      return {
        valid: false,
        error: UNAUTHORIZED_ORIGIN_ERROR,
        code: 403,
      }
    }

    this.logSecurityEvent({
      timestamp: new Date(),
      event: SecurityEventType.ORIGIN_VALIDATION_PASSED,
      connectionId: this.generateConnectionId(),
      ip,
      origin,
      details: { validatedOrigin: origin },
      blocked: false,
    })

    return { valid: true }
  }

  /**
   * Authenticate WebSocket connection request
   * Extracts and verifies JWT token BEFORE upgrade
   */
  async authenticate(request: WebSocketUpgradeRequest): Promise<AuthenticationResult> {
    const origin = this.extractOrigin(request)
    const ip = this.extractIp(request)
    const connectionId = this.generateConnectionId()

    const result = await this.authHandler.authenticate(request)

    if (!result.success) {
      this.logSecurityEvent({
        timestamp: new Date(),
        event: SecurityEventType.AUTHENTICATION_FAILED,
        connectionId,
        ip,
        origin,
        details: {
          reason: result.error,
          code: result.code,
        },
        blocked: true,
      })

      return result
    }

    // Store connection context for later use
    const context: WebSocketConnectionContext = {
      user: result.user,
      ip,
      origin: origin || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
      connectionTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      connectionId,
    }

    this.connectionContexts.set(connectionId, context)

    this.logSecurityEvent({
      timestamp: new Date(),
      event: SecurityEventType.AUTHENTICATION_SUCCESS,
      connectionId,
      ip,
      origin,
      userId: result.user?.id,
      details: {
        userId: result.user?.id,
        email: result.user?.email,
      },
      blocked: false,
    })

    return result
  }

  /**
   * Check connection rate limit
   */
  async checkConnectionRateLimit(userId: string, ip: string): Promise<RateLimitResult> {
    const result = await this.rateLimiter.checkConnectionRateLimit(userId, ip)

    if (!result.allowed) {
      this.logSecurityEvent({
        timestamp: new Date(),
        event: SecurityEventType.CONNECTION_RATE_LIMIT_EXCEEDED,
        connectionId: this.generateConnectionId(),
        ip,
        userId,
        details: {
          retryAfter: result.retryAfter,
          remaining: result.remaining,
        },
        blocked: true,
      })
    }

    return result
  }

  /**
   * Check message rate limit
   */
  async checkMessageRateLimit(
    connectionId: string,
    messageType: string
  ): Promise<RateLimitResult> {
    const result = await this.rateLimiter.checkMessageRateLimit(connectionId, messageType)
    const context = this.connectionContexts.get(connectionId)

    if (!result.allowed) {
      this.logSecurityEvent({
        timestamp: new Date(),
        event: SecurityEventType.MESSAGE_RATE_LIMIT_EXCEEDED,
        connectionId,
        ip: context?.ip || 'unknown',
        userId: context?.user?.id,
        details: {
          messageType,
          retryAfter: result.retryAfter,
        },
        blocked: true,
      })
    } else if (context) {
      context.messageCount += 1
      context.lastActivity = new Date()
    }

    return result
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: SecurityAuditLog): void {
    if (this.config.enableLogging) {
      this.logger.log(event)
    }
  }

  /**
   * Handle connection close
   */
  async handleConnectionClose(connectionId: string): Promise<void> {
    const context = this.connectionContexts.get(connectionId)
    
    if (context && context.user) {
      await this.rateLimiter.decrementConnectionCounter(
        context.user.id,
        context.ip
      )
    }

    this.connectionContexts.delete(connectionId)

    this.logSecurityEvent({
      timestamp: new Date(),
      event: SecurityEventType.CONNECTION_CLOSED,
      connectionId,
      ip: context?.ip || 'unknown',
      userId: context?.user?.id,
      details: {
        duration: context ? Date.now() - context.connectionTime.getTime() : 0,
        messageCount: context?.messageCount || 0,
      },
      blocked: false,
    })
  }

  /**
   * Get connection context
   */
  getConnectionContext(connectionId: string): WebSocketConnectionContext | undefined {
    return this.connectionContexts.get(connectionId)
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): WebSocketConnectionContext[] {
    return Array.from(this.connectionContexts.values())
  }

  /**
   * Perform full security check before WebSocket upgrade
   * Returns the authentication result if successful
   */
  async performSecurityCheck(
    request: WebSocketUpgradeRequest
  ): Promise<{
    allowed: boolean
    result?: AuthenticationResult
    error?: string
    code?: number
  }> {
    // Step 1: Validate Origin (CSWSH Protection)
    const originResult = this.validateOrigin(request)
    if (!originResult.valid) {
      return {
        allowed: false,
        error: originResult.error,
        code: originResult.code,
      }
    }

    // Step 2: Authenticate (extract and verify JWT)
    const authResult = await this.authenticate(request)
    if (!authResult.success) {
      return {
        allowed: false,
        error: authResult.error,
        code: authResult.code,
      }
    }

    // Step 3: Check connection rate limits
    if (authResult.user) {
      const ip = this.extractIp(request)
      const rateLimitResult = await this.checkConnectionRateLimit(
        authResult.user.id,
        ip
      )

      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          error: 'Rate limit exceeded. Too many connections.',
          code: 429,
        }
      }
    }

    // Connection accepted
    this.logSecurityEvent({
      timestamp: new Date(),
      event: SecurityEventType.CONNECTION_ACCEPTED,
      connectionId: this.generateConnectionId(),
      ip: this.extractIp(request),
      origin: this.extractOrigin(request),
      userId: authResult.user?.id,
      details: {
        userId: authResult.user?.id,
        email: authResult.user?.email,
      },
      blocked: false,
    })

    return {
      allowed: true,
      result: authResult,
    }
  }

  /**
   * Extract origin from request headers
   */
  private extractOrigin(request: WebSocketUpgradeRequest): string | undefined {
    const origin = request.headers.origin
    if (typeof origin === 'string') {
      return origin
    }
    if (Array.isArray(origin) && origin.length > 0) {
      return origin[0]
    }
    return undefined
  }

  /**
   * Extract IP address from request
   */
  private extractIp(request: WebSocketUpgradeRequest): string {
    // Try various headers for IP address
    const forwarded = request.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim()
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].split(',')[0].trim()
    }

    const realIp = request.headers['x-real-ip']
    if (typeof realIp === 'string') {
      return realIp
    }
    if (Array.isArray(realIp) && realIp.length > 0) {
      return realIp[0]
    }

    return request.socket.remoteAddress || 'unknown'
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Destroy the middleware and cleanup resources
   */
  destroy(): void {
    this.rateLimiter.destroy()
    this.connectionContexts.clear()
  }
}

/**
 * Factory function to create security middleware
 */
export function createWebSocketSecurityMiddleware(
  config: Partial<WebSocketSecurityConfig> & { jwtSecret: string },
  redis?: RedisClient,
  logger?: SecurityLogger
): WebSocketSecurityMiddleware {
  return new WebSocketSecurityMiddleware(config, redis, logger)
}

/**
 * Express/Connect middleware adapter for WebSocket upgrade
 */
export function createWebSocketSecurityExpressMiddleware(
  securityMiddleware: WebSocketSecurityMiddleware
) {
  return async (
    request: WebSocketUpgradeRequest,
    response: { writeHead: (code: number, headers?: Record<string, string>) => void; end: (message?: string) => void },
    next: (error?: Error) => void
  ): Promise<void> => {
    try {
      const result = await securityMiddleware.performSecurityCheck(request)

      if (!result.allowed) {
        response.writeHead(result.code || 403, {
          'Content-Type': 'application/json',
        })
        response.end(JSON.stringify({
          error: result.error,
          code: result.code,
        }))
        return
      }

      // Attach user to request for later use
      ;(request as any).user = result.result?.user
      ;(request as any).connectionId = securityMiddleware['generateConnectionId']()

      next()
    } catch (error) {
      next(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
