<template>
  <!-- Section: Deep Profit & Loss Performance Analytics -->
  <q-page id="admin-analytics-page" data-audit-id="admin-analytics-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 84px;">
    <!-- Page Header with Back Navigation -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn
          flat
          dense
          round
          icon="arrow_back"
          color="grey-8"
          class="q-mr-sm"
          data-audit-id="btn-back-to-dispatch"
          @click="handleBack"
        >
          <q-tooltip>กลับโต๊ะจ่ายของท้ายรถ</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight text-grey-9">
            วิเคราะห์ผลประกอบการ
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Control Bar -->
    <q-card class="bg-white text-grey-9 q-pa-sm rounded-borders q-mb-md shadow-1">
      <div class="row items-center q-col-gutter-none">
        <!-- Round Filter -->
        <div class="col-12 col-sm-4 q-pa-xs">
          <q-select
            v-model="selectedRoundFilter"
            :options="roundOptions"
            emit-value
            map-options
            outlined
            dense
            label="เลือกรอบการจอง"
            data-audit-id="select-analytics-round"
          >
            <template #prepend>
              <q-icon name="event_note" color="positive" size="18px" />
            </template>
          </q-select>
        </div>

        <!-- Status Filter -->
        <div class="col-12 col-sm-4 q-pa-xs">
          <q-select
            v-model="selectedStatusFilter"
            :options="statusOptions"
            emit-value
            map-options
            outlined
            dense
            label="สถานะออเดอร์"
            data-audit-id="select-analytics-status"
          >
            <template #prepend>
              <q-icon name="tune" color="positive" size="18px" />
            </template>
          </q-select>
        </div>

        <!-- Payment Method Filter -->
        <div class="col-12 col-sm-4 q-pa-xs">
          <q-select
            v-model="selectedPaymentFilter"
            :options="paymentOptions"
            emit-value
            map-options
            outlined
            dense
            label="วิธีชำระเงิน"
            data-audit-id="select-analytics-payment"
          >
            <template #prepend>
              <q-icon name="payments" color="positive" size="18px" />
            </template>
          </q-select>
        </div>
      </div>
    </q-card>

    <!-- 4 Key Performance Indicator (KPI) Metric Cards -->
    <div class="row q-mb-md">
      <!-- 1. Total Gross Revenue -->
      <div class="col-6 col-sm-3 q-pa-xs">
        <q-card class="bg-white text-grey-9 q-pa-sm rounded-borders text-center shadow-1" style="height: 100%;">
          <div class="text-caption text-grey-7">ยอดขายรวม</div>
          <div class="text-h6 text-weight-bolder text-grey-9 q-my-xs">
            ฿{{ metrics.totalRevenue.toLocaleString() }}
          </div>
          <div class="text-caption text-grey-6" style="font-size: 11px;">
            จาก {{ metrics.filteredOrdersCount }} ออเดอร์
          </div>
        </q-card>
      </div>

      <!-- 2. Total COGS / Fruit Cost -->
      <div class="col-6 col-sm-3 q-pa-xs">
        <q-card class="bg-white text-grey-9 q-pa-sm rounded-borders text-center shadow-1" style="height: 100%;">
          <div class="text-caption text-grey-7">ต้นทุนรวม</div>
          <div class="text-h6 text-weight-bolder text-warning q-my-xs">
            ฿{{ metrics.totalCost.toLocaleString() }}
          </div>
          <div class="text-caption text-grey-6" style="font-size: 11px;">
            ต้นทุนเฉลี่ย {{ metrics.avgCostPercent }}%
          </div>
        </q-card>
      </div>

      <!-- 3. Gross Profit -->
      <div class="col-6 col-sm-3 q-pa-xs">
        <q-card class="bg-white text-grey-9 q-pa-sm rounded-borders text-center shadow-1" style="height: 100%;">
          <div class="text-caption text-grey-7">กำไร</div>
          <div
            class="text-h6 text-weight-bolder q-my-xs"
            :class="metrics.grossProfit >= 0 ? 'text-positive' : 'text-negative'"
          >
            ฿{{ metrics.grossProfit.toLocaleString() }}
          </div>
          <div class="text-caption text-grey-6" style="font-size: 11px;">
            {{ metrics.grossProfit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุน' }}
          </div>
        </q-card>
      </div>

      <!-- 4. Profit Margin % -->
      <div class="col-6 col-sm-3 q-pa-xs">
        <q-card class="bg-white text-grey-9 q-pa-sm rounded-borders text-center shadow-1" style="height: 100%;">
          <div class="text-caption text-grey-7">อัตรากำไร</div>
          <div
            class="text-h6 text-weight-bolder q-my-xs"
            :class="metrics.marginPercent >= 25 ? 'text-positive' : metrics.marginPercent >= 0 ? 'text-info' : 'text-negative'"
          >
            {{ metrics.marginPercent }}%
          </div>
          <div class="text-caption text-grey-6" style="font-size: 11px;">
            เป้าหมาย: > 30%
          </div>
        </q-card>
      </div>
    </div>

    <!-- Section: Fruit Breakdown Analysis -->
    <q-card class="bg-white text-grey-9 rounded-borders q-mb-md shadow-1 overflow-hidden">
      <!-- Section Header -->
      <div class="q-px-md q-py-sm row items-center justify-between">
        <div class="text-subtitle1 text-weight-bolder text-positive row items-center">
          <q-icon name="pie_chart" size="20px" class="q-mr-xs" />
          กำไรตามชนิดผลไม้
        </div>
        <div class="text-caption text-grey-7">
          รวม {{ fruitStats.length }} ชนิด
        </div>
      </div>

      <q-separator />

      <div v-if="fruitStats.length === 0" class="text-center q-pa-lg text-grey-6">
        ไม่มีรายการ
      </div>

      <!-- Native Quasar Flush List (No Card-in-Card) -->
      <q-list v-else separator>
        <div
          v-for="stat in fruitStats"
          :key="stat.mascotKey"
          class="q-pa-md"
          :data-audit-id="`stat-row-${stat.mascotKey}`"
        >
          <!-- Fruit Header Row -->
          <div class="row items-center justify-between q-mb-xs">
            <div class="row items-center">
              <q-avatar size="36px" class="q-mr-sm bg-grey-1 shadow-1">
                <q-img :src="`/mascots/mascot_${stat.mascotKey}.png`" fit="contain" />
              </q-avatar>
              <div>
                <div class="text-subtitle2 text-weight-bolder leading-tight text-grey-9">
                  {{ stat.name }}
                </div>
                <div class="text-caption text-grey-7" style="font-size: 11px;">
                  ขายได้: <strong>{{ stat.totalWeightKg.toFixed(1) }} กก.</strong>
                  <span v-if="stat.durianPieces > 0"> ({{ stat.durianPieces }} ลูก)</span>
                </div>
              </div>
            </div>

            <!-- Profit & Margin -->
            <div class="text-right">
              <div
                class="text-subtitle2 text-weight-bolder leading-tight"
                :class="stat.profit >= 0 ? 'text-positive' : 'text-negative'"
              >
                +฿{{ stat.profit.toLocaleString() }}
              </div>
              <q-badge
                :color="stat.marginPercent >= 25 ? 'positive' : stat.marginPercent >= 0 ? 'info' : 'negative'"
                class="text-weight-bold"
                rounded
                style="font-size: 10px;"
              >
                มาร์จิ้น {{ stat.marginPercent }}%
              </q-badge>
            </div>
          </div>

          <!-- Mini Breakdown Strip -->
          <div class="row items-center justify-between text-caption text-grey-7 q-pt-xs border-top-light">
            <div>
              ยอดขาย: <strong class="text-grey-9">฿{{ stat.revenue.toLocaleString() }}</strong>
            </div>
            <div>
              ต้นทุน: <strong class="text-warning">฿{{ stat.cost.toLocaleString() }}</strong>
            </div>
            <div>
              กำไร/กก.: <strong class="text-positive">฿{{ stat.profitPerKg.toFixed(1) }}</strong>
            </div>
          </div>
        </div>
      </q-list>
    </q-card>

    <!-- Section: Order-Level Profit Breakdown -->
    <q-card class="bg-white text-grey-9 rounded-borders shadow-1 overflow-hidden">
      <!-- Section Header -->
      <div class="q-px-md q-py-sm row items-center justify-between">
        <div class="text-subtitle1 text-weight-bolder text-positive row items-center">
          <q-icon name="receipt_long" size="20px" class="q-mr-xs" />
          สรุปรายออเดอร์
        </div>
        <div class="text-caption text-grey-7">
          แสดง {{ filteredOrders.length }} รายการ
        </div>
      </div>

      <q-separator />

      <div v-if="filteredOrders.length === 0" class="text-center q-pa-lg text-grey-6">
        ไม่พบออเดอร์
      </div>

      <!-- Native Quasar Flush List (No Card-in-Card) -->
      <q-list v-else separator>
        <q-expansion-item
          v-for="order in orderAnalysisList"
          :key="order.orderId"
          header-class="q-pa-md"
          dense-toggle
          :data-audit-id="`order-analysis-${order.orderId}`"
        >
          <template #header>
            <q-item-section avatar style="min-width: 44px; padding-right: 10px;">
              <q-avatar
                size="36px"
                :color="order.profit >= 0 ? 'positive' : 'negative'"
                text-color="white"
                icon="account_balance_wallet"
              />
            </q-item-section>

            <q-item-section>
              <!-- Row 1: Order ID + Customer Name (Left) & Profit (Right) -->
              <div class="row items-center justify-between no-wrap full-width">
                <div class="col text-subtitle2 text-weight-bolder text-grey-9 ellipsis q-mr-xs">
                  #{{ order.orderId }} - {{ order.customer.name }}
                </div>
                <div
                  class="text-subtitle2 text-weight-bolder text-no-wrap"
                  :class="order.profit >= 0 ? 'text-positive' : 'text-negative'"
                >
                  {{ order.profit >= 0 ? '+' : '' }}฿{{ order.profit.toLocaleString() }}
                </div>
              </div>

              <!-- Row 2: Customer Location & Slot (Left) | Revenue & Margin (Right) -->
              <div class="row items-center justify-between no-wrap full-width text-caption text-grey-7 q-mt-xs">
                <div class="col ellipsis q-mr-xs">
                  {{ order.customer.shop }} ({{ order.customer.floor }}) | {{ normalizeSlotLabel(order.pickupSlot) }}
                </div>
                <div class="text-no-wrap text-right" style="font-size: 11px;">
                  ขาย ฿{{ order.revenue.toLocaleString() }} ({{ order.marginPercent }}%)
                </div>
              </div>
            </q-item-section>
          </template>

          <!-- Expanded Content: Clean Inset Section (No Inner Card) -->
          <div class="bg-grey-1 text-grey-9 q-pa-md border-top-light">
            <!-- Order Item List -->
            <div class="text-caption text-grey-8 q-mb-xs text-weight-bold">
              รายการสินค้าและต้นทุนออเดอร์นี้:
            </div>

            <div
              v-for="(item, idx) in order.itemsAnalysis"
              :key="idx"
              class="row items-center justify-between text-caption text-grey-8 q-py-xs border-top-light"
            >
              <div>
                <strong>{{ item.productName }}</strong> ({{ item.weightLabel }})
              </div>
              <div class="text-right">
                <span>ขาย ฿{{ item.revenue }} - ทุน ฿{{ item.cost }} = </span>
                <strong class="text-positive">กำไร ฿{{ item.profit }}</strong>
              </div>
            </div>

            <div class="row items-center justify-between text-caption q-mt-sm text-grey-7">
              <div>
                วิธีชำระ:
                <strong class="text-grey-9">{{ order.paymentMethod === 'PAY_AT_CAR' ? '💵 เงินสดท้ายรถ' : '📱 โอนพร้อมเพย์' }}</strong>
              </div>
              <div class="row items-center no-wrap">
                <span class="q-mr-xs">สถานะ:</span>
                <OrderStatusBadge :order="order" dense />
              </div>
            </div>
          </div>
        </q-expansion-item>
      </q-list>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
// Deep Profit & Loss Performance Analytics Page: Calculates Revenue, COGS, Gross Profit, and Margins
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFruitStore } from '@/stores/fruitStore';
import type { Order, ProductItem } from '@/types/fruit_app';
import { calculateItemSubtotal } from '@/utils/pricing';
import OrderStatusBadge from '@/components/common/OrderStatusBadge.vue';
import { formatThaiPickupDate } from '@/utils/roundDate';
import { normalizeSlotLabel } from '@/utils/timeSlots';

const router = useRouter();
const fruitStore = useFruitStore();

// Filters
const selectedRoundFilter = ref<string>('ALL');
const selectedStatusFilter = ref<string>('ALL');
const selectedPaymentFilter = ref<string>('ALL');

// Navigation handler
function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin');
  }
}

