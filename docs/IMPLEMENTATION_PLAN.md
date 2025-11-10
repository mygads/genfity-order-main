# GENFITY Frontend Implementation Guide

## 🎯 Implementation Summary

Saya telah mempersiapkan foundation untuk frontend routing GENFITY dengan membuat:

### ✅ Completed:
1. **Documentation**: `docs/FRONTEND_ROUTING_STRUCTURE.md` - Routing specification lengkap
2. **TypeScript Types**: `src/lib/types/customer.ts` - All customer-facing types
3. **localStorage Utilities**: `src/lib/utils/localStorage.ts` - Cart, auth, table number management
4. **Middleware**: `src/middleware.ts` - Dashboard route protection
5. **Server Auth**: `src/lib/auth/serverAuth.ts` - Server-side authentication helpers

---

## 📁 Required Folder Structure Changes

Karena ini adalah refactoring besar dari template TailAdmin ke aplikasi GENFITY, berikut adalah struktur folder yang harus dibuat:

```
src/app/
├── page.tsx                          # ✨ NEW: Customer landing page
├── layout.tsx                        # ✅ KEEP: Root layout (update for customer theme)
├── login/
│   └── page.tsx                      # ✨ NEW: Customer login
├── profile/
│   └── page.tsx                      # ✨ NEW: Customer profile & history
├── [merchantCode]/
│   ├── page.tsx                      # ✨ NEW: Mode selection
│   ├── layout.tsx                    # ✨ NEW: Customer layout for merchant pages
│   ├── home/
│   │   └── page.tsx                  # ✨ NEW: Menu browsing
│   ├── view-order/
│   │   └── page.tsx                  # ✨ NEW: Cart review
│   ├── payment/
│   │   └── page.tsx                  # ✨ NEW: Payment info
│   └── order-summary-cash/
│       └── page.tsx                  # ✨ NEW: Order confirmation
├── dashboard/
│   ├── layout.tsx                    # ✨ NEW: Dashboard layout (migrate from (admin)/layout.tsx)
│   ├── page.tsx                      # ✨ NEW: Dashboard home (merge from (admin)/page.tsx)
│   ├── signin/
│   │   └── page.tsx                  # ✨ NEW: Admin/merchant login
│   ├── merchants/
│   │   ├── page.tsx                  # 📦 MOVE from (admin)/merchants/
│   │   └── [id]/
│   │       └── page.tsx              # 📦 MOVE & UPDATE
│   ├── menu/
│   │   ├── page.tsx                  # ✨ NEW: Menu management
│   │   ├── categories/
│   │   │   └── page.tsx              # ✨ NEW: Category management
│   │   └── addons/
│   │       └── page.tsx              # ✨ NEW: Addon management
│   ├── orders/
│   │   ├── page.tsx                  # ✨ NEW: Order list
│   │   └── [id]/
│   │       └── page.tsx              # ✨ NEW: Order details
│   ├── reports/
│   │   └── page.tsx                  # ✨ NEW: Revenue reports
│   └── settings/
│       └── page.tsx                  # ✨ NEW: Merchant settings
└── api/                              # ✅ KEEP: Existing API routes
```

### 🗑️ To Delete/Archive:
- `src/app/(admin)/*` - Template pages (keep for reference, but move logic to `/dashboard`)
- `src/app/(full-width-pages)/*` - Template auth pages (replace with custom pages)
- `src/app/(ui-elements)/*` - Not needed for MVP
- Template example pages in `src/components/example/`

---

## 🚀 Implementation Steps (Recommended Order)

### Phase 1: Setup & Customer Routes (Priority 1)
1. **Create customer landing page** (`src/app/page.tsx`)
   - Hero section
   - Merchant search input
   - Sign In button (top right)
   - Popular merchants list

2. **Create customer login** (`src/app/login/page.tsx`)
   - Email input
   - Optional: Name & Phone (for new users)
   - Seamless register/login logic
   - Redirect to `ref` parameter after login

3. **Create customer profile** (`src/app/profile/page.tsx`)
   - User info display
   - Order history list
   - Edit profile
   - Logout button

