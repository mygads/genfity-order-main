# Panduan Lengkap Order Management System - GENFITY

## 📋 Daftar Isi

1. [Overview & Filosofi Design](#overview--filosofi-design)
2. [Analisis Database & Saran Perubahan](#analisis-database--saran-perubahan)
3. [Arsitektur Order Management](#arsitektur-order-management)
4. [UI/UX Design System untuk Order](#uiux-design-system-untuk-order)
5. [Fitur-Fitur Order Management](#fitur-fitur-order-management)
6. [Page Structure & Routes](#page-structure--routes)
7. [Komponen UI & Pattern](#komponen-ui--pattern)
8. [Real-time Order Board (Drag & Drop)](#real-time-order-board-drag--drop)
9. [Order Flow & State Management](#order-flow--state-management)
10. [Payment Integration (Future-Ready)](#payment-integration-future-ready)
11. [Best Practices untuk POS System](#best-practices-untuk-pos-system)
12. [API Endpoints yang Diperlukan](#api-endpoints-yang-diperlukan)
13. [Implementasi Roadmap](#implementasi-roadmap)

---

## 1. Overview & Filosofi Design

### Tujuan Utama
Order Management System dirancang untuk:
- ✅ **Memudahkan Admin** - Interface intuitif untuk mengelola pesanan
- ✅ **Real-time Updates** - Pesanan masuk langsung terlihat
- ✅ **Visual & Interactive** - Drag & drop untuk update status
- ✅ **Mobile-Friendly** - Bisa diakses dari tablet/iPad di kasir
- ✅ **Scalable** - Siap untuk payment gateway di masa depan

### Filosofi UI/UX
```
PRINSIP DESIGN:
┌─────────────────────────────────────────────┐
│ 1. CLARITY      - Informasi jelas & mudah   │
│ 2. EFFICIENCY   - Cepat & minimal klik      │
│ 3. VISUAL       - Gunakan warna & ikon      │
│ 4. RESPONSIVE   - Touch-friendly untuk POS  │
│ 5. FEEDBACK     - Instant visual feedback   │
└─────────────────────────────────────────────┘
```

### Referensi Design Pattern
Sistem ini mengadopsi pola dari POS modern seperti:
- **Square POS** - Kanban board untuk order tracking
- **Toast POS** - Clean card design & status colors
- **Shopify POS** - Drag & drop workflow
- **Lightspeed** - Real-time order notifications

---

## 2. Analisis Database & Saran Perubahan

### 📊 Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE STRUCTURE                         │
└─────────────────────────────────────────────────────────────┘

Order (orders)                     Payment (payments)
├── id (PK)                        ├── id (PK)
├── orderNumber                    ├── orderId (FK, UNIQUE) ──→ Order.id
├── merchantId (FK)                ├── amount
├── customerId (FK)                ├── paymentMethod (enum)
├── orderType (enum)               ├── status (enum)
├── tableNumber?                   ├── paidByUserId (FK) ──→ User.id
├── status (enum)                  ├── paidAt?
├── subtotal                       ├── gatewayProvider?
├── taxAmount                      ├── gatewayTransactionId?
├── totalAmount                    ├── gatewayResponse? (JSON)
├── paymentCode? (UNIQUE)          ├── notes?
├── estimatedReadyAt?              ├── metadata? (JSON)
├── completedAt?                   ├── createdAt
└── payment (1:1) ────────────────→└── updatedAt

RELASI:
• 1 Order → 1 Payment (One-to-One)
• Payment.orderId adalah UNIQUE (ensures one payment per order)
• Payment cascade delete jika Order dihapus
```

### 🎯 Design Philosophy

**Kenapa pisahkan Payment ke table sendiri?**

1. **Separation of Concerns** - Order data ≠ Payment data
2. **Data Integrity** - Payment punya lifecycle sendiri
3. **Scalability** - Mudah extend untuk refund, partial payment, dll
4. **Clarity** - `order.payment.status` lebih jelas daripada `order.isPaid`
5. **Future-Ready** - Siap untuk payment gateway integration

---

### 📊 Struktur Database Saat Ini (Yang Bagus)

✅ **Order Model sudah baik:**
```prisma
model Order {
  orderNumber   String      // Unique per merchant ✅
  orderType     OrderType   // DINE_IN / TAKEAWAY ✅
  tableNumber   String?     // Optional untuk dine-in ✅
  status        OrderStatus // Status workflow ✅
  qrCodeUrl     String?     // Untuk payment code ✅
  placedAt      DateTime    // Order timestamp ✅
}
```

✅ **OrderStatus enum sudah komprehensif:**
```prisma
enum OrderStatus {
  PENDING      // Pesanan masuk
  ACCEPTED     // Dikonfirmasi kasir
  IN_PROGRESS  // Sedang diproses dapur
  READY        // Siap diambil
  COMPLETED    // Sudah selesai
  CANCELLED    // Dibatalkan
}
```

### 🔧 SARAN PERUBAHAN DATABASE

#### **A. Tambah Field untuk Payment Management**

**Tambahkan ke `Order` model:**

```prisma
model Order {
  // ... existing fields ...
  // NOTE: orderNumber sudah ada di schema (unique per merchant)
  // NOTE: customerId sudah ada (relasi ke User untuk customer data)
  
  // ===== OPERATIONAL FIELDS (TAMBAHAN) =====
  estimatedReadyAt  DateTime?       @map("estimated_ready_at") @db.Timestamptz(6)
  actualReadyAt     DateTime?       @map("actual_ready_at") @db.Timestamptz(6)
  completedAt       DateTime?       @map("completed_at") @db.Timestamptz(6)
  cancelledAt       DateTime?       @map("cancelled_at") @db.Timestamptz(6)
  cancelReason      String?         @map("cancel_reason")
  
  // ===== RELATIONS =====
  payment           Payment?        // 1:1 relation ke Payment table
  
  // ===== INDEXES (TAMBAHAN) =====
  @@index([estimatedReadyAt])
  
  // NOTES:
  // - orderNumber digunakan untuk payment verification (bayar di kasir)
  // - customerName/Email/Phone DIHAPUS - ambil dari relasi customer → User
  // - qrCodeUrl DIHAPUS - QR code represents orderNumber saja
}
```

#### **B. Tambah Table Payment (RECOMMENDED - Best Practice)**

**Table Payment untuk semua data pembayaran:**

```prisma
model Payment {
  id                    BigInt          @id @default(autoincrement())
  orderId               BigInt          @unique @map("order_id")
  amount                Decimal         @db.Decimal(10, 2)
  paymentMethod         PaymentMethod   @map("payment_method")
  status                PaymentStatus   @default(PENDING)
  
  // ===== MANUAL PAYMENT (Fase 1) =====
  paidByUserId          BigInt?         @map("paid_by_user_id")
  paidAt                DateTime?       @map("paid_at") @db.Timestamptz(6)
  
  // ===== PAYMENT GATEWAY (Fase 2 - Future) =====
  gatewayProvider       String?         @map("gateway_provider")        // 'midtrans', 'stripe', 'xendit'
  gatewayTransactionId  String?         @map("gateway_transaction_id")  // ID dari payment gateway
  gatewayStatus         String?         @map("gateway_status")          // 'pending', 'settlement', 'failed'
  gatewayResponse       Json?           @map("gateway_response")        // Full response dari gateway
  gatewayCallbackAt     DateTime?       @map("gateway_callback_at") @db.Timestamptz(6)
  
  // ===== METADATA =====
  notes                 String?
  metadata              Json?           // Untuk data tambahan (receipt URL, etc)
  
  // ===== TIMESTAMPS =====
  createdAt             DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  // ===== RELATIONS =====
  order                 Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  paidBy                User?           @relation("PaymentRecordedBy", fields: [paidByUserId], references: [id])
  
  // ===== INDEXES =====
  @@index([orderId])
  @@index([status])
  @@index([paymentMethod])
  @@index([gatewayTransactionId])
  @@index([paidAt])
  @@map("payments")
}
```

#### **C. Tambah Enum untuk Payment**

```prisma
enum PaymentMethod {
  CASH_ON_COUNTER    // Bayar tunai di kasir (default sekarang)
  CARD_ON_COUNTER    // Kartu debit/kredit di kasir
  BANK_TRANSFER      // Transfer bank (future)
  E_WALLET           // E-wallet: GoPay, OVO, dll (future)
  QRIS               // QRIS payment (future)
  CREDIT_CARD        // Online credit card (future)
}

enum PaymentStatus {
  PENDING           // Belum dibayar
  COMPLETED         // Sudah dibayar & sukses
  FAILED            // Gagal
  REFUNDED          // Sudah di-refund
  CANCELLED         // Dibatalkan
}
```

#### **D. HAPUS Model OrderStatusHistory (Tidak Diperlukan)**

**IMPORTANT:** Model `OrderStatusHistory` sudah ada di schema tapi tidak diperlukan untuk sistem order management. Bisa dihapus atau diabaikan.

**Alasan:**
- Status order cukup track di field `status` di Order table
- Timestamps (`updatedAt`, `completedAt`, `cancelledAt`) sudah cukup untuk audit
- Mengurangi kompleksitas database dan query
- Lebih simple dan performant

#### **E. Update User Relation**

Tambahkan di `User` model:

```prisma
model User {
  // ... existing relations ...
  
  paymentsRecorded Payment[]  @relation("PaymentRecordedBy")
}
```

### 📝 Migration Command (INGAT: Pakai db push, bukan migrate!)

```bash
# YANG PERLU DITAMBAHKAN KE SCHEMA:
# 1. Operational fields di Order model (estimatedReadyAt, actualReadyAt, dll)
# 2. Payment table (table baru untuk payment data)
# 3. Update User relation (paymentsRecorded)
# 4. HAPUS: customerName, customerEmail, customerPhone dari Order (gunakan relasi customerId)
# 5. HAPUS: qrCodeUrl dari Order (tidak perlu, QR = orderNumber)
# 6. OPSIONAL: Hapus OrderStatusHistory model jika tidak diperlukan

# Setelah edit schema.prisma:
# 1. Push ke database
npx prisma db push

# 2. Generate Prisma Client baru
npx prisma generate

# 3. Update seed data jika diperlukan
# Edit: /prisma/seed.ts
```

### 📐 Database Design Best Practices yang Digunakan

#### **1. Normalization (3NF - Third Normal Form)**
✅ **Payment data terpisah di table sendiri**
- Menghindari duplikasi data
- Mudah update payment tanpa affect order data
- Single source of truth untuk payment information

#### **2. Foreign Key Constraints**
✅ **Relasi 1:1 antara Order & Payment**
```prisma
orderId  BigInt  @unique  // Ensures one payment per order
```
- Enforce data integrity
- Cascade delete (jika order dihapus, payment juga dihapus)

#### **3. Indexing Strategy**
✅ **Index pada field yang sering di-query**
```prisma
@@index([status])
@@index([paymentMethod])
@@index([paidAt])
@@index([gatewayTransactionId])
```
- Meningkatkan performa query
- Mempercepat filter & search

#### **4. Timestamps untuk Audit Trail**
✅ **Tracking semua perubahan**
```prisma
createdAt  DateTime  @default(now())
updatedAt  DateTime  @updatedAt
paidAt     DateTime?
```
- Tahu kapan payment dibuat, diupdate, dibayar
- Mudah debugging & audit

#### **5. Future-Ready Design**
✅ **Field untuk payment gateway**
```prisma
gatewayProvider       String?
gatewayTransactionId  String?
gatewayResponse       Json?
```
- Tidak perlu ubah schema saat integrate payment gateway
- Just populate field yang sudah ada

#### **6. Flexible Metadata Field**
✅ **Json field untuk data tambahan**
```prisma
metadata  Json?
```
- Store receipt URL, transaction details, dll
- Tidak perlu alter table untuk data baru

#### **7. Proper Enum Usage**
✅ **Type-safe status management**
```prisma
enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}
```
- Database-level constraint
- Prevent invalid status values

### ⚠️ Common Mistakes yang DIHINDARI:

#### **Comparison: Design Lama vs Baru**

```
❌ DESIGN LAMA (Data Duplikasi):
┌─────────────────────────────────────────────────────────────┐
│ Order Table                                                  │
├─────────────────────────────────────────────────────────────┤
│ • id                                                         │
│ • orderNumber                                                │
│ • isPaid           ← Duplikasi dengan PaymentHistory        │
│ • paidAt           ← Duplikasi dengan PaymentHistory        │
│ • paymentMethod    ← Duplikasi dengan PaymentHistory        │
│ • paidByUserId     ← Duplikasi dengan PaymentHistory        │
└─────────────────────────────────────────────────────────────┘
         ↓ (potensial inconsistency)
┌─────────────────────────────────────────────────────────────┐
│ PaymentHistory Table (1:N)                                   │
├─────────────────────────────────────────────────────────────┤
│ • id                                                         │
│ • orderId                                                    │
│ • status           ← Data yang sama, beda format            │
│ • paidAt           ← Data yang sama, beda format            │
│ • paymentMethod    ← Data yang sama, beda format            │
│ • paidByUserId     ← Data yang sama, beda format            │
└─────────────────────────────────────────────────────────────┘

MASALAH:
• Data payment ada di 2 tempat → hard to sync
• Order.isPaid vs PaymentHistory.status → which one is truth?
• Update 2 table setiap kali ada perubahan payment
• Risk of inconsistency (Order says paid, PaymentHistory says pending)
```

```
✅ DESIGN BARU (Normalized):
┌─────────────────────────────────────────────────────────────┐
│ Order Table                                                  │
├─────────────────────────────────────────────────────────────┤
│ • id (PK)                                                    │
│ • orderNumber                                                │
│ • paymentCode (UNIQUE)    ← Hanya reference code           │
│ • [NO payment fields]     ← Payment data di table Payment   │
└─────────────────────────────────────────────────────────────┘
         ↓ (1:1 relation)
┌─────────────────────────────────────────────────────────────┐
│ Payment Table (1:1 with Order)                               │
├─────────────────────────────────────────────────────────────┤
│ • id (PK)                                                    │
│ • orderId (FK, UNIQUE)    ← One payment per order           │
│ • status                  ← Single source of truth          │
│ • paidAt                  ← Single source of truth          │
│ • paymentMethod           ← Single source of truth          │
│ • paidByUserId            ← Single source of truth          │
└─────────────────────────────────────────────────────────────┘

BENEFITS:
✅ Payment data HANYA di 1 tempat → no duplication
✅ order.payment.status → single source of truth
✅ Easy to query: SELECT * FROM orders INCLUDE payment
✅ No sync issues
✅ Clear separation of concerns
```

#### **Code Comparison:**

```typescript
// ❌ DESIGN LAMA - Duplikasi & Inconsistency Risk
const order = await prisma.order.findUnique({
  where: { id },
  include: { paymentHistory: true },
});

// Mana yang benar?
const isPaid1 = order.isPaid; // dari Order table
const isPaid2 = order.paymentHistory[0]?.status === 'COMPLETED'; // dari PaymentHistory

// Kalau beda, mana yang dipercaya? 🤔
if (isPaid1 !== isPaid2) {
  // Inconsistency! Data tidak sinkron
  console.error('Payment data mismatch!');
}
```

```typescript
// ✅ DESIGN BARU - Clean & Clear
const order = await prisma.order.findUnique({
  where: { id },
  include: { payment: true },
});

// Single source of truth
const isPaid = order.payment?.status === 'COMPLETED';
const isPending = order.payment?.status === 'PENDING';

// No ambiguity, no confusion
if (order.payment) {
  console.log(`Payment status: ${order.payment.status}`);
  console.log(`Paid at: ${order.payment.paidAt}`);
  console.log(`Method: ${order.payment.paymentMethod}`);
}
```

---

## 3. Arsitektur Order Management

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOMER ORDER FLOW                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Order Placed   │
                    │   (QR/Manual)    │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN ORDER MANAGEMENT                     │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   KANBAN     │  │    TABLE     │  │   KITCHEN    │       │
│  │    VIEW      │  │     VIEW     │  │   DISPLAY    │       │
│  │ (Drag&Drop)  │  │   (Detail)   │  │  (Real-time) │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  Fitur:                                                       │
│  • Real-time order updates (WebSocket/Polling)               │
│  • Visual status management                                  │
│  • Payment code generation                                   │
│  • Order details & history                                   │
│  • Print receipt                                              │
│  • Analytics dashboard                                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Customer Order → API → Database → Real-time Update → Admin UI
                                         ↓
                                   WebSocket/SSE
                                         ↓
                              ┌─────────┴─────────┐
                              ▼                   ▼
                        Kanban Board        Kitchen Display
```

---

## 4. UI/UX Design System untuk Order

### Color System untuk Order Status

**Gunakan warna yang sudah ada di design system:**

```typescript
// /src/lib/design-system.ts atau constants

export const ORDER_STATUS_COLORS = {
  PENDING: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    border: 'border-warning-300 dark:border-warning-700',
    badge: 'bg-warning-500',
    label: 'Menunggu',
    icon: '⏳',
  },
  ACCEPTED: {
    bg: 'bg-brand-100 dark:bg-brand-900/20',
    text: 'text-brand-700 dark:text-brand-400',
    border: 'border-brand-300 dark:border-brand-700',
    badge: 'bg-brand-500',
    label: 'Dikonfirmasi',
    icon: '✓',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'bg-blue-500',
    label: 'Diproses',
    icon: '🔥',
  },
  READY: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    border: 'border-success-300 dark:border-success-700',
    badge: 'bg-success-500',
    label: 'Siap',
    icon: '✅',
  },
  COMPLETED: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-700',
    badge: 'bg-gray-500',
    label: 'Selesai',
    icon: '📦',
  },
  CANCELLED: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    border: 'border-error-300 dark:border-error-700',
    badge: 'bg-error-500',
    label: 'Dibatalkan',
    icon: '❌',
  },
} as const;

export const PAYMENT_STATUS_COLORS = {
  PENDING: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    border: 'border-warning-300',
    label: 'Belum Bayar',
    icon: '💰',
  },
  COMPLETED: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    border: 'border-success-300',
    label: 'Sudah Bayar',
    icon: '✓',
  },
  FAILED: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    border: 'border-error-300',
    label: 'Gagal',
    icon: '❌',
  },
  REFUNDED: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300',
    label: 'Refund',
    icon: '↩️',
  },
  CANCELLED: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300',
    label: 'Dibatalkan',
    icon: '🚫',
  },
} as const;

export const ORDER_TYPE_ICONS = {
  DINE_IN: '🍽️',
  TAKEAWAY: '🥡',
} as const;
```

### Typography & Spacing untuk Order Cards

```typescript
export const ORDER_CARD_STYLES = {
  // Card container
  card: 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4 shadow-sm hover:shadow-md transition-shadow duration-200',
  
  // Card header
  header: 'flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-800',
  orderNumber: 'text-lg font-bold text-gray-800 dark:text-white/90',
  timestamp: 'text-xs text-gray-500 dark:text-gray-400',
  
  // Order info
  infoRow: 'flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300',
  label: 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',
  value: 'text-sm font-medium text-gray-800 dark:text-white/90',
  
  // Badge
  badge: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
  
  // Buttons
  primaryButton: 'h-10 px-4 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors duration-150',
  secondaryButton: 'h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150',
  dangerButton: 'h-10 px-4 rounded-lg bg-error-500 text-white font-medium text-sm hover:bg-error-600 transition-colors duration-150',
} as const;
```

### Responsive Layout Guidelines

```typescript
// Mobile-first approach
export const BREAKPOINTS = {
  // Kanban columns
  kanban: {
    sm: '1 column',    // Mobile: stack vertically
    md: '2 columns',   // Tablet: 2 side-by-side
    lg: '3 columns',   // Desktop: 3 columns
    xl: '4+ columns',  // Large: all statuses
  },
  
  // Card size
  card: {
    minWidth: '280px',
    maxWidth: '100%',
  },
} as const;
```

---

## 5. Fitur-Fitur Order Management

### 5.1 Real-time Order Board (Kanban Style)

**Fitur Utama:**
- ✅ Drag & drop antar status
- ✅ Auto-refresh setiap 5-10 detik
- ✅ Sound notification untuk order baru
- ✅ Visual counter per status
- ✅ Quick actions pada card

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Order Board                        🔔 3 New   ⚙️ Settings   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ PENDING  │  │ACCEPTED  │  │IN_PROGRESS│ │  READY   │       │
│  │   (3)    │  │   (5)    │  │   (2)    │  │   (4)    │       │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤       │
│  │          │  │          │  │          │  │          │       │
│  │ [CARD 1] │  │ [CARD 1] │  │ [CARD 1] │  │ [CARD 1] │       │
│  │ [CARD 2] │  │ [CARD 2] │  │ [CARD 2] │  │ [CARD 2] │       │
│  │ [CARD 3] │  │ [CARD 3] │  │          │  │ [CARD 3] │       │
│  │          │  │ [CARD 4] │  │          │  │ [CARD 4] │       │
│  │          │  │ [CARD 5] │  │          │  │          │       │
│  │          │  │          │  │          │  │          │       │
│  │  + Drop  │  │  + Drop  │  │  + Drop  │  │  + Drop  │       │
│  │   Here   │  │   Here   │  │   Here   │  │   Here   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Order Card Design

**Contoh Order Card:**

```
┌──────────────────────────────────────────┐
│ #ORD-001234        🍽️ Dine In   ⏱ 5m ago │
├──────────────────────────────────────────┤
│ 👤 John Doe (from customer relation)     │
│ 📞 0812-3456-7890                         │
│ 🪑 Table: A-05                            │
│                                           │
│ ─────────────────────                    │
│ 2x Nasi Goreng           Rp 60.000       │
│    + Extra Ayam          Rp 10.000       │
│ 1x Es Teh Manis          Rp 5.000        │
│ ─────────────────────                    │
│                                           │
│ 💰 Order #: ORD-001234 (untuk bayar)     │
│ [ 💰 Belum Bayar ]  CASH_ON_COUNTER      │
│                                           │
│ ─────────────────────                    │
│ Total: Rp 75.000                         │
│                                           │
│ [ Detail ] [ Terima ] [ Bayar ]          │
└──────────────────────────────────────────┘

**NOTES:**
- Customer name/phone dari relasi `order.customer` (User table)
- Payment verification menggunakan `orderNumber`, BUKAN payment code terpisah
- QR code berisi `orderNumber` saja
```

**Cara akses payment status di frontend:**
```typescript
// Order with payment relation
interface OrderWithPayment {
  id: string;
  orderNumber: string;
  // ... other order fields
  payment?: {
    id: string;
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    paidAt?: string;
    // ... other payment fields
  };
}

// Check payment status
const isUnpaid = !order.payment || order.payment.status === 'PENDING';
const isPaid = order.payment?.status === 'COMPLETED';
```

### 5.3 Order Detail Modal/Sidebar

**Informasi lengkap:**
- Order number (untuk payment verification & QR code)
- Customer info dari relasi (`order.customer.name`, `order.customer.phone`, `order.customer.email`)
- Order type & table number (jika dine-in)
- Item list dengan addon
- Pricing breakdown (subtotal, tax, total)
- **Payment section:**
  - Payment status badge (`order.payment.status`)
  - Payment method (`order.payment.paymentMethod`)
  - Order number (ditampilkan sebagai payment reference)
  - Paid by staff name (`order.payment.paidBy.name`)
  - Paid at timestamp (`order.payment.paidAt`)
- Special notes
- Action buttons (Update status, Record payment, Print, Cancel)

**REMOVED:**
- ❌ Status history timeline (OrderStatusHistory tidak diperlukan)
- ❌ QR code URL (QR code represents orderNumber saja)
- ❌ Payment code terpisah (gunakan orderNumber untuk payment)

### 5.4 Table View (List Alternative)

**Untuk user yang prefer tabel:**
- Sortable columns
- Filter by status, date, payment
- Search by order number, customer name
- Bulk actions
- Export to CSV/Excel

### 5.5 Kitchen Display System (KDS)

**View khusus untuk dapur:**
- Hanya tampilkan ACCEPTED & IN_PROGRESS
- Focus pada item yang perlu dimasak
- Timer untuk setiap order
- Large text untuk mudah dibaca dari jauh
- Full screen mode
- Auto-scroll untuk order baru

### 5.6 Order History & Analytics

**Fitur:**
- Filter by date range
- Order count per status
- Revenue tracking
- Popular items
- Peak hours analysis
- Customer insights

---

## 6. Page Structure & Routes

### Route Organization

```
src/app/(admin)/admin/dashboard/(merchant)/
├── orders/
│   ├── page.tsx                    # Main: Order Board (Kanban)
│   ├── list/
│   │   └── page.tsx                # Alternative: Table View
│   ├── kitchen/
│   │   └── page.tsx                # Kitchen Display System
│   ├── history/
│   │   └── page.tsx                # Order History
│   └── [orderId]/
│       └── page.tsx                # Order Detail Page
```

### Page Layout Hierarchy

```typescript
// Main Order Board
/admin/dashboard/orders
  - Kanban view (default)
  - Real-time updates
  - Drag & drop enabled

// Alternative List View
/admin/dashboard/orders/list
  - Table format
  - Advanced filters
  - Bulk actions

// Kitchen Display
/admin/dashboard/orders/kitchen
  - Fullscreen mode
  - Large text
  - Auto-refresh

// Order History
/admin/dashboard/orders/history
  - Past orders
  - Analytics
  - Export data

// Order Detail
/admin/dashboard/orders/[orderId]
  - Full order information
  - Status timeline
  - Payment management
  - Print receipt
```

---

## 7. Komponen UI & Pattern

### 7.1 OrderKanbanBoard Component

**Path:** `/src/components/orders/OrderKanbanBoard.tsx`

**Structure:**
```typescript
interface OrderKanbanBoardProps {
  merchantId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
  enableDragDrop?: boolean;
  soundNotification?: boolean;
}

// Fitur:
// - Kolom per status
// - Drag & drop cards
// - Auto-refresh
// - Sound alert untuk order baru
// - Loading skeleton
// - Empty state
```

### 7.2 OrderCard Component

**Path:** `/src/components/orders/OrderCard.tsx`

**Props:**
```typescript
interface OrderCardProps {
  order: OrderWithItems;
  draggable?: boolean;
  showQuickActions?: boolean;
  onClick?: (order: OrderWithItems) => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  onViewDetails?: (orderId: string) => void;
}

// Features:
// - Compact info display
// - Status badge
// - Payment indicator
// - Quick action buttons
// - Drag handle (optional)
// - Click to expand
```

### 7.3 OrderDetailModal Component

**Path:** `/src/components/orders/OrderDetailModal.tsx`

**Content:**
```typescript
interface OrderDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (newStatus: OrderStatus) => void;
  onPaymentUpdate?: (paymentData: PaymentData) => void;
}

// Sections:
// - Header: Order number, status, timestamps
// - Customer: Name, phone, email
// - Items: Full list with addons
// - Payment: Status, method, code
// - Timeline: Status history
// - Actions: Update status, print, cancel
```

### 7.4 OrderNumberDisplay Component

**Path:** `/src/components/orders/OrderNumberDisplay.tsx`

**Features:**
```typescript
// Display order number untuk payment verification
// Format: Sesuai format orderNumber di database (contoh: ORD-001234)
// Generate QR code dari orderNumber
// Copy orderNumber to clipboard
// Print payment slip dengan orderNumber

// NOTES:
// - TIDAK ada payment code terpisah
// - orderNumber sudah unique per merchant
// - Kasir scan/input orderNumber untuk verifikasi payment
```

### 7.5 OrderStatusTimeline Component (OPTIONAL)

**Path:** `/src/components/orders/OrderStatusTimeline.tsx`

**NOTES:** 
- OrderStatusHistory table TIDAK diperlukan untuk simple order management
- Cukup gunakan timestamps di Order model:
  - `createdAt` → PENDING timestamp
  - `updatedAt` → Last status change
  - `completedAt` → COMPLETED timestamp
  - `cancelledAt` → CANCELLED timestamp

**Alternative Simple Timeline:**
```typescript
// Gunakan Order timestamps saja
interface OrderTimestamps {
  placedAt: Date;       // Order placed
  updatedAt: Date;      // Last update
  actualReadyAt?: Date; // Ready time
  completedAt?: Date;   // Completion time
  cancelledAt?: Date;   // Cancellation time
}

// Display timeline berdasarkan status & timestamps
```

**Visual (Simplified):**
```
⏳ PENDING          17 Nov, 10:30 AM  (placedAt)
  ↓
📦 COMPLETED       17 Nov, 11:00 AM  (completedAt)
```

### 7.6 KitchenOrderCard Component

**Path:** `/src/components/orders/KitchenOrderCard.tsx`

**Large display untuk dapur:**
```
┌────────────────────────────────┐
│  ORDER #1234        🔥 10 mins │
│  Table A-05                    │
├────────────────────────────────┤
│  2x NASI GORENG                │
│     + Extra Ayam               │
│     + Pedas Level 3            │
│                                │
│  1x MIE GORENG                 │
│     + Tanpa Sayur              │
├────────────────────────────────┤
│  Notes: Tidak pakai bawang     │
│                                │
│  [ SIAP DISAJIKAN ]            │
└────────────────────────────────┘
```

---

## 8. Real-time Order Board (Drag & Drop)

### Library Recommendation

**Gunakan:** `@dnd-kit/core` + `@dnd-kit/sortable`

**Alasan:**
- ✅ Modern & lightweight
- ✅ Touch-friendly untuk tablet
- ✅ Accessible (keyboard support)
- ✅ Performant dengan banyak item
- ✅ TypeScript support
- ✅ Actively maintained

**Alternative:** `react-beautiful-dnd` (tapi sudah deprecated)

### Implementation Pattern

```typescript
// /src/components/orders/OrderKanbanBoard.tsx

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const OrderKanbanBoard = () => {
  const [activeId, setActiveId] = useState(null);
  const [orders, setOrders] = useState<OrdersByStatus>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement to start drag
      },
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const orderId = active.id;
    const newStatus = over.id; // Droppable ID = status name

    // Update di database
    await updateOrderStatus(orderId, newStatus);
    
    // Update local state
    // ... optimistic update
    
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.keys(ORDER_STATUSES).map((status) => (
          <OrderColumn
            key={status}
            status={status}
            orders={orders[status] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <OrderCard order={findOrder(activeId)} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
```

### Droppable Column Component

```typescript
// /src/components/orders/OrderColumn.tsx

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const OrderColumn = ({ status, orders }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border-2 border-dashed p-4
        ${isOver 
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' 
          : 'border-gray-200 dark:border-gray-800'
        }
      `}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-white/90">
          {ORDER_STATUS_COLORS[status].label}
        </h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-xs font-medium">
          {orders.length}
        </span>
      </div>

      {/* Order Cards */}
      <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {orders.map((order) => (
            <DraggableOrderCard key={order.id} order={order} />
          ))}
        </div>
      </SortableContext>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          Drop order here
        </div>
      )}
    </div>
  );
};
```

### Draggable Card Component

```typescript
// /src/components/orders/DraggableOrderCard.tsx

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DraggableOrderCard = ({ order }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-move touch-none"
    >
      <OrderCard order={order} />
    </div>
  );
};
```

### Real-time Update dengan Polling

```typescript
// /src/hooks/useOrderRealtime.ts

export const useOrderRealtime = (merchantId: string, interval = 5000) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    let lastCheckTime = Date.now();

    const fetchOrders = async () => {
      const response = await fetch(`/api/merchant/orders?since=${lastCheckTime}`);
      const data = await response.json();

      if (data.success) {
        const newOrders = data.data;
        
        // Count new orders
        const newCount = newOrders.filter(
          order => new Date(order.createdAt).getTime() > lastCheckTime
        ).length;

        if (newCount > 0) {
          setNewOrderCount(prev => prev + newCount);
          // Play sound notification
          playNotificationSound();
        }

        setOrders(newOrders);
        lastCheckTime = Date.now();
      }
    };

    // Initial fetch
    fetchOrders();

    // Setup interval
    const intervalId = setInterval(fetchOrders, interval);

    return () => clearInterval(intervalId);
  }, [merchantId, interval]);

  return { orders, newOrderCount };
};
```

---

## 9. Order Flow & State Management

### Order Status Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    ORDER STATUS FLOW                         │
└─────────────────────────────────────────────────────────────┘

  Customer        →  PENDING (Order masuk ke sistem)
                           ↓
  Kasir/Admin     →  ACCEPTED (Konfirmasi & generate payment code)
                           ↓
  Dapur           →  IN_PROGRESS (Mulai memasak)
                           ↓
  Dapur           →  READY (Siap diambil/diantarkan)
                           ↓
  Kasir           →  COMPLETED (Sudah bayar & selesai)

  Any Status      →  CANCELLED (Batal karena alasan tertentu)
```

### Business Rules untuk Status Transition

```typescript
// /src/lib/utils/orderStatusRules.ts

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Final state - tidak bisa diubah
  CANCELLED: [], // Final state - tidak bisa diubah
};

export const canTransitionStatus = (
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean => {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
};

export const getNextPossibleStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
};
```

### Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     PAYMENT FLOW                             │
└─────────────────────────────────────────────────────────────┘

1. ORDER PLACED (Status: PENDING, Payment: null)
   ↓
2. ORDER ACCEPTED
   - orderNumber sudah ada saat order dibuat
   - Create Payment record dengan status PENDING
   - Display orderNumber to customer (untuk bayar di kasir)
   - QR code berisi orderNumber (untuk scan)
   ↓
3. CUSTOMER BAYAR DI KASIR
   - Kasir input orderNumber atau scan QR
   - Verifikasi order berdasarkan orderNumber
   - Pilih payment method (CASH_ON_COUNTER / CARD_ON_COUNTER)
   - Konfirmasi pembayaran
   ↓
4. PAYMENT RECORDED
   - Update Payment record:
     * status: PENDING → COMPLETED
     * paidAt: current timestamp
     * paidByUserId: staff yang terima pembayaran
   ↓
5. ORDER COMPLETION
   - Status → COMPLETED
   - completedAt: timestamp
   - Print receipt (optional)
```

**KEY CHANGES:**
- ❌ TIDAK ada payment code terpisah
- ✅ Gunakan `orderNumber` yang sudah ada untuk payment verification
- ✅ QR code berisi `orderNumber` saja
- ✅ Lebih simple, tidak perlu generate kode tambahan

**Database Design Benefits:**
- ✅ **Single Source of Truth** - Payment data hanya di table `Payment`
- ✅ **Easy to Query** - `order.payment.status` langsung bisa akses status payment
- ✅ **No Duplication** - Tidak ada data duplikat antara Order & Payment
- ✅ **Future-Ready** - Mudah extend untuk payment gateway
- ✅ **Audit Trail** - Semua perubahan payment ter-track di timestamps

### State Management Options

#### **Option 1: React Context (Simple)**
```typescript
// /src/context/OrderContext.tsx

interface OrderContextValue {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  recordPayment: (orderId: string, payment: PaymentData) => Promise<void>;
}
```

#### **Option 2: Zustand (Recommended)**
```typescript
// /src/store/orderStore.ts

import create from 'zustand';

interface OrderStore {
  orders: Order[];
  selectedOrder: Order | null;
  
  // Actions
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  setSelectedOrder: (order: Order | null) => void;
  
  // Async actions
  fetchOrders: () => Promise<void>;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
}

const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  selectedOrder: null,
  
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({ 
    orders: [order, ...state.orders] 
  })),
  updateOrder: (id, updates) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  
  fetchOrders: async () => {
    // Implementation
  },
  updateStatus: async (id, status) => {
    // Implementation
  },
}));
```

---

## 10. Payment Integration (Future-Ready)

### Database Schema Sudah Siap

Dengan field-field yang disarankan di Section 2, database sudah siap untuk:
- Payment gateway integration
- Multiple payment methods
- Transaction history
- Refund management

### Payment Method Evolution

**Fase 1: Sekarang (Manual Payment)**
```typescript
// Create Payment record saat order accepted
const payment = await prisma.payment.create({
  data: {
    orderId: order.id,
    amount: order.totalAmount,
    paymentMethod: 'CASH_ON_COUNTER',
    status: 'PENDING',
  },
});

