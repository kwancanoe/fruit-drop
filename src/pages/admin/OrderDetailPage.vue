<template>
  <!-- Section: Order Detail Full-Page View for Admin Dispatch Desk -->
  <q-page id="admin-order-detail-page" data-audit-id="admin-order-detail-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 90px;">
    <!-- Top App Navigation Bar -->
    <div class="row items-center justify-between q-mb-md">
      <q-btn
        flat
        dense
        no-caps
        icon="arrow_back"
        label="กลับหน้ารายการ"
        color="grey-8"
        class="text-weight-bold"
        data-audit-id="btn-back-to-dispatch-list"
        @click="handleBack"
      />
      <div class="row items-center">
        <q-badge
          v-if="order?.orderStatus === 'COMPLETED'"
          color="positive"
          class="text-weight-bold q-px-sm q-py-xs"
          rounded
        >
          ✓ ส่งมอบเรียบร้อย
        </q-badge>
        <q-badge
          v-else-if="hasUnweighedFruit"
          color="amber-9"
          class="text-weight-bold q-px-sm q-py-xs"
          rounded
        >
          ⚖️ รอชั่งน้ำหนัก
        </q-badge>
        <q-badge
          v-else-if="order?.paymentStatus === 'PAID'"
          color="info"
          class="text-weight-bold q-px-sm q-py-xs"
          rounded
        >
          ✓ โอนเงินแล้ว
        </q-badge>
        <q-badge
          v-else
          color="warning"
          class="text-weight-bold text-white q-px-sm q-py-xs"
          rounded
        >
          ⚠️ รอชำระเงิน
        </q-badge>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="48px" />
      <div class="text-caption text-grey-7 q-mt-sm">กำลังโหลดข้อมูลออเดอร์...</div>
    </div>

    <!-- Not Found State -->
    <div v-else-if="!order" class="bg-white q-pa-xl rounded-borders text-center shadow-1">
      <q-icon name="error_outline" size="56px" color="negative" class="q-mb-sm" />
      <div class="text-h6 text-weight-bold text-grey-9">ไม่พบออเดอร์ #{{ orderId }}</div>
      <div class="text-caption text-grey-6 q-mb-md">กรุณาตรวจสอบรหัสออเดอร์ หรือสแกน QR Code ใหม่อีกครั้ง</div>
      <q-btn color="primary" label="กลับไปหน้าจ่ายของ" no-caps to="/admin" />
    </div>

    <!-- Order Detail Content -->
    <div v-else>
      <!-- 1. Header Card: Order ID, Slot & Status -->
      <q-card class="bg-white shadow-1 rounded-borders q-mb-md" data-audit-id="card-order-header">
        <q-card-section class="q-pa-md">
          <div class="row items-center justify-between">
            <div>
              <div class="text-caption text-grey-7">รหัสออเดอร์</div>
              <div class="text-h4 text-weight-bolder text-primary">#{{ order.orderId }}</div>
            </div>
            <div class="text-right">
              <div class="text-caption text-grey-7">รอบเวลานัดรับ</div>
              <q-badge color="grey-3" text-color="grey-9" class="text-subtitle2 text-weight-bold q-px-sm q-py-xs" rounded>
                <q-icon name="schedule" size="16px" class="q-mr-xs" />
                {{ order.pickupSlot }}
              </q-badge>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- 2. Customer Information Card -->
      <q-card class="bg-white shadow-1 rounded-borders q-mb-md" data-audit-id="card-customer-info">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm row items-center">
            <q-icon name="person" color="primary" class="q-mr-xs" size="20px" />
            <span>ข้อมูลผู้รับผลไม้</span>
          </div>

          <div class="bg-grey-1 q-pa-md rounded-borders">
            <div class="row items-center justify-between q-mb-xs">
              <div>
                <span class="text-subtitle1 text-weight-bolder text-grey-9">{{ order.customer.name }}</span>
                <div class="text-body2 text-grey-7">
                  🏢 {{ order.customer.shop }} • ชั้น {{ order.customer.floor }}
                </div>
              </div>

              <!-- Quick Call Customer -->
              <q-btn
                color="primary"
                icon="phone"
                label="โทรหา"
                no-caps
                dense
                class="q-px-sm text-weight-bold"
                :href="`tel:${order.customer.phone}`"
              />
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              เบอร์โทรศัพท์: <strong>{{ order.customer.phone }}</strong>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- 3. Fruit Items & Digital Scale Calculator -->
      <q-card class="bg-white shadow-1 rounded-borders q-mb-md" data-audit-id="card-ordered-items">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm row items-center">
            <q-icon name="shopping_basket" color="primary" class="q-mr-xs" size="20px" />
            <span>รายการผลไม้ในถุง</span>
          </div>

          <q-list separator class="rounded-borders">
            <q-item v-for="(item, idx) in order.items" :key="idx" class="q-pa-sm">
              <q-item-section avatar>
                <q-avatar size="44px" class="bg-green-1">
                  <q-icon
                    :name="item.productType === 'VARIABLE_WHOLE_FRUIT' ? 'scale' : 'local_mall'"
                    :color="item.productType === 'VARIABLE_WHOLE_FRUIT' ? 'amber-9' : 'positive'"
                    size="28px"
                  />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-subtitle2 text-weight-bold text-grey-9">
                  {{ item.productName }}
                </q-item-label>

                <!-- Fixed Weight Fruit Display -->
                <q-item-label v-if="item.productType === 'FIXED_WEIGHT'" caption class="text-grey-7">
                  จำนวน: <strong>{{ item.orderedKg }} กก.</strong> {{ item.orderedBundle ? `(${item.orderedBundle})` : '' }}
                  <div class="text-primary text-weight-bold q-mt-xs">
                    {{ (item.orderedKg || 1) * item.pricePerKg }} บาท
                  </div>
                </q-item-label>

                <!-- Variable Weight Durian with Digital Scale Input -->
                <q-item-label v-else caption class="text-grey-7">
                  ขนาดที่จอง: <strong>{{ item.selectedTierLabel || '1 ลูก' }}</strong> (กก. ละ {{ item.pricePerKg }} บาท)

                  <!-- Already Weighed Result -->
                  <div v-if="item.actualWeighedKg" class="text-positive text-weight-bold q-mt-xs">
                    ✓ ชั่งแล้ว: {{ item.actualWeighedKg }} กก. = {{ item.itemFinalPrice }} บาท
                  </div>

                  <!-- Inline Scale Input Box -->
                  <div class="bg-amber-1 q-pa-sm rounded-borders q-mt-sm border-amber">
                    <div class="text-caption text-weight-bold text-amber-10 q-mb-xs">
                      {{ item.actualWeighedKg ? 'แก้ไขน้ำหนักชั่งจริง:' : '⚖️ ชั่งน้ำหนักจริงบนตาชั่ง:' }}
                    </div>
                    <div class="row items-center no-wrap">
                      <q-input
                        v-model.number="durianInputs[idx]"
                        outlined
                        dense
                        type="number"
                        step="0.05"
                        min="0.5"
                        max="10"
                        bg-color="white"
                        placeholder="เช่น 2.75"
                        class="col"
                        input-class="text-weight-bold text-primary"
                      >
                        <template #append>
                          <span class="text-caption text-grey-7">กก.</span>
                        </template>
                      </q-input>

                      <q-btn
                        color="amber-9"
                        label="บันทึก"
                        no-caps
                        dense
                        class="q-ml-sm q-px-md text-weight-bold"
                        :loading="isSavingWeight[idx]"
                        @click="handleSaveWeight(idx)"
                      />
                    </div>

                    <!-- Quick Preset Weight Buttons -->
                    <div class="row items-center q-mt-xs">
                      <span class="text-caption text-grey-7 q-mr-xs">ปุ่มลัด:</span>
                      <q-btn
                        v-for="w in [2.0, 2.4, 2.6, 2.8, 3.0, 3.2]"
                        :key="w"
                        flat
                        dense
                        no-caps
                        size="xs"
                        color="grey-8"
                        :label="`${w}`"
                        class="q-mr-xs bg-white text-weight-medium"
                        @click="durianInputs[idx] = w"
                      />
                    </div>
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- 4. Dynamic PromptPay Payment QR Section (User Explicit Requirement) -->
      <q-card class="bg-white shadow-2 rounded-borders q-mb-md" data-audit-id="card-payment-qr">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-xs row items-center justify-between">
            <div class="row items-center">
              <q-icon name="qr_code_scanner" color="primary" class="q-mr-xs" size="22px" />
              <span>QR Code รับเงิน (ให้ลูกค้าสแกนจ่าย)</span>
            </div>
            <div class="text-h6 text-weight-bolder text-primary">
              {{ currentFinalPrice }} บาท
            </div>
          </div>

          <!-- Gating: If Durian Unweighed, Block QR and Show Amber Alert -->
          <div v-if="hasUnweighedFruit" class="bg-amber-1 q-pa-md rounded-borders border-amber text-center q-my-sm">
            <q-icon name="scale" color="amber-9" size="36px" class="q-mb-xs" />
            <div class="text-subtitle2 text-weight-bolder text-amber-10">
              กรุณาชั่งน้ำหนักทุเรียนก่อนสร้าง QR รับเงิน
            </div>
            <div class="text-caption text-grey-8">
              เมื่อกรอกและบันทึกน้ำหนักทุเรียนด้านบนแล้ว ระบบจะคำนวณยอดเงินที่ถูกต้อง และสร้าง QR พร้อมเพย์ให้ลูกค้าสแกนทันที
            </div>
          </div>

          <!-- Ready State: Display High-Quality PromptPay QR Code -->
          <div v-else class="text-center q-py-sm">
            <div v-if="isGeneratingQR" class="q-pa-xl">
              <q-spinner color="primary" size="48px" />
              <div class="text-caption text-grey-7 q-mt-sm">กำลังสร้าง QR พร้อมเพย์...</div>
            </div>

            <div v-else-if="promptPayQrUrl" class="column items-center">
              <div class="bg-white q-pa-sm rounded-borders shadow-2 inline-block border-positive">
                <q-img
                  :src="promptPayQrUrl"
                  style="width: 220px; height: 220px;"
                  fit="contain"
                  alt="PromptPay QR Code"
                />
              </div>

              <div class="text-subtitle2 text-weight-bolder text-primary q-mt-sm">
                ยอดชำระ: {{ currentFinalPrice }} บาท
              </div>
              <div class="text-caption text-grey-8">
                พร้อมเพย์: <strong>{{ activeRound?.promptPayNumber || '0878902935' }}</strong> ({{ activeRound?.promptPayName || 'นาตยา บุญณะ' }})
              </div>
              <div class="text-caption text-grey-7">
                หรือโอน ธ.กสิกรไทย <strong>{{ activeRound?.bankAccountNumber || '8172235408' }}</strong>
              </div>
              <div class="text-caption text-positive text-weight-bold q-mt-xs">
                📱 ให้ลูกค้าเปิดแอปธนาคารสแกนหน้าจอนี้ได้ทันที ยอดเงินตรงตามจำนวน
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- 5. Payment Slip / Handover Photo Proof -->
      <q-card class="bg-white shadow-1 rounded-borders q-mb-md" data-audit-id="card-photo-proof">
        <q-card-section class="q-pa-md">
          <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm row items-center justify-between">
            <div class="row items-center">
              <q-icon name="photo_camera" color="primary" class="q-mr-xs" size="20px" />
              <span>รูปหลักฐานสลิป / ส่งมอบ (ไม่บังคับ)</span>
            </div>
            <q-badge v-if="order.proofUrl" color="positive" rounded>มีรูปหลักฐานแล้ว</q-badge>
          </div>

          <!-- Hidden Native Camera Inputs -->
          <input
            ref="cameraInputRef"
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden"
            @change="handleFileSelected"
          />
          <input
            ref="galleryInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelected"
          />

          <!-- Proof Preview if Available -->
          <div v-if="order.proofUrl || localPreviewUrl" class="text-center q-mb-sm">
            <q-img
              :src="localPreviewUrl || order.proofUrl"
              style="max-height: 180px; max-width: 260px;"
              fit="contain"
              class="rounded-borders shadow-1"
            />
          </div>

          <div class="row justify-center items-center q-gutter-x-sm">
            <q-btn
              outline
              dense
              no-caps
              color="primary"
              icon="photo_camera"
              label="ถ่ายรูปด้วยกล้อง"
              class="q-px-sm text-weight-bold"
              :loading="isUploadingProof"
              @click="triggerCamera"
            />
            <q-btn
              flat
              dense
              no-caps
              color="grey-8"
              icon="photo_library"
              label="เลือกจากอัลบั้ม"
              class="q-px-sm"
              :loading="isUploadingProof"
              @click="triggerGallery"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- 6. Handover Action Commands (Strict Semantic Colors) -->
      <div class="bg-white q-pa-md rounded-borders shadow-2 q-mb-xl" data-audit-id="card-dispatch-actions">
        <!-- A. When Order is Waiting Pickup -->
        <template v-if="order.orderStatus !== 'COMPLETED'">
          <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-sm">
            บันทึกการส่งมอบผลไม้:
          </div>

          <div v-if="hasUnweighedFruit" class="text-caption text-negative text-weight-bold q-mb-sm">
            * ต้องชั่งน้ำหนักทุเรียนให้ครบก่อน จึงจะสามารถยืนยันส่งมอบได้
          </div>

          <div class="row q-col-gutter-sm">
            <!-- Command: Collect Cash & Deliver -->
            <div class="col-12 col-sm-6">
              <q-btn
                color="warning"
                class="full-width q-py-md text-weight-bolder text-subtitle2 shadow-2"
                no-caps
                rounded
                icon="payments"
                :disable="hasUnweighedFruit"
                :loading="isSubmittingAction"
                @click="handleCollectCashAndDeliver"
              >
                <span>รับเงินสด {{ currentFinalPrice }} บ. & ส่งมอบ</span>
              </q-btn>
            </div>

            <!-- Command: Confirm Transfer & Deliver -->
            <div class="col-12 col-sm-6">
              <q-btn
                color="positive"
                class="full-width q-py-md text-weight-bolder text-subtitle2 shadow-2"
                no-caps
                rounded
                icon="done_all"
                :disable="hasUnweighedFruit"
                :loading="isSubmittingAction"
                @click="handleConfirmTransferAndDeliver"
              >
                <span>ลูกค้าโอนเงินแล้ว & ส่งมอบ</span>
              </q-btn>
            </div>
          </div>
        </template>

        <!-- B. When Order is Already Delivered (Completed) -->
        <template v-else>
          <div class="bg-green-1 q-pa-md rounded-borders text-center q-mb-md">
            <q-icon name="check_circle" color="positive" size="44px" class="q-mb-xs" />
            <div class="text-subtitle1 text-weight-bolder text-positive">
              ส่งมอบผลไม้ให้ออเดอร์นี้เรียบร้อยแล้ว
            </div>
            <div v-if="order.attribution" class="text-caption text-grey-8 q-mt-xs">
              ส่งโดย: <strong>{{ order.attribution.handledByName }}</strong> ({{ order.attribution.handledByRole }})
              <span v-if="order.completedAt"> • {{ formatTimestamp(order.completedAt) }}</span>
            </div>
          </div>

          <div class="row justify-center">
            <q-btn
              flat
              dense
              no-caps
              color="grey-6"
              icon="undo"
              label="ยกเลิกสถานะส่งมอบ (ส่งผิดคน/แก้ไข)"
              class="text-weight-bold"
              :loading="isSubmittingAction"
              @click="handleRevertDelivery"
            />
          </div>
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import { generatePromptPayQRDataUrl } from '@/utils/promptpay';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();

