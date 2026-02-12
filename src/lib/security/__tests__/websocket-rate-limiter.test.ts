/**
 * Unit Tests for WebSocket Rate Limiter
 * Tests connection-level and message-level rate limiting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WebSocketRateLimiter, createWebSocketRateLimiter } from '../websocket-rate-limiter'
import type { RedisClient } from '../websocket-rate-limiter'

describe('WebSocketRateLimiter (Memory Storage)', () => {
  let rateLimiter: WebSocketRateLimiter

  beforeEach(() => {
    rateLimiter = createWebSocketRateLimiter(
      {
        maxConnectionsPerUser: 2,
        maxConnectionsPerIp: 3,
        windowMs: 1000, // 1 second for testing
      },
      {
        TEST_MESSAGE: { windowMs: 1000, maxRequests: 5 },
      },
      { windowMs: 1000, maxRequests: 10 }
    )
  })

  afterEach(() => {
    rateLimiter.destroy()
  })

  describe('checkConnectionRateLimit', () => {
    it('should allow connection within limits', async () => {
      const result = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should track user-level connection limits', async () => {
      // First connection
      const result1 = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
      expect(result1.allowed).toBe(true)

      // Second connection (at limit)
      const result2 = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.2')
      expect(result2.allowed).toBe(true)

      // Third connection (should be blocked)
      const result3 = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.3')
      expect(result3.allowed).toBe(false)
      expect(result3.retryAfter).toBeDefined()
    })

    it('should track IP-level connection limits', async () => {
      // Different users from same IP
      const result1 = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
      expect(result1.allowed).toBe(true)

      const result2 = await rateLimiter.checkConnectionRateLimit('user2', '192.168.1.1')
      expect(result2.allowed).toBe(true)

      const result3 = await rateLimiter.checkConnectionRateLimit('user3', '192.168.1.1')
      expect(result3.allowed).toBe(true)

      // Fourth connection from same IP (should be blocked)
      const result4 = await rateLimiter.checkConnectionRateLimit('user4', '192.168.1.1')
      expect(result4.allowed).toBe(false)
    })

    it('should reset limits after window expires', async () => {
      // Use up the limit
      await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
      await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.2')
      
      const blocked = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.3')
      expect(blocked.allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should be allowed again
      const reset = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.4')
      expect(reset.allowed).toBe(true)
    })
  })

  describe('checkMessageRateLimit', () => {
    it('should allow messages within limits', async () => {
      const result = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      expect(result.allowed).toBe(true)
    })

    it('should block messages exceeding limit', async () => {
      // Send 5 messages (at limit)
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
        expect(result.allowed).toBe(true)
      }

      // 6th message should be blocked
      const blocked = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfter).toBeDefined()
    })

    it('should track different message types separately', async () => {
      // Send max TEST_MESSAGE
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      }

      // TEST_MESSAGE should be blocked
      const blocked = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      expect(blocked.allowed).toBe(false)

      // DEFAULT type should still be allowed (different limit)
      const allowed = await rateLimiter.checkMessageRateLimit('conn1', 'OTHER_MESSAGE')
      expect(allowed.allowed).toBe(true)
    })

    it('should track different connections separately', async () => {
      // Use up limit for conn1
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      }

      const blocked = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      expect(blocked.allowed).toBe(false)

      // conn2 should still be allowed
      const allowed = await rateLimiter.checkMessageRateLimit('conn2', 'TEST_MESSAGE')
      expect(allowed.allowed).toBe(true)
    })
  })

  describe('decrementConnectionCounter', () => {
    it('should decrement connection counters', async () => {
      // Add connections
      await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
      await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.2')
      
      const blocked = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.3')
      expect(blocked.allowed).toBe(false)

      // Decrement
      await rateLimiter.decrementConnectionCounter('user1', '192.168.1.1')

      // Should be allowed now
      const allowed = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.3')
      expect(allowed.allowed).toBe(true)
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for a key', async () => {
      // Use up limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      }

      const blocked = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      expect(blocked.allowed).toBe(false)

      // Reset
      await rateLimiter.resetRateLimit('ws:msg:conn1:TEST_MESSAGE')

      // Should be allowed
      const allowed = await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      expect(allowed.allowed).toBe(true)
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', async () => {
      await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')
      await rateLimiter.checkMessageRateLimit('conn1', 'TEST_MESSAGE')

      const status = await rateLimiter.getRateLimitStatus('ws:msg:conn1:TEST_MESSAGE')
      expect(status).not.toBeNull()
      expect(status?.count).toBe(2)
    })

    it('should return null for non-existent key', async () => {
      const status = await rateLimiter.getRateLimitStatus('ws:msg:nonexistent:TYPE')
      expect(status).toBeNull()
    })
  })
})

describe('WebSocketRateLimiter (Redis Storage)', () => {
  const mockRedis: RedisClient = {
    storage: new Map<string, { value: string; px?: number }>(),
    
    async get(key: string): Promise<string | null> {
      const item = this.storage.get(key)
      if (!item) return null
      return item.value
    },
    
    async set(key: string, value: string, options?: { px?: number }): Promise<void> {
      this.storage.set(key, { value, px: options?.px })
    },
    
    async incr(key: string): Promise<number> {
      const current = parseInt(this.storage.get(key)?.value || '0', 10)
      const next = current + 1
      this.storage.set(key, { value: String(next) })
      return next
    },
    
    async expire(): Promise<void> {
      // Mock implementation
    },
    
    async del(key: string): Promise<void> {
      this.storage.delete(key)
    },
  }

  let rateLimiter: WebSocketRateLimiter

  beforeEach(() => {
    mockRedis.storage.clear()
    rateLimiter = createWebSocketRateLimiter(
      {
        maxConnectionsPerUser: 2,
        maxConnectionsPerIp: 3,
        windowMs: 1000,
      },
      {
        TEST_MESSAGE: { windowMs: 1000, maxRequests: 5 },
      },
      { windowMs: 1000, maxRequests: 10 },
      mockRedis
    )
  })

  afterEach(() => {
    rateLimiter.destroy()
  })

  it('should use Redis for rate limiting', async () => {
    const result = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
    expect(result.allowed).toBe(true)
    
    // Check Redis was used
    const keys = Array.from(mockRedis.storage.keys())
    expect(keys.length).toBeGreaterThan(0)
  })

  it('should enforce limits with Redis', async () => {
    // Use up the limit
    await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.1')
    await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.2')
    
    const blocked = await rateLimiter.checkConnectionRateLimit('user1', '192.168.1.3')
    expect(blocked.allowed).toBe(false)
  })
})

describe('createWebSocketRateLimiter', () => {
  it('should create rate limiter with default config', () => {
    const limiter = createWebSocketRateLimiter()
    expect(limiter).toBeInstanceOf(WebSocketRateLimiter)
  })

  it('should merge custom config with defaults', () => {
    const limiter = createWebSocketRateLimiter(
      { maxConnectionsPerUser: 10 },
      { CUSTOM_TYPE: { windowMs: 5000, maxRequests: 50 } }
    )
    expect(limiter).toBeInstanceOf(WebSocketRateLimiter)
  })
})
