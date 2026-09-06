<template>
  <div
    class="m3-status-badge inline-flex items-center no-wrap"
    :class="[config.bgGradientClass, config.textColorClass, config.borderColorClass, dense ? 'dense' : '']"
    :data-audit-id="`badge-order-status-${config.key.toLowerCase()}`"
  >
    <q-icon :name="config.icon" size="14px" class="q-mr-xs" />
    <span class="m3-badge-label">{{ config.label }}</span>
  </div>
</template>

<script setup lang="ts">
// 1-line: Universal Google M3 Order Status Badge with Tonal Gradient & Micro-border
import { computed } from 'vue';
import type { Order } from '@/types/fruit_app';
import { getOrderStatusConfig, ORDER_STATUS_CONFIGS, type StatusVisualConfig } from '@/constants/status';

const props = withDefaults(
  defineProps<{
    order?: Order | null;
    statusKey?: string;
    dense?: boolean;
  }>(),
  {
    order: null,
    statusKey: '',
    dense: false
  }
);

const config = computed<StatusVisualConfig>(() => {
  if (props.order) {
    return getOrderStatusConfig(props.order);
  }
  if (props.statusKey && ORDER_STATUS_CONFIGS[props.statusKey]) {
    return ORDER_STATUS_CONFIGS[props.statusKey]!;
  }
  return ORDER_STATUS_CONFIGS.WAITING_PICKUP!;
});
</script>

<style scoped lang="scss">
.m3-status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1.2;
  border-width: 1px;
  border-style: solid;
  user-select: none;
  transition: all 0.2s ease;

  &.dense {
    padding: 2px 8px;
    font-size: 11px;
  }

  .m3-badge-label {
    white-space: nowrap;
  }
}
</style>
