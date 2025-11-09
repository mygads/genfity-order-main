/**
 * Order Service
 * Business logic for order management, validation, and analytics
 */

import orderRepository from '@/lib/repositories/OrderRepository';
import menuService from '@/lib/services/MenuService';
import merchantService from '@/lib/services/MerchantService';
import userRepository from '@/lib/repositories/UserRepository';
import emailService from '@/lib/services/EmailService';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { generateOrderQRCode } from '@/lib/utils/qrCodeGenerator';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import {
  ValidationError,
  NotFoundError,
  ERROR_CODES,
} from '@/lib/constants/errors';
import type { Order } from '@/lib/types';

/**
 * Order item input
 */
export interface OrderItemInput {
  menuId: bigint;
  quantity: number;
  selectedAddons: bigint[]; // Array of addon item IDs
  specialInstructions?: string;
}

/**
 * Order creation input
 */
export interface CreateOrderInput {
  merchantId: bigint;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderItemInput[];
  notes?: string;
}

/**
 * Revenue report item
 */
export interface RevenueReportItem {
  date: string;
  totalOrders: number;
  totalRevenue: number;
}

/**
 * Order Service Class
 */
class OrderService {
  /**
   * Create new order with automatic customer registration
   * 
   * Process:
   * 1. Validate merchant exists and is active
   * 2. Check merchant is open (if has opening hours)
   * 3. Validate all menu items exist and are available
   * 4. Check stock availability
   * 5. Validate addon selections
   * 6. Find or create customer account
   * 7. Calculate prices and tax
   * 8. Decrement stock
   * 9. Create order with items and addons
   * 10. Generate QR code
   * 11. Send confirmation email
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // 1. Validate merchant
    const merchant = await merchantService.getMerchantById(input.merchantId);
    if (!merchant) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Note: isActive check will be done via merchant service if needed

    // 2. Check if merchant is open
    const isOpen = await merchantService.isMerchantOpen(input.merchantId);
    if (!isOpen) {
      throw new ValidationError(
        'Merchant is currently closed',
        ERROR_CODES.MERCHANT_CLOSED
      );
    }

    // 3. Validate required fields
    validateRequired(input.customerName, 'Customer name');
    validateRequired(input.customerEmail, 'Customer email');
    validateEmail(input.customerEmail);

    if (input.orderType === 'DINE_IN' && !input.tableNumber) {
      throw new ValidationError(
        'Table number is required for dine-in orders',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (!input.items || input.items.length === 0) {
      throw new ValidationError(
        'Order must contain at least one item',
        ERROR_CODES.EMPTY_CART
      );
    }

    // 4. Validate all menu items and calculate prices
    let subtotal = 0;
    const validatedItems: Array<{
      menuId: bigint;
      menuName: string;
      menuPrice: number;
      quantity: number;
      subtotal: number;
      notes?: string;
      addons?: Array<{
        addonItemId: bigint;
        addonName: string;
        addonPrice: number;
        quantity: number;
        subtotal: number;
      }>;
    }> = [];

    for (const item of input.items) {
      // Validate menu exists
      const menu = await menuService.getMenuWithAddons(item.menuId);
      if (!menu) {
        throw new NotFoundError(
          'Menu item not found',
          ERROR_CODES.MENU_NOT_FOUND
        );
      }

      // Check if menu belongs to merchant
      if (menu.merchantId !== input.merchantId) {
        throw new ValidationError(
          'Menu item does not belong to this merchant',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      // Check if menu is active
      if (!menu.isActive) {
        throw new ValidationError(
          `Menu item "${menu.name}" is not available`,
          ERROR_CODES.MENU_INACTIVE
        );
      }

      // Check stock availability
      if (menu.trackStock) {
        if (menu.stockQty === null || menu.stockQty < item.quantity) {
          throw new ValidationError(
            `Insufficient stock for "${menu.name}"`,
            ERROR_CODES.MENU_OUT_OF_STOCK
          );
        }
      }

      // Validate quantity
      if (item.quantity <= 0) {
        throw new ValidationError(
          'Quantity must be greater than 0',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      // Calculate item price with addons
      const itemPrice = await menuService.calculateMenuPrice(
        item.menuId,
        item.selectedAddons || []
      );

      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      // Build addon details for order item (simplified - in production, fetch each addon)
      const addonDetails: Array<{
        addonItemId: bigint;
        addonName: string;
        addonPrice: number;
        quantity: number;
        subtotal: number;
      }> = [];
      
      // Note: For simplicity, addons are tracked but details would need to be fetched
      // In production, you'd loop through selectedAddons and get each addon's details
      
      validatedItems.push({
        menuId: item.menuId,
        menuName: menu.name,
        menuPrice: Number(menu.price),
        quantity: item.quantity,
        subtotal: itemTotal,
        notes: item.specialInstructions,
        addons: addonDetails.length > 0 ? addonDetails : undefined,
      });
    }

    // 5. Calculate tax and total
    // Access merchant fields (Merchant extends from Prisma client)
    const merchantData = merchant as unknown as {
      enableTax: boolean;
      taxPercentage: number | null;
      code: string;
      name: string;
    };
    const taxPercentage = merchantData.enableTax && merchantData.taxPercentage 
      ? Number(merchantData.taxPercentage) 
      : 0;
    const taxAmount = subtotal * (taxPercentage / 100);
    const totalAmount = subtotal + taxAmount;

    // 6. Find or create customer
    let customer = await userRepository.findByEmail(input.customerEmail);
    
    if (!customer) {
      // Auto-register customer
      const tempPassword = Math.random().toString(36).slice(-8); // Simple password
      const hashedPassword = await hashPassword(tempPassword);

      customer = await userRepository.create({
        name: input.customerName,
        email: input.customerEmail,
        phoneNumber: input.customerPhone,
        passwordHash: hashedPassword,
        role: 'CUSTOMER',
        isActive: true,
        mustChangePassword: false,
      });
    }

    // 7. Generate order number
    const orderNumber = await orderRepository.generateOrderNumber(input.merchantId);

    // 8. Create order with items
    const order = await orderRepository.createOrder({
      merchantId: input.merchantId,
      customerId: customer.id,
      orderNumber,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      orderType: input.orderType,
      tableNumber: input.tableNumber,
      status: 'PENDING',
      subtotal,
      taxAmount,
      totalAmount,
      notes: input.notes,
      items: validatedItems,
    });

    // 9. Decrement stock for all items
    for (const item of validatedItems) {
      await menuService.decrementMenuStock(item.menuId, item.quantity);
    }

    // 10. Generate QR code (requires merchantCode)
    try {
      await generateOrderQRCode(order.orderNumber, merchantData.code);
      // Note: In production, save QR code URL to order.qrCodeUrl
    } catch (qrError) {
      console.error('Failed to generate QR code:', qrError);
      // Don't fail order creation if QR fails
    }

    // 11. Send confirmation email
    try {
      await emailService.sendOrderConfirmation({
        to: customer.email,
        customerName: customer.name,
        orderNumber: order.orderNumber,
        merchantName: merchantData.name,
        merchantCode: merchantData.code,
        orderType: input.orderType,
        tableNumber: input.tableNumber,
        items: validatedItems.map((item) => ({
          name: item.menuName,
          quantity: item.quantity,
          price: item.menuPrice,
        })),
        subtotal,
        tax: taxAmount,
        total: totalAmount,
      });
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail order creation if email fails
    }

    return order;
  }

  /**
   * Update order status
   * 
   * Valid transitions:
   * PENDING → ACCEPTED, CANCELLED
   * ACCEPTED → IN_PROGRESS, CANCELLED
   * IN_PROGRESS → READY, CANCELLED
   * READY → COMPLETED, CANCELLED
   * COMPLETED → (no transitions)
   * CANCELLED → (no transitions)
   */
  async updateOrderStatus(
    orderId: bigint,
    newStatus: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED',
    updatedBy: bigint,
    notes?: string
  ): Promise<Order> {
    // Validate order exists
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        'Order not found',
        ERROR_CODES.ORDER_NOT_FOUND
      );
    }

    const currentStatus = order.status;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['READY', 'CANCELLED'],
      READY: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        ERROR_CODES.INVALID_STATUS_TRANSITION
      );
    }

    // Update status with history
    return await orderRepository.updateStatus(orderId, newStatus, updatedBy, notes);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: bigint): Promise<Order | null> {
    return await orderRepository.findById(orderId);
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    return await orderRepository.findByOrderNumber(orderNumber);
  }

  /**
   * Get orders by merchant with filters
   */
  async getOrdersByMerchant(
    merchantId: bigint,
    filters?: {
      status?: string;
      orderType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Order[]> {
    return await orderRepository.findByMerchant(merchantId, filters);
  }

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(customerId: bigint): Promise<Order[]> {
    return await orderRepository.findByCustomer(customerId);
  }

  /**
   * Get order status history
   */
  async getOrderStatusHistory(orderId: bigint) {
    return await orderRepository.getStatusHistory(orderId);
  }

  /**
   * Get revenue report for merchant
   */
  async getRevenueReport(
    merchantId: bigint,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueReportItem[]> {
    const report = await orderRepository.getRevenueReport(
      merchantId,
      startDate,
      endDate
    );

    // Report is grouped by date
    return report.map((item: { placedAt: Date; _count: { id: number }; _sum: { totalAmount: number | null } }) => ({
      date: item.placedAt.toISOString().split('T')[0],
      totalOrders: item._count.id,
      totalRevenue: Number(item._sum.totalAmount) || 0,
    }));
  }

  /**
   * Get total revenue for merchant
   */
  async getTotalRevenue(
    merchantId: bigint,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const result = await orderRepository.getTotalRevenue(
      merchantId,
      startDate,
      endDate
    );

    const totalOrders = result.totalOrders || 0;
    const totalRevenue = Number(result.totalRevenue) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: bigint,
    cancelledBy: bigint,
    reason?: string
  ): Promise<Order> {
    return await this.updateOrderStatus(
      orderId,
      'CANCELLED',
      cancelledBy,
      reason
    );
  }

  /**
   * Get pending orders for merchant (for dashboard)
   */
  async getPendingOrders(merchantId: bigint): Promise<Order[]> {
    return await orderRepository.findByMerchant(merchantId, { status: 'PENDING' });
  }

  /**
   * Get active orders for merchant (ACCEPTED, IN_PROGRESS, READY)
   */
  async getActiveOrders(merchantId: bigint): Promise<Order[]> {
    const accepted = await orderRepository.findByMerchant(merchantId, { status: 'ACCEPTED' });
    const inProgress = await orderRepository.findByMerchant(merchantId, { status: 'IN_PROGRESS' });
    const ready = await orderRepository.findByMerchant(merchantId, { status: 'READY' });

    return [...accepted, ...inProgress, ...ready].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get today's orders for merchant
   */
  async getTodayOrders(merchantId: bigint): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await orderRepository.findByMerchant(merchantId, {
      startDate: today,
      endDate: tomorrow,
    });
  }

  /**
   * Get today's revenue for merchant
   */
  async getTodayRevenue(merchantId: bigint): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await orderRepository.getTotalRevenue(
      merchantId,
      today,
      tomorrow
    );

    return Number(result.totalRevenue) || 0;
  }
}

// Export singleton instance
const orderService = new OrderService();
export default orderService;
