import { db } from '../src/db/index.ts';
import { users, turfs, bookings, payments, disputes, auditLogs } from '../src/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
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

async function runPhase9Verification() {
  console.log('================================================================');
  console.log('   TurfBD Phase 9: Dispute & Turf Moderation Governance Suite   ');
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

  // 1. Log in Super Admin
  const adminToken = await loginUser('admin@turfbd.com', 'Password123!');
  if (!adminToken) throw new Error('Could not log in as Super Admin');

  // 2. Create an Approved Owner
  const ownerEmail = `owner_p9_${ts}@turfbd.com`;
  const [ownerUser] = await db
    .insert(users)
    .values({
      name: 'P9 Venue Owner',
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

  // 3. Create a Customer
  const customerEmail = `cust_p9_${ts}@turfbd.com`;
  const [customerUser] = await db
    .insert(users)
    .values({
      name: 'P9 Customer Player',
      email: customerEmail,
      phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
      passwordHash,
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
    })
    .returning();
  const customerToken = await loginUser(customerEmail, 'Password123!');

  // 4. Create an Unverified/Pending Turf
  const [pendingTurf] = await db
    .insert(turfs)
    .values({
      ownerId: ownerUser.id,
      turfName: `P9 Pending Arena ${ts}`,
      address: 'Plot 55, Road 11, Banani, Dhaka',
      city: 'Dhaka',
      area: 'Banani',
      surfaceType: 'Synthetic Grass',
      sportType: ['football'],
      pricePerHour: 2000,
      verificationStatus: 'pending',
    })
    .returning();

  // 5. Create a Live Approved Turf for Bookings
  const [liveTurf] = await db
    .insert(turfs)
    .values({
      ownerId: ownerUser.id,
      turfName: `P9 Live Champions Arena ${ts}`,
      address: 'Sector 4, Uttara, Dhaka',
      city: 'Dhaka',
      area: 'Uttara',
      surfaceType: '50mm FIFA Pro',
      sportType: ['football', 'cricket'],
      pricePerHour: 2200,
      verificationStatus: 'approved',
    })
    .returning();

  // 6. Create a Completed Booking with Payment for Dispute Testing
  const bookingDate = new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0];
  const [booking] = await db
    .insert(bookings)
    .values({
      userId: customerUser.id,
      turfId: liveTurf.id,
      bookingDate,
      startTime: '18:00',
      endTime: '19:00',
      amount: 2200,
      advancePaid: 1000,
      dueAmount: 1200,
      paymentStatus: 'partially_paid',
      bookingStatus: 'confirmed',
      bookingCode: `P9-${Math.floor(1000 + Math.random() * 9000)}`,
    })
    .returning();

  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: booking.id,
      method: 'bkash',
      transactionId: `TRX_P9_${ts}`,
      amount: 1000,
      status: 'completed',
    })
    .returning();

  console.log('Phase 9 Test fixtures initialized successfully.');

  // -------------------------------------------------------------
  // SECTION 1: TURF MODERATION & SUSPENSION
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Turf Moderation & Reason Enforcement ---');

  // Test 1: Rejecting turf without mandatory reason must be rejected with 400
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${pendingTurf.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'rejected',
        reason: '',
      }),
    });
    record(
      1,
      'Turf Moderation',
      'Turf rejection without reason rejected (400 Bad Request)',
      res.status === 400,
      `Status: ${res.status}`
    );
  }

  // Test 2: Admin rejects turf with specific reason
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${pendingTurf.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'rejected',
        reason: 'Missing fire safety and emergency exit documentation.',
      }),
    });
    const body = await res.json();
    record(
      2,
      'Turf Moderation',
      'Turf rejected with mandatory reason recorded',
      res.status === 200 && body.verificationStatus === 'rejected' && body.rejectionReason?.includes('fire safety'),
      `Status: ${res.status}, Rejection Reason: ${body.rejectionReason}`
    );
  }

  // Test 3: Admin suspends an approved turf with mandatory reason
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${liveTurf.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'suspended',
        reason: 'Temporary pitch repair following monsoon waterlogging.',
      }),
    });
    const body = await res.json();
    record(
      3,
      'Turf Moderation',
      'Live turf suspended with suspensionReason recorded',
      res.status === 200 && body.verificationStatus === 'suspended' && body.suspensionReason?.includes('monsoon'),
      `Status: ${res.status}, Suspension Reason: ${body.suspensionReason}`
    );
  }

  // Test 4: Suspended turf cannot be booked by players (403 Forbidden)
  {
    const futureDate = new Date(Date.now() + 86400000 * 50).toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        turfId: liveTurf.id,
        bookingDate: futureDate,
        startTime: '10:00',
        paymentMethod: 'bkash',
      }),
    });
    record(
      4,
      'Turf Moderation',
      'Suspended turf blocked from accepting bookings (403)',
      res.status === 403,
      `Status: ${res.status}`
    );
  }

  // Test 5: Re-approving turf clears rejection and suspension reasons
  {
    const res = await fetch(`${BASE_URL}/api/turfs/${liveTurf.id}/status`, {
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
      5,
      'Turf Moderation',
      'Re-approving turf clears suspension reason and restores live status',
      res.status === 200 && body.verificationStatus === 'approved' && body.suspensionReason === null,
      `Status: ${res.status}, Verification Status: ${body.verificationStatus}`
    );
  }

  // -------------------------------------------------------------
  // SECTION 2: DISPUTES & REFUND GOVERNANCE
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Customer Disputes & Refund Governance ---');

  let filedDisputeId: number = 0;

  // Test 6: Customer files a dispute for their booking
  {
    const res = await fetch(`${BASE_URL}/api/payments/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bookingId: booking.id,
        reason: 'venue_closed',
        description: 'Gate was locked due to private tournament not listed on TurfBD.',
        requestedAmount: 1000,
      }),
    });
    const body = await res.json();
    if (body.dispute) filedDisputeId = body.dispute.id;
    record(
      6,
      'Dispute Governance',
      'Customer files dispute successfully with status=open',
      res.status === 201 && body.dispute?.status === 'open',
      `Status: ${res.status}, Dispute ID: ${filedDisputeId}`
    );
  }

  // Test 7: Duplicate dispute on same booking blocked with 409 Conflict
  {
    const res = await fetch(`${BASE_URL}/api/payments/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bookingId: booking.id,
        reason: 'venue_closed',
        description: 'Submitting duplicate dispute claim',
        requestedAmount: 1000,
      }),
    });
    record(
      7,
      'Dispute Governance',
      'Duplicate active dispute rejected (409 Conflict)',
      res.status === 409,
      `Status: ${res.status}`
    );
  }

  // Test 8: Admin marks dispute as under review
  {
    const res = await fetch(`${BASE_URL}/api/payments/disputes/${filedDisputeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'review',
        adminNotes: 'Contacting venue manager to verify gate closure.',
      }),
    });
    const body = await res.json();
    record(
      8,
      'Dispute Governance',
      'Admin marks dispute under review with admin notes',
      res.status === 200 && body.dispute?.status === 'under_review',
      `Status: ${res.status}, New Status: ${body.dispute?.status}`
    );
  }

  // Test 9: Admin rejects dispute without notes rejected with 400
  {
    const res = await fetch(`${BASE_URL}/api/payments/disputes/${filedDisputeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'reject',
        adminNotes: '',
      }),
    });
    record(
      9,
      'Dispute Governance',
      'Rejecting dispute without admin notes rejected (400 Bad Request)',
      res.status === 400,
      `Status: ${res.status}`
    );
  }

  // Test 10: Admin approves and processes dispute refund
  {
    const res = await fetch(`${BASE_URL}/api/payments/disputes/${filedDisputeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'refund',
        adminNotes: 'Verified gate was closed. Customer full advance refunded.',
      }),
    });
    const body = await res.json();
    record(
      10,
      'Dispute Governance',
      'Admin approves dispute, processes refund & marks resolved_refunded',
      res.status === 200 && body.dispute?.status === 'resolved_refunded' && !!body.refundTrxId,
      `Status: ${res.status}, Refund Trx: ${body.refundTrxId}`
    );
  }

  // Test 11: Dispute actions are logged in audit_logs table
  {
    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.targetType, 'dispute'), eq(auditLogs.targetId, String(filedDisputeId))))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    record(
      11,
      'Dispute Governance',
      'Dispute lifecycle actions recorded in audit_logs',
      !!audit && audit.action === 'dispute_resolved_refunded',
      `Audit Action: ${audit?.action}, Target ID: ${audit?.targetId}`
    );
  }

  console.log('\n================================================================');
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log(`Phase 9 Verification Summary: ${passed} passed, ${failed} failed of ${testResults.length} tests`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runPhase9Verification().catch((err) => {
  console.error('Phase 9 verification execution failed:', err);
  process.exit(1);
});