// Update saat customer bayar di kasir
// Kasir input/scan orderNumber untuk verifikasi
const order = await prisma.order.findFirst({
  where: { 
    orderNumber: inputOrderNumber,
    merchantId: merchantId 
  },
});

await prisma.payment.update({
  where: { orderId: order.id },
  data: {
    status: 'COMPLETED',
    paidAt: new Date(),
    paidByUserId: staffUserId,
  },
});
```

**Fase 2: Future (Payment Gateway)**
```typescript
// Initiate payment gateway
const payment = await prisma.payment.create({
  data: {
    orderId: order.id,
    amount: order.totalAmount,
    paymentMethod: 'E_WALLET', // atau QRIS, BANK_TRANSFER
    status: 'PENDING',
    gatewayProvider: 'midtrans',
    gatewayTransactionId: 'TRX-xxx',
  },
});

// Auto-update via webhook dari payment gateway
await prisma.payment.update({
  where: { orderId: order.id },
  data: {
    status: 'COMPLETED',
    gatewayStatus: 'settlement',
    gatewayResponse: webhookData,
    gatewayCallbackAt: new Date(),
  },
});
```

### Integration Points (Future)

**Payment Gateway Options untuk Indonesia/Australia:**
- **Midtrans** (Indonesia) - E-wallet, Bank Transfer, QRIS
- **Xendit** (Indonesia/SEA) - Comprehensive payment
- **Stripe** (Australia/Global) - Card payments
- **PayPal** - International
- **Square** - POS integration

**Webhook Endpoint Structure (Future):**
```
POST /api/webhooks/payment/midtrans
POST /api/webhooks/payment/stripe
POST /api/webhooks/payment/xendit

