// Module: Centralized pricing calculation engine with bundle discounts and variable weight support
import type { OrderItem, ProductItem } from '@/types/fruit_app';

/**
 * Calculates the exact subtotal price for an individual order item.
 * Supports explicit final prices, variable whole fruit (durian), bundle discounts, and catalog lookups.
 */
export function calculateItemSubtotal(item: OrderItem, products?: ProductItem[]): number {
  // Check 1: Return explicit final price if already computed and stored
  if (typeof item.itemFinalPrice === 'number' && !isNaN(item.itemFinalPrice)) {
    return item.itemFinalPrice;
  }

  // Check 2: Variable weight durian item
  if (item.productType === 'VARIABLE_WHOLE_FRUIT') {
    if (item.actualWeighedKg && item.actualWeighedKg > 0) {
      return Math.round(item.actualWeighedKg * item.pricePerKg);
    }
    return 0; // Weighing pending at tailgate desk
  }

  // Check 3: Extract price from orderedBundle label string e.g. "ชุด 3 กก. (100 บาท)"
  if (item.orderedBundle) {
    const match = item.orderedBundle.match(/(\d+)\s*บาท/);
    if (match && match[1]) {
      const bundlePrice = parseInt(match[1], 10);
      if (!isNaN(bundlePrice) && bundlePrice > 0) {
        return bundlePrice;
      }
    }
  }

  // Check 4: Match against product catalog bundles if products are provided
  if (products && products.length > 0) {
    const product = products.find(p => p.id === item.productId);
    if (product?.bundles && product.bundles.length > 0) {
      const matchingBundle = product.bundles.find(b => b.qtyKg === item.orderedKg);
      if (matchingBundle) {
        return matchingBundle.price;
      }
    }
  }

  // Fallback: Standard kg * price per kg
  return (Number(item.orderedKg) || 1) * item.pricePerKg;
}

/**
 * Calculates the grand total final price for an array of order items.
 */
export function calculateOrderFinalTotal(items: OrderItem[], products?: ProductItem[]): number {
  let grandTotal = 0;
  for (const item of items) {
    grandTotal += calculateItemSubtotal(item, products);
  }
  return grandTotal;
}
