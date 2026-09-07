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
        <OrderStatusBadge v-if="order" :order="order" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="48px" />
      <div class="text-caption text-grey-7 q-mt-sm">กำลังโหลดข้อมูลออเดอร์...</div>
    </div>

    <!-- Not Found State -->
    <q-card v-else-if="!order" class="bg-white q-pa-xl text-center shadow-1">
      <q-icon name="error_outline" size="56px" color="negative" class="q-mb-sm" />
      <div class="text-h6 text-weight-bold text-grey-9">ไม่พบออเดอร์ #{{ orderId }}</div>
      <div class="text-caption text-grey-6 q-mb-md">ตรวจสอบรหัสออเดอร์ หรือสแกน QR Code ใหม่อีกครั้ง</div>
      <q-btn color="primary" label="กลับไปหน้าจ่ายของ" no-caps to="/admin" />
    </q-card>

    <!-- Order Detail Content: Unified Single Surface Sheet (No Card-in-Card, No Multi-Card Fragmentation) -->
    <div v-else>
      <q-card class="bg-white shadow-1 rounded-borders overflow-hidden q-mb-xl" data-audit-id="order-detail-sheet">
        <!-- 1. Header Section: Order ID, Slot & Status -->
        <div class="q-pa-md" data-audit-id="section-order-header">
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
        </div>

        <q-separator />

        <!-- 2. Customer Information Section (Flat, No Inner Subcard) -->
        <div class="q-pa-md" data-audit-id="section-customer-info">
          <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm row items-center">
            <q-icon name="person" color="primary" class="q-mr-xs" size="20px" />
            <span>ข้อมูลลูกค้า</span>
          </div>

          <div class="row items-center justify-between no-wrap">
            <div class="col ellipsis">
              <div class="text-subtitle1 text-weight-bolder text-grey-9 ellipsis">{{ order.customer.name }}</div>
              <div class="text-caption text-grey-7 q-mt-xs">
                🏢 {{ order.customer.shop }} • ชั้น {{ order.customer.floor.replace(/^ชั้น\s*/, '') }}
              </div>
              <div class="text-caption text-grey-8 text-weight-medium q-mt-xs">
                เบอร์โทรศัพท์: <strong>{{ order.customer.phone }}</strong>
              </div>
            </div>

            <!-- Sleek Mobile Call Button -->
            <div class="col-auto q-pl-md">
              <q-btn
                round
                color="positive"
                icon="phone"
                size="md"
                class="shadow-2"
                :href="`tel:${order.customer.phone}`"
                data-audit-id="btn-call-customer"
              >
                <q-tooltip>โทรหาลูกค้า</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>

        <q-separator />

        <!-- 3. Fruit Items & Digital Scale Calculator -->
        <div class="q-pa-md" data-audit-id="section-ordered-items">
          <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm row items-center">
            <q-icon name="shopping_basket" color="primary" class="q-mr-xs" size="20px" />
            <span>รายการผลไม้</span>
          </div>

          <q-list separator>
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
                    {{ calculateItemSubtotal(item, fruitStore.products) }} บาท
                  </div>
                </q-item-label>

                <!-- Variable Weight Durian with Digital Scale Input -->
                <q-item-label v-else caption class="text-grey-7">
                  ขนาดที่จอง: <strong>{{ item.selectedTierLabel || '1 ลูก' }}</strong> (กก. ละ {{ item.pricePerKg }} บาท)

                  <!-- Already Weighed Result -->
                  <div v-if="item.actualWeighedKg" class="text-positive text-weight-bold q-mt-xs">
                    ✓ ชั่งแล้ว: {{ item.actualWeighedKg }} กก. = {{ item.itemFinalPrice }} บาท
                  </div>

                  <!-- Inline Scale Input Box: Interactive Selector with Direct Typing -->
                  <div class="bg-amber-1 q-pa-sm rounded-borders q-mt-sm border-amber" data-audit-id="durian-scale-box">
                    <div class="text-caption text-weight-bold text-amber-10 q-mb-xs">
                      {{ item.actualWeighedKg ? 'แก้ไขน้ำหนักชั่งจริง:' : '⚖️ ชั่งน้ำหนักทุเรียน:' }}
                    </div>
                    <div class="row items-center no-wrap">
                      <q-select
                        v-model="durianInputs[idx]"
                        use-input
                        fill-input
                        hide-selected
                        input-debounce="0"
                        behavior="menu"
                        :options="weightOptions[idx] || defaultWeightOptions"
                        options-dense
                        dense
                        outlined
                        bg-color="white"
                        placeholder="เลือกหรือพิมพ์ เช่น 2.75"
                        class="col"
                        input-class="text-weight-bold text-primary"
                        inputmode="decimal"
                        data-audit-id="select-durian-weight"
                        @filter="(val, update) => filterWeightOptions(idx, val, update)"
                        @input-value="val => handleWeightTyping(idx, val)"
                        @keydown="handleWeightKeydown"
                        @keyup.enter="handleSaveWeight(idx)"
                      >
                        <template #append>
                          <span class="text-caption text-grey-7">กก.</span>
                        </template>
                        <template #option="scope">
                          <q-item v-bind="scope.itemProps" dense class="q-py-none">
                            <q-item-section>
                              <q-item-label class="text-weight-medium text-grey-9">{{ scope.opt }} กก.</q-item-label>
                            </q-item-section>
                          </q-item>
                        </template>
                        <template #no-option>
                          <q-item dense>
                            <q-item-section class="text-grey-6 text-caption">
                              กดปุ่ม "บันทึก" ด้านข้างเพื่อใช้น้ำหนักนี้
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>

                      <q-btn
                        color="amber-9"
                        label="บันทึก"
                        no-caps
                        dense
                        class="q-ml-sm q-px-md text-weight-bold"
                        :loading="isSavingWeight[idx]"
                        data-audit-id="btn-save-weight"
                        @click="handleSaveWeight(idx)"
                      />
                    </div>

                    <!-- Quick Preset Weight Buttons -->
                    <div class="row items-center q-mt-xs">
                      <span class="text-caption text-grey-7 q-mr-xs">ปุ่มลัด:</span>
                      <q-btn
                        v-for="w in ['2.0', '2.4', '2.6', '2.8', '3.0', '3.2']"
                        :key="w"
                        flat
                        dense
                        no-caps
                        size="xs"
                        color="grey-8"
                        :label="w"
                        class="q-mr-xs bg-white text-weight-medium"
                        @click="durianInputs[idx] = w"
                      />
                    </div>
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- 4. Dynamic PromptPay Payment QR Section (Only shown when WAITING_PICKUP) -->
        <template v-if="order.orderStatus === 'WAITING_PICKUP'">
          <q-separator />
          <div class="q-pa-md" data-audit-id="section-payment-qr">
            <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-xs row items-center justify-between">
              <div class="row items-center">
                <q-icon name="qr_code_scanner" color="primary" class="q-mr-xs" size="22px" />
                <span>QR รับเงิน</span>
              </div>
              <div class="text-h6 text-weight-bolder text-primary">
                {{ currentFinalPrice }} บาท
              </div>
            </div>

            <!-- Gating: If Durian Unweighed, Block QR and Show Amber Alert -->
            <div v-if="hasUnweighedFruit" class="bg-amber-1 q-pa-md rounded-borders border-amber text-center q-my-sm">
              <q-icon name="scale" color="amber-9" size="36px" class="q-mb-xs" />
              <div class="text-subtitle2 text-weight-bolder text-amber-10">
                ชั่งน้ำหนักทุเรียนก่อนสร้าง QR รับเงิน
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
                  📱 ให้ลูกค้าเปิดแอปธนาคารสแกนหน้าจอนี้ได้ทันที
                </div>
              </div>
            </div>
          </div>
        </template>

        <q-separator />

        <!-- 5. Payment Slip / Handover Photo Proof -->
        <div class="q-pa-md" data-audit-id="section-photo-proof">
          <div class="text-subtitle2 text-weight-bold text-grey-8 q-mb-sm row items-center justify-between">
            <div class="row items-center">
              <q-icon name="photo_camera" color="primary" class="q-mr-xs" size="20px" />
              <span>แนบรูปสลิป / ส่งมอบ (ถ้ามี)</span>
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

          <div class="row justify-center items-center">
            <q-btn
              outline
              dense
              no-caps
              color="primary"
              icon="photo_camera"
              label="ถ่ายรูปด้วยกล้อง"
              class="q-mr-sm q-px-sm text-weight-bold"
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
        </div>

        <q-separator />

        <!-- 6. Handover Action Commands (Strict Semantic Colors) -->
        <div class="q-pa-md" data-audit-id="section-dispatch-actions">
          <!-- A. When Order is Waiting Pickup -->
          <template v-if="order.orderStatus === 'WAITING_PICKUP'">
            <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-sm">
              บันทึกการส่งมอบผลไม้:
            </div>

            <div v-if="hasUnweighedFruit" class="text-caption text-negative text-weight-bold q-mb-sm">
              * ต้องชั่งน้ำหนักทุเรียนให้ครบก่อน จึงจะสามารถยืนยันส่งมอบได้
            </div>

            <div class="row">
              <!-- Command: Collect Cash & Deliver -->
              <div class="col-12 col-sm-6 q-pa-xs">
                <q-btn
                  color="warning"
                  class="full-width q-py-md text-weight-bolder text-subtitle2 shadow-2 btn-gradient-warning"
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
              <div class="col-12 col-sm-6 q-pa-xs">
                <q-btn
                  color="positive"
                  class="full-width q-py-md text-weight-bolder text-subtitle2 shadow-2 btn-gradient-primary"
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

            <!-- Secondary Danger Command: Cancel Order (No-show / Customer Cancellation) -->
            <div class="row justify-center q-mt-md">
              <q-btn
                flat
                dense
                no-caps
                color="negative"
                icon="cancel"
                label="ยกเลิกออเดอร์นี้ (ลูกค้าไม่มารับ / ลูกค้ายกเลิก)"
                class="text-weight-bold"
                data-audit-id="btn-open-cancel-dialog"
                :disable="isSubmittingAction"
                @click="openCancelDialog"
              />
            </div>
          </template>

          <!-- B. When Order is Already Delivered (Completed) -->
          <template v-else-if="order.orderStatus === 'COMPLETED'">
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
                label="ยกเลิกการส่งมอบ"
                class="text-weight-bold"
                :loading="isSubmittingAction"
                @click="handleRevertDelivery"
              />
            </div>
          </template>

          <!-- C. When Order is Cancelled -->
          <template v-else-if="order.orderStatus === 'CANCELLED'">
            <div class="bg-red-1 q-pa-md rounded-borders text-center q-mb-md border-negative" data-audit-id="banner-order-cancelled">
              <q-icon name="cancel" color="negative" size="44px" class="q-mb-xs" />
              <div class="text-subtitle1 text-weight-bolder text-negative">
                ออเดอร์นี้ถูกยกเลิกแล้ว
              </div>
              <div v-if="order.cancelReason" class="text-caption text-grey-8 q-mt-xs">
                สาเหตุ: <strong>{{ order.cancelReason }}</strong>
              </div>
              <div v-if="order.cancelledAt" class="text-caption text-grey-7 q-mt-xs">
                ยกเลิกเมื่อ: {{ formatTimestamp(order.cancelledAt) }}
              </div>
            </div>

            <div class="row justify-center">
              <q-btn
                flat
                dense
                no-caps
                color="grey-8"
                icon="restore"
                label="คืนสถานะออเดอร์ (กลับเป็นรอมารับของ)"
                class="text-weight-bold"
                data-audit-id="btn-revert-cancellation"
                :loading="isSubmittingAction"
                @click="handleRevertCancellation"
              />
            </div>
          </template>
        </div>
      </q-card>
    </div>

    <!-- Dialog: Order Cancellation Confirmation Modal (M3 16px Card & Red Semantic Command) -->
    <q-dialog v-model="showCancelDialog" persistent transition-show="jump-up" transition-hide="jump-down">
      <q-card id="dialog-order-cancellation" data-audit-id="dialog-order-cancellation" class="bg-white overflow-hidden" style="width: 95vw; max-width: 460px; border-radius: 16px;">
        <div class="q-pa-md bg-negative text-white row items-center justify-between">
          <div class="text-subtitle1 text-weight-bolder row items-center">
            <q-icon name="cancel" size="22px" class="q-mr-xs" />
            <span>ยืนยันยกเลิกออเดอร์ #{{ order?.orderId }}</span>
          </div>
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </div>

        <q-card-section class="q-pa-md">
          <div class="text-body2 text-grey-9 q-mb-sm">
            คุณต้องการยกเลิกคำสั่งซื้อของ <strong>{{ order?.customer?.name }}</strong> ({{ order?.customer?.shop }}) หรือไม่?
          </div>

          <div class="bg-amber-1 q-pa-sm rounded-borders text-caption text-amber-10 q-mb-md">
            ⚠️ การยกเลิกจะเปลี่ยนสถานะเป็น "ยกเลิกแล้ว" และไม่นับรวมในยอดขาย/เงินสดที่รถ
          </div>

          <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
            เลือกเหตุผลการยกเลิก:
          </div>
          <div class="row q-mb-sm">
            <q-chip
              v-for="r in cancelReasonPresets"
              :key="r"
              clickable
              :color="selectedCancelReason === r ? 'negative' : 'grey-2'"
              :text-color="selectedCancelReason === r ? 'white' : 'grey-9'"
              class="text-weight-bold q-mr-xs q-mb-xs"
              @click="selectedCancelReason = r"
            >
              {{ r }}
            </q-chip>
          </div>

          <q-input
            v-if="selectedCancelReason === 'ระบุเหตุผลอื่น...'"
            v-model="customCancelReason"
            outlined
            dense
            placeholder="พิมพ์เหตุผลการยกเลิก..."
            class="q-mt-xs"
            autofocus
            data-audit-id="input-custom-cancel-reason"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn
            flat
            no-caps
            label="ย้อนกลับ"
            color="grey-8"
            class="text-weight-bold"
            v-close-popup
          />
          <q-btn
            rounded
            unelevated
            no-caps
            color="negative"
            icon="cancel"
            label="ยืนยันยกเลิกออเดอร์"
            class="text-weight-bolder q-px-lg shadow-2"
            data-audit-id="btn-confirm-cancel-order"
            :loading="isSubmittingAction"
            @click="handleExecuteCancelOrder"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order } from '@/types/fruit_app';