// Round options
const roundOptions = computed(() => {
  const opts = [{ label: 'ทุกรอบการจอง', value: 'ALL' }];
  for (const r of fruitStore.allRounds) {
    opts.push({ label: `${r.title} (${formatThaiPickupDate(r.pickupDate)})`, value: r.roundId });
  }
  return opts;
});

// Status options
const statusOptions = [
  { label: 'ทุกสถานะ', value: 'ALL' },
  { label: 'ส่งมอบแล้ว', value: 'COMPLETED' },
  { label: 'รอรับของ', value: 'WAITING_PICKUP' },
  { label: 'ยกเลิก', value: 'CANCELLED' }
];

// Payment options
const paymentOptions = [
  { label: 'ทุกวิธีชำระ', value: 'ALL' },
  { label: 'จ่ายเงินสดท้ายรถ', value: 'PAY_AT_CAR' },
  { label: 'โอนล่วงหน้าพร้อมเพย์', value: 'PROMPTPAY_PREPAID' }
];

// Product & Master Fruit Cost Lookup Map for legacy orders lacking costPerKg snapshot
const productCostMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>();

  // 1. Map master fruit catalog suggested costs (as base lookup)
  for (const mf of fruitStore.masterFruits) {
    if (typeof mf.defaultCostPerKg === 'number' && mf.defaultCostPerKg > 0) {
      map.set(mf.id, mf.defaultCostPerKg);
      if (mf.fruitKey) map.set(mf.fruitKey, mf.defaultCostPerKg);
      if (mf.name) map.set(mf.name, mf.defaultCostPerKg);
    }
  }

  // 2. Map actual round product items (takes precedence over master catalog defaults)
  for (const p of fruitStore.products) {
    if (typeof p.costPerKg === 'number' && p.costPerKg > 0) {
      map.set(p.id, p.costPerKg);
      if (p.mascotKey) map.set(p.mascotKey, p.costPerKg);
      if (p.name) map.set(p.name, p.costPerKg);
    }
  }

  return map;
});

