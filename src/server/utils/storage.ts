import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

// Local storage directory (Used only in development mode when cloud storage is unconfigured)
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

export class StorageConfigurationError extends Error {
  statusCode = 503;
  code = 'STORAGE_NOT_CONFIGURED';
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigurationError';
  }
}

export class StorageUpstreamError extends Error {
  statusCode = 502;
  code = 'STORAGE_UPSTREAM_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'StorageUpstreamError';
  }
}

export type StorageProviderType = 'cloudinary' | 'r2' | 'gcs' | 'local';

// -------------------------------------------------------------
// Cloudinary Client Adapter (Primary MVP zero-cost persistent storage)
// -------------------------------------------------------------
let cloudinaryConfigured = false;
let mockCloudinaryUploader: any = null;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function getCloudinaryClient() {
  if (!isCloudinaryConfigured() && !mockCloudinaryUploader) {
    return null;
  }
  if (!cloudinaryConfigured && isCloudinaryConfigured()) {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
        api_key: process.env.CLOUDINARY_API_KEY!.trim(),
        api_secret: process.env.CLOUDINARY_API_SECRET!.trim(),
        secure: true,
      });
      cloudinaryConfigured = true;
    } catch (err: any) {
      console.error('[STORAGE CONFIG ERROR] Failed to configure Cloudinary:', err.message);
      return null;
    }
  }
  return cloudinary;
}

// -------------------------------------------------------------
// Cloudflare R2 S3-Compatible Client Adapter (Alternative provider)
// -------------------------------------------------------------
let r2Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
    process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_BUCKET_NAME?.trim() &&
    process.env.R2_PUBLIC_BASE_URL?.trim()
  );
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }
  if (!r2Client) {
    try {
      const accountId = process.env.R2_ACCOUNT_ID!.trim();
      r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
        },
      });
    } catch (err: any) {
      console.error('[STORAGE CONFIG ERROR] Failed to initialize Cloudflare R2 client:', err.message);
      return null;
    }
  }
  return r2Client;
}

// -------------------------------------------------------------
// Legacy Google Cloud Storage Client (Secondary fallback)
// -------------------------------------------------------------
let gcsClient: Storage | null = null;

export function isGCSConfigured(): boolean {
  return Boolean(process.env.GCS_BUCKET_NAME?.trim());
}

function getGCSStorage(): Storage | null {
  if (!isGCSConfigured()) {
    return null;
  }
  if (!gcsClient) {
    try {
      gcsClient = new Storage();
    } catch (err: any) {
      console.warn('[STORAGE WARNING] GCS client initialization skipped:', err.message);
      return null;
    }
  }
  return gcsClient;
}

// Determine active storage provider based on configuration and explicit preference
export function getEffectiveStorageProvider(): StorageProviderType {
  const explicit = process.env.IMAGE_STORAGE_PROVIDER?.trim().toLowerCase();
  if (explicit === 'cloudinary') return 'cloudinary';
  if (explicit === 'r2') return 'r2';
  if (explicit === 'gcs') return 'gcs';

  // If not explicitly set, auto-detect by priority:
  if (isCloudinaryConfigured()) return 'cloudinary';
  if (isR2Configured()) return 'r2';
  if (isGCSConfigured()) return 'gcs';

  return 'local';
}

// For unit testing: resets cached client singletons
export function _resetStorageClientsForTesting(): void {
  r2Client = null;
  gcsClient = null;
  cloudinaryConfigured = false;
  mockCloudinaryUploader = null;
}

// For unit testing: inject mock S3 client
export function _setR2ClientForTesting(mockClient: S3Client | null): void {
  r2Client = mockClient;
}

// For unit testing: inject mock Cloudinary uploader
export function _setCloudinaryMockUploader(mock: any): void {
  mockCloudinaryUploader = mock;
}

/**
 * Validate image buffer magic bytes against malicious executable masking
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // WebP: RIFF ... WEBP
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return true;
  }

  // GIF: GIF87a or GIF89a
  const gif = buffer.subarray(0, 6).toString('ascii');
  if (gif === 'GIF87a' || gif === 'GIF89a') {
    return true;
  }

  return false;
}

/**
 * Validate document magic bytes (PDF, JPEG, PNG)
 */
