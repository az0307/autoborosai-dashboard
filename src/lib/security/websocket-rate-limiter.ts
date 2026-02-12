/**
 * WebSocket Rate Limiter
 * Implements connection-level and message-level rate limiting using Redis
 */

import {
  type RateLimitConfig,
  type ConnectionRateLimitConfig,
  type MessageRateLimits,
  type RateLimitResult,
  type RateLimitState,
  type WebSocketMessageType,
  DEFAULT_CONNECTION_RATE_LIMIT,
  DEFAULT_MESSAGE_RATE_LIMITS,
  DEFAULT_RATE_LIMIT,
} from './websocket-security-types'

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { px?: number }): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  del(key: string): Promise<void>
}

export interface MemoryStorage {
  [key: string]: RateLimitState
}

export class WebSocketRateLimiter {
  private redis?: RedisClient
  private memoryStorage: MemoryStorage = {}
  private connectionConfig: ConnectionRateLimitConfig
  private messageLimits: MessageRateLimits
  private defaultLimit: RateLimitConfig
  private cleanupInterval?: NodeJS.Timeout

  constructor(
    connectionConfig: Partial<ConnectionRateLimitConfig> = {},
    messageLimits: Partial<MessageRateLimits> = {},
    defaultLimit: Partial<RateLimitConfig> = {},
    redis?: RedisClient
  ) {
    this.connectionConfig = { ...DEFAULT_CONNECTION_RATE_LIMIT, ...connectionConfig }
    this.messageLimits = { ...DEFAULT_MESSAGE_RATE_LIMITS, ...messageLimits }
    this.defaultLimit = { ...DEFAULT_RATE_LIMIT, ...defaultLimit }
    this.redis = redis

    // Start cleanup interval for memory storage
    if (!redis) {
      this.cleanupInterval = setInterval(() => this.cleanupMemoryStorage(), 60000)
    }
  }

  /**
   * Generate rate limit key for connection-level limiting
   */
  private getConnectionKey(type: 'user' | 'ip', identifier: string): string {
    return `ws:conn:${type}:${identifier}`
  }

  /**
   * Generate rate limit key for message-level limiting
   */
  private getMessageKey(connectionId: string, messageType: WebSocketMessageType): string {
    return `ws:msg:${connectionId}:${messageType}`
  }

  /**
   * Check connection rate limit for a user and IP
   * Returns true if connection is allowed
   */
  async checkConnectionRateLimit(
    userId: string,
    ip: string
  ): Promise<RateLimitResult> {
    const userKey = this.getConnectionKey('user', userId)
    const ipKey = this.getConnectionKey('ip', ip)

    // Check user-level limit
    const userResult = await this.checkRateLimit(
      userKey,
      this.connectionConfig.maxConnectionsPerUser,
      this.connectionConfig.windowMs
    )

    if (!userResult.allowed) {
      return {
        ...userResult,
        retryAfter: Math.ceil((userResult.resetTime - Date.now()) / 1000),
      }
    }

    // Check IP-level limit
    const ipResult = await this.checkRateLimit(
      ipKey,
      this.connectionConfig.maxConnectionsPerIp,
      this.connectionConfig.windowMs
    )

    if (!ipResult.allowed) {
      return {
        ...ipResult,
        retryAfter: Math.ceil((ipResult.resetTime - Date.now()) / 1000),
      }
    }

    // Increment counters
    await this.incrementCounter(userKey, this.connectionConfig.windowMs)
    await this.incrementCounter(ipKey, this.connectionConfig.windowMs)

    return {
      allowed: true,
      remaining: Math.min(userResult.remaining, ipResult.remaining) - 1,
      resetTime: Math.max(userResult.resetTime, ipResult.resetTime),
    }
  }

  /**
   * Check message rate limit for a connection
   */
  async checkMessageRateLimit(
    connectionId: string,
    messageType: WebSocketMessageType
  ): Promise<RateLimitResult> {
    const key = this.getMessageKey(connectionId, messageType)
    const limitConfig = this.messageLimits[messageType] || this.defaultLimit

    const result = await this.checkRateLimit(
      key,
      limitConfig.maxRequests,
      limitConfig.windowMs
    )

    if (!result.allowed) {
      return {
        ...result,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }
    }

    // Increment counter
    await this.incrementCounter(key, limitConfig.windowMs)

    return {
      allowed: true,
      remaining: result.remaining - 1,
      resetTime: result.resetTime,
    }
  }

  /**
   * Check rate limit for a specific key
   */
  private async checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const resetTime = now + windowMs

