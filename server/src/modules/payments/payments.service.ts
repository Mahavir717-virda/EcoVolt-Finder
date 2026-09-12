// payments.service.ts
// Business logic layer for EcoVolt payment processing and invoice generation.

import { prisma } from '../../db/client';
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from './razorpay.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  ApiResult,
  CreatePaymentOrderInput,
  PaymentReceiptData,
  VerifyPaymentInput,
} from './payments.types';

// Helper: Convert Rupee amount to Paise integer
function amountToPaise(amount: number | string | null | undefined): number {
  try {
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) return 0;
    return Math.round(num * 100);
  } catch {
    return 0;
  }
}

function ok<T extends Record<string, unknown>>(data: T, status = 200): ApiResult<T> {
  return { body: { success: true, ...data }, status };
}

function err(message: string, status = 400): ApiResult {
  return { body: { success: false, error: message }, status };
}

/**
 * Generates a clean, unique EcoVolt Tax Invoice Number
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `ECO-INV-${year}-${randomSuffix}`;
}

export class PaymentsService {
  /**
   * 1. Initialize / Create Payment Order for Booking, Session, or Top-up
   */
  public static async processCreateOrder(input: CreatePaymentOrderInput): Promise<ApiResult> {
    const { userId, bookingId, sessionId, orderId, paymentMethod = 'razorpay', purpose = 'session_settlement' } = input;
    const effectiveOrderId = bookingId || sessionId || orderId;

    console.info(`[PaymentsService] Creating payment order for: ${effectiveOrderId || 'Direct'} (Purpose: ${purpose})`);

    try {
      let finalAmount = input.amount || 0;
      let targetUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      let targetBooking = bookingId ? await prisma.booking.findUnique({ where: { id: bookingId }, include: { user: true, station: true } }) : null;
      let targetSession = sessionId ? await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true, station: true, booking: true } }) : null;

      // If user not explicitly passed, deduce from linked booking or session
      if (!targetUser) {
        if (targetSession?.user) targetUser = targetSession.user;
        else if (targetBooking?.user) targetUser = targetBooking.user;
        else {
          // Fallback to first active driver in local DB
          targetUser = await prisma.user.findFirst();
        }
      }

      if (!targetUser) {
        return err('User account not found', 404);
      }

      // Automatically calculate / verify amount if not explicitly passed
      if (!finalAmount || finalAmount <= 0) {
        if (targetSession && (targetSession.cost || 0) > 0) {
          finalAmount = targetSession.cost!;
        } else if (targetBooking) {
          const locked = targetBooking.lockedPrice as any;
          finalAmount = locked?.finalPrice ? locked.finalPrice * 15 : 150.0;
        } else {
          finalAmount = 150.0; // Standard fallback session amount
        }
      }

      finalAmount = Math.max(1.0, Math.round(finalAmount * 100) / 100);
      const amountPaise = amountToPaise(finalAmount);

      // Check for existing pending payment record to prevent duplicate orders
      const existing = await prisma.payment.findFirst({
        where: {
          userId: targetUser.id,
          OR: [
            ...(bookingId ? [{ bookingId }] : []),
            ...(sessionId ? [{ sessionId }] : []),
          ],
          status: { in: ['created', 'pending'] },
        },
      });

      if (existing && existing.razorpayOrderId) {
        console.info(`[PaymentsService] Returning existing pending Razorpay order: ${existing.razorpayOrderId}`);
        return ok({
          payment_id: existing.id,
          razorpay_order_id: existing.razorpayOrderId,
          amount: existing.amount,
          amount_paise: amountToPaise(existing.amount),
          currency: 'INR',
          key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_ecovolt_mock',
          purpose,
        });
      }

      // Create new Razorpay order
      const receiptRef = `rcpt_${Date.now().toString().slice(-8)}`;
      const rzOrder = await createRazorpayOrder(amountPaise, receiptRef, {
        userId: targetUser.id,
        bookingId: bookingId || '',
        sessionId: sessionId || '',
        purpose,
      });

      // Persist Payment record in PostgreSQL
      const paymentRecord = existing
        ? await prisma.payment.update({
            where: { id: existing.id },
            data: {
              amount: finalAmount,
              razorpayOrderId: rzOrder.id,
              status: 'created',
              paymentMethod,
              receipt: receiptRef,
            },
          })
        : await prisma.payment.create({
            data: {
              userId: targetUser.id,
              bookingId: bookingId || null,
              sessionId: sessionId || null,
              amount: finalAmount,
              currency: 'INR',
              status: 'created',
              paymentMethod,
              razorpayOrderId: rzOrder.id,
              receipt: receiptRef,
              invoiceNumber: generateInvoiceNumber(),
            },
          });

      console.info(`[PaymentsService] Payment record created: ${paymentRecord.id} (Razorpay: ${rzOrder.id})`);

      return ok({
        payment_id: paymentRecord.id,
        razorpay_order_id: rzOrder.id,
        amount: finalAmount,
        amount_paise: amountPaise,
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_ecovolt_mock',
        invoice_number: paymentRecord.invoiceNumber,
        purpose,
      });
    } catch (e: any) {
      console.error(`[PaymentsService] Error in processCreateOrder:`, e);
      return err(`Failed to initialize payment: ${e.message}`, 500);
    }
  }

  /**
   * 2. Verify Payment Signature and Settle Booking/Session
   */
  public static async processVerifyPayment(input: VerifyPaymentInput): Promise<ApiResult> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId, sessionId } = input;

    console.info(`[PaymentsService] Verifying payment: ${razorpayPaymentId} for order: ${razorpayOrderId}`);

    try {
      let payment = await prisma.payment.findFirst({
        where: { razorpayOrderId },
        include: {
          user: true,
          booking: { include: { station: true, vehicle: true } },
          session: { include: { station: true, vehicle: true } },
        },
      });

      if (!payment && (sessionId || bookingId)) {
        payment = await prisma.payment.findFirst({
          where: {
            OR: [
              ...(sessionId ? [{ sessionId }] : []),
              ...(bookingId ? [{ bookingId }] : []),
            ],
          },
          include: {
            user: true,
            booking: { include: { station: true, vehicle: true } },
            session: { include: { station: true, vehicle: true } },
          },
        });
      }

      if (!payment) {
        return err('Payment record not found for verification', 404);
      }

      // 1. Verify cryptographic signature
      const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) {
        console.warn(`[PaymentsService] Invalid signature for payment ${razorpayPaymentId}`);
        return err('Invalid payment signature', 400);
      }

      // 2. Check if already processed (Idempotency)
      if (payment.status === 'success') {
        console.info(`[PaymentsService] Payment ${payment.id} already verified as success.`);
        const receiptData = await this.getReceiptByPayment(payment.id);
        return ok({
          message: 'Payment already verified',
          payment_id: payment.id,
          invoice_number: payment.invoiceNumber,
          receipt: receiptData,
        });
      }

      // 3. Mark payment as success & generate final Tax Invoice Number
      const invoiceNumber = payment.invoiceNumber || generateInvoiceNumber();
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'success',
          invoiceNumber,
        },
      });

      // 4. Update linked Session or Booking if applicable
      if (payment.sessionId) {
        await prisma.session.update({
          where: { id: payment.sessionId },
          data: { status: 'completed' },
        });
      }

      if (payment.bookingId) {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'completed' },
        });
      }

      // 5. Trigger Sweet Notification & EcoPoints Award
      try {
        const energyKwh = payment.session?.energyKwh || 18.5;
        const co2Avoided = payment.session?.co2AvoidedKg || parseFloat((energyKwh * 0.72).toFixed(2));
        const stationName = payment.session?.station?.name || payment.booking?.station?.name || 'EcoVolt Supercharger';

        await NotificationsService.notifySessionComplete(
          payment.userId,
          energyKwh,
          updatedPayment.amount,
          co2Avoided,
          stationName
        );
      } catch (notifErr) {
        console.warn('[PaymentsService] Notification trigger non-blocking error:', notifErr);
      }

      const receiptData = await this.getReceiptByPayment(updatedPayment.id);

      console.info(`[PaymentsService] Payment successfully verified: ${updatedPayment.id} (Invoice: ${invoiceNumber})`);

      return ok({
        message: 'Payment verified and transaction settled successfully',
        payment_id: updatedPayment.id,
        invoice_number: invoiceNumber,
        receipt: receiptData,
      });
    } catch (e: any) {
      console.error(`[PaymentsService] Payment verification failed:`, e);
      return err(`Payment verification failed: ${e.message}`, 500);
    }
  }

  /**
   * 3. Retrieve Complete Invoice & Receipt Data for PDF Rendering & Download
   */
  public static async getReceiptByPayment(paymentOrEntityId: string): Promise<PaymentReceiptData | null> {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentOrEntityId },
          { sessionId: paymentOrEntityId },
          { bookingId: paymentOrEntityId },
          { razorpayOrderId: paymentOrEntityId },
          { razorpayPaymentId: paymentOrEntityId },
        ],
      },
      include: {
        user: { include: { vehicles: true } },
        session: { include: { station: { include: { operator: true } }, vehicle: true } },
        booking: { include: { station: { include: { operator: true } }, vehicle: true } },
      },
    });

    if (!payment) return null;

    const session = payment.session;
    const booking = payment.booking;
    const station = session?.station || booking?.station;
    const vehicle = session?.vehicle || booking?.vehicle || payment.user?.vehicles?.[0];
    const operator = station?.operator;

    const totalAmount = payment.amount || 150.0;
    const energyKwh = session?.energyKwh || 18.4;
    const baseTariff = 11.5;
    const grossAmount = Math.round(energyKwh * baseTariff * 100) / 100;
    const greenDiscount = Math.max(15, Math.round(grossAmount * 0.15));
    const taxableAmount = Math.max(1, grossAmount - greenDiscount);
    const gstAmount = Math.round(taxableAmount * 0.18 * 100) / 100;

    return {
      invoiceNumber: payment.invoiceNumber || `ECO-INV-${payment.id.slice(0, 8).toUpperCase()}`,
      paymentId: payment.id,
      razorpayPaymentId: payment.razorpayPaymentId || `pay_${payment.id.slice(0, 12)}`,
      razorpayOrderId: payment.razorpayOrderId,
      status: payment.status,
      paymentMethod: payment.paymentMethod?.toUpperCase() || 'UPI / RAZORPAY',
      amount: totalAmount,
      currency: payment.currency || 'INR',
      paidAt: payment.updatedAt.toISOString(),

      // Driver
      driverName: payment.user?.name || 'EV Driver',
      driverEmail: payment.user?.email || 'driver@ecovolt.in',
      vehicleModel: vehicle?.model || 'Tata Nexon EV / Electric Vehicle',
      vehicleClass: vehicle?.vehicleClass || 'car',

      // Station & Operator
      stationName: station?.name || 'EcoVolt Green Hub',
      stationAddress: station?.address || 'SG Highway, Ahmedabad, Gujarat, 380054',
      operatorName: operator?.name || 'EcoVolt Network Private Limited',
      gstin: '24AAACE1234F1Z5',

      // Energy & Environment
      energyKwh: parseFloat(energyKwh.toFixed(2)),
      tariffRatePerKwh: baseTariff,
      baseAmount: grossAmount,
      greenDiscountAmount: greenDiscount,
      gstAmount,
      co2AvoidedKg: session?.co2AvoidedKg || parseFloat((energyKwh * 0.72).toFixed(2)),
      renewablePct: session?.avgRenewablePct || 92.4,
      ecoPointsEarned: Math.max(25, Math.round((energyKwh * 0.72) * 10 + energyKwh * 2)),
      durationFormatted: '00:24:18',
    };
  }

  /**
   * 4. Retrieve User Payment History
   */
  public static async getUserPayments(userId: string) {
    return await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: { include: { station: true } },
        booking: { include: { station: true } },
      },
    });
  }

  /**
   * 5. Process Razorpay Webhook Event
   */
  public static async processWebhookEvent(eventData: any): Promise<ApiResult> {
    const eventId = eventData.event_id || eventData.id || `evt_${Date.now()}`;
    const eventType = eventData.event;

    if (!eventType) return err('Invalid webhook payload');

    let existing = await prisma.webhookEvent.findFirst({ where: { eventId } });
    if (existing?.processed) {
      return ok({ message: 'Event already processed' });
    }

    if (!existing) {
      existing = await prisma.webhookEvent.create({
        data: {
          eventId,
          eventType,
          payload: JSON.stringify(eventData),
          processed: false,
        },
      });
    }

    const payload = eventData.payload || {};
    const paymentData = payload.payment?.entity || {};
    const rzOrderId = paymentData.order_id;
    const rzPaymentId = paymentData.id;

    if (rzOrderId) {
      const payment = await prisma.payment.findFirst({ where: { razorpayOrderId: rzOrderId } });
      if (payment) {
        if (['payment.captured', 'payment.authorized'].includes(eventType)) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'success',
              razorpayPaymentId: rzPaymentId || payment.razorpayPaymentId,
            },
          });
        } else if (eventType === 'payment.failed') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'failed' },
          });
        }
      }
    }

    await prisma.webhookEvent.update({
      where: { id: existing.id },
      data: { processed: true },
    });

    return ok({ message: 'Webhook processed successfully' });
  }
}
