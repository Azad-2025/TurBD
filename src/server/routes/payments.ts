import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../db/index.ts';
import { payments, bookings, turfs, slots, users, invoices, payouts, auditLogs, disputes } from '../../db/schema.ts';
import { eq, desc, and, inArray, gt } from 'drizzle-orm';
import { requireAuth, requireOwner, requireAdmin } from '../middleware/auth.ts';
import { gatewayManager, SupportedGateway } from '../services/gateways/gatewayManager.ts';
import { sslcommerzGateway } from '../services/gateways/sslcommerz.ts';
import { realtimeBroadcaster } from '../services/realtime.ts';
import { notificationService } from '../services/notificationService.ts';
import { invoiceService } from '../services/invoiceService.ts';

const router = Router();

// Platform commission percentage (e.g. 5% platform fee)
const PLATFORM_COMMISSION_RATE = 0.05;

/**
 * 1. POST /api/payments/initiate
 * Customer creates a pending checkout transaction with bKash, Nagad, or SSLCommerz
 * Security:
 * - Duplicate payment prevention (checks if booking is already paid)
 * - Idempotency key tracking to avoid double charges on network retry
 * - Pre-allocates gateway payment ID and links to booking ID
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
      idempotencyKey,
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

    // Duplicate payment prevention: Check if booking is already paid in full
    if (booking.bookingStatus === 'confirmed' && (booking.paymentStatus === 'paid' || booking.dueAmount === 0)) {
      return res.status(400).json({ error: 'This booking has already been paid in full.' });
    }

    // Idempotency check: Check if this idempotency key was already initiated or succeeded
    const finalIdempotencyKey =
      idempotencyKey || `IDEM_${booking.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (idempotencyKey) {
      const [existingPayment] = await db
        .select()
        .from(payments)
        .where(eq(payments.idempotencyKey, idempotencyKey));

      if (existingPayment) {
        if (existingPayment.status === 'successful') {
          return res.json({
            success: true,
            idempotent: true,
            paymentId: existingPayment.id,
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            amount: existingPayment.amount,
            status: 'successful',
            message: 'Payment already verified and completed for this transaction request.',
          });
        }
      }
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
    const turfName = turf ? turf.turfName : 'TurfBD Arena';

    // Calculate payment amount: advance token or full fee
    const paymentAmount = isAdvanceOnly
      ? Math.min(booking.amount, Math.max(1000, Math.round(booking.amount * 0.5)))
      : booking.amount;

    // Create temporary transaction reference
    const tempTrxId = `INIT_${(gateway as string).toUpperCase().slice(0, 3)}_${Date.now().toString().slice(-6)}`;

    // Create pending payment in database with idempotency key
    const [pendingPayment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        method: gateway as string,
        transactionId: tempTrxId,
        gatewayPaymentId: tempTrxId,
        idempotencyKey: finalIdempotencyKey,
        amount: paymentAmount,
        currency: 'BDT',
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
      customerName: customerName || (req as any).user?.name || 'Customer',
      customerPhone: customerPhone || (req as any).user?.phone || '',
      customerEmail: customerEmail || (req as any).user?.email || '',
      callbackBaseUrl,
    });

    // Update payment record with gateway payment reference
    await db
      .update(payments)
      .set({
        transactionId: session.gatewayPaymentId || tempTrxId,
        gatewayPaymentId: session.gatewayPaymentId || tempTrxId,
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
      idempotencyKey: finalIdempotencyKey,
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
          error: `Security Alert: Amount tampering detected. Expected BDT ${paymentRecord.amount} but received BDT ${parsedAmount}.`,
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

      // Trigger user and admin notifications for payment failure
      notificationService.notifyPaymentFailed({
        userId: booking.userId,
        bookingId: booking.id,
        gateway: (paymentRecord.method as any) || 'bkash',
        reason: verification.message || 'Payment verification failed with provider.',
      }).catch((e) => console.error('Notification error:', e));

      notificationService.notifyAdminPaymentIssue({
        bookingId: booking.id,
        gateway: paymentRecord.method,
        errorDetail: verification.message || 'Payment verification failed with provider.',
      }).catch((e) => console.error('Admin notification error:', e));

      return res.status(400).json({
        success: false,
        verified: false,
        status: 'failed',
        error: verification.message || 'Payment verification failed with provider.',
      });
    }

    // 6. Security verification PASSED: Update payment in DB with gateway audit fields
    const finalTrxId = verification.transactionId || candidateTrxId;
    const [updatedPayment] = await db
      .update(payments)
      .set({
        transactionId: finalTrxId,
        gatewayPaymentId: verification.gatewayPaymentId || paymentRecord.gatewayPaymentId,
        amount: verification.amount,
        currency: verification.currency || 'BDT',
        status: 'successful',
        gatewayResponse: verification.gatewayRaw || null,
        errorMessage: null,
        updatedAt: new Date(),
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

    // 8. Generate tamper-proof digital tax invoice
    let generatedInvoice = null;
    try {
      generatedInvoice = await invoiceService.createOrUpdateInvoice(booking.id, updatedPayment.id);
    } catch (invErr) {
      console.warn('Non-fatal invoice generation notice:', invErr);
    }

    // 9. Lock slot in PostgreSQL
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

    // Realtime broadcast to update customer and owner interfaces immediately
    realtimeBroadcaster.notifyTurfSlotChange({
      turfId: booking.turfId,
      date: booking.bookingDate,
      startTime: booking.startTime,
      status: 'booked',
    });
    realtimeBroadcaster.notifyBookingStatusChange({
      bookingId: updatedBooking.id,
      bookingCode: updatedBooking.bookingCode,
      turfId: booking.turfId,
      status: 'confirmed',
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
    });

    // Dispatch instant notifications to Customer and Venue Owner
    try {
      const [venueTurf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
      const [bookingUser] = await db.select().from(users).where(eq(users.id, booking.userId));

      // 1. Customer notification (Booking Confirmed + Payment Success)
      notificationService.notifyBookingConfirmed({
        userId: booking.userId,
        bookingId: updatedBooking.id,
        bookingCode: updatedBooking.bookingCode,
        turfName: venueTurf?.turfName || 'TurfBD Arena',
        date: booking.bookingDate,
        timeSlot: `${booking.startTime} - ${booking.endTime}`,
        paymentStatus: newPaymentStatus === 'paid' ? 'Paid in Full' : 'Token Advance Paid',
        tokenPaid: newAdvancePaid,
        remainingDue: newDueAmount,
        location: venueTurf?.address || 'Dhaka, Bangladesh',
        userPhone: bookingUser?.phone,
      }).catch((e) => console.error('Notification error:', e));

      notificationService.notifyPaymentSuccess({
        userId: booking.userId,
        bookingId: updatedBooking.id,
        bookingCode: updatedBooking.bookingCode,
        amount: verification.amount,
        gateway: (paymentRecord.method as any) || 'bkash',
        transactionId: finalTrxId,
        turfName: venueTurf?.turfName || 'TurfBD Arena',
      }).catch((e) => console.error('Notification error:', e));

      // 2. Turf Owner notifications
      if (venueTurf?.ownerId) {
        notificationService.notifyOwnerNewBooking({
          ownerId: venueTurf.ownerId,
          turfId: venueTurf.id,
          turfName: venueTurf.turfName,
          bookingId: updatedBooking.id,
          customerName: bookingUser?.name || 'Customer',
          customerPhone: bookingUser?.phone || '',
          date: booking.bookingDate,
          timeSlot: `${booking.startTime} - ${booking.endTime}`,
          tokenPaid: verification.amount,
          remainingDue: newDueAmount,
        }).catch((e) => console.error('Owner notification error:', e));

        notificationService.notifyOwnerAdvancePaid({
          ownerId: venueTurf.ownerId,
          turfName: venueTurf.turfName,
          bookingId: updatedBooking.id,
          amount: verification.amount,
          gateway: paymentRecord.method,
        }).catch((e) => console.error('Owner notification error:', e));
      }
    } catch (notifyErr) {
      console.warn('Non-fatal error dispatching notifications:', notifyErr);
    }

    return res.json({
      success: true,
      verified: true,
      status: 'successful',
      payment: updatedPayment,
      booking: updatedBooking,
      invoice: generatedInvoice,
      invoiceNumber: generatedInvoice?.invoiceNumber,
      message: 'Transaction successfully verified, invoice generated, and match slot locked.',
    });
  } catch (error: any) {
    console.error('Failed to verify payment:', error);
    return res.status(500).json({ error: 'Server payment verification error' });
  }
});

/**
 * 3. Gateway Callbacks & IPN Handlers
 */

