/**
 * Category Tutorial Steps
 * Create and manage menu categories
 */

import type { TutorialStep } from '../types';

// ============================================
// CREATE CATEGORY TUTORIAL
// ============================================

export const createCategorySteps: TutorialStep[] = [
  {
    id: 'go-to-categories',
    title: 'Go to Categories',
    description: 'Categories help organize your menu. Let\'s navigate to the Categories page.',
    targetSelector: '[data-nav-item="/admin/dashboard/categories"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Categories',
    navigateTo: '/admin/dashboard/categories',
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
  },
  {
    id: 'categories-page',
    title: 'Categories Page',
    description: 'Manage your menu categories from this page.',
    targetSelector: '[data-tutorial="categories-page"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'category-filters',
    title: 'Filters',
    description: 'Filter categories by status or sort order.',
    targetSelector: '[data-tutorial="category-filters"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'category-search',
    title: 'Search',
    description: 'Type a name to find a category quickly.',
    targetSelector: '[data-tutorial="category-search"]',
    position: 'bottom',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerIcon: 'search',
  },
  {
    id: 'category-list-overview',
    title: 'Categories Overview',
    description: 'Here you can see all your menu categories. Categories are displayed to customers in this order. You can drag to reorder them!',
    targetSelector: '[data-tutorial="category-list"], [data-tutorial="category-empty-state"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'click-add-category',
    title: 'Click "Add Category"',
    description: 'Click this button to create a new category. Common examples: "Main Course", "Appetizers", "Beverages", "Desserts".',
    targetSelector: '[data-tutorial="add-category-btn"]',
    position: 'bottom-left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
    pointerLabel: 'Click here!',
    pointerIcon: 'plus',
    actionText: 'Open Form',
  },
  {
    id: 'category-modal',
    title: 'Category Form',
    description: 'A form will appear. Fill in the category details here.',
    targetSelector: '[data-tutorial="category-form-modal"]',
    position: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'category-form',
    title: 'Category Details',
    description: 'Fill in the form to create your category.',
    targetSelector: '[data-tutorial="category-form"]',
    position: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'category-name',
    title: 'Enter Category Name',
    description: 'Give your category a clear, short name. This is what customers will see when browsing your menu.',
    targetSelector: '[data-tutorial="category-name-field"]',
    position: 'right',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'left',
    pointerIcon: 'edit',
  },
  {
    id: 'category-description',
    title: 'Add Description (Optional)',
    description: 'Add a short description to help customers understand what\'s in this category. Example: "Hearty main dishes with rice or noodles".',
    targetSelector: '[data-tutorial="category-description-field"]',
    position: 'right',
    spotlightPadding: 8,
  },
  {
    id: 'category-save',
    title: 'Save Category',
    description: 'Click "Save" to create your category. You can now assign menu items to this category!',
    targetSelector: '[data-tutorial="category-save-btn"]',
    position: 'top',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'up',
    pointerLabel: 'Save!',
    pointerIcon: 'check',
  },
];

// ============================================
// EDIT CATEGORY TUTORIAL
// ============================================

export const editCategorySteps: TutorialStep[] = [
  {
    id: 'go-to-categories',
    title: 'Go to Categories',
    description: 'Navigate to the Categories page to manage your existing categories.',
    targetSelector: '[data-nav-item="/admin/dashboard/categories"]',
    position: 'right',
    spotlightPadding: 4,
    actionText: 'Go to Categories',
    navigateTo: '/admin/dashboard/categories',
  },
  {
    id: 'find-category',
    title: 'Find the Category',
    description: 'Scroll to find the category you want to edit. Categories are listed in their display order.',
    targetSelector: '[data-tutorial="category-list"]',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'click-edit',
    title: 'Click "Edit" Button',
    description: 'Click the "Edit" button on the category row to open the edit form.',
    targetSelector: '[data-tutorial="category-edit-btn"]',
    position: 'left',
    spotlightPadding: 8,
    showPointer: true,
    pointerDirection: 'right',
  },
  {
    id: 'update-category',
    title: 'Update Category Details',
    description: 'Make your changes to the name or description. The form works the same as when creating.',
    targetSelector: '[data-tutorial="category-form-modal"]',
    position: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'save-changes',
    title: 'Save Changes',
    description: 'Click "Save" to update the category. Changes are reflected immediately on your menu!',
    targetSelector: '[data-tutorial="category-save-btn"]',
    position: 'top',
    spotlightPadding: 8,
  },
];
