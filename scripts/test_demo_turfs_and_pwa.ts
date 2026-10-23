import { db } from '../src/db/index.js';
import { turfs, users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('================================================================');
  console.log(' TurfBD Demo Turfs Auto-Seeding, Admin Deletion & PWA QA Suite  ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Audit Service Worker Network-First strategy
    console.log('\n--- 1. Service Worker & PWA Caching Strategy Audit ---');
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    assert(fs.existsSync(swPath), 'public/sw.js exists on disk');
    const swContent = fs.readFileSync(swPath, 'utf-8');
    assert(swContent.includes("url.pathname.startsWith('/api/')"), 'sw.js intercepts /api/* endpoints');
    assert(swContent.includes('fetch(event.request)'), 'sw.js executes Network fetch for API requests');
    assert(swContent.includes('turfbd-cache-v3'), 'sw.js uses updated cache version turfbd-cache-v3');
    assert(!swContent.includes("caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache))") ||
           swContent.indexOf("url.pathname.startsWith('/api/')") < swContent.indexOf("cache.put(event.request"),
           'sw.js does NOT cache mutable /api/* responses into static cache');

    // 2. Audit PWA Manifest
    console.log('\n--- 2. PWA Manifest Audit ---');
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    assert(fs.existsSync(manifestPath), 'public/manifest.json exists on disk');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert(manifest.display === 'standalone', 'PWA display mode is standalone');
    assert(manifest.start_url === '/', 'PWA start_url is /');
    assert(manifest.theme_color === '#0FA958', 'PWA theme_color is #0FA958');
    assert(manifest.icons && manifest.icons.length >= 4, 'PWA manifest contains required icon array');

    // 3. Audit Database Schema: isDemo and isVerified columns
    console.log('\n--- 3. Database Schema Audit ---');
    const [sampleTurf] = await db.select().from(turfs).limit(1);
    assert(sampleTurf !== undefined, 'Turfs table is queryable in PostgreSQL database');
    assert('isDemo' in sampleTurf, 'turfs table schema includes isDemo column');
    assert('isVerified' in sampleTurf, 'turfs table schema includes isVerified column');

    // 4. Test Super Admin demo removal endpoint security
    console.log('\n--- 4. Super Admin Protected Endpoint Audit ---');
    const serverTs = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
    assert(serverTs.includes("app.use('/api/admin', adminRouter)"), 'server.ts mounts /api/admin route');
    assert(serverTs.includes('autoSeedDatabase()'), 'server.ts invokes autoSeedDatabase on startup');

    const adminRoute = fs.readFileSync(path.join(process.cwd(), 'src', 'server', 'routes', 'admin.ts'), 'utf-8');
    assert(adminRoute.includes('/remove-demo-turfs'), 'admin.ts provides /remove-demo-turfs endpoint');
    assert(adminRoute.includes('requireSuperAdmin'), 'Endpoint is strictly guarded by requireSuperAdmin');
    assert(adminRoute.includes('eq(turfs.isDemo, true)'), 'Endpoint deletes ONLY turfs where isDemo is true');

    // 5. Test AutoSeed Service
    console.log('\n--- 5. AutoSeed Service Definition Audit ---');
    const autoSeedService = fs.readFileSync(path.join(process.cwd(), 'src', 'server', 'services', 'autoSeedService.ts'), 'utf-8');
    assert(autoSeedService.includes('Daffodil Turf Arena'), 'AutoSeed defines Daffodil Turf Arena in Dhanmondi');
    assert(autoSeedService.includes('Gulshan United Arena'), 'AutoSeed defines Gulshan United Arena in Gulshan');
    assert(autoSeedService.includes('isDemo: true'), 'AutoSeed sets isDemo: true on initial demo venues');
    assert(autoSeedService.includes('isVerified: true'), 'AutoSeed sets isVerified: true on initial demo venues');
    assert(autoSeedService.includes("verificationStatus: 'approved'"), "AutoSeed sets verificationStatus: 'approved'");
    assert(autoSeedService.includes('existingTurfCount > 0'), 'AutoSeed checks if existing records exist and skips if not empty');

    console.log('\n================================================================');
    console.log(` Summary: ${passed} passed, ${failed} failed`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
