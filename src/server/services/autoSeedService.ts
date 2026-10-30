import { db } from '../../db/index.ts';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Direct Raw SQL Schema Repair.
 *
 * Render Free Tier does not provide terminal access to run manual migrations.
 * This function uses raw SQL db.execute(sql`...`) to safely add missing columns
 * with expected default values without relying on Drizzle ORM migration runners.
 */
export async function ensureTurfSchemaColumns(): Promise<void> {
  try {
    // 1. Ensure core users table exists
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          is_super_admin BOOLEAN DEFAULT FALSE,
          is_email_verified BOOLEAN DEFAULT FALSE,
          is_phone_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        );
      `);
    } catch {
      // Ignore if already created or owned by another role
    }

    // 2. Safely relax owner_id constraint so initial seeding never fails on foreign key mismatch
    await db.execute(sql`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE turfs DROP CONSTRAINT IF EXISTS turfs_owner_id_users_id_fk;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE turfs ALTER COLUMN owner_id DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `);

    // 3. Direct Raw SQL column additions as required for turfs
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT TRUE;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS verification_status VARCHAR DEFAULT 'approved';`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS suspension_reason TEXT;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;`);

    // 4. Ensure name, sports, and core discovery columns exist in PostgreSQL
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS turf_name TEXT;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS name TEXT;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS address TEXT;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Dhaka';`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Dhaka';`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS price_per_hour INTEGER DEFAULT 2000;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS sport_type JSONB DEFAULT '["football"]'::jsonb;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS sports JSONB DEFAULT '["football"]'::jsonb;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS surface_type TEXT DEFAULT '50mm Synthetic Turf';`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '["Floodlights", "Changing Room", "Parking"]'::jsonb;`);
    await db.execute(sql`ALTER TABLE turfs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;`);

    // 5. Ensure users table has all Owner Verification & Super Admin columns in PostgreSQL
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_verification_status TEXT DEFAULT 'pending';`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_submitted_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_reviewed_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_reviewed_by INTEGER;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_approved_by INTEGER;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_rejected_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_rejected_by INTEGER;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_rejection_reason TEXT;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_suspended_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_suspended_by INTEGER;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_suspension_reason TEXT;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_documents JSONB DEFAULT '[]'::jsonb;`);

    console.log('[AutoSeed] Successfully executed direct raw SQL schema repairs on turfs and users tables.');
  } catch (error: any) {
    console.warn('[AutoSeed] Direct raw SQL schema repair notice:', error?.message || error);
  }
}

/**
 * Emergency Raw SQL Auto-Seeder for TurfBD.
 *
 * Uses raw SQL db.execute(sql`...`) instead of ORM helper methods to prevent
 * schema mismatch or constraint errors on remote PostgreSQL environments (like Render).
 *
 * Inserts Daffodil Turf Arena and Gulshan United Arena with explicit values for:
 * name, location, price_per_hour, sports, images, is_demo = true, is_verified = true,
 * and verification_status = 'approved'.
 */
