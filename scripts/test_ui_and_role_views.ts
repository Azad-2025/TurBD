import { db } from '../src/db/index.js';
import { users, turfs } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://127.0.0.1:3000/api';

async function main() {
  console.log('================================================================');
  console.log('   TurfBD Comprehensive Role Views & Profile Verification       ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${desc}${details ? ` -> ${JSON.stringify(details)}` : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}${details ? ` -> ${JSON.stringify(details)}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Super Admin Authentication & Privilege Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Super Admin Login & Privilege Verification ---');
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@turfbd.com', password: 'Password123!' }),
  });
  const adminData = await adminRes.json();
  assert(adminRes.status === 200, 'Super Admin login succeeds with HTTP 200', { status: adminRes.status });
  assert(adminData.user?.role === 'admin', 'Login returns server-authoritative role="admin"', { role: adminData.user?.role });
  assert(adminData.user?.isSuperAdmin === true, 'Login returns server-authoritative isSuperAdmin=true', { isSuperAdmin: adminData.user?.isSuperAdmin });
  assert(adminData.user?.profileImage === null, 'Super Admin has no automatically assigned fake avatar', { profileImage: adminData.user?.profileImage });

  const adminToken = adminData.token;

  // Verify /me endpoint
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.user?.isSuperAdmin === true, 'GET /api/auth/me returns valid Super Admin session', {
    id: meData.user?.id,
    email: meData.user?.email,
    isSuperAdmin: meData.user?.isSuperAdmin,
  });

  // Verify Super Admin access to protected administrative endpoints
  const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(auditRes.status === 200, 'Super Admin has authorized access to /api/admin/audit-logs', { status: auditRes.status });

  // -------------------------------------------------------------------------
  // 2. Approved Turf Owner Login & View Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Approved Turf Owner Login & View Isolation ---');
  const ownerRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@gulshanarena.com', password: 'Password123!' }),
  });
  const ownerData = await ownerRes.json();
  assert(ownerRes.status === 200, 'Turf Owner login succeeds with HTTP 200', { status: ownerRes.status });
  assert(ownerData.user?.role === 'owner', 'Owner login returns role="owner"', { role: ownerData.user?.role });
  assert(ownerData.user?.ownerVerificationStatus === 'approved', 'Owner verification status is approved', {
    verificationStatus: ownerData.user?.ownerVerificationStatus,
  });
  assert(ownerData.user?.profileImage === null, 'Turf Owner has no automatically assigned demo avatar', { profileImage: ownerData.user?.profileImage });

  const ownerToken = ownerData.token;

  // Owner accessing owner endpoints
  const ownerPayRes = await fetch(`${BASE_URL}/payments/owner`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(ownerPayRes.status === 200, 'Approved owner can access operational /api/payments/owner/summary', { status: ownerPayRes.status });

  // Owner BLOCKED from admin endpoints
  const ownerAdminRes = await fetch(`${BASE_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(ownerAdminRes.status === 403, 'Turf Owner is blocked from /api/auth/users (403 Forbidden)', { status: ownerAdminRes.status });

  // -------------------------------------------------------------------------
  // 3. Pending, Rejected, and Suspended Owner Behavior
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Pending, Rejected, and Suspended Owner Access Guards ---');
  // Create test fixtures for pending, rejected, and suspended owners
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Password123!', salt);
  const testId = Date.now();

  const [pendingOwner] = await db.insert(users).values({
    name: 'Verification Pending Owner',
    email: `pending_${testId}@test.com`,
    phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
    passwordHash: hash,
    role: 'owner',
    ownerVerificationStatus: 'pending',
    isEmailVerified: true,
    isPhoneVerified: true,
  }).returning();

  const [rejectedOwner] = await db.insert(users).values({
    name: 'Verification Rejected Owner',
    email: `rejected_${testId}@test.com`,
    phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
    passwordHash: hash,
    role: 'owner',
    ownerVerificationStatus: 'rejected',
    ownerRejectionReason: 'Trade license not matching venue registry',
    isEmailVerified: true,
    isPhoneVerified: true,
  }).returning();

  const [suspendedOwner] = await db.insert(users).values({
    name: 'Access Suspended Owner',
    email: `suspended_${testId}@test.com`,
    phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
    passwordHash: hash,
    role: 'owner',
    ownerVerificationStatus: 'suspended',
    ownerSuspensionReason: 'Multiple pitch double-booking violations reported',
    isEmailVerified: true,
    isPhoneVerified: true,
  }).returning();

  // Login pending owner
  const pLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: pendingOwner.email, password: 'Password123!' }),
  });
  const pLoginData = await pLoginRes.json();
  assert(pLoginData.user?.ownerVerificationStatus === 'pending', 'Pending owner logs in with status="pending"', { status: pLoginData.user?.ownerVerificationStatus });

  // Test pending owner blocked from operational endpoint
  const pOpRes = await fetch(`${BASE_URL}/payments/owner`, {
    headers: { Authorization: `Bearer ${pLoginData.token}` },
  });
  assert(pOpRes.status === 403, 'Pending owner blocked from operational finances with HTTP 403', { status: pOpRes.status });

  // Login rejected owner
  const rLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: rejectedOwner.email, password: 'Password123!' }),
  });
  const rLoginData = await rLoginRes.json();
  assert(rLoginData.user?.ownerVerificationStatus === 'rejected', 'Rejected owner logs in with status="rejected"', {
    status: rLoginData.user?.ownerVerificationStatus,
    reason: rLoginData.user?.ownerRejectionReason,
  });

  const rOpRes = await fetch(`${BASE_URL}/payments/owner`, {
    headers: { Authorization: `Bearer ${rLoginData.token}` },
  });
  assert(rOpRes.status === 403, 'Rejected owner blocked from operational finances with HTTP 403', { status: rOpRes.status });

  // Login suspended owner
  const sLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: suspendedOwner.email, password: 'Password123!' }),
  });
  const sLoginData = await sLoginRes.json();
  assert(sLoginData.user?.ownerVerificationStatus === 'suspended', 'Suspended owner logs in with status="suspended"', {
    status: sLoginData.user?.ownerVerificationStatus,
    reason: sLoginData.user?.ownerSuspensionReason,
  });

  const sOpRes = await fetch(`${BASE_URL}/payments/owner`, {
    headers: { Authorization: `Bearer ${sLoginData.token}` },
  });
  assert(sOpRes.status === 403, 'Suspended owner blocked from operational finances with HTTP 403', { status: sOpRes.status });

  // -------------------------------------------------------------------------
  // 4. Customer / Player Login & Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Customer / Player Login & Isolation ---');
  const custRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tanvir@turfbd.com', password: 'Password123!' }),
  });
  const custData = await custRes.json();
  assert(custRes.status === 200, 'Customer login succeeds with HTTP 200', { status: custRes.status });
  assert(custData.user?.role === 'customer', 'Customer login returns role="customer"', { role: custData.user?.role });
  assert(custData.user?.isSuperAdmin === false, 'Customer isSuperAdmin is false', { isSuperAdmin: custData.user?.isSuperAdmin });
  assert(custData.user?.profileImage === null, 'Customer has no default fake avatar', { profileImage: custData.user?.profileImage });

  const custToken = custData.token;

  // Customer blocked from owner & admin endpoints
  const custOwnerRes = await fetch(`${BASE_URL}/payments/owner`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert(custOwnerRes.status === 403, 'Customer blocked from owner endpoints (403 Forbidden)', { status: custOwnerRes.status });

  const custAdminRes = await fetch(`${BASE_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert(custAdminRes.status === 403, 'Customer blocked from admin endpoints (403 Forbidden)', { status: custAdminRes.status });

  // -------------------------------------------------------------------------
  // 5. Profile Editing & Protection of Sensitive Fields
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Profile Editing & Field Protection ---');
  // Attempt to tamper with role and isSuperAdmin via profile update
  const tamperRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`,
    },
    body: JSON.stringify({
      name: 'Tanvir Ahmed (Verified Player)',
      location: 'Gulshan-2, Dhaka',
      role: 'admin',
      isSuperAdmin: true,
      ownerVerificationStatus: 'approved',
    }),
  });
  const tamperData = await tamperRes.json();
  assert(tamperRes.status === 200, 'Profile update succeeds for permitted fields', { status: tamperRes.status });
  assert(tamperData.user?.name === 'Tanvir Ahmed (Verified Player)', 'Name successfully updated', { name: tamperData.user?.name });
  assert(tamperData.user?.location === 'Gulshan-2, Dhaka', 'Location successfully updated', { location: tamperData.user?.location });
  assert(tamperData.user?.role === 'customer', 'Role tampering ignored; user remains role="customer"', { role: tamperData.user?.role });
  assert(tamperData.user?.isSuperAdmin === false, 'Privilege escalation ignored; isSuperAdmin remains false', { isSuperAdmin: tamperData.user?.isSuperAdmin });
  assert(tamperData.user?.ownerVerificationStatus === 'pending', 'Verification tampering ignored; status remains pending', {
    status: tamperData.user?.ownerVerificationStatus,
  });

  // Verify in database directly
  const [dbCust] = await db.select().from(users).where(eq(users.id, Number(custData.user.id)));
  assert(dbCust.role === 'customer' && dbCust.isSuperAdmin === false, 'Database confirms role and isSuperAdmin are unaltered', {
    dbRole: dbCust.role,
    dbIsSuperAdmin: dbCust.isSuperAdmin,
  });

  // -------------------------------------------------------------------------
  // 6. Profile Avatar Upload, Retrieval, & Deletion
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Profile Avatar Upload, Persistence, & Removal ---');
  // Create a minimal 1x1 valid PNG image buffer
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic bytes
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
    0x42, 0x60, 0x82
  ]);

  const formData = new FormData();
  const blob = new Blob([pngHeader], { type: 'image/png' });
  formData.append('avatar', blob, 'my_test_avatar.png');

  const uploadRes = await fetch(`${BASE_URL}/uploads/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${custToken}` },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  assert(uploadRes.status === 200 && Boolean(uploadData.profileImage), 'POST /api/uploads/avatar successfully stores valid image', {
    status: uploadRes.status,
    profileImage: uploadData.profileImage,
  });

  // Verify avatar persisted on GET /api/auth/me
  const custMeRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const custMeData = await custMeRes.json();
  assert(custMeData.user?.profileImage === uploadData.profileImage, 'GET /api/auth/me returns persisted profile photo URL', {
    profileImage: custMeData.user?.profileImage,
  });

  // Remove avatar
  const deleteRes = await fetch(`${BASE_URL}/uploads/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const deleteData = await deleteRes.json();
  assert(deleteRes.status === 200, 'DELETE /api/uploads/avatar successfully removes profile photo', { status: deleteRes.status });

  // Verify avatar is null again on GET /api/auth/me
  const afterDeleteRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const afterDeleteData = await afterDeleteRes.json();
  assert(afterDeleteData.user?.profileImage === null, 'Profile photo is now null; UserAvatar will render neutral initials', {
    profileImage: afterDeleteData.user?.profileImage,
  });

  // Clean up temporary test fixtures
  await db.delete(users).where(eq(users.id, pendingOwner.id));
  await db.delete(users).where(eq(users.id, rejectedOwner.id));
  await db.delete(users).where(eq(users.id, suspendedOwner.id));

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`Verification Summary: ${passed} passed, ${failed} failed of ${passed + failed} tests`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
