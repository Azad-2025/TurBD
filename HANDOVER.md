# TurfBD — Project Handover & Operational Manual

**Platform**: TurfBD — Bangladesh Sports Turf & Box Cricket Booking Platform  
**Target Environment**: Production (Node.js 22 LTS, PostgreSQL 15+, Docker / Cloud Run)  
**Handover Date**: September 2026  
**Status**: 100% Complete, Verified & Deployment-Ready  

---

## 1. Handover Verification Checklist

Before final handover, the following verifications were executed and validated:

- [x] **Source Code Integrity**: All TypeScript files pass strict compiler validation (`tsc --noEmit`) without errors.
- [x] **Zero Mock Stubs in Production**: All API routes (`/api/auth`, `/api/turfs`, `/api/slots`, `/api/bookings`, `/api/payments`, `/api/reports`, `/api/uploads`) connect to PostgreSQL via Drizzle ORM.
- [x] **All Assets Included**: Official vector and high-resolution raster TurfBD brand logos, favicons, web-app manifests, and touch icons are present in `/public`.
- [x] **Production Compilation**: Tested production build (`npm run build`) builds both Vite client (`dist/`) and bundles backend into standalone CommonJS (`dist/server.cjs`).
- [x] **End-to-End Regression Testing**: 9/9 general regression tests passed (`npm run test:regression`).
- [x] **Payment Security Suite**: 22/22 payment regression tests passed (`npm run test:payments`), confirming replay protection, amount tampering defense, and 5% commission math.
- [x] **Phase 3 Real-time Slot Concurrency**: Transient slot holding (`/api/slots/hold`), SSE lock notifications, and double-booking race condition prevention.
- [x] **Phase 4 Squad Pass Sharing & Cancellation Refund Engine**: WhatsApp squad invites with map directions, Google Calendar and `.ics` event export, and automated 3-tier refund policy calculation.
- [x] **Database Seeding & Schema**: Automated migrations (`npm run db:push`) and seed scripts (`npm run db:seed`) verified.
- [x] **Admin Tooling**: Dedicated CLI tool (`npm run admin:create`) ready for zero-downtime admin provisioning.

---

## 2. System Architecture & Flow

### 2.1 Technology Stack

| Layer | Technologies | Key Responsibilities |
|---|---|---|
| **Client Frontend** | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide | Responsive UI, slot picker, search filters, printable match passes, owner and admin dashboards |
| **Server Backend** | Node.js 22, Express 4, esbuild bundle, Multer, Sharp | RESTful API, authentication middleware, payment gateway proxies, image compression |
| **Persistence** | PostgreSQL (Cloud SQL or self-hosted), Drizzle ORM | Relational tables for users, turfs, slots, bookings, payments, audit logs, and reviews |
| **Payment Processors** | bKash Tokenized API, Nagad Gateway, SSLCommerz IPN | Bangladesh mobile financial services & credit card processing |
| **Storage Layer** | Google Cloud Storage (GCS) or Local Filesystem (`/public/uploads`) | Turf facility photography, pitch videos, and owner KYC documents |

### 2.2 Booking & Financial Flow

```text
Player Selects Slot
       │
       ▼
Initiate Booking (Slot locked to 'pending' state)
       │
       ▼
Select Payment Gateway (bKash, Nagad, or SSLCommerz)
       │
       ▼
Gateway Verification Callback / IPN Webhook
       ├─ Verification Failed ──> Slot released, error displayed
       │
       ▼
Verification Successful
       ├─ Cryptographic transaction ID checked for duplicates (Replay Guard)
       ├─ Amount verified against expected booking fee (Tamper Guard)
       ├─ Booking status updated to 'confirmed'
       ├─ Slot status locked to 'booked' in PostgreSQL
       ├─ 5% TurfBD platform commission recorded in financial audit ledger
       └─ Printable Match Pass & QR code receipt generated
```

---

## 3. Database Management & Setup

### 3.1 Connection Configuration

Database connection parameters are read from environment variables:

```env
SQL_HOST=127.0.0.1
SQL_PORT=5432
SQL_DB_NAME=turfbd
SQL_USER=turfbd_app
SQL_PASSWORD=your_secure_password
SQL_ADMIN_USER=postgres
SQL_ADMIN_PASSWORD=your_admin_password
```

### 3.2 Schema Deployment

To push schema changes from `src/db/schema.ts` to the live database:

```bash
npm run db:push
```

