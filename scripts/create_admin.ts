import bcrypt from 'bcryptjs';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * TurfBD Production Admin Account Provisioning Script
 * Usage:
 *   npx tsx scripts/create_admin.ts <email> <password> <name> <phone>
 * Example:
 *   npx tsx scripts/create_admin.ts admin@turfbd.com SecurePass123! "Super Admin" "+8801912334455"
 */
async function createAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.INITIAL_ADMIN_EMAIL || 'admin@turfbd.com').toLowerCase().trim();
  const password = args[1] || process.env.INITIAL_ADMIN_PASSWORD || 'Password123!';
  const name = args[2] || process.env.INITIAL_ADMIN_NAME || 'TurfBD Super Admin';
  const phone = args[3] || process.env.INITIAL_ADMIN_PHONE || '+8801912334455';

  console.log('====================================================');
  console.log('       TurfBD Production Admin Setup Script         ');
  console.log('====================================================');
  console.log(`Target Email : ${email}`);
  console.log(`Name         : ${name}`);
  console.log(`Phone        : ${phone}`);
  console.log('----------------------------------------------------');

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if user already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email));

    if (existing) {
      console.log(`User ${email} already exists (ID: ${existing.id}). Upgrading to 'admin' role & updating credentials...`);
      await db
        .update(users)
        .set({
          role: 'admin',
          passwordHash,
          name,
          phone,
          isEmailVerified: true,
          isPhoneVerified: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, existing.id));

      console.log('✅ Existing user successfully promoted to Super Admin.');
    } else {
      console.log(`Creating new Super Admin user for ${email}...`);
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          phone,
          email,
          passwordHash,
          role: 'admin',
          isEmailVerified: true,
          isPhoneVerified: true,
          profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        })
        .returning();

      console.log(`✅ Super Admin created successfully! (User ID: ${newUser.id})`);
    }

    console.log('----------------------------------------------------');
    console.log('Admin Login Details:');
    console.log(`  Portal URL: /admin (or click 'Admin' in top navigation)`);
    console.log(`  Email     : ${email}`);
    console.log(`  Password  : [HIDDEN]`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Failed to provision admin account:', err?.message || err);
    process.exit(1);
  }
}

createAdmin();
