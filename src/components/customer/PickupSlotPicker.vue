<template>
  <!-- Section: Pickup Time-Slot Picker with Seller Standby Window Gating -->
  <q-card id="customer-pickup-slot-picker" data-audit-id="customer-pickup-slot-picker" class="rounded-borders bg-white shadow-1 q-mb-md">
    <q-card-section class="q-pa-md">
      <!-- Section Title -->
      <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-xs row items-center">
        <q-icon name="schedule" color="primary" class="q-mr-xs" size="22px" />
        <span>เวลานัดรับของ (โดยประมาณ)</span>
      </div>

      <!-- Seller Standby Window Notification Card -->
      <div class="bg-green-1 q-pa-sm rounded-borders q-mb-md row items-center border-positive-subtle" data-audit-id="standby-window-banner">
        <q-icon name="local_shipping" color="positive" size="22px" class="q-mr-sm" />
        <div>
          <div class="text-caption text-grey-9">
            คนขายจะ Standby รอส่งของที่รถ: <strong class="text-positive">{{ standbyStartTime }} - {{ standbyEndTime }} น.</strong>
          </div>
          <div class="text-caption text-grey-6" style="font-size: 11px;">
            กรุณาระบุเวลาที่ท่านคาดว่าจะมารับของ (ต้องอยู่ระหว่างช่วงที่คนขายรอ)
          </div>
        </div>
      </div>

      <!-- Quick Suggestion Chips (Every 30 mins within standby window) -->
      <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
        แตะเลือกเวลาด่วน:
      </div>
      <div class="row items-center q-mb-sm" data-audit-id="quick-pickup-chips">
        <q-chip
          v-for="chipTime in quickTimeChips"
          :key="chipTime"
          clickable
          :selected="selectedTimeClean === chipTime"
          :color="selectedTimeClean === chipTime ? 'positive' : 'grey-2'"
          :text-color="selectedTimeClean === chipTime ? 'white' : 'grey-9'"
          class="text-weight-bold q-mr-xs q-mb-xs"
          size="sm"
          :data-audit-id="`chip-pickup-time-${chipTime.replace(':', '-')}`"
          @click="selectTime(chipTime)"
        >
          <q-icon name="access_time" size="14px" class="q-mr-xs" />
          {{ chipTime }} น.
        </q-chip>
      </div>

      <!-- Custom Time Input (Allow specific minute e.g. 19:45) -->
      <div class="q-mt-xs">
        <q-input
          v-model="inputTime"
          outlined
          dense
          label="หรือระบุเวลานัดรับที่ท่านสะดวก *"
          placeholder="เช่น 19:30"
          mask="time"
          :error="!isWithinStandbyWindow"
          :error-message="errorMessage"
          data-audit-id="input-customer-pickup-time"
          @update:model-value="onInputTimeChange"
        >
          <template #prepend>
            <q-icon name="schedule" :color="isWithinStandbyWindow ? 'positive' : 'negative'" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-time
                  v-model="inputTime"
                  format24h
                  color="positive"
                  @update:model-value="onInputTimeChange"
                >
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="ตกลง" color="positive" flat />
                  </div>
                </q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
          <template #append>
            <span class="text-caption text-grey-6">น.</span>
          </template>
        </q-input>
      </div>

      <!-- Live Standby Range Alert Banner (Triggers immediately if out of range) -->
      <transition enter-active-class="animated shake" leave-active-class="animated fadeOut">
        <q-banner
          v-if="!isWithinStandbyWindow && inputTime"
          dense
          rounded
          class="bg-red-1 text-negative rounded-borders q-mt-xs shadow-none border-negative-subtle"
          data-audit-id="alert-out-of-standby"
        >
          <template #avatar>
            <q-icon name="warning" color="negative" size="20px" />
          </template>
          <div class="text-caption text-weight-bold">
            ⚠️ เวลา {{ inputTime }} น. อยู่นอกช่วงเวลา Standby ของคนขาย ({{ standbyStartTime }} - {{ standbyEndTime }} น.)
          </div>
          <div class="text-caption text-grey-8" style="font-size: 11px;">
            กรุณาเลือกเวลาใหม่อยู่ระหว่าง {{ standbyStartTime }} น. ถึง {{ standbyEndTime }} น.
          </div>
        </q-banner>
      </transition>

      <!-- Success Confirmation Badge if Valid -->
      <div
        v-if="isWithinStandbyWindow && inputTime"
        class="text-caption text-positive text-weight-bold q-mt-xs row items-center"
        data-audit-id="badge-pickup-valid"
      >
        <q-icon name="check_circle" size="16px" class="q-mr-xs" />
        <span>นัดรับเวลา {{ inputTime }} น.</span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
