<template>
  <!-- Section: Admin Tailgate Dispatch Desk & Scale Engine -->
  <q-page id="admin-dispatch-page" data-audit-id="admin-dispatch-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 76px;">
    <!-- Live Statistics Strip -->
    <div class="bg-white text-grey-9 q-pa-sm rounded-borders q-mb-md shadow-1">
      <div class="row items-center justify-around text-center text-caption">
        <!-- Delivered Progress -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-7">ส่งมอบแล้ว</div>
          <div class="text-subtitle2 text-weight-bolder text-positive">
            {{ completedOrdersCount }} / {{ ordersCount }} รายการ
          </div>
        </div>

        <!-- Cash in hand -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-7">เงินสดในมือ</div>
          <div class="text-subtitle2 text-weight-bolder text-warning">
            {{ cashInHandTotal.toLocaleString() }} บาท
          </div>
        </div>

        <!-- Bank transfer -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-7">ยอดโอนพร้อมเพย์</div>
          <div class="text-subtitle2 text-weight-bolder text-primary">
            {{ prepaidTotal.toLocaleString() }} บาท
          </div>
        </div>
      </div>
    </div>

    <!-- Active Round Indicator -->
    <div v-if="fruitStore.activeRound" class="bg-green-1 text-grey-9 q-pa-sm rounded-borders q-mb-md row items-center justify-between shadow-1">
      <div class="row items-center">
        <q-icon name="event_available" color="positive" size="20px" class="q-mr-xs" />
        <span class="text-caption text-grey-9">
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

    <!-- Quick Action: Scan Customer QR Code -->
    <div class="q-mb-md">
      <q-btn
        color="primary"
        class="full-width q-py-sm text-weight-bolder text-subtitle2 shadow-2"
        no-caps
        rounded
        icon="qr_code_scanner"
        to="/admin/scan"
        data-audit-id="btn-scan-customer-qr"
      >
        <span>📷 สแกน QR Code ลูกค้าเพื่อเปิดออเดอร์ & ส่งมอบ</span>
      </q-btn>
    </div>

    <!-- Time-Slot Filter Tabs & Instant Search -->
    <TimeSlotTabs
      :available-slots="availableSlots"
      v-model:selected-slot="selectedSlot"
      v-model:search-query="searchQuery"
      :slot-counts="slotCounts"
    />

    <!-- Orders Dispatch List -->
    <div v-if="filteredOrders.length === 0" class="bg-white q-pa-xl rounded-borders text-center text-grey-7 shadow-1">
      <q-icon name="inbox" size="48px" class="q-mb-sm text-grey-4" />
      <div class="text-subtitle1 text-weight-bold text-grey-8">ไม่พบรายการออเดอร์</div>
      <div class="text-caption text-grey-6">ในรอบเวลาหรือคำค้นหานี้</div>
    </div>

    <div v-else>
      <TailgateOrderCard
        v-for="order in filteredOrders"
        :key="order.orderId"
        :order="order"
      />
    </div>
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

const fruitStore = useFruitStore();

// Filter states
const selectedSlot = ref<string>('ALL');
const searchQuery = ref<string>('');

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

</script>
