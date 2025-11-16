# GENFITY AI Coding Agent Instructions

## Overview
This document provides comprehensive instructions for AI coding agents working on the GENFITY online ordering project. GENFITY is a comprehensive restaurant management and online ordering system built with Next.js, TypeScript, and PostgreSQL. The following guidelines cover technical constraints, authentication, BigInt serialization, route organization, currency handling, Prisma ORM usage, database schema relationships, file structure, UI/UX standards, icon usage, database update workflow, development workflow, and code quality standards.

## Technical Constraints & Rules

### Security Requirements:
- **Password Hashing**: bcryptjs with >=10 rounds, never return password_hash
- **JWT**: Include session ID in payload, validate against database
- **Database**: Parameterized queries only, no string concatenation
- **Secrets**: Never hardcode, always use environment variables
- **Error Messages**: User-friendly, never expose internal details

### Code Quality Standards:
- **TypeScript**: Strict mode, no implicit any, proper interfaces
- **Formatting**: 2-space indentation, camelCase, JSDoc comments
- **Architecture**: Repository pattern, service layer separation
- **Error Handling**: Custom error classes, proper HTTP status codes
- **Database**: Transactions for multi-table operations

## CRITICAL: Authentication & Session Management

### Authentication is MANDATORY for ALL Protected Routes
**EVERY** feature for Super Admin, Merchant Owner, Merchant Staff, or Customer **MUST** include authentication/session token validation.

#### Server-Side Authentication (API Routes & Server Components):
```typescript
// API Routes - Use middleware wrapper
import { withAuth, withMerchant, withSuperAdmin } from '@/lib/middleware/auth';

// Example: Merchant-only endpoint
export const GET = withMerchant(async (req, authContext) => {
  const { userId, merchantId, role } = authContext;
  // Your logic here
});

// Example: Super Admin-only endpoint
export const POST = withSuperAdmin(async (req, authContext) => {
  // Your logic here
});

// Example: Custom role checking
export const PUT = withAuth(async (req, authContext) => {
  // Manual role verification
}, ['MERCHANT_OWNER', 'SUPER_ADMIN']);
```

#### Client-Side Authentication (Pages):
```typescript
// Always fetch with Authorization header
const token = localStorage.getItem('accessToken');
if (!token) {
  router.push('/admin/login');
  return;
}

const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

#### Server Components Authentication:
```typescript
import { requireAuth, requireMerchant, requireSuperAdmin } from '@/lib/auth/serverAuth';

// Require any authenticated user
const user = await requireAuth();

// Require merchant role
const merchantUser = await requireMerchant();

// Require super admin
const adminUser = await requireSuperAdmin();
```

### Available Auth Utilities:
- **API Routes**: `withAuth()`, `withMerchant()`, `withMerchantOwner()`, `withSuperAdmin()`, `withCustomer()`
- **Server Components**: `getAuthUser()`, `requireAuth()`, `requireRole()`, `requireMerchant()`, `requireSuperAdmin()`
- **Location**: `/src/lib/middleware/auth.ts` and `/src/lib/auth/serverAuth.ts`

---

## CRITICAL: BigInt Serialization

### ALWAYS Use serializeBigInt() for API Responses
PostgreSQL uses `BIGSERIAL` for IDs (BigInt in TypeScript). **ALL** Prisma query results containing IDs **MUST** be serialized before returning.

```typescript
import { serializeBigInt } from '@/lib/utils/serializer';

// ✅ CORRECT - Serialize before returning
const menu = await prisma.menu.findFirst({ where: { id } });
return NextResponse.json({
  success: true,
  data: serializeBigInt(menu), // Converts BigInt → string
});

// ❌ WRONG - Will cause "Do not know how to serialize a BigInt" error
return NextResponse.json({
  success: true,
  data: menu, // BigInt cannot be serialized
});
```

### Frontend ID Handling:
```typescript
// IDs from API are strings (serialized BigInt)
interface StockItem {
  id: number | string; // Accept both for safety
  type: 'menu' | 'addon';
  // ...
}

// Convert to number before sending back to API
const numericId = typeof id === 'string' ? parseInt(id) : id;
await fetch('/api/endpoint', {
  body: JSON.stringify({ id: numericId }), // API expects number
});
```

---

## CRITICAL: Route Organization & Folder Structure

### Route Groups - MANDATORY Organization Pattern
Organize pages by role using Next.js route groups for clean architecture:

```
src/app/
├── (admin)/                  # Admin group (Super Admin + Merchant)
│   └── admin/
│       ├── login/
│       └── dashboard/
│           ├── (superadmin)/ # Super Admin routes
│           │   ├── merchants/
│           │   └── analytics/
│           └── (merchant)/   # Merchant routes
│               ├── menu/
│               ├── orders/
│               └── revenue/
│
├── (customer)/               # Customer group
│   ├── login/
│   └── [merchantCode]/
│       ├── page.tsx
│       └── cart/
│
└── api/                      # API routes (NOT in groups)
    ├── auth/
    ├── merchant/
    ├── customer/
    └── public/
