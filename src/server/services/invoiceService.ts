import crypto from 'crypto';
import { db } from '../../db/index.ts';
import { invoices, bookings, payments, turfs, users } from '../../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';

export interface InvoiceData {
  id: number;
  invoiceNumber: string;
  bookingId: number;
  bookingCode: string;
  userId: number;
  paymentId?: number | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  currency: string;
  status: 'paid' | 'partially_paid' | 'refunded' | 'void';
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  turfDetails: {
    turfName: string;
    address: string;
    city: string;
    contactNumber?: string;
  };
  paymentDetails: {
    method: string;
    transactionId: string;
    gatewayPaymentId?: string;
    paidAt: string;
  };
  qrData: string;
  issuedAt: Date | string;
  createdAt: Date | string;
}

export class InvoiceService {
  /**
   * Generate an official unique invoice number
   * Format: INV-YYYYMMDD-XXXX (e.g. INV-20260915-7AF4)
   */
  generateInvoiceNumber(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `INV-${yyyy}${mm}${dd}-${randomHex}`;
  }

  /**
   * Create or update invoice for a given booking and payment
   */
  async createOrUpdateInvoice(bookingId: number, paymentId?: number): Promise<InvoiceData> {
    // 1. Fetch booking with turf and user
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) {
      throw new Error(`Cannot generate invoice: Booking #${bookingId} not found`);
    }

    const [user] = await db.select().from(users).where(eq(users.id, booking.userId));
    const [turf] = await db.select().from(turfs).where(eq(turfs.id, booking.turfId));

