// Utility to generate high-resolution order ticket images with embedded QR codes
// Enables customers without login to save complete order passes to their mobile photo gallery
import type { Order } from '@/types/fruit_app';

interface GenerateTicketOptions {
  order: Order;
  qrDataUrl: string;
  pickupLocation?: string;
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

// Generate the complete high-resolution Order Ticket onto an offscreen Canvas
export async function generateOrderTicketCanvas(options: GenerateTicketOptions): Promise<HTMLCanvasElement> {
  const { order, qrDataUrl, pickupLocation = 'ท้ายรถลานจอดรถห้าง' } = options;

  // Retina canvas width & dynamic height
  const width = 750;
  const itemsCount = order.items && order.items.length > 0 ? order.items.length : 1;
  const itemsBlockHeight = 50 + (itemsCount * 62) + 20;
  const totalHeight = 1180 + itemsBlockHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // High-DPI font stack
  const fontRegular = '-apple-system, BlinkMacSystemFont, "Sarabun", "Noto Sans Thai", "Thonburi", Roboto, sans-serif';

  // 1. Canvas Outer Background
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, width, totalHeight);

  // 2. Main Card Surface (white with rounded corners & shadow)
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

  // Card outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, false, true);

  // Clip within card for top banner rounded corners
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

  // Brand Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 32px ${fontRegular}`;
  ctx.textAlign = 'center';
  ctx.fillText('🍃 FRUIT DROP', width / 2, cardY + 54);

  // Subtitle
  ctx.fillStyle = '#DCEDC8';
  ctx.font = `20px ${fontRegular}`;
  ctx.fillText('ใบสั่งจองผลไม้ • บัตรคิวรับของท้ายรถ', width / 2, cardY + 88);

  // Success Pill Badge
  ctx.fillStyle = '#FFFFFF';
  const badgeW = 200;
  const badgeH = 34;
  const badgeX = (width - badgeW) / 2;
  const badgeY = cardY + 104;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 17, true, false);

  ctx.fillStyle = '#1B5E20';
  ctx.font = `bold 17px ${fontRegular}`;
  ctx.fillText('✓ สั่งจองสำเร็จแล้ว', width / 2, badgeY + 23);
  ctx.restore(); // Restore clipping

  // 4. Order ID & QR Code Box
  let currentY = cardY + headerHeight + 25;
  const innerMargin = 30;
  const blockW = cardWidth - (innerMargin * 2);
  const blockX = cardX + innerMargin;

  const qrBoxHeight = 410;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, blockX, currentY, blockW, qrBoxHeight, 18, true, true);

  // "รหัสออเดอร์" label
  ctx.fillStyle = '#64748B';
  ctx.font = `17px ${fontRegular}`;
  ctx.textAlign = 'center';
  ctx.fillText('รหัสออเดอร์', width / 2, currentY + 35);

  // Order ID
  ctx.fillStyle = '#2E7D32';
  ctx.font = `bold 46px ${fontRegular}`;
  ctx.fillText(`#${order.orderId}`, width / 2, currentY + 84);

  // QR Code Image
  if (qrDataUrl) {
    const qrSize = 220;
    const qrX = (width - qrSize) / 2;
    const qrY = currentY + 104;

    // QR white background with border
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12, true, true);

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = qrDataUrl;
    await new Promise<void>((resolve, reject) => {
      if (qrImg.complete) {
        resolve();
      } else {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
      }
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // QR bottom caption
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 18px ${fontRegular}`;
  ctx.textAlign = 'center';
  ctx.fillText('📱 แสดง QR นี้ให้คนขายสแกนรับของที่รถ', width / 2, currentY + 372);

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
  ctx.fillText('👤 ข้อมูลลูกค้าผู้สั่ง:', blockX + 22, currentY + 34);

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
  ctx.fillText('🛒 รายการผลไม้ที่สั่งจอง:', blockX + 22, currentY + 34);

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
  ctx.fillText('⏰ เวลานัดรับของที่รถ:', blockX + 22, currentY + 34);

  ctx.fillStyle = '#2E7D32';
  ctx.font = `bold 21px ${fontRegular}`;
  ctx.fillText(`รอบเวลา ${order.pickupSlot} น.`, blockX + 22, currentY + 68);

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
  const payMethodText = order.paymentMethod === 'PAY_AT_CAR' ? 'จ่ายเงินตอนรับของที่รถ (เงินสด / สแกน QR)' : 'โอนเงินล่วงหน้า';
  ctx.fillText(`วิธีชำระ: ${payMethodText}`, blockX + 22, currentY + 40);
  ctx.fillText('ไม่ต้องโอนล่วงหน้า ตรวจรับผลไม้ก่อนแล้วค่อยจ่าย', blockX + 22, currentY + 70);

  // Right Total Amount
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
  ctx.fillText('★ บันทึกรูปนี้ไว้ในมือถือ เพื่อแสดงตอนรับผลไม้ที่รถ (กันลืม)', width / 2, currentY + 16);

  ctx.fillStyle = '#94A3B8';
  ctx.font = `15px ${fontRegular}`;
  ctx.fillText('Fruit Drop • ระบบจองผลไม้สดจากสวนถึงท้ายรถคุณ', width / 2, currentY + 44);

  return canvas;
}

// Download or Share the generated Order Ticket Image
export async function saveOrderTicketImage(options: GenerateTicketOptions): Promise<boolean> {
  const canvas = await generateOrderTicketCanvas(options);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }

      const fileName = `FruitDrop-Order-${options.order.orderId}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Mobile Browser Web Share API (Save image directly to photo gallery or share)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `ใบสั่งจอง Fruit Drop #${options.order.orderId}`,
            text: `ใบสั่งจองผลไม้ Fruit Drop รหัส #${options.order.orderId} (รอบเวลา ${options.order.pickupSlot} น.)`,
            files: [file]
          });
          resolve(true);
          return;
        } catch (err: unknown) {
          // If user aborted / closed the native share sheet, don't trigger download
          if (err instanceof Error && err.name === 'AbortError') {
            resolve(true);
            return;
          }
        }
      }

      // Fallback: Trigger standard browser file download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve(true);
    }, 'image/png');
  });
}
