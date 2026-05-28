// Backend API base URL is baked into the app at build time. The production
// backend is served over HTTPS at api.mizhiyun.cloud.
export const API_BASE_URL = 'https://api.mizhiyun.cloud'

// Derive the WebSocket endpoint from the API base (https -> wss).
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws')

export const TOKEN_KEY = 'yy_token'
