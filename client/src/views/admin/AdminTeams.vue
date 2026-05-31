<script setup>
import { onMounted, reactive, ref, watch, nextTick } from 'vue';
import { Edit2, Plus, ShieldCheck, Trash2, X, Save, Network, Users } from 'lucide-vue-next';
import AppHeader from '../../components/layout/AppHeader.vue';
import UserAvatar from '../../components/common/UserAvatar.vue';
import { useAdminStore } from '../../stores/admin';

const admin = useAdminStore();
const createForm = reactive({ name: '', description: '' });
const creating = ref(false);
const showCreateForm = ref(false);
const teamNameInput = ref(null);
const editingTeamId = ref(null);
const editForm = ref({ name: '', description: '' });

// Watch for showCreateForm changes to focus input
watch(showCreateForm, (val) => {
  if (val) {
    nextTick(() => {
      teamNameInput.value?.focus();
    });
  }
});

async function createTeam() {
  if (!createForm.name.trim()) return;
  creating.value = true;
  try {
    await admin.createTeam(createForm);
    createForm.name = '';
    createForm.description = '';
    showCreateForm.value = false;
  } finally {
    creating.value = false;
  }
}

async function changeRole(team, member, role) {
  await admin.changeMemberRole(team.id, member.user_id, role);
}

async function removeMember(team, member) {
  if (!window.confirm(`Remove ${member.user.display_name} from ${team.name}?`)) return;
  await admin.removeMember(team.id, member.user_id);
}

function startEdit(team) {
  editingTeamId.value = team.id;
  editForm.value = { name: team.name, description: team.description || '' };
}

function cancelEdit() {
  editingTeamId.value = null;
}

async function saveTeam(team) {
  if (!editForm.value.name.trim()) return;
  await admin.updateTeam(team.id, editForm.value);
  editingTeamId.value = null;
}

async function deleteTeam(team) {
  if (!window.confirm(`Are you absolutely sure you want to delete the team "${team.name}"? This action cannot be undone.`)) return;
  await admin.deleteTeam(team.id);
}

