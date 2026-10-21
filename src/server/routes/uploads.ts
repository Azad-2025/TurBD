import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../../db/index.ts';
import { uploads, turfs, users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { requireAuth, requireOwner } from '../middleware/auth.ts';
import {
  processAndSaveImage,
  processAndSaveDocument,
  StorageConfigurationError,
  StorageUpstreamError,
} from '../utils/storage.ts';

export const uploadRouter = Router();

// Multer memory storage config for in-memory Sharp processing
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum
    files: 10, // Max 10 files per upload batch
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB maximum
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Only PDF, JPEG, and PNG documents are allowed.'));
    }
  },
});

/**
 * POST /api/uploads/turf-images
 * Uploads turf images (main image, gallery, facility, video thumbnail)
 * Processing: Compression, WebP conversion, Thumbnail generation
 * Access: Owner and Admin only
 */
uploadRouter.post(
  '/turf-images',
  requireAuth,
  requireOwner,
  imageUpload.any(),
  async (req: Request, res: Response) => {
    try {
      const rawFiles = req.files || (req.file ? [req.file] : []);
      const files: Express.Multer.File[] = Array.isArray(rawFiles)
        ? (rawFiles as Express.Multer.File[])
        : (Object.values(rawFiles) as any).flat();
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No image files provided. Please select at least one image.' });
        return;
      }

      const category = (req.body.category as string) || 'gallery';
      const validCategories = ['main_image', 'gallery', 'facility', 'video_thumbnail'];
      if (!validCategories.includes(category)) {
        res.status(400).json({
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
        return;
      }

      const turfId = req.body.turfId ? parseInt(req.body.turfId, 10) : null;
      const uploadedResults = [];

      for (const file of files) {
        // Image Processing: Compress, Convert to WebP, Generate Thumbnail, Store
        const processed = await processAndSaveImage(
          file.buffer,
          file.originalname,
          category
        );

        // Store metadata in Cloud SQL `uploads` table
        const [uploadRecord] = await db
          .insert(uploads)
          .values({
            uploadedBy: req.user!.id,
            turfId: turfId && !isNaN(turfId) ? turfId : null,
            category,
            originalName: processed.originalName,
            fileName: processed.fileName,
            fileType: processed.fileType,
            fileSize: processed.fileSize,
            imageUrl: processed.imageUrl,
            thumbnailUrl: processed.thumbnailUrl,
            storageType: processed.storageType,
            storageKey: processed.storageKey || null,
          })
          .returning();

        uploadedResults.push({
          id: uploadRecord.id,
          originalName: uploadRecord.originalName,
          category: uploadRecord.category,
          imageUrl: uploadRecord.imageUrl,
          thumbnailUrl: uploadRecord.thumbnailUrl,
          fileType: uploadRecord.fileType,
          fileSize: uploadRecord.fileSize,
          storageType: uploadRecord.storageType,
          storageKey: uploadRecord.storageKey,
          createdAt: uploadRecord.createdAt,
        });

        // If turfId exists, update the turf record with newly uploaded image
        if (turfId && !isNaN(turfId)) {
          const [existingTurf] = await db
            .select()
            .from(turfs)
            .where(eq(turfs.id, turfId))
            .limit(1);

          if (existingTurf) {
            // Verify ownership if not admin
            if (req.user!.role !== 'admin' && existingTurf.ownerId !== req.user!.id) {
              continue;
            }

            const currentImages = (existingTurf.images as string[]) || [];
            const currentFacilities = (existingTurf.facilityImages as string[]) || [];

            if (category === 'main_image') {
              await db
                .update(turfs)
                .set({
                  mainImage: processed.imageUrl,
                  images: [processed.imageUrl, ...currentImages.filter((img) => img !== processed.imageUrl)],
                })
                .where(eq(turfs.id, turfId));
            } else if (category === 'gallery') {
              if (!currentImages.includes(processed.imageUrl)) {
                await db
                  .update(turfs)
                  .set({
                    images: [...currentImages, processed.imageUrl],
                  })
                  .where(eq(turfs.id, turfId));
              }
            } else if (category === 'facility') {
              if (!currentFacilities.includes(processed.imageUrl)) {
                await db
                  .update(turfs)
                  .set({
                    facilityImages: [...currentFacilities, processed.imageUrl],
                  })
                  .where(eq(turfs.id, turfId));
              }
            } else if (category === 'video_thumbnail') {
              await db
                .update(turfs)
                .set({
                  videoThumbnail: processed.imageUrl,
                })
                .where(eq(turfs.id, turfId));
            }
          }
        }
      }

      res.status(201).json({
        success: true,
        count: uploadedResults.length,
        files: uploadedResults,
        images: uploadedResults,
        imageUrl: uploadedResults[0]?.imageUrl || '',
        message: `${uploadedResults.length} image(s) processed (compressed, converted to WebP) and stored successfully.`,
      });
    } catch (err: any) {
      console.error('Turf image upload error:', err.message);
      const statusCode =
        err.statusCode ||
        (err instanceof StorageConfigurationError
          ? 503
          : err instanceof StorageUpstreamError
          ? 502
          : 500);
      res.status(statusCode).json({
        error: err.message || 'Failed to process and upload turf images.',
        code: err.code || 'UPLOAD_FAILED',
      });
    }
  }
);

/**
 * POST /api/uploads/documents
 * Uploads owner documents (NID, Trade License, Verification docs)
 * Validation: Magic bytes verification, size limits, secure storage
 * Access: Owner and Admin only
 */
uploadRouter.post(
  '/documents',
  requireAuth,
  requireOwner,
  documentUpload.array('documents', 5),
  async (_req: Request, res: Response) => {
    // Security & Privacy Guard: Never store sensitive owner NID/trade licenses on public image buckets or ephemeral disks
    res.status(503).json({
      error: 'Owner verification document upload is disabled until dedicated private encrypted cloud storage is configured. Please contact Super Admin for manual verification.',
      code: 'PRIVATE_STORAGE_NOT_CONFIGURED',
    });
    return;
  }
);

/**
 * GET /api/uploads
 * List uploaded files for owner/admin
 */
uploadRouter.get('/', requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const turfId = req.query.turfId ? parseInt(req.query.turfId as string, 10) : null;
    const category = req.query.category as string;

    const uploadFields = {
      id: uploads.id,
      uploadedBy: uploads.uploadedBy,
      turfId: uploads.turfId,
      category: uploads.category,
      originalName: uploads.originalName,
      fileName: uploads.fileName,
      fileType: uploads.fileType,
      fileSize: uploads.fileSize,
      imageUrl: uploads.imageUrl,
      thumbnailUrl: uploads.thumbnailUrl,
      storageType: uploads.storageType,
      createdAt: uploads.createdAt,
    };

    let query = db.select(uploadFields).from(uploads);

    const user = req.user!;
    let results;

    if (user.role === 'admin') {
      results = await query;
    } else {
      results = await db
        .select(uploadFields)
        .from(uploads)
        .where(eq(uploads.uploadedBy, user.id));
    }

    if (turfId && !isNaN(turfId)) {
      results = results.filter((u) => u.turfId === turfId);
    }
    if (category) {
      results = results.filter((u) => u.category === category);
    }

    res.json({
      uploads: results,
    });
  } catch (err: any) {
    console.error('Fetch uploads error:', err);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

/**
 * POST /api/uploads/avatar
 * Uploads user profile photo
 * Validation: Magic bytes, mime type, size limit (5MB)
 * Access: Authenticated users only
 */
uploadRouter.post(
  '/avatar',
  requireAuth,
  imageUpload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No avatar image file provided. Please select an image.' });
      }

      // Check file size (5MB max for avatars)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Avatar file size exceeds the 5MB limit.' });
      }

      // Process image: optimize and store
      const processed = await processAndSaveImage(
        file.buffer,
        file.originalname,
        'avatar'
      );

      // Save upload record in database
      await db.insert(uploads).values({
        uploadedBy: req.user!.id,
        category: 'avatar',
        originalName: processed.originalName,
        fileName: processed.fileName,
        fileType: processed.fileType,
        fileSize: processed.fileSize,
        imageUrl: processed.imageUrl,
        thumbnailUrl: processed.thumbnailUrl,
        storageType: processed.storageType,
        storageKey: processed.storageKey || null,
      });

      // Update user's profile image
      const [updatedUser] = await db
        .update(users)
        .set({ profileImage: processed.imageUrl })
        .where(eq(users.id, req.user!.id))
        .returning();

      return res.status(200).json({
        success: true,
        profileImage: processed.imageUrl,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          profileImage: updatedUser.profileImage,
        },
        message: 'Profile photo uploaded and saved successfully.',
      });
    } catch (err: any) {
      console.error('Avatar upload error:', err.message);
      const statusCode =
        err.statusCode ||
        (err instanceof StorageConfigurationError
          ? 503
          : err instanceof StorageUpstreamError
          ? 502
          : 500);
      return res.status(statusCode).json({
        error: err.message || 'Failed to process and upload profile image.',
        code: err.code || 'UPLOAD_FAILED',
      });
    }
  }
);

/**
 * DELETE /api/uploads/avatar
 * Removes user profile photo
 * Access: Authenticated users only
 */
uploadRouter.delete('/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ profileImage: null })
      .where(eq(users.id, req.user!.id))
      .returning();

    return res.status(200).json({
      success: true,
      profileImage: null,
      message: 'Profile photo removed successfully.',
    });
  } catch (err: any) {
    console.error('Avatar remove error:', err);
    return res.status(500).json({ error: 'Failed to remove profile image.' });
  }
});
