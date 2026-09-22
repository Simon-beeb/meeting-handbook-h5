const CONFIG_KEY = 'meeting-h5-config-v1'
const TOKEN_KEY = 'meeting-h5-admin-token'
const LOGIN_USER_KEY = 'meeting-h5-admin-user'
const LOGIN_ROLE_KEY = 'meeting-h5-admin-role'
const LOGIN_FAIL_KEY = 'meeting-h5-admin-login-failures'

const LOGIN_MAX_FAILURES = 5
const LOGIN_LOCK_MINUTES = 10
const LOGIN_LOCK_MS = LOGIN_LOCK_MINUTES * 60 * 1000

const defaultAdmin = {
  username: 'admin',
  password: 'admin123',
  role: 'super_admin',
  mustChangePassword: true,
  createdAt: new Date().toISOString()
}

const defaultConfig = {
  meeting: {
    title: '恒慧新格局 共赢新未来',
    subtitle: 'TCL 空调 2027 冷年全球供应链生态大会',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/32/TCL_logo.svg',
    backgroundUrl: ''
  },
  modules: [
    { id: 'reminder', type: 'reminder', title: '温馨提示', subtitle: 'FRIENDLY REMINDER', content: '请提前 10 分钟入场。', enabled: true, order: 1 },
    {
      id: 'agenda',
      type: 'agenda',
      title: '大会议程',
      subtitle: 'AGENDA',
      content: [
        { time: '13:30-13:35', topic: '会议开始' },
        { time: '13:35-13:40', topic: '欢迎致辞' },
        { time: '13:40-15:10', topic: '大咖讲座' }
      ],
      enabled: true,
      order: 2
    },
    { id: 'seating', type: 'seating', title: '座位表', subtitle: 'SEATING CHART', content: '请按现场指引就座。', enabled: true, order: 3 },
    { id: 'live', type: 'live', title: '照片直播', subtitle: 'LIVE PHOTO', content: '直播链接待配置。', enabled: true, order: 4 },
    { id: 'intro', type: 'intro', title: '介绍', subtitle: 'INTRODUCTION', content: '会议介绍内容。', enabled: true, order: 5 }
  ],
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString()
}

function sanitizeAdminUser(user, index = 0) {
  const username = String(user?.username || '').trim() || `admin${index + 1}`
  const password = String(user?.password || '').trim() || 'admin123'
  const role = user?.role === 'super_admin' || user?.role === 'admin'
    ? user.role
    : (index === 0 ? 'super_admin' : 'admin')

  return {
    username,
    password,
    role,
    mustChangePassword: Boolean(user?.mustChangePassword) || password === 'admin123',
    createdAt: user?.createdAt || new Date().toISOString()
  }
}

function normalize(config) {
  const modules = Array.isArray(config?.modules) ? config.modules : []
  const normalizedModules = modules
    .map((module, index) => ({
      id: module.id || `module-${index + 1}`,
      type: module.type || 'intro',
      title: module.title || `模块${index + 1}`,
      subtitle: module.subtitle || '',
      content: module.content ?? '',
      enabled: module.enabled !== false,
      order: Number(module.order || index + 1)
    }))
    .sort((left, right) => left.order - right.order)

  return {
    meeting: {
      title: config?.meeting?.title || defaultConfig.meeting.title,
      subtitle: config?.meeting?.subtitle || defaultConfig.meeting.subtitle,
      logoUrl: config?.meeting?.logoUrl || defaultConfig.meeting.logoUrl,
      backgroundUrl: config?.meeting?.backgroundUrl || ''
    },
    modules: normalizedModules,
    updatedAt: config?.updatedAt || new Date().toISOString(),
    publishedAt: config?.publishedAt || new Date().toISOString()
  }
}

function toLog(item) {
  return {
    id: item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: item?.time || new Date().toISOString(),
    actor: item?.actor || 'system',
    action: item?.action || 'unknown',
    target: item?.target || '-',
    detail: item?.detail || ''
  }
}

