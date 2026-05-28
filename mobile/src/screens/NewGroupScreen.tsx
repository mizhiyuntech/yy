import React, { useCallback, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Button, Toast } from '@ant-design/react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import api from '../api/client'
import type { Conversation, Friendship } from '../api/types'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function NewGroupScreen() {
  const navigation = useNavigation<Nav>()
  const [name, setName] = useState('')
  const [contacts, setContacts] = useState<Friendship[]>([])
  const [selected, setSelected] = useState<number[]>([])

  const load = useCallback(async () => {
    const resp = await api.get('/contacts')
    setContacts(resp.data.data || [])
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const create = async () => {
    if (!name.trim()) {
      Toast.info('请输入群名称')
      return
    }
    if (selected.length === 0) {
      Toast.info('请至少选择一位成员')
      return
    }
    try {
      const resp = await api.post('/conversations/group', { name: name.trim(), member_ids: selected })
      const conv: Conversation = resp.data.data
      navigation.replace('Chat', { conversation: conv, title: conv.name })
    } catch {
      Toast.fail('创建失败')
    }
  }

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="群名称" value={name} onChangeText={setName} />
      <Text style={styles.label}>选择成员</Text>
      <FlatList
        data={contacts}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => {
          const checked = selected.includes(item.friend_id)
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item.friend_id)}>
              <Text>{item.friend?.nickname || item.friend?.username}</Text>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && <Text style={styles.check}>✓</Text>}
              </View>
            </TouchableOpacity>
          )
        }}
      />
      <Button type="primary" onPress={create} style={{ margin: 12 }}>
        创建群聊
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  input: { height: 48, borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16, fontSize: 16 },
  label: { padding: 12, color: '#999' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: '#1677ff', borderColor: '#1677ff' },
  check: { color: '#fff', fontSize: 14 },
})
