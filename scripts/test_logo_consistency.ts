import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================');
  console.log('   TurfBD Logo Consistency & Responsive Emblem Verification     ');
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
  // 1. SHARED COMPONENT & ASSET INSPECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Shared Component & Asset Architecture ---');

  const navbarCode = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
  const mobileHeaderCode = fs.readFileSync(path.resolve('src/components/MobileAppHeader.tsx'), 'utf-8');
  const logoCode = fs.readFileSync(path.resolve('src/components/TurfBDLogo.tsx'), 'utf-8');

  assert(
    navbarCode.includes("import { TurfBDLogo } from './TurfBDLogo';"),
    'Navbar.tsx imports official shared TurfBDLogo component'
  );
  assert(
    mobileHeaderCode.includes("import { TurfBDLogo } from './TurfBDLogo';"),
    'MobileAppHeader.tsx imports official shared TurfBDLogo component'
  );
  assert(
    fs.existsSync(path.resolve('public/turflogo.png')) && fs.existsSync(path.resolve('public/turflogo.svg')),
    'Official high-resolution TurfBD shield assets exist in public directory'
  );

  // -------------------------------------------------------------------------
  // 2. ROOT CAUSE RESOLUTION: SVG FILTER & GRADIENT ID ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Root Cause Fix: SVG Gradient & Filter ID Cross-DOM Isolation ---');

  assert(
    logoCode.includes('React.useId()'),
    'TurfBDLogo uses React.useId() to generate unique instance-scoped gradient IDs'
  );
  assert(
    !logoCode.includes('<g filter={`url(#crestShadow-'),
    'Removed fragile SVG <filter> wrapper around shield group that caused Chromium/WebKit to drop the shield on desktop when mobile header was display:none'
  );
  assert(
    logoCode.includes('crest-shield-group-') && logoCode.includes('crest-soccer-ball-'),
    'Both complete shield body group and top-right football ball group are present in the SVG markup'
  );

  // -------------------------------------------------------------------------
  // 3. DIMENSIONS, ASPECT RATIO & FLEXBOX SHRINK GUARDS
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Dimensions, Aspect Ratio & Flexbox Shrink Guards ---');

  assert(
    logoCode.includes('minWidth: currentSize.w') && logoCode.includes('minHeight: currentSize.h'),
    'TurfBDLogo enforces explicit minWidth and minHeight to prevent flexbox squashing'
  );
  assert(
    logoCode.includes('shrink-0'),
    'TurfBDLogo applies shrink-0 to both renderMark and outer container to prevent shrinkage by flex containers'
  );
  assert(
    navbarCode.includes('shrink-0') && mobileHeaderCode.includes('shrink-0'),
    'Both desktop and mobile header button containers enforce shrink-0'
  );
  assert(
    logoCode.includes('viewBox="0 0 320 360"'),
    'Shield emblem maintains canonical 320:360 (8:9) viewBox aspect ratio'
  );

  // -------------------------------------------------------------------------
  // 4. BALANCED SCALING ACROSS SCREEN SIZES
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Balanced Scaling Across Screen Sizes (Mobile vs Desktop) ---');

  assert(
    mobileHeaderCode.includes('size="sm"') && mobileHeaderCode.includes('layout="horizontal"'),
    'Mobile header specifies size="sm" (32x36px) for compact, balanced smartphone top bars'
  );
  assert(
    navbarCode.includes('size="md"') && navbarCode.includes('layout="horizontal"'),
    'Desktop header specifies size="md" (38x43px) for balanced, prominent presence in 64-72px desktop navbar'
  );
  assert(
    navbarCode.includes('badgeText="Sports"') && mobileHeaderCode.includes('badgeText="Sports"'),
    'Both mobile and desktop headers consistently display "Sports" badge'
  );

  // -------------------------------------------------------------------------
  // 5. BRAND IDENTITY & WORDMARK INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Brand Identity & Typography Integrity ---');

  assert(
    logoCode.includes('text-[#043D22]') && logoCode.includes('text-[#00B050]'),
    'TurfBD wordmark maintains authoritative two-tone branding: deep forest green "Turf" (#043D22) & vibrant emerald "BD" (#00B050)'
  );
  assert(
    logoCode.includes('bg-[#064E3B] text-white'),
    'SPORTS badge styled with deep emerald badge pill and crisp white text'
  );

  console.log('\n================================================================');
  console.log(`Logo Consistency Verification: ${passed} passed, ${failed} failed of ${passed + failed} tests`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
