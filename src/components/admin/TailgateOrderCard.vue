<template>
  <!-- Section: Tailgate Order Card for Admin Dispatch Desk (Click to view full detail) -->
  <q-card
    id="tailgate-order-card"
    :data-audit-id="`order-${order.orderId}`"
    class="rounded-borders bg-white shadow-1 q-mb-sm cursor-pointer transition-all"
    :class="{
      'border-positive': order.orderStatus === 'COMPLETED',
      'border-amber': order.orderStatus === 'WAITING_PICKUP' && hasUnweighedFruit
    }"
    @click="navigateToDetail"
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
          @click.stop
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
                <span v-else class="text-amber-9 text-weight-bold q-ml-xs">
                  [ยังไม่ชั่ง]
                </span>
              </template>
            </span>
          </div>
        </div>
      </div>

      <!-- Attribution Audit (if delivered) -->
      <div v-if="order.attribution" class="bg-grey-1 q-pa-xs rounded-borders q-mt-xs row items-center justify-between text-caption" style="font-size: 11px;">
        <div class="col text-grey-8">
          👤 ส่งโดย: <strong>{{ order.attribution.handledByName }}</strong> ({{ order.attribution.handledByRole }})
        </div>
      </div>

      <q-separator class="q-my-xs" />

      <!-- Bottom Summary & Click Affordance -->
      <div class="row items-center justify-between q-pt-xs">
        <div class="text-caption text-grey-8">
          ยอดรวมสุทธิ: <strong class="text-primary text-subtitle2">{{ order.totalFinalPrice || order.totalEstimatedPrice }} บาท</strong>
        </div>

        <div class="row items-center text-primary text-weight-bold text-caption">
          <span>ตรวจออเดอร์ & ส่งมอบ</span>
          <q-icon name="chevron_right" size="20px" />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Order } from '@/types/fruit_app';

const props = defineProps<{
  order: Order;
}>();

const router = useRouter();

function navigateToDetail() {
  void router.push(`/admin/orders/${props.order.orderId}`);
}

// Check if any whole fruit item has not been weighed yet
const hasUnweighedFruit = computed<boolean>(() => {
  return props.order.items.some(
    i => i.productType === 'VARIABLE_WHOLE_FRUIT' && (!i.actualWeighedKg || i.actualWeighedKg <= 0)
  );
});
</script>