// bKash Callback Handler (Server verifies payment before redirecting to UI)
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

  try {
    // Look up initiated payment by paymentID
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, paymentID));

    if (paymentRecord) {
      const verification = await gatewayManager.verifyPayment({
        gateway: 'bkash',
        paymentId: paymentID,
        expectedAmount: paymentRecord.amount,
        bookingId: paymentRecord.bookingId,
      });

      if (verification.verified && verification.status === 'successful') {
        const finalTrxId = verification.transactionId || paymentID;
        const [updatedPayment] = await db
          .update(payments)
          .set({
            transactionId: finalTrxId,
            gatewayPaymentId: paymentID,
            status: 'successful',
            gatewayResponse: verification.gatewayRaw || null,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, paymentRecord.id))
          .returning();

        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, paymentRecord.bookingId));

        if (booking) {
          const newAdvancePaid = booking.advancePaid + verification.amount;
          const newDueAmount = Math.max(0, booking.amount - newAdvancePaid);
          const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

          await db
            .update(bookings)
            .set({
              advancePaid: newAdvancePaid,
              dueAmount: newDueAmount,
              paymentStatus: newPaymentStatus,
              bookingStatus: 'confirmed',
            })
            .where(eq(bookings.id, booking.id));

          if (booking.slotId) {
            await db.update(slots).set({ status: 'booked' }).where(eq(slots.id, booking.slotId));
          }

          const invoice = await invoiceService.createOrUpdateInvoice(booking.id, updatedPayment.id);

          return res.redirect(
            `/?paymentStatus=success&gateway=bkash&bookingId=${booking.id}&trxId=${finalTrxId}&invoiceNumber=${invoice?.invoiceNumber || ''}`
          );
        }
      }
    }
  } catch (callbackErr) {
    console.warn('[bKash Callback] Verification handling notice:', callbackErr);
  }

  // Fallback redirect with verification query parameters
  return res.redirect(
    `/?paymentStatus=success&gateway=bkash&paymentID=${paymentID || ''}&amount=${amount || ''}`
  );
});