// Helper: Estimate weight for an order item
function getItemWeightKg(item: Order['items'][0]): number {
  if (item.productType === 'FIXED_WEIGHT') {
    return typeof item.orderedKg === 'number' ? Math.max(0, item.orderedKg) : (Number(item.orderedKg) || 0);
  }
  if (typeof item.actualWeighedKg === 'number' && item.actualWeighedKg > 0) {
    return item.actualWeighedKg;
  }
  if (item.selectedTierId?.includes('SMALL')) return 1.9;
  if (item.selectedTierId?.includes('MEDIUM')) return 2.5;
  if (item.selectedTierId?.includes('LARGE')) return 3.5;
  return 2.5;
}

// Helper: Get cost per kg for an item (Strict Snapshot Isolation with Dynamic Fallback)
function getItemCostPerKg(item: Order['items'][0]): number {
  // 1. Primary: Immutable snapshot stored in OrderItem at order placement
  if (typeof item.costPerKg === 'number' && !isNaN(item.costPerKg) && item.costPerKg >= 0) {
    return item.costPerKg;
  }

  // 2. Secondary fallback for legacy orders: lookup by productId
  const byId = productCostMap.value.get(item.productId);
  if (byId !== undefined) return byId;

  // 3. Tertiary fallback for legacy orders: lookup by mascotKey
  if (item.mascotKey) {
    const byMascot = productCostMap.value.get(item.mascotKey);
    if (byMascot !== undefined) return byMascot;
  }

  // 4. Quaternary fallback for legacy orders: lookup by productName
  const byName = productCostMap.value.get(item.productName);
  if (byName !== undefined) return byName;

  // 5. Default zero cost (no hardcoded guessing)
  return 0;
}

