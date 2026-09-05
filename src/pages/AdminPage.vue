<template>
  <!-- Section: Admin Tailgate Dispatch Desk & Scale Engine -->
  <q-page id="admin-dispatch-page" data-audit-id="admin-dispatch-page" class="q-pa-md bg-grey-10 text-white" style="min-height: 100vh; max-width: 680px; margin: 0 auto;">
    <!-- 1. High-Contrast Night Toolbar & Stats -->
    <AdminHeaderBar
      :auth-user="fruitStore.authUser"
      :is-admin="fruitStore.isAdmin"
      :total-count="ordersCount"
      :completed-count="completedOrdersCount"
      :cash-in-hand-total="cashInHandTotal"
      :prepaid-total="prepaidTotal"
      @login="handleLogin"
      @logout="handleLogout"
      @open-harvest-summary="isHarvestSummaryOpen = true"
    />

    <!-- Database Seed Action Banner (shown if orders or products are empty) -->
    <div v-if="fruitStore.products.length === 0" class="bg-grey-9 q-pa-md rounded-borders q-mb-md text-center">
      <div class="text-subtitle2 text-amber q-mb-xs">ยังไม่มีรายการผลไม้ในฐานข้อมูล</div>
      <div class="text-caption text-grey-4 q-mb-sm">กดปุ่มด้านล่างเพื่อบันทึกผลไม้และรอบเปิดตัวอย่างลง Firestore</div>
      <q-btn
        color="positive"
        icon="cloud_upload"
        label="นำเข้าข้อมูลตั้งต้น (Seed Initial Catalog)"
        no-caps
        dense
        class="q-px-md"
        @click="handleSeedData"
      />
    </div>

    <!-- 2. Time-Slot Filter Tabs & Instant Search -->
    <TimeSlotTabs
      :available-slots="availableSlots"
      v-model:selected-slot="selectedSlot"
      v-model:search-query="searchQuery"
      :slot-counts="slotCounts"
    />

    <!-- Orders Dispatch List -->
    <div v-if="filteredOrders.length === 0" class="bg-grey-9 q-pa-xl rounded-borders text-center text-grey-4">
      <q-icon name="inbox" size="48px" class="q-mb-sm text-grey-6" />
      <div class="text-subtitle1">ไม่พบรายการออเดอร์</div>
      <div class="text-caption text-grey-5">ในรอบเวลาหรือคำค้นหานี้</div>
    </div>

    <div v-else>
      <TailgateOrderCard
        v-for="order in filteredOrders"
        :key="order.orderId"
        :order="order"
        @open-scale="handleOpenScale"
        @mark-delivered="handleMarkDelivered"
        @collect-cash-deliver="handleCollectCashDeliver"
        @revert-status="handleRevertStatus"
      />
    </div>

    <!-- 3. Durian Digital Scale & Dynamic PromptPay QR Modal -->
    <DurianScaleModal
      v-model:is-open="isScaleModalOpen"
      :order="scaleTargetOrder"
      :item-index="scaleTargetItemIndex"
      :prompt-pay-number="fruitStore.activeRound?.promptPayNumber || '081-234-5678'"
      :prompt-pay-name="fruitStore.activeRound?.promptPayName || 'คุณอ้น (ธ.กสิกรไทย)'"
      @confirm="handleScaleConfirm"
    />

    <!-- 4. One-Click Orchard Harvest Summary Sheet for LINE -->
    <HarvestSummaryModal
      v-model:is-open="isHarvestSummaryOpen"
      :round="fruitStore.activeRound"
      :orders="fruitStore.orders"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import AdminHeaderBar from '@/components/admin/AdminHeaderBar.vue';
import TimeSlotTabs from '@/components/admin/TimeSlotTabs.vue';
import TailgateOrderCard from '@/components/admin/TailgateOrderCard.vue';
import DurianScaleModal from '@/components/admin/DurianScaleModal.vue';
import HarvestSummaryModal from '@/components/admin/HarvestSummaryModal.vue';

const $q = useQuasar();
const fruitStore = useFruitStore();

// Filter states
const selectedSlot = ref<string>('ALL');
const searchQuery = ref<string>('');

// Modal states
const isScaleModalOpen = ref<boolean>(false);
const scaleTargetOrder = ref<Order | null>(null);
const scaleTargetItemIndex = ref<number>(-1);
const isHarvestSummaryOpen = ref<boolean>(false);

// Slots
const availableSlots = computed<string[]>(() => {
  return fruitStore.activeRound?.pickupSlots || [
    '19:00 - 19:30',
    '19:30 - 20:00',
    '20:00 - 20:30',
    '21:00+ (หลังห้างปิด)'
  ];
});

// Slot counts
const slotCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = { ALL: 0 };
  for (const slot of availableSlots.value) {
    counts[slot] = 0;
  }

  for (const o of fruitStore.orders) {
    if (o.orderStatus === 'WAITING_PICKUP') {
      counts.ALL = (counts.ALL || 0) + 1;
      const slotVal = counts[o.pickupSlot];
      if (slotVal !== undefined) {
        counts[o.pickupSlot] = slotVal + 1;
      }
    }
  }

  return counts;
});

