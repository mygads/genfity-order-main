/**
 * GENFITY Design System - Styling Constants
 * 
 * Based on FRONTEND_SPECIFICATION.md
 * Use these constants for consistent styling across all pages
 */

// ========== COLORS ==========
export const COLORS = {
  // Primary
  primary: '#FF6A35',
  primaryHover: '#F1592A',
  primaryLight: '#FFF5F0',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  
  // Backgrounds
  background: '#FFFFFF',
  backgroundGray: '#F9F9F9',
  backgroundLight: '#FFF5F0',
  
  // Borders
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  
  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
} as const;

// ========== TYPOGRAPHY ==========
export const TYPOGRAPHY = {
  // Headings
  h1: 'text-[28px] font-bold leading-[1.2]', // 28px / 700
  h2: 'text-[20px] font-bold leading-[1.3]', // 20px / 700
  h3: 'text-[16px] font-bold leading-[1.4]', // 16px / 700
  
  // Body
  bodyLarge: 'text-base font-semibold leading-[1.5]', // 16px / 600
  body: 'text-sm font-semibold leading-[1.5]', // 14px / 600
  bodyRegular: 'text-sm font-normal leading-[1.5]', // 14px / 400
  
  // Small
  small: 'text-[13px] font-normal leading-[1.5]', // 13px / 400
  caption: 'text-xs font-normal leading-[1.5]', // 12px / 400
  
  // Price
  priceLarge: 'text-xl font-bold', // 20px / 700
  price: 'text-base font-bold', // 16px / 700
  priceSmall: 'text-sm font-bold', // 14px / 700
} as const;

// ========== SIZING ==========
export const SIZING = {
  // Header
  header: 'h-14', // 56px
  headerPx: '56px',
  
  // Buttons
  buttonLarge: 'h-12', // 48px
  button: 'h-11', // 44px
  buttonSmall: 'h-10', // 40px
  buttonIcon: 'w-8 h-8', // 32px
  
  // Inputs
  input: 'h-11', // 44px
  inputSmall: 'h-10', // 40px
  
  // Images
  imageLarge: 'w-20 h-20', // 80px (avatar)
  image: 'w-[70px] h-[70px]', // 70px (menu item)
  imageSmall: 'w-[60px] h-[60px]', // 60px (cart item)
  imageTiny: 'w-[50px] h-[50px]', // 50px (order summary)
  
  // Icons
  iconLarge: 'w-12 h-12', // 48px
  icon: 'w-8 h-8', // 32px
  iconSmall: 'w-5 h-5', // 20px
  
  // Containers
  containerPadding: 'px-4 py-4', // 16px
  containerPaddingLarge: 'px-6 py-6', // 24px
} as const;

// ========== SPACING ==========
export const SPACING = {
  // Gaps
  gapLarge: 'gap-4', // 16px
  gap: 'gap-3', // 12px
  gapSmall: 'gap-2', // 8px
  gapTiny: 'gap-1', // 4px
  
  // Margins
  marginLarge: 'mb-6', // 24px
  margin: 'mb-4', // 16px
  marginSmall: 'mb-3', // 12px
  marginTiny: 'mb-2', // 8px
  
  // Padding
  paddingLarge: 'p-6', // 24px
  padding: 'p-4', // 16px
  paddingSmall: 'p-3', // 12px
  paddingTiny: 'p-2', // 8px
} as const;

// ========== BORDERS ==========
export const BORDERS = {
  // Border Width
  border: 'border',
  border2: 'border-2',
  border3: 'border-[3px]',
  
  // Border Radius
  rounded: 'rounded-lg', // 8px
  roundedSmall: 'rounded', // 4px
  roundedFull: 'rounded-full',
  roundedTop: 'rounded-t-2xl', // for bottom sheets
  
  // Border Colors
  borderDefault: 'border-[#E0E0E0]',
  borderPrimary: 'border-[#FF6A35]',
  borderError: 'border-red-500',
} as const;

