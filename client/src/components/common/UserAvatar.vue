<script setup>
import { computed } from 'vue';

const props = defineProps({
  user: { type: Object, default: null },
  size: { type: Number, default: 32 }
});

const initials = computed(() => {
  const name = props.user?.display_name || props.user?.username || '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
});
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, background: user?.avatar_color || '#22d3ee' }"
    :title="user?.display_name || user?.username || $t('items.unassigned')"
  >
    {{ initials }}
  </span>
</template>
