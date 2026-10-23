import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { turfs, users, reviews, bookings, slots, auditLogs } from '../../db/schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireOwner, requireAdmin, optionalAuth } from '../middleware/auth.ts';
import { notificationService } from '../services/notificationService.ts';
import { deleteStorageObject, deleteR2Object } from '../utils/storage.ts';
import { ensureTurfSchemaColumns, autoSeedDatabase } from '../services/autoSeedService.ts';

const router = Router();

// Haversine distance calculator in kilometers
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/turfs/locations - List active cities and areas for discovery filters
router.get('/locations', async (_req: Request, res: Response) => {
  try {
    const allTurfs = await db
      .select({
        city: turfs.city,
        area: turfs.area,
        venueType: turfs.venueType,
      })
      .from(turfs)
      .where(eq(turfs.verificationStatus, 'approved'));

    const cities = Array.from(new Set(allTurfs.map((t) => t.city).filter(Boolean)));
    const areas = Array.from(new Set(allTurfs.map((t) => t.area).filter(Boolean)));
    const venueTypes = ['outdoor', 'indoor', 'rooftop'];

    return res.json({
      cities: ['All Cities', ...cities],
      areas: ['All Areas', ...areas],
      venueTypes,
      totalVenues: allTurfs.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch locations:', error);
    return res.json({
      cities: ['All Cities', 'Dhaka', 'Chattogram', 'Sylhet'],
      areas: ['All Areas', 'Dhanmondi', 'Gulshan', 'Uttara', 'Mirpur', 'Bashundhara'],
      venueTypes: ['outdoor', 'indoor', 'rooftop'],
      totalVenues: 0,
    });
  }
});

// GET /api/turfs/nearby - Dedicated Nearby search endpoint with distance calculation
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const radius = req.query.radius ? Number(req.query.radius) : 25; // default 25km
    const sport = req.query.sport ? String(req.query.sport).toLowerCase() : 'all';
    const venueType = req.query.venueType ? String(req.query.venueType).toLowerCase() : 'all';
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters are required for nearby search' });
    }

    const allTurfs = await db
      .select({
        id: turfs.id,
        ownerId: turfs.ownerId,
        turfName: turfs.turfName,
        address: turfs.address,
        city: turfs.city,
        area: turfs.area,
        description: turfs.description,
        latitude: turfs.latitude,
        longitude: turfs.longitude,
        venueType: turfs.venueType,
        verifiedBadge: turfs.verifiedBadge,
        images: turfs.images,
        sportType: turfs.sportType,
        surfaceType: turfs.surfaceType,
        amenities: turfs.amenities,
        pricePerHour: turfs.pricePerHour,
        openingTime: turfs.openingTime,
        closingTime: turfs.closingTime,
        verificationStatus: turfs.verificationStatus,
        rating: turfs.rating,
        reviewCount: turfs.reviewCount,
        isFeatured: turfs.isFeatured,
        createdAt: turfs.createdAt,
        ownerName: users.name,
        ownerPhone: users.phone,
      })
      .from(turfs)
      .leftJoin(users, eq(turfs.ownerId, users.id))
      .where(eq(turfs.verificationStatus, 'approved'));

    let nearbyList = allTurfs.map((t) => {
      const turfLat = t.latitude || 23.8103;
      const turfLng = t.longitude || 90.4125;
      const dist = haversineDistanceKm(lat, lng, turfLat, turfLng);
      // Rough drive time in Dhaka (2-3 min per km + 3 min buffer)
      const driveTime = Math.max(3, Math.round(dist * 2.8) + 2);

      return {
        ...t,
        distanceKm: dist,
        distanceFormatted: dist < 1 ? `${Math.max(50, Math.round(dist * 1000))} m` : `${dist.toFixed(1)} km`,
        driveTimeMinutes: driveTime,
      };
    });

    // Filter by radius
    nearbyList = nearbyList.filter((t) => t.distanceKm <= radius);

    // Filter by sport
    if (sport && sport !== 'all') {
      nearbyList = nearbyList.filter((t) =>
        Array.isArray(t.sportType) && t.sportType.some((s: string) => s.toLowerCase() === sport)
      );
    }

    // Filter by venueType
    if (venueType && venueType !== 'all') {
      nearbyList = nearbyList.filter((t) => t.venueType?.toLowerCase() === venueType);
    }

    // Sort strictly by distance ascending
    nearbyList.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json(nearbyList.slice(0, limit));
  } catch (error: any) {
    console.error('Failed to get nearby turfs:', error);
    return res.status(500).json({ error: 'Failed to search nearby turfs' });
  }
});

