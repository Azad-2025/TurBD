import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { turfs, slots, bookings, reviews, auditLogs, users } from '../../db/schema.ts';
import { eq, inArray, or, desc, sql } from 'drizzle-orm';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.ts';
import { autoSeedDatabase } from '../services/autoSeedService.ts';
import { notificationService } from '../services/notificationService.ts';

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

/**
 * GET /api/admin/dashboard-stats
 *
 * Super Admin & Admin Live Aggregation Engine.
 * Replaces all static/hardcoded mock metrics with authentic live SQL aggregations from PostgreSQL.
 * Returns clean zeros (0) when empty during platform bootstrapping.
 */
router.get('/dashboard-stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    // 1. Turfs table live counts
    const allTurfs = await db
      .select({
        id: turfs.id,
        turfName: turfs.turfName,
        city: turfs.city,
        area: turfs.area,
        verificationStatus: turfs.verificationStatus,
        isVerified: turfs.isVerified,
        isDemo: turfs.isDemo,
      })
      .from(turfs);

    const totalTurfs = allTurfs.length;
    const activeTurfs = allTurfs.filter((t) => t.verificationStatus === 'approved').length;
    const pendingTurfsCount = allTurfs.filter((t) => t.verificationStatus === 'pending' || !t.isVerified).length;
    const demoTurfsCount = allTurfs.filter((t) => t.isDemo).length;

    // Distinct cities and top operating district
    const uniqueCities = new Set(allTurfs.map((t) => (t.city || '').trim()).filter(Boolean));
    const citiesCount = uniqueCities.size;

    const districtMap: Record<string, number> = {};
    for (const t of allTurfs) {
      const loc = (t.area || t.city || '').trim();
      if (loc) districtMap[loc] = (districtMap[loc] || 0) + 1;
    }
    const topDistrictEntry = Object.entries(districtMap).sort((a, b) => b[1] - a[1])[0];
    const topOperatingDistrict = topDistrictEntry
      ? `${topDistrictEntry[0]} (${topDistrictEntry[1]} Arenas)`
      : 'Bootstrapping';

    // 2. Users table live counts
    const allUsers = await db
      .select({
        id: users.id,
        role: users.role,
        ownerVerificationStatus: users.ownerVerificationStatus,
        createdAt: users.createdAt,
      })
      .from(users);

    const activeUsers = allUsers.length;
    const totalOwners = allUsers.filter((u) => u.role === 'owner').length;
    const pendingOwnersCount = allUsers.filter(
      (u) => u.role === 'owner' && (u.ownerVerificationStatus === 'pending' || !u.ownerVerificationStatus)
    ).length;

    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const dhakaDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const todayDhaka = dhakaDate.toISOString().slice(0, 10);

    const newUsersToday = allUsers.filter((u) => {
      if (!u.createdAt) return false;
      const createdStr = u.createdAt.toISOString().slice(0, 10);
      return createdStr === todayUtc || createdStr === todayDhaka;
    }).length;

    // 3. Bookings table live aggregations
    const allBookings = await db
      .select({
        id: bookings.id,
        amount: bookings.amount,
        advancePaid: bookings.advancePaid,
        dueAmount: bookings.dueAmount,
        bookingStatus: bookings.bookingStatus,
        bookingDate: bookings.bookingDate,
        createdAt: bookings.createdAt,
      })
      .from(bookings);

    const nonCancelledBookings = allBookings.filter((b) => b.bookingStatus !== 'cancelled');

    const todayBookingsList = nonCancelledBookings.filter((b) => {
      const createdStr = b.createdAt ? b.createdAt.toISOString().slice(0, 10) : '';
      return b.bookingDate === todayDhaka || b.bookingDate === todayUtc || createdStr === todayUtc;
    });

    const todayBookings = todayBookingsList.length;
    const todayConfirmedBookings = todayBookingsList.filter(
      (b) => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed'
    ).length;
    const todayConfirmationRate = todayBookings > 0
      ? Math.round((todayConfirmedBookings / todayBookings) * 100)
      : 0;

    // GMV Today & Platform Commission (5%)
    const gmvToday = todayBookingsList.reduce((sum, b) => sum + (b.amount || 0), 0);
    const platformRevenueToday = Math.round(gmvToday * 0.05);

    // Lifetime Volume & Platform Revenue
    const totalVolume = nonCancelledBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalPlatformRevenue = Math.round(totalVolume * 0.05);

    // Active Settlement Escrow (advance paid on confirmed bookings not yet marked completed)
    const activeEscrow = nonCancelledBookings
      .filter((b) => b.bookingStatus === 'confirmed')
      .reduce((sum, b) => sum + (b.advancePaid || b.amount || 0), 0);

    return res.json({
      success: true,
      activeTurfs,
      totalTurfs,
      pendingTurfsCount,
      demoTurfsCount,
      activeUsers,
      totalOwners,
      pendingOwnersCount,
      newUsersToday,
      todayBookings,
      todayConfirmedBookings,
      todayConfirmationRate,
      gmvToday,
      platformRevenueToday,
      totalVolume,
      totalPlatformRevenue,
      activeEscrow,
      citiesCount,
      topOperatingDistrict,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to get live admin dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

/**
 * GET /api/admin/pending-turfs
 *
 * Dedicated endpoint retrieving all turfs awaiting Super Admin verification
 * (verificationStatus === 'pending' OR isVerified === false), joined with owner details.
 */
router.get('/pending-turfs', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pendingList = await db
      .select({
        turf: turfs,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone,
      })
      .from(turfs)
      .leftJoin(users, eq(turfs.ownerId, users.id))
      .where(or(eq(turfs.verificationStatus, 'pending'), eq(turfs.isVerified, false)))
      .orderBy(desc(turfs.createdAt));

    const result = pendingList.map(({ turf, ownerName, ownerEmail, ownerPhone }) => ({
      id: String(turf.id),
      name: turf.turfName,
      address: turf.address,
      city: turf.city,
      area: turf.area,
      description: turf.description,
      sports: turf.sportType || ['football'],
      surface: turf.surfaceType,
      size: '7 vs 7 & Box Cricket',
      hourlyRate: turf.pricePerHour,
      dayPricePerHour: turf.dayPricePerHour,
      nightPricePerHour: turf.nightPricePerHour,
      images: turf.images || [],
      amenities: turf.amenities || [],
      status: turf.verificationStatus,
      verificationStatus: turf.verificationStatus,
      isVerified: turf.isVerified,
      rejectionReason: turf.rejectionReason,
      suspensionReason: turf.suspensionReason,
      ownerId: String(turf.ownerId),
      ownerName: ownerName || 'Unknown Owner',
      ownerEmail: ownerEmail || '',
      ownerPhone: ownerPhone || '',
      createdAt: turf.createdAt,
    }));

    return res.json(result);
  } catch (error: any) {
    console.error('Failed to fetch pending turfs queue:', error);
    return res.status(500).json({ error: 'Failed to retrieve pending turfs queue' });
  }
});

/**
 * PATCH /api/admin/pending-turfs/:id/approve
 *
 * Direct one-click approval action for pending turfs from the Super Admin queue.
 */
router.patch('/pending-turfs/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    const [updated] = await db
      .update(turfs)
      .set({
        verificationStatus: 'approved',
        isVerified: true,
        rejectionReason: null,
        suspensionReason: null,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      })
      .where(eq(turfs.id, id))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'turf_approved_from_queue',
      targetType: 'turf',
      targetId: String(id),
      details: {
        turfName: existing.turfName,
        adminEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    // Notify venue owner
    if (existing.ownerId) {
      notificationService
        .notifyTurfModerationStatus({
          ownerId: existing.ownerId,
          turfId: id,
          turfName: existing.turfName,
          status: 'approved',
        })
        .catch((e) => console.error('Turf approval notification warning:', e));
    }

    return res.json({
      success: true,
      message: `Turf "${existing.turfName}" has been successfully approved and published live.`,
      turf: updated,
    });
  } catch (error: any) {
    console.error('Failed to approve turf from queue:', error);
    return res.status(500).json({ error: 'Failed to approve turf' });
  }
});