function loadContainer() {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) {
    const seed = {
      draft: structuredClone(defaultConfig),
      published: structuredClone(defaultConfig),
      admins: [structuredClone(defaultAdmin)],
      auditLogs: []
    }
    localStorage.setItem(CONFIG_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.draft || !parsed?.published) throw new Error('Invalid config')

    const adminsFromList = Array.isArray(parsed.admins) ? parsed.admins : []
    const legacyAdmin = parsed.admin ? [parsed.admin] : []
    const source = adminsFromList.length ? adminsFromList : legacyAdmin
    parsed.admins = source.length ? source.map(sanitizeAdminUser) : [structuredClone(defaultAdmin)]

    if (!parsed.admins.some(item => item.role === 'super_admin')) {
      parsed.admins[0].role = 'super_admin'
    }

    parsed.draft = normalize(parsed.draft)
    parsed.published = normalize(parsed.published)
    parsed.auditLogs = Array.isArray(parsed.auditLogs) ? parsed.auditLogs.map(toLog).slice(0, 200) : []
    delete parsed.admin
    return parsed
  } catch {
    const fallback = {
      draft: structuredClone(defaultConfig),
      published: structuredClone(defaultConfig),
      admins: [structuredClone(defaultAdmin)],
      auditLogs: []
    }
    localStorage.setItem(CONFIG_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveContainer(container) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(container))
}

function getCurrentUser() {
  return localStorage.getItem(LOGIN_USER_KEY) || ''
}

function requireCurrentUser(container) {
  const username = getCurrentUser()
  const account = container.admins.find(item => item.username === username)
  if (!account) {
    throw new Error('登录已失效，请重新登录')
  }
  return account
}

function appendAudit(container, payload) {
  container.auditLogs = [
    toLog({
      ...payload,
      time: new Date().toISOString()
    }),
    ...(container.auditLogs || []).map(toLog)
  ].slice(0, 200)
}

function readLoginFailureState(username) {
  const key = String(username || '').trim().toLowerCase()
  if (!key) return null

  const all = JSON.parse(localStorage.getItem(LOGIN_FAIL_KEY) || '{}')
  const item = all[key]
  if (!item) return null

  if (item.lockedUntil && Date.now() >= item.lockedUntil) {
    delete all[key]
    localStorage.setItem(LOGIN_FAIL_KEY, JSON.stringify(all))
    return null
  }

  return { key, all, item }
}

function increaseLoginFailure(username) {
  const key = String(username || '').trim().toLowerCase()
  const all = JSON.parse(localStorage.getItem(LOGIN_FAIL_KEY) || '{}')
  const current = all[key] || { count: 0, lockedUntil: 0 }
  current.count += 1
  if (current.count >= LOGIN_MAX_FAILURES) {
    current.lockedUntil = Date.now() + LOGIN_LOCK_MS
  }
  all[key] = current
  localStorage.setItem(LOGIN_FAIL_KEY, JSON.stringify(all))
  return current
}

function clearLoginFailure(username) {
  const key = String(username || '').trim().toLowerCase()
  if (!key) return
  const all = JSON.parse(localStorage.getItem(LOGIN_FAIL_KEY) || '{}')
  if (all[key]) {
    delete all[key]
    localStorage.setItem(LOGIN_FAIL_KEY, JSON.stringify(all))
  }
}

function ensureSuperAdmin(container) {
  if (!container.admins.some(item => item.role === 'super_admin')) {
    container.admins[0].role = 'super_admin'
  }
}

export async function loginAdmin(payload) {
  const username = String(payload?.username || '').trim()
  const lock = readLoginFailureState(username)
  if (lock?.item?.lockedUntil) {
    const seconds = Math.ceil((lock.item.lockedUntil - Date.now()) / 1000)
    throw new Error(`登录失败次数过多，请 ${seconds} 秒后重试`)
  }

  const container = loadContainer()
  const account = container.admins.find(item => item.username === username)

  if (!account || payload.password !== account.password) {
    const failure = increaseLoginFailure(username)
    if (failure.lockedUntil) {
      throw new Error(`连续失败已锁定 ${LOGIN_LOCK_MINUTES} 分钟`)
    }
    const left = Math.max(0, LOGIN_MAX_FAILURES - failure.count)
    throw new Error(`用户名或密码错误，还可尝试 ${left} 次`)
  }

  clearLoginFailure(username)

  const token = `token-${Date.now()}`
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(LOGIN_USER_KEY, account.username)
  localStorage.setItem(LOGIN_ROLE_KEY, account.role)
  appendAudit(container, {
    actor: account.username,
    action: 'login',
    target: 'auth',
    detail: '管理员登录成功'
  })
  saveContainer(container)
  return { token, username: account.username, role: account.role, forceChangePassword: account.mustChangePassword }
}

export async function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LOGIN_USER_KEY)
  localStorage.removeItem(LOGIN_ROLE_KEY)
}