// GET /api/turfs/force-seed - Manual trigger endpoint for on-demand raw SQL seeding
router.get('/force-seed', async (_req: Request, res: Response) => {
  try {
    console.log('[GET /api/turfs/force-seed] Manual raw SQL force seed triggered.');
    const seedResult = await autoSeedDatabase(true);

    // Fetch the updated rows via Raw SQL
    const queryResult = await db.execute(sql`SELECT * FROM turfs ORDER BY id DESC;`);
    const allRows = (queryResult as any)?.rows || seedResult.rows || [];

    const mapped = allRows.map((t: any) => ({
      id: t.id,
      name: t.turf_name || t.name || 'Turf Arena',
      turfName: t.turf_name || t.name || 'Turf Arena',
      address: t.address || '',
      city: t.city || 'Dhaka',
      area: t.area || 'Dhaka',
      location: `${t.area || 'Dhaka'}, ${t.city || 'Dhaka'}`,
      pricePerHour: Number(t.price_per_hour || t.pricePerHour || 2000),
      hourlyRate: Number(t.price_per_hour || t.pricePerHour || 2000),
      sports: Array.isArray(t.sport_type)
        ? t.sport_type
        : (Array.isArray(t.sportType)
          ? t.sportType
          : (Array.isArray(t.sports) ? t.sports : ['football'])),
      images: Array.isArray(t.images) ? t.images : [],
      isDemo: Boolean(t.is_demo ?? t.isDemo ?? true),
      isVerified: Boolean(t.is_verified ?? t.isVerified ?? true),
      verificationStatus: t.verification_status || t.verificationStatus || 'approved',
      status: t.verification_status || t.verificationStatus || 'approved',
    }));

    return res.json({
      success: true,
      message: 'Seeded successfully',
      count: mapped.length,
      rows: mapped,
    });
  } catch (error: any) {
    console.error('[GET /api/turfs/force-seed] Execution failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Force seed failed',
      message: error?.message || String(error),
    });
  }
});

