<template>
  <!-- Section: One-Click Orchard Harvest Summary Sheet for LINE -->
  <q-dialog
    :model-value="isOpen"
    persistent
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="val => $emit('update:isOpen', val)"
  >
    <q-card id="harvest-summary-modal" data-audit-id="harvest-summary-modal" class="rounded-borders bg-white" style="width: 95vw; max-width: 540px;">
      <!-- Header -->
      <q-card-section class="bg-primary text-white row items-center justify-between q-pa-md">
        <div class="row items-center">
          <q-avatar size="36px" class="q-mr-sm bg-white">
            <q-icon name="content_paste" color="primary" />
          </q-avatar>
          <div class="text-subtitle1 text-weight-bolder">
            สรุปยอดตัดผลไม้ส่งสวน (LINE Summary)
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" @click="$emit('update:isOpen', false)" />
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="text-caption text-grey-8 q-mb-sm">
          กดปุ่ม <strong>"คัดลอกข้อความ"</strong> ด้านล่าง แล้วนำไปวางส่งเข้ากลุ่ม LINE ที่บ้านที่สวนได้ทันที:
        </div>

        <!-- Formatted Text Area -->
        <q-input
          :model-value="summaryText"
          type="textarea"
          rows="12"
          readonly
          outlined
          class="font-mono text-body2 bg-grey-1"
        />

        <!-- Copy Command Button -->
        <div class="q-mt-md">
          <q-btn
            color="positive"
            icon="content_copy"
            label="📋 คัดลอกข้อความส่ง LINE"
            class="full-width q-py-sm text-subtitle2 text-weight-bolder shadow-2"
            no-caps
            @click="copyText"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import type { Order, PreorderRound } from '@/types/fruit_app';

const props = defineProps<{
  isOpen: boolean;
  round: PreorderRound | null;
  orders: Order[];
}>();

defineEmits<{
  (e: 'update:isOpen', val: boolean): void;
}>();

const $q = useQuasar();

// Generate structured harvest text
const summaryText = computed<string>(() => {
  const roundTitle = props.round?.title || 'เปิดรอบสวนบ้านเรา';
  const pickupDate = props.round?.pickupDate || 'วันอังคารที่ 8 ก.ย.';
  const pickupLocation = props.round?.pickupLocation || 'ท้ายรถลานจอดรถห้าง';

  // Aggregate stats
  let totalNgoKg = 0;
  let bundle3NgoCount = 0;
  let singleNgoKg = 0;

  let durianSmallCount = 0;
  let durianMediumCount = 0;
  let durianLargeCount = 0;
  let durianOtherCount = 0;

  const otherFruitsMap: Record<string, number> = {};

  for (const o of props.orders) {
    if (o.orderStatus === 'CANCELLED') continue;

    for (const item of o.items) {
      if (item.productType === 'FIXED_WEIGHT') {
        const kg = item.orderedKg || 0;
        if (item.productName.includes('เงาะ')) {
          totalNgoKg += kg;
          if (kg % 3 === 0) {
            bundle3NgoCount += kg / 3;
          } else {
            singleNgoKg += kg;
          }
        } else {
          otherFruitsMap[item.productName] = (otherFruitsMap[item.productName] || 0) + kg;
        }
      } else if (item.productType === 'VARIABLE_WHOLE_FRUIT') {
        if (item.selectedTierId?.includes('SMALL')) {
          durianSmallCount++;
        } else if (item.selectedTierId?.includes('MEDIUM')) {
          durianMediumCount++;
        } else if (item.selectedTierId?.includes('LARGE')) {
          durianLargeCount++;
        } else {
          durianOtherCount++;
        }
      }
    }
  }

  const totalDurians = durianSmallCount + durianMediumCount + durianLargeCount + durianOtherCount;
  const activeOrdersCount = props.orders.filter(o => o.orderStatus !== 'CANCELLED').length;

  let lines = [
    `📋 สรุปยอดตัดผลไม้สวนบ้านเรา`,
    `(${roundTitle} - รอบส่ง: ${pickupDate})`,
    `-----------------------------------`
  ];

  // Rambutan summary
  if (totalNgoKg > 0) {
    lines.push(`🔴 เงาะโรงเรียน: รวมทั้งหมด ${totalNgoKg} กก.`);
    if (bundle3NgoCount > 0) {
      lines.push(`   • ชุดโปร 3 โล 100 : ${bundle3NgoCount} ชุด (${bundle3NgoCount * 3} กก.)`);
    }
    if (singleNgoKg > 0) {
      lines.push(`   • สั่งแยกเดี่ยว     : ${singleNgoKg} กก.`);
    }
  }

  // Durian summary
  if (totalDurians > 0) {
    lines.push(`🟡 ทุเรียนหมอนทอง: รวมทั้งหมด ${totalDurians} ลูก`);
    if (durianSmallCount > 0) lines.push(`   • ไซส์เล็ก (ไม่เกิน 2 โล) : ${durianSmallCount} ลูก`);
    if (durianMediumCount > 0) lines.push(`   • ไซส์กลาง (2.1 - 3 โล) : ${durianMediumCount} ลูก`);
    if (durianLargeCount > 0) lines.push(`   • ไซส์ใหญ่ (3.1 - 4 โล) : ${durianLargeCount} ลูก`);
  }

  // Other fruits
  for (const [fruitName, kg] of Object.entries(otherFruitsMap)) {
    lines.push(`🟢 ${fruitName}: ${kg} กก.`);
  }

  lines.push(`-----------------------------------`);
  lines.push(`จำนวนลูกค้าทั้งหมด: ${activeOrdersCount} คน`);
  lines.push(`จุดนัดรับ: ${pickupLocation}`);
  lines.push(`เริ่มจ่ายของ: 19:00 น. เป็นต้นไป`);

  return lines.join('\n');
});

function copyText() {
  void navigator.clipboard.writeText(summaryText.value);
  $q.notify({
    type: 'positive',
    message: 'คัดลอกข้อความสรุปยอดส่ง LINE เรียบร้อยแล้ว!',
    position: 'top',
    timeout: 2000
  });
}
</script>
