import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../api/client'
import { chatSocket } from '../api/ws'
import { TOKEN_KEY } from '../config'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, nickname: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({} as AuthState)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const bootstrap = async () => {
    const token = await AsyncStorage.getItem(TOKEN_KEY)
    if (token) {
      try {
        const resp = await api.get('/me')
        setUser(resp.data.data)
        chatSocket.connect(token)
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    bootstrap()
    return () => chatSocket.disconnect()
  }, [])

  const persistSession = async (token: string, u: User) => {
    await AsyncStorage.setItem(TOKEN_KEY, token)
    setUser(u)
    chatSocket.connect(token)
  }

  const login = async (username: string, password: string) => {
    const resp = await api.post('/auth/login', { username, password })
    await persistSession(resp.data.data.token, resp.data.data.user)
  }

  const register = async (username: string, password: string, nickname: string) => {
    const resp = await api.post('/auth/register', { username, password, nickname })
    await persistSession(resp.data.data.token, resp.data.data.user)
  }

  const logout = async () => {
    chatSocket.disconnect()
    await AsyncStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