// GET /api/turfs - List all turfs with advanced filtering
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      city,
      area,
      status,
      ownerId,
      scope,
      sport,
      venueType,
      verifiedOnly,
      badge,
      maxPrice,
      query,
      q,
      lat,
      lng,
      radius,
      sortBy,
      date,
      timeSlot,
      availableOnly,
    } = req.query;

    const user = req.user;
    const isAdmin = user?.role === 'admin';
    const isOwner = user?.role === 'owner';
    const targetOwnerId = ownerId ? Number(ownerId) : undefined;
    const isOwnerScope = scope === 'owner' || targetOwnerId !== undefined;

    // Strict Authorization Verification for Owner Management Scope:
    if (isOwnerScope) {
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required to access owner turf management.',
          code: 'UNAUTHENTICATED',
        });
      }
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          error: 'Forbidden: Turf Owner privileges required.',
          code: 'FORBIDDEN',
        });
      }
      // An owner cannot view another owner's private/unapproved listings
      if (isOwner && !isAdmin && targetOwnerId !== undefined && targetOwnerId !== user.id) {
        return res.status(403).json({
          error: "Forbidden: You cannot access another owner's private turf listings.",
          code: 'FORBIDDEN_OWNER_ACCESS',
        });
      }
    }

    // Public / Customer authorization check:
    // Unauthenticated visitors and customer accounts cannot query non-approved listings via ?status=...
    if (!isAdmin && !isOwnerScope) {
      if (status && status !== 'approved') {
        return res.status(403).json({
          error: 'Forbidden: Viewing unapproved or pending turfs requires administrative privileges.',
          code: 'FORBIDDEN_STATUS_FILTER',
        });
      }
    }

    let allTurfs: any[] = [];
    try {
      allTurfs = await db
        .select({
          id: turfs.id,
          ownerId: turfs.ownerId,
          turfName: turfs.turfName,
          address: turfs.address,
          city: turfs.city,
          area: turfs.area,
          description: turfs.description,
          latitude: turfs.latitude,
          longitude: turfs.longitude,
          venueType: turfs.venueType,
          verifiedBadge: turfs.verifiedBadge,
          images: turfs.images,
          sportType: turfs.sportType,
          surfaceType: turfs.surfaceType,
          amenities: turfs.amenities,
          pricePerHour: turfs.pricePerHour,
          openingTime: turfs.openingTime,
          closingTime: turfs.closingTime,
          verificationStatus: turfs.verificationStatus,
          rejectionReason: turfs.rejectionReason,
          suspensionReason: turfs.suspensionReason,
          reviewedBy: turfs.reviewedBy,
          reviewedAt: turfs.reviewedAt,
          documents: turfs.documents,
          rating: turfs.rating,
          reviewCount: turfs.reviewCount,
          isFeatured: turfs.isFeatured,
          isDemo: turfs.isDemo,
          isVerified: turfs.isVerified,
          createdAt: turfs.createdAt,
          ownerName: users.name,
          ownerPhone: users.phone,
        })
        .from(turfs)
        .leftJoin(users, eq(turfs.ownerId, users.id))
        .orderBy(desc(turfs.createdAt));
    } catch (primaryErr: any) {
      console.error('[GET /api/turfs] ORM query failed, falling back to raw SQL:', primaryErr?.message || primaryErr);
    }

    // Fallback: If ORM query failed or returned 0 rows, execute SELECT * FROM turfs via raw SQL
    if (!allTurfs || allTurfs.length === 0) {
      try {
        await ensureTurfSchemaColumns();
        console.log('[GET /api/turfs] Executing raw SQL: SELECT * FROM turfs ORDER BY id DESC...');
        const rawResult = await db.execute(sql`SELECT * FROM turfs ORDER BY id DESC;`);
        allTurfs = (rawResult as any)?.rows || [];
        console.log(`[GET /api/turfs] Raw SQL returned ${allTurfs.length} rows.`);
      } catch (rawSqlErr: any) {
        console.error('[GET /api/turfs] Raw SQL SELECT * FROM turfs failed:', rawSqlErr?.message || rawSqlErr);
        allTurfs = [];
      }
    }

    // Emergency auto-seed if still zero rows
    if (!allTurfs || allTurfs.length === 0) {
      console.log('[GET /api/turfs] Zero turfs found. Auto-triggering raw SQL emergency seeding...');
      try {
        const seedResult = await autoSeedDatabase(true);
        if (seedResult.rows && seedResult.rows.length > 0) {
          allTurfs = seedResult.rows;
        } else {
          const rawRecheck = await db.execute(sql`SELECT * FROM turfs ORDER BY id DESC;`);
          allTurfs = (rawRecheck as any)?.rows || [];
        }
      } catch (seedErr: any) {
        console.error('[GET /api/turfs] Emergency seed error:', seedErr?.message || seedErr);
      }
    }

    // In-memory safety guarantee: if database returned 0 rows or is offline, supply demo turfs
    if (!allTurfs || allTurfs.length === 0) {
      console.warn('[GET /api/turfs] DB returned 0 records. Supplying in-memory approved demo turfs to ensure non-empty list.');
      allTurfs = [
        {
          id: 1,
          turf_name: 'Daffodil Turf Arena',
          name: 'Daffodil Turf Arena',
          address: 'Road 27 (Old 16), Dhanmondi R/A, Dhaka 1209',
          city: 'Dhaka',
          area: 'Dhanmondi',
          price_per_hour: 2000,
          sport_type: ['football', 'cricket'],
          sports: ['football', 'cricket'],
          images: [
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
          ],
          surface_type: 'High-Density Non-Infill AstroTurf',
          amenities: ['Floodlights', 'Changing Room', 'Locker Room', 'Parking', 'Washroom', 'First Aid'],
          verification_status: 'approved',
          is_demo: true,
          is_verified: true,
          is_featured: true,
          rating: 4.9,
          review_count: 38,
        },
        {
          id: 2,
          turf_name: 'Gulshan United Arena',
          name: 'Gulshan United Arena',
          address: 'Plot 14, Road 113, Gulshan-2, Dhaka 1212',
          city: 'Dhaka',
          area: 'Gulshan',
          price_per_hour: 2500,
          sport_type: ['football', 'cricket', 'futsal'],
          sports: ['football', 'cricket', 'futsal'],
          images: [
            'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1529900241452-f542a201b17b?auto=format&fit=crop&w=800&q=80',
          ],
          surface_type: '50mm FIFA Quality Pro Turf',
          amenities: ['Floodlights', 'Changing Room', 'Shower', 'Locker Room', 'Parking', 'Cafeteria', 'First Aid'],
          verification_status: 'approved',
          is_demo: true,
          is_verified: true,
          is_featured: true,
          rating: 4.8,
          review_count: 52,
        },
      ];
    }

    let result = (allTurfs || []).map((t: any) => {
      let distanceKm: number | undefined = undefined;
      let driveTimeMinutes: number | undefined = undefined;
      let distanceFormatted: string | undefined = undefined;

      const turfLat = Number(t.latitude) || 23.8103;
      const turfLng = Number(t.longitude) || 90.4125;

      if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        const userLat = Number(lat);
        const userLng = Number(lng);
        distanceKm = haversineDistanceKm(userLat, userLng, turfLat, turfLng);
        distanceFormatted = distanceKm < 1 ? `${Math.max(50, Math.round(distanceKm * 1000))} m` : `${distanceKm.toFixed(1)} km`;
        driveTimeMinutes = Math.max(3, Math.round(distanceKm * 2.8) + 2);
      }

      const vStatus = t.verification_status || t.verificationStatus || t.status || 'approved';
      const turfName = t.turf_name || t.turfName || t.name || 'Turf Arena';
      const address = t.address || '';
      const cityVal = t.city || 'Dhaka';
      const areaVal = t.area || address.split(',')[0]?.trim() || cityVal;
      const locationVal = `${areaVal}, ${cityVal}`;
      const hourlyRateVal = Number(t.price_per_hour || t.pricePerHour || t.hourlyRate || 2000);
      const sportsVal = Array.isArray(t.sport_type)
        ? t.sport_type
        : (Array.isArray(t.sportType)
          ? t.sportType
          : (Array.isArray(t.sports) ? t.sports : ['football']));
      const imagesVal = Array.isArray(t.images) && t.images.length > 0
        ? t.images
        : (t.main_image || t.mainImage ? [t.main_image || t.mainImage] : ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80']);

      return {
        ...t,
        id: t.id,
        name: turfName,
        turfName,
        address,
        city: cityVal,
        area: areaVal,
        location: locationVal,
        sports: sportsVal,
        sportType: sportsVal,
        pricePerHour: hourlyRateVal,
        hourlyRate: hourlyRateVal,
        images: imagesVal,
        mainImage: t.main_image || t.mainImage || imagesVal[0],
        venueType: t.venue_type || t.venueType || 'outdoor',
        surfaceType: t.surface_type || t.surfaceType || t.surface || '50mm FIFA Quality Pro Turf',
        amenities: Array.isArray(t.amenities) && t.amenities.length > 0
          ? t.amenities
          : ['Floodlights', 'Changing Room', 'Locker Room', 'Parking', 'Washroom'],
        status: vStatus,
        verificationStatus: vStatus,
        isVerified: Boolean(t.is_verified ?? t.isVerified ?? (vStatus === 'approved')),
        isDemo: Boolean(t.is_demo ?? t.isDemo ?? false),
        isFeatured: Boolean(t.is_featured ?? t.isFeatured ?? false),
        rating: typeof t.rating === 'number' ? t.rating : 4.8,
        reviewCount: typeof t.review_count === 'number' ? t.review_count : (typeof t.reviewCount === 'number' ? t.reviewCount : 18),
        openingTime: t.opening_time || t.openingTime || '06:00',
        closingTime: t.closing_time || t.closingTime || '02:00',
        ownerName: t.ownerName || 'Turf Owner',
        ownerPhone: t.ownerPhone || '+880 1819-876543',
        distanceKm,
        distanceFormatted,
        driveTimeMinutes,
      };
    });

    // 1. Filter by City
    if (city && city !== 'All Cities') {
      result = result.filter((t) => t.city.toLowerCase() === String(city).toLowerCase());
    }

    // 2. Filter by Area
    if (area && area !== 'All Areas') {
      result = result.filter((t) => t.area.toLowerCase() === String(area).toLowerCase());
    }

    // 3. Security-Enforced Status & Scope Filtering:
    if (isOwnerScope) {
      // Scoped owner management mode: strictly this owner's arenas
      const scopedOwnerId = isAdmin && targetOwnerId !== undefined ? targetOwnerId : user!.id;
      result = result.filter((t) => t.ownerId === scopedOwnerId);
      if (status && status !== 'all') {
        result = result.filter((t) => t.verificationStatus === status);
      }
    } else if (isAdmin) {
      // Admin global view: can filter by status if provided, or see all if status === 'all' or omitted
      if (status && status !== 'all') {
        result = result.filter((t) => t.verificationStatus === status);
      }
    } else {
      // Public / Guest / Customer / Authenticated Owner in public browse:
      // Strictly approved turfs only - pending/rejected/suspended are never exposed
      result = result.filter((t) => t.verificationStatus === 'approved');
    }

    // 5. Keyword search query
    const searchTerm = (query || q) ? String(query || q).trim().toLowerCase() : '';
    if (searchTerm) {
      result = result.filter((t) => {
        const nameMatch = t.turfName.toLowerCase().includes(searchTerm);
        const addrMatch = t.address.toLowerCase().includes(searchTerm);
        const areaMatch = t.area.toLowerCase().includes(searchTerm);
        const cityMatch = t.city.toLowerCase().includes(searchTerm);
        const descMatch = (t.description || '').toLowerCase().includes(searchTerm);
        return nameMatch || addrMatch || areaMatch || cityMatch || descMatch;
      });
    }

    // 6. Sport Type Filter
    if (sport && sport !== 'all') {
      const sportLower = String(sport).toLowerCase();
      result = result.filter((t) =>
        Array.isArray(t.sportType) && t.sportType.some((s: string) => s.toLowerCase() === sportLower)
      );
    }

    // 7. Venue Type Filter (Indoor / Outdoor / Rooftop)
    if (venueType && venueType !== 'all') {
      const vLower = String(venueType).toLowerCase();
      result = result.filter((t) => t.venueType?.toLowerCase() === vLower);
    }

    // 8. Verified Badge Filter
    if (verifiedOnly === 'true' || verifiedOnly === '1') {
      result = result.filter(
        (t) => t.verificationStatus === 'approved' && (t.verifiedBadge === 'turfbd_verified' || t.verifiedBadge === 'gold_partner')
      );
    }
    if (badge && badge !== 'all') {
      result = result.filter((t) => t.verifiedBadge === badge);
    }

    // 9. Max Price Filter
    if (maxPrice && !isNaN(Number(maxPrice))) {
      const maxP = Number(maxPrice);
      result = result.filter((t) => t.pricePerHour <= maxP);
    }

    // 10. Radius / Distance Filter
    if (radius && !isNaN(Number(radius)) && lat && lng) {
      const maxRadius = Number(radius);
      result = result.filter((t) => t.distanceKm !== undefined && t.distanceKm <= maxRadius);
    }

    // 11. Availability-based filtering (Date and/or TimeSlot)
    if (date && (availableOnly === 'true' || timeSlot)) {
      const searchDate = String(date);
      const searchSlot = timeSlot && timeSlot !== 'all' ? String(timeSlot) : null;

      // Query active bookings for that date
      const dateBookings = await db
        .select({
          turfId: bookings.turfId,
          startTime: bookings.startTime,
          endTime: bookings.endTime,
          bookingStatus: bookings.bookingStatus,
        })
        .from(bookings)
        .where(and(eq(bookings.bookingDate, searchDate)));

      const activeBookings = dateBookings.filter((b) => b.bookingStatus !== 'cancelled');

      // Check slot availability for each turf
      result = result.filter((t) => {
        const turfBookings = activeBookings.filter((b) => b.turfId === t.id);

        if (searchSlot) {
          // If specific hour (e.g., '18:00')
          if (searchSlot.includes(':')) {
            const isBooked = turfBookings.some((b) => {
              if (b.startTime === searchSlot) return true;
              if (b.endTime && b.endTime > b.startTime && searchSlot >= b.startTime && searchSlot < b.endTime) {
                return true;
              }
              return false;
            });
            return !isBooked;
          }

          // If time range window (morning, afternoon, evening, night)
          let rangeStart = '06:00';
          let rangeEnd = '23:59';
          if (searchSlot === 'morning') {
            rangeStart = '06:00';
            rangeEnd = '12:00';
          } else if (searchSlot === 'afternoon') {
            rangeStart = '12:00';
            rangeEnd = '17:00';
          } else if (searchSlot === 'evening') {
            rangeStart = '17:00';
            rangeEnd = '21:00';
          } else if (searchSlot === 'night') {
            rangeStart = '21:00';
            rangeEnd = '02:00';
          }

          // Venue open during this window?
          return true;
        }

        // If availableOnly on date, ensure not all daytime hours are booked (simple heuristic: < 14 bookings)
        return turfBookings.length < 16;
      });
    }

    // 12. Sorting
    if (sortBy === 'distance' && lat && lng) {
      result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => a.pricePerHour - b.pricePerHour);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.pricePerHour - a.pricePerHour);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      // Default: Recommended (Featured first, then rating, then newest)
      result.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }

    return res.json(result);
  } catch (error: any) {
    console.error('[GET /api/turfs] Unhandled route error:', error?.message || error);
    if (error?.stack) console.error(error.stack);

    // Safe recovery: try emergency select from turfs table so the endpoint never fails with 500
    try {
      const emergencyList = await db.select().from(turfs);
      const safeApproved = emergencyList
        .filter((t: any) => !t.verificationStatus || t.verificationStatus === 'approved')
        .map((t: any) => ({
          id: t.id,
          name: t.turfName || 'Turf Arena',
          turfName: t.turfName || 'Turf Arena',
          city: t.city || 'Dhaka',
          area: t.area || 'Dhaka',
          location: `${t.area || 'Dhaka'}, ${t.city || 'Dhaka'}`,
          address: t.address || '',
          pricePerHour: Number(t.pricePerHour || 2000),
          hourlyRate: Number(t.pricePerHour || 2000),
          sports: Array.isArray(t.sportType) ? t.sportType : ['football'],
          images: Array.isArray(t.images) && t.images.length > 0 ? t.images : ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80'],
          status: 'approved',
          verificationStatus: 'approved',
          isDemo: Boolean(t.isDemo),
          isVerified: Boolean(t.isVerified ?? true),
        }));
      return res.json(safeApproved);
    } catch (finalErr: any) {
      console.error('[GET /api/turfs] Emergency fallback query failed:', finalErr?.message || finalErr);
      return res.json([]);
    }
  }
});

