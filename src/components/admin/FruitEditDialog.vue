<template>
  <!-- Section: Master Fruit Creation & Edit Dialog (M3 Expressive Modal) -->
  <q-dialog
    v-model="isOpen"
    persistent
    transition-show="jump-down"
    transition-hide="jump-up"
  >
    <q-card
      id="fruit-edit-dialog"
      data-audit-id="fruit-edit-dialog"
      class="bg-white text-grey-9 rounded-borders shadow-3 q-pa-sm"
      style="width: 100%; max-width: 520px; max-height: 90vh;"
    >
      <!-- Dialog Header: Clean, Compact, Zero Waste -->
      <q-card-section class="q-px-md q-pt-sm q-pb-xs">
        <div class="text-subtitle1 text-weight-bolder text-grey-9">
          {{ isEdit ? `แก้ไขชนิดผลไม้ (${form.fruitKey})` : 'เพิ่มชนิดผลไม้ใหม่' }}
        </div>
      </q-card-section>

      <q-separator class="q-mb-sm" />

      <!-- Dialog Body Form -->
      <q-card-section class="q-pt-none scroll" style="max-height: 65vh;">
        <q-form @submit.prevent="handleSave">
          <!-- 1. Fruit Avatar & Mascot Selection -->
          <div class="q-mb-md">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
              รูปสัญลักษณ์ / มาสคอตประจำผลไม้:
            </div>

            <div class="row items-center q-mb-sm">
              <!-- Live Preview Avatar -->
              <q-avatar size="60px" class="q-mr-md bg-white shadow-1 border-light">
                <q-img :src="previewImageUrl" fit="contain" class="full-width full-height" />
              </q-avatar>

              <div class="col">
                <div class="text-caption text-weight-medium text-grey-8">
                  {{ form.avatarType === 'UPLOADED' ? 'รูปที่อัปโหลดเอง' : 'มาสคอตจากคลัง' }}
                </div>
                <!-- Custom Upload Button -->
                <div class="row items-center q-mt-xs">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleFileSelected"
                  />
                  <q-btn
                    outline
                    dense
                    size="sm"
                    color="primary"
                    icon="cloud_upload"
                    label="อัปโหลดรูปใหม่"
                    no-caps
                    rounded
                    class="q-px-sm q-mr-sm"
                    @click="fileInputRef?.click()"
                  />
                  <q-btn
                    v-if="form.avatarType === 'UPLOADED'"
                    flat
                    dense
                    size="sm"
                    color="grey-7"
                    label="รีเซ็ตเป็นมาสคอต"
                    no-caps
                    @click="resetToPredefined"
                  />
                </div>
              </div>
            </div>

            <!-- Predefined Mascot Quick Picker -->
            <div class="bg-grey-1 q-pa-sm rounded-borders">
              <div class="text-caption text-grey-6 q-mb-xs" style="font-size: 11px;">
                หรือแตะเลือกมาสคอต 2.5D สำเร็จรูป:
              </div>
              <div class="row items-center wrap" style="gap: 8px;">
                <q-avatar
                  v-for="mascot in BUILT_IN_MASCOTS"
                  :key="mascot.key"
                  size="38px"
                  class="cursor-pointer transition-transform"
                  :class="{ 'border-positive-active shadow-2': form.imageUrl === mascot.url && form.avatarType === 'PREDEFINED' }"
                  @click="selectPredefinedMascot(mascot.url, mascot.key)"
                >
                  <q-img :src="mascot.url" fit="contain" />
                  <q-tooltip>{{ mascot.name }}</q-tooltip>
                </q-avatar>
              </div>
            </div>
          </div>

          <!-- 2. Name and Key -->
          <div class="row q-col-gutter-sm q-mb-sm">
            <div class="col-12 col-sm-7">
              <q-input
                v-model="form.name"
                outlined
                dense
                label="ชื่อผลไม้ *"
                placeholder="เช่น อะโวคาโดพันธุ์แฮสส์"
                :rules="[val => !!val && val.trim().length > 0 || 'โปรดระบุชื่อผลไม้']"
                data-audit-id="input-master-fruit-name"
                @update:model-value="onNameChanged"
              />
            </div>
            <div class="col-12 col-sm-5">
              <q-input
                v-model="form.fruitKey"
                outlined
                dense
                label="รหัสระบบ (Slug) *"
                placeholder="เช่น avocado"
                :disable="isEdit"
                :rules="[val => !!val && val.trim().length > 0 || 'โปรดระบุรหัสระบบ']"
                data-audit-id="input-master-fruit-key"
              />
            </div>
          </div>

          <!-- 3. Product Archetype (Sale Mode) -->
          <div class="q-mb-md">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
              รูปแบบการขาย:
            </div>
            <div class="row items-center" style="gap: 8px;">
              <q-btn
                :outline="form.productType !== 'FIXED_WEIGHT'"
                :color="form.productType === 'FIXED_WEIGHT' ? 'positive' : 'grey-7'"
                no-caps
                rounded
                dense
                size="sm"
                class="q-px-md"
                icon="scale"
                label="ขายยกกิโล (Fixed Weight)"
                @click="form.productType = 'FIXED_WEIGHT'"
              />
              <q-btn
                :outline="form.productType !== 'VARIABLE_WHOLE_FRUIT'"
                :color="form.productType === 'VARIABLE_WHOLE_FRUIT' ? 'positive' : 'grey-7'"
                no-caps
                rounded
                dense
                size="sm"
                class="q-px-md"
                icon="fitness_center"
                label="ชั่งน้ำหนักตามลูก (Whole Fruit เช่น ทุเรียน)"
                @click="form.productType = 'VARIABLE_WHOLE_FRUIT'"
              />
            </div>
          </div>

          <!-- 4. Default Pricing & Quota -->
          <div class="row q-col-gutter-sm q-mb-sm">
            <div class="col-4">
              <q-input
                v-model.number="form.defaultPricePerKg"
                type="number"
                outlined
                dense
                label="ราคาขายแนะนำ *"
                suffix="บ./กก."
                :rules="[val => val > 0 || 'ราคาต้อง > 0']"
                data-audit-id="input-default-price"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="form.defaultCostPerKg"
                type="number"
                outlined
                dense
                label="ต้นทุนแนะนำ *"
                suffix="บ./กก."
                data-audit-id="input-default-cost"
              />
            </div>
            <div class="col-4">
              <q-input
                v-model.number="form.defaultTotalQuotaKg"
                type="number"
                outlined
                dense
                label="โควต้าแนะนำ"
                suffix="กก."
                data-audit-id="input-default-quota"
              />
            </div>
          </div>

          <!-- Profit Margin Estimation Badge -->
          <div v-if="form.defaultPricePerKg > 0" class="row items-center justify-between bg-grey-1 q-pa-sm rounded-borders q-mb-md">
            <div class="text-caption text-grey-8">
              กำไรโดยประมาณ: <strong>{{ form.defaultPricePerKg - form.defaultCostPerKg }}</strong> บาท/กก.
            </div>
            <q-badge
              :color="form.defaultPricePerKg >= form.defaultCostPerKg ? 'positive' : 'negative'"
              rounded
              class="text-weight-bold"
            >
              มาร์จิ้น {{ Math.round(((form.defaultPricePerKg - form.defaultCostPerKg) / form.defaultPricePerKg) * 100) }}%
            </q-badge>
          </div>

          <!-- 5. Active Status Toggle -->
          <div class="row items-center justify-between bg-white q-py-xs">
            <div>
              <div class="text-body2 text-weight-bold text-grey-9">สถานะการใช้งาน</div>
              <div class="text-caption text-grey-6">เปิดให้เลือกนำไปสร้างในรอบส่งผลไม้ใหม่</div>
            </div>
            <q-toggle
              v-model="form.isActive"
              color="positive"
              dense
              data-audit-id="toggle-fruit-active"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-separator class="q-my-sm" />

      <!-- Dialog Action Buttons -->
      <q-card-actions align="right" class="q-px-md q-py-sm">
        <q-btn
          flat
          label="ยกเลิก"
          color="grey-7"
          rounded
          no-caps
          v-close-popup
        />
        <q-btn
          color="positive"
          label="บันทึกข้อมูล"
          icon="save"
          rounded
          no-caps
          class="q-px-md text-weight-bold"
          :loading="isSaving"
          data-audit-id="btn-save-master-fruit"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// 1-line: Modal dialog for creating and editing Master Fruit Catalog entities with photo upload and mascot picker
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import type { MasterFruit, ProductType } from '@/types/fruit_app';
import { BUILT_IN_MASCOTS, getFruitMascotUrl } from '@/utils/fruitMascots';
import { useFruitStore } from '@/stores/fruitStore';

