import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { payments, bookings, turfs, slots, users } from '../../db/schema.ts';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireAuth, requireOwner, requireAdmin } from '../middleware/auth.ts';
import { gatewayManager, SupportedGateway } from '../services/gateways/gatewayManager.ts';

const router = Router();

// Platform commission percentage (e.g. 5% platform fee)
const PLATFORM_COMMISSION_RATE = 0.05;

/**
 * 1. POST /api/payments/initiate
 * Customer creates a pending checkout transaction with bKash, Nagad, or SSLCommerz
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const {
      bookingId,
      gateway = 'bkash',
      isAdvanceOnly = true,
      customerName,
      customerPhone,
      customerEmail,
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(bookingId)));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ error: 'Cannot make payment for a cancelled booking' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
    const turfName = turf ? turf.turfName : 'TurfBD Arena';

    // Calculate payment amount: advance token or full fee
    const paymentAmount = isAdvanceOnly
      ? Math.min(booking.amount, Math.max(1000, Math.round(booking.amount * 0.5)))
      : booking.amount;

    // Create temporary transaction reference
    const tempTrxId = `INIT_${(gateway as string).toUpperCase().slice(0, 3)}_${Date.now().toString().slice(-6)}`;

    // Create pending payment in database
    const [pendingPayment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        method: gateway as string,
        transactionId: tempTrxId,
        amount: paymentAmount,
        status: 'initiated',
      })
      .returning();

    // Determine host callback base URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1:3000';
    const callbackBaseUrl = `${protocol}://${host}`;

    // Initiate gateway session
    const session = await gatewayManager.initiatePayment({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      turfName,
      amount: paymentAmount,
      gateway: gateway as SupportedGateway,
      customerName: customerName || 'TurfBD Player',
      customerPhone: customerPhone || '01711234567',
      customerEmail: customerEmail || 'player@turfbd.com',
      callbackBaseUrl,
    });

    // Update payment record with gateway payment reference
    await db
      .update(payments)
      .set({
        transactionId: session.gatewayPaymentId || tempTrxId,
        status: 'initiated',
      })
      .where(eq(payments.id, pendingPayment.id));

    return res.status(201).json({
      success: true,
      paymentId: pendingPayment.id,
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      amount: paymentAmount,
      currency: 'BDT',
      gateway,
      redirectUrl: session.redirectUrl,
      gatewayPaymentId: session.gatewayPaymentId,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    console.error('Failed to initiate payment:', error);
    return res.status(500).json({ error: 'Failed to initiate payment gateway session' });
  }
});

/**
 * 2. POST /api/payments/verify
 * Server-side payment verification
 * Security:
 * - Checks 15-minute timeout window
 * - Prevents duplicate transaction IDs
 * - Calls server-side gateway verification
 * - Locks slot and updates booking only after verified success
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const {
      paymentId,
      bookingId,
      gateway = 'bkash',
      transactionId,
      valId,
      paymentRefId,
      amount,
    } = req.body;

    if (!paymentId && !bookingId) {
      return res.status(400).json({ error: 'paymentId or bookingId is required for verification' });
    }

    // 1. Fetch payment record
    let paymentRecord: typeof payments.$inferSelect | undefined;
    if (paymentId) {
      const [p] = await db.select().from(payments).where(eq(payments.id, Number(paymentId)));
      paymentRecord = p;
    } else if (bookingId) {
      const [p] = await db
        .select()
        .from(payments)
        .where(eq(payments.bookingId, Number(bookingId)))
        .orderBy(desc(payments.createdAt));
      paymentRecord = p;
    }

    if (!paymentRecord) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // 2. Fetch associated booking
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, paymentRecord.bookingId));
    if (!booking) {
      return res.status(404).json({ error: 'Associated booking not found' });
    }

    // 3. Security: Check for payment timeout (> 15 minutes)
    if (gatewayManager.isPaymentTimedOut(paymentRecord.createdAt)) {
      await db
        .update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.id, paymentRecord.id));

      return res.status(400).json({
        success: false,
        verified: false,
        status: 'failed',
        error: 'Payment session has timed out (expired after 15 minutes). Please initiate a new payment.',
      });
    }

    // 4. Security: Amount Tampering Detection
    // The payment amount must strictly match the database record created during initiation
    if (amount !== undefined && amount !== null && amount !== '') {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || Math.abs(parsedAmount - paymentRecord.amount) > 0.01) {
        await db
          .update(payments)
          .set({ status: 'failed' })
          .where(eq(payments.id, paymentRecord.id));

        return res.status(400).json({
          success: false,
          verified: false,
          status: 'failed',
          error: `Security Alert: Amount tampering detected. Expected ৳${paymentRecord.amount} but received ৳${parsedAmount}.`,
        });
      }
    }

    // 5. Security: Check for duplicate transaction ID (both in memory and database)
    const candidateTrxId = transactionId || paymentRecord.transactionId;
    if (candidateTrxId && !candidateTrxId.startsWith('INIT_')) {
      // Check in-memory ledger
      if (gatewayManager.isDuplicateTransaction(candidateTrxId)) {
        if (paymentRecord.status === 'successful' || paymentRecord.status === 'completed') {
          return res.json({
            success: true,
            verified: true,
            status: 'successful',
            payment: paymentRecord,
            booking,
            message: 'Payment already verified successfully.',
          });
        }

        return res.status(409).json({
          success: false,
          verified: false,
          status: 'failed',
          error: 'Security Alert: This transaction ID has already been redeemed for another booking.',
        });
      }

      // Check PostgreSQL database ledger for existing successful payments with this trxId
      const [existingDbPayment] = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.transactionId, candidateTrxId),
            eq(payments.status, 'successful')
          )
        );

      if (existingDbPayment && existingDbPayment.id !== paymentRecord.id) {
        return res.status(409).json({
          success: false,
          verified: false,
          status: 'failed',
          error: 'Security Alert: This transaction ID has already been redeemed for another booking in the database.',
        });
      }
    }

    // 6. Server-to-server gateway verification (strictly enforce database paymentRecord amount)
    const expectedAmount = paymentRecord.amount;
    const verification = await gatewayManager.verifyPayment({
      gateway: (gateway || paymentRecord.method) as SupportedGateway,
      paymentId: paymentRefId || paymentRecord.transactionId,
      transactionId: candidateTrxId,
      valId,
      expectedAmount,
      bookingId: booking.id,
    });

    if (!verification.verified || verification.status !== 'successful') {
      // Mark payment failed in DB
      await db
        .update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.id, paymentRecord.id));

      return res.status(400).json({
        success: false,
        verified: false,
        status: 'failed',
        error: verification.message || 'Payment verification failed with provider.',
      });
    }

    // 6. Security verification PASSED: Update payment in DB
    const finalTrxId = verification.transactionId || candidateTrxId;
    const [updatedPayment] = await db
      .update(payments)
      .set({
        transactionId: finalTrxId,
        amount: verification.amount,
        status: 'successful',
      })
      .where(eq(payments.id, paymentRecord.id))
      .returning();

    // 7. Update booking financial ledger and lock slot
    const newAdvancePaid = booking.advancePaid + verification.amount;
    const newDueAmount = Math.max(0, booking.amount - newAdvancePaid);
    const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

    // Append structured audit log to booking notes
    let notesData: any = {};
    if (booking.notes) {
      try {
        notesData = JSON.parse(booking.notes);
      } catch {
        notesData = { originalNotes: booking.notes };
      }
    }

    const auditTrail = notesData.auditLogs || [];
    auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_VERIFIED',
      gateway: paymentRecord.method,
      trxId: finalTrxId,
      amount: verification.amount,
      status: 'successful',
      message: verification.message,
    });

    notesData.gateway = paymentRecord.method;
    notesData.verifiedTrxId = finalTrxId;
    notesData.paymentVerifiedAt = new Date().toISOString();
    notesData.auditLogs = auditTrail;

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        advancePaid: newAdvancePaid,
        dueAmount: newDueAmount,
        paymentStatus: newPaymentStatus,
        bookingStatus: 'confirmed',
        notes: JSON.stringify(notesData),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    // 8. Lock slot in PostgreSQL
    if (booking.slotId) {
      await db
        .update(slots)
        .set({ status: 'booked' })
        .where(eq(slots.id, booking.slotId));
    } else {
      const [matchingSlot] = await db
        .select()
        .from(slots)
        .where(
          and(
            eq(slots.turfId, booking.turfId),
            eq(slots.date, booking.bookingDate),
            eq(slots.startTime, booking.startTime)
          )
        );
      if (matchingSlot) {
        await db.update(slots).set({ status: 'booked' }).where(eq(slots.id, matchingSlot.id));
        await db.update(bookings).set({ slotId: matchingSlot.id }).where(eq(bookings.id, booking.id));
      }
    }

    return res.json({
      success: true,
      verified: true,
      status: 'successful',
      payment: updatedPayment,
      booking: updatedBooking,
      message: 'Transaction successfully verified and match slot locked.',
    });
  } catch (error: any) {
    console.error('Failed to verify payment:', error);
    return res.status(500).json({ error: 'Server payment verification error' });
  }
});

/**
 * 3. Gateway Callbacks & IPN Handlers
 */