// Filtered Orders
const filteredOrders = computed<Order[]>(() => {
  let list = fruitStore.orders;

  // Filter Round
  if (selectedRoundFilter.value !== 'ALL') {
    list = list.filter(o => o.roundId === selectedRoundFilter.value);
  }

  // Filter Status
  if (selectedStatusFilter.value !== 'ALL') {
    list = list.filter(o => o.orderStatus === selectedStatusFilter.value);
  }

  // Filter Payment
  if (selectedPaymentFilter.value !== 'ALL') {
    list = list.filter(o => o.paymentMethod === selectedPaymentFilter.value);
  }

  return list;
});

// Overall P&L Metrics
const metrics = computed(() => {
  let totalRevenue = 0;
  let totalCost = 0;

  for (const o of filteredOrders.value) {
    if (o.orderStatus === 'CANCELLED') continue;

    const orderRevenue = o.totalFinalPrice || o.totalEstimatedPrice || 0;
    totalRevenue += orderRevenue;

    for (const item of o.items) {
      const kg = getItemWeightKg(item);
      const costPerKg = getItemCostPerKg(item);
      totalCost += kg * costPerKg;
    }
  }

  const grossProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const avgCostPercent = totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 100) : 0;

  return {
    filteredOrdersCount: filteredOrders.value.filter(o => o.orderStatus !== 'CANCELLED').length,
    totalRevenue,
    totalCost,
    grossProfit,
    marginPercent,
    avgCostPercent
  };
});

