# GENFITY Frontend Routing Structure

## Overview
Dokumen ini menjelaskan struktur routing lengkap untuk aplikasi GENFITY Online Ordering, termasuk customer-facing pages dan dashboard admin/merchant.

---

## Customer Routes (Public)

### 1. Landing Page
- **Route**: `/`
- **File**: `src/app/page.tsx`
- **Description**: Landing page utama dengan informasi sistem dan input merchant code
- **Features**:
  - Hero section dengan informasi GENFITY
  - Input untuk mencari merchant by name/code
  - Button "Sign In" di pojok kanan atas
  - Daftar merchant populer (optional)

### 2. Customer Login
- **Route**: `/login`
- **Query Params**: `?merchant=BRJO&mode=takeaway&ref=%2FBRJO%2Fhome%3Fmode%3Dtakeaway`
- **File**: `src/app/login/page.tsx`
- **Description**: Customer authentication (passwordless login via email)
- **Features**:
  - Email input untuk login/register
  - Optional: Name dan Phone untuk first-time users
  - Redirect ke `ref` parameter setelah login
  - Jika `ref` tidak ada, redirect ke merchant home atau landing

### 3. Customer Profile
- **Route**: `/profile`
- **Query Params**: `?merchant=BRJO&mode=takeaway&ref=%2FBRJO%2Fhome`
- **File**: `src/app/profile/page.tsx`
- **Description**: Customer profile dan order history
- **Features**:
  - User info (name, email, phone)
  - Order history list
  - Button "Kembali" ke `ref` parameter
  - Logout button

### 4. Merchant Mode Selection
- **Route**: `/[merchantCode]`
- **File**: `src/app/[merchantCode]/page.tsx`
- **Description**: Pilih mode pemesanan (dine-in atau takeaway)
- **Features**:
  - 2 button besar: "Dine In" dan "Takeaway"
  - Merchant info (nama, alamat, telp, foto)
  - Merchant outlet info section (anchor: `#outlet`)
  - Jam operasional per hari

### 5. Menu Browsing
- **Route**: `/[merchantCode]/home`
- **Query Params**: `?mode=takeaway` atau `?mode=dinein`
- **File**: `src/app/[merchantCode]/home/page.tsx`
- **Description**: Browse menu dengan categories dan cart
- **Features**:
  - Input nomor meja (untuk mode=dinein) - saved to localStorage
  - Menu categories navigation
  - Menu items grid/list
  - Add to cart functionality
  - Cart summary (sticky bottom atau sidebar)
  - Menu detail modal/drawer (anchor: `#add-menu`, query: `?id=997`)

### 6. View Order (Cart Review)
- **Route**: `/[merchantCode]/view-order`
- **Query Params**: `?mode=takeaway`
- **File**: `src/app/[merchantCode]/view-order/page.tsx`
- **Description**: Review cart items sebelum checkout
- **Features**:
  - Tipe pemesanan info
  - List items dengan addon details
  - Input catatan per item
  - Input catatan tambahan untuk keseluruhan order
  - Rincian pembayaran (subtotal, biaya lain, total)
  - Button "Lanjut ke Pembayaran"

### 7. Payment Information
- **Route**: `/[merchantCode]/payment`
- **Query Params**: `?mode=takeaway`
- **File**: `src/app/[merchantCode]/payment/page.tsx`
- **Description**: Input customer info dan request payment
- **Features**:
  - Form: Nama, Phone, Email (auto-filled jika sudah login)
  - Input nomor meja (jika mode=dinein)
  - Seamless register/login (email sebagai identifier)
  - Update user info jika email sama tapi data berbeda
  - Confirmation dialog: "Proses pembayaran sekarang?"
  - Button "Bayar di Kasir"

### 8. Order Summary
- **Route**: `/[merchantCode]/order-summary-cash`
- **Query Params**: `?mode=takeaway`
- **File**: `src/app/[merchantCode]/order-summary-cash/page.tsx`
- **Description**: Order confirmation dengan QR code
- **Features**:
  - Nomor pesanan (8 digit)
  - QR code untuk kasir
  - Order items dengan addon details
  - Total pembayaran
  - Button "Pesan Baru" (clear cart, redirect to home)
  - Auto-add to order history

