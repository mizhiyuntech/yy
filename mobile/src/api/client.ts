import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL, TOKEN_KEY } from '../config'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