export function validateDocumentMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;

  // PDF: %PDF
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return true;
  }

  return validateImageMagicBytes(buffer);
}

export interface ProcessedUploadResult {
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  imageUrl: string;
  thumbnailUrl?: string;
  storageType: StorageProviderType;
  storageKey?: string; // Stable asset identifier / public_id
}

/**
 * Upload an in-memory buffer to Cloudinary using upload_stream
 */
function uploadBufferToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    public_id?: string;
    resource_type?: 'image' | 'raw' | 'auto';
    overwrite?: boolean;
  }
): Promise<UploadApiResponse> {
  if (mockCloudinaryUploader) {
    if (typeof mockCloudinaryUploader.upload === 'function') {
      return mockCloudinaryUploader.upload(buffer, options);
    }
    if (typeof mockCloudinaryUploader.upload_stream === 'function') {
      return new Promise((resolve, reject) => {
        const stream = mockCloudinaryUploader.upload_stream(options, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
        stream.end(buffer);
      });
    }
  }

  const cld = getCloudinaryClient();
  if (!cld) {
    throw new StorageConfigurationError('Cloudinary client is not configured.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.public_id,
        resource_type: options.resource_type || 'image',
        overwrite: options.overwrite ?? true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Cloudinary upload returned empty response.'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Process Image: Compress, Convert to WebP, Generate Thumbnail, and Store in Cloudinary (or R2 / GCS)
 * ELIMINATES SILENT FALLBACK IN PRODUCTION:
 * - If in production and storage provider is unconfigured: Throws StorageConfigurationError (503).
 * - If in production and cloud storage upload fails: Throws StorageUpstreamError (502).
 * - Local filesystem writing is strictly forbidden in production.
 */
export async function processAndSaveImage(
  buffer: Buffer,
  originalFilename: string,
  category: string
): Promise<ProcessedUploadResult> {
  // Validate magic bytes
  if (!validateImageMagicBytes(buffer)) {
    throw new Error('Invalid image content. File header does not match acceptable image formats (JPEG, PNG, WebP).');
  }

  // Security guard: private documents must NEVER enter the public gallery image pipeline
  const prohibitedCategories = ['nid', 'trade_license', 'verification', 'doc_nid', 'doc_trade_license', 'doc_verification'];
  if (prohibitedCategories.includes(category.toLowerCase())) {
    throw new StorageConfigurationError(
      'Private verification documents cannot be processed through public image storage.'
    );
  }

  const fileId = crypto.randomUUID();
  const baseName = `${category}_${fileId}`;

  // 1. Process Main Image: WebP format, max 1920x1080, quality 80%
  const compressedBuffer = await sharp(buffer)
    .rotate() // auto-orient based on EXIF
    .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  // 2. Process Thumbnail: WebP format, 400x300 cover crop, quality 75%
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 400, height: 300, fit: 'cover' })
    .webp({ quality: 75, effort: 3 })
    .toBuffer();

  const isProduction = process.env.NODE_ENV === 'production';
  const provider = getEffectiveStorageProvider();

  // -----------------------------------------------------------
  // 1. Primary MVP Adapter: Cloudinary (Zero-Cost Free Tier)
  // -----------------------------------------------------------
  if (provider === 'cloudinary') {
    if (!isCloudinaryConfigured() && !mockCloudinaryUploader) {
      if (isProduction) {
        throw new StorageConfigurationError(
          'Cloudinary image storage is selected (IMAGE_STORAGE_PROVIDER=cloudinary) but required configuration (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) is missing.'
        );
      }
      console.warn('[STORAGE DEV WARNING] Cloudinary is unconfigured in development. Falling back to local disk.');
    } else {
      const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'turfbd/gallery';
      try {
        const mainResult = await uploadBufferToCloudinary(compressedBuffer, {
          folder,
          public_id: baseName,
          resource_type: 'image',
          overwrite: true,
        });

        const thumbResult = await uploadBufferToCloudinary(thumbBuffer, {
          folder,
          public_id: `${baseName}_thumb`,
          resource_type: 'image',
          overwrite: true,
        });

        return {
          fileName: `${baseName}.webp`,
          originalName: originalFilename,
          fileType: 'image/webp',
          fileSize: compressedBuffer.length,
          imageUrl: mainResult.secure_url,
          thumbnailUrl: thumbResult.secure_url,
          storageType: 'cloudinary',
          storageKey: mainResult.public_id,
        };
      } catch (cldErr: any) {
        console.error(`[STORAGE ERROR] Cloudinary upload failed for ${baseName}:`, cldErr.message);
        if (isProduction) {
          throw new StorageUpstreamError(
            'Failed to upload image to Cloudinary upstream service. Local disk fallback is disabled in production to protect data durability.'
          );
        }
        console.warn('[STORAGE DEV WARNING] Cloudinary upload failed in development. Falling back to local disk.');
      }
    }
  }

  // -----------------------------------------------------------
  // 2. Secondary Adapter: Cloudflare R2 Object Storage
  // -----------------------------------------------------------
  if (provider === 'r2' || (provider === 'local' && isR2Configured())) {
    const mainFileName = `${baseName}.webp`;
    const thumbFileName = `${baseName}_thumb.webp`;

    if (!isR2Configured()) {
      if (isProduction) {
        throw new StorageConfigurationError(
          'Cloudflare R2 storage is selected (IMAGE_STORAGE_PROVIDER=r2) but required configuration (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL) is missing.'
        );
      }
      console.warn('[STORAGE DEV WARNING] R2 is unconfigured in development. Falling back to local disk.');
    } else {
      const r2 = getR2Client();
      if (!r2) {
        if (isProduction) {
          throw new StorageConfigurationError('Cloudflare R2 storage client failed to initialize with provided configuration.');
        }
      } else {
        const bucketName = process.env.R2_BUCKET_NAME!.trim();
        const publicBase = process.env.R2_PUBLIC_BASE_URL!.trim().replace(/\/+$/, '');
        const mainKey = `turfs/${mainFileName}`;
        const thumbKey = `turfs/${thumbFileName}`;

        try {
          await r2.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: mainKey,
              Body: compressedBuffer,
              ContentType: 'image/webp',
              CacheControl: 'public, max-age=31536000',
            })
          );

          await r2.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: thumbKey,
              Body: thumbBuffer,
              ContentType: 'image/webp',
              CacheControl: 'public, max-age=31536000',
            })
          );

          return {
            fileName: mainFileName,
            originalName: originalFilename,
            fileType: 'image/webp',
            fileSize: compressedBuffer.length,
            imageUrl: `${publicBase}/${mainKey}`,
            thumbnailUrl: `${publicBase}/${thumbKey}`,
            storageType: 'r2',
            storageKey: mainKey,
          };
        } catch (r2Err: any) {
          console.error(`[STORAGE ERROR] Cloudflare R2 upload failed for ${mainKey}:`, r2Err.message);
          if (isProduction) {
            throw new StorageUpstreamError(
              'Failed to store image in Cloudflare R2. Local disk fallback is disabled in production to protect data durability.'
            );
          }
          console.warn('[STORAGE DEV WARNING] R2 upload failed in development. Falling back to local disk.');
        }
      }
    }
  }

  // -----------------------------------------------------------
  // 3. Legacy Adapter: Google Cloud Storage (if explicitly set)
  // -----------------------------------------------------------
  if (provider === 'gcs' || (provider === 'local' && isGCSConfigured())) {
    const mainFileName = `${baseName}.webp`;
    const thumbFileName = `${baseName}_thumb.webp`;

    if (isGCSConfigured()) {
      const bucketName = process.env.GCS_BUCKET_NAME!.trim();
      const storage = getGCSStorage();
      if (storage) {
        try {
          const bucket = storage.bucket(bucketName);

          const mainFile = bucket.file(`turfs/${mainFileName}`);
          await mainFile.save(compressedBuffer, {
            contentType: 'image/webp',
            metadata: { cacheControl: 'public, max-age=31536000' },
          });

          const thumbFile = bucket.file(`turfs/${thumbFileName}`);
          await thumbFile.save(thumbBuffer, {
            contentType: 'image/webp',
            metadata: { cacheControl: 'public, max-age=31536000' },
          });

          const mainUrl = `https://storage.googleapis.com/${bucketName}/turfs/${mainFileName}`;
          const thumbUrl = `https://storage.googleapis.com/${bucketName}/turfs/${thumbFileName}`;

          return {
            fileName: mainFileName,
            originalName: originalFilename,
            fileType: 'image/webp',
            fileSize: compressedBuffer.length,
            imageUrl: mainUrl,
            thumbnailUrl: thumbUrl,
            storageType: 'gcs',
            storageKey: `turfs/${mainFileName}`,
          };
        } catch (gcsError: any) {
          console.error(`[STORAGE ERROR] GCS upload failed for ${mainFileName}:`, gcsError.message);
          if (isProduction) {
            throw new StorageUpstreamError(
              'Failed to store image in Google Cloud Storage. Local disk fallback is disabled in production.'
            );
          }
          console.warn('[STORAGE DEV WARNING] GCS upload failed in development. Falling back to local disk.');
        }
      }
    }
  }

  // -----------------------------------------------------------
  // 4. Fallback / Unconfigured handling
  // -----------------------------------------------------------
  if (isProduction) {
    console.error('[STORAGE CONFIG ERROR] No persistent cloud storage provider is configured in production.');
    throw new StorageConfigurationError(
      'Persistent image storage is not configured. Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) or Cloudflare R2 is required in production.'
    );
  }

  // Local filesystem fallback is permitted ONLY in development environments
  const mainFileName = `${baseName}.webp`;
  const thumbFileName = `${baseName}_thumb.webp`;
  fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, mainFileName), compressedBuffer);
  fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, thumbFileName), thumbBuffer);

  return {
    fileName: mainFileName,
    originalName: originalFilename,
    fileType: 'image/webp',
    fileSize: compressedBuffer.length,
    imageUrl: `/uploads/${mainFileName}`,
    thumbnailUrl: `/uploads/${thumbFileName}`,
    storageType: 'local',
    storageKey: mainFileName,
  };
}

