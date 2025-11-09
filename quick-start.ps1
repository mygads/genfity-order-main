#!/usr/bin/env pwsh
# GENFITY Quick Start Script for Windows PowerShell
# This script helps you quickly test the GENFITY API

Write-Host "🚀 GENFITY Online Ordering - Quick Start Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3000"

# Check if server is running
Write-Host "🔍 Checking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Server is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start it with: npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Step 1: Login as Super Admin" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

$loginBody = @{
    email = "admin@genfity.com"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    $adminToken = $loginResponse.data.accessToken
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "👤 User: $($loginResponse.data.user.name)" -ForegroundColor White
    Write-Host "📧 Email: $($loginResponse.data.user.email)" -ForegroundColor White
    Write-Host "🎭 Role: $($loginResponse.data.user.role)" -ForegroundColor White
    Write-Host "🔑 Token: $($adminToken.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Step 2: Create Test Merchant" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

$merchantBody = @{
    name = "Test Restaurant"
    code = "TEST001"
    description = "A test restaurant for API testing"
    address = "123 Test Street, Sydney NSW 2000"
    phoneNumber = "+61400000000"
    email = "test@restaurant.com"
    taxRate = 10
    taxIncluded = $false
    ownerName = "Test Owner"
    ownerEmail = "testowner@restaurant.com"
} | ConvertTo-Json

try {
    $merchantResponse = Invoke-RestMethod -Uri "$BASE_URL/api/admin/merchants" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $adminToken" } `
        -Body $merchantBody `
        -ContentType "application/json"
    
    $merchantId = $merchantResponse.data.merchant.id
    $merchantCode = $merchantResponse.data.merchant.code
    $tempPassword = $merchantResponse.data.tempPassword
    
    Write-Host "✅ Merchant created successfully!" -ForegroundColor Green
    Write-Host "🏪 Merchant: $($merchantResponse.data.merchant.name)" -ForegroundColor White
    Write-Host "🔖 Code: $merchantCode" -ForegroundColor White
    Write-Host "👤 Owner: $($merchantResponse.data.owner.name)" -ForegroundColor White
    Write-Host "📧 Owner Email: $($merchantResponse.data.owner.email)" -ForegroundColor White
    Write-Host "🔑 Temp Password: $tempPassword" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Merchant creation failed: $_" -ForegroundColor Red
    # Continue anyway - merchant might already exist
    $merchantId = "1"
    $merchantCode = "REST001"
    $tempPassword = "Password123!"
    Write-Host "⚠️  Using default merchant (REST001)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Step 3: Login as Merchant Owner" -ForegroundColor Cyan
Write-Host "----------------------------------" -ForegroundColor Cyan

$merchantLoginBody = @{
    email = "merchant@example.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $merchantLoginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" `
        -Method POST `
        -Body $merchantLoginBody `
        -ContentType "application/json"
    
    $merchantToken = $merchantLoginResponse.data.accessToken
    Write-Host "✅ Merchant login successful!" -ForegroundColor Green
    Write-Host "👤 User: $($merchantLoginResponse.data.user.name)" -ForegroundColor White
    Write-Host "🔑 Token: $($merchantToken.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Merchant login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Step 4: Get Merchant Profile" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

try {
    $profileResponse = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/profile" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $merchantToken" }
    
    Write-Host "✅ Profile retrieved!" -ForegroundColor Green
    Write-Host "🏪 Name: $($profileResponse.data.name)" -ForegroundColor White
    Write-Host "🔖 Code: $($profileResponse.data.code)" -ForegroundColor White
    Write-Host "📧 Email: $($profileResponse.data.email)" -ForegroundColor White
    Write-Host "💰 Tax: $($profileResponse.data.taxPercentage)%" -ForegroundColor White
} catch {
    Write-Host "❌ Profile retrieval failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Step 5: Create Menu Category" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

$categoryBody = @{
    name = "Main Course"
    description = "Main dishes and entrees"
    sortOrder = 1
} | ConvertTo-Json

try {
    $categoryResponse = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/categories" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $merchantToken" } `
        -Body $categoryBody `
        -ContentType "application/json"
    
    $categoryId = $categoryResponse.data.id
    Write-Host "✅ Category created!" -ForegroundColor Green
    Write-Host "📁 Name: $($categoryResponse.data.name)" -ForegroundColor White
    Write-Host "🔢 ID: $categoryId" -ForegroundColor Gray
} catch {
    Write-Host "❌ Category creation failed: $_" -ForegroundColor Red
    $categoryId = "1"
    Write-Host "⚠️  Using default category ID: 1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Step 6: Create Menu Item" -ForegroundColor Cyan
Write-Host "---------------------------" -ForegroundColor Cyan

$menuBody = @{
    categoryId = $categoryId
    name = "Nasi Goreng Special"
    description = "Indonesian fried rice with chicken, vegetables, and fried egg"
    price = 15.50
    imageUrl = $null
    isAvailable = $true
    hasStock = $true
    stockQuantity = 50
} | ConvertTo-Json

try {
    $menuResponse = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/menu" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $merchantToken" } `
        -Body $menuBody `
        -ContentType "application/json"
    
    $menuId = $menuResponse.data.id
    Write-Host "✅ Menu item created!" -ForegroundColor Green
    Write-Host "🍽️  Name: $($menuResponse.data.name)" -ForegroundColor White
    Write-Host "💵 Price: `$$($menuResponse.data.price)" -ForegroundColor White
    Write-Host "📦 Stock: $($menuResponse.data.stockQty)" -ForegroundColor White
    Write-Host "🔢 ID: $menuId" -ForegroundColor Gray
} catch {
    Write-Host "❌ Menu creation failed: $_" -ForegroundColor Red
    $menuId = "1"
    Write-Host "⚠️  Using default menu ID: 1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Step 7: Browse Public Menu" -ForegroundColor Cyan
Write-Host "-----------------------------" -ForegroundColor Cyan

try {
    $publicMenuResponse = Invoke-RestMethod -Uri "$BASE_URL/api/public/menu/REST001" `
        -Method GET
    
    Write-Host "✅ Public menu retrieved!" -ForegroundColor Green
    Write-Host "🏪 Merchant: $($publicMenuResponse.data.merchant.name)" -ForegroundColor White
    Write-Host "📁 Categories: $($publicMenuResponse.data.menusByCategory.Count)" -ForegroundColor White
    
    foreach ($category in $publicMenuResponse.data.menusByCategory) {
        Write-Host "  • $($category.category.name): $($category.menus.Count) items" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Public menu retrieval failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Step 8: Create Public Order" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Cyan

$orderBody = @{
    merchantId = "1"
    orderType = "DINE_IN"
    tableNumber = "A5"
    customerName = "Test Customer"
    customerEmail = "testcustomer@example.com"
    customerPhone = "+61400111222"
    items = @(
        @{
            menuId = $menuId
            quantity = 2
            selectedAddons = @()
            specialInstructions = "Extra spicy please"
        }
    )
    notes = "Test order from quick start script"
} | ConvertTo-Json -Depth 10

try {
    $orderResponse = Invoke-RestMethod -Uri "$BASE_URL/api/public/orders" `
        -Method POST `
        -Body $orderBody `
        -ContentType "application/json"
    
    $orderNumber = $orderResponse.data.orderNumber
    Write-Host "✅ Order created successfully!" -ForegroundColor Green
    Write-Host "📋 Order Number: $orderNumber" -ForegroundColor White
    Write-Host "📊 Status: $($orderResponse.data.status)" -ForegroundColor White
    Write-Host "💰 Subtotal: `$$($orderResponse.data.subtotal)" -ForegroundColor White
    Write-Host "💵 Tax: `$$($orderResponse.data.taxAmount)" -ForegroundColor White
    Write-Host "💸 Total: `$$($orderResponse.data.totalAmount)" -ForegroundColor White
} catch {
    Write-Host "❌ Order creation failed: $_" -ForegroundColor Red
    $orderNumber = "ORD-20251109-0001"
    Write-Host "⚠️  Using sample order number" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Step 9: Track Order (Public)" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

try {
    $trackResponse = Invoke-RestMethod -Uri "$BASE_URL/api/public/orders/$orderNumber" `
        -Method GET
    
    Write-Host "✅ Order tracking retrieved!" -ForegroundColor Green
    Write-Host "📋 Order: $($trackResponse.data.orderNumber)" -ForegroundColor White
    Write-Host "📊 Status: $($trackResponse.data.status)" -ForegroundColor White
    Write-Host "🏪 Merchant: $($trackResponse.data.merchant.name)" -ForegroundColor White
    Write-Host "📅 Placed: $($trackResponse.data.placedAt)" -ForegroundColor Gray
    
    Write-Host "`n📜 Status History:" -ForegroundColor Yellow
    foreach ($history in $trackResponse.data.statusHistory) {
        Write-Host "  • $($history.toStatus): $($history.note)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Order tracking failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Step 10: View Orders (Merchant)" -ForegroundColor Cyan
Write-Host "----------------------------------" -ForegroundColor Cyan

try {
    $ordersResponse = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/orders?status=PENDING" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $merchantToken" }
    
    Write-Host "✅ Orders retrieved!" -ForegroundColor Green
    Write-Host "📦 Pending Orders: $($ordersResponse.data.Count)" -ForegroundColor White
    
    foreach ($order in $ordersResponse.data | Select-Object -First 3) {
        Write-Host "`n  Order: $($order.orderNumber)" -ForegroundColor Gray
        Write-Host "  Customer: $($order.customerName)" -ForegroundColor Gray
        Write-Host "  Total: `$$($order.totalAmount)" -ForegroundColor Gray
        Write-Host "  Status: $($order.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Orders retrieval failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Step 11: View Revenue Report" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

try {
    $revenueResponse = Invoke-RestMethod -Uri "$BASE_URL/api/merchant/revenue?type=total" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $merchantToken" }
    
    Write-Host "✅ Revenue report retrieved!" -ForegroundColor Green
    Write-Host "📊 Total Orders: $($revenueResponse.data.totalOrders)" -ForegroundColor White
    Write-Host "💰 Total Revenue: `$$($revenueResponse.data.totalRevenue)" -ForegroundColor White
    Write-Host "📈 Average Order: `$$($revenueResponse.data.averageOrderValue)" -ForegroundColor White
} catch {
    Write-Host "❌ Revenue report failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Quick Start Test Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Yellow
Write-Host "  • View API Documentation: docs/API_DOCUMENTATION.md" -ForegroundColor White
Write-Host "  • Read Testing Guide: docs/TESTING_GUIDE.md" -ForegroundColor White
Write-Host "  • Check Implementation Summary: docs/IMPLEMENTATION_SUMMARY.md" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin Token: $adminToken" -ForegroundColor Gray
Write-Host "  Merchant Token: $merchantToken" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Try these commands:" -ForegroundColor Yellow
Write-Host "  • npm run db:studio   # Open Prisma Studio" -ForegroundColor White
Write-Host "  • npm run dev         # Start development server" -ForegroundColor White
Write-Host "  • npx prisma migrate deploy  # Apply migrations" -ForegroundColor White
Write-Host ""
