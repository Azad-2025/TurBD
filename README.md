# TurfBD — Sports Turf & Box Cricket Booking Platform

[![Platform](https://img.shields.io/badge/Platform-TurfBD%20Bangladesh-059669.svg)](https://turfbd.com)
[![Node](https://img.shields.io/badge/Node.js-20%2B%20%7C%2022-blue.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B%20%7C%20Cloud%20SQL-336791.svg)](https://www.postgresql.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com)

TurfBD is Bangladesh's premier, full-stack sports arena and box cricket slot booking ecosystem. Built with a high-performance React 19 single-page application frontend, an Express + TypeScript API engine, and a PostgreSQL persistence layer backed by Drizzle ORM.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Project Directory Structure](#project-directory-structure)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Database Setup & Migrations](#database-setup--migrations)
5. [Admin Credentials Setup Guide](#admin-credentials-setup-guide)
6. [Local Development & Quick Start](#local-development--quick-start)
7. [Production Deployment Instructions](#production-deployment-instructions)
8. [Automated Regression & Payment Test Suites](#automated-regression--payment-test-suites)
9. [Payment Gateway Integration Guide](#payment-gateway-integration-guide)
10. [Exporting the Project](#exporting-the-project)

---

## Architectural Overview

- **Frontend**: React 19 + TypeScript, Tailwind CSS v4, Lucide React icons, Motion animations.
- **Backend**: Node.js + Express 4, compiled via Vite & bundled with `esbuild` for zero-overhead CJS production execution (`dist/server.cjs`).
- **Database**: PostgreSQL (Cloud SQL or self-hosted) with Drizzle ORM for type-safe schema definitions and relation mappings.
- **Authentication**: Dual-token JWT (Access Token + Refresh Token with rotation), bcrypt password hashing, phone OTP verification, plus Google and Facebook OAuth providers.
- **Payment Gateways**: Native integrations for **bKash** (Tokenized Checkout API), **Nagad** (PG API), and **SSLCommerz** (Session & IPN Webhook validation) with tamper-proofing and replay protection.
- **File Storage**: Dual-tier storage supporting local disk storage with Sharp image resizing/optimization or Google Cloud Storage (GCS) buckets.

---

## Project Directory Structure

```text
turfbd/
├── .env.example                 # Production & development environment variable templates
├── .gitignore                   # Git exclusion rules
├── .dockerignore                # Docker build context filters
├── Dockerfile                   # Multi-stage production container build manifest
├── README.md                    # Core project documentation & handover guide
├── HANDOVER.md                  # Comprehensive operational handover specification
├── package.json                 # Project dependencies, scripts, and runtime engines
├── server.ts                    # Main Express backend server & Vite middleware entry
├── vite.config.ts               # Vite configuration with Tailwind CSS plugin
├── tsconfig.json                # TypeScript compiler options
├── metadata.json                # AI Studio application metadata & frame permissions
├── index.html                   # HTML entry point with TurfBD meta tags and favicons
│
├── public/                      # Static assets served by Express and Vite
│   ├── favicon.svg              # Official vector TurfBD brand icon
│   ├── favicon-32x32.png        # Standard browser favicon
│   ├── apple-touch-icon.png     # iOS home screen web-clip icon
│   ├── logo.svg                 # Full vector TurfBD brand mark & typography
│   ├── logo.png                 # High-resolution raster logo (transparent PNG)
│   ├── logo-dark.png            # Dark-variant TurfBD logo
│   └── uploads/                 # Local directory for venue photos and owner KYC documents
│
├── src/                         # Application Source Code
│   ├── App.tsx                  # Root React application layout, modals & router logic
│   ├── main.tsx                 # React DOM client bootstrap
│   ├── index.css                # Global stylesheet with Tailwind CSS rules
│   ├── types.ts                 # Central TypeScript interfaces, types & data models
│   │
│   ├── components/              # Modular UI components
│   │   ├── Navbar.tsx           # Responsive navigation header with active role badges
│   │   ├── TurfBDLogo.tsx       # Standardized brand logo component (variants & sizes)
│   │   ├── LoadingSplash.tsx    # Branded pulse loading splash screen
│   │   ├── SearchBar.tsx        # City, area, sport, and date filter controls
│   │   ├── TurfCard.tsx         # Arena presentation card with rates and amenities
│   │   ├── TurfDetailModal.tsx  # Detailed venue profile, image gallery & reviews
│   │   ├── BookingModal.tsx     # Slot selection, advance/full payment selection
│   │   ├── PaymentGatewayModal.tsx # bKash, Nagad & SSLCommerz checkout modal
│   │   ├── PaymentReceiptModal.tsx # Printable verified voucher & QR match pass
│   │   ├── BookingDetailsModal.tsx # Full booking details & voucher presentation
│   │   ├── CancellationModal.tsx   # Automated booking cancellation & refund request
│   │   ├── MyBookings.tsx       # Player booking history & match status cards
│   │   ├── OwnerDashboard.tsx   # Venue owner management portal & payout requests
│   │   ├── AdminPanel.tsx       # Super Admin operations, venue verification & audits
│   │   └── ReviewSection.tsx    # Customer rating submission & verified feedback
│   │
│   ├── context/
│   │   └── AppContext.tsx       # Global React state management with PostgreSQL sync
│   │
│   ├── services/
│   │   └── api.ts               # Client-side HTTP API client with auth token headers
│   │
│   ├── data/
│   │   └── mockData.ts          # Offline fallback seed fixtures & demo records
│   │
│   ├── db/                      # PostgreSQL Database & Drizzle ORM
│   │   ├── schema.ts            # Drizzle relational table definitions & relations
│   │   ├── index.ts             # Pooled PostgreSQL connection instance
│   │   └── drizzle.config.ts    # Drizzle Kit CLI migration configuration
│   │
│   └── server/                  # Backend Express Controllers & Services
│       ├── middleware/
│       │   └── auth.ts          # JWT verification & role authorization (owner/admin)
│       ├── routes/
│       │   ├── auth.ts          # Sign in, sign up, OTP, OAuth, refresh tokens
│       │   ├── turfs.ts         # Turf listing, creation, updates & admin verification
│       │   ├── slots.ts         # Real-time slot availability, locking & management
│       │   ├── bookings.ts      # Slot booking, confirmation & conflict prevention
│       │   ├── payments.ts      # Gateways, callbacks, IPN webhooks, refunds & audit
│       │   ├── reviews.ts       # Player ratings & verified customer feedback
│       │   ├── reports.ts       # Super admin business analytics & revenue reports
│       │   └── uploads.ts       # Multipart file upload handler with Sharp compression
│       ├── services/gateways/
│       │   ├── bkash.ts         # bKash Tokenized Checkout API integration
│       │   ├── nagad.ts         # Nagad Merchant Payment integration
│       │   ├── sslcommerz.ts    # SSLCommerz Hosted Session & IPN Validator
│       │   └── gatewayManager.ts# Unified payment gateway dispatch interface
│       └── utils/
│           ├── auth.ts          # Token generators, cookie handlers, rate limiters
│           └── storage.ts       # Cloud Storage and local disk file abstraction
│
├── scripts/                     # Operational, Seeding & Testing Automation
│   ├── seed.ts                  # Idempotent PostgreSQL seeder (users, turfs, slots)
│   ├── create_admin.ts          # CLI provisioning script for Super Admin accounts
│   └── regression_test.ts       # End-to-end regression test suite (9 test suites)
│
└── test_payment_regression.ts   # Comprehensive payment & security test suite (22 test suites)
```

---

## Environment Variables Reference

Create a `.env` file in the root directory (or inject variables via your hosting provider's secrets manager):

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Node execution environment |
| `PORT` | Yes | `3000` | HTTP server port |
| `APP_URL` | Yes | `https://turfbd.com` | Base public URL for redirects & webhooks |
| `SQL_HOST` | Yes | `127.0.0.1` | PostgreSQL database host |
| `SQL_PORT` | No | `5432` | PostgreSQL database port |
| `SQL_DB_NAME` | Yes | `turfbd` | PostgreSQL database name |
| `SQL_USER` | Yes | `turfbd_app` | PostgreSQL runtime database username |
| `SQL_PASSWORD` | Yes | `[SECURE_DB_PASSWORD]` | PostgreSQL runtime database password |
| `SQL_ADMIN_USER` | For CLI | `postgres` | Superuser for Drizzle migrations |
| `SQL_ADMIN_PASSWORD`| For CLI | `[SECURE_ADMIN_PASSWORD]` | Superuser password for Drizzle migrations |
| `JWT_SECRET` | Yes | `[RANDOM_64_CHAR_HEX]` | Secret key used to sign access tokens (15m) |
| `JWT_REFRESH_SECRET`| Yes | `[RANDOM_64_CHAR_HEX]` | Secret key used to sign refresh tokens (7d) |
| `BKASH_APP_KEY` | Optional | `sandbox_app_key` | bKash Merchant App Key |
| `BKASH_APP_SECRET` | Optional | `sandbox_secret` | bKash Merchant App Secret |
| `BKASH_USERNAME` | Optional | `sandbox_user` | bKash API Username |
| `BKASH_PASSWORD` | Optional | `sandbox_pass` | bKash API Password |
| `BKASH_SANDBOX` | No | `true` | Set `false` for live production gateway |
| `NAGAD_MERCHANT_ID` | Optional | `68000100` | Nagad Merchant ID |
| `NAGAD_SANDBOX` | No | `true` | Set `false` for live production gateway |
| `SSLCOMMERZ_STORE_ID`| Optional| `turfbdlive001` | SSLCommerz Store ID |
| `SSLCOMMERZ_STORE_PASS`| Optional| `[STORE_PASSWORD]` | SSLCommerz Store Password |
| `SSLCOMMERZ_SANDBOX`| No | `true` | Set `false` for live production gateway |
| `GCS_BUCKET_NAME` | Optional | `turfbd-storage` | Google Cloud Storage bucket (local if unset) |
| `GOOGLE_CLIENT_ID` | Optional | `[GOOGLE_OAUTH_ID]` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET`| Optional | `[GOOGLE_SECRET]` | Google OAuth Client Secret |
| `FACEBOOK_APP_ID` | Optional | `[FB_APP_ID]` | Facebook Login App ID |
| `FACEBOOK_APP_SECRET` | Optional | `[FB_SECRET]` | Facebook Login App Secret |

---

## Database Setup & Migrations

TurfBD uses PostgreSQL with Drizzle ORM.

### 1. Create the Database in PostgreSQL

```bash
# Connect to PostgreSQL as admin
psql -U postgres -h localhost

# Create database and application user
CREATE DATABASE turfbd;
CREATE USER turfbd_app WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE turfbd TO turfbd_app;
\q
```

### 2. Push Schema to Database

Drizzle Kit synchronizes `src/db/schema.ts` directly into PostgreSQL:

```bash
npm run db:push
```

### 3. Seed Initial Demo Data

Seed standard administrator, venue owners, player accounts, featured venues, and booking slots:

```bash
npm run db:seed
```

---

## Admin Credentials Setup Guide

TurfBD includes a dedicated command-line utility for provisioning or upgrading Super Administrator accounts with zero manual database editing.

### Method 1: Using the Automated CLI Script

Run the following command in your terminal:

```bash
npm run admin:create <email> <password> <name> <phone>
```

**Example:**
```bash
npm run admin:create admin@turfbd.com "SuperSecret2026!" "Platform Administrator" "+8801912334455"
```

The script:
1. Validates input parameters and sanitizes the email.
2. Hashes the password with bcrypt (salt rounds = 10).
3. If the account does not exist, creates a new user with `role: 'admin'`, verified email, and verified phone.
4. If the account already exists, elevates the user's role to `'admin'`, resets lockouts, and updates credentials.

### Method 2: Default Pre-Seeded Super Admin

If you ran `npm run db:seed`, the following default administrator account is available:
- **Email**: `admin@turfbd.com`
- **Password**: `Password123!`
- **Role**: `admin`
- **Access Level**: Unrestricted access to Venue Verification, Global Booking Ledger, Financial Audits, Commission Settings, and User Management.

> **Security Note**: Before going live, immediately change the default password by running:
> `npm run admin:create admin@turfbd.com "NewStrongPassword" "Super Admin" "+8801912334455"`

---

## Local Development & Quick Start

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd turfbd
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Setup Database
```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The application will be accessible at: `http://localhost:3000`

---

## Production Deployment Instructions

### Option A: Google Cloud Run (Recommended Containerized Deployment)

1. Build and push the container image:
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/turfbd:latest .
```

2. Deploy the container to Cloud Run:
```bash
gcloud run deploy turfbd \
  --image gcr.io/[PROJECT_ID]/turfbd:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production \
  --add-cloudsql-instances [PROJECT_ID]:asia-southeast1:turfbd-db
```

### Option B: Docker / Docker Compose

Build and run using the included production `Dockerfile`:

```bash
# Build the Docker image
docker build -t turfbd:production .

# Run container with environment file
docker run -d \
  --name turfbd-app \
  -p 3000:3000 \
  --env-file .env \
  -v turfbd_uploads:/app/public/uploads \
  --restart unless-stopped \
  turfbd:production
```

### Option C: Direct Linux VPS (Ubuntu / Debian + PM2 + Nginx)

1. Build the production bundle:
```bash
npm run build
```
This produces:
- `dist/`: Optimized Vite client-side static bundle.
- `dist/server.cjs`: Self-contained, bundled CommonJS Express server.

2. Start the application with PM2:
```bash
npm install -g pm2
pm2 start dist/server.cjs --name "turfbd" -i max
pm2 save
pm2 startup
```

3. Nginx Reverse Proxy Configuration (`/etc/nginx/sites-available/turfbd`):
```nginx
server {
    listen 80;
    server_name turfbd.com www.turfbd.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name turfbd.com www.turfbd.com;

    ssl_certificate /etc/letsencrypt/live/turfbd.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/turfbd.com/privkey.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Automated Regression & Payment Test Suites

TurfBD comes pre-packaged with two end-to-end automated testing suites verifying all business-critical workflows:

### 1. General Regression Suite (9 Test Scenarios)
Tests health check, registration, login, phone OTP flow, venue listings, slot locking, double-booking prevention, owner dashboard, admin audit, and upload handlers:

```bash
npm run test:regression
```

### 2. Payment & Financial Integrity Suite (22 Test Scenarios)
Tests bKash tokenized flow, Nagad gateway, SSLCommerz hosted sessions, IPN webhooks, duplicate transaction replay prevention, amount tampering detection, expired session handling, owner revenue settlements, and 5% platform commission calculations:

```bash
npm run test:payments
```

---

## Payment Gateway Integration Guide

TurfBD features production-ready integrations for all three premier Bangladeshi payment methods:

1. **bKash (Tokenized Checkout API)**:
   - Implemented in `src/server/services/gateways/bkash.ts`.
   - Sandbox testing credentials provided by bKash developer portal.
   - Switch to live by setting `BKASH_SANDBOX=false` and inserting your live merchant keys in `.env`.

2. **Nagad (Online Payment Gateway)**:
   - Implemented in `src/server/services/gateways/nagad.ts`.
   - Generates merchant cryptographic transaction payloads.
   - Switch to live by setting `NAGAD_SANDBOX=false` and adding your registered `NAGAD_MERCHANT_ID`.

3. **SSLCommerz (Hosted Gateway & IPN Webhook)**:
   - Implemented in `src/server/services/gateways/sslcommerz.ts`.
   - Supports credit cards, debit cards, internet banking, and mobile banking.
   - Switch to live by setting `SSLCOMMERZ_SANDBOX=false` with your live `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASS`.

---

## Exporting the Project

To export this project for repository hosting (GitHub / GitLab / Bitbucket) or distribution:
1. In Google AI Studio, open the **Project Settings** menu on the top right.
2. Select **Export to GitHub** to link directly to your Git repository, or click **Download ZIP** to get a complete, self-contained project archive.
3. The archive contains all source code, public assets, database definitions, scripts, and Docker configuration files ready for deployment.
