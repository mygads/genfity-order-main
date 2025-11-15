/**
 * API Route: Unbind User from Merchant
 * PUT /api/admin/merchants/:id/unbind-user
 * Access: SUPER_ADMIN only
 * 
 * Removes user's merchant assignment and changes role back to CUSTOMER
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { ValidationError, NotFoundError, ERROR_CODES } from '@/lib/constants/errors';

async function unbindUserHandler(
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

  // Verify user exists and is linked to this merchant
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

  // Verify user is linked to the merchant
  const linkResult = await db.query(
    'SELECT id FROM merchant_users WHERE merchant_id = $1 AND user_id = $2',
    [merchantId.toString(), userIdBigInt.toString()]
  );

  if (linkResult.rows.length === 0) {
    throw new ValidationError('User is not linked to this merchant');
  }

  // Begin transaction
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Delete merchant-user link
    await client.query(
      'DELETE FROM merchant_users WHERE merchant_id = $1 AND user_id = $2',
      [merchantId.toString(), userIdBigInt.toString()]
    );

    // Change user role back to CUSTOMER
    await client.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['CUSTOMER', userIdBigInt.toString()]
    );

    await client.query('COMMIT');

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'CUSTOMER',
      },
      'User unbound successfully',
      200
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const PUT = withSuperAdmin(unbindUserHandler);
