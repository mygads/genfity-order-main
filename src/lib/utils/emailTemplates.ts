/**
 * Email Templates
 * HTML templates for email notifications (STEP_03)
 */

/**
 * Password notification email template
 * Sent when new merchant/staff account is created
 */
export function getPasswordNotificationTemplate(params: {
  name: string;
  email: string;
  tempPassword: string;
  dashboardUrl: string;
  supportEmail: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #ff9800;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #ff9800;
            margin: 0;
            font-size: 32px;
        }
        .header p {
            color: #666;
            margin: 5px 0 0 0;
        }
        .content {
            padding: 20px 0;
            color: #333;
            line-height: 1.6;
        }
        .credentials {
            background-color: #f9f9f9;
            padding: 20px;
            border-left: 4px solid #ff9800;
            margin: 20px 0;
            border-radius: 4px;
        }
        .credentials .label {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .credentials .value {
            font-family: 'Courier New', monospace;
            color: #ff9800;
            font-weight: bold;
            font-size: 16px;
            background-color: white;
            padding: 8px 12px;
            border-radius: 4px;
            margin-top: 5px;
            display: inline-block;
        }
        .warning {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .warning strong {
            color: #856404;
        }
        .button {
            display: inline-block;
            background-color: #ff9800;
            color: white !important;
            padding: 14px 28px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #e68900;
        }
        .steps {
            background-color: #f0f0f0;
            padding: 15px 20px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .steps ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 8px 0;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 30px;
        }
        .footer a {
            color: #ff9800;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ GENFITY</h1>
            <p>Online Ordering Platform for Restaurants</p>
        </div>

        <div class="content">
            <h2 style="color: #333;">Welcome! Your Account Has Been Created</h2>
            <p>Hello <strong>${params.name}</strong>,</p>
            <p>We're pleased to inform you that your account on the GENFITY platform has been activated.</p>

            <div class="credentials">
                <div class="label">📧 Email:</div>
                <div class="value">${params.email}</div>
                <br><br>
                <div class="label">🔑 Temporary Password:</div>
                <div class="value">${params.tempPassword}</div>
            </div>

            <div style="text-align: center;">
                <a href="${params.dashboardUrl}" class="button">Login to Dashboard</a>
            </div>

            <div class="warning">
                <strong>⚠️ IMPORTANT:</strong><br>
                ✓ Change your password when you login for the first time!<br>
                ✓ Do not share this password with anyone.<br>
                ✓ Keep this email in a safe place.
            </div>

            <div class="steps">
                <h3 style="margin-top: 0; color: #333;">Next Steps:</h3>
                <ol>
                    <li>Open the <a href="${params.dashboardUrl}" style="color: #ff9800;">Merchant Dashboard</a></li>
                    <li>Login with the email and temporary password above</li>
                    <li>Change your password to a stronger one</li>
                    <li>Start setting up your menu & merchant configuration</li>
                </ol>
            </div>

            <p>If you have any questions, please contact us at <strong>${params.supportEmail}</strong>.</p>
        </div>

        <div class="footer">
            &copy; 2025 GENFITY. All rights reserved.<br>
            Powered by GENFITY | <a href="#">Privacy Policy</a>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Order confirmation email template
 * Sent to customer after order is placed
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
  const itemsHtml = params.items
    .map(
      (item) => `
    <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #ff9800; padding-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #ff9800;">Order Confirmed!</h1>
        </div>
        <h2>Hello ${params.customerName},</h2>
        <p>Your order at <strong>${params.merchantName}</strong> has been received.</p>
        <p><strong>Order Number:</strong> ${params.orderNumber}</p>
        <p><strong>Order Type:</strong> ${params.orderType}</p>
        ${params.tableNumber ? `<p><strong>Table Number:</strong> ${params.tableNumber}</p>` : ''}
        
        <h3>Order Details:</h3>
        <table>
            ${itemsHtml}
            <tr>
                <td colspan="2" style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
                <td style="padding: 8px; text-align: right;">$${params.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 8px; text-align: right;"><strong>Tax:</strong></td>
                <td style="padding: 8px; text-align: right;">$${params.tax.toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
                <td colspan="2" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
                <td style="padding: 12px; text-align: right; font-size: 18px; color: #ff9800;"><strong>$${params.total.toFixed(2)}</strong></td>
            </tr>
        </table>
        
        <p style="text-align: center;">
            <a href="${params.trackingUrl}" style="display: inline-block; background-color: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Track Your Order</a>
        </p>
        
        <p style="text-align: center; color: #666; font-size: 12px;">
            &copy; 2025 GENFITY. All rights reserved.
        </p>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Order completed email template
 * Sent to customer when order status changes to COMPLETED
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
  const itemsHtml = params.items
    .map(
      (item) => `
    <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 15px; }
        .success-icon { font-size: 48px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1 style="color: #22c55e; margin: 0;">Order Completed!</h1>
        </div>
        
        <div style="padding: 20px 0;">
            <h2 style="color: #333;">Thank you, ${params.customerName}!</h2>
            <p style="color: #666;">Your order at <strong>${params.merchantName}</strong> has been completed successfully.</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534;">
                    <strong>Order Number:</strong> ${params.orderNumber}<br>
                    <strong>Order Type:</strong> ${params.orderType}<br>
                    <strong>Completed At:</strong> ${params.completedAt}
                </p>
            </div>
            
            <h3 style="color: #333;">Order Summary:</h3>
            <table>
                <thead>
                    <tr style="background-color: #f9f9f9;">
                        <th style="padding: 10px; text-align: left;">Item</th>
                        <th style="padding: 10px; text-align: center;">Qty</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f0fdf4;">
                        <td colspan="2" style="padding: 12px; text-align: right;"><strong>Total Paid:</strong></td>
                        <td style="padding: 12px; text-align: right; font-size: 18px; color: #22c55e;"><strong>$${params.total.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="background-color: #fef9c3; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #854d0e;">
                    <strong>💬 We'd love your feedback!</strong><br>
                    Thank you for ordering with us. We hope you enjoyed your meal!
                </p>
            </div>
        </div>
        
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 12px;">
            <p style="margin: 0;">
                Powered by <strong style="color: #ff9800;">GENFITY</strong><br>
                &copy; 2025 GENFITY. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}
