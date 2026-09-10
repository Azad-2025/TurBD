async function runRegressionTests() {
  const BASE_URL = 'http://127.0.0.1:3000';
  console.log('====================================================');
  console.log('   TurfBD End-to-End Production Regression Testing   ');
  console.log('====================================================\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<boolean | void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err?.message || err);
      failed++;
    }
  }

  // 1. Health check
  await test('Server Health & DB Connectivity', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (!res.ok || data.status !== 'ok') throw new Error(`Health check failed: ${JSON.stringify(data)}`);
  });

  // 2. User registration and login
  let customerToken = '';
  const customerPhone = '+8801711' + Math.floor(100000 + Math.random() * 900000);
  const customerEmail = `player_${Date.now()}@turfbd.com`;

  await test('1. User Registration & Login (Auth Module)', async () => {
    // Register customer
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Player',
        email: customerEmail,
        phone: customerPhone,
        password: 'Password123!',
        role: 'customer',
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok || !regData.user) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    // Login with registered email & password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    customerToken = loginData.token;
  });

  // 3. OTP Authentication Flow
  await test('2. OTP Authentication & Verification Flow', async () => {
    const otpReq = await fetch(`${BASE_URL}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customerPhone }),
    });
    const otpReqData = await otpReq.json();
    if (!otpReq.ok || !otpReqData.demoCode) {
      throw new Error(`OTP send failed: ${JSON.stringify(otpReqData)}`);
    }

    const otpVerify = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: customerPhone,
        code: otpReqData.demoCode,
      }),
    });
    const otpVerifyData = await otpVerify.json();
    if (!otpVerify.ok || !otpVerifyData.token) {
      throw new Error(`OTP verify failed: ${JSON.stringify(otpVerifyData)}`);
    }
  });

  // 4. Turf Listing & Filtering
  let testTurfId = 1;
  await test('3. Turf Listing & Filtering (Venues Module)', async () => {
    const res = await fetch(`${BASE_URL}/api/turfs`);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data) || data.length === 0) {
      throw new Error(`Turf listing empty or failed: ${JSON.stringify(data)}`);
    }
    // Pick turf 1 (Gulshan United Arena, owned by owner@gulshanarena.com)
    const approvedTurf = data.find((t: any) => t.id === 1 && t.verificationStatus === 'approved') || data[0];
    testTurfId = approvedTurf.id;

    // Filter by city
    const cityRes = await fetch(`${BASE_URL}/api/turfs?city=Dhaka`);
    const cityData = await cityRes.json();
    if (!cityRes.ok || !Array.isArray(cityData)) {
      throw new Error(`Turf filter by city failed: ${JSON.stringify(cityData)}`);
    }
  });

  // 5. Slot Availability
  const dayOffset = Math.floor(Math.random() * 250) + 15;
  const bookingDate = new Date(Date.now() + 86400000 * dayOffset).toISOString().split('T')[0];
  await test('4. Slot Availability & Status Sync (Slots Module)', async () => {
    const res = await fetch(`${BASE_URL}/api/slots?turfId=${testTurfId}&date=${bookingDate}`);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(`Slot query failed: ${JSON.stringify(data)}`);
    }
  });

  // 6. Turf Booking & Double-Booking Protection
  await test('5. Turf Booking Lifecycle & Double-Booking Conflict Prevention', async () => {
    const bookingPayload = {
      turfId: testTurfId,
      bookingDate: bookingDate,
      startTime: '16:00',
      endTime: '17:00',
      paymentMethod: 'bkash',
      isAdvanceOnly: false,
      notes: 'Regression test match booking',
    };

    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(bookingPayload),
    });
    const bookData = await bookRes.json();
    if (!bookRes.ok || !bookData.id) {
      throw new Error(`Booking creation failed: ${JSON.stringify(bookData)}`);
    }

    // Attempt double-booking exact same slot: must be rejected with 409 Conflict
    const doubleBookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(bookingPayload),
    });
    if (doubleBookRes.ok) {
      throw new Error('Double booking prevention failed: duplicate booking was permitted!');
    }
  });

  // 7. Owner Dashboard, Slot Block Controls & Daily Schedule
  let ownerToken = '';
  await test('6. Owner Dashboard Booking & Daily Schedule Management', async () => {
    // Login as existing arena owner (owner@gulshanarena.com)
    const ownerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@gulshanarena.com',
        password: 'password123',
      }),
    });
    const ownerData = await ownerLogin.json();
    if (!ownerLogin.ok || !ownerData.token) {
      throw new Error(`Owner login failed: ${JSON.stringify(ownerData)}`);
    }
    ownerToken = ownerData.token;

    // Block slot for maintenance as owner of Gulshan Arena (turf 1)
    const blockRes = await fetch(`${BASE_URL}/api/slots/toggle-block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        turfId: 1, // Gulshan United Arena owned by user 2
        date: bookingDate,
        startTime: '23:00',
        endTime: '00:00',
        status: 'maintenance',
      }),
    });
    const blockData = await blockRes.json();
    if (!blockRes.ok) {
      throw new Error(`Slot block failed: ${JSON.stringify(blockData)}`);
    }

    // Unblock slot back to available
    const unblockRes = await fetch(`${BASE_URL}/api/slots/toggle-block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        turfId: 1,
        date: bookingDate,
        startTime: '23:00',
        endTime: '00:00',
        status: 'available',
      }),
    });
    if (!unblockRes.ok) {
      throw new Error(`Slot unblock failed: ${JSON.stringify(await unblockRes.json())}`);
    }
  });

  // 8. Admin Panel Audit, Filters & Reports
  await test('7. Admin Panel Global Audit, Filters & Reports', async () => {
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@turfbd.com',
        password: 'password123',
      }),
    });
    const adminData = await adminLogin.json();
    if (!adminLogin.ok || !adminData.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
    }

    // Query bookings with filter parameters (turfId, status, paymentStatus)
    const bookingsRes = await fetch(
      `${BASE_URL}/api/bookings?status=confirmed&turfId=1`,
      {
        headers: { Authorization: `Bearer ${adminData.token}` },
      }
    );
    const bookingsData = await bookingsRes.json();
    if (!bookingsRes.ok || !Array.isArray(bookingsData)) {
      throw new Error(`Admin bookings query failed: ${JSON.stringify(bookingsData)}`);
    }

    // Query platform reports
    const reportRes = await fetch(`${BASE_URL}/api/reports`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    const reportData = await reportRes.json();
    if (!reportRes.ok) {
      throw new Error(`Admin reports query failed: ${JSON.stringify(reportData)}`);
    }
  });

  // 9. Upload Functionality
  await test('8. Upload Functionality (Images & Documents Storage)', async () => {
    // Check uploads retrieval endpoint
    const listRes = await fetch(`${BASE_URL}/api/uploads`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const listData = await listRes.json();
    if (!listRes.ok || !Array.isArray(listData.uploads)) {
      throw new Error(`Uploads list query failed: ${JSON.stringify(listData)}`);
    }

    // Test multipart image upload with 1x1 PNG image buffer
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');

    const boundary = '----WebKitFormBoundaryRegressionUpload' + Date.now();
    const formBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="category"\r\n\r\n` +
        `gallery\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="turfId"\r\n\r\n` +
        `1\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="images"; filename="pitch_turf.png"\r\n` +
        `Content-Type: image/png\r\n\r\n`
      ),
      pngBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(`${BASE_URL}/api/uploads/turf-images`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${ownerToken}`,
      },
      body: formBody,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(`Upload processing failed: ${JSON.stringify(uploadData)}`);
    }
  });

  console.log('\n====================================================');
  console.log(`Regression Test Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL 8 REGRESSION CRITERIA PASSED VERIFICATION!');
    process.exit(0);
  }
}

runRegressionTests();
