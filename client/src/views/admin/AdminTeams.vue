<script setup>
import { onMounted, reactive, ref } from 'vue';
import { Edit2, Plus, ShieldCheck, Trash2, X, Save } from 'lucide-vue-next';
import AppHeader from '../../components/layout/AppHeader.vue';
import UserAvatar from '../../components/common/UserAvatar.vue';
import { useAdminStore } from '../../stores/admin';

const admin = useAdminStore();
const createForm = reactive({ name: '', description: '' });
const creating = ref(false);
const editingTeamId = ref(null);
const editForm = ref({ name: '', description: '' });

async function createTeam() {
  if (!createForm.name.trim()) return;
  creating.value = true;
  try {
    await admin.createTeam(createForm);
    createForm.name = '';
    createForm.description = '';
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
        <section class="stack">
          <div class="section-header">
            <h2 style="margin:0">Teams</h2>
            <span class="muted">{{ admin.teams.length }} total</span>
          </div>

          <form class="panel stack" style="padding:18px" @submit.prevent="createTeam">
            <h3 style="margin:0">Create team</h3>
            <div class="grid" style="grid-template-columns:minmax(220px,1fr) minmax(260px,2fr) auto;align-items:end">
              <label class="field">
                <span>Name</span>
                <input v-model="createForm.name" class="input" maxlength="80" required />
              </label>
              <label class="field">
                <span>Description</span>
                <input v-model="createForm.description" class="input" maxlength="5000" />
              </label>
              <button class="button" type="submit" :disabled="creating || admin.loading">
                <Plus :size="17" /> Create
              </button>
            </div>
          </form>

          <article v-for="team in admin.teams" :key="team.id" class="panel admin-team">
            <div class="section-header" style="align-items:center">
              
              <template v-if="editingTeamId === team.id">
                <form class="toolbar" style="flex:1" @submit.prevent="saveTeam(team)">
                  <input v-model="editForm.name" class="input" style="flex:1" placeholder="Team name" required maxlength="80" />
                  <button class="button icon secondary" type="button" title="Cancel" @click="cancelEdit">
                    <X :size="17" />
                  </button>
                  <button class="button icon" type="submit" title="Save">
                    <Save :size="17" />
                  </button>
                </form>
              </template>
              
              <template v-else>
                <div>
                  <h3 style="margin:0">{{ team.name }}</h3>
                  <small class="muted">
                    {{ team.member_count }} members · creator {{ team.creator?.display_name || 'Unknown' }}
                  </small>
                </div>
                <div class="toolbar">
                  <button class="button icon secondary" type="button" title="Edit team" @click="startEdit(team)">
                    <Edit2 :size="16" />
                  </button>
                  <button class="button icon danger" type="button" title="Delete team" @click="deleteTeam(team)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </template>
              
            </div>

            <div class="admin-member-list">
              <div v-for="member in team.members" :key="member.user_id" class="admin-member-row">
                <span class="avatar-row">
                  <UserAvatar :user="member.user" />
                  <span>
                    <strong>{{ member.user.display_name }}</strong>
                    <small class="muted" style="display:block">
                      {{ member.user.email }}{{ member.user.is_instance_admin ? ' · instance admin' : '' }}
                    </small>
                  </span>
                </span>
                <div class="toolbar" style="justify-content:flex-end">
                  <select class="select" style="width:132px" :value="member.role" @change="changeRole(team, member, $event.target.value)">
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <button class="button icon danger" type="button" title="Remove member" @click="removeMember(team, member)">
                    <Trash2 :size="17" />
                  </button>
                </div>
              </div>
              <div v-if="!team.members.length" class="empty" style="min-height:96px">No members.</div>
            </div>
          </article>
        </section>
      </template>
    </section>
  </main>
</template>
