<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Activity, Home, LayoutDashboard, ListTodo, LogOut, Settings, ShieldCheck, Users, WifiOff, Sun, Moon, Monitor } from 'lucide-vue-next';
import UserAvatar from '../common/UserAvatar.vue';
import { socketState } from '../../services/socket';
import { useAuthStore } from '../../stores/auth';
import { useTeamsStore } from '../../stores/teams';
import { useTheme } from '../../composables/useTheme';

const auth = useAuthStore();
const teams = useTeamsStore();
const { themePref, cycleTheme } = useTheme();
const route = useRoute();
const router = useRouter();
const teamId = computed(() => Number(route.params.id || teams.activeTeamId));

async function handleLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="topbar">
    <RouterLink class="avatar-row" to="/">
      <span class="brand-mark">LT</span>
      <strong>{{ teams.activeTeam?.name || 'LiteTrack' }}</strong>
    </RouterLink>

    <nav v-if="auth.user?.is_instance_admin" class="nav-links" aria-label="Admin navigation">
      <RouterLink class="nav-link" :to="{ name: 'admin-overview' }"><ShieldCheck :size="17" /> Overview</RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'admin-teams' }"><Users :size="17" /> Teams</RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'admin-users' }"><Users :size="17" /> Users</RouterLink>
    </nav>
    <nav v-else-if="teamId" class="nav-links" aria-label="Team navigation">
      <RouterLink class="nav-link" :to="{ name: 'dashboard', params: { id: teamId } }">
        <LayoutDashboard :size="17" /> Dashboard
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'my-items', params: { id: teamId } }">
        <ListTodo :size="17" /> My Items
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'activity', params: { id: teamId } }">
        <Activity :size="17" /> Activity
      </RouterLink>
      <RouterLink v-if="teams.isAdmin" class="nav-link" :to="{ name: 'team-manage', params: { id: teamId } }">
        <Users :size="17" /> Team
      </RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'settings', params: { id: teamId } }">
        <Settings :size="17" /> Settings
      </RouterLink>
    </nav>
    <nav v-else class="nav-links">
      <RouterLink class="nav-link" to="/"><Home :size="17" /> Home</RouterLink>
      <RouterLink class="nav-link" to="/teams"><Users :size="17" /> Teams</RouterLink>
    </nav>

    <div class="toolbar">
      <span v-if="teamId && !socketState.connected" class="badge offline">
        <WifiOff :size="14" /> Offline
      </span>

      <span class="avatar-row">
        <UserAvatar :user="auth.user" />
        <strong>{{ auth.user?.display_name }}</strong>
      </span>
      
      <button class="button icon secondary" title="Toggle Theme" @click="cycleTheme">
        <Sun v-if="themePref === 'light'" :size="18" />
        <Moon v-else-if="themePref === 'dark'" :size="18" />
        <Monitor v-else :size="18" />
      </button>
      <button class="button icon" title="Logout" @click="handleLogout">
        <LogOut :size="18" />
      </button>
    </div>
  </header>
</template>
