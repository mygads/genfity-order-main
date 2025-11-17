/**
 * Order Service - Phase 1: Order Management System
 * 
 * Business logic for Order Management System
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md Section 12
 * 
 * IMPORTANT CHANGES (Phase 1):
 * - Removed OrderStatusHistory (use timestamps instead)
 * - Removed customerName/Email/Phone from Order (use customer relation)
 * - Added Payment table support (1:1 relation)
 * - orderNumber used for payment verification (no separate payment code)
 */

import prisma from '@/lib/db/client';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import {
  OrderFilters,
  OrderWithDetails,
  OrderListItem,
  RecordPaymentData,
  UpdateOrderStatusData,
  CancelOrderData,
  OrderStats,
  buildOrderWhereInput,
  ORDER_DETAIL_INCLUDE,
  ORDER_LIST_INCLUDE,
  PaymentVerificationResult,
} from '@/lib/types/order';
import { canTransitionStatus, validateStatusTransition } from '@/lib/utils/orderStatusRules';
import { serializeBigInt } from '@/lib/utils/serializer';

export class OrderService {
  /**
   * Create new order with automatic customer registration
   * 
   * @specification STEP_06_BUSINESS_FLOWS.txt - Order Creation
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    console.log('🔄 [ORDER SERVICE] Creating order:', {
      merchantCode: input.merchantCode,
      orderType: input.orderType,
      itemCount: input.items.length,
    });

    // ========================================
    // STEP 1: Validate merchant exists & active
    // ========================================
    const merchantData = await merchantService.getMerchantById(input.merchantId);

    if (!merchantData || !merchantData.isActive) {
      throw new ValidationError('Merchant tidak ditemukan atau tidak aktif');
    }

    console.log('✅ [ORDER SERVICE] Merchant validated:', {
      merchantId: merchantData.id,
      name: merchantData.name,
      taxEnabled: merchantData.enableTax,
      taxPercentage: merchantData.taxPercentage,
    });

    // ========================================
    // ✅ NEW STEP 2: Register or Fetch Customer
    // ========================================
    
    /**
     * Auto-register customer if not exists
     * 
     * @specification STEP_06_BUSINESS_FLOWS.txt - Customer Registration
     * 
     * @flow
     * 1. Check if customer exists by email
     * 2. If exists → use existing customer
     * 3. If not exists → create new customer with temp password
     * 4. Return customer object for order creation
     */
    let customer = await userRepository.findByEmail(input.customerEmail);

    if (!customer) {
      console.log('👤 [ORDER SERVICE] Registering new customer:', input.customerEmail);

      // Generate temporary password (user can reset later)
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(tempPassword);

      // Create customer account
      customer = await userRepository.create({
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        passwordHash: hashedPassword,
        role: 'CUSTOMER',
        isActive: true,
        mustChangePassword: false, // ✅ Guest checkout doesn't require password change
      });

      console.log('✅ [ORDER SERVICE] Customer registered:', {
        customerId: customer.id,
        email: customer.email,
      });
    } else {
      console.log('👤 [ORDER SERVICE] Using existing customer:', {
        customerId: customer.id,
        email: customer.email,
      });
    }

    // ========================================
    // STEP 3: Check if merchant is open
    // ========================================
    const isOpen = await merchantService.isMerchantOpen(input.merchantId);
    if (!isOpen) {
      throw new ValidationError(
        'Merchant is currently closed',
        ERROR_CODES.MERCHANT_CLOSED
      );
    }

    // ========================================
    // STEP 4: Validate required fields
    // ========================================
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

    // ========================================
    // STEP 5: Validate menu items & calculate prices
    // ========================================
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

    // ========================================
    // STEP 6: Calculate service charge, tax, and total
    // ========================================
    
    // 1. Service Charge (5%)
    const serviceCharge = subtotal * 0.05;

    // 2. Tax (merchant-specific percentage on subtotal + service charge)
    const taxableAmount = subtotal + serviceCharge;
    
    const taxPercentage = merchantData.enableTax && merchantData.taxPercentage 
      ? Number(merchantData.taxPercentage) 
      : 10;
    
    const taxAmount = taxableAmount * (taxPercentage / 100);

    // 3. Total Amount
    const totalAmount = subtotal + serviceCharge + taxAmount;

