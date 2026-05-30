import { defineStore } from 'pinia';
import api from '../services/api';

export const useAdminStore = defineStore('admin', {
  state: () => ({
    summary: { teams: 0, users: 0, memberships: 0, instance_admins: 0 },
    teams: [],
    users: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchOverview() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/overview');
        this.summary = response.data.data.summary;
        this.teams = response.data.data.teams;
        this.users = response.data.data.users;
        return response.data.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async changeMemberRole(teamId, userId, role) {
      await api.patch(`/teams/${teamId}/members/${userId}`, { role });
      await this.fetchOverview();
    },
    async removeMember(teamId, userId) {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      await this.fetchOverview();
    }
  }
});
