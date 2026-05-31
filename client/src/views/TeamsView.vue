<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { BriefcaseBusiness, Settings } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import { useTeamsStore } from '../stores/teams';

const router = useRouter();
const teams = useTeamsStore();
const error = ref('');
const loaded = ref(false);
const adminTeams = computed(() => teams.teams.filter((team) => team.role === 'admin'));

onMounted(async () => {
  try {
    await teams.fetchTeams();
    if (!adminTeams.value.length) {
      await router.replace({ name: 'work' });
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loaded.value = true;
  }
});
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">{{ $t('teams.title') }}</h1>
          <p class="muted">
            {{ $t('teams.description') }}
          </p>
        </div>
        <RouterLink class="button secondary" :to="{ name: 'work' }">
          <BriefcaseBusiness :size="17" /> {{ $t('work.title') }}
        </RouterLink>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="teams.loading || !loaded" class="empty">{{ $t('teams.loading') }}</div>
      <div v-else-if="adminTeams.length" class="team-list panel">
        <article
          v-for="team in adminTeams"
          :key="team.id"
          class="team-list-row"
        >
          <div>
            <strong style="font-size:1.18rem">{{ team.name }}</strong>
            <small class="muted" style="display:block">{{ team.description || $t('teams.noDescription') }}</small>
          </div>
          <div class="item-meta">
            <span class="badge in_progress">{{ $t('teams.teamAdmin') }}</span>
            <span class="muted">{{ $t('teams.membersCount', { count: team.member_count }) }}</span>
          </div>
          <div class="team-row-actions">
            <RouterLink class="button secondary" :to="{ name: 'work', query: { teams: team.id } }">
              <BriefcaseBusiness :size="17" /> {{ $t('work.title') }}
            </RouterLink>
            <RouterLink class="button" :to="{ name: 'team-manage', params: { id: team.id } }">
              <Settings :size="17" /> {{ $t('common.settings') }}
            </RouterLink>
          </div>
        </article>
      </div>
      <div v-else class="empty">
        {{ $t('teams.adminOnly') }}
      </div>
    </section>
  </main>
</template>
