import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================');
  console.log(' TurfBD App Install Button Visibility & Client Context QA Suite ');
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
  // 1. MOBILE APP HEADER: PROMINENT "INSTALL APP" BUTTON
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Mobile App Header: Prominent "Install App" Button ---');

  const mobileHeaderPath = path.resolve('src/components/MobileAppHeader.tsx');
  assert(fs.existsSync(mobileHeaderPath), 'MobileAppHeader.tsx exists');

  const mobileHeaderCode = fs.readFileSync(mobileHeaderPath, 'utf-8');
  assert(mobileHeaderCode.includes('MobileInstallButton'), 'MobileAppHeader mounts MobileInstallButton');
  assert(mobileHeaderCode.includes('mobile-city-select'), 'MobileAppHeader preserves city selector dropdown');
  assert(mobileHeaderCode.includes('NotificationBell'), 'MobileAppHeader preserves notification bell');
  assert(mobileHeaderCode.includes('mobile-header-logo-btn'), 'MobileAppHeader preserves official brand logo');

  // -------------------------------------------------------------------------
  // 2. CLIENT-SIDE RUNTIME & DISPLAY-MODE DETECTION IN usePWAInstall
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Multi-Context Detection Logic in usePWAInstall Hook ---');

  const hookPath = path.resolve('src/utils/usePWAInstall.ts');
  const hookCode = fs.readFileSync(hookPath, 'utf-8');

  assert(
    hookCode.includes("window.matchMedia('(display-mode: standalone)')") ||
    hookCode.includes('(display-mode: standalone)'),
    'Detects standalone / PWA installed display mode'
  );
  assert(
    hookCode.includes('turfbdDesktop') && hookCode.includes('electron'),
    'Detects Windows Electron desktop runtime via window.turfbdDesktop and userAgent'
  );
  assert(
    hookCode.includes('ReactNativeWebView') && hookCode.includes('Capacitor'),
    'Detects native mobile app runtime wrappers (ReactNativeWebView, Capacitor)'
  );
  assert(
    hookCode.includes('canShowInstallPrompt'),
    'Exposes canShowInstallPrompt boolean gate'
  );
  assert(
    hookCode.includes('!isInstalled') &&
    hookCode.includes('!isElectron') &&
    hookCode.includes('!isNativeApp'),
    'canShowInstallPrompt enforces not installed, not Electron, and not native app'
  );

  // -------------------------------------------------------------------------
  // 3. CONDITIONAL RENDERING IN PWAInstallBanner COMPONENT
  // -------------------------------------------------------------------------
  console.log('\n--- 3. PWAInstallBanner Conditional Rendering Gate ---');

  const bannerPath = path.resolve('src/components/PWAInstallBanner.tsx');
  const bannerCode = fs.readFileSync(bannerPath, 'utf-8');

  assert(
    bannerCode.includes('if (!canShowInstallPrompt)') && bannerCode.includes('return null'),
    'PWAInstallBanner immediately returns null when canShowInstallPrompt is false (proper conditional rendering)'
  );
  assert(
    !bannerCode.includes('window.alert') && !bannerCode.includes('window.open'),
    'PWAInstallBanner does not use window.alert or window.open'
  );

  // -------------------------------------------------------------------------
  // 4. MOBILE VIEWS & MODALS: NO UNWANTED INSTALL PROMPTS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Mobile Views & Modals Isolation ---');

  const profilePath = path.resolve('src/components/ProfileView.tsx');
  const profileCode = fs.readFileSync(profilePath, 'utf-8');

  assert(
    profileCode.includes('{canShowInstallPrompt && (') && profileCode.includes('profile-install-pwa-btn'),
    'ProfileView strictly wraps profile-install-pwa-btn in canShowInstallPrompt conditional rendering'
  );
  assert(
    profileCode.includes('{isPWAGuideOpen && canShowInstallPrompt && ('),
    'ProfileView strictly guards PWAInstallGuideModal with canShowInstallPrompt'
  );

  const bottomNavPath = path.resolve('src/components/BottomNav.tsx');
  const bottomNavCode = fs.readFileSync(bottomNavPath, 'utf-8');
  assert(!bottomNavCode.includes('install') && !bottomNavCode.includes('PWA'), 'BottomNav contains no PWA install CTA');

  // -------------------------------------------------------------------------
  // 5. DESKTOP NAVBAR & WINDOWS APP SEPARATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Desktop Navbar & Windows App Separation ---');

  const navbarPath = path.resolve('src/components/Navbar.tsx');
  const navbarCode = fs.readFileSync(navbarPath, 'utf-8');

  assert(
    navbarCode.includes('PWAInstallBanner'),
    'Desktop Navbar mounts PWAInstallBanner (which self-gates to canShowInstallPrompt)'
  );
  assert(
    navbarCode.includes('nav-desktop-app-btn'),
    'Desktop Navbar provides separate Windows Desktop App button'
  );
  assert(
    navbarCode.includes('{!isElectron && (') && navbarCode.includes('nav-desktop-app-btn'),
    'Desktop Navbar hides Windows App download button when already inside Electron desktop client'
  );

  // -------------------------------------------------------------------------
  // 6. WINDOWS DESKTOP INSTALLER INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Windows Desktop Installer Integrity ---');

  const setupExePath = path.resolve('public/downloads/TurfBD-Setup.exe');
  assert(fs.existsSync(setupExePath), 'public/downloads/TurfBD-Setup.exe exists on disk');

  const desktopModalPath = path.resolve('src/components/DesktopAppModal.tsx');
  const desktopModalCode = fs.readFileSync(desktopModalPath, 'utf-8');
  assert(desktopModalCode.includes('/downloads/TurfBD-Setup.exe'), 'DesktopAppModal links directly to TurfBD-Setup.exe');
  assert(!desktopModalCode.includes('play.google.com'), 'DesktopAppModal has no fake Google Play Store links');

  console.log('\n================================================================');
  console.log(`QA Verification Summary: ${passed} passed, ${failed} failed of ${passed + failed} tests`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
