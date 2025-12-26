/**
 * Referral Service
 * Business logic for referral code management
 */

import referralRepository, { CreateReferralCodeInput, UpdateReferralCodeInput } from '@/lib/repositories/ReferralRepository';
import { NotFoundError, ValidationError, ConflictError, ERROR_CODES } from '@/lib/constants/errors';

// Define types locally until prisma generate is run
type ReferralUsageType = 'REGISTRATION' | 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIBE';

interface ValidateCodeResult {
    valid: boolean;
    error?: string;
    code?: {
        id: bigint;
        code: string;
        discountType: string;
        discountValue: number | null;
    };
}

class ReferralService {
    /**
     * Create a new referral code
     */
    async createCode(input: Omit<CreateReferralCodeInput, 'createdByUserId'>, createdByUserId: bigint) {
        // Check if code already exists
        const existingCode = await referralRepository.getCodeByCode(input.code);
        if (existingCode) {
            throw new ConflictError(
                'A referral code with this name already exists',
                ERROR_CODES.CONFLICT
            );
        }

        // Validate code format (alphanumeric with optional dashes)
        if (!/^[A-Z0-9-]+$/i.test(input.code)) {
            throw new ValidationError(
                'Referral code can only contain letters, numbers, and dashes',
                ERROR_CODES.VALIDATION_FAILED
            );
        }

        if (input.code.length < 3 || input.code.length > 20) {
            throw new ValidationError(
                'Referral code must be between 3 and 20 characters',
                ERROR_CODES.VALIDATION_FAILED
            );
        }

        // Validate discount value based on type
        if (input.discountType === 'PERCENTAGE' && input.discountValue) {
            if (input.discountValue < 0 || input.discountValue > 100) {
                throw new ValidationError(
                    'Percentage discount must be between 0 and 100',
                    ERROR_CODES.VALIDATION_FAILED
                );
            }
        }

        return referralRepository.createCode({
            ...input,
            createdByUserId,
        });
    }

    /**
     * Update a referral code
     */
    async updateCode(id: bigint, input: UpdateReferralCodeInput) {
        const code = await referralRepository.getCodeById(id);
        if (!code) {
            throw new NotFoundError('Referral code not found', ERROR_CODES.NOT_FOUND);
        }

        // Validate discount value based on type
        if (input.discountType === 'PERCENTAGE' && input.discountValue !== undefined) {
            if (input.discountValue < 0 || input.discountValue > 100) {
                throw new ValidationError(
                    'Percentage discount must be between 0 and 100',
                    ERROR_CODES.VALIDATION_FAILED
                );
            }
        }

        return referralRepository.updateCode(id, input);
    }

    /**
     * Deactivate a referral code
     */
    async deactivateCode(id: bigint) {
        const code = await referralRepository.getCodeById(id);
        if (!code) {
            throw new NotFoundError('Referral code not found', ERROR_CODES.NOT_FOUND);
        }

        return referralRepository.deactivateCode(id);
    }

    /**
     * Validate a referral code for usage
     */
    async validateCode(codeString: string): Promise<ValidateCodeResult> {
        if (!codeString || codeString.trim() === '') {
            return { valid: false, error: 'Referral code is required' };
        }

        const code = await referralRepository.getCodeByCode(codeString);

        if (!code) {
            return { valid: false, error: 'Referral code not found' };
        }

        if (!code.isActive) {
            return { valid: false, error: 'Referral code is no longer active' };
        }

        // Check if max usage exceeded
        if (code.maxUsage !== null && code.currentUsage >= code.maxUsage) {
            return { valid: false, error: 'Referral code has reached its maximum usage limit' };
        }

        // Check validity period
        const now = new Date();
        if (code.validFrom && now < code.validFrom) {
            return { valid: false, error: 'Referral code is not yet valid' };
        }
        if (code.validUntil && now > code.validUntil) {
            return { valid: false, error: 'Referral code has expired' };
        }

        return {
            valid: true,
            code: {
                id: code.id,
                code: code.code,
                discountType: code.discountType,
                discountValue: code.discountValue ? Number(code.discountValue) : null,
            },
        };
    }

    /**
     * Apply referral code and record usage
     */
    async applyCode(
        codeString: string,
        merchantId: bigint,
        usageType: ReferralUsageType,
        paymentRequestId?: bigint
    ) {
        // Validate the code
        const validation = await this.validateCode(codeString);
        if (!validation.valid || !validation.code) {
            throw new ValidationError(
                validation.error || 'Invalid referral code',
                ERROR_CODES.VALIDATION_FAILED
            );
        }

        // Check if already used for this type (for registration, can only use once)
        if (usageType === 'REGISTRATION') {
            const alreadyUsed = await referralRepository.hasUsedCode(
                merchantId,
                validation.code.id,
                usageType
            );
            if (alreadyUsed) {
                throw new ValidationError(
                    'You have already used this referral code for registration',
                    ERROR_CODES.VALIDATION_FAILED
                );
            }
        }

        // Calculate discount if applicable
        let discountApplied: number | undefined;
        if (validation.code.discountType !== 'NONE' && validation.code.discountValue) {
            discountApplied = validation.code.discountValue;
        }

        // Record the usage
        await referralRepository.recordUsage(
            validation.code.id,
            merchantId,
            usageType,
            paymentRequestId,
            discountApplied
        );

        return {
            applied: true,
            discountType: validation.code.discountType,
            discountValue: validation.code.discountValue,
        };
    }

    /**
     * Get referral code with statistics
     */
    async getCodeWithStats(id: bigint) {
        const code = await referralRepository.getCodeById(id);
        if (!code) {
            throw new NotFoundError('Referral code not found', ERROR_CODES.NOT_FOUND);
        }

        const stats = await referralRepository.getCodeStats(id);

        return {
            ...code,
            stats,
        };
    }

    /**
     * Get all referral codes
     */
    async getAllCodes(options: { limit?: number; offset?: number; includeInactive?: boolean } = {}) {
        return referralRepository.getAllCodes(options);
    }

    /**
     * Get usage history for a code
     */
    async getCodeUsageHistory(codeId: bigint, options: { limit?: number; offset?: number } = {}) {
        const code = await referralRepository.getCodeById(codeId);
        if (!code) {
            throw new NotFoundError('Referral code not found', ERROR_CODES.NOT_FOUND);
        }

        return referralRepository.getCodeUsage(codeId, options);
    }

    /**
     * Get merchants who used a specific referral code
     */
    async getMerchantsUsingCode(codeId: bigint, options: { limit?: number; offset?: number } = {}) {
        const code = await referralRepository.getCodeById(codeId);
        if (!code) {
            throw new NotFoundError('Referral code not found', ERROR_CODES.NOT_FOUND);
        }

        return referralRepository.getMerchantsUsingCode(codeId, options);
    }
}

const referralService = new ReferralService();
export default referralService;
