import crypto from 'crypto';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  provider: 'greenweb' | 'sslwireless' | 'twilio' | 'simulator';
  simulated?: boolean;
  error?: string;
}

/**
 * Validates and normalizes a Bangladeshi phone number into standard formats.
 * Accepts: "+8801711234567", "01711234567", "8801711-234567", etc.
 */
export function normalizeBdPhoneNumber(rawPhone: string): {
  isValid: boolean;
  formattedInternational: string; // +88017XXXXXXXX
  formattedLocal: string;         // 017XXXXXXXX
  rawDigits: string;             // 88017XXXXXXXX
  operator?: string;
} {
  const digits = rawPhone.replace(/\D/g, '');

  let local = '';
  if (digits.startsWith('8801') && digits.length === 13) {
    local = '0' + digits.slice(3);
  } else if (digits.startsWith('01') && digits.length === 11) {
    local = digits;
  } else if (digits.startsWith('1') && digits.length === 10) {
    local = '0' + digits;
  }

  // BD mobile numbers must be 11 digits starting with 01[3-9]
  const isValid = /^01[3-9]\d{8}$/.test(local);

  let operator = undefined;
  if (isValid) {
    const prefix = local.substring(0, 3);
    if (prefix === '017' || prefix === '013') operator = 'Grameenphone';
    else if (prefix === '018') operator = 'Robi';
    else if (prefix === '016') operator = 'Airtel';
    else if (prefix === '019' || prefix === '014') operator = 'Banglalink';
    else if (prefix === '015') operator = 'Teletalk';
  }

  const rawDigits = local ? '88' + local : digits;
  const formattedInternational = local ? '+88' + local : '+' + digits;

  return {
    isValid,
    formattedInternational,
    formattedLocal: local,
    rawDigits,
    operator,
  };
}

/**
 * Sends an SMS through configured production gateways (Greenweb BD, SSL Wireless, Twilio)
 * or falls back to a development simulator.
 */
export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const phoneInfo = normalizeBdPhoneNumber(to);
  if (!phoneInfo.isValid) {
    return {
      success: false,
      provider: 'simulator',
      error: 'Invalid Bangladesh phone number. Must be 11 digits (e.g., 017XXXXXXXX).',
    };
  }

  // Check Provider Configuration
  const greenwebToken = process.env.GREENWEB_TOKEN;
  const sslToken = process.env.SSL_WIRELESS_API_TOKEN;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  // 1. Greenweb BD SMS Gateway
  if (greenwebToken && greenwebToken.trim() !== '') {
    try {
      const url = new URL('https://api.greenweb.com.bd/api.php');
      url.searchParams.set('token', greenwebToken);
      url.searchParams.set('to', phoneInfo.formattedLocal);
      url.searchParams.set('message', message);

      const response = await fetch(url.toString(), { method: 'GET' });
      const text = await response.text();

      if (response.ok && (text.includes('Ok') || text.includes('success') || text.includes('100'))) {
        return {
          success: true,
          provider: 'greenweb',
          messageId: `gw_${Date.now()}`,
        };
      }
      console.warn('[Greenweb BD] Response:', text);
    } catch (err: any) {
      console.error('[Greenweb BD Gateway Error]:', err.message);
    }
  }

  // 2. SSL Wireless SMS Gateway
  if (sslToken && sslToken.trim() !== '') {
    try {
      const sid = process.env.SSL_WIRELESS_SID || 'TURFBD';
      const domain = process.env.SSL_WIRELESS_DOMAIN || 'https://smsplus.sslwireless.com';
      const response = await fetch(`${domain}/api/v3/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sslToken}`,
        },
        body: JSON.stringify({
          api_token: sslToken,
          sid: sid,
          msisdn: phoneInfo.rawDigits,
          sms: message,
          csms_id: `tbd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        }),
      });
      const data = await response.json();
      if (response.ok && (data.status === 'SUCCESS' || data.status_code === 200)) {
        return {
          success: true,
          provider: 'sslwireless',
          messageId: data.smsinfo?.[0]?.sms_id || `ssl_${Date.now()}`,
        };
      }
      console.warn('[SSL Wireless SMS] Response:', data);
    } catch (err: any) {
      console.error('[SSL Wireless Gateway Error]:', err.message);
    }
  }

  // 3. Twilio SMS Gateway
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', phoneInfo.formattedInternational);
      params.append('From', twilioFrom);
      params.append('Body', message);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const data = await response.json();
      if (response.ok && data.sid) {
        return {
          success: true,
          provider: 'twilio',
          messageId: data.sid,
        };
      }
      console.warn('[Twilio SMS] Response:', data);
    } catch (err: any) {
      console.error('[Twilio Gateway Error]:', err.message);
    }
  }

  // 4. Production SMS Provider Check
  // In production, never leak plaintext OTP to server logs when gateway is unconfigured
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      provider: 'simulator',
      error: 'SMS_GATEWAY_NOT_CONFIGURED',
    };
  }

  // Development / Local Test Simulator only:
  // When external API keys are unconfigured, simulate delivery for automated testing
  console.log(`\n======================================================`);
  console.log(`📱 [TURFBD SMS GATEWAY SIMULATOR - DEV/TEST ONLY]`);
  console.log(`To: ${phoneInfo.formattedInternational} (${phoneInfo.operator || 'Bangladesh'})`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Status: DELIVERED (Simulated for Local Development & Testing)`);
  console.log(`======================================================\n`);

  return {
    success: true,
    provider: 'simulator',
    simulated: true,
    messageId: `sim_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
  };
}

/**
 * Check if a real production SMS provider is configured
 */
export function hasSmsProviderConfigured(): boolean {
  const greenwebToken = process.env.GREENWEB_TOKEN || process.env.GREENWEB_SMS_API_TOKEN;
  const sslToken = process.env.SSL_WIRELESS_API_TOKEN;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_PHONE;

  return Boolean(
    (greenwebToken && greenwebToken.trim() !== '') ||
    (sslToken && sslToken.trim() !== '') ||
    (twilioSid && twilioToken && twilioFrom)
  );
}

/**
 * Sends a standard 6-digit OTP verification message.
 */
export async function sendOtpSms(to: string, otpCode: string): Promise<SendSmsResult> {
  const message = `Your TurfBD verification code is ${otpCode}. Valid for 5 minutes. Do NOT share this code with anyone.`;
  return sendSms(to, message);
}
