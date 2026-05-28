import React, { useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Button, Toast } from '@ant-design/react-native'
import api from '../api/client'
import type { User } from '../api/types'

export default function AddContactScreen() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<User[]>([])

  const search = async () => {
    if (!keyword.trim()) return
    const resp = await api.get('/users/search', { params: { keyword: keyword.trim() } })
    setResults(resp.data.data || [])
  }

  const add = async (u: User) => {
    try {
      await api.post('/contacts', { friend_id: u.id })
      Toast.success('已添加好友')
    } catch (e: any) {
      Toast.fail(e.response?.data?.message || '添加失败')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="搜索账号或昵称"
          autoCapitalize="none"
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={search}
        />
        <Button type="primary" size="small" onPress={search} style={{ marginLeft: 8 }}>
          搜索
        </Button>
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row}>
            <Text style={styles.name}>
              {item.nickname || item.username} (@{item.username})
            </Text>
            <Button size="small" type="primary" onPress={() => add(item)}>
              添加
            </Button>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>输入关键字搜索用户</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  name: { fontSize: 15, flex: 1 },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
})
