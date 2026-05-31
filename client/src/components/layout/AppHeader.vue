<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { BriefcaseBusiness, LogOut, Settings, ShieldCheck, Users, WifiOff, Sun, Moon, Monitor } from 'lucide-vue-next';
import UserAvatar from '../common/UserAvatar.vue';
import { socketState } from '../../services/socket';
import { useAuthStore } from '../../stores/auth';
import { useTeamsStore } from '../../stores/teams';
import { useTheme } from '../../composables/useTheme';
import LanguageSwitcher from '../LanguageSwitcher.vue';

const auth = useAuthStore();
const teams = useTeamsStore();
const { themePref, cycleTheme } = useTheme();
const route = useRoute();
const router = useRouter();
const teamId = computed(() => Number(route.params.id) || null);
const workActive = computed(() => ['work', 'global-my-items'].includes(route.name));
const teamsActive = computed(() => route.name === 'teams' || route.path.startsWith('/team/'));
const hasTeamAdminAccess = computed(() => teams.teams.some((team) => team.role === 'admin'));

async function handleLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="topbar">
    <RouterLink class="avatar-row" to="/">
      <span class="brand-mark">LT</span>
      <strong>LiteTrack</strong>
    </RouterLink>

    <nav v-if="auth.user?.is_instance_admin" class="nav-links" aria-label="Admin navigation">
      <RouterLink class="nav-link" :to="{ name: 'admin-overview' }"><ShieldCheck :size="17" /> Overview</RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'admin-teams' }"><Users :size="17" /> Teams</RouterLink>
      <RouterLink class="nav-link" :to="{ name: 'admin-users' }"><Users :size="17" /> Users</RouterLink>
    </nav>
    <nav v-else class="nav-links" aria-label="Work navigation">
      <RouterLink class="nav-link" :class="{ 'router-link-active': workActive }" :to="{ name: 'work' }">
        <BriefcaseBusiness :size="17" /> Work
      </RouterLink>
      <RouterLink v-if="hasTeamAdminAccess" class="nav-link" :class="{ 'router-link-active': teamsActive }" to="/teams">
        <Users :size="17" /> Teams
      </RouterLink>
    </nav>

    <div class="toolbar">
      <span v-if="teamId && !socketState.connected" class="badge offline">
        <WifiOff :size="14" /> Offline
      </span>

      <span class="avatar-row">
        <UserAvatar :user="auth.user" />
        <strong>{{ auth.user?.display_name }}</strong>
      </span>

      <LanguageSwitcher />

      <RouterLink class="button icon secondary" title="Account Settings" :to="{ name: 'settings' }">
        <Settings :size="18" />
      </RouterLink>
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
