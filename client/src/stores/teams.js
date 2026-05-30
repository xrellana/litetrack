import { defineStore } from 'pinia';
import api from '../services/api';

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    teams: [],
    activeTeamId: null,
    membersByTeamId: {},
    tagsByTeamId: {},
    loading: false,
    error: null
  }),
  getters: {
    activeTeam: (state) => state.teams.find((team) => team.id === Number(state.activeTeamId)) || null,
    members: (state) => Object.values(state.membersByTeamId[state.activeTeamId] || {}),
    tags: (state) => Object.values(state.tagsByTeamId[state.activeTeamId] || {}).sort((a, b) => a.name.localeCompare(b.name)),
    membersForTeam: (state) => (teamId) => Object.values(state.membersByTeamId[Number(teamId)] || {}),
    tagsForTeam: (state) => (teamId) => Object.values(state.tagsByTeamId[Number(teamId)] || {}).sort((a, b) => a.name.localeCompare(b.name)),
    currentRole: (state) => {
      const team = state.teams.find((row) => row.id === Number(state.activeTeamId));
      return team?.role || 'member';
    },
    isAdmin() {
      return this.currentRole === 'admin' || this.currentRole === 'instance_admin';
    }
  },
  actions: {
    setActiveTeam(teamId) {
      this.activeTeamId = Number(teamId);
    },
    upsertTeam(team) {
      if (!team) return;
      const index = this.teams.findIndex((row) => row.id === team.id);
      if (index >= 0) this.teams[index] = { ...this.teams[index], ...team };
      else this.teams.unshift(team);
    },
    upsertMember(member) {
      if (!member) return;
      const teamId = Number(member.team_id || this.activeTeamId);
      this.membersByTeamId = {
        ...this.membersByTeamId,
        [teamId]: {
          ...(this.membersByTeamId[teamId] || {}),
          [member.user_id]: member
        }
      };
    },
    removeMember(userId, teamId = this.activeTeamId) {
      const targetTeamId = Number(teamId);
      const copy = { ...(this.membersByTeamId[targetTeamId] || {}) };
      delete copy[Number(userId)];
      this.membersByTeamId = { ...this.membersByTeamId, [targetTeamId]: copy };
    },
    upsertTag(tag) {
      if (!tag) return;
      const teamId = Number(tag.team_id || this.activeTeamId);
      this.tagsByTeamId = {
        ...this.tagsByTeamId,
        [teamId]: {
          ...(this.tagsByTeamId[teamId] || {}),
          [tag.id]: tag
        }
      };
    },
    removeTag(tagId, teamId = this.activeTeamId) {
      const targetTeamId = Number(teamId);
      const copy = { ...(this.tagsByTeamId[targetTeamId] || {}) };
      delete copy[Number(tagId)];
      this.tagsByTeamId = { ...this.tagsByTeamId, [targetTeamId]: copy };
    },
    async fetchTeams() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/teams');
        this.teams = response.data.data;
        return this.teams;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchMembers(teamId) {
      const response = await api.get(`/teams/${teamId}/members`);
      this.membersByTeamId = {
        ...this.membersByTeamId,
        [Number(teamId)]: Object.fromEntries(response.data.data.map((member) => [member.user_id, member]))
      };
      return response.data.data;
    },
    async fetchTags(teamId) {
      const response = await api.get(`/teams/${teamId}/tags`);
      this.tagsByTeamId = {
        ...this.tagsByTeamId,
        [Number(teamId)]: Object.fromEntries(response.data.data.map((tag) => [tag.id, tag]))
      };
      return response.data.data;
    },
    async fetchTeamContext(teamId) {
      this.setActiveTeam(teamId);
      await Promise.all([this.fetchTeams(), this.fetchMembers(teamId), this.fetchTags(teamId)]);
    },
    async createTeam(payload) {
      const response = await api.post('/teams', payload);
      this.upsertTeam(response.data.data);
      return response.data.data;
    },
    async joinTeam(inviteCode) {
      const response = await api.post('/teams/join', { invite_code: inviteCode });
      this.upsertTeam(response.data.data.team);
      this.upsertMember(response.data.data.member);
      return response.data.data.team;
    },
    async updateTeam(teamId, payload) {
      const response = await api.put(`/teams/${teamId}`, payload);
      this.upsertTeam(response.data.data);
      return response.data.data;
    },
    async regenerateInviteCode(teamId) {
      const response = await api.post(`/teams/${teamId}/invite-code/regenerate`);
      this.upsertTeam(response.data.data);
      return response.data.data;
    },
    async changeMemberRole(teamId, userId, role) {
      const response = await api.patch(`/teams/${teamId}/members/${userId}`, { role });
      this.upsertMember(response.data.data);
      return response.data.data;
    },
    async removeMemberFromTeam(teamId, userId) {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      this.removeMember(userId, teamId);
    },
    async createTag(teamId, payload) {
      const response = await api.post(`/teams/${teamId}/tags`, payload);
      this.upsertTag(response.data.data);
      return response.data.data;
    },
    async updateTag(tagId, payload) {
      const response = await api.put(`/tags/${tagId}`, payload);
      this.upsertTag(response.data.data);
      return response.data.data;
    },
    async deleteTag(tagId) {
      await api.delete(`/tags/${tagId}`);
      this.removeTag(tagId);
    }
  }
});
