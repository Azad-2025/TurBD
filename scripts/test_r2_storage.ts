import {
  isR2Configured,
  getR2Client,
  processAndSaveImage,
  deleteR2Object,
  validateImageMagicBytes,
  validateDocumentMagicBytes,
  StorageConfigurationError,
  StorageUpstreamError,
  _resetStorageClientsForTesting,
  _setR2ClientForTesting,
} from '../src/server/utils/storage.ts';
import sharp from 'sharp';
import { S3Client } from '@aws-sdk/client-s3';
import { db } from '../src/db/index.ts';
import { users, turfs } from '../src/db/schema.ts';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details?: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [#${id}] ${name}${details ? ` -> ${details}` : ''}`);
}

async function runStorageTests() {
  console.log('================================================================');
  console.log('  TurfBD: Cloudflare R2 Storage Adapter & Safety Audit Tests    ');
  console.log('================================================================\n');

  // Save initial env to restore at end
  const savedEnv = { ...process.env };

  try {
    // -------------------------------------------------------------
    // TEST 1: isR2Configured accurately detects presence/absence
    // -------------------------------------------------------------
    {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_PUBLIC_BASE_URL;
      _resetStorageClientsForTesting();

      const unconfigured = isR2Configured();

      process.env.R2_ACCOUNT_ID = 'test_acc_123';
      process.env.R2_ACCESS_KEY_ID = 'test_key_abc';
      process.env.R2_SECRET_ACCESS_KEY = 'test_secret_xyz';
      process.env.R2_BUCKET_NAME = 'turfbd-gallery';
      process.env.R2_PUBLIC_BASE_URL = 'https://images.turfbd.com';
      _resetStorageClientsForTesting();

      const configured = isR2Configured();

      record(
        1,
        'isR2Configured correctly validates presence of all 5 required environment variables',
        !unconfigured && configured,
        `Unconfigured: ${unconfigured}, Fully Configured: ${configured}`
      );
    }

    // -------------------------------------------------------------
    // TEST 2: Cloudflare R2 S3Client configuration & auto region
    // -------------------------------------------------------------
    {
      process.env.R2_ACCOUNT_ID = 'cloudflare_acc_987';
      process.env.R2_ACCESS_KEY_ID = 'access_key_test';
      process.env.R2_SECRET_ACCESS_KEY = 'secret_key_test';
      process.env.R2_BUCKET_NAME = 'turf-photos';
      process.env.R2_PUBLIC_BASE_URL = 'https://photos.turfbd.com';
      _resetStorageClientsForTesting();

      const client = getR2Client();
      record(
        2,
        'getR2Client initializes S3Client with S3-compatible R2 endpoint and auto region',
        client !== null && client instanceof S3Client,
        `Client initialized: ${Boolean(client)}`
      );
    }

    // -------------------------------------------------------------
    // TEST 3: Strict Production Guard - No Silent Fallback When Unconfigured
    // -------------------------------------------------------------
    {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_PUBLIC_BASE_URL;
      delete process.env.GCS_BUCKET_NAME;
      process.env.NODE_ENV = 'production';
      _resetStorageClientsForTesting();

      // Create valid 100x100 test JPEG buffer
      const testBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 15, g: 169, b: 88 },
        },
      })
        .jpeg()
        .toBuffer();

      let caughtError: any = null;
      try {
        await processAndSaveImage(testBuffer, 'test_field.jpg', 'gallery');
      } catch (err: any) {
        caughtError = err;
      }

      const isConfigError =
        caughtError instanceof StorageConfigurationError &&
        caughtError.statusCode === 503;

      record(
        3,
        'Production blocks silent fallback to local disk when R2 is unconfigured (503 StorageConfigurationError)',
        isConfigError,
        `Error: ${caughtError?.name}, Status: ${caughtError?.statusCode}, Code: ${caughtError?.code}`
      );
    }

    // -------------------------------------------------------------
    // TEST 4: Strict Production Guard - Upstream Upload Failure Throws 502
    // -------------------------------------------------------------
    {
      process.env.NODE_ENV = 'production';
      process.env.R2_ACCOUNT_ID = 'test_acc';
      process.env.R2_ACCESS_KEY_ID = 'test_key';
      process.env.R2_SECRET_ACCESS_KEY = 'test_secret';
      process.env.R2_BUCKET_NAME = 'test_bucket';
      process.env.R2_PUBLIC_BASE_URL = 'https://images.turfbd.com';

      // Mock S3 client that rejects send() with network/storage failure
      const mockFailingS3Client = {
        send: async () => {
          throw new Error('Connection refused by upstream R2 endpoint');
        },
      } as unknown as S3Client;

      _setR2ClientForTesting(mockFailingS3Client);

      const testBuffer = await sharp({
        create: {
          width: 80,
          height: 80,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      let upstreamError: any = null;
      try {
        await processAndSaveImage(testBuffer, 'arena.png', 'gallery');
      } catch (err: any) {
        upstreamError = err;
      }

      const is502 =
        upstreamError instanceof StorageUpstreamError &&
        upstreamError.statusCode === 502;

      record(
        4,
        'Production prevents disk fallback on upstream R2 network/auth failure (502 StorageUpstreamError)',
        is502,
        `Error: ${upstreamError?.name}, Status: ${upstreamError?.statusCode}`
      );
    }

    // -------------------------------------------------------------
    // TEST 5: Successful R2 mock upload converts to WebP and returns public URL
    // -------------------------------------------------------------
    {
      process.env.NODE_ENV = 'production';
      process.env.R2_ACCOUNT_ID = 'test_acc';
      process.env.R2_ACCESS_KEY_ID = 'test_key';
      process.env.R2_SECRET_ACCESS_KEY = 'test_secret';
      process.env.R2_BUCKET_NAME = 'turf-gallery';
      process.env.R2_PUBLIC_BASE_URL = 'https://images.turfbd.com';

      const uploadedCommands: any[] = [];
      const mockSuccessClient = {
        send: async (cmd: any) => {
          uploadedCommands.push(cmd);
          return { $metadata: { httpStatusCode: 200 } };
        },
      } as unknown as S3Client;

      _setR2ClientForTesting(mockSuccessClient);

      const testBuffer = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 3,
          background: { r: 255, g: 100, b: 50 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await processAndSaveImage(testBuffer, 'pitch_sunset.jpg', 'gallery');

      const isWebp = result.fileType === 'image/webp' && result.fileName.endsWith('.webp');
      const hasR2Url = result.imageUrl.startsWith('https://images.turfbd.com/turfs/');
      const hasThumb = Boolean(result.thumbnailUrl?.includes('_thumb.webp'));
      const sentTwoObjects = uploadedCommands.length === 2; // main + thumb

      record(
        5,
        'R2 upload pipeline generates WebP main + thumbnail and returns stable public R2 URLs',
        isWebp && hasR2Url && hasThumb && sentTwoObjects && result.storageType === 'r2',
        `Main: ${result.imageUrl}, Storage: ${result.storageType}, Objects: ${uploadedCommands.length}`
      );
    }

    // -------------------------------------------------------------
    // TEST 6: File Magic Bytes Security Validation
    // -------------------------------------------------------------
    {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const maliciousScript = Buffer.from('<?php echo "malware"; ?>', 'utf-8');

      const jpegValid = validateImageMagicBytes(jpegHeader);
      const pngValid = validateImageMagicBytes(pngHeader);
      const scriptBlocked = !validateImageMagicBytes(maliciousScript);

      record(
        6,
        'validateImageMagicBytes validates genuine image headers and blocks disguised scripts',
        jpegValid && pngValid && scriptBlocked,
        `JPEG: ${jpegValid}, PNG: ${pngValid}, Disguised script blocked: ${scriptBlocked}`
      );
    }

    // -------------------------------------------------------------
    // TEST 7: Strict Privacy Separation - Private NID/Trade License Documents
    // -------------------------------------------------------------
    {
      process.env.NODE_ENV = 'production';
      const fakeImage = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 10, g: 10, b: 10 } },
      })
        .jpeg()
        .toBuffer();

      let nidBlocked = false;
      let tradeLicenseBlocked = false;

      try {
        await processAndSaveImage(fakeImage, 'owner_nid.jpg', 'nid');
      } catch (err: any) {
        nidBlocked = err.message.includes('Private verification documents');
      }

      try {
        await processAndSaveImage(fakeImage, 'trade_license.jpg', 'trade_license');
      } catch (err: any) {
        tradeLicenseBlocked = err.message.includes('Private verification documents');
      }

      record(
        7,
        'Private verification documents (NID, trade license) are strictly blocked from public image storage',
        nidBlocked && tradeLicenseBlocked,
        `NID blocked: ${nidBlocked}, Trade license blocked: ${tradeLicenseBlocked}`
      );
    }

    // -------------------------------------------------------------
    // TEST 8: deleteR2Object ignores non-R2 external URLs (safe cleanup)
    // -------------------------------------------------------------
    {
      process.env.R2_PUBLIC_BASE_URL = 'https://images.turfbd.com';
      const unsplashUrl = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018';
      const skippedUnsplash = (await deleteR2Object(unsplashUrl)) === false;

      record(
        8,
        'deleteR2Object safely ignores external URLs (Unsplash/CDNs) and avoids deleting non-R2 assets',
        skippedUnsplash,
        `External Unsplash URL delete skipped: ${skippedUnsplash}`
      );
    }

    // -------------------------------------------------------------
    // TEST 9: Full HTTP Gallery API Workflow (Add, Set Cover, Reorder, Delete)
    // -------------------------------------------------------------
    {
      const ts = Date.now();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      const ownerEmail = `owner_r2_${ts}@turfbd.com`;
      const [owner] = await db
        .insert(users)
        .values({
          name: 'Gallery Test Owner',
          email: ownerEmail,
          phone: `+88018${Math.floor(10000000 + Math.random() * 90000000)}`,
          passwordHash,
          role: 'owner',
          ownerVerificationStatus: 'approved',
          isEmailVerified: true,
          isPhoneVerified: true,
        })
        .returning();

      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, password: 'Password123!' }),
      });
      const { token: ownerToken } = await loginRes.json();

      const [testTurf] = await db
        .insert(turfs)
        .values({
          ownerId: owner.id,
          turfName: `R2 Arena Gallery Test ${ts}`,
          address: 'Banani, Dhaka',
          city: 'Dhaka',
          area: 'Banani',
          surfaceType: 'Synthetic',
          sportType: ['football'],
          pricePerHour: 2200,
          verificationStatus: 'approved',
          images: [
            'https://images.turfbd.com/turfs/photo1.webp',
            'https://images.turfbd.com/turfs/photo2.webp',
          ],
          mainImage: 'https://images.turfbd.com/turfs/photo1.webp',
        })
        .returning();

      // Step A: Add image to gallery
      const addRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          imageUrl: 'https://images.turfbd.com/turfs/photo3.webp',
        }),
      });
      const addData = await addRes.json();
      const addSuccess = addRes.status === 200 && addData.images.length === 3;

      // Step B: Set new cover photo
      const coverRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery/cover`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          coverImage: 'https://images.turfbd.com/turfs/photo3.webp',
        }),
      });
      const coverData = await coverRes.json();
      const coverSuccess =
        coverRes.status === 200 &&
        coverData.mainImage === 'https://images.turfbd.com/turfs/photo3.webp';

      // Step C: Reorder gallery photos
      const reorderRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          images: [
            'https://images.turfbd.com/turfs/photo3.webp',
            'https://images.turfbd.com/turfs/photo1.webp',
            'https://images.turfbd.com/turfs/photo2.webp',
          ],
        }),
      });
      const reorderData = await reorderRes.json();
      const reorderSuccess =
        reorderRes.status === 200 &&
        reorderData.images[0] === 'https://images.turfbd.com/turfs/photo3.webp';

      // Step D: Delete an image from gallery
      const deleteRes = await fetch(`${BASE_URL}/api/turfs/${testTurf.id}/gallery`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          imageUrl: 'https://images.turfbd.com/turfs/photo2.webp',
        }),
      });
      const deleteData = await deleteRes.json();
      const deleteSuccess = deleteRes.status === 200 && deleteData.images.length === 2;

      record(
        9,
        'Owner can manage full gallery lifecycle via API (Add, Set Cover, Reorder, Delete)',
        addSuccess && coverSuccess && reorderSuccess && deleteSuccess,
        `Add: ${addSuccess}, Cover: ${coverSuccess}, Reorder: ${reorderSuccess}, Delete: ${deleteSuccess}`
      );
    }
  } finally {
    // Restore original environment variables
    process.env = savedEnv;
    _resetStorageClientsForTesting();
  }

  console.log('\n----------------------------------------------------------------');
  const allPassed = results.every((r) => r.passed);
  console.log(`Summary: ${results.filter((r) => r.passed).length}/${results.length} tests passed.`);
  console.log('----------------------------------------------------------------\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runStorageTests().catch((e) => {
  console.error('Storage test execution failed:', e);
  process.exit(1);
});
