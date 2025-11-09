# GENFITY Testing Guide

## Quick Start Testing

### 1. Start the Development Server
```bash
npm run dev
```
Server should start at: http://localhost:3000

### 2. Admin Testing Flow

#### Step 1: Login as Super Admin
1. Navigate to: http://localhost:3000/signin
2. Use test credentials:
   - Email: `admin@genfity.com`
   - Password: `admin123`
3. Should redirect to `/admin` dashboard

#### Step 2: Create a Merchant
1. Click "Create Merchant" button
2. Fill in the form:
   - Merchant Name: Test Restaurant
   - Code: REST001 (auto-generated)
   - Description: A test restaurant
   - Address: Jl. Test No. 123, Jakarta
   - Phone: 081234567890
   - Email: merchant@test.com
   - Enable Tax: ✓
   - Tax Rate: 10
   - Owner Name: John Doe
   - Owner Email: owner@test.com
3. Submit form
4. Note the temporary password displayed
5. Should auto-redirect to merchants list

#### Step 3: View Merchant Details
1. Click "View" on the created merchant
2. Verify all information is displayed correctly
3. Check opening hours table
4. Verify staff/owners list

#### Step 4: Edit Merchant
1. Click "Edit" button
2. Change merchant name to "Test Restaurant Updated"
3. Update description
4. Submit changes
5. Verify updates are reflected

#### Step 5: Toggle Merchant Status
1. From merchants list, click on status badge
2. Merchant should toggle between Active/Inactive
3. Verify status change

### 3. Merchant Testing Flow

#### Step 1: Login as Merchant Owner
1. Logout from admin
2. Login with merchant owner credentials:
   - Email: `owner@test.com`
   - Password: (temp password from Step 2.4)
3. Should redirect to `/admin/merchant/orders`

#### Step 2: Update Profile
1. Navigate to Profile page
2. Click "Edit Profile"
3. Update merchant name, description, phone, or tax rate
4. Save changes
5. Verify updates

#### Step 3: Create Categories
1. Navigate to Categories page
2. Click "+ Add Category"
3. Create categories:
   - Name: Main Course, Display Order: 1
   - Name: Beverages, Display Order: 2
   - Name: Desserts, Display Order: 3
4. Verify categories appear in list

#### Step 4: Create Menu Items
1. Navigate to Menu page
2. Click "+ Add Menu Item"
3. Create menu items:
   - Category: Main Course
   - Name: Nasi Goreng
   - Description: Indonesian fried rice
   - Price: 25000
4. Repeat for multiple items
5. Verify items appear grouped by category

#### Step 5: View Orders
1. Navigate to Orders page
2. Initially empty (no orders yet)
3. Test filter dropdown (PENDING, CONFIRMED, etc.)
4. Test refresh button

#### Step 6: View Revenue
1. Navigate to Revenue page
2. Click "Daily Revenue" tab
3. Click "Total Revenue" tab
4. Verify statistics cards display correctly

### 4. Customer Testing Flow

#### Step 1: Merchant Lookup
1. Open new incognito window
2. Navigate to: http://localhost:3000/lookup
3. Enter merchant code: `REST001`
4. Click "Search Merchant"
5. Verify merchant information displays
6. Click "View Menu & Order"

#### Step 2: Browse Menu
1. Should redirect to `/menu/REST001`
2. Verify categories and menu items display
3. Click "Add" button on multiple items
4. Increase quantity with + button
5. Decrease quantity with − button
6. Verify cart footer shows total items count

#### Step 3: Checkout
1. Click "Proceed to Checkout"
2. Fill customer information:
   - Name: Test Customer
   - Email: customer@test.com
   - Phone: 081234567890
3. Verify order summary in sidebar
4. Click "Place Order"
5. Should redirect to tracking page

#### Step 4: Track Order
1. Note the order number from URL
2. Verify order details display:
   - Order number
   - Status: PENDING
   - Customer info
   - Items list
   - Totals (subtotal, tax, grand total)
3. Test "Refresh Status" button
4. Test "Print Receipt" button

### 5. Order Processing Flow

#### Step 1: Merchant Receives Order
1. Switch back to merchant dashboard
2. Navigate to Orders page
3. Click "Refresh" - new order should appear
4. Verify order status: PENDING
5. Click "View Details"

#### Step 2: Process Order
1. In order details modal, click "Mark as CONFIRMED"
2. Verify status updates
3. Refresh page - order should show CONFIRMED
4. Click "View Details" again
5. Click "Mark as PREPARING"
6. Continue workflow: PREPARING → READY → COMPLETED

#### Step 3: Customer Tracks Updates
1. Switch back to tracking page
2. Click "Refresh Status"
3. Verify status updates
4. Check progress bar updates
5. Status should show latest update from merchant

### 6. Revenue Testing

#### Step 1: Complete Multiple Orders
1. Create 2-3 more orders as customer
2. Process all orders to COMPLETED as merchant

#### Step 2: Check Revenue Reports
1. Navigate to Revenue page
2. Click "Daily Revenue"
3. Verify today's revenue shows:
   - Number of orders
   - Total revenue
   - Tax amount
   - Grand total
4. Click "Total Revenue"
5. Verify total statistics across all orders

---

## Test Cases Checklist

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should show error)
- [ ] Logout functionality
- [ ] Role-based redirect (Admin vs Merchant)
- [ ] Protected routes redirect to login if not authenticated

### Admin - Merchants CRUD
- [ ] Create merchant with all fields
- [ ] View merchants list
- [ ] Filter active/inactive merchants
- [ ] View merchant details
- [ ] Edit merchant information
- [ ] Toggle merchant status
- [ ] Delete merchant (with confirmation)
- [ ] Temporary password display on creation

