import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms, formatOtpMessage, normalizePhoneNumber } from '@/lib/sms';
import { createSignedOtpToken, verifySignedOtpToken, checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, pin, phone, code, staffName, type, gatewayConfig, verificationToken } = body;

    const cleanPin = (pin || '').toString().trim();
    const cleanPhone = normalizePhoneNumber(phone || '');

    if (!cleanPin) {
      return NextResponse.json(
        { success: false, error: 'Please enter your biometric PIN number.' },
        { status: 400 }
      );
    }

    // ACTION: SEND OTP
    if (action === 'send') {
      if (!cleanPhone || cleanPhone.length < 9) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid 10-digit mobile phone number.' },
          { status: 400 }
        );
      }

      // Rate limit check: max 4 attempts per phone number per 10 mins
      const rateCheck = checkRateLimit(`otp_${cleanPhone}`, 4, 10 * 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: `Too many OTP requests. Please wait ${rateCheck.retryAfter || 60} seconds before retrying.` },
          { status: 429 }
        );
      }

      // Generate secure 6-digit OTP code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      const messageText = formatOtpMessage(
        generatedOtp,
        type === 'reset' ? 'reset' : 'signup',
        staffName
      );

      const smsResult = await sendGoinfiSms(cleanPhone, messageText, generatedOtp, gatewayConfig);

      // Secure HMAC token (NEVER leaks plaintext OTP code)
      const token = createSignedOtpToken(
        { pin: cleanPin, phone: cleanPhone },
        generatedOtp,
        300
      );

      return NextResponse.json({
        success: true,
        message: `Verification OTP code dispatched for mobile number +977-${cleanPhone}.`,
        channel: smsResult.channel,
        verificationToken: token,
        expiresInSeconds: 300,
      });
    }

    // ACTION: VERIFY OTP
    if (action === 'verify') {
      const inputCode = (code || '').toString().trim();

      if (!inputCode || inputCode.length !== 6) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid 6-digit OTP code.' },
          { status: 400 }
        );
      }

      if (!verificationToken) {
        return NextResponse.json(
          { success: false, error: 'Verification token missing. Please request a new OTP.' },
          { status: 400 }
        );
      }

      // Cryptographic verification
      const verifyResult = verifySignedOtpToken(verificationToken, inputCode);
      if (!verifyResult.valid) {
        return NextResponse.json(
          { success: false, error: verifyResult.error || 'Incorrect or invalid OTP code.' },
          { status: 400 }
        );
      }

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
