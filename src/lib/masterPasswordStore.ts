import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ignoatjmfuhdxrmjycpp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const MASTER_PASS_RECORD_ID = 'goinfi-system-ap1-master-password';

export const DEFAULT_MASTER_PASSWORDS = [
  'AP1#Master@2026!',
  'AP1@Master#2026',
  'AP1#Master2026',
  'AP1@Master2026',
  'AP1Master#2026',
  'ap1#master@2026!'
];

let memoryCachedPassword: { password: string; fetchedAt: number } | null = null;

function getLocalFilePath(): string | null {
  try {
    const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
    if (fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
      return path.join(tmpDir, 'ap1_master_admin_pass.json');
    }
  } catch {}
  return null;
}

export async function loadMasterPassword(): Promise<string | null> {
  const now = Date.now();
  if (memoryCachedPassword && (now - memoryCachedPassword.fetchedAt < 60000)) {
    return memoryCachedPassword.password;
  }

  // 1. Fetch from Supabase Cloud Database
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', MASTER_PASS_RECORD_ID)
      .maybeSingle();

    if (!error && data?.content?.[0]?.password) {
      const pwd = String(data.content[0].password).trim();
      memoryCachedPassword = { password: pwd, fetchedAt: now };
      // Sync to local file
      const p = getLocalFilePath();
      if (p) {
        try {
          fs.writeFileSync(p, JSON.stringify({ password: pwd, updatedAt: new Date().toISOString() }), 'utf-8');
        } catch {}
      }
      return pwd;
    }
  } catch (err) {
    console.warn('[MasterPasswordStore] Supabase fetch error:', err);
  }

  // 2. Fallback to local file
  try {
    const p = getLocalFilePath();
    if (p && fs.existsSync(/*turbopackIgnore: true*/ p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (parsed && parsed.password) {
        memoryCachedPassword = { password: parsed.password, fetchedAt: now };
        return parsed.password;
      }
    }
  } catch {}

  return null;
}

export async function saveMasterPassword(newPassword: string): Promise<void> {
  const clean = newPassword.trim();
  memoryCachedPassword = { password: clean, fetchedAt: Date.now() };

  // 1. Save to Supabase Cloud Database
  try {
    await supabase.from('articles').upsert({
      id: MASTER_PASS_RECORD_ID,
      slug: 'goinfi-master-pass',
      title: 'Master Admin Custom Password',
      category: 'system_security',
      content: [{ password: clean, updatedAt: new Date().toISOString() }]
    });
  } catch (err) {
    console.error('[MasterPasswordStore] Supabase save error:', err);
  }

  // 2. Save to local file
  try {
    const p = getLocalFilePath();
    if (p) {
      fs.writeFileSync(p, JSON.stringify({ password: clean, updatedAt: new Date().toISOString() }), 'utf-8');
    }
  } catch {}
}

export async function isMasterPasswordValid(candidate: string): Promise<boolean> {
  const trimmed = (candidate || '').trim();
  if (!trimmed) return false;

  // Check default passwords
  if (DEFAULT_MASTER_PASSWORDS.includes(trimmed)) {
    return true;
  }

  // Check persisted custom password
  const customPass = await loadMasterPassword();
  if (customPass && customPass === trimmed) {
    return true;
  }

  return false;
}
