import { db } from '../src/db/index.ts';
import { users, turfs } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details?: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [#${id}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function runTest() {
  console.log('================================================================');
  console.log('  TurfBD: Public Turf Listing & Scope Security Verification     ');
  console.log('================================================================\n');

  const ts = Date.now();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const loginUser = async (email: string, password = 'Password123!') => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token;
  };

  // 1. Admin login
  const adminToken = await loginUser('admin@turfbd.com', 'Password123!');
  if (!adminToken) throw new Error('Admin login failed');

  // 2. Create Owner 1
  const owner1Email = `owner1_${ts}@turfbd.com`;
  const [owner1] = await db
    .insert(users)
    .values({
      name: 'Owner One',
      email: owner1Email,
      phone: `+88018${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'owner',
      ownerVerificationStatus: 'approved',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const owner1Token = await loginUser(owner1Email);

  // 3. Create Owner 2
  const owner2Email = `owner2_${ts}@turfbd.com`;
  const [owner2] = await db
    .insert(users)
    .values({
      name: 'Owner Two',
      email: owner2Email,
      phone: `+88018${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'owner',
      ownerVerificationStatus: 'approved',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const owner2Token = await loginUser(owner2Email);

  // 4. Create Customer
  const customerEmail = `customer_${ts}@turfbd.com`;
  const [customer] = await db
    .insert(users)
    .values({
      name: 'Customer Player',
      email: customerEmail,
      phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const customerToken = await loginUser(customerEmail);

  // 5. Create Test Turfs:
  // - Owner 1: Pending Turf
  const [pendingTurf1] = await db
    .insert(turfs)
    .values({
      ownerId: owner1.id,
      turfName: `Owner 1 Pending Arena ${ts}`,
      address: 'Gulshan 2, Dhaka',
      city: 'Dhaka',
      area: 'Gulshan',
      surfaceType: 'Synthetic',
      sportType: ['football'],
      pricePerHour: 2000,
      verificationStatus: 'pending',
    })
    .returning();

  // - Owner 1: Approved Turf
  const [approvedTurf1] = await db
    .insert(turfs)
    .values({
      ownerId: owner1.id,
      turfName: `Owner 1 Approved Arena ${ts}`,
      address: 'Gulshan 1, Dhaka',
      city: 'Dhaka',
      area: 'Gulshan',
      surfaceType: 'Synthetic',
      sportType: ['football'],
      pricePerHour: 2500,
      verificationStatus: 'approved',
    })
    .returning();

  // - Owner 2: Pending Turf
  const [pendingTurf2] = await db
    .insert(turfs)
    .values({
      ownerId: owner2.id,
      turfName: `Owner 2 Pending Arena ${ts}`,
      address: 'Dhanmondi, Dhaka',
      city: 'Dhaka',
      area: 'Dhanmondi',
      surfaceType: 'Synthetic',
      sportType: ['cricket'],
      pricePerHour: 1800,
      verificationStatus: 'pending',
    })
    .returning();

  // TEST 1: Public unauthenticated GET /api/turfs never exposes pending turfs
  {
    const res = await fetch(`${BASE_URL}/api/turfs`);
    const data = await res.json();
    const hasPending = data.some((t: any) => t.verificationStatus !== 'approved' || t.status !== 'approved');
    const hasPending1 = data.some((t: any) => t.id === pendingTurf1.id);
    const hasApproved1 = data.some((t: any) => t.id === approvedTurf1.id);
    record(
      1,
      'Public GET /api/turfs returns only approved turfs and never exposes pending venues',
      res.status === 200 && !hasPending && !hasPending1 && hasApproved1,
      `Status: ${res.status}, Total: ${data.length}, Pending leaked: ${hasPending}`
    );
  }

  // TEST 2: Public unauthenticated GET /api/turfs?status=pending blocked with 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/turfs?status=pending`);
    record(
      2,
      'Public visitor passing ?status=pending is rejected with 403 Forbidden',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 3: Public visitor passing ?status=all blocked with 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/turfs?status=all`);
    record(
      3,
      'Public visitor passing ?status=all is rejected with 403 Forbidden',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 4: Customer account passing ?status=pending blocked with 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/turfs?status=pending`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    record(
      4,
      'Customer account passing ?status=pending is rejected with 403 Forbidden',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 5: Admin can review pending turfs via ?status=pending
  {
    const res = await fetch(`${BASE_URL}/api/turfs?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const foundPending1 = data.some((t: any) => t.id === pendingTurf1.id);
    const foundPending2 = data.some((t: any) => t.id === pendingTurf2.id);
    record(
      5,
      'Admin can fetch pending approval queue via ?status=pending',
      res.status === 200 && foundPending1 && foundPending2,
      `Status: ${res.status}, Found Owner1 Pending: ${foundPending1}, Found Owner2 Pending: ${foundPending2}`
    );
  }

  // TEST 6: Admin can review all turfs when no status filter is provided
  {
    const res = await fetch(`${BASE_URL}/api/turfs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const foundPending1 = data.some((t: any) => t.id === pendingTurf1.id);
    const foundApproved1 = data.some((t: any) => t.id === approvedTurf1.id);
    record(
      6,
      'Admin receives all listings (pending + approved) for platform management tabs',
      res.status === 200 && foundPending1 && foundApproved1,
      `Status: ${res.status}, Contains Pending: ${foundPending1}, Approved: ${foundApproved1}`
    );
  }

  // TEST 7: Authenticated Owner 1 accessing public browse GET /api/turfs does NOT see their pending turf in public browse
  {
    const res = await fetch(`${BASE_URL}/api/turfs`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const data = await res.json();
    const hasOwner1Pending = data.some((t: any) => t.id === pendingTurf1.id);
    const hasOwner1Approved = data.some((t: any) => t.id === approvedTurf1.id);
    record(
      7,
      'Authenticated Owner calling general public browse GET /api/turfs only receives approved turfs',
      res.status === 200 && !hasOwner1Pending && hasOwner1Approved,
      `Status: ${res.status}, Pending Leaked in Public Browse: ${hasOwner1Pending}`
    );
  }

  // TEST 8: Authenticated Owner 1 scoped management GET /api/turfs?scope=owner returns their pending & approved turfs
  {
    const res = await fetch(`${BASE_URL}/api/turfs?scope=owner`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const data = await res.json();
    const foundOwner1Pending = data.some((t: any) => t.id === pendingTurf1.id);
    const foundOwner1Approved = data.some((t: any) => t.id === approvedTurf1.id);
    const hasOwner2Turf = data.some((t: any) => t.id === pendingTurf2.id);
    record(
      8,
      'Owner 1 can manage their own pending & approved turfs via scoped endpoint without seeing Owner 2',
      res.status === 200 && foundOwner1Pending && foundOwner1Approved && !hasOwner2Turf,
      `Status: ${res.status}, Own Pending: ${foundOwner1Pending}, Foreign Owner Leaked: ${hasOwner2Turf}`
    );
  }

  // TEST 9: Owner 1 CANNOT query Owner 2 private listings via ?scope=owner&ownerId=<owner2.id> (403)
  {
    const res = await fetch(`${BASE_URL}/api/turfs?scope=owner&ownerId=${owner2.id}`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    record(
      9,
      'Owner 1 is strictly forbidden from querying Owner 2 private listings (403 Forbidden)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // TEST 10: GET /api/turfs/:id hides pending venue from unauthenticated visitors and customers (404)
  {
    const resVisitor = await fetch(`${BASE_URL}/api/turfs/${pendingTurf1.id}`);
    const resCustomer = await fetch(`${BASE_URL}/api/turfs/${pendingTurf1.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const resOwner = await fetch(`${BASE_URL}/api/turfs/${pendingTurf1.id}`, {
      headers: { Authorization: `Bearer ${owner1Token}` },
    });
    const resAdmin = await fetch(`${BASE_URL}/api/turfs/${pendingTurf1.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record(
      10,
      'Single turf endpoint GET /api/turfs/:id protects unapproved venues (404 to visitor/customer, 200 to owner/admin)',
      resVisitor.status === 404 && resCustomer.status === 404 && resOwner.status === 200 && resAdmin.status === 200,
      `Visitor: ${resVisitor.status}, Customer: ${resCustomer.status}, Owner: ${resOwner.status}, Admin: ${resAdmin.status}`
    );
  }

  // TEST 11: Schema status vs verificationStatus compatibility adapter verification
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${approvedTurf1.id}`);
    const data = await res.json();
    const hasStatus = data.status === 'approved';
    const hasVerificationStatus = data.verificationStatus === 'approved';
    record(
      11,
      'API response provides both status and verificationStatus identically for frontend compatibility',
      hasStatus && hasVerificationStatus,
      `status: '${data.status}', verificationStatus: '${data.verificationStatus}'`
    );
  }

  console.log('\n----------------------------------------------------------------');
  const allPassed = results.every((r) => r.passed);
  console.log(`Summary: ${results.filter((r) => r.passed).length}/${results.length} tests passed.`);
  console.log('----------------------------------------------------------------\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTest().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