const orderId = computed<string>(() => (route.params.orderId as string) || '');
const order = ref<Order | null>(null);
const isLoading = ref<boolean>(true);

// Durian Scale Inputs
const durianInputs = ref<Record<number, number>>({});
const isSavingWeight = ref<Record<number, boolean>>({});

// PromptPay QR State
const promptPayQrUrl = ref<string>('');
const isGeneratingQR = ref<boolean>(false);

// Proof Photo Upload
const cameraInputRef = ref<HTMLInputElement | null>(null);
const galleryInputRef = ref<HTMLInputElement | null>(null);
const localPreviewUrl = ref<string>('');
const isUploadingProof = ref<boolean>(false);
const isSubmittingAction = ref<boolean>(false);

const activeRound = computed(() => fruitStore.activeRound);

// Load Order from memory or Firestore
async function loadOrder() {
  isLoading.value = true;
  try {
    const fetched = await fruitStore.getOrderByOrderId(orderId.value);
    order.value = fetched;

    // Pre-fill durian weight inputs if already entered
    if (fetched && fetched.items) {
      fetched.items.forEach((item, idx) => {
        if (item.productType === 'VARIABLE_WHOLE_FRUIT' && item.actualWeighedKg) {
          durianInputs.value[idx] = item.actualWeighedKg;
        }
      });
    }

    void refreshPromptPayQR();
  } catch (err) {
    console.error('Error loading order detail:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadOrder();
});

// Watch route changes if scanned another order
watch(() => route.params.orderId, () => {
  void loadOrder();
});

// Check if there are any unweighed durians
const hasUnweighedFruit = computed<boolean>(() => {
  if (!order.value || !order.value.items) return false;
  return order.value.items.some(
    i => i.productType === 'VARIABLE_WHOLE_FRUIT' && (!i.actualWeighedKg || i.actualWeighedKg <= 0)
  );
});

// Final net price calculation
const currentFinalPrice = computed<number>(() => {
  if (!order.value) return 0;
  return order.value.totalFinalPrice || order.value.totalEstimatedPrice || 0;
});

// Generate PromptPay QR Code dynamically when items are ready
async function refreshPromptPayQR() {
  if (!order.value || hasUnweighedFruit.value) {
    promptPayQrUrl.value = '';
    return;
  }

  const promptPayNumber = activeRound.value?.promptPayNumber || '0878902935';
  const amount = currentFinalPrice.value;

  if (!promptPayNumber || amount <= 0) return;

  isGeneratingQR.value = true;
  try {
    promptPayQrUrl.value = await generatePromptPayQRDataUrl(promptPayNumber, amount);
  } catch (err) {
    console.error('Error generating PromptPay QR in order detail:', err);
  } finally {
    isGeneratingQR.value = false;
  }
}

// Durian Scale Save Handler
async function handleSaveWeight(idx: number) {
  if (!order.value) return;
  const weight = durianInputs.value[idx];
  if (!weight || weight <= 0) {
    $q.notify({ type: 'warning', message: 'กรุณาระบุน้ำหนักที่มากกว่า 0 กก.', position: 'top' });
    return;
  }

  isSavingWeight.value[idx] = true;
  try {
    const item = order.value.items[idx];
    if (!item) return;

    const finalItemPrice = Math.round(weight * item.pricePerKg);
    await fruitStore.updateWeighedFruit(order.value.orderId, idx, weight, finalItemPrice);

    // Update local reactive state
    item.actualWeighedKg = weight;
    item.itemFinalPrice = finalItemPrice;

    // Recalculate order total final price
    let sum = 0;
    for (const it of order.value.items) {
      if (it.itemFinalPrice !== undefined) {
        sum += it.itemFinalPrice;
      } else {
        sum += (it.orderedKg || 1) * it.pricePerKg;
      }
    }
    order.value.totalFinalPrice = sum;

    $q.notify({
      type: 'positive',
      message: `บันทึกน้ำหนัก ${weight} กก. (${finalItemPrice} บาท) เรียบร้อย!`,
      position: 'top',
      timeout: 1500
    });

    // Automatically regenerate PromptPay QR code with new total
    void refreshPromptPayQR();
  } catch (err) {
    console.error('Save weight error:', err);
    $q.notify({ type: 'negative', message: 'บันทึกน้ำหนักไม่สำเร็จ', position: 'top' });
  } finally {
    isSavingWeight.value[idx] = false;
  }
}

// Camera Trigger Helpers
function triggerCamera() {
  cameraInputRef.value?.click();
}

function triggerGallery() {
  galleryInputRef.value?.click();
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !order.value) return;

  isUploadingProof.value = true;
  localPreviewUrl.value = URL.createObjectURL(file);
  try {
    const downloadUrl = await fruitStore.uploadPaymentProof(order.value.orderId, file);
    await fruitStore.updateOrderStatus(order.value.orderId, {
      proofUrl: downloadUrl
    });
    order.value.proofUrl = downloadUrl;
    $q.notify({ type: 'positive', message: 'แนบรูปหลักฐานสำเร็จแล้ว', position: 'top', timeout: 1500 });
  } catch (err) {
    console.error('Upload proof error:', err);
    $q.notify({ type: 'negative', message: 'อัปโหลดรูปหลักฐานไม่สำเร็จ', position: 'top' });
  } finally {
    isUploadingProof.value = false;
  }
}

