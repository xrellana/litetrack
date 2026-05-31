<script setup>
import { Eye } from 'lucide-vue-next';
import PriorityIndicator from '../common/PriorityIndicator.vue';
import StatusBadge from '../common/StatusBadge.vue';
import TagChip from '../common/TagChip.vue';
import UserAvatar from '../common/UserAvatar.vue';
import { STATUSES } from '../../stores/items';

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
          <th>Item</th>
          <th v-if="showTeam">Team</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Assignee</th>
          <th>Tags</th>
          <th>Due</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>
            <strong>{{ item.title }}</strong>
            <small v-if="item.description" class="muted" style="display:block">{{ item.description.slice(0, 120) }}</small>
          </td>
          <td v-if="showTeam">
            <span class="badge team-badge">{{ item.team?.name || 'Team' }}</span>
          </td>
          <td>
            <div class="stack-tight">
              <StatusBadge :status="item.status" />
              <select class="select" :value="item.status" @change="emit('status', item, $event.target.value)">
                <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option>
              </select>
            </div>
          </td>
          <td><PriorityIndicator :priority="item.priority" /></td>
          <td>
            <span class="avatar-row">
              <UserAvatar :user="item.assignee" :size="28" />
              <small>{{ item.assignee?.display_name || 'Unassigned' }}</small>
            </span>
          </td>
          <td>
            <span class="item-meta">
              <TagChip v-for="tag in item.tags" :key="tag.id" :tag="tag" />
            </span>
          </td>
          <td>{{ item.due_date || '-' }}</td>
          <td>
            <button class="button icon secondary" type="button" title="Open item" @click="emit('open', item)">
              <Eye :size="17" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!items.length" class="empty" style="margin:14px">No items match this view.</div>
  </div>
</template>
