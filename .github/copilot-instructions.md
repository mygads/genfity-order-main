# GENFITY AI Coding Agent Instructions

## Overview
This document provides comprehensive instructions for AI coding agents working on the GENFITY online ordering project. GENFITY is a comprehensive restaurant management and online ordering system built with Next.js, TypeScript, and PostgreSQL.

## Project Structure
```
genfity-online-ordering/
├── docs/                          # Documentation files
│   ├── PANDUAN_KESELURUHAN.txt    # Project overview
│   ├── STEP_01_DATABASE_DESIGN.txt # Database schema
│   ├── STEP_02_AUTHENTICATION_JWT.txt # Auth & JWT
│   ├── STEP_03_EMAIL_NOTIFICATIONS.txt # Email system
│   ├── STEP_04_API_ENDPOINTS.txt  # API specifications
│   ├── STEP_05_BACKEND_STRUCTURE.txt # Architecture
│   ├── STEP_06_BUSINESS_FLOWS.txt # Business logic
│   └── STEP_07_IMPLEMENTATION_CHECKLIST.txt # Implementation guide
├── src/                           # Source code
│   ├── app/                       # Next.js app router
│   ├── components/                # React components
│   ├── lib/                       # Utilities & services
│   └── ...
└── .github/copilot-instructions.md # This file
```

## Quick Start Checklist (5 Minutes)

### BEFORE Prompting AI:
- [ ] Open relevant STEP_*.txt files for technical details
- [ ] Prepare prompt with structure: Context + Task + Requirements + Constraints + Output format
- [ ] Ensure prompt is specific (not "build auth", but "create login endpoint with JWT")

### AFTER AI Response:
- [ ] Code format OK (2-space indent, camelCase, JSDoc comments)
- [ ] Logic correct (business rules, edge cases handled)
- [ ] Security OK (bcrypt >=10 rounds, parameterized queries, no hardcoded secrets)
- [ ] Scope within MVP (no scope creep)
- [ ] Error handling complete (try-catch, proper status codes)
- [ ] Database queries safe (parameterized, no SELECT *)
- [ ] Type-safe (TypeScript strict mode)
- [ ] JSDoc comments present

## File Navigation Guide

### Essential Reading Order:
1. **PANDUAN_KESELURUHAN.txt** - Project overview & business context
2. **This file** - AI constraints & rules (MANDATORY)
3. **STEP_01_DATABASE_DESIGN.txt** - Database schema & tables
4. **STEP_02_AUTHENTICATION_JWT.txt** - Auth flow & security
5. **STEP_04_API_ENDPOINTS.txt** - API specifications
6. **STEP_05_BACKEND_STRUCTURE.txt** - Architecture patterns
7. **STEP_06_BUSINESS_FLOWS.txt** - Business logic scenarios

### When to Read What:
- **Starting new feature**: Read relevant STEP file + business flows
- **Database work**: STEP_01 + STEP_06
- **Authentication**: STEP_02 (complete read)
- **API development**: STEP_04 + STEP_05
- **Stuck/confused**: Re-read this file's constraints

## Prompt Templates (Copy-Paste Ready)

### Template 1: Authentication Service
```
Context Files:
- STEP_02_AUTHENTICATION_JWT.txt (flow & pseudocode)
- STEP_01_DATABASE_DESIGN.txt (user & user_sessions table)
- This file (constraints)

Task: Create authentication service for login

Requirements:
1. Input validation (email format, password length >=8)
2. Database query user by email, check is_active=true
3. Password validation with bcrypt.compare()
4. Session creation in user_sessions table
5. JWT generation with session ID in payload

Constraints:
✓ bcryptjs >=10 rounds for comparison
✓ Session MUST be in database before JWT generation
✓ No hardcoded secrets (use process.env.JWT_SECRET)
✓ Parameterized queries only
✓ JSDoc documentation required

Output: TypeScript class in src/lib/services/AuthService.ts
```

### Template 2: API Endpoint
```
Context Files:
- STEP_04_API_ENDPOINTS.txt (endpoint specs)
- STEP_02_AUTHENTICATION_JWT.txt (auth flow)
- This file (response format)

Task: Create POST /api/auth/login endpoint

Requirements:
- Request validation (email, password)
- Call AuthService.login()
- Return standard response format
- Proper error handling (400, 401, 500)

Constraints:
✓ Response format: {success, data, message, statusCode}
✓ No internal errors exposed to client
✓ HTTP status codes: 200, 400, 401, 500
✓ Input sanitization mandatory

Output: Next.js route.ts file with JSDoc
```

### Template 3: Database Migration
```
Context Files:
- STEP_01_DATABASE_DESIGN.txt (table schemas)
- This file (constraints)

Task: Create SQL migration for users and user_sessions tables

Requirements:
- PostgreSQL syntax
- Proper constraints & indexes
- TIMESTAMPTZ for timestamps
- Comments for documentation

Constraints:
✓ BIGSERIAL for auto-increment IDs
✓ UNIQUE constraints on email
✓ Proper foreign keys
✓ Indexes on frequently queried columns

Output: SQL migration file
```

