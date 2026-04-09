import Vue from 'vue'
import VueRouter from 'vue-router'
import DhtmlxGantt from '@/pages/dhtmlxGantt.vue'
import PlanGantt from '@/pages/PlanGantt.vue'
import GoogleIconsDemo from '@/pages/GoogleIconsDemo.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'PlanGantt',
    component: PlanGantt
  },
  {
    path: '/DhtmlxGantt',
    name: 'DhtmlxGantt',
    component: DhtmlxGantt
  },
  {
    path: '/google-icons',
    name: 'GoogleIconsDemo',
    component: GoogleIconsDemo
  },
]

const router = new VueRouter({
  mode: 'hash', 
  base: process.env.BASE_URL,
  routes
})

export default router
