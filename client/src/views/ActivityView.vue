<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
import ActivityFeed from '../components/detail/ActivityFeed.vue';
import { useRealtime } from '../composables/useRealtime';
import { useActivityStore } from '../stores/activity';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const activity = useActivityStore();
const teams = useTeamsStore();
const teamId = computed(() => Number(route.params.id));

useRealtime(teamId);

async function load() {
  await teams.fetchTeamContext(teamId.value);
  await activity.fetchActivity(teamId.value);
}

onMounted(load);
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">{{ $t('activity.title') }}</h1>
          <p class="muted">{{ $t('activity.recentDescription') }}</p>
        </div>
      </div>
      <div v-if="activity.error" class="error-box">{{ activity.error }}</div>
      <div v-if="activity.loading" class="empty">{{ $t('activity.loading') }}</div>
      <ActivityFeed v-else :rows="activity.rows" />
    </section>
  </main>
</template>
