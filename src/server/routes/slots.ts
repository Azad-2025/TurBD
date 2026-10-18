import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { slots, bookings, turfs, slotHolds, auditLogs } from '../../db/schema.ts';
import { eq, and, gt, gte, lte, inArray } from 'drizzle-orm';
import { requireOwner } from '../middleware/auth.ts';
import { realtimeBroadcaster } from '../services/realtime.ts';

const router = Router();

// Standard hourly slot generator helper (06:00 to 01:00)
export const DEFAULT_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'
];

/**
 * Phase 8: Calculate server-authoritative slot pricing based on configured peak/off-peak rules
 */
export function calculateSlotPrice(turf: any, startTime: string, bookingDate?: string): { price: number; ruleName: string } {
  if (!turf) {
    return { price: 1800, ruleName: 'Default' };
  }

  // 1. Detailed custom pricing rules
  if (Array.isArray(turf.pricingRules) && turf.pricingRules.length > 0) {
    const dayOfWeek = bookingDate ? new Date(bookingDate).getDay() : undefined;
    const matching = turf.pricingRules.find((r: any) => {
      const timeMatches = startTime >= r.startTime && startTime < r.endTime;
      const dayMatches = !r.daysOfWeek || r.daysOfWeek.length === 0 || (dayOfWeek !== undefined && r.daysOfWeek.includes(dayOfWeek));
      return timeMatches && dayMatches;
    });
    if (matching && matching.pricePerHour > 0) {
      return { price: matching.pricePerHour, ruleName: matching.name || `${matching.type} Rate` };
    }
  }

  // 2. Floodlight / Night price (18:00 - 02:00)
  if (turf.nightPricePerHour && (startTime >= '18:00' || startTime < '06:00')) {
    return { price: turf.nightPricePerHour, ruleName: 'Night Floodlight Rate' };
  }

  // 3. Morning / Day price (06:00 - 18:00)
  if (turf.dayPricePerHour && startTime >= '06:00' && startTime < '18:00') {
    return { price: turf.dayPricePerHour, ruleName: 'Morning/Day Off-Peak Rate' };
  }

  // 4. Default standard hourly rate
  return { price: turf.pricePerHour || 1800, ruleName: 'Standard Hourly Rate' };
}

// GET /api/slots?turfId=1&date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const turfId = Number(req.query.turfId);
    const date = String(req.query.date || new Date().toISOString().split('T')[0]);

    if (!turfId) {
      return res.status(400).json({ error: 'turfId query param is required' });
    }

    // Fetch turf for pricing rules
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, turfId));

    // Query explicit slot records from database
    const existingSlots = await db
      .select()
      .from(slots)
      .where(and(eq(slots.turfId, turfId), eq(slots.date, date)));

    // Query active temporary holds that haven't expired
    const activeHolds = await db
      .select()
      .from(slotHolds)
      .where(
        and(
          eq(slotHolds.turfId, turfId),
          eq(slotHolds.bookingDate, date),
          gt(slotHolds.heldUntil, new Date())
        )
      );

    const heldTimes = new Set(activeHolds.map((h) => h.startTime));

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

    // Map slot list with real-time status and dynamic pricing
    const slotMap = new Map<string, any>();
    existingSlots.forEach((s) => slotMap.set(s.startTime, s));

    const resultSlots = DEFAULT_TIMES.map((time) => {
      const explicit = slotMap.get(time);
      let status = 'available';

      if (bookedTimes.has(time)) {
        status = 'booked';
      } else if (heldTimes.has(time)) {
        status = 'held';
      } else if (explicit) {
        status = explicit.status;
      }

      const pricing = calculateSlotPrice(turf, time, date);

      return {
        id: explicit?.id || null,
        turfId,
        date,
        startTime: time,
        endTime: `${(parseInt(time.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`,
        status,
        price: pricing.price,
        ruleName: pricing.ruleName,
        reason: explicit?.reason || null,
        blockedBy: explicit?.blockedBy || null,
        blockedAt: explicit?.blockedAt || null,
      };
    });

    return res.json(resultSlots);
  } catch (error: any) {
    console.error('Failed to get slots:', error);
    return res.status(500).json({ error: 'Failed to retrieve slots' });
  }
});

