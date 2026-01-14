/**
 * Email Templates - Professional Clean Design
 * Inspired by shadcn/ui - minimal, clean, modern
 */

import type { Locale } from '@/lib/i18n';
import { getTranslation } from '@/lib/i18n';
import { PERMISSION_GROUPS } from '@/lib/constants/permissions';
import { formatCurrency } from '@/lib/utils/format';
import { getPublicAppOrigin } from '@/lib/utils/publicAppOrigin';
import { getPermissionLabelForLocale } from '@/lib/utils/permissionDisplay';

// Base URL for logo (set in env or fallback)
const _getLogoUrl = () => {
  const origin = getPublicAppOrigin('https://order.genfity.com');
  return `${origin}/images/logo/logo.png`;
};

function _t(locale: Locale) {
  const lang = locale === 'id' ? 'id' : 'en';
  return {
    lang,
    needHelp: lang === 'id' ? 'Butuh bantuan?' : 'Need assistance?',
    poweredBy:
      lang === 'id'
        ? 'powered by genfity.com'
        : 'powered by genfity.com',
    rights: lang === 'id'
      ? `© ${new Date().getFullYear()} Genfity Digital Solution. Semua hak dilindungi.`
      : `© ${new Date().getFullYear()} Genfity Digital Solution. All rights reserved.`,
  };
}

type DetailsRow = {
  label: string;
  value: string;
  emphasizeValue?: boolean;
};

function renderDetailsRows(rows: DetailsRow[]): string {
  return rows
    .map((row, index) => {
      const borderTop = index === 0 ? '' : 'border-top: 1px solid #e5e5e5;';
      const valueWeight = row.emphasizeValue ? 700 : 600;
      return `
        <tr>
          <td style="padding: 10px 0; font-size: 13px; color: #737373; ${borderTop}">${row.label}</td>
          <td style="padding: 10px 0; font-size: 13px; color: #171717; text-align: right; font-weight: ${valueWeight}; ${borderTop}">${row.value}</td>
        </tr>
      `;
    })
    .join('');
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
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #a3a3a3;">
                      ${t.poweredBy}
                    </p>
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
  locale?: Locale;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Atur Ulang Password' : 'Reset Your Password'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, gunakan kode berikut untuk mengatur ulang password Anda.`
        : `Hi ${params.name}, use the code below to reset your password.`}
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
      ${isID
        ? `Kode ini akan kedaluwarsa dalam <strong style="color: #737373;">${params.expiresInMinutes} menit</strong>`
        : `This code expires in <strong style="color: #737373;">${params.expiresInMinutes} minutes</strong>`}
    </p>
    
    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Jika Anda tidak meminta ini, Anda dapat mengabaikan email ini.'
        : "If you didn't request this, you can safely ignore this email."}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
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
  locale?: Locale;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Selamat Datang di Genfity' : 'Welcome to Genfity'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID ? 'Akun Anda berhasil dibuat.' : 'Your account has been created successfully.'}
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
                <span style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">${isID ? 'Password Sementara' : 'Temporary Password'}</span>
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
            ${isID ? 'Masuk ke Akun Anda' : 'Sign In to Your Account'}
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Silakan ganti password setelah Anda masuk.'
        : 'Please change your password after signing in.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

/**
 * Staff Welcome Email Template
 * Sent when a staff member is invited/created
 */
