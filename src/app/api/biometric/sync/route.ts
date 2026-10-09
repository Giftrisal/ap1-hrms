import { NextRequest, NextResponse } from 'next/server';
import { loadPunches, savePunches } from '@/lib/biometricStore';

export const dynamic = 'force-dynamic';

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

    const syncTime = new Date().toISOString();
    const deviceIp = device_ip || '192.168.1.201';

    // Process and enrich punch logs (Pure In / Out system - no late penalties or grace periods)
    const processed = logs.map(log => {
      return {
        ...log,
        processed_at: syncTime,
        late_minutes: 0,
        is_late: false
      };
    });

    const current = await loadPunches();
    
    // Deduplicate by biometric_pin + punch_time
    const existingKeys = new Set(current.logs.map(l => `${l.user_id || l.biometric_pin}_${l.punch_time}`));
    const newUnique = processed.filter(l => !existingKeys.has(`${l.user_id || l.biometric_pin}_${l.punch_time}`));

    const merged = [...newUnique, ...current.logs]
      .sort((a, b) => (b.punch_time || '').localeCompare(a.punch_time || ''))
      .slice(0, 1000);
    await savePunches(merged, syncTime, deviceIp);

    return NextResponse.json({
      success: true,
      message: 'Biometric punches processed and persisted to cloud successfully',
      processed_count: logs.length,
      new_unique_count: newUnique.length,
      device_ip: deviceIp,
      synced_at: syncTime
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
  const current = await loadPunches();
  const sortedLogs = [...current.logs].sort((a, b) => 
    (b.punch_time || '').localeCompare(a.punch_time || '')
  );

  return NextResponse.json({
    status: 'online',
    last_sync: current.lastSyncTime || new Date().toISOString(),
    device_ip: current.lastDeviceIp || '192.168.1.201',
    port: 4370,
    cached_logs_count: current.logs.length,
    recent_logs: sortedLogs.slice(0, 500)
  });
}

export async function DELETE() {
  await savePunches([], new Date().toISOString(), '192.168.1.201');
  return NextResponse.json({
    success: true,
    message: 'All biometric punches cleared.'
  });
}
