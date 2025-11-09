# GENFITY Online Ordering System

**A comprehensive restaurant management and online ordering platform built with Next.js, TypeScript, PostgreSQL, and Prisma ORM.**

![GENFITY - Restaurant Online Ordering](./banner.png)

## 🌟 Overview

GENFITY adalah platform online ordering untuk restoran dengan fitur multi-merchant management yang lengkap. Sistem ini dirancang untuk:

- **Super Admin**: Kelola banyak merchant/restaurant dari satu dashboard
- **Merchant**: Kelola profil, menu, addon, order, dan lihat revenue
- **Customer**: Browse menu, pesan dengan QR code, pilih mode Dine-in/Takeaway

### Key Features

✅ **Multi-Merchant Management** - Super admin dapat mengelola banyak merchant  
✅ **JWT Authentication** - Secure authentication dengan session tracking  
✅ **Menu & Addon Management** - Kompleks menu system dengan addon categories  
✅ **Order Processing** - Complete order flow dengan status tracking & QR code  
✅ **Revenue Reporting** - Analytics untuk merchant dan super admin  
✅ **Email Notifications** - SMTP-based email untuk password & order confirmation  
✅ **Multi-Device Session** - Support multiple device login dengan session management  
✅ **Role-Based Access Control** - 4 user roles (Super Admin, Merchant Owner, Merchant Staff, Customer)  

---

## 🚀 Tech Stack

### Frontend
- **Next.js 15** - App Router with React Server Components
- **React 19** - Latest React features
- **TypeScript** - Type-safe development
- **TailwindCSS V4** - Modern utility-first CSS
- **TailAdmin** - Pre-built dashboard components

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **PostgreSQL 14+** - Relational database
- **Prisma ORM 6.19.0** - Type-safe database client
- **JWT (jsonwebtoken)** - Authentication tokens
- **bcryptjs** - Password hashing
- **Nodemailer** - Email sending (SMTP)
- **qrcode** - QR code generation for orders

---

## 📦 Quick Start

### Prerequisites

- **Node.js** 18.x or later (recommended 20.x+)
- **PostgreSQL** 14.x or later
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/genfity-online-ordering.git
   cd genfity-online-ordering
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/genfity_db"

   # JWT
   JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
   JWT_EXPIRY=3600
   JWT_REFRESH_EXPIRY=604800

   # SMTP Email
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASSWORD="your-app-password"
   EMAIL_FROM="GENFITY <noreply@genfity.com>"

   # App
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   NEXT_PUBLIC_CURRENCY="AUD"
   NEXT_PUBLIC_LANGUAGE="en"
   ```

4. **Setup database**
   ```bash
   # Create database
   createdb genfity_db

   # Run migrations
   npm run db:migrate

   # Seed super admin
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Default Credentials

**Super Admin**:
- Email: `admin@genfity.com`
- Password: `Admin@123456`
- ⚠️ **Change this password in production!**

---

## 📚 Documentation

Comprehensive documentation tersedia di folder `docs/`:

### Project Documentation
- **[PANDUAN_KESELURUHAN.txt](docs/PANDUAN_KESELURUHAN.txt)** - Project overview & business requirements
- **[STEP_01_DATABASE_DESIGN.txt](docs/STEP_01_DATABASE_DESIGN.txt)** - Database schema & table design
- **[STEP_02_AUTHENTICATION_JWT.txt](docs/STEP_02_AUTHENTICATION_JWT.txt)** - Authentication flow & JWT
- **[STEP_03_EMAIL_NOTIFICATIONS.txt](docs/STEP_03_EMAIL_NOTIFICATIONS.txt)** - Email templates & SMTP
- **[STEP_04_API_ENDPOINTS.txt](docs/STEP_04_API_ENDPOINTS.txt)** - API endpoint specifications
- **[STEP_05_BACKEND_STRUCTURE.txt](docs/STEP_05_BACKEND_STRUCTURE.txt)** - Architecture & code structure
- **[STEP_06_BUSINESS_FLOWS.txt](docs/STEP_06_BUSINESS_FLOWS.txt)** - Business logic & scenarios
- **[STEP_07_IMPLEMENTATION_CHECKLIST.txt](docs/STEP_07_IMPLEMENTATION_CHECKLIST.txt)** - Implementation guide

