// payments.router.ts
// Express router for EcoVolt payments, invoice retrieval, and webhooks.

import { Router, Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

function respond(res: Response, result: { body: Record<string, unknown>; status: number }) {
  return res.status(result.status).json(result.body);
}

// ── 1. Create Payment Order ───────────────────────────────────────────────
router.post(['/create', '/create-order'], async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const body = req.body || {};
    const input = {
      ...body,
      userId: body.userId || authUser?.id,
      bookingId: body.bookingId || body.booking_id,
      sessionId: body.sessionId || body.session_id,
      orderId: body.orderId || body.order_id,
      amount: body.amount ? Number(body.amount) : undefined,
    };

    const result = await PaymentsService.processCreateOrder(input);
    return respond(res, result);
  } catch (e: any) {
    console.error('[PaymentsRouter] Error in /create:', e);
    return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
  }
});

// ── 2. Verify Payment Signature & Settle ─────────────────────────────────
router.post(['/verify', '/verify-payment'], async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const input = {
      razorpayOrderId: body.razorpay_order_id || body.razorpayOrderId,
      razorpayPaymentId: body.razorpay_payment_id || body.razorpayPaymentId,
      razorpaySignature: body.razorpay_signature || body.razorpaySignature,
      bookingId: body.booking_id || body.bookingId,
      sessionId: body.session_id || body.sessionId,
      orderId: body.order_id || body.orderId,
    };

    if (!input.razorpayOrderId || !input.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        error: 'razorpay_order_id and razorpay_payment_id are required',
      });
    }

    const result = await PaymentsService.processVerifyPayment(input);
    return respond(res, result);
  } catch (e: any) {
    console.error('[PaymentsRouter] Error in /verify:', e);
    return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
  }
});

// ── 3. Get Tax Invoice & Receipt Details ─────────────────────────────────
router.get('/receipt/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const receipt = await PaymentsService.getReceiptByPayment(id);
    if (!receipt) {
      return res.status(404).json({ success: false, error: 'Invoice or payment receipt not found' });
    }
    return res.status(200).json({ success: true, receipt });
  } catch (e: any) {
    console.error('[PaymentsRouter] Error in /receipt/:id:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ── 4. User Payment History ───────────────────────────────────────────────
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const payments = await PaymentsService.getUserPayments(userId);
    return res.status(200).json({ success: true, payments });
  } catch (e: any) {
    console.error('[PaymentsRouter] Error in /history:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ── 5. Razorpay Webhook Handler ───────────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const eventData = req.body;
    const result = await PaymentsService.processWebhookEvent(eventData);
    return respond(res, result);
  } catch (e: any) {
    console.error('[PaymentsRouter] Webhook error:', e);
    return res.status(200).json({ success: true, message: 'Logged error' });
  }
});

export const paymentsRouter = router;
