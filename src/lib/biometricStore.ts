import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ignoatjmfuhdxrmjycpp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

export const SUPABASE_PUNCHES_ID = 'goinfi-system-ap1-biometric-punches';
export const SUPABASE_STAFF_ID = 'goinfi-system-ap1-staff-list';

function getTmpCachePath(): string {
  const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
  return path.join(tmpDir, 'ap1_biometric_punches_v3.json');
}

let memoryPunchesCache: { 
  logs: any[]; 
  lastSyncTime: string | null; 
  lastDeviceIp: string | null; 
  lastFetched: number 
} | null = null;

let staffPinMapCache: { [pin: string]: string } = {};
let lastStaffFetched = 0;

export async function getStaffDirectoryMap(): Promise<{ [pin: string]: string }> {
  const now = Date.now();
  if (Object.keys(staffPinMapCache).length > 0 && now - lastStaffFetched < 300000) { // 5 minutes cache
    return staffPinMapCache;
  }

  try {
    const { data } = await supabase
      .from('articles')
      .select('content')
      .eq('id', SUPABASE_STAFF_ID)
      .maybeSingle();

    if (data?.content?.[0]?.staff && Array.isArray(data.content[0].staff)) {
      const map: { [pin: string]: string } = {};
      for (const s of data.content[0].staff) {
        if (s.biometric_pin) {
          map[String(s.biometric_pin).trim()] = s.full_name || s.name || `Staff ${s.biometric_pin}`;
        }
      }
      staffPinMapCache = map;
      lastStaffFetched = now;
      return staffPinMapCache;
    }
  } catch (err) {
    console.error('[biometricStore] Error fetching staff directory:', err);
  }

  return staffPinMapCache;
}

export async function loadPunches(): Promise<{ logs: any[]; lastSyncTime: string | null; lastDeviceIp: string | null }> {
  const now = Date.now();
  if (memoryPunchesCache && now - memoryPunchesCache.lastFetched < 45000) { // 45 seconds cache
    return { 
      logs: memoryPunchesCache.logs, 
      lastSyncTime: memoryPunchesCache.lastSyncTime, 
      lastDeviceIp: memoryPunchesCache.lastDeviceIp 
    };
  }

  // 1. Fetch from Supabase Cloud
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', SUPABASE_PUNCHES_ID)
      .maybeSingle();

    if (!error && data?.content?.[0]) {
      const payload = data.content[0];
      const logs = Array.isArray(payload.logs) ? payload.logs : [];
      memoryPunchesCache = {
        logs,
        lastSyncTime: payload.lastSyncTime || null,
        lastDeviceIp: payload.lastDeviceIp || 'Cloud-ADMS',
        lastFetched: now
      };

      try {
        fs.writeFileSync(getTmpCachePath(), JSON.stringify(payload, null, 2), 'utf-8');
      } catch {}

      return memoryPunchesCache;
    }
  } catch (err) {}

  // 2. Fallback to local tmp
  try {
    const p = getTmpCachePath();
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (parsed && Array.isArray(parsed.logs)) {
        return parsed;
      }
    }
  } catch {}

  return { logs: [], lastSyncTime: null, lastDeviceIp: 'Cloud-ADMS' };
}

export async function savePunches(logs: any[], lastSyncTime: string, lastDeviceIp: string): Promise<void> {
  memoryPunchesCache = {
    logs,
    lastSyncTime,
    lastDeviceIp,
    lastFetched: Date.now()
  };

  const payload = {
    logs: logs.slice(0, 500),
    lastSyncTime,
    lastDeviceIp,
    updatedAt: new Date().toISOString()
  };

  // 1. Save to Supabase Cloud
  try {
    await supabase.from('articles').upsert({
      id: SUPABASE_PUNCHES_ID,
      slug: 'goinfi-punches-ap1',
      title: 'AP1 Biometric Hardware Live Punches',
      category: 'system_config',
      content: [payload]
    });
  } catch (err) {
    console.error('[Biometric Store] Supabase save error:', err);
  }

  // 2. Save to local tmp
  try {
    fs.writeFileSync(getTmpCachePath(), JSON.stringify(payload, null, 2), 'utf-8');
  } catch {}
}
