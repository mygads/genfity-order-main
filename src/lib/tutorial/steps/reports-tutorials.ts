/**
 * Reports & Revenue Tutorial Steps
 * Revenue tracking, reports, and analytics
 */

import type { TutorialStep } from '../types';

// ============================================
// REVENUE DASHBOARD TUTORIAL
// ============================================

export const revenueDashboardSteps: TutorialStep[] = [
  {
    id: 'go-to-revenue',
    title: 'Go to Revenue Dashboard',
    description: 'Revenue Dashboard shows your sales analytics, trends, and financial performance at a glance.',
    targetSelector: '[data-nav-item="/admin/dashboard/revenue"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Revenue',
    navigateTo: '/admin/dashboard/revenue',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'revenue-overview',
    title: 'Revenue Overview',
    description: 'This is your revenue dashboard. See your key metrics: total revenue, order count, average order value, and comparison with previous periods.',
    targetSelector: '[data-tutorial="revenue-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'date-selector',
    title: 'Select Date Range',
    description: 'Choose the period to analyze: Today, This Week, This Month, or custom date range.',
    targetSelector: '[data-tutorial="revenue-date-filter"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Select dates',
  },
  {
    id: 'revenue-controls',
    title: 'Revenue Controls',
    description: 'Use these controls to filter and customize your revenue view.',
    targetSelector: '[data-tutorial="revenue-controls"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'export-revenue',
    title: 'Export Report',
    description: 'Download your revenue data as Excel/CSV for accounting or detailed analysis.',
    targetSelector: '[data-tutorial="revenue-export-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Export!',
  },
];

// ============================================
// REPORTS TUTORIAL
// ============================================

export const reportsSteps: TutorialStep[] = [
  {
    id: 'go-to-reports',
    title: 'Go to Reports',
    description: 'Generate detailed reports for your business: sales, items, categories, and more.',
    targetSelector: '[data-nav-item="/admin/dashboard/reports"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Reports',
    navigateTo: '/admin/dashboard/reports',
  },
  {
    id: 'reports-overview',
    title: 'Reports Page',
    description: 'This is your reports page. View and analyze your business data with various report types.',
    targetSelector: '[data-tutorial="reports-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'reports-date-filter',
    title: 'Date Range Filter',
    description: 'Select the date range for your report. Choose from preset ranges or custom dates.',
    targetSelector: '[data-tutorial="reports-date-filter"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'reports-controls',
    title: 'Report Controls',
    description: 'Use these controls to configure and customize your report view.',
    targetSelector: '[data-tutorial="reports-controls"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'download-report',
    title: 'Export Report',
    description: 'Export your report as PDF for presentations, or Excel/CSV for further analysis.',
    targetSelector: '[data-tutorial="reports-export-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Export!',
  },
  {
    id: 'reports-complete',
    title: 'Reports Complete! 📊',
    description: 'Use reports to make data-driven decisions about your menu, pricing, and operations!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// ANALYTICS TUTORIAL (Merchant)
// ============================================

export const analyticsSteps: TutorialStep[] = [
  {
    id: 'go-to-analytics',
    title: 'Go to Analytics',
    description: 'Analytics provides deeper insights into customer behavior, menu performance, and business trends.',
    targetSelector: '[data-nav-item="/admin/dashboard/analytics"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Analytics',
    navigateTo: '/admin/dashboard/analytics',
  },
  {
    id: 'analytics-overview',
    title: 'Analytics Dashboard',
    description: 'Get insights into customer behavior, popular combinations, and optimization opportunities.',
    targetSelector: '[data-tutorial="analytics-overview"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'customer-insights',
    title: 'Customer Insights',
    description: 'Understand your customers: new vs returning, average spend, ordering frequency, and preferences.',
    targetSelector: '[data-tutorial="customer-insights"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'menu-performance',
    title: 'Menu Performance',
    description: 'See which items drive the most revenue, which have highest margins, and which might need attention.',
    targetSelector: '[data-tutorial="menu-performance"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'trends',
    title: 'Trends & Patterns',
    description: 'Identify weekly patterns, seasonal trends, and changes in customer behavior over time.',
    targetSelector: '[data-tutorial="trends-chart"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-complete',
    title: 'Analytics Complete! 📈',
    description: 'Use these insights to optimize your menu, pricing, and operations for maximum success!',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];

// ============================================
// SUPER ADMIN ANALYTICS TUTORIAL
// ============================================

export const superAdminAnalyticsSteps: TutorialStep[] = [
  {
    id: 'go-to-superadmin-analytics',
    title: 'Go to Platform Analytics',
    description: 'View platform-wide analytics across all merchants, orders, and revenue.',
    targetSelector: '[data-nav-item="/admin/dashboard/analytics"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Analytics',
    navigateTo: '/admin/dashboard/analytics',
  },
  {
    id: 'superadmin-analytics-overview',
    title: 'Platform Analytics',
    description: 'This is your platform-wide analytics dashboard. View aggregated data across all merchants.',
    targetSelector: '[data-tutorial="superadmin-analytics-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-period-selector',
    title: 'Select Period',
    description: 'Choose the analysis period: Today, This Week, This Month, This Year, or a custom date range.',
    targetSelector: '[data-tutorial="analytics-period-selector"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
  },
  {
    id: 'analytics-key-metrics',
    title: 'Key Metrics',
    description: 'View the most important metrics at a glance: Total Revenue, Total Orders, Unique Customers, and Average Order Value.',
    targetSelector: '[data-tutorial="analytics-key-metrics"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-revenue-currency',
    title: 'Revenue by Currency',
    description: 'See revenue breakdown by currency. Useful for platforms operating in multiple countries.',
    targetSelector: '[data-tutorial="analytics-revenue-currency"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-order-status',
    title: 'Order Status Distribution',
    description: 'View the breakdown of orders by status: Pending, Accepted, In Progress, Ready, Completed, and Cancelled.',
    targetSelector: '[data-tutorial="analytics-order-status"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-payment-methods',
    title: 'Payment Methods',
    description: 'See which payment methods are most popular: Cash, Card, Digital Wallet, etc.',
    targetSelector: '[data-tutorial="analytics-payment-methods"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-payment-status',
    title: 'Payment Status',
    description: 'Track payment status across all orders: Paid, Pending, Failed, Refunded.',
    targetSelector: '[data-tutorial="analytics-payment-status"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-order-types',
    title: 'Order Types',
    description: 'Compare order types: Dine-in, Takeaway, and Delivery distribution.',
    targetSelector: '[data-tutorial="analytics-order-types"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-merchant-charts',
    title: 'Merchant Comparison',
    description: 'Compare performance across merchants: Revenue per merchant and Orders per merchant.',
    targetSelector: '[data-tutorial="analytics-merchant-charts"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-top-merchants',
    title: 'Top Merchants',
    description: 'See your top-performing merchants ranked by revenue.',
    targetSelector: '[data-tutorial="analytics-top-merchants"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'analytics-growth-charts',
    title: 'Growth Trends',
    description: 'Track growth over time: Merchant registrations and Customer signups.',
    targetSelector: '[data-tutorial="analytics-growth-charts"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'superadmin-analytics-complete',
    title: 'Platform Analytics Complete! 📊',
    description: 'Use these insights to understand platform performance and identify growth opportunities.',
    targetSelector: null,
    position: 'center',
    showSkip: false,
  },
];
