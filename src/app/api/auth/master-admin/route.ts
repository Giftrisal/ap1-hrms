import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms } from '@/lib/sms';
import { createSignedOtpToken, verifySignedOtpToken, checkRateLimit } from '@/lib/security';
import { loadMasterPassword, saveMasterPassword, isMasterPasswordValid } from '@/lib/masterPasswordStore';

export const dynamic = 'force-dynamic';

const MASTER_ADMIN_PHONE = process.env.MASTER_ADMIN_PHONE || '9715400400';

export async function GET() {
  const customPwd = await loadMasterPassword();
  const masked = `+977-${MASTER_ADMIN_PHONE.slice(0, 2)}****${MASTER_ADMIN_PHONE.slice(-4)}`;
  return NextResponse.json({
    success: true,
    targetPhone: masked,
    phoneDigits: MASTER_ADMIN_PHONE,
    hasCustomPassword: !!customPwd,
    message: 'Master Admin authentication gateway ready.'
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, otp, newPassword, verificationToken } = body;

    // 1. ACTION: SEND OTP TO MASTER ADMIN PHONE
    if (action === 'send_otp') {
      const rateCheck = checkRateLimit(`master_otp_${MASTER_ADMIN_PHONE}`, 4, 10 * 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: `अत्यधिक अनुरोध! कृपया ${rateCheck.retryAfter || 60} सेकेन्ड पर्खनुहोस् (Too many attempts. Please wait).`
        }, { status: 429 });
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      const messageText = `[AP1 Television HRMS] Your Master Admin password security OTP code is ${generatedOtp}. Valid for 5 minutes. Do not share with anyone. AP1 Network.`;

      const smsResult = await sendGoinfiSms(MASTER_ADMIN_PHONE, messageText, generatedOtp);

      const token = createSignedOtpToken({ phone: MASTER_ADMIN_PHONE, isMaster: true }, generatedOtp, 300);

      const maskedPhone = `+977-${MASTER_ADMIN_PHONE.slice(0, 2)}****${MASTER_ADMIN_PHONE.slice(-4)}`;

      return NextResponse.json({
        success: true,
        message: `OTP verification code sent to Master Admin phone (${maskedPhone}).`,
        targetPhone: maskedPhone,
        channel: smsResult.channel,
        verificationToken: token,
        expiresInSeconds: 300
      });
    }

    // 2. ACTION: VERIFY OTP AND UPDATE MASTER PASSWORD
    if (action === 'verify_and_update') {
      const inputCode = (otp || '').toString().trim();
      const newPass = (newPassword || '').toString().trim();

      if (!inputCode || inputCode.length !== 6) {
        return NextResponse.json({ success: false, error: 'कृपया ६-अंकको OTP कोड प्रविष्टि गर्नुहोस्।' }, { status: 400 });
      }

      if (!newPass || newPass.length < 5) {
        return NextResponse.json({ success: false, error: 'नयाँ पासवर्ड कम्तीमा ५ क्यारेक्टरको हुनुपर्छ।' }, { status: 400 });
      }

      if (!verificationToken) {
        return NextResponse.json({ success: false, error: 'प्रमाणीकरण टोकन फेला परेन। कृपया नयाँ OTP पठाउनुहोस्।' }, { status: 400 });
      }

      const verifyResult = verifySignedOtpToken(verificationToken, inputCode);
      if (!verifyResult.valid) {
        return NextResponse.json({
          success: false,
          error: verifyResult.error || 'गलत वा अमान्य OTP कोड! कृपया सहि कोड प्रविष्टि गर्नुहोस्।'
        }, { status: 400 });
      }

      // Validated! Save the new password to Cloud and local storage
      await saveMasterPassword(newPass);

      return NextResponse.json({
        success: true,
        message: 'Master Admin password successfully updated! अब नयाँ पासवर्डबाट लगइन गर्न सक्नुहुन्छ।'
      });
    }

    // 3. ACTION: VERIFY CURRENT PASSWORD (LOGIN CHECK)
    if (action === 'verify_login') {
      const pass = (body.password || '').toString().trim();
      const isValid = await isMasterPasswordValid(pass);

      return NextResponse.json({
        success: true,
        isValid
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Master Admin API Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to process request' }, { status: 500 });
  }
}
