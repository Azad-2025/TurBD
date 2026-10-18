import {
  isCloudinaryConfigured,
  isR2Configured,
  getEffectiveStorageProvider,
  getCloudinaryClient,
  processAndSaveImage,
  processAndSaveDocument,
  deleteCloudinaryAsset,
  deleteStorageObject,
  extractCloudinaryPublicId,
  validateImageMagicBytes,
  validateDocumentMagicBytes,
  StorageConfigurationError,
  StorageUpstreamError,
  _resetStorageClientsForTesting,
  _setCloudinaryMockUploader,
} from '../src/server/utils/storage.ts';
import sharp from 'sharp';

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

async function runCloudinaryStorageTests() {
  console.log('================================================================');
  console.log('  TurfBD: Cloudinary Free MVP Storage Adapter & Safety Audit    ');
  console.log('================================================================\n');

  // Preserve initial environment to restore at test end
  const savedEnv = { ...process.env };

  try {
    // -------------------------------------------------------------
    // TEST 1: isCloudinaryConfigured accurately detects presence/absence
    // -------------------------------------------------------------
    {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;
      _resetStorageClientsForTesting();

      const unconfigured = isCloudinaryConfigured();

      process.env.CLOUDINARY_CLOUD_NAME = 'turfbd-cloud';
      process.env.CLOUDINARY_API_KEY = '123456789012345';
      process.env.CLOUDINARY_API_SECRET = 'sample_secret_abc123';
      _resetStorageClientsForTesting();

      const configured = isCloudinaryConfigured();

      record(
        1,
        'isCloudinaryConfigured validates presence of CLOUDINARY_CLOUD_NAME, API_KEY, and API_SECRET',
        !unconfigured && configured,
        `Unconfigured: ${unconfigured}, Fully Configured: ${configured}`
      );
    }

    // -------------------------------------------------------------
    // TEST 2: Provider selection & fallback hierarchy
    // -------------------------------------------------------------
    {
      // A. Explicit Cloudinary
      process.env.IMAGE_STORAGE_PROVIDER = 'cloudinary';
      process.env.CLOUDINARY_CLOUD_NAME = 'cld-test';
      process.env.CLOUDINARY_API_KEY = 'key-test';
      process.env.CLOUDINARY_API_SECRET = 'sec-test';
      const cldExplicit = getEffectiveStorageProvider();

      // B. Explicit R2
      process.env.IMAGE_STORAGE_PROVIDER = 'r2';
      const r2Explicit = getEffectiveStorageProvider();

      // C. Auto-detect when unset
      delete process.env.IMAGE_STORAGE_PROVIDER;
      const cldAuto = getEffectiveStorageProvider();

      // D. Fallback when unconfigured
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_PUBLIC_BASE_URL;
      delete process.env.GCS_BUCKET_NAME;
      const localFallback = getEffectiveStorageProvider();

      const passed =
        cldExplicit === 'cloudinary' &&
        r2Explicit === 'r2' &&
        cldAuto === 'cloudinary' &&
        localFallback === 'local';

      record(
        2,
        'getEffectiveStorageProvider adheres to provider selection hierarchy (explicit, auto, local)',
        passed,
        `explicit-cld=${cldExplicit}, explicit-r2=${r2Explicit}, auto=${cldAuto}, fallback=${localFallback}`
      );
    }

    // -------------------------------------------------------------
    // TEST 3: Strict Production Guard - No Silent Fallback When Unconfigured
    // -------------------------------------------------------------
    {
      process.env.NODE_ENV = 'production';
      process.env.IMAGE_STORAGE_PROVIDER = 'cloudinary';
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;
      _resetStorageClientsForTesting();

      const testImg = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 15, g: 169, b: 88 },
        },
      })
        .jpeg()
        .toBuffer();

      let errorThrown = false;
      let errorIsConfig = false;

      try {
        await processAndSaveImage(testImg, 'prod_test.jpg', 'gallery');
      } catch (err: any) {
        errorThrown = true;
        errorIsConfig = err instanceof StorageConfigurationError && err.statusCode === 503;
      }

      record(
        3,
        'Production upload throws StorageConfigurationError (503) without silent local fallback when unconfigured',
        errorThrown && errorIsConfig,
        `Error thrown: ${errorThrown}, Is StorageConfigurationError (503): ${errorIsConfig}`
      );
    }

    // -------------------------------------------------------------
    // TEST 4: Successful Cloudinary Buffer Upload & WebP Conversion
    // -------------------------------------------------------------
    {
      process.env.NODE_ENV = 'development';
      process.env.IMAGE_STORAGE_PROVIDER = 'cloudinary';
      process.env.CLOUDINARY_CLOUD_NAME = 'turfbd_mvp';
      process.env.CLOUDINARY_API_KEY = 'mock_key_123';
      process.env.CLOUDINARY_API_SECRET = 'mock_secret_456';
      process.env.CLOUDINARY_FOLDER = 'turfbd/gallery';

      let uploadedPublicId = '';
      let uploadedFolder = '';

      _setCloudinaryMockUploader({
        upload: async (buffer: Buffer, options: any) => {
          uploadedPublicId = options.public_id;
          uploadedFolder = options.folder;
          return {
            public_id: `${options.folder}/${options.public_id}`,
            secure_url: `https://res.cloudinary.com/turfbd_mvp/image/upload/v1729177200/${options.folder}/${options.public_id}.webp`,
            format: 'webp',
            bytes: buffer.length,
          };
        },
      });

      const testImg = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 10, g: 120, b: 60 },
        },
      })
        .jpeg()
        .toBuffer();

      const uploadResult = await processAndSaveImage(testImg, 'arena_front.jpg', 'gallery');

      const isWebP = uploadResult.fileType === 'image/webp' && uploadResult.fileName.endsWith('.webp');
      const isCloudinary = uploadResult.storageType === 'cloudinary';
      const hasSecureUrl = uploadResult.imageUrl.startsWith('https://res.cloudinary.com/');
      const hasThumbUrl = uploadResult.thumbnailUrl?.includes('_thumb.webp') || false;
      const hasStorageKey = Boolean(uploadResult.storageKey);

      record(
        4,
        'Cloudinary upload compresses to WebP, generates thumbnail, and returns secure URL & asset key',
        isWebP && isCloudinary && hasSecureUrl && hasThumbUrl && hasStorageKey,
        `Type: ${uploadResult.storageType}, URL: ${uploadResult.imageUrl}, Key: ${uploadResult.storageKey}`
      );
    }

    // -------------------------------------------------------------
    // TEST 5: Strict Production Guard - Upstream Failure Handling (502)
    // -------------------------------------------------------------
    {
      process.env.NODE_ENV = 'production';
      process.env.IMAGE_STORAGE_PROVIDER = 'cloudinary';
      process.env.CLOUDINARY_CLOUD_NAME = 'turfbd_mvp';
      process.env.CLOUDINARY_API_KEY = 'mock_key_123';
      process.env.CLOUDINARY_API_SECRET = 'mock_secret_456';

      _setCloudinaryMockUploader({
        upload: async () => {
          throw new Error('Connection reset by Cloudinary peer network');
        },
      });

      const testImg = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      let errorThrown = false;
      let errorIsUpstream = false;

      try {
        await processAndSaveImage(testImg, 'failure_test.png', 'gallery');
      } catch (err: any) {
        errorThrown = true;
        errorIsUpstream = err instanceof StorageUpstreamError && err.statusCode === 502;
      }

      record(
        5,
        'Production Cloudinary upstream upload failure throws StorageUpstreamError (502) and forbids local disk fallback',
        errorThrown && errorIsUpstream,
        `Error thrown: ${errorThrown}, Is StorageUpstreamError (502): ${errorIsUpstream}`
      );
    }

    // -------------------------------------------------------------
    // TEST 6: Cloudinary public_id Extraction & Asset Deletion
    // -------------------------------------------------------------
    {
      const sampleCloudinaryUrl =
        'https://res.cloudinary.com/turfbd_mvp/image/upload/v1729177200/turfbd/gallery/gallery_sample_12345.webp';

      const extractedId = extractCloudinaryPublicId(sampleCloudinaryUrl);
      const isIdCorrect = extractedId === 'turfbd/gallery/gallery_sample_12345';

      let destroyedId = '';
      _setCloudinaryMockUploader({
        destroy: async (publicId: string) => {
          destroyedId = publicId;
          return { result: 'ok' };
        },
      });

      const deleted = await deleteCloudinaryAsset(sampleCloudinaryUrl);

      record(
        6,
        'extractCloudinaryPublicId & deleteCloudinaryAsset resolve public_id and trigger destruction',
        isIdCorrect && deleted && destroyedId === 'turfbd/gallery/gallery_sample_12345',
        `Extracted ID: ${extractedId}, Destroyed ID: ${destroyedId}`
      );
    }

    // -------------------------------------------------------------
    // TEST 7: External Image URLs are Untouched (Unsplash / External CDNs)
    // -------------------------------------------------------------
    {
      const unsplashUrl =
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80';

      let mockCalled = false;
      _setCloudinaryMockUploader({
        destroy: async () => {
          mockCalled = true;
          return { result: 'ok' };
        },
      });

      const extractedPublicId = extractCloudinaryPublicId(unsplashUrl);
      const cldDeleted = await deleteCloudinaryAsset(unsplashUrl);
      const storageDeleted = await deleteStorageObject(unsplashUrl);

      record(
        7,
        'deleteStorageObject & deleteCloudinaryAsset safely ignore external URLs (Unsplash/CDNs)',
        extractedPublicId === null && cldDeleted === false && storageDeleted === false && !mockCalled,
        `Extracted ID: ${extractedPublicId}, Deleted: ${storageDeleted}, Mock Called: ${mockCalled}`
      );
    }

    // -------------------------------------------------------------
    // TEST 8: Image Magic Bytes Security Verification
    // -------------------------------------------------------------
    {
      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const maliciousExecutable = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');
      const maliciousScript = Buffer.from('<script>alert("xss")</script>');

      const jpegPassed = validateImageMagicBytes(validJpeg);
      const pngPassed = validateImageMagicBytes(validPng);
      const exeBlocked = !validateImageMagicBytes(maliciousExecutable);
      const scriptBlocked = !validateImageMagicBytes(maliciousScript);

      record(
        8,
        'validateImageMagicBytes allows genuine image formats while blocking masked executables and scripts',
        jpegPassed && pngPassed && exeBlocked && scriptBlocked,
        `JPEG: ${jpegPassed}, PNG: ${pngPassed}, EXE blocked: ${exeBlocked}, Script blocked: ${scriptBlocked}`
      );
    }

    // -------------------------------------------------------------
    // TEST 9: Strict Privacy Isolation - Private Documents Never Enter Cloudinary
    // -------------------------------------------------------------
    {
      const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

      let nidBlocked = false;
      let tradeLicenseBlocked = false;
      let docUploadBlocked = false;

      try {
        await processAndSaveImage(validJpeg, 'owner_nid.jpg', 'nid');
      } catch (err: any) {
        nidBlocked = err instanceof StorageConfigurationError;
      }

      try {
        await processAndSaveImage(validJpeg, 'trade_lic.jpg', 'trade_license');
      } catch (err: any) {
        tradeLicenseBlocked = err instanceof StorageConfigurationError;
      }

      try {
        await processAndSaveDocument(validJpeg, 'document.pdf', 'verification');
      } catch (err: any) {
        docUploadBlocked = err instanceof StorageConfigurationError;
      }

      record(
        9,
        'Private Owner verification documents (NID, Trade License) are strictly blocked from public image storage',
        nidBlocked && tradeLicenseBlocked && docUploadBlocked,
        `NID blocked: ${nidBlocked}, Trade license blocked: ${tradeLicenseBlocked}, Doc upload blocked: ${docUploadBlocked}`
      );
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`  Tests Completed: ${passedCount}/${totalCount} Passed`);
    console.log('================================================================');

    if (passedCount !== totalCount) {
      process.exit(1);
    }
  } finally {
    // Restore initial environment and state
    process.env = savedEnv;
    _resetStorageClientsForTesting();
  }
}

runCloudinaryStorageTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
