import bcrypt from 'bcryptjs';
import { db } from '../src/db/index.js';
import { users, turfs, slots } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function seedDatabase() {
  console.log('====================================================');
  console.log('            TurfBD Database Seeder                  ');
  console.log('====================================================');

  try {
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Password123!', salt);

    // 1. Seed Core Users
    console.log('1. Checking & seeding core user accounts...');

    // Super Admin
    const [existingAdmin] = await db.select().from(users).where(eq(users.email, 'admin@turfbd.com'));
    let adminId = existingAdmin?.id;
    if (!existingAdmin) {
      const [newAdmin] = await db.insert(users).values({
        name: 'Shahriar Kabir (Super Admin)',
        email: 'admin@turfbd.com',
        phone: '+8801912334455',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        isEmailVerified: true,
        isPhoneVerified: true,
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      }).returning();
      adminId = newAdmin.id;
      console.log('   + Created Super Admin: admin@turfbd.com (pass: Password123!)');
    } else {
      console.log('   * Super Admin already exists: admin@turfbd.com');
    }

    // Venue Owner
    const [existingOwner] = await db.select().from(users).where(eq(users.email, 'owner@gulshanarena.com'));
    let ownerId = existingOwner?.id;
    if (!existingOwner) {
      const [newOwner] = await db.insert(users).values({
        name: 'Rafiqul Islam (Gulshan Arena Owner)',
        email: 'owner@gulshanarena.com',
        phone: '+8801819876543',
        passwordHash: defaultPasswordHash,
        role: 'owner',
        isEmailVerified: true,
        isPhoneVerified: true,
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      }).returning();
      ownerId = newOwner.id;
      console.log('   + Created Venue Owner: owner@gulshanarena.com (pass: Password123!)');
    } else {
      console.log('   * Venue Owner already exists: owner@gulshanarena.com');
    }

    // Customer Player
    const [existingPlayer] = await db.select().from(users).where(eq(users.email, 'tanvir@turfbd.com'));
    if (!existingPlayer) {
      await db.insert(users).values({
        name: 'Tanvir Ahmed',
        email: 'tanvir@turfbd.com',
        phone: '+8801711234567',
        passwordHash: defaultPasswordHash,
        role: 'customer',
        isEmailVerified: true,
        isPhoneVerified: true,
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      });
      console.log('   + Created Player User: tanvir@turfbd.com (pass: Password123!)');
    } else {
      console.log('   * Player User already exists: tanvir@turfbd.com');
    }

    // 2. Seed Initial Venues
    console.log('\n2. Checking & seeding featured Bangladesh turfs...');
    const seedTurfs = [
      {
        name: 'Gulshan United Arena',
        address: 'Plot 14, Road 113, Gulshan-2, Dhaka 1212',
        city: 'Dhaka',
        sports: ['football', 'cricket', 'futsal'],
        surface: '50mm FIFA Quality Pro Turf',
        hourlyRate: 2500,
        images: [
          'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1529900241452-f542a201b17b?auto=format&fit=crop&w=800&q=80',
        ],
        verificationStatus: 'approved',
        ownerId: ownerId || 2,
      },
      {
        name: 'Daffodil Turf Arena',
        address: 'Road 27 (Old 16), Dhanmondi R/A, Dhaka 1209',
        city: 'Dhaka',
        sports: ['cricket', 'football'],
        surface: 'High-Density Non-Infill AstroTurf',
        hourlyRate: 2000,
        images: [
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
        ],
        verificationStatus: 'approved',
        ownerId: ownerId || 2,
      },
      {
        name: 'Sylhet Green Field Arena',
        address: 'Baruthkhana Road, Zindabazar, Sylhet 3100',
        city: 'Sylhet',
        sports: ['badminton', 'football'],
        surface: 'BWF Certified Badminton Mats & 40mm Grass',
        hourlyRate: 1500,
        images: [
          'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
        ],
        verificationStatus: 'pending', // Seed as pending to allow testing admin verification workflow
        ownerId: ownerId || 2,
      },
    ];

    for (const t of seedTurfs) {
      const [existingTurf] = await db.select().from(turfs).where(eq(turfs.turfName, t.name));
      if (!existingTurf) {
        const [insertedTurf] = await db.insert(turfs).values({
          turfName: t.name,
          address: t.address,
          city: t.city,
          sportType: t.sports,
          surfaceType: t.surface,
          pricePerHour: t.hourlyRate,
          images: t.images,
          mainImage: t.images[0],
          ownerId: t.ownerId,
          verificationStatus: t.verificationStatus,
        }).returning();
        console.log(`   + Created venue: ${t.name} (Status: ${t.verificationStatus})`);

        // Seed slots for today and tomorrow
        const dates = [
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 86400000).toISOString().split('T')[0],
        ];
        const hours = ['08:00', '10:00', '16:00', '18:00', '20:00', '22:00'];
        for (const d of dates) {
          for (const h of hours) {
            await db.insert(slots).values({
              turfId: insertedTurf.id,
              date: d,
              startTime: h,
              endTime: `${(parseInt(h.slice(0, 2), 10) + 1).toString().padStart(2, '0')}:00`,
              status: 'available',
            });
          }
        }
      } else {
        console.log(`   * Venue already exists: ${t.name}`);
      }
    }

    console.log('\n====================================================');
    console.log('✅ TurfBD Database Seeding Completed Successfully!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Seeding failed:', err?.message || err);
    process.exit(1);
  }
}

seedDatabase();
