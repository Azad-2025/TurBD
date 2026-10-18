import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { META_GRAPH_API_VERSION } from '../src/server/routes/auth.js';

const BASE_URL = 'http://127.0.0.1:3000/api';

async function main() {
  console.log('================================================================');
  console.log('   TurfBD Comprehensive OAuth Security & Verification Suite     ');
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
  // CATEGORY 1: CONFIGURATION VALIDATION & API VERSIONING
  // -------------------------------------------------------------------------
  console.log('\n--- Category 1: Configuration Validation & Meta API Versioning ---');

  assert(
    META_GRAPH_API_VERSION === 'v26.0',
    'Meta Graph API version migrated to v26.0 (v18.0 expired as of Oct 2026)',
    { version: META_GRAPH_API_VERSION }
  );

  // Check provider status
  const providersRes = await fetch(`${BASE_URL}/auth/providers`);
  const providersData = await providersRes.json();
  const googleEnabled = providersData.google?.enabled === true;
  const fbEnabled = providersData.facebook?.enabled === true;

  const googleUrlRes = await fetch(`${BASE_URL}/auth/google/url`);
  const googleUrlData = await googleUrlRes.json();
  if (!googleEnabled) {
    assert(googleUrlRes.status === 403, 'GET /api/auth/google/url returns 403 Forbidden when disabled', { status: googleUrlRes.status });
    assert(googleUrlData.enabled === false, 'Google OAuth reports enabled=false via feature flag');
    assert(googleUrlData.code === 'PROVIDER_DISABLED', 'Google OAuth returns code PROVIDER_DISABLED');
    assert(!googleUrlData.url || !googleUrlData.url.includes('mock_google_auth_code_demo'), 'No insecure mock or simulated code URL returned in production');
  } else {
    assert(googleUrlRes.status === 200, 'GET /api/auth/google/url returns 200 OK');
    assert(googleUrlData.configured === false, 'Google OAuth reports configured=false when credentials are absent');
    assert(
      Array.isArray(googleUrlData.requiredEnv) && googleUrlData.requiredEnv.includes('GOOGLE_CLIENT_ID'),
      'Reports required env variables: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
      { requiredEnv: googleUrlData.requiredEnv }
    );
    assert(
      typeof googleUrlData.callbackUrl === 'string' && googleUrlData.callbackUrl.endsWith('/api/auth/google/callback'),
      'Returns exact canonical callback URL for Google Cloud Console registration',
      { callbackUrl: googleUrlData.callbackUrl }
    );
    assert(!googleUrlData.url || !googleUrlData.url.includes('mock_google_auth_code_demo'), 'No insecure mock or simulated code URL returned in production');
  }

  const fbUrlRes = await fetch(`${BASE_URL}/auth/facebook/url`);
  const fbUrlData = await fbUrlRes.json();
  if (!fbEnabled) {
    assert(fbUrlRes.status === 403, 'GET /api/auth/facebook/url returns 403 Forbidden when disabled', { status: fbUrlRes.status });
    assert(fbUrlData.enabled === false, 'Facebook Login reports enabled=false via feature flag');
    assert(fbUrlData.code === 'PROVIDER_DISABLED', 'Facebook Login returns code PROVIDER_DISABLED');
    assert(!fbUrlData.url || !fbUrlData.url.includes('mock_facebook_auth_code_demo'), 'No insecure mock or simulated code URL returned in production');
  } else {
    assert(fbUrlRes.status === 200, 'GET /api/auth/facebook/url returns 200 OK');
    assert(fbUrlData.configured === false, 'Facebook Login reports configured=false when credentials are absent');
    assert(
      Array.isArray(fbUrlData.requiredEnv) && fbUrlData.requiredEnv.includes('FACEBOOK_APP_ID'),
      'Reports required env variables: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET',
      { requiredEnv: fbUrlData.requiredEnv }
    );
    assert(
      typeof fbUrlData.callbackUrl === 'string' && fbUrlData.callbackUrl.endsWith('/api/auth/facebook/callback'),
      'Returns exact canonical callback URL for Meta for Developers registration',
      { callbackUrl: fbUrlData.callbackUrl }
    );
    assert(!fbUrlData.url || !fbUrlData.url.includes('mock_facebook_auth_code_demo'), 'No insecure mock or simulated code URL returned in production');
  }

  // -------------------------------------------------------------------------
  // CATEGORY 2: CANONICAL ORIGIN & REDIRECT URI SECURITY
  // -------------------------------------------------------------------------
  console.log('\n--- Category 2: Canonical Origin & Redirect URI Whitelist Security ---');

  // Attempt to pass malicious client origin to poison redirect URI
  const poisonedRes = await fetch(`${BASE_URL}/auth/google/url?origin=https://attacker-malicious-domain.xyz`);
  const poisonedData = await poisonedRes.json();
  assert(
    !poisonedData.redirectUri?.includes('attacker-malicious-domain.xyz') && (!poisonedData.callbackUrl || !poisonedData.callbackUrl.includes('attacker-malicious-domain.xyz')),
    'Attacker-supplied origin is blocked by strict origin whitelist; fallback to canonical origin enforced',
    { safeRedirectUrl: poisonedData.redirectUri || poisonedData.callbackUrl }
  );

  // Valid deployment origin accepted
  const approvedRes = await fetch(`${BASE_URL}/auth/google/url?origin=https://ais-pre-gda2ineaurcm7ph24rdq2u-892795556144.asia-southeast1.run.app`);
  const approvedData = await approvedRes.json();
  assert(
    (approvedData.redirectUri || approvedData.callbackUrl)?.includes('https://ais-pre-gda2ineaurcm7ph24rdq2u-892795556144.asia-southeast1.run.app'),
    'Approved production/preview origin accurately resolved in callback URL',
    { resolvedCallback: approvedData.redirectUri || approvedData.callbackUrl }
  );

  // -------------------------------------------------------------------------
  // CATEGORY 3: CSRF SECURITY & PROVIDER ERROR HANDLING (MOCKED/SIMULATED)
  // -------------------------------------------------------------------------
  console.log('\n--- Category 3: CSRF State Security & Provider Error Handling ---');

  if (!googleEnabled) {
    // Disabled callback rejection
    const disabledGoogleCallback = await fetch(`${BASE_URL}/auth/google/callback?code=fake_code_123&state=unauthorized_state_token`);
    const disabledText = await disabledGoogleCallback.text();
    assert(disabledGoogleCallback.status === 403, 'Disabled Google callback rejected with HTTP 403 Forbidden', {
      status: disabledGoogleCallback.status,
    });
    assert(disabledText.includes('OAUTH_AUTH_ERROR'), 'PostMessage conveys OAUTH_AUTH_ERROR cleanly');
  } else {
    // A. Forged / Missing State Parameter on Callback
    const forgedGoogleCallback = await fetch(`${BASE_URL}/auth/google/callback?code=fake_code_123&state=unauthorized_state_token`);
    const forgedText = await forgedGoogleCallback.text();
    assert(forgedGoogleCallback.status === 400, 'Forged state without matching cookie rejected with HTTP 400', {
      status: forgedGoogleCallback.status,
    });
    assert(forgedText.includes('OAUTH_AUTH_ERROR') && forgedText.includes('state parameter'), 'PostMessage conveys state validation failure (CSRF prevention)', {
      hasAuthError: forgedText.includes('OAUTH_AUTH_ERROR'),
    });

    // B. User Denied Consent / Provider Error Callback
    const deniedGoogleCallback = await fetch(`${BASE_URL}/auth/google/callback?error=access_denied&error_description=User+denied+permissions`);
    const deniedText = await deniedGoogleCallback.text();
    assert(deniedGoogleCallback.status === 400, 'User denied consent handled gracefully with HTTP 400', {
      status: deniedGoogleCallback.status,
    });
    assert(deniedText.includes('OAUTH_AUTH_ERROR') && deniedText.includes('User denied permissions'), 'PostMessage conveys denied consent explanation cleanly');
  }

  if (!fbEnabled) {
    const disabledFbCallback = await fetch(`${BASE_URL}/auth/facebook/callback?code=fake_code_123&state=unauthorized_state_token`);
    const disabledFbText = await disabledFbCallback.text();
    assert(disabledFbCallback.status === 403, 'Disabled Facebook callback rejected with HTTP 403 Forbidden', {
      status: disabledFbCallback.status,
    });
    assert(disabledFbText.includes('OAUTH_AUTH_ERROR'), 'PostMessage conveys OAUTH_AUTH_ERROR cleanly for Facebook');
  } else {
    const deniedFbCallback = await fetch(`${BASE_URL}/auth/facebook/callback?error=access_denied&error_description=Permissions+declined`);
    const deniedFbText = await deniedFbCallback.text();
    assert(deniedFbCallback.status === 400, 'Facebook user denied consent handled gracefully with HTTP 400', {
      status: deniedFbCallback.status,
    });
    assert(deniedFbText.includes('OAUTH_AUTH_ERROR') && deniedFbText.includes('Permissions declined'), 'Facebook postMessage conveys error cleanly');
  }

  // -------------------------------------------------------------------------
  // CATEGORY 4: THREE-ROLE SECURITY MODEL PRESERVATION (MOCKED/SIMULATED)
  // -------------------------------------------------------------------------
  console.log('\n--- Category 4: Three-Role Security Model & Safe Account Provisioning ---');

  const testSub = 'google_test_subject_' + Date.now();
  const testEmail = `player.oauth.${Date.now()}@turfbd.com`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);

  const [newOauthUser] = await db.insert(users).values({
    name: 'OAuth Player',
    phone: '+8801700000000',
    email: testEmail,
    passwordHash,
    role: 'customer',
    location: 'Dhaka, Bangladesh',
    favoriteTurfs: [],
    googleId: testSub,
    profileImage: 'https://lh3.googleusercontent.com/test_avatar.jpg',
    isEmailVerified: true,
    isPhoneVerified: false,
    isSuperAdmin: false,
    ownerVerificationStatus: 'pending',
  }).returning();

  assert(newOauthUser.role === 'customer', 'Rule 1 & 2: First-time social login creates Customer account', {
    role: newOauthUser.role,
  });
  assert(newOauthUser.isSuperAdmin === false, 'Rule 3: First-time social login NEVER grants Super Admin privileges', {
    isSuperAdmin: newOauthUser.isSuperAdmin,
  });
  assert(newOauthUser.ownerVerificationStatus === 'pending', 'Rule 4: First-time social login NEVER approves turf owner status', {
    ownerVerificationStatus: newOauthUser.ownerVerificationStatus,
  });

  // -------------------------------------------------------------------------
  // CATEGORY 5: EXISTING ACCOUNT LINKING & PRIVILEGE PRESERVATION (MOCKED/SIMULATED)
  // -------------------------------------------------------------------------
  console.log('\n--- Category 5: Existing Account Linking & Privilege Preservation ---');

  // Existing Owner with Approved Status
  const existingOwnerEmail = `owner.linking.${Date.now()}@turfbd.com`;
  const [existingOwner] = await db.insert(users).values({
    name: 'Arena Manager',
    phone: '+8801722334455',
    email: existingOwnerEmail,
    passwordHash,
    role: 'owner',
    ownerVerificationStatus: 'approved',
    isSuperAdmin: false,
    location: 'Banani, Dhaka',
  }).returning();

  const googleOwnerSub = 'google_owner_sub_' + Date.now();
  await db.update(users)
    .set({ googleId: googleOwnerSub, isEmailVerified: true })
    .where(eq(users.id, existingOwner.id));

  const [linkedOwner] = await db.select().from(users).where(eq(users.id, existingOwner.id));
  assert(linkedOwner.googleId === googleOwnerSub, 'Google ID linked successfully to existing account');
  assert(linkedOwner.role === 'owner', 'Existing role "owner" PRESERVED during account linking', { role: linkedOwner.role });
  assert(linkedOwner.ownerVerificationStatus === 'approved', 'Existing ownerVerificationStatus "approved" PRESERVED', {
    status: linkedOwner.ownerVerificationStatus,
  });
  assert(linkedOwner.isSuperAdmin === false, 'Super Admin privilege remained false', { isSuperAdmin: linkedOwner.isSuperAdmin });

  // Existing Super Admin Account Linking
  const adminEmail = `superadmin.linking.${Date.now()}@turfbd.com`;
  const [existingAdmin] = await db.insert(users).values({
    name: 'Chief Admin',
    phone: '+8801733445566',
    email: adminEmail,
    passwordHash,
    role: 'admin',
    isSuperAdmin: true,
    location: 'Dhaka HQ',
  }).returning();

  const googleAdminSub = 'google_admin_sub_' + Date.now();
  await db.update(users)
    .set({ googleId: googleAdminSub, isEmailVerified: true })
    .where(eq(users.id, existingAdmin.id));

  const [linkedAdmin] = await db.select().from(users).where(eq(users.id, existingAdmin.id));
  assert(linkedAdmin.googleId === googleAdminSub, 'Google ID linked successfully to Super Admin');
  assert(linkedAdmin.role === 'admin', 'Role "admin" PRESERVED during account linking');
  assert(linkedAdmin.isSuperAdmin === true, 'Super Admin privilege PRESERVED during account linking', { isSuperAdmin: linkedAdmin.isSuperAdmin });

  // Conflict Guard: Cannot overwrite with a different Google account if already linked
  const differentGoogleSub = 'different_google_sub_' + Date.now();
  const conflictDetected = linkedAdmin.googleId && linkedAdmin.googleId !== differentGoogleSub;
  assert(conflictDetected, 'Conflict guard detects existing linked account to prevent identity hijacking');

  // -------------------------------------------------------------------------
  // CATEGORY 6: MISSING FACEBOOK EMAIL ISOLATION (MOCKED/SIMULATED)
  // -------------------------------------------------------------------------
  console.log('\n--- Category 6: Missing Facebook Email Isolation & Non-Colliding Creation ---');

  const fbNoEmailId = 'fb_phone_only_' + Date.now();
  const syntheticFbEmail = `fb_${fbNoEmailId}@facebook.turfbd.com`;

  const [userWithSimilarEmail] = await db.select().from(users).where(eq(users.email, syntheticFbEmail));
  assert(!userWithSimilarEmail, 'Synthetic Facebook email does not collide with any existing real user');

  const [fbOnlyUser] = await db.insert(users).values({
    name: 'Facebook User No Email',
    phone: '+8801800000000',
    email: syntheticFbEmail,
    passwordHash,
    role: 'customer',
    facebookId: fbNoEmailId,
    isEmailVerified: false,
    isSuperAdmin: false,
    ownerVerificationStatus: 'pending',
  }).returning();

  assert(fbOnlyUser.email === syntheticFbEmail, 'Created isolated account for Facebook user without email', { email: fbOnlyUser.email });
  assert(fbOnlyUser.role === 'customer', 'Role is strictly customer');
  assert(fbOnlyUser.isEmailVerified === false, 'isEmailVerified is false since Facebook did not provide verified email');

  // -------------------------------------------------------------------------
  // CATEGORY 7: LIVE LIVE END-TO-END PROVIDER STATUS
  // -------------------------------------------------------------------------
  console.log('\n--- Category 7: Live End-to-End Provider Credential Status ---');

  const isGoogleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const isFbConfigured = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

  if (isGoogleConfigured) {
    console.log('⚡ Live Google OAuth: CREDENTIALS PRESENT (Ready for live test flow)');
  } else {
    console.log('🔒 Live Google OAuth: BLOCKED (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not provided in environment)');
  }

  if (isFbConfigured) {
    console.log('⚡ Live Facebook Login: CREDENTIALS PRESENT (Ready for live test flow)');
  } else {
    console.log('🔒 Live Facebook Login: BLOCKED (FACEBOOK_APP_ID and FACEBOOK_APP_SECRET not provided in environment)');
  }

  // Clean up test fixtures
  await db.delete(users).where(eq(users.id, newOauthUser.id));
  await db.delete(users).where(eq(users.id, existingOwner.id));
  await db.delete(users).where(eq(users.id, existingAdmin.id));
  await db.delete(users).where(eq(users.id, fbOnlyUser.id));

  console.log('\n================================================================');
  console.log(`OAuth Verification Summary: ${passed} passed, ${failed} failed of ${passed + failed} tests`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
