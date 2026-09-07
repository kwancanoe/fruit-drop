// Centralized Order & Round Status Engine (M3 Material Design Single Source of Truth)
import type { Order, PreorderRound } from '@/types/fruit_app';

export interface StatusVisualConfig {
  key: string;
  label: string;
  icon: string;
  bgGradientClass: string;
  textColorClass: string;
  borderColorClass: string;
}

// 1. Order Status Configurations (Google M3 Tonal Palette)
export const ORDER_STATUS_CONFIGS: Record<string, StatusVisualConfig> = {
  COMPLETED: {
    key: 'COMPLETED',
    label: 'ส่งมอบแล้ว',
    icon: 'check_circle',
    bgGradientClass: 'm3-tonal-positive',
    textColorClass: 'text-positive-dark',
    borderColorClass: 'm3-border-positive'
  },
  COMPLETED_CASH: {
    key: 'COMPLETED_CASH',
    label: 'ส่งมอบแล้ว (เงินสด)',
    icon: 'payments',
    bgGradientClass: 'm3-tonal-positive',
    textColorClass: 'text-positive-dark',
    borderColorClass: 'm3-border-positive'
  },
  COMPLETED_TRANSFER: {
    key: 'COMPLETED_TRANSFER',
    label: 'ส่งมอบแล้ว (โอนเงิน)',
    icon: 'account_balance_wallet',
    bgGradientClass: 'm3-tonal-positive',
    textColorClass: 'text-positive-dark',
    borderColorClass: 'm3-border-positive'
  },
  WEIGHING: {
    key: 'WEIGHING',
    label: 'รอชั่งน้ำหนัก',
    icon: 'scale',
    bgGradientClass: 'm3-tonal-warning',
    textColorClass: 'text-warning-dark',
    borderColorClass: 'm3-border-warning'
  },
  WAITING_PICKUP: {
    key: 'WAITING_PICKUP',
    label: 'รอมารับของ',
    icon: 'schedule',
    bgGradientClass: 'm3-tonal-info',
    textColorClass: 'text-info-dark',
    borderColorClass: 'm3-border-info'
  },
  CANCELLED: {
    key: 'CANCELLED',
    label: 'ยกเลิกแล้ว',
    icon: 'cancel',
    bgGradientClass: 'm3-tonal-negative',
    textColorClass: 'text-negative-dark',
    borderColorClass: 'm3-border-negative'
  }
};

// Check if an order has unweighed fruit (Durian whole fruit requiring tailgate scale)
export function orderHasUnweighedFruit(order: Pick<Order, 'items'>): boolean {
  if (!order.items || order.items.length === 0) return false;
  return order.items.some(item =>
    item.productType === 'VARIABLE_WHOLE_FRUIT' &&
    (!item.actualWeighedKg || item.actualWeighedKg <= 0)
  );
}

// Resolver: Calculates the unified operational status of an Order
export function getOrderStatusConfig(order: Order): StatusVisualConfig {
  if (order.orderStatus === 'CANCELLED') {
    return ORDER_STATUS_CONFIGS.CANCELLED!;
  }

  if (order.orderStatus === 'COMPLETED') {
    const mode = order.attribution?.paymentModeAtHandover;
    if (mode === 'CASH') return ORDER_STATUS_CONFIGS.COMPLETED_CASH!;
    if (mode === 'TRANSFER') return ORDER_STATUS_CONFIGS.COMPLETED_TRANSFER!;
    // Fallback for historical completed orders without attribution record
    if (order.paymentMethod === 'PAY_AT_CAR') return ORDER_STATUS_CONFIGS.COMPLETED_CASH!;
    if (order.paymentMethod === 'PROMPTPAY_PREPAID') return ORDER_STATUS_CONFIGS.COMPLETED_TRANSFER!;
    return ORDER_STATUS_CONFIGS.COMPLETED!;
  }

  // Pay-at-Car model: Before delivery, order is in preparation/waiting pickup
  if (orderHasUnweighedFruit(order)) {
    return ORDER_STATUS_CONFIGS.WEIGHING!;
  }

  return ORDER_STATUS_CONFIGS.WAITING_PICKUP!;
}

// 2. Preorder Round Status Configurations
export const ROUND_STATUS_CONFIGS = {
  OPEN: {
    key: 'OPEN',
    label: 'เปิดรับจอง',
    icon: 'check_circle',
    bgGradientClass: 'm3-tonal-positive',
    textColorClass: 'text-positive-dark',
    borderColorClass: 'm3-border-positive'
  },
  CLOSED: {
    key: 'CLOSED',
    label: 'ปิดรับจอง',
    icon: 'lock',
    bgGradientClass: 'm3-tonal-neutral',
    textColorClass: 'text-grey-7',
    borderColorClass: 'm3-border-neutral'
  }
};

export function getRoundStatusConfig(isOpen: boolean): StatusVisualConfig {
  return isOpen ? ROUND_STATUS_CONFIGS.OPEN : ROUND_STATUS_CONFIGS.CLOSED;
}
