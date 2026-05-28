import axios from 'axios'

// In production the admin SPA is served by the Go backend on the same origin,
// so the API base is relative. During `vite dev` the proxy forwards /api.
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('yy_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('yy_admin_token')
      if (location.pathname !== '/login') {
        location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export interface ApiResult<T = unknown> {
  code: number
  data?: T
  message?: string
}

export default api
