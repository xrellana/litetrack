<script setup>
import PriorityIndicator from '../common/PriorityIndicator.vue';
import StatusBadge from '../common/StatusBadge.vue';
import UserAvatar from '../common/UserAvatar.vue';

defineProps({
  items: { type: Array, default: () => [] },
  showTeam: { type: Boolean, default: false }
});

const emit = defineEmits(['open', 'status']);
</script>

<template>
  <div class="panel" style="overflow:auto">
    <table class="list-table">
      <thead>
        <tr>
          <th>{{ $t('items.item') }}</th>
          <th v-if="showTeam">{{ $t('common.team') }}</th>
          <th>{{ $t('items.status') }}</th>
          <th>{{ $t('items.priority') }}</th>
          <th>{{ $t('items.assignee') }}</th>
          <th>{{ $t('items.due') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id" class="item-list-row-hover">
          <td>
            <div class="clickable-title" @click="emit('open', item)" role="button" tabindex="0" @keydown.enter="emit('open', item)">
              <strong class="item-title-text">{{ item.title }}</strong>
              <small v-if="item.description" class="muted" style="display:block; margin-top: 4px;">{{ item.description.slice(0, 120) }}</small>
            </div>
          </td>
          <td v-if="showTeam">
            <span class="badge team-badge">{{ item.team?.name || $t('common.team') }}</span>
          </td>
          <td>
            <StatusBadge :status="item.status" />
          </td>
          <td><PriorityIndicator :priority="item.priority" /></td>
          <td>
            <span class="avatar-row">
              <UserAvatar :user="item.assignee" :size="28" />
              <small>{{ item.assignee?.display_name || $t('items.unassigned') }}</small>
            </span>
          </td>
          <td>{{ item.due_date || '-' }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="!items.length" class="empty" style="margin:14px">{{ $t('items.noMatches') }}</div>
  </div>
</template>

<style scoped>
.item-list-row-hover {
  transition: background-color 150ms ease;
}
.item-list-row-hover:hover {
  background-color: var(--surface-soft);
}
.clickable-title {
  cursor: pointer;
  padding: 6px 8px;
  margin: -6px -8px;
  border-radius: 8px;
  transition: background-color 150ms ease, transform 150ms ease;
  outline: none;
}
.clickable-title:hover, .clickable-title:focus {
  background-color: var(--primary-bg);
}
.clickable-title:hover .item-title-text, .clickable-title:focus .item-title-text {
  color: var(--primary);
}
.clickable-title:active {
  transform: scale(0.99);
}
</style>
