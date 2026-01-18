/**
 * Prisma Seed Script
 * Creates comprehensive sample data for GENFITY Online Ordering System
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedWellardKebabHouse } from './seeds/wellard-kebab-house';
const prisma = new PrismaClient();
async function main() {
  console.log('🌱 Seeding database...\n');
  // ============================================
  // 1. CREATE SUPER ADMIN
  // ============================================
  let superAdmin;
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@genfity.com' },
  });
  if (existingAdmin) {
    console.log('✅ Super Admin already exists');
    superAdmin = existingAdmin;
  } else {
    const hashedPassword = await bcrypt.hash('1234abcd', 10);
    superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@genfity.com',
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log('✅ Super Admin created:');
    console.log('   Email: admin@genfity.com');
    console.log('   Password: 1234abcd');
    console.log('   ⚠️  Please change this password in production!\n');
  }

  // ============================================
  // 1.1 CREATE SYSTEM ACCOUNT (for ownership reassignment)
  // ============================================
  const systemEmail = 'system@genfity.com';
  const existingSystem = await prisma.user.findUnique({
    where: { email: systemEmail },
  });
  if (existingSystem) {
    console.log('✅ System account already exists');
  } else {
    const hashedPassword = await bcrypt.hash(
      // Not intended for interactive login; must satisfy NOT NULL constraint.
      // Keep deterministic-ish for dev, but still non-trivial.
      'change-me-system-password',
      10
    );
    await prisma.user.create({
      data: {
        name: 'System',
        email: systemEmail,
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: false,
        mustChangePassword: false,
      },
    });
    console.log('✅ System account created: system@genfity.com (inactive)');
  }
  // ============================================
  // 2. CREATE MERCHANTS
  // ============================================
  const merchantsData = [
    {
      code: 'KOPI001',
      name: 'Kopi Kenangan Sydney',
      email: 'info@kopikenangan.com.au',
      phone: '+61412345678',
      address: '123 George Street',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      country: 'Australia',
      description: 'Premium Indonesian Coffee Shop specializing in traditional and modern coffee blends',
      currency: 'AUD',
      enableTax: true,
      taxPercentage: 10.0,
      latitude: -33.8688,
      longitude: 151.2093,
    },
  ];
  const merchants = [];
  for (const merchantData of merchantsData) {
    const existing = await prisma.merchant.findUnique({
      where: { code: merchantData.code },
    });
    if (existing) {
      console.log(`✅ Merchant ${merchantData.name} already exists`);
      merchants.push(existing);
    } else {
      const merchant = await prisma.merchant.create({
        data: merchantData,
      });
      merchants.push(merchant);
      console.log(`✅ Merchant created: ${merchantData.name} (${merchantData.code})`);
    }
  }
  // ============================================
  // 3. CREATE MERCHANT USERS
  // ============================================
  const usersData = [
    // Kopi Kenangan Users
    {
      name: 'John Owner',
      email: 'owner@kopikenangan.com.au',
      password: '1234abcd',
      role: 'MERCHANT_OWNER' as const,
      merchantCode: 'KOPI001',
      merchantRole: 'OWNER' as const,
    },
    {
      name: 'Sarah Staff',
      email: 'staff@kopikenangan.com.au',
      password: '1234abcd',
      role: 'MERCHANT_STAFF' as const,
      merchantCode: 'KOPI001',
      merchantRole: 'STAFF' as const,
    },
    {
      name: 'Mike Manager',
      email: 'manager@kopikenangan.com.au',
      password: '1234abcd',
      role: 'MERCHANT_STAFF' as const,
      merchantCode: 'KOPI001',
      merchantRole: 'STAFF' as const,
    },
    // Burger Users
    {
      name: 'David Owner',
      email: 'owner@grillchill.com.au',
      password: '1234abcd',
      role: 'MERCHANT_OWNER' as const,
      merchantCode: 'BURGER01',
      merchantRole: 'OWNER' as const,
    },
    {
      name: 'Emma Staff',
      email: 'staff@grillchill.com.au',
      password: '1234abcd',
      role: 'MERCHANT_STAFF' as const,
      merchantCode: 'BURGER01',
      merchantRole: 'STAFF' as const,
    },
    // Pizza Users
    {
      name: 'Marco Owner',
      email: 'owner@napolipizza.com.au',
      password: '1234abcd',
      role: 'MERCHANT_OWNER' as const,
      merchantCode: 'PIZZA01',
      merchantRole: 'OWNER' as const,
    },
    {
      name: 'Lisa Staff',
      email: 'staff@napolipizza.com.au',
      password: '1234abcd',
      role: 'MERCHANT_STAFF' as const,
      merchantCode: 'PIZZA01',
      merchantRole: 'STAFF' as const,
    },
  ];
  // Customer data - separate from admin users
  const customersData = [
    {
      name: 'Alice Customer',
      email: 'alice@example.com',
      password: '1234abcd',
      phone: '+61400111222',
    },
    {
      name: 'Bob Customer',
      email: 'bob@example.com',
      password: '1234abcd',
      phone: '+61400333444',
    },
    {
      name: 'Charlie Customer',
      email: 'charlie@example.com',
      password: '1234abcd',
      phone: '+61400555666',
    },
  ];
  for (const userData of usersData) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          passwordHash: hashedPassword,
          role: userData.role,
          isActive: true,
          mustChangePassword: false,
        },
      });
      // Link to merchant if applicable
      if (userData.merchantCode) {
        const merchant = merchants.find((m) => m.code === userData.merchantCode);
        if (merchant) {
          await prisma.merchantUser.create({
            data: {
              merchantId: merchant.id,
              userId: user.id,
              role: userData.merchantRole!,
            },
          });
        }
      }
      console.log(`✅ User created: ${userData.name} (${userData.role})`);
    } else {
      console.log(`✅ User ${userData.name} already exists`);
    }
  }
  // ============================================
  // 3.5 CREATE CUSTOMERS (Separate Table)
  // ============================================
  for (const customerData of customersData) {
    const existing = await prisma.customer.findUnique({
      where: { email: customerData.email },
    });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(customerData.password, 10);
      await prisma.customer.create({
        data: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          passwordHash: hashedPassword,
          isActive: true,
          mustChangePassword: false,
        },
      });
      console.log(`✅ Customer created: ${customerData.name}`);
    } else {
      console.log(`✅ Customer ${customerData.name} already exists`);
    }
  }
  // ============================================
  // 4. CREATE OPENING HOURS FOR MERCHANTS
  // ============================================
  for (const merchant of merchants) {
    const existingHours = await prisma.merchantOpeningHour.count({
      where: { merchantId: merchant.id },
    });
    if (existingHours === 0) {
      // Monday - Friday: 7:00 AM - 9:00 PM
      for (let day = 1; day <= 5; day++) {
        await prisma.merchantOpeningHour.create({
          data: {
            merchantId: merchant.id,
            dayOfWeek: day,
            openTime: '07:00',
            closeTime: '21:00',
            isClosed: false,
          },
        });
      }
      // Saturday: 8:00 AM - 10:00 PM
      await prisma.merchantOpeningHour.create({
        data: {
          merchantId: merchant.id,
          dayOfWeek: 6,
          openTime: '08:00',
          closeTime: '22:00',
          isClosed: false,
        },
      });
      // Sunday: 9:00 AM - 8:00 PM
      await prisma.merchantOpeningHour.create({
        data: {
          merchantId: merchant.id,
          dayOfWeek: 0,
          openTime: '09:00',
          closeTime: '20:00',
          isClosed: false,
        },
      });
      console.log(`✅ Opening hours created for ${merchant.name}`);
    }
  }
  // ============================================
  // 5. KOPI KENANGAN - MENU CATEGORIES
  // ============================================
  const kopiMerchant = merchants.find((m) => m.code === 'KOPI001')!;
  const kopiOwner = await prisma.user.findUnique({ where: { email: 'owner@kopikenangan.com.au' } });
  const kopiCategories = [
    { name: 'Hot Coffee', description: 'Freshly brewed hot coffee beverages', sortOrder: 1 },
    { name: 'Iced Coffee', description: 'Refreshing iced coffee drinks', sortOrder: 2 },
    { name: 'Non-Coffee', description: 'Tea and other beverages', sortOrder: 3 },
    { name: 'Pastries', description: 'Fresh baked goods', sortOrder: 4 },
    { name: 'Snacks', description: 'Light bites and snacks', sortOrder: 5 },
  ];
  const kopiCategoriesCreated = [];
  for (const cat of kopiCategories) {
    const existing = await prisma.menuCategory.findFirst({
      where: { merchantId: kopiMerchant.id, name: cat.name },
    });
    if (!existing) {
      const created = await prisma.menuCategory.create({
        data: {
          merchantId: kopiMerchant.id,
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          isActive: true,
          createdByUserId: kopiOwner?.id,
        },
      });
      kopiCategoriesCreated.push(created);
      console.log(`✅ Category created: ${cat.name} (Kopi Kenangan)`);
    } else {
      kopiCategoriesCreated.push(existing);
    }
  }
  // ============================================
  // 6. KOPI KENANGAN - MENU ITEMS
  // ============================================
  const kopiMenuItems = [
    // Hot Coffee
    {
      categories: ['Hot Coffee'],
      name: 'Espresso',
      description: 'Strong and bold single shot of Italian espresso',
      price: 4.5,
      trackStock: false,
    },
    {
      categories: ['Hot Coffee'],
      name: 'Americano',
      description: 'Espresso with hot water for a smooth taste',
      price: 5.0,
      trackStock: false,
    },
    {
      categories: ['Hot Coffee'],
      name: 'Cappuccino',
      description: 'Classic Italian coffee with steamed milk and foam',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Hot Coffee'],
      name: 'Flat White',
      description: 'Australian favorite with smooth microfoam',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Hot Coffee'],
      name: 'Latte',
      description: 'Creamy espresso with steamed milk',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Hot Coffee'],
      name: 'Mocha',
      description: 'Espresso with chocolate and steamed milk',
      price: 6.0,
      trackStock: false,
    },
    // Iced Coffee
    {
      categories: ['Iced Coffee'],
      name: 'Iced Latte',
      description: 'Chilled espresso with cold milk over ice',
      price: 6.0,
      trackStock: false,
    },
    {
      categories: ['Iced Coffee'],
      name: 'Iced Americano',
      description: 'Espresso and cold water over ice',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Iced Coffee'],
      name: 'Cold Brew',
      description: 'Smooth and less acidic cold-steeped coffee',
      price: 6.5,
      trackStock: false,
    },
    {
      categories: ['Iced Coffee'],
      name: 'Vietnamese Iced Coffee',
      description: 'Strong coffee with sweetened condensed milk',
      price: 6.5,
      trackStock: false,
    },
    // Non-Coffee
    {
      categories: ['Non-Coffee'],
      name: 'Green Tea Latte',
      description: 'Japanese matcha with steamed milk',
      price: 6.0,
      trackStock: false,
    },
    {
      categories: ['Non-Coffee'],
      name: 'Thai Tea',
      description: 'Sweet and creamy Thai-style tea',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Non-Coffee'],
      name: 'Hot Chocolate',
      description: 'Rich Belgian chocolate with steamed milk',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Non-Coffee'],
      name: 'Lemon Tea',
      description: 'Refreshing iced tea with fresh lemon',
      price: 4.5,
      trackStock: false,
    },
    // Pastries
    {
      categories: ['Pastries'],
      name: 'Croissant',
      description: 'Buttery French pastry',
      price: 4.5,
      trackStock: true,
      stockQty: 20,
      dailyStockTemplate: 20,
      autoResetStock: true,
    },
    {
      categories: ['Pastries'],
      name: 'Pain au Chocolat',
      description: 'Chocolate-filled croissant',
      price: 5.0,
      trackStock: true,
      stockQty: 15,
      dailyStockTemplate: 15,
      autoResetStock: true,
    },
    {
      categories: ['Pastries'],
      name: 'Blueberry Muffin',
      description: 'Freshly baked blueberry muffin',
      price: 4.0,
      trackStock: true,
      stockQty: 12,
      dailyStockTemplate: 12,
      autoResetStock: true,
    },
    {
      categories: ['Pastries'],
      name: 'Banana Bread',
      description: 'Moist homemade banana bread',
      price: 4.0,
      trackStock: true,
      stockQty: 10,
      dailyStockTemplate: 10,
      autoResetStock: true,
    },
    // Snacks
    {
      categories: ['Snacks'],
      name: 'Cheese Toast',
      description: 'Grilled toast with melted cheese',
      price: 5.5,
      trackStock: false,
    },
    {
      categories: ['Snacks'],
      name: 'Cookies (3 pcs)',
      description: 'Assorted chocolate chip cookies',
      price: 3.5,
      trackStock: true,
      stockQty: 30,
    },
    {
      categories: ['Snacks'],
      name: 'Brownie',
      description: 'Rich chocolate brownie',
      price: 4.5,
      trackStock: true,
      stockQty: 15,
      dailyStockTemplate: 15,
      autoResetStock: true,
    },
  ];
  for (const item of kopiMenuItems) {
    const existing = await prisma.menu.findFirst({
      where: { merchantId: kopiMerchant.id, name: item.name },
    });
    if (!existing) {
      const menuItem = await prisma.menu.create({
        data: {
          merchantId: kopiMerchant.id,
          name: item.name,
          description: item.description,
          price: item.price,
          isActive: true,
          trackStock: item.trackStock,
          stockQty: item.stockQty,
          dailyStockTemplate: item.dailyStockTemplate,
          autoResetStock: item.autoResetStock,
          // Note: Promo fields removed - use SpecialPrice table instead
          createdByUserId: kopiOwner?.id,
        },
      });
      // Link to categories
      for (const categoryName of item.categories) {
        const category = kopiCategoriesCreated.find((c) => c.name === categoryName);
        if (category) {
          await prisma.menuCategoryItem.create({
            data: {
              menuId: menuItem.id,
              categoryId: category.id,
            },
          });
        }
      }
      console.log(`✅ Menu item created: ${item.name} (Kopi Kenangan)`);
    }
  }
  // ============================================
  // 7. KOPI KENANGAN - ADDON CATEGORIES & ITEMS
  // ============================================
  const kopiAddonCategories = [
    {
      name: 'Coffee Size',
      description: 'Choose your coffee size',
      minSelection: 1,
      maxSelection: 1,
      items: [
        { name: 'Regular', price: 0, inputType: 'SELECT' as const, displayOrder: 1 },
        { name: 'Large (+350ml)', price: 2.0, inputType: 'SELECT' as const, displayOrder: 2 },
        { name: 'Extra Large (+500ml)', price: 3.5, inputType: 'SELECT' as const, displayOrder: 3 },
      ],
    },
    {
      name: 'Milk Options',
      description: 'Customize your milk',
      minSelection: 0,
      maxSelection: 1,
      items: [
        { name: 'Full Cream Milk', price: 0, inputType: 'SELECT' as const, displayOrder: 1 },
        { name: 'Skim Milk', price: 0, inputType: 'SELECT' as const, displayOrder: 2 },
        { name: 'Soy Milk', price: 1.0, inputType: 'SELECT' as const, displayOrder: 3 },
        { name: 'Almond Milk', price: 1.0, inputType: 'SELECT' as const, displayOrder: 4 },
        { name: 'Oat Milk', price: 1.0, inputType: 'SELECT' as const, displayOrder: 5 },
        { name: 'Coconut Milk', price: 1.0, inputType: 'SELECT' as const, displayOrder: 6 },
      ],
    },
    {
      name: 'Sweetness Level',
      description: 'How sweet do you want it?',
      minSelection: 0,
      maxSelection: 1,
      items: [
        { name: 'No Sugar', price: 0, inputType: 'SELECT' as const, displayOrder: 1 },
        { name: '25% Sweet', price: 0, inputType: 'SELECT' as const, displayOrder: 2 },
        { name: '50% Sweet', price: 0, inputType: 'SELECT' as const, displayOrder: 3 },
        { name: '75% Sweet', price: 0, inputType: 'SELECT' as const, displayOrder: 4 },
        { name: '100% Sweet', price: 0, inputType: 'SELECT' as const, displayOrder: 5 },
      ],
    },
    {
      name: 'Extra Shots',
      description: 'Add extra espresso shots',
      minSelection: 0,
      maxSelection: 5,
      items: [
        { name: 'Extra Shot', price: 1.5, inputType: 'QTY' as const, displayOrder: 1 },
      ],
    },
    {
      name: 'Toppings',
      description: 'Add delicious toppings (max 3)',
      minSelection: 0,
      maxSelection: 3,
      items: [
        { name: 'Whipped Cream', price: 1.0, inputType: 'SELECT' as const, displayOrder: 1 },
        { name: 'Caramel Drizzle', price: 0.5, inputType: 'SELECT' as const, displayOrder: 2 },
        { name: 'Chocolate Syrup', price: 0.5, inputType: 'SELECT' as const, displayOrder: 3 },
        { name: 'Vanilla Syrup', price: 0.5, inputType: 'SELECT' as const, displayOrder: 4 },
        { name: 'Cinnamon Powder', price: 0.5, inputType: 'SELECT' as const, displayOrder: 5 },
      ],
    },
    {
      name: 'Temperature',
      description: 'Hot or cold?',
      minSelection: 0,
      maxSelection: 1,
      items: [
        { name: 'Hot', price: 0, inputType: 'SELECT' as const, displayOrder: 1 },
        { name: 'Iced', price: 0.5, inputType: 'SELECT' as const, displayOrder: 2 },
      ],
    },
  ];
  for (const addonCat of kopiAddonCategories) {
    const existingCat = await prisma.addonCategory.findFirst({
      where: { merchantId: kopiMerchant.id, name: addonCat.name },
    });
    let addonCategory;
    if (!existingCat) {
      addonCategory = await prisma.addonCategory.create({
        data: {
          merchantId: kopiMerchant.id,
          name: addonCat.name,
          description: addonCat.description,
          minSelection: addonCat.minSelection,
          maxSelection: addonCat.maxSelection,
          isActive: true,
          createdByUserId: kopiOwner?.id,
        },
      });
      console.log(`✅ Addon category created: ${addonCat.name} (Kopi Kenangan)`);
    } else {
      addonCategory = existingCat;
    }
    // Create addon items
    for (const item of addonCat.items) {
      const existingItem = await prisma.addonItem.findFirst({
        where: { addonCategoryId: addonCategory.id, name: item.name },
      });
      if (!existingItem) {
        await prisma.addonItem.create({
          data: {
            addonCategoryId: addonCategory.id,
            name: item.name,
            price: item.price,
            inputType: item.inputType,
            displayOrder: item.displayOrder,
            isActive: true,
            trackStock: false,
            createdByUserId: kopiOwner?.id,
          },
        });
        console.log(`   ✅ Addon item created: ${item.name}`);
      }
    }
  }
  // Link addon categories to hot coffee menus
  const hotCoffeeMenus = await prisma.menu.findMany({
    where: {
      merchantId: kopiMerchant.id,
      categories: {
        some: {
          category: {
            name: 'Hot Coffee',
          },
        },
      },
    },
  });
  const sizeAddon = await prisma.addonCategory.findFirst({
    where: { merchantId: kopiMerchant.id, name: 'Coffee Size' },
  });
  const milkAddon = await prisma.addonCategory.findFirst({
    where: { merchantId: kopiMerchant.id, name: 'Milk Options' },
  });
  const sweetnessAddon = await prisma.addonCategory.findFirst({
    where: { merchantId: kopiMerchant.id, name: 'Sweetness Level' },
  });
  const extraShotsAddon = await prisma.addonCategory.findFirst({
    where: { merchantId: kopiMerchant.id, name: 'Extra Shots' },
  });
  const toppingsAddon = await prisma.addonCategory.findFirst({
    where: { merchantId: kopiMerchant.id, name: 'Toppings' },
  });
  for (const menu of hotCoffeeMenus) {
    if (sizeAddon) {
      const existing = await prisma.menuAddonCategory.findUnique({
        where: {
          menuId_addonCategoryId: {
            menuId: menu.id,
            addonCategoryId: sizeAddon.id,
          },
        },
      });
      if (!existing) {
        await prisma.menuAddonCategory.create({
          data: {
            menuId: menu.id,
            addonCategoryId: sizeAddon.id,
            isRequired: true,
            displayOrder: 1,
          },
        });
      }
    }
    if (milkAddon) {
      const existing = await prisma.menuAddonCategory.findUnique({
        where: {
          menuId_addonCategoryId: {
            menuId: menu.id,
            addonCategoryId: milkAddon.id,
          },
        },
      });
      if (!existing) {
        await prisma.menuAddonCategory.create({
          data: {
            menuId: menu.id,
            addonCategoryId: milkAddon.id,
            isRequired: false,
            displayOrder: 2,
          },
        });
      }
    }
    if (sweetnessAddon) {
      const existing = await prisma.menuAddonCategory.findUnique({
        where: {
          menuId_addonCategoryId: {
            menuId: menu.id,
            addonCategoryId: sweetnessAddon.id,
          },
        },
      });
      if (!existing) {
        await prisma.menuAddonCategory.create({
          data: {
            menuId: menu.id,
            addonCategoryId: sweetnessAddon.id,
            isRequired: false,
            displayOrder: 3,
          },
        });
      }
    }
    if (extraShotsAddon) {
      const existing = await prisma.menuAddonCategory.findUnique({
        where: {
          menuId_addonCategoryId: {
            menuId: menu.id,
            addonCategoryId: extraShotsAddon.id,
          },
        },
      });
      if (!existing) {
        await prisma.menuAddonCategory.create({
          data: {
            menuId: menu.id,
            addonCategoryId: extraShotsAddon.id,
            isRequired: false,
            displayOrder: 4,
          },
        });
      }
    }
    if (toppingsAddon) {
      const existing = await prisma.menuAddonCategory.findUnique({
        where: {
          menuId_addonCategoryId: {
            menuId: menu.id,
            addonCategoryId: toppingsAddon.id,
          },
        },
      });
      if (!existing) {
        await prisma.menuAddonCategory.create({
          data: {
            menuId: menu.id,
            addonCategoryId: toppingsAddon.id,
            isRequired: false,
            displayOrder: 5,
          },
        });
      }
    }
  }
  console.log('✅ Linked addon categories to hot coffee menus\n');

  // ============================================
  // 8. SEED SUBSCRIPTION PLAN
  // ============================================
  const existingPlan = await prisma.subscriptionPlan.findUnique({
    where: { planKey: 'default' },
  });

  if (!existingPlan) {
    await prisma.subscriptionPlan.create({
      data: {
        planKey: 'default',
        displayName: 'Default Plan',
        description: 'Default subscription plan with trial, deposit, and monthly options',
        trialDays: 30,
        monthlyDays: 31, // Monthly subscription is 31 days
        gracePeriodDays: 3, // 3-day grace period before suspension
        // IDR Pricing
        depositMinimumIdr: 100000,
        orderFeeIdr: 250,
        monthlyPriceIdr: 100000,
        completedOrderEmailFeeIdr: 0,
        // AUD Pricing
        depositMinimumAud: 15,
        orderFeeAud: 0.04,
        monthlyPriceAud: 15,
        completedOrderEmailFeeAud: 0,
        // Bank Account Info (placeholder - to be configured by admin)
        bankNameIdr: 'BCA',
        bankAccountIdr: '1234567890',
        bankAccountNameIdr: 'PT Genfity Indonesia',
        bankNameAud: 'Commonwealth Bank',
        bankAccountAud: '12-3456-7890123',
        bankAccountNameAud: 'Genfity Pty Ltd',
        isActive: true,
      },
    });
    console.log('✅ Subscription plan created: Default Plan');
  } else {
    // Update existing plan with new fields if missing
    await prisma.subscriptionPlan.update({
      where: { planKey: 'default' },
      data: {
        monthlyDays: 31,
        gracePeriodDays: 3,
        completedOrderEmailFeeIdr: existingPlan.completedOrderEmailFeeIdr ?? 0,
        completedOrderEmailFeeAud: existingPlan.completedOrderEmailFeeAud ?? 0,
      },
    });
    console.log('✅ Subscription plan updated with monthlyDays and gracePeriodDays');
  }

  // ============================================
  // 9. CREATE SUBSCRIPTIONS FOR EXISTING MERCHANTS
  // ============================================
  for (const merchant of merchants) {
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

      console.log(`✅ Subscription created for ${merchant.name} (30-day trial)`);
    } else {
      console.log(`✅ Subscription already exists for ${merchant.name}`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📊 Summary:');
  console.log('   • Super Admin: 1');
  console.log('   • Merchants: 3 (Kopi Kenangan, Grill & Chill, Napoli Pizza)');
  console.log('   • Users: 10+ (Owners, Staff, Customers)');
  console.log('   • Menu Categories: 5+ per merchant');
  console.log('   • Menu Items: 20+ (Kopi Kenangan)');
  console.log('   • Addon Categories: 6 (Kopi Kenangan)');
  console.log('   • Addon Items: 25+ (Kopi Kenangan)');
  console.log('   • Subscription Plan: 1 (Default)');
  console.log('   • Merchant Subscriptions: 3 (30-day trials)');
  console.log('');

  // ============================================
  // SEED WELLARD KEBAB HOUSE
  // ============================================
  await seedWellardKebabHouse();

  console.log('');
  console.log('🔐 Login Credentials:');
  console.log('');
  console.log('   SUPER ADMIN:');
  console.log('   Email: admin@genfity.com');
  console.log('   Password: 1234abcd');
  console.log('');
  console.log('   KOPI KENANGAN OWNER:');
  console.log('   Email: owner@kopikenangan.com.au');
  console.log('   Password: 1234abcd');
  console.log('');
  console.log('   WELLARD KEBAB HOUSE OWNER:');
  console.log('   Email: wellardkebab@gmail.com');
  console.log('   Password: 1234abcd');
  console.log('');
  console.log('═══════════════════════════════════════════════');
}
main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