### API & Testing Guides ⭐ NEW
- **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - Complete API reference with examples
- **[TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** - Testing guide with cURL, Postman, unit tests
- **[IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Complete implementation summary

### Setup Guides
- **[DATABASE_SETUP.md](docs/DATABASE_SETUP.md)** - PostgreSQL setup & troubleshooting
- **[SMTP_SETUP.md](docs/SMTP_SETUP.md)** - Email provider configuration
- **[API_AUTHENTICATION.md](docs/API_AUTHENTICATION.md)** - Authentication API documentation

### Progress Tracking
- **[IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md)** - Development progress tracker
- **[PHASE_2_SUMMARY.md](PHASE_2_SUMMARY.md)** - Phase 2 completion summary

---

## 🗂️ Project Structure

```
genfity-online-ordering/
├── docs/                          # Documentation files
│   ├── PANDUAN_KESELURUHAN.txt
│   ├── STEP_01_DATABASE_DESIGN.txt
│   ├── STEP_02_AUTHENTICATION_JWT.txt
│   ├── STEP_03_EMAIL_NOTIFICATIONS.txt
│   ├── STEP_04_API_ENDPOINTS.txt
│   ├── STEP_05_BACKEND_STRUCTURE.txt
│   ├── STEP_06_BUSINESS_FLOWS.txt
│   ├── STEP_07_IMPLEMENTATION_CHECKLIST.txt
│   ├── DATABASE_SETUP.md
│   ├── SMTP_SETUP.md
│   └── API_AUTHENTICATION.md
├── prisma/
│   ├── schema.prisma             # Database schema (13 tables)
│   ├── seed.ts                   # Super admin seeder
│   └── migrations/               # Database migrations
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API endpoints
│   │   │   └── auth/             # ✅ Authentication endpoints (Phase 2)
│   │   ├── (admin)/              # Super Admin dashboard
│   │   ├── (full-width-pages)/   # Auth pages (login, signup)
│   │   └── layout.tsx
│   ├── components/               # React components (TailAdmin)
│   ├── lib/
│   │   ├── repositories/         # ✅ Database operations (Phase 2)
│   │   │   ├── UserRepository.ts
│   │   │   ├── SessionRepository.ts
│   │   │   ├── MerchantRepository.ts
│   │   │   ├── MenuRepository.ts
│   │   │   └── OrderRepository.ts
│   │   ├── services/             # ✅ Business logic (Phase 2)
│   │   │   ├── AuthService.ts
│   │   │   └── EmailService.ts
│   │   ├── middleware/           # ✅ Request middleware (Phase 2)
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── utils/                # ✅ Utility functions (Phase 1)
│   │   │   ├── passwordHasher.ts
│   │   │   ├── jwtManager.ts
│   │   │   ├── validators.ts
│   │   │   ├── qrCodeGenerator.ts
│   │   │   └── emailTemplates.ts
│   │   ├── constants/            # ✅ Constants & errors (Phase 1)
│   │   │   ├── roles.ts
│   │   │   ├── status.ts
│   │   │   └── errors.ts
│   │   ├── types/                # ✅ TypeScript types (Phase 1)
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   └── api.ts
│   │   └── db/
│   │       └── client.ts         # ✅ Prisma client (Phase 1)
│   └── ...
├── .env.example                  # Environment template
├── .env.local                    # Local environment (git-ignored)
├── test-auth-api.ts              # ✅ API test script (Phase 2)
├── IMPLEMENTATION_PROGRESS.md    # Progress tracker
├── PHASE_2_SUMMARY.md            # Phase 2 summary
└── README.md                     # This file
```

---

## 🔐 Security Features

### Implemented Security
✅ **Password Hashing**: bcrypt with 10 rounds minimum  
✅ **JWT with Session Validation**: Every request validates session in database  
✅ **Input Validation**: Email, password, merchant code, phone number  
✅ **SQL Injection Prevention**: Prisma parameterized queries  
✅ **XSS Prevention**: Input sanitization  
✅ **CSRF Protection**: Next.js built-in middleware  
✅ **Multi-Device Session Tracking**: IP address & device info logging  
✅ **Session Revocation**: Logout works immediately (database validation)

### Security Best Practices
- ⚠️ **Never commit `.env.local`** - Sensitive credentials must be in `.gitignore`
- ⚠️ **Change default admin password** - Use strong password in production
- ⚠️ **Use HTTPS in production** - Never send JWT over HTTP
- ⚠️ **Rotate JWT secrets regularly** - Update `JWT_SECRET` periodically
- ⚠️ **Enable rate limiting** - Protect against brute force attacks (TODO)
- ⚠️ **Setup SPF/DKIM/DMARC** - Email authentication for production

---

## 🧪 Testing

### Test Authentication API

```bash
# Start development server
npm run dev

# In another terminal, run tests
npx tsx test-auth-api.ts
```

**Tests Included**:
1. Login with valid credentials
2. Login with invalid credentials (error handling)
3. Get current user info
4. Get active sessions
5. Refresh token
6. Access without token (unauthorized)
7. Logout
8. Access after logout (session revoked)

### Manual Testing with Postman

1. Import endpoints from `docs/API_AUTHENTICATION.md`
2. Set base URL: `http://localhost:3000`
3. Login with: `admin@genfity.com` / `Admin@123456`
4. Copy `accessToken` from response
5. Use in Authorization header: `Bearer <token>`

---

## 📝 Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run db:migrate   # Create & apply migration
npm run db:seed      # Seed super admin
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:push      # Push schema without migration
npm run db:reset     # Reset database (⚠️ destructive)
```

### Prisma
```bash
npx prisma generate        # Generate Prisma Client
npx prisma migrate status  # Check migration status
npx prisma format          # Format schema.prisma
npx prisma studio          # Open Prisma Studio
```

---

## 🎯 Development Roadmap

### ✅ Phase 1: Foundation (Complete)
- [x] Dependencies installation
- [x] Database schema (13 tables)
- [x] Environment setup
- [x] Constants & error handling
- [x] Database client (Prisma)
- [x] TypeScript types
- [x] Utility functions
- [x] Middleware (error handler)
- [x] Documentation

### ✅ Phase 2: Backend Core (Complete)
- [x] Repository layer (5 repositories, 82+ methods)
- [x] Email service (SMTP with Nodemailer)
- [x] Authentication service (9 methods)
- [x] Auth middleware (RBAC)
- [x] Authentication API endpoints (8 endpoints)
- [x] API documentation
- [x] Test scripts

### ✅ Phase 3: Admin & Merchant Backend (Complete)
- [x] MerchantService (11 methods)
- [x] MenuService (33 methods)
- [x] OrderService (17 methods)
- [x] Admin API endpoints (6 endpoints - `/api/admin/*`)
- [x] Merchant API endpoints (8 endpoints - `/api/merchant/*`)
- [x] Public API endpoints (4 endpoints - `/api/public/*`)

### ✅ Phase 4: Testing & Documentation (Complete)
- [x] Comprehensive API documentation (`docs/API_DOCUMENTATION.md`)
- [x] Complete testing guide (`docs/TESTING_GUIDE.md`)
- [x] Implementation summary (`docs/IMPLEMENTATION_SUMMARY.md`)
- [x] Error verification & fixes
- [x] Code quality review

### 📋 Phase 5: Frontend Development (Next)
- [ ] Landing page
- [ ] Sign in page (universal for all roles)
- [ ] Super Admin dashboard
- [ ] Merchant dashboard
- [ ] Customer storefront
- [ ] Cart management
- [ ] Order tracking

### 🧪 Phase 6: Testing & Deployment (Future)
- [ ] Unit tests (services, utilities)
- [ ] Integration tests (API endpoints)
- [ ] E2E tests (user flows)
- [ ] Production deployment
- [ ] Performance optimization

---

## 📊 Database Schema

**13 Tables**:
1. `users` - All user accounts (Super Admin, Merchant, Customer)
2. `user_sessions` - JWT session tracking & revocation
3. `merchant_users` - User-merchant relationships dengan roles
4. `merchants` - Merchant/restaurant profiles
5. `merchant_opening_hours` - Operating hours per day
6. `menu_categories` - Menu categories
7. `menus` - Menu items dengan stock tracking
8. `addon_categories` - Addon categories (min/max selection)
9. `addon_items` - Addon items dengan pricing
10. `menu_addon_categories` - Many-to-many menu-addon link
11. `orders` - Customer orders dengan QR code
12. `order_items` - Order line items
13. `order_item_addons` - Selected addons per order item
14. `order_status_history` - Status change audit trail

**5 Enums**:
- `UserRole`: SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF, CUSTOMER
- `MerchantRole`: OWNER, STAFF
- `SessionStatus`: ACTIVE, REVOKED, EXPIRED
- `OrderType`: DINE_IN, TAKEAWAY
- `OrderStatus`: PENDING, ACCEPTED, IN_PROGRESS, READY, COMPLETED, CANCELLED

View full schema in `prisma/schema.prisma`.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- ✅ TypeScript strict mode
- ✅ 2-space indentation
- ✅ camelCase naming
- ✅ JSDoc comments for public methods
- ✅ Proper error handling with custom error classes
- ✅ Input validation & sanitization

---

## 📄 License

This project is based on [TailAdmin Next.js Free](https://github.com/TailAdmin/free-nextjs-admin-dashboard) (MIT License).

GENFITY Online Ordering System is released under the **MIT License**.

---

## 🙏 Acknowledgments

- **TailAdmin** - Dashboard template foundation
- **Next.js Team** - Amazing React framework
- **Prisma** - Type-safe database ORM
- **Tailwind CSS** - Utility-first CSS framework

---

## 📞 Support

For questions, issues, or support:

1. **Documentation**: Check `docs/` folder
2. **GitHub Issues**: [Open an issue](https://github.com/YOUR_USERNAME/genfity-online-ordering/issues)
3. **Email**: support@genfity.com

---

## ⭐ Star This Repository

If you find this project helpful, please consider giving it a star on GitHub. Your support helps us continue developing and maintaining this system!

---

**Built with ❤️ using Next.js, TypeScript, PostgreSQL, and Prisma**
