import { NextRequest, NextResponse } from 'next/server';
import { getNepaliDate } from '@/lib/nepali-date';
import { sendGoinfiSms, formatMonthlyBillMessage } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    const bsDate = getNepaliDate();
    const is25thNepaliDay = bsDate.bsDay === 25;

    if (!is25thNepaliDay && !force) {
      return NextResponse.json({
        success: true,
        dispatched: false,
        message: `Today is BS Day ${bsDate.bsDay}. Billing invoice notices are scheduled for dispatch on the 25th of each month.`,
        todayNepaliDate: bsDate.formattedEn,
        bsDay: bsDate.bsDay,
      });
    }

    // Bill metadata
    const billNumber = `INV-AP1-${bsDate.bsYear}${String(bsDate.bsMonth).padStart(2, '0')}-25`;
    const billMessage = formatMonthlyBillMessage(
      bsDate.monthNameEn,
      bsDate.bsYear,
      billNumber
    );

    // Target recipient: AP1 Administration / Finance Phone
    const targetPhone = process.env.AP1_BILLING_PHONE || process.env.WHATSAPP_ADMIN_PHONE || '9841234567';

    const smsResult = await sendGoinfiSms(targetPhone, billMessage);

    return NextResponse.json({
      success: true,
      dispatched: true,
      invoiceNumber: billNumber,
      nepaliDate: bsDate.formattedNp,
      nepaliMonth: bsDate.monthNameNp,
      recipientPhone: targetPhone,
      messageSent: billMessage,
      gatewayResult: smsResult,
    });
  } catch (error: any) {
    console.error('[Monthly Bill Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Monthly bill dispatch failed' },
      { status: 500 }
    );
  }
}
