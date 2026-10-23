import bcrypt from 'bcryptjs';
import { db } from '../../db/index.ts';
import { users, turfs, slots } from '../../db/schema.ts';
import { sql, eq } from 'drizzle-orm';

/**
 * Idempotent database auto-seeder for TurfBD.
 *
 * Runs during server startup (e.g., on Render Free Tier where manual shell access is unavailable).
 * Checks if the 'turfs' table is empty.
 * If empty: safely inserts initial demo venues (Daffodil Turf Arena, Gulshan United Arena)
 * with isDemo: true, isVerified: true, and verificationStatus: 'approved', plus initial match slots.
 * If records already exist: skips completely to preserve authentic customer/owner data.
 */
export async function autoSeedDatabase(): Promise<{ seeded: boolean; count: number }> {
  try {
    // 1. Check if turfs table already contains any venues
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(turfs);
    const existingTurfCount = Number(countResult?.count || 0);

    if (existingTurfCount > 0) {
      console.log(`[AutoSeed] Turfs table already contains ${existingTurfCount} record(s). Skipping auto-seed.`);
      return { seeded: false, count: existingTurfCount };
    }

    console.log('[AutoSeed] Turfs table is empty. Starting idempotent initial demo seeding...');

    // 2. Ensure initial Super Admin and Venue Owner accounts exist
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Password123!', salt);

    // Super Admin
    let adminId: number;
    const [existingAdmin] = await db.select().from(users).where(eq(users.email, 'admin@turfbd.com'));
    if (!existingAdmin) {
      const [newAdmin] = await db.insert(users).values({
        name: 'Shahriar Kabir (Super Admin)',
        email: 'admin@turfbd.com',
        phone: '+8801912334455',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        isSuperAdmin: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      }).returning();
      adminId = newAdmin.id;
      console.log('   + [AutoSeed] Created initial Super Admin: admin@turfbd.com');
    } else {
      adminId = existingAdmin.id;
    }

    // Venue Owner
    let ownerId: number;
    const [existingOwner] = await db.select().from(users).where(eq(users.email, 'owner@gulshanarena.com'));
    if (!existingOwner) {
      const [newOwner] = await db.insert(users).values({
        name: 'Rafiqul Islam (Gulshan Arena Owner)',
        email: 'owner@gulshanarena.com',
        phone: '+8801819876543',
        passwordHash: defaultPasswordHash,
        role: 'owner',
        ownerVerificationStatus: 'approved',
        isEmailVerified: true,
        isPhoneVerified: true,
      }).returning();
      ownerId = newOwner.id;
      console.log('   + [AutoSeed] Created initial Venue Owner: owner@gulshanarena.com');
    } else {
      ownerId = existingOwner.id;
    }

    // 3. Define initial demo turfs
    const demoTurfDefinitions = [
      {
        turfName: 'Daffodil Turf Arena',
        address: 'Road 27 (Old 16), Dhanmondi R/A, Dhaka 1209',
        city: 'Dhaka',
        area: 'Dhanmondi',
        description: 'Premier floodlit sports arena in Dhanmondi featuring high-density AstroTurf for competitive 7-a-side football and box cricket.',
        venueType: 'outdoor',
        sportType: ['football', 'cricket'],
        surfaceType: 'High-Density Non-Infill AstroTurf',
        pricePerHour: 2000,
        dayPricePerHour: 1800,
        nightPricePerHour: 2200,
        openingTime: '06:00',
        closingTime: '02:00',
        verifiedBadge: 'turfbd_verified',
        images: [
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
        ],
        mainImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
        amenities: ['Floodlights', 'Changing Room', 'Locker Room', 'Parking', 'Washroom', 'First Aid'],
        rating: 4.9,
        reviewCount: 38,
        latitude: 23.7508,
        longitude: 90.3739,
        ownerId: ownerId || adminId,
        verificationStatus: 'approved',
        isVerified: true,
        isDemo: true,
        isFeatured: true,
      },
      {
        turfName: 'Gulshan United Arena',
        address: 'Plot 14, Road 113, Gulshan-2, Dhaka 1212',
        city: 'Dhaka',
        area: 'Gulshan',
        description: 'FIFA Quality Pro artificial turf with high-lux floodlighting, dedicated changing facilities, and secure parking in Gulshan.',
        venueType: 'outdoor',
        sportType: ['football', 'cricket', 'futsal'],
        surfaceType: '50mm FIFA Quality Pro Turf',
        pricePerHour: 2500,
        dayPricePerHour: 2200,
        nightPricePerHour: 2800,
        openingTime: '06:00',
        closingTime: '02:00',
        verifiedBadge: 'gold_partner',
        images: [
          'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1529900241452-f542a201b17b?auto=format&fit=crop&w=800&q=80',
        ],
        mainImage: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80',
        amenities: ['Floodlights', 'Changing Room', 'Shower', 'Locker Room', 'Parking', 'Cafeteria', 'First Aid'],
        rating: 4.8,
        reviewCount: 52,
        latitude: 23.7925,
        longitude: 90.4162,
        ownerId: ownerId || adminId,
        verificationStatus: 'approved',
        isVerified: true,
        isDemo: true,
        isFeatured: true,
      },
    ];

    // 4. Insert initial demo turfs and generate initial slots
    let insertedCount = 0;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const targetDates = [today, tomorrow];
    const slotHours = ['08:00', '10:00', '16:00', '18:00', '20:00', '22:00'];

    for (const turfData of demoTurfDefinitions) {
      const [insertedTurf] = await db.insert(turfs).values(turfData).returning();
      insertedCount++;
      console.log(`   + [AutoSeed] Inserted demo turf: ${insertedTurf.turfName} (ID: ${insertedTurf.id}, isDemo: true, status: approved)`);

      // Seed slots for this demo venue
      for (const d of targetDates) {
        for (const h of slotHours) {
          const nextHour = (parseInt(h.slice(0, 2), 10) + 1).toString().padStart(2, '0');
          await db.insert(slots).values({
            turfId: insertedTurf.id,
            date: d,
            startTime: h,
            endTime: `${nextHour}:00`,
            status: 'available',
          });
        }
      }
    }

    console.log(`[AutoSeed] Successfully initialized ${insertedCount} demo turfs with booking slots.`);
    return { seeded: true, count: insertedCount };
  } catch (error: any) {
    console.error('[AutoSeed] Error during auto-seed routine:', error?.message || error);
    return { seeded: false, count: 0 };
  }
}
