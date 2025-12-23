/**
 * Email Templates - Professional Clean Design
 * Inspired by shadcn/ui - minimal, clean, modern
 */

// Base URL for logo (set in env or fallback)
const _getLogoUrl = () => process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/images/logo/logo.png`
  : 'https://genfity.com/images/logo/logo.png';

/**
 * Shared email base template - Clean shadcn-inspired design
 */
function getBaseTemplate(content: string, _footerEmail: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
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
                    <!-- SVG Text Logo (works in all email clients) -->
                    <div style="font-size: 28px; font-weight: 700; color: #171717; letter-spacing: -0.5px;">
                      <span style="color: #f97316;">●</span> Genfity
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #a3a3a3; letter-spacing: 0.5px;">
                      DIGITAL ORDERING SOLUTION
                    </p>
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
                      Need assistance? <a href="mailto:sales@genfity.com" style="color: #171717; text-decoration: underline;">sales@genfity.com</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                      © ${new Date().getFullYear()} Genfity Digital Solution. All rights reserved.
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
}): string {
  const itemsHtml = params.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="font-size: 14px; color: #171717;">${item.name}</span>
        <span style="font-size: 13px; color: #737373;"> × ${item.quantity}</span>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
        <span style="font-size: 14px; color: #171717;">$${item.price.toFixed(2)}</span>
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
        Order Confirmed
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        Thank you, ${params.customerName}!
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
              <td style="font-size: 12px; color: #737373; padding-top: 8px;">Restaurant</td>
              <td style="font-size: 14px; color: #171717; text-align: right; padding-top: 8px;">${params.merchantName}</td>
            </tr>
            <tr>
              <td style="font-size: 12px; color: #737373; padding-top: 8px;">Order Type</td>
              <td style="font-size: 14px; color: #171717; text-align: right; padding-top: 8px;">${params.orderType}${params.tableNumber ? ` - Table ${params.tableNumber}` : ''}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Items -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      ${itemsHtml}
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #737373;">Subtotal</td>
        <td style="padding: 8px 0; font-size: 13px; color: #737373; text-align: right;">$${params.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #737373;">Tax</td>
        <td style="padding: 8px 0; font-size: 13px; color: #737373; text-align: right;">$${params.tax.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #171717; border-top: 1px solid #e5e5e5;">Total</td>
        <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #171717; text-align: right; border-top: 1px solid #e5e5e5;">$${params.total.toFixed(2)}</td>
      </tr>
    </table>
    
    <!-- Track Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${params.trackingUrl}" style="display: inline-block; background-color: #171717; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
            Track Your Order
          </a>
        </td>
      </tr>
    </table>
  `;

  return getBaseTemplate(content, 'support@genfity.com');
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
}): string {
  const itemsList = params.items.map(item =>
    `<li style="margin: 4px 0; font-size: 14px; color: #525252;">${item.name} × ${item.quantity}</li>`
  ).join('');

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #171717;">
        Order Complete! 🎉
      </h1>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        Thanks for dining with ${params.merchantName}
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
              <td style="font-size: 14px; font-weight: 600; color: #171717;">Total Paid</td>
              <td style="font-size: 16px; font-weight: 600; color: #171717; text-align: right;">$${params.total.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 13px; color: #737373; text-align: center;">
      We hope you enjoyed your meal!<br/>
      See you again soon.
    </p>
  `;

  return getBaseTemplate(content, 'support@genfity.com');
}
