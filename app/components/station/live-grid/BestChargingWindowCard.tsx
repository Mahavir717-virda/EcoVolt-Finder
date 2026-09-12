import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BestChargingWindowCardProps {
  label: string;
  renewablePct: number;
  savingsRs: number;
  t?: (key: string, fallback: string) => string;
}

export const BestChargingWindowCard: React.FC<BestChargingWindowCardProps> = ({
  label,
  renewablePct,
  savingsRs,
  t = (_, fallback) => fallback,
}) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.leftCol}>
        <View style={styles.tagRow}>
          <Ionicons name="flash" size={10} color="#10B981" />
          <Text style={styles.tagText} numberOfLines={1}>
            {t('station.best_window', 'BEST CHARGING WINDOW').toUpperCase()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.timeHighlight}>{label}</Text>
          <View style={styles.dotSeparator} />
          <Text style={styles.renewableText}>
            {renewablePct.toFixed(0)}% {t('station.renewable', 'renewable')}
          </Text>
        </View>
      </View>

      {savingsRs > 0 && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsLabel}>SAVE</Text>
          <Text style={styles.savingsVal}>~₹{savingsRs}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  leftCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
    fontFamily: 'Manrope_800ExtraBold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  timeHighlight: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  renewableText: {
    fontSize: 11.5,
    color: '#6EE7B7',
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  savingsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  savingsLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.5,
    fontFamily: 'Manrope_800ExtraBold',
  },
  savingsVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#34D399',
    fontFamily: 'Manrope_800ExtraBold',
  },
});
