<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BriefcaseBusiness, ListTodo, Plus, SlidersHorizontal } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import FilterBar from '../components/layout/FilterBar.vue';
import ActivityFeed from '../components/detail/ActivityFeed.vue';
import CreateItemModal from '../components/items/CreateItemModal.vue';
import ItemList from '../components/items/ItemList.vue';
import { useRealtime } from '../composables/useRealtime';
import { useAuthStore } from '../stores/auth';
import { useItemsStore, STATUSES } from '../stores/items';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const teams = useTeamsStore();
const items = useItemsStore();
const showCreate = ref(false);
const modalTeamId = ref(null);
const modalError = ref('');
const saving = ref(false);
const loaded = ref(false);
const mineOnly = computed(() => route.name === 'global-my-items');
const selectedTeamIds = computed(() => String(route.query.teams || '')
  .split(',')
  .map((id) => Number(id))
  .filter((id) => Number.isInteger(id) && id > 0));
const teamIdsForRealtime = computed(() => teams.teams.map((team) => team.id));
const filters = computed(() => ({
  status: route.query.status,
  assignee: mineOnly.value ? auth.user?.id : route.query.assignee,
  search: route.query.search,
  teams: route.query.teams
}));
const filterModel = computed(() => ({
  status: filters.value.status,
  assignee: mineOnly.value ? '' : filters.value.assignee,
  search: filters.value.search
}));
const activeTeamSet = computed(() => new Set(selectedTeamIds.value));
const relevantTeamIds = computed(() => selectedTeamIds.value.length
  ? selectedTeamIds.value
  : teams.teams.map((team) => team.id));
const members = computed(() => {
  const rows = relevantTeamIds.value.flatMap((teamId) => teams.membersForTeam(teamId));
  const byUser = new Map();
  rows.forEach((member) => {
    if (!byUser.has(member.user_id)) byUser.set(member.user_id, member);
  });
  return [...byUser.values()].sort((a, b) => a.user.display_name.localeCompare(b.user.display_name));
});
const modalMembers = computed(() => teams.membersForTeam(modalTeamId.value));


useRealtime(teamIdsForRealtime);

async function loadContext() {
  await teams.fetchTeams();
  await Promise.all(teams.teams.flatMap((team) => [
    teams.fetchMembers(team.id)
  ]));
  loaded.value = true;
  await Promise.all([
    fetchItems()
  ]);
}

async function fetchItems() {
  await items.fetchAllItems(filters.value);
}



function replaceQuery(next) {
  router.replace({ query: { ...route.query, ...next, view: undefined, offset: undefined } });
}

function updateFilters(next) {
  replaceQuery({
    ...next,
    assignee: mineOnly.value ? undefined : next.assignee
  });
}

function resetFilters() {
  router.replace({ query: route.query.teams ? { teams: route.query.teams } : {} });
}

function setScope(scope) {
  router.push({
    name: scope === 'mine' ? 'global-my-items' : 'work',
    query: { ...route.query, assignee: undefined, view: undefined, offset: undefined }
  });
}

function toggleTeam(teamId) {
  const next = new Set(selectedTeamIds.value);
  if (next.has(teamId)) next.delete(teamId);
  else next.add(teamId);
  replaceQuery({ teams: next.size ? [...next].join(',') : undefined });
}

async function openCreate() {
  const defaultTeamId = selectedTeamIds.value.length === 1 ? selectedTeamIds.value[0] : teams.teams[0]?.id;
  if (!defaultTeamId) return;
  modalTeamId.value = defaultTeamId;
  modalError.value = '';
  showCreate.value = true;
  await Promise.all([teams.fetchMembers(defaultTeamId)]);
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
    const targetTeamId = payload.team_id || modalTeamId.value;
    const { team_id, ...itemPayload } = payload;
    await items.createItem(targetTeamId, itemPayload);
    await fetchItems();
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

function openItem(item) {
  router.push(`/team/${item.team_id}/item/${item.id}`);
}

onMounted(loadContext);
watch(() => route.query, () => {
  if (loaded.value) {
    fetchItems();
  }
}, { deep: true });
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">{{ mineOnly ? 'My Items' : 'Work' }}</h1>
          <p class="muted">
            {{ mineOnly ? 'Assigned work across every team you belong to.' : 'All tracking items across your teams, filtered in one place.' }}
          </p>
        </div>
        <div class="toolbar">
          <div class="segmented" aria-label="Work scope">
            <button class="segment" :class="{ active: !mineOnly }" type="button" @click="setScope('all')">
              <BriefcaseBusiness :size="16" /> All Work
            </button>
            <button class="segment" :class="{ active: mineOnly }" type="button" @click="setScope('mine')">
              <ListTodo :size="16" /> Mine
            </button>
          </div>
          <button class="button" type="button" :disabled="!teams.teams.length" @click="openCreate">
            <Plus :size="17" /> New Item
          </button>
        </div>
      </div>


      <div class="team-filter-strip panel">
        <span class="team-filter-label"><SlidersHorizontal :size="16" /> Teams</span>
        <button
          class="team-filter-chip"
          :class="{ active: !selectedTeamIds.length }"
          type="button"
          @click="router.replace({ query: { ...route.query, teams: undefined } })"
        >
          All teams
        </button>
        <button
          v-for="team in teams.teams"
          :key="team.id"
          class="team-filter-chip"
          :class="{ active: activeTeamSet.has(team.id) }"
          type="button"
          @click="toggleTeam(team.id)"
        >
          {{ team.name }}
        </button>
      </div>

      <FilterBar
        :model-value="filterModel"
        :members="mineOnly ? [] : members"
        :hide-assignee="mineOnly"
        @update:model-value="updateFilters"
        @reset="resetFilters"
      />

      <div v-if="items.error" class="error-box">{{ items.error }}</div>
      <div v-if="items.loading || !loaded" class="empty">Loading work...</div>
      <template v-else-if="teams.teams.length">
        <ItemList
          :items="items.items"
          show-team
          @open="openItem"
          @status="changeStatus"
        />
      </template>
      <div v-else class="empty">
        <span>
          <BriefcaseBusiness :size="32" style="display:block;margin:0 auto 10px;color:var(--subtle)" />
          You are not assigned to any teams yet. Ask an instance admin to add you to a team.
        </span>
      </div>


    </section>

    <CreateItemModal
      :show="showCreate"
      :members="modalMembers"
      :available-teams="teams.teams"
      :selected-team-id="modalTeamId"
      show-team-select
      :busy="saving"
      :error="modalError"
      @close="showCreate = false"
      @team-change="changeModalTeam"
      @submit="createItem"
    />
  </main>
</template>
