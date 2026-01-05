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
    description: 'See your key metrics: total revenue, order count, average order value, and comparison with previous periods.',
    targetSelector: '[data-tutorial="revenue-summary-cards"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerIcon: 'eye',
  },
  {
    id: 'date-selector',
    title: 'Select Date Range',
    description: 'Choose the period to analyze: Today, This Week, This Month, or custom date range.',
    targetSelector: '[data-tutorial="revenue-date-selector"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Select dates',
  },
  {
    id: 'revenue-chart',
    title: 'Revenue Chart',
    description: 'Visualize your sales trends over time. Spot patterns, peak hours, and compare with previous periods.',
    targetSelector: '[data-tutorial="revenue-chart"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'top-selling-items',
    title: 'Top Selling Items',
    description: 'See which menu items are most popular. Use this to optimize your menu and stock levels.',
    targetSelector: '[data-tutorial="top-items-list"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
  },
  {
    id: 'hourly-breakdown',
    title: 'Hourly Breakdown',
    description: 'Analyze sales by hour to understand your peak times. Optimize staffing and preparation accordingly.',
    targetSelector: '[data-tutorial="hourly-chart"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    description: 'See the breakdown of payment methods used by customers: cash, card, online payments, etc.',
    targetSelector: '[data-tutorial="payment-breakdown"]',
    position: 'left',
    spotlightPadding: 8,
  },
  {
    id: 'export-revenue',
    title: 'Export Report',
    description: 'Download your revenue data as Excel/CSV for accounting or detailed analysis.',
    targetSelector: '[data-tutorial="export-revenue-btn"]',
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
    id: 'report-types',
    title: 'Choose Report Type',
    description: 'Select the type of report you need: Sales Summary, Item Performance, Category Analysis, or Custom Reports.',
    targetSelector: '[data-tutorial="report-type-selector"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'report-filters',
    title: 'Set Report Filters',
    description: 'Configure the report parameters: date range, categories to include, minimum sales threshold, etc.',
    targetSelector: '[data-tutorial="report-filters"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'generate-report',
    title: 'Generate Report',
    description: 'Click "Generate" to create your report. The data will be compiled and displayed below.',
    targetSelector: '[data-tutorial="generate-report-btn"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'report-preview',
    title: 'Report Preview',
    description: 'Review your report here. You can sort columns, search within results, and drill down into details.',
    targetSelector: '[data-tutorial="report-table"]',
    position: 'top',
    spotlightPadding: 8,
  },
  {
    id: 'report-charts',
    title: 'Visual Charts',
    description: 'Toggle to view your data as charts for easier visualization and pattern recognition.',
    targetSelector: '[data-tutorial="chart-toggle"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'download-report',
    title: 'Download Report',
    description: 'Export your report as PDF for presentations, or Excel/CSV for further analysis.',
    targetSelector: '[data-tutorial="download-report-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
  },
  {
    id: 'schedule-reports',
    title: 'Schedule Reports (Pro)',
    description: 'Set up automatic report delivery: receive daily, weekly, or monthly reports via email.',
    targetSelector: '[data-tutorial="schedule-report-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
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
// ANALYTICS TUTORIAL
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
    id: 'addon-analytics',
    title: 'Addon Analytics',
    description: 'Discover which addons are most popular and which generate the most additional revenue.',
    targetSelector: '[data-tutorial="addon-analytics"]',
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