// bKash Callback
router.all('/bkash/callback', async (req: Request, res: Response) => {
  const query = { ...req.query, ...req.body };
  const { paymentID, status, amount } = query as any;

  if (!paymentID) {
    return res.redirect(`/?paymentStatus=failed&gateway=bkash&error=missing_payment_id`);
  }
  if (status === 'cancel') {
    return res.redirect(`/?paymentStatus=cancelled&gateway=bkash`);
  }
  if (status === 'failure') {
    return res.redirect(`/?paymentStatus=failed&gateway=bkash`);
  }

  // If status is success or completed, redirect to app with verification token
  return res.redirect(
    `/?paymentStatus=success&gateway=bkash&paymentID=${paymentID || ''}&amount=${amount || ''}`
  );
});

// Nagad Callback
router.all('/nagad/callback', async (req: Request, res: Response) => {
  const query = { ...req.query, ...req.body };
  const { payment_ref_id, status, order_id, amount } = query as any;

  if (!payment_ref_id) {
    return res.redirect(`/?paymentStatus=failed&gateway=nagad&error=missing_reference`);
  }
  if (status === 'cancel') {
    return res.redirect(`/?paymentStatus=cancelled&gateway=nagad`);
  }
  if (status === 'failed') {
    return res.redirect(`/?paymentStatus=failed&gateway=nagad`);
  }

  return res.redirect(
    `/?paymentStatus=success&gateway=nagad&payment_ref_id=${payment_ref_id || ''}&order_id=${order_id || ''}&amount=${amount || ''}`
  );
});

