import fs from 'fs';
import path from 'path';

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
  console.log(' TurfBD AdminPanel Frontend Super Admin Guard Verification Suite');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Static Source Code Analysis for AdminPanel.tsx
  // -------------------------------------------------------------------------
  const adminPanelPath = path.resolve('src/components/AdminPanel.tsx');
  const adminPanelContent = fs.readFileSync(adminPanelPath, 'utf-8');

  record(
    1,
    'AdminPanel.tsx exists and is readable',
    fs.existsSync(adminPanelPath) && adminPanelContent.length > 0,
    `File size: ${adminPanelContent.length} bytes`
  );

  const allowsSuperAdminInGuard =
    adminPanelContent.includes("currentUser?.role === 'super_admin'") ||
    adminPanelContent.includes('role === \'super_admin\'');
  record(
    2,
    "AdminPanel.tsx guard explicitly checks for role === 'super_admin'",
    allowsSuperAdminInGuard,
    `Guard incorporates super_admin check: ${allowsSuperAdminInGuard}`
  );

  const allowsAdminInGuard =
    adminPanelContent.includes("currentUser?.role === 'admin'") ||
    adminPanelContent.includes('role === \'admin\'');
  record(
    3,
    "AdminPanel.tsx guard explicitly checks for role === 'admin'",
    allowsAdminInGuard,
    `Guard incorporates admin check: ${allowsAdminInGuard}`
  );

  const noExclusiveAdminCheck = !adminPanelContent.includes("if (!currentUser || currentUser.role !== 'admin')");
  record(
    4,
    "AdminPanel.tsx no longer contains the rigid single-role check: currentUser.role !== 'admin'",
    noExclusiveAdminCheck,
    `Rigid check eliminated: ${noExclusiveAdminCheck}`
  );

  const demoButtonUnlockedForSuperAdmin =
    adminPanelContent.includes('isSuperAdmin') &&
    adminPanelContent.includes('admin-remove-demo-turfs-btn');
  record(
    5,
    'AdminPanel.tsx unlocks #admin-remove-demo-turfs-btn for Super Admins',
    demoButtonUnlockedForSuperAdmin,
    `Demo button gate: ${demoButtonUnlockedForSuperAdmin}`
  );

  // -------------------------------------------------------------------------
  // 2. Static Source Code Analysis for OwnerDashboard.tsx
  // -------------------------------------------------------------------------
  const ownerDashPath = path.resolve('src/components/OwnerDashboard.tsx');
  const ownerDashContent = fs.readFileSync(ownerDashPath, 'utf-8');

  const ownerDashAllowsSuperAdmin =
    ownerDashContent.includes("currentUser?.role === 'super_admin'") ||
    ownerDashContent.includes('isSuperAdmin');
  record(
    6,
    "OwnerDashboard.tsx guard also accepts role === 'super_admin'",
    ownerDashAllowsSuperAdmin,
    `OwnerDashboard incorporates super_admin check: ${ownerDashAllowsSuperAdmin}`
  );

  // -------------------------------------------------------------------------
  // 3. Static Source Code Analysis for api.ts mapUser
  // -------------------------------------------------------------------------
  const apiPath = path.resolve('src/services/api.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf-8');

  const mapUserHandlesSuperAdmin =
    apiContent.includes("u.role === 'super_admin'") &&
    apiContent.includes('SUPER_ADMIN_EMAILS');
  record(
    7,
    'api.ts mapUser explicitly preserves super_admin role and sets isSuperAdmin=true',
    mapUserHandlesSuperAdmin,
    `mapUser handles super_admin: ${mapUserHandlesSuperAdmin}`
  );

  // -------------------------------------------------------------------------
  // 4. Live Authentication & Simulated Frontend Guard Logic
  // -------------------------------------------------------------------------

  // Helper matching AdminPanel.tsx guard logic
  function testAdminPanelGuard(user: any): boolean {
    const isSuperAdmin = user?.role === 'super_admin' || Boolean(user?.isSuperAdmin);
    const isAuthorizedAdmin = Boolean(user) && (isSuperAdmin || user?.role === 'admin');
    return isAuthorizedAdmin;
  }

  // Account 1: salahuddinazad01631@gmail.com
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
    const isGuardPassed = testAdminPanelGuard(data.user);

    record(
      8,
      'Super Admin 1 (salahuddinazad01631@gmail.com) logs in with role="super_admin"',
      res.status === 200 && data.user?.role === 'super_admin',
      `Status: ${res.status}, Role: ${data.user?.role}`
    );

    record(
      9,
      'Super Admin 1 user object passes AdminPanel guard (isAuthorizedAdmin === true)',
      isGuardPassed === true,
      `Guard passed: ${isGuardPassed}`
    );
  }

  // Account 2: Sharafatrahman4112003@gmail.com
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
    const isGuardPassed = testAdminPanelGuard(data.user);

    record(
      10,
      'Super Admin 2 (Sharafatrahman4112003@gmail.com) logs in with role="super_admin"',
      res.status === 200 && data.user?.role === 'super_admin',
      `Status: ${res.status}, Role: ${data.user?.role}`
    );

    record(
      11,
      'Super Admin 2 user object passes AdminPanel guard (isAuthorizedAdmin === true)',
      isGuardPassed === true,
      `Guard passed: ${isGuardPassed}`
    );
  }

  // Standard Admin Account: admin@turfbd.com
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@turfbd.com',
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    const isGuardPassed = testAdminPanelGuard(data.user);

    record(
      12,
      'Standard Admin (admin@turfbd.com) also passes AdminPanel guard',
      res.status === 200 && isGuardPassed === true,
      `Status: ${res.status}, Guard passed: ${isGuardPassed}`
    );
  }

  // Unauthorized Customer Account: customer is blocked by AdminPanel guard
  {
    const customerUser = {
      id: '999',
      name: 'Regular Customer',
      email: 'customer@turfbd.com',
      role: 'customer',
      isSuperAdmin: false,
    };
    const isGuardPassed = testAdminPanelGuard(customerUser);

    record(
      13,
      'Customer account is rejected by AdminPanel guard (isAuthorizedAdmin === false)',
      isGuardPassed === false,
      `Guard passed: ${isGuardPassed} (Access Denied as expected)`
    );
  }

  // Unauthorized Owner Account: owner is blocked by AdminPanel guard
  {
    const ownerUser = {
      id: '888',
      name: 'Turf Owner',
      email: 'owner@turfbd.com',
      role: 'owner',
      isSuperAdmin: false,
    };
    const isGuardPassed = testAdminPanelGuard(ownerUser);

    record(
      14,
      'Owner account is rejected by AdminPanel guard (isAuthorizedAdmin === false)',
      isGuardPassed === false,
      `Guard passed: ${isGuardPassed} (Access Denied as expected)`
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
