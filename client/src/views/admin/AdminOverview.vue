<script setup>
import { onMounted } from 'vue';
import { ShieldCheck } from 'lucide-vue-next';
import AppHeader from '../../components/layout/AppHeader.vue';
import { useAdminStore } from '../../stores/admin';

const admin = useAdminStore();

onMounted(() => admin.fetchOverview());
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Admin Console</h1>
          <p class="muted">Instance-wide overview.</p>
        </div>
        <span class="badge in_progress"><ShieldCheck :size="14" /> Instance admin</span>
      </div>

      <div v-if="admin.error" class="error-box">{{ admin.error }}</div>
      <div v-if="admin.loading" class="empty">Loading instance overview...</div>

      <template v-else>
        <div class="stat-strip">
          <div class="stat-cell">
            <span class="muted">Teams</span>
            <strong>{{ admin.summary.teams }}</strong>
          </div>
          <div class="stat-cell">
            <span class="muted">Users</span>
            <strong>{{ admin.summary.users }}</strong>
          </div>
          <div class="stat-cell">
            <span class="muted">Memberships</span>
            <strong>{{ admin.summary.memberships }}</strong>
          </div>
          <div class="stat-cell">
            <span class="muted">Instance admins</span>
            <strong>{{ admin.summary.instance_admins }}</strong>
          </div>
        </div>
      </template>
    </section>
  </main>
</template>