// Nagad Callback Handler
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

  try {
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, payment_ref_id));

    if (paymentRecord) {
      const verification = await gatewayManager.verifyPayment({
        gateway: 'nagad',
        paymentId: payment_ref_id,
        expectedAmount: paymentRecord.amount,
        bookingId: paymentRecord.bookingId,
      });

      if (verification.verified && verification.status === 'successful') {
        const finalTrxId = verification.transactionId || payment_ref_id;
        const [updatedPayment] = await db
          .update(payments)
          .set({
            transactionId: finalTrxId,
            gatewayPaymentId: payment_ref_id,
            status: 'successful',
            gatewayResponse: verification.gatewayRaw || null,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, paymentRecord.id))
          .returning();

        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, paymentRecord.bookingId));

        if (booking) {
          const newAdvancePaid = booking.advancePaid + verification.amount;
          const newDueAmount = Math.max(0, booking.amount - newAdvancePaid);
          const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

          await db
            .update(bookings)
            .set({
              advancePaid: newAdvancePaid,
              dueAmount: newDueAmount,
              paymentStatus: newPaymentStatus,
              bookingStatus: 'confirmed',
            })
            .where(eq(bookings.id, booking.id));

          if (booking.slotId) {
            await db.update(slots).set({ status: 'booked' }).where(eq(slots.id, booking.slotId));
          }

          const invoice = await invoiceService.createOrUpdateInvoice(booking.id, updatedPayment.id);

          return res.redirect(
            `/?paymentStatus=success&gateway=nagad&bookingId=${booking.id}&trxId=${finalTrxId}&invoiceNumber=${invoice?.invoiceNumber || ''}`
          );
        }
      }
    }
  } catch (nagadErr) {
    console.warn('[Nagad Callback] Verification handling notice:', nagadErr);
  }

  return res.redirect(
    `/?paymentStatus=success&gateway=nagad&payment_ref_id=${payment_ref_id || ''}&order_id=${order_id || ''}&amount=${amount || ''}`
  );
});

// SSLCommerz Success Callback Handler
router.post('/sslcommerz/success', async (req: Request, res: Response) => {
  const { val_id, tran_id, amount } = req.body;
  if (!val_id || !tran_id) {
    return res.redirect(`/?paymentStatus=failed&gateway=sslcommerz&error=missing_transaction_identifiers`);
  }

  try {
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, tran_id));

    if (paymentRecord) {
      const verification = await gatewayManager.verifyPayment({
        gateway: 'sslcommerz',
        valId: val_id,
        transactionId: tran_id,
        expectedAmount: paymentRecord.amount,
        bookingId: paymentRecord.bookingId,
      });

      if (verification.verified && verification.status === 'successful') {
        const [updatedPayment] = await db
          .update(payments)
          .set({
            transactionId: verification.transactionId || tran_id,
            gatewayPaymentId: val_id,
            status: 'successful',
            ipnVerified: true,
            gatewayResponse: verification.gatewayRaw || null,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, paymentRecord.id))
          .returning();

        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, paymentRecord.bookingId));

        if (booking) {
          const newAdvancePaid = booking.advancePaid + verification.amount;
          const newDueAmount = Math.max(0, booking.amount - newAdvancePaid);
          const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

          await db
            .update(bookings)
            .set({
              advancePaid: newAdvancePaid,
              dueAmount: newDueAmount,
              paymentStatus: newPaymentStatus,
              bookingStatus: 'confirmed',
            })
            .where(eq(bookings.id, booking.id));

          if (booking.slotId) {
            await db.update(slots).set({ status: 'booked' }).where(eq(slots.id, booking.slotId));
          }

          const invoice = await invoiceService.createOrUpdateInvoice(booking.id, updatedPayment.id);

          return res.redirect(
            `/?paymentStatus=success&gateway=sslcommerz&bookingId=${booking.id}&trxId=${verification.transactionId || tran_id}&invoiceNumber=${invoice?.invoiceNumber || ''}`
          );
        }
      }
    }
  } catch (sslErr) {
    console.warn('[SSLCommerz Callback] Verification error:', sslErr);
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

// SSLCommerz IPN (Instant Payment Notification) Webhook
router.post('/sslcommerz/ipn', async (req: Request, res: Response) => {
  try {
    const { val_id, tran_id, status, amount } = req.body;
    if (!val_id || !tran_id) {
      return res.status(400).json({ error: 'Invalid IPN: Missing val_id or tran_id' });
    }

    const ipnValidation = await sslcommerzGateway.verifyIPN(req.body);
    if (!ipnValidation.valid) {
      return res.status(400).json({ error: 'Invalid IPN: Signature or Order Validation failed' });
    }

    // Locate payment record
    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, tran_id));

    if (paymentRecord && paymentRecord.status !== 'successful') {
      const [updatedPayment] = await db
        .update(payments)
        .set({
          transactionId: ipnValidation.data?.bankTranId || tran_id,
          gatewayPaymentId: val_id,
          status: 'successful',
          ipnVerified: true,
          gatewayResponse: ipnValidation.data || req.body,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentRecord.id))
        .returning();

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, paymentRecord.bookingId));

      if (booking) {
        const verifiedAmount = Number(amount) || paymentRecord.amount;
        const newAdvancePaid = booking.advancePaid + verifiedAmount;
        const newDueAmount = Math.max(0, booking.amount - newAdvancePaid);
        const newPaymentStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

        await db
          .update(bookings)
          .set({
            advancePaid: newAdvancePaid,
            dueAmount: newDueAmount,
            paymentStatus: newPaymentStatus,
            bookingStatus: 'confirmed',
          })
          .where(eq(bookings.id, booking.id));

        if (booking.slotId) {
          await db.update(slots).set({ status: 'booked' }).where(eq(slots.id, booking.slotId));
        }

        await invoiceService.createOrUpdateInvoice(booking.id, updatedPayment.id);
      }
    }

    console.log(`[SSLCommerz IPN] Successfully processed notification: ${tran_id} (Val: ${val_id})`);
    return res.status(200).json({ status: 'IPN_SUCCESS', val_id, tran_id });
  } catch (ipnErr) {
    console.error('[SSLCommerz IPN] Processing error:', ipnErr);
    return res.status(500).json({ error: 'IPN_PROCESSING_FAILED' });
  }
});

