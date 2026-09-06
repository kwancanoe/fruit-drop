<template>
  <!-- Section: Full-Page Admin Preorder Rounds Management -->
  <q-page id="admin-rounds-page" data-audit-id="admin-rounds-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 76px;">
    <!-- Page Header with Back Navigation -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn
          flat
          dense
          round
          icon="arrow_back"
          color="grey-8"
          class="q-mr-sm"
          data-audit-id="btn-back-to-dispatch"
          @click="handleBack"
        >
          <q-tooltip>กลับโต๊ะจ่ายของท้ายรถ</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight text-grey-9">
            จัดการรอบการจองผลไม้
          </div>
          <div class="text-caption text-grey-7">
            เปิดรอบใหม่ แก้ไขข้อมูล และควบคุมการเปิด/ปิดรับจอง
          </div>
        </div>
      </div>

      <!-- Action Button: Open New Round -->
      <q-btn
        color="positive"
        icon="add"
        label="เปิดรอบใหม่"
        no-caps
        class="text-weight-bold shadow-1 q-px-sm"
        data-audit-id="btn-create-new-round"
        to="/admin/rounds/new"
      />
    </div>

    <!-- Empty State -->
    <div v-if="fruitStore.allRounds.length === 0" class="bg-white q-pa-xl rounded-borders text-center text-grey-7 shadow-1">
      <q-icon name="event_busy" size="48px" class="q-mb-sm text-grey-4" />
      <div class="text-subtitle1 text-weight-bold text-grey-8">ยังไม่มีรอบการจองในระบบ</div>
      <div class="text-caption text-grey-6 q-mb-md">กดปุ่ม 'เปิดรอบใหม่' ด้านบนเพื่อสร้างรอบแรก</div>
      <q-btn
        color="positive"
        icon="add"
        label="เปิดรอบจองแรก"
        no-caps
        to="/admin/rounds/new"
      />
    </div>

    <!-- Rounds List -->
    <div v-else class="column">
      <q-card
        v-for="round in fruitStore.allRounds"
        :key="round.roundId"
        class="bg-white text-grey-9 q-pa-md rounded-borders q-mb-md shadow-1"
        :data-audit-id="`round-card-${round.roundId}`"
      >
        <!-- Top Row: Title & Status Badge -->
        <div class="row items-center justify-between q-mb-xs">
          <div class="row items-center">
            <q-icon name="event_note" color="positive" size="22px" class="q-mr-xs" />
            <span class="text-subtitle1 text-weight-bolder text-grey-9">
              {{ round.title }}
            </span>
          </div>
          <RoundStatusBadge :is-open="round.isOpen" />
        </div>

        <!-- Details: Date, Standby & Location -->
        <div class="text-caption text-grey-7 row items-center q-mb-xs">
          <q-icon name="event" size="14px" class="q-mr-xs text-primary" />
          <span class="text-weight-medium q-mr-md">{{ round.pickupDate }}</span>
          <q-icon name="schedule" size="14px" class="q-mr-xs text-primary" />
          <span class="text-weight-medium q-mr-md">Standby: {{ round.standbyTime || (round.pickupSlots && round.pickupSlots[0]) || '19:00 - 23:00' }} น.</span>
          <q-icon name="place" size="14px" class="q-mr-xs text-primary" />
          <span class="ellipsis">{{ round.pickupLocation }}</span>
        </div>

        <!-- Bank & PromptPay Credentials -->
        <div class="text-caption text-grey-7 row items-center q-mb-sm">
          <q-icon name="payments" size="14px" class="q-mr-xs text-positive" />
          <span class="q-mr-sm">พร้อมเพย์: <strong>{{ round.promptPayNumber }}</strong> ({{ round.promptPayName }})</span>
          <span v-if="round.bankAccountNumber">| KBANK: <strong>{{ round.bankAccountNumber }}</strong></span>
        </div>

        <!-- Fruit Summary Chips -->
        <div v-if="round.fruitSummary && round.fruitSummary.length > 0" class="row items-center q-mb-md">
          <FruitChip
            v-for="fruit in round.fruitSummary"
            :key="fruit"
            :name="fruit"
          />
        </div>

        <q-separator color="grey-3" class="q-mb-sm" />

        <!-- Actions Row -->
        <div class="row items-center justify-between">
          <!-- Toggle Open / Closed Switch -->
          <q-toggle
            :model-value="round.isOpen"
            color="positive"
            dense
            label="เปิดรับจอง"
            left-label
            class="text-caption text-weight-bold text-grey-8"
            :data-audit-id="`toggle-round-status-${round.roundId}`"
            @update:model-value="val => handleToggleStatus(round.roundId, val)"
          />

          <!-- Command Buttons -->
          <div class="row items-center">
            <!-- Edit Button -->
            <q-btn
              outline
              size="sm"
              no-caps
              color="warning"
              icon="edit"
              label="แก้ไขข้อมูล"
              class="q-mr-sm q-px-sm text-weight-bold"
              :to="`/admin/rounds/${round.roundId}/edit`"
              :data-audit-id="`btn-edit-round-${round.roundId}`"
            />

            <!-- Select Active Button -->
            <q-btn
              size="sm"
              no-caps
              :color="fruitStore.activeRoundId === round.roundId ? 'positive' : 'grey-7'"
              :icon="fruitStore.activeRoundId === round.roundId ? 'check_circle' : 'visibility'"
              :label="fruitStore.activeRoundId === round.roundId ? 'รอบปัจจุบัน' : 'ดูออเดอร์'"
              class="q-px-sm text-weight-bold shadow-1"
              :data-audit-id="`btn-select-round-${round.roundId}`"
              @click="handleSelectActive(round)"
            />
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
// Full-page Rounds Management view: Lists all rounds with live toggles and edit links
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { PreorderRound } from '@/types/fruit_app';
import RoundStatusBadge from '@/components/common/RoundStatusBadge.vue';
import FruitChip from '@/components/common/FruitChip.vue';

const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();

// Back navigation handler
function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin');
  }
}

// Toggle round open/close status
async function handleToggleStatus(roundId: string, isOpen: boolean) {
  try {
    await fruitStore.toggleRoundStatus(roundId, isOpen);
    $q.notify({
      type: 'positive',
      message: isOpen ? 'เปิดรับจองรอบนี้แล้ว' : 'ปิดรับจองรอบนี้แล้ว',
      position: 'top',
      timeout: 1500
    });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'ไม่สามารถเปลี่ยนสถานะได้' });
  }
}

// Select active round for tailgate desk
function handleSelectActive(round: PreorderRound) {
  fruitStore.selectActiveRound(round);
  $q.notify({
    type: 'info',
    message: `เลือก '${round.title}' เป็นรอบปัจจุบันแล้ว`,
    position: 'top',
    timeout: 1500
  });
  void router.push('/admin');
}
</script>
