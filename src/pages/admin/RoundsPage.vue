<template>
  <!-- Section: Full-Page Admin Preorder Rounds Management -->
  <q-page id="admin-rounds-page" data-audit-id="admin-rounds-page" class="q-pa-md bg-grey-1 text-grey-9 overflow-hidden" style="max-width: 680px; margin: 0 auto; padding-bottom: 84px; overflow-x: hidden;">
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
            จัดการรอบส่ง
          </div>
          <div class="text-caption text-grey-7">
            เปิดรอบใหม่ แก้ไขข้อมูล และควบคุมการเปิด/ปิดรับจอง
          </div>
        </div>
      </div>

      <!-- Action Buttons: Manage Fruit Catalog & Open New Round -->
      <div class="row items-center wrap" style="gap: 8px;">
        <q-btn
          outline
          color="primary"
          icon="eco"
          label="แคตตาล็อกผลไม้"
          no-caps
          rounded
          class="text-weight-bold q-px-sm"
          data-audit-id="btn-manage-fruits"
          to="/admin/fruits"
        />
        <q-btn
          color="positive"
          icon="add"
          label="เปิดรอบใหม่"
          no-caps
          rounded
          class="text-weight-bold shadow-1 q-px-sm"
          data-audit-id="btn-create-new-round"
          to="/admin/rounds/new"
        />
      </div>
    </div>

    <!-- Empty State -->
    <q-card v-if="fruitStore.allRounds.length === 0" class="bg-white q-pa-xl text-center text-grey-7 shadow-1">
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
    </q-card>

    <!-- Rounds List -->
    <div v-else class="column">
      <q-card
        v-for="round in fruitStore.allRounds"
        :key="round.roundId"
        class="bg-white text-grey-9 q-pa-md rounded-borders q-mb-md shadow-1 overflow-hidden full-width"
        :data-audit-id="`round-card-${round.roundId}`"
      >
        <!-- Top Row: Title -->
        <div class="row items-center no-wrap q-mb-xs">
          <q-icon name="event_note" color="positive" size="22px" class="q-mr-xs flex-shrink-0" />
          <span class="col text-subtitle1 text-weight-bolder text-grey-9 ellipsis">
            {{ round.title }}
          </span>
        </div>

        <!-- Details: Date, Standby, Location & Payment -->
        <div class="text-caption text-grey-7 q-mb-sm">
          <div class="row items-center no-wrap q-mb-xs">
            <q-icon name="event" size="15px" class="q-mr-xs text-primary flex-shrink-0" />
            <div class="col text-weight-medium ellipsis text-grey-8">{{ round.pickupDate }}</div>
          </div>

          <div class="row items-center no-wrap q-mb-xs">
            <q-icon name="schedule" size="15px" class="q-mr-xs text-primary flex-shrink-0" />
            <div class="col text-weight-medium ellipsis text-grey-8">เวลารับของ: {{ round.standbyTime || (round.pickupSlots && round.pickupSlots[0]) || '19:00 - 23:00' }} น.</div>
          </div>

          <div class="row items-start no-wrap q-mb-xs">
            <q-icon name="place" size="15px" class="q-mr-xs text-primary flex-shrink-0 q-mt-xs" />
            <div class="col ellipsis text-grey-8">{{ round.pickupLocation }}</div>
          </div>

          <div class="row items-start no-wrap">
            <q-icon name="payments" size="15px" class="q-mr-xs text-positive flex-shrink-0 q-mt-xs" />
            <div class="col text-grey-8">
              <div class="ellipsis">พร้อมเพย์: <strong>{{ round.promptPayNumber }}</strong> ({{ round.promptPayName }})</div>
              <div v-if="round.bankAccountNumber" class="ellipsis text-grey-7">ธ.กสิกรไทย (KBANK): <strong>{{ round.bankAccountNumber }}</strong></div>
            </div>
          </div>
        </div>

        <!-- Fruit Summary Avatars with Names (Identical to Customer Storefront) -->
        <div
          v-if="round.fruitSummary && round.fruitSummary.length > 0"
          class="q-mb-md"
          data-audit-id="round-fruit-avatars-section"
        >
          <div class="row items-start wrap" style="gap: 12px;" data-audit-id="round-fruit-avatars-row">
            <FruitMascotAvatar
              v-for="fruit in round.fruitSummary"
              :key="fruit"
              :name="fruit"
              size="54px"
            />
          </div>
        </div>

        <q-separator color="grey-3" class="q-mb-sm" />

        <!-- Actions Row: Customer Booking Toggle & Edit Button -->
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

          <!-- Edit Button -->
          <q-btn
            outline
            size="sm"
            no-caps
            color="warning"
            icon="edit"
            label="แก้ไขข้อมูล"
            class="q-px-sm text-weight-bold"
            :to="`/admin/rounds/${round.roundId}/edit`"
            :data-audit-id="`btn-edit-round-${round.roundId}`"
          />
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
import FruitMascotAvatar from '@/components/common/FruitMascotAvatar.vue';

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
</script>
