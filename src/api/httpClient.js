import axios from 'axios'

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'http://10.110.196.72:6767/FastAPI'
    : '/api-proxy/FastAPI'

const httpClient = axios.create({
    baseURL: process.env.VUE_APP_API_BASE_URL || DEFAULT_API_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
    },
})

let interceptorsInstalled = false

export function setupAxiosInterceptors(options = {}) {
    if (interceptorsInstalled) return
    interceptorsInstalled = true

    const { onUnauthorized } = options

    httpClient.interceptors.request.use(
        config => {
            const token = localStorage.getItem('accessToken')
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }
            config.metadata = { startTime: Date.now() }
            return config
        },
        error => Promise.reject(error)
    )

    httpClient.interceptors.response.use(
        response => response,
        error => {
            const status = error?.response?.status
            if (status === 401 && typeof onUnauthorized === 'function') {
                onUnauthorized(error)
            }

            if (process.env.NODE_ENV !== 'production') {
                const startedAt = error?.config?.metadata?.startTime || Date.now()
                const duration = Date.now() - startedAt
                const method = (error?.config?.method || 'GET').toUpperCase()
                const url = error?.config?.url || ''
                console.warn(`[API] ${method} ${url} failed in ${duration}ms`, error)
            }

            return Promise.reject(error)
        }
    )
}

export default httpClient
