<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Plus, Save, Trash2 } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
import InviteCodeDisplay from '../components/common/InviteCodeDisplay.vue';
import UserAvatar from '../components/common/UserAvatar.vue';
import { useRealtime } from '../composables/useRealtime';
import { useAuthStore } from '../stores/auth';
import { useTeamsStore } from '../stores/teams';

const route = useRoute();
const auth = useAuthStore();
const teams = useTeamsStore();
const teamId = computed(() => Number(route.params.id));
const canManage = computed(() => teams.isAdmin || Boolean(auth.user?.is_instance_admin));
const busy = ref(false);
const error = ref('');
const teamForm = reactive({ name: '', description: '' });
const tagForm = reactive({ name: '', color: '#22d3ee' });
const editingTags = reactive({});

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
  await teams.fetchTeamContext(teamId.value);
}

async function saveTeam() {
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

async function regenerate() {
  busy.value = true;
  try {
    await teams.regenerateInviteCode(teamId.value);
  } finally {
    busy.value = false;
  }
}

async function changeRole(member, role) {
  await teams.changeMemberRole(teamId.value, member.user_id, role);
}

async function removeMember(member) {
  if (!window.confirm(`Remove ${member.user.display_name} from this team?`)) return;
  await teams.removeMemberFromTeam(teamId.value, member.user_id);
}

async function createTag() {
  await teams.createTag(teamId.value, tagForm);
  tagForm.name = '';
  tagForm.color = '#22d3ee';
}

function startEditTag(tag) {
  editingTags[tag.id] = { name: tag.name, color: tag.color };
}

async function saveTag(tag) {
  await teams.updateTag(tag.id, editingTags[tag.id]);
  delete editingTags[tag.id];
}

async function deleteTag(tag) {
  if (!window.confirm(`Delete tag ${tag.name}?`)) return;
  await teams.deleteTag(tag.id);
}

onMounted(load);
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="muted">Team profile, members, invite code, and tags.</p>
        </div>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>
      <div class="settings-grid">
        <section class="stack">
          <form class="panel stack" style="padding:18px" @submit.prevent="saveTeam">
            <h2 style="margin:0">Team info</h2>
            <label class="field">
              <span>Name</span>
              <input v-model="teamForm.name" class="input" :disabled="!canManage" maxlength="80" required />
            </label>
            <label class="field">
              <span>Description</span>
              <textarea v-model="teamForm.description" class="textarea" :disabled="!canManage" maxlength="5000" />
            </label>
            <button v-if="canManage" class="button" type="submit" :disabled="busy">
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
                    :disabled="!canManage"
                    @change="changeRole(member, $event.target.value)"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <button
                    v-if="canManage"
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

        <aside class="stack">
          <section class="panel stack" style="padding:18px">
            <h2 style="margin:0">Invite code</h2>
            <InviteCodeDisplay
              v-if="teams.activeTeam"
              :code="teams.activeTeam.invite_code"
              :can-regenerate="canManage"
              :busy="busy"
              @regenerate="regenerate"
            />
          </section>

          <section class="panel stack" style="padding:18px">
            <h2 style="margin:0">Tags</h2>
            <form v-if="canManage" class="grid" style="grid-template-columns:1fr 74px auto" @submit.prevent="createTag">
              <input v-model="tagForm.name" class="input" placeholder="Tag name" maxlength="32" required />
              <input v-model="tagForm.color" class="input" type="color" title="Tag color" />
              <button class="button icon" type="submit" title="Create tag">
                <Plus :size="17" />
              </button>
            </form>
            <div v-for="tag in teams.tags" :key="tag.id" class="activity-row">
              <div v-if="editingTags[tag.id]" class="grid" style="grid-template-columns:1fr 74px auto auto">
                <input v-model="editingTags[tag.id].name" class="input" />
                <input v-model="editingTags[tag.id].color" class="input" type="color" />
                <button class="button icon" type="button" title="Save tag" @click="saveTag(tag)">
                  <Save :size="17" />
                </button>
                <button class="button icon danger" type="button" title="Delete tag" @click="deleteTag(tag)">
                  <Trash2 :size="17" />
                </button>
              </div>
              <div v-else class="section-header" style="align-items:center">
                <span class="tag-chip" :style="{ color: tag.color, background: `${tag.color}1f` }">{{ tag.name }}</span>
                <div v-if="canManage" class="toolbar">
                  <button class="button secondary" type="button" @click="startEditTag(tag)">Edit</button>
                  <button class="button icon danger" type="button" title="Delete tag" @click="deleteTag(tag)">
                    <Trash2 :size="17" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>
