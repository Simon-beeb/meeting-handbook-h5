import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import multer from 'multer'

const app = express()

const PORT = Number(process.env.PORT || 8090)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'meeting-handbook-dev-secret'
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7)
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase()
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || ''

const LOGIN_MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES || 5)
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 10)
const LOGIN_LOCK_MS = LOGIN_LOCK_MINUTES * 60 * 1000
const loginFailures = new Map()

const dataFile = path.resolve(process.cwd(), 'src/data/store.json')
const uploadDir = path.resolve(process.cwd(), 'src/uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const allowedOrigins = CORS_ORIGIN
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)

function isCorsAllowed(origin) {
  if (!origin) return true
  if (!allowedOrigins.length || allowedOrigins.includes('*')) return true
  return allowedOrigins.includes(origin)
}

app.use(cors({
  origin(origin, callback) {
    if (isCorsAllowed(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: false
}))

app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(uploadDir))

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

function sanitizeAdmins(store) {
  const adminsFromList = Array.isArray(store?.admins) ? store.admins : []
  const legacyAdmin = store?.admin ? [store.admin] : []
  const source = adminsFromList.length ? adminsFromList : legacyAdmin

  const dedup = new Map()
  source.forEach((admin, index) => {
    const safe = sanitizeAdminUser(admin, index)
    if (!dedup.has(safe.username)) {
      dedup.set(safe.username, safe)
    }
  })

  if (!dedup.size) {
    const fallback = sanitizeAdminUser({ username: 'admin', password: 'admin123', role: 'super_admin', mustChangePassword: true }, 0)
    dedup.set(fallback.username, fallback)
  }

  const list = Array.from(dedup.values())
  if (!list.some(item => item.role === 'super_admin')) {
    list[0].role = 'super_admin'
  }
  return list
}

function sanitizeHandbook(handbook) {
  const meeting = handbook?.meeting || {}
  const modules = Array.isArray(handbook?.modules) ? handbook.modules : []

  const normalizedModules = modules.map((module, index) => ({
    id: module.id || `module-${index + 1}`,
    type: module.type || 'intro',
    title: module.title || `模块${index + 1}`,
    subtitle: module.subtitle || '',
    content: module.content ?? '',
    enabled: module.enabled !== false,
    order: Number(module.order || index + 1)
  }))

  normalizedModules.sort((left, right) => left.order - right.order)

  return {
    meeting: {
      title: meeting.title || '会议手册',
      subtitle: meeting.subtitle || '',
      logoUrl: meeting.logoUrl || '',
      backgroundUrl: meeting.backgroundUrl || ''
    },
    modules: normalizedModules,
    updatedAt: handbook?.updatedAt || new Date().toISOString(),
    publishedAt: handbook?.publishedAt || new Date().toISOString()
  }
}

function sanitizeAuditLogs(logs) {
  if (!Array.isArray(logs)) return []
  return logs
    .map((item) => ({
      id: item?.id || `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      time: item?.time || new Date().toISOString(),
      actor: item?.actor || 'system',
      action: item?.action || 'unknown',
      target: item?.target || '-',
      detail: item?.detail || ''
    }))
    .sort((left, right) => String(right.time).localeCompare(String(left.time)))
    .slice(0, 200)
}

function appendAudit(store, { actor, action, target, detail = '' }) {
  const record = {
    id: `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    time: new Date().toISOString(),
    actor: actor || 'system',
    action,
    target: target || '-',
    detail
  }
  const logs = sanitizeAuditLogs(store.auditLogs)
  store.auditLogs = [record, ...logs].slice(0, 200)
}

function readStore() {
  const raw = fs.readFileSync(dataFile, 'utf8')
  const parsed = JSON.parse(raw)
  parsed.admins = sanitizeAdmins(parsed)
  delete parsed.admin
  parsed.draft = sanitizeHandbook(parsed.draft)
  parsed.published = sanitizeHandbook(parsed.published)
  parsed.auditLogs = sanitizeAuditLogs(parsed.auditLogs)
  return parsed
}

function writeStore(nextStore) {
  const safe = {
    ...nextStore,
    admins: sanitizeAdmins(nextStore),
    draft: sanitizeHandbook(nextStore.draft),
    published: sanitizeHandbook(nextStore.published),
    auditLogs: sanitizeAuditLogs(nextStore.auditLogs)
  }
  delete safe.admin
  fs.writeFileSync(dataFile, JSON.stringify(safe, null, 2), 'utf8')
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(body)
    .digest('base64url')
  return `${body}.${signature}`
}

function verifyToken(token) {
  const [body, signature] = String(token || '').split('.')
  if (!body || !signature) return null

  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(body)
    .digest('base64url')

  if (expected !== signature) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload?.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.replace('Bearer ', '').trim()
  const payload = verifyToken(token)

  if (!payload) {
    res.status(401).json({ message: '未授权，请先登录' })
    return
  }

  const store = readStore()
  const account = store.admins.find(item => item.username === payload.username)
  if (!account) {
    res.status(401).json({ message: '账号不存在或已被移除' })
    return
  }

  req.user = {
    ...payload,
    role: account.role,
    mustChangePassword: account.mustChangePassword
  }
  next()
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ message: '仅超级管理员可执行此操作' })
    return
  }
  next()
}

function resolveUploadedUrl(filename, req) {
  if (STORAGE_DRIVER === 'external' && UPLOAD_BASE_URL) {
    return `${UPLOAD_BASE_URL.replace(/\/$/, '')}/${filename}`
  }

  const host = `${req.protocol}://${req.get('host')}`
  return `${host}/uploads/${filename}`
}

function lockKey(username, req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  return `${String(username || '').trim().toLowerCase()}::${String(ip)}`
}

function readLockState(key) {
  const item = loginFailures.get(key)
  if (!item) return null
  if (item.lockedUntil && Date.now() >= item.lockedUntil) {
    loginFailures.delete(key)
    return null
  }
  return item
}

function increaseFailure(key) {
  const now = Date.now()
  const current = readLockState(key)
  const nextCount = (current?.count || 0) + 1
  const lockedUntil = nextCount >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCK_MS : 0
  loginFailures.set(key, { count: nextCount, lockedUntil })
  return { count: nextCount, lockedUntil }
}

function clearFailure(key) {
  loginFailures.delete(key)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString(), storage: STORAGE_DRIVER })
})

