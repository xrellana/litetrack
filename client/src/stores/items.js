import { defineStore } from 'pinia';
import api from '../services/api';

export const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' }
];

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

export const useItemsStore = defineStore('items', {
  state: () => ({
    itemsById: {},
    viewIds: [],
    activeItemId: null,
    updatesByItem: {},
    commentsByItem: {},
    loading: false,
    error: null,
    page: { limit: 50, offset: 0, total: 0 }
  }),
  getters: {
    items: (state) => state.viewIds.map((id) => state.itemsById[id]).filter(Boolean),
    activeItem: (state) => state.itemsById[state.activeItemId] || null,
    updatesForActive: (state) => state.updatesByItem[state.activeItemId] || [],
    commentsForActive: (state) => state.commentsByItem[state.activeItemId] || []
  },
  actions: {
    upsertItem(item) {
      if (!item) return;
      this.itemsById = { ...this.itemsById, [item.id]: item };
      if (this.viewIds.length && !this.viewIds.includes(item.id)) {
        this.viewIds = [item.id, ...this.viewIds];
      }
    },
    removeItem(itemId) {
      const id = Number(itemId);
      const copy = { ...this.itemsById };
      delete copy[id];
      this.itemsById = copy;
      this.viewIds = this.viewIds.filter((rowId) => rowId !== id);
      if (this.activeItemId === id) this.activeItemId = null;
    },
    upsertUpdate(itemId, update) {
      const id = Number(itemId);
      const rows = this.updatesByItem[id] || [];
      const index = rows.findIndex((row) => row.id === update.id);
      const next = index >= 0 ? rows.map((row) => (row.id === update.id ? update : row)) : [...rows, update];
      this.updatesByItem = { ...this.updatesByItem, [id]: next };
    },
    upsertComment(itemId, comment) {
      const id = Number(itemId);
      const rows = this.commentsByItem[id] || [];
      const index = rows.findIndex((row) => row.id === comment.id);
      const next = index >= 0 ? rows.map((row) => (row.id === comment.id ? comment : row)) : [...rows, comment];
      this.commentsByItem = { ...this.commentsByItem, [id]: next };
    },
    async fetchItems(teamId, filters = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/teams/${teamId}/items`, { params: filters });
        const rows = response.data.data;
        this.itemsById = { ...this.itemsById, ...Object.fromEntries(rows.map((item) => [item.id, item])) };
        this.viewIds = rows.map((item) => item.id);
        this.page = response.data.page;
        return rows;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchItem(itemId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/items/${itemId}`);
        const { item, updates, comments } = response.data.data;
        this.activeItemId = item.id;
        this.upsertItem(item);
        this.updatesByItem = { ...this.updatesByItem, [item.id]: updates };
        this.commentsByItem = { ...this.commentsByItem, [item.id]: comments };
        return response.data.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async createItem(teamId, payload) {
      const response = await api.post(`/teams/${teamId}/items`, payload);
      this.upsertItem(response.data.data);
      return response.data.data;
    },
    async updateItem(itemId, payload) {
      const response = await api.put(`/items/${itemId}`, payload);
      this.upsertItem(response.data.data);
      return response.data.data;
    },
    async deleteItem(itemId) {
      await api.delete(`/items/${itemId}`);
      this.removeItem(itemId);
    },
    async postUpdate(itemId, payload) {
      const response = await api.post(`/items/${itemId}/updates`, payload);
      this.upsertUpdate(itemId, response.data.data);
      return response.data.data;
    },
    async postComment(itemId, payload) {
      const response = await api.post(`/items/${itemId}/comments`, payload);
      this.upsertComment(itemId, response.data.data);
      return response.data.data;
    }
  }
});

