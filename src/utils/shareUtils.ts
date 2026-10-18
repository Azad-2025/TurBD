import { Booking } from '../types';

export interface SquadShareData {
  whatsappUrl: string;
  googleCalendarUrl: string;
  icsContent: string;
  shareText: string;
  mapsUrl: string;
}

export function generateSquadShareData(booking: Booking): SquadShareData {
  const sportEmoji = booking.sport === 'cricket' ? '🏏' : '⚽';
  const mapsQuery = encodeURIComponent(`${booking.turfName}, ${booking.turfArea}, ${booking.turfCity}, Bangladesh`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const shareText = 
`${sportEmoji} *MATCH PASS: ${booking.turfName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${booking.date}
⏰ *Time:* ${booking.startTime} - ${booking.endTime} (${booking.durationHours || 1} Hour)
📍 *Venue:* ${booking.turfArea}, ${booking.turfCity}
🗺️ *Map:* ${mapsUrl}

🎟️ *Booking Pass Code:* ${booking.bookingCode}
💰 *Total Fee:* BDT ${booking.totalAmount.toLocaleString()}
✅ *Advance Paid:* BDT ${booking.advancePaid.toLocaleString()}
💵 *Due on Arrival:* BDT ${booking.dueAmount.toLocaleString()}

*Captain:* ${booking.userName} (${booking.userPhone})
Verified via TurfBD (turfbd.com)
━━━━━━━━━━━━━━━━━━━━
Please arrive 15 minutes before kickoff!`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  // Parse start and end timestamps for Google Calendar
  // Format: YYYYMMDDTHHmmssZ or local
  const cleanDate = booking.date.replace(/-/g, '');
  const cleanStart = booking.startTime.replace(/:/g, '').padEnd(4, '0') + '00';
  const cleanEnd = booking.endTime.replace(/:/g, '').padEnd(4, '0') + '00';
  const startParam = `${cleanDate}T${cleanStart}`;
  const endParam = `${cleanDate}T${cleanEnd}`;

  const calTitle = encodeURIComponent(`${sportEmoji} Match @ ${booking.turfName}`);
  const calDetails = encodeURIComponent(
    `Match Slot: ${booking.startTime} - ${booking.endTime}\n` +
    `Pass Code: ${booking.bookingCode}\n` +
    `Due on Arrival: BDT ${booking.dueAmount}\n` +
    `Map: ${mapsUrl}\n` +
    `Booked via TurfBD`
  );
  const calLocation = encodeURIComponent(`${booking.turfName}, ${booking.turfArea}, ${booking.turfCity}`);

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${startParam}/${endParam}&details=${calDetails}&location=${calLocation}`;

  // Generate .ICS file content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurfBD//Sports Arena Pass//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:turfbd-${booking.bookingCode}-${Date.now()}@turfbd.com`,
    `DTSTAMP:${cleanDate}T000000Z`,
    `DTSTART:${startParam}`,
    `DTEND:${endParam}`,
    `SUMMARY:${sportEmoji} Match at ${booking.turfName}`,
    `DESCRIPTION:Pass Code: ${booking.bookingCode}\\nDue on Arrival: BDT ${booking.dueAmount}\\nBooked via TurfBD`,
    `LOCATION:${booking.turfName}\\, ${booking.turfArea}\\, ${booking.turfCity}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    whatsappUrl,
    googleCalendarUrl,
    icsContent,
    shareText,
    mapsUrl,
  };
}

export function downloadIcsFile(booking: Booking, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `Match-${booking.bookingCode}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
