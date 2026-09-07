<template>
  <!-- Section: Customer Batch Header & Announcement Banner -->
  <q-card id="customer-batch-header" data-audit-id="customer-batch-header" class="rounded-borders bg-white shadow-2 q-mb-md">
    <q-card-section class="q-pa-md text-center">
      <!-- Round Title -->
      <div class="text-h6 text-weight-bolder text-primary q-mb-xs">
        {{ round?.title || 'เปิดรอบสั่งจองผลไม้สด Fruit Drop' }}
      </div>

      <q-separator class="q-my-sm" />

      <!-- Pickup Logistics Details -->
      <div class="row items-center justify-center text-body2 text-grey-9 q-mt-xs">
        <div class="col-12 col-sm-auto row items-center justify-center q-px-sm q-py-xs">
          <q-icon name="event" color="primary" size="20px" class="q-mr-xs" />
          <span class="text-weight-medium">{{ formatThaiPickupDate(round?.pickupDate) }}</span>
        </div>
        <div class="col-12 col-sm-auto row items-center justify-center q-px-sm q-py-xs">
          <q-icon name="local_shipping" color="primary" size="20px" class="q-mr-xs" />
          <span>{{ round?.pickupLocation || 'ท้ายรถลานจอดรถห้าง' }}</span>
        </div>
      </div>

      <!-- Time badge -->
      <div class="q-mt-sm">
        <q-badge color="positive" class="text-subtitle2 q-px-md q-py-xs" rounded>
          <q-icon name="schedule" class="q-mr-xs" />
          ช่วงเวลาส่งของที่รถ: {{ round?.standbyTime || (round?.pickupSlots && round?.pickupSlots[0]) || '19:00 - 23:00' }} น.
        </q-badge>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { PreorderRound } from '@/types/fruit_app';
import { formatThaiPickupDate } from '@/utils/roundDate';

defineProps<{
  round: PreorderRound | null;
}>();
</script>
