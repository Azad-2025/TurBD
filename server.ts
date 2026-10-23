import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import authRouter from './src/server/routes/auth.ts';
import turfsRouter from './src/server/routes/turfs.ts';
import slotsRouter from './src/server/routes/slots.ts';
import bookingsRouter from './src/server/routes/bookings.ts';
import paymentsRouter from './src/server/routes/payments.ts';
import reviewsRouter from './src/server/routes/reviews.ts';
import reportsRouter from './src/server/routes/reports.ts';
import { uploadRouter } from './src/server/routes/uploads.ts';
import realtimeRouter from './src/server/routes/realtime.ts';
import aiRouter from './src/server/routes/ai.ts';
import notificationsRouter from './src/server/routes/notifications.ts';
import invoicesRouter from './src/server/routes/invoices.ts';
import adminRouter from './src/server/routes/admin.ts';
import { autoSeedDatabase } from './src/server/services/autoSeedService.ts';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 1. HTTP Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for Vite SPA dynamic client scripts & styles
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploaded turf images and static assets
    })
  );

  // 2. Strict CORS Origin Validation
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  const isOriginAllowed = (origin: string): boolean => {
    // 1. Explicitly configured origins in environment variable
    if (allowedOriginsEnv.includes(origin)) return true;
    // 2. Localhost development environments
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    // 3. Official deployment and preview domains (Vercel & Google Cloud Run)
    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/i.test(origin)) return true;
    if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(\.run\.app)$/i.test(origin)) return true;
    return false;
  };

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control');
        res.setHeader('Vary', 'Origin');
      } else {
        if (req.method === 'OPTIONS') {
          return res.status(403).json({ error: 'CORS policy violation: Origin not allowed' });
        }
      }
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // JSON request body parser, URL-encoded body parser & cookie parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static assets and uploads
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'TurfBD API',
      database: 'PostgreSQL Cloud SQL',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/turfs', turfsRouter);
  app.use('/api/slots', slotsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/uploads', uploadRouter);
  app.use('/api/realtime', realtimeRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/admin', adminRouter);

  // Generic OAuth callback fallback
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.redirect(`/api/auth/google/callback?${new URLSearchParams(req.query as any).toString()}`);
  });

  // Global API error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err?.message });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Idempotent database auto-seeding before serving traffic
  try {
    await autoSeedDatabase();
  } catch (seedErr) {
    console.warn('[Server Startup] Auto-seed check finished with notice:', seedErr);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TurfBD Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TurfBD server:', err);
});
