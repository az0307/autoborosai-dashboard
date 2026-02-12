/**
 * WebSocket Authentication Handlers
 * Handles JWT token extraction and verification for WebSocket connections
 */

import { jwtVerify, type JWTPayload } from 'jose'
import {
  type WebSocketUpgradeRequest,
  type AuthenticatedUser,
  type AuthenticationResult,
  type ParsedToken,
  AUTHENTICATION_ERROR,
} from './websocket-security-types'

export interface JWTConfig {
  secret: Uint8Array
  algorithm: string
  issuer?: string
  audience?: string
}

export class WebSocketAuthHandler {
  private config: JWTConfig

  constructor(secret: string, algorithm = 'HS256') {
    this.config = {
      secret: new TextEncoder().encode(secret),
      algorithm,
    }
  }

  /**
   * Extract JWT token from WebSocket URL query parameters
   * Expected format: ws://host/path?token=<jwt_token>
   */
  extractTokenFromUrl(request: WebSocketUpgradeRequest): ParsedToken | null {
    const url = request.url
    if (!url) {
      return null
    }

    try {
      // Handle both relative and absolute URLs
      const urlString = url.startsWith('ws://') || url.startsWith('wss://')
        ? url
        : `ws://localhost${url}`
      
      const urlObj = new URL(urlString)
      const token = urlObj.searchParams.get('token')
      
      if (!token) {
        return null
      }

      return { token }
    } catch (error) {
      return null
    }
  }

  /**
   * Verify JWT token and extract user information
   */
  async verifyToken(token: string): Promise<AuthenticationResult> {
    try {
      const { payload } = await jwtVerify(token, this.config.secret, {
        algorithms: [this.config.algorithm],
      })

      const user = this.extractUserFromPayload(payload)
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid token payload: missing required fields',
          code: 401,
        }
      }

      return {
        success: true,
        user,
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'JWTExpired') {
          return {
            success: false,
            error: 'Token has expired',
            code: 401,
          }
        }
        if (error.name === 'JWTInvalid') {
          return {
            success: false,
            error: 'Invalid token signature',
            code: 401,
          }
        }
        return {
          success: false,
          error: `Token verification failed: ${error.message}`,
          code: 401,
        }
      }
      
      return {
        success: false,
        error: AUTHENTICATION_ERROR,
        code: 401,
      }
    }
  }

  /**
   * Authenticate WebSocket connection request
   * Extracts token from URL and verifies it BEFORE upgrade
   */
  async authenticate(request: WebSocketUpgradeRequest): Promise<AuthenticationResult> {
    const parsedToken = this.extractTokenFromUrl(request)
    
    if (!parsedToken) {
      return {
        success: false,
        error: 'Missing authentication token',
        code: 401,
      }
    }

    return this.verifyToken(parsedToken.token)
  }

  /**
   * Extract user information from JWT payload
   */
  private extractUserFromPayload(payload: JWTPayload): AuthenticatedUser | null {
    const requiredFields = ['sub', 'email']
    
    for (const field of requiredFields) {
      if (!(field in payload)) {
        return null
      }
    }

    return {
      id: payload.sub as string,
      email: payload.email as string,
      roles: (payload.roles as string[]) || [],
      permissions: (payload.permissions as string[]) || [],
      sessionId: (payload.sid as string) || crypto.randomUUID(),
    }
  }

  /**
   * Validate token format without verification
   * Quick check before expensive verification
   */
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    // Check if each part is valid base64url
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/
    return parts.every(part => base64UrlRegex.test(part) && part.length > 0)
  }

  /**
   * Create authentication error response
   */
  createAuthErrorResponse(error: string, code: number = 401): AuthenticationResult {
    return {
      success: false,
      error,
      code,
    }
  }
}

/**
 * Factory function to create authentication handler
 */
export function createWebSocketAuthHandler(
  secret: string,
  algorithm?: string
): WebSocketAuthHandler {
  if (!secret || secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long')
  }
  
  return new WebSocketAuthHandler(secret, algorithm)
}

/**
 * Helper to check if authentication is required for a path
 */
export function isAuthRequired(path: string): boolean {
  // Public paths that don't require authentication
  const publicPaths = ['/ws/health', '/ws/public']
  
  return !publicPaths.some(publicPath => path.startsWith(publicPath))
}
