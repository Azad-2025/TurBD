import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('customer'), // 'customer' | 'owner' | 'admin'
  profileImage: text('profile_image'),
  location: text('location').default('Dhaka, Bangladesh'),
  favoriteTurfs: jsonb('favorite_turfs').$type<number[]>().default([]),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  isPhoneVerified: boolean('is_phone_verified').default(false).notNull(),
  googleId: text('google_id'),
  facebookId: text('facebook_id'),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  // Phase 8: Turf Owner Verification & Security Lifecycle
  ownerVerificationStatus: text('owner_verification_status').default('pending').notNull(), // 'pending' | 'approved' | 'rejected' | 'suspended'
  ownerSubmittedAt: timestamp('owner_submitted_at'),
  ownerReviewedAt: timestamp('owner_reviewed_at'),
  ownerReviewedBy: integer('owner_reviewed_by'),
  ownerApprovedAt: timestamp('owner_approved_at'),
  ownerApprovedBy: integer('owner_approved_by'),
  ownerRejectedAt: timestamp('owner_rejected_at'),
  ownerRejectedBy: integer('owner_rejected_by'),
  ownerRejectionReason: text('owner_rejection_reason'),
  ownerSuspendedAt: timestamp('owner_suspended_at'),
  ownerSuspendedBy: integer('owner_suspended_by'),
  ownerSuspensionReason: text('owner_suspension_reason'),
  ownerDocuments: jsonb('owner_documents').$type<{ type: string; url: string; name: string }[]>().default([]),
  isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Refresh Tokens Table
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Phone OTP Codes Table
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  codeHash: text('code_hash'),
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  resendCount: integer('resend_count').default(0).notNull(),
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Auth Verification & Password Reset Tokens
export const authTokens = pgTable('auth_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull().unique(),
  type: text('type').notNull(), // 'email_verification' | 'password_reset'
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Turfs Table
export const turfs = pgTable('turfs', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  turfName: text('turf_name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  area: text('area').default('Dhaka').notNull(),
  description: text('description'),
  latitude: doublePrecision('latitude').default(23.8103),
  longitude: doublePrecision('longitude').default(90.4125),
  venueType: text('venue_type').default('outdoor').notNull(), // 'indoor' | 'outdoor' | 'rooftop' | 'covered'
  verifiedBadge: text('verified_badge').default('turfbd_verified').notNull(), // 'turfbd_verified' | 'gold_partner' | 'standard'
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  mainImage: text('main_image'),
  facilityImages: jsonb('facility_images').$type<string[]>().default([]),
  videoThumbnail: text('video_thumbnail'),
  documents: jsonb('documents').$type<{ type: string; url: string; name: string }[]>().default([]),
  sportType: jsonb('sport_type').$type<string[]>().default(['football']).notNull(),
  surfaceType: text('surface_type').notNull().default('50mm Synthetic Turf'),
  amenities: jsonb('amenities').$type<string[]>().default(['Floodlights', 'Changing Room', 'Locker Room', 'Parking', 'Washroom']).notNull(),
  pricePerHour: integer('price_per_hour').notNull(),
  // Phase 8: Peak, Morning/Day, & Night/Floodlight Pricing Configuration
  dayPricePerHour: integer('day_price_per_hour'),
  nightPricePerHour: integer('night_price_per_hour'),
  pricingRules: jsonb('pricing_rules').$type<{
    name: string;
    startTime: string;
    endTime: string;
    pricePerHour: number;
    type: 'default' | 'off_peak' | 'peak';
    daysOfWeek?: number[];
  }[]>().default([]),
  openingTime: text('opening_time').notNull().default('06:00'),
  closingTime: text('closing_time').notNull().default('02:00'),
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'suspended'
  rejectionReason: text('rejection_reason'),
  suspensionReason: text('suspension_reason'),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  rating: doublePrecision('rating').default(4.8).notNull(),
  reviewCount: integer('review_count').default(18).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isDemo: boolean('is_demo').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Slots Table
export const slots = pgTable('slots', {
  id: serial('id').primaryKey(),
  turfId: integer('turf_id')
    .references(() => turfs.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // 'YYYY-MM-DD'
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(), // 'HH:MM'
  status: text('status').notNull().default('available'), // 'available' | 'booked' | 'blocked'
  // Phase 8: Advanced Slot Management Reason & Audit
  reason: text('reason'), // 'Maintenance' | 'Private event' | 'Renovation' | 'Weather' | 'Temporary closure' | 'Other'
  blockedBy: integer('blocked_by').references(() => users.id, { onDelete: 'set null' }),
  blockedAt: timestamp('blocked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Bookings Table
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  turfId: integer('turf_id')
    .references(() => turfs.id, { onDelete: 'cascade' })
    .notNull(),
  slotId: integer('slot_id').references(() => slots.id, { onDelete: 'set null' }),
  bookingDate: text('booking_date').notNull(), // 'YYYY-MM-DD'
  startTime: text('start_time').notNull().default('20:00'),
  endTime: text('end_time').notNull().default('21:00'),
  amount: integer('amount').notNull(),
  advancePaid: integer('advance_paid').notNull().default(0),
  dueAmount: integer('due_amount').notNull().default(0),
  paymentStatus: text('payment_status').notNull().default('partially_paid'), // 'pending' | 'partially_paid' | 'paid' | 'refunded'
  bookingStatus: text('booking_status').notNull().default('pending_approval'), // 'pending_approval' | 'confirmed' | 'completed' | 'cancelled'
  bookingCode: text('booking_code').notNull().unique(),
  notes: text('notes'),
  isCheckedIn: boolean('is_checked_in').default(false).notNull(),
  checkedInAt: timestamp('checked_in_at'),
  checkedInBy: integer('checked_in_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4b. Slot Holds Table (Persistent reservation locks across server restarts)
export const slotHolds = pgTable('slot_holds', {
  id: serial('id').primaryKey(),
  turfId: integer('turf_id')
    .references(() => turfs.id, { onDelete: 'cascade' })
    .notNull(),
  bookingDate: text('booking_date').notNull(), // 'YYYY-MM-DD'
  startTime: text('start_time').notNull(), // 'HH:MM'
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  heldUntil: timestamp('held_until').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Payments Table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  method: text('method').notNull(), // 'bkash' | 'nagad' | 'sslcommerz' | 'rocket' | 'cash'
  transactionId: text('transaction_id').notNull(),
  gatewayPaymentId: text('gateway_payment_id'), // Provider payment/session ID (e.g. bKash paymentID, Nagad payment_ref_id, SSLCommerz val_id)
  idempotencyKey: text('idempotency_key'), // Unique key to prevent double charging/initiation
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('BDT'),
  status: text('status').notNull().default('initiated'), // 'initiated' | 'pending' | 'successful' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  gatewayResponse: jsonb('gateway_response'), // Securely stores raw gateway payload / validation receipt
  errorMessage: text('error_message'), // Stores failure or verification error reason for recovery
  ipnVerified: boolean('ipn_verified').default(false).notNull(), // IPN / Webhook confirmation flag
  refundStatus: text('refund_status').default('none'), // 'none' | 'pending' | 'refunded' | 'failed'
  refundTrxId: text('refund_trx_id'),
  refundAmount: integer('refund_amount').default(0),
  refundReason: text('refund_reason'),
  refundedAt: timestamp('refunded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5b. Invoices Table (Official digital tax invoices & receipts)
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(), // e.g. 'INV-20260915-ABCD'
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  paymentId: integer('payment_id')
    .references(() => payments.id, { onDelete: 'set null' }),
  subtotal: integer('subtotal').notNull(),
  taxAmount: integer('tax_amount').notNull().default(0), // 5% Sports & recreation VAT or zero-rated
  totalAmount: integer('total_amount').notNull(),
  paidAmount: integer('paid_amount').notNull(),
  dueAmount: integer('due_amount').notNull().default(0),
  currency: text('currency').notNull().default('BDT'),
  status: text('status').notNull().default('paid'), // 'paid' | 'partially_paid' | 'refunded' | 'void'
  customerDetails: jsonb('customer_details'), // Snapshot of customer name, phone, email
  turfDetails: jsonb('turf_details'), // Snapshot of venue name, location, contact
  paymentDetails: jsonb('payment_details'), // Snapshot of method, trxId, timestamp
  qrData: text('qr_data'), // Signed verification payload / verification URL
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Reviews Table
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  turfId: integer('turf_id')
    .references(() => turfs.id, { onDelete: 'cascade' })
    .notNull(),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  ownerReply: text('owner_reply'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Uploads Table (Stores image URLs, thumbnail URLs, uploaded_by, created_at)
export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  uploadedBy: integer('uploaded_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  turfId: integer('turf_id')
    .references(() => turfs.id, { onDelete: 'set null' }),
  category: text('category').notNull(), // 'main_image' | 'gallery' | 'facility' | 'video_thumbnail' | 'nid' | 'trade_license' | 'verification'
  originalName: text('original_name').notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  storageType: text('storage_type').notNull().default('cloudinary'), // 'cloudinary' | 'r2' | 'gcs' | 'local'
  storageKey: text('storage_key'), // stable asset identifier / Cloudinary public_id / R2 key
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Notifications Table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  recipientRole: text('recipient_role').notNull().default('customer'), // 'customer' | 'owner' | 'admin' | 'all'
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  turfId: integer('turf_id').references(() => turfs.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Payouts Table (Phase 8: Owner Payout Lifecycle)
export const payouts = pgTable('payouts', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  amount: integer('amount').notNull(),
  method: text('method').notNull(), // 'bkash' | 'nagad' | 'bank_transfer' | 'rocket'
  accountNumber: text('account_number').notNull(),
  accountDetails: jsonb('account_details').$type<{
    bankName?: string;
    branchName?: string;
    routingNumber?: string;
    accountTitle?: string;
  }>(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'dispatched' | 'rejected'
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  processedAt: timestamp('processed_at'),
  requestedBy: integer('requested_by')
    .references(() => users.id, { onDelete: 'set null' }),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  processedBy: integer('processed_by').references(() => users.id, { onDelete: 'set null' }),
  rejectionReason: text('rejection_reason'),
  transactionReference: text('transaction_reference'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Audit Logs Table (Phase 8: Security & Operations Audit Trail)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'owner_approved' | 'owner_rejected' | 'owner_suspended' | 'payout_requested' | 'payout_approved' | 'payout_dispatched' | 'payout_rejected' | 'slots_blocked' | 'slots_unblocked' | etc.
  targetType: text('target_type').notNull(), // 'user' | 'turf' | 'payout' | 'slot' | 'booking'
  targetId: text('target_id').notNull(),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Disputes & Refund Claims Table (Phase 9: Dispute & Refund Governance)
export const disputes = pgTable('disputes', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  turfId: integer('turf_id')
    .references(() => turfs.id, { onDelete: 'cascade' })
    .notNull(),
  reason: text('reason').notNull(), // 'venue_closed' | 'double_booked' | 'condition_unplayable' | 'wrong_charge' | 'other'
  description: text('description').notNull(),
  requestedAmount: integer('requested_amount').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'under_review' | 'resolved_refunded' | 'rejected'
  adminNotes: text('admin_notes'),
  resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  refundId: integer('refund_id').references(() => payments.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  turfs: many(turfs),
  bookings: many(bookings),
  reviews: many(reviews),
  notifications: many(notifications),
  invoices: many(invoices),
  payouts: many(payouts),
  auditLogs: many(auditLogs),
}));

export const turfsRelations = relations(turfs, ({ one, many }) => ({
  owner: one(users, {
    fields: [turfs.ownerId],
    references: [users.id],
  }),
  slots: many(slots),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const slotsRelations = relations(slots, ({ one }) => ({
  turf: one(turfs, {
    fields: [slots.turfId],
    references: [turfs.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  turf: one(turfs, {
    fields: [bookings.turfId],
    references: [turfs.id],
  }),
  slot: one(slots, {
    fields: [bookings.slotId],
    references: [slots.id],
  }),
  checkedInUser: one(users, {
    fields: [bookings.checkedInBy],
    references: [users.id],
  }),
  payments: many(payments),
  invoices: many(invoices),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  booking: one(bookings, {
    fields: [invoices.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [invoices.paymentId],
    references: [payments.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  turf: one(turfs, {
    fields: [reviews.turfId],
    references: [turfs.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [notifications.bookingId],
    references: [bookings.id],
  }),
  turf: one(turfs, {
    fields: [notifications.turfId],
    references: [turfs.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  owner: one(users, {
    fields: [payouts.ownerId],
    references: [users.id],
  }),
  requestedByUser: one(users, {
    fields: [payouts.requestedBy],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [payouts.reviewedBy],
    references: [users.id],
  }),
  processedByUser: one(users, {
    fields: [payouts.processedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

