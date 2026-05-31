<script setup>
import { reactive, watch } from 'vue';
import { Check, Pin, X } from 'lucide-vue-next';
import { PRIORITIES, STATUSES } from '../../stores/items';

const props = defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null },
  members: { type: Array, default: () => [] },
  availableTeams: { type: Array, default: () => [] },
  selectedTeamId: { type: Number, default: null },
  showTeamSelect: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
});

const emit = defineEmits(['close', 'submit', 'team-change']);
const form = reactive({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigned_to: '',
  team_id: '',
  due_date: '',
  is_pinned: false
});

watch(
  () => [props.show, props.item],
  () => {
    form.title = props.item?.title || '';
    form.description = props.item?.description || '';
    form.status = props.item?.status || 'todo';
    form.priority = props.item?.priority || 'medium';
    form.assigned_to = props.item?.assigned_to || '';
    form.team_id = props.selectedTeamId || props.item?.team_id || '';
    form.due_date = props.item?.due_date || '';
    form.is_pinned = Boolean(props.item?.is_pinned);
  },
  { immediate: true }
);

watch(
  () => props.selectedTeamId,
  (teamId) => {
    if (!props.item && teamId) form.team_id = teamId;
  }
);

function changeTeam() {
  form.assigned_to = '';
  emit('team-change', Number(form.team_id));
}

function submit() {
  emit('submit', {
    title: form.title,
    description: form.description,
    status: form.status,
    priority: form.priority,
    team_id: form.team_id ? Number(form.team_id) : undefined,
    assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    due_date: form.due_date || null,
    is_pinned: form.is_pinned,
    updated_at: props.item?.updated_at
  });
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-backdrop" @click.self="emit('close')">
      <form class="modal panel stack" @submit.prevent="submit">
        <div class="section-header">
          <div>
            <h2 style="margin:0">{{ item ? $t('items.editItem') : $t('items.createItem') }}</h2>
            <p class="muted" style="margin:4px 0 0">{{ $t('items.metadata') }}</p>
          </div>
          <button class="button icon secondary" type="button" :title="$t('common.close')" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>
        <div v-if="error" class="error-box">{{ error }}</div>
        <label class="field">
          <span>{{ $t('items.title') }}</span>
          <input v-model="form.title" class="input" maxlength="140" required />
        </label>
        <label v-if="showTeamSelect && !item" class="field">
          <span>{{ $t('common.team') }}</span>
          <select v-model="form.team_id" class="select" required @change="changeTeam">
            <option v-for="team in availableTeams" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ $t('common.description') }}</span>
          <textarea v-model="form.description" class="textarea" maxlength="5000" />
        </label>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
          <label class="field">
            <span>{{ $t('items.status') }}</span>
            <select v-model="form.status" class="select">
              <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ $t(`status.${status.value}`) }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ $t('items.priority') }}</span>
            <select v-model="form.priority" class="select">
              <option v-for="priority in PRIORITIES" :key="priority.value" :value="priority.value">{{ $t(`priority.${priority.value}`) }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ $t('items.assignee') }}</span>
            <select v-model="form.assigned_to" class="select">
              <option value="">{{ $t('items.unassigned') }}</option>
              <option v-for="member in members" :key="member.user_id" :value="member.user_id">
                {{ member.user.display_name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>{{ $t('items.dueDate') }}</span>
            <input v-model="form.due_date" class="input" type="date" />
          </label>
        </div>
        <label class="avatar-row" style="cursor:pointer">
          <input v-model="form.is_pinned" type="checkbox" />
          <Pin :size="16" /> {{ $t('items.pinItem') }}
        </label>

        <div class="toolbar" style="justify-content:flex-end">
          <button class="button secondary" type="button" @click="emit('close')">{{ $t('common.cancel') }}</button>
          <button class="button" type="submit" :disabled="busy">
            <Check :size="17" /> {{ $t('common.save') }}
          </button>
        </div>
      </form>
    </div>
  </Transition>
</template>
