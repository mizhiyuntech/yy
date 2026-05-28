import React, { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import api from '../api/client'
import { chatSocket } from '../api/ws'
import { useAuth } from '../context/AuthContext'
import type { Message } from '../api/types'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

export default function ChatScreen({ route }: Props) {
  const { conversation } = route.params
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const listRef = useRef<FlatList<Message>>(null)

  const load = async () => {
    const resp = await api.get(`/conversations/${conversation.id}/messages`, { params: { limit: 50 } })
    const list: Message[] = resp.data.data || []
    setMessages(list)
    const lastId = list.length ? list[list.length - 1].id : 0
    if (lastId) {
      chatSocket.markRead(conversation.id, lastId)
    }
  }

  useEffect(() => {
    load()
    const unsub = chatSocket.subscribe((event) => {
      if (event.type === 'message' && event.data.conversation_id === conversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev
          return [...prev, event.data]
        })
        chatSocket.markRead(conversation.id, event.data.id)
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id])

  const send = () => {
    const content = text.trim()
    if (!content) return
    chatSocket.sendMessage(conversation.id, content)
    setText('')
  }

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.sender_id === user?.id
    return (
      <View style={[styles.msgRow, mine ? styles.rowMine : styles.rowOther]}>
        {!mine && <Text style={styles.sender}>{item.sender?.nickname || item.sender?.username}</Text>}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={mine ? styles.textMine : styles.textOther}>{item.content}</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="输入消息..."
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  msgRow: { marginBottom: 12, maxWidth: '80%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { fontSize: 12, color: '#999', marginBottom: 2 },
  bubble: { padding: 10, borderRadius: 8 },
  bubbleMine: { backgroundColor: '#1677ff' },
  bubbleOther: { backgroundColor: '#fff' },
  textMine: { color: '#fff', fontSize: 15 },
  textOther: { color: '#333', fontSize: 15 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    fontSize: 15,
  },
  sendBtn: { backgroundColor: '#1677ff', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginLeft: 8 },
  sendText: { color: '#fff', fontSize: 15 },
})
