/**
 * RazorpayButton
 * Thin wrapper used only if something renders <PaymentModal visible ...>.
 * The primary entry-point is useRazorpayCheckout hook called directly.
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRazorpayCheckout, type RazorpayPaymentOptions } from '@/hooks/useRazorpayCheckout';
import { type PaymentReceipt } from '@/services/payments.service';
import { Button } from '@/components/ui/Button';

export interface PaymentModalProps extends RazorpayPaymentOptions {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess?: (receipt?: PaymentReceipt) => void;
  // accept and silently ignore legacy props
  energyKwh?: number;
  purpose?: any;
}

export function RazorpayButton({
  visible,
  onClose,
  amount,
  bookingId,
  sessionId,
  stationName,
  driverName,
  driverEmail,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { initiatePayment, isLoading } = useRazorpayCheckout();

  if (!visible) return null;

  const handlePay = async () => {
    const result = await initiatePayment({
      amount,
      bookingId,
      sessionId,
      stationName,
      driverName,
      driverEmail,
      purpose: 'session_settlement',
    });

    if (result.success) {
      onPaymentSuccess?.(result.receipt);
      onClose();
    } else if (result.error !== 'cancelled') {
      onClose();
    }
  };

  return (
    <View style={{ padding: 16 }}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#10B981" />
      ) : (
        <Button
          title="💳 Pay with Razorpay"
          variant="primary"
          onPress={handlePay}
          fullWidth
        />
      )}
    </View>
  );
}
