/**
 * Unit Tests for WebSocket Security Middleware
 * Tests CSWSH protection, authentication, and comprehensive security checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WebSocketSecurityMiddleware,
  createWebSocketSecurityMiddleware,
  ConsoleSecurityLogger,
} from '../websocket-security'
import { SignJWT } from 'jose'
import {
  type WebSocketUpgradeRequest,
  SecurityEventType,
  ALLOWED_ORIGINS,
} from '../websocket-security-types'

describe('WebSocketSecurityMiddleware', () => {
  const JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long'
  let middleware: WebSocketSecurityMiddleware
  let mockLogger: { log: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    middleware = createWebSocketSecurityMiddleware(
      {
        jwtSecret: JWT_SECRET,
        allowedOrigins: ALLOWED_ORIGINS,
        enableLogging: true,
      },
      undefined,
      mockLogger as any
    )
  })

  afterEach(() => {
    middleware.destroy()
  })

  describe('validateOrigin', () => {
    it('should allow requests from allowed origins', () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      const result = middleware.validateOrigin(request)
      expect(result.valid).toBe(true)
    })

    it('should allow staging origin', () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://staging.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      const result = middleware.validateOrigin(request)
      expect(result.valid).toBe(true)
    })

    it('should allow localhost origin', () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'http://localhost:3000' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      const result = middleware.validateOrigin(request)
      expect(result.valid).toBe(true)
    })

    it('should reject requests from unauthorized origins (CSWSH protection)', () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://malicious-site.com' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      const result = middleware.validateOrigin(request)
      expect(result.valid).toBe(false)
      expect(result.code).toBe(403)
      expect(result.error).toContain('Origin not allowed')
    })

    it('should reject case-insensitive origin matching', () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'HTTPS://APP.ANTIGRAVITY.DEV' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      const result = middleware.validateOrigin(request)
      expect(result.valid).toBe(true)
    })

    it('should log security event on CSWSH attempt', () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://evil.com' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      middleware.validateOrigin(request)

      expect(mockLogger.log).toHaveBeenCalled()
      const logCall = mockLogger.log.mock.calls[0][0]
      expect(logCall.event).toBe(SecurityEventType.ORIGIN_VALIDATION_FAILED)
      expect(logCall.blocked).toBe(true)
    })

    it('should handle missing origin header (logs warning)', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws',
      }

      const result = middleware.validateOrigin(request)
      expect(result.valid).toBe(true) // Permissive for missing origin
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  describe('authenticate', () => {
    it('should authenticate with valid JWT token', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
        roles: ['user'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      const result = await middleware.authenticate(request)
      expect(result.success).toBe(true)
      expect(result.user?.id).toBe('user123')
    })

    it('should store connection context after authentication', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { 
          origin: 'https://app.antigravity.dev',
          'user-agent': 'Test-Agent/1.0',
        },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)

      const contexts = middleware.getActiveConnections()
      expect(contexts.length).toBe(1)
      expect(contexts[0].user?.id).toBe('user123')
      expect(contexts[0].ip).toBe('192.168.1.1')
    })

    it('should log authentication failure', async () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws?token=invalid.token',
      }

      await middleware.authenticate(request)

      expect(mockLogger.log).toHaveBeenCalled()
      const logCall = mockLogger.log.mock.calls.find(
        (call: any[]) => call[0].event === SecurityEventType.AUTHENTICATION_FAILED
      )
      expect(logCall).toBeDefined()
      expect(logCall[0].blocked).toBe(true)
    })

    it('should log authentication success', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)

      const logCall = mockLogger.log.mock.calls.find(
        (call: any[]) => call[0].event === SecurityEventType.AUTHENTICATION_SUCCESS
      )
      expect(logCall).toBeDefined()
      expect(logCall[0].blocked).toBe(false)
    })
  })

  describe('checkConnectionRateLimit', () => {
    it('should allow connections within rate limits', async () => {
      const result = await middleware.checkConnectionRateLimit('user1', '192.168.1.1')
      expect(result.allowed).toBe(true)
    })

    it('should block connections exceeding user limit', async () => {
      // Use up the limit
      await middleware.checkConnectionRateLimit('user1', '192.168.1.1')
      await middleware.checkConnectionRateLimit('user1', '192.168.1.2')
      await middleware.checkConnectionRateLimit('user1', '192.168.1.3')
      await middleware.checkConnectionRateLimit('user1', '192.168.1.4')
      await middleware.checkConnectionRateLimit('user1', '192.168.1.5')
      
      const blocked = await middleware.checkConnectionRateLimit('user1', '192.168.1.6')
      expect(blocked.allowed).toBe(false)
    })

    it('should log rate limit exceeded events', async () => {
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        await middleware.checkConnectionRateLimit('user1', `192.168.1.${i}`)
      }
      
      await middleware.checkConnectionRateLimit('user1', '192.168.1.99')

      const logCall = mockLogger.log.mock.calls.find(
        (call: any[]) => call[0].event === SecurityEventType.CONNECTION_RATE_LIMIT_EXCEEDED
      )
      expect(logCall).toBeDefined()
      expect(logCall[0].blocked).toBe(true)
    })
  })

  describe('checkMessageRateLimit', () => {
    it('should track message count in connection context', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      const authResult = await middleware.authenticate(request)
      const connectionId = middleware.getActiveConnections()[0].connectionId

      // Send messages
      await middleware.checkMessageRateLimit(connectionId, 'AGENT_STATUS_UPDATE')
      await middleware.checkMessageRateLimit(connectionId, 'AGENT_STATUS_UPDATE')

      const context = middleware.getConnectionContext(connectionId)
      expect(context?.messageCount).toBe(2)
    })
  })

  describe('performSecurityCheck', () => {
    it('should perform complete security check and allow valid connections', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { 
          origin: 'https://app.antigravity.dev',
          'x-forwarded-for': '192.168.1.1',
        },
        socket: {},
        url: `/ws?token=${token}`,
      }

      const result = await middleware.performSecurityCheck(request)
      expect(result.allowed).toBe(true)
      expect(result.result?.user?.id).toBe('user123')
    })

    it('should reject connections with invalid origin', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://evil.com' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      const result = await middleware.performSecurityCheck(request)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe(403)
    })

    it('should reject connections with invalid token', async () => {
      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: '/ws?token=invalid.token',
      }

      const result = await middleware.performSecurityCheck(request)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe(401)
    })

    it('should reject connections exceeding rate limits', async () => {
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      // Use up the rate limit
      for (let i = 0; i < 5; i++) {
        const request: WebSocketUpgradeRequest = {
          headers: { 
            origin: 'https://app.antigravity.dev',
            'x-forwarded-for': '192.168.1.1',
          },
          socket: {},
          url: `/ws?token=${token}`,
        }
        await middleware.performSecurityCheck(request)
      }

      const blockedRequest: WebSocketUpgradeRequest = {
        headers: { 
          origin: 'https://app.antigravity.dev',
          'x-forwarded-for': '192.168.1.1',
        },
        socket: {},
        url: `/ws?token=${token}`,
      }

      const result = await middleware.performSecurityCheck(blockedRequest)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe(429)
    })

    it('should log connection accepted events', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.performSecurityCheck(request)

      const logCall = mockLogger.log.mock.calls.find(
        (call: any[]) => call[0].event === SecurityEventType.CONNECTION_ACCEPTED
      )
      expect(logCall).toBeDefined()
      expect(logCall[0].blocked).toBe(false)
    })
  })

  describe('handleConnectionClose', () => {
    it('should clean up connection context on close', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)
      expect(middleware.getActiveConnections().length).toBe(1)

      const connectionId = middleware.getActiveConnections()[0].connectionId
      await middleware.handleConnectionClose(connectionId)

      expect(middleware.getActiveConnections().length).toBe(0)
    })

    it('should log connection close events', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)
      const connectionId = middleware.getActiveConnections()[0].connectionId

      await middleware.handleConnectionClose(connectionId)

      const logCall = mockLogger.log.mock.calls.find(
        (call: any[]) => call[0].event === SecurityEventType.CONNECTION_CLOSED
      )
      expect(logCall).toBeDefined()
    })
  })

  describe('extractIp', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { 
          origin: 'https://app.antigravity.dev',
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)
      
      const context = middleware.getActiveConnections()[0]
      expect(context.ip).toBe('10.0.0.1') // First IP in chain
    })

    it('should extract IP from x-real-ip header', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { 
          origin: 'https://app.antigravity.dev',
          'x-real-ip': '10.0.0.2',
        },
        socket: { remoteAddress: '127.0.0.1' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)
      
      const context = middleware.getActiveConnections()[0]
      expect(context.ip).toBe('10.0.0.2')
    })

    it('should fallback to socket remoteAddress', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: { origin: 'https://app.antigravity.dev' },
        socket: { remoteAddress: '192.168.1.100' },
        url: `/ws?token=${token}`,
      }

      await middleware.authenticate(request)
      
      const context = middleware.getActiveConnections()[0]
      expect(context.ip).toBe('192.168.1.100')
    })
  })
})

describe('ConsoleSecurityLogger', () => {
  it('should log security events', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = new ConsoleSecurityLogger()

    logger.log({
      timestamp: new Date(),
      event: SecurityEventType.CONNECTION_ACCEPTED,
      connectionId: 'test-123',
      ip: '192.168.1.1',
      details: {},
      blocked: false,
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('createWebSocketSecurityMiddleware', () => {
  it('should create middleware with required config', () => {
    const mw = createWebSocketSecurityMiddleware({ jwtSecret: JWT_SECRET })
    expect(mw).toBeInstanceOf(WebSocketSecurityMiddleware)
    mw.destroy()
  })

  it('should throw error for short JWT secret', () => {
    expect(() => createWebSocketSecurityMiddleware({ jwtSecret: 'short' })).toThrow()
  })
})
