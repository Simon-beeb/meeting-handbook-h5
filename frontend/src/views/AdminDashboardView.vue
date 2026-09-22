<template>
  <main class="phone-page detail-page admin-page">
    <header class="detail-header admin-header">
      <button class="back" @click="router.push('/')">← 访客端</button>
      <h2>管理员后台</h2>
      <button class="secondary-btn" @click="logout">退出</button>
    </header>

    <section id="sec-dashboard" class="admin-card" v-if="handbookStore.draft">
      <h3>数据看板</h3>
      <div class="dashboard-grid">
        <article class="dashboard-item">
          <strong>{{ moduleTotal }}</strong>
          <span>模块总数</span>
        </article>
        <article class="dashboard-item">
          <strong>{{ enabledCount }}</strong>
          <span>已启用模块</span>
        </article>
        <article class="dashboard-item">
          <strong>{{ adminUsers.length }}</strong>
          <span>管理员数量</span>
        </article>
        <article class="dashboard-item">
          <strong>{{ formatTime(handbookStore.draft.updatedAt) }}</strong>
          <span>草稿更新时间</span>
        </article>
      </div>
      <p class="status-text" v-if="handbookStore.published?.publishedAt">
        最新发布时间：{{ formatTime(handbookStore.published.publishedAt) }}
      </p>
    </section>

    <section class="admin-card">
      <div class="section-title-row">
        <h3>操作日志</h3>
        <button class="secondary-btn small-btn" @click="refreshLogs">刷新</button>
      </div>
      <div class="log-list" v-if="auditLogs.length">
        <article class="log-item" v-for="item in auditLogs" :key="item.id">
          <div class="log-head">
            <strong>{{ item.actor }}</strong>
            <span>{{ formatTime(item.time) }}</span>
          </div>
          <p>{{ translateAction(item.action) }} · {{ item.target }}</p>
        </article>
      </div>
      <p v-else class="status-text">暂无操作日志</p>
    </section>

    <section id="sec-meeting" v-if="handbookStore.draft" class="admin-card">
      <h3>会议信息（草稿）</h3>
      <label class="field-label">大会标题</label>
      <input v-model="handbookStore.draft.meeting.title" class="text-input" :disabled="authStore.forceChangePassword" />

      <label class="field-label">大会副标题</label>
      <input v-model="handbookStore.draft.meeting.subtitle" class="text-input" :disabled="authStore.forceChangePassword" />

      <label class="field-label">Logo URL</label>
      <input v-model="handbookStore.draft.meeting.logoUrl" class="text-input" :disabled="authStore.forceChangePassword" />

      <label class="field-label">上传 Logo</label>
      <input class="text-input" type="file" accept="image/*" :disabled="authStore.forceChangePassword" @change="event => onImageChange(event, 'logo')" />

      <label class="field-label">背景图 URL</label>
      <input v-model="handbookStore.draft.meeting.backgroundUrl" class="text-input" :disabled="authStore.forceChangePassword" />

      <label class="field-label">上传背景图</label>
      <input class="text-input" type="file" accept="image/*" :disabled="authStore.forceChangePassword" @change="event => onImageChange(event, 'background')" />
    </section>

    <section id="sec-modules" v-if="handbookStore.draft" class="admin-card">
      <h3>模块配置（草稿）</h3>
      <article class="module-edit" v-for="module in sortedModules" :key="module.id">
        <div class="module-row">
          <input v-model="module.title" class="text-input" :disabled="authStore.forceChangePassword" />
          <input v-model="module.subtitle" class="text-input" :disabled="authStore.forceChangePassword" />
        </div>

        <div class="module-row module-meta-row">
          <label class="switch-line">
            <input type="checkbox" v-model="module.enabled" :disabled="authStore.forceChangePassword" />
            显示给访客
          </label>
          <div class="order-wrap">
            <span>排序</span>
            <input
              type="number"
              class="text-input order-input"
              :value="module.order"
              :disabled="authStore.forceChangePassword"
              @input="event => setOrder(module, event.target.value)"
            />
          </div>
        </div>

        <div class="module-row sort-actions">
          <button class="secondary-btn small-btn" :disabled="authStore.forceChangePassword" @click="moveModule(module.id, -1)">上移</button>
          <button class="secondary-btn small-btn" :disabled="authStore.forceChangePassword" @click="moveModule(module.id, 1)">下移</button>
        </div>

        <textarea
          v-if="module.type !== 'agenda'"
          v-model="module.content"
          class="text-input text-area"
          :disabled="authStore.forceChangePassword"
        ></textarea>
        <textarea
          v-else
          :value="serializeAgenda(module.content)"
          class="text-input text-area"
          :disabled="authStore.forceChangePassword"
          @input="event => parseAgenda(module, event.target.value)"
        ></textarea>
      </article>
    </section>

    <section id="sec-admins" class="admin-card">
      <h3>管理员管理</h3>
      <p class="status-text">当前身份：{{ authStore.isSuperAdmin ? '超级管理员' : '普通管理员' }}</p>
      <div class="module-row">
        <input v-model="newAdminName" class="text-input" placeholder="新管理员用户名" :disabled="!authStore.isSuperAdmin" />
        <input v-model="newAdminPassword" class="text-input" type="password" placeholder="初始密码（至少6位）" :disabled="!authStore.isSuperAdmin" />
      </div>
      <label class="field-label">新账号角色</label>
      <select v-model="newAdminRole" class="text-input" :disabled="!authStore.isSuperAdmin">
        <option value="admin">普通管理员</option>
        <option value="super_admin">超级管理员</option>
      </select>
      <button class="primary-btn" :disabled="!authStore.isSuperAdmin" @click="addAdmin">添加管理员</button>
      <div class="admin-user-list">
        <article class="admin-user-item" v-for="item in adminUsers" :key="item.username">
          <div>
            <strong>{{ item.username }}</strong>
            <p class="status-text">角色：{{ item.role === 'super_admin' ? '超级管理员' : '普通管理员' }}</p>
            <p class="status-text">{{ item.mustChangePassword ? '首次登录需改密' : '可正常登录' }}</p>
          </div>
          <button class="secondary-btn" :disabled="item.username === selfName || !authStore.isSuperAdmin" @click="removeAdmin(item.username)">移除</button>
        </article>
      </div>
    </section>

    <section id="sec-security" class="admin-card">
      <h3>账号安全</h3>
      <p class="status-text warning" v-if="authStore.forceChangePassword">
        当前账号为默认密码，需先修改密码，修改后才能保存或发布内容。
      </p>

      <label class="field-label">当前密码</label>
      <input v-model="currentPassword" class="text-input" type="password" />

      <label class="field-label">新密码</label>
      <input v-model="nextPassword" class="text-input" type="password" />

      <button class="primary-btn" @click="changeMyPassword">修改密码</button>
    </section>

    <section class="admin-actions">
      <button class="primary-btn" :disabled="authStore.forceChangePassword" @click="save">保存草稿</button>
      <button class="primary-btn publish-btn" :disabled="authStore.forceChangePassword" @click="publish">发布到访客端</button>
      <p class="status-text" v-if="handbookStore.saveMessage">{{ handbookStore.saveMessage }}</p>
      <p class="status-text error" v-if="errorMessage">{{ errorMessage }}</p>
    </section>

    <section v-if="showForceDialog" class="force-overlay">
      <article class="force-dialog">
        <h3>首次登录请修改密码</h3>
        <p>为了账号安全，请先修改默认密码。</p>
        <button class="primary-btn" @click="showForceDialog = false">我知道了</button>
      </article>
    </section>

    <nav class="mobile-admin-nav">
      <button @click="scrollToSection('sec-dashboard')">看板</button>
      <button @click="scrollToSection('sec-meeting')">会议信息</button>
      <button @click="scrollToSection('sec-modules')">模块</button>
      <button @click="scrollToSection('sec-admins')">管理员</button>
      <button @click="scrollToSection('sec-security')">安全</button>
    </nav>

    <div class="mobile-admin-actions">
      <button class="secondary-btn" @click="scrollToTop">顶部</button>
      <button class="primary-btn" :disabled="authStore.forceChangePassword" @click="save">保存</button>
      <button class="primary-btn publish-btn" :disabled="authStore.forceChangePassword" @click="publish">发布</button>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createAdminUser, listAdminUsers, listAuditLogs, removeAdminUser, uploadImage } from '../api/client'