app.post('/api/auth/login', (req, res) => {
  const { username = '', password = '' } = req.body || {}
  const key = lockKey(username, req)
  const locked = readLockState(key)

  if (locked?.lockedUntil) {
    const seconds = Math.ceil((locked.lockedUntil - Date.now()) / 1000)
    res.status(429).json({ message: `登录失败次数过多，请 ${seconds} 秒后重试` })
    return
  }

  const store = readStore()
  const account = store.admins.find(item => item.username === String(username).trim())

  if (!account || password !== account.password) {
    const failure = increaseFailure(key)
    if (failure.lockedUntil) {
      res.status(429).json({ message: `连续失败已锁定 ${LOGIN_LOCK_MINUTES} 分钟` })
      return
    }
    const left = Math.max(0, LOGIN_MAX_FAILURES - failure.count)
    res.status(401).json({ message: `用户名或密码错误，还可尝试 ${left} 次` })
    return
  }

  clearFailure(key)

  const payload = {
    username: account.username,
    role: account.role,
    exp: Date.now() + TOKEN_TTL_SECONDS * 1000
  }

  appendAudit(store, {
    actor: account.username,
    action: 'login',
    target: 'auth',
    detail: '管理员登录成功'
  })
  writeStore(store)

  const token = signToken(payload)
  res.json({
    token,
    username: account.username,
    role: account.role,
    forceChangePassword: account.mustChangePassword
  })
})

app.post('/api/auth/logout', auth, (_req, res) => {
  res.json({ success: true })
})

app.post('/api/auth/change-password', auth, (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body || {}
  const store = readStore()
  const index = store.admins.findIndex(item => item.username === req.user.username)

  if (index < 0) {
    res.status(404).json({ message: '账号不存在' })
    return
  }

  if (currentPassword !== store.admins[index].password) {
    res.status(400).json({ message: '当前密码错误' })
    return
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ message: '新密码至少 6 位' })
    return
  }

  store.admins[index].password = newPassword
  store.admins[index].mustChangePassword = false
  appendAudit(store, {
    actor: req.user.username,
    action: 'change_password',
    target: req.user.username,
    detail: '修改账号密码'
  })
  writeStore(store)
  res.json({ success: true })
})

app.get('/api/admin/users', auth, (_req, res) => {
  const store = readStore()
  res.json(store.admins.map(({ username, role, createdAt, mustChangePassword }) => ({ username, role, createdAt, mustChangePassword })))
})

app.post('/api/admin/users', auth, requireSuperAdmin, (req, res) => {
  const { username = '', password = '', role = 'admin' } = req.body || {}
  const cleanName = String(username).trim()
  const cleanRole = role === 'super_admin' ? 'super_admin' : 'admin'

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(cleanName)) {
    res.status(400).json({ message: '用户名需为 3-30 位字母、数字、下划线或中划线' })
    return
  }

  if (!password || String(password).length < 6) {
    res.status(400).json({ message: '初始密码至少 6 位' })
    return
  }

  const store = readStore()
  if (store.admins.some(item => item.username === cleanName)) {
    res.status(409).json({ message: '该用户名已存在' })
    return
  }

  store.admins.push(sanitizeAdminUser({ username: cleanName, password: String(password), role: cleanRole, mustChangePassword: true }, store.admins.length))
  appendAudit(store, {
    actor: req.user.username,
    action: 'add_admin',
    target: `${cleanName}(${cleanRole})`,
    detail: '新增管理员账号'
  })
  writeStore(store)
  res.status(201).json({ success: true })
})

