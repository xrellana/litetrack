<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { Save, User } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const route = useRoute();
const auth = useAuthStore();
const displayName = ref(auth.user?.display_name || '');
const busy = ref(false);
const error = ref('');
const saved = ref(false);

async function saveProfile() {
  busy.value = true;
  error.value = '';
  saved.value = false;
  try {
    const response = await api.patch('/auth/me', { display_name: displayName.value });
    auth.user = response.data.data.user;
    saved.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="muted">Your account preferences.</p>
        </div>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <form class="panel stack" style="padding:24px;max-width:560px" @submit.prevent="saveProfile">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <User :size="20" style="color:var(--muted)" />
          <h2 style="margin:0;font-size:1.1rem">Profile</h2>
        </div>

        <label class="field">
          <span>Display name</span>
          <input v-model="displayName" class="input" maxlength="80" required :disabled="busy" />
        </label>

        <label class="field">
          <span>Username</span>
          <input class="input" :value="auth.user?.username" disabled style="opacity:0.55" />
        </label>

        <label class="field">
          <span>Email</span>
          <input class="input" :value="auth.user?.email" disabled style="opacity:0.55" />
        </label>

        <div style="display:flex;align-items:center;gap:12px">
          <button class="button" type="submit" :disabled="busy">
            <Save :size="17" /> Save
          </button>
          <span v-if="saved" style="color:var(--success);font-size:0.9rem">✓ Saved</span>
        </div>
      </form>
    </section>
  </main>
</template>
