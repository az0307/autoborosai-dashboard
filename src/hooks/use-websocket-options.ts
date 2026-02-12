export type UseWebSocketOptions = {
  url: string
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnect?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
}