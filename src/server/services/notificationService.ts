import { db } from '../../db';
import { notifications, turfs, bookings, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { realtimeBroadcaster } from './realtime.js';

export interface NotificationPayload {
  userId?: number | null;
  recipientRole?: 'customer' | 'owner' | 'admin' | 'all';
  type: string;
  title: string;
  message: string;
  bookingId?: number | null;
  turfId?: number | null;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Core dispatch function:
   * 1. Inserts record into database
   * 2. Broadcasts real-time event through SSE
   * 3. Logs future-ready WhatsApp/SMS delivery channel
   */
  public async createNotification(payload: NotificationPayload) {
    try {
      let inserted: any;
      try {
        const [res] = await db
          .insert(notifications)
          .values({
            userId: payload.userId || null,
            recipientRole: payload.recipientRole || 'customer',
            type: payload.type,
            title: payload.title,
            message: payload.message,
            bookingId: payload.bookingId || null,
            turfId: payload.turfId || null,
            metadata: payload.metadata || {},
            isRead: false,
          })
          .returning();
        inserted = res;
      } catch (fkErr: any) {
        // Fallback if foreign key is not found (e.g. simulated booking ID)
        console.warn('[NotificationService] Retrying insert with sanitized foreign keys:', fkErr?.message);
        const [res] = await db
          .insert(notifications)
          .values({
            userId: payload.userId || null,
            recipientRole: payload.recipientRole || 'customer',
            type: payload.type,
            title: payload.title,
            message: payload.message,
            bookingId: null,
            turfId: null,
            metadata: {
              ...payload.metadata,
              originalBookingId: payload.bookingId,
              originalTurfId: payload.turfId,
            },
            isRead: false,
          })
          .returning();
        inserted = res;
      }

      // Realtime live push via SSE
      realtimeBroadcaster.notifyNotification({
        id: inserted.id,
        userId: inserted.userId,
        recipientRole: inserted.recipientRole,
        type: inserted.type,
        title: inserted.title,
        message: inserted.message,
        bookingId: inserted.bookingId,
        turfId: inserted.turfId,
        metadata: inserted.metadata,
        isRead: inserted.isRead,
        createdAt: inserted.createdAt,
      });

      // Future-Ready Multi-Channel Dispatch (SMS / WhatsApp Gateway logging)
      if (payload.metadata?.phone) {
        console.log(
          `[TurfBD Notification Gateway] Dispatched multi-channel alert: type=${payload.type}, recipientPhone=${payload.metadata.phone}`
        );
      }

      return inserted;
    } catch (err) {
      console.error('[NotificationService] Error creating notification:', err);
      return null;
    }
  }

  // ==========================================
  // A) USER NOTIFICATIONS
  // ==========================================

  public async notifyBookingConfirmed(params: {
    userId: number;
    bookingId: number;
    bookingCode: string;
    turfName: string;
    date: string;
    timeSlot: string;
    paymentStatus: string;
    tokenPaid: number;
    remainingDue: number;
    location: string;
    userPhone?: string;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'booking_confirmed',
      title: 'Booking Confirmed! ⚽🏏',
      message: `Your slot at ${params.turfName} on ${params.date} (${params.timeSlot}) is locked. Advance ৳${params.tokenPaid.toLocaleString()} paid.`,
      bookingId: params.bookingId,
      metadata: {
        bookingCode: params.bookingCode,
        turfName: params.turfName,
        date: params.date,
        timeSlot: params.timeSlot,
        paymentStatus: params.paymentStatus,
        tokenPaid: params.tokenPaid,
        remainingDue: params.remainingDue,
        location: params.location,
        phone: params.userPhone,
        brandLogo: '/turflogo.png',
      },
    });
  }

  public async notifyPaymentSuccess(params: {
    userId: number;
    bookingId: number;
    bookingCode: string;
    amount: number;
    gateway: 'bkash' | 'nagad';
    transactionId: string;
    turfName: string;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'payment_success',
      title: 'Payment Successful ৳',
      message: `Advance payment of ৳${params.amount.toLocaleString()} received via ${params.gateway.toUpperCase()} (TrxID: ${params.transactionId}).`,
      bookingId: params.bookingId,
      metadata: {
        bookingCode: params.bookingCode,
        amount: params.amount,
        gateway: params.gateway,
        transactionId: params.transactionId,
        turfName: params.turfName,
      },
    });
  }

  public async notifyPaymentFailed(params: {
    userId: number;
    bookingId?: number;
    gateway: 'bkash' | 'nagad';
    reason: string;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'payment_failed',
      title: 'Payment Failed or Cancelled',
      message: `Your ${params.gateway.toUpperCase()} transaction could not be completed: ${params.reason}. Please retry to protect your slot.`,
      bookingId: params.bookingId,
      metadata: {
        gateway: params.gateway,
        reason: params.reason,
      },
    });
  }

  public async notifyBookingCancelled(params: {
    userId: number;
    bookingId: number;
    bookingCode: string;
    turfName: string;
    date: string;
    timeSlot: string;
    refundAmount?: number;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `Your booking #${params.bookingCode} at ${params.turfName} has been cancelled.${
        params.refundAmount ? ` Refund of ৳${params.refundAmount.toLocaleString()} initiated.` : ''
      }`,
      bookingId: params.bookingId,
      metadata: {
        bookingCode: params.bookingCode,
        turfName: params.turfName,
        date: params.date,
        timeSlot: params.timeSlot,
        refundAmount: params.refundAmount,
      },
    });
  }

  public async notifyRefundCompleted(params: {
    userId: number;
    bookingId: number;
    amount: number;
    gateway: string;
    refundRef: string;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'refund_completed',
      title: 'Refund Completed ৳',
      message: `Refund of ৳${params.amount.toLocaleString()} has been sent to your ${params.gateway.toUpperCase()} account (Ref: ${params.refundRef}).`,
      bookingId: params.bookingId,
      metadata: {
        amount: params.amount,
        gateway: params.gateway,
        refundRef: params.refundRef,
      },
    });
  }

  public async notifyRefundStatusChanged(params: {
    userId: number;
    bookingId: number;
    bookingCode: string;
    turfName: string;
    refundStatus: string;
    amount: number;
    notes?: string;
  }) {
    const isApproved = params.refundStatus === 'approved' || params.refundStatus === 'refunded';
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'refund_status_changed',
      title: isApproved ? 'Refund Status: Approved ৳' : `Refund Status: ${params.refundStatus.toUpperCase()}`,
      message: `Refund update for booking #${params.bookingCode} (${params.turfName}): Status is now "${params.refundStatus}". Amount: ৳${params.amount.toLocaleString()}.${params.notes ? ` (${params.notes})` : ''}`,
      bookingId: params.bookingId,
      metadata: {
        bookingCode: params.bookingCode,
        turfName: params.turfName,
        refundStatus: params.refundStatus,
        amount: params.amount,
        notes: params.notes,
      },
    });
  }

  public async notifyBookingRescheduled(params: {
    userId: number;
    bookingId: number;
    bookingCode: string;
    turfName: string;
    oldDate: string;
    oldTimeSlot: string;
    newDate: string;
    newTimeSlot: string;
    userPhone?: string;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'booking_rescheduled',
      title: 'Booking Rescheduled 📅',
      message: `Your match at ${params.turfName} (#${params.bookingCode}) has been rescheduled to ${params.newDate} (${params.newTimeSlot}).`,
      bookingId: params.bookingId,
      metadata: {
        bookingCode: params.bookingCode,
        turfName: params.turfName,
        oldDate: params.oldDate,
        oldTimeSlot: params.oldTimeSlot,
        newDate: params.newDate,
        newTimeSlot: params.newTimeSlot,
        phone: params.userPhone,
      },
    });
  }

  public async notifyCheckInCompleted(params: {
    userId: number;
    ownerId?: number;
    bookingId: number;
    bookingCode: string;
    turfName: string;
    turfId: number;
    date: string;
    timeSlot: string;
    customerName: string;
    checkedInByName: string;
    userPhone?: string;
  }) {
    // 1. Notify customer of successful check-in
    await this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'checkin_completed',
      title: 'Match Pass Verified & Checked In! 🎟️✅',
      message: `Welcome to ${params.turfName}! Your pass #${params.bookingCode} was verified by ${params.checkedInByName}. Have a great match!`,
      bookingId: params.bookingId,
      turfId: params.turfId,
      metadata: {
        bookingCode: params.bookingCode,
        turfName: params.turfName,
        date: params.date,
        timeSlot: params.timeSlot,
        checkedInByName: params.checkedInByName,
        phone: params.userPhone,
      },
    });

    // 2. Notify venue owner for audit log
    if (params.ownerId) {
      await this.createNotification({
        userId: params.ownerId,
        recipientRole: 'owner',
        type: 'checkin_completed',
        title: 'Player Checked In at Gate 🏟️',
        message: `${params.customerName} checked in for ${params.turfName} (${params.timeSlot}) by ${params.checkedInByName}.`,
        bookingId: params.bookingId,
        turfId: params.turfId,
        metadata: {
          bookingCode: params.bookingCode,
          customerName: params.customerName,
          turfName: params.turfName,
          date: params.date,
          timeSlot: params.timeSlot,
          checkedInByName: params.checkedInByName,
        },
      });
    }
  }

  public async notifyMatchReminder(params: {
    userId: number;
    bookingId: number;
    turfName: string;
    timeSlot: string;
    location: string;
  }) {
    return this.createNotification({
      userId: params.userId,
      recipientRole: 'customer',
      type: 'match_reminder',
      title: 'Upcoming Match Reminder! 🏆',
      message: `Kickoff at ${params.turfName} (${params.timeSlot}) is approaching. Gather your squad!`,
      bookingId: params.bookingId,
      metadata: {
        turfName: params.turfName,
        timeSlot: params.timeSlot,
        location: params.location,
      },
    });
  }

  // ==========================================
  // B) TURF OWNER NOTIFICATIONS
  // ==========================================

  public async notifyOwnerNewBooking(params: {
    ownerId: number;
    turfId: number;
    turfName: string;
    bookingId: number;
    customerName: string;
    customerPhone: string;
    date: string;
    timeSlot: string;
    tokenPaid: number;
    remainingDue: number;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'owner_new_booking',
      title: 'New Booking Confirmed! 🏟️',
      message: `${params.customerName} booked ${params.turfName} on ${params.date} (${params.timeSlot}). Token ৳${params.tokenPaid.toLocaleString()} paid.`,
      bookingId: params.bookingId,
      turfId: params.turfId,
      metadata: {
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        turfName: params.turfName,
        date: params.date,
        timeSlot: params.timeSlot,
        tokenPaid: params.tokenPaid,
        remainingDue: params.remainingDue,
      },
    });
  }

  public async notifyOwnerAdvancePaid(params: {
    ownerId: number;
    turfName: string;
    bookingId: number;
    amount: number;
    gateway: string;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'owner_advance_paid',
      title: 'Advance Payment Credited ৳',
      message: `Advance payment of ৳${params.amount.toLocaleString()} received via ${params.gateway.toUpperCase()} for ${params.turfName}.`,
      bookingId: params.bookingId,
      metadata: {
        turfName: params.turfName,
        amount: params.amount,
        gateway: params.gateway,
      },
    });
  }

  public async notifyOwnerCancellation(params: {
    ownerId: number;
    turfName: string;
    bookingId: number;
    customerName: string;
    date: string;
    timeSlot: string;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'owner_cancellation',
      title: 'Slot Cancelled by Customer',
      message: `${params.customerName} cancelled their slot for ${params.date} (${params.timeSlot}) at ${params.turfName}. Slot is now open again.`,
      bookingId: params.bookingId,
      metadata: {
        turfName: params.turfName,
        customerName: params.customerName,
        date: params.date,
        timeSlot: params.timeSlot,
      },
    });
  }

  public async notifyOwnerRefundRequest(params: {
    ownerId: number;
    turfName: string;
    bookingId: number;
    customerName: string;
    amount: number;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'owner_refund_request',
      title: 'Refund Request Received',
      message: `${params.customerName} requested a refund of ৳${params.amount.toLocaleString()} for ${params.turfName}.`,
      bookingId: params.bookingId,
      metadata: {
        turfName: params.turfName,
        customerName: params.customerName,
        amount: params.amount,
      },
    });
  }

  // ==========================================
  // C) ADMIN NOTIFICATIONS
  // ==========================================

  public async notifyAdminTurfRegistered(params: {
    turfId: number;
    turfName: string;
    ownerName: string;
    city: string;
  }) {
    return this.createNotification({
      recipientRole: 'admin',
      type: 'admin_turf_registered',
      title: 'New Turf Submitted for Verification 📝',
      message: `${params.ownerName} submitted "${params.turfName}" in ${params.city} for platform verification.`,
      turfId: params.turfId,
      metadata: {
        turfName: params.turfName,
        ownerName: params.ownerName,
        city: params.city,
      },
    });
  }

  public async notifyAdminPaymentIssue(params: {
    bookingId?: number;
    gateway: string;
    errorDetail: string;
  }) {
    return this.createNotification({
      recipientRole: 'admin',
      type: 'admin_payment_issue',
      title: 'Payment Gateway Alert ⚠️',
      message: `Gateway ${params.gateway.toUpperCase()} reported an issue: ${params.errorDetail}`,
      bookingId: params.bookingId,
      metadata: {
        gateway: params.gateway,
        errorDetail: params.errorDetail,
      },
    });
  }

  public async notifyAdminRefundRequest(params: {
    bookingId: number;
    customerName: string;
    amount: number;
    reason: string;
  }) {
    return this.createNotification({
      recipientRole: 'admin',
      type: 'admin_refund_request',
      title: 'Dispute / Refund Verification Required',
      message: `Customer ${params.customerName} requested refund ৳${params.amount.toLocaleString()}. Reason: ${params.reason}`,
      bookingId: params.bookingId,
      metadata: {
        customerName: params.customerName,
        amount: params.amount,
        reason: params.reason,
      },
    });
  }

  // ==========================================
  // D) PHASE 8: OWNER VERIFICATION & PAYOUT NOTIFICATIONS
  // ==========================================

  public async notifyOwnerVerificationStatus(params: {
    ownerId: number;
    status: 'approved' | 'rejected' | 'suspended';
    reason?: string;
  }) {
    let title = 'Turf Owner Verification Update';
    let message = '';
    if (params.status === 'approved') {
      title = 'Turf Owner Account Approved! 🏟️✅';
      message = 'Your Turf Owner verification has been approved by TurfBD administration. You now have full operational access to your Owner Dashboard, turf listings, slot controls, and payouts.';
    } else if (params.status === 'rejected') {
      title = 'Turf Owner Application Rejected ❌';
      message = `Your Turf Owner application was reviewed and rejected. Reason: ${params.reason || 'Missing or invalid documentation'}. Please update your profile or contact admin.`;
    } else if (params.status === 'suspended') {
      title = 'Turf Owner Account Suspended ⚠️';
      message = `Your Turf Owner operational privileges have been temporarily suspended. Reason: ${params.reason || 'Policy compliance review'}. Contact administration for resolution.`;
    }

    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'owner_verification_status',
      title,
      message,
      metadata: {
        status: params.status,
        reason: params.reason,
      },
    });
  }

  public async notifyTurfModerationStatus(params: {
    ownerId: number;
    turfId: number;
    turfName: string;
    status: 'approved' | 'rejected' | 'suspended';
    reason?: string;
  }) {
    let title = 'Turf Listing Moderation Update';
    let message = '';
    if (params.status === 'approved') {
      title = `Turf Listing Approved: ${params.turfName} 🏟️✅`;
      message = `Your venue "${params.turfName}" has been approved by administrators and is now live for public player bookings!`;
    } else if (params.status === 'rejected') {
      title = `Turf Listing Rejected: ${params.turfName} ❌`;
      message = `Your venue listing "${params.turfName}" was rejected. Reason: ${params.reason || 'Missing details or requirements'}. Please update the listing details.`;
    } else if (params.status === 'suspended') {
      title = `Turf Listing Suspended: ${params.turfName} ⚠️`;
      message = `Your venue listing "${params.turfName}" has been temporarily suspended from public discovery. Reason: ${params.reason || 'Administrative review'}.`;
    }

    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'admin_turf_moderated',
      title,
      message,
      turfId: params.turfId,
      metadata: {
        status: params.status,
        turfName: params.turfName,
        reason: params.reason,
      },
    });
  }

  public async notifyPayoutApproved(params: {
    ownerId: number;
    payoutId: number;
    amount: number;
    method: string;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'payout_approved',
      title: 'Payout Request Approved! 💳✅',
      message: `Your payout request #${params.payoutId} for ৳${params.amount.toLocaleString()} via ${params.method.toUpperCase()} has been approved and queued for disbursement.`,
      metadata: {
        payoutId: params.payoutId,
        amount: params.amount,
        method: params.method,
      },
    });
  }

  public async notifyPayoutRejected(params: {
    ownerId: number;
    payoutId: number;
    amount: number;
    reason: string;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'payout_rejected',
      title: 'Payout Request Rejected ❌',
      message: `Your payout request #${params.payoutId} for ৳${params.amount.toLocaleString()} was rejected. Reason: ${params.reason}. The balance remains available in your account.`,
      metadata: {
        payoutId: params.payoutId,
        amount: params.amount,
        reason: params.reason,
      },
    });
  }

  public async notifyPayoutDispatched(params: {
    ownerId: number;
    payoutId: number;
    amount: number;
    method: string;
    transactionReference?: string;
  }) {
    return this.createNotification({
      userId: params.ownerId,
      recipientRole: 'owner',
      type: 'payout_dispatched',
      title: 'Payout Dispatched & Transferred! 💰🎉',
      message: `Funds of ৳${params.amount.toLocaleString()} have been transferred to your ${params.method.toUpperCase()} account.${params.transactionReference ? ` Trx Ref: ${params.transactionReference}` : ''}`,
      metadata: {
        payoutId: params.payoutId,
        amount: params.amount,
        method: params.method,
        transactionReference: params.transactionReference,
      },
    });
  }
}

export const notificationService = new NotificationService();
