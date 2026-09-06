<template>
  <!-- Section: Dual-Archetype Fruit Product Selection -->
  <div id="customer-fruit-selector" data-audit-id="customer-fruit-selector">
    <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-sm row items-center">
      <q-icon name="shopping_basket" color="primary" class="q-mr-xs" size="22px" />
      <span>เลือกผลไม้</span>
    </div>

    <div v-for="product in products" :key="product.id" class="q-mb-md">
      <q-card class="rounded-borders bg-white shadow-1">
        <q-card-section class="q-pa-md">
          <!-- Product Header Row -->
          <div class="row items-center no-wrap">
            <q-avatar size="64px" class="q-mr-md bg-green-1">
              <q-img :src="product.imageUrl" fit="contain" style="height: 56px; width: 56px;" />
            </q-avatar>
            <div class="col">
              <div class="text-subtitle1 text-weight-bold text-grey-9 leading-tight">
                {{ product.name }}
              </div>
              <div class="text-caption text-primary text-weight-medium q-mt-xs">
                ราคา {{ product.pricePerKg }} บาท / กิโลกรัม
              </div>
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <!-- Case 1: Fixed Bulk Fruit (Integer KG only, Bundle buttons) -->
          <div v-if="product.productType === 'FIXED_WEIGHT'">
            <!-- Bundle Quick Presets -->
            <div v-if="product.bundles && product.bundles.length > 0" class="q-mb-sm">
              <div class="text-caption text-grey-7 q-mb-xs">ชุดโปรโมชันแนะนำ:</div>
              <div class="row items-center">
                <q-btn
                  v-for="bundle in product.bundles"
                  :key="bundle.qtyKg"
                  outline
                  dense
                  rounded
                  no-caps
                  color="secondary"
                  class="q-mr-sm q-mb-xs q-px-sm"
                  :label="bundle.label"
                  @click="selectBundle(product.id, bundle.qtyKg)"
                />
              </div>
            </div>

            <!-- Integer Stepper (Whole KG Only - Nong Aon Ironclad rule) -->
            <div class="row items-center justify-between bg-grey-1 q-pa-sm rounded-borders">
              <div class="text-body2 text-grey-9 text-weight-medium">
                จำนวนที่ต้องการ:
              </div>
              <div class="row items-center">
                <q-btn
                  round
                  dense
                  color="negative"
                  icon="remove"
                  size="sm"
                  :disable="getFixedQty(product.id) <= 0"
                  @click="decrementFixedQty(product.id)"
                />
                <span class="text-subtitle1 text-weight-bolder text-primary q-px-md">
                  {{ getFixedQty(product.id) }} กิโลกรัม
                </span>
                <q-btn
                  round
                  dense
                  color="positive"
                  icon="add"
                  size="sm"
                  @click="incrementFixedQty(product.id)"
                />
              </div>
            </div>

            <!-- Subtotal preview -->
            <div v-if="getFixedQty(product.id) > 0" class="text-right text-caption text-weight-bold text-primary q-mt-xs">
              รวมเป็นเงิน: {{ calculateFixedSubtotal(product, getFixedQty(product.id)) }} บาท
            </div>
          </div>

          <!-- Case 2: Variable Whole Fruit (Durian Size Tiers) -->
          <div v-else-if="product.productType === 'VARIABLE_WHOLE_FRUIT'">
            <div class="text-caption text-grey-7 q-mb-xs">
              เลือกขนาดลูกที่ต้องการจอง:
            </div>

            <!-- Durian Size Tier Options -->
            <div v-for="tier in product.sizeTiers" :key="tier.tierId" class="q-mb-xs">
              <q-item
                tag="label"
                clickable
                v-ripple
                class="rounded-borders bg-grey-1 q-pa-sm"
                :class="{ 'bg-green-1 text-primary text-weight-bold': getSelectedTier(product.id) === tier.tierId }"
              >
                <q-item-section avatar>
                  <q-radio
                    :model-value="getSelectedTier(product.id)"
                    :val="tier.tierId"
                    color="primary"
                    @update:model-value="val => setTierSelection(product.id, val)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-subtitle2">{{ tier.label }}</q-item-label>
                  <q-item-label caption class="text-grey-7">
                    ราคาประมาณ: {{ tier.estimatedPriceMin }} - {{ tier.estimatedPriceMax }} บาท
                  </q-item-label>
                </q-item-section>
              </q-item>
            </div>

            <!-- Clear Durian Selection Button -->
            <div v-if="getSelectedTier(product.id)" class="row justify-end q-mt-xs">
              <q-btn
                flat
                dense
                no-caps
                color="negative"
                icon="close"
                label="ยกเลิกรายการนี้"
                size="sm"
                @click="setTierSelection(product.id, '')"
              />
            </div>

            <!-- Tailgate Notice -->
            <div class="row items-center bg-amber-1 text-orange-10 q-pa-xs rounded-borders q-mt-xs">
              <q-icon name="lightbulb" size="16px" class="q-mr-xs" />
              <span class="text-caption">
                ชั่งน้ำหนักและคิดเงินจริงตอนรับของที่รถ
              </span>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductItem, OrderItem } from '@/types/fruit_app';

