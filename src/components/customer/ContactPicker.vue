<template>
  <!-- Section: Frictionless Customer Contact & Mall Location Picker -->
  <q-card id="customer-contact-picker" data-audit-id="customer-contact-picker" class="rounded-borders bg-white shadow-1 q-mb-md">
    <q-card-section class="q-pa-md">
      <div class="text-subtitle1 text-weight-bolder text-grey-9 q-mb-sm row items-center">
        <q-icon name="storefront" color="primary" class="q-mr-xs" size="22px" />
        <span>ข้อมูลผู้สั่งและจุดทำงานในห้าง</span>
      </div>
      <div class="text-caption text-grey-7 q-mb-md">
        กรอกเพียงครั้งเดียว ระบบจะจำข้อมูลนี้ไว้ให้อัตโนมัติสำหรับการสั่งครั้งต่อไป
      </div>

      <!-- Customer Name -->
      <div class="q-mb-sm">
        <q-input
          v-model="modelValue.name"
          outlined
          dense
          label="ชื่อเล่น / ชื่อผู้สั่ง *"
          placeholder="เช่น น้องอ้น Garmin, พี่กานต์ Watsons"
          :rules="[val => !!val && val.trim().length > 0 || 'กรุณากรอกชื่อเล่น']"
          @update:model-value="onFieldChange"
        >
          <template #prepend>
            <q-icon name="person" color="primary" />
          </template>
        </q-input>
      </div>

      <!-- Mall Floor & Shop Name Row -->
      <div class="row q-mb-sm">
        <div class="col-12 col-sm-5 q-pr-sm-xs q-mb-sm q-mb-sm-none">
          <q-select
            v-model="modelValue.floor"
            outlined
            dense
            :options="floorOptions"
            label="ชั้นที่ทำงาน *"
            @update:model-value="onFieldChange"
          >
            <template #prepend>
              <q-icon name="layers" color="primary" />
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-7 q-pl-sm-xs">
          <q-input
            v-model="modelValue.shop"
            outlined
            dense
            label="ชื่อร้าน / บูธ / แผนก *"
            placeholder="เช่น บูธ Garmin, ร้าน Watsons"
            :rules="[val => !!val && val.trim().length > 0 || 'กรุณาระบุชื่อร้านหรือบูธ']"
            @update:model-value="onFieldChange"
          >
            <template #prepend>
              <q-icon name="apartment" color="primary" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Phone Number -->
      <div class="q-mb-none">
        <q-input
          v-model="modelValue.phone"
          outlined
          dense
          type="tel"
          label="เบอร์โทรศัพท์ (สำหรับค้นหาออเดอร์) *"
          placeholder="08X-XXX-XXXX"
          mask="###-###-####"
          unmasked-value
          :rules="[val => !!val && val.length >= 9 || 'กรุณากรอกเบอร์โทรศัพท์ที่ติดต่อได้']"
          @update:model-value="onFieldChange"
        >
          <template #prepend>
            <q-icon name="phone" color="primary" />
          </template>
        </q-input>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { CustomerInfo } from '@/types/fruit_app';
import { MALL_FLOOR_OPTIONS } from '@/types/fruit_app';
import { useCustomerStorage } from '@/composables/useCustomerStorage';

const props = defineProps<{
  modelValue: CustomerInfo;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: CustomerInfo): void;
}>();

const { saveProfile } = useCustomerStorage();
const floorOptions = MALL_FLOOR_OPTIONS;

// Auto-save to LocalStorage whenever customer types
function onFieldChange() {
  saveProfile(props.modelValue);
  emit('update:modelValue', props.modelValue);
}
</script>