import { useAuthStore } from '../stores/auth'
import { useHandbookStore } from '../stores/handbook'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const handbookStore = useHandbookStore()

const currentPassword = ref('')
const nextPassword = ref('')
const errorMessage = ref('')

const adminUsers = ref([])
const newAdminName = ref('')
const newAdminPassword = ref('')
const newAdminRole = ref('admin')
const selfName = ref('')
const auditLogs = ref([])
const showForceDialog = ref(false)

onMounted(async () => {
  try {
    await Promise.all([handbookStore.loadDraft(), handbookStore.loadPublished(), refreshAdmins(), refreshLogs()])
    showForceDialog.value = route.query.force === '1' && authStore.forceChangePassword
  } catch (error) {
    handleAuthError(error)
  }
})

const sortedModules = computed(() => {
  const modules = handbookStore.draft?.modules || []
  return modules.slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
})

const moduleTotal = computed(() => sortedModules.value.length)
const enabledCount = computed(() => sortedModules.value.filter(item => item.enabled !== false).length)

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function translateAction(action) {
  const map = {
    login: '登录系统',
    change_password: '修改密码',
    add_admin: '新增管理员',
    remove_admin: '移除管理员',
    set_role: '修改角色',
    save_draft: '保存草稿',
    publish: '发布内容',
    upload_image: '上传图片'
  }
  return map[action] || action
}