```

### Rules for Route Groups:
- **Super Admin pages**: `(admin)/admin/dashboard/(superadmin)/`
- **Merchant pages**: `(admin)/admin/dashboard/(merchant)/`
- **Customer pages**: `(customer)/`
- **Public pages**: Root level (outside groups)
- **API routes**: `/api/` (no groups, use middleware)

### Why This Matters:
- Clean URL structure (groups don't appear in URLs)
- Easy permission management
- Better code organization
- Faster navigation for developers

---

## CRITICAL: Currency & Pricing

### ALWAYS Use Merchant Currency Settings
**NEVER** hardcode currency. Always fetch from merchant table.

```typescript
// Fetch merchant currency
const merchant = await prisma.merchant.findUnique({
  where: { id: merchantId },
  select: { currency: true }, // e.g., "AUD", "IDR", "USD"
});

// Use merchant.currency in all price displays
const formattedPrice = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: merchant.currency, // Dynamic
}).format(price);
```

### Price Storage:
- Database: `DECIMAL(10, 2)` (Prisma Decimal type)
- API Response: Convert to `number` using `serializeBigInt()`
- Frontend: Display with merchant's currency

---

## CRITICAL: Prisma ORM Usage

### Prisma is the ONLY Database Access Method
**NEVER** use raw SQL or other ORMs. Always use Prisma Client.

```typescript
import prisma from '@/lib/db/client';

// ✅ CORRECT - Prisma queries
const menus = await prisma.menu.findMany({
  where: { merchantId: merchantId },
  include: { category: true },
});

// ❌ WRONG - Raw SQL
await prisma.$queryRaw`SELECT * FROM menus`;
```

### Common Prisma Patterns:
```typescript
// Create with relations
const menu = await prisma.menu.create({
  data: {
    name: 'Pizza',
    merchantId: merchantId,
    categories: {
      create: [
        { categoryId: categoryId1 },
        { categoryId: categoryId2 },
      ],
    },
  },
});

// Update with transaction
await prisma.$transaction(async (tx) => {
  await tx.menu.update({ where: { id }, data: { ... } });
  await tx.orderStatusHistory.create({ data: { ... } });
});

// Soft delete pattern
await prisma.menu.update({
  where: { id },
  data: {
    deletedAt: new Date(),
    deletedByUserId: userId,
  },
});
```

---

## CRITICAL: Database Schema Relationships

### Complete Table Relationship Map

#### User Management:
```
User (users)
├── 1:N → UserSession (user_sessions)
├── 1:1 → UserPreference (user_preferences)
├── 1:N → MerchantUser (merchant_users) [Junction]
├── 1:N → Order (orders) [as customer]
└── Audit fields on: Menu, MenuCategory, AddonCategory, AddonItem
```

#### Merchant Structure:
```
Merchant (merchants)
├── 1:N → MerchantUser (merchant_users) [Junction to Users]
├── 1:N → MerchantOpeningHour (merchant_opening_hours)
├── 1:N → MenuCategory (menu_categories)
├── 1:N → Menu (menus)
├── 1:N → AddonCategory (addon_categories)
└── 1:N → Order (orders)
```

#### Menu & Category System (Many-to-Many):
```
Menu (menus)
├── N:M → MenuCategory via MenuCategoryItem (menu_category_items)
│   ├── menuId → Menu
│   └── categoryId → MenuCategory
├── N:M → AddonCategory via MenuAddonCategory (menu_addon_categories)
│   ├── menuId → Menu
│   └── addonCategoryId → AddonCategory
└── 1:N → OrderItem (order_items)

MenuCategory (menu_categories)
├── N:M → Menu via MenuCategoryItem
└── N:1 → Merchant
```

#### Addon System:
```
AddonCategory (addon_categories)
├── 1:N → AddonItem (addon_items)
├── N:M → Menu via MenuAddonCategory
└── N:1 → Merchant

AddonItem (addon_items)
├── N:1 → AddonCategory
└── 1:N → OrderItemAddon (order_item_addons)
```

#### Order System:
```
Order (orders)
├── N:1 → Merchant
├── N:1 → User [optional, for registered customers]
├── 1:N → OrderItem (order_items)
└── 1:N → OrderStatusHistory (order_status_history)

OrderItem (order_items)
├── N:1 → Order
├── N:1 → Menu
└── 1:N → OrderItemAddon (order_item_addons)

