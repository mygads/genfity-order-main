================================================================================
FRONTEND CLONE SPECIFICATION
Complete UI/UX & Routing Architecture Documentation
================================================================================

METADATA:
- Project: Genfity Ordering System (Food Ordering & Management Platform)
- Target: Indonesia (Indonesian language, Rupiah currency)
- Framework: Next.js 15+ with App Router, Tailwind CSS, TypeScript
- Design: Mobile-first (375-428px viewport)
- Base URL: localhost:3000

================================================================================
SECTION 1: ROUTING ARCHITECTURE & FLOW
================================================================================

╔════════════════════════════════════════════════════════════════════════════╗
║                      CUSTOMER ROUTES (Mobile & Desktop)                   ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─ 1. LANDING PAGE ─────────────────────────────────────────────────────────
│
├─ URL: GET /
├─ Component: LandingPage
│
├─ Layout:
│  ├─ Viewport: 375-428px (mobile), centered with white gutters on desktop
│  ├─ Full height viewport (min-height: 100vh)
│  └─ Background: Linear gradient or hero image
│
├─ Header Section:
│  ├─ Navbar (Fixed top):
│  │  ├─ Height: 56px
│  │  ├─ Background: White (#FFFFFF)
│  │  ├─ Border-bottom: 1px solid #E0E0E0
│  │  ├─ Left: Logo or back arrow
│  │  ├─ Right: "Sign In" button
│  │  │        ├─ Font: 14px, weight 600
│  │  │        ├─ Color: #FF6B35
│  │  │        ├─ Padding: 8px 16px
│  │  │        ├─ Border: 2px solid #FF6B35
│  │  │        ├─ Border-radius: 6px
│  │  │        └─ Action: Click → /login?ref=%2F
│  │  │
│  │  └─ Spacing: Padding 16px (left & right)
│
├─ Hero Section:
│  ├─ Content:
│  │  ├─ Heading: "Pesan Makanan Favorit Kamu"
│  │  │          Font: 28px, weight 700, color: #1A1A1A
│  │  ├─ Subheading: "Belanja makanan favorit dari merchant pilihan kamu"
│  │  │             Font: 14px, weight 400, color: #666666
│  │  │             Margin-top: 16px
│  │  └─ Hero image/illustration: 100% width, ~200px height
│
├─ Input Section:
│  ├─ Label: "Masukkan Kode Merchant"
│  │         Font: 14px, weight 600
│  │         Margin-bottom: 8px
│  ├─ Input field:
│  │  ├─ Placeholder: "Cth: BRJO"
│  │  ├─ Height: 48px
│  │  ├─ Padding: 12px
│  │  ├─ Border: 1px solid #E0E0E0
│  │  ├─ Border-radius: 8px
│  │  ├─ Font-size: 14px
│  │  └─ Margin-bottom: 16px
│  │
│  └─ Submit Button:
│     ├─ Text: "Mulai Pesan"
│     ├─ Width: 100%
│     ├─ Height: 48px
│     ├─ Background: #FF6B35
│     ├─ Color: White
│     ├─ Font: 16px, weight 600
│     ├─ Border-radius: 8px
│     ├─ Cursor: pointer
│     └─ Action: 
│        └─ Input(merchantCode) → /[merchantCode]?mode=selection
│
├─ Features Section (Optional):
│  ├─ 3-4 cards showcasing features:
│  │  ├─ Icon: Quick order
│  │  ├─ Title: "Pesan Cepat"
│  │  ├─ Description: 2 lines max
│  │  └─ Same for other features
│
└─ State Management:
   ├─ Local State: merchantCode (form input)
   └─ Navigation: Programmatic redirect on submit

┌─ 2. AUTHENTICATION ───────────────────────────────────────────────────────
│
├─ URL: GET /login?merchant=[code]&mode=[dinein|takeaway]&ref=%2F...
├─ Component: LoginPage
│
├─ Conditional Rendering:
│  ├─ If NOT logged in:
│  │  ├─ Show: "Sudah punya akun?"
│  │  ├─ Button 1: "Ya, Login" (primary)
│  │  └─ Button 2: "Tidak, Lanjut Tanpa Login" (secondary)
│  │
│  └─ If user clicks "Ya, Login":
│     ├─ Show login form with fields:
│     │  ├─ Email: Input email
│     │  │        Font: 14px, color: #1A1A1A
│     │  │        Border: 1px solid #E0E0E0
│     │  │        Border-radius: 8px
│     │  │        Padding: 12px
│     │  │        Height: 48px
│     │  │
│     │  └─ Password: Input password
│     │             (Same styling as email)
│     │
│     └─ Password recovery link:
│        ├─ Text: "Lupa Kata Sandi?"
│        ├─ Font-size: 12px
│        ├─ Color: #FF6B35
│        ├─ Text-decoration: underline (on hover)
│        └─ Margin-top: 8px
│
├─ Form Submission:
│  ├─ POST /api/auth/login
│  ├─ Input: { email, password }
│  ├─ Output: 
│  │  ├─ { 
│  │  │    accessToken, 
│  │  │    user: { id, email, name, phone, role: "CUSTOMER" },
│  │  │    success: true 
│  │  │  }
│  │  └─ Store token in HTTP-only cookie
│  │  └─ Store in context/localStorage
│  │
│  └─ On Success:
│     └─ Redirect to ref URL or /[merchantCode]/home?mode=[mode]
│
├─ Guest Checkout Path:
│  ├─ User clicks "Tidak, Lanjut Tanpa Login"
│  ├─ Proceed to /[merchantCode]/order?mode=[mode] as anonymous
│  └─ At checkout (payment page), prompt for name/email/phone
│
├─ Auto-register on Email (if new):
│  ├─ Logic: Email is unique identifier
│  ├─ If email not found → Auto-create account
│  ├─ Fields to collect:
│  │  ├─ Email: Pre-filled (if available)
│  │  ├─ Name: Ask user
│  │  └─ Phone: Ask user
│  │
│  └─ Response: Same as login (returns accessToken)
│
└─ Ref Parameter for Navigation:
   ├─ Format: ?ref=%2F[path]%2Fto%2Fprevious%3Fparam%3Dvalue
   ├─ Purpose: Track back button destination
   ├─ On back: Decode & navigate to ref URL
   └─ If no ref: Navigate to landing page

┌─ 3. MERCHANT MODE SELECTION ──────────────────────────────────────────────
│
├─ URL: GET /:merchantCode
├─ Component: MerchantPage (or ModeSelectionPage)
│
├─ Conditional Rendering:
│  ├─ If user already selected mode in localStorage:
│  │  └─ Redirect to /[merchantCode]/order?mode=[cached_mode]
│  │
│  └─ Otherwise:
│     └─ Show selection modal/buttons
│
├─ Header:
│  ├─ Title: Merchant name (fetched from API)
│  ├─ Back button: Top-left corner
│  └─ Spacing: 56px from top
│
├─ Merchant Info Card:
│  ├─ Image banner:
│  │  ├─ Height: 200px
│  │  ├─ Width: 100%
│  │  ├─ object-fit: cover
│  │  ├─ Image URL: API response
│  │  └─ Gradient overlay: rgba(0,0,0,0.2) to transparent
│  │
│  ├─ Info section (below image):
│  │  ├─ Merchant name:
│  │  │  ├─ Font: 20px, weight 700
│  │  │  ├─ Color: #1A1A1A
│  │  │  ├─ Padding: 16px 16px 0
│  │  │  └─ Margin-bottom: 8px
│  │  │
│  │  ├─ Address:
│  │  │  ├─ Font: 13px, weight 400, color: #666
│  │  │  ├─ Padding: 0 16px
│  │  │  └─ Margin-bottom: 12px
│  │  │  └─ Lines: Max 2 (text-overflow: ellipsis)
│  │  │
│  │  ├─ Phone icon + number:
│  │  │  ├─ Icon: Phone icon (20x20px)
│  │  │  ├─ Font: 13px, color: #999
│  │  │  ├─ Padding: 0 16px
│  │  │  └─ Link: tel:[number]
│  │  │
│  │  ├─ Hours:
│  │  │  ├─ Font: 13px, color: #999
│  │  │  ├─ Padding: 0 16px 12px
│  │  │  └─ Text: "Buka 24 Jam" or specific hours
│  │  │
│  │  └─ Outlet info link:
│  │     ├─ Text: "Lihat Info Outlet"
│  │     ├─ Position: Bottom-right, inside card
│  │     ├─ Font: 13px, weight 600, color: #FF6B35
│  │     ├─ Icon: Right chevron
│  │     └─ Action: Navigate to /:merchantCode#outlet
│
├─ Mode Selection Section:
│  ├─ Title: "Pilih Cara Makan"
│  │         Font: 16px, weight 600
│  │         Margin: 24px 16px 16px
│  │
│  ├─ Button 1: "Makan di Tempat"
│  │  ├─ Width: 100%
│  │  ├─ Height: 56px
│  │  ├─ Margin-bottom: 12px
│  │  ├─ Background: #FF6B35
│  │  ├─ Color: White
│  │  ├─ Font: 16px, weight 600
│  │  ├─ Border-radius: 8px
│  │  ├─ Action: Click → /[merchantCode]/home?mode=dinein
│  │  └─ Show loading spinner on click
│  │
│  └─ Button 2: "Ambil Sendiri"
│     ├─ Same styling as Button 1
│     ├─ Action: Click → /[merchantCode]/home?mode=takeaway
│     └─ Show loading spinner on click
│
├─ Data Fetching:
│  ├─ GET /api/merchants/[merchantCode]
│  ├─ Returns: { id, name, code, phone, address, image, hours: [...] }
│  └─ Cache: 5 minutes
│
└─ State Management:
   ├─ useEffect: Fetch merchant on mount
   ├─ useState: isLoading, error, merchantData
   └─ Navigate on button click

┌─ 4. OUTLET INFORMATION (MODAL/SHEET) ──────────────────────────────────────
│
├─ URL: GET /:merchantCode#outlet
├─ Trigger: Click "Lihat Info Outlet" or hash change to #outlet
├─ Component: OutletModal or BottomSheet
│
├─ Presentation:
│  ├─ Position: Bottom-to-top slide animation
│  ├─ Background overlay: rgba(0,0,0,0.5)
│  ├─ Modal background: #FFFFFF
│  ├─ Border-radius: 16px 16px 0 0
│  ├─ z-index: 200
│  └─ Close on:
│     ├─ Overlay click
│     ├─ Close button (X top-right)
│     ├─ Back button click
│     └─ Swipe down (on mobile)
│
├─ Content:
│  ├─ Header:
│  │  ├─ Title: "Info Outlet"
│  │  │         Font: 18px, weight 700
│  │  │         Padding: 16px
│  │  │
│  │  ├─ Close button:
│  │  │  ├─ Position: Top-right
│  │  │  ├─ Icon: X (24x24px)
│  │  │  ├─ Background: transparent
│  │  │  └─ Cursor: pointer
│  │  │
│  │  └─ Drag handle:
│  │     ├─ Position: Top-center
│  │     ├─ Height: 4px, Width: 40px
│  │     ├─ Background: #D0D0D0
│  │     ├─ Border-radius: 2px
│  │     └─ Margin-bottom: 12px
│  │
│  ├─ Body section:
│  │  ├─ Outlet name:
│  │  │  ├─ Text: "Burjo Ngegas Gombel"
│  │  │  ├─ Font: 18px, weight 700
│  │  │  ├─ Color: #1A1A1A
│  │  │  ├─ Padding: 16px 16px 8px
│  │  │  └─ Margin-bottom: 8px
│  │  │
│  │  ├─ Address:
│  │  │  ├─ Text: "Jl. Setia Budi No.28, Ngesrep, Kec. Banyumanik, Kota Semarang, Jawa Tengah 50263, Indonesia"
│  │  │  ├─ Font: 13px, weight 400, color: #666
│  │  │  ├─ Padding: 0 16px 16px
│  │  │  └─ Line-height: 1.5
│  │  │
│  │  ├─ Action buttons:
│  │  │  ├─ Button 1: "Hubungi Outlet"
│  │  │  │  ├─ Width: 100%
│  │  │  │  ├─ Height: 44px
│  │  │  │  ├─ Background: #F5F5F5
│  │  │  │  ├─ Color: #1A1A1A
│  │  │  │  ├─ Font: 14px, weight 600
│  │  │  │  ├─ Border-radius: 8px
│  │  │  │  ├─ Margin-bottom: 12px
│  │  │  │  ├─ Icon: Phone (left)
│  │  │  │  └─ Action: tel:[phoneNumber]
│  │  │  │
│  │  │  └─ Button 2: "Kunjungi Outlet"
│  │  │     ├─ Same styling as Button 1
│  │  │     ├─ Icon: Location pin (left)
│  │  │     └─ Action: Open Google Maps (location link)
│  │  │
│  │  └─ Operating Hours:
│  │     ├─ Title: "Jam Operasional"
│  │     │         Font: 14px, weight 600
│  │     │         Padding: 16px 16px 8px
│  │     │         Margin-top: 16px
│  │     │
│  │     └─ Hours list:
│  │        ├─ Container: padding 0 16px 16px
│  │        └─ Each day row:
│  │           ├─ Day name: "SENIN" (Font: 13px, weight 600)
│  │           ├─ Status: "Buka 24 Jam" (Font: 13px, weight 400, color: #666)
│  │           ├─ Padding: 8px 0
│  │           ├─ Border-bottom: 1px solid #F0F0F0
│  │           └─ Last item: No border
│  │
│  └─ Data:
│     ├─ SENIN - MINGGU all show "Buka 24 Jam" (from database)
│     └─ Format: [Day]: [Status]
│
├─ Data Fetching:
│  ├─ GET /api/merchants/[merchantCode]/outlet
│  ├─ Returns: { address, phone, hours, mapsUrl }
│  └─ Cache: 5 minutes
│
└─ State Management:
   ├─ useState: isOpen (from hash change)
   └─ useEffect: Listen to hash changes

┌─ 5. HOME PAGE (DINEIN MODE WITH TABLE NUMBER) ─────────────────────────────
│
├─ URL: GET /:merchantCode/home?mode=dinein
├─ Component: HomePage or OrderPage
│
├─ Conditional Rendering:
│  ├─ If table number NOT in localStorage[table_[merchantCode]_dinein]:
│  │  └─ Show: Table number input modal (overlay entire page)
│  │
│  └─ If table number EXISTS:
│     └─ Show: Full menu page
│
├─ TABLE NUMBER INPUT MODAL:
│  ├─ Position: Center of screen, overlay (rgba(0,0,0,0.5))
│  ├─ Background: White, border-radius: 12px
│  ├─ Padding: 24px
│  ├─ Max-width: 400px
│  │
│  ├─ Content:
│  │  ├─ Title: "Masukkan Nomor Meja"
│  │  │         Font: 18px, weight 700
│  │  │         Color: #1A1A1A
│  │  │         Margin-bottom: 16px
│  │  │
│  │  ├─ Input field:
│  │  │  ├─ Type: number
│  │  │  ├─ Placeholder: "Cth: 1-50"
│  │  │  ├─ Height: 48px
│  │  │  ├─ Padding: 12px
│  │  │  ├─ Border: 2px solid #E0E0E0
│  │  │  ├─ Border-radius: 8px
│  │  │  ├─ Font-size: 16px
│  │  │  ├─ Margin-bottom: 16px
│  │  │  └─ Focus: Border color #FF6B35
│  │  │
│  │  └─ Submit button:
│  │     ├─ Text: "Simpan"
│  │     ├─ Width: 100%
│  │     ├─ Height: 48px
│  │     ├─ Background: #FF6B35
│  │     ├─ Color: White
│  │     ├─ Font: 16px, weight 600
│  │     ├─ Border-radius: 8px
│  │     ├─ Action: 
│  │     │  └─ Save to localStorage[table_[merchantCode]_dinein] = input value
│  │     │  └─ Close modal
│  │     │  └─ Show full menu page
│  │     └─ Validation: Number must be 1-50
│  │
│  └─ Persistence:
│     ├─ Save in localStorage
│     ├─ Key: table_[merchantCode]_dinein
│     └─ Value: number (as string)
│
├─ FULL MENU PAGE (shown after table selected):
│  ├─ Header:
│  │  ├─ Height: 56px
│  │  ├─ Background: White
│  │  ├─ Position: Fixed top
│  │  ├─ z-index: 100
│  │  ├─ Left: Back button (24x24px)
│  │  │         Action: Navigate back or to /[merchantCode]
│  │  ├─ Center: Merchant name
│  │  │          Font: 16px, weight 600
│  │  │          Color: #1A1A1A
│  │  ├─ Right: Icons
│  │  │         ├─ Search icon (24x24px) - for menu search
│  │  │         └─ Menu icon (hamburger, 24x24px) - for filters/options
│  │  │
│  │  └─ Bottom: Table badge
│  │            ├─ Text: "Meja #21"
│  │            ├─ Font: 12px, weight 600
│  │            ├─ Background: #FFF5F0
│  │            ├─ Color: #FF6B35
│  │            ├─ Padding: 4px 8px
│  │            ├─ Border-radius: 6px
│  │            └─ Position: Right side, below main header
│  │
│  └─ Content (same as takeaway order page - see section 6)
│
├─ State Management:
│  ├─ useState: isTableModalOpen
│  ├─ useEffect: Check localStorage on mount
│  └─ localStorage: Save table number persistently
│
└─ Reset Table After Order:
   ├─ After successful checkout:
   │  └─ Delete localStorage[table_[merchantCode]_dinein]
   │  └─ Redirect to /[merchantCode]
   │  └─ User must input table number again
   └─ Logic: Implemented in order submission handler

┌─ 6. MENU LISTING & ORDERING PAGE ─────────────────────────────────────────
│
├─ URL: GET /:merchantCode/order?mode=[dinein|takeaway]
├─ URL: GET /:merchantCode/home?mode=[dinein|takeaway]
├─ Component: OrderPage
│
├─ Header:
│  ├─ Height: 56px
│  ├─ Background: White
│  ├─ Position: Fixed top, z-index: 100
│  ├─ Padding: 12px 16px
│  ├─ Border-bottom: 1px solid #E0E0E0
│  │
│  ├─ Left section:
│  │  ├─ Back button:
│  │  │  ├─ Icon: Left chevron (24x24px)
│  │  │  ├─ Action: history.back() or navigate using ref param
│  │  │  └─ Cursor: pointer
│  │
│  ├─ Center section:
│  │  ├─ Merchant name:
│  │  │  ├─ Font: 16px, weight 600
│  │  │  ├─ Color: #1A1A1A
│  │  │  └─ Text-overflow: ellipsis
│  │
│  └─ Right section:
│     ├─ Search icon:
│     │  ├─ Icon: Magnifying glass (24x24px)
│     │  ├─ Color: #666
│     │  └─ Action: Show search bar (slide-in from right)
│     │
│     └─ Menu icon:
│        ├─ Icon: Hamburger/three lines (24x24px)
│        ├─ Color: #666
│        └─ Action: Show filters/options menu
│
├─ MODE INDICATOR (below header):
│  ├─ Layout: Horizontal tabs / selector
│  ├─ Height: 56px
│  ├─ Background: White
│  ├─ Border-bottom: 1px solid #E0E0E0
│  ├─ Padding: 12px 16px
│  │
│  ├─ Tab 1: "Makan di Tempat"
│  │  ├─ Font: 14px, weight 500
│  │  ├─ Color (active): #FF6B35
│  │  ├─ Color (inactive): #999
│  │  ├─ Border-bottom (active): 3px solid #FF6B35
│  │  ├─ Padding: 12px 16px
│  │  └─ Flex: 1
│  │
│  ├─ Tab 2: "Ambil Sendiri"
│  │  ├─ Same styling as Tab 1
│  │  └─ Flex: 1
│  │
│  └─ Additional info (mode-specific):
│     ├─ DINEIN: "Diambil Sekarang" (read-only text)
│     └─ TAKEAWAY: "Ambil Nanti" (dropdown with time picker)
│
├─ MENU CATEGORIES (horizontal scrollable):
│  ├─ Position: Below mode indicator
│  ├─ Height: 48px
│  ├─ Background: White
│  ├─ Overflow: auto (horizontal scroll)
│  ├─ Border-bottom: 1px solid #E0E0E0
│  ├─ Padding: 12px 16px 12px 0
│  ├─ Scroll-snap: true (snaps to items)
│  │
│  ├─ Category item:
│  │  ├─ Padding: 0 16px
│  │  ├─ White-space: nowrap
│  │  ├─ Font: 14px, weight 500
│  │  ├─ Color (inactive): #666
│  │  ├─ Color (active): #FF6B35
│  │  ├─ Border-bottom (active): 3px solid #FF6B35
│  │  ├─ Cursor: pointer
│  │  └─ Transition: color 0.2s, border 0.2s
│  │
│  └─ Data: Fetched from /api/merchants/[merchantCode]/categories
│
├─ MENU ITEMS LIST (vertical scrollable):
│  ├─ Position: Below categories
│  ├─ Overflow: auto (vertical)
│  ├─ Padding-bottom: 100px (space for floating cart button)
│  │
│  ├─ Menu item card:
│  │  ├─ Layout: Container with flex row
│  │  ├─ Margin: 12px 16px
│  │  ├─ Padding: 12px
│  │  ├─ Background: White
│  │  ├─ Border-radius: 8px
│  │  ├─ Box-shadow: 0 1px 4px rgba(0,0,0,0.08)
│  │  ├─ Border: none (or very subtle)
│  │  │
│  │  ├─ Left: Image
│  │  │  ├─ Size: 70x70px
│  │  │  ├─ Border-radius: 8px
│  │  │  ├─ object-fit: cover
│  │  │  └─ background: #F0F0F0 (loading state)
│  │  │
│  │  ├─ Middle: Info (flex: 1, padding-left: 12px)
│  │  │  ├─ Name:
│  │  │  │  ├─ Font: 14px, weight 600
│  │  │  │  ├─ Color: #1A1A1A
│  │  │  │  └─ White-space: wrap (max 1-2 lines)
│  │  │  │
│  │  │  ├─ Description:
│  │  │  │  ├─ Font: 12px, weight 400
│  │  │  │  ├─ Color: #999
│  │  │  │  ├─ Margin-top: 4px
│  │  │  │  ├─ Display: -webkit-line-clamp: 2
│  │  │  │  └─ Overflow: hidden
│  │  │  │
│  │  │  └─ Price:
│  │  │     ├─ Font: 16px, weight 700
│  │  │     ├─ Color: #FF6B35
│  │  │     └─ Margin-top: 8px
│  │  │
│  │  └─ Right: Button (flex column, justify: center, align: center)
│  │     ├─ "Tambah" button:
│  │     │  ├─ Width: 70px
│  │     │  ├─ Height: 36px
│  │     │  ├─ Background: #FF6B35 (enabled) | #E0E0E0 (stock habis)
│  │     │  ├─ Color: White | #999
│  │     │  ├─ Font: 12px, weight 600
│  │     │  ├─ Border-radius: 6px
│  │     │  ├─ Cursor: pointer | not-allowed
│  │     │  ├─ Border: none
│  │     │  └─ Action: Click → Open MenuDetail modal
│  │     │
│  │     └─ OR "Stok habis" (if stock = 0):
│  │        ├─ Background: #E0E0E0
│  │        ├─ Color: #999
│  │        ├─ Cursor: not-allowed
│  │        └─ Disabled: true
│  │
│  └─ Data: Fetched from /api/merchants/[merchantCode]/menus?category=[id]
│
├─ FLOATING CART BUTTON (fixed bottom-right):
│  ├─ Position: Fixed bottom, right
│  ├─ Bottom: 16px, Right: 16px
│  ├─ Width: 110px (approx)
│  ├─ Height: 64px
│  ├─ Background: #FF6B35
│  ├─ Color: White
│  ├─ Border-radius: 12px
│  ├─ Padding: 12px
│  ├─ Box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4)
│  ├─ z-index: 50 (below header)
│  ├─ Display: flex, flex-direction: column, justify: center, align: center
│  │
│  ├─ Content:
│  │  ├─ Line 1: "[count] Item"
│  │  │          Font: 12px, weight 500
│  │  │          Color: rgba(255, 255, 255, 0.8)
│  │  │
│  │  └─ Line 2: "Rp[total]"
│  │             Font: 14px, weight 700
│  │             Color: White
│  │
│  ├─ Hover effect:
│  │  ├─ Background: Darken slightly (#E55A2B)
│  │  ├─ Transform: scale(1.05)
│  │  └─ Transition: all 0.2s ease
│  │
│  └─ Action: Click → Navigate to /[merchantCode]/view-order?mode=[mode]
│
├─ EMPTY STATE (if no menu items):
│  ├─ Icon: Shopping bag (48x48px)
│  ├─ Title: "Belum Ada Menu"
│  │         Font: 16px, weight 600
│  │         Color: #1A1A1A
│  │         Margin-top: 16px
│  │
│  ├─ Message: "Menu belum tersedia untuk kategori ini"
│  │           Font: 14px, weight 400
│  │           Color: #666
│  │           Margin-top: 8px
│  │
│  └─ Layout: Center of page, padding: 40px 16px
│
├─ Data Fetching:
│  ├─ GET /api/merchants/[merchantCode]/categories
│  ├─ GET /api/merchants/[merchantCode]/menus?category=[id]
│  ├─ Returns menus with: id, name, price, description, image, stock, 
│  │                      addons (NOT fetched separately - included in response)
│  └─ Cache: 5 minutes
│
├─ State Management:
│  ├─ useState: categories, menus, selectedCategory, isLoading
│  ├─ useContext: Cart context (items count, total)
│  ├─ useEffect: Fetch categories & menus on mount
│  └─ useCallback: Filter menus by category

└─ Search & Filter Feature (optional):
   ├─ Search icon click → Slide-in search bar
   ├─ Input: Search by menu name
   ├─ Real-time filter: Filter menus array
   └─ Clear button: Reset search

┌─ 7. MENU DETAIL & ADD-ON SELECTION MODAL ──────────────────────────────────
│
├─ URL: GET /:merchantCode/order?mode=[dinein|takeaway]&id=[menuId]#add-menu
├─ Trigger: Click "Tambah" button on menu item
├─ Component: MenuDetailModal or BottomSheet
│
├─ Presentation:
│  ├─ Animation: Slide up from bottom
│  ├─ Position: Overlay entire viewport
│  ├─ Background overlay: rgba(0,0,0,0.5)
│  ├─ Modal background: White
│  ├─ Border-radius: 16px 16px 0 0 (top only)
│  ├─ Max-height: 90vh
│  ├─ Overflow: auto
│  ├─ z-index: 300
│  │
│  └─ Close on:
│     ├─ Close button (X)
│     ├─ Overlay click
│     ├─ Back button
│     └─ Swipe down (on mobile)
│
├─ HEADER (sticky, inside modal):
│  ├─ Close button:
│  │  ├─ Position: Top-right
│  │  ├─ Icon: X (24x24px)
│  │  ├─ Background: transparent
│  │  ├─ Padding: 12px
│  │  └─ Cursor: pointer
│  │
│  └─ Drag handle (optional):
│     ├─ Position: Top-center
│     ├─ Height: 4px, Width: 40px
│     ├─ Background: #D0D0D0
│     ├─ Border-radius: 2px
│     └─ Margin-bottom: 8px
│
├─ CONTENT:
│  ├─ Image section:
│  │  ├─ Size: 100% width, 200px height
│  │  ├─ object-fit: cover
│  │  ├─ Position: Sticky (top of modal)
│  │  └─ margin-bottom: 16px
│  │
│  ├─ Info section (padding: 16px):
│  │  ├─ Name:
│  │  │  ├─ Font: 20px, weight 700
│  │  │  ├─ Color: #1A1A1A
│  │  │  └─ Margin-bottom: 8px
│  │  │
│  │  ├─ Price:
│  │  │  ├─ Font: 18px, weight 700
│  │  │  ├─ Color: #FF6B35
│  │  │  └─ Margin-bottom: 12px
│  │  │
│  │  └─ Description:
│  │     ├─ Font: 14px, weight 400
│  │     ├─ Color: #666
│  │     ├─ Line-height: 1.5
│  │     └─ Margin-bottom: 16px
│  │
│  ├─ ADD-ON CATEGORIES SECTION (padding: 16px):
│  │  │
│  │  ├─ Add-on category 1:
│  │  │  ├─ Header:
│  │  │  │  ├─ Category name: "Roti Tawar Pandan"
│  │  │  │  │  ├─ Font: 14px, weight 600
│  │  │  │  │  ├─ Color: #1A1A1A
│  │  │  │  │  └─ Margin-bottom: 4px
│  │  │  │  │
│  │  │  │  └─ Type label: "(Opsional)" or "(Wajib)"
│  │  │  │     ├─ Font: 12px, weight 400
│  │  │  │     ├─ Color: #999
│  │  │  │     └─ Margin-bottom: 8px
│  │  │  │
│  │  │  └─ Items list:
│  │  │     ├─ Item 1:
│  │  │     │  ├─ Layout: Flex row (align: center)
│  │  │     │  ├─ Padding: 12px 0
│  │  │     │  ├─ Border-bottom: 1px solid #F0F0F0
│  │  │     │  │
│  │  │     │  ├─ Checkbox:
│  │  │     │  │  ├─ Size: 20x20px
│  │  │     │  │  ├─ Type: checkbox (or radio if single select)
│  │  │     │  │  ├─ Margin-right: 12px
│  │  │     │  │  └─ Cursor: pointer
│  │  │     │  │
│  │  │     │  ├─ Label:
│  │  │     │  │  ├─ Text: "Roti Tawar Pandan"
│  │  │     │  │  ├─ Font: 14px, weight 400
│  │  │     │  │  ├─ Color: #1A1A1A
│  │  │     │  │  ├─ Flex: 1
│  │  │     │  │  └─ Cursor: pointer
│  │  │     │  │
│  │  │     │  └─ Price badge:
│  │  │     │     ├─ Text: "+ Rp 1.500"
│  │  │     │     ├─ Font: 12px, weight 600
│  │  │     │     ├─ Color: #FF6B35 or #999
│  │  │     │     └─ Margin-left: 8px
│  │  │     │
│  │  │     ├─ Item 2, 3, etc.
│  │  │     │  └─ Same structure
│  │  │     │
│  │  │     └─ Last item: No border-bottom
│  │  │
│  │  └─ Add-on category 2, 3, etc.
│  │     └─ Same structure
│  │
│  ├─ NOTES SECTION (padding: 16px):
│  │  ├─ Label: "Catatan"
│  │  │         Font: 14px, weight 600
│  │  │         Color: #1A1A1A
│  │  │         Margin-bottom: 8px
│  │  │
│  │  ├─ Textarea:
│  │  │  ├─ Min-height: 80px
│  │  │  ├─ Padding: 12px
│  │  │  ├─ Border: 1px solid #E0E0E0
│  │  │  ├─ Border-radius: 8px
│  │  │  ├─ Font-size: 14px
│  │  │  ├─ Font-family: inherit
│  │  │  ├─ Resize: vertical
│  │  │  ├─ Placeholder: "Contoh: Sedikit gula, tidak pedas"
│  │  │  └─ Max-length: 200
│  │  │
│  │  └─ Character count:
│  │     ├─ Text: "[current]/200"
│  │     ├─ Font: 12px, weight 400
│  │     ├─ Color: #999
│  │     ├─ Text-align: right
│  │     └─ Margin-top: 4px
│  │
│  └─ QUANTITY SECTION (padding: 16px, margin-top: 8px):
│     ├─ Label: "Jumlah Pesanan"
│     │         Font: 14px, weight 600
│     │         Color: #1A1A1A
│     │         Margin-bottom: 12px
│     │
│     └─ Quantity controls:
│        ├─ Layout: Flex row, justify: center, align: center
│        ├─ Gap: 16px
│        │
│        ├─ Minus button:
│        │  ├─ Size: 40x40px
│        │  ├─ Border: 1px solid #E0E0E0
│        │  ├─ Background: White
│        │  ├─ Border-radius: 8px
│        │  ├─ Icon: Minus/dash (16x16px)
│        │  ├─ Color: #1A1A1A
│        │  ├─ Cursor: pointer
│        │  ├─ Disabled: opacity 0.5 if qty = 1
│        │  └─ Action: quantity--
│        │
│        ├─ Quantity display:
│        │  ├─ Size: 60px
│        │  ├─ Text: "1" (centered)
│        │  ├─ Font: 16px, weight 600
│        │  ├─ Color: #1A1A1A
│        │  └─ Read-only
│        │
│        └─ Plus button:
│           ├─ Same styling as Minus button
│           ├─ Icon: Plus (+)
│           └─ Action: quantity++
│
├─ STICKY BOTTOM BUTTON:
│  ├─ Position: Sticky bottom (inside modal)
│  ├─ Width: 100% - 32px (16px margin each side)
│  ├─ Height: 48px
│  ├─ Background: #FF6B35
│  ├─ Color: White
│  ├─ Font: 16px, weight 600
│  ├─ Border-radius: 8px
│  ├─ Padding: 12px 16px
│  ├─ Margin: 16px
│  ├─ Box-shadow: 0 -2px 8px rgba(0,0,0,0.1)
│  ├─ Cursor: pointer
│  │
│  ├─ Text: "Tambah Pesanan - Rp[calculatedPrice]"
│  │
│  ├─ Calculated price:
│  │  ├─ Formula: (basePrice + selected_addons_total) * quantity
│  │  ├─ Updated in real-time as user selects addons & quantity
│  │  └─ Format: "Rp10.000" (Indonesian format)
│  │
│  └─ Action: Click → 
│     ├─ Add item to cart (localStorage)
│     ├─ Update floating cart button
│     ├─ Close modal
│     └─ Show success toast (optional)
│
├─ DATA STRUCTURE:
│  ├─ menuItem: {
│  │  id: 123,
│  │  name: "Nasi Geprek",
│  │  price: 23000,
│  │  description: "...",
│  │  image: "url",
│  │  addons: [
│  │    {
│  │      categoryId: 1,
│  │      categoryName: "Roti Tawar Pandan",
│  │      isRequired: false,
│  │      items: [
│  │        { id: 45, name: "Roti Tawar Pandan", price: 1500 },
│  │        { id: 46, name: "Kacang Hijau (40 gr)", price: 4000 }
│  │      ]
│  │    }
│  │  ]
│  │}
│  │
│  └─ selectedAddons: Array of selected addon IDs
│
├─ Data Fetching:
│  ├─ GET /api/menus/[menuId]?include=addons
│  ├─ Returns: { id, name, price, description, image, addons: [...] }
│  ├─ Fetch on modal open (if not already in cache)
│  └─ Cache: Store in context to avoid re-fetch
│
└─ State Management:
   ├─ useState: quantity, selectedAddons, notes
   ├─ useContext: Cart context (addItem function)
   ├─ useCallback: Calculate price on addon/qty change
   └─ useEffect: Reset state on modal open

┌─ 8. CART REVIEW PAGE ──────────────────────────────────────────────────────
│
├─ URL: GET /:merchantCode/view-order?mode=[dinein|takeaway]
├─ Component: ViewOrderPage
│
├─ Header:
│  ├─ Height: 56px
│  ├─ Background: White
│  ├─ Position: Fixed top, z-index: 100
│  ├─ Padding: 12px 16px
│  ├─ Border-bottom: 1px solid #E0E0E0
│  │
│  ├─ Left: Back button
│  │        Action: Navigate back to /[merchantCode]/order?mode=[mode]
│  │
│  ├─ Center: "Pesanan" title
│  │           Font: 16px, weight 600
│  │           Color: #1A1A1A
│  │
│  └─ Right: Icons (optional)
│
├─ CONTENT (padding-top: 72px to account for fixed header):
│  │
│  ├─ MODE INFORMATION SECTION (padding: 16px):
│  │  ├─ Label & value row:
│  │  │  ├─ Label: "Tipe Pemesanan"
│  │  │  │         Font: 13px, weight 600, color: #999
│  │  │  │
│  │  │  └─ Value: "Ambil Sendiri" | "Makan di Tempat"
│  │  │          Font: 14px, weight 600, color: #1A1A1A
│  │  │
│  │  ├─ Divider: 1px solid #F0F0F0, margin: 12px 0
│  │  │
│  │  └─ Delivery time row:
│  │     ├─ Label: "Diambil" (TAKEAWAY) | "Mulai Diambil" (DINEIN)
│  │     │         Font: 13px, weight 600, color: #999
│  │     │
│  │     └─ Value: "Sekarang" | "Jam [HH:MM]"
│  │              Font: 14px, weight 600, color: #1A1A1A
│
│  ├─ CART ITEMS SECTION:
│  │  ├─ Header:
│  │  │  ├─ Text: "Item yang dipesan ([count])"
│  │  │  │         Font: 14px, weight 600
│  │  │  │         Color: #1A1A1A
│  │  │  │         Padding: 16px 16px 0
│  │  │  │         Margin-bottom: 12px
│  │  │
│  │  └─ Item list:
│  │     ├─ Item 1:
│  │     │  ├─ Container:
│  │     │  │  ├─ Padding: 16px
│  │     │  │  ├─ Border-bottom: 1px solid #F0F0F0
│  │     │  │  └─ Layout: Flex row
│  │     │  │
│  │     │  ├─ Item image (if available):
│  │     │  │  ├─ Size: 60x60px
│  │     │  │  ├─ Border-radius: 8px
│  │     │  │  ├─ object-fit: cover
│  │     │  │  ├─ Margin-right: 12px
│  │     │  │  └─ Background: #F0F0F0 (placeholder)
│  │     │  │
│  │     │  ├─ Item info (flex: 1):
│  │     │  │  ├─ Name:
│  │     │  │  │  ├─ Font: 14px, weight 600
│  │     │  │  │  ├─ Color: #1A1A1A
│  │     │  │  │  └─ Margin-bottom: 4px
│  │     │  │  │
│  │     │  │  ├─ Add-ons (if selected):
│  │     │  │  │  ├─ Text: "1x Roti Tawar Pandan, 1x Kacang Hijau"
│  │     │  │  │  ├─ Font: 12px, weight 400, color: #999
│  │     │  │  │  ├─ Margin-bottom: 4px
│  │     │  │  │  └─ White-space: wrap (max 2 lines)
│  │     │  │  │
│  │     │  │  ├─ Notes (if provided):
│  │     │  │  │  ├─ Text: "tes"
│  │     │  │  │  ├─ Font-style: italic
│  │     │  │  │  ├─ Font: 12px, weight 400, color: #999
│  │     │  │  │  └─ Margin-bottom: 4px
│  │     │  │  │
│  │     │  │  └─ Price:
│  │     │  │     ├─ Font: 14px, weight 700
│  │     │  │     ├─ Color: #FF6B35
│  │     │  │     └─ Margin-top: 4px
│  │     │  │
│  │     │  └─ Quantity & actions (right side):
│  │     │     ├─ Quantity display:
│  │     │     │  ├─ Text: "1"
│  │     │     │  ├─ Font: 14px, weight 600
│  │     │     │  ├─ Color: #1A1A1A
│  │     │     │  └─ Centered
│  │     │     │
│  │     │     └─ Action buttons (row, gap: 8px):
│  │     │        ├─ Edit button:
│  │     │        │  ├─ Icon: Pencil (16x16px)
│  │     │        │  ├─ Size: 32x32px
│  │     │        │  ├─ Background: #F5F5F5
│  │     │        │  ├─ Border-radius: 6px
│  │     │        │  ├─ Cursor: pointer
│  │     │        │  └─ Action: Open MenuDetail modal with pre-filled data
│  │     │        │
│  │     │        └─ Remove button:
│  │     │           ├─ Icon: Trash (16x16px)
│  │     │           ├─ Size: 32x32px
│  │     │           ├─ Background: #FFE5E5
│  │     │           ├─ Color: #FF5252
│  │     │           ├─ Border-radius: 6px
│  │     │           ├─ Cursor: pointer
│  │     │           └─ Action: Remove from cart, update total
│  │     │
│  │     └─ Item 2, 3, etc.
│  │        └─ Same structure
│
│  ├─ COST BREAKDOWN SECTION (padding: 16px, margin-top: 16px):
│  │  ├─ Container:
│  │  │  ├─ Background: #F9F9F9 or #F5F5F5
│  │  │  ├─ Border-radius: 8px
│  │  │  ├─ Padding: 16px
│  │  │  └─ Margin: 16px
│  │  │
│  │  ├─ Row 1: Subtotal
│  │  │  ├─ Left: "Subtotal" (Font: 13px, weight 400, color: #666)
│  │  │  ├─ Right: "Rp[X]" (Font: 13px, weight 600, color: #1A1A1A)
│  │  │  ├─ Display: flex, justify-content: space-between
│  │  │  └─ Margin-bottom: 12px
│  │  │
│  │  ├─ Row 2: Tax/Fee (if applicable)
│  │  │  ├─ Left: "Pajak" | "Biaya Layanan"
│  │  │  ├─ Right: "Rp[Y]"
│  │  │  └─ Same styling as Row 1
│  │  │
│  │  ├─ Divider: 1px solid #E0E0E0, margin: 12px 0
│  │  │
│  │  └─ Row 3: Total (emphasized)
│  │     ├─ Left: "Total Pesanan" (Font: 14px, weight 600, color: #1A1A1A)
│  │     ├─ Right: "Rp[Z]" (Font: 18px, weight 700, color: #FF6B35)
│  │     └─ Display: flex, justify-content: space-between
│
│  └─ ACTION BUTTONS SECTION (padding: 16px, margin-top: 24px):
│     ├─ Button 1: "Tambah Item"
│     │  ├─ Width: 100%
│     │  ├─ Height: 44px
│     │  ├─ Background: transparent
│     │  ├─ Color: #FF6B35
│     │  ├─ Border: 2px solid #FF6B35
│     │  ├─ Font: 14px, weight 600
│     │  ├─ Border-radius: 8px
│     │  ├─ Margin-bottom: 12px
│     │  └─ Action: Navigate to /[merchantCode]/order?mode=[mode]
│     │
│     └─ Button 2: "Lanjut ke Pembayaran" (primary)
│        ├─ Width: 100%
│        ├─ Height: 48px
│        ├─ Background: #FF6B35
│        ├─ Color: White
│        ├─ Font: 14px, weight 600
│        ├─ Border-radius: 8px
│        ├─ Action: Navigate to /[merchantCode]/payment?mode=[mode]
│        └─ Disabled: if cart is empty
│
├─ Data:
│  ├─ Fetch from localStorage[cart_[merchantCode]_[mode]]
│  └─ Display items, calculate totals
│
├─ State Management:
│  ├─ useContext: Cart context (items, total, removeItem, updateItem)
│  ├─ useEffect: Load cart from localStorage on mount
│  └─ useCallback: Handle remove/edit actions

└─ Empty state:
   ├─ Icon: Empty box (48x48px)
   ├─ Title: "Keranjang Kosong"
   ├─ Message: "Tambahkan menu untuk mulai memesan"
   ├─ Button: "Lihat Menu" → /[merchantCode]/order?mode=[mode]
   └─ Centered on page

┌─ 9. PAYMENT & USER INFO PAGE ────────────────────────────────────────────
│
├─ URL: GET /:merchantCode/payment?mode=[dinein|takeaway]
├─ Component: PaymentPage
│
├─ AUTHENTICATION CHECK (on mount):
│  ├─ If NOT logged in:
│  │  ├─ Show: Dialog/modal asking "Sudah punya akun?"
│  │  ├─ Option 1: "Ya, Login" → Navigate to /login?ref=...
│  │  ├─ Option 2: "Tidak, Lanjut Sebagai Tamu"
│  │  │            → Proceed to form (fields not pre-filled)
│  │  └─ Close modal on option selection
│  │
│  └─ If logged in:
│     └─ Pre-fill form with user data from context/JWT
│
├─ Header:
│  ├─ Fixed top, same styling as other pages
│  ├─ Title: "Pembayaran"
│  ├─ Back button: Navigate to /[merchantCode]/view-order?mode=[mode]
│  └─ z-index: 100
│
├─ CONTENT (padding-top: 72px):
│  │
│  ├─ MODE INFORMATION (padding: 16px):
│  │  ├─ Label: "Tipe Pemesanan"
│  │  │         Font: 13px, weight 600, color: #999
│  │  │
│  │  └─ Value: "Ambil Sendiri" | "Makan di Tempat" (read-only)
│  │           Font: 14px, weight 600, color: #1A1A1A
│  │
│  ├─ CUSTOMER INFO FORM (padding: 16px):
│  │  │
│  │  ├─ Field 1: Nama Lengkap
│  │  │  ├─ Label: "Nama Lengkap*" (required indicator *)
│  │  │  │         Font: 14px, weight 600
│  │  │  │         Margin-bottom: 8px
│  │  │  │
│  │  │  ├─ Input:
│  │  │  │  ├─ Type: text
│  │  │  │  ├─ Placeholder: "Muhammad Yoga Adi Saputra"
│  │  │  │  ├─ Height: 48px
│  │  │  │  ├─ Padding: 12px
│  │  │  │  ├─ Border: 1px solid #E0E0E0
│  │  │  │  ├─ Border-radius: 8px
│  │  │  │  ├─ Font-size: 14px
│  │  │  │  ├─ Pre-filled: Yes (if logged in)
│  │  │  │  ├─ Margin-bottom: 16px
│  │  │  │  └─ Disabled: No (user can edit)
│  │  │  │
│  │  │  └─ Validation: Required, min 3 chars
│  │  │
│  │  ├─ Field 2: Nomor Ponsel
│  │  │  ├─ Label: "Nomor Ponsel*" (required, format info)
│  │  │  │         Font: 14px, weight 600
│  │  │  │         Sub-label: "(untuk info promo)" - Font: 12px, color: #999
│  │  │  │
│  │  │  ├─ Input:
│  │  │  │  ├─ Type: tel
│  │  │  │  ├─ Placeholder: "0896-6817-6764"
│  │  │  │  ├─ Height: 48px
│  │  │  │  ├─ Same styling as name field
│  │  │  │  ├─ Pre-filled: Yes (if logged in)
│  │  │  │  └─ Margin-bottom: 16px
│  │  │  │
│  │  │  └─ Validation: Required, phone format
│  │  │
│  │  ├─ Field 3: Email
│  │  │  ├─ Label: "Kirim Struk ke Email*" (required)
│  │  │  │         Font: 14px, weight 600
│  │  │  │
│  │  │  ├─ Input:
│  │  │  │  ├─ Type: email
│  │  │  │  ├─ Placeholder: "m.yogaadi1234@gmail.com"
│  │  │  │  ├─ Height: 48px
│  │  │  │  ├─ Same styling as above
│  │  │  │  ├─ Pre-filled: Yes (if logged in)
│  │  │  │  └─ Margin-bottom: 16px
│  │  │  │
│  │  │  ├─ Validation: Required, valid email format
│  │  │  │
│  │  │  └─ Important note:
│  │  │     ├─ TEXT: "Email ini adalah key unik untuk account Anda"
│  │  │     ├─ Font: 12px, weight 400, color: #FF6B35
│  │  │     ├─ Background: #FFF5F0
│  │  │     ├─ Padding: 8px 12px
│  │  │     ├─ Border-radius: 6px
│  │  │     ├─ Border-left: 3px solid #FF6B35
│  │  │     └─ Margin-top: 4px
│  │  │
│  │  └─ Field 4: Nomor Meja (DINEIN ONLY)
│  │     ├─ Show: If mode === "dinein"
│  │     ├─ Label: "Nomor Meja*" (required)
│  │     │         Font: 14px, weight 600
│  │     │
│  │     ├─ Input:
│  │     │  ├─ Type: number
│  │     │  ├─ Value: Pre-filled from localStorage[table_[merchantCode]_dinein]
│  │     │  ├─ Height: 48px
│  │     │  ├─ Same styling as above
│  │     │  ├─ Disabled: true (read-only)
│  │     │  ├─ Background: #F5F5F5 (disabled state)
│  │     │  └─ Margin-bottom: 16px
│  │     │
│  │     └─ Change button:
│  │        ├─ Text: "Ubah"
│  │        ├─ Position: Inside field, right side
│  │        ├─ Font: 12px, weight 600, color: #FF6B35
│  │        ├─ Cursor: pointer
│  │        └─ Action: Navigate back to /:merchantCode for re-selection
│  │
│  ├─ DELIVERY TIME (TAKEAWAY ONLY):
│  │  ├─ Show: If mode === "takeaway"
│  │  ├─ Label: "Ambil Nanti" or "Diambil Pada"
│  │  ├─ Time picker or fixed "Sekarang" option
│  │  └─ Default: "Sekarang"
│  │
│  ├─ COST SUMMARY SECTION:
│  │  ├─ Same styling as view-order page
│  │  ├─ Subtotal, Tax, Total
│  │  └─ Read-only display
│  │
│  ├─ PAYMENT METHOD SECTION:
│  │  ├─ Title: "Metode Pembayaran"
│  │  │         Font: 14px, weight 600
│  │  │         Margin: 24px 16px 16px
│  │  │
│  │  └─ Payment option: "Bayar di Kasir"
│  │     ├─ Button:
│  │     │  ├─ Width: 100%
│  │     │  ├─ Height: 48px
│  │     │  ├─ Background: #FF6B35
│  │     │  ├─ Color: White
│  │     │  ├─ Font: 14px, weight 600
│  │     │  ├─ Border-radius: 8px
│  │     │  ├─ Icon: Credit card or cash icon (left)
│  │     │  └─ Margin: 16px (bottom)
│  │     │
│  │     └─ Instruction note (below button):
│  │        ├─ Text: "Klik 'Bayar di Kasir' lalu tunjukkan QR ke kasir."
│  │        ├─ Font: 12px, weight 400, color: #666
│  │        ├─ Background: #F9F9F9
│  │        ├─ Padding: 12px
│  │        ├─ Border-radius: 6px
│  │        ├─ Border-left: 2px solid #FF6B35
│  │        └─ Margin-bottom: 24px
│  │
│  └─ SUBMIT BUTTON:
│     ├─ Text: "Proses Pembayaran" or "Bayar di Kasir"
│     ├─ Width: 100%
│     ├─ Height: 48px
│     ├─ Background: #FF6B35
│     ├─ Color: White
│     ├─ Font: 16px, weight 600
│     ├─ Border-radius: 8px
│     ├─ Margin: 16px
│     ├─ Position: Sticky bottom (if form is long)
│     │
│     └─ On click:
│        ├─ Validate all required fields
│        ├─ Show confirmation modal (see next section)
│        └─ Disabled: true if form has errors
│
├─ Form Validation:
│  ├─ All fields required (marked with *)
│  ├─ Email: Valid email format
│  ├─ Phone: Valid phone format
│  ├─ Name: Min 3 characters
│  └─ Error messages: Display below each field (Font: 12px, color: #FF5252)
│
├─ Auto-registration Logic:
│  ├─ On submit:
│  │  ├─ Check if email already exists in database
│  │  ├─ If exists: Auto login (no password needed)
│  │  ├─ If new: Auto-create account with email as unique key
│  │  ├─ Store: name, phone, email (update if already exists)
│  │  └─ Return: accessToken + JWT
│  │
│  └─ Use case: Customer uses different phone/name but same email
│     └─ Result: Update their profile with new info
│
└─ State Management:
   ├─ useState: formData { name, phone, email, tableNumber }
   ├─ useState: errors { name, phone, email, etc }
   ├─ useContext: Auth context (user, login function)
   ├─ useCallback: Validate form on blur/submit
   └─ useEffect: Pre-fill form from context/localStorage

┌─ 10. PAYMENT CONFIRMATION MODAL ───────────────────────────────────────────
│
├─ Trigger: User clicks "Bayar di Kasir" button on payment page
├─ Component: ConfirmationModal
│
├─ Presentation:
│  ├─ Position: Center of screen
│  ├─ Background overlay: rgba(0,0,0,0.5)
│  ├─ Modal background: White
│  ├─ Border-radius: 12px
│  ├─ Padding: 24px
│  ├─ Max-width: 350px
│  ├─ z-index: 400
│  └─ Animation: Fade in 0.2s
│
├─ CONTENT:
│  ├─ Icon (top):
│  │  ├─ Icon: Question mark or info icon (48x48px)
│  │  ├─ Color: #FF6B35
│  │  ├─ Centered
│  │  └─ Margin-bottom: 16px
│  │
│  ├─ Title:
│  │  ├─ Text: "Proses pembayaran sekarang?"
│  │  ├─ Font: 18px, weight 700
│  │  ├─ Color: #1A1A1A
│  │  ├─ Centered
│  │  └─ Margin-bottom: 12px
│  │
│  ├─ Message (optional):
│  │  ├─ Text: "Pesanan Anda akan diproses oleh kasir"
│  │  ├─ Font: 14px, weight 400
│  │  ├─ Color: #666
│  │  ├─ Centered
│  │  ├─ Line-height: 1.5
│  │  └─ Margin-bottom: 24px
│  │
│  ├─ Order summary (optional):
│  │  ├─ Show quick summary of order
│  │  ├─ Total: "Rp[X]" (Font: 16px, weight 700, color: #FF6B35)
│  │  └─ Margin-bottom: 24px
│  │
│  └─ Button row:
│     ├─ Button 1: "Batalkan" (secondary)
│     │  ├─ Width: 48% (flex: 1)
│     │  ├─ Height: 44px
│     │  ├─ Background: transparent
│     │  ├─ Color: #FF6B35
│     │  ├─ Border: 2px solid #FF6B35
│     │  ├─ Font: 14px, weight 600
│     │  ├─ Border-radius: 8px
│     │  └─ Action: Close modal, stay on payment page
│     │
│     ├─ Gap: 12px
│     │
│     └─ Button 2: "Lanjut" (primary)
│        ├─ Width: 48% (flex: 1)
│        ├─ Height: 44px
│        ├─ Background: #FF6B35
│        ├─ Color: White
│        ├─ Font: 14px, weight 600
│        ├─ Border-radius: 8px
│        └─ Action: 
│           ├─ Show loading spinner
│           ├─ POST /api/orders (create order)
│           ├─ On success: Redirect to order-summary page
│           └─ On error: Show error toast
│
└─ State Management:
   ├─ useState: isOpen (trigger by submit button)
   ├─ useState: isLoading (while processing)
   └─ useCallback: Handle confirm & cancel actions

┌─ 11. ORDER SUMMARY & COMPLETION PAGE ───────────────────────────────────────
│
├─ URL: GET /:merchantCode/order-summary-cash?mode=[dinein|takeaway]
├─ Component: OrderSummaryPage
│
├─ Header:
│  ├─ Fixed top, same styling
│  ├─ Title: "Ringkasan Pesanan"
│  ├─ No back button (or disable back)
│  └─ z-index: 100
│
├─ CONTENT (padding-top: 72px):
│  │
│  ├─ MODE INFORMATION:
│  │  ├─ Label: "Tipe Pemesanan"
│  │  └─ Value: "Ambil Sendiri" | "Makan di Tempat"
│  │
│  ├─ ORDER NUMBER SECTION:
│  │  ├─ Title: "Nomor Pesanan"
│  │  │         Font: 14px, weight 600
│  │  │         Color: #999
│  │  │         Margin-bottom: 8px
│  │  │
│  │  ├─ Order number display:
│  │  │  ├─ Container:
│  │  │  │  ├─ Background: #F5F5F5
│  │  │  │  ├─ Padding: 16px
│  │  │  │  ├─ Border-radius: 8px
│  │  │  │  ├─ Margin: 16px 16px 0
│  │  │  │  └─ Layout: Flex, space-between
│  │  │  │
│  │  │  ├─ Left: "BRJOBNG CBDJNDU1"
│  │  │  │       Font: 20px, weight 700, color: #1A1A1A
│  │  │  │
│  │  │  └─ Right: Copy button
│  │  │           ├─ Icon: Copy/clipboard (20x20px)
│  │  │           ├─ Color: #FF6B35
│  │  │           ├─ Cursor: pointer
│  │  │           ├─ Background: transparent
│  │  │           └─ Action: Copy to clipboard
│  │  │
│  │  ├─ QR Code section (below order number):
│  │  │  ├─ Container:
│  │  │  │  ├─ Padding: 16px
│  │  │  │  ├─ Background: White
│  │  │  │  ├─ Border-radius: 8px
│  │  │  │  └─ Margin: 12px 16px 0
│  │  │  │
│  │  │  ├─ QR code image:
│  │  │  │  ├─ Size: 150x150px
│  │  │  │  ├─ Background: White
│  │  │  │  ├─ Centered
│  │  │  │  ├─ Margin: 0 auto
│  │  │  │  └─ Generated from order ID
│  │  │  │
│  │  │  └─ Instruction note (below QR):
│  │  │     ├─ Text: "Silakan tunjukkan QR atau 8 digit nomor pesanan ke staff kasir kami"
│  │  │     ├─ Font: 12px, weight 400, color: #666
│  │  │     ├─ Background: #FFFAF0 or #FFF5E6 (warm yellow)
│  │  │     ├─ Padding: 12px
│  │  │     ├─ Border-radius: 6px
│  │  │     ├─ Border-left: 3px solid #FFA500 or warning color
│  │  │     ├─ Margin-top: 12px
│  │  │     ├─ Text-align: left
│  │  │     └─ Icon: Warning/info triangle (left)
│  │  │
│  │  └─ Format explanation:
│  │     ├─ Merchant code: "BRJOBNG" (from merchant)
│  │     └─ Random unique: "CBDJNDU1" (8 characters, generated)
│  │
│  ├─ ITEMS ORDERED SECTION:
│  │  ├─ Header: "Item yang dipesan"
│  │  │           Font: 14px, weight 600
│  │  │           Padding: 16px 16px 0
│  │  │           Margin: 24px 0 12px
│  │  │
│  │  └─ Item list (read-only):
│  │     ├─ Item 1:
│  │     │  ├─ Container:
│  │     │  │  ├─ Padding: 16px
│  │     │  │  ├─ Border-bottom: 1px solid #F0F0F0
│  │     │  │  └─ Flex row
│  │     │  │
│  │     │  ├─ Item image (if available):
│  │     │  │  ├─ Size: 50x50px
│  │     │  │  ├─ Border-radius: 6px
│  │     │  │  ├─ Margin-right: 12px
│  │     │  │  └─ object-fit: cover
│  │     │  │
│  │     │  ├─ Item info (flex: 1):
│  │     │  │  ├─ Name:
│  │     │  │  │  ├─ Font: 13px, weight 600
│  │     │  │  │  ├─ Color: #1A1A1A
│  │     │  │  │  └─ Margin-bottom: 4px
│  │     │  │  │
│  │     │  │  ├─ Add-ons (if any):
│  │     │  │  │  ├─ Text: "1x Roti Tawar Pandan"
│  │     │  │  │  ├─ Font: 11px, weight 400, color: #999
│  │     │  │  │  ├─ Margin-bottom: 4px
│  │     │  │  │  └─ Display each on separate line
│  │     │  │  │
│  │     │  │  └─ Price + Qty:
│  │     │  │     ├─ Text: "[Qty] x Rp[Price]"
│  │     │  │     ├─ Font: 12px, weight 600
│  │     │  │     ├─ Color: #FF6B35
│  │     │  │     └─ Example: "1 x Rp19.000"
│  │     │  │
│  │     │  └─ Total for this item (right side):
│  │     │     ├─ Font: 13px, weight 700
│  │     │     ├─ Color: #FF6B35
│  │     │     └─ Example: "Rp19.000"
│  │     │
│  │     └─ Item 2, 3, etc.
│  │        └─ Same structure
│  │
│  ├─ COST SUMMARY:
│  │  ├─ Same as previous pages
│  │  ├─ Subtotal, Tax/Fee, Total
│  │  └─ Read-only
│  │
│  └─ ACTION BUTTON (sticky bottom):
│     ├─ Text: "Pesan Baru"
│     ├─ Width: 100%
│     ├─ Height: 48px
│     ├─ Background: #FF6B35
│     ├─ Color: White
│     ├─ Font: 16px, weight 600
│     ├─ Border-radius: 8px
│     ├─ Margin: 16px
│     ├─ Position: Sticky bottom
│     │
│     └─ Action: Click →
│        ├─ Clear cart from localStorage (delete cart_[merchantCode]_[mode])
│        ├─ Clear table number from localStorage (delete table_[merchantCode]_dinein)
│        ├─ Navigate to /[merchantCode]/home?mode=[mode]
│        │ (or show mode selection if needed)
│        └─ Show success toast (optional)
│
├─ Data Display:
│  ├─ Fetch from query params or API response
│  ├─ Show order details (passed from POST /api/orders response)
│  └─ No additional API calls needed on page load
│
├─ Data to store/display:
│  ├─ Order ID
│  ├─ Order number
│  ├─ QR code URL
│  ├─ Items list
│  ├─ Total amount
│  ├─ Mode (dinein/takeaway)
│  └─ Timestamp
│
└─ State Management:
   ├─ useState: orderData (from route params or location state)
   ├─ useEffect: Retrieve order details if not already loaded
   └─ useCallback: Handle new order button click

┌─ 12. USER PROFILE & ORDER HISTORY ─────────────────────────────────────────
│
├─ URL: GET /:merchantCode/profile?mode=[dinein|takeaway]&ref=%2F...
├─ Component: ProfilePage
│
├─ Header:
│  ├─ Fixed top
│  ├─ Title: "Akun Saya"
│  ├─ Back button: Use ref param to navigate back
│  └─ z-index: 100
│
├─ TAB NAVIGATION (below header):
│  ├─ Height: 56px
│  ├─ Background: White
│  ├─ Border-bottom: 1px solid #E0E0E0
│  ├─ Padding: 12px 16px
│  ├─ Layout: Flex, gap 16px
│  │
│  ├─ Tab 1: "Akun"
│  │  ├─ Font: 14px, weight 500
│  │  ├─ Color (active): #FF6B35
│  │  ├─ Color (inactive): #999
│  │  ├─ Border-bottom (active): 3px solid #FF6B35
│  │  └─ Action: Show account info section
│  │
│  └─ Tab 2: "Riwayat Pesanan"
│     ├─ Same styling as Tab 1
│     └─ Action: Show order history section
│
├─ TAB 1: ACCOUNT INFO SECTION:
│  ├─ Container (padding: 16px):
│  │
│  ├─ User avatar:
│  │  ├─ Size: 80x80px
│  │  ├─ Border-radius: 50% (circle)
│  │  ├─ Background: #E0E0E0 (placeholder)
│  │  ├─ Margin: 0 auto 16px
│  │  └─ Display: centered
│  │
│  ├─ User info:
│  │  ├─ Name:
│  │  │  ├─ Font: 18px, weight 700
│  │  │  ├─ Color: #1A1A1A
│  │  │  ├─ Centered
│  │  │  └─ Margin-bottom: 8px
│  │  │
│  │  └─ Email:
│  │     ├─ Font: 13px, weight 400, color: #999
│  │     ├─ Centered
│  │     └─ Margin-bottom: 24px
│  │
│  ├─ Info rows:
│  │  ├─ Phone:
│  │  │  ├─ Label: "Nomor Ponsel"
│  │  │  │         Font: 12px, weight 600, color: #999
│  │  │  ├─ Value: "[phone]"
│  │  │  │         Font: 14px, weight 500, color: #1A1A1A
│  │  │  ├─ Padding: 12px 0
│  │  │  ├─ Border-bottom: 1px solid #F0F0F0
│  │  │  └─ Margin-bottom: 12px
│  │  │
│  │  └─ Email (again):
│  │     ├─ Label: "Email"
│  │     ├─ Value: "[email]"
│  │     └─ Same styling as phone row
│  │
│  ├─ Edit button:
│  │  ├─ Text: "Ubah Profil"
│  │  ├─ Width: 100%
│  │  ├─ Height: 44px
│  │  ├─ Background: #F5F5F5
│  │  ├─ Color: #1A1A1A
│  │  ├─ Font: 14px, weight 600
│  │  ├─ Border-radius: 8px
│  │  ├─ Margin: 24px 0 16px
│  │  └─ Action: Navigate to /profile/edit (or show edit modal)
│  │
│  └─ Logout button:
│     ├─ Text: "Keluar"
│     ├─ Width: 100%
│     ├─ Height: 44px
│     ├─ Background: transparent
│     ├─ Color: #FF5252 (red)
│     ├─ Border: 2px solid #FF5252
│     ├─ Font: 14px, weight 600
│     ├─ Border-radius: 8px
│     │
│     └─ Action: Click →
│        ├─ Show confirmation modal
│        ├─ On confirm: 
│        │  ├─ Call POST /api/auth/logout
│        │  ├─ Clear localStorage
│        │  ├─ Clear context
│        │  ├─ Clear cookies
│        │  └─ Redirect to / (landing page)
│        └─ On cancel: Close modal
│
├─ TAB 2: ORDER HISTORY SECTION:
│  ├─ Title: "Riwayat Pesanan"
│  │         Font: 14px, weight 600
│  │         Padding: 16px 16px 0
│  │         Margin-bottom: 12px
│  │
│  ├─ Order list (scrollable):
│  │  ├─ Order item:
│  │  │  ├─ Container:
│  │  │  │  ├─ Padding: 12px 16px
│  │  │  │  ├─ Margin-bottom: 8px
│  │  │  │  ├─ Background: White
│  │  │  │  ├─ Border: 1px solid #E0E0E0
│  │  │  │  ├─ Border-radius: 8px
│  │  │  │  ├─ Cursor: pointer
│  │  │  │  └─ Action: Click → Navigate to order detail page (if available)
│  │  │  │
│  │  │  ├─ Top row (justify-content: space-between):
│  │  │  │  ├─ Left: Order number
│  │  │  │  │        Font: 14px, weight 600, color: #1A1A1A
│  │  │  │  │        Text: "[MERCHANTCODE] [ID]"
│  │  │  │  │
│  │  │  │  └─ Right: Status badge
│  │  │  │           ├─ Possible statuses:
│  │  │  │           │  ├─ "Selesai" → Green (#4CAF50)
│  │  │  │           │  ├─ "Diproses" → Blue (#2196F3)
│  │  │  │           │  ├─ "Dibatalkan" → Red (#FF5252)
│  │  │  │           │  └─ "Baru" → Yellow (#FFC107)
│  │  │  │           │
│  │  │  │           ├─ Styling:
│  │  │  │           │  ├─ Font: 12px, weight 600
│  │  │  │           │  ├─ Color: White
│  │  │  │           │  ├─ Padding: 4px 12px
│  │  │  │           │  ├─ Border-radius: 16px
│  │  │  │           │  └─ Display: inline-block
│  │  │  │           └
│  │  │  ├─ Middle row (margin-top: 8px):
│  │  │  │  ├─ Date & time: "[Date] [Time]"
│  │  │  │  │               Font: 12px, weight 400, color: #999
│  │  │  │  ├─ Items count: "[X] items"
│  │  │  │  │               Font: 12px, weight 400, color: #999
│  │  │  │  └─ Separator: " • "
│  │  │  │
│  │  │  └─ Bottom row (margin-top: 8px):
│  │  │     ├─ Total price: "Rp[total]"
│  │  │     │               Font: 14px, weight 700, color: #FF6B35
│  │  │     └─ Right arrow: ">" (chevron)
│  │  │
│  │  └─ Order 2, 3, etc.
│  │     └─ Same structure
│  │
│  ├─ Empty state (if no order history):
│  │  ├─ Icon: Package (48x48px)
│  │  ├─ Title: "Belum Ada Riwayat Pesanan"
│  │  │         Font: 16px, weight 600
│  │  │         Color: #1A1A1A
│  │  │
│  │  ├─ Message: "Mulai pesan untuk melihat riwayat di sini"
│  │  │           Font: 14px, weight 400, color: #666
│  │  │
│  │  └─ Button: "Mulai Pesan"
│  │            Background: #FF6B35
│  │            Action: Navigate to / or last merchant page
│  │
│  └─ Loading state (while fetching orders):
│     ├─ Show skeleton loaders or spinner
│     └─ Same layout as order items
│
├─ Data Fetching:
│  ├─ GET /api/orders/:merchantCode/customer (if on merchant page)
│  ├─ OR GET /api/orders/customer (if global orders)
│  ├─ Returns: [{ orderNumber, date, items_count, status, total }, ...]
│  └─ Cache: 1 minute (fresh on mount)
│
└─ State Management:
   ├─ useState: activeTab ("account" | "history")
   ├─ useState: orders, isLoading, error
   ├─ useContext: Auth context (user data)
   ├─ useEffect: Fetch orders when history tab is active
   └─ useCallback: Handle logout action

╚════════════════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════════════════╗
║                        ADMIN ROUTES & DASHBOARD                          ║
╚════════════════════════════════════════════════════════════════════════════╝

[Similar detailed structure as above for admin routes]
[Will include: /admin/login, /dashboard, /dashboard/menus, /dashboard/orders, etc.]

================================================================================
SECTION 2: COLOR PALETTE & TYPOGRAPHY
================================================================================

PRIMARY COLORS:
├─ Orange primary: #FF6B35
├─ Orange hover: #E55A2B (darker)
├─ Orange light: #FFF5F0 or #FFFAF0
└─ Orange disabled: #FFB399

NEUTRAL COLORS:
├─ Background light: #F5F5F5 or #F9F9F9
├─ Border: #E0E0E0 or #EEEEEE
├─ Text dark: #1A1A1A or #333333
├─ Text medium: #666666
├─ Text light: #999999
└─ White: #FFFFFF

SEMANTIC COLORS:
├─ Success: #4CAF50 (green)
├─ Warning: #FFA500 or #FFC107 (yellow/orange)
├─ Error: #FF5252 (red)
├─ Info: #2196F3 (blue)
└─ Disabled: #CCCCCC

TYPOGRAPHY:
├─ Font family: Inter, Segoe UI, or similar sans-serif
├─ H1: 28px, weight 700
├─ H2: 20px, weight 700
├─ H3: 18px, weight 700
├─ H4: 16px, weight 700
├─ Body regular: 14px, weight 400
├─ Body medium: 14px, weight 500
├─ Body semi-bold: 14px, weight 600
├─ Small: 12px, weight 400
├─ Small semi-bold: 12px, weight 600
└─ Price: 16-18px, weight 700, color: #FF6B35

================================================================================
SECTION 3: COMPONENT LIBRARY SPECIFICATIONS
================================================================================

[Component specifications would go here with detailed measurements, spacing, etc.]

================================================================================
SECTION 4: RESPONSIVE DESIGN & BREAKPOINTS
================================================================================

Mobile (target):
├─ Viewport: 375-428px
├─ Header height: 56px
├─ Button height: 44-48px
├─ Padding: 16px (container)
└─ Modal: Full width - 32px margin

Tablet (same as mobile for now):
├─ Viewport: 768-1024px
├─ Same layouts as mobile
└─ Potential for side-by-side in future

Desktop:
├─ Fixed width: 375-428px centered
├─ White gutters: Calculated to center content
├─ Full viewport height maintained
└─ Same styling, just visually centered

================================================================================
SECTION 5: ANIMATION & TRANSITIONS
================================================================================

Slide-in (modals):
├─ Duration: 0.3s
├─ Easing: cubic-bezier(0.4, 0, 0.2, 1)
└─ Direction: Bottom to top

Fade (overlays):
├─ Duration: 0.2s
├─ Easing: ease-in-out
└─ Opacity: 0 → 1

Button hover:
├─ Background color: Transition 0.2s
├─ Scale: 0.98 (on active/press)
└─ Shadow: Increase on hover

Scroll:
├─ Smooth scroll enabled
├─ No animation jank
└─ Hardware acceleration on iOS

================================================================================
SECTION 6: INTERACTION PATTERNS
================================================================================

Back navigation:
├─ Always use URL ref parameter
├─ Format: ?ref=%2F[encoded_path]
├─ Fallback: history.back()
└─ Display: Back button top-left

Modals:
├─ Close on: Overlay click, X button, back button, Escape key
├─ Scroll: Contained within modal
├─ Z-index layering: 
│  ├─ Base content: 0
│  ├─ Header: 100
│  ├─ Floating button: 50
│  ├─ Overlay: 200
│  ├─ Modal: 300
│  └─ Confirmation: 400

Forms:
├─ Real-time validation
├─ Error display: Below field
├─ Focus styling: Border color + shadow
├─ Submit disable: If form has errors
└─ Auto-fill: From localStorage/context when available

Toast notifications:
├─ Position: Top or bottom center
├─ Duration: 3-5 seconds
├─ Types: Success (green), error (red), info (blue)
└─ Auto-dismiss: Yes
