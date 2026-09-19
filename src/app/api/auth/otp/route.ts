import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms, formatOtpMessage, normalizePhoneNumber } from '@/lib/sms';

export const dynamic = 'force-dynamic';

interface StoredOtp {
  pin: string;
  phone: string;
  code: string;
  expiresAt: number;
}

// In-memory OTP storage map (key: `${pin}_${phone}`)
const otpStore = new Map<string, StoredOtp>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, pin, phone, code, staffName, type, gatewayConfig } = body;

    const cleanPin = (pin || '').toString().trim();
    const cleanPhone = normalizePhoneNumber(phone || '');

    if (!cleanPin) {
      return NextResponse.json(
        { success: false, error: 'Please enter your biometric PIN number.' },
        { status: 400 }
      );
    }

    const storeKey = `${cleanPin}_${cleanPhone}`;

    // ACTION: SEND OTP
    if (action === 'send') {
      if (!cleanPhone || cleanPhone.length < 9) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid 10-digit mobile phone number.' },
          { status: 400 }
        );
      }

      // Generate secure 6-digit OTP code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      otpStore.set(storeKey, {
        pin: cleanPin,
        phone: cleanPhone,
        code: generatedOtp,
        expiresAt,
      });

      const messageText = formatOtpMessage(
        generatedOtp,
        type === 'reset' ? 'reset' : 'signup',
        staffName
      );

      const smsResult = await sendGoinfiSms(cleanPhone, messageText, generatedOtp, gatewayConfig);

      const verificationToken = Buffer.from(
        JSON.stringify({
          pin: cleanPin,
          phone: cleanPhone,
          code: generatedOtp,
          exp: expiresAt,
        })
      ).toString('base64');

      return NextResponse.json({
        success: true,
        message: `Verification OTP code dispatched for mobile number +977-${cleanPhone}.`,
        channel: smsResult.channel,
        verificationToken,
        expiresInSeconds: 300,
      });
    }

    // ACTION: VERIFY OTP
    if (action === 'verify') {
      const inputCode = (code || '').toString().trim();
      const token = body.verificationToken;

      if (!inputCode) {
        return NextResponse.json(
          { success: false, error: 'Please enter the 6-digit OTP code.' },
          { status: 400 }
        );
      }

      let expectedOtp: string | null = null;
      let expiresAt: number = 0;

      const record = otpStore.get(storeKey);
      if (record) {
        expectedOtp = record.code;
        expiresAt = record.expiresAt;
      } else if (token) {
        // Fallback for serverless container recycling
        try {
          const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
          if (decoded.pin === cleanPin && decoded.phone === cleanPhone) {
            expectedOtp = decoded.code;
            expiresAt = decoded.exp;
          }
        } catch {}
      }

      // Allow master code '123456' for immediate admin/testing bypass or match exact generated OTP
      const isMasterCode = inputCode === '123456';
      const isMatched = expectedOtp && expectedOtp === inputCode;

      if (!isMatched && !isMasterCode) {
        return NextResponse.json(
          { success: false, error: 'Incorrect or invalid OTP code! Please enter the correct 6-digit code.' },
          { status: 400 }
        );
      }

      // Check expiration if not master code
      if (!isMasterCode && expiresAt && Date.now() > expiresAt) {
        otpStore.delete(storeKey);
        return NextResponse.json(
          { success: false, error: 'The OTP code has expired. Please request a new OTP code.' },
          { status: 400 }
        );
      }

      // Valid OTP: delete from store so it can't be reused
      otpStore.delete(storeKey);

      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully!'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('OTP API Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process OTP' },
      { status: 500 }
    );
  }
}
