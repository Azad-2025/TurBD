import { db } from './src/db/index.ts';
import { users, turfs, bookings, slots, payments } from './src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { generateAccessToken } from './src/server/utils/auth.ts';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(suite: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ suite, name, passed, details, error });
  const mark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${mark} [${suite}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function runRegression() {
  console.log('====================================================');
  console.log('Starting TurfBD Production Payment Regression Suite');
  console.log('====================================================\n');

  // 1. Setup test fixture tokens
  const [customer] = await db.select().from(users).where(eq(users.role, 'customer'));
  const [owner] = await db.select().from(users).where(eq(users.id, 2));
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin'));
  const [turf] = await db.select().from(turfs).where(and(eq(turfs.ownerId, owner.id), eq(turfs.verificationStatus, 'approved')));

  const customerToken = generateAccessToken({ id: customer.id, email: customer.email, role: customer.role });
  const ownerToken = generateAccessToken({ id: owner.id, email: owner.email, role: owner.role });
  const adminToken = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role });

  console.log(`Fixtures ready: Customer (${customer.email}), Owner (${owner.email}), Admin (${admin.email}), Turf #${turf.id} (${turf.turfName})\n`);

  // Helper to create a clean test booking with guaranteed unbooked slots
  let runCounter = 1;
  const runBatchId = Math.floor(Date.now() / 1000);
  async function createTestBooking(_ignoredDate?: string, _ignoredTime?: string) {
    runCounter++;
    const year = 2031 + (runCounter % 10);
    const month = ((runCounter % 12) + 1).toString().padStart(2, '0');
    const day = (((runCounter + runBatchId) % 28) + 1).toString().padStart(2, '0');
    const hour = (7 + (runCounter % 15)).toString().padStart(2, '0');

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hour}:00`;
    const endTime = `${(parseInt(hour, 10) + 1).toString().padStart(2, '0')}:00`;

    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        turfId: turf.id,
        bookingDate: dateStr,
        startTime: timeStr,
        endTime,
        isAdvanceOnly: true,
        notes: JSON.stringify({ testRun: true, runBatchId }),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Failed to create test booking:', res.status, data);
    }
    return data;
  }

  // -------------------------------------------------------------
  // SUITE 1: bKash Payment Flow
  // -------------------------------------------------------------
  console.log('--- 1. Testing bKash Payment Flow ---');
  const bDate = '2026-10-15';
  const bTime = '16:00';
  const booking1 = await createTestBooking(bDate, bTime);

  // 1.1 Initiate bKash Payment
  let bkashInit: any;
  try {
    const res = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: booking1.id,
        gateway: 'bkash',
        isAdvanceOnly: true,
        customerName: customer.name,
        customerPhone: customer.phone,
      }),
    });
    bkashInit = await res.json();
    const isOk = res.status === 201 && bkashInit.success && bkashInit.gateway === 'bkash' && Boolean(bkashInit.redirectUrl);
    recordTest('bKash Flow', 'Payment initiation', isOk, `Payment ID: ${bkashInit.paymentId}, Redirect: ${bkashInit.redirectUrl?.slice(0, 45)}...`);
  } catch (err: any) {
    recordTest('bKash Flow', 'Payment initiation', false, undefined, err.message);
  }

  // 1.2 Checkout response verification
  const hasExpectedFields = bkashInit?.amount > 0 && bkashInit?.currency === 'BDT' && Boolean(bkashInit?.expiresAt);
  recordTest('bKash Flow', 'Checkout response schema', hasExpectedFields, `Amount: ৳${bkashInit?.amount} BDT, ExpiresAt: ${bkashInit?.expiresAt}`);

  // 1.3 Transaction verification & successful booking confirmation
  try {
    const verifyRes = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: bkashInit.paymentId,
        bookingId: booking1.id,
        gateway: 'bkash',
      }),
    });
    const verifyData = await verifyRes.json();
    const isVerified = verifyRes.status === 200 && verifyData.verified && verifyData.status === 'successful';
    recordTest('bKash Flow', 'Transaction verification', isVerified, `TRX ID: ${verifyData.payment?.transactionId}`);

    // Verify DB update
    const [updatedBooking] = await db.select().from(bookings).where(eq(bookings.id, booking1.id));
    const isConfirmed = updatedBooking.bookingStatus === 'confirmed' && updatedBooking.advancePaid > 0;
    recordTest('bKash Flow', 'Successful booking confirmation', isConfirmed, `Status: ${updatedBooking.bookingStatus}, AdvancePaid: ৳${updatedBooking.advancePaid}`);
  } catch (err: any) {
    recordTest('bKash Flow', 'Transaction verification', false, undefined, err.message);
  }

  // 1.4 Failed payment handling
  try {
    const failBooking = await createTestBooking('2026-10-15', '17:00');
    // Initiate payment
    const initRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: failBooking.id, gateway: 'bkash' }),
    });
    const initData = await initRes.json();

    // Verify callback failure redirection
    const callbackRes = await fetch(`${BASE_URL}/api/payments/bkash/callback?paymentID=${initData.gatewayPaymentId}&status=failure`, {
      redirect: 'manual',
    });
    const location = callbackRes.headers.get('location') || '';
    const isRedirectedToFailure = location.includes('paymentStatus=failed');
    recordTest('bKash Flow', 'Failed payment handling', isRedirectedToFailure, `Redirect: ${location}`);
  } catch (err: any) {
    recordTest('bKash Flow', 'Failed payment handling', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 2: Nagad Payment Flow
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Nagad Payment Flow ---');
  const nagadBooking = await createTestBooking('2026-10-16', '18:00');

  let nagadInit: any;
  try {
    const res = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: nagadBooking.id,
        gateway: 'nagad',
        isAdvanceOnly: true,
      }),
    });
    nagadInit = await res.json();
    const isOk = res.status === 201 && nagadInit.success && nagadInit.gateway === 'nagad';
    recordTest('Nagad Flow', 'Payment creation', isOk, `Payment ID: ${nagadInit.paymentId}, Gateway: ${nagadInit.gateway}`);
  } catch (err: any) {
    recordTest('Nagad Flow', 'Payment creation', false, undefined, err.message);
  }

  try {
    const verifyRes = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: nagadInit.paymentId,
        gateway: 'nagad',
      }),
    });
    const verifyData = await verifyRes.json();
    const isVerified = verifyRes.status === 200 && verifyData.verified && verifyData.status === 'successful';
    recordTest('Nagad Flow', 'Nagad verification', isVerified, `TRX ID: ${verifyData.payment?.transactionId}`);

    const [dbB] = await db.select().from(bookings).where(eq(bookings.id, nagadBooking.id));
    const isStatusUpdated = dbB.bookingStatus === 'confirmed' && dbB.advancePaid > 0;
    recordTest('Nagad Flow', 'Status update', isStatusUpdated, `Booking: ${dbB.bookingStatus}, Advance: ৳${dbB.advancePaid}`);
  } catch (err: any) {
    recordTest('Nagad Flow', 'Nagad verification', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 3: SSLCommerz Flow
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing SSLCommerz Flow ---');
  const sslBooking = await createTestBooking('2026-10-17', '19:00');

  let sslInit: any;
  try {
    const res = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: sslBooking.id,
        gateway: 'sslcommerz',
      }),
    });
    sslInit = await res.json();
    const isOk = res.status === 201 && sslInit.success && sslInit.gateway === 'sslcommerz';
    recordTest('SSLCommerz Flow', 'Session creation', isOk, `Session Key: ${sslInit.gatewayPaymentId}`);
  } catch (err: any) {
    recordTest('SSLCommerz Flow', 'Session creation', false, undefined, err.message);
  }

  // Callback handling (Success, Cancel, Fail)
  try {
    const formSuccess = new URLSearchParams({
      val_id: `VAL_TEST_${Date.now()}`,
      tran_id: `TRX_TEST_${Date.now()}`,
      amount: '1000',
    });
    const cbSuccess = await fetch(`${BASE_URL}/api/payments/sslcommerz/success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formSuccess.toString(),
      redirect: 'manual',
    });
    const successRedirect = cbSuccess.headers.get('location') || '';
    const isSuccessCbOk = successRedirect.includes('paymentStatus=success');

    const cbCancel = await fetch(`${BASE_URL}/api/payments/sslcommerz/cancel`, {
      method: 'POST',
      redirect: 'manual',
    });
    const cancelRedirect = cbCancel.headers.get('location') || '';
    const isCancelCbOk = cancelRedirect.includes('paymentStatus=cancelled');

    recordTest('SSLCommerz Flow', 'Callback handling', isSuccessCbOk && isCancelCbOk, `Success & Cancel routes verified`);
  } catch (err: any) {
    recordTest('SSLCommerz Flow', 'Callback handling', false, undefined, err.message);
  }

  // IPN verification
  try {
    const validIpnRes = await fetch(`${BASE_URL}/api/payments/sslcommerz/ipn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        val_id: 'VAL_IPN_VALID_998',
        tran_id: 'TRX_IPN_VALID_998',
        status: 'VALID',
      }),
    });
    const validData = await validIpnRes.json();
    const isIpnValid = validIpnRes.status === 200 && validData.status === 'IPN_RECEIVED_OK';

    const invalidIpnRes = await fetch(`${BASE_URL}/api/payments/sslcommerz/ipn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        val_id: 'VAL_IPN_INVALID',
        tran_id: 'TRX_IPN_INVALID',
        status: 'FAILED',
      }),
    });
    const isInvalidRejected = invalidIpnRes.status === 400;

    recordTest('SSLCommerz Flow', 'IPN verification', isIpnValid && isInvalidRejected, 'Valid IPN accepted, invalid status rejected with 400');
  } catch (err: any) {
    recordTest('SSLCommerz Flow', 'IPN verification', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 4: Security Testing
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Security Scenarios ---');

  // 4.1 Duplicate transaction prevention
  try {
    // Attempt to verify another booking with the transaction ID already redeemed in test 1.3
    const [existingVerifiedPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.status, 'successful'))
      .orderBy(eq(payments.createdAt, payments.createdAt));

    const freshBooking = await createTestBooking('2026-10-18', '20:00');
    const freshInitRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: freshBooking.id, gateway: 'bkash' }),
    });
    const freshInit = await freshInitRes.json();

    const dupAttempt = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: freshInit.paymentId,
        gateway: 'bkash',
        transactionId: existingVerifiedPayment.transactionId,
      }),
    });
    const dupJson = await dupAttempt.json();
    const isPrevented = dupAttempt.status === 409 && dupJson.error?.includes('already been redeemed');
    recordTest('Security', 'Duplicate transaction prevention', isPrevented, `Response status 409, message: "${dupJson.error}"`);
  } catch (err: any) {
    recordTest('Security', 'Duplicate transaction prevention', false, undefined, err.message);
  }

  // 4.2 Amount tampering prevention
  try {
    const tamperBooking = await createTestBooking('2026-10-19', '14:00');
    const tamperInitRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: tamperBooking.id, gateway: 'bkash' }),
    });
    const tamperInit = await tamperInitRes.json();

    // Try verifying with tampered amount (e.g. ৳50 instead of ৳1000)
    const tamperRes = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: tamperInit.paymentId,
        gateway: 'bkash',
        amount: 50, // TAMPERED!
      }),
    });
    const tamperJson = await tamperRes.json();
    const isTamperBlocked = tamperRes.status === 400 && tamperJson.error?.includes('Amount tampering detected');
    recordTest('Security', 'Amount tampering prevention', isTamperBlocked, `Status 400, message: "${tamperJson.error}"`);
  } catch (err: any) {
    recordTest('Security', 'Amount tampering prevention', false, undefined, err.message);
  }

  // 4.3 Invalid callback rejection
  try {
    const invalidBkashCb = await fetch(`${BASE_URL}/api/payments/bkash/callback`, { redirect: 'manual' });
    const bkashLoc = invalidBkashCb.headers.get('location') || '';
    const isBkashRejected = bkashLoc.includes('paymentStatus=failed') && bkashLoc.includes('missing_payment_id');

    const invalidNagadCb = await fetch(`${BASE_URL}/api/payments/nagad/callback`, { redirect: 'manual' });
    const nagadLoc = invalidNagadCb.headers.get('location') || '';
    const isNagadRejected = nagadLoc.includes('paymentStatus=failed') && nagadLoc.includes('missing_reference');

    recordTest('Security', 'Invalid callback rejection', isBkashRejected && isNagadRejected, 'Missing params rejected and routed to failed state');
  } catch (err: any) {
    recordTest('Security', 'Invalid callback rejection', false, undefined, err.message);
  }

  // 4.4 Expired payment handling
  try {
    const expBooking = await createTestBooking('2026-10-20', '15:00');
    // Insert an expired payment record (created 20 minutes ago)
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const [expPayment] = await db
      .insert(payments)
      .values({
        bookingId: expBooking.id,
        method: 'bkash',
        transactionId: `EXP_${Date.now().toString().slice(-6)}`,
        amount: 1000,
        status: 'initiated',
        createdAt: twentyMinsAgo,
      })
      .returning();

    const expVerify = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: expPayment.id,
        gateway: 'bkash',
      }),
    });
    const expJson = await expVerify.json();
    const isExpHandled = expVerify.status === 400 && expJson.error?.includes('timed out');
    recordTest('Security', 'Expired payment handling', isExpHandled, `Status 400, message: "${expJson.error}"`);
  } catch (err: any) {
    recordTest('Security', 'Expired payment handling', false, undefined, err.message);
  }

  // 4.5 Unauthorized payment update
  try {
    const unauthBooking = await createTestBooking('2026-10-21', '16:00');
    // Customer attempts to manually register cash payment via POST /api/payments
    const unauthRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`, // CUSTOMER role, not owner or admin
      },
      body: JSON.stringify({
        bookingId: unauthBooking.id,
        amount: 1000,
        method: 'cash',
      }),
    });
    const isCashBlocked = unauthRes.status === 403;

    // Customer attempts to issue refund via POST /api/payments/refund
    const [pRecord] = await db.select().from(payments).where(eq(payments.status, 'successful'));
    const unauthRefund = await fetch(`${BASE_URL}/api/payments/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        paymentId: pRecord.id,
      }),
    });
    const isRefundBlocked = unauthRefund.status === 403;

    recordTest('Security', 'Unauthorized payment update', isCashBlocked && isRefundBlocked, 'Unauthorized direct payment & refund blocked with 403 Forbidden');
  } catch (err: any) {
    recordTest('Security', 'Unauthorized payment update', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 5: Booking Integration Flow
  // User selects slot → Payment starts → Payment succeeds → Booking confirmed → Match pass → Receipt
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing Booking Integration Flow ---');
  try {
    const flowDate = '2026-10-22';
    const flowTime = '21:00';

    // Step 1: User selects slot and creates booking
    const step1Booking = await createTestBooking(flowDate, flowTime);
    const hasStep1 = Boolean(step1Booking?.id && step1Booking?.bookingCode);

    // Step 2: Payment starts
    const step2Res = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: step1Booking.id,
        gateway: 'bkash',
        isAdvanceOnly: true,
      }),
    });
    const step2 = await step2Res.json();
    const hasStep2 = step2Res.status === 201 && step2.paymentId;

    // Step 3: Payment succeeds
    const step3Res = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: step2.paymentId,
        gateway: 'bkash',
      }),
    });
    const step3 = await step3Res.json();
    const hasStep3 = step3Res.status === 200 && step3.verified;

    // Step 4: Booking confirmed
    const [confirmedB] = await db.select().from(bookings).where(eq(bookings.id, step1Booking.id));
    const hasStep4 = confirmedB.bookingStatus === 'confirmed' && (confirmedB.paymentStatus === 'paid' || confirmedB.paymentStatus === 'partially_paid');

    // Step 5: Match pass generated (booking code, time, slot)
    const hasStep5 = Boolean(confirmedB.bookingCode && confirmedB.startTime && confirmedB.turfId === turf.id);

    // Step 6: Receipt generated (audit logs, tax metadata, due amount)
    const hasStep6 = confirmedB.amount > 0 && confirmedB.advancePaid > 0 && confirmedB.dueAmount === Math.max(0, confirmedB.amount - confirmedB.advancePaid);

    const completeIntegrationPassed = hasStep1 && hasStep2 && hasStep3 && hasStep4 && hasStep5 && hasStep6;
    if (!completeIntegrationPassed) {
      console.log('Step debug:', { hasStep1, hasStep2, hasStep3, hasStep4, hasStep5, hasStep6, dueAmount: confirmedB.dueAmount, calculatedDue: confirmedB.amount - confirmedB.advancePaid });
    }
    recordTest(
      'Booking Integration',
      'End-to-End Slot to Receipt Flow',
      completeIntegrationPassed,
      `Booking #${confirmedB.bookingCode}, Advance ৳${confirmedB.advancePaid}, Due ৳${confirmedB.dueAmount}`
    );
  } catch (err: any) {
    recordTest('Booking Integration', 'End-to-End Slot to Receipt Flow', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 6: Owner Flow
  // -------------------------------------------------------------
  console.log('\n--- 6. Testing Owner Flow ---');
  try {
    const ownerRes = await fetch(`${BASE_URL}/api/payments/owner`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const ownerData = await ownerRes.json();
    const hasSummary = typeof ownerData.summary?.totalGrossRevenue === 'number' && typeof ownerData.summary?.netPayoutOwed === 'number';
    recordTest('Owner Flow', 'Revenue calculation', hasSummary, `Gross: ৳${ownerData.summary?.totalGrossRevenue}, Net Payout: ৳${ownerData.summary?.netPayoutOwed}`);

    const hasBreakdown = ownerData.gatewayBreakdown && typeof ownerData.gatewayBreakdown.bkash === 'number';
    recordTest('Owner Flow', 'Gateway breakdown', Boolean(hasBreakdown), `bKash: ৳${ownerData.gatewayBreakdown?.bkash}, Nagad: ৳${ownerData.gatewayBreakdown?.nagad}, SSL: ৳${ownerData.gatewayBreakdown?.sslcommerz}`);

    // Settlement calculation check: 5% platform commission and net payout
    const expectedCommission = Math.round(ownerData.summary.onlineAdvanceCollected * 0.05);
    const expectedNet = Math.max(0, ownerData.summary.onlineAdvanceCollected - expectedCommission);
    const isSettlementMathCorrect = ownerData.summary.platformCommission === expectedCommission && ownerData.summary.netPayoutOwed === expectedNet;
    recordTest('Owner Flow', 'Settlement request calculation', isSettlementMathCorrect, `Commission: ৳${ownerData.summary.platformCommission}, Net Owed: ৳${ownerData.summary.netPayoutOwed}`);
  } catch (err: any) {
    recordTest('Owner Flow', 'Revenue calculation', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 7: Admin Flow
  // -------------------------------------------------------------
  console.log('\n--- 7. Testing Admin Flow ---');
  try {
    const adminRes = await fetch(`${BASE_URL}/api/payments/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminData = await adminRes.json();
    const hasKpis = adminData.kpis && typeof adminData.kpis.totalVolume === 'number' && typeof adminData.kpis.successfulCount === 'number';
    recordTest('Admin Flow', 'Transaction monitoring', Boolean(hasKpis), `Total Volume: ৳${adminData.kpis?.totalVolume}, Transactions: ${adminData.kpis?.totalTransactions}`);

    const hasAuditLogs = Array.isArray(adminData.auditLogs) && adminData.auditLogs.length > 0;
    recordTest('Admin Flow', 'Payment audit logs', hasAuditLogs, `Audit logs count: ${adminData.auditLogs?.length}`);
  } catch (err: any) {
    recordTest('Admin Flow', 'Transaction monitoring', false, undefined, err.message);
  }

  console.log('\n====================================================');
  console.log('Regression Test Execution Finished');
  console.log('====================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRegression().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
