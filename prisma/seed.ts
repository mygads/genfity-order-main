/**
 * Prisma Seed Script
 * Creates initial Super Admin user
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
    console.log('   ⚠️  Please change this password in production!');
  }

  // ============================================
  // 2. CREATE SAMPLE MERCHANT
  // ============================================
  const existingMerchant = await prisma.merchant.findUnique({
    where: { code: 'KOPI001' },
  });

  let merchant;
  if (existingMerchant) {
    console.log('✅ Sample Merchant already exists');
    merchant = existingMerchant;
  } else {
    merchant = await prisma.merchant.create({
      data: {
        code: 'KOPI001',
        name: 'Kopi Kenangan',
        email: 'info@kopikenangan.com',
        phone: '+61412345678',
        address: '123 Main Street',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'Australia',
        description: 'Premium Indonesian Coffee Shop',
        isActive: true,
        enableTax: true,
        taxPercentage: 10.0,
        currency: 'AUD',
      },
    });

    console.log('✅ Sample Merchant created:');
    console.log('   Code: KOPI001');
    console.log('   Name: Kopi Kenangan');
  }

  // ============================================
  // 3. CREATE MERCHANT OWNER USER
  // ============================================
  const existingOwner = await prisma.user.findUnique({
    where: { email: 'owner@kopikenangan.com' },
  });

  if (!existingOwner) {
    const ownerPassword = await bcrypt.hash('1234abcd', 10);

    const merchantOwner = await prisma.user.create({
      data: {
        name: 'Merchant Owner',
        email: 'owner@kopikenangan.com',
        passwordHash: ownerPassword,
        role: 'MERCHANT_OWNER',
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Link owner to merchant
    await prisma.merchantUser.create({
      data: {
        merchantId: merchant.id,
        userId: merchantOwner.id,
        role: 'OWNER',
      },
    });

    console.log('✅ Merchant Owner created:');
    console.log('   Email: owner@kopikenangan.com');
    console.log('   Password: Owner@123456');
  } else {
    console.log('✅ Merchant Owner already exists');
  }

  // ============================================
  // 4. CREATE MERCHANT STAFF USER
  // ============================================
  const existingStaff = await prisma.user.findUnique({
    where: { email: 'staff@kopikenangan.com' },
  });

  if (!existingStaff) {
    const staffPassword = await bcrypt.hash('Staff@123456', 10);

    const merchantStaff = await prisma.user.create({
      data: {
        name: 'Merchant Staff',
        email: 'staff@kopikenangan.com',
        passwordHash: staffPassword,
        role: 'MERCHANT_STAFF',
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Link staff to merchant
    await prisma.merchantUser.create({
      data: {
        merchantId: merchant.id,
        userId: merchantStaff.id,
        role: 'STAFF',
      },
    });

    console.log('✅ Merchant Staff created:');
    console.log('   Email: staff@kopikenangan.com');
    console.log('   Password: Staff@123456');
  } else {
    console.log('✅ Merchant Staff already exists');
  }

  // ============================================
  // 5. CREATE MENU CATEGORIES
  // ============================================
  const categories = [
    { name: 'Coffee', description: 'Premium coffee beverages', sortOrder: 1 },
    { name: 'Tea', description: 'Fresh tea selections', sortOrder: 2 },
    { name: 'Snacks', description: 'Light bites and pastries', sortOrder: 3 },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const existing = await prisma.menuCategory.findFirst({
      where: {
        merchantId: merchant.id,
        name: cat.name,
      },
    });

    if (existing) {
      createdCategories.push(existing);
    } else {
      const created = await prisma.menuCategory.create({
        data: {
          merchantId: merchant.id,
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
      createdCategories.push(created);
      console.log(`✅ Category created: ${cat.name}`);
    }
  }

  // ============================================
  // 6. CREATE MENU ITEMS
  // ============================================
  const menuItems = [
    // Coffee
    {
      categoryName: 'Coffee',
      name: 'Espresso',
      description: 'Strong and bold single shot',
      price: 4.5,
      imageUrl: null,
    },
    {
      categoryName: 'Coffee',
      name: 'Cappuccino',
      description: 'Classic Italian coffee with steamed milk',
      price: 5.5,
      imageUrl: null,
    },
    {
      categoryName: 'Coffee',
      name: 'Flat White',
      description: 'Smooth microfoam with double shot',
      price: 5.0,
      imageUrl: null,
    },
    {
      categoryName: 'Coffee',
      name: 'Iced Latte',
      description: 'Chilled espresso with cold milk',
      price: 6.0,
      imageUrl: null,
    },
    // Tea
    {
      categoryName: 'Tea',
      name: 'Green Tea Latte',
      description: 'Japanese matcha with steamed milk',
      price: 5.5,
      imageUrl: null,
    },
    {
      categoryName: 'Tea',
      name: 'Thai Tea',
      description: 'Sweet and creamy Thai-style tea',
      price: 5.0,
      imageUrl: null,
    },
    // Snacks
    {
      categoryName: 'Snacks',
      name: 'Croissant',
      description: 'Buttery French pastry',
      price: 4.0,
      imageUrl: null,
    },
    {
      categoryName: 'Snacks',
      name: 'Banana Bread',
      description: 'Moist homemade banana bread',
      price: 3.5,
      imageUrl: null,
    },
  ];

  for (const item of menuItems) {
    const category = createdCategories.find((c) => c.name === item.categoryName);
    if (!category) continue;

    const existing = await prisma.menu.findFirst({
      where: {
        merchantId: merchant.id,
        name: item.name,
      },
    });

    if (!existing) {
      // Create menu item without categoryId (removed in migration)
      const menuItem = await prisma.menu.create({
        data: {
          merchantId: merchant.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          isActive: true,
          trackStock: false,
          stockQty: 0,
        },
      });

      // Create many-to-many relationship via MenuCategoryItem junction table
      await prisma.menuCategoryItem.create({
        data: {
          menuId: menuItem.id,
          categoryId: category.id,
        },
      });

      console.log(`✅ Menu item created: ${item.name} (linked to ${category.name})`);
    }
  }

  console.log('');
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
