<script setup>
import { ArrowDown, ArrowUp, ChevronsUp, Minus } from 'lucide-vue-next';

const labels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

const icons = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: ChevronsUp
};

defineProps({
  priority: { type: String, required: true }
});
</script>

<template>
  <span class="priority" :class="priority">
    <component :is="icons[priority]" :size="14" aria-hidden="true" />
    {{ labels[priority] || priority }}
  </span>
</template>