function scrollToSection(id) {
  const element = document.getElementById(id)
  if (!element) return
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function setOrder(module, rawValue) {
  const value = Number(rawValue)
  module.order = Number.isFinite(value) && value > 0 ? value : 1
}

function moveModule(id, step) {
  const modules = sortedModules.value
  const index = modules.findIndex(module => module.id === id)
  const targetIndex = index + step
  if (index < 0 || targetIndex < 0 || targetIndex >= modules.length) return

  const current = modules[index]
  const target = modules[targetIndex]
  const temp = current.order
  current.order = target.order
  target.order = temp
}

function serializeAgenda(items) {
  if (!Array.isArray(items)) return ''
  return items.map(item => `${item.time} ${item.topic}`).join('\n')
}

function parseAgenda(module, text) {
  const lines = text.split('\n').map(item => item.trim()).filter(Boolean)
  module.content = lines.map(line => {
    const splitIndex = line.indexOf(' ')
    if (splitIndex === -1) {
      return { time: line, topic: '' }
    }
    return {
      time: line.slice(0, splitIndex).trim(),
      topic: line.slice(splitIndex + 1).trim()
    }
  })
}

async function onImageChange(event, field) {
  if (authStore.forceChangePassword) {
    errorMessage.value = '请先修改默认密码'
    event.target.value = ''
    return
  }

  const file = event.target.files?.[0]
  if (!file || !handbookStore.draft) return

  try {
    errorMessage.value = ''
    const result = await uploadImage(file)
    if (field === 'background') {
      handbookStore.draft.meeting.backgroundUrl = result.url
    } else {
      handbookStore.draft.meeting.logoUrl = result.url
    }
    await refreshLogs()
  } catch (error) {
    handleAuthError(error)
    errorMessage.value = error.message || '上传失败'
  } finally {
    event.target.value = ''
  }
}

async function refreshAdmins() {
  const users = await listAdminUsers()
  adminUsers.value = users
  selfName.value = authStore.username || ''
}

async function refreshLogs() {
  auditLogs.value = await listAuditLogs()
}

async function addAdmin() {
  try {
    errorMessage.value = ''
    await createAdminUser({
      username: newAdminName.value.trim(),
      password: newAdminPassword.value,
      role: newAdminRole.value
    })
    newAdminName.value = ''
    newAdminPassword.value = ''
    newAdminRole.value = 'admin'
    await Promise.all([refreshAdmins(), refreshLogs()])
    handbookStore.saveMessage = '管理员已添加'
  } catch (error) {
    handleAuthError(error)
    errorMessage.value = error.message || '添加失败'
  }
}

async function removeAdmin(username) {
  try {
    errorMessage.value = ''
    await removeAdminUser(username)
    await Promise.all([refreshAdmins(), refreshLogs()])
    handbookStore.saveMessage = '管理员已移除'
  } catch (error) {
    handleAuthError(error)
    errorMessage.value = error.message || '移除失败'
  }
}

async function save() {
  if (authStore.forceChangePassword) {
    errorMessage.value = '请先修改默认密码'
    return
  }

  try {
    errorMessage.value = ''
    await handbookStore.saveDraft()
    await refreshLogs()
  } catch (error) {
    handleAuthError(error)
    errorMessage.value = error.message || '保存失败'
  }
}

async function publish() {
  if (authStore.forceChangePassword) {
    errorMessage.value = '请先修改默认密码'
    return
  }

  try {
    errorMessage.value = ''
    await handbookStore.saveDraft()
    await handbookStore.publishDraft()
    await refreshLogs()
  } catch (error) {
    handleAuthError(error)
    errorMessage.value = error.message || '发布失败'
  }
}

async function changeMyPassword() {
  try {
    errorMessage.value = ''
    await authStore.updatePassword(currentPassword.value, nextPassword.value)
    currentPassword.value = ''
    nextPassword.value = ''
    showForceDialog.value = false
    handbookStore.saveMessage = '密码已更新'
    await Promise.all([refreshAdmins(), refreshLogs()])
  } catch (error) {
    handleAuthError(error)
    errorMessage.value = error.message || '修改密码失败'
  }
}

async function logout() {
  await authStore.logout()
  router.push('/admin/login')
}

function handleAuthError(error) {
  if (error?.status === 401) {
    authStore.logout()
    router.push('/admin/login')
  }
}
</script>
