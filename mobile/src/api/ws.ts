import { WS_BASE_URL } from '../config'

export interface WsEvent {
  type: string
  data: any
}

type Listener = (event: WsEvent) => void

// ChatSocket manages a single resilient WebSocket connection to the backend.
class ChatSocket {
  private ws: WebSocket | null = null
  private token = ''
  private listeners = new Set<Listener>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = false

  connect(token: string) {
    this.token = token
    this.shouldReconnect = true
    this.open()
  }

  private open() {
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
    }
    const url = `${WS_BASE_URL}/api/ws?token=${encodeURIComponent(this.token)}`
    const socket = new WebSocket(url)
    this.ws = socket

    socket.onmessage = (e) => {
      try {
        const event: WsEvent = JSON.parse(e.data as string)
        this.listeners.forEach((l) => l(event))
      } catch {
        // ignore malformed frames
      }
    }
    socket.onclose = () => {
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }
    socket.onerror = () => {
      socket.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, 3000)
  }

  send(type: string, data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    }
  }

  sendMessage(conversationId: number, content: string, type = 'text') {
    this.send('send', { conversation_id: conversationId, type, content })
  }

  markRead(conversationId: number, lastMessageId: number) {
    this.send('read', { conversation_id: conversationId, last_message_id: lastMessageId })
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const chatSocket = new ChatSocket()