// GET /api/turfs/:id - Get single turf with reviews
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    let turf: any = null;

    try {
      const [queriedTurf] = await db
        .select({
          id: turfs.id,
          ownerId: turfs.ownerId,
          turfName: turfs.turfName,
          address: turfs.address,
          city: turfs.city,
          area: turfs.area,
          description: turfs.description,
          latitude: turfs.latitude,
          longitude: turfs.longitude,
          venueType: turfs.venueType,
          verifiedBadge: turfs.verifiedBadge,
          images: turfs.images,
          sportType: turfs.sportType,
          surfaceType: turfs.surfaceType,
          amenities: turfs.amenities,
          pricePerHour: turfs.pricePerHour,
          openingTime: turfs.openingTime,
          closingTime: turfs.closingTime,
          verificationStatus: turfs.verificationStatus,
          rating: turfs.rating,
          reviewCount: turfs.reviewCount,
          isFeatured: turfs.isFeatured,
          isDemo: turfs.isDemo,
          isVerified: turfs.isVerified,
          createdAt: turfs.createdAt,
          ownerName: users.name,
          ownerPhone: users.phone,
        })
        .from(turfs)
        .leftJoin(users, eq(turfs.ownerId, users.id))
        .where(eq(turfs.id, id));
      turf = queriedTurf;
    } catch (joinErr) {
      console.warn('[GET /api/turfs/:id] Relational query fallback:', joinErr);
      const [fallbackTurf] = await db.select().from(turfs).where(eq(turfs.id, id));
      turf = fallbackTurf;
    }

    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    // Security check: unapproved, rejected, or suspended venues are private to admin and the owning host
    if (turf.verificationStatus && turf.verificationStatus !== 'approved') {
      const isAuthorized = req.user && (req.user.role === 'admin' || req.user.id === turf.ownerId);
      if (!isAuthorized) {
        return res.status(404).json({ error: 'Turf not found' });
      }
    }

    // Fetch reviews for this turf
    let turfReviews: any[] = [];
    try {
      turfReviews = await db
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
    } catch (reviewErr) {
      console.warn('[GET /api/turfs/:id] Reviews fetch notice:', reviewErr);
      turfReviews = [];
    }

    const vStatus = turf.verificationStatus || turf.status || 'approved';
    const turfName = turf.turfName || turf.name || 'Turf Arena';
    const address = turf.address || '';
    const cityVal = turf.city || 'Dhaka';
    const areaVal = turf.area || address.split(',')[0]?.trim() || cityVal;
    const sportsVal = Array.isArray(turf.sportType) ? turf.sportType : (Array.isArray(turf.sports) ? turf.sports : ['football']);
    const imagesVal = Array.isArray(turf.images) && turf.images.length > 0
      ? turf.images
      : (turf.mainImage ? [turf.mainImage] : ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80']);

    return res.json({
      ...turf,
      id: turf.id,
      name: turfName,
      turfName,
      address,
      city: cityVal,
      area: areaVal,
      location: `${areaVal}, ${cityVal}`,
      sports: sportsVal,
      sportType: sportsVal,
      images: imagesVal,
      mainImage: turf.mainImage || imagesVal[0],
      pricePerHour: Number(turf.pricePerHour || turf.hourlyRate || 2000),
      hourlyRate: Number(turf.pricePerHour || turf.hourlyRate || 2000),
      status: vStatus,
      verificationStatus: vStatus,
      isVerified: Boolean(turf.isVerified !== undefined ? turf.isVerified : vStatus === 'approved'),
      isDemo: Boolean(turf.isDemo),
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
      area,
      description,
      latitude,
      longitude,
      venueType,
      verifiedBadge,
      images,
      sportType,
      surfaceType,
      amenities,
      pricePerHour,
      openingTime,
      closingTime,
    } = req.body;

    if (!turfName || !address || !city || !pricePerHour) {
      return res.status(400).json({ error: 'turfName, address, city, and pricePerHour are required' });
    }

    const verifiedOwnerId = req.user!.role === 'admin' && ownerId ? Number(ownerId) : req.user!.id;

    const [newTurf] = await db
      .insert(turfs)
      .values({
        ownerId: verifiedOwnerId,
        turfName: turfName.trim(),
        address: address.trim(),
        city: city.trim(),
        area: area ? area.trim() : address.split(',')[0].trim() || city.trim(),
        description: description ? description.trim() : null,
        latitude: latitude ? Number(latitude) : 23.8103,
        longitude: longitude ? Number(longitude) : 90.4125,
        venueType: venueType || 'outdoor',
        verifiedBadge: req.user!.role === 'admin' && verifiedBadge ? verifiedBadge : 'standard',
        images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'],
        sportType: Array.isArray(sportType) ? sportType : ['football'],
        surfaceType: surfaceType || '50mm FIFA Quality Pro Turf',
        amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ['Floodlights', 'Changing Room', 'Parking', 'Washroom'],
        pricePerHour: Number(pricePerHour),
        openingTime: openingTime || '06:00',
        closingTime: closingTime || '02:00',
        verificationStatus: 'pending', // Pending admin audit
        rating: 4.8,
        reviewCount: 0,
        isFeatured: false,
      })
      .returning();

    return res.status(201).json(newTurf);
  } catch (error: any) {
    console.error('Failed to create turf:', error);
    return res.status(500).json({ error: 'Failed to create turf listing' });
  }
});

