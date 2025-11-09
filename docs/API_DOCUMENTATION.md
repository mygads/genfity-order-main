# GENFITY Online Ordering - API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api`  
**Date:** November 9, 2025

## Table of Contents

1. [Authentication](#authentication)
2. [Admin API](#admin-api)
3. [Merchant API](#merchant-api)
4. [Public API](#public-api)
5. [Error Codes](#error-codes)
6. [Testing Guide](#testing-guide)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login Endpoint

**POST** `/api/auth/login`

**Request:**
```json
{
  "email": "admin@genfity.com",
  "password": "Admin@123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "1",
      "name": "Super Admin",
      "email": "admin@genfity.com",
      "role": "SUPER_ADMIN"
    }
  },
  "message": "Login successful",
  "statusCode": 200
}
```

### Default Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@genfity.com | Admin@123456 | SUPER_ADMIN |
| merchant@example.com | Password123! | MERCHANT_OWNER |
| customer@example.com | Password123! | CUSTOMER |

---

## Admin API

**Authentication Required:** Super Admin only  
**Middleware:** `withSuperAdmin`

### 1. List All Merchants

**GET** `/api/admin/merchants?activeOnly=true`

**Headers:**
```
Authorization: Bearer <super-admin-token>
```

**Query Parameters:**
- `activeOnly` (boolean, optional): Filter active merchants only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "code": "REST001",
      "name": "Warung Makan Sederhana",
      "email": "warung@example.com",
      "phone": "+61412345678",
      "address": "123 Main St, Sydney",
      "isActive": true,
      "enableTax": true,
      "taxPercentage": "10.00",
      "createdAt": "2025-11-09T00:00:00.000Z"
    }
  ],
  "message": "Merchants retrieved successfully",
  "statusCode": 200
}
```

### 2. Create Merchant

**POST** `/api/admin/merchants`

**Headers:**
```
Authorization: Bearer <super-admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Warung Makan Sederhana",
  "code": "REST001",
  "description": "Indonesian restaurant serving authentic dishes",
  "address": "123 Main St, Sydney NSW 2000",
  "phoneNumber": "+61412345678",
  "email": "warung@example.com",
  "taxRate": 10,
  "taxIncluded": false,
  "ownerName": "John Doe",
  "ownerEmail": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "1",
      "code": "REST001",
      "name": "Warung Makan Sederhana",
      "isActive": true
    },
    "owner": {
      "id": "2",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "MERCHANT_OWNER"
    },
    "tempPassword": "abc12345"
  },
  "message": "Merchant created successfully",
  "statusCode": 201
}
```

**Note:** Temporary password is sent via email to owner.

### 3. Get Merchant Details

**GET** `/api/admin/merchants/:id`

**Example:** `GET /api/admin/merchants/1`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "code": "REST001",
    "name": "Warung Makan Sederhana",
    "email": "warung@example.com",
    "openingHours": [
      {
        "dayOfWeek": 1,
        "openTime": "09:00",
        "closeTime": "22:00",
        "isClosed": false
      }
    ],
    "merchantUsers": [
      {
        "user": {
          "id": "2",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "role": "OWNER"
      }
    ]
  },
  "message": "Merchant retrieved successfully",
  "statusCode": 200
}
```

### 4. Update Merchant

**PUT** `/api/admin/merchants/:id`

**Request:**
```json
{
  "name": "Warung Makan Sederhana Updated",
  "description": "Updated description",
  "phoneNumber": "+61412345679",
  "taxRate": 15
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Warung Makan Sederhana Updated",
    "taxRate": 15
  },
  "message": "Merchant updated successfully",
  "statusCode": 200
}
```

### 5. Toggle Merchant Status

