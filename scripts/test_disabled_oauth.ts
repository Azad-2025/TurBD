import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:3000/api';

async function main() {
  console.log('================================================================');
  console.log('   TurfBD Disabled OAuth Feature Flag & Auth Verification Suite ');
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
  // CATEGORY 1: FEATURE FLAG CONFIGURATION & PROVIDERS STATUS ENDPOINT
  // -------------------------------------------------------------------------
  console.log('\n--- Category 1: Feature Flag Configuration & Provider Status Endpoint ---');

  // Verify .env.example contains explicit false flags
  const envExampleContent = fs.readFileSync(path.resolve('.env.example'), 'utf-8');
  assert(
    envExampleContent.includes('ENABLE_GOOGLE_OAUTH=false') && envExampleContent.includes('ENABLE_FACEBOOK_OAUTH=false'),
    'Server-side feature flags defined as false in .env.example (ENABLE_GOOGLE_OAUTH=false, ENABLE_FACEBOOK_OAUTH=false)'
  );
  assert(
    envExampleContent.includes('VITE_ENABLE_GOOGLE_OAUTH=false') && envExampleContent.includes('VITE_ENABLE_FACEBOOK_OAUTH=false'),
    'Client-side feature flags defined as false in .env.example (VITE_ENABLE_GOOGLE_OAUTH=false, VITE_ENABLE_FACEBOOK_OAUTH=false)'
  );

  // Query GET /api/auth/providers
  const providersRes = await fetch(`${BASE_URL}/auth/providers`);
  const providersData = await providersRes.json();
  assert(providersRes.status === 200, 'GET /api/auth/providers returns 200 OK');
  assert(providersData.google?.enabled === false, 'Google OAuth flag reports enabled=false on server', providersData.google);
  assert(providersData.facebook?.enabled === false, 'Facebook Login flag reports enabled=false on server', providersData.facebook);
  assert(providersData.emailPassword?.enabled === true, 'Email/Password auth remains enabled=true');
  assert(providersData.phoneOtp?.enabled === true, 'Phone OTP verification remains enabled=true');

  // -------------------------------------------------------------------------
  // CATEGORY 2: DISABLED PROVIDER INITIATION REQUESTS MUST BE REFUSED
  // -------------------------------------------------------------------------
  console.log('\n--- Category 2: Disabled Provider Initiation Requests Refusal ---');

  const googleUrlRes = await fetch(`${BASE_URL}/auth/google/url`);
  const googleUrlData = await googleUrlRes.json();
  assert(googleUrlRes.status === 403, 'GET /api/auth/google/url returns HTTP 403 Forbidden when disabled', { status: googleUrlRes.status });
  assert(googleUrlData.enabled === false, 'Google auth URL response indicates enabled=false');
  assert(googleUrlData.code === 'PROVIDER_DISABLED', 'Google auth URL response provides code PROVIDER_DISABLED');
  assert(
    googleUrlData.error && googleUrlData.error.includes('temporarily disabled'),
    'Google auth URL response provides clear disabled message',
    { message: googleUrlData.error }
  );
  assert(!googleUrlData.url, 'No OAuth redirect URL is generated or leaked when Google is disabled');

  const fbUrlRes = await fetch(`${BASE_URL}/auth/facebook/url`);
  const fbUrlData = await fbUrlRes.json();
  assert(fbUrlRes.status === 403, 'GET /api/auth/facebook/url returns HTTP 403 Forbidden when disabled', { status: fbUrlRes.status });
  assert(fbUrlData.enabled === false, 'Facebook auth URL response indicates enabled=false');
  assert(fbUrlData.code === 'PROVIDER_DISABLED', 'Facebook auth URL response provides code PROVIDER_DISABLED');
  assert(
    fbUrlData.error && fbUrlData.error.includes('temporarily disabled'),
    'Facebook auth URL response provides clear disabled message',
    { message: fbUrlData.error }
  );
  assert(!fbUrlData.url, 'No OAuth redirect URL is generated or leaked when Facebook is disabled');

  // -------------------------------------------------------------------------
  // CATEGORY 3: DISABLED PROVIDER CALLBACK REQUESTS MUST REFUSE AUTHENTICATION
  // -------------------------------------------------------------------------
  console.log('\n--- Category 3: Disabled Provider Callback Refusal & Anti-Mock Protection ---');

  // Attempt Google callback while disabled
  const googleCallbackRes = await fetch(`${BASE_URL}/auth/google/callback?code=any_auth_code&state=any_state`);
  const googleCallbackHtml = await googleCallbackRes.text();
  assert(googleCallbackRes.status === 403, 'GET /api/auth/google/callback returns HTTP 403 Forbidden when disabled', { status: googleCallbackRes.status });
  assert(googleCallbackHtml.includes('OAUTH_AUTH_ERROR'), 'Google callback renders OAUTH_AUTH_ERROR postMessage payload');
  assert(googleCallbackHtml.includes('Google Login is temporarily disabled'), 'Google callback popup displays disabled explanation to user');
  assert(!googleCallbackHtml.includes('OAUTH_AUTH_SUCCESS'), 'No fake success or fallback mock login occurs on Google callback');

  // Attempt Facebook callback while disabled
  const fbCallbackRes = await fetch(`${BASE_URL}/auth/facebook/callback?code=any_fb_code&state=any_state`);
  const fbCallbackHtml = await fbCallbackRes.text();
  assert(fbCallbackRes.status === 403, 'GET /api/auth/facebook/callback returns HTTP 403 Forbidden when disabled', { status: fbCallbackRes.status });
  assert(fbCallbackHtml.includes('OAUTH_AUTH_ERROR'), 'Facebook callback renders OAUTH_AUTH_ERROR postMessage payload');
  assert(fbCallbackHtml.includes('Facebook Login is temporarily disabled'), 'Facebook callback popup displays disabled explanation to user');
  assert(!fbCallbackHtml.includes('OAUTH_AUTH_SUCCESS'), 'No fake success or fallback mock login occurs on Facebook callback');

  // Verify cookies are not set with authenticated tokens
  const googleSetCookie = googleCallbackRes.headers.get('set-cookie');
  assert(
    !googleSetCookie || !googleSetCookie.includes('access_token=ey'),
    'No authenticated session access_token cookie is issued upon disabled callback'
  );

  // -------------------------------------------------------------------------
  // CATEGORY 4: UI VERIFICATION - SOCIAL BUTTONS HIDDEN IN AUTH MODAL
  // -------------------------------------------------------------------------
  console.log('\n--- Category 4: UI Verification - Provider Buttons Hidden in Auth Modal ---');

  const authModalCode = fs.readFileSync(path.resolve('src/components/AuthModal.tsx'), 'utf-8');
  assert(
    authModalCode.includes("const isGoogleOAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === 'true';"),
    'AuthModal checks VITE_ENABLE_GOOGLE_OAUTH feature flag'
  );
  assert(
    authModalCode.includes("const isFacebookOAuthEnabled = import.meta.env.VITE_ENABLE_FACEBOOK_OAUTH === 'true';"),
    'AuthModal checks VITE_ENABLE_FACEBOOK_OAUTH feature flag'
  );
  assert(
    authModalCode.includes('const showSocialLogin = (isGoogleOAuthEnabled || isFacebookOAuthEnabled)'),
    'AuthModal guards entire social section with showSocialLogin'
  );
  assert(
    authModalCode.includes('{showSocialLogin && (') &&
    authModalCode.includes('{isGoogleOAuthEnabled && (') &&
    authModalCode.includes('{isFacebookOAuthEnabled && ('),
    'Both Google and Facebook buttons are strictly conditionally rendered and hidden when flags are false'
  );

  // -------------------------------------------------------------------------
  // CATEGORY 5: PRESERVATION OF STANDARD EMAIL/PASSWORD & ROLE-BASED AUTH
  // -------------------------------------------------------------------------
  console.log('\n--- Category 5: Preservation of Standard Email/Password & Role-Based Auth ---');

  // 1. Customer Login
  const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tanvir@turfbd.com',
      password: 'Password123!',
    }),
  });
  const customerLoginData = await customerLoginRes.json();
  assert(customerLoginRes.status === 200, 'Existing Customer email/password login succeeds with HTTP 200');
  assert(customerLoginData.user?.role === 'customer', 'Customer user role is preserved as "customer"');
  assert(customerLoginData.user?.isSuperAdmin === false, 'Customer user has isSuperAdmin: false');
  assert(Boolean(customerLoginData.token), 'Valid access token returned for Customer');

  // 2. Owner Login
  const ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@gulshanarena.com',
      password: 'Password123!',
    }),
  });
  const ownerLoginData = await ownerLoginRes.json();
  assert(ownerLoginRes.status === 200, 'Existing Owner email/password login succeeds with HTTP 200');
  assert(ownerLoginData.user?.role === 'owner', 'Owner user role is preserved as "owner"');
  assert(ownerLoginData.user?.ownerVerificationStatus === 'approved', 'Owner approval status preserved as "approved"');
  assert(Boolean(ownerLoginData.token), 'Valid access token returned for Owner');

  // 3. Super Admin Login
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@turfbd.com',
      password: 'Password123!',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200, 'Existing Super Admin login succeeds with HTTP 200');
  assert(adminLoginData.user?.role === 'admin', 'Admin user role is preserved as "admin"');
  assert(adminLoginData.user?.isSuperAdmin === true, 'Super Admin privilege is preserved as isSuperAdmin: true');
  assert(Boolean(adminLoginData.token), 'Valid access token returned for Super Admin');

  // 4. Invalid Password Handling
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tanvir@turfbd.com',
      password: 'WrongPassword!',
    }),
  });
  assert(badLoginRes.status === 401, 'Invalid credentials rejected with HTTP 401 Unauthorized');

  // 5. Phone OTP Workflow Endpoints Exist and Are Operational
  const otpRes = await fetch(`${BASE_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+8801712345678' }),
  });
  assert(
    otpRes.status === 200 || otpRes.status === 400 || otpRes.status === 429,
    'Phone OTP send endpoint (/api/auth/otp/send) is active and intact',
    { status: otpRes.status }
  );

  console.log('\n================================================================');
  console.log(`Disabled OAuth Suite Summary: ${passed} passed, ${failed} failed of ${passed + failed} tests`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in test_disabled_oauth:', err);
  process.exit(1);
});
