<template>
  <!-- Section: Admin Tailgate Dispatch Desk & Scale Engine -->
  <q-page id="admin-dispatch-page" data-audit-id="admin-dispatch-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 84px;">
    <!-- Live Statistics Strip -->
    <q-card id="dispatch-summary-kpi-card" data-audit-id="dispatch-summary-kpi-card" class="bg-white text-grey-9 q-pa-sm q-mb-md shadow-1">
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
          <div class="text-grey-7">เงินสด</div>
          <div class="text-subtitle2 text-weight-bolder text-warning">
            {{ cashInHandTotal.toLocaleString() }} บาท
          </div>
        </div>

        <!-- Bank transfer -->
        <div class="col-4 q-px-xs">
          <div class="text-grey-7">ยอดโอน</div>
          <div class="text-subtitle2 text-weight-bolder text-primary">
            {{ prepaidTotal.toLocaleString() }} บาท
          </div>
        </div>
      </div>
    </q-card>

    <!-- Section: Round Selector & Tailgate Session -->
    <q-card id="dispatch-round-selector-card" data-audit-id="dispatch-round-selector-card" class="bg-white text-grey-9 q-pa-sm q-mb-md shadow-1">
      <q-select
        v-if="roundOptions.length > 0"
        id="select-active-round"
        data-audit-id="select-active-round"
        dense
        outlined
        emit-value
        map-options
        options-dense
        v-model="selectedRoundId"
        :options="roundOptions"
        label="รอบส่งที่กำลังจ่ายของ"
        color="positive"
        class="text-weight-bold"
        @update:model-value="handleRoundChange"
      >
        <template #prepend>
          <q-icon name="event_available" color="positive" size="20px" />
        </template>
        <template #option="scope">
          <q-item v-bind="scope.itemProps" dense class="q-py-xs">
            <q-item-section>
              <q-item-label class="text-weight-bold text-subtitle2">{{ scope.opt.title }}</q-item-label>
              <q-item-label caption class="text-grey-7">{{ scope.opt.date }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>

      <div v-else class="text-caption text-grey-7 q-pa-xs">
        ไม่มีรอบที่เปิดรับจองในขณะนี้
      </div>
    </q-card>


    <!-- Time-Slot Filter Tabs & Instant Search -->
    <TimeSlotTabs
      :available-slots="availableSlots"
      v-model:selected-slot="selectedSlot"
      v-model:search-query="searchQuery"
      :slot-counts="slotCounts"
    />

    <!-- Orders Dispatch List -->
    <q-card v-if="filteredOrders.length === 0" class="bg-white q-pa-xl text-center text-grey-7 shadow-1">
      <q-icon name="inbox" size="48px" class="q-mb-sm text-grey-4" />
      <div class="text-subtitle1 text-weight-bold text-grey-8">ไม่พบรายการออเดอร์</div>
      <div class="text-caption text-grey-6">ในรอบเวลาหรือคำค้นหานี้</div>
    </q-card>

    <div v-else>
      <TailgateOrderCard
        v-for="order in filteredOrders"
        :key="order.orderId"
        :order="order"
      />
    </div>

    <!-- Floating Action Button (FAB) for Instant QR Scan at any scroll position -->
    <q-page-sticky position="bottom-right" :offset="[16, 76]" style="z-index: 2000;">
      <q-btn
        fab
        color="positive"
        icon="qr_code_scanner"
        label="สแกน QR"
        class="shadow-4 text-weight-bolder text-subtitle2"
        to="/admin/scan"
        data-audit-id="fab-scan-customer-qr"
      >
        <q-tooltip anchor="top middle" self="bottom middle">สแกน QR Code ลูกค้าเพื่อเปิดออเดอร์ & ส่งมอบ</q-tooltip>
      </q-btn>
    </q-page-sticky>
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
import { generateTimeSlots, normalizeSlotLabel, isRangeSlot, parseTimeToMinutes } from '@/utils/timeSlots';
import { calculateCashInHandTotal, calculatePrepaidTransferTotal } from '@/utils/pricing';
import { formatThaiPickupDate, isRoundPastCutoff } from '@/utils/roundDate';

const $q = useQuasar();
const fruitStore = useFruitStore();

// Round selection states
const selectedRoundId = computed<string>({
  get: () => {
    const active = fruitStore.activeRound;
    if (active && roundOptions.value.some(opt => opt.value === active.roundId)) {
      return active.roundId;
    }
    return roundOptions.value[0]?.value || '';
  },
  set: (val: string) => {
    const found = fruitStore.allRounds.find(r => r.roundId === val);
    if (found) {
      fruitStore.selectActiveRound(found);
    }
  }
});

const roundOptions = computed(() => {
  return fruitStore.allRounds.map(r => {
    const formattedDate = formatThaiPickupDate(r.pickupDate);
    const expired = isRoundPastCutoff(r);
    const statusText = expired ? ' [หมดรอบ]' : (r.isOpen ? '' : ' [ปิดรับแล้ว]');
    return {
      label: `${r.title} (${formattedDate})${statusText}`,
      value: r.roundId,
      title: r.title,
      date: formattedDate,
      isOpen: r.isOpen && !expired
    };
  });
});

// Handle changing active dispatch round
function handleRoundChange(roundId: string) {
  const target = fruitStore.allRounds.find(r => r.roundId === roundId);
  if (target) {
    fruitStore.selectActiveRound(target);
    selectedSlot.value = 'ALL';
    searchQuery.value = '';
    $q.notify({
      type: 'info',
      message: `เลือก '${target.title}' แล้ว`,
      position: 'top',
      timeout: 1200
    });
  }
}

// Filter states
const selectedSlot = ref<string>('ALL');
const searchQuery = ref<string>('');

// Slots: Single-time tabs generated from seller standby window + custom order times
const availableSlots = computed<string[]>(() => {
  const round = fruitStore.activeRound;
  const start = round?.standbyStartTime || '19:00';
  const end = round?.standbyEndTime || '23:00';

  // 1. Generate base 30-min intervals from seller standby window
  const slots = generateTimeSlots(start, end, 30);
  const slotsSet = new Set<string>(slots);

  // 2. Add round pickupSlots if they are single times
  if (round?.pickupSlots && Array.isArray(round.pickupSlots)) {
    for (const s of round.pickupSlots) {
      if (s && !isRangeSlot(s)) {
        slotsSet.add(normalizeSlotLabel(s));
      }
    }
  }

  // 3. Add any order's single pickupSlot (e.g. custom time entered by customer)
  for (const o of fruitStore.orders) {
    if (o.pickupSlot && !isRangeSlot(o.pickupSlot)) {
      slotsSet.add(normalizeSlotLabel(o.pickupSlot));
    }
  }

  // Sort chronologically relative to standby start time (handles overnight)
  const startMin = parseTimeToMinutes(start);
  return Array.from(slotsSet).sort((a, b) => {
    const ma = parseTimeToMinutes(a);
    const mb = parseTimeToMinutes(b);
    if (startMin >= 9999) return ma - mb;
    const diffA = (ma - startMin + 1440) % 1440;
    const diffB = (mb - startMin + 1440) % 1440;
    return diffA - diffB;
  });
});

// Slot counts for single-time tabs
const slotCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = { ALL: 0 };
  for (const slot of availableSlots.value) {
    counts[slot] = 0;
  }

  for (const o of fruitStore.orders) {
    if (o.orderStatus === 'WAITING_PICKUP') {
      counts.ALL = (counts.ALL || 0) + 1;
      const normalizedSlot = normalizeSlotLabel(o.pickupSlot);
      if (counts[normalizedSlot] !== undefined) {
        counts[normalizedSlot] = (counts[normalizedSlot] || 0) + 1;
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

// Cash collected in hand (strictly orders completed with physical cash)
const cashInHandTotal = computed<number>(() => {
  return calculateCashInHandTotal(fruitStore.orders);
});

// Bank transfer total (prepaid or transferred at car, excluding cancelled)
const prepaidTotal = computed<number>(() => {
  return calculatePrepaidTransferTotal(fruitStore.orders);
});

// Filtered Orders
const filteredOrders = computed<Order[]>(() => {
  let list = fruitStore.orders;

  // Filter by single-time slot
  if (selectedSlot.value !== 'ALL') {
    list = list.filter(o => normalizeSlotLabel(o.pickupSlot) === selectedSlot.value);
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
