<template>
  <!-- Section: Main Application White-Label Layout -->
  <q-layout view="lHh Lpr lFf" class="bg-grey-2">
    <!-- White-Label Brand Header -->
    <q-header elevated class="bg-white text-grey-9">
      <q-toolbar class="q-px-md">
        <!-- Logo & Title -->
        <router-link to="/" class="row items-center text-decoration-none no-decoration cursor-pointer" style="text-decoration: none; color: inherit;">
          <q-avatar size="40px" class="q-mr-sm">
            <q-img src="/mascots/logo_fruit_drop.png" fit="contain" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bolder text-primary leading-tight">
              FRUIT DROP
            </div>
            <div class="text-caption text-grey-7" style="font-size: 11px;">
              สวนบ้านเรา | สั่งผลไม้สดจากสวน
            </div>
          </div>
        </router-link>

        <q-space />

        <!-- Navigation Actions -->
        <div class="row items-center">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            icon="search"
            label="ค้นหาออเดอร์"
            class="q-mr-xs text-caption text-weight-bold"
            @click="openLookupModal"
          />

          <q-btn
            flat
            dense
            round
            icon="admin_panel_settings"
            color="grey-8"
            to="/admin"
          >
            <q-tooltip>โต๊ะแอดมินท้ายรถ</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Page Content Container -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- White-label Clean Footer -->
    <q-footer class="bg-grey-9 text-grey-4 text-center q-py-sm text-caption">
      <div>สวนบ้านเรา | Fruit Drop</div>
      <div class="text-grey-5" style="font-size: 10px;">
        ส่งมอบผลไม้สดคุณภาพ นัดรับท้ายรถลานจอดรถห้างสรรพสินค้า
      </div>
    </q-footer>

    <!-- Customer Order Lookup Modal Component -->
    <OrderLookupModal
      v-model:is-open="isLookupOpen"
      :orders="fruitStore.orders"
      @found="onOrderFound"
    />

    <!-- Queue Card Modal (if looked up) -->
    <q-dialog v-model="isQueueModalOpen">
      <div style="width: 95vw; max-width: 480px;">
        <OrderQueueCard v-if="selectedOrder" :order="selectedOrder" />
      </div>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import OrderLookupModal from '@/components/customer/OrderLookupModal.vue';
import OrderQueueCard from '@/components/customer/OrderQueueCard.vue';

const fruitStore = useFruitStore();

const isLookupOpen = ref<boolean>(false);
const isQueueModalOpen = ref<boolean>(false);
const selectedOrder = ref<Order | null>(null);

function openLookupModal() {
  isLookupOpen.value = true;
}

function onOrderFound(order: Order) {
  selectedOrder.value = order;
  isQueueModalOpen.value = true;
}

onMounted(() => {
  fruitStore.initAuth();
  fruitStore.subscribeToActiveRound();
  fruitStore.subscribeToOrders(fruitStore.activeRoundId);
});
</script>
