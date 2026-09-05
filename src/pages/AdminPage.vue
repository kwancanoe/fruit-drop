<template>
  <!-- Section: Admin Tailgate Dispatch Desk & Scale Engine -->
  <q-page id="admin-dispatch-page" data-audit-id="admin-dispatch-page" class="q-pa-md bg-grey-10 text-white" style="min-height: 100vh; max-width: 680px; margin: 0 auto;">
    <!-- 1. Login Gate (Unauthenticated State) -->
    <div v-if="!fruitStore.authUser" class="row justify-center items-center" style="min-height: 80vh;">
      <q-card class="bg-grey-9 text-white q-pa-lg rounded-borders text-center shadow-4" style="max-width: 420px; width: 100%;">
        <q-avatar size="96px" class="q-mb-md">
          <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
        </q-avatar>
        <div class="text-h6 text-weight-bolder q-mb-xs">
          โต๊ะจ่ายของท้ายรถ Fruit Drop
        </div>
        <div class="text-caption text-grey-4 q-mb-lg">
          เข้าสู่ระบบสำหรับแอดมินและผู้ช่วยขาย
        </div>

        <q-btn
          color="positive"
          class="full-width q-py-sm text-weight-bold text-subtitle2 shadow-2"
          icon="login"
          label="เข้าสู่ระบบด้วย Google"
          no-caps
          rounded
          :loading="fruitStore.isLoading"
          @click="handleLogin"
        />
      </q-card>
    </div>

    <!-- 2. Unauthorized State (Logged in with unauthorized account) -->
    <div v-else-if="!fruitStore.isAdmin" class="row justify-center items-center" style="min-height: 80vh;">
      <q-card class="bg-grey-9 text-white q-pa-lg rounded-borders text-center shadow-4" style="max-width: 440px; width: 100%;">
        <q-icon name="gpp_bad" color="negative" size="64px" class="q-mb-sm" />
        <div class="text-h6 text-weight-bolder text-negative q-mb-xs">
          ไม่มีสิทธิ์เข้าใช้งานระบบ
        </div>
        <div class="text-body2 text-grey-3 q-mb-xs">
          บัญชี: <strong>{{ fruitStore.authUser.email }}</strong>
        </div>
        <div class="text-caption text-grey-4 q-mb-lg">
          อีเมลนี้ไม่ได้รับสิทธิ์เข้าใช้งานโต๊ะแอดมิน กรุณาติดต่อผู้ดูแลระบบเพื่อขอเพิ่มสิทธิ์
        </div>

        <q-btn
          outline
          color="white"
          class="full-width q-py-xs text-weight-bold"
          icon="logout"
          label="ออกจากระบบ (Logout)"
          no-caps
          rounded
          @click="handleLogout"
        />
      </q-card>
    </div>

    <!-- 3. Authorized Admin Dispatch Desk -->
    <div v-else>
      <!-- Night Toolbar & Stats -->
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
        @open-user-management="isUserManagementOpen = true"
        @open-round-management="isRoundManagementOpen = true"
      />

      <!-- Active Round Indicator -->
      <div v-if="fruitStore.activeRound" class="bg-grey-9 q-pa-sm rounded-borders q-mb-md row items-center justify-between">
        <div class="row items-center">
          <q-icon name="event_note" color="positive" size="20px" class="q-mr-xs" />
          <span class="text-caption text-grey-3">
            รอบปัจจุบัน: <strong>{{ fruitStore.activeRound.title }}</strong> ({{ fruitStore.activeRound.pickupDate }})
          </span>
        </div>
        <q-btn
          flat
          dense
          no-caps
          color="positive"
          label="เปลี่ยนรอบ"
          size="sm"
          @click="isRoundManagementOpen = true"
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
          @open-proof-modal="handleOpenProofModal"
          @mark-delivered="handleMarkDelivered"
          @collect-cash-deliver="handleCollectCashDeliver"
          @revert-status="handleRevertStatus"
        />
      </div>
    </div>

    <!-- Modals -->
    <!-- Durian Scale Modal -->
    <DurianScaleModal
      v-model:is-open="isScaleModalOpen"
      :order="scaleTargetOrder"
      :item-index="scaleTargetItemIndex"
      :prompt-pay-number="fruitStore.activeRound?.promptPayNumber || '081-234-5678'"
      :prompt-pay-name="fruitStore.activeRound?.promptPayName || 'คุณอ้น (ธ.กสิกรไทย)'"
      @confirm="handleScaleConfirm"
    />

    <!-- Harvest Summary Modal -->
    <HarvestSummaryModal
      v-model:is-open="isHarvestSummaryOpen"
      :round="fruitStore.activeRound"
      :orders="fruitStore.orders"
    />

    <!-- User Management Modal -->
    <UserManagementModal
      v-model:is-open="isUserManagementOpen"
    />

    <!-- Round Management Modal -->
    <RoundManagementModal
      v-model:is-open="isRoundManagementOpen"
    />

    <!-- Payment Proof Modal -->
    <PaymentProofModal
      v-model:is-open="isProofModalOpen"
      :order="proofTargetOrder"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import { useUserStore } from '@/stores/userStore';
import type { Order } from '@/types/fruit_app';
import AdminHeaderBar from '@/components/admin/AdminHeaderBar.vue';
import TimeSlotTabs from '@/components/admin/TimeSlotTabs.vue';
import TailgateOrderCard from '@/components/admin/TailgateOrderCard.vue';
import DurianScaleModal from '@/components/admin/DurianScaleModal.vue';
import HarvestSummaryModal from '@/components/admin/HarvestSummaryModal.vue';
import UserManagementModal from '@/components/admin/UserManagementModal.vue';
import RoundManagementModal from '@/components/admin/RoundManagementModal.vue';
import PaymentProofModal from '@/components/admin/PaymentProofModal.vue';

const $q = useQuasar();
const fruitStore = useFruitStore();
const userStore = useUserStore();

// Filter states
const selectedSlot = ref<string>('ALL');
const searchQuery = ref<string>('');

// Modal states
const isScaleModalOpen = ref<boolean>(false);
const scaleTargetOrder = ref<Order | null>(null);
const scaleTargetItemIndex = ref<number>(-1);
const isHarvestSummaryOpen = ref<boolean>(false);
const isUserManagementOpen = ref<boolean>(false);
const isRoundManagementOpen = ref<boolean>(false);
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
  fruitStore.subscribeToAllRounds();
  fruitStore.subscribeToOrders(fruitStore.activeRoundId);
  userStore.subscribeUsers();
});
</script>
