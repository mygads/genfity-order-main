/**
 * QR Code Generator Utility
 * Generates QR codes for order numbers
 */

import QRCode from 'qrcode';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';

/**
 * Generate QR code as Data URL (base64)
 * @param data - Data to encode (order number)
 * @returns Base64 encoded QR code image
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code for order
 * @param orderNumber - Order number
 * @param merchantCode - Merchant code
 * @returns Base64 QR code image
 */
export async function generateOrderQRCode(
  orderNumber: string,
  merchantCode: string,
  options: { trackingToken?: string | null } = {}
): Promise<string> {
  // QR code will contain order tracking URL
  const baseUrl = getPublicAppOrigin('http://localhost:3000');
  const orderNumberEncoded = encodeURIComponent(orderNumber);
  if (!options.trackingToken) {
    throw new Error('trackingToken is required to generate a tracking QR code');
  }
  const trackingUrl = `${baseUrl}/${merchantCode}/track/${orderNumberEncoded}?token=${encodeURIComponent(options.trackingToken)}`;
  return generateQRCode(trackingUrl);
}