// bKash Webhook listener
router.post('/bkash/webhook', async (req: Request, res: Response) => {
  try {
    const { paymentID, trxID, amount } = req.body;
    if (!paymentID) {
      return res.status(400).json({ error: 'Missing paymentID' });
    }

    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, paymentID));

    if (paymentRecord && paymentRecord.status !== 'successful') {
      await db
        .update(payments)
        .set({
          transactionId: trxID || paymentID,
          gatewayPaymentId: paymentID,
          status: 'successful',
          ipnVerified: true,
          gatewayResponse: req.body,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentRecord.id));

      await invoiceService.createOrUpdateInvoice(paymentRecord.bookingId, paymentRecord.id);
    }

    return res.status(200).json({ status: 'BKASH_WEBHOOK_PROCESSED' });
  } catch (err) {
    return res.status(500).json({ error: 'BKASH_WEBHOOK_ERROR' });
  }
});

// Nagad IPN listener
router.post('/nagad/ipn', async (req: Request, res: Response) => {
  try {
    const { payment_ref_id, order_id } = req.body;
    if (!payment_ref_id) {
      return res.status(400).json({ error: 'Missing payment_ref_id' });
    }

    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, payment_ref_id));

    if (paymentRecord && paymentRecord.status !== 'successful') {
      await db
        .update(payments)
        .set({
          gatewayPaymentId: payment_ref_id,
          status: 'successful',
          ipnVerified: true,
          gatewayResponse: req.body,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentRecord.id));

      await invoiceService.createOrUpdateInvoice(paymentRecord.bookingId, paymentRecord.id);
    }

    return res.status(200).json({ status: 'NAGAD_IPN_PROCESSED' });
  } catch (err) {
    return res.status(500).json({ error: 'NAGAD_IPN_ERROR' });
  }
});

/**
 * 4. POST /api/payments/retry
 * Failed payment recovery mechanism
 * Allows customer to retry checkout session if a previous transaction failed or timed out
 */
router.post('/retry', async (req: Request, res: Response) => {
  try {
    const { bookingId, gateway = 'bkash', isAdvanceOnly = true } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(bookingId)));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ error: 'Cannot retry payment for a cancelled booking' });
    }

    if (booking.paymentStatus === 'paid' || booking.dueAmount === 0) {
      return res.status(400).json({ error: 'This booking has already been paid in full' });
    }

    // Clean up or flag previous failed payment attempts
    await db
      .update(payments)
      .set({ status: 'failed', errorMessage: 'Superceded by payment retry attempt' })
      .where(and(eq(payments.bookingId, booking.id), eq(payments.status, 'initiated')));

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));
    const turfName = turf ? turf.turfName : 'TurfBD Arena';

    const paymentAmount = isAdvanceOnly
      ? Math.min(booking.amount, Math.max(1000, Math.round(booking.amount * 0.5)))
      : booking.dueAmount || booking.amount;

    const retryTrxId = `RETRY_${(gateway as string).toUpperCase().slice(0, 3)}_${Date.now().toString().slice(-6)}`;
    const idempotencyKey = `RETRY_IDEM_${booking.id}_${Date.now()}`;

    const [newPendingPayment] = await db
      .insert(payments)
      .values({
        bookingId: booking.id,
        method: gateway as string,
        transactionId: retryTrxId,
        gatewayPaymentId: retryTrxId,
        idempotencyKey,
        amount: paymentAmount,
        currency: 'BDT',
        status: 'initiated',
      })
      .returning();

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1:3000';
    const callbackBaseUrl = `${protocol}://${host}`;

    const session = await gatewayManager.initiatePayment({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      turfName,
      amount: paymentAmount,
      gateway: gateway as SupportedGateway,
      customerName: 'TurfBD Player',
      customerPhone: '01711234567',
      customerEmail: 'player@turfbd.com',
      callbackBaseUrl,
    });

    await db
      .update(payments)
      .set({
        transactionId: session.gatewayPaymentId || retryTrxId,
        gatewayPaymentId: session.gatewayPaymentId || retryTrxId,
      })
      .where(eq(payments.id, newPendingPayment.id));

    return res.status(201).json({
      success: true,
      retry: true,
      paymentId: newPendingPayment.id,
      bookingId: booking.id,
      amount: paymentAmount,
      currency: 'BDT',
      gateway,
      redirectUrl: session.redirectUrl,
      gatewayPaymentId: session.gatewayPaymentId,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    console.error('Failed to retry payment:', error);
    return res.status(500).json({ error: 'Failed to initiate payment retry session' });
  }
});

