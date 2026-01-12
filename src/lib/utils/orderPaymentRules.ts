import { OrderType, PaymentMethod, PaymentStatus } from '@prisma/client';
import type { OrderListItem, OrderWithDetails } from '@/lib/types/order';

type OrderLike = Pick<OrderListItem | OrderWithDetails, 'orderType' | 'payment'>;

/**
 * Returns true when we should show the "Unpaid Order" confirmation
 * before allowing ACCEPTED → IN_PROGRESS.
 *
 * Rule:
 * - Paid orders: no confirmation
 * - DELIVERY + CASH_ON_DELIVERY: no confirmation (payment happens at delivery)
 * - Otherwise: confirmation needed
 */
export function shouldConfirmUnpaidBeforeInProgress(order: OrderLike): boolean {
  const paymentStatus = order.payment?.status ?? null;
  const paymentMethod = order.payment?.paymentMethod ?? null;

  const isPaid = paymentStatus === PaymentStatus.COMPLETED;
  if (isPaid) return false;

  const isCashOnDeliveryDelivery =
    order.orderType === OrderType.DELIVERY &&
    paymentMethod === PaymentMethod.CASH_ON_DELIVERY;

  return !isCashOnDeliveryDelivery;
}

/**
 * Returns true when we should show the "Unpaid Order" confirmation
 * before allowing READY → COMPLETED.
 *
 * Rule:
 * - If payment is already COMPLETED: no confirmation
 * - Otherwise: confirmation needed
 */
export function shouldConfirmUnpaidBeforeComplete(order: OrderLike): boolean {
  const paymentStatus = order.payment?.status ?? null;
  return paymentStatus !== PaymentStatus.COMPLETED;
}