// Interactive Customer Pickup Time Selector with Seller Standby Window Gating
import { ref, computed, watch, onMounted } from 'vue';
import type { PreorderRound } from '@/types/fruit_app';

const props = defineProps<{
  modelValue: string;
  round?: PreorderRound | null;
  slots?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:isValid', value: boolean): void;
}>();

// Parse Standby Window Boundaries
const standbyStartTime = computed<string>(() => {
  if (props.round?.standbyStartTime) return props.round.standbyStartTime;
  if (props.round?.standbyTime) {
    const match = props.round.standbyTime.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match && match[1]) return match[1];
  }
  if (props.slots && props.slots.length > 0 && props.slots[0]) {
    const match = props.slots[0].match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match && match[1]) return match[1];
  }
  return '19:00';
});

const standbyEndTime = computed<string>(() => {
  if (props.round?.standbyEndTime) return props.round.standbyEndTime;
  if (props.round?.standbyTime) {
    const match = props.round.standbyTime.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match && match[2]) return match[2];
  }
  if (props.slots && props.slots.length > 0 && props.slots[0]) {
    const match = props.slots[0].match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match && match[2]) return match[2];
  }
  return '23:00';
});

// Helper: Convert "HH:mm" to minutes from midnight
function toMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match || match[1] === undefined || match[2] === undefined) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

// Generate quick 30-min interval chips within standby window
const quickTimeChips = computed<string[]>(() => {
  const startMin = toMinutes(standbyStartTime.value);
  const endMin = toMinutes(standbyEndTime.value);
  const chips: string[] = [];

  if (startMin <= endMin) {
    for (let m = startMin; m <= endMin; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      chips.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  } else {
    // Overnight window (e.g. 22:00 - 02:00)
    for (let m = startMin; m < 24 * 60; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      chips.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    for (let m = 0; m <= endMin; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      chips.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }

  return chips;
});

// Clean extraction of HH:mm from raw modelValue
function extractCleanTime(val: string): string {
  if (!val) return '';
  const match = val.match(/(\d{1,2}:\d{2})/);
  return match && match[1] ? match[1] : '';
}

const inputTime = ref<string>('19:30');

// Selected time stripped of extra text
const selectedTimeClean = computed<string>(() => {
  return extractCleanTime(inputTime.value);
});

// Time range validity check
const isWithinStandbyWindow = computed<boolean>(() => {
  if (!inputTime.value || !selectedTimeClean.value) return false;
  const currentMin = toMinutes(selectedTimeClean.value);
  const startMin = toMinutes(standbyStartTime.value);
  const endMin = toMinutes(standbyEndTime.value);

  if (startMin <= endMin) {
    return currentMin >= startMin && currentMin <= endMin;
  }
  // Overnight support
  return currentMin >= startMin || currentMin <= endMin;
});

const errorMessage = computed<string>(() => {
  if (!inputTime.value) return 'กรุณาระบุเวลานัดรับของ';
  if (!isWithinStandbyWindow.value) {
    return `เวลานัดรับต้องอยู่ระหว่าง ${standbyStartTime.value} - ${standbyEndTime.value} น.`;
  }
  return '';
});

function selectTime(chipTime: string) {
  inputTime.value = chipTime;
  emitValues();
}

function onInputTimeChange() {
  emitValues();
}

function emitValues() {
  const formatted = inputTime.value ? `${inputTime.value} น.` : '';
  emit('update:modelValue', formatted);
  emit('update:isValid', isWithinStandbyWindow.value);
}

// Watchers and Initialization
watch(() => props.modelValue, (newVal) => {
  const clean = extractCleanTime(newVal);
  if (clean && clean !== inputTime.value) {
    inputTime.value = clean;
  }
});

watch([standbyStartTime, standbyEndTime], () => {
  // If current input is out of new window, default to standbyStartTime
  if (!isWithinStandbyWindow.value) {
    inputTime.value = standbyStartTime.value;
  }
  emitValues();
});

onMounted(() => {
  const initial = extractCleanTime(props.modelValue);
  if (initial) {
    inputTime.value = initial;
  } else {
    inputTime.value = standbyStartTime.value || '19:00';
  }
  emitValues();
});
</script>

<style scoped>
.border-positive-subtle {
  border: 1px solid rgba(46, 125, 50, 0.25);
}
.border-negative-subtle {
  border: 1px solid rgba(198, 40, 40, 0.25);
}
</style>
