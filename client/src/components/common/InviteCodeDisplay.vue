<script setup>
import { ref } from 'vue';
import { Copy, RefreshCw } from 'lucide-vue-next';

defineProps({
  code: { type: String, required: true },
  canRegenerate: { type: Boolean, default: false },
  busy: { type: Boolean, default: false }
});

const emit = defineEmits(['regenerate']);
const copied = ref(false);

async function copyCode(code) {
  await navigator.clipboard.writeText(code);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1500);
}
</script>

<template>
  <div class="copy-code">
    <span>{{ code }}</span>
    <div class="toolbar">
      <button class="button icon secondary" type="button" title="Copy invite code" @click="copyCode(code)">
        <Copy :size="18" />
      </button>
      <button
        v-if="canRegenerate"
        class="button icon secondary"
        type="button"
        title="Regenerate invite code"
        :disabled="busy"
        @click="emit('regenerate')"
      >
        <RefreshCw :size="18" />
      </button>
    </div>
    <small v-if="copied" class="muted">Copied</small>
  </div>
</template>