export function getStaffWelcomeTemplate(params: {
  name: string;
  email: string;
  password: string;
  merchantName: string;
  merchantCode: string;
  loginUrl: string;
  locale?: Locale;
  supportEmail: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? `Selamat Datang di ${params.merchantName}` : `Welcome to ${params.merchantName}`}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, Anda telah ditambahkan sebagai staff.`
        : `Hi ${params.name}, you have been added as a staff member.`}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #171717; font-weight: 600;">${isID ? 'Kredensial Login' : 'Login Credentials'}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${renderDetailsRows([
              { label: 'Email', value: params.email, emphasizeValue: true },
              {
                label: isID ? 'Password Sementara' : 'Temporary Password',
                value: params.password,
                emphasizeValue: true,
              },
              {
                label: isID ? 'Merchant' : 'Merchant',
                value: `${params.merchantName} (${params.merchantCode})`,
              },
            ])}
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.loginUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            ${isID ? 'Masuk ke Dashboard' : 'Login to Dashboard'}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Untuk keamanan, silakan ganti password setelah login pertama.'
        : 'For security, please change your password after your first login.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

/**
 * Staff Invite Email Template
 * Sent when an existing user is invited as staff and must accept the invitation.
 */
export function getStaffInviteTemplate(params: {
  name: string;
  email: string;
  merchantName: string;
  merchantCode?: string;
  acceptUrl: string;
  locale?: Locale;
  supportEmail: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const merchantLabel = params.merchantCode
    ? `${params.merchantName} (${params.merchantCode})`
    : params.merchantName;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Undangan Staff' : 'Staff Invitation'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, Anda diundang untuk bergabung sebagai <strong style=\"color: #171717;\">staff</strong> di <strong style=\"color: #171717;\">${merchantLabel}</strong>.`
        : `Hi ${params.name}, you’ve been invited to join as <strong style=\"color: #171717;\">staff</strong> at <strong style=\"color: #171717;\">${merchantLabel}</strong>.`}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #171717; font-weight: 600;">${isID ? 'Detail' : 'Details'}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${renderDetailsRows([
              { label: 'Email', value: params.email, emphasizeValue: true },
              { label: isID ? 'Merchant' : 'Merchant', value: merchantLabel },
            ])}
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.acceptUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            ${isID ? 'Terima Undangan' : 'Accept Invitation'}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Setelah menerima undangan, Anda bisa login ke dashboard admin.'
        : 'After accepting, you can login to the admin dashboard.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

/**
 * Merchant Access Disabled Email Template
 * Sent when a merchant owner disables a staff member's access for that merchant.
 */
export function getMerchantAccessDisabledTemplate(params: {
  name: string;
  email: string;
  merchantName: string;
  merchantCode?: string;
  supportEmail: string;
  locale?: Locale;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const merchantLabel = params.merchantCode
    ? `${params.merchantName} (${params.merchantCode})`
    : params.merchantName;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Akses Merchant Dinonaktifkan' : 'Merchant Access Disabled'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, akses Anda ke <strong style=\"color: #171717;\">${merchantLabel}</strong> telah dinonaktifkan oleh pemilik toko.`
        : `Hi ${params.name}, your access to <strong style=\"color: #171717;\">${merchantLabel}</strong> has been disabled by the store owner.`}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #171717; font-weight: 600;">${isID ? 'Detail' : 'Details'}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${renderDetailsRows([
              { label: 'Email', value: params.email, emphasizeValue: true },
              { label: isID ? 'Merchant' : 'Merchant', value: merchantLabel },
              {
                label: isID ? 'Status' : 'Status',
                value: isID
                  ? 'Akses dinonaktifkan (Anda tidak dapat menggunakan fitur toko)'
                  : 'Access disabled (store features are not available)',
              },
            ])}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Jika ini tidak sesuai, silakan hubungi pemilik toko atau support.'
        : 'If this is unexpected, please contact the store owner or support.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

/**
 * Merchant Access Removed Email Template
 * Sent when a merchant owner removes a staff member from that merchant.
 */
export function getMerchantAccessRemovedTemplate(params: {
  name: string;
  email: string;
  merchantName: string;
  merchantCode?: string;
  supportEmail: string;
  locale?: Locale;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const merchantLabel = params.merchantCode
    ? `${params.merchantName} (${params.merchantCode})`
    : params.merchantName;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Anda Dihapus dari Merchant' : 'You Were Removed from a Merchant'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, Anda telah dihapus dari <strong style=\"color: #171717;\">${merchantLabel}</strong>.`
        : `Hi ${params.name}, you were removed from <strong style=\"color: #171717;\">${merchantLabel}</strong>.`}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #171717; font-weight: 600;">${isID ? 'Detail' : 'Details'}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${renderDetailsRows([
              { label: 'Email', value: params.email, emphasizeValue: true },
              { label: isID ? 'Merchant' : 'Merchant', value: merchantLabel },
              {
                label: isID ? 'Status' : 'Status',
                value: isID ? 'Akses merchant dihapus' : 'Merchant access removed',
              },
            ])}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Jika Anda masih memerlukan akses, minta pemilik toko untuk mengundang Anda kembali.'
        : 'If you still need access, ask the store owner to invite you again.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

