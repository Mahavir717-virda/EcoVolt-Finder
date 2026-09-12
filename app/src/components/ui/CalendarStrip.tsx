import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface CalendarStripProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  /** How many days forward to show — defaults to 30 */
  dayRange?: number;
  style?: ViewStyle;
}

/**
 * CalendarStrip — month header + chevrons, weekday row (ink2 caption),
 * horizontal date scroll, selected date = 36dp brand-filled circle white bold text.
 */
export const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  dayRange = 30,
  style,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate array of dates
  const dates: Date[] = [];
  for (let i = 0; i < dayRange; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  // Derive displayed month from selected date or today
  const displayDate = selectedDate ?? today;
  const monthLabel = `${MONTHS[displayDate.getMonth()]} ${displayDate.getFullYear()}`;

  const isSelected = (d: Date) =>
    selectedDate != null &&
    d.getDate() === selectedDate.getDate() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getFullYear() === selectedDate.getFullYear();

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  return (
    <View style={[styles.container, style]}>
      {/* Month header */}
      <View style={styles.monthRow}>
        <Text variant="sectionLabel">{monthLabel}</Text>
        <View style={styles.chevrons}>
          <TouchableOpacity activeOpacity={0.7} style={styles.chevronBtn}>
            <Text style={styles.chevronText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.chevronBtn}>
            <Text style={styles.chevronText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday header row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.datesRow}
      >
        {dates.map((d, i) => {
          const selected = isSelected(d);
          const todayMark = isToday(d);
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => onSelectDate?.(d)}
              style={styles.dateItem}
            >
              {/* Weekday label */}
              <Text
                variant="micro"
                color={selected ? colors.brand : colors.ink2}
                align="center"
                style={styles.weekday}
              >
                {WEEKDAYS[d.getDay()]}
              </Text>

              {/* Date number */}
              <View
                style={[
                  styles.dateCircle,
                  selected && styles.selectedCircle,
                  todayMark && !selected && styles.todayCircle,
                ]}
              >
                <Text
                  variant="caption"
                  color={selected ? '#FFFFFF' : todayMark ? colors.brand : colors.ink}
                  align="center"
                  style={[styles.dateNum, selected && styles.selectedNum]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  chevrons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
  },
  datesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  dateItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 40,
  },
  weekday: {
    fontFamily: 'Manrope_500Medium',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCircle: {
    backgroundColor: colors.brand,
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  dateNum: {
    fontFamily: 'Manrope_500Medium',
  },
  selectedNum: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
});
