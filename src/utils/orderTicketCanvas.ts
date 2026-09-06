// Utility to export order ticket images with embedded QR codes
// Supports 1:1 pixel-perfect DOM capture via html-to-image and canvas fallback
import { toBlob } from 'html-to-image';
import type { Order } from '@/types/fruit_app';

// Options passed to order ticket export engine
export interface ExportTicketOptions {
  cardElement?: HTMLElement | null;
  order: Order;
  qrDataUrl: string;
  pickupLocation?: string;
}

// Deliver blob to user: Direct file download on ALL platforms (PC, iOS, Android)
export function deliverOrderTicketBlob(
  blob: Blob,
  orderId: string
): boolean {
  const fileName = `FruitDrop-Order-${orderId}.png`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// Helper: Rounded rectangle on 2D canvas
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = false
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Canvas Fallback Renderer (includes authentic Fruit Drop mascot logo)
export async function generateOrderTicketCanvas(options: ExportTicketOptions): Promise<HTMLCanvasElement> {
  const { order, qrDataUrl, pickupLocation = 'ท้ายรถลานจอดรถห้าง' } = options;

  const width = 750;
  const itemsCount = order.items && order.items.length > 0 ? order.items.length : 1;
  const itemsBlockHeight = 50 + (itemsCount * 62) + 20;
  const totalHeight = 1100 + itemsBlockHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const fontRegular = '-apple-system, BlinkMacSystemFont, "Sarabun", "Noto Sans Thai", "Thonburi", Roboto, sans-serif';

  // 1. Outer Background
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, width, totalHeight);

  // 2. Main Card Surface
  const cardX = 35;
  const cardY = 35;
  const cardWidth = width - 70;
  const cardHeight = totalHeight - 70;
  const cardRadius = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, true, false);
  ctx.restore();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, false, true);

  // Clip within card for top banner
  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, false, false);
  ctx.clip();

  // 3. Header Banner with Orchard Green Gradient
  const headerHeight = 150;
  const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + headerHeight);
  headerGrad.addColorStop(0, '#2E7D32');
  headerGrad.addColorStop(1, '#1B5E20');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(cardX, cardY, cardWidth, headerHeight);

  // Load and draw authentic Fruit Drop Mascot Logo
  const logoImg = new Image();
  logoImg.src = '/mascots/logo_fruit_drop.png';
  try {
    await new Promise<void>((resolve) => {
      if (logoImg.complete && logoImg.naturalWidth > 0) resolve();
      else {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      }
    });

    if (logoImg.naturalWidth > 0) {
      const logoRadius = 24;
      const logoCenterY = cardY + 45;
      const logoCenterX = width / 2 - 100;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.clip();
      ctx.drawImage(logoImg, logoCenterX - logoRadius + 2, logoCenterY - logoRadius + 2, (logoRadius - 2) * 2, (logoRadius - 2) * 2);
      ctx.restore();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 30px ${fontRegular}`;
      ctx.textAlign = 'left';
      ctx.fillText('Fruit Drop', logoCenterX + 36, logoCenterY + 10);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 30px ${fontRegular}`;
      ctx.textAlign = 'center';
      ctx.fillText('Fruit Drop', width / 2, cardY + 54);
    }
  } catch {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 30px ${fontRegular}`;
    ctx.textAlign = 'center';
    ctx.fillText('Fruit Drop', width / 2, cardY + 54);
  }

  // Subtitle
  ctx.fillStyle = '#DCEDC8';
  ctx.font = `18px ${fontRegular}`;
  ctx.textAlign = 'center';
  ctx.fillText('สั่งจองผลไม้ • บัตรคิวรับของ', width / 2, cardY + 92);

  // Success Pill Badge
  ctx.fillStyle = '#FFFFFF';
  const badgeW = 200;
  const badgeH = 32;
  const badgeX = (width - badgeW) / 2;
  const badgeY = cardY + 106;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 16, true, false);

  ctx.fillStyle = '#1B5E20';
  ctx.font = `bold 16px ${fontRegular}`;
  ctx.fillText('✓ สั่งจองสำเร็จ', width / 2, badgeY + 22);
  ctx.restore(); // End clipping

  // 4. Order ID & QR Code Box (Tight & clean proportions)
  let currentY = cardY + headerHeight + 25;
  const innerMargin = 30;
  const blockW = cardWidth - (innerMargin * 2);
  const blockX = cardX + innerMargin;

  const qrBoxHeight = 330;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, blockX, currentY, blockW, qrBoxHeight, 18, true, true);

  ctx.fillStyle = '#64748B';
  ctx.font = `17px ${fontRegular}`;
  ctx.textAlign = 'center';
  ctx.fillText('รหัสออเดอร์', width / 2, currentY + 30);

  ctx.fillStyle = '#2E7D32';
  ctx.font = `bold 46px ${fontRegular}`;
  ctx.fillText(`#${order.orderId}`, width / 2, currentY + 74);

  if (qrDataUrl) {
    const qrSize = 220;
    const qrX = (width - qrSize) / 2;
    const qrY = currentY + 90;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12, true, true);

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise<void>((resolve) => {
      if (qrImg.complete) resolve();
      else {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
      }
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  currentY += qrBoxHeight + 20;

  // 5. Customer Info Box
  const customerBoxH = 135;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, blockX, currentY, blockW, customerBoxH, 16, true, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = `bold 19px ${fontRegular}`;
  ctx.fillText('ข้อมูลผู้สั่ง:', blockX + 22, currentY + 34);

  ctx.fillStyle = '#334155';
  ctx.font = `18px ${fontRegular}`;
  ctx.fillText(`ชื่อ: ${order.customer.name}`, blockX + 22, currentY + 68);
  ctx.fillText(`ร้าน/ชั้น: ${order.customer.shop} (${order.customer.floor})`, blockX + 22, currentY + 96);
  ctx.fillText(`เบอร์โทร: ${order.customer.phone}`, blockX + 22, currentY + 124);

  currentY += customerBoxH + 20;

  // 6. Ordered Items Box
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, blockX, currentY, blockW, itemsBlockHeight, 16, true, true);

  ctx.fillStyle = '#1E293B';
  ctx.font = `bold 19px ${fontRegular}`;
  ctx.fillText('รายการผลไม้:', blockX + 22, currentY + 34);

  let itemY = currentY + 68;
  order.items.forEach((item, idx) => {
    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 18px ${fontRegular}`;
    ctx.fillText(`• ${item.productName}`, blockX + 22, itemY);

    let detailStr = '';
    if (item.productType === 'FIXED_WEIGHT') {
      detailStr = `จำนวน ${item.orderedKg} กก. ${item.orderedBundle ? `(${item.orderedBundle})` : ''}`;
    } else {
      detailStr = `${item.selectedTierLabel || '1 ลูก'} (ชั่งจริงคิดเงินที่รถ)`;
    }

    ctx.fillStyle = '#64748B';
    ctx.font = `16px ${fontRegular}`;
    ctx.fillText(detailStr, blockX + 42, itemY + 24);

    if (idx < order.items.length - 1) {
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(blockX + 22, itemY + 38);
      ctx.lineTo(blockX + blockW - 22, itemY + 38);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    itemY += 62;
  });

  currentY += itemsBlockHeight + 20;

  // 7. Pickup Appointment Box
  const pickupBoxH = 110;
  ctx.fillStyle = '#E8F5E9';
  ctx.strokeStyle = 'rgba(46, 125, 50, 0.35)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, blockX, currentY, blockW, pickupBoxH, 16, true, true);

  ctx.fillStyle = '#1B5E20';
  ctx.font = `bold 19px ${fontRegular}`;
  ctx.fillText('เวลานัดรับสินค้า:', blockX + 22, currentY + 34);

  ctx.fillStyle = '#2E7D32';
  ctx.font = `bold 21px ${fontRegular}`;
  ctx.fillText(`รอบเวลา ${order.pickupSlot}`, blockX + 22, currentY + 68);

  ctx.fillStyle = '#388E3C';
  ctx.font = `17px ${fontRegular}`;
  ctx.fillText(`จุดนัดรับ: ${pickupLocation}`, blockX + 22, currentY + 96);

  currentY += pickupBoxH + 20;

  // 8. Payment Summary Box
  const paymentBoxH = 100;
  ctx.fillStyle = '#FFF8E1';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, blockX, currentY, blockW, paymentBoxH, 16, true, true);

  ctx.fillStyle = '#92400E';
  ctx.font = `17px ${fontRegular}`;
  const payMethodText = order.paymentMethod === 'PAY_AT_CAR' ? 'จ่ายตอนรับสินค้า (เงินสด / สแกน QR)' : 'โอนล่วงหน้า';
  ctx.fillText(`วิธีชำระ: ${payMethodText}`, blockX + 22, currentY + 40);
  ctx.fillText('ตรวจรับผลไม้ก่อนชำระเงิน', blockX + 22, currentY + 70);

  const totalAmount = order.totalFinalPrice || order.totalEstimatedPrice || 0;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#78350F';
  ctx.font = `16px ${fontRegular}`;
  ctx.fillText('ยอดรวมประมาณ', blockX + blockW - 22, currentY + 38);

  ctx.fillStyle = '#2E7D32';
  ctx.font = `bold 30px ${fontRegular}`;
  ctx.fillText(`${totalAmount} บาท`, blockX + blockW - 22, currentY + 74);

  currentY += paymentBoxH + 25;

  // 9. Footer Notice & Brand Watermark
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1B5E20';
  ctx.font = `bold 17px ${fontRegular}`;
  ctx.fillText('แสดงภาพนี้เพื่อรับสินค้าท้ายรถ', width / 2, currentY + 16);

  ctx.fillStyle = '#94A3B8';
  ctx.font = `15px ${fontRegular}`;
  ctx.fillText('Fruit Drop • สั่งจองผลไม้สด', width / 2, currentY + 44);

  return canvas;
}

// Master Export Function: Captures exact on-screen DOM card with temporary button collapse for tight height
export async function exportOrderTicket(options: ExportTicketOptions): Promise<boolean> {
  const { cardElement, order } = options;

  // 1. Primary Method: Capture exact on-screen DOM card using html-to-image
  if (cardElement) {
    // Temporarily collapse elements marked .hide-on-capture to get exact tight ticket dimensions
    const hiddenElements = cardElement.querySelectorAll<HTMLElement>('.hide-on-capture');
    hiddenElements.forEach((el) => {
      el.style.display = 'none';
    });
    // Force layout reflow so clientHeight and positions are recalculated immediately
    void cardElement.offsetHeight;

    try {
      const blob = await toBlob(cardElement, {
        quality: 0.98,
        pixelRatio: 2, // 2x Retina crispness
        cacheBust: true,
        backgroundColor: '#FFFFFF',
      });

      if (blob) {
        return deliverOrderTicketBlob(blob, order.orderId);
      }
    } catch (domCaptureErr) {
      console.warn('DOM to image capture failed, trying canvas fallback:', domCaptureErr);
    } finally {
      // Restore elements immediately after capture
      hiddenElements.forEach((el) => {
        el.style.display = '';
      });
      void cardElement.offsetHeight;
    }
  }

  // 2. Fallback Method: Render high-resolution canvas with authentic mascot logo
  const canvas = await generateOrderTicketCanvas(options);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      resolve(deliverOrderTicketBlob(blob, order.orderId));
    }, 'image/png');
  });
}
