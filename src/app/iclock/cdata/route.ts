import { NextRequest, NextResponse } from 'next/server';
import { loadPunches, savePunches, getStaffDirectoryMap } from '@/lib/biometricStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get('SN') || 'AP1-ZTECO';

    // Standard ZKTeco ADMS / Push Handshake Config
    const responseText = [
      `GET OPTION FROM: ${sn}`,
      'Stamp=9999',
      'OpStamp=9999',
      'ErrorDelay=30',
      'Delay=10',
      'TransTimes=00:00;14:05',
      'TransInterval=1',
      'TransFlag=1111111111',
      'TimeZone=5:45',
      'Realtime=1',
      'Encrypt=0',
      ''
    ].join('\r\n');

    return new NextResponse(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    console.error('[ADMS cdata GET error]:', err);
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sn = searchParams.get('SN') || 'AP1-DEVICE';
    const table = (searchParams.get('table') || '').toUpperCase();

    const rawBody = await req.text();

    if (!rawBody || rawBody.trim().length === 0) {
      return new NextResponse('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // If device pushed attendance punch records (table=ATTLOG or body has punch entries)
    if (table === 'ATTLOG' || rawBody.includes('\t') || rawBody.includes('-')) {
      const staffMap = await getStaffDirectoryMap();
      const lines = rawBody.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const newPunches: any[] = [];
      const syncTime = new Date().toISOString();

      for (const line of lines) {
        // Line can be tab-separated: PIN \t YYYY-MM-DD HH:MM:SS \t STATUS \t VERIFY \t ...
        // Or space-separated
        const parts = line.includes('\t') ? line.split('\t') : line.split(/\s+/);
        if (parts.length >= 2) {
          let pin = parts[0].trim().replace(/^PIN=/, '');
          let timeStr = parts[1].trim().replace(/^TIME=/, '');
          let statusStr = parts[2] ? parts[2].trim().replace(/^STATUS=/, '') : '0';

          // Validate date/time format YYYY-MM-DD HH:MM:SS
          if (timeStr && timeStr.includes('-') && timeStr.includes(':')) {
            const isoTime = timeStr.includes('T') ? timeStr : timeStr.replace(' ', 'T');
            const empName = staffMap[pin] || `Staff ${pin}`;
            const isCheckIn = statusStr === '0' || statusStr === '255' || statusStr.toLowerCase() === 'in';

            newPunches.push({
              user_id: pin,
              biometric_pin: pin,
              employee_name: empName,
              punch_time: isoTime,
              punch_type: isCheckIn ? 'Check-In' : 'Check-Out',
              verify_type: 1,
              device_ip: `ADMS-SN:${sn}`,
              is_late: false,
              late_minutes: 0,
              processed_at: syncTime
            });
          }
        }
      }

      if (newPunches.length > 0) {
        const current = await loadPunches();
        const existingKeys = new Set(
          current.logs.map(l => `${l.user_id || l.biometric_pin}_${l.punch_time}`)
        );

        const uniqueNew = newPunches.filter(
          l => !existingKeys.has(`${l.user_id || l.biometric_pin}_${l.punch_time}`)
        );

        const merged = [...uniqueNew, ...current.logs]
          .sort((a, b) => (b.punch_time || '').localeCompare(a.punch_time || ''))
          .slice(0, 1000);
        await savePunches(merged, syncTime, `ADMS-Cloud (${sn})`);

        return new NextResponse(`OK: ${newPunches.length}`, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }

    // Default response for other tables (OPERLOG, USER, etc.)
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('[ADMS cdata POST error]:', error);
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
