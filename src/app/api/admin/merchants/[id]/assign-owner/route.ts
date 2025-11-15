/**
 * API Route: Assign Owner to Merchant
 * PUT /api/admin/merchants/:id/assign-owner
 * Access: SUPER_ADMIN only
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { 
  ValidationError, 
  NotFoundError,
  ERROR_CODES 
} from '@/lib/constants/errors';

/**
 * Assign a user as merchant owner
 */
async function assignOwnerHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const merchantId = BigInt(params.id);

  // Parse request body
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const userIdBigInt = BigInt(userId);

  // Verify merchant exists
  const merchantResult = await db.query(
    'SELECT id, name FROM merchants WHERE id = $1 AND deleted_at IS NULL',
    [merchantId.toString()]
  );

  if (merchantResult.rows.length === 0) {
    throw new NotFoundError('Merchant not found', ERROR_CODES.MERCHANT_NOT_FOUND);
  }

  // Verify user exists and is not already assigned to a merchant
  const userResult = await db.query(
    `SELECT u.id, u.name, u.email, u.role 
     FROM users u 
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userIdBigInt.toString()]
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
  }

  const user = userResult.rows[0];

  // Check if user is already a merchant owner or staff
  if (user.role === 'MERCHANT_OWNER' || user.role === 'MERCHANT_STAFF') {
    throw new ValidationError('User is already assigned to a merchant');
  }

  // Check if user already has merchant link
  const existingLink = await db.query(
    'SELECT id FROM merchant_users WHERE user_id = $1',
    [userIdBigInt.toString()]
  );

  if (existingLink.rows.length > 0) {
    throw new ValidationError('User is already linked to a merchant');
  }

  // Begin transaction
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Update user role to MERCHANT_OWNER
    await client.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['MERCHANT_OWNER', userIdBigInt.toString()]
    );

    // Create merchant-user link
    await client.query(
      'INSERT INTO merchant_users (merchant_id, user_id) VALUES ($1, $2)',
      [merchantId.toString(), userIdBigInt.toString()]
    );

    await client.query('COMMIT');

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'MERCHANT_OWNER',
      },
      'Owner assigned successfully',
      200
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const PUT = withSuperAdmin(assignOwnerHandler);