app.patch('/api/admin/users/:username/role', auth, requireSuperAdmin, (req, res) => {
  const target = String(req.params.username || '').trim()
  const role = req.body?.role === 'super_admin' ? 'super_admin' : 'admin'

  const store = readStore()
  const index = store.admins.findIndex(item => item.username === target)

  if (index < 0) {
    res.status(404).json({ message: '账号不存在' })
    return
  }

  if (target === req.user.username && role !== 'super_admin') {
    res.status(400).json({ message: '不能将自己降级为普通管理员' })
    return
  }

  const superCount = store.admins.filter(item => item.role === 'super_admin').length
  if (store.admins[index].role === 'super_admin' && role !== 'super_admin' && superCount <= 1) {
    res.status(400).json({ message: '系统至少保留 1 个超级管理员' })
    return
  }

  store.admins[index].role = role
  appendAudit(store, {
    actor: req.user.username,
    action: 'set_role',
    target: `${target}(${role})`,
    detail: '修改管理员角色'
  })
  writeStore(store)
  res.json({ success: true })
})

app.delete('/api/admin/users/:username', auth, requireSuperAdmin, (req, res) => {
  const target = String(req.params.username || '').trim()
  const store = readStore()

  if (!target) {
    res.status(400).json({ message: '缺少用户名' })
    return
  }

  if (target === req.user.username) {
    res.status(400).json({ message: '不能删除当前登录账号' })
    return
  }

  const current = store.admins.find(item => item.username === target)
  if (!current) {
    res.status(404).json({ message: '账号不存在' })
    return
  }

  const nextAdmins = store.admins.filter(item => item.username !== target)

  if (!nextAdmins.length) {
    res.status(400).json({ message: '系统至少保留 1 个管理员' })
    return
  }

  if (current.role === 'super_admin' && !nextAdmins.some(item => item.role === 'super_admin')) {
    res.status(400).json({ message: '系统至少保留 1 个超级管理员' })
    return
  }

  store.admins = nextAdmins
  appendAudit(store, {
    actor: req.user.username,
    action: 'remove_admin',
    target,
    detail: '移除管理员账号'
  })
  writeStore(store)
  res.json({ success: true })
})

app.get('/api/admin/activity', auth, (_req, res) => {
  const store = readStore()
  res.json(store.auditLogs.slice(0, 50))
})

app.get('/api/handbook/published', (_req, res) => {
  const store = readStore()
  res.json(store.published)
})

app.get('/api/handbook/draft', auth, (_req, res) => {
  const store = readStore()
  res.json(store.draft)
})

app.put('/api/handbook/draft', auth, (req, res) => {
  const store = readStore()
  const nextDraft = sanitizeHandbook(req.body || {})
  store.draft = {
    ...nextDraft,
    updatedAt: new Date().toISOString(),
    publishedAt: store.draft.publishedAt || nextDraft.publishedAt
  }
  appendAudit(store, {
    actor: req.user.username,
    action: 'save_draft',
    target: 'handbook',
    detail: '保存草稿'
  })
  writeStore(store)
  res.json(store.draft)
})

app.post('/api/handbook/publish', auth, (req, res) => {
  const store = readStore()
  const now = new Date().toISOString()

  store.published = {
    ...sanitizeHandbook(store.draft),
    publishedAt: now,
    updatedAt: now
  }

  store.draft = {
    ...sanitizeHandbook(store.draft),
    publishedAt: now,
    updatedAt: now
  }

  appendAudit(store, {
    actor: req.user.username,
    action: 'publish',
    target: 'handbook',
    detail: '发布访客端内容'
  })
  writeStore(store)
  res.json(store.published)
})

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
})

app.post('/api/upload/image', auth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: '未收到文件' })
    return
  }

  const store = readStore()
  appendAudit(store, {
    actor: req.user.username,
    action: 'upload_image',
    target: req.file.filename,
    detail: '上传图片'
  })
  writeStore(store)

  const url = resolveUploadedUrl(req.file.filename, req)
  res.json({ url, strategy: STORAGE_DRIVER })
})

app.listen(PORT, () => {
  console.log(`meeting-handbook-backend listening on http://localhost:${PORT}`)
})