    if (this.redis) {
      return this.checkRedisRateLimit(key, maxRequests, windowMs, now, resetTime)
    } else {
      return this.checkMemoryRateLimit(key, maxRequests, windowMs, now, resetTime)
    }
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRedisRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    now: number,
    resetTime: number
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error('Redis client not initialized')
    }

    const value = await this.redis.get(key)
    
    if (!value) {
      return {
        allowed: true,
        remaining: maxRequests,
        resetTime,
      }
    }

    const state: RateLimitState = JSON.parse(value)
    
    if (now > state.resetTime) {
      // Window has expired, reset counter
      return {
        allowed: true,
        remaining: maxRequests,
        resetTime,
      }
    }

    if (state.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: state.resetTime,
      }
    }

    return {
      allowed: true,
      remaining: maxRequests - state.count,
      resetTime: state.resetTime,
    }
  }

  /**
   * Check rate limit using in-memory storage
   */
  private checkMemoryRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    now: number,
    resetTime: number
  ): RateLimitResult {
    const state = this.memoryStorage[key]
    
    if (!state || now > state.resetTime) {
      return {
        allowed: true,
        remaining: maxRequests,
        resetTime,
      }
    }

    if (state.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: state.resetTime,
      }
    }

    return {
      allowed: true,
      remaining: maxRequests - state.count,
      resetTime: state.resetTime,
    }
  }

  /**
   * Increment rate limit counter
   */
  private async incrementCounter(key: string, windowMs: number): Promise<void> {
    const now = Date.now()
    const resetTime = now + windowMs

    if (this.redis) {
      await this.incrementRedisCounter(key, windowMs, resetTime)
    } else {
      this.incrementMemoryCounter(key, resetTime)
    }
  }

  /**
   * Increment counter in Redis
   */
  private async incrementRedisCounter(
    key: string,
    windowMs: number,
    resetTime: number
  ): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis client not initialized')
    }

    const value = await this.redis.get(key)
    
    if (!value) {
      const state: RateLimitState = { count: 1, resetTime }
      await this.redis.set(key, JSON.stringify(state), { px: windowMs })
    } else {
      const state: RateLimitState = JSON.parse(value)
      state.count += 1
      await this.redis.set(key, JSON.stringify(state), { px: windowMs })
    }
  }

  /**
   * Increment counter in memory
   */
  private incrementMemoryCounter(key: string, resetTime: number): void {
    if (!this.memoryStorage[key] || Date.now() > this.memoryStorage[key].resetTime) {
      this.memoryStorage[key] = { count: 1, resetTime }
    } else {
      this.memoryStorage[key].count += 1
    }
  }

  /**
   * Decrement connection counter when connection closes
   */
  async decrementConnectionCounter(userId: string, ip: string): Promise<void> {
    const userKey = this.getConnectionKey('user', userId)
    const ipKey = this.getConnectionKey('ip', ip)

    if (this.redis) {
      // In Redis, we just let it expire naturally
      // Or we could implement a more sophisticated counter
    } else {
      // In memory, decrement counters
      if (this.memoryStorage[userKey] && this.memoryStorage[userKey].count > 0) {
        this.memoryStorage[userKey].count -= 1
      }
      if (this.memoryStorage[ipKey] && this.memoryStorage[ipKey].count > 0) {
        this.memoryStorage[ipKey].count -= 1
      }
    }
  }

  /**
   * Clean up expired entries from memory storage
   */
  private cleanupMemoryStorage(): void {
    const now = Date.now()
    for (const key in this.memoryStorage) {
      if (this.memoryStorage[key].resetTime <= now) {
        delete this.memoryStorage[key]
      }
    }
  }

  /**
   * Reset rate limit for a specific key (useful for testing)
   */
  async resetRateLimit(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key)
    } else {
      delete this.memoryStorage[key]
    }
  }

  /**
   * Get current rate limit status for a key
   */
  async getRateLimitStatus(key: string): Promise<RateLimitState | null> {
    if (this.redis) {
      if (!this.redis) return null
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } else {
      const state = this.memoryStorage[key]
      if (state && Date.now() <= state.resetTime) {
        return state
      }
      return null
    }
  }

  /**
   * Destroy the rate limiter and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.memoryStorage = {}
  }
}

/**
 * Factory function to create rate limiter
 */
export function createWebSocketRateLimiter(
  connectionConfig?: Partial<ConnectionRateLimitConfig>,
  messageLimits?: Partial<MessageRateLimits>,
  defaultLimit?: Partial<RateLimitConfig>,
  redis?: RedisClient
): WebSocketRateLimiter {
  return new WebSocketRateLimiter(
    connectionConfig,
    messageLimits,
    defaultLimit,
    redis
  )
}