// ========== SHADOWS ==========
export const SHADOWS = {
  small: 'shadow-sm',
  default: 'shadow-md',
  large: 'shadow-lg',
  floating: 'shadow-[0_4px_12px_rgba(255,106,53,0.3)]',
} as const;

// ========== Z-INDEX ==========
export const Z_INDEX = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-50',
  floating: 'z-[80]',
  header: 'z-[100]',
  overlay: 'z-[200]',
  modal: 'z-[250]',
  modalOverlay: 'z-[300]',
} as const;

// ========== COMPONENT PATTERNS ==========
export const PATTERNS = {
  // Header
  header: `${SIZING.header} bg-white ${BORDERS.borderDefault} border-b px-4 flex items-center justify-between sticky top-0 ${Z_INDEX.header}`,
  
  // Button Primary
  buttonPrimary: `${SIZING.buttonLarge} bg-[#FF6A35] text-white ${TYPOGRAPHY.body} ${BORDERS.rounded} hover:bg-[#F1592A] transition-all active:scale-[0.98]`,
  
  // Button Secondary
  buttonSecondary: `${SIZING.buttonLarge} ${BORDERS.border2} ${BORDERS.borderDefault} text-[#1A1A1A] ${TYPOGRAPHY.body} ${BORDERS.rounded} hover:border-[#FF6A35] hover:text-[#FF6A35] transition-all`,
  
  // Input
  input: `${SIZING.input} px-4 ${BORDERS.border} ${BORDERS.borderDefault} ${BORDERS.rounded} text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6A35] focus:border-[#FF6A35]`,
  
  // Card
  card: `${BORDERS.border} ${BORDERS.borderDefault} ${BORDERS.rounded} bg-white ${SPACING.padding}`,
  
  // Badge
  badge: 'px-3 py-1 rounded-full text-xs font-semibold',
  
  // Modal Overlay
  modalOverlay: `fixed inset-0 bg-black bg-opacity-40 ${Z_INDEX.modalOverlay}`,
  
  // Bottom Sheet
  bottomSheet: `fixed bottom-0 left-0 right-0 bg-white ${BORDERS.roundedTop} ${Z_INDEX.modal} max-h-[85vh] overflow-y-auto`,
  
  // Center Modal
  centerModal: 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white rounded-lg',
} as const;

// ========== ANIMATIONS ==========
export const ANIMATIONS = {
  // Transitions
  transition: 'transition-all duration-200',
  transitionSlow: 'transition-all duration-300',
  
  // Hover
  hover: 'hover:scale-[1.02]',
  hoverButton: 'hover:bg-[#F1592A]',
  
  // Active
  active: 'active:scale-[0.98]',
  
  // Disabled
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  
  // Modal Entry
  slideUp: 'animate-slide-up',
  fadeIn: 'animate-fade-in',
} as const;

// ========== UTILITY FUNCTIONS ==========
export const utils = {
  /**
   * Format currency in Indonesian Rupiah
   */
  formatCurrency: (amount: number): string => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  },
  
  /**
   * Format date in Indonesian locale
   */
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },
  
  /**
   * Truncate text with ellipsis
   */
  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },
  
  /**
   * Get status badge configuration
   */
  getStatusBadge: (status: string): { bg: string; text: string; label: string } => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Dikonfirmasi' },
      ready: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Siap Diambil' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Selesai' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dibatalkan' },
    };
    return statusMap[status.toLowerCase()] || statusMap.pending;
  },
};

// ========== CSS ANIMATIONS (for tailwind.config) ==========
export const cssAnimations = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-pulse {
  animation: pulse 0.5s ease-in-out;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

const designSystem = {
  COLORS,
  TYPOGRAPHY,
  SIZING,
  SPACING,
  BORDERS,
  SHADOWS,
  Z_INDEX,
  PATTERNS,
  ANIMATIONS,
  utils,
  cssAnimations,
};

export default designSystem;
