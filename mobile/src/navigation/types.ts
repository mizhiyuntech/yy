import type { Conversation } from '../api/types'

export type RootStackParamList = {
  Main: undefined
  Chat: { conversation: Conversation; title: string }
  AddContact: undefined
  NewGroup: undefined
}

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}
