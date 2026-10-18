import express from 'express';
import { realtimeBroadcaster } from '../services/realtime.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * GET /api/realtime/events
 * Server-Sent Events (SSE) streaming endpoint for live slot, booking and turf updates.
 */
router.get('/events', (req, res) => {
  // Set required headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, Cloud Run)

  // Flush headers immediately if available
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Parse optional token query or header
  const token = (req.query.token as string) || (req.headers.authorization?.replace('Bearer ', ''));
  let userId: number | undefined;
  let role: string | undefined;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'turfbd_super_secure_jwt_secret_dev_2026';
      const decoded: any = jwt.verify(token, secret);
      userId = decoded.userId || decoded.id;
      role = decoded.role;
    } catch {
      // Allow unauthenticated connection for public slot status updates
    }
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  realtimeBroadcaster.registerClient(clientId, res, userId, role);

  // Clean up when client disconnects
  req.on('close', () => {
    realtimeBroadcaster.removeClient(clientId);
  });
});

/**
 * GET /api/realtime/stats
 * Health and telemetry check for connected clients
 */
router.get('/stats', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: realtimeBroadcaster.getConnectedClientsCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
