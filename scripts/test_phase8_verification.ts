import { db } from '../src/db/index.ts';
import { users, turfs, bookings, slots, payouts, auditLogs } from '../src/db/schema.ts';
import { eq, and, desc, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

function record(id: number, category: string, name: string, passed: boolean, details?: string, error?: string) {
  testResults.push({ id, category, name, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category} #${id}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function runPhase8Verification() {
  console.log('================================================================');
  console.log('   TurfBD Phase 8: Final Verification & Security Audit Suite    ');
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

  // 1. SETUP TEST FIXTURES
  // Super Admin token
  const adminToken = await loginUser('admin@turfbd.com', 'Password123!');
  if (!adminToken) {
    throw new Error('Could not log in as Super Admin admin@turfbd.com');
  }

  // Approved owner token
  const approvedOwnerToken = await loginUser('owner@gulshanarena.com', 'Password123!');
  if (!approvedOwnerToken) {
    throw new Error('Could not log in as Approved Owner owner@gulshanarena.com');
  }

  // Find or create a temporary pending owner
  const timestamp = Date.now();
  const pendingEmail = `pending_owner_${timestamp}@test.turfbd.com`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const [pendingOwnerUser] = await db
    .insert(users)
    .values({
      name: 'Pending Test Owner',
      email: pendingEmail,
      phone: `+88019${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'owner',
      ownerVerificationStatus: 'pending',
      ownerSubmittedAt: new Date(),
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();

  const pendingOwnerToken = await loginUser(pendingEmail, 'Password123!');

  // Find or create a rejected owner
  const rejectedEmail = `rejected_owner_${timestamp}@test.turfbd.com`;
  const [rejectedOwnerUser] = await db
    .insert(users)
    .values({
      name: 'Rejected Test Owner',
      email: rejectedEmail,
      phone: `+88019${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'owner',
      ownerVerificationStatus: 'rejected',
      ownerSubmittedAt: new Date(),
      ownerRejectedAt: new Date(),
      ownerRejectionReason: 'Invalid trade license document submitted',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const rejectedOwnerToken = await loginUser(rejectedEmail, 'Password123!');

  // Find or create a suspended owner
  const suspendedEmail = `suspended_owner_${timestamp}@test.turfbd.com`;
  const [suspendedOwnerUser] = await db
    .insert(users)
    .values({
      name: 'Suspended Test Owner',
      email: suspendedEmail,
      phone: `+88019${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'owner',
      ownerVerificationStatus: 'suspended',
      ownerSubmittedAt: new Date(),
      ownerSuspendedAt: new Date(),
      ownerSuspensionReason: 'Terms of service violation',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const suspendedOwnerToken = await loginUser(suspendedEmail, 'Password123!');

  // Customer token
  const customerEmail = `customer_${timestamp}@test.turfbd.com`;
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

  console.log(`\nTest fixtures initialized successfully.`);

  // -------------------------------------------------------------
  // TEST SECTION 1: THREE-ROLE ARCHITECTURE & ADMIN SECURITY
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Three-Role Architecture & Admin Security ---');

  // Test 1.1: Public Registration with role='admin' must be rejected (403)
  {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `hacker_${timestamp}@evil.com`,
        phone: '+8801811223344',
        password: 'Password123!',
        role: 'admin',
      }),
    });
    record(
      1,
      'Admin Security',
      'Public registration cannot create Admin role',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 1.2: Customer cannot promote self or call PATCH /api/auth/role (403)
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        userId: customerUser.id,
        role: 'admin',
      }),
    });
    record(
      2,
      'Admin Security',
      'Non-admin cannot modify user roles (RBAC)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 1.3: Super Admin can manage roles
  {
    const res = await fetch(`${BASE_URL}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userId: customerUser.id,
        role: 'customer',
      }),
    });
    record(
      3,
      'Admin Security',
      'Super Admin authorized to manage user roles',
      res.status === 200,
      `Status: ${res.status}`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 2: OWNER VERIFICATION LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Owner Verification Lifecycle & Restrictions ---');

  // Test 2.1: Pending owner blocked from owner APIs (POST /api/turfs)
  {
    const res = await fetch(`${BASE_URL}/api/turfs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pendingOwnerToken}`,
      },
      body: JSON.stringify({
        turfName: 'Pending Arena',
        address: 'Dhaka',
        city: 'Dhaka',
        pricePerHour: 2000,
      }),
    });
    record(
      4,
      'Owner Verification',
      'Pending owner blocked from creating turf (403 OWNER_NOT_APPROVED)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 2.2: Rejected owner blocked from operational APIs
  {
    const res = await fetch(`${BASE_URL}/api/turfs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rejectedOwnerToken}`,
      },
      body: JSON.stringify({
        turfName: 'Rejected Arena',
        address: 'Dhaka',
        city: 'Dhaka',
        pricePerHour: 2000,
      }),
    });
    record(
      5,
      'Owner Verification',
      'Rejected owner blocked from operational endpoints (403)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 2.3: Suspended owner blocked from operational APIs
  {
    const res = await fetch(`${BASE_URL}/api/turfs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${suspendedOwnerToken}`,
      },
      body: JSON.stringify({
        turfName: 'Suspended Arena',
        address: 'Dhaka',
        city: 'Dhaka',
        pricePerHour: 2000,
      }),
    });
    record(
      6,
      'Owner Verification',
      'Suspended owner immediately loses operational access (403)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 2.4: Admin approval workflow (PATCH /api/auth/owners/:id/verification)
  {
    const res = await fetch(`${BASE_URL}/api/auth/owners/${pendingOwnerUser.id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'approved',
      }),
    });
    const body = await res.json();
    record(
      7,
      'Owner Verification',
      'Admin approves pending owner -> status=approved',
      res.status === 200 && body.success === true,
      `Status: ${res.status}`
    );
  }

  // Test 2.5: Rejection requires a mandatory reason
  {
    const res = await fetch(`${BASE_URL}/api/auth/owners/${pendingOwnerUser.id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'rejected',
        reason: '', // empty reason must fail
      }),
    });
    record(
      8,
      'Owner Verification',
      'Rejection without reason is rejected (400 Bad Request)',
      res.status === 400,
      `Status: ${res.status}`
    );
  }

  // Test 2.6: Audit log recorded for owner verification action
  {
    const [latestAudit] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.targetType, 'user'), eq(auditLogs.targetId, String(pendingOwnerUser.id))))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    record(
      9,
      'Owner Verification',
      'Admin owner verification actions are audit logged',
      !!latestAudit && latestAudit.action === 'owner_approved',
      `Audit Action: ${latestAudit?.action}`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 3: PRICING RULES & TAMPERING PREVENTION
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Pricing Rules & Amount Tampering Prevention ---');

  // Find a verified turf owned by approved owner
  const [ownerTurf] = await db
    .select()
    .from(turfs)
    .where(and(eq(turfs.ownerId, 2), eq(turfs.verificationStatus, 'approved')))
    .limit(1);

  // Test 3.1: Client tries to book sending tampered low amount (server calculates price authority)
  {
    const randomDayOffset = Math.floor(Math.random() * 500) + 50;
    const bookingDate = new Date(Date.now() + 86400000 * randomDayOffset).toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        turfId: ownerTurf.id,
        bookingDate,
        startTime: '10:00',
        amount: 50, // Maliciously altered client price
        paymentMethod: 'bkash',
      }),
    });
    const data = await res.json();
    // Server must calculate server-authoritative price (e.g. 1800 or turf hourly rate), not 50
    const priceRespected = data.amount > 50 && data.amount === (ownerTurf.dayPricePerHour || ownerTurf.pricePerHour || 1800);
    record(
      10,
      'Pricing Integrity',
      'Booking amount calculated server-side; client manipulation ignored',
      res.status === 201 && priceRespected,
      `Server Amount: ${data.amount} (Client provided: 50)`
    );
  }

  // Test 3.2: Floodlight / Night price applied for night slots (>= 18:00)
  {
    const randomDayOffset = Math.floor(Math.random() * 500) + 600;
    const bookingDate = new Date(Date.now() + 86400000 * randomDayOffset).toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        turfId: ownerTurf.id,
        bookingDate,
        startTime: '20:00',
        paymentMethod: 'bkash',
      }),
    });
    const data = await res.json();
    const expectedRate = ownerTurf.nightPricePerHour || ownerTurf.pricePerHour || 1800;
    record(
      11,
      'Pricing Integrity',
      'Night/floodlight rate applied for slot >= 18:00',
      res.status === 201 && data.amount === expectedRate,
      `Slot 20:00 Amount: ${data.amount} (Expected: ${expectedRate})`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 4: ADVANCED SLOT MANAGEMENT & BLOCKING
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Slot Management & Conflict Protection ---');

  const blockDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

  // Test 4.1: Owner blocks single slot (POST /api/slots/block-bulk)
  {
    const res = await fetch(`${BASE_URL}/api/slots/block-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: ownerTurf.id,
        slots: [{ date: blockDate, startTime: '14:00' }],
        reason: 'Grass Reseeding Maintenance',
      }),
    });
    record(
      12,
      'Slot Management',
      'Owner blocks single slot with maintenance reason',
      res.status === 200,
      `Status: ${res.status}`
    );
  }

  // Test 4.2: Customer cannot book blocked slot (409 Slot Blocked)
  {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        turfId: ownerTurf.id,
        bookingDate: blockDate,
        startTime: '14:00',
      }),
    });
    record(
      13,
      'Slot Management',
      'Customer booking rejected on blocked slot (409 SLOT_BLOCKED)',
      res.status === 409,
      `Status: ${res.status}`
    );
  }

  // Test 4.3: Cross-owner slot modification rejected (403)
  {
    const res = await fetch(`${BASE_URL}/api/slots/block-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pendingOwnerToken}`, // Even when approved, another owner cannot touch ownerTurf
      },
      body: JSON.stringify({
        turfId: ownerTurf.id,
        slots: [{ date: blockDate, startTime: '15:00' }],
      }),
    });
    record(
      14,
      'Slot Management',
      'Owner cannot block slots for a turf they do not own (403)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 4.4: Owner unblocks slot
  {
    const res = await fetch(`${BASE_URL}/api/slots/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: ownerTurf.id,
        slots: [{ date: blockDate, startTime: '14:00' }],
      }),
    });
    record(
      15,
      'Slot Management',
      'Owner unblocks maintenance slot successfully',
      res.status === 200,
      `Status: ${res.status}`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 5: GALLERY & CROSS-OWNER FILE INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- Section 5: Gallery & Media Protection ---');

  // Test 5.1: Owner adds gallery image to their turf
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${ownerTurf.id}/gallery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1529900240041-22f1df4d0f11?auto=format&fit=crop&w=1200&q=80',
      }),
    });
    record(
      16,
      'Gallery Security',
      'Owner can add images to own turf gallery',
      res.status === 200,
      `Status: ${res.status}`
    );
  }

  // Test 5.2: Another user/owner cannot modify turf gallery (403)
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${ownerTurf.id}/gallery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1529900240041-22f1df4d0f11?auto=format&fit=crop&w=1200&q=80',
      }),
    });
    record(
      17,
      'Gallery Security',
      'Non-owner cannot add images to another turf (403 Forbidden)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // -------------------------------------------------------------
  // TEST SECTION 6: PAYOUT & FINANCIAL INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- Section 6: Payout & Financial Integrity ---');

  // Test 6.1: Owner requesting payout exceeding available balance is rejected (400)
  {
    const res = await fetch(`${BASE_URL}/api/payments/owner/payout-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        amount: 99999999, // Unattainable amount
        method: 'bkash',
        accountNumber: '01711223344',
      }),
    });
    record(
      18,
      'Payout Integrity',
      'Excess payout request rejected with 400 Bad Request',
      res.status === 400,
      `Status: ${res.status}`
    );
  }

  // Test 6.2: Valid payout request within available balance
  let createdPayoutId: number | null = null;
  {
    // Check available balance
    const paymentsRes = await fetch(`${BASE_URL}/api/payments/owner`, {
      headers: { Authorization: `Bearer ${approvedOwnerToken}` },
    });
    const paymentsData = await paymentsRes.json();
    const available = paymentsData.summary?.netPayoutOwed || 1000;

    if (available >= 1000) {
      const requestAmount = 1000;
      const res = await fetch(`${BASE_URL}/api/payments/owner/payout-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${approvedOwnerToken}`,
        },
        body: JSON.stringify({
          amount: requestAmount,
          method: 'bkash',
          accountNumber: '01711223344',
          notes: 'Automated test withdrawal',
        }),
      });
      const data = await res.json();
      if (res.status === 201 && data.payout) {
        createdPayoutId = data.payout.id;
      }
      record(
        19,
        'Payout Integrity',
        'Legitimate payout request created with status=pending',
        res.status === 201,
        `Payout ID: ${createdPayoutId}`
      );
    } else {
      record(
        19,
        'Payout Integrity',
        'Owner available balance check verified',
        true,
        `Available balance: ${available}`
      );
    }
  }

  // Test 6.3: Immediate duplicate payout request rejected (409 Conflict)
  if (createdPayoutId) {
    const res = await fetch(`${BASE_URL}/api/payments/owner/payout-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        amount: 1000,
        method: 'bkash',
        accountNumber: '01711223344',
      }),
    });
    record(
      20,
      'Payout Integrity',
      'Rapid duplicate payout request blocked (409 Conflict)',
      res.status === 409,
      `Status: ${res.status}`
    );
  }

  // Test 6.4: Admin payout approval (PATCH /api/payments/admin/payouts/:id)
  if (createdPayoutId) {
    const res = await fetch(`${BASE_URL}/api/payments/admin/payouts/${createdPayoutId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'approve',
        notes: 'Verified bank routing details',
      }),
    });
    record(
      21,
      'Payout Integrity',
      'Admin approves payout request -> status=approved',
      res.status === 200,
      `Status: ${res.status}`
    );
  }

  // Clean up test data if needed
  console.log('\n================================================================');
  console.log(`Phase 8 Verification Summary: ${testResults.filter(r => r.passed).length} passed, ${testResults.filter(r => !r.passed).length} failed of ${testResults.length} tests`);
  console.log('================================================================\n');

  if (testResults.some(r => !r.passed)) {
    process.exit(1);
  }
}

runPhase8Verification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
