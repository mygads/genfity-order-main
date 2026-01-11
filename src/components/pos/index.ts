/**
 * POS Components Index
 * 
 * Export all POS-related components for easy imports
 */

export { POSCartPanel } from './POSCartPanel';
export type { CartItem, CartAddon, CustomerInfo } from './POSCartPanel';

export { POSProductGrid } from './POSProductGrid';
export type { MenuItem, MenuCategory } from './POSProductGrid';

export { POSAddonModal } from './POSAddonModal';
export type { AddonCategory, AddonItem, SelectedAddon } from './POSAddonModal';

export { POSPaymentModal } from './POSPaymentModal';
export type { POSPaymentData, POSPaymentMethod, DiscountType } from './POSPaymentModal';

export { POSSkeleton } from './POSSkeleton';

export { POSOrderHistoryPanel } from './POSOrderHistoryPanel';

export { POSHeldOrdersPanel } from './POSHeldOrdersPanel';
export type { HeldOrder } from './POSHeldOrdersPanel';

export { POSPendingOrdersPanel } from './POSPendingOrdersPanel';

export {
  CustomerInfoModal,
  TableNumberModal,
  OrderNotesModal,
  ItemNotesModal,
  OrderSuccessModal,
} from './POSModals';

export { default as CustomerLookupModal } from './CustomerLookupModal';
export { default as OfflineSyncIndicator } from './OfflineSyncIndicator';
export { default as ConflictResolutionModal } from './ConflictResolutionModal';
export { default as OfflineOrderConflictResolutionModal } from './OfflineOrderConflictResolutionModal';

