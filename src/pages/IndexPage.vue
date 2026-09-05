<template>
  <!-- Section: Customer Order Page (2-Stage Flow: Active Rounds Overview ➔ Round Booking Screen) -->
  <q-page id="customer-order-page" data-audit-id="customer-order-page" class="q-pa-md" style="max-width: 620px; margin: 0 auto; padding-bottom: 90px;">
    <!-- Active Order Alert Banner (if customer previously placed an order) -->
    <div v-if="activeCustomerOrder" class="q-mb-md">
      <q-banner rounded class="bg-positive text-white shadow-2 row items-center justify-between">
        <template #avatar>
          <q-icon name="local_mall" color="white" />
        </template>
        <div class="text-caption text-weight-medium">
          คุณมีออเดอร์ค้างรับ: <strong>#{{ activeCustomerOrder.orderId }}</strong>
          (รอบ {{ activeCustomerOrder.pickupSlot }})
        </div>
        <template #action>
          <q-btn
            flat
            dense
            no-caps
            label="ดูบัตรคิว"
            color="white"
            class="text-weight-bold"
            @click="showActiveQueueModal = true"
          />
        </template>
      </q-banner>
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
      <div class="row items-center justify-between q-mb-md bg-white q-pa-sm rounded-borders shadow-1">
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
      </div>

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

      <!-- 5. Payment Method & PromptPay QR -->
      <PaymentMethodPicker
        v-model="paymentMethod"
        :total-amount="totalEstimatedPrice"
        :prompt-pay-number="currentRound.promptPayNumber || '0878902935'"
        :prompt-pay-name="currentRound.promptPayName || 'นาตยา บุญณะ'"
        :bank-name="currentRound.bankName || 'KBANK (กสิกรไทย)'"
        :bank-account-number="currentRound.bankAccountNumber || '8172235408'"
        :bank-account-name="currentRound.bankAccountName || 'นาตยา บุญณะ'"
      />

      <!-- 6. Prominent Order Action Section (Impossible to miss at end of form) -->
      <div class="q-mt-lg q-mb-xl bg-white q-pa-md rounded-borders shadow-2">
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
          * กรุณาเลือกผลไม้อย่างน้อย 1 รายการ
        </div>
        <div v-else-if="!isContactValid" class="text-center text-caption text-negative q-mt-xs">
          * กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ครบถ้วน
        </div>
        <div v-else-if="!isSlotValid" class="text-center text-caption text-negative q-mt-xs">
          * เวลานัดรับอยู่นอกช่วงเวลา Standby ของคนขาย
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
      </div>

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

    <!-- Order Completed Queue Dialog -->
    <q-dialog v-model="showSuccessModal" persistent>
      <div style="width: 95vw; max-width: 480px;">
        <OrderQueueCard v-if="completedOrder" :order="completedOrder" />
        <div class="q-mt-sm row justify-center">
          <q-btn
            color="primary"
            label="ปิดหน้านี้ / สั่งรายการอื่นเพิ่มเติม"
            no-caps
            rounded
            class="q-px-md"
            @click="resetOrderForm"
          />
        </div>
      </div>
    </q-dialog>

    <!-- Active Order Queue Dialog -->
    <q-dialog v-model="showActiveQueueModal">
      <div style="width: 95vw; max-width: 480px;">
        <OrderQueueCard v-if="activeCustomerOrder" :order="activeCustomerOrder" />
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import { useCustomerStorage } from '@/composables/useCustomerStorage';
import type { OrderItem, CustomerInfo, PaymentMethod, Order, PreorderRound } from '@/types/fruit_app';
import ActiveRoundsList from '@/components/customer/ActiveRoundsList.vue';
import BatchHeaderCard from '@/components/customer/BatchHeaderCard.vue';
import FruitSelector from '@/components/customer/FruitSelector.vue';
import ContactPicker from '@/components/customer/ContactPicker.vue';
import PickupSlotPicker from '@/components/customer/PickupSlotPicker.vue';
import PaymentMethodPicker from '@/components/customer/PaymentMethodPicker.vue';
import OrderQueueCard from '@/components/customer/OrderQueueCard.vue';

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
const paymentMethod = ref<PaymentMethod>('PAY_AT_CAR');

// Modal states
const showSuccessModal = ref<boolean>(false);
const showActiveQueueModal = ref<boolean>(false);
const completedOrder = ref<Order | null>(null);

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
      const prod = fruitStore.products.find(p => p.id === item.productId);
      if (prod?.bundles) {
        const bundle = prod.bundles.find(b => b.qtyKg === item.orderedKg);
        if (bundle) {
          total += bundle.price;
          continue;
        }
      }
      total += (item.orderedKg || 1) * item.pricePerKg;
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
    $q.notify({ type: 'warning', message: 'กรุณาเลือกผลไม้อย่างน้อย 1 รายการ' });
    return;
  }

  if (!isContactValid.value) {
    $q.notify({ type: 'warning', message: 'กรุณากรอกข้อมูลชื่อผู้สั่ง ร้าน และเบอร์โทรศัพท์' });
    return;
  }

  if (!isSlotValid.value) {
    $q.notify({
      type: 'negative',
      message: 'เวลานัดรับอยู่นอกช่วงเวลา Standby ของคนขาย กรุณาเลือกเวลาใหม่',
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
      paymentMethod: paymentMethod.value,
      paymentStatus: paymentMethod.value === 'PROMPTPAY_PREPAID' ? 'VERIFYING_SLIP' : 'UNPAID',
      totalEstimatedPrice: totalEstimatedPrice.value
    });

    saveLastOrderId(generatedOrderId);

    // Prepare completed order preview
    completedOrder.value = {
      orderId: generatedOrderId,
      roundId: targetRoundId,
      customer: { ...customerInfo.value },
      items: [...orderedItems.value],
      pickupSlot: selectedSlot.value,
      pickupTime: selectedSlot.value,
      orderStatus: 'WAITING_PICKUP',
      paymentMethod: paymentMethod.value,
      paymentStatus: paymentMethod.value === 'PROMPTPAY_PREPAID' ? 'VERIFYING_SLIP' : 'UNPAID',
      totalEstimatedPrice: totalEstimatedPrice.value,
      totalFinalPrice: totalEstimatedPrice.value,
      createdAt: Date.now()
    };

    showSuccessModal.value = true;

    $q.notify({
      type: 'positive',
      message: `สั่งจองผลไม้สำเร็จ! รหัส #${generatedOrderId}`,
      position: 'top',
      timeout: 2500
    });
  } catch (error) {
    console.error('Error submitting order:', error);
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาดในการสั่งจอง กรุณาลองใหม่อีกครั้ง'
    });
  }
}

// Reset form for next order
function resetOrderForm() {
  showSuccessModal.value = false;
  orderedItems.value = [];
}

onMounted(() => {
  fruitStore.subscribeToOpenRounds();
  const loaded = loadProfile();
  customerInfo.value = { ...loaded };
  loadLastOrderId();
});
</script>
