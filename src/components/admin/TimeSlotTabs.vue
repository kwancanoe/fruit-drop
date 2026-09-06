<template>
  <!-- Section: Admin Time-Slot Navigation Tabs & Instant Search Bar -->
  <div id="admin-timeslot-tabs" data-audit-id="admin-timeslot-tabs" class="q-mb-md">
    <!-- Instant Search Box -->
    <div class="q-mb-sm">
      <q-input
        :model-value="searchQuery"
        outlined
        dense
        rounded
        clearable
        bg-color="white"
        placeholder="ค้นหาชื่อเล่น, ชื่อร้าน, ชั้น, หรือเบอร์โทร..."
        @update:model-value="val => $emit('update:searchQuery', String(val ?? ''))"
      >
        <template #prepend>
          <q-icon name="search" color="primary" />
        </template>
      </q-input>
    </div>

    <!-- Scrollable Time-Slot Filter Tabs -->
    <q-tabs
      :model-value="selectedSlot"
      dense
      outside-arrows
      mobile-arrows
      class="bg-white text-grey-8 rounded-borders shadow-1"
      active-color="primary"
      indicator-color="primary"
      @update:model-value="val => $emit('update:selectedSlot', String(val))"
    >
      <q-tab name="ALL" label="ทั้งหมด" class="text-weight-bold">
        <q-badge v-if="slotCounts['ALL']" color="primary" floating rounded>
          {{ slotCounts['ALL'] }}
        </q-badge>
      </q-tab>

      <q-tab
        v-for="slot in availableSlots"
        :key="slot"
        :name="slot"
        :label="slot"
        class="text-weight-medium"
      >
        <q-badge v-if="slotCounts[slot]" color="orange-9" floating rounded>
          {{ slotCounts[slot] }}
        </q-badge>
      </q-tab>
    </q-tabs>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  availableSlots: string[];
  selectedSlot: string;
  searchQuery: string;
  slotCounts: Record<string, number>;
}>();

defineEmits<{
  (e: 'update:selectedSlot', val: string): void;
  (e: 'update:searchQuery', val: string): void;
}>();
</script>
