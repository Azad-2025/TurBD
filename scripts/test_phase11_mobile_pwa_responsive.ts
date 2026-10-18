import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================');
  console.log('   TurfBD Phase 11 — Mobile PWA, Responsive QA & Cross-Device   ');
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
  // 1. WEB APP MANIFEST & PWA STANDARDS
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Web App Manifest & Browser Installability Standards ---');

  const manifestPath = path.resolve('public/manifest.json');
  assert(fs.existsSync(manifestPath), 'public/manifest.json exists');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifest.name === 'TurfBD', 'Manifest name is "TurfBD"', manifest.name);
  assert(manifest.short_name === 'TurfBD' && manifest.short_name.length <= 12, 'Manifest short_name is <= 12 chars', manifest.short_name);
  assert(manifest.id === '/', 'Manifest id is "/"', manifest.id);
  assert(manifest.start_url === '/', 'Manifest start_url is "/"', manifest.start_url);
  assert(manifest.scope === '/', 'Manifest scope is "/"', manifest.scope);
  assert(manifest.display === 'standalone', 'Manifest display is "standalone"', manifest.display);
  assert(manifest.theme_color === '#0FA958', 'Manifest theme_color matches TurfBD brand emerald', manifest.theme_color);

  // Icon checks
  const iconSources = manifest.icons.map((i: any) => i.src);
  const iconSizes = manifest.icons.map((i: any) => i.sizes);
  const has192 = iconSizes.includes('192x192');
  const has512 = iconSizes.includes('512x512');
  const hasMaskable = manifest.icons.some((i: any) => i.purpose === 'maskable');

  assert(has192, 'Manifest specifies 192x192 icon');
  assert(has512, 'Manifest specifies 512x512 icon');
  assert(hasMaskable, 'Manifest specifies dedicated maskable icon');

  manifest.icons.forEach((icon: any) => {
    const iconFilePath = path.resolve('public', icon.src.replace(/^\//, ''));
    assert(fs.existsSync(iconFilePath), `Physical asset exists for ${icon.src}`);
  });

  // -------------------------------------------------------------------------
  // 2. HTTPS-COMPATIBLE SERVICE WORKER & OFFLINE CACHING
  // -------------------------------------------------------------------------
  console.log('\n--- 2. HTTPS-Compatible Service Worker & Offline Caching ---');

  const swPath = path.resolve('public/sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js exists');

  const swCode = fs.readFileSync(swPath, 'utf-8');
  assert(swCode.includes('PRECACHE_ASSETS'), 'Service worker defines PRECACHE_ASSETS list');
  assert(swCode.includes('/manifest.json') && swCode.includes('/turflogo.png'), 'Service worker precaches manifest and brand logo');
  assert(swCode.includes('caches.match'), 'Service worker implements cache matching for offline fallback');
  assert(swCode.includes('navigate'), 'Service worker intercepts navigation requests for seamless offline resilience');

  // -------------------------------------------------------------------------
  // 3. HTML ENTRY POINT & MOBILE VIEWPORT HEAD META
  // -------------------------------------------------------------------------
  console.log('\n--- 3. HTML Entry Point & Mobile Viewport Meta Tags ---');

  const htmlPath = path.resolve('index.html');
  const htmlCode = fs.readFileSync(htmlPath, 'utf-8');

  assert(htmlCode.includes('<meta name="viewport" content="width=device-width'), 'index.html includes mobile viewport tag');
  assert(htmlCode.includes('<link rel="manifest" href="/manifest.json" />'), 'index.html links to manifest.json');
  assert(htmlCode.includes('<meta name="theme-color" content="#0FA958" />'), 'index.html specifies theme-color meta tag');
  assert(htmlCode.includes('<meta name="apple-mobile-web-app-capable" content="yes" />'), 'index.html specifies apple-mobile-web-app-capable for iOS fullscreen');
  assert(htmlCode.includes('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />'), 'index.html links apple-touch-icon pointing to PNG asset');

  // -------------------------------------------------------------------------
  // 4. IN-APP INSTALL PROMPT UI & MULTI-DEVICE GUIDANCE
  // -------------------------------------------------------------------------
  console.log('\n--- 4. In-App Install Prompt UI & Multi-Device Guidance ---');

  const hookCode = fs.readFileSync(path.resolve('src/utils/usePWAInstall.ts'), 'utf-8');
  assert(hookCode.includes('beforeinstallprompt'), 'usePWAInstall listens to beforeinstallprompt event');
  assert(hookCode.includes('isStandalone') && hookCode.includes('(display-mode: standalone)'), 'usePWAInstall detects standalone mode');
  assert(hookCode.includes('isIOS') && hookCode.includes('isAndroid') && hookCode.includes('isDesktop'), 'usePWAInstall detects iOS, Android, and Desktop platforms');

  const guideModalCode = fs.readFileSync(path.resolve('src/components/PWAInstallGuideModal.tsx'), 'utf-8');
  assert(guideModalCode.includes('Install TurfBD on iPhone') || guideModalCode.includes('iPhone / iPad'), 'PWAInstallGuideModal contains iOS Safari Add to Home Screen instructions');
  assert(guideModalCode.includes('Android') && guideModalCode.includes('Add to Home screen'), 'PWAInstallGuideModal contains Android browser installation steps');
  assert(guideModalCode.includes('Desktop') && guideModalCode.includes('Install TurfBD'), 'PWAInstallGuideModal contains Desktop browser installation steps');
  assert(guideModalCode.includes('Browser Note:') || guideModalCode.includes('Google Chrome'), 'PWAInstallGuideModal provides graceful guidance for unsupported browsers/webviews');

  const bannerCode = fs.readFileSync(path.resolve('src/components/PWAInstallBanner.tsx'), 'utf-8');
  assert(bannerCode.includes('PWAInstallGuideModal'), 'PWAInstallBanner wires up multi-platform PWAInstallGuideModal');
  assert(bannerCode.includes('pwa-compact-install-btn'), 'PWAInstallBanner supports compact button mode');

  const mobileHeaderCode = fs.readFileSync(path.resolve('src/components/MobileAppHeader.tsx'), 'utf-8');
  assert(!mobileHeaderCode.includes('<PWAInstallBanner'), 'MobileAppHeader does NOT mount PWA install button in smartphone top bar (clean mobile header)');

  const profileCode = fs.readFileSync(path.resolve('src/components/ProfileView.tsx'), 'utf-8');
  assert(profileCode.includes('{canShowInstallPrompt && (') && profileCode.includes('profile-install-pwa-btn'), 'ProfileView strictly guards PWA installation entry with canShowInstallPrompt (hidden on mobile)');

  // -------------------------------------------------------------------------
  // 5. HONEST APPLICATION DISTRIBUTION (ZERO FAKE APKS / PLAY STORE CLAIMS)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Application Distribution Integrity (No Fake APKs / Store Claims) ---');

  const desktopModalCode = fs.readFileSync(path.resolve('src/components/DesktopAppModal.tsx'), 'utf-8');
  assert(
    !desktopModalCode.toLowerCase().includes('play.google.com') && !desktopModalCode.toLowerCase().includes('download apk'),
    'DesktopAppModal does NOT contain fake Play Store or fake APK links'
  );
  assert(
    desktopModalCode.includes('TurfBD-Setup.exe'),
    'DesktopAppModal provides authentic Windows desktop setup installer'
  );
  assert(
    fs.existsSync(path.resolve('public/downloads/TurfBD-Setup.exe')),
    'Physical release package TurfBD-Setup.exe exists in public/downloads/'
  );

  // -------------------------------------------------------------------------
  // 6. REDESIGNED DESKTOP NAVBAR & BRANDING VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Redesigned Desktop Navbar & Branding Verification ---');

  const navbarCode = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
  assert(navbarCode.includes('TurfBDLogo'), 'Navbar displays official shared TurfBDLogo');
  assert(navbarCode.includes('badgeText="Sports"'), 'Navbar displays SPORTS badge alongside TurfBD wordmark');
  assert(navbarCode.includes('id="header-city-select"'), 'Navbar includes location selector dropdown');
  assert(navbarCode.includes('id="desktop-centered-nav"'), 'Navbar includes centered rounded desktop navigation menu');
  assert(navbarCode.includes('NotificationBell'), 'Navbar includes real-time notifications bell');
  assert(navbarCode.includes('id="header-signin-btn"') && navbarCode.includes('id="header-register-btn"'), 'Navbar provides Sign In and Register actions when logged out');
  assert(navbarCode.includes('id="nav-profile-btn"') && navbarCode.includes('id="nav-logout-btn"'), 'Navbar provides Profile and Logout actions when logged in');

  // -------------------------------------------------------------------------
  // 7. RESPONSIVE CUSTOMER MOBILE EXPERIENCE COMPONENTS
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Responsive Customer Mobile Experience Components ---');

  const bottomNavCode = fs.readFileSync(path.resolve('src/components/BottomNav.tsx'), 'utf-8');
  assert(bottomNavCode.includes('mobile-nav-home-btn') && bottomNavCode.includes('mobile-nav-explore-btn') && bottomNavCode.includes('mobile-nav-bookings-btn') && bottomNavCode.includes('mobile-nav-profile-btn'), 'BottomNav provides all 4 primary customer mobile navigation tabs');

  const bookingModalCode = fs.readFileSync(path.resolve('src/components/BookingModal.tsx'), 'utf-8');
  assert(bookingModalCode.includes('rounded-t-3xl sm:rounded-3xl') || bookingModalCode.includes('max-h-[92vh]'), 'BookingModal uses mobile sheet layout with comfortable viewport sizing');

  const passModalCode = fs.readFileSync(path.resolve('src/components/BookingDetailsModal.tsx'), 'utf-8');
  assert(passModalCode.includes('Gate Match Pass') && passModalCode.includes('svg') && passModalCode.includes('bookingCode'), 'BookingDetailsModal renders authentic Gate Match Pass with QR code and booking code');

  console.log('\n================================================================');
  console.log(`Phase 11 QA Verification Summary: ${passed} passed, ${failed} failed of ${passed + failed} tests`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
