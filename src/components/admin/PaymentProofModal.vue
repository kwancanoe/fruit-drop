<template>
  <!-- Section: Camera Payment & Handover Proof Capture Modal -->
  <q-dialog
    :model-value="isOpen"
    persistent
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="val => $emit('update:isOpen', val)"
  >
    <q-card id="payment-proof-modal" data-audit-id="payment-proof-modal" class="rounded-borders bg-white" style="width: 95vw; max-width: 480px;">
      <!-- Header -->
      <q-card-section class="bg-dark text-white row items-center justify-between q-pa-md">
        <div class="row items-center">
          <q-avatar size="36px" class="q-mr-sm bg-positive">
            <q-icon name="photo_camera" color="white" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bolder">
              ถ่ายรูปหลักฐานการจ่ายเงิน / ส่งมอบ
            </div>
            <div class="text-caption text-grey-4">
              ออเดอร์ #{{ order?.orderId }} ({{ order?.customer.name }})
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" :disable="isUploading" @click="closeModal" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <!-- Order Financial Recap -->
        <div class="bg-grey-1 q-pa-sm rounded-borders text-caption text-grey-9 q-mb-md row justify-between items-center">
          <div>
            <strong>ลูกค้า:</strong> {{ order?.customer.name }} ({{ order?.customer.shop }})
          </div>
          <div class="text-primary text-subtitle2 text-weight-bolder">
            {{ order?.totalFinalPrice || order?.totalEstimatedPrice }} บาท
          </div>
        </div>

        <!-- Hidden Native File Inputs -->
        <!-- 1. Direct rear camera trigger for mobile -->
        <input
          ref="cameraInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="handleFileChange"
        />
        <!-- 2. Gallery file picker -->
        <input
          ref="galleryInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />

        <!-- Image Preview Area -->
        <div v-if="previewUrl" class="text-center q-mb-md">
          <div class="relative-position inline-block">
            <q-img
              :src="previewUrl"
              style="max-height: 240px; max-width: 100%; border-radius: 8px;"
              class="shadow-2 bg-grey-2"
              fit="contain"
            />
            <q-btn
              round
              dense
              color="negative"
              icon="delete"
              size="sm"
              class="absolute-top-right q-ma-xs shadow-2"
              @click="clearSelectedImage"
            />
          </div>
          <div class="text-caption text-positive text-weight-medium q-mt-xs">
            ✓ บีบอัดรูปพร้อมส่ง: {{ (compressedSizeBytes / 1024).toFixed(1) }} KB
          </div>
        </div>

        <!-- Camera / Gallery Action Buttons -->
        <div class="row q-mb-md">
          <div class="col-6 q-pr-xs">
            <q-btn
              color="positive"
              icon="photo_camera"
              label="เปิดกล้องถ่ายรูป"
              class="full-width q-py-sm text-weight-bold"
              no-caps
              :disable="isUploading"
              @click="triggerCamera"
            />
          </div>
          <div class="col-6 q-pl-xs">
            <q-btn
              outline
              color="primary"
              icon="photo_library"
              label="เลือกจากอัลบั้ม"
              class="full-width q-py-sm"
              no-caps
              :disable="isUploading"
              @click="triggerGallery"
            />
          </div>
        </div>

        <div class="text-caption text-grey-7 text-center q-mb-md">
          * ควรถ่ายสลิปโอนเงิน หรือรูปถ่ายลูกค้าตอนส่งมอบของเพื่อเป็นหลักฐาน
        </div>

        <!-- Confirm and Submit Button -->
        <div class="row">
          <div class="col-12">
            <q-btn
              color="positive"
              class="full-width q-py-md text-subtitle2 text-weight-bolder shadow-2"
              no-caps
              :loading="isUploading"
              @click="submitProofAndDeliver"
            >
              <q-icon name="task_alt" class="q-mr-xs" />
              <span>
                {{ previewUrl ? 'บันทึกหลักฐาน & ส่งมอบสำเร็จ' : 'ส่งมอบโดยไม่ต้องแนบรูป' }}
              </span>
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import type { Order } from '@/types/fruit_app';
import { compressImage } from '@/utils/imageCompressor';
import { useFruitStore } from '@/stores/fruitStore';

const props = defineProps<{
  isOpen: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
  (e: 'completed', orderId: string): void;
}>();

const $q = useQuasar();
const fruitStore = useFruitStore();

const cameraInputRef = ref<HTMLInputElement | null>(null);
const galleryInputRef = ref<HTMLInputElement | null>(null);

const previewUrl = ref<string>('');
const compressedBlob = ref<Blob | null>(null);
const compressedSizeBytes = ref<number>(0);
const isUploading = ref<boolean>(false);

function triggerCamera() {
  cameraInputRef.value?.click();
}

function triggerGallery() {
  galleryInputRef.value?.click();
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    $q.loading.show({ message: 'กำลังบีบอัดรูปภาพ...' });
    const result = await compressImage(file, 1200, 1200, 0.75);
    previewUrl.value = result.dataUrl;
    compressedBlob.value = result.blob;
    compressedSizeBytes.value = result.sizeBytes;
  } catch (err) {
    console.error('Image compression error:', err);
    $q.notify({ type: 'negative', message: 'ไม่สามารถประมวลผลรูปภาพได้' });
  } finally {
    $q.loading.hide();
    input.value = ''; // Reset input to allow selecting same file again
  }
}

function clearSelectedImage() {
  previewUrl.value = '';
  compressedBlob.value = null;
  compressedSizeBytes.value = 0;
}

async function submitProofAndDeliver() {
  if (!props.order) return;

  isUploading.value = true;
  try {
    let proofUrl = props.order.proofUrl || '';

    // If a photo was captured, upload to Firebase Storage
    if (compressedBlob.value) {
      try {
        proofUrl = await fruitStore.uploadPaymentProof(props.order.orderId, compressedBlob.value);
      } catch (uploadErr) {
        console.warn('Storage upload error, using local data URL fallback:', uploadErr);
        // Fallback to dataUrl if storage is offline or permissions issue
        proofUrl = previewUrl.value;
      }
    }

    // Update order status to COMPLETED with proofUrl and attribution
    await fruitStore.updateOrderStatus(props.order.orderId, {
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      proofUrl: proofUrl || undefined,
      completedAt: Date.now(),
      paidAt: Date.now()
    });

    $q.notify({
      type: 'positive',
      message: `บันทึกหลักฐานและส่งมอบ #${props.order.orderId} สำเร็จ!`,
      position: 'top',
      timeout: 2000
    });

    emit('completed', props.order.orderId);
    closeModal();
  } catch (err) {
    console.error('Delivery confirmation error:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกสถานะ' });
  } finally {
    isUploading.value = false;
  }
}

function closeModal() {
  clearSelectedImage();
  emit('update:isOpen', false);
}
</script>
