# 🌐 GENFITY Dual-Mode Platform

## Restaurant + Catalog (Simplified)

**Document Created:** December 26, 2025  
**Project:** GENFITY Dual-Mode  
**Vision:** Platform sederhana dengan 2 mode - Restaurant & Catalog

---

## 📋 Konsep Sederhana

### Hanya 2 Tipe Merchant:

| Mode | Deskripsi | Alamat |
|------|-----------|--------|
| 🍔 **Restaurant** | Makanan & minuman | ❌ Tidak perlu |
| 🛒 **Catalog** | Produk umum (seperti Shopee) | 🔄 Opsional |

### Mengapa Simplified?
- ✅ Lebih mudah dipahami user
- ✅ Development lebih cepat
- ✅ UI/UX konsisten
- ✅ Code reuse maksimal

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GENFITY PLATFORM                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│      ┌──────────────┐         ┌──────────────┐          │
│      │  🍔 RESTO    │         │  🛒 CATALOG  │          │
│      │              │         │              │          │
│      │ - Menu       │         │ - Products   │          │
│      │ - Addons     │         │ - Variants   │          │
│      │ - Table      │         │ - Alamat?    │          │
│      │ - Dine/Take  │         │ - Shipping?  │          │
│      └──────┬───────┘         └──────┬───────┘          │
│             │                        │                   │
│      ┌──────┴────────────────────────┴───────┐          │
│      │         UNIFIED ORDER SYSTEM           │          │
│      │   (Same checkout, payment, tracking)   │          │
│      └────────────────────────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Perbandingan 2 Mode

### 🍔 Restaurant (Existing - Tidak Berubah)

```
Features yang sudah ada:
✅ Menu dengan kategori
✅ Addon/topping system  
✅ Dine-in & Takeaway
✅ Table selection
✅ Kitchen display
✅ Stock harian
✅ Order management

Checkout Fields:
├── Nama ✅ (wajib)
├── Phone ✅ (wajib)
├── Table (jika Dine-in)
├── Notes
└── Alamat ❌ (tidak perlu)

Order Flow:
Pilih Menu → Tambah Addon → Cart → Checkout → Bayar → Kitchen → Ready
```

### 🛒 Catalog (Baru - Mirip Existing)

```
Features baru:
✅ Products dengan kategori (mirip Menu)
✅ Variant system (Size, Color, dll) - ganti Addon
✅ Stock management (sama seperti Menu)
✅ Alamat pengiriman (OPSIONAL)
❌ Table selection (tidak ada)
❌ Kitchen display (tidak ada)

Checkout Fields:
├── Nama ✅ (wajib)
├── Phone ✅ (wajib)
├── Alamat 🔄 (opsional - merchant bisa on/off)
├── Shipping method (jika alamat aktif)
└── Notes

Order Flow:
Pilih Product → Pilih Variant → Cart → Checkout → Bayar → Process → Done/Shipped
```

---

## 📊 Feature Matrix

| Fitur | 🍔 Resto | 🛒 Catalog | Notes |
|-------|----------|------------|-------|
| Kategori produk | ✅ | ✅ | Sama |
| Stock tracking | ✅ | ✅ | Sama |
| Gambar produk | ✅ | ✅ | Sama |
| Harga | ✅ | ✅ | Sama |
| **Addon system** | ✅ | ❌ | Resto only |
| **Variant (size/color)** | ❌ | ✅ | Catalog only |
| **Table selection** | ✅ | ❌ | Resto only |
| **Dine-in/Takeaway** | ✅ | ❌ | Resto only |
| **Alamat pengiriman** | ❌ | 🔄 | Catalog (opsional) |
| **Shipping method** | ❌ | 🔄 | Catalog (opsional) |
| Kitchen display | ✅ | ❌ | Resto only |
| Order tracking | ✅ | ✅ | Sama |
| Payment | ✅ | ✅ | Sama |

---

## 🎨 UI/UX Flow - Side by Side

### Customer Storefront

