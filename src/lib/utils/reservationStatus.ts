/**
 * Reservation status helpers
 *
 * Reservation has a persisted status (PENDING/ACCEPTED/CANCELLED).
 * Once accepted, the linked order drives a derived display status:
 * - IN_PROGRESS when order is IN_PROGRESS or READY
 * - COMPLETED when order is COMPLETED
 */

import type { OrderStatus, ReservationStatus } from '@prisma/client';

export type ReservationDisplayStatus =
	| 'PENDING'
	| 'ACCEPTED'
	| 'IN_PROGRESS'
	| 'COMPLETED'
	| 'CANCELLED';

export function getReservationDisplayStatus(input: {
	status: ReservationStatus;
	orderStatus?: OrderStatus | null;
}): ReservationDisplayStatus {
	if (input.status === 'CANCELLED') return 'CANCELLED';
	if (input.status === 'PENDING') return 'PENDING';

	// ACCEPTED
	const orderStatus = input.orderStatus;
	if (!orderStatus) return 'ACCEPTED';

	if (orderStatus === 'COMPLETED') return 'COMPLETED';
	if (orderStatus === 'IN_PROGRESS' || orderStatus === 'READY') return 'IN_PROGRESS';

	// If an order is cancelled, reflect that in reservation display.
	if (orderStatus === 'CANCELLED') return 'CANCELLED';

	return 'ACCEPTED';
}
