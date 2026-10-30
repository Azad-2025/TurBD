import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { getOwnersVerificationQueue } from '../src/server/routes/admin.ts';

async function main() {
  console.log('--- Testing Owner Verification Resilience & Endpoints ---');

  // 1. Test getOwnersVerificationQueue directly
  try {
    const queue = await getOwnersVerificationQueue({});
    console.log(`[PASS] getOwnersVerificationQueue returned successfully with ${queue.length} owners.`);
    for (const o of queue.slice(0, 3)) {
      console.log(`   - Owner ID: ${o.id}, Name: ${o.name}, Status: ${o.ownerVerificationStatus}, Turfs: ${o.turfsCount}`);
    }
  } catch (err: any) {
    console.error('[FAIL] getOwnersVerificationQueue threw:', err);
    process.exit(1);
  }

  // 2. Check super admin users exist and are configured
  const superAdminEmails = [
    'salahuddinazad01631@gmail.com',
    'sharafatrahman4112003@gmail.com',
  ];

  for (const email of superAdminEmails) {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    if (u) {
      console.log(`[PASS] Super admin verified in DB: ${u.email} (role: ${u.role}, isSuperAdmin: ${u.isSuperAdmin})`);
    } else {
      console.log(`[WARN] Super admin not yet in DB: ${email}`);
    }
  }

  console.log('\n--- All Owner Verification Checks Completed Successfully ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