const props = defineProps<{
  products: ProductItem[];
  modelValue: OrderItem[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: OrderItem[]): void;
}>();

// Helper to find existing order item for fixed bulk product
function getFixedQty(productId: string): number {
  const item = props.modelValue.find(i => i.productId === productId && i.productType === 'FIXED_WEIGHT');
  return item?.orderedKg || 0;
}

// Increment fixed bulk fruit quantity by 1 full kilogram (Strict Integer)
function incrementFixedQty(productId: string) {
  const prod = props.products.find(p => p.id === productId);
  if (!prod) return;

  const currentQty = getFixedQty(productId);
  updateFixedQty(prod, currentQty + 1);
}

// Decrement fixed bulk fruit quantity
function decrementFixedQty(productId: string) {
  const prod = props.products.find(p => p.id === productId);
  if (!prod) return;

  const currentQty = getFixedQty(productId);
  if (currentQty > 0) {
    updateFixedQty(prod, currentQty - 1);
  }
}

// Select quick bundle (e.g. 3 kg)
function selectBundle(productId: string, qtyKg: number) {
  const prod = props.products.find(p => p.id === productId);
  if (!prod) return;

  updateFixedQty(prod, qtyKg);
}

// Update fixed bulk quantity in parent model
function updateFixedQty(prod: ProductItem, qty: number) {
  const nextList = props.modelValue.filter(i => i.productId !== prod.id);

  if (qty > 0) {
    // Check if matching bundle exists
    const matchingBundle = prod.bundles?.find(b => b.qtyKg === qty);
    const itemFinalPrice = calculateFixedSubtotal(prod, qty);
    nextList.push({
      productId: prod.id,
      productName: prod.name,
      productType: 'FIXED_WEIGHT',
      pricePerKg: prod.pricePerKg,
      orderedKg: qty,
      orderedBundle: matchingBundle?.label,
      itemFinalPrice,
      mascotKey: prod.mascotKey
    });
  }

  emit('update:modelValue', nextList);
}

// Calculate subtotal with bundle pricing support
function calculateFixedSubtotal(product: ProductItem, qty: number): number {
  if (product.bundles) {
    const bundle = product.bundles.find(b => b.qtyKg === qty);
    if (bundle) return bundle.price;
  }
  return qty * product.pricePerKg;
}

// Durian size tier selection helpers
function getSelectedTier(productId: string): string {
  const item = props.modelValue.find(i => i.productId === productId && i.productType === 'VARIABLE_WHOLE_FRUIT');
  return item?.selectedTierId || '';
}

function setTierSelection(productId: string, tierId: string) {
  const prod = props.products.find(p => p.id === productId);
  if (!prod) return;

  const nextList = props.modelValue.filter(i => i.productId !== prod.id);

  if (tierId) {
    const tier = prod.sizeTiers?.find(t => t.tierId === tierId);
    nextList.push({
      productId: prod.id,
      productName: prod.name,
      productType: 'VARIABLE_WHOLE_FRUIT',
      pricePerKg: prod.pricePerKg,
      selectedTierId: tierId,
      selectedTierLabel: tier?.label || '',
      mascotKey: prod.mascotKey
    });
  }

  emit('update:modelValue', nextList);
}
</script>