export function getSavedToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getSavedUsername() {
  return localStorage.getItem(LOGIN_USER_KEY) || ''
}

export function getSavedRole() {
  return localStorage.getItem(LOGIN_ROLE_KEY) || ''
}

export async function fetchPublishedConfig() {
  const container = loadContainer()
  return normalize(container.published)
}

export async function fetchDraftConfig() {
  const container = loadContainer()
  requireCurrentUser(container)
  return normalize(container.draft)
}

export async function saveDraftConfig(nextDraft) {
  const container = loadContainer()
  const account = requireCurrentUser(container)
  container.draft = normalize({ ...nextDraft, updatedAt: new Date().toISOString() })
  appendAudit(container, {
    actor: account.username,
    action: 'save_draft',
    target: 'handbook',
    detail: '保存草稿'
  })
  saveContainer(container)
  return structuredClone(container.draft)
}

export async function publishDraftConfig() {
  const container = loadContainer()
  const account = requireCurrentUser(container)
  const now = new Date().toISOString()
  container.published = normalize({ ...container.draft, publishedAt: now, updatedAt: now })
  container.draft = normalize({ ...container.draft, publishedAt: now, updatedAt: now })
  appendAudit(container, {
    actor: account.username,
    action: 'publish',
    target: 'handbook',
    detail: '发布访客端内容'
  })
  saveContainer(container)
  return structuredClone(container.published)
}

export async function changePassword(payload) {
  const container = loadContainer()
  const account = requireCurrentUser(container)

  if (payload.currentPassword !== account.password) {
    throw new Error('当前密码不正确')
  }
  if (!payload.newPassword || payload.newPassword.length < 6) {
    throw new Error('新密码至少 6 位')
  }

  account.password = payload.newPassword
  account.mustChangePassword = false
  appendAudit(container, {
    actor: account.username,
    action: 'change_password',
    target: account.username,
    detail: '修改账号密码'
  })
  saveContainer(container)
  return { success: true }
}

export async function listAdminUsers() {
  const container = loadContainer()
  requireCurrentUser(container)
  return container.admins.map(({ username, role, createdAt, mustChangePassword }) => ({ username, role, createdAt, mustChangePassword }))
}

export async function createAdminUser(payload) {
  const container = loadContainer()
  const account = requireCurrentUser(container)

  if (account.role !== 'super_admin') {
    throw new Error('仅超级管理员可执行此操作')
  }

  const username = String(payload?.username || '').trim()
  const password = String(payload?.password || '')
  const role = payload?.role === 'super_admin' ? 'super_admin' : 'admin'

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
    throw new Error('用户名需为 3-30 位字母、数字、下划线或中划线')
  }

  if (!password || password.length < 6) {
    throw new Error('初始密码至少 6 位')
  }

  if (container.admins.some(item => item.username === username)) {
    throw new Error('该用户名已存在')
  }

  container.admins.push(sanitizeAdminUser({ username, password, role, mustChangePassword: true }, container.admins.length))
  ensureSuperAdmin(container)
  appendAudit(container, {
    actor: account.username,
    action: 'add_admin',
    target: `${username}(${role})`,
    detail: '新增管理员账号'
  })
  saveContainer(container)
  return { success: true }
}

export async function removeAdminUser(username) {
  const container = loadContainer()
  const account = requireCurrentUser(container)

  if (account.role !== 'super_admin') {
    throw new Error('仅超级管理员可执行此操作')
  }

  const target = String(username || '').trim()
  if (!target) {
    throw new Error('缺少用户名')
  }

  const current = getCurrentUser()
  if (target === current) {
    throw new Error('不能删除当前登录账号')
  }

  const targetUser = container.admins.find(item => item.username === target)
  if (!targetUser) {
    throw new Error('账号不存在')
  }

  const nextAdmins = container.admins.filter(item => item.username !== target)
  if (!nextAdmins.length) {
    throw new Error('系统至少保留 1 个管理员')
  }

  if (targetUser.role === 'super_admin' && !nextAdmins.some(item => item.role === 'super_admin')) {
    throw new Error('系统至少保留 1 个超级管理员')
  }

  container.admins = nextAdmins
  appendAudit(container, {
    actor: account.username,
    action: 'remove_admin',
    target,
    detail: '移除管理员账号'
  })
  saveContainer(container)
  return { success: true }
}

export async function listAuditLogs() {
  const container = loadContainer()
  requireCurrentUser(container)
  return (container.auditLogs || []).map(toLog).slice(0, 50)
}
