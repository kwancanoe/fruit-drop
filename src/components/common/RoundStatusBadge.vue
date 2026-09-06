<template>
  <div
    class="m3-round-badge inline-flex items-center no-wrap"
    :class="[config.bgGradientClass, config.textColorClass, config.borderColorClass, dense ? 'dense' : '']"
    :data-audit-id="`badge-round-status-${isOpen ? 'open' : 'closed'}`"
  >
    <q-icon :name="config.icon" size="14px" class="q-mr-xs" />
    <span class="m3-badge-label">{{ config.label }}</span>
  </div>
</template>

<script setup lang="ts">
// 1-line: Universal Google M3 Round Status Badge using Material Icons instead of emojis
import { computed } from 'vue';
import { getRoundStatusConfig, type StatusVisualConfig } from '@/constants/status';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    dense?: boolean;
  }>(),
  {
    isOpen: false,
    dense: false
  }
);

const config = computed<StatusVisualConfig>(() => getRoundStatusConfig(props.isOpen));
</script>

<style scoped lang="scss">
.m3-round-badge {
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
