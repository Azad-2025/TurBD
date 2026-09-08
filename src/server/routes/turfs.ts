import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { turfs, users, reviews } from '../../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { requireOwner, requireAdmin } from '../middleware/auth.ts';

const router = Router();

// GET /api/turfs - List all turfs with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, status, ownerId } = req.query;

    let query = db.select({
      id: turfs.id,
      ownerId: turfs.ownerId,
      turfName: turfs.turfName,
      address: turfs.address,
      city: turfs.city,
      latitude: turfs.latitude,
      longitude: turfs.longitude,
      images: turfs.images,
      sportType: turfs.sportType,
      surfaceType: turfs.surfaceType,
      pricePerHour: turfs.pricePerHour,
      openingTime: turfs.openingTime,
      closingTime: turfs.closingTime,
      verificationStatus: turfs.verificationStatus,
      createdAt: turfs.createdAt,
      ownerName: users.name,
      ownerPhone: users.phone,
    })
    .from(turfs)
    .leftJoin(users, eq(turfs.ownerId, users.id))
    .orderBy(desc(turfs.createdAt));

    const allTurfs = await query;

    // Filter in-memory for flexible multi-tag criteria
    let result = allTurfs;
    if (city && city !== 'All Cities') {
      result = result.filter((t) => t.city.toLowerCase() === String(city).toLowerCase());
    }
    if (status) {
      result = result.filter((t) => t.verificationStatus === status);
    }
    if (ownerId) {
      result = result.filter((t) => t.ownerId === Number(ownerId));
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Failed to fetch turfs:', error);
    return res.status(500).json({ error: 'Failed to fetch turfs' });
  }
});

// GET /api/turfs/:id - Get single turf with reviews
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [turf] = await db
      .select({
        id: turfs.id,
        ownerId: turfs.ownerId,
        turfName: turfs.turfName,
        address: turfs.address,
        city: turfs.city,
        latitude: turfs.latitude,
        longitude: turfs.longitude,
        images: turfs.images,
        sportType: turfs.sportType,
        surfaceType: turfs.surfaceType,
        pricePerHour: turfs.pricePerHour,
        openingTime: turfs.openingTime,
        closingTime: turfs.closingTime,
        verificationStatus: turfs.verificationStatus,
        createdAt: turfs.createdAt,
        ownerName: users.name,
        ownerPhone: users.phone,
      })
      .from(turfs)
      .leftJoin(users, eq(turfs.ownerId, users.id))
      .where(eq(turfs.id, id));

    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    // Fetch reviews for this turf
    const turfReviews = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        turfId: reviews.turfId,
        rating: reviews.rating,
        comment: reviews.comment,
        ownerReply: reviews.ownerReply,
        createdAt: reviews.createdAt,
        userName: users.name,
        userAvatar: users.profileImage,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.turfId, id))
      .orderBy(desc(reviews.createdAt));

    return res.json({
      ...turf,
      reviews: turfReviews,
    });
  } catch (error: any) {
    console.error('Failed to fetch turf details:', error);
    return res.status(500).json({ error: 'Failed to fetch turf details' });
  }
});

// POST /api/turfs - Create a new turf listing (Owner or Admin only)
router.post('/', requireOwner, async (req: Request, res: Response) => {
  try {
    const {
      ownerId,
      turfName,
      address,
      city,
      latitude,
      longitude,
      images,
      sportType,
      surfaceType,
      pricePerHour,
      openingTime,
      closingTime,
    } = req.body;

    if (!turfName || !address || !city || !pricePerHour) {
      return res.status(400).json({ error: 'turfName, address, city, and pricePerHour are required' });
    }

    // Never trust frontend ownerId for regular owners - verify from database user
    const verifiedOwnerId = req.user!.role === 'admin' && ownerId ? Number(ownerId) : req.user!.id;

    const [newTurf] = await db
      .insert(turfs)
      .values({
        ownerId: verifiedOwnerId,
        turfName: turfName.trim(),
        address: address.trim(),
        city: city.trim(),
        latitude: latitude ? Number(latitude) : 23.8103,
        longitude: longitude ? Number(longitude) : 90.4125,
        images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'],
        sportType: Array.isArray(sportType) ? sportType : ['football'],
        surfaceType: surfaceType || '50mm FIFA Quality Pro Turf',
        pricePerHour: Number(pricePerHour),
        openingTime: openingTime || '06:00',
        closingTime: closingTime || '02:00',
        verificationStatus: 'pending', // Default is pending approval by admin before public visibility
      })
      .returning();

    return res.status(201).json(newTurf);
  } catch (error: any) {
    console.error('Failed to create turf:', error);
    return res.status(500).json({ error: 'Failed to create turf listing' });
  }
});

// PATCH /api/turfs/:id - Update turf details or price (Owner manages own turf, Admin can manage all)
router.patch('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    // Owner rule: Manage own turf only
    if (req.user!.role !== 'admin' && existing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only manage your own turf' });
    }

    const updates: any = {};
    if (req.body.pricePerHour !== undefined) updates.pricePerHour = Number(req.body.pricePerHour);
    if (req.body.turfName !== undefined) updates.turfName = req.body.turfName;
    if (req.body.address !== undefined) updates.address = req.body.address;
    
    // Only admin can change verification status directly
    if (req.body.verificationStatus !== undefined && req.user!.role === 'admin') {
      updates.verificationStatus = req.body.verificationStatus;
    }

    const [updated] = await db
      .update(turfs)
      .set(updates)
      .where(eq(turfs.id, id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update turf:', error);
    return res.status(500).json({ error: 'Failed to update turf' });
  }
});

// PATCH /api/turfs/:id/status - Approve or reject turf (Admin only)
router.patch('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status || !['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: approved, pending, rejected' });
    }

    const [updated] = await db
      .update(turfs)
      .set({ verificationStatus: status })
      .where(eq(turfs.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update turf status:', error);
    return res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// DELETE /api/turfs/:id - Remove turf (Owner can delete own turf, Admin can delete all)
router.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    // Owner rule: Manage own turf only
    if (req.user!.role !== 'admin' && existing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own turf' });
    }

    const [deleted] = await db
      .delete(turfs)
      .where(eq(turfs.id, id))
      .returning();

    return res.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Failed to delete turf:', error);
    return res.status(500).json({ error: 'Failed to delete turf' });
  }
});

export default router;