// SSLCommerz Success Callback
router.post('/sslcommerz/success', async (req: Request, res: Response) => {
  const { val_id, tran_id, amount } = req.body;
  if (!val_id || !tran_id) {
    return res.redirect(`/?paymentStatus=failed&gateway=sslcommerz&error=missing_transaction_identifiers`);
  }
  return res.redirect(
    `/?paymentStatus=success&gateway=sslcommerz&val_id=${val_id || ''}&tran_id=${tran_id || ''}&amount=${amount || ''}`
  );
});

// SSLCommerz Fail & Cancel Callbacks
router.post('/sslcommerz/fail', async (_req: Request, res: Response) => {
  return res.redirect(`/?paymentStatus=failed&gateway=sslcommerz`);
});

router.post('/sslcommerz/cancel', async (_req: Request, res: Response) => {
  return res.redirect(`/?paymentStatus=cancelled&gateway=sslcommerz`);
});

// SSLCommerz IPN (Instant Payment Notification) listener
router.post('/sslcommerz/ipn', async (req: Request, res: Response) => {
  try {
    const { val_id, tran_id, status } = req.body;
    if (!val_id || !tran_id) {
      return res.status(400).json({ error: 'Invalid IPN: Missing val_id or tran_id' });
    }
    if (status !== 'VALID' && status !== 'VALIDATED') {
      return res.status(400).json({ error: 'Invalid IPN: Status is not VALID' });
    }
    console.log(`[SSLCommerz IPN] Received valid transaction: ${tran_id} (Val: ${val_id})`);
    return res.status(200).json({ status: 'IPN_RECEIVED_OK', val_id, tran_id });
  } catch {
    return res.status(500).json({ error: 'IPN_PROCESSING_FAILED' });
  }
});

/**
 * 4. POST /api/payments/refund
 * Admin / Owner payment refund processing
 */