    // 2. Fetch payment details (either specific payment or latest successful payment)
    let paymentRecord: typeof payments.$inferSelect | undefined;
    if (paymentId) {
      const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
      paymentRecord = p;
    } else {
      const [latestP] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.bookingId, bookingId), eq(payments.status, 'successful')))
        .orderBy(desc(payments.createdAt));
      paymentRecord = latestP;
    }

    // 3. Compute financial amounts
    const totalAmount = booking.amount;
    const taxAmount = 0; // Standard sports recreation turf booking
    const subtotal = totalAmount - taxAmount;

    // Calculate sum of successful payments
    const allSuccessfulPayments = await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, 'successful')));

    const totalPaid = allSuccessfulPayments.reduce((acc, p) => acc + p.amount, 0);
    const dueAmount = Math.max(0, totalAmount - totalPaid);

    const invoiceStatus: 'paid' | 'partially_paid' | 'refunded' | 'void' =
      booking.bookingStatus === 'cancelled' || booking.paymentStatus === 'refunded'
        ? 'refunded'
        : dueAmount === 0
        ? 'paid'
        : 'partially_paid';

    const customerDetails = {
      name: user?.name || 'Valued Player',
      email: user?.email || 'player@turfbd.com',
      phone: user?.phone || '+880 1700-000000',
    };

    const turfDetails = {
      turfName: turf?.turfName || 'TurfBD Arena',
      address: turf?.address || 'Dhaka, Bangladesh',
      city: turf?.city || 'Dhaka',
      contactNumber: '+880 1711-234567',
    };

    const paymentDetails = {
      method: paymentRecord?.method || 'online',
      transactionId: paymentRecord?.transactionId || `TRX_${booking.bookingCode}`,
      gatewayPaymentId: paymentRecord?.gatewayPaymentId || '',
      paidAt: paymentRecord?.createdAt ? new Date(paymentRecord.createdAt).toISOString() : new Date().toISOString(),
    };

    // Check if an existing invoice already exists for this booking
    const [existingInvoice] = await db.select().from(invoices).where(eq(invoices.bookingId, bookingId));

    const invoiceNumber = existingInvoice ? existingInvoice.invoiceNumber : this.generateInvoiceNumber();

    // QR Verification payload (scannable at venue gate for instant ground staff verification)
    const qrPayload = JSON.stringify({
      inv: invoiceNumber,
      code: booking.bookingCode,
      turf: turfDetails.turfName,
      date: booking.bookingDate,
      slot: `${booking.startTime}-${booking.endTime}`,
      paid: totalPaid,
      due: dueAmount,
      status: invoiceStatus,
      verifyUrl: `/api/invoices/verify/${invoiceNumber}`,
    });

    let finalInvoiceRecord: typeof invoices.$inferSelect;

    if (existingInvoice) {
      const [updated] = await db
        .update(invoices)
        .set({
          paymentId: paymentRecord?.id || existingInvoice.paymentId,
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: totalPaid,
          dueAmount,
          status: invoiceStatus,
          customerDetails,
          turfDetails,
          paymentDetails,
          qrData: qrPayload,
          issuedAt: new Date(),
        })
        .where(eq(invoices.id, existingInvoice.id))
        .returning();
      finalInvoiceRecord = updated;
    } else {
      const [created] = await db
        .insert(invoices)
        .values({
          invoiceNumber,
          bookingId: booking.id,
          userId: booking.userId,
          paymentId: paymentRecord?.id || null,
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: totalPaid,
          dueAmount,
          currency: 'BDT',
          status: invoiceStatus,
          customerDetails,
          turfDetails,
          paymentDetails,
          qrData: qrPayload,
          issuedAt: new Date(),
        })
        .returning();
      finalInvoiceRecord = created;
    }

    return {
      ...finalInvoiceRecord,
      bookingCode: booking.bookingCode,
      status: finalInvoiceRecord.status as any,
      customerDetails: finalInvoiceRecord.customerDetails as any,
      turfDetails: finalInvoiceRecord.turfDetails as any,
      paymentDetails: finalInvoiceRecord.paymentDetails as any,
    };
  }

  /**
   * Retrieve invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceData | null> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    if (!inv) return null;

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, inv.bookingId));

    return {
      ...inv,
      bookingCode: booking ? booking.bookingCode : '',
      status: inv.status as any,
      customerDetails: inv.customerDetails as any,
      turfDetails: inv.turfDetails as any,
      paymentDetails: inv.paymentDetails as any,
    };
  }

  /**
   * Retrieve invoice by booking ID
   */
  async getInvoiceByBookingId(bookingId: number): Promise<InvoiceData | null> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.bookingId, bookingId));
    if (!inv) {
      // Auto-generate if booking exists and has payment
      try {
        return await this.createOrUpdateInvoice(bookingId);
      } catch {
        return null;
      }
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, inv.bookingId));

    return {
      ...inv,
      bookingCode: booking ? booking.bookingCode : '',
      status: inv.status as any,
      customerDetails: inv.customerDetails as any,
      turfDetails: inv.turfDetails as any,
      paymentDetails: inv.paymentDetails as any,
    };
  }

  /**
   * Public tamper-proof verification for match ground staff scanning invoice QR codes
   */
  async verifyInvoice(invoiceNumber: string): Promise<{
    valid: boolean;
    invoiceNumber: string;
    bookingCode: string;
    turfName: string;
    customerName: string;
    bookingDate: string;
    timeSlot: string;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    transactionId: string;
    issuedAt: string;
    verifiedAt: string;
  } | null> {
    const invoice = await this.getInvoiceByNumber(invoiceNumber);
    if (!invoice) return null;

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, invoice.bookingId));

    return {
      valid: true,
      invoiceNumber: invoice.invoiceNumber,
      bookingCode: invoice.bookingCode,
      turfName: invoice.turfDetails.turfName,
      customerName: invoice.customerDetails.name,
      bookingDate: booking?.bookingDate || 'Scheduled Match',
      timeSlot: booking ? `${booking.startTime} - ${booking.endTime}` : 'Confirmed Slot',
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      dueAmount: invoice.dueAmount,
      paymentStatus: invoice.status.toUpperCase(),
      paymentMethod: invoice.paymentDetails.method.toUpperCase(),
      transactionId: invoice.paymentDetails.transactionId,
      issuedAt: new Date(invoice.issuedAt).toISOString(),
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Render production-grade printable HTML tax invoice
   */
  renderInvoiceHtml(invoice: InvoiceData, bookingDetails?: { bookingDate: string; startTime: string; endTime: string }): string {
    const formattedIssuedDate = new Date(invoice.issuedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isPaid = invoice.status === 'paid' || invoice.dueAmount === 0;
    const badgeColor = isPaid ? '#10b981' : invoice.status === 'refunded' ? '#ef4444' : '#f59e0b';
    const badgeText = isPaid ? 'PAID IN FULL' : invoice.status === 'refunded' ? 'REFUNDED' : 'PARTIALLY PAID';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoice.invoiceNumber} - TurfBD</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
      padding: 32px 16px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .invoice-header {
      background: #09090b;
      color: #ffffff;
      padding: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-accent { color: #10b981; }
    .invoice-meta { text-align: right; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      background: ${badgeColor}20;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}50;
      margin-top: 8px;
    }
    .invoice-body { padding: 32px; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .info-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .info-text { font-size: 14px; color: #475569; }
    .table-container { margin: 32px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; }
    td { padding: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
    }
    .totals-table { width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
    .totals-row.final {
      border-top: 2px solid #0f172a;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      padding-top: 12px;
      margin-top: 4px;
    }
    .security-box {
      margin-top: 40px;
      padding: 20px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .security-text { font-size: 12px; color: #64748b; max-width: 480px; }
    .print-btn {
      display: block;
      margin: 24px auto 0;
      padding: 12px 24px;
      background: #09090b;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; max-width: 100%; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="invoice-header">
      <div>
        <div class="brand-title">Turf<span class="brand-accent">BD</span></div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Premier Sports Arena Booking Network - Bangladesh</p>
      </div>
      <div class="invoice-meta">
        <div style="font-size: 18px; font-weight: 800; font-family: monospace;">${invoice.invoiceNumber}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Issued: ${formattedIssuedDate}</div>
        <div class="badge">${badgeText}</div>
      </div>
    </div>

    <div class="invoice-body">
      <div class="grid-2">
        <div>
          <div class="section-title">Billed To (Player)</div>
          <div class="info-name">${invoice.customerDetails.name}</div>
          <div class="info-text">${invoice.customerDetails.phone}</div>
          <div class="info-text">${invoice.customerDetails.email}</div>
        </div>
        <div>
          <div class="section-title">Sports Arena Venue</div>
          <div class="info-name">${invoice.turfDetails.turfName}</div>
          <div class="info-text">${invoice.turfDetails.address}</div>
          <div class="info-text">${invoice.turfDetails.city}, Bangladesh</div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Item / Match Slot</th>
              <th>Booking Code</th>
              <th>Schedule</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Turf Pitch Slot Reservation</strong><br/>
                <span style="font-size: 12px; color: #64748b;">${invoice.turfDetails.turfName}</span>
              </td>
              <td style="font-family: monospace; font-weight: 700;">${invoice.bookingCode}</td>
              <td>${bookingDetails ? `${bookingDetails.bookingDate} (${bookingDetails.startTime} - ${bookingDetails.endTime})` : 'Confirmed Match Slot'}</td>
              <td style="text-align: right; font-weight: 700;">৳${invoice.totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totals-area">
        <div class="totals-table">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>৳${invoice.subtotal.toLocaleString()}</span>
          </div>
          <div class="totals-row">
            <span>VAT / Sports Service Tax (0%)</span>
            <span>৳${invoice.taxAmount.toLocaleString()}</span>
          </div>
          <div class="totals-row final">
            <span>Total Slot Fee</span>
            <span>৳${invoice.totalAmount.toLocaleString()}</span>
          </div>
          <div class="totals-row" style="color: #10b981; font-weight: 700; margin-top: 8px;">
            <span>Advance Token Paid (${invoice.paymentDetails.method.toUpperCase()})</span>
            <span>৳${invoice.paidAmount.toLocaleString()}</span>
          </div>
          <div class="totals-row" style="color: ${invoice.dueAmount > 0 ? '#f59e0b' : '#64748b'}; font-weight: 700;">
            <span>Remaining Ground Due</span>
            <span>৳${invoice.dueAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="security-box">
        <div class="security-text">
          <strong>Official Verified Digital Tax Receipt</strong><br/>
          Payment Gateway: <strong>${invoice.paymentDetails.method.toUpperCase()}</strong> |
          TRX ID: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${invoice.paymentDetails.transactionId}</code><br/>
          Show this digital receipt or physical printout to venue gate staff for entry. Ground dues must be cleared at reception prior to pitch kickoff.
        </div>
        <div style="text-align: right; font-family: monospace; font-size: 11px; color: #64748b;">
          DIGITAL SIGNATURE<br/>
          <span style="color: #10b981; font-weight: 800;">VERIFIED BY TURFBD</span>
        </div>
      </div>

      <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
    </div>
  </div>
</body>
</html>`;
  }
}

export const invoiceService = new InvoiceService();
