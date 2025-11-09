# GENFITY Online Ordering - Testing Guide

**Version:** 1.0.0  
**Date:** November 9, 2025

## Table of Contents

1. [Setup Testing Environment](#setup-testing-environment)
2. [Manual Testing with cURL](#manual-testing-with-curl)
3. [Postman Testing](#postman-testing)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [Common Test Scenarios](#common-test-scenarios)
7. [Troubleshooting](#troubleshooting)

---

## Setup Testing Environment

### 1. Database Setup

Ensure PostgreSQL is running and create test database:

```bash
# Create database
createdb genfity_test

# Set environment variable
$env:DATABASE_URL="postgresql://user:password@localhost:5432/genfity_test"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed test data
npx prisma db seed
```

### 2. Start Development Server

```bash
npm run dev
```

Server should be running at `http://localhost:3000`

### 3. Verify Setup

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T10:00:00.000Z"
}
```

---

## Manual Testing with cURL

### Test Data After Seeding

**Super Admin:**
- Email: `admin@genfity.com`
- Password: `Admin@123456`

**Merchant:**
- Code: `REST001`
- Owner Email: `merchant@example.com`
- Password: `Password123!`

**Customer:**
- Email: `customer@example.com`
- Password: `Password123!`

### Complete Testing Flow

#### Step 1: Login as Super Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@genfity.com",
    "password": "Admin@123456"
  }'
```

**Save the token:**
```bash
$ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Step 2: List All Merchants

```bash
curl http://localhost:3000/api/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Step 3: Create New Merchant

```bash
curl -X POST http://localhost:3000/api/admin/merchants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Cafe Sederhana",
    "code": "CAFE001",
    "description": "Cozy cafe with great coffee",
    "address": "456 Coffee Lane, Sydney NSW 2000",
    "phoneNumber": "+61400111222",
    "email": "cafe@example.com",
    "taxRate": 10,
    "taxIncluded": false,
    "ownerName": "Alice Smith",
    "ownerEmail": "alice@cafe.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "2",
      "code": "CAFE001",
      "name": "Cafe Sederhana"
    },
    "owner": {
      "id": "3",
      "name": "Alice Smith",
      "email": "alice@cafe.com"
    },
    "tempPassword": "xyz98765"
  },
  "message": "Merchant created successfully",
  "statusCode": 201
}
```

#### Step 4: Get Merchant Details

```bash
curl http://localhost:3000/api/admin/merchants/2 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Step 5: Update Merchant

```bash
curl -X PUT http://localhost:3000/api/admin/merchants/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Cafe Sederhana Premium",
    "description": "Premium cafe experience",
    "taxRate": 15
  }'
```

#### Step 6: Toggle Merchant Status

```bash
# Deactivate
curl -X POST http://localhost:3000/api/admin/merchants/2/toggle \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Activate again
curl -X POST http://localhost:3000/api/admin/merchants/2/toggle \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Step 7: Login as Merchant Owner

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@cafe.com",
    "password": "xyz98765"
  }'
```

**Save the token:**
```bash
$MERCHANT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Step 8: Get Merchant Profile

```bash
curl http://localhost:3000/api/merchant/profile \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

#### Step 9: Update Profile

```bash
curl -X PUT http://localhost:3000/api/merchant/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Cafe Sederhana Premium",
    "description": "Updated from merchant side",
    "phoneNumber": "+61400111333"
  }'
```

#### Step 10: Create Categories

```bash
# Create Main Course category
curl -X POST http://localhost:3000/api/merchant/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Main Course",
    "description": "Main dishes",
    "sortOrder": 1
  }'

# Create Beverages category
curl -X POST http://localhost:3000/api/merchant/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Beverages",
    "description": "Drinks and coffee",
    "sortOrder": 2
  }'

# Create Desserts category
curl -X POST http://localhost:3000/api/merchant/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Desserts",
    "description": "Sweet treats",
    "sortOrder": 3
  }'
```

#### Step 11: List Categories

```bash
curl http://localhost:3000/api/merchant/categories \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

#### Step 12: Update Category

```bash
curl -X PUT http://localhost:3000/api/merchant/categories/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Main Course Updated",
    "sortOrder": 5
  }'
```

#### Step 13: Create Menu Items

