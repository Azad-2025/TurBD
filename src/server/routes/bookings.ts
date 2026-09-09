import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { bookings, turfs, users, payments, slots } from '../../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

// Helper to generate unique booking code
const generateBookingCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'TBD-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// GET /api/bookings - List bookings with rich relation data
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, turfId, status, paymentStatus, date } = req.query;

    const allBookings = await db
      .select({
        id: bookings.id,
        userId: bookings.userId,
        turfId: bookings.turfId,
        slotId: bookings.slotId,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        amount: bookings.amount,
        advancePaid: bookings.advancePaid,
        dueAmount: bookings.dueAmount,
        paymentStatus: bookings.paymentStatus,
        bookingStatus: bookings.bookingStatus,
        bookingCode: bookings.bookingCode,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        // Joined turf details
        turfName: turfs.turfName,
        turfArea: turfs.address,
        turfCity: turfs.city,
        // Joined user details
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
      })
      .from(bookings)
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(bookings.createdAt));

    let filtered = allBookings;

    if (userId) {
      filtered = filtered.filter((b) => b.userId === Number(userId));
    }
    if (turfId) {
      filtered = filtered.filter((b) => b.turfId === Number(turfId));
    }
    if (status) {
      filtered = filtered.filter((b) => b.bookingStatus === status);
    }
    if (paymentStatus) {
      filtered = filtered.filter((b) => b.paymentStatus === paymentStatus);
    }
    if (date) {
      filtered = filtered.filter((b) => b.bookingDate === date);
    }

    return res.json(filtered);
  } catch (error: any) {
    console.error('Failed to fetch bookings:', error);
    return res.status(500).json({ error: 'Failed to retrieve bookings' });
  }
});

// POST /api/bookings - Create new match booking (Customer can create booking)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      userId,
      turfId,
      bookingDate,
      startTime,
      endTime,
      paymentMethod,
      isAdvanceOnly,
      notes,
    } = req.body;

    if (!turfId || !bookingDate || !startTime) {
      return res.status(400).json({ error: 'turfId, bookingDate, and startTime are required' });
    }

    // Never trust frontend user ID for customer bookings - verify from authenticated session
    const verifiedUserId = req.user!.role === 'admin' && userId ? Number(userId) : req.user!.id;

    // 1. Fetch turf to get hourly rate
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, Number(turfId)));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (turf.verificationStatus !== 'approved') {
      return res.status(403).json({ error: 'This venue is currently pending admin verification and cannot accept bookings yet.' });
    }

    // 2. Concurrency check: Ensure slot isn't already booked
    const existingBooking = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.turfId, Number(turfId)),
          eq(bookings.bookingDate, bookingDate),
          eq(bookings.startTime, startTime)
        )
      );

    const activeConflict = existingBooking.find((b) => b.bookingStatus !== 'cancelled');
    if (activeConflict) {
      return res.status(409).json({ error: 'This time slot was just booked by another player. Please select another slot.' });
    }

    // 3. Calculate amount, advance, and due
    const calculatedEndTime = endTime || `${(parseInt(startTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;
    const totalAmount = turf.pricePerHour;
    const advancePaid = isAdvanceOnly ? 1000 : totalAmount;
    const dueAmount = totalAmount - advancePaid;
    const paymentStatus = dueAmount === 0 ? 'paid' : 'partially_paid';

    // 4. Create booking
    const bookingCode = generateBookingCode();
    const [newBooking] = await db
      .insert(bookings)
      .values({
        userId: verifiedUserId,
        turfId: Number(turfId),
        bookingDate,
        startTime,
        endTime: calculatedEndTime,
        amount: totalAmount,
        advancePaid,
        dueAmount,
        paymentStatus,
        bookingStatus: 'confirmed', // Auto-confirm on simulated payment
        bookingCode,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    // 5. Create payment record
    const trxId = (paymentMethod || 'bkash').toUpperCase().slice(0, 3) + Math.random().toString(36).substring(2, 10).toUpperCase();
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        bookingId: newBooking.id,
        method: paymentMethod || 'bkash',
        transactionId: trxId,
        amount: advancePaid,
        status: 'completed',
      })
      .returning();

    // 6. Update or insert slot record to 'booked'
    const [existingSlot] = await db
      .select()
      .from(slots)
      .where(and(eq(slots.turfId, Number(turfId)), eq(slots.date, bookingDate), eq(slots.startTime, startTime)));

    if (existingSlot) {
      await db.update(slots).set({ status: 'booked' }).where(eq(slots.id, existingSlot.id));
    } else {
      await db.insert(slots).values({
        turfId: Number(turfId),
        date: bookingDate,
        startTime,
        endTime: calculatedEndTime,
        status: 'booked',
      });
    }

    return res.status(201).json({
      ...newBooking,
      payment: paymentRecord,
      turfName: turf.turfName,
      turfArea: turf.address,
      turfCity: turf.city,
    });
  } catch (error: any) {
    console.error('Failed to create booking:', error);
    return res.status(500).json({ error: 'Failed to create match booking' });
  }
});

// Protect all PATCH /api/bookings/* with requireAuth
router.patch('*', requireAuth);

// PATCH /api/bookings/:id/status - Update booking status with RBAC checks
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, notes, paymentStatus } = req.body;

    const allowedStatuses = ['pending_approval', 'confirmed', 'completed', 'cancelled', 'cancellation_requested'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Fetch associated turf to check owner authorization
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));

    const isAdmin = req.user!.role === 'admin';
    const isOwnerOfTurf = req.user!.role === 'owner' && turf && turf.ownerId === req.user!.id;
    const isBookingCustomer = booking.userId === req.user!.id;

    // Authorization:
    // Admin: can update any booking
    // Owner: can manage bookings for their own turf only
    // Customer: can cancel or request cancellation of their own booking
    if (isAdmin || isOwnerOfTurf) {
      // Allowed
    } else if (isBookingCustomer && (status === 'cancelled' || status === 'cancellation_requested')) {
      // Customer is allowed to cancel or request cancellation
    } else {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to update this booking' });
    }

    const updatePayload: any = {};
    if (status) {
      updatePayload.bookingStatus = status;
    }
    if (notes !== undefined) {
      updatePayload.notes = typeof notes === 'object' ? JSON.stringify(notes) : String(notes);
    }
    if (paymentStatus && (isAdmin || isOwnerOfTurf)) {
      updatePayload.paymentStatus = paymentStatus;
    }

    const [updated] = await db
      .update(bookings)
      .set(updatePayload)
      .where(eq(bookings.id, id))
      .returning();

    // If cancelled, free up slot so it becomes available in real-time
    if (status === 'cancelled') {
      const [slotRecord] = await db
        .select()
        .from(slots)
        .where(
          and(
            eq(slots.turfId, updated.turfId),
            eq(slots.date, updated.bookingDate),
            eq(slots.startTime, updated.startTime)
          )
        );

      if (slotRecord) {
        await db.update(slots).set({ status: 'available' }).where(eq(slots.id, slotRecord.id));
      }
    }

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update booking status:', error);
    return res.status(500).json({ error: 'Failed to update booking status' });
  }
});

export default router;
