import * as mock from './mockServer'

const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8090`
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, '')
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const TOKEN_KEY = 'meeting-h5-admin-token'
const USERNAME_KEY = 'meeting-h5-admin-user'

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

function getUsername() {
  return localStorage.getItem(USERNAME_KEY) || ''
}

function setAuth(token, username = '') {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    return
  }
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username || '')
}

function createHttpError(response, message) {
  const error = new Error(message || '请求失败')
  error.status = response.status
  return error
}

async function request(path, options = {}, auth = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (auth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (auth && response.status === 401) {
      setAuth('')
    }
    throw createHttpError(response, data.message)
  }
  return data
}

export async function loginAdmin(payload) {
  if (USE_MOCK) return mock.loginAdmin(payload)
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  setAuth(data.token || '', data.username || payload?.username || '')
  return data
}

export async function logoutAdmin() {
  if (USE_MOCK) return mock.logoutAdmin()
  try {
    await request('/api/auth/logout', { method: 'POST' }, true)
  } finally {
    setAuth('')
  }
}

export function getSavedToken() {
  if (USE_MOCK) return mock.getSavedToken()
  return getToken()
}

export function getSavedUsername() {
  if (USE_MOCK) return mock.getSavedUsername()
  return getUsername()
}

export async function fetchPublishedConfig() {
  if (USE_MOCK) return mock.fetchPublishedConfig()
  return request('/api/handbook/published')
}

export async function fetchDraftConfig() {
  if (USE_MOCK) return mock.fetchDraftConfig()
  return request('/api/handbook/draft', {}, true)
}

export async function saveDraftConfig(nextDraft) {
  if (USE_MOCK) return mock.saveDraftConfig(nextDraft)
  return request('/api/handbook/draft', {
    method: 'PUT',
    body: JSON.stringify(nextDraft)
  }, true)
}

export async function publishDraftConfig() {
  if (USE_MOCK) return mock.publishDraftConfig()
  return request('/api/handbook/publish', { method: 'POST' }, true)
}

export async function changePassword(payload) {
  if (USE_MOCK) return mock.changePassword(payload)
  return request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, true)
}

export async function listAdminUsers() {
  if (USE_MOCK) return mock.listAdminUsers()
  return request('/api/admin/users', {}, true)
}

export async function createAdminUser(payload) {
  if (USE_MOCK) return mock.createAdminUser(payload)
  return request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, true)
}

export async function removeAdminUser(username) {
  if (USE_MOCK) return mock.removeAdminUser(username)
  return request(`/api/admin/users/${encodeURIComponent(username)}`, {
    method: 'DELETE'
  }, true)
}

export async function listAuditLogs() {
  if (USE_MOCK) return mock.listAuditLogs()
  return request('/api/admin/activity', {}, true)
}

export async function uploadImage(file) {
  if (USE_MOCK) {
    return {
      url: URL.createObjectURL(file)
    }
  }

  const form = new FormData()
  form.append('file', file)

  const token = getToken()
  const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) setAuth('')
    throw createHttpError(response, data.message || '上传失败')
  }
  return data
}