import { generatePromptPayQRDataUrl } from '@/utils/promptpay';
import { calculateItemSubtotal, calculateOrderFinalTotal } from '@/utils/pricing';
import { orderHasUnweighedFruit } from '@/constants/status';
import { compressImage } from '@/utils/imageCompressor';
import OrderStatusBadge from '@/components/common/OrderStatusBadge.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();

const orderId = computed<string>(() => (route.params.orderId as string) || '');
const order = ref<Order | null>(null);
const isLoading = ref<boolean>(true);

// Durian Scale Inputs: Supports direct typing and combo-box selector
const durianInputs = ref<Record<number, string>>({});
const isSavingWeight = ref<Record<number, boolean>>({});

// Predefined weight options for durian combobox
const defaultWeightOptions = [
  '1.5', '1.6', '1.7', '1.8', '1.9',
  '2.0', '2.1', '2.2', '2.3', '2.4',
  '2.5', '2.6', '2.7', '2.8', '2.9',
  '3.0', '3.1', '3.2', '3.3', '3.4',
  '3.5', '3.6', '3.7', '3.8', '3.9',
  '4.0', '4.2', '4.5', '4.8', '5.0'
];
const weightOptions = ref<Record<number, string[]>>({});

// Filter weight options in combobox based on typed value
function filterWeightOptions(idx: number, val: string, update: (callback: () => void) => void) {
  update(() => {
    if (!val) {
      weightOptions.value[idx] = defaultWeightOptions;
    } else {
      const needle = val.trim().toLowerCase();
      weightOptions.value[idx] = defaultWeightOptions.filter(v => v.includes(needle));
    }
  });
}

