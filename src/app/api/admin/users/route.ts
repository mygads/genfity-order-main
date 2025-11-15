/**
 * GET /api/admin/users
 * Get all users (Super Admin only)
 * 
 * POST /api/admin/users
 * Create new user and optionally link to merchant
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ValidationError, ERROR_CODES } from '@/lib/constants/errors';

/**
 * GET handler - Get all users
 */
async function getUsersHandler(
  request: NextRequest,
  _authContext: AuthContext
) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role'); // Filter by role
  const merchantId = searchParams.get('merchantId'); // Filter by merchant

  interface UserWithMerchants {
    id: bigint;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    merchantUsers?: Array<{ 
      merchantId: bigint;
      merchant: {
        id: bigint;
        name: string;
      };
    }>;
  }

  let users: UserWithMerchants[];
  
  if (role) {
    users = await userRepository.findByRole(role);
  } else {
    users = await userRepository.findAll();
  }

  // Filter by merchant if specified
  if (merchantId && users) {
    const merchantIdBigInt = BigInt(merchantId);
    users = users.filter((user: UserWithMerchants) => 
      user.merchantUsers?.some((mu) => mu.merchantId === merchantIdBigInt)
    );
  }

  // Format response with merchant info
  const formattedUsers = users.map(user => ({
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    merchantId: user.merchantUsers?.[0]?.merchantId.toString(),
    merchantName: user.merchantUsers?.[0]?.merchant.name,
    createdAt: user.createdAt.toISOString(),
  }));

  return successResponse(formattedUsers, 'Users retrieved successfully', 200);
}

/**
 * POST handler - Create new user
 */
async function createUserHandler(
  request: NextRequest,
  _authContext: AuthContext
) {
  const body = await request.json();

  // Validate inputs
  validateRequired(body.name, 'Name');
  validateRequired(body.email, 'Email');
  validateRequired(body.role, 'Role');
  validateRequired(body.password, 'Password');
  validateEmail(body.email);

  // Validate role
  const validRoles = ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF', 'CUSTOMER'];
  if (!validRoles.includes(body.role)) {
    throw new ValidationError('Invalid role');
  }

  // Check email uniqueness
  const emailExists = await userRepository.emailExists(body.email);
  if (emailExists) {
    throw new ConflictError(
      'Email already registered',
      ERROR_CODES.EMAIL_ALREADY_EXISTS
    );
  }

  // Hash password provided by admin
  const hashedPassword = await hashPassword(body.password);

  // Create user
  const user = await userRepository.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    passwordHash: hashedPassword,
    role: body.role,
    isActive: body.isActive !== undefined ? body.isActive : true,
    mustChangePassword: false, // Directly active, no password change required
  });

  // Link to merchant if merchantId and role is MERCHANT_OWNER or MERCHANT_STAFF
  if (body.merchantId && (body.role === 'MERCHANT_OWNER' || body.role === 'MERCHANT_STAFF')) {
    const merchantIdBigInt = BigInt(body.merchantId);
    const merchantRole = body.role === 'MERCHANT_OWNER' ? 'OWNER' : 'STAFF';
    
    await merchantService.addStaff(merchantIdBigInt, user.id, merchantRole);
  }

  return successResponse(
    { user },
    'User created successfully',
    201
  );
}

export const GET = withSuperAdmin(getUsersHandler);
export const POST = withSuperAdmin(createUserHandler);
