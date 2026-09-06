<template>
  <!-- Section: Customer Order Page (2-Stage Flow: Active Rounds Overview ➔ Round Booking Screen) -->
  <q-page id="customer-order-page" data-audit-id="customer-order-page" class="q-pa-md" style="max-width: 620px; margin: 0 auto; padding-bottom: 90px;">
    <!-- Active Order Alert Card (if customer previously placed an order) -->
    <div v-if="activeCustomerOrder" class="q-mb-md">
      <q-card
        id="card-active-customer-order"
        data-audit-id="card-active-customer-order"
        class="bg-positive text-white shadow-2 q-pa-sm"
      >
        <div class="row items-center justify-between">
          <div class="row items-center q-pa-xs">
            <q-icon name="local_mall" color="white" size="24px" class="q-mr-sm" />
            <div class="text-caption text-weight-medium">
              มีออเดอร์รอรับ: <strong>#{{ activeCustomerOrder.orderId }}</strong>
              <span class="text-green-1 q-ml-xs">(รอบ {{ activeCustomerOrder.pickupSlot }})</span>
            </div>
          </div>
          <div class="row justify-end q-pa-xs">
            <q-btn
              id="btn-view-order-detail"
              data-audit-id="btn-view-order-detail"
              flat
              dense
              no-caps
              label="รายละเอียดคำสั่งซื้อ"
              color="white"
              class="text-weight-bold"
              :to="`/orders/${activeCustomerOrder.orderId}`"
            />
          </div>
        </div>
      </q-card>
    </div>

    <!-- Stage 1: Active Open Rounds Overview Screen (when no round selected) -->
    <div v-if="!selectedRoundId || !currentRound">
      <ActiveRoundsList
        :rounds="fruitStore.openRounds"
        @select-round="handleSelectRound"
      />
    </div>

    <!-- Stage 2: Round Booking Screen (when a specific round is selected) -->
    <div v-else>
      <!-- Navigation Back Button & Current Round Indicator -->
      <q-card id="round-booking-header-card" data-audit-id="round-booking-header-card" class="row items-center justify-between q-mb-md bg-white q-pa-sm shadow-1">
        <q-btn
          flat
          dense
          no-caps
          icon="arrow_back"
          label="เลือกรอบอื่น"
          color="primary"
          class="text-weight-bold"
          @click="selectedRoundId = null"
        />
        <div class="text-caption text-grey-8 ellipsis" style="max-width: 200px;">
          <strong>{{ currentRound.title }}</strong>
        </div>
      </q-card>

      <!-- 1. Batch Header & Announcement -->
      <BatchHeaderCard :round="currentRound" />

      <!-- 2. Dual-Archetype Fruit Selection -->
      <FruitSelector
        :products="fruitStore.products"
        v-model="orderedItems"
      />

      <!-- 3. Customer Contact & Location -->
      <ContactPicker v-model="customerInfo" />

      <!-- 4. Pickup Time-Slot Chips -->
      <PickupSlotPicker
        :round="currentRound"
        :slots="availablePickupSlots"
        v-model="selectedSlot"
        @update:is-valid="val => isSlotValid = val"
      />

      <!-- Section 5: Pay at Tailgate Reassurance Banner (Enforced Pay at Pickup) -->
      <q-card id="customer-pay-at-car-card" data-audit-id="customer-pay-at-car-card" class="rounded-borders bg-white shadow-1 q-mb-md">
        <q-card-section class="q-pa-md">
          <div class="row items-center no-wrap">
            <q-avatar color="green-1" text-color="positive" icon="payments" size="42px" class="q-mr-md" />
            <div>
              <div class="text-subtitle2 text-weight-bolder text-grey-9">
                💵 ชำระเงินตอนรับของที่ท้ายรถ (เงินสด / สแกน QR)
              </div>
              <div class="text-caption text-grey-7">
                ไม่ต้องโอนล่วงหน้า รับของแล้วค่อยจ่ายเงินสดหรือสแกน QR กับคนขาย
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- 6. Prominent Order Action Section (Impossible to miss at end of form) -->
      <q-card id="order-action-card" data-audit-id="order-action-card" class="q-mt-lg q-mb-xl bg-white q-pa-md shadow-2">
        <div class="row items-center justify-between q-mb-xs">
          <span class="text-subtitle1 text-weight-bold text-grey-9">ยอดรวมโดยประมาณ:</span>
          <span class="text-h5 text-weight-bolder text-primary">{{ totalEstimatedPrice }} บาท</span>
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          เลือกไว้ {{ totalItemCount }} รายการ • นัดรับ: {{ currentRound.pickupDate }} ({{ selectedSlot }})
        </div>

        <q-btn
          color="positive"
          class="full-width q-py-md text-weight-bolder text-subtitle1 shadow-3"
          no-caps
          rounded
          :loading="fruitStore.isLoading"
          :disable="orderedItems.length === 0 || !isContactValid || !isSlotValid"
          @click="handlePlaceOrder"
        >
          <q-icon name="check_circle" class="q-mr-xs" size="24px" />
          <span>ยืนยันการสั่งจอง ({{ totalEstimatedPrice }} บาท)</span>
        </q-btn>

        <div v-if="orderedItems.length === 0" class="text-center text-caption text-negative q-mt-xs">
          * เลือกผลไม้อย่างน้อย 1 รายการ
        </div>
        <div v-else-if="!isContactValid" class="text-center text-caption text-negative q-mt-xs">
          * ระบุชื่อและเบอร์โทรศัพท์ให้ครบถ้วน
        </div>
        <div v-else-if="!isSlotValid" class="text-center text-caption text-negative q-mt-xs">
          * อยู่นอกเวลาส่งของคนขาย โปรดเลือกเวลาใหม่
        </div>

        <div class="q-mt-md text-center">
          <q-btn
            flat
            dense
            no-caps
            color="grey-7"
            icon="arrow_back"
            label="ย้อนกลับไปหน้ารวมรอบ"
            @click="selectedRoundId = null"
          />
        </div>
      </q-card>

      <!-- 7. Sticky Bottom Bar for quick action while scrolling -->
      <div
        v-if="orderedItems.length > 0 && isContactValid && isSlotValid"
        class="fixed-bottom bg-white shadow-up-3 q-pa-sm row items-center justify-between"
        style="z-index: 1000;"
      >
        <div class="col-6 q-pl-md">
          <div class="text-caption text-grey-7">ยอดรวม:</div>
          <div class="text-h6 text-weight-bolder text-primary">
            {{ totalEstimatedPrice }} บาท
          </div>
        </div>
        <div class="col-6 q-pr-sm text-right">
          <q-btn
            color="positive"
            class="full-width q-py-sm text-weight-bolder text-subtitle2 shadow-2"
            no-caps
            rounded
            :loading="fruitStore.isLoading"
            @click="handlePlaceOrder"
          >
            <q-icon name="check_circle" class="q-mr-xs" />
            <span>สั่งจอง ({{ totalItemCount }})</span>
          </q-btn>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import { useCustomerStorage } from '@/composables/useCustomerStorage';
