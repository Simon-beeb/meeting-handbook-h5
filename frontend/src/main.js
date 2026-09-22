import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './styles.css'
import HomeView from './views/HomeView.vue'
import ModuleDetailView from './views/ModuleDetailView.vue'
import AdminLoginView from './views/AdminLoginView.vue'
import AdminDashboardView from './views/AdminDashboardView.vue'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/module/:id', name: 'module', component: ModuleDetailView },
    { path: '/admin/login', name: 'admin-login', component: AdminLoginView },
    { path: '/admin', name: 'admin', component: AdminDashboardView, meta: { requiresAuth: true } }
  ]
})

const pinia = createPinia()

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)
  if (to.meta.requiresAuth && !authStore.isAuthed) {
    return { name: 'admin-login' }
  }
  if (to.name === 'admin-login' && authStore.isAuthed) {
    return { name: 'admin' }
  }
  return true
})

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
