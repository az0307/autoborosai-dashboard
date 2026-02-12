/**
 * Enhanced WebSocket Hook with Authentication Support
 * Updated to include JWT token in WebSocket URL for security
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { UseWebSocketOptions } from '@/hooks/use-websocket-options'
import { parseJWT, isJWTExpired } from '@/lib/utils'

export interface UseSecureWebSocketOptions extends UseWebSocketOptions {
  /** JWT token for authentication (will be sent in URL query parameter) */
  token?: string
  /** Enable automatic token refresh before expiration */
  autoRefreshToken?: boolean
  /** Callback when token refresh is needed */
  onTokenRefresh?: () => Promise<string>
}

export interface SecureWebSocketState {
  isConnected: boolean
  lastMessage: any
  isAuthenticated: boolean
  authError?: string
  connectionAttempts: number
}

export function useSecureWebSocket({
  url,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnect = true,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  autoRefreshToken = false,
  onTokenRefresh,
}: UseSecureWebSocketOptions) {
  const [state, setState] = useState<SecureWebSocketState>({
    isConnected: false,
    lastMessage: null,
    isAuthenticated: false,
    connectionAttempts: 0,
  })
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentTokenRef = useRef(token)

  // Build authenticated WebSocket URL
  const buildAuthenticatedUrl = useCallback((baseUrl: string, authToken?: string): string => {
    if (!authToken) {
      return baseUrl
    }

    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}token=${encodeURIComponent(authToken)}`
  }, [])

  // Validate token before connection
  const validateToken = useCallback((authToken?: string): { valid: boolean; error?: string } => {
    if (!authToken) {
      return { valid: false, error: 'No authentication token provided' }
    }

    if (isJWTExpired(authToken)) {
      return { valid: false, error: 'Authentication token has expired' }
    }

    const decoded = parseJWT(authToken)
    if (!decoded) {
      return { valid: false, error: 'Invalid token format' }
    }

    return { valid: true }
  }, [])

  const connect = useCallback(async () => {
    try {
      // Validate token before connecting
      if (token) {
        const validation = validateToken(token)
        if (!validation.valid) {
          setState(prev => ({
            ...prev,
            isAuthenticated: false,
            authError: validation.error,
          }))
          onError?.(new Error(validation.error) as unknown as Event)
          return
        }
      }

      const authenticatedUrl = buildAuthenticatedUrl(url, currentTokenRef.current)
      const ws = new WebSocket(authenticatedUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[Secure WebSocket] Connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isAuthenticated: true,
          authError: undefined,
          connectionAttempts: 0,
        }))
        reconnectCountRef.current = 0
        onConnect?.()

        // Setup token refresh if enabled
        if (autoRefreshToken && onTokenRefresh && currentTokenRef.current) {
          const decoded = parseJWT(currentTokenRef.current)
          if (decoded?.exp) {
            const expiresIn = decoded.exp * 1000 - Date.now()
            const refreshTime = Math.max(expiresIn - 60000, 0) // Refresh 1 minute before expiry
            
            tokenRefreshIntervalRef.current = setTimeout(async () => {
              try {
                const newToken = await onTokenRefresh()
                currentTokenRef.current = newToken
              } catch (error) {
                console.error('[Secure WebSocket] Token refresh failed:', error)
              }
            }, refreshTime)
          }
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[Secure WebSocket] Message received:', data)
          setState(prev => ({ ...prev, lastMessage: data }))
          onMessage?.(data)
        } catch (error) {
          console.error('[Secure WebSocket] Failed to parse message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('[Secure WebSocket] Disconnected:', event.code, event.reason)
        setState(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false,
        }))
        onDisconnect?.()
        
        // Clear token refresh timer
        if (tokenRefreshIntervalRef.current) {
          clearTimeout(tokenRefreshIntervalRef.current)
          tokenRefreshIntervalRef.current = null
        }
        
        // Handle specific close codes
        if (event.code === 1008) { // Policy violation (e.g., CSWSH)
          setState(prev => ({
            ...prev,
            authError: 'Connection rejected: origin not allowed',
          }))
        } else if (event.code === 1006) { // Abnormal closure
          // Check if it was authentication related
          setState(prev => ({
            ...prev,
            authError: 'Connection failed: authentication required',
          }))
        }
        
        if (event.code !== 1000 && reconnect) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('[Secure WebSocket] Error:', error)
        setState(prev => ({
          ...prev,
          isConnected: false,
        }))
        onError?.(error)
      }

    } catch (error) {
      console.error('[Secure WebSocket] Connection error:', error)
      setState(prev => ({
        ...prev,
        isConnected: false,
        authError: 'Connection error occurred',
      }))
      if (reconnect) {
        scheduleReconnect()
      }
    }
  }, [url, token, onMessage, onConnect, onDisconnect, onError, reconnect, autoRefreshToken, onTokenRefresh, validateToken, buildAuthenticatedUrl])

  const scheduleReconnect = useCallback(() => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      console.error('[Secure WebSocket] Max reconnection attempts reached')
      setState(prev => ({
        ...prev,
        authError: 'Max reconnection attempts reached',
      }))
      return
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectCountRef.current),
      30000
    )

    console.log(`[Secure WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current + 1}/${reconnectAttempts})`)
    
    setState(prev => ({
      ...prev,
      connectionAttempts: reconnectCountRef.current + 1,
    }))

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCountRef.current++
      connect()
    }, delay)
  }, [connect, reconnectAttempts])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        console.log('[Secure WebSocket] Message sent:', message)
      } catch (error) {
        console.error('[Secure WebSocket] Failed to send message:', error)
      }
    } else {
      console.warn('[Secure WebSocket] Not ready to send messages')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearTimeout(tokenRefreshIntervalRef.current)
      tokenRefreshIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
    }
  }, [])

  const updateToken = useCallback((newToken: string) => {
    currentTokenRef.current = newToken
    
    // If connected, we may need to reconnect with new token
    // depending on the server implementation
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Secure WebSocket] Token updated, consider reconnecting if required')
    }
  }, [])

  useEffect(() => {
    currentTokenRef.current = token
  }, [token])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    ...state,
    sendMessage,
    disconnect,
    reconnect: connect,
    updateToken,
  }
}
