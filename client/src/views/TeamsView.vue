<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import { useAuthStore } from '../stores/auth';
import { useTeamsStore } from '../stores/teams';

const router = useRouter();
const auth = useAuthStore();
const teams = useTeamsStore();
const error = ref('');
const createForm = reactive({ name: '', description: '' });

onMounted(() => teams.fetchTeams().catch((err) => {
  error.value = err.message;
}));

async function createTeam() {
  error.value = '';
  try {
    const team = await teams.createTeam(createForm);
    createForm.name = '';
    createForm.description = '';
    await router.push(`/team/${team.id}`);
  } catch (err) {
    error.value = err.message;
  }
}

function roleLabel(role) {
  return role === 'instance_admin' ? 'instance admin' : role;
}
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Teams</h1>
          <p class="muted">
            {{ auth.user?.is_instance_admin ? 'Instance admins can see every team in this deployment.' : 'Choose a workspace or create a new one.' }}
          </p>
        </div>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <form class="panel stack" style="padding:18px" @submit.prevent="createTeam">
          <h2 style="margin:0">Create team</h2>
          <label class="field">
            <span>Name</span>
            <input v-model="createForm.name" class="input" maxlength="80" required />
          </label>
          <label class="field">
            <span>Description</span>
            <textarea v-model="createForm.description" class="textarea" maxlength="5000" />
          </label>
          <button class="button" type="submit" :disabled="teams.loading">
            <Plus :size="17" /> Create
          </button>
        </form>
      </div>

      <div class="grid team-grid">
        <button
          v-for="team in teams.teams"
          :key="team.id"
          class="team-tile"
          type="button"
          @click="router.push(`/team/${team.id}`)"
        >
          <span>
            <strong style="font-size:1.18rem">{{ team.name }}</strong>
            <small class="muted" style="display:block">{{ team.description || 'No description' }}</small>
          </span>
          <span class="item-meta">
            <span class="badge in_progress">{{ roleLabel(team.role) }}</span>
            <span class="muted">{{ team.member_count }} members</span>
          </span>
        </button>
      </div>
      <div v-if="!teams.loading && !teams.teams.length" class="empty">No teams yet.</div>
    </section>
  </main>
</template>
