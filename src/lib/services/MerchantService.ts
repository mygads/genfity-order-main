/**
 * Merchant Service
 * Business logic for merchant management
 */

import merchantRepository from '@/lib/repositories/MerchantRepository';
import userRepository from '@/lib/repositories/UserRepository';
import { hashPassword } from '@/lib/utils/passwordHasher';
import { validateEmail, validateRequired, validateMerchantCode } from '@/lib/utils/validators';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ERROR_CODES,
} from '@/lib/constants/errors';
import type { Merchant, MerchantOpeningHour, User } from '@/lib/types';

/**
 * Merchant creation input
 */
export interface CreateMerchantInput {
  // Merchant info
  name: string;
  code: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;

  // Store status
  isOpen?: boolean;

  // Location settings
  country?: string;
  currency?: string;
  timezone?: string;
  latitude?: number | null;
  longitude?: number | null;

  // Tax settings
  taxRate?: number;
  taxIncluded?: boolean;

  // Owner info
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerPassword: string; // Password set by admin
}

/**
 * Merchant update input
 */
export interface UpdateMerchantInput {
  code?: string; // Super admin can update merchant code
  name?: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  // Sale mode settings
  isDineInEnabled?: boolean;
  isTakeawayEnabled?: boolean;
  requireTableNumberForDineIn?: boolean;
  dineInLabel?: string | null;
  takeawayLabel?: string | null;
  deliveryLabel?: string | null;
  dineInScheduleStart?: string | null;
  dineInScheduleEnd?: string | null;
  takeawayScheduleStart?: string | null;
  takeawayScheduleEnd?: string | null;
  deliveryScheduleStart?: string | null;
  deliveryScheduleEnd?: string | null;
  totalTables?: number | null;
  // Reservation settings
  isReservationEnabled?: boolean;
  reservationMenuRequired?: boolean;
  reservationMinItemCount?: number;
  // Scheduled Orders
  isScheduledOrderEnabled?: boolean;
  // Tax settings
  enableTax?: boolean;
  taxRate?: number;
  taxIncluded?: boolean;
  // Service charge settings
  enableServiceCharge?: boolean;
  serviceChargePercent?: number;
  // Packaging fee settings
  enablePackagingFee?: boolean;
  packagingFeeAmount?: number;
  // Other settings
  isActive?: boolean;
  isOpen?: boolean;
  country?: string;
  currency?: string;
  timezone?: string;
  latitude?: number | null;
  longitude?: number | null;
  // Delivery settings
  isDeliveryEnabled?: boolean;
  enforceDeliveryZones?: boolean;
  deliveryMaxDistanceKm?: number | null;
  deliveryFeeBase?: number | null;
  deliveryFeePerKm?: number | null;
  deliveryFeeMin?: number | null;
  deliveryFeeMax?: number | null;
  // Receipt settings
  receiptSettings?: Record<string, unknown>;
}

/**
 * Opening hours input
 */
export interface OpeningHoursInput {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime: string;  // Format: "HH:MM"
  closeTime: string; // Format: "HH:MM"
  isClosed: boolean;
}

/**
 * Merchant with relations
 */
export interface MerchantWithDetails extends Merchant {
  openingHours?: MerchantOpeningHour[];
  merchantUsers?: Array<{
    user: User;
    role: string;
  }>;
}

/**
 * Merchant Service Class
 */
