<template>
  <!-- Section: Pickup Time-Slot Picker -->
  <q-card id="customer-pickup-slot-picker" data-audit-id="customer-pickup-slot-picker" class="rounded-borders bg-white shadow-1 q-mb-md">
    <q-card-section class="q-pa-md">
      <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-sm row items-center">
        <q-icon name="access_time" color="primary" class="q-mr-xs" size="22px" />
        <span>เลือกช่วงเวลานัดรับ</span>
      </div>

      <!-- Time Slot Chips -->
      <div class="row items-center">
        <q-chip
          v-for="slot in slots"
          :key="slot"
          clickable
          :selected="modelValue === slot"
          :color="modelValue === slot ? 'primary' : 'grey-2'"
          :text-color="modelValue === slot ? 'white' : 'grey-9'"
          class="text-weight-bold q-mr-sm q-mb-xs"
          size="md"
          @click="selectSlot(slot)"
        >
          <q-icon name="schedule" size="16px" class="q-mr-xs" />
          {{ slot }}
        </q-chip>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
const props = defineProps<{
  slots: string[];
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function selectSlot(slot: string) {
  emit('update:modelValue', slot);
}
</script>