// Handover Deliver Handlers
async function handleCollectCashAndDeliver() {
  if (!order.value) return;
  isSubmittingAction.value = true;
  try {
    await fruitStore.updateOrderStatus(order.value.orderId, {
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'PAY_AT_CAR',
      completedAt: Date.now(),
      paidAt: Date.now()
    });

    order.value.orderStatus = 'COMPLETED';
    order.value.paymentStatus = 'PAID';
    order.value.completedAt = Date.now();

    $q.notify({
      type: 'positive',
      message: `รับเงินสด ${currentFinalPrice.value} บาท และส่งมอบผลไม้เรียบร้อย!`,
      position: 'top',
      timeout: 2000
    });
  } catch (err) {
    console.error('Collect cash error:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึก', position: 'top' });
  } finally {
    isSubmittingAction.value = false;
  }
}

async function handleConfirmTransferAndDeliver() {
  if (!order.value) return;
  isSubmittingAction.value = true;
  try {
    await fruitStore.updateOrderStatus(order.value.orderId, {
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: Date.now(),
      paidAt: Date.now()
    });

    order.value.orderStatus = 'COMPLETED';
    order.value.paymentStatus = 'PAID';
    order.value.completedAt = Date.now();

    $q.notify({
      type: 'positive',
      message: `ยืนยันการโอนเงินและส่งมอบผลไม้ออเดอร์ #${order.value.orderId} แล้ว!`,
      position: 'top',
      timeout: 2000
    });
  } catch (err) {
    console.error('Confirm transfer error:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึก', position: 'top' });
  } finally {
    isSubmittingAction.value = false;
  }
}

// Revert status
function handleRevertDelivery() {
  $q.dialog({
    title: 'ยืนยันยกเลิกสถานะส่งมอบ',
    message: `ต้องการเปลี่ยนสถานะออเดอร์ #${order.value?.orderId} กลับเป็น "รอมารับของ" หรือไม่?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    void doRevert();
  });
}

async function doRevert() {
  if (!order.value) return;
  isSubmittingAction.value = true;
  try {
    await fruitStore.updateOrderStatus(order.value.orderId, {
      orderStatus: 'WAITING_PICKUP',
      completedAt: undefined
    });
    order.value.orderStatus = 'WAITING_PICKUP';
    order.value.completedAt = undefined;
    $q.notify({ type: 'info', message: 'ยกเลิกสถานะส่งมอบเรียบร้อย', position: 'top', timeout: 1500 });
  } catch (err) {
    console.error('Revert error:', err);
  } finally {
    isSubmittingAction.value = false;
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin');
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
}
</script>