class MerchantService {
  /**
   * Create new merchant with owner account
   * 
   * Process:
   * 1. Validate inputs
   * 2. Check merchant code uniqueness
   * 3. Check owner email uniqueness
   * 4. Generate temporary password for owner
   * 5. Create merchant with owner user in transaction
   * 6. Send password notification email
   * 
   * @param input Merchant creation data
   * @returns Created merchant with owner info
   */
  async createMerchant(input: CreateMerchantInput): Promise<{
    merchant: Merchant;
    owner: User;
  }> {
    // Validate required fields
    validateRequired(input.name, 'Merchant name');
    validateRequired(input.code, 'Merchant code');
    validateRequired(input.ownerName, 'Owner name');
    validateRequired(input.ownerEmail, 'Owner email');
    validateRequired(input.ownerPassword, 'Owner password');

    // Validate merchant code format
    validateMerchantCode(input.code);

    // Validate owner email format
    validateEmail(input.ownerEmail);

    // Validate tax rate (0-100%)
    if (input.taxRate !== undefined) {
      if (input.taxRate < 0 || input.taxRate > 100) {
        throw new ValidationError(
          'Tax rate must be between 0 and 100',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    // Check merchant code uniqueness and auto-regenerate if collision
    let merchantCode = input.code;
    let codeExists = await merchantRepository.codeExists(merchantCode);
    let attempts = 0;
    const maxAttempts = 10;
    
    while (codeExists && attempts < maxAttempts) {
      // Generate a new unique code by adding random characters
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      merchantCode = '';
      for (let i = 0; i < 4; i++) {
        merchantCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codeExists = await merchantRepository.codeExists(merchantCode);
      attempts++;
    }
    
    if (codeExists) {
      throw new ConflictError(
        'Unable to generate unique merchant code. Please try again.',
        ERROR_CODES.MERCHANT_CODE_EXISTS
      );
    }

    // Check owner email uniqueness
    const emailExists = await userRepository.emailExists(input.ownerEmail);
    if (emailExists) {
      throw new ConflictError(
        'Email already registered',
        ERROR_CODES.EMAIL_ALREADY_EXISTS
      );
    }

    // Hash password provided by admin
    const hashedPassword = await hashPassword(input.ownerPassword);

    // Create owner user first
    const owner = await userRepository.create({
      name: input.ownerName,
      email: input.ownerEmail,
      phone: input.ownerPhone,
      passwordHash: hashedPassword,
      role: 'MERCHANT_OWNER',
      isActive: true,
      mustChangePassword: false, // No need to change password
    });

    // Create merchant with owner link
    const merchant = await merchantRepository.createWithUser(
      {
        name: input.name,
        code: merchantCode, // Use the validated/regenerated code
        description: input.description,
        address: input.address,
        phone: input.phoneNumber, // Map phoneNumber to phone (Prisma field)
        email: input.email || input.ownerEmail, // Use merchant email or owner email as fallback
        isOpen: input.isOpen ?? true, // Default to open
        country: input.country || 'Australia',
        currency: input.currency || 'AUD',
        timezone: input.timezone || 'Australia/Sydney',
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        enableTax: (input.taxRate !== undefined && input.taxRate > 0), // Map to enableTax
        taxPercentage: input.taxRate !== undefined ? input.taxRate : null, // Map to taxPercentage
        // Feature defaults for NEW merchants:
        // - Dine-in enabled
        // - All other sales modes OFF until manually enabled
        // - Reservations OFF until manually enabled
        isDineInEnabled: true,
        isTakeawayEnabled: false,
        isDeliveryEnabled: false,
        isReservationEnabled: false,
        isScheduledOrderEnabled: false,
        reservationMenuRequired: false,
        reservationMinItemCount: 0,
        isActive: true,
      },
      owner.id, // Pass userId
      'OWNER'
    );

    // Auto-create trial subscription (30 days)
    try {
      const { default: subscriptionRepository } = await import('@/lib/repositories/SubscriptionRepository');
      const { default: balanceRepository } = await import('@/lib/repositories/BalanceRepository');
      const { default: subscriptionService } = await import('@/lib/services/SubscriptionService');
      const { default: userNotificationService } = await import('@/lib/services/UserNotificationService');
      const { default: merchantTemplateService } = await import('@/lib/services/MerchantTemplateService');

      // Get trial days from plan pricing
      const pricing = await subscriptionService.getPlanPricing(input.currency || 'AUD');
      const trialDays = pricing.trialDays || 30;

      // Create trial subscription with merchantId and trialDays
      await subscriptionRepository.createMerchantSubscription(merchant.id, trialDays);

      // Create initial balance (0) with merchantId only
      await balanceRepository.getOrCreateBalance(merchant.id);

      console.log(`✅ Created ${trialDays}-day trial subscription for merchant ${merchant.code}`);

      // Create template data (sample category, menu, addon, opening hours)
      try {
        const templateResult = await merchantTemplateService.createTemplateData(
          merchant.id,
          owner.id,
          input.currency || 'AUD'
        );
        console.log(`✅ Created template data for merchant ${merchant.code}:`, {
          category: templateResult.category.name,
          menu: templateResult.menu.name,
          addonCategory: templateResult.addonCategory.name,
          openingHours: `${templateResult.openingHoursCount} days`,
        });
      } catch (templateError) {
        console.warn('⚠️ Failed to create template data:', templateError);
        // Don't fail registration if template creation fails
      }

      // Notify super admins about new merchant registration
      userNotificationService.notifyNewMerchantRegistration(
        merchant.name,
        merchant.code,
        merchant.id
      ).catch(err => {
        console.error('⚠️ New merchant notification failed:', err);
      });
    } catch (subscriptionError) {
      // Log but don't fail merchant creation if subscription creation fails
      console.warn('Failed to create trial subscription:', subscriptionError);
    }

    return {
      merchant,
      owner,
    };
  }

  /**
   * Update merchant information
   * 
   * @param merchantId Merchant ID
   * @param input Update data
   * @returns Updated merchant
   */
  async updateMerchant(
    merchantId: bigint,
    input: UpdateMerchantInput
  ): Promise<Merchant> {
    // Validate merchant exists
    const existing = await merchantRepository.findById(merchantId);
    if (!existing) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Validate and check merchant code uniqueness if changing
    if (input.code !== undefined && input.code !== existing.code) {
      // Validate merchant code format
      validateMerchantCode(input.code);

      // Check if the new code is already in use by another merchant
      const codeExists = await merchantRepository.codeExists(input.code);
      if (codeExists) {
        throw new ConflictError(
          `Merchant code '${input.code}' is already in use by another merchant`,
          ERROR_CODES.MERCHANT_CODE_EXISTS
        );
      }
    }

    // Validate tax rate if provided
    if (input.taxRate !== undefined) {
      if (input.taxRate < 0 || input.taxRate > 100) {
        throw new ValidationError(
          'Tax rate must be between 0 and 100',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    // Validate email if provided
    if (input.email) {
      validateEmail(input.email);
    }

    // Delivery requires merchant coordinates (existing or incoming).
    // Also prevents clearing coordinates while delivery is enabled.
    const willEnableDelivery = input.isDeliveryEnabled !== undefined ? input.isDeliveryEnabled : existing.isDeliveryEnabled;

    // Reservation rule consistency:
    // If menu is not required for reservations, reservationMinItemCount is ignored and forced to 0.
    const nextReservationMenuRequired = input.reservationMenuRequired !== undefined
      ? input.reservationMenuRequired
      : (existing as unknown as { reservationMenuRequired?: boolean }).reservationMenuRequired;

    if (willEnableDelivery === true) {
      const existingLatitude = existing.latitude === null ? null : Number(existing.latitude.toString());
      const existingLongitude = existing.longitude === null ? null : Number(existing.longitude.toString());
      const nextLatitude = input.latitude !== undefined ? (input.latitude as number | null) : existingLatitude;
      const nextLongitude = input.longitude !== undefined ? (input.longitude as number | null) : existingLongitude;

      if (nextLatitude === null || nextLongitude === null || !Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) {
        throw new ValidationError(
          'Delivery can only be enabled after setting merchant location coordinates',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    // Map input fields to Prisma schema fields
    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code; // Super admin can update merchant code
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.phoneNumber !== undefined) updateData.phone = input.phoneNumber; // Map to phone
    if (input.email !== undefined) updateData.email = input.email;
    // Sale mode settings
    if (input.isDineInEnabled !== undefined) updateData.isDineInEnabled = input.isDineInEnabled;
    if (input.isTakeawayEnabled !== undefined) updateData.isTakeawayEnabled = input.isTakeawayEnabled;
    if (input.requireTableNumberForDineIn !== undefined) updateData.requireTableNumberForDineIn = input.requireTableNumberForDineIn;
    if (input.dineInLabel !== undefined) updateData.dineInLabel = input.dineInLabel;
    if (input.takeawayLabel !== undefined) updateData.takeawayLabel = input.takeawayLabel;
    if (input.deliveryLabel !== undefined) updateData.deliveryLabel = input.deliveryLabel;
    if (input.dineInScheduleStart !== undefined) updateData.dineInScheduleStart = input.dineInScheduleStart;
    if (input.dineInScheduleEnd !== undefined) updateData.dineInScheduleEnd = input.dineInScheduleEnd;
    if (input.takeawayScheduleStart !== undefined) updateData.takeawayScheduleStart = input.takeawayScheduleStart;
    if (input.takeawayScheduleEnd !== undefined) updateData.takeawayScheduleEnd = input.takeawayScheduleEnd;
    if (input.deliveryScheduleStart !== undefined) updateData.deliveryScheduleStart = input.deliveryScheduleStart;
    if (input.deliveryScheduleEnd !== undefined) updateData.deliveryScheduleEnd = input.deliveryScheduleEnd;
    if (input.totalTables !== undefined) updateData.totalTables = input.totalTables;
    // Reservation settings
    if (input.isReservationEnabled !== undefined) updateData.isReservationEnabled = input.isReservationEnabled;
    if (input.reservationMenuRequired !== undefined) updateData.reservationMenuRequired = input.reservationMenuRequired;
    if (nextReservationMenuRequired === false) {
      // Force to 0 for consistency (ignore any incoming non-zero values)
      updateData.reservationMinItemCount = 0;
    } else if (input.reservationMinItemCount !== undefined) {
      updateData.reservationMinItemCount = Math.max(0, Number(input.reservationMinItemCount) || 0);
    }

    // Scheduled orders
    if (input.isScheduledOrderEnabled !== undefined) updateData.isScheduledOrderEnabled = input.isScheduledOrderEnabled;
    // Tax settings
    if (input.enableTax !== undefined) updateData.enableTax = input.enableTax;
    if (input.taxRate !== undefined) {
      updateData.enableTax = input.taxRate > 0;
      updateData.taxPercentage = input.taxRate;
    }
    // Service charge settings
    if (input.enableServiceCharge !== undefined) updateData.enableServiceCharge = input.enableServiceCharge;
    if (input.serviceChargePercent !== undefined) updateData.serviceChargePercent = input.serviceChargePercent;
    // Packaging fee settings
    if (input.enablePackagingFee !== undefined) updateData.enablePackagingFee = input.enablePackagingFee;
    if (input.packagingFeeAmount !== undefined) updateData.packagingFeeAmount = input.packagingFeeAmount;
    // Other settings
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.isOpen !== undefined) updateData.isOpen = input.isOpen;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    // Delivery settings
    if (input.isDeliveryEnabled !== undefined) updateData.isDeliveryEnabled = input.isDeliveryEnabled;
    if (input.enforceDeliveryZones !== undefined) updateData.enforceDeliveryZones = input.enforceDeliveryZones;
    if (input.deliveryMaxDistanceKm !== undefined) updateData.deliveryMaxDistanceKm = input.deliveryMaxDistanceKm;
    if (input.deliveryFeeBase !== undefined) updateData.deliveryFeeBase = input.deliveryFeeBase;
    if (input.deliveryFeePerKm !== undefined) updateData.deliveryFeePerKm = input.deliveryFeePerKm;
    if (input.deliveryFeeMin !== undefined) updateData.deliveryFeeMin = input.deliveryFeeMin;
    if (input.deliveryFeeMax !== undefined) updateData.deliveryFeeMax = input.deliveryFeeMax;
    // Receipt settings
    if (input.receiptSettings !== undefined) updateData.receiptSettings = input.receiptSettings;

    // Update merchant
    return await merchantRepository.update(merchantId, updateData);
  }

  /**
   * Get merchant by code (for public access)
   * 
   * @param code Merchant code
   * @returns Merchant with opening hours
   */
  async getMerchantByCode(code: string): Promise<MerchantWithDetails | null> {
    return await merchantRepository.findByCode(code);
  }

  /**
   * Get merchant by ID
   * 
   * @param merchantId Merchant ID
   * @returns Merchant with details
   */
  async getMerchantById(merchantId: bigint) {
    return await merchantRepository.findById(merchantId);
  }

  /**
   * Get all merchants (for admin)
   * 
   * @param activeOnly Filter active merchants only
   * @returns List of merchants
   */
  async getAllMerchants(activeOnly: boolean = false): Promise<Merchant[]> {
    return await merchantRepository.findAll(activeOnly);
  }

  /**
   * Toggle merchant active status
   * 
   * @param merchantId Merchant ID
   * @returns Updated merchant
   */
  async toggleMerchantStatus(merchantId: bigint): Promise<Merchant> {
    // Validate merchant exists
    const existing = await merchantRepository.findById(merchantId);
    if (!existing) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Toggle active status
    return await merchantRepository.toggleActive(merchantId, !existing.isActive);
  }

  /**
   * Update merchant opening hours
   * 
   * @param merchantId Merchant ID
   * @param hoursInput Array of opening hours
   * @returns Updated opening hours
   */
  async updateOpeningHours(
    merchantId: bigint,
    hoursInput: OpeningHoursInput[]
  ): Promise<MerchantOpeningHour[]> {
    // Validate merchant exists
    const existing = await merchantRepository.findById(merchantId);
    if (!existing) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Validate hours format
    for (const hours of hoursInput) {
      // Validate day of week (0-6)
      if (hours.dayOfWeek < 0 || hours.dayOfWeek > 6) {
        throw new ValidationError(
          'Day of week must be between 0 (Sunday) and 6 (Saturday)',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!hours.isClosed) {
        if (!timeRegex.test(hours.openTime)) {
          throw new ValidationError(
            'Invalid open time format. Use HH:MM (e.g., 09:00)',
            ERROR_CODES.VALIDATION_FAILED
          );
        }
        if (!timeRegex.test(hours.closeTime)) {
          throw new ValidationError(
            'Invalid close time format. Use HH:MM (e.g., 17:00)',
            ERROR_CODES.VALIDATION_FAILED
          );
        }

        // Validate close time is after open time
        if (hours.closeTime <= hours.openTime) {
          throw new ValidationError(
            'Close time must be after open time',
            ERROR_CODES.VALIDATION_FAILED
          );
        }
      }
    }

    // Update opening hours (upsert)
    const updatedHours: MerchantOpeningHour[] = [];
    for (const hours of hoursInput) {
      const updated = await merchantRepository.upsertOpeningHours(
        merchantId,
        hours.dayOfWeek,
        {
          openTime: hours.isClosed ? null : hours.openTime,
          closeTime: hours.isClosed ? null : hours.closeTime,
          isClosed: hours.isClosed,
        }
      );
      updatedHours.push(updated);
    }

    return updatedHours;
  }

  /**
   * Delete merchant (soft delete)
   * 
   * @param merchantId Merchant ID
   */
  async deleteMerchant(merchantId: bigint): Promise<void> {
    // Validate merchant exists
    const existing = await merchantRepository.findById(merchantId);
    if (!existing) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    await merchantRepository.delete(merchantId);
  }

  /**
   * Check if merchant is currently open
   * 
   * @param merchantId Merchant ID
   * @param currentTime Optional current time (for testing)
   * @returns True if merchant is open
   */
  async isMerchantOpen(
    merchantId: bigint,
    currentTime?: Date
  ): Promise<boolean> {
    const merchant = await merchantRepository.findById(merchantId);
    if (!merchant || !merchant.isActive) {
      return false;
    }

    if (!merchant.openingHours || merchant.openingHours.length === 0) {
      // No opening hours defined = always open
      return true;
    }

    const now = currentTime || new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find opening hours for current day
    const todayHours = merchant.openingHours.find(
      (h: MerchantOpeningHour) => h.dayOfWeek === dayOfWeek
    );

    if (!todayHours) {
      // No hours defined for today = closed
      return false;
    }

    if (todayHours.isClosed) {
      return false;
    }

    // Check if current time is within opening hours
    return (
      todayHours.openTime !== null &&
      todayHours.closeTime !== null &&
      currentTimeStr >= todayHours.openTime &&
      currentTimeStr <= todayHours.closeTime
    );
  }

  /**
   * Add staff to merchant
   * 
   * @param merchantId Merchant ID
   * @param userId User ID
   * @param role Role (OWNER or STAFF)
   * @returns Updated merchant user link
   */
  async addStaff(merchantId: bigint, userId: bigint, role: 'OWNER' | 'STAFF' = 'STAFF'): Promise<void> {
    // If adding OWNER, check merchant doesn't already have one
    if (role === 'OWNER') {
      const merchant = await merchantRepository.findById(merchantId);
      const existingOwner = merchant?.merchantUsers?.find(
        (mu: { role: string }) => mu.role === 'OWNER'
      );

      if (existingOwner) {
        throw new ConflictError(
          '1 merchant hanya bisa memiliki 1 owner',
          ERROR_CODES.MERCHANT_ALREADY_HAS_OWNER
        );
      }
    }

    await merchantRepository.addUser(merchantId, userId, role);
  }

  /**
   * Add delivery driver to merchant
   *
   * @param merchantId Merchant ID
   * @param userId User ID
   */
  async addDriver(merchantId: bigint, userId: bigint): Promise<void> {
    await merchantRepository.addUser(merchantId, userId, 'DRIVER');
  }

  /**
   * Remove staff from merchant
   * 
   * @param merchantId Merchant ID
   * @param userId User ID
   */
  async removeStaff(merchantId: bigint, userId: bigint): Promise<void> {
    await merchantRepository.removeUser(merchantId, userId);
  }
}

// Export singleton instance
const merchantService = new MerchantService();
export default merchantService;
