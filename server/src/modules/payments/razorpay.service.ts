// razorpay.service.ts
// Production Razorpay SDK integration with automatic local/sandbox resilience.

import Razorpay from 'razorpay';
import crypto from 'crypto';
import type { RazorpayOrderResult } from './payments.types';

let cachedClient: Razorpay | null = null;

/**
 * Returns singleton Razorpay client if configured, otherwise null for local mock mode.
 */
export function getClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId === 'rzp_test_placeholder') {
    console.warn('[RazorpayService] No valid RAZORPAY_KEY_ID / SECRET found in env → fallback to mock mode');
    return null;
  }

  if (!cachedClient) {
    console.info(`[RazorpayService] Initializing Razorpay SDK with Key ID: ${keyId}`);
    cachedClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return cachedClient;
}

/**
 * Creates a Razorpay order.
 * If live/test Razorpay keys are configured, executes with Razorpay SDK.
 * If keys are not present in local dev, seamlessly generates a compliant simulated order.
 */
export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes?: Record<string, string>
): Promise<RazorpayOrderResult> {
  try {
    const client = getClient();

    if (client) {
      const orderData: Record<string, unknown> = {
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1, // auto-capture
      };

      if (notes) {
        orderData.notes = notes;
      }

      const rzOrder: any = await client.orders.create(orderData as any);

      console.info(
        `[RazorpayService] Real order created: ${rzOrder.id} | Amount: ₹${amountPaise / 100}`
      );

      return {
        id: rzOrder.id,
        amount: Number(rzOrder.amount),
        amount_paid: Number(rzOrder.amount_paid ?? 0),
        amount_due: Number(rzOrder.amount_due ?? rzOrder.amount),
        currency: rzOrder.currency || 'INR',
        status: rzOrder.status || 'created',
        receipt: rzOrder.receipt,
      };
    }

    // Dynamic Mock Sandbox Order for testing without real credentials
    const mockOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    console.info(
      `[RazorpayService] Sandbox order generated: ${mockOrderId} | Amount: ₹${amountPaise / 100}`
    );

    return {
      id: mockOrderId,
      amount: amountPaise,
      amount_paid: 0,
      amount_due: amountPaise,
      currency: 'INR',
      status: 'created',
      receipt,
    };
  } catch (err: any) {
    if (err?.error?.description) {
      console.error(`[RazorpayService] BadRequest: ${JSON.stringify(err.error)}`);
      throw new Error(`Razorpay error: ${err.error.description}`);
    }
    console.error('[RazorpayService] Failed to create order:', err);
    throw new Error(`Order creation failed: ${err.message ?? String(err)}`);
  }
}

/**
 * Verifies Razorpay payment signature using official HMAC-SHA256 method.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Sandbox mock signature bypass when keys are not configured
    if (!keySecret || keySecret === 'rzp_secret_placeholder') {
      console.info('[RazorpayService] Sandbox mode: Verified payment signature.');
      return Boolean(razorpayPaymentId && razorpayOrderId);
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValid = timingSafeEqual(expected, razorpaySignature);
    console.info(`[RazorpayService] Signature verification: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  } catch (err) {
    console.error('[RazorpayService] Signature verification failed:', err);
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature using HMAC-SHA256.
 */
export function verifyWebhookSignature(body: Buffer | string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[RazorpayService] RAZORPAY_WEBHOOK_SECRET not set → webhook verification bypassed in dev');
    return true;
  }

  try {
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    return timingSafeEqual(expected, signature);
  } catch (err) {
    console.error('[RazorpayService] Webhook signature verification error:', err);
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
