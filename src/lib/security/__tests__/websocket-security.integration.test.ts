/**
 * Integration Tests for WebSocket Security
 * Tests complete security flow including CSWSH protection, authentication, and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { WebSocketServer } from 'ws'
import { createServer, type Server } from 'http'
import { WebSocketSecurityMiddleware, createWebSocketSecurityMiddleware } from '../websocket-security'
import { SignJWT } from 'jose'
import type { WebSocket } from 'ws'

describe('WebSocket Security Integration Tests', () => {
  const JWT_SECRET = 'integration-test-secret-key-32-chars-long'
  let server: Server
  let wss: WebSocketServer
  let middleware: WebSocketSecurityMiddleware
  let port: number

  beforeAll(async () => {
    middleware = createWebSocketSecurityMiddleware({
      jwtSecret: JWT_SECRET,
      allowedOrigins: ['https://app.antigravity.dev', 'http://localhost:3000'],
      connectionRateLimit: {
        maxConnectionsPerUser: 2,
        maxConnectionsPerIp: 3,
        windowMs: 1000,
      },
      messageRateLimits: {
        'AGENT_STATUS_UPDATE': { windowMs: 1000, maxRequests: 5 },
        'CHAT_MESSAGE': { windowMs: 1000, maxRequests: 3 },
        'METRICS_REQUEST': { windowMs: 1000, maxRequests: 10 },
      },
    })

    server = createServer()
    
    wss = new WebSocketServer({ 
      noServer: true,
      verifyClient: async (info, cb) => {
        const result = await middleware.performSecurityCheck(info.req as any)
        if (result.allowed) {
          ;(info.req as any).user = result.result?.user
          ;(info.req as any).connectionId = middleware.getActiveConnections()[0]?.connectionId
          cb(true)
        } else {
          cb(false, result.code || 403, result.error)
        }
      },
    })

    server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    })

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port
        resolve()
      })
    })
  })

  afterAll(() => {
    middleware.destroy()
    wss.close()
    server.close()
  })

  afterEach(() => {
    // Clean up all connections
    wss.clients.forEach(client => client.close())
  })

  describe('CSWSH Protection', () => {
    it('should accept connections from allowed origins', async () => {
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.close()
          resolve()
        })
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })
    })

    it('should reject connections from unauthorized origins (CSWSH attack simulation)', async () => {
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://malicious-site.com' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Should not connect from unauthorized origin'))
        })
        ws.on('error', (err: any) => {
          expect(err.message).toContain('403')
          resolve()
        })
        setTimeout(() => reject(new Error('Expected error not received')), 5000)
      })
    })
  })

  describe('Authentication Before Upgrade', () => {
    it('should authenticate successfully with valid token', async () => {
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@test.com',
        roles: ['user'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.close()
          resolve()
        })
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })
    })

    it('should reject connection without token (401)', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Should not connect without token'))
        })
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401')
          resolve()
        })
        setTimeout(() => reject(new Error('Expected error not received')), 5000)
      })
    })

    it('should reject connection with expired token', async () => {
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('-1h') // Expired
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Should not connect with expired token'))
        })
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401')
          resolve()
        })
        setTimeout(() => reject(new Error('Expected error not received')), 5000)
      })
    })

    it('should reject connection with invalid token signature', async () => {
      const wrongSecret = 'different-secret-key-that-is-32-chars!'
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(wrongSecret))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          reject(new Error('Should not connect with invalid signature'))
        })
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401')
          resolve()
        })
        setTimeout(() => reject(new Error('Expected error not received')), 5000)
      })
    })
  })

  describe('Connection Rate Limiting', () => {
    it('should allow connections within rate limit', async () => {
      const token = await new SignJWT({
        sub: 'user1',
        email: 'user1@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const connections: WebSocket[] = []

      // Connect 2 times (within limit)
      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
          headers: { Origin: 'https://app.antigravity.dev' },
        })
        connections.push(ws)
        
        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve)
          ws.on('error', reject)
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        })
      }

      connections.forEach(ws => ws.close())
    })

    it('should block connections exceeding user rate limit (429)', async () => {
      const token = await new SignJWT({
        sub: 'user2',
        email: 'user2@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const connections: WebSocket[] = []

      // Connect 2 times (at limit)
      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
          headers: { Origin: 'https://app.antigravity.dev' },
        })
        connections.push(ws)
        
        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve)
          ws.on('error', reject)
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        })
      }

      // 3rd connection should be blocked
      const blockedWs = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        blockedWs.on('open', () => {
          reject(new Error('Should be rate limited'))
        })
        blockedWs.on('error', (err: any) => {
          expect(err.message).toContain('429')
          resolve()
        })
        setTimeout(() => reject(new Error('Expected error not received')), 5000)
      })

      connections.forEach(ws => ws.close())
    })

    it('should block connections exceeding IP rate limit', async () => {
      // Connect from same IP with different users
      const connections: WebSocket[] = []
      
      for (let i = 0; i < 3; i++) {
        const token = await new SignJWT({
          sub: `user${i}`,
          email: `user${i}@test.com`,
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('1h')
          .sign(new TextEncoder().encode(JWT_SECRET))

        const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
          headers: { 
            Origin: 'https://app.antigravity.dev',
            'X-Forwarded-For': '10.0.0.1', // Same IP
          },
        })
        connections.push(ws)
        
        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve)
          ws.on('error', reject)
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        })
      }

      // 4th connection from same IP should be blocked
      const blockedToken = await new SignJWT({
        sub: 'user-blocked',
        email: 'blocked@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const blockedWs = new WebSocket(`ws://localhost:${port}/ws?token=${blockedToken}`, {
        headers: { 
          Origin: 'https://app.antigravity.dev',
          'X-Forwarded-For': '10.0.0.1',
        },
      })

      await new Promise<void>((resolve, reject) => {
        blockedWs.on('open', () => {
          reject(new Error('Should be rate limited'))
        })
        blockedWs.on('error', (err: any) => {
          expect(err.message).toContain('429')
          resolve()
        })
        setTimeout(() => reject(new Error('Expected error not received')), 5000)
      })

      connections.forEach(ws => ws.close())
    })
  })

  describe('Message Rate Limiting', () => {
    it('should track and enforce message rate limits', async () => {
      const token = await new SignJWT({
        sub: 'user-msg',
        email: 'user-msg@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve)
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      const connectionId = middleware.getActiveConnections()[0]?.connectionId
      expect(connectionId).toBeDefined()

      // Send messages up to limit
      for (let i = 0; i < 5; i++) {
        const result = await middleware.checkMessageRateLimit(connectionId, 'AGENT_STATUS_UPDATE')
        expect(result.allowed).toBe(true)
      }

      // 6th message should be blocked
      const blocked = await middleware.checkMessageRateLimit(connectionId, 'AGENT_STATUS_UPDATE')
      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfter).toBeDefined()

      ws.close()
    })

    it('should apply different limits for different message types', async () => {
      const token = await new SignJWT({
        sub: 'user-types',
        email: 'user-types@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve)
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      const connectionId = middleware.getActiveConnections()[0]?.connectionId

      // CHAT_MESSAGE has lower limit (3)
      for (let i = 0; i < 3; i++) {
        const result = await middleware.checkMessageRateLimit(connectionId, 'CHAT_MESSAGE')
        expect(result.allowed).toBe(true)
      }

      const chatBlocked = await middleware.checkMessageRateLimit(connectionId, 'CHAT_MESSAGE')
      expect(chatBlocked.allowed).toBe(false)

      // But AGENT_STATUS_UPDATE should still work (separate limit)
      const agentResult = await middleware.checkMessageRateLimit(connectionId, 'AGENT_STATUS_UPDATE')
      expect(agentResult.allowed).toBe(true)

      ws.close()
    })
  })

  describe('Security Event Logging', () => {
    it('should log connection accepted events', async () => {
      const logSpy = vi.fn()
      const customMiddleware = createWebSocketSecurityMiddleware({
        jwtSecret: JWT_SECRET,
        allowedOrigins: ['https://app.antigravity.dev'],
      }, undefined, {
        log: logSpy,
        warn: vi.fn(),
        error: vi.fn(),
      })

      const token = await new SignJWT({
        sub: 'user-log',
        email: 'user-log@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { Origin: 'https://app.antigravity.dev' },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve)
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      // Check that authentication success was logged
      const authLog = logSpy.mock.calls.find(
        (call: any[]) => call[0].event === 'authentication_success'
      )
      expect(authLog).toBeDefined()

      ws.close()
      customMiddleware.destroy()
    })
  })

  describe('Connection Context Management', () => {
    it('should maintain connection context throughout lifecycle', async () => {
      const token = await new SignJWT({
        sub: 'user-ctx',
        email: 'user-ctx@test.com',
        roles: ['admin'],
        permissions: ['read', 'write'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(JWT_SECRET))

      const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`, {
        headers: { 
          Origin: 'https://app.antigravity.dev',
          'User-Agent': 'TestClient/1.0',
        },
      })

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve)
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      const context = middleware.getActiveConnections()[0]
      expect(context).toBeDefined()
      expect(context.user?.id).toBe('user-ctx')
      expect(context.user?.email).toBe('user-ctx@test.com')
      expect(context.user?.roles).toContain('admin')
      expect(context.user?.permissions).toContain('write')
      expect(context.userAgent).toBe('TestClient/1.0')

      // Simulate message activity
      await middleware.checkMessageRateLimit(context.connectionId, 'AGENT_STATUS_UPDATE')
      const updatedContext = middleware.getConnectionContext(context.connectionId)
      expect(updatedContext?.messageCount).toBe(1)

      // Close connection
      await middleware.handleConnectionClose(context.connectionId)
      expect(middleware.getActiveConnections().length).toBe(0)

      ws.close()
    })
  })
})

// Import vi for spy functions
define: { vi: typeof import('vitest')['vi'] }
