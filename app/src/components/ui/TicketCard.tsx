import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

export interface TicketRow {
  label: string;
  value: string;
  /** Highlight value in brand color (e.g. Total amount) */
  highlight?: boolean;
}

export interface TicketCardProps {
  /** Booking reference shown in QR and header */
  bookingId: string;
  /** Station name shown in ticket header band */
  stationName: string;
  /** Date/time display string */
  dateTime?: string;
  /** Label/value rows below the QR section */
  rows?: TicketRow[];
  style?: ViewStyle;
}

/**
 * TicketCard — reference-matched booking receipt ticket.
 * brandPress header band (rounded top-16), semicircular notch cutouts at
 * mid-height left/right (canvas-color circles), white QR block,
 * dashed divider, label/value rows (label ink2, value brand bold).
 */
export const TicketCard: React.FC<TicketCardProps> = ({
  bookingId,
  stationName,
  dateTime,
  rows = [],
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {/* === HEADER BAND === */}
      <View style={styles.header}>
        <Text variant="sectionLabel" color="#FFFFFF" align="center" style={styles.headerStation}>
          {stationName}
        </Text>
        {dateTime != null && (
          <Text variant="micro" color="rgba(255,255,255,0.75)" align="center">
            {dateTime}
          </Text>
        )}
      </View>

      {/* === NOTCH ROW === */}
      {/* The notch creates the "torn ticket" look using overlapping circles */}
      <View style={styles.notchRow}>
        {/* Left notch — canvas-colored circle bleeding off left edge */}
        <View style={[styles.notch, styles.notchLeft]} />
        {/* Dashed separator line between notches */}
        <View style={styles.dashedLine} />
        {/* Right notch — canvas-colored circle bleeding off right edge */}
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* === QR BLOCK === */}
      <View style={styles.qrSection}>
        <View style={styles.qrBox}>
          {/* Placeholder QR code — in production use a QR library */}
          <Text style={styles.qrPlaceholder} align="center">
            ▩▩▩{'\n'}▩▪▩{'\n'}▩▩▩
          </Text>
          <Text variant="micro" color={colors.ink3} align="center" style={styles.bookingId}>
            {bookingId}
          </Text>
        </View>
      </View>

      {/* === LABEL/VALUE ROWS === */}
      {rows.length > 0 && (
        <View style={styles.rows}>
          {rows.map((row, i) => (
            <View key={i} style={[styles.rowItem, i < rows.length - 1 && styles.rowDivider]}>
              <Text variant="caption" color={colors.ink2}>
                {row.label}
              </Text>
              <Text
                variant="caption"
                color={row.highlight ? colors.brand : colors.ink}
                style={row.highlight ? styles.highlightValue : styles.normalValue}
                tabularNums
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    backgroundColor: colors.brandPress,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: 4,
    alignItems: 'center',
  },
  headerStation: {
    fontFamily: 'Manrope_700Bold',
  },
  notchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    overflow: 'visible',
    position: 'relative',
  },
  notch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    position: 'absolute',
    zIndex: 2,
  },
  notchLeft: {
    left: -12,
  },
  notchRight: {
    right: -12,
  },
  dashedLine: {
    flex: 1,
    marginHorizontal: 20,
    borderTopWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
  },
  qrBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.input,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    width: 160,
  },
  qrPlaceholder: {
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 2,
  },
  bookingId: {
    letterSpacing: 1,
    fontFamily: 'Manrope_500Medium',
  },
  rows: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: 0,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  highlightValue: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
  normalValue: {
    fontFamily: 'Manrope_500Medium',
  },
});
