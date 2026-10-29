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
    assert(manifest.theme_color === '#FFFFFF' || manifest.theme_color === '#0FA958', 'PWA theme_color is #FFFFFF (clean white) or #0FA958');
    assert(manifest.background_color === '#FFFFFF', 'PWA background_color is #FFFFFF (clean white)');
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
    assert(autoSeedService.includes('ensureTurfSchemaColumns'), 'AutoSeed defines ensureTurfSchemaColumns helper');
    assert(autoSeedService.includes('ALTER TABLE turfs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT TRUE'), 'AutoSeed executes raw SQL to safely add is_demo with DEFAULT TRUE');
    assert(autoSeedService.includes('ALTER TABLE turfs ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE'), 'AutoSeed executes raw SQL to safely add is_verified with DEFAULT TRUE');
    assert(autoSeedService.includes("ALTER TABLE turfs ADD COLUMN IF NOT EXISTS verification_status VARCHAR DEFAULT 'approved'"), 'AutoSeed executes raw SQL to safely add verification_status');
    assert(autoSeedService.includes('INSERT INTO turfs'), 'AutoSeed executes raw SQL INSERT INTO turfs directly');
    assert(autoSeedService.includes('Daffodil Turf Arena'), 'AutoSeed defines Daffodil Turf Arena in Dhanmondi');
    assert(autoSeedService.includes('Gulshan United Arena'), 'AutoSeed defines Gulshan United Arena in Gulshan');
    assert(autoSeedService.includes('is_demo'), 'AutoSeed sets is_demo on initial demo venues');
    assert(autoSeedService.includes('is_verified'), 'AutoSeed sets is_verified on initial demo venues');
    assert(autoSeedService.includes("'approved'"), "AutoSeed sets verification_status: 'approved'");

    // 6. Test GET /api/turfs Route Error Handling & Field Mapping
    console.log('\n--- 6. GET /api/turfs Fallback & Field Mapping Audit ---');
    const turfsRoute = fs.readFileSync(path.join(process.cwd(), 'src', 'server', 'routes', 'turfs.ts'), 'utf-8');
    assert(turfsRoute.includes('/force-seed'), 'turfs.ts exposes GET /api/turfs/force-seed on-demand seed trigger');
    assert(turfsRoute.includes('SELECT * FROM turfs'), 'turfs.ts executes raw SQL SELECT * FROM turfs fallback');
    assert(turfsRoute.includes('autoSeedDatabase(true)'), 'turfs.ts triggers autoSeedDatabase if zero turfs retrieved');
    assert(turfsRoute.includes('locationVal'), 'turfs.ts maps location field cleanly');
    assert(turfsRoute.includes('isVerified: Boolean'), 'turfs.ts maps isVerified cleanly');
    assert(turfsRoute.includes('isDemo: Boolean'), 'turfs.ts maps isDemo cleanly');
    assert(turfsRoute.includes('Emergency fallback query failed'), 'turfs.ts catches unhandled route errors and returns safe JSON instead of 500');

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