// Handle payment status updates
// Update Order.isPaid automatically
```

---

## 11. Best Practices untuk POS System

### 11.1 Performance Optimization

**✅ DO:**
- Lazy load order history (infinite scroll)
- Paginate table view (20-50 items per page)
- Debounce search input
- Use React.memo() untuk OrderCard component
- Virtualize long lists (react-window)
- Optimize images (Next.js Image component)

**❌ DON'T:**
- Load semua order history di awal
- Refresh terlalu sering (<3 detik)
- Re-render semua cards saat 1 order update

### 11.2 User Experience

**Keyboard Shortcuts:**
```
F1  - Refresh orders
F2  - Focus search
F5  - Toggle fullscreen (kitchen display)
Esc - Close modal
Space - Quick action pada selected order
```

**Touch Gestures (Tablet):**
```
Swipe Right - Accept order
Swipe Left  - Cancel order
Long Press  - Show quick menu
Pull Down   - Refresh
```

### 11.3 Error Handling

**Network Failures:**
```typescript
// Retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Offline indicator
if (!navigator.onLine) {
  showToast('You are offline. Changes will sync when online.', 'warning');
}

// Optimistic updates with rollback
try {
  // Update UI immediately
  updateLocalState(newData);
  
  // Send to server
  await api.updateOrder(data);
} catch (error) {
  // Rollback on failure
  revertLocalState();
  showToast('Failed to update. Please try again.', 'error');
}
```

### 11.4 Accessibility

**WCAG Compliance:**
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Focus indicators
- ✅ Alt text untuk icons
- ✅ ARIA labels

**Example:**
```tsx
<button
  aria-label={`Accept order ${orderNumber}`}
  onClick={handleAccept}
  className="..."