OrderItemAddon (order_item_addons)
├── N:1 → OrderItem
└── N:1 → AddonItem
```

### Key Relationship Rules:
1. **Menu can have multiple categories** (many-to-many via MenuCategoryItem)
2. **Menu can have multiple addon categories** (many-to-many via MenuAddonCategory)
3. **Soft deletes**: Use `deletedAt` field (Menu, MenuCategory, AddonCategory, AddonItem)
4. **Audit trail**: Track `createdByUserId`, `updatedByUserId`, `deletedByUserId`
5. **Stock tracking**: Menu and AddonItem have `trackStock`, `stockQty`, `dailyStockTemplate`

---

## CRITICAL: File Structure & Organization

### Service Layer (`/src/lib/services/`)
Business logic, database operations, complex validations.

```typescript
// Example: /src/lib/services/MenuService.ts
export class MenuService {
  async createMenu(data: CreateMenuDto, userId: bigint) {
    // Business logic here
  }
}
```

### Repository Layer (`/src/lib/repositories/`)
Direct Prisma queries, data access patterns.

```typescript
// Example: /src/lib/repositories/MenuRepository.ts
export class MenuRepository {
  async findById(id: bigint) {
    return prisma.menu.findUnique({ where: { id } });
  }
}
```

### Utilities (`/src/lib/utils/`)
Helper functions, formatters, validators.

```typescript
// Example: /src/lib/utils/priceFormatter.ts
export function formatCurrency(amount: number, currency: string) {
  // Format logic
}
```

### Middleware (`/src/lib/middleware/`)
Auth, error handling, request validation.

```typescript
// Example: /src/lib/middleware/auth.ts
export function withMerchant(handler) {
  // Auth logic
}
```

### Components (`/src/components/`)
**MANDATORY**: Split large components (>500 lines) into smaller pieces.

```
/src/components/
├── menu/
│   ├── MenuCard.tsx          # Base component
│   ├── MenuList.tsx           # List container
│   ├── MenuFilters.tsx        # Filter UI
│   └── MenuFormModal.tsx      # Form modal
├── common/                    # Shared components
├── ui/                        # Base UI elements
└── icons/                     # Custom icons
```

---

## CRITICAL: UI/UX Standards

### Design Philosophy
**Professional, Clean, Modern - UI/UX First**

### Color Palette - Minimal & Intentional
```typescript
// Use existing design system colors ONLY
// src/lib/design-system.ts

// ✅ CORRECT - Use design tokens
className="bg-brand-500 text-white"
className="border-gray-200 dark:border-gray-800"
className="text-gray-700 dark:text-gray-300"

// ❌ WRONG - Too many colors
className="bg-purple-500 border-pink-300 text-yellow-600"
```

### Reference Page for UI Patterns:
**ALWAYS** check `/admin/dashboard/revenue` for UI inspiration:
- Card layouts
- Chart integration
- Table designs
- Filter patterns
- Loading states
- Error handling

### Professional UI Checklist:
- [ ] Clean palette
- [ ] Subtle shadows & borders
- [ ] Consistent spacing (4px, 8px, 16px, 24px)
- [ ] Smooth transitions (150ms-300ms)
- [ ] Responsive design (mobile-first)
- [ ] Dark mode support
- [ ] Loading skeletons (not spinners)
- [ ] Empty states with illustrations
- [ ] Clear error messages
- [ ] Accessible (WCAG AA)

### Component Size Rule:
If page exceeds **500 lines**, split into:
1. Base component (presentational)
2. Container component (logic)
3. Sub-components (sections)

---

## CRITICAL: Icon Usage

### Icon Sources (Priority Order):
1. **Custom Icons** (`/src/icons/index.tsx`) - Use existing icons first
2. **React Icons** (`react-icons/fa`) - Already installed, use Font Awesome icons

```typescript
// ✅ CORRECT - Custom icons
import { PencilIcon, TrashIcon, CheckCircleIcon } from '@/icons';

// ✅ CORRECT - React Icons (if custom not available)
import { FaEdit, FaTrash, FaCheck } from 'react-icons/fa';

// ❌ WRONG - Don't install new icon libraries
import { Icon } from 'some-other-icon-library';
```

### Available Custom Icons:
Check `/src/icons/index.tsx` for full list. Common ones:
- PencilIcon, TrashIcon, PlusIcon
- CheckCircleIcon, CloseIcon
- MenuIcon, SearchIcon
- UploadIcon, DownloadIcon

---

## CRITICAL: Database Update Workflow

### NEVER Use Migrations - Use Push Instead

```bash
# ❌ WRONG - Do NOT use migrations
npx prisma migrate dev

# ✅ CORRECT - Update workflow:
# 1. Edit schema.prisma
# 2. Push to database
npx prisma db push

# 3. Generate Prisma Client
npx prisma generate

