/**
 * Setup Progress API
 * GET /api/merchant/setup-progress - Check merchant setup completion status
 * 
 * Returns status of each setup step considering template data
 */

import { NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import merchantTemplateService from '@/lib/services/MerchantTemplateService';
import { serializeBigInt } from '@/lib/utils/serializer';

export const GET = withMerchant(async (req, authContext) => {
  try {
    const merchantId = authContext.merchantId;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'No merchant associated with this user' },
        { status: 400 }
      );
    }

    // Check each step using template-aware logic
    const [storeComplete, categoriesComplete, menuComplete, addonsComplete, hoursComplete] =
      await Promise.all([
        merchantTemplateService.isStepCompleted(merchantId, 'store'),
        merchantTemplateService.isStepCompleted(merchantId, 'categories'),
        merchantTemplateService.isStepCompleted(merchantId, 'menu'),
        merchantTemplateService.isStepCompleted(merchantId, 'addons'),
        merchantTemplateService.isStepCompleted(merchantId, 'hours'),
      ]);

    const steps = {
      merchant_info: storeComplete,
      categories: categoriesComplete,
      menu_items: menuComplete,
      addons: addonsComplete,
      opening_hours: hoursComplete,
    };

    // Calculate overall progress
    const requiredSteps = ['merchant_info', 'categories', 'menu_items', 'opening_hours'];
    const completedRequired = requiredSteps.filter(
      (step) => steps[step as keyof typeof steps]
    ).length;
    const totalRequired = requiredSteps.length;
    const progressPercent = Math.round((completedRequired / totalRequired) * 100);

    return NextResponse.json(
      serializeBigInt({
        success: true,
        data: {
          steps,
          completedRequired,
          totalRequired,
          progressPercent,
          isComplete: progressPercent === 100,
          templateMarkers: merchantTemplateService.getTemplateMarkers(),
        },
      })
    );
  } catch (error) {
    console.error('Setup progress error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check setup progress' },
      { status: 500 }
    );
  }
});
