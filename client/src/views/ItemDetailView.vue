<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MessageSquare, Route as RouteIcon } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import CommentSection from '../components/detail/CommentSection.vue';
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
const teamId = computed(() => Number(route.params.id));
const itemId = computed(() => Number(route.params.itemId));
const tab = ref('updates');
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
  if (!window.confirm('Delete this item?')) return;
  await items.deleteItem(itemId.value);
  await router.push(`/team/${teamId.value}`);
}

async function postUpdate(payload) {
  busy.value = true;
  try {
    await items.postUpdate(itemId.value, payload);
  } finally {
    busy.value = false;
  }
}

async function postComment(payload) {
  busy.value = true;
  try {
    await items.postComment(itemId.value, payload);
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <button class="button secondary" type="button" style="width:max-content" @click="router.push(`/team/${teamId}`)">
        Back to dashboard
      </button>
      <div v-if="items.error" class="error-box">{{ items.error }}</div>
      <div v-if="items.loading || !items.activeItem" class="empty">Loading item...</div>
      <div v-else class="detail-grid">
        <section class="stack">
          <div class="section-header">
            <div>
              <h1 class="page-title" style="font-size:2.4rem">{{ items.activeItem.title }}</h1>
              <p class="muted">Updates and comments are plain text.</p>
            </div>
            <div class="segmented">
              <button class="segment" :class="{ active: tab === 'updates' }" type="button" @click="tab = 'updates'">
                <RouteIcon :size="16" /> Updates
              </button>
              <button class="segment" :class="{ active: tab === 'comments' }" type="button" @click="tab = 'comments'">
                <MessageSquare :size="16" /> Comments
              </button>
            </div>
          </div>
          <ProgressTimeline
            v-if="tab === 'updates'"
            :updates="items.updatesForActive"
            :busy="busy"
            @submit="postUpdate"
          />
          <CommentSection
            v-else
            :comments="items.commentsForActive"
            :busy="busy"
            @submit="postComment"
          />
        </section>
        <ItemDetailPanel :item="items.activeItem" @edit="editOpen = true" @delete="deleteItem" />
      </div>
    </section>

    <CreateItemModal
      :show="editOpen"
      :item="items.activeItem"
      :members="teams.members"
      :tags="teams.tags"
      :busy="busy"
      :error="error"
      @close="editOpen = false"
      @submit="saveEdit"
    />
  </main>
</template>

