<script setup>
import { onMounted } from 'vue';
import { ShieldCheck, Users, Network, ArrowRight, Activity, Database, UserCog } from 'lucide-vue-next';
import AppHeader from '../../components/layout/AppHeader.vue';
import { useAdminStore } from '../../stores/admin';
import { RouterLink } from 'vue-router';

const admin = useAdminStore();

onMounted(() => admin.fetchOverview());
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">{{ $t('admin.consoleTitle') }}</h1>
          <p class="muted">{{ $t('admin.consoleDescription') }}</p>
        </div>
        <span class="badge in_progress"><ShieldCheck :size="14" /> {{ $t('admin.instanceAdmin') }}</span>
      </div>

      <div v-if="admin.error" class="error-box">{{ admin.error }}</div>
      <div v-if="admin.loading" class="empty">{{ $t('admin.loadingOverview') }}</div>

      <template v-else>
        <div class="admin-dashboard">
          
          <div class="dashboard-stats">
            <h2 class="section-title">{{ $t('admin.systemOverview') }}</h2>
            <div class="stat-grid">
              <div class="stat-card primary">
                <div class="stat-icon"><Network :size="24" /></div>
                <div class="stat-info">
                  <span class="stat-value">{{ admin.summary.teams }}</span>
                  <span class="stat-label">{{ $t('admin.activeTeams') }}</span>
                </div>
              </div>
              
              <div class="stat-card success">
                <div class="stat-icon"><Users :size="24" /></div>
                <div class="stat-info">
                  <span class="stat-value">{{ admin.summary.users }}</span>
                  <span class="stat-label">{{ $t('admin.totalUsers') }}</span>
                </div>
              </div>
              
              <div class="stat-card warning">
                <div class="stat-icon"><Activity :size="24" /></div>
                <div class="stat-info">
                  <span class="stat-value">{{ admin.summary.memberships }}</span>
                  <span class="stat-label">{{ $t('admin.memberships') }}</span>
                </div>
              </div>
              
              <div class="stat-card violet">
                <div class="stat-icon"><UserCog :size="24" /></div>
                <div class="stat-info">
                  <span class="stat-value">{{ admin.summary.instance_admins }}</span>
                  <span class="stat-label">{{ $t('admin.instanceAdmins') }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="dashboard-actions">
            <h2 class="section-title">{{ $t('admin.quickActions') }}</h2>
            <div class="action-cards">
              <RouterLink :to="{ name: 'admin-teams' }" class="action-card">
                <div class="action-icon primary"><Network :size="20" /></div>
                <div class="action-content">
                  <h3>{{ $t('admin.manageTeams') }}</h3>
                  <p class="muted">{{ $t('admin.manageTeamsDescription') }}</p>
                </div>
                <div class="action-arrow"><ArrowRight :size="18" /></div>
              </RouterLink>

              <RouterLink :to="{ name: 'admin-users' }" class="action-card">
                <div class="action-icon success"><Users :size="20" /></div>
                <div class="action-content">
                  <h3>{{ $t('admin.manageUsers') }}</h3>
                  <p class="muted">{{ $t('admin.manageUsersDescription') }}</p>
                </div>
                <div class="action-arrow"><ArrowRight :size="18" /></div>
              </RouterLink>
            </div>
          </div>
          
          <div class="dashboard-system">
            <h2 class="section-title">{{ $t('admin.systemStatus') }}</h2>
            <div class="system-panel">
              <div class="system-row">
                <div class="system-indicator online"><Activity :size="16" /></div>
                <div class="system-detail">
                  <strong>{{ $t('admin.apiServices') }}</strong>
                  <span class="muted">{{ $t('admin.apiServicesDescription') }}</span>
                </div>
                <span class="badge done">{{ $t('common.online') }}</span>
              </div>
              <div class="system-row">
                <div class="system-indicator online"><Database :size="16" /></div>
                <div class="system-detail">
                  <strong>{{ $t('admin.databaseCluster') }}</strong>
                  <span class="muted">{{ $t('admin.databaseDescription') }}</span>
                </div>
                <span class="badge done">{{ $t('common.online') }}</span>
              </div>
            </div>
          </div>

        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.admin-dashboard {
  display: grid;
  gap: 32px;
  margin-top: 10px;
}

.dashboard-stats, .dashboard-actions, .dashboard-system {
  display: grid;
  gap: 16px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.stat-card.primary .stat-icon { background: var(--primary-bg); color: var(--primary); }
.stat-card.success .stat-icon { background: rgba(16, 185, 129, 0.15); color: var(--success); }
.stat-card.warning .stat-icon { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
.stat-card.violet .stat-icon { background: rgba(139, 92, 246, 0.15); color: var(--violet); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.action-card:hover {
  border-color: var(--primary);
  background: var(--bg-2);
  transform: translateY(-2px);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.action-icon.primary { background: var(--primary-bg); color: var(--primary); }
.action-icon.success { background: rgba(16, 185, 129, 0.15); color: var(--success); }

.action-content h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
}

.action-content p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.action-arrow {
  margin-left: auto;
  color: var(--subtle);
  transition: transform 0.2s ease;
}

.action-card:hover .action-arrow {
  color: var(--primary);
  transform: translateX(4px);
}

.system-panel {
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  overflow: hidden;
}

.system-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.system-row:last-child {
  border-bottom: none;
}

.system-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.system-indicator.online {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.system-detail {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.system-detail strong {
  font-size: 0.95rem;
}

.system-detail .muted {
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
  .action-cards {
    grid-template-columns: 1fr;
  }
}
</style>
