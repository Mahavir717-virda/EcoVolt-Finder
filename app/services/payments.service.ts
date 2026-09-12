/**
 * Payments Service (Mobile App)
 * Handles Razorpay & UPI payment initialization, signature verification, and invoice retrieval.
 */

import { apiRequest } from './api';

export interface CreatePaymentOrderPayload {
  bookingId?: string;
  sessionId?: string;
  amount?: number; // In INR (₹)
  paymentMethod?: string;
  purpose?: 'booking_deposit' | 'session_settlement' | 'wallet_topup';
  notes?: Record<string, string>;
}

export interface PaymentOrderResponse {
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id?: string;
  invoice_number?: string;
  purpose?: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_id?: string;
  session_id?: string;
}

export interface PaymentReceipt {
  invoiceNumber: string;
  paymentId: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  status: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  paidAt: string;

  // Driver Details
  driverName: string;
  driverEmail: string;
  vehicleModel?: string;
  vehicleClass?: string;

  // Station & Operator Details
  stationName: string;
  stationAddress: string;
  operatorName: string;
  gstin?: string;

  // Energy Metrics
  energyKwh?: number;
  tariffRatePerKwh?: number;
  baseAmount?: number;
  greenDiscountAmount?: number;
  gstAmount?: number;
  co2AvoidedKg?: number;
  renewablePct?: number;
  ecoPointsEarned?: number;
  durationFormatted?: string;
}

/**
 * Creates a Razorpay order on the backend server.
 */
export async function createPaymentOrder(
  payload: CreatePaymentOrderPayload
): Promise<PaymentOrderResponse | null> {
  try {
    const res = await apiRequest<any>('/payments/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res && res.razorpay_order_id) {
      return res as PaymentOrderResponse;
    }
    return null;
  } catch (error) {
    console.error('[PaymentsService] Error creating payment order:', error);
    throw error;
  }
}

/**
 * Verifies payment signature and settles transaction on server.
 */
export async function verifyPayment(
  payload: VerifyPaymentPayload
): Promise<{ success: boolean; message: string; receipt?: PaymentReceipt }> {
  try {
    const res = await apiRequest<any>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: res?.success ?? true,
      message: res?.message || 'Payment verified successfully',
      receipt: res?.receipt,
    };
  } catch (error: any) {
    console.error('[PaymentsService] Error verifying payment:', error);
    return {
      success: false,
      message: error?.message || 'Verification failed',
    };
  }
}

/**
 * Fetches Tax Invoice / Receipt details for a session or payment.
 */
export async function getPaymentReceipt(
  paymentOrSessionId: string
): Promise<PaymentReceipt | null> {
  try {
    const res = await apiRequest<any>(`/payments/receipt/${paymentOrSessionId}`, {
      method: 'GET',
    });

    return res?.receipt || null;
  } catch (error) {
    console.error('[PaymentsService] Error fetching receipt:', error);
    return null;
  }
}

/**
 * Fetches user payment history.
 */
export async function getUserPaymentHistory(): Promise<any[]> {
  try {
    const res = await apiRequest<any>('/payments/history', { method: 'GET' });
    return res?.payments || [];
  } catch (error) {
    console.error('[PaymentsService] Error fetching payment history:', error);
    return [];
  }
}
