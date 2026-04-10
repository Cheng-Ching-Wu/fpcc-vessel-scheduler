import { ref, onMounted, onUnmounted } from 'vue'

const DEFAULT_API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'http://10.110.196.72:6767/FastAPI'
    : '/api-proxy/FastAPI'

const PING_URL = (process.env.VUE_APP_API_BASE_URL || DEFAULT_API_BASE_URL) + '/berth-activities'
const HEARTBEAT_INTERVAL_MS = 20_000
const PING_TIMEOUT_MS = 15_000

/**
 * 透過心跳機制偵測是否能連上 API server。
 * 判斷邏輯等同 Notion：
 *   - 瀏覽器 online/offline 事件作為第一道信號
 *   - 每 20 秒主動 ping API server（HEAD request + 5 秒 timeout）
 *   - 任何有效 HTTP 回應（含 4xx）= 線上；網路超時 / 連線拒絕 = 離線
 */
export function useNetworkStatus() {
    const isOnline = ref(navigator.onLine)
    const isChecking = ref(false)

    let timer = null

    async function pingServer() {
        if (isChecking.value) return

        isChecking.value = true
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

        try {
            await fetch(PING_URL, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store',
            })
            isOnline.value = true
        } catch {
            // AbortError = timeout；TypeError = 連線失敗 (DNS / 防火牆 / 無路由)
            isOnline.value = false
        } finally {
            clearTimeout(timeoutId)
            isChecking.value = false
        }
    }

    function handleOnline() {
        // 瀏覽器回報有網路時，立刻再驗一次 API server
        pingServer()
    }

    function handleOffline() {
        isOnline.value = false
    }

    onMounted(() => {
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // 啟動時先 ping 一次
        pingServer()

        // 之後每 30 秒定期心跳
        timer = setInterval(pingServer, HEARTBEAT_INTERVAL_MS)
    })

    onUnmounted(() => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        clearInterval(timer)
    })

    return { isOnline, isChecking }
}
