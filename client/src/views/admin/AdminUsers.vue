<script setup>
import { computed, onMounted, ref } from 'vue';
import { ShieldCheck, Trash2, UserPlus, X } from 'lucide-vue-next';
import AppHeader from '../../components/layout/AppHeader.vue';
import UserAvatar from '../../components/common/UserAvatar.vue';
import { useAdminStore } from '../../stores/admin';
import { useAuthStore } from '../../stores/auth';

const admin = useAdminStore();
const auth = useAuthStore();

const instanceAdmins = computed(() => admin.users.filter((user) => user.is_instance_admin));

const assigningUserId = ref(null);
const assignForm = ref({ team_id: '', role: 'member' });

async function deleteUser(user) {
  if (user.id === auth.user?.id) {
    alert("You cannot delete yourself.");
    return;
  }
  if (!window.confirm(`Are you absolutely sure you want to delete user ${user.display_name}?`)) return;
  
  try {
    await admin.deleteUser(user.id);
  } catch (error) {
    alert(error.message);
  }
}

async function changeRole(teamId, userId, role) {
  await admin.changeMemberRole(teamId, userId, role);
}

async function removeMember(teamId, user) {
  if (!window.confirm(`Remove ${user.display_name} from this team?`)) return;
  await admin.removeMember(teamId, user.id);
}

function startAssign(userId) {
  assigningUserId.value = userId;
  assignForm.value = { team_id: '', role: 'member' };
}

function cancelAssign() {
  assigningUserId.value = null;
}

async function assignUser(user) {
  if (!assignForm.value.team_id) return;
  await admin.assignUserToTeam(user.id, assignForm.value.team_id, assignForm.value.role);
  assigningUserId.value = null;
}

function availableTeams(user) {
  const userTeamIds = user.memberships.map((m) => m.team_id);
  return admin.teams.filter((t) => !userTeamIds.includes(t.id));
}

onMounted(() => {
  if (!admin.users.length) admin.fetchOverview();
});
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Users Management</h1>
          <p class="muted">Instance-wide user directory.</p>
        </div>
        <span class="badge in_progress"><ShieldCheck :size="14" /> Instance admin</span>
      </div>

      <div v-if="admin.error" class="error-box">{{ admin.error }}</div>
      <div v-if="admin.loading && !admin.users.length" class="empty">Loading users...</div>

      <template v-else>
        <div class="admin-grid" style="grid-template-columns: 1fr">
          <aside class="stack">
            <section class="panel stack" style="padding:18px">
              <h2 style="margin:0">Instance admins</h2>
              <div v-for="user in instanceAdmins" :key="user.id" class="avatar-row">
                <UserAvatar :user="user" />
                <span>
                  <strong>{{ user.display_name }}</strong>
                  <small class="muted" style="display:block">{{ user.email }}</small>
                </span>
              </div>
            </section>

            <section class="panel stack" style="padding:18px">
              <h2 style="margin:0">User directory</h2>
              <div v-for="user in admin.users" :key="user.id" class="activity-row" style="display:grid; gap:16px;">
                <div class="section-header" style="align-items:center; margin:0">
                  <div class="avatar-row">
                    <UserAvatar :user="user" />
                    <span>
                      <strong>{{ user.display_name }}</strong>
                      <small class="muted" style="display:block">{{ user.username }} · {{ user.email }}</small>
                    </span>
                  </div>
                  <div class="toolbar">
                    <button v-if="user.id !== auth.user?.id" class="button icon danger" type="button" title="Delete user" @click="deleteUser(user)">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </div>
                
                <div class="item-meta" style="padding-top:8px; border-top:1px solid var(--border)">
                  <span v-if="user.is_instance_admin" class="badge in_progress" style="margin-right:8px">instance admin</span>
                  
                  <div
                    v-for="membership in user.memberships"
                    :key="membership.id"
                    class="badge"
                    style="display:inline-flex; align-items:center; gap:6px; padding:2px 4px 2px 8px; background:var(--surface-soft); border:1px solid var(--border)"
                  >
                    <span>{{ membership.team_name }}</span>
                    <select
                      class="select"
                      style="min-height:24px; height:24px; padding:0 16px 0 6px; font-size:0.75rem; width:auto; border:none; background:transparent"
                      :style="{ color: membership.role === 'admin' ? 'var(--primary)' : 'var(--text)' }"
                      :value="membership.role"
                      @change="changeRole(membership.team_id, user.id, $event.target.value)"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <button class="button icon secondary" style="width:20px; height:20px; min-height:20px; background:transparent; border:none" title="Remove from team" @click="removeMember(membership.team_id, user)">
                      <X :size="12" />
                    </button>
                  </div>
                  
                  <template v-if="assigningUserId === user.id">
                    <form @submit.prevent="assignUser(user)" style="display:inline-flex; gap:6px; align-items:center; background:var(--surface-soft); padding:2px; border-radius:8px">
                      <select v-model="assignForm.team_id" class="select" style="min-height:28px; height:28px; padding:0 8px; font-size:0.78rem" required>
                        <option value="" disabled>Select a team</option>
                        <option v-for="team in availableTeams(user)" :key="team.id" :value="team.id">{{ team.name }}</option>
                      </select>
                      <select v-model="assignForm.role" class="select" style="min-height:28px; height:28px; padding:0 8px; font-size:0.78rem" required>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button class="button" style="min-height:28px; height:28px; padding:0 8px; font-size:0.78rem" type="submit">Assign</button>
                      <button class="button icon secondary" style="width:28px; height:28px; min-height:28px" type="button" @click="cancelAssign">
                        <X :size="14" />
                      </button>
                    </form>
                  </template>
                  <button v-else class="button secondary" style="min-height:28px; padding:4px 8px; font-size:0.78rem; border-radius:999px" @click="startAssign(user.id)">
                    <UserPlus :size="14" /> Assign Team
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </section>
  </main>
</template>
