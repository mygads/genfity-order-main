/**
 * Email Templates - Professional Clean Design
 * Inspired by shadcn/ui - minimal, clean, modern
 */

import type { Locale } from '@/lib/i18n';
import { formatCurrency } from '@/lib/utils/format';

// Base URL for logo (set in env or fallback)
const _getLogoUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/images/logo/logo.png`
    : 'https://genfity.com/images/logo/logo.png';

function _t(locale: Locale) {
  const lang = locale === 'id' ? 'id' : 'en';
  return {
    lang,
    needHelp: lang === 'id' ? 'Butuh bantuan?' : 'Need assistance?',
    rights: lang === 'id'
      ? `© ${new Date().getFullYear()} Genfity Digital Solution. Semua hak dilindungi.`
      : `© ${new Date().getFullYear()} Genfity Digital Solution. All rights reserved.`,
  };
}

/**
 * Shared email base template - Clean modern design
 */
function getBaseTemplate(content: string, footerEmail: string, locale: Locale = 'en'): string {
  const t = _t(locale);
  return `
<!DOCTYPE html>
<html lang="${t.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Genfity</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden;">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f0f0f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img
                      src="${_getLogoUrl()}"
                      alt="Order"
                      width="220"
                      style="display: block; width: 220px; max-width: 100%; height: auto; margin: 0 auto;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #f0f0f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #737373;">
                      ${t.needHelp} <a href="mailto:${footerEmail}" style="color: #171717; text-decoration: underline;">${footerEmail}</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                      ${t.rights}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Password Reset OTP Email Template
 */
export function getPasswordResetOTPTemplate(params: {
  name: string;
  code: string;
  expiresInMinutes: number;
  supportEmail: string;
}): string {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      Hi ${params.name}, use the code below to reset your password.
    </p>
    
    <!-- OTP Code -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px 32px; display: inline-block;">
            <span style="font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #171717;">
              ${params.code}
            </span>
          </div>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0 0; font-size: 13px; color: #a3a3a3; text-align: center;">
      This code expires in <strong style="color: #737373;">${params.expiresInMinutes} minutes</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail);
}

/**
 * Customer Welcome Email Template
 * Sent to new customers after their first order
 */
export function getCustomerWelcomeTemplate(params: {
  name: string;
  email: string;
  phone: string;
  tempPassword: string;
  loginUrl: string;
  supportEmail: string;
}): string {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      Welcome to Genfity
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      Your account has been created successfully.
    </p>
    
    <!-- Credentials Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 500; color: #171717;">${params.email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-top: 1px solid #e5e5e5;">
                <span style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</span>
                <p style="margin: 4px 0 0 0; font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 16px; font-weight: 600; color: #171717; letter-spacing: 1px;">${params.tempPassword}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.loginUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
            Sign In to Your Account
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      Please change your password after signing in.
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail);
}

/**
 * Password Notification Template (for merchants/staff)
 */
export function getPasswordNotificationTemplate(params: {
  name: string;
  email: string;
  tempPassword: string;
  dashboardUrl: string;
  supportEmail: string;
}): string {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      Your Account is Ready
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      Hi ${params.name}, your merchant account has been created.
    </p>
    
    <!-- Credentials Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
                <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 500; color: #171717;">${params.email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-top: 1px solid #e5e5e5;">
                <span style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</span>
                <p style="margin: 4px 0 0 0; font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 16px; font-weight: 600; color: #171717; letter-spacing: 1px;">${params.tempPassword}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
            Open Dashboard
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      For security, please change your password after your first login.
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail);
}

/**
 * Order Confirmation Template
 */
