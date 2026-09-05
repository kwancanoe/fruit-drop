<template>
  <!-- Section: Admin Tailgate Dispatch Desk & Scale Engine -->
  <q-page id="admin-dispatch-page" data-audit-id="admin-dispatch-page" class="q-pa-md bg-grey-10 text-white" style="max-width: 680px; margin: 0 auto;">
    <!-- Live Statistics Strip -->
    <div class="bg-grey-9 text-white q-pa-sm rounded-borders q-mb-md shadow-2">
      <div class="row items-center justify-around text-center text-caption">
        <!-- Delivered Progress -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-4">ส่งมอบแล้ว</div>
          <div class="text-subtitle2 text-weight-bolder text-positive">
            {{ completedOrdersCount }} / {{ ordersCount }} รายการ
          </div>
        </div>

        <!-- Cash in hand -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-4">เงินสดในมือ</div>
          <div class="text-subtitle2 text-weight-bolder text-warning">
            {{ cashInHandTotal.toLocaleString() }} บาท
          </div>
        </div>

        <!-- Bank transfer -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-4">ยอดโอนพร้อมเพย์</div>
          <div class="text-subtitle2 text-weight-bolder text-info">
            {{ prepaidTotal.toLocaleString() }} บาท
          </div>
        </div>
      </div>
    </div>

    <!-- Active Round Indicator -->
    <div v-if="fruitStore.activeRound" class="bg-grey-9 q-pa-sm rounded-borders q-mb-md row items-center justify-between shadow-1">
      <div class="row items-center">
        <q-icon name="event_available" color="positive" size="20px" class="q-mr-xs" />
        <span class="text-caption text-grey-3">
          รอบปัจจุบัน: <strong>{{ fruitStore.activeRound.title }}</strong> ({{ fruitStore.activeRound.pickupDate }})
        </span>
      </div>
      <q-btn
        flat
        dense
        no-caps
        color="positive"
        icon="swap_horiz"
        label="เปลี่ยนรอบ"
        size="sm"
        to="/admin/rounds"
      />
    </div>

    <!-- Time-Slot Filter Tabs & Instant Search -->
    <TimeSlotTabs
      :available-slots="availableSlots"
      v-model:selected-slot="selectedSlot"
      v-model:search-query="searchQuery"
      :slot-counts="slotCounts"
    />

    <!-- Orders Dispatch List -->
    <div v-if="filteredOrders.length === 0" class="bg-grey-9 q-pa-xl rounded-borders text-center text-grey-4 shadow-1">
      <q-icon name="inbox" size="48px" class="q-mb-sm text-grey-6" />
      <div class="text-subtitle1 text-weight-bold">ไม่พบรายการออเดอร์</div>
      <div class="text-caption text-grey-5">ในรอบเวลาหรือคำค้นหานี้</div>
    </div>

    <div v-else>
      <TailgateOrderCard
        v-for="order in filteredOrders"
        :key="order.orderId"
        :order="order"
        @open-scale="handleOpenScale"
        @open-proof-modal="handleOpenProofModal"
        @mark-delivered="handleMarkDelivered"
        @collect-cash-deliver="handleCollectCashDeliver"
        @revert-status="handleRevertStatus"
      />
    </div>

    <!-- Inline Utility Modals for real-time car interaction -->
    <!-- Durian Scale Modal -->
    <DurianScaleModal
      v-model:is-open="isScaleModalOpen"
      :order="scaleTargetOrder"
      :item-index="scaleTargetItemIndex"
      :prompt-pay-number="fruitStore.activeRound?.promptPayNumber || '0878902935'"
      :prompt-pay-name="fruitStore.activeRound?.promptPayName || 'นาตยา บุญณะ'"
      @confirm="handleScaleConfirm"
    />

    <!-- Payment Proof Modal -->
    <PaymentProofModal
      v-model:is-open="isProofModalOpen"
      :order="proofTargetOrder"
    />
  </q-page>
</template>

<script setup lang="ts">
// Tailgate Dispatch Desk: Handles live order delivery, durian scale calculator, and payment confirmation
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import TimeSlotTabs from '@/components/admin/TimeSlotTabs.vue';
import TailgateOrderCard from '@/components/admin/TailgateOrderCard.vue';
import DurianScaleModal from '@/components/admin/DurianScaleModal.vue';
import PaymentProofModal from '@/components/admin/PaymentProofModal.vue';

const $q = useQuasar();
const fruitStore = useFruitStore();

// Filter states
const selectedSlot = ref<string>('ALL');
const searchQuery = ref<string>('');

// Modal states for car interactions
const isScaleModalOpen = ref<boolean>(false);
const scaleTargetOrder = ref<Order | null>(null);
const scaleTargetItemIndex = ref<number>(-1);
const isProofModalOpen = ref<boolean>(false);
const proofTargetOrder = ref<Order | null>(null);

function handleOpenProofModal(order: Order) {
  proofTargetOrder.value = order;
  isProofModalOpen.value = true;
}

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
</script>
