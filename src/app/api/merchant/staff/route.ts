/**
 * GET /api/merchant/staff
 * Get all staff for merchant owner's merchant
 * 
 * POST /api/merchant/staff
 * Create new staff account and link to merchant
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withMerchantOwner } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import userRepository from '@/lib/repositories/UserRepository';
import merchantService from '@/lib/services/MerchantService';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { validateEmail, validateRequired } from '@/lib/utils/validators';
import { ConflictError, ERROR_CODES } from '@/lib/constants/errors';

/**
 * GET handler - Get all staff for merchant
 */
async function getStaffHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  const merchantId = authContext.merchantId!;

  // Get merchant with staff
  const merchant = await merchantService.getMerchantById(merchantId);
  
  const staff = merchant?.merchantUsers
    ?.filter((mu: { role: string }) => mu.role === 'STAFF')
    .map((mu: { user: unknown }) => mu.user) || [];

  return successResponse({ staff }, 'Staff retrieved successfully', 200);
}

/**
 * POST handler - Create new staff
 */
async function createStaffHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  const merchantId = authContext.merchantId!;
  const body = await request.json();

  // Validate inputs
  validateRequired(body.name, 'Staff name');
  validateRequired(body.email, 'Staff email');
  validateRequired(body.password, 'Password');
  validateEmail(body.email);

  // Check email uniqueness
  const emailExists = await userRepository.emailExists(body.email);
  if (emailExists) {
    throw new ConflictError(
      'Email already registered',
      ERROR_CODES.EMAIL_ALREADY_EXISTS
    );
  }

  // Hash password provided by merchant owner
  const hashedPassword = await hashPassword(body.password);

  // Create staff user
  const staff = await userRepository.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    passwordHash: hashedPassword,
    role: 'MERCHANT_STAFF',
    isActive: true,
    mustChangePassword: false, // No need to change password
  });

  // Link staff to merchant
  await merchantService.addStaff(merchantId, staff.id, 'STAFF');

  return successResponse(
    { staff },
    'Staff created successfully',
    201
  );
}

export const GET = withMerchantOwner(getStaffHandler);
export const POST = withMerchantOwner(createStaffHandler);
