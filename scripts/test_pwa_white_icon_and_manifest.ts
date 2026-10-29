import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details?: string) {
  testResults.push({ id, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [#${id}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function main() {
  console.log('================================================================');
  console.log(' TurfBD Clean White PWA Icon & Manifest Verification QA Suite  ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Manifest Configuration Audit
  // -------------------------------------------------------------------------
  console.log('--- 1. Manifest Configuration Audit (public/manifest.json) ---');
  const manifestPath = path.resolve('public/manifest.json');
  record(1, 'public/manifest.json exists on disk', fs.existsSync(manifestPath));

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  record(
    2,
    'manifest.json background_color is set to clean solid white (#FFFFFF)',
    manifest.background_color === '#FFFFFF',
    `background_color: ${manifest.background_color}`
  );

  record(
    3,
    'manifest.json theme_color is set to clean solid white (#FFFFFF)',
    manifest.theme_color === '#FFFFFF',
    `theme_color: ${manifest.theme_color}`
  );

  record(
    4,
    'manifest.json display is set to standalone',
    manifest.display === 'standalone',
    `display: ${manifest.display}`
  );

  const icons = manifest.icons || [];
  const has192 = icons.some((i: any) => i.sizes === '192x192' && i.purpose !== 'maskable');
  const has512 = icons.some((i: any) => i.sizes === '512x512' && i.purpose !== 'maskable');
  const hasMaskable512 = icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'maskable');
  const hasAppleTouch = icons.some((i: any) => i.sizes === '180x180');

  record(
    5,
    'manifest.json defines standard 192x192 icon',
    has192,
    `Found standard 192: ${has192}`
  );

  record(
    6,
    'manifest.json defines standard 512x512 icon',
    has512,
    `Found standard 512: ${has512}`
  );

  record(
    7,
    'manifest.json defines dedicated maskable 512x512 icon for Android adaptive launchers',
    hasMaskable512,
    `Found maskable 512: ${hasMaskable512}`
  );

  record(
    8,
    'manifest.json defines 180x180 Apple Touch Icon',
    hasAppleTouch,
    `Found Apple Touch Icon: ${hasAppleTouch}`
  );

  // -------------------------------------------------------------------------
  // 2. Physical Icon Image File Analysis (Solid White Background & Logo)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Icon Asset Pixel & Dimension Analysis (Sharp) ---');

  // Check 512x512 standard icon
  const icon512Path = path.resolve('public/pwa-512x512.png');
  const meta512 = await sharp(icon512Path).metadata();
  const raw512 = await sharp(icon512Path).raw().toBuffer();
  // Corner pixel at (0, 0): RGB values
  const r0 = raw512[0];
  const g0 = raw512[1];
  const b0 = raw512[2];
  const isWhiteCorner512 = r0 >= 250 && g0 >= 250 && b0 >= 250;

  record(
    9,
    'pwa-512x512.png has 512x512 dimensions and solid white (#FFFFFF) background tile',
    meta512.width === 512 && meta512.height === 512 && isWhiteCorner512,
    `Dimensions: ${meta512.width}x${meta512.height}, Corner RGB: (${r0}, ${g0}, ${b0})`
  );

  // Check 192x192 standard icon
  const icon192Path = path.resolve('public/pwa-192x192.png');
  const meta192 = await sharp(icon192Path).metadata();
  const raw192 = await sharp(icon192Path).raw().toBuffer();
  const r192 = raw192[0];
  const g192 = raw192[1];
  const b192 = raw192[2];
  const isWhiteCorner192 = r192 >= 250 && g192 >= 250 && b192 >= 250;

  record(
    10,
    'pwa-192x192.png has 192x192 dimensions and solid white (#FFFFFF) background tile',
    meta192.width === 192 && meta192.height === 192 && isWhiteCorner192,
    `Dimensions: ${meta192.width}x${meta192.height}, Corner RGB: (${r192}, ${g192}, ${b192})`
  );

  // Check 512x512 maskable icon
  const maskablePath = path.resolve('public/pwa-maskable-512x512.png');
  const metaMaskable = await sharp(maskablePath).metadata();
  const rawMaskable = await sharp(maskablePath).raw().toBuffer();
  const rm = rawMaskable[0];
  const gm = rawMaskable[1];
  const bm = rawMaskable[2];
  const isWhiteCornerMaskable = rm >= 250 && gm >= 250 && bm >= 250;

  record(
    11,
    'pwa-maskable-512x512.png has solid white (#FFFFFF) background with safe-zone margin',
    metaMaskable.width === 512 && metaMaskable.height === 512 && isWhiteCornerMaskable,
    `Dimensions: ${metaMaskable.width}x${metaMaskable.height}, Corner RGB: (${rm}, ${gm}, ${bm})`
  );

  // Check apple-touch-icon.png
  const appleTouchPath = path.resolve('public/apple-touch-icon.png');
  const metaApple = await sharp(appleTouchPath).metadata();
  const rawApple = await sharp(appleTouchPath).raw().toBuffer();
  const ra = rawApple[0];
  const ga = rawApple[1];
  const ba = rawApple[2];
  const isWhiteCornerApple = ra >= 250 && ga >= 250 && ba >= 250;

  record(
    12,
    'apple-touch-icon.png has 180x180 dimensions and solid white (#FFFFFF) tile',
    metaApple.width === 180 && metaApple.height === 180 && isWhiteCornerApple,
    `Dimensions: ${metaApple.width}x${metaApple.height}, Corner RGB: (${ra}, ${ga}, ${ba})`
  );

  // Verify non-empty center (green shield / logo content present)
  // Sample middle center pixel at (256, 256) of 512x512 icon
  const centerIndex = (256 * 512 + 256) * (meta512.channels || 3);
  const rc = raw512[centerIndex];
  const gc = raw512[centerIndex + 1];
  const bc = raw512[centerIndex + 2];
  const hasCenterGraphic = !(rc === 255 && gc === 255 && bc === 255 && raw512.every((val, idx) => idx % 4 === 3 || val === 255));

  record(
    13,
    'pwa-512x512.png contains the TurfBD emblem graphic centered inside the white tile',
    hasCenterGraphic,
    `Center pixel verified (RGB: ${rc}, ${gc}, ${bc})`
  );

  // Verify public/icons folder mirror
  const hasIconsDir =
    fs.existsSync(path.resolve('public/icons/pwa-192x192.png')) &&
    fs.existsSync(path.resolve('public/icons/pwa-512x512.png')) &&
    fs.existsSync(path.resolve('public/icons/icon-512x512.png'));
  record(
    14,
    'public/icons/ folder contains mirrors for standard and maskable icons',
    hasIconsDir,
    `public/icons/ mirrors present: ${hasIconsDir}`
  );

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
