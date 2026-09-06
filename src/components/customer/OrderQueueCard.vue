<template>
  <!-- Section: Customer Order Queue Card & Confirmation -->
  <q-card id="customer-order-queue-card" data-audit-id="customer-order-queue-card" class="rounded-borders bg-white shadow-3 q-mb-md">
    <!-- Card Top Header -->
    <div class="bg-primary text-white text-center q-pa-md">
      <q-avatar size="64px" class="bg-white q-mb-xs shadow-1">
        <q-icon name="check_circle" color="positive" size="48px" />
      </q-avatar>
      <div class="text-h6 text-weight-bolder">
        สั่งจองผลไม้สำเร็จแล้ว!
      </div>
      <div class="text-caption text-green-1">
        แคปหน้าจอไว้แสดงตอนรับของที่รถ
      </div>
    </div>

    <q-card-section class="q-pa-md">
      <!-- Order ID Banner & Personal Order QR Code -->
      <div class="bg-grey-2 q-pa-md rounded-borders text-center q-mb-md">
        <div class="text-caption text-grey-8">รหัสออเดอร์ของคุณ</div>
        <div class="text-h4 text-weight-bolder text-primary tracking-wide q-my-xs">
          #{{ order.orderId }}
        </div>

        <!-- Personal Order QR Code for Seller Tailgate Scan -->
        <div class="column items-center justify-center q-my-sm">
          <div class="bg-white q-pa-sm rounded-borders shadow-1">
            <q-img
              v-if="qrDataUrl"
              :src="qrDataUrl"
              style="width: 170px; height: 170px;"
              fit="contain"
              alt="Order QR Code"
            />
            <q-spinner v-else color="primary" size="48px" class="q-ma-lg" />
          </div>
          <div class="text-caption text-weight-bold text-grey-9 q-mt-xs">
            📱 แสดง QR Code นี้ให้คนขายสแกนรับผลไม้
          </div>
        </div>

        <div class="row justify-center items-center q-mt-xs">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            icon="content_copy"
            label="คัดลอกรหัส"
            size="sm"
            class="q-mr-sm"
            @click="copyOrderId"
          />
          <q-btn
            v-if="qrDataUrl"
            flat
            dense
            no-caps
            color="secondary"
            icon="download"
            label="บันทึกรูป QR"
            size="sm"
            @click="downloadQrImage"
          />
        </div>
      </div>

      <!-- Customer Details -->
      <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs">ข้อมูลผู้สั่ง:</div>
      <div class="bg-grey-1 q-pa-sm rounded-borders text-body2 text-grey-9 q-mb-md">
        <div><strong>ชื่อ:</strong> {{ order.customer.name }}</div>
        <div><strong>ร้าน/ชั้น:</strong> {{ order.customer.shop }} ({{ order.customer.floor }})</div>
        <div><strong>เบอร์โทร:</strong> {{ order.customer.phone }}</div>
      </div>

      <!-- Ordered Items -->
      <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs">รายการผลไม้:</div>
      <q-list separator class="bg-grey-1 rounded-borders q-mb-md">
        <q-item v-for="(item, idx) in order.items" :key="idx" class="q-py-sm">
          <q-item-section>
            <q-item-label class="text-weight-bold text-grey-9">
              {{ item.productName }}
            </q-item-label>
            <q-item-label caption class="text-grey-7">
              <span v-if="item.productType === 'FIXED_WEIGHT'">
                จำนวน {{ item.orderedKg }} กิโลกรัม {{ item.orderedBundle ? `(${item.orderedBundle})` : '' }}
              </span>
              <span v-else>
                {{ item.selectedTierLabel || 'จอง 1 ลูก' }}
                <span class="text-orange-9 text-weight-medium">(ชั่งจริงคิดเงินที่รถ)</span>
              </span>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Logistics Appointment -->
      <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs">เวลานัดรับของ:</div>
      <div class="bg-green-1 q-pa-sm rounded-borders text-body2 text-primary text-weight-bold q-mb-md row items-center">
        <q-icon name="schedule" size="20px" class="q-mr-xs" />
        <span>รอบเวลา {{ order.pickupSlot }} น. (ท้ายรถลานจอดรถห้าง)</span>
      </div>

      <!-- Payment Summary -->
      <div class="row justify-between items-center bg-grey-2 q-pa-md rounded-borders q-mb-md">
        <div class="text-body2 text-grey-9">
          วิธีชำระเงิน:
          <span class="text-weight-bold">
            {{ order.paymentMethod === 'PAY_AT_CAR' ? 'จ่ายตอนรับของที่รถ' : 'โอนล่วงหน้า' }}
          </span>
        </div>
        <div class="text-right">
          <div class="text-caption text-grey-7">ยอดรวมประมาณ:</div>
          <div class="text-h6 text-weight-bolder text-primary">
            {{ order.totalFinalPrice || order.totalEstimatedPrice }} บาท
          </div>
        </div>
      </div>

      <!-- Order Status Badge -->
      <div class="text-center q-mb-sm">
        <OrderStatusBadge :order="order" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import QRCode from 'qrcode';
import type { Order } from '@/types/fruit_app';
import OrderStatusBadge from '@/components/common/OrderStatusBadge.vue';

const props = defineProps<{
  order: Order;
}>();

const $q = useQuasar();
const qrDataUrl = ref<string>('');

// Generate QR Code containing the direct URL to the order detail
async function generateQrCode() {
  try {
    const targetUrl = `${window.location.origin}/admin/orders/${props.order.orderId}`;
    qrDataUrl.value = await QRCode.toDataURL(targetUrl, {
      width: 250,
      margin: 2,
      color: {
        dark: '#1b5e20', // Forest green matching brand
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate order QR:', err);
  }
}

onMounted(() => {
  void generateQrCode();
});

watch(() => props.order.orderId, () => {
  void generateQrCode();
});

function copyOrderId() {
  void navigator.clipboard.writeText(props.order.orderId);
  $q.notify({
    type: 'positive',
    message: `คัดลอกรหัส #${props.order.orderId} แล้ว`,
    position: 'top',
    timeout: 1500
  });
}

function downloadQrImage() {
  if (!qrDataUrl.value) return;
  const link = document.createElement('a');
  link.href = qrDataUrl.value;
  link.download = `FruitDrop-${props.order.orderId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  $q.notify({
    type: 'positive',
    message: 'ดาวน์โหลดภาพ QR Code เรียบร้อยแล้ว',
    position: 'top',
    timeout: 1500
  });
}
</script>