router.post('/refund', requireAuth, async (req: Request, res: Response) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    const [payment] = await db.select().from(payments).where(eq(payments.id, Number(paymentId)));
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Role check: Only admin or the turf owner can issue refunds
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
    if (req.user!.role !== 'admin' && turf?.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: Only venue owner or admin can issue refunds.' });
    }

    const refundAmount = Number(amount) || payment.amount;

    // Call gateway refund service
    const refundResult = await gatewayManager.refundPayment(payment.method as SupportedGateway, {
      paymentId: payment.transactionId,
      amount: refundAmount,
      trxId: payment.transactionId,
      reason: reason || 'Customer booking cancellation',
    });

    // Update payment record in database
    const [updatedPayment] = await db
      .update(payments)
      .set({ status: 'refunded' })
      .where(eq(payments.id, payment.id))
      .returning();

    // Update booking notes with refund metadata
    let notesData: any = {};
    if (booking.notes) {
      try {
        notesData = JSON.parse(booking.notes);
      } catch {
        notesData = { originalNotes: booking.notes };
      }
    }

    notesData.refundStatus = 'refunded';
    notesData.refundAmount = refundAmount;
    notesData.refundTrxId = refundResult.refundTrxId;
    notesData.refundReason = reason || 'Booking cancellation';
    notesData.refundedAt = new Date().toISOString();

    const auditTrail = notesData.auditLogs || [];
    auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'PAYMENT_REFUNDED',
      gateway: payment.method,
      refundTrxId: refundResult.refundTrxId,
      amount: refundAmount,
      status: 'refunded',
      reason,
    });
    notesData.auditLogs = auditTrail;

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        paymentStatus: 'refunded',
        bookingStatus: 'cancelled',
        notes: JSON.stringify(notesData),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    // Unlock the slot back to available
    if (booking.slotId) {
      await db
        .update(slots)
        .set({ status: 'available' })
        .where(eq(slots.id, booking.slotId));
    }

    return res.json({
      success: true,
      status: 'refunded',
      refundTrxId: refundResult.refundTrxId,
      payment: updatedPayment,
      booking: updatedBooking,
      message: 'Payment refund processed successfully.',
    });
  } catch (error: any) {
    console.error('Failed to process refund:', error);
    return res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * 5. GET /api/payments
 * Global payments audit ledger (joined with booking and turf info)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, method, turfId, userId } = req.query;

    const query = db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        method: payments.method,
        transactionId: payments.transactionId,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        bookingCode: bookings.bookingCode,
        turfId: bookings.turfId,
        turfName: turfs.turfName,
        userId: bookings.userId,
        userName: users.name,
        userPhone: users.phone,
        userEmail: users.email,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        bookingStatus: bookings.bookingStatus,
        notes: bookings.notes,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(payments.createdAt));

    const rawPayments = await query;

    const filtered = rawPayments.filter((p) => {
      if (status && status !== 'all' && p.status !== status) return false;
      if (method && method !== 'all' && p.method !== method) return false;
      if (turfId && turfId !== 'all' && String(p.turfId) !== String(turfId)) return false;
      if (userId && String(p.userId) !== String(userId)) return false;
      return true;
    });

    return res.json(filtered);
  } catch (error: any) {
    console.error('Failed to get payments:', error);
    return res.status(500).json({ error: 'Failed to retrieve payments' });
  }
});

/**
 * 6. GET /api/payments/owner
 * Owner Revenue & Received Payments Breakdown
 */
router.get('/owner', requireOwner, async (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const isSuperAdmin = req.user!.role === 'admin';

    // Fetch owner's turfs
    const ownerTurfs = isSuperAdmin
      ? await db.select().from(turfs)
      : await db.select().from(turfs).where(eq(turfs.ownerId, ownerId));

    const ownerTurfIds = ownerTurfs.map((t) => t.id);
    if (ownerTurfIds.length === 0) {
      return res.json({
        summary: {
          totalGrossRevenue: 0,
          onlineAdvanceCollected: 0,
          pendingGroundDue: 0,
          platformCommission: 0,
          netPayoutOwed: 0,
          successfulCount: 0,
        },
        gatewayBreakdown: { bkash: 0, nagad: 0, sslcommerz: 0, cash: 0 },
        payments: [],
      });
    }

    const allPayments = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        method: payments.method,
        transactionId: payments.transactionId,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        bookingCode: bookings.bookingCode,
        turfId: bookings.turfId,
        turfName: turfs.turfName,
        userId: bookings.userId,
        userName: users.name,
        userPhone: users.phone,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        dueAmount: bookings.dueAmount,
        bookingTotalAmount: bookings.amount,
        bookingStatus: bookings.bookingStatus,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(inArray(bookings.turfId, ownerTurfIds))
      .orderBy(desc(payments.createdAt));

    // Calculate revenue metrics
    let totalGrossRevenue = 0;
    let onlineAdvanceCollected = 0;
    let successfulCount = 0;
    const gatewayBreakdown = { bkash: 0, nagad: 0, sslcommerz: 0, cash: 0 };

    for (const p of allPayments) {
      if (p.status === 'successful' || p.status === 'completed') {
        successfulCount++;
        totalGrossRevenue += p.amount;

        const m = (p.method || '').toLowerCase();
        if (m.includes('bkash')) {
          onlineAdvanceCollected += p.amount;
          gatewayBreakdown.bkash += p.amount;
        } else if (m.includes('nagad')) {
          onlineAdvanceCollected += p.amount;
          gatewayBreakdown.nagad += p.amount;
        } else if (m.includes('ssl')) {
          onlineAdvanceCollected += p.amount;
          gatewayBreakdown.sslcommerz += p.amount;
        } else {
          gatewayBreakdown.cash += p.amount;
        }
      }
    }

    // Ground dues pending calculation from active bookings
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(and(inArray(bookings.turfId, ownerTurfIds), eq(bookings.bookingStatus, 'confirmed')));

    const pendingGroundDue = activeBookings.reduce((acc, b) => acc + (b.dueAmount || 0), 0);
    const platformCommission = Math.round(onlineAdvanceCollected * PLATFORM_COMMISSION_RATE);
    const netPayoutOwed = Math.max(0, onlineAdvanceCollected - platformCommission);

    return res.json({
      summary: {
        totalGrossRevenue,
        onlineAdvanceCollected,
        pendingGroundDue,
        platformCommission,
        netPayoutOwed,
        successfulCount,
      },
      gatewayBreakdown,
      payments: allPayments,
    });
  } catch (error: any) {
    console.error('Failed to get owner revenue data:', error);
    return res.status(500).json({ error: 'Failed to retrieve owner revenue breakdown' });
  }
});

