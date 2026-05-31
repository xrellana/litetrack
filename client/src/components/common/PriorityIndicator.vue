<script setup>
import { ArrowDown, ArrowUp, ChevronsUp, Minus } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const icons = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: ChevronsUp
};

defineProps({
  priority: { type: String, required: true }
});

const { t, te } = useI18n();

function priorityLabel(priority) {
  const key = `priority.${priority}`;
  return te(key) ? t(key) : priority;
}
</script>

<template>
  <span class="priority" :class="priority">
    <component :is="icons[priority]" :size="14" aria-hidden="true" />
    {{ priorityLabel(priority) }}
  </span>
</template>