// POST /api/slots/toggle-block - Block or unblock a slot with reason & conflict guard
router.post('/toggle-block', requireOwner, async (req: Request, res: Response) => {
  try {
    const { turfId, date, startTime, endTime, status, reason, confirmConflicts } = req.body;

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

    const newStatus = status || (existing?.status === 'blocked' ? 'available' : 'blocked');

    // If attempting to block, check for existing confirmed bookings
    if (newStatus === 'blocked') {
      const activeBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.turfId, Number(turfId)),
            eq(bookings.bookingDate, date),
            eq(bookings.startTime, startTime)
          )
        );

      const conflict = activeBookings.find((b) => b.bookingStatus !== 'cancelled');
      if (conflict && !confirmConflicts) {
        return res.status(409).json({
          conflict: true,
          warning: `Slot has an existing confirmed booking (#${conflict.bookingCode}). Blocking requires explicit confirmation to avoid silent disruption.`,
          conflictingBooking: conflict,
        });
      }
    }

    const blockingReason = newStatus === 'blocked' ? (reason?.trim() || 'Maintenance') : null;
    const blockedBy = newStatus === 'blocked' ? req.user!.id : null;
    const blockedAt = newStatus === 'blocked' ? new Date() : null;

    let updatedSlotRecord: any;

    if (existing) {
      const [updated] = await db
        .update(slots)
        .set({
          status: newStatus,
          reason: blockingReason,
          blockedBy,
          blockedAt,
        })
        .where(eq(slots.id, existing.id))
        .returning();

      updatedSlotRecord = updated;
    } else {
      const [newSlot] = await db
        .insert(slots)
        .values({
          turfId: Number(turfId),
          date,
          startTime,
          endTime: calculatedEndTime,
          status: newStatus,
          reason: blockingReason,
          blockedBy,
          blockedAt,
        })
        .returning();

      updatedSlotRecord = newSlot;
    }

    // Realtime notification to all connected players and owners
    realtimeBroadcaster.notifyTurfSlotChange({
      turfId: Number(turfId),
      date,
      startTime,
      status: newStatus as any,
      slotId: updatedSlotRecord.id,
    });

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: newStatus === 'blocked' ? 'slot_blocked' : 'slot_unblocked',
      targetType: 'slot',
      targetId: `${turfId}_${date}_${startTime}`,
      details: {
        turfId: Number(turfId),
        date,
        startTime,
        reason: blockingReason,
        turfName: turf.turfName,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json(updatedSlotRecord);
  } catch (error: any) {
    console.error('Failed to toggle slot block:', error);
    return res.status(500).json({ error: 'Failed to update slot status' });
  }
});

