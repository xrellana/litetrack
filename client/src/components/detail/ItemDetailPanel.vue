<script setup>
import { Edit3, Trash2, Calendar, User, Clock } from 'lucide-vue-next';
import PriorityIndicator from '../common/PriorityIndicator.vue';
import StatusBadge from '../common/StatusBadge.vue';
import UserAvatar from '../common/UserAvatar.vue';

defineProps({
  item: { type: Object, required: true }
});

const emit = defineEmits(['edit', 'delete']);
</script>

<template>
  <aside class="detail-sidebar panel">
    <div class="sidebar-header">
      <h3 class="sidebar-title">Item Details</h3>
    </div>
    
    <div class="sidebar-content">
      <div class="property-group">
        <div class="property-label">Status</div>
        <div class="property-value">
          <StatusBadge :status="item.status" />
        </div>
      </div>

      <div class="property-group">
        <div class="property-label">Priority</div>
        <div class="property-value">
          <PriorityIndicator :priority="item.priority" />
        </div>
      </div>

      <div class="property-group">
        <div class="property-label"><User :size="14" class="mr-2"/> Assignee</div>
        <div class="property-value">
          <div class="avatar-row">
            <UserAvatar :user="item.assignee" :size="24" />
            <span class="assignee-name">{{ item.assignee?.display_name || 'Unassigned' }}</span>
          </div>
        </div>
      </div>

      <div class="property-group">
        <div class="property-label"><Calendar :size="14" class="mr-2"/> Due date</div>
        <div class="property-value font-medium">
          {{ item.due_date || 'No due date' }}
        </div>
      </div>


      
      <div class="property-group">
         <div class="property-label"><Clock :size="14" class="mr-2"/> Last updated</div>
         <div class="property-value text-sm muted">
            {{ new Date(item.updated_at).toLocaleString() }}
         </div>
      </div>
    </div>

    <div class="sidebar-actions">
      <button class="action-btn edit-btn" type="button" @click="emit('edit')">
        <Edit3 :size="16" /> Edit details
      </button>
      <button class="action-btn delete-btn" type="button" @click="emit('delete')">
        <Trash2 :size="16" /> Delete item
      </button>
    </div>
  </aside>
</template>

<style scoped>
.detail-sidebar {
  padding: 0;
  overflow: hidden;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}

.sidebar-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sidebar-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-label {
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.property-value {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: var(--text);
}

.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 0.85rem;
}

.assignee-name {
  font-weight: 500;
  margin-left: 6px;
}

.sidebar-actions {
  display: flex;
  border-top: 1px solid var(--border);
  background: var(--surface-soft);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.edit-btn {
  color: var(--text);
  border-right: 1px solid var(--border);
}

.edit-btn:hover, .edit-btn:focus {
  background: var(--surface);
  color: var(--primary);
}

.delete-btn {
  color: var(--muted);
}

.delete-btn:hover, .delete-btn:focus {
  background: rgba(239, 68, 68, 0.05);
  color: var(--danger);
}

.mr-2 {
  margin-right: 6px;
}
</style>
