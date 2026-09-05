// PromptPay EMVCo Payload & QR Code Generator
// Generates standard Thai PromptPay QR code with locked amount for any Thai bank app (KBank, SCB, etc.)
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

/**
 * Generate EMVCo QR code data URL with exact Thai Baht amount
 * @param recipientPromptPay Mobile phone number (e.g. "0812345678") or National ID / Tax ID
 * @param amount Total amount in THB (e.g. 440 or 100)
 */
export async function generatePromptPayQRDataUrl(
  recipientPromptPay: string,
  amount?: number
): Promise<string> {
  // Sanitize recipient: remove dashes and spaces
  const cleanRecipient = recipientPromptPay.replace(/[-\s]/g, '');

  // Generate standard Thai EMVCo QR string
  const payload = generatePayload(cleanRecipient, amount !== undefined ? { amount } : {});

  // Render high quality QR code as base64 data URL
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#1E1E1E',
      light: '#FFFFFF'
    }
  });

  return qrDataUrl;
}
