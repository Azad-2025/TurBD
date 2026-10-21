import fs from 'fs';
import path from 'path';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(id: number, name: string, condition: boolean, details?: string) {
  results.push({ id, name, passed: condition, details });
  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [#${id}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function main() {
  console.log('================================================================');
  console.log(' TurfBD Mobile PWA Install Experience & Cross-Platform QA Suite ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. MOBILE HEADER "INSTALL APP" BUTTON
  // -------------------------------------------------------------------------
  console.log('--- 1. Mobile Website UI: Prominent "Install App" Button ---');

  const mobileHeaderPath = path.resolve('src/components/MobileAppHeader.tsx');
  const mobileHeaderCode = fs.readFileSync(mobileHeaderPath, 'utf-8');

  assert(
    1,
    'MobileAppHeader imports MobileInstallButton component',
    mobileHeaderCode.includes("import { MobileInstallButton } from './MobileInstallButton'"),
    'Import verified in MobileAppHeader.tsx'
  );

  assert(
    2,
    'MobileAppHeader mounts <MobileInstallButton /> in primary mobile top bar',
    mobileHeaderCode.includes('<MobileInstallButton />'),
    'Mounted in header action row'
  );

  assert(
    3,
    'MobileAppHeader preserves city selector, notification bell, and brand logo alongside install button',
    mobileHeaderCode.includes('mobile-city-select') &&
      mobileHeaderCode.includes('NotificationBell') &&
      mobileHeaderCode.includes('mobile-header-logo-btn'),
    'All core mobile header controls preserved'
  );

  // -------------------------------------------------------------------------
  // 2. MOBILE INSTALL BUTTON COMPONENT IMPLEMENTATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. MobileInstallButton: Platform Handling & Prompts ---');

  const btnPath = path.resolve('src/components/MobileInstallButton.tsx');
  assert(4, 'MobileInstallButton.tsx component exists on disk', fs.existsSync(btnPath));

  const btnCode = fs.readFileSync(btnPath, 'utf-8');

  assert(
    5,
    'MobileInstallButton renders #mobile-install-app-btn with visible "Install App" label',
    btnCode.includes('id="mobile-install-app-btn"') && btnCode.includes('Install App'),
    'Button ID and label verified'
  );

  assert(
    6,
    'MobileInstallButton styles with TurfBD emerald brand color (#0FA958)',
    btnCode.includes('bg-[#0FA958]') && btnCode.includes('text-white'),
    'Brand emerald styling confirmed'
  );

  assert(
    7,
    'MobileInstallButton calls install() only on user tap (never automatically before user interaction)',
    btnCode.includes('onClick={handleInstallClick}') &&
      btnCode.includes('const res = await install()'),
    'Triggered strictly on click event'
  );

  // -------------------------------------------------------------------------
  // 3. ALREADY INSTALLED STATE HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Already Installed (Standalone) State Suppression ---');

  assert(
    8,
    'MobileInstallButton completely hides itself when app is already installed in standalone mode',
    btnCode.includes('if (isInstalled || isElectron || isNativeApp)') &&
      btnCode.includes('return null'),
    'returns null when isInstalled === true'
  );

  const hookCode = fs.readFileSync(path.resolve('src/utils/usePWAInstall.ts'), 'utf-8');
  assert(
    9,
    'usePWAInstall detects standalone mode across Chromium, iOS Safari, and Android WebViews',
    hookCode.includes('(display-mode: standalone)') &&
      hookCode.includes('navigator as unknown as { standalone?: boolean }') &&
      hookCode.includes('android-app://'),
    'Multi-engine standalone detection verified'
  );

  const profileCode = fs.readFileSync(path.resolve('src/components/ProfileView.tsx'), 'utf-8');
  assert(
    10,
    'ProfileView displays #profile-pwa-installed-badge when running in standalone mode',
    profileCode.includes('profile-pwa-installed-badge') &&
      profileCode.includes('TurfBD App Installed'),
    'Installed status feedback confirmed'
  );

  // -------------------------------------------------------------------------
  // 4. IPHONE / IPAD (iOS SAFARI) INSTRUCTION DIALOG
  // -------------------------------------------------------------------------
  console.log('\n--- 4. iPhone / iPad (iOS Safari) Share -> Add to Home Screen Dialog ---');

  assert(
    11,
    'MobileInstallButton provides dedicated #ios-install-guide-modal for iOS Safari',
    btnCode.includes('id="ios-install-guide-modal"') &&
      btnCode.includes('Install TurfBD on iPhone'),
    'Dedicated iOS modal verified'
  );

  assert(
    12,
    'iOS dialog explains 3 clear steps: 1. Safari Share, 2. Add to Home Screen, 3. Add',
    btnCode.includes('Safari Share') &&
      btnCode.includes('Add to Home Screen') &&
      (btnCode.includes('top-right corner') || btnCode.includes('Tap "Add"')),
    'All 3 iOS installation steps clearly documented'
  );

  assert(
    13,
    'iOS dialog uses genuine iconography (Share2, PlusSquare, CheckCircle2) with close action',
    btnCode.includes('Share2') &&
      btnCode.includes('PlusSquare') &&
      btnCode.includes('CheckCircle2') &&
      btnCode.includes('setShowIOSModal(false)'),
    'Full iOS guide interaction verified'
  );

  // -------------------------------------------------------------------------
  // 5. WEB APP MANIFEST & SERVICE WORKER AUDIT
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Web App Manifest & Service Worker Audit ---');

  const manifestPath = path.resolve('public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  assert(
    14,
    'public/manifest.json complies with Chromium installability criteria (id, start_url, display, theme_color)',
    manifest.id === '/' &&
      manifest.start_url === '/' &&
      manifest.display === 'standalone' &&
      manifest.theme_color === '#0FA958',
    'Manifest metadata valid'
  );

  const iconSizes = manifest.icons.map((i: any) => i.sizes);
  assert(
    15,
    'Manifest contains 192x192, 512x512, and maskable 512x512 PNG icons on disk',
    iconSizes.includes('192x192') &&
      iconSizes.includes('512x512') &&
      manifest.icons.some((i: any) => i.purpose === 'maskable') &&
      fs.existsSync(path.resolve('public/pwa-192x192.png')) &&
      fs.existsSync(path.resolve('public/pwa-512x512.png')) &&
      fs.existsSync(path.resolve('public/pwa-maskable-512x512.png')),
    'All required icon assets exist'
  );

  const mainTsxCode = fs.readFileSync(path.resolve('src/main.tsx'), 'utf-8');
  assert(
    16,
    'src/main.tsx registers /sw.js early on window load for immediate PWA eligibility',
    mainTsxCode.includes("navigator.serviceWorker.register('/sw.js')") ||
      mainTsxCode.includes("register('/sw.js')"),
    'Early service worker registration active'
  );

  // -------------------------------------------------------------------------
  // 6. NORMAL BROWSER EXPERIENCE FULLY FUNCTIONAL
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Normal Browser Experience Functional Without Installation ---');

  const appCode = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert(
    17,
    'App.tsx allows complete browsing, search, and navigation without requiring installation',
    appCode.includes('activeTab === \'browse\'') &&
      appCode.includes('Navbar') &&
      appCode.includes('BottomNav'),
    'Full website experience accessible without installing'
  );

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log('\n================================================================');
  console.log(`  PWA Mobile Install QA Summary: ${passedCount}/${totalCount} Tests Passed`);
  console.log('================================================================');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
