import { defineStore } from 'pinia'
import { changePassword, getSavedToken, getSavedUsername, loginAdmin, logoutAdmin } from '../api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getSavedToken(),
    username: getSavedUsername(),
    forceChangePassword: false,
    loginError: '',
    loginSubmitting: false,
    loginMessage: ''
  }),
  getters: {
    isAuthed: state => Boolean(state.token)
  },
  actions: {
    async login(username, password) {
      this.loginError = ''
      this.loginMessage = ''
      this.loginSubmitting = true
      try {
        const result = await loginAdmin({ username, password })
        this.token = result.token
        this.username = result.username || username
        this.forceChangePassword = result.forceChangePassword
        this.loginMessage = result.forceChangePassword ? '登录成功，请先修改默认密码' : '登录成功'
        return result
      } catch (error) {
        this.loginError = error.message || '登录失败'
        throw error
      } finally {
        this.loginSubmitting = false
      }
    },
    async logout() {
      await logoutAdmin()
      this.token = ''
      this.username = ''
      this.forceChangePassword = false
      this.loginMessage = ''
    },
    async updatePassword(currentPassword, newPassword) {
      await changePassword({ currentPassword, newPassword })
      this.forceChangePassword = false
    }
  }
})
