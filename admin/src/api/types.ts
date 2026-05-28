export interface User {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  phone: string
  role: string
  status: number
  online: boolean
  created_at: string
}

export interface Message {
  id: number
  conversation_id: number
  sender_id: number
  type: string
  content: string
  created_at: string
  sender?: User
}

export interface ConversationMember {
  id: number
  conversation_id: number
  user_id: number
  role: string
  user?: User
}

export interface Conversation {
  id: number
  type: string
  name: string
  owner_id: number
  created_at: string
  members?: ConversationMember[]
}

export interface Stats {
  users: number
  messages: number
  conversations: number
  groups: number
  online: number
}

export interface Paged<T> {
  list: T[]
  total: number
  page: number
  size: number
}
