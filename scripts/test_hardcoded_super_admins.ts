import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

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
  console.log(`${icon} [#${id}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function main() {
  console.log('================================================================');
  console.log(' TurfBD Super Admin Credentials & Automatic Privileges QA Suite ');
  console.log('================================================================\n');

  // TEST 1: Super Admin 1 Login (salahuddinazad01631@gmail.com / Super@dmin01)
  let token1 = '';
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'salahuddinazad01631@gmail.com',
        password: 'Super@dmin01',
      }),
    });
    const data = await res.json();
    token1 = data.token;
    record(
      1,
      'POST /api/auth/login succeeds for Super Admin 1 (salahuddinazad01631@gmail.com)',
      res.status === 200 && !!data.token,
      `Status: ${res.status}, hasToken: ${!!data.token}`
    );

    record(
      2,
      'Super Admin 1 auth response returns role: "super_admin", isSuperAdmin: true, isVerified: true',
      data.user?.role === 'super_admin' && data.user?.isSuperAdmin === true && (data.user?.isVerified === true || data.user?.is_verified === true),
      `Role: ${data.user?.role}, isSuperAdmin: ${data.user?.isSuperAdmin}, isVerified: ${data.user?.isVerified}`
    );

    record(
      3,
      'Super Admin 1 auth response returns name: "Super Admin"',
      data.user?.name === 'Super Admin',
      `Name: ${data.user?.name}`
    );
  }

  // TEST 2: Case-insensitive email login for Super Admin 1
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'SalahuddinAzad01631@GMAIL.COM',
        password: 'Super@dmin01',
      }),
    });
    const data = await res.json();
    record(
      4,
      'Super Admin 1 login is case-insensitive (SalahuddinAzad01631@GMAIL.COM)',
      res.status === 200 && data.user?.role === 'super_admin',
      `Status: ${res.status}, Role: ${data.user?.role}`
    );
  }

  // TEST 3: Database Record Verification for Super Admin 1
  {
    const [dbRecord] = await db.select().from(users).where(eq(users.email, 'salahuddinazad01631@gmail.com'));
    record(
      5,
      'PostgreSQL users table contains record for salahuddinazad01631@gmail.com with role="super_admin"',
      dbRecord !== undefined && dbRecord.role === 'super_admin',
      `Found: ${!!dbRecord}, role: ${dbRecord?.role}, isSuperAdmin: ${dbRecord?.isSuperAdmin}`
    );
  }

  // TEST 4: Super Admin 2 Login (Sharafatrahman4112003@gmail.com / Super@dmin02)
  let token2 = '';
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Sharafatrahman4112003@gmail.com',
        password: 'Super@dmin02',
      }),
    });
    const data = await res.json();
    token2 = data.token;
    record(
      6,
      'POST /api/auth/login succeeds for Super Admin 2 (Sharafatrahman4112003@gmail.com)',
      res.status === 200 && !!data.token,
      `Status: ${res.status}, hasToken: ${!!data.token}`
    );

    record(
      7,
      'Super Admin 2 auth response returns role: "super_admin", isSuperAdmin: true, isVerified: true',
      data.user?.role === 'super_admin' && data.user?.isSuperAdmin === true && (data.user?.isVerified === true || data.user?.is_verified === true),
      `Role: ${data.user?.role}, isSuperAdmin: ${data.user?.isSuperAdmin}, isVerified: ${data.user?.isVerified}`
    );
  }

  // TEST 5: Database Record Verification for Super Admin 2
  {
    const [dbRecord] = await db.select().from(users).where(eq(users.email, 'sharafatrahman4112003@gmail.com'));
    record(
      8,
      'PostgreSQL users table contains record for sharafatrahman4112003@gmail.com with role="super_admin"',
      dbRecord !== undefined && dbRecord.role === 'super_admin',
      `Found: ${!!dbRecord}, role: ${dbRecord?.role}, isSuperAdmin: ${dbRecord?.isSuperAdmin}`
    );
  }

  // TEST 6: GET /api/auth/me returns super_admin privileges with token
  {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data = await res.json();
    record(
      9,
      'GET /api/auth/me with Super Admin token returns role="super_admin" and isSuperAdmin=true',
      res.status === 200 && data.user?.role === 'super_admin' && data.user?.isSuperAdmin === true,
      `Status: ${res.status}, Role: ${data.user?.role}, isSuperAdmin: ${data.user?.isSuperAdmin}`
    );
  }

  // TEST 7: Super Admin protected endpoint access (GET /api/admin/demo-turfs-status)
  {
    const res = await fetch(`${BASE_URL}/api/admin/demo-turfs-status`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data = await res.json();
    record(
      10,
      'Super Admin token successfully authorizes requireSuperAdmin on /api/admin/demo-turfs-status',
      res.status === 200 && data.success === true,
      `Status: ${res.status}, success: ${data.success}`
    );
  }

  // TEST 8: Super Admin 2 also authorizes requireSuperAdmin
  {
    const res = await fetch(`${BASE_URL}/api/admin/demo-turfs-status`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const data = await res.json();
    record(
      11,
      'Super Admin 2 token successfully authorizes requireSuperAdmin on /api/admin/demo-turfs-status',
      res.status === 200 && data.success === true,
      `Status: ${res.status}, success: ${data.success}`
    );
  }

  // TEST 9: Incorrect password rejection for super admin email
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'salahuddinazad01631@gmail.com',
        password: 'WrongPassword!',
      }),
    });
    record(
      12,
      'Incorrect password for super admin email is rejected with 401',
      res.status === 401,
      `Status: ${res.status}`
    );
  }

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  console.log('\n================================================================');
  console.log(` Summary: ${passedCount}/${totalCount} Tests Passed`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
