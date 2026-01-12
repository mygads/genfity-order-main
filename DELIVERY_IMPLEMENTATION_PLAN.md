/**
 * DELIVERY MODE IMPLEMENTATION - ANALYSIS & PLAN
 * 
 * ============================================
 * COMPLETED (✅ DONE)
 * ============================================
 * 1. Database Schema
 *    ✅ Added delivery-specific fields to Merchant model (coordinates, fee config, settings)
 *    ✅ Added delivery fields to Order model (status, address, coords, distance, fee, driver)
 *    ✅ Added deliveryUnit to Order model (apartment/unit line 2 stored separately)
 *    ✅ Created MerchantDeliveryZone model (radius/polygon zones)
 *    ✅ Added DELIVERY to OrderType enum
 *    ✅ Added DeliveryStatus enum (PENDING_ASSIGNMENT, ASSIGNED, PICKED_UP, DELIVERED, FAILED)
 *    ✅ Added DELIVERY role to UserRole enum
 *    ✅ Added DRIVER role to MerchantRole enum
 *
 * 2. Backend Services & APIs
 *    ✅ Created DeliveryFeeService for shared fee/zone validation logic
 *    ✅ Updated /api/public/orders to accept DELIVERY orderType
 *    ✅ Implemented distance calculation, zone validation, fee calculation in order creation
 *    ✅ Created /api/public/merchants/[code]/delivery/quote for delivery fee preview
 *    ✅ Created /api/delivery/orders for driver delivery list
 *    ✅ Created /api/delivery/orders/[id]/status for driver status updates
 *    ✅ Created /api/merchant/delivery/zones for zone CRUD
 *    ✅ Updated /api/public/merchants/[code] to include delivery settings
 *
 * 3. Driver Role & Dashboard
 *    ✅ Added DELIVERY role authentication middleware
 *    ✅ Created delivery driver dashboard pages
 *    ✅ Created "My Deliveries" page for drivers
 *    ✅ Updated sidebar navigation for delivery role
 *    ✅ Created DeliveryDriverDashboard component
 *    ✅ Driver dashboard shows assigned deliveries with status
 *
 * 4. Merchant Settings
 *    ✅ Updated MerchantService to handle delivery settings
 *    ✅ Added validation: delivery only if merchant has coordinates
 *    ✅ Updated /api/merchant/profile to persist delivery settings
 *
 * 5. Utilities & Tests
 *    ✅ Created haversine distance + point-in-polygon geo utilities
 *    ✅ Created comprehensive test suite (14 tests, all passing)
 *
 * ============================================
 * REMAINING (🚀 TODO)
 * ============================================
 * 
 * PHASE 1: CUSTOMER CHECKOUT UPDATES
 * 1. Update customer OrderMode type to include 'delivery' ✅ DONE
 * 2. Extend payment page to support delivery mode:
 *    - Mode selection: Dine-in / Takeaway / Delivery (based on merchant settings)
 *    - For delivery: Add address input + Leaflet map pin picker
 *    - Fetch delivery fee via /api/public/merchants/[code]/delivery/quote
 *    - Show fee in totals
 *    - Include in order creation payload
 *    ✅ DONE
 * 3. Improve delivery address UX:
 *    - Apartment/Unit (line 2) input
 *    - Reverse-geocode returns formatted address parts
 *    - Professional icons via react-icons/fa
 *    ✅ DONE

 * PHASE 1.1: DELIVERY PAYMENT + TRACKING SECURITY (TOKEN REQUIRED)
 * 1. All public tracking/order-detail entrypoints include token (QR/receipts/redirects)
 *    ✅ DONE
 * 2. Controlled tracking-token minting for client-side receipt printing
 *    ✅ DONE
 * 3. Remove transition mode (secure=1) and require token on public tracking APIs
 *    ✅ DONE
 * 4. Show payment status/method in customer tracking + merchant order detail (DELIVERY)
 *    ✅ DONE
 * 5. "Confirm cash received" action (COD) for driver/merchant → mark payment COMPLETED
 *    ✅ DONE
 * 6. Token-required smoke tests (Vitest) for public tracking APIs
 *    ✅ DONE
 *
 * PHASE 2: ADMIN MERCHANT SETTINGS
 * 1. Update merchant edit page:
 *    - Add delivery tab or toggle
 *    - Delivery only enabled if merchant has coordinates
 *    - Fee config inputs (base, perKm, min, max)
 *    - Delivery zone editor (Leaflet map to draw radius/polygon)
 *    - Zone management UI
 *    ✅ DONE
 *    ✅ Added: quote preview widget (admin can test lat/lng against config)
 *    ✅ Added: bulk zones import/export (GeoJSON) + replace-existing + undo
 *    ✅ Added: real-time editor hints (overlap detection, max-distance conflicts, merchant pin inclusion)
 *    ✅ Added: API route-level tests for zones routes
 *
 * PHASE 2.1: MERCHANT ZONES BULK API
 * 1. Add transactional bulk import endpoint:
 *    - POST /api/merchant/delivery/zones/bulk-import
 *    - replaceExisting option
 *    ✅ DONE
 *
 * PHASE 3: STYLING CONSISTENCY
 * 1. Ensure all delivery pages match existing design system
 * 2. Use existing color palette, spacing, components
 * 3. Support dark mode
 * 4. Use existing icons
 *    ✅ DONE (minor Tailwind suggestion-only diagnostics may remain in unrelated legacy files)
 *
 * PHASE 4: INTEGRATION & TESTING
 * 1. End-to-end delivery order flow
 * 2. Driver assignment workflow
 * 3. Order tracking from customer perspective
 *    ✅ DONE (token-required public tracking, payment visibility, COD confirmation)
 *
 * ============================================
 * ARCHITECTURE DECISIONS
 * ============================================
 * 
 * 1. DeliveryFeeService
 *    - Shared business logic for fee/zone validation
 *    - Used by both order creation and quote endpoint
 *    - Ensures consistency between preview and actual creation
 *
 * 2. Error Handling
 *    - Clear error codes: NO_ZONES_CONFIGURED, OUT_OF_ZONE, OUT_OF_RANGE
 *    - User-friendly error messages
 *    - Different from generic validation errors
 *
 * 3. Zone Types
 *    - RADIUS: Simple distance-based zone
 *    - POLYGON: Complex shaped zones (e.g., service areas with boundaries)
 *    - Both enforced when enforceDeliveryZones is true
 *
 * 4. Fee Calculation
 *    - Base fee + per-km fee + min/max clamps
 *    - Applied consistently in both preview and order creation
 *    - Min/max fees allow business flexibility
 *
 * 5. OrderType Integration
 *    - DELIVERY treated as third order mode alongside DINE_IN/TAKEAWAY
 *    - Separate delivery fields on Order (not used for other modes)
 *    - Delivery status tracked separately from order status
 *
 * ============================================
 * DATABASE SCHEMA RELATIONSHIPS
 * ============================================
 * 
 * Merchant (1) ──── (N) MerchantDeliveryZone
 *     │                   - type: RADIUS | POLYGON
 *     │                   - radiusKm: for RADIUS type
 *     │                   - polygon: JSON array of LatLng for POLYGON type
 *     │
 *     ├──── (N) Order (when orderType = DELIVERY)
 *     │         - deliveryStatus: PENDING_ASSIGNMENT → ASSIGNED → PICKED_UP → DELIVERED
 *     │         - deliveryAddress: Full address string
 *     │         - deliveryLatitude/Longitude: Customer pin location
 *     │         - deliveryDistanceKm: Calculated distance from merchant
 *     │         - deliveryFeeAmount: Calculated fee
 *     │         - deliveryDriverUserId: Assigned driver reference
 *
 * User (1) ──── (N) MerchantUser (with role: OWNER, STAFF, or DRIVER)
 *              When role = DRIVER:
 *              - Access to /api/delivery/orders endpoints
 *              - Dashboard shows only assigned deliveries
 *              - Can update delivery status
 *
 * ============================================
 * API ENDPOINTS SUMMARY
 * ============================================
 * 
 * PUBLIC (Customer-facing):
 * - POST /api/public/orders (now accepts orderType: 'DELIVERY')
 * - POST /api/public/merchants/[code]/delivery/quote (NEW - fee preview)
 * - GET /api/public/merchants/[code] (includes delivery settings)
 * - GET /api/public/merchants/[code]/delivery (NEW - zones list)
 *
 * MERCHANT (Owner/Staff):
 * - GET /api/merchant/delivery/zones
 * - POST /api/merchant/delivery/zones (create/update)
 * - DELETE /api/merchant/delivery/zones?id=...
 * - PUT /api/merchant/profile (includes delivery settings)
 *
 * DRIVER:
 * - GET /api/delivery/orders (list assigned deliveries)
 * - PUT /api/delivery/orders/[id]/status (update delivery status)
 *
 * ============================================
 * CUSTOMER PAYMENT PAGE UPDATES
 * ============================================
 * 
 * Current:
 * - Mode selection: Dine-in / Takeaway (shown as badge)
 * - Customer form: Name, Phone, Email, Table Number (if dine-in)
 * - Fees: Tax, Service Charge, Packaging Fee
 * - Order creation
 *
 * New (with Delivery):
 * - Mode selection: Add "Delivery" option (if enabled + has zones + user enters address)
 * - If Delivery selected:
 *   * Add Leaflet map for pin picker
 *   * Add address text input
 *   * Fetch fee via quote endpoint
 *   * Show fee in totals
 * - Order creation includes delivery fields
 *
 * Flow:
 * 1. Customer enters name, phone, email (existing)
 * 2. If delivery mode:
 *    a. Show map for location pin
 *    b. Require address text
 *    c. Auto-fetch fee on pin/address change
 *    d. Show delivery fee in totals
 * 3. Submit order with all delivery fields
 * 4. Order created with deliveryStatus = PENDING_ASSIGNMENT
 * 5. Merchant assigns driver
 * 6. Driver picks up & delivers, updating status
 *
 * NOTE:
 * - Token is now required for all public tracking/order detail endpoints.
 * - Customer history/order detail/order summary flows include tracking token in navigation.
 * - Delivery order summary includes a delivery-only "Copy tracking link" action.
 *
 * ============================================
 * MERCHANT SETTINGS PAGE UPDATES
 * ============================================
 * 
 * In merchant edit page, add delivery section:
 * - Toggle: "Enable Delivery" (only if merchant.latitude && merchant.longitude exist)
 * - Fee Config:
 *   * Base Fee (required if delivery enabled)
 *   * Per-KM Fee (required if delivery enabled)
 *   * Min Fee (optional)
 *   * Max Fee (optional)
 *   * Max Distance (optional)
 * - Zone Enforcement: Toggle "Require delivery zones"
 * - Zone Management:
 *   * List of zones with edit/delete
 *   * Add Zone button → modal with:
 *     - Zone name
 *     - Zone type: RADIUS or POLYGON
 *     - If RADIUS: Input radius in KM
 *     - If POLYGON: Leaflet map to draw polygon
 *     - Active toggle
 *
 * ============================================
 * STYLING & CONSISTENCY
 * ============================================
 * 
 * Reference existing pages for:
 * - Color scheme (grays, primary orange #f05a28, semantic colors)
 * - Spacing (4px, 8px, 12px, 16px, 24px)
 * - Card styling (rounded, subtle shadow)
 * - Input styling (border, focus state)
 * - Button styling (primary, secondary, sizes)
 * - Dark mode support
 * - Icon usage (custom icons from /src/icons or react-icons)
 * - Typography (font sizes, weights)
 *
 * New delivery-specific elements must match existing pattern:
 * - Use Leaflet map component consistent with existing MapLocationPicker
 * - Use existing input/button components
 * - Use existing icon set
 * - Dark mode support built-in
 */
