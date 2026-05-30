<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Save, ShieldAlert, Trash2 } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
import UserAvatar from '../components/common/UserAvatar.vue';
import { useRealtime } from '../composables/useRealtime';
import { useAuthStore } from '../stores/auth';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const teams = useTeamsStore();
const teamId = computed(() => Number(route.params.id));
const busy = ref(false);
const error = ref('');
const loaded = ref(false);
const teamForm = reactive({ name: '', description: '' });

// Reactive: true only if current user is admin of this specific team
const isAdmin = computed(() => {
  const team = teams.teams.find(t => t.id === teamId.value);
  return team?.role === 'admin' || team?.role === 'instance_admin';
});
const isInstanceAdmin = computed(() => Boolean(auth.user?.is_instance_admin));
const canManage = computed(() => isAdmin.value || isInstanceAdmin.value);

useRealtime(teamId);

watch(
  () => teams.activeTeam,
  (team) => {
    teamForm.name = team?.name || '';
    teamForm.description = team?.description || '';
  },
  { immediate: true }
);

async function load() {
  try {
    await teams.fetchTeamContext(teamId.value);
    loaded.value = true;
    // Redirect non-admin members away from this page entirely
    if (!canManage.value) {
      router.replace({ name: 'dashboard', params: { id: teamId.value } });
    }
  } catch (err) {
    error.value = err.message;
    loaded.value = true;
  }
}

async function saveTeam() {
  if (!canManage.value) return;
  busy.value = true;
  error.value = '';
  try {
    await teams.updateTeam(teamId.value, teamForm);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

async function changeRole(member, role) {
  if (!canManage.value) return;
  await teams.changeMemberRole(teamId.value, member.user_id, role);
}

async function removeMember(member) {
  if (!canManage.value) return;
  if (!window.confirm(`Remove ${member.user.display_name} from this team?`)) return;
  await teams.removeMemberFromTeam(teamId.value, member.user_id);
}

onMounted(load);
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <!-- While checking permissions, show loading -->
      <div v-if="!loaded" class="empty">Loading...</div>

      <!-- Non-admin: never renders the form, shows redirect notice briefly -->
      <template v-else-if="!canManage">
        <div class="section-header">
          <div>
            <h1 class="page-title">Team</h1>
            <p class="muted">You don't have permission to manage this team.</p>
          </div>
        </div>
        <div class="panel" style="padding:24px;display:flex;align-items:center;gap:12px;border-color:rgba(245,158,11,0.28)">
          <ShieldAlert :size="22" style="color:var(--warning);flex-shrink:0" />
          <span>Only team <strong>admins</strong> can access team management. Redirecting to dashboard...</span>
        </div>
      </template>

      <!-- Admin view: full management -->
      <template v-else>
        <div class="section-header">
          <div>
            <h1 class="page-title">Team</h1>
            <p class="muted">Manage team profile and members.</p>
          </div>
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <div class="settings-grid">
          <section class="stack">
            <form class="panel stack" style="padding:18px" @submit.prevent="saveTeam">
              <h2 style="margin:0">Team info</h2>
              <label class="field">
                <span>Name</span>
                <input v-model="teamForm.name" class="input" maxlength="80" required />
              </label>
              <label class="field">
                <span>Description</span>
                <textarea v-model="teamForm.description" class="textarea" maxlength="5000" />
              </label>
              <button class="button" type="submit" :disabled="busy">
                <Save :size="17" /> Save
              </button>
            </form>

            <section class="panel stack" style="padding:18px">
              <h2 style="margin:0">Members</h2>
              <div v-for="member in teams.members" :key="member.user_id" class="activity-row">
                <div class="section-header" style="align-items:center">
                  <span class="avatar-row">
                    <UserAvatar :user="member.user" />
                    <span>
                      <strong>{{ member.user.display_name }}</strong>
                      <small class="muted" style="display:block">{{ member.user.email }}</small>
                    </span>
                  </span>
                  <div class="toolbar">
                    <select
                      class="select"
                      style="width:130px"
                      :value="member.role"
                      @change="changeRole(member, $event.target.value)"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      class="button icon danger"
                      type="button"
                      title="Remove member"
                      @click="removeMember(member)"
                    >
                      <Trash2 :size="17" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>
      </template>
    </section>
  </main>
</template>
