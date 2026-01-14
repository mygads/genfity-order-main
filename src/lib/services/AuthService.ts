/**
 * Authentication Service
 * Handles login, logout, token management, and session tracking (STEP_02)
 */

import userRepository from '@/lib/repositories/UserRepository';
import sessionRepository from '@/lib/repositories/SessionRepository';
import { hashPassword, comparePassword } from '@/lib/utils/passwordHasher';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/utils/jwtManager';
import { validateEmail, validatePassword } from '@/lib/utils/validators';
import { AuthenticationError, NotFoundError, ERROR_CODES } from '@/lib/constants/errors';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';
import type { LoginRequest, LoginResponse } from '@/lib/types/auth';

class AuthService {
  /**
   * Get session duration based on role and rememberMe
   * 
   * Duration rules:
   * - ADMIN/OWNER/STAFF with rememberMe: 1 week (604800 seconds)
   * - ADMIN/OWNER/STAFF without rememberMe: 1 day (86400 seconds)
   * 
   * Note: Customers use separate CustomerAuthService with 1-year sessions
   */
  private getSessionDuration(role: string, rememberMe?: boolean): number {
    // Admin, Merchant Owner, Merchant Staff
    if (rememberMe) {
      return 7 * 24 * 60 * 60; // 604800 seconds = 7 days (1 week)
    }

    return 24 * 60 * 60; // 86400 seconds = 1 day
  }

  /**
   * Get refresh token duration based on role and rememberMe
   * Refresh duration is 2x session duration for token refresh capability
   */
  private getRefreshDuration(role: string, rememberMe?: boolean): number {
    return this.getSessionDuration(role, rememberMe) * 2;
  }

