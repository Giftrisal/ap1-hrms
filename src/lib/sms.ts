/**
 * Goinfi SMS & WhatsApp Notification Service
 * Supports Twozero SMS Gateway, Sparrow SMS, Meta WhatsApp Cloud API, and resilient fallbacks.
 */

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isMock?: boolean;
  channel?: 'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'DEV_MOCK';
  devOtp?: string;
  whatsappLink?: string;
  telegramNotified?: boolean;
}

export function normalizePhoneNumber(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('977') && digits.length === 13) {
    return digits.substring(3);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.substring(1);
  }
  return digits;
}

/**
 * Send alert / OTP notification to Goinfi Telegram bot for instant monitoring
 */
async function notifyTelegramBot(cleanPhone: string, message: string, otpCode?: string): Promise<boolean> {
  // Only send to Telegram bot if explicitly enabled in environment variables for admin monitoring
  if (process.env.TELEGRAM_MONITORING !== 'true') return false;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return false;

  try {
    const text = `🔔 *[Goinfi HRMS SMS Service]*\n📱 Mobile: \`+977-${cleanPhone}\`\n${otpCode ? `🔑 *OTP CODE: \`${otpCode}\`*\n` : ''}📝 Message:\n_${message}_`;
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    });
    return tgRes.ok;
  } catch (err) {
    return false;
  }
}

export interface SmsGatewayConfig {
  provider?: 'sparrow' | 'twozero' | 'aakash' | 'custom' | 'auto';
  apiKey?: string;
  senderId?: string;
  apiUrl?: string;
}

/**
 * Dispatch SMS message via Goinfi SMS Gateway
 */
export async function sendGoinfiSms(
  rawPhone: string, 
  message: string, 
  otpCode?: string,
  gatewayConfig?: SmsGatewayConfig
): Promise<SmsSendResult> {
  const cleanPhone = normalizePhoneNumber(rawPhone);
  
  if (!cleanPhone || cleanPhone.length < 9) {
    return {
      success: false,
      error: 'Please enter a valid 10-digit mobile phone number.'
    };
  }

  // Pre-generate WhatsApp direct link
  const intlPhone = cleanPhone.startsWith('977') ? cleanPhone : `977${cleanPhone}`;
  const whatsappLink = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;

  // Dispatch background notification to Goinfi Telegram bot so admin/monitoring never misses it
  notifyTelegramBot(cleanPhone, message, otpCode).catch(() => {});

  const requestedProvider = gatewayConfig?.provider || 'auto';

  // 1. Try Twozero SMS Gateway if configured or specified
  const twozeroKey = (requestedProvider === 'twozero' || requestedProvider === 'auto')
    ? (gatewayConfig?.apiKey || process.env.TWOZERO_SMS_API_KEY || process.env.TWOZERO_SMS_TOKEN || 'sk_Fc6uqsPMOcEhunlMg4DKPW675opkXhAgqZ0KmQZZlA2chwPt2x13DVhfyzlO')
    : undefined;
  const twozeroUrl = gatewayConfig?.apiUrl || process.env.TWOZERO_SMS_URL || 'https://sms.twozero.io/api/v1/sms/send';

  if (twozeroKey) {
    try {
      const res = await fetch(twozeroUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': twozeroKey,
          'Authorization': `Bearer ${twozeroKey}`,
          'api-token': twozeroKey,
        },
        body: JSON.stringify({
          to: cleanPhone.length === 10 ? cleanPhone : (cleanPhone.startsWith('977') ? cleanPhone.substring(3) : cleanPhone),
          message,
          sender_id: gatewayConfig?.senderId || process.env.TWOZERO_SMS_SENDER_ID || 'GOINFI',
        }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && (data?.status === 'success' || data?.success || data?.data?.status === 'sent' || data?.data?.message_id)) {
        return {
          success: true,
          messageId: data?.data?.message_id || data?.id || `twozero-${Date.now()}`,
          channel: 'SMS',
          whatsappLink,
          devOtp: otpCode
        };
      } else {
        const errorMsg = data?.message || data?.error || (res.statusText ? `Twozero HTTP ${res.status}: ${res.statusText}` : 'Twozero SMS gateway rejected dispatch');
        if (requestedProvider === 'twozero') {
          return { success: false, error: errorMsg, channel: 'SMS', whatsappLink };
        }
      }
    } catch (err: any) {
      console.warn('[Goinfi SMS] Twozero dispatch warning:', err?.message);
      if (requestedProvider === 'twozero') {
        return { success: false, error: `Twozero Gateway connection failed: ${err?.message}`, channel: 'SMS', whatsappLink };
      }
    }
  }

  // 2. Try Sparrow SMS Gateway if configured or specified
  const sparrowToken = (requestedProvider === 'sparrow' || requestedProvider === 'auto')
    ? (gatewayConfig?.apiKey || process.env.SPARROW_SMS_TOKEN)
    : undefined;

  if (sparrowToken) {
    try {
      const from = gatewayConfig?.senderId || process.env.SPARROW_FROM || 'Goinfi';
      const url = `http://api.sparrowsms.com/v2/sms/?token=${encodeURIComponent(sparrowToken)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(message)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json().catch(() => null);
      if (res.ok && (data?.response_code === 200 || data?.status === 'success')) {
        return {
          success: true,
          messageId: `sparrow-${Date.now()}`,
          channel: 'SMS',
          whatsappLink,
          devOtp: otpCode
        };
      } else {
        const errorMsg = data?.response || data?.message || `Sparrow SMS error (Code: ${data?.response_code || res.status})`;
        if (requestedProvider === 'sparrow') {
          return { success: false, error: errorMsg, channel: 'SMS', whatsappLink };
        }
      }
    } catch (err: any) {
      console.warn('[Goinfi SMS] Sparrow SMS dispatch warning:', err?.message);
      if (requestedProvider === 'sparrow') {
        return { success: false, error: `Sparrow SMS connection failed: ${err?.message}`, channel: 'SMS', whatsappLink };
      }
    }
  }

  // 3. Try Aakash SMS Gateway if configured
  const aakashToken = (requestedProvider === 'aakash')
    ? (gatewayConfig?.apiKey || process.env.AAKASH_SMS_TOKEN)
    : undefined;

  if (aakashToken) {
    try {
      const res = await fetch('https://aakashsms.com/admin/public/sms/v3/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: aakashToken,
          to: cleanPhone,
          text: message
        }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await res.json().catch(() => null);
      if (res.ok && (data?.error === false || data?.status === 'success')) {
        return {
          success: true,
          messageId: `aakash-${Date.now()}`,
          channel: 'SMS',
          whatsappLink,
          devOtp: otpCode
        };
      } else {
        return { success: false, error: data?.message || 'Aakash SMS rejected the request', channel: 'SMS', whatsappLink };
      }
    } catch (err: any) {
      return { success: false, error: `Aakash SMS error: ${err?.message}`, channel: 'SMS', whatsappLink };
    }
  }

  // 4. Try Meta WhatsApp Cloud API if configured
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (waPhoneId && waToken) {
    try {
      const waUrl = `https://graph.facebook.com/v19.0/${waPhoneId}/messages`;
      const res = await fetch(waUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: intlPhone,
          type: 'text',
          text: { body: message },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        return {
          success: true,
          messageId: `wa-${Date.now()}`,
          channel: 'WHATSAPP',
          whatsappLink,
          devOtp: otpCode
        };
      }
    } catch (err: any) {
      console.warn('[Goinfi SMS] WhatsApp dispatch warning:', err?.message);
    }
  }

  // 5. Fallback Mode:
  // If otpCode is requested (Staff signup/reset), log and return success so staff registration flow is smooth.
  if (otpCode) {
    console.info(`\n======================================================`);
    console.info(`📨 [GOINFI SMS GATEWAY OTP DISPATCH]`);
    console.info(`📱 Mobile: +977-${cleanPhone}`);
    console.info(`🔑 OTP CODE: ${otpCode}`);
    console.info(`📝 Text: "${message}"`);
    console.info(`======================================================\n`);

    return {
      success: true,
      messageId: `sim-sms-${Date.now()}`,
      isMock: true,
      channel: 'DEV_MOCK',
      devOtp: otpCode,
      whatsappLink
    };
  }

  // If this is a real staff broadcast/notice and no gateway credentials were provided:
  return {
    success: false,
    error: 'Telecom SMS Gateway API Token is not configured. Physical SMS cannot reach SIM cards without an active Sparrow SMS or Twozero API token. Please configure your API key in Gateway Settings or click "Send via WhatsApp".',
    isMock: true,
    channel: 'DEV_MOCK',
    whatsappLink
  };
}

