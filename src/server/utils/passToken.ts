import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'turfbd_super_secure_jwt_secret_key_2026';

/**
 * Generates a minimal, cryptographically signed reference QR payload for a booking.
 * Contains only the minimum reference data: booking code, booking ID, and HMAC signature.
 */
export function generateMatchPassToken(booking: { id: number; bookingCode: string; turfId: number }): {
  qrPayload: string;
  signature: string;
} {
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${booking.id}:${booking.bookingCode}:${booking.turfId}`);
  const signature = hmac.digest('hex').substring(0, 12); // compact 12-char sig

  const payload = JSON.stringify({
    c: booking.bookingCode,
    id: booking.id,
    s: signature,
  });

  return {
    qrPayload: payload,
    signature,
  };
}

/**
 * Parses user input which may be:
 * - Direct booking code string (e.g. "TBD-7492")
 * - Formatted string (e.g. "TURFBD:PASS:TBD-7492:45")
 * - JSON string from QR scanner (e.g. '{"c":"TBD-7492","id":45,"s":"..."}')
 */
export function parseMatchPassInput(rawInput: string): {
  bookingCode: string;
  bookingId?: number;
  providedSignature?: string;
} {
  const trimmed = (rawInput || '').trim();

  // Try parsing JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const bookingCode = (parsed.c || parsed.code || parsed.bookingCode || '').trim();
      const bookingId = parsed.id || parsed.ref || parsed.bookingId ? Number(parsed.id || parsed.ref || parsed.bookingId) : undefined;
      const providedSignature = parsed.s || parsed.sig || parsed.signature;
      if (bookingCode) {
        return { bookingCode, bookingId, providedSignature };
      }
    } catch {
      // Continue to next parsers
    }
  }

  // Try parsing TURFBD:PASS: format
  if (trimmed.startsWith('TURFBD:PASS:')) {
    const parts = trimmed.split(':');
    const bookingCode = parts[2] || '';
    const bookingId = parts[3] ? Number(parts[3]) : undefined;
    const providedSignature = parts[4] || undefined;
    return { bookingCode, bookingId, providedSignature };
  }

  // Pure booking code (e.g. "TBD-7492" or "7492")
  let cleanCode = trimmed.toUpperCase().replace(/\s+/g, '');
  if (!cleanCode.startsWith('TBD-') && /^[2-9A-HJ-NP-Z]{4}$/.test(cleanCode)) {
    cleanCode = `TBD-${cleanCode}`;
  }

  return {
    bookingCode: cleanCode,
  };
}
