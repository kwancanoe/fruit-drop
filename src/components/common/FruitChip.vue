<template>
  <div
    class="m3-fruit-chip inline-flex items-center no-wrap"
    :data-audit-id="`chip-fruit-${name}`"
  >
    <span class="m3-fruit-label">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
// 1-line: Universal Google M3 Fruit Summary Chip with consistent typography and tonal styling
defineProps<{
  name: string;
}>();
</script>

<style scoped lang="scss">
.m3-fruit-chip {
  display: inline-flex;
  align-items: center;
  background: linear-gradient(135deg, #F1F8E9 0%, #DCEDC8 100%);
  color: #1B5E20;
  border: 1px solid rgba(46, 125, 50, 0.32);
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.1px;
  margin-right: 6px;
  margin-bottom: 6px;
  user-select: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;

  .m3-fruit-label {
    white-space: nowrap;
  }
}
</style>
