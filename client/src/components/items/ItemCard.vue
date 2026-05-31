<script setup>
import { CalendarClock, Eye, Pin } from 'lucide-vue-next';
import PriorityIndicator from '../common/PriorityIndicator.vue';
import StatusBadge from '../common/StatusBadge.vue';
import UserAvatar from '../common/UserAvatar.vue';
import { STATUSES } from '../../stores/items';

const props = defineProps({
  item: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  showTeam: { type: Boolean, default: false }
});

const emit = defineEmits(['open', 'status']);

function isOverdue(item) {
  return item.due_date && item.status !== 'done' && new Date(item.due_date) < new Date(new Date().toDateString());
}
</script>

<template>
  <article class="item-card">
    <div class="item-meta" style="justify-content:space-between">
      <StatusBadge :status="item.status" />
      <span v-if="item.is_pinned" class="badge in_progress" :title="$t('items.pinned')"><Pin :size="13" /> {{ $t('items.pinned') }}</span>
    </div>
    <span v-if="showTeam && item.team" class="badge team-badge">{{ item.team.name }}</span>
    <h3 class="item-title">{{ item.title }}</h3>
    <p v-if="!compact && item.description" class="muted" style="margin:0;overflow-wrap:anywhere">
      {{ item.description.slice(0, 150) }}{{ item.description.length > 150 ? '...' : '' }}
    </p>
    <div class="item-meta">
      <PriorityIndicator :priority="item.priority" />
      <span v-if="item.due_date" class="badge" :class="isOverdue(item) ? 'urgent' : 'todo'">
        <CalendarClock :size="13" /> {{ item.due_date }}
      </span>
    </div>
    <div class="item-meta" style="justify-content:space-between">
      <span class="avatar-row">
        <UserAvatar :user="item.assignee" :size="28" />
        <small class="muted">{{ item.assignee?.display_name || $t('items.unassigned') }}</small>
      </span>
      <button class="button icon secondary" type="button" :title="$t('items.openItem')" @click="emit('open', item)">
        <Eye :size="17" />
      </button>
    </div>
    <label class="field" style="gap:5px">
      <span class="muted">{{ $t('items.status') }}</span>
      <select class="select" :value="item.status" @change="emit('status', item, $event.target.value)">
        <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ $t(`status.${status.value}`) }}</option>
      </select>
    </label>
  </article>
</template>
