<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Settings } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import FilterBar from '../components/layout/FilterBar.vue';
import ActivityFeed from '../components/detail/ActivityFeed.vue';
import CreateItemModal from '../components/items/CreateItemModal.vue';
import ItemList from '../components/items/ItemList.vue';
import { useRealtime } from '../composables/useRealtime';
import { useActivityStore } from '../stores/activity';
import { useItemsStore } from '../stores/items';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const router = useRouter();
const teams = useTeamsStore();
const items = useItemsStore();
const activity = useActivityStore();
const showCreate = ref(false);
const modalTeamId = ref(null);
const modalError = ref('');
const saving = ref(false);
const teamId = computed(() => Number(route.params.id));
const filters = computed(() => ({
  status: route.query.status,
  assignee: route.query.assignee,
  search: route.query.search
}));
const modalMembers = computed(() => teams.membersForTeam(modalTeamId.value || teamId.value));

useRealtime(teamId);

async function load() {
  await Promise.all([
    teams.fetchTeamContext(teamId.value),
    items.fetchItems(teamId.value, filters.value)
  ]);
  await activity.fetchActivity(teamId.value, { limit: 12 }).catch(() => {});
}

function updateFilters(next) {
  router.replace({ query: { ...route.query, ...next, view: undefined, offset: undefined } });
}

function resetFilters() {
  router.replace({ query: {} });
}

async function openCreate() {
  modalTeamId.value = teamId.value;
  modalError.value = '';
  showCreate.value = true;
  await Promise.all([teams.fetchMembers(modalTeamId.value)]);
}

async function changeModalTeam(nextTeamId) {
  modalTeamId.value = Number(nextTeamId);
  modalError.value = '';
  try {
    await Promise.all([teams.fetchMembers(modalTeamId.value)]);
  } catch (error) {
    modalError.value = error.message;
  }
}

async function createItem(payload) {
  modalError.value = '';
  saving.value = true;
  try {
    const { team_id, ...itemPayload } = payload;
    await items.createItem(teamId.value, itemPayload);
    showCreate.value = false;
  } catch (error) {
    modalError.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function changeStatus(item, status) {
  if (item.status === status) return;
  await items.updateItem(item.id, { status, updated_at: item.updated_at });
}

onMounted(load);
watch(() => route.query, () => items.fetchItems(teamId.value, filters.value), { deep: true });
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">{{ teams.activeTeam?.name || $t('common.team') }}</h1>
          <p class="muted">{{ teams.activeTeam?.description || $t('work.allDescription') }}</p>
        </div>
        <div class="toolbar">
          <RouterLink v-if="teams.isAdmin" class="button secondary" :to="{ name: 'team-manage', params: { id: teamId } }">
            <Settings :size="17" /> {{ $t('teams.settingsTitle') }}
          </RouterLink>
          <button class="button" type="button" @click="openCreate">
            <Plus :size="17" /> {{ $t('work.newItem') }}
          </button>
        </div>
      </div>

      <FilterBar
        :model-value="filters"
        :members="teams.members"
        @update:model-value="updateFilters"
        @reset="resetFilters"
      />
      <div v-if="items.error" class="error-box">{{ items.error }}</div>
      <div v-if="items.loading" class="empty">{{ $t('items.loadingItems') }}</div>
      <template v-else>
        <ItemList :items="items.items" @open="router.push(`/team/${teamId}/item/${$event.id}`)" @status="changeStatus" />
      </template>

      <section class="team-activity-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">{{ $t('activity.teamRecentTitle') }}</h2>
            <p class="muted">{{ $t('activity.teamRecentDescription') }}</p>
          </div>
        </div>
        <div v-if="activity.error" class="error-box">{{ activity.error }}</div>
        <div v-else-if="activity.loading" class="empty compact">{{ $t('activity.loading') }}</div>
        <ActivityFeed v-else :rows="activity.rows" />
      </section>
    </section>

    <CreateItemModal
      :show="showCreate"
      :members="modalMembers"
      :available-teams="teams.teams"
      :selected-team-id="modalTeamId || teamId"
      :busy="saving"
      :error="modalError"
      @close="showCreate = false"
      @team-change="changeModalTeam"
      @submit="createItem"
    />
  </main>
</template>
