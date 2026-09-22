<template>
  <main class="phone-page detail-page me-page">
    <header class="detail-header admin-header">
      <button class="back" @click="router.push('/')">← 返回首页</button>
      <h2>我的</h2>
      <span></span>
    </header>

    <section class="admin-card" v-if="!authStore.isAuthed">
      <h3>账号登录</h3>
      <p class="status-text">未登录状态为游客，可浏览首页内容。</p>

      <label class="field-label">用户名</label>
      <input v-model="username" class="text-input" placeholder="请输入管理员用户名" />

      <label class="field-label">密码</label>
      <input v-model="password" class="text-input" type="password" placeholder="请输入密码" @keydown.enter="submit" />

      <button class="primary-btn" :disabled="authStore.loginSubmitting" @click="submit">
        {{ authStore.loginSubmitting ? '登录中...' : '登录' }}
      </button>
      <p class="status-text error" v-if="authStore.loginError">{{ authStore.loginError }}</p>
      <p class="status-text">提示：后续将接入 OA 登录，员工可使用 OA 身份进入“我的”。</p>
    </section>

    <section class="admin-card" v-else>
      <h3>当前身份</h3>
      <p class="status-text">账号：{{ authStore.username }}</p>
      <p class="status-text">角色：{{ roleLabel }}</p>

      <button class="primary-btn" v-if="isAdminRole" @click="router.push('/admin')">进入管理员后台</button>
      <p class="status-text" v-else>当前为普通员工身份，仅可浏览访客内容。</p>

      <button class="secondary-btn me-logout" @click="logout">退出登录</button>
    </section>

    <section class="admin-card" v-if="authStore.forceChangePassword">
      <h3>安全提醒</h3>
      <p class="status-text warning">检测到默认密码，请进入后台先修改密码。</p>
      <button class="primary-btn" @click="router.push('/admin')">去修改密码</button>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')

const isAdminRole = computed(() => authStore.role === 'admin' || authStore.role === 'super_admin')
const roleLabel = computed(() => {
  if (authStore.role === 'super_admin') return '超级管理员'
  if (authStore.role === 'admin') return '管理员'
  if (authStore.role) return '员工'
  return '游客'
})

async function submit() {
  if (authStore.loginSubmitting) return
  try {
    await authStore.login(username.value.trim(), password.value)
    password.value = ''
  } catch {
  }
}

async function logout() {
  await authStore.logout()
  username.value = ''
  password.value = ''
}
</script>