# 4. Update seed data (if needed)
# Edit: /prisma/seed.ts
```

### Schema Update Pattern:
```prisma
// 1. Add new field to schema.prisma
model Menu {
  id BigInt @id @default(autoincrement())
  name String
  newField String? // Add this
  // ...
}

// 2. Run: npx prisma db push
// 3. Run: npx prisma generate
// 4. Update seed.ts if needed
```

### Seed Data Updates:
```typescript
// /prisma/seed.ts
async function main() {
  // Update seed data when schema changes
  await prisma.menu.create({
    data: {
      name: 'New Menu',
      newField: 'value', // Include new field
      // ...
    },
  });
}
```

---

## CRITICAL: Development Workflow

### DO NOT Run `npm run dev` Manually
The development server is **ALWAYS RUNNING**. Changes auto-reload via Next.js Fast Refresh.

```bash
# ❌ NEVER DO THIS
npm run dev

# ✅ Just edit files - auto-reload happens
# Edit any .tsx, .ts file → Browser auto-refreshes
```

### What Auto-Reloads:
- ✅ React components
- ✅ API routes
- ✅ Server components
- ✅ CSS/Tailwind
- ❌ Prisma schema (need `npx prisma generate`)
- ❌ Environment variables (need manual restart)

---

## CRITICAL: Code Quality & Response Standards

### ALWAYS Create Todo Lists
**EVERY** response must start with a detailed todo list:

```markdown
## Todo List for This Task
- [ ] Analyze authentication requirements
- [ ] Create MenuService.ts in /src/lib/services/
- [ ] Add API endpoint at /api/merchant/menu
- [ ] Create MenuList component
- [ ] Add tests and error handling
```

### Response Guidelines:
1. **Be Accurate**: No guessing, verify before responding
2. **Be Detailed**: Long, thorough responses preferred over brief ones
3. **Show Work**: Explain reasoning, not just solutions
4. **Use English**: All code, comments, documentation in English
5. **Token Budget**: Use as many tokens as needed for completeness
6. **No Markdown Files**: Don't create summary .md files unless requested

### Code Comments:
```typescript
// ✅ CORRECT - English comments
/**
 * Calculate total price with tax
 * @param subtotal - Order subtotal before tax
 * @param taxRate - Tax percentage (e.g., 0.1 for 10%)
 * @returns Total price including tax
 */
function calculateTotal(subtotal: number, taxRate: number): number {
  return subtotal * (1 + taxRate);
}

// ❌ WRONG - Indonesian comments
// Hitung total harga dengan pajak
```

### Future Improvements Section:
At the end of EVERY response, include:

```markdown
## Potential Future Improvements
- Add caching layer for frequent queries
- Implement WebSocket for real-time updates
- Create bulk operations for menu management
- Add export to Excel functionality
```

---

## CRITICAL: Summary of All Rules

### Authentication:
✅ **ALWAYS** use auth middleware for protected routes  
✅ Check token in API routes and server components  
✅ Use `withAuth()`, `withMerchant()`, `requireAuth()` patterns

### Data Handling:
✅ **ALWAYS** use `serializeBigInt()` for API responses  
✅ Fetch merchant currency for price formatting  
✅ Convert string IDs to numbers when sending to API

### Code Organization:
✅ Use route groups: `(admin)`, `(merchant)`, `(customer)`  
✅ Place services in `/lib/services/`, utils in `/lib/utils/`  
✅ Split components >500 lines into smaller pieces

### Database:
✅ **ONLY** use Prisma ORM, never raw SQL  
✅ Update workflow: Edit schema → `npx prisma db push` → `npx prisma generate`  
✅ Update `seed.ts` when schema changes

### UI/UX:
✅ Reference `/admin/dashboard/revenue` for UI patterns  
✅ Use minimal colors (gray/white dominant)  
✅ Use custom icons or `react-icons/fa`  
✅ Professional, clean, modern design

### Development:
✅ Never run `npm run dev` (always running)  
✅ Always create todo lists  
✅ Write detailed, accurate responses  
✅ Use English for all code/comments  
✅ Include future improvements section

---

## Version History
- v1.0 (2025-11-09): Initial comprehensive guide incorporating all documentation files
- v2.0 (2025-11-16): Major update - Added authentication, BigInt serialization, route organization, currency handling, Prisma ORM, database relationships, file structure, UI/UX standards, database workflow, icon usage, development rules, and English language requirement

---

**Remember**: 
1. Always use authentication middleware
2. Always serialize BigInt before API responses
3. Always check merchant currency for pricing
4. Always use Prisma ORM for database
5. Always organize routes by role groups
6. Always follow professional UI/UX standards
7. Always write in English
8. Always create detailed todo lists
9. Always include future improvements
