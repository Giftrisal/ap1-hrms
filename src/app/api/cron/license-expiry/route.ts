import { NextRequest, NextResponse } from 'next/server';
import { checkAndDispatchLicenseExpirySms, getActiveLicenseServer, getLicenseNotificationLog } from '@/lib/license/license-server';

export const dynamic = 'force-dynamic';

/**
 * Scheduled Cron Job: License Expiry Automated SMS Monitor
 * Executed daily to check if the client's HRMS license is nearing expiration.
 * Dispatches automated Nepali SMS warnings at:
 * - 7 days before expiry
 * - 3 days before expiry
 * - 1 day before expiry (critical)
 * - On expiry day
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';
    const isTest = url.searchParams.get('test') === 'true';
    const phone = url.searchParams.get('phone') || undefined;

    const result = await checkAndDispatchLicenseExpirySms({
      force,
      isTest,
      recipientPhone: phone
    });

    const active = await getActiveLicenseServer();
    const log = getLicenseNotificationLog();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      activeLicense: {
        clientName: active.license.clientName,
        clientCode: active.license.clientCode,
        tier: active.license.tier,
        expiresAt: new Date(active.license.expiresAt).toISOString(),
        alertPhone: active.alertPhone,
        autoAlertEnabled: active.autoAlertEnabled
      },
      checkResult: result,
      lastNotification: {
        milestone: log.lastMilestone,
        sentAt: log.lastSentAt,
        recipientPhone: log.recipientPhone
      }
    });
  } catch (error: any) {
    console.error('[License Expiry Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'License expiry check failed' },
      { status: 500 }
    );
  }
}
