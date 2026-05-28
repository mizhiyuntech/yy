import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import api from '../api/client'
import { chatSocket } from '../api/ws'
import type { Conversation } from '../api/types'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

function title(conv: Conversation): string {
  if (conv.type === 'group') return conv.name || `群聊 ${conv.id}`
  return conv.peer?.nickname || conv.peer?.username || '聊天'
}

export default function ConversationsScreen() {
  const navigation = useNavigation<Nav>()
  const [data, setData] = useState<Conversation[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const resp = await api.get('/conversations')
      const list: Conversation[] = resp.data.data || []
      list.sort((a, b) => (b.last_message?.id || 0) - (a.last_message?.id || 0))
      setData(list)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  useEffect(() => {
    const unsub = chatSocket.subscribe((event) => {
      if (event.type === 'message') {
        load()
      }
    })
    return unsub
  }, [load])

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('Chat', { conversation: item, title: title(item) })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{title(item).slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{title(item)}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {item.last_message?.content || '暂无消息'}
        </Text>
      </View>
      {item.unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => String(i.id)}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={<Text style={styles.empty}>暂无会话，去通讯录发起聊天吧</Text>}
    />
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1677ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  body: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '500' },
  preview: { color: '#999', marginTop: 4 },
  badge: { backgroundColor: '#ff4d4f', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
})
