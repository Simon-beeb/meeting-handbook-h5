<template>
  <main class="phone-page detail-page">
    <header class="detail-header">
      <button class="back" @click="$router.push('/')">← 返回首页</button>
      <h2>管理员登录</h2>
    </header>

    <section class="login-card">
      <label class="field-label">用户名</label>
      <input v-model="username" class="text-input" placeholder="请输入用户名" />

      <label class="field-label">密码</label>
      <input v-model="password" class="text-input" type="password" placeholder="请输入密码" @keydown.enter="submit" />

      <button class="primary-btn" :disabled="authStore.loginSubmitting" @click="submit">
        {{ authStore.loginSubmitting ? '登录中...' : '登录后台' }}
      </button>
      <p class="status-text" v-if="authStore.loginMessage">{{ authStore.loginMessage }}</p>
      <p class="status-text error" v-if="authStore.loginError">{{ authStore.loginError }}</p>
      <p class="status-text">默认账号：admin / admin123</p>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('admin123')

async function submit() {
  if (authStore.loginSubmitting) return
  try {
    const result = await authStore.login(username.value.trim(), password.value)
    if (result.forceChangePassword) {
      router.push('/admin?force=1')
      return
    }
    router.push('/admin')
  } catch {
  }
}
</script>
