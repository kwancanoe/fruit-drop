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
              สั่งจองผลไม้สด
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

    <!-- Customer Order Lookup Modal Component -->
    <OrderLookupModal
      v-model:is-open="isLookupOpen"
      @found="onOrderFound"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import OrderLookupModal from '@/components/customer/OrderLookupModal.vue';

const router = useRouter();
const fruitStore = useFruitStore();

const isLookupOpen = ref<boolean>(false);

function openLookupModal() {
  isLookupOpen.value = true;
}

// Navigate directly to full customer order ticket page
function onOrderFound(order: Order) {
  void router.push(`/orders/${order.orderId}`);
}

onMounted(() => {
  fruitStore.initAuth();
  fruitStore.subscribeToActiveRound();
});

onBeforeUnmount(() => {
  fruitStore.unsubscribeOpenRounds();
});
</script>