```bash
# Nasi Goreng
curl -X POST http://localhost:3000/api/merchant/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "categoryId": "1",
    "name": "Nasi Goreng Special",
    "description": "Indonesian fried rice with chicken, egg, and vegetables",
    "price": 15.50,
    "imageUrl": null,
    "isAvailable": true,
    "hasStock": true,
    "stockQuantity": 50
  }'

# Mie Goreng
curl -X POST http://localhost:3000/api/merchant/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "categoryId": "1",
    "name": "Mie Goreng",
    "description": "Stir-fried noodles with vegetables",
    "price": 14.00,
    "isAvailable": true,
    "hasStock": true,
    "stockQuantity": 40
  }'

# Cappuccino
curl -X POST http://localhost:3000/api/merchant/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "categoryId": "2",
    "name": "Cappuccino",
    "description": "Italian coffee with steamed milk",
    "price": 5.50,
    "isAvailable": true,
    "hasStock": false,
    "stockQuantity": 0
  }'

# Tiramisu
curl -X POST http://localhost:3000/api/merchant/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "categoryId": "3",
    "name": "Tiramisu",
    "description": "Classic Italian dessert",
    "price": 8.00,
    "isAvailable": true,
    "hasStock": true,
    "stockQuantity": 20
  }'
```

#### Step 14: List Menu Items

```bash
# All menus
curl http://localhost:3000/api/merchant/menu \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# Filter by category
curl "http://localhost:3000/api/merchant/menu?categoryId=1" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

#### Step 15: Update Menu Item

```bash
curl -X PUT http://localhost:3000/api/merchant/menu/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Nasi Goreng Super Special",
    "price": 17.00,
    "stockQuantity": 45
  }'
```

#### Step 16: Browse Menu (Public - No Auth)

```bash
# Get merchant info
curl http://localhost:3000/api/public/merchant/CAFE001

# Browse menu
curl http://localhost:3000/api/public/menu/CAFE001
```

#### Step 17: Create Order (Public - No Auth)

```bash
curl -X POST http://localhost:3000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "2",
    "orderType": "DINE_IN",
    "tableNumber": "A5",
    "customerName": "Bob Johnson",
    "customerEmail": "bob@example.com",
    "customerPhone": "+61400222333",
    "items": [
      {
        "menuId": "1",
        "quantity": 2,
        "selectedAddons": [],
        "specialInstructions": "Extra spicy please"
      },
      {
        "menuId": "3",
        "quantity": 1,
        "selectedAddons": [],
        "specialInstructions": null
      },
      {
        "menuId": "4",
        "quantity": 1,
        "selectedAddons": [],
        "specialInstructions": "No coffee powder on top"
      }
    ],
    "notes": "Please prepare quickly, we are in a hurry"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "1",
    "orderNumber": "ORD-20251109-0001",
    "status": "PENDING",
    "subtotal": "44.50",
    "taxAmount": "4.45",
    "totalAmount": "48.95",
    "customerEmail": "bob@example.com"
  },
  "statusCode": 201
}
```

**Save the order number:**
```bash
$ORDER_NUMBER = "ORD-20251109-0001"
```

#### Step 18: Track Order (Public - No Auth)

```bash
curl http://localhost:3000/api/public/orders/$ORDER_NUMBER
```

#### Step 19: View Orders (Merchant)

```bash
# All orders
curl http://localhost:3000/api/merchant/orders \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# Filter by status
curl "http://localhost:3000/api/merchant/orders?status=PENDING" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# Filter by date range
curl "http://localhost:3000/api/merchant/orders?startDate=2025-11-01&endDate=2025-11-09" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# Filter by order type
curl "http://localhost:3000/api/merchant/orders?orderType=DINE_IN" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

#### Step 20: Update Order Status (Merchant)

```bash
# Accept order
curl -X PUT http://localhost:3000/api/merchant/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "status": "ACCEPTED",
    "notes": "Order accepted, preparing food"
  }'

# Start preparing
curl -X PUT http://localhost:3000/api/merchant/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "status": "IN_PROGRESS",
    "notes": "Cooking in progress"
  }'

# Mark as ready
curl -X PUT http://localhost:3000/api/merchant/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "status": "READY",
    "notes": "Order ready for pickup"
  }'

# Complete order
curl -X PUT http://localhost:3000/api/merchant/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "status": "COMPLETED",
    "notes": "Order delivered to customer"
  }'
```

#### Step 21: View Revenue (Merchant)