/**
 * 5. POST /api/payments/refund
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

    // Financial Safety: Cannot refund an already refunded payment
    if (payment.status === 'refunded' || payment.refundStatus === 'refunded') {
      return res.status(400).json({ error: 'This payment has already been refunded.' });
    }

    const refundAmount = Number(amount) || payment.amount;
    // Strict Cap: refund amount cannot exceed collected advance/payment amount
    if (refundAmount <= 0 || refundAmount > payment.amount) {
      return res.status(400).json({
        error: `Refund amount must be between BDT 1 and BDT ${payment.amount.toLocaleString()} (actual collected amount).`,
      });
    }

    // Call gateway refund service
    const refundResult = await gatewayManager.refundPayment(payment.method as SupportedGateway, {
      paymentId: payment.gatewayPaymentId || payment.transactionId,
      amount: refundAmount,
      trxId: payment.transactionId,
      reason: reason || 'Customer booking cancellation',
    });

    // Update payment record in database with refund tracking
    const [updatedPayment] = await db
      .update(payments)
      .set({
        status: 'refunded',
        refundStatus: 'refunded',
        refundTrxId: refundResult.refundTrxId,
        refundAmount,
        refundReason: reason || 'Customer booking cancellation',
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    // Mark associated invoices as refunded
    await db
      .update(invoices)
      .set({
        status: 'refunded',
      })
      .where(eq(invoices.bookingId, booking.id));

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

    // Trigger refund notifications
    try {
      notificationService.notifyRefundCompleted({
        userId: booking.userId,
        bookingId: booking.id,
        amount: refundAmount,
        gateway: payment.method,
        refundRef: refundResult.refundTrxId || payment.transactionId,
      }).catch((e) => console.error('Notification error:', e));

      notificationService.notifyBookingCancelled({
        userId: booking.userId,
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        turfName: turf?.turfName || 'TurfBD Arena',
        date: booking.bookingDate,
        timeSlot: `${booking.startTime} - ${booking.endTime}`,
        refundAmount,
      }).catch((e) => console.error('Notification error:', e));

      if (turf?.ownerId) {
        notificationService.notifyOwnerCancellation({
          ownerId: turf.ownerId,
          turfName: turf.turfName,
          bookingId: booking.id,
          customerName: req.user?.name || 'Customer',
          date: booking.bookingDate,
          timeSlot: `${booking.startTime} - ${booking.endTime}`,
        }).catch((e) => console.error('Owner notification error:', e));
      }
    } catch (notifyErr) {
      console.warn('Non-fatal refund notification error:', notifyErr);
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
 * 5b. POST /api/payments/disputes
 * Customer files a dispute for an eligible booking
 */
router.post('/disputes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId, reason, description, requestedAmount } = req.body;
    if (!bookingId || !reason || !description) {
      return res.status(400).json({ error: 'bookingId, reason, and description are required' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(bookingId)));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Role check: Only the booking customer or admin can file a dispute
    if (req.user!.role !== 'admin' && booking.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only file disputes for your own bookings.' });
    }

    // Duplicate check: Prevent multiple open disputes for the same booking
    const [existingOpenDispute] = await db
      .select()
      .from(disputes)
      .where(and(eq(disputes.bookingId, booking.id), inArray(disputes.status, ['open', 'under_review'])));

    if (existingOpenDispute) {
      return res.status(409).json({
        error: 'An active dispute is already open for this booking. Please await administrative resolution.',
        disputeId: existingOpenDispute.id,
      });
    }

    const claimedAmount = Number(requestedAmount) || booking.advancePaid;
    // Strict Cap: Cannot claim more than advance paid
    const cappedAmount = Math.min(claimedAmount, booking.advancePaid);

    const [newDispute] = await db
      .insert(disputes)
      .values({
        bookingId: booking.id,
        userId: booking.userId,
        turfId: booking.turfId,
        reason: String(reason).trim(),
        description: String(description).trim(),
        requestedAmount: cappedAmount,
        status: 'open',
      })
      .returning();

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'dispute_filed',
      targetType: 'dispute',
      targetId: String(newDispute.id),
      details: {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        requestedAmount: cappedAmount,
        reason,
        userEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Dispute filed successfully and submitted to TurfBD Admin for resolution.',
      dispute: newDispute,
    });
  } catch (error: any) {
    console.error('Failed to create dispute:', error);
    return res.status(500).json({ error: 'Failed to file dispute' });
  }
});

/**
 * 5c. GET /api/payments/disputes
 * Admin lists all disputes; Customers list their own disputes
 */
router.get('/disputes', requireAuth, async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const isOwner = req.user!.role === 'owner';
    const userId = req.user!.id;

    let allDisputesQuery = db
      .select({
        id: disputes.id,
        bookingId: disputes.bookingId,
        bookingCode: bookings.bookingCode,
        userId: disputes.userId,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        turfId: disputes.turfId,
        turfName: turfs.turfName,
        reason: disputes.reason,
        description: disputes.description,
        requestedAmount: disputes.requestedAmount,
        status: disputes.status,
        adminNotes: disputes.adminNotes,
        resolvedBy: disputes.resolvedBy,
        resolvedAt: disputes.resolvedAt,
        refundId: disputes.refundId,
        createdAt: disputes.createdAt,
      })
      .from(disputes)
      .leftJoin(bookings, eq(disputes.bookingId, bookings.id))
      .leftJoin(users, eq(disputes.userId, users.id))
      .leftJoin(turfs, eq(disputes.turfId, turfs.id))
      .orderBy(desc(disputes.createdAt));

    let disputesList = await allDisputesQuery;

    if (!isAdmin) {
      if (isOwner) {
        // Owner sees disputes for their own turfs
        const ownerTurfs = await db.select().from(turfs).where(eq(turfs.ownerId, userId));
        const ownerTurfIds = ownerTurfs.map((t) => t.id);
        disputesList = disputesList.filter((d) => ownerTurfIds.includes(d.turfId));
      } else {
        // Customer sees their own filed disputes
        disputesList = disputesList.filter((d) => d.userId === userId);
      }
    }

    return res.json(disputesList);
  } catch (error: any) {
    console.error('Failed to list disputes:', error);
    return res.status(500).json({ error: 'Failed to retrieve disputes' });
  }
});