// Orders Count Stats
const ordersCount = computed<number>(() => {
  return fruitStore.orders.filter(o => o.orderStatus !== 'CANCELLED').length;
});

const completedOrdersCount = computed<number>(() => {
  return fruitStore.orders.filter(o => o.orderStatus === 'COMPLETED').length;
});

// Cash collected in hand
const cashInHandTotal = computed<number>(() => {
  return fruitStore.orders
    .filter(o => o.paymentMethod === 'PAY_AT_CAR' && o.orderStatus === 'COMPLETED')
    .reduce((sum, o) => sum + (o.totalFinalPrice || o.totalEstimatedPrice), 0);
});

// Bank transfer prepaid total
const prepaidTotal = computed<number>(() => {
  return fruitStore.orders
    .filter(o => o.paymentMethod === 'PROMPTPAY_PREPAID' && o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.totalFinalPrice || o.totalEstimatedPrice), 0);
});

// Filtered Orders
const filteredOrders = computed<Order[]>(() => {
  let list = fruitStore.orders;

  // Filter by slot
  if (selectedSlot.value !== 'ALL') {
    list = list.filter(o => o.pickupSlot === selectedSlot.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(o =>
      o.customer.name.toLowerCase().includes(q) ||
      o.customer.shop.toLowerCase().includes(q) ||
      o.customer.floor.toLowerCase().includes(q) ||
      o.customer.phone.includes(q) ||
      o.orderId.toLowerCase().includes(q)
    );
  }

  return list;
});

// Auth Handlers
async function handleLogin() {
  try {
    await fruitStore.loginAdmin();
    $q.notify({ type: 'positive', message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'ไม่สามารถเข้าสู่ระบบได้' });
  }
}

async function handleLogout() {
  await fruitStore.logoutAdmin();
  $q.notify({ type: 'info', message: 'ออกจากระบบแล้ว' });
}

// Seed Demo Catalog
async function handleSeedData() {
  try {
    await fruitStore.seedMasterData();
    $q.notify({ type: 'positive', message: 'นำเข้าข้อมูลตั้งต้นลง Firestore สำเร็จ!' });
  } catch (err) {
    console.error('Error seeding data:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
}

// Scale Handlers
function handleOpenScale(payload: { order: Order; itemIndex: number }) {
  scaleTargetOrder.value = payload.order;
  scaleTargetItemIndex.value = payload.itemIndex;
  isScaleModalOpen.value = true;
}

async function handleScaleConfirm(payload: {
  orderId: string;
  itemIndex: number;
  weighedKg: number;
  finalPrice: number;
  paymentMode: 'CASH' | 'TRANSFER';
}) {
  await fruitStore.updateWeighedFruit(
    payload.orderId,
    payload.itemIndex,
    payload.weighedKg,
    payload.finalPrice
  );

  // Automatically mark as completed and set payment status
  await fruitStore.updateOrderStatus(payload.orderId, {
    orderStatus: 'COMPLETED',
    paymentStatus: 'PAID',
    completedAt: Date.now(),
    paidAt: Date.now()
  });

  $q.notify({
    type: 'positive',
    message: `บันทึกน้ำหนัก ${payload.weighedKg} กก. (${payload.finalPrice} บ.) และส่งมอบแล้ว!`,
    position: 'top',
    timeout: 2000
  });
}

// Mark delivered for pre-paid orders
async function handleMarkDelivered(orderId: string) {
  await fruitStore.updateOrderStatus(orderId, {
    orderStatus: 'COMPLETED',
    completedAt: Date.now()
  });
  $q.notify({ type: 'positive', message: `ส่งมอบ #${orderId} เรียบร้อยแล้ว`, position: 'top', timeout: 1500 });
}

// Single-tap cash collection & delivery
async function handleCollectCashDeliver(orderId: string) {
  await fruitStore.updateOrderStatus(orderId, {
    orderStatus: 'COMPLETED',
    paymentStatus: 'PAID',
    completedAt: Date.now(),
    paidAt: Date.now()
  });
  $q.notify({
    type: 'positive',
    message: `รับเงินสดและส่งมอบ #${orderId} เรียบร้อย!`,
    position: 'top',
    timeout: 1500
  });
}

// Revert status if tapped by mistake
async function handleRevertStatus(orderId: string) {
  await fruitStore.updateOrderStatus(orderId, {
    orderStatus: 'WAITING_PICKUP',
    completedAt: undefined
  });
  $q.notify({ type: 'info', message: `ยกเลิกสถานะ #${orderId} แล้ว`, position: 'top', timeout: 1500 });
}

onMounted(() => {
  fruitStore.subscribeToOrders(fruitStore.activeRoundId);
});
</script>