```bash
# Daily revenue report
curl "http://localhost:3000/api/merchant/revenue?type=daily&startDate=2025-11-01&endDate=2025-11-09" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# Total revenue summary
curl "http://localhost:3000/api/merchant/revenue?type=total&startDate=2025-11-01&endDate=2025-11-09" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"

# Last 7 days
curl "http://localhost:3000/api/merchant/revenue?type=daily" \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

---

## Common Test Scenarios

### Scenario 1: Error Handling - Validation Errors

#### Invalid Email Format

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "Password123!"
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "statusCode": 400
}
```

#### Missing Required Fields

```bash
curl -X POST http://localhost:3000/api/merchant/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "name": "Test Menu"
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Category ID is required",
  "statusCode": 400
}
```

### Scenario 2: Error Handling - Authentication

#### Missing Token

```bash
curl http://localhost:3000/api/merchant/profile
```

**Expected:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Authentication required",
  "statusCode": 401
}
```

#### Invalid Token

```bash
curl http://localhost:3000/api/merchant/profile \
  -H "Authorization: Bearer invalid-token-123"
```

**Expected:**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid token",
  "statusCode": 401
}
```

#### Wrong Role Access

```bash
# Try to access admin endpoint with merchant token
curl http://localhost:3000/api/admin/merchants \
  -H "Authorization: Bearer $MERCHANT_TOKEN"
```

**Expected:**
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Super admin access required",
  "statusCode": 403
}
```

### Scenario 3: Business Logic - Stock Management

#### Order Menu Item Out of Stock

```bash
# First, update menu to have 0 stock
curl -X PUT http://localhost:3000/api/merchant/menu/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "stockQuantity": 0
  }'

# Try to order
curl -X POST http://localhost:3000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "2",
    "orderType": "DINE_IN",
    "customerName": "Test",
    "customerEmail": "test@test.com",
    "customerPhone": "+61400000000",
    "items": [{
      "menuId": "1",
      "quantity": 1
    }]
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "MENU_OUT_OF_STOCK",
  "message": "Menu item 'Nasi Goreng Special' is out of stock",
  "statusCode": 400
}
```

### Scenario 4: Business Logic - Invalid Status Transition

```bash
# Try to move from PENDING to COMPLETED (invalid)
curl -X PUT http://localhost:3000/api/merchant/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "status": "COMPLETED"
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "INVALID_STATUS_TRANSITION",
  "message": "Cannot change status from PENDING to COMPLETED",
  "statusCode": 400
}
```

### Scenario 5: Order with Multiple Items and Tax

```bash
curl -X POST http://localhost:3000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "2",
    "orderType": "TAKEAWAY",
    "tableNumber": null,
    "customerName": "Sarah Connor",
    "customerEmail": "sarah@example.com",
    "customerPhone": "+61400333444",
    "items": [
      {
        "menuId": "1",
        "quantity": 3,
        "specialInstructions": "No onions"
      },
      {
        "menuId": "2",
        "quantity": 2,
        "specialInstructions": null
      },
      {
        "menuId": "3",
        "quantity": 4,
        "specialInstructions": "Extra hot"
      }
    ],
    "notes": "Takeaway order"
  }'
```

**Calculation:**
- Item 1: 3 × $17.00 = $51.00
- Item 2: 2 × $14.00 = $28.00
- Item 3: 4 × $5.50 = $22.00
- Subtotal: $101.00
- Tax (10%): $10.10
- **Total: $111.10**

### Scenario 6: Merchant Closed Check

```bash
# First, deactivate merchant
curl -X POST http://localhost:3000/api/admin/merchants/2/toggle \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Try to order
curl -X POST http://localhost:3000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "2",
    "orderType": "DINE_IN",
    "customerName": "Test",
    "customerEmail": "test@test.com",
    "customerPhone": "+61400000000",
    "items": [{
      "menuId": "1",
      "quantity": 1
    }]
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "MERCHANT_INACTIVE",
  "message": "Merchant is not accepting orders",
  "statusCode": 400
}
```

---

## Postman Testing

### Import Collection

1. Create a new Postman Collection named "GENFITY API"
2. Add environment variables:
   - `base_url`: `http://localhost:3000`
   - `admin_token`: (set after login)
   - `merchant_token`: (set after login)
   - `merchant_id`: (set after merchant creation)

### Pre-request Scripts

Add to login requests to automatically save tokens:

```javascript
pm.test("Login successful", function () {
    var jsonData = pm.response.json();
    pm.environment.set("admin_token", jsonData.data.accessToken);
});
```