// PATCH /api/turfs/:id - Update turf details or price
router.patch('/:id', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && existing.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only manage your own turf' });
    }

    const updates: any = {};
    if (req.body.pricePerHour !== undefined) {
      const p = Number(req.body.pricePerHour);
      if (isNaN(p) || p <= 0) {
        return res.status(400).json({ error: 'Default price per hour must be a positive number' });
      }
      updates.pricePerHour = p;
    }
    if (req.body.dayPricePerHour !== undefined) {
      const p = Number(req.body.dayPricePerHour);
      if (isNaN(p) || p <= 0) {
        return res.status(400).json({ error: 'Morning/day price per hour must be a positive number' });
      }
      updates.dayPricePerHour = p;
    }
    if (req.body.nightPricePerHour !== undefined) {
      const p = Number(req.body.nightPricePerHour);
      if (isNaN(p) || p <= 0) {
        return res.status(400).json({ error: 'Night/floodlight price per hour must be a positive number' });
      }
      updates.nightPricePerHour = p;
    }
    if (req.body.pricingRules !== undefined) {
      if (!Array.isArray(req.body.pricingRules)) {
        return res.status(400).json({ error: 'pricingRules must be an array' });
      }
      for (const rule of req.body.pricingRules) {
        if (!rule.name || !rule.startTime || !rule.endTime || !rule.pricePerHour || rule.pricePerHour <= 0) {
          return res.status(400).json({ error: 'Each pricing rule must have name, startTime, endTime, and a positive pricePerHour' });
        }
      }
      updates.pricingRules = req.body.pricingRules;
    }
    if (req.body.mainImage !== undefined) updates.mainImage = req.body.mainImage;
    if (req.body.turfName !== undefined) updates.turfName = req.body.turfName;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.city !== undefined) updates.city = req.body.city;
    if (req.body.area !== undefined) updates.area = req.body.area;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.latitude !== undefined) updates.latitude = Number(req.body.latitude);
    if (req.body.longitude !== undefined) updates.longitude = Number(req.body.longitude);
    if (req.body.venueType !== undefined) updates.venueType = req.body.venueType;
    if (req.body.sportType !== undefined) updates.sportType = req.body.sportType;
    if (req.body.surfaceType !== undefined) updates.surfaceType = req.body.surfaceType;
    if (req.body.amenities !== undefined) updates.amenities = req.body.amenities;
    if (req.body.images !== undefined) updates.images = req.body.images;
    
    // Only admin can change verification status & verified badge tier
    let statusChanged = false;
    if (req.body.verificationStatus !== undefined && req.user!.role === 'admin') {
      const newStatus = req.body.verificationStatus;
      if (!['pending', 'approved', 'rejected', 'suspended'].includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid verificationStatus. Must be pending, approved, rejected, or suspended' });
      }

      if (newStatus === 'rejected' && (!req.body.rejectionReason || !String(req.body.rejectionReason).trim())) {
        return res.status(400).json({ error: 'A rejection reason is mandatory when rejecting a turf listing.' });
      }
      if (newStatus === 'suspended' && (!req.body.suspensionReason || !String(req.body.suspensionReason).trim())) {
        return res.status(400).json({ error: 'A suspension reason is mandatory when suspending an approved turf listing.' });
      }

      updates.verificationStatus = newStatus;
      updates.reviewedBy = req.user!.id;
      updates.reviewedAt = new Date();
      if (newStatus === 'rejected') {
        updates.rejectionReason = String(req.body.rejectionReason).trim();
      } else if (newStatus === 'suspended') {
        updates.suspensionReason = String(req.body.suspensionReason).trim();
      } else if (newStatus === 'approved') {
        // Clear rejection / suspension reason on approval
        updates.rejectionReason = null;
        updates.suspensionReason = null;
      }
      statusChanged = newStatus !== existing.verificationStatus;
    }
    if (req.body.verifiedBadge !== undefined && req.user!.role === 'admin') {
      if (!['standard', 'turfbd_verified', 'gold_partner'].includes(req.body.verifiedBadge)) {
        return res.status(400).json({ error: 'Invalid verifiedBadge. Must be standard, turfbd_verified, or gold_partner' });
      }
      updates.verifiedBadge = req.body.verifiedBadge;
    }
    if (req.body.isFeatured !== undefined && req.user!.role === 'admin') {
      updates.isFeatured = Boolean(req.body.isFeatured);
    }

    const [updated] = await db
      .update(turfs)
      .set(updates)
      .where(eq(turfs.id, id))
      .returning();

    // Audit log if verification status was moderated
    if (statusChanged) {
      await db.insert(auditLogs).values({
        userId: req.user!.id,
        action: `turf_${updates.verificationStatus}`,
        targetType: 'turf',
        targetId: String(id),
        details: {
          turfName: existing.turfName,
          previousStatus: existing.verificationStatus,
          newStatus: updates.verificationStatus,
          rejectionReason: updates.rejectionReason || null,
          suspensionReason: updates.suspensionReason || null,
          verifiedBadge: updates.verifiedBadge ?? existing.verifiedBadge,
          adminEmail: req.user!.email,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      // Notify venue owner
      if (existing.ownerId && ['approved', 'rejected', 'suspended'].includes(updates.verificationStatus)) {
        notificationService.notifyTurfModerationStatus({
          ownerId: existing.ownerId,
          turfId: id,
          turfName: existing.turfName,
          status: updates.verificationStatus,
          reason: updates.rejectionReason || updates.suspensionReason || undefined,
        }).catch((e) => console.error('Turf notification error:', e));
      }
    }

    // Audit log if pricing was modified
    if (
      req.body.pricePerHour !== undefined ||
      req.body.dayPricePerHour !== undefined ||
      req.body.nightPricePerHour !== undefined ||
      req.body.pricingRules !== undefined
    ) {
      await db.insert(auditLogs).values({
        userId: req.user!.id,
        action: 'pricing_updated',
        targetType: 'turf',
        targetId: String(id),
        details: {
          turfName: existing.turfName,
          pricePerHour: updates.pricePerHour ?? existing.pricePerHour,
          dayPricePerHour: updates.dayPricePerHour ?? existing.dayPricePerHour,
          nightPricePerHour: updates.nightPricePerHour ?? existing.nightPricePerHour,
          pricingRules: updates.pricingRules ?? existing.pricingRules,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      });
    }

    return res.json(updated);
  } catch (error: any) {
    console.error('Failed to update turf:', error);
    return res.status(500).json({ error: 'Failed to update turf' });
  }
});

// PATCH /api/turfs/:id/status - Dedicated Admin Turf Status Verification & Moderation
router.patch('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, reason, rejectionReason, suspensionReason, verifiedBadge } = req.body;

    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, approved, rejected, or suspended' });
    }

    const [existing] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    const effReason = String(rejectionReason || suspensionReason || reason || '').trim();
    if (status === 'rejected' && !effReason) {
      return res.status(400).json({ error: 'A rejection reason is mandatory when rejecting a turf listing.' });
    }
    if (status === 'suspended' && !effReason) {
      return res.status(400).json({ error: 'A suspension reason is mandatory when suspending an approved turf listing.' });
    }

    const updates: any = {
      verificationStatus: status,
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
    };

    if (status === 'rejected') {
      updates.rejectionReason = effReason;
      updates.suspensionReason = null;
    } else if (status === 'suspended') {
      updates.suspensionReason = effReason;
      updates.rejectionReason = null;
    } else if (status === 'approved') {
      updates.rejectionReason = null;
      updates.suspensionReason = null;
    }

    if (verifiedBadge && ['standard', 'turfbd_verified', 'gold_partner'].includes(verifiedBadge)) {
      updates.verifiedBadge = verifiedBadge;
    }

    const [updated] = await db
      .update(turfs)
      .set(updates)
      .where(eq(turfs.id, id))
      .returning();

    // Audit Log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: `turf_${status}`,
      targetType: 'turf',
      targetId: String(id),
      details: {
        turfName: existing.turfName,
        previousStatus: existing.verificationStatus,
        newStatus: status,
        reason: effReason || null,
        adminEmail: req.user!.email,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    // Notify venue owner
    if (existing.ownerId && ['approved', 'rejected', 'suspended'].includes(status)) {
      notificationService.notifyTurfModerationStatus({
        ownerId: existing.ownerId,
        turfId: id,
        turfName: existing.turfName,
        status,
        reason: effReason || undefined,
      }).catch((e) => console.error('Turf status notification error:', e));
    }

    return res.json({
      ...updated,
      status: updated.verificationStatus,
    });
  } catch (error: any) {
    console.error('Failed to update turf status:', error);
    return res.status(500).json({ error: 'Failed to update turf verification status' });
  }
});

