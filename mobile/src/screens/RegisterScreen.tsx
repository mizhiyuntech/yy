import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Toast } from '@ant-design/react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>

export default function RegisterScreen(_: Props) {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onRegister = async () => {
    if (username.length < 3 || password.length < 6) {
      Toast.info('账号至少 3 位，密码至少 6 位')
      return
    }
    setLoading(true)
    try {
      await register(username.trim(), password, nickname.trim())
    } catch (e: any) {
      Toast.fail(e.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>创建账号</Text>
      <TextInput
        style={styles.input}
        placeholder="账号 (至少 3 位)"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput style={styles.input} placeholder="昵称" value={nickname} onChangeText={setNickname} />
      <TextInput
        style={styles.input}
        placeholder="密码 (至少 6 位)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button type="primary" loading={loading} onPress={onRegister} style={styles.button}>
        注册并登录
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: { marginTop: 8 },
})
