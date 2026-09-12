/**
 * useRazorpayCheckout
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the official react-native-razorpay SDK.
 * 
 * Flow:
 *  1.  Call  initiatePayment({ amount, bookingId, ... })
 *  2.  Hook hits backend  POST /payments/create  → gets order_id
 *  3.  Opens the REAL Razorpay payment sheet natively (UPI, Cards, Netbanking, Wallets)
 *  4.  On success → hits backend  POST /payments/verify  → returns full receipt
 *  5.  Returns { receipt }  so caller can trigger PDF download
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {
  createPaymentOrder,
  verifyPayment,
  type PaymentReceipt,
  type CreatePaymentOrderPayload,
} from '@/services/payments.service';

const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_Tb9V6Z62rcOTWe';

export interface RazorpayPaymentOptions {
  /** Amount in INR (₹) — hook converts to paise internally */
  amount: number;
  bookingId?: string;
  sessionId?: string;
  stationName?: string;
  driverName?: string;
  driverEmail?: string;
  purpose?: CreatePaymentOrderPayload['purpose'];
}

export interface RazorpayResult {
  success: boolean;
  receipt?: PaymentReceipt;
  error?: string;
}

export function useRazorpayCheckout() {
  const [isLoading, setIsLoading] = useState(false);

  const initiatePayment = useCallback(
    async (opts: RazorpayPaymentOptions): Promise<RazorpayResult> => {
      setIsLoading(true);

      try {
        // ── 1. Create backend order ──────────────────────────────────────────
        const order = await createPaymentOrder({
          bookingId: opts.bookingId,
          sessionId: opts.sessionId,
          amount: opts.amount,
          paymentMethod: 'razorpay',
          purpose: opts.purpose ?? 'session_settlement',
        });

        if (!order || !order.razorpay_order_id) {
          throw new Error('Failed to create payment order. Please try again.');
        }

        // ── 2. Open the REAL Razorpay payment sheet ──────────────────────────
        const checkoutOptions: Record<string, any> = {
          description: `EV Charging – ${opts.stationName ?? 'EcoVolt Station'}`,
          image: 'https://i.imgur.com/3g7nmJC.png', // EcoVolt logo URL
          currency: order.currency ?? 'INR',
          key: order.key_id ?? RAZORPAY_KEY_ID,
          amount: String(order.amount_paise), // paise (string required by SDK)
          order_id: order.razorpay_order_id,
          name: 'EcoVolt Charging',
          prefill: {
            email: opts.driverEmail && opts.driverEmail.length > 0 ? opts.driverEmail : 'driver@ecovolt.app',
            contact: '9876543210',
            name: opts.driverName && opts.driverName.length > 0 ? opts.driverName : 'EcoVolt Driver',
          },
          theme: { color: '#10B981' }, // EcoVolt green
        };

        // Opens the OFFICIAL Razorpay modal — UPI / GPay / PhonePe / Cards / Netbanking
        const data: Record<string, string> = await RazorpayCheckout.open(checkoutOptions);

        // ── 3. Verify payment on backend ─────────────────────────────────────
        const verifyRes = await verifyPayment({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          booking_id: opts.bookingId,
          session_id: opts.sessionId,
        });

        return {
          success: verifyRes.success,
          receipt: verifyRes.receipt,
          error: verifyRes.success ? undefined : verifyRes.message,
        };
      } catch (err: any) {
        console.log("========== RAZORPAY ERROR ==========");
        console.log("RAW:", err);

        console.log("CODE:", err?.code);
        console.log("DESCRIPTION:", err?.description);
        console.log("ERROR:", err?.error);
        console.log("REASON:", err?.error?.reason);
        console.log("STEP:", err?.error?.step);
        console.log("SOURCE:", err?.error?.source);
        console.log("METADATA:", err?.error?.metadata);
        console.log("====================================");

        // react-native-razorpay can throw nested JSON string inside err.description
        let rzpErr = err?.error || err || {};
        if (typeof err?.description === 'string' && err.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(err.description);
            if (parsed?.error) {
              rzpErr = parsed.error;
            }
          } catch {}
        }

        const code = rzpErr?.code ?? err?.code;
        const description = rzpErr?.description ?? err?.description ?? err?.message;
        const reason = rzpErr?.reason ?? '';
        const step = rzpErr?.step ?? '';

        // Check if user cancelled or closed the modal
        const isCancelled =
          code === 0 ||
          code === 'CANCELLED' ||
          reason === 'payment_cancelled' ||
          reason === 'user_cancelled' ||
          String(description).toLowerCase().includes('cancel') ||
          String(description).toLowerCase().includes('closed');

        if (isCancelled) {
          return { success: false, error: 'cancelled' };
        }

        // Clean user-friendly message for failure
        let userMessage = 'Payment could not be completed. Please try again.';
        if (typeof description === 'string' && description.trim().length > 0 && !description.startsWith('{')) {
          userMessage = description;
        } else if (step === 'payment_authentication') {
          userMessage = 'Payment authentication failed. Please select a valid test payment option.';
        }

        return {
          success: false,
          error: userMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { initiatePayment, isLoading };
}
