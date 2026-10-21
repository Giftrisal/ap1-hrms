import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms } from '@/lib/sms';
import { createSignedOtpToken, verifySignedOtpToken, checkRateLimit } from '@/lib/security';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MASTER_ADMIN_PHONE = process.env.MASTER_ADMIN_PHONE || '9715400400';
// Only secure default master passwords (insecure 'admin', 'admin123' removed)
const DEFAULT_PASSWORDS = [
  'AP1#Master@2026!',
  'AP1@Master#2026',
  'AP1#Master2026',
  'AP1@Master2026',
  'AP1Master#2026',
  'ap1#master@2026!'
];

let currentCustomPassword: string | null = null;

// Helper to get persistent storage file path if available
function getStoragePath(): string | null {
  try {
    const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
    if (fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
      return path.join(tmpDir, 'ap1_master_admin_pass.json');
    }
  } catch {}
  return null;
}

function loadPersistedPassword(): string | null {
  if (currentCustomPassword) return currentCustomPassword;
  try {
    const p = getStoragePath();
    if (p && fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (data && data.password) {
        currentCustomPassword = data.password;
        return data.password;
      }
    }
  } catch {}
  return null;
}

function savePersistedPassword(pwd: string) {
  currentCustomPassword = pwd;
  try {
    const p = getStoragePath();
    if (p) {
      fs.writeFileSync(p, JSON.stringify({ password: pwd, updatedAt: new Date().toISOString() }), 'utf-8');
    }
  } catch {}
}

export async function GET() {
  const customPwd = loadPersistedPassword();
  return NextResponse.json({
    success: true,
    targetPhone: `+977-${MASTER_ADMIN_PHONE.slice(0, 2)}****${MASTER_ADMIN_PHONE.slice(-4)}`,
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
      const rateCheck = checkRateLimit(`master_otp_${MASTER_ADMIN_PHONE}`, 3, 10 * 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: `अत्यधिक अनुरोध! कृपया ${rateCheck.retryAfter || 60} सेकेन्ड पर्खनुहोस् (Too many attempts. Please wait).`
        }, { status: 429 });
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      const messageText = `[AP1 Television HRMS] Your Master Admin password security OTP code is ${generatedOtp}. Valid for 5 minutes. Do not share with anyone. AP1 Network.`;

      const smsResult = await sendGoinfiSms(MASTER_ADMIN_PHONE, messageText, generatedOtp);

      // Cryptographically signed verification token (NEVER leaks plaintext OTP code)
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
        return NextResponse.json({ success: false, error: 'कृपया ६-अंकको OTP कोड प्रविष्टि गर्नुहोस् (Please enter valid 6-digit OTP code).' }, { status: 400 });
      }

      if (!newPass || newPass.length < 8) {
        return NextResponse.json({ success: false, error: 'नयाँ पासवर्ड कम्तीमा ८ क्यारेक्टरको हुनुपर्छ (Password must be at least 8 characters).' }, { status: 400 });
      }

      if (!verificationToken) {
        return NextResponse.json({ success: false, error: 'प्रमाणीकरण टोकन फेला परेन। कृपया नयाँ OTP पठाउनुहोस्।' }, { status: 400 });
      }

      // Cryptographic verification (NO 123456 bypass)
      const verifyResult = verifySignedOtpToken(verificationToken, inputCode);
      if (!verifyResult.valid) {
        return NextResponse.json({
          success: false,
          error: verifyResult.error || 'गलत वा अमान्य OTP कोड! कृपया सहि कोड प्रविष्टि गर्नुहोस्।'
        }, { status: 400 });
      }

      // Validated! Save the new password
      savePersistedPassword(newPass);

      return NextResponse.json({
        success: true,
        message: 'Master Admin password successfully updated! अब नयाँ पासवर्डबाट लगइन गर्न सक्नुहुन्छ।'
      });
    }

    // 3. ACTION: VERIFY CURRENT PASSWORD (LOGIN CHECK)
    if (action === 'verify_login') {
      const pass = (body.password || '').toString().trim();
      const current = loadPersistedPassword();
      const isValid = (current && pass === current) || DEFAULT_PASSWORDS.includes(pass);

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