**🍔 Restaurant (Existing)**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Warung Makan ABC       [🛒 Cart]        │
├─────────────────────────────────────────────────┤
│  [Dine-In] [Takeaway]   Table: [___]           │
├─────────────────────────────────────────────────┤
│  [All] [Makanan] [Minuman] [Snack]              │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  🍕     │ │  🍔     │ │  🍜     │           │
│  │ Pizza   │ │ Burger  │ │ Mie     │           │
│  │ Rp 50K  │ │ Rp 35K  │ │ Rp 25K  │           │
│  │ [+Add]  │ │ [+Add]  │ │ [+Add]  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
```

**🛒 Catalog (Baru - Mirip)**
```
┌─────────────────────────────────────────────────┐
│  [Logo] Toko Fashion XYZ       [🛒 Cart]        │
├─────────────────────────────────────────────────┤
│  ❌ (Tidak ada Dine-In/Takeaway/Table)          │
├─────────────────────────────────────────────────┤
│  [All] [Baju] [Celana] [Aksesoris]              │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  👕     │ │  👖     │ │  🧢     │           │
│  │ Kaos   │ │ Jeans   │ │ Topi    │           │
│  │ Rp 75K  │ │ Rp 150K │ │ Rp 50K  │           │
│  │ 3 warna │ │ 4 size  │ │ 2 warna │           │
│  │ [+Add]  │ │ [+Add]  │ │ [+Add]  │           │
│  └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────┘
```

### Product Detail

**🍔 Restaurant - Menu Detail (Existing)**
```
┌─────────────────────────────────────────────────┐
│  ← Back                                         │
├─────────────────────────────────────────────────┤
│  [🍔 Gambar Burger]                            │
│                                                 │
│  Burger Spesial                                 │
│  Rp 35.000                                     │
│                                                 │
│  Deskripsi burger yang lezat...                │
├─────────────────────────────────────────────────┤
│  ADDON (Pilihan Tambahan)                       │
│  ┌─────────────────────────────────────────┐   │
│  │ Extra Cheese        + Rp 5.000    [☐]  │   │
│  │ Extra Patty         + Rp 15.000   [☐]  │   │
│  │ Bacon               + Rp 10.000   [☐]  │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Quantity: [−] 1 [+]                           │
│                                                 │
│  [Add to Cart - Rp 35.000]                     │
└─────────────────────────────────────────────────┘
```

**🛒 Catalog - Product Detail (Baru)**
```
┌─────────────────────────────────────────────────┐
│  ← Back                                         │
├─────────────────────────────────────────────────┤
│  [👕 Gambar Kaos]                              │
│                                                 │
│  Kaos Premium Cotton                           │
│  Rp 75.000                                     │
│                                                 │
│  Kaos dengan bahan premium...                  │
├─────────────────────────────────────────────────┤
│  VARIANT (Pilih Varian)                         │
│  ┌─────────────────────────────────────────┐   │
│  │ Warna:  [⚫] [⚪] [🔵] [🔴]             │   │
│  │                                          │   │
│  │ Size:   [S] [M] [L] [XL]                │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Quantity: [−] 1 [+]                           │
│                                                 │
│  [Add to Cart - Rp 75.000]                     │
└─────────────────────────────────────────────────┘
```

### Checkout Flow

**🍔 Restaurant Checkout (Existing)**
```
┌─────────────────────────────────────────────────┐
│  Checkout                                       │
├─────────────────────────────────────────────────┤
│  Order Type: [Dine-In ▼]                       │
│  Table: [A5 ▼]                                 │
├─────────────────────────────────────────────────┤
│  Nama: [________________]                      │
│  Phone: [________________]                     │
│  Notes: [________________]                     │
├─────────────────────────────────────────────────┤
│  Order Summary:                                 │
│  • Burger x1                    Rp 35.000      │
│    + Extra Cheese               Rp 5.000       │
│  • Pizza x2                     Rp 100.000     │
│  ─────────────────────────────────────         │
│  Total:                         Rp 140.000     │
├─────────────────────────────────────────────────┤
│  Payment: [Cash] [Card] [QRIS]                 │
│                                                 │
│  [Place Order]                                  │
└─────────────────────────────────────────────────┘
```

**🛒 Catalog Checkout (Baru - Mirip + Alamat)**
```
┌─────────────────────────────────────────────────┐
│  Checkout                                       │
├─────────────────────────────────────────────────┤
│  ❌ (Tidak ada Order Type / Table)              │
├─────────────────────────────────────────────────┤
│  Nama: [________________]                      │
│  Phone: [________________]                     │
│  Notes: [________________]                     │
├─────────────────────────────────────────────────┤
│  📦 Alamat Pengiriman (Jika merchant aktifkan) │
│  ┌─────────────────────────────────────────┐   │
│  │ Alamat: [_____________________________] │   │
│  │ Kota:   [_____________]                 │   │
│  │ Kode Pos: [______]                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🚚 Metode Pengiriman (Jika alamat aktif)      │
│  ○ Ambil Sendiri (Pickup) - Gratis             │
│  ● Kurir/Dikirim - Rp 15.000                   │
├─────────────────────────────────────────────────┤
│  Order Summary:                                 │
│  • Kaos (Hitam, L) x1           Rp 75.000      │
│  • Topi (Merah) x2              Rp 100.000     │
│  ─────────────────────────────────────         │
│  Subtotal:                      Rp 175.000     │
│  Shipping:                      Rp 15.000      │
│  ─────────────────────────────────────         │
│  Total:                         Rp 190.000     │
├─────────────────────────────────────────────────┤
│  Payment: [Transfer] [E-Wallet] [QRIS]         │
│                                                 │
│  [Place Order]                                  │
└─────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Changes (Minimal)

