// payments.types.ts
// Shared types for the EcoVolt Payments module.

export interface CreatePaymentOrderInput {
  userId?: string;
  bookingId?: string;
  sessionId?: string;
  orderId?: string; // generic compatibility alias
  amount?: number;  // In INR (₹)
  paymentMethod?: string; // "razorpay" | "upi" | "card" | "wallet" | "netbanking"
  purpose?: 'booking_deposit' | 'session_settlement' | 'wallet_topup';
  notes?: Record<string, string>;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  orderId?: string;
  bookingId?: string;
  sessionId?: string;
  userId?: string;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string;
  receipt?: string;
}

export interface PaymentReceiptData {
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

  // Session & Clean Energy Metrics
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

export interface ApiResult<T = Record<string, unknown>> {
  body: { success: boolean; error?: string; [key: string]: unknown } & T;
  status: number;
}
