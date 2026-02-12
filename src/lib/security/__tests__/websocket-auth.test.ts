/**
 * Unit Tests for WebSocket Authentication Handler
 * Tests JWT token extraction, verification, and authentication
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { WebSocketAuthHandler, createWebSocketAuthHandler, isAuthRequired } from '../websocket-auth'
import { type WebSocketUpgradeRequest } from '../websocket-security-types'
import { SignJWT } from 'jose'

describe('WebSocketAuthHandler', () => {
  const JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long'
  let authHandler: WebSocketAuthHandler

  beforeEach(() => {
    authHandler = createWebSocketAuthHandler(JWT_SECRET)
  })

  describe('extractTokenFromUrl', () => {
    it('should extract token from query parameters', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: '/ws?token=valid.jwt.token',
      }

      const result = authHandler.extractTokenFromUrl(request)
      expect(result).not.toBeNull()
      expect(result?.token).toBe('valid.jwt.token')
    })

    it('should extract token from absolute WebSocket URL', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: 'ws://localhost:8000/ws?token=mytoken123',
      }

      const result = authHandler.extractTokenFromUrl(request)
      expect(result?.token).toBe('mytoken123')
    })

    it('should handle secure WebSocket URLs', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: 'wss://app.antigravity.dev/ws?token=secure.token',
      }

      const result = authHandler.extractTokenFromUrl(request)
      expect(result?.token).toBe('secure.token')
    })

    it('should return null when no URL is provided', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
      }

      const result = authHandler.extractTokenFromUrl(request)
      expect(result).toBeNull()
    })

    it('should return null when token is missing', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: '/ws?otherParam=value',
      }

      const result = authHandler.extractTokenFromUrl(request)
      expect(result).toBeNull()
    })

    it('should handle malformed URLs gracefully', () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: 'not-a-valid-url',
      }

      const result = authHandler.extractTokenFromUrl(request)
      expect(result).toBeNull()
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid JWT token', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
        roles: ['user'],
        permissions: ['read'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const result = await authHandler.verifyToken(token)
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.id).toBe('user123')
      expect(result.user?.email).toBe('user@example.com')
    })

    it('should reject an expired token', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('-1h') // Already expired
        .sign(new TextEncoder().encode(JWT_SECRET))

      const result = await authHandler.verifyToken(token)
      expect(result.success).toBe(false)
      expect(result.code).toBe(401)
      expect(result.error).toContain('expired')
    })

    it('should reject a token with invalid signature', async () => {
      const wrongSecret = 'different-secret-key-that-is-also-32-chars'
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(wrongSecret))

      const result = await authHandler.verifyToken(token)
      expect(result.success).toBe(false)
      expect(result.code).toBe(401)
      expect(result.error).toContain('Invalid')
    })

    it('should reject token with missing required fields', async () => {
      const token = await new SignJWT({
        // Missing 'sub' and 'email'
        name: 'Test User',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const result = await authHandler.verifyToken(token)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid token payload')
    })

    it('should handle malformed tokens', async () => {
      const result = await authHandler.verifyToken('not-a-valid-token')
      expect(result.success).toBe(false)
      expect(result.code).toBe(401)
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully with valid token', async () => {
      const token = await new SignJWT({
        sub: 'user123',
        email: 'user@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: `/ws?token=${token}`,
      }

      const result = await authHandler.authenticate(request)
      expect(result.success).toBe(true)
      expect(result.user?.id).toBe('user123')
    })

    it('should fail when token is missing', async () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: '/ws',
      }

      const result = await authHandler.authenticate(request)
      expect(result.success).toBe(false)
      expect(result.code).toBe(401)
      expect(result.error).toContain('Missing')
    })

    it('should fail when token is invalid', async () => {
      const request: WebSocketUpgradeRequest = {
        headers: {},
        socket: {},
        url: '/ws?token=invalid.token.here',
      }

      const result = await authHandler.authenticate(request)
      expect(result.success).toBe(false)
      expect(result.code).toBe(401)
    })
  })

  describe('isValidTokenFormat', () => {
    it('should validate correct JWT format', () => {
      expect(authHandler.isValidTokenFormat('header.payload.signature')).toBe(true)
    })

    it('should reject token with wrong number of parts', () => {
      expect(authHandler.isValidTokenFormat('only.two.parts')).toBe(false)
      expect(authHandler.isValidTokenFormat('too.many.parts.here.now')).toBe(false)
    })

    it('should reject empty or null tokens', () => {
      expect(authHandler.isValidTokenFormat('')).toBe(false)
      expect(authHandler.isValidTokenFormat(null as any)).toBe(false)
      expect(authHandler.isValidTokenFormat(undefined as any)).toBe(false)
    })

    it('should reject tokens with invalid characters', () => {
      expect(authHandler.isValidTokenFormat('header.payload.si!gnature')).toBe(false)
      expect(authHandler.isValidTokenFormat('header.pay load.signature')).toBe(false)
    })
  })
})

describe('createWebSocketAuthHandler', () => {
  it('should create handler with valid secret', () => {
    const handler = createWebSocketAuthHandler('valid-secret-that-is-32-chars-long!')
    expect(handler).toBeInstanceOf(WebSocketAuthHandler)
  })

  it('should throw error for short secret', () => {
    expect(() => createWebSocketAuthHandler('short')).toThrow('at least 32 characters')
  })

  it('should throw error for empty secret', () => {
    expect(() => createWebSocketAuthHandler('')).toThrow('at least 32 characters')
  })
})

describe('isAuthRequired', () => {
  it('should require auth for standard paths', () => {
    expect(isAuthRequired('/ws/agents')).toBe(true)
    expect(isAuthRequired('/ws/tasks')).toBe(true)
    expect(isAuthRequired('/ws/private')).toBe(true)
  })

  it('should not require auth for public paths', () => {
    expect(isAuthRequired('/ws/health')).toBe(false)
    expect(isAuthRequired('/ws/public')).toBe(false)
    expect(isAuthRequired('/ws/health/check')).toBe(false)
  })
})