### Merchant - Profile
- [ ] View profile information
- [ ] Edit profile (name, description, phone, tax)
- [ ] Save changes successfully
- [ ] Cancel edit without saving

### Merchant - Categories
- [ ] Create category
- [ ] Edit category
- [ ] Delete category (with confirmation)
- [ ] List categories sorted by display order
- [ ] View active/inactive status

### Merchant - Menu
- [ ] Create menu item with category
- [ ] Edit menu item
- [ ] Delete menu item (with confirmation)
- [ ] List menu items grouped by category
- [ ] View availability status

### Merchant - Orders
- [ ] View all orders
- [ ] Filter orders by status
- [ ] View order details modal
- [ ] Update order status (workflow progression)
- [ ] Refresh orders list
- [ ] Calculate totals correctly (subtotal, tax, grand total)

### Merchant - Revenue
- [ ] View daily revenue breakdown
- [ ] View total revenue statistics
- [ ] Toggle between daily and total views
- [ ] Accurate calculations

### Public - Merchant Lookup
- [ ] Search with valid merchant code
- [ ] Search with invalid code (should show error)
- [ ] Display merchant information
- [ ] Show active/inactive status
- [ ] Navigate to menu (only if active)

### Public - Menu Browse
- [ ] Display categories and items
- [ ] Add items to cart
- [ ] Increase/decrease quantity
- [ ] Remove items from cart
- [ ] Cart footer shows correct total
- [ ] Proceed to checkout with items
- [ ] Cannot checkout with empty cart

### Public - Checkout
- [ ] Load cart from session storage
- [ ] Display order summary
- [ ] Submit customer information
- [ ] Validate required fields
- [ ] Create order successfully
- [ ] Redirect to tracking page
- [ ] Clear cart after order

### Public - Order Tracking
- [ ] Display order details
- [ ] Show correct status
- [ ] Progress bar updates with status
- [ ] Refresh status from API
- [ ] Print receipt functionality
- [ ] Navigate to new order

---

## Common Issues & Solutions

### Issue: Login not working
**Solution**: 
- Check if backend is running
- Verify JWT_SECRET is set in .env
- Check console for error messages
- Ensure database has test users

### Issue: Orders not appearing
**Solution**:
- Click refresh button
- Check browser console for errors
- Verify API endpoint is correct
- Ensure merchant is active

### Issue: Cart not persisting
**Solution**:
- Check sessionStorage in browser DevTools
- Verify cart is saved before checkout
- Clear browser cache if corrupted

### Issue: Styles not loading
**Solution**:
- Run `npm run dev` again
- Clear browser cache
- Check for Tailwind build errors

### Issue: Database errors
**Solution**:
- Verify DATABASE_URL in .env
- Run migrations if needed
- Check database connection

---

## Performance Testing

### Load Testing
1. Create 50+ menu items
2. Create 100+ orders
3. Test pagination/scrolling
4. Verify page load times

### Concurrent Users
1. Open multiple browser sessions
2. Test simultaneous order creation
3. Test order status updates
4. Verify no race conditions

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Responsive Design Testing

### Desktop (1920x1080)
- [ ] All pages render correctly
- [ ] Tables fit in viewport
- [ ] Modals centered
- [ ] Forms properly aligned

### Tablet (768x1024)
- [ ] Grid layouts adjust
- [ ] Tables scroll horizontally
- [ ] Navigation accessible
- [ ] Forms usable

### Mobile (375x667)
- [ ] Single column layouts
- [ ] Touch-friendly buttons
- [ ] Forms fill viewport
- [ ] Cart footer doesn't overlap content

---

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Labels on all form inputs
- [ ] Error messages descriptive
- [ ] Color contrast sufficient
- [ ] Screen reader compatible

---

## Security Testing

- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] CSRF protection (tokens)
- [ ] Password hashing (bcrypt)
- [ ] JWT validation
- [ ] Role-based access control

---

## API Integration Testing

### Test all endpoints:
1. POST /api/auth/login
2. GET /api/admin/merchants
3. POST /api/admin/merchants
4. GET /api/admin/merchants/:id
5. PUT /api/admin/merchants/:id
6. DELETE /api/admin/merchants/:id
7. GET /api/merchant/profile
8. PUT /api/merchant/profile
9. GET /api/merchant/categories
10. POST /api/merchant/categories
11. PUT /api/merchant/categories/:id
12. DELETE /api/merchant/categories/:id
13. GET /api/merchant/menu
14. POST /api/merchant/menu
15. PUT /api/merchant/menu/:id
16. DELETE /api/merchant/menu/:id
17. GET /api/merchant/orders
18. PUT /api/merchant/orders/:id
19. GET /api/merchant/revenue
20. GET /api/public/merchant/:code
21. GET /api/public/menu/:code
22. POST /api/public/orders
23. GET /api/public/orders/:orderNumber

---

## Final Checklist

- [ ] All pages load without errors
- [ ] All forms submit successfully
- [ ] All API calls return expected data
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Success messages appear
- [ ] Navigation works between pages
- [ ] Dark mode toggles correctly
- [ ] Responsive on all devices
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build completes successfully

---

## Deployment Testing

Before deploying to production:

1. Run production build:
```bash
npm run build
npm start
```

2. Test production build locally
3. Verify environment variables
4. Test database connection
5. Check API endpoints
6. Perform full regression test
7. Load test with expected traffic
8. Security audit
9. Performance benchmarks
10. User acceptance testing

---

## Success Criteria

✅ All 16 pages functional
✅ All API integrations working
✅ Authentication flow complete
✅ Order flow end-to-end working
✅ No critical bugs
✅ Performance acceptable
✅ Security measures in place
✅ User experience smooth

**Status**: Ready for Production Testing! 🚀
