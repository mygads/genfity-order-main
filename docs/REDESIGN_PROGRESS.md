# Frontend Redesign Progress - GENFITY Online Ordering

**Based on**: FRONTEND_SPECIFICATION.md (1762 lines)  
**Target**: 40 tasks to align customer pages with mobile-first design specification  
**Started**: 2025-01-XX  
**Status**: ⏳ In Progress (3/40 tasks completed - 7.5%)

---

## ✅ COMPLETED TASKS (3/40)

### Task 1: AUDIT - Gap Analysis ✅
**Status**: Completed  
**Summary**: 
- Analyzed 1762-line FRONTEND_SPECIFICATION.md
- Identified 8 customer pages needing redesign
- Found 5+ new components to create (modals, tabs, etc.)
- Listed ~20 unused (admin) pages to remove

**Key Findings**:
- **Mobile-first**: 375-428px viewport required
- **Color Palette**: Primary #FF6B35, Text #1A1A1A, Border #E0E0E0
- **Typography**: H1 28px/700, H2 20px/700, Body 14px/400
- **Components**: Heights - Header 56px, Button 44-48px, Input 48px
- **Animations**: Modal slide 0.3s, Fade 0.2s, Hover scale

---

### Task 2: PHASE 1A - Landing Page Redesign ✅
**File**: `src/app/page.tsx`  
**Status**: Completed  
**Changes**:
1. **Navbar** (56px height):
   - Logo + "GENFITY" text (left)
   - "Sign In" button with 2px #FF6B35 border (right)
   - Sticky top, white background

