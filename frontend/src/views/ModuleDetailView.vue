<template>
  <main class="phone-page detail-page">
    <header class="detail-header">
      <button class="back" @click="$router.back()">← 返回</button>
      <h2>{{ module?.title || '模块详情' }}</h2>
    </header>

    <section v-if="module" class="agenda-list">
      <template v-if="module.type === 'agenda'">
        <article v-for="item in module.content" :key="item.time" class="agenda-item">
          <div class="time">{{ item.time }}</div>
          <div class="topic">{{ item.topic }}</div>
        </article>
      </template>
      <article v-else class="agenda-item">
        <div class="topic">{{ textContent }}</div>
      </article>
    </section>

    <p v-else class="empty">未找到该模块或该模块已下线</p>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHandbookStore } from '../stores/handbook'

const route = useRoute()
const handbookStore = useHandbookStore()

onMounted(async () => {
  if (!handbookStore.published) {
    await handbookStore.loadPublished()
  }
})

const module = computed(() => {
  const target = handbookStore.modules.find(item => item.id === route.params.id)
  if (!target) return null
  if (target.enabled === false) return null
  return target
})

const textContent = computed(() => {
  if (!module.value) return ''
  return typeof module.value.content === 'string' ? module.value.content : '暂无内容'
})
</script>
