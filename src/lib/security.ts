import crypto from 'crypto';
import { NextRequest } from 'next/server';

const SECURITY_SECRET = process.env.APP_SECRET || process.env.BIOMETRIC_API_SECRET || 'ap1_hrms_super_secure_vault_key_2026_goinfi';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  failedAttempts: number;
  lockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt && (!entry.lockedUntil || now > entry.lockedUntil)) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Checks rate limits for sensitive operations (e.g. sending OTP, login attempts)
 */
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 10 * 60 * 1000): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
      failedAttempts: 0
    });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    entry.lockedUntil = now + windowMs;
    return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Creates a cryptographically signed OTP verification token.
 * Note: The OTP code is NEVER included in the returned token!
 */
export function createSignedOtpToken(
  data: { phone?: string; pin?: string; identifier?: string; isMaster?: boolean },
  otpCode: string,
  ttlSeconds = 300
): string {
  const exp = Date.now() + ttlSeconds * 1000;
  const targetId = (data.phone || data.pin || data.identifier || '').trim().toLowerCase();
  
  const hmac = crypto.createHmac('sha256', SECURITY_SECRET);
  hmac.update(`${targetId}:${otpCode}:${exp}`);
  const sig = hmac.digest('hex');

  const payload = {
    ...data,
    targetId,
    exp,
    sig
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verifies a signed OTP verification token without revealing the code.
 */
export function verifySignedOtpToken(
  token: string,
  inputOtp: string
): { valid: boolean; payload?: any; error?: string } {
  try {
    if (!token || !inputOtp) {
      return { valid: false, error: 'Token and OTP code are required' };
    }

    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const { targetId, exp, sig } = decoded;

    if (!targetId || !exp || !sig) {
      return { valid: false, error: 'Malformed verification token' };
    }

    if (Date.now() > exp) {
      return { valid: false, error: 'OTP code has expired. Please request a new one.' };
    }

    const hmac = crypto.createHmac('sha256', SECURITY_SECRET);
    hmac.update(`${targetId}:${inputOtp.trim()}:${exp}`);
    const expectedSig = hmac.digest('hex');

    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Incorrect or invalid OTP code.' };
    }

    return { valid: true, payload: decoded };
  } catch (err) {
    return { valid: false, error: 'Invalid verification token' };
  }
}

/**
 * Validates admin request authorization via secret header or admin token
 */
export function isAuthorizedAdmin(req: NextRequest): boolean {
  const secretHeader = req.headers.get('x-admin-key') || req.headers.get('x-biometric-secret');
  const expectedSecret = process.env.BIOMETRIC_API_SECRET || 'goinfi_secure_zk_secret_2026';
  
  if (secretHeader && secretHeader === expectedSecret) {
    return true;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === expectedSecret) return true;
  }

  return false;
}
