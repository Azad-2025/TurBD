import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { payments, bookings, turfs, users } from '../../db/schema.ts';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/payments - Global payments audit
router.get('/', async (_req: Request, res: Response) => {
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
        userId: bookings.userId,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .orderBy(desc(payments.createdAt));

    return res.json(allPayments);
  } catch (error: any) {
    console.error('Failed to get payments:', error);
    return res.status(500).json({ error: 'Failed to retrieve payments' });
  }
});

// POST /api/payments - Submit an additional payment (e.g. paying due balance on arrival)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { bookingId, method, amount, transactionId } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'bookingId and amount are required' });
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(bookingId)));
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const trxId = transactionId || (method || 'cash').toUpperCase().slice(0, 3) + Math.random().toString(36).substring(2, 10).toUpperCase();

    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: Number(bookingId),
        method: method || 'cash',
        transactionId: trxId,
        amount: Number(amount),
        status: 'completed',
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
