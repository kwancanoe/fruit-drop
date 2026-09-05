// Scripts: Seed Real Live Master Data to Firestore for Fruit Drop
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBOuMmeEjp3uyTLRzox8q2SHONS3agbQog',
  authDomain: 'fruit-drop-aon.firebaseapp.com',
  projectId: 'fruit-drop-aon',
  storageBucket: 'fruit-drop-aon.firebasestorage.app',
  messagingSenderId: '660120514549',
  appId: '1:660120514549:web:d5eae93b24dc81392fbabc',
  measurementId: 'G-Z5B02G22E6'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('Seeding real master data to Firestore for fruit-drop-aon...');

  // 1. Users
  console.log('1. Seeding users...');
  await setDoc(doc(db, 'users', 'wittinunt.k@gmail.com'), {
    email: 'wittinunt.k@gmail.com',
    displayName: 'Wittinunt Khansuwan',
    phone: '0653539941',
    role: 'SYSTEM_ADMIN',
    isActive: true,
    createdAt: Date.now()
  });

  await setDoc(doc(db, 'users', 'natyabuyna089@gmail.com'), {
    email: 'natyabuyna089@gmail.com',
    displayName: 'นาตยา บุญณะ',
    phone: '0878902935',
    role: 'SHOP_OWNER',
    bankName: 'KBANK (กสิกรไทย)',
    bankAccountNumber: '8172235408',
    promptPayNumber: '0878902935',
    promptPayName: 'นาตยา บุญณะ',
    isActive: true,
    createdAt: Date.now()
  });

  // 2. Rounds
  console.log('2. Seeding active round ROUND-001...');
  await setDoc(doc(db, 'rounds', 'ROUND-001'), {
    roundId: 'ROUND-001',
    title: 'รอบส่งผลไม้ วันอังคาร 8 ก.ย.',
    pickupDate: 'วันอังคารที่ 8 กันยายน 2569',
    pickupLocation: 'ท้ายรถลานจอดรถห้าง เสา B12 ชั้น 1B',
    pickupSlots: [
      '19:00 - 19:30',
      '19:30 - 20:00',
      '20:00 - 20:30',
      '21:00+ (หลังห้างปิด)'
    ],
    promptPayNumber: '0878902935',
    promptPayName: 'นาตยา บุญณะ',
    bankName: 'KBANK (กสิกรไทย)',
    bankAccountNumber: '8172235408',
    bankAccountName: 'นาตยา บุญณะ',
    isOpen: true,
    fruitSummary: ['เงาะโรงเรียน', 'ทุเรียนหมอนทอง', 'มังคุด', 'ลองกอง'],
    createdAt: Date.now()
  });

  // 3. Products for ROUND-001
  console.log('3. Seeding products with clean sizeTiers and bundles...');
  await setDoc(doc(db, 'products', 'PROD-ROUND-001-NGO'), {
    id: 'PROD-ROUND-001-NGO',
    roundId: 'ROUND-001',
    name: 'เงาะโรงเรียน',
    mascotKey: 'ngo',
    imageUrl: '/mascots/mascot_ngo.png',
    productType: 'FIXED_WEIGHT',
    pricePerKg: 35,
    costPerKg: 20,
    totalQuotaKg: 200,
    currentReservedKg: 0,
    minKg: 1,
    stepKg: 1,
    bundles: [
      { qtyKg: 3, price: 100, label: 'ชุด 3 กก. (100 บาท)' },
      { qtyKg: 6, price: 200, label: 'ชุด 6 กก. (200 บาท)' },
      { qtyKg: 9, price: 300, label: 'ชุด 9 กก. (300 บาท)' }
    ]
  });

  await setDoc(doc(db, 'products', 'PROD-ROUND-001-THURIAN'), {
    id: 'PROD-ROUND-001-THURIAN',
    roundId: 'ROUND-001',
    name: 'ทุเรียนหมอนทอง',
    mascotKey: 'thurian',
    imageUrl: '/mascots/mascot_thurian.png',
    productType: 'VARIABLE_WHOLE_FRUIT',
    pricePerKg: 160,
    costPerKg: 110,
    totalQuotaKg: 150,
    currentReservedKg: 0,
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
        label: 'ลูกกลาง (2.1 - 3.0 กก.)',
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
  });

  await setDoc(doc(db, 'products', 'PROD-ROUND-001-MANGKUT'), {
    id: 'PROD-ROUND-001-MANGKUT',
    roundId: 'ROUND-001',
    name: 'มังคุด',
    mascotKey: 'mangkut',
    imageUrl: '/mascots/mascot_mangkut.png',
    productType: 'FIXED_WEIGHT',
    pricePerKg: 50,
    costPerKg: 30,
    totalQuotaKg: 100,
    currentReservedKg: 0,
    minKg: 1,
    stepKg: 1,
    bundles: [
      { qtyKg: 3, price: 150, label: 'ชุด 3 กก. (150 บาท)' },
      { qtyKg: 5, price: 240, label: 'ชุด 5 กก. (240 บาท)' }
    ]
  });

  await setDoc(doc(db, 'products', 'PROD-ROUND-001-LONGKONG'), {
    id: 'PROD-ROUND-001-LONGKONG',
    roundId: 'ROUND-001',
    name: 'ลองกอง',
    mascotKey: 'longkong',
    imageUrl: '/mascots/mascot_longkong.png',
    productType: 'FIXED_WEIGHT',
    pricePerKg: 45,
    costPerKg: 25,
    totalQuotaKg: 80,
    currentReservedKg: 0,
    minKg: 1,
    stepKg: 1,
    bundles: [
      { qtyKg: 3, price: 130, label: 'ชุด 3 กก. (130 บาท)' }
    ]
  });

  // 4. Sample Realistic Orders for ROUND-001
  console.log('4. Seeding sample realistic orders for ROUND-001...');
  const sampleOrders = [
    {
      orderId: 'FD-1001',
      roundId: 'ROUND-001',
      customer: {
        name: 'คุณพิมพ์',
        phone: '0812345678',
        floor: 'ชั้น 2',
        shop: 'บูธ Garmin'
      },
      items: [
        {
          productId: 'PROD-ROUND-001-NGO',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          mascotKey: 'ngo',
          orderedBundle: 'ชุด 3 กก. (100 บาท)',
          orderedKg: 3,
          itemFinalPrice: 100
        },
        {
          productId: 'PROD-ROUND-001-THURIAN',
          productName: 'ทุเรียนหมอนทอง',
          productType: 'VARIABLE_WHOLE_FRUIT',
          pricePerKg: 160,
          mascotKey: 'thurian',
          selectedTierId: 'TIER-SMALL',
          selectedTierLabel: 'ลูกเล็ก (1.8 - 2.0 กก.)',
          actualWeighedKg: 1.9,
          itemFinalPrice: 304
        }
      ],
      pickupSlot: '19:00 - 19:30',
      orderStatus: 'COMPLETED',
      paymentMethod: 'PAY_AT_CAR',
      paymentStatus: 'PAID',
      totalEstimatedPrice: 404,
      totalFinalPrice: 404,
      paidAt: Date.now() - 3600000,
      completedAt: Date.now() - 3600000,
      createdAt: Date.now() - 7200000,
      attribution: {
        handledByUserId: 'admin-seed',
        handledByEmail: 'wittinunt.k@gmail.com',
        handledByName: 'Wittinunt Khansuwan',
        handledByRole: 'SYSTEM_ADMIN',
        paymentModeAtHandover: 'CASH',
        proofCapturedAt: Date.now() - 3600000
      }
    },
    {
      orderId: 'FD-1002',
      roundId: 'ROUND-001',
      customer: {
        name: 'ช่างเอก',
        phone: '0898765432',
        floor: 'ชั้น 3',
        shop: 'ศูนย์ AIS'
      },
      items: [
        {
          productId: 'PROD-ROUND-001-NGO',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          mascotKey: 'ngo',
          orderedBundle: 'ชุด 6 กก. (200 บาท)',
          orderedKg: 6,
          itemFinalPrice: 200
        },
        {
          productId: 'PROD-ROUND-001-MANGKUT',
          productName: 'มังคุด',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 50,
          mascotKey: 'mangkut',
          orderedBundle: 'ชุด 3 กก. (150 บาท)',
          orderedKg: 3,
          itemFinalPrice: 150
        }
      ],
      pickupSlot: '19:30 - 20:00',
      orderStatus: 'COMPLETED',
      paymentMethod: 'PROMPTPAY_PREPAID',
      paymentStatus: 'PAID',
      totalEstimatedPrice: 350,
      totalFinalPrice: 350,
      paidAt: Date.now() - 5400000,
      completedAt: Date.now() - 3000000,
      createdAt: Date.now() - 7000000,
      attribution: {
        handledByUserId: 'owner-seed',
        handledByEmail: 'natyabuyna089@gmail.com',
        handledByName: 'นาตยา บุญณะ',
        handledByRole: 'SHOP_OWNER',
        paymentModeAtHandover: 'TRANSFER',
        proofCapturedAt: Date.now() - 3000000
      }
    },
    {
      orderId: 'FD-1003',
      roundId: 'ROUND-001',
      customer: {
        name: 'พี่นก',
        phone: '0861122334',
        floor: 'ชั้น 1',
        shop: 'ธนาคารกรุงเทพ'
      },
      items: [
        {
          productId: 'PROD-ROUND-001-THURIAN',
          productName: 'ทุเรียนหมอนทอง',
          productType: 'VARIABLE_WHOLE_FRUIT',
          pricePerKg: 160,
          mascotKey: 'thurian',
          selectedTierId: 'TIER-MEDIUM',
          selectedTierLabel: 'ลูกกลาง (2.1 - 3.0 กก.)'
        },
        {
          productId: 'PROD-ROUND-001-LONGKONG',
          productName: 'ลองกอง',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 45,
          mascotKey: 'longkong',
          orderedBundle: 'ชุด 3 กก. (130 บาท)',
          orderedKg: 3,
          itemFinalPrice: 130
        }
      ],
      pickupSlot: '20:00 - 20:30',
      orderStatus: 'WAITING_PICKUP',
      paymentMethod: 'PAY_AT_CAR',
      paymentStatus: 'UNPAID',
      totalEstimatedPrice: 530,
      totalFinalPrice: 530,
      createdAt: Date.now() - 6000000
    },
    {
      orderId: 'FD-1004',
      roundId: 'ROUND-001',
      customer: {
        name: 'น้องเบนซ์',
        phone: '0859988776',
        floor: 'ชั้น G',
        shop: 'ร้านกาแฟ Cafe Ame'
      },
      items: [
        {
          productId: 'PROD-ROUND-001-NGO',
          productName: 'เงาะโรงเรียน',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 35,
          mascotKey: 'ngo',
          orderedBundle: 'ชุด 3 กก. (100 บาท)',
          orderedKg: 3,
          itemFinalPrice: 100
        },
        {
          productId: 'PROD-ROUND-001-MANGKUT',
          productName: 'มังคุด',
          productType: 'FIXED_WEIGHT',
          pricePerKg: 50,
          mascotKey: 'mangkut',
          orderedBundle: 'ชุด 3 กก. (150 บาท)',
          orderedKg: 3,
          itemFinalPrice: 150
        }
      ],
      pickupSlot: '19:00 - 19:30',
      orderStatus: 'WAITING_PICKUP',
      paymentMethod: 'PROMPTPAY_PREPAID',
      paymentStatus: 'PAID',
      totalEstimatedPrice: 250,
      totalFinalPrice: 250,
      paidAt: Date.now() - 4000000,
      createdAt: Date.now() - 5000000
    }
  ];

  for (const ord of sampleOrders) {
    await setDoc(doc(db, 'orders', ord.orderId), ord);
  }

  console.log('Seeding completed successfully with 4 sample orders!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
