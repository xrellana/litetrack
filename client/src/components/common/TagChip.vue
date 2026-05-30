<script setup>
defineProps({
  tag: { type: Object, required: true }
});
</script>

<template>
  <span class="tag-chip" :style="{ color: tag.color, background: `${tag.color}1f` }">
    {{ tag.name }}
  </span>
</template>