---

## Dashboard Routes (Protected)

### Base Route: `/dashboard`

### 9. Dashboard Sign In
- **Route**: `/dashboard/signin`
- **File**: `src/app/dashboard/signin/page.tsx`
- **Description**: Login untuk Super Admin, Merchant Owner, Merchant Staff
- **Features**:
  - Email + Password form
  - JWT authentication
  - Redirect ke `/dashboard` setelah login
  - Role validation (reject CUSTOMER role)

### 10. Dashboard Home
- **Route**: `/dashboard`
- **File**: `src/app/dashboard/page.tsx`
- **Middleware**: Require auth, roles: SUPER_ADMIN | MERCHANT_OWNER | MERCHANT_STAFF
- **Description**: Dashboard overview
- **Features**:
  - **Super Admin**: Platform statistics, merchant list summary
  - **Merchant Owner/Staff**: Merchant statistics, revenue chart, recent orders
  - Different widgets based on role

### 11. Merchant Management (Super Admin Only)
- **Route**: `/dashboard/merchants`
- **File**: `src/app/dashboard/merchants/page.tsx`
- **Middleware**: Require SUPER_ADMIN role
- **Description**: Manage all merchants
- **Features**:
  - List all merchants dengan search/filter
  - Create new merchant (send email password)
  - Edit merchant
  - Deactivate/activate merchant

### 12. Menu Management
- **Route**: `/dashboard/menu`
- **File**: `src/app/dashboard/menu/page.tsx`
- **Middleware**: Require MERCHANT_OWNER | MERCHANT_STAFF
- **Description**: Manage menu items
- **Features**:
  - List menu items dengan filter by category
  - Create/edit/delete menu
  - Toggle availability
  - Update stock

### 13. Menu Categories Management
- **Route**: `/dashboard/menu/categories`
- **File**: `src/app/dashboard/menu/categories/page.tsx`
- **Middleware**: Require MERCHANT_OWNER | MERCHANT_STAFF
- **Description**: Manage menu categories
- **Features**:
  - List categories
  - Create/edit/delete category
  - Reorder categories

### 14. Addon Management
- **Route**: `/dashboard/menu/addons`
- **File**: `src/app/dashboard/menu/addons/page.tsx`
- **Middleware**: Require MERCHANT_OWNER | MERCHANT_STAFF
- **Description**: Manage addon categories dan items
- **Features**:
  - List addon categories
  - Create/edit addon categories
  - Manage addon items per category

### 15. Order Management
- **Route**: `/dashboard/orders`
- **File**: `src/app/dashboard/orders/page.tsx`
- **Middleware**: Require MERCHANT_OWNER | MERCHANT_STAFF
- **Description**: View and manage orders
- **Features**:
  - List orders dengan filter (status, date, mode)
  - View order details
  - Update order status
  - Print receipt

### 16. Revenue Reports
- **Route**: `/dashboard/reports`
- **File**: `src/app/dashboard/reports/page.tsx`
- **Middleware**: Require MERCHANT_OWNER
- **Description**: Revenue dan sales reports
- **Features**:
  - Date range filter
  - Revenue chart
  - Top selling items
  - Export to CSV/PDF

### 17. Settings
- **Route**: `/dashboard/settings`
- **File**: `src/app/dashboard/settings/page.tsx`
- **Middleware**: Require MERCHANT_OWNER
- **Description**: Merchant settings
- **Features**:
  - Update merchant info
  - Opening hours configuration
  - Staff management (Merchant Owner only)
  - Change password

---

## Folder Structure

