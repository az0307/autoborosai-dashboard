'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { UseWebSocketOptions } from '@/hooks/use-websocket-options'

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnect = true,
  reconnectAttempts = 5,
  reconnectInterval = 3000
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectCountRef.current = 0
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message:', data)
          setLastMessage(data)
          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        onDisconnect?.()
        
        if (event.code !== 1000 && reconnect) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        onError?.(error)
      }

    } catch (error) {
      console.error('WebSocket connection error:', error)
      if (reconnect) {
        scheduleReconnect()
      }
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnect])

  const scheduleReconnect = useCallback(() => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(
      1000 * Math.pow(2, reconnectCountRef.current),
      30000
    )

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCountRef.current++
      connect()
    }, delay)
  }, [connect, reconnectAttempts])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        console.log('WebSocket message sent:', message)
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
      }
    } else {
      console.warn('WebSocket is not ready to send messages')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}