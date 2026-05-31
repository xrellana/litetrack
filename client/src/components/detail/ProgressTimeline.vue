<script setup>
import { Send, Plus, X } from 'lucide-vue-next';
import { reactive, ref, nextTick } from 'vue';
import UserAvatar from '../common/UserAvatar.vue';
import { STATUSES } from '../../stores/items';

defineProps({
  updates: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false }
});

const emit = defineEmits(['submit']);
const form = reactive({ content: '', status: '' });
const showForm = ref(false);
const inputRef = ref(null);

function openForm() {
  showForm.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function closeForm() {
  showForm.value = false;
  form.content = '';
  form.status = '';
}

function submit() {
  if (!form.content.trim()) return;
  emit('submit', {
    content: form.content,
    status: form.status || undefined
  });
  closeForm();
}
</script>

<template>
  <section class="stack">
    <div v-if="!showForm" class="add-update-trigger">
      <button class="button add-button" type="button" @click="openForm">
        <Plus :size="18" /> Add Progress Update
      </button>
    </div>

    <form v-if="showForm" class="update-form panel" @submit.prevent="submit">
      <div class="form-header">
        <strong>New Update</strong>
        <button class="button icon secondary ghost" type="button" @click="closeForm" title="Cancel">
          <X :size="18" />
        </button>
      </div>
      
      <div class="form-body">
        <textarea 
          ref="inputRef"
          v-model="form.content" 
          class="modern-textarea" 
          placeholder="What's the latest progress on this item?" 
          maxlength="5000" 
          required 
        />
      </div>
      
      <div class="form-footer">
        <div class="modern-select-wrapper">
          <select v-model="form.status" class="modern-select">
            <option value="">Keep current status</option>
            <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option>
          </select>
        </div>
        <div class="actions">
          <button class="button secondary" type="button" @click="closeForm">Cancel</button>
          <button class="button" type="submit" :disabled="busy">
            <Send :size="17" /> Post
          </button>
        </div>
      </div>
    </form>

    <div class="timeline" :class="{ 'mt-4': showForm }">
      <article v-for="update in updates" :key="update.id" class="timeline-row">
        <div class="avatar-row">
          <UserAvatar :user="update.user" />
          <span>
            <strong>{{ update.user?.display_name }}</strong>
            <small class="muted" style="display:block">{{ new Date(update.created_at).toLocaleString() }}</small>
          </span>
        </div>
        <p class="update-content">{{ update.content }}</p>
        <small v-if="update.status_change" class="badge update-badge">{{ update.status_change }}</small>
      </article>
      <div v-if="!updates.length" class="empty compact">No progress updates yet.</div>
    </div>
  </section>
</template>

<style scoped>
.add-update-trigger {
  margin-bottom: 8px;
}

.add-button {
  width: 100%;
  padding: 12px;
  background: var(--surface-soft);
  color: var(--text);
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.add-button:hover {
  background: var(--primary-bg);
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}

.update-form {
  padding: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--primary);
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.1);
  animation: slideDown 0.2s ease-out;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--border);
}

.ghost {
  border: none;
  background: transparent;
}

.ghost:hover {
  background: var(--border);
}

.form-body {
  padding: 16px;
}

.modern-textarea {
  width: 100%;
  min-height: 120px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.2s ease;
  outline: none;
}

.modern-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
  background: var(--bg-2);
}

.form-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface-soft);
  border-top: 1px solid var(--border);
}

.actions {
  display: flex;
  gap: 8px;
}

.modern-select-wrapper {
  position: relative;
  flex: 1;
  max-width: 240px;
}

.modern-select {
  width: 100%;
  appearance: none;
  height: 38px;
  padding: 0 32px 0 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 14px;
}

.modern-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.timeline {
  display: grid;
  gap: 16px;
  margin-top: 8px;
}

.timeline.mt-4 {
  margin-top: 24px;
}

.timeline-row {
  padding: 16px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.update-content {
  margin: 12px 0 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text);
}

.update-badge {
  margin-top: 12px;
  display: inline-block;
  font-size: 0.75rem;
  background: var(--surface-soft);
  color: var(--muted);
  border: 1px solid var(--border);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