## Technical Constraints & Rules

### Security Requirements:
- **Password Hashing**: bcryptjs with >=10 rounds, never return password_hash
- **JWT**: Include session ID in payload, validate against database
- **Database**: Parameterized queries only, no string concatenation
- **Secrets**: Never hardcode, always use environment variables
- **Error Messages**: User-friendly, never expose internal details

### Code Quality Standards:
- **TypeScript**: Strict mode, no implicit any, proper interfaces
- **Formatting**: 2-space indentation, camelCase, JSDoc comments
- **Architecture**: Repository pattern, service layer separation
- **Error Handling**: Custom error classes, proper HTTP status codes
- **Database**: Transactions for multi-table operations

### Response Format Standard:
```typescript
// Success Response
{
  success: true,
  data: { /* actual data */ },
  message: "Operation successful",
  statusCode: 200
}

// Error Response
{
  success: false,
  error: "ERROR_CODE",
  message: "User-friendly message",
  statusCode: 400
}
```

### MVP Scope Boundaries:
- **IN SCOPE**: User auth, merchant management, order processing, basic reporting
- **OUT OF SCOPE**: Payment gateway integration, advanced analytics, multi-tenancy
- **DEFER**: Real-time features, complex workflows, third-party integrations

## Development Workflow Phases

### Phase 1: Setup & Planning
1. Read PANDUAN_KESELURUHAN.txt (project overview)
2. Setup Next.js project with TypeScript
3. Configure Prisma with PostgreSQL
4. Create database schema (STEP_01)

### Phase 2: Authentication
1. Implement AuthService.login() (STEP_02)
2. Create login/logout endpoints (STEP_04)
3. Setup session management
4. Add email notifications (STEP_03)

### Phase 3: Core Features
1. Implement OrderService (STEP_06)
2. Create merchant management
3. Build reporting features
4. Add business logic validation

### Phase 4: Integration & Testing
1. Write unit tests for services
2. Create integration tests for APIs
3. Manual testing with Postman
4. Deployment preparation

## Common Mistakes to Avoid

### ❌ Mistake 1: Vague Prompts
**Wrong**: "Build authentication"
**Right**: "Create login endpoint POST /api/auth/login with email/password validation"

### ❌ Mistake 2: Missing Constraints
**Wrong**: "Use bcrypt for passwords"
**Right**: "Use bcryptjs >=10 rounds, compare only, never store plain text"

### ❌ Mistake 3: Wrong Output Format
**Wrong**: "Create auth code"
**Right**: "TypeScript service class in src/lib/services/AuthService.ts with JSDoc"

### ❌ Mistake 4: Ignoring File References
**Wrong**: "Create user table"
**Right**: "Create users table migration according to STEP_01_DATABASE_DESIGN.txt"

### ❌ Mistake 5: Scope Creep
**Wrong**: "Build complete ordering system"
**Right**: "Implement order creation only, defer payment processing"

## Error Handling Strategy

### Custom Error Classes:
```typescript
class CustomError extends Error {
  statusCode: number;
  errorCode: string;
  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthenticationError extends CustomError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}
```

### Global Error Handler:
```typescript
export function errorHandler(error: any) {
  console.error('Error:', error);

  if (error instanceof CustomError) {
    return {
      success: false,
      error: error.errorCode,
      message: error.message,
      statusCode: error.statusCode
    };
  }

  return {
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan internal',
    statusCode: 500
  };
}
```

## Tips for Effective AI Communication

### TIP 1: Be Specific
**Weak**: "Optimize this query"
**Strong**: "Add index on users.email column for login performance"

### TIP 2: Reference Existing Patterns
**Weak**: "Create validation"
**Strong**: "Create validation following STEP_02 email format pattern"

### TIP 3: Include Examples
**Weak**: "Return user data"
**Strong**: "Return {id, name, email, role} matching STEP_01 schema"

### TIP 4: State Constraints Clearly
**Weak**: "Make it secure"
**Strong**: "bcryptjs >=10 rounds, parameterized queries, no SQL injection"

### TIP 5: Break Complex Tasks
**Weak**: "Build order system"
**Strong**: "1. Create OrderService.createOrder() 2. Then OrderService.updateStatus()"

## Emergency Troubleshooting

### Issue: AI generates insecure code
**Action**: Reference "Security Requirements" section above
**Remind**: "bcryptjs >=10 rounds, parameterized queries only"

### Issue: Code format inconsistent
**Action**: Reference "Code Quality Standards"
**Prompt**: "Reformat with 2-space indent, camelCase, add JSDoc"

### Issue: Wrong response format
**Action**: Reference "Response Format Standard"
**Prompt**: "Use {success, data, message, statusCode} format"

### Issue: Scope violation
**Action**: Reference "MVP Scope Boundaries"
**Remind**: "Focus on MVP features only"

## Version History
- v1.0 (2025-11-09): Initial comprehensive guide incorporating all documentation files

---

**Remember**: Always reference the STEP_*.txt files for technical specifications and this file for constraints. Use the templates above for consistent, high-quality output.