**POST** `/api/admin/merchants/:id/toggle`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "isActive": false
  },
  "message": "Merchant status updated successfully",
  "statusCode": 200
}
```

### 6. Delete Merchant (Soft Delete)

**DELETE** `/api/admin/merchants/:id`

**Response:**
```json
{
  "success": true,
  "message": "Merchant deleted successfully",
  "statusCode": 200
}
```

---

## Merchant API

**Authentication Required:** Merchant Owner or Staff  
**Middleware:** `withMerchant`

### Profile Management

#### 1. Get Merchant Profile

**GET** `/api/merchant/profile`

**Headers:**
```
Authorization: Bearer <merchant-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "code": "REST001",
    "name": "Warung Makan Sederhana",
    "description": "Indonesian restaurant",
    "email": "warung@example.com",
    "phone": "+61412345678",
    "address": "123 Main St, Sydney",
    "enableTax": true,
    "taxPercentage": "10.00",
    "openingHours": []
  },
  "message": "Merchant profile retrieved successfully",
  "statusCode": 200
}
```

#### 2. Update Merchant Profile

**PUT** `/api/merchant/profile`

**Request:**
```json
{
  "name": "Warung Makan Sederhana",
  "description": "Updated description",
  "phoneNumber": "+61412345678",
  "taxRate": 10
}
```

### Category Management

#### 3. List Categories

**GET** `/api/merchant/categories`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Main Course",
      "description": "Main dishes",
      "sortOrder": 1,
      "isActive": true
    }
  ],
  "message": "Categories retrieved successfully",
  "statusCode": 200
}
```

#### 4. Create Category

**POST** `/api/merchant/categories`

**Request:**
```json
{
  "name": "Appetizers",
  "description": "Starter dishes",
  "sortOrder": 1
}
```

#### 5. Update Category

**PUT** `/api/merchant/categories/:id`

**Request:**
```json
{
  "name": "Appetizers Updated",
  "sortOrder": 2
}
```

#### 6. Delete Category

**DELETE** `/api/merchant/categories/:id`

### Menu Management

#### 7. List Menus

**GET** `/api/merchant/menu?categoryId=1`

**Query Parameters:**
- `categoryId` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Nasi Goreng",
      "description": "Indonesian fried rice",
      "price": "15.00",
      "categoryId": "1",
      "imageUrl": null,
      "isActive": true,
      "trackStock": true,
      "stockQty": 50
    }
  ],
  "message": "Menus retrieved successfully",
  "statusCode": 200
}
```

#### 8. Create Menu

**POST** `/api/merchant/menu`

**Request:**
```json
{
  "categoryId": "1",
  "name": "Nasi Goreng",
  "description": "Indonesian fried rice with chicken",
  "price": 15.00,
  "imageUrl": "https://example.com/image.jpg",
  "isAvailable": true,
  "hasStock": true,
  "stockQuantity": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Nasi Goreng",
    "price": "15.00",
    "isActive": true,
    "trackStock": true,
    "stockQty": 50
  },
  "message": "Menu created successfully",
  "statusCode": 201
}
```

#### 9. Get Menu Details

**GET** `/api/merchant/menu/:id`

#### 10. Update Menu

**PUT** `/api/merchant/menu/:id`

**Request:**
```json
{
  "name": "Nasi Goreng Special",
  "price": 18.00,
  "stockQuantity": 30
}
```

#### 11. Delete Menu

**DELETE** `/api/merchant/menu/:id`

### Order Management

#### 12. List Orders

**GET** `/api/merchant/orders?status=PENDING&orderType=DINE_IN&startDate=2025-11-01&endDate=2025-11-09`

**Query Parameters:**
- `status` (optional): PENDING, ACCEPTED, IN_PROGRESS, READY, COMPLETED, CANCELLED
- `orderType` (optional): DINE_IN, TAKEAWAY
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "orderNumber": "ORD-20251109-0001",
      "status": "PENDING",
      "orderType": "DINE_IN",
      "tableNumber": "5",
      "customerName": "Jane Smith",
      "subtotal": "45.00",
      "taxAmount": "4.50",
      "totalAmount": "49.50",
      "placedAt": "2025-11-09T10:30:00.000Z"
    }
  ],
  "message": "Orders retrieved successfully",
  "statusCode": 200
}
```

#### 13. Update Order Status

**PUT** `/api/merchant/orders/:id/status`

**Request:**
```json
{
  "status": "ACCEPTED",
  "notes": "Order accepted, preparing food"
}
```

