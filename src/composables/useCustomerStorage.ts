// Composable for frictionless customer profile persistence in LocalStorage
import { ref } from 'vue';
import type { CustomerInfo } from '@/types/fruit_app';

const STORAGE_KEY_PROFILE = 'fruit_drop_customer_profile';
const STORAGE_KEY_LAST_ORDER = 'fruit_drop_last_order_id';

export function useCustomerStorage() {
  const customerProfile = ref<CustomerInfo>({
    name: '',
    phone: '',
    floor: 'ชั้น 1',
    shop: ''
  });

  const lastOrderId = ref<string>('');

  // Load saved profile on initialize
  function loadProfile(): CustomerInfo {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<CustomerInfo>;
        customerProfile.value = {
          name: parsed.name || '',
          phone: parsed.phone || '',
          floor: parsed.floor || 'ชั้น 1',
          shop: parsed.shop || ''
        };
      }
    } catch {
      // LocalStorage access error fallback
    }
    return customerProfile.value;
  }

  // Save profile after successful order or on input change
  function saveProfile(info: CustomerInfo) {
    try {
      customerProfile.value = { ...info };
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(info));
    } catch {
      // LocalStorage full or private browsing fallback
    }
  }

  // Save last order ID to easily show queue card
  function saveLastOrderId(orderId: string) {
    try {
      lastOrderId.value = orderId;
      localStorage.setItem(STORAGE_KEY_LAST_ORDER, orderId);
    } catch {
      // Ignore
    }
  }

  // Load last order ID
  function loadLastOrderId(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_ORDER);
      if (stored) {
        lastOrderId.value = stored;
      }
    } catch {
      // Ignore
    }
    return lastOrderId.value;
  }

  // Clear last order (e.g. after customer acknowledges delivery)
  function clearLastOrder() {
    lastOrderId.value = '';
    localStorage.removeItem(STORAGE_KEY_LAST_ORDER);
  }

  return {
    customerProfile,
    lastOrderId,
    loadProfile,
    saveProfile,
    saveLastOrderId,
    loadLastOrderId,
    clearLastOrder
  };
}
