import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Toast } from '@ant-design/react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onLogin = async () => {
    if (!username || !password) {
      Toast.info('请输入账号和密码')
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
    } catch (e: any) {
      Toast.fail(e.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>YY IM</Text>
      <Text style={styles.subtitle}>即时通讯</Text>
      <TextInput
        style={styles.input}
        placeholder="账号"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button type="primary" loading={loading} onPress={onLogin} style={styles.button}>
        登录
      </Button>
      <Button type="ghost" onPress={() => navigation.navigate('Register')} style={styles.button}>
        注册新账号
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  logo: { fontSize: 40, fontWeight: 'bold', color: '#1677ff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 },
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