const props = defineProps<{
  modelValue: boolean;
  fruitToEdit?: MasterFruit | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved', fruit: MasterFruit): void;
}>();

const $q = useQuasar();
const fruitStore = useFruitStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isSaving = ref(false);
const selectedFile = ref<File | null>(null);
const localPreviewUrl = ref<string | null>(null);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const isEdit = computed(() => !!props.fruitToEdit?.id);

// Form model state
const form = ref<{
  id: string;
  fruitKey: string;
  name: string;
  productType: ProductType;
  defaultPricePerKg: number;
  defaultCostPerKg: number;
  defaultTotalQuotaKg: number;
  imageUrl: string;
  avatarType: 'PREDEFINED' | 'UPLOADED';
  isActive: boolean;
  sortOrder: number;
}>({
  id: '',
  fruitKey: '',
  name: '',
  productType: 'FIXED_WEIGHT',
  defaultPricePerKg: 50,
  defaultCostPerKg: 30,
  defaultTotalQuotaKg: 100,
  imageUrl: '/mascots/mascot_ngo.png',
  avatarType: 'PREDEFINED',
  isActive: true,
  sortOrder: 1
});

// Computed preview image URL
const previewImageUrl = computed(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value;
  return form.value.imageUrl || getFruitMascotUrl(form.value.name);
});

