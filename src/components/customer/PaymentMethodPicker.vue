<template>
  <!-- Section: Payment Method Selector with Dynamic PromptPay QR -->
  <q-card id="customer-payment-picker" data-audit-id="customer-payment-picker" class="rounded-borders bg-white shadow-1 q-mb-md">
    <q-card-section class="q-pa-md">
      <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-md row items-center">
        <q-icon name="payments" color="primary" class="q-mr-xs" size="22px" />
        <span>วิธีชำระเงิน</span>
      </div>

      <!-- Payment Option 1: Pay at car (Default - Zero friction) -->
      <q-item
        tag="label"
        clickable
        v-ripple
        class="rounded-borders bg-grey-1 q-mb-sm q-pa-sm"
        :class="{ 'bg-green-1 text-primary': modelValue === 'PAY_AT_CAR' }"
      >
        <q-item-section avatar>
          <q-radio
            :model-value="modelValue"
            val="PAY_AT_CAR"
            color="primary"
            @update:model-value="val => emit('update:modelValue', val)"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-subtitle2 text-weight-bold">
            💵 จ่ายตอนรับของที่รถ (เงินสด / สแกน QR)
          </q-item-label>
          <q-item-label caption class="text-grey-7">
            จ่ายเงินสด หรือสแกนจ่ายตอนรับผลไม้
          </q-item-label>
        </q-item-section>
      </q-item>

      <!-- Payment Option 2: PromptPay Prepaid -->
      <q-item
        tag="label"
        clickable
        v-ripple
        class="rounded-borders bg-grey-1 q-pa-sm"
        :class="{ 'bg-green-1 text-primary': modelValue === 'PROMPTPAY_PREPAID' }"
      >
        <q-item-section avatar>
          <q-radio
            :model-value="modelValue"
            val="PROMPTPAY_PREPAID"
            color="primary"
            @update:model-value="val => emit('update:modelValue', val)"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-subtitle2 text-weight-bold">
            📲 โอนเงินล่วงหน้า (PromptPay QR)
          </q-item-label>
          <q-item-label caption class="text-grey-7">
            สแกน QR จ่ายผ่านแอปธนาคารล่วงหน้า
          </q-item-label>
        </q-item-section>
      </q-item>

      <!-- QR Display when Prepaid selected -->
      <q-slide-transition>
        <div v-if="modelValue === 'PROMPTPAY_PREPAID'" class="q-mt-md bg-grey-1 q-pa-md rounded-borders text-center">
          <div class="text-subtitle2 text-weight-bolder text-grey-9 q-mb-xs">
            สแกนเพื่อโอนเงินล่วงหน้า
          </div>
          <div class="text-caption text-grey-7 q-mb-sm">
            ยอดเงินที่ต้องชำระ: <strong class="text-primary text-subtitle1">{{ totalAmount }} บาท</strong>
          </div>

          <!-- Generated PromptPay QR Image -->
          <div v-if="qrDataUrl" class="row justify-center q-my-sm">
            <q-img
              :src="qrDataUrl"
              style="max-width: 220px; border-radius: 8px;"
              class="shadow-2 bg-white q-pa-xs"
            />
          </div>
          <div v-else-if="isGeneratingQR" class="row justify-center q-my-md">
            <q-spinner color="primary" size="3em" />
          </div>

          <div class="text-caption text-grey-8 q-mt-xs">
            บัญชีพร้อมเพย์: <span class="text-weight-bold">{{ promptPayNumber }}</span> ({{ promptPayName }})
          </div>
          <div class="text-caption text-positive text-weight-bold q-mt-xs">
            * สแกนแล้วยอดเงินจะขึ้นตรงตามจำนวนอัตโนมัติ ไม่ต้องพิมพ์ตัวเลขเอง
          </div>
        </div>
      </q-slide-transition>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { PaymentMethod } from '@/types/fruit_app';
import { generatePromptPayQRDataUrl } from '@/utils/promptpay';

const props = defineProps<{
  modelValue: PaymentMethod;
  totalAmount: number;
  promptPayNumber: string;
  promptPayName: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: PaymentMethod): void;
}>();

const qrDataUrl = ref<string>('');
const isGeneratingQR = ref<boolean>(false);

async function refreshQR() {
  if (props.modelValue === 'PROMPTPAY_PREPAID' && props.promptPayNumber && props.totalAmount > 0) {
    isGeneratingQR.value = true;
    try {
      qrDataUrl.value = await generatePromptPayQRDataUrl(props.promptPayNumber, props.totalAmount);
    } catch (err) {
      console.error('Error generating PromptPay QR:', err);
    } finally {
      isGeneratingQR.value = false;
    }
  }
}

watch(() => [props.modelValue, props.totalAmount, props.promptPayNumber], () => {
  void refreshQR();
});

onMounted(() => {
  if (props.modelValue === 'PROMPTPAY_PREPAID') {
    void refreshQR();
  }
});
</script>
