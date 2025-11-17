import React from "react";

export interface BadgeProps {
  /**
   * Badge content (text, icons, numbers)
   */
  children: React.ReactNode;
  
  /**
   * Semantic variant for color scheme
   * @default 'default'
   */
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info' | 'secondary';
  
  /**
   * Size preset
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Additional Tailwind classes for customization
   */
  className?: string;
}

/**
 * Badge Component
 * 
 * A versatile badge component for displaying labels, status, and counts.
 * Follows GENFITY design system with minimal color palette and professional styling.
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 * @reference /admin/dashboard/revenue - Professional design patterns
 * 
 * @features
 * - Minimal color palette (gray/white dominant with semantic colors)
 * - Full dark mode support
 * - Three sizes: sm (12px), md (14px), lg (16px)
 * - Six semantic variants: default, danger, warning, success, info, secondary
 * - Custom className support for overrides
 * - Smooth transitions (150ms)
 * - Rounded pill shape
 * 
 * @example Basic usage
 * ```tsx
 * <Badge variant="danger" size="sm">PROMO</Badge>
 * ```
 * 
 * @example With custom styles
 * ```tsx
 * <Badge variant="warning" className="animate-pulse">3 left</Badge>
 * ```
 * 
 * @example Custom override
 * ```tsx
 * <Badge variant="secondary" className="bg-red-500 text-white">
 *   Sold Out
 * </Badge>
 * ```
 */
export default function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  // ========================================
  // VARIANT STYLES - Minimal Palette
  // ========================================
  // Uses light backgrounds with darker text for readability
  // Dark mode: Semi-transparent backgrounds with lighter text
  const variantClasses: Record<string, string> = {
    // Gray for neutral/default states
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    
    // Red for errors, urgent, promo
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    
    // Yellow for warnings, low stock
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    
    // Green for success, available
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    
    // Blue for informational
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    
    // Purple for secondary/alternate
    secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  // ========================================
  // SIZE STYLES - Consistent Spacing
  // ========================================
  // Follows 4px/8px spacing system
  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',      // Small: 8px/2px padding, 12px font
    md: 'px-2.5 py-1 text-sm',      // Medium: 10px/4px padding, 14px font
    lg: 'px-3 py-1.5 text-base',    // Large: 12px/6px padding, 16px font
  };

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        rounded-full font-medium
        transition-colors duration-150
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </span>
  );
}
