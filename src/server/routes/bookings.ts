import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { bookings, turfs, users, payments, slots, slotHolds } from '../../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { requireAuth } from '../middleware/auth.ts';
import { realtimeBroadcaster } from '../services/realtime.ts';
import { parseMatchPassInput, generateMatchPassToken } from '../utils/passToken.ts';
import { notificationService } from '../services/notificationService.ts';
import { calculateSlotPrice } from './slots.ts';

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

// GET /api/bookings - List bookings with rich relation data (Protected with authentication & RBAC scoping)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, turfId, status, paymentStatus, date } = req.query;
    const currentUser = req.user!;
    const isAdmin = currentUser.role === 'admin';
    const isOwner = currentUser.role === 'owner';

    const checkerUser = alias(users, 'checker_user');
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
        isCheckedIn: bookings.isCheckedIn,
        checkedInAt: bookings.checkedInAt,
        checkedInBy: bookings.checkedInBy,
        createdAt: bookings.createdAt,
        // Joined turf details
        turfName: turfs.turfName,
        turfArea: turfs.address,
        turfCity: turfs.city,
        turfOwnerId: turfs.ownerId,
        // Joined user details
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        checkedInByName: checkerUser.name,
      })
      .from(bookings)
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(checkerUser, eq(bookings.checkedInBy, checkerUser.id))
      .orderBy(desc(bookings.createdAt));

    let filtered = allBookings;

    // RBAC Data Scoping:
    // 1. Regular customers can ONLY ever access their own bookings
    if (!isAdmin && !isOwner) {
      filtered = filtered.filter((b) => b.userId === currentUser.id);
    } else if (isOwner && !isAdmin) {
      // 2. Turf owners can ONLY access bookings for turfs they own
      const ownerTurfs = await db.select({ id: turfs.id }).from(turfs).where(eq(turfs.ownerId, currentUser.id));
      const ownerTurfIds = new Set(ownerTurfs.map((t) => t.id));
      filtered = filtered.filter((b) => ownerTurfIds.has(b.turfId));
    } else if (isAdmin) {
      // 3. Admin can optionally filter by specific userId
      if (userId) {
        filtered = filtered.filter((b) => b.userId === Number(userId));
      }
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

    const enriched = filtered.map((b) => ({
      ...b,
      qrData: generateMatchPassToken({ id: b.id, bookingCode: b.bookingCode, turfId: b.turfId }).qrPayload,
    }));

    return res.json(enriched);
  } catch (error: any) {
    console.error('Failed to fetch bookings:', error);
    return res.status(500).json({ error: 'Failed to retrieve bookings' });
  }
});

