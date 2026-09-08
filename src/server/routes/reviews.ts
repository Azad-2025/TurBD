import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { reviews, users, turfs } from '../../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requireOwner } from '../middleware/auth.ts';

const router = Router();

// GET /api/reviews?turfId=X
router.get('/', async (req: Request, res: Response) => {
  try {
    const turfId = Number(req.query.turfId);

    let query = db
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
      .orderBy(desc(reviews.createdAt));

    const allReviews = await query;
    const filtered = turfId ? allReviews.filter((r) => r.turfId === turfId) : allReviews;

    return res.json(filtered);
  } catch (error: any) {
    console.error('Failed to get reviews:', error);
    return res.status(500).json({ error: 'Failed to retrieve reviews' });
  }
});

// POST /api/reviews - Create verified match review (Customer can review)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { turfId, rating, comment } = req.body;

    if (!turfId || !rating || !comment) {
      return res.status(400).json({ error: 'turfId, rating, and comment are required' });
    }

    const verifiedUserId = req.user!.id;

    const [newReview] = await db
      .insert(reviews)
      .values({
        userId: verifiedUserId,
        turfId: Number(turfId),
        rating: Math.max(1, Math.min(5, Number(rating))),
        comment: String(comment).trim(),
      })
      .returning();

    return res.status(201).json(newReview);
  } catch (error: any) {
    console.error('Failed to submit review:', error);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

// PATCH /api/reviews/:id/reply - Owner response (Owner can manage own turf only)
router.patch('/:id/reply', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { ownerReply } = req.body;

    if (!ownerReply) {
      return res.status(400).json({ error: 'ownerReply is required' });
    }

    const [rev] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!rev) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, rev.turfId));
    if (req.user!.role !== 'admin' && (!turf || turf.ownerId !== req.user!.id)) {
      return res.status(403).json({ error: 'Forbidden: You can only reply to reviews on your own turf' });
    }

    const [updated] = await db
      .update(reviews)
      .set({ ownerReply: String(ownerReply).trim() })
      .where(eq(reviews.id, id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update review reply:', error);
    return res.status(500).json({ error: 'Failed to reply to review' });
  }
});

export default router;
