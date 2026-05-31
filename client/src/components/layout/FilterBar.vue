<script setup>
import { reactive, watch } from 'vue';
import { Search, RotateCcw } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  hideAssignee: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'reset']);
const local = reactive({ status: '', assignee: '', search: '' });

watch(
  () => props.modelValue,
  (value) => {
    local.status = value.status || '';
    local.assignee = value.assignee || '';
    local.search = value.search || '';
  },
  { immediate: true, deep: true }
);

function push() {
  emit('update:modelValue', {
    status: local.status || undefined,
    assignee: local.assignee || undefined,
    search: local.search || undefined
  });
}
</script>

<template>
  <form class="modern-filter-bar panel" @submit.prevent="push">
    <div class="search-section">
      <Search :size="18" class="search-icon" />
      <input v-model="local.search" class="modern-input" placeholder="Search title or description..." @input="push" />
    </div>
    
    <div class="filters-section">
      <div class="modern-select-wrapper">
        <select v-model="local.status" class="modern-select" @change="push">
          <option value="">All Statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      
      <div v-if="!hideAssignee" class="modern-select-wrapper">
        <select v-model="local.assignee" class="modern-select" @change="push">
          <option value="">Any Assignee</option>
          <option v-for="member in members" :key="member.user_id" :value="member.user_id">
            {{ member.user.display_name }}
          </option>
        </select>
      </div>
      
      <button class="modern-reset" type="button" @click="emit('reset')" title="Reset filters">
        <RotateCcw :size="18" />
      </button>
    </div>
  </form>
</template>

<style scoped>
.modern-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.search-section {
  flex: 1 1 280px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: var(--muted);
  pointer-events: none;
}

.modern-input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 42px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.95rem;
  transition: all 0.2s ease;
  outline: none;
}

.modern-input:focus, .modern-input:hover {
  background: var(--bg-2);
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.filters-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.modern-select-wrapper {
  position: relative;
}

.modern-select {
  appearance: none;
  height: 40px;
  padding: 0 32px 0 16px;
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

.modern-select:hover {
  border-color: var(--primary-strong);
  background-color: var(--surface-soft);
}

.modern-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.modern-reset {
  height: 40px;
  width: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--muted);
  background: var(--surface-soft);
  cursor: pointer;
}

.modern-reset:hover {
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
  transform: rotate(-15deg);
}

@media (max-width: 768px) {
  .modern-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }
  .modern-select-wrapper, .modern-select {
    width: 100%;
  }
  .modern-reset {
    width: 100%;
  }
}
</style>