// GET /api/bookings/:id - Retrieve single booking (Scoped to admin, venue owner, or booking customer)
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const checkerUser = alias(users, 'checker_user');
    const [bookingRecord] = await db
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
        isCheckedIn: bookings.isCheckedIn,
        checkedInAt: bookings.checkedInAt,
        checkedInBy: bookings.checkedInBy,
        createdAt: bookings.createdAt,
        turfName: turfs.turfName,
        turfArea: turfs.address,
        turfCity: turfs.city,
        turfOwnerId: turfs.ownerId,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        checkedInByName: checkerUser.name,
      })
      .from(bookings)
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(checkerUser, eq(bookings.checkedInBy, checkerUser.id))
      .where(eq(bookings.id, id));

    if (!bookingRecord) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const currentUser = req.user!;
    const isAdmin = currentUser.role === 'admin';
    const isOwnerOfVenue = currentUser.role === 'owner' && bookingRecord.turfOwnerId === currentUser.id;
    const isOwnerOfBooking = bookingRecord.userId === currentUser.id;

    if (!isAdmin && !isOwnerOfVenue && !isOwnerOfBooking) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this booking' });
    }

    const enrichedRecord = {
      ...bookingRecord,
      qrData: generateMatchPassToken({
        id: bookingRecord.id,
        bookingCode: bookingRecord.bookingCode,
        turfId: bookingRecord.turfId,
      }).qrPayload,
    };

    return res.json(enrichedRecord);
  } catch (error: any) {
    console.error('Failed to fetch booking details:', error);
    return res.status(500).json({ error: 'Failed to retrieve booking details' });
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

    // Wrap concurrency check and booking creation in a strict atomic database transaction
    const transactionResult = await db.transaction(async (tx) => {
      // 1. Check if slot is explicitly blocked by venue management
      const [existingSlotRecord] = await tx
        .select()
        .from(slots)
        .where(
          and(
            eq(slots.turfId, Number(turfId)),
            eq(slots.date, bookingDate),
            eq(slots.startTime, startTime)
          )
        );

      if (existingSlotRecord && existingSlotRecord.status === 'blocked') {
        return { blocked: true, reason: existingSlotRecord.reason };
      }

      // 2. Concurrency check: Ensure slot isn't already booked
      const existingBooking = await tx
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
        return { conflict: true };
      }

      // 3. Server-authoritative dynamic pricing calculation (Peak / Off-Peak / Floodlight)
      const calculatedEndTime = endTime || `${(parseInt(startTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`;
      const pricing = calculateSlotPrice(turf, startTime, bookingDate);
      const totalAmount = pricing.price;
      const advancePaid = isAdvanceOnly
        ? Math.min(totalAmount, Math.max(500, Math.round(totalAmount * 0.5)))
        : totalAmount;
      const dueAmount = totalAmount - advancePaid;
      const paymentStatus = dueAmount === 0 ? 'paid' : 'partially_paid';

      // 4. Create booking
      const bookingCode = generateBookingCode();
      const [newBooking] = await tx
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
          bookingStatus: 'confirmed',
          bookingCode,
          notes: notes ? String(notes).trim() : null,
        })
        .returning();

      // 5. Create payment record
      const trxId = (paymentMethod || 'bkash').toUpperCase().slice(0, 3) + Math.random().toString(36).substring(2, 10).toUpperCase();
      const [paymentRecord] = await tx
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
      if (existingSlotRecord) {
        await tx.update(slots).set({ status: 'booked' }).where(eq(slots.id, existingSlotRecord.id));
      } else {
        await tx.insert(slots).values({
          turfId: Number(turfId),
          date: bookingDate,
          startTime,
          endTime: calculatedEndTime,
          status: 'booked',
        });
      }

      // 7. Clear any active temporary slot holds for this slot
      await tx
        .delete(slotHolds)
        .where(
          and(
            eq(slotHolds.turfId, Number(turfId)),
            eq(slotHolds.bookingDate, bookingDate),
            eq(slotHolds.startTime, startTime)
          )
        );

      return { conflict: false, newBooking, paymentRecord, calculatedEndTime, advancePaid, dueAmount };
    });

    if (transactionResult.blocked) {
      return res.status(409).json({
        error: `This slot is currently blocked by venue management for ${transactionResult.reason || 'maintenance'}. Please select another slot.`,
        code: 'SLOT_BLOCKED',
      });
    }

    if (transactionResult.conflict || !transactionResult.newBooking) {
      return res.status(409).json({ error: 'This time slot was just booked by another player. Please select another slot.' });
    }

    const { newBooking, paymentRecord } = transactionResult;

    // Notify venue owner
    notificationService.notifyOwnerNewBooking({
      ownerId: turf.ownerId,
      turfId: turf.id,
      turfName: turf.turfName,
      bookingId: newBooking.id,
      customerName: req.user?.name || 'Customer',
      customerPhone: req.user?.phone || '',
      date: bookingDate,
      timeSlot: `${startTime} - ${transactionResult.calculatedEndTime}`,
      tokenPaid: transactionResult.advancePaid,
      remainingDue: transactionResult.dueAmount,
    });

    // Broadcast realtime event: slot is now booked immediately across all connected customer & owner devices
    realtimeBroadcaster.notifyTurfSlotChange({
      turfId: Number(turfId),
      date: bookingDate,
      startTime,
      status: 'booked',
    });
    realtimeBroadcaster.notifyBookingStatusChange({
      bookingId: newBooking.id,
      bookingCode: newBooking.bookingCode,
      turfId: Number(turfId),
      status: newBooking.bookingStatus,
      bookingDate,
      startTime,
    });

    return res.status(201).json({
      ...newBooking,
      payment: paymentRecord,
      turfName: turf.turfName,
      turfArea: turf.address,
      turfCity: turf.city,
      userName: req.user?.name || 'Player',
      userPhone: req.user?.phone || '',
      userEmail: req.user?.email || '',
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

      realtimeBroadcaster.notifyTurfSlotChange({
        turfId: updated.turfId,
        date: updated.bookingDate,
        startTime: updated.startTime,
        status: 'available',
      });

      // Dispatch booking cancelled notification
      await notificationService.notifyBookingCancelled({
        userId: updated.userId,
        bookingId: updated.id,
        bookingCode: updated.bookingCode,
        turfName: turf?.turfName || 'Arena',
        date: updated.bookingDate,
        timeSlot: `${updated.startTime} - ${updated.endTime}`,
      });

      if (turf?.ownerId && !isOwnerOfTurf) {
        await notificationService.notifyOwnerCancellation({
          ownerId: turf.ownerId,
          turfName: turf.turfName,
          bookingId: updated.id,
          customerName: req.user!.name || 'Player',
          date: updated.bookingDate,
          timeSlot: `${updated.startTime} - ${updated.endTime}`,
        });
      }
    }

    if (req.body.refundStatus) {
      await notificationService.notifyRefundStatusChanged({
        userId: updated.userId,
        bookingId: updated.id,
        bookingCode: updated.bookingCode,
        turfName: turf?.turfName || 'Arena',
        refundStatus: req.body.refundStatus,
        amount: req.body.refundAmount || updated.advancePaid,
        notes: req.body.refundNotes,
      });
    }

    // Broadcast booking status change to customers, owners and admins
    realtimeBroadcaster.notifyBookingStatusChange({
      bookingId: updated.id,
      bookingCode: updated.bookingCode,
      turfId: updated.turfId,
      status: updated.bookingStatus,
      bookingDate: updated.bookingDate,
      startTime: updated.startTime,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update booking status:', error);
    return res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// POST /api/bookings/verify-pass - Secure gate check-in & QR pass verification
router.post('/verify-pass', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const isAdmin = currentUser.role === 'admin';
    const isOwner = currentUser.role === 'owner';

    // 1. RBAC Guard: Only authorized venue owners or admins can verify passes
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: 'Forbidden: Gate check-in and pass verification is restricted to authorized venue owners and administrators.',
      });
    }

    const { passData, turfId, action = 'checkin' } = req.body;
    if (!passData || typeof passData !== 'string') {
      return res.status(400).json({ error: 'Missing pass data. Please scan a QR code or enter a booking code.' });
    }

    // 2. Parse pass data (QR payload or manual code)
    const parsed = parseMatchPassInput(passData);
    if (!parsed.bookingCode) {
      return res.status(400).json({ error: 'Invalid QR code or booking code format.' });
    }

    // 3. Query booking by code
    const checkerUser = alias(users, 'checker_user');
    const [bookingRecord] = await db
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
        isCheckedIn: bookings.isCheckedIn,
        checkedInAt: bookings.checkedInAt,
        checkedInBy: bookings.checkedInBy,
        createdAt: bookings.createdAt,
        turfName: turfs.turfName,
        turfArea: turfs.address,
        turfCity: turfs.city,
        turfOwnerId: turfs.ownerId,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        checkedInByName: checkerUser.name,
      })
      .from(bookings)
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(checkerUser, eq(bookings.checkedInBy, checkerUser.id))
      .where(eq(bookings.bookingCode, parsed.bookingCode));

    if (!bookingRecord) {
      return res.status(404).json({
        error: `No booking found for code "${parsed.bookingCode}". Please verify the code.`,
        code: parsed.bookingCode,
      });
    }

    // 4. Turf Ownership & Venue Match Guard
    // Owner can only check in bookings for turfs they own
    if (isOwner && !isAdmin && bookingRecord.turfOwnerId !== currentUser.id) {
      return res.status(403).json({
        error: `Unauthorized: This booking belongs to "${bookingRecord.turfName}", which is not under your management.`,
        turfName: bookingRecord.turfName,
      });
    }

    // If turfId was explicitly selected at the check-in gate
    if (turfId && Number(turfId) !== bookingRecord.turfId) {
      return res.status(400).json({
        error: `Venue Mismatch: This pass is for "${bookingRecord.turfName}", not the currently selected arena.`,
        expectedTurfName: bookingRecord.turfName,
        expectedTurfId: bookingRecord.turfId,
      });
    }

    // 5. Check if booking is cancelled or requested for cancellation
    if (bookingRecord.bookingStatus === 'cancelled') {
      return res.status(400).json({
        error: 'Pass Rejected: This booking has been cancelled and cannot be used for entry.',
        reason: 'booking_cancelled',
        booking: bookingRecord,
      });
    }

    if (bookingRecord.bookingStatus === 'cancellation_requested') {
      return res.status(400).json({
        error: 'Pass Suspended: A cancellation request is currently pending review for this booking.',
        reason: 'cancellation_requested',
        booking: bookingRecord,
      });
    }

    // 6. Payment Validity Guard
    if (bookingRecord.paymentStatus === 'refunded') {
      return res.status(400).json({
        error: 'Pass Rejected: The payment for this booking has been refunded.',
        reason: 'payment_refunded',
        booking: bookingRecord,
      });
    }

    if (bookingRecord.paymentStatus === 'failed') {
      return res.status(400).json({
        error: 'Pass Rejected: Payment verification failed for this slot.',
        reason: 'payment_failed',
        booking: bookingRecord,
      });
    }

    // 7. Duplicate Check-In Guard
    if (bookingRecord.isCheckedIn) {
      return res.status(409).json({
        error: 'ALREADY CHECKED IN: This match pass has already been used.',
        alreadyCheckedIn: true,
        checkedInAt: bookingRecord.checkedInAt,
        checkedInByName: bookingRecord.checkedInByName || 'Authorized Staff',
        booking: bookingRecord,
      });
    }

    // 8. If action is 'inspect' (preview only)
    if (action === 'inspect') {
      return res.json({
        verified: true,
        canCheckIn: true,
        booking: bookingRecord,
      });
    }

    // 9. Execute Check-in
    const checkInTime = new Date();
    await db
      .update(bookings)
      .set({
        isCheckedIn: true,
        checkedInAt: checkInTime,
        checkedInBy: currentUser.id,
      })
      .where(eq(bookings.id, bookingRecord.id));

    // 10. Realtime notification events
    await notificationService.notifyCheckInCompleted({
      userId: bookingRecord.userId,
      ownerId: bookingRecord.turfOwnerId || undefined,
      bookingId: bookingRecord.id,
      bookingCode: bookingRecord.bookingCode,
      turfName: bookingRecord.turfName || 'Arena',
      turfId: bookingRecord.turfId,
      date: bookingRecord.bookingDate,
      timeSlot: `${bookingRecord.startTime} - ${bookingRecord.endTime}`,
      customerName: bookingRecord.userName || 'Player',
      checkedInByName: currentUser.name || 'Turf Owner',
      userPhone: bookingRecord.userPhone,
    });

    realtimeBroadcaster.notifyBookingStatusChange({
      bookingId: bookingRecord.id,
      bookingCode: bookingRecord.bookingCode,
      turfId: bookingRecord.turfId,
      status: bookingRecord.bookingStatus,
      bookingDate: bookingRecord.bookingDate,
      startTime: bookingRecord.startTime,
    });

    return res.json({
      success: true,
      message: 'Check-in verified successfully. Match access granted!',
      checkedIn: true,
      checkedInAt: checkInTime.toISOString(),
      checkedInByName: currentUser.name,
      booking: {
        ...bookingRecord,
        isCheckedIn: true,
        checkedInAt: checkInTime,
        checkedInBy: currentUser.id,
        checkedInByName: currentUser.name,
      },
    });
  } catch (error: any) {
    console.error('Failed to verify pass:', error);
    return res.status(500).json({ error: 'Internal error during pass verification' });
  }
});

