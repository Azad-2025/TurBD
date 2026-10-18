import { db } from '../src/db/index.ts';
import { users, auditLogs } from '../src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details?: string, error?: string) {
  testResults.push({ id, name, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Security Test #${id}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function runSuperAdminSecurityTests() {
  console.log('================================================================');
  console.log('     TurfBD Stage 1: Super Admin Security Verification Suite    ');
  console.log('================================================================\n');

  const loginUser = async (email: string, password = 'Password123!') => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      console.warn(`[Login] ${email} login returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.token;
  };

  const ts = Date.now();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1. Ensure Super Admin exists with isSuperAdmin: true
  const [existingSuperAdmin] = await db.select().from(users).where(eq(users.email, 'admin@turfbd.com'));
  if (existingSuperAdmin && !existingSuperAdmin.isSuperAdmin) {
    await db.update(users).set({ isSuperAdmin: true }).where(eq(users.id, existingSuperAdmin.id));
  }
  const superAdminToken = await loginUser('admin@turfbd.com', 'Password123!');
  if (!superAdminToken) throw new Error('Super Admin login failed');

  // 2. Create an ordinary Admin (role='admin', isSuperAdmin=false)
  const ordinaryAdminEmail = `ordinary_admin_${ts}@turfbd.com`;
  const [ordinaryAdminUser] = await db
    .insert(users)
    .values({
      name: 'Ordinary Test Admin',
      email: ordinaryAdminEmail,
      phone: `+88019${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'admin',
      isSuperAdmin: false,
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const ordinaryAdminToken = await loginUser(ordinaryAdminEmail, 'Password123!');

  // 3. Create a Turf Owner
  const ownerEmail = `test_owner_${ts}@turfbd.com`;
  const [ownerUser] = await db
    .insert(users)
    .values({
      name: 'Test Owner',
      email: ownerEmail,
      phone: `+88018${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'owner',
      ownerVerificationStatus: 'approved',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const ownerToken = await loginUser(ownerEmail, 'Password123!');

  // 4. Create a Customer
  const customerEmail = `test_cust_${ts}@turfbd.com`;
  const [customerUser] = await db
    .insert(users)
    .values({
      name: 'Test Customer',
      email: customerEmail,
      phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const customerToken = await loginUser(customerEmail, 'Password123!');

  // Create another target user to test role modifications
  const targetEmail = `target_user_${ts}@turfbd.com`;
  const [targetUser] = await db
    .insert(users)
    .values({
      name: 'Target User',
      email: targetEmail,
      phone: `+88016${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();

  console.log('Test fixtures initialized.');
  console.log(`- Super Admin ID: ${existingSuperAdmin?.id} (${existingSuperAdmin?.email})`);
  console.log(`- Ordinary Admin ID: ${ordinaryAdminUser.id} (${ordinaryAdminEmail})`);
  console.log(`- Turf Owner ID: ${ownerUser.id} (${ownerEmail})`);
  console.log(`- Customer ID: ${customerUser.id} (${customerEmail})`);
  console.log(`- Target User ID: ${targetUser.id} (${targetEmail})\n`);

  // TEST 1: Customer cannot create or promote to Admin
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        userId: targetUser.id,
        role: 'admin',
      }),
    });
    record(
      1,
      'Customer cannot create or promote an Admin account',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 2: Turf Owner cannot create or promote to Admin
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        userId: targetUser.id,
        role: 'admin',
      }),
    });
    record(
      2,
      'Turf Owner cannot create or promote an Admin account',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 3: Ordinary Admin cannot create/promote another user to Admin
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ordinaryAdminToken}`,
      },
      body: JSON.stringify({
        userId: targetUser.id,
        role: 'admin',
      }),
    });
    record(
      3,
      'Ordinary Admin cannot promote user to Admin (403 SUPER_ADMIN_REQUIRED)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 4: Ordinary Admin cannot promote themselves or alter self role
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ordinaryAdminToken}`,
      },
      body: JSON.stringify({
        userId: ordinaryAdminUser.id,
        role: 'admin',
        isSuperAdmin: true,
      }),
    });
    record(
      4,
      'Ordinary Admin cannot alter self role / privileges (Self-Promotion Guard)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 5: Ordinary Admin cannot grant themselves or others Super Admin privileges
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ordinaryAdminToken}`,
      },
      body: JSON.stringify({
        userId: targetUser.id,
        role: 'customer',
        isSuperAdmin: true,
      }),
    });
    record(
      5,
      'Ordinary Admin cannot grant Super Admin privileges (403)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 6: Unauthorized direct API requests without token rejected with 401
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUser.id,
        role: 'admin',
      }),
    });
    record(
      6,
      'Unauthenticated direct API request rejected (401)',
      res.status === 401,
      `Status: ${res.status}`
    );
  }

  // TEST 7: Super Admin can legitimately promote user to Admin
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        userId: targetUser.id,
        role: 'admin',
      }),
    });
    const body = await res.json();
    record(
      7,
      'Authorized Super Admin can legitimately promote user to Admin',
      res.status === 200 && body.role === 'admin',
      `Status: ${res.status}, Assigned Role: ${body.role}`
    );
  }

  // TEST 8: Super Admin actions are audit logged in database
  {
    const [latestAudit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetId, String(targetUser.id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    record(
      8,
      'Super Admin role modification recorded in audit log',
      !!latestAudit && latestAudit.action === 'user_role_changed',
      `Action: ${latestAudit?.action}, Target ID: ${latestAudit?.targetId}`
    );
  }

  // TEST 9: Ordinary Admin CAN manage customer <-> owner roles (legitimate admin governance continues working)
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ordinaryAdminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser.id,
        role: 'owner',
      }),
    });
    const body = await res.json();
    record(
      9,
      'Ordinary Admin can manage operational customer <-> owner roles',
      res.status === 200 && body.role === 'owner',
      `Status: ${res.status}, Target New Role: ${body.role}`
    );
  }

  console.log('\n================================================================');
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log(`Stage 1 Security Suite: ${passed} passed, ${failed} failed of ${testResults.length} tests`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runSuperAdminSecurityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