**Valid Status Transitions:**
- PENDING → ACCEPTED, CANCELLED
- ACCEPTED → IN_PROGRESS, CANCELLED
- IN_PROGRESS → READY, CANCELLED
- READY → COMPLETED, CANCELLED

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orderNumber": "ORD-20251109-0001",
    "status": "ACCEPTED"
  },
  "message": "Order status updated successfully",
  "statusCode": 200
}
```

### Revenue Analytics

#### 14. Get Revenue Report

**GET** `/api/merchant/revenue?type=daily&startDate=2025-11-01&endDate=2025-11-09`

**Query Parameters:**
- `type`: "daily" or "total"
- `startDate` (optional): Defaults to 30 days ago
- `endDate` (optional): Defaults to today

**Response (Daily):**
```json
{
  "success": true,
  "data": {
    "type": "daily",
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2025-11-09T23:59:59.999Z",
    "report": [
      {
        "date": "2025-11-09",
        "totalOrders": 15,
        "totalRevenue": 750.50
      }
    ]
  },
  "message": "Revenue report retrieved successfully",
  "statusCode": 200
}
```

**Response (Total):**
```json
{
  "success": true,
  "data": {
    "type": "total",
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2025-11-09T23:59:59.999Z",
    "totalOrders": 150,
    "totalRevenue": 7500.50,
    "averageOrderValue": 50.00
  },
  "message": "Total revenue retrieved successfully",
  "statusCode": 200
}
```

---

## Public API

**Authentication:** Not required  
**Middleware:** None

### 1. Lookup Merchant by Code

**GET** `/api/public/merchant/:code`

**Example:** `GET /api/public/merchant/REST001`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "code": "REST001",
    "name": "Warung Makan Sederhana",
    "email": "warung@example.com",
    "phone": "+61412345678",
    "address": "123 Main St, Sydney",
    "description": "Indonesian restaurant",
    "logoUrl": null,
    "isActive": true,
    "enableTax": true,
    "taxPercentage": "10.00",
    "currency": "AUD",
    "openingHours": [
      {
        "dayOfWeek": 1,
        "openTime": "09:00",
        "closeTime": "22:00",
        "isClosed": false
      }
    ]
  },
  "message": "Merchant retrieved successfully",
  "statusCode": 200
}
```

### 2. Browse Menu

**GET** `/api/public/menu/:merchantCode`

**Example:** `GET /api/public/menu/REST001`

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": {
      "code": "REST001",
      "name": "Warung Makan Sederhana",
      "description": "Indonesian restaurant",
      "logoUrl": null
    },
    "menusByCategory": [
      {
        "category": {
          "id": "1",
          "name": "Main Course",
          "description": "Main dishes",
          "sortOrder": 1
        },
        "menus": [
          {
            "id": "1",
            "name": "Nasi Goreng",
            "description": "Indonesian fried rice",
            "price": "15.00",
            "imageUrl": null,
            "isActive": true,
            "trackStock": true,
            "stockQty": 50
          }
        ]
      }
    ]
  },
  "message": "Menu retrieved successfully",
  "statusCode": 200
}
```

### 3. Create Order

**POST** `/api/public/orders`

**Request:**
```json
{
  "merchantId": "1",
  "orderType": "DINE_IN",
  "tableNumber": "5",
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "customerPhone": "+61412345678",
  "items": [
    {
      "menuId": "1",
      "quantity": 2,
      "selectedAddons": [],
      "specialInstructions": "Extra spicy please"
    },
    {
      "menuId": "2",
      "quantity": 1,
      "selectedAddons": ["3", "4"],
      "specialInstructions": null
    }
  ],
  "notes": "Please prepare quickly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "1",
    "orderNumber": "ORD-20251109-0001",
    "status": "PENDING",
    "orderType": "DINE_IN",
    "tableNumber": "5",
    "subtotal": "45.00",
    "taxAmount": "4.50",
    "totalAmount": "49.50",
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "createdAt": "2025-11-09T10:30:00.000Z"
  },
  "message": "Order created successfully",
  "statusCode": 201
}
```

**Note:** If customer email doesn't exist, a new customer account is automatically created.

### 4. Track Order

**GET** `/api/public/orders/:orderNumber`

**Example:** `GET /api/public/orders/ORD-20251109-0001`

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-20251109-0001",
    "status": "IN_PROGRESS",
    "orderType": "DINE_IN",
    "tableNumber": "5",
    "customerName": "Jane Smith",
    "subtotal": "45.00",
    "taxAmount": "4.50",
    "totalAmount": "49.50",
    "notes": "Please prepare quickly",
    "placedAt": "2025-11-09T10:30:00.000Z",
    "statusHistory": [
      {
        "fromStatus": null,
        "toStatus": "PENDING",
        "note": "Order placed",
        "createdAt": "2025-11-09T10:30:00.000Z"
      },
      {
        "fromStatus": "PENDING",
        "toStatus": "ACCEPTED",
        "note": "Order accepted",
        "createdAt": "2025-11-09T10:32:00.000Z"
      },
      {
        "fromStatus": "ACCEPTED",
        "toStatus": "IN_PROGRESS",
        "note": "Preparing food",
        "createdAt": "2025-11-09T10:35:00.000Z"
      }
    ],
    "merchant": {
      "name": "Warung Makan Sederhana",
      "code": "REST001",
      "phone": "+61412345678",
      "address": "123 Main St, Sydney"
    }
  },
  "message": "Order retrieved successfully",
  "statusCode": 200
}
```

