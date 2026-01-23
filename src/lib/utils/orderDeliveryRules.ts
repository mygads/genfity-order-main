import { OrderType } from '@prisma/client';
import type { OrderListItem, OrderWithDetails } from '@/lib/types/order';

type OrderLike = Pick<OrderListItem | OrderWithDetails, 'orderType' | 'deliveryStatus'>;

/**
 * Returns true when we should show a confirmation
 * before allowing a DELIVERY order to be completed.
 *
 * Rule:
 * - Non-delivery orders: no confirmation
 * - Delivery orders: confirmation needed if deliveryStatus is not DELIVERED
 */
export function shouldConfirmUndeliveredBeforeComplete(order: OrderLike): boolean {
  if (order.orderType !== OrderType.DELIVERY) return false;
  return (order.deliveryStatus ?? null) !== 'DELIVERED';
}
