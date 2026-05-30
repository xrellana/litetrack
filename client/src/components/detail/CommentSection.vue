<script setup>
import { MessageSquarePlus } from 'lucide-vue-next';
import { ref } from 'vue';
import UserAvatar from '../common/UserAvatar.vue';

defineProps({
  comments: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false }
});

const emit = defineEmits(['submit']);
const content = ref('');

function submit() {
  if (!content.value.trim()) return;
  emit('submit', { content: content.value });
  content.value = '';
}
</script>

<template>
  <section class="stack">
    <form class="panel stack" style="padding:14px" @submit.prevent="submit">
      <label class="field">
        <span>Comment</span>
        <textarea v-model="content" class="textarea" maxlength="5000" required />
      </label>
      <div class="toolbar" style="justify-content:flex-end">
        <button class="button" type="submit" :disabled="busy">
          <MessageSquarePlus :size="17" /> Comment
        </button>
      </div>
    </form>

    <div class="comments">
      <article v-for="comment in comments" :key="comment.id" class="comment-row">
        <div class="avatar-row">
          <UserAvatar :user="comment.user" />
          <span>
            <strong>{{ comment.user?.display_name }}</strong>
            <small class="muted" style="display:block">{{ new Date(comment.created_at).toLocaleString() }}</small>
          </span>
        </div>
        <p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">{{ comment.content }}</p>
      </article>
      <div v-if="!comments.length" class="empty">No comments yet.</div>
    </div>
  </section>
</template>

