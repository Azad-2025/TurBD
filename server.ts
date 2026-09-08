import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
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

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON request body parser & cookie parser
  app.use(express.json());
  app.use(cookieParser());

  // Static directory for uploaded files
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TurfBD Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TurfBD server:', err);
});
