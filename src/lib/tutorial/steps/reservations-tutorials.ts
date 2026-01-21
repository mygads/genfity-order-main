/**
 * Reservations Tutorial Steps
 * Manage table reservations and preorders
 */

import type { TutorialStep } from '../types';

export const reservationsSteps: TutorialStep[] = [
  {
    id: 'go-to-reservations',
    title: 'Go to Reservations',
    description: 'Open the Reservations page to manage table bookings and preorders.',
    targetSelector: '[data-nav-item="/admin/dashboard/reservations"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Reservations',
    navigateTo: '/admin/dashboard/reservations',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'reservations-overview',
    title: 'Reservations Overview',
    description: 'Here you can see all upcoming reservations and their status.',
    targetSelector: '[data-tutorial="reservations-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'reservations-filters',
    title: 'Search & Filters',
    description: 'Use search and filters to find reservations by customer, date, or status.',
    targetSelector: '[data-tutorial="reservations-filters"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerIcon: 'search',
  },
  {
    id: 'reservations-search',
    title: 'Search Reservations',
    description: 'Type a name or phone number to find a booking quickly.',
    targetSelector: '[data-tutorial="reservations-search"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'reservations-list',
    title: 'Reservation List',
    description: 'Each row shows the date, time, party size, and current status.',
    targetSelector: '[data-tutorial="reservations-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'reservation-card',
    title: 'Reservation Details',
    description: 'Open a reservation to review customer details and notes.',
    targetSelector: '[data-tutorial="reservation-card"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'reservation-actions',
    title: 'Accept or Cancel',
    description: 'Accept to confirm a reservation or cancel if it cannot be served.',
    targetSelector: '[data-tutorial="reservation-accept-btn"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'reservation-cancel',
    title: 'Cancel Reservation',
    description: 'Use Cancel when a reservation cannot be served.',
    targetSelector: '[data-tutorial="reservation-cancel-btn"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'reservation-view-order',
    title: 'View Linked Order',
    description: 'Use View to open the linked order or preorder details.',
    targetSelector: '[data-tutorial="reservation-view-btn"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'reservations-complete',
    title: 'Reservations Complete! 📅',
    description: 'You are ready to manage reservations and preorders smoothly.',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];