### 1. Merchant Table - Tambah Type & Config

```prisma
// Tambah ke model Merchant
model Merchant {
  // ... existing fields
  
  // NEW: Merchant Type
  type                  MerchantType  @default(RESTAURANT)
  
  // NEW: Checkout Config (untuk Catalog)
  requiresAddress       Boolean       @default(false) @map("requires_address")
  
  // NEW: Shipping Config (optional)
  shippingFee           Decimal?      @map("shipping_fee") @db.Decimal(12, 2)
  enablePickup          Boolean       @default(true) @map("enable_pickup")
  enableDelivery        Boolean       @default(false) @map("enable_delivery")
}

enum MerchantType {
  RESTAURANT    // Existing - makanan
  CATALOG       // New - produk umum
}
```

### 2. Product Table - Extend Menu

```prisma
// Bisa extend Menu table atau buat baru
// Opsi 1: Extend Menu (recommended - minimal change)

model Menu {
  // ... existing fields
  
  // NEW: For Catalog variants
  hasVariants       Boolean   @default(false) @map("has_variants")
  
  // Relations
  variants          MenuVariant[]  // NEW
}

// NEW: Variant table (pengganti Addon untuk Catalog)
model MenuVariant {
  id              BigInt    @id @default(autoincrement())
  menuId          BigInt    @map("menu_id")
  
  // Variant options
  name            String    // "Hitam - L", "Merah - M"
  optionType      String?   // "Color", "Size"
  optionValue     String?   // "Hitam", "L"
  
  // Price adjustment (optional)
  priceAdjustment Decimal   @default(0) @map("price_adjustment") @db.Decimal(12, 2)
  
  // Stock per variant
  stockQty        Int?      @map("stock_qty")
  
  isActive        Boolean   @default(true) @map("is_active")
  sortOrder       Int       @default(0) @map("sort_order")
  
  menu            Menu      @relation(fields: [menuId], references: [id])
  
  @@index([menuId])
  @@map("menu_variants")
}
```

### 3. Order Table - Tambah Shipping Info

```prisma
model Order {
  // ... existing fields
  
  // NEW: Shipping info (untuk Catalog)
  shippingAddress     String?   @map("shipping_address")
  shippingCity        String?   @map("shipping_city")
  shippingPostalCode  String?   @map("shipping_postal_code")
  shippingMethod      String?   @map("shipping_method") // "PICKUP", "DELIVERY"
  shippingCost        Decimal   @default(0) @map("shipping_cost") @db.Decimal(12, 2)
}
```

### 4. OrderItem - Tambah Variant Info

```prisma
model OrderItem {
  // ... existing fields
  
  // NEW: Variant info (untuk Catalog)
  variantId         BigInt?   @map("variant_id")
  variantName       String?   @map("variant_name") // Snapshot
}
```

---

## 🔧 Merchant Dashboard Settings

### Store Type Selection (One-time setup)

```
┌─────────────────────────────────────────────────┐
│  Store Settings                                 │
├─────────────────────────────────────────────────┤
│  Store Type                                     │
│  ┌─────────────────────────────────────────┐   │
│  │ ● 🍔 Restaurant                         │   │
│  │   Untuk cafe, restoran, warung makan    │   │
│  │   - Ada pilihan Dine-In / Takeaway      │   │
│  │   - Ada sistem addon/topping            │   │
│  │   - Ada kitchen display                 │   │
│  │                                          │   │
│  │ ○ 🛒 Catalog                            │   │
│  │   Untuk toko online, fashion, merch     │   │
│  │   - Ada sistem variant (size, color)    │   │
│  │   - Alamat pengiriman (bisa on/off)     │   │
│  │   - Bisa pickup atau kirim              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ⚠️ Tipe toko tidak bisa diubah setelah ada   │
│     order masuk                                 │
│                                                 │
│  [Save]                                         │
└─────────────────────────────────────────────────┘
```

### Catalog-Specific Settings

