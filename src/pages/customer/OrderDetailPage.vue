<template>
  <!-- Section: Customer Order Detail Full-Page View -->
  <q-page
    id="customer-order-detail-page"
    data-audit-id="customer-order-detail-page"
    class="q-pa-md"
    style="max-width: 620px; margin: 0 auto; padding-bottom: 90px;"
  >
    <!-- Top Navigation Bar -->
    <div class="row items-center justify-between q-mb-md">
      <q-btn
        id="btn-customer-back-home"
        data-audit-id="btn-customer-back-home"
        flat
        dense
        no-caps
        icon="arrow_back"
        label="ย้อนกลับ"
        color="grey-8"
        class="text-weight-bold"
        @click="handleBack"
      />
      <div v-if="order" class="text-caption text-grey-7">
        รอบเวลานัดรับ: <strong>{{ order.pickupSlot }}</strong>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="48px" />
      <div class="text-caption text-grey-7 q-mt-sm">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>
    </div>

    <!-- Load Error State (Network / Server Error with Retry) -->
    <q-card
      v-else-if="loadError"
      id="card-order-load-error"
      data-audit-id="card-order-load-error"
      class="bg-white q-pa-xl text-center shadow-1"
    >
      <q-icon name="wifi_off" size="56px" color="warning" class="q-mb-sm" />
      <div class="text-h6 text-weight-bold text-grey-9">ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้</div>
      <div class="text-caption text-grey-6 q-mb-md">{{ loadError }}</div>
      <div class="row justify-center items-center" style="gap: 12px;">
        <q-btn
          id="btn-retry-load-order"
          data-audit-id="btn-retry-load-order"
          color="primary"
          icon="refresh"
          label="ลองใหม่อีกครั้ง"
          no-caps
          rounded
          class="text-weight-bold q-px-md"
          @click="loadOrder"
        />
        <q-btn
          id="btn-error-back-home"
          data-audit-id="btn-error-back-home"
          flat
          color="grey-8"
          label="กลับไปหน้าร้าน"
          no-caps
          rounded
          to="/"
        />
      </div>
    </q-card>

    <!-- Not Found State -->
    <q-card v-else-if="!order" class="bg-white q-pa-xl text-center shadow-1">
      <q-icon name="error_outline" size="56px" color="negative" class="q-mb-sm" />
      <div class="text-h6 text-weight-bold text-grey-9">ไม่พบออเดอร์ #{{ orderId }}</div>
      <div class="text-caption text-grey-6 q-mb-md">ตรวจสอบรหัสออเดอร์ หรือค้นหาด้วยเบอร์โทรศัพท์อีกครั้ง</div>
      <q-btn color="primary" label="กลับไปหน้าร้าน" no-caps to="/" />
    </q-card>

    <!-- Order Ticket Full Page Card -->
    <div v-else>
      <OrderQueueCard :order="order" />

      <!-- Action Button: Order More -->
      <div class="q-mt-md row justify-center">
        <q-btn
          id="btn-order-more"
          data-audit-id="btn-order-more"
          color="primary"
          outline
          label="สั่งจองผลไม้เพิ่ม"
          no-caps
          rounded
          class="q-px-lg text-weight-bold"
          to="/"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import OrderQueueCard from '@/components/customer/OrderQueueCard.vue';

const route = useRoute();
const router = useRouter();
const fruitStore = useFruitStore();

const orderId = computed(() => String(route.params.orderId || ''));
const order = ref<Order | null>(null);
const isLoading = ref<boolean>(true);
const loadError = ref<string | null>(null);

// Load Order from memory store or Firestore
async function loadOrder() {
  if (!orderId.value) {
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  loadError.value = null;
  try {
    const fetched = await fruitStore.getOrderByOrderId(orderId.value);
    order.value = fetched;
  } catch (err: unknown) {
    console.error('Error loading order detail:', err);
    loadError.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง';
  } finally {
    isLoading.value = false;
  }
}

// Navigate back to previous page or storefront home
function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/');
  }
}

onMounted(() => {
  void loadOrder();
});

watch(orderId, () => {
  void loadOrder();
});
</script>