>
  Accept
</button>
```

### 11.5 Print Functionality

**Receipt Printing:**
```typescript
// /src/lib/utils/printReceipt.ts

export const printReceipt = (order: Order) => {
  const receiptContent = generateReceiptHTML(order);
  
  const printWindow = window.open('', '_blank');
  printWindow?.document.write(receiptContent);
  printWindow?.document.close();
  printWindow?.print();
  printWindow?.close();
};

// Thermal printer support (ESC/POS commands)
export const printToThermalPrinter = async (order: Order) => {
  // Integrate dengan printer API
  // Contoh: Star Micronics, Epson TM-T88
};
```

### 11.6 Audio Notifications

**Sound Alerts:**
```typescript
// /src/lib/utils/soundNotification.ts

const NOTIFICATION_SOUNDS = {
  newOrder: '/sounds/new-order.mp3',
  orderReady: '/sounds/order-ready.mp3',
  payment: '/sounds/payment.mp3',
};

export const playNotificationSound = (type: keyof typeof NOTIFICATION_SOUNDS) => {
  const audio = new Audio(NOTIFICATION_SOUNDS[type]);
  audio.volume = 0.5; // 50% volume
  audio.play().catch(err => console.log('Sound play failed:', err));
};

// Settings untuk enable/disable
export const useNotificationSettings = () => {
  const [enabled, setEnabled] = useLocalStorage('sound-notifications', true);
  return { enabled, setEnabled };
};
```

---

## 12. API Endpoints yang Diperlukan

### 12.1 Order Management Endpoints

```typescript
// ===== GET ORDERS =====

