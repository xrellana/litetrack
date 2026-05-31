<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue';
import { Pencil, Save, ShieldCheck, Trash2, UserPlus, X } from 'lucide-vue-next';
import AppHeader from '../../components/layout/AppHeader.vue';
import UserAvatar from '../../components/common/UserAvatar.vue';
import { useAdminStore } from '../../stores/admin';
import { useAuthStore } from '../../stores/auth';

const admin = useAdminStore();
const auth = useAuthStore();

const instanceAdmins = computed(() => admin.users.filter((user) => user.is_instance_admin));

const createForm = reactive({
  username: '',
  email: '',
  display_name: '',
  password: ''
});
const creating = ref(false);
const createError = ref('');
const showCreateForm = ref(false);
const userNameInput = ref(null);
const assigningUserId = ref(null);
const assignForm = ref({ team_id: '', role: 'member' });
const editForm = reactive({
  id: null,
  display_name: '',
  email: '',
  password: ''
});
const editing = ref(false);
const editError = ref('');

// Watch for showCreateForm changes to focus input
watch(showCreateForm, (val) => {
  if (val) {
    nextTick(() => {
      userNameInput.value?.focus();
    });
  }
});

async function createUser() {
  createError.value = '';
  creating.value = true;
  try {
    await admin.createUser({
      username: createForm.username,
      email: createForm.email,
      display_name: createForm.display_name || undefined,
      password: createForm.password
    });
    createForm.username = '';
    createForm.email = '';
    createForm.display_name = '';
    createForm.password = '';
    showCreateForm.value = false;
  } catch (error) {
    createError.value = error.message;
  } finally {
    creating.value = false;
  }
}

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

function startEdit(user) {
  editError.value = '';
  editForm.id = user.id;
  editForm.display_name = user.display_name;
  editForm.email = user.email;
  editForm.password = '';
}

function cancelEdit() {
  editForm.id = null;
  editForm.display_name = '';
  editForm.email = '';
  editForm.password = '';
  editError.value = '';
}

async function submitEdit(user) {
  editError.value = '';
  editing.value = true;
  const payload = {
    display_name: editForm.display_name,
    email: editForm.email
  };
  const password = editForm.password.trim();
  if (password) {
    payload.password = password;
  }

  try {
    const updatedUser = await admin.updateUser(user.id, payload);
    if (user.id === auth.user?.id) {
      auth.user = { ...auth.user, ...updatedUser };
    }
    cancelEdit();
  } catch (error) {
    editError.value = error.message;
  } finally {
    editing.value = false;
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

            <div v-if="!showCreateForm" class="toolbar" style="margin-bottom: 16px;">
              <button class="button" @click="showCreateForm = true">
                <UserPlus :size="16" /> Create user
              </button>
            </div>

            <form v-if="showCreateForm" class="panel stack" style="padding:18px" @submit.prevent="createUser">
              <div class="section-header" style="align-items: center; margin: 0 0 16px 0;">
                <h2 style="margin:0">Create user</h2>
                <button class="button icon secondary ghost" type="button" @click="showCreateForm = false" title="Cancel">
                  <X :size="18" />
                </button>
              </div>
              <div v-if="createError" class="error-box">{{ createError }}</div>
              <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));align-items:end">
                <label class="field">
                  <span>Username</span>
                  <input ref="userNameInput" v-model="createForm.username" class="input" minlength="3" maxlength="32" required />
                </label>
                <label class="field">
                  <span>Email</span>
                  <input v-model="createForm.email" class="input" type="email" required />
                </label>
                <label class="field">
                  <span>Display name</span>
                  <input v-model="createForm.display_name" class="input" maxlength="80" />
                </label>
                <label class="field">
                  <span>Password</span>
                  <input v-model="createForm.password" class="input" type="password" minlength="8" required />
                </label>
                <button class="button secondary" type="button" @click="showCreateForm = false">Cancel</button>
                <button class="button" type="submit" :disabled="creating || admin.loading">
                  <UserPlus :size="16" /> Create
                </button>
              </div>
            </form>

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
                    <button class="button icon secondary" type="button" title="Edit user" :disabled="editing && editForm.id === user.id" @click="startEdit(user)">
                      <Pencil :size="16" />
                    </button>
                    <button v-if="user.id !== auth.user?.id" class="button icon danger" type="button" title="Delete user" @click="deleteUser(user)">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </div>

                <form
                  v-if="editForm.id === user.id"
                  class="grid"
                  style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));align-items:end;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-soft)"
                  @submit.prevent="submitEdit(user)"
                >
                  <div v-if="editError" class="error-box" style="grid-column:1 / -1">{{ editError }}</div>
                  <label class="field">
                    <span>Display name</span>
                    <input v-model="editForm.display_name" class="input" maxlength="80" required :disabled="editing" />
                  </label>
                  <label class="field">
                    <span>Email</span>
                    <input v-model="editForm.email" class="input" type="email" required :disabled="editing" />
                  </label>
                  <label class="field">
                    <span>New password</span>
                    <input
                      v-model="editForm.password"
                      class="input"
                      type="password"
                      minlength="8"
                      autocomplete="new-password"
                      placeholder="Leave blank to keep current"
                      :disabled="editing"
                    />
                  </label>
                  <button class="button secondary" type="button" :disabled="editing" @click="cancelEdit">Cancel</button>
                  <button class="button" type="submit" :disabled="editing || admin.loading">
                    <Save :size="16" /> Save
                  </button>
                </form>
                
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
                  <button v-else-if="!user.is_instance_admin" class="button secondary" style="min-height:28px; padding:4px 8px; font-size:0.78rem; border-radius:999px" @click="startAssign(user.id)">
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
