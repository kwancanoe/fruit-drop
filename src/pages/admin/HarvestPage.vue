<template>
  <!-- Section: Full-Page Orchard Harvest Logistics Summary for LINE -->
  <q-page id="admin-harvest-page" data-audit-id="admin-harvest-page" class="q-pa-md bg-grey-10 text-white" style="max-width: 680px; margin: 0 auto;">
    <!-- Page Header with Back Navigation -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn
          flat
          dense
          round
          icon="arrow_back"
          color="white"
          class="q-mr-sm"
          data-audit-id="btn-back-to-dispatch"
          @click="handleBack"
        >
          <q-tooltip>กลับโต๊ะจ่ายของท้ายรถ</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight">
            สรุปยอดตัดผลไม้ส่งสวน
          </div>
          <div class="text-caption text-grey-4">
            รวบรวมยอดสั่งจองส่งกลุ่ม LINE ที่บ้านที่สวนเพื่อเตรียมตัดผลไม้
          </div>
        </div>
      </div>
    </div>

    <!-- Round Selector Dropdown -->
    <q-card class="bg-grey-9 text-white q-pa-sm rounded-borders q-mb-md shadow-2">
      <q-select
        v-model="selectedRoundId"
        :options="roundOptions"
        emit-value
        map-options
        dark
        outlined
        dense
        label="เลือกรอบส่งที่ต้องการสรุปยอด"
        data-audit-id="select-harvest-round"
      >
        <template #prepend>
          <q-icon name="event_note" color="positive" size="18px" />
        </template>
      </q-select>
    </q-card>

    <!-- Visual Summary Cards -->
    <div class="row q-mb-md">
      <!-- Rambutan Summary Card -->
      <div v-if="harvestStats.totalNgoKg > 0" class="col-12 col-sm-6 q-pa-xs">
        <q-card class="bg-grey-9 text-white q-pa-md rounded-borders shadow-2">
          <div class="row items-center q-mb-xs">
            <q-avatar size="32px" class="q-mr-sm bg-grey-8">
              <q-img src="/mascots/mascot_ngo.png" fit="contain" />
            </q-avatar>
            <div>
              <div class="text-subtitle2 text-weight-bold">เงาะโรงเรียน</div>
              <div class="text-h6 text-weight-bolder text-positive">
                {{ harvestStats.totalNgoKg }} กก.
              </div>
            </div>
          </div>
          <div class="text-caption text-grey-4 q-mt-xs border-top-grey q-pt-xs">
            • ชุด 3 โล 100: <strong>{{ harvestStats.bundle3NgoCount }} ชุด</strong> ({{ harvestStats.bundle3NgoCount * 3 }} กก.)<br>
            • สั่งเดี่ยว: <strong>{{ harvestStats.singleNgoKg }} กก.</strong>
          </div>
        </q-card>
      </div>

      <!-- Durian Summary Card -->
      <div v-if="harvestStats.totalDurians > 0" class="col-12 col-sm-6 q-pa-xs">
        <q-card class="bg-grey-9 text-white q-pa-md rounded-borders shadow-2">
          <div class="row items-center q-mb-xs">
            <q-avatar size="32px" class="q-mr-sm bg-grey-8">
              <q-img src="/mascots/mascot_thurian.png" fit="contain" />
            </q-avatar>
            <div>
              <div class="text-subtitle2 text-weight-bold">ทุเรียนหมอนทอง</div>
              <div class="text-h6 text-weight-bolder text-warning">
                {{ harvestStats.totalDurians }} ลูก
              </div>
            </div>
          </div>
          <div class="text-caption text-grey-4 q-mt-xs border-top-grey q-pt-xs">
            • เล็ก (≤ 2.0 กก.): <strong>{{ harvestStats.durianSmallCount }} ลูก</strong><br>
            • กลาง (2.1-3.0 กก.): <strong>{{ harvestStats.durianMediumCount }} ลูก</strong><br>
            • ใหญ่ (3.1-4.0 กก.): <strong>{{ harvestStats.durianLargeCount }} ลูก</strong>
          </div>
        </q-card>
      </div>
    </div>

    <!-- Ready-to-copy LINE Message Card -->
    <q-card class="bg-grey-9 text-white q-pa-md rounded-borders shadow-2 q-mb-xl">
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle1 text-weight-bolder text-positive row items-center">
          <q-icon name="chat" size="20px" class="q-mr-xs" />
          ข้อความเตรียมส่ง LINE
        </div>
        <div class="text-caption text-grey-4">
          ลูกค้า {{ activeOrdersCount }} คน
        </div>
      </div>

      <!-- Formatted Readonly Textarea -->
      <q-input
        :model-value="summaryText"
        type="textarea"
        rows="12"
        readonly
        dark
        outlined
        class="font-mono text-body2 bg-grey-10 q-mb-md"
        data-audit-id="textarea-harvest-summary"
      />

      <!-- Copy Action Button -->
      <q-btn
        color="positive"
        icon="content_copy"
        label="📋 คัดลอกข้อความส่ง LINE"
        class="full-width q-py-sm text-subtitle2 text-weight-bolder shadow-2"
        no-caps
        data-audit-id="btn-copy-line-text"
        @click="copyText"
      />
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
// Full-page Orchard Harvest Logistics Summary for communicating harvest orders to the orchard via LINE
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';