/**
 * PATCH /api/admin/pending-turfs/:id/reject
 *
 * Direct rejection action for pending turfs from the Super Admin queue.
 */
router.patch('/pending-turfs/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'A rejection reason is mandatory when rejecting a turf listing.' });
    }

    const [existing] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    const [updated] = await db
      .update(turfs)
      .set({
        verificationStatus: 'rejected',
        isVerified: false,
        rejectionReason: String(reason).trim(),
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      })
      .where(eq(turfs.id, id))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'turf_rejected_from_queue',
      targetType: 'turf',
      targetId: String(id),
      details: {
        turfName: existing.turfName,
        rejectionReason: String(reason).trim(),
        adminEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    // Notify venue owner
    if (existing.ownerId) {
      notificationService
        .notifyTurfModerationStatus({
          ownerId: existing.ownerId,
          turfId: id,
          turfName: existing.turfName,
          status: 'rejected',
          reason: String(reason).trim(),
        })
        .catch((e) => console.error('Turf rejection notification warning:', e));
    }

    return res.json({
      success: true,
      message: `Turf "${existing.turfName}" has been rejected.`,
      turf: updated,
    });
  } catch (error: any) {
    console.error('Failed to reject turf from queue:', error);
    return res.status(500).json({ error: 'Failed to reject turf' });
  }
});

