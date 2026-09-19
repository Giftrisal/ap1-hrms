import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms, normalizePhoneNumber } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export interface SmsRecipient {
  phone: string;
  name?: string;
  pin?: string;
  department?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = 'individual', recipients = [], message = '', title = 'Notice', gatewayConfig } = body;

    const trimmedMsg = (message || '').trim();
    if (!trimmedMsg) {
      return NextResponse.json(
        { success: false, error: 'Please enter a message to send.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one recipient.' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    // Prefix AP1 Television & Goinfi branding if not already present
    const finalMessage = trimmedMsg.startsWith('[AP1') || trimmedMsg.startsWith('[Goinfi') 
      ? trimmedMsg 
      : `[AP1 TV Notice] ${trimmedMsg}`;

    // Process all recipients
    for (const rec of recipients) {
      const cleanPhone = normalizePhoneNumber(rec.phone || '');
      if (!cleanPhone || cleanPhone.length < 9) {
        failedCount++;
        results.push({
          phone: rec.phone,
          name: rec.name,
          status: 'FAILED',
          error: 'Invalid 10-digit mobile number'
        });
        continue;
      }

      // Personalized greeting if name provided
      const personalizedMsg = rec.name 
        ? finalMessage.replace('{name}', rec.name)
        : finalMessage.replace('{name}', 'Colleague');

      const sendResult = await sendGoinfiSms(cleanPhone, personalizedMsg, undefined, gatewayConfig);

      if (sendResult.success) {
        successCount++;
        results.push({
          phone: cleanPhone,
          name: rec.name,
          pin: rec.pin,
          status: 'SENT',
          messageId: sendResult.messageId,
          channel: sendResult.channel,
          whatsappLink: sendResult.whatsappLink
        });
      } else {
        failedCount++;
        results.push({
          phone: cleanPhone,
          name: rec.name,
          pin: rec.pin,
          status: 'FAILED',
          error: sendResult.error,
          whatsappLink: sendResult.whatsappLink
        });
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      total: recipients.length,
      successCount,
      failedCount,
      message: successCount > 0 
        ? `SMS successfully dispatched to ${successCount} staff.${failedCount > 0 ? ` (${failedCount} failed)` : ''}`
        : (results[0]?.error || 'Failed to dispatch SMS through telecom gateway.'),
      results,
      sampleWhatsappLink: recipients.length === 1 ? results[0]?.whatsappLink : undefined,
      sampleText: finalMessage,
      sentAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('SMS Send API Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch SMS' },
      { status: 500 }
    );
  }
}