---

## Error Codes

All error responses follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| FORBIDDEN | 403 | User doesn't have permission |
| VALIDATION_ERROR | 400 | Invalid request data |
| NOT_FOUND | 404 | Resource not found |
| MERCHANT_NOT_FOUND | 404 | Merchant not found |
| ORDER_NOT_FOUND | 404 | Order not found |
| MENU_NOT_FOUND | 404 | Menu item not found |
| MERCHANT_INACTIVE | 400 | Merchant is not active |
| MERCHANT_CLOSED | 400 | Merchant is currently closed |
| MENU_INACTIVE | 400 | Menu item not available |
| MENU_OUT_OF_STOCK | 400 | Insufficient stock |
| INVALID_STATUS_TRANSITION | 400 | Invalid order status change |
| EMPTY_CART | 400 | Order has no items |
| INTERNAL_ERROR | 500 | Server error |

---

## Testing Guide

### Prerequisites

1. Start the development server:
```bash
npm run dev
```

2. Ensure database is running and migrated:
```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### Testing Flow

#### 1. Login as Super Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@genfity.com",
    "password": "Admin123!@#"
  }'
```

Save the `accessToken` for subsequent requests.

#### 2. Create Merchant (as Super Admin)

```bash
curl -X POST http://localhost:3000/api/admin/merchants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <super-admin-token>" \
  -d '{
    "name": "Test Restaurant",
    "code": "TEST001",
    "email": "test@restaurant.com",
    "phoneNumber": "+61400000000",
    "address": "123 Test St",
    "taxRate": 10,
    "ownerName": "Test Owner",
    "ownerEmail": "owner@test.com"
  }'
```

#### 3. Login as Merchant Owner

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "<temp-password-from-email>"
  }'
```

#### 4. Create Category (as Merchant)

```bash
curl -X POST http://localhost:3000/api/merchant/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <merchant-token>" \
  -d '{
    "name": "Main Course",
    "description": "Main dishes",
    "sortOrder": 1
  }'
```

#### 5. Create Menu Item (as Merchant)

```bash
curl -X POST http://localhost:3000/api/merchant/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <merchant-token>" \
  -d '{
    "categoryId": "1",
    "name": "Nasi Goreng",
    "description": "Fried rice",
    "price": 15.00,
    "isAvailable": true,
    "hasStock": true,
    "stockQuantity": 50
  }'
```

#### 6. Create Order (Public - No Auth)

```bash
curl -X POST http://localhost:3000/api/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "1",
    "orderType": "DINE_IN",
    "tableNumber": "5",
    "customerName": "Test Customer",
    "customerEmail": "customer@test.com",
    "customerPhone": "+61400000001",
    "items": [
      {
        "menuId": "1",
        "quantity": 2,
        "selectedAddons": [],
        "specialInstructions": "Extra spicy"
      }
    ]
  }'
```

#### 7. Track Order (Public - No Auth)

```bash
curl http://localhost:3000/api/public/orders/ORD-20251109-0001
```

#### 8. Update Order Status (as Merchant)

```bash
curl -X PUT http://localhost:3000/api/merchant/orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <merchant-token>" \
  -d '{
    "status": "ACCEPTED",
    "notes": "Order accepted"
  }'
```

#### 9. View Revenue (as Merchant)

```bash
curl "http://localhost:3000/api/merchant/revenue?type=total&startDate=2025-11-01&endDate=2025-11-09" \
  -H "Authorization: Bearer <merchant-token>"
```

### Postman Collection

Import the following collection to Postman for easier testing:

**Collection URL:** (To be created)

---

## Support

For issues or questions:
- Email: support@genfity.com
- GitHub: https://github.com/genfity/online-ordering

---

**Last Updated:** November 9, 2025  
**Version:** 1.0.0
