<template>
  <!-- Section: Customer Single-Page Ordering Screen -->
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

    <!-- 1. Batch Header & Announcement -->
    <BatchHeaderCard :round="fruitStore.activeRound" />

    <!-- 2. Dual-Archetype Fruit Selection -->
    <FruitSelector
      :products="fruitStore.products"
      v-model="orderedItems"
    />

    <!-- 3. Customer Contact & Location in Mall -->
    <ContactPicker v-model="customerInfo" />

    <!-- 4. Pickup Time-Slot Chips -->
    <PickupSlotPicker
      :slots="availablePickupSlots"
      v-model="selectedSlot"
    />

    <!-- 5. Payment Method & PromptPay QR -->
    <PaymentMethodPicker
      v-model="paymentMethod"
      :total-amount="totalEstimatedPrice"
      :prompt-pay-number="fruitStore.activeRound?.promptPayNumber || '081-234-5678'"
      :prompt-pay-name="fruitStore.activeRound?.promptPayName || 'คุณอ้น (ธ.กสิกรไทย)'"
    />

    <!-- Sticky Bottom Bar with Large Order Command Button -->
    <div class="fixed-bottom bg-white shadow-up-3 q-pa-sm row items-center justify-between" style="z-index: 2000;">
      <div class="col-6 q-pl-md">
        <div class="text-caption text-grey-7">ยอดประเมินรวม:</div>
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
          :disable="orderedItems.length === 0 || !isContactValid"
          @click="handlePlaceOrder"
        >
          <q-icon name="check_circle" class="q-mr-xs" />
          <span>สั่งจอง ({{ totalItemCount }} รายการ)</span>
        </q-btn>
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
import type { OrderItem, CustomerInfo, PaymentMethod, Order } from '@/types/fruit_app';
import BatchHeaderCard from '@/components/customer/BatchHeaderCard.vue';
import FruitSelector from '@/components/customer/FruitSelector.vue';
import ContactPicker from '@/components/customer/ContactPicker.vue';
import PickupSlotPicker from '@/components/customer/PickupSlotPicker.vue';
import PaymentMethodPicker from '@/components/customer/PaymentMethodPicker.vue';
import OrderQueueCard from '@/components/customer/OrderQueueCard.vue';

const $q = useQuasar();
const fruitStore = useFruitStore();
const { customerProfile, lastOrderId, loadProfile, saveProfile, saveLastOrderId, loadLastOrderId } = useCustomerStorage();

// Form states
const orderedItems = ref<OrderItem[]>([]);
const customerInfo = ref<CustomerInfo>({
  name: '',
  phone: '',
  floor: 'ชั้น 1',
  shop: ''
});
const selectedSlot = ref<string>('19:00 - 19:30');
const paymentMethod = ref<PaymentMethod>('PAY_AT_CAR');

// Modal states
const showSuccessModal = ref<boolean>(false);
const showActiveQueueModal = ref<boolean>(false);
const completedOrder = ref<Order | null>(null);

// Available pickup slots
const availablePickupSlots = computed<string[]>(() => {
  return fruitStore.activeRound?.pickupSlots || [
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

  try {
    saveProfile(customerInfo.value);

    const generatedOrderId = await fruitStore.submitOrder({
      roundId: fruitStore.activeRoundId,
      customer: { ...customerInfo.value },
      items: [...orderedItems.value],
      pickupSlot: selectedSlot.value,
      paymentMethod: paymentMethod.value,
      paymentStatus: paymentMethod.value === 'PROMPTPAY_PREPAID' ? 'VERIFYING_SLIP' : 'UNPAID',
      totalEstimatedPrice: totalEstimatedPrice.value
    });

    saveLastOrderId(generatedOrderId);

    // Prepare completed order preview
    completedOrder.value = {
      orderId: generatedOrderId,
      roundId: fruitStore.activeRoundId,
      customer: { ...customerInfo.value },
      items: [...orderedItems.value],
      pickupSlot: selectedSlot.value,
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
  const loaded = loadProfile();
  customerInfo.value = { ...loaded };
  loadLastOrderId();
});
</script>
