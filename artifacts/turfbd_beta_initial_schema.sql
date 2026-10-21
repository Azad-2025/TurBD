-- ============================================================================
-- TurfBD Beta Database: Initial Schema Definition
-- Target Database: Neon PostgreSQL (turfbd-beta)
-- Dialect: PostgreSQL (15+)
-- Generated from: src/db/schema.ts via Drizzle Kit (postgresql dialect)
-- Scope: All 16 tables, primary keys, foreign keys, unique constraints, defaults,
--        sequences, JSONB structures, and the new 'uploads.storage_key' column.
-- Safety: 100% additive DDL (No DROP TABLE, DROP SCHEMA, or TRUNCATE statements).
-- Execution: Can be run safely within Neon SQL Editor or psql on a fresh database.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"profile_image" text,
	"location" text DEFAULT 'Dhaka, Bangladesh',
	"favorite_turfs" jsonb DEFAULT '[]'::jsonb,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"is_phone_verified" boolean DEFAULT false NOT NULL,
	"google_id" text,
	"facebook_id" text,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"owner_verification_status" text DEFAULT 'pending' NOT NULL,
	"owner_submitted_at" timestamp,
	"owner_reviewed_at" timestamp,
	"owner_reviewed_by" integer,
	"owner_approved_at" timestamp,
	"owner_approved_by" integer,
	"owner_rejected_at" timestamp,
	"owner_rejected_by" integer,
	"owner_rejection_reason" text,
	"owner_suspended_at" timestamp,
	"owner_suspended_by" integer,
	"owner_suspension_reason" text,
	"owner_documents" jsonb DEFAULT '[]'::jsonb,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- ----------------------------------------------------------------------------
-- 2. Table: auth_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "auth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);

-- ----------------------------------------------------------------------------
-- 3. Table: refresh_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);

-- ----------------------------------------------------------------------------
-- 4. Table: otp_codes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"code_hash" text,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"resend_count" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. Table: turfs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "turfs" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"turf_name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"area" text DEFAULT 'Dhaka' NOT NULL,
	"description" text,
	"latitude" double precision DEFAULT 23.8103,
	"longitude" double precision DEFAULT 90.4125,
	"venue_type" text DEFAULT 'outdoor' NOT NULL,
	"verified_badge" text DEFAULT 'turfbd_verified' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"main_image" text,
	"facility_images" jsonb DEFAULT '[]'::jsonb,
	"video_thumbnail" text,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"sport_type" jsonb DEFAULT '["football"]'::jsonb NOT NULL,
	"surface_type" text DEFAULT '50mm Synthetic Turf' NOT NULL,
	"amenities" jsonb DEFAULT '["Floodlights","Changing Room","Locker Room","Parking","Washroom"]'::jsonb NOT NULL,
	"price_per_hour" integer NOT NULL,
	"day_price_per_hour" integer,
	"night_price_per_hour" integer,
	"pricing_rules" jsonb DEFAULT '[]'::jsonb,
	"opening_time" text DEFAULT '06:00' NOT NULL,
	"closing_time" text DEFAULT '02:00' NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"suspension_reason" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"rating" double precision DEFAULT 4.8 NOT NULL,
	"review_count" integer DEFAULT 18 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 6. Table: slots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"turf_id" integer NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"reason" text,
	"blocked_by" integer,
	"blocked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. Table: slot_holds
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "slot_holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"turf_id" integer NOT NULL,
	"booking_date" text NOT NULL,
	"start_time" text NOT NULL,
	"user_id" integer NOT NULL,
	"held_until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. Table: bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"turf_id" integer NOT NULL,
	"slot_id" integer,
	"booking_date" text NOT NULL,
	"start_time" text DEFAULT '20:00' NOT NULL,
	"end_time" text DEFAULT '21:00' NOT NULL,
	"amount" integer NOT NULL,
	"advance_paid" integer DEFAULT 0 NOT NULL,
	"due_amount" integer DEFAULT 0 NOT NULL,
	"payment_status" text DEFAULT 'partially_paid' NOT NULL,
	"booking_status" text DEFAULT 'pending_approval' NOT NULL,
	"booking_code" text NOT NULL,
	"notes" text,
	"is_checked_in" boolean DEFAULT false NOT NULL,
	"checked_in_at" timestamp,
	"checked_in_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_code_unique" UNIQUE("booking_code")
);

-- ----------------------------------------------------------------------------
-- 9. Table: payments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"method" text NOT NULL,
	"transaction_id" text NOT NULL,
	"gateway_payment_id" text,
	"idempotency_key" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"gateway_response" jsonb,
	"error_message" text,
	"ipn_verified" boolean DEFAULT false NOT NULL,
	"refund_status" text DEFAULT 'none',
	"refund_trx_id" text,
	"refund_amount" integer DEFAULT 0,
	"refund_reason" text,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 10. Table: reviews
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"turf_id" integer NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"comment" text NOT NULL,
	"owner_reply" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 11. Table: uploads (Stores image URLs, thumbnail URLs, and storage_key)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"uploaded_by" integer NOT NULL,
	"turf_id" integer,
	"category" text NOT NULL,
	"original_name" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"storage_type" text DEFAULT 'cloudinary' NOT NULL,
	"storage_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 12. Table: notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"recipient_role" text DEFAULT 'customer' NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"booking_id" integer,
	"turf_id" integer,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 13. Table: invoices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"booking_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"payment_id" integer,
	"subtotal" integer NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"paid_amount" integer NOT NULL,
	"due_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"customer_details" jsonb,
	"turf_details" jsonb,
	"payment_details" jsonb,
	"qr_data" text,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);

-- ----------------------------------------------------------------------------
-- 14. Table: disputes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"turf_id" integer NOT NULL,
	"reason" text NOT NULL,
	"description" text NOT NULL,
	"requested_amount" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_notes" text,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"refund_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 15. Table: payouts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"account_number" text NOT NULL,
	"account_details" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"processed_at" timestamp,
	"requested_by" integer,
	"reviewed_by" integer,
	"processed_by" integer,
	"rejection_reason" text,
	"transaction_reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 16. Table: audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- Foreign Key Constraints
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "disputes" ADD CONSTRAINT "disputes_refund_id_payments_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "slot_holds" ADD CONSTRAINT "slot_holds_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "slot_holds" ADD CONSTRAINT "slot_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "slots" ADD CONSTRAINT "slots_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "slots" ADD CONSTRAINT "slots_blocked_by_users_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "turfs" ADD CONSTRAINT "turfs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "turfs" ADD CONSTRAINT "turfs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "uploads" ADD CONSTRAINT "uploads_turf_id_turfs_id_fk" FOREIGN KEY ("turf_id") REFERENCES "public"."turfs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
