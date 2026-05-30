<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Activity, LayoutDashboard, ListTodo, Settings, ShieldCheck, Users, WifiOff } from 'lucide-vue-next';
import UserAvatar from '../common/UserAvatar.vue';
import { socketState } from '../../services/socket';
import { useAuthStore } from '../../stores/auth';
import { useTeamsStore } from '../../stores/teams';

const auth = useAuthStore();
const teams = useTeamsStore();
const route = useRoute();
const teamId = computed(() => Number(route.params.id || teams.activeTeamId));
</script>

<template>
  <header class="topbar">
    <RouterLink class="avatar-row" to="/teams">
      <span class="brand-mark">LT</span>
      <span>
        <strong>{{ teams.activeTeam?.name || 'LiteTrack' }}</strong>
        <small class="muted" style="display:block">Team progress tracker</small>
      </span>
    </RouterLink>

    <nav v-if="teamId" class="nav-links" aria-label="Team navigation">
      <RouterLink v-if="auth.user?.is_instance_admin" class="nav-link" to="/admin">
        <ShieldCheck :size="17" /> Admin
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'dashboard', params: { id: teamId } }">
        <LayoutDashboard :size="17" /> Dashboard
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'my-items', params: { id: teamId } }">
        <ListTodo :size="17" /> My Items
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'activity', params: { id: teamId } }">
        <Activity :size="17" /> Activity
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'settings', params: { id: teamId } }">
        <Settings :size="17" /> Settings
      </RouterLink>
    </nav>
    <nav v-else class="nav-links">
      <RouterLink v-if="auth.user?.is_instance_admin" class="nav-link" to="/admin">
        <ShieldCheck :size="17" /> Admin
      </RouterLink>
      <RouterLink class="nav-link" to="/teams"><Users :size="17" /> Teams</RouterLink>
    </nav>

    <div class="toolbar" style="justify-content:flex-end">
      <span v-if="teamId && !socketState.connected" class="badge offline">
        <WifiOff :size="14" /> Offline
      </span>
      <span class="avatar-row">
        <UserAvatar :user="auth.user" />
        <span style="min-width:0">
          <strong>{{ auth.user?.display_name }}</strong>
          <small class="muted" style="display:block">
            {{ auth.user?.username }}{{ auth.user?.is_instance_admin ? ' · instance admin' : '' }}
          </small>
        </span>
      </span>
    </div>
  </header>
</template>