```
src/app/
├── (customer)/                      # Customer-facing routes group
│   ├── page.tsx                     # Landing page (/)
│   ├── login/
│   │   └── page.tsx                 # Customer login
│   ├── profile/
│   │   └── page.tsx                 # Customer profile & history
│   └── [merchantCode]/
│       ├── page.tsx                 # Mode selection
│       ├── home/
│       │   └── page.tsx             # Menu browsing
│       ├── view-order/
│       │   └── page.tsx             # Cart review
│       ├── payment/
│       │   └── page.tsx             # Payment info
│       └── order-summary-cash/
│           └── page.tsx             # Order confirmation
│
├── dashboard/
│   ├── layout.tsx                   # Dashboard layout with sidebar
│   ├── page.tsx                     # Dashboard home
│   ├── signin/
│   │   └── page.tsx                 # Admin/merchant login
│   ├── merchants/
│   │   ├── page.tsx                 # List merchants (super admin)
│   │   └── [id]/
│   │       └── page.tsx             # Edit merchant
│   ├── menu/
│   │   ├── page.tsx                 # Menu items management
│   │   ├── categories/
│   │   │   └── page.tsx             # Menu categories
│   │   └── addons/
│   │       └── page.tsx             # Addon management
│   ├── orders/
│   │   ├── page.tsx                 # Order list
│   │   └── [id]/
│   │       └── page.tsx             # Order details
│   ├── reports/
│   │   └── page.tsx                 # Revenue reports
│   └── settings/
│       └── page.tsx                 # Merchant settings
│
└── api/                             # API routes (existing)
```

---

## Middleware & Auth Flow

### Customer Auth Flow
1. Customer masuk ke `/login` dengan query params `ref`
2. Input email (dan nama/phone jika baru)
3. Backend check:
   - Jika email sudah ada: Login (update name/phone jika berbeda)
   - Jika email baru: Register user dengan role CUSTOMER
4. Return JWT token
5. Frontend save token ke localStorage
6. Redirect ke `ref` URL atau merchant home

### Dashboard Auth Flow
1. User akses `/dashboard`
2. Middleware check JWT token
3. Jika tidak ada token: Redirect ke `/dashboard/signin`
4. Jika ada token: Verify dan check role
5. Jika role CUSTOMER: Show error "Access denied"
6. Jika role valid: Allow access dengan role-based menu

### Middleware Files
- `src/middleware.ts`: Global middleware untuk route protection
- `src/lib/middleware/auth.ts`: Auth utilities
- `src/lib/middleware/withRole.ts`: Role-based protection HOC

---

## localStorage Keys

### Cart Management
```typescript
// Key format: genfity_cart_[merchantCode]
// Example: genfity_cart_BRJO
{
  merchantCode: "BRJO",
  mode: "takeaway" | "dinein",
  tableNumber: "21", // only for dinein
  items: [
    {
      menuId: 997,
      menuName: "Nasi Geprek",
      price: 19000,
      quantity: 2,
      notes: "Extra pedas",
      addons: [
        { id: 1, name: "Extra Cheese", price: 5000 }
      ]
    }
  ],
  createdAt: "2024-11-10T10:00:00Z"
}
```

### Table Number (Dine-in only)
```typescript
// Key format: genfity_table_[merchantCode]
// Example: genfity_table_BRJO
{
  tableNumber: "21",
  merchantCode: "BRJO",
  setAt: "2024-11-10T10:00:00Z"
}
```

### Auth Token
```typescript
// Key: genfity_auth
{
  accessToken: "eyJ...",
  user: {
    id: 123,
    name: "John Doe",
    email: "john@example.com",
    role: "CUSTOMER"
  }
}
```

---

## Query Parameters Standard

### Customer Routes
- `merchant`: Merchant code (untuk maintain context di login/profile)
- `mode`: `takeaway` | `dinein` (order mode)
- `ref`: Encoded URL untuk back navigation
- `id`: Menu ID (untuk modal detail menu)

### Dashboard Routes
- `page`: Page number untuk pagination
- `search`: Search query
- `status`: Filter by status
- `from`: Date range start
- `to`: Date range end

---

## Next Steps

1. ✅ Create folder structure
2. ✅ Setup middleware for auth protection
3. ✅ Create customer landing page
4. ✅ Create merchant mode selection page
5. ✅ Create menu browsing with cart
6. ✅ Create checkout flow pages
7. ✅ Create dashboard layout with role-based sidebar
8. ✅ Create dashboard pages
9. ✅ Implement localStorage utilities
10. ✅ Test all routes and flows

---

Last Updated: 2024-11-10