// Fruit Breakdown Statistics
interface FruitStat {
  mascotKey: string;
  name: string;
  totalWeightKg: number;
  durianPieces: number;
  revenue: number;
  cost: number;
  profit: number;
  profitPerKg: number;
  marginPercent: number;
}

const fruitStats = computed<FruitStat[]>(() => {
  const map: Record<string, {
    name: string;
    totalWeightKg: number;
    durianPieces: number;
    revenue: number;
    cost: number;
  }> = {};

  for (const o of filteredOrders.value) {
    if (o.orderStatus === 'CANCELLED') continue;

    for (const item of o.items) {
      const key = item.mascotKey || (item.productName.includes('เงาะ') ? 'ngo' : item.productName.includes('ทุเรียน') ? 'thurian' : 'other');
      if (!map[key]) {
        map[key] = {
          name: item.productName,
          totalWeightKg: 0,
          durianPieces: 0,
          revenue: 0,
          cost: 0
        };
      }

      const kg = getItemWeightKg(item);
      const costPerKg = getItemCostPerKg(item);
      const itemRev = calculateItemSubtotal(item, fruitStore.products);

      map[key].totalWeightKg += kg;
      map[key].revenue += itemRev;
      map[key].cost += kg * costPerKg;

      if (item.productType === 'VARIABLE_WHOLE_FRUIT') {
        map[key].durianPieces += 1;
      }
    }
  }

  return Object.entries(map).map(([mascotKey, data]) => {
    const profit = data.revenue - data.cost;
    const profitPerKg = data.totalWeightKg > 0 ? profit / data.totalWeightKg : 0;
    const marginPercent = data.revenue > 0 ? Math.round((profit / data.revenue) * 100) : 0;

    return {
      mascotKey,
      name: data.name,
      totalWeightKg: data.totalWeightKg,
      durianPieces: data.durianPieces,
      revenue: data.revenue,
      cost: data.cost,
      profit,
      profitPerKg,
      marginPercent
    };
  }).sort((a, b) => b.revenue - a.revenue);
});

// Order-level analysis
const orderAnalysisList = computed(() => {
  return filteredOrders.value.map(order => {
    const revenue = order.totalFinalPrice || order.totalEstimatedPrice || 0;
    let cost = 0;

    const itemsAnalysis = order.items.map(item => {
      const kg = getItemWeightKg(item);
      const costPerKg = getItemCostPerKg(item);
      const itemRevenue = calculateItemSubtotal(item, fruitStore.products);
      const itemCost = kg * costPerKg;
      const itemProfit = itemRevenue - itemCost;
      cost += itemCost;

      const weightLabel = item.productType === 'VARIABLE_WHOLE_FRUIT'
        ? (item.actualWeighedKg ? `${item.actualWeighedKg} กก.` : item.selectedTierLabel || 'รอชั่ง')
        : `${kg} กก.`;

      return {
        productName: item.productName,
        weightLabel,
        revenue: itemRevenue,
        cost: itemCost,
        profit: itemProfit
      };
    });

    const profit = revenue - cost;
    const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return {
      ...order,
      revenue,
      cost,
      profit,
      marginPercent,
      itemsAnalysis
    };
  });
});
</script>