### Test Scripts

Add to requests for automated testing:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success flag", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Response has data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.exist;
});
```

---

## Unit Testing

### Service Tests Example

Create `src/lib/services/__tests__/OrderService.test.ts`:

```typescript
import { OrderService } from '../OrderService';
import { OrderRepository } from '@/lib/repositories/OrderRepository';

jest.mock('@/lib/repositories/OrderRepository');

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockOrderRepository = new OrderRepository() as jest.Mocked<OrderRepository>;
    orderService = new OrderService();
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      // Arrange
      const orderData = {
        merchantId: '1',
        orderType: 'DINE_IN' as const,
        tableNumber: 'A5',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        customerPhone: '+61400000000',
        items: [
          {
            menuId: '1',
            quantity: 2,
            selectedAddons: [],
            specialInstructions: null
          }
        ]
      };

      // Act
      const result = await orderService.createOrder(orderData);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
      expect(result.status).toBe('PENDING');
    });

    it('should throw error for invalid merchant', async () => {
      // Arrange
      const orderData = {
        merchantId: '999',
        // ... rest of data
      };

      // Act & Assert
      await expect(orderService.createOrder(orderData))
        .rejects
        .toThrow('Merchant not found');
    });
  });
});
```

### Run Unit Tests

```bash
npm test
```

---

## Integration Testing

### API Integration Tests Example

Create `tests/api/merchant.test.ts`:

```typescript
import request from 'supertest';

describe('Merchant API Integration Tests', () => {
  let adminToken: string;
  let merchantId: string;

  beforeAll(async () => {
    // Login as admin
    const response = await request('http://localhost:3000')
      .post('/api/auth/login')
      .send({
        email: 'admin@genfity.com',
        password: 'Admin123!@#'
      });

    adminToken = response.body.data.accessToken;
  });

  describe('POST /api/admin/merchants', () => {
    it('should create merchant successfully', async () => {
      const response = await request('http://localhost:3000')
        .post('/api/admin/merchants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Restaurant',
          code: 'TEST001',
          email: 'test@restaurant.com',
          phoneNumber: '+61400000000',
          address: '123 Test St',
          taxRate: 10,
          ownerName: 'Test Owner',
          ownerEmail: 'owner@test.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.code).toBe('TEST001');

      merchantId = response.body.data.merchant.id;
    });
  });

  describe('GET /api/admin/merchants/:id', () => {
    it('should get merchant details', async () => {
      const response = await request('http://localhost:3000')
        .get(`/api/admin/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.code).toBe('TEST001');
    });
  });
});
```

### Run Integration Tests

```bash
npm run test:integration
```

---

## Troubleshooting

### Issue 1: "Module not found" errors

**Solution:**
```bash
npm install
npx prisma generate
```

### Issue 2: Database connection errors

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Check DATABASE_URL
echo $env:DATABASE_URL

# Test connection
npx prisma db pull
```

### Issue 3: JWT token expired

**Solution:**
Login again to get a new token. Tokens expire after 1 hour by default.

### Issue 4: Prisma type errors

**Solution:**
```bash
npx prisma generate
# Restart TypeScript server in VS Code
```

### Issue 5: Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or change port in package.json
```

### Issue 6: CORS errors

**Solution:**
Add to `next.config.ts`:
```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
      ],
    },
  ];
}
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test login endpoint
ab -n 100 -c 10 -p login.json -T application/json \
  http://localhost:3000/api/auth/login

# Test public menu endpoint
ab -n 1000 -c 50 http://localhost:3000/api/public/menu/REST001
```

### Monitoring

Use VS Code terminal to monitor server logs:

```bash
npm run dev
```

Watch for:
- Response times
- Error rates
- Database query performance

---

## Automated Testing Checklist

- [ ] All authentication endpoints work correctly
- [ ] Admin can create/update/delete merchants
- [ ] Merchant can manage profile, categories, and menu
- [ ] Public can browse menu and create orders
- [ ] Order status transitions work correctly
- [ ] Stock decrements on order creation
- [ ] Tax calculation is accurate
- [ ] Email notifications are sent
- [ ] QR codes are generated
- [ ] Revenue reports calculate correctly
- [ ] Error handling works for all edge cases
- [ ] Validation catches invalid inputs
- [ ] Authorization prevents unauthorized access

---

**Last Updated:** November 9, 2025  
**Version:** 1.0.0
