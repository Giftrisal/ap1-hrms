import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatDailyAbsentAlert } from '@/lib/whatsapp';
import { initialEmployees } from '@/lib/mock-data';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // In a live system, query DB for today's logs where in_time is null
    const absentStaff = ['Puja Bhandari', 'Roshan Ghimire', 'Kritika Shrestha'];
    const lateStaff = ['Rajeev Khadka (25m)', 'Alina Baral (32m)', 'Sandesh Tiwari (38m)'];

    const message = formatDailyAbsentAlert(today, absentStaff, lateStaff);
    const adminPhone = process.env.WHATSAPP_ADMIN_PHONE || '9779841234567';

    const whatsappResult = await sendWhatsAppMessage({
      recipientPhone: adminPhone,
      message
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: today,
      absent_count: absentStaff.length,
      late_count: lateStaff.length,
      whatsapp: whatsappResult
    });
  } catch (error) {
    return NextResponse.json({ error: 'Daily cron execution failed', details: String(error) }, { status: 500 });
  }
}