// PATCH /api/bookings/:id/reschedule - Reschedule a match booking
router.patch('/:id/reschedule', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { newDate, newStartTime, newEndTime } = req.body;

    if (!newDate || !newStartTime || !newEndTime) {
      return res.status(400).json({ error: 'Missing newDate, newStartTime, or newEndTime' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
    const isAdmin = req.user!.role === 'admin';
    const isOwnerOfTurf = req.user!.role === 'owner' && turf && turf.ownerId === req.user!.id;
    const isBookingCustomer = booking.userId === req.user!.id;

    if (!isAdmin && !isOwnerOfTurf && !isBookingCustomer) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to reschedule this booking' });
    }

    const oldDate = booking.bookingDate;
    const oldTimeSlot = `${booking.startTime} - ${booking.endTime}`;

    const [updated] = await db
      .update(bookings)
      .set({
        bookingDate: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
      })
      .where(eq(bookings.id, id))
      .returning();

    // Trigger notification
    await notificationService.notifyBookingRescheduled({
      userId: updated.userId,
      bookingId: updated.id,
      bookingCode: updated.bookingCode,
      turfName: turf?.turfName || 'Arena',
      oldDate,
      oldTimeSlot,
      newDate,
      newTimeSlot: `${newStartTime} - ${newEndTime}`,
      userPhone: req.user!.phone,
    });

    realtimeBroadcaster.notifyBookingStatusChange({
      bookingId: updated.id,
      bookingCode: updated.bookingCode,
      turfId: updated.turfId,
      status: updated.bookingStatus,
      bookingDate: updated.bookingDate,
      startTime: updated.startTime,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to reschedule booking:', error);
    return res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

export default router;
