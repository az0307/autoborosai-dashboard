/**
 * WebSocket Security Hardening - Integration Examples
 * 
 * This file demonstrates how to integrate the WebSocket security middleware
 * into various server environments.
 */

import {
  createWebSocketSecurityMiddleware,
  createWebSocketSecurityExpressMiddleware,
  WebSocketSecurityMiddleware,
  ALLOWED_ORIGINS,
} from '@/lib/security'

// ============================================================================
// Example 1: Express.js with ws library
// ============================================================================

import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import express from 'express'

export function createSecureWebSocketServerExpress() {
  const app = express()
  const server = createServer(app)

  // Create security middleware
  const securityMiddleware = createWebSocketSecurityMiddleware({
    jwtSecret: process.env.JWT_SECRET || 'your-32-char-secret-key-here!!!',
    allowedOrigins: ALLOWED_ORIGINS,
    enableLogging: true,
  })

  // Create WebSocket server with security verification
  const wss = new WebSocketServer({ 
    noServer: true,
    verifyClient: async (info, cb) => {
      const result = await securityMiddleware.performSecurityCheck(info.req as any)
      
      if (result.allowed) {
        // Attach user context to request for later use
        ;(info.req as any).user = result.result?.user
        ;(info.req as any).connectionId = securityMiddleware
          .getActiveConnections()[0]?.connectionId
        cb(true)
      } else {
        cb(false, result.code || 403, result.error)
      }
    },
  })

  // Handle WebSocket upgrade
  server.on('upgrade', async (request, socket, head) => {
    // Security check is already done in verifyClient
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  // Handle connections
  wss.on('connection', (ws, request: any) => {
    const user = request.user
    const connectionId = request.connectionId

    console.log(`User ${user?.email} connected (ID: ${connectionId})`)

    // Handle messages with rate limiting
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        
        // Check message rate limit
        const rateLimitResult = await securityMiddleware.checkMessageRateLimit(
          connectionId,
          message.type
        )

        if (!rateLimitResult.allowed) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 429,
            message: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter,
          }))
          return
        }

        // Process the message
        handleMessage(ws, message, user)
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }))
      }
    })

    // Handle close
    ws.on('close', async () => {
      await securityMiddleware.handleConnectionClose(connectionId)
      console.log(`User ${user?.email} disconnected`)
    })
  })

  return { server, wss, securityMiddleware }
}

// ============================================================================
// Example 2: Fastify with @fastify/websocket
// ============================================================================

import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'

export async function createSecureWebSocketServerFastify() {
  const app = Fastify({ logger: true })

  const securityMiddleware = createWebSocketSecurityMiddleware({
    jwtSecret: process.env.JWT_SECRET || 'your-32-char-secret-key-here!!!',
    allowedOrigins: ALLOWED_ORIGINS,
    enableLogging: true,
  })

  await app.register(fastifyWebsocket)

  app.get('/ws', { websocket: true }, async (connection, req) => {
    // Perform security check
    const result = await securityMiddleware.performSecurityCheck(req as any)

    if (!result.allowed) {
      connection.socket.close(result.code || 403, result.error)
      return
    }

    const user = result.result?.user
    const connectionId = securityMiddleware.getActiveConnections()[0]?.connectionId

    console.log(`User ${user?.email} connected via Fastify`)

    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString())
        
        const rateLimitResult = await securityMiddleware.checkMessageRateLimit(
          connectionId,
          data.type
        )

        if (!rateLimitResult.allowed) {
          connection.socket.send(JSON.stringify({
            type: 'error',
            code: 429,
            message: 'Rate limit exceeded',
          }))
          return
        }

        handleMessage(connection.socket as any, data, user)
      } catch (error) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }))
      }
    })

    connection.socket.on('close', async () => {
      await securityMiddleware.handleConnectionClose(connectionId)
    })
  })

  return { app, securityMiddleware }
}

// ============================================================================
// Example 3: Next.js API Route (Serverless)
// ============================================================================

import { NextApiRequest } from 'next'
import { WebSocketServer } from 'ws'

// Global instance for serverless environment
let wss: WebSocketServer | null = null
let securityMiddleware: WebSocketSecurityMiddleware | null = null

