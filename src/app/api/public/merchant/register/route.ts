/**
 * Public Merchant Registration API
 * POST /api/public/merchant/register - Register new merchant with trial
 * 
 * No authentication required - this is a public endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import merchantService from '@/lib/services/MerchantService';
import emailService from '@/lib/services/EmailService';
import referralService from '@/lib/services/ReferralService';
import prisma from '@/lib/db/client';

const registerSchema = z.object({
    // Merchant info
    merchantName: z.string().min(2, 'Nama merchant minimal 2 karakter').max(100),
    merchantCode: z.string()
        .min(3, 'Kode merchant minimal 3 karakter')
        .max(20, 'Kode merchant maksimal 20 karakter')
        .regex(/^[a-zA-Z0-9-]+$/, 'Kode hanya boleh huruf, angka, dan strip'),
    address: z.string().min(5, 'Alamat minimal 5 karakter').optional(),
    phone: z.string().optional(),
    currency: z.enum(['IDR', 'AUD', 'USD', 'SGD', 'MYR']).default('IDR'),
    country: z.string().default('Indonesia'),
    
    // Location fields (optional - from GPS detection)
    timezone: z.string().default('Asia/Jakarta'),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),

    // Owner info
    ownerName: z.string().min(2, 'Nama pemilik minimal 2 karakter'),
    ownerEmail: z.string().email('Format email tidak valid'),
    ownerPhone: z.string().optional(),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    confirmPassword: z.string(),

    // Referral code (optional)
    referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = registerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: validation.error.issues[0].message,
                    errors: validation.error.issues,
                },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Validate referral code if provided
        let validatedReferralCode: { id: bigint; code: string; discountType: string; discountValue: number | null } | null = null;
        if (data.referralCode && data.referralCode.trim() !== '') {
            const referralValidation = await referralService.validateCode(data.referralCode);
            if (!referralValidation.valid) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'INVALID_REFERRAL_CODE',
                        message: referralValidation.error || 'Kode referral tidak valid',
                    },
                    { status: 400 }
                );
            }
            validatedReferralCode = referralValidation.code || null;
        }

        // Create merchant with owner (this also creates trial subscription)
        const result = await merchantService.createMerchant({
            name: data.merchantName,
            code: data.merchantCode.toLowerCase(),
            email: data.ownerEmail,
            phoneNumber: data.phone,
            address: data.address,
            currency: data.currency,
            country: data.country,
            timezone: data.timezone,
            latitude: data.latitude ?? undefined,
            longitude: data.longitude ?? undefined,
            ownerName: data.ownerName,
            ownerEmail: data.ownerEmail,
            ownerPhone: data.ownerPhone,
            ownerPassword: data.password,
        });

        // If referral code was used, record it
        if (validatedReferralCode) {
            try {
                // Update merchant with referral code used
                await prisma.merchant.update({
                    where: { id: result.merchant.id },
                    data: { referralCodeUsed: validatedReferralCode.code },
                });

                // Record the referral usage
                await referralService.applyCode(
                    validatedReferralCode.code,
                    result.merchant.id,
                    'REGISTRATION'
                );
            } catch (referralError) {
                console.error('Failed to record referral usage:', referralError);
                // Don't fail registration if referral tracking fails
            }
        }

        // Send welcome email with login credentials
        try {
            await emailService.sendEmail({
                to: data.ownerEmail,
                subject: 'Selamat Datang di Genfity! 🎉',
                html: getWelcomeEmailHtml(
                    data.ownerName,
                    data.merchantName,
                    data.merchantCode.toLowerCase(),
                    data.ownerEmail
                ),
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Registrasi berhasil! Silakan login untuk melanjutkan.',
            data: {
                merchantId: result.merchant.id.toString(),
                merchantCode: result.merchant.code,
                merchantName: result.merchant.name,
                ownerEmail: result.owner.email,
                trialDays: 30,
                referralCodeUsed: validatedReferralCode?.code || null,
            },
        });
    } catch (error) {
        console.error('Merchant registration error:', error);

        if (error instanceof Error) {
            // Handle specific errors
            if (error.message.includes('already exists') || error.message.includes('sudah ada')) {
                return NextResponse.json(
                    { success: false, error: 'DUPLICATE', message: error.message },
                    { status: 409 }
                );
            }
            if (error.message.includes('email')) {
                return NextResponse.json(
                    { success: false, error: 'EMAIL_EXISTS', message: 'Email sudah terdaftar' },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'REGISTRATION_FAILED', message: 'Registrasi gagal. Silakan coba lagi.' },
            { status: 500 }
        );
    }
}

function getWelcomeEmailHtml(
    ownerName: string,
    merchantName: string,
    merchantCode: string,
    email: string
): string {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`;
    const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order/${merchantCode}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Selamat Datang!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Akun merchant Anda berhasil dibuat</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Halo <strong>${ownerName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Selamat! Merchant <strong>${merchantName}</strong> Anda sudah siap digunakan dengan <strong>30 hari trial gratis</strong>.
            </p>

            <div style="background-color: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                    <strong>⏰ Masa Trial:</strong> 30 hari gratis tanpa biaya apapun!
                </p>
            </div>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #374151; margin: 0 0 15px; font-size: 16px;">📋 Informasi Akun</h3>
                <table style="width: 100%; color: #374151; font-size: 14px;">
                    <tr>
                        <td style="padding: 5px 0; width: 120px;"><strong>Kode Merchant:</strong></td>
                        <td style="padding: 5px 0;">${merchantCode}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Email Login:</strong></td>
                        <td style="padding: 5px 0;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Link Order:</strong></td>
                        <td style="padding: 5px 0;"><a href="${orderUrl}" style="color: #f97316;">${orderUrl}</a></td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" 
                   style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                    Login Sekarang
                </a>
            </div>

            <h3 style="color: #374151; font-size: 16px; margin-top: 30px;">🚀 Langkah Selanjutnya:</h3>
            <ol style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Login ke dashboard</li>
                <li>Tambahkan menu dan kategori</li>
                <li>Atur jam buka toko</li>
                <li>Bagikan link order ke pelanggan</li>
            </ol>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                Jika ada pertanyaan, silakan hubungi tim support kami.
            </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;
}