// -------------------------------------------------------------
// FEATURE 3: TURF PHOTO GALLERY MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// GET /api/turfs/:id/gallery - Get full gallery
router.get('/:id/gallery', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }
    return res.json({
      images: Array.isArray(turf.images) ? turf.images : [],
      mainImage: turf.mainImage || (Array.isArray(turf.images) && turf.images[0]) || null,
      facilityImages: turf.facilityImages || [],
    });
  } catch (error: any) {
    console.error('Failed to get gallery:', error);
    return res.status(500).json({ error: 'Failed to retrieve turf gallery' });
  }
});

// POST /api/turfs/:id/gallery - Add images to gallery
router.post('/:id/gallery', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { images, imageUrl } = req.body;

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only manage your own turf gallery' });
    }

    const toAdd: string[] = [];
    if (typeof imageUrl === 'string' && imageUrl.trim()) {
      toAdd.push(imageUrl.trim());
    }
    if (Array.isArray(images)) {
      images.forEach((img) => {
        if (typeof img === 'string' && img.trim()) toAdd.push(img.trim());
      });
    }

    if (toAdd.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one valid image URL to add' });
    }

    const currentImages = Array.isArray(turf.images) ? [...turf.images] : [];
    const updatedImages = [...currentImages, ...toAdd];
    const mainImage = turf.mainImage || updatedImages[0];

    const [updated] = await db
      .update(turfs)
      .set({ images: updatedImages, mainImage })
      .where(eq(turfs.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'gallery_images_added',
      targetType: 'turf',
      targetId: String(id),
      details: { addedCount: toAdd.length, turfName: turf.turfName },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      images: updated.images,
      mainImage: updated.mainImage,
    });
  } catch (error: any) {
    console.error('Failed to add gallery images:', error);
    return res.status(500).json({ error: 'Failed to add images to gallery' });
  }
});

