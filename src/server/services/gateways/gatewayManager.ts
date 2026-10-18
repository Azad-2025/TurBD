import { bkashGateway } from './bkash.ts';
import { nagadGateway } from './nagad.ts';
import { sslcommerzGateway } from './sslcommerz.ts';

export type SupportedGateway = 'bkash' | 'nagad' | 'sslcommerz' | 'rocket' | 'cash' | 'cash_on_field';

export interface PaymentInitiateRequest {
  bookingId: number;
  bookingCode: string;
  turfName: string;
  amount: number;
  gateway: SupportedGateway;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  callbackBaseUrl: string;
}

export interface PaymentVerifyRequest {
  gateway: SupportedGateway;
  paymentId?: string;
  transactionId?: string;
  valId?: string;
  expectedAmount: number;
  bookingId: number;
}

export interface GatewayVerificationResult {
  verified: boolean;
  status: 'successful' | 'failed' | 'cancelled' | 'pending';
  transactionId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  message: string;
  gatewayRaw?: any;
}

// In-memory payment security tracker to prevent race conditions & fake duplicate TRX IDs
const processedTransactionIds = new Set<string>();

// Timeout window for pending checkout sessions: 15 minutes (in ms)
export const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

export class PaymentGatewayManager {
  /**
   * Check if a transaction ID has already been claimed / used
   */
  isDuplicateTransaction(trxId: string): boolean {
    if (!trxId) return false;
    const clean = trxId.trim().toUpperCase();
    return processedTransactionIds.has(clean);
  }

  /**
   * Register a verified transaction ID
   */
  registerTransaction(trxId: string): void {
    if (trxId) {
      processedTransactionIds.add(trxId.trim().toUpperCase());
    }
  }

  /**
   * Check if payment checkout session has timed out (> 15 minutes)
   */
  isPaymentTimedOut(createdAt: Date | string): boolean {
    const createdTime = new Date(createdAt).getTime();
    return Date.now() - createdTime > PAYMENT_TIMEOUT_MS;
  }

