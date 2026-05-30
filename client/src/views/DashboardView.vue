<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LayoutGrid, List, Plus } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import FilterBar from '../components/layout/FilterBar.vue';
import CreateItemModal from '../components/items/CreateItemModal.vue';
import ItemBoard from '../components/items/ItemBoard.vue';
import ItemList from '../components/items/ItemList.vue';
import { useRealtime } from '../composables/useRealtime';
import { useAuthStore } from '../stores/auth';
import { useItemsStore } from '../stores/items';
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
const teamId = computed(() => Number(route.params.id));
const mode = computed(() => route.query.view === 'list' ? 'list' : 'board');
const filters = computed(() => ({
  status: route.query.status,
  assignee: route.query.assignee,
  tag: route.query.tag,
  search: route.query.search
}));
const modalMembers = computed(() => teams.membersForTeam(modalTeamId.value || teamId.value));
const modalTags = computed(() => teams.tagsForTeam(modalTeamId.value || teamId.value));

useRealtime(teamId);

async function load() {
  await teams.fetchTeamContext(teamId.value);
  await items.fetchItems(teamId.value, filters.value);
}

function updateFilters(next) {
  router.replace({ query: { ...route.query, ...next, offset: undefined } });
}

function resetFilters() {
  router.replace({ query: { view: mode.value } });
}

function setMode(next) {
  router.replace({ query: { ...route.query, view: next } });
}

async function openCreate() {
  modalTeamId.value = teamId.value;
  modalError.value = '';
  showCreate.value = true;
  await Promise.all([teams.fetchMembers(modalTeamId.value), teams.fetchTags(modalTeamId.value)]);
}

async function changeModalTeam(nextTeamId) {
  modalTeamId.value = Number(nextTeamId);
  modalError.value = '';
  try {
    await Promise.all([teams.fetchMembers(modalTeamId.value), teams.fetchTags(modalTeamId.value)]);
  } catch (error) {
    modalError.value = error.message;
  }
}

async function createItem(payload) {
  modalError.value = '';
  saving.value = true;
  try {
    const targetTeamId = auth.user?.is_instance_admin && payload.team_id ? payload.team_id : teamId.value;
    const { team_id, ...itemPayload } = payload;
    await items.createItem(targetTeamId, itemPayload);
    showCreate.value = false;
    if (targetTeamId !== teamId.value) {
      await router.push(`/team/${targetTeamId}`);
    }
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
          <h1 class="page-title">Dashboard</h1>
          <p class="muted">{{ teams.activeTeam?.description || 'Team work items by status.' }}</p>
        </div>
        <div class="toolbar">
          <div class="segmented" aria-label="View mode">
            <button class="segment" :class="{ active: mode === 'board' }" type="button" @click="setMode('board')">
              <LayoutGrid :size="16" /> Board
            </button>
            <button class="segment" :class="{ active: mode === 'list' }" type="button" @click="setMode('list')">
              <List :size="16" /> List
            </button>
          </div>
          <button class="button" type="button" @click="openCreate">
            <Plus :size="17" /> New Item
          </button>
        </div>
      </div>

      <FilterBar
        :model-value="filters"
        :members="teams.members"
        :tags="teams.tags"
        @update:model-value="updateFilters"
        @reset="resetFilters"
      />
      <div v-if="items.error" class="error-box">{{ items.error }}</div>
      <div v-if="items.loading" class="empty">Loading items...</div>
      <template v-else>
        <ItemBoard v-if="mode === 'board'" :items="items.items" @open="router.push(`/team/${teamId}/item/${$event.id}`)" @status="changeStatus" />
        <ItemList v-else :items="items.items" @open="router.push(`/team/${teamId}/item/${$event.id}`)" @status="changeStatus" />
      </template>
    </section>

    <CreateItemModal
      :show="showCreate"
      :members="modalMembers"
      :tags="modalTags"
      :available-teams="teams.teams"
      :selected-team-id="modalTeamId || teamId"
      :show-team-select="Boolean(auth.user?.is_instance_admin)"
      :busy="saving"
      :error="modalError"
      @close="showCreate = false"
      @team-change="changeModalTeam"
      @submit="createItem"
    />
  </main>
</template>