/**
 * GET /api/merchant/orders
 * Get all orders for merchant (dengan filter & pagination)
 */
Query Params:
  - status?: OrderStatus
  - paymentStatus?: PaymentStatus  // Filter by payment status
  - orderType?: 'DINE_IN' | 'TAKEAWAY'
  - startDate?: string (ISO date)
  - endDate?: string (ISO date)
  - page?: number
  - limit?: number
  - since?: timestamp (untuk real-time polling)

Response: {
  success: true,
  data: Order[] (with payment relation),
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
  }
}

/**
 * GET /api/merchant/orders/[orderId]
 * Get single order with full details
 */
Response: {
  success: true,
  data: {
    ...order,
    payment: Payment,
    items: OrderItem[],
    statusHistory: OrderStatusHistory[],
  }
}

/**
 * GET /api/merchant/orders/active
 * Get only active orders (not COMPLETED or CANCELLED)
 */
Response: {
  success: true,
  data: Order[]
}

// ===== UPDATE ORDER =====

/**
 * PUT /api/merchant/orders/[orderId]/status
 * Update order status
 */
Body: {
  status: OrderStatus,
  note?: string
}

Response: {
  success: true,
  data: Order,
  message: 'Order status updated to ACCEPTED'
}

/**
 * POST /api/merchant/orders/[orderId]/payment
 * Record payment (create or update Payment record)
 */