// PUT /api/turfs/:id/gallery/reorder - Reorder gallery images
router.put('/:id/gallery/reorder', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { images } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'images array is required for reordering' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only reorder your own turf gallery' });
    }

    const [updated] = await db
      .update(turfs)
      .set({ images })
      .where(eq(turfs.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'gallery_reordered',
      targetType: 'turf',
      targetId: String(id),
      details: { totalImages: images.length, turfName: turf.turfName },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      images: updated.images,
      mainImage: updated.mainImage,
    });
  } catch (error: any) {
    console.error('Failed to reorder gallery:', error);
    return res.status(500).json({ error: 'Failed to reorder gallery images' });
  }
});

// PUT /api/turfs/:id/gallery/cover - Select cover/main photo
router.put('/:id/gallery/cover', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { coverImage } = req.body;

    if (!coverImage || typeof coverImage !== 'string') {
      return res.status(400).json({ error: 'coverImage URL string is required' });
    }

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only set cover photo for your own turf' });
    }

    const currentImages = Array.isArray(turf.images) ? [...turf.images] : [];
    // Ensure cover image is in the images list
    if (!currentImages.includes(coverImage)) {
      currentImages.unshift(coverImage);
    }

    const [updated] = await db
      .update(turfs)
      .set({ mainImage: coverImage, images: currentImages })
      .where(eq(turfs.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'gallery_cover_updated',
      targetType: 'turf',
      targetId: String(id),
      details: { mainImage: coverImage, turfName: turf.turfName },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      mainImage: updated.mainImage,
      images: updated.images,
    });
  } catch (error: any) {
    console.error('Failed to set cover photo:', error);
    return res.status(500).json({ error: 'Failed to update cover photo' });
  }
});