// Strictly allow only numbers and at most one decimal point when typing
function handleWeightTyping(idx: number, val: string) {
  if (val === undefined || val === null) return;
  let clean = val.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  durianInputs.value[idx] = clean;
}

// Block non-numeric characters from keyboard input
function handleWeightKeydown(e: KeyboardEvent) {
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    return;
  }
  if (/^[0-9]$/.test(e.key)) {
    return;
  }
  if (e.key === '.') {
    return;
  }
  e.preventDefault();
}

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
          durianInputs.value[idx] = String(item.actualWeighedKg);
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
  return order.value ? orderHasUnweighedFruit(order.value) : false;
});

// Final net price calculation using centralized pricing engine
const currentFinalPrice = computed<number>(() => {
  if (!order.value) return 0;
  if (hasUnweighedFruit.value) {
    return order.value.totalEstimatedPrice || 0;
  }
  const calculated = calculateOrderFinalTotal(order.value.items, fruitStore.products);
  if (calculated > 0) return calculated;
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
  const raw = durianInputs.value[idx];
  const weight = parseFloat(String(raw || '0'));
  if (!weight || isNaN(weight) || weight <= 0) {
    $q.notify({ type: 'warning', message: 'ระบุน้ำหนักที่มากกว่า 0 กก.', position: 'top' });
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
    durianInputs.value[idx] = String(weight);

    // Recalculate order total final price using centralized pricing engine
    const sum = calculateOrderFinalTotal(order.value.items, fruitStore.products);
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
  try {
    // Revoke previous blob preview if any
    if (localPreviewUrl.value && localPreviewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl.value);
    }

    // 1. Client-side compress camera photo / slip (max 1200x1200px, JPEG 0.75)
    const originalSizeKb = (file.size / 1024).toFixed(0);
    const compressed = await compressImage(file, 1200, 1200, 0.75);
    localPreviewUrl.value = compressed.dataUrl;
    const compressedSizeKb = (compressed.sizeBytes / 1024).toFixed(0);

    // 2. Upload compressed blob to Firebase Storage
    const downloadUrl = await fruitStore.uploadPaymentProof(order.value.orderId, compressed.blob);

    // 3. Persist proofUrl into Firestore order document
    await fruitStore.updateOrderStatus(order.value.orderId, {
      proofUrl: downloadUrl
    });
    order.value.proofUrl = downloadUrl;

    $q.notify({
      type: 'positive',
      message: `แนบรูปหลักฐานสำเร็จ (${compressedSizeKb} KB จาก ${originalSizeKb} KB)`,
      position: 'top',
      timeout: 2000
    });
  } catch (err) {
    console.error('Upload proof error:', err);
    $q.notify({ type: 'negative', message: 'อัปโหลดรูปหลักฐานไม่สำเร็จ', position: 'top' });
  } finally {
    isUploadingProof.value = false;
    target.value = ''; // Reset input to allow re-taking or selecting same file
  }
}

// Handover Deliver Handlers
async function handleCollectCashAndDeliver() {
  if (!order.value) return;
  isSubmittingAction.value = true;
  try {
    const timestamp = Date.now();
    await fruitStore.updateOrderStatus(order.value.orderId, {
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'PAY_AT_CAR',
      totalFinalPrice: currentFinalPrice.value,
      completedAt: timestamp,
      paidAt: timestamp
    });

    order.value.orderStatus = 'COMPLETED';
    order.value.paymentStatus = 'PAID';
    order.value.paymentMethod = 'PAY_AT_CAR';
    order.value.totalFinalPrice = currentFinalPrice.value;
    order.value.completedAt = timestamp;
    order.value.paidAt = timestamp;
    const target = fruitStore.orders.find(o => o.orderId === order.value?.orderId);
    if (target?.attribution) {
      order.value.attribution = target.attribution;
    }

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
    const timestamp = Date.now();
    await fruitStore.updateOrderStatus(order.value.orderId, {
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'PROMPTPAY_PREPAID',
      totalFinalPrice: currentFinalPrice.value,
      completedAt: timestamp,
      paidAt: timestamp
    });

    order.value.orderStatus = 'COMPLETED';
    order.value.paymentStatus = 'PAID';
    order.value.paymentMethod = 'PROMPTPAY_PREPAID';
    order.value.totalFinalPrice = currentFinalPrice.value;
    order.value.completedAt = timestamp;
    order.value.paidAt = timestamp;
    const target = fruitStore.orders.find(o => o.orderId === order.value?.orderId);
    if (target?.attribution) {
      order.value.attribution = target.attribution;
    }

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

// Cancellation state & handlers
const showCancelDialog = ref<boolean>(false);
const cancelReasonPresets = [
  'ลูกค้าไม่มารับตามนัด (No-show)',
  'ลูกค้ายกเลิกคำสั่งซื้อ',
  'สั่งผิด / สั่งซ้ำ',
  'ระบุเหตุผลอื่น...'
];
const selectedCancelReason = ref<string>('ลูกค้าไม่มารับตามนัด (No-show)');
const customCancelReason = ref<string>('');

function openCancelDialog() {
  selectedCancelReason.value = 'ลูกค้าไม่มารับตามนัด (No-show)';
  customCancelReason.value = '';
  showCancelDialog.value = true;
}

async function handleExecuteCancelOrder() {
  if (!order.value) return;
  const reason = selectedCancelReason.value === 'ระบุเหตุผลอื่น...'
    ? customCancelReason.value.trim() || 'ลูกค้ายกเลิกคำสั่งซื้อ'
    : selectedCancelReason.value;

  isSubmittingAction.value = true;
  try {
    await fruitStore.cancelOrder(order.value.orderId, reason);
    order.value.orderStatus = 'CANCELLED';
    order.value.cancelledAt = Date.now();
    order.value.cancelReason = reason;
    showCancelDialog.value = false;
    $q.notify({
      type: 'warning',
      message: `ยกเลิกออเดอร์ #${order.value.orderId} เรียบร้อยแล้ว`,
      position: 'top',
      timeout: 2000
    });
  } catch (err) {
    console.error('Cancel order error:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการยกเลิกออเดอร์', position: 'top' });
  } finally {
    isSubmittingAction.value = false;
  }
}

async function handleRevertCancellation() {
  if (!order.value) return;
  isSubmittingAction.value = true;
  try {
    await fruitStore.revertOrderCancellation(order.value.orderId);
    order.value.orderStatus = 'WAITING_PICKUP';
    order.value.cancelledAt = undefined;
    order.value.cancelReason = undefined;
    $q.notify({
      type: 'positive',
      message: `คืนสถานะออเดอร์ #${order.value.orderId} เป็นรอมารับของแล้ว`,
      position: 'top',
      timeout: 1500
    });
    void refreshPromptPayQR();
  } catch (err) {
    console.error('Revert cancellation error:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการคืนสถานะ', position: 'top' });
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
      paymentStatus: 'UNPAID',
      completedAt: undefined,
      paidAt: undefined,
      attribution: undefined
    });
    order.value.orderStatus = 'WAITING_PICKUP';
    order.value.paymentStatus = 'UNPAID';
    order.value.completedAt = undefined;
    order.value.paidAt = undefined;
    order.value.attribution = undefined;
    $q.notify({ type: 'info', message: 'ยกเลิกสถานะส่งมอบเรียบร้อย', position: 'top', timeout: 1500 });
  } catch (err) {
    console.error('Revert error:', err);
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาดในการยกเลิกสถานะส่งมอบ',
      position: 'top'
    });
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

onBeforeUnmount(() => {
  if (localPreviewUrl.value && localPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(localPreviewUrl.value);
  }
});
</script>
