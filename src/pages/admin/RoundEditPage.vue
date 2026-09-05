<template>
  <!-- Section: Full-Page Round Creation & Edit Form (Light Theme with Interactive Date & Slot Pickers) -->
  <q-page id="admin-round-edit-page" data-audit-id="admin-round-edit-page" class="q-pa-md bg-grey-1 text-grey-9" style="max-width: 680px; margin: 0 auto; padding-bottom: 84px;">
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
          data-audit-id="btn-back-to-rounds"
          @click="handleBack"
        >
          <q-tooltip>กลับหน้ารายการรอบ</q-tooltip>
        </q-btn>
        <div>
          <div class="text-h6 text-weight-bolder leading-tight text-grey-9">
            {{ isEditMode ? 'แก้ไขข้อมูลรอบการจอง' : 'เปิดรอบการจองใหม่' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ isEditMode ? `รหัสรอบ: #${roundId}` : 'กำหนดข้อมูลจุดนัดรับ บัญชีรับเงิน และราคา/ต้นทุนผลไม้' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="text-center q-pa-xl text-grey-7">
      <q-spinner-dots color="positive" size="40px" />
      <div class="q-mt-sm">กำลังโหลดข้อมูลรอบ...</div>
    </div>

    <!-- Form Container -->
    <q-form v-else @submit.prevent="handleSubmit">
      <!-- Card 1: Round Logistics & Schedule -->
      <q-card class="bg-white text-grey-9 q-pa-md rounded-borders q-mb-md shadow-1">
        <div class="text-subtitle1 text-weight-bolder text-positive q-mb-sm row items-center">
          <q-icon name="schedule" size="20px" class="q-mr-xs" />
          1. ข้อมูลรอบนัดส่งมอบ
        </div>

        <!-- Round Title -->
        <div class="q-mb-sm">
          <q-input
            v-model="form.title"
            outlined
            dense
            label="ชื่องาน / รอบการส่ง *"
            placeholder="เช่น รอบส่งท้ายรถ วันอังคาร 8 ก.ย."
            :rules="[val => !!val && val.trim().length > 0 || 'กรุณาระบุชื่อรอบ']"
            data-audit-id="input-round-title"
          />
        </div>

        <!-- Requirement 4: Interactive Date Picker with Quick Presets -->
        <div class="q-mb-sm">
          <div class="text-caption text-grey-8 q-mb-xs text-weight-bold">
            วันที่นัดรับของ * (เลือกจากปฏิทินหรือปุ่มด่วน):
          </div>

          <!-- Quick Preset Chips -->
          <div class="row items-center q-mb-xs">
            <q-chip
              clickable
              dense
              outline
              color="primary"
              icon="today"
              label="วันนี้"
              class="q-mr-xs q-mb-xs text-weight-bold"
              @click="applyDatePreset(0)"
            />
            <q-chip
              clickable
              dense
              outline
              color="primary"
              icon="event"
              label="พรุ่งนี้"
              class="q-mr-xs q-mb-xs text-weight-bold"
              @click="applyDatePreset(1)"
            />
            <q-chip
              clickable
              dense
              outline
              color="primary"
              icon="date_range"
              label="วันอังคารหน้า"
              class="q-mr-xs q-mb-xs text-weight-bold"
              @click="applyNextWeekdayPreset(2)"
            />
            <q-chip
              clickable
              dense
              outline
              color="primary"
              icon="date_range"
              label="วันศุกร์หน้า"
              class="q-mr-xs q-mb-xs text-weight-bold"
              @click="applyNextWeekdayPreset(5)"
            />
          </div>

          <!-- Date Input with Calendar Popup -->
          <q-input
            v-model="form.pickupDate"
            outlined
            dense
            readonly
            label="วันที่นัดรับของ *"
            placeholder="แตะเพื่อเลือกวันที่จากปฏิทิน"
            :rules="[val => !!val && val.trim().length > 0 || 'กรุณาเลือกวันที่']"
            data-audit-id="input-round-date"
            class="cursor-pointer"
          >
            <template #prepend>
              <q-icon name="event" color="positive" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="calendarDate"
                    mask="YYYY/MM/DD"
                    color="positive"
                    today-btn
                    @update:model-value="onCalendarDatePicked"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="ตกลง" color="positive" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
            <template #append>
              <q-btn flat dense round icon="calendar_month" color="positive">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="calendarDate"
                    mask="YYYY/MM/DD"
                    color="positive"
                    today-btn
                    @update:model-value="onCalendarDatePicked"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="ตกลง" color="positive" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-btn>
            </template>
          </q-input>
        </div>

        <!-- Pickup Location -->
        <div class="q-mb-sm">
          <q-input
            v-model="form.pickupLocation"
            outlined
            dense
            label="จุดนัดรับของ *"
            placeholder="เช่น ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B"
            :rules="[val => !!val && val.trim().length > 0 || 'กรุณาระบุจุดนัดรับ']"
            data-audit-id="input-round-location"
          >
            <template #prepend>
              <q-icon name="place" color="positive" />
            </template>
          </q-input>
        </div>

        <!-- Requirement 4: Interactive Pickup Slots Selection -->
        <div class="q-mb-sm">
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-grey-8 text-weight-bold">
              ช่วงเวลานัดรับของ * (แตะเพื่อเลือก/ยกเลิก):
            </span>
            <span class="text-caption text-positive text-weight-bold">
              เลือกไว้ {{ form.pickupSlots.length }} ช่วงเวลา
            </span>
          </div>

          <!-- Standard Preset Slot Toggles -->
          <div class="row items-center q-mb-sm">
            <q-chip
              v-for="slot in PRESET_SLOTS"
              :key="slot"
              clickable
              :color="isSlotSelected(slot) ? 'positive' : 'grey-2'"
              :text-color="isSlotSelected(slot) ? 'white' : 'grey-9'"
              :icon="isSlotSelected(slot) ? 'check' : 'schedule'"
              class="q-mr-xs q-mb-xs text-weight-bold"
              :data-audit-id="`slot-chip-${slot}`"
              @click="toggleSlot(slot)"
            >
              {{ slot }}
            </q-chip>
          </div>

          <!-- Custom Slot Add Input -->
          <div class="row items-center q-mb-xs">
            <div class="col-8 col-sm-9 q-pr-xs">
              <q-input
                v-model="customSlotInput"
                outlined
                dense
                placeholder="เช่น 12:00 - 13:00 (รอบเที่ยง)"
                label="เพิ่มช่วงเวลาอื่นที่ไม่มีในตัวเลือก"
                @keyup.enter="addCustomSlot"
              />
            </div>
            <div class="col-4 col-sm-3 q-pl-xs">
              <q-btn
                outline
                color="positive"
                icon="add"
                label="เพิ่มรอบ"
                class="full-width q-py-xs text-weight-bold"
                no-caps
                @click="addCustomSlot"
              />
            </div>
          </div>
        </div>

        <!-- Open / Closed Status Toggle -->
        <div class="row items-center justify-between q-mt-md bg-grey-1 q-pa-sm rounded-borders">
          <div class="text-caption text-grey-9">
            สถานะรอบ: <strong :class="form.isOpen ? 'text-positive' : 'text-grey-6'">{{ form.isOpen ? '🟢 เปิดรับจองออนไลน์' : '⚪ ปิดรับจองชั่วคราว' }}</strong>
          </div>
          <q-toggle
            v-model="form.isOpen"
            color="positive"
            dense
            label="เปิดให้ลูกค้าจอง"
            left-label
            class="text-weight-bold text-grey-8"
            data-audit-id="toggle-is-open"
          />
        </div>
      </q-card>

      <!-- Card 2: Payment Credentials -->
      <q-card class="bg-white text-grey-9 q-pa-md rounded-borders q-mb-md shadow-1">
        <div class="text-subtitle1 text-weight-bolder text-positive q-mb-sm row items-center">
          <q-icon name="payments" size="20px" class="q-mr-xs" />
          2. บัญชีรับเงินและพร้อมเพย์
        </div>

        <div class="row q-mb-sm">
          <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
            <q-input
              v-model="form.promptPayNumber"
              outlined
              dense
              label="เบอร์พร้อมเพย์รับเงิน *"
              placeholder="0878902935"
              data-audit-id="input-promptpay-number"
            >
              <template #prepend>
                <q-icon name="qr_code" color="positive" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 q-pl-sm-xs">
            <q-input
              v-model="form.promptPayName"
              outlined
              dense
              label="ชื่อบัญชีพร้อมเพย์ *"
              placeholder="นาตยา บุญณะ"
              data-audit-id="input-promptpay-name"
            >
              <template #prepend>
                <q-icon name="person" color="positive" />
              </template>
            </q-input>
          </div>
        </div>

        <div class="row">
          <div class="col-12 col-sm-6 q-pr-sm-xs q-mb-sm q-mb-sm-none">
            <q-input
              v-model="form.bankName"
              outlined
              dense
              label="ธนาคารรับโอน"
              placeholder="KBANK (กสิกรไทย)"
              data-audit-id="input-bank-name"
            >
              <template #prepend>
                <q-icon name="account_balance" color="positive" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-6 q-pl-sm-xs">
            <q-input
              v-model="form.bankAccountNumber"
              outlined
              dense
              label="เลขที่บัญชีธนาคาร"
              placeholder="8172235408"
              data-audit-id="input-bank-account-number"
            >
              <template #prepend>
                <q-icon name="credit_card" color="positive" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card>

      <!-- Card 3: Fruits Pricing, Cost & Quotas -->
      <q-card class="bg-white text-grey-9 q-pa-md rounded-borders q-mb-md shadow-1">
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-subtitle1 text-weight-bolder text-positive row items-center">
            <q-icon name="eco" size="20px" class="q-mr-xs" />
            3. ผลไม้ ราคาขาย ต้นทุน และโควต้า
          </div>
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          กำหนดราคาขายและต้นทุนต่อ กก. เพื่อให้ระบบคำนวณกำไร-ขาดทุนแบบ Deep Analysis อัตโนมัติ
        </div>

        <div class="column">
          <div
            v-for="fruit in form.fruits"
            :key="fruit.fruitKey"
            class="bg-grey-1 q-pa-sm rounded-borders q-mb-sm shadow-none border-light"
            :data-audit-id="`fruit-config-row-${fruit.fruitKey}`"
          >
            <!-- Top Row: Checkbox, Avatar, Name & Profit Margin Badge -->
            <div class="row items-center justify-between q-mb-xs">
              <div class="row items-center">
                <q-checkbox
                  v-model="fruit.isEnabled"
                  color="positive"
                  dense
                  class="q-mr-sm"
                  :data-audit-id="`checkbox-enable-${fruit.fruitKey}`"
                />
                <q-avatar size="34px" class="q-mr-sm bg-white shadow-1">
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

              <!-- Real-time Profit Preview Badge -->
              <div v-if="fruit.isEnabled && fruit.pricePerKg > 0" class="text-right">
                <q-badge
                  :color="fruit.pricePerKg >= fruit.costPerKg ? 'positive' : 'negative'"
                  class="text-weight-bold"
                  rounded
                >
                  กำไร {{ fruit.pricePerKg - fruit.costPerKg }} บ./กก.
                </q-badge>
                <div class="text-caption text-grey-7" style="font-size: 10px;">
                  มาร์จิ้น: {{ Math.round(((fruit.pricePerKg - fruit.costPerKg) / (fruit.pricePerKg || 1)) * 100) }}%
                </div>
              </div>
            </div>

            <!-- Bottom Row: Price, Cost, Quota Inputs -->
            <div v-if="fruit.isEnabled" class="row items-center justify-between q-mt-xs q-pt-xs border-top-light">
              <!-- Price per kg -->
              <div class="col-4 q-pr-xs">
                <div class="text-caption text-grey-8" style="font-size: 11px;">ราคาขาย:</div>
                <q-input
                  v-model.number="fruit.pricePerKg"
                  type="number"
                  outlined
                  dense
                  bg-color="white"
                  suffix="บ."
                  data-audit-id="input-price-per-kg"
                />
              </div>

              <!-- Cost per kg -->
              <div class="col-4 q-px-xs">
                <div class="text-caption text-grey-8" style="font-size: 11px;">ต้นทุน:</div>
                <q-input
                  v-model.number="fruit.costPerKg"
                  type="number"
                  outlined
                  dense
                  bg-color="white"
                  suffix="บ."
                  data-audit-id="input-cost-per-kg"
                />
              </div>

              <!-- Quota kg -->
              <div class="col-4 q-pl-xs">
                <div class="text-caption text-grey-8" style="font-size: 11px;">โควต้า:</div>
                <q-input
                  v-model.number="fruit.totalQuotaKg"
                  type="number"
                  outlined
                  dense
                  bg-color="white"
                  suffix="กก."
                  data-audit-id="input-quota-kg"
                />
              </div>
            </div>
          </div>
        </div>
      </q-card>

      <!-- Action Buttons -->
      <div class="row items-center justify-end q-mt-lg q-mb-xl">
        <q-btn
          flat
          label="ยกเลิก"
          color="grey-7"
          no-caps
          class="q-mr-sm text-weight-bold"
          data-audit-id="btn-cancel-round-edit"
          @click="handleBack"
        />
        <q-btn
          color="positive"
          icon="save"
          :label="isEditMode ? 'บันทึกการแก้ไขรอบ' : 'บันทึกและเปิดรอบจอง'"
          no-caps
          type="submit"
          class="q-px-lg text-weight-bold shadow-2"
          :loading="fruitStore.isLoading"
          :disable="!isFormValid"
          data-audit-id="btn-submit-round"
        />
      </div>
    </q-form>
  </q-page>
</template>

<script setup lang="ts">
// Full-page Round Edit / Create Form in clean Light Theme with interactive Thai Date Picker & Time Slot Selector
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFruitStore } from '@/stores/fruitStore';
import type { RoundCreationFruitConfig } from '@/types/fruit_app';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const fruitStore = useFruitStore();

const roundId = computed<string>(() => (route.params.roundId as string) || '');
const isEditMode = computed<boolean>(() => !!roundId.value && roundId.value !== 'new');
const isLoadingData = ref<boolean>(false);

// Standard Delivery Slot Presets
const PRESET_SLOTS = [
  '17:00 - 18:00 (รอบเย็นเลิกงาน)',
  '18:00 - 18:30',
  '18:30 - 19:00',
  '19:00 - 19:30',
  '19:30 - 20:00',
  '20:00 - 20:30',
  '20:30 - 21:00',
  '21:00+ (หลังห้างปิด / ท้ายรถ)'
];

const customSlotInput = ref<string>('');
const calendarDate = ref<string>('');

// Thai Date Formatters
const THAI_DAYS = ['วันอาทิตย์ที่', 'วันจันทร์ที่', 'วันอังคารที่', 'วันพุธที่', 'วันพฤหัสบดีที่', 'วันศุกร์ที่', 'วันเสาร์ที่'];
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatThaiDateFromIso(isoStr: string): string {
  const parts = isoStr.replace(/-/g, '/').split('/');
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];
  if (!p0 || !p1 || !p2) return isoStr;
  const year = parseInt(p0, 10);
  const month = parseInt(p1, 10) - 1;
  const day = parseInt(p2, 10);
  const d = new Date(year, month, day);
  const dayName = THAI_DAYS[d.getDay()] || '';
  const monthName = THAI_MONTHS[month] || '';
  const thaiYear = year + 543;
  return `${dayName} ${day} ${monthName} ${thaiYear}`;
}

function formatDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// Quick Date Preset: Add N days from today
function applyDatePreset(daysFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  calendarDate.value = formatDateToIso(d);
  form.value.pickupDate = formatThaiDateFromIso(calendarDate.value);
}

// Quick Date Preset: Next specific weekday (0=Sun, 2=Tue, 5=Fri)
function applyNextWeekdayPreset(targetDayOfWeek: number) {
  const d = new Date();
  let daysUntil = (targetDayOfWeek - d.getDay() + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // next week
  d.setDate(d.getDate() + daysUntil);
  calendarDate.value = formatDateToIso(d);
  form.value.pickupDate = formatThaiDateFromIso(calendarDate.value);
}

function onCalendarDatePicked(val: string) {
  if (!val) return;
  form.value.pickupDate = formatThaiDateFromIso(val);
}

// Slot toggle handlers
function isSlotSelected(slot: string): boolean {
  return form.value.pickupSlots.includes(slot);
}

function toggleSlot(slot: string) {
  const idx = form.value.pickupSlots.indexOf(slot);
  if (idx >= 0) {
    form.value.pickupSlots.splice(idx, 1);
  } else {
    form.value.pickupSlots.push(slot);
  }
}

function addCustomSlot() {
  const trimmed = customSlotInput.value.trim();
  if (!trimmed) return;
  if (!form.value.pickupSlots.includes(trimmed)) {
    form.value.pickupSlots.push(trimmed);
  }
  customSlotInput.value = '';
}

// Default Master 7 Fruits
function getDefaultFruitConfigs(): RoundCreationFruitConfig[] {
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

const form = ref({
  title: 'รอบส่งผลไม้ วันอังคาร 8 ก.ย.',
  pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
  pickupLocation: 'ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B',
  pickupSlots: [
    '19:00 - 19:30',
    '19:30 - 20:00',
    '20:00 - 20:30',
    '21:00+ (หลังห้างปิด / ท้ายรถ)'
  ],
  promptPayNumber: '0878902935',
  promptPayName: 'นาตยา บุญณะ',
  bankName: 'KBANK (กสิกรไทย)',
  bankAccountNumber: '8172235408',
  bankAccountName: 'นาตยา บุญณะ',
  isOpen: true,
  fruits: getDefaultFruitConfigs()
});

const isFormValid = computed<boolean>(() => {
  const hasTitle = !!form.value.title.trim();
  const hasDate = !!form.value.pickupDate.trim();
  const hasLocation = !!form.value.pickupLocation.trim();
  const hasSlots = form.value.pickupSlots.length > 0;
  const hasAtLeastOneFruit = form.value.fruits.some(f => f.isEnabled && f.pricePerKg > 0);
  return hasTitle && hasDate && hasLocation && hasSlots && hasAtLeastOneFruit;
});

// Back handler
function handleBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push('/admin/rounds');
  }
}

