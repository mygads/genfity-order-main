import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = vi.hoisted(() => ({
  default: {
    findByEmail: vi.fn(),
    updateLastLogin: vi.fn(),
    update: vi.fn(),
  },
}));

const sessionRepositoryMock = vi.hoisted(() => ({
  default: {
    create: vi.fn(),
    update: vi.fn(),
    revokeAllByUserId: vi.fn(),
  },
}));

const comparePasswordMock = vi.hoisted(() => vi.fn());

const generateAccessTokenMock = vi.hoisted(() => vi.fn(() => 'access-token'));
const generateRefreshTokenMock = vi.hoisted(() => vi.fn(() => 'refresh-token'));

vi.mock('@/lib/repositories/UserRepository', () => userRepositoryMock);
vi.mock('@/lib/repositories/SessionRepository', () => sessionRepositoryMock);

vi.mock('@/lib/utils/passwordHasher', () => ({
  comparePassword: comparePasswordMock,
  hashPassword: vi.fn(),
}));

vi.mock('@/lib/utils/jwtManager', () => ({
  generateAccessToken: generateAccessTokenMock,
  generateRefreshToken: generateRefreshTokenMock,
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

import authService from '@/lib/services/AuthService';
import { ERROR_CODES } from '@/lib/constants/errors';

describe('AuthService.login merchant binding rules', () => {
  beforeEach(() => {
    userRepositoryMock.default.findByEmail.mockReset();
    userRepositoryMock.default.updateLastLogin.mockReset();
    sessionRepositoryMock.default.create.mockReset();
    sessionRepositoryMock.default.update.mockReset();

    comparePasswordMock.mockReset();
    generateAccessTokenMock.mockClear();
    generateRefreshTokenMock.mockClear();

    sessionRepositoryMock.default.create.mockResolvedValue({ id: BigInt(100) });
    sessionRepositoryMock.default.update.mockResolvedValue(undefined);
    userRepositoryMock.default.updateLastLogin.mockResolvedValue(undefined);
    comparePasswordMock.mockResolvedValue(true);
  });

  it('blocks merchant owner login when no merchant assigned', async () => {
    userRepositoryMock.default.findByEmail.mockResolvedValueOnce({
      id: BigInt(1),
      name: 'Owner',
      email: 'owner@example.com',
      role: 'MERCHANT_OWNER',
      passwordHash: 'hash',
      isActive: true,
      mustChangePassword: false,
      merchantUsers: [],
    });

    await expect(
      authService.login(
        { email: 'owner@example.com', password: 'password123', rememberMe: false, client: 'admin' },
        'ua',
        '127.0.0.1'
      )
    ).rejects.toMatchObject({
      errorCode: ERROR_CODES.MERCHANT_NOT_FOUND,
    });
  });

  it('allows merchant owner login when linked merchant is inactive (dashboard-only flow)', async () => {
    userRepositoryMock.default.findByEmail.mockResolvedValueOnce({
      id: BigInt(2),
      name: 'Owner',
      email: 'owner2@example.com',
      role: 'MERCHANT_OWNER',
      passwordHash: 'hash',
      isActive: true,
      mustChangePassword: false,
      merchantUsers: [
        {
          merchantId: BigInt(200),
          role: 'OWNER',
          permissions: [],
          isActive: true,
          merchant: {
            id: BigInt(200),
            code: 'INACTIVE',
            name: 'Inactive Merchant',
            logoUrl: null,
            address: null,
            city: null,
            isOpen: true,
            isActive: false,
          },
        },
      ],
    });

    const res = await authService.login(
      { email: 'owner2@example.com', password: 'password123', rememberMe: false, client: 'admin' },
      'ua',
      '127.0.0.1'
    );

    expect(res.accessToken).toBe('access-token');
    expect(res.refreshToken).toBe('refresh-token');
    expect(res.user.merchantId).toBe('200');
    expect(res.merchants?.[0]?.merchantCode).toBe('INACTIVE');
    expect(res.needsMerchantSelection).toBe(false);

    expect(generateAccessTokenMock).toHaveBeenCalled();
    expect(generateRefreshTokenMock).toHaveBeenCalled();
  });
});
