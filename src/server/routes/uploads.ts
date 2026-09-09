import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../../db/index.ts';
import { uploads, turfs } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { requireAuth, requireOwner } from '../middleware/auth.ts';
import { processAndSaveImage, processAndSaveDocument } from '../utils/storage.ts';

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
  imageUpload.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
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
        message: `${uploadedResults.length} image(s) processed (compressed, converted to WebP) and stored successfully.`,
      });
    } catch (err: any) {
      console.error('Turf image upload error:', err);
      res.status(500).json({
        error: err.message || 'Failed to process and upload turf images.',
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
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No documents provided. Please select at least one document.' });
        return;
      }

      const category = (req.body.category as string) || 'verification';
      const validCategories = ['nid', 'trade_license', 'verification'];
      if (!validCategories.includes(category)) {
        res.status(400).json({
          error: `Invalid document category. Must be one of: ${validCategories.join(', ')}`,
        });
        return;
      }

      const turfId = req.body.turfId ? parseInt(req.body.turfId, 10) : null;
      const uploadedResults = [];

      for (const file of files) {
        // Document validation and storage
        const processed = await processAndSaveDocument(
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
          createdAt: uploadRecord.createdAt,
        });

        // If turfId exists, update the turf's documents JSONB array
        if (turfId && !isNaN(turfId)) {
          const [existingTurf] = await db
            .select()
            .from(turfs)
            .where(eq(turfs.id, turfId))
            .limit(1);

          if (existingTurf) {
            const currentDocs = (existingTurf.documents as any[]) || [];
            await db
              .update(turfs)
              .set({
                documents: [
                  ...currentDocs,
                  {
                    id: uploadRecord.id,
                    type: category,
                    url: processed.imageUrl,
                    name: processed.originalName,
                    uploadedAt: new Date().toISOString(),
                  },
                ],
              })
              .where(eq(turfs.id, turfId));
          }
        }
      }

      res.status(201).json({
        success: true,
        count: uploadedResults.length,
        files: uploadedResults,
        message: `${uploadedResults.length} document(s) securely verified and uploaded.`,
      });
    } catch (err: any) {
      console.error('Document upload error:', err);
      res.status(500).json({
        error: err.message || 'Failed to upload document.',
      });
    }
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

    let query = db.select().from(uploads);

    const user = req.user!;
    let results;

    if (user.role === 'admin') {
      results = await query;
    } else {
      results = await db
        .select()
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