/**
 * Extract Cloudinary public_id from a delivery URL or direct public_id string.
 * External URLs (e.g. Unsplash, external CDNs) return null to prevent accidental deletion.
 */
export function extractCloudinaryPublicId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();

  // If it's a relative URL or local uploads path, it is not a Cloudinary asset
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return null;
  }

  // If it's a URL, verify it is hosted on Cloudinary
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (!trimmed.includes('res.cloudinary.com') && !trimmed.includes('cloudinary.com')) {
      // External URL (such as Unsplash, AWS, CDN) -> safely return null
      return null;
    }

    try {
      const urlObj = new URL(trimmed);
      const pathname = urlObj.pathname;
      const uploadIndex = pathname.indexOf('/upload/');
      if (uploadIndex === -1) return null;

      const pathAfterUpload = pathname.substring(uploadIndex + '/upload/'.length);
      const segments = pathAfterUpload.split('/');
      const cleanSegments: string[] = [];

      for (const segment of segments) {
        // Skip version segment like v1234567890
        if (/^v\d+$/.test(segment)) {
          continue;
        }
        // Skip common transformation params e.g. c_fill,w_300,q_auto,f_auto
        if (segment.includes(',') || /^[a-z]_[a-z0-9_-]+$/i.test(segment)) {
          continue;
        }
        cleanSegments.push(segment);
      }

      if (cleanSegments.length === 0) return null;

      let publicIdWithExt = cleanSegments.join('/');
      // Strip file extension (.webp, .jpg, etc.)
      const lastDotIndex = publicIdWithExt.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        publicIdWithExt = publicIdWithExt.substring(0, lastDotIndex);
      }

      return publicIdWithExt;
    } catch {
      return null;
    }
  }

  // If it's a raw public_id (e.g. "turfbd/gallery/turf_123"), remove extension if present
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot !== -1 && lastDot > trimmed.lastIndexOf('/')) {
    return trimmed.substring(0, lastDot);
  }

  return trimmed;
}

