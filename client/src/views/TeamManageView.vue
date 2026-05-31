<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Save, ShieldAlert, Trash2 } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
import UserAvatar from '../components/common/UserAvatar.vue';
import { useRealtime } from '../composables/useRealtime';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const router = useRouter();
const teams = useTeamsStore();
const teamId = computed(() => Number(route.params.id));
const busy = ref(false);
const adding = ref(false);
const error = ref('');
const loaded = ref(false);
const teamForm = reactive({ name: '', description: '' });
const addMemberForm = reactive({ identifier: '', role: 'member' });

// Reactive: true only if current user is admin of this specific team
const isAdmin = computed(() => {
  const team = teams.teams.find(t => t.id === teamId.value);
  return team?.role === 'admin';
});
const canManage = computed(() => isAdmin.value);

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
    if (!canManage.value) {
      router.replace({ name: 'work', query: { teams: teamId.value } });
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

async function addMember() {
  if (!canManage.value) return;
  adding.value = true;
  error.value = '';
  try {
    await teams.addMemberToTeam(teamId.value, {
      identifier: addMemberForm.identifier,
      role: addMemberForm.role
    });
    addMemberForm.identifier = '';
    addMemberForm.role = 'member';
  } catch (err) {
    error.value = err.message;
  } finally {
    adding.value = false;
  }
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
            <h1 class="page-title">Team Settings</h1>
            <p class="muted">You don't have permission to manage this team.</p>
          </div>
        </div>
        <div class="panel" style="padding:24px;display:flex;align-items:center;gap:12px;border-color:rgba(245,158,11,0.28)">
          <ShieldAlert :size="22" style="color:var(--warning);flex-shrink:0" />
          <span>Only team <strong>admins</strong> can access team management. Redirecting to Work...</span>
        </div>
      </template>

      <!-- Admin view: full management -->
      <template v-else>
        <div class="section-header">
          <div>
            <h1 class="page-title">Team Settings</h1>
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
              <form class="member-add-form" @submit.prevent="addMember">
                <label class="field" style="min-width:220px;flex:1">
                  <span>Username or email</span>
                  <input v-model="addMemberForm.identifier" class="input" required maxlength="254" placeholder="name@example.com" />
                </label>
                <label class="field" style="width:140px">
                  <span>Role</span>
                  <select v-model="addMemberForm.role" class="select">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button class="button" type="submit" :disabled="adding">
                  <Plus :size="17" /> Add
                </button>
              </form>
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
