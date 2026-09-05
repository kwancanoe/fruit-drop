// Pinia Store: Fruit Drop state management (Active Round, Products, Orders, and Admin Auth)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { db, auth, googleProvider } from '@/boot/firebase';
import type {
  PreorderRound,
  ProductItem,
  Order,
  OrderItem,
  CustomerInfo,
  PaymentMethod,
  PaymentStatus,
  OrderStatus
} from '@/types/fruit_app';
import { ADMIN_WHITELIST_EMAILS } from '@/types/fruit_app';

export const useFruitStore = defineStore('fruit', () => {
  // State
  const activeRound = ref<PreorderRound | null>(null);
  const products = ref<ProductItem[]>([]);
  const orders = ref<Order[]>([]);
  const isLoading = ref<boolean>(false);
  const authUser = ref<User | null>(null);

  // Firestore listeners
  let unsubscribeRound: Unsubscribe | null = null;
  let unsubscribeProducts: Unsubscribe | null = null;
  let unsubscribeOrders: Unsubscribe | null = null;

  // Computed
  const isAdmin = computed<boolean>(() => {
    if (!authUser.value || !authUser.value.email) return false;
    return ADMIN_WHITELIST_EMAILS.includes(authUser.value.email.toLowerCase());
  });

  const activeRoundId = computed<string>(() => activeRound.value?.roundId || 'ROUND-001');

  // Initialize Auth state listener
  function initAuth() {
    onAuthStateChanged(auth, (user) => {
      authUser.value = user;
    });
  }

  // Admin Google Sign-In
  async function loginAdmin() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      authUser.value = result.user;
      return result.user;
    } catch (error) {
      console.error('Firebase Auth Login Error:', error);
      throw error;
    }
  }

  // Admin Sign-Out
  async function logoutAdmin() {
    await signOut(auth);
    authUser.value = null;
  }

  // Subscribe to Active Round
  function subscribeToActiveRound() {
    if (unsubscribeRound) unsubscribeRound();

    const roundsRef = collection(db, 'rounds');
    const q = query(roundsRef, where('isOpen', '==', true));

    unsubscribeRound = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && snapshot.docs[0]) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as PreorderRound;
        activeRound.value = { ...data, id: docSnap.id };
        subscribeToProducts(data.roundId);
      } else {
        // Fallback default round if none exists in Firestore
        activeRound.value = {
          roundId: 'ROUND-001',
          title: 'เปิดรอบเงาะโรงเรียนหวานกรอบ & ทุเรียนหมอนทองสวนบ้านเรา',
          pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
          pickupLocation: 'ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B',
          pickupSlots: ['19:00 - 19:30', '19:30 - 20:00', '20:00 - 20:30', '21:00+ (หลังห้างปิด)'],
          promptPayNumber: '081-234-5678',
          promptPayName: 'คุณอ้น (ธ.กสิกรไทย)',
          isOpen: true,
          createdAt: Date.now()
        };
        subscribeToProducts('ROUND-001');
      }
    }, (error) => {
      console.warn('Snapshot active round error, using offline fallback:', error);
    });
  }

  // Subscribe to Products for a round
  function subscribeToProducts(roundId: string) {
    if (unsubscribeProducts) unsubscribeProducts();

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('roundId', '==', roundId));

    unsubscribeProducts = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        products.value = snapshot.docs.map(d => ({ ...d.data() as ProductItem, id: d.id }));
      } else {
        // Default product inventory with official transparent mascots
        products.value = getDefaultProducts(roundId);
      }
    }, (error) => {
      console.warn('Snapshot products error, using offline fallback:', error);
      products.value = getDefaultProducts(roundId);
    });
  }

  // Subscribe to Orders (Admin & Live Dashboard)
  function subscribeToOrders(roundId: string) {
    if (unsubscribeOrders) unsubscribeOrders();

    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('roundId', '==', roundId), orderBy('createdAt', 'desc'));

    unsubscribeOrders = onSnapshot(q, (snapshot) => {
      orders.value = snapshot.docs.map(d => ({ ...d.data() as Order, id: d.id }));
    }, (error) => {
      console.warn('Snapshot orders error:', error);
    });
  }

  // Place a new Order
  async function submitOrder(payload: {
    roundId: string;
    customer: CustomerInfo;
    items: OrderItem[];
    pickupSlot: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    totalEstimatedPrice: number;
  }): Promise<string> {
    isLoading.value = true;
    try {
      // Human-readable Order ID e.g. "FD-8421"
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderId = `FD-${randomSuffix}`;

      const newOrder: Order = {
        orderId,
        roundId: payload.roundId,
        customer: payload.customer,
        items: payload.items,
        pickupSlot: payload.pickupSlot,
        orderStatus: 'WAITING_PICKUP',
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        totalEstimatedPrice: payload.totalEstimatedPrice,
        totalFinalPrice: payload.totalEstimatedPrice,
        createdAt: Date.now()
      };

      const orderDocRef = doc(collection(db, 'orders'));
      await setDoc(orderDocRef, newOrder);

      // Local array optimistic append
      orders.value = [newOrder, ...orders.value];

      return orderId;
    } finally {
      isLoading.value = false;
    }
  }

  // Admin: Update Weighed Fruit (Durian scale calculator)
  async function updateWeighedFruit(orderId: string, itemIndex: number, actualKg: number, finalItemPrice: number) {
    const targetOrder = orders.value.find(o => o.orderId === orderId);
    if (!targetOrder) return;

    const itemToUpdate = targetOrder.items[itemIndex];
    if (!itemToUpdate) return;

    itemToUpdate.actualWeighedKg = actualKg;
    itemToUpdate.itemFinalPrice = finalItemPrice;

    // Recalculate total final price
    let sum = 0;
    for (const item of targetOrder.items) {
      if (item.itemFinalPrice !== undefined) {
        sum += item.itemFinalPrice;
      } else {
        sum += (item.orderedKg || 1) * item.pricePerKg;
      }
    }
    targetOrder.totalFinalPrice = sum;

    // Sync to Firestore if document id exists
    if (targetOrder.id) {
      await updateDoc(doc(db, 'orders', targetOrder.id), {
        items: targetOrder.items,
        totalFinalPrice: sum,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Admin: Update Order Status (Mark delivered, cash collected, etc.)
  async function updateOrderStatus(orderId: string, updates: Partial<Order>) {
    const targetOrder = orders.value.find(o => o.orderId === orderId);
    if (!targetOrder) return;

    Object.assign(targetOrder, updates);

    if (targetOrder.id) {
      await updateDoc(doc(db, 'orders', targetOrder.id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Seed default master products to Firestore
  async function seedMasterData() {
    const roundDoc = doc(db, 'rounds', 'ROUND-001');
    const defaultRound: PreorderRound = {
      roundId: 'ROUND-001',
      title: 'เปิดรอบเงาะโรงเรียนหวานกรอบ & ทุเรียนหมอนทองสวนบ้านเรา',
      pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
      pickupLocation: 'ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B',
      pickupSlots: ['19:00 - 19:30', '19:30 - 20:00', '20:00 - 20:30', '21:00+ (หลังห้างปิด)'],
      promptPayNumber: '081-234-5678',
      promptPayName: 'คุณอ้น (ธ.กสิกรไทย)',
      isOpen: true,
      createdAt: Date.now()
    };
    await setDoc(roundDoc, defaultRound);

    const defaultItems = getDefaultProducts('ROUND-001');
    for (const item of defaultItems) {
      await setDoc(doc(db, 'products', item.id), item);
    }
  }

  return {
    activeRound,
    products,
    orders,
    isLoading,
    authUser,
    isAdmin,
    activeRoundId,
    initAuth,
    loginAdmin,
    logoutAdmin,
    subscribeToActiveRound,
    subscribeToProducts,
    subscribeToOrders,
    submitOrder,
    updateWeighedFruit,
    updateOrderStatus,
    seedMasterData
  };
});

// Default product catalog with transparent PNG mascots
function getDefaultProducts(roundId: string): ProductItem[] {
  return [
    {
      id: 'PROD-NGO',
      roundId,
      name: 'เงาะโรงเรียน หวานกรอบ สวนบ้านเรา',
      mascotKey: 'ngo',
      imageUrl: '/mascots/mascot_ngo.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 35,
      totalQuotaKg: 200,
      currentReservedKg: 42,
      minKg: 1,
      stepKg: 1,
      bundles: [
        { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
        { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' },
        { qtyKg: 9, price: 300, label: 'ชุด 9 กก. (300 บาท)' }
      ]
    },
    {
      id: 'PROD-THURIAN',
      roundId,
      name: 'ทุเรียนหมอนทอง แก่จัดตัดสดจากต้น',
      mascotKey: 'thurian',
      imageUrl: '/mascots/mascot_thurian.png',
      productType: 'VARIABLE_WHOLE_FRUIT',
      pricePerKg: 160,
      totalQuotaKg: 150,
      currentReservedKg: 35,
      sizeTiers: [
        {
          tierId: 'TIER-SMALL',
          label: 'ลูกเล็ก (1.8 - 2.0 กก.)',
          minKg: 1.8,
          maxKg: 2.0,
          estimatedPriceMin: 288,
          estimatedPriceMax: 320,
          reserveWeightKg: 1.9
        },
        {
          tierId: 'TIER-MEDIUM',
          label: 'ลูกกลาง (2.1 - 3.0 กก.) ★ ยอดนิยม',
          minKg: 2.1,
          maxKg: 3.0,
          estimatedPriceMin: 336,
          estimatedPriceMax: 480,
          reserveWeightKg: 2.5
        },
        {
          tierId: 'TIER-LARGE',
          label: 'ลูกใหญ่ (3.1 - 4.0 กก.)',
          minKg: 3.1,
          maxKg: 4.0,
          estimatedPriceMin: 496,
          estimatedPriceMax: 640,
          reserveWeightKg: 3.5
        }
      ]
    },
    {
      id: 'PROD-MANGKUT',
      roundId,
      name: 'มังคุดคัดเกรด ราชินีผลไม้ ผิวมันหวานอมเปรี้ยว',
      mascotKey: 'mangkut',
      imageUrl: '/mascots/mascot_mangkut.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 50,
      totalQuotaKg: 100,
      currentReservedKg: 18,
      minKg: 1,
      stepKg: 1,
      bundles: [
        { qtyKg: 2, price: 100, label: 'ชุด 2 กก. (100 บาท)' },
        { qtyKg: 5, price: 240, label: 'ชุด 5 กก. (240 บาท)' }
      ]
    },
    {
      id: 'PROD-LONGKONG',
      roundId,
      name: 'ลองกองตันหยงมัส ช่อแน่น หวานฉ่ำ',
      mascotKey: 'longkong',
      imageUrl: '/mascots/mascot_longkong.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 45,
      totalQuotaKg: 80,
      currentReservedKg: 15,
      minKg: 1,
      stepKg: 1,
      bundles: [
        { qtyKg: 3, price: 130, label: 'ชุด 3 กก. (130 บาท)' }
      ]
    },
    {
      id: 'PROD-LANGSAT',
      roundId,
      name: 'ลางสาดหวานชื่นใจ ส่งตรงจากสวน',
      mascotKey: 'langsat',
      imageUrl: '/mascots/mascot_langsat.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 40,
      totalQuotaKg: 60,
      currentReservedKg: 8,
      minKg: 1,
      stepKg: 1
    },
    {
      id: 'PROD-SOM',
      roundId,
      name: 'ส้มสายน้ำผึ้ง รสเข้มหวานฉ่ำ',
      mascotKey: 'som',
      imageUrl: '/mascots/mascot_som.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 60,
      totalQuotaKg: 80,
      currentReservedKg: 12,
      minKg: 1,
      stepKg: 1
    },
    {
      id: 'PROD-MAMUANG',
      roundId,
      name: 'มะม่วงน้ำดอกไม้สีทอง สุกธรรมชาติหอมหวาน',
      mascotKey: 'mamuang',
      imageUrl: '/mascots/mascot_mamuang.png',
      productType: 'FIXED_WEIGHT',
      pricePerKg: 50,
      totalQuotaKg: 80,
      currentReservedKg: 20,
      minKg: 1,
      stepKg: 1
    }
  ];
}