import type { OrderItem, CustomerInfo, Order, PreorderRound } from '@/types/fruit_app';
import { calculateItemSubtotal } from '@/utils/pricing';
import ActiveRoundsList from '@/components/customer/ActiveRoundsList.vue';
import BatchHeaderCard from '@/components/customer/BatchHeaderCard.vue';
import FruitSelector from '@/components/customer/FruitSelector.vue';
import ContactPicker from '@/components/customer/ContactPicker.vue';
import PickupSlotPicker from '@/components/customer/PickupSlotPicker.vue';

const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();
const { customerProfile, lastOrderId, loadProfile, saveProfile, saveLastOrderId, loadLastOrderId } = useCustomerStorage();

// Flow state: Active Round selection
const selectedRoundId = ref<string | null>(null);
const currentRound = computed<PreorderRound | null>(() => {
  return fruitStore.openRounds.find(r => r.roundId === selectedRoundId.value) || null;
});

function handleSelectRound(round: PreorderRound) {
  selectedRoundId.value = round.roundId;
  fruitStore.selectActiveRound(round);
  orderedItems.value = [];
  const start = round.standbyStartTime || (round.pickupSlots?.[0]?.match(/(\d{1,2}:\d{2})/)?.[1]) || '19:00';
  selectedSlot.value = `${start} น.`;
}