/**
 * Resilient owner queue fetcher.
 * Accommodates differences in database schemas:
 * - Handles 'owner_verification_status' vs 'verification_status' vs 'is_verified'
 * - Gracefully queries registered venue owners and applicants
 * - On any database query mismatch or exception, logs detailed diagnostic logs and returns [] instead of crashing
 */
export async function getOwnersVerificationQueue(filters?: { status?: string; search?: string }): Promise<any[]> {
  try {
    let ownerUsers: any[] = [];

    // Attempt 1: Standard Drizzle ORM query
    try {
      ownerUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          ownerVerificationStatus: users.ownerVerificationStatus,
          ownerSubmittedAt: users.ownerSubmittedAt,
          ownerReviewedAt: users.ownerReviewedAt,
          ownerReviewedBy: users.ownerReviewedBy,
          ownerApprovedAt: users.ownerApprovedAt,
          ownerApprovedBy: users.ownerApprovedBy,
          ownerRejectedAt: users.ownerRejectedAt,
          ownerRejectedBy: users.ownerRejectedBy,
          ownerRejectionReason: users.ownerRejectionReason,
          ownerSuspendedAt: users.ownerSuspendedAt,
          ownerSuspendedBy: users.ownerSuspendedBy,
          ownerSuspensionReason: users.ownerSuspensionReason,
          ownerDocuments: users.ownerDocuments,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          or(
            eq(users.role, 'owner'),
            sql`LOWER(${users.role}) = 'owner'`,
            sql`${users.ownerVerificationStatus} IS NOT NULL AND ${users.ownerVerificationStatus} != ''`
          )
        )
        .orderBy(desc(users.createdAt));
    } catch (drizzleErr: any) {
      console.warn('[Admin Owners] Primary Drizzle query notice, executing resilient SQL fallback:', drizzleErr?.message || drizzleErr);

      // Attempt 2: Dynamic raw SQL with to_jsonb to bypass missing column errors
      try {
        const rawRes = await db.execute(sql`
          SELECT 
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            COALESCE(
              NULLIF(to_jsonb(u)->>'owner_verification_status', ''),
              NULLIF(to_jsonb(u)->>'verification_status', ''),
              'pending'
            ) AS owner_verification_status,
            (to_jsonb(u)->>'owner_submitted_at') AS owner_submitted_at,
            (to_jsonb(u)->>'owner_reviewed_at') AS owner_reviewed_at,
            NULLIF((to_jsonb(u)->>'owner_reviewed_by'), '')::integer AS owner_reviewed_by,
            (to_jsonb(u)->>'owner_approved_at') AS owner_approved_at,
            NULLIF((to_jsonb(u)->>'owner_approved_by'), '')::integer AS owner_approved_by,
            (to_jsonb(u)->>'owner_rejected_at') AS owner_rejected_at,
            NULLIF((to_jsonb(u)->>'owner_rejected_by'), '')::integer AS owner_rejected_by,
            (to_jsonb(u)->>'owner_rejection_reason') AS owner_rejection_reason,
            (to_jsonb(u)->>'owner_suspended_at') AS owner_suspended_at,
            NULLIF((to_jsonb(u)->>'owner_suspended_by'), '')::integer AS owner_suspended_by,
            (to_jsonb(u)->>'owner_suspension_reason') AS owner_suspension_reason,
            COALESCE(u.owner_documents, '[]'::jsonb) AS owner_documents,
            u.created_at
          FROM users u
          WHERE LOWER(u.role) = 'owner'
             OR (to_jsonb(u)->>'owner_verification_status') IS NOT NULL
             OR (to_jsonb(u)->>'verification_status') IS NOT NULL
             OR u.id IN (SELECT DISTINCT owner_id FROM turfs WHERE owner_id IS NOT NULL)
          ORDER BY u.created_at DESC;
        `);

        ownerUsers = ((rawRes as any)?.rows || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: r.role,
          ownerVerificationStatus: r.owner_verification_status || 'pending',
          ownerSubmittedAt: r.owner_submitted_at,
          ownerReviewedAt: r.owner_reviewed_at,
          ownerReviewedBy: r.owner_reviewed_by,
          ownerApprovedAt: r.owner_approved_at,
          ownerApprovedBy: r.owner_approved_by,
          ownerRejectedAt: r.owner_rejected_at,
          ownerRejectedBy: r.owner_rejected_by,
          ownerRejectionReason: r.owner_rejection_reason,
          ownerSuspendedAt: r.owner_suspended_at,
          ownerSuspendedBy: r.owner_suspended_by,
          ownerSuspensionReason: r.owner_suspension_reason,
          ownerDocuments: r.owner_documents || [],
          createdAt: r.created_at,
        }));
      } catch (rawErr: any) {
        console.error('[Admin Owners] Resilient raw SQL error:', rawErr?.message || rawErr);
        // Attempt 3: Bare minimum query
        try {
          const minimalRes = await db.execute(sql`
            SELECT id, name, email, phone, role, created_at
            FROM users
            WHERE LOWER(role) = 'owner' OR id IN (SELECT DISTINCT owner_id FROM turfs WHERE owner_id IS NOT NULL)
            ORDER BY created_at DESC;
          `);
          ownerUsers = ((minimalRes as any)?.rows || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            role: r.role || 'owner',
            ownerVerificationStatus: 'pending',
            createdAt: r.created_at,
          }));
        } catch (minErr: any) {
          console.error('[Admin Owners] Fatal: All queries failed for owners queue:', minErr?.message || minErr);
          return [];
        }
      }
    }

    // Safely retrieve registered venues for these owners
    let ownerTurfsList: any[] = [];
    const ownerIds = ownerUsers.map((u) => u.id).filter(Boolean);
    if (ownerIds.length > 0) {
      try {
        ownerTurfsList = await db
          .select({
            id: turfs.id,
            ownerId: turfs.ownerId,
            turfName: turfs.turfName,
            city: turfs.city,
            area: turfs.area,
            address: turfs.address,
            verificationStatus: turfs.verificationStatus,
            isVerified: turfs.isVerified,
          })
          .from(turfs)
          .where(inArray(turfs.ownerId, ownerIds));
      } catch (turfErr: any) {
        console.warn('[Admin Owners] Turfs join notice, running raw SQL fallback:', turfErr?.message || turfErr);
        try {
          const rawTurfs = await db.execute(sql`
            SELECT id, owner_id, turf_name, city, area, address
            FROM turfs
            WHERE owner_id = ANY(${ownerIds});
          `);
          ownerTurfsList = (rawTurfs as any)?.rows || [];
        } catch {
          ownerTurfsList = [];
        }
      }
    }

    let mapped = ownerUsers.map((u) => {
      const userTurfs = ownerTurfsList.filter((t) => (t.ownerId === u.id) || (t.owner_id === u.id));
      return {
        ...u,
        ownerVerificationStatus: u.ownerVerificationStatus || 'pending',
        turfs: userTurfs,
        turfsCount: userTurfs.length,
      };
    });

    if (filters?.status && filters.status !== 'all') {
      mapped = mapped.filter((o) => (o.ownerVerificationStatus || 'pending') === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      mapped = mapped.filter((o) =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q) ||
        (o.turfs || []).some((t: any) => (t.turfName || t.turf_name || '').toLowerCase().includes(q))
      );
    }

    return mapped;
  } catch (fatalErr: any) {
    console.error('[Admin Owners Error] Database query mismatch in getOwnersVerificationQueue:', fatalErr?.message || fatalErr);
    return [];
  }
}

