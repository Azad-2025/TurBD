import { Response } from 'express';

export type RealtimeEventType = 
  | 'SLOT_CHANGED'
  | 'BOOKING_CREATED'
  | 'BOOKING_STATUS_CHANGED'
  | 'TURF_STATUS_CHANGED'
  | 'NOTIFICATION_RECEIVED'
  | 'PING';

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  turfId?: number | string;
  slotId?: number;
  date?: string;
  startTime?: string;
  status?: string;
  bookingId?: number | string;
  bookingCode?: string;
  timestamp: string;
  data?: any;
}

interface ClientConnection {
  id: string;
  res: Response;
  userId?: number;
  role?: string;
  connectedAt: Date;
}

class RealtimeBroadcaster {
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Keep-alive heartbeat every 25 seconds to prevent proxy/cloud-run timeouts
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  public registerClient(id: string, res: Response, userId?: number, role?: string) {
    this.clients.set(id, {
      id,
      res,
      userId,
      role,
      connectedAt: new Date(),
    });

    // Send initial connection acknowledgement
    const initPayload: RealtimeEventPayload = {
      type: 'PING',
      timestamp: new Date().toISOString(),
      data: { message: 'TurfBD real-time synchronization active', clientId: id },
    };
    this.sendToClient(res, initPayload);
  }

  public removeClient(id: string) {
    this.clients.delete(id);
  }

  public broadcast(event: RealtimeEventPayload) {
    const formattedData = `data: ${JSON.stringify(event)}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(formattedData);
      } catch (err) {
        console.warn(`Failed to send event to client ${clientId}, removing client.`);
        this.clients.delete(clientId);
      }
    }
  }

  public notifyTurfSlotChange(params: {
    turfId: number | string;
    date: string;
    startTime: string;
    status: 'available' | 'booked' | 'blocked' | 'held' | 'maintenance' | string;
    slotId?: number;
  }) {
    this.broadcast({
      type: 'SLOT_CHANGED',
      turfId: params.turfId,
      date: params.date,
      startTime: params.startTime,
      status: params.status,
      slotId: params.slotId,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyBookingStatusChange(params: {
    bookingId: number | string;
    bookingCode: string;
    turfId: number | string;
    status: string;
    bookingDate?: string;
    startTime?: string;
  }) {
    this.broadcast({
      type: 'BOOKING_STATUS_CHANGED',
      bookingId: params.bookingId,
      bookingCode: params.bookingCode,
      turfId: params.turfId,
      status: params.status,
      date: params.bookingDate,
      startTime: params.startTime,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyTurfStatusChange(turfId: number | string, status: string) {
    this.broadcast({
      type: 'TURF_STATUS_CHANGED',
      turfId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  public notifyNotification(notification: any) {
    this.broadcast({
      type: 'NOTIFICATION_RECEIVED',
      data: notification,
      timestamp: new Date().toISOString(),
    });
  }

  private sendHeartbeat() {
    const pingEvent = `data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(pingEvent);
      } catch {
        this.clients.delete(clientId);
      }
    }
  }

  private sendToClient(res: Response, payload: RealtimeEventPayload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const realtimeBroadcaster = new RealtimeBroadcaster();