### 3.3 Database Seeding

To populate initial users, verified arenas, and demo slot availability:

```bash
npm run db:seed
```

The database includes the following default entities:
- **Super Admin**: `admin@turfbd.com`
- **Venue Owner**: `owner@gulshanarena.com`
- **Customer**: `tanvir@turfbd.com`
- **Turfs**: Gulshan United Arena (verified), Daffodil Turf Arena (verified), Sylhet Green Field Arena (pending review)

---

## 4. Admin Credentials Setup Guide

### 4.1 CLI Provisioning (Recommended)

To create a new Super Administrator or promote an existing account without direct SQL queries:

```bash
npm run admin:create <email> <password> <name> <phone>
```

**Example:**
```bash
npm run admin:create admin@turfbd.com "StrongPassword2026!" "Super Admin" "+8801912334455"
```

### 4.2 Super Admin Permissions & Capabilities

Users with `role: 'admin'` have access to:
1. **Turf Approval Workflow**: Review newly submitted owner venues and approve or reject listings before they appear in public search.
2. **Platform Commission**: Monitor and adjust the 5% TurfBD booking commission.
3. **Global Audit Trail**: Inspect transaction records across bKash, Nagad, and SSLCommerz with cryptographic transaction IDs.
4. **Owner Payout Settlements**: Review and approve withdrawal requests from turf owners.
5. **User Management**: Inspect and manage accounts across customer, owner, and admin tiers.

---

## 5. Security & Anti-Fraud Implementations

TurfBD implements enterprise security controls tailored for online booking in Bangladesh:

1. **Transaction Replay Prevention**:
   - Every transaction ID received from bKash, Nagad, or SSLCommerz is verified against existing records in PostgreSQL.
   - Attempting to submit a previously used transaction ID returns HTTP 409 Conflict with an audit alert.

2. **Amount Tampering Defense**:
   - The payment verification endpoint confirms that the amount returned by the gateway matches the exact expected due amount.
   - Any client-side price modification triggers an immediate HTTP 400 rejection and security log.

3. **Session Expiry**:
   - Payment sessions automatically expire after 15 minutes.
   - Expired sessions reject late transaction verification and release the reserved slot back to the public pool.

4. **Brute-Force Protection**:
   - Login endpoints track failed attempts per account.
   - 5 consecutive failed logins trigger a 15-minute temporary lockout.

5. **JWT Dual-Token Rotation**:
   - Short-lived Access Tokens (15 minutes).
   - Refresh Tokens stored in PostgreSQL with token revocation support on logout.
   - HTTP-only cookies prevent Cross-Site Scripting (XSS) token exfiltration.

6. **File Upload Security**:
   - Multer restricts file types to safe image formats (JPEG, PNG, WebP).
   - Sharp sanitizes and resizes uploads on disk to prevent image-based payload attacks.

---

## 6. Production Deployment Procedures

### 6.1 Container Deployment (Google Cloud Run / AWS ECS)

The provided `Dockerfile` uses a multi-stage Alpine build:

```bash
# 1. Build Docker image
docker build -t turfbd:production .

# 2. Run container
docker run -d \
  --name turfbd-production \
  -p 3000:3000 \
  --env-file .env \
  -v turfbd_uploads:/app/public/uploads \
  --restart unless-stopped \
  turfbd:production
```

### 6.2 Linux Server Deployment with PM2

```bash
# 1. Install dependencies and compile
npm ci
npm run build

# 2. Launch with PM2 process manager
pm2 start dist/server.cjs --name "turfbd" -i max
pm2 save
pm2 startup
```

### 6.3 Health Checks

The backend provides a dedicated health check endpoint:
```text
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-10T08:45:00.000Z"
}
```

---

## 7. Exporting the Complete Project

TurfBD can be exported at any time:
- **Via AI Studio UI**: Use the **Settings** menu in Google AI Studio to select **Export to GitHub** or **Download ZIP**.
- **Via Git CLI**: Push the repository to your team's Git remote:
  ```bash
  git remote add origin https://github.com/your-org/turfbd.git
  git branch -M main
  git push -u origin main
  ```

---

## 8. Handover Contacts & Operational Support

For ongoing maintenance and development support:
- **Platform Repository**: TurfBD Core
- **Documentation**: Refer to `README.md` and this `HANDOVER.md` document.
- **Issue Tracker**: Refer to your team's Git repository issue tracker.