// Auto-derive fruit slug key from English or simplified Thai text
function onNameChanged(val: string | number | null) {
  if (isEdit.value || !val) return;
  const str = String(val).trim().toLowerCase();

  // Try matching known Thai fruits
  if (str.includes('เงาะ')) form.value.fruitKey = 'ngo';
  else if (str.includes('ทุเรียน')) form.value.fruitKey = 'thurian';
  else if (str.includes('มังคุด')) form.value.fruitKey = 'mangkut';
  else if (str.includes('ลองกอง')) form.value.fruitKey = 'longkong';
  else if (str.includes('ลางสาด')) form.value.fruitKey = 'langsat';
  else if (str.includes('ส้ม')) form.value.fruitKey = 'som';
  else if (str.includes('มะม่วง')) form.value.fruitKey = 'mamuang';
  else if (str.includes('ฝรั่ง')) form.value.fruitKey = 'farang';
  else if (str.includes('กล้วย')) form.value.fruitKey = 'kluay';
  else if (str.includes('สับปะรด')) form.value.fruitKey = 'sapparot';
  else if (str.includes('แคนตาลูป')) form.value.fruitKey = 'cantaloupe';
  else if (str.includes('แตงโม')) form.value.fruitKey = 'watermelon';
  else if (str.includes('อะโวคาโด')) form.value.fruitKey = 'avocado';
  else {
    // Generate clean slug using ASCII characters or sanitized timestamp
    const ascii = str.replace(/[^a-zA-Z0-9]/g, '');
    form.value.fruitKey = ascii.length >= 3 ? ascii : `fruit_${Date.now().toString().slice(-4)}`;
  }

  // Update default mascot if user hasn't explicitly selected one
  if (form.value.avatarType === 'PREDEFINED') {
    form.value.imageUrl = getFruitMascotUrl(str);
  }
}

// Select predefined mascot
function selectPredefinedMascot(url: string, key: string) {
  form.value.imageUrl = url;
  form.value.avatarType = 'PREDEFINED';
  localPreviewUrl.value = null;
  selectedFile.value = null;
  if (!form.value.fruitKey && !isEdit.value) {
    form.value.fruitKey = key;
  }
}

