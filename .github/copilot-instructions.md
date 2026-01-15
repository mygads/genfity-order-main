# GENFITY AI Coding Agent Instructions

## Overview
This document provides comprehensive instructions for AI coding agents working on the GENFITY online ordering project. GENFITY is a comprehensive restaurant management and online ordering system built with Next.js, TypeScript, and PostgreSQL. The following guidelines cover technical constraints, authentication, BigInt serialization, route organization, currency handling, Prisma ORM usage, database schema relationships, file structure, UI/UX standards, icon usage, database update workflow, development workflow, and code quality standards.

## CRITICAL: Repository Familiarization (Read-First)
This codebase is large and role-driven. Before changing or creating anything, the agent MUST understand which layer and conventions apply.

### Mandatory "read the whole file" rule
- If you are editing an existing file: read the entire file first (not just a snippet) to learn its patterns, helpers, types, and styling conventions.
- If you are creating a new page/component: read the closest existing page/component in the same feature area (and its imported subcomponents) and match its structure and styling.
- If you are adding a new admin page: use the existing admin dashboard layout patterns and copy the visual/UX style from the merchant revenue page as the baseline.
  - Reference implementation: `/src/app/(admin)/admin/dashboard/(merchant)/revenue/page.tsx`

### High-level architecture map (authoritative entry points)
- **App Router groups**:
  - Admin dashboard: `/src/app/(admin)/admin/dashboard/**`
  - Customer: `/src/app/(customer)/**`
  - Driver: `/src/app/(driver)/**`
  - Influencer: `/src/app/(influencer)/**`
- **Admin dashboard shell**:
  - Layout: `/src/app/(admin)/admin/dashboard/layout.tsx`
  - Sidebar: `/src/layout/AppSidebar.tsx` (role + permission driven, translated)
  - Session + permission UX guards: `/src/components/auth/SessionGuard.tsx`, `/src/components/auth/PermissionGuard.tsx`
- **Permissions**:
  - Permission keys + path mapping + API mapping: `/src/lib/constants/permissions.ts`
- **Auth**:
  - API middleware wrappers (enforced security boundary): `/src/lib/middleware/auth.ts`
  - Server component auth (cookie-based): `/src/lib/auth/serverAuth.ts`
  - Client admin auth storage: `/src/lib/utils/adminAuth.ts`
  - Client driver auth storage: `/src/lib/utils/driverAuth.ts`
  - Client customer auth storage (also cart/favorites/etc): `/src/lib/utils/localStorage.ts`
  - Client hook: `/src/hooks/useAuth.ts`
  - Auth-aware fetch helper: `/src/lib/utils/apiClient.ts`
- **Shared API building blocks**:
  - Error codes + `CustomError` subclasses: `/src/lib/constants/errors.ts`
  - JWT helpers (BigInt-safe payloads): `/src/lib/utils/jwtManager.ts`
  - Route handler params normalization: `/src/lib/utils/routeContext.ts`
- **Data layer**:
  - Prisma client: `/src/lib/db/client.ts`
  - Repository pattern: `/src/lib/repositories/*`
  - Service layer: `/src/lib/services/*`
  - JSON-safe serialization (BigInt/Decimal/Date): `/src/lib/utils/serializer.ts`
- **i18n / Dual language**:
  - Hook: `/src/lib/i18n/useTranslation.ts`
  - Providers: `/src/context/LanguageContext.tsx`
  - Translations: `/src/lib/i18n/translations/en.ts`, `/src/lib/i18n/translations/id.ts`
- **Formatting utilities (use these; do not reinvent)**:
  - Currency/date/time/phone formatting: `/src/lib/utils/format.ts`
  - Country/currency/timezone config: `/src/lib/constants/location.ts`
  - Input validation incl. phone normalization: `/src/lib/utils/validators.ts`
  - Design tokens (use with caution; note deprecated helpers): `/src/lib/design-system.ts`

### "Do not change everything" rule (precision over refactor)
- Prefer minimal diffs. Do not rename files/exports, reorder large blocks, or reformat unrelated code.
- If a change would affect multiple features, STOP and ask for confirmation unless explicitly requested.
- Preserve existing behavior unless the user explicitly requests changes.

### Cleanup rule (only what you touch)
- If you modify a file and introduce unused imports/variables/helpers, remove them.
- Do NOT delete existing exports/files just because they look unused unless you have verified (via usage search) that they are truly unused and the user asked for cleanup.

## Technical Constraints & Rules

### Security Requirements:
- **Password Hashing**: bcryptjs with >=10 rounds, never return password_hash
- **JWT**: Include session ID in payload, validate against database
- **Anti-bot (optional)**: Turnstile verification is enforced only when configured (`/src/lib/utils/turnstile.ts`)
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

