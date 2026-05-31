<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue';
import { Pencil, Save, ShieldCheck, Trash2, UserPlus, X, Users, Mail, UserCog, Network, Plus, ChevronDown, ChevronUp, Key } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import AppHeader from '../../components/layout/AppHeader.vue';
import UserAvatar from '../../components/common/UserAvatar.vue';
import { useAdminStore } from '../../stores/admin';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const admin = useAdminStore();
const auth = useAuthStore();

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

const expandedUserId = ref(null);
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
    alert(t('admin.deleteSelf'));
    return;
  }
  if (!window.confirm(t('admin.deleteUserConfirm', { name: user.display_name }))) return;
  
  try {
    await admin.deleteUser(user.id);
  } catch (error) {
    alert(error.message === 'Cannot delete user with existing activity or owned teams.' ? t('admin.deleteUserConflict') : error.message);
  }
}

function toggleExpand(user) {
  if (expandedUserId.value === user.id) {
    expandedUserId.value = null;
    cancelEdit();
    cancelAssign();
  } else {
    expandedUserId.value = user.id;
    startEdit(user);
    cancelAssign();
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
    // Don't close expansion, just show success or clear password
    editForm.password = '';
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
  if (!window.confirm(t('teams.removeMemberConfirm', { name: user.display_name }))) return;
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
          <h1 class="page-title">{{ $t('admin.usersManagement') }}</h1>
          <p class="muted">{{ $t('admin.usersManagementDescription') }}</p>
        </div>
        <span class="badge in_progress"><ShieldCheck :size="14" /> {{ $t('admin.instanceAdmin') }}</span>
      </div>

      <div v-if="admin.error" class="error-box">{{ admin.error }}</div>
      <div v-if="admin.loading && !admin.users.length" class="empty">{{ $t('admin.loadingUsers') }}</div>

      <template v-else>
        <div class="admin-dashboard">
          
          <div class="dashboard-header-row">
            <div class="dashboard-stat-chip">
              <Users :size="18" />
              <span>{{ $t('admin.usersCount', { count: admin.users.length }) }}</span>
            </div>
            <button v-if="!showCreateForm" class="button primary-gradient" @click="showCreateForm = true">
              <UserPlus :size="17" /> {{ $t('admin.createNewUser') }}
            </button>
          </div>

          <form v-if="showCreateForm" class="premium-card create-form-card" @submit.prevent="createUser">
            <div class="card-header">
              <div class="card-title-group">
                <div class="icon-box success"><UserPlus :size="20" /></div>
                <h3>{{ $t('admin.createNewUser') }}</h3>
              </div>
              <button class="button icon ghost" type="button" @click="showCreateForm = false" :title="$t('common.cancel')">
                <X :size="17" />
              </button>
            </div>
            <div v-if="createError" class="error-box" style="margin: 16px 24px 0;">{{ createError }}</div>
            <div class="card-body">
              <div class="form-grid">
                <label class="field">
                  <span>{{ $t('common.username') }}</span>
                  <input ref="userNameInput" v-model="createForm.username" class="input" minlength="3" maxlength="32" :placeholder="$t('admin.usernamePlaceholder')" required />
                </label>
                <label class="field">
                  <span>{{ $t('admin.displayName') }}</span>
                  <input v-model="createForm.display_name" class="input" :placeholder="$t('admin.displayNamePlaceholder')" maxlength="80" />
                </label>
                <label class="field">
                  <span>{{ $t('common.email') }}</span>
                  <input v-model="createForm.email" class="input" type="email" :placeholder="$t('admin.emailPlaceholder')" required />
                </label>
                <label class="field">
                  <span>{{ $t('common.password') }}</span>
                  <input v-model="createForm.password" class="input" type="password" :placeholder="$t('admin.passwordPlaceholder')" minlength="8" required />
                </label>
              </div>
            </div>
            <div class="card-footer">
              <button class="button secondary" type="button" @click="showCreateForm = false">{{ $t('common.cancel') }}</button>
              <button class="button success-gradient" type="submit" :disabled="creating || admin.loading">
                <UserPlus :size="17" /> {{ $t('admin.createUser') }}
              </button>
            </div>
          </form>

          <div class="premium-card">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{{ $t('admin.userTable.user') }}</th>
                    <th>{{ $t('admin.userTable.account') }}</th>
                    <th>{{ $t('admin.userTable.role') }}</th>
                    <th>{{ $t('admin.userTable.teams') }}</th>
                    <th class="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="user in admin.users" :key="user.id">
                    
                    <!-- Main Row -->
                    <tr 
                      class="data-row" 
                      :class="{ 'is-expanded': expandedUserId === user.id }"
                      @click="toggleExpand(user)"
                    >
                      <td>
                        <div class="user-cell">
                          <UserAvatar :user="user" style="width:36px;height:36px;font-size:0.9rem;" />
                          <div class="user-details">
                            <strong class="user-name">
                              {{ user.display_name }}
                              <span v-if="user.id === auth.user?.id" class="badge primary micro">{{ $t('admin.you') }}</span>
                            </strong>
                            <span class="user-email"><Mail :size="12"/> {{ user.email }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="muted">@{{ user.username }}</span>
                      </td>
                      <td>
                        <span v-if="user.is_instance_admin" class="badge violet"><UserCog :size="12"/> {{ $t('roles.admin') }}</span>
                        <span v-else class="badge todo">{{ $t('roles.user') }}</span>
                      </td>
                      <td>
                        <div class="teams-cell">
                          <span v-if="user.is_instance_admin" class="muted text-sm">{{ $t('common.global') }}</span>
                          <span v-else-if="user.memberships.length === 0" class="muted text-sm">{{ $t('common.none') }}</span>
                          <span v-else class="badge success">{{ $t('admin.teamsCount', { count: user.memberships.length }) }}</span>
                        </div>
                      </td>
                      <td class="actions-col">
                        <div class="row-actions" @click.stop>
                          <button v-if="user.id !== auth.user?.id" class="button icon danger ghost" type="button" :title="$t('admin.deleteUser')" @click="deleteUser(user)">
                            <Trash2 :size="16" />
                          </button>
                          <button class="button icon ghost" type="button" @click="toggleExpand(user)">
                            <ChevronUp v-if="expandedUserId === user.id" :size="18" />
                            <ChevronDown v-else :size="18" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    <!-- Expanded Details Panel -->
                    <tr v-if="expandedUserId === user.id" class="expanded-row">
                      <td colspan="5" class="expanded-cell">
                        <div class="expanded-panel">
                          
                          <!-- Edit Profile Section -->
                          <div class="panel-section edit-section">
                            <div class="section-header-small">
                              <Pencil :size="16" class="section-icon" />
                              <h4>{{ $t('admin.editProfile') }}</h4>
                            </div>
                            
                            <form @submit.prevent="submitEdit(user)" class="edit-form-grid">
                              <div v-if="editError" class="error-box full-width">{{ editError }}</div>
                              <label class="field">
                                <span>{{ $t('auth.displayName') }}</span>
                                <input v-model="editForm.display_name" class="input" maxlength="80" required :disabled="editing" />
                              </label>
                              <label class="field">
                                <span>{{ $t('common.email') }}</span>
                                <input v-model="editForm.email" class="input" type="email" required :disabled="editing" />
                              </label>
                              <label class="field">
                                <span>{{ $t('admin.newPasswordOptional') }}</span>
                                <div class="input-with-icon">
                                  <Key :size="16" class="input-icon" />
                                  <input
                                    v-model="editForm.password"
                                    class="input"
                                    type="password"
                                    minlength="8"
                                    autocomplete="new-password"
                                    :placeholder="$t('admin.keepPasswordPlaceholder')"
                                    :disabled="editing"
                                    style="padding-left: 36px;"
                                  />
                                </div>
                              </label>
                              <div class="edit-actions">
                                <button class="button success-gradient" type="submit" :disabled="editing || admin.loading">
                                  <Save :size="16" /> {{ $t('admin.saveChanges') }}
                                </button>
                              </div>
                            </form>
                          </div>

                          <div class="vertical-divider"></div>

                          <!-- Memberships Section -->
                          <div class="panel-section memberships-section">
                            <div class="section-header-small">
                              <Network :size="16" class="section-icon" />
                              <h4>{{ $t('admin.teamMemberships') }}</h4>
                              <button v-if="!user.is_instance_admin && assigningUserId !== user.id" class="button secondary small-btn" @click="startAssign(user.id)" style="margin-left:auto">
                                <Plus :size="14" /> {{ $t('admin.assign') }}
                              </button>
                            </div>

                            <div v-if="user.is_instance_admin" class="empty-state-small">
                              <ShieldCheck :size="24" class="muted-icon" />
                              <p>{{ $t('admin.instanceAdminGlobal') }}</p>
                            </div>

                            <div v-else>
                              <!-- Assign Form -->
                              <div v-if="assigningUserId === user.id" class="assign-form">
                                <form @submit.prevent="assignUser(user)" class="form-inline">
                                  <select v-model="assignForm.team_id" class="select" style="flex:1" required>
                                    <option value="" disabled>{{ $t('admin.selectTeam') }}</option>
                                    <option v-for="team in availableTeams(user)" :key="team.id" :value="team.id">{{ team.name }}</option>
                                  </select>
                                  <select v-model="assignForm.role" class="select" style="width:100px" required>
                                    <option value="admin">{{ $t('roles.admin') }}</option>
                                    <option value="member">{{ $t('roles.member') }}</option>
                                  </select>
                                  <button class="button primary" type="submit">{{ $t('common.add') }}</button>
                                  <button class="button icon ghost" type="button" @click="cancelAssign"><X :size="16"/></button>
                                </form>
                              </div>

                              <!-- Memberships List -->
                              <div class="memberships-list">
                                <div v-for="membership in user.memberships" :key="membership.id" class="membership-chip">
                                  <span class="team-name">{{ membership.team_name }}</span>
                                  <select
                                    class="select chip-select"
                                    :class="{ 'is-admin': membership.role === 'admin' }"
                                    :value="membership.role"
                                    @change="changeRole(membership.team_id, user.id, $event.target.value)"
                                  >
                                    <option value="admin">{{ $t('roles.admin') }}</option>
                                    <option value="member">{{ $t('roles.member') }}</option>
                                  </select>
                                  <button class="button icon ghost danger-hover chip-remove" :title="$t('teams.removeMember')" @click="removeMember(membership.team_id, user)">
                                    <X :size="14" />
                                  </button>
                                </div>
                                <div v-if="!user.memberships.length && assigningUserId !== user.id" class="empty-state-small">
                                  <p>{{ $t('admin.notAssigned') }}</p>
                                </div>
                              </div>
                            </div>
                            
                          </div>
                          
                        </div>
                      </td>
                    </tr>
                    
                  </template>
                </tbody>
              </table>
              <div v-if="!admin.users.length" class="empty" style="min-height: 120px;">{{ $t('admin.noUsers') }}</div>
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
  gap: 24px;
  margin-top: 10px;
}

.dashboard-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.dashboard-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.95rem;
}

.dashboard-stat-chip strong {
  color: var(--text);
  font-size: 1.1rem;
}

.primary-gradient { background: linear-gradient(135deg, var(--primary), var(--primary-strong)); color: white; border: none; }
.success-gradient { background: linear-gradient(135deg, var(--success), #059669); color: white; border: none; }

.premium-card {
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.create-form-card {
  border: 1px solid var(--success);
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-title-group h3 {
  margin: 0;
  font-size: 1.2rem;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.icon-box.success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
.icon-box.violet { background: rgba(139, 92, 246, 0.15); color: var(--violet); }

.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface-soft);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 24px;
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 16px 24px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-strong);
  background: rgba(255, 255, 255, 0.02);
}

.data-row {
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--border);
}

.data-row:hover {
  background: var(--surface-soft);
}

.data-row.is-expanded {
  background: var(--primary-bg);
  border-bottom-color: transparent;
}

.data-table td {
  padding: 16px 24px;
  vertical-align: middle;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: var(--text);
}

.user-email {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--muted);
}

.teams-cell {
  display: flex;
  align-items: center;
}

.text-sm {
  font-size: 0.85rem;
}

.actions-col {
  text-align: right;
  width: 100px;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.expanded-row {
  background: var(--surface-soft);
  border-bottom: 1px solid var(--border-strong);
}

.expanded-cell {
  padding: 0;
}

.expanded-panel {
  display: flex;
  min-height: 200px;
}

.panel-section {
  flex: 1;
  padding: 24px;
}

.vertical-divider {
  width: 1px;
  background: var(--border);
  margin: 24px 0;
}

.section-header-small {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-header-small h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--text);
}

.section-icon {
  color: var(--primary);
}

.edit-form-grid {
  display: grid;
  gap: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: var(--muted);
  pointer-events: none;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.small-btn {
  min-height: 28px;
  height: 28px;
  padding: 0 10px;
  font-size: 0.8rem;
  border-radius: 999px;
}

.assign-form {
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 16px;
}

.form-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.memberships-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.membership-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
}

.team-name {
  font-weight: 500;
  flex: 1;
}

.chip-select {
  min-height: 28px;
  height: 28px;
  padding: 0 16px 0 8px;
  font-size: 0.8rem;
  width: auto;
  border: none;
  background: transparent;
  color: var(--text);
}

.chip-select.is-admin {
  color: var(--primary);
  font-weight: 600;
}

.chip-remove {
  width: 28px;
  height: 28px;
  min-height: 28px;
}

.empty-state-small {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: var(--muted);
  text-align: center;
  font-size: 0.9rem;
}

.muted-icon {
  opacity: 0.3;
  margin-bottom: 8px;
}

.button.ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
}

.button.ghost:hover {
  background: var(--surface-strong);
  border-color: var(--border);
  color: var(--text);
}

.button.danger.ghost {
  color: var(--muted);
}

.button.danger.ghost:hover, .danger-hover:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-color: transparent;
}

.badge.micro {
  font-size: 0.7rem;
  padding: 2px 6px;
  min-height: 18px;
}

.badge.violet { background: rgba(139, 92, 246, 0.15); color: var(--violet); }
.badge.primary { background: var(--primary-bg); color: var(--primary); }
.badge.success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
.badge.todo { color: var(--muted); background: var(--surface-soft); }

@media (max-width: 980px) {
  .expanded-panel {
    flex-direction: column;
  }
  .vertical-divider {
    width: auto;
    height: 1px;
    margin: 0 24px;
  }
}

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-inline { flex-direction: column; align-items: stretch; }
  .data-table th:nth-child(2),
  .data-table td:nth-child(2),
  .data-table th:nth-child(4),
  .data-table td:nth-child(4) {
    display: none;
  }
}
</style>