// POST /api/slots/hold - Temporarily hold a slot during checkout (10-minute TTL)
router.post('/hold', async (req: Request, res: Response) => {
  try {
    const { turfId, date, startTime, userId } = req.body;
    if (!turfId || !date || !startTime) {
      return res.status(400).json({ error: 'turfId, date, and startTime are required' });
    }

    const calculatedEndTime = `${(parseInt(startTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;
    const finalUserId = req.user ? req.user.id : Number(userId) || 1;

    // 1. Check if already booked
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.turfId, Number(turfId)),
          eq(bookings.bookingDate, date),
          eq(bookings.startTime, startTime)
        )
      );

    if (existingBooking && existingBooking.bookingStatus !== 'cancelled') {
      return res.status(409).json({ error: 'Slot is already booked by another player' });
    }

    // 2. Check if currently held by another active session
    const [activeHold] = await db
      .select()
      .from(slotHolds)
      .where(
        and(
          eq(slotHolds.turfId, Number(turfId)),
          eq(slotHolds.bookingDate, date),
          eq(slotHolds.startTime, startTime),
          gt(slotHolds.heldUntil, new Date())
        )
      );

    if (activeHold && activeHold.userId !== finalUserId) {
      return res.status(409).json({ error: 'Slot is currently being booked by another customer. Please choose another slot.' });
    }

    // 3. Set 10-minute TTL expiration
    const heldUntil = new Date(Date.now() + 10 * 60 * 1000);

    if (activeHold) {
      await db
        .update(slotHolds)
        .set({ heldUntil })
        .where(eq(slotHolds.id, activeHold.id));
    } else {
      await db.insert(slotHolds).values({
        turfId: Number(turfId),
        bookingDate: date,
        startTime,
        userId: finalUserId,
        heldUntil,
      });
    }

    // 4. Update or insert slot record status
    const [existing] = await db
      .select()
      .from(slots)
      .where(and(eq(slots.turfId, Number(turfId)), eq(slots.date, date), eq(slots.startTime, startTime)));

    let slotId: number;
    if (existing) {
      const [updated] = await db
        .update(slots)
        .set({ status: 'held' })
        .where(eq(slots.id, existing.id))
        .returning();
      slotId = updated.id;
    } else {
      const [newSlot] = await db
        .insert(slots)
        .values({
          turfId: Number(turfId),
          date,
          startTime,
          endTime: calculatedEndTime,
          status: 'held',
        })
        .returning();
      slotId = newSlot.id;
    }

    realtimeBroadcaster.notifyTurfSlotChange({
      turfId: Number(turfId),
      date,
      startTime,
      status: 'held',
      slotId,
    });

    return res.json({ success: true, status: 'held', heldUntil });
  } catch (error: any) {
    console.error('Failed to hold slot:', error);
    return res.status(500).json({ error: 'Failed to hold slot' });
  }
});

// POST /api/slots/release - Release a held slot if checkout is cancelled
router.post('/release', async (req: Request, res: Response) => {
  try {
    const { turfId, date, startTime } = req.body;
    if (!turfId || !date || !startTime) {
      return res.status(400).json({ error: 'turfId, date, and startTime are required' });
    }

    // 1. Remove from slotHolds
    await db
      .delete(slotHolds)
      .where(
        and(
          eq(slotHolds.turfId, Number(turfId)),
          eq(slotHolds.bookingDate, date),
          eq(slotHolds.startTime, startTime)
        )
      );

    // 2. Set slot record back to available if not booked
    const [existing] = await db
      .select()
      .from(slots)
      .where(and(eq(slots.turfId, Number(turfId)), eq(slots.date, date), eq(slots.startTime, startTime)));

    if (existing && existing.status === 'held') {
      const [updated] = await db
        .update(slots)
        .set({ status: 'available' })
        .where(eq(slots.id, existing.id))
        .returning();

      realtimeBroadcaster.notifyTurfSlotChange({
        turfId: Number(turfId),
        date,
        startTime,
        status: 'available',
        slotId: updated.id,
      });

      return res.json(updated);
    }

    return res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Failed to release slot:', error);
    return res.status(500).json({ error: 'Failed to release slot' });
  }
});

// -------------------------------------------------------------
// FEATURE 2: ADVANCED SLOT MANAGEMENT (BULK, DAY, RANGE & AUDIT)
// -------------------------------------------------------------

// POST /api/slots/block-bulk - Block multiple selected slots
router.post('/block-bulk', requireOwner, async (req: Request, res: Response) => {
  try {
    const { turfId, slots: requestedSlots, reason, confirmConflicts } = req.body;

    if (!turfId || !Array.isArray(requestedSlots) || requestedSlots.length === 0) {
      return res.status(400).json({ error: 'turfId and a non-empty slots array are required' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, Number(turfId)));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only block slots on your own turf' });
    }

    // Check for conflicts with existing confirmed bookings
    const conflictingBookings: any[] = [];
    for (const s of requestedSlots) {
      const active = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.turfId, Number(turfId)),
            eq(bookings.bookingDate, s.date),
            eq(bookings.startTime, s.startTime)
          )
        );
      const conf = active.find((b) => b.bookingStatus !== 'cancelled');
      if (conf) conflictingBookings.push(conf);
    }

    if (conflictingBookings.length > 0 && !confirmConflicts) {
      return res.status(409).json({
        conflict: true,
        warning: `Found ${conflictingBookings.length} confirmed booking(s) in the selected slots. Blocking requires explicit confirmation so players are not silently affected.`,
        conflictingBookings,
      });
    }

    const blockingReason = reason?.trim() || 'Maintenance';
    const now = new Date();
    const blockedResults: any[] = [];

    for (const s of requestedSlots) {
      const [existing] = await db
        .select()
        .from(slots)
        .where(
          and(
            eq(slots.turfId, Number(turfId)),
            eq(slots.date, s.date),
            eq(slots.startTime, s.startTime)
          )
        );

      const calculatedEndTime = s.endTime || `${(parseInt(s.startTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;

      if (existing) {
        const [updated] = await db
          .update(slots)
          .set({
            status: 'blocked',
            reason: blockingReason,
            blockedBy: req.user!.id,
            blockedAt: now,
          })
          .where(eq(slots.id, existing.id))
          .returning();
        blockedResults.push(updated);
      } else {
        const [newSlot] = await db
          .insert(slots)
          .values({
            turfId: Number(turfId),
            date: s.date,
            startTime: s.startTime,
            endTime: calculatedEndTime,
            status: 'blocked',
            reason: blockingReason,
            blockedBy: req.user!.id,
            blockedAt: now,
          })
          .returning();
        blockedResults.push(newSlot);
      }

      realtimeBroadcaster.notifyTurfSlotChange({
        turfId: Number(turfId),
        date: s.date,
        startTime: s.startTime,
        status: 'blocked',
      });
    }

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'slots_bulk_blocked',
      targetType: 'turf',
      targetId: String(turfId),
      details: {
        turfName: turf.turfName,
        count: requestedSlots.length,
        reason: blockingReason,
        slots: requestedSlots,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      message: `Successfully blocked ${blockedResults.length} slots for ${blockingReason}.`,
      blockedCount: blockedResults.length,
      slots: blockedResults,
    });
  } catch (error: any) {
    console.error('Failed to bulk block slots:', error);
    return res.status(500).json({ error: 'Failed to bulk block slots' });
  }
});

// POST /api/slots/block-day - Block entire day
router.post('/block-day', requireOwner, async (req: Request, res: Response) => {
  try {
    const { turfId, date, reason, confirmConflicts } = req.body;

    if (!turfId || !date) {
      return res.status(400).json({ error: 'turfId and date are required' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, Number(turfId)));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only block slots on your own turf' });
    }

    // Check for existing confirmed bookings on that day
    const dayBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.turfId, Number(turfId)), eq(bookings.bookingDate, date)));

    const activeConflicts = dayBookings.filter((b) => b.bookingStatus !== 'cancelled');
    if (activeConflicts.length > 0 && !confirmConflicts) {
      return res.status(409).json({
        conflict: true,
        warning: `This day has ${activeConflicts.length} active confirmed booking(s). Please review before blocking the entire day.`,
        conflictingBookings: activeConflicts,
      });
    }

    const daySlots = DEFAULT_TIMES.map((time) => ({ date, startTime: time }));
    const blockingReason = reason?.trim() || 'Whole Day Closure';
    const now = new Date();

    for (const time of DEFAULT_TIMES) {
      const [existing] = await db
        .select()
        .from(slots)
        .where(
          and(
            eq(slots.turfId, Number(turfId)),
            eq(slots.date, date),
            eq(slots.startTime, time)
          )
        );

      const endTime = `${(parseInt(time.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;

      if (existing) {
        await db
          .update(slots)
          .set({
            status: 'blocked',
            reason: blockingReason,
            blockedBy: req.user!.id,
            blockedAt: now,
          })
          .where(eq(slots.id, existing.id));
      } else {
        await db.insert(slots).values({
          turfId: Number(turfId),
          date,
          startTime: time,
          endTime,
          status: 'blocked',
          reason: blockingReason,
          blockedBy: req.user!.id,
          blockedAt: now,
        });
      }

      realtimeBroadcaster.notifyTurfSlotChange({
        turfId: Number(turfId),
        date,
        startTime: time,
        status: 'blocked',
      });
    }

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'slots_day_blocked',
      targetType: 'turf',
      targetId: String(turfId),
      details: {
        turfName: turf.turfName,
        date,
        reason: blockingReason,
        slotsCount: DEFAULT_TIMES.length,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      message: `Successfully blocked entire day (${date}) for ${blockingReason}.`,
      date,
      slotsCount: DEFAULT_TIMES.length,
    });
  } catch (error: any) {
    console.error('Failed to block day:', error);
    return res.status(500).json({ error: 'Failed to block entire day' });
  }
});

// POST /api/slots/block-range - Block a range of dates
router.post('/block-range', requireOwner, async (req: Request, res: Response) => {
  try {
    const { turfId, startDate, endDate, reason, confirmConflicts } = req.body;

    if (!turfId || !startDate || !endDate) {
      return res.status(400).json({ error: 'turfId, startDate, and endDate are required' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ error: 'startDate cannot be after endDate' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, Number(turfId)));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only block slots on your own turf' });
    }

    // Check for existing bookings within range
    const rangeBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.turfId, Number(turfId)),
          gte(bookings.bookingDate, startDate),
          lte(bookings.bookingDate, endDate)
        )
      );

    const activeConflicts = rangeBookings.filter((b) => b.bookingStatus !== 'cancelled');
    if (activeConflicts.length > 0 && !confirmConflicts) {
      return res.status(409).json({
        conflict: true,
        warning: `Found ${activeConflicts.length} active confirmed booking(s) between ${startDate} and ${endDate}. Confirming will protect existing bookings while blocking open slots.`,
        conflictingBookings: activeConflicts,
      });
    }

    // Generate dates in range (max 60 days)
    const dates: string[] = [];
    const cur = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    while (cur <= end && count < 60) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
      count++;
    }

    const blockingReason = reason?.trim() || 'Date Range Maintenance';
    const now = new Date();

    for (const d of dates) {
      for (const time of DEFAULT_TIMES) {
        const [existing] = await db
          .select()
          .from(slots)
          .where(
            and(
              eq(slots.turfId, Number(turfId)),
              eq(slots.date, d),
              eq(slots.startTime, time)
            )
          );

        const endTime = `${(parseInt(time.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;

        if (existing) {
          await db
            .update(slots)
            .set({
              status: 'blocked',
              reason: blockingReason,
              blockedBy: req.user!.id,
              blockedAt: now,
            })
            .where(eq(slots.id, existing.id));
        } else {
          await db.insert(slots).values({
            turfId: Number(turfId),
            date: d,
            startTime: time,
            endTime,
            status: 'blocked',
            reason: blockingReason,
            blockedBy: req.user!.id,
            blockedAt: now,
          });
        }
      }
    }

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'slots_range_blocked',
      targetType: 'turf',
      targetId: String(turfId),
      details: {
        turfName: turf.turfName,
        startDate,
        endDate,
        daysCount: dates.length,
        reason: blockingReason,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      message: `Successfully blocked ${dates.length} days (${startDate} to ${endDate}) for ${blockingReason}.`,
      daysCount: dates.length,
      dates,
    });
  } catch (error: any) {
    console.error('Failed to block date range:', error);
    return res.status(500).json({ error: 'Failed to block date range' });
  }
});