export function formatOtpMessage(otp: string, type: 'signup' | 'reset', staffName?: string): string {
  const name = staffName || 'Staff';
  if (type === 'signup') {
    return `Dear ${name}, Your Ap1 staff portal registration OTP code is ${otp}. Valid for 5 minutes. Do not share with anyone. AP1 Television.`;
  }
  return `Dear ${name}, Your Ap1 staff portal password reset OTP code is ${otp}. Valid for 5 minutes. Do not share with anyone. AP1 Television.`;
}

/**
 * Format Monthly Invoice Message for AP1 Television
 */
export function formatMonthlyBillMessage(nepaliMonth: string, nepaliYear: number, billNumber: string): string {
  return `[Goinfi Technologies] AP1 Television: Monthly HRMS cloud platform and biometric service invoice (${billNumber}) for ${nepaliMonth} ${nepaliYear} is ready. Contact: support@goinfi.biz. Thank you!`;
}

/**
 * Format License Expiry Alert SMS Message for Client
 */
export function formatLicenseExpirySmsMessage(
  clientName: string,
  timeRemainingLabel: string,
  expiryDateStr: string,
  milestone: '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED' | 'TEST'
): string {
  const contact = '+977-9715300300';
  if (milestone === 'EXPIRED') {
    return `[Goinfi Labs] आदरणीय ${clientName}, तपाईंको HRMS सफ्टवेयर इजाजतपत्र (License Key) को म्याद समाप्त भएको छ र सेवा रोकिएको छ। नयाँ Key प्राप्त गरी सेवा पुनः सुचारु गर्न तुरुन्त सम्पर्क गर्नुहोस्: ${contact}।`;
  }
  if (milestone === '1_DAY') {
    return `🚨 [अन्तिम सूचना] आदरणीय ${clientName}, तपाईंको HRMS सफ्टवेयर इजाजतपत्र भोलि (${expiryDateStr}) समाप्त हुँदैछ! बाँकी समय: ${timeRemainingLabel}। सेवा अवरुद्ध हुन नदिन कृपया तुरुन्त नवीकरण गर्नुहोस्। Goinfi Labs: ${contact}`;
  }
  if (milestone === '3_DAYS') {
    return `⏰ [महत्वपूर्ण सूचना] आदरणीय ${clientName}, तपाईंको HRMS सफ्टवेयर इजाजतपत्रको म्याद ३ दिनमा (${expiryDateStr}) समाप्त हुँदैछ। सेवा निरन्तरताका लागि कृपया समयमै नवीकरण गर्नुहोस्। Goinfi Labs: ${contact}`;
  }
  if (milestone === '7_DAYS') {
    return `⚠️ [चेतावनी] आदरणीय ${clientName}, तपाईंको HRMS सफ्टवेयर इजाजतपत्रको म्याद ७ दिन बाँकी छ (${expiryDateStr})। कृपया नवीकरण प्रक्रिया अघि बढाउनुहोस्। Goinfi Labs: ${contact}`;
  }
  return `[Goinfi Labs] आदरणीय ${clientName}, यो तपाईंको HRMS इजाजतपत्र (License) सूचना परीक्षण सन्देश हो। म्याद: ${expiryDateStr} (बाँकी: ${timeRemainingLabel})। सोधपुछ: ${contact}।`;
}
