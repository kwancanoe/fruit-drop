<template>
  <!-- Section: Admin Round Management & Batch Creation Modal -->
  <q-dialog
    :model-value="isOpen"
    persistent
    transition-show="jump-up"
    transition-hide="jump-down"
    @update:model-value="val => $emit('update:isOpen', val)"
  >
    <q-card id="round-management-modal" data-audit-id="round-management-modal" class="rounded-borders bg-white" style="width: 95vw; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column;">
      <!-- Header -->
      <q-card-section class="bg-dark text-white row items-center justify-between q-pa-md">
        <div class="row items-center">
          <q-avatar size="36px" class="q-mr-sm bg-positive">
            <q-icon name="event_available" color="white" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bolder">
              จัดการรอบการจองผลไม้ (Round Management)
            </div>
            <div class="text-caption text-grey-4">
              สร้างรอบใหม่ เลือกผลไม้ กำหนดราคา และเปิด/ปิดการจอง
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" color="white" @click="$emit('update:isOpen', false)" />
      </q-card-section>

      <!-- Tab Navigation -->
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="list" icon="list" label="รอบทั้งหมด" />
        <q-tab name="create" icon="add_circle" label="เปิดรอบจองใหม่" />
      </q-tabs>

      <q-separator />

      <!-- Tab Panels Container -->
      <q-card-section class="q-pa-md scroll col">
        <!-- Tab 1: Rounds List -->
        <div v-if="activeTab === 'list'">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle2 text-weight-bold text-grey-9">
              รายการรอบในระบบ ({{ fruitStore.allRounds.length }} รอบ)
            </div>
            <q-btn
              color="positive"
              icon="add"
              label="เปิดรอบใหม่"
              size="sm"
              no-caps
              class="q-px-sm text-weight-bold"
              @click="activeTab = 'create'"
            />
          </div>

          <div v-if="fruitStore.allRounds.length === 0" class="text-center q-pa-lg text-grey-6">
            <q-icon name="event_busy" size="48px" class="q-mb-xs" />
            <div>ยังไม่มีรอบการจองในระบบ</div>
            <div class="text-caption text-grey-5">กดปุ่ม 'เปิดรอบใหม่' เพื่อสร้างรอบแรก</div>
          </div>

          <q-list v-else separator class="bg-grey-1 rounded-borders">
            <q-item v-for="round in fruitStore.allRounds" :key="round.roundId" class="q-py-md">
              <q-item-section>
                <div class="row items-center q-mb-xs">
                  <span class="text-subtitle2 text-weight-bolder text-grey-9 q-mr-sm">
                    {{ round.title }}
                  </span>
                  <q-badge
                    :color="round.isOpen ? 'positive' : 'grey-6'"
                    class="text-weight-bold"
                    rounded
                  >
                    {{ round.isOpen ? '🟢 เปิดรับจอง' : '⚪ ปิดรับจอง' }}
                  </q-badge>
                </div>

                <div class="text-caption text-grey-8 row items-center q-mb-xs">
                  <q-icon name="event" size="14px" class="q-mr-xs text-primary" />
                  <span class="text-weight-medium q-mr-md">{{ round.pickupDate }}</span>
                  <q-icon name="place" size="14px" class="q-mr-xs text-primary" />
                  <span>{{ round.pickupLocation }}</span>
                </div>

                <!-- Fruit Summary Chips -->
                <div v-if="round.fruitSummary && round.fruitSummary.length > 0" class="row items-center q-mt-xs">
                  <q-chip
                    v-for="fruit in round.fruitSummary"
                    :key="fruit"
                    dense
                    size="sm"
                    color="green-1"
                    text-color="primary"
                    class="text-weight-bold q-mr-xs q-mb-none"
                  >
                    {{ fruit }}
                  </q-chip>
                </div>
              </q-item-section>

              <q-item-section side class="column items-end">
                <!-- Toggle Open/Close Switch -->
                <q-toggle
                  :model-value="round.isOpen"
                  color="positive"
                  dense
                  label="เปิดจอง"
                  left-label
                  class="text-caption text-weight-bold q-mb-xs"
                  @update:model-value="val => handleToggleStatus(round.roundId, val)"
                />

                <!-- Select Active Button -->
                <q-btn
                  outline
                  size="sm"
                  dense
                  no-caps
                  :color="fruitStore.activeRoundId === round.roundId ? 'primary' : 'grey-7'"
                  :icon="fruitStore.activeRoundId === round.roundId ? 'check_circle' : 'visibility'"
                  :label="fruitStore.activeRoundId === round.roundId ? 'เลือกใช้งานอยู่' : 'เลือกดูออเดอร์'"
                  class="q-px-xs"
                  @click="handleSelectActive(round)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Tab 2: Create New Round Form -->
        <div v-else-if="activeTab === 'create'">
          <!-- Round Details -->
          <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm">
            1. ข้อมูลรอบนัดส่งมอบ
          </div>

          <div class="q-mb-sm">
            <q-input
              v-model="newRoundForm.title"
              outlined
              dense
              label="ชื่องาน / รอบการส่ง *"
              placeholder="เช่น รอบส่งท้ายรถ วันอังคาร 8 ก.ย."
              :rules="[val => !!val && val.trim().length > 0 || 'กรุณาระบุชื่อรอบ']"
            />
          </div>

          <div class="row q-mb-sm">
            <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
              <q-input
                v-model="newRoundForm.pickupDate"
                outlined
                dense
                label="วันที่นัดรับของ *"
                placeholder="เช่น วันอังคารที่ 8 กันยายน 2569"
                :rules="[val => !!val && val.trim().length > 0 || 'กรุณาระบุวันที่']"
              >
                <template #prepend>
                  <q-icon name="event" color="primary" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6 q-pl-sm-xs">
              <q-input
                v-model="newRoundForm.pickupLocation"
                outlined
                dense
                label="จุดนัดรับของ *"
                placeholder="เช่น ท้ายรถลานจอดรถ เสา B12 ชั้น 1B"
                :rules="[val => !!val && val.trim().length > 0 || 'กรุณาระบุจุดนัดรับ']"
              >
                <template #prepend>
                  <q-icon name="place" color="primary" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- Payment & Bank Details -->
          <div class="row q-mb-sm">
            <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
              <q-input
                v-model="newRoundForm.promptPayNumber"
                outlined
                dense
                label="เบอร์พร้อมเพย์รับเงิน *"
                placeholder="0878902935"
              >
                <template #prepend>
                  <q-icon name="payments" color="primary" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6 q-pl-sm-xs">
              <q-input
                v-model="newRoundForm.promptPayName"
                outlined
                dense
                label="ชื่อบัญชีรับเงิน *"
                placeholder="นาตยา บุญณะ"
              >
                <template #prepend>
                  <q-icon name="account_circle" color="primary" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="row q-mb-md">
            <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
              <q-input
                v-model="newRoundForm.bankName"
                outlined
                dense
                label="ธนาคารรับโอน"
                placeholder="KBANK (กสิกรไทย)"
              >
                <template #prepend>
                  <q-icon name="account_balance" color="primary" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6 q-pl-sm-xs">
              <q-input
                v-model="newRoundForm.bankAccountNumber"
                outlined
                dense
                label="เลขที่บัญชีธนาคาร"
                placeholder="8172235408"
              >
                <template #prepend>
                  <q-icon name="credit_card" color="primary" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- Fruit Selection & Quotas Checklist -->
          <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-xs">
            2. เลือกผลไม้ที่จะเปิดขายในรอบนี้
          </div>
          <div class="text-caption text-grey-7 q-mb-sm">
            ติ๊กเลือกผลไม้ที่ต้องการนำมาขาย พร้อมตั้งราคาต่อ กก. และโควต้า
          </div>

          <div class="bg-grey-1 q-pa-sm rounded-borders q-mb-md">
            <div
              v-for="fruit in newRoundForm.fruits"
              :key="fruit.fruitKey"
              class="bg-white q-pa-sm rounded-borders q-mb-sm shadow-1 row items-center justify-between"
            >
              <!-- Toggle Checkbox & Fruit Info -->
              <div class="row items-center col-12 col-sm-5">
                <q-checkbox
                  v-model="fruit.isEnabled"
                  color="positive"
                  dense
                  class="q-mr-sm"
                />
                <q-avatar size="38px" class="q-mr-sm bg-green-1">
                  <q-img :src="`/mascots/mascot_${fruit.fruitKey}.png`" fit="contain" />
                </q-avatar>
                <div>
                  <div class="text-subtitle2 text-weight-bold leading-tight" :class="{ 'text-grey-5': !fruit.isEnabled }">
                    {{ fruit.name }}
                  </div>
                  <div class="text-caption text-grey-6" style="font-size: 11px;">
                    {{ fruit.productType === 'VARIABLE_WHOLE_FRUIT' ? 'ชั่งน้ำหนักตามลูก' : 'ขายยกกิโล' }}
                  </div>
                </div>
              </div>

              <!-- Price & Quota Inputs -->
              <div class="row items-center col-12 col-sm-7 justify-end q-mt-xs q-mt-sm-none">
                <div class="row items-center q-mr-sm">
                  <span class="text-caption text-grey-8 q-mr-xs">ราคา/กก.:</span>
                  <q-input
                    v-model.number="fruit.pricePerKg"
                    type="number"
                    outlined
                    dense
                    style="width: 80px;"
                    :disable="!fruit.isEnabled"
                    suffix="บ."
                  />
                </div>
                <div class="row items-center">
                  <span class="text-caption text-grey-8 q-mr-xs">เตรียมมา:</span>
                  <q-input
                    v-model.number="fruit.totalQuotaKg"
                    type="number"
                    outlined
                    dense
                    style="width: 85px;"
                    :disable="!fruit.isEnabled"
                    suffix="กก."
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Command Action Button -->
          <div class="row items-center justify-end">
            <q-btn
              flat
              label="ยกเลิก"
              color="grey-7"
              no-caps
              class="q-mr-sm"
              @click="activeTab = 'list'"
            />
            <q-btn
              color="positive"
              icon="rocket_launch"
              label="บันทึกและเปิดรับจองทันที"
              no-caps
              class="q-px-md text-weight-bold shadow-2"
              :loading="fruitStore.isLoading"
              :disable="!isFormValid"
              @click="handleCreateRound"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { PreorderRound, RoundCreationFruitConfig } from '@/types/fruit_app';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
}>();