export function getSecureWebSocketServerNextJs() {
  if (!wss) {
    securityMiddleware = createWebSocketSecurityMiddleware({
      jwtSecret: process.env.JWT_SECRET!,
      allowedOrigins: ALLOWED_ORIGINS,
      enableLogging: process.env.NODE_ENV === 'production',
    })

    wss = new WebSocketServer({
      noServer: true,
      verifyClient: async (info, cb) => {
        const result = await securityMiddleware!.performSecurityCheck(info.req as any)
        if (result.allowed) {
          ;(info.req as any).user = result.result?.user
          cb(true)
        } else {
          cb(false, result.code || 403, result.error)
        }
      },
    })

    wss.on('connection', (ws, request: any) => {
      const user = request.user
      const connectionId = securityMiddleware!.getActiveConnections()[0]?.connectionId

      ws.on('message', async (data) => {
        const message = JSON.parse(data.toString())
        
        const rateLimitResult = await securityMiddleware!.checkMessageRateLimit(
          connectionId,
          message.type
        )

        if (!rateLimitResult.allowed) {
          ws.send(JSON.stringify({ error: 'Rate limit exceeded', code: 429 }))
          return
        }

        handleMessage(ws, message, user)
      })

      ws.on('close', async () => {
        await securityMiddleware!.handleConnectionClose(connectionId)
      })
    })
  }

  return { wss, securityMiddleware }
}

// ============================================================================
// Example 4: Socket.io Integration
// ============================================================================

import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'

export function createSecureSocketIOServer(httpServer: HttpServer) {
  const securityMiddleware = createWebSocketSecurityMiddleware({
    jwtSecret: process.env.JWT_SECRET!,
    allowedOrigins: ALLOWED_ORIGINS,
    enableLogging: true,
  })

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
    allowRequest: async (req, callback) => {
      const result = await securityMiddleware.performSecurityCheck(req as any)
      
      if (result.allowed) {
        ;(req as any).user = result.result?.user
        callback(null, true)
      } else {
        callback(new Error(result.error || 'Forbidden'), false)
      }
    },
  })

  io.use(async (socket, next) => {
    const req = socket.request as any
    const user = req.user
    const connectionId = securityMiddleware.getActiveConnections()[0]?.connectionId

    if (!user) {
      return next(new Error('Authentication required'))
    }

    // Attach to socket for later use
    socket.data.user = user
    socket.data.connectionId = connectionId

    // Setup rate limiting for Socket.io events
    socket.use(async ([event, ...args], next) => {
      const rateLimitResult = await securityMiddleware.checkMessageRateLimit(
        connectionId,
        event
      )

      if (!rateLimitResult.allowed) {
        socket.emit('error', {
          code: 429,
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        })
        return
      }

      next()
    })

    socket.on('disconnect', async () => {
      await securityMiddleware.handleConnectionClose(connectionId)
    })

    next()
  })

  return { io, securityMiddleware }
}

// ============================================================================
// Helper Functions
// ============================================================================

function handleMessage(
  ws: WebSocket,
  message: any,
  user: any
) {
  // Your business logic here
  console.log(`Message from ${user?.email}:`, message)
  
  // Echo back for testing
  ws.send(JSON.stringify({
    type: 'echo',
    data: message,
    timestamp: new Date().toISOString(),
  }))
}

// ============================================================================
// Usage with Redis for Distributed Rate Limiting
// ============================================================================

import { createClient } from 'redis'

export async function createSecureWebSocketServerWithRedis() {
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  })

  await redisClient.connect()

  // Wrap Redis client to match our interface
  const redisAdapter = {
    async get(key: string) {
      return redisClient.get(key)
    },
    async set(key: string, value: string, options?: { px?: number }) {
      if (options?.px) {
        await redisClient.set(key, value, { PX: options.px })
      } else {
        await redisClient.set(key, value)
      }
    },
    async incr(key: string) {
      return redisClient.incr(key)
    },
    async expire(key: string, seconds: number) {
      await redisClient.expire(key, seconds)
    },
    async del(key: string) {
      await redisClient.del(key)
    },
  }

  const securityMiddleware = createWebSocketSecurityMiddleware(
    {
      jwtSecret: process.env.JWT_SECRET!,
      allowedOrigins: ALLOWED_ORIGINS,
      enableLogging: true,
    },
    redisAdapter
  )

  // ... rest of server setup

  return { securityMiddleware, redisClient }
}
