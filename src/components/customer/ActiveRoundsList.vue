<template>
  <!-- Section: Active Open Rounds Overview Screen -->
  <div id="active-rounds-list" data-audit-id="active-rounds-list">
    <!-- Case 1: No Open Rounds Available -->
    <div v-if="rounds.length === 0" class="bg-white q-pa-xl rounded-borders text-center shadow-1">
      <q-icon name="event_busy" size="56px" color="grey-5" class="q-mb-sm" />
      <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-xs">
        ขณะนี้ยังไม่มีรอบเปิดจองผลไม้
      </div>
      <div class="text-caption text-grey-6 q-mb-lg">
        กรุณารอรอบเปิดจองถัดไป หรือตรวจสอบสถานะออเดอร์เดิมของคุณ
      </div>
      <q-btn
        outline
        color="primary"
        icon="search"
        label="ตรวจสอบออเดอร์ของฉัน"
        no-caps
        rounded
        class="q-px-md"
        @click="$emit('lookup-order')"
      />
    </div>

    <!-- Case 2: One or More Open Rounds -->
    <div v-else>
      <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm">
        รอบที่เปิดให้สั่งจองในขณะนี้ ({{ rounds.length }} รอบ):
      </div>

      <q-card
        v-for="round in rounds"
        :key="round.roundId"
        class="rounded-borders bg-white shadow-2 q-mb-md"
      >
        <q-card-section class="q-pa-md">
          <!-- Title & Active Badge -->
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-weight-bolder text-primary">
              {{ round.title }}
            </div>
            <q-badge color="positive" class="text-weight-bold" rounded>
              🟢 เปิดรับจอง
            </q-badge>
          </div>

          <q-separator class="q-my-sm" />

          <!-- Date & Location -->
          <div class="q-mb-sm text-body2 text-grey-9">
            <div class="row items-center q-mb-xs">
              <q-icon name="event" color="primary" size="18px" class="q-mr-xs" />
              <span><strong>วันที่นัดรับ:</strong> {{ round.pickupDate }}</span>
            </div>
            <div class="row items-center q-mb-xs">
              <q-icon name="schedule" color="primary" size="18px" class="q-mr-xs" />
              <span><strong>เวลานัดรับ:</strong> เริ่ม 19:00 น. เป็นต้นไป</span>
            </div>
            <div class="row items-center">
              <q-icon name="place" color="primary" size="18px" class="q-mr-xs" />
              <span><strong>จุดนัดรับ:</strong> {{ round.pickupLocation }}</span>
            </div>
          </div>

          <!-- Fruits Available in this Round -->
          <div v-if="round.fruitSummary && round.fruitSummary.length > 0" class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-xs">ผลไม้ในรอบนี้:</div>
            <div class="row items-center">
              <q-chip
                v-for="fruit in round.fruitSummary"
                :key="fruit"
                dense
                color="green-1"
                text-color="primary"
                class="text-weight-bold q-mr-xs q-mb-xs"
              >
                {{ fruit }}
              </q-chip>
            </div>
          </div>

          <!-- CTA Button -->
          <q-btn
            color="positive"
            class="full-width q-py-sm text-weight-bolder text-subtitle2 shadow-2"
            no-caps
            rounded
            icon-right="arrow_forward"
            label="สั่งจองรอบนี้"
            @click="$emit('select-round', round)"
          />
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PreorderRound } from '@/types/fruit_app';

defineProps<{
  rounds: PreorderRound[];
}>();

defineEmits<{
  (e: 'select-round', round: PreorderRound): void;
  (e: 'lookup-order'): void;
}>();
</script>