Body: {
  paymentMethod: PaymentMethod,
  amount: number,
  note?: string
}

Response: {
  success: true,
  data: {
    order: Order,
    payment: Payment
  }
}

/**
 * POST /api/merchant/orders/[orderId]/cancel
 * Cancel order
 */
Body: {
  reason: string
}

Response: {
  success: true,
  data: Order
}

// ===== PAYMENT VERIFICATION =====

/**
 * GET /api/merchant/payment/verify/[orderNumber]
 * Verify orderNumber & get order dengan payment data
 */
Query: orderNumber (string)

Response: {
  success: true,
  data: {
    order: Order,
    payment: Payment,
    customer: {
      name: string,
      phone: string,
      email: string
    }
  }
}

// NOTES:
// - TIDAK ada endpoint generate payment code (tidak perlu)
// - orderNumber sudah ada saat order dibuat
// - QR code berisi orderNumber saja

// ===== ANALYTICS =====

/**
 * GET /api/merchant/orders/stats
 * Get order statistics
 */
Query Params:
  - startDate?: string
  - endDate?: string

Response: {
  success: true,
  data: {
    totalOrders: number,
    ordersByStatus: { [status]: count },
    ordersByType: { [type]: count },
    paymentStats: {
      totalRevenue: number,
      completedPayments: number,
      pendingPayments: number,
      byMethod: { [method]: { count, amount } }
    },
    averageOrderValue: number,
    popularItems: MenuItem[]
  }
}
```

### 12.2 Implementation Example

**Service Layer:**

```typescript
// /src/lib/services/OrderService.ts

