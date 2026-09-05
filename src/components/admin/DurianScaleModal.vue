<template>
  <!-- Section: Durian Digital Scale & Dynamic PromptPay QR Modal -->
  <q-dialog
    :model-value="isOpen"
    persistent
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="val => $emit('update:isOpen', val)"
  >
    <q-card id="durian-scale-modal" data-audit-id="durian-scale-modal" class="rounded-borders bg-white" style="width: 95vw; max-width: 460px;">
      <!-- Header -->
      <q-card-section class="bg-dark text-white row items-center justify-between q-pa-md">
        <div class="row items-center">
          <q-avatar size="36px" class="q-mr-sm bg-amber-9">
            <q-icon name="scale" color="white" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bolder">
              ตาชั่งดิจิทัลคำนวณเงิน
            </div>
            <div class="text-caption text-grey-4">
              {{ item?.productName || 'ทุเรียนหมอนทอง' }}
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" @click="closeModal" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Customer Details Preview -->
        <div class="bg-grey-1 q-pa-sm rounded-borders q-mb-md text-caption">
          <strong>ลูกค้า:</strong> {{ order?.customer.name }} ({{ order?.customer.shop }} {{ order?.customer.floor }})
          <br />
          <strong>ขนาดที่จองไว้:</strong> {{ item?.selectedTierLabel || '1 ลูก' }}
        </div>

        <!-- Scale Weight Input Field -->
        <div class="q-mb-md">
          <div class="text-caption text-grey-8 q-mb-xs">
            กรอกน้ำหนักจริงบนตาชั่ง (กิโลกรัม):
          </div>
          <q-input
            v-model.number="weighedKg"
            outlined
            type="number"
            step="0.05"
            min="0.5"
            max="10"
            dense
            input-class="text-h5 text-weight-bolder text-center text-primary"
            autofocus
            placeholder="เช่น 2.75"
            @update:model-value="recalculate"
          >
            <template #append>
              <span class="text-subtitle2 text-weight-bold text-grey-7">กก.</span>
            </template>
          </q-input>
        </div>

        <!-- Calculation Display Board -->
        <div class="bg-green-1 border-primary q-pa-md rounded-borders text-center q-mb-md">
          <div class="text-caption text-grey-8">
            ราคา กก. ละ {{ pricePerKg }} บาท × {{ weighedKg || 0 }} กก.
          </div>
          <div class="text-h4 text-weight-bolder text-primary q-my-xs">
            {{ calculatedPrice }} บาท
          </div>
          <div class="text-caption text-positive text-weight-bold">
            (ยอดสุทธิที่ต้องเรียกเก็บ)
          </div>
        </div>

        <!-- High-Contrast Dynamic PromptPay QR Display (if toggled) -->
        <div v-if="showQR && qrDataUrl" class="bg-grey-9 text-white q-pa-md rounded-borders text-center q-mb-md">
          <div class="text-subtitle2 text-weight-bolder text-amber">
            📲 ลูกค้าสแกนจ่าย {{ calculatedPrice }} บาท
          </div>
          <div class="row justify-center q-my-sm">
            <q-img
              :src="qrDataUrl"
              style="max-width: 220px; border-radius: 8px;"
              class="bg-white q-pa-xs shadow-2"
            />
          </div>
          <div class="text-caption text-grey-3">
            พร้อมเพย์: <strong>{{ promptPayNumber }}</strong> ({{ promptPayName }})
          </div>
          <div class="text-caption text-green-3 text-weight-bold q-mt-xs">
            * ล็อกยอดเงินเป๊ะ สแกนได้ทุกแอปธนาคาร
          </div>
        </div>

        <!-- Command Action Buttons -->
        <div class="row">
          <!-- Button: Show QR code -->
          <div class="col-6 q-pr-xs">
            <q-btn
              outline
              color="primary"
              icon="qr_code_scanner"
              label="แสดง QR ยอดนี้"
              class="full-width q-py-sm"
              no-caps
              :disable="calculatedPrice <= 0"
              @click="toggleQR"
            />
          </div>

          <!-- Button: Confirm Cash Collected -->
          <div class="col-6 q-pl-xs">
            <q-btn
              color="positive"
              icon="payments"
              :label="`รับเงินสด ${calculatedPrice} บ.`"
              class="full-width q-py-sm text-weight-bold"
              no-caps
              :disable="calculatedPrice <= 0"
              @click="confirmDelivery('CASH')"
            />
          </div>

          <!-- Button: Confirm Bank Transfer -->
          <div v-if="showQR" class="col-12 q-mt-sm">
            <q-btn
              color="positive"
              icon="check_circle"
              label="✓ ได้รับเงินโอนแล้ว & ส่งมอบทุเรียน"
              class="full-width q-py-md text-subtitle2 text-weight-bolder shadow-3"
              no-caps
              @click="confirmDelivery('TRANSFER')"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Order, OrderItem } from '@/types/fruit_app';
import { generatePromptPayQRDataUrl } from '@/utils/promptpay';

const props = defineProps<{
  isOpen: boolean;
  order: Order | null;
  itemIndex: number;
  promptPayNumber: string;
  promptPayName: string;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'confirm', payload: {
    orderId: string;
    itemIndex: number;
    weighedKg: number;
    finalPrice: number;
    paymentMode: 'CASH' | 'TRANSFER';
  }): void;
}>();

const weighedKg = ref<number>(2.5);
const showQR = ref<boolean>(false);
const qrDataUrl = ref<string>('');

const item = computed<OrderItem | null>(() => {
  if (!props.order || props.itemIndex < 0) return null;
  return props.order.items[props.itemIndex] || null;
});

const pricePerKg = computed<number>(() => item.value?.pricePerKg || 160);

const calculatedPrice = computed<number>(() => {
  if (!weighedKg.value || weighedKg.value <= 0) return 0;
  return Math.round(weighedKg.value * pricePerKg.value);
});

// Watch modal opening to reset values
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    weighedKg.value = item.value?.actualWeighedKg || 2.5;
    showQR.value = false;
    qrDataUrl.value = '';
  }
});

function recalculate() {
  if (showQR.value) {
    void generateQR();
  }
}

async function toggleQR() {
  showQR.value = true;
  await generateQR();
}

async function generateQR() {
  if (calculatedPrice.value > 0 && props.promptPayNumber) {
    try {
      qrDataUrl.value = await generatePromptPayQRDataUrl(props.promptPayNumber, calculatedPrice.value);
    } catch (err) {
      console.error('QR error:', err);
    }
  }
}

function confirmDelivery(paymentMode: 'CASH' | 'TRANSFER') {
  if (!props.order || props.itemIndex < 0) return;

  emit('confirm', {
    orderId: props.order.orderId,
    itemIndex: props.itemIndex,
    weighedKg: weighedKg.value,
    finalPrice: calculatedPrice.value,
    paymentMode
  });

  closeModal();
}

function closeModal() {
  emit('update:isOpen', false);
}
</script>