/**
 * User Deactivated by Super Admin Template
 * Sent when Genfity Super Admin deactivates a user account (global).
 */
export function getUserDeactivatedByAdminTemplate(params: {
  name: string;
  email: string;
  supportEmail: string;
  locale?: Locale;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Akun Anda Dinonaktifkan' : 'Your Account Was Deactivated'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, akun GENFITY Anda (${params.email}) telah dinonaktifkan oleh Admin GENFITY.`
        : `Hi ${params.name}, your GENFITY account (${params.email}) has been deactivated by a Genfity admin.`}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #171717; font-weight: 600;">${isID ? 'Langkah selanjutnya' : 'Next steps'}</p>
          <p style="margin: 0; font-size: 13px; color: #525252; line-height: 1.6;">
            ${isID
              ? 'Anda tidak dapat login sampai akun diaktifkan kembali. Silakan hubungi support untuk bantuan.'
              : 'You will not be able to login until the account is re-enabled. Please contact support for help.'}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${`Support: ${params.supportEmail}`}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

/**
 * Password Changed Email Template
 * Sent when a user's password is changed (by themselves or by a merchant owner/admin).
 */
export function getPasswordChangedTemplate(params: {
  name: string;
  email: string;
  supportEmail: string;
  locale?: Locale;
  changedByLabel?: string; // e.g. 'you' | 'merchant owner'
  merchantName?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';

  const changedByText = params.changedByLabel
    ? params.changedByLabel
    : isID
      ? 'Anda'
      : 'you';

  const merchantLine = params.merchantName
    ? `<p style="margin: 0; font-size: 13px; color: #525252; line-height: 1.6; text-align: center;">
        ${isID
          ? `Merchant: <strong style=\"color: #171717;\">${params.merchantName}</strong>`
          : `Merchant: <strong style=\"color: #171717;\">${params.merchantName}</strong>`}
      </p>`
    : '';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Kata Sandi Berhasil Diubah' : 'Password Changed'}
    </h1>
    <p style="margin: 0 0 14px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, kata sandi untuk akun GENFITY Anda (${params.email}) telah diubah oleh <strong style=\"color: #171717;\">${changedByText}</strong>.`
        : `Hi ${params.name}, the password for your GENFITY account (${params.email}) was changed by <strong style=\"color: #171717;\">${changedByText}</strong>.`}
    </p>
    ${merchantLine}

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 10px; margin: 18px 0;">
      <tr>
        <td style="padding: 18px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #171717; font-weight: 600;">${isID ? 'Jika ini bukan Anda' : 'If this wasn\'t you'}</p>
          <p style="margin: 0; font-size: 13px; color: #525252; line-height: 1.6;">
            ${isID
              ? 'Jika Anda tidak melakukan perubahan ini, segera hubungi support dan pertimbangkan untuk mengganti kata sandi Anda.'
              : 'If you did not perform this change, contact support immediately and consider updating your password.'}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? `Butuh bantuan? Hubungi ${params.supportEmail}`
        : `Need help? Contact ${params.supportEmail}`}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
}

