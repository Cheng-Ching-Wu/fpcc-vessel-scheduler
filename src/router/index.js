import Vue from 'vue'
import VueRouter from 'vue-router'
// import HelloWorld from '@/components/HelloWorld.vue'
import FrappeGantt from '@/components/FrappeGantt.vue'
import DhtmlxGantt from '@/components/dhtmlxGantt.vue'
import PlanGantt from '@/components/PlanGantt.vue'

Vue.use(VueRouter)

const routes = [
  // {
  //   path: '/',
  //   name: 'Home',
  //   component: HelloWorld
  // },
  {
    path: '/',
    name: 'PlanGantt',
    component: PlanGantt
  },
  {
    path: '/FrappeGantt',
    name: 'FrappeGantt',
    component: FrappeGantt
  },
  {
    path: '/DhtmlxGantt',
    name: 'DhtmlxGantt',
    component: DhtmlxGantt
  },
]

const router = new VueRouter({
  mode: 'hash', 
  base: process.env.BASE_URL,
  routes
})

export default router
