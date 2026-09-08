import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { bookings, turfs, users, payments } from '../../db/schema.ts';
import { requireAdmin } from '../middleware/auth.ts';

const router = Router();

// GET /api/reports - Admin Reports & Analytics (Admin Only)
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allBookings = await db.select().from(bookings);
    const allTurfs = await db.select().from(turfs);
    const allUsers = await db.select().from(users);
    const allPayments = await db.select().from(payments);

    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);
    const totalDue = allBookings.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

    const reports = {
      summary: {
        totalRevenue,
        totalDue,
        totalBookings: allBookings.length,
        totalTurfs: allTurfs.length,
        totalUsers: allUsers.length,
        totalPayments: allPayments.length,
      },
      bookingsByStatus: {
        confirmed: allBookings.filter((b) => b.bookingStatus === 'confirmed').length,
        pending_approval: allBookings.filter((b) => b.bookingStatus === 'pending_approval').length,
        completed: allBookings.filter((b) => b.bookingStatus === 'completed').length,
        cancelled: allBookings.filter((b) => b.bookingStatus === 'cancelled').length,
      },
      turfsByStatus: {
        approved: allTurfs.filter((t) => t.verificationStatus === 'approved').length,
        pending: allTurfs.filter((t) => t.verificationStatus === 'pending').length,
        rejected: allTurfs.filter((t) => t.verificationStatus === 'rejected').length,
      },
      usersByRole: {
        customer: allUsers.filter((u) => u.role === 'customer').length,
        owner: allUsers.filter((u) => u.role === 'owner').length,
        admin: allUsers.filter((u) => u.role === 'admin').length,
      },
      recentTransactions: allPayments.slice(0, 10),
    };

    return res.json(reports);
  } catch (error: any) {
    console.error('Failed to generate admin reports:', error);
    return res.status(500).json({ error: 'Failed to generate reports' });
  }
});

export default router;