const $q = useQuasar();
const fruitStore = useFruitStore();
const activeTab = ref<'list' | 'create'>('list');

// Initial default fruit configs
function getInitialFruitConfigs(): RoundCreationFruitConfig[] {
  return [
    {
      fruitKey: 'ngo',
      name: 'เงาะโรงเรียน',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      costPerKg: 20,
      totalQuotaKg: 200,
      isEnabled: true
    },
    {
      fruitKey: 'thurian',
      name: 'ทุเรียนหมอนทอง',
      productType: 'VARIABLE_WHOLE_FRUIT',
      pricePerKg: 160,
      costPerKg: 110,
      totalQuotaKg: 150,
      isEnabled: true
    },
    {
      fruitKey: 'mangkut',
      name: 'มังคุด',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 50,
      costPerKg: 30,
      totalQuotaKg: 100,
      isEnabled: false
    },
    {
      fruitKey: 'longkong',
      name: 'ลองกอง',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 45,
      costPerKg: 25,
      totalQuotaKg: 80,
      isEnabled: false
    },
    {
      fruitKey: 'langsat',
      name: 'ลางสาด',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 40,
      costPerKg: 20,
      totalQuotaKg: 60,
      isEnabled: false
    },
    {
      fruitKey: 'som',
      name: 'ส้มสายน้ำผึ้ง',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 60,
      costPerKg: 35,
      totalQuotaKg: 80,
      isEnabled: false
    },
    {
      fruitKey: 'mamuang',
      name: 'มะม่วงน้ำดอกไม้',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 50,
      costPerKg: 30,
      totalQuotaKg: 80,
      isEnabled: false
    }
  ];
}