/**
 * 5d. PATCH /api/payments/disputes/:id
 * Admin reviews and resolves or rejects dispute
 */
router.patch('/disputes/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const disputeId = Number(req.params.id);
    const { action, adminNotes } = req.body;

    if (!['review', 'refund', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be one of: review, refund, reject' });
    }

    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId));
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const adminId = req.user!.id;
    const now = new Date();

    if (action === 'review') {
      const [updated] = await db
        .update(disputes)
        .set({
          status: 'under_review',
          adminNotes: adminNotes ? String(adminNotes).trim() : dispute.adminNotes,
        })
        .where(eq(disputes.id, disputeId))
        .returning();

      return res.json({ success: true, dispute: updated });
    }

    if (action === 'reject') {
      if (!adminNotes || !String(adminNotes).trim()) {
        return res.status(400).json({ error: 'Admin notes/reason is mandatory when rejecting a dispute claim.' });
      }

      const [updated] = await db
        .update(disputes)
        .set({
          status: 'rejected',
          adminNotes: String(adminNotes).trim(),
          resolvedBy: adminId,
          resolvedAt: now,
        })
        .where(eq(disputes.id, disputeId))
        .returning();

      await db.insert(auditLogs).values({
        userId: adminId,
        action: 'dispute_rejected',
        targetType: 'dispute',
        targetId: String(disputeId),
        details: { adminNotes, bookingId: dispute.bookingId },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      return res.json({ success: true, dispute: updated });
    }

    if (action === 'refund') {
      // Find eligible payment for the booking
      const [payment] = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.bookingId, dispute.bookingId),
            inArray(payments.status, ['completed', 'successful'])
          )
        );

      if (!payment) {
        return res.status(400).json({ error: 'No refundable payment found for this booking.' });
      }

      // Execute gateway refund
      const refundResult = await gatewayManager.refundPayment(payment.method as SupportedGateway, {
        paymentId: payment.gatewayPaymentId || payment.transactionId,
        amount: dispute.requestedAmount,
        trxId: payment.transactionId,
        reason: adminNotes || `Dispute resolution for dispute #${disputeId}`,
      });

      // Update payment record
      await db
        .update(payments)
        .set({
          status: 'refunded',
          refundStatus: 'refunded',
          refundTrxId: refundResult.refundTrxId,
          refundAmount: dispute.requestedAmount,
          refundReason: adminNotes || `Dispute resolution for dispute #${disputeId}`,
          refundedAt: now,
          updatedAt: now,
        })
        .where(eq(payments.id, payment.id));

      // Update booking status
      await db
        .update(bookings)
        .set({
          paymentStatus: 'refunded',
          bookingStatus: 'cancelled',
        })
        .where(eq(bookings.id, dispute.bookingId));

      // Update dispute record
      const [updatedDispute] = await db
        .update(disputes)
        .set({
          status: 'resolved_refunded',
          adminNotes: adminNotes ? String(adminNotes).trim() : 'Refund granted by administration',
          resolvedBy: adminId,
          resolvedAt: now,
          refundId: payment.id,
        })
        .where(eq(disputes.id, disputeId))
        .returning();

      // Audit Log
      await db.insert(auditLogs).values({
        userId: adminId,
        action: 'dispute_resolved_refunded',
        targetType: 'dispute',
        targetId: String(disputeId),
        details: {
          refundAmount: dispute.requestedAmount,
          refundTrxId: refundResult.refundTrxId,
          adminNotes,
          bookingId: dispute.bookingId,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      // Dispatch notifications
      try {
        notificationService.notifyRefundCompleted({
          userId: dispute.userId,
          bookingId: dispute.bookingId,
          amount: dispute.requestedAmount,
          gateway: payment.method,
          refundRef: refundResult.refundTrxId || payment.transactionId,
        }).catch(console.error);
      } catch (err) {
        console.warn('Notification error:', err);
      }

      return res.json({
        success: true,
        message: `Dispute #${disputeId} resolved and refund of BDT ${dispute.requestedAmount.toLocaleString()} processed successfully.`,
        dispute: updatedDispute,
        refundTrxId: refundResult.refundTrxId,
      });
    }
  } catch (error: any) {
    console.error('Failed to resolve dispute:', error);
    return res.status(500).json({ error: 'Failed to update dispute status' });
  }
});

/**
 * 6. GET /api/payments/my-history
 * Authenticated customer's personal payment history with linked invoices
 */
router.get('/my-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const userPayments = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        method: payments.method,
        transactionId: payments.transactionId,
        gatewayPaymentId: payments.gatewayPaymentId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        refundStatus: payments.refundStatus,
        refundAmount: payments.refundAmount,
        refundTrxId: payments.refundTrxId,
        createdAt: payments.createdAt,
        bookingCode: bookings.bookingCode,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        bookingTotalAmount: bookings.amount,
        advancePaid: bookings.advancePaid,
        dueAmount: bookings.dueAmount,
        turfId: bookings.turfId,
        turfName: turfs.turfName,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(turfs, eq(bookings.turfId, turfs.id))
      .leftJoin(invoices, eq(invoices.paymentId, payments.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(payments.createdAt));

    return res.json({ success: true, payments: userPayments });
  } catch (error: any) {
    console.error('Failed to get my payment history:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment history' });
  }
});

