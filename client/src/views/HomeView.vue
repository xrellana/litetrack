<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Users } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import { useAuthStore } from '../stores/auth';
import { useTeamsStore } from '../stores/teams';

const router = useRouter();
const auth = useAuthStore();
const teams = useTeamsStore();
const error = ref('');
const loading = ref(true);

onMounted(async () => {
  try {
    await teams.fetchTeams();
    // Jump straight into the first team's dashboard if user has teams
    if (teams.teams.length > 0) {
      await router.replace(`/team/${teams.teams[0].id}`);
      return;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div v-if="loading" class="empty">Loading...</div>
      <div v-else-if="error" class="error-box">{{ error }}</div>

      <!-- No teams yet: onboarding -->
      <template v-else>
        <div class="panel" style="padding:48px 32px;text-align:center;display:grid;gap:24px;place-items:center">
          <Users :size="56" style="color:var(--subtle)" />
          <div>
            <h1 style="margin:0 0 10px;font-size:1.5rem">Welcome to LiteTrack, {{ auth.user?.display_name || auth.user?.username }}</h1>
            <p class="muted" style="margin:0;max-width:480px">
              You're not in any team yet. Create a new workspace for your project, or ask a teammate for an invite code.
            </p>
          </div>
          <RouterLink to="/teams" class="button">
            <Plus :size="18" /> Go to Teams
          </RouterLink>
        </div>
      </template>
    </section>
  </main>
</template>