export async function autoSeedDatabase(force: boolean = false): Promise<{ seeded: boolean; count: number; rows?: any[] }> {
  try {
    // 1. Direct Raw SQL Schema Repair
    await ensureTurfSchemaColumns();

    // 2. Ensure the 2 hardcoded Super Admin accounts exist and are verified with role='super_admin'
    try {
      const salt = await bcrypt.genSalt(10);
      const hash1 = await bcrypt.hash('Super@dmin01', salt);
      const hash2 = await bcrypt.hash('Super@dmin02', salt);

      await db.execute(sql`
        INSERT INTO users (name, phone, email, password_hash, role, is_super_admin, is_email_verified, is_phone_verified)
        VALUES 
          ('Super Admin', '+8801631000001', 'salahuddinazad01631@gmail.com', ${hash1}, 'super_admin', true, true, true),
          ('Super Admin', '+8801700000002', 'sharafatrahman4112003@gmail.com', ${hash2}, 'super_admin', true, true, true)
        ON CONFLICT (email) DO UPDATE SET
          role = 'super_admin',
          is_super_admin = true,
          is_email_verified = true,
          is_phone_verified = true,
          password_hash = EXCLUDED.password_hash;
      `);
      console.log('[AutoSeed] Verified and synced the 2 Super Admin accounts.');
    } catch (superAdminErr: any) {
      console.warn('[AutoSeed] Super Admin seeding notice:', superAdminErr?.message || superAdminErr);
    }

    // 3. Check row count using Raw SQL
    let currentCount = 0;
    try {
      const countCheck = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM turfs;`);
      currentCount = Number((countCheck as any)?.rows?.[0]?.cnt || 0);
    } catch (countErr) {
      console.warn('[AutoSeed] Raw SQL count check failed, assuming 0:', countErr);
      currentCount = 0;
    }

    if (currentCount > 0 && !force) {
      console.log(`[AutoSeed] Turfs table already contains ${currentCount} record(s). Skipping auto-seed.`);
      return { seeded: false, count: currentCount };
    }

    console.log(`[AutoSeed] Table has ${currentCount} records (force=${force}). Executing Emergency Raw SQL Insert...`);

    // 3. Ensure a default user exists for owner_id reference
    let ownerId: number = 1;
    try {
      const userRes = await db.execute(sql`
        INSERT INTO users (name, phone, email, password_hash, role, is_super_admin)
        VALUES ('TurfBD Admin', '+8801912334455', 'admin@turfbd.com', '$2a$10$wT0o3qA4H7lZ/o3R1Lh1MeOqL9B5c2VbJgK.6eFpLqV0k2N.4Z2ea', 'admin', true)
        ON CONFLICT (email) DO UPDATE SET is_super_admin = true
        RETURNING id;
      `);
      ownerId = Number((userRes as any)?.rows?.[0]?.id || 1);
    } catch (userErr) {
      console.warn('[AutoSeed] Default user setup notice:', userErr);
    }

    // 4. Emergency Raw SQL Insert for Daffodil Turf Arena & Gulshan United Arena
    const insertSql = sql`
      INSERT INTO turfs (
        owner_id,
        turf_name,
        name,
        address,
        city,
        area,
        description,
        latitude,
        longitude,
        venue_type,
        surface_type,
        price_per_hour,
        opening_time,
        closing_time,
        images,
        sport_type,
        sports,
        amenities,
        verification_status,
        is_demo,
        is_verified,
        is_featured
      ) VALUES (
        ${ownerId},
        'Daffodil Turf Arena',
        'Daffodil Turf Arena',
        'Road 27 (Old 16), Dhanmondi R/A, Dhaka 1209',
        'Dhaka',
        'Dhanmondi',
        'Premier floodlit sports arena in Dhanmondi featuring high-density AstroTurf for competitive 7-a-side football and box cricket.',
        23.7508,
        90.3739,
        'outdoor',
        'High-Density Non-Infill AstroTurf',
        2000,
        '06:00',
        '02:00',
        '["https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
        '["football", "cricket"]'::jsonb,
        '["football", "cricket"]'::jsonb,
        '["Floodlights", "Changing Room", "Locker Room", "Parking", "Washroom", "First Aid"]'::jsonb,
        'approved',
        true,
        true,
        true
      ), (
        ${ownerId},
        'Gulshan United Arena',
        'Gulshan United Arena',
        'Plot 14, Road 113, Gulshan-2, Dhaka 1212',
        'Dhaka',
        'Gulshan',
        'FIFA Quality Pro artificial turf with high-lux floodlighting, dedicated changing facilities, and secure parking in Gulshan.',
        23.7925,
        90.4162,
        'outdoor',
        '50mm FIFA Quality Pro Turf',
        2500,
        '06:00',
        '02:00',
        '["https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1529900241452-f542a201b17b?auto=format&fit=crop&w=800&q=80"]'::jsonb,
        '["football", "cricket", "futsal"]'::jsonb,
        '["football", "cricket", "futsal"]'::jsonb,
        '["Floodlights", "Changing Room", "Shower", "Locker Room", "Parking", "Cafeteria", "First Aid"]'::jsonb,
        'approved',
        true,
        true,
        true
      )
      RETURNING *;
    `;

    const insertedResult = await db.execute(insertSql);
    const rows = (insertedResult as any)?.rows || [];
    console.log(`[AutoSeed] Emergency Raw SQL insert succeeded with ${rows.length} venues.`);

    return { seeded: true, count: rows.length, rows };
  } catch (error: any) {
    console.error('[AutoSeed] Raw SQL Emergency auto-seed failed:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    return { seeded: false, count: 0, rows: [] };
  }
}