// Custom file selected handler
function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    selectedFile.value = file;
    localPreviewUrl.value = URL.createObjectURL(file);
    form.value.avatarType = 'UPLOADED';
  }
}

// Reset to predefined mascot
function resetToPredefined() {
  localPreviewUrl.value = null;
  selectedFile.value = null;
  form.value.avatarType = 'PREDEFINED';
  form.value.imageUrl = getFruitMascotUrl(form.value.name);
}

// Reset form values on dialog open or prop change
watch(() => props.fruitToEdit, (val) => {
  localPreviewUrl.value = null;
  selectedFile.value = null;

  if (val) {
    form.value = {
      id: val.id,
      fruitKey: val.fruitKey || val.id,
      name: val.name,
      productType: val.productType,
      defaultPricePerKg: val.defaultPricePerKg,
      defaultCostPerKg: val.defaultCostPerKg,
      defaultTotalQuotaKg: val.defaultTotalQuotaKg,
      imageUrl: val.imageUrl || getFruitMascotUrl(val.name),
      avatarType: val.avatarType || 'PREDEFINED',
      isActive: val.isActive !== undefined ? val.isActive : true,
      sortOrder: val.sortOrder || 1
    };
  } else {
    form.value = {
      id: '',
      fruitKey: '',
      name: '',
      productType: 'FIXED_WEIGHT',
      defaultPricePerKg: 50,
      defaultCostPerKg: 30,
      defaultTotalQuotaKg: 100,
      imageUrl: '/mascots/mascot_ngo.png',
      avatarType: 'PREDEFINED',
      isActive: true,
      sortOrder: (fruitStore.masterFruits.length || 0) + 1
    };
  }
}, { immediate: true });

// Submit handler
async function handleSave() {
  if (!form.value.name.trim()) {
    $q.notify({ type: 'warning', message: 'โปรดระบุชื่อผลไม้' });
    return;
  }
  if (!form.value.fruitKey.trim()) {
    $q.notify({ type: 'warning', message: 'โปรดระบุรหัสระบบ' });
    return;
  }
  if (form.value.defaultPricePerKg <= 0) {
    $q.notify({ type: 'warning', message: 'ราคาขายต้องมากกว่า 0 บาท' });
    return;
  }

  isSaving.value = true;
  try {
    let finalImageUrl = form.value.imageUrl;

    // If an image file was selected, compress and upload to Firebase Storage
    if (selectedFile.value) {
      finalImageUrl = await fruitStore.uploadFruitImage(selectedFile.value, form.value.fruitKey.trim());
    }

    const payload: MasterFruit = {
      id: form.value.fruitKey.trim().toLowerCase(),
      fruitKey: form.value.fruitKey.trim().toLowerCase(),
      name: form.value.name.trim(),
      productType: form.value.productType,
      defaultPricePerKg: form.value.defaultPricePerKg,
      defaultCostPerKg: form.value.defaultCostPerKg,
      defaultTotalQuotaKg: form.value.defaultTotalQuotaKg,
      imageUrl: finalImageUrl,
      avatarType: form.value.avatarType,
      isActive: form.value.isActive,
      sortOrder: form.value.sortOrder,
      createdAt: props.fruitToEdit?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await fruitStore.saveMasterFruit(payload);

    $q.notify({
      type: 'positive',
      message: isEdit.value ? 'บันทึกข้อมูลผลไม้สำเร็จแล้ว' : 'เพิ่มผลไม้ใหม่สำเร็จแล้ว!',
      position: 'top',
      timeout: 1500
    });

    emit('saved', payload);
    isOpen.value = false;
  } catch (err) {
    console.error('Save master fruit failed:', err);
    $q.notify({ type: 'negative', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped lang="scss">
.border-light {
  border: 1.5px solid rgba(0, 0, 0, 0.08);
}

.border-positive-active {
  border: 2px solid #2E7D32 !important;
  transform: scale(1.1);
}

.transition-transform {
  transition: transform 0.15s ease, border-color 0.15s ease;
}
</style>
