<script setup>
import ItemCard from './ItemCard.vue';
import { STATUSES } from '../../stores/items';

defineProps({
  items: { type: Array, default: () => [] }
});

const emit = defineEmits(['open', 'status']);

function byStatus(items, status) {
  return items.filter((item) => item.status === status);
}
</script>

<template>
  <div class="board">
    <section v-for="status in STATUSES" :key="status.value" class="board-column">
      <div class="board-column-header">
        <strong>{{ status.label }}</strong>
        <span class="badge" :class="status.value">{{ byStatus(items, status.value).length }}</span>
      </div>
      <TransitionGroup name="list" tag="div" class="board-column-body">
        <ItemCard
          v-for="item in byStatus(items, status.value)"
          :key="item.id"
          :item="item"
          @open="emit('open', $event)"
          @status="(item, nextStatus) => emit('status', item, nextStatus)"
        />
      </TransitionGroup>
      <div v-if="!byStatus(items, status.value).length" class="empty" style="min-height:120px;margin:10px">
        No items
      </div>
    </section>
  </div>
</template>
