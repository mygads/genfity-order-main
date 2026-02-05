/**
 * Wellard Kebab House - Comprehensive Seed Data
 * Reference: UberEats Menu - https://www.ubereats.com/au/store/wellard-kebab-house/
 * 
 * Merchant Details:
 * - Name: Wellard Kebab House
 * - Address: 10a The Strand, Wellard WA 6170, Australia
 * - Phone: +61863929492
 * - Hours: 11:00 AM - 9:00 PM (All days)
 * - Owner: wellardkebab@gmail.com / 1234abcd
 * - Pin: PRP8+QM Wellard, Western Australia, Australia
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// MERCHANT DATA
// ============================================
export const merchantData = {
  code: 'WELLARD01',
  name: 'Wellard Kebab House',
  email: 'wellardkebab@gmail.com',
  phone: '+61863929492',
  address: '10a The Strand',
  city: 'Wellard',
  state: 'WA',
  postalCode: '6170',
  country: 'Australia',
  description: 'Authentic Turkish kebabs, gozleme, Turkish pizza, pide, burgers, and more. Fresh ingredients and traditional recipes.',
  currency: 'AUD',
  enableTax: true,
  taxPercentage: 10.0,
  latitude: -32.27497,
  longitude: 115.83916,
  timezone: 'Australia/Perth',
  isDineInEnabled: true,
  isTakeawayEnabled: true,
  dineInLabel: 'Dine In',
  takeawayLabel: 'Takeaway',
};

// ============================================
// OWNER USER DATA
// ============================================
export const ownerData = {
  name: 'Wellard Kebab Owner',
  email: 'wellardkebab@gmail.com',
  password: '1234abcd',
  role: 'MERCHANT_OWNER' as const,
  merchantRole: 'OWNER' as const,
};

// ============================================
// OPENING HOURS - 11:00 AM to 9:00 PM (All days)
// ============================================
export const openingHours = [
  { dayOfWeek: 0, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Sunday
  { dayOfWeek: 1, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Monday
  { dayOfWeek: 2, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Tuesday
  { dayOfWeek: 3, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Wednesday
  { dayOfWeek: 4, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Thursday
  { dayOfWeek: 5, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Friday
  { dayOfWeek: 6, openTime: '11:00', closeTime: '21:00', isClosed: false }, // Saturday
];

// ============================================
// MENU CATEGORIES
// ============================================
export const menuCategories = [
  { name: 'Picked for You', description: 'Our most popular items', sortOrder: 1 },
  { name: 'Sides', description: 'Chips and extras', sortOrder: 2 },
  { name: 'Salad Meals', description: 'Fresh salad with your choice of meat', sortOrder: 3 },
  { name: 'Meals', description: 'Served with lettuce, tomato, onion & sauce', sortOrder: 4 },
  { name: 'Fish and Chips', description: 'Classic fish and chips', sortOrder: 5 },
  { name: 'Kebabs', description: 'Served with lettuce, tomato, onion & sauce', sortOrder: 6 },
  { name: 'Burgers', description: 'Served with lettuce, tomato, onion & sauce', sortOrder: 7 },
  { name: 'Gozleme', description: 'Traditional Turkish flatbread', sortOrder: 8 },
  { name: 'Meat Box', description: 'Served with chips & sauce', sortOrder: 9 },
  { name: 'Turkish Pizza', description: 'Turkish style pizza', sortOrder: 10 },
  { name: 'Pide', description: 'Served with spinach, capsicum, fetta & cheddar cheese', sortOrder: 11 },
  { name: 'Shish Kebab & Meals', description: 'Grilled skewer meals', sortOrder: 12 },
  { name: 'Drinks', description: 'Refreshing beverages', sortOrder: 13 },
  { name: 'Dessert', description: 'Sweet treats', sortOrder: 14 },
];

// ============================================
// ADDON CATEGORIES
// ============================================
export const addonCategories = [
  {
    name: 'Choice of Size',
    description: 'Select your preferred size',
    minSelection: 1,
    maxSelection: 1,
    items: [
      { name: 'Small', price: 0, displayOrder: 1 },
      { name: 'Regular', price: 4.50, displayOrder: 2 },
      { name: 'Large', price: 9.50, displayOrder: 3 },
    ],
  },
  {
    name: 'Choice of Sauce',
    description: 'Choose between 1 and 2',
    minSelection: 1,
    maxSelection: 2,
    items: [
      { name: 'Tomato', price: 0, displayOrder: 1 },
      { name: 'Satay', price: 0, displayOrder: 2 },
      { name: 'Sweet Chilli', price: 0, displayOrder: 3 },
      { name: 'Mayonnaise', price: 0, displayOrder: 4 },
      { name: 'BBQ', price: 0, displayOrder: 5 },
      { name: 'Hummus', price: 0, displayOrder: 6 },
      { name: 'Chilli', price: 0, displayOrder: 7 },
      { name: 'Garlic', price: 0, displayOrder: 8 },
      { name: 'Sour Cream', price: 0, displayOrder: 9 },
    ],
  },
  {
    name: 'Choice of Preparation',
    description: 'How would you like it prepared?',
    minSelection: 1,
    maxSelection: 1,
    items: [
      { name: 'Salad', price: 0, displayOrder: 1 },
      { name: 'The Lot Egg and Cheese', price: 4.00, displayOrder: 2 },
      { name: 'Double Meat', price: 5.00, displayOrder: 3 },
      { name: 'Double Meat and The Lot', price: 6.00, displayOrder: 4 },
    ],
  },
  {
    name: 'Burger Preparation',
    description: 'Choose your burger style',
    minSelection: 1,
    maxSelection: 1,
    items: [
      { name: 'Salad', price: 0, displayOrder: 1 },
      { name: 'Cheese and Egg', price: 3.00, displayOrder: 2 },
    ],
  },
  {
    name: 'Make It a Combo',
    description: 'Add chips and drink',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'Chips and Can Drink', price: 11.00, displayOrder: 1 },
    ],
  },
  {
    name: 'Extras',
    description: 'Choose up to 2',
    minSelection: 0,
    maxSelection: 2,
    items: [
      { name: 'Egg', price: 2.00, displayOrder: 1 },
      { name: 'Cheese', price: 2.00, displayOrder: 2 },
    ],
  },
  {
    name: 'Remove Ingredients',
    description: 'Choose up to 1',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'No Tomato', price: 0, displayOrder: 1 },
      { name: 'No Onion', price: 0, displayOrder: 2 },
      { name: 'No Lettuce', price: 0, displayOrder: 3 },
    ],
  },
  {
    name: 'Remove Ingredients 2',
    description: 'Choose up to 1',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'No Olives', price: 0, displayOrder: 1 },
      { name: 'No Jalapeños', price: 0, displayOrder: 2 },
    ],
  },
  {
    name: 'Extra Toppings',
    description: 'Choose up to 1',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'Olives', price: 1.50, displayOrder: 1 },
      { name: 'Jalapeños', price: 1.50, displayOrder: 2 },
    ],
  },
  {
    name: 'Double Meat',
    description: 'Add extra meat',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'Double Meat', price: 5.00, displayOrder: 1 },
    ],
  },
  {
    name: 'Extra Cheese',
    description: 'Add cheese to your box',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'Cheese', price: 1.50, displayOrder: 1 },
    ],
  },
  {
    name: 'With Salad',
    description: 'Add salad to your order',
    minSelection: 0,
    maxSelection: 1,
    items: [
      { name: 'With Salad', price: 3.00, displayOrder: 1 },
    ],
  },
];

// ============================================
// MENU ITEMS
// ============================================
export const menuItems = [
  // ========== PICKED FOR YOU (Most Popular) ==========
  {
    category: 'Picked for You',
    name: 'Chicken Meat Box',
    description: 'Tender pieces of chicken in a convenient box.',
    price: 19.00,
    isActive: true,
    isBestSeller: true,
    isSignature: true,
    addonCategories: ['Double Meat', 'Extra Cheese', 'Make It a Combo', 'Choice of Sauce'],
  },
  {
    category: 'Picked for You',
    name: 'Chicken Kebab',
    description: 'Tender chicken skewers, marinated to perfection.',
    price: 18.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Picked for You',
    name: 'Chips',
    description: 'Crispy fried potato strips served as a side dish.',
    price: 7.50,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Size'],
  },
  {
    category: 'Picked for You',
    name: 'Chips and Gravy',
    description: 'Crispy fried potato strips served with a rich, savory gravy.',
    price: 8.50,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Size'],
  },

  // ========== SIDES ==========
  {
    category: 'Sides',
    name: 'Chips',
    description: 'Crispy fried potato strips served as a side dish.',
    price: 7.50,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Size'],
  },
  {
    category: 'Sides',
    name: 'Chips and Gravy',
    description: 'Crispy fried potato strips served with a rich, savory gravy.',
    price: 8.50,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Size'],
  },
  {
    category: 'Sides',
    name: 'Cheese Chips',
    description: 'Crispy chips smothered in melted cheese.',
    price: 8.50,
    isActive: true,
    addonCategories: ['Choice of Size'],
  },
  {
    category: 'Sides',
    name: 'Small tub of sauce',
    description: 'A side of our signature sauce to complement your meal.',
    price: 3.00,
    isActive: true,
    addonCategories: [],
  },

  // ========== SALAD MEALS ==========
  {
    category: 'Salad Meals',
    name: 'Chicken Salad',
    description: 'Tender chicken mixed with fresh greens.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Salad Meals',
    name: 'Mixed Meat Salad',
    description: 'A mix of meats served on a bed of fresh greens.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Salad Meals',
    name: 'Doner Salad',
    description: 'Tender doner meat served on a bed of fresh greens.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },

  // ========== MEALS ==========
  {
    category: 'Meals',
    name: 'Chicken Meal',
    description: 'Tender chicken served with a side of flavourful accompaniments.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Meals',
    name: 'Doner Meal',
    description: 'Doner meat served with salad and accompaniments.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Meals',
    name: 'Mixed Meal',
    description: 'A selection of dishes combined in one meal.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Meals',
    name: 'Biryani Rice Meal',
    description: 'Biryani rice, chicken and salad.',
    price: 24.00,
    isActive: true,
    isBestSeller: true,
    isSignature: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Meals',
    name: 'Steak Meal',
    description: 'Tender steak served with a side.',
    price: 24.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Meals',
    name: 'Falafel Meal',
    description: 'Crispy, flavorful chickpea patties served with a side of your choice.',
    price: 23.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Remove Ingredients 2'],
  },
  {
    category: 'Meals',
    name: 'Lamb Shank Meal',
    description: 'Biryani rice with lamb shank and salad.',
    price: 24.00,
    isActive: true,
    isSignature: true,
    addonCategories: ['Remove Ingredients', 'Remove Ingredients 2'],
  },

  // ========== FISH AND CHIPS ==========
  {
    category: 'Fish and Chips',
    name: 'Fish and Chips',
    description: 'Battered fish served with crispy chips.',
    price: 16.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['With Salad', 'Make It a Combo'],
  },
  {
    category: 'Fish and Chips',
    name: 'Snapper and Chips',
    description: 'Fresh snapper served with crispy chips.',
    price: 17.00,
    isActive: true,
    addonCategories: ['With Salad', 'Make It a Combo'],
  },
  {
    category: 'Fish and Chips',
    name: 'Nuggets and Chips',
    description: 'Crispy nuggets served with golden chips.',
    price: 13.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Fish and Chips',
    name: 'Fish Bites and Chips',
    description: 'Crispy battered fish served with golden chips.',
    price: 11.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Fish and Chips',
    name: 'Seafood Basket',
    description: 'Assorted seafood in a crispy basket.',
    price: 22.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Fish and Chips',
    name: 'Calamari and Chips',
    description: 'Crispy calamari rings served with chips.',
    price: 15.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Fish and Chips',
    name: 'Prawns and Chips',
    description: 'Succulent prawns served with crispy chips.',
    price: 15.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },

  // ========== KEBABS ==========
  {
    category: 'Kebabs',
    name: 'Chicken Kebab',
    description: 'Tender chicken skewers, marinated to perfection.',
    price: 18.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Kebabs',
    name: 'Mixed Meat Kebab',
    description: 'Tender mix of meats, expertly skewered and grilled to perfection.',
    price: 18.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Kebabs',
    name: 'Doner Kebab',
    description: 'Classic doner meat in fresh bread with salad and sauce.',
    price: 18.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Kebabs',
    name: 'Steak Kebab',
    description: 'Tender steak pieces in fresh bread with salad and sauce.',
    price: 19.00,
    isActive: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Kebabs',
    name: 'Falafel Kebab',
    description: 'Crispy falafel with fresh salad and hummus.',
    price: 16.00,
    isActive: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Extras', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Kebabs',
    name: 'Veggie Kebab',
    description: 'Fresh vegetables in bread with salad and sauce.',
    price: 15.00,
    isActive: true,
    addonCategories: ['Choice of Preparation', 'Choice of Sauce', 'Make It a Combo', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Kebabs',
    name: 'Chips Kebab',
    description: 'Chips in bread with salad and sauce.',
    price: 13.00,
    isActive: true,
    addonCategories: ['Choice of Sauce', 'Make It a Combo', 'Remove Ingredients'],
  },

  // ========== BURGERS ==========
  {
    category: 'Burgers',
    name: 'Beef Burger',
    description: 'Juicy beef patty served in a burger.',
    price: 14.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Burger Preparation', 'Make It a Combo', 'Choice of Sauce', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Burgers',
    name: 'Chicken Burger',
    description: 'Juicy chicken patty served in a burger.',
    price: 14.00,
    isActive: true,
    addonCategories: ['Burger Preparation', 'Make It a Combo', 'Choice of Sauce', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Burgers',
    name: 'Steak Burger',
    description: 'Juicy steak served in a burger.',
    price: 15.00,
    isActive: true,
    addonCategories: ['Burger Preparation', 'Make It a Combo', 'Choice of Sauce', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Burgers',
    name: 'Fish Burger',
    description: 'Fresh fish patty served in a burger.',
    price: 15.00,
    isActive: true,
    addonCategories: ['Burger Preparation', 'Make It a Combo', 'Choice of Sauce', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Burgers',
    name: 'Mixed Burger',
    description: 'Mixed meat served in a burger.',
    price: 14.00,
    isActive: true,
    addonCategories: ['Burger Preparation', 'Make It a Combo', 'Choice of Sauce', 'Remove Ingredients', 'Extra Toppings'],
  },
  {
    category: 'Burgers',
    name: 'Doner Burger',
    description: 'Juicy doner meat served in a burger.',
    price: 14.00,
    isActive: true,
    addonCategories: ['Burger Preparation', 'Make It a Combo', 'Choice of Sauce', 'Remove Ingredients', 'Extra Toppings'],
  },

  // ========== GOZLEME ==========
  {
    category: 'Gozleme',
    name: 'Spinach and Cheese Gozleme',
    description: 'Spinach and melted cheese wrapped in a crispy pastry.',
    price: 18.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Gozleme',
    name: 'Chicken Gozleme',
    description: 'Turkish-style pastry filled with chicken.',
    price: 20.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Gozleme',
    name: 'Minced Meat Gozleme',
    description: 'Minced meat wrapped in a crispy pastry.',
    price: 20.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Gozleme',
    name: 'Doner Gozleme',
    description: 'Turkish-style pastry filled with doner meat.',
    price: 20.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },
  {
    category: 'Gozleme',
    name: 'Mixed Meat Gozleme',
    description: 'Mixed meat filling wrapped in a crispy pastry.',
    price: 20.00,
    isActive: true,
    addonCategories: ['Make It a Combo'],
  },

  // ========== MEAT BOX ==========
  {
    category: 'Meat Box',
    name: 'Chicken Meat Box',
    description: 'Tender pieces of chicken in a convenient box.',
    price: 19.00,
    isActive: true,
    isBestSeller: true,
    isSignature: true,
    addonCategories: ['Double Meat', 'Extra Cheese', 'Make It a Combo', 'Choice of Sauce'],
  },
  {
    category: 'Meat Box',
    name: 'Mixed Meat Box',
    description: 'Assorted meats in a single box.',
    price: 19.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Double Meat', 'Extra Cheese', 'Make It a Combo', 'Choice of Sauce'],
  },
  {
    category: 'Meat Box',
    name: 'Doner Meat Box',
    description: 'Tender doner meat served in a box.',
    price: 19.00,
    isActive: true,
    addonCategories: ['Double Meat', 'Extra Cheese', 'Make It a Combo', 'Choice of Sauce'],
  },
  {
    category: 'Meat Box',
    name: 'Steak Meat Box',
    description: 'Tender steak pieces in a convenient meat box.',
    price: 20.00,
    isActive: true,
    isBestSeller: true,
    addonCategories: ['Double Meat', 'Extra Cheese', 'Make It a Combo', 'Choice of Sauce'],
  },

  // ========== TURKISH PIZZA ==========
  {
    category: 'Turkish Pizza',
    name: 'Meat Lovers Pizza',
    description: 'Chicken, lamb salami & cheese.',
    price: 17.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'Chicken Pizza',
    description: 'Chicken, mixed vegetables & cheese.',
    price: 17.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'Lamb Pizza',
    description: 'Lamb, mixed vegetables & cheese.',
    price: 17.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'BBQ Chicken Pizza',
    description: 'BBQ chicken & cheese.',
    price: 17.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'Turkish Salami Pizza',
    description: 'Turkish salami & cheese.',
    price: 18.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'Vegetarian Pizza',
    description: 'Mixed vegetables, olives, mushrooms & cheese.',
    price: 16.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'Margherite Pizza',
    description: 'Fresh tomatoes, herbs & cheese.',
    price: 16.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Turkish Pizza',
    name: 'Spinach and Cheese Pizza',
    description: 'Spinach and melted cheese.',
    price: 16.00,
    isActive: true,
    addonCategories: [],
  },

  // ========== PIDE ==========
  {
    category: 'Pide',
    name: 'Chicken and Cheese Pide',
    description: 'Turkish pide with chicken and cheese.',
    price: 18.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Lamb and Cheese Pide',
    description: 'Turkish pide with lamb and cheese.',
    price: 18.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Mixed Meat, Spinach and Cheese Pide',
    description: 'Turkish pide with mixed meat, spinach and cheese.',
    price: 18.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Spinach and Cheese Pide',
    description: 'Turkish pide with spinach and cheese.',
    price: 14.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Chicken, Spinach and Cheese Pide',
    description: 'Turkish pide with chicken, spinach and cheese.',
    price: 18.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Salami and Cheese Pide',
    description: 'Turkish pide with salami and cheese.',
    price: 14.50,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Samsun Pide',
    description: 'Traditional Samsun style pide.',
    price: 15.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Egg and Cheese Pide',
    description: 'Turkish pide with egg and cheese.',
    price: 13.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Pide',
    name: 'Vegetarian Pide',
    description: 'Turkish pide with vegetables and cheese.',
    price: 13.00,
    isActive: true,
    addonCategories: [],
  },

  // ========== SHISH KEBAB & MEALS ==========
  {
    category: 'Shish Kebab & Meals',
    name: 'Chicken Shish Kebab',
    description: 'Grilled chicken skewer.',
    price: 14.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Shish Kebab & Meals',
    name: 'Lamb Shish Kebab',
    description: 'Grilled lamb skewer.',
    price: 14.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Shish Kebab & Meals',
    name: 'Shish Kebab Meal',
    description: 'Shish chicken or lamb with salad and rice.',
    price: 23.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Shish Kebab & Meals',
    name: 'Warm Chicken Salad',
    description: 'Warm chicken on fresh salad.',
    price: 12.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Shish Kebab & Meals',
    name: 'Warm Doner Salad',
    description: 'Warm doner on fresh salad.',
    price: 12.00,
    isActive: true,
    addonCategories: [],
  },
  {
    category: 'Shish Kebab & Meals',
    name: 'Warm Shish Salad (2 Skewers)',
    description: 'Warm shish kebab skewers on fresh salad.',
    price: 15.00,
    isActive: true,
    addonCategories: [],
  },

  // ========== DRINKS ==========
  {
    category: 'Drinks',
    name: 'Coke Classic 1.25L',
    description: '1.25L bottle of Coca Cola.',
    price: 7.00,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Coke Classic 600ML',
    description: '600ml bottle of Coca Cola.',
    price: 5.50,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Coke Classic 375ML',
    description: '375ml can of Coca Cola.',
    price: 4.00,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Coke Zero 1.25L',
    description: '1.25L bottle of Coca Cola Zero.',
    price: 7.00,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Coke Zero 600ML',
    description: '600ml bottle of Coca Cola Zero.',
    price: 5.50,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Coke Zero 375ML',
    description: '375ml can of Coca Cola Zero.',
    price: 4.00,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Fanta Orange 600ml',
    description: '600ml bottle of Fanta Orange.',
    price: 5.50,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Kirks Pasito 600ml',
    description: '600ml bottle of Kirks Pasito.',
    price: 5.50,
    isActive: true,
  },
  {
    category: 'Drinks',
    name: 'Monster Energy',
    description: 'Monster Energy drink.',
    price: 5.50,
    isActive: true,
  },

  // ========== DESSERT ==========
  {
    category: 'Dessert',
    name: 'Small Baklava Pack',
    description: 'Rich, sweet pastry layers filled with nuts.',
    price: 8.00,
    isActive: true,
    isSignature: true,
  },
  {
    category: 'Dessert',
    name: 'Large Baklava Pack',
    description: 'Rich, sweet pastry layers filled with nuts.',
    price: 16.00,
    isActive: true,
  },
  {
    category: 'Dessert',
    name: 'Small Turkish Delight Pack',
    description: 'Assorted Turkish delight pieces.',
    price: 8.00,
    isActive: true,
  },
];

// ============================================
// SEED FUNCTION
// ============================================
export async function seedWellardKebabHouse() {
  console.log('\n🥙 Seeding Wellard Kebab House...\n');

  // Check if merchant already exists
  const existingMerchant = await prisma.merchant.findUnique({
    where: { code: merchantData.code },
  });

  if (existingMerchant) {
    console.log(`⚠️  Merchant ${merchantData.name} already exists (code: ${merchantData.code})`);
    return existingMerchant;
  }

  // 1. Create Merchant
  const merchant = await prisma.merchant.create({
    data: merchantData,
  });
  console.log(`✅ Merchant created: ${merchant.name} (${merchant.code})`);

  // 2. Create Owner User
  const existingUser = await prisma.user.findUnique({
    where: { email: ownerData.email },
  });

  let owner;
  if (existingUser) {
    console.log(`✅ Owner user already exists: ${ownerData.email}`);
    owner = existingUser;
  } else {
    const hashedPassword = await bcrypt.hash(ownerData.password, 10);
    owner = await prisma.user.create({
      data: {
        name: ownerData.name,
        email: ownerData.email,
        passwordHash: hashedPassword,
        role: ownerData.role,
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Owner created: ${owner.email}`);
  }

  // 3. Create MerchantUser link
  const existingLink = await prisma.merchantUser.findFirst({
    where: {
      userId: owner.id,
      merchantId: merchant.id,
    },
  });

  if (!existingLink) {
    await prisma.merchantUser.create({
      data: {
        userId: owner.id,
        merchantId: merchant.id,
        role: ownerData.merchantRole,
      },
    });
    console.log(`✅ Owner linked to merchant`);
  }

  // 4. Create Opening Hours
  for (const hour of openingHours) {
    await prisma.merchantOpeningHour.create({
      data: {
        merchantId: merchant.id,
        ...hour,
      },
    });
  }
  console.log(`✅ Opening hours created (7 days)`);

  // 4.5. Create Subscription and Balance
  const existingSubscription = await prisma.merchantSubscription.findUnique({
    where: { merchantId: merchant.id },
  });

  if (!existingSubscription) {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.merchantSubscription.create({
      data: {
        merchantId: merchant.id,
        type: 'TRIAL',
        status: 'ACTIVE',
        trialStartedAt: now,
        trialEndsAt,
      },
    });

    // Also create balance record
    await prisma.merchantBalance.create({
      data: {
        merchantId: merchant.id,
        balance: 0,
      },
    });

    console.log(`✅ Subscription created (30-day trial)`);
  } else {
    console.log(`✅ Subscription already exists`);
  }

  // 5. Create Menu Categories
  const categoryMap: Record<string, bigint> = {};
  for (const cat of menuCategories) {
    const category = await prisma.menuCategory.create({
      data: {
        merchantId: merchant.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
        createdByUserId: owner.id,
      },
    });
    categoryMap[cat.name] = category.id;
  }
  console.log(`✅ Menu categories created (${menuCategories.length})`);

  // 6. Create Addon Categories and Items
  const addonCategoryMap: Record<string, bigint> = {};
  for (const addonCat of addonCategories) {
    const addonCategory = await prisma.addonCategory.create({
      data: {
        merchantId: merchant.id,
        name: addonCat.name,
        description: addonCat.description,
        minSelection: addonCat.minSelection,
        maxSelection: addonCat.maxSelection,
        isActive: true,
        createdByUserId: owner.id,
      },
    });
    addonCategoryMap[addonCat.name] = addonCategory.id;

    // Create addon items
    for (const item of addonCat.items) {
      await prisma.addonItem.create({
        data: {
          addonCategoryId: addonCategory.id,
          name: item.name,
          price: item.price,
          displayOrder: item.displayOrder,
          isActive: true,
          createdByUserId: owner.id,
        },
      });
    }
  }
  console.log(`✅ Addon categories created (${addonCategories.length})`);

  // 7. Create Menu Items
  let menuCount = 0;
  for (const menuItem of menuItems) {
    const categoryId = categoryMap[menuItem.category];
    if (!categoryId) {
      console.warn(`⚠️  Category not found: ${menuItem.category}`);
      continue;
    }

    const menu = await prisma.menu.create({
      data: {
        merchantId: merchant.id,
        categoryId: categoryId,
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        isActive: menuItem.isActive,
        isBestSeller: menuItem.isBestSeller || false,
        isSignature: menuItem.isSignature || false,
        isRecommended: ('isRecommended' in menuItem) ? (menuItem as { isRecommended?: boolean }).isRecommended ?? false : false,
        isSpicy: ('isSpicy' in menuItem) ? (menuItem as { isSpicy?: boolean }).isSpicy ?? false : false,
        createdByUserId: owner.id,
      },
    });

    // Create menu-category link
    await prisma.menuCategoryItem.create({
      data: {
        menuId: menu.id,
        categoryId: categoryId,
      },
    });

    // Link addon categories to menu
    if (menuItem.addonCategories) {
      for (let i = 0; i < menuItem.addonCategories.length; i++) {
        const addonCatName = menuItem.addonCategories[i];
        const addonCatId = addonCategoryMap[addonCatName];
        if (addonCatId) {
          // Determine if required (first addon category for items that need selection)
          const isRequired = i === 0 && [
            'Choice of Size',
            'Choice of Meat',
            'Choice of Fish',
            'Choice of Preparation',
            'Choice of Bread',
          ].includes(addonCatName);

          await prisma.menuAddonCategory.create({
            data: {
              menuId: menu.id,
              addonCategoryId: addonCatId,
              displayOrder: i + 1,
              isRequired: isRequired,
            },
          });
        }
      }
    }

    menuCount++;
  }
  console.log(`✅ Menu items created (${menuCount})`);

  console.log(`\n✅ Wellard Kebab House seed completed!`);
  console.log(`   Merchant Code: ${merchant.code}`);
  console.log(`   Owner Email: ${ownerData.email}`);
  console.log(`   Owner Password: ${ownerData.password}`);
  console.log(`   Menu Categories: ${menuCategories.length}`);
  console.log(`   Menu Items: ${menuCount}`);
  console.log(`   Addon Categories: ${addonCategories.length}`);

  return merchant;
}

// Export for direct execution
export default seedWellardKebabHouse;

// Self-invoking for direct execution
if (require.main === module || process.argv[1]?.includes('wellard-kebab-house')) {
  seedWellardKebabHouse()
    .then(() => {
      console.log('\n✅ Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}