/**
 * GET /api/admin/owners
 *
 * Super Admin & Admin endpoint to fetch owner verification applications.
 * Returns [] safely if empty or if database mismatch occurs without breaking the UI.
 */
router.get('/owners', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const owners = await getOwnersVerificationQueue({ status, search });
    return res.json(owners);
  } catch (error: any) {
    console.error('[Admin API Error] GET /api/admin/owners caught exception:', error?.message || error);
    // Return safe fallback [] to prevent breaking frontend UI
    return res.json([]);
  }
});

/**
 * PATCH /api/admin/owners/:id/verification
 *
 * Super Admin & Admin endpoint to approve, reject, or suspend an owner applicant.
 */
router.patch('/owners/:id/verification', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ownerId = Number(req.params.id);
    const { status, reason } = req.body;

    if (!ownerId || !status) {
      return res.status(400).json({ error: 'ownerId and status are required' });
    }

    if (!['approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved, rejected, or suspended' });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, ownerId));
    if (!targetUser) {
      return res.status(404).json({ error: 'Owner user not found' });
    }

    const adminId = req.user!.id;
    const now = new Date();
    const updateData: any = {
      role: 'owner',
      ownerVerificationStatus: status,
      ownerReviewedAt: now,
      ownerReviewedBy: adminId,
    };

    if (status === 'approved') {
      updateData.isVerified = true;
      updateData.ownerApprovedAt = now;
      updateData.ownerApprovedBy = adminId;
      updateData.ownerSuspensionReason = null;
    } else if (status === 'rejected') {
      if (!reason?.trim()) {
        return res.status(400).json({ error: 'A rejection reason is required when rejecting an owner' });
      }
      updateData.ownerRejectedAt = now;
      updateData.ownerRejectedBy = adminId;
      updateData.ownerRejectionReason = reason.trim();
    } else if (status === 'suspended') {
      if (!reason?.trim()) {
        return res.status(400).json({ error: 'A suspension reason is required when suspending an owner' });
      }
      updateData.ownerSuspendedAt = now;
      updateData.ownerSuspendedBy = adminId;
      updateData.ownerSuspensionReason = reason.trim();
    }

    let updatedUser: any = null;
    try {
      const [u] = await db.update(users).set(updateData).where(eq(users.id, ownerId)).returning();
      updatedUser = u;
    } catch (updateErr: any) {
      console.warn('[Admin Owners] Drizzle update notice, executing direct SQL update:', updateErr?.message);
      const rawUpdate = await db.execute(sql`
        UPDATE users 
        SET 
          role = 'owner',
          owner_verification_status = ${status},
          owner_reviewed_at = ${now},
          owner_reviewed_by = ${adminId},
          owner_approved_at = ${status === 'approved' ? now : null},
          owner_approved_by = ${status === 'approved' ? adminId : null},
          owner_rejected_at = ${status === 'rejected' ? now : null},
          owner_rejected_by = ${status === 'rejected' ? adminId : null},
          owner_rejection_reason = ${status === 'rejected' ? reason?.trim() : null},
          owner_suspended_at = ${status === 'suspended' ? now : null},
          owner_suspended_by = ${status === 'suspended' ? adminId : null},
          owner_suspension_reason = ${status === 'suspended' ? reason?.trim() : null}
        WHERE id = ${ownerId}
        RETURNING *;
      `);
      updatedUser = (rawUpdate as any)?.rows?.[0] || targetUser;
    }

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        userId: adminId,
        action: `owner_${status}`,
        targetType: 'user',
        targetId: String(ownerId),
        details: {
          previousStatus: targetUser.ownerVerificationStatus,
          newStatus: status,
          reason: reason || null,
          adminEmail: req.user!.email,
        },
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    const { passwordHash: _, ...safeUser } = updatedUser || targetUser;
    return res.json({
      success: true,
      message: `Owner application has been successfully ${status}.`,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('Failed to update owner verification:', error);
    return res.status(500).json({ error: 'Failed to update owner verification status' });
  }
});

export default router;