export class OrderService {
  /**
   * Fetch merchant orders with filters
   */
  static async getOrders(
    merchantId: bigint,
    filters: OrderFilters
  ): Promise<Order[]> {
    const where: Prisma.OrderWhereInput = {
      merchantId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by payment status
    if (filters.paymentStatus) {
      where.payment = {
        status: filters.paymentStatus,
      };
    }

    if (filters.orderType) {
      where.orderType = filters.orderType;
    }

    if (filters.startDate || filters.endDate) {
      where.placedAt = {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      };
    }

    // For real-time polling
    if (filters.since) {
      where.updatedAt = {
        gte: new Date(filters.since),
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        payment: true, // Include payment data
        orderItems: {
          include: {
            addons: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
      ...(filters.limit && {
        take: filters.limit,
        skip: ((filters.page || 1) - 1) * filters.limit,
      }),
    });

    return orders;
  }

  /**
   * Update order status
   */
  static async updateStatus(
    orderId: bigint,
    newStatus: OrderStatus,
    userId: bigint,
    note?: string
  ): Promise<Order> {
    // Validate status transition
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!canTransitionStatus(order.status, newStatus)) {
      throw new Error(`Cannot change status from ${order.status} to ${newStatus}`);
    }

    // Update order in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
          ...(newStatus === 'CANCELLED' && { cancelledAt: new Date() }),
          ...(newStatus === 'READY' && { actualReadyAt: new Date() }),
        },
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: newStatus,
          changedByUserId: userId,
          note,
        },
      });

      return updatedOrder;
    });

    return updated;
  }

  /**
   * Verify order by orderNumber (untuk payment di kasir)
   */
  static async verifyOrderNumber(
    orderNumber: string,
    merchantId: bigint
  ): Promise<Order | null> {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        merchantId,
      },
      include: {
        payment: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        orderItems: {
          include: {
            addons: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * Record payment (create or update Payment record)
   */
  static async recordPayment(
    orderId: bigint,
    paymentData: {
      method: PaymentMethod;
      amount: number;
      userId: bigint;
      note?: string;
    }
  ): Promise<{ order: Order; payment: Payment }> {
    const result = await prisma.$transaction(async (tx) => {
      // Check if payment already exists
      const existingPayment = await tx.payment.findUnique({
        where: { orderId },
      });

      let payment: Payment;

      if (existingPayment) {
        // Update existing payment
        payment = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'COMPLETED',
            paymentMethod: paymentData.method,
            paidAt: new Date(),
            paidByUserId: paymentData.userId,
            notes: paymentData.note,
          },
        });
      } else {
        // Create new payment record
        payment = await tx.payment.create({
          data: {
            orderId,
            amount: paymentData.amount,
            paymentMethod: paymentData.method,
            status: 'COMPLETED',
            paidAt: new Date(),
            paidByUserId: paymentData.userId,
            notes: paymentData.note,
          },
        });
      }

      // Get updated order with payment
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
        },
      });

      return { order: order!, payment };
    });

    return result;
  }
}
```

**API Route:**

```typescript
// /src/app/api/merchant/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { OrderService } from '@/lib/services/OrderService';
import { serializeBigInt } from '@/lib/utils/serializer';

