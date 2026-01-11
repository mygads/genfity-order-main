import { describe, expect, it } from 'vitest';
import {
  getBalanceAdjustmentTemplate,
  getOrderCompletedTemplate,
  getOrderConfirmationTemplate,
  getPaymentVerifiedTemplate,
  getStaffWelcomeTemplate,
  getSubscriptionExtendedTemplate,
} from '@/lib/utils/emailTemplates';

describe('emailTemplates', () => {
  it('includes powered-by footer line', () => {
    const html = getPaymentVerifiedTemplate({
      merchantName: 'Wellard Kebab House',
      paymentTypeLabel: 'Monthly Subscription',
      amountText: 'A$ 49.00',
      balanceText: 'A$ 120.00',
      periodEndText: 'Jan 31, 2026',
      dashboardUrl: 'https://order.genfity.com/admin/dashboard/subscription',
      locale: 'en',
    });

    expect(html).toContain('powered by genfity.com');
  });

  it('renders order confirmation (en) snapshot', () => {
    const html = getOrderConfirmationTemplate({
      customerName: 'Alex',
      orderNumber: '12345',
      merchantName: 'Wellard Kebab House',
      orderType: 'Dine In',
      tableNumber: '7',
      items: [
        { name: 'Chicken Kebab', quantity: 1, price: 14.5 },
        { name: 'Soft Drink', quantity: 2, price: 4.0 },
      ],
      subtotal: 22.5,
      tax: 2.25,
      total: 24.75,
      trackingUrl: 'https://order.genfity.com/WKH/order-summary?orderNumber=12345',
      currency: 'AUD',
      locale: 'en',
    });

    expect(html).toMatchSnapshot();
  });

  it('renders order completed (id) snapshot', () => {
    const html = getOrderCompletedTemplate({
      customerName: 'Budi',
      orderNumber: '999',
      merchantName: 'Warung Contoh',
      orderType: 'Takeaway',
      items: [
        { name: 'Nasi Goreng', quantity: 1, price: 20000 },
        { name: 'Es Teh', quantity: 1, price: 5000 },
      ],
      total: 25000,
      completedAt: '11 Jan 2026 07:00',
      currency: 'IDR',
      locale: 'id',
    });

    expect(html).toMatchSnapshot();
  });

  it('renders merchant email snapshots', () => {
    const payment = getPaymentVerifiedTemplate({
      merchantName: 'Wellard Kebab House',
      paymentTypeLabel: 'Deposit Top-up',
      amountText: 'A$ 100.00',
      balanceText: 'A$ 150.00',
      periodEndText: null,
      dashboardUrl: 'https://order.genfity.com/admin/dashboard/subscription',
      locale: 'en',
    });

    const balance = getBalanceAdjustmentTemplate({
      merchantName: 'Wellard Kebab House',
      adjustmentText: '+A$ 10.00',
      newBalanceText: 'A$ 60.00',
      adjustedAtText: 'Jan 11, 2026 08:00',
      reasonText: 'Manual correction',
      adjustedByText: 'Administrator',
      dashboardUrl: 'https://order.genfity.com/admin/dashboard/subscription',
      locale: 'en',
    });

    const subscription = getSubscriptionExtendedTemplate({
      merchantName: 'Wellard Kebab House',
      daysExtended: 7,
      newExpiryText: 'Jan 18, 2026',
      extendedByText: 'Administrator',
      dashboardUrl: 'https://order.genfity.com/admin/dashboard/subscription',
      locale: 'en',
    });

    expect(payment).toMatchSnapshot();
    expect(balance).toMatchSnapshot();
    expect(subscription).toMatchSnapshot();
  });

  it('renders staff welcome snapshot', () => {
    const html = getStaffWelcomeTemplate({
      name: 'Sam',
      email: 'sam@example.com',
      password: 'TempPass123',
      merchantName: 'Wellard Kebab House',
      merchantCode: 'WKH',
      loginUrl: 'https://order.genfity.com/admin/login',
      supportEmail: 'support@genfity.com',
    });

    expect(html).toMatchSnapshot();
  });
});
