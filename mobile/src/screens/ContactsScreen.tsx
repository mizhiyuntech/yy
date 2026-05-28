import React, { useCallback, useState } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Button, Toast } from '@ant-design/react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import api from '../api/client'
import type { Conversation, Friendship } from '../api/types'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function ContactsScreen() {
  const navigation = useNavigation<Nav>()
  const [contacts, setContacts] = useState<Friendship[]>([])

  const load = useCallback(async () => {
    const resp = await api.get('/contacts')
    setContacts(resp.data.data || [])
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const openChat = async (f: Friendship) => {
    try {
      const resp = await api.post('/conversations/private', { peer_id: f.friend_id })
      const conv: Conversation = resp.data.data
      conv.peer = f.friend
      navigation.navigate('Chat', {
        conversation: conv,
        title: f.friend?.nickname || f.friend?.username || '聊天',
      })
    } catch {
      Toast.fail('无法打开会话')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button type="primary" size="small" onPress={() => navigation.navigate('AddContact')}>
          添加好友
        </Button>
        <Button size="small" style={{ marginLeft: 8 }} onPress={() => navigation.navigate('NewGroup')}>
          发起群聊
        </Button>
      </View>
      <FlatList
        data={contacts}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openChat(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.friend?.nickname || item.friend?.username || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{item.remark || item.friend?.nickname || item.friend?.username}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>还没有好友，点击上方添加</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#36cfc9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  name: { marginLeft: 12, fontSize: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
})
