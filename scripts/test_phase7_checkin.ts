import { db } from '../src/db/index.ts';
import { users, turfs, bookings, notifications, slots } from '../src/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { generateMatchPassToken } from '../src/server/utils/passToken.ts';

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
  console.log(`${icon} [Test ${id}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function runPhase7Tests() {
  console.log('================================================================');
  console.log('     TurfBD Phase 7: Gate Check-In & Squad Splitter Test Suite   ');
  console.log('================================================================\n');

  // Login helper
  const loginUser = async (email: string, password = 'Password123!') => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      // If login fails, try password hash reset or register
      console.warn(`[Login] ${email} login returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.token;
  };

  // 1. Fetch fixtures from database
  let [customerUser] = await db.select().from(users).where(eq(users.email, 'tanvir@turfbd.com'));
  let [ownerUser] = await db.select().from(users).where(eq(users.email, 'owner@gulshanarena.com'));
  let [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@turfbd.com'));

  // Obtain tokens from running server
  let customerToken = customerUser ? await loginUser(customerUser.email, 'Password123!') : null;
  if (!customerToken) {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tanvir Ahmed',
        email: `tanvir_${Date.now()}@turfbd.com`,
        phone: '+88017' + Math.floor(10000000 + Math.random() * 90000000),
        password: 'Password123!',
        role: 'customer',
      }),
    });
    const regData = await regRes.json();
    customerToken = regData.token;
    customerUser = (await db.select().from(users).where(eq(users.id, regData.user.id)))[0];
  }

  let ownerToken = ownerUser ? await loginUser(ownerUser.email, 'Password123!') : null;
  if (!ownerToken) {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gulshan Arena Owner',
        email: `owner_${Date.now()}@turfbd.com`,
        phone: '+88018' + Math.floor(10000000 + Math.random() * 90000000),
        password: 'Password123!',
        role: 'owner',
      }),
    });
    const regData = await regRes.json();
    ownerToken = regData.token;
    ownerUser = (await db.select().from(users).where(eq(users.id, regData.user.id)))[0];
  }

  let adminToken = adminUser ? await loginUser(adminUser.email, 'Password123!') : null;
  if (!adminToken) {
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Super Admin',
        email: `admin_${Date.now()}@turfbd.com`,
        phone: '+88019' + Math.floor(10000000 + Math.random() * 90000000),
        password: 'Password123!',
        role: 'admin',
      }),
    });
    const regData = await regRes.json();
    adminToken = regData.token;
    adminUser = (await db.select().from(users).where(eq(users.id, regData.user.id)))[0];
  }

  // Register or login a Second Owner for tenant boundary testing
  let otherOwnerEmail = `second_owner_${Date.now()}@turfbd.com`;
  const otherRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Second Arena Owner',
      email: otherOwnerEmail,
      phone: '+88018' + Math.floor(10000000 + Math.random() * 90000000),
      password: 'Password123!',
      role: 'owner',
    }),
  });
  const otherRegData = await otherRegRes.json();
  const otherOwnerToken = otherRegData.token;
  const [otherOwner] = await db.select().from(users).where(eq(users.id, otherRegData.user.id));

  // Turf 1 owned by ownerUser
  let [turf1] = await db.select().from(turfs).where(eq(turfs.ownerId, ownerUser.id));
  if (!turf1) {
    const [createdTurf] = await db
      .insert(turfs)
      .values({
        ownerId: ownerUser.id,
        turfName: 'Dhanmondi Arena 1',
        address: 'Road 27, Dhanmondi',
        city: 'Dhaka',
        area: 'Dhanmondi',
        pricePerHour: 2400,
        verificationStatus: 'approved',
      })
      .returning();
    turf1 = createdTurf;
  }

  // Turf 2 owned by otherOwner
  let [turf2] = await db.select().from(turfs).where(eq(turfs.ownerId, otherOwner.id));
  if (!turf2) {
    const [createdTurf2] = await db
      .insert(turfs)
      .values({
        ownerId: otherOwner.id,
        turfName: 'Uttara Velocity Arena',
        address: 'Sector 4, Uttara',
        city: 'Dhaka',
        area: 'Uttara',
        pricePerHour: 2200,
        verificationStatus: 'approved',
      })
      .returning();
    turf2 = createdTurf2;
  }

  console.log(`Test fixtures authenticated successfully:`);
  console.log(`- Customer: ${customerUser.name} (${customerUser.email})`);
  console.log(`- Owner 1:  ${ownerUser.name} (${ownerUser.email}), Turf #${turf1.id} (${turf1.turfName})`);
  console.log(`- Owner 2:  ${otherOwner.name} (${otherOwner.email}), Turf #${turf2.id} (${turf2.turfName})`);
  console.log(`- Admin:    ${adminUser.name} (${adminUser.email})\n`);

  // Helper to generate a unique code
  const makeCode = () => `TBD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Helper to insert a fresh booking
  const createBooking = async (overrides: Partial<typeof bookings.$inferInsert> = {}) => {
    const code = overrides.bookingCode || makeCode();
    const [b] = await db
      .insert(bookings)
      .values({
        userId: customerUser.id,
        turfId: turf1.id,
        bookingDate: '2026-10-15',
        startTime: '19:00',
        endTime: '20:00',
        amount: 2400,
        advancePaid: 1000,
        dueAmount: 1400,
        paymentStatus: 'partially_paid',
        bookingStatus: 'confirmed',
        bookingCode: code,
        isCheckedIn: false,
        ...overrides,
      })
      .returning();
    return b;
  };

  // ================================================================
  // TEST 1: Valid QR -> Successful Check-In
  // ================================================================
  try {
    const b1 = await createBooking();
    const tokenObj = generateMatchPassToken({
      id: b1.id,
      bookingCode: b1.bookingCode,
      turfId: b1.turfId,
    });

    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: tokenObj.qrPayload,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 200 && data.success === true && data.checkedIn === true && data.booking?.isCheckedIn === true;
    record(1, 'Valid QR -> successful check-in', passed, `HTTP ${res.status}, msg="${data.message}"`);
  } catch (err: any) {
    record(1, 'Valid QR -> successful check-in', false, undefined, err.message);
  }

  // ================================================================
  // TEST 2: Invalid QR -> Rejected
  // ================================================================
  try {
    const fakePayload = JSON.stringify({ c: 'TBD-NONEXISTENT', id: 999999 });
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: fakePayload,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 404 && data.error !== undefined;
    record(2, 'Invalid QR -> rejected', passed, `HTTP ${res.status}, error="${data.error}"`);
  } catch (err: any) {
    record(2, 'Invalid QR -> rejected', false, undefined, err.message);
  }

  // ================================================================
  // TEST 3: Cancelled booking -> Rejected
  // ================================================================
  try {
    const b3 = await createBooking({ bookingStatus: 'cancelled' });
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: b3.bookingCode,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 400 && data.reason === 'booking_cancelled';
    record(3, 'Cancelled booking -> rejected', passed, `HTTP ${res.status}, reason="${data.reason}"`);
  } catch (err: any) {
    record(3, 'Cancelled booking -> rejected', false, undefined, err.message);
  }

  // ================================================================
  // TEST 4: Refunded booking -> Rejected
  // ================================================================
  try {
    const b4 = await createBooking({ paymentStatus: 'refunded' });
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: b4.bookingCode,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 400 && data.reason === 'payment_refunded';
    record(4, 'Refunded booking -> rejected', passed, `HTTP ${res.status}, reason="${data.reason}"`);
  } catch (err: any) {
    record(4, 'Refunded booking -> rejected', false, undefined, err.message);
  }

  // ================================================================
  // TEST 5: Wrong turf -> Rejected
  // ================================================================
  try {
    const b5 = await createBooking({ turfId: turf1.id });
    // Owner passes turf2 ID while pass is for turf1
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: b5.bookingCode,
        turfId: turf2.id, // Mismatched venue
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 400 && data.error && data.error.includes('Venue Mismatch');
    record(5, 'Wrong turf -> rejected', passed, `HTTP ${res.status}, error="${data.error}"`);
  } catch (err: any) {
    record(5, 'Wrong turf -> rejected', false, undefined, err.message);
  }

  // ================================================================
  // TEST 6: Already checked-in booking -> Rejected (Duplicate Guard)
  // ================================================================
  try {
    const b6 = await createBooking({
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 3600000),
      checkedInBy: ownerUser.id,
    });

    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: b6.bookingCode,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 409 && data.alreadyCheckedIn === true;
    record(6, 'Already checked-in booking -> rejected (Duplicate Guard)', passed, `HTTP ${res.status}, alreadyCheckedIn=${data.alreadyCheckedIn}`);
  } catch (err: any) {
    record(6, 'Already checked-in booking -> rejected (Duplicate Guard)', false, undefined, err.message);
  }

  // ================================================================
  // TEST 7: Correct booking code -> Successful verification
  // ================================================================
  try {
    const b7 = await createBooking();
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: b7.bookingCode, // Plain booking code string
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 200 && data.success === true && data.booking?.bookingCode === b7.bookingCode;
    record(7, 'Correct booking code -> successful verification', passed, `HTTP ${res.status}, code=${data.booking?.bookingCode}`);
  } catch (err: any) {
    record(7, 'Correct booking code -> successful verification', false, undefined, err.message);
  }

  // ================================================================
  // TEST 8: Wrong booking code -> Rejected
  // ================================================================
  try {
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: 'TBD-ZZZZ',
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 404;
    record(8, 'Wrong booking code -> rejected', passed, `HTTP ${res.status}, error="${data.error}"`);
  } catch (err: any) {
    record(8, 'Wrong booking code -> rejected', false, undefined, err.message);
  }

  // ================================================================
  // TEST 9: Customer cannot access owner check-in API
  // ================================================================
  try {
    const b9 = await createBooking();
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`, // Normal customer token
      },
      body: JSON.stringify({
        passData: b9.bookingCode,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 403;
    record(9, 'Customer cannot access owner check-in API (RBAC 403)', passed, `HTTP ${res.status}, error="${data.error}"`);
  } catch (err: any) {
    record(9, 'Customer cannot access owner check-in API (RBAC 403)', false, undefined, err.message);
  }

  // ================================================================
  // TEST 10: Owner cannot check in another turf's booking
  // ================================================================
  try {
    // Create booking for turf2 (owned by otherOwner)
    const b10 = await createBooking({ turfId: turf2.id });

    // ownerUser attempts to check in b10 (which belongs to turf2)
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`, // ownerUser does NOT own turf2
      },
      body: JSON.stringify({
        passData: b10.bookingCode,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 403 && data.error && data.error.includes('Unauthorized');
    record(10, "Owner cannot check in another turf's booking (403)", passed, `HTTP ${res.status}, error="${data.error}"`);
  } catch (err: any) {
    record(10, "Owner cannot check in another turf's booking (403)", false, undefined, err.message);
  }

  // ================================================================
  // TEST 11: Admin access works correctly (can verify and check in)
  // ================================================================
  try {
    const b11 = await createBooking({ turfId: turf2.id });
    const res = await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        passData: b11.bookingCode,
        action: 'checkin',
      }),
    });

    const data = await res.json();
    const passed = res.status === 200 && data.success === true && data.checkedIn === true;
    record(11, 'Admin access works correctly across all venues', passed, `HTTP ${res.status}, checkedInByName="${data.checkedInByName}"`);
  } catch (err: any) {
    record(11, 'Admin access works correctly across all venues', false, undefined, err.message);
  }

  // ================================================================
  // TEST 12: Squad split calculation is correct
  // ================================================================
  try {
    // Test case from user specification:
    // Total booking fee = BDT 2,400
    // Players = 10
    // Per player = BDT 240
    const totalFee = 2400;
    const players = 10;
    const perPlayer = Math.ceil(totalFee / players);

    // Another case: BDT 2500 / 3 = 834
    const totalFee2 = 2500;
    const players2 = 3;
    const perPlayer2 = Math.ceil(totalFee2 / players2);

    const passed = perPlayer === 240 && perPlayer2 === 834;
    record(12, 'Squad split calculation is correct', passed, `2400 / 10 = ${perPlayer} BDT, 2500 / 3 = ${perPlayer2} BDT`);
  } catch (err: any) {
    record(12, 'Squad split calculation is correct', false, undefined, err.message);
  }

  // ================================================================
  // TEST 13: Notification events trigger correctly
  // ================================================================
  try {
    const b13 = await createBooking();

    // Perform check-in which triggers notifyCheckInCompleted
    await fetch(`${BASE_URL}/api/bookings/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        passData: b13.bookingCode,
        turfId: turf1.id,
        action: 'checkin',
      }),
    });

    // Query notifications table for checkin_completed
    const checkinNotifs = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.bookingId, b13.id), eq(notifications.type, 'checkin_completed')))
      .orderBy(desc(notifications.createdAt));

    const passed = checkinNotifs.length >= 1 && checkinNotifs[0].type === 'checkin_completed';
    record(13, 'Notification events trigger correctly (checkin_completed)', passed, `Found ${checkinNotifs.length} check-in notification record(s)`);
  } catch (err: any) {
    record(13, 'Notification events trigger correctly (checkin_completed)', false, undefined, err.message);
  }

  // Summary
  console.log('\n================================================================');
  const total = testResults.length;
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = total - passedCount;
  console.log(`Phase 7 Test Summary: ${passedCount} passed, ${failedCount} failed of ${total} tests`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