export const GET = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { merchantId } = authContext;
    const { searchParams } = new URL(req.url);

    const filters = {
      status: searchParams.get('status') as OrderStatus | undefined,
      paymentStatus: searchParams.get('paymentStatus') as PaymentStatus | undefined,
      orderType: searchParams.get('orderType') as OrderType | undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      since: searchParams.get('since') ? parseInt(searchParams.get('since')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    };

    const orders = await OrderService.getOrders(merchantId, filters);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(orders),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
});
```

---

## 13. Implementasi Roadmap

### Phase 1: Foundation (Week 1-2)

**Database:**
- [ ] Update Prisma schema dengan field payment
- [ ] Run `npx prisma db push`
- [ ] Update seed data

**API Endpoints:**
- [ ] GET /api/merchant/orders (dengan filters)
- [ ] GET /api/merchant/orders/[id]
- [ ] PUT /api/merchant/orders/[id]/status
- [ ] POST /api/merchant/orders/[id]/payment-code
- [ ] PUT /api/merchant/orders/[id]/payment

**Services:**
- [ ] OrderService.ts (business logic)
- [ ] PaymentService.ts (payment logic)

### Phase 2: Basic UI (Week 3-4)

**Components:**
- [ ] OrderCard (compact display)
- [ ] OrderDetailModal (full info)
- [ ] OrderStatusBadge (visual status)
- [ ] PaymentStatusBadge
- [ ] OrderItemList (items with addons)

**Pages:**
- [ ] /admin/dashboard/orders (table view)
- [ ] /admin/dashboard/orders/[id] (detail page)

**Features:**
- [ ] Filter by status
- [ ] Search by order number/customer
- [ ] View order details
- [ ] Update status (dropdown)
- [ ] Record payment

### Phase 3: Kanban Board (Week 5-6)

**Components:**
- [ ] OrderKanbanBoard (main layout)
- [ ] OrderColumn (droppable area)
- [ ] DraggableOrderCard (draggable card)

**Features:**
- [ ] Drag & drop status update
- [ ] Real-time auto-refresh (polling every 10s)
- [ ] Sound notification
- [ ] Badge counters per status
- [ ] Optimistic updates

**Libraries:**
- [ ] Install @dnd-kit/core
- [ ] Install @dnd-kit/sortable
- [ ] Setup drag & drop handlers

### Phase 4: Kitchen Display (Week 7)

**Components:**
- [ ] KitchenOrderCard (large display)
- [ ] KitchenBoard (fullscreen layout)
- [ ] OrderTimer (cooking timer)

**Features:**
- [ ] Fullscreen mode
- [ ] Large text untuk visibility
- [ ] Filter: hanya ACCEPTED & IN_PROGRESS
- [ ] Auto-scroll untuk order baru
- [ ] Simple action buttons

### Phase 5: Payment Management (Week 8)

**Components:**
- [ ] OrderNumberDisplay (show orderNumber untuk payment)
- [ ] PaymentRecordForm
- [ ] QRCodeDisplay (QR berisi orderNumber)

**Features:**
- [ ] Display orderNumber untuk payment reference
- [ ] Generate QR code dari orderNumber
- [ ] Verify orderNumber untuk payment
- [ ] Record payment dengan method
- [ ] Payment timestamp tracking (paidAt, paidBy)
- [ ] Print payment slip

**REMOVED:**
- ❌ Generate payment code terpisah (gunakan orderNumber)
- ❌ Payment history timeline (OrderStatusHistory tidak perlu)

### Phase 6: Analytics & History (Week 9-10)

**Components:**
- [ ] OrderHistoryTable
- [ ] OrderStatsCards
- [ ] OrderCharts (revenue, popular items)

**Features:**
- [ ] Date range filter
- [ ] Export to CSV/Excel
- [ ] Order statistics
- [ ] Revenue tracking
- [ ] Popular items report

### Phase 7: Polish & Optimization (Week 11-12)

**Performance:**
- [ ] Implement virtualization untuk long lists
- [ ] Optimize re-renders (React.memo)
- [ ] Lazy load history
- [ ] Image optimization

**UX Improvements:**
- [ ] Keyboard shortcuts
- [ ] Touch gestures (tablet)
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Offline indicator

**Testing:**
- [ ] Unit tests untuk services
- [ ] Component tests
- [ ] E2E tests untuk critical flows
- [ ] Performance testing

---

## 📚 Referensi & Resources

### Design Inspiration
- Square POS: https://squareup.com/us/en/point-of-sale
- Toast POS: https://pos.toasttab.com
- Shopify POS: https://www.shopify.com/pos

### Libraries
- @dnd-kit: https://dndkit.com
- Zustand: https://github.com/pmndrs/zustand
- React Window: https://react-window.vercel.app

### Color System
- Referensi: `/admin/dashboard/revenue` page
- Design tokens: `/src/lib/design-system.ts`

### Icons
- Custom icons: `/src/icons/index.tsx`
- React Icons (Font Awesome): https://react-icons.github.io/react-icons/icons/fa

---

## 🎯 Summary - Checklist Implementasi

### Must Have (Priority 1):
- ✅ Database update dengan payment fields
- ✅ Basic API endpoints (CRUD orders)
- ✅ Table view untuk order list
- ✅ Order detail modal
- ✅ Update status functionality
- ✅ Payment code generation
- ✅ Payment recording

### Should Have (Priority 2):
- ✅ Kanban board dengan drag & drop
- ✅ Real-time updates (polling)
- ✅ Sound notifications
- ✅ Kitchen display system
- ✅ Order history & filters
- ✅ Basic analytics

### Nice to Have (Priority 3):
- ⭐ WebSocket untuk real-time (alternative polling)
- ⭐ Advanced analytics & charts
- ⭐ Bulk actions
- ⭐ Export reports
- ⭐ Print integration
- ⭐ Mobile app companion

---

## 💡 Tips Implementasi

1. **Mulai dari Simple**: Implementasi table view dulu, baru kanban
2. **Incremental Development**: Jangan langsung semua fitur
3. **Test di Real Device**: Coba di tablet/iPad untuk POS use case
4. **Get Feedback Early**: Test dengan user (kasir/admin) sesegera mungkin
5. **Performance First**: Monitor performance dari awal
6. **Accessibility Matter**: Jangan skip keyboard navigation & screen reader
7. **Error Handling**: Selalu handle network failures & edge cases
8. **Documentation**: Document API endpoints & components

---

**Versi:** 2.0 (Updated with Database Best Practices)
**Tanggal:** 17 November 2025  
**Author:** Professional UI/UX & Frontend Expert + Database Architect  
**Status:** Ready for Implementation

**Changelog:**
- v1.0 (17 Nov 2025) - Initial comprehensive guide
- v2.0 (17 Nov 2025) - **MAJOR UPDATE**: Fixed database design
  - ✅ Removed data duplication (no more payment fields in Order)
  - ✅ Added separate Payment table (1:1 relation)
  - ✅ Implemented database normalization (3NF)
  - ✅ Added best practices & design patterns
  - ✅ Future-ready for payment gateway

---

## 🚀 Next Steps

1. ✅ Review dokumen ini dengan team
2. ✅ Approve database changes
3. ✅ Start Phase 1 implementation
4. ✅ Setup development environment
5. ✅ Create GitHub issues untuk tracking
6. ✅ Begin coding! 🎉