// POST /api/slots/unblock - Unblock selected slots or full date
router.post('/unblock', requireOwner, async (req: Request, res: Response) => {
  try {
    const { turfId, slots: requestedSlots, date } = req.body;

    if (!turfId) {
      return res.status(400).json({ error: 'turfId is required' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, Number(turfId)));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only unblock slots on your own turf' });
    }

    let unblockedCount = 0;

    if (Array.isArray(requestedSlots) && requestedSlots.length > 0) {
      for (const s of requestedSlots) {
        await db
          .update(slots)
          .set({ status: 'available', reason: null, blockedBy: null, blockedAt: null })
          .where(
            and(
              eq(slots.turfId, Number(turfId)),
              eq(slots.date, s.date),
              eq(slots.startTime, s.startTime)
            )
          );
        unblockedCount++;
        realtimeBroadcaster.notifyTurfSlotChange({
          turfId: Number(turfId),
          date: s.date,
          startTime: s.startTime,
          status: 'available',
        });
      }
    } else if (date) {
      const updated = await db
        .update(slots)
        .set({ status: 'available', reason: null, blockedBy: null, blockedAt: null })
        .where(and(eq(slots.turfId, Number(turfId)), eq(slots.date, date)))
        .returning();
      unblockedCount = updated.length;
      for (const u of updated) {
        realtimeBroadcaster.notifyTurfSlotChange({
          turfId: Number(turfId),
          date,
          startTime: u.startTime,
          status: 'available',
        });
      }
    } else {
      return res.status(400).json({ error: 'Either slots array or date parameter is required to unblock' });
    }

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'slots_unblocked',
      targetType: 'turf',
      targetId: String(turfId),
      details: {
        turfName: turf.turfName,
        unblockedCount,
        date: date || null,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      message: `Successfully unblocked ${unblockedCount} slot(s).`,
      unblockedCount,
    });
  } catch (error: any) {
    console.error('Failed to unblock slots:', error);
    return res.status(500).json({ error: 'Failed to unblock slots' });
  }
});

export default router;