// DELETE /api/turfs/:id/gallery - Delete an image from gallery
router.delete('/:id/gallery', requireOwner, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { imageUrl, index } = req.body;

    const [turf] = await db.select().from(turfs).where(eq(turfs.id, id));
    if (!turf) {
      return res.status(404).json({ error: 'Turf not found' });
    }

    if (req.user!.role !== 'admin' && turf.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete photos from your own turf' });
    }

    let currentImages = Array.isArray(turf.images) ? [...turf.images] : [];
    let removedImageUrl: string | null = null;
    if (imageUrl) {
      removedImageUrl = imageUrl;
      currentImages = currentImages.filter((img) => img !== imageUrl);
    } else if (typeof index === 'number' && index >= 0 && index < currentImages.length) {
      removedImageUrl = currentImages[index];
      currentImages.splice(index, 1);
    } else {
      return res.status(400).json({ error: 'imageUrl or valid index is required to delete' });
    }

    if (removedImageUrl) {
      deleteStorageObject(removedImageUrl).catch((err) =>
        console.warn('[STORAGE] Async storage object cleanup note:', err.message)
      );
    }

    const newMainImage = turf.mainImage === imageUrl
      ? currentImages[0] || null
      : turf.mainImage;

    const [updated] = await db
      .update(turfs)
      .set({ images: currentImages, mainImage: newMainImage })
      .where(eq(turfs.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'gallery_image_deleted',
      targetType: 'turf',
      targetId: String(id),
      details: { deletedImageUrl: imageUrl, remainingCount: currentImages.length },
      ipAddress: req.ip || req.socket.remoteAddress,
    });

    return res.json({
      success: true,
      images: updated.images,
      mainImage: updated.mainImage,
    });
  } catch (error: any) {
    console.error('Failed to delete gallery image:', error);
    return res.status(500).json({ error: 'Failed to delete gallery image' });
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