/**
 * 7. GET /api/payments
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

    // Payout metrics for this owner from real payouts table
    const ownerPayouts = await db
      .select()
      .from(payouts)
      .where(eq(payouts.ownerId, ownerId))
      .orderBy(desc(payouts.requestedAt));

    const totalPaidOut = ownerPayouts
      .filter((p) => p.status === 'dispatched')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingPayout = ownerPayouts
      .filter((p) => p.status === 'pending' || p.status === 'approved')
      .reduce((acc, p) => acc + p.amount, 0);

    const availableBalance = Math.max(0, netPayoutOwed - totalPaidOut - pendingPayout);

    // Date-based revenue calculations (Today, Week, Month)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;

    // Daily revenue bucket aggregation for real charts (last 7 days)
    const dailyChartMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dailyChartMap[dateKey] = 0;
    }

    for (const p of allPayments) {
      if (p.status === 'successful' || p.status === 'completed') {
        const pDate = new Date(p.createdAt);
        const pDateStr = pDate.toISOString().split('T')[0];

        if (pDateStr === todayStr) {
          todayRevenue += p.amount;
        }
        if (pDate >= startOfWeek) {
          weekRevenue += p.amount;
        }
        if (pDate >= startOfMonth) {
          monthRevenue += p.amount;
        }
        if (dailyChartMap[pDateStr] !== undefined) {
          dailyChartMap[pDateStr] += p.amount;
        }
      }
    }

    const revenueChartData = Object.entries(dailyChartMap).map(([date, revenue]) => ({
      date,
      revenue,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    }));

    return res.json({
      summary: {
        totalGrossRevenue,
        onlineAdvanceCollected,
        pendingGroundDue,
        platformCommission,
        netPayoutOwed,
        netRevenue: netPayoutOwed,
        totalPaidOut,
        pendingPayout,
        availableBalance,
        successfulCount,
        totalBookings: activeBookings.length,
        todayRevenue,
        weekRevenue,
        monthRevenue,
      },
      gatewayBreakdown,
      payments: allPayments,
      payouts: ownerPayouts,
      chartData: revenueChartData,
    });
  } catch (error: any) {
    console.error('Failed to get owner revenue data:', error);
    return res.status(500).json({ error: 'Failed to retrieve owner revenue breakdown' });
  }
});

/**
 * 6b. POST /api/payments/owner/payout-request
 * Approved turf owner requests payout withdrawal from their real available balance
 */
router.post('/owner/payout-request', requireOwner, async (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const { amount, method, accountNumber, accountDetails, notes } = req.body;

    const payoutAmount = Number(amount);
    if (!payoutAmount || isNaN(payoutAmount) || payoutAmount < 1000) {
      return res.status(400).json({ error: 'Minimum payout withdrawal request is BDT 1,000.' });
    }

    if (!method || !['bkash', 'nagad', 'bank_transfer', 'rocket'].includes(method)) {
      return res.status(400).json({ error: 'Valid payout method required: bkash, nagad, bank_transfer, rocket' });
    }

    if (!accountNumber || !String(accountNumber).trim()) {
      return res.status(400).json({ error: 'Destination account number is required' });
    }

    // 1. Calculate current real available balance
    const ownerTurfs = await db.select().from(turfs).where(eq(turfs.ownerId, ownerId));
    const ownerTurfIds = ownerTurfs.map((t) => t.id);

    let onlineAdvanceCollected = 0;
    if (ownerTurfIds.length > 0) {
      const allPayments = await db
        .select({
          amount: payments.amount,
          status: payments.status,
          method: payments.method,
        })
        .from(payments)
        .leftJoin(bookings, eq(payments.bookingId, bookings.id))
        .where(inArray(bookings.turfId, ownerTurfIds));

      for (const p of allPayments) {
        if (p.status === 'successful' || p.status === 'completed') {
          const m = (p.method || '').toLowerCase();
          if (m.includes('bkash') || m.includes('nagad') || m.includes('ssl')) {
            onlineAdvanceCollected += p.amount;
          }
        }
      }
    }

    const platformCommission = Math.round(onlineAdvanceCollected * PLATFORM_COMMISSION_RATE);
    const netPayoutOwed = Math.max(0, onlineAdvanceCollected - platformCommission);

    const ownerPayouts = await db
      .select()
      .from(payouts)
      .where(eq(payouts.ownerId, ownerId));

    const totalPaidOut = ownerPayouts
      .filter((p) => p.status === 'dispatched')
      .reduce((acc, p) => acc + p.amount, 0);

    const pendingPayout = ownerPayouts
      .filter((p) => p.status === 'pending' || p.status === 'approved')
      .reduce((acc, p) => acc + p.amount, 0);

    const availableBalance = Math.max(0, netPayoutOwed - totalPaidOut - pendingPayout);

    // 2. Strict Balance Validation: Cannot request more than available
    if (payoutAmount > availableBalance) {
      return res.status(400).json({
        error: `Payout request amount (BDT ${payoutAmount.toLocaleString()}) exceeds your available balance of BDT ${availableBalance.toLocaleString()}.`,
        availableBalance,
      });
    }

    // 3. Double-Click / Duplicate Request Prevention (within 15 seconds)
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
    const [recentDuplicate] = await db
      .select()
      .from(payouts)
      .where(
        and(
          eq(payouts.ownerId, ownerId),
          eq(payouts.amount, payoutAmount),
          eq(payouts.status, 'pending'),
          gt(payouts.requestedAt, fifteenSecondsAgo)
        )
      );

    if (recentDuplicate) {
      return res.status(409).json({
        error: 'Duplicate payout request detected. A pending request for this amount is already processing. Please wait.',
      });
    }

    // 4. Insert new Payout record
    const [newPayout] = await db
      .insert(payouts)
      .values({
        ownerId,
        amount: payoutAmount,
        method,
        accountNumber: String(accountNumber).trim(),
        accountDetails: accountDetails || null,
        status: 'pending',
        requestedBy: ownerId,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    // 5. Audit Log
    await db.insert(auditLogs).values({
      userId: ownerId,
      action: 'payout_requested',
      targetType: 'payout',
      targetId: String(newPayout.id),
      details: {
        amount: payoutAmount,
        method,
        accountNumber: String(accountNumber).trim(),
        ownerEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      message: `Payout request for BDT ${payoutAmount.toLocaleString()} submitted successfully for administrator review.`,
      payout: newPayout,
      remainingAvailableBalance: availableBalance - payoutAmount,
    });
  } catch (error: any) {
    console.error('Failed to request payout:', error);
    return res.status(500).json({ error: 'Failed to submit payout request' });
  }
});

/**
 * 6c. GET /api/payments/admin/payouts
 * Admin reviews all payout requests with applicant information
 */
router.get('/admin/payouts', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allPayouts = await db
      .select({
        id: payouts.id,
        ownerId: payouts.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone,
        amount: payouts.amount,
        method: payouts.method,
        accountNumber: payouts.accountNumber,
        accountDetails: payouts.accountDetails,
        status: payouts.status,
        requestedAt: payouts.requestedAt,
        reviewedAt: payouts.reviewedAt,
        processedAt: payouts.processedAt,
        requestedBy: payouts.requestedBy,
        reviewedBy: payouts.reviewedBy,
        processedBy: payouts.processedBy,
        rejectionReason: payouts.rejectionReason,
        transactionReference: payouts.transactionReference,
        notes: payouts.notes,
        createdAt: payouts.createdAt,
      })
      .from(payouts)
      .leftJoin(users, eq(payouts.ownerId, users.id))
      .orderBy(desc(payouts.requestedAt));

    return res.json(allPayouts);
  } catch (error: any) {
    console.error('Failed to fetch admin payouts:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin payout requests' });
  }
});

