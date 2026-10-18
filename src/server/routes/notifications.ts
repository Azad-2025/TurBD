import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { notifications } from '../../db/schema';
import { eq, desc, and, or, isNull } from 'drizzle-orm';
import { notificationService } from '../services/notificationService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all notification routes with requireAuth
router.use(requireAuth);

/**
 * GET /api/notifications
 * Get notifications scoped strictly to the authenticated user and their verified role
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const limit = Math.min(100, req.query.limit ? Number(req.query.limit) : 30);

    // Strict security scoping: User can only see:
    // 1. Direct notifications assigned to their userId
    // 2. Role-wide notifications matching their database-verified role
    // 3. Broadcasts targeted to 'all'
    const roleCondition = currentUser.role === 'admin'
      ? or(
          eq(notifications.userId, currentUser.id),
          eq(notifications.recipientRole, 'admin'),
          eq(notifications.recipientRole, 'all')
        )
      : currentUser.role === 'owner'
      ? or(
          eq(notifications.userId, currentUser.id),
          eq(notifications.recipientRole, 'owner'),
          eq(notifications.recipientRole, 'all')
        )
      : or(
          eq(notifications.userId, currentUser.id),
          eq(notifications.recipientRole, 'customer'),
          eq(notifications.recipientRole, 'all')
        );

    const items = await db
      .select()
      .from(notifications)
      .where(roleCondition)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const unreadCount = items.filter((item) => !item.isRead).length;

    res.json({
      success: true,
      notifications: items,
      unreadCount,
    });
  } catch (err: any) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications', message: err?.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read with ownership verification
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid notification id' });
      return;
    }

    const currentUser = req.user!;
    const [existing] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!existing) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Verify ownership or role
    const isOwner = existing.userId === currentUser.id;
    const isRoleTargeted = existing.recipientRole === currentUser.role || existing.recipientRole === 'all';
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isRoleTargeted && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to modify this notification' });
      return;
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    res.json({ success: true, notification: updated });
  } catch (err: any) {
    console.error('Failed to mark notification as read:', err);
    res.status(500).json({ error: 'Failed to update notification', message: err?.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current authenticated user
 */
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        or(
          eq(notifications.userId, currentUser.id),
          eq(notifications.recipientRole, currentUser.role),
          eq(notifications.recipientRole, 'all')
        )
      );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error('Failed to mark all notifications as read:', err);
    res.status(500).json({ error: 'Failed to update notifications', message: err?.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification with ownership verification
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid notification id' });
      return;
    }

    const currentUser = req.user!;
    const [existing] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!existing) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Only owner of notification or admin can delete
    if (existing.userId !== currentUser.id && currentUser.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: You do not have permission to delete this notification' });
      return;
    }

    await db.delete(notifications).where(eq(notifications.id, id));
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err: any) {
    console.error('Failed to delete notification:', err);
    res.status(500).json({ error: 'Failed to delete notification', message: err?.message });
  }
});

/**
 * POST /api/notifications/seed-sample
 * Creates initial realistic sample notifications for current user
 */
router.post('/seed-sample', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. User notification: Booking confirmed
    await notificationService.notifyBookingConfirmed({
      userId,
      bookingId: 101,
      bookingCode: 'TBD-DH-8492',
      turfName: 'Daffodil Turf Arena',
      date: 'Tonight',
      timeSlot: '20:00 - 21:00',
      paymentStatus: 'Token Paid (bKash)',
      tokenPaid: 1000,
      remainingDue: 800,
      location: 'Road 9/A, Dhanmondi R/A, Dhaka',
    });

    // 2. User notification: Payment success
    await notificationService.notifyPaymentSuccess({
      userId,
      bookingId: 101,
      bookingCode: 'TBD-DH-8492',
      amount: 1000,
      gateway: 'bkash',
      transactionId: 'BKH92049182',
      turfName: 'Daffodil Turf Arena',
    });

    // 3. User notification: Match reminder
    await notificationService.notifyMatchReminder({
      userId,
      bookingId: 101,
      turfName: 'Daffodil Turf Arena',
      timeSlot: '20:00 - 21:00',
      location: 'Road 9/A, Dhanmondi R/A, Dhaka',
    });

    res.json({ success: true, message: 'Sample notifications seeded successfully' });
  } catch (err: any) {
    console.error('Failed to seed notifications:', err);
    res.status(500).json({ error: 'Failed to seed notifications', message: err?.message });
  }
});

export default router;
