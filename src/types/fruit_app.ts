// Polymorphic Firestore Data Contracts & System Types for Fruit Drop

export type ProductType = 'FIXED_WEIGHT' | 'VARIABLE_WHOLE_FRUIT';
export type PaymentMethod = 'PAY_AT_CAR' | 'PROMPTPAY_PREPAID';
export type PaymentStatus = 'UNPAID' | 'VERIFYING_SLIP' | 'PAID';
export type OrderStatus = 'WAITING_PICKUP' | 'COMPLETED' | 'CANCELLED';

// Wholesale bundle definition (e.g., 3 kg for 100 THB) - Integer kilograms only
export interface ProductBundle {
  qtyKg: number;
  price: number;
  label: string;
}

// Whole fruit size tier definition (e.g., Durian small/medium/large estimates)
export interface FruitSizeTier {
  tierId: string;
  label: string;
  minKg: number;
  maxKg: number;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  reserveWeightKg: number;
}

// 1. Preorder Round Document
export interface PreorderRound {
  id?: string | undefined;
  roundId: string;
  title: string;
  pickupDate: string;           // "2026-09-08"
  pickupLocation: string;       // "ท้ายรถลานจอดรถห้าง โซน B เสา 12"
  pickupSlots: string[];        // ["19:00 - 19:30", "19:30 - 20:00", "20:00 - 20:30", "21:00+"]
  promptPayNumber: string;      // KBank PromptPay phone or tax ID (e.g., "0812345678")
  promptPayName: string;        // "คุณอ้น (ธนาคารกสิกรไทย)"
  isOpen: boolean;              // Open for new customer pre-orders
  createdAt: number;
  updatedAt?: number | undefined;
}

// 2. Product Document
export interface ProductItem {
  id: string;
  roundId: string;
  name: string;                 // "เงาะโรงเรียนหวานกรอบ", "ทุเรียนหมอนทอง"
  mascotKey: 'ngo' | 'thurian' | 'mangkut' | 'longkong' | 'langsat' | 'som' | 'mamuang';
  imageUrl: string;             // Mascot transparent PNG or product image
  productType: ProductType;
  pricePerKg: number;
  totalQuotaKg: number;         // Maximum quota from orchard
  currentReservedKg: number;    // Real-time reserved amount

  // FIXED_WEIGHT specifics (Nong Aon rule: whole kg only, no .5 fractions)
  minKg?: number | undefined;   // 1
  stepKg?: number | undefined;  // 1
  bundles?: ProductBundle[] | undefined;

  // VARIABLE_WHOLE_FRUIT specifics (Durian)
  sizeTiers?: FruitSizeTier[] | undefined;
}

// 3. Customer Profile
export interface CustomerInfo {
  name: string;                 // e.g. "น้องอ้น Garmin"
  phone: string;                // e.g. "0812345678"
  floor: string;                // "ชั้น G", "ชั้น 1", "ชั้น 2", "ชั้น 3"
  shop: string;                 // "บูธ Garmin"
}

// 4. Item inside Order
export interface OrderItem {
  productId: string;
  productName: string;
  productType: ProductType;
  pricePerKg: number;
  mascotKey?: string | undefined;

  // FIXED_WEIGHT selection
  orderedBundle?: string | undefined;       // e.g. "3 กิโล 100 บาท"
  orderedKg?: number | undefined;           // e.g. 3

  // VARIABLE_WHOLE_FRUIT selection
  selectedTierId?: string | undefined;
  selectedTierLabel?: string | undefined;   // e.g. "ลูกกลาง (2.1 - 3.0 กก.)"

  // Admin Weighing Details at Tailgate
  actualWeighedKg?: number | undefined;     // e.g. 2.75
  itemFinalPrice?: number | undefined;      // e.g. 440
}

// 5. Customer Order Document
export interface Order {
  id?: string | undefined;
  orderId: string;              // "ORD-1082"
  roundId: string;
  customer: CustomerInfo;
  items: OrderItem[];
  pickupSlot: string;           // "19:00 - 19:30"
  orderStatus: OrderStatus;     // 'WAITING_PICKUP' | 'COMPLETED' | 'CANCELLED'

  paymentMethod: PaymentMethod; // 'PAY_AT_CAR' | 'PROMPTPAY_PREPAID'
  paymentStatus: PaymentStatus; // 'UNPAID' | 'VERIFYING_SLIP' | 'PAID'
  slipUrl?: string | undefined;

  totalEstimatedPrice: number;  // Initial estimation at checkout
  totalFinalPrice: number;      // Final price confirmed upon weighing / delivery

  paidAt?: number | undefined;
  completedAt?: number | undefined;
  createdAt: number;
  notes?: string | undefined;
}

// Admin Whitelist & App Session
export const ADMIN_WHITELIST_EMAILS = [
  'kwancanoe@gmail.com',
  'aon.garmin@gmail.com',
  'thaitravel@gmail.com'
];

export const MALL_FLOOR_OPTIONS = [
  'ชั้น B (ใต้ดิน)',
  'ชั้น G',
  'ชั้น 1',
  'ชั้น 2',
  'ชั้น 3',
  'ชั้น 4',
  'ชั้น 5'
];