  /**
   * Login user - STEP_02 Flow
   * 1. Validate input
   * 2. Find user by email
   * 3. Verify password
   * 4. Create session in database
   * 5. Generate JWT with session ID
   * 6. Update last login timestamp
   */
  async login(
    credentials: LoginRequest,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<LoginResponse> {
    // Step 1: Validate input
    validateEmail(credentials.email);
    validatePassword(credentials.password);

    // Step 2: Find user by email
    const user = await userRepository.findByEmail(credentials.email);

    if (!user) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError(
        'Your account has been deactivated',
        ERROR_CODES.USER_INACTIVE
      );
    }

    // Step 3: Verify password
    const isPasswordValid = await comparePassword(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if user must change password
    if (user.mustChangePassword) {
      throw new AuthenticationError(
        'You must change your password before continuing',
        ERROR_CODES.MUST_CHANGE_PASSWORD
      );
    }

    const loginClient = credentials.client ?? 'admin';

    // Step 4: Calculate session duration based on role and rememberMe
    // Note: we may override the token role for driver-mode sessions.
    const sessionDuration = this.getSessionDuration(user.role, credentials.rememberMe);
    const refreshDuration = this.getRefreshDuration(user.role, credentials.rememberMe);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + sessionDuration);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setSeconds(
      refreshExpiresAt.getSeconds() + refreshDuration
    );

    // Generate temporary token for session creation
    const tempToken = `temp_${user.id}_${Date.now()}`;

    const session = await sessionRepository.create({
      user: {
        connect: { id: user.id },
      },
      token: tempToken,
      deviceInfo,
      ipAddress,
      status: 'ACTIVE',
      expiresAt,
      refreshExpiresAt,
    });

    // Step 6: Update last login timestamp
    await userRepository.updateLastLogin(user.id);

    // Build merchant context from merchant_users (filtered by active links + active merchants)
    const allActiveMerchantUsers = (user.merchantUsers ?? []).filter(
      (mu: { isActive: boolean; merchant: { isActive: boolean } }) => mu.isActive && mu.merchant.isActive
    );

    // Staff invitations must be accepted before login.
    // We keep WAITING links out of the active context, but still detect them to show a clear error.
    const pendingStaffInvite = allActiveMerchantUsers.find(
      (mu: { role: string; invitationStatus?: string; inviteTokenExpiresAt?: Date | null }) =>
        mu.role === 'STAFF' && mu.invitationStatus === 'WAITING'
    );

    const activeMerchantUsers = allActiveMerchantUsers.filter(
      (mu: { role: string; invitationStatus?: string }) =>
        mu.role !== 'STAFF' || mu.invitationStatus !== 'WAITING'
    );

    const adminMerchantUsers = activeMerchantUsers.filter(
      (mu: { role: string }) => mu.role === 'OWNER' || mu.role === 'STAFF'
    );

    const driverMerchantUsers = activeMerchantUsers.filter(
      (mu: { role: string }) => mu.role === 'DRIVER'
    );

    let effectiveRole = user.role;
    let merchantId: bigint | undefined;
    let merchantIdString: string | undefined;
    let merchants: Array<{
      merchantId: string;
      merchantCode: string;
      merchantName: string;
      merchantLogo: string | null;
      address: string | null;
      city: string | null;
      isOpen: boolean;
      role: string;
      permissions: string[];
      isActive: boolean;
    }> = [];
    let needsMerchantSelection = false;
    let currentMerchantPermissions: string[] = [];
    let currentMerchantRole: string | undefined;

    if (loginClient === 'admin') {
      // Hard-separate the admin portal from the driver portal.
      if (user.role === 'DELIVERY') {
        throw new AuthenticationError(
          'Please login via the Driver portal',
          ERROR_CODES.FORBIDDEN
        );
      }

      if (adminMerchantUsers.length > 0) {
        merchants = adminMerchantUsers.map((mu: {
          merchantId: bigint;
          role: string;
          permissions: string[];
          isActive: boolean;
          merchant: {
            code: string;
            name: string;
            logoUrl: string | null;
            address: string | null;
            city: string | null;
            isOpen: boolean;
          };
        }) => ({
          merchantId: mu.merchantId.toString(),
          merchantCode: mu.merchant.code,
          merchantName: mu.merchant.name,
          merchantLogo: mu.merchant.logoUrl,
          address: mu.merchant.address,
          city: mu.merchant.city,
          isOpen: mu.merchant.isOpen,
          role: mu.role,
          permissions: mu.role === 'OWNER' ? Object.values(STAFF_PERMISSIONS) : mu.permissions,
          isActive: mu.isActive,
        }));

        // Staff must be linked to exactly one merchant.
        if (user.role === 'MERCHANT_STAFF' && merchants.length > 1) {
          throw new AuthenticationError(
            'Your account is linked to multiple merchants. Staff accounts must have exactly one merchant.',
            ERROR_CODES.FORBIDDEN
          );
        }

        needsMerchantSelection = user.role === 'MERCHANT_OWNER' ? merchants.length > 1 : false;

        // If specific merchantId requested, use that; otherwise use first merchant
        if (credentials.merchantId) {
          const targetMerchant = merchants.find((m) => m.merchantId === credentials.merchantId);
          if (targetMerchant) {
            merchantId = BigInt(credentials.merchantId);
            merchantIdString = credentials.merchantId;
            currentMerchantPermissions = targetMerchant.permissions;
            currentMerchantRole = targetMerchant.role;
          } else {
            merchantId = adminMerchantUsers[0].merchantId;
            merchantIdString = merchantId.toString();
            currentMerchantPermissions = merchants[0]?.permissions || [];
            currentMerchantRole = merchants[0]?.role;
          }
        } else {
          merchantId = adminMerchantUsers[0].merchantId;
          merchantIdString = merchantId.toString();
          currentMerchantPermissions = merchants[0]?.permissions || [];
          currentMerchantRole = merchants[0]?.role;
        }
      } else {
        // No active merchant context
        if (user.role === 'MERCHANT_OWNER') {
          throw new AuthenticationError(
            'No merchant assigned to your account. Please contact support.',
            ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        if (user.role === 'MERCHANT_STAFF') {
          if (pendingStaffInvite) {
            const isExpired =
              pendingStaffInvite.inviteTokenExpiresAt && pendingStaffInvite.inviteTokenExpiresAt < new Date();
            throw new AuthenticationError(
              isExpired
                ? 'Your staff invitation has expired. Please contact the store owner to resend an invitation.'
                : 'Your staff invitation is pending. Please accept the invitation email before logging in.',
              ERROR_CODES.FORBIDDEN
            );
          }

          // Staff with an inactive merchant link can login (dashboard-only),
          // but staff with no merchant link at all must not be able to login.
          const hasAnyMerchantLink = (user.merchantUsers ?? []).length > 0;
          if (!hasAnyMerchantLink) {
            throw new AuthenticationError(
              'No merchant assigned to your account. Please contact support.',
              ERROR_CODES.MERCHANT_NOT_FOUND
            );
          }
        }
      }
    } else {
      // loginClient === 'driver'
      if (user.role === 'DELIVERY') {
        // Delivery drivers must have at least one active driver link to a merchant
        if (driverMerchantUsers.length === 0) {
          throw new AuthenticationError(
            'Your driver access is inactive or not assigned to any merchant.',
            ERROR_CODES.FORBIDDEN
          );
        }

        merchantId = driverMerchantUsers[0].merchantId;
        merchantIdString = merchantId.toString();
      } else if (user.role === 'MERCHANT_STAFF') {
        // Staff can access driver portal ONLY when explicitly granted.
        if (adminMerchantUsers.length === 0) {
          if (pendingStaffInvite) {
            const isExpired = pendingStaffInvite.inviteTokenExpiresAt && pendingStaffInvite.inviteTokenExpiresAt < new Date();
            throw new AuthenticationError(
              isExpired
                ? 'Your staff invitation has expired. Please contact the store owner to resend an invitation.'
                : 'Your staff invitation is pending. Please accept the invitation email before accessing the driver portal.',
              ERROR_CODES.FORBIDDEN
            );
          }

          throw new AuthenticationError(
            'No merchant assigned to your account. Please contact your store owner.',
            ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        if (adminMerchantUsers.length > 1) {
          throw new AuthenticationError(
            'Your account is linked to multiple merchants. Staff accounts must have exactly one merchant.',
            ERROR_CODES.FORBIDDEN
          );
        }

        const staffLink = adminMerchantUsers[0];
        const hasDriverAccess = (staffLink.permissions ?? []).includes(STAFF_PERMISSIONS.DRIVER_DASHBOARD);
        if (!hasDriverAccess) {
          throw new AuthenticationError(
            'Your account does not have driver access enabled.',
            ERROR_CODES.FORBIDDEN
          );
        }

        effectiveRole = 'DELIVERY';
        merchantId = staffLink.merchantId;
        merchantIdString = merchantId.toString();
      } else {
        throw new AuthenticationError(
          'Driver portal access is not available for this account.',
          ERROR_CODES.FORBIDDEN
        );
      }
    }

    // Step 5: Generate JWT with session ID and merchantId in payload
    // Pass sessionDuration to ensure JWT exp matches session expiresAt
    const accessToken = generateAccessToken({
      userId: user.id,
      sessionId: session.id,
      role: effectiveRole,
      email: user.email,
      merchantId,
    }, sessionDuration); // ✅ Pass dynamic duration

    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    }, refreshDuration); // ✅ Pass dynamic duration

    // Update session with actual access token
    await sessionRepository.update(session.id, {
      token: accessToken,
    });

    // Send notification to merchant owner when staff logs in
    if (user.role === 'MERCHANT_STAFF' && merchantId) {
      import('@/lib/services/UserNotificationService').then(({ default: userNotificationService }) => {
        userNotificationService.notifyStaffLogin(merchantId, user.name, user.email).catch(err => {
          console.error('⚠️ Staff login notification failed:', err);
        });
      }).catch(err => {
        console.error('⚠️ Failed to import notification service:', err);
      });
    }

    // Auto-check and switch subscription on login for merchant users
    if (merchantId && (user.role === 'MERCHANT_OWNER' || user.role === 'MERCHANT_STAFF')) {
      import('@/lib/services/SubscriptionAutoSwitchService').then(({ default: subscriptionAutoSwitchService }) => {
        subscriptionAutoSwitchService.checkAndAutoSwitch(merchantId).then(result => {
          if (result.action !== 'NO_CHANGE') {
            console.log(`📋 Login subscription auto-switch for ${result.merchantCode}:`, {
              action: result.action,
              previousType: result.previousType,
              newType: result.newType,
              reason: result.reason,
              storeOpened: result.storeOpened,
            });
          }
        }).catch(err => {
          console.error('⚠️ Subscription auto-switch on login failed:', err);
        });
      }).catch(err => {
        console.error('⚠️ Failed to import subscription auto-switch service:', err);
      });
    }

    // Calculate expiresIn using dynamic session duration
    const expiresIn = this.getSessionDuration(effectiveRole, credentials.rememberMe);

    return {
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: effectiveRole,
        merchantId: merchantIdString,
        profilePictureUrl: user.profilePictureUrl ?? undefined,
      },
      accessToken,
      refreshToken,
      expiresIn,
      // Multi-merchant support
      merchants: loginClient === 'admin' && merchants.length > 0 ? merchants : undefined,
      needsMerchantSelection,
      permissions: currentMerchantPermissions.length > 0 ? currentMerchantPermissions : undefined,
      merchantRole: currentMerchantRole,
    };
  }

  /**
   * Logout user - Revoke session
   */
  async logout(sessionId: bigint): Promise<void> {
    const session = await sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    // Revoke session
    await sessionRepository.revoke(sessionId);
  }

  /**
   * Logout from all devices - Revoke all user sessions
   */
  async logoutAll(userId: bigint): Promise<void> {
    await sessionRepository.revokeAllByUserId(userId);
  }

  /**
   * Verify access token and get user info
   */
  async verifyToken(token: string): Promise<{
    userId: bigint;
    sessionId: bigint;
    role: string;
    email: string;
    merchantId?: bigint;
  } | null> {
    // Verify JWT signature and expiry
    const payload = verifyAccessToken(token);

    if (!payload) {
      return null;
    }

    // Check if session is still valid in database
    const isValid = await sessionRepository.isValid(payload.sessionId);

    if (!isValid) {
      return null;
    }

    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      role: payload.role,
      email: payload.email,
      merchantId: payload.merchantId,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new AuthenticationError(
        'Invalid refresh token',
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // Check if session is valid
    const session = await sessionRepository.findById(payload.sessionId);

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    if (session.status !== 'ACTIVE') {
      throw new AuthenticationError(
        'Session has been revoked',
        ERROR_CODES.SESSION_REVOKED
      );
    }

    // Check if refresh token is expired
    if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
      await sessionRepository.updateStatus(session.id, 'EXPIRED');
      throw new AuthenticationError(
        'Refresh token has expired',
        ERROR_CODES.TOKEN_EXPIRED
      );
    }

    // Get merchant info if user is merchant owner/staff
    let merchantId: bigint | undefined;
    // Note: merchantUsers may be included by session repository but not in static type
    const userWithMerchant = session.user as unknown as { merchantUsers?: Array<{ merchantId: bigint }> };
    if (userWithMerchant.merchantUsers && userWithMerchant.merchantUsers.length > 0) {
      merchantId = userWithMerchant.merchantUsers[0].merchantId;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: session.userId,
      sessionId: session.id,
      role: session.user.role,
      email: session.user.email,
      merchantId,
    });

    const newRefreshToken = generateRefreshToken({
      userId: session.userId,
      sessionId: session.id,
    });

    // Update session with new access token
    await sessionRepository.update(session.id, {
      token: newAccessToken,
      expiresAt: new Date(Date.now() + parseInt(process.env.JWT_EXPIRY || '3600') * 1000),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: bigint,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Validate new password
    validatePassword(newPassword);

    // Get user
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AuthenticationError(
        'Current password is incorrect',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear mustChangePassword flag
    await userRepository.update(userId, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    });

    // Optionally: Revoke all other sessions (force re-login)
    // await sessionRepository.revokeAllByUserId(userId);
  }

  /**
   * First-time password change (for users with mustChangePassword=true)
   * Used when merchant owner receives temp password
   * Does not require JWT authentication
   * 
   * @param email User email
   * @param tempPassword Temporary password provided by admin
   * @param newPassword New password chosen by user
   * @returns Login response with tokens
   */
  async firstTimePasswordChange(
    email: string,
    tempPassword: string,
    newPassword: string
  ): Promise<LoginResponse> {
    // Validate inputs
    validateEmail(email);
    validatePassword(newPassword);

    // Find user by email
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new AuthenticationError(
        'Invalid email or password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError(
        'Your account has been deactivated',
        ERROR_CODES.USER_INACTIVE
      );
    }

    // Verify temp password
    const isTempPasswordValid = await comparePassword(
      tempPassword,
      user.passwordHash
    );

    if (!isTempPasswordValid) {
      throw new AuthenticationError(
        'Invalid temporary password',
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear mustChangePassword flag
    await userRepository.update(user.id, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    });

    // Create session and login (same as normal login flow)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(process.env.JWT_EXPIRY || '3600'));

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setSeconds(
      refreshExpiresAt.getSeconds() + parseInt(process.env.JWT_REFRESH_EXPIRY || '604800')
    );

    // Generate temporary token for session creation
    const tempToken = `temp_${user.id}_${Date.now()}`;

    const session = await sessionRepository.create({
      user: {
        connect: { id: user.id },
      },
      token: tempToken,
      deviceInfo: 'first-time-password-change',
      ipAddress: null,
      status: 'ACTIVE',
      expiresAt,
      refreshExpiresAt,
    });

    // Generate JWT with session ID in payload
    const accessToken = generateAccessToken({
      userId: user.id,
      sessionId: session.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    // Update session with actual access token
    await sessionRepository.update(session.id, {
      token: accessToken,
    });

    // Update last login timestamp
    await userRepository.updateLastLogin(user.id);

    // Get merchant info if user is merchant owner/staff
    let merchantId: string | undefined;
    if (user.merchantUsers && user.merchantUsers.length > 0) {
      merchantId = user.merchantUsers[0].merchantId.toString();
    }

    return {
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        merchantId,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get user by session ID
   */
  async getUserBySession(sessionId: bigint) {
    const session = await sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    if (session.status !== 'ACTIVE') {
      throw new AuthenticationError(
        'Session is not active',
        ERROR_CODES.SESSION_REVOKED
      );
    }

    return session.user;
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: bigint) {
    return sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: bigint, userId: bigint): Promise<void> {
    const session = await sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError(
        'Session not found',
        ERROR_CODES.SESSION_NOT_FOUND
      );
    }

    // Verify session belongs to user
    if (session.userId !== userId) {
      throw new AuthenticationError(
        'Unauthorized',
        ERROR_CODES.FORBIDDEN
      );
    }

    await sessionRepository.revoke(sessionId);
  }

  /**
   * Request password reset
   * Generates reset token and sends email
   * 
   * @param email User email
   * @returns Reset token (for email)
   */
  async requestPasswordReset(email: string): Promise<{
    resetToken: string;
    expiresAt: Date;
  }> {
    // Validate email
    validateEmail(email);

    // Find user by email
    const user = await userRepository.findByEmail(email.toLowerCase().trim());

    if (!user) {
      // Don't reveal if user exists for security
      throw new NotFoundError(
        'If this email exists, a reset link has been sent',
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError(
        'Account is deactivated',
        ERROR_CODES.USER_INACTIVE
      );
    }

    // Generate reset token (random 32 bytes)
    const { randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = await hashPassword(resetToken); // Hash token for storage

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save reset token to user
    await userRepository.update(user.id, {
      resetToken: resetTokenHash,
      resetTokenExpiresAt: expiresAt,
    });

    return {
      resetToken, // Return plain token for email
      expiresAt,
    };
  }

  /**
   * Reset password with token
   * 
   * @param token Reset token from email
   * @param newPassword New password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    validatePassword(newPassword);

    // Find user by reset token (check all users with non-null resetToken)
    const users = await userRepository.findByResetToken();

    let targetUser = null;
    for (const user of users) {
      if (user.resetToken) {
        const isTokenValid = await comparePassword(token, user.resetToken);
        if (isTokenValid) {
          targetUser = user;
          break;
        }
      }
    }

    if (!targetUser) {
      throw new AuthenticationError(
        'Invalid or expired reset token',
        ERROR_CODES.TOKEN_INVALID
      );
    }

    // Check if token expired
    if (!targetUser.resetTokenExpiresAt || targetUser.resetTokenExpiresAt < new Date()) {
      throw new AuthenticationError(
        'Reset token has expired',
        ERROR_CODES.TOKEN_EXPIRED
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await userRepository.update(targetUser.id, {
      passwordHash: newPasswordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      mustChangePassword: false,
    });

    // Optionally: Revoke all sessions (force re-login)
    await sessionRepository.revokeAllByUserId(targetUser.id);
  }
}

const authService = new AuthService();
export default authService;
