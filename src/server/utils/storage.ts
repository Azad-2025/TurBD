import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';

// Local storage directory
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

// Lazy GCS Client
let gcsClient: Storage | null = null;
function getGCSStorage(): Storage | null {
  if (!process.env.GCS_BUCKET_NAME) {
    return null;
  }
  if (!gcsClient) {
    try {
      gcsClient = new Storage();
    } catch (err) {
      console.warn('GCS client initialization skipped:', err);
      return null;
    }
  }
  return gcsClient;
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
  storageType: 'gcs' | 'local';
}

/**
 * Process Image: Compress, Convert to WebP, Generate Thumbnail, and Store (GCS or Local)
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

  const mainFileName = `${baseName}.webp`;
  const thumbFileName = `${baseName}_thumb.webp`;

  const bucketName = process.env.GCS_BUCKET_NAME;
  const storage = getGCSStorage();

  // If GCS is configured, upload to Google Cloud Storage
  if (storage && bucketName) {
    try {
      const bucket = storage.bucket(bucketName);

      // Upload main image
      const mainFile = bucket.file(`turfs/${mainFileName}`);
      await mainFile.save(compressedBuffer, {
        contentType: 'image/webp',
        metadata: { cacheControl: 'public, max-age=31536000' },
      });

      // Upload thumbnail
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
      };
    } catch (gcsError) {
      console.warn('GCS upload error, falling back to local persistent storage:', gcsError);
    }
  }

  // Fallback to local storage
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
  };
}

/**
 * Process Document: Supports PDF, PNG, JPG. Converts images to WebP if image, or stores PDF securely.
 */
export async function processAndSaveDocument(
  buffer: Buffer,
  originalFilename: string,
  category: string
): Promise<ProcessedUploadResult> {
  if (!validateDocumentMagicBytes(buffer)) {
    throw new Error('Invalid document format. Only PDF, JPEG, and PNG documents are allowed.');
  }

  const isPdf =
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46;

  const fileId = crypto.randomUUID();
  const bucketName = process.env.GCS_BUCKET_NAME;
  const storage = getGCSStorage();

  if (isPdf) {
    const fileName = `doc_${category}_${fileId}.pdf`;

    if (storage && bucketName) {
      try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`documents/${fileName}`);
        await file.save(buffer, {
          contentType: 'application/pdf',
          metadata: { cacheControl: 'private, max-age=86400' },
        });

        return {
          fileName,
          originalName: originalFilename,
          fileType: 'application/pdf',
          fileSize: buffer.length,
          imageUrl: `https://storage.googleapis.com/${bucketName}/documents/${fileName}`,
          storageType: 'gcs',
        };
      } catch (err) {
        console.warn('GCS document upload error, saving locally:', err);
      }
    }

    fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, fileName), buffer);
    return {
      fileName,
      originalName: originalFilename,
      fileType: 'application/pdf',
      fileSize: buffer.length,
      imageUrl: `/uploads/${fileName}`,
      storageType: 'local',
    };
  } else {
    // Process image document (e.g. photo of NID or trade license)
    return await processAndSaveImage(buffer, originalFilename, `doc_${category}`);
  }
}
