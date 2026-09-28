import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { 
  LicensePayload, 
  getDefaultAp1License, 
  verifyLicenseKey, 
  LICENSE_TIERS,
  LicenseTier
} from './license-manager';
import { sendGoinfiSms, formatLicenseExpirySmsMessage, SmsSendResult } from '@/lib/sms';

export const DEFAULT_CLIENT_PHONE = '9801239000'; // AP1 TV Master Admin / Management contact

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ignoatjmfuhdxrmjycpp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Master Supabase client with service role for global cloud synchronization
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SUPABASE_CONFIG_ID = 'goinfi-system-ap1-license';

export interface StoredServerLicense {
  license: LicensePayload;
  alertPhone: string;
  autoAlertEnabled: boolean;
  updatedAt: string;
}

export interface LicenseNotificationLog {
  lastMilestone?: '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED' | 'TEST';
  lastSentAt?: string;
  recipientPhone?: string;
  message?: string;
  history?: Array<{
    milestone: string;
    sentAt: string;
    phone: string;
    success: boolean;
    channel?: string;
    error?: string;
  }>;
}

function getTmpDir(): string {
  return process.env.TEMP || process.env.TMP || '/tmp';
}

function getLicenseFilePath(): string {
  return path.join(getTmpDir(), 'ap1_active_license_v3.json');
}

function getNotificationLogPath(): string {
  return path.join(getTmpDir(), 'ap1_license_notifications_v3.json');
}

/**
 * Get active server-persisted license configuration (Cloud Synchronized across all devices)
 */
export async function getActiveLicenseServer(): Promise<StoredServerLicense> {
  // 1. Query Supabase Master Cloud Database for authoritative real-time state
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', SUPABASE_CONFIG_ID)
      .maybeSingle();

    if (!error && data?.content?.[0]?.license?.key) {
      const record: StoredServerLicense = data.content[0];
      // Sync to local tmp cache for fast offline access
      try {
        fs.writeFileSync(getLicenseFilePath(), JSON.stringify(record, null, 2), 'utf-8');
      } catch {}
      return record;
    }
  } catch (err) {
    console.warn('[LicenseServer] Supabase read failed, trying local fallback:', err);
  }

  // 2. Fallback to local file cache
  try {
    const filePath = getLicenseFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.license && parsed.license.expiresAt) {
        return parsed;
      }
    }
  } catch (err) {}

  // 3. Fallback: Default AP1 1-Year license seeded
  const defaultLicense = getDefaultAp1License();
  const defaultRecord: StoredServerLicense = {
    license: defaultLicense,
    alertPhone: process.env.AP1_ADMIN_PHONE || DEFAULT_CLIENT_PHONE,
    autoAlertEnabled: true,
    updatedAt: new Date().toISOString()
  };

  return defaultRecord;
}

/**
 * Save / Update active license on cloud server and local cache
 */
export async function saveActiveLicenseServer(
  license: LicensePayload, 
  alertPhone?: string, 
  autoAlertEnabled: boolean = false
): Promise<StoredServerLicense> {
  const phone = alertPhone?.trim() || DEFAULT_CLIENT_PHONE;
  
  const record: StoredServerLicense = {
    license,
    alertPhone: phone,
    autoAlertEnabled,
    updatedAt: new Date().toISOString()
  };

  // 1. Save to Supabase Cloud Database (Instantly syncs Office PC, Home PC, Mobile)
  try {
    await supabase.from('articles').upsert({
      id: SUPABASE_CONFIG_ID,
      slug: 'goinfi-license-ap1',
      title: 'AP1 Enterprise HRMS Active License',
      category: 'system_config',
      content: [record]
    });
  } catch (err) {
    console.error('[LicenseServer] Supabase save error:', err);
  }

  // 2. Save to local tmp cache
  try {
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LicenseServer] Error saving local license file:', err);
  }

  return record;
}

/**
 * Read notification log
 */
export function getLicenseNotificationLog(): LicenseNotificationLog {
  try {
    const filePath = getNotificationLogPath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {}
  return {};
}

/**
 * Save notification log
 */
export function saveLicenseNotificationLog(log: LicenseNotificationLog) {
  try {
    const filePath = getNotificationLogPath();
    fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LicenseServer] Error saving notification log:', err);
  }
}

