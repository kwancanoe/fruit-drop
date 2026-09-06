<template>
  <!-- Section: Active Open Rounds Overview Screen -->
  <div id="active-rounds-list" data-audit-id="active-rounds-list">
    <!-- Case 1: No Open Rounds Available -->
    <q-card v-if="rounds.length === 0" class="bg-white q-pa-xl text-center shadow-1">
      <q-icon name="event_busy" size="56px" color="grey-5" class="q-mb-sm" />
      <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-xs">
        ยังไม่มีรอบเปิดจอง
      </div>
      <div class="text-caption text-grey-6 q-mb-lg">
        รอรอบถัดไป หรือค้นหาออเดอร์ที่สั่งไว้
      </div>
      <q-btn
        outline
        color="primary"
        icon="search"
        label="ค้นหาออเดอร์"
        no-caps
        rounded
        class="q-px-md"
        @click="$emit('lookup-order')"
      />
    </q-card>

    <!-- Case 2: One or More Open Rounds -->
    <div v-else>
      <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm">
        รอบที่เปิดรับจอง ({{ rounds.length }}):
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
            <RoundStatusBadge :is-open="round.isOpen" />
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

          <!-- Fruits Available in this Round (Mascot Avatars with Names) -->
          <div
            v-if="round.fruitSummary && round.fruitSummary.length > 0"
            class="q-mb-md"
            data-audit-id="round-fruit-summary-section"
          >
            <div class="text-caption text-grey-7 q-mb-sm text-weight-medium">ผลไม้ในรอบนี้:</div>
            <div class="row items-start wrap" style="gap: 12px;" data-audit-id="round-fruit-avatars-row">
              <FruitMascotAvatar
                v-for="fruit in round.fruitSummary"
                :key="fruit"
                :name="fruit"
                size="54px"
              />
            </div>
          </div>

          <!-- CTA Button -->
          <q-btn
            color="positive"
            class="full-width q-py-sm text-weight-bolder text-subtitle2 shadow-2 btn-gradient-primary"
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
import RoundStatusBadge from '@/components/common/RoundStatusBadge.vue';
import FruitMascotAvatar from '@/components/common/FruitMascotAvatar.vue';

defineProps<{
  rounds: PreorderRound[];
}>();

defineEmits<{
  (e: 'select-round', round: PreorderRound): void;
  (e: 'lookup-order'): void;
}>();
</script>