### Role + permission model (Admin UI)
- **Roles** (high-level): `SUPER_ADMIN`, `MERCHANT_OWNER`, `MERCHANT_STAFF` (plus separate customer/influencer systems).
- **Staff permissions** are separate from role:
  - Sidebar visibility uses permission keys in `/src/lib/constants/permissions.ts`.
  - Client-side guard blocks staff from restricted pages (UX only): `/src/components/auth/PermissionGuard.tsx`.
  - API routes MUST enforce permissions using `withMerchant()` which internally uses permission checks.

### Client auth conventions (Admin)
- Admin auth tokens/metadata live in `localStorage` and a non-httpOnly cookie (`auth_token`) for server-side cookie auth.
  - Source of truth helpers: `/src/lib/utils/adminAuth.ts`.
- Prefer using `/src/lib/utils/apiClient.ts` (`fetchWithAuth`, `fetchJsonWithAuth`) for admin fetches unless a page already uses `fetch` directly.

### Client auth conventions (Customer / Driver / Influencer)
- **Customer**:
  - Uses `/src/lib/utils/localStorage.ts` helpers (`getCustomerAuth`, `saveCustomerAuth`, `getCustomerToken`).
  - Storage key: `genfity_customer_auth`.
  - Customer pages broadcast auth state changes via the `customerAuthChange` event.
- **Driver**:
  - Uses `/src/lib/utils/driverAuth.ts` helpers (`getDriverAuth`, `saveDriverAuth`, `getDriverToken`).
  - Storage key: `genfity_driver_auth`.
  - Also sets a driver-only cookie `driver_auth_token` scoped to `path=/driver` for middleware/server-side checks.
- **Influencer**:
  - Influencer UI currently stores tokens/data directly in `localStorage` under `influencerAccessToken`, `influencerRefreshToken`, `influencerData`.
  - Protected influencer pages fetch `GET /api/influencer/auth/me` with `Authorization: Bearer <token>` (see `/src/app/(influencer)/influencer/layout.tsx`).

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

### IMPORTANT: API routes live under App Router
- API routes in this repo are implemented in `/src/app/api/**/route.ts`.
- Always wrap protected routes with middleware (`withMerchant`, `withSuperAdmin`, etc.) from `/src/lib/middleware/auth.ts`.
- Prefer throwing `CustomError` subclasses and letting middleware return standardized errors via `/src/lib/middleware/errorHandler.ts`.

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

### Use the shared formatter (REQUIRED)
Use `/src/lib/utils/format.ts`:

```typescript
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/format';
import { getCurrencyConfig } from '@/lib/constants/location';

const label = `Max price (${getCurrencySymbol(merchant.currency)})`;
const preview = formatCurrency(amount, merchant.currency, locale);
const { decimals } = getCurrencyConfig(merchant.currency);
```

Rules:
- `AUD` must display as `A$` and uses 2 decimals.
- `IDR` must display as `Rp` and uses 0 decimals.
- Inputs must use currency-aware `step` (e.g., `0.01` for AUD, `1` for IDR) and normalize values accordingly.

Avoid using `Intl.NumberFormat` directly in UI unless there is a specific reason; the shared formatter already encodes product rules.

### Price Storage:
- Database: `DECIMAL(10, 2)` (Prisma Decimal type)
- API Response: Convert to JSON-safe types using `serializeBigInt()` (BigInt/Decimal/Date)
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

## CRITICAL: Data Layer Conventions (Repository + Service)

### Repository layer (/src/lib/repositories)
- Repositories are responsible for Prisma queries and should return JSON-safe data (commonly via `serializeData`).
- Prefer `prisma.$transaction` for multi-table writes.

### Service layer (/src/lib/services)
- Services encapsulate business rules/validation and call repositories.
- API routes should call services when a service exists for that domain (e.g., `MerchantService`, `MenuService`, `OrderService`).

### Standard API error/response pattern
- Middleware wrappers in `/src/lib/middleware/auth.ts` already call `handleError()`.
- For non-wrapped public routes, use `/src/lib/middleware/errorHandler.ts` (`handleError`, `successResponse`).
- Prefer `ERROR_CODES` + `CustomError` subclasses from `/src/lib/constants/errors.ts` (e.g. `ValidationError`) over hand-rolled JSON error bodies.

### Route param parsing (API handlers)
- Many route handlers have dynamic params (`[id]`, `[merchantCode]`, etc). Use `/src/lib/utils/routeContext.ts` helpers (`requireBigIntRouteParam`, `requireRouteParam`, etc.) instead of assuming `context.params` is a plain object.

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

## CRITICAL: Admin Sidebar + Navigation Rules