// Load existing round if editing
async function loadRoundData(id: string) {
  isLoadingData.value = true;
  try {
    const roundData = await fruitStore.getRoundById(id);
    if (!roundData) {
      $q.notify({ type: 'negative', message: 'ไม่พบข้อมูลรอบนี้ในระบบ' });
      void router.push('/admin/rounds');
      return;
    }

    form.value.title = roundData.title;
    form.value.pickupDate = roundData.pickupDate;
    form.value.pickupLocation = roundData.pickupLocation;
    form.value.pickupSlots = roundData.pickupSlots || [
      '19:00 - 19:30',
      '19:30 - 20:00',
      '20:00 - 20:30',
      '21:00+ (หลังห้างปิด / ท้ายรถ)'
    ];
    form.value.promptPayNumber = roundData.promptPayNumber || '0878902935';
    form.value.promptPayName = roundData.promptPayName || 'นาตยา บุญณะ';
    form.value.bankName = roundData.bankName || 'KBANK (กสิกรไทย)';
    form.value.bankAccountNumber = roundData.bankAccountNumber || '8172235408';
    form.value.bankAccountName = roundData.bankAccountName || roundData.promptPayName || 'นาตยา บุญณะ';
    form.value.isOpen = roundData.isOpen !== undefined ? roundData.isOpen : true;

    // Fetch existing products to configure prices and costs
    const prods = await fruitStore.getProductsByRoundId(id);
    const prodMap = new Map(prods.map(p => [p.mascotKey, p]));

    const defaultFruits = getDefaultFruitConfigs();
    form.value.fruits = defaultFruits.map(df => {
      const match = prodMap.get(df.fruitKey);
      if (match) {
        return {
          fruitKey: df.fruitKey,
          name: match.name || df.name,
          productType: match.productType || df.productType,
          pricePerKg: match.pricePerKg || df.pricePerKg,
          costPerKg: match.costPerKg !== undefined ? match.costPerKg : df.costPerKg,
          totalQuotaKg: match.totalQuotaKg || df.totalQuotaKg,
          isEnabled: true
        };
      }
      return df;
    });
  } catch (err) {
    console.error('Error loading round for editing:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
  } finally {
    isLoadingData.value = false;
  }
}

// Submit handler
async function handleSubmit() {
  if (!isFormValid.value) return;

  try {
    if (isEditMode.value) {
      await fruitStore.updateRound(roundId.value, {
        title: form.value.title.trim(),
        pickupDate: form.value.pickupDate.trim(),
        pickupLocation: form.value.pickupLocation.trim(),
        pickupSlots: form.value.pickupSlots,
        promptPayNumber: form.value.promptPayNumber.trim(),
        promptPayName: form.value.promptPayName.trim(),
        bankName: form.value.bankName.trim(),
        bankAccountNumber: form.value.bankAccountNumber.trim(),
        bankAccountName: form.value.bankAccountName.trim(),
        isOpen: form.value.isOpen,
        fruits: form.value.fruits
      });
      $q.notify({
        type: 'positive',
        message: 'บันทึกการแก้ไขรอบจองสำเร็จแล้ว!',
        position: 'top',
        timeout: 2000
      });
    } else {
      const newRoundId = await fruitStore.createRound({
        title: form.value.title.trim(),
        pickupDate: form.value.pickupDate.trim(),
        pickupLocation: form.value.pickupLocation.trim(),
        pickupSlots: form.value.pickupSlots,
        promptPayNumber: form.value.promptPayNumber.trim(),
        promptPayName: form.value.promptPayName.trim(),
        bankName: form.value.bankName.trim(),
        bankAccountNumber: form.value.bankAccountNumber.trim(),
        bankAccountName: form.value.bankAccountName.trim(),
        fruits: form.value.fruits
      });
      $q.notify({
        type: 'positive',
        message: `เปิดรอบการจองใหม่ #${newRoundId} สำเร็จแล้ว!`,
        position: 'top',
        timeout: 2000
      });
    }

    void router.push('/admin/rounds');
  } catch (err) {
    console.error('Error saving round:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
}

onMounted(() => {
  if (isEditMode.value) {
    void loadRoundData(roundId.value);
  }
});
</script>

<style scoped>
.border-light {
  border: 1px solid #e0e0e0;
}
.border-top-light {
  border-top: 1px solid #e0e0e0;
}
</style>
