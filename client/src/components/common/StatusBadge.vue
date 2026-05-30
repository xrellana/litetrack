<script setup>
const labels = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done'
};

defineProps({
  status: { type: String, required: true }
});
</script>

<template>
  <span class="badge" :class="status">{{ labels[status] || status }}</span>
</template>