/**
 * Delete asset from Cloudinary storage
 * Safeguards:
 * - External URLs (e.g. Unsplash, Imgur, R2) return false and are never touched.
 * - Only Cloudinary assets matching public_id are deleted.
 */
export async function deleteCloudinaryAsset(imageUrlOrPublicId: string): Promise<boolean> {
  const publicId = extractCloudinaryPublicId(imageUrlOrPublicId);
  if (!publicId) {
    // External URL or non-Cloudinary asset -> skip safely
    return false;
  }

  if (mockCloudinaryUploader) {
    try {
      if (typeof mockCloudinaryUploader.destroy === 'function') {
        await mockCloudinaryUploader.destroy(publicId, { invalidate: true });
        return true;
      }
      return true;
    } catch (err: any) {
      console.error(`[STORAGE ERROR] Mock Cloudinary deletion failed for ${publicId}:`, err.message);
      return false;
    }
  }

  if (!isCloudinaryConfigured()) {
    return false;
  }

  const cld = getCloudinaryClient();
  if (!cld) return false;

  try {
    await cld.uploader.destroy(publicId, { invalidate: true });

    // Also attempt deleting associated thumbnail if this was a main image
    if (!publicId.endsWith('_thumb')) {
      const thumbPublicId = `${publicId}_thumb`;
      await cld.uploader.destroy(thumbPublicId, { invalidate: true }).catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.error(`[STORAGE ERROR] Failed to delete Cloudinary asset (${publicId}):`, err.message);
    return false;
  }
}

/**
 * Delete object from Cloudflare R2 storage
 * Safeguards:
 * - External URLs (e.g., Unsplash, Cloudinary, Imgur, or external CDNs) are never deleted from remote storage.
 * - Only URLs matching R2_PUBLIC_BASE_URL or keys starting with 'turfs/' are deleted.
 */
export async function deleteR2Object(imageUrlOrKey: string): Promise<boolean> {
  if (!imageUrlOrKey || typeof imageUrlOrKey !== 'string') return false;

  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  let key: string | null = null;

  if (publicBase && imageUrlOrKey.startsWith(publicBase)) {
    key = imageUrlOrKey.substring(publicBase.length).replace(/^\/+/, '');
  } else if (imageUrlOrKey.startsWith('turfs/')) {
    key = imageUrlOrKey;
  }

  // External URLs do not match R2 public base URL, so key remains null -> skip deletion
  if (!key) {
    return false;
  }

  if (!isR2Configured()) {
    return false;
  }

  const r2 = getR2Client();
  if (!r2) return false;

  try {
    const bucketName = process.env.R2_BUCKET_NAME!.trim();
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    // Also attempt deleting associated thumbnail if this was a main image
    if (key.endsWith('.webp') && !key.endsWith('_thumb.webp')) {
      const thumbKey = key.replace(/\.webp$/, '_thumb.webp');
      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: thumbKey,
        })
      ).catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.error(`[STORAGE ERROR] Failed to delete R2 object (${key}):`, err.message);
    return false;
  }
}