/**
 * 7. GET /api/payments/admin/audit
 * Admin Total Transaction Monitoring, Commission Calculation & Audit Log
 */
router.get('/admin/audit', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allPayments = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        method: payments.method,
        transactionId: payments.transactionId,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        bookingCode: bookings.bookingCode,
        turfId: bookings.turfId,
        turfName: turfs.turfName,
        userId: bookings.userId,
        userName: users.name,
        userPhone: users.phone,
        bookingDate: bookings.bookingDate,
        bookingStatus: bookings.bookingStatus,
        notes: bookings.notes,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(payments.createdAt));

    let totalVolume = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let refundedCount = 0;

    const gatewayStats = {
      bkash: { count: 0, volume: 0 },
      nagad: { count: 0, volume: 0 },
      sslcommerz: { count: 0, volume: 0 },
      cash: { count: 0, volume: 0 },
    };

    for (const p of allPayments) {
      const isSuccess = p.status === 'successful' || p.status === 'completed';
      if (isSuccess) {
        successfulCount++;
        totalVolume += p.amount;

        const m = (p.method || '').toLowerCase();
        if (m.includes('bkash')) {
          gatewayStats.bkash.count++;
          gatewayStats.bkash.volume += p.amount;
        } else if (m.includes('nagad')) {
          gatewayStats.nagad.count++;
          gatewayStats.nagad.volume += p.amount;
        } else if (m.includes('ssl')) {
          gatewayStats.sslcommerz.count++;
          gatewayStats.sslcommerz.volume += p.amount;
        } else {
          gatewayStats.cash.count++;
          gatewayStats.cash.volume += p.amount;
        }
      } else if (p.status === 'failed') {
        failedCount++;
      } else if (p.status === 'refunded') {
        refundedCount++;
      }
    }

    const totalCommissionEarned = Math.round(totalVolume * PLATFORM_COMMISSION_RATE);

    return res.json({
      kpis: {
        totalVolume,
        totalCommissionEarned,
        commissionRate: `${PLATFORM_COMMISSION_RATE * 100}%`,
        successfulCount,
        failedCount,
        refundedCount,
        totalTransactions: allPayments.length,
      },
      gatewayStats,
      auditLogs: allPayments,
    });
  } catch (error: any) {
    console.error('Failed to get admin audit data:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin payment audit' });
  }
});

/**
 * 8. Backward Compatibility POST /api/payments
 * Direct manual payment recording (e.g. paying cash balance at the pitch)
 * Requires auth and only allows venue owner or admin
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId, method = 'cash', amount, transactionId } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'bookingId and amount are required' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(bookingId)));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Role check: Only admin or the turf owner can record manual payments
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
    if (req.user!.role !== 'admin' && turf?.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: Only venue owner or admin can record manual payments.' });
    }

    const trxId =
      transactionId ||
      (method || 'cash').toUpperCase().slice(0, 3) + Math.random().toString(36).substring(2, 10).toUpperCase();

    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: Number(bookingId),
        method: method || 'cash',
        transactionId: trxId,
        amount: Number(amount),
        status: 'successful',
      })
      .returning();

    // Update booking due amount and payment status
    const newAdvancePaid = booking.advancePaid + Number(amount);
    const newDueAmount = Math.max(0, booking.amount - newAdvancePaid);
    const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

    await db
      .update(bookings)
      .set({
        advancePaid: newAdvancePaid,
        dueAmount: newDueAmount,
        paymentStatus: newPaymentStatus,
      })
      .where(eq(bookings.id, Number(bookingId)));

    return res.status(201).json(payment);
  } catch (error: any) {
    console.error('Failed to process payment:', error);
    return res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router;
