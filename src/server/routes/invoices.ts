import { Router, Request, Response } from 'express';
import { db } from '../../db/index.ts';
import { invoices, bookings } from '../../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { invoiceService } from '../services/invoiceService.ts';

const router = Router();

/**
 * GET /api/invoices/:invoiceNumber
 * Retrieve invoice record and full itemized metadata
 */
router.get('/:invoiceNumber', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Failed to get invoice:', error);
    return res.status(500).json({ error: 'Failed to retrieve invoice' });
  }
});

/**
 * GET /api/invoices/booking/:bookingId
 * Retrieve the invoice generated for a specific booking
 */
router.get('/booking/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const [existing] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.bookingId, Number(bookingId)))
      .orderBy(desc(invoices.createdAt));

    if (!existing) {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(bookingId)));
      if (booking) {
        const generated = await invoiceService.createOrUpdateInvoice(booking.id);
        return res.json({ success: true, invoice: generated });
      }
      return res.status(404).json({ error: 'Invoice not found for this booking' });
    }

    const invoice = await invoiceService.getInvoiceByNumber(existing.invoiceNumber);
    return res.json({ success: true, invoice });
  } catch (error: any) {
    console.error('Failed to get invoice by booking ID:', error);
    return res.status(500).json({ error: 'Failed to retrieve booking invoice' });
  }
});

/**
 * GET /api/invoices/:invoiceNumber/html
 * Render high-fidelity printable digital tax invoice HTML
 */
router.get('/:invoiceNumber/html', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return res.status(404).send('<h2>Invoice not found</h2><p>The requested invoice does not exist or has expired.</p>');
    }

    const html = invoiceService.renderInvoiceHtml(invoice);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error: any) {
    console.error('Failed to render invoice HTML:', error);
    return res.status(500).send('<h2>Error rendering invoice</h2>');
  }
});

/**
 * GET /api/invoices/verify/:invoiceNumber
 * Public QR Code Verification endpoint
 * Used by turf managers, security or tax auditors to confirm ticket authenticity
 */
router.get('/verify/:invoiceNumber', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return res.status(404).json({
        verified: false,
        error: 'Invalid or counterfeit invoice number',
      });
    }

    return res.json({
      verified: true,
      invoiceNumber: invoice.invoiceNumber,
      bookingCode: invoice.bookingCode,
      turfName: invoice.turfDetails?.turfName || 'TurfBD Arena',
      customerName: invoice.customerDetails?.name || 'Customer',
      customerPhone: invoice.customerDetails?.phone || '',
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      dueAmount: invoice.dueAmount,
      currency: invoice.currency,
      paymentMethod: invoice.paymentDetails?.method || 'online',
      transactionId: invoice.paymentDetails?.transactionId || '',
      status: invoice.status,
      issuedAt: invoice.issuedAt,
    });
  } catch (error: any) {
    console.error('Failed to verify invoice:', error);
    return res.status(500).json({ verified: false, error: 'Verification error' });
  }
});

export default router;
