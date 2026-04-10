const DEFAULT_API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'http://10.110.196.72:6767/FastAPI'
    : '/api-proxy/FastAPI'

const PING_URL = (process.env.VUE_APP_API_BASE_URL || DEFAULT_API_BASE_URL) + '/berth-activities'
const HEARTBEAT_INTERVAL_MS = 20_000
const PING_TIMEOUT_MS = 15_000

let heartbeatTimer = null
let countdownTimer = null

export default {
    namespaced: true,

    state: () => ({
        isOnline: navigator.onLine,
        isChecking: false,
        countdown: HEARTBEAT_INTERVAL_MS / 1000,
    }),

    getters: {
        isOnline: state => state.isOnline,
        isChecking: state => state.isChecking,
        countdown: state => state.countdown,
    },

    mutations: {
        SET_ONLINE(state, value) {
            state.isOnline = value
        },
        SET_CHECKING(state, value) {
            state.isChecking = value
        },
        SET_COUNTDOWN(state, value) {
            state.countdown = value
        },
    },

    actions: {
        async ping({ commit, state }) {
            if (state.isChecking) return

            // 每次 ping 開始，重設倒數
            commit('SET_COUNTDOWN', HEARTBEAT_INTERVAL_MS / 1000)
            commit('SET_CHECKING', true)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

            try {
                await fetch(PING_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store',
                })
                commit('SET_ONLINE', true)
                // 連線成功，停止倒數
                clearInterval(countdownTimer)
                countdownTimer = null
            } catch {
                // AbortError = timeout；TypeError = 防火牆攔截 / DNS 失敗 / 連線拒絕
                commit('SET_ONLINE', false)
                // 連線失敗，啟動倒數（若尚未在跑）
                if (!countdownTimer) {
                    commit('SET_COUNTDOWN', HEARTBEAT_INTERVAL_MS / 1000)
                    countdownTimer = setInterval(() => {
                        commit('SET_COUNTDOWN', Math.max(0, state.countdown - 1))
                    }, 1000)
                }
            } finally {
                clearTimeout(timeoutId)
                commit('SET_CHECKING', false)
            }
        },

        startHeartbeat({ dispatch, commit }) {
            dispatch('ping')

            window.addEventListener('online', () => dispatch('ping'))
            window.addEventListener('offline', () => commit('SET_ONLINE', false))

            heartbeatTimer = setInterval(() => dispatch('ping'), HEARTBEAT_INTERVAL_MS)
        },

        stopHeartbeat() {
            clearInterval(heartbeatTimer)
            clearInterval(countdownTimer)
            heartbeatTimer = null
            countdownTimer = null
        },
    },
}
