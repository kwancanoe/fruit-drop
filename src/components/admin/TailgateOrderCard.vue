<template>
  <!-- Section: Tailgate Order Card for Admin Dispatch Desk -->
  <q-card
    id="tailgate-order-card"
    :data-audit-id="`order-${order.orderId}`"
    class="rounded-borders bg-white shadow-1 q-mb-sm"
    :class="{ 'border-positive': order.orderStatus === 'COMPLETED' }"
  >
    <q-card-section class="q-pa-md">
      <!-- Top Row: Order ID, Time Slot & Customer Shop -->
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <div class="row items-center">
          <span class="text-subtitle1 text-weight-bolder text-primary q-mr-sm">
            #{{ order.orderId }}
          </span>
          <q-badge color="grey-3" text-color="grey-9" class="text-weight-bold" rounded>
            {{ order.pickupSlot }}
          </q-badge>
        </div>

        <!-- Status Badge -->
        <div>
          <q-badge
            v-if="order.orderStatus === 'COMPLETED'"
            color="positive"
            class="text-weight-bold"
            rounded
          >
            ✓ ส่งมอบแล้ว
          </q-badge>
          <q-badge
            v-else-if="hasUnweighedFruit"
            color="amber-9"
            class="text-weight-bold"
            rounded
          >
            ⚖️ รอชั่งน้ำหนัก
          </q-badge>
          <q-badge
            v-else-if="order.paymentStatus === 'PAID'"
            color="info"
            class="text-weight-bold"
            rounded
          >
            ✓ โอนเงินแล้ว
          </q-badge>
          <q-badge
            v-else
            color="warning"
            class="text-weight-bold text-white"
            rounded
          >
            ⚠️ เก็บเงินสด {{ order.totalFinalPrice || order.totalEstimatedPrice }} บ.
          </q-badge>
        </div>
      </div>

      <!-- Customer Location & Contact -->
      <div class="row items-center justify-between text-body2 text-grey-9 q-mb-sm">
        <div>
          <span class="text-weight-bolder text-subtitle2">{{ order.customer.name }}</span>
          <span class="text-grey-7 q-ml-xs">| {{ order.customer.shop }} ({{ order.customer.floor }})</span>
        </div>
        <q-btn
          flat
          dense
          round
          icon="phone"
          color="primary"
          size="sm"
          :href="`tel:${order.customer.phone}`"
        >
          <q-tooltip>โทรหาลูกค้า</q-tooltip>
        </q-btn>
      </div>

      <q-separator class="q-my-xs" />

      <!-- Item Bag Contents -->
      <div class="q-py-xs">
        <div v-for="(item, idx) in order.items" :key="idx" class="row items-center justify-between text-body2 q-py-xs">
          <div class="row items-center">
            <q-icon
              :name="item.productType === 'VARIABLE_WHOLE_FRUIT' ? 'scale' : 'shopping_bag'"
              :color="item.productType === 'VARIABLE_WHOLE_FRUIT' ? 'amber-9' : 'primary'"
              size="18px"
              class="q-mr-xs"
            />
            <span class="text-weight-medium text-grey-9">{{ item.productName }}</span>
            <span class="text-caption text-grey-7 q-ml-xs">
              <template v-if="item.productType === 'FIXED_WEIGHT'">
                ({{ item.orderedKg }} กก. {{ item.orderedBundle || '' }})
              </template>
              <template v-else>
                ({{ item.selectedTierLabel || 'จอง 1 ลูก' }})
                <span v-if="item.actualWeighedKg" class="text-positive text-weight-bold q-ml-xs">
                  [ชั่งแล้ว: {{ item.actualWeighedKg }} กก. = {{ item.itemFinalPrice }} บ.]
                </span>
              </template>
            </span>
          </div>

          <!-- Specific button to weigh if durian and not yet delivered -->
          <div v-if="item.productType === 'VARIABLE_WHOLE_FRUIT' && order.orderStatus !== 'COMPLETED'">
            <q-btn
              outline
              dense
              no-caps
              color="amber-9"
              icon="scale"
              label="ชั่งน้ำหนัก"
              size="sm"
              class="q-px-xs"
              @click="$emit('open-scale', { order, itemIndex: idx })"
            />
          </div>
        </div>
      </div>

      <!-- Attribution & Proof Audit Row (if available) -->
      <div v-if="order.attribution || order.proofUrl" class="bg-grey-1 q-pa-xs rounded-borders q-mt-xs row items-center justify-between text-caption" style="font-size: 11px;">
        <div class="col text-grey-8">
          <span v-if="order.attribution">
            👤 ส่งโดย: <strong>{{ order.attribution.handledByName }}</strong> ({{ order.attribution.handledByRole }})
            <span v-if="order.attribution.deviceFingerprint?.deviceModel" class="text-grey-6 q-ml-xs">
              • {{ order.attribution.deviceFingerprint.deviceModel }}
            </span>
          </span>
        </div>
        <div v-if="order.proofUrl" class="col-auto">
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            icon="image"
            label="ดูรูปหลักฐาน"
            size="xs"
            :href="order.proofUrl"
            target="_blank"
          />
        </div>
      </div>

      <q-separator class="q-my-xs" />

      <!-- Bottom Action Row -->
      <div class="row items-center justify-between q-pt-xs">
        <div class="text-caption text-grey-8">
          ยอดรวมสุทธิ: <strong class="text-primary text-subtitle2">{{ order.totalFinalPrice || order.totalEstimatedPrice }} บาท</strong>
        </div>

        <div class="row items-center">
          <template v-if="order.orderStatus !== 'COMPLETED'">
            <!-- Camera Proof Button (Mandatory or optional photo attachment) -->
            <q-btn
              outline
              dense
              no-caps
              color="primary"
              icon="photo_camera"
              label="ถ่ายรูปสลิป/ส่งมอบ"
              class="q-mr-xs q-px-xs"
              size="sm"
              @click="$emit('open-proof-modal', order)"
            />

            <!-- Case A: Ready to deliver after scale or if paid -->
            <q-btn
              v-if="order.paymentStatus === 'PAID'"
              color="positive"
              icon="done"
              label="ส่งมอบแล้ว"
              no-caps
              dense
              class="q-px-sm"
              size="sm"
              @click="$emit('mark-delivered', order.orderId)"
            />

            <!-- Case B: Collect cash & deliver in 1 tap -->
            <q-btn
              v-else
              color="positive"
              icon="payments"
              :label="`รับเงิน ${order.totalFinalPrice || order.totalEstimatedPrice} บ. & ส่งมอบ`"
              no-caps
              dense
              class="q-px-sm text-weight-bold"
              size="sm"
              @click="$emit('collect-cash-deliver', order.orderId)"
            />
          </template>

          <template v-else>
            <q-btn
              flat
              dense
              no-caps
              color="grey-6"
              label="ยกเลิกสถานะส่งมอบ"
              size="xs"
              @click="$emit('revert-status', order.orderId)"
            />
          </template>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Order } from '@/types/fruit_app';

const props = defineProps<{
  order: Order;
}>();

defineEmits<{
  (e: 'open-scale', payload: { order: Order; itemIndex: number }): void;
  (e: 'open-proof-modal', order: Order): void;
  (e: 'mark-delivered', orderId: string): void;
  (e: 'collect-cash-deliver', orderId: string): void;
  (e: 'revert-status', orderId: string): void;
}>();

// Check if any whole fruit item has not been weighed yet
const hasUnweighedFruit = computed<boolean>(() => {
  return props.order.items.some(
    i => i.productType === 'VARIABLE_WHOLE_FRUIT' && (!i.actualWeighedKg || i.actualWeighedKg <= 0)
  );
});
</script>
