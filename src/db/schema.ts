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
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  isPhoneVerified: boolean('is_phone_verified').default(false).notNull(),
  googleId: text('google_id'),
  facebookId: text('facebook_id'),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
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
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').default(0).notNull(),
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
  latitude: doublePrecision('latitude').default(23.8103),
  longitude: doublePrecision('longitude').default(90.4125),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  mainImage: text('main_image'),
  facilityImages: jsonb('facility_images').$type<string[]>().default([]),
  videoThumbnail: text('video_thumbnail'),
  documents: jsonb('documents').$type<{ type: string; url: string; name: string }[]>().default([]),
  sportType: jsonb('sport_type').$type<string[]>().default(['football']).notNull(),
  surfaceType: text('surface_type').notNull().default('50mm Synthetic Turf'),
  pricePerHour: integer('price_per_hour').notNull(),
  openingTime: text('opening_time').notNull().default('06:00'),
  closingTime: text('closing_time').notNull().default('02:00'),
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Payments Table
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' })
    .notNull(),
  method: text('method').notNull(), // 'bkash' | 'nagad' | 'rocket' | 'cash'
  transactionId: text('transaction_id').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('completed'), // 'completed' | 'pending' | 'failed'
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
  storageType: text('storage_type').notNull().default('gcs'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  turfs: many(turfs),
  bookings: many(bookings),
  reviews: many(reviews),
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
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
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