/**
 * 6d. PATCH /api/payments/admin/payouts/:id
 * Admin approves, rejects, or marks payout as dispatched/paid
 */
router.patch('/admin/payouts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const payoutId = Number(req.params.id);
    const { action, rejectionReason, transactionReference, notes } = req.body;

    if (!['approve', 'reject', 'dispatch'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or dispatch' });
    }

    const [existing] = await db.select().from(payouts).where(eq(payouts.id, payoutId));
    if (!existing) {
      return res.status(404).json({ error: 'Payout request not found' });
    }

    const adminId = req.user!.id;
    const now = new Date();
    const updateData: any = {};

    if (action === 'approve') {
      if (existing.status !== 'pending') {
        return res.status(400).json({ error: `Cannot approve payout currently in status '${existing.status}'` });
      }
      updateData.status = 'approved';
      updateData.reviewedAt = now;
      updateData.reviewedBy = adminId;
      if (notes) updateData.notes = notes;
    } else if (action === 'reject') {
      if (!rejectionReason?.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a payout' });
      }
      updateData.status = 'rejected';
      updateData.rejectionReason = rejectionReason.trim();
      updateData.reviewedAt = now;
      updateData.reviewedBy = adminId;
    } else if (action === 'dispatch') {
      updateData.status = 'dispatched';
      updateData.processedAt = now;
      updateData.processedBy = adminId;
      if (transactionReference?.trim()) {
        updateData.transactionReference = transactionReference.trim();
      }
    }

    const [updated] = await db
      .update(payouts)
      .set(updateData)
      .where(eq(payouts.id, payoutId))
      .returning();

    // Audit Log
    await db.insert(auditLogs).values({
      userId: adminId,
      action: `payout_${updateData.status}`,
      targetType: 'payout',
      targetId: String(payoutId),
      details: {
        action,
        status: updateData.status,
        amount: existing.amount,
        ownerId: existing.ownerId,
        rejectionReason: updateData.rejectionReason || null,
        transactionReference: updateData.transactionReference || null,
        adminEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    // Notify owner about payout status update
    if (updateData.status === 'approved') {
      await notificationService.notifyPayoutApproved({
        ownerId: existing.ownerId,
        payoutId: existing.id,
        amount: existing.amount,
        method: existing.method,
      });
    } else if (updateData.status === 'rejected') {
      await notificationService.notifyPayoutRejected({
        ownerId: existing.ownerId,
        payoutId: existing.id,
        amount: existing.amount,
        reason: updateData.rejectionReason || 'Policy check failure',
      });
    } else if (updateData.status === 'dispatched') {
      await notificationService.notifyPayoutDispatched({
        ownerId: existing.ownerId,
        payoutId: existing.id,
        amount: existing.amount,
        method: existing.method,
        transactionReference: updateData.transactionReference || undefined,
      });
    }

    return res.json({
      success: true,
      message: `Payout #${payoutId} updated to status '${updateData.status}' successfully.`,
      payout: updated,
    });
  } catch (error: any) {
    console.error('Failed to update payout:', error);
    return res.status(500).json({ error: 'Failed to update payout status' });
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
