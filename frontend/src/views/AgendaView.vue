<template>
  <main class="phone-page detail-page">
    <header class="detail-header">
      <button class="back" @click="$router.back()">← 返回</button>
      <h2>大会议程</h2>
    </header>

    <section class="agenda-list">
      <article v-for="item in items" :key="item.time" class="agenda-item">
        <div class="time">{{ item.time }}</div>
        <div class="topic">{{ item.topic }}</div>
      </article>
    </section>
  </main>
</template>

<script setup>
const items = [
  { time: '13:30-13:35', topic: '会议开始' },
  { time: '13:35-13:40', topic: '欢迎致辞' },
  { time: '13:40-15:10', topic: '大咖讲座' },
  { time: '15:10-15:40', topic: '行业分享' },
  { time: '15:40-16:10', topic: '嘉宾分享' },
  { time: '16:10-16:20', topic: '茶歇' },
  { time: '16:20-17:00', topic: 'TCL 空调发展报告' }
]
</script>
