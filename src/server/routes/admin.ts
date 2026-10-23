import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { turfs, slots, bookings, reviews, auditLogs } from '../../db/schema.ts';
import { eq, inArray } from 'drizzle-orm';
import { requireSuperAdmin } from '../middleware/auth.ts';
import { autoSeedDatabase } from '../services/autoSeedService.ts';

const router = Router();

/**
 * DELETE /api/admin/remove-demo-turfs
 *
 * Super Admin Protected Endpoint.
 * Deletes only records where `isDemo: true`, completely leaving authentic turfs,
 * users, bookings, slots, and financial records untouched.
 */
router.delete('/remove-demo-turfs', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const caller = req.user!;

    // 1. Find all turfs marked as demo records
    const demoTurfs = await db
      .select({
        id: turfs.id,
        turfName: turfs.turfName,
        city: turfs.city,
        area: turfs.area,
        isDemo: turfs.isDemo,
      })
      .from(turfs)
      .where(eq(turfs.isDemo, true));

    if (demoTurfs.length === 0) {
      return res.json({
        success: true,
        message: 'No demo turfs found in database. Authentic venues remain intact.',
        removedCount: 0,
        removedTurfs: [],
      });
    }

    const demoTurfIds = demoTurfs.map((t) => t.id);

    // 2. Safely clean up child relations for demo turfs (slots, bookings, reviews)
    await db.delete(slots).where(inArray(slots.turfId, demoTurfIds));
    await db.delete(bookings).where(inArray(bookings.turfId, demoTurfIds));
    await db.delete(reviews).where(inArray(reviews.turfId, demoTurfIds));

    // 3. Delete only the demo turfs (where isDemo is true)
    await db.delete(turfs).where(inArray(turfs.id, demoTurfIds));

    // 4. Record audit log entry
    try {
      await db.insert(auditLogs).values({
        userId: caller.id,
        action: 'remove_demo_turfs',
        targetType: 'turf',
        targetId: String(demoTurfIds[0] || 'all_demo'),
        details: {
          removedCount: demoTurfs.length,
          removedTurfs: demoTurfs.map((t) => ({ id: t.id, name: t.turfName })),
          removedBy: caller.email,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log write warning:', auditErr);
    }

    console.log(`[Admin] Super Admin ${caller.email} removed ${demoTurfs.length} demo turf(s).`);

    return res.json({
      success: true,
      message: `Successfully removed ${demoTurfs.length} demo turf(s). Authentic turfs, users, and financial records are preserved.`,
      removedCount: demoTurfs.length,
      removedTurfs: demoTurfs.map((t) => ({ id: t.id, name: t.turfName, city: t.city, area: t.area })),
    });
  } catch (error: any) {
    console.error('Failed to remove demo turfs:', error);
    return res.status(500).json({
      error: 'Failed to remove demo turfs',
      message: error?.message || 'Database error occurred',
    });
  }
});

/**
 * GET /api/admin/demo-turfs-status
 *
 * Super Admin Protected Endpoint to check the count of demo turfs currently in the database.
 */
router.get('/demo-turfs-status', requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const demoTurfs = await db
      .select({
        id: turfs.id,
        turfName: turfs.turfName,
        city: turfs.city,
        area: turfs.area,
        isDemo: turfs.isDemo,
      })
      .from(turfs)
      .where(eq(turfs.isDemo, true));

    return res.json({
      success: true,
      demoCount: demoTurfs.length,
      demoTurfs,
    });
  } catch (error: any) {
    console.error('Failed to fetch demo turfs status:', error);
    return res.status(500).json({ error: 'Failed to fetch demo turfs status' });
  }
});

/**
 * POST /api/admin/seed-demo-turfs
 *
 * Super Admin Protected Endpoint to manually trigger the idempotent demo seed routine.
 */
router.post('/seed-demo-turfs', requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await autoSeedDatabase();
    return res.json({
      success: true,
      ...result,
      message: result.seeded
        ? `Successfully seeded ${result.count} demo turfs.`
        : 'Turfs table already contains records. Auto-seed was skipped to protect existing data.',
    });
  } catch (error: any) {
    console.error('Failed to trigger demo seed:', error);
    return res.status(500).json({ error: 'Failed to trigger demo seed' });
  }
});

export default router;