```
┌─────────────────────────────────────────────────┐
│  Delivery Settings (Catalog Only)               │
├─────────────────────────────────────────────────┤
│                                                 │
│  📦 Alamat Pengiriman                           │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Wajibkan alamat saat checkout          │   │
│  │   (Customer harus isi alamat)            │   │
│  │                                          │   │
│  │ Jika dicentang:                          │   │
│  │ ☑ Izinkan Pickup (ambil sendiri)        │   │
│  │ ☑ Izinkan Delivery (dikirim)            │   │
│  │                                          │   │
│  │ Ongkir Flat: [Rp 15.000    ]            │   │
│  │ (atau kosongkan jika gratis/nego)        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Save Settings]                                │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan (Simplified)

### Phase 1: Database & Backend (2 minggu)
```
Week 1:
- [ ] Add MerchantType enum to schema
- [ ] Add requiresAddress, shipping config to Merchant
- [ ] Create MenuVariant table
- [ ] Add shipping fields to Order
- [ ] Run prisma db push

Week 2:
- [ ] Update Merchant API (type selection)
- [ ] Create Variant CRUD API
- [ ] Update Order API (shipping info)
- [ ] Update checkout API (conditional fields)
```

### Phase 2: Merchant Dashboard (2 minggu)
```
Week 3:
- [ ] Store Type selector in settings
- [ ] Delivery settings page (Catalog)
- [ ] Variant management UI (like Addon)
- [ ] Conditional menu based on type

Week 4:
- [ ] Order list - show shipping info
- [ ] Order detail - shipping section
- [ ] Dashboard stats per type
```

### Phase 3: Customer Storefront (2 minggu)
```
Week 5:
- [ ] Conditional UI based on merchant type
- [ ] Variant selector (replace addon for Catalog)
- [ ] Checkout - conditional address form
- [ ] Shipping method selector

Week 6:
- [ ] Testing all flows
- [ ] Edge cases handling
- [ ] Polish UI/UX
```

### Total Timeline: ~6 minggu (1.5 bulan)

---

## 📱 API Endpoints (New/Modified)

### Merchant Settings
```
GET  /api/merchant/settings
PUT  /api/merchant/settings
     Body: { type, requiresAddress, shippingFee, enablePickup, enableDelivery }
```

### Variants (Catalog)
```
GET    /api/merchant/products/:productId/variants
POST   /api/merchant/products/:productId/variants
PUT    /api/merchant/products/:productId/variants/:variantId
DELETE /api/merchant/products/:productId/variants/:variantId
```

### Checkout (Modified)
```
POST /api/customer/checkout
     Body: {
       // Existing
       customerName, customerPhone, notes, items,
       
       // Restaurant only
       orderType, tableNumber,
       
       // Catalog only (conditional)
       shippingAddress?, shippingCity?, shippingPostalCode?,
       shippingMethod? // "PICKUP" | "DELIVERY"
     }
```

### Public Store Info
```
GET /api/public/merchant/:code
    Response: {
      ...merchantInfo,
      type: "RESTAURANT" | "CATALOG",
      requiresAddress: boolean,
      enablePickup: boolean,
      enableDelivery: boolean,
      shippingFee: number
    }
```

---

## ✅ Summary

### Keuntungan Pendekatan Ini:

1. **Simpel** - Hanya 2 tipe, mudah dipahami
2. **Minimal Changes** - Reuse sebagian besar code existing
3. **Cepat** - ~6 minggu development
4. **Konsisten** - UI/UX mirip, user familiar
5. **Fleksibel** - Alamat bisa on/off sesuai kebutuhan

### Yang Perlu Dibuat:

| Component | Effort | Priority |
|-----------|--------|----------|
| Database schema update | Low | 🔴 High |
| Merchant type setting | Low | 🔴 High |
| Variant management | Medium | 🔴 High |
| Conditional checkout | Medium | 🔴 High |
| Shipping settings | Low | 🟡 Medium |
| Customer storefront update | Medium | 🟡 Medium |
| Order list shipping info | Low | 🟢 Low |

### Tidak Perlu Dibuat (Beda dari plan sebelumnya):

- ❌ Digital delivery system
- ❌ License key management
- ❌ Raja Ongkir integration (pakai flat rate dulu)
- ❌ Complex shipping calculation
- ❌ Return/refund system
- ❌ Multiple shipment tracking

---

## 🔮 Future Enhancements (Optional)

Jika sudah berjalan baik, bisa tambah:

1. **Shipping API Integration** - Raja Ongkir untuk kalkulasi ongkir real-time
2. **Multiple Addresses** - Customer simpan beberapa alamat
3. **Tracking Number** - Input resi untuk pelacakan
4. **Digital Products** - Mode ke-3 untuk produk digital

---

*Document Version: 1.0*  
*Last Updated: December 26, 2025*
