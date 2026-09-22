<template>
  <main class="phone-page" :style="pageStyle">
    <header class="hero hero-with-action">
      <button class="my-entry-btn" @click="router.push('/me')">我的</button>
      <img v-if="meeting.logoUrl" class="logo" :src="meeting.logoUrl" alt="logo" />
      <h1>{{ meeting.title }}</h1>
      <p>{{ meeting.subtitle }}</p>
    </header>

    <section class="mobile-tip" v-if="isPhoneLike">
      <strong>手机使用提示</strong>
      <p>可在浏览器菜单选择“添加到主屏幕”，像小程序一样打开。</p>
    </section>

    <section class="grid">
      <button
        v-for="module in modules"
        :key="module.id"
        class="card"
        @click="router.push(`/module/${module.id}`)"
      >
        <h3>{{ module.title }}</h3>
        <small>{{ module.subtitle }}</small>
      </button>
    </section>

    <button v-if="showAdminEntry" class="admin-entry" @click="router.push('/admin/login')">管理员入口</button>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHandbookStore } from '../stores/handbook'

const router = useRouter()
const handbookStore = useHandbookStore()

onMounted(async () => {
  await handbookStore.loadPublished()
})

const modules = computed(() => {
  const all = handbookStore.published?.modules || []
  return all
    .filter(module => module.enabled !== false)
    .slice()
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
})

const meeting = computed(() => handbookStore.published?.meeting || {
  title: '会议手册',
  subtitle: '',
  logoUrl: '',
  backgroundUrl: ''
})

const pageStyle = computed(() => {
  if (!meeting.value.backgroundUrl) {
    return {}
  }
  return {
    backgroundImage: `linear-gradient(rgba(3,26,119,0.55), rgba(3,26,119,0.72)), url(${meeting.value.backgroundUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
})

const isPhoneLike = computed(() => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /Mobile|Android|iPhone|iPad/i.test(ua) || window.innerWidth <= 768
})

const showAdminEntry = computed(() => {
  if (import.meta.env.VITE_SHOW_ADMIN_ENTRY === 'true') return true
  if (typeof window === 'undefined') return false
  const search = new URLSearchParams(window.location.search)
  return search.get('admin') === '1'
})
</script>
