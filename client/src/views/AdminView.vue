<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { ExternalLink, ShieldCheck, Trash2, Users } from 'lucide-vue-next';
import AppHeader from '../components/layout/AppHeader.vue';
import UserAvatar from '../components/common/UserAvatar.vue';
import { useAdminStore } from '../stores/admin';

const admin = useAdminStore();
const instanceAdmins = computed(() => admin.users.filter((user) => user.is_instance_admin));

async function changeRole(team, member, role) {
  await admin.changeMemberRole(team.id, member.user_id, role);
}

async function removeMember(team, member) {
  if (!window.confirm(`Remove ${member.user.display_name} from ${team.name}?`)) return;
  await admin.removeMember(team.id, member.user_id);
}

onMounted(() => admin.fetchOverview());
</script>

<template>
  <main class="page-shell">
    <AppHeader />
    <section class="section">
      <div class="section-header">
        <div>
          <h1 class="page-title">Admin Console</h1>
          <p class="muted">Instance-wide team, member, and role management.</p>
        </div>
        <span class="badge in_progress"><ShieldCheck :size="14" /> Instance admin</span>
      </div>

      <div v-if="admin.error" class="error-box">{{ admin.error }}</div>
      <div v-if="admin.loading" class="empty">Loading instance overview...</div>

      <template v-else>
        <div class="stat-strip">
          <div class="stat-cell">
            <span class="muted">Teams</span>
            <strong>{{ admin.summary.teams }}</strong>
          </div>
          <div class="stat-cell">
            <span class="muted">Users</span>
            <strong>{{ admin.summary.users }}</strong>
          </div>
          <div class="stat-cell">
            <span class="muted">Memberships</span>
            <strong>{{ admin.summary.memberships }}</strong>
          </div>
          <div class="stat-cell">
            <span class="muted">Instance admins</span>
            <strong>{{ admin.summary.instance_admins }}</strong>
          </div>
        </div>

        <div class="admin-grid">
          <section class="stack">
            <div class="section-header">
              <h2 style="margin:0">Teams</h2>
              <span class="muted">{{ admin.teams.length }} total</span>
            </div>

            <article v-for="team in admin.teams" :key="team.id" class="panel admin-team">
              <div class="section-header" style="align-items:center">
                <div>
                  <h3 style="margin:0">{{ team.name }}</h3>
                  <small class="muted">
                    {{ team.member_count }} members · creator {{ team.creator?.display_name || 'Unknown' }}
                  </small>
                </div>
                <div class="toolbar">
                  <RouterLink class="button secondary" :to="`/team/${team.id}`">
                    <ExternalLink :size="16" /> Dashboard
                  </RouterLink>
                  <RouterLink class="button secondary" :to="`/team/${team.id}/settings`">
                    <Users :size="16" /> Settings
                  </RouterLink>
                </div>
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
              <div v-for="user in admin.users" :key="user.id" class="activity-row">
                <div class="avatar-row">
                  <UserAvatar :user="user" />
                  <span>
                    <strong>{{ user.display_name }}</strong>
                    <small class="muted" style="display:block">{{ user.username }} · {{ user.email }}</small>
                  </span>
                </div>
                <div class="item-meta">
                  <span v-if="user.is_instance_admin" class="badge in_progress">instance admin</span>
                  <span
                    v-for="membership in user.memberships"
                    :key="membership.id"
                    class="tag-chip"
                    :style="{ color: membership.role === 'admin' ? 'var(--primary)' : 'var(--muted)', background: 'rgba(255,255,255,0.06)' }"
                  >
                    {{ membership.team_name }} · {{ membership.role }}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </section>
  </main>
</template>