const newRoundForm = ref({
  title: 'รอบส่งผลไม้ วันอังคาร 8 ก.ย.',
  pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
  pickupLocation: 'ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B',
  pickupSlots: ['19:00 - 19:30', '19:30 - 20:00', '20:00 - 20:30', '21:00+ (หลังห้างปิด)'],
  promptPayNumber: '0878902935',
  promptPayName: 'นาตยา บุญณะ',
  bankName: 'KBANK (กสิกรไทย)',
  bankAccountNumber: '8172235408',
  fruits: getInitialFruitConfigs()
});

const isFormValid = computed<boolean>(() => {
  const hasTitle = !!newRoundForm.value.title.trim();
  const hasDate = !!newRoundForm.value.pickupDate.trim();
  const hasLocation = !!newRoundForm.value.pickupLocation.trim();
  const hasAtLeastOneFruit = newRoundForm.value.fruits.some(f => f.isEnabled && f.pricePerKg > 0);
  return hasTitle && hasDate && hasLocation && hasAtLeastOneFruit;
});

// Toggle open/closed status
async function handleToggleStatus(roundId: string, isOpen: boolean) {
  try {
    await fruitStore.toggleRoundStatus(roundId, isOpen);
    $q.notify({
      type: 'positive',
      message: isOpen ? 'เปิดรับจองรอบนี้แล้ว' : 'ปิดรับจองรอบนี้แล้ว',
      position: 'top',
      timeout: 1500
    });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'ไม่สามารถเปลี่ยนสถานะได้' });
  }
}

// Select active round for tailgate desk
function handleSelectActive(round: PreorderRound) {
  fruitStore.selectActiveRound(round);
  $q.notify({
    type: 'info',
    message: `เลือก '${round.title}' เป็นรอบปัจจุบันแล้ว`,
    position: 'top',
    timeout: 1500
  });
}

// Create new round
async function handleCreateRound() {
  if (!isFormValid.value) return;

  try {
    const roundId = await fruitStore.createRound({
      title: newRoundForm.value.title.trim(),
      pickupDate: newRoundForm.value.pickupDate.trim(),
      pickupLocation: newRoundForm.value.pickupLocation.trim(),
      pickupSlots: newRoundForm.value.pickupSlots,
      promptPayNumber: newRoundForm.value.promptPayNumber.trim(),
      promptPayName: newRoundForm.value.promptPayName.trim(),
      bankName: newRoundForm.value.bankName.trim(),
      bankAccountNumber: newRoundForm.value.bankAccountNumber.trim(),
      bankAccountName: newRoundForm.value.promptPayName.trim(),
      fruits: newRoundForm.value.fruits
    });

    $q.notify({
      type: 'positive',
      message: `สร้างและเปิดรอบจอง #${roundId} สำเร็จแล้ว!`,
      position: 'top',
      timeout: 2000
    });

    // Reset fruit configs and switch to list
    newRoundForm.value.fruits = getInitialFruitConfigs();
    activeTab.value = 'list';
  } catch (err) {
    console.error('Error creating round:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการสร้างรอบ' });
  }
}
</script>
