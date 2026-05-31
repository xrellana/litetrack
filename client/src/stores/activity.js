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
    },
    async fetchActivityForTeams(teamIds, params = {}) {
      const ids = [...new Set(teamIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
      this.loading = true;
      this.error = null;
      try {
        if (!ids.length) {
          this.rows = [];
          this.page = { limit: params.limit || 50, offset: 0, total: 0 };
          return this.rows;
        }

        const responses = await Promise.all(ids.map((teamId) => (
          api.get(`/teams/${teamId}/activity`, { params }).then((response) => ({
            teamId,
            rows: response.data.data
          }))
        )));
        const limit = Number(params.limit || 50);
        this.rows = responses
          .flatMap(({ teamId, rows }) => rows.map((row) => ({ ...row, team_id: row.team_id || teamId })))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, limit);
        this.page = { limit, offset: 0, total: this.rows.length };
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
