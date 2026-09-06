<template>
  <!-- Section: Customer Order Lookup by Phone or Order ID -->
  <q-dialog
    :model-value="isOpen"
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="val => $emit('update:isOpen', val)"
  >
    <q-card id="order-lookup-modal" data-audit-id="order-lookup-modal" class="rounded-borders bg-white" style="width: 95vw; max-width: 440px;">
      <q-card-section class="bg-primary text-white row items-center justify-between q-pa-md">
        <div class="row items-center">
          <q-icon name="search" size="24px" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bolder">ค้นหาบัตรคิวออเดอร์ของฉัน</div>
        </div>
        <q-btn flat round dense icon="close" color="white" @click="$emit('update:isOpen', false)" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="text-caption text-grey-8 q-mb-md">
          กรอกเบอร์โทรศัพท์ที่ใช้สั่งซื้อ หรือรหัสออเดอร์ (เช่น FD-1082) เพื่อเปิดดูบัตรคิว
        </div>

        <q-input
          v-model="queryInput"
          outlined
          dense
          autofocus
          placeholder="กรอกเบอร์โทรศัพท์ หรือรหัสออเดอร์..."
          @keyup.enter="handleSearch"
        >
          <template #prepend>
            <q-icon name="phone" color="primary" />
          </template>
          <template #append>
            <q-btn flat dense color="primary" label="ค้นหา" @click="handleSearch" />
          </template>
        </q-input>

        <div v-if="searchResult === null && hasSearched" class="text-caption text-negative q-mt-sm text-center">
          ไม่พบรายการออเดอร์ที่ตรงกับข้อมูลนี้ ตรวจสอบเบอร์โทรศัพท์อีกครั้ง
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Order } from '@/types/fruit_app';

const props = defineProps<{
  isOpen: boolean;
  orders: Order[];
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'found', order: Order): void;
}>();

const queryInput = ref<string>('');
const hasSearched = ref<boolean>(false);
const searchResult = ref<Order | null>(null);

function handleSearch() {
  hasSearched.value = true;
  const q = queryInput.value.trim().toLowerCase().replace(/[-\s]/g, '');
  if (!q) {
    searchResult.value = null;
    return;
  }

  const found = props.orders.find(o => {
    const cleanPhone = o.customer.phone.replace(/[-\s]/g, '');
    const cleanOrderId = o.orderId.toLowerCase().replace(/[-\s]/g, '');
    return cleanPhone.includes(q) || cleanOrderId.includes(q) || o.customer.name.toLowerCase().includes(q);
  });

  if (found) {
    searchResult.value = found;
    emit('found', found);
    emit('update:isOpen', false);
  } else {
    searchResult.value = null;
  }
}
</script>