### Primary sidebar implementation
- The active admin dashboard sidebar is `/src/layout/AppSidebar.tsx`.
- Sidebar labels are translated using `useTranslation()` and translation keys (NOT hardcoded strings).
- Staff access control:
  - Sidebar items can require a staff permission (`STAFF_PERMISSIONS.*`).
  - Permission-to-path and permission-to-API maps live in `/src/lib/constants/permissions.ts`.

### Adding a new admin page (Checklist)
When you add a new dashboard page route, you may also need to update:
1. The page route under `/src/app/(admin)/admin/dashboard/...` (correct role grouping).
2. Sidebar item in `/src/layout/AppSidebar.tsx` (with translation key).
3. Translations in BOTH `/src/lib/i18n/translations/en.ts` and `/src/lib/i18n/translations/id.ts`.
4. Staff permission mapping in `/src/lib/constants/permissions.ts`:
   - `PATH_PERMISSION_MAP` (page)
   - `API_PERMISSION_MAP` (API routes)
5. If staff should be blocked client-side, ensure `isOwnerOnlyDashboardPath`/permission mapping covers it (UX only).

Note: `/src/lib/constants/adminMenus.ts` exists but is currently unused by the active sidebar. Do not update it unless the UI explicitly uses it.

---

## CRITICAL: Dual-Language (EN/ID) Requirement

### UI strings
- Any user-facing text in admin/customer/driver/influencer UI MUST support English and Indonesian.
- Use `useTranslation()` (`t('...')`) for labels, buttons, hints, and empty/error states.
- When adding a new translation key:
  - Add the key to BOTH `/src/lib/i18n/translations/en.ts` and `/src/lib/i18n/translations/id.ts`.
  - Prefer consistent key namespaces: `admin.*`, `customer.*`, `common.*`, `auth.*`, etc.

### Locale initialization & hydration safety
- Language providers expose `isInitialized` to avoid hydration mismatch. Do not assume locale is ready on first render.

### Customer locale rules (currency-driven)
- Customer pages are wrapped by `/src/app/(customer)/layout.tsx` (forced light-mode container layout).
- Merchant customer pages (`/src/app/(customer)/[merchantCode]/layout.tsx`) may auto-set locale based on merchant currency via `getLocaleFromCurrency()`.
- Customer locale preference is stored under `genfity_customer_locale` (see `/src/lib/i18n/index.ts`).

---

## CRITICAL: UI/UX Style Consistency (Admin)

### Baseline styling rules
- Use the existing Tailwind patterns seen in `/src/app/(admin)/admin/dashboard/(merchant)/revenue/page.tsx` and its components:
  - Clean gray/white surfaces, `rounded-lg`, subtle borders, dark-mode support.
  - Prefer skeleton loaders (e.g., `/src/components/common/SkeletonLoaders`) over spinners.
  - Use shared building blocks like `PageBreadcrumb` and existing feature components.

### Shared components first
- Before creating new UI primitives, search `/src/components/ui` and `/src/components/common` for an existing component.
- For merchant settings pages, reuse the existing `merchant-edit` UI components and tabs structure.

---

## Formatting Utilities (REQUIRED)

Use shared formatting utilities instead of ad-hoc formatting:
- Currency/date/time/relative time/phone formatting: `/src/lib/utils/format.ts`
- Currency config (symbols/decimals/timezones): `/src/lib/constants/location.ts`
- Phone validation/normalization: `/src/lib/utils/validators.ts`

Avoid using `src/lib/design-system.ts` helper utilities for formatting if marked `@deprecated`.

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

### Database schema workflow (be explicit)
This repo contains a `prisma/migrations` folder and also provides `db:push` scripts.

Default rule:
- Prefer `pnpm db:push` + `pnpm exec prisma generate` for schema sync while iterating.
- Do NOT create or run migrations unless the user explicitly requests a migration-based workflow.

If you change `schema.prisma`, you must also consider whether `/prisma/seed.ts` needs updates.

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

Note: This repo uses `pnpm`. Treat `pnpm dev` the same way: do not restart dev unless the user asks.

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

---

## Added safety rules (do not skip)

### Before making changes (required checklist)
1. Identify the role + surface (admin/customer/driver/influencer) and locate the correct route group.
2. Find the closest existing implementation and read the whole file (and key imported components) to match style and patterns.
3. Locate existing utilities (formatting, auth, validators, error handling) and reuse them.
4. Confirm API auth wrapper (`withMerchant`, `withSuperAdmin`, etc.) and staff permission mapping if needed.
5. Ensure dual-language translations for all user-facing strings.
6. Run typecheck/tests relevant to the changed area if feasible.

### When refactoring
- Only refactor within the requested scope.
- Keep public contracts stable (component props, API response shapes, service/repo method signatures) unless explicitly asked.
- If a change affects behavior, update all call sites or stop and ask for direction.
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
