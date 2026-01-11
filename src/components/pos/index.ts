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

export {
  CustomerInfoModal,
  TableNumberModal,
  OrderNotesModal,
  ItemNotesModal,
  OrderSuccessModal,
} from './POSModals';

