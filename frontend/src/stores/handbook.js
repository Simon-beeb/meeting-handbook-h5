import { defineStore } from 'pinia'
import { fetchDraftConfig, fetchPublishedConfig, publishDraftConfig, saveDraftConfig } from '../api/client'

export const useHandbookStore = defineStore('handbook', {
  state: () => ({
    published: null,
    draft: null,
    loading: false,
    saveMessage: ''
  }),
  getters: {
    modules: state => state.published?.modules || []
  },
  actions: {
    async loadPublished() {
      this.loading = true
      try {
        this.published = await fetchPublishedConfig()
      } finally {
        this.loading = false
      }
    },
    async loadDraft() {
      this.loading = true
      try {
        this.draft = await fetchDraftConfig()
      } finally {
        this.loading = false
      }
    },
    async saveDraft() {
      if (!this.draft) return
      this.draft = await saveDraftConfig(this.draft)
      this.saveMessage = '草稿已保存'
      setTimeout(() => {
        this.saveMessage = ''
      }, 1500)
    },
    async publishDraft() {
      this.published = await publishDraftConfig()
      this.draft = structuredClone(this.published)
      this.saveMessage = '已发布给访客端'
      setTimeout(() => {
        this.saveMessage = ''
      }, 1800)
    }
  }
})
