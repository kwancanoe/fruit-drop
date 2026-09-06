<template>
  <!-- Section: Fruit Mascot Avatar with Name Label Underneath -->
  <div
    class="column items-center fruit-mascot-avatar-item"
    :data-audit-id="`fruit-avatar-${name}`"
    style="width: 66px;"
  >
    <!-- Avatar circle featuring authentic 2.5D mascot illustration -->
    <q-avatar
      :size="size"
      class="fruit-avatar-circle shadow-1 q-mb-xs"
    >
      <q-img
        :src="mascotUrl"
        fit="contain"
        class="full-width full-height"
        loading="lazy"
        :alt="name"
      >
        <template #error>
          <div class="absolute-full flex flex-center bg-grey-2 text-grey-6 text-caption text-weight-bold">
            {{ name.slice(0, 2) }}
          </div>
        </template>
      </q-img>
    </q-avatar>

    <!-- Fruit Name Label Underneath -->
    <div
      class="fruit-avatar-label text-caption text-weight-bold text-grey-9 text-center leading-tight"
    >
      {{ name }}
    </div>
  </div>
</template>

<script setup lang="ts">
// 1-line: Fruit mascot avatar display component with authentic 2.5D character and bottom label
import { computed } from 'vue';
import { getFruitMascotUrl } from '@/utils/fruitMascots';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: string;
    imageUrl?: string;
  }>(),
  {
    size: '54px'
  }
);

// Resolve mascot transparent PNG image based on fruit name or custom image
const mascotUrl = computed(() => getFruitMascotUrl(props.name, props.imageUrl));
</script>

<style scoped lang="scss">
.fruit-mascot-avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.96);
  }
}

.fruit-avatar-circle {
  background: #ffffff;
  border: 1.5px solid rgba(46, 125, 50, 0.18);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.fruit-avatar-label {
  font-size: 11px;
  line-height: 1.25;
  word-break: break-word;
  max-width: 66px;
  min-height: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
</style>