export function getOrderConfirmationTemplate(params: {
  customerName: string;
  orderNumber: string;
  merchantName: string;
  orderType: string;
  tableNumber?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  trackingUrl: string;
  currency: string;
  locale: Locale;
  supportEmail?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const labels = {
    title: isID ? 'Pesanan Dikonfirmasi' : 'Order Confirmed',
    thanks: isID ? `Terima kasih, ${params.customerName}!` : `Thank you, ${params.customerName}!`,
    orderNumber: isID ? 'Nomor Pesanan' : 'Order Number',
    restaurant: isID ? 'Restoran' : 'Restaurant',
    orderType: isID ? 'Tipe Pesanan' : 'Order Type',
    table: isID ? 'Meja' : 'Table',
    subtotal: isID ? 'Subtotal' : 'Subtotal',
    tax: isID ? 'Pajak' : 'Tax',
    total: isID ? 'Total' : 'Total',
    track: isID ? 'Lacak Pesanan' : 'Track Your Order',
  };

  const itemsHtml = params.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="font-size: 14px; color: #171717;">${item.name}</span>
        <span style="font-size: 13px; color: #737373;"> × ${item.quantity}</span>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
        <span style="font-size: 14px; color: #171717;">${formatCurrency(item.price, params.currency, locale)}</span>
      </td>
    </tr>
  `).join('');

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717;">
        ${labels.title}
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        ${labels.thanks}
      </p>
    </div>
    
    <!-- Order Info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 12px; color: #737373;">Order Number</td>
              <td style="font-size: 14px; font-weight: 600; color: #171717; text-align: right;">${params.orderNumber}</td>
            </tr>
            <tr>
              <td style="font-size: 12px; color: #737373; padding-top: 8px;">${labels.restaurant}</td>
              <td style="font-size: 14px; color: #171717; text-align: right; padding-top: 8px;">${params.merchantName}</td>
            </tr>
            <tr>
              <td style="font-size: 12px; color: #737373; padding-top: 8px;">${labels.orderType}</td>
              <td style="font-size: 14px; color: #171717; text-align: right; padding-top: 8px;">${params.orderType}${params.tableNumber ? ` - ${labels.table} ${params.tableNumber}` : ''}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      ${itemsHtml}
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #737373;">${labels.subtotal}</td>
        <td style="padding: 8px 0; font-size: 13px; color: #737373; text-align: right;">${formatCurrency(params.subtotal, params.currency, locale)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #737373;">${labels.tax}</td>
        <td style="padding: 8px 0; font-size: 13px; color: #737373; text-align: right;">${formatCurrency(params.tax, params.currency, locale)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #171717; border-top: 1px solid #e5e5e5;">${labels.total}</td>
        <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #171717; text-align: right; border-top: 1px solid #e5e5e5;">${formatCurrency(params.total, params.currency, locale)}</td>
      </tr>
    </table>
    
    <!-- Track Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.trackingUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
            ${labels.track}
          </a>
        </td>
      </tr>
    </table>
  `;

  return getBaseTemplate(content, params.supportEmail || 'support@genfity.com', locale);
}

/**
 * Order Completed Template
 */
export function getOrderCompletedTemplate(params: {
  customerName: string;
  orderNumber: string;
  merchantName: string;
  orderType: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  completedAt: string;
  currency: string;
  locale: Locale;
  supportEmail?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const labels = {
    title: isID ? 'Pesanan Selesai' : 'Order Complete',
    subtitle: isID
      ? `Terima kasih telah memesan di ${params.merchantName}`
      : `Thanks for dining with ${params.merchantName}`,
    totalPaid: isID ? 'Total Dibayar' : 'Total Paid',
    closing: isID
      ? 'Semoga Anda menikmati pesanan Anda! Sampai jumpa lagi.'
      : 'We hope you enjoyed your meal! See you again soon.',
  };

  const itemsList = params.items.map(item =>
    `<li style="margin: 4px 0; font-size: 14px; color: #525252;">${item.name} × ${item.quantity}</li>`
  ).join('');

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717;">
        ${labels.title} 🎉
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        ${labels.subtitle}
      </p>
    </div>
    
    <!-- Order Summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Order #${params.orderNumber}</p>
          <p style="margin: 0 0 16px 0; font-size: 12px; color: #a3a3a3;">${params.completedAt}</p>
          
          <ul style="margin: 0; padding: 0 0 0 16px; list-style-type: disc;">
            ${itemsList}
          </ul>
          
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size: 14px; font-weight: 600; color: #171717;">${labels.totalPaid}</td>
              <td style="font-size: 16px; font-weight: 600; color: #171717; text-align: right;">${formatCurrency(params.total, params.currency, locale)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #737373; text-align: center;">
      ${labels.closing}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail || 'support@genfity.com', locale);
}

/**
 * Permission Update Notification Template
 * Sent to staff when their permissions are updated
 */
export function getPermissionUpdateTemplate(params: {
  name: string;
  merchantName: string;
  permissions: string[];
  updatedBy: string;
  dashboardUrl: string;
}): string {
  const permissionsList = params.permissions.length > 0
    ? params.permissions.map(p => `<li style="margin: 4px 0; font-size: 14px; color: #525252;">${p}</li>`).join('')
    : '<li style="margin: 4px 0; font-size: 14px; color: #a3a3a3;">No permissions assigned</li>';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      Your Permissions Updated
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      Hi ${params.name}, your access permissions at ${params.merchantName} have been updated.
    </p>
    
    <!-- Permissions Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Your Current Permissions</p>
          <ul style="margin: 0; padding: 0 0 0 16px; list-style-type: disc;">
            ${permissionsList}
          </ul>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #737373; text-align: center;">
      Updated by: <strong style="color: #171717;">${params.updatedBy}</strong>
    </p>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
            Go to Dashboard
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      If you have any questions about your permissions, please contact your store owner.
    </p>
  `;

  return getBaseTemplate(content, 'support@genfity.com');
}

// ============================================================================
// MERCHANT EMAILS (Locale-aware)
// ============================================================================

export function getPaymentVerifiedTemplate(params: {
  merchantName: string;
  paymentTypeLabel: string;
  amountText: string;
  balanceText?: string | null;
  periodEndText?: string | null;
  dashboardUrl: string;
  locale: Locale;
  supportEmail?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const title = isID ? 'Pembayaran Terverifikasi' : 'Payment Verified';
  const subtitle = isID
    ? 'Pembayaran Anda sudah kami konfirmasi.'
    : 'Your payment has been confirmed.';

  const rows = [
    { label: isID ? 'Tipe Pembayaran' : 'Payment Type', value: params.paymentTypeLabel },
    { label: isID ? 'Jumlah' : 'Amount', value: params.amountText },
  ] as Array<{ label: string; value: string }>;

  if (params.balanceText) {
    rows.push({ label: isID ? 'Saldo Baru' : 'New Balance', value: params.balanceText });
  }
  if (params.periodEndText) {
    rows.push({ label: isID ? 'Berlaku Sampai' : 'Valid Until', value: params.periodEndText });
  }

  const detailsHtml = rows
    .map(
      (r) => `
        <tr>
          <td style="padding: 10px 0; font-size: 13px; color: #737373;">${r.label}</td>
          <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; font-weight: 600;">${r.value}</td>
        </tr>
      `
    )
    .join('');

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #f0fdf4; border-radius: 999px; padding: 10px 14px; margin-bottom: 12px;">
        <span style="font-size: 12px; font-weight: 600; color: #166534;">${isID ? 'BERHASIL' : 'SUCCESS'}</span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 650; color: #171717;">
        ${title}
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        ${subtitle}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #171717; font-weight: 600;">
            ${isID ? 'Ringkasan' : 'Summary'} — ${params.merchantName}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailsHtml}
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            ${isID ? 'Buka Dashboard' : 'Open Dashboard'}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID ? 'Jika ada pertanyaan, balas email ini atau hubungi support.' : 'If you have questions, reply to this email or contact support.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail || 'support@genfity.com', locale);
}

export function getBalanceAdjustmentTemplate(params: {
  merchantName: string;
  adjustmentText: string;
  newBalanceText: string;
  adjustedAtText: string;
  reasonText: string;
  adjustedByText?: string | null;
  dashboardUrl: string;
  locale: Locale;
  supportEmail?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';

  const content = `
    <div style="text-align: center; margin-bottom: 22px;">
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 650; color: #171717;">
        ${isID ? 'Penyesuaian Saldo' : 'Balance Adjustment'}
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        ${isID ? `Halo ${params.merchantName}, saldo subscription Anda telah diperbarui.` : `Hello ${params.merchantName}, your subscription balance has been updated.`}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 10px 0; font-size: 13px; color: #737373;">${isID ? 'Jumlah Penyesuaian' : 'Adjustment Amount'}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; font-weight: 700;">${params.adjustmentText}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 13px; color: #737373; border-top: 1px solid #e5e5e5;">${isID ? 'Saldo Baru' : 'New Balance'}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; font-weight: 600; border-top: 1px solid #e5e5e5;">${params.newBalanceText}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-size: 13px; color: #737373; border-top: 1px solid #e5e5e5;">${isID ? 'Waktu' : 'Date'}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; border-top: 1px solid #e5e5e5;">${params.adjustedAtText}</td>
            </tr>
            ${
              params.adjustedByText
                ? `
            <tr>
              <td style="padding: 10px 0; font-size: 13px; color: #737373; border-top: 1px solid #e5e5e5;">${isID ? 'Diperbarui Oleh' : 'Adjusted By'}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; border-top: 1px solid #e5e5e5;">${params.adjustedByText}</td>
            </tr>
              `
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <div style="background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 10px; padding: 14px 16px; margin: 18px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.6px;">${isID ? 'Alasan' : 'Reason'}</p>
      <p style="margin: 0; font-size: 14px; color: #171717;">${params.reasonText}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            ${isID ? 'Lihat Dashboard' : 'View Dashboard'}
          </a>
        </td>
      </tr>
    </table>
  `;

  return getBaseTemplate(content, params.supportEmail || 'support@genfity.com', locale);
}

export function getSubscriptionExtendedTemplate(params: {
  merchantName: string;
  daysExtended: number;
  newExpiryText: string;
  extendedByText?: string | null;
  dashboardUrl: string;
  locale: Locale;
  supportEmail?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';

  const content = `
    <div style="text-align: center; margin-bottom: 22px;">
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 650; color: #171717;">
        ${isID ? 'Subscription Diperpanjang' : 'Subscription Extended'}
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        ${isID
          ? `Halo ${params.merchantName}, subscription Anda diperpanjang ${params.daysExtended} hari.`
          : `Hello ${params.merchantName}, your subscription has been extended by ${params.daysExtended} days.`}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 10px 0; font-size: 13px; color: #737373;">${isID ? 'Berlaku Sampai' : 'Valid Until'}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; font-weight: 600;">${params.newExpiryText}</td>
            </tr>
            ${
              params.extendedByText
                ? `
            <tr>
              <td style="padding: 10px 0; font-size: 13px; color: #737373; border-top: 1px solid #e5e5e5;">${isID ? 'Diperpanjang Oleh' : 'Extended By'}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; border-top: 1px solid #e5e5e5;">${params.extendedByText}</td>
            </tr>
              `
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            ${isID ? 'Kelola Subscription' : 'Manage Subscription'}
          </a>
        </td>
      </tr>
    </table>
  `;

  return getBaseTemplate(content, params.supportEmail || 'support@genfity.com', locale);
}