onMounted(() => {
  if (!admin.teams.length) admin.fetchOverview();
});
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Teams Management</h1>
          <p class="muted">Instance-wide team and role management.</p>
        </div>
        <span class="badge in_progress"><ShieldCheck :size="14" /> Instance admin</span>
      </div>

      <div v-if="admin.error" class="error-box">{{ admin.error }}</div>
      <div v-if="admin.loading && !admin.teams.length" class="empty">Loading teams...</div>

      <template v-else>
        <div class="admin-dashboard">
          
          <div class="dashboard-header-row">
            <div class="dashboard-stat-chip">
              <Network :size="18" />
              <strong>{{ admin.teams.length }}</strong> Teams
            </div>
            <button v-if="!showCreateForm" class="button primary-gradient" @click="showCreateForm = true">
              <Plus :size="17" /> Create New Team
            </button>
          </div>

          <form v-if="showCreateForm" class="premium-card create-form-card" @submit.prevent="createTeam">
            <div class="card-header">
              <div class="card-title-group">
                <div class="icon-box primary"><Network :size="20" /></div>
                <h3>Create New Team</h3>
              </div>
              <button class="button icon secondary ghost" type="button" @click="showCreateForm = false" title="Cancel">
                <X :size="17" />
              </button>
            </div>
            <div class="card-body">
              <div class="form-grid">
                <label class="field">
                  <span>Team Name</span>
                  <input ref="teamNameInput" v-model="createForm.name" class="input" placeholder="e.g. Engineering" maxlength="80" required />
                </label>
                <label class="field">
                  <span>Description (Optional)</span>
                  <input v-model="createForm.description" class="input" placeholder="What is this team responsible for?" maxlength="5000" />
                </label>
              </div>
            </div>
            <div class="card-footer">
              <button class="button secondary" type="button" @click="showCreateForm = false">Cancel</button>
              <button class="button primary-gradient" type="submit" :disabled="creating || admin.loading">
                <Plus :size="17" /> Create Team
              </button>
            </div>
          </form>

          <div class="team-cards">
            <article v-for="team in admin.teams" :key="team.id" class="premium-card team-card">
              
              <div class="card-header">
                <template v-if="editingTeamId === team.id">
                  <form class="edit-form-inline" @submit.prevent="saveTeam(team)">
                    <div class="icon-box primary"><Network :size="20" /></div>
                    <input v-model="editForm.name" class="input" placeholder="Team name" required maxlength="80" />
                    <button class="button icon secondary" type="button" title="Cancel" @click="cancelEdit">
                      <X :size="17" />
                    </button>
                    <button class="button icon success-gradient" type="submit" title="Save">
                      <Save :size="17" />
                    </button>
                  </form>
                </template>
                <template v-else>
                  <div class="card-title-group">
                    <div class="icon-box primary"><Network :size="20" /></div>
                    <div>
                      <h3 class="team-name">{{ team.name }}</h3>
                      <div class="team-meta">
                        <span class="meta-item"><Users :size="14" /> {{ team.member_count }} members</span>
                        <span class="meta-divider">•</span>
                        <span class="meta-item">Created by {{ team.creator?.display_name || 'Unknown' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="card-actions">
                    <button class="button icon secondary" type="button" title="Edit team" @click="startEdit(team)">
                      <Edit2 :size="16" />
                    </button>
                    <button class="button icon danger ghost" type="button" title="Delete team" @click="deleteTeam(team)">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </template>
              </div>

              <div class="card-body">
                <div class="member-list">
                  <div v-for="member in team.members" :key="member.user_id" class="member-row">
                    <div class="member-info">
                      <UserAvatar :user="member.user" />
                      <div class="member-details">
                        <strong class="member-name">{{ member.user.display_name }}</strong>
                        <span class="member-email">{{ member.user.email }}</span>
                      </div>
                      <span v-if="member.user.is_instance_admin" class="badge warning" style="margin-left:8px; zoom: 0.85;">Admin</span>
                    </div>
                    
                    <div class="member-actions">
                      <select class="select role-select" :value="member.role" @change="changeRole(team, member, $event.target.value)">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button class="button icon danger ghost" type="button" title="Remove member" @click="removeMember(team, member)">
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </div>
                  
                  <div v-if="!team.members.length" class="empty-state">
                    <Users :size="32" class="empty-icon" />
                    <p>No members in this team yet.</p>
                  </div>
                </div>
              </div>

            </article>
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

.primary-gradient {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: white;
  border: none;
}

.success-gradient {
  background: linear-gradient(135deg, var(--success), #059669);
  color: white;
  border: none;
}

.premium-card {
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.team-cards {
  display: grid;
  gap: 20px;
}

.create-form-card {
  border: 1px solid var(--primary);
  box-shadow: 0 8px 32px var(--primary-bg);
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

.icon-box.primary {
  background: var(--primary-bg);
  color: var(--primary);
}

.team-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--muted);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.meta-divider {
  opacity: 0.5;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body {
  padding: 0;
}

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
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  padding: 24px;
}

.edit-form-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.edit-form-inline .input {
  flex: 1;
  max-width: 400px;
}

.member-list {
  display: flex;
  flex-direction: column;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-strong);
  transition: background 0.15s ease;
}

.member-row:last-child {
  border-bottom: none;
}

.member-row:hover {
  background: var(--surface-soft);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.member-details {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 0.95rem;
}

.member-email {
  font-size: 0.85rem;
  color: var(--muted);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-select {
  width: 120px;
  height: 36px;
  min-height: 36px;
  padding: 4px 12px;
  font-size: 0.9rem;
}

.button.ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
}

.button.ghost:hover {
  background: var(--surface-soft);
  border-color: var(--border);
  color: var(--text);
}

.button.danger.ghost {
  color: var(--muted);
}

.button.danger.ghost:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-color: transparent;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--muted);
}

.empty-icon {
  opacity: 0.3;
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .member-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .member-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
