// Polymorphic Firestore Data Contracts & System Types for Fruit Drop

export type ProductType = 'FIXED_WEIGHT' | 'VARIABLE_WHOLE_FRUIT';
export type PaymentMethod = 'PAY_AT_CAR' | 'PROMPTPAY_PREPAID';
export type PaymentStatus = 'UNPAID' | 'VERIFYING_SLIP' | 'PAID';
export type OrderStatus = 'WAITING_PICKUP' | 'COMPLETED' | 'CANCELLED';

// 3-Tier RBAC Roles
export type UserRole = 'SYSTEM_ADMIN' | 'SHOP_OWNER' | 'SELLER';

// Hardware Device Telemetry Fingerprint (PWA Device UUID & Detected Model)
export interface DeviceFingerprint {
  deviceId: string;           // Persistent UUID e.g. "DEV-9c2b48..."
  deviceModel: string;        // e.g. "SM-S928B" (Galaxy S24), "iPhone", "Pixel 8"
  platform: string;           // e.g. "Android", "iOS", "Windows"
  userAgent?: string | undefined;
}

// System User Profile stored in Firestore 'users' collection
export interface AppUser {
  id?: string | undefined;
  email: string;              // Lowercased email (e.g. "wittinunt.k@gmail.com")
  displayName: string;        // "Wittinunt Khansuwan"
  phone: string;              // "0653539941"
  role: UserRole;             // 'SYSTEM_ADMIN' | 'SHOP_OWNER' | 'SELLER'
  isActive: boolean;          // Active status
  uid?: string | undefined;   // Firebase Auth UID
  createdAt: number;
  updatedAt?: number | undefined;
  createdById?: string | undefined;
  lastLoginAt?: number | undefined;
  lastLoginDevice?: DeviceFingerprint | undefined;
}

// Sales & Payment Attribution Audit Trail
export interface OrderAttribution {
  handledByUserId?: string | undefined;
  handledByEmail?: string | undefined;
  handledByName?: string | undefined;
  handledByRole?: UserRole | undefined;
  deviceFingerprint?: DeviceFingerprint | undefined;
  paymentModeAtHandover?: 'CASH' | 'TRANSFER' | undefined;
  proofCapturedAt?: number | undefined;
}

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
  pickupDate: string;           // e.g. "วันอังคารที่ 8 กันยายน 2569"
  pickupLocation: string;       // e.g. "ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B"
  pickupSlots: string[];        // ["19:00 - 19:30", "19:30 - 20:00", "20:00 - 20:30", "21:00+ (หลังห้างปิด)"]
  promptPayNumber: string;      // "0878902935"
  promptPayName: string;        // "นาตยา บุญณะ"
  bankName?: string | undefined;         // "กสิกรไทย (KBANK)"
  bankAccountNumber?: string | undefined;// "8172235408"
  bankAccountName?: string | undefined;  // "นาตยา บุญณะ"
  isOpen: boolean;              // Open for customer pre-orders
  fruitSummary?: string[] | undefined; // Quick preview list e.g. ["เงาะโรงเรียน", "ทุเรียนหมอนทอง"]
  createdAt: number;
  updatedAt?: number | undefined;
}

// Data payload for Admin creating/editing a round with selected fruits
export interface RoundCreationFruitConfig {
  fruitKey: 'ngo' | 'thurian' | 'mangkut' | 'longkong' | 'langsat' | 'som' | 'mamuang';
  name: string;
  productType: ProductType;
  pricePerKg: number;
  costPerKg: number;          // Cost of goods per kg (for profit-loss analysis)
  totalQuotaKg: number;
  isEnabled: boolean;
}

export interface RoundCreationPayload {
  title: string;
  pickupDate: string;
  pickupLocation: string;
  pickupSlots: string[];
  promptPayNumber: string;
  promptPayName: string;
  bankName?: string | undefined;
  bankAccountNumber?: string | undefined;
  bankAccountName?: string | undefined;
  isOpen?: boolean | undefined;
  fruits: RoundCreationFruitConfig[];
}

export interface RoundUpdatePayload {
  title: string;
  pickupDate: string;
  pickupLocation: string;
  pickupSlots: string[];
  promptPayNumber: string;
  promptPayName: string;
  bankName?: string | undefined;
  bankAccountNumber?: string | undefined;
  bankAccountName?: string | undefined;
  isOpen: boolean;
  fruits: RoundCreationFruitConfig[];
}

// 2. Product Document
export interface ProductItem {
  id: string;
  roundId: string;
  name: string;                 // "เงาะโรงเรียน", "ทุเรียนหมอนทอง"
  mascotKey: 'ngo' | 'thurian' | 'mangkut' | 'longkong' | 'langsat' | 'som' | 'mamuang';
  imageUrl: string;             // Mascot transparent PNG or product image
  productType: ProductType;
  pricePerKg: number;
  costPerKg?: number | undefined; // Cost price per kg (ต้นทุน)
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
  slipUrl?: string | undefined; // Customer pre-order slip
  proofUrl?: string | undefined; // Camera-captured proof photo (slip or cash handover)

  totalEstimatedPrice: number;  // Initial estimation at checkout
  totalFinalPrice: number;      // Final price confirmed upon weighing / delivery

  paidAt?: number | undefined;
  completedAt?: number | undefined;
  createdAt: number;
  notes?: string | undefined;

  // Attribution audit trail: who collected payment & what device was used
  attribution?: OrderAttribution | undefined;
}

// Bootstrap Whitelist (Admin fallback access)
export const ADMIN_WHITELIST_EMAILS = [
  'wittinunt.k@gmail.com',
  'natyabuyna089@gmail.com',
  'kwancanoe@gmail.com'
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
