<script setup>
import { Activity } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import UserAvatar from '../common/UserAvatar.vue';

defineProps({
  rows: { type: Array, default: () => [] },
  showTeam: { type: Boolean, default: false }
});

const { t, te } = useI18n();

function actionLabel(action) {
  const key = `activity.actions.${action}`;
  return te(key) ? t(key) : action.replaceAll('_', ' ');
}
</script>

<template>
  <div class="activity-feed">
    <article v-for="row in rows" :key="row.id" class="activity-row">
      <div class="avatar-row">
        <UserAvatar :user="row.user" />
        <span>
          <strong>{{ row.user?.display_name || $t('activity.teamMember') }}</strong>
          <small class="muted" style="display:block">{{ new Date(row.created_at).toLocaleString($i18n.locale) }}</small>
        </span>
      </div>
      <div class="item-meta">
        <span v-if="showTeam && row.team" class="badge team-badge">{{ row.team.name }}</span>
        <span class="badge in_progress"><Activity :size="13" /> {{ actionLabel(row.action) }}</span>
        <span v-if="row.details?.item_title" class="muted">{{ row.details.item_title }}</span>
        <span v-else-if="row.details?.team_name" class="muted">{{ row.details.team_name }}</span>
        <span v-else-if="row.details?.tag_name" class="muted">{{ row.details.tag_name }}</span>
      </div>
    </article>
    <div v-if="!rows.length" class="empty">{{ $t('activity.none') }}</div>
  </div>
</template>
