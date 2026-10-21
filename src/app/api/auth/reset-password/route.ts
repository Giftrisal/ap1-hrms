import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms, normalizePhoneNumber } from '@/lib/sms';
import { createSignedOtpToken, verifySignedOtpToken, checkRateLimit } from '@/lib/security';
import { saveMasterPassword } from '@/lib/masterPasswordStore';

export const dynamic = 'force-dynamic';

const MASTER_ADMIN_PHONE = process.env.MASTER_ADMIN_PHONE || '9715400400';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, identifier, otp, newPassword, verificationToken, clientStaff } = body;

    const query = (identifier || '').toString().trim().toLowerCase();

    // 1. ACTION: RESOLVE REGISTERED PHONE & SEND OTP
    if (action === 'send_otp') {
      if (!query) {
        return NextResponse.json({ 
          success: false, 
          error: 'कृपया आफ्नो Username, Email वा Biometric PIN प्रविष्टि गर्नुहोस्।' 
        }, { status: 400 });
      }

      let targetPhone = '';
      let accountName = '';
      let isMaster = false;

      // Check Master Admin (strictly 999, 9999, or admin)
      if (query === '999' || query === '9999' || query === 'admin' || query === 'admin@ap1hdtv.com') {
        isMaster = true;
        targetPhone = MASTER_ADMIN_PHONE;
        accountName = 'Master Admin';
      } else {
        let matchedStaff: any = null;
        if (Array.isArray(clientStaff)) {
          matchedStaff = clientStaff.find((s: any) => 
            String(s.biometric_pin).toLowerCase() === query ||
            (s.email && s.email.toLowerCase() === query) ||
            (s.phone && normalizePhoneNumber(s.phone) === normalizePhoneNumber(query)) ||
            (s.full_name && s.full_name.toLowerCase() === query)
          );
        }

        if (matchedStaff && matchedStaff.phone) {
          targetPhone = normalizePhoneNumber(matchedStaff.phone);
          accountName = matchedStaff.full_name || 'Staff Member';
        } else {
          return NextResponse.json({
            success: false,
            error: `प्रणालीमा '${identifier}' सँग सम्बन्धित कुनै खाता फेला परेन। कृपया सही PIN वा Username प्रविष्टि गर्नुहोस्।`
          }, { status: 404 });
        }
      }

      if (!targetPhone || targetPhone.length < 9) {
        return NextResponse.json({
          success: false,
          error: 'यो खातामा कुनै पनि आधिकारिक मोबाइल नम्बर दर्ता भएको छैन। कृपया प्रशासनसँग सम्पर्क गर्नुहोस्।'
        }, { status: 400 });
      }

      // Rate limit check: max 3 requests per 10 mins
      const rateCheck = checkRateLimit(`reset_${targetPhone}`, 3, 10 * 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: `अत्यधिक अनुरोध! कृपया ${rateCheck.retryAfter || 60} सेकेन्ड पर्खनुहोस्।`
        }, { status: 429 });
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      const messageText = `[AP1 Television HRMS] Your password reset OTP code is ${generatedOtp}. Valid for 5 minutes. Do not share with anyone. AP1 Network.`;

      await sendGoinfiSms(targetPhone, messageText, generatedOtp);

      // Secure signed token (NEVER leaks OTP)
      const token = createSignedOtpToken({
        identifier: query,
        phone: targetPhone,
        isMaster
      }, generatedOtp, 300);

      // Mask phone for display: e.g. 98****9000
      let masked = targetPhone;
      if (targetPhone.length >= 10) {
        masked = targetPhone.slice(0, 2) + '****' + targetPhone.slice(-4);
      }

      return NextResponse.json({
        success: true,
        message: `OTP कोड दर्ता भएको मोबाइल नम्बर (+977-${masked}) मा पठाइयो।`,
        targetPhone: `+977-${masked}`,
        accountName,
        isMaster,
        verificationToken: token,
        expiresInSeconds: 300
      });
    }

    // 2. ACTION: VERIFY OTP AND UPDATE PASSWORD
    if (action === 'verify_and_update') {
      const inputCode = (otp || '').toString().trim();
      const newPass = (newPassword || '').toString().trim();

      if (!inputCode || inputCode.length !== 6) {
        return NextResponse.json({ 
          success: false, 
          error: 'कृपया ६-अंकको OTP कोड प्रविष्टि गर्नुहोस्।' 
        }, { status: 400 });
      }

      if (!newPass || newPass.length < 6) {
        return NextResponse.json({ 
          success: false, 
          error: 'नयाँ पासवर्ड कम्तीमा ६ क्यारेक्टरको हुनुपर्छ।' 
        }, { status: 400 });
      }

      if (!verificationToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'प्रमाणीकरण टोकन फेला परेन। कृपया नयाँ कोड पठाउनुहोस्।' 
        }, { status: 400 });
      }

      // Cryptographic verification (NO 123456 bypass!)
      const verifyResult = verifySignedOtpToken(verificationToken, inputCode);
      if (!verifyResult.valid) {
        return NextResponse.json({ 
          success: false, 
          error: verifyResult.error || 'गलत वा अमान्य OTP कोड! कृपया दर्ता भएको मोबाइलमा आएको सही कोड प्रविष्टि गर्नुहोस्।' 
        }, { status: 400 });
      }

      const isMaster = verifyResult.payload?.isMaster || query === '999' || query === '9999' || query === 'admin';

      if (isMaster) {
        await saveMasterPassword(newPass);
      }

      return NextResponse.json({
        success: true,
        message: 'पासवर्ड सफलतापूर्वक परिवर्तन भयो! अब नयाँ पासवर्डबाट लगइन गर्न सक्नुहुन्छ।',
        isMaster,
        identifier: verifyResult.payload?.identifier || query
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Reset Password API Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to process request' }, { status: 500 });
  }
}