/**
 * Unified storage deletion helper:
 * Detects whether the URL/key belongs to Cloudinary or R2 and dispatches safely.
 * Safeguard: External URLs (e.g. Unsplash) are completely untouched.
 */
export async function deleteStorageObject(imageUrlOrKey: string): Promise<boolean> {
  if (!imageUrlOrKey || typeof imageUrlOrKey !== 'string') return false;

  // 1. Check if Cloudinary asset
  if (extractCloudinaryPublicId(imageUrlOrKey)) {
    return deleteCloudinaryAsset(imageUrlOrKey);
  }

  // 2. Check if R2 asset
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if ((publicBase && imageUrlOrKey.startsWith(publicBase)) || imageUrlOrKey.startsWith('turfs/')) {
    return deleteR2Object(imageUrlOrKey);
  }

  // 3. External URLs (Unsplash, external CDNs) -> never delete from remote storage
  return false;
}

/**
 * Process Document:
 * STRICT PRIVACY SEPARATION:
 * Owner verification documents (NID, trade license) are private and must NEVER be uploaded
 * to public image buckets (Cloudinary or R2). This function explicitly rejects document uploads
 * until a separate private encrypted bucket is provisioned.
 */
export async function processAndSaveDocument(
  _buffer: Buffer,
  _originalFilename: string,
  _category: string
): Promise<ProcessedUploadResult> {
  throw new StorageConfigurationError(
    'Owner verification document upload is disabled until dedicated private encrypted storage is configured.'
  );
}