export interface ExpiryCheckResult {
  success: boolean;
  dispatched: boolean;
  reason?: string;
  milestone?: '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED' | 'TEST';
  recipientPhone?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  timeRemainingLabel?: string;
  message?: string;
  gatewayResult?: SmsSendResult;
}

/**
 * Core Automation: Checks license expiry and dispatches SMS to client if approaching milestone
 */
export async function checkAndDispatchLicenseExpirySms(options?: {
  force?: boolean;
  recipientPhone?: string;
  isTest?: boolean;
}): Promise<ExpiryCheckResult> {
  const serverLicense = await getActiveLicenseServer();
  const license = serverLicense.license;
  const targetPhone = (options?.recipientPhone || serverLicense.alertPhone || DEFAULT_CLIENT_PHONE).trim();

  const now = Date.now();
  const expiresAt = license.expiresAt;
  const msRemaining = expiresAt - now;
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  let timeRemainingLabel = `${daysRemaining} दिन`;
  if (hoursRemaining <= 24 && hoursRemaining > 0) {
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    timeRemainingLabel = `${hours} घण्टा ${mins} मिनेट`;
  } else if (msRemaining <= 0) {
    timeRemainingLabel = 'म्याद समाप्त (Expired)';
  }

  const expiryDate = new Date(expiresAt).toLocaleDateString('ne-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ` (${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

  let milestone: '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED' | 'TEST' | null = null;

  if (options?.isTest) {
    milestone = 'TEST';
  } else if (msRemaining <= 0) {
    milestone = 'EXPIRED';
  } else if (hoursRemaining <= 24) {
    milestone = '1_DAY';
  } else if (daysRemaining <= 3) {
    milestone = '3_DAYS';
  } else if (daysRemaining <= 7) {
    milestone = '7_DAYS';
  }

  // Strictly prevent SMS if autoAlertEnabled is false (prevents automated SMS spam)
  if (!serverLicense.autoAlertEnabled && !options?.isTest) {
    return {
      success: true,
      dispatched: false,
      reason: 'Auto SMS alerts are disabled in license configuration.',
      daysRemaining,
      hoursRemaining,
      timeRemainingLabel
    };
  }

  // If not near any warning threshold
  if (!milestone) {
    return {
      success: true,
      dispatched: false,
      reason: `License is active with ${daysRemaining} days remaining. Alert threshold is <= 7 days.`,
      daysRemaining,
      hoursRemaining,
      timeRemainingLabel
    };
  }

  // Check if already sent today for this milestone (avoid multiple SMS spam)
  const log = getLicenseNotificationLog();
  if (!options?.force && !options?.isTest && log.lastMilestone === milestone && log.lastSentAt) {
    const lastSentTime = new Date(log.lastSentAt).getTime();
    const hoursSinceLastSent = (now - lastSentTime) / (1000 * 60 * 60);
    // Only send once per 20 hours for the same milestone
    if (hoursSinceLastSent < 20) {
      return {
        success: true,
        dispatched: false,
        reason: `SMS for milestone ${milestone} was already dispatched ${Math.round(hoursSinceLastSent)}h ago.`,
        milestone,
        daysRemaining,
        hoursRemaining,
        timeRemainingLabel
      };
    }
  }

  // Format the SMS
  const clientName = license.clientName || 'AP1 Television Network';
  const smsBody = formatLicenseExpirySmsMessage(clientName, timeRemainingLabel, expiryDate, milestone);

  // Dispatch SMS
  const smsResult = await sendGoinfiSms(targetPhone, smsBody);

  // Record history
  const historyItem = {
    milestone,
    sentAt: new Date().toISOString(),
    phone: targetPhone,
    success: smsResult.success,
    channel: smsResult.channel,
    error: smsResult.error
  };

  const updatedHistory = [historyItem, ...(log.history || [])].slice(0, 20);

  saveLicenseNotificationLog({
    lastMilestone: milestone,
    lastSentAt: new Date().toISOString(),
    recipientPhone: targetPhone,
    message: smsBody,
    history: updatedHistory
  });

  return {
    success: smsResult.success,
    dispatched: true,
    milestone,
    recipientPhone: targetPhone,
    daysRemaining,
    hoursRemaining,
    timeRemainingLabel,
    message: smsBody,
    gatewayResult: smsResult
  };
}
