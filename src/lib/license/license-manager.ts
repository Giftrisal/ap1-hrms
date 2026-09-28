import crypto from 'crypto';

export type LicenseTier = '1_DAY' | '1_WEEK' | '1_MONTH' | '6_MONTHS' | '1_YEAR' | '2_YEARS' | '5_YEARS';

export interface LicenseTierInfo {
  tier: LicenseTier;
  code: string;
  label: string;
  labelNp: string;
  days: number;
}

export const LICENSE_TIERS: Record<LicenseTier, LicenseTierInfo> = {
  '1_DAY': {
    tier: '1_DAY',
    code: '1D',
    label: '1 Day Trial (परीक्षण)',
    labelNp: '१ दिन परीक्षण',
    days: 1
  },
  '1_WEEK': {
    tier: '1_WEEK',
    code: '1W',
    label: '1 Week Demo (१ हप्ता)',
    labelNp: '१ हप्ता परीक्षण',
    days: 7
  },
  '1_MONTH': {
    tier: '1_MONTH',
    code: '1M',
    label: '1 Month (मासिक)',
    labelNp: '१ महिना सदस्यता',
    days: 30
  },
  '6_MONTHS': {
    tier: '6_MONTHS',
    code: '6M',
    label: '6 Months Semi-Annual (६ महिना)',
    labelNp: '६ महिना अर्ध-वार्षिक',
    days: 180
  },
  '1_YEAR': {
    tier: '1_YEAR',
    code: '1Y',
    label: '1 Year Annual (वार्षिक)',
    labelNp: '१ वर्ष वार्षिक',
    days: 365
  },
  '2_YEARS': {
    tier: '2_YEARS',
    code: '2Y',
    label: '2 Years Enterprise (२ वर्षे)',
    labelNp: '२ वर्ष इन्टरप्राइज',
    days: 730
  },
  '5_YEARS': {
    tier: '5_YEARS',
    code: '5Y',
    label: '5 Years Long-Term (५ वर्षे)',
    labelNp: '५ वर्ष दीर्घकालीन',
    days: 1825
  }
};

export interface LicensePayload {
  key: string;
  clientCode: string;
  clientName: string;
  tier: LicenseTier;
  issuedAt: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms
  features: string[];
}

export interface LicenseStatus {
  isValid: boolean;
  isExpired: boolean;
  isWarning: boolean; // <= 15 days
  tier: LicenseTier;
  tierLabel: string;
  tierLabelNp: string;
  clientName: string;
  clientCode: string;
  issuedAt: string;
  expiresAt: string;
  daysRemaining: number;
  key: string;
}

// Master secret salt for Goinfi License Key HMAC generation & validation
const MASTER_LICENSE_SECRET = process.env.LICENSE_MASTER_SECRET || 'GOINFI_ENTERPRISE_HRMS_LICENSE_SALT_2026_AP1';

/**
 * Generate a cryptographically signed Goinfi License Key.
 * Format: GFHR-<CLIENT>-<TIER>-<ISSUED_HEX>-<SIG1>-<SIG2>-<SIG3>
 * Example: GFHR-AP1-1Y-CD88-7691-EF57-92A2
 */
export function generateLicenseKey(
  clientCode: string = 'AP1',
  clientName: string = 'AP1 Television Network',
  tier: LicenseTier = '1_YEAR'
): { key: string; payload: LicensePayload } {
  const tierInfo = LICENSE_TIERS[tier] || LICENSE_TIERS['1_YEAR'];
  const sanitizedClient = clientCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'AP1';
  const now = Date.now();
  const expiresAt = now + tierInfo.days * 24 * 60 * 60 * 1000;
  
  // Compact 4-character issued hex anchor
  const issuedSec = Math.floor(now / 1000);
  const issuedHex = (issuedSec & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  
  // Cryptographic HMAC-SHA256 signature
  const rawData = `${sanitizedClient}|${tierInfo.code}|${issuedHex}|${tierInfo.days}`;
  const hmac = crypto.createHmac('sha256', MASTER_LICENSE_SECRET).update(rawData).digest('hex').toUpperCase();
  
  // 3 blocks of 4 hex chars = 12 chars (48 bits of HMAC entropy)
  const sig1 = hmac.slice(0, 4);
  const sig2 = hmac.slice(4, 8);
  const sig3 = hmac.slice(8, 12);
  
  const key = `GFHR-${sanitizedClient}-${tierInfo.code}-${issuedHex}-${sig1}-${sig2}-${sig3}`;
  
  const payload: LicensePayload = {
    key,
    clientCode: sanitizedClient,
    clientName,
    tier,
    issuedAt: now,
    expiresAt,
    features: ['all_hrms_modules', 'biometric_sync', 'staff_portal', 'payroll', 'reports']
  };

  return { key, payload };
}

/**
 * Verify and decode a Goinfi License Key.
 */
export function verifyLicenseKey(
  licenseKey: string
): { valid: boolean; error?: string; payload?: LicensePayload } {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, error: 'लाइसेन्स की खाली हुन सक्दैन (License key cannot be empty)' };
  }

  const cleanKey = licenseKey.trim().toUpperCase();
  const parts = cleanKey.split('-');

  // Format: GFHR-CLIENT-TIER-ISSUEDHEX-SIG1-SIG2-SIG3 (7 parts)
  if (parts.length !== 7 || parts[0] !== 'GFHR') {
    return { valid: false, error: 'अमान्य लाइसेन्स ढाँचा (Invalid license key structure. Expected GFHR-CLIENT-TIER-XXXX-XXXX-XXXX-XXXX)' };
  }

  const [_, clientCode, tierCode, issuedHex, s1, s2, s3] = parts;
  
  // Find tier by code
  const tierEntry = Object.values(LICENSE_TIERS).find(t => t.code === tierCode);
  if (!tierEntry) {
    return { valid: false, error: 'अमान्य लाइसेन्स अवधि कोड (Invalid tier duration code)' };
  }

  // Validate HMAC-SHA256
  const rawData = `${clientCode}|${tierCode}|${issuedHex}|${tierEntry.days}`;
  const expectedHmac = crypto.createHmac('sha256', MASTER_LICENSE_SECRET).update(rawData).digest('hex').toUpperCase();
  const providedSig = (s1 + s2 + s3).toUpperCase();

  if (!expectedHmac.startsWith(providedSig)) {
    return { valid: false, error: 'लाइसेन्स की प्रमाणीकरण असफल भयो (Invalid signature or forged license key)' };
  }

  const now = Date.now();
  const issuedAt = now;
  const expiresAt = now + tierEntry.days * 24 * 60 * 60 * 1000;

  const payload: LicensePayload = {
    key: cleanKey,
    clientCode,
    clientName: clientCode === 'AP1' ? 'AP1 Television Network' : `${clientCode} Enterprise`,
    tier: tierEntry.tier,
    issuedAt,
    expiresAt,
    features: ['all_hrms_modules', 'biometric_sync', 'staff_portal', 'payroll', 'reports']
  };

  return { valid: true, payload };
}

/**
 * Standard default seeded 1-Year license for AP1
 */
export function getDefaultAp1License(): LicensePayload {
  const gen = generateLicenseKey('AP1', 'AP1 Television Network', '1_YEAR');
  return gen.payload;
}