2. **Hero Section**:
   - Heading: "Pesan Makanan Favoritmu" (28px/700)
   - Subtext: "dengan mudah dan cepat" (16px/400, #666)
   - Clean, centered layout

3. **Merchant Code Input**:
   - Label: "Kode Merchant" (14px/600)
   - Input: Height 48px, border #E0E0E0, border-radius 8px
   - Submit: "Mulai Pesan" button (48px, #FF6B35)
   - Placeholder: "Masukkan kode merchant"

4. **Features Section**:
   - 3 feature cards with emoji icons (🚀 💳 📱)
   - Background: #FFF5F0 circle for icons
   - Text: 16px/600 title, 14px/400 description

5. **Footer**:
   - Background: #F9F9F9
   - Copyright text (12px, #999)

**Removed**:
- Popular merchants grid
- Search functionality
- Gradients and heavy shadows
- Desktop-specific responsive classes

**Build Status**: ✅ Successful

---

### Task 3: PHASE 1B - Login Page Redesign ✅
**File**: `src/app/login/page.tsx`  
**Status**: Completed  
**Changes**:
1. **Conditional Rendering**:
   - Initial state: "Sudah punya akun?" dialog
   - Two paths: Login or Guest checkout

2. **Auth Choice Dialog**:
   - Question: "Sudah punya akun?" (16px/600)
   - Button 1: "Ya, Login" (48px, #FF6B35, full width)
   - Button 2: "Tidak, Lanjut Tanpa Login" (48px, border 2px #FF6B35, transparent)
   - Info text: Login benefits (12px, #999)

3. **Login Form** (shown after "Ya, Login"):
   - Email input (48px, border #E0E0E0)
   - Password input (48px, border #E0E0E0)
   - "Lupa Kata Sandi?" link (12px, #FF6B35)
   - Name input (optional, for auto-register)
   - Phone input (optional, for auto-register)
   - Submit button: "Lanjutkan" (48px, #FF6B35)
   - Back button: Return to auth choice

4. **Guest Checkout Path**:
   - Clicking "Tidak, Lanjut Tanpa Login" skips to menu/cart
   - Ref parameter preserved for navigation
   - Prompts for user info at payment stage

5. **Auto-register Logic**:
   - If email exists: Login
   - If email new: Auto-create CUSTOMER account
   - Returns accessToken in both cases

**Removed**:
- Direct email/name/phone form
- Gradient background
- Heavy shadows

**Build Status**: ✅ Successful

---

## ⏳ PENDING TASKS (37/40)

### PHASE 2: Merchant Mode Selection (2 tasks)

#### Task 4: PHASE 2A - Merchant Mode Selection Page ⏳
**File**: `src/app/[merchantCode]/page.tsx`  
**Status**: Not Started  
**Required Changes**:
1. **Header**:
   - Back button (top-left, navigate to "/" )
   - Title: Merchant name from API (center)
   - Height: 56px
   - Background: white, border-bottom #E0E0E0

2. **Merchant Info Card**:
   - Image banner: 200px height, full width, object-fit cover
   - Gradient overlay: rgba(0,0,0,0.2) to transparent
   - Name: 20px/700, #1A1A1A, padding 16px
   - Address: 13px/400, #666, max 2 lines ellipsis
   - Phone icon + link: 20x20px icon, tel: link, 13px/400, #999
   - Hours: 13px/400, #999, "Buka 24 Jam" or specific times
   - "Lihat Info Outlet" link: Bottom-right, 13px/600, #FF6B35, chevron icon

3. **Mode Selection Section**:
   - Title: "Pilih Cara Makan" (16px/600, margin 24px 16px)
   - Button 1: "Makan di Tempat"
     - Width: 100%, Height: 56px
     - Background: #FF6B35, Color: white
     - Font: 16px/600
     - Border-radius: 8px
     - Action: → `/[merchantCode]/home?mode=dinein`
     - Loading spinner on click
   
   - Button 2: "Ambil Sendiri"
     - Same styling as Button 1
     - Action: → `/[merchantCode]/home?mode=takeaway`

**Current Implementation**: Has outlet info section but needs redesign to match spec

---

#### Task 5: PHASE 2B - Outlet Information Modal ⏳
**File**: `src/components/modals/OutletModal.tsx` (NEW)  
**Status**: Not Started  
**Trigger**: Hash change to `#outlet` or click "Lihat Info Outlet"  
**Required**:
1. **Bottom Sheet Style**:
   - Slide from bottom animation (0.3s)
   - Drag handle at top (48px width, 4px height, #E0E0E0)
   - Close button (X icon, top-right)
   - Overlay: rgba(0,0,0,0.4), z-index 200

2. **Content**:
   - Outlet name: 20px/700, #1A1A1A
   - Address: 14px/400, #666, line-height 1.5
   - Action buttons row:
     - "Hubungi" (tel: link, 44px, #FF6B35)
     - "Kunjungi" (Google Maps, 44px, border #FF6B35)
   
   - Operating Hours Table:
     - Header: "Jam Operasional" (16px/600)
     - Rows: SENIN-MINGGU
     - Format: "SENIN | 08:00 - 22:00"
     - Closed days: "Tutup" (text-color #999)
     - 24-hour: "Buka 24 Jam"

3. **Hash-based Routing**:
   - URL: `/:merchantCode#outlet`
   - useEffect to detect hash change
   - Close modal: Remove hash, back to `/:merchantCode`

**Integration**: Import in `src/app/[merchantCode]/page.tsx`

---

### PHASE 3: Menu Home Page (6 tasks)

#### Task 6: PHASE 3A - Table Number Modal (Dine-in) ⏳
**File**: `src/components/modals/TableNumberModal.tsx` (NEW)  
**Required**:
1. **Center Overlay** (not bottom sheet):
   - Modal: Max-width 320px, border-radius 12px
   - Overlay: rgba(0,0,0,0.5), z-index 250
   - Position: Center viewport

2. **Content**:
   - Title: "Nomor Meja" (20px/700)
   - Description: "Masukkan nomor meja Anda" (14px/400, #666)
   - Input: type="number", min="1", max="50"
     - Height: 48px, border #E0E0E0
     - Placeholder: "Contoh: 21"
     - Validation: 1-50 only
   - Button: "Simpan" (48px, #FF6B35, disabled if invalid)

3. **localStorage Persistence**:
   - Key: `table_[merchantCode]_dinein`
   - Value: number (1-50)
   - Auto-show modal if: mode === 'dinein' && !localStorage[key]

4. **Auto-show Logic**:
   - Check on `/[merchantCode]/home` mount
   - If dinein mode && no table number → show modal
   - User cannot proceed without table number

**Integration**: Import in `src/app/[merchantCode]/home/page.tsx`

---

#### Task 7: PHASE 3B - Menu Home Header Update ⏳
**File**: `src/app/[merchantCode]/home/page.tsx`  
**Required**:
1. **Fixed Header** (56px):
   - Position: fixed top 0
   - Background: white
   - Border-bottom: 1px #E0E0E0
   - Z-index: 100

2. **Layout (3 sections)**:
   - **Left**: Back button (chevron-left icon, 24x24px)
   - **Center**: Merchant name (16px/600, #1A1A1A)
   - **Right**: Search icon + Menu icon (20x20px each, gap 16px)

3. **Table Badge** (only for dine-in):
   - Text: "Meja #{tableNumber}" (e.g., "Meja #21")
   - Position: Below header (or inside header, right of merchant name)
   - Background: #FFF5F0
   - Color: #FF6B35
   - Font: 13px/600
   - Border-radius: 12px
   - Padding: 4px 12px

4. **Sticky Behavior**:
   - Always visible even when scrolling
   - Transitions to show/hide with smooth animation

**Current**: Header exists but needs redesign

---

#### Task 8: PHASE 3C - Mode Indicator Tabs ⏳
**File**: `src/app/[merchantCode]/home/page.tsx`  
**Required**:
1. **Horizontal Tabs** (below header):
   - Height: 48px
   - Border-bottom: 1px #E0E0E0
   - Sticky: Below fixed header

2. **Tab Items**:
   - Tab 1: "Makan di Tempat"
   - Tab 2: "Ambil Sendiri"
   - Active tab: Border-bottom 3px #FF6B35
   - Font: 14px/500
   - Color: Active #FF6B35, Inactive #999
   - Padding: 0 16px

3. **Additional Info** (below tab label):
   - Dinein: "Diambil Sekarang" (12px/400, #666)
   - Takeaway: "Ambil Nanti" + dropdown time selector (12px/400, #666)

4. **Click Behavior**:
   - Switch between modes
   - Update URL query: `?mode=dinein` or `?mode=takeaway`
   - Refresh menu data if needed
   - For dinein: Check table number

**Component**: Can be separate `<ModeIndicatorTabs mode={mode} />`

---

#### Task 9: PHASE 3D - Menu Categories Horizontal Scroll ⏳
**File**: `src/app/[merchantCode]/home/page.tsx`  
**Required**:
1. **Container**:
   - Height: 48px
   - Overflow-x: auto
   - Scroll-snap-type: x mandatory
   - Hide scrollbar (CSS)
   - Background: white
   - Border-bottom: 1px #E0E0E0

2. **Category Items**:
   - Display: inline-flex
   - Padding: 0 20px
   - Font: 14px/500
   - Color: Default #666, Active #FF6B35
   - Border-bottom: Active 3px #FF6B35, Default transparent
   - Scroll-snap-align: start
   - Gap: 8px between items

3. **Categories List**:
   - "Semua" (default active)
   - Dynamic from API: Makanan, Minuman, Snack, etc.
   - Click: Filter menu items by category

4. **Behavior**:
   - Horizontal scroll on mobile
   - Active category centered if possible
   - Smooth scroll animation

---

#### Task 10: PHASE 3E - Menu Items List Redesign ⏳
**File**: `src/app/[merchantCode]/home/page.tsx`  
**Required**:
1. **Card Layout** (flex-row):
   - Image: 70x70px, border-radius 8px, object-fit cover (left)
   - Content: flex-1 (right)

2. **Content Structure**:
   - Name: 14px/600, #1A1A1A, line-clamp 2
   - Description: 12px/400, #666, line-clamp 2, margin-top 4px
   - Price: 16px/700, #FF6B35, margin-top 8px

3. **Action Button**:
   - Text: "Tambah"
   - Position: Bottom-right of card
   - Size: Width 70px, Height 36px
   - Background: #FF6B35, Color: white
   - Font: 14px/600
   - Border-radius: 6px
   - Onclick: Open menu detail modal

4. **Stock States**:
   - Available: Normal styling
   - Out of stock: 
     - Overlay: rgba(255,255,255,0.7)
     - Badge: "Stok Habis" (red background)
     - Button disabled

**Current**: Grid layout, needs redesign to flex-row

---

#### Task 11: PHASE 3F - Floating Cart Button ⏳
**File**: `src/components/cart/FloatingCartButton.tsx` (NEW)  
**Required**:
1. **Positioning**:
   - Position: fixed bottom-right
   - Bottom: 24px, Right: 16px
   - Size: 110px width, 64px height
   - Border-radius: 32px
   - Z-index: 50

2. **Styling**:
   - Background: #FF6B35
   - Box-shadow: 0 4px 12px rgba(255,107,53,0.3)
   - Color: white
   - Padding: 12px 16px

3. **Content**:
   - Icon: Cart icon (24x24px, left)
   - Badge: Item count (top-right of icon, white text on #1A1A1A circle)
   - Total: "Rp{total}" (14px/700, below icon)

4. **Behavior**:
   - Click: Navigate to `/[merchantCode]/view-order`
   - Hide if cart empty
   - Pulsing animation on item add
   - Hover: scale(1.05)

**Integration**: Import in `src/app/[merchantCode]/home/page.tsx`

---

### PHASE 4: Menu Detail Modal (4 tasks)

#### Task 12-15: Menu Detail Modal (Combined) ⏳
**File**: `src/components/modals/MenuDetailModal.tsx` (NEW)  
**Required**:
1. **Bottom Sheet Style**:
   - Slide from bottom (0.3s cubic-bezier)
   - Max-height: 90vh
   - Overflow-y: auto
   - Border-radius-top: 16px

2. **Header Section**:
   - Image: 200px height, full width, object-fit cover
   - Close button: Top-right, 32x32px circle, white background, X icon

3. **Menu Info**:
   - Name: 20px/700, #1A1A1A, padding 16px
   - Description: 14px/400, #666, line-height 1.5
   - Price: 18px/700, #FF6B35

4. **Add-ons Section**:
   - Title: "Tambahan" (16px/600)
   - Checkbox list (each add-on):
     - Name: 14px/400
     - Price: "+ Rp{price}" (14px/600, #FF6B35, right-aligned)
     - Checkbox: 20x20px
   - Update total dynamically on selection

5. **Notes Section**:
   - Label: "Catatan" (16px/600)
   - Textarea: 
     - Placeholder: "Catatan untuk pesanan ini (opsional)"
     - Max-length: 200 characters
     - Border: 1px #E0E0E0
     - Border-radius: 8px
     - Min-height: 80px

6. **Quantity Controls**:
   - Layout: Flex row, centered
   - Minus button: "-" (32x32px circle, border #E0E0E0)
   - Quantity display: "{qty}" (18px/700, margin 0 16px)
   - Plus button: "+" (32x32px circle, #FF6B35)
   - Min: 1, Max: 99

7. **Sticky Bottom Button**:
   - Text: "Tambah ke Keranjang - Rp{totalPrice}"
   - Position: sticky bottom 0
   - Height: 56px
   - Background: #FF6B35
   - Color: white
   - Font: 16px/600
   - Onclick: Add to cart + close modal

**Integration**: Import in menu items list

---

### PHASE 5: Cart Review Page (5 tasks)

#### Task 16: Cart Review - Mode Info Section ⏳
**File**: `src/app/[merchantCode]/view-order/page.tsx`  
**Required**:
1. **Section Container**:
   - Background: white
   - Border: 1px #E0E0E0
   - Border-radius: 8px
   - Padding: 16px
   - Margin-bottom: 16px

2. **Info Rows**:
   - **Mode Pengambilan**:
     - Label: "Mode Pengambilan" (13px/400, #999)
     - Value: "Makan di Tempat" or "Ambil Sendiri" (14px/700, #1A1A1A)
   
   - **Lokasi**:
     - Label: "Lokasi" (13px/400, #999)
     - Value: For dinein → "Meja #{tableNumber}", For takeaway → "Counter Pickup"
   
   - **Waktu**:
     - Label: "Waktu" (13px/400, #999)
     - Value: For dinein → "Sekarang", For takeaway → Selected time or "Sekarang"

3. **Layout**: 
   - Each row: Flex space-between
   - Gap: 8px between rows

---

#### Task 17: Cart Review - Items Display ⏳
**File**: `src/app/[merchantCode]/view-order/page.tsx`  
**Required**:
1. **Item Card**:
   - Image: 60x60px, border-radius 8px, object-fit cover (left)
   - Content: flex-1 (middle)
   - Actions: Right-aligned buttons (right)

2. **Content**:
   - Name: 14px/600, #1A1A1A
   - Add-ons display: 
     - Each line: "+ {add-on name}" (12px/400, #999)
     - If multiple: Stack vertically
   - Notes (if any): "{notes}" (12px/400, #999, italic)
   - Price x Qty: "Rp{price} x {qty}" (14px/600, #1A1A1A)

3. **Action Buttons**:
   - Edit button: Pencil icon, 32x32px circle, border #E0E0E0
   - Remove button: Trash icon, 32x32px circle, border #EF4444, color #EF4444
   - Gap: 8px between buttons

4. **Edit Behavior**:
   - Click edit → Reopen menu detail modal
   - Pre-fill: quantity, add-ons, notes
   - Update cart item on save

---

#### Task 18: Cart Review - Cost Summary ⏳
**File**: `src/app/[merchantCode]/view-order/page.tsx`  
**Required**:
1. **Container**:
   - Background: #F9F9F9
   - Border-radius: 8px
   - Padding: 16px
   - Margin-top: 16px

2. **Summary Rows**:
   - **Subtotal**:
     - Label: "Subtotal" (14px/400, #666)
     - Value: "Rp{subtotal}" (14px/600, #1A1A1A)
   
   - **Pajak** (optional):
     - Label: "Pajak (10%)" (14px/400, #666)
     - Value: "Rp{tax}" (14px/600, #1A1A1A)
   
   - **Service Fee** (optional):
     - Label: "Biaya Layanan" (14px/400, #666)
     - Value: "Rp{service}" (14px/600, #1A1A1A)
   
   - **Total**:
     - Label: "Total" (18px/700, #1A1A1A)
     - Value: "Rp{total}" (18px/700, #FF6B35)
     - Border-top: 1px dashed #E0E0E0, padding-top: 12px

3. **Layout**: Each row flex space-between, gap 8px

---

#### Task 19: Cart Review - Action Buttons ⏳
**File**: `src/app/[merchantCode]/view-order/page.tsx`  
**Required**:
1. **Button Container**:
   - Position: Bottom of page (or sticky)
   - Background: white
   - Padding: 16px
   - Border-top: 1px #E0E0E0

2. **Buttons**:
   - **"Tambah Item"**:
     - Style: Transparent, border 2px #FF6B35
     - Color: #FF6B35
     - Height: 48px
     - Font: 16px/600
     - Width: 100%
     - Border-radius: 8px
     - Onclick: Navigate back to `/[merchantCode]/home?mode={mode}`
   
   - **"Lanjut ke Pembayaran"**:
     - Style: Background #FF6B35
     - Color: white
     - Height: 48px
     - Font: 16px/600
     - Width: 100%
     - Border-radius: 8px
     - Margin-top: 12px
     - Onclick: Navigate to `/[merchantCode]/payment?mode={mode}`

---

#### Task 20: Cart Review - Empty State ⏳
**File**: `src/app/[merchantCode]/view-order/page.tsx`  
**Required**:
1. **Display Condition**: If cart items length === 0

2. **Content**:
   - Icon: Cart icon (64x64px, #E0E0E0)
   - Title: "Keranjang Masih Kosong" (18px/700, #1A1A1A)
   - Description: "Yuk, mulai pesan makanan favoritmu!" (14px/400, #666)
   - Button: "Mulai Pesan" (48px, #FF6B35)
     - Onclick: Navigate to `/[merchantCode]/home?mode={mode}`

3. **Layout**: Centered vertically and horizontally

---

### PHASE 6: Payment Page (4 tasks)

#### Task 21: Payment - Auth Check Dialog ⏳
**File**: `src/app/[merchantCode]/payment/page.tsx`  
**Required**:
1. **useEffect on Mount**:
   - Check localStorage for customer auth token
   - If NOT logged in → Show auth check modal

2. **Modal Content**:
   - Question: "Sudah punya akun?" (18px/700)
   - Description: "Login untuk tracking pesanan lebih mudah" (14px/400, #666)
   - Button 1: "Ya, Login" → Navigate to `/login?ref={currentPath}`
   - Button 2: "Tidak, Lanjut Sebagai Guest" → Close modal, continue

3. **Pre-fill Logic** (if logged in):
   - Auto-fill: email, name, phone from auth user
   - Make fields readonly or show "Logged in as {email}"

---

#### Task 22: Payment - Email Notice ⏳
**File**: `src/app/[merchantCode]/payment/page.tsx`  
**Required**:
1. **Notice Box**:
   - Background: #FFF5F0
   - Border-left: 3px solid #FF6B35
   - Border-radius: 6px
   - Padding: 12px
   - Margin: 16px 0

2. **Content**:
   - Icon: Info icon (20x20px, #FF6B35, inline-left)
   - Text: "Email ini adalah key unik untuk cek status pesanan Anda"
   - Font: 13px/400, #666

3. **Position**: Below email input field

---

#### Task 23: Payment - Payment Method Section ⏳
**File**: `src/app/[merchantCode]/payment/page.tsx`  
**Required**:
1. **Section Header**:
   - Title: "Metode Pembayaran" (16px/600, #1A1A1A)
   - Margin: 24px 0 16px

2. **Payment Option**:
   - Radio button: Selected (checked, #FF6B35)
   - Label: "Bayar di Kasir" (14px/600, #1A1A1A)
   - Icon: Cash icon (24x24px)

3. **Instruction Note**:
   - Background: #FFFAF0
   - Border-left: 3px solid #F59E0B (warning color)
   - Padding: 12px
   - Margin-top: 12px
   - Icon: Warning icon (20x20px, #F59E0B)
   - Text: "Tunjukkan QR code pesanan ke kasir untuk pembayaran"
   - Font: 13px/400, #666

---

#### Task 24: Payment - Confirmation Modal ⏳
**File**: `src/components/modals/PaymentConfirmationModal.tsx` (NEW)  
**Required**:
1. **Trigger**: Click "Proses Pesanan" button

2. **Center Modal**:
   - Max-width: 320px
   - Border-radius: 12px
   - Background: white
   - Padding: 24px
   - Box-shadow: 0 8px 24px rgba(0,0,0,0.2)

3. **Content**:
   - Icon: Question icon (48x48px, #FF6B35)
   - Title: "Konfirmasi Pesanan" (20px/700, #1A1A1A)
   - Message: "Proses pembayaran sekarang?" (14px/400, #666)
   - Subtotal recap: "Total: Rp{total}" (16px/700, #FF6B35)

4. **Buttons**:
   - "Batalkan" (transparent, border #E0E0E0, 44px)
   - "Lanjut" (#FF6B35, 44px)
   - Layout: Flex row, gap 12px

5. **Overlay**: rgba(0,0,0,0.5), z-index 300

---

### PHASE 7: Order Summary Page (4 tasks)

#### Task 25: Order Summary - Order Number Section ⏳
**File**: `src/app/[merchantCode]/order-summary-cash/page.tsx`  
**Required**:
1. **Container**:
   - Background: #F5F5F5
   - Border-radius: 8px
   - Padding: 16px
   - Text-align: center
   - Margin-bottom: 24px

2. **Content**:
   - Label: "Nomor Pesanan" (13px/400, #999)
   - Order Number: "#{orderNumber}" (20px/700, #1A1A1A)
   - Copy Button: 
     - Icon: Copy icon (16x16px)
     - Text: "Salin" (13px/600, #FF6B35)
     - Onclick: Copy to clipboard + show toast "Tersalin!"

---

#### Task 26: Order Summary - QR Code Section ⏳
**File**: `src/app/[merchantCode]/order-summary-cash/page.tsx`  
**Required**:
1. **Container**:
   - Background: white
   - Border: 1px #E0E0E0
   - Border-radius: 8px
   - Padding: 24px
   - Text-align: center
   - Margin: 24px 0

2. **QR Code**:
   - Size: 150x150px
   - Centered
   - Border: 1px #E0E0E0
   - Padding: 8px
   - Data: Order number (e.g., "ORDER-123456")
   - Library: Use `qrcode` or `qrcode.react`

3. **Label**:
   - Below QR: "Tunjukkan QR ini ke kasir" (14px/400, #666)

---

#### Task 27: Order Summary - Instruction Note ⏳
**File**: `src/app/[merchantCode]/order-summary-cash/page.tsx`  
**Required**:
1. **Note Box**:
   - Background: #FFFAF0
   - Border-left: 3px solid #F59E0B
   - Border-radius: 6px
   - Padding: 12px
   - Margin: 16px 0

2. **Content**:
   - Icon: Info icon (20x20px, #F59E0B)
   - Text: "Tunjukkan QR code ini ke kasir untuk pembayaran. Pesanan akan diproses setelah pembayaran dikonfirmasi."
   - Font: 13px/400, #666

---

#### Task 28: Order Summary - Items Display ⏳
**File**: `src/app/[merchantCode]/order-summary-cash/page.tsx`  
**Required**:
1. **Section Header**:
   - Title: "Detail Pesanan" (16px/600, #1A1A1A)
   - Margin: 24px 0 16px

2. **Item Card**:
   - Image: 50x50px, border-radius 8px, object-fit cover (left)
   - Content: flex-1 (middle)
   - Price: Right-aligned

3. **Content**:
   - Name: 13px/600, #1A1A1A
   - Add-ons (each line):
     - Bullet: "•" (before text)
     - Text: "{add-on name}" (11px/400, #999)
     - Stack vertically
   - Notes (if any): "{notes}" (11px/400, #999, italic)
   - Quantity x Price: "1 x Rp19.000" (13px/600, #1A1A1A)

4. **Total Item Price**:
   - Label: "Total Item" (13px/600, #666)
   - Value: "Rp{itemTotal}" (13px/600, #1A1A1A)
   - Align: Right

5. **Action Button**:
   - Text: "Pesan Baru" (48px, #FF6B35)
   - Position: Bottom of page
   - Onclick: 
     - Clear cart from localStorage
     - Clear table number from localStorage
     - Navigate to `/[merchantCode]`

---

### PHASE 8: Profile Page (3 tasks)

#### Task 29: Profile - Tab Navigation ⏳
**File**: `src/app/profile/page.tsx`  
**Required**:
1. **Tab Container**:
   - Height: 56px
   - Background: white
   - Border-bottom: 1px #E0E0E0
   - Position: sticky top 0 (below header)

2. **Tabs**:
   - Tab 1: "Akun" (default active)
   - Tab 2: "Riwayat Pesanan"
   - Active tab: Border-bottom 3px #FF6B35
   - Font: 16px/600
   - Color: Active #FF6B35, Inactive #999
   - Flex: Each tab 50% width

3. **useState**: Track active tab ('account' | 'history')

---

#### Task 30: Profile - User Info Section ⏳
**File**: `src/app/profile/page.tsx`  
**Required** (in "Akun" tab):
1. **Avatar**:
   - Size: 80x80px
   - Border-radius: 50% (circle)
   - Background: #F5F5F5 or user image
   - Centered
   - Margin-bottom: 16px
   - Fallback: First letter of name (32px/700, #FF6B35)

2. **User Info**:
   - Name: 20px/700, #1A1A1A, centered
   - Email: 14px/400, #666, centered, margin-top 4px
   - Phone: 14px/400, #666, centered, margin-top 4px

3. **Edit Profile Button**:
   - Text: "Edit Profil"
   - Height: 44px
   - Width: 100% or max-width 200px
   - Background: transparent, border 2px #FF6B35
   - Color: #FF6B35
   - Font: 14px/600
   - Border-radius: 8px
   - Margin-top: 24px

4. **Logout Button**:
   - Text: "Keluar"
   - Height: 44px
   - Width: 100% or max-width 200px
   - Background: transparent, border 1px #EF4444
   - Color: #EF4444
   - Font: 14px/600
   - Border-radius: 8px
   - Margin-top: 12px
   - Onclick: Show confirmation modal → Clear localStorage → Navigate to "/"

**Logout Confirmation Modal**:
- Title: "Keluar dari Akun?" (20px/700)
- Message: "Anda akan logout dari aplikasi" (14px/400, #666)
- Buttons: "Batal" + "Ya, Keluar" (red)

---

#### Task 31: Profile - Order History ⏳
**File**: `src/app/profile/page.tsx`  
**Required** (in "Riwayat Pesanan" tab):
1. **Order Card**:
   - Border: 1px #E0E0E0
   - Border-radius: 8px
   - Padding: 16px
   - Margin-bottom: 12px
   - Background: white

2. **Card Header**:
   - Order Number: "#{orderNumber}" (14px/600, #1A1A1A, left)
   - Date: "12 Jan 2025, 14:30" (12px/400, #999, left, below order number)
   - Status Badge: (right, top-aligned)
     - Pending: Background #FFF5F0, Color #F59E0B
     - Completed: Background #ECFDF5, Color #10B981
     - Cancelled: Background #FEF2F2, Color #EF4444
     - Font: 12px/600
     - Padding: 4px 12px
     - Border-radius: 12px

3. **Card Body**:
   - Merchant Name: "{merchantName}" (13px/400, #666)
   - Items Count: "{count} item" (13px/400, #666)
   - Total Price: "Rp{total}" (16px/700, #FF6B35)

4. **Card Footer**:
   - Button: "Lihat Detail"
   - Height: 36px
   - Background: transparent, border 1px #FF6B35
   - Color: #FF6B35
   - Font: 13px/600
   - Border-radius: 6px
   - Onclick: Navigate to `/track/{orderNumber}`

**Empty State**:
- If no orders: Show empty icon + "Belum ada pesanan"

---

### PHASE 9: Cleanup (1 task)

#### Task 32: Remove Unused Pages ⏳
**Files to DELETE**:
```
src/app/(admin)/(others-pages)/admin-profile/
src/app/(admin)/(others-pages)/alerts/
src/app/(admin)/(others-pages)/avatars/
src/app/(admin)/(others-pages)/badge/
src/app/(admin)/(others-pages)/bar-chart/
src/app/(admin)/(others-pages)/basic-tables/
src/app/(admin)/(others-pages)/blank/
src/app/(admin)/(others-pages)/buttons/
src/app/(admin)/(others-pages)/calendar/
src/app/(admin)/(others-pages)/checkout/
src/app/(admin)/(others-pages)/error-404/
src/app/(admin)/(others-pages)/form-elements/
src/app/(admin)/(others-pages)/images/
src/app/(admin)/(others-pages)/line-chart/
src/app/(admin)/(others-pages)/lookup/
src/app/menu/[code]/
src/app/merchant/categories/
src/app/merchant/menu/
src/app/merchant/orders/
src/app/merchant/profile/
src/app/merchant/revenue/
```

**Reason**: Not in customer specification, duplicate of dashboard pages

**Action**: 
```bash
# PowerShell commands
Remove-Item -Recurse -Force "src/app/(admin)/(others-pages)/"
Remove-Item -Recurse -Force "src/app/menu/"
Remove-Item -Recurse -Force "src/app/merchant/"
```

---

### PHASE 10: Styling Consistency (3 tasks)

#### Task 33: Standardize Colors ⏳
**Create**: `src/lib/constants/colors.ts`

```typescript
export const COLORS = {
  primary: '#FF6B35',
  primaryHover: '#E55A2B',
  primaryLight: '#FFF5F0',
  
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    tertiary: '#999999',
    white: '#FFFFFF',
  },
  
  border: {
    default: '#E0E0E0',
    light: '#F5F5F5',
  },
  
  background: {
    default: '#FFFFFF',
    gray: '#F9F9F9',
    light: '#F5F5F5',
  },
  
  status: {
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFAF0',
    error: '#EF4444',
    errorLight: '#FEF2F2',
  },
} as const;
```

**Apply**: Replace all hardcoded colors in all customer pages

---

#### Task 34: Standardize Typography ⏳
**Create**: `src/lib/constants/typography.ts`

```typescript
export const TYPOGRAPHY = {
  h1: 'text-[28px] font-bold leading-tight',
  h2: 'text-[20px] font-bold',
  h3: 'text-base font-semibold',
  
  body: 'text-sm font-normal',
  bodyBold: 'text-sm font-semibold',
  
  small: 'text-[13px] font-normal',
  smallBold: 'text-[13px] font-semibold',
  
  tiny: 'text-xs font-normal',
  
  price: 'text-base font-bold',
  priceL: 'text-lg font-bold',
} as const;
```

**Apply**: Replace all font-size/weight classes in all customer pages

---

#### Task 35: Standardize Spacing & Sizing ⏳
**Create**: `src/lib/constants/spacing.ts`

```typescript
export const SIZING = {
  header: 'h-14', // 56px
  button: {
    default: 'h-12', // 48px
    small: 'h-11', // 44px
    tiny: 'h-9', // 36px
  },
  input: 'h-12', // 48px
  icon: {
    small: 'w-5 h-5', // 20px
    medium: 'w-6 h-6', // 24px
    large: 'w-12 h-12', // 48px
  },
} as const;

export const SPACING = {
  container: 'px-4', // 16px
  borderRadius: {
    default: 'rounded-lg', // 8px
    small: 'rounded-md', // 6px
    large: 'rounded-xl', // 12px
    circle: 'rounded-full',
  },
  gap: {
    small: 'gap-2', // 8px
    default: 'gap-3', // 12px
    large: 'gap-4', // 16px
  },
} as const;
```

**Apply**: Replace all spacing classes in all customer pages

---

### PHASE 11: Animations (3 tasks)

#### Task 36: Add Modal Animations ⏳
**Create**: `src/lib/constants/animations.ts`

```typescript
export const ANIMATIONS = {
  modal: {
    bottomSheet: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    center: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: 0.2 },
    },
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
  },
} as const;
```

**Apply**: Use Framer Motion in all modals

---

#### Task 37: Add Button Interactions ⏳
**Apply to all buttons**:

```typescript
// Tailwind classes
className="transition-all duration-200 hover:scale-102 active:scale-98 disabled:opacity-50"
```

**Create**: `src/components/ui/Button.tsx` (shared button component)

---

#### Task 38: Add Page Transitions ⏳
**Apply**:
1. Fade-in on mount: Use Framer Motion `<motion.div>` wrapper
2. Smooth scroll: Add to `globals.css`
```css
html {
  scroll-behavior: smooth;
}
```
3. Loading states: Add skeleton loaders for async data

---

### PHASE 12: Testing & Verification (2 tasks)

#### Task 39: Responsive Testing ⏳
**Checklist**:
- [ ] Test all pages at 375px width (iPhone SE)
- [ ] Test all pages at 390px width (iPhone 12/13)
- [ ] Test all pages at 428px width (iPhone 14 Pro Max)
- [ ] Verify no horizontal scroll
- [ ] Test touch interactions (tap, swipe, pinch)
- [ ] Verify floating cart button positioning
- [ ] Test modal overlays and z-index stacking
- [ ] Test horizontal category scroll with touch

**Tools**: 
- Chrome DevTools (Device Toolbar)
- Firefox Responsive Design Mode

---

#### Task 40: Build & Lint Verification ⏳
**Commands**:
```bash
# 1. Run build
npm run build

# 2. Fix any errors

# 3. Run lint
npm run lint

# 4. Test key user flows manually
# - Browse menu → Add to cart → View cart → Payment → Order summary
# - Login flow → Profile → Order history
# - Guest checkout flow
# - Dine-in with table number
# - Takeaway flow
```

**Acceptance Criteria**:
- ✅ Zero build errors
- ✅ Zero lint errors
- ✅ All pages load correctly
- ✅ All user flows complete successfully
- ✅ Mobile responsive (375-428px)
- ✅ All modals animate correctly
- ✅ All colors match spec (#FF6B35 primary)
- ✅ All typography matches spec (28px H1, 20px H2, etc.)

---

## 📊 PROGRESS SUMMARY

**Completed**: 3/40 tasks (7.5%)  
**In Progress**: 1 task (Task 4 - Merchant Mode Selection)  
**Remaining**: 36 tasks

**Estimated Total Work**: 
- Pages to redesign: 8 customer pages
- New components: 5+ modals/sheets
- Styling updates: ~20 pages
- Cleanup: ~20 unused pages to delete

**Next Steps**: 
1. Continue with Task 4: Merchant Mode Selection Page
2. Then Task 5: Outlet Information Modal
3. Follow sequential order through all 40 tasks

---

## 🚀 HOW TO CONTINUE

### For AI Agent:
```
Continue implementation from Task 4 (Merchant Mode Selection Page).
Read specification from docs/FRONTEND_SPECIFICATION.md lines 150-250.
Update src/app/[merchantCode]/page.tsx to match spec exactly.
After completion, move to Task 5 (Outlet Information Modal).
```

### For Developer:
1. Reference this document for task details
2. Check FRONTEND_SPECIFICATION.md for exact requirements
3. Use Tailwind classes matching the spec colors/typography
4. Test on mobile viewport (375px) after each change
5. Run `npm run build` periodically to catch errors early

---

**Last Updated**: 2025-01-XX  
**Document Version**: 1.0  
**Maintained By**: AI Coding Agent + Developer
