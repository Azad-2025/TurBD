import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Super Admin Pending Queue & Live Stats Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${msg}`);
      failed++;
    }
  }

  // 1. Static code audit on CommandCenterView.tsx
  console.log('--- 1. CommandCenterView Codebase Static Audit ---');
  const commandCenterCode = readFileSync(
    resolve(process.cwd(), 'src/components/admin/CommandCenterView.tsx'),
    'utf-8'
  );

  assert(!commandCenterCode.includes('>248<') && !commandCenterCode.includes(' 248\n'), 'Hardcoded 248 active turfs removed from CommandCenterView');
  assert(!commandCenterCode.includes('45,820'), 'Hardcoded 45,820 active users removed from CommandCenterView');
  assert(!commandCenterCode.includes('1,240'), 'Hardcoded 1,240 bookings removed from CommandCenterView');
  assert(!commandCenterCode.includes('18,50,000'), 'Hardcoded ৳18,50,000 GMV removed from CommandCenterView');
  assert(!commandCenterCode.includes('92,500'), 'Hardcoded ৳92,500 Platform Revenue removed from CommandCenterView');
  assert(!commandCenterCode.includes('6,24,000'), 'Hardcoded ৳6,24,000 Settlement Escrow removed from CommandCenterView');
  assert(commandCenterCode.includes('stat-active-turfs'), 'CommandCenterView renders dynamic element #stat-active-turfs');
  assert(commandCenterCode.includes('stat-active-users'), 'CommandCenterView renders dynamic element #stat-active-users');
  assert(commandCenterCode.includes('stat-today-bookings'), 'CommandCenterView renders dynamic element #stat-today-bookings');
  assert(commandCenterCode.includes('stat-gmv-today'), 'CommandCenterView renders dynamic element #stat-gmv-today');
  assert(commandCenterCode.includes('stat-platform-revenue'), 'CommandCenterView renders dynamic element #stat-platform-revenue');

  // 2. Authenticate as Super Admin
  console.log('\n--- 2. Super Admin Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'salahuddinazad01631@gmail.com',
      password: 'Super@dmin01',
    }),
  });

  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.token, 'Super admin logged in successfully and received JWT token');
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. GET /api/admin/dashboard-stats
  console.log('\n--- 3. Live Dashboard Stats Aggregation Endpoint ---');
  const statsRes = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, {
    headers: authHeaders,
  });

  assert(statsRes.ok, `GET /api/admin/dashboard-stats returned HTTP ${statsRes.status}`);
  const stats = await statsRes.json();
  assert(stats.success === true, 'dashboard-stats response includes success: true');
  assert(typeof stats.activeTurfs === 'number', `activeTurfs is a valid number: ${stats.activeTurfs}`);
  assert(typeof stats.totalTurfs === 'number', `totalTurfs is a valid number: ${stats.totalTurfs}`);
  assert(typeof stats.activeUsers === 'number', `activeUsers is a valid number: ${stats.activeUsers}`);
  assert(typeof stats.todayBookings === 'number', `todayBookings is a valid number: ${stats.todayBookings}`);
  assert(typeof stats.gmvToday === 'number', `gmvToday is a valid number: ${stats.gmvToday}`);
  assert(typeof stats.platformRevenueToday === 'number', `platformRevenueToday is 5% calculation: ${stats.platformRevenueToday}`);
  assert(stats.platformRevenueToday === Math.round(stats.gmvToday * 0.05), 'platformRevenueToday strictly equals Math.round(gmvToday * 0.05)');
  assert(typeof stats.totalVolume === 'number', `totalVolume is a valid number: ${stats.totalVolume}`);
  assert(typeof stats.totalPlatformRevenue === 'number', `totalPlatformRevenue is a valid number: ${stats.totalPlatformRevenue}`);
  assert(typeof stats.citiesCount === 'number', `citiesCount is a valid number: ${stats.citiesCount}`);
  assert(typeof stats.topOperatingDistrict === 'string', `topOperatingDistrict is a valid string: "${stats.topOperatingDistrict}"`);

  // 4. GET /api/admin/pending-turfs
  console.log('\n--- 4. Pending Turfs Queue Endpoint ---');
  const pendingRes = await fetch(`${BASE_URL}/api/admin/pending-turfs`, {
    headers: authHeaders,
  });

  assert(pendingRes.ok, `GET /api/admin/pending-turfs returned HTTP ${pendingRes.status}`);
  const pendingList = await pendingRes.json();
  assert(Array.isArray(pendingList), `pendingList is an array of size: ${pendingList.length}`);

  // 5. Test Creating a Turf & Approval Workflow
  console.log('\n--- 5. End-to-End Turf Creation, Pending Queue & Approval Workflow ---');
  const createTurfRes = await fetch(`${BASE_URL}/api/turfs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      turfName: `QA Test Arena ${Date.now()}`,
      address: 'Plot 42, Road 11, Banani',
      city: 'Dhaka',
      area: 'Banani',
      pricePerHour: 2200,
      sportType: ['football', 'cricket'],
      surfaceType: '50mm FIFA Synthetic Turf',
    }),
  });

  assert(createTurfRes.ok, `Created new turf for verification flow, status: ${createTurfRes.status}`);
  const createdTurf = await createTurfRes.json();
  const testTurfId = createdTurf.id;
  assert(testTurfId !== undefined, `Created turf has ID: ${testTurfId}`);

  // Fetch pending list to ensure it appears
  const pendingAfterCreateRes = await fetch(`${BASE_URL}/api/admin/pending-turfs`, {
    headers: authHeaders,
  });
  const pendingAfterCreate = await pendingAfterCreateRes.json();
  const foundInPending = pendingAfterCreate.some((t: any) => String(t.id) === String(testTurfId));
  assert(foundInPending, `Newly registered turf #${testTurfId} appears immediately in pending queue`);

  // Test Direct Approval from Queue
  const approveRes = await fetch(`${BASE_URL}/api/admin/pending-turfs/${testTurfId}/approve`, {
    method: 'PATCH',
    headers: authHeaders,
  });
  assert(approveRes.ok, `PATCH /api/admin/pending-turfs/${testTurfId}/approve returned HTTP ${approveRes.status}`);
  const approveData = await approveRes.json();
  assert(approveData.turf?.verificationStatus === 'approved', 'Approved turf has verificationStatus = "approved"');
  assert(approveData.turf?.isVerified === true, 'Approved turf has isVerified = true');

  // Verify it is no longer in pending queue
  const pendingAfterApproveRes = await fetch(`${BASE_URL}/api/admin/pending-turfs`, {
    headers: authHeaders,
  });
  const pendingAfterApprove = await pendingAfterApproveRes.json();
  const stillInPending = pendingAfterApprove.some((t: any) => String(t.id) === String(testTurfId));
  assert(!stillInPending, `Approved turf #${testTurfId} is successfully removed from pending approvals queue`);

  // Test Rejection endpoint with reason
  const rejectRes = await fetch(`${BASE_URL}/api/admin/pending-turfs/${testTurfId}/reject`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ reason: 'Incomplete ground lighting specification' }),
  });
  assert(rejectRes.ok, `PATCH /api/admin/pending-turfs/${testTurfId}/reject returned HTTP ${rejectRes.status}`);
  const rejectData = await rejectRes.json();
  assert(rejectData.turf?.verificationStatus === 'rejected', 'Rejected turf status is "rejected"');
  assert(rejectData.turf?.rejectionReason === 'Incomplete ground lighting specification', 'Rejection reason stored accurately');

  // Clean up test turf
  await fetch(`${BASE_URL}/api/turfs/${testTurfId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  console.log(`\n========================================`);
  console.log(`Tests finished: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
