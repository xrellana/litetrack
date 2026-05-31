<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
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
const teamId = computed(() => Number(route.params.id));

useRealtime(teamId);

async function load() {
  await teams.fetchTeamContext(teamId.value);
  await items.fetchItems(teamId.value, { assignee: auth.user.id });
}

async function changeStatus(item, status) {
  if (item.status === status) return;
  await items.updateItem(item.id, { status, updated_at: item.updated_at });
}

onMounted(load);
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">{{ $t('work.myItems') }}</h1>
          <p class="muted">{{ $t('myItems.description', { name: auth.user?.display_name }) }}</p>
        </div>
      </div>
      <div v-if="items.error" class="error-box">{{ items.error }}</div>
      <div v-if="items.loading" class="empty">{{ $t('myItems.loading') }}</div>
      <ItemList v-else :items="items.items" @open="router.push(`/team/${teamId}/item/${$event.id}`)" @status="changeStatus" />
    </section>
  </main>
</template>
