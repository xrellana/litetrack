<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  status: { type: String, required: true }
});

const { t, te } = useI18n();

function statusLabel(status) {
  const key = `status.${status}`;
  return te(key) ? t(key) : status;
}
</script>

<template>
  <span class="badge" :class="status">{{ statusLabel(status) }}</span>
</template>
