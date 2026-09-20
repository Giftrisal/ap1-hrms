import { NextRequest, NextResponse } from 'next/server';

// In-memory / cache store for live punch stream so changes reflect instantly
let cachedLogs: any[] = [];
let lastSyncTime: string | null = null;
let lastDeviceIp: string | null = null;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-biometric-secret');
    const expectedSecret = process.env.BIOMETRIC_API_SECRET || 'goinfi_secure_zk_secret_2026';

    if (authHeader && authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid biometric secret key' }, { status: 401 });
    }

    const body = await req.json();
    const { logs, device_ip } = body;

    if (!Array.isArray(logs)) {
      return NextResponse.json({ error: 'Payload must contain a `logs` array' }, { status: 400 });
    }

    lastSyncTime = new Date().toISOString();
    lastDeviceIp = device_ip || '192.168.1.201';

    // Process and enrich punch logs
    const processed = logs.map(log => {
      const punchDate = new Date(log.punch_time);
      const hours = punchDate.getHours();
      const minutes = punchDate.getMinutes();

      // Simple calculation against standard 9:00 AM shift
      const isMorning = hours < 13;
      const scheduledMinutes = 9 * 60; // 9:00 AM
      const punchMinutes = hours * 60 + minutes;
      const lateMins = isMorning && punchMinutes > (scheduledMinutes + 15) 
        ? punchMinutes - scheduledMinutes 
        : 0;

      return {
        ...log,
        processed_at: lastSyncTime,
        late_minutes: lateMins,
        is_late: lateMins > 0
      };
    });

    cachedLogs = [...processed, ...cachedLogs].slice(0, 500);

    return NextResponse.json({
      success: true,
      message: 'Biometric punches processed successfully',
      processed_count: logs.length,
      device_ip: lastDeviceIp,
      synced_at: lastSyncTime
    });
  } catch (error) {
    console.error('Biometric Sync API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during biometric sync', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    last_sync: lastSyncTime || new Date().toISOString(),
    device_ip: lastDeviceIp || '192.168.1.201',
    port: 4370,
    cached_logs_count: cachedLogs.length,
    recent_logs: cachedLogs.slice(0, 20)
  });
}

export async function DELETE() {
  cachedLogs = [];
  lastSyncTime = null;
  return NextResponse.json({
    success: true,
    message: 'All cached biometric logs cleared.'
  });
}
