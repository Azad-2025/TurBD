import { db } from '../src/db/index.js';
import { users, turfs, slots, bookings, payments, payouts, auditLogs } from '../src/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

async function loginUser(email: string, password = 'Password123!'): Promise<{ token: string; user: any }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Login failed for ${email}: ${err.error || res.statusText}`);
  }
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function runPhase8Verification() {
  console.log('===============================================================');
  console.log('    PHASE 8: ADVANCED TURF OWNER OPERATIONS VERIFICATION       ');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, details || '');
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // PART A: ADMIN SECURITY & OWNER VERIFICATION LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- PART A & B: ADMIN SECURITY & OWNER VERIFICATION ---');

    // A1. Public registration rejects role: "admin"
    const adminSignupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin Attempt',
        email: `hacker_${Date.now()}@test.com`,
        phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'admin',
      }),
    });
    assert(
      adminSignupRes.status === 403,
      'A1: Public registration with role: "admin" is strictly rejected with 403 Forbidden'
    );

    // A2. Turf Owner registration defaults to pending
    const testOwnerEmail = `owner_phase8_${Date.now()}@test.com`;
    const ownerSignupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase 8 Test Owner',
        email: testOwnerEmail,
        phone: `+88018${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'owner',
      }),
    });
    const ownerSignupData = await ownerSignupRes.json();
    assert(ownerSignupRes.status === 201, 'A2: Turf Owner registration succeeds');
    assert(
      ownerSignupData.user.role === 'owner',
      'A2: Assigned role is "owner"'
    );
    assert(
      ownerSignupData.user.ownerVerificationStatus === 'pending',
      'A2: New Turf Owner starts in ownerVerificationStatus: "pending"'
    );

    const pendingOwner = ownerSignupData.user;
    const pendingOwnerToken = ownerSignupData.token;

    // Get Admin token
    const { token: adminToken } = await loginUser('admin@turfbd.com');
    assert(!!adminToken, 'Super Admin logged in successfully');

    // A3. Pending Owner cannot access operational owner APIs
    const pendingBlockAttempt = await fetch(`${BASE_URL}/api/slots/toggle-block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pendingOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: 1,
        date: '2026-10-15',
        startTime: '10:00',
        status: 'blocked',
      }),
    });
    const pendingBlockData = await pendingBlockAttempt.json().catch(() => ({}));
    assert(
      pendingBlockAttempt.status === 403 && pendingBlockData.code === 'OWNER_NOT_APPROVED',
      'A2: Pending owner is blocked from slot operations (403 OWNER_NOT_APPROVED)'
    );

    // B1. Admin reviews and approves owner
    const approveRes = await fetch(`${BASE_URL}/api/auth/owners/${pendingOwner.id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'approved',
      }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.success, 'B1: Admin approves owner account');
    assert(approveData.user.ownerVerificationStatus === 'approved', 'B1: Status is now "approved"');
    assert(!!approveData.user.ownerApprovedAt, 'B1: ownerApprovedAt timestamp recorded');

    // B2. Admin rejects with reason requirement
    const rejectNoReason = await fetch(`${BASE_URL}/api/auth/owners/${pendingOwner.id}/verification`, {
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
    assert(rejectNoReason.status === 400, 'B2: Rejecting requires reason (validation enforced)');

    const rejectWithReason = await fetch(`${BASE_URL}/api/auth/owners/${pendingOwner.id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'rejected',
        reason: 'Trade license document was unreadable. Please upload clearer scan.',
      }),
    });
    const rejectData = await rejectWithReason.json();
    assert(rejectWithReason.status === 200, 'B2: Admin successfully rejects owner with reason');
    assert(rejectData.user.ownerVerificationStatus === 'rejected', 'B2: Status is "rejected"');
    assert(
      rejectData.user.ownerRejectionReason?.includes('Trade license'),
      'B2: Rejection reason stored'
    );

    // B3. Admin suspends with reason requirement & Reactivates
    const suspendRes = await fetch(`${BASE_URL}/api/auth/owners/${pendingOwner.id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'suspended',
        reason: 'Investigation of disputed gate fees.',
      }),
    });
    const suspendData = await suspendRes.json();
    assert(suspendRes.status === 200, 'B3: Admin suspends owner with reason');
    assert(suspendData.user.ownerVerificationStatus === 'suspended', 'B3: Status is "suspended"');
    assert(!!suspendData.user.ownerSuspensionReason, 'B3: Suspension reason stored');

    // Reactivate owner for subsequent operational tests
    await fetch(`${BASE_URL}/api/auth/owners/${pendingOwner.id}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });

    // Check Audit Logs
    const [latestAudit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetId, String(pendingOwner.id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    assert(!!latestAudit, 'B4: Admin owner verification actions written to audit_logs');

    // -------------------------------------------------------------
    // PART C: TURF OWNERSHIP & RESOURCE ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- PART C: OWNER OPERATIONS & TURF SETUP ---');

    // Use approved owner Rafiqul Islam (ID 2) who owns turf 1 (Gulshan United Arena)
    const { token: approvedOwnerToken, user: approvedOwner } = await loginUser('owner@gulshanarena.com');
    assert(!!approvedOwnerToken, 'Approved owner logged in successfully');

    const [testTurf] = await db.select().from(turfs).where(eq(turfs.ownerId, approvedOwner.id)).limit(1);
    assert(!!testTurf, `Owner #${approvedOwner.id} owns turf "${testTurf.turfName}" (ID ${testTurf.id})`);

    // -------------------------------------------------------------
    // PART D: DYNAMIC PRICING CONFIGURATION
    // -------------------------------------------------------------
    console.log('\n--- PART D: PEAK / OFF-PEAK DYNAMIC PRICING ---');

    const updatePricingRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        hourlyRate: 1800,
        dayPricePerHour: 1500, // Morning/Day
        nightPricePerHour: 2200, // Night floodlights
        pricingRules: [
          {
            name: 'Prime Floodlight Hours',
            startTime: '20:00',
            endTime: '23:00',
            pricePerHour: 2500,
            type: 'peak',
          },
        ],
      }),
    });
    assert(updatePricingRes.status === 200, 'D1: Owner updates day/night & peak pricing rules');

    // Verify dynamic pricing calculation in slot query
    const slotQueryDate = '2026-10-20';
    const slotsRes = await fetch(`${BASE_URL}/api/slots?turfId=${testTurf.id}&date=${slotQueryDate}`);
    const slotData = await slotsRes.json();
    assert(Array.isArray(slotData) && slotData.length > 0, 'D2: Slots generated for scheduled date');

    const morningSlot = slotData.find((s: any) => s.startTime === '10:00');
    assert(morningSlot?.price === 1500, 'D3: 10:00 morning slot applies day price (BDT 1,500)');

    const primeSlot = slotData.find((s: any) => s.startTime === '21:00');
    assert(primeSlot?.price === 2500, 'D4: 21:00 slot applies custom prime peak rule (BDT 2,500)');

    // -------------------------------------------------------------
    // PART E: ADVANCED SLOT MANAGEMENT (BLOCK, BULK, DAY, RANGE)
    // -------------------------------------------------------------
    console.log('\n--- PART E: ADVANCED SLOT MANAGEMENT ---');

    // E1. Single Slot Blocking with Reason
    const blockSingleRes = await fetch(`${BASE_URL}/api/slots/toggle-block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: testTurf.id,
        date: slotQueryDate,
        startTime: '14:00',
        status: 'blocked',
        reason: 'Pitch Maintenance',
      }),
    });
    const blockSingleData = await blockSingleRes.json();
    assert(blockSingleRes.status === 200, 'E1: Single slot blocked with reason');
    assert(blockSingleData.slot.status === 'blocked', 'E1: Slot status is "blocked"');
    assert(blockSingleData.slot.reason === 'Pitch Maintenance', 'E1: Reason stored in slot record');

    // E2. Bulk Slot Blocking
    const bulkBlockRes = await fetch(`${BASE_URL}/api/slots/block-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: testTurf.id,
        slots: [
          { date: slotQueryDate, startTime: '15:00' },
          { date: slotQueryDate, startTime: '16:00' },
        ],
        reason: 'Grass Reseeding',
      }),
    });
    const bulkData = await bulkBlockRes.json();
    assert(bulkBlockRes.status === 200 && bulkData.blockedCount === 2, 'E2: Bulk block 2 slots');

    // E3. Unblock Slots
    const unblockRes = await fetch(`${BASE_URL}/api/slots/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: testTurf.id,
        slots: [{ date: slotQueryDate, startTime: '14:00' }],
      }),
    });
    const unblockData = await unblockRes.json();
    assert(unblockRes.status === 200 && unblockData.unblockedCount === 1, 'E3: Slot successfully unblocked');

    // E4. Block Entire Day with conflict protection
    const blockDayRes = await fetch(`${BASE_URL}/api/slots/block-day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        turfId: testTurf.id,
        date: slotQueryDate,
        reason: 'Whole Day Facility Maintenance',
      }),
    });
    const blockDayData = await blockDayRes.json();
    assert(blockDayRes.status === 200 && blockDayData.success, 'E4: Entire day blocked');

    // -------------------------------------------------------------
    // PART F: TURF PHOTO GALLERY MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- PART F: TURF GALLERY MANAGEMENT ---');

    // F1. Get gallery
    const getGalleryRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery`);
    const galleryData = await getGalleryRes.json();
    assert(getGalleryRes.status === 200, 'F1: Retrieve turf gallery');

    // F2. Add image
    const newTestImage = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80';
    const addImgRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        images: [newTestImage],
      }),
    });
    const addImgData = await addImgRes.json();
    assert(addImgRes.status === 200 && addImgData.images.includes(newTestImage), 'F2: Add photo to gallery');

    // F3. Set cover photo
    const setCoverRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery/cover`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        coverImage: newTestImage,
      }),
    });
    const coverData = await setCoverRes.json();
    assert(setCoverRes.status === 200 && coverData.mainImage === newTestImage, 'F3: Set main cover photo');

    // F4. Reorder gallery
    const reversedOrder = [...addImgData.images].reverse();
    const reorderRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        images: reversedOrder,
      }),
    });
    const reorderData = await reorderRes.json();
    assert(
      reorderRes.status === 200 && reorderData.images[0] === reversedOrder[0],
      'F4: Reorder gallery photos'
    );

    // -------------------------------------------------------------
    // PART G: OWNER PAYOUT WITHDRAWAL WORKFLOW
    // -------------------------------------------------------------
    console.log('\n--- PART G: PAYOUT WORKFLOW & AUDIT ---');

    // G1. Check available balance and financials
    const financialsRes = await fetch(`${BASE_URL}/api/payments/owner`, {
      headers: { Authorization: `Bearer ${approvedOwnerToken}` },
    });
    const finData = await financialsRes.json();
    assert(financialsRes.status === 200, 'G1: Query owner financial balance');

    // G2. Request Payout withdrawal
    const requestPayoutRes = await fetch(`${BASE_URL}/api/payments/owner/payout-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        amount: 2500,
        method: 'bkash',
        accountNumber: '01711223344',
      }),
    });
    const payoutData = await requestPayoutRes.json();
    assert(requestPayoutRes.status === 201 && payoutData.success, 'G2: Submit payout request (BDT 2,500 via bKash)');
    const createdPayout = payoutData.payout;
    assert(createdPayout.status === 'pending', 'G2: Payout status starts in "pending"');

    // G3. Duplicate request prevention
    const duplicatePayoutRes = await fetch(`${BASE_URL}/api/payments/owner/payout-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approvedOwnerToken}`,
      },
      body: JSON.stringify({
        amount: 2500,
        method: 'bkash',
        accountNumber: '01711223344',
      }),
    });
    assert(duplicatePayoutRes.status === 400, 'G3: Duplicate payout request blocked');

    // G4. Admin reviews payout list
    const adminPayoutsRes = await fetch(`${BASE_URL}/api/payments/admin/payouts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allPayouts = await adminPayoutsRes.json();
    assert(
      adminPayoutsRes.status === 200 && allPayouts.some((p: any) => p.id === createdPayout.id),
      'G4: Admin queries pending payout list'
    );

    // G5. Admin approves payout
    const adminApprovePayoutRes = await fetch(`${BASE_URL}/api/payments/admin/payouts/${createdPayout.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'approve',
        notes: 'Verified against advance payments ledger.',
      }),
    });
    const approvedPayoutData = await adminApprovePayoutRes.json();
    assert(adminApprovePayoutRes.status === 200, 'G5: Admin approves payout request');
    assert(approvedPayoutData.payout.status === 'approved', 'G5: Payout status is "approved"');

    // G6. Admin records disbursement (dispatched) with TrxID
    const dispatchPayoutRes = await fetch(`${BASE_URL}/api/payments/admin/payouts/${createdPayout.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'dispatch',
        transactionReference: 'BKASH_TRX_9928371',
        notes: 'Disbursed via bKash Corporate Portal',
      }),
    });
    const dispatchedPayoutData = await dispatchPayoutRes.json();
    assert(dispatchPayoutRes.status === 200, 'G6: Admin marks payout as dispatched/paid with TrxID');
    assert(dispatchedPayoutData.payout.status === 'dispatched', 'G6: Status is "dispatched"');
    assert(
      dispatchedPayoutData.payout.transactionReference === 'BKASH_TRX_9928371',
      'G6: Transaction reference recorded'
    );

    // G7. Verify Audit Log for Payout
    const [payoutAudit] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.targetType, 'payout'), eq(auditLogs.targetId, String(createdPayout.id))))
      .limit(1);
    assert(!!payoutAudit, 'G7: Payout actions recorded in audit_logs table');

    console.log('\n===============================================================');
    console.log(`🎉 ALL PHASE 8 TESTS PASSED! (${passedTests}/${totalTests} tests)`);
    console.log('===============================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Phase 8 Verification failed with error:', error);
    process.exit(1);
  }
}

runPhase8Verification();