4. **Create merchant mode selection** (`src/app/[merchantCode]/page.tsx`)
   - 2 big buttons: Dine In / Takeaway
   - Merchant info card
   - Outlet info section (#outlet anchor)
   - Opening hours

5. **Create menu browsing** (`src/app/[merchantCode]/home/page.tsx`)
   - Table number input (dinein mode) - save to localStorage
   - Menu categories navigation
   - Menu items grid
   - Cart summary (sticky bottom or sidebar)
   - Menu detail modal (#add-menu anchor, ?id=997)
   - Add to cart with addons

6. **Create checkout flow**:
   - View Order: `src/app/[merchantCode]/view-order/page.tsx`
   - Payment: `src/app/[merchantCode]/payment/page.tsx`
   - Summary: `src/app/[merchantCode]/order-summary-cash/page.tsx`

### Phase 2: Dashboard Routes (Priority 2)
7. **Create dashboard signin** (`src/app/dashboard/signin/page.tsx`)
   - Email + Password form
   - JWT authentication
   - Role validation (reject CUSTOMER)

8. **Create dashboard layout** (`src/app/dashboard/layout.tsx`)
   - Role-based sidebar
   - Different menu items for SUPER_ADMIN/MERCHANT_OWNER/MERCHANT_STAFF
   - Header with logout

9. **Create dashboard home** (`src/app/dashboard/page.tsx`)
   - Super Admin: Platform stats
   - Merchant: Merchant stats, revenue chart

10. **Create management pages**:
    - Merchants: `/dashboard/merchants` (super admin only)
    - Menu: `/dashboard/menu`, `/dashboard/menu/categories`, `/dashboard/menu/addons`
    - Orders: `/dashboard/orders`
    - Reports: `/dashboard/reports` (owner only)
    - Settings: `/dashboard/settings`

---

## 💡 Key Implementation Notes

### LocalStorage Cart Management
```typescript
// Per merchant cart (tidak terhapus saat ganti merchant)
import { addToCart, getCart, clearCart } from '@/lib/utils/localStorage';

// Add item to cart
addToCart('BRJO', merchantId, 'takeaway', {
  menuId: 997n,
  menuName: 'Nasi Geprek',
  price: 19000,
  quantity: 1,
  notes: 'Extra pedas',
  addons: [...],
  subtotal: 19000,
});

// Get cart for display
const cart = getCart('BRJO');

// Clear after checkout
clearCart('BRJO');
```

### Table Number (Dine-in)
```typescript
import { saveTableNumber, getTableNumber, clearTableNumber } from '@/lib/utils/localStorage';

// Save table number
saveTableNumber('BRJO', '21');

// Get saved table number
const table = getTableNumber('BRJO');

// Clear after checkout or when returning to mode selection
clearTableNumber('BRJO');
```

### Customer Authentication (Passwordless)
```typescript
// Login/Register API endpoint
POST /api/public/auth/customer-login
Body: { email, name?, phone? }

Response: {
  success: true,
  data: {
    accessToken: 'eyJ...',
    user: { id, name, email, phone, role: 'CUSTOMER' },
    expiresAt: '2024-11-11T...'
  }
}

// Frontend saves to localStorage
import { saveCustomerAuth, getCustomerAuth } from '@/lib/utils/localStorage';
saveCustomerAuth(responseData);

// Check if authenticated
const auth = getCustomerAuth();
if (auth) {
  // User is logged in
}
```

### Ref Parameter for Back Navigation
```typescript
// When navigating to login from menu page
const currentPath = `/BRJO/home?mode=takeaway`;
const loginUrl = `/login?merchant=BRJO&mode=takeaway&ref=${encodeURIComponent(currentPath)}`;

// After login, redirect to ref
const ref = searchParams.get('ref');
if (ref) {
  router.push(ref);
} else {
  router.push('/');
}
```

### Role-Based Sidebar (Dashboard)
```typescript
// src/components/dashboard/Sidebar.tsx
import { requireAuth } from '@/lib/auth/serverAuth';

export async function Sidebar() {
  const user = await requireAuth();

  const menuItems = {
    SUPER_ADMIN: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Merchants', href: '/dashboard/merchants' },
      { label: 'Platform Stats', href: '/dashboard/stats' },
    ],
    MERCHANT_OWNER: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Menu', href: '/dashboard/menu' },
      { label: 'Orders', href: '/dashboard/orders' },
      { label: 'Reports', href: '/dashboard/reports' },
      { label: 'Settings', href: '/dashboard/settings' },
    ],
    MERCHANT_STAFF: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Menu', href: '/dashboard/menu' },
      { label: 'Orders', href: '/dashboard/orders' },
    ],
  };

  return (
    <aside>
      {menuItems[user.role].map(item => (
        <Link key={item.href} href={item.href}>{item.label}</Link>
      ))}
    </aside>
  );
}
```

---

## 🎨 UI Components to Reuse (from TailAdmin template)

Keep and reuse these components from the template:
- `src/components/ui/button/` - Button components
- `src/components/ui/modal/` - Modal dialogs
- `src/components/form/` - Form inputs
- `src/components/header/` - Header components (modify for customer pages)
- `src/components/tables/` - Table components (for dashboard)

---

## 📝 API Endpoints Needed (Create if not exists)

### Customer Auth
- `POST /api/public/auth/customer-login` - Passwordless login/register

### Public Merchant & Menu
- `GET /api/public/merchants/[code]` - Get merchant by code ✅ EXISTS
- `GET /api/public/merchants/[code]/menu` - Get merchant menu ✅ EXISTS

### Orders
- `POST /api/public/orders` - Create order ✅ EXISTS
- `GET /api/public/orders/[orderNumber]` - Get order details ✅ EXISTS
- `GET /api/customer/orders` - Get customer order history (NEW - requires auth)

---

## 🔐 Security Checklist

- ✅ Dashboard routes protected by middleware
- ✅ Role-based access (SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF)
- ✅ Customer can't access dashboard
- ✅ JWT verification in server components
- ✅ Merchant isolation (staff can only see their own merchant)
- ⚠️ Rate limiting on public endpoints (implement in API routes)
- ⚠️ CSRF protection (implement with tokens)

---

## 🧪 Testing Checklist

### Customer Flow
- [ ] Landing → Search merchant → Select merchant
- [ ] Merchant page → Choose mode (dinein/takeaway)
- [ ] Menu browsing → Add to cart → View cart
- [ ] Checkout → Enter info (auto register/login) → Confirm
- [ ] Order summary → QR code → New order
- [ ] Login → Profile → Order history

### Dashboard Flow
- [ ] Login as Super Admin → See all merchants
- [ ] Login as Merchant Owner → See own merchant data
- [ ] Login as Merchant Staff → Limited access
- [ ] Login as Customer → Rejected

### LocalStorage
- [ ] Cart persists per merchant
- [ ] Table number persists until checkout
- [ ] Switching merchants doesn't clear cart
- [ ] Checkout clears cart & table number

---

## 🚀 Next Actions

**Option A: AI-Assisted Implementation (Recommended)**
Lanjutkan dengan memberikan instruksi step-by-step untuk membuat setiap halaman. Contoh:
```
"Create customer landing page at src/app/page.tsx with hero section, 
merchant search input, and signin button. Use Tailwind CSS styling 
consistent with TailAdmin template."
```

**Option B: Manual Implementation**
Use this guide as reference and implement pages manually, utilizing the utilities and types that have been created.

---

## 📚 Additional Resources Created

1. `docs/FRONTEND_ROUTING_STRUCTURE.md` - Complete routing specification
2. `src/lib/types/customer.ts` - All TypeScript types
3. `src/lib/utils/localStorage.ts` - Cart & auth utilities
4. `src/middleware.ts` - Route protection middleware
5. `src/lib/auth/serverAuth.ts` - Server-side auth helpers

---

**Status**: Foundation ready ✅  
**Next Step**: Implement Phase 1 (Customer Routes) → Phase 2 (Dashboard Routes)

---

Last Updated: 2024-11-10