  /**
   * Initiate payment with the chosen Bangladesh payment gateway
   */
  async initiatePayment(req: PaymentInitiateRequest): Promise<{
    success: boolean;
    gateway: SupportedGateway;
    redirectUrl: string;
    gatewayPaymentId: string;
    amount: number;
    currency: string;
    expiresAt: string;
  }> {
    const expiresAt = new Date(Date.now() + PAYMENT_TIMEOUT_MS).toISOString();

    if (req.gateway === 'bkash') {
      const result = await bkashGateway.createPayment({
        amount: req.amount,
        bookingCode: req.bookingCode,
        callbackUrl: `${req.callbackBaseUrl}/api/payments/bkash/callback`,
        payerReference: req.customerPhone,
      });

      return {
        success: true,
        gateway: 'bkash',
        redirectUrl: result.bkashURL,
        gatewayPaymentId: result.paymentID,
        amount: req.amount,
        currency: 'BDT',
        expiresAt,
      };
    }

    if (req.gateway === 'nagad') {
      const result = await nagadGateway.initializePayment({
        amount: req.amount,
        orderId: req.bookingCode,
        callbackUrl: `${req.callbackBaseUrl}/api/payments/nagad/callback`,
        clientMobileNo: req.customerPhone,
      });

      return {
        success: true,
        gateway: 'nagad',
        redirectUrl: result.redirectUrl,
        gatewayPaymentId: result.paymentReferenceId,
        amount: req.amount,
        currency: 'BDT',
        expiresAt,
      };
    }

    if (req.gateway === 'sslcommerz') {
      const result = await sslcommerzGateway.initSession({
        totalAmount: req.amount,
        tranId: `TRX_SSL_${req.bookingCode}_${Date.now().toString().slice(-4)}`,
        turfName: req.turfName,
        customerName: req.customerName,
        customerEmail: req.customerEmail,
        customerPhone: req.customerPhone,
        successUrl: `${req.callbackBaseUrl}/api/payments/sslcommerz/success`,
        failUrl: `${req.callbackBaseUrl}/api/payments/sslcommerz/fail`,
        cancelUrl: `${req.callbackBaseUrl}/api/payments/sslcommerz/cancel`,
        ipnUrl: `${req.callbackBaseUrl}/api/payments/sslcommerz/ipn`,
      });

      return {
        success: true,
        gateway: 'sslcommerz',
        redirectUrl: result.gatewayPageURL,
        gatewayPaymentId: result.sessionkey,
        amount: req.amount,
        currency: 'BDT',
        expiresAt,
      };
    }

    // Cash on Field or Rocket fallback
    const fallbackTrxId = `CASH_${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      gateway: req.gateway,
      redirectUrl: `${req.callbackBaseUrl}/?bookingSuccess=${req.bookingId}`,
      gatewayPaymentId: fallbackTrxId,
      amount: req.amount,
      currency: 'BDT',
      expiresAt,
    };
  }

  /**
   * Strictly verify payment on the server side
   */
  async verifyPayment(req: PaymentVerifyRequest): Promise<GatewayVerificationResult> {
    const { gateway, paymentId, transactionId, valId, expectedAmount } = req;

    // 1. Double check duplicate transaction ID
    if (transactionId && this.isDuplicateTransaction(transactionId)) {
      return {
        verified: false,
        status: 'failed',
        transactionId: transactionId || '',
        amount: expectedAmount,
        currency: 'BDT',
        message: 'Security Alert: This transaction ID has already been redeemed or claimed.',
      };
    }

    // 2. Route to server-side gateway verification
    if (gateway === 'bkash') {
      const result = await bkashGateway.executePayment(paymentId || `BK_${Date.now()}`, expectedAmount);
      if (result.transactionStatus === 'Completed') {
        if (expectedAmount && Math.abs(result.amount - expectedAmount) > 0.01) {
          return {
            verified: false,
            status: 'failed',
            transactionId: result.trxID || '',
            amount: result.amount,
            currency: 'BDT',
            message: `Amount mismatch detected: Expected BDT ${expectedAmount} but provider returned BDT ${result.amount}.`,
          };
        }
        this.registerTransaction(result.trxID);
        return {
          verified: true,
          status: 'successful',
          transactionId: result.trxID,
          gatewayPaymentId: result.paymentID,
          amount: result.amount,
          currency: result.currency,
          message: 'bKash payment successfully verified by server.',
          gatewayRaw: result,
        };
      } else {
        return {
          verified: false,
          status: 'failed',
          transactionId: result.trxID || '',
          amount: result.amount,
          currency: 'BDT',
          message: 'bKash checkout failed or was not completed by user.',
        };
      }
    }

    if (gateway === 'nagad') {
      const result = await nagadGateway.verifyPayment(paymentId || `NAGAD_${Date.now()}`, expectedAmount);
      if (result.status === 'Completed') {
        if (expectedAmount && Math.abs(result.amount - expectedAmount) > 0.01) {
          return {
            verified: false,
            status: 'failed',
            transactionId: result.trxID || '',
            amount: result.amount,
            currency: 'BDT',
            message: `Amount mismatch detected: Expected BDT ${expectedAmount} but provider returned BDT ${result.amount}.`,
          };
        }
        this.registerTransaction(result.trxID);
        return {
          verified: true,
          status: 'successful',
          transactionId: result.trxID,
          gatewayPaymentId: result.paymentReferenceId,
          amount: result.amount,
          currency: result.currency,
          message: 'Nagad payment verified by server.',
          gatewayRaw: result,
        };
      } else {
        return {
          verified: false,
          status: 'failed',
          transactionId: result.trxID || '',
          amount: result.amount,
          currency: 'BDT',
          message: 'Nagad payment verification failed.',
        };
      }
    }

    if (gateway === 'sslcommerz') {
      const result = await sslcommerzGateway.validateTransaction(
        valId || `VAL_${Date.now()}`,
        transactionId || `SSL_${Date.now()}`,
        expectedAmount
      );
      if (result.status === 'Completed') {
        if (expectedAmount && Math.abs(result.amount - expectedAmount) > 0.01) {
          return {
            verified: false,
            status: 'failed',
            transactionId: result.bankTranId || '',
            amount: result.amount,
            currency: 'BDT',
            message: `Amount mismatch detected: Expected BDT ${expectedAmount} but provider returned BDT ${result.amount}.`,
          };
        }
        this.registerTransaction(result.bankTranId);
        return {
          verified: true,
          status: 'successful',
          transactionId: result.bankTranId,
          gatewayPaymentId: result.valId,
          amount: result.amount,
          currency: result.currency,
          message: 'SSLCommerz transaction verified by server.',
          gatewayRaw: result,
        };
      } else {
        return {
          verified: false,
          status: 'failed',
          transactionId: result.bankTranId || '',
          amount: result.amount,
          currency: 'BDT',
          message: 'SSLCommerz transaction validation failed.',
        };
      }
    }

    // Cash on Field (reception cash payment)
    const cashTrxId = transactionId || `CASH_${Date.now().toString().slice(-6)}`;
    return {
      verified: true,
      status: 'successful',
      transactionId: cashTrxId,
      gatewayPaymentId: cashTrxId,
      amount: expectedAmount,
      currency: 'BDT',
      message: 'Cash payment registered for match.',
    };
  }

  /**
   * Refund payment through the original gateway
   */
  async refundPayment(gateway: SupportedGateway, params: {
    paymentId: string;
    amount: number;
    trxId: string;
    reason?: string;
  }): Promise<{ success: boolean; refundTrxId: string; message: string }> {
    if (gateway === 'bkash') {
      const res = await bkashGateway.refundPayment({
        paymentID: params.paymentId,
        amount: params.amount,
        trxID: params.trxId,
        reason: params.reason,
      });
      return {
        success: res.status === 'Completed',
        refundTrxId: res.refundTrxID,
        message: 'Refund issued via bKash Merchant API.',
      };
    }

    if (gateway === 'nagad') {
      const res = await nagadGateway.refundPayment({
        originalTrxId: params.trxId,
        amount: params.amount,
        reason: params.reason,
      });
      return {
        success: res.status === 'Completed',
        refundTrxId: res.refundTrxId,
        message: 'Refund issued via Nagad DFS API.',
      };
    }

    if (gateway === 'sslcommerz') {
      const res = await sslcommerzGateway.refundPayment({
        bankTranId: params.trxId,
        amount: params.amount,
        remarks: params.reason,
      });
      return {
        success: res.status === 'Completed',
        refundTrxId: res.refundRefId,
        message: 'Refund issued via SSLCommerz Refund API.',
      };
    }

    return {
      success: true,
      refundTrxId: `REF_${Date.now().toString().slice(-6)}`,
      message: 'Cash/Offline refund recorded.',
    };
  }
}

export const gatewayManager = new PaymentGatewayManager();
