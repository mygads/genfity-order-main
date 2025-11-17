/**
 * Order Status Transition Rules
 * 
 * Business logic for valid order status transitions
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md Section 9
 */

import { OrderStatus } from '@prisma/client';

/**
 * Allowed status transitions for each order status
 * 
 * Workflow:
 * PENDING → ACCEPTED → IN_PROGRESS → READY → COMPLETED
 *    ↓          ↓           ↓           ↓
 * CANCELLED  CANCELLED  CANCELLED  CANCELLED
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Final state - cannot be changed
  CANCELLED: [], // Final state - cannot be changed
} as const;

/**
 * Check if status transition is allowed
 * 
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 * 
 * @example
 * canTransitionStatus('PENDING', 'ACCEPTED') // true
 * canTransitionStatus('COMPLETED', 'IN_PROGRESS') // false
 */
export function canTransitionStatus(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get all possible next statuses for current status
 * 
 * @param currentStatus - Current order status
 * @returns Array of allowed next statuses
 * 
 * @example
 * getNextPossibleStatuses('PENDING') // ['ACCEPTED', 'CANCELLED']
 * getNextPossibleStatuses('COMPLETED') // []
 */
export function getNextPossibleStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if status is a final state (cannot be changed)
 * 
 * @param status - Order status to check
 * @returns true if status is final (COMPLETED or CANCELLED)
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

/**
 * Check if status is an active state (order in progress)
 * 
 * @param status - Order status to check
 * @returns true if order is active (not COMPLETED or CANCELLED)
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return !isFinalStatus(status);
}

/**
 * Validate status transition and return error message if invalid
 * 
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @returns null if valid, error message string if invalid
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): string | null {
  // Same status - no change needed
  if (currentStatus === newStatus) {
    return 'Status is already set to this value';
  }

  // Check if current status is final
  if (isFinalStatus(currentStatus)) {
    return `Cannot change status from ${currentStatus}. Order is already finalized.`;
  }

  // Check if transition is allowed
  if (!canTransitionStatus(currentStatus, newStatus)) {
    return `Cannot change status from ${currentStatus} to ${newStatus}. Invalid transition.`;
  }

  return null; // Valid transition
}
