import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Button } from '../primitives/Button';

export interface SuccessModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  reduceMotion?: boolean;
}

/**
 * SuccessModal — SheetSlideUp animation spec.
 * Dim overlay (rgba(0,0,0,0.4)), white sheet slide-up from bottom (radius-top-24),
 * oversized brand circle-check icon (72dp, negative margin-top overlapping top edge),
 * title (Screen Title 700), subtitle (ink2), PrimaryButton.
 * CheckBounce animation: icon scale 0→1.1→1 spring, starts 100ms after sheet settles.
 */
export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title = 'Booking Confirmed!',
  subtitle = 'Your charging slot has been successfully reserved.',
  actionLabel = 'View Booking',
  onAction,
  onClose,
  reduceMotion = false,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        slideAnim.setValue(0);
        overlayOpacity.setValue(1);
        checkScale.setValue(1);
        return;
      }
      // SheetSlideUp: 250ms ease-out, dim overlay fades in parallel
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // CheckBounce: starts 100ms after sheet settles
        setTimeout(() => {
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }).start();
        }, 100);
      });
    } else {
      // Reset on close
      slideAnim.setValue(300);
      overlayOpacity.setValue(0);
      checkScale.setValue(0);
    }
  }, [visible, reduceMotion, slideAnim, overlayOpacity, checkScale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  paddingBottom: Math.max(insets.bottom, spacing.xl),
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Check icon — oversized, brand circle, negative margin-top */}
              <Animated.View
                style={[
                  styles.checkCircle,
                  { transform: [{ scale: checkScale }] },
                ]}
              >
                <Text style={styles.checkIcon}>✓</Text>
              </Animated.View>

              {/* Content */}
              <View style={styles.content}>
                <Text variant="screenTitle" align="center" style={styles.title}>
                  {title}
                </Text>
                <Text variant="body" color={colors.ink2} align="center" style={styles.subtitle}>
                  {subtitle}
                </Text>
                <Button
                  label={actionLabel}
                  variant="primary"
                  onPress={onAction ?? onClose ?? (() => {})}
                  style={styles.actionBtn}
                />
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + 16, // space for the overlapping check icon
    alignItems: 'center',
  },
  checkCircle: {
    position: 'absolute',
    top: -36,              // bleeds above top edge of sheet
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  checkIcon: {
    fontSize: 36,
    lineHeight: 44,
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
  },
  subtitle: {
    maxWidth: 280,
  },
  actionBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
});
