import Vue from 'vue'
import App from './App.vue'
import router from './router'
import { setupAxiosInterceptors } from './api/httpClient'

Vue.config.productionTip = false

setupAxiosInterceptors()

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