export function getTestEmailTemplate(params: {
  locale?: Locale;
  supportEmail: string;
}): string {
  const locale = params.locale || 'en';
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      GENFITY Test Email
    </h1>
    <p style="margin: 0; font-size: 14px; color: #737373; text-align: center;">
      This email confirms your SMTP configuration is working.
    </p>
  `;
  return getBaseTemplate(content, params.supportEmail, locale);
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
  locale?: Locale;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Akun Anda Siap' : 'Your Account is Ready'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, akun merchant Anda telah dibuat.`
        : `Hi ${params.name}, your merchant account has been created.`}
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
                <span style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">${isID ? 'Password Sementara' : 'Temporary Password'}</span>
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
            ${isID ? 'Buka Dashboard' : 'Open Dashboard'}
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Untuk keamanan, silakan ganti password setelah login pertama.'
        : 'For security, please change your password after your first login.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail, locale);
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
            ${renderDetailsRows([
              { label: labels.orderNumber, value: params.orderNumber, emphasizeValue: true },
              { label: labels.restaurant, value: params.merchantName },
              {
                label: labels.orderType,
                value: `${params.orderType}${params.tableNumber ? ` - ${labels.table} ${params.tableNumber}` : ''}`,
              },
            ])}
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
            ${renderDetailsRows([
              {
                label: labels.totalPaid,
                value: formatCurrency(params.total, params.currency, locale),
                emphasizeValue: true,
              },
            ])}
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
  locale?: Locale;
  supportEmail?: string;
}): string {
  const locale = params.locale || 'en';
  const isID = locale === 'id';

  const formatPermission = (key: string): string => {
    return getPermissionLabelForLocale(locale, key);
  };

  const permissionSet = new Set(params.permissions);

  const groupedPermissionsHtml = Object.values(PERMISSION_GROUPS)
    .map((group) => {
      const keys = group.permissions
        .map((p) => p.key)
        .filter((key) => permissionSet.has(key));

      if (keys.length === 0) return '';

      const groupTitle = getTranslation(locale, group.titleKey as any);
      const itemsHtml = keys
        .map((key) => `<li style="margin: 4px 0; font-size: 14px; color: #525252;">${formatPermission(key)}</li>`)
        .join('');

      return `
        <div style="margin: 14px 0;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #404040; text-transform: uppercase; letter-spacing: 0.4px;">${groupTitle}</p>
          <ul style="margin: 0; padding: 0 0 0 16px; list-style-type: disc;">
            ${itemsHtml}
          </ul>
        </div>
      `;
    })
    .join('');

  const permissionsHtml = params.permissions.length > 0
    ? groupedPermissionsHtml
    : `<p style="margin: 0; font-size: 14px; color: #a3a3a3;">${isID ? 'Tidak ada izin yang diberikan' : 'No permissions assigned'}</p>`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717; text-align: center;">
      ${isID ? 'Izin Anda Diperbarui' : 'Your Permissions Updated'}
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #737373; text-align: center;">
      ${isID
        ? `Halo ${params.name}, izin akses Anda di ${params.merchantName} telah diperbarui.`
        : `Hi ${params.name}, your access permissions at ${params.merchantName} have been updated.`}
    </p>
    
    <!-- Permissions Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 8px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">${isID ? 'Izin Saat Ini' : 'Your Current Permissions'}</p>
          ${permissionsHtml}
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #737373; text-align: center;">
      ${isID ? 'Diperbarui oleh' : 'Updated by'}: <strong style="color: #171717;">${params.updatedBy}</strong>
    </p>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.dashboardUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
            ${isID ? 'Buka Dashboard' : 'Go to Dashboard'}
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
      ${isID
        ? 'Jika ada pertanyaan terkait izin akses, silakan hubungi pemilik merchant.'
        : 'If you have any questions about your permissions, please contact your store owner.'}
    </p>
  `;

  return getBaseTemplate(content, params.supportEmail || 'support@genfity.com', locale);
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
            ${renderDetailsRows(
              rows.map((r, idx) => ({
                label: r.label,
                value: r.value,
                emphasizeValue: idx === 1,
              }))
            )}
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
            ${renderDetailsRows(
              [
                {
                  label: isID ? 'Jumlah Penyesuaian' : 'Adjustment Amount',
                  value: params.adjustmentText,
                  emphasizeValue: true,
                },
                { label: isID ? 'Saldo Baru' : 'New Balance', value: params.newBalanceText },
                { label: isID ? 'Waktu' : 'Date', value: params.adjustedAtText },
                ...(params.adjustedByText
                  ? [{ label: isID ? 'Diperbarui Oleh' : 'Adjusted By', value: params.adjustedByText }]
                  : []),
              ]
            )}
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
            ${renderDetailsRows(
              [
                {
                  label: isID ? 'Berlaku Sampai' : 'Valid Until',
                  value: params.newExpiryText,
                  emphasizeValue: true,
                },
                ...(params.extendedByText
                  ? [{ label: isID ? 'Diperpanjang Oleh' : 'Extended By', value: params.extendedByText }]
                  : []),
              ]
            )}
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
