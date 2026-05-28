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
}

export interface Friendship {
  id: number
  user_id: number
  friend_id: number
  remark: string
  status: number
  friend?: User
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

export interface Conversation {
  id: number
  type: string
  name: string
  avatar: string
  owner_id: number
  created_at: string
  updated_at: string
  last_message?: Message
  unread: number
  peer?: User
}
