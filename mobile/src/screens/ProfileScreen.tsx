import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '@ant-design/react-native'
import { IconOutline } from '@ant-design/icons-react-native'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config'

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.nickname || user?.username || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.nickname || user?.username}</Text>
        <Text style={styles.sub}>@{user?.username}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>服务器</Text>
        <Text style={styles.infoValue}>{API_BASE_URL}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>用户 ID</Text>
        <Text style={styles.infoValue}>{user?.id}</Text>
      </View>

      <Button type="warning" style={styles.logout} onPress={logout}>
        <IconOutline name="logout" size={15} color="#fff" /> 退出登录
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1677ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  sub: { color: '#999', marginTop: 4 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  infoLabel: { color: '#666' },
  infoValue: { color: '#333' },
  logout: { margin: 24 },
})
