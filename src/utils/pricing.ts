// Module: Centralized pricing calculation engine with bundle discounts and variable weight support
import type { OrderItem, ProductItem, Order } from '@/types/fruit_app';

/**
 * Calculates the exact subtotal price for an individual order item.
 * Supports explicit final prices, variable whole fruit (durian), bundle discounts, and catalog lookups.
 */
export function calculateItemSubtotal(item: OrderItem, products?: ProductItem[]): number {
  // Check 1: Explicit 0 quantity check for fixed weight items (fixes zero-kg fallback bug)
  const orderedKg = typeof item.orderedKg === 'number' ? item.orderedKg : Number(item.orderedKg);
  if (item.productType === 'FIXED_WEIGHT' && (orderedKg === 0 || isNaN(orderedKg) || orderedKg < 0)) {
    return 0;
  }

  // Check 2: Return explicit final price if already computed and stored
  if (typeof item.itemFinalPrice === 'number' && !isNaN(item.itemFinalPrice)) {
    return item.itemFinalPrice;
  }

  // Check 3: Variable weight durian item (weighed at tailgate desk)
  if (item.productType === 'VARIABLE_WHOLE_FRUIT') {
    if (typeof item.actualWeighedKg === 'number' && item.actualWeighedKg > 0) {
      return Math.round(item.actualWeighedKg * (item.pricePerKg || 0));
    }
    return 0; // Weighing pending at tailgate desk
  }

  // Check 4: Typed bundle price snapshot directly on OrderItem contract
  if (
    typeof item.bundlePrice === 'number' &&
    !isNaN(item.bundlePrice) &&
    item.bundlePrice > 0 &&
    (item.bundleQtyKg === undefined || item.bundleQtyKg === orderedKg)
  ) {
    return item.bundlePrice;
  }

  // Check 5: Typed contract match against product catalog bundles
  if (products && products.length > 0) {
    const product = products.find(p => p.id === item.productId);
    if (product?.bundles && product.bundles.length > 0) {
      const matchingBundle = product.bundles.find(
        b => b.qtyKg === orderedKg || (item.orderedBundle && b.label === item.orderedBundle)
      );
      if (matchingBundle) {
        return matchingBundle.price;
      }
    }
  }

  // Safe fallback: Standard kg * price per kg (0 kg returns 0, NaN returns 0)
  if (isNaN(orderedKg) || orderedKg <= 0) {
    return 0;
  }
  return Math.round(orderedKg * (item.pricePerKg || 0));
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

/**
 * Calculates the net weight of a fruit item after deducting container/packaging tare weight.
 * Guards against negative net weight, NaN, or tare exceeding gross.
 * Rounds to 3 decimal places (gram precision).
 */
export function calculateNetWeight(grossKg: number, tareKg: number = 0): number {
  const g = typeof grossKg === 'number' ? grossKg : Number(grossKg);
  const t = typeof tareKg === 'number' ? tareKg : Number(tareKg);
  if (isNaN(g) || isNaN(t) || g <= 0 || t < 0 || g <= t) {
    return 0;
  }
  return Math.round((g - t) * 1000) / 1000;
}

/**
 * Calculates the final price for a weighed durian item based on net weight and pricePerKg.
 */
export function calculateWeighedFruitPrice(netKg: number, pricePerKg: number): number {
  const k = typeof netKg === 'number' ? netKg : Number(netKg);
  const p = typeof pricePerKg === 'number' ? pricePerKg : Number(pricePerKg);
  if (isNaN(k) || k <= 0 || isNaN(p) || p <= 0) {
    return 0;
  }
  return Math.round(k * p);
}

/**
 * Calculates the total cash collected in hand from completed cash orders.
 * Strictly checks attribution.paymentModeAtHandover === 'CASH' or legacy PAY_AT_CAR fallback.
 */
export function calculateCashInHandTotal(
  orders: Array<Pick<Order, 'orderStatus' | 'paymentMethod' | 'attribution' | 'totalFinalPrice' | 'totalEstimatedPrice'>>
): number {
  return orders
    .filter(o =>
      o.orderStatus === 'COMPLETED' &&
      (o.attribution?.paymentModeAtHandover === 'CASH' ||
       (!o.attribution?.paymentModeAtHandover && o.paymentMethod === 'PAY_AT_CAR'))
    )
    .reduce((sum, o) => sum + (o.totalFinalPrice ?? o.totalEstimatedPrice ?? 0), 0);
}

/**
 * Calculates the total bank transfer amount (PromptPay prepaid or at-car transfer) for non-cancelled paid orders.
 */
export function calculatePrepaidTransferTotal(
  orders: Array<Pick<Order, 'orderStatus' | 'paymentMethod' | 'paymentStatus' | 'attribution' | 'totalFinalPrice' | 'totalEstimatedPrice'>>
): number {
  return orders
    .filter(o =>
      o.orderStatus !== 'CANCELLED' &&
      o.paymentStatus === 'PAID' &&
      (o.attribution?.paymentModeAtHandover === 'TRANSFER' ||
       (!o.attribution?.paymentModeAtHandover && o.paymentMethod === 'PROMPTPAY_PREPAID'))
    )
    .reduce((sum, o) => sum + (o.totalFinalPrice ?? o.totalEstimatedPrice ?? 0), 0);
}

