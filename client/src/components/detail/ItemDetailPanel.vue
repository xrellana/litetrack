<script setup>
import { Edit3, Trash2 } from 'lucide-vue-next';
import PriorityIndicator from '../common/PriorityIndicator.vue';
import StatusBadge from '../common/StatusBadge.vue';
import TagChip from '../common/TagChip.vue';
import UserAvatar from '../common/UserAvatar.vue';

defineProps({
  item: { type: Object, required: true }
});

const emit = defineEmits(['edit', 'delete']);
</script>

<template>
  <aside class="panel stack" style="padding:18px">
    <div class="section-header">
      <h2 class="item-title" style="font-size:1.4rem">{{ item.title }}</h2>
      <div class="toolbar">
        <button class="button icon secondary" type="button" title="Edit item" @click="emit('edit')">
          <Edit3 :size="17" />
        </button>
        <button class="button icon danger" type="button" title="Delete item" @click="emit('delete')">
          <Trash2 :size="17" />
        </button>
      </div>
    </div>
    <p v-if="item.description" class="muted" style="white-space:pre-wrap;overflow-wrap:anywhere">{{ item.description }}</p>
    <div class="item-meta">
      <StatusBadge :status="item.status" />
      <PriorityIndicator :priority="item.priority" />
    </div>
    <div class="stack-tight">
      <span class="muted">Assignee</span>
      <span class="avatar-row">
        <UserAvatar :user="item.assignee" />
        <strong>{{ item.assignee?.display_name || 'Unassigned' }}</strong>
      </span>
    </div>
    <div class="stack-tight">
      <span class="muted">Due date</span>
      <strong>{{ item.due_date || 'No due date' }}</strong>
    </div>
    <div v-if="item.tags?.length" class="stack-tight">
      <span class="muted">Tags</span>
      <div class="item-meta">
        <TagChip v-for="tag in item.tags" :key="tag.id" :tag="tag" />
      </div>
    </div>
    <small class="muted">Updated {{ new Date(item.updated_at).toLocaleString() }}</small>
  </aside>
</template>

