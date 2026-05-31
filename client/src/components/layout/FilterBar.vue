<script setup>
import { reactive, watch } from 'vue';
import { Search, RotateCcw } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  hideAssignee: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'reset']);
const local = reactive({ status: '', assignee: '', tag: '', search: '' });

watch(
  () => props.modelValue,
  (value) => {
    local.status = value.status || '';
    local.assignee = value.assignee || '';
    local.tag = value.tag || '';
    local.search = value.search || '';
  },
  { immediate: true, deep: true }
);

function push() {
  emit('update:modelValue', {
    status: local.status || undefined,
    assignee: local.assignee || undefined,
    tag: local.tag || undefined,
    search: local.search || undefined
  });
}
</script>

<template>
  <form class="filter-bar panel" @submit.prevent="push">
    <label class="field" style="gap:0">
      <span class="muted">Search</span>
      <span style="position:relative">
        <Search :size="17" style="position:absolute;left:11px;top:12px;color:var(--muted)" />
        <input v-model="local.search" class="input" style="padding-left:36px" placeholder="Title or description" @input="push" />
      </span>
    </label>
    <label class="field" style="gap:0">
      <span class="muted">Status</span>
      <select v-model="local.status" class="select" @change="push">
        <option value="">All</option>
        <option value="todo">To do</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
      </select>
    </label>
    <label v-if="!hideAssignee" class="field" style="gap:0">
      <span class="muted">Assignee</span>
      <select v-model="local.assignee" class="select" @change="push">
        <option value="">Anyone</option>
        <option v-for="member in members" :key="member.user_id" :value="member.user_id">
          {{ member.user.display_name }}
        </option>
      </select>
    </label>
    <label class="field" style="gap:0">
      <span class="muted">Tag</span>
      <select v-model="local.tag" class="select" @change="push">
        <option value="">Any tag</option>
        <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.display_name || tag.name }}</option>
      </select>
    </label>
    <button class="button secondary" type="button" @click="emit('reset')">
      <RotateCcw :size="17" /> Reset
    </button>
  </form>
</template>
