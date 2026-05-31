<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Route as RouteIcon, CalendarClock } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import AppHeader from '../components/layout/AppHeader.vue';
import CreateItemModal from '../components/items/CreateItemModal.vue';
import ItemDetailPanel from '../components/detail/ItemDetailPanel.vue';
import ProgressTimeline from '../components/detail/ProgressTimeline.vue';
import { useRealtime } from '../composables/useRealtime';
import { useItemsStore } from '../stores/items';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const router = useRouter();
const teams = useTeamsStore();
const items = useItemsStore();
const { t } = useI18n();
const teamId = computed(() => Number(route.params.id));
const itemId = computed(() => Number(route.params.itemId));
const editOpen = ref(false);
const busy = ref(false);
const error = ref('');

useRealtime(teamId);

async function load() {
  await teams.fetchTeamContext(teamId.value);
  await items.fetchItem(itemId.value);
}

async function saveEdit(payload) {
  busy.value = true;
  error.value = '';
  try {
    await items.updateItem(itemId.value, payload);
    editOpen.value = false;
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function deleteItem() {
  if (!window.confirm(t('items.deleteConfirm'))) return;
  await items.deleteItem(itemId.value);
  await router.push({ name: 'work', query: { teams: teamId.value } });
}

async function postUpdate(payload) {
  busy.value = true;
  try {
    await items.postUpdate(itemId.value, payload);
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section item-detail-section">
      <div class="header-actions">
        <button class="button secondary icon-text" type="button" @click="router.push({ name: 'work', query: { teams: teamId } })">
          <ArrowLeft :size="16" /> {{ $t('items.backToWork') }}
        </button>
      </div>

      <div v-if="items.error" class="error-box">{{ items.error }}</div>
      <div v-if="items.loading || !items.activeItem" class="empty">{{ $t('items.loadingItem') }}</div>
      
      <div v-else class="detail-layout">
        <div class="main-content">
          <div class="item-header-card panel">
            <h1 class="modern-title">{{ items.activeItem.title }}</h1>
            <div class="header-meta">
              <span class="muted flex-align"><CalendarClock :size="14" class="mr-1"/> {{ $t('items.created', { date: new Date(items.activeItem.created_at).toLocaleDateString($i18n.locale) }) }}</span>
              <span class="muted" v-if="items.activeItem.description" style="display:block; margin-top: 12px; font-size: 1.05rem; line-height: 1.6;">
                {{ items.activeItem.description }}
              </span>
            </div>
          </div>

          <div class="updates-card panel">
            <div class="card-header">
              <h2 class="card-title"><RouteIcon :size="18" class="mr-2" /> {{ $t('updates.title') }}</h2>
              <p class="muted card-subtitle">{{ $t('updates.subtitle') }}</p>
            </div>
            <div class="card-body">
              <ProgressTimeline
                :updates="items.updatesForActive"
                :busy="busy"
                @submit="postUpdate"
              />
            </div>
          </div>
        </div>
        
        <aside class="sidebar-content">
          <ItemDetailPanel :item="items.activeItem" @edit="editOpen = true" @delete="deleteItem" />
        </aside>
      </div>
    </section>

    <CreateItemModal
      :show="editOpen"
      :item="items.activeItem"
      :members="teams.members"
      :busy="busy"
      :error="error"
      @close="editOpen = false"
      @submit="saveEdit"
    />
  </main>
</template>

<style scoped>
.item-detail-section {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.header-actions {
  margin-bottom: 8px;
}

.icon-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.icon-text:hover {
  background: var(--surface-soft);
  border-color: var(--border-strong);
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
}

.main-content {
  display: grid;
  gap: 24px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.item-header-card {
  padding: 24px 32px;
}

.modern-title {
  margin: 0 0 12px 0;
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
}

.header-meta {
  border-top: 1px solid var(--border);
  padding-top: 16px;
  margin-top: 16px;
}

.updates-card {
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}

.card-title {
  margin: 0 0 4px 0;
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  color: var(--text);
}

.card-subtitle {
  margin: 0;
  font-size: 0.9rem;
}

.card-body {
  padding: 24px;
}

.flex-align {
  display: flex;
  align-items: center;
}

.mr-1 { margin-right: 4px; }
.mr-2 { margin-right: 8px; }

@media (max-width: 980px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