const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();

// Selected Round ID (defaults to active round)
const selectedRoundId = ref<string>(fruitStore.activeRoundId);

// Back navigation handler
function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin');
  }
}

// Round selector options
const roundOptions = computed(() => {
  return fruitStore.allRounds.map(r => ({
    label: `${r.title} (${r.pickupDate})`,
    value: r.roundId
  }));
});

// Current selected round
const currentRound = computed(() => {
  return fruitStore.allRounds.find(r => r.roundId === selectedRoundId.value) || fruitStore.activeRound;
});

// Orders belonging to selected round
const targetOrders = computed(() => {
  return fruitStore.orders.filter(o => o.roundId === selectedRoundId.value);
});

// Active non-cancelled orders count
const activeOrdersCount = computed<number>(() => {
  return targetOrders.value.filter(o => o.orderStatus !== 'CANCELLED').length;
});

// Harvest aggregation calculations
const harvestStats = computed(() => {
  let totalNgoKg = 0;
  let bundle3NgoCount = 0;
  let singleNgoKg = 0;

  let durianSmallCount = 0;
  let durianMediumCount = 0;
  let durianLargeCount = 0;
  let durianOtherCount = 0;

  const otherFruitsMap: Record<string, number> = {};

  for (const o of targetOrders.value) {
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

  return {
    totalNgoKg,
    bundle3NgoCount,
    singleNgoKg,
    totalDurians,
    durianSmallCount,
    durianMediumCount,
    durianLargeCount,
    durianOtherCount,
    otherFruitsMap
  };
});

// Formatted summary text for LINE
const summaryText = computed<string>(() => {
  const roundTitle = currentRound.value?.title || 'รอบส่งผลไม้ Fruit Drop';
  const pickupDate = currentRound.value?.pickupDate || 'วันอังคารที่ 8 ก.ย.';
  const pickupLocation = currentRound.value?.pickupLocation || 'ท้ายรถลานจอดรถห้าง';

  const stats = harvestStats.value;

  const lines = [
    `📋 สรุปยอดผลไม้ Fruit Drop`,
    `(${roundTitle} - รอบส่ง: ${pickupDate})`,
    `-----------------------------------`
  ];

  // Rambutan
  if (stats.totalNgoKg > 0) {
    lines.push(`🔴 เงาะโรงเรียน: รวมทั้งหมด ${stats.totalNgoKg} กก.`);
    if (stats.bundle3NgoCount > 0) {
      lines.push(`   • ชุดโปร 3 โล 100 : ${stats.bundle3NgoCount} ชุด (${stats.bundle3NgoCount * 3} กก.)`);
    }
    if (stats.singleNgoKg > 0) {
      lines.push(`   • สั่งแยกเดี่ยว     : ${stats.singleNgoKg} กก.`);
    }
  }

  // Durian
  if (stats.totalDurians > 0) {
    lines.push(`🟡 ทุเรียนหมอนทอง: รวมทั้งหมด ${stats.totalDurians} ลูก`);
    if (stats.durianSmallCount > 0) lines.push(`   • ไซส์เล็ก (ไม่เกิน 2 โล) : ${stats.durianSmallCount} ลูก`);
    if (stats.durianMediumCount > 0) lines.push(`   • ไซส์กลาง (2.1 - 3 โล) : ${stats.durianMediumCount} ลูก`);
    if (stats.durianLargeCount > 0) lines.push(`   • ไซส์ใหญ่ (3.1 - 4 โล) : ${stats.durianLargeCount} ลูก`);
  }

  // Other fruits
  for (const [fruitName, kg] of Object.entries(stats.otherFruitsMap)) {
    lines.push(`🟢 ${fruitName}: ${kg} กก.`);
  }

  lines.push(`-----------------------------------`);
  lines.push(`จำนวนลูกค้าทั้งหมด: ${activeOrdersCount.value} คน`);
  lines.push(`จุดนัดรับ: ${pickupLocation}`);
  lines.push(`เริ่มจ่ายของ: 19:00 น. เป็นต้นไป`);

  return lines.join('\n');
});

// Copy text handler
async function copyText() {
  try {
    await navigator.clipboard.writeText(summaryText.value);
    $q.notify({
      type: 'positive',
      message: 'คัดลอกข้อความสรุปยอดเรียบร้อยแล้ว! นำไปวางใน LINE ได้ทันที',
      position: 'top',
      icon: 'content_paste',
      timeout: 2000
    });
  } catch (err) {
    $q.notify({
      type: 'warning',
      message: 'ไม่สามารถคัดลอกได้อัตโนมัติ กรุณาไฮไลต์ข้อความเพื่อคัดลอก',
      position: 'top'
    });
  }
}
</script>

<style scoped>
.border-top-grey {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