// Form states
const orderedItems = ref<OrderItem[]>([]);
const customerInfo = ref<CustomerInfo>({
  name: '',
  phone: '',
  floor: 'ชั้น 1',
  shop: ''
});
const selectedSlot = ref<string>('19:30 น.');
const isSlotValid = ref<boolean>(true);

// Available pickup slots
const availablePickupSlots = computed<string[]>(() => {
  return currentRound.value?.pickupSlots || [
    '19:00 - 19:30',
    '19:30 - 20:00',
    '20:00 - 20:30',
    '21:00+ (หลังห้างปิด)'
  ];
});

// Calculate total estimated price
const totalEstimatedPrice = computed<number>(() => {
  let total = 0;
  for (const item of orderedItems.value) {
    if (item.productType === 'FIXED_WEIGHT') {
      total += calculateItemSubtotal(item, fruitStore.products);
    } else if (item.productType === 'VARIABLE_WHOLE_FRUIT') {
      const prod = fruitStore.products.find(p => p.id === item.productId);
      const tier = prod?.sizeTiers?.find(t => t.tierId === item.selectedTierId);
      if (tier) {
        // Use average of min and max estimate
        total += Math.round((tier.estimatedPriceMin + tier.estimatedPriceMax) / 2);
      } else {
        total += 350; // Fallback estimate for 1 whole durian
      }
    }
  }
  return total;
});

// Total items count
const totalItemCount = computed<number>(() => {
  return orderedItems.value.length;
});

// Form validation check
const isContactValid = computed<boolean>(() => {
  return (
    customerInfo.value.name.trim().length > 0 &&
    customerInfo.value.shop.trim().length > 0 &&
    customerInfo.value.phone.trim().length >= 9
  );
});

// Check if customer has an existing active order in the system
const activeCustomerOrder = computed<Order | null>(() => {
  const storedId = lastOrderId.value;
  if (!storedId) return null;
  return fruitStore.orders.find(o => o.orderId === storedId && o.orderStatus !== 'COMPLETED') || null;
});

// Submit Order Handler
async function handlePlaceOrder() {
  if (orderedItems.value.length === 0) {
    $q.notify({ type: 'warning', message: 'เลือกผลไม้อย่างน้อย 1 รายการ' });
    return;
  }

  if (!isContactValid.value) {
    $q.notify({ type: 'warning', message: 'ระบุข้อมูลชื่อผู้สั่ง ร้าน และเบอร์โทรศัพท์' });
    return;
  }

  if (!isSlotValid.value) {
    $q.notify({
      type: 'negative',
      message: 'อยู่นอกเวลาส่งของคนขาย โปรดเลือกเวลาใหม่',
      position: 'top'
    });
    return;
  }

  try {
    saveProfile(customerInfo.value);

    const targetRoundId = currentRound.value?.roundId || fruitStore.activeRoundId;
    const generatedOrderId = await fruitStore.submitOrder({
      roundId: targetRoundId,
      customer: { ...customerInfo.value },
      items: [...orderedItems.value],
      pickupSlot: selectedSlot.value,
      pickupTime: selectedSlot.value,
      paymentMethod: 'PAY_AT_CAR',
      paymentStatus: 'UNPAID',
      totalEstimatedPrice: totalEstimatedPrice.value
    });

    saveLastOrderId(generatedOrderId);
    orderedItems.value = [];

    $q.notify({
      type: 'positive',
      message: `สั่งจองผลไม้สำเร็จ! รหัส #${generatedOrderId}`,
      position: 'top',
      timeout: 2500
    });

    void router.push(`/orders/${generatedOrderId}`);
  } catch (error) {
    console.error('Error submitting order:', error);
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาดในการสั่งจอง โปรดลองใหม่อีกครั้ง'
    });
  }
}

onMounted(() => {
  fruitStore.subscribeToOpenRounds();
  const loaded = loadProfile();
  customerInfo.value = { ...loaded };
  loadLastOrderId();
});
</script>
