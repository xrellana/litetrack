import { defineStore } from 'pinia';
import api from '../services/api';

export const useActivityStore = defineStore('activity', {
  state: () => ({
    rows: [],
    loading: false,
    error: null,
    page: { limit: 50, offset: 0, total: 0 }
  }),
  actions: {
    prepend(row) {
      if (!row) return;
      const exists = this.rows.some((activity) => activity.id === row.id);
      this.rows = exists ? this.rows : [row, ...this.rows].slice(0, 100);
    },
    async fetchActivity(teamId, params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/teams/${teamId}/activity`, { params });
        this.rows = response.data.data;
        this.page = response.data.page;
        return this.rows;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});
