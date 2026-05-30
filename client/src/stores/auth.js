import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loaded: false,
    loading: false,
    error: null
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user)
  },
  actions: {
    async fetchMe() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/auth/me');
        this.user = response.data.data.user;
      } catch (error) {
        this.user = null;
      } finally {
        this.loaded = true;
        this.loading = false;
      }
    },
    async login(payload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/login', payload);
        this.user = response.data.data.user;
        this.loaded = true;
        return this.user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async register(payload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/register', payload);
        this.user = response.data.data.user;
        this.loaded = true;
        return this.user;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});

