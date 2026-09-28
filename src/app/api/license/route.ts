import { NextRequest, NextResponse } from 'next/server';
import { 
  generateLicenseKey, 
  verifyLicenseKey, 
  getDefaultAp1License, 
  LicenseTier, 
  LICENSE_TIERS 
} from '@/lib/license/license-manager';
import { 
  getActiveLicenseServer, 
  saveActiveLicenseServer, 
  checkAndDispatchLicenseExpirySms, 
  getLicenseNotificationLog,
  DEFAULT_CLIENT_PHONE
} from '@/lib/license/license-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const serverRecord = await getActiveLicenseServer();
  const notificationLog = getLicenseNotificationLog();

  return NextResponse.json({
    success: true,
    availableTiers: LICENSE_TIERS,
    activeLicense: serverRecord.license,
    alertPhone: serverRecord.alertPhone || DEFAULT_CLIENT_PHONE,
    autoAlertEnabled: serverRecord.autoAlertEnabled,
    lastNotification: {
      milestone: notificationLog.lastMilestone,
      sentAt: notificationLog.lastSentAt,
      recipientPhone: notificationLog.recipientPhone,
      history: (notificationLog.history || []).slice(0, 5)
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. GENERATE NEW LICENSE (Master Admin Only)
    if (action === 'generate') {
      const { clientCode, clientName, tier, adminPin } = body;

      if (String(adminPin).trim() !== '999') {
        return NextResponse.json(
          { success: false, error: 'अनधिकृत पहुँच! केवल Master Admin (PIN: 999) ले मात्र नयाँ लाइसेन्स बनाउन सक्छ।' },
          { status: 403 }
        );
      }

      if (!tier || !LICENSE_TIERS[tier as LicenseTier]) {
        return NextResponse.json(
          { success: false, error: 'अमान्य अवधि (Invalid duration tier)' },
          { status: 400 }
        );
      }

      const generated = generateLicenseKey(
        clientCode || 'AP1',
        clientName || 'AP1 Television Network',
        tier as LicenseTier
      );

      return NextResponse.json({
        success: true,
        message: 'नयाँ लाइसेन्स की सफलतापूर्वक तयार भयो!',
        key: generated.key,
        payload: generated.payload,
        tierInfo: LICENSE_TIERS[tier as LicenseTier]
      });
    }

    // 2. VERIFY / VALIDATE KEY
    if (action === 'verify') {
      const { key } = body;
      const verification = verifyLicenseKey(key);
      if (!verification.valid) {
        return NextResponse.json({ success: false, error: verification.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        payload: verification.payload,
        message: 'लाइसेन्स की प्रमाणीकरण सफल भयो।'
      });
    }

    // 3. ACTIVATE KEY
    if (action === 'activate') {
      const { key, alertPhone } = body;
      const verification = verifyLicenseKey(key);
      if (!verification.valid) {
        return NextResponse.json({ success: false, error: verification.error }, { status: 400 });
      }

      const payload = verification.payload!;
      const days = Math.ceil((payload.expiresAt - payload.issuedAt) / (1000 * 60 * 60 * 24));

      // Persist to Supabase cloud server state (Syncs Home PC, Office PC, Mobile)
      await saveActiveLicenseServer(payload, alertPhone);

      return NextResponse.json({
        success: true,
        message: `लाइसेन्स सफलतापूर्वक सक्रिय भयो! अवधि: ${days} दिन।`,
        payload
      });
    }

    // 4. CHECK EXPIRY AND DISPATCH SMS
    if (action === 'check_and_notify') {
      const { force, isTest, alertPhone } = body;
      const dispatchResult = await checkAndDispatchLicenseExpirySms({
        force: !!force,
        isTest: !!isTest,
        recipientPhone: alertPhone
      });

      return NextResponse.json({
        success: true,
        result: dispatchResult
      });
    }

    // 5. UPDATE ALERT PHONE / CONFIG
    if (action === 'update_alert_phone') {
      const { alertPhone, autoAlertEnabled } = body;
      const active = await getActiveLicenseServer();
      const updated = await saveActiveLicenseServer(
        active.license, 
        alertPhone || active.alertPhone, 
        typeof autoAlertEnabled === 'boolean' ? autoAlertEnabled : active.autoAlertEnabled
      );

      return NextResponse.json({
        success: true,
        message: 'लाइसेन्स SMS अलर्ट सेटिङ सफलतापूर्वक सुरक्षित गरियो।',
        record: updated
      });
    }

    return NextResponse.json({ success: false, error: 'अमान्य अनुरोध (Invalid action)' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
