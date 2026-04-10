import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { setupAxiosInterceptors } from './api/httpClient'
import '@/styles/index.scss'

Vue.config.productionTip = false

setupAxiosInterceptors()

store.dispatch('network/startHeartbeat')

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')
