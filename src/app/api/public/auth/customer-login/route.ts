import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '30d'; // 30 days for customers

interface LoginRequestBody {
  email: string;
  name?: string;
  phone?: string;
}

/**
 * Customer Login/Register Endpoint
 * POST /api/public/auth/customer-login
 * 
 * Seamless authentication:
 * - If email exists → login (update name/phone if provided)
 * - If email doesn't exist → register new customer
 * 
 * @returns JWT token with user data
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json();
    const { email, name, phone } = body;

    // Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email tidak valid',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Format email tidak valid',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.query(
      `SELECT id, email, name, phone, role, is_active 
       FROM users 
       WHERE email = $1 AND role = 'CUSTOMER'`,
      [emailTrimmed]
    );

    let userId: bigint;
    let userName: string;
    let userPhone: string | null;

    if (existingUser.rows.length > 0) {
      // User exists → Login
      const user = existingUser.rows[0];

      if (!user.is_active) {
        return NextResponse.json(
          {
            success: false,
            error: 'ACCOUNT_DISABLED',
            message: 'Akun Anda tidak aktif',
            statusCode: 403,
          },
          { status: 403 }
        );
      }

      userId = BigInt(user.id);
      userName = name?.trim() || user.name;
      userPhone = phone?.trim() || user.phone;

      // Update name/phone if provided and different
      if ((name && name.trim() !== user.name) || (phone && phone.trim() !== user.phone)) {
        await db.query(
          `UPDATE users 
           SET name = $1, phone = $2, updated_at = NOW() 
           WHERE id = $3`,
          [userName, userPhone, userId.toString()]
        );
      }
    } else {
      // User doesn't exist → Register
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Nama harus diisi untuk pendaftaran',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const insertResult = await db.query(
        `INSERT INTO users (email, name, phone, role, is_active) 
         VALUES ($1, $2, $3, 'CUSTOMER', true) 
         RETURNING id`,
        [emailTrimmed, name.trim(), phone?.trim() || null]
      );

      userId = BigInt(insertResult.rows[0].id);
      userName = name.trim();
      userPhone = phone?.trim() || null;
    }

    // Generate JWT token
    const payload = {
      userId: userId.toString(),
      email: emailTrimmed,
      role: 'CUSTOMER',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: token,
          expiresAt,
          user: {
            id: userId.toString(),
            email: emailTrimmed,
            name: userName,
            phone: userPhone,
            role: 'CUSTOMER',
          },
        },
        message: existingUser.rows.length > 0 ? 'Login berhasil' : 'Akun berhasil dibuat',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
