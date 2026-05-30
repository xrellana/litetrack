<script setup>
import { Send } from 'lucide-vue-next';
import { reactive } from 'vue';
import UserAvatar from '../common/UserAvatar.vue';
import { STATUSES } from '../../stores/items';

defineProps({
  updates: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false }
});

const emit = defineEmits(['submit']);
const form = reactive({ content: '', status: '' });

function submit() {
  if (!form.content.trim()) return;
  emit('submit', {
    content: form.content,
    status: form.status || undefined
  });
  form.content = '';
  form.status = '';
}
</script>

<template>
  <section class="stack">
    <form class="panel stack" style="padding:14px" @submit.prevent="submit">
      <label class="field">
        <span>Progress update</span>
        <textarea v-model="form.content" class="textarea" maxlength="5000" required />
      </label>
      <div class="toolbar" style="justify-content:space-between">
        <select v-model="form.status" class="select" style="max-width:220px">
          <option value="">Keep status</option>
          <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option>
        </select>
        <button class="button" type="submit" :disabled="busy">
          <Send :size="17" /> Post
        </button>
      </div>
    </form>

    <div class="timeline">
      <article v-for="update in updates" :key="update.id" class="timeline-row">
        <div class="avatar-row">
          <UserAvatar :user="update.user" />
          <span>
            <strong>{{ update.user?.display_name }}</strong>
            <small class="muted" style="display:block">{{ new Date(update.created_at).toLocaleString() }}</small>
          </span>
        </div>
        <p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">{{ update.content }}</p>
        <small v-if="update.status_change" class="badge in_progress">{{ update.status_change }}</small>
      </article>
      <div v-if="!updates.length" class="empty">No progress updates yet.</div>
    </div>
  </section>
</template>

