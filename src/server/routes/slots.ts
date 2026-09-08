import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { slots, bookings, turfs } from '../../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { requireOwner } from '../middleware/auth.ts';

const router = Router();

// Standard hourly slot generator helper (06:00 to 01:00)
const DEFAULT_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'
];

// GET /api/slots?turfId=1&date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const turfId = Number(req.query.turfId);
    const date = String(req.query.date || new Date().toISOString().split('T')[0]);

    if (!turfId) {
      return res.status(400).json({ error: 'turfId query param is required' });
    }

    // Query explicit slot records from database
    const existingSlots = await db
      .select()
      .from(slots)
      .where(and(eq(slots.turfId, turfId), eq(slots.date, date)));

    // Also query confirmed/pending bookings for this turf and date
    const dateBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.turfId, turfId), eq(bookings.bookingDate, date)));

    const bookedTimes = new Set<string>();
    dateBookings
      .filter((b) => b.bookingStatus !== 'cancelled')
      .forEach((b) => {
        bookedTimes.add(b.startTime);
        DEFAULT_TIMES.forEach((t) => {
          if (b.endTime && b.endTime > b.startTime && t >= b.startTime && t < b.endTime) {
            bookedTimes.add(t);
          }
        });
      });

    // Map slot list with real-time status
    const slotMap = new Map<string, any>();
    existingSlots.forEach((s) => slotMap.set(s.startTime, s));

    const resultSlots = DEFAULT_TIMES.map((time) => {
      const explicit = slotMap.get(time);
      let status = 'available';

      if (bookedTimes.has(time)) {
        status = 'booked';
      } else if (explicit) {
        status = explicit.status;
      }

      return {
        id: explicit?.id || null,
        turfId,
        date,
        startTime: time,
        endTime: `${(parseInt(time.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`,
        status,
      };
    });

    return res.json(resultSlots);
  } catch (error: any) {
    console.error('Failed to get slots:', error);
    return res.status(500).json({ error: 'Failed to retrieve slots' });
  }
});

// POST /api/slots/toggle-block - Block or unblock a slot for maintenance (Owner manages own turf only)
router.post('/toggle-block', requireOwner, async (req: Request, res: Response) => {
  try {
    const { turfId, date, startTime, endTime } = req.body;

    if (!turfId || !date || !startTime) {
      return res.status(400).json({ error: 'turfId, date, and startTime are required' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, Number(turfId)));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    // Owner rule: Manage own turf only
    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only block slots on your own turf' });
    }

    const calculatedEndTime = endTime || `${(parseInt(startTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;

    // Check if slot row already exists
    const [existing] = await db
      .select()
      .from(slots)
      .where(and(eq(slots.turfId, Number(turfId)), eq(slots.date, date), eq(slots.startTime, startTime)));

    if (existing) {
      const newStatus = existing.status === 'blocked' ? 'available' : 'blocked';
      const [updated] = await db
        .update(slots)
        .set({ status: newStatus })
        .where(eq(slots.id, existing.id))
        .returning();
      return res.json(updated);
    } else {
      const [newSlot] = await db
        .insert(slots)
        .values({
          turfId: Number(turfId),
          date,
          startTime,
          endTime: calculatedEndTime,
          status: 'blocked',
        })
        .returning();
      return res.status(201).json(newSlot);
    }
  } catch (error: any) {
    console.error('Failed to toggle slot block:', error);
    return res.status(500).json({ error: 'Failed to update slot status' });
  }
});

export default router;