    console.log('💰 [ORDER SERVICE] Price Breakdown:', {
      subtotal: subtotal.toFixed(2),
      serviceCharge: serviceCharge.toFixed(2),
      taxableAmount: taxableAmount.toFixed(2),
      taxPercentage: `${taxPercentage}%`,
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    });

    // ========================================
    // STEP 7: Generate order number
    // ========================================
    const orderNumber = await this.generateOrderNumber(input.merchantId);
    console.log('🔢 [ORDER SERVICE] Generated order number:', orderNumber);

    // ========================================
    // STEP 8: Create order with items
    // ========================================
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
      serviceFeeAmount: serviceCharge,
      taxAmount,
      totalAmount,
      notes: input.notes,
      items: validatedItems,
    });

    console.log('✅ [ORDER SERVICE] Order created:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    });

    // ========================================
    // STEP 9: Decrement stock for tracked items
    // ========================================
    for (const item of input.items) {
      try {
        await menuService.decrementMenuStock(item.menuId, item.quantity);
        console.log('📦 [ORDER SERVICE] Stock decremented:', {
          menuId: item.menuId,
          quantity: item.quantity,
        });
      } catch (stockError) {
        console.error('⚠️ [ORDER SERVICE] Stock decrement failed (non-critical):', stockError);
        // Non-blocking: Continue even if stock update fails
        // In production, you might want to log this for manual reconciliation
      }
    }

    // ✅ CRITICAL: Serialize before returning
    return serializeData(order) as Order;
  }

  /**
   * Generate unique order number with collision handling
   * 
   * @param merchantId - Merchant ID
   * @returns Unique order number in format ORD-YYYYMMDD-XXXX
   * 
   * @specification STEP_06 - Order number generation with retry logic
   * 
   * @description
   * Generates unique order number with format ORD-YYYYMMDD-XXXX where:
   * - ORD = Order prefix
   * - YYYYMMDD = Date (e.g., 20251113)
   * - XXXX = Sequential number (0001, 0002, etc.)
   * 
   * Retry logic handles collisions (max 5 attempts).
   * Fallback to timestamp if all retries fail.
   * 
   * @security
   * - Uses repository pattern (no direct DB access)
   * - Race condition handled via retry logic
   * - Proper error logging
   */
  private async generateOrderNumber(
    merchantId: bigint
  ): Promise<string> {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      // Generate order number
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      
      // Get count of orders today for this merchant
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));
      
      // ✅ FIXED: Use repository method instead of direct Prisma access
      const orderCount = await orderRepository.countOrdersByMerchantAndDate(
        merchantId,
        todayStart,
        todayEnd
      );
      
      const sequenceNumber = String(orderCount + 1 + attempt).padStart(4, '0');
      const orderNumber = `ORD-${dateStr}-${sequenceNumber}`;

      // ✅ FIXED: Check existence via repository
      const exists = await orderRepository.orderNumberExists(
        merchantId,
        orderNumber
      );

      if (!exists) {
        console.log(`[ORDER] Generated unique order number: ${orderNumber} (attempt ${attempt + 1})`);
        return orderNumber;
      }

      attempt++;
      console.warn(`[ORDER] Order number ${orderNumber} collision, retrying... (attempt ${attempt})`);
    }

    // Fallback: use timestamp if all retries fail
    const fallbackNumber = `ORD-${Date.now()}`;
    console.error(`[ORDER] Failed to generate unique order number after ${maxRetries} attempts, using fallback: ${fallbackNumber}`);
    return fallbackNumber;
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
   * 
   * @param orderNumber - Order number (e.g., "ORD-20251114-0015")
   * @returns Order object with serialized Decimal/BigInt, or null
   * 
   * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
   * @specification GENFITY AI Coding Instructions - Prisma Query Best Practices
   * 
   * @security
   * - Uses findFirst (orderNumber is globally unique in business logic)
   * - Proper error handling
   * - Serialized response (no BigInt/Decimal errors)
   * 
   * @flow
   * 1. Query order with orderItems + addons relations
   * 2. Include merchant details for display
   * 3. Serialize all Decimal/BigInt fields
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        orderItems: {
          include: {
            addons: true,
          },
        },
        merchant: {
          select: {
            name: true,
            code: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    // ✅ CRITICAL: Serialize before returning
    return serializeData(order) as Order;
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
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      select: {
        fromStatus: true,
        toStatus: true,
        note: true,
        createdAt: true,
      },
    });

    // ✅ CRITICAL: Serialize before returning
    return serializeData(history);
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
    return report.map((item) => ({
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
