import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatDailyAbsentAlert, formatLateAlert, formatPayslipNotification } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, recipientPhone, payload } = body;

    let messageText = '';

    if (type === 'absent_digest') {
      messageText = formatDailyAbsentAlert(
        payload.date || new Date().toISOString().split('T')[0],
        payload.absentStaff || ['Puja Bhandari', 'Roshan Ghimire'],
        payload.lateStaff || ['Rajeev Khadka', 'Alina Baral', 'Sandesh Tiwari']
      );
    } else if (type === 'late_alert') {
      messageText = formatLateAlert(
        payload.employeeName || 'Staff Member',
        payload.minutesLate || 35,
        payload.timeStr || '09:35 AM'
      );
    } else if (type === 'payslip') {
      messageText = formatPayslipNotification(
        payload.employeeName || 'Staff Member',
        payload.month || 'September',
        payload.year || 2026,
        payload.netSalary || 55000
      );
    } else if (type === 'custom') {
      messageText = payload.message || 'Goinfi-HR Notification';
    } else {
      return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
    }

    const targetPhone = recipientPhone || process.env.WHATSAPP_ADMIN_PHONE || '9779841234567';

    const result = await sendWhatsAppMessage({
      recipientPhone: targetPhone,
      message: messageText,
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notification processed',
      detail: result,
      previewText: messageText
    });
  } catch (error) {
    console.error('WhatsApp API Route Error:', error);
    return NextResponse.json({ error: 'Failed to process WhatsApp request' }, { status: 500 });
  }
}